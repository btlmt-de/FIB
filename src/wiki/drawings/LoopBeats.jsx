import React from 'react';
import { BEATS } from '../tokens.js';

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
