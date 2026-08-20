/*
 * FlapBoard — the split-flap primitives THE CONCOURSE is built out of.
 *
 * Every readable value on the collection board is a row of character cells that
 * resolve into place, the way a rail concourse board resolves when a departure
 * changes. That is the whole motion budget of the surface: one authored moment,
 * fired on open and again whenever a value genuinely changes, and nothing else
 * on the board moves at all.
 *
 * ── WHY THE TEXT IS ALWAYS CORRECT ───────────────────────────────────────────
 *
 * The stats module's "Motion Never Withholds" rule is the one worth importing
 * wholesale here: nothing is gated behind an animation. The accessible name is
 * the finished string, rendered into the DOM on the first paint and never
 * touched again; the cells that shuffle are `aria-hidden` decoration on top of
 * it. Under `prefers-reduced-motion` the shuffle does not run at all and the
 * cells render their final glyph immediately. A half-resolved board left frozen
 * by a backgrounded tab is therefore impossible: the worst case is a decorative
 * layer stuck mid-glyph over text that was already right.
 *
 * ── WHY ONE TIMER PER STRING AND NOT ONE PER CELL ────────────────────────────
 *
 * The board carries ~150 characters across its head and register. A timer per
 * cell is 150 timers for 600ms; a timer per string is a dozen, and every cell in
 * a string derives its own glyph from the shared frame counter, so the cascade
 * across a string costs one integer. The interval clears itself the frame after
 * the last cell settles — nothing here keeps ticking once the board is at rest.
 *
 * ── WHY THE MATERIAL LIVES IN CSS AND NOT IN A STYLE OBJECT ──────────────────
 *
 * `Plinth` used to emit its background, its shadow and its hover overlay's
 * `opacity: 0` as inline styles, while the hover and focus rules sat in
 * index.css as classes. An inline declaration beats any class selector, so
 * **every hover and every focus ring on this board silently did nothing** — the
 * close button, all six segmented options, the clear-filters control and every
 * register row. Both halves were individually correct, which is exactly why
 * nothing caught it: the CSS was valid, the JSX was valid, and only their
 * interaction was wrong. A design-system detector cannot see that, and neither
 * can a screenshot of a page nobody is hovering.
 *
 * So: anything with a state belongs in the stylesheet, and `style` carries
 * layout only — size, padding, alignment. A colour or a shadow appearing in a
 * `style` object here is a state nobody has thought about yet.
 */

import React, { useEffect, useRef, useState } from 'react';
import { DECK } from '../../config/constants';
import { prefersReducedMotion } from '../../../../pages/Stats/env.js';

/*
 * The flap drum's alphabet. A real board carries A–Z, 0–9 and a handful of
 * punctuation on one drum, which is why a split-flap can only ever shout in
 * caps — and why the board's type is uppercase everywhere rather than as a
 * stylistic preference. Anything outside this set (a slash, a percent sign, an
 * apostrophe in a player's name) is printed rather than shuffled: a drum that
 * does not carry a glyph cannot land on it.
 */
const DRUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DIGIT_DRUM = '0123456789';

const STEP_MS = 52;
const LEAD_FRAMES = 2;

/** The frame at which cell `i` stops shuffling. */
function settleFrame(i) {
    // Capped, so a long string still finishes inside the same beat as a short
    // one. A board that takes two seconds to resolve a player's name is a board
    // the reader has already stopped watching.
    return LEAD_FRAMES + Math.min(i, 12);
}

/**
 * One line of flap cells.
 *
 * `plate` gives each cell the drum's own face — a dark card split by a lit hinge
 * across its middle. It is deliberately opt-in and reserved for the figures that
 * are supposed to read as flaps (the head's counts, the register's numbers). At
 * label sizes the hinge is a 1px line every 8px, which is a texture rather than
 * a material, and the labels are set as plain tracked caps instead.
 */
export function FlapText({
    text = '',
    size = 13,
    tone = DECK.ink,
    weight = 700,
    track = '0.06em',
    plate = false,
    delay = 0,
    digits = false,
    title,
    style,
}) {
    const value = String(text);
    // Read once. A media query that changes mid-session re-renders the board
    // anyway, and re-reading it per frame is a layout query in a hot path.
    const [motionOff] = useState(prefersReducedMotion);
    const [frame, setFrame] = useState(-1);
    const timerRef = useRef(null);

    // Restarting the cascade when the value changes is a render-phase reset, not
    // an effect: React documents this as the way to adjust state from props, and
    // it keeps the interval below as the only thing that ever writes `frame`
    // asynchronously. Setting it from inside the effect instead is the cascading
    // render the lint rule is named after.
    const [shown, setShown] = useState(value);
    if (shown !== value) {
        setShown(value);
        setFrame(-1);
    }

    useEffect(() => {
        if (motionOff) return undefined;

        const last = settleFrame(value.length - 1);
        let f = -1;

        const start = window.setTimeout(() => {
            timerRef.current = window.setInterval(() => {
                f += 1;
                setFrame(f);
                if (f > last) {
                    window.clearInterval(timerRef.current);
                    timerRef.current = null;
                }
            }, STEP_MS);
        }, delay);

        return () => {
            window.clearTimeout(start);
            if (timerRef.current) window.clearInterval(timerRef.current);
        };
    }, [value, delay, motionOff]);

    const drum = digits ? DIGIT_DRUM : DRUM;
    const cellW = Math.round(size * (digits ? 0.60 : 0.62));
    const cellH = Math.round(size * 1.32);

    return (
        <span
            title={title}
            style={{
                display: 'inline-flex',
                alignItems: 'stretch',
                gap: plate ? '2px' : '0px',
                fontFamily: "'Barlow Condensed', system-ui, sans-serif",
                fontWeight: weight,
                letterSpacing: plate ? 0 : track,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                ...style,
            }}
        >
            <span className="fib-sr-only">{value}</span>
            {value.split('').map((ch, i) => {
                const upper = ch.toUpperCase();
                const settled = motionOff || frame >= settleFrame(i);
                const onDrum = drum.includes(upper);
                // A glyph the drum does not carry never shuffles — it is printed
                // straight, which is also what a real board does with its fixed
                // separators.
                const glyph = settled || !onDrum
                    ? upper
                    : drum[Math.abs(frame * 7 + i * 13) % drum.length];
                const blank = upper === ' ';

                return (
                    <span
                        key={`${i}-${upper}`}
                        aria-hidden="true"
                        // The drum's face — two tones meeting at a lit hinge, the
                        // same material logic as the deck's own seams — is a class
                        // rather than an inline gradient, so the whole board has
                        // exactly one place where a plate's material is decided.
                        className={plate && !blank ? 'fib-flap-cell' : undefined}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: plate ? `${cellW}px` : undefined,
                            height: plate ? `${cellH}px` : undefined,
                            minWidth: plate ? undefined : (blank ? `${cellW * 0.5}px` : undefined),
                            fontSize: `${size}px`,
                            color: tone,
                            // Mid-shuffle the cell is physically between two
                            // flaps, so it loses a little of its edge. Cheap, and
                            // it is what sells the movement as mechanical rather
                            // than as a fade.
                            opacity: settled || !onDrum ? 1 : 0.72,
                            transition: 'opacity 60ms linear',
                        }}
                    >
                        {blank ? ' ' : glyph}
                    </span>
                );
            })}
        </span>
    );
}

/**
 * A board label: tracked caps, no drum, no motion. The column headings and the
 * words that never change.
 *
 * 10px is the floor, and it is the badge case DESIGN.md permits — uppercase,
 * bold, tracked. The board was set at 9px throughout, which is under the
 * documented floor and, worse, was also the size of the STATUS *value*, so the
 * register's most decision-bearing word was set identically to the column
 * heading above it.
 */
export function BoardLabel({ children, size = 10, tone = DECK.inkDim, weight = 700, style }) {
    return (
        <span style={{
            fontFamily: "'Barlow Condensed', system-ui, sans-serif",
            fontSize: `${size}px`,
            fontWeight: weight,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: tone,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            ...style,
        }}>{children}</span>
    );
}

/**
 * The row lamp.
 *
 * A concourse board lights a lamp beside a row that needs the reader's eye, and
 * that is exactly what a tier owes here. Square rather than round: everything on
 * this board is ruled, and a dot would be the one circle on the surface.
 *
 * ── WHY DUE IS A DIFFERENT SHAPE AND NOT JUST A DIFFERENT COLOUR ─────────────
 *
 * The first build lit `due` in station amber on the claim — written into this
 * very comment — that amber belongs to no tier and so could never be mistaken
 * for a rarity. The claim was false as built. Station amber is #FFAA00 and
 * legendary is #FFD700: two hundredths apart, and at 8px with a bloom behind
 * them the two lamps were the same yellow square. The tier hues are the
 * plugin's and cannot move, so the signal has to differ in *form* — a due lamp
 * is a split lamp, two bars with a dark gap between them, which reads as a
 * different object at any size and survives greyscale and colour blindness
 * both. Colour alone was never carrying this.
 */
export function RowLamp({ state, tone }) {
    if (state === 'due') {
        return (
            <span aria-hidden="true" className="fib-lamp fib-lamp--due">
                <span /><span />
            </span>
        );
    }

    return (
        <span
            aria-hidden="true"
            className="fib-lamp"
            style={state === 'lit'
                ? { background: tone, boxShadow: `0 0 9px ${tone}, inset 0 1px 0 rgba(255,255,255,0.45)` }
                : undefined}
        />
    );
}

/**
 * The register's fill meter.
 *
 * A ruled track with a flush fill and a lit top edge, so the filled part reads
 * as a lit segment of the deck rather than as a progress pill. No radius and no
 * end cap: the board has no rounded shapes anywhere.
 *
 * `spent` recedes the bar once its row has nothing left to say. Five saturated
 * full-width rules were the loudest thing in the register and the least
 * informative in it — on a completed tier, HELD, MISSING and STATUS have all
 * already stated the ratio in words and figures, and the bar restates it in the
 * largest coloured area on the board. The meter should be loudest where the
 * ratio is still in play.
 */
export function BoardMeter({ value = 0, tone, height = 4, spent = false }) {
    const fill = Math.max(0, Math.min(1, value));

    return (
        <span style={{
            display: 'block',
            position: 'relative',
            width: '100%',
            height: `${height}px`,
            background: 'rgba(0,0,0,0.45)',
            boxShadow: 'inset 0 1px 0 rgba(206,214,236,0.07)',
            overflow: 'hidden',
        }}>
            {/*
             * The start tick: a real 2px mark at the head of the track, so a tier
             * you have not started shows something rather than an empty rail —
             * an empty rail reads as "no data" where the truth is "none yet".
             *
             * It is a fixed length and not a floor on the scale factor. The first
             * version clamped `scaleX` to 0.005, which on this 70–90px column is
             * about four tenths of a pixel: it survived in a screenshot only
             * because antialiasing happened to smear it into something visible,
             * and it would have vanished at a narrower column or another DPR. A
             * minimum length has to be expressed as a length.
             */}
            <span style={{
                position: 'absolute',
                left: 0, top: 0, bottom: 0, width: '2px',
                background: tone,
                opacity: spent ? 0.32 : 0.8,
            }} />
            {/*
             * scaleX, not width. The bar is full width and scaled down, so the
             * fill animates on the compositor instead of relaying out its parent
             * on every frame — and because the transform is on one axis only,
             * the 1px lit top edge keeps its thickness rather than being squashed
             * with it.
             */}
            <span style={{
                position: 'absolute',
                inset: 0,
                background: tone,
                opacity: spent ? 0.32 : 0.8,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
                transformOrigin: 'left center',
                transform: `scaleX(${fill})`,
                transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease-out',
            }} />
        </span>
    );
}

/**
 * A plinth: a square section of the deck's own material.
 *
 * The wheel's stage flanks, milestone meter and status console are all this
 * shape, and the board's controls join them rather than inventing a card.
 *
 * Every visual property is a class (`.fib-plinth` in index.css) because every
 * one of them has a state; `style` carries layout only. See the header note for
 * what happened when it was the other way round.
 */
export function Plinth({ children, live, onClick, title, style, className = '', as = 'div', ...rest }) {
    const Tag = as;
    const interactive = typeof onClick === 'function';

    return (
        <Tag
            onClick={onClick}
            title={title}
            className={[
                'fib-plinth',
                live ? 'is-live' : '',
                interactive ? 'fib-board-hit' : '',
                className,
            ].filter(Boolean).join(' ')}
            style={style}
            {...rest}
        >
            {/*
             * Hovering a plinth is light rising through it, never a repaint —
             * the rule the stage flanks established. A sibling overlay rather
             * than a background swap, so the lift composites over the grain
             * instead of replacing it.
             */}
            <span aria-hidden="true" className="fib-plinth-lift" />
            {children}
        </Tag>
    );
}
