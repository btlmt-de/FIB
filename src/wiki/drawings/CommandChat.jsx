import React, { useEffect, useState } from 'react';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import { useCalm } from '../../config/power.js';
import { McLine } from '../../pages/ItemPools/McText.jsx';
import Mini from '../game/Mini.jsx';
import { INFO } from '../data/info.data.js';
import { spriteFallback, spriteOf } from '../game/sprite.js';

/*
 * A command as it happens in the game: typed into the chat bar, sent, and answered.
 * The answer is the plugin's own, line for line (commands.data.js has them, and says
 * where each came from); /info's is the item's own description from config.yml. An
 * item icon in a line is drawn the way the resource pack's font draws one in chat.
 *
 * It types at a steady hand and answers a beat later, then waits to be replayed.
 * Under reduced motion or saver mode it opens already answered.
 */

const TYPE_MS = 34;
const SEND_MS = 260;
const LINE_MS = 45;

/** One chat line: MiniMessage, with {item:MATERIAL} icons set in the text. */
function Line({ text }) {
    const parts = text.split(/\{item:([A-Z0-9_]+)\}/);
    if (parts.length === 1) return <Mini text={text} className="cm-chat-line" />;
    return (
        <span className="cm-chat-line">
            {parts.map((p, i) => (i % 2
                ? <img key={i} className="cm-chat-icon" src={spriteOf(p)} data-material={p} onError={spriteFallback} alt="" width="128" height="128" />
                : <Mini key={i} text={p} className="cm-chat-seg" />))}
        </span>
    );
}

export default function CommandChat({ example, says, heard, then }) {
    const calm = useCalm();
    const [run, setRun] = useState(0);
    const [step, setStep] = useState({ typed: 0, lines: 0 });
    const material = says === 'info' ? example.split(' ')[1]?.toUpperCase() : null;
    const lines = material ? INFO[material] ?? [] : says;

    useEffect(() => {
        if (calm) return undefined;
        const timers = [];
        const at = (ms, fn) => timers.push(setTimeout(fn, ms));
        at(0, () => setStep({ typed: 0, lines: 0 }));
        for (let i = 1; i <= example.length; i++) at(120 + i * TYPE_MS, () => setStep({ typed: i, lines: 0 }));
        const sent = 120 + example.length * TYPE_MS + SEND_MS;
        for (let n = 1; n <= lines.length; n++) at(sent + n * LINE_MS, () => setStep({ typed: -1, lines: n }));
        return () => timers.forEach(clearTimeout);
    }, [calm, run, example, lines.length]);

    const view = calm ? { typed: -1, lines: lines.length } : step;
    const typing = view.typed >= 0;

    return (
        <figure className="cm-chat" aria-label={`In chat: ${example}`}>
            <div className="cm-chat-log" aria-live="polite">
                {lines.slice(0, view.lines).map((l, i) => (material
                    ? <span key={i} className="cm-chat-line"><McLine text={l} /></span>
                    : <Line key={i} text={l} />))}
            </div>
            <div className="cm-chat-bar" aria-hidden="true">
                <span className="cm-chat-typed">{typing ? example.slice(0, view.typed) : ''}</span>
                <span className="cm-chat-caret" data-on={typing || undefined}>_</span>
            </div>
            <figcaption className="cm-chat-foot">
                <span className="wk-small">
                    {[heard === 'everyone' && 'Everyone on the server sees this.', then].filter(Boolean).join(' ')}
                </span>
                {!calm && (
                    <button type="button" className="cm-chat-again" onClick={() => setRun((n) => n + 1)}>
                        <RotateCcw size={14} aria-hidden="true" /> Again
                    </button>
                )}
            </figcaption>
        </figure>
    );
}
