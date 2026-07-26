/**
 * FIB Stats — the overview.
 *
 * Scale first, then the news — DESIGN.md's "Scale Sets the Scale". The
 * server-wide totals open the page because they are the yardstick every number
 * below is read against: "842,190 items found" is what makes one player's
 * 2,400 mean something, and a reader who meets the personal number first has
 * nothing to judge it against.
 *
 * Below them: the all-time win podium — switchable between solo and teams —
 * then the featured match (the actual race, compressed to a band of lanes),
 * then the two recent-event feeds side by side: latest wins and rarest
 * moments. They read as one story but were always two queries — the match feed
 * and the rare-moments endpoint — so they are shown as two columns rather than
 * merged into a stream that then has to be pulled apart again.
 *
 * ── The podium is all-time, not weekly ──
 *
 * It shows the top three by total wins, with a Solo / Teams toggle. All-time
 * rather than this-week for two reasons: it is a stable thing a returning
 * visitor can check against rather than a board that reshuffles every day, and
 * — the honest one — there is no windowed leaderboard endpoint, so a weekly
 * board cannot be produced from real data without a service change. Both scopes
 * here are one upstream call apiece and already exist.
 *
 * Both boards are fetched at load and the toggle switches between them in
 * memory, so the swap is instant and carries no spinner. A podium is a
 * decorative anchor at the top of the page; a loading state on a toggle click
 * would read as broken.
 *
 * ── Motion ──
 *
 * Three moments, each shaped to what it reveals:
 *
 *   the podium    medals land bronze, silver, gold — ceremony order
 *   the race      one wipe left to right, so the band runs in match time
 *   the totals    count up, because a total is a quantity accumulating
 *
 * Everything on this page is a route into somewhere else. No dead ends.
 */

import React, { useMemo, useRef, useState } from 'react';
import { matchStandings, matchDuration, playerName, idLabel, idUuid, raceEntries, leadChangeTimes, timeAgo } from './adapter.js';
import { loadOverview } from './api.js';
import { useAsync } from './useAsync.js';
import { usePendingReveal } from './useSeen.js';
import {
    Section, Figure, Avatar, Medal, Sprite, RarityTag, Reveal, Delta, Movement, Counter, Chip,
    AsyncView,
} from './Primitives.jsx';
import { RaceMini } from './Charts.jsx';
import * as f from './format.js';

/* The two scopes the podium toggles between. `key` indexes data.podiums and is
   the UI's own vocabulary; the upstream path for `teams` is the combined board,
   a translation that lives in the fetch layer, not here. */
const PODIUM_SCOPES = [
    { key: 'solo', label: 'Solo' },
    { key: 'teams', label: 'Teams' },
];

export function Overview({ onOpenMatch, onOpenPlayer, onOpenItems, onOpenLeaderboards }) {
    const state = useAsync(loadOverview, []);

    return (
        <AsyncView state={state} loadingLabel="Loading the overview…">
            {(data) => (
                <OverviewBody
                    data={data}
                    onOpenMatch={onOpenMatch}
                    onOpenPlayer={onOpenPlayer}
                    onOpenItems={onOpenItems}
                    onOpenLeaderboards={onOpenLeaderboards}
                />
            )}
        </AsyncView>
    );
}

/*
 * The overview's render, unchanged from when this was a synchronous view. It reads its bundle from
 * props now that the fetch happens one level up, so the destructure below is the only line that
 * differs from the pre-fetch version -- everything from the podium down is exactly as it was.
 */
function OverviewBody({ data, onOpenMatch, onOpenPlayer, onOpenItems, onOpenLeaderboards }) {
    const { globals, podiums, featured, activity, moments } = data;

    const [scope, setScope] = useState('solo');

    /* The visible board follows the toggle. Both are already in memory, so this
       is an index, not a fetch. Guarded because a scope with no board yet (an
       upstream section that failed to load) should render empty rather than throw. */
    const board = podiums?.[scope] ?? [];
    const topThree = useMemo(() => board.slice(0, 3), [board]);

    /* The medal cascade re-lands on toggle via the `key={scope}` on the <ol>
       below: a new key remounts the element, which re-fires this mount-only
       effect. The hook itself takes no deps — it decides the starting frame once
       per mount, which is exactly why the remount is what re-triggers it. */
    const podiumRef = useRef(null);
    usePendingReveal(podiumRef, 'ceremony');

    /* The featured race, derived once: lanes, and the moments the lead turned. */
    const race = useMemo(() => {
        // `featured` IS the match (a FibMatchDetail), not a { changes, match } wrapper — the dashboard
        // puts the raw match detail here. leadChanges is a field on it; the race trace and standings
        // derive from its item log the same way any match view does.
        if (!featured) return null;
        const entries = raceEntries(featured);
        return {
            entries,
            changeTimes: leadChangeTimes(entries),
            winner: matchStandings(featured)[0],
        };
    }, [featured]);

    /* The two feeds, kept apart because they were always two queries. `activity` is the raw match
       feed — a FibMatchPage { totalCount, page, size, matches } — so the winners are derived from it
       here: each match's winning participants (won === true), their names and the winning score. The
       mock handed a pre-shaped {playerUuids, score} row; the real feed hands the match, and this is
       where it becomes a win row. `moments` stays as-is (rare pulls, its own endpoint). */
    const wins = useMemo(() => {
        const matches = activity?.matches ?? [];
        return matches.map((m) => {
            const winners = (m.participants ?? []).filter((p) => p.won);
            return {
                matchId: m.matchId,
                at: m.endedAt,
                // Names from the participant identities; a team win lists both, a solo win one.
                players: winners.map((p) => idLabel(p.player)),
                score: winners[0]?.finalScore ?? 0,
            };
        });
    }, [activity]);

    return (
        <div className="fib-page">
            <Reveal as="header" className="fib-overview-head">
                <h1 className="fib-h1" style={{ fontSize: 'var(--fib-text-2xl)' }}>Statistics</h1>
                <p className="fib-lede">
                    Every ranked ForceItemBattle match, the players who played them, and the items
                    that decided them.
                </p>

                {/*
          Scale first, news after: these totals are what a personal number is
          read against. The totals carry no tint; what DOES change — the weekly
          movement — is coloured, using the same emerald/red every delta uses.
        */}
                <div className="fib-pulse">
                    <Figure
                        size="lg" value={globals.matchesPlayed} format={f.full} label="Matches played"
                        note={<><Delta value={globals.matchesPlayedInWindow} /> this week</>}
                    />
                    <Figure
                        size="lg" value={globals.itemsFound} format={f.full} label="Items found"
                        note={<><Delta value={globals.itemsFoundInWindow} /> this week</>}
                    />
                    <Figure
                        size="lg" value={globals.playersRanked} format={f.full} label="Ranked players"
                        note={<><Delta value={globals.playersRankedInWindow} /> this week</>}
                    />
                    <Figure
                        size="lg" value={globals.achievementsGranted} format={f.full}
                        label="Achievements granted"
                        note={<><Delta value={globals.achievementsGrantedInWindow} /> this week</>}
                    />
                </div>
            </Reveal>


            <Section
                title="Most wins"
                sub={scope === 'solo'
                    ? 'The all-time top three in solo matches.'
                    : 'The all-time top three across all teams.'}
                aside={
                    <button type="button" className="fib-btn fib-btn--quiet" onClick={onOpenLeaderboards}>
                        Full ranking
                    </button>
                }
            >
                {/*
          A group, not a tablist — `Chip` renders `<button aria-pressed>`, the
          same toggle the leaderboards page uses. Announcing this as a tab list
          would promise a `role="tab"` structure that is not here.
        */}
                <div
                    role="group"
                    aria-label="Podium scope"
                    style={{ display: 'flex', gap: 7, marginBottom: 'var(--fib-space-6)' }}
                >
                    {PODIUM_SCOPES.map((s) => (
                        <Chip
                            key={s.key}
                            active={s.key === scope}
                            onClick={() => setScope(s.key)}
                        >
                            {s.label}
                        </Chip>
                    ))}
                </div>

                {topThree.length === 0 ? (
                    <div className="fib-panel fib-panel--flush">
                        <div className="fib-meta" style={{ padding: 'var(--fib-space-4)' }}>
                            No ranked players yet.
                        </div>
                    </div>
                ) : (
                    /*
                      The medals land in ceremony order — bronze, silver, gold — rather
                      than DOM order, the one stagger on this page that is about something.
                      `--ceremony` is the delay index, so third place is 0.

                      Keyed on scope so React replaces the list on toggle rather than
                      diffing it — a diff would keep the mounted nodes and skip the
                      entrance, which is the animation we want to re-run.
                    */
                    <ol className="fib-podium" ref={podiumRef} key={scope}>
                        {topThree.map((row) => (
                            <li
                                key={idUuid(row.player)}
                                className="fib-podium-slot"
                                data-place={row.rank}
                                style={{ '--ceremony': 3 - row.rank }}
                            >
                                <div className="fib-podium-faces">
                                    <Avatar uuid={idUuid(row.player)} size={64} />
                                </div>
                                <Medal place={row.rank} />
                                <div className="fib-podium-name">
                                    <button type="button" onClick={() => onOpenPlayer(idUuid(row.player))}>
                                        {idLabel(row.player)}
                                    </button>
                                </div>
                                <div className="fib-podium-value">
                                    <Counter value={row.value} />
                                </div>
                                <div className="fib-figure-label">
                                    {scope === 'solo' ? 'matches won' : 'team wins'}
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
            </Section>


            {featured && race ? (
                <Section
                    title="Match of the week"
                    sub={`The most contested of any recent match — the lead changed hands ${featured.leadChanges} ${featured.leadChanges === 1 ? 'time' : 'times'}.`}
                >
                    <button
                        type="button"
                        className="fib-panel fib-feature-card"
                        onClick={() => onOpenMatch(featured.matchId)}
                    >
                        <div className="fib-feature-top">
                            <div style={{ minWidth: 0 }}>
                                <b className="fib-h2">
                                    {race.winner.members.map(idLabel).join(' & ')} held on
                                </b>
                                <span className="fib-lede">
                  A {featured.mode === 'SOLO' ? 'solo' : 'team'} match over{' '}
                                    {f.duration(matchDuration(featured))}, decided in the final stretch.
                  Watch it unfold — or open it and scrub the clock yourself.
                </span>
                                <span className="fib-meta">{f.stamp(featured.endedAt)}</span>
                            </div>
                            <div className="fib-feature-figures">
                                {/* Diamond, not gold: a contested match is exceptional, but gold
                    means rank, and nobody placed here by changing lead. */}
                                <Figure size="lg" value={featured.leadChanges} label="Lead changes" tone="diamond" />
                                <Figure size="lg" value={featured.items.filter((i) => !i.skipped).length} label="Items collected" />
                            </div>
                        </div>

                        <RaceMini
                            entries={race.entries}
                            duration={matchDuration(featured)}
                            markers={race.changeTimes}
                            label="Score over time in the featured match"
                        />

                        <div className="fib-feature-foot">
              <span className="fib-meta">
                {race.entries.length} competitors · every tick on the axis is a lead change
              </span>
                            <span className="fib-meta fib-feature-go">
                Open the match<i aria-hidden="true">→</i>
              </span>
                        </div>
                    </button>
                </Section>
            ) : null}

            <div className="fib-split">
                <Section title="Latest wins" sub="The most recent ranked matches, newest first.">
                    <div className="fib-panel fib-panel--flush">
                        {wins.length === 0 ? (
                            <div className="fib-meta" style={{ padding: 'var(--fib-space-4)' }}>
                                No matches yet.
                            </div>
                        ) : wins.map((a, i) => (
                            <button
                                key={a.matchId ?? i}
                                type="button"
                                className="fib-row-link"
                                onClick={() => onOpenMatch(a.matchId)}
                            >
                                <span className="fib-stream-icon"><Medal place={1} /></span>
                                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                                    <div style={{ fontWeight: 500 }}>
                                        {a.players.join(' & ')} won with {a.score}
                                    </div>
                                    <div className="fib-meta">{timeAgo(a.at)}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </Section>

                <Section title="Rarest moments" sub="Legendary and rarer back-to-backs, newest first.">
                    <div className="fib-panel fib-panel--flush">
                        {moments.length === 0 ? (
                            <div className="fib-meta" style={{ padding: 'var(--fib-space-4)' }}>
                                No rare pulls yet.
                            </div>
                        ) : moments.map((m, i) => (
                            /* Links to the match now — a rare moment carries its matchId, which
                               the old merged feed dropped and this one keeps. */
                            <button
                                key={`${m.matchId}-${m.itemName}-${i}`}
                                type="button"
                                className="fib-row-link"
                                onClick={() => onOpenMatch(m.matchId)}
                            >
                <span className="fib-stream-icon">
                  <Sprite name={m.itemName} size={32} pad={6} tier={m.b2bRarity} />
                </span>
                                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                                    <div style={{ fontWeight: 500 }}>
                                        {idLabel(m.player)} pulled {f.itemLabel(m.itemName)}
                                    </div>
                                    <div className="fib-meta">{timeAgo(m.collectedAt)}</div>
                                </div>
                                <RarityTag tier={m.b2bRarity} />
                            </button>
                        ))}
                    </div>
                </Section>
            </div>

            <div style={{ marginTop: 'var(--fib-space-4)' }}>
                <button
                    type="button"
                    className="fib-btn fib-btn--quiet"
                    onClick={onOpenItems}
                >
                    Browse the item index
                </button>
            </div>
        </div>
    );
}
