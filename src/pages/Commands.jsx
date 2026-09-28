import React, { useMemo, useState } from 'react';
import Search from 'lucide-react/dist/esm/icons/search';
import X from 'lucide-react/dist/esm/icons/x';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import Footer from '../components/common/Footer.jsx';
import PageLinks from '../wiki/PageLinks.jsx';
import { useGo } from '../wiki/pages.js';
import { COMMANDS, GROUPS } from '../wiki/commands.data.js';
import CommandChat from '../wiki/CommandChat.jsx';
import '../wiki/page.css';
import '../wiki/commands.css';

/*
 * Commands (THE EXPLORER'S ATLAS): every command, who can use it and when.
 *
 * Grouped by what a player is trying to do (their item, getting around, their kit,
 * talking, their records, running the round) rather than split into "player" and
 * "gamemaster" halves: who may run a command is written on the command, as a chip,
 * and the Operators filter still gives the gamemaster's list in one click. The same
 * goes for when: the plugin refuses /bp before a round and /forceteam after one
 * starts, and the page now says so instead of leaving a player to find out.
 *
 * A command is typed, so every usage is set in the typed face (the Mono Rule), with
 * what must be given in angle brackets and what may be left off in square ones.
 * The list and every who and when come from commands.data.js; its header says how
 * they were checked and how the build keeps the list honest.
 *
 * An example that the game answers in chat can be tried: it is typed into a Minecraft
 * chat bar under its line and answered with the plugin's own reply (CommandChat). One
 * is open at a time, so the page never turns into a wall of chat boxes.
 */

const WHO = {
    all: 'Everyone',
    op: 'Operators',
    event: 'Operators in Event rounds',
};

function Usage({ name, args }) {
    // Split "<a> [b | c]" into its parts so required and optional read differently.
    const parts = args ? args.split(/(<[^>]+>|\[[^\]]+\])/).filter(Boolean) : [];
    return (
        <code className="cm-usage">
            <span className="cm-usage-name">/{name}</span>
            {parts.map((p, i) => (
                <span key={i} className={p.startsWith('<') ? 'cm-req' : p.startsWith('[') ? 'cm-opt' : 'cm-lit'}>{p}</span>
            ))}
        </code>
    );
}

function matches(c, q) {
    if (!q) return true;
    const hay = [c.name, ...c.forms.flatMap((f) => [f.args, f.text, f.example]), ...(c.when ?? [])].join(' ').toLowerCase();
    return q.split(/\s+/).every((w) => hay.includes(w.replace(/^\//, '')));
}

function Command({ c, open, onTry }) {
    return (
        <li className="cm-cmd" id={`cmd-${c.name}`}>
            <ul className="cm-forms">
                {c.forms.map((f, i) => (
                    <li key={i} className="cm-form">
                        <Usage name={c.name} args={f.args} />
                        <span className="cm-form-text">
                            {f.text}
                            {f.who && f.who !== c.who && <span className="cm-chip cm-chip--who">{WHO[f.who]}</span>}
                            {f.example && !f.says && <span className="cm-example">e.g. <code className="wk-typed">{f.example}</code></span>}
                            {f.example && f.says && (
                                <span className="cm-example">
                                    e.g.{' '}
                                    <button type="button" className="cm-try" aria-expanded={open === `${c.name}|${i}`} onClick={() => onTry(`${c.name}|${i}`)}>
                                        <code className="wk-typed">{f.example}</code>
                                        <span className="cm-try-label"><MessageSquare size={14} aria-hidden="true" /> {open === `${c.name}|${i}` ? 'Close' : 'Try it'}</span>
                                    </button>
                                </span>
                            )}
                        </span>
                        {open === `${c.name}|${i}` && <CommandChat example={f.example} says={f.says} heard={f.heard} then={f.then} />}
                    </li>
                ))}
            </ul>
            {/* Everyone is the default and is said once, in the key; only a restriction gets a chip. */}
            {(c.who !== 'all' || c.when?.length > 0) && (
                <p className="cm-chips">
                    {c.who !== 'all' && <span className="cm-chip cm-chip--who" data-who={c.who}>{WHO[c.who]}</span>}
                    {(c.when ?? []).map((w) => <span key={w} className="cm-chip">{w}</span>)}
                </p>
            )}
        </li>
    );
}

export default function Commands({ onNavigate }) {
    const go = useGo(onNavigate);
    const [query, setQuery] = useState('');
    const [who, setWho] = useState('any');
    const [open, setOpen] = useState(null);
    const onTry = (key) => setOpen((k) => (k === key ? null : key));
    const q = query.trim().toLowerCase();

    const groups = useMemo(() => GROUPS.map((g) => ({
        ...g,
        commands: COMMANDS.filter((c) => c.group === g.key)
            .filter((c) => who === 'any' || (who === 'op' ? c.who !== 'all' || c.forms.some((f) => f.who === 'op') : c.who !== 'op'))
            .filter((c) => matches(c, q)),
    })).filter((g) => g.commands.length), [q, who]);
    const shown = groups.reduce((n, g) => n + g.commands.length, 0);

    return (
        <main className="pg cm">
            <header className="wk-wrap pg-head">
                <h1 className="wk-h2">Commands</h1>
                <p className="wk-lede">Every command in ForceItemBattle, who can use it, and when the game lets you.</p>

                <div className="cm-find">
                    <label className="cm-search">
                        <Search size={18} aria-hidden="true" />
                        <span className="wk-sr">Search commands</span>
                        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                               placeholder="Search, e.g. backpack or /pos" autoComplete="off" />
                        {query && (
                            <button type="button" className="cm-clear" onClick={() => setQuery('')} aria-label="Clear the search"><X size={16} /></button>
                        )}
                    </label>
                    <div className="cm-seg" role="radiogroup" aria-label="Who can use it">
                        {[['any', 'All commands'], ['all', 'Everyone'], ['op', 'Operators']].map(([k, label]) => (
                            <button key={k} type="button" role="radio" aria-checked={who === k} onClick={() => setWho(k)}>{label}</button>
                        ))}
                    </div>
                </div>
                <p className="wk-small cm-key">
                    <code className="wk-typed"><span className="cm-req">&lt;name&gt;</span></code> must be given,{' '}
                    <code className="wk-typed"><span className="cm-opt">[name]</span></code> can be left off, and{' '}
                    <code className="wk-typed">a | b</code> means one of them. A command is open to everyone unless it says otherwise.
                </p>
                <nav className="cm-toc" aria-label="Groups">
                    {GROUPS.map((g) => <a key={g.key} className="wk-link" href={`#group-${g.key}`}>{g.name}</a>)}
                </nav>
            </header>

            <div className="wk-wrap cm-body" aria-live="polite">
                {q && <p className="cm-count">{shown ? `${shown} ${shown === 1 ? 'command matches' : 'commands match'}` : ''}</p>}
                {!shown && (
                    <div className="cm-empty">
                        <p>No command matches “{query}”.</p>
                        <button type="button" className="wk-btn wk-btn--quiet cm-btn" onClick={() => { setQuery(''); setWho('any'); }}>Show every command</button>
                    </div>
                )}
                {groups.map((g) => (
                    <section key={g.key} id={`group-${g.key}`} className="cm-group" aria-labelledby={`group-${g.key}-title`}>
                        <div className="cm-group-head">
                            <h2 id={`group-${g.key}-title`} className="wk-h3">{g.name}</h2>
                            {g.note && <p className="wk-small cm-group-note">{g.note}</p>}
                        </div>
                        <ul className="cm-list">
                            {g.commands.map((c) => <Command key={c.name} c={c} open={open} onTry={onTry} />)}
                        </ul>
                    </section>
                ))}
            </div>

            <PageLinks ids={['settings', 'gameplay', 'how-to-play', 'rules']} go={go} />
            <Footer />
        </main>
    );
}
