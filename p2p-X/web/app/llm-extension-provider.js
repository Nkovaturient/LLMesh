/* eslint-disable no-console */

/**
 * Create LLM Extension Provider
 * 
 * This makes the LLM service available as a UCEP extension
 * that can be discovered and used by browser peers
 */
export function createLLMExtension(llmService) {
  return {
    id: 'alien-x-llm',
    name: 'Alien X LLM Assistant',
    version: '1.0.0',
    description: 'AI assistant powered by LLM - Your cosmic guide to the decentralized web',
    author: 'Universal Connectivity',
    publicUrl: '',
    icon: '🛸',
    commands: [
      {
        name: 'chat',
        syntax: 'chat <message>',
        description: 'Send a message to the AI assistant and get a response'
      },
      {
        name: 'ping',
        syntax: 'ping',
        description: 'Check if the LLM service is available'
      }
    ],
    handler: async (command, args) => {
      if (command === 'chat') {
        // Args format: [message, peerId] or just [message]
        let message = ''
        let peerId = 'browser'
        
        if (args.length >= 2) {
          // Last arg is peerId, rest is message
          peerId = args[args.length - 1]
          message = args.slice(0, -1).join(' ')
        } else if (args.length === 1) {
          message = args[0]
        }
        
        if (!message) {
          throw new Error('Message is required')
        }
        
        try {
          const response = await llmService.generateResponse(message, peerId)
          return {
            success: true,
            reply: response,
            timestamp: Date.now()
          }
        } catch (error) {
          console.error('[LLM Extension] Chat failed:', error)
          throw new Error(`LLM generation failed: ${error.message}`)
        }
      } else if (command === 'ping') {
        return {
          success: true,
          reply: 'pong',
          service: 'alien-x-llm',
          timestamp: Date.now()
        }
      } else {
        throw new Error(`Unknown command: ${command}`)
      }
    }
  }
}

