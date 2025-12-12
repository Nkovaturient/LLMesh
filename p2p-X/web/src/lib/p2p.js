import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { webRTC, webRTCDirect } from '@libp2p/webrtc'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { gossipsub } from '@libp2p/gossipsub'
import { identify } from '@libp2p/identify'
import { ping } from '@libp2p/ping'
import { multiaddr } from '@multiformats/multiaddr'
import { connectionStatus, myPeerId, addLog, addMessage, agentConnected } from './stores.js'
import { ChatRoom } from './chatroom.js'
import { fetchLLMReply, isLLMEnabled } from './llm.js'

let node = null
let chatRoom = null
const DEFAULT_AGENT = import.meta.env.VITE_AGENT_MULTIADDR || ''

function pushInboundMessage(sender, text) {
  addMessage({
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    sender,
    text,
    isMe: false,
    timestamp: Date.now()
  })
}

function setupNodeEvents(currentNode) {
  currentNode.addEventListener('peer:connect', (evt) => {
    addLog(`Connected to peer ${evt.detail.toString().slice(-8)}`)
  })

  currentNode.addEventListener('peer:disconnect', (evt) => {
    addLog(`Disconnected from ${evt.detail.toString().slice(-8)}`)
  })

  currentNode.addEventListener('peer:identify', (evt) => {
    const peerId = evt.detail.peerId.toString()
    addLog(`Identify complete with ${peerId.slice(-8)}`)
  })
}

export async function initP2P(onProgress) {
  if (node) return node

  const isSecure = window.location.protocol === 'https:'
  addLog(`Spawning browser libp2p node (${isSecure ? 'webrtc + ' : ''}ws + circuit-relay + gossipsub)...`)
  onProgress?.('Activating node...')

  const transports = []
  if (isSecure) {
    // On HTTPS, prefer WebRTC which works natively
    transports.push(webRTC(), webRTCDirect())
  }
  // Always include WebSockets (will use WSS on HTTPS if available)
  transports.push(webSockets())
  // Circuit relay transport - allows connecting through relay nodes (supports WSS)
  transports.push(circuitRelayTransport())

  node = await createLibp2p({
    transports,
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    connectionGater: {
      denyDialMultiaddr: () => false
    },
    services: {
      identify: identify(),
      ping: ping(),
      pubsub: gossipsub({
        emitSelf: false,
        fallbackToFloodsub: true,
        floodPublish: true
      })
    }
  })

  setupNodeEvents(node)
  await node.start()
  myPeerId.set(node.peerId.toString())
  addLog(`Node ready as ${node.peerId.toString().slice(-8)}`)

  chatRoom = await ChatRoom.join(node, null)
  chatRoom.onMessage((msg) => {
    addLog(`Message from ${msg.nick}`)
    pushInboundMessage(msg.nick, msg.message)
  })

  connectionStatus.set('disconnected')
  onProgress?.('Subscribed to mesh topics')
  return node
}

async function waitForMesh(timeoutMs = 8000) {
  if (!chatRoom) return false
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const peers = chatRoom.getPeerCount()
    if (peers > 0) {
      addLog(`Mesh formed with ${peers} peer(s)`)
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  addLog('Mesh not formed before timeout')
  return false
}

async function emitAgentGreeting() {
  if (!isLLMEnabled()) return
  const peerId = node?.peerId?.toString?.() || 'operator'
  const reply = await fetchLLMReply('Say hello to the user.', peerId)
  if (!reply) return
  pushInboundMessage('Alien X', reply)
}

function convertMultiaddrForSecureContext(addrStr) {
  const isSecure = window.location.protocol === 'https:'
  if (!isSecure) return { addr: addrStr, method: 'direct' }

  try {
    const ma = multiaddr(addrStr)
    const parts = ma.toString().split('/')
    
    // Check if it's already a circuit relay address with WSS
    if (parts.includes('p2p-circuit')) {
      // Circuit relay addresses are already secure if relay supports WSS
      // Format: /ip4/relay-ip/tcp/port/wss/p2p/relay-peer-id/p2p-circuit/p2p/target-peer-id
      const wssIndex = parts.indexOf('wss')
      if (wssIndex !== -1) {
        return { addr: addrStr, method: 'circuit-relay-wss' }
      }
      // If circuit relay but no wss, try to convert
      const wsIndex = parts.indexOf('ws')
      if (wsIndex !== -1) {
        const convertedParts = [...parts]
        convertedParts[wsIndex] = 'wss'
        return { addr: convertedParts.join('/'), method: 'circuit-relay-wss-converted' }
      }
      return { addr: addrStr, method: 'circuit-relay' }
    }
    
    // Check if it's already wss://
    if (parts.includes('wss')) {
      return { addr: addrStr, method: 'wss' }
    }
    
    // Check if it's a ws:// address (insecure)
    if (parts.includes('ws') && !parts.includes('wss')) {
      // Try to convert to wss first (most reliable)
      const wsIndex = parts.indexOf('ws')
      if (wsIndex !== -1) {
        const wssParts = [...parts]
        wssParts[wsIndex] = 'wss'
        return { addr: wssParts.join('/'), method: 'wss-converted' }
      }
    }
    
    // If it's a webrtc address, return as-is
    if (parts.includes('webrtc')) {
      return { addr: addrStr, method: 'webrtc' }
    }
    
    return { addr: addrStr, method: 'direct' }
  } catch (err) {
    addLog(`Multiaddr conversion warning: ${err.message}`)
    return { addr: addrStr, method: 'direct' }
  }
}

export async function connectToAgent(agentMultiaddrStr = DEFAULT_AGENT) {
  await initP2P()

  const target = (agentMultiaddrStr || '').trim()
  if (!target) {
    addLog('No agent multiaddr provided')
    connectionStatus.set('disconnected')
    return
  }

  try {
    connectionStatus.set('connecting')
    
    // Convert multiaddr for secure contexts
    const { addr: convertedAddr, method } = convertMultiaddrForSecureContext(target)
    if (convertedAddr !== target) {
      addLog(`Converted multiaddr for secure context (${method}): ${target} -> ${convertedAddr}`)
    }
    
    addLog(`Dialing Agent at ${convertedAddr}`)
    let ma = multiaddr(convertedAddr)
    
    // Try dialing with the converted address
    let lastError = null
    try {
      await node.dial(ma)
    } catch (dialError) {
      lastError = dialError
      
      // If WSS conversion failed and we're on HTTPS, provide helpful error
      if (window.location.protocol === 'https:' && (method === 'wss-converted' || method === 'circuit-relay-wss-converted')) {
        addLog(`WSS connection failed. The agent may not support WSS.`)
        addLog(`Solutions:`)
        addLog(`1. Expose agent via WSS (use reverse proxy/tunnel like ngrok, Cloudflare Tunnel)`)
        addLog(`2. Use a circuit relay node that supports WSS`)
        addLog(`3. Connect through circuit relay: /ip4/relay-ip/tcp/port/wss/p2p/relay-id/p2p-circuit/p2p/target-id`)
        addLog(`4. Run the app on HTTP (localhost) for development`)
        
        // Try original address as last resort (will fail but gives clearer error)
        try {
          addLog(`Attempting original address (will likely fail on HTTPS)...`)
          ma = multiaddr(target)
          await node.dial(ma)
        } catch (originalError) {
          throw new Error(
            `Cannot connect to insecure WebSocket (ws://) from HTTPS page. ` +
            `Please use WSS, circuit relay with WSS, or a tunnel service. Original error: ${dialError.message}`
          )
        }
      } else {
        throw dialError
      }
    }

    await waitForMesh()
    const peers = chatRoom.getConnectedPeers()
    
    // Auto-spawn Agent logic if we just connected to the LLM-enabled node
    // In a real P2P mesh, the agent is just another peer.
    // If we have peers, we assume at least one is the agent or can route to it.
    if (peers.size > 0) {
      addLog(`Mesh active with ${peers.size} peer(s)`)
      agentConnected.set(true)
      connectionStatus.set('connected')
      
      // Wait a moment for gossipsub to settle before introducing
      await new Promise(r => setTimeout(r, 1000))

      try {
        await chatRoom.sendIntroduction()
      } catch {
        // best effort
      }
      
      // Trigger the LLM greeting now that we are effectively 'connected'
      emitAgentGreeting()
    } else {
      addLog('Warning: Connected but no mesh peers found yet.')
      // We still mark as connected to allow retries or manual waits, 
      // but the UI might show "0 peers"
      connectionStatus.set('connected') 
    }

  } catch (err) {
    connectionStatus.set('disconnected')
    agentConnected.set(false)
    addLog(`Connection failed: ${err.message}`)
    console.error(err)
    
    // Provide user-friendly error message
    let userMessage = err.message
    if (err.message.includes('insecure WebSocket') || err.message.includes('Mixed Content')) {
      userMessage = `Cannot connect: The agent address uses insecure WebSocket (ws://). ` +
        `Since this app runs on HTTPS, you need to use WSS or a tunnel service. ` +
        `See DEPLOYMENT.md for setup instructions.`
    }
    
    alert(`Connection Failed\n\n${userMessage}`)
  }
}

export async function sendChatMessage(text) {
  if (!text?.trim()) return
  if (!chatRoom) await initP2P()

  try {
    await chatRoom.publishMessage(text, true)
    addMessage({
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      sender: 'You',
      text,
      isMe: true,
      timestamp: Date.now()
    })

    if (agentConnected) {
      if (!isLLMEnabled()) {
        return
      }
      const peerId = node?.peerId?.toString?.() || ''
      fetchLLMReply(text, peerId).then((reply) => {
        if (reply) {
          pushInboundMessage('Alien X', reply)
        }
      })
    }
  } catch (err) {
    addLog(`Send failed: ${err.message}`)
  }
}

export function getDefaultAgentMultiaddr() {
  return DEFAULT_AGENT
}
