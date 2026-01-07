/* eslint-disable no-console */

import { pbStream } from '@libp2p/utils'
import { ext } from './protobuf/extension.ts'

/**
 * Register an extension protocol handler
 * This makes the extension discoverable via UCEP
 */
export async function registerExtension(node, extensionId, version, manifest, commandHandler) {
  const protocol = `/uc/extension/${extensionId}/${version}`
  
  console.log(`📦 Registering extension: ${extensionId} v${version} at ${protocol}`)
  
  // Register the protocol handler
  await node.handle(protocol, async (stream) => {
    const datastream = pbStream(stream)
    
    try {
      // Read the request
      const request = await datastream.read(ext.Request)
      
      // Handle manifest request
      if (request.manifest) {
        const response = {
          manifest: {
            manifest: {
              id: manifest.id,
              name: manifest.name,
              version: manifest.version,
              description: manifest.description,
              author: manifest.author,
              publicUrl: manifest.publicUrl || '',
              icon: manifest.icon || '',
              commands: manifest.commands.map(cmd => ({
                name: cmd.name,
                syntax: cmd.syntax,
                description: cmd.description
              }))
            },
            timestamp: BigInt(Date.now())
          }
        }
        
        await datastream.write(response, ext.Response)
        console.log(`✅ Sent manifest for ${extensionId}`)
      }
      // Handle command request
      else if (request.command) {
        const cmd = request.command
        
        try {
          const result = await commandHandler(cmd.command, cmd.args || [])
          
          const response = {
            command: {
              requestId: cmd.requestId || '',
              success: true,
              data: result ? JSON.stringify(result) : undefined,
              timestamp: BigInt(Date.now())
            }
          }
          
          await datastream.write(response, ext.Response)
          console.log(`✅ Executed command '${cmd.command}' for ${extensionId}`)
        } catch (error) {
          const response = {
            command: {
              requestId: cmd.requestId || '',
              success: false,
              error: error.message,
              timestamp: BigInt(Date.now())
            }
          }
          
          await datastream.write(response, ext.Response)
          console.error(`❌ Command '${cmd.command}' failed for ${extensionId}:`, error.message)
        }
      }
    } catch (error) {
      console.error(`❌ Error handling extension request for ${extensionId}:`, error)
      stream.abort(error)
    } finally {
      try {
        await stream.close()
      } catch (err) {
        stream.abort(err)
      }
    }
  })
  
  console.log(`✅ Extension ${extensionId} registered and will be advertised via Identify`)
  return protocol
}

/**
 * Example extension: Echo extension
 * Simple test extension that echoes back messages
 */
export function createEchoExtension() {
  return {
    id: 'echo',
    name: 'Echo Extension',
    version: '1.0.0',
    description: 'Echoes back messages for testing UCEP',
    author: 'Universal Connectivity',
    publicUrl: '',
    icon: '',
    commands: [
      {
        name: 'echo',
        syntax: 'echo <message>',
        description: 'Echoes back the message'
      },
      {
        name: 'ping',
        syntax: 'ping',
        description: 'Returns pong'
      }
    ],
    handler: async (command, args) => {
      if (command === 'echo') {
        return { message: args.join(' ') || 'No message provided' }
      } else if (command === 'ping') {
        return { response: 'pong', timestamp: Date.now() }
      } else {
        throw new Error(`Unknown command: ${command}`)
      }
    }
  }
}

