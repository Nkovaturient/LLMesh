<script>
    import { onMount } from "svelte";
    import { connectToAgent, getDefaultAgentMultiaddr } from "../p2p.js";
    import { connectionStatus, myPeerId } from "../stores.js";

    let agentAddress = getDefaultAgentMultiaddr() || "";
    let autoTried = false;

    async function handleConnect() {
        if (!agentAddress) return;
        await connectToAgent(agentAddress);
    }

    onMount(() => {
        // Auto-connect removed to let user see the flow
    });
</script>

<div
    class="bg-black/60 backdrop-blur-xl p-8 rounded-lg border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.1)] w-full"
>
    <h3
        class="text-2xl text-green-400 font-bold mb-6 flex items-center gap-3 tracking-wide uppercase"
    >
        <span class="text-3xl">📡</span> Uplink Required
    </h3>

    <div class="space-y-6">
        <div class="p-4 border border-green-500/20 rounded bg-green-500/5">
            <div class="text-[10px] text-green-400 font-mono tracking-widest mb-1">
                ALIEN X AGENT STATUS
            </div>
            <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span class="text-green-300 text-xs font-mono">LISTENING ON MESH</span>
            </div>
            <div class="mt-2 text-[10px] text-green-500/50 break-all font-mono">
                {agentAddress || "Waiting for signal..."}
            </div>
        </div>

        <div>
            <form>
                <label
                    for="agentAddress"
                    class="block text-green-500/70 text-xs mb-2 font-mono tracking-widest"
                    >
                    Target Agent Coordinates (Multiaddr)</label>
                <textarea
                    bind:value={agentAddress}
                    placeholder="/ip4/127.0.0.1/tcp/50847/ws/p2p/..."
                    class="w-full bg-black/40 border border-green-500/20 rounded p-4 text-green-300 text-xs font-mono h-32 focus:outline-none focus:border-green-500 focus:shadow-[0_0_15px_rgba(74,222,128,0.1)] resize-none transition-all"
                ></textarea>
            </form>
        </div>

        <div class="text-[11px] text-green-400/80 font-mono tracking-widest">
            YOUR NODE: {$myPeerId ? $myPeerId.slice(-12) : "..."}
        </div>

        {#if $connectionStatus === "connecting"}
            <div
                class="text-green-400 text-center animate-pulse font-mono text-sm tracking-wider"
            >
                > INITIATING HANDSHAKE...
            </div>
        {:else if $connectionStatus === "connected"}
            <div
                class="text-green-400 text-center bg-green-500/10 py-3 rounded border border-green-500/20 font-bold tracking-widest"
            >
                ACCESS GRANTED
            </div>
        {:else}
            <button
                on:click={handleConnect}
                class="w-full py-4 bg-green-600/20 hover:bg-green-500/30 border border-green-500/50 rounded text-green-400 font-bold tracking-widest hover:shadow-[0_0_20px_rgba(74,222,128,0.2)] transition-all active:scale-95 uppercase"
            >
                Establish Link
            </button>
        {/if}
    </div>

    <p class="text-[10px] text-green-500/30 text-center mt-6 font-mono">
        SECURE PROTOCOL V1.0 // LLMesh
    </p>
</div>
