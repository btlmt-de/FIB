/**
 * FIB Stats — the player record.
 *
 * Two views: `Players` (find someone) and `PlayerProfile` (the record itself).
 *
 * The profile is the only view in the module that earns a long scroll, and it
 * is ordered by the questions a player actually arrives with, in the order
 * they arrive with them:
 *
 *   HERO        who is this, and are they any good (the verdict)
 *   RECORD      the career, in two tiers: six headline figures, then eight more
 *   COLLECTION  what do they pull — the record's last figure, broken out
 *   FORM        how are they doing LATELY — the live question
 *   HONOURS     what have they earned: a trophy case, then what is in reach
 *   IN SHORT    the one-line version, worth quoting
 *
 * The record sits directly under the identity because "is this player any
 * good" is the question someone arrives with, and it should not require a
 * scroll. Collection follows it directly: the record's supporting tier ends on
 * Total back-to-backs, and Collection opens with that same number broken down
 * by rarity, so the figure and its breakdown are adjacent rather than a
 * section apart. Both are past tense. Form comes after them because "are they
 * improving" is a present-tense question, and the reader feels that shift more
 * sharply when the whole record has been laid out first.
 *
 * There is no Career section at the foot of the page any more. It was a ledger
 * — label, value, share-of-best bar, the field's best — and every number it
 * held now sits in one of the record's two tiers, carrying its standing in the
 * field instead of a bar. Keeping both would have printed the career twice.
 *
 * A sticky identity bar docks at the top once the hero scrolls out: whose
 * record this is must survive the scroll.
 *
 * Scope (solo / duos / combined) is owned by the shell, not by this file, so
 * switching scope here and then walking to the leaderboards keeps the reader
 * in the same frame of reference.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LEADERBOARD_SCOPES, matchStandings } from './adapter.js';
import { RARITY_KEYS } from './tokens.js';
import {
  unifyStats, totalPulls, achievementGroups, achievementSummary, splitAchievements,
} from './achievements.js';
import {
  loadPlayer, loadPlayerMatches, loadCatalogue, loadPlayerAchievements,
  loadStatField, loadCollection,
} from './api.js';
import { idUuid, idName, idLabel, matchDuration } from './adapter.js';
import { useAsync } from './useAsync.js';
import { canObserve } from './env.js';
import {
  Section, Figure, Avatar, Sprite, Medal, Segmented, Search, Empty,
  RarityRamp, PlayerLink, Reveal, Counter, AsyncView, PCard, CardMeter,
} from './Primitives.jsx';
import { ScoreTrend } from './Charts.jsx';
import * as f from './format.js';
import { renderMiniMessage } from './MiniMessage.jsx';

/* ── The record ───────────────────────────────────────────────────────── */

export function PlayerProfile({ uuid, scope, onScopeChange, onBack, onOpenPlayer, onOpenMatch, onOpenCollection }) {
  const [partnerIndex, setPartnerIndex] = useState(0);

  const profileState = useAsync(() => loadPlayer(uuid), [uuid]);
  // The score trend needs this player's matches — a separate, optional fetch whose failure or
  // absence must not block the profile.
  const historyState = useAsync(() => loadPlayerMatches(uuid), [uuid]);
  // Achievements are their own two calls (catalogue + this player's unlocks), loaded alongside the
  // profile rather than folded into it — the honours section can lag or fail on its own. The
  // catalogue is the same for everyone, so it is cheap and cacheable upstream.
  const catalogueState = useAsync(loadCatalogue, []);
  const achievementsState = useAsync(() => loadPlayerAchievements(uuid), [uuid]);
  /* The field every figure states its placing against, and the collection totals
     the four COLLECTION achievements measure progress against. Both are optional
     by design: without the field the figures render bare (as they did for every
     release before this one), and without the collection those four rows show no
     bar. Neither blocks the profile, and neither is refetched per scope — the
     field is scoped client-side from one payload. */
  const fieldState = useAsync(
      () => (scope === 'duo' ? Promise.resolve({ data: null }) : loadStatField(scope)),
      [scope],
  );
  const collectionState = useAsync(() => loadCollection(uuid), [uuid]);

  return (
      <AsyncView
          state={profileState}
          loadingLabel="Loading profile…"
          notFound={
            <div className="fib-page">
              <Empty title="No such player" action={<button type="button" className="fib-btn" onClick={onBack}>Back to players</button>}>
                No ranked player with that name or id. They may not have finished a match yet.
              </Empty>
            </div>
          }
      >
        {(payload) => (
            <PlayerProfileBody
                uuid={uuid} scope={scope} onScopeChange={onScopeChange}
                onBack={onBack} onOpenPlayer={onOpenPlayer} onOpenMatch={onOpenMatch}
                onOpenCollection={onOpenCollection}
                payload={payload}
                history={historyState.data}
                catalogue={catalogueState.data}
                achievements={achievementsState.data}
                statField={fieldState.data}
                collection={collectionState.data}
                partnerIndex={partnerIndex} setPartnerIndex={setPartnerIndex}
            />
        )}
      </AsyncView>
  );
}

function PlayerProfileBody({
                             uuid, scope, onScopeChange, onBack, onOpenPlayer, onOpenMatch, onOpenCollection,
                             payload, history, catalogue, achievements, statField, collection,
                             partnerIndex, setPartnerIndex,
                           }) {
  const heroRef = useRef(null);
  const [barOn, setBarOn] = useState(false);

  /* The sticky identity bar appears exactly when the hero stops covering the
     question "whose record is this". The observer's first callback fires on
     attach, so the bar always starts from the truth rather than a reset. */
  useEffect(() => {
    const el = heroRef.current;
    if (!el || !canObserve()) return undefined;
    const io = new IntersectionObserver(
        ([entry]) => setBarOn(!entry.isIntersecting),
        { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [uuid, scope]);

  const model = useMemo(() => {
    // payload is { profile, partners, rank }; each section may be null (the composition degrades
    // per section), so every read tolerates absence.
    const profile = payload.profile ?? null;

    // The partners section is raw FibTeamStats objects ({ player1, player2, ...stats }). Normalize
    // each into { uuid, name, team }: `team` is the pair's stats, and uuid/name is whichever member
    // is NOT the profile's own player — "the partner". The render reads this shape throughout.
    const partners = (payload.partners ?? []).map((teamStats) => {
      const p1 = teamStats.player1;
      const p2 = teamStats.player2;
      const partner = idUuid(p1) === uuid ? p2 : p1;
      return {
        uuid: idUuid(partner),
        name: idName(partner),
        team: teamStats,
      };
    });

    // Scope picks which stat block to show. solo/combined come off the profile bundle directly;
    // duo reads the selected partnership's team stats.
    const rawStats =
        scope === 'combined' ? profile?.team
            : scope === 'duo' ? (partners[partnerIndex] ?? partners[0])?.team ?? null
                : profile?.solo;
    const stats = unifyStats(rawStats, scope);

    // Trend from the optional history fetch. Null until that endpoint exists; the Form section
    // already treats "fewer than two" as its empty case, so an empty list flows through cleanly.
    const matches = history?.matches ?? [];
    const mine = matches.filter((m) => m.participants?.some((p) => idUuid(p.player) === uuid));
    const trend = mine
        .slice()
        .sort((a, b) => new Date(a.endedAt) - new Date(b.endedAt))
        .slice(-14)
        .map((m) => {
          const me = m.participants.find((p) => idUuid(p.player) === uuid);
          return { value: me.finalScore, won: me.won, label: f.date(m.endedAt), matchId: m.matchId };
        });

    /*
     * The field each figure states its placing against: one column of values per
     * metric, fetched from the leaderboards for the scope being shown (see
     * `loadStatField`). Duo never gets one — a partnership's totals are not
     * comparable to individuals', and "2nd of 6" against the wrong denominator is
     * worse than no note at all — and `PlayerProfile` does not even request it.
     */
    const field = scope === 'duo' ? null : (statField?.values ?? null);

    /* Lifetime totals, for achievement progress. Deliberately NOT the scoped
       block: "Die 500 times" counts every death a player has ever had, so
       flipping the scope selector to Duos must not make a global achievement
       look further away than it is. `team` is the combined roll-up. */
    const career = unifyStats(profile?.team, 'combined') ?? unifyStats(profile?.solo, 'solo');

    const achGroups = achievementGroups(catalogue, achievements, {
      career,
      streaks: profile?.streaks ?? null,
      collection,
    });

    return {
      profile, stats, trend, partners, field,
      summary: achievementSummary(catalogue, achievements),
      rank: payload.rank ?? null,
      achGroups,
      recent: mine.slice(0, 5),
    };
  }, [payload, history, catalogue, achievements, statField, collection, scope, partnerIndex, uuid]);

  const { profile, stats, field, trend, achGroups, summary, rank, partners, recent } = model;
  const name = idName(profile?.player) ?? uuid.slice(0, 8);
  const winRate = f.winRate(stats.gamesWon, stats.gamesPlayed);

  // Under five matches a win rate is noise dressed as a statistic. The profile
  // still shows everything, but stops presenting the rate as a verdict.
  const thin = (stats.gamesPlayed ?? 0) < 5;

  const scopeOptions = LEADERBOARD_SCOPES.map((s) => ({ ...s, label: s.label }));

  const rarityCounts = Object.fromEntries(
      RARITY_KEYS.map((k) => [k, stats.rarities?.[k.toLowerCase()] ?? 0]),
  );
  const pulls = totalPulls(stats);

  /* Combined scope with no partnerships, or duo scope with none — the player
     has only ever played solo. Say that rather than rendering zeros. */
  const noTeams = (scope === 'combined' || scope === 'duo') && (!partners || partners.length === 0);

  return (
      <div className="fib-page">
        <div className="fib-playerbar" data-on={barOn || undefined} aria-hidden="true">
          <Avatar uuid={uuid} size={26} />
          <b>{name}</b>
          {rank?.rank != null ? <Medal place={rank.rank} /> : null}
          <span className="fib-spacer" />
          <span className="fib-playerbar-stat">{winRate.toFixed(0)}%</span>
          <span className="fib-meta">{f.num(stats.gamesWon)} of {f.num(stats.gamesPlayed)} won</span>
        </div>

        {/* ── HERO: the verdict ────────────────────────────────────────── */}
        <Reveal as="header" className="fib-hero">
          <div ref={heroRef}>
            <button type="button" className="fib-btn fib-btn--quiet fib-hero-back" onClick={onBack}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 6l-6 6 6 6" />
              </svg>
              Players
            </button>

            <div className="fib-hero-grid">
              <div className="fib-hero-id">
                <div className="fib-well fib-hero-avatar">
                  <Avatar uuid={uuid} size={128} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h1 className="fib-hero-name">{name}</h1>
                  {rank?.rank != null ? (
                      <div className="fib-hero-rank">
                        <Medal place={rank.rank} />
                        <span>
                      Rank {rank.rank} of {rank.totalRanked}
                          <em> · by matches won, solo</em>
                    </span>
                      </div>
                  ) : (
                      <div className="fib-hero-rank">
                        <span className="fib-meta">Unranked — no solo record yet</span>
                      </div>
                  )}
                  <div className="fib-meta" style={{ marginTop: 10 }}>
                    {summary.earned} of {summary.total} achievements
                  </div>
                </div>
              </div>

              <div className="fib-hero-figures">
                <Figure
                    size="hero"
                    tone={thin ? undefined : 'gold'}
                    value={winRate}
                    format={(n) => n.toFixed(0)}
                    unit="%"
                    label={thin ? 'Win rate — too few matches to mean much' : 'Win rate'}
                    note={`${f.num(stats.gamesWon)} of ${f.num(stats.gamesPlayed)} matches won`}
                />
              </div>
            </div>

            <div className="fib-hero-scope">
              <Segmented
                  options={scopeOptions}
                  value={scope}
                  onChange={onScopeChange}
                  label="Statistics scope"
              />
              {scope === 'duo' && partners?.length > 1 ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="fib-label">with</span>
                    <Segmented
                        options={partners.map((p, i) => ({ id: String(i), label: p.name ?? (p.uuid ? p.uuid.slice(0, 8) : '?') }))}
                        value={String(partnerIndex)}
                        onChange={(v) => setPartnerIndex(Number(v))}
                        label="Duo partner"
                    />
                  </div>
              ) : null}
            </div>
          </div>
        </Reveal>

        {noTeams ? (
            <Section title="No duos yet">
              <Empty title={`${name} has only played solo`}>
                Duo statistics appear once this player finishes a match on a team. Every duo is
                tracked as its own pair, so partnering with someone new starts a fresh record
                rather than adding to an existing one.
              </Empty>
            </Section>
        ) : (
            <>
              {/* ── THE RECORD ───────────────────────────────────────────── */}
              <Record stats={stats} field={field} streaks={profile?.streaks} />

              {/* ── COLLECTION ───────────────────────────────────────────── */}
              <Section
                  title="Collection"
                  sub={`${f.num(stats.totalItemsFound)} items found, ${f.num(pulls)} of them back-to-back pulls.`}
                  aside={onOpenCollection ? (
                      <button type="button" className="fib-btn" onClick={() => onOpenCollection(uuid)}>
                        Open full collection
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </button>
                  ) : null}
              >
                <div className="fib-collection">
                  <div>
                    <h3 className="fib-subhead" style={{ marginTop: 0 }}>Signature items</h3>
                    {stats.topThreeItems?.length ? (
                        <div className="fib-shelf">
                          {stats.topThreeItems.map((it) => (
                              <figure key={it.itemName} className="fib-artifact fib-sprite-lift">
                                <Sprite name={it.itemName} size={64} pad={16} />
                                <figcaption>
                                  <b>{f.itemLabel(it.itemName)}</b>
                                  <span className="fib-meta">{f.num(it.count)} found</span>
                                </figcaption>
                              </figure>
                          ))}
                        </div>
                    ) : (
                        <Empty title="No item history yet">
                          Signature items appear once a match has been played — they are the three
                          items this player has collected more than any other.
                        </Empty>
                    )}
                  </div>

                  <div>
                    <h3 className="fib-subhead" style={{ marginTop: 0 }}>
                      Back-to-back pulls by rarity
                    </h3>
                    {pulls > 0 ? (
                        <RarityRamp counts={rarityCounts} keys={RARITY_KEYS} />
                    ) : (
                        <Empty title="No back-to-back pulls yet">
                          Collecting an item immediately after the previous one triggers a
                          back-to-back roll. The rarer the roll, the further up this ramp it lands.
                        </Empty>
                    )}
                    <p className="fib-meta" style={{ marginTop: 'var(--fib-space-4)' }}>
                      Bars are scaled to this player&rsquo;s largest tier, not to the total —
                      common pulls would otherwise flatten every rare one to nothing.
                    </p>
                  </div>
                </div>
              </Section>

              {/* Career used to sit here as a ledger. It moved to `Record` at the
              top of the page — every number it held is in one of the two tiers
              up there now, so keeping it would have printed the whole career
              twice. */}

              {/* ── FORM ─────────────────────────────────────────────────── */}
              <Section
                  title="Form"
                  sub={
                    trend.length > 1
                        ? 'Score in every recent match, oldest on the left.'
                        : 'A trend needs at least two matches.'
                  }
              >
                {trend.length > 1 ? (
                    <>
                      <ScoreTrend points={trend} label={`${name}'s score per match`} />
                      <div className="fib-panel fib-panel--flush" style={{ marginTop: 'var(--fib-space-5)' }}>
                        {recent.map((m) => {
                          const me = m.participants.find((p) => idUuid(p.player) === uuid);
                          const standings = matchStandings(m);
                          return (
                              <button
                                  key={m.matchId}
                                  type="button"
                                  className="fib-row-link"
                                  onClick={() => onOpenMatch?.(m.matchId)}
                              >
                                <Medal place={me.placement} />
                                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                                  <div style={{ fontWeight: 500 }}>
                                    {m.mode === 'SOLO' ? 'Solo' : 'Team'} · {standings.length} competitors
                                  </div>
                                  <div className="fib-meta">
                                    {f.date(m.endedAt)} · {f.duration(matchDuration(m))}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{
                                    fontFamily: 'var(--fib-font-mono)', fontVariantNumeric: 'tabular-nums',
                                    fontSize: 'var(--fib-text-lg)',
                                    color: me.won ? 'var(--fib-gold)' : 'var(--fib-ink)',
                                  }}>
                                    {me.finalScore}
                                  </div>
                                  <div className="fib-meta">{me.won ? 'won' : f.ordinal(me.placement)}</div>
                                </div>
                              </button>
                          );
                        })}
                      </div>
                    </>
                ) : (
                    <Empty title="Not enough matches to plot yet">
                      The form chart draws one point per completed match. It appears as soon as
                      {' '}{name} has finished a second one.
                    </Empty>
                )}
              </Section>

              {/* ── HONOURS ──────────────────────────────────────────────── */}
              <Honours name={name} groups={achGroups} summary={summary} />

              {/* ── IN SHORT ─────────────────────────────────────────────── */}
              <Signature
                  name={name}
                  stats={stats}
                  summary={summary}
                  rank={rank}
                  partners={partners}
                  onOpenPlayer={onOpenPlayer}
              />
            </>
        )}
      </div>
  );
}

/**
 * The record — the six numbers a player opens their own profile to check,
 * directly under the identity and at display weight.
 *
 * These lived here in an earlier version, were folded into the career ledger at
 * the foot of the page, and are back at the top by request. The complaint was
 * fair: the ledger is a lookup layout, and burying "matches won" in row two of
 * a twelve-row table answers "what is this number, exactly" while refusing to
 * answer "is this player any good", which is the question someone actually
 * arrives with.
 *
 * What does NOT come back is the furniture. The earlier version drew these as
 * `StatCard`s — an icon in a tinted box, a label, a value, and a different
 * accent per card (blue, amber, green, cyan, red) — six of them in a grid. That
 * is the identical-card-grid pattern, and it spent five accent colours in a
 * module where gold means rank and diamond means rarity and nothing else means
 * anything. The numbers are the point; the boxes never were. So: divided cells,
 * one accent (gold, on the one figure that counts victories), and the numbers
 * at 48px in a 3x2 grid — three across gives each figure a third of the page
 * rather than a sixth, which is the room the size needs.
 *
 * ── The two tiers ──
 *
 * Six headline figures, then the rest of the career underneath at a third the
 * size. The whole career now lives here, so there is no ledger at the foot of
 * the page any more; this block replaced it rather than duplicating it. The
 * trade is real and worth naming: the ledger drew each number's share of the
 * field's best as a bar, plus that best as a figure. The compact tier cannot
 * carry a bar at this size, so it carries the standing instead.
 *
 * Which is arguably the better half of that bargain. A figure that has a field
 * says where it places in it — "2nd of 8" — a fact the old StatCard's decorative
 * subValue ("back-to-back rares") never carried, counted rather than asserted,
 * the same rule the achievement tiers follow.
 *
 * ── Which figures get one, and why not all of them ──
 *
 * The field comes from the leaderboards, one call per metric, because the
 * alternative (a request per rostered player) rate-limited this backend hard
 * enough to take the origin down with it — see `loadStatField`. Eight of the
 * fourteen figures therefore carry a placing: the six board categories, plus
 * matches played and items per match off the roster. Current win streak carries
 * its own best instead, which says more than a placing would. The remaining five
 * — longest item streak, time per item, total back-to-backs, wheel spins,
 * antimatter trips — have no board and no roster column, so they render bare.
 *
 * That is a real gap and it is deliberately visible rather than papered over: a
 * fabricated denominator would be worse than a missing one. It closes the day a
 * bulk stats endpoint exists; nothing here changes but the field's source.
 */
function Record({ stats, field, streaks }) {
  /*
   * Standing in the field: how many players are strictly ahead on this metric,
   * plus one. Counted, never asserted — and inverted where fewer is better, so
   * fewest deaths reads as 1st.
   *
   * `metric` names a column in the field (see `loadStatField`). A metric with no
   * column returns null and its figure renders bare, which is the honest state
   * for the five stats no leaderboard and no roster row carries. So is a null
   * field: duo scope, or a fetch that failed. Nothing here guesses.
   *
   * The field is already filtered to columns with at least three entrants, where
   * a placing stops being noise dressed as a ranking.
   */
  const standing = (metric, value, sense) => {
    const column = field?.[metric];
    if (!column || !Number.isFinite(value)) return null;
    const ahead = column.filter((v) => (sense === 'low' ? v < value : v > value)).length;
    return `${f.ordinal(ahead + 1)} of ${column.length}`;
  };

  const HEADLINE = [
    {
      label: 'Matches played', value: stats.gamesPlayed,
      note: standing('gamesPlayed', stats.gamesPlayed),
    },
    {
      label: 'Matches won', value: stats.gamesWon, tone: 'gold',
      note: standing('gamesWon', stats.gamesWon),
    },
    {
      /* The one figure with no field to stand in: streak lives on the player
         record, not in the comparable stat payload. Its own best is the
         honest context — "4, and you have had 12" says more than a placing. */
      label: 'Current win streak', value: streaks?.currentWinStreak ?? 0,
      note: Number.isFinite(streaks?.highestWinStreak)
          ? `best ${f.num(streaks.highestWinStreak)}`
          : null,
    },
    {
      label: 'Back-to-back best', value: stats.highestB2BStreak,
      note: standing('highestB2BStreak', stats.highestB2BStreak),
    },
    {
      label: 'Longest item streak', value: stats.longestItemStreak,
      /* No board and no roster column carries this one, so it renders bare. */
      note: standing('longestItemStreak', stats.longestItemStreak),
    },
    {
      label: 'Highest score', value: stats.highestScore, format: f.full,
      note: standing('highestScore', stats.highestScore),
    },
  ];

  const perMatch = f.itemsPerGame(stats.totalItemsFound, stats.gamesPlayed);
  const perItem = f.secondsPerItem(stats.totalTimeSpentOnItems, stats.totalItemsFound);
  const pulls = totalPulls(stats);

  /*
   * Eight, in two rows of four that each mean something: items on the top row,
   * the world on the bottom. It is the same split the career ledger used for
   * its two groups, carried over now that the grid replaced it — a row is a
   * free grouping mechanism and there is no reason to waste it.
   *
   * Total back-to-backs closes the item row deliberately: Collection sits
   * directly below this block and opens with the same number broken down by
   * rarity, so the figure and its breakdown are adjacent rather than a section
   * apart.
   */
  const REST = [
    {
      label: 'Items found', value: stats.totalItemsFound, format: f.full,
      note: standing('totalItemsFound', stats.totalItemsFound),
    },
    {
      label: 'Items per match', value: perMatch, format: (n) => f.dec(n, 1),
      note: standing('itemsPerMatch', perMatch),
    },
    {
      // Time, not a bare second count: `duration` writes m + s past a minute,
      // so a slow item reads "1m 49s" rather than "108.6s". No `unit` — duration
      // carries its own.
      label: 'Time per item', value: perItem, format: f.duration,
      note: standing('secondsPerItem', perItem, 'low'),
    },
    {
      label: 'Total back-to-backs', value: pulls,
      note: standing('totalPulls', pulls),
    },
    {
      label: 'Distance travelled', value: stats.blocksTravelled, format: f.distance,
      unit: 'blocks',
      note: standing('blocksTravelled', stats.blocksTravelled),
    },
    {
      label: 'Deaths', value: stats.deaths,
      note: standing('deaths', stats.deaths, 'low'),
    },
    {
      label: 'Wheel spins', value: stats.wheelOfFortuneUses,
      note: standing('wheelOfFortuneUses', stats.wheelOfFortuneUses),
    },
    {
      label: 'Antimatter trips', value: stats.enteredAntimatterTeleporter,
      note: standing('enteredAntimatterTeleporter', stats.enteredAntimatterTeleporter),
    },
  ];

  return (
      <Reveal as="section" className="fib-record-block" aria-label="The record">
        <div className="fib-record">
          {HEADLINE.map((fig) => (
              <Figure
                  key={fig.label}
                  size="xl"
                  value={fig.value}
                  format={fig.format}
                  label={fig.label}
                  tone={fig.tone}
                  note={fig.note}
              />
          ))}
        </div>

        {/*
        Static, where the headline six count up. Thirteen simultaneous count-ups
        is a slot machine, not an entrance — and the animation is what marks the
        six as the headline. The supporting tier arrives already true.
      */}
        <div className="fib-record-more">
          {REST.map((fig) => (
              <Figure
                  key={fig.label}
                  size="sm"
                  value={fig.value}
                  format={fig.format}
                  unit={fig.unit}
                  label={fig.label}
                  note={fig.note}
                  count={false}
              />
          ))}
        </div>
      </Reveal>
  );
}

/* ── Honours ──────────────────────────────────────────────────────────── */

/*
 * One glyph per achievement kind. Inline and hand-drawn for the same reason the
 * rail's five are (see Chrome.jsx): four outlines cost less than four icon
 * modules, and drawing them here keeps one stroke weight across the set.
 *
 * These identify the *kind* of achievement, which is the only thing the
 * catalogue tells us about it — there is no per-achievement artwork in the
 * plugin's payload, and inventing one would be decoration pretending to be data.
 */
const ACH_ICON = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

const ACH_GLYPH = {
  /* A single round: a stopwatch. */
  ROUND: <svg {...ACH_ICON} aria-hidden="true"><circle cx="12" cy="13" r="7.5" /><path d="M12 9.5V13l2.5 1.5M9.5 3h5" /></svg>,
  /* Lifetime: a trophy. */
  GLOBAL: <svg {...ACH_ICON} aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 5.5H5.5V7a3 3 0 0 0 2.5 3M16 5.5h2.5V7a3 3 0 0 1-2.5 3" /><path d="M12 13v4M9 20h6" /></svg>,
  /* The collection: a stack of crates. */
  COLLECTION: <svg {...ACH_ICON} aria-hidden="true"><rect x="3.5" y="13" width="7" height="7" rx="1" /><rect x="13.5" y="13" width="7" height="7" rx="1" /><rect x="8.5" y="4" width="7" height="7" rx="1" /></svg>,
  /* Meta: achievements about achievements. */
  META: <svg {...ACH_ICON} aria-hidden="true"><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z" /></svg>,
};

const achGlyph = (scope) => ACH_GLYPH[scope] ?? ACH_GLYPH.GLOBAL;

/** The kind filters, in the catalogue's own scope order. `all` is not a scope. */
const ACH_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'ROUND', label: 'In a round' },
  { id: 'GLOBAL', label: 'Lifetime' },
  { id: 'COLLECTION', label: 'Collection' },
  { id: 'META', label: 'Meta' },
];

/**
 * The case and the chase.
 *
 * This section used to be one list: every achievement in the catalogue, grouped
 * by scope, each row a title, a description, and — on the 53 a player did not
 * have — the right-aligned word "Locked". Eighty-six rows of identical furniture,
 * ordered alphabetically, which meant the two questions a player actually brings
 * here both went unanswered. "What have I got" was buried among what they hadn't,
 * and "what am I closest to" required reading every locked row and doing the
 * arithmetic in their head.
 *
 * So: two blocks, different furniture, per DESIGN.md's "The Case and the Chase".
 *
 *   the case   what they hold, as objects — a glyph in a lit well, gold-rimmed
 *              because an earned achievement is a prize, newest first, because a
 *              trophy case is read as "what did I just get"
 *   the chase  what is left, as a progress list, closest first, each row carrying
 *              its own numerator ("412 of 500") and a bar
 *
 * Progress is derived — see ACHIEVEMENT_PROGRESS in achievements.js — and only
 * where a career stat genuinely measures it. The 54 single-round achievements
 * ("Collect 3 items in the final minute") carry no bar, because no lifetime total
 * says how close you are to one. They sort last and say what they need instead of
 * pretending to a percentage.
 *
 * A search box and a kind filter sit above both, because 86 rows without either
 * is a scroll, not an interface.
 */
function Honours({ name, groups, summary }) {
  const [kind, setKind] = useState('all');
  const [query, setQuery] = useState('');

  const { earned, chase } = useMemo(() => splitAchievements(groups), [groups]);

  const q = query.trim().toLowerCase();
  const match = (a) =>
      (kind === 'all' || a.scope === kind)
      && (!q || a.plainTitle.toLowerCase().includes(q) || a.plainDescription.toLowerCase().includes(q));

  const shownEarned = earned.filter(match);
  const shownChase = chase.filter(match);
  const filtered = kind !== 'all' || q !== '';

  /* Only offer a kind the catalogue actually contains — a filter that yields
     nothing on every profile is a control that lies about the data. */
  const filters = ACH_FILTERS.filter(
      (o) => o.id === 'all' || groups.some((g) => g.scope === o.id));

  return (
      <Section
          title="Achievements"
          sub={`${summary.earned} of ${summary.total} earned. The real in-game achievements — what ${name} holds, and what is closest to falling next.`}
          aside={<Search value={query} onChange={setQuery} placeholder="Find an achievement" label="Find an achievement" />}
      >
        {groups.length === 0 ? (
            <Empty title="No achievements yet">
              {name} hasn't unlocked anything yet. Achievements are earned in-game — win a
              match, hit a streak, complete the collection — and appear here the moment they land.
            </Empty>
        ) : (
            <>
              {filters.length > 2 ? (
                  <div className="fib-ach-filters">
                    <Segmented
                        options={filters}
                        value={kind}
                        onChange={setKind}
                        label="Filter achievements by kind"
                    />
                  </div>
              ) : null}

              {/* ── THE CASE ─────────────────────────────────────────────── */}
              <h3 className="fib-subhead">
                Earned
                <span className="fib-meta"> · {f.num(shownEarned.length)}{filtered ? ` of ${f.num(earned.length)}` : ''}</span>
              </h3>
              {shownEarned.length === 0 ? (
                  <Empty title={filtered ? 'Nothing earned matches that' : 'Nothing earned yet'}>
                    {filtered
                        ? 'Clear the search or pick another kind to see the rest of the case.'
                        : `Every achievement ${name} unlocks lands here, newest first.`}
                  </Empty>
              ) : (
                  <ul className="fib-case">
                    {shownEarned.map((a) => (
                        <li key={a.id} className="fib-case-tile">
                          {/* `data-tier` lights the well's rim; the colour itself is
                              set in CSS (emerald — see the case/chase block in
                              styles.js), so the tier name here is only the switch. */}
                          <div className="fib-well fib-case-well" data-tier="earned">
                            {achGlyph(a.scope)}
                          </div>
                          <div className="fib-case-body">
                            <b>{renderMiniMessage(a.title)}</b>
                            <p className="fib-meta">{renderMiniMessage(a.description)}</p>
                            <span className="fib-meta fib-case-when">
                          {a.earnedAt ? f.date(a.earnedAt) : a.scopeLabel}
                              {a.teammates.length > 0 ? ` · with ${a.teammates.map(idLabel).join(', ')}` : ''}
                        </span>
                          </div>
                        </li>
                    ))}
                  </ul>
              )}

              {/* ── THE CHASE ────────────────────────────────────────────── */}
              <h3 className="fib-subhead fib-chase-head">
                Closest to earning
                <span className="fib-meta"> · {f.num(shownChase.length)}{filtered ? ` of ${f.num(chase.length)}` : ''} left</span>
              </h3>
              {shownChase.length === 0 ? (
                  <Empty title={filtered ? 'Nothing left matches that' : 'Everything earned'}>
                    {filtered
                        ? 'Clear the search or pick another kind to see what is still open.'
                        : `${name} holds every achievement in the catalogue. There is nothing left to chase.`}
                  </Empty>
              ) : (
                  <ol className="fib-chase">
                    {shownChase.map((a) => (
                        <li key={a.id} className="fib-chase-row">
                          <div className="fib-chase-body">
                            <b>{renderMiniMessage(a.title)}</b>
                            <p>{renderMiniMessage(a.description)}</p>
                          </div>
                          <div className="fib-chase-track">
                            {a.progress ? (
                                <>
                                  <div
                                      className="fib-ramp-track"
                                      style={{ height: 6, color: 'var(--fib-blue)' }}
                                      role="img"
                                      aria-label={`${a.plainTitle}: ${f.num(a.progress.current)} of ${f.num(a.progress.target)}`}
                                  >
                                    <i style={{ '--fill': a.progress.ratio }} />
                                  </div>
                                  <span className="fib-chase-count">
                                {f.num(a.progress.current)} of {f.num(Math.round(a.progress.target))}
                              </span>
                                </>
                            ) : (
                                /* No career total measures a single-round feat, so this row states
                                   its kind instead of faking a percentage. */
                                <span className="fib-meta fib-chase-unmeasured">{a.scopeLabel}</span>
                            )}
                          </div>
                        </li>
                    ))}
                  </ol>
              )}
            </>
        )}
      </Section>
  );
}

/**
 * The closing statement: the whole record compressed to the handful of facts a
 * player would actually quote about themselves. Deliberately the only place in
 * the module set at display scale in prose form rather than as a stat block —
 * it is the sentence, not the spreadsheet.
 */
function Signature({ name, stats, summary, rank, partners, onOpenPlayer }) {
  const best = partners?.length
      ? partners.reduce((a, b) =>
          f.winRate(b.team.gamesWon, b.team.gamesPlayed) > f.winRate(a.team.gamesWon, a.team.gamesPlayed) ? b : a)
      : null;

  return (
      <Section title="In short">
        <div className="fib-signature">
          <p className="fib-signature-line">
            {/* Each figure reserves its settled width in `ch` before it counts up.
                The numbers are monospace, so a character count is an exact width —
                without this the count-up grows from one digit to three and shoves
                the words after it sideways, the one place the module's tabular
                digits don't cover (a block figure has no in-line neighbour to
                push; a sentence does). */}
            <strong>{name}</strong> has played{' '}
            <b style={{ minWidth: `${f.full(stats.gamesPlayed).length}ch` }}>
              <Counter value={stats.gamesPlayed} format={f.full} />
            </b> matches, won{' '}
            <b style={{ minWidth: `${f.full(stats.gamesWon).length}ch` }}>
              <Counter value={stats.gamesWon} format={f.full} />
            </b>, and pulled{' '}
            <b style={{ minWidth: `${f.full(stats.totalItemsFound).length}ch` }}>
              <Counter value={stats.totalItemsFound} format={f.full} />
            </b> items out of the world.
            {summary.total > 0 ? (
                <> They've earned <em>{summary.earned}</em> of {summary.total} achievements.</>
            ) : null}
          </p>

          <dl className="fib-signature-grid">
            <div>
              <dt className="fib-figure-label">Global rank</dt>
              <dd>{rank?.rank != null
                  ? <Figure size="md" value={rank.rank} tone="gold" count={false} format={(n) => `#${n}`} />
                  : <span className="fib-meta">Unranked</span>}</dd>
            </div>
            <div>
              <dt className="fib-figure-label">Signature item</dt>
              <dd style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                {stats.topThreeItems?.[0] ? (
                    <>
                      <Sprite name={stats.topThreeItems[0].itemName} size={32} pad={8} />
                      <span>{f.itemLabel(stats.topThreeItems[0].itemName)}</span>
                    </>
                ) : <span className="fib-meta">none yet</span>}
              </dd>
            </div>
            <div>
              <dt className="fib-figure-label">Time spent on items</dt>
              <dd><Figure size="md" value={stats.totalTimeSpentOnItems} format={f.hours} count={false} /></dd>
            </div>
            {best ? (
                <div>
                  <dt className="fib-figure-label">Strongest duo</dt>
                  <dd style={{ marginTop: 4 }}>
                    {/* `name` is the partner identity's real name, resolved in
                        the model above — without it PlayerLink falls back to the
                        short uuid, which read as a bug whenever a name exists. */}
                    <PlayerLink uuid={best.uuid} name={best.name} onOpen={onOpenPlayer} size={28} />
                    <span className="fib-meta">
                  {f.pct(f.winRate(best.team.gamesWon, best.team.gamesPlayed))} across{' '}
                      {best.team.gamesPlayed} matches
                </span>
                  </dd>
                </div>
            ) : null}
          </dl>
        </div>
      </Section>
  );
}
