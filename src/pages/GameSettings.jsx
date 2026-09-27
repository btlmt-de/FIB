import React from 'react';
import Footer from '../components/common/Footer.jsx';
import PageLinks from '../wiki/PageLinks.jsx';
import { useGo } from '../wiki/pages.js';
import { spriteFallback, spriteOf } from '../wiki/sprite.js';
import { SETTINGS, STANDARD } from '../wiki/settings.data.js';
import '../wiki/page.css';
import '../wiki/settings.css';

/*
 * Game Settings (THE EXPLORER'S ATLAS): every setting an operator can change in
 * /settings, what it does, and how this server has it.
 *
 * The list is not the page's. settings.data.js is generated (vendor-pool.mjs) from
 * the plugin's GameSetting enum and this repo's config.yml, the deployed one: name,
 * in-game description, the item the /settings menu shows for it, the plugin's default
 * and this server's value. The page used to keep a list of its own, and it had drifted
 * into settings that do not exist (Nether, which is part of Hard; Player Trading,
 * which is a dead key in config.yml) and defaults the wrong way round (PvP, Keep
 * Inventory, Backpack, Hard).
 *
 * What IS the page's: the grouping and the plain "when on / when off" lines below,
 * each checked against what the plugin does with the setting on main (Sept 2026). A
 * setting the plugin adds later still appears, under Other, with its in-game words.
 *
 * On and off are drawn the way the game's settings menu draws them, a lime dye for
 * enabled and a red dye for disabled, always beside the word.
 */

const GROUPS = [
    { key: 'mode', name: 'How the round is played' },
    { key: 'pool', name: 'Which items can come up', note: 'A tag keeps an item out of the pool unless the round lets it in. The pool itself is on the Item Pools page.' },
    { key: 'world', name: 'Surviving the round' },
    { key: 'tools', name: 'Tools and help' },
    { key: 'records', name: 'What is recorded', note: 'Stats and achievements are kept by the FIB service, which only runs on McPlayHD.net. On a server you host yourself nothing is recorded either way.' },
    { key: 'event', name: 'Event rounds' },
];

const QUICKIE = ['Disabled', 'Early only', 'Early + Mid'];

/* What each setting does, in players' words. Keyed by the enum's name. */
const NOTES = {
    RUN: { group: 'mode', on: 'One item for the whole server. The first to get it scores, and everyone moves on together. Back-to-backs, random events and stats are off for the round.', off: 'Everyone draws their own items.', link: ['/gameplay#modes', 'The modes'] },
    CHAIN: { group: 'mode', on: 'The bossbar shows your next item after the current one.', off: 'Only the current item is shown.', link: ['/gameplay#modes', 'The modes'] },
    TEAM: { group: 'mode', on: 'Players play in teams: one score, one set of jokers, one backpack.', off: 'Everyone plays alone.', needs: 'Only with 4 or more players' },
    TEAM_CHAT: { group: 'mode', on: 'Chat goes to your team; /shout reaches everyone.', off: 'Chat goes to everyone.', needs: 'With Teams' },
    HARD: { group: 'pool', on: 'Items tagged Nether join the pool, and Extreme can add its items too.', off: 'No Nether items, and no Extreme items whatever Extreme says.', link: ['/pools?tag=NETHER', 'The Nether items'] },
    EXTREME: { group: 'pool', on: 'Items tagged Extreme join the pool: ones that are very hard to get within a round.', off: 'They stay out.', needs: 'Only counts while Hard is on', link: ['/pools?tag=EXTREME', 'The Extreme items'] },
    END: { group: 'pool', on: 'Items tagged End join the pool.', off: 'No End items.', link: ['/pools?tag=END', 'The End items'] },
    QUICKIE: { group: 'pool', value: (n) => QUICKIE[n] ?? String(n), text: 'Stops the pool at an early stage for a short round: Early only, or Early and Mid, so the later stages never join.', link: ['/gameplay#pool', 'When the stages join'] },
    KEEP_INVENTORY: { group: 'world', on: 'You keep your items when you die.', off: 'You drop them, as in vanilla.' },
    FOOD: { group: 'world', on: 'Hunger drains as normal.', off: 'It does not; there is no need to eat.' },
    PVP: { group: 'world', on: 'Players can hurt each other.', off: 'They cannot.' },
    ELYTRA: { group: 'world', on: 'Elytra glide.', off: 'Gliding is cancelled.' },
    FASTER_RANDOM_TICK: { group: 'world', on: 'The random tick speed goes from 3 to 40: crops, saplings and leaves grow and decay far faster.', off: 'Vanilla speed.' },
    BACKPACK: { group: 'tools', on: 'Everyone gets a backpack, opened with /bp and shared by a team. What is in it counts for back-to-backs.', off: 'No backpack.' },
    BACKPACKSIZE: { group: 'tools', value: (n) => `${n} ${n === 1 ? 'row' : 'rows'}`, text: 'How many rows of nine slots the backpack has.', needs: 'With Backpack' },
    POSITIONS: { group: 'tools', on: '/pos works: save places and share them with everyone.', off: '/pos is refused.' },
    HARDER_TRACKERS: { group: 'tools', on: 'The Trial Locator takes its harder recipe.', off: 'It takes the standard one.', link: ['/structures?to=trial-locator', 'Both recipes'] },
    RANDOM_EVENTS: { group: 'tools', on: 'Item Hunt, Point Hunt and the Special Trader can happen, three or four an hour.', off: 'No events.', needs: 'Never in Run Battle', link: ['/gameplay#events', 'The events'] },
    STATS: { group: 'records', on: 'The round is recorded: stats, leaderboards and the match history.', off: 'Nothing from the round is recorded.' },
    ACHIEVEMENTS: { group: 'records', on: 'Achievements can be earned.', off: 'They cannot.' },
    SCORE: { group: 'records', on: 'Your score shows next to the timer while you play.', off: 'It is not shown during the round.' },
    EVENT: { group: 'event', on: 'For events and tournaments: /pause, /resume and /pos become operator-only, keep inventory is forced on for the first five minutes, and advancement messages are hidden.', off: 'Standard rules.' },
};

/* The plugin's own names, cleaned where they carry a command ("Positions - /pos"). */
const nameOf = (s) => s.name.replace(/\s*-\s*\/\w+$/, '');

function Dye({ on }) {
    return (
        <img className="gs-dye" src={spriteOf(on ? 'LIME_DYE' : 'RED_DYE')} alt="" width="128" height="128" draggable="false" />
    );
}

function Setting({ s }) {
    const note = NOTES[s.key] ?? {};
    const isValue = typeof s.default === 'number';
    const label = (v) => (isValue ? (note.value ? note.value(v) : String(v)) : v ? 'On' : 'Off');
    const differs = s.server !== s.default;
    return (
        <li className="gs-setting" id={`setting-${s.key.toLowerCase()}`}>
            <span className="wk-slot gs-face" style={{ '--slot': '52px' }} aria-hidden="true">
                <img className="wk-sprite" src={spriteOf(s.material)} data-material={s.material} onError={spriteFallback} alt="" width="128" height="128" loading="lazy" draggable="false" />
            </span>
            <div className="gs-what">
                <h3 className="gs-name">{nameOf(s)}</h3>
                {isValue
                    ? <p className="gs-line">{note.text ?? s.lore.join(' ')}</p>
                    : note.on
                        ? (
                            <dl className="gs-lines">
                                <div><dt>On</dt><dd>{note.on}</dd></div>
                                <div><dt>Off</dt><dd>{note.off}</dd></div>
                            </dl>
                        )
                        : <p className="gs-line">{s.lore.join(' ')}</p>}
                {(note.needs || note.link) && (
                    <p className="gs-extra">
                        {note.needs && <span className="gs-chip">{note.needs}</span>}
                        {note.link && <a className="wk-link" href={note.link[0]}>{note.link[1]}</a>}
                    </p>
                )}
            </div>
            <div className="gs-here" aria-label={`On this server: ${label(s.server)}${differs ? `, where the plugin's default is ${label(s.default)}` : ''}`}>
                <span className="gs-here-label">This server</span>
                <span className="gs-here-value" data-on={isValue ? undefined : s.server}>
                    {!isValue && <Dye on={s.server} />}
                    {label(s.server)}
                </span>
                {differs && <span className="gs-default">Plugin default: {label(s.default).toLowerCase()}</span>}
            </div>
        </li>
    );
}

export default function GameSettings({ onNavigate }) {
    const go = useGo(onNavigate);
    const grouped = GROUPS.map((g) => ({ ...g, settings: SETTINGS.filter((s) => NOTES[s.key]?.group === g.key) }));
    const other = SETTINGS.filter((s) => !NOTES[s.key]);
    if (other.length) grouped.push({ key: 'other', name: 'Other', note: 'Settings the plugin has added since this page was written, in its own words.', settings: other });
    const changed = SETTINGS.filter((s) => s.server !== s.default);

    return (
        <main className="pg gs">
            <header className="wk-wrap pg-head">
                <h1 className="wk-h2">Game Settings</h1>
                <p className="wk-lede">
                    Every setting an operator can change in <code className="wk-typed">/settings</code> before a round, what it does, and
                    how this server has it.
                </p>
                <p className="gs-standard">
                    This server starts a round with a <span className="wk-datum">{STANDARD.countdown}</span>-second countdown,{' '}
                    <span className="wk-datum">{STANDARD.jokers}</span> jokers each and a <span className="wk-datum">{STANDARD.backpackSize}</span>-slot
                    backpack{changed.length ? <>, and differs from the plugin's defaults in {changed.map((s, i) => (
                        <React.Fragment key={s.key}>{i > 0 && (i === changed.length - 1 ? ' and ' : ', ')}<a className="wk-link" href={`#setting-${s.key.toLowerCase()}`}>{nameOf(s)}</a></React.Fragment>
                    ))}</> : null}.
                </p>
                <nav className="gs-toc" aria-label="Groups">
                    {grouped.filter((g) => g.settings.length).map((g) => <a key={g.key} className="wk-link" href={`#group-${g.key}`}>{g.name}</a>)}
                </nav>
            </header>

            <div className="wk-wrap">
                {grouped.filter((g) => g.settings.length).map((g) => (
                    <section key={g.key} id={`group-${g.key}`} className="gs-group" aria-labelledby={`group-${g.key}-title`}>
                        <div className="gs-group-head">
                            <h2 id={`group-${g.key}-title`} className="wk-h3">{g.name}</h2>
                            {g.note && <p className="wk-small">{g.note}</p>}
                        </div>
                        <ul className="gs-list">
                            {g.settings.map((s) => <Setting key={s.key} s={s} />)}
                        </ul>
                    </section>
                ))}
            </div>

            <PageLinks ids={['commands', 'pools', 'gameplay', 'how-to-play']} go={go} />
            <Footer />
        </main>
    );
}
