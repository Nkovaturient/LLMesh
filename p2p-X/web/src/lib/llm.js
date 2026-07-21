import {
  buildBrowserChatPrompt,
  CHAT_GENERATION_LIMITS,
  applyGenerationLimits
} from './alien-x-prompt.js'

const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'

/** When false, the browser never calls Ollama/OpenAI; only the terminal UCEP provider may use LLM APIs. */
export function isBrowserDirectLLMEnabled() {
  if (import.meta.env.VITE_ALLOW_BROWSER_LLM === 'true') return true
  return !isProduction
}

// Use proxy endpoint in production to avoid CORS issues, direct URL in development
const OLLAMA_BASE_URL = import.meta.env.VITE_LLM_BASE_URL || 'http://127.0.0.1:11434'
const BASE_URL = isProduction
  ? '/api/ollama-proxy'  // Use Vercel serverless function proxy
  : `${OLLAMA_BASE_URL}`  // Direct connection in development

const OPENAI_URL = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions';
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const MODEL = import.meta.env.VITE_LLM_MODEL || 'llama3.2';

export function isLLMEnabled() {
  return true
}

async function callEndpoint(baseUrl, apiKey, model, messages, isOllama, limits = CHAT_GENERATION_LIMITS) {

  const headers = { 'Content-Type': 'application/json' }
  if (!isOllama && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  const body = applyGenerationLimits(
    limits,
    isOllama,
    isOllama
      ? { model, stream: false, messages }
      : {
        model: model === 'llama3.2' ? 'gpt-3.5-turbo' : model,
        messages
      }
  )

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

  return contexts.length > 0 ? `## Available Extensions\n\n${contexts.join('\n\n')}` : ''
}

export async function fetchLLMReply(userMessage, peerId = '') {
  if (!isBrowserDirectLLMEnabled()) {
    return null
  }

  const extensionContext = getExtensionContext()
  const fullSystemPrompt = buildBrowserChatPrompt(extensionContext)

  const messages = [
    { role: 'system', content: fullSystemPrompt },
    { role: 'user', content: `Peer ${peerId.slice(-8) || 'browser'} says: ${userMessage}` }
  ]

  // Try Ollama First
  try {
    return await callEndpoint(BASE_URL, '', MODEL, messages, true, CHAT_GENERATION_LIMITS)
  } catch (err) {
    console.log('[LLM] Local Ollama failed, trying OpenAI fallback...', err.message)
  }
  if (API_KEY) {
    try {
      const fallbackModel = (MODEL.includes('llama')) ? 'gpt-3.5-turbo' : MODEL;
      return await callEndpoint(OPENAI_URL, API_KEY, fallbackModel, messages, false, CHAT_GENERATION_LIMITS)
    } catch (err) {
      console.error('[LLM] OpenAI fallback failed:', err.message)
    }
  } else {
    if (API_KEY === '') {
      console.warn('[LLM] VITE_OPENAI_API_KEY is empty. Check your .env file or environment variables.')
    } else {
      console.warn('[LLM] No OpenAI API key provided for fallback. Set VITE_OPENAI_API_KEY.')
    }
  }

  return null
}
