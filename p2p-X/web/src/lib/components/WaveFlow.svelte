<script>
    import { onMount } from "svelte";

    let canvas;

    onMount(() => {
        const ctx = canvas.getContext("2d");
        let width, height;
        let t = 0;

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener("resize", resize);
        resize();

        const waves = [
            {
                y: 0.5,
                length: 0.01,
                amplitude: 100,
                speed: 0.01,
                color: "rgba(74, 222, 128, 0.05)",
            },
            {
                y: 0.5,
                length: 0.005,
                amplitude: 150,
                speed: 0.005,
                color: "rgba(34, 197, 94, 0.05)",
            },
            {
                y: 0.5,
                length: 0.02,
                amplitude: 50,
                speed: 0.02,
                color: "rgba(16, 185, 129, 0.03)",
            },
        ];

        const animate = () => {
            requestAnimationFrame(animate);
            ctx.clearRect(0, 0, width, height);

            waves.forEach((wave) => {
                ctx.beginPath();
                ctx.moveTo(0, height / 2);
                for (let x = 0; x < width; x++) {
                    const dy =
                        Math.sin(x * wave.length + t * wave.speed) *
                        wave.amplitude;
                    ctx.lineTo(x, height * wave.y + dy);
                }
                ctx.lineTo(width, height);
                ctx.lineTo(0, height);
                ctx.fillStyle = wave.color;
                ctx.fill();
            });

            t++;
        };

        animate();

        return () => window.removeEventListener("resize", resize);
    });
</script>

<canvas bind:this={canvas} class="fixed inset-0 pointer-events-none z-0"
></canvas>

<style>
    canvas {
        width: 100%;
        height: 100%;
        background: radial-gradient(circle at center, #051a0a 0%, #000000 100%);
    }
</style>
