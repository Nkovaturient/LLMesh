# LLM as UCEP Extension Provider - Architecture

## Overview

This document describes the architecture where the **LLM service runs as a UCEP extension provider on the terminal node**, and the **browser consumes it via UCEP protocol**, while **collaborative spreadsheet works independently via GossipSub**.

## Architecture Diagram

```
┌─────────────────┐                    ┌─────────────────┐
│  Terminal Node  │                    │  Browser Node   │
│   (index.js)    │                    │   (p2p.js)      │
│                 │                    │                 │
│  ┌───────────┐  │                    │  ┌───────────┐  │
│  │ LLM       │  │                    │  │ UCEP     │  │
│  │ Extension │◄─┼────────────────────┼─►│ Consumer │  │
│  │ Provider  │  │   UCEP Protocol    │  │          │  │
│  └───────────┘  │   (direct stream)  │  └───────────┘  │
│                 │                    │                 │
│  ┌───────────┐  │                    │  ┌───────────┐  │
│  │ GossipSub │  │                    │  │ GossipSub │  │
│  │ (Chat)    │◄─┼────────────────────┼─►│ (Chat)    │  │
│  └───────────┘  │   PubSub Mesh      │  └───────────┘  │
│                 │                    │                 │
│                 │                    │  ┌───────────┐  │
│                 │                    │  │ Spreadsheet│ │
│                 │                    │  │ Extension │ │
│                 │                    │  │ Manager   │ │
│                 │                    │  └───────────┘  │
└─────────────────┘                    └─────────────────┘
```

## Key Components

### 1. Terminal Node (`app/index.js`)

**Responsibilities:**
- Registers LLM as UCEP extension provider
- Advertises extension via Identify protocol: `/uc/extension/alien-x-llm/1.0.0`
- Handles LLM command requests via protobuf streams
- Serves LLM to multiple browser peers simultaneously

**Files:**
- `app/index.js` - Main terminal node setup
- `app/llm-extension-provider.js` - LLM extension definition
- `app/agent-llm.js` - LLM service implementation
- `app/extension-provider.js` - UCEP extension registration

### 2. Browser Node (`src/lib/p2p.js`)

**Responsibilities:**
- Discovers LLM extension via UCEP (Identify protocol)
- Consumes LLM via UCEP protocol (direct streams)
- Falls back to direct LLM calls if extension unavailable
- Manages GossipSub extensions independently

**Files:**
- `src/lib/p2p.js` - Main browser node setup
- `src/lib/llm-ucep-client.js` - UCEP LLM client
- `src/lib/ucep-client.js` - Generic UCEP extension client
- `src/lib/gossipsub-extension-manager.js` - GossipSub extension manager

## How It Works

### 1. Extension Discovery

```
Browser Node                    Terminal Node
     │                               │
     │  ──peer:identify─────────────►│
     │  (protocols: [...])            │
     │                               │
     │◄──Identify Response───────────│
     │  (protocols: [                │
     │    '/uc/extension/alien-x-llm/1.0.0'
     │  ])                           │
     │                               │
     │  ──dialProtocol───────────────►│
     │  (fetch manifest)             │
     │                               │
     │◄──Manifest Response───────────│
     │  (commands, description)      │
```

### 2. LLM Request Flow

```
Browser User Types Message
         │
         ▼
  sendChatMessage()
         │
         ▼
  Check if LLM extension available
         │
    ┌────┴────┐
    │         │
   YES       NO
    │         │
    ▼         ▼
UCEP Call  Direct LLM
    │         │
    │         │
    └────┬────┘
         │
         ▼
  Display Response
```

### 3. Command Execution

```javascript
// Browser sends command via UCEP
executeLLMCommand(node, 'chat', [message, peerId])
  ↓
// Opens direct stream to terminal node
dialProtocol(peerId, '/uc/extension/alien-x-llm/1.0.0')
  ↓
// Sends protobuf-encoded command request
{ command: { command: 'chat', args: [message, peerId] } }
  ↓
// Terminal node processes via LLM service
llmService.generateResponse(message, peerId)
  ↓
// Returns response via protobuf
{ success: true, data: { reply: "..." } }
```

## Benefits

### ✅ Decoupling
- LLM logic separated from browser
- Terminal node can serve multiple browsers
- Browser can work without LLM (fallback to direct calls)

### ✅ Reusability
- LLM extension discoverable by any peer
- Multiple peers can use same LLM service
- Extension protocol standardized (UCEP)

### ✅ Independence
- Spreadsheet works via GossipSub (topic-based)
- LLM works via UCEP (protocol-based)
- Both systems coexist without interference

### ✅ Scalability
- Terminal node can handle multiple concurrent LLM requests
- Browser can discover and use multiple extensions
- Easy to add new extensions

## Compatibility

### Spreadsheet Extension
- **Discovery**: GossipSub topic-based (`universal-connectivity-extensions`)
- **Execution**: GossipSub pubsub messages
- **Independence**: Works completely independently of UCEP

### LLM Extension
- **Discovery**: UCEP protocol-based (Identify protocol)
- **Execution**: Direct protobuf streams
- **Fallback**: Direct LLM calls if extension unavailable

## Usage

### Terminal Node
```bash
cd libp2p-ai/p2p-X/web/app
node index.js
```

The terminal node will:
1. Start libp2p node
2. Register LLM extension
3. Advertise extension via Identify
4. Wait for browser connections

### Browser
```bash
cd libp2p-ai/p2p-X/web
npm run dev
```

The browser will:
1. Connect to terminal node via multiaddr
2. Discover LLM extension via Identify
3. Use LLM via UCEP when available
4. Fallback to direct LLM if extension unavailable


## Future Enhancements

1. **Multiple LLM Providers**: Different peers can provide different LLM models
2. **LLM Load Balancing**: Browser can choose which LLM provider to use
3. **Extension Marketplace**: Discover and install extensions from any peer
4. **Extension Permissions**: Security model for extension access

## Conclusion

This architecture successfully:
- ✅ Makes LLM a reusable UCEP extension
- ✅ Decouples LLM from browser
- ✅ Maintains spreadsheet compatibility
- ✅ Provides fallback mechanisms
- ✅ Enables multi-peer LLM sharing

The terminal node acts as an **LLM extension provider proxy**, while the browser acts as a **UCEP extension consumer**, and both systems work **simultaneously** with the collaborative spreadsheet via GossipSub.

