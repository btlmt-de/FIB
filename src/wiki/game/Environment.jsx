import React, { useEffect, useRef } from 'react';
import { useCalm } from '../../config/power.js';

/**
 * An environment: the place a region of the atlas is set in, drawn rather than
 * photographed.
 *
 * Why a canvas and not screenshots. A screenshot is a rectangle, and the brief for
 * this system is that the world should be something the page stands inside, not a
 * picture hung behind it. So each place is built from what makes Minecraft
 * recognisable at a glance with no texture pack at all: a stepped block horizon,
 * fogged layers receding behind it, the light of the place, and its particles —
 * fireflies, bubbles, cave dust, trial-spawner flames, sculk souls, Nether ash, End
 * rods. The blocks carry a per-block tonal jitter, which is what reads as "blocks"
 * rather than "bar chart" once the silhouette is dark.
 *
 * Cost. The silhouettes are rendered once per size to an offscreen canvas; a frame
 * is one blit, one light and a few dozen squares, at ~30fps, and only while the
 * canvas is on screen and the tab is visible. Under reduced motion or saver mode it
 * draws a single still frame — the place stays, only the drift stops.
 *
 * `light` (0..1) is where the place's light sits horizontally. The atlas moves it
 * toward whichever item the reader is pointing at, so the place answers the item.
 */

/* ── Deterministic randomness, so a place looks the same on every visit ──────── */

function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function noise1(seed) {
    const r = rng(seed);
    const pts = Array.from({ length: 512 }, r);
    return (x) => {
        const i = Math.floor(x);
        const f = x - i;
        const s = f * f * (3 - 2 * f);
        const a = pts[((i % 512) + 512) % 512];
        const b = pts[(((i + 1) % 512) + 512) % 512];
        return a + (b - a) * s;
    };
}

/* ── Places ──────────────────────────────────────────────────────────────────
 * Every colour is a fixed oklch value, not a token: these are paints for a
 * picture, dark by design, and none of them is ever read as text.
 */

const PRESETS = {
    surface: {
        sky: ['oklch(14% 0.035 262)', 'oklch(25% 0.055 240)'],
        stars: 90, moon: true,
        layers: [
            { kind: 'hills', color: 'oklch(25% 0.035 205)', base: 0.46, amp: 0.20, freq: 0.05, block: 9 },
            { kind: 'hills', color: 'oklch(19% 0.045 165)', base: 0.30, amp: 0.16, freq: 0.08, block: 11, trees: 0.10 },
            { kind: 'hills', color: 'oklch(13% 0.035 150)', base: 0.15, amp: 0.10, freq: 0.11, block: 13, trees: 0.06, texture: 0.05 },
        ],
        glow: { y: 0.55, color: 'oklch(72% 0.15 138 / 0.24)', r: 0.7 },
        particles: 'fireflies',
    },
    ocean: {
        sky: ['oklch(26% 0.075 245)', 'oklch(12% 0.045 255)'],
        surfaceLine: 0.10, shafts: 'oklch(80% 0.08 230 / 0.10)',
        layers: [
            { kind: 'hills', color: 'oklch(17% 0.05 250)', base: 0.30, amp: 0.14, freq: 0.06, block: 10 },
            { kind: 'hills', color: 'oklch(11.5% 0.04 250)', base: 0.14, amp: 0.10, freq: 0.10, block: 12, kelp: 0.18, texture: 0.05 },
        ],
        glow: { y: 0.1, color: 'oklch(62% 0.15 252 / 0.22)', r: 0.9 },
        particles: 'bubbles',
    },
    caves: {
        sky: ['oklch(10% 0.01 80)', 'oklch(14% 0.015 70)'],
        layers: [
            { kind: 'ceiling', color: 'oklch(17% 0.015 70)', base: 0.28, amp: 0.12, freq: 0.09, block: 10, drip: 0.14 },
            { kind: 'hills', color: 'oklch(18% 0.015 70)', base: 0.24, amp: 0.12, freq: 0.07, block: 10 },
            { kind: 'hills', color: 'oklch(11% 0.01 60)', base: 0.12, amp: 0.08, freq: 0.12, block: 13, texture: 0.06, ores: 'oklch(62% 0.12 300)' },
            { kind: 'ceiling', color: 'oklch(10% 0.01 60)', base: 0.12, amp: 0.10, freq: 0.12, block: 13, drip: 0.2, texture: 0.05 },
        ],
        glow: { y: 0.62, color: 'oklch(78% 0.13 82 / 0.20)', r: 0.5 },
        particles: 'dust',
    },
    trial: {
        sky: ['oklch(12% 0.015 60)', 'oklch(15% 0.02 55)'],
        layers: [
            { kind: 'chamber', color: 'oklch(19% 0.02 60)', edge: 'oklch(40% 0.08 52 / 0.35)', block: 10 },
            { kind: 'ceiling', color: 'oklch(11% 0.012 60)', base: 0.14, amp: 0.02, freq: 0.3, block: 12, flat: true, texture: 0.05 },
            { kind: 'hills', color: 'oklch(11% 0.012 60)', base: 0.14, amp: 0.02, freq: 0.3, block: 12, flat: true, texture: 0.05 },
        ],
        glow: { y: 0.7, color: 'oklch(70% 0.13 52 / 0.20)', r: 0.55 },
        particles: 'flames',
    },
    deepdark: {
        sky: ['oklch(7% 0.01 220)', 'oklch(11% 0.02 215)'],
        layers: [
            { kind: 'city', color: 'oklch(15% 0.025 215)', block: 9 },
            { kind: 'hills', color: 'oklch(9% 0.02 215)', base: 0.14, amp: 0.08, freq: 0.10, block: 12, texture: 0.05, sculk: 'oklch(55% 0.10 205 / 0.55)' },
        ],
        glow: { y: 0.85, color: 'oklch(72% 0.11 205 / 0.16)', r: 0.6 },
        particles: 'souls',
    },
    nether: {
        sky: ['oklch(11% 0.04 25)', 'oklch(20% 0.08 30)'],
        layers: [
            { kind: 'ceiling', color: 'oklch(16% 0.06 25)', base: 0.22, amp: 0.14, freq: 0.07, block: 11, drip: 0.12 },
            { kind: 'hills', color: 'oklch(19% 0.07 28)', base: 0.30, amp: 0.20, freq: 0.06, block: 10 },
            { kind: 'hills', color: 'oklch(11% 0.05 25)', base: 0.13, amp: 0.10, freq: 0.12, block: 13, texture: 0.06 },
        ],
        lava: 'oklch(62% 0.21 40 / 0.55)',
        glow: { y: 1.0, color: 'oklch(62% 0.21 30 / 0.30)', r: 0.8 },
        particles: 'ash',
    },
    end: {
        sky: ['oklch(9% 0.03 300)', 'oklch(14% 0.05 305)'],
        stars: 60,
        layers: [
            { kind: 'pillars', color: 'oklch(15% 0.04 300)', block: 8 },
            { kind: 'islands', color: 'oklch(21% 0.035 95)', block: 10, count: 3, top: 0.46 },
            { kind: 'islands', color: 'oklch(13% 0.03 300)', block: 13, count: 2, top: 0.62, texture: 0.05 },
        ],
        glow: { y: 0.4, color: 'oklch(70% 0.14 305 / 0.18)', r: 0.7 },
        particles: 'endrods',
    },
};

/* ── The still picture ───────────────────────────────────────────────────────── */

function paintBlocks(ctx, cells, B, color, texture, r) {
    ctx.fillStyle = color;
    for (const [x, y, w, h] of cells) ctx.fillRect(x, y, w, h);
    if (!texture) return;
    // Per-block tonal jitter: the difference between "a silhouette" and "blocks".
    for (const [x, y, w, h] of cells) {
        for (let by = y; by < y + h; by += B) {
            for (let bx = x; bx < x + w; bx += B) {
                const v = r();
                if (v < 0.35) continue;
                ctx.fillStyle = v > 0.75 ? `oklch(100% 0 0 / ${texture})` : `oklch(0% 0 0 / ${texture * 1.6})`;
                ctx.fillRect(bx, by, B, B);
            }
        }
    }
}

function paintLayer(ctx, W, H, layer, r, s) {
    const B = Math.round(layer.block * s);
    const cols = Math.ceil(W / B) + 1;
    const n = noise1(Math.floor(r() * 1e6));
    const cells = [];
    const heights = [];

    if (layer.kind === 'hills' || layer.kind === 'ceiling') {
        for (let i = 0; i < cols; i++) {
            const t = layer.flat ? 0.5 : n(i * layer.freq * 3) * 0.7 + n(i * layer.freq * 9 + 100) * 0.3;
            let h = Math.round(((layer.base + (t - 0.5) * 2 * layer.amp) * H) / B);
            if (layer.drip && r() < layer.drip) h += 1 + Math.floor(r() * 3);
            h = Math.max(1, h);
            heights.push(h);
            const y = layer.kind === 'hills' ? H - h * B : 0;
            cells.push([i * B, y, B, h * B]);
        }
        paintBlocks(ctx, cells, B, layer.color, layer.texture, r);

        if (layer.trees) {
            ctx.fillStyle = layer.color;
            for (let i = 2; i < cols - 3; i++) {
                if (r() > layer.trees) continue;
                const top = H - heights[i] * B;
                const trunk = 2 + Math.floor(r() * 2);
                ctx.fillRect(i * B, top - trunk * B, B, trunk * B);
                ctx.fillRect((i - 2) * B, top - (trunk + 2) * B, 5 * B, 2 * B);
                ctx.fillRect((i - 1) * B, top - (trunk + 3) * B, 3 * B, B);
                i += 5;
            }
        }
        if (layer.kelp) {
            ctx.fillStyle = 'oklch(16% 0.05 175)';
            for (let i = 0; i < cols; i++) {
                if (r() > layer.kelp) continue;
                const len = 2 + Math.floor(r() * 7);
                const top = H - heights[i] * B;
                for (let k = 1; k <= len; k++) {
                    ctx.fillRect(i * B + (k % 2 ? 0 : Math.round(B * 0.2)), top - k * B, Math.round(B * 0.6), B);
                }
            }
        }
        if (layer.ores) {
            ctx.fillStyle = layer.ores;
            for (let i = 0; i < cols; i++) {
                if (r() > 0.05) continue;
                const top = H - heights[i] * B;
                const depth = 1 + Math.floor(r() * Math.max(1, heights[i] - 1));
                ctx.fillRect(i * B + B * 0.3, top + depth * B + B * 0.3, B * 0.4, B * 0.4);
            }
        }
        if (layer.sculk) {
            ctx.fillStyle = layer.sculk;
            for (let i = 0; i < cols; i++) {
                if (r() > 0.14) continue;
                const top = H - heights[i] * B;
                ctx.fillRect(i * B, top, B, Math.max(2, Math.round(B * 0.25)));
            }
        }
        return;
    }

    if (layer.kind === 'city') {
        // An ancient city's skyline: stepped towers either side of the great portal
        // frame, the one silhouette every player who has found one recognises.
        const floor = H - Math.round(H * 0.16);
        const mid = Math.round(W * (0.55 + (r() - 0.5) * 0.2) / B) * B;
        const frameW = 11 * B;
        const frameH = Math.min(15 * B, Math.round(H * 0.7));
        const x0 = mid - Math.floor(frameW / 2 / B) * B;
        const push = (x, y, w, h) => cells.push([x, y, w, h]);
        push(x0, floor - frameH, 3 * B, frameH);
        push(x0 + frameW - 3 * B, floor - frameH, 3 * B, frameH);
        push(x0, floor - frameH, frameW, 2 * B);
        push(x0 + B, floor - frameH - B, frameW - 2 * B, B);
        push(x0 + 3 * B, floor - frameH - 2 * B, frameW - 6 * B, B);
        for (let x = 0; x < W; x += B) {
            if (x > x0 - 2 * B && x < x0 + frameW + 2 * B) continue;
            const hBlocks = Math.floor(n(x / B * 0.35) * 9 + (r() < 0.1 ? 4 : 0));
            if (hBlocks > 2) push(x, floor - hBlocks * B, B, hBlocks * B);
        }
        paintBlocks(ctx, cells, B, layer.color, 0.035, r);
        return;
    }

    if (layer.kind === 'chamber') {
        // Trial chamber walls: a grid of recessed rooms, each lit along its top edge
        // the way copper bulbs light a corridor.
        const rows = 3;
        const rh = Math.round((H * 0.62) / rows / B) * B;
        const y0 = Math.round(H * 0.18);
        ctx.fillStyle = layer.color;
        ctx.fillRect(0, y0, W, rows * rh);
        for (let row = 0; row < rows; row++) {
            let x = -Math.floor(r() * 6) * B;
            while (x < W) {
                const w = (4 + Math.floor(r() * 7)) * B;
                const inset = B;
                ctx.fillStyle = 'oklch(12% 0.012 60)';
                ctx.fillRect(x + inset, y0 + row * rh + inset, w - inset * 2, rh - inset * 2);
                ctx.fillStyle = layer.edge;
                ctx.fillRect(x + inset, y0 + row * rh + inset, w - inset * 2, Math.max(1, Math.round(B * 0.2)));
                x += w;
            }
        }
        return;
    }

    if (layer.kind === 'pillars') {
        // The obsidian spikes around the End's main island, far off in the haze.
        ctx.fillStyle = layer.color;
        const count = Math.max(4, Math.round(W / (B * 22)));
        for (let k = 0; k < count; k++) {
            const x = Math.round(((k + 0.3 + r() * 0.4) / count) * W / B) * B;
            const w = (2 + Math.floor(r() * 3)) * B;
            const h = Math.round(H * (0.35 + r() * 0.35) / B) * B;
            ctx.fillRect(x, H - h, w, h);
            ctx.fillStyle = 'oklch(80% 0.1 305 / 0.5)';
            ctx.fillRect(x + w / 2 - B / 2, H - h - B, B, B);
            ctx.fillStyle = layer.color;
        }
        return;
    }

    if (layer.kind === 'islands') {
        // Floating End stone: a flat-ish top with a stepped, tapering underside.
        for (let k = 0; k < layer.count; k++) {
            const cx = Math.round(((k + 0.5) / layer.count + (r() - 0.5) * 0.25) * W / B);
            const half = 6 + Math.floor(r() * 10);
            const topRow = Math.round((layer.top + (r() - 0.5) * 0.12) * H / B);
            for (let dx = -half; dx <= half; dx++) {
                const edge = 1 - Math.abs(dx) / (half + 1);
                const up = Math.round(n((cx + dx) * 0.4) * 2 * edge);
                const down = Math.max(1, Math.round(edge * edge * (half * 0.7) + r() * 1.5));
                cells.push([(cx + dx) * B, (topRow - up) * B, B, (down + up) * B]);
            }
        }
        paintBlocks(ctx, cells, B, layer.color, layer.texture ?? 0.03, r);
    }
}

function paintStill(canvas, preset, seed, W, H, s) {
    const ctx = canvas.getContext('2d');
    const r = rng(seed);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, preset.sky[0]);
    sky.addColorStop(1, preset.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    if (preset.stars) {
        for (let i = 0; i < preset.stars; i++) {
            const a = 0.25 + r() * 0.55;
            ctx.fillStyle = `oklch(95% 0.02 90 / ${a})`;
            const z = r() < 0.15 ? 2 * s : s;
            ctx.fillRect(Math.round(r() * W), Math.round(r() * H * 0.6), z, z);
        }
    }
    if (preset.moon) {
        // Square, because it is.
        const m = Math.round(22 * s);
        const mx = Math.round(W * 0.78);
        const my = Math.round(H * 0.16);
        const halo = ctx.createRadialGradient(mx + m / 2, my + m / 2, 0, mx + m / 2, my + m / 2, m * 5);
        halo.addColorStop(0, 'oklch(92% 0.03 250 / 0.14)');
        halo.addColorStop(1, 'oklch(92% 0.03 250 / 0)');
        ctx.fillStyle = halo;
        ctx.fillRect(mx - m * 5, my - m * 5, m * 11, m * 11);
        ctx.fillStyle = 'oklch(90% 0.02 95 / 0.85)';
        ctx.fillRect(mx, my, m, m);
        ctx.fillStyle = 'oklch(78% 0.02 95 / 0.6)';
        ctx.fillRect(mx + m * 0.25, my + m * 0.3, m * 0.25, m * 0.25);
        ctx.fillRect(mx + m * 0.6, my + m * 0.6, m * 0.2, m * 0.2);
    }
    if (preset.surfaceLine) {
        const y = Math.round(preset.surfaceLine * H);
        ctx.fillStyle = 'oklch(70% 0.1 235 / 0.16)';
        for (let x = 0; x < W; x += 6 * s) ctx.fillRect(x, y + ((x / (6 * s)) % 2 ? 0 : s), 4 * s, s);
    }
    for (const layer of preset.layers) paintLayer(ctx, W, H, layer, r, s);
    if (preset.lava) {
        const g = ctx.createLinearGradient(0, H * 0.82, 0, H);
        g.addColorStop(0, 'oklch(62% 0.21 40 / 0)');
        g.addColorStop(1, preset.lava);
        ctx.fillStyle = g;
        ctx.fillRect(0, H * 0.82, W, H * 0.18);
    }
}

/* ── Particles ───────────────────────────────────────────────────────────────── */

const PARTICLES = {
    fireflies: { n: 26, spawn: (r, W, H) => ({ x: r() * W, y: H * (0.45 + r() * 0.5), vx: (r() - 0.5) * 0.25, vy: (r() - 0.5) * 0.15, p: r() * 6.28, z: 2 }),
        step: (q, r) => { q.vx += (r() - 0.5) * 0.02; q.vy += (r() - 0.5) * 0.02; q.vx *= 0.98; q.vy *= 0.98; q.p += 0.04; },
        alpha: (q) => 0.25 + 0.65 * Math.max(0, Math.sin(q.p)), color: 'oklch(90% 0.16 115' },
    bubbles: { n: 30, spawn: (r, W, H, fresh) => ({ x: r() * W, y: fresh ? H + 4 : r() * H, vx: 0, vy: -(0.25 + r() * 0.45), p: r() * 6.28, z: 3, ring: true }),
        step: (q) => { q.p += 0.05; q.x += Math.sin(q.p) * 0.2; },
        alpha: (q, H) => Math.min(1, (q.y - H * 0.1) / (H * 0.2)) * 0.55, color: 'oklch(88% 0.06 230' },
    dust: { n: 40, spawn: (r, W, H, fresh) => ({ x: r() * W, y: fresh ? -4 : r() * H, vx: (r() - 0.5) * 0.1, vy: 0.08 + r() * 0.16, p: r() * 6.28, z: r() < 0.2 ? 2 : 1 }),
        step: (q) => { q.p += 0.01; q.x += Math.sin(q.p) * 0.05; },
        alpha: () => 0.35, color: 'oklch(85% 0.04 80' },
    flames: { n: 24, spawn: (r, W, H, fresh) => ({ x: r() * W, y: fresh ? H * (0.75 + r() * 0.2) : H * (0.3 + r() * 0.65), vx: (r() - 0.5) * 0.08, vy: -(0.12 + r() * 0.2), life: 1, z: 2 }),
        step: (q) => { q.life -= 0.004; },
        alpha: (q) => Math.max(0, q.life) * 0.8, color: 'oklch(80% 0.15 60', dies: true },
    souls: { n: 26, spawn: (r, W, H, fresh) => ({ x: r() * W, y: fresh ? H * (0.8 + r() * 0.2) : r() * H, vx: 0, vy: -(0.1 + r() * 0.22), p: r() * 6.28, life: 1, z: 2 }),
        step: (q) => { q.p += 0.03; q.x += Math.sin(q.p) * 0.25; q.life -= 0.0025; },
        alpha: (q) => Math.max(0, Math.sin(q.life * 3.14)) * 0.8, color: 'oklch(84% 0.12 200', dies: true },
    ash: { n: 50, spawn: (r, W, H, fresh) => {
            const ember = r() < 0.35;
            return ember
                ? { x: r() * W, y: fresh ? H + 2 : r() * H, vx: (r() - 0.5) * 0.2, vy: -(0.3 + r() * 0.5), life: 1, z: 2, ember }
                : { x: r() * W, y: fresh ? -2 : r() * H, vx: 0.15 + r() * 0.25, vy: 0.2 + r() * 0.3, life: 1, z: r() < 0.3 ? 2 : 1, ember };
        },
        step: (q) => { if (q.ember) q.life -= 0.004; },
        alpha: (q) => (q.ember ? Math.max(0, q.life) * 0.85 : 0.4),
        color: (q) => (q.ember ? 'oklch(78% 0.17 55' : 'oklch(70% 0.02 30'), dies: true },
    endrods: { n: 40, spawn: (r, W, H) => {
            const portal = r() < 0.45;
            return { x: r() * W, y: r() * H, vx: (r() - 0.5) * 0.18, vy: (r() - 0.5) * 0.18 - (portal ? 0.12 : 0), p: r() * 6.28, z: portal ? 2 : 1 + (r() < 0.4 ? 1 : 0), portal };
        },
        step: (q) => { q.p += 0.05; },
        alpha: (q) => 0.35 + 0.5 * Math.abs(Math.sin(q.p)),
        color: (q) => (q.portal ? 'oklch(68% 0.2 305' : 'oklch(96% 0.02 300') },
};

/* ── The component ───────────────────────────────────────────────────────────── */

export default function Environment({ region, light = 0.5, seed = 7, className = '', still = false }) {
    const ref = useRef(null);
    const lightRef = useRef(light);
    const calm = useCalm();
    // Read by the running loop without restarting it; the loop eases toward it.
    useEffect(() => { lightRef.current = light; }, [light]);

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return undefined;
        const preset = PRESETS[region] ?? PRESETS.surface;
        const kind = PARTICLES[preset.particles];
        const frozen = calm || still;
        const off = document.createElement('canvas');
        let W = 0; let H = 0; let s = 1;
        let parts = [];
        let r = rng(seed * 7919);
        let lx = lightRef.current;
        let raf = 0; let last = 0; let visible = false;

        const size = () => {
            const rect = canvas.getBoundingClientRect();
            s = Math.min(window.devicePixelRatio || 1, 1.5);
            W = Math.max(1, Math.round(rect.width * s));
            H = Math.max(1, Math.round(rect.height * s));
            canvas.width = W; canvas.height = H;
            off.width = W; off.height = H;
            paintStill(off, preset, seed, W, H, s);
            r = rng(seed * 7919);
            parts = kind ? Array.from({ length: Math.round(kind.n * Math.min(1.4, W / (1200 * s))) + 6 }, () => kind.spawn(r, W, H, false)) : [];
            draw(0);
        };

        const draw = (t) => {
            const ctx = canvas.getContext('2d');
            ctx.drawImage(off, 0, 0);
            lx += (lightRef.current - lx) * 0.06;
            const g = preset.glow;
            if (g) {
                const gx = lx * W; const gy = g.y * H; const gr = g.r * Math.max(W, H) * 0.6;
                const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
                grad.addColorStop(0, g.color);
                grad.addColorStop(1, 'oklch(0% 0 0 / 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, W, H);
            }
            if (preset.shafts) {
                ctx.fillStyle = preset.shafts;
                for (let k = 0; k < 5; k++) {
                    const x = ((k + 0.5) / 5) * W + Math.sin(t / 2600 + k) * 30 * s;
                    ctx.beginPath();
                    ctx.moveTo(x - 18 * s, 0); ctx.lineTo(x + 18 * s, 0);
                    ctx.lineTo(x + 120 * s, H); ctx.lineTo(x + 40 * s, H);
                    ctx.fill();
                }
            }
            if (!kind) return;
            for (const q of parts) {
                const a = kind.alpha(q, H);
                if (a <= 0) continue;
                const c = typeof kind.color === 'function' ? kind.color(q) : kind.color;
                const z = Math.round(q.z * s * 1.5);
                if (q.ring) {
                    ctx.strokeStyle = `${c} / ${a})`;
                    ctx.lineWidth = s;
                    ctx.strokeRect(Math.round(q.x), Math.round(q.y), z + s, z + s);
                } else {
                    ctx.fillStyle = `${c} / ${a})`;
                    ctx.fillRect(Math.round(q.x), Math.round(q.y), z, z);
                }
            }
        };

        const tick = (t) => {
            raf = requestAnimationFrame(tick);
            if (t - last < 33) return;
            last = t;
            for (let i = 0; i < parts.length; i++) {
                const q = parts[i];
                q.x += q.vx * s; q.y += q.vy * s;
                kind.step(q, r);
                const gone = q.y < -8 || q.y > H + 8 || q.x < -8 || q.x > W + 8 || (kind.dies && q.life !== undefined && q.life <= 0);
                if (gone) parts[i] = kind.spawn(r, W, H, true);
            }
            draw(t);
        };

        const start = () => { if (!raf && visible && !frozen && kind && !document.hidden) raf = requestAnimationFrame(tick); };
        const stop = () => { cancelAnimationFrame(raf); raf = 0; };
        const onVis = () => (document.hidden ? stop() : start());

        size();
        const ro = new ResizeObserver(() => { size(); });
        ro.observe(canvas);
        const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else stop(); });
        io.observe(canvas);
        document.addEventListener('visibilitychange', onVis);

        // Frozen canvases still follow the light, one redraw per change.
        let lightTimer = 0;
        if (frozen) {
            lightTimer = window.setInterval(() => {
                if (Math.abs(lightRef.current - lx) > 0.002) { lx = lightRef.current - (lightRef.current - lx) * 0.2; draw(0); }
            }, 80);
        }

        return () => {
            stop(); ro.disconnect(); io.disconnect();
            document.removeEventListener('visibilitychange', onVis);
            window.clearInterval(lightTimer);
        };
    }, [region, seed, calm, still]);

    return <canvas ref={ref} className={`wk-env ${className}`} aria-hidden="true" />;
}
