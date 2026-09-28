import React from 'react';

/*
 * The handful of MiniMessage the plugin's own strings use, drawn as the game draws
 * them: the sixteen named colours, bold and italic. Used wherever the wiki prints a
 * line the plugin wrote (the /settings menu's tooltips, the result stage's texts), so
 * the colours are the plugin's own rather than copied by hand.
 *
 * lift: on a near-black panel the game's dark gray (#555555) is barely readable, so it
 * is lifted to #8A8A8A there, the way the wheel lifts a rarity's ink for text.
 */

const MC = {
    black: '#000000', dark_blue: '#0000AA', dark_green: '#00AA00', dark_aqua: '#00AAAA',
    dark_red: '#AA0000', dark_purple: '#AA00AA', gold: '#FFAA00', gray: '#AAAAAA',
    dark_gray: '#555555', blue: '#5555FF', green: '#55FF55', aqua: '#55FFFF',
    red: '#FF5555', light_purple: '#FF55FF', yellow: '#FFFF55', white: '#FFFFFF',
};
const LIFTED = { ...MC, dark_gray: '#8A8A8A' };

export default function Mini({ text, base = '#FFFFFF', lift = true, className = 'mini-line' }) {
    const palette = lift ? LIFTED : MC;
    const out = [];
    let color = base;
    let italic = false;
    let bold = false;
    let last = 0;
    const push = (s) => { if (s) out.push({ s, color, italic, bold }); };
    for (const m of text.matchAll(/<(\/?)([a-z_]+)>/g)) {
        push(text.slice(last, m.index));
        last = m.index + m[0].length;
        const [, close, tag] = m;
        if (tag === 'i' || tag === 'italic') italic = !close;
        else if (tag === 'b' || tag === 'bold') bold = !close;
        else if (tag === 'reset') { color = base; italic = false; bold = false; }
        else if (palette[tag]) color = close ? base : palette[tag];
    }
    push(text.slice(last));
    if (!out.length) return <span className={className}>&nbsp;</span>;
    return (
        <span className={className}>
            {out.map((p, i) => <span key={i} style={{ color: p.color, fontStyle: p.italic ? 'italic' : 'normal', fontWeight: p.bold ? 700 : 'inherit' }}>{p.s}</span>)}
        </span>
    );
}
