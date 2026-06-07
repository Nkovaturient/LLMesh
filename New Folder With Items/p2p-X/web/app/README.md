# LLMesh Terminal Agent 🛸

> **Terminal Node: LLM Extension Provider & P2P Gateway**

A headless libp2p node that serves as your **LLM extension provider** and **P2P gateway** for the LLMesh network.

## What It Does

- ✅ **UCEP Extension Provider** - Exposes LLM as discoverable extension (`alien-x-llm`)
- ✅ **P2P Gateway** - Bridges browser peers to the mesh
- ✅ **GossipSub Chat** - Real-time decentralized messaging
- ✅ **Protocol Hub** - TCP, WebSocket, WebRTC, Circuit Relay support

## Architecture

```
┌─────────────────────────────────┐
│     Terminal Node (index.js)    │
├─────────────────────────────────┤
│  ┌───────────────────────────┐ │
│  │  UCEP Extension Provider   │ │
│  │  /uc/extension/alien-x-llm │ │
│  └───────────┬─────────────────┘ │
│              │                    │
│  ┌───────────▼─────────────────┐ │
│  │  LLM Service (Ollama/OpenAI)│ │
│  └─────────────────────────────┘ │
├─────────────────────────────────┤
│  GossipSub │ Identify │ Ping    │
├─────────────────────────────────┤
│  Noise + Yamux (Encrypted)      │
├─────────────────────────────────┤
│  TCP │ WebSocket │ WebRTC       │
└─────────────────────────────────┘
         ▲
         │
    Browser Peers
```

## Quick Start

### 1. Install Dependencies
```bash
cd libp2p-ai/p2p-X/web/app
npm install
```

### 2. Start Ollama (Optional but Recommended)
```bash
ollama serve
# Pull model: ollama pull llama3.2
```

### 3. Run Terminal Agent
```bash
node index.js
```

**Look for this output:**
```
[SYSTEM] Listening on 2 address(es):
  /ip4/127.0.0.1/tcp/57704/ws/p2p/12D3KooW...
[UCEP] LLM extension registered: alien-x-llm
✅ READY TO CHAT!
```

**Copy the `/ws` multiaddr** - you'll need it for the browser!

## UCEP Extension Flow

### Provider Side (This Node)

```
Terminal Node
  │
  ├─> Registers LLM Extension
  │   Protocol: /uc/extension/alien-x-llm/1.0.0
  │
  ├─> Advertises via Identify Protocol
  │   (Browser discovers automatically)
  │
  └─> Handles Commands
      ├─> chat <message> → LLM Response
      └─> ping → Health Check
```

### Consumer Side (Browser)

```
Browser Node
  │
  ├─> Discovers Extension (Identify Protocol)
  │
  ├─> Fetches Manifest (UCEP Protocol)
  │
  └─> Executes Commands
      └─> Direct protobuf stream to terminal
```

## Features

### UCEP Extensions
- **Echo Extension** - Test extension (`/uc/extension/echo/1.0.0`)
- **LLM Extension** - AI assistant (`/uc/extension/alien-x-llm/1.0.0`)

### Protocols
- **GossipSub** - Chat messaging
- **Identify** - Peer capability exchange
- **Ping** - Connection health
- **Kademlia DHT** - Peer discovery

### Transports
- **TCP** - Reliable connections
- **WebSocket** - Browser connectivity
- **WebRTC** - Direct P2P (when available)
- **Circuit Relay** - NAT traversal

## Environment Variables

```bash
# LLM Configuration
OPENAI_BASE_URL=http://127.0.0.1:11434  # Ollama default
LLM_MODEL=llama3.2                      # Model name
OPENAI_API_KEY=                         # Optional (for OpenAI)

# Connection
REMOTE_PEER=/ip4/127.0.0.1/tcp/9091/p2p/...  # Auto-connect
```

## Usage Examples

### Standalone Mode
```bash
node index.js
# Runs in standalone mode, waits for connections
```

### Connect to Remote Peer
```bash
node index.js /ip4/127.0.0.1/tcp/9091/p2p/12D3KooW...
# Connects to specified peer on startup
```

### Interactive Chat
Once connected, type messages in the terminal:
```
[YourNickname]> Hello mesh!
[PeerXyz]: Hey! This is awesome!
```

## Testing Extensions

### In Terminal (This Node)
```bash
# Extensions are automatically registered
# Check logs for: "[UCEP] LLM extension registered"
```

### From Browser Console
```javascript
// List discovered extensions
window.listExtensions()

// Test LLM extension
window.testExtension('alien-x-llm', 'chat', ['Hello!'])
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `404 Not Found` (LLM) | Check Ollama is running: `ollama serve` |
| Extension not discovered | Wait for Identify protocol exchange (2-3s) |
| Connection refused | Verify multiaddr format includes `/ws` |
| No mesh formed | Check GossipSub subscription logs |

## What's Next?

- Connect browser to this terminal node
- Discover and use LLM extension via UCEP
- Chat with Alien X AI assistant
- Explore collaborative spreadsheet extensions

---

**Ready to mesh?** Start the browser UI and connect! 🚀

**Supported File Transfers:** Currently supports Text files and Images. *Note: To process image files, you must ensure the `llava` model is pulled and active via Ollama.*
