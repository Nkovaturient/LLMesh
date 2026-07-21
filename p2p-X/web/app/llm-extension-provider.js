export function createAlienXLLMExtension(llmService) {
  return {
    id: 'alien-x-llm',
    name: 'Alien X LLM',
    version: '1.0.0',
    description: 'Celestial Sapiens LLM via Ollama/OpenAI on the terminal',
    author: 'LLMesh',
    publicUrl: '',
    icon: '',
    commands: [
      { name: 'chat', syntax: 'chat <message>', description: 'Chat with Alien X' },
      { name: 'ping', syntax: 'ping', description: 'LLM extension health check' }
    ],
    handler: async (command, args) => {
      if (command === 'chat') {
        const message = args[0] ?? ''
        const peerId = args[1] ?? 'browser'
        const reply = await llmService.generateResponse(message, peerId)
        return { reply }
      }
      if (command === 'ping') {
        return { response: 'pong', model: llmService.model, timestamp: Date.now() }
      }
      throw new Error(`Unknown command: ${command}`)
    }
  }
}
