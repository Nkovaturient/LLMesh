/* eslint-disable no-console */

/**
 * LLM UCEP Client
 * 
 * Handles LLM requests via UCEP extension protocol
 * Falls back to direct LLM calls if extension not available
 */

let llmExtensionPeerId = null
let llmExtensionProtocol = null
let llmExtensionAvailable = false

/**
 * Initialize LLM extension client
 * Called when extensions are discovered
 */
export function setLLMExtension(peerId, protocol) {
  llmExtensionPeerId = peerId
  llmExtensionProtocol = protocol
  llmExtensionAvailable = true
  console.log('[LLM-UCEP] LLM extension available from peer:', peerId.slice(-8))
}

/**
 * Clear LLM extension (when peer disconnects)
 */
export function clearLLMExtension() {
  llmExtensionPeerId = null
  llmExtensionProtocol = null
  llmExtensionAvailable = false
  console.log('[LLM-UCEP] LLM extension cleared')
}

/**
 * Check if LLM extension is available
 */
export function isLLMExtensionAvailable() {
  return llmExtensionAvailable && llmExtensionPeerId && llmExtensionProtocol
}

/**
 * Get LLM extension client for use in p2p.js
 */
export function getLLMExtensionClient() {
  return {
    isAvailable: isLLMExtensionAvailable,
    peerId: llmExtensionPeerId,
    protocol: llmExtensionProtocol
  }
}

/**
 * Execute LLM command via UCEP
 */
export async function executeLLMCommand(node, command, args = [], options = {}) {
  if (!isLLMExtensionAvailable()) {
    throw new Error('LLM extension not available')
  }

  const { peerIdFromString } = await import('@libp2p/peer-id')
  const { pbStream } = await import('@libp2p/utils')
  const { ext } = await import('./protobuf/extension.js')
  
  const peerId = peerIdFromString(llmExtensionPeerId)
  const stream = await node.dialProtocol(peerId, llmExtensionProtocol)
  const datastream = pbStream(stream)

  try {
    const requestId = crypto.randomUUID()
    const request = {
      command: {
        requestId,
        extensionId: 'alien-x-llm',
        command,
        args,
        timestamp: BigInt(Date.now())
      }
    }

    const timeoutMs = options.timeoutMs ?? 30000
    const signal = AbortSignal.timeout(timeoutMs)
    await datastream.write(request, ext.Request, { signal })

    const response = await datastream.read(ext.Response, { signal })

    if (response.command) {
      if (response.command.success) {
        const data = response.command.data ? JSON.parse(response.command.data) : undefined
        return {
          success: true,
          data
        }
      } else {
        throw new Error(response.command.error || 'Command failed')
      }
    }

    throw new Error('Invalid response')
  } finally {
    try {
      await stream.close({ signal: AbortSignal.timeout(5000) })
    } catch (err) {
      stream.abort(err)
    }
  }
}

