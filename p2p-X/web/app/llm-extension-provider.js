/**
 * UCEP provider for the terminal-hosted LLM.
 *
 * The browser discovers this extension over Identify, then executes commands
 * through /uc/extension/alien-x-llm/1.0.0 instead of calling Ollama/OpenAI
 * directly from a hosted UI.
 */
export function createLLMExtension(llmService) {
  return {
    id: 'alien-x-llm',
    name: 'Alien X LLM',
    version: '1.0.0',
    description: 'Terminal-hosted LLM assistant exposed through UCEP.',
    author: 'LLMesh',
    publicUrl: '',
    icon: '',
    commands: [
      {
        name: 'chat',
        syntax: 'chat <message>',
        description: 'Generate an LLM reply for a chat message.'
      },
      {
        name: 'ping',
        syntax: 'ping',
        description: 'Check that the terminal LLM extension is reachable.'
      }
    ],
    handler: async (command, args = [], peerId = 'ucep-peer') => {
      if (command === 'ping') {
        return {
          response: 'pong',
          provider: 'alien-x-llm',
          model: llmService.model,
          timestamp: Date.now()
        }
      }

      if (command === 'chat') {
        const message = args.join(' ').trim()
        if (!message) {
          throw new Error('chat command requires a message')
        }

        const reply = await llmService.generateResponse(message, peerId)
        return { reply }
      }

      throw new Error(`Unknown LLM command: ${command}`)
    }
  }
}
