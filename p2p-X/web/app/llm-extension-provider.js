/* eslint-disable no-console */

const EXTENSION_ID = 'alien-x-llm'
const EXTENSION_VERSION = '1.0.0'

/**
 * Create the terminal-hosted Alien X LLM UCEP extension.
 * Browser peers discover this provider and execute chat through libp2p
 * instead of calling Ollama/OpenAI directly from production UI builds.
 */
export function createLLMExtension(llmService) {
  if (!llmService) {
    throw new Error('LLMService instance is required to create the LLM extension')
  }

  return {
    id: EXTENSION_ID,
    name: 'Alien X LLM',
    version: EXTENSION_VERSION,
    description: 'Terminal-hosted Alien X assistant backed by Ollama or an OpenAI-compatible API',
    author: 'LLMesh',
    publicUrl: '',
    icon: '🛸',
    commands: [
      {
        name: 'chat',
        syntax: 'chat <message> [peerId]',
        description: 'Generate an Alien X response for a chat message'
      },
      {
        name: 'ping',
        syntax: 'ping',
        description: 'Return provider health and active model configuration'
      }
    ],
    handler: async (command, args = []) => {
      if (command === 'chat') {
        const [message = '', peerId = 'terminal'] = args
        const prompt = String(message).trim()

        if (!prompt) {
          throw new Error('chat requires a non-empty message')
        }

        const reply = await llmService.generateResponse(prompt, String(peerId || 'terminal'))
        return { reply }
      }

      if (command === 'ping') {
        return {
          response: 'pong',
          provider: EXTENSION_ID,
          model: llmService.model,
          baseUrl: llmService.baseUrl,
          timestamp: Date.now()
        }
      }

      throw new Error(`Unknown command: ${command}`)
    }
  }
}
