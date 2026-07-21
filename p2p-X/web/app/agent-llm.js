import 'dotenv/config'
import {
    ALIEN_X_CHAT_SYSTEM_PROMPT,
    ALIEN_X_FILE_ANALYSIS_PROMPT,
    CHAT_GENERATION_LIMITS,
    FILE_GENERATION_LIMITS,
    applyGenerationLimits
} from '../src/lib/alien-x-prompt.js'

export class LLMService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY || ''
        this.baseUrl = process.env.OPENAI_BASE_URL || 'http://127.0.0.1:11434'
        this.model = process.env.LLM_MODEL || 'llama3.2' // Default model

        console.log(`[LLM] Initialized with Base URL: ${this.baseUrl}, Model: ${this.model}`)
    }

    async generateResponse(userMessage, peerId) {
        try {
            const messages = [
                { role: 'system', content: ALIEN_X_CHAT_SYSTEM_PROMPT },
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

            const body = applyGenerationLimits(
                CHAT_GENERATION_LIMITS,
                isOllama,
                isOllama
                    ? { model: this.model, stream: false, messages }
                    : { model: this.model, messages }
            )

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
                    { role: 'system', content: ALIEN_X_FILE_ANALYSIS_PROMPT },
                    { role: 'user', content: `User ${peerId.slice(-8)} sent a file named ${filename}. Here is the content:\n\n${textContent}\n\nSummarize in 2–4 bullet points.` }
                ]

                const body = applyGenerationLimits(
                    FILE_GENERATION_LIMITS,
                    isOllama,
                    isOllama
                        ? { model: this.model, stream: false, messages }
                        : { model: this.model, messages }
                )

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
                    { role: 'system', content: ALIEN_X_FILE_ANALYSIS_PROMPT },
                    {
                        role: 'user',
                        content: `User ${peerId.slice(-8)} sent an image file named ${filename}. Summarize in 2–4 bullet points what you see.`,
                        images: isOllama ? [base64Image] : undefined // OpenAI handles images differently, keep it simple for Ollama first
                    }
                ]

                // For OpenAI API compatibility with vision:
                if (!isOllama) {
                    messages[1].content = [
                        { type: "text", text: `User ${peerId.slice(-8)} sent an image file named ${filename}. Summarize in 2–4 bullet points what you see.` },
                        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                    ]
                }

                const body = applyGenerationLimits(
                    FILE_GENERATION_LIMITS,
                    isOllama,
                    isOllama
                        ? { model: targetModel, stream: false, messages }
                        : { model: targetModel, messages }
                )

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

const llmService = new LLMService()

export default llmService
