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

import React, { useCallback, useMemo, useState } from 'react';
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

/*
 * The feed pages; it does not window by date.
 *
 * This read as "only the last month" for a long time and the cause was neither a filter nor a
 * retention policy — the view fetched page 0 and stopped. Nothing anywhere bounds the feed by time:
 * FIBService substitutes EPOCH..9999 for an absent from/to, and the public API and the stats backend
 * both forward the window untouched. Twenty rows simply happened to reach back about a month on a
 * server playing at this rate, and the header said "N completed matches" over them, which made a
 * paging stop look like a date cutoff.
 *
 * 100 is the ceiling every layer agrees on (CallerInput.MAX_ROWS in the stats backend, clampSize in
 * the public API, coerceIn(1, 100) in FIBService), so 50 leaves room to raise it without a
 * three-repo change, and pages are unbounded above — reaching the whole history is a matter of
 * asking for the next one.
 */
const PAGE_SIZE = 50;

/** Calendar-day key, so grouping is stable regardless of locale formatting. */
const dayKey = (v) => new Date(v).toDateString();

/*
 * The caption over one day's group.
 *
 * `calendarDaysAgo` and not an elapsed-hours division: the two disagree, and
 * this is the view where the disagreement was visible. Grouping is by
 * `toDateString` — the real calendar day — while the caption was counting
 * 24-hour periods, so late last night and early this morning both came out as
 * "Today" and the feed printed the heading twice over two different dates.
 * The key and the caption now answer the same question.
 */
function dayLabel(v) {
    const d = new Date(v);
    const days = f.calendarDaysAgo(v);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    const date = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    return `${d.toLocaleDateString('en-US', { weekday: 'short' })}, ${date}`;
}

export function Matches({ onOpenMatch }) {
    const state = useAsync(() => loadMatches(0, PAGE_SIZE), []);
    return (
        <AsyncView state={state} loadingLabel="Loading matches…">
            {(page) => <MatchesBody firstPage={page.matches} totalCount={page.totalCount} onOpenMatch={onOpenMatch} />}
        </AsyncView>
    );
}

/* The feed's render, reading its match array and true total from props (the fetched FibMatchPage)
 * rather than from a `data` bundle, and appending later pages onto the first. */
function MatchesBody({ firstPage, totalCount, onOpenMatch }) {
    const [mode, setMode] = useState('all');
    const [later, setLater] = useState([]);
    const [nextPage, setNextPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadError, setLoadError] = useState(null);

    /*
     * Deduplicated by matchId, because paging a feed that is still being written to is not stable:
     * a match ending between two requests pushes everything down one, and the row that was last on
     * page N arrives again as the first of page N+1. React would warn about the duplicate key, and
     * the reader would see the same game twice.
     */
    const matches = useMemo(() => {
        const seen = new Set();
        const merged = [];
        for (const match of [...firstPage, ...later]) {
            if (seen.has(match.matchId)) continue;
            seen.add(match.matchId);
            merged.push(match);
        }
        return merged;
    }, [firstPage, later]);

    const hasMore = matches.length < totalCount;

    const loadMore = useCallback(async () => {
        setLoadingMore(true);
        setLoadError(null);
        try {
            const { data } = await loadMatches(nextPage, PAGE_SIZE);
            setLater((prev) => [...prev, ...(data?.matches ?? [])]);
            setNextPage((page) => page + 1);
        } catch (error) {
            // Kept local: the pages already on screen are still good, so a failed "load more" costs
            // the next page and a retry, never the feed.
            setLoadError(error);
        } finally {
            setLoadingMore(false);
        }
    }, [nextPage]);

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
                    ) : hasMore ? (
                        /*
                          The mode filter runs over what has been paged in, not over the server's
                          whole history, so with pages still unread "none" is a statement this view
                          cannot make. Offer the next page instead of asserting the absence.
                        */
                        <Empty
                            title={`No ${mode === 'SOLO' ? 'solo' : 'team'} matches on this page`}
                            action={
                                <button type="button" className="fib-btn fib-btn--quiet" onClick={loadMore} disabled={loadingMore}>
                                    {loadingMore ? 'Loading…' : 'Load more matches'}
                                </button>
                            }
                        >
                            {/*
                              The failure has to be reported HERE as well as in the footer.
                              The footer is the only other place that renders loadError and it
                              is gated on `groups.length > 0`, which is precisely the condition
                              this branch exists to handle — so "Load more matches" failing from
                              an empty filtered view re-enabled its own button and said nothing
                              at all, which reads as a page that simply refuses to do anything.
                            */}
                            <>
                                <p>
                                    {`${f.num(matches.length)} of ${f.num(totalCount)} matches loaded, and none of them were played ${mode === 'SOLO' ? 'solo' : 'in teams'} — there may be more further back.`}
                                </p>
                                {loadError && (
                                    <p className="fib-meta" role="status">
                                        {`Could not load more matches: ${loadError.message}`}
                                    </p>
                                )}
                            </>
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

                {/*
                  Stated whether or not there is more to fetch. A feed holding 50 of 300 matches
                  reads as the whole history when it is silent about it — which is exactly how a
                  paging stop came to be reported as a one-month cutoff.
                */}
                {groups.length > 0 && (
                    <div className="fib-more" role="status">
                        {hasMore ? (
                            <>
                                <button type="button" className="fib-btn" onClick={loadMore} disabled={loadingMore}>
                                    {loadingMore ? 'Loading…' : 'Load more'}
                                </button>
                                <span className="fib-meta">
                                    {loadError
                                        ? `Could not load more matches: ${loadError.message}`
                                        : `Showing ${f.num(matches.length)} of ${f.num(totalCount)}`}
                                </span>
                            </>
                        ) : (
                            <span className="fib-meta">
                                {`All ${f.num(totalCount)} ${totalCount === 1 ? 'match' : 'matches'} loaded`}
                            </span>
                        )}
                    </div>
                )}
            </Section>
        </div>
    );
}
