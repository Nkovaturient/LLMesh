# LLMesh 🛸🌊

> **"Navigate the Decentralized Cosmos with Libp2p: Universal Connectivity workshop"**

<!-- <img width="2816" height="1536" alt="Gemini_Generated_Image_ive536ive536ive5" src="https://github.com/user-attachments/assets/9fb661bb-2ff3-4861-b5f7-d7576f02c4d8" /> -->
<img width="2816" height="1536" alt="Gemini_Generated_Image_d6qg6ld6qg6ld6qg" src="https://github.com/user-attachments/assets/2c0285ec-744f-4c38-bc41-3c792e5c358e" />


- A decentralized, browser-based P2P chat mesh where every peer sends encrypted pulses through libp2p’s GossipSub layer, and an embedded LLM (Ollama- local, Chatgpt-hosted) joins the mesh as its own node, weaving LLM intelligence directly into the peer network.
- Bridging the gap b/w raw peer-to-peer protocols and a fun, interactive user experience.

---

## Why this exists
<!-- <img width="1307" height="703" alt="Screenshot 2025-12-12 at 1 55 03 AM" src="https://github.com/user-attachments/assets/0c1edff4-9820-4863-b9b1-2a4bf6d71aab" /> -->

- To explore and tinker around the idea that P2P doesn't have to be just limited to boring terminal logs. By combining **js-libp2p: universal-connectivity** with a local **LLM Agent**, I tried to create a "living" mesh where your first peer is a cosmic entity(llm-persona) that helps you flow.
-  No central servers, just you, your peers, and the Forge of Creation.

## Features
- **Browser-to-Terminal Mesh**: Connect directly from your browser to a headless Node.js agent via WebSockets.
- **GossipSub Chat**: True decentralized messaging using pubsub topics.
- **Alien X Agent**: A local LLM (Ollama/Llama 3.2) that lives on the network, greets you, and chats with cosmic wisdom.
- **Visuals**: Ambient wave-flow UI, 3D-style loading warp, and reactive mesh feedback.
  
<img width="1702" height="876" alt="Screenshot 2025-12-12 at 2 03 55 AM" src="https://github.com/user-attachments/assets/40639b2e-0c00-4a61-a6e5-4a8670f34af8" />

---

## Prerequisites

- [Ollama](https://ollama.com/download) [Default Model - llama3.2] or [ChatGPT API key](https://platform.openai.com/api-keys)

## Architecture Flow

```mermaid
graph LR
    User[Browser Node] -- WebSocket Dial --> Agent[Terminal Node]
    Agent -- GossipSub Mesh --> User
    Agent -- Loopback --> Ollama[Local LLM]
    Ollama -- Reply --> Agent
    Agent -- PubSub Message --> User
```

1. **Browser** spawns a libp2p node (WebSocket transport).
2. **Terminal Agent** listens on TCP + WebSocket and bridges the LLM.
3. **Connect**: Browser dials Agent's `/ws` multiaddr.
4. **Mesh**: Gossipsub mesh forms; peers sync.
5. **Chat**: Messages flow over the mesh; Alien X replies via the Agent logic.

<img width="1686" height="976" alt="Screenshot 2025-12-13 at 1 57 44 AM" src="https://github.com/user-attachments/assets/2ecbb362-4a0a-407c-95b0-5b37a6b1f96d" />

---

## Quick Start 🚀

https://github.com/user-attachments/assets/bff792b4-ea03-4841-b8c6-64d1b0960a78

### 1. Start the Agent (Terminal-RECOMMENDED)
- This is your gateway node. It runs the mesh and the LLM hook.
```bash
cd p2p-X/web/app
npm install
node index.js
```
*Keep this terminal open! Look for the line starting with:*
`[SYSTEM]   /ip4/127.0.0.1/tcp/xxxxx/ws/p2p/Qm...`

> Note the ws:// address and port number, e.g., `/ip4/127.0.0.1/tcp/57704/ws/p2p/...`

### *Tip 💡:*
```
local running: use `ws` supported multiaddr to connect /ip4/127.0.0.1/tcp/56989/ws/p2p..
production url: use `webrtc-direct` addr /ip4/127.0.0.1/udp/56987/webrtc-direct/certhash/../p2p/..
```

### 2. Start the AI
```bash
ollama serve
# Ensure you have llama3.2 pulled: ollama pull llama3.2
```
*(If skipped, chat still works P2P via terminal mode, but Alien X sleeps)*

### 2.1. Expose Ollama via ngrok (For Production/Vercel)

**Why ngrok on 11434 fixes CORS:**

1. **The Problem:**
   - Browser (HTTPS on Vercel) tries to call `http://127.0.0.1:11434` → CORS blocks it
   - Vercel serverless functions can't access `localhost` directly

2. **The Solution (Two-Part):**
   - **Part A:** Vercel API Proxy (`/api/ollama-proxy`) - Browser calls this (same origin, no CORS)
   - **Part B:** ngrok tunnel on 11434 - Vercel proxy forwards to ngrok URL (which tunnels to local Ollama)

3. **The Flow:**
   ```
   Browser (HTTPS) 
     → /api/ollama-proxy (same origin, no CORS ✅)
       → Vercel Serverless Function
         → ngrok tunnel (https://xyz789.ngrok.io)
           → Local Ollama (http://localhost:11434)
   ```

**Step-by-step:**

1. **Install ngrok** (if not already installed):
   ```bash
   # macOS
   brew install ngrok
   
   # Or download from https://ngrok.com/download
   ```

2. **Start ngrok tunnel for Ollama (Port 11434):**
   ```bash
   ngrok http 11434
   ```

3. **Copy the HTTPS Forwarding URL:**
   - Look for: `Forwarding  https://xyz789.ngrok.io -> http://localhost:11434`
   - Copy the `https://xyz789.ngrok.io` part

<!-- 4. **Set in Vercel Environment Variables:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `OLLAMA_BASE_URL` = `https://xyz789.ngrok.io`
   - Redeploy your app

5. **Verify:**
   - The Vercel proxy (`/api/ollama-proxy.js`) reads `OLLAMA_BASE_URL` and forwards requests to it
   - Since it's a serverless function, it can access the ngrok URL (which tunnels to your local Ollama)

**Note:** For local development (`localhost:5173`), Ollama works directly without ngrok. ngrok is only needed for production deployments on Vercel. -->

### 3. Launch the UI (Browser)
```bash
cd p2p-X/web
npm install
npm run dev
```
Open `http://localhost:5173`.

### 4. Connect & Flow
1. Click **"LET'S FLOW"** on the landing page. [Run `ollama serve` if you havent yet started it]
2. In the **"Target Agent Coordinates"** box, paste the **WS** address from Step 1.
   - ✅ Correct: `/ip4/127.0.0.1/tcp/xxxxx/ws/p2p/...`
   - ❌ Wrong: `/tcp/` only or `/tls/ws`.
3. Wait for **"MESH SYNCED"** status. 
4. Alien X will greet you. Chat away! 🛸



## 5. ⚠️ Constraints and Challenges ⚠️ (Under construction) 
### on local setup(running `web/npm run dev` and `app/node index.js`)
- Requires **Ollama** installed and running simulantenously `Ollama Serve` for local p2p (LLM <--> Node ) support
- Runs on `/ws` multiaddr format only and not on `tls/ws` or `/tcp`

### using [Deployed dapp](https://llmesh.vercel.app/)
- Runs on `/webrtc-direct` multiaddr cuz `/ws` are flagged insecure conn
- Local Ollama and Ngrok tunneling(free tier, as of now) doesnt support for programmatic use, hence, LLM is off! 😀

> Hence, best approach is running locally via Ollama installed 


## 6. Gratitude to Libp2p-verse.

- https://libp2p.io
- https://github.com/libp2p/universal-connectivity-workshop
- https://github.com/libp2p/js-libp2p
- https://github.com/libp2p/universal-connectivity

---

## Roadmap 🗺️

### Phase 1: Connectivity & Robustness (Foundation)

**Connectivity Enhancements:**
- ✅ WebSocket transport (WS/WSS)
- ✅ WebRTC transport (direct & signaling)
- ✅ Circuit Relay v2 support

### Phase 2: libp2p Protocol Integration (Universal Connectivity)

**Discovery & Routing:**
- ✅ mDNS peer discovery (local network)
- ✅ Kademlia DHT (agent node)
- 🔄 **Bootstrap nodes** - Connect to public libp2p bootstrap nodes for global discovery
- 🔄 **Peer exchange (PX)** - Exchange peer lists with connected peers
- 🔄 **Rendezvous protocol** - Use rendezvous points for peer discovery
- 🔄 **Autonat** - Automatic NAT detection and traversal

**Advanced Protocols:**
- 🔄 **Autorelay** - Automatic circuit relay selection and usage
- 🔄 **QUIC transport** - Add QUIC support for better performance
- 🔄 **WebTransport** - Browser-native WebTransport support

**Universal Connectivity Workshop Integration:**
- 🔄 **Workshop exercises** - Integrate examples from universal-connectivity-workshop
- 🔄 **Protocol demonstrations** - Visualize each protocol's role in the mesh
- 🔄 **Educational mode** - Step-by-step protocol explanations
- 🔄 **Interoperability tests** - Test against other libp2p implementations

### Phase 3: LLM Integration & Intelligence

**LLM Enhancements:**
- ✅ Ollama integration (local)
- ✅ OpenAI fallback
- 🔄 **Multiple LLM providers** - Anthropic, Gemini, local models
- 🔄 **Model switching** - Switch between models on-the-fly
- 🔄 **Streaming responses** - Real-time token streaming for better UX
- 🔄 **Context management** - Maintain conversation context across sessions
- 🔄 **LLM mesh nodes** - Multiple LLM agents in the same mesh
- 🔄 **Distributed inference** - Split prompts across multiple LLM nodes

**Agent Intelligence:**
- 🔄 **Agent personas** - Multiple AI personas with different personalities
- 🔄 **Agent capabilities** - Agents can perform actions (file ops, web search, etc.)
- 🔄 **Agent-to-agent communication** - LLM agents chat with each other
- 🔄 **Context awareness** - Agents understand mesh topology and peer states
- 🔄 **Learning from mesh** - Agents learn from conversations in the mesh

### Phase 4: User Experience & Interface

**UI/UX Improvements:**
- 🔄 **Mesh visualization** - Graph view of connected peers and topology

**Features:**
- 🔄 **File sharing** - Share files through the mesh

### Phase 5: Security & Privacy

**Security:**
- ✅ Noise encryption (transport-level)
- 🔄 **End-to-end encryption** - Application-level message encryption
- 🔄 **Perfect forward secrecy** - Rotate keys periodically
- 🔄 **Message authentication** - Verify message integrity and sender
- 🔄 **Access control** - Private rooms, invite-only meshes
- 🔄 **Identity verification** - Cryptographic identity proofs
- 🔄 **Rate limiting** - Prevent spam and DoS attacks

**Privacy:**
- 🔄 **Ephemeral messages** - Self-destructing messages
- 🔄 **Anonymous mode** - Optional anonymity features
- 🔄 **No message storage** - Option to not store message history
- 🔄 **IP address hiding** - Use relays to hide real IP addresses
- 🔄 **Metadata minimization** - Reduce metadata leakage

### Phase 6: Performance & Scalability

**Performance:**
- 🔄 **Message compression** - Compress large messages
- 🔄 **Batch operations** - Batch multiple operations together

**Scalability:**
- 🔄 **Large mesh support**
- 🔄 **Message sharding** - Split large messages across multiple packets
- 🔄 **Gossipsub optimization** - Tune Gossipsub parameters for scale
- 🔄 **DHT optimization** - Better DHT routing for large networks
- 🔄 **Load balancing** - Distribute load across multiple connections

---

*Built with Svelte, Libp2p, and Cosmic Energy imbibed from Universal Connectivity Workshop.* ❤️‍🔥🚀
