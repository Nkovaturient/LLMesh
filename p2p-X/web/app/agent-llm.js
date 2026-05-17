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

    async analyzeFile(filename, mimeType, fileBuffer, peerId) {
        try {
            console.log(`[LLM] Analyzing file ${filename} (${mimeType}) from ${peerId}...`)
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

            let messages = []

            // Handle Text-based files
            if (mimeType.includes('text') || filename.endsWith('.txt') || filename.endsWith('.md') || filename.endsWith('.csv') || filename.endsWith('.json') || filename.endsWith('.js')) {
                const textContent = new TextDecoder().decode(fileBuffer)
                messages = [
                    { role: 'system', content: this.systemPrompt },
                    { role: 'user', content: `User ${peerId.slice(-8)} sent a file named ${filename}. Here is the content:\n\n${textContent}\n\nPlease analyze this file.` }
                ]

                const body = isOllama
                    ? { model: this.model, stream: false, messages }
                    : { model: this.model, messages, temperature: 0.7, max_tokens: 500 }

                console.log(`[LLM] Sending text analysis request...`)
                const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
                if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`)

                const data = await response.json()
                return isOllama ? data?.message?.content : data.choices?.[0]?.message?.content

            }
            // Handle Images
            else if (mimeType.startsWith('image/') || filename.match(/\.(jpg|jpeg|png)$/i)) {
                // Determine model to use: prefer 'llava' for images if using Ollama
                const targetModel = isOllama ? 'llava' : 'gpt-4-vision-preview' // assuming openai has vision
                const base64Image = Buffer.from(fileBuffer).toString('base64')

                messages = [
                    { role: 'system', content: this.systemPrompt },
                    {
                        role: 'user',
                        content: `User ${peerId.slice(-8)} sent an image file named ${filename}. What do you see in this image?`,
                        images: isOllama ? [base64Image] : undefined // OpenAI handles images differently, keep it simple for Ollama first
                    }
                ]

                // For OpenAI API compatibility with vision:
                if (!isOllama) {
                    messages[1].content = [
                        { type: "text", text: `User ${peerId.slice(-8)} sent an image file named ${filename}. What do you see in this image?` },
                        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                    ]
                }

                const body = isOllama
                    ? { model: targetModel, stream: false, messages }
                    : { model: targetModel, messages, max_tokens: 500 }

                console.log(`[LLM] Sending image analysis request to model ${targetModel}...`)
                const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })

                if (!response.ok) {
                    if (response.status === 404 && isOllama) {
                        return `Whoa dude! 🛸 I need the 'llava' model to see images. Tell the operator to run: 'ollama pull llava'`
                    }
                    throw new Error(`API Error: ${response.status} ${response.statusText}`)
                }

                const data = await response.json()
                return isOllama ? data?.message?.content : data.choices?.[0]?.message?.content
            } else {
                return `Sorry dude, I can only read text and image files right now. 🌊 That file type is a bit too alien for me.`
            }

        } catch (error) {
            console.error('[LLM] File analysis failed:', error.message)
            return `Whoa, the cosmic rays scrambled that file! 🌊 (Error: ${error.message})`
        }
    }
}
