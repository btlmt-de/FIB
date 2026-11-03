import React, { useMemo } from 'react';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import Footer from '../components/common/Footer.jsx';
import PageLinks from '../wiki/shell/PageLinks.jsx';
import { ItemSlot } from '../wiki/game/items.jsx';
import Bossbar from '../wiki/game/Bossbar.jsx';
import { PAPER_VERSION, POOL_BY_STAGE, pick } from '../wiki/data/atlas.js';
import { useGo } from '../wiki/shell/pages.js';
import { ROUND } from '../wiki/tokens.js';
import '../wiki/page.css';
import '../wiki/pages/howtoplay.css';

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
 * bossbar as the game draws it (wiki/game/Bossbar.jsx), with a real pool item.
 *
 * The Paper version is generated (PAPER_VERSION, from the plugin's
 * paper-version.json via vendor-pool.mjs). It used to be typed into this file and
 * was a release behind when it moved.
 *
 * Under the board, the server folder those tracks arrive in, drawn whole, and the
 * server.properties lines. Both are read off the 26.3 test server (plugin/run), not
 * remembered from older versions:
 * - The resource pack is a server pack; the plugin never sends one itself. The board
 *   once filed it under "each player's game", which was wrong (owner, Nov 2026).
 *   Without resource-pack-sha1 the server logs that the pack "will be updated on the
 *   client only if you change the name of the pack", which is why the hash is a line
 *   of its own rather than a footnote. The page prints it rather than sending the
 *   host off to hash it themselves, and the default link is pinned to a commit, with
 *   unicodeItems.json pinned to the same one, because the two only line up as a
 *   pair. Following main is offered as the opt-in. vite.config.js reads the commit,
 *   the hash and the pack's version at build time and records the reasoning.
 * - The datapack needs no line. With initial-enabled-packs left at vanilla, the test
 *   world's level.dat still lists file/FIB_Worldgen.zip as enabled: a pack sitting in
 *   world/datapacks when the world is created is switched on by itself. There is one
 *   world folder now, the Nether and End inside it under dimensions/, so
 *   world/datapacks is the only place it goes.
 * - It shapes terrain only as it generates, so an existing world never gets it.
 *   That is why /reset is a step in "Then": it deletes the world, copies the pack in
 *   (WorldReset) and restarts. The restart goes through spigot.yml's restart-script;
 *   with no script there the server just stops, and the note says so.
 *
 * Words in this section are instructions only (owner, Nov 2026): what to put where
 * and which line to set. Why a link is pinned or how the datapack switches itself on
 * lives here and in vite.config.js, not on the page.
 */

/* ── Content ───────────────────────────────────────────────────────────────── */

const GITHUB_SITE = 'https://github.com/btlmt-de/FIB/blob/main';
/** The pack the page pins hosts to, read at build time; vite.config.js says why. */
const PACK = import.meta.env.PACK;
/** What resource-pack needs is the file itself, not GitHub's page for it. */
const PACK_PINNED = `https://raw.githubusercontent.com/btlmt-de/FIB/${PACK.commit}/ForceItemBattle.zip`;
const PACK_LATEST = 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle.zip';

/** A string you type or a file you edit: the Mono Rule's one use. */
const T = ({ children }) => <code className="wk-typed">{children}</code>;

const GROUPS = [
    {
        label: 'On the server',
        files: [
            {
                key: 'plugin', face: 'REPEATING_COMMAND_BLOCK', need: 'Required',
                name: 'ForceItemBattle plugin', href: 'https://github.com/McPlayHDnet/ForceItemBattle',
                where: 'plugins/',
                adds: 'The game itself.',
            },
            {
                key: 'config', face: 'WRITTEN_BOOK', need: 'Optional',
                name: 'config.yml', href: `${GITHUB_SITE}/config.yml`,
                where: 'plugins/ForceItemBattle/',
                adds: <>The standard round's settings, and the item descriptions <T>/info</T> prints.</>,
                more: { id: 'pools', label: 'Browse the item pools' },
            },
            {
                key: 'unicode', face: 'NAME_TAG', need: 'Recommended',
                name: 'unicodeItems.json', href: `https://github.com/btlmt-de/FIB/blob/${PACK.commit}/unicodeItems.json`,
                where: 'plugins/ForceItemBattle/',
                adds: 'Tells the plugin which pack glyph is which item. Needed for icons; this version matches the pack below.',
            },
            {
                key: 'worldgen', face: 'STRUCTURE_BLOCK', need: 'Recommended',
                name: 'Worldgen datapack', href: `${GITHUB_SITE}/FIB_Worldgen.zip`,
                where: 'plugins/ForceItemBattle/',
                adds: 'The custom structures.',
                more: { id: 'structures', label: 'See the structures' },
            },
            {
                key: 'pack', face: 'PAINTING', need: 'Recommended',
                name: 'Resource pack', href: `${GITHUB_SITE}/ForceItemBattle.zip`,
                where: 'server.properties',
                adds: <>Item icons in the bossbar, tab and chat. Needs <T>unicodeItems.json</T>.</>,
            },
        ],
    },
];

/** The server folder once everything is in. A face marks a file from the board above. */
const TREE = [
    { name: 'server.properties' },
    { name: 'plugins/', children: [
        { name: 'ForceItemBattle-<version>.jar', face: 'REPEATING_COMMAND_BLOCK' },
        { name: 'ForceItemBattle/', children: [
            { name: 'config.yml', face: 'WRITTEN_BOOK' },
            { name: 'unicodeItems.json', face: 'NAME_TAG' },
            { name: 'FIB_Worldgen.zip', face: 'STRUCTURE_BLOCK' },
        ] },
    ] },
    { name: 'world/', children: [
        { name: 'datapacks/', children: [
            { name: 'FIB_Worldgen.zip', face: 'STRUCTURE_BLOCK', note: 'put here by /reset' },
        ] },
    ] },
];

const PROPS = [
    {
        line: <>resource-pack=<span className="hp-url">{PACK_PINNED}</span></>,
        says: PACK.version && <>Pack <span className="wk-datum">{PACK.version}</span></>,
    },
    {
        line: <>resource-pack-sha1=<span className="hp-url">{PACK.sha1}</span></>,
    },
    {
        lead: 'Or, to always get the newest pack:',
        line: <>resource-pack=<span className="hp-url">{PACK_LATEST}</span></>,
        says: <>After every pack update, copy the new hash from this page and the new <T>unicodeItems.json</T>.</>,
    },
    {
        line: 'require-resource-pack=true',
        says: 'Optional: disconnects players who decline the pack.',
    },
    {
        line: 'initial-enabled-packs=vanilla',
        says: 'Leave as is. The datapack turns itself on.',
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
                <span className="hp-file-need" data-need={file.need.toLowerCase()}>{file.need}</span>
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

function TreeRows({ rows }) {
    return (
        <ul className="hp-tree-list">
            {rows.map((r, i) => (
                <li key={`${r.name}${i}`} className="hp-tree-row">
                    <span className="hp-tree-line">
                        {r.face && <ItemSlot material={r.face} size={24} tip={false} marks={false} />}
                        <code className="hp-tree-name" data-fib={r.face ? 'true' : undefined}>{r.name}</code>
                        {r.note && <span className="hp-tree-note">{r.note}</span>}
                    </span>
                    {r.children && <TreeRows rows={r.children} />}
                </li>
            ))}
        </ul>
    );
}

function ServerSetup() {
    return (
        <div className="hp-setup">
            <div className="hp-tree">
                <span className="wk-label">Your server folder</span>
                <TreeRows rows={TREE} />
            </div>
            <div className="hp-props">
                <span className="wk-label">In server.properties</span>
                <dl className="hp-props-list">
                    {PROPS.map((p, i) => (
                        <div key={i} className="hp-prop" data-alt={p.lead ? 'true' : undefined}>
                            <dt>
                                {p.lead && <span className="hp-prop-lead">{p.lead}</span>}
                                <code className="hp-prop-line">{p.line}</code>
                            </dt>
                            {p.says && <dd className="hp-prop-says">{p.says}</dd>}
                        </div>
                    ))}
                </dl>
            </div>
        </div>
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
                </p>
                <p className="wk-small">
                    Supports Paper <span className="wk-datum hp-version">{PAPER_VERSION}</span>.
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
                <ServerSetup />
                <Bossbar
                    item={shown}
                    caption="The bossbar, with the pack and unicodeItems.json in place."
                />
                {/*
                  * Where the setup ends. It used to trail off in a paragraph under the
                  * bossbar, so the board had no last step (owner, final pass, Sept 2026).
                  * Now the board's own track carries on through the last four moves and
                  * stops on a filled block: once /start is typed, the round is running.
                  */}
                <div className="hp-finish">
                    <span className="wk-label">Then</span>
                    <ol className="hp-finish-line">
                        <li className="hp-finish-step">
                            <span className="hp-finish-mark" aria-hidden="true" />
                            <span className="hp-finish-what">Files installed</span>
                            <span className="hp-finish-sub">Start the server</span>
                        </li>
                        <li className="hp-finish-step">
                            <span className="hp-finish-mark" aria-hidden="true" />
                            <code className="wk-typed hp-finish-cmd">/reset</code>
                            <span className="hp-finish-sub">A fresh world, generated with the datapack</span>
                        </li>
                        <li className="hp-finish-step">
                            <span className="hp-finish-mark" aria-hidden="true" />
                            <code className="wk-typed hp-finish-cmd">/settings</code>
                            <span className="hp-finish-sub">Set the round up, as an operator</span>
                        </li>
                        <li className="hp-finish-step" data-end="true">
                            <span className="hp-finish-mark" aria-hidden="true" />
                            <code className="wk-typed hp-finish-cmd">/start {ROUND.minutes} {ROUND.jokers}</code>
                            <span className="hp-finish-sub">The round is on: {ROUND.minutes} minutes, {ROUND.jokers} jokers each</span>
                        </li>
                    </ol>
                    <p className="wk-small">
                        <code className="wk-typed">/reset</code> restarts through <code className="wk-typed">restart-script</code> in{' '}
                        <code className="wk-typed">spigot.yml</code>. Without one, start the server again yourself.
                    </p>
                    <p className="wk-small">
                        <code className="wk-typed hp-nowrap">/start &lt;minutes&gt; &lt;jokers&gt;</code> takes any length.
                        Every other command is on the{' '}
                        <a className="wk-link" href="/commands" onClick={go('commands')}>Commands</a> page.
                    </p>
                </div>
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
