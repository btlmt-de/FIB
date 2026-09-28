import React, { useEffect, useMemo, useRef, useState } from 'react';
import Pause from 'lucide-react/dist/esm/icons/pause';
import Play from 'lucide-react/dist/esm/icons/play';
import { useCalm } from '../config/power.js';
import { POOL_BY_STAGE, itemName } from './atlas.js';
import Environment from './Environment.jsx';
import { useOnScreen } from './hooks.js';
import Mini from './Mini.jsx';
import { ROUND, STAGES } from './tokens.js';
import { spriteFallback, spriteOf } from './sprite.js';
import logo0 from '../../ForceItemBattle/assets/minecraft/textures/fib/tab_logo_0.png';
import logo1 from '../../ForceItemBattle/assets/minecraft/textures/fib/tab_logo_1.png';
import logo2 from '../../ForceItemBattle/assets/minecraft/textures/fib/tab_logo_2.png';
import './roundhud.css';

/*
 * Your screen during a round: every piece of the HUD the plugin fills, where the game
 * draws it, over one standard round you can scrub through or play. Each piece is the
 * plugin's own (main, Sept 2026):
 *
 *   bossbar      TimerManager.sendPlayingHud: the item, its name in a green gradient,
 *                on a white notched bar
 *   action bar   the same: the time left in a yellow-to-orange gradient, bold, then
 *                "Your score" (or "Team score") when the Score setting is on
 *   hotbar       PlayerOutfitter and RoundSetup: stone axe, pickaxe and shovel, the
 *                jokers in the fifth slot, the backpack in the last
 *   nameplates   ScoreboardManager: a player's current item after their name, in the
 *                tab list (and over their head, which your own screen never shows)
 *   chat         TimerManager.announceUnlockedPools; WanderingTraderManager's arrival
 *                and departure lines
 *   titles       RoundClock's milestones: 5 minutes, 1 minute, 30 and 10 seconds left,
 *                then the last five counted in large red numbers
 *   tab list     PlayerLifecycleListener's banner (the resource pack's three logo
 *                glyphs) and TabListManager's footer: the open pools and when the next
 *                opens, your jokers, the surface's clock, each trader's countdown
 *
 * It is your screen alone, first person: an earlier version stood another player in
 * the world with their nameplate, and their item (which in a solo round is never
 * yours) read as the bossbar out of step.
 *
 * The round itself is made up: your finds, drawn from the real pool as it opens, two jokers spent, the Wandering Trader on its real rhythm, the day
 * turning at Minecraft's pace from dawn. The world behind it is the wiki's own
 * surface scenery, dimmed at night.
 */

// The screen is 427 Minecraft GUI pixels wide and 240 tall; roundhud.css sizes one of
// them (--g) from the screen's width.

const TOTAL = ROUND.minutes * 60;
const QUICK = ['STONE_AXE', 'STONE_PICKAXE', 'STONE_SHOVEL', null, 'JOKER', null, null, null, 'BUNDLE'];
const MILESTONES = [300, 60, 30, 10];
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));

/** TimeFormat.humanised. */
const humanised = (t) => {
    const s = t % 60; const m = Math.floor(t / 60) % 60; const h = Math.floor(t / 3600);
    return [h && `${h}h`, m && `${m}m`, s && `${s}s`].filter(Boolean).join(' ');
};
/** TimeFormat.colored: mm:ss, green, then amber under two minutes, red, dark red. */
const colored = (t) => {
    const s = Math.max(0, t);
    const c = s <= 10 ? 'dark_red' : s <= 30 ? 'red' : s <= 120 ? 'gold' : 'green';
    return `<${c}>${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
/** TimeFormat.worldClock, from world ticks. */
const worldClock = (ticks) => {
    const mins = (((Math.floor(ticks * 60 / 1000) + 360) % 1440) + 1440) % 1440;
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
};
/** TimeFormat.countdownPhrase. */
const phrase = (s) => (s % 60 === 0 ? `${s / 60} ${s === 60 ? 'minute' : 'minutes'} left` : `${s} seconds left`);

/** One player's finds over the round: when each lands, and what each was. */
function finds(count, jokers) {
    const times = Array.from({ length: count }, () => rand(40, TOTAL - 60)).sort((a, b) => a - b);
    const seen = new Set();
    const skip = new Set();
    while (skip.size < jokers) skip.add(randInt(3, count - 2));
    let assigned = 0;
    return times.map((t, i) => {
        // An item is dealt from what the pool held when the one before it was found.
        const open = ['EARLY', 'MID', 'LATE'].filter((k) => assigned >= STAGES[k].minute * 60);
        const pool = open.flatMap((k) => POOL_BY_STAGE[k]);
        let material;
        do { material = pool[Math.floor(Math.random() * pool.length)]; } while (seen.has(material));
        seen.add(material);
        assigned = t;
        return { t, material, joker: skip.has(i) };
    });
}

/** WanderingTraderManager.startTimer: arrivals, in seconds into the round. */
function traders() {
    const out = [];
    let t = randInt(7, 10) * 60;
    while (t < TOTAL) { out.push({ t, at: [randInt(-80, 80), randInt(66, 74), randInt(-80, 80)] }); t += 300 + randInt(7, 10) * 60; }
    return out;
}

function plan() {
    const you = finds(randInt(24, 28), 2);
    const trade = traders();
    const chat = [
        ...['MID', 'LATE'].map((k) => ({ t: STAGES[k].minute * 60, line: `{item:CLOCK} <gray>New item pool unlocked <dark_gray>» <${k === 'MID' ? 'yellow' : 'red'}>${STAGES[k].label}` })),
        ...trade.flatMap((tr) => [
            { t: tr.t, line: `<dark_gray>» <gold>Position <dark_gray>┃ <gray>The <green>Wandering Trader <gray>just spawned at <dark_aqua>${tr.at[0]}<gray>, <dark_aqua>${tr.at[1]}<gray>, <dark_aqua>${tr.at[2]} <green>(${randInt(40, 260)} blocks away)` },
            { t: tr.t + 300, line: '<dark_gray>» <gold>Position <dark_gray>┃ <gray>The <green>Wandering Trader <gray>just despawned! :(' },
        ]),
    ].filter((c) => c.t < TOTAL).sort((a, b) => a.t - b.t);
    return { you, trade, chat };
}

/** Where the round stands at a second: what every piece of the HUD shows. */
function stateAt(p, t) {
    const left = TOTAL - t;
    const done = p.you.filter((f) => f.t <= t);
    const hunting = p.you[done.length] ?? p.you.at(-1);
    const open = ['EARLY', 'MID', 'LATE'].filter((k) => t >= STAGES[k].minute * 60);
    const next = ['MID', 'LATE'].find((k) => t < STAGES[k].minute * 60);
    const ticks = t * 20;
    const day = ticks % 24000;
    const trader = p.trade.find((tr) => t >= tr.t && t < tr.t + 300);
    const milestone = MILESTONES.find((m) => left <= m && left > m - (m >= 60 ? 12 : 3));
    const final = left > 0 && left <= 5 ? left : null;
    return {
        left,
        item: hunting.material,
        score: done.length,
        jokers: ROUND.jokers - done.filter((f) => f.joker).length,
        pools: `<gray>Pools ${open.map((k) => `<${k === 'EARLY' ? 'green' : k === 'MID' ? 'yellow' : 'red'}>${STAGES[k].label}`).join('<gray>, ')}${next ? ` <gray>· ${STAGES[next].label} in ${colored(STAGES[next].minute * 60 - t)}` : ''}`,
        time: `<gray>Time · {item:CLOCK} ${day < 12300 || day > 23850 ? '<gold>' : '<aqua>'}${worldClock(ticks)} <dark_gray>(<gray>${day < 12300 || day > 23850 ? 'Day' : 'Night'}<dark_gray>)`,
        night: day < 12000 ? 0 : day < 13800 ? (day - 12000) / 1800 : day < 22200 ? 1 : day < 24000 ? 1 - (day - 22200) / 1800 : 0,
        sun: (day % 12000) / 12000,
        trader: trader ? ['', '<green><b>Wandering Trader', `<dark_aqua>${trader.at[0]}<gray>, <dark_aqua>${trader.at[1]}<gray>, <dark_aqua>${trader.at[2]}`, colored(trader.t + 300 - t)] : [],
        chat: p.chat.filter((c) => c.t <= t).slice(-4).map((c) => c.line),
        title: left === 0 ? { sub: '<white>» <gold>Force Item Battle is over! <white>«' }
            : final ? { big: `<red>${final}` }
            : milestone ? { sub: `<red>${phrase(milestone)}` } : null,
    };
}

/** A line of HUD text, with {item:MATERIAL} icons set in it as the resource pack draws them. */
function Line({ text, className = 'hud-line' }) {
    const parts = text.split(/\{item:([A-Z0-9_]+)\}/);
    return (
        <span className={className}>
            {parts.map((part, i) => (i % 2
                ? <img key={i} className="hud-icon" src={spriteOf(part)} data-material={part} onError={spriteFallback} alt="" width="128" height="128" />
                : <Mini key={i} text={part} className="hud-seg" />))}
        </span>
    );
}

function Slot({ material, count, i }) {
    if (!material) return <span className="hud-hot-item" style={{ '--i': i }} />;
    const src = material === 'JOKER' ? '/fib-custom/barrier.png' : spriteOf(material);
    return (
        <span className="hud-hot-item" style={{ '--i': i }}>
            <img src={src} data-material={material} onError={spriteFallback} alt="" width="128" height="128" />
            {count > 1 && <span className="hud-count">{count}</span>}
        </span>
    );
}

const PARTS = [
    { key: 'bossbar', name: 'Bossbar', text: 'The item you are hunting, with its icon. In Force Chain, the one after it too.' },
    { key: 'actionbar', name: 'Action bar', text: 'The time left, then your score (your team\'s in a team round). The score shows only with Score on.' },
    { key: 'hotbar', name: 'Hotbar', text: 'Your kit: stone tools, your jokers in the fifth slot, the backpack in the last.' },
    { key: 'chat', name: 'Chat', text: 'A new pool as it opens, a trader as it arrives and leaves. Drawn under the screen here, so it covers nothing.' },
    { key: 'title', name: 'Titles', text: '5 minutes, 1 minute, 30 and 10 seconds left, then the last five in large numbers.' },
    { key: 'tab', name: 'Tab list', text: 'Hold Tab: every player with their current item after their name, the open pools and when the next opens, your jokers, the time of day on the surface, and any trader with its countdown.' },
];

export default function RoundHud() {
    const calm = useCalm();
    const [p] = useState(plan);
    const [t, setT] = useState(9 * 60 + 20);
    const [playing, setPlaying] = useState(false);
    const [tab, setTab] = useState(false);
    const [lit, setLit] = useState(null);
    const ref = useRef(null);
    const on = useOnScreen(ref);
    const running = playing && on && !calm;

    useEffect(() => {
        if (!running) return undefined;
        const id = setInterval(() => {
            setT((now) => {
                const left = TOTAL - now;
                // Quick through the quiet stretches, slow where a title shows, so it can be read.
                const step = left > 330 ? 9 : left > 288 ? 1.2 : left > 72 ? 9 : 0.4;
                const next = Math.min(TOTAL, now + step);
                if (next >= TOTAL) setPlaying(false);
                return next;
            });
        }, 100);
        return () => clearInterval(id);
    }, [running]);

    const now = Math.floor(t);
    const s = useMemo(() => stateAt(p, now), [p, now]);
    const hl = (key) => (lit === key || undefined);

    return (
        <figure className="hud" ref={ref}>
            <div className="hud-screen" role="img" aria-label={`A player's screen ${Math.floor(now / 60)} minutes into a round: hunting ${itemName(s.item)}, ${humanised(s.left) || 'no time'} left, score ${s.score}, ${s.jokers} jokers.`}>
                <Environment region="surface" light={0.15 + s.sun * 0.7} seed={11} className="hud-world" still={!running} />
                <span className="hud-day" style={{ opacity: (1 - s.night) * 0.55 }} />
                <span className="hud-night" style={{ opacity: s.night * 0.62 }} />

                <div className="hud-bossbar" data-lit={hl('bossbar')}>
                    <span className="hud-bossbar-name"><span className="hud-grad">{itemName(s.item)}</span> <Line text={`{item:${s.item}}`} className="hud-seg" /></span>
                    <span className="hud-bossbar-bar" />
                </div>

                {s.title && (
                    <div className="hud-title" data-lit={hl('title')} key={s.title.big ?? s.title.sub}>
                        {s.title.big && <Line text={s.title.big} className="hud-title-big" />}
                        {s.title.sub && <Line text={s.title.sub} className="hud-title-sub" />}
                    </div>
                )}


                <div className="hud-actionbar" data-lit={hl('actionbar')}>
                    <b className="hud-grad2">{humanised(s.left) || '0s'}</b> <Line text={`<dark_gray>| <green>Your score: <white>${s.score}`} className="hud-seg" />
                </div>

                <div className="hud-bars" aria-hidden="true">
                    <span className="hud-hearts">{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</span>
                    <span className="hud-food">{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</span>
                    <span className="hud-xp" />
                </div>
                <div className="hud-hotbar" data-lit={hl('hotbar')}>
                    {QUICK.map((m, i) => <Slot key={i} i={i} material={m === 'JOKER' && s.jokers < 1 ? null : m} count={m === 'JOKER' ? s.jokers : 1} />)}
                    <span className="hud-hot-sel" />
                </div>

                {tab && (
                    <div className="hud-tab" data-lit={hl('tab')}>
                        <span className="hud-tab-logo"><img src={logo0} alt="" /><img src={logo1} alt="" /><img src={logo2} alt="" /></span>
                        <span className="hud-tab-rows">
                            {[['/fib-entities/skins/steve.png', 'Steve', s.item]].map(([skin, name, item]) => (
                                <span key={name} className="hud-tab-row">
                                    <span className="hud-tab-face" style={{ backgroundImage: `url(${skin}), url(${skin})` }} />
                                    <Line text={`<white>${name} <gray>[<gold>${itemName(item)} {item:${item}}<gray>]`} />
                                    <span className="hud-ping" />
                                </span>
                            ))}
                        </span>
                        <span className="hud-tab-foot">
                            <Line text={s.pools} />
                            <Line text={`<gray>Jokers · <aqua>${s.jokers}`} />
                            <Line text={s.time} />
                            {s.trader.map((l, i) => <Line key={i} text={l} />)}
                        </span>
                    </div>
                )}
            </div>

            {/* Chat, in a window of its own under the screen, where it covers no part of the HUD. */}
            <div className="hud-chatbox" data-lit={hl('chat')} aria-live="polite">
                {s.chat.map((l) => <Line key={l} text={l} className="hud-chat-line" />)}
            </div>

            <div className="hud-controls">
                {!calm && (
                    <button type="button" className="wk-btn gp-btn-sm" onClick={() => { if (t >= TOTAL) setT(0); setPlaying((x) => !x); }} aria-pressed={playing}>
                        {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />} {playing ? 'Pause' : t >= TOTAL ? 'Play again' : 'Play the round'}
                    </button>
                )}
                <button type="button" className="wk-btn wk-btn--quiet gp-btn-sm" aria-pressed={tab} onClick={() => setTab((x) => !x)}>
                    {tab ? 'Hide the tab list' : 'Show the tab list'}
                </button>
                <label className="gp-field hud-scrub">
                    <span className="wk-label">Minute of the round</span>
                    <input type="range" min="0" max={TOTAL} step="10" value={now}
                           onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }}
                           aria-valuetext={`${Math.floor(now / 60)} minutes in, ${humanised(TOTAL - now) || 'none'} left`} />
                    <span className="wk-datum gp-field-val">{Math.floor(now / 60)} min</span>
                </label>
            </div>

            <ul className="hud-legend">
                {PARTS.map((x) => (
                    <li key={x.key} onPointerEnter={() => { setLit(x.key); if (x.key === 'tab') setTab(true); }} onPointerLeave={() => setLit(null)}
                        onFocus={() => setLit(x.key)} onBlur={() => setLit(null)} tabIndex={0} data-lit={lit === x.key || undefined}>
                        <span className="hud-legend-name">{x.name}</span>
                        <span className="hud-legend-text">{x.text}</span>
                    </li>
                ))}
            </ul>
        </figure>
    );
}

