/*
 * ══════════════════════════════════════════════════════════════════════════
 * THE PARLOUR — the machine in the corner
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A roulette wheel, three quarters of it off the top-left corner of the screen,
 * turning for as long as the table is open. It is the room's one piece of
 * furniture and the only object in this event that looks like what the event is
 * called.
 *
 * ── IT IS THE MACHINE, NOT A SECOND READOUT ──────────────────────────────────
 *
 * DESIGN.md §9b's hardest rule about this event is that it must not have a
 * second geometry: the reel IS the wheel, unrolled, and anything else on screen
 * that could be read as "the result" is something that can disagree with the
 * result. That rule is why this wheel carries **no numbers and no ball**.
 *
 * Both were built and both were cut, for the same reason rather than for a
 * visual one. Numbered pockets invite you to read the one under the top of the
 * screen; a ball settles into a pocket, and a ball resting in green while the
 * band says red is exactly the bug that shipped here once and read as a near
 * miss. Twelve coloured wedges and a brass cross say "this is a roulette wheel
 * and it is running" completely, and say nothing that can be wrong.
 *
 * What it does say is the BEAT. It drifts while bets are open, takes up the
 * croupier's pause as a wind, runs on `spinPhase` — the reel's own easing,
 * imported rather than restated — and coasts to rest as the band lands. The
 * room and the reel are one machine at that moment, which is the whole point of
 * putting it there.
 *
 * ── WHY IT IS A CANVAS, WHERE THE REST OF THE ROOM IS CSS ────────────────────
 *
 * ParlourAtmosphere's header argues, correctly, that gradients and slow washes
 * belong in CSS because the compositor does them for free. A rigid body turning
 * about its own centre with brass frets, twelve wedges and a lit rim is not
 * that: as a stack of DOM it would be forty-odd elements inside a rotating
 * container, re-rasterised at every angle.
 *
 * As a canvas it is cheaper than either, because **the rotor is drawn once**.
 * Every frame is a clear, a rotate, one `drawImage` of a pre-rendered bitmap,
 * and the stationary bowl painted over it — no arcs, no gradients, no text per
 * frame. That is also what makes the motion blur affordable: three draws of the
 * same bitmap at three angles, which no DOM version could do at all.
 */

import React, { memo, useEffect, useRef } from 'react';
import { prefersCalm } from '../../../config/power.js';
import { serverNow } from '../../../utils/serverClock.js';
import {
    T_TURN, T_CALL, T_SPIN, T_END,
    COLOURS, BRASS, CRIMSON, CRIMSON_DEEP, CRIMSON_LIT,
    spinPhase,
} from './rouletteTimeline.js';

const TAU = Math.PI * 2;
const clamp01 = v => Math.max(0, Math.min(1, v));

/** How fast the rotor idles while bets are being taken, in radians a second. */
const IDLE_W = 0.10;
/** The croupier's wind, taken up over the pause between the call and the spin. */
const WIND_UP = 0.6;
/** Whole revolutions in the run. Five and a bit, so it never lands square. */
const SPIN_TURNS = 5.28;

/**
 * The rotor's angle at time `t`.
 *
 * Idle, wind and run are three terms of one sum rather than three branches, so
 * the angle is continuous by construction — a piecewise version has to hand its
 * own end state to the next piece, and gets it slightly wrong at every seam.
 */
function rotorAngle(t) {
    const wind = WIND_UP * Math.pow(clamp01((Math.min(t, T_SPIN) - T_CALL) / (T_SPIN - T_CALL)), 2);
    return t * IDLE_W + wind + SPIN_TURNS * TAU * spinPhase(t);
}

/**
 * The rim's pockets: twenty-four, alternating, with two greens opposite.
 *
 * Not imported from the server's wheel, and deliberately NOT twelve. This is
 * scenery, and the strongest guarantee that it cannot be read as a second
 * opinion about the result is that it is visibly a DIFFERENT wheel — nobody
 * counts twenty-four pockets against the strip's twelve, whereas twelve
 * invites exactly that. It says "a roulette wheel is running" and nothing else,
 * which is the whole of its job.
 *
 * Twelve was built first and looked wrong for an unrelated reason: only a
 * quarter of the wheel is on screen, so twelve pockets put three enormous 30°
 * wedges in the corner and the rim read as a pie chart. A real wheel's pockets
 * are narrow, and narrowness is most of what the eye recognises.
 */
const WEDGES = Array.from({ length: 24 }, (_, i) => (
    i === 0 || i === 12 ? 'green' : (i % 2 ? 'black' : 'red')
));

/**
 * The rotor, drawn once into an offscreen bitmap.
 *
 * Everything that turns lives here: the pocket ring, its brass frets, the cone
 * and the turret cross. The bowl the rotor sits in does not turn and is painted
 * over this every frame, which is also why the pocket ring's outer edge does
 * not need to be tidy — the bowl covers it.
 */
function renderRotor(R, dpr) {
    const S = Math.round(2 * R * dpr);
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.translate(R, R);

    const rPocketOut = R * 0.795;
    const rPocketIn = R * 0.560;
    const rConeIn = R * 0.150;

    /* ── the pocket ring ─────────────────────────────────────────────────── */
    const step = TAU / WEDGES.length;
    for (let i = 0; i < WEDGES.length; i++) {
        const a0 = i * step;
        const a1 = a0 + step;
        const colour = COLOURS[WEDGES[i]];

        // The face. Lacquer over a metal floor: dark at the fret, lifting
        // toward the middle of the pocket, dark again at the mouth.
        const face = g.createRadialGradient(0, 0, rPocketIn, 0, 0, rPocketOut);
        face.addColorStop(0, '#05060A');
        face.addColorStop(0.28, colour.hex);
        face.addColorStop(0.74, WEDGES[i] === 'black' ? '#20242F' : colour.hex);
        face.addColorStop(1, '#07080D');
        g.fillStyle = face;
        g.beginPath();
        g.arc(0, 0, rPocketOut, a0, a1);
        g.arc(0, 0, rPocketIn, a1, a0, true);
        g.closePath();
        g.fill();

        // The fret between this pocket and the next: a lit face and a dark one,
        // which is the whole reason the ring reads as machined rather than
        // printed. Two thin quads either side of the radius.
        for (const [lean, tone] of [[-1, `${BRASS}D9`], [1, 'rgba(0,0,0,0.72)']]) {
            const w = 0.0075 * lean;
            g.fillStyle = tone;
            g.beginPath();
            g.arc(0, 0, rPocketOut, a0, a0 + w, lean < 0);
            g.arc(0, 0, rPocketIn - R * 0.012, a0 + w, a0, lean > 0);
            g.closePath();
            g.fill();
        }
    }

    /* ── the cone, and the ribs that stiffen it ──────────────────────────── */
    const cone = g.createRadialGradient(0, 0, rConeIn, 0, 0, rPocketIn);
    cone.addColorStop(0, CRIMSON_LIT);
    cone.addColorStop(0.45, CRIMSON);
    cone.addColorStop(1, CRIMSON_DEEP);
    g.fillStyle = cone;
    g.beginPath();
    g.arc(0, 0, rPocketIn, 0, TAU);
    g.fill();

    g.strokeStyle = 'rgba(0,0,0,0.42)';
    g.lineWidth = Math.max(1, R * 0.006);
    for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        g.beginPath();
        g.moveTo(Math.cos(a) * rConeIn, Math.sin(a) * rConeIn);
        g.lineTo(Math.cos(a) * rPocketIn, Math.sin(a) * rPocketIn);
        g.stroke();
    }

    // The apron's brass collar, where the cone meets the pockets.
    g.strokeStyle = `${BRASS}AA`;
    g.lineWidth = Math.max(1.5, R * 0.011);
    g.beginPath();
    g.arc(0, 0, rPocketIn, 0, TAU);
    g.stroke();

    /* ── the turret and its cross ────────────────────────────────────────── */
    // The handle a croupier actually spins the wheel by. Four arms, tapered,
    // with a lit top edge — the one shape on the rotor you can track by eye,
    // and therefore the thing that makes the rotation legible at all.
    for (let i = 0; i < 4; i++) {
        g.save();
        g.rotate((i / 4) * TAU);
        const arm = g.createLinearGradient(0, -R * 0.03, 0, R * 0.03);
        arm.addColorStop(0, '#F0D98A');
        arm.addColorStop(0.42, BRASS);
        arm.addColorStop(1, '#5C4A12');
        g.fillStyle = arm;
        g.beginPath();
        g.moveTo(0, -R * 0.030);
        g.lineTo(R * 0.480, -R * 0.014);
        g.lineTo(R * 0.480, R * 0.014);
        g.lineTo(0, R * 0.030);
        g.closePath();
        g.fill();
        g.restore();
    }

    const turret = g.createRadialGradient(-rConeIn * 0.35, -rConeIn * 0.4, rConeIn * 0.1, 0, 0, rConeIn);
    turret.addColorStop(0, '#FFF0BC');
    turret.addColorStop(0.4, BRASS);
    turret.addColorStop(1, '#4A3A0E');
    g.fillStyle = turret;
    g.beginPath();
    g.arc(0, 0, rConeIn, 0, TAU);
    g.fill();

    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.beginPath();
    g.arc(0, 0, rConeIn * 0.24, 0, TAU);
    g.fill();

    return c;
}

/* Desktop only — ParlourAtmosphere does not mount this on the shaft, and its
   comment there says why. There is deliberately no phone branch in here: a
   sizing rule for a viewport the component is never rendered at is a rule
   nobody can check. */
function ParlourWheel({ openedAt }) {
    const canvasRef = useRef(null);

    /* The clock read through a ref, so a re-render of the room does not tear
       down and restart the loop — the same shape CanvasRouletteStrip uses. */
    const openedRef = useRef(openedAt);
    useEffect(() => { openedRef.current = openedAt; });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;

        const calm = prefersCalm();
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let R = 0, rotor = null, raf = 0, parked = false;

        const size = () => {
            const vmin = Math.min(window.innerWidth, window.innerHeight);
            R = Math.round(Math.max(190, Math.min(520, vmin * 0.50)));
            const S = 2 * R;
            canvas.width = Math.round(S * dpr);
            canvas.height = Math.round(S * dpr);
            canvas.style.width = `${S}px`;
            canvas.style.height = `${S}px`;
            /*
             * The wheel's centre sits just outside the corner, so a QUARTER of
             * it is on screen: the pocket ring, the frets and two arms of the
             * cross, which between them say roulette wheel completely.
             *
             * The first pass put the centre a third of a radius further out and
             * the result was a brass arc and a sliver of green — an object you
             * had to already know was there. The corner is a small budget and
             * spending it on rim rather than on pockets buys nothing.
             */
            canvas.style.left = `${-1.04 * R}px`;
            canvas.style.top = `${-1.00 * R}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            rotor = renderRotor(R, dpr);
        };
        size();

        const draw = (t) => {
            const S = 2 * R;
            ctx.clearRect(0, 0, S, S);

            const angle = calm ? rotorAngle(T_TURN) : rotorAngle(t);
            // Differentiated rather than measured, for the reason the reel's
            // strip differentiates its own offset: a tab returning from the
            // background must not read one enormous frame as speed.
            const w = calm ? 0 : Math.abs(rotorAngle(t + 0.02) - rotorAngle(t - 0.02)) / 0.04;
            const smear = clamp01((w - 1.4) / 14);

            /* the rotor, smeared while it is running */
            ctx.save();
            ctx.translate(R, R);
            const passes = smear > 0.03 ? 3 : 1;
            for (let k = 0; k < passes; k++) {
                ctx.save();
                ctx.rotate(angle - k * smear * 0.055);
                ctx.globalAlpha = k === 0 ? 1 : 0.34 * smear;
                ctx.drawImage(rotor, -R, -R, S, S);
                ctx.restore();
            }
            ctx.restore();

            /* ── the bowl, which does not turn ───────────────────────────── */
            ctx.save();
            ctx.translate(R, R);

            // The ball track: a dark lacquered channel inside the outer rim.
            const track = ctx.createRadialGradient(0, 0, R * 0.795, 0, 0, R * 0.94);
            track.addColorStop(0, 'rgba(4,5,9,0.96)');
            track.addColorStop(0.42, CRIMSON_DEEP);
            track.addColorStop(1, CRIMSON);
            ctx.fillStyle = track;
            ctx.beginPath();
            ctx.arc(0, 0, R * 0.94, 0, TAU);
            ctx.arc(0, 0, R * 0.795, TAU, 0, true);
            ctx.closePath();
            ctx.fill();

            // Brass hairlines either side of the track, and the outer rim.
            ctx.lineWidth = Math.max(1.5, R * 0.010);
            for (const [rr, alpha] of [[0.795, 'CC'], [0.940, '99']]) {
                ctx.strokeStyle = `${BRASS}${alpha}`;
                ctx.beginPath();
                ctx.arc(0, 0, R * rr, 0, TAU);
                ctx.stroke();
            }

            const rim = ctx.createRadialGradient(0, 0, R * 0.94, 0, 0, R);
            rim.addColorStop(0, '#6B5518');
            rim.addColorStop(0.35, BRASS);
            rim.addColorStop(0.72, '#8A6E1E');
            rim.addColorStop(1, '#2A2107');
            ctx.fillStyle = rim;
            ctx.beginPath();
            ctx.arc(0, 0, R, 0, TAU);
            ctx.arc(0, 0, R * 0.94, TAU, 0, true);
            ctx.closePath();
            ctx.fill();

            /*
             * The lamp, which is the reason this reads as an object.
             *
             * The room's light hangs over the middle of the page — down and to
             * the right of this corner — so the highlight belongs on the lower
             * right of the wheel and must NOT turn with it. Drawn last and
             * clipped to the wheel, it is the one thing separating "a lit brass
             * machine" from "a spinning sticker".
             */
            ctx.globalCompositeOperation = 'lighter';
            const lamp = ctx.createRadialGradient(R * 0.42, R * 0.46, 0, R * 0.42, R * 0.46, R * 1.15);
            lamp.addColorStop(0, 'rgba(255, 224, 150, 0.20)');
            lamp.addColorStop(0.45, 'rgba(230, 160, 90, 0.07)');
            lamp.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = lamp;
            ctx.beginPath();
            ctx.arc(0, 0, R, 0, TAU);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';

            // And the shadow the corner of the room casts back over it, so the
            // far side of the wheel falls away instead of ending at a line.
            const away = ctx.createLinearGradient(-R, -R, R * 0.5, R * 0.55);
            away.addColorStop(0, 'rgba(8,2,4,0.82)');
            away.addColorStop(0.55, 'rgba(8,2,4,0.12)');
            away.addColorStop(1, 'rgba(8,2,4,0)');
            ctx.fillStyle = away;
            ctx.beginPath();
            ctx.arc(0, 0, R, 0, TAU);
            ctx.fill();

            ctx.restore();
        };

        /* The server's clock, as everything in this event is — see the
           timeline's header. A page loaded mid-event finds the wheel where it
           should be rather than starting it over from the drift. */
        const clock = () => (openedRef.current ? (serverNow() - openedRef.current) / 1000 : 0);

        if (calm) {
            draw(T_TURN);
            const ro = new ResizeObserver(() => { size(); draw(T_TURN); });
            ro.observe(document.documentElement);
            return () => ro.disconnect();
        }

        const ro = new ResizeObserver(() => { size(); });
        ro.observe(document.documentElement);

        const frame = () => {
            const t = clock();
            draw(Math.max(0, t));
            // Park rather than run out the tab's lifetime: the room is removed
            // shortly after T_END anyway, and a loop that outlives its event is
            // the ambient cost §10 exists to stop.
            if (t > T_END + 1) { parked = true; return; }
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);

        return () => { if (!parked) cancelAnimationFrame(raf); ro.disconnect(); };
    }, []);

    return (
        /*
         * The wrapper exists for the mask, and the mask exists for one measured
         * problem: the wheel's brass rim reaches the top-left corner of the
         * viewport, which is where the Back control, the page title and the
         * LIVE drops rail live. Lit brass behind a small grey label took "Back"
         * to roughly 2:1 — the room lighting the things in it, and then
         * lighting one of them badly.
         *
         * ── IT WAS MEASURED AGAINST THE WRONG ELEMENT ONCE ───────────────────
         *
         * The first fade ended at 74px, which cleared the nav and stopped
         * exactly where the drops rail begins. The rail's pills are dark panels
         * and survive on their own, but they have GAPS, and the leftmost
         * username was visibly broken up by the rim behind it. The fade now
         * runs to the rail's own bottom edge, so every element in that column
         * is clear of the brass and the wheel starts where the page's furniture
         * ends. Below it the room is the room again.
         */
        <div
            aria-hidden="true"
            style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                pointerEvents: 'none',
                opacity: 0.92,
                maskImage: 'linear-gradient(to bottom, transparent 0, transparent 44px, #000 116px)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, transparent 44px, #000 116px)',
            }}
        >
            <canvas ref={canvasRef} style={{ position: 'absolute', display: 'block' }} />
        </div>
    );
}

export default memo(ParlourWheel);
