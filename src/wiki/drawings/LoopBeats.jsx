import React from 'react';
import { BEATS } from '../tokens.js';

/*
 * The round's loop as one line: Draw, Think, Route, Obtain, Score, Next, joined by
 * tracks, with a dashed return from Next back to Draw because Next IS the next Draw.
 * Home's loop strip lights the current beat; Gameplay draws it still.
 *
 * *It was six words in a row with 6px dashes between them* (home only), which read as
 * six labels rather than one motion through a round (owner, final pass, Sept 2026).
 * The tracks stretch to the strip's width and the return closes the circuit, so the
 * words are stations on one line. Still Atkinson at 14px/600: they are labels of the
 * interface, not the game's own names (DESIGN.md, the second tightening).
 */

export default function LoopBeats({ current = -1, className = '' }) {
    return (
        <ol className={`wk-beats ${className}`} aria-label="The loop, repeated until the round ends">
            {BEATS.map((b, i) => (
                <li key={b} className="wk-beat" aria-current={i === current ? 'step' : undefined}>
                    <span className="wk-beat-word">{b}</span>
                    {i < BEATS.length - 1 && <span className="wk-beat-to" aria-hidden="true" />}
                </li>
            ))}
            <li className="wk-beats-back" aria-hidden="true" />
        </ol>
    );
}
