/*
 * ═══════════════════════════════════════════════════════════════════════════
 * THE CONVERGENCE — the prestige moment
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A whole collection is spent to buy one rank, and the animation is the spending.
 * Every item you own is pulled off the board and compressed into a single core
 * that turns faster the more of them arrive; when the last one lands the core
 * detonates and the level is what is left standing.
 *
 * ── WHY THIS EARNS THE BUDGET ────────────────────────────────────────────────
 *
 * DESIGN.md is emphatic that glow and spectacle are rationed on this site and
 * that the wheel is where the reward budget gets spent. This is the rarest
 * moment the product has — a full collection, up to five times in a lifetime,
 * currently reachable by exactly one player — so it is the one place where
 * spending the whole budget at once is correct. The board's own restraint is
 * what makes this legible as an exception rather than as the house style.
 *
 * ── THE BEATS ────────────────────────────────────────────────────────────────
 *
 *   LEAD-IN  0.00–0.45   the board darkens, the core seeds, nothing moves yet
 *   GATHER   0.45–3.60   items stream inward from everywhere, accelerating;
 *                        a counter races the arrivals up to the real total
 *   INHALE   3.95–4.30   the core pulls IN and the frame shakes — the beat that
 *                        makes the detonation land instead of merely happen
 *   BOOM     4.30–5.15   shockwaves in the level's colour cross the whole board
 *   PROCLAIM 4.50–8.60   the level resolves on the flap drums, colour everywhere,
 *                        embers still drifting through it
 *
 * ── THE RULES IT STILL KEEPS ─────────────────────────────────────────────────
 *
 * The tier hues are the ladder's, imported and never spelled here. Level 5 is
 * painted with the whole slick through `createHoloGradient` and sampled only
 * where canvas physically cannot take a gradient (`shadowColor`), which is the
 * Whole-Gradient Rule that DESIGN.md §8 has now been broken by twice.
 *
 * `prefers-reduced-motion` does not get a lesser version of the announcement: it
 * skips the physics and holds the proclamation, because the thing being
 * communicated is "you reached Rare Prestige", and that must never be gated
 * behind motion someone has asked not to see.
 *
 * ── IT IS NOT SKIPPABLE, AND THAT IS DELIBERATE ─────────────────────────────
 *
 * The first build made it skippable by click, Escape, Enter or Space, on the
 * argument that an eight-second animation you cannot dismiss is one you resent
 * the second time. The owner overruled it, and the argument was weak on its own
 * terms: "the second time" is a real problem for something a player meets daily
 * and almost no problem at all for something they meet at most five times in a
 * lifetime. A ceremony you can wave away is not a ceremony.
 *
 * Unskippable has to mean it, so the board's own exits are held shut for the
 * duration too — Escape and the backdrop both close the collection book, and
 * either would have been a skip button wearing a different name. That is done in
 * CollectionBook, where those handlers live.
 *
 * The one door that stays open is `prefers-reduced-motion`, and it is not an
 * escape hatch bolted on: it is the same contract as everywhere else on this
 * site. Someone who has asked their system not to show them motion gets the
 * announcement without the physics, held for 3.4 seconds. Nobody is trapped in
 * something they told us they cannot watch.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { getRarityColor, sampleHolo, createHoloGradient, isIridescentRarity } from '../../../../utils/rarityHelpers.jsx';
import { prestigeKey, prestigeLabel, prestigeName } from '../../../../utils/prestigeHelpers.js';
import { getItemImageUrl } from '../../../../utils/helpers.js';
import { getAtlasSprite, drawItemSprite } from '../../canvas/atlas.js';
import { FlapText, BoardLabel } from './FlapBoard.jsx';
import { DECK } from '../../config/constants';
import { prefersReducedMotion } from '../../../../pages/Stats/env.js';

/*
 * The timeline, in seconds.
 *
 * It ran 4.4s first and the owner was right that it rushed: this is a moment a
 * player reaches at most five times in a lifetime and currently only one player
 * on the server can reach at all, so it should be allowed to take its time. The
 * extra four seconds are NOT the same animation played slower — each beat got
 * the thing it was missing:
 *
 *   LEAD_IN     the board darkens and the core seeds before anything moves, so
 *               the gather arrives into a held breath rather than starting cold
 *   GATHER      twice as long, so the stream reads as a collection emptying
 *               rather than as a burst
 *   INHALE      the core pulls IN and the frame shakes before it goes off; the
 *               anticipation is what makes the detonation land
 *   PROCLAIM    more than three seconds, because a rank you spent 1,559 items on
 *               should be allowed to sit there
 */
const LEAD_IN = 0.45;
const GATHER_END = 3.60;
const INHALE_AT = 3.95;
const CHARGE_END = 4.30;
const BOOM_AT = 4.30;
const PROCLAIM_AT = 4.50;
const TOTAL = 8.60;

/*
 * How many sprites actually fly.
 *
 * Not 1,559. The atlas caches each cell as its own small canvas (the fix that
 * took the collection grid from 25.5ms a frame to 2.5), but the LRU is capped at
 * 512 and a thousand shadowed draws a frame is a budget no cache saves. 220 is
 * chosen so that every held special flies — those are the ones a player will
 * look for — and the rest is a sample of the commons, which read as volume
 * rather than as individuals.
 *
 * The COUNTER still races to the real total. What the reader is told is true;
 * what is drawn is a representative crowd.
 */
const MAX_MOVERS = 220;

/*
 * Colour with an alpha, without string-appending one to a hex.
 *
 * The first build wrote `${tone}${Math.round(150 * fill).toString(16)}` and it
 * threw on the opening frame with '#FF5555-1': a rAF callback's timestamp is the
 * frame's start, which can PRECEDE the performance.now() captured just before
 * requestAnimationFrame was called, so elapsed time is briefly negative and every
 * value derived from it goes with it. The exception killed the loop silently —
 * an uncaught throw inside a rAF callback stops the chain and logs once — so the
 * phase timers still advanced and the animation appeared to skip straight to its
 * final frame with a blank canvas.
 *
 * Both halves are fixed: elapsed time is clamped at the source, and alphas no
 * longer travel as hex digits, which is what made an out-of-range number a parse
 * error instead of a clamp.
 */
function withAlpha(hex, a) {
    const alpha = Math.max(0, Math.min(1, a));
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function easeInCubic(t) { return t * t * t; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

export function PrestigeAscension({ level, items, collection, onDone }) {
    const canvasRef = useRef(null);
    const wrapRef = useRef(null);
    const rafRef = useRef(null);
    const [phase, setPhase] = useState(() => (prefersReducedMotion() ? 'proclaim' : 'gather'));
    const [landed, setLanded] = useState(0);
    const doneRef = useRef(false);

    const key = prestigeKey(level);
    const tone = getRarityColor(key);
    const iridescent = isIridescentRarity(key);

    // Every held item, rarest first — the specials are what a player scans for,
    // so they are guaranteed a seat before the commons are sampled.
    const flyers = useMemo(() => {
        const held = items.filter(i => (collection[i.texture] || 0) > 0);
        const specials = held.filter(i => i.type && i.type !== 'common');
        const commons = held.filter(i => !i.type || i.type === 'common');
        const room = Math.max(0, MAX_MOVERS - specials.length);
        const step = commons.length > room ? commons.length / room : 1;
        const sampled = [];
        for (let i = 0; i < commons.length && sampled.length < room; i += step) {
            sampled.push(commons[Math.floor(i)]);
        }
        return [...specials, ...sampled];
    }, [items, collection]);

    const totalHeld = useMemo(
        () => items.filter(i => (collection[i.texture] || 0) > 0).length,
        [items, collection],
    );

    const finish = () => {
        if (doneRef.current) return;
        doneRef.current = true;
        onDone?.();
    };

    /*
     * Nothing here dismisses it.
     *
     * The keys that would have skipped are swallowed rather than ignored: with
     * the overlay up, Escape still reaches CollectionBook's own handler and
     * closes the whole board, which is the same thing as skipping. Capturing
     * them here and stopping propagation is what makes "unskippable" true rather
     * than merely unadvertised.
     */
    useEffect(() => {
        const swallow = e => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        window.addEventListener('keydown', swallow, true);
        return () => window.removeEventListener('keydown', swallow, true);
    }, []);

    // Reduced motion: no physics, the announcement holds and then leaves.
    useEffect(() => {
        if (!prefersReducedMotion()) return undefined;
        const t = window.setTimeout(finish, 3400);
        return () => window.clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalHeld]);

    useEffect(() => {
        if (prefersReducedMotion()) return undefined;
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        if (!canvas || !wrap) return undefined;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        let W = 0, H = 0, cx = 0, cy = 0;
        // The start ring, recomputed on resize. Movers hold their radius as a
        // FRACTION of it rather than a pixel length, so a resize moves the whole
        // swarm with the canvas instead of leaving it sized for a box that no
        // longer exists — the same "constant that outlived its geometry" shape
        // DESIGN.md SS8 tables five instances of.
        let R = 0;
        let movers = [];

        const size = () => {
            const r = wrap.getBoundingClientRect();
            W = r.width; H = r.height;
            cx = W / 2; cy = H / 2;
            canvas.width = Math.max(1, Math.round(W * dpr));
            canvas.height = Math.max(1, Math.round(H * dpr));
            canvas.style.width = `${W}px`;
            canvas.style.height = `${H}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // The start ring is deliberately wider than the board, so items
            // arrive from off the edges too — the collection is bigger than the
            // window showing it.
            R = Math.hypot(W, H) * 0.62;
            // Every previous position is in the old canvas's coordinates. Left
            // in place they would each draw one streak from wherever they used to
            // be to wherever they are now, straight across the new canvas.
            for (const m of movers) m.prev = null;
        };
        size();

        movers = flyers.map((item, i) => {
            const a = (i / flyers.length) * Math.PI * 2 + Math.random() * 0.6;
            return {
                item,
                a0: a,
                rFrac: 0.34 + Math.random() * 0.66,
                // Staggered so they arrive as a stream, not a wall, and the last
                // ones land exactly as the gather ends. Offset past the lead-in
                // so nothing moves during the held breath.
                delay: LEAD_IN + (i / flyers.length) * ((GATHER_END - LEAD_IN) * 0.78) + Math.random() * 0.12,
                spin: (Math.random() - 0.5) * 4,
                size: 22 + Math.random() * 16,
                prev: null,
            };
        });

        // The sprites are drawn from the shared atlas, so they must be resident
        // before the first frame or the opening beat is a shower of blanks.
        const warm = new Map();
        for (const m of movers) {
            if (getAtlasSprite(m.item)) continue;
            const src = getItemImageUrl(m.item);
            if (warm.has(src)) continue;
            const img = new Image();
            img.src = src;
            warm.set(src, img);
        }

        // The detonation's debris. Seeded once, drawn only after the boom, and
        // deliberately slow: they are what keeps the level's colour moving in the
        // room while the announcement holds, so the last three seconds are not a
        // static card.
        const embers = Array.from({ length: 54 }, () => ({
            a: Math.random() * Math.PI * 2,
            v: 90 + Math.random() * 340,
            r: 1 + Math.random() * 2.6,
            life: 1.4 + Math.random() * 2.2,
            drift: (Math.random() - 0.5) * 0.5,
        }));

        const start = performance.now();
        let arrived = 0;

        const strokeTone = t => (iridescent ? sampleHolo(t) : null);

        const render = now => {
            const el = Math.max(0, (now - start) / 1000);
            if (el >= TOTAL) { finish(); return; }

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const holo = strokeTone((el % 2.4) / 2.4);
            const flat = iridescent && holo ? `rgb(${holo.r}, ${holo.g}, ${holo.b})` : tone;

            // ── the field ───────────────────────────────────────────────────
            // The board darkens as the collection leaves it.
            const dim = Math.min(1, el / (LEAD_IN * 1.6)) * 0.72;
            ctx.fillStyle = `rgba(3,5,10,${dim})`;
            ctx.fillRect(0, 0, W, H);

            // ── GATHER ──────────────────────────────────────────────────────
            let nowArrived = 0;
            if (el < CHARGE_END) {
                ctx.save();
                for (const m of movers) {
                    const t = (el - m.delay) / (GATHER_END - m.delay);
                    if (t <= 0) continue;
                    if (t >= 1) { nowArrived++; continue; }

                    // Accelerating inward, and rotating as it goes, so the crowd
                    // reads as a vortex rather than as lines meeting at a point.
                    const k = easeInCubic(t);
                    const rad = m.rFrac * R * (1 - k);
                    const ang = m.a0 + k * 2.4 * m.spin;
                    const x = cx + Math.cos(ang) * rad;
                    const y = cy + Math.sin(ang) * rad;
                    const s = m.size * (1 - k * 0.55);

                    // The streak is the speed. Cheap, and it does more for the
                    // sense of acceleration than any easing curve.
                    if (m.prev) {
                        ctx.strokeStyle = `rgba(${holo ? `${holo.r},${holo.g},${holo.b}` : '255,255,255'},${0.05 + k * 0.30})`;
                        ctx.lineWidth = Math.max(1, s * 0.16);
                        ctx.beginPath();
                        ctx.moveTo(m.prev.x, m.prev.y);
                        ctx.lineTo(x, y);
                        ctx.stroke();
                    }
                    m.prev = { x, y };

                    ctx.globalAlpha = Math.min(1, 0.25 + t * 1.4);
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    drawItemSprite(ctx, m.item, warm.get(getItemImageUrl(m.item)), x - s / 2, y - s / 2, s);
                    ctx.globalAlpha = 1;
                }
                ctx.restore();
            } else {
                nowArrived = movers.length;
            }

            if (nowArrived !== arrived) {
                arrived = nowArrived;
                // The counter tells the truth about the collection, not about the
                // sample that is flying.
                setLanded(Math.round((arrived / movers.length) * totalHeld));
            }

            // ── the core ────────────────────────────────────────────────────
            const fill = Math.min(1, el / CHARGE_END);
            if (el < BOOM_AT + 0.5) {
                // The pulse quickens and deepens as it fills — the core is
                // straining against what is being packed into it.
                const pulse = 1 + Math.sin(el * (18 + 22 * fill)) * (0.04 + 0.05 * fill);
                let coreR = (10 + 78 * easeInCubic(fill)) * pulse;

                // THE INHALE. For the last third of a second the core pulls in
                // rather than growing, and the whole frame shakes with it. This
                // is the beat the first build did not have, and it is most of
                // why the detonation now lands instead of merely happening.
                let shake = 0;
                if (el >= INHALE_AT && el < BOOM_AT) {
                    const q = (el - INHALE_AT) / (BOOM_AT - INHALE_AT);
                    coreR *= 1 - 0.42 * easeInCubic(q);
                    shake = q * q * 5;
                }
                if (shake > 0) {
                    ctx.save();
                    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
                }

                const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.4);
                g.addColorStop(0, `rgba(255,255,255,${0.55 + 0.45 * fill})`);
                g.addColorStop(0.22, iridescent && holo
                    ? `rgba(${holo.r},${holo.g},${holo.b},${Math.max(0, 0.55 * fill)})`
                    : withAlpha(tone, 0.6 * fill));
                g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.fillRect(cx - coreR * 2.4, cy - coreR * 2.4, coreR * 4.8, coreR * 4.8);

                // The ring that holds it together, tightening as it charges.
                ctx.strokeStyle = iridescent
                    ? createHoloGradient(ctx, cx - coreR, coreR * 2, (el % 2.4) / 2.4)
                    : flat;
                ctx.lineWidth = 2 + 3 * fill;
                ctx.globalAlpha = 0.35 + 0.65 * fill;
                ctx.beginPath();
                ctx.arc(cx, cy, coreR * 0.62, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
                if (shake > 0) ctx.restore();
            }

            // ── BOOM ────────────────────────────────────────────────────────
            if (el >= BOOM_AT) {
                const bt = (el - BOOM_AT) / 0.85;
                if (bt < 1) {
                    // Three shockwaves, offset, each crossing the whole board.
                    for (let i = 0; i < 3; i++) {
                        const t = Math.max(0, bt - i * 0.10);
                        if (t <= 0 || t >= 1) continue;
                        const rr = easeOutCubic(t) * Math.hypot(W, H) * 0.78;
                        ctx.strokeStyle = iridescent
                            ? createHoloGradient(ctx, cx - rr, rr * 2, (el % 2.4) / 2.4)
                            : flat;
                        ctx.globalAlpha = (1 - t) * (0.8 - i * 0.2);
                        ctx.lineWidth = (1 - t) * (14 - i * 4) + 1;
                        ctx.beginPath();
                        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    ctx.globalAlpha = 1;

                    // The flash, one frame's worth, falling off fast.
                    if (bt < 0.35) {
                        ctx.fillStyle = `rgba(255,255,255,${(0.35 - bt) * 1.6})`;
                        ctx.fillRect(0, 0, W, H);
                    }
                }

                // The colour stays in the room afterwards — "the colors all
                // around" — as a vignette in the level's own hue rather than a
                // full wash, so the proclamation stays the brightest thing.
                const after = Math.min(1, (el - BOOM_AT) / 0.6);
                const v = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.18, cx, cy, Math.hypot(W, H) * 0.62);
                v.addColorStop(0, 'rgba(0,0,0,0)');
                v.addColorStop(1, iridescent && holo
                    ? `rgba(${holo.r},${holo.g},${holo.b},${Math.max(0, 0.32 * after)})`
                    : withAlpha(tone, 0.32 * after));
                ctx.fillStyle = v;
                ctx.fillRect(0, 0, W, H);

                // The embers.
                const age = el - BOOM_AT;
                for (const e of embers) {
                    const t = age / e.life;
                    if (t >= 1) continue;
                    const d = e.v * age * (1 - t * 0.55);
                    const x = cx + Math.cos(e.a + e.drift * age) * d;
                    const y = cy + Math.sin(e.a + e.drift * age) * d + age * age * 26;
                    ctx.globalAlpha = (1 - t) * 0.9;
                    ctx.fillStyle = iridescent && holo
                        ? `rgb(${holo.r}, ${holo.g}, ${holo.b})`
                        : tone;
                    ctx.beginPath();
                    ctx.arc(x, y, e.r * (1 - t * 0.5), 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }

            rafRef.current = requestAnimationFrame(render);
        };

        rafRef.current = requestAnimationFrame(render);

        const phaseTimers = [
            window.setTimeout(() => setPhase('charge'), GATHER_END * 1000),
            window.setTimeout(() => setPhase('proclaim'), PROCLAIM_AT * 1000),
        ];
        window.addEventListener('resize', size);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            phaseTimers.forEach(window.clearTimeout);
            window.removeEventListener('resize', size);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flyers, totalHeld, tone, iridescent]);

    const proclaiming = phase === 'proclaim';

    return (
        <div
            ref={wrapRef}
            // Swallows the click rather than passing it through: the board behind
            // is live, and a stray click on a register row mid-ceremony would
            // both filter a collection nobody is looking at and break the moment.
            onClick={e => { e.stopPropagation(); }}
            role="status"
            aria-live="assertive"
            aria-label={`${prestigeLabel(level)} reached`}
            style={{
                position: 'absolute', inset: 0, zIndex: 20,
                overflow: 'hidden', cursor: 'default',
                // A takeover of the board, not of the page: the scrim ladder's
                // deepest step, and the board's own edges still frame it.
                background: 'rgba(0,0,0,0.45)',
            }}
        >
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

            {/* The count, racing the arrivals. It leaves when the core does. */}
            {!proclaiming && (
                <div style={{
                    position: 'absolute', left: 0, right: 0, top: '50%',
                    transform: 'translateY(calc(-50% + 96px))',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                    pointerEvents: 'none',
                }}>
                    <FlapText text={landed.toLocaleString('en-US')} digits size={26} tone={DECK.ink} plate />
                    <BoardLabel tone={DECK.inkMid}>Items committed</BoardLabel>
                </div>
            )}

            {/* The proclamation. Drums, because this is still the board talking. */}
            {proclaiming && (
                <div
                    className={[
                        'fib-prestige-proclaim',
                        isIridescentRarity(prestigeKey(level)) ? 'fib-holo-text' : '',
                    ].filter(Boolean).join(' ')}
                    style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: '10px',
                        pointerEvents: 'none',
                    }}
                >
                    <BoardLabel size={13} tone={DECK.ink} style={{ letterSpacing: '0.4em' }}>
                        Prestige
                    </BoardLabel>
                    <FlapText
                        text={prestigeName(level) || ''}
                        size={72}
                        weight={800}
                        plate
                        tone={iridescent ? '#F2ECFF' : tone}
                    />
                    <div style={{ marginTop: '6px' }}>
                        <BoardLabel tone={DECK.inkMid}>
                            {totalHeld.toLocaleString('en-US')} items · a new collection begins
                        </BoardLabel>
                    </div>
                </div>
            )}

        </div>
    );
}

export default PrestigeAscension;
