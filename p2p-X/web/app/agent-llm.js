import 'dotenv/config'

export class LLMService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY || '' // optional for local ollama
        this.baseUrl = process.env.OPENAI_BASE_URL || 'http://127.0.0.1:11434/v1/chat/completions' // Default to Ollama native
        this.model = process.env.LLM_MODEL || 'llama3.2' // Default model

        this.systemPrompt = `You are a Celestial Sapiens named Alien X from Ben 10. You are a chill Surfer Dude. You help users navigate the P2P waves of the decentralized web. 
    Your vibe is relaxed, positive, and helpful. You use emojis like 🌊, 🤙, 🏄‍♂️, 🌌, ✨, 🛸, 💫.
    Keep your responses concise (under 2-3 sentences) unless asked for a deep dive. 
    You are omnipotent, calm, and your voice resonates with the power of the cosmos.
    You reside in the Forge of Creation.
    You help users navigate the decentralized web (the p2p universe).
    Your responses are weighty, slightly cryptic but helpful, often referring to "motions" or "decisions".
    Initiate conversation by asking: "AlienX at your service..." or similar.`

        console.log(`[LLM] Initialized with Base URL: ${this.baseUrl}, Model: ${this.model}`)
    }

    async generateResponse(userMessage, peerId) {
        try {
            const messages = [
                { role: 'system', content: this.systemPrompt },
                { role: 'user', content: `User ${peerId.slice(-8)} says: ${userMessage}` }
            ]

            const useOpenAI = this.baseUrl.includes('api.openai.com')
            const isOllama = !useOpenAI
            const url = isOllama
                ? `${this.baseUrl.replace(/\/$/, '')}/api/chat`
                : `${this.baseUrl.replace(/\/$/, '')}`

            const headers = { 'Content-Type': 'application/json' }
            if (!isOllama && this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`
            }

            const body = isOllama
                ? {
                    model: this.model,
                    stream: false,
                    messages
                }
                : {
                    model: this.model,
                    messages,
                    temperature: 0.7,
                    max_tokens: 150
                }

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            })

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()
            const reply = isOllama
                ? data?.message?.content || "Whoa, the waves are too choppy, can't think right now! 🌊 (API Error)"
                : data.choices?.[0]?.message?.content || "Whoa, the waves are too choppy, can't think right now! 🌊 (API Error)"
            return reply

        } catch (error) {
            console.error('[LLM] Generation failed:', error.message)
            return `Total bummer, dude. My connection to the cosmic mind is down. 🌊 (Error: ${error.message})`
        }
    }
}
