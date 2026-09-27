import React from 'react';
import { parseMc } from './mcFormat.js';

/* Descriptions rendered as the game's chat prints them. The parsing is mcFormat.js. */

/** One description line as chat prints it. An empty line keeps its height. */
export function McLine({ text }) {
    const parts = parseMc(text || '');
    if (!parts.length) return <span className="ip-mc-line">&nbsp;</span>;
    return (
        <span className="ip-mc-line">
            {parts.map((p, i) => (
                <span key={i} style={{
                    color: p.color,
                    fontWeight: p.bold ? 700 : 400,
                    fontStyle: p.italic ? 'italic' : 'normal',
                    textDecoration: [p.underline && 'underline', p.strike && 'line-through'].filter(Boolean).join(' ') || 'none',
                }}>{p.text}</span>
            ))}
        </span>
    );
}

/** A whole description as the /info chat block. */
export function McChat({ lines, className = '' }) {
    return (
        <div className={`ip-chat ${className}`}>
            {lines.map((l, i) => <McLine key={i} text={l} />)}
        </div>
    );
}
