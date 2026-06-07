<script>
    import {
        messages,
        myPeerId,
        connectionStatus,
        agentConnected,
        receivedFiles,
        peers as connectedPeers,
        addMessage,
    } from "../stores.js";
    import {
        sendChatMessage,
        sendFile,
        getAgentPeerId,
        getConnectedFilePeers,
    } from "../p2p.js";
    import { afterUpdate } from "svelte";

    let newMessage = "";
    let chatContainer;
    let selectedFilePeerId = "";

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

    function getPreferredFilePeer(peerList) {
        return peerList.find((peer) => !peer.isAgent) || peerList[0] || null;
    }

    function formatPeerLabel(peer) {
        if (!peer) return "Peer";
        return `${peer.label || "Peer"} ${peer.shortId || peer.id.slice(-8)}`;
    }

    function getSelectedFilePeer() {
        const refreshedPeers = getConnectedFilePeers();
        const selectedPeer = refreshedPeers.find(
            (peer) => peer.id === selectedFilePeerId,
        );
        if (selectedPeer) return selectedPeer;

        const preferredPeer = getPreferredFilePeer(refreshedPeers);
        if (preferredPeer) return preferredPeer;

        const agentPeerId = getAgentPeerId();
        return agentPeerId
            ? {
                  id: agentPeerId,
                  shortId: agentPeerId.slice(-8),
                  label: "Connected Peer",
                  isAgent: true,
              }
            : null;
    }

    async function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const targetPeer = getSelectedFilePeer();

            if (!targetPeer)
                throw new Error(
                    "No connected peer found. Connect another browser tab or the terminal agent first.",
                );

            addMessage({
                id: Date.now().toString(),
                sender: "You",
                text: `[Sending file: ${file.name} to ${formatPeerLabel(targetPeer)}...]`,
                isMe: true,
                timestamp: Date.now(),
            });

            const success = await sendFile(targetPeer.id, file);
            if (!success) {
                addMessage({
                    id: Date.now().toString() + "-err",
                    sender: "System",
                    text: `[Failed to send file: ${file.name}]`,
                    isMe: true,
                    timestamp: Date.now(),
                });
            }
        } catch (error) {
            console.error("File send error:", error);
            alert(`File send error: ${error.message}`);
            addMessage({
                id: Date.now().toString() + "-err",
                sender: "System",
                text: `[Error: ${error.message}]`,
                isMe: true,
                timestamp: Date.now(),
            });
        }

        event.target.value = "";
    }

    $: {
        const selectedPeerIsConnected = $connectedPeers.some(
            (peer) => peer.id === selectedFilePeerId,
        );
        if (!selectedPeerIsConnected) {
            selectedFilePeerId =
                getPreferredFilePeer($connectedPeers)?.id || "";
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

    function formatFileSize(size = 0) {
        if (!Number.isFinite(size) || size <= 0) return "0 B";
        const units = ["B", "KB", "MB", "GB"];
        const index = Math.min(
            Math.floor(Math.log(size) / Math.log(1024)),
            units.length - 1,
        );
        const value = size / 1024 ** index;
        return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
    }

    function formatReceivedTime(timestamp) {
        return timestamp
            ? new Date(timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
              })
            : "now";
    }
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
                Forge of P2PCreation
            </h2>
            <div
                class="text-[10px] text-green-300/50 font-mono tracking-widest"
            >
                {$agentConnected
                    ? "SECURE GOSSIPSUB MESH ACTIVE"
                    : "SEARCHING FOR PEERS..."}
            </div>
        </div>
        <div class="flex items-center gap-4">
            <div
                class="text-[10px] font-mono {$connectionStatus === 'connected'
                    ? 'text-green-400'
                    : 'text-yellow-400'} animate-pulse"
            >
                {$connectionStatus === "connected"
                    ? "● MESH SYNCED"
                    : "○ SYNCING"}
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
        {#if $messages.length === 0 && $receivedFiles.length === 0}
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

        {#if $receivedFiles.length > 0}
            <div class="space-y-3">
                {#each $receivedFiles as file (`${file.sender}-${file.filename}-${file.timestamp}`)}
                    <div
                        class="max-w-[80%] rounded-xl rounded-bl-none px-5 py-3 bg-zinc-900/80 border border-white/10 text-gray-200 backdrop-blur-md shadow-lg animate-fade-in-up"
                    >
                        <div class="flex items-start justify-between gap-4">
                            <div
                                class="text-xs font-mono uppercase tracking-wider text-green-300/70"
                            >
                                P2P FILE TRANSFER
                            </div>
                            <div
                                class="shrink-0 text-[10px] font-mono uppercase tracking-wider text-white/30"
                            >
                                {formatReceivedTime(file.timestamp)}
                            </div>
                        </div>
                        <div
                            class="mt-1 text-sm font-medium text-green-100 break-words"
                        >
                            {file.filename}
                        </div>
                        <div
                            class="mt-2 grid gap-1 text-[11px] font-mono text-white/40 sm:grid-cols-4"
                        >
                            <div>
                                FROM {file.sender ? file.sender.slice(-8) : "PEER"}
                            </div>
                            <div>VIA {(file.transport || "stream").toUpperCase()}</div>
                            <div>{file.mimeType || "application/octet-stream"}</div>
                            <div>{formatFileSize(file.size)}</div>
                        </div>
                        <a
                            class="mt-3 inline-flex items-center justify-center rounded-full border border-green-500/40 bg-green-600/20 px-4 py-2 text-xs font-mono uppercase tracking-wider text-green-200 transition-all hover:bg-green-500/30"
                            href={file.url}
                            download={file.filename}
                        >
                            Download
                        </a>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <!-- Input Area -->
    <div class="p-4 bg-black/40 border-t border-green-500/20">
        {#if $connectedPeers.length > 0}
            <div
                class="mb-3 flex flex-col gap-2 rounded border border-green-500/20 bg-green-500/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
                <div class="min-w-0">
                    <div
                        class="text-[10px] font-mono uppercase tracking-widest text-green-300/70"
                    >
                        File Transfer Target
                    </div>
                    <div class="truncate text-[10px] font-mono text-white/35">
                        {$connectedPeers.length} connected peer{$connectedPeers.length === 1
                            ? ""
                            : "s"} available
                    </div>
                </div>
                <select
                    bind:value={selectedFilePeerId}
                    class="w-full rounded border border-green-500/30 bg-black/70 px-3 py-2 text-xs font-mono uppercase tracking-wider text-green-200 outline-none transition focus:border-green-400 sm:w-52"
                    title="File transfer target"
                >
                    {#each $connectedPeers as peer (peer.id)}
                        <option value={peer.id}>
                            {formatPeerLabel(peer)}
                        </option>
                    {/each}
                </select>
            </div>
        {/if}
        <div class="relative flex items-center group gap-2 w-full">
            <input
                type="file"
                id="fileUpload"
                class="hidden"
                on:change={handleFileSelect}
            />
            <label
                for="fileUpload"
                title="Upload file to selected peer"
                class="cursor-pointer p-4 bg-green-900/40 hover:bg-green-600/40 border border-green-500/50 rounded-full transition-all text-green-400 hover:scale-105 active:scale-95 flex items-center justify-center"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    class="w-6 h-6"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M18.375 12.739l-7.693 7.693a4.536 4.536 0 01-6.42-6.421l10.899-10.899m-7.828 9.09l-4.364-4.364a1.5 1.5 0 012.121-2.121l4.365 4.364m2.121-2.121L15.375 6.439a3 3 0 014.242 4.243l-4.364 4.364m-4.243-4.243l3.536 3.536"
                    />
                </svg>
            </label>
            <div
                class="absolute inset-0 bg-green-500/5 rounded-full blur transition-all group-focus-within:bg-green-500/10 pointer-events-none"
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
