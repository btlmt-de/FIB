import React, { useMemo, useRef, useState } from 'react';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import Plus from 'lucide-react/dist/esm/icons/plus';
import X from 'lucide-react/dist/esm/icons/x';
import { COLOR_NAMES, FIELDS, FORMAT_CODES, MC_COLORS, headerFor, stripMc } from './mcFormat.js';
import { McChat, McLine } from './McText.jsx';

/**
 * An item's /info lines, edited in place in the inspector.
 *
 * Every keystroke is a staged change (the tray commits it), so there is no save
 * button here and nothing to lose: this replaced the description editor modal, whose
 * work only reached GitHub if the modal was saved before it was closed. The toolbar
 * is the old editor's: the sixteen colour codes, the format codes, the field
 * templates config.yml's descriptions are built from, and copying lines from an item
 * that already has a good description.
 *
 * Codes are inserted at the caret of the line last focused. Lines are typed strings
 * (the Mono Rule), and the chat preview above them is what /info will print.
 */
export default function InfoEditor({ item, lines, base, staged, onChange, onUndo, pool }) {
    const [active, setActive] = useState(0);
    const [copying, setCopying] = useState(false);
    const [query, setQuery] = useState('');
    const [peek, setPeek] = useState(null);
    const inputs = useRef([]);

    const others = useMemo(() => {
        const q = query.trim().toLowerCase();
        return pool
            .filter((i) => i.material !== item.material && i.description?.length)
            .filter((i) => !q || i.displayName.toLowerCase().includes(q) || i.material.toLowerCase().includes(q))
            .slice(0, 12);
    }, [pool, item.material, query]);

    if (lines === null) {
        return (
            <div className="ip-info-empty">
                {base
                    ? <p className="wk-small"><strong>Staged for deletion.</strong> The description will be removed from config.yml.</p>
                    : <p className="wk-small">No /info for this item yet. Players see nothing when they ask about it.</p>}
                <span className="ip-row">
                    {base
                        ? <button type="button" className="wk-btn wk-btn--quiet ip-btn" onClick={onUndo}>Undo deletion</button>
                        : <button type="button" className="wk-btn ip-btn" onClick={() => onChange([headerFor(item.displayName), '&7'])}>Write /info</button>}
                </span>
            </div>
        );
    }

    const set = (next) => onChange(next);
    const setLine = (i, v) => set(lines.map((l, j) => (j === i ? v : l)));
    const focusLater = (i, caret) => setTimeout(() => {
        const el = inputs.current[i];
        if (!el) return;
        el.focus();
        const at = caret ?? el.value.length;
        el.setSelectionRange(at, at);
    }, 0);

    const insert = (code) => {
        const el = inputs.current[active];
        const line = lines[active] ?? '';
        const from = el ? el.selectionStart : line.length;
        const to = el ? el.selectionEnd : line.length;
        setLine(active, line.slice(0, from) + code + line.slice(to));
        focusLater(active, from + code.length);
    };
    const addLine = (text = '') => {
        set([...lines, text]);
        setActive(lines.length);
        focusLater(lines.length);
    };
    const move = (i, d) => {
        const j = i + d;
        if (j < 0 || j >= lines.length) return;
        const next = [...lines];
        [next[i], next[j]] = [next[j], next[i]];
        set(next);
        setActive(j);
    };
    const remove = (i) => {
        if (lines.length <= 1) return;
        set(lines.filter((_, j) => j !== i));
        setActive(Math.max(0, Math.min(active, lines.length - 2)));
    };

    return (
        <div className="ip-info">
            <McChat lines={lines} />

            <div className="ip-tools" role="toolbar" aria-label="Formatting codes">
                <span className="ip-swatches">
                    {Object.keys(MC_COLORS).map((c) => (
                        <button key={c} type="button" className="ip-swatch" style={{ background: MC_COLORS[c] }}
                                title={`&${c} ${COLOR_NAMES[c]}`} aria-label={`Insert ${COLOR_NAMES[c]} (&${c})`}
                                onMouseDown={(e) => e.preventDefault()} onClick={() => insert(`&${c}`)} />
                    ))}
                </span>
                <span className="ip-formats">
                    {FORMAT_CODES.map((f) => (
                        <button key={f.code} type="button" className="ip-code" title={`&${f.code} ${f.name}`}
                                aria-label={`Insert ${f.name} (&${f.code})`} data-code={f.code}
                                onMouseDown={(e) => e.preventDefault()} onClick={() => insert(`&${f.code}`)}>
                            {f.code === 'r' ? 'Reset' : f.name[0]}
                        </button>
                    ))}
                </span>
            </div>

            <ol className="ip-lines">
                {lines.map((l, i) => (
                    <li key={i} className="ip-line" data-active={i === active || undefined}>
                        <input
                            ref={(el) => { inputs.current[i] = el; }}
                            className="ip-line-input" value={l} spellCheck="false"
                            aria-label={`Line ${i + 1}: ${stripMc(l) || 'empty'}`}
                            onFocus={() => setActive(i)}
                            onChange={(e) => setLine(i, e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); addLine('&7'); }
                                if (e.key === 'Backspace' && l === '' && lines.length > 1) { e.preventDefault(); remove(i); focusLater(Math.max(0, i - 1)); }
                            }}
                        />
                        <span className="ip-line-acts">
                            <button type="button" className="ip-icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move line ${i + 1} up`}><ArrowUp size={14} /></button>
                            <button type="button" className="ip-icon" onClick={() => move(i, 1)} disabled={i === lines.length - 1} aria-label={`Move line ${i + 1} down`}><ArrowDown size={14} /></button>
                            <button type="button" className="ip-icon" onClick={() => remove(i)} disabled={lines.length <= 1} aria-label={`Remove line ${i + 1}`}><X size={14} /></button>
                        </span>
                    </li>
                ))}
            </ol>

            <div className="ip-row ip-info-add">
                <button type="button" className="wk-btn wk-btn--quiet ip-btn" onClick={() => addLine('&7')}><Plus size={14} aria-hidden="true" /> Line</button>
                <label className="ip-select">
                    <span className="wk-sr">Add a field</span>
                    <select value="" onChange={(e) => { const f = FIELDS[Number(e.target.value)]; if (f) addLine(f.template); }}>
                        <option value="">Add a field…</option>
                        {FIELDS.map((f, i) => <option key={f.name} value={i}>{f.name}</option>)}
                    </select>
                </label>
                <button type="button" className="wk-btn wk-btn--quiet ip-btn" aria-expanded={copying} onClick={() => setCopying((v) => !v)}>
                    Copy from…
                </button>
            </div>

            {copying && (
                <div className="ip-copy">
                    <input className="ip-input" type="search" placeholder="An item with /info" value={query}
                           onChange={(e) => { setQuery(e.target.value); setPeek(null); }} aria-label="Find an item to copy from" />
                    <ul className="ip-copy-list">
                        {others.map((o) => (
                            <li key={o.material}>
                                <button type="button" className="ip-copy-item" aria-expanded={peek === o.material}
                                        onClick={() => setPeek(peek === o.material ? null : o.material)}>
                                    {o.displayName}
                                </button>
                                {peek === o.material && (
                                    <div className="ip-copy-lines">
                                        {o.description.map((l, i) => (
                                            <button key={i} type="button" className="ip-copy-line" onClick={() => addLine(l)} title="Add this line">
                                                <McLine text={l} />
                                            </button>
                                        ))}
                                        <button type="button" className="wk-btn wk-btn--quiet ip-btn" onClick={() => {
                                            // The header names the item it was copied from; keep ours.
                                            const [head, ...rest] = o.description;
                                            set(/Item Information/.test(stripMc(head)) ? [lines[0] ?? headerFor(item.displayName), ...rest] : [...o.description]);
                                            setCopying(false);
                                        }}>
                                            Use all, keep this item's header
                                        </button>
                                    </div>
                                )}
                            </li>
                        ))}
                        {!others.length && <li className="wk-small">No item with /info matches.</li>}
                    </ul>
                </div>
            )}

            <div className="ip-row ip-info-foot">
                {base
                    ? (
                        <>
                            {staged && <button type="button" className="wk-btn wk-btn--quiet ip-btn" onClick={onUndo}>Revert to the committed text</button>}
                            <button type="button" className="wk-btn wk-btn--quiet ip-btn" onClick={() => onChange(null)}>Delete /info</button>
                        </>
                    )
                    : <button type="button" className="wk-btn wk-btn--quiet ip-btn" onClick={onUndo}>Discard this description</button>}
            </div>
        </div>
    );
}
