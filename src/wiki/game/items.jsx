import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getTip, hideTip, showTip, subscribeTip } from './tipStore.js';
import { itemName, itemSrc, stageOf, tagsOf, whereOf } from '../data/atlas.js';
import { STAGES, TAGS, REGION } from '../tokens.js';

/**
 * Items, the atoms of the wiki.
 *
 * An item is always a real pool sprite in a SLOT — a square cut into the surface
 * with Minecraft's inventory bevel (dark top-left, lit bottom-right), never an icon
 * floating in a card. What the game knows about it rides on the slot as marks, each
 * with a word behind it in the tooltip:
 *
 *   - its stage as a 2px bar of that stage's light along the slot floor;
 *   - a NETHER / END / EXTREME tag as a pixel glyph in the top corner, the way the
 *     Collection Book marks a tier.
 *
 * Hover or focus shows the item's tooltip, drawn like the game's own: the violet
 * frame, the name, then the grey lines /info would print. One tooltip layer serves
 * the whole page; slots only publish what they are pointing at.
 */


/* ── Pixel glyphs for the tags. 7x7, drawn, one colour each. ─────────────────── */

const GLYPHS = {
    NETHER: 'M3 0h1v1h1v2h1v3h-1v1h-3v-1h-1v-3h1v-1h1z', // a flame
    END: 'M2 1h3v1h1v1h1v1h-1v1h-1v1h-3v-1h-1v-1h-1v-1h1v-1h1zM3 3h1v1h-1z', // an eye
    EXTREME: 'M3 0h1v2h2v1h1v1h-1v1h-2v2h-1v-2h-2v-1h-1v-1h1v-1h2z', // a star
};

export function TagGlyph({ tag, size = 9 }) {
    const d = GLYPHS[tag];
    if (!d) return null;
    return (
        <svg className="wk-glyph" width={size} height={size} viewBox="0 0 7 7" aria-hidden="true"
             style={{ color: TAGS[tag]?.ink }} shapeRendering="crispEdges">
            <path d={d} fill="currentColor" fillRule="evenodd" />
        </svg>
    );
}

/* ── The sprite and the slot ─────────────────────────────────────────────────── */

export function ItemSprite({ material, className = '', eager = false }) {
    return (
        <img
            className={`wk-sprite ${className}`}
            src={itemSrc(material)}
            alt=""
            width="128"
            height="128"
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            draggable="false"
        />
    );
}

/**
 * One item in a slot. `size` is the slot's CSS size in px. When `tip` is false the
 * slot is decoration beside a name that already says everything (a nav face).
 */
export function ItemSlot({
    material, size = 56, tip: withTip = true, marks = true, tabIndex, className = '', eager,
    onPoint, onFocus, family = null, members = null,
}) {
    const ref = useRef(null);
    const stage = stageOf(material);
    const tags = tagsOf(material);
    const tag = tags.includes('END') ? 'END' : tags.includes('NETHER') ? 'NETHER' : tags.includes('EXTREME') ? 'EXTREME' : null;
    const fam = family ? { name: family, members } : null;
    const point = () => { if (withTip) showTip(material, ref.current, fam); onPoint?.(material, ref.current); };
    const leave = () => { if (withTip) hideTip(material); };
    return (
        <span
            ref={ref}
            className={`wk-slot ${className}`}
            style={{ '--slot': `${size}px` }}
            data-stage={marks && stage && !fam ? stage.toLowerCase() : undefined}
            role={withTip ? 'img' : undefined}
            aria-label={withTip ? (fam ? describeFamily(fam) : describe(material)) : undefined}
            aria-hidden={withTip ? undefined : true}
            tabIndex={tabIndex}
            onMouseEnter={point}
            onMouseLeave={leave}
            onFocus={(e) => { point(); onFocus?.(e); }}
            onBlur={leave}
        >
            <ItemSprite material={material} eager={eager} />
            {marks && tag && <span className="wk-slot-mark"><TagGlyph tag={tag} /></span>}
            {fam && members.length > 1 && <span className="wk-count" aria-hidden="true">{members.length}</span>}
        </span>
    );
}

/** Where a family's members are found, most common first. */
function familyPlaces(members) {
    const n = new Map();
    for (const m of members) {
        const s = whereOf(m)?.structure;
        if (s) n.set(s, (n.get(s) ?? 0) + 1);
    }
    return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
}

function describeFamily({ name, members }) {
    const places = familyPlaces(members);
    return `${name}, ${members.length} kinds${places.length ? `, found in ${places.join(', ')}` : ''}`;
}

/** The whole tooltip as one sentence, for a screen reader. */
function describe(material) {
    const parts = [itemName(material)];
    const stage = stageOf(material);
    if (stage) parts.push(`${STAGES[stage].label} stage`);
    const tags = tagsOf(material);
    if (tags.length) parts.push(tags.map((t) => TAGS[t]?.label ?? t).join(', '));
    const w = whereOf(material);
    if (w?.structure) parts.push(`found in ${w.structure}${w.chance ? ` (${w.chance})` : ''}`);
    else if (w?.biomes) parts.push(`biomes: ${w.biomes}`);
    return parts.join('. ');
}

/**
 * A grid of slots with ONE tab stop. Arrow keys walk it like an inventory, Home and
 * End jump to the ends. A region can hold dozens of items and a reader tabbing
 * through the page should not have to press Tab dozens of times to leave it.
 */
export function SlotGrid({ items, size = 52, label, className = '', onPoint, after = null }) {
    const [active, setActive] = useState(0);
    const ref = useRef(null);
    const move = (e) => {
        const cells = [...ref.current.querySelectorAll('.wk-slot')];
        if (!cells.length) return;
        const cols = Math.max(1, Math.round(ref.current.clientWidth / (cells[0].offsetWidth || size)));
        const delta = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
        let next = active;
        if (delta) next = Math.min(cells.length - 1, Math.max(0, active + delta));
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = cells.length - 1;
        else return;
        e.preventDefault();
        setActive(next);
        cells[next].focus();
    };
    return (
        <div ref={ref} className={`wk-grid ${className}`} role="group" aria-label={label} onKeyDown={move}
             style={{ '--slot': `${size}px` }}>
            {items.map((it, i) => {
                const slot = typeof it === 'string' ? { material: it } : it;
                return (
                    <ItemSlot key={slot.material} material={slot.material} family={slot.family} members={slot.members}
                              size={size} tabIndex={i === active ? 0 : -1}
                              onFocus={() => setActive(i)} onPoint={onPoint} />
                );
            })}
            {after}
        </div>
    );
}

/* ── The one tooltip ─────────────────────────────────────────────────────────── */

export function TooltipLayer() {
    const t = useSyncExternalStore(subscribeTip, getTip, () => null);
    const ref = useRef(null);

    // Placed straight onto the element before paint: measuring needs it rendered,
    // and a state round-trip would show it one frame in the wrong place.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!t || !el) return;
        // Beside the slot, the way the game draws it; below it when neither side fits.
        const box = el.getBoundingClientRect();
        const r = t.rect;
        const vw = window.innerWidth; const vh = window.innerHeight;
        const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
        let x = r.right + 10;
        let y = clamp(r.top - 4, 8, vh - box.height - 8);
        if (x + box.width > vw - 8) x = r.left - box.width - 10;
        if (x < 8) {
            x = clamp(r.left + r.width / 2 - box.width / 2, 8, vw - box.width - 8);
            y = r.bottom + 8;
            if (y + box.height > vh - 8) y = Math.max(8, r.top - box.height - 8);
        }
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.visibility = 'visible';
    }, [t]);

    useEffect(() => {
        const clear = () => hideTip();
        window.addEventListener('scroll', clear, { passive: true });
        return () => window.removeEventListener('scroll', clear);
    }, []);

    if (!t) return null;
    const m = t.material;
    const stage = stageOf(m);
    const tags = tagsOf(m);
    const w = whereOf(m);
    const region = w ? REGION[w.region] : null;
    if (t.family) {
        const places = familyPlaces(t.family.members);
        return (
            <div ref={ref} key={`fam-${m}`} className="wk-tip" role="tooltip"
                 style={{ left: -9999, top: -9999, visibility: 'hidden' }}>
                <div className="wk-tip-name">{t.family.name}</div>
                <div className="wk-tip-line">{t.family.members.length} kinds in <span style={{ color: region?.ink }}>{region?.name}</span></div>
                {places.length > 0 && (
                    <div className="wk-tip-line">Structures: <span className="wk-tip-hi">{places.join(', ')}</span></div>
                )}
                <div className="wk-tip-line wk-tip-members">
                    {t.family.members.slice(0, 8).map((x) => itemName(x).replace(/ (Pottery Sherd|Armor Trim Smithing Template)$/, '')).join(', ')}
                    {t.family.members.length > 8 && `, +${t.family.members.length - 8}`}
                </div>
            </div>
        );
    }
    return (
        <div ref={ref} key={m} className="wk-tip" role="tooltip"
             style={{ left: -9999, top: -9999, visibility: 'hidden' }}>
            <div className="wk-tip-name">{itemName(m)}</div>
            {stage && (
                <div className="wk-tip-line">
                    <span style={{ color: STAGES[stage].ink }}>{STAGES[stage].label}</span>
                    {' '}{STAGES[stage].minute ? `from minute ${STAGES[stage].minute}` : 'from the start'}
                </div>
            )}
            {tags.length > 0 && (
                <div className="wk-tip-line">
                    {tags.map((tg, i) => (
                        <React.Fragment key={tg}>
                            {i > 0 && ', '}
                            <span style={{ color: TAGS[tg]?.ink }}>{TAGS[tg]?.label ?? tg}</span>
                        </React.Fragment>
                    ))}
                    {' '}item
                </div>
            )}
            {region && (
                <div className="wk-tip-where">
                    <div className="wk-tip-line"><span style={{ color: region.ink }}>{region.name}</span></div>
                    {w.structure && (
                        <div className="wk-tip-line">
                            Structure: <span className="wk-tip-hi">{w.structure}</span>
                            {w.chance && <> <span className="wk-tip-hi">{w.chance}</span></>}
                        </div>
                    )}
                    {w.biomes && <div className="wk-tip-line">Biomes: <span className="wk-tip-hi">{w.biomes}</span></div>}
                </div>
            )}
            <div className="wk-tip-id">minecraft:{m.toLowerCase()}</div>
        </div>
    );
}
