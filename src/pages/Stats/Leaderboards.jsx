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
 * Category is a chip row rather than a select: there are eight, they are all
 * one word, and making the reader open a menu to compare two boards is a tax.
 */

import React, { useMemo, useState } from 'react';
import {
  LEADERBOARD_SCOPES, LEADERBOARD_CATEGORIES, playerName,
} from './adapter.js';
import { loadLeaderboard } from './api.js';
import { useAsync } from './useAsync.js';
import {
  Section, Segmented, Chip, Avatar, Medal, Empty, PlayerLink, Counter, AsyncView,
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

const keyOf = (row) => entrantsOf(row).map((e) => e.playerUuid).join('~');

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

function LeaderboardsBody({ rows, scope, onScopeChange, category, onCategory, onOpenPlayer }) {
  const meta = LEADERBOARD_CATEGORIES.find((c) => c.id === category);

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
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

  return (
      <div className="fib-page">
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
          A group, not a tablist. `Chip` renders `<button aria-pressed>`, which
          is a toggle — announcing the container as a tab list promised a screen
          reader structure that was not in it, and there were no `role="tab"`
          children for it to find.
        */}
          <div
              role="group"
              aria-label="Leaderboard category"
              style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 'var(--fib-space-6)' }}
          >
            {LEADERBOARD_CATEGORIES.map((c) => (
                <Chip
                    key={c.id}
                    active={c.id === category}
                    onClick={() => onCategory(c.id)}
                    title={c.sense === 'low' ? 'Lower is better' : undefined}
                >
                  {c.label}
                </Chip>
            ))}
          </div>

          {rows.length === 0 ? (
              <Empty title="This board is empty">
                No completed matches have produced a {meta.label.toLowerCase()} figure yet.
                Boards fill in as matches finish — nothing is lost in the meantime.
              </Empty>
          ) : (
              <>
                <ol className="fib-podium">
                  {podium.map((row) => {
                    const entrants = entrantsOf(row);
                    return (
                        <li key={keyOf(row)} className="fib-podium-slot" data-place={row.rank}>
                          <div className="fib-podium-faces">
                            {entrants.map((e) => (
                                <Avatar key={e.playerUuid} uuid={e.playerUuid} size={entrants.length > 1 ? 44 : 64} />
                            ))}
                          </div>
                          <Medal place={row.rank} />
                          <div className="fib-podium-name">
                            {entrants.map((e, i) => (
                                <React.Fragment key={e.playerUuid}>
                                  {i > 0 ? <span className="fib-podium-amp"> &amp; </span> : null}
                                  <button type="button" onClick={() => onOpenPlayer(e.playerUuid)}>
                                    {e.playerName ?? playerName(e.playerUuid)}
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

                {rest.length > 0 ? (
                    <div className="fib-panel fib-panel--flush fib-table-wrap" style={{ marginTop: 'var(--fib-space-6)' }}>
                      <table className="fib-table">
                        <caption className="fib-sr">
                          {meta.label}, positions 4 and below, {scope} scope. Share and gap are
                          measured against the leader&rsquo;s {format(best)}.
                        </caption>
                        <thead>
                        <tr>
                          <th scope="col" style={{ width: 64 }}>Rank</th>
                          <th scope="col">{scope === 'duo' ? 'Duo' : 'Player'}</th>
                          <th scope="col" data-num style={{ width: 120 }}>{meta.label}</th>
                          {/* The share column takes the slack the Player column used
                          to hoard — a name and its bar now sit close enough to
                          be read as one fact. */}
                          <th scope="col" className="fib-share-col">
                            Share of {format(best)}
                          </th>
                          <th scope="col" data-num style={{ width: 104 }}>Gap</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rest.map((row) => {
                          const entrants = entrantsOf(row);
                          return (
                              <tr key={keyOf(row)}>
                                <td data-num style={{ color: 'var(--fib-netherite)' }}>{row.rank}</td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--fib-space-3)', flexWrap: 'wrap' }}>
                                    {entrants.map((e) => (
                                        <PlayerLink key={e.playerUuid} uuid={e.playerUuid} name={e.playerName} onOpen={onOpenPlayer} />
                                    ))}
                                  </div>
                                </td>
                                <td data-num>{format(row.value)}</td>
                                <td className="fib-share-col">
                                  <div
                                      className="fib-ramp-track fib-share-track"
                                      role="img"
                                      aria-label={`${Math.round(shareOf(row.value) * 100)}% of the leader's ${format(best)}`}
                                  >
                                    <i style={{ '--fill': shareOf(row.value) }} />
                                  </div>
                                </td>
                                {/* This table starts at rank 4, so the leader's own
                              "—" never renders here; the gap is always real. */}
                                <td data-num className="fib-gap">
                                  {`−${gapFormat(gapOf(row.value))}`}
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
