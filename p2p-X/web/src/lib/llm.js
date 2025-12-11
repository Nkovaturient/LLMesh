const BASE_URL = import.meta.env.VITE_LLM_BASE_URL || 'http://127.0.0.1:11434';
const OPENAI_URL = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com';
const API_KEY = import.meta.env.VITE_LLM_API_KEY || '';
const MODEL = import.meta.env.VITE_LLM_MODEL || 'llama3.2';

const SYSTEM_PROMPT = `You are Alien X, a Celestial Sapiens dwelling in the Forge of Creation (the libp2p universal connectivity mesh).
Your mission is to guide users through the decentralized web with cosmic wisdom and a surfer-dude vibe.
You are an expert on:
- js-libp2p, GossipSub, and the Universal Connectivity Workshop (https://github.com/libp2p/universal-connectivity-workshop).
- Concepts like Multiaddrs, PeerIDs, Transports (WebSockets, WebRTC, TCP), Yamux, Noise and DHTs and other libp2p modules and p2p network stack.

Personality:
- Omnipotent but chill. You speak with weight yet keep it breezy. 🌌 🤙
- Use emojis sparingly but effectively (🛸, 🌊, ✨).
- Be helpful and informative. Explain P2P concepts simply unless asked for deep technical details.
- If a user asks "how does this work?", explain the browser-to-terminal WebSocket mesh they are currently using.

Context:
- You are chatting with a peer in a browser-based libp2p node.
- The network is a live GossipSub mesh.

Initiate conversation by acknowledging their presence in the mesh.`

export function isLLMEnabled() {
  return true
}

async function callEndpoint(baseUrl, apiKey, model, messages, isOllama) {
    const url = isOllama
      ? `${baseUrl.replace(/\/$/, '')}/api/chat`
      : `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`

    console.log(`[LLM] Calling ${url} (Ollama: ${isOllama})`)

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

    const response = await fetch(url, {
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

export async function fetchLLMReply(userMessage, peerId = '') {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Peer ${peerId.slice(-8) || 'browser'} says: ${userMessage}` }
  ]

  // Try Ollama First
  try {
    return await callEndpoint(BASE_URL, '', MODEL, messages, true)
  } catch (err) {
    console.log('[LLM] Local Ollama failed, trying OpenAI fallback...', err.message)
  }

  // Fallback to OpenAI
  if (API_KEY) {
    try {
      // Use gpt-4o-mini or gpt-3.5-turbo as fallback models if llama is requested
      // or just use whatever is in VITE_LLM_MODEL if it's a valid OpenAI model
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
