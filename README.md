# LLMesh 🛸🌊

> **"Navigate the Decentralized Cosmos with Libp2p: Universal Connectivity workshop"**

<img width="1307" height="703" alt="Screenshot 2025-12-12 at 1 55 03 AM" src="https://github.com/user-attachments/assets/0c1edff4-9820-4863-b9b1-2a4bf6d71aab" />

- A decentralized, browser-based P2P chat mesh where every peer sends encrypted pulses through libp2p’s GossipSub layer, and an embedded LLM (Ollama- local, Chatgpt-hosted) joins the mesh as its own node, weaving LLM intelligence directly into the peer network.
- Bridging the gap b/w raw peer-to-peer protocols and a fun, interactive user experience.

---

## Why this exists
To explore and tinker around the idea that P2P doesn't have to be just limited to boring terminal logs. By combining **js-libp2p: universal-connectivity** with a local **LLM Agent**, I tried to create a "living" mesh where your first peer is a cosmic entity(llm-persona) that helps you flow. No central servers, just you, your peers, and the Forge of Creation.

## Features
- **Browser-to-Terminal Mesh**: Connect directly from your browser to a headless Node.js agent via WebSockets.
- **GossipSub Chat**: True decentralized messaging using pubsub topics.
- **Alien X Agent**: A local LLM (Ollama/Llama 3.2) that lives on the network, greets you, and chats with cosmic wisdom.
- **Visuals**: Ambient wave-flow UI, 3D-style loading warp, and reactive mesh feedback.
  
<img width="1702" height="876" alt="Screenshot 2025-12-12 at 2 03 55 AM" src="https://github.com/user-attachments/assets/40639b2e-0c00-4a61-a6e5-4a8670f34af8" />

---

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


https://github.com/user-attachments/assets/bff792b4-ea03-4841-b8c6-64d1b0960a78


---

## Quick Start 🚀

### 1. Start the Agent (Terminal)
This is your gateway node. It runs the mesh and the LLM hook.
```bash
cd p2p-X/web/app
npm install
node index.js
```
*Keep this terminal open! Look for the line starting with:*
`[SYSTEM]   /ip4/127.0.0.1/tcp/xxxxx/ws/p2p/Qm...`

### 2. Start the AI (Optional but Cool)
For Alien X to talk back, run Ollama locally:
```bash
ollama serve
# Ensure you have llama3.2 pulled: ollama pull llama3.2
```
*(If skipped, chat still works P2P, but Alien X sleeps)*

### 3. Launch the UI (Browser)
```bash
cd p2p-X/web
npm install
npm run dev
```
Open `http://localhost:5173`.

### 4. Connect & Flow
1. Click **"LET'S FLOW"** on the landing page.
2. In the **"Target Agent Coordinates"** box, paste the **WS** address from Step 1.
   - ✅ Correct: `/ip4/127.0.0.1/tcp/xxxxx/ws/p2p/...`
   - ❌ Wrong: `/tcp/` only or `/tls/ws`.
3. Wait for **"MESH SYNCED"** status.
4. Alien X will greet you. Chat away! 🛸


### 5. Gratitude to Libp2p-verse.

- https://libp2p.io
- https://github.com/libp2p/universal-connectivity-workshop
- https://github.com/libp2p/js-libp2p
- https://github.com/libp2p/universal-connectivity

---

*Built with Svelte, libp2p, and Cosmic Energy.*
