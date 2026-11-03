import React, { useState } from 'react';
import { SETTINGS } from '../data/settings.data.js';
import { spriteFallback, spriteOf } from '../game/sprite.js';
import { Head } from '../game/Villager.jsx';
import Mini from '../game/Mini.jsx';
import './settingsmenu.css';

/* Mirrors the plugin's SettingsInventory, GuiItems and GameSetting. Teams' four-player check and click sounds are left out. */

const PER_PAGE = 7;
const QUICKIE = ['Disabled', 'Early only', 'Early + Mid'];
const GUI = '/fib-entities/generic_54.png';
const HEADS = {
    prev: '/fib-entities/heads/prev.png', prevOff: '/fib-entities/heads/prev_off.png',
    next: '/fib-entities/heads/next.png', nextOff: '/fib-entities/heads/next_off.png',
};

const plain = (text) => text.replace(/<[^>]+>/g, '');
const initial = () => Object.fromEntries(SETTINGS.map((s) => [s.key, s.standard]));

function stateOf(s, v, values) {
    if (s.key === 'QUICKIE') {
        return v > 0
            ? { material: 'LIME_DYE', name: `<dark_gray>➟ <green>${QUICKIE[v]} <dark_green>✔`, text: QUICKIE[v] }
            : { material: 'RED_DYE', name: '<dark_gray>➟ <red>Disabled <dark_red>✘', text: 'Disabled' };
    }
    if (typeof s.default === 'number') {
        return { material: 'STONE_BUTTON', count: v, name: `<dark_gray>➟ <yellow>${v} <gray>${v === 1 ? 'row' : 'rows'}`, text: `${v} ${v === 1 ? 'row' : 'rows'}`, off: !values.BACKPACK };
    }
    return v
        ? { material: 'LIME_DYE', name: '<dark_gray>➟ <green>Enabled <dark_green>✔', text: 'Enabled' }
        : { material: 'RED_DYE', name: '<dark_gray>➟ <red>Disabled <dark_red>✘', text: 'Disabled' };
}

function Sprite({ material }) {
    return <img className="sm-sprite" src={spriteOf(material)} data-material={material} onError={spriteFallback} alt="" width="128" height="128" draggable="false" />;
}

export default function SettingsMenu() {
    const [values, setValues] = useState(initial);
    const [page, setPage] = useState(0);
    const [tip, setTip] = useState(null);
    const [refused, setRefused] = useState(null);
    const pages = Math.ceil(SETTINGS.length / PER_PAGE);
    const changed = SETTINGS.some((s) => values[s.key] !== s.standard);

    const act = (s, right, slot) => {
        const v = values[s.key];
        if (s.key === 'QUICKIE') {
            setValues({ ...values, QUICKIE: (v + (right ? QUICKIE.length - 1 : 1)) % QUICKIE.length });
        } else if (typeof s.default === 'number') {
            if (slot < 19) return;
            const next = v + (right ? -1 : 1);
            if (!values.BACKPACK || next < 1 || next > 6) setRefused(slot);
            else setValues({ ...values, [s.key]: next });
        } else {
            setValues({ ...values, [s.key]: !v });
        }
    };

    const slots = Array.from({ length: 36 }, () => ({ kind: 'pane' }));
    slots[8] = { kind: 'item', material: 'STRUCTURE_VOID', name: '<dark_gray>» <yellow>Manage presets', lore: [] };
    SETTINGS.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE).forEach((s, i) => {
        const st = stateOf(s, values[s.key], values);
        const said = `${s.name}: ${st.text}`;
        slots[10 + i] = { kind: 'setting', s, material: s.material, name: `<dark_gray>» <dark_aqua>${s.name}`, lore: s.mm, said };
        slots[19 + i] = { kind: 'state', s, material: st.material, count: st.count, name: st.name, lore: [], said };
    });
    const hasPrev = page > 0;
    const hasNext = page < pages - 1;
    slots[27] = { kind: 'page', dir: -1, can: hasPrev, head: hasPrev ? HEADS.prev : HEADS.prevOff,
        name: hasPrev ? '<dark_red>« <red>Previous page' : '<dark_gray>« <gray>Previous page', lore: hasPrev ? [] : ['', "<dark_gray>» <gray>You're on the first page"] };
    slots[35] = { kind: 'page', dir: 1, can: hasNext, head: hasNext ? HEADS.next : HEADS.nextOff,
        name: hasNext ? '<dark_green>» <green>Next page' : '<dark_gray>» <gray>Next page', lore: hasNext ? [] : ['', "<dark_gray>» <gray>You're on the last page"] };

    const shown = tip != null ? slots[tip] : null;

    return (
        <figure className="sm" aria-label="The /settings menu">
            <div className="sm-gui" style={{ '--gui': `url(${GUI})` }} onMouseLeave={() => setTip(null)}>
                <span className="sm-title" aria-hidden="true">
                    <Mini text="<dark_gray>» <dark_aqua>Settings <dark_gray>● <gray>Menu" base="#404040" lift={false} className="sm-line" />
                </span>
                {slots.map((x, i) => {
                    const col = i % 9;
                    const row = Math.floor(i / 9);
                    const pos = { '--col': col, '--row': row };
                    if (x.kind === 'pane') {
                        return <span key={i} className="sm-slot" style={pos} aria-hidden="true"><Sprite material="GRAY_STAINED_GLASS_PANE" /></span>;
                    }
                    const face = x.head ? <Head skin={x.head} /> : <Sprite material={x.material} />;
                    const hover = { onMouseEnter: () => setTip(i), onFocus: () => setTip(i), onBlur: () => setTip(null) };
                    if (x.kind === 'item') {
                        return <span key={i} className="sm-slot" style={pos} {...hover} tabIndex={0} aria-label={plain(x.name).replace('» ', '')}>{face}</span>;
                    }
                    const onClick = (e) => {
                        if (x.kind === 'page') { if (x.can) { setPage((p) => p + x.dir); setTip(null); } return; }
                        act(x.s, e.shiftKey, i);
                    };
                    const onContextMenu = (e) => {
                        if (x.kind === 'page') return;
                        e.preventDefault();
                        act(x.s, true, i);
                    };
                    const label = x.kind === 'page' ? plain(x.name).replace(/^[«»] /, '') : x.said;
                    return (
                        <button key={x.kind === 'page' ? `page${i}` : `${x.s.key}${i}`} type="button" className="sm-slot sm-slot--live" style={pos}
                                data-refused={refused === i || undefined} onAnimationEnd={() => setRefused(null)}
                                aria-label={label} aria-disabled={x.kind === 'page' && !x.can ? true : undefined}
                                onClick={onClick} onContextMenu={onContextMenu} {...hover}>
                            {face}
                            {x.count > 1 && <span className="sm-count">{x.count}</span>}
                        </button>
                    );
                })}
                {shown && shown.kind !== 'pane' && (
                    <span className="sm-tip" role="tooltip" data-side={tip % 9 > 4 ? 'left' : 'right'}
                          style={{ '--col': tip % 9, '--row': Math.floor(tip / 9) }}>
                        <Mini text={shown.name} className="sm-line" />
                        {shown.lore.map((l, i) => <Mini key={i} text={l} className="sm-line" />)}
                    </span>
                )}
            </div>
            <figcaption className="sm-foot">
                <span className="wk-small">
                    Set to the standard round. Click a setting or its dye to switch it, as in the game; a right-click
                    goes back a step.
                </span>
                {changed && (
                    <button type="button" className="wk-btn wk-btn--quiet sm-reset" onClick={() => { setValues(initial()); setTip(null); }}>
                        Back to the standard round
                    </button>
                )}
            </figcaption>
        </figure>
    );
}
