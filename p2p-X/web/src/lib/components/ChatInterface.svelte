<script>
    import { messages, myPeerId, connectionStatus, agentConnected } from "../stores.js";
    import { sendChatMessage } from "../p2p.js";
    import { afterUpdate } from "svelte";
    
    // Subscribe to connected peers count
    import { onMount } from 'svelte';
    import { get } from 'svelte/store';
    
    let newMessage = "";
    let chatContainer;
    let peerCount = 0;

    // Optional: poll or subscribe to peer count from p2p logic if needed,
    // but for now we just show status based on connectionStatus


    function handleSend() {
        if (!newMessage.trim()) return;
        sendChatMessage(newMessage);
        newMessage = "";
    }

    function handleKeydown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    // Auto-scroll to bottom
    afterUpdate(() => {
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    });

    const ALIEN_AVATAR = "👽";
    const USER_AVATAR = "🧑‍🚀";
</script>

<div
    class="flex flex-col h-full bg-black/60 backdrop-blur-xl border border-green-500/30 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(34,197,94,0.1)]"
>
    <!-- Chat Header -->
    <div
        class="p-4 bg-green-900/20 border-b border-green-500/20 flex justify-between items-center"
    >
        <div>
            <h2
                class="text-xl font-bold text-green-400 tracking-wider uppercase glow-text"
            >
<<<<<<< HEAD
                Forge of P2PCreation
=======
                Forge of Creation
>>>>>>> 641250e (initial-setup)
            </h2>
            <div
                class="text-[10px] text-green-300/50 font-mono tracking-widest"
            >
                {$agentConnected ? 'SECURE GOSSIPSUB MESH ACTIVE' : 'SEARCHING FOR PEERS...'}
            </div>
        </div>
        <div class="flex items-center gap-4">
             <div class="text-[10px] font-mono {$connectionStatus === 'connected' ? 'text-green-400' : 'text-yellow-400'} animate-pulse">
                {$connectionStatus === 'connected' ? '● MESH SYNCED' : '○ SYNCING'}
             </div>
             <div
                class="text-xs font-mono text-green-400/80 border border-green-500/30 px-2 py-1 rounded"
             >
                ID: {$myPeerId ? $myPeerId.slice(-8) : "..."}
             </div>
        </div>
    </div>

    <!-- Message Area -->
    <div
        class="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-green-500/30 scrollbar-track-transparent"
        bind:this={chatContainer}
    >
        {#if $messages.length === 0}
            <div
                class="h-full flex flex-col items-center justify-center text-green-500/30 font-light italic opacity-50"
            >
                <div class="text-4xl mb-4">🌌</div>
                <div>Waiting for cosmic signals...</div>
            </div>
        {/if}
        {#each $messages as msg (msg.id)}
            <div
                class="flex flex-col {msg.isMe
                    ? 'items-end'
                    : 'items-start'} animate-fade-in-up group"
            >
                <div
                    class="flex items-end gap-2 {msg.isMe
                        ? 'flex-row-reverse'
                        : 'flex-row'}"
                >
                    <div class="text-2xl opacity-70 mb-1">
                        {msg.isMe ? USER_AVATAR : ALIEN_AVATAR}
                    </div>

                    <div
                        class="max-w-[80%] rounded-xl px-5 py-3
                        {msg.isMe
                            ? 'bg-green-600/20 border border-green-500/40 text-green-100 rounded-br-none'
                            : 'bg-zinc-900/80 border border-white/10 text-gray-200 rounded-bl-none'} backdrop-blur-md shadow-lg relative overflow-hidden"
                    >
                        {#if !msg.isMe}
                            <div
                                class="absolute inset-0 bg-purple-500/5 pointer-events-none"
                            ></div>
                        {/if}

                        <div
                            class="text-sm font-light leading-relaxed whitespace-pre-wrap relative z-10"
                        >
                            {msg.text}
                        </div>
                    </div>
                </div>

                <div
                    class="text-[9px] font-mono text-white/20 mt-1 px-10 uppercase tracking-wider"
                >
                    {msg.isMe ? "OPERATOR" : msg.sender || "ALIEN X"} • {new Date(
                        msg.timestamp,
                    ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </div>
            </div>
        {/each}
    </div>

    <!-- Input Area -->
    <div class="p-4 bg-black/40 border-t border-green-500/20">
        <div class="relative flex items-center group">
            <div
                class="absolute inset-0 bg-green-500/5 rounded-full blur transition-all group-focus-within:bg-green-500/10"
            ></div>
            <input
                type="text"
                bind:value={newMessage}
                on:keydown={handleKeydown}
                placeholder="Transmit message to the cosmos..."
                class="relative w-full bg-black/40 border border-green-500/30 rounded-full py-4 px-6 text-green-100 placeholder-green-700/50 focus:outline-none focus:border-green-400 focus:shadow-[0_0_15px_rgba(74,222,128,0.2)] transition-all font-mono text-sm"
            />
            <button
                aria-label="Send message"
                on:click={handleSend}
                class="absolute right-2 p-2 bg-green-600/20 hover:bg-green-500/40 border border-green-500/50 rounded-full transition-all hover:scale-105 active:scale-95"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    class="w-5 h-5 text-green-400"
                >
                    <path
                        d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"
                    />
                </svg>
            </button>
        </div>
    </div>
</div>

<style>
    .glow-text {
        text-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
    }

    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    .animate-fade-in-up {
        animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
</style>
