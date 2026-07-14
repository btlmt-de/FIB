import React, { useState, useMemo } from 'react';
import Search from 'lucide-react/dist/esm/icons/search';
import X from 'lucide-react/dist/esm/icons/x';
import ServerOff from 'lucide-react/dist/esm/icons/server-off';
import Footer from "../components/common/Footer.jsx";

// ── Data ──────────────────────────────────────────────────────────────────────

const PLAYER_COMMANDS = [
    { cmd: '/bed',              desc: 'Teleports you to your bed location, if one is set.' },
    { cmd: '/spawn',            desc: 'Teleports you back to the world spawn.' },
    { cmd: '/info',             desc: 'Shows the crafting recipe or description of your currently assigned item.' },
    { cmd: '/info <item>',      desc: 'Shows the recipe or description for any specific item.', example: '/info wooden_axe' },
    { cmd: '/infowiki',         desc: 'Opens a Minecraft Wiki link for your current assigned item.' },
    { cmd: '/help',             desc: 'List every command available to you.' },
    { cmd: '/shout <message>',  desc: 'Sends a global message to all players. Team chat is default.' },
    { cmd: '/shout',            desc: 'Toggle shout mode on/off. When on, all messages are sent globally.' },
    { cmd: '/pos <name>',       desc: 'Save your current location with a name. Shared and visible to all players.', example: '/pos base' },
    { cmd: '/pos',              desc: 'View all saved positions.' },
    { cmd: '/pause',            desc: 'Freeze all players and the timer.' },
    { cmd: '/resume',           desc: 'Unfreeze all players and the timer.' },
    { cmd: '/spectate',         desc: 'Toggle spectator mode after the round has ended.' },
    { cmd: '/fixskips',         desc: 'Restore all your remaining jokers if they were lost.' },
    { cmd: '/fixlocate',        desc: 'Dismiss your active locator boss bars and particle trails.', example: '/fixlocate all' },
    { cmd: '/bp',               desc: 'Open your backpack.' },
    { cmd: '/ping',             desc: 'Show your current ping.' },
    { cmd: '/trade',            desc: 'Ask other players whether they have an item you or your team needs.' },
    { cmd: '/teams',            desc: 'Everything about teams — invite, accept, decline, leave, list.', example: '/teams invite Steve' },
    { cmd: '/voteskip',         desc: 'Start a skip vote. Only available when RUN mode is active.' },
    { cmd: '/vote',             desc: 'Vote yes or no when a vote is in progress.' },
    { cmd: '/stats',            desc: 'Show your own stats across all recorded rounds.', service: true },
    { cmd: '/stats <player>',   desc: "Show another player's stats.", example: '/stats Steve', service: true },
    { cmd: '/stats duo',        desc: 'Show your combined stats with a teammate.', service: true },
    { cmd: '/top',              desc: 'Show the stat leaderboards.', example: '/top solo items', service: true },
    { cmd: '/achievements',     desc: 'Open the achievement menu and browse your progress.', service: true },
];

const GM_COMMANDS = [
    { cmd: '/start <time> <jokers>',   desc: 'Start the game with a time limit and joker count.', example: '/start 60 3' },
    { cmd: '/start <preset>',          desc: 'Start the game using a predefined preset.', example: '/start default' },
    { cmd: '/reset',                   desc: 'Reset the game and generate a new world.' },
    { cmd: '/settings',                desc: 'Open the settings menu.' },
    { cmd: '/stoptimer',               desc: 'Instantly end the game.' },
    { cmd: '/forceteam <team> ...',    desc: 'Assign players to a team before the round starts.', example: '/forceteam blue Steve Alex' },
    { cmd: '/skip <player>',           desc: 'Force-skip the current item for a specific player.', example: '/skip Steve' },
    { cmd: '/forceitem <item> ...',    desc: 'Force the current and upcoming items. Dev tool.', example: '/forceitem diamond emerald' },
    { cmd: '/randomevent <event>',     desc: 'Trigger a random event immediately.', example: '/randomevent item_hunt' },
    { cmd: '/result',                  desc: 'Start the result screen at the end of the game.' },
    { cmd: '/items',                   desc: 'View all item pools.' },
    { cmd: '/stats reset',             desc: 'Wipe all recorded stats. Requires a confirmation step.', service: true },
    { cmd: '/achievements grant ...',  desc: 'Grant, revoke or reset achievements for a player.', example: '/achievements grant Steve b2b_king', service: true },
];

// ── CSS ───────────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800;900&display=swap');

  .cmd {
    font-family: 'Barlow', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    background: oklch(17% 0.025 255);
    color: oklch(94% 0.007 255);
    min-height: 100vh; display: flex; flex-direction: column;
  }
  .cmd-shell { max-width: 1080px; margin: 0 auto; padding: 0 28px; width: 100%; box-sizing: border-box; }
  .cmd-rule  { height: 1px; background: oklch(19% 0.019 255); }

  /* ── Header + search ── */
  .cmd-header { padding: 80px 0 56px; display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; flex-wrap: wrap; }
  .cmd-eyebrow {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;
    color: oklch(76% 0.16 68); margin: 0 0 14px;
  }
  .cmd-h1 {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: clamp(44px, 6.5vw, 76px); font-weight: 800;
    line-height: 0.95; letter-spacing: -0.5px; text-transform: uppercase;
    color: oklch(94% 0.007 255); margin: 0 0 18px;
  }
  .cmd-sub { font-size: 15px; color: oklch(52% 0.013 255); line-height: 1.7; max-width: 400px; margin: 0; }

  /* Search */
  .cmd-search-wrap { position: relative; width: 280px; flex-shrink: 0; align-self: center; margin-bottom: 4px; }
  .cmd-search {
    width: 100%; box-sizing: border-box;
    background: oklch(21% 0.023 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 8px; padding: 10px 36px 10px 38px;
    color: oklch(94% 0.007 255); font-size: 13.5px; outline: none;
    transition: border-color 0.12s ease-out, background 0.12s ease-out;
    font-family: 'Barlow', system-ui, sans-serif;
  }
  .cmd-search:focus { border-color: oklch(44% 0.014 255); background: oklch(22.5% 0.022 255); }
  .cmd-search::placeholder { color: oklch(36% 0.011 255); }
  .cmd-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; color: oklch(42% 0.013 255); }
  .cmd-search-clear {
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; padding: 3px;
    color: oklch(42% 0.013 255); display: flex; align-items: center;
    border-radius: 3px; transition: color 0.12s;
  }
  .cmd-search-clear:hover { color: oklch(74% 0.012 255); }

  /* ── Section ── */
  .cmd-section { padding: 52px 0 60px; }
  .cmd-section-head {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: 12px; margin-bottom: 28px; flex-wrap: wrap;
  }
  .cmd-section-left { display: flex; align-items: center; gap: 14px; }
  .cmd-section-title {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: clamp(22px, 3vw, 30px); font-weight: 800;
    text-transform: uppercase; letter-spacing: -0.2px;
    color: oklch(94% 0.007 255); margin: 0;
  }
  .cmd-badge {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 10.5px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.8px;
    padding: 3px 9px; border-radius: 4px; white-space: nowrap;
  }
  .cmd-badge-green {
    background: oklch(64% 0.20 142 / 0.12);
    border: 1px solid oklch(64% 0.20 142 / 0.30);
    color: oklch(64% 0.20 142);
  }
  .cmd-badge-amber {
    background: oklch(76% 0.16 68 / 0.12);
    border: 1px solid oklch(76% 0.16 68 / 0.30);
    color: oklch(76% 0.16 68);
  }
  .cmd-count {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 13px; font-weight: 600; color: oklch(42% 0.013 255);
    font-variant-numeric: tabular-nums;
  }

  /* ── Command grid — 2 cols on desktop ── */
  .cmd-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    column-gap: 48px;
    row-gap: 0;
  }
  @media (max-width: 720px) { .cmd-grid { grid-template-columns: 1fr; } }

  /* ── Command row ── */
  .cmd-row {
    display: grid;
    grid-template-columns: 195px 1fr;
    gap: 0 18px;
    align-items: start;
    padding: 14px 6px;
    border-top: 1px solid oklch(24% 0.022 255);
    border-radius: 5px;
    transition: background 0.1s ease-out;
    cursor: default;
  }
  .cmd-grid .cmd-row:last-child { border-bottom: 1px solid oklch(24% 0.022 255); }
  @media (max-width: 720px) {
    .cmd-row:last-child { border-bottom: 1px solid oklch(24% 0.022 255); }
  }
  .cmd-row:hover { background: oklch(20.5% 0.023 255); }

  .cmd-code {
    font-family: 'Courier New', 'Consolas', monospace;
    font-size: 12.5px; font-weight: 400;
    color: oklch(70% 0.14 200);
    background: oklch(68% 0.12 200 / 0.09);
    border: 1px solid oklch(68% 0.12 200 / 0.18);
    border-radius: 4px; padding: 3px 8px;
    display: inline-block; line-height: 1.4;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
  }
  .cmd-desc {
    font-size: 13px; color: oklch(58% 0.012 255); line-height: 1.6;
    padding-top: 2px;
  }
  .cmd-example {
    margin-top: 5px; font-size: 11px; color: oklch(42% 0.013 255);
    display: flex; align-items: center; gap: 5px;
  }
  .cmd-example-code {
    font-family: 'Courier New', monospace;
    font-size: 10.5px; color: oklch(62% 0.013 255);
    background: oklch(22% 0.022 255); border: 1px solid oklch(30% 0.019 255);
    padding: 1px 6px; border-radius: 3px;
  }

  /* ── Service notice ── */
  .cmd-notice {
    display: flex; gap: 14px; align-items: flex-start;
    margin: 40px 0 0;
    padding: 16px 18px;
    background: oklch(21% 0.023 255);
    border: 1px solid oklch(30% 0.019 255);
    border-left: 3px solid oklch(76% 0.16 68);
    border-radius: 8px;
  }
  .cmd-notice-icon { color: oklch(76% 0.16 68); flex-shrink: 0; margin-top: 1px; }
  .cmd-notice-title {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;
    color: oklch(76% 0.16 68); margin: 0 0 5px;
  }
  .cmd-notice p { margin: 0; font-size: 13px; line-height: 1.7; color: oklch(56% 0.012 255); }
  .cmd-notice strong { color: oklch(80% 0.01 255); font-weight: 600; }

  .cmd-service-pill {
    display: inline-flex; align-items: center; gap: 4px;
    margin-top: 6px;
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px;
    color: oklch(66% 0.11 68);
    background: oklch(76% 0.16 68 / 0.09);
    border: 1px solid oklch(76% 0.16 68 / 0.22);
    border-radius: 4px; padding: 2px 7px;
  }

  /* ── No results ── */
  .cmd-empty {
    padding: 48px 0; text-align: center;
    color: oklch(42% 0.013 255); font-size: 14px;
  }

  @media (max-width: 600px) {
    .cmd-shell { padding: 0 20px; }
    .cmd-header { padding: 60px 0 48px; flex-direction: column; align-items: flex-start; }
    .cmd-search-wrap { width: 100%; }
    .cmd-section { padding: 40px 0 48px; }
    .cmd-row { grid-template-columns: 1fr; gap: 6px 0; }
  }
`;

// ── Sub-components ────────────────────────────────────────────────────────────

function CmdRow({ cmd, desc, example, service }) {
    return (
        <div className="cmd-row">
            <div>
                <code className="cmd-code">{cmd}</code>
            </div>
            <div>
                <div className="cmd-desc">{desc}</div>
                {example && (
                    <div className="cmd-example">
                        e.g. <code className="cmd-example-code">{example}</code>
                    </div>
                )}
                {service && (
                    <div>
                        <span className="cmd-service-pill" title="Requires the FIB backend service">
                            <ServerOff size={9} /> mcplayhd.net only
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

function CmdSection({ title, badge, badgeClass, commands, query }) {
    const filtered = useMemo(() => {
        if (!query) return commands;
        const q = query.toLowerCase();
        return commands.filter(c =>
            c.cmd.toLowerCase().includes(q) ||
            c.desc.toLowerCase().includes(q)
        );
    }, [commands, query]);

    if (query && filtered.length === 0) return null;

    return (
        <section className="cmd-section">
            <div className="cmd-section-head">
                <div className="cmd-section-left">
                    <h2 className="cmd-section-title">{title}</h2>
                    <span className={`cmd-badge ${badgeClass}`}>{badge}</span>
                </div>
                <span className="cmd-count">
                    {query ? `${filtered.length} of ${commands.length}` : commands.length} commands
                </span>
            </div>
            <div className="cmd-grid">
                {filtered.map((c, i) => (
                    <CmdRow key={i} {...c} />
                ))}
            </div>
        </section>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Commands() {
    const [query, setQuery] = useState('');

    const totalVisible = useMemo(() => {
        if (!query) return PLAYER_COMMANDS.length + GM_COMMANDS.length;
        const q = query.toLowerCase();
        const filter = (c) => c.cmd.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q);
        return PLAYER_COMMANDS.filter(filter).length + GM_COMMANDS.filter(filter).length;
    }, [query]);

    return (
        <div className="cmd">
            <style>{CSS}</style>

            <div className="cmd-shell">
                <div className="cmd-header">
                    <div>
                        <p className="cmd-eyebrow">Reference</p>
                        <h1 className="cmd-h1">Commands</h1>
                        <p className="cmd-sub">
                            All available commands in ForceItemBattle.
                            Player commands are open to everyone.
                            Gamemaster commands require OP.
                        </p>
                    </div>
                    <div className="cmd-search-wrap">
                        <Search size={15} className="cmd-search-icon" />
                        <input
                            className="cmd-search"
                            placeholder="Search commands..."
                            aria-label="Search commands"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            autoComplete="off"
                        />
                        {query && (
                            <button type="button" className="cmd-search-clear" aria-label="Clear search" onClick={() => setQuery('')}>
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="cmd-shell">
                <div className="cmd-notice">
                    <ServerOff size={17} className="cmd-notice-icon" />
                    <div>
                        <p className="cmd-notice-title">Stats &amp; Achievements need the backend</p>
                        <p>
                            <strong>/stats</strong>, <strong>/top</strong> and <strong>/achievements</strong> are
                            backed by the FIB service and its database, which only runs on{' '}
                            <strong>mcplayhd.net</strong>. If you host ForceItemBattle yourself, the plugin has
                            nothing to connect to — those commands won't record or return anything, and nothing
                            you do in a self-hosted round is tracked. Every other command works exactly the same
                            wherever you play.
                        </p>
                    </div>
                </div>
            </div>

            <div className="cmd-rule" style={{ marginTop: 40 }} />

            <div className="cmd-shell" style={{ flex: 1 }}>
                {totalVisible === 0 ? (
                    <div className="cmd-empty">
                        No commands match "<strong>{query}</strong>"
                    </div>
                ) : (
                    <>
                        <CmdSection
                            title="Player Commands"
                            badge="All Players"
                            badgeClass="cmd-badge-green"
                            commands={PLAYER_COMMANDS}
                            query={query}
                        />

                        <div className="cmd-rule" />

                        <CmdSection
                            title="Gamemaster Commands"
                            badge="OP Required"
                            badgeClass="cmd-badge-amber"
                            commands={GM_COMMANDS}
                            query={query}
                        />
                    </>
                )}
            </div>

            <Footer />
        </div>
    );
}
