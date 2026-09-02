/*
 * ══════════════════════════════════════════════════════════════════════════
 * THE ARRIVAL — the spins leaving the crates
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A crate lands, its lid throws back, and what is inside it goes to the board.
 * This canvas is that flight: one mote per lucky spin, leaving the lip of a
 * crate standing on a 3D platform and arriving on a DOM row of the manifest.
 *
 * ── WHY THIS IS A SEPARATE, 2D LAYER ─────────────────────────────────────────
 *
 * Because of where the motes are going. Their origin is a world position and
 * their destination is a table row — and a table row has no world position, no
 * depth and no relationship to the scene's camera. Drawing them in the scene
 * would mean inventing a plane at some arbitrary distance for the board to live
 * on, and then re-deriving that plane every time the frame changed shape.
 *
 * So the scene does the one thing only it can do: it projects each crate's lip
 * through its own camera every frame and writes the pixel into `emitRef`. From
 * there both ends of every flight are pixels in the same box, which is what
 * this file needs and all it needs.
 *
 * ── THE STATE IS THE CLOCK, AGAIN ────────────────────────────────────────────
 *
 * There is no particle array. Every mote's position is a pure function of `t`,
 * exactly as the shutter's dust is, so a dropped frame, a resize, or a tab
 * coming back from the background all recover to the correct picture instead of
 * to whatever a half-integrated simulation had got to. `t` is the SCENE's clock,
 * read out of `emitRef` — two clocks would drift against each other by however
 * long the lazy three.js chunk took to arrive, and the whole point of a mote is
 * that it leaves a lid at the moment the lid opens.
 *
 * ── COST ────────────────────────────────────────────────────────────────────
 *
 * Two sprites are rendered once at mount and blitted thereafter. Building a
 * radial gradient per mote per frame is the obvious way to write this and it is
 * ~120 gradient objects a frame at the peak of a crowded arrival, on the same
 * frames the locomotive is drawing its shadow map.
 */

import React, { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../../utils/motion.js';
import {
    STREAM_DELAY_S, STREAM_SPREAD_S, STREAM_FLIGHT_S, T_LIFT,
} from './arrivalTimeline.js';

/** Station amber, and the white it goes to at the core of a moving light. */
const AMBER = '255,170,0';
const HOT = '255,236,196';

/** Stable per-mote randomness: same spin, same arc, every frame. */
const hash = i => { const s = Math.sin(i * 127.1) * 43758.5453; return s - Math.floor(s); };
const clamp01 = t => Math.max(0, Math.min(1, t));

/**
 * One radial sprite, drawn once. `stops` is [offset, 'r,g,b', alpha][].
 */
function sprite(stops, size = 64) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [at, rgb, a] of stops) g.addColorStop(at, `rgba(${rgb},${a})`);
    x.fillStyle = g;
    x.fillRect(0, 0, size, size);
    return c;
}

export function ArrivalMotes({ emitRef, rows, rowElsRef, frameRef }) {
    const canvasRef = useRef(null);
    /*
     * Read through a ref so a re-render never restarts the loop. Written in an
     * effect rather than during render: the rows are stable for the whole of an
     * arrival, so there is nothing to gain from the earlier write and a ref
     * mutated in a render body is the thing React will not promise to keep.
     */
    const rowsRef = useRef(rows);
    useEffect(() => { rowsRef.current = rows; }, [rows]);

    useEffect(() => {
        if (prefersReducedMotion()) return undefined;
        const canvas = canvasRef.current;
        const frame = frameRef?.current;
        if (!canvas || !frame) return undefined;

        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let W = 0, H = 0, raf = 0;

        /*
         * The head is a hot core with a wide amber falloff and the trail is the
         * same light, wider and cooler. Both are drawn additively, which is what
         * makes two motes crossing brighter than either — light behaves that way
         * and a stream of forty of them arriving on one row is supposed to read
         * as the row getting brighter.
         */
        const head = sprite([[0, HOT, 1], [0.28, AMBER, 0.85], [1, AMBER, 0]]);
        const tail = sprite([[0, AMBER, 0.5], [1, AMBER, 0]]);

        const size = () => {
            const r = frame.getBoundingClientRect();
            W = Math.max(1, r.width); H = Math.max(1, r.height);
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            canvas.style.width = `${W}px`;
            canvas.style.height = `${H}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        size();
        const ro = new ResizeObserver(size);
        ro.observe(frame);

        /*
         * Where every row sits, in the frame's own pixels.
         *
         * Re-measured each frame rather than captured, because the board
         * descends into the frame on its own animation and a target taken once
         * would be the position the row had before it arrived. Measured ONCE per
         * frame into an array, though, and never inside the mote loop: a layout
         * read per mote is a forced reflow per mote, which on a fifteen-crate
         * arrival is a hundred and twenty of them a frame.
         */
        const targets = [];
        const measure = (n) => {
            targets.length = 0;
            const f = frame.getBoundingClientRect();
            for (let i = 0; i < n; i++) {
                const el = rowElsRef.current?.[i];
                if (!el) { targets.push(null); continue; }
                const r = el.getBoundingClientRect();
                targets.push({
                    x: r.left - f.left + r.width * 0.72,
                    y: r.top - f.top + r.height / 2,
                    left: r.left - f.left, top: r.top - f.top, w: r.width, h: r.height,
                });
            }
        };

        const draw = (img, x, y, s, alpha) => {
            if (alpha <= 0.002) return;
            ctx.globalAlpha = alpha;
            ctx.drawImage(img, x - s / 2, y - s / 2, s, s);
        };

        const tick = () => {
            raf = requestAnimationFrame(tick);
            const st = emitRef.current;
            ctx.clearRect(0, 0, W, H);
            if (!st || !st.crates?.length) return;

            const t = st.t;
            if (t > T_LIFT) return;   // the station is going; nothing is in the air
            const list = rowsRef.current || [];
            measure(list.length);
            ctx.globalCompositeOperation = 'lighter';

            for (let i = 0; i < list.length; i++) {
                const c = st.crates[i];
                const target = targets[i];
                if (!c || !c.onScreen || c.openAt == null || !target) continue;

                /*
                 * The crate's own pixel is in the SCENE canvas's coordinates and
                 * the row's is in the frame's. They are the same box — the scene
                 * fills the frame — but only while `st.w`/`st.h` agree with it,
                 * which they will not for the frame or two after a resize before
                 * the scene's own observer has fired. Scaling rather than
                 * assuming costs a multiply and removes a class of jump.
                 */
                const sx = st.w ? W / st.w : 1;
                const sy = st.h ? H / st.h : 1;
                const ox = c.x * sx, oy = c.y * sy;

                const count = Math.max(1, list[i].crate);
                let hit = -1;   // the most recent arrival on this row

                for (let m = 0; m < count; m++) {
                    const seed = i * 31.7 + m;
                    const born = c.openAt + STREAM_DELAY_S + (m / count) * STREAM_SPREAD_S;
                    const age = t - born;
                    if (age < 0) continue;
                    if (age >= STREAM_FLIGHT_S) { hit = Math.max(hit, born + STREAM_FLIGHT_S); continue; }

                    /*
                     * A quadratic bezier with the control point thrown high and
                     * wide. Motes that travelled straight looked like tracer
                     * fire; the point is that they are LIFTED out of the box and
                     * fall onto the board, so the arc has to overshoot upward
                     * and the per-mote lateral scatter has to be big enough that
                     * fifteen of them read as a handful rather than as a beam.
                     */
                    const u = age / STREAM_FLIGHT_S;
                    const lift = 0.42 + hash(seed) * 0.5;
                    const cx = ox + (target.x - ox) * (0.3 + hash(seed * 3.1) * 0.35)
                        + (hash(seed * 7.7) - 0.5) * W * 0.10;
                    const cy = Math.min(oy, target.y) - Math.abs(target.y - oy) * lift
                        - 40 - hash(seed * 5.3) * 60;

                    const iu = 1 - u;
                    const x = iu * iu * ox + 2 * iu * u * cx + u * u * target.x;
                    const y = iu * iu * oy + 2 * iu * u * cy + u * u * target.y;

                    /*
                     * It brightens as it leaves and pinches out as it lands. A
                     * mote at constant size arriving on a row is a dot being
                     * deleted; one that narrows into the row is one being
                     * absorbed by it.
                     */
                    const glow = Math.sin(Math.PI * Math.min(1, u * 1.35)) * 0.85 + 0.15;
                    const s = 16 + 26 * Math.sin(Math.PI * u) - 7 * u;

                    /*
                     * Five samples back along the arc: a trail without storing
                     * one, because the arc is a function and can simply be asked
                     * where it was. Wide and additive, so the trail is what
                     * makes the flight legible across a dark frame — a bare head
                     * at this speed is a dot that appears somewhere else every
                     * frame, which the eye reads as noise rather than as motion.
                     */
                    for (let k = 1; k <= 5; k++) {
                        const uk = u - k * 0.032;
                        if (uk <= 0) break;
                        const ik = 1 - uk;
                        draw(tail,
                            ik * ik * ox + 2 * ik * uk * cx + uk * uk * target.x,
                            ik * ik * oy + 2 * ik * uk * cy + uk * uk * target.y,
                            s * (1.15 - k * 0.13), glow * (0.42 - k * 0.07));
                    }
                    draw(head, x, y, s, glow);
                }

                /*
                 * The row takes the light. Every arrival leaves a bloom on the
                 * row it landed on, which is what connects a thing flying across
                 * the frame to the number that changes because of it — without
                 * it the drums would simply resolve near some sparks.
                 */
                if (hit > 0) {
                    const since = t - hit;
                    if (since < 0.5) {
                        const a = clamp01(1 - since / 0.5) ** 2;
                        draw(tail, target.x, target.y, Math.max(target.w, 90) * 1.1, a * 0.5);
                        ctx.globalAlpha = a * 0.22;
                        ctx.fillStyle = `rgba(${AMBER},1)`;
                        ctx.fillRect(target.left, target.top, target.w, target.h);
                    }
                }
            }

            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        };
        raf = requestAnimationFrame(tick);

        return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    }, [emitRef, rowElsRef, frameRef]);

    if (prefersReducedMotion()) return null;
    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', display: 'block' }}
        />
    );
}
