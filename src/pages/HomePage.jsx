import React, { useEffect, useMemo, useRef, useState } from 'react';
import Footer from '../components/common/Footer.jsx';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import Check from 'lucide-react/dist/esm/icons/check';
import Dices from 'lucide-react/dist/esm/icons/dices';
import { useCalm } from '../config/power.js';
import Environment from '../wiki/Environment.jsx';
import LoopBeats from '../wiki/LoopBeats.jsx';
import RouteMap from '../wiki/RouteMap.jsx';
import { ItemSlot, SlotGrid, TagGlyph, TooltipLayer } from '../wiki/items.jsx';
import {
    ALL_POOL, ATLAS_POOL_SIZE, PINNED_COUNT, POOL_BY_STAGE, POOL_SETTINGS,
    itemName, pick, regionItems, regionSlots, stageOf, tagsOf, whereOf,
} from '../wiki/atlas.js';
import { DEALABLE, countLabel, dealableFrom, routesFor } from '../wiki/routes.js';
import { BEATS, FIND_RARITY, GAUGE, REGION, REGIONS, ROUND, STAGES, TAGS } from '../wiki/tokens.js';
import { PAGES, useGo } from '../wiki/pages.js';
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

/*
 * The dealable items of each stage, once per page. usePicks memoises on the list it is
 * given, and dealableFrom builds a new array every call, so passing its result straight
 * in re-dealt the round clock, the backpack and the modes on every render (a resize, a
 * Draw another) and ran routesFor over the pool each time.
 */
const DEALABLE_BY_STAGE = {
    EARLY: dealableFrom(POOL_BY_STAGE.EARLY),
    MID: dealableFrom(POOL_BY_STAGE.MID),
    LATE: dealableFrom(POOL_BY_STAGE.LATE),
};

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
            <RouteMap material={target} jokers={ROUND.jokers} calm={calm} />
        </section>
    );
}

/* ── 3. The loop ─────────────────────────────────────────────────────────────
 * A round, sped up: an item arrives, it is found, it counts, the next replaces it.
 * Labelled as an illustration because the items are dealt, not played.
 */

const BEAT_MS = 340;

/*
 * The others in the round, each on a random item of their own. Illustration: their
 * odds of scoring on a beat are set so the race stays close (you score once every six
 * beats), not measured from anything. The names are the crew's, below.
 */
const RIVALS = [
    { name: 'apppaa', score: 8, p: 1 / 6.5 },
    { name: 'stupxd', score: 6, p: 1 / 7.5 },
    { name: 'CH0RD', score: 5, p: 1 / 9 },
];
const BOARD_ROW = 30;

function Loop({ calm }) {
    const ref = useRef(null);
    const onScreen = useOnScreen(ref);
    const early = DEALABLE_BY_STAGE.EARLY;
    // The count always equals the checked items behind it, including standing still.
    const [state, setState] = useState(() => {
        const trail = Array.from({ length: 7 }, () => pick(early));
        return {
            beat: 0, score: trail.length, current: pick(early), trail,
            rivals: RIVALS.map((r) => ({ ...r, item: pick(early) })),
        };
    });

    useEffect(() => {
        if (calm || !onScreen) return undefined;
        const t = window.setInterval(() => {
            setState((s) => {
                const beat = (s.beat + 1) % BEATS.length;
                // Meanwhile, everyone else: found theirs, +1, a new item.
                const rivals = s.rivals.map((r) => (Math.random() < r.p ? { ...r, score: r.score + 1, item: pick(early) } : r));
                if (BEATS[beat] === 'Score') return { ...s, beat, rivals, score: s.score + 1, trail: [s.current, ...s.trail].slice(0, 7) };
                if (BEATS[beat] === 'Next') return { ...s, beat, rivals, current: pick(early) };
                return { ...s, beat, rivals };
            });
        }, BEAT_MS);
        return () => window.clearInterval(t);
    }, [calm, onScreen, early]);

    const beat = calm ? 4 : state.beat;
    // The sidebar scoreboard, as the game draws it: highest first. You win a tie on
    // your own screen.
    const board = [{ name: 'You', you: true, score: state.score, item: state.current }, ...state.rivals]
        .map((p, order) => ({ ...p, order }))
        .sort((a, b) => b.score - a.score || a.order - b.order);
    return (
        <section ref={ref} className="wk-wrap hm-loop" aria-labelledby="hm-loop-title">
            <div className="hm-loop-head">
                <h2 id="hm-loop-title" className="wk-h2">Found it. +1. Next.</h2>
                <p className="wk-p">
                    There is no downtime. The moment an item counts, the next one replaces it, and the clock never
                    stops. Everyone else in the round is doing the same with items of their own, so the player who
                    routes fastest pulls ahead.
                </p>
            </div>
            <figure className="hm-loop-strip">
                <ol className="hm-board" aria-label="Scores in the illustrated round" style={{ height: board.length * BOARD_ROW + 8 }}>
                    {[...board].sort((a, b) => a.order - b.order).map((p) => {
                        const rank = board.indexOf(p);
                        return (
                            <li key={p.name} className="hm-board-row" data-you={p.you || undefined}
                                style={{ transform: `translateY(${rank * BOARD_ROW}px)` }}
                                aria-label={`${p.name}: ${p.score}`}>
                                <img className="hm-board-head" src={MC_HEAD(p.you ? 'MHF_Steve' : p.name)} alt="" width="18" height="18" loading="lazy" />
                                <span className="hm-board-name">{p.name}</span>
                                <span className="hm-board-item" aria-hidden="true">
                                    <ItemSlot key={p.item} material={p.item} size={24} tip={false} marks={false} />
                                </span>
                                <span className="hm-board-score" key={p.score} aria-hidden="true">{p.score}</span>
                            </li>
                        );
                    })}
                </ol>
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
                <LoopBeats current={beat} className="hm-beats" />
                <figcaption className="hm-source">A round, sped up.</figcaption>
            </figure>
        </section>
    );
}

/* ── 4. The pressure ─────────────────────────────────────────────────────────
 * The round clock, drawn as one pool that items join. The round's timeline is the
 * backbone; each unlock is a flag on it, in its stage's light, carrying real items
 * of the stage that joins there and the count it adds. Under the flags runs a strip
 * of real draws, one per step of the round, taken the way the plugin takes them:
 * uniformly from every item unlocked so far (ItemDifficultiesManager.drawFrom). So
 * the strip starts all Early, and after each flag the new stage mixes in while the
 * earlier ones keep turning up, which is "nothing ever leaves" shown rather than
 * said. Just above the axis, each stage is also a thin layer from its unlock to the
 * end of the round, stacked on the ones before it, so the eye reads a pool that piles
 * up rather than three phases that take turns (final pass, Sept 2026: the flags said
 * "+ Mid" and the strip showed it, but nothing drew the pool itself accumulating).
 * The drawn item hangs off the axis where it unlocks. Below 900px the timeline
 * turns on its side and the strip is not drawn, so the caption about it goes too.
 *
 * *This replaced a stacked chart.* Each stage was a layer of block cells starting
 * where it unlocked, heights to scale, stacked on the stages before it. It was
 * correct and read badly: hundreds of coloured cells, a staircase, and three bands
 * that looked like three separate phases of the round. The items now carry it, and
 * the stage colours are accents (a flag, a stage bar, a word), not fills.
 */

/* Placed by minute of the standard round (ROUND in tokens.js), as a share of it. */
const pctOf = (minute) => (minute / ROUND.minutes) * 100;
const BOUNDS = ['EARLY', 'MID', 'LATE'].map((k) => [k, pctOf(STAGES[k].minute)]);
const SPAN = Object.fromEntries(BOUNDS.map(([k, at], i) => [k, (BOUNDS[i + 1]?.[1] ?? 100) - at]));
const TICKS = [0, STAGES.MID.minute, STAGES.LATE.minute, ROUND.minutes];
const whenOf = (minute) => (minute ? `minute ${minute}` : 'the start');
const COUNTS = Object.fromEntries(BOUNDS.map(([k]) => [k, POOL_BY_STAGE[k].length]));
const IN_POOL = { EARLY: COUNTS.EARLY, MID: COUNTS.EARLY + COUNTS.MID, LATE: COUNTS.EARLY + COUNTS.MID + COUNTS.LATE };
const DRAW_SLOT = 36;
const DRAW_STEP = DRAW_SLOT + 2;
const DRAWS_MAX = 48;

/** An element's content width, kept current as it resizes. */
function useWidth(ref) {
    const [w, setW] = useState(0);
    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const ro = new ResizeObserver(([entry]) => setW(entry.contentRect.width));
        ro.observe(el);
        return () => ro.disconnect();
    }, [ref]);
    return w;
}

/*
 * The strip's draws, made once per page and sliced to fit, so a resize reveals more
 * of the same round rather than dealing a new one. Each stretch draws exactly the way
 * the plugin does, uniformly from everything unlocked by then: a stage by its share of
 * the pool, then an item in it, which is the same as one uniform pick from the union.
 *
 * It used to force the first draw after an unlock to be the new stage, spending the
 * flag's own items, and to avoid repeats within a stretch. That made the flags visibly
 * land in the pool, and it made the strip overstate the new stage on the short Mid
 * stretch, under a caption saying every item is equally likely. The caption is the
 * claim, so the strip now keeps it and a flag's items turn up only by chance.
 */
function drawRound() {
    return BOUNDS.map((_, s) => {
        const open = BOUNDS.slice(0, s + 1).map(([t]) => t);
        const weight = open.reduce((n, t) => n + COUNTS[t], 0);
        return Array.from({ length: DRAWS_MAX }, () => {
            let r = Math.random() * weight;
            const tier = open.find((t) => (r -= COUNTS[t]) < 0) ?? open[0];
            return pick(POOL_BY_STAGE[tier]);
        });
    });
}

function Pressure({ target }) {
    const boardRef = useRef(null);
    const width = useWidth(boardRef);
    const early = usePicks(DEALABLE_BY_STAGE.EARLY, 3);
    const mid = usePicks(DEALABLE_BY_STAGE.MID, 3);
    const late = usePicks(DEALABLE_BY_STAGE.LATE, 3);
    const flags = useMemo(() => ({ EARLY: early, MID: mid, LATE: late }), [early, mid, late]);
    const draws = useMemo(() => drawRound(), []);
    const fits = (k) => (width ? Math.max(1, Math.floor((width * SPAN[k] / 100 - 10 + 2) / DRAW_STEP)) : 0);
    const youStage = stageOf(target);
    const youMinute = youStage ? STAGES[youStage].minute : null;
    const youAt = youStage ? pctOf(youMinute) : null;
    const you = youStage && (
        <>
            <ItemSlot material={target} size={40} tip={false} marks={false} />
            <span>Your <strong>{itemName(target)}</strong> can come up from {whenOf(youMinute)}</span>
        </>
    );
    return (
        <section className="wk-wrap hm-pressure" aria-labelledby="hm-pressure-title">
            <div className="hm-pressure-head">
                <h2 id="hm-pressure-title" className="wk-h2">The round clock</h2>
                <p className="wk-p">
                    Early items can come up from the first second. In a {ROUND.minutes}-minute round Mid items join at
                    minute {STAGES.MID.minute} and Late items at minute {STAGES.LATE.minute}, and nothing ever leaves.
                    The longer the round runs, the more of what you can be handed is hard.
                </p>
            </div>
            <figure className="hm-clock">
                <div className="hm-clock-board" ref={boardRef}>
                    {/* The unlocks, as flags on the timeline: who joins, how many, and
                        how big the pool is once they have. */}
                    <ol className="hm-clock-flags">
                        {BOUNDS.map(([k, at], i) => (
                            <li key={k} className="hm-flag" style={{ '--at': at, '--span': SPAN[k], '--c': STAGES[k].light }}>
                                <span className="hm-flag-when">{STAGES[k].minute ? `Minute ${STAGES[k].minute}` : 'From the start'}</span>
                                <span className="hm-flag-name" style={{ color: STAGES[k].ink }}>{i > 0 && '+ '}{STAGES[k].label}</span>
                                <span className="hm-flag-count">
                                    {i > 0
                                        ? <><strong>+{fmt(COUNTS[k])}</strong> join, <strong>{fmt(IN_POOL[k])}</strong> in the pool</>
                                        : <><strong>{fmt(COUNTS[k])}</strong> items to start</>}
                                </span>
                                <span className="hm-flag-items" data-start={i === 0 || undefined}>
                                    {flags[k].map((m) => <ItemSlot key={m} material={m} size={40} />)}
                                </span>
                                {youStage === k && <span className="hm-flag-you">{you}</span>}
                            </li>
                        ))}
                    </ol>
                    {/* One draw per step of the round, from the pool as it stood then. */}
                    <div className="hm-clock-draws" aria-hidden="true">
                        {BOUNDS.map(([k, at], s) => (
                            <span key={k} className="hm-clock-stretch" style={{ '--at': at, '--span': SPAN[k] }}>
                                {draws[s].slice(0, fits(k)).map((m, j) => <ItemSlot key={`${m}-${j}`} material={m} size={DRAW_SLOT} />)}
                            </span>
                        ))}
                    </div>
                    {/* The pool, as layers that pile up: each stage runs from its unlock to
                        the end of the round, stacked on the ones already there. */}
                    <div className="hm-clock-layers" aria-hidden="true">
                        {BOUNDS.map(([k, at]) => <span key={k} className="hm-clock-layer" style={{ '--at': at, '--c': STAGES[k].light }} />)}
                    </div>
                    <div className="hm-clock-axis" aria-hidden="true">
                        {BOUNDS.map(([k, at]) => <span key={k} className="hm-clock-mark" style={{ '--at': at, '--c': STAGES[k].light }} />)}
                        {TICKS.map((m) => <span key={m} className="hm-clock-tick" style={{ '--at': pctOf(m) }}>{m} min</span>)}
                    </div>
                    {youStage && (
                        <p className="hm-clock-you" data-start={youAt === 0 || undefined} style={{ '--at': youAt, '--c': STAGES[youStage].light }}>{you}</p>
                    )}
                </div>
                <figcaption className="hm-source hm-clock-caption">
                    Every item in the pool is equally likely to come up.
                </figcaption>
            </figure>
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
    const costly = useMemo(() => DEALABLE_BY_STAGE.LATE.filter((m) => {
        const t = tagsOf(m);
        return (t.includes('END') || t.includes('NETHER')) && !routesFor(m).some((r) => r.kind === 'craft');
    }), []);
    const cheap = useMemo(() => DEALABLE_BY_STAGE.EARLY.filter((m) => routesFor(m)[0]?.kind === 'craft'), []);
    const [skipped] = usePicks(costly.length ? costly : DEALABLE_BY_STAGE.LATE, 1);
    const [next] = usePicks(cheap.length ? cheap : DEALABLE_BY_STAGE.EARLY, 1);
    const skipTag = tagsOf(skipped).find((t) => t === 'END' || t === 'NETHER');
    // The lucky one: an item handed to you that is already sitting in a bundle you carry.
    // A bundle rather than a plain backpack grid, because the bundle is the case
    // players miss: InventorySearch opens bundles (and shulker boxes) wherever they
    // are, in the inventory, the backpack, or a bundle inside a shulker box.
    const bagFrom = useMemo(() => DEALABLE_BY_STAGE.EARLY.filter((m) => m !== next), [next]);
    const bag = usePicks(bagFrom, 6);
    const lucky = bag[3];
    const { jokers } = ROUND;
    /*
     * The two halves are one grid, not two columns side by side: each half's sequence,
     * name, words and extra sit on the same rows as the other's, so the costly draw and
     * the lucky one read as the same machine running two ways. Both sequences have the
     * same grammar (what you were handed, what happens to it, what you get), drawn at
     * the same size on the same line.
     */
    return (
        <section className="wk-wrap hm-escapes" aria-labelledby="hm-escapes-title">
            <h2 id="hm-escapes-title" className="wk-h2">Sometimes it costs you. Sometimes it pays.</h2>
            <div className="hm-escapes-grid">
                <div className="hm-seq" role="img"
                     aria-label={`${itemName(skipped)} would cost too long, so a joker trades it for ${itemName(next)}.`}>
                    <div className="hm-seq-node" style={{ '--glow': skipTag ? TAGS[skipTag].ink : STAGES.LATE.light }}>
                        <ItemSlot material={skipped} size={64} tip={false} />
                        <span className="hm-seq-name">{itemName(skipped)}</span>
                        <span className="hm-seq-note">
                            {skipTag && <span style={{ color: TAGS[skipTag].ink }}>{TAGS[skipTag].label} only. </span>}
                            {routeLine(routesFor(skipped)[0])}
                        </span>
                    </div>
                    <span className="hm-seq-to" aria-hidden="true" />
                    <div className="hm-seq-node hm-seq-joker">
                        <span className="hm-joker-card"><img src="/fib-custom/barrier.png" alt="" /></span>
                        <span className="hm-seq-note">Joker</span>
                    </div>
                    <span className="hm-seq-to" aria-hidden="true" />
                    <div className="hm-seq-node" style={{ '--glow': STAGES.EARLY.light }}>
                        <ItemSlot material={next} size={64} tip={false} />
                        <span className="hm-seq-name">{itemName(next)}</span>
                        <span className="hm-seq-note">{routeLine(routesFor(next)[0])}</span>
                    </div>
                </div>
                <h3 className="hm-mech">Jokers</h3>
                <p className="wk-p">
                    A bad draw: another dimension, a structure you have not found. Spend a joker and the next item
                    arrives straight away. You get <strong>{jokers}</strong> in a round, so choose which items to give
                    up.
                </p>
                {/* Three cards stand for the hand: enough to read as jokers, and the count is
                    in the sentence above. Seven fanned out read as clutter. */}
                <div className="hm-joker-hand" aria-hidden="true">
                    {Array.from({ length: 3 }, (_, i) => (
                        <span key={i} className="hm-joker-card hm-joker-card--small" style={{ '--i': i }}>
                            <img src="/fib-custom/barrier.png" alt="" />
                        </span>
                    ))}
                </div>

                <div className="hm-seq hm-seq--luck" role="img"
                     aria-label={`You are handed ${itemName(lucky)}, it is already in a bundle you carry, and it counts at once.`}>
                    <div className="hm-seq-node" style={{ '--glow': STAGES.EARLY.light }}>
                        <ItemSlot material={lucky} size={64} tip={false} />
                        <span className="hm-seq-name">{itemName(lucky)}</span>
                        <span className="hm-seq-note">Handed to you</span>
                    </div>
                    <span className="hm-seq-to" aria-hidden="true" />
                    <div className="hm-seq-node">
                        <span className="hm-bundle" aria-hidden="true">
                            <ItemSlot material="BUNDLE" size={40} tip={false} marks={false} />
                            <span className="hm-bag">
                                {bag.map((m) => (
                                    <span key={m} className="hm-bag-cell" data-hit={m === lucky || undefined}>
                                        <ItemSlot material={m} size={20} tip={false} marks={false} />
                                    </span>
                                ))}
                            </span>
                        </span>
                        <span className="hm-seq-note">Already in a bundle you carry</span>
                    </div>
                    <span className="hm-seq-to" aria-hidden="true" />
                    <div className="hm-seq-node">
                        <span className="hm-seq-plus">+1</span>
                        <span className="hm-seq-note">On the spot, and graded</span>
                    </div>
                </div>
                <h3 className="hm-mech">Back-to-backs</h3>
                <p className="wk-p">
                    A lucky one: the item you are handed is already in your inventory or backpack, or in a shulker
                    box or bundle inside them. It counts on the spot, and the game grades how unlikely that was from what you were holding and the
                    size of the pool. The rarest grades are heard by the whole server.
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
        </section>
    );
}

/* ── 6. The world, as the toolbox ────────────────────────────────────────── */

/*
 * The descent rail, by band. The five Overworld places are one physical column, top
 * to bottom, so their rail is one solid line from the surface down to the Deep Dark,
 * where it stops. The Nether and the End are not further down: you go through
 * something to reach them. Their rail starts again after a gap, dashed.
 */
const RAIL = { surface: 'top', ocean: 'world', caves: 'world', trial: 'world', deepdark: 'floor', nether: 'portal', end: 'last' };

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
            data-rail={RAIL[region.key]}
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

/* ── 7. The modes, as three frames of one diagram ────────────────────────────
 * One rule, three ways to play it, so the three drawings are one drawing with one
 * thing changed. Every frame is the same grid: the same three players on the same
 * three rows, their found items trailing behind them, the item they hunt NOW in one
 * column, what comes NEXT in the column after it, the score at the end. Read across,
 * the difference between the modes is the difference between the frames:
 *
 *   ForceItemBattle  each row its own items, next unknown       ?  per row
 *   RunBattle        the rows converge on ONE item, first scores
 *   ForceChain       the same rows as ForceItemBattle, next shown  item per row
 *
 * *These were three unrelated drawings, and the reason they are not is worth keeping.*
 * An inventory with ticks, a race of lines and a NOW / NEXT / ? belt each explained
 * its own mode, but side by side they read as three different games. The owner asked
 * for the comparison instead (Sept 2026). The belt's ? survives as ForceItemBattle's
 * NEXT column: that the next item is hidden there is exactly what ForceChain changes.
 *
 * The draw is truthful to the plugin (ForceItemAssignment): in RunBattle one seeded
 * sequence serves every player; otherwise each draws privately, and ForceChain only
 * shows the next item the plugin always holds anyway.
 */

const HEADS = ['MHF_Steve', 'MHF_Alex', 'MHF_Villager'];
const LANES = [0, 1, 2];
/* Scores for the still frame. Uneven on purpose: each row moves at its own pace. */
const FIB_SCORES = [5, 2, 4];
const CHAIN_SCORES = [3, 4, 1];
const RUN_WINNER = 1;
const TRAIL = 4;

const onRow = (i) => ({ gridRow: i + 2 });
const ALL_ROWS = { gridRow: '2 / 5' };

function Head({ name, size = 28 }) {
    return <img className="hm-head" src={MC_HEAD(name)} alt="" width={size} height={size} loading="lazy" />;
}

const Tick = () => (
    <span className="hm-tick">
        <svg viewBox="0 0 7 7" width="8" height="8" shapeRendering="crispEdges"><path d="M6 1h1v2h-1v1h-1v1h-1v1h-2v-1h-1v-1h-1v-1h2v1h1v-1h1v-1h1z" fill="currentColor" /></svg>
    </span>
);

const Hidden = ({ style }) => (
    <span className="hm-f-next" style={style}><span className="wk-slot hm-hidden" style={{ '--slot': '40px' }}>?</span></span>
);

/** Found items, newest first: the row lays them out right to left and drops whole ones that do not fit. */
function Trail({ row, items }) {
    return (
        <span className="hm-f-trail" style={onRow(row)}>
            <span className="hm-trail">
                {items.map((m) => (
                    <span key={m} className="hm-done"><ItemSlot material={m} size={36} tip={false} marks={false} /><Tick /></span>
                ))}
            </span>
        </span>
    );
}

/** The frame every mode is drawn in: the column heads and the three players. */
function Frame({ kind, children }) {
    return (
        <div className={`hm-frame hm-frame--${kind}`} aria-hidden="true">
            <span className="hm-f-k hm-f-now">Now</span>
            <span className="hm-f-k hm-f-next">Next</span>
            {HEADS.map((h, i) => <span key={h} className="hm-f-head" style={onRow(i)}><Head name={h} /></span>)}
            {children}
        </div>
    );
}

/** ForceItemBattle and ForceChain are the same frame; only whether NEXT is shown differs. */
function ModeOwn({ kind, items, scores, showNext }) {
    const per = TRAIL + 2;
    return (
        <Frame kind={kind}>
            {LANES.map((i) => {
                const own = items.slice(i * per, i * per + per);
                return (
                    <React.Fragment key={i}>
                        <Trail row={i} items={own.slice(2, 2 + Math.min(TRAIL, scores[i]))} />
                        <span className="hm-f-now hm-live" style={onRow(i)}><ItemSlot material={own[0]} size={48} tip={false} marks={false} /></span>
                        <span className="hm-f-link" data-seen={showNext || undefined} style={onRow(i)} />
                        {showNext
                            ? <span className="hm-f-next" style={onRow(i)}><ItemSlot material={own[1]} size={40} tip={false} marks={false} /></span>
                            : <Hidden style={onRow(i)} />}
                        <span className="hm-f-score wk-figure" style={onRow(i)}>{scores[i]}</span>
                    </React.Fragment>
                );
            })}
        </Frame>
    );
}

/*
 * RunBattle's history is one sequence for everybody, so every row carries the SAME
 * items in the same columns, and each column is ticked on the one row that claimed it
 * first; the others hold it dimmed. That is the mode in one look: one item at a time
 * for the whole server, one point for whoever gets there. *The rows were bare lines*
 * running into the join (owner, final pass, Sept 2026: long lines, little said), next
 * to two frames full of items; the history gives it the same density without making
 * the three drawings one drawing.
 */
const RUN_PAST_WINNERS = [2, 0, 1];
const RUN_SCORES = LANES.map((i) => RUN_PAST_WINNERS.filter((w) => w === i).length + (i === RUN_WINNER ? 1 : 0));

function ModeRun({ item, past }) {
    return (
        <Frame kind="run">
            {LANES.map((i) => (
                <span key={i} className="hm-f-trail hm-f-race" data-first={i === RUN_WINNER || undefined} style={onRow(i)}>
                    <span className="hm-trail hm-trail--shared">
                        {past.map((m, j) => (
                            <span key={m} className="hm-done" data-lost={RUN_PAST_WINNERS[j] !== i || undefined}>
                                <ItemSlot material={m} size={36} tip={false} marks={false} />
                                {RUN_PAST_WINNERS[j] === i && <Tick />}
                            </span>
                        )).reverse()}
                    </span>
                </span>
            ))}
            <span className="hm-f-join" style={ALL_ROWS} />
            <span className="hm-f-now hm-live" style={ALL_ROWS}><ItemSlot material={item} size={56} tip={false} marks={false} /></span>
            <span className="hm-f-link" style={ALL_ROWS} />
            <Hidden style={ALL_ROWS} />
            {LANES.map((i) => (
                <span key={i} className="hm-f-score wk-figure" data-plus={i === RUN_WINNER || undefined} style={onRow(i)}>{RUN_SCORES[i]}</span>
            ))}
        </Frame>
    );
}

/* ── The standard round ──────────────────────────────────────────────────────
 * How a round is set up, as a line of settings rather than a sentence. The pool's
 * own counts (how many items the Nether adds) belong to Item Pools, not here.
 */
function Standard({ go }) {
    const { hard, extreme, end, backpackSize } = POOL_SETTINGS;
    const { minutes, jokers } = ROUND;
    const toggles = [
        { name: 'Hard', does: 'Nether items', on: hard, glyph: 'NETHER' },
        { name: 'End', does: 'End items', on: end, glyph: 'END' },
        { name: 'Extreme', does: 'Extreme items', on: extreme, glyph: 'EXTREME' },
    ];
    return (
        <div className="hm-std" role="group" aria-labelledby="hm-std-title">
            <div className="hm-std-head">
                <h3 id="hm-std-title" className="wk-name">McPlayHD.net standard round</h3>
                <a className="wk-link hm-go" href="/settings" onClick={go('settings')}>Every setting<ArrowRight size={14} aria-hidden="true" /></a>
            </div>
            <dl className="hm-std-list">
                <div className="hm-std-item">
                    <dt>Round length</dt>
                    <dd><span className="wk-figure hm-std-v">{minutes}</span><span className="hm-std-unit">min</span></dd>
                </div>
                {toggles.map((t) => (
                    <div key={t.name} className="hm-std-item" data-on={t.on}>
                        <dt><TagGlyph tag={t.glyph} size={11} />{t.does}</dt>
                        <dd>
                            <span className="hm-lamp" aria-hidden="true" />
                            <span className="hm-std-name">{t.name}</span>
                            <span className="hm-std-state">{t.on ? 'On' : 'Off'}</span>
                        </dd>
                    </div>
                ))}
                <div className="hm-std-item">
                    <dt>Jokers</dt>
                    <dd><span className="wk-figure hm-std-v">{jokers}</span></dd>
                </div>
                <div className="hm-std-item">
                    <dt>Backpack slots</dt>
                    <dd><span className="wk-figure hm-std-v">{backpackSize}</span></dd>
                </div>
            </dl>
        </div>
    );
}

function Modes({ go }) {
    const fib = usePicks(DEALABLE_BY_STAGE.EARLY, 3 * (TRAIL + 2));
    const chain = usePicks(DEALABLE_BY_STAGE.MID, 3 * (TRAIL + 2));
    const [run, ...runPast] = usePicks(DEALABLE_BY_STAGE.MID, 1 + RUN_PAST_WINNERS.length);
    const diagrams = {
        fib: <ModeOwn kind="fib" items={fib} scores={FIB_SCORES} />,
        run: <ModeRun item={run} past={runPast} />,
        chain: <ModeOwn kind="chain" items={chain} scores={CHAIN_SCORES} showNext />,
    };
    return (
        <section className="wk-wrap hm-modes" aria-labelledby="hm-modes-title">
            <div className="hm-modes-head">
                <h2 id="hm-modes-title" className="wk-h2">Three ways to play</h2>
                <a className="wk-link hm-go" href="/gameplay" onClick={go('gameplay')}>Modes in detail<ArrowRight size={14} aria-hidden="true" /></a>
            </div>
            <ul className="hm-mode-list">
                {MODES.map((m) => (
                    <li key={m.key} className="hm-mode">
                        {diagrams[m.key]}
                        <h3 className="hm-mech">{m.name}</h3>
                        <p className="hm-mode-hook">{m.hook}</p>
                    </li>
                ))}
            </ul>
            <Standard go={go} />
        </section>
    );
}

/* ── 8. Where next ───────────────────────────────────────────────────────────
 * Every page, named in plain words, grouped the way the nav groups them.
 *
 * *This was a hotbar, and the reason it is not is worth keeping.* Every page stood
 * as a 60px slot in one bar, named above the bar on hover the way the game names
 * the held item. It was clever, and at the bottom of a long page it did not read as
 * links: a row of blocks with one name at a time is a puzzle when all a reader wants
 * is somewhere to go. The owner asked for the labels to be visible at once. The
 * items stay, small, beside names that say it.
 */

const GROUPS = [
    { label: 'Play', ids: ['how-to-play', 'gameplay', 'pools', 'structures'] },
    { label: 'Reference', ids: ['commands', 'settings', 'rules', 'changelog'] },
    { label: 'Elsewhere', ids: ['stats', 'wheel'] },
];

function Index({ go }) {
    return (
        <nav className="wk-wrap hm-index" aria-labelledby="hm-index-title">
            <h2 id="hm-index-title" className="wk-h3">Where next</h2>
            <div className="hm-index-groups">
                {GROUPS.map((g) => (
                    <div key={g.label} className="hm-index-group">
                        <span className="wk-label">{g.label}</span>
                        <ul className="hm-index-list">
                            {g.ids.map((id) => PAGES.find((p) => p.id === id)).map((p) => (
                                <li key={p.id}>
                                    <a className="hm-page" href={`/${p.id}`} onClick={go(p.id)}>
                                        {p.src
                                            ? <span className="wk-slot" style={{ '--slot': '40px' }} aria-hidden="true"><img className="wk-sprite" src={p.src} alt="" /></span>
                                            : <ItemSlot material={p.face} size={40} tip={false} marks={false} />}
                                        <span className="hm-page-text">
                                            <span className="hm-page-name">
                                                {p.name}
                                                {p.exit && <><ArrowUpRight size={14} className="hm-page-exit" aria-hidden="true" /><span className="wk-sr"> (separate section)</span></>}
                                            </span>
                                            <span className="hm-page-desc">{p.text}</span>
                                        </span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </nav>
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
