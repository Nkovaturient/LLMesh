<script>
    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();
</script>

<div
    class="fixed inset-0 flex flex-col items-center justify-center z-50 bg-black/80 backdrop-blur-sm"
>
    <div class="relative z-10 text-center space-y-8 animate-fade-in-down">
<<<<<<< HEAD
        <h1
            class="text-7xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-500 to-cyan-500 drop-shadow-[0_0_35px_rgba(34,197,94,0.6)]"
        >
            LLMesh
        </h1>

        <p class="text-white/60 text-xl font-light tracking-[0.5em] uppercase">
            Decentralized P2P Chat Mesh Powered by LLM
        </p>

=======
        <!-- Huge AlienX Title with Gradient and Glow -->
        <h1
            class="text-7xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-500 to-cyan-500 drop-shadow-[0_0_35px_rgba(34,197,94,0.6)]"
        >
            ALIEN X
        </h1>

        <p class="text-white/60 text-xl font-light tracking-[0.5em] uppercase">
            Decentralized Cosmic Network
        </p>

        <!-- Interactive Start Button -->
>>>>>>> 641250e (initial-setup)
        <button
            on:click={() => dispatch("start")}
            class="group relative px-12 py-4 bg-transparent border border-green-500/30 overflow-hidden rounded-none transition-all hover:border-green-400 hover:shadow-[0_0_30px_rgba(74,222,128,0.4)]"
        >
            <div
                class="absolute inset-0 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 bg-green-500/20"
            ></div>
            <span
                class="relative text-2xl font-bold tracking-widest text-green-400 group-hover:text-white transition-colors"
            >
                LET'S FLOW
            </span>
        </button>
    </div>
</div>

<style>
    /* Custom clean animations */
    @keyframes fadeInDown {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    .animate-fade-in-down {
        animation: fadeInDown 1s ease-out forwards;
    }
</style>
