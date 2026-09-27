import React, { useEffect, useMemo, useRef, useState } from 'react';
import Footer from '../components/common/Footer.jsx';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import Check from 'lucide-react/dist/esm/icons/check';
import Dices from 'lucide-react/dist/esm/icons/dices';
import { useCalm } from '../config/power.js';
import Environment from '../wiki/Environment.jsx';
import RouteMap from '../wiki/RouteMap.jsx';
import { ItemSlot, SlotGrid, TagGlyph, TooltipLayer } from '../wiki/items.jsx';
import {
    ALL_POOL, ATLAS_POOL_SIZE, PINNED_COUNT, POOL_BY_STAGE, POOL_SETTINGS,
    itemName, pick, regionItems, regionSlots, stageOf, tagsOf, whereOf,
} from '../wiki/atlas.js';
import { ITEM_TAGS } from '../wiki/atlas.data.js';
import { DEALABLE, ROUTES_VERSION, countLabel, dealableFrom, routesFor, showsOdds } from '../wiki/routes.js';
import { FIND_RARITY, GAUGE, REGION, REGIONS, STAGES, TAGS } from '../wiki/tokens.js';
import '../wiki/home.css';

/*
 * The home page - the reference implementation of THE EXPLORER'S ATLAS.
 *
 * It tells the game in the order a player lives it. You are handed an item. You work
 * out how to get it (the route map: every real way Minecraft allows). You get it, it
 * counts, the next one replaces it with no pause (the loop). Meanwhile the clock
 * runs and the pool only grows harder (the pressure). Sometimes the right move is to
 * skip it, or you are lucky and already holding it (the escapes). Only then the
 * world, as the toolbox all of this draws on, and the three modes, each drawn as its
 * own mechanic.
 *
 * An earlier version opened on the world instead, and read as a game about which
 * biome an item lives in. It is not: the world is the solution space, not the point.
 *
 * Nothing here that the game already knows is typed in by hand. The pool, stages,
 * tags and server settings come from the plugin and config.yml (vendor-pool.mjs);
 * the routes from Minecraft's own data for the server's version (vendor-routes.mjs).
 */

// Same renderer as the wheel's heads - see getMinecraftHeadUrl for why not mc-heads.
const MC_HEAD = (u) => `https://minotar.net/helm/${u}/100`;
const GH_AVT = (u) => `https://github.com/${u}.png?size=100`;

const fmt = (n) => n.toLocaleString('en-US');

/* ── Content that is not derived ───────────────────────────────────────────── */

/*
 * Examples for "or try one of these": chosen by hand to show how differently the
 * problem can be shaped (a recipe, a structure only, a mob or fishing or a trader,
 * the Nether, the End). The routes shown for them are still the derived ones.
 */
const EXAMPLES = ['FIRE_CHARGE', 'BREAD', 'ECHO_SHARD', 'NAUTILUS_SHELL', 'ENDER_PEARL', 'NETHERITE_INGOT', 'WHITE_WOOL']
    .filter((m) => routesFor(m).length);

const MODES = [
    { key: 'fib', name: 'ForceItemBattle', hook: 'Collect more items than everyone else before time runs out.',
      text: 'Every player draws from the same item pool, which progresses through Early, Mid, and Late tiers as the round goes on.' },
    { key: 'run', name: 'RunBattle', hook: 'First to claim the target item takes the point.',
      text: 'A single item is active for all players at once. The first to collect it scores, and everyone else resets to chase the next one.' },
    { key: 'chain', name: 'ForceChain', hook: 'Your next item is always visible. Plan two moves ahead.',
      text: 'You can always see both your current item and the one after it. The best players route for both at once.' },
];

const PAGES = [
    { id: 'how-to-play', name: 'How to Play', face: 'CRAFTING_TABLE', text: 'Join our server, or host a round yourself with the plugin, pack and datapack.' },
    { id: 'gameplay', name: 'Gameplay', face: 'COMPASS', text: 'The loop, the three modes, the pool stages and strategy.' },
    { id: 'pools', name: 'Item Pools', face: 'CHEST', text: 'Every item the game can hand you, by stage and tag.' },
    { id: 'structures', name: 'Custom Content', face: 'STRUCTURE_BLOCK', text: 'The structures and items built for this edition.' },
    { id: 'commands', name: 'Commands', face: 'COMMAND_BLOCK', text: 'Every command, what it does and who can use it.' },
    { id: 'settings', name: 'Game Settings', face: 'COMPARATOR', text: 'What each round setting changes.' },
    { id: 'rules', name: 'Rules', face: 'WRITABLE_BOOK', text: 'How to play fair here, and which mods are not allowed.' },
    { id: 'changelog', name: 'Changelog', face: 'BOOK', text: 'Every release, newest first.' },
    { id: 'stats', name: 'Stats', face: 'SPYGLASS', text: 'Players, matches, achievements and rankings, live from the server.', exit: true },
    { id: 'wheel', name: 'Wheel of Fortune', src: '/fib-custom/wheel.png', text: 'Spin for items and fill your collection book.', exit: true },
];

const TEAM = [
    { name: 'threeseconds', role: 'Core Development' },
    { name: 'eltobito', role: 'Content, Datapacks & Resource Packs' },
    { name: 'stupxd', role: 'Bug Fixing & Quality' },
    { name: 'apppaa', role: 'Item Descriptions' },
    { name: 'CH0RD', role: 'Structure Design' },
];

const THANKS = [
    { name: '170yt', role: 'Original project this forked from', link: 'https://github.com/170yt/ForceItemBattle' },
    { name: 'McPlayHD', role: 'Server infrastructure', link: 'https://github.com/mcplayhd' },
    { name: 'Owen1212055', role: 'Item renders for the Resource Pack', link: 'https://github.com/Owen1212055/mc-assets' },
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** An in-app link that is still a real link: middle-click and copy work. */
function useGo(onNavigate) {
    return (id) => (e) => {
        if (!onNavigate || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        onNavigate(id);
    };
}

/** How many slot columns fit a container, kept current as it resizes. */
function useColumns(ref, slot, gap = 2) {
    const [cols, setCols] = useState(8);
    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const measure = () => setCols(Math.max(4, Math.floor((el.clientWidth + gap) / (slot + gap))));
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [ref, slot, gap]);
    return cols;
}

/** True while an element is on screen, so off-screen loops cost nothing. */
function useOnScreen(ref) {
    const [on, setOn] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting));
        io.observe(el);
        return () => io.disconnect();
    }, [ref]);
    return on;
}

/** n distinct picks, fixed for the life of the page. */
function usePicks(list, n) {
    return useMemo(() => {
        const out = new Set();
        while (out.size < Math.min(n, list.length)) out.add(pick(list));
        return [...out];
    }, [list, n]);
}

const regionOf = (m) => REGION[whereOf(m)?.region] ?? REGION.surface;

/* ── The draw ────────────────────────────────────────────────────────────────
 * The game's verb, and the page's one fast motion: a riffle through wrong items at
 * ~55ms, then the real one lands. One draw drives the hero and the route map, so
 * "Draw another" anywhere deals both.
 */

function useDraw(calm) {
    const [target, setTarget] = useState(() => pick(DEALABLE));
    const [face, setFace] = useState(target);
    const [landed, setLanded] = useState(0);
    const timer = useRef(0);
    const riffle = useMemo(() => Array.from({ length: 18 }, () => pick(ALL_POOL)), []);

    useEffect(() => {
        riffle.forEach((m) => { const i = new Image(); i.src = `/fib-items/${m.toLowerCase()}.png`; });
    }, [riffle]);

    const draw = (next = pick(DEALABLE.filter((m) => m !== target))) => {
        window.clearInterval(timer.current);
        if (calm) { setTarget(next); setFace(next); setLanded((n) => n + 1); return; }
        // Land only once the real sprite is decoded. A browser keeps painting the
        // old src until the new one arrives, so landing early showed the last wrong
        // item under the right name.
        let ready = false;
        const img = new Image();
        img.onload = img.onerror = () => { ready = true; };
        img.src = `/fib-items/${next.toLowerCase()}.png`;
        let i = 0;
        timer.current = window.setInterval(() => {
            if (i < 6 || (!ready && i < 24)) { setFace(riffle[(i * 5 + landed * 3) % riffle.length]); i += 1; return; }
            window.clearInterval(timer.current);
            setFace(next);
            setTarget(next);
            setLanded((n) => n + 1);
        }, 55);
    };

    // One arrival on load: the page opens by handing you something.
    useEffect(() => {
        draw(target);
        return () => window.clearInterval(timer.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { target, face, landed, draw };
}

/* ── 1. The item you were handed ─────────────────────────────────────────── */

function Opening({ go, deal }) {
    const { target, face, landed, draw } = deal;
    const region = regionOf(target);
    const pinned = Boolean(whereOf(target));
    const stage = stageOf(target);
    const tags = tagsOf(target);

    return (
        <section className="hm-open" aria-labelledby="hm-title">
            <div className="wk-wrap hm-open-grid">
                <div className="hm-open-copy">
                    <h1 id="hm-title" className="wk-d1">ForceItemBattle</h1>
                    <p className="wk-lede">
                        A competitive Minecraft gamemode where players race to collect randomly assigned items.
                        Find yours, get the next one. Whoever collects the most <strong>before time runs out</strong> wins.
                    </p>
                    <p className="wk-small hm-open-note">
                        Popularised by{' '}
                        <a className="wk-link" href="https://www.youtube.com/@BastiGHG" target="_blank" rel="noopener noreferrer">BastiGHG</a>.
                        {' '}This is the <strong>McPlayHD.net</strong> edition: our rules, our balance, our world.
                    </p>
                    <div className="hm-open-actions">
                        <a className="wk-btn" href="/how-to-play" onClick={go('how-to-play')}>
                            How to play <ArrowRight size={16} aria-hidden="true" />
                        </a>
                        <a className="wk-btn wk-btn--quiet" href="/pools" onClick={go('pools')}>Browse the item pool</a>
                    </div>
                </div>

                {/* The item is the object the page revolves around: no card, no
                    slot, just the thing itself standing in the light of where it
                    comes from. */}
                <div className="hm-target" style={{ '--region': region.light, '--region-ink': region.ink }}>
                    <div className="hm-target-env" key={region.key}>
                        <Environment region={region.key} seed={3} light={0.3} />
                    </div>
                    <div className="hm-hero-item" data-landed={landed % 2} aria-hidden="true">
                        <img className="hm-hero-sprite" src={`/fib-items/${face.toLowerCase()}.png`} alt="" width="128" height="128" draggable="false" />
                        <span className="hm-hero-shadow" />
                    </div>
                    <div className="hm-hero-facts" aria-live="polite">
                        <h2 className="hm-hero-name">{itemName(target)}</h2>
                        <p className="hm-hero-line">
                            {stage && <span><span style={{ color: STAGES[stage].ink }}>{STAGES[stage].label}</span> item</span>}
                            {tags.map((t) => (
                                <span key={t} className="hm-hero-tag" style={{ color: TAGS[t]?.ink }}>
                                    <TagGlyph tag={t} size={10} /> {TAGS[t]?.label}
                                </span>
                            ))}
                        </p>
                        {/* Only where the data pins it. An unpinned item still stands in
                            a place (the scenery needs one), but the page does not claim
                            the item comes from there. */}
                        {pinned && (
                            <p className="hm-hero-line">
                                <span style={{ color: region.ink }}>{region.name}</span>
                                <span className="hm-hero-dim"> {GAUGE[region.key]}</span>
                            </p>
                        )}
                        <div className="hm-hero-actions">
                            <button type="button" className="wk-btn wk-btn--quiet hm-draw" onClick={() => draw()}>
                                <Dices size={16} aria-hidden="true" /> Draw another
                            </button>
                            <a className="wk-link hm-hero-how" href="#hm-routes-title">How would you get it?</a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ── 2. One item, many ways ──────────────────────────────────────────────── */

function Routes({ deal, calm }) {
    const { target, draw } = deal;
    const region = regionOf(target);
    return (
        <section className="wk-wrap hm-routes" aria-labelledby="hm-routes-title" style={{ '--region': region.light }}>
            <div className="hm-routes-head">
                <h2 id="hm-routes-title" className="wk-h2">One item. Many ways to get it.</h2>
                <p className="wk-p">
                    The game hands you an item and nothing else. Every way Minecraft offers to get it is open, and the
                    round goes to whoever picks the fastest one from where they are standing.
                </p>
                <div className="hm-routes-actions">
                    <button type="button" className="wk-btn wk-btn--quiet" onClick={() => draw()}>
                        <Dices size={16} aria-hidden="true" /> Draw another
                    </button>
                    <span className="hm-try" role="group" aria-label="Or try one of these">
                        <span className="hm-try-label">Or try</span>
                        {EXAMPLES.map((m) => (
                            <button key={m} type="button" className="hm-try-item" aria-pressed={m === target}
                                    aria-label={itemName(m)} onClick={() => draw(m)}>
                                <ItemSlot material={m} size={40} tip={false} marks={false} />
                            </button>
                        ))}
                    </span>
                </div>
            </div>
            <RouteMap material={target} jokers={POOL_SETTINGS.jokers} calm={calm} />
            <p className="hm-source">
                Routes from Minecraft {ROUTES_VERSION}&rsquo;s own recipes, loot tables and trades.
                {showsOdds(target) && <> Odds from the item&rsquo;s /info.</>}
            </p>
        </section>
    );
}

/* ── 3. The loop ─────────────────────────────────────────────────────────────
 * A round, sped up: an item arrives, it is found, it counts, the next replaces it.
 * Labelled as an illustration because the items are dealt, not played.
 */

const BEATS = ['Draw', 'Think', 'Route', 'Obtain', 'Score', 'Next'];
const BEAT_MS = 340;

function Loop({ calm }) {
    const ref = useRef(null);
    const onScreen = useOnScreen(ref);
    const early = useMemo(() => dealableFrom(POOL_BY_STAGE.EARLY), []);
    // The count always equals the checked items behind it, including standing still.
    const [state, setState] = useState(() => {
        const trail = Array.from({ length: 7 }, () => pick(early));
        return { beat: 0, score: trail.length, current: pick(early), trail };
    });

    useEffect(() => {
        if (calm || !onScreen) return undefined;
        const t = window.setInterval(() => {
            setState((s) => {
                const beat = (s.beat + 1) % BEATS.length;
                if (BEATS[beat] === 'Score') return { ...s, beat, score: s.score + 1, trail: [s.current, ...s.trail].slice(0, 7) };
                if (BEATS[beat] === 'Next') return { ...s, beat, current: pick(early) };
                return { ...s, beat };
            });
        }, BEAT_MS);
        return () => window.clearInterval(t);
    }, [calm, onScreen, early]);

    const beat = calm ? 4 : state.beat;
    return (
        <section ref={ref} className="wk-wrap hm-loop" aria-labelledby="hm-loop-title">
            <div className="hm-loop-head">
                <h2 id="hm-loop-title" className="wk-h2">Found it. +1. Next.</h2>
                <p className="wk-p">
                    There is no downtime. The moment an item counts, the next one replaces it, and the clock never
                    stops. A round is this, over and over, as fast as you can route.
                </p>
            </div>
            <figure className="hm-loop-strip">
                <div className="hm-loop-score" aria-hidden="true">
                    <span className="hm-loop-score-n">{state.score}</span>
                    <span className="hm-loop-score-k">found</span>
                </div>
                <div className="hm-loop-now" data-beat={BEATS[beat].toLowerCase()} aria-hidden="true">
                    <ItemSlot material={state.current} size={80} tip={false} key={state.current} />
                    <span className="hm-loop-found"><Check size={14} strokeWidth={3} /> Found</span>
                    <span className="hm-loop-plus">+1</span>
                </div>
                <ol className="hm-loop-trail" aria-hidden="true">
                    {state.trail.map((m, i) => (
                        <li key={`${m}-${i}-${state.score}`} style={{ '--i': i }}>
                            <ItemSlot material={m} size={48} tip={false} marks={false} />
                            <span className="hm-loop-check"><Check size={11} strokeWidth={3} /></span>
                        </li>
                    ))}
                </ol>
                <ol className="hm-beats">
                    {BEATS.map((b, i) => (
                        <li key={b} aria-current={i === beat ? 'step' : undefined}>{b}</li>
                    ))}
                </ol>
                <figcaption className="hm-source">Illustration: a round, sped up, dealing real Early items.</figcaption>
            </figure>
        </section>
    );
}

/* ── 4. The pressure ─────────────────────────────────────────────────────────
 * The round clock, drawn as what it does: the pool steps up at 11% and 29% and
 * never steps down. Layer heights are to scale with each stage's item count.
 */

const BOUNDS = [['EARLY', 0], ['MID', 11], ['LATE', 29]];

function Pressure({ target }) {
    const counts = { EARLY: POOL_BY_STAGE.EARLY.length, MID: POOL_BY_STAGE.MID.length, LATE: POOL_BY_STAGE.LATE.length };
    const total = counts.EARLY + counts.MID + counts.LATE;
    const cumulative = { EARLY: counts.EARLY, MID: counts.EARLY + counts.MID, LATE: total };
    const examples = {
        EARLY: usePicks(dealableFrom(POOL_BY_STAGE.EARLY), 5),
        MID: usePicks(dealableFrom(POOL_BY_STAGE.MID), 5),
        LATE: usePicks(dealableFrom(POOL_BY_STAGE.LATE), 5),
    };
    const youStage = stageOf(target);
    const youAt = youStage ? STAGES[youStage].at : null;
    return (
        <section className="wk-wrap hm-pressure" aria-labelledby="hm-pressure-title">
            <div className="hm-pressure-head">
                <h2 id="hm-pressure-title" className="wk-h2">The round clock</h2>
                <p className="wk-p">
                    Early items can come up from the first second. Mid items join at 11% of the round&rsquo;s time and
                    Late items at 29%, and nothing ever leaves. The longer the round runs, the more of what you can be
                    handed is hard.
                </p>
            </div>
            <figure className="hm-growth">
                <div className="hm-growth-plot" role="img"
                     aria-label={`Items that can be handed out: ${fmt(cumulative.EARLY)} from the start, ${fmt(cumulative.MID)} from 11% of the round, ${fmt(cumulative.LATE)} from 29%.`}>
                    {/* Stacked: each stage sits on the ones already in the pool. */}
                    {BOUNDS.map(([k, at]) => (
                        <span key={k} className="hm-growth-layer"
                              style={{ '--at': at, '--b': (cumulative[k] - counts[k]) / total, '--h': counts[k] / total, '--c': STAGES[k].light }} />
                    ))}
                    {/* Real items of each stage, sitting in their layer right where
                        that stage enters the pool. */}
                    {BOUNDS.map(([k, at]) => (
                        <span key={`i-${k}`} className="hm-growth-items"
                              style={{ '--at': at, '--b': (cumulative[k] - counts[k]) / total, '--h': counts[k] / total }}>
                            {examples[k].map((m) => <ItemSlot key={m} material={m} size={32} marks={false} />)}
                        </span>
                    ))}
                    {BOUNDS.map(([k, at]) => (
                        <span key={`n-${k}`} className="hm-growth-n" style={{ '--at': at, '--y': cumulative[k] / total }}>
                            {fmt(cumulative[k])}
                        </span>
                    ))}
                </div>
                <div className="hm-growth-axis">
                    {[0, 11, 29, 100].map((p) => <span key={p} className="hm-growth-tick" style={{ '--at': p }} aria-hidden="true">{p}%</span>)}
                    {youStage && (
                        <span className="hm-growth-you" style={{ '--at': youAt }}>
                            <ItemSlot material={target} size={32} tip={false} marks={false} />
                            <span>Your {itemName(target)} can come up from {youAt}%</span>
                        </span>
                    )}
                </div>
            </figure>
            <ol className="hm-stages">
                {BOUNDS.map(([k, at]) => (
                    <li key={k} className="hm-stage">
                        <span className="hm-stage-name" style={{ color: STAGES[k].ink }}>{STAGES[k].label}</span>
                        <span className="hm-stage-meta">from {at}% · {fmt(counts[k])} items</span>
                    </li>
                ))}
            </ol>
        </section>
    );
}

/* ── 5. The escapes ──────────────────────────────────────────────────────── */

/** A route in a few words: its verb and its first ingredients or sources. */
function routeLine(r) {
    if (!r) return '';
    const what = r.chain
        ? r.chain.map((c) => countLabel(c.n, c.label.toLowerCase())).join(' + ')
        : r.sources.slice(0, 2).map((s) => s.label).join(' or ');
    return `${r.verb}: ${what}`;
}

/*
 * The joker's trade, drawn with the route data. The item worth skipping is dealt from
 * the Late items that only another dimension offers and no recipe makes; the item it
 * trades for is an Early one you can craft. Each shows its real first route, so the
 * "is it worth it" is visible, not asserted.
 */
function Escapes() {
    const costly = useMemo(() => dealableFrom(POOL_BY_STAGE.LATE).filter((m) => {
        const t = tagsOf(m);
        return (t.includes('END') || t.includes('NETHER')) && !routesFor(m).some((r) => r.kind === 'craft');
    }), []);
    const cheap = useMemo(() => dealableFrom(POOL_BY_STAGE.EARLY).filter((m) => routesFor(m)[0]?.kind === 'craft'), []);
    const [skipped] = usePicks(costly.length ? costly : dealableFrom(POOL_BY_STAGE.LATE), 1);
    const [next] = usePicks(cheap.length ? cheap : dealableFrom(POOL_BY_STAGE.EARLY), 1);
    const skipTag = tagsOf(skipped).find((t) => t === 'END' || t === 'NETHER');
    const { jokers } = POOL_SETTINGS;
    return (
        <section className="wk-wrap hm-escapes" aria-labelledby="hm-escapes-title">
            <h2 id="hm-escapes-title" className="wk-h2">When it isn&rsquo;t worth it</h2>
            <div className="hm-escapes-grid">
                <div className="hm-joker">
                    <div className="hm-trade">
                        <div className="hm-trade-item" style={{ '--glow': skipTag ? TAGS[skipTag].ink : STAGES.LATE.light }}>
                            <ItemSlot material={skipped} size={64} tip={false} />
                            <span className="hm-trade-name">{itemName(skipped)}</span>
                            <span className="hm-trade-route">
                                {skipTag && <span style={{ color: TAGS[skipTag].ink }}>{TAGS[skipTag].label} only. </span>}
                                {routeLine(routesFor(skipped)[0])}
                            </span>
                        </div>
                        <div className="hm-trade-joker" aria-hidden="true">
                            <ArrowRight size={18} className="hm-joker-arrow" />
                            <span className="hm-joker-card"><img src="/fib-custom/barrier.png" alt="" /></span>
                            <ArrowRight size={18} className="hm-joker-arrow" />
                        </div>
                        <div className="hm-trade-item" style={{ '--glow': STAGES.EARLY.light }}>
                            <ItemSlot material={next} size={64} tip={false} />
                            <span className="hm-trade-name">{itemName(next)}</span>
                            <span className="hm-trade-route">{routeLine(routesFor(next)[0])}</span>
                        </div>
                    </div>
                    <h3 className="hm-mech">Jokers</h3>
                    <p className="wk-p">
                        Some items cost more time than they are worth: another dimension, a structure you have not
                        found. Spend a joker, skip it, and the next item arrives straight away. You get{' '}
                        <strong>{jokers}</strong> a round on this server, so choose which items to give up.
                    </p>
                    <div className="hm-joker-hand" aria-label={`${jokers} jokers`}>
                        {Array.from({ length: jokers }, (_, i) => (
                            <span key={i} className="hm-joker-card hm-joker-card--small" style={{ '--i': i }}>
                                <img src="/fib-custom/barrier.png" alt="" />
                            </span>
                        ))}
                    </div>
                </div>

                <div className="hm-b2b">
                    <h3 className="hm-mech">Back-to-backs</h3>
                    <p className="wk-p">
                        Or you get lucky. When the item you are handed is already in your inventory, backpack or a
                        bundle, it counts on the spot. The game grades how unlikely that was from what you were
                        holding and the size of the pool, and the rarest grades are heard by the whole server.
                    </p>
                    <ol className="hm-ladder">
                        {FIND_RARITY.map((f) => (
                            <li key={f.key} className="hm-rung" style={{ '--f': f.ink, '--f-from': f.from ?? f.ink, '--f-to': f.to ?? f.ink }}>
                                <span className="hm-rung-bar" aria-hidden="true" />
                                <span className="hm-rung-name">{f.label}</span>
                                <span className="hm-rung-when">{f.when}</span>
                                {(f.key === 'LEGENDARY' || f.key === 'RNGESUS') && <span className="hm-rung-note">Server-wide</span>}
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </section>
    );
}

/* ── 6. The world, as the toolbox ────────────────────────────────────────── */

function RegionBand({ region, index, go }) {
    const items = regionItems(region.key);
    const slots = regionSlots(region.key);
    const gridRef = useRef(null);
    const slot = 52;
    const cols = useColumns(gridRef, slot);
    const rows = slots.length > cols * 2 ? 3 : 2;
    const cap = cols * rows;
    const shown = slots.length > cap ? slots.slice(0, cap - 1) : slots;
    const rest = items.length - shown.reduce((n, s) => n + (s.members?.length ?? 1), 0);
    const [light, setLight] = useState(0.7);
    const bandRef = useRef(null);
    const onPoint = (_, el) => {
        const b = bandRef.current?.getBoundingClientRect();
        const s = el?.getBoundingClientRect();
        if (b && s) setLight((s.left + s.width / 2 - b.left) / b.width);
    };
    return (
        <section
            ref={bandRef}
            id={`region-${region.key}`}
            className="hm-band"
            style={{ '--r': region.light, '--r-ink': region.ink }}
            aria-labelledby={`region-${region.key}-name`}
        >
            <Environment region={region.key} seed={11 + index * 17} light={light} />
            <div className="wk-wrap hm-band-in">
                <header className="hm-band-meta">
                    <h3 id={`region-${region.key}-name`} className="wk-h3 hm-band-name">{region.name}</h3>
                    <p className="hm-band-y">{region.y}</p>
                    <p className="wk-small hm-band-blurb">{region.blurb}</p>
                    <p className="hm-band-count"><span className="wk-figure">{fmt(items.length)}</span> items pinned here</p>
                </header>
                <div ref={gridRef} className="hm-band-grid">
                    <SlotGrid
                        items={shown}
                        size={slot}
                        label={`${region.name}: ${items.length} items`}
                        onPoint={onPoint}
                        after={rest > 0 && (
                            <a className="hm-more" href="/pools" onClick={go('pools')}
                               aria-label={`${rest} more ${region.name} items in Item Pools`}>
                                +{rest}
                            </a>
                        )}
                    />
                </div>
            </div>
        </section>
    );
}

function World({ go, calm }) {
    const jump = (key) => document.getElementById(`region-${key}`)?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    return (
        <section className="hm-world" aria-labelledby="hm-world-title">
            <div className="wk-wrap hm-world-head">
                <div>
                    <h2 id="hm-world-title" className="wk-h2">The whole world is your toolbox</h2>
                    <p className="wk-p">
                        Every route above runs through somewhere. The better you know Minecraft, surface to End, the
                        faster your routes get. {fmt(PINNED_COUNT)} of the pool&rsquo;s items are pinned below to the
                        place they come from; point at any to read its /info. The full pool is on{' '}
                        <a className="wk-link" href="/pools" onClick={go('pools')}>Item Pools</a>.
                    </p>
                </div>
                <p className="hm-world-n">
                    <span className="hm-world-figure">{fmt(ATLAS_POOL_SIZE)}</span>
                    <span className="hm-world-k">items you could be handed</span>
                </p>
            </div>
            <nav className="wk-wrap hm-regions" aria-label="Jump to a region">
                {REGIONS.map((r) => (
                    <button key={r.key} type="button" className="hm-region-chip" style={{ '--r': r.light, '--r-ink': r.ink }} onClick={() => jump(r.key)}>
                        <span className="hm-region-pip" aria-hidden="true" />
                        <span className="hm-region-name">{r.name}</span>
                        <span className="hm-region-y">{GAUGE[r.key]}</span>
                    </button>
                ))}
            </nav>
            {/* The descent: one rail down the atlas's edge, a mark at every region. */}
            <div className="hm-descent">
                {REGIONS.map((r, i) => <RegionBand key={r.key} region={r} index={i} go={go} />)}
            </div>
        </section>
    );
}

/* ── 7. The modes, each drawn as its own mechanic ────────────────────────── */

const HEADS = ['MHF_Steve', 'MHF_Alex', 'MHF_Villager'];

function Head({ name, size = 28 }) {
    return <img className="hm-head" src={MC_HEAD(name)} alt="" width={size} height={size} loading="lazy" />;
}

function ModeFIB({ items }) {
    // Two players, each on their own sequence: found items behind, the current one lit.
    return (
        <div className="hm-diagram hm-diagram--fib" aria-hidden="true">
            {[0, 1].map((p) => (
                <div key={p} className="hm-lane">
                    <Head name={HEADS[p]} />
                    {items.slice(p * 4, p * 4 + 3).map((m) => (
                        <span key={m} className="hm-done"><ItemSlot material={m} size={40} tip={false} marks={false} /></span>
                    ))}
                    <span className="hm-live"><ItemSlot material={items[p * 4 + 3]} size={48} tip={false} /></span>
                </div>
            ))}
        </div>
    );
}

function ModeRun({ items }) {
    // One item for everyone; the first to it scores, the rest reset.
    return (
        <div className="hm-diagram hm-diagram--run" aria-hidden="true">
            <div className="hm-racers">
                {HEADS.map((h, i) => (
                    <span key={h} className="hm-racer" data-first={i === 1 || undefined}>
                        <Head name={h} />
                        <span className="hm-track" />
                        {i === 1 && <span className="hm-racer-plus">+1</span>}
                    </span>
                ))}
            </div>
            <span className="hm-live"><ItemSlot material={items[0]} size={64} tip={false} /></span>
        </div>
    );
}

function ModeChain({ items }) {
    // The current item and the next one are both visible; the rest are not.
    return (
        <div className="hm-diagram hm-diagram--chain" aria-hidden="true">
            <span className="hm-live"><ItemSlot material={items[0]} size={56} tip={false} /></span>
            <ArrowRight size={16} className="hm-chain-arrow" />
            <span className="hm-next"><ItemSlot material={items[1]} size={48} tip={false} marks={false} /></span>
            <ArrowRight size={16} className="hm-chain-arrow" />
            <span className="wk-slot hm-hidden" style={{ '--slot': '40px' }}>?</span>
            <span className="wk-slot hm-hidden" style={{ '--slot': '40px' }}>?</span>
        </div>
    );
}

function Modes({ go }) {
    const items = usePicks(dealableFrom(POOL_BY_STAGE.EARLY), 8);
    const run = usePicks(dealableFrom(POOL_BY_STAGE.MID), 1);
    const chain = usePicks(DEALABLE, 2);
    const { hard, extreme, end, jokers, backpackSize } = POOL_SETTINGS;
    const tagged = (t) => Object.values(ITEM_TAGS).filter((tags) => tags.includes(t)).length;
    const rules = [
        { name: 'Hard', does: `Nether-tagged items${hard ? `, ${fmt(tagged('NETHER'))}` : ''}`, on: hard, glyph: 'NETHER' },
        { name: 'End', does: `End-tagged items${end ? `, ${fmt(tagged('END'))}` : ''}`, on: end, glyph: 'END' },
        { name: 'Extreme', does: 'Extreme-tagged items', on: extreme, glyph: 'EXTREME' },
    ];
    const diagrams = { fib: <ModeFIB items={items} />, run: <ModeRun items={run} />, chain: <ModeChain items={chain} /> };
    return (
        <section className="wk-wrap hm-modes" aria-labelledby="hm-modes-title">
            <h2 id="hm-modes-title" className="wk-h2">Three ways to play</h2>
            <ul className="hm-mode-list">
                {MODES.map((m) => (
                    <li key={m.key} className="hm-mode">
                        {diagrams[m.key]}
                        <h3 className="hm-mech">{m.name}</h3>
                        <p className="hm-mode-hook">{m.hook}</p>
                    </li>
                ))}
            </ul>
            <div className="hm-rules" aria-label="This server's round rules">
                <span className="hm-rules-k">This server</span>
                {rules.map((r) => (
                    <span key={r.name} className="hm-rule" data-on={r.on}>
                        <span className="hm-lamp" aria-hidden="true" />
                        <TagGlyph tag={r.glyph} size={11} />
                        <span className="hm-rule-name">{r.name}</span>
                        <span className="hm-rule-does">{r.does}</span>
                        <span className="hm-rule-state">{r.on ? 'on' : 'off'}</span>
                    </span>
                ))}
                <span className="hm-rule"><span className="hm-rule-name">Jokers</span> <span className="wk-figure">{jokers}</span></span>
                <span className="hm-rule"><span className="hm-rule-name">Backpack</span> <span className="wk-figure">{backpackSize}</span> <span className="hm-rule-does">slots</span></span>
                <span className="hm-rules-links">
                    <a className="wk-link" href="/gameplay" onClick={go('gameplay')}>Modes in detail</a>
                    <a className="wk-link" href="/settings" onClick={go('settings')}>Every setting</a>
                </span>
            </div>
        </section>
    );
}

/* ── 8. Where next: the hotbar ───────────────────────────────────────────────
 * The game names the selected hotbar item above the bar; so does this. Hover or
 * focus a slot to select it (keyboard focus selects too, and every link carries its
 * full name for assistive tech). On touch screens, where nothing hovers, the names
 * sit under the slots instead.
 *
 * A review round put every name under its slot at all widths, on the grounds that
 * navigation must not depend on hover. The owner found the bar read worse for it:
 * ten ragged, two-line labels turned the hotbar back into an icon grid. The label
 * above the bar is the version that ships; hover-less devices keep their names.
 */

function Index({ go }) {
    const [sel, setSel] = useState(0);
    const cur = PAGES[sel];
    return (
        <section className="wk-wrap hm-index" aria-labelledby="hm-index-title">
            <h2 id="hm-index-title" className="wk-h2">Where next</h2>
            <div className="hm-hotbar">
                <p className="hm-hot-label" aria-hidden="true">
                    <span className="hm-hot-label-name">
                        {cur.name}{cur.exit && <ArrowUpRight size={14} className="hm-page-exit" />}
                    </span>
                    <span className="hm-hot-label-text">{cur.text}</span>
                </p>
                <ul className="hm-hotbar-row" aria-label="Pages">
                    {PAGES.map((p, i) => (
                        <li key={p.id} className="hm-hot-cell" data-selected={i === sel || undefined} data-exit={p.exit || undefined}>
                            <a className="hm-hot" href={`/${p.id}`} onClick={go(p.id)}
                               onMouseEnter={() => setSel(i)} onFocus={() => setSel(i)}
                               aria-label={`${p.name}${p.exit ? ' (separate section)' : ''}: ${p.text}`}>
                                {p.src
                                    ? <span className="wk-slot" style={{ '--slot': '60px' }} aria-hidden="true"><img className="wk-sprite" src={p.src} alt="" /></span>
                                    : <ItemSlot material={p.face} size={60} tip={false} marks={false} />}
                                <span className="hm-hot-name" aria-hidden="true">
                                    {p.exit ? (
                                        <>
                                            {p.name.split(' ').slice(0, -1).join(' ')}{' '}
                                            {/* The arrow travels with the last word, so a wrap cannot strand it. */}
                                            <span className="hm-nowrap">
                                                {p.name.split(' ').slice(-1)}
                                                <ArrowUpRight size={12} className="hm-page-exit" />
                                            </span>
                                        </>
                                    ) : p.name}
                                </span>
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

/* ── 9. Made by ──────────────────────────────────────────────────────────── */

function Team() {
    return (
        <section className="wk-wrap hm-team" aria-labelledby="hm-team-title">
            <h2 id="hm-team-title" className="wk-h3">Made by</h2>
            <ul className="hm-crew">
                {TEAM.map((c) => (
                    <li key={c.name} className="hm-member">
                        <span className="wk-slot" style={{ '--slot': '48px' }}>
                            <img className="hm-head-img" src={MC_HEAD(c.name)} alt="" width="40" height="40" loading="lazy" />
                        </span>
                        <span>
                            <span className="hm-member-name">{c.name}</span>
                            <span className="hm-member-role">{c.role}</span>
                        </span>
                    </li>
                ))}
            </ul>
            <p className="wk-small hm-thanks">
                With thanks to{' '}
                {THANKS.map((t, i) => (
                    <React.Fragment key={t.name}>
                        {i > 0 && (i === THANKS.length - 1 ? ' and ' : ', ')}
                        <a className="wk-link" href={t.link} target="_blank" rel="noopener noreferrer">
                            <img className="hm-gh" src={GH_AVT(t.name)} alt="" width="18" height="18" loading="lazy" />
                            {t.name}
                        </a>
                        {' '}({t.role.toLowerCase()})
                    </React.Fragment>
                ))}.
            </p>
        </section>
    );
}

export default function HomePage({ onNavigate }) {
    const calm = useCalm();
    const go = useGo(onNavigate);
    const deal = useDraw(calm);
    return (
        <main className="hm">
            <Opening go={go} deal={deal} />
            <Routes deal={deal} calm={calm} />
            <Loop calm={calm} />
            <Pressure target={deal.target} />
            <Escapes />
            <World go={go} calm={calm} />
            <Modes go={go} />
            <Index go={go} />
            <Team />
            <Footer />
            <TooltipLayer />
        </main>
    );
}
