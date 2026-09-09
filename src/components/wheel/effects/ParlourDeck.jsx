/*
 * ══════════════════════════════════════════════════════════════════════════
 * THE PARLOUR — the deck in the air
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Cards and chips falling through the room for as long as the table is open:
 * thrown when the slots turn over, drifting while bets are taken, thinning to
 * almost nothing at the call, and showering in the winning colour when the
 * pocket lights.
 *
 * ── THIS OVERTURNS THE MOTES' ARGUMENT, DELIBERATELY ─────────────────────────
 *
 * ParlourAtmosphere's header says the dust is twelve divs on keyframes and not
 * a particle system, because "the air in here is warm and still" is the one
 * visual idea on this page that does not need to be simulated. That was right
 * and it is still right — the motes are still divs.
 *
 * This is a different claim. A card falling is a rigid body tumbling about two
 * axes with its own spin, its own sway and its own parallax, and the whole
 * point of it is the beat it lands on: a surge, a lull, a hush and a shower are
 * four different densities of the same air over forty-five seconds. CSS can do
 * one of those with keyframes; four of them is four sets of keyframes and a
 * state machine deciding which set each element is on, which is a particle
 * system written in a language that cannot subtract.
 *
 * ── AND NOTHING HERE IS INTEGRATED ───────────────────────────────────────────
 *
 * Every piece's position is a function of `t` alone, the way the ring's offset
 * and the corner wheel's angle are, and for the same reason the timeline's
 * header gives: half of this event may be spent in a tab receiving no frames.
 * A field advanced per frame would come back from the background with its
 * whole deck bunched at the top of the screen.
 *
 * The density envelope works the same way, which is what makes the beats
 * survive a backgrounded tab. A piece is not spawned when the room gets busy;
 * every piece falls forever on its own period, and it is DRAWN only if the
 * envelope was above its threshold at the moment it was born — `t − u·period`,
 * which is knowable at any time from any starting point. Nothing pops in,
 * because a piece that would have popped in was never above the screen.
 *
 * ── NO CANVAS SHADOWS ────────────────────────────────────────────────────────
 *
 * DESIGN.md §8 records what `ctx.shadowBlur` cost the reel's lit rim when it
 * was assumed rather than measured. Every shadow here is a second draw of the
 * same path, offset and darkened, inside the transform the piece is already
 * under — one extra fill per piece instead of a full-canvas blur per piece.
 */

import React, { memo, useEffect, useRef } from 'react';
import { prefersCalm } from '../../../config/power.js';
import { serverNow } from '../../../utils/serverClock.js';
// The shaft's row pitch, so the detent's clearance below is one POCKET wide
// rather than a guess at one. CanvasRouletteStrip imports it from here for the
// same reason; the module is already on this route's bundle.
import { MOBILE_ROW_PITCH } from '../canvas/CanvasSpinningStrip.jsx';
import {
    T_CALL, T_SPIN, T_REVEAL, T_FALL, T_END,
    BRASS, CARD_IVORY, COLOURS,
} from './rouletteTimeline.js';

const TAU = Math.PI * 2;
const clamp01 = v => Math.max(0, Math.min(1, v));
const frac = v => v - Math.floor(v);
/** A bell of width `w` centred on `c`. The envelope's only shape. */
const bell = (t, c, w) => Math.exp(-Math.pow((t - c) / w, 2));

/** The two card colours. Table red, and the pocket black that is nearly the page. */
const SUIT_INK = ['#B4111F', '#14171F', '#B4111F', '#14171F'];

/**
 * How busy the air is at time `t`, 0 to 1. The event's four beats, as one curve.
 *
 *   0.0–2.0   the deck is thrown as the slots turn over
 *   2.0–31    a bed, low enough to bet through
 *   31–33     the hush: the room goes still while the croupier calls
 *   36.4–39   the shower, in the winning colour
 *   43.2–44.6 the air clears with the room
 */
function density(t) {
    if (t < -0.4 || t >= T_END) return 0;
    const surge = bell(t, 0.6, 1.5);
    /*
     * ── THE REFILL, AND THE BEAT IT RESCUES ─────────────────────────────────
     *
     * The shower used to be a bell on T_REVEAL, and on screen the reveal came
     * out THINNER than the betting window — the opposite of what the event
     * promises. The cause is that this envelope is sampled at a piece's BIRTH,
     * which is the top of the screen, and a card takes most of ten seconds to
     * fall: at the reveal the only pieces allowed to exist were ones born a
     * second earlier, still entering, while everything born during the hush had
     * been excluded. The room emptied for the call and had no time to refill
     * before the ball landed.
     *
     * So the refill starts when the WHEEL does, not when the pocket lights. A
     * piece born at T_SPIN is halfway down the screen by the reveal, which is
     * where the shower needs to be seen. The hush is also shallower and
     * narrower than it was — it should read as the room holding its breath,
     * not as the deck being taken away.
     */
    const refill = bell(t, T_SPIN + 1.0, 3.4);
    /*
     * The bed was 0.34, then 0.44, and is 0.58 because the first two numbers
     * were reasoned and the third was counted.
     *
     * The arithmetic said 0.44 of thirty pieces is thirteen in the air, which
     * sounded ample. On a 1568x733 capture it was **three**, and the reason is
     * that the field is not the viewport: this canvas sits under the interface
     * (§9b's rule — the room lights the things in it, it is not painted over
     * them), so the topbar, the drops rail, the HUD row, the reel band, the
     * collection card and the standings between them hide well over half the
     * screen. A piece behind any of those is a piece that costs a draw and
     * shows nothing.
     *
     * So the density is now set against what is VISIBLE rather than what is
     * drawn. The reveal shower, at ~9 pieces on screen, is the reading the
     * ambient beat should sit just under — not an order of magnitude above.
     */
    const bed = 0.58 * (1 - 0.58 * bell(t, T_CALL + 0.4, 1.6));
    const clearing = clamp01((T_END - t) / (T_END - T_FALL));
    return clamp01(Math.max(bed, surge, refill)) * clearing;
}

/**
 * Whether the room is wearing the winning colour, at time `t`.
 *
 * Asked of the CLOCK and not of a piece's birth, which is the other half of the
 * fix above. Tinting by birth meant only pieces thrown after the pocket lit
 * could carry its colour — a handful of cards at the top of the screen — and
 * every card already in the air stayed neutral through the one beat the colour
 * exists for. Asking the clock turns the whole field at once, which is both
 * more legible and the truer picture: the room does not deal a new deck when
 * the ball drops, the light in it changes.
 *
 * It cannot spoil anything. `pocketColour` is null until the server has
 * broadcast the result and the band has already announced it; this is the room
 * agreeing a beat late, never a second copy of the answer.
 */
const showering = t => t >= T_REVEAL - 0.15 && t < T_REVEAL + 4.5;

/** Seeded once from the index, so nothing teleports when the room re-renders. */
const rnd = (i, n) => { const s = Math.sin((i + 1) * n) * 43758.5453; return s - Math.floor(s); };

function buildPieces(n) {
    return Array.from({ length: n }, (_, i) => {
        // Three depths, dealt round-robin so the thinnest beats still show one
        // of each rather than three of the far layer.
        const layer = i % 3;
        return {
            chip: rnd(i, 12.9898) < 0.42,
            /*
             * The near layer is twice the far one. A tighter spread was tried
             * and the field read as noise at a single distance — parallax needs
             * the sizes to be obviously different, not slightly.
             */
            scale: [0.66, 1.00, 1.46][layer],
            alpha: [0.40, 0.70, 0.94][layer],
            x: rnd(i, 78.233),
            // Near pieces fall faster, which is the parallax.
            period: (9.5 + rnd(i, 39.425) * 7.0) - layer * 1.9,
            phase: rnd(i, 93.989),
            sway: 0.6 + rnd(i, 27.135) * 1.7,
            swayAmp: 0.018 + rnd(i, 15.117) * 0.055,
            spin: (rnd(i, 51.703) - 0.5) * 0.85,
            tumble: 0.16 + rnd(i, 64.221) * 0.42,
            suit: Math.floor(rnd(i, 22.517) * 4),
            faceUp: rnd(i, 33.311) < 0.58,
            tone: Math.floor(rnd(i, 44.909) * 3),
            threshold: (i + 0.5) / n,
        };
    });
}

/* ── the shapes ─────────────────────────────────────────────────────────── */

function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
}

/** The four pips, at radius `r` about the origin. Drawn, not typeset. */
function pip(g, suit, r) {
    g.beginPath();
    if (suit === 0) {                                   // ♥
        g.moveTo(0, r * 0.80);
        g.bezierCurveTo(-r * 1.10, r * 0.02, -r * 0.62, -r * 1.00, 0, -r * 0.32);
        g.bezierCurveTo(r * 0.62, -r * 1.00, r * 1.10, r * 0.02, 0, r * 0.80);
    } else if (suit === 1) {                            // ♠
        g.moveTo(0, -r);
        g.bezierCurveTo(r * 0.98, -r * 0.22, r * 0.60, r * 0.44, r * 0.13, r * 0.20);
        g.lineTo(r * 0.32, r * 0.78);
        g.lineTo(-r * 0.32, r * 0.78);
        g.lineTo(-r * 0.13, r * 0.20);
        g.bezierCurveTo(-r * 0.60, r * 0.44, -r * 0.98, -r * 0.22, 0, -r);
    } else if (suit === 2) {                            // ♦
        g.moveTo(0, -r);
        g.lineTo(r * 0.66, 0);
        g.lineTo(0, r);
        g.lineTo(-r * 0.66, 0);
    } else {                                            // ♣
        g.arc(0, -r * 0.40, r * 0.40, 0, TAU);
        g.closePath();
        g.moveTo(-r * 0.10, r * 0.16);
        g.arc(-r * 0.44, r * 0.16, r * 0.40, 0, TAU);
        g.closePath();
        g.moveTo(r * 0.78, r * 0.16);
        g.arc(r * 0.44, r * 0.16, r * 0.40, 0, TAU);
        g.closePath();
        g.moveTo(-r * 0.16, r * 0.82);
        g.lineTo(-r * 0.05, r * 0.12);
        g.lineTo(r * 0.05, r * 0.12);
        g.lineTo(r * 0.16, r * 0.82);
    }
    g.closePath();
    g.fill();
}

function drawCard(g, p, s, ink) {
    const w = 34 * s, h = 48 * s, r = 3.4 * s;

    // The shadow: the same rectangle, offset, under the card. A second fill
    // rather than a blur — see the header.
    g.fillStyle = 'rgba(6,1,3,0.38)';
    roundRect(g, -w / 2 + 2.5 * s, -h / 2 + 3.5 * s, w, h, r);
    g.fill();

    if (p.faceUp) {
        const face = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        face.addColorStop(0, '#FFF8E8');
        face.addColorStop(0.55, CARD_IVORY);
        face.addColorStop(1, '#CBBB9A');
        g.fillStyle = face;
        roundRect(g, -w / 2, -h / 2, w, h, r);
        g.fill();

        g.fillStyle = ink;
        g.save();
        g.translate(0, h * 0.02);
        pip(g, p.suit, w * 0.30);
        g.restore();

        // The index corner. Too small to read as a rank at this size, which is
        // right — a card in the air is a shape and a colour, not a value.
        g.save();
        g.translate(-w * 0.32, -h * 0.34);
        pip(g, p.suit, w * 0.10);
        g.restore();
    } else {
        const back = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        back.addColorStop(0, '#8A1522');
        back.addColorStop(0.5, '#61101A');
        back.addColorStop(1, '#3A070E');
        g.fillStyle = back;
        roundRect(g, -w / 2, -h / 2, w, h, r);
        g.fill();

        g.strokeStyle = `${BRASS}99`;
        g.lineWidth = Math.max(0.6, 0.9 * s);
        roundRect(g, -w / 2 + 2.4 * s, -h / 2 + 2.4 * s, w - 4.8 * s, h - 4.8 * s, r * 0.6);
        g.stroke();

        // A rosette, which is what the site's own card backs carry.
        g.strokeStyle = `${BRASS}77`;
        for (let k = 0; k < 6; k++) {
            const a = (k / 6) * TAU;
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(Math.cos(a) * w * 0.24, Math.sin(a) * w * 0.24);
            g.stroke();
        }
    }

    g.strokeStyle = 'rgba(0,0,0,0.34)';
    g.lineWidth = Math.max(0.5, 0.7 * s);
    roundRect(g, -w / 2, -h / 2, w, h, r);
    g.stroke();
}

/** The three clays, plus whatever the winning colour turns out to be. */
const CHIP_TONES = [
    { body: '#B4111F', edge: '#F1E3C6', pip: '#7A0A14', hi: '#E4515C' },
    { body: '#14171F', edge: '#D8D2C2', pip: '#05070C', hi: '#3D4453' },
    { body: '#EFE2C6', edge: '#B4111F', pip: '#8A7A55', hi: '#FFFBEF' },
];

function drawChip(g, p, s, squash, tone) {
    const r = 16 * s;
    const thick = r * 0.30;

    // Edge on: the chip is its own rim, and the stripes wrap round it.
    if (squash < 0.14) {
        g.fillStyle = 'rgba(6,1,3,0.38)';
        roundRect(g, -r + 2 * s, -thick / 2 + 3 * s, r * 2, thick, thick * 0.5);
        g.fill();
        g.fillStyle = tone.body;
        roundRect(g, -r, -thick / 2, r * 2, thick, thick * 0.5);
        g.fill();
        g.fillStyle = tone.edge;
        for (let k = -2; k <= 2; k++) {
            g.fillRect(k * r * 0.42 - r * 0.07, -thick / 2, r * 0.14, thick);
        }
        return;
    }

    // The shadow is drawn OUTSIDE the squash, in screen space, or a chip near
    // edge-on divides its own offset by a vanishing number and throws its
    // shadow across the room.
    g.save();
    g.fillStyle = 'rgba(6,1,3,0.36)';
    g.beginPath();
    g.ellipse(2.5 * s, 3.5 * s, r, r * squash, 0, 0, TAU);
    g.fill();
    g.restore();

    g.save();
    g.scale(1, squash);

    const body = g.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    body.addColorStop(0, tone.hi);
    body.addColorStop(0.5, tone.body);
    body.addColorStop(1, tone.pip);
    g.fillStyle = body;
    g.beginPath();
    g.arc(0, 0, r, 0, TAU);
    g.fill();

    // Six edge spots — the one detail that makes a disc read as a casino chip.
    g.strokeStyle = tone.edge;
    g.lineWidth = r * 0.26;
    for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU;
        g.beginPath();
        g.arc(0, 0, r * 0.87, a - 0.22, a + 0.22);
        g.stroke();
    }

    g.fillStyle = tone.pip;
    g.beginPath();
    g.arc(0, 0, r * 0.52, 0, TAU);
    g.fill();

    g.strokeStyle = `${BRASS}AA`;
    g.lineWidth = Math.max(0.6, r * 0.07);
    g.beginPath();
    g.arc(0, 0, r * 0.52, 0, TAU);
    g.stroke();

    g.restore();

    // The chip's thickness, showing under the face as it tilts.
    if (squash < 0.86) {
        g.fillStyle = tone.pip;
        roundRect(g, -r, r * squash - thick * 0.35, r * 2, thick * (1 - squash) + thick * 0.35, thick * 0.4);
        g.fill();
    }
}

function ParlourDeck({ openedAt, pocketColour = null, isMobile = false }) {
    const wrapRef = useRef(null);
    const canvasRef = useRef(null);
    const propsRef = useRef({ openedAt, pocketColour });
    useEffect(() => { propsRef.current = { openedAt, pocketColour }; });

    useEffect(() => {
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        if (!canvas || !wrap) return undefined;

        const calm = prefersCalm();
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        // The phone needs fewer because none of them is hidden — see the
        // portal below. The desktop needs more because most of them are.
        const pieces = buildPieces(isMobile ? 22 : 46);
        let W = 0, H = 0, raf = 0, parked = false;

        /*
         * The field is the WRAPPER, not the window. On the room it is the
         * fixed full-surface layer and the two are the same; in the shaft's
         * band it is the band, and measuring the window there would draw a
         * viewport-tall field into a 420px box and put every card off screen.
         */
        const size = () => {
            const r = wrap.getBoundingClientRect();
            W = Math.max(1, r.width);
            H = Math.max(1, r.height);
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            canvas.style.width = `${W}px`;
            canvas.style.height = `${H}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        size();

        const draw = (t) => {
            ctx.clearRect(0, 0, W, H);
            const winner = propsRef.current.pocketColour;

            for (const p of pieces) {
                const u = frac(t / p.period + p.phase);
                // When the piece left the top of the screen. The envelope is
                // sampled THERE, not now — see the header.
                const born = t - u * p.period;
                if (density(born) < p.threshold) continue;

                const y = (-0.20 + u * 1.40) * H;
                const x = (p.x + Math.sin(u * TAU * p.sway + p.phase * TAU) * p.swayAmp) * W;
                const s = p.scale * (isMobile ? 0.82 : 1);

                const showered = Boolean(winner) && showering(t);

                /*
                 * ── THE DETENT'S COLUMN STAYS CLEAR ──────────────────────────
                 *
                 * Only in the shaft, where the deck is mounted INSIDE the band
                 * and therefore paints over the pockets. While bets are open
                 * that is fine — the band is scenery and a card across it is
                 * the room. From the moment the wheel runs it stops being
                 * scenery and becomes the result, and a card lying over the
                 * bracketed winning pocket at the one moment it must be legible
                 * is the room contradicting the announcement.
                 *
                 * Seen, not predicted: at T_REVEAL+1.5 on a 390px capture a
                 * card back sat across the winning pocket's top-left corner. It
                 * missed the numeral by luck.
                 *
                 * The clearance is one pocket wide because it is measured from
                 * the band's own pitch, not from a constant that would drift
                 * the first time the shaft was re-spaced. Pieces fade rather
                 * than vanish, so nothing pops as it crosses.
                 */
                let clearance = 1;
                if (isMobile && t >= T_SPIN) {
                    const half = MOBILE_ROW_PITCH * 0.60;
                    const off = Math.abs(y - H / 2);
                    if (off < half) clearance = clamp01((off / half - 0.35) / 0.65);
                }
                if (clearance <= 0.01) continue;

                ctx.save();
                ctx.globalAlpha = p.alpha * clearance;
                ctx.translate(x, y);
                ctx.rotate(p.phase * TAU + t * p.spin);

                if (p.chip) {
                    const squash = Math.abs(Math.cos((t * p.tumble + p.phase) * TAU));
                    const tone = showered
                        ? { body: COLOURS[winner].hex, edge: CARD_IVORY, pip: '#05070C', hi: COLOURS[winner].ink }
                        : CHIP_TONES[p.tone];
                    drawChip(ctx, p, s, squash, tone);
                } else {
                    const tum = Math.cos((t * p.tumble * 0.8 + p.phase) * TAU);
                    const ink = showered
                        ? (winner === 'black' ? '#14171F' : COLOURS[winner].hex)
                        : SUIT_INK[p.suit];
                    if (Math.abs(tum) < 0.07) {
                        // Edge on. A card seen exactly side-on is a bright line,
                        // and drawing the face squashed to nothing instead is
                        // what makes cheap confetti look like paper.
                        ctx.fillStyle = '#D9CBA8';
                        ctx.fillRect(-1.3 * s, -24 * s, 2.6 * s, 48 * s);
                    } else {
                        ctx.scale(tum, 1);
                        drawCard(ctx, p, s, ink);
                    }
                }
                ctx.restore();
            }
            ctx.globalAlpha = 1;
        };

        const clock = () => (propsRef.current.openedAt
            ? (serverNow() - propsRef.current.openedAt) / 1000
            : 0);

        if (calm) {
            /*
             * Calm keeps the room's identity and drops its motion — §10's rule.
             * One still frame of the busiest beat: the air is full of cards,
             * they are simply not falling. A cleared canvas here would delete
             * the idea rather than calm it.
             */
            const paint = () => draw(0.6);
            paint();
            const ro = new ResizeObserver(() => { size(); paint(); });
            ro.observe(wrap);
            return () => ro.disconnect();
        }

        const ro = new ResizeObserver(size);
        ro.observe(wrap);

        const frame = () => {
            const t = clock();
            draw(Math.max(0, t));
            if (t > T_END + 1) { parked = true; return; }
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);

        return () => { if (!parked) cancelAnimationFrame(raf); ro.disconnect(); };
    }, [isMobile]);

    /*
     * ── WHERE THIS IS MOUNTED, AND THE RULE THAT DECIDES IT ──────────────────
     *
     * The deck fills whatever box it is given, and it is given two different
     * boxes because the two breakpoints are two different machines.
     *
     * On a desktop it is a layer of the ROOM: `ParlourAtmosphere` renders it
     * inside `.fib-parlour-air`, under the whole interface, and the cards fall
     * through the margins the layout leaves. Nothing you read is touched.
     *
     * On a phone there are no margins — §8's shaft runs the reel vertically and
     * fills the viewport — so the room was entirely behind one opaque canvas
     * and the event arrived as a red trim on the existing reel. The fix is to
     * mount the deck INSIDE the reel's own band, beside `CanvasRouletteStrip`,
     * where it paints over the reel and nothing else.
     *
     * **The first attempt portalled it to `document.body` at `z-index: 11` and
     * that was wrong**, in a way worth keeping: it did put the cards in front
     * of the reel, and it also put them in front of the topbar and the help
     * control, which breaks the one rule this room has — the room lights the
     * things in it and never rises above `Z.content`. A control may portal out
     * of a stacking context to be reachable; the room may not portal out of the
     * interface to be seen. Bounding it to the band gets the picture without
     * the trade, because the band is the one region on a phone that is scenery
     * rather than something you read.
     */
    return (
        <div
            ref={wrapRef}
            aria-hidden="true"
            style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                // Above the pockets, inside the band's own stacking context.
                // Only meaningful in the shaft; in the room it is a layer among
                // the room's layers and the order is the DOM's.
                ...(isMobile ? { zIndex: 7 } : null),
            }}
        >
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, display: 'block' }} />
        </div>
    );
}

export default memo(ParlourDeck);
