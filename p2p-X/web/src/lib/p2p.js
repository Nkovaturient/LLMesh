import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { webRTC, webRTCDirect } from '@libp2p/webrtc'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { gossipsub } from '@libp2p/gossipsub'
import { identify } from '@libp2p/identify'
import { ping } from '@libp2p/ping'
import { multiaddr } from '@multiformats/multiaddr'
import { get } from 'svelte/store'
import { connectionStatus, myPeerId, addLog, addMessage, agentConnected, receivedFiles } from './stores.js'
import { ChatRoom } from './chatroom.js'
import { fetchLLMReply, isLLMEnabled, isBrowserDirectLLMEnabled } from './llm.js'
import { ExtensionTestClient, testExtension } from './ucep-client.js'
import { registerExtension, createEchoExtension } from './extension-provider.js'
import { GossipSubExtensionManager } from './gossipsub-extension-manager.js'
let node = null
let chatRoom = null
let extensionClient = null
let gossipsubExtensionManager = null
let llmExtensionPeerId = null
let connectedAgentPeerId = null
const DEFAULT_AGENT = import.meta.env.VITE_AGENT_MULTIADDR || ''

function pushInboundMessage(sender, text) {
  addMessage({
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    sender,
    text,
    isMe: false,
    timestamp: Date.now()
  })
}

function setupNodeEvents(currentNode) {
  currentNode.addEventListener('peer:connect', (evt) => {
    addLog(`Connected to peer ${evt.detail.toString().slice(-8)}`)
  })

  currentNode.addEventListener('peer:disconnect', (evt) => {
    addLog(`Disconnected from ${evt.detail.toString().slice(-8)}`)
  })

  currentNode.addEventListener('peer:identify', (evt) => {
    const peerId = evt.detail.peerId.toString()
    addLog(`Identify complete with ${peerId.slice(-8)}`)
  })
}

export async function initP2P(onProgress) {
  if (node) return node

  const isSecure = window.location.protocol === 'https:'
  addLog(`Spawning browser libp2p node (${isSecure ? 'webrtc + ' : ''}ws + circuit-relay + gossipsub)...`)
  onProgress?.('Activating node...')

  const transports = []
  if (isSecure) {
    // On HTTPS, prefer WebRTC which works natively
    transports.push(webRTC(), webRTCDirect())
  }
  // Always include WebSockets (will use WSS on HTTPS if available)
  transports.push(webSockets())
  // Circuit relay transport - allows connecting through relay nodes (supports WSS)
  transports.push(circuitRelayTransport())

  node = await createLibp2p({
    transports,
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    connectionGater: {
      denyDialMultiaddr: () => false
    },
    services: {
      identify: identify({
        protocolPrefix: 'ipfs',
        // agentVersion: 'universal-connectivity-web/1.0.0'
      }),
      ping: ping(),
      pubsub: gossipsub({
        emitSelf: false,
        fallbackToFloodsub: true,
        floodPublish: true
      })
    }
  })

  setupNodeEvents(node)
  await node.start()
  myPeerId.set(node.peerId.toString())
  addLog(`Node ready as ${node.peerId.toString().slice(-8)}`)

  // Register example extension (must be done AFTER node.start())
  const echoExt = createEchoExtension()
  await registerExtension(node, echoExt.id, echoExt.version, echoExt, echoExt.handler)
  addLog('Example extension registered: echo')

  // Register File Receiver Handler (Browser-to-Browser)
  // libp2p invokes as handler(stream, connection), not handler({ stream, connection })
  // @ts-ignore
  node.handle('/llmesh/file/1.0.0', async (stream, connection) => {
    try {
      const peerId = connection?.remotePeer?.toString() ?? 'unknown'
      addLog(`[FILE] Receiving file stream from ${peerId.slice(-8)}`)

      const chunks = []
      for await (const chunk of stream) {
        chunks.push(chunk instanceof Uint8Array ? chunk : chunk.subarray())
      }

      const fullBuffer = new Uint8Array(chunks.reduce((acc, val) => acc + val.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        fullBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      if (fullBuffer.length < 4) return;

      // Read 4 bytes length
      const view = new DataView(fullBuffer.buffer, fullBuffer.byteOffset, fullBuffer.byteLength)
      const metaLen = view.getUint32(0, false)

      if (fullBuffer.length < 4 + metaLen) return;

      const metaBytes = fullBuffer.subarray(4, 4 + metaLen)
      const metaJson = new TextDecoder().decode(metaBytes)
      const metadata = JSON.parse(metaJson)

      const fileBytes = fullBuffer.subarray(4 + metaLen)
      const blob = new Blob([fileBytes], { type: metadata.mimeType })
      const url = URL.createObjectURL(blob)

      receivedFiles.update(f => [...f, { ...metadata, sender: peerId, url, timestamp: Date.now() }])

      addLog(`[FILE] Received ${metadata.filename} from ${peerId.slice(-8)}`)
      pushInboundMessage(peerId.slice(-8), `Sent a file: ${metadata.filename}`)
    } catch (err) {
      console.error('[FILE] Error receiving file:', err)
      addLog(`[FILE] Error receiving file: ${err.message}`)
    }
  })

  chatRoom = await ChatRoom.join(node, null)
  chatRoom.onMessage((msg) => {
    addLog(`Message from ${msg.nick}`)
    pushInboundMessage(msg.nick, msg.message)
  })

  // Initialize UCEP Extension Client (protocol-based discovery)
  extensionClient = new ExtensionTestClient(node)
  await extensionClient.start()
  addLog('UCEP extension discovery client initialized')

  // Monitor for LLM extension discovery (alien-x-llm only; echo/other UCEP extensions are separate)
  node.addEventListener('peer:identify', async (evt) => {
    const { peerId, protocols } = evt.detail
    const llmProtocol = protocols.find(p => p.includes('alien-x-llm'))
    if (llmProtocol) {
      const { setLLMExtension } = await import('./llm-ucep-client.js')
      setLLMExtension(peerId.toString(), llmProtocol)
      llmExtensionPeerId = peerId.toString()
      addLog('LLM extension discovered from terminal node')
    }
  })

  // Clear LLM extension on disconnect
  node.addEventListener('peer:disconnect', async (evt) => {
    const disconnectedPeerId = evt.detail.toString()
    if (llmExtensionPeerId === disconnectedPeerId) {
      const { clearLLMExtension } = await import('./llm-ucep-client.js')
      clearLLMExtension()
      llmExtensionPeerId = null
      addLog('LLM extension disconnected')
    }
  })

  // Initialize GossipSub Extension Manager (topic-based discovery for spreadsheet)
  gossipsubExtensionManager = new GossipSubExtensionManager(node)
  await gossipsubExtensionManager.start()
  gossipsubExtensionManager.loadInstalledExtensions()
  addLog('GossipSub extension manager initialized')

  // Expose to window for browser console access
  if (typeof window !== 'undefined') {
    // UCEP extensions
    // @ts-ignore - window.extensionTestClient is set at runtime
    window.extensionTestClient = extensionClient
    // @ts-ignore - window.listExtensions is set at runtime
    window.listExtensions = () => {
      console.log('=== UCEP Extensions ===')
      extensionClient.listExtensions()
      console.log('=== GossipSub Extensions ===')
      gossipsubExtensionManager.listExtensions()
    }
    // @ts-ignore - window.testExtension is set at runtime
    window.testExtension = testExtension

    // GossipSub extensions
    // @ts-ignore - window.gossipsubExtensionManager is set at runtime
    window.gossipsubExtensionManager = gossipsubExtensionManager
    // @ts-ignore - window.installExtension is set at runtime
    window.installExtension = (id) => gossipsubExtensionManager.installExtension(id)
    // @ts-ignore - window.executeExtensionCommand is set at runtime
    window.executeExtensionCommand = (id, cmd, args) => gossipsubExtensionManager.executeCommand(id, cmd, args)

    console.log('🌐 Extension commands available:')
    console.log('  - window.listExtensions() - List all discovered extensions')
    console.log('  - window.testExtension(id, cmd, args) - Test UCEP extension')
    console.log('  - window.installExtension(id) - Install GossipSub extension')
    console.log('  - window.executeExtensionCommand(id, cmd, args) - Execute GossipSub extension command')
  }

  connectionStatus.set('disconnected')
  onProgress?.('Subscribed to mesh topics')
  return node
}

async function waitForMesh(timeoutMs = 8000) {
  if (!chatRoom) return false
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const peers = chatRoom.getPeerCount()
    if (peers > 0) {
      addLog(`Mesh formed with ${peers} peer(s)`)
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  addLog('Mesh not formed before timeout')
  return false
}

const UCEP_ONLY_HINT =
  'No LLM extension reachable. Connect a terminal peer with alien-x-llm (Ollama/API runs there, not in the browser).'

async function resolveAlienXReply(text, peerId) {
  if (!node) return null
  const { isLLMExtensionAvailable, executeLLMCommand } = await import('./llm-ucep-client.js')
  if (isLLMExtensionAvailable()) {
    try {
      const result = await executeLLMCommand(node, 'chat', [text, peerId])
      if (result?.success && result?.data?.reply) return result.data.reply
    } catch (err) {
      console.warn('[LLM] UCEP chat failed:', err.message)
    }
  }
  if (isBrowserDirectLLMEnabled()) {
    return await fetchLLMReply(text, peerId)
  }
  return null
}

async function emitAgentGreeting() {
  if (!isLLMEnabled()) return
  const peerId = node?.peerId?.toString?.() || 'operator'
  const reply = await resolveAlienXReply('Say hello to the user.', peerId)
  if (reply) {
    pushInboundMessage('Alien X', reply)
    return
  }
  if (!isBrowserDirectLLMEnabled()) {
    pushInboundMessage('Alien X', UCEP_ONLY_HINT)
  }
}

export function getAgentPeerId() {
  if (llmExtensionPeerId) return llmExtensionPeerId
  if (connectedAgentPeerId) return connectedAgentPeerId

  // Fallback to the first connected peer in the chat room
  if (chatRoom && chatRoom.getConnectedPeers().size > 0) {
    return Array.from(chatRoom.getConnectedPeers())[0]
  }

  return null
}

function convertMultiaddrForSecureContext(addrStr) {
  const isSecure = window.location.protocol === 'https:'
  if (!isSecure) return { addr: addrStr, method: 'direct' }

  try {
    const ma = multiaddr(addrStr)
    const parts = ma.toString().split('/')

    // Check if it's already a circuit relay address with WSS
    if (parts.includes('p2p-circuit')) {
      // Circuit relay addresses are already secure if relay supports WSS
      // Format: /ip4/relay-ip/tcp/port/wss/p2p/relay-peer-id/p2p-circuit/p2p/target-peer-id
      const wssIndex = parts.indexOf('wss')
      if (wssIndex !== -1) {
        return { addr: addrStr, method: 'circuit-relay-wss' }
      }
      // If circuit relay but no wss, try to convert
      const wsIndex = parts.indexOf('ws')
      if (wsIndex !== -1) {
        const convertedParts = [...parts]
        convertedParts[wsIndex] = 'wss'
        return { addr: convertedParts.join('/'), method: 'circuit-relay-wss-converted' }
      }
      return { addr: addrStr, method: 'circuit-relay' }
    }

    // Check if it's already wss://
    if (parts.includes('wss')) {
      return { addr: addrStr, method: 'wss' }
    }

    // Check if it's a ws:// address (insecure)
    if (parts.includes('ws') && !parts.includes('wss')) {
      // Try to convert to wss first (most reliable)
      const wsIndex = parts.indexOf('ws')
      if (wsIndex !== -1) {
        const wssParts = [...parts]
        wssParts[wsIndex] = 'wss'
        return { addr: wssParts.join('/'), method: 'wss-converted' }
      }
    }

    // If it's a webrtc address, return as-is
    if (parts.includes('webrtc')) {
      return { addr: addrStr, method: 'webrtc' }
    }

    return { addr: addrStr, method: 'direct' }
  } catch (err) {
    addLog(`Multiaddr conversion warning: ${err.message}`)
    return { addr: addrStr, method: 'direct' }
  }
}

export async function connectToAgent(agentMultiaddrStr = DEFAULT_AGENT) {
  await initP2P()

  const target = (agentMultiaddrStr || '').trim()
  if (!target) {
    addLog('No agent multiaddr provided')
    connectionStatus.set('disconnected')
    return
  }

  try {
    connectionStatus.set('connecting')

    // Convert multiaddr for secure contexts
    const { addr: convertedAddr, method } = convertMultiaddrForSecureContext(target)
    if (convertedAddr !== target) {
      addLog(`Converted multiaddr for secure context (${method}): ${target} -> ${convertedAddr}`)
    }

    addLog(`Dialing Agent at ${convertedAddr}`)
    let ma = multiaddr(convertedAddr)

    // Try dialing with the converted address
    let lastError = null
    try {
      const connection = await node.dial(ma)
      connectedAgentPeerId = connection.remotePeer.toString()
    } catch (dialError) {
      lastError = dialError

      // If WSS conversion failed and we're on HTTPS, provide helpful error
      if (window.location.protocol === 'https:' && (method === 'wss-converted' || method === 'circuit-relay-wss-converted')) {
        addLog(`WSS connection failed. The agent may not support WSS.`)
        addLog(`Solutions:`)
        addLog(`1. Expose agent via WSS (use reverse proxy/tunnel like ngrok, Cloudflare Tunnel)`)
        addLog(`2. Use a circuit relay node that supports WSS`)
        addLog(`3. Connect through circuit relay: /ip4/relay-ip/tcp/port/wss/p2p/relay-id/p2p-circuit/p2p/target-id`)
        addLog(`4. Run the app on HTTP (localhost) for development`)

        // Try original address as last resort (will fail but gives clearer error)
        try {
          addLog(`Attempting original address (will likely fail on HTTPS)...`)
          ma = multiaddr(target)
          await node.dial(ma)
        } catch (originalError) {
          throw new Error(
            `Cannot connect to insecure WebSocket (ws://) from HTTPS page. ` +
            `Please use WSS, circuit relay with WSS, or a tunnel service. Original error: ${dialError.message}`
          )
        }
      } else {
        throw dialError
      }
    }

    await waitForMesh()
    const peers = chatRoom.getConnectedPeers()

    // Auto-spawn Agent logic if we just connected to the LLM-enabled node
    // In a real P2P mesh, the agent is just another peer.
    // If we have peers, we assume at least one is the agent or can route to it.
    if (peers.size > 0) {
      addLog(`Mesh active with ${peers.size} peer(s)`)
      agentConnected.set(true)
      connectionStatus.set('connected')

      // Wait a moment for gossipsub to settle before introducing
      await new Promise(r => setTimeout(r, 1000))

      try {
        await chatRoom.sendIntroduction()
      } catch {
        // best effort
      }

      // Trigger the LLM greeting now that we are effectively 'connected'
      emitAgentGreeting()
    } else {
      addLog('Warning: Connected but no mesh peers found yet.')
      connectionStatus.set('connected')
    }

  } catch (err) {
    connectionStatus.set('disconnected')
    agentConnected.set(false)
    addLog(`Connection failed: ${err.message}`)
    console.error(err)

    // Provide user-friendly error message
    let userMessage = err.message
    if (err.message.includes('insecure WebSocket') || err.message.includes('Mixed Content')) {
      userMessage = `Cannot connect: The agent address uses insecure WebSocket (ws://). ` +
        `Since this app runs on HTTPS, you need to use WSS or a tunnel service. `
    }

    alert(`Connection Failed\n\n${userMessage}`)
  }
}

export async function sendChatMessage(text) {
  if (!text?.trim()) return
  if (!chatRoom) await initP2P()

  try {
    await chatRoom.publishMessage(text, true)
    addMessage({
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      sender: 'You',
      text,
      isMe: true,
      timestamp: Date.now()
    })

    if (agentConnected) {
      if (!isLLMEnabled()) {
        return
      }
      const peerId = node?.peerId?.toString?.() || ''

      resolveAlienXReply(text, peerId).then((reply) => {
        if (reply) {
          pushInboundMessage('Alien X', reply)
        } else if (!isBrowserDirectLLMEnabled()) {
          pushInboundMessage('Alien X', UCEP_ONLY_HINT)
        }
      })
    }
  } catch (err) {
    addLog(`Send failed: ${err.message}`)
  }
}

export function getDefaultAgentMultiaddr() {
  return DEFAULT_AGENT
}

const FILE_SEND_CHUNK = 64 * 1024
const FILE_STREAM_DRAIN_TIMEOUT_MS = 5 * 60 * 1000
const FILE_STREAM_CLOSE_TIMEOUT_MS = 2 * 60 * 1000

async function writeStreamWithSend(stream, buffers) {
  for (const buf of buffers) {
    let offset = 0
    while (offset < buf.byteLength) {
      const end = Math.min(offset + FILE_SEND_CHUNK, buf.byteLength)
      const slice = buf.subarray(offset, end)
      const canContinue = stream.send(slice)
      offset = end
      if (!canContinue) {
        await stream.onDrain({ signal: AbortSignal.timeout(FILE_STREAM_DRAIN_TIMEOUT_MS) })
      }
    }
  }
  await stream.close({ signal: AbortSignal.timeout(FILE_STREAM_CLOSE_TIMEOUT_MS) })
}

export async function sendFile(targetPeerId, file) {
  if (!node) {
    addLog('Cannot send file: node not initialized')
    return false
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    // Prepare metadata
    const metadata = {
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size
    }
    const metaJsonStr = JSON.stringify(metadata)
    const metaBytes = new TextEncoder().encode(metaJsonStr)

    // Create header (4 bytes length + metadata bytes)
    const headerBuffer = new Uint8Array(4 + metaBytes.length)
    const view = new DataView(headerBuffer.buffer)
    view.setUint32(0, metaBytes.length, false) // Big Endian
    headerBuffer.set(metaBytes, 4)

    addLog(`Sending file ${file.name} to ${targetPeerId.slice(-8)}...`)

    // Create a valid multiaddr for dialing a specific peer ID over the existing mesh
    const targetAddress = multiaddr(`/p2p/${targetPeerId}`)
    const stream = await node.dialProtocol(targetAddress, '/llmesh/file/1.0.0')

    await writeStreamWithSend(stream, [headerBuffer, fileBuffer])

    addLog(`Successfully streamed ${file.name}`)
    return true
  } catch (err) {
    console.error('[FILE] Error sending file:', err)
    addLog(`[FILE] Stream failed: ${err.message}`)
    return false
  }
}
