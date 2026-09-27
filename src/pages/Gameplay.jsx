import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Dices from 'lucide-react/dist/esm/icons/dices';
import Pause from 'lucide-react/dist/esm/icons/pause';
import Play from 'lucide-react/dist/esm/icons/play';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Footer from '../components/common/Footer.jsx';
import { useCalm } from '../config/power.js';
import Bossbar from '../wiki/Bossbar.jsx';
import PageLinks from '../wiki/PageLinks.jsx';
import { ItemSlot, TooltipLayer } from '../wiki/items.jsx';
import { POOL_BY_STAGE, POOL_SETTINGS, itemName, pick } from '../wiki/atlas.js';
import { picks, useOnScreen, useTicker } from '../wiki/hooks.js';
import { useGo } from '../wiki/pages.js';
import { FIND_RARITY, FIXED_UNLOCKS_FROM, ROUND, STAGES, unlockMinutes } from '../wiki/tokens.js';
import '../wiki/page.css';
import '../wiki/gameplay.css';

/*
 * Gameplay (THE EXPLORER'S ATLAS). The rulebook, where home is the summary.
 *
 * Every rule on this page is the plugin's, read out of its source on main, and every
 * drawing runs the plugin's own arithmetic rather than an approximation of it:
 *
 *   the pool's unlock marks     manager/UnlockSchedule: 11.11% and 28.88% of the round
 *                               below 50 minutes, minute 5 and minute 15 from 50 up
 *   what counts as getting it   listener/ItemsListener's handlers, asking FindDetection
 *   jokers                      model/JokerSpend and listener/ClickableItemsListener:
 *                               the item is handed over and the find is marked skipped;
 *                               model/FindOutcome: a skip scores except in Run Battle
 *   back-to-backs               manager/BackToBackManager (what is searched) and
 *                               model/BackToBackProbability + Rarity (the odds, the grade)
 *   the modes                   manager/ForceItemAssignment (private draws, or one seeded
 *                               sequence for the whole server in Run Battle)
 *   random events               randomevents/*: the schedule, weights and rewards
 *
 * Where a drawing needs a round, it is the standard one (ROUND in tokens.js: 60
 * minutes, 7 jokers), the round the game was balanced around. The page used to quote
 * config.yml's 3 jokers as "this server", a number the plugin never reads.
 *
 * An earlier version of this page said every player gets "the same items, in the same
 * order". That is Run Battle only; in a normal round each player draws privately. It
 * also stated that games "typically run 45 to 120 minutes", which nothing on the
 * server records, so it is gone (DESIGN.md, the Honest Claim Rule).
 *
 * Every simulation is labelled an illustration, runs only while it is on screen, and
 * stands still under reduced motion or saver mode on a frame that still says what it
 * shows.
 */

const MC_HEAD = (u) => `https://minotar.net/helm/${u}/100`;
const HEADS = ['MHF_Steve', 'MHF_Alex', 'MHF_Villager'];
const fmt = (n) => n.toLocaleString('en-US');
const ORDER = ['EARLY', 'MID', 'LATE'];
const COUNT = Object.fromEntries(ORDER.map((s) => [s, POOL_BY_STAGE[s].length]));
const RARITY = Object.fromEntries(FIND_RARITY.map((r) => [r.key, r]));
const EARLY_MID = [...POOL_BY_STAGE.EARLY, ...POOL_BY_STAGE.MID];

function Head({ name, size = 32 }) {
    return <img className="gp-head" src={MC_HEAD(name)} alt="" width={size} height={size} loading="lazy" />;
}

const Tick = () => (
    <span className="gp-tick" aria-hidden="true">
        <svg viewBox="0 0 7 7" width="8" height="8" shapeRendering="crispEdges"><path d="M6 1h1v2h-1v1h-1v1h-1v1h-2v-1h-1v-1h-1v-1h2v1h1v-1h1v-1h1z" fill="currentColor" /></svg>
    </span>
);

/* ── The plugin's arithmetic ─────────────────────────────────────────────────── */

/** BackToBackProbability.probabilityOf. */
function oddsOf(held, pool, streak) {
    if (pool <= 0) return 0;
    return Math.pow(Math.min(held / pool, 1), streak);
}

/** Rarity.classify. */
function gradeOf(p, repeatOfPrevious = false) {
    if (repeatOfPrevious) return 'EXTRAORDINARY';
    if (p <= 0.001) return 'RNGESUS';
    if (p <= 0.01) return 'LEGENDARY';
    if (p <= 0.05) return 'EPIC';
    return 'RARE';
}

/** BackToBackProbability.formatPercent: two places, or two significant digits past the zeros. */
function formatPercent(percent) {
    if (percent >= 1) return `${Number(percent.toFixed(2))}%`;
    let zeros = 0;
    let t = percent;
    while (t < 1 && zeros < 15) { t *= 10; zeros += 1; }
    const s = percent.toFixed(Math.min(20, zeros + 2)).replace(/\.?0+$/, '');
    return `${s}%`;
}

/* ── 1. One item at a time ───────────────────────────────────────────────────── */

const WAYS = [
    { face: 'HOPPER', name: 'Pick it up', text: 'A drop, a block you broke, whatever a mob left behind.' },
    { face: 'CHEST', name: 'Take it out', text: 'Click it in any container: a chest, a barrel, a furnace.' },
    { face: 'CRAFTING_TABLE', name: 'Craft or smith it', text: 'The moment you take the result.' },
    { face: 'BUCKET', name: 'Use a bucket', text: 'Fill one, empty one, or catch a fish in one.' },
    { face: 'COOKED_BEEF', name: 'Eat or drink it', text: 'Consuming it still counts.' },
];

function Round() {
    const [deal, setDeal] = useState(() => picks(POOL_BY_STAGE.EARLY, 2));
    return (
        <section id="round" className="wk-wrap pg-sec" aria-labelledby="round-title">
            <div className="pg-sec-head">
                <h2 id="round-title" className="wk-h3">One item at a time</h2>
                <p className="wk-p">
                    You are handed one item, in your bossbar. Get it any way Minecraft allows and it counts
                    the moment it is in your hands; the next one is drawn straight away.
                </p>
                <p className="wk-p">
                    Everyone draws from the same pool, but <strong>not the same items</strong>: each player's
                    draws are their own, and every item the pool holds is equally likely.
                </p>
            </div>

            <div className="gp-round">
                <div className="gp-pair">
                    {deal.map((m, i) => (
                        <div key={i} className="gp-pair-one">
                            <span className="gp-who"><Head name={HEADS[i]} size={20} />{i === 0 ? 'You' : 'Another player'}</span>
                            <Bossbar item={m} />
                        </div>
                    ))}
                </div>
                <div className="gp-round-row">
                    <p className="wk-small">Same round, same moment, two draws.</p>
                    <button type="button" className="wk-btn wk-btn--quiet gp-btn-sm" onClick={() => setDeal(picks(POOL_BY_STAGE.EARLY, 2))}>
                        <Dices size={16} aria-hidden="true" /> Deal again
                    </button>
                </div>

                <div className="gp-ways">
                    <span className="wk-label">It counts when you</span>
                    <ul className="gp-ways-list">
                        {WAYS.map((w) => (
                            <li key={w.face} className="gp-way">
                                <ItemSlot material={w.face} size={48} tip={false} marks={false} />
                                <span>
                                    <span className="gp-way-name">{w.name}</span>
                                    <span className="gp-way-text">{w.text}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                    <p className="wk-small">Or simply hold it and right-click.</p>
                </div>
            </div>
        </section>
    );
}

/* ── 2. The pool opens up ────────────────────────────────────────────────────── */

const DRAWS = 8;

function Clock() {
    const [len, setLen] = useState(ROUND.minutes);
    const [at, setAt] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [seed, setSeed] = useState(0);
    const unlock = unlockMinutes(len);
    const open = ORDER.filter((s) => at >= unlock[s]);
    const size = open.reduce((n, s) => n + COUNT[s], 0);
    const openKey = open.join();

    // A fresh draw only when the pool itself changes (or on request), so dragging the
    // playhead inside a stage does not reshuffle the row under the reader's eyes.
    const draws = useMemo(() => {
        const union = open.flatMap((s) => POOL_BY_STAGE[s]);
        return Array.from({ length: DRAWS }, () => pick(union));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openKey, seed]);

    const step = useCallback(() => setAt((a) => Math.min(len, a + 1)), [len]);
    useEffect(() => { if (playing && at >= len) setPlaying(false); }, [playing, at, len]);
    // About six seconds for any round, so a long one is not a longer wait.
    useTicker(step, Math.max(40, Math.round(6000 / len)), playing);

    const changeLen = (v) => { setLen(v); setAt((a) => Math.min(a, v)); };
    const play = () => { if (at >= len) setAt(0); setPlaying((p) => !p); };
    const pos = (m) => `${(m / len) * 100}%`;

    return (
        <section id="pool" className="wk-wrap pg-sec" aria-labelledby="pool-title">
            <div className="pg-sec-head">
                <h2 id="pool-title" className="wk-h3">The pool opens up</h2>
                <p className="wk-p">
                    A round starts with the Early pool. Mid and Late join it later, and <strong>nothing
                    ever leaves</strong>: an Early item can still come up in the last minute.
                </p>
                <p className="wk-p">
                    When they join depends on how long the round is. Below 50 minutes it is a share of the
                    round; from 50 minutes up it is fixed, so a long game does not hold Late back for half an hour.
                </p>
                <p className="wk-small">
                    A Quickie round stops at Early, or at Early and Mid. The length is set when the round
                    is started, with <code className="wk-typed">/start</code>.
                </p>
            </div>

            <div className="gp-clock">
                <div className="gp-clock-controls">
                    <label className="gp-field">
                        <span className="wk-label">Round length</span>
                        <input
                            type="range" min="10" max="120" step="5" value={len}
                            onChange={(e) => changeLen(Number(e.target.value))}
                            aria-valuetext={`${len} minutes`}
                        />
                        <span className="wk-datum gp-field-val">{len} min</span>
                    </label>
                    <button type="button" className="wk-btn gp-btn-sm" onClick={play} aria-pressed={playing}>
                        {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                        {playing ? 'Pause' : at >= len ? 'Play again' : 'Play the round'}
                    </button>
                </div>
                {/*
                  * One lane per stage on a shared minute axis. It used to be three flags on
                  * one rail, and at a standard 60 minutes all three landed in the first
                  * quarter with their labels stacked on each other; lanes keep each stage's
                  * name and minute in a column of its own, however short the gaps are. A
                  * lane's bar is the stretch its items are in the pool, lit up to the
                  * playhead, so the long flat run after the last unlock reads as what it is:
                  * from there on, everything can come up.
                  */}
                <div className="gp-sched" style={{ '--at': pos(at) }}>
                    {ORDER.map((s, i) => (
                        <div key={s} className="gp-sched-lane" data-stage={s.toLowerCase()} data-open={at >= unlock[s] || undefined}
                             style={{ gridRow: i + 1, '--from': pos(unlock[s]), '--fill': `${Math.max(0, Math.min(1, (at - unlock[s]) / Math.max(1, len - unlock[s]))) * 100}%` }}>
                            <span className="gp-sched-name">
                                <span className="gp-sched-stage" style={{ color: STAGES[s].ink }}>{STAGES[s].label}</span>
                                <span className="gp-sched-when">{unlock[s] === 0 ? 'From the start' : `From minute ${unlock[s]}`}</span>
                            </span>
                            <span className="gp-sched-track" aria-hidden="true"><span className="gp-sched-bar" /></span>
                        </div>
                    ))}
                    <input
                        className="gp-scrub" type="range" min="0" max={len} step="1" value={at}
                        onChange={(e) => { setPlaying(false); setAt(Number(e.target.value)); }}
                        aria-label="Minute of the round"
                        aria-valuetext={`Minute ${at} of ${len}: ${fmt(size)} items can come up`}
                    />
                    <span className="gp-sched-head" aria-hidden="true" />
                    <div className="gp-sched-ticks" aria-hidden="true">
                        {[...new Set([0, unlock.MID, unlock.LATE, len])].map((m) => (
                            <span key={m} className="gp-sched-tick" style={{ left: pos(m) }} data-edge={m === 0 ? 'start' : m === len ? 'end' : undefined}>
                                {m === len ? `${m} min` : m}
                            </span>
                        ))}
                    </div>
                </div>

                <p className="gp-clock-read">
                    Minute <span className="wk-datum">{at}</span>: <span className="wk-datum gp-big">{fmt(size)}</span> items can come up
                </p>
                <div className="gp-poolbar" aria-hidden="true">
                    {ORDER.map((s) => (
                        <span key={s} className="gp-poolbar-seg" data-stage={s.toLowerCase()} data-open={open.includes(s) || undefined}
                              style={{ flexGrow: COUNT[s] }}>
                            <span className="gp-poolbar-label">{STAGES[s].label} <span className="wk-datum">{fmt(COUNT[s])}</span></span>
                        </span>
                    ))}
                </div>

                <div className="gp-draws">
                    <div className="gp-draws-row" role="group" aria-label={`${DRAWS} example draws at minute ${at}`}>
                        {draws.map((m, i) => (
                            <span key={`${m}-${i}-${openKey}-${seed}`} className="gp-draw" style={{ '--i': i }}>
                                <ItemSlot material={m} size={48} tabIndex={0} />
                            </span>
                        ))}
                    </div>
                    <div className="gp-round-row">
                        <p className="wk-small">
                            Eight draws at this minute, each from everything open. The bar on each slot is the item's stage.
                        </p>
                        <button type="button" className="wk-btn wk-btn--quiet gp-btn-sm" onClick={() => setSeed((n) => n + 1)}>
                            <Dices size={16} aria-hidden="true" /> Draw again
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ── 3. Jokers ───────────────────────────────────────────────────────────────── */

const JOKER_RULES = [
    { name: 'It still breaks your streak', text: 'Every item you get extends your item streak. A skip is the one thing that ends it.' },
    { name: 'Not in an Item Hunt', text: 'The hunt goes to the first find made without skipping.' },
    { name: 'Shared on a team', text: 'A team spends from one set of jokers.' },
    { name: 'Run Battle is different', text: <>A joker there earns no point. Instead <code className="wk-typed">/voteskip</code> puts the item to a vote of everyone playing; if it carries, the player who called it pays a joker, and a tie is a coin flip.</> },
];

function Jokers() {
    const total = ROUND.jokers;
    const [left, setLeft] = useState(total);
    const [hunted, setHunted] = useState(() => pick(POOL_BY_STAGE.LATE));
    const [handed, setHanded] = useState(null);
    const [score, setScore] = useState(0);
    const [empty, setEmpty] = useState(false);
    const timer = useRef(null);
    useEffect(() => () => clearTimeout(timer.current), []);

    const spend = () => {
        if (handed) return;
        if (left <= 0) { setEmpty(true); return; }
        setLeft((n) => n - 1);
        setHanded(hunted);
        setScore((n) => n + 1);
        timer.current = setTimeout(() => {
            setHanded(null);
            setHunted(pick(POOL_BY_STAGE.LATE));
        }, 1100);
    };
    const reset = () => {
        clearTimeout(timer.current);
        setLeft(total); setHanded(null); setScore(0); setEmpty(false);
        setHunted(pick(POOL_BY_STAGE.LATE));
    };

    return (
        <section id="jokers" className="wk-wrap pg-sec" aria-labelledby="jokers-title">
            <div className="pg-sec-head">
                <h2 id="jokers-title" className="wk-h3">Jokers buy the point</h2>
                <p className="wk-p">
                    Some draws are not worth the trip. Right-click a joker and you are <strong>handed the
                    item itself</strong>: it lands in your inventory, it counts, and the next one is drawn.
                </p>
                <p className="wk-p">
                    The standard {ROUND.minutes}-minute round deals <span className="wk-datum">{total}</span> each, so the skill is
                    in choosing which draws deserve one.
                </p>
            </div>

            <div className="gp-jokers">
                <Bossbar item={hunted} />
                <div className="gp-seq" aria-hidden="true">
                    <span className="gp-seq-node">
                        <span className="wk-slot gp-joker-slot" style={{ '--slot': '64px' }}>
                            <img className="wk-sprite" src="/fib-custom/barrier.png" alt="" />
                            {left > 0 && <span className="wk-count">{left}</span>}
                        </span>
                        <span className="gp-seq-cap">Joker</span>
                    </span>
                    <span className="gp-seq-to" data-lit={Boolean(handed) || undefined} />
                    <span className="gp-seq-node">
                        <span className="gp-handed" data-in={Boolean(handed) || undefined}>
                            {handed
                                ? <ItemSlot key={handed} material={handed} size={64} tip={false} className="gp-land" />
                                : <span className="wk-slot" style={{ '--slot': '64px' }} />}
                        </span>
                        <span className="gp-seq-cap">Into your inventory</span>
                    </span>
                    <span className="gp-seq-to" data-lit={Boolean(handed) || undefined} />
                    <span className="gp-seq-node">
                        <span className="gp-score">
                            <span className="wk-figure">{score}</span>
                            {handed && <span className="gp-plus" key={score}>+1</span>}
                        </span>
                        <span className="gp-seq-cap">Your score</span>
                    </span>
                </div>
                <div className="gp-round-row">
                    <p className="wk-small" aria-live="polite">
                        {empty
                            ? <>The game's own answer: <strong>No more skips left.</strong></>
                            : handed
                                ? <><strong>{itemName(handed)}</strong> handed over and counted.</>
                                : 'Try it: a Late item, the kind worth skipping.'}
                    </p>
                    <span className="gp-btns">
                        <button type="button" className="wk-btn gp-btn-sm" onClick={spend} disabled={Boolean(handed)}>Spend a joker</button>
                        <button type="button" className="wk-btn wk-btn--quiet gp-btn-sm" onClick={reset} aria-label="Start over">
                            <RotateCcw size={16} aria-hidden="true" />
                        </button>
                    </span>
                </div>

                <dl className="gp-rules">
                    {JOKER_RULES.map((r) => (
                        <div key={r.name} className="gp-rule">
                            <dt>{r.name}</dt>
                            <dd>{r.text}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    );
}

/* ── 4. Back-to-backs ────────────────────────────────────────────────────────── */

const COLS = 9;
const POOL_ALL = COUNT.EARLY + COUNT.MID + COUNT.LATE;

/*
 * One made-up inventory, dealt so that the chain runs twice and then stops: the
 * first item is inside a bundle in the inventory, the second inside a shulker box in
 * the backpack, the third is held nowhere. Both finds are in containers on purpose:
 * a loose item is the case nobody needs explaining, and InventorySearch opens
 * bundles and shulker boxes wherever they sit, which is the case players miss. The
 * odds are the plugin's formula over what this inventory really holds, against the
 * whole pool.
 */
function dealScene() {
    const n = { main: 17, hotbar: 6, backpack: 11, shulker: 5, bundle: 3 };
    const want = n.main + n.hotbar + n.backpack + n.shulker + n.bundle + 1;
    const held = picks(EARLY_MID.filter((m) => m !== 'SHULKER_BOX' && m !== 'BUNDLE'), want);
    let k = 0;
    const take = (c) => held.slice(k, (k += c));
    const scatter = (items, slots) => {
        const cells = Array(slots).fill(null);
        const free = [...cells.keys()].sort(() => Math.random() - 0.5);
        items.forEach((m, i) => { cells[free[i]] = m; });
        return cells;
    };
    const main = scatter([...take(n.main), 'BUNDLE'], 27);
    const hotbarItems = take(n.hotbar);
    const hotbar = [null, ...scatter(hotbarItems, 8)];
    hotbar[0] = 'JOKER';
    const backpack = scatter([...take(n.backpack), 'SHULKER_BOX'], POOL_SETTINGS.backpackSize);
    const shulker = scatter(take(n.shulker), COLS);
    const bundle = take(n.bundle);
    const miss = pick(POOL_BY_STAGE.LATE.filter((m) => !held.includes(m)));
    const chain = [pick(bundle), pick(shulker.filter(Boolean)), miss];
    // Plugin items (the joker) are skipped, as InventorySearch skips them; the shulker
    // and the bundle count as themselves AND for what is inside them.
    const distinct = new Set([...main, ...hotbar, ...backpack, ...shulker, ...bundle].filter((m) => m && m !== 'JOKER'));
    return { main, hotbar, backpack, shulker, bundle, chain, held: distinct.size };
}

/**
 * The order the drawing sweeps in: inventory, hotbar, backpack, and a container's
 * contents the moment the sweep reaches the container, so the drawing says "inside
 * this one" rather than "somewhere else".
 */
function scanOrder(scene) {
    const out = [];
    const inside = { BUNDLE: 'bundle', SHULKER_BOX: 'shulker' };
    const walk = (cells, where) => cells.forEach((m, i) => {
        out.push({ where, i, m });
        const box = inside[m];
        if (box) scene[box].forEach((c, j) => out.push({ where: box, i: j, m: c }));
    });
    walk(scene.main, 'main');
    walk(scene.hotbar, 'hotbar');
    walk(scene.backpack, 'backpack');
    return out;
}

const WHERE = {
    main: 'Loose in your inventory',
    hotbar: 'In your hotbar',
    backpack: 'In your backpack',
    shulker: 'In your backpack, inside a shulker box',
    bundle: 'In your inventory, inside a bundle',
};

const SWEEP_MS = 14;

const Cells = memo(function Cells({ cells, where, hit, found, scanAt = -1, cols = COLS }) {
    return (
        <div className="gp-inv-grid" style={{ '--cols': cols }}>
            {cells.map((m, i) => {
                const isHit = hit && hit.where === where && hit.i === i;
                const wasFound = found.some((f) => f.where === where && f.i === i);
                const cls = `gp-cell${isHit ? ' is-hit' : ''}${wasFound && !isHit ? ' is-found' : ''}${i === scanAt ? ' is-scan' : ''}`;
                if (!m) return <span key={i} className={`wk-slot ${cls}`} style={{ '--slot': '40px' }} />;
                if (m === 'JOKER') {
                    return (
                        <span key={i} className={`wk-slot ${cls} is-plugin`} style={{ '--slot': '40px' }}>
                            <img className="wk-sprite" src="/fib-custom/barrier.png" alt="" />
                        </span>
                    );
                }
                return <ItemSlot key={i} material={m} size={40} tip={false} className={cls} />;
            })}
        </div>
    );
});

/** Before the sweep: the first item handed over, nothing searched yet. */
const fresh = (scene) => ({ scene, step: 0, cursor: -1, hit: null, found: [], phase: 'idle', open: {} });

/** Calm has no sweep: it lands on the end of the chain, both finds marked. */
function settled(scene) {
    const o = scanOrder(scene);
    return {
        scene, step: 1, cursor: -1, phase: 'hit', open: { bundle: true, shulker: true },
        found: [o.find((c) => c.m === scene.chain[0])],
        hit: o.find((c) => c.m === scene.chain[1]),
    };
}

function BackToBack({ calm }) {
    // One object, so a step of the sequence is one update rather than five that must agree.
    const [st, setSt] = useState(() => (calm ? settled(dealScene()) : fresh(dealScene())));
    const { scene, step, cursor, hit, found, phase, open } = st;
    const order = useMemo(() => scanOrder(scene), [scene]);
    const ref = useRef(null);
    const onScreen = useOnScreen(ref, '-15% 0px');

    const target = scene.chain[step];
    const streak = found.length + (phase === 'hit' ? 1 : 0);

    // Starts the first time it is on screen, after a beat so the reader sees the
    // inventory before it is searched.
    useEffect(() => {
        if (calm || phase !== 'idle' || !onScreen) return undefined;
        const id = setTimeout(() => setSt((x) => ({ ...x, cursor: 0, phase: 'scan' })), 350);
        return () => clearTimeout(id);
    }, [calm, phase, onScreen]);

    // Saver mode switched on mid-sequence: stop where the chain ends.
    useEffect(() => {
        if (!calm || phase === 'hit' || phase === 'miss') return undefined;
        const id = setTimeout(() => setSt((x) => settled(x.scene)), 0);
        return () => clearTimeout(id);
    }, [calm, phase]);

    // The sweep: one cell per tick until the handed item turns up, or the last cell.
    useEffect(() => {
        if (phase !== 'scan') return undefined;
        const id = setTimeout(() => {
            setSt((x) => {
                const cell = order[x.cursor];
                if (!cell) return { ...x, phase: 'miss', cursor: -1 };
                const opened = cell.where === 'shulker' || cell.where === 'bundle'
                    ? { ...x.open, [cell.where]: true } : x.open;
                if (cell.m === x.scene.chain[x.step]) return { ...x, open: opened, hit: cell, phase: 'hit' };
                return { ...x, open: opened, cursor: x.cursor + 1 };
            });
        }, cursor === 0 ? 420 : SWEEP_MS);
        return () => clearTimeout(id);
    }, [phase, cursor, order]);

    // After a find: hold the grade on screen, then hand over the next item and sweep again.
    useEffect(() => {
        if (phase !== 'hit' || calm) return undefined;
        const id = setTimeout(() => {
            setSt((x) => ({ ...x, found: [...x.found, x.hit], hit: null, step: x.step + 1, cursor: 0, phase: 'scan' }));
        }, 2600);
        return () => clearTimeout(id);
    }, [phase, calm]);

    const again = () => {
        const next = dealScene();
        setSt(calm ? settled(next) : { ...fresh(next), cursor: 0, phase: 'scan' });
    };

    // The sweep lights one cell; each grid is told only whether that cell is one of its own,
    // so the memoised grids it is not passing through do not re-render.
    const sweep = phase === 'scan' ? order[cursor] : null;
    const scanAt = (where) => (sweep && sweep.where === where ? sweep.i : -1);
    const grid = (where, cells, extra = {}) => (
        <Cells cells={cells} where={where} hit={hit} found={found} scanAt={scanAt(where)} {...extra} />
    );

    const p = oddsOf(scene.held, POOL_ALL, Math.max(1, streak));
    const grade = RARITY[gradeOf(p)];

    return (
        <div className="gp-b2b" ref={ref}>
            <div className="gp-b2b-stage">
                <div className="gp-inv" aria-hidden="true">
                    <span className="wk-label">Inventory</span>
                    {grid('main', scene.main)}
                    <div className="gp-hotbar">{grid('hotbar', scene.hotbar)}</div>
                    <span className="wk-label">Backpack</span>
                    {grid('backpack', scene.backpack)}
                    <div className="gp-inside">
                        <div className="gp-inside-one" data-open={open.bundle || undefined}>
                            <span className="gp-inside-label"><ItemSlot material="BUNDLE" size={24} tip={false} marks={false} /> Inside the bundle, in your inventory</span>
                            {grid('bundle', scene.bundle, { cols: scene.bundle.length })}
                        </div>
                        <div className="gp-inside-one" data-open={open.shulker || undefined}>
                            <span className="gp-inside-label"><ItemSlot material="SHULKER_BOX" size={24} tip={false} marks={false} /> Inside the shulker box, in your backpack</span>
                            {grid('shulker', scene.shulker)}
                        </div>
                    </div>
                </div>

                <div className="gp-b2b-read" aria-live="polite">
                    <span className="wk-label">Handed to you next</span>
                    {target && <Bossbar item={target} />}
                    {phase === 'idle' && <p className="gp-b2b-line">Is it already somewhere in your pack?</p>}
                    {phase === 'scan' && <p className="gp-b2b-line">Checking everything you hold…</p>}
                    {phase === 'hit' && hit && (
                        <>
                            <p className="gp-b2b-line"><strong>Already held.</strong> {WHERE[hit.where]}. It counts on the spot.</p>
                            <p className="gp-b2b-chain">Chain <span className="wk-datum">{streak}</span></p>
                            <p className="gp-b2b-math">
                                You hold <span className="wk-datum">{scene.held}</span> different items; <span className="wk-datum">{fmt(POOL_ALL)}</span> can
                                come up. (<span className="wk-datum">{scene.held}</span> ÷ <span className="wk-datum">{fmt(POOL_ALL)}</span>){streak > 1 && <sup>{streak}</sup>} ={' '}
                                <span className="wk-datum">{formatPercent(p * 100)}</span>
                            </p>
                            <p className="gp-grade" style={{ '--grade': grade.ink }}>{grade.label}</p>
                        </>
                    )}
                    {phase === 'miss' && (
                        <>
                            <p className="gp-b2b-line"><strong>Not held anywhere.</strong> The chain ends here: go and get it.</p>
                            <p className="gp-b2b-chain">Chain of <span className="wk-datum">{found.length}</span></p>
                        </>
                    )}
                    <div className="gp-round-row">
                        <button type="button" className="wk-btn wk-btn--quiet gp-btn-sm" onClick={again}>
                            <RotateCcw size={16} aria-hidden="true" /> Deal again
                        </button>
                    </div>
                </div>
            </div>
            <p className="wk-sr">
                Illustration: after each find the game checks your inventory, your backpack, and the shulker boxes
                and bundles in either for the next item. Here the first item is found inside a bundle in the
                inventory, the second inside a shulker box in the backpack, and the third is held nowhere, which
                ends the chain.
            </p>
        </div>
    );
}

const STREAKS = [1, 2, 3, 4, 5];
const POOLS = [
    { key: 'EARLY', label: 'Early open', size: COUNT.EARLY },
    { key: 'MID', label: 'Early + Mid', size: COUNT.EARLY + COUNT.MID },
    { key: 'LATE', label: 'All three', size: POOL_ALL },
];

function Odds() {
    const [held, setHeld] = useState(150);
    const [streak, setStreak] = useState(1);
    const [poolKey, setPoolKey] = useState('LATE');
    const pool = POOLS.find((x) => x.key === poolKey).size;
    const p = oddsOf(held, pool, streak);
    const grade = gradeOf(p);

    return (
        <div className="gp-odds">
            <div className="gp-odds-controls">
                <label className="gp-field">
                    <span className="wk-label">Different items you hold</span>
                    <input type="range" min="1" max="600" value={held} onChange={(e) => setHeld(Number(e.target.value))} aria-valuetext={`${held} items`} />
                    <span className="wk-datum gp-field-val">{held}</span>
                </label>
                <div className="gp-field">
                    <span className="wk-label" id="odds-chain">Chain</span>
                    <div className="gp-seg" role="group" aria-labelledby="odds-chain">
                        {STREAKS.map((n) => (
                            <button key={n} type="button" aria-pressed={streak === n} onClick={() => setStreak(n)}>{n}</button>
                        ))}
                    </div>
                </div>
                <div className="gp-field">
                    <span className="wk-label" id="odds-pool">Pool</span>
                    <div className="gp-seg" role="group" aria-labelledby="odds-pool">
                        {POOLS.map((x) => (
                            <button key={x.key} type="button" aria-pressed={poolKey === x.key} onClick={() => setPoolKey(x.key)}>
                                {x.label} <span className="gp-seg-n">{fmt(x.size)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <p className="gp-odds-result" aria-live="polite">
                <span className="gp-odds-math">
                    (<span className="wk-datum">{held}</span> ÷ <span className="wk-datum">{fmt(pool)}</span>){streak > 1 && <sup>{streak}</sup>} =
                </span>
                <span className="wk-figure gp-odds-pct">{formatPercent(p * 100)}</span>
                <span className="gp-grade" style={{ '--grade': RARITY[grade].ink }}>{RARITY[grade].label}</span>
            </p>

            <ol className="gp-ladder" aria-label="The five grades">
                {FIND_RARITY.map((r, i) => (
                    <li key={r.key} className="gp-rung" data-on={r.key === grade || undefined}
                        style={{ '--ink': r.ink, '--from': r.from ?? r.ink, '--to': r.to ?? r.ink, '--w': `${22 + i * 19.5}%` }}>
                        <span className="gp-rung-bar" aria-hidden="true" />
                        <span className="gp-rung-word">{r.label}</span>
                        <span className="gp-rung-when">{r.when}</span>
                        {(r.key === 'LEGENDARY' || r.key === 'RNGESUS') && <span className="gp-rung-note">The whole server hears it</span>}
                    </li>
                ))}
            </ol>
        </div>
    );
}

function BackToBacks({ calm }) {
    return (
        <section id="back-to-backs" className="wk-wrap pg-sec gp-sec-wide" aria-labelledby="b2b-title">
            <div className="pg-sec-head">
                <h2 id="b2b-title" className="wk-h3">Already holding it</h2>
                <p className="wk-p">
                    After every find, the game checks whether you <strong>already hold the next item</strong>: your
                    inventory, your backpack, and every shulker box and bundle in either (a bundle inside a shulker
                    box too), and on a team your teammate's inventory as well. If it is there, it counts on the spot, and the item after it is
                    checked the same way. That is a back-to-back, and they chain.
                </p>
                <p className="wk-p">
                    The game grades each one by how unlikely it was: the share of the pool you hold, raised to
                    the length of the chain. Handed the very item you just found is Extraordinary, whatever the odds.
                </p>
                <p className="wk-small">No back-to-backs in Run Battle.</p>
            </div>

            <div className="gp-b2b-wrap">
                <BackToBack calm={calm} />
                <h3 className="wk-name gp-sub">Work out the odds</h3>
                <Odds />
            </div>
        </section>
    );
}

/* ── 5. The modes ────────────────────────────────────────────────────────────── */

function laneStart() {
    return HEADS.map(() => {
        const [current, ...trail] = picks(EARLY_MID, 4);
        return { current, trail, score: trail.length };
    });
}

function SimFIB({ live }) {
    const [lanes, setLanes] = useState(laneStart);
    const step = useCallback(() => {
        setLanes((ls) => ls.map((l, i) => {
            if (Math.random() > [0.2, 0.14, 0.1][i]) return l;
            return { current: pick(EARLY_MID), trail: [l.current, ...l.trail].slice(0, 4), score: l.score + 1 };
        }));
    }, []);
    useTicker(step, 420, live);
    return (
        <div className="gp-sim gp-sim--fib" aria-hidden="true">
            {lanes.map((l, i) => (
                <div key={HEADS[i]} className="gp-lane">
                    <Head name={HEADS[i]} />
                    <span className="gp-lane-trail">
                        {l.trail.slice().reverse().map((m, j, arr) => (
                            <span key={`${m}-${l.score - (arr.length - j)}`} className="gp-done" style={{ '--age': arr.length - 1 - j }}>
                                <ItemSlot material={m} size={36} tip={false} marks={false} /><Tick />
                            </span>
                        ))}
                    </span>
                    <span className="gp-live" key={l.current}><ItemSlot material={l.current} size={48} tip={false} /></span>
                    <span className="wk-figure gp-lane-score">{l.score}</span>
                </div>
            ))}
        </div>
    );
}

function SimRun({ live }) {
    const fresh = (scores) => ({
        target: pick(POOL_BY_STAGE.MID), pos: [0, 0, 0], winner: null, hold: 0, scores,
        speed: HEADS.map(() => 0.012 + Math.random() * 0.016),
    });
    // The still frame (calm, or before it scrolls in) is a finished race: the +1 is the point.
    const [race, setRace] = useState(() => ({ ...fresh([2, 3, 1]), pos: [0.62, 1, 0.48], winner: 1 }));
    const step = useCallback(() => {
        setRace((r) => {
            if (r.winner !== null) return r.hold < 24 ? { ...r, hold: r.hold + 1 } : fresh(r.scores);
            const pos = r.pos.map((x, i) => Math.min(1, x + r.speed[i] * (0.6 + Math.random() * 0.8)));
            const w = pos.findIndex((x) => x >= 1);
            if (w < 0) return { ...r, pos };
            return { ...r, pos, winner: w, scores: r.scores.map((n, i) => (i === w ? n + 1 : n)) };
        });
    }, []);
    useTicker(step, 60, live);
    return (
        <div className="gp-sim gp-sim--run" aria-hidden="true">
            <div className="gp-racers">
                {HEADS.map((h, i) => (
                    <div key={h} className="gp-racer" data-won={race.winner === i || undefined}>
                        <span className="gp-racer-track"><span className="gp-racer-fill" style={{ width: `${race.pos[i] * 100}%` }} /></span>
                        <span className="gp-racer-head" style={{ left: `${race.pos[i] * 100}%` }}><Head name={h} size={24} /></span>
                        {race.winner === i && <span className="gp-racer-plus">+1</span>}
                        <span className="wk-figure gp-lane-score">{race.scores[i]}</span>
                    </div>
                ))}
            </div>
            <span className="gp-live gp-run-target" key={race.target}><ItemSlot material={race.target} size={72} tip={false} /></span>
        </div>
    );
}

function SimChain({ live }) {
    // done, now, next, and one drawn but not shown yet.
    const [seq, setSeq] = useState(() => picks(EARLY_MID, 4));
    const step = useCallback(() => setSeq((s) => [s[1], s[2], s[3], pick(EARLY_MID)]), []);
    useTicker(step, 2400, live);
    const [done, now, next] = seq;
    return (
        <div className="gp-sim gp-sim--chain" aria-hidden="true">
            <Bossbar item={now} next={next} />
            <div className="gp-belt">
                <span className="gp-belt-step gp-belt-done" key={`d-${done}`}>
                    <span className="gp-done"><ItemSlot material={done} size={40} tip={false} marks={false} /><Tick /></span>
                    <span className="gp-seq-cap">Found</span>
                </span>
                <span className="gp-seq-to" />
                <span className="gp-belt-step" key={`n-${now}`}>
                    <span className="gp-live"><ItemSlot material={now} size={60} tip={false} /></span>
                    <span className="gp-seq-cap">Now</span>
                </span>
                <span className="gp-seq-to" />
                <span className="gp-belt-step gp-belt-next" key={`x-${next}`}>
                    <ItemSlot material={next} size={52} tip={false} />
                    <span className="gp-seq-cap">Next</span>
                </span>
                <span className="gp-seq-to" data-dim="true" />
                <span className="gp-belt-step">
                    <span className="gp-belt-hidden">
                        <span className="wk-slot gp-hidden" style={{ '--slot': '44px' }}>?</span>
                        <span className="wk-slot gp-hidden" style={{ '--slot': '44px' }}>?</span>
                    </span>
                    <span className="gp-seq-cap">Not shown</span>
                </span>
            </div>
        </div>
    );
}

const MODES = [
    {
        key: 'fib', name: 'ForceItemBattle', Sim: SimFIB, setting: 'The default.',
        hook: 'Collect more items than everyone else before time runs out.',
        rules: [
            'Everyone draws their own items from the same pool, at their own pace.',
            'Most items when the timer hits zero wins.',
        ],
        caption: 'Three players, each on their own draws.',
    },
    {
        key: 'run', name: 'RunBattle', Sim: SimRun, setting: <>Switched on in <code className="wk-typed">/settings</code>: Run Battle.</>,
        hook: 'First to claim the target item takes the point.',
        rules: [
            'One item for the whole server. The first to get it scores, and everyone moves on to the next one together.',
            'No back-to-backs, no random events, and the round does not count toward stats.',
        ],
        caption: 'One target, three players racing it.',
    },
    {
        key: 'chain', name: 'ForceChain', Sim: SimChain, setting: <>Switched on in <code className="wk-typed">/settings</code>: Force Chain.</>,
        hook: 'Your next item is always visible. Plan two moves ahead.',
        rules: [
            'The bossbar shows your current item and the one after it.',
            'Beyond the next one, nothing is shown. The best players route for both at once.',
        ],
        caption: 'The chain moving on after each find.',
    },
];

function Mode({ mode, calm }) {
    const ref = useRef(null);
    const on = useOnScreen(ref);
    const { Sim } = mode;
    return (
        <li ref={ref} className="gp-mode">
            <figure className="gp-mode-fig">
                <Sim live={on && !calm} />
                <figcaption className="wk-small">{mode.caption}</figcaption>
            </figure>
            <div className="gp-mode-copy">
                <h3 className="gp-mech">{mode.name}</h3>
                <p className="gp-mode-hook">{mode.hook}</p>
                <ul className="gp-mode-rules">
                    {mode.rules.map((r) => <li key={r}>{r}</li>)}
                </ul>
                <p className="wk-small">{mode.setting}</p>
            </div>
        </li>
    );
}

function Modes({ calm }) {
    return (
        <section id="modes" className="wk-wrap gp-modes" aria-labelledby="modes-title">
            <h2 id="modes-title" className="wk-h3">Three ways to play</h2>
            <ul className="gp-mode-list">
                {MODES.map((m) => <Mode key={m.key} mode={m} calm={calm} />)}
            </ul>
        </section>
    );
}

/* ── 6. Random events ────────────────────────────────────────────────────────── */

const EVENTS = [
    { key: 'ITEM_HUNT', name: 'Item Hunt', face: 'SPYGLASS', weight: 10, once: false, minLeft: 0 },
    { key: 'POINT_HUNT', name: 'Point Hunt', face: 'TARGET', weight: 6, once: true, minLeft: 11 * 60 },
    { key: 'SPECIAL_TRADER', name: 'Special Trader', face: 'EMERALD', weight: 2, once: true, minLeft: 0 },
];
const EVENT = Object.fromEntries(EVENTS.map((e) => [e.key, e]));
const EVENT_ROUND = ROUND.minutes;
const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

/** RandomEventManager.planSchedule, then pickWeighted at each slot. */
function planRound(minutes) {
    const total = minutes * 60;
    const out = [];
    const fired = new Set();
    let elapsed = randInt(30, 20 * 60);
    while (total - elapsed >= 5 * 60) {
        const left = total - elapsed;
        const eligible = EVENTS.filter((e) => !(e.once && fired.has(e.key)) && e.minLeft <= left);
        let roll = Math.floor(Math.random() * eligible.reduce((n, e) => n + e.weight, 0));
        const type = eligible.find((e) => (roll -= e.weight) < 0) ?? eligible[eligible.length - 1];
        if (type) { out.push({ at: elapsed, key: type.key }); fired.add(type.key); }
        elapsed += randInt(12 * 60, 20 * 60);
    }
    return out;
}

const LOCATORS = ['WITHER_ROSE', 'MUSIC_DISC_CHIRP', 'KNOWLEDGE_BOOK'];
const ARMOUR = ['IRON_HELMET', 'IRON_CHESTPLATE', 'IRON_LEGGINGS', 'IRON_BOOTS'];

function Cycling({ list, live, label }) {
    const [i, setI] = useState(0);
    const step = useCallback(() => setI((n) => (n + 1) % list.length), [list.length]);
    useTicker(step, 1600, live);
    return <span className="gp-cycle" title={label}><ItemSlot key={list[i]} material={list[i]} size={48} tip={false} marks={false} className="gp-land" /></span>;
}

function Events({ calm }) {
    const [plan, setPlan] = useState(() => planRound(EVENT_ROUND));
    const ref = useRef(null);
    const on = useOnScreen(ref);
    const live = on && !calm;
    const offers = [
        { el: <span className="gp-cycle"><ItemSlot material="NETHER_STAR" size={48} tip={false} marks={false} /><span className="wk-count">3</span></span>, name: '3 Wheels of Fortune', price: 1 },
        { el: <ItemSlot material="TORCHFLOWER" size={48} tip={false} marks={false} />, name: 'Weathered Captain\'s Journal', price: 5 },
        { el: <Cycling list={LOCATORS} live={live} label="A locator, rolled when the trader arrives" />, name: 'A locator', price: 5 },
        { el: <ItemSlot material="IRON_PICKAXE" size={48} tip={false} marks={false} />, name: 'Enchanted iron pickaxe', price: 5 },
        { el: <Cycling list={ARMOUR} live={live} label="One piece of iron armour, rolled when the trader arrives" />, name: 'Enchanted iron armour piece', price: 5 },
    ];

    return (
        <section id="events" className="wk-wrap pg-sec" aria-labelledby="events-title" ref={ref}>
            <div className="pg-sec-head">
                <h2 id="events-title" className="wk-h3">Random events</h2>
                <p className="wk-p">
                    Every 12 to 20 minutes the server may call an event: roughly three or four an hour, the first
                    within 20 minutes, none in the last five. Each one pays in <strong>Wheels of Fortune</strong>.
                </p>
                <p className="wk-small">
                    On by default. They need at least two players, and never run in Run Battle.
                </p>
            </div>

            <div className="gp-events">
                <div className="gp-evline" style={{ '--len': EVENT_ROUND }}>
                    <div className="gp-evline-track" aria-hidden="true">
                        <span className="gp-evline-end" style={{ left: `${((EVENT_ROUND - 5) / EVENT_ROUND) * 100}%` }} />
                        {plan.map((e, i) => (
                            <span key={`${e.at}-${i}`} className="gp-evmark" style={{ left: `${(e.at / (EVENT_ROUND * 60)) * 100}%`, '--i': i }}>
                                <ItemSlot material={EVENT[e.key].face} size={36} tip={false} marks={false} />
                                <span className="gp-evmark-when">min {Math.round(e.at / 60)}</span>
                            </span>
                        ))}
                    </div>
                    <div className="gp-rail-ends" aria-hidden="true"><span>0</span><span>{EVENT_ROUND} min</span></div>
                    <p className="wk-sr">
                        One possible {EVENT_ROUND}-minute round: {plan.map((e) => `${EVENT[e.key].name} at minute ${Math.round(e.at / 60)}`).join(', ')}.
                    </p>
                    <div className="gp-round-row">
                        <p className="wk-small">One possible {EVENT_ROUND}-minute round. No event starts in the last five minutes.</p>
                        <button type="button" className="wk-btn wk-btn--quiet gp-btn-sm" onClick={() => setPlan(planRound(EVENT_ROUND))}>
                            <Dices size={16} aria-hidden="true" /> Another round
                        </button>
                    </div>
                </div>

                <ul className="gp-event-list">
                    <li className="gp-event">
                        <ItemSlot material="SPYGLASS" size={48} tip={false} marks={false} />
                        <div>
                            <h3 className="wk-name">Item Hunt</h3>
                            <p className="gp-event-often">The one picked most often.</p>
                            <p className="gp-event-text">The first player to go and get their current item wins 1 to 3 Wheels of Fortune. A joker or a back-to-back does not count, and on a team only the finder is paid.</p>
                        </div>
                    </li>
                    <li className="gp-event">
                        <ItemSlot material="TARGET" size={48} tip={false} marks={false} />
                        <div>
                            <h3 className="wk-name">Point Hunt</h3>
                            <p className="gp-event-often">Once a round, with at least 11 minutes left.</p>
                            <p className="gp-event-text">
                                Ten minutes in which every find scores by its stage:{' '}
                                <span style={{ color: STAGES.EARLY.ink }}>Early</span> <span className="wk-datum">1</span>,{' '}
                                <span style={{ color: STAGES.MID.ink }}>Mid</span> <span className="wk-datum">2</span>,{' '}
                                <span style={{ color: STAGES.LATE.ink }}>Late</span> <span className="wk-datum">3</span>. Back-to-backs count, skips do not.
                                The top player takes 3 Wheels, a top team 4 split between them. A tie pays nobody.
                            </p>
                        </div>
                    </li>
                    <li className="gp-event">
                        <ItemSlot material="EMERALD" size={48} tip={false} marks={false} />
                        <div>
                            <h3 className="wk-name">Special Trader</h3>
                            <p className="gp-event-often">Once a round, and the rarest pick.</p>
                            <p className="gp-event-text">A trader appears near spawn with five offers, one use each for every player:</p>
                        </div>
                    </li>
                </ul>
                <ul className="gp-offers" aria-label="The Special Trader's offers">
                    {offers.map((o) => (
                        <li key={o.name} className="gp-offer">
                            {o.el}
                            <span className="gp-offer-name">{o.name}</span>
                            <span className="gp-offer-price">
                                <img src="/fib-items/emerald.png" alt="" width="16" height="16" />
                                <span className="wk-datum">{o.price}</span>
                                <span className="wk-sr">{o.price === 1 ? 'emerald' : 'emeralds'}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

/* ── 7. Strategy ─────────────────────────────────────────────────────────────── */

const TIPS = [
    { face: 'SHULKER_BOX', name: 'Keep one of everything',
      text: 'The more different items you carry, the more often the next draw is already in your pack. A shulker box or bundle of odds and ends counts in full.' },
    { face: 'CLOCK', name: 'Decide fast',
      text: 'Whether an item is worth pursuing or worth a joker is the call that wins rounds. Waiting to decide costs the same as the wrong decision.' },
    { face: 'FILLED_MAP', name: 'Split up',
      text: 'In a team, head in entirely different directions. Covering more biomes means a better chance of being near whatever comes up.' },
    { face: 'BARREL', name: 'Build a base you can read',
      text: 'Compact, near varied biomes or caves, and sorted, so nothing gets lost mid-round. A good setup matters more than luck.' },
];

function Strategy() {
    return (
        <section id="strategy" className="wk-wrap pg-sec" aria-labelledby="strategy-title">
            <div className="pg-sec-head">
                <h2 id="strategy-title" className="wk-h3">Playing it well</h2>
                <p className="wk-p">
                    There is no single meta. The players who win consistently stay organised, decide quickly and adapt.
                </p>
            </div>
            <ul className="gp-tips">
                {TIPS.map((t) => (
                    <li key={t.name} className="gp-tip">
                        <ItemSlot material={t.face} size={48} tip={false} marks={false} />
                        <span>
                            <span className="gp-way-name">{t.name}</span>
                            <span className="gp-tip-text">{t.text}</span>
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}

/* ── The page ───────────────────────────────────────────────────────────────── */

const CONTENTS = [
    ['round', 'The round'], ['pool', 'The pool'], ['jokers', 'Jokers'], ['back-to-backs', 'Back-to-backs'],
    ['modes', 'Modes'], ['events', 'Random events'], ['strategy', 'Strategy'],
];

export default function Gameplay({ onNavigate }) {
    const calm = useCalm();
    const go = useGo(onNavigate);
    return (
        <main className="pg">
            <header className="wk-wrap pg-head">
                <h1 className="wk-h2">Gameplay</h1>
                <p className="wk-lede">
                    Everything you need to understand ForceItemBattle: how the loop works, which modes exist,
                    and how the best players stay ahead.
                </p>
                <nav className="gp-toc" aria-label="On this page">
                    <span className="wk-label">On this page</span>
                    {CONTENTS.map(([id, label]) => <a key={id} className="wk-link" href={`#${id}`}>{label}</a>)}
                </nav>
            </header>
            <Round />
            <Clock />
            <Jokers />
            <BackToBacks calm={calm} />
            <Modes calm={calm} />
            <Events calm={calm} />
            <Strategy />
            <PageLinks ids={['pools', 'settings', 'commands', 'how-to-play']} go={go} />
            <Footer />
            <TooltipLayer />
        </main>
    );
}
