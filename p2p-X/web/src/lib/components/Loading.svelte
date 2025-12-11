<script>
    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();

    export let message = "Taking you to the lobby...";
    export let steps = [];
    export let ready = false;

    $: if (ready) {
        dispatch("complete");
    }
</script>

<div
    class="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden"
>
    <!-- Warp Speed Visuals -->
    <div class="warp-container absolute inset-0 opacity-50 pointer-events-none">
        {#each Array(20) as _, i}
            <div
                class="warp-line"
                style="--delay: {i * 0.1}s; --angle: {i * 18}deg"
            ></div>
        {/each}
    </div>

    <div class="relative z-10 text-center space-y-4">
        <div class="text-6xl animate-bounce">🛸</div>
        <h2 class="text-3xl font-bold text-white tracking-widest uppercase">
            {message}
        </h2>
        <div class="font-mono text-green-400 text-sm space-y-1 opacity-80">
            {#if steps.length === 0}
                <p>> Spinning up your node...</p>
                <p>> Scanning for agent peers...</p>
                <p>> Forming GossipSub mesh...</p>
            {:else}
                {#each steps.slice(-4) as step}
                    <p>> {step}</p>
                {/each}
            {/if}
        </div>
    </div>
</div>

<style>
    .warp-container {
        perspective: 1000px;
    }
    .warp-line {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 100vw;
        height: 2px;
        background: linear-gradient(90deg, transparent, #4ade80, transparent);
        transform-origin: left center;
        transform: rotate(var(--angle)) translateX(100px);
        animation: warp 1s infinite linear;
        animation-delay: var(--delay);
    }

    @keyframes warp {
        0% {
            transform: rotate(var(--angle)) translateX(0) scaleX(0);
            opacity: 0;
        }
        50% {
            opacity: 1;
        }
        100% {
            transform: rotate(var(--angle)) translateX(1000px) scaleX(2);
            opacity: 0;
        }
    }
</style>
