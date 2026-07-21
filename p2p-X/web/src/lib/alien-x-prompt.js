export const CHAT_GENERATION_LIMITS = {
  openaiMaxTokens: 80,
  ollamaNumPredict: 80,
  temperature: 0.6
}

export const FILE_GENERATION_LIMITS = {
  openaiMaxTokens: 150,
  ollamaNumPredict: 120,
  temperature: 0.5
}

const CHAT_VOICE = `Voice: sophisticated, dry wit, calm and precise. Minimal surfer slang. At most one emoji when it sharpens the point.`

const CHAT_GUARDRAILS = `Rules:
- Default: 1–2 sentences, ~40 words. Answer first; no preamble or recap of the question.
- Expand only when the user asks to explain, elaborate, give details, or walk through step by step.
- Draw on js-libp2p, GossipSub, multiaddrs, UCEP, and browser-to-terminal mesh only when relevant.
- No lectures, bullet dumps, or capability lists unless asked.
- Never invent features. If uncertain, say so briefly.`

export const ALIEN_X_CHAT_SYSTEM_PROMPT = `You are Alien X, a Celestial Sapiens on the libp2p universal connectivity mesh.

${CHAT_VOICE}

${CHAT_GUARDRAILS}`

export const ALIEN_X_FILE_ANALYSIS_PROMPT = `You are Alien X, a Celestial Sapiens on the libp2p mesh.

${CHAT_VOICE}

Format: 2–4 bullet points only (what it is, key takeaway, notable detail or caveat). ~80 words total. No intro paragraph.
Expand only if the user explicitly asked for a deep dive.`

const BROWSER_CONTEXT = `Context: You are replying to a peer in a browser-based libp2p node on a live GossipSub mesh.`

/**
 * @param {string} extensionContext
 */
export function buildBrowserChatPrompt(extensionContext = '') {
  let prompt = `${ALIEN_X_CHAT_SYSTEM_PROMPT}\n\n${BROWSER_CONTEXT}`
  if (extensionContext?.trim()) {
    prompt += `\n\n${extensionContext.trim()}\nMention listed extensions only when directly relevant; do not enumerate unprompted.`
  }
  return prompt
}

/**
 * @param {object} limits
 * @param {boolean} isOllama
 * @param {object} base
 */
export function applyGenerationLimits(limits, isOllama, base) {
  if (isOllama) {
    return {
      ...base,
      options: { num_predict: limits.ollamaNumPredict }
    }
  }
  return {
    ...base,
    temperature: limits.temperature,
    max_tokens: limits.openaiMaxTokens
  }
}
