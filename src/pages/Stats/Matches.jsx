/**
 * FIB Stats — the match feed.
 *
 * One row per completed match, grouped by day: a long list of identical rows
 * needs chronology landmarks, because "the match last Tuesday" is how people
 * actually look for a game.
 *
 * The row is a scoreboard line (MatchVersus, shared with the overview): the
 * winners and the beaten facing each other across the score, the margin under
 * it, and how many times the lead changed at the end - the one number that
 * says whether a match is worth opening. It used to be a list of winners with
 * the losing side reduced to a clause and a grey margin bar, so every row
 * looked the same and the match itself was never on the line.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { matchStandings } from './adapter.js';
import { loadMatches } from './api.js';
import { useAsync } from './useAsync.js';
import { Section, Segmented, Empty, AsyncView, MatchVersus, TableSkeleton } from './Primitives.jsx';
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

/*
 * Two orders: the feed as it happened, and the highest winning scores.
 *
 * "Highest score" ranks the WHOLE history, never just what has been paged in:
 * a ranking of the newest fifty would crown whatever high score happened to be
 * recent and call it the best ever. /matches has no sort parameter (FIBService,
 * the public API and the stats backend would all have to grow one), so the
 * view fetches every page itself the first time the sort is chosen - at
 * HISTORY_PAGE a request, the ceiling every layer agrees on, which today is a
 * single call for the entire server - and ranks in memory.
 *
 * TODO(backend): a `sort=score` on /fib/matches makes this one page of the
 * top N and removes the whole-history fetch. That is the fix once the history
 * runs to thousands; until then the fetch is small and happens once per visit.
 */
const SORTS = [
    { id: 'recent', label: 'Newest' },
    { id: 'score', label: 'Highest score' },
];
const HISTORY_PAGE = 100;
const RANK_STEP = 25;

/** Every match on record, page by page until the reported total is reached. */
async function loadWholeHistory() {
    const all = [];
    const seen = new Set();
    let total = Infinity;
    for (let page = 0; all.length < total; page += 1) {
        const { data } = await loadMatches(page, HISTORY_PAGE);
        const rows = data?.matches ?? [];
        total = data?.totalCount ?? 0;
        for (const m of rows) {
            if (!seen.has(m.matchId)) { seen.add(m.matchId); all.push(m); }
        }
        // A short page means the feed ran out before the total said it would -
        // a match deleted mid-walk, or a total that moved. Stop rather than loop.
        if (rows.length < HISTORY_PAGE) break;
    }
    return all;
}

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
    const [sort, setSort] = useState('recent');
    const [history, setHistory] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState(null);
    const [shownRanked, setShownRanked] = useState(RANK_STEP);
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

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            setHistory(await loadWholeHistory());
        } catch (error) {
            setHistoryError(error);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    /* Fetched from the control's handler, not an effect: choosing the sort is
       the event that needs the data, and a feed already holding everything
       needs no fetch at all. */
    const chooseSort = (next) => {
        setSort(next);
        setShownRanked(RANK_STEP);
        if (next === 'score' && hasMore && !history && !historyLoading) fetchHistory();
    };

    /*
     * The ranking. Ordered by the winners' score, then by margin (a bigger win at
     * the same score ranks first), then newest. Places are DENSE on the score -
     * two matches won with 83 both place 1st - the convention the standings use,
     * because the medal is for the number and the number is the same.
     */
    const ranked = useMemo(() => {
        if (sort !== 'score') return null;
        const source = hasMore ? history : matches;
        if (!source) return null;
        const rows = source
            .filter((m) => mode === 'all' || m.mode === mode)
            .map((match) => {
                const [win, lose] = matchStandings(match);
                return win ? { match, score: win.score ?? 0, margin: lose ? (win.score ?? 0) - (lose.score ?? 0) : 0 } : null;
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score || b.margin - a.margin || b.match.endedAt - a.match.endedAt);
        let place = 0;
        let prev = null;
        return rows.map((r) => {
            if (r.score !== prev) { place += 1; prev = r.score; }
            return { ...r, place };
        });
    }, [sort, hasMore, history, matches, mode]);

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


    return (
        <div className="fib-page fib-page--wide">
            <Section
                title="Matches"
                sub={sort === 'score'
                    ? `The highest winning scores across all ${f.num(totalCount)} matches.`
                    : `${totalCount} completed matches, newest first.`}
                aside={
                    <div className="fib-matches-controls">
                        <Segmented options={SORTS} value={sort} onChange={chooseSort} label="Order matches by" />
                        <Segmented options={MODES} value={mode} onChange={setMode} label="Match mode" />
                    </div>
                }
            >
                {sort === 'score' ? (
                    historyError ? (
                        <Empty
                            title="Couldn’t load the full history"
                            action={<button type="button" className="fib-btn" onClick={fetchHistory}>Try again</button>}
                        >
                            {`Ranking by score needs every match, and the stats service didn’t send them all: ${historyError.message}`}
                        </Empty>
                    ) : !ranked ? (
                        <div className="fib-panel fib-panel--flush" role="status" aria-label="Loading every match to rank them">
                            <TableSkeleton rows={8} cols={4} />
                        </div>
                    ) : ranked.length === 0 && mode === 'all' ? (
                        <Empty title="No matches yet">
                            No completed matches are on record yet.
                        </Empty>
                    ) : ranked.length === 0 ? (
                        <Empty title={`No ${mode === 'SOLO' ? 'solo' : 'team'} matches yet`}>
                            {`None of the ${f.num(totalCount)} matches on record were played ${mode === 'SOLO' ? 'solo' : 'in teams'}.`}
                        </Empty>
                    ) : (
                        <>
                            <div className="fib-panel fib-panel--flush">
                                {ranked.slice(0, shownRanked).map((r) => (
                                    <MatchVersus key={r.match.matchId} match={r.match} onOpen={onOpenMatch} rank={r.place} />
                                ))}
                            </div>
                            <div className="fib-more" role="status">
                                {shownRanked < ranked.length ? (
                                    <button type="button" className="fib-btn" onClick={() => setShownRanked((n) => n + RANK_STEP)}>
                                        Show more
                                    </button>
                                ) : null}
                                <span className="fib-meta">
                                    {shownRanked < ranked.length
                                        ? `Top ${f.num(shownRanked)} of ${f.num(ranked.length)}`
                                        : `All ${f.num(ranked.length)} ranked`}
                                </span>
                            </div>
                        </>
                    )
                ) : groups.length === 0 ? (
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
                                {group.rows.map(({ match }) => (
                                    <MatchVersus key={match.matchId} match={match} onOpen={onOpenMatch} />
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
                {sort === 'recent' && groups.length > 0 && (
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
