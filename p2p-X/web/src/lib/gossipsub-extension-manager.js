/* eslint-disable no-console */

import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'

/**
 * GossipSub-based Extension Manager
 * 
 * Handles extension discovery via GossipSub topics (for spreadsheet compatibility)
 * This is separate from UCEP which uses protocol-based discovery
 * 
 * Topics:
 * - universal-connectivity-extensions: Extension discovery/announcements
 * - uc-ext-{extensionId}-commands: Command execution for specific extensions
 */

const EXTENSION_DISCOVERY_TOPIC = 'universal connectivity'

export class GossipSubExtensionManager {
  constructor(libp2p) {
    this.libp2p = libp2p
    this.discoveredExtensions = new Map() // extensionId -> { manifest, installed: bool }
    this.installedExtensions = new Set() // Track installed extension IDs
    this.commandResponseHandlers = new Map() // requestId -> { resolve, reject, timeout }
    this.requestIdCounter = 0
  }

  /**
   * Start listening for extension announcements
   */
  async start() {
    console.log('📡 GossipSub Extension Manager: Starting...')

    // Subscribe to extension discovery topic
    this.libp2p.services.pubsub.subscribe(EXTENSION_DISCOVERY_TOPIC)
    console.log(`✅ Subscribed to extension discovery topic: ${EXTENSION_DISCOVERY_TOPIC}`)

    // Listen for extension announcements
    this.libp2p.services.pubsub.addEventListener('message', (evt) => {
      if (evt.detail.topic === EXTENSION_DISCOVERY_TOPIC) {
        this.handleExtensionAnnouncement(evt.detail)
      } else if (evt.detail.topic.startsWith('uc-ext-') && evt.detail.topic.endsWith('-commands')) {
        this.handleCommandResponse(evt.detail)
      }
    })

    console.log('✅ GossipSub Extension Manager: Listening for extensions')
  }

  /**
   * Handle extension announcement message
   */
  handleExtensionAnnouncement(messageEvent) {
    try {
      const data = JSON.parse(uint8ArrayToString(messageEvent.data))
      
      if (data.type === 'extension-offer' && data.manifest) {
        const manifest = data.manifest
        const extensionId = manifest.id

        console.log(`📦 Extension announced: ${manifest.name} (${extensionId})`)
        
        this.discoveredExtensions.set(extensionId, {
          manifest,
          installed: this.installedExtensions.has(extensionId),
          announcedAt: Date.now()
        })

        // Emit event for UI (extension offer banner)
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('extension-offer', {
            detail: { manifest, extensionId }
          }))
        }
      }
    } catch (error) {
      console.error('❌ Failed to parse extension announcement:', error)
    }
  }

  /**
   * Install an extension (mark as installed)
   */
  installExtension(extensionId) {
    if (!this.discoveredExtensions.has(extensionId)) {
      throw new Error(`Extension '${extensionId}' not discovered`)
    }

    this.installedExtensions.add(extensionId)
    const ext = this.discoveredExtensions.get(extensionId)
    ext.installed = true

    // Persist to localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const installed = Array.from(this.installedExtensions)
      window.localStorage.setItem('uc-installed-extensions', JSON.stringify(installed))
    }

    console.log(`✅ Extension installed: ${extensionId}`)
    return ext.manifest
  }

  /**
   * Uninstall an extension
   */
  uninstallExtension(extensionId) {
    this.installedExtensions.delete(extensionId)
    if (this.discoveredExtensions.has(extensionId)) {
      this.discoveredExtensions.get(extensionId).installed = false
    }

    // Update localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const installed = Array.from(this.installedExtensions)
      window.localStorage.setItem('uc-installed-extensions', JSON.stringify(installed))
    }

    console.log(`🗑️ Extension uninstalled: ${extensionId}`)
  }

  /**
   * Load installed extensions from localStorage
   */
  loadInstalledExtensions() {
    if (typeof window === 'undefined' || !window.localStorage) return

    try {
      const stored = window.localStorage.getItem('uc-installed-extensions')
      if (stored) {
        const installed = JSON.parse(stored)
        installed.forEach(id => {
          this.installedExtensions.add(id)
          if (this.discoveredExtensions.has(id)) {
            this.discoveredExtensions.get(id).installed = true
          }
        })
        console.log(`📥 Loaded ${installed.length} installed extension(s) from localStorage`)
      }
    } catch (error) {
      console.error('❌ Failed to load installed extensions:', error)
    }
  }

  /**
   * Execute a command on an installed extension
   */
  async executeCommand(extensionId, command, args = []) {
    if (!this.installedExtensions.has(extensionId)) {
      throw new Error(`Extension '${extensionId}' not installed. Use installExtension() first.`)
    }

    const ext = this.discoveredExtensions.get(extensionId)
    if (!ext) {
      throw new Error(`Extension '${extensionId}' manifest not found`)
    }

    const commandTopic = `uc-ext-${extensionId}-commands`
    
    // Subscribe to command response topic if not already subscribed
    if (!this.libp2p.services.pubsub.getTopics().includes(commandTopic)) {
      this.libp2p.services.pubsub.subscribe(commandTopic)
      console.log(`📡 Subscribed to command topic: ${commandTopic}`)
    }

    const requestId = `req-${Date.now()}-${++this.requestIdCounter}`
    const request = {
      type: 'command-request',
      requestId,
      extensionId,
      command,
      args,
      timestamp: Date.now()
    }

    console.log(`📤 Executing command: /${extensionId}-${command} ${args.join(' ')}`)

    // Publish command request
    await this.libp2p.services.pubsub.publish(commandTopic, uint8ArrayFromString(JSON.stringify(request)))

    // Wait for response with timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.commandResponseHandlers.delete(requestId)
        reject(new Error(`Command timeout: ${extensionId}.${command}`))
      }, 5000) // 5 second timeout

      this.commandResponseHandlers.set(requestId, {
        resolve: (result) => {
          clearTimeout(timeout)
          resolve(result)
        },
        reject: (error) => {
          clearTimeout(timeout)
          reject(error)
        }
      })
    })
  }

  /**
   * Handle command response from extension
   */
  handleCommandResponse(messageEvent) {
    try {
      const data = JSON.parse(uint8ArrayToString(messageEvent.data))
      
      if (data.type === 'command-response' && data.requestId) {
        const handler = this.commandResponseHandlers.get(data.requestId)
        if (handler) {
          this.commandResponseHandlers.delete(data.requestId)
          
          if (data.success) {
            handler.resolve(data.data || data.result)
          } else {
            handler.reject(new Error(data.error || 'Command failed'))
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to parse command response:', error)
    }
  }

  /**
   * List all discovered extensions
   */
  listExtensions() {
    console.log(`\n📦 Discovered Extensions (${this.discoveredExtensions.size}):`)
    for (const [id, ext] of this.discoveredExtensions.entries()) {
      const status = ext.installed ? '✅ INSTALLED' : '⏳ Available'
      console.log(`\n  ${ext.manifest.name} (${id}) - ${status}`)
      console.log(`    Version: ${ext.manifest.version}`)
      console.log(`    Description: ${ext.manifest.description}`)
      if (ext.manifest.commands && ext.manifest.commands.length > 0) {
        console.log(`    Commands:`)
        ext.manifest.commands.forEach(cmd => {
          console.log(`      - ${cmd.syntax || cmd.name}: ${cmd.description || ''}`)
        })
      }
    }
    console.log('')
    return Array.from(this.discoveredExtensions.values()).map(ext => ext.manifest)
  }

  /**
   * Get installed extensions
   */
  getInstalledExtensions() {
    return Array.from(this.installedExtensions)
      .map(id => this.discoveredExtensions.get(id))
      .filter(ext => ext && ext.installed)
      .map(ext => ext.manifest)
  }

  /**
   * Get extension context for LLM
   */
  getExtensionContext() {
    const installed = this.getInstalledExtensions()
    if (installed.length === 0) return ''

    const context = installed.map(ext => {
      const commands = ext.commands?.map(cmd => 
        `  - ${cmd.syntax || cmd.name}: ${cmd.description || ''}`
      ).join('\n') || '  (no commands)'
      
      return `${ext.name} (${ext.id}):
    Description: ${ext.description}
    Commands:
${commands}`
    }).join('\n\n')

    return `\n\n## Installed Extensions\n\n${context}`
  }
}

