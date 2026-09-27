import React, { useMemo } from 'react';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import Footer from '../components/common/Footer.jsx';
import PageLinks from '../wiki/PageLinks.jsx';
import { ItemSlot } from '../wiki/items.jsx';
import Bossbar from '../wiki/Bossbar.jsx';
import { PAPER_VERSION, POOL_BY_STAGE, pick } from '../wiki/atlas.js';
import { useGo } from '../wiki/pages.js';
import '../wiki/page.css';
import '../wiki/howtoplay.css';

/*
 * How to Play (THE EXPLORER'S ATLAS). The first inner page on the system.
 *
 * The page's job is getting someone into a round, and the useful answer to "what do
 * I download" is WHERE each file goes and WHAT it changes once it is there. So the
 * old list of five download rows became the install board: each file in a slot, a
 * track to the folder it belongs in, one line on what it adds. Those destinations
 * are read off the plugin, not guessed: the data folder is plugins/ForceItemBattle
 * (rootProject.name), unicodeItems.json is read from it
 * (ItemDifficultiesManager.readItemUnicodes), and WorldReset copies
 * FIB_Worldgen.zip out of it into every new world's datapacks.
 *
 * What the resource pack and unicodeItems.json add is drawn rather than said: the
 * bossbar as the game draws it (wiki/Bossbar.jsx), with a real pool item.
 *
 * The Paper version is generated (PAPER_VERSION, from the plugin's
 * paper-version.json via vendor-pool.mjs). It used to be typed into this file and
 * was a release behind when it moved.
 */

/* ── Content ───────────────────────────────────────────────────────────────── */

const GITHUB_SITE = 'https://github.com/btlmt-de/FIB/blob/main';

/** A string you type or a file you edit: the Mono Rule's one use. */
const T = ({ children }) => <code className="wk-typed">{children}</code>;

const GROUPS = [
    {
        label: 'On the server',
        files: [
            {
                key: 'plugin', face: 'REPEATING_COMMAND_BLOCK', required: true,
                name: 'ForceItemBattle plugin', href: 'https://github.com/McPlayHDnet/ForceItemBattle',
                where: 'plugins/',
                adds: 'The game itself. Everything below builds on it.',
            },
            {
                key: 'config', face: 'WRITTEN_BOOK',
                name: 'config.yml', href: `${GITHUB_SITE}/config.yml`,
                where: 'plugins/ForceItemBattle/',
                adds: <>This server's round settings, and the item descriptions <T>/info</T> prints.</>,
                more: { id: 'pools', label: 'Browse the item pools' },
            },
            {
                key: 'unicode', face: 'NAME_TAG',
                name: 'unicodeItems.json', href: `${GITHUB_SITE}/unicodeItems.json`,
                where: 'plugins/ForceItemBattle/',
                adds: 'Which glyph in the resource pack is which item. Without it the plugin runs with no item icons.',
            },
            {
                key: 'worldgen', face: 'STRUCTURE_BLOCK',
                name: 'Worldgen datapack', href: `${GITHUB_SITE}/FIB_Worldgen.zip`,
                where: 'plugins/ForceItemBattle/',
                adds: <>The custom structures built around FIB. <T>/reset</T> copies it into every new world.</>,
                more: { id: 'structures', label: 'See the structures' },
            },
        ],
    },
    {
        label: 'On each player\'s game',
        files: [
            {
                key: 'pack', face: 'PAINTING',
                name: 'Resource pack', href: `${GITHUB_SITE}/ForceItemBattle.zip`,
                where: 'resourcepacks/',
                adds: <>Item icons beside item names, in the bossbar, tab and chat. Players add it themselves, or you serve it with <T>resource-pack</T> in <T>server.properties</T>.</>,
            },
        ],
    },
];

const JOIN = [
    { face: 'OAK_DOOR', text: 'Join our Discord community', link: { href: 'http://mcplayhd.net/discord', label: 'discord.gg/mcplayhd' } },
    { face: 'LEAD', text: 'Link your Minecraft account to Discord' },
    { face: 'PAPER', text: 'Open a support ticket and ask about FIB' },
];

/* ── The install board ─────────────────────────────────────────────────────── */

function FileRow({ file, go }) {
    return (
        <li className="hp-file">
            <ItemSlot material={file.face} size={56} tip={false} marks={false} />
            <div className="hp-file-id">
                <a className="hp-file-name" href={file.href} target="_blank" rel="noopener noreferrer">
                    {file.name}
                    <ArrowUpRight size={14} className="hp-file-out" aria-hidden="true" />
                    <span className="wk-sr"> (opens GitHub)</span>
                </a>
                <span className="hp-file-need" data-required={file.required ? 'true' : undefined}>
                    {file.required ? 'Required' : 'Optional'}
                </span>
            </div>
            <span className="hp-track" aria-hidden="true" />
            <div className="hp-file-to">
                <span className="hp-into">Goes in</span>
                <code className="hp-path">{file.where}</code>
                <p className="hp-file-adds">
                    {file.adds}
                    {file.more && (
                        <>
                            {' '}
                            <a className="wk-link" href={`/${file.more.id}`} onClick={go(file.more.id)}>{file.more.label}</a>
                        </>
                    )}
                </p>
            </div>
        </li>
    );
}

function Host({ go }) {
    const shown = useMemo(() => pick(POOL_BY_STAGE.EARLY), []);
    return (
        <section id="host" className="wk-wrap pg-sec hp-host" aria-labelledby="host-title">
            <div className="pg-sec-head">
                <h2 id="host-title" className="wk-h3">Host your own</h2>
                <p className="wk-p">
                    Run ForceItemBattle on your own server.
                    Full control over who plays and how the round is configured.
                </p>
                <p className="wk-small">
                    Built for Paper <span className="wk-datum hp-version">{PAPER_VERSION}</span>, the version the plugin pins.
                </p>
            </div>

            <div className="hp-board">
                {GROUPS.map((g) => (
                    <div key={g.label} className="hp-group">
                        <span className="wk-label">{g.label}</span>
                        <ol className="hp-files">
                            {g.files.map((f) => <FileRow key={f.key} file={f} go={go} />)}
                        </ol>
                    </div>
                ))}
                <Bossbar
                    item={shown}
                    caption="What a player reads at the top of the screen with both in place: the item they are hunting, and its icon. An illustration, with an item drawn from the pool."
                />
                <p className="wk-p hp-then">
                    Restart the server. Then, as an operator, set the round up with{' '}
                    <code className="wk-typed">/settings</code> and start it with{' '}
                    <code className="wk-typed hp-nowrap">/start &lt;minutes&gt; &lt;jokers&gt;</code>.
                    Every other command is on the{' '}
                    <a className="wk-link" href="/commands" onClick={go('commands')}>Commands</a> page.
                </p>
            </div>
        </section>
    );
}

/* ── Joining ours ──────────────────────────────────────────────────────────── */

function Join({ go }) {
    return (
        <section id="join" className="wk-wrap pg-sec hp-join" aria-labelledby="join-title">
            <div className="pg-sec-head">
                <h2 id="join-title" className="wk-h3">Join our server</h2>
                <p className="wk-p">Official hosted rounds with the community.</p>
            </div>

            <div className="hp-join-body">
                <p className="wk-p">
                    <strong>Not ready for wide access yet.</strong> We're planning regularly
                    hosted games in the future. For now, hosting your own game is the
                    way to go. <span className="hp-soon">soon™</span>
                </p>

                <ol className="hp-steps">
                    {JOIN.map((s) => (
                        <li key={s.face} className="hp-step">
                            <ItemSlot material={s.face} size={56} tip={false} marks={false} />
                            <span className="hp-step-text">
                                {s.text}
                                {s.link && (
                                    <a className="wk-link hp-step-link" href={s.link.href} target="_blank" rel="noopener noreferrer">
                                        {s.link.label}
                                    </a>
                                )}
                            </span>
                        </li>
                    ))}
                </ol>

                <p className="wk-small hp-note">
                    <strong>Note:</strong> Rounds are spontaneous and may be limited. We reserve the
                    right to only invite players we trust to follow the rules.{' '}
                    <a className="wk-link" href="/rules" onClick={go('rules')}>Review the rules before your first round</a>.
                </p>
            </div>
        </section>
    );
}

/* ── The page ──────────────────────────────────────────────────────────────── */

export default function HowToPlay({ onNavigate }) {
    const go = useGo(onNavigate);
    return (
        <main className="pg">
            <header className="wk-wrap pg-head">
                <h1 className="wk-h2">How to Play</h1>
                <p className="wk-lede">Get a server running or join an existing round.</p>
                <div className="pg-head-actions">
                    <a className="wk-btn" href="#host">Host your own <ArrowDown size={16} aria-hidden="true" /></a>
                    <a className="wk-btn wk-btn--quiet" href="#join">Join our server</a>
                </div>
            </header>
            <Host go={go} />
            <Join go={go} />
            <PageLinks ids={['gameplay', 'rules', 'settings', 'commands']} go={go} />
            <Footer />
        </main>
    );
}
