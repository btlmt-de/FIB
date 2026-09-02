/*
 * ══════════════════════════════════════════════════════════════════════════
 * THE ARRIVAL — the reel closing
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Canvas 2D, mounted inside the reel mount, and the only part of this event
 * that belongs to the reel's own geometry.
 *
 * For the first beat this layer is transparent except for the blades, so the
 * player watches their OWN wheel get closed down slot by slot rather than cut
 * to a picture of one. After that it is the dark band the theatre opens out of,
 * and at the very end it lifts and the reel — which never stopped rendering
 * underneath — is simply revealed.
 *
 * ── WHY THIS IS NOT DRAWN IN THE 3D SCENE ────────────────────────────────────
 *
 * The blades belong to a flat 120px slot pitch and the station belongs to a
 * world with perspective in it. Drawing the shutter inside the scene would put
 * the reel's slots into world space and give them vanishing points, which is
 * exactly what they must not have: they are the wheel the player was looking at
 * a moment ago, at the size it was.
 *
 * It also stays HERE, in the reel mount, while everything else in this event
 * moved into a fixed frame over the page. The shutter is the one layer whose
 * whole job is to be exactly where the reel is.
 *
 * DESIGN.md §8 calls the reel "a main transit line arriving at its stop". The
 * band is the line; the theatre next door is the arrival.
 */

import React, { useEffect, useRef } from 'react';
import { rail } from '../config/constants';
import { prefersReducedMotion } from '../../../utils/motion.js';
import { T_SHUTTER, T_SHUTTER_LIFT, T_LIFT_END } from './arrivalTimeline.js';

const AMBER = '#FFAA00';
/** The reel's own slot pitch. The shutter closes one slot at a time. */
const SLOT_PITCH = 120;
/** Grey-blue, not brown: this is cold station dust off a steel blade. */
const DUST = '159,176,212';

const clamp01 = t => Math.max(0, Math.min(1, t));
/*
 * The blades FALL on an accelerating curve and RISE on a decelerating one,
 * which is not a stylistic pairing — it is the difference between a thing
 * being dropped and a thing being pulled.
 *
 * The first version used easeOutExpo for the close, so every blade arrived
 * already slowing and set itself down like a lid. Gravity has no such
 * courtesy. easeInQuad is gravity, and it is what makes the landing read as
 * an impact worth throwing dust off.
 */
const easeInQuad  = t => t * t;
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

/** Stable per-slot randomness. Same slot, same debris, every frame. */
const hash = i => { const s = Math.sin(i * 127.1) * 43758.5453; return s - Math.floor(s); };

/**
 * A burst of dust at (cx, y), aged `age` seconds out of `dur`.
 *
 * `dir` is -1 for a blade landing (the cloud rolls outward and up off the
 * floor) and +1 for one lifting (grit falls out of the mechanism). Drawn from
 * the clock rather than from a particle array on purpose: the shutter's whole
 * state is a function of `t`, so a resize, a dropped frame or a tab coming
 * back from the background all recover exactly instead of restarting mid-puff.
 */
function puff(ctx, cx, y, age, dur, dir, seed, alpha = 1) {
    if (age <= 0 || age >= dur) return;
    const p = age / dur;
    const spread = 1 - Math.pow(1 - p, 2);   // quick bloom, slow drift
    const fade = (1 - p) * (1 - p) * alpha;

    const rw = SLOT_PITCH * (0.28 + spread * 0.58);
    const rh = 4 + spread * (dir < 0 ? 24 : 16);
    const g = ctx.createRadialGradient(cx, y, 0, cx, y, Math.max(rw, rh));
    g.addColorStop(0, `rgba(${DUST},${0.34 * fade})`);
    g.addColorStop(0.6, `rgba(${DUST},${0.12 * fade})`);
    g.addColorStop(1, `rgba(${DUST},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, y, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let m = 0; m < 6; m++) {
        const a = hash(seed * 7.3 + m);
        const b = hash(seed * 19.7 + m * 3.1);
        const mx = cx + (a - 0.5) * SLOT_PITCH * (0.45 + spread * 1.25);
        const my = y + dir * (5 + b * 30) * spread;
        ctx.globalAlpha = fade * (0.3 + b * 0.45);
        ctx.fillStyle = `rgb(${DUST})`;
        ctx.fillRect(mx, my, 2, 2);
    }
    ctx.globalAlpha = 1;
}

export function ArrivalShutter() {
    const wrapRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        const wrap = wrapRef.current;
        const canvas = canvasRef.current;
        if (!wrap || !canvas) return undefined;

        const motionOff = prefersReducedMotion();
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        let W = 0, H = 0, raf = 0;
        const start = performance.now();

        const size = () => {
            const r = wrap.getBoundingClientRect();
            W = Math.max(1, r.width); H = Math.max(1, r.height);
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            canvas.style.width = `${W}px`;
            canvas.style.height = `${H}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        size();
        const ro = new ResizeObserver(size);
        ro.observe(wrap);

        const frame = (now) => {
            // Clamped at the source: a rAF timestamp can precede the
            // performance.now() captured just before it was scheduled, and every
            // value derived from a negative elapsed goes with it.
            const t = motionOff ? T_SHUTTER : Math.max(0, (now - start) / 1000);

            ctx.clearRect(0, 0, W, H);

            const slots = Math.ceil(W / SLOT_PITCH) + 1;

            /*
             * Both runs are stagger-then-travel, sized as fractions of their
             * phase so the whole cascade finishes on time at any viewport width.
             *
             * The close gives most of its budget to the STAGGER (0.68) and only
             * a third to each blade's fall, so the blades land as a row of
             * separate events rather than a single curtain — which is the point:
             * you should be able to count them.
             */
            const CLOSE_STAGGER = T_SHUTTER * 0.68;
            const CLOSE_FALL    = T_SHUTTER * 0.32;
            const OPEN_SPAN     = Math.max(0.1, T_LIFT_END - T_SHUTTER_LIFT);
            const OPEN_STAGGER  = OPEN_SPAN * 0.55;
            const OPEN_RISE     = OPEN_SPAN * 0.45;

            for (let i = 0; i < slots; i++) {
                const x = i * SLOT_PITCH;
                const closeLead = (i / slots) * CLOSE_STAGGER;
                const cp = motionOff ? 1 : clamp01((t - closeLead) / CLOSE_FALL);
                if (cp <= 0) continue;
                const closed = easeInQuad(cp);

                /*
                 * The last blade to land is the first to lift, so the opening
                 * unwinds the closing instead of replaying it. Running both
                 * left-to-right made the end look like a second shutdown.
                 */
                const openLead = ((slots - 1 - i) / slots) * OPEN_STAGGER;
                const openAge = motionOff ? -1 : t - (T_SHUTTER_LIFT + openLead);
                const opened = easeOutCubic(clamp01(openAge / OPEN_RISE));

                const h = H * closed * (1 - opened);

                if (h > 0.5) {
                    const blade = ctx.createLinearGradient(0, 0, 0, h);
                    blade.addColorStop(0, '#0a0d18');
                    blade.addColorStop(1, '#05060a');
                    // A pixel of overlap. At `SLOT_PITCH - 1` each blade left a
                    // hairline gap, and the lit reel behind showed through every
                    // one of them — a row of bright vertical seams across a band
                    // that is supposed to be shut.
                    ctx.fillStyle = blade;
                    ctx.fillRect(x, 0, SLOT_PITCH + 1, h);

                    // The leading edge catches the light on the way down, flares
                    // white-hot for a moment on impact, then settles to a
                    // rail-light seam. The flare is the only part of the slam
                    // that is visible after the blade has stopped moving.
                    const sinceLand = t - (closeLead + CLOSE_FALL);
                    const flare = clamp01(1 - sinceLand / 0.22);
                    const lifting = openAge > 0;
                    ctx.globalAlpha = cp < 1 ? 0.55 : (lifting ? 0.5 : 0.16 + flare * 0.6);
                    ctx.fillStyle = cp < 1 || flare > 0 || lifting ? AMBER : rail(0.5);
                    ctx.fillRect(x, h - 1.5, SLOT_PITCH + 1, 1.5 + flare * 1.5);
                    ctx.globalAlpha = 1;
                }

                if (motionOff) continue;
                // Landing throws dust off the floor; lifting shakes grit out of
                // the mechanism, from wherever the blade's edge has got to.
                puff(ctx, x + SLOT_PITCH / 2, H, t - (closeLead + CLOSE_FALL), 0.55, -1, i);
                if (openAge > 0) puff(ctx, x + SLOT_PITCH / 2, h, openAge, 0.7, 1, i + 91, 0.85);
            }

            if (motionOff) return;   // one static frame: the band, closed
            // Past T_LIFT_END so the last blade's grit finishes falling.
            if (t < T_LIFT_END + 0.5) raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
        };
    }, []);

    return (
        <div
            ref={wrapRef}
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, zIndex: 12, pointerEvents: 'none' }}
        >
            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
    );
}
