/*
 * ══════════════════════════════════════════════════════════════════════════
 * THE PARLOUR — the reel, as a roulette
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The reel's own band, its own pitch, its own detent — carrying twelve coloured
 * pockets instead of 1,559 items. It stands in the reel's mount the way
 * CanvasBonusStrip does, and that file's header is the statement of the pattern:
 * the board is "the reel's understudy… it replaces it in the same row".
 *
 * ── A ROULETTE IS A RING, SO THIS DRAWS A RING ───────────────────────────────
 *
 * There is no strip array here, and that is the one real difference from every
 * other travelling surface on this page. The reel builds a finite sequence with
 * a winner at FINAL_INDEX because its pool is 1,559 items and any of them can
 * come up; a roulette wheel is twelve pockets that come round again, forever.
 * So the pocket under any slot is `POCKETS[index mod 12]` and the whole strip is
 * that function — which means there is no array to keep in step with an offset,
 * no landing index to restate, and no way for the tile under the detent to
 * disagree with the tile the server chose. CanvasBonusStrip's header records
 * what that class of disagreement costs: a board announcing one event while
 * another executed underneath, right about a third of the time.
 *
 * ── AND IT IS DRAWN AS A WHEEL, NOT AS A ROW OF SWATCHES ─────────────────────
 *
 * The first pass drew flat rectangles at linear positions. It was legible and it
 * read as a colour bar chart, because two things a real wheel has were missing:
 *
 *   PERSPECTIVE. Pockets are projected through `project()` below, so the ones
 *   under the lamp are wide and the ones running off toward either end are
 *   foreshortened. That single change is most of what makes the band read as
 *   the rim of something round rather than as a list. It is purely visual —
 *   the centre maps to itself, so the landing position is untouched.
 *
 *   DEPTH. A pocket is a slot cut into a rim, so it has a rim shadow falling in
 *   from above, a lacquer highlight across its face, a floor, and a brass fret
 *   on each side with a lit face and a dark one. Flat fills had none of that,
 *   and no amount of colour choice substitutes for it.
 *
 * ── EVERYTHING IS A FUNCTION OF t ────────────────────────────────────────────
 *
 * The offset is not integrated frame to frame; it is computed from the clock.
 * The event runs for three quarters of a minute and thirty of those seconds are
 * a betting window a player may well spend in another tab, receiving no frames
 * at all. An integrated ring would come back mid-travel and land on the wrong
 * pocket — that is, on the wrong RESULT. Derived from `t`, a tab that was away
 * simply resumes where the wheel should be.
 *
 * The same rule is why the landing cannot drift: `landingOffset` is solved
 * BACKWARDS from the pocket the server already chose, exactly as the reel's
 * `finalOffset` is solved from a strip built around an item the server picked.
 * It is also what lets the speed be known analytically rather than measured —
 * see `fast` in the draw, which is how the detail sheds while the ring is
 * travelling too quickly for anyone to read it.
 */

import React, { useEffect, useRef } from 'react';
import { ITEM_WIDTH, STRIP_HEIGHT } from '../../../config/constants.js';
import { MOBILE_ROW_PITCH } from './CanvasSpinningStrip.jsx';
import { prefersReducedMotion } from '../../../utils/motion.js';
import { COLORS } from '../config/constants';
import {
    T_TURN, T_SPIN, T_LAND, T_REVEAL, T_FALL, T_END, TURN_FLIP_S,
    COLOURS, BRASS, CRIMSON_DEEP, spinPhase,
} from '../effects/rouletteTimeline.js';

/** How fast the idle ring drifts while bets are being taken, in px/s. */
const IDLE_SPEED = 26;
/** At least this many whole revolutions before the ball is allowed to land. */
const MIN_REVS = 5;

/**
 * Half the visible arc, in radians. The whole perspective, in one number.
 *
 * 1.12 (~64°) is a rim seen from close enough to be sitting at the table: the
 * three pockets under the lamp are close to their true width and everything
 * past them tightens quickly. Larger reads as a fish-eye; smaller and the
 * band goes back to being a list.
 */
const ARC = 1.12;
const SIN_ARC = Math.sin(ARC);

const clamp01 = t => Math.max(0, Math.min(1, t));
/* The run's own easing is `spinPhase` in the timeline — see `ringOffset`. */
const easeInQuad = t => t * t;
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

/**
 * Linear position across the band, -1..1, to its position on the rim.
 *
 * Zero maps to zero and ±1 maps to ±1, so the band's centre and its ends are
 * exactly where they were and only the space between them is redistributed.
 * That is what makes this safe to apply after the landing has been solved: the
 * pocket that is under the detent stays under the detent.
 */
const project = u => Math.sin(u * ARC) / SIN_ARC;

/**
 * `project` is only monotonic while `u * ARC` stays inside a quarter turn —
 * past that the sine turns over and slots would fold back on top of each other,
 * travelling the wrong way at the very ends of the band. Clamping here rather
 * than at ±1 lets the slots that are partly off-band still project honestly
 * instead of stacking on the edge.
 */
const U_MAX = Math.PI / 2 / ARC;
const clampU = u => Math.max(-U_MAX, Math.min(U_MAX, u));

/*
 * ── THE DETENT PAIR ──────────────────────────────────────────────────────────
 *
 * These two are exact inverses and MUST stay so. One says which slot is under
 * the pointer at a given offset; the other says which offset puts a given slot
 * there. The landing is solved with the second and the indicator is drawn with
 * the first, so the pocket the player sees selected is the pocket the animation
 * was aimed at, by construction rather than by two agreeing calculations.
 *
 * They were NOT a pair, and it was the worst bug this feature has had. The
 * landing returned `(slot + rest) * pitch` while the draw loop computes a
 * slot's LEFT EDGE as `centre + slot·pitch − offset` — so the offset was
 * putting the winning pocket's left edge on the detent rather than its centre,
 * and the pointer sat on the boundary. With `rest` running ±0.26 of a pitch,
 * exactly half the pockets fell the wrong side of it: **6 of 12 results pointed
 * at the neighbouring pocket**, announcing black while the wheel showed red.
 * It read as a near-miss on a close call, which is precisely why it survived —
 * a wheel that stops one slot out looks like a wheel that nearly stopped there.
 *
 * The `+ 0.5` is the fix and the reason it is written here, once, is that this
 * is the only place that knows a slot is drawn from its left edge.
 */

/** The slot whose centre is under the detent at this offset. */
const slotUnderDetent = (offset, pitch) => Math.round(offset / pitch - 0.5);

/** The offset that puts `slot` under the detent, resting `rest` pitches off centre. */
const offsetForSlot = (slot, pitch, rest = 0) => (slot + 0.5 + rest) * pitch;

/**
 * How far off dead centre a landing is allowed to rest, in pitches.
 *
 * The reel's own habit — a slot that stops perfectly centred every time reads
 * as a list snapping to a row rather than as a wheel coming to rest. Kept well
 * inside half a pitch so `slotUnderDetent` still rounds to the winner, and
 * deliberately smaller than it was: `project()` expands the middle of the band
 * by ~1.24x, so a rest of 0.16 already *looks* like 0.20 of a pocket.
 */
const REST_SPREAD = 0.16;

/**
 * Where the ring must come to rest for pocket `winner` to sit under the detent.
 *
 * Solved from the pocket, never simulated toward it: this picks the first
 * offset congruent to the winning pocket that is at least MIN_REVS revolutions
 * past wherever the idle drift had got to.
 */
function landingOffset(idleAt, winner, ringLength, pitch) {
    const minimum = idleAt + MIN_REVS * ringLength * pitch;
    const slot = Math.ceil(minimum / pitch);
    const ahead = ((winner - slot) % ringLength + ringLength) % ringLength;
    const landingSlot = slot + ahead;
    // Deterministic per-pocket rest, so one result always settles the same way
    // rather than jittering between renders of a single event.
    const rest = (((winner * 2654435761) % 1000) / 1000 - 0.5) * 2 * REST_SPREAD;
    return offsetForSlot(landingSlot, pitch, rest);
}

/** The ring's offset at time `t`, in pixels. The whole animation, in one place. */
function ringOffset(t, winner, ringLength, pitch) {
    const idle = t * IDLE_SPEED;
    if (winner === null || winner === undefined || t < T_SPIN) return idle;

    const from = T_SPIN * IDLE_SPEED;
    const to = landingOffset(from, winner, ringLength, pitch);
    if (t >= T_LAND) return to;

    /*
     * `spinPhase` rather than a local `easeOutQuart` call, and the reason is
     * the corner wheel: it is the same machine seen from the other side, and
     * the whole point of putting it there is that the room and the reel move as
     * one at the landing. Two copies of the same curve are two curves the first
     * time either is tuned. The timeline owns it now.
     */
    return from + (to - from) * spinPhase(t);
}

/**
 * How far slot `i` has turned over, 0 (an item) to 1 (a pocket).
 *
 * Staggered across the band so the change runs along the reel rather than
 * happening to all of it at once — the same gesture, and the same reasoning, as
 * THE ARRIVAL's shutter: you should be able to count them. It runs one way at
 * the start and unwinds at the end, so the reel comes back the way it left.
 */
function turnAmount(t, i, slots) {
    if (t >= T_FALL) {
        const lead = ((slots - 1 - i) / Math.max(1, slots)) * (T_END - T_FALL - TURN_FLIP_S);
        return 1 - easeOutCubic(clamp01((t - T_FALL - lead) / TURN_FLIP_S));
    }
    const lead = (i / Math.max(1, slots)) * (T_TURN - TURN_FLIP_S);
    return easeInQuad(clamp01((t - lead) / TURN_FLIP_S));
}

export function CanvasRouletteStrip({ pockets, pocketIndex, clock, isMobile = false, onTick }) {
    const wrapRef = useRef(null);
    const canvasRef = useRef(null);
    /** The slot the pin was on last frame, so a crossing can be detected. */
    const lastTickSlotRef = useRef(null);

    const propsRef = useRef({ pockets, pocketIndex, clock, isMobile, onTick });
    useEffect(() => {
        propsRef.current = { pockets, pocketIndex, clock, isMobile, onTick };
    });

    useEffect(() => {
        const wrap = wrapRef.current;
        const canvas = canvasRef.current;
        if (!wrap || !canvas) return undefined;

        const motionOff = prefersReducedMotion();
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let W = 0, H = 0, raf = 0;

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

        const draw = (t) => {
            const { pockets: RING, pocketIndex: winner, isMobile: phone } = propsRef.current;
            const n = RING?.length || 0;
            if (!n) return;

            ctx.clearRect(0, 0, W, H);

            /*
             * The phone runs the reel vertically — the shaft — so this runs
             * vertically too. A takeover that borrows the reel's slot and then
             * travels across a surface where everything else travels down is the
             * bug CanvasBonusStrip's mobile-pitch note records having shipped.
             *
             * Rather than rotating the context (which would mirror every glyph),
             * the whole draw is written in ALONG / ACROSS terms and these four
             * helpers put the pixels down the right way round. Text is then
             * simply placed at a point, upright, on either axis.
             */
            const pitch = phone ? MOBILE_ROW_PITCH : ITEM_WIDTH;
            const along = phone ? H : W;
            const across = phone ? W : H;
            const centre = along / 2;
            const half = along / 2;

            const box = (a0, a1, c0, c1) => (phone
                ? ctx.fillRect(c0, a0, c1 - c0, a1 - a0)
                : ctx.fillRect(a0, c0, a1 - a0, c1 - c0));
            const acrossGrad = (c0, c1) => (phone
                ? ctx.createLinearGradient(c0, 0, c1, 0)
                : ctx.createLinearGradient(0, c0, 0, c1));
            const alongGrad = (a0, a1) => (phone
                ? ctx.createLinearGradient(0, a0, 0, a1)
                : ctx.createLinearGradient(a0, 0, a1, 0));
            const at = (a, c) => (phone ? [c, a] : [a, c]);

            const offset = motionOff
                ? (winner != null ? landingOffset(0, winner, n, pitch) : 0)
                : ringOffset(t, winner, n, pitch);

            /*
             * The travel speed, differentiated rather than measured.
             *
             * Because the offset is a closed-form function of `t`, the speed is
             * too, which means detail can be shed at exactly the right moment
             * without keeping a previous frame around to compare against — and
             * without that estimate going wrong the first frame after a tab
             * comes back from the background.
             */
            const speed = motionOff ? 0 : Math.abs(
                ringOffset(t + 0.02, winner, n, pitch) - ringOffset(t - 0.02, winner, n, pitch)
            ) / 0.04;
            const fast = clamp01((speed - 260) / 2400);

            /* ── the rim behind the pockets ────────────────────────────────
             *
             * Warm, not blue. This was a near-black with a blue cast, chosen
             * when the room around it was a green baize and the page under it
             * was the Nocturne. In a crimson room a cool rim is the one part of
             * the wheel that is still lit by yesterday's light, and it reads as
             * a hole in the floor rather than as the bowl the pockets are cut
             * into. Same value, the room's hue. */
            const rim = acrossGrad(0, across);
            rim.addColorStop(0, '#0B0206');
            rim.addColorStop(0.5, CRIMSON_DEEP);
            rim.addColorStop(1, '#080104');
            ctx.fillStyle = rim;
            box(0, along, 0, across);

            const slots = Math.ceil(along / pitch) + 3;
            const firstSlot = Math.floor((offset - centre) / pitch) - 1;
            const landed = winner != null && t >= T_REVEAL;
            let winnerCentre = null;

            /*
             * The slot the pointer is on, right now. Read through the pair at
             * the top of this file, so it is the same question the landing was
             * solved against rather than a second opinion about it.
             */
            const selected = slotUnderDetent(offset, pitch);
            let selectedEdges = null;

            /*
             * One tick per fret passing the pin.
             *
             * Fired on the CHANGE of the selected slot rather than on a timer,
             * so the clatter is locked to the picture: it accelerates and slows
             * with the ring for free, because it is the same quantity. The reel
             * keeps `lastCentreIndexRef` for the same reason a few files over.
             *
             * Skipped on the very first frame — `lastTickSlotRef` starts null,
             * and a tick there would fire on mount rather than on a crossing.
             * Skipped too when the slot has jumped by more than one, which
             * happens when a backgrounded tab comes back and the ring is
             * suddenly somewhere else; that is a seek, not sixteen frets.
             */
            const prevSlot = lastTickSlotRef.current;
            if (prevSlot !== null && selected !== prevSlot && propsRef.current.onTick) {
                if (Math.abs(selected - prevSlot) === 1) propsRef.current.onTick(speed);
            }
            lastTickSlotRef.current = selected;

            for (let s = 0; s < slots; s++) {
                const slot = firstSlot + s;
                const linL = centre + slot * pitch - offset;
                const linR = linL + pitch;
                // Cull on the linear position, since projection only pulls
                // things inward — anything off-band linearly stays off-band.
                if (linR < -pitch || linL > along + pitch) continue;

                /*
                 * -1 at the band's left end, 0 at the detent, +1 at the right.
                 *
                 * This was `clamp01((lin - centre) / half + 1) * 2 - 1`, which
                 * is the same expression with a clamp in the wrong place, and
                 * the effect was severe rather than subtle: `clamp01` caps at 1,
                 * so the DETENT itself mapped to u = +1 and everything right of
                 * it piled up on the right-hand edge, while the left half of the
                 * band was stretched across the full width. The winning pocket
                 * comes to rest at the linear centre, so it was being drawn at
                 * the far end of the band — the pointer sat on whatever slot the
                 * stretch happened to put under it.
                 *
                 * The landing maths was never wrong here; this is a projection
                 * that mislaid the middle of its own domain.
                 */
                const uL = clampU((linL - centre) / half);
                const uR = clampU((linR - centre) / half);
                const xL = centre + half * project(uL);
                const xR = centre + half * project(uR);
                const w = xR - xL;
                if (w <= 0.5) continue;

                const idx = ((slot % n) + n) % n;
                const pocket = RING[idx];
                const colour = COLOURS[pocket.colour] || COLOURS.black;

                const turn = motionOff ? 1 : turnAmount(t, s, slots);
                if (turn <= 0.004) continue;

                /*
                 * The slot turns over about the band's own middle: it is a
                 * hairline edge-on and full depth once it has arrived. Drawn
                 * over whatever the reel left behind, which is why a slot
                 * mid-turn still shows its item above and below.
                 */
                const c0 = across / 2 - (across / 2) * turn;
                const c1 = across / 2 + (across / 2) * turn;
                const depth = c1 - c0;

                const isWinner = landed && idx === winner;
                if (isWinner) winnerCentre = (xL + xR) / 2;
                if (slot === selected) selectedEdges = [xL, xR, c0, c1];

                /* the pocket's face
                 *
                 * Four stops, and the shape of the ramp is what makes a pocket
                 * read as a slot cut into a rim rather than a coloured tile:
                 * dark at the mouth, brightest a third of the way down where
                 * the lamp reaches, the true colour below that, and dark again
                 * at the floor. The black pocket's lift is the largest of the
                 * three for the reason §9b records about its chip — the pocket
                 * is very nearly the page, and without a visible lit face it
                 * would be a gap between two red ones. */
                const face = acrossGrad(c0, c1);
                if (pocket.colour === 'green') {
                    face.addColorStop(0, '#062A1D');
                    face.addColorStop(0.32, '#22BE80');
                    face.addColorStop(0.60, colour.hex);
                    face.addColorStop(1, '#03170F');
                } else if (pocket.colour === 'red') {
                    face.addColorStop(0, '#4A0810');
                    face.addColorStop(0.32, '#E23342');
                    face.addColorStop(0.60, colour.hex);
                    face.addColorStop(1, '#2C050B');
                } else {
                    face.addColorStop(0, '#07080D');
                    face.addColorStop(0.32, '#333B4C');
                    face.addColorStop(0.60, colour.hex);
                    face.addColorStop(1, '#030408');
                }
                ctx.fillStyle = face;
                box(xL, xR, c0, c1);

                /* the rim's shadow, falling in from the top edge */
                const shade = acrossGrad(c0, c0 + depth * 0.30);
                shade.addColorStop(0, 'rgba(0,0,0,0.62)');
                shade.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = shade;
                box(xL, xR, c0, c0 + depth * 0.30);

                /* the floor, and the lip in front of it */
                const floor = acrossGrad(c1 - depth * 0.22, c1);
                floor.addColorStop(0, 'rgba(0,0,0,0)');
                floor.addColorStop(1, 'rgba(0,0,0,0.55)');
                ctx.fillStyle = floor;
                box(xL, xR, c1 - depth * 0.22, c1);

                /*
                 * Lacquer. The highlight sits where the lamp is — so it slides
                 * across the face as a pocket travels past the middle of the
                 * band, rather than every pocket carrying an identical stripe.
                 * That is the difference between a lit surface and a texture.
                 */
                const u = (xL + xR) / 2 / along * 2 - 1;
                const gloss = alongGrad(xL, xR);
                const peak = clamp01(0.5 - u * 0.42);
                gloss.addColorStop(0, 'rgba(255,255,255,0)');
                gloss.addColorStop(Math.max(0.02, Math.min(0.98, peak)), `rgba(255,255,255,${0.16 * (1 - Math.abs(u) * 0.6)})`);
                gloss.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = gloss;
                box(xL, xR, c0 + depth * 0.16, c0 + depth * 0.52);

                /* the fret, with a lit face and a dark one */
                const fw = Math.max(1, Math.min(3, w * 0.028));
                ctx.fillStyle = `rgba(0,0,0,0.72)`;
                box(xL - fw, xL, c0, c1);
                ctx.fillStyle = `${BRASS}${Math.round((0.55 - fast * 0.35) * 255).toString(16).padStart(2, '0')}`;
                box(xL, xL + fw, c0, c1);

                if (isWinner) {
                    const age = t - T_REVEAL;
                    const pulse = 0.5 + 0.5 * Math.exp(-age * 1.1);
                    const lift = acrossGrad(c0, c1);
                    lift.addColorStop(0, `rgba(255,255,255,${0.30 * pulse})`);
                    lift.addColorStop(0.5, `rgba(255,255,255,${0.10 * pulse})`);
                    lift.addColorStop(1, `rgba(255,255,255,${0.24 * pulse})`);
                    ctx.fillStyle = lift;
                    box(xL, xR, c0, c1);

                    ctx.strokeStyle = BRASS;
                    ctx.lineWidth = 2.5;
                    ctx.strokeRect(...(phone
                        ? [c0 + 1.25, xL + 1.25, depth - 2.5, w - 2.5]
                        : [xL + 1.25, c0 + 1.25, w - 2.5, depth - 2.5]));
                }

                /*
                 * The number, dropped while the ring is travelling. At speed it
                 * is a smear that costs a text layout per slot per frame and
                 * tells the player nothing; the colours are what carry the wheel
                 * while it is moving.
                 */
                const legible = (1 - fast) * clamp01((turn - 0.5) / 0.5);
                if (legible > 0.03 && w > 14) {
                    const fontPx = Math.round(Math.min(pitch, across) * 0.40 * Math.min(1, w / pitch + 0.35));
                    ctx.font = `800 ${fontPx}px 'Barlow', system-ui, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.globalAlpha = legible * (1 - Math.abs(u) * 0.45);
                    ctx.fillStyle = isWinner
                        ? '#FFFFFF'
                        : (pocket.colour === 'black' ? COLORS.neutralInk : 'rgba(255,255,255,0.94)');
                    ctx.fillText(pocket.n, ...at((xL + xR) / 2, across * 0.52));
                    ctx.globalAlpha = 1;
                }
            }

            /* ── the winner's light spills onto its neighbours ───────────── */
            if (winnerCentre != null && !motionOff) {
                const age = t - T_REVEAL;
                const pulse = 0.42 + 0.34 * Math.exp(-age * 1.1);
                const spill = alongGrad(winnerCentre - pitch * 2.2, winnerCentre + pitch * 2.2);
                spill.addColorStop(0, 'rgba(255,255,255,0)');
                spill.addColorStop(0.5, `rgba(255,255,255,${0.13 * pulse})`);
                spill.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = spill;
                box(winnerCentre - pitch * 2.2, winnerCentre + pitch * 2.2, 0, across);
            }

            /* ── streaks, while it is going too fast to read ─────────────── */
            if (fast > 0.02) {
                ctx.globalAlpha = fast * 0.5;
                for (let k = 0; k < 5; k++) {
                    const c = across * (0.14 + k * 0.18);
                    ctx.fillStyle = 'rgba(255,255,255,0.05)';
                    box(0, along, c, c + 1.2);
                }
                ctx.globalAlpha = 1;
            }

            /* ── the wheel's rails, top and bottom of the band ───────────── */
            const rail = alongGrad(0, along);
            rail.addColorStop(0, `${BRASS}00`);
            rail.addColorStop(0.5, `${BRASS}88`);
            rail.addColorStop(1, `${BRASS}00`);
            ctx.fillStyle = rail;
            box(0, along, 0, 1.5);
            box(0, along, across - 2, across);

            /* ── the ends fall off into the dark, the way the reel's do ────
             *
             * Into the ROOM's dark: the band's ends now meet a crimson floor,
             * and a blue-black fade against it left two cold bars at either end
             * of the wheel. */
            const vign = alongGrad(0, along);
            vign.addColorStop(0, 'rgba(11,2,6,0.95)');
            vign.addColorStop(0.17, 'rgba(11,2,6,0)');
            vign.addColorStop(0.83, 'rgba(11,2,6,0)');
            vign.addColorStop(1, 'rgba(11,2,6,0.95)');
            ctx.fillStyle = vign;
            box(0, along, 0, across);

            /* ── the indicator ───────────────────────────────────────────────
             *
             * A BRACKET around the whole pocket under the pointer, not a line
             * across it. A line has to be read against a pocket edge to answer
             * "which one?", and when the two are close the answer is a
             * judgement call — which is the failure this feature already
             * shipped once, for a different reason, and must not read as again.
             * A frame around the pocket cannot be misread: the selection is a
             * shape the size of the thing selected.
             *
             * It fades in as the ring slows (`1 - fast`), so at speed there is
             * only the pointer and the bracket arrives with the deceleration,
             * snapping slot to slot like a wheel ticking past a pin.
             */
            const bracket = motionOff ? 1 : (1 - fast);
            if (selectedEdges && bracket > 0.02) {
                const [sxL, sxR, sc0, sc1] = selectedEdges;
                ctx.save();
                ctx.globalAlpha = bracket;

                // The pocket's own two edges, lit.
                ctx.fillStyle = BRASS;
                box(sxL - 1.5, sxL + 1.5, sc0, sc1);
                box(sxR - 1.5, sxR + 1.5, sc0, sc1);

                // Corner claws, so the frame reads as a bracket rather than as
                // two more frets among twelve.
                const claw = Math.min(18, (sxR - sxL) * 0.28);
                ctx.fillStyle = '#FFFFFF';
                box(sxL - 1.5, sxL + claw, sc0, sc0 + 2.5);
                box(sxR - claw, sxR + 1.5, sc0, sc0 + 2.5);
                box(sxL - 1.5, sxL + claw, sc1 - 2.5, sc1);
                box(sxR - claw, sxR + 1.5, sc1 - 2.5, sc1);
                ctx.restore();
            }

            /*
             * The pointer. Deliberately small now — the bracket says which
             * pocket, so this only has to say where the pin is.
             */
            const tip = 8;
            ctx.fillStyle = BRASS;
            ctx.beginPath();
            if (phone) {
                ctx.moveTo(0, centre - tip); ctx.lineTo(0, centre + tip); ctx.lineTo(tip, centre);
                ctx.closePath(); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(across, centre - tip); ctx.lineTo(across, centre + tip); ctx.lineTo(across - tip, centre);
            } else {
                ctx.moveTo(centre - tip, 0); ctx.lineTo(centre + tip, 0); ctx.lineTo(centre, tip);
                ctx.closePath(); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(centre - tip, across); ctx.lineTo(centre + tip, across); ctx.lineTo(centre, across - tip);
            }
            ctx.closePath();
            ctx.fill();
        };

        if (motionOff) {
            const paint = () => draw(propsRef.current.clock ? propsRef.current.clock() : T_TURN);
            paint();
            const roStatic = new ResizeObserver(paint);
            roStatic.observe(wrap);
            const poll = setInterval(paint, 400);
            return () => { roStatic.disconnect(); ro.disconnect(); clearInterval(poll); };
        }

        const frame = () => {
            draw(Math.max(0, propsRef.current.clock ? propsRef.current.clock() : 0));
            raf = requestAnimationFrame(frame);
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
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 6,
                pointerEvents: 'none',
                height: isMobile ? '100%' : STRIP_HEIGHT,
            }}
        >
            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
    );
}

export default CanvasRouletteStrip;
