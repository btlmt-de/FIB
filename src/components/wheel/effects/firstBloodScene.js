// Sparse windblown dust, drawn behind the interface. No WebGL scene is needed.
export function createFirstBloodScene(host, { calm }) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return () => {};
    host.appendChild(canvas);

    let seed = 871;
    const random = () => {
        seed = (1664525 * seed + 1013904223) >>> 0;
        return seed / 4294967296;
    };
    const particles = Array.from({ length: 76 }, () => ({
        x: random(),
        y: random(),
        depth: random(),
        phase: random() * Math.PI * 2,
        opacity: .12 + random() * .2,
    }));
    let width = 0, height = 0, frame = null, last = null, time = 0, disposed = false;

    function draw(dt = 0) {
        if (!width || !height) return;
        time += dt;
        context.clearRect(0, 0, width, height);
        const gust = 1 + .25 * Math.sin(time * .35);
        // Fewer motes on a phone. Coordinates stay normalized during resizes.
        const count = width < 600 ? 34 : particles.length;
        for (const particle of particles.slice(0, count)) {
            particle.x = (particle.x + dt * (.006 + particle.depth * .009) * gust) % 1;
            particle.y = (particle.y - dt * .002 + 1) % 1;
            const x = particle.x * width;
            const y = particle.y * height + Math.sin(time * .6 + particle.phase) * (3 + particle.depth * 5);
            const radius = .5 + particle.depth * 1.3;
            // Fade at the edges; lower contrast around the central title.
            const edge = Math.min(1, particle.x * 12, (1 - particle.x) * 12, particle.y * 12, (1 - particle.y) * 12);
            const titleQuiet = particle.y < .35 && particle.x > .3 && particle.x < .7 ? .35 : 1;
            const alpha = particle.opacity * edge * titleQuiet;
            context.fillStyle = `rgba(224,177,119,${alpha * .18})`;
            context.beginPath();
            context.ellipse(x, y, radius * 2.6, radius * 1.6, -.2, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = `rgba(235,194,143,${alpha})`;
            context.beginPath();
            context.ellipse(x, y, radius, radius * .65, -.2, 0, Math.PI * 2);
            context.fill();
        }
    }

    function tick(now) {
        if (disposed || document.hidden) return;
        if (last === null || now - last >= 1000 / 30) {
            draw(calm || last === null ? 0 : Math.min((now - last) / 1000, .1));
            last = now;
        }
        if (!calm) frame = requestAnimationFrame(tick);
    }
    function visibility() {
        cancelAnimationFrame(frame);
        last = null;
        if (!document.hidden) tick(performance.now());
    }
    const resize = new ResizeObserver(() => {
        if (disposed) return;
        ({ width, height } = host.getBoundingClientRect());
        const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        draw();
    });
    resize.observe(host);
    document.addEventListener('visibilitychange', visibility);
    visibility();
    return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        resize.disconnect();
        document.removeEventListener('visibilitychange', visibility);
        canvas.remove();
    };
}
