import React, { useCallback, useEffect, useRef, useState } from 'react';
import Dices from 'lucide-react/dist/esm/icons/dices';
import Footer from '../components/common/Footer.jsx';
import { useCalm } from '../config/power.js';
import { useOnScreen, useTicker } from '../wiki/hooks.js';
import PageLinks from '../wiki/PageLinks.jsx';
import Trader, { Villager } from '../wiki/Villager.jsx';
import { useGo } from '../wiki/pages.js';
import { spriteFallback, spriteOf } from '../wiki/sprite.js';
import { TABLES, pct, rangeText, roll } from '../wiki/loot.js';
import { DEPTHS_MAP } from '../wiki/depthsMap.data.js';
import '../wiki/page.css';
import '../wiki/content.css';
// The pack's own portal surface, bundled from the resource pack this repo ships.
import portalTexture from '../../ForceItemBattle/assets/minecraft/textures/block/antimatter_portal.png';

/*
 * Custom Content (THE EXPLORER'S ATLAS): what FIB adds to Minecraft, organised by
 * what it is for a player. The Antimatter Depths as the trip it is (find the ruin,
 * buy the eye, craft the totem, open your own portal, go in), the locators side by
 * side, the traders, and the two changes to the world itself.
 *
 * What is derived and what is not. The loot is read from the datapack at build time
 * (wiki/loot.js), so the chances, counts and names are the datapack's. Recipes,
 * trades and timings live in the plugin's Java, which the site cannot read at build
 * time, so they are written here; each was checked against the plugin's source on
 * main when this page was rebuilt (Sept 2026), and that check found three the old page
 * had wrong: the Eye of Antimatter costs 6 emeralds, not 5; the journal turns up in
 * 20% of shipwreck map chests, not 30%; and the second Trial Locator recipe belongs to
 * the Harder trackers setting, not to Hard.
 *
 *   recipes      manager/RecipeManager (the kiln brush: the datapack's fib:kiln_fired_brush)
 *   trades       listener/VillagerTradeListener, manager/WanderingTraderManager (its vanilla
 *                offers keep their vanilla use limits: only the price is cut to one of each
 *                ingredient, whatever a comment there says about unlimited uses)
 *   journal      listener/JournalListener, model/BiomeNote
 *
 * The random events used to be described here too. They are Gameplay's (the same
 * text, kept in two places, had already drifted), and this page points there.
 */

/* ── Items ───────────────────────────────────────────────────────────────────── */

/*
 * The plugin's custom items. Three of them animate in the pack (knowledge_book,
 * sulfur_locator, trial_locator are vertical sprite strips), so they are drawn from
 * the static single-frame renders in /fib-items, keyed by the material they sit on.
 */
const ITEM = {
    antimatterLocator: { name: 'Antimatter Locator', src: '/fib-items/knowledge_book.png' },
    eye: { name: 'Eye of Antimatter', src: '/fib-custom/eye_of_antimatter.png' },
    totem: { name: 'Totem of Antimatter', src: '/fib-custom/totem_of_antimatter.png' },
    trialLocator: { name: 'Trial Locator', src: '/fib-items/wither_rose.png' },
    sulfurLocator: { name: 'Sulfur Locator', src: '/fib-items/music_disc_chirp.png' },
    brush: { name: 'Kiln-Fired Brush', src: '/fib-custom/kiln_fired_brush.png' },
    journal: { name: "Weathered Captain's Journal", src: '/fib-custom/old_book.png' },
    note: { name: 'Faded Note', src: '/fib-custom/old_paper.png' },
    wheel: { name: 'Wheel of Fortune', src: '/fib-custom/wheel.png' },
};

const CONTENTS = [
    { item: ITEM.antimatterLocator, to: 'antimatter-depths' },
    { item: ITEM.eye, to: 'antimatter-depths' },
    { item: ITEM.totem, to: 'antimatter-depths' },
    { item: ITEM.trialLocator, to: 'trial-locator' },
    { item: ITEM.sulfurLocator, to: 'sulfur-locator' },
    { item: ITEM.brush, to: 'kiln-fired-brush' },
    { item: ITEM.journal, to: 'journal' },
    { item: ITEM.wheel, to: 'traders' },
];

const SECTIONS = [
    ['antimatter-depths', 'Antimatter Depths'], ['depths-loot', 'Its loot'], ['locators', 'Locators'],
    ['traders', 'Traders'], ['world', 'The world'],
];

const v = (m) => ({ material: m.toUpperCase(), name: m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) });

const RECIPES = {
    antimatter: [[null, v('nether_brick'), null], [v('glowstone_dust'), v('quartz'), v('glowstone_dust')], [null, v('nether_brick'), null]],
    totem: [[null, ITEM.eye, null], [v('quartz'), v('glowstone'), v('quartz')], [null, v('quartz'), null]],
    trial: [[v('cut_copper'), v('glass'), v('cut_copper')], [v('glass'), v('compass'), v('glass')], [v('gold_ingot'), v('gold_ingot'), v('gold_ingot')]],
    trialHarder: [[v('obsidian'), v('copper_ingot'), v('obsidian')], [v('gold_ingot'), v('compass'), v('iron_ingot')], [v('obsidian'), v('diamond'), v('obsidian')]],
};

/* ── Drawing pieces ─────────────────────────────────────────────────────────── */

function Face({ item, size = 48, count = null, className = '' }) {
    return (
        <span className={`wk-slot ${className}`} style={{ '--slot': `${size}px` }} title={item.name}>
            <img className="wk-sprite" src={item.src ?? spriteOf(item.material)} data-material={item.material}
                 onError={spriteFallback} alt="" width="128" height="128" loading="lazy" draggable="false" />
            {count != null && count > 1 && <span className="wk-count">{count}</span>}
        </span>
    );
}

const To = ({ label }) => <span className="cc-to" aria-hidden="true">{label && <span className="cc-to-label">{label}</span>}</span>;

/** A crafting table: the 3x3 grid, a track, the result. The grid is drawn; the sentence is for a screen reader. */
function Craft({ grid, result, caption }) {
    const ingredients = [...new Set(grid.flat().filter(Boolean).map((c) => c.name))];
    return (
        <figure className="cc-craft">
            <div className="cc-craft-row" aria-hidden="true">
                <span className="cc-grid">
                    {grid.flat().map((c, i) => (c ? <Face key={i} item={c} size={40} /> : <span key={i} className="wk-slot" style={{ '--slot': '40px' }} />))}
                </span>
                <To />
                <span className="cc-result"><Face item={result} size={64} /><span className="cc-result-name">{result.name}</span></span>
            </div>
            <figcaption className="wk-small">
                <span className="wk-sr">Crafted from {ingredients.join(', ')}. </span>{caption}
            </figcaption>
        </figure>
    );
}

/** A trade or a smelt: what goes in, where, what comes out. */
function Exchange({ give, via, get, caption }) {
    return (
        <figure className="cc-exchange">
            <div className="cc-exchange-row" aria-hidden="true">
                <span className="cc-give">{give.map((g) => <Face key={g.item.name} item={g.item} size={48} count={g.count} />)}</span>
                <To label={via?.label} />
                {via?.item && (
                    <>
                        <Face item={via.item} size={48} className="cc-via" />
                        <To />
                    </>
                )}
                {via?.figure && (
                    <>
                        {via.figure}
                        <To />
                    </>
                )}
                <span className="cc-result"><Face item={get.item} size={64} count={get.count} /><span className="cc-result-name">{get.item.name}</span></span>
            </div>
            <figcaption className="wk-small">
                <span className="wk-sr">{give.map((g) => `${g.count ?? 1} ${g.item.name}`).join(' and ')}{via?.label ? `, ${via.label}` : ''}, for {get.item.name}. </span>{caption}
            </figcaption>
        </figure>
    );
}

const Typed = ({ children }) => <code className="wk-typed">{children}</code>;

/** Objects on a track with no product at the end: an act, drawn. */
function Sequence({ parts, caption }) {
    return (
        <figure className="cc-exchange">
            <div className="cc-exchange-row" aria-hidden="true">
                {parts.map((p, i) => (p.to !== undefined
                    ? <To key={i} label={p.to} />
                    : <span key={i} className="cc-result"><Face item={p.item} size={p.size ?? 56} />{p.item.label && <span className="cc-result-name">{p.item.label}</span>}</span>))}
            </div>
            {caption && <figcaption className="wk-small">{caption}</figcaption>}
        </figure>
    );
}

/* What the Depths hold, as the blocks you will meet, each a way into its loot. */
const INSIDE = [
    { item: { ...v('decorated_pot'), name: 'Decorated Pot' }, what: '27 in the storage room', room: 'antimatter_depths_storage_pots' },
    { item: { ...v('chest_minecart'), name: 'Chest Minecart' }, what: '2 in the mines', room: 'antimatter_depths_mines' },
    { item: { ...v('trial_spawner'), name: 'Trial Spawner' }, what: 'Guarding the vault room', room: null },
    { item: { ...v('vault'), name: 'Vault' }, what: "The vault room's reward", room: 'antimatter_depths_vault' },
    { item: { ...v('end_portal_frame'), name: 'End Portal' }, what: 'The quick way to the End', room: null },
];

/*
 * The ruin as it stands (the wheel's render of the datapack's antimatter_depths_portal
 * structure), with the portal as each player sees it: filled for the player who opened
 * it, an empty frame for anyone else. That is the rule people get wrong, so it is
 * shown rather than told.
 *
 * Where the portal goes is not eyeballed. The plugin puts it 2 blocks behind the vault
 * that opens it and 3.5 up, 3 wide and 4 tall (AntimatterPortalManager.frameOf); the
 * structure's vaults stand at (6, 1, 4) and (6, 1, 8), so the opening is x 5 to 8, y 3
 * to 7, across z 6.5. That plane was placed on the render by fitting every block of the
 * structure to the render's silhouette (2:1 isometric, 10.75px a block, 87% overlap),
 * which also puts the front vault where the render shows it. Below, the plane is its
 * top-left corner, its bottom edge and its height, in the render's own 256px. Its sides
 * are vertical, so it is a rectangle skewed along one axis: placed in percentages of the
 * render, it scales with the image at any width with nothing measured.
 *
 * The surface is the pack's own antimatter_portal texture, one 16px frame stretched
 * across the opening as the plugin's scaled item display stretches it, running through
 * its 32 frames at the game's 20 a second. Opening it strikes lightning on the frame,
 * so the portal arrives behind a flash.
 */
const RUIN = { src: '/fib-relics/antimatter_portal.png', size: 256 };
const PORTAL_PLANE = { x: 111.6, y: 81.2, along: [32.3, -16.1], down: 49.6 };

function PortalRuin() {
    const [you, setYou] = useState(true);
    const ref = useRef(null);
    const calm = useCalm();
    const on = useOnScreen(ref);
    const { x, y, along, down } = PORTAL_PLANE;
    const pc = (n) => `${(n / RUIN.size) * 100}%`;
    const plane = {
        left: pc(x), top: pc(y), width: pc(along[0]), height: pc(down),
        transform: `skewY(${(Math.atan2(along[1], along[0]) * 180) / Math.PI}deg)`,
        backgroundImage: `url(${portalTexture})`,
    };
    return (
        <figure className="cc-ruin">
            <div className="cc-ruin-view" ref={ref}>
                <img src={RUIN.src} alt={you
                    ? 'The Antimatter Depths Portal ruin, its frame filled with a purple portal.'
                    : 'The Antimatter Depths Portal ruin, its frame empty.'}
                     width={RUIN.size} height={RUIN.size} loading="lazy" draggable="false" />
                {you && <span key="portal" className="cc-portal" aria-hidden="true" data-live={(on && !calm) || undefined} style={plane} />}
            </div>
            <div className="cc-seg" role="radiogroup" aria-label="Who is looking">
                <button type="button" role="radio" aria-checked={you} onClick={() => setYou(true)}>You</button>
                <button type="button" role="radio" aria-checked={!you} onClick={() => setYou(false)}>Another player</button>
            </div>
            <figcaption className="wk-small">
                {you
                    ? 'The portal you opened. Only you see it, and only you can go through it.'
                    : 'The same ruin for anyone else: an empty frame they walk straight through.'}
            </figcaption>
        </figure>
    );
}

/* ── The Antimatter Depths ──────────────────────────────────────────────────── */

function Step({ n, title, children, drawing }) {
    return (
        <li className="cc-step">
            <div className="cc-step-text">
                <h3 className="cc-step-title"><span className="cc-step-n">{n}</span>{title}</h3>
                {children}
            </div>
            {drawing && <div className="cc-step-draw">{drawing}</div>}
        </li>
    );
}

function Depths() {
    return (
        <section id="antimatter-depths" className="wk-wrap cc-sec" aria-labelledby="depths-title">
            <div className="cc-sec-head">
                <h2 id="depths-title" className="wk-h3">The Antimatter Depths</h2>
                <p className="wk-p">
                    A loot dungeon in a dimension of its own, and the fast way to the End. You do not dig down to it:
                    you open a portal to it, and the portal you open is <strong>yours alone</strong>. Nobody can follow you
                    in and empty the barrels first. Finding the doorway is cheap. Opening it is not.
                </p>
            </div>

            <ol className="cc-steps">
                <Step n="1" title="Find the ruin" drawing={<Craft grid={RECIPES.antimatter} result={ITEM.antimatterLocator} caption="The only recipe; Harder trackers does not change it." />}>
                    <p className="wk-p">
                        Craft an Antimatter Locator and right-click it. You get coordinates and a trail to an
                        Antimatter Depths Portal: a ruin on the Overworld surface, a tall dark frame with a vault on
                        either side. The locator finds the ruin; it does not get you through it.
                    </p>
                    <p className="wk-small">In game: <Typed>/info antimatter_locator</Typed></p>
                </Step>
                <Step n="2" title="Buy an Eye of Antimatter" drawing={<Exchange give={[{ item: v('emerald'), count: 6 }]} via={{ label: 'Cleric, level 2', figure: <Villager /> }} get={{ item: ITEM.eye }} caption="Every apprentice cleric sells one. Trade with a level 1 cleric to level it up." />}>
                    <p className="wk-p">
                        The eye cannot be crafted. Every Cleric villager sells one once it reaches level 2 (Apprentice),
                        for six emeralds, with no roll for it.
                    </p>
                </Step>
                <Step n="3" title="Craft the Totem of Antimatter" drawing={<Craft grid={RECIPES.totem} result={ITEM.totem} caption="Spent every time a portal is opened." />}>
                    <p className="wk-p">
                        The real price of the trip: the eye goes in at the top, and the totem is used up each time you
                        open a portal.
                    </p>
                </Step>
                <Step n="4" title="Open your portal" drawing={<>
                    <Sequence parts={[{ item: ITEM.totem }, { to: 'Right-click' }, { item: { ...v('vault'), name: 'Vault', label: 'Either vault of the ruin' } }]} caption="The totem is consumed." />
                    <PortalRuin />
                </>}>
                    <p className="wk-p">
                        Right-click either vault with the totem in hand. The totem is consumed, lightning strikes the
                        frame, and the portal fills in <strong>for you only</strong>. Another player in the same ruin sees an
                        empty frame and walks through open air; they need a totem of their own, and it opens their own
                        portal to their own Depths.
                    </p>
                </Step>
                <Step n="5" title="Go in" drawing={<Inside />}>
                    <p className="wk-p">
                        Your Depths is chosen once and kept for the round, so going back returns you to the same dungeon,
                        and the frame you arrive at takes you home. Inside are the loot rooms below, a vault room guarded
                        by trial spawners, and a room with an <strong>End Portal</strong>, which is what makes this the quick
                        way to the End. Where it drops you is random, but it is the same spot every time for you.
                    </p>
                </Step>
            </ol>
        </section>
    );
}

function Inside() {
    return (
        <ul className="cc-inside">
            {INSIDE.map((x) => (
                <li key={x.item.name}>
                    {x.room
                        ? <a className="cc-inside-item" href="#depths-loot" onClick={() => window.dispatchEvent(new CustomEvent('cc-room', { detail: x.room }))}><Face item={x.item} size={44} /><span><span className="cc-inside-name">{x.item.name}</span><span className="wk-small">{x.what}</span></span></a>
                        : <span className="cc-inside-item"><Face item={x.item} size={44} /><span><span className="cc-inside-name">{x.item.name}</span><span className="wk-small">{x.what}</span></span></span>}
                </li>
            ))}
        </ul>
    );
}

/* ── Its loot ───────────────────────────────────────────────────────────────── */

const ROOMS = [
    { key: 'antimatter_depths_nature', name: 'Nature Room', text: 'A sanctuary of flowers, with a small bonus roll on top.' },
    { key: 'antimatter_depths_storage', name: 'Storage', text: 'The largest table: everyday materials, and five smithing templates the game names [LEGENDARY].' },
    { key: 'antimatter_depths_storage_pots', name: 'Storage Pots', text: 'The storage room is lined with 27 decorated pots; each holds at most one draw, and most hold nothing.', containers: 27 },
    { key: 'antimatter_depths_mines', name: 'Mines', text: 'Two chest minecarts, and the best odds on diamonds in the Depths.', containers: 2 },
    { key: 'antimatter_depths_treasure', name: 'Treasure Room', text: 'Resources, rare saplings, and two named rarities.' },
    { key: 'antimatter_depths_vault', name: 'Vault', text: 'The vault room\'s reward: one of four.' },
];

/* A drop as the page names it: the pack's custom items by their own name, anything
   else by its vanilla name with the game's custom name beside it. */
function dropName(e) {
    if (e.src && e.custom) return { name: e.custom, also: null };
    return { name: e.name, also: e.custom };
}

/* A chest is 27 slots, and loot lands in random ones, as the game spreads it. */
function spread(drops) {
    const slots = Array(27).fill(null);
    const free = [...slots.keys()].sort(() => Math.random() - 0.5);
    drops.slice(0, 27).forEach((d, i) => { slots[free[i]] = d; });
    return { drops, cells: slots };
}

function Chest({ drops, cells }) {
    return (
        <div className="cc-chest" role="img" aria-label={drops.length ? `The chest held: ${drops.map((d) => `${d.amount} ${dropName(d).name}`).join(', ')}.` : 'The chest was empty.'}>
            {cells.map((d, i) => (d
                ? <Face key={i} item={{ material: d.material, src: d.src, name: dropName(d).name }} size={44} count={d.amount} className="cc-drop" />
                : <span key={i} className="wk-slot" style={{ '--slot': '44px' }} />))}
        </div>
    );
}

/*
 * The Depths from above, as a map of the loot: the wheel's render of the structure with
 * each room outlined where it shows (src/wiki/depthsMap.data.js says how that was
 * measured). A room with loot is a way into its tables, and the tables' own tabs light
 * the room they belong to, so the map and the tabs are one control. The End Portal room
 * and the start are named too, because they are where the trip goes, but hold no loot.
 */
const PLACES = [
    { piece: 'storage', name: 'Storage', rooms: ['antimatter_depths_storage', 'antimatter_depths_storage_pots', 'antimatter_depths_treasure'] },
    { piece: 'mines', name: 'Mines', rooms: ['antimatter_depths_mines'] },
    { piece: 'nature', name: 'Nature Room', rooms: ['antimatter_depths_nature'] },
    { piece: 'vault', name: 'Vault Room', rooms: ['antimatter_depths_vault'], align: 'end' },
    { piece: 'portal_room', name: 'End Portal', rooms: [], align: 'start' },
    { piece: 'start', name: 'You arrive', rooms: [] },
];

/* The render's empty sky and ground cut away: the rows of the 256px render the Depths fills, with a little air. */
const MAP_ROWS = [30, 226];

function DepthsMap({ room, onRoom }) {
    const [hover, setHover] = useState(null);
    const current = PLACES.find((p) => p.rooms.includes(room))?.piece;
    const go = (p) => { if (p.rooms.length && !p.rooms.includes(room)) onRoom(p.rooms[0]); };
    return (
        <figure className="cc-map">
            <div className="cc-map-view" style={{
                '--crop-h': `${MAP_ROWS[1] - MAP_ROWS[0]}`, '--crop-top': `${(-MAP_ROWS[0] / (MAP_ROWS[1] - MAP_ROWS[0])) * 100}%`,
                '--full': `${(256 / (MAP_ROWS[1] - MAP_ROWS[0])) * 100}%`,
            }}>
                <img src="/fib-relics/antimatter_depths.png" alt="The Antimatter Depths from above." width="256" height="256" loading="lazy" draggable="false" />
                <svg viewBox="0 0 256 256" aria-hidden="true">
                    {PLACES.map((p) => (
                        <path key={p.piece} d={DEPTHS_MAP[p.piece].d} className="cc-map-room"
                              data-loot={p.rooms.length > 0 || undefined}
                              data-on={current === p.piece || undefined}
                              data-hover={hover === p.piece || undefined}
                              onPointerEnter={() => setHover(p.piece)} onPointerLeave={() => setHover(null)}
                              onClick={() => go(p)} />
                    ))}
                </svg>
                {PLACES.map((p) => {
                    const [x, y] = DEPTHS_MAP[p.piece].at;
                    const style = { left: `${(x / 256) * 100}%`, top: `${((y - MAP_ROWS[0]) / (MAP_ROWS[1] - MAP_ROWS[0])) * 100}%` };
                    return p.rooms.length
                        ? <button key={p.piece} type="button" className="cc-map-name" style={style} data-align={p.align}
                                  aria-pressed={current === p.piece}
                                  onPointerEnter={() => setHover(p.piece)} onPointerLeave={() => setHover(null)}
                                  onFocus={() => setHover(p.piece)} onBlur={() => setHover(null)}
                                  onClick={() => go(p)}>{p.name}</button>
                        : <span key={p.piece} className="cc-map-name cc-map-name--quiet" style={style} data-align={p.align}>{p.name}</span>;
                })}
            </div>
            <figcaption className="wk-small">Choose a room to see what it holds.</figcaption>
        </figure>
    );
}

function Loot() {
    const [room, setRoom] = useState(ROOMS[0].key);
    const [opened, setOpened] = useState(null);
    // The trip's "Go in" step links straight to a room's table.
    useEffect(() => {
        const pick = (e) => { setRoom(e.detail); setOpened(null); };
        window.addEventListener('cc-room', pick);
        return () => window.removeEventListener('cc-room', pick);
    }, []);
    const pools = TABLES[room] ?? [];
    const info = ROOMS.find((r) => r.key === room);
    const open = () => {
        const times = info.containers ?? 1;
        setOpened(spread(Array.from({ length: times }, () => roll(pools)).flat()));
    };

    return (
        <section id="depths-loot" className="wk-wrap cc-sec" aria-labelledby="loot-title">
            <div className="cc-sec-head">
                <h2 id="loot-title" className="wk-h3">What the Depths hold</h2>
                <p className="wk-p">
                    Every container in the Depths draws from one of these tables.
                </p>
            </div>

            <div className="cc-loot">
                <div className="cc-loot-top">
                    <DepthsMap room={room} onRoom={(r) => { setRoom(r); setOpened(null); }} />
                    <div className="cc-loot-pick">
                        <div className="cc-rooms" role="tablist" aria-label="Rooms">
                            {ROOMS.map((r) => (
                                <button key={r.key} type="button" role="tab" aria-selected={room === r.key} onClick={() => { setRoom(r.key); setOpened(null); }}>
                                    {r.name}
                                </button>
                            ))}
                        </div>
                        <p className="wk-p cc-room-text">{info.text}</p>
                    </div>
                </div>

                <div className="cc-loot-body" role="tabpanel">
                    <div className="cc-pools">
                        {pools.map((p, pi) => (
                            <div key={pi} className="cc-pool">
                                <span className="wk-label">{pools.length > 1 && pi > 0 ? 'Then, once more: ' : ''}{p.rolls.min === p.rolls.max ? `${p.rolls.min} ${p.rolls.min === 1 ? 'draw' : 'draws'}` : `${rangeText(p.rolls)} draws`}{info.containers ? `, per ${info.containers === 27 ? 'pot' : 'minecart'}` : ''}</span>
                                <ul className="cc-drops">
                                    {p.entries.map((e, i) => {
                                        const n = dropName(e);
                                        return (
                                            <li key={i} className="cc-drop-row" data-empty={e.empty || undefined}>
                                                {e.empty ? <span className="wk-slot" style={{ '--slot': '36px' }} aria-hidden="true" /> : <Face item={{ material: e.material, src: e.src, name: n.name }} size={36} />}
                                                <span className="cc-drop-name">
                                                    <span>{n.name}{e.count && !(e.count.min === 1 && e.count.max === 1) ? <span className="cc-drop-count"> ×{rangeText(e.count)}</span> : null}</span>
                                                    {(n.also || e.notes.length > 0) && <span className="cc-drop-note">{[n.also && `Named "${n.also}"`, ...e.notes].filter(Boolean).join('. ')}</span>}
                                                </span>
                                                <span className="wk-datum cc-drop-pct">{pct(e.chance)}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="cc-open">
                        <button type="button" className="wk-btn cc-btn" onClick={open}>
                            <Dices size={16} aria-hidden="true" /> {opened ? 'Open another' : `Open ${info.containers === 27 ? 'all 27 pots' : info.containers === 2 ? 'both minecarts' : 'the chest'}`}
                        </button>
                        {opened
                            ? <Chest {...opened} />
                            : <div className="cc-chest cc-chest--shut" aria-hidden="true">{Array.from({ length: 27 }, (_, i) => <span key={i} className="wk-slot" style={{ '--slot': '44px' }} />)}</div>}
                        <p className="wk-small">
                            {opened
                                ? `${opened.drops.length ? `${opened.drops.length} ${opened.drops.length === 1 ? 'stack' : 'stacks'}` : 'Nothing this time'}${opened.drops.length > 27 ? ', more than a chest holds; the first 27 are shown' : ''}.`
                                : 'Open one to see what a single opening can hold.'}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ── Locators ───────────────────────────────────────────────────────────────── */

const LOCATORS = [
    { item: ITEM.antimatterLocator, to: 'antimatter-depths', how: 'Crafted', finds: 'An Antimatter Depths Portal ruin', spent: 'Unless someone already marked it' },
    { item: ITEM.trialLocator, to: 'trial-locator', how: 'Crafted', finds: 'Trial Chambers', spent: 'Unless someone already marked it' },
    { item: ITEM.sulfurLocator, to: 'sulfur-locator', how: 'Traded, 30% of cartographers', finds: 'A Sulfur Cave biome', spent: 'Unless someone already marked it' },
    { item: ITEM.brush, to: 'kiln-fired-brush', how: 'Smelted from a brush', finds: 'Trail Ruins', spent: 'Never' },
    { item: ITEM.journal, to: 'journal', how: 'Shipwreck map chests, Special Trader', finds: 'One of five biomes, by its note', spent: 'Yes, it falls apart' },
];

function Locators() {
    const [harder, setHarder] = useState(false);
    const journalChance = TABLES.shipwreck_map?.flatMap((p) => p.entries).find((e) => e.name === ITEM.journal.name)?.chance;
    return (
        <section id="locators" className="wk-wrap cc-sec" aria-labelledby="locators-title">
            <div className="cc-sec-head">
                <h2 id="locators-title" className="wk-h3">Locators</h2>
                <p className="wk-p">
                    Things that point you somewhere. Right-click one and you get coordinates and a trail. If another
                    player already marked the same place, a locator is <strong>not used up</strong>: keep searching for
                    one nobody has claimed. Claimed places can still be entered; this only helps you find an unlooted one.
                </p>
            </div>

            <table className="cc-table">
                <thead><tr><th scope="col">Item</th><th scope="col">How you get it</th><th scope="col">What it finds</th><th scope="col">Used up</th></tr></thead>
                <tbody>
                    {LOCATORS.map((l) => (
                        <tr key={l.item.name}>
                            <th scope="row"><a className="cc-table-item" href={`#${l.to}`}><Face item={l.item} size={36} />{l.item.name}</a></th>
                            <td>{l.how}</td><td>{l.finds}</td><td>{l.spent}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="cc-cards">
                <article id="trial-locator" className="cc-card">
                    <h3 className="wk-name">Trial Locator</h3>
                    <p className="wk-p">Finds Trial Chambers, the vanilla structure. The recipe is the one locator a setting changes: <strong>Harder trackers</strong> asks for more.</p>
                    <div className="cc-seg" role="radiogroup" aria-label="Which recipe">
                        <button type="button" role="radio" aria-checked={!harder} onClick={() => setHarder(false)}>Standard</button>
                        <button type="button" role="radio" aria-checked={harder} onClick={() => setHarder(true)}>Harder trackers</button>
                    </div>
                    <Craft grid={harder ? RECIPES.trialHarder : RECIPES.trial} result={ITEM.trialLocator} caption={harder ? 'With Harder trackers on in /settings.' : 'The recipe when Harder trackers is off.'} />
                    <p className="wk-small">In game: <Typed>/info trial_locator</Typed></p>
                </article>

                <article id="sulfur-locator" className="cc-card">
                    <h3 className="wk-name">Sulfur Locator</h3>
                    <p className="wk-p">
                        Tracks a <strong>biome</strong>, the Sulfur Cave, and cannot be crafted. Each Cartographer has a 30% chance
                        to offer it. If yours did not, break and replace their job block to reset the profession and roll again.
                    </p>
                    <Exchange give={[{ item: v('emerald'), count: 6 }, { item: v('compass') }]} via={{ label: 'Cartographer', figure: <Villager kind="CARTOGRAPHER" /> }} get={{ item: ITEM.sulfurLocator }} caption="30% per cartographer; reroll by resetting their job block." />
                    <p className="wk-small">In game: <Typed>/info sulfur_locator</Typed></p>
                </article>

                <article id="kiln-fired-brush" className="cc-card">
                    <h3 className="wk-name">Kiln-Fired Brush</h3>
                    <p className="wk-p">
                        Finds Trail Ruins, buried shallow enough to walk over all round without noticing. Smelt any brush in a
                        furnace and it comes out fired. Right-click grass, sand, mud, podzol, coarse dirt or snow with it and
                        footprints are dusted across the ground to the nearest ruins. It is a tool, never used up, and it still
                        brushes suspicious sand and gravel as normal.
                    </p>
                    <Exchange give={[{ item: v('brush') }]} via={{ item: v('furnace'), label: null }} get={{ item: ITEM.brush }} caption="Any brush, any furnace, no chance involved." />
                    <p className="wk-small">In game: <Typed>/info kiln_fired_brush</Typed></p>
                </article>

                <article id="journal" className="cc-card">
                    <h3 className="wk-name">Weathered Captain's Journal</h3>
                    <p className="wk-p">
                        In {journalChance ? <span className="wk-datum">{pct(journalChance)}</span> : 'some'} of shipwreck map chests,
                        and sold by the Special Trader. Right-click it and it falls apart, leaving a single <strong>Faded Note</strong>:
                        right-click the note and it points you to the nearest biome it describes, the way a locator points at a
                        structure. Which note you get is random, each of the five equally likely.
                    </p>
                    <ul className="cc-notes">
                        {BIOME_NOTES.map((n) => (
                            <li key={n.biome} className="cc-note">
                                <Face item={{ ...ITEM.note, name: `Faded Note - ${n.biome}` }} size={40} />
                                <span><span className="cc-note-name">{n.biome}</span><span className="cc-note-flavor">"{n.flavor}"</span></span>
                                <span className="wk-datum cc-note-pct">20%</span>
                            </li>
                        ))}
                    </ul>
                </article>
            </div>
        </section>
    );
}

/* model/BiomeNote: one of each note's three flavour lines. */
const BIOME_NOTES = [
    { biome: 'Desert', flavor: 'a sea of dunes where no water runs' },
    { biome: 'Badlands', flavor: 'broken hills streaked with rust and clay' },
    { biome: 'Warm Ocean', flavor: 'bright reefs beneath a warm tide' },
    { biome: 'Pale Garden', flavor: 'ghostly woods where the leaves hang grey' },
    { biome: 'Cherry Grove', flavor: 'hills awash in falling pink petals' },
];

/* ── Traders ────────────────────────────────────────────────────────────────── */

/*
 * Two offers are rolled when the trader arrives, so they are drawn turning through
 * what they can be: the three locators, the four iron armour pieces. The shuffle
 * lived on Gameplay's copy of these offers, and came here with them when Gameplay
 * handed the offers back to this page.
 */
const SPECIAL = [
    { price: 1, get: { item: { ...ITEM.wheel, name: 'Wheels of Fortune' }, count: 3 }, note: 'Three for one emerald: the reason to run.' },
    { price: 5, get: { item: ITEM.journal }, note: 'Otherwise only found in shipwrecks.' },
    { price: 5, get: { item: { name: 'A random locator' }, shuffle: [ITEM.antimatterLocator, ITEM.trialLocator, ITEM.sulfurLocator] }, note: 'Antimatter, Trial or Sulfur, rolled when the trader arrives.' },
    { price: 5, get: { item: { ...v('iron_pickaxe'), name: 'Iron Pickaxe' } }, note: 'Enchanted at level 30, no treasure enchantments.' },
    { price: 5, get: { item: { name: 'An iron armour piece' }, shuffle: ['iron_helmet', 'iron_chestplate', 'iron_leggings', 'iron_boots'].map(v) }, note: 'A random piece, enchanted at level 30.' },
];

/** An offer rolled on arrival, turning through what it can be while it is on screen. */
function Shuffle({ items, size }) {
    const calm = useCalm();
    const ref = useRef(null);
    const on = useOnScreen(ref);
    const [i, setI] = useState(0);
    const step = useCallback(() => setI((n) => (n + 1) % items.length), [items.length]);
    useTicker(step, 1600, on && !calm);
    return <span ref={ref} className="cc-shuffle"><Face key={items[i].name} item={items[i]} size={size} className={i || on ? 'cc-drop' : ''} /></span>;
}

function Traders({ go }) {
    return (
        <section id="traders" className="wk-wrap cc-sec" aria-labelledby="traders-title">
            <div className="cc-sec-head">
                <h2 id="traders-title" className="wk-h3">Traders</h2>
                <p className="wk-p">
                    Two traders arrive near spawn during a round. When one appears its coordinates are announced in chat,
                    drawn as a particle trail and pinned in the tab list with a countdown. Everyone gets their <strong>own</strong>{' '}
                    copy of the offers, so nobody can buy the good trade out from under you.
                </p>
            </div>

            <div className="cc-cards">
                <article className="cc-card cc-card--trader">
                    <Trader kind="WANDERING" />
                    <p className="wk-p">
                        First 7 to 10 minutes into the round, then again 7 to 10 minutes after each one leaves; each stays
                        5 minutes. Its offers are vanilla, with every
                        price cut to <strong>a single item</strong>, usually one emerald, and it also sells Wheels of Fortune
                        at one emerald each.
                    </p>
                    <Exchange give={[{ item: v('emerald'), count: 1 }]} via={{ label: 'Wandering Trader' }} get={{ item: ITEM.wheel }} caption="Alongside its vanilla offers, each at one emerald." />
                </article>

                <article className="cc-card cc-card--trader">
                    <Trader kind="SPECIAL" />
                    <p className="wk-p">
                        A random event, at most once a round, and gone after 5 minutes. Its five offers are rolled when it
                        arrives, so everyone sees the same five, and each is <strong>one purchase per player</strong>.{' '}
                        <a className="wk-link" href="/gameplay#events" onClick={go('gameplay#events')}>How random events work</a>
                    </p>
                    <ul className="cc-offers">
                        {SPECIAL.map((o) => (
                            <li key={o.get.item.name} className="cc-offer">
                                <span className="cc-offer-draw" aria-hidden="true">
                                    <Face item={v('emerald')} size={36} count={o.price} />
                                    <To />
                                    {o.get.shuffle
                                        ? <Shuffle items={o.get.shuffle} size={44} />
                                        : <Face item={o.get.item} size={44} count={o.get.count} />}
                                </span>
                                <span className="cc-offer-text">
                                    <span className="cc-offer-name">{o.get.count ? `${o.get.count} ` : ''}{o.get.item.name}<span className="wk-sr">, for {o.price} {o.price === 1 ? 'emerald' : 'emeralds'}</span></span>
                                    <span className="wk-small">{o.note}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </article>
            </div>
        </section>
    );
}

/* ── The world ──────────────────────────────────────────────────────────────── */

function World() {
    const chest = TABLES.teleporter?.[0]?.entries ?? [];
    return (
        <section id="world" className="wk-wrap cc-sec" aria-labelledby="world-title">
            <div className="cc-sec-head">
                <h2 id="world-title" className="wk-h3">The world, changed</h2>
            </div>
            <div className="cc-cards">
                <article id="end-generation" className="cc-card">
                    <h3 className="wk-name">The End</h3>
                    <p className="wk-p">
                        Redesigned for pace: the surface is solid, with <strong>no void gaps</strong>, and End Cities spawn more
                        often, so end-game loot is closer.
                    </p>
                </article>
                <article id="teleporter" className="cc-card cc-card--render">
                    <img className="cc-card-render" src="/fib-relics/antimatter_teleporter.png" alt="The Antimatter Teleporter: a tall dark spire over a purple portal." width="256" height="256" loading="lazy" draggable="false" />
                    <h3 className="wk-name">Antimatter Teleporter</h3>
                    <p className="wk-p">
                        A structure that appears at random in the Overworld and <strong>cannot be located</strong>: you have to
                        stumble on it. Step in and it throws you 5,000 to 10,000 blocks in a random direction, useful when the
                        biome you need is nowhere near. A hidden room under the portal holds a chest:
                    </p>
                    <ul className="cc-drops cc-drops--inline">
                        {chest.map((e, i) => {
                            const n = dropName(e);
                            return (
                                <li key={i} className="cc-drop-row">
                                    <Face item={{ material: e.material, src: e.src, name: n.name }} size={40} />
                                    <span className="cc-drop-name"><span>{n.name}</span>{n.also && <span className="cc-drop-note">Named "{n.also}"</span>}</span>
                                    <span className="wk-datum cc-drop-pct">{pct(e.chance)}</span>
                                </li>
                            );
                        })}
                    </ul>
                </article>
            </div>
        </section>
    );
}

/* ── The page ───────────────────────────────────────────────────────────────── */

export default function CustomStructures({ onNavigate }) {
    const go = useGo(onNavigate);
    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get('to');
        if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }, []);

    return (
        <main className="pg cc">
            <header className="wk-wrap pg-head">
                <h1 className="wk-h2">Custom Content</h1>
                <p className="wk-lede">
                    FIB was made for short rounds, which meant leaving out harder parts of Minecraft like the End. Instead of
                    leaving them out, we built structures and items that bring them within reach.
                </p>
                <nav className="cc-contents" aria-label="The custom items">
                    <span className="wk-label">The custom items</span>
                    <ul>
                        {CONTENTS.map((c) => (
                            <li key={c.item.name}>
                                <a className="cc-content" href={`#${c.to}`}>
                                    <Face item={c.item} size={48} />
                                    <span>{c.item.name}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
                <nav className="cc-toc" aria-label="On this page">
                    <span className="wk-label">On this page</span>
                    {SECTIONS.map(([id, label]) => <a key={id} className="wk-link" href={`#${id}`}>{label}</a>)}
                </nav>
            </header>
            <Depths />
            <Loot />
            <Locators />
            <Traders go={go} />
            <World />
            <PageLinks ids={['pools', 'gameplay', 'how-to-play', 'commands']} go={go} />
            <Footer />
        </main>
    );
}
