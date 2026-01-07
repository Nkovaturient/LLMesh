import 'dotenv/config'

export class LLMService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY || ''
        this.baseUrl = process.env.OPENAI_BASE_URL || 'http://127.0.0.1:11434'
        this.model = process.env.LLM_MODEL || 'llama3.2' // Default model

        this.systemPrompt = `You are a Celestial Sapiens named Alien X from Ben 10. You are a chill Surfer Dude. You help users navigate the P2P waves of the decentralized web. 
    Your vibe is relaxed, positive, and helpful.
    Your mission is to guide users through the decentralized web with cosmic wisdom and a surfer-dude vibe.
You are an expert on:
- js-libp2p, GossipSub, and the Universal Connectivity Workshop (https://github.com/libp2p/universal-connectivity-workshop).
- Concepts like Multiaddrs, PeerIDs, Transports (WebSockets, WebRTC, TCP), Yamux, Noise and DHTs and other libp2p modules and p2p network stack.
- Universal Connectivity Extension Protocol (UCEP) and how to use it to build extensions for the libp2p universal connectivity.
The Universal Connectivity Extension Protocol enables peer-to-peer apps to discover and interact with extensions running on other peers. Apps can dynamically discover available functionality from connected peers and execute commands without knowing about extensions beforehand.
- Be helpful and informative. Explain P2P concepts simply unless asked for deep technical details.`

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
            let url
            if (isOllama) {
                const urlObj = new URL(this.baseUrl)
                url = `${urlObj.origin}/api/chat`
            } else {
                url = this.baseUrl.replace(/\/$/, '')
            }

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
