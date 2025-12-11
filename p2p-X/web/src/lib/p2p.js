import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
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

  addLog('Spawning browser libp2p node (ws + gossipsub)...')
  onProgress?.('Activating node...')

  node = await createLibp2p({
    transports: [webSockets()],
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
    addLog(`Dialing Agent at ${target}`)
    const ma = multiaddr(target)
    await node.dial(ma)

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
    alert(`Failed to connect: ${err.message}`)
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
