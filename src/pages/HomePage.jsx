import React, { useEffect, useMemo, useRef, useState } from 'react';
import Footer from '../components/common/Footer.jsx';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import Check from 'lucide-react/dist/esm/icons/check';
import Dices from 'lucide-react/dist/esm/icons/dices';
import { useCalm } from '../config/power.js';
import Environment from '../wiki/game/Environment.jsx';
import LoopBeats from '../wiki/drawings/LoopBeats.jsx';
import RouteMap from '../wiki/drawings/RouteMap.jsx';
import { ItemSlot, SlotGrid, TagGlyph, TooltipLayer } from '../wiki/game/items.jsx';
import {
    ALL_POOL, ATLAS_POOL_SIZE, PINNED_COUNT, POOL_BY_STAGE, POOL_SETTINGS,
    itemName, pick, regionItems, regionSlots, stageOf, tagsOf, whereOf,
} from '../wiki/data/atlas.js';
import { DEALABLE, countLabel, dealableFrom, routesFor } from '../wiki/data/routes.js';
import { BEATS, FIND_RARITY, GAUGE, REGION, REGIONS, ROUND, STAGES, TAGS } from '../wiki/tokens.js';
import { PAGES, useGo } from '../wiki/shell/pages.js';
import '../wiki/pages/home.css';

// Same renderer as the wheel's heads - see getMinecraftHeadUrl for why not mc-heads.
const MC_HEAD = (u) => `https://minotar.net/helm/${u}/100`;
const GH_AVT = (u) => `https://github.com/${u}.png?size=100`;

const fmt = (n) => n.toLocaleString('en-US');

/* ── Content that is not derived ───────────────────────────────────────────── */

/* Chosen by hand to show different route shapes; the routes shown are still derived. */
const EXAMPLES = ['FIRE_CHARGE', 'BREAD', 'ECHO_SHARD', 'NAUTILUS_SHELL', 'ENDER_PEARL', 'NETHERITE_INGOT', 'WHITE_WOOL']
    .filter((m) => routesFor(m).length);

const MODES = [
    { key: 'fib', name: 'ForceItemBattle', hook: 'Collect more items than everyone else before time runs out.',
      text: 'Every player draws from the same item pool, which progresses through Early, Mid, and Late tiers as the round goes on.' },
    { key: 'run', name: 'RunBattle', hook: 'First to claim the target item takes the point.',
      text: 'A single item is active for all players at once. The first to collect it scores, and everyone else resets to chase the next one.' },
    { key: 'chain', name: 'ForceChain', hook: 'Your next item is always visible. Plan two moves ahead.',
      text: 'You can always see both your current item and the one after it. The best players route for both at once.' },
    { key: 'mirror', name: 'MirrorBattle', hook: 'Everyone hunts the same items, in the same order.',
      text: 'One row of items for everybody, each player on it at their own pace. Every pool the round allows is open from the first item.' },
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

function usePicks(list, n) {
    return useMemo(() => {
        const out = new Set();
        while (out.size < Math.min(n, list.length)) out.add(pick(list));
        return [...out];
    }, [list, n]);
}

const regionOf = (m) => REGION[whereOf(m)?.region] ?? REGION.surface;

/* Built once: usePicks memoises on its list, and a fresh array each render re-dealt everything on every resize. */
const DEALABLE_BY_STAGE = {
    EARLY: dealableFrom(POOL_BY_STAGE.EARLY),
    MID: dealableFrom(POOL_BY_STAGE.MID),
    LATE: dealableFrom(POOL_BY_STAGE.LATE),
};

/* ── The draw ── */

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
        // Land only once the real sprite is decoded, or the old wrong item shows under the right name.
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
                        {' '}This is the <strong>McPlayHD.net</strong> edition.
                    </p>
                    <div className="hm-open-actions">
                        <a className="wk-btn" href="/how-to-play" onClick={go('how-to-play')}>
                            How to play <ArrowRight size={16} aria-hidden="true" />
                        </a>
                        <a className="wk-btn wk-btn--quiet" href="/pools" onClick={go('pools')}>Browse the item pool</a>
                    </div>
                </div>

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
                        {/* An unpinned item still needs scenery, but the page must not claim it comes from there. */}
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
                <h2 id="hm-routes-title" className="wk-h2">Every way to get it</h2>
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

/* ── 3. The loop ── */

const BEAT_MS = 340;

/* Odds are set to keep the race close, not measured. */
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
                const rivals = s.rivals.map((r) => (Math.random() < r.p ? { ...r, score: r.score + 1, item: pick(early) } : r));
                if (BEATS[beat] === 'Score') return { ...s, beat, rivals, score: s.score + 1, trail: [s.current, ...s.trail].slice(0, 7) };
                if (BEATS[beat] === 'Next') return { ...s, beat, rivals, current: pick(early) };
                return { ...s, beat, rivals };
            });
        }, BEAT_MS);
        return () => window.clearInterval(t);
    }, [calm, onScreen, early]);

    const beat = calm ? 4 : state.beat;
    // You win a tie on your own screen.
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

/*
 * ── 4. The pressure ──
 * The strip draws the way ItemDifficultiesManager.drawFrom does: uniformly from everything unlocked so far.
 */

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

/* Made once and sliced to fit, so a resize shows more of the same round. Strictly uniform: the caption claims every item is equally likely. */
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
                    <div className="hm-clock-draws" aria-hidden="true">
                        {BOUNDS.map(([k, at], s) => (
                            <span key={k} className="hm-clock-stretch" style={{ '--at': at, '--span': SPAN[k] }}>
                                {draws[s].slice(0, fits(k)).map((m, j) => <ItemSlot key={`${m}-${j}`} material={m} size={DRAW_SLOT} />)}
                            </span>
                        ))}
                    </div>
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

function routeLine(r) {
    if (!r) return '';
    const what = r.chain
        ? r.chain.map((c) => countLabel(c.n, c.label.toLowerCase())).join(' + ')
        : r.sources.slice(0, 2).map((s) => s.label).join(' or ');
    return `${r.verb}: ${what}`;
}

function Escapes() {
    const costly = useMemo(() => DEALABLE_BY_STAGE.LATE.filter((m) => {
        const t = tagsOf(m);
        return (t.includes('END') || t.includes('NETHER')) && !routesFor(m).some((r) => r.kind === 'craft');
    }), []);
    const cheap = useMemo(() => DEALABLE_BY_STAGE.EARLY.filter((m) => routesFor(m)[0]?.kind === 'craft'), []);
    const [skipped] = usePicks(costly.length ? costly : DEALABLE_BY_STAGE.LATE, 1);
    const [next] = usePicks(cheap.length ? cheap : DEALABLE_BY_STAGE.EARLY, 1);
    const skipTag = tagsOf(skipped).find((t) => t === 'END' || t === 'NETHER');
    // A bundle, because InventorySearch opens bundles and shulker boxes wherever they are, and players miss that.
    const bagFrom = useMemo(() => DEALABLE_BY_STAGE.EARLY.filter((m) => m !== next), [next]);
    const bag = usePicks(bagFrom, 6);
    const lucky = bag[3];
    const { jokers } = ROUND;
    return (
        <section className="wk-wrap hm-escapes" aria-labelledby="hm-escapes-title">
            <h2 id="hm-escapes-title" className="wk-h2">Jokers and back-to-backs</h2>
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

/* The Nether and End are reached through something, not further down: their rail restarts after a gap, dashed. */
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
            <div className="hm-descent">
                {REGIONS.map((r, i) => <RegionBand key={r.key} region={r} index={i} go={go} />)}
            </div>
        </section>
    );
}

/*
 * ── 7. The modes ──
 * True to ForceItemAssignment: RunBattle shares one seeded sequence; MirrorBattle gives each Score Owner a cursor into one row.
 */

const HEADS = ['MHF_Steve', 'MHF_Alex', 'MHF_Villager'];
const LANES = [0, 1, 2];
const FIB_SCORES = [5, 2, 4];
const CHAIN_SCORES = [3, 4, 1];
const MIRROR_SCORES = [4, 1, 3];
/* Built once: usePicks memoises on it. */
const MIRROR_DEAL = [...DEALABLE_BY_STAGE.EARLY, ...DEALABLE_BY_STAGE.MID, ...DEALABLE_BY_STAGE.LATE];
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

/* NEXT stays hidden: the plugin draws the row's next item only when its first player reaches it. */
function ModeMirror({ items, scores }) {
    return (
        <Frame kind="mirror">
            {LANES.map((i) => (
                <React.Fragment key={i}>
                    <Trail row={i} items={items.slice(0, scores[i]).reverse().slice(0, TRAIL)} />
                    <span className="hm-f-now hm-live" style={onRow(i)}><ItemSlot material={items[scores[i]]} size={48} tip={false} marks={false} /></span>
                    <span className="hm-f-link" style={onRow(i)} />
                    <Hidden style={onRow(i)} />
                    <span className="hm-f-score wk-figure" style={onRow(i)}>{scores[i]}</span>
                </React.Fragment>
            ))}
        </Frame>
    );
}

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

/* ── The standard round ── */
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
    const mirror = usePicks(MIRROR_DEAL, Math.max(...MIRROR_SCORES) + 1);
    const diagrams = {
        fib: <ModeOwn kind="fib" items={fib} scores={FIB_SCORES} />,
        run: <ModeRun item={run} past={runPast} />,
        chain: <ModeOwn kind="chain" items={chain} scores={CHAIN_SCORES} showNext />,
        mirror: <ModeMirror items={mirror} scores={MIRROR_SCORES} />,
    };
    return (
        <section className="wk-wrap hm-modes" aria-labelledby="hm-modes-title">
            <div className="hm-modes-head">
                <h2 id="hm-modes-title" className="wk-h2">Four ways to play</h2>
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

/* ── 8. Where next ── */

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
