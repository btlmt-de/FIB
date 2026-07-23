/**
 * FIB Stats — the overview.
 *
 * Scale first, then the news — DESIGN.md's "Scale Sets the Scale". The
 * server-wide totals open the page because they are the yardstick every number
 * below is read against: "842,190 items found" is what makes one player's
 * 2,400 mean something, and a reader who meets the personal number first has
 * nothing to judge it against.
 *
 * Below them: this week's podium, then the featured match — the actual race,
 * compressed to a band of lanes, because "the week's hardest-fought match" is
 * a claim a chart makes better than a sentence — then one unified stream of
 * recent events (wins and rare pulls share a chronology; they were never two
 * stories). People come back to a leaderboard to see whether they moved, so
 * the standing answers first and the story of one match follows it.
 *
 * ── Motion ──
 *
 * Three moments, each shaped to what it reveals rather than one entrance
 * applied three times:
 *
 *   the podium    medals land bronze, silver, gold — ceremony order
 *   the race      one wipe left to right, so the band runs in match time
 *   the totals    count up, because a total is a quantity accumulating
 *
 * Everything else on the page is still. Note the two lists deliberately have
 * no stagger: "Also climbing" and "Latest" sit side by side, and giving both
 * the same cascade is exactly the uniform reflex the rest of this avoids.
 *
 * Everything on this page is a route into somewhere else. No dead ends.
 */

import React, { useMemo, useRef } from 'react';
import { matchStandings, playerName, raceEntries, leadChangeTimes, timeAgo } from './adapter.js';
import { usePendingReveal } from './useSeen.js';
import {
  Section, Figure, Avatar, Medal, Sprite, RarityTag, Reveal, Delta, Movement, Counter,
} from './Primitives.jsx';
import { RaceMini } from './Charts.jsx';
import * as f from './format.js';

export function Overview({ data, onOpenMatch, onOpenPlayer, onOpenItems, onOpenLeaderboards }) {
  const { globals, weekly, featured, activity } = data;

  const topThree = useMemo(() => weekly.slice(0, 3), [weekly]);
  const restOfWeek = useMemo(() => weekly.slice(3), [weekly]);

  const podiumRef = useRef(null);
  usePendingReveal(podiumRef, 'ceremony');

  /* The featured race, derived once: lanes, and the moments the lead turned. */
  const race = useMemo(() => {
    if (!featured?.match) return null;
    const entries = raceEntries(featured.match);
    return {
      entries,
      changes: leadChangeTimes(entries),
      winner: matchStandings(featured.match)[0],
    };
  }, [featured]);

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
          read against — "842,190 items found" is what makes one player's 2,400
          mean something. The totals themselves carry no tint; none of them is
          a rank, a rarity or a win. What DOES change — the weekly movement —
          is coloured, using the same emerald/red every other delta uses.
        */}
        <div className="fib-pulse">
          <Figure
            size="lg" value={globals.matchesPlayed} format={f.full} label="Matches played"
            note={<><Delta value={globals.matchesThisWeek} /> this week</>}
          />
          <Figure
            size="lg" value={globals.itemsFound} format={f.full} label="Items found"
            note={<><Delta value={globals.itemsThisWeek} /> this week</>}
          />
          <Figure
            size="lg" value={globals.playersRanked} format={f.full} label="Ranked players"
            note={<><Delta value={globals.playersThisWeek} /> this week</>}
          />
          {/* Was "Average match length". Rounds are a fixed 60 minutes here, so
              averaging them reported the setting back as though it were a
              finding. This one actually moves. */}
          <Figure
            size="lg" value={globals.achievementsGranted} format={f.full}
            label="Achievements granted"
            note={<><Delta value={globals.achievementsThisWeek} /> this week</>}
          />
        </div>
      </Reveal>


      <Section
        title="This week"
        sub="Ranked by matches won over the last seven days."
        aside={
          <button type="button" className="fib-btn fib-btn--quiet" onClick={onOpenLeaderboards}>
            All-time ranking
          </button>
        }
      >
        {/*
          The medals land in ceremony order — bronze, silver, gold — rather than
          in DOM order, which is the one stagger on this page that is about
          something. `--ceremony` is the delay index, so third place is 0.

          This is also the module's single sanctioned glow: the medals already
          carry it, and letting each one arrive under its own light is what the
          "Earned Glow" rule reserves the effect for.
        */}
        <ol className="fib-podium" ref={podiumRef}>
          {topThree.map((row) => (
            <li
              key={row.playerUuid}
              className="fib-podium-slot"
              data-place={row.rank}
              style={{ '--ceremony': 3 - row.rank }}
            >
              <div className="fib-podium-faces">
                <Avatar uuid={row.playerUuid} size={64} />
              </div>
              <Medal place={row.rank} />
              <div className="fib-podium-name">
                <button type="button" onClick={() => onOpenPlayer(row.playerUuid)}>
                  {playerName(row.playerUuid)}
                </button>
              </div>
              {/* Counts, like every other podium value in the module. The
                  leaderboard's podium always has; this one was raw text. */}
              <div className="fib-podium-value">
                <Counter value={row.wins} />
              </div>
              {/* Two separate facts, on two separate lines: the value is wins,
                  the arrow is places moved. They were one string. */}
              <div className="fib-figure-label">matches won</div>
              <div className="fib-podium-move">
                <Movement value={row.delta} verbose />
              </div>
            </li>
          ))}
        </ol>
      </Section>


      {featured?.match && race ? (
        <Section
          title="Match of the week"
          sub={`The most contested of any recent match — the lead changed hands ${featured.changes} ${featured.changes === 1 ? 'time' : 'times'}.`}
        >
          <button
            type="button"
            className="fib-panel fib-feature-card"
            onClick={() => onOpenMatch(featured.match.matchId)}
          >
            <div className="fib-feature-top">
              <div style={{ minWidth: 0 }}>
                <b className="fib-h2">
                  {race.winner.members.map(playerName).join(' & ')} held on
                </b>
                {/* A <span>, not a <p>: this card is a <button>, whose content
                    model is phrasing content only. */}
                <span className="fib-lede">
                  A {featured.match.mode === 'SOLO' ? 'solo' : 'team'} match over{' '}
                  {f.duration(featured.match.durationSeconds)}, decided in the final stretch.
                  Watch it unfold — or open it and scrub the clock yourself.
                </span>
                <span className="fib-meta">{f.stamp(featured.match.endedAt)}</span>
              </div>
              <div className="fib-feature-figures">
                {/* Diamond, not gold: a contested match is exceptional, but gold
                    means rank, and nobody placed here by changing lead. */}
                <Figure size="lg" value={featured.changes} label="Lead changes" tone="diamond" />
                <Figure size="lg" value={featured.match.items.length} label="Items collected" />
              </div>
            </div>

            <RaceMini
              entries={race.entries}
              duration={featured.match.durationSeconds}
              markers={race.changes}
              label="Score over time in the featured match"
            />

            <div className="fib-feature-foot">
              <span className="fib-meta">
                {race.entries.length} competitors · every tick on the axis is a lead change
              </span>
              {/* The arrow steps out on hover — the one bit of feedback the
                  card's whole clickable area gets beyond its background. */}
              <span className="fib-meta fib-feature-go">
                Open the match<i aria-hidden="true">→</i>
              </span>
            </div>
          </button>
        </Section>
      ) : null}

      <div className="fib-split">
        <Section title="Also climbing" sub="The rest of this week's board. Arrows are places moved since last week.">
          <div className="fib-panel fib-panel--flush">
            {restOfWeek.map((row) => (
              <button
                key={row.playerUuid}
                type="button"
                className="fib-row-link"
                onClick={() => onOpenPlayer(row.playerUuid)}
              >
                <Medal place={row.rank} />
                <Avatar uuid={row.playerUuid} size={28} />
                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>{playerName(row.playerUuid)}</div>
                  <div className="fib-meta">
                    {row.wins} wins · {f.num(row.items)} items
                  </div>
                </div>
                <Movement value={row.delta} />
              </button>
            ))}
          </div>
        </Section>

        <Section title="Latest" sub="Completed events, newest first.">
          <div className="fib-panel fib-panel--flush">
            {activity.map((a, i) => {
              const body = (
                <>
                  <span className="fib-stream-icon">
                    {a.kind === 'b2b'
                      ? <Sprite name={a.itemName} size={32} pad={6} tier={a.rarity} />
                      : <Medal place={1} />}
                  </span>
                  <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                    <div style={{ fontWeight: 500 }}>
                      {a.kind === 'win'
                        ? `${a.playerUuids.map(playerName).join(' & ')} won with ${a.score}`
                        : `${playerName(a.playerUuids[0])} pulled ${f.itemLabel(a.itemName)}`}
                    </div>
                    <div className="fib-meta">{timeAgo(a.at)}</div>
                  </div>
                  {a.kind === 'b2b' ? <RarityTag tier={a.rarity} /> : null}
                </>
              );

              /* Wins know their match and open it. Pulls carry no match id, so
                 they stay descriptive rather than faking a destination. */
              return a.kind === 'win' ? (
                <button key={i} type="button" className="fib-row-link" onClick={() => onOpenMatch(a.matchId)}>
                  {body}
                </button>
              ) : (
                <div key={i} className="fib-row-link" style={{ cursor: 'default' }}>
                  {body}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="fib-btn fib-btn--quiet"
            style={{ marginTop: 'var(--fib-space-4)' }}
            onClick={onOpenItems}
          >
            Browse the item index
          </button>
        </Section>
      </div>
    </div>
  );
}
