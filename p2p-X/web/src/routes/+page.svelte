<script>
    import ChatInterface from "$lib/components/ChatInterface.svelte";
    import PeerConnect from "$lib/components/PeerConnect.svelte";
    import WaveFlow from "$lib/components/WaveFlow.svelte";
    import Landing from "$lib/components/Landing.svelte";
    import Loading from "$lib/components/Loading.svelte";
    import { agentConnected } from "$lib/stores.js";
    import "../app.css";

    let state = "landing"; // landing, loading, lobby

    function startFlow() {
        state = "loading";
    }

    function enterLobby() {
        state = "lobby";
    }
</script>

<!-- Ambient Background -->
<WaveFlow />

<main
    class="relative z-10 flex flex-col h-screen font-sans antialiased text-white selection:bg-green-500/30 overflow-hidden"
>
    {#if state === "landing"}
        <Landing on:start={startFlow} />
    {/if}

    {#if state === "loading"}
        <Loading on:complete={enterLobby} />
    {/if}

    {#if state === "lobby"}
        <div class="flex-1 flex flex-col p-4 md:p-8 animate-fade-in h-screen">
            <!-- Header -->
            <div class="flex justify-between items-center mb-6 shrink-0">
                <h1
                    class="text-2xl font-bold uppercase tracking-widest text-green-500 drop-shadow-md"
                >
<<<<<<< HEAD
                    Mesh Arena
=======
                    Omnitrix Net
>>>>>>> 641250e (initial-setup)
                </h1>
                <div
                    class="text-xs bg-green-900/30 px-3 py-1 rounded-full border border-green-500/20 text-green-300 font-mono"
                >
                    STATUS: ONLINE
                </div>
            </div>

            <!-- Content Area -->
            <div
                class="flex-1 flex w-full max-w-6xl mx-auto gap-8 overflow-hidden min-h-0"
            >
                {#if !$agentConnected}
                    <div class="w-full max-w-md mx-auto self-center">
                        <PeerConnect />
                    </div>
                {:else}
                    <div class="w-full h-full">
                        <ChatInterface />
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</main>

<style>
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
    .animate-fade-in {
        animation: fadeIn 0.8s ease-out forwards;
    }
</style>
