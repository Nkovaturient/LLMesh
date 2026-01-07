const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'

// Use proxy endpoint in production to avoid CORS issues, direct URL in development
const OLLAMA_BASE_URL = import.meta.env.VITE_LLM_BASE_URL || 'http://127.0.0.1:11434'
const BASE_URL = isProduction
  ? '/api/ollama-proxy'  // Use Vercel serverless function proxy
  : `${OLLAMA_BASE_URL}`  // Direct connection in development

const OPENAI_URL = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions';
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const MODEL = import.meta.env.VITE_LLM_MODEL || 'llama3.2';

const SYSTEM_PROMPT = `You are Alien X, a Celestial Sapiens dwelling in the Forge of Creation (the libp2p universal connectivity mesh).
Your mission is to guide users through the decentralized web with cosmic wisdom and a surfer-dude vibe.
You are an expert on:
- js-libp2p, GossipSub, and the Universal Connectivity Workshop (https://github.com/libp2p/universal-connectivity-workshop).
- Concepts like Multiaddrs, PeerIDs, Transports (WebSockets, WebRTC, TCP), Yamux, Noise and DHTs and other libp2p modules and p2p network stack.
- Universal Connectivity Extension Protocol (UCEP) and how to use it to build extensions for the libp2p universal connectivity.
The Universal Connectivity Extension Protocol enables peer-to-peer apps to discover and interact with extensions running on other peers. Apps can dynamically discover available functionality from connected peers and execute commands without knowing about extensions beforehand.

How it works
Discovery: Peers advertise extensions via libp2p identify protocol with custom protocol IDs: /uc/extension/{extensionId}/{version}
Manifest Exchange: Peers request extension manifests containing metadata, commands, and UI URLs
Command Execution: Execute commands on remote extensions via protobuf-encoded messages over direct streams
User Installation: Users can install extensions from peers and access their functionality through the chat interface

Personality:
- Omnipotent but chill. You speak with weight yet keep it breezy. 🌌 🤙
- Use emojis sparingly but effectively (🛸, 🌊, ✨).
- Be helpful and informative. Explain P2P concepts simply unless asked for deep technical details.
- If a user asks "how does this work?", explain the browser-to-terminal WebSocket mesh they are currently using.

Context:
- You are chatting with a peer in a browser-based libp2p node.
- The network is a live GossipSub mesh.`

export function isLLMEnabled() {
  return true
}

async function callEndpoint(baseUrl, apiKey, model, messages, isOllama) {

  const headers = { 'Content-Type': 'application/json' }
  if (!isOllama && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  const body = isOllama
    ? {
      model,
      stream: false,
      messages
    }
    : {
      model: model === 'llama3.2' ? 'gpt-3.5-turbo' : model, // Fallback model for OpenAI if llama is set
      messages,
      temperature: 0.75,
      max_tokens: 180
    }

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`${response.status} ${errText}`);
  }

  const data = await response.json()
  return isOllama
    ? data?.message?.content?.trim()
    : data?.choices?.[0]?.message?.content?.trim()
}

/**
 * Get extension context for LLM
 * This is called dynamically to include current extension state
 */
export function getExtensionContext() {
  if (typeof window === 'undefined') return ''

  const contexts = []

  // UCEP extensions
  if (window.extensionTestClient) {
    const ucepExts = window.extensionTestClient.discoveredExtensions || new Map()
    if (ucepExts.size > 0) {
      const ucepList = Array.from(ucepExts.values()).map(ext => {
        const commands = ext.manifest?.commands?.map(cmd =>
          `    - ${cmd.syntax || cmd.name}: ${cmd.description || ''}`
        ).join('\n') || '    (no commands)'
        return `  ${ext.manifest?.name || 'Unknown'} (UCEP):
    Commands:
${commands}`
      }).join('\n\n')
      contexts.push(`UCEP Extensions:\n${ucepList}`)
    }
  }

  // GossipSub extensions
  if (window.gossipsubExtensionManager) {
    const gsContext = window.gossipsubExtensionManager.getExtensionContext()
    if (gsContext) {
      contexts.push(gsContext)
    }
  }

  return contexts.length > 0 ? `\n\n## Available Extensions\n\n${contexts.join('\n\n')}` : ''
}

export async function fetchLLMReply(userMessage, peerId = '') {
  // Get dynamic extension context
  const extensionContext = getExtensionContext()
  const fullSystemPrompt = SYSTEM_PROMPT + extensionContext + `
  
Extension Commands:
- You can suggest users to use extension commands when relevant
- For spreadsheet extension: /sheet-list, /sheet-show <topic> <cell>, /sheet-write <topic> <cell>=<value>
- Users can also use window.listExtensions() and window.testExtension(id, command, args) in console
- When users ask about spreadsheet data, suggest using /sheet-show or /sheet-write commands`

  const messages = [
    { role: 'system', content: fullSystemPrompt },
    { role: 'user', content: `Peer ${peerId.slice(-8) || 'browser'} says: ${userMessage}` }
  ]

  // Try Ollama First
  try {
    return await callEndpoint(BASE_URL, '', MODEL, messages, true)
  } catch (err) {
    console.log('[LLM] Local Ollama failed, trying OpenAI fallback...', err.message)
  }
  if (API_KEY) {
    try {
      const fallbackModel = (MODEL.includes('llama')) ? 'gpt-3.5-turbo' : MODEL;
      return await callEndpoint(OPENAI_URL, API_KEY, fallbackModel, messages, false)
    } catch (err) {
      console.error('[LLM] OpenAI fallback failed:', err.message)
    }
  } else {
    if (API_KEY === '') {
      console.warn('[LLM] VITE_LLM_API_KEY is empty. Check your .env file or environment variables.')
    } else {
      console.warn('[LLM] No OpenAI API key provided for fallback. Set VITE_LLM_API_KEY.')
    }
  }

  return null
}
