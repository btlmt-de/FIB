import React, { useEffect, useRef, useState } from 'react';
import Play from 'lucide-react/dist/esm/icons/play';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import SkipForward from 'lucide-react/dist/esm/icons/skip-forward';
import { useCalm } from '../../config/power.js';
import { POOL_BY_STAGE, itemName } from '../data/atlas.js';
import Mini from '../game/Mini.jsx';
import SkinFigure from '../game/SkinFigure.jsx';
import { ROUND, STAGES } from '../tokens.js';
import { spriteFallback, spriteOf } from '../game/sprite.js';
import './resultceremony.css';

/* Replays the plugin's ceremony/* (StageLayout, ResultStage, StageTimeline, StagePalette) at its own pace. Sounds and seats are left out. */

const TICK = 50;
const X0 = -8.8;
const W = 17.6;
const TOP = 14;
const px = (x) => ((x - X0) / W) * 100;
const py = (y) => ((TOP - y) / W) * 100;
const size = (s) => (s / W) * 100;

// StageLayout
const CANVAS = { w: 16, h: 8, bottom: 4, mid: 8 };
const MAX_CELL = 1.6;
const SPOT = { y: 1.3 + 2.0 + 0.3 + 1.2, size: 2.4 };
const CARD_Y = 1.3;
const TITLE_Y = 13.1;
const COUNTER_Y = 12.35;
const BUTTON = { x: 6.5, y: 12.8 };
const STEP = { width: 2.2, gap: 0.8 };
const podiumX = (place) => (place === 1 ? 0 : place === 2 ? -(STEP.width + STEP.gap) : STEP.width + STEP.gap);
const podiumHeight = (place) => (place === 1 ? 1.4 : place === 2 ? 0.9 : 0.5);
const STEP_BLOCK = { 1: 'gold_block', 2: 'iron_block', 3: 'copper_block' };
const PLACE_COLOR = { 1: 'gold', 2: 'gray', 3: 'red' };

// StageTimeline
const FLIGHT = 6;
const OVERLAP = 3;
const EXTRA = { RARE: 10, EPIC: 14 };
const baseGap = (count) => Math.max(4, 8 - Math.floor(Math.max(0, count - 10) / 8));
const gapAfter = (f, count) => baseGap(count) + (f.b2b ? EXTRA[f.b2b.rarity] : 0);
const holdFor = (f, count) => Math.max(2, gapAfter(f, count) - OVERLAP);

// StagePalette and Rarity
const GLOW = { RARE: '#5555FF', EPIC: '#AA00AA', JOKER: '#FF5555' };
const LABEL = { RARE: '<blue><b>RARE</b></blue>', EPIC: '<dark_purple><b>EPIC</b></dark_purple>' };
const RARITY_NAME = { RARE: '<blue>Rare', EPIC: '<dark_purple>Epic' };
const FIREWORK = { 1: '#FFAA00', 2: '#D0D0D0', 3: '#C06040' };

/** StageLayout.gridFor: the column count giving the biggest cell that still fits them all. */
function gridFor(count) {
    const items = Math.max(1, count);
    let best = 1;
    let bestCell = 0;
    for (let columns = 1; columns <= items; columns++) {
        const rows = Math.ceil(items / columns);
        const cell = Math.min(CANVAS.w / columns, CANVAS.h / rows);
        if (cell > bestCell) { bestCell = cell; best = columns; }
    }
    const cell = Math.min(bestCell, MAX_CELL);
    const rows = Math.ceil(items / best);
    return {
        cell,
        item: cell * 0.8,
        slot: (i) => ({
            x: -best * cell / 2 + ((i % best) + 0.5) * cell,
            y: CANVAS.mid + rows * cell / 2 - (Math.floor(i / best) + 0.5) * cell,
        }),
    };
}

/** TimeFormat.humanised: 1h 5m 30s, dropping any zero part. */
function humanised(total) {
    const s = total % 60;
    const m = Math.floor(total / 60) % 60;
    const h = Math.floor(total / 3600);
    return [h && `${h}h`, m && `${m}m`, s && `${s}s`].filter(Boolean).join(' ') || '0s';
}

/** BackToBackProbability.formatPercent, for the percentages a demo round produces. */
const percent = (p) => `${p >= 1 ? Number(p.toFixed(2)) : Number(p.toPrecision(2))}%`;

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));

const PLAYERS = [
    { name: 'Steve', skin: '/fib-entities/skins/steve.png' },
    { name: 'Alex', skin: '/fib-entities/skins/alex.png', slim: true },
    { name: 'Kai', skin: '/fib-entities/skins/kai.png' },
    { name: 'Noor', skin: '/fib-entities/skins/noor.png' },
];

function playFinds(count) {
    const total = ROUND.minutes * 60;
    // Targets are capped at the indices there are, so a short list cannot leave a loop waiting forever.
    const jokers = new Set();
    const jokerTarget = Math.min(randInt(0, 2), Math.max(0, count - 2));
    while (jokers.size < jokerTarget) jokers.add(randInt(2, count - 1));
    const b2bs = new Set();
    const b2bTarget = Math.min(randInt(1, 3), Math.max(0, count - 1 - jokers.size));
    while (b2bs.size < b2bTarget) { const i = randInt(1, count - 1); if (!jokers.has(i)) b2bs.add(i); }
    const weights = Array.from({ length: count }, (_, i) => (b2bs.has(i) ? 0 : rand(0.4, 1.6)));
    const scale = (total - rand(40, 240)) / weights.reduce((a, b) => a + b, 0);
    const seen = new Set();
    let elapsed = 0;
    return weights.map((w, i) => {
        const taken = b2bs.has(i) ? randInt(0, 2) : Math.round(w * scale);
        elapsed += taken;
        const open = ['EARLY', 'MID', 'LATE'].filter((k) => elapsed >= STAGES[k].minute * 60);
        const pool = open.flatMap((k) => POOL_BY_STAGE[k]);
        let material;
        do { material = pool[Math.floor(Math.random() * pool.length)]; } while (seen.has(material));
        seen.add(material);
        const epic = Math.random() < 0.3;
        return {
            material,
            left: humanised(Math.max(0, total - elapsed)),
            taken,
            joker: jokers.has(i),
            b2b: b2bs.has(i) ? { rarity: epic ? 'EPIC' : 'RARE', odds: epic ? rand(1.1, 4.9) : rand(5.5, 28) } : null,
        };
    });
}

function playRound() {
    const winner = randInt(24, 29);
    const counts = [winner, winner - randInt(2, 4)];
    counts.push(counts[1] - randInt(2, 4), counts[1] - randInt(6, 9));
    const order = [...PLAYERS].sort(() => Math.random() - 0.5);
    return order.map((p, i) => ({ ...p, place: i + 1, finds: playFinds(counts[i]) }));
}

/** ItemCard.linesOf, for a solo round. */
function cardOf(f) {
    const lines = [`<white><b>${itemName(f.material)}</b>`, `<gray>⌚ <gold>${f.left}`];
    if (f.joker) lines.push('<dark_gray>[<red>Joker<dark_gray>]');
    if (f.b2b) lines.push(`<dark_aqua>B2B <dark_gray>» <aqua>${percent(f.b2b.odds)} <dark_gray>(<reset>${LABEL[f.b2b.rarity]}<dark_gray>)`);
    return lines;
}

/** SummaryCard.linesOf, for a solo round. */
function summaryOf(p) {
    const lines = ['<gold><b>STATS', `<gray>Items <white>${p.finds.length}`];
    const b2b = p.finds.filter((f) => f.b2b);
    lines.push(`<gray>Back-to-backs <white>${b2b.length}`);
    ['RARE', 'EPIC'].forEach((r) => {
        const n = b2b.filter((f) => f.b2b.rarity === r).length;
        if (n) lines.push(`  ${RARITY_NAME[r]} <white>×${n}`);
    });
    const longest = p.finds.reduce((a, f) => (f.taken > a.taken ? f : a));
    const earned = p.finds.filter((f) => !f.joker && !f.b2b);
    const fastest = earned.reduce((a, f) => (f.taken < a.taken ? f : a), earned[0]);
    lines.push(`<gray>Longest <white>${itemName(longest.material)} <gold>${humanised(longest.taken)}`);
    if (fastest) lines.push(`<gray>Fastest <white>${itemName(fastest.material)} <gold>${humanised(fastest.taken)}`);
    return lines;
}

const glowOf = (f) => (f.b2b ? GLOW[f.b2b.rarity] : f.joker ? GLOW.JOKER : null);

const OPENING = {
    title: '<gold><b>RESULTS',
    counter: '<gray>The first reveal is on its way',
    card: [],
    spot: null,
    grid: [],
    layout: gridFor(1),
    podium: 0,
    standing: [],
    bursts: [],
    browsing: null,
    chat: ['<red>Use /result to see the results from every player'],
    done: false,
};

function finished(round) {
    const winner = round[0];
    return {
        ...OPENING,
        ...named(winner),
        grid: winner.finds.map((f, i) => ({ f, i, key: `w${i}` })),
        layout: gridFor(winner.finds.length),
        podium: 1,
        standing: [1, 2, 3],
        browsing: 0,
        chat: [...round].reverse().map(announcement),
        done: true,
    };
}

const named = (p) => ({ title: `<${PLACE_COLOR[p.place] ?? 'white'}><b>${p.place}. <white>${p.name}`, counter: `<gold>${p.finds.length} Items found` });
const announcement = (p) => `<${PLACE_COLOR[p.place] ?? 'white'}>${p.place}<white>. ${p.name} <dark_gray>┃ <gold>${p.finds.length} Items found <dark_gray>» [<aqua>Inventory<dark_gray>]`;

function Sprite({ material }) {
    return <img className="rs-sprite" src={spriteOf(material)} data-material={material} onError={spriteFallback} alt="" width="128" height="128" draggable="false" />;
}

/* Opens on the finished stage: the empty one said nothing at first sight. */
function opening() {
    const round = playRound();
    return { round, st: finished(round) };
}

export default function ResultCeremony() {
    const calm = useCalm();
    const [first] = useState(opening);
    const [round, setRound] = useState(first.round);
    const [st, setSt] = useState(first.st);
    const [playing, setPlaying] = useState(false);
    const [played, setPlayed] = useState(false);
    const timers = useRef([]);
    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    const stop = () => { timers.current.forEach(clearTimeout); timers.current = []; };
    const at = (ms, fn) => timers.current.push(setTimeout(fn, ms));
    const patch = (p) => setSt((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) }));

    const play = () => {
        stop();
        const r = playRound();
        setRound(r);
        setSt(OPENING);
        setPlaying(true);
        setPlayed(true);
        let t = 600;
        [...r].reverse().forEach((p) => {
            const count = p.finds.length;
            const layout = gridFor(count);
            at(t, () => patch((s) => ({ chat: [...s.chat, '<gray>/result'].slice(-4) })));
            t += 500;
            at(t, () => patch({ title: '<gray><b>????????', counter: '<gold>0 <gray>Items', grid: [], layout, card: [], spot: null }));
            let tick = 20;
            let dealt = tick;
            p.finds.forEach((f, i) => {
                const hold = holdFor(f, count);
                at(t + tick * TICK, () => patch({ spot: { f, key: `${p.name}${i}` }, card: cardOf(f), counter: `<gold>${i + 1} <gray>Items` }));
                at(t + (tick + hold) * TICK, () => patch((s) => ({
                    spot: s.spot?.key === `${p.name}${i}` ? null : s.spot,
                    grid: [...s.grid, { f, i, key: `${p.name}${i}`, fly: true }],
                })));
                dealt = tick + hold + FLIGHT;
                tick += gapAfter(f, count);
            });
            at(t + dealt * TICK, () => patch({ card: [] }));
            at(t + (dealt + 40) * TICK, () => patch((s) => ({ ...named(p), chat: [...s.chat, announcement(p)].slice(-4) })));
            t += (dealt + 40) * TICK + 1400;
        });
        // ResultStage.finale
        t -= 1400;
        const podium = t + 50 * TICK;
        at(podium, () => patch({ podium: 1 }));
        [3, 2, 1].forEach((place) => at(podium + (20 + (4 - place) * 15) * TICK, () => patch((s) => ({ standing: [...s.standing, place] }))));
        for (let d = 20 + 45, wave = 0; d <= 20 + 105; d += 20, wave++) {
            const shots = [1, 2, 3].flatMap((place) => [-1.6, 1.6].map((side) => ({ id: `${wave}${place}${side}`, place, x: podiumX(place) + side, y: rand(7.5, 11.5) })));
            at(podium + d * TICK, () => patch((s) => ({ bursts: [...s.bursts, ...shots] })));
        }
        at(podium + (100 + 20 + 45) * TICK, () => { patch({ browsing: 0, done: true }); setPlaying(false); });
    };

    const skip = () => { stop(); setSt(finished(round)); setPlaying(false); };

    const view = calm && !st.done ? finished(round) : st;

    const browse = (step) => {
        const i = (((view.browsing ?? 0) + step) % round.length + round.length) % round.length;
        const p = round[i];
        setSt({ ...view, browsing: i, ...named(p), grid: p.finds.map((f, j) => ({ f, i: j, key: `b${i}-${j}` })), layout: gridFor(p.finds.length) });
    };
    const shown = view.browsing != null ? round[view.browsing] : null;

    return (
        <figure className="rs">
            <div className="rs-scene">
                <div className="rs-stage" aria-hidden="true">
                    <Text y={TITLE_Y} x={0} scale={3} line={view.title} display />
                    <Text y={COUNTER_Y} x={0} scale={1.6} line={view.counter} display />
                    {view.browsing != null && (
                        <>
                            <button type="button" className="rs-btn" tabIndex={-1} style={{ '--x': px(-BUTTON.x), '--y': py(BUTTON.y), '--fs': size(0.2 * 2) }} onClick={() => browse(-1)}>
                                <Mini text="<yellow>◀ <white>Previous" />
                            </button>
                            <button type="button" className="rs-btn" tabIndex={-1} style={{ '--x': px(BUTTON.x), '--y': py(BUTTON.y), '--fs': size(0.2 * 2) }} onClick={() => browse(1)}>
                                <Mini text="<white>Next <yellow>▶" />
                            </button>
                        </>
                    )}
                    {view.grid.map((g) => {
                        const at = view.layout.slot(g.i);
                        const glow = glowOf(g.f);
                        return (
                            <span key={g.key} className="rs-item" data-fly={g.fly || undefined}
                                  style={{
                                      '--x': px(at.x), '--y': py(at.y), '--s': size(view.layout.item),
                                      '--from-x': px(0) - px(at.x), '--from-y': py(SPOT.y) - py(at.y), '--from-s': SPOT.size / view.layout.item,
                                      '--glow': glow ?? 'transparent',
                                  }}>
                                <Sprite material={g.f.material} />
                            </span>
                        );
                    })}
                    {view.spot && (
                        <span key={view.spot.key} className="rs-item rs-spot" data-rare={view.spot.f.b2b ? true : undefined}
                              style={{ '--x': px(0), '--y': py(SPOT.y), '--s': size(SPOT.size), '--glow': glowOf(view.spot.f) ?? 'transparent' }}>
                            <Sprite material={view.spot.f.material} />
                        </span>
                    )}
                    <span className="rs-text rs-card" style={{ '--x': px(0), '--y': py(CARD_Y), '--fs': size(0.2 * 1.5) }}>
                        {view.card.map((l, i) => <Mini key={i} text={l} className="rs-line" />)}
                    </span>
                    {view.podium > 0 && [2, 1, 3].map((place) => {
                        const owner = round.find((p) => p.place === place);
                        const h = podiumHeight(place);
                        const up = view.standing.includes(place);
                        return (
                            <React.Fragment key={place}>
                                <span className="rs-step" style={{
                                    '--x': px(podiumX(place) - STEP.width / 2), '--y': py(h), '--w': size(STEP.width), '--h': size(h),
                                    '--tex': `url(/fib-entities/blocks/${STEP_BLOCK[place]}.png)`,
                                }} />
                                {up && owner && (
                                    <>
                                        <Figure skin={owner.skin} slim={owner.slim} x={podiumX(place)} y={h} />
                                        <Text x={podiumX(place)} y={h + 2.3} scale={1.35} lines={[`<${PLACE_COLOR[place]}><b>${place}.</b> <gold>${owner.finds.length} Items`, `<white>${owner.name}`]} />
                                    </>
                                )}
                            </React.Fragment>
                        );
                    })}
                    {view.bursts.map((b) => (
                        <span key={b.id} className="rs-burst" data-star={b.place === 1 || undefined}
                              style={{ '--x': px(b.x), '--y': py(b.y), '--c': FIREWORK[b.place], '--s': size(2.2) }}>
                            {Array.from({ length: 8 }, (_, k) => <i key={k} style={{ '--a': `${k * 45}deg` }} />)}
                        </span>
                    ))}
                </div>
                {/* Always rendered, so its column never resizes the stage. */}
                <div className="rs-summary">
                    {shown && (
                        <>
                            {summaryOf(shown).map((l, i) => <Mini key={i} text={l} className="rs-line" />)}
                            <Mini text="" className="rs-line" />
                            <Mini text="<dark_gray>Click ◀ ▶ to browse" className="rs-line" />
                        </>
                    )}
                </div>
            </div>

            <div className="rs-chat" aria-live="polite">
                {view.chat.slice(-4).map((l, i) => <Mini key={`${i}${l}`} text={l} className="rs-chatline" />)}
            </div>

            <figcaption className="gp-round-row rs-foot">
                <p className="wk-small">
                    One made-up round, finished: four players, their finds drawn from the real pool.
                    {!calm && <> Play it to watch the reveal from the first <code className="wk-typed">/result</code>.</>}
                </p>
                <span className="rs-actions">
                    {!calm && (
                        playing
                            ? <button type="button" className="wk-btn wk-btn--quiet gp-btn-sm" onClick={skip}><SkipForward size={16} aria-hidden="true" /> Skip to the podium</button>
                            : <button type="button" className="wk-btn gp-btn-sm" onClick={play}>{played ? <RotateCcw size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />} {played ? 'Another round' : 'Play the results'}</button>
                    )}
                    {view.browsing != null && (
                        <>
                            <button type="button" className="wk-btn wk-btn--quiet gp-btn-sm" onClick={() => browse(-1)} aria-label="Previous result">◀</button>
                            <button type="button" className="wk-btn wk-btn--quiet gp-btn-sm" onClick={() => browse(1)} aria-label="Next result">▶</button>
                        </>
                    )}
                </span>
            </figcaption>
            <p className="wk-sr" aria-live="polite">
                {view.done && shown ? `${shown.place}. ${shown.name}, ${shown.finds.length} items found.` : ''}
            </p>
        </figure>
    );
}

/* Two blocks tall, sixteen skin pixels a block, so the podium label sits where the plugin puts it. */
function Figure({ skin, slim, x, y }) {
    return <SkinFigure skin={skin} slim={slim} className="rs-figure" style={{ '--x': px(x), '--y': py(y + 2), '--u': size(1 / 16) }} />;
}

function Text({ x, y, scale, line, lines, display }) {
    return (
        <span className={display ? 'rs-text rs-text--display' : 'rs-text'} style={{ '--x': px(x), '--y': py(y), '--fs': size(0.2 * scale) }}>
            {(lines ?? [line]).map((l, i) => <Mini key={i} text={l} className="rs-line" />)}
        </span>
    );
}

