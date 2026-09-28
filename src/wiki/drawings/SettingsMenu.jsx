import React, { useState } from 'react';
import { SETTINGS } from '../data/settings.data.js';
import { spriteFallback, spriteOf } from '../game/sprite.js';
import { Head } from '../game/Villager.jsx';
import Mini from '../game/Mini.jsx';
import './settingsmenu.css';

/*
 * The /settings menu, as an operator opens it: the plugin's SettingsInventory drawn in
 * the game's own chest texture, set to the standard round, and working the way the
 * menu works. Every detail below is the plugin's (gui/SettingsInventory, GuiItems,
 * settings/GameSetting, QuickieMode on main, Sept 2026); none of it is decoration.
 *
 *   the chest     four rows, every slot a grey glass pane unless something sits on it
 *   row two       seven settings a page (22 settings, four pages), each as its item
 *   row three     under each, its state: a lime dye (Enabled), a red dye (Disabled), a
 *                 stone button counting backpack rows, Quickie's mode by name
 *   the corners   player heads in arrow skins turn the page; the top-right slot is
 *                 "Manage presets" (an operator's; it opens another menu, not drawn)
 *   clicking      a setting or the state under it switches it. Quickie cycles, the other
 *                 way on a right-click. Backpack rows go up on a left-click and down on
 *                 a right-click, one to six, and refuse while the backpack is off
 *   the tooltip   the item's name and lore, coloured by the plugin's own MiniMessage
 *                 (settings.data.js keeps it), never italic, as ItemBuilder sets them
 *
 * The drawing is a toy: nothing it changes goes anywhere, and "Back to the standard
 * round" puts it back. Two things the game does are left out: Teams refuses with fewer
 * than four players online (there are no players here, and its tooltip says so), and
 * the click sounds.
 *
 * The one liberty: on the tooltip's near-black, dark gray is lifted so the plugin's
 * notes stay readable (Mini.jsx), the way the wheel lifts a rarity's ink for text.
 */

const PER_PAGE = 7;
const QUICKIE = ['Disabled', 'Early only', 'Early + Mid'];
const GUI = '/fib-entities/generic_54.png';
const HEADS = {
    prev: '/fib-entities/heads/prev.png', prevOff: '/fib-entities/heads/prev_off.png',
    next: '/fib-entities/heads/next.png', nextOff: '/fib-entities/heads/next_off.png',
};

const plain = (text) => text.replace(/<[^>]+>/g, '');
const initial = () => Object.fromEntries(SETTINGS.map((s) => [s.key, s.standard]));

/** What the row under a setting shows, as SettingsInventory builds it. */
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
            // The item itself does nothing; only the stone button counts, and only with a backpack.
            if (slot < 19) return;
            const next = v + (right ? -1 : 1);
            if (!values.BACKPACK || next < 1 || next > 6) setRefused(slot);
            else setValues({ ...values, [s.key]: next });
        } else {
            setValues({ ...values, [s.key]: !v });
        }
    };

    // The chest, slot by slot: panes everywhere, then what sits on them.
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
