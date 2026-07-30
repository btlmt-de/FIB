/**
 * FIB Stats — ranking.
 *
 * Deliberately not "a table with decorations". The top three are a podium of
 * real objects — avatar, medal, the number at display scale — because those
 * three positions are the only ones anyone screenshots. Everything from fourth
 * down is a table, because by then the question has changed from "who won" to
 * "where am I", and a table answers that faster than anything prettier.
 *
 * The table answers two more questions a bare value cannot: "how far off the
 * lead am I" (the gap column) and "what does the field look like" (the share
 * bar under every value — a runaway leader and a pack finish read differently
 * before a single number is parsed). Both respect the category's sense: on
 * the deaths board the best value is the smallest one.
 *
 * Scope and metric are both `Segmented` — the same control, because they are the
 * same job. The metric row was a chip row for a while, which meant two different
 * "pick one of N" widgets sat on one screen looking and behaving differently. It
 * is not a select either: the boards are one word each, and making a reader open
 * a menu to compare two of them is a tax.
 */

import React, { useState } from 'react';
import {
    LEADERBOARD_SCOPES, LEADERBOARD_CATEGORIES, idLabel, idUuid,
} from './adapter.js';
import { loadLeaderboard } from './api.js';
import { useAsync } from './useAsync.js';
import {
    Section, Segmented, Avatar, Medal, Empty, PlayerLink, Counter, AsyncView,
} from './Primitives.jsx';
import * as f from './format.js';

/**
 * Duo rows carry two players, solo and combined carry one. The identity is nested now
 * ({ playerUuid, playerName }), so this pulls the uuids out of whichever fields are present.
 */
/**
 * The entrants on a row, as identity objects ({ playerUuid, playerName }) — solo/combined carry one
 * under `player`, duo carries two under player1/player2. Kept as objects, not bare uuids, so the
 * name the row already carries is rendered instead of a lookup.
 */
const entrantsOf = (row) =>
    row.player ? [row.player]
        : [row.player1, row.player2].filter(Boolean);

const keyOf = (row) => entrantsOf(row).map(idUuid).join('~');

export function Leaderboards({ scope, onScopeChange, onOpenPlayer }) {
    const [category, setCategory] = useState('GAMES_WON');
    const state = useAsync(() => loadLeaderboard(scope, category), [scope, category]);

    return (
        <AsyncView state={state} loadingLabel="Loading the leaderboard…">
            {(rows) => (
                <LeaderboardsBody
                    rows={rows ?? []}
                    scope={scope} onScopeChange={onScopeChange}
                    category={category} onCategory={setCategory}
                    onOpenPlayer={onOpenPlayer}
                />
            )}
        </AsyncView>
    );
}

/*
 * A podium needs a field to stand above.
 *
 * At six entrants or more, lifting the top three out leaves a table with enough
 * rows to be a table. Below that it does not: a five-player board put three on
 * the podium and left two rows behind, which read as a broken table rather than
 * as a ceremony — and "where am I" is unanswerable when the answer is "one of the
 * two under the photos".
 *
 * So under six, the whole board is the table and the medals move into the rank
 * column. Same information, one shape instead of one and a half.
 */
const PODIUM_MIN = 6;

function LeaderboardsBody({ rows, scope, onScopeChange, category, onCategory, onOpenPlayer }) {
    const meta = LEADERBOARD_CATEGORIES.find((c) => c.id === category);

    const showPodium = rows.length >= PODIUM_MIN;
    const podium = showPodium ? rows.slice(0, 3) : [];
    const rest = showPodium ? rows.slice(3) : rows;
    const format = (v) => f.byKind(v, meta.format);

    /*
     * The leader's value is the yardstick for everything below the podium.
     * For DEATHS (sense 'low') the best value is the smallest: the share bar
     * inverts, and the gap counts UP from the leader rather than down.
     */
    const low = meta.sense === 'low';
    const best = rows.length ? rows[0].value : 0;
    const shareOf = (v) => {
        if (low) return v > 0 ? Math.min(1, best / v) : 0;
        return best > 0 ? v / best : 0;
    };
    const gapOf = (v) => Math.abs(v - best);
    /* Gaps are deltas, not standings: they never take the category's unit
       suffix ("blocks" behind every figure would drown the point). */
    const gapFormat = (v) => (meta.format === 'distance' ? f.distance(v) : f.num(v));

    /*
     * The share column earns its width only when there is a shape to show. On a
     * board where everyone below the lead sits at zero — two players with no wins
     * on the wins board — it drew two full-width empty tracks, a column whose
     * every cell said nothing. Suppressed rather than shipped empty; the gap
     * column still carries the distance to the lead.
     */
    const showShare = rest.some((r) => shareOf(r.value) > 0);

    return (
        <div className="fib-page fib-page--wide">
            <Section
                title="Ranking"
                sub={
                    meta.sense === 'low'
                        ? `Fewest ${meta.label.toLowerCase()} leads this board.`
                        : `Ranked by ${meta.label.toLowerCase()}, highest first.`
                }
                aside={
                    <Segmented
                        options={LEADERBOARD_SCOPES}
                        value={scope}
                        onChange={onScopeChange}
                        label="Ranking scope"
                    />
                }
            >
                {/*
          The metric picker. This was a chip row, which put two different
          "pick exactly one of N" controls on the same screen — a sliding
          segmented track for scope, toggle-styled chips for the metric — and a
          reader has no way to know they behave identically. Both are Segmented
          now: one control, one keyboard contract (one tab stop, arrows move the
          selection), one look.

          The chip row existed because the old Segmented could not wrap. It can
          now; see `measure` in Primitives.
        */}
                <div style={{ marginBottom: 'var(--fib-space-6)' }}>
                    <Segmented
                        options={LEADERBOARD_CATEGORIES.map((c) => ({
                            ...c,
                            hint: c.sense === 'low' ? 'Lower is better' : undefined,
                        }))}
                        value={category}
                        onChange={onCategory}
                        label="Leaderboard metric"
                    />
                </div>

                {rows.length === 0 ? (
                    <Empty title="This board is empty">
                        No completed matches have produced a {meta.label.toLowerCase()} figure yet.
                        Boards fill in as matches finish — nothing is lost in the meantime.
                    </Empty>
                ) : (
                    <>
                        {showPodium ? (
                        <ol className="fib-podium">
                            {podium.map((row) => {
                                const entrants = entrantsOf(row);
                                return (
                                    <li key={keyOf(row)} className="fib-podium-slot" data-place={row.rank}>
                                        <div className="fib-podium-faces">
                                            {entrants.map((e) => (
                                                <Avatar key={idUuid(e)} uuid={idUuid(e)} size={entrants.length > 1 ? 44 : 64} />
                                            ))}
                                        </div>
                                        <Medal place={row.rank} />
                                        <div className="fib-podium-name">
                                            {entrants.map((e, i) => (
                                                <React.Fragment key={idUuid(e)}>
                                                    {i > 0 ? <span className="fib-podium-amp"> &amp; </span> : null}
                                                    <button type="button" onClick={() => onOpenPlayer(idUuid(e))}>
                                                        {idLabel(e)}
                                                    </button>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                        <div className="fib-podium-value">
                                            <Counter value={row.value} format={format} />
                                        </div>
                                        <div className="fib-figure-label">{meta.label}</div>
                                    </li>
                                );
                            })}
                        </ol>
                        ) : null}

                        {rest.length > 0 ? (
                            <div
                                className="fib-panel fib-panel--flush fib-table-wrap"
                                style={{ marginTop: showPodium ? 'var(--fib-space-6)' : 0 }}
                            >
                                <table className="fib-table">
                                    <caption className="fib-sr">
                                        {meta.label}, {showPodium ? 'positions 4 and below' : 'every position'},
                                        {' '}{scope} scope. {showShare ? 'Share and gap are' : 'The gap is'}
                                        {' '}measured against the leader&rsquo;s {format(best)}.
                                    </caption>
                                    <thead>
                                    <tr>
                                        <th scope="col" style={{ width: 64 }}>Rank</th>
                                        <th scope="col">{scope === 'duo' ? 'Duo' : 'Player'}</th>
                                        <th scope="col" data-num style={{ width: 120 }}>{meta.label}</th>
                                        {/* The share column takes the slack the Player column used
                          to hoard — a name and its bar now sit close enough to
                          be read as one fact. */}
                                        {showShare ? (
                                            <th scope="col" className="fib-share-col">
                                                Share of {format(best)}
                                            </th>
                                        ) : null}
                                        <th scope="col" data-num style={{ width: 104 }}>Gap</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {rest.map((row) => {
                                        const entrants = entrantsOf(row);
                                        /* With no podium the table starts at rank 1, so the leader
                                           is in it and its gap to itself is nothing to state. */
                                        const isLeader = row.rank === 1;
                                        return (
                                            <tr key={keyOf(row)}>
                                                <td data-num style={{ color: 'var(--fib-netherite)' }}>
                                                    {row.rank <= 3 && !showPodium
                                                        ? <Medal place={row.rank} />
                                                        : row.rank}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--fib-space-3)', flexWrap: 'wrap' }}>
                                                        {entrants.map((e) => (
                                                            <PlayerLink key={idUuid(e)} uuid={idUuid(e)} name={idLabel(e)} onOpen={onOpenPlayer} />
                                                        ))}
                                                    </div>
                                                </td>
                                                <td data-num>{format(row.value)}</td>
                                                {showShare ? (
                                                    <td className="fib-share-col">
                                                        <div
                                                            className="fib-ramp-track fib-share-track"
                                                            role="img"
                                                            aria-label={`${Math.round(shareOf(row.value) * 100)}% of the leader's ${format(best)}`}
                                                        >
                                                            <i style={{ '--fill': shareOf(row.value) }} />
                                                        </div>
                                                    </td>
                                                ) : null}
                                                <td data-num className="fib-gap">
                                                    {isLeader ? '—' : `${low ? '+' : '−'}${gapFormat(gapOf(row.value))}`}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}

                        <p className="fib-meta" style={{ marginTop: 'var(--fib-space-4)' }}>
                            {scope === 'duo'
                                ? 'Each duo is ranked as its own pair — playing with someone new starts a separate record.'
                                : scope === 'combined'
                                    ? 'Combined sums every duo a player has been part of.'
                                    : 'Solo matches only, across all ranked players.'}
                        </p>
                    </>
                )}
            </Section>
        </div>
    );
}
