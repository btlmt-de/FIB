/**
 * FIB Stats — the match feed.
 *
 * One row per completed match, grouped by day: a long list of identical rows
 * needs chronology landmarks, because "the match last Tuesday" is how people
 * actually look for a game.
 *
 * The row is the summary: who won, who they beat, and by how much. "By how
 * much" is the field a normal match list leaves out and the one that decides
 * whether a match is worth opening, so it gets a real visual — the margin bar
 * — and the runner-up's name, because a margin without a victim is only half
 * the story.
 */

import React, { useMemo, useState } from 'react';
import { matchStandings, matchDuration, idLabel, idUuid } from './adapter.js';
import { loadMatches } from './api.js';
import { useAsync } from './useAsync.js';
import { Section, Avatar, Medal, Segmented, Empty, AsyncView } from './Primitives.jsx';
import * as f from './format.js';

const MODES = [
    { id: 'all', label: 'All' },
    { id: 'SOLO', label: 'Solo' },
    { id: 'TEAM', label: 'Team' },
];

/** Calendar-day key, so grouping is stable regardless of locale formatting. */
const dayKey = (v) => new Date(v).toDateString();

function dayLabel(v) {
    const d = new Date(v);
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    const date = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    return `${d.toLocaleDateString('en-US', { weekday: 'short' })}, ${date}`;
}

export function Matches({ onOpenMatch }) {
    const state = useAsync(() => loadMatches(0), []);
    return (
        <AsyncView state={state} loadingLabel="Loading matches…">
            {(page) => <MatchesBody matches={page.matches} totalCount={page.totalCount} onOpenMatch={onOpenMatch} />}
        </AsyncView>
    );
}

/* The feed's render, unchanged except that it reads its match array and true total from props
 * (the fetched FibMatchPage) rather than from a `data` bundle. */
function MatchesBody({ matches, totalCount, onOpenMatch }) {
    const [mode, setMode] = useState('all');

    const groups = useMemo(() => {
        const list = mode === 'all' ? matches : matches.filter((m) => m.mode === mode);
        const byDay = new Map();
        for (const match of list) {
            const standings = matchStandings(match);
            const winner = standings[0];
            const runnerUp = standings[1];
            const margin = winner && runnerUp ? winner.score - runnerUp.score : 0;
            const row = { match, standings, winner, runnerUp, margin };
            const key = dayKey(match.endedAt);
            if (!byDay.has(key)) byDay.set(key, { label: dayLabel(match.endedAt), rows: [] });
            byDay.get(key).rows.push(row);
        }
        return [...byDay.values()];
    }, [matches, mode]);

    const widestMargin = Math.max(1, ...groups.flatMap((g) => g.rows.map((r) => r.margin)));

    return (
        <div className="fib-page fib-page--wide">
            <Section
                title="Matches"
                sub={`${totalCount} completed matches, newest first.`}
                aside={
                    <Segmented options={MODES} value={mode} onChange={setMode} label="Match mode" />
                }
            >
                {groups.length === 0 ? (
                    /*
                      The copy has to survive the All filter. It read "No team matches
                      yet" whenever the feed was empty — naming a filter the reader
                      wasn't on, then telling them to switch back to the one they were
                      already using.
                    */
                    mode === 'all' ? (
                        <Empty title="No matches yet">
                            Matches are written here the moment one ends on the server, so this fills
                            itself — nothing needs to be imported and nothing has been lost.
                        </Empty>
                    ) : (
                        <Empty
                            title={`No ${mode === 'SOLO' ? 'solo' : 'team'} matches yet`}
                            action={
                                <button type="button" className="fib-btn fib-btn--quiet" onClick={() => setMode('all')}>
                                    Show all matches
                                </button>
                            }
                        >
                            {totalCount > 0
                                ? `The server has ${totalCount} completed ${totalCount === 1 ? 'match' : 'matches'}, but none of them were played ${mode === 'SOLO' ? 'solo' : 'in teams'}.`
                                : 'Matches are written here the moment one ends on the server.'}
                        </Empty>
                    )
                ) : (
                    groups.map((group) => (
                        <section className="fib-day" key={group.label}>
                            <h3>{group.label}</h3>
                            <div className="fib-panel fib-panel--flush">
                                {group.rows.map(({ match, standings, winner, runnerUp, margin }) => (
                                    winner ? (
                                    <button
                                        key={match.matchId}
                                        type="button"
                                        className="fib-row-link fib-match-row"
                                        onClick={() => onOpenMatch(match.matchId)}
                                    >
                                        <div className="fib-match-when">
                                            <b>{f.timeAgo(match.endedAt)}</b>
                                            <span className="fib-meta">{f.stamp(match.endedAt)}</span>
                                        </div>

                                        <div className="fib-match-winner">
                                            <Medal place={1} />
                                            <div style={{ display: 'flex', minWidth: 0 }}>
                                                {winner.members.map((m) => (
                                                    <Avatar key={idUuid(m)} uuid={idUuid(m)} size={26} />
                                                ))}
                                            </div>
                                            <span className="fib-match-names">
                        {winner.members.map(idLabel).join(' & ')}
                      </span>
                                        </div>

                                        <div className="fib-match-margin">
                                            <div className="fib-ramp-track" style={{ height: 5, color: margin <= 2 ? 'var(--fib-negative)' : 'var(--fib-ink-3)' }}>
                                                <i style={{ '--fill': margin / widestMargin }} />
                                            </div>
                                            <span className="fib-meta">
                        {!runnerUp
                            ? 'uncontested'
                            : margin === 0
                                ? 'tied at the line'
                                : `beat ${runnerUp.members.map(idLabel).join(' & ')} by ${margin}`}
                      </span>
                                        </div>

                                        <div className="fib-match-score">
                                            <b>{winner.score}</b>
                                            <span className="fib-meta">
                        {match.mode === 'SOLO' ? 'solo' : 'team'} · {standings.length} · {f.duration(matchDuration(match))}
                      </span>
                                        </div>
                                    </button>
                                    ) : null
                                ))}
                            </div>
                        </section>
                    ))
                )}
            </Section>
        </div>
    );
}
