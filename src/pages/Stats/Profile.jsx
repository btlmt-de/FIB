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
import {
  MOCK_PLAYERS, playerName, mockSoloStats, mockCombinedTeamStats,
  mockSoloRank, loadPlayer, LEADERBOARD_SCOPES, matchStandings,
} from './adapter.js';
import { RARITY_KEYS, rarityColor } from './tokens.js';
import { unifyStats, achievementsFor, achievementSummary, totalPulls } from './achievements.js';
import { canObserve } from './env.js';
import {
  Section, Figure, Avatar, Sprite, Medal, Segmented, Search, Empty, Chip,
  RarityRamp, RarityTag, PlayerLink, Reveal, Counter,
} from './Primitives.jsx';
import { ScoreTrend, Sparkline } from './Charts.jsx';
import * as f from './format.js';

/* ── Derivation ───────────────────────────────────────────────────────── */

/** The scope-appropriate raw payload for one player. */
function statsForScope(uuid, scope, partnerIndex = 0) {
  if (scope === 'combined') return { payload: mockCombinedTeamStats(uuid), partners: null };
  if (scope === 'duo') {
    const player = loadPlayer(uuid);
    const partner = player.partners[partnerIndex] ?? player.partners[0];
    return { payload: partner?.team ?? null, partners: player.partners, partner };
  }
  return { payload: mockSoloStats(uuid), partners: null };
}

/**
 * The comparison field a player's numbers are measured against.
 *
 * In solo and combined scope that's every other player. In duo scope it is the
 * player's OWN partnerships — comparing one specific pair against unrelated
 * pairs answers nothing, whereas "which of my duos is my best duo" is the
 * question a duo player actually has.
 */
function fieldFor(uuid, scope, partners) {
  if (scope === 'duo') {
    return {
      label: 'your duos',
      stats: (partners ?? []).map((p) => unifyStats(p.team, 'duo')),
    };
  }
  return {
    label: 'all ranked players',
    stats: MOCK_PLAYERS.map((p) =>
      unifyStats(scope === 'combined' ? mockCombinedTeamStats(p.uuid) : mockSoloStats(p.uuid), scope),
    ),
  };
}

/* ── Players index ────────────────────────────────────────────────────── */

const PLAYER_SORTS = [
  { id: 'rank', label: 'Rank' },
  { id: 'wins', label: 'Wins' },
  { id: 'winRate', label: 'Win rate' },
  { id: 'items', label: 'Items found' },
];

/**
 * Finding a player is the entry point to everything else, so this view is a
 * search box and a sortable ranked list — not a grid of identical profile
 * cards, which would make eight players look like a product catalogue. Each
 * row carries the player's recent form as a sparkline: a record is what they
 * did, form is what they are doing.
 */
export function Players({ onOpenPlayer, scope, matches }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('rank');

  const rows = useMemo(() => {
    const list = MOCK_PLAYERS.map((p) => {
      const stats = unifyStats(
        scope === 'combined' ? mockCombinedTeamStats(p.uuid) : mockSoloStats(p.uuid),
        scope === 'duo' ? 'solo' : scope,
      );

      // Recent form: scores in this player's last matches, oldest to newest.
      const form = (matches ?? [])
        .filter((m) => m.participants.some((x) => x.playerUuid === p.uuid))
        .slice(0, 10)
        .reverse()
        .map((m) => m.participants.find((x) => x.playerUuid === p.uuid).finalScore);

      return {
        ...p,
        stats,
        form,
        winRate: f.winRate(stats.gamesWon, stats.gamesPlayed),
        rank: mockSoloRank(p.uuid),
      };
    });
    const q = query.trim().toLowerCase();
    const filtered = q ? list.filter((p) => p.name.toLowerCase().includes(q)) : list;

    const by = {
      rank: (a, b) => a.rank - b.rank,
      wins: (a, b) => b.stats.gamesWon - a.stats.gamesWon,
      winRate: (a, b) => b.winRate - a.winRate,
      items: (a, b) => b.stats.totalItemsFound - a.stats.totalItemsFound,
    }[sort];
    return filtered.sort(by);
  }, [query, scope, sort, matches]);

  const maxItems = Math.max(1, ...rows.map((r) => r.stats.totalItemsFound));

  return (
    <div className="fib-page">
      <Section
        title="Players"
        sub={`${MOCK_PLAYERS.length} ranked players. Open a record to see the whole history.`}
        aside={
          <div style={{ display: 'flex', gap: 'var(--fib-space-3)', flexWrap: 'wrap' }}>
            <Search value={query} onChange={setQuery} placeholder="Find a player" label="Find a player" />
          </div>
        }
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 'var(--fib-space-5)' }}>
          {PLAYER_SORTS.map((s) => (
            <Chip key={s.id} active={s.id === sort} onClick={() => setSort(s.id)}>
              {s.label}
            </Chip>
          ))}
        </div>

        {rows.length === 0 ? (
          <Empty title={`Nobody matches “${query.trim()}”`}>
            Player names are exact Minecraft usernames. Check the spelling, or clear the
            search to see everyone who has played a ranked match.
          </Empty>
        ) : (
          <div className="fib-panel fib-panel--flush">
            {rows.map((p) => (
              <button
                key={p.uuid}
                type="button"
                className="fib-row-link"
                onClick={() => onOpenPlayer(p.uuid)}
              >
                <Medal place={p.rank} />
                <Avatar uuid={p.uuid} size={36} />
                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <div style={{ fontWeight: 600, letterSpacing: '-0.01em' }}>{p.name}</div>
                  <div className="fib-meta">
                    {f.num(p.stats.gamesPlayed)} matches · {f.pct(p.winRate)} won
                  </div>
                </div>
                <div style={{ width: 96, flex: 'none' }} className="fib-hide-sm" aria-hidden="true">
                  <Sparkline values={p.form} width={96} height={26} tone="var(--fib-ink-3)" />
                </div>
                <div style={{ width: 128, flex: 'none' }} className="fib-hide-sm">
                  <div className="fib-ramp-track" style={{ height: 6, color: 'var(--fib-diamond)' }}>
                    <i style={{ '--fill': p.stats.totalItemsFound / maxItems }} />
                  </div>
                  <div className="fib-meta" style={{ marginTop: 5 }}>
                    {f.num(p.stats.totalItemsFound)} items
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ── The record ───────────────────────────────────────────────────────── */

export function PlayerProfile({ uuid, scope, onScopeChange, matches, onBack, onOpenPlayer, onOpenMatch }) {
  const [partnerIndex, setPartnerIndex] = useState(0);
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
    if (!uuid) return null;

    const meta = loadPlayer(uuid);
    const { payload, partners } = statsForScope(uuid, scope, partnerIndex);
    const stats = unifyStats(payload, scope);
    const field = fieldFor(uuid, scope, partners ?? meta.partners);

    const mine = (matches ?? []).filter((m) =>
      m.participants.some((p) => p.playerUuid === uuid),
    );

    // Oldest first: a trend that runs backwards is not a trend.
    const trend = mine
      .slice()
      .sort((a, b) => new Date(a.endedAt) - new Date(b.endedAt))
      .slice(-14)
      .map((m) => {
        const me = m.participants.find((p) => p.playerUuid === uuid);
        return {
          value: me.finalScore,
          won: me.won,
          label: f.date(m.endedAt),
          matchId: m.matchId,
        };
      });

    const rows = achievementsFor(stats, field.stats);

    return {
      meta, stats, field, trend, rows,
      partners: meta.partners,
      summary: achievementSummary(rows),
      rank: meta.rank,
      recent: mine.slice(0, 5),
    };
  }, [uuid, scope, partnerIndex, matches]);

  if (!model) {
    return (
      <div className="fib-page">
        <Empty title="No player selected" action={<button type="button" className="fib-btn" onClick={onBack}>Back to players</button>}>
          Pick a player from the list to open their record.
        </Empty>
      </div>
    );
  }

  const { meta, stats, field, trend, rows, summary, rank, partners, recent } = model;
  const name = playerName(uuid);
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

  /* What you have, then what is in reach — two questions, two furnitures. */
  const earned = rows.filter((r) => r.unlocked);
  const inReach = rows.filter((r) => !r.unlocked);

  return (
    <div className="fib-page">
      <div className="fib-playerbar" data-on={barOn || undefined} aria-hidden="true">
        <Avatar uuid={uuid} size={26} />
        <b>{name}</b>
        <Medal place={rank} />
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
                <div className="fib-hero-rank">
                  <Medal place={rank} />
                  <span>
                    Rank {rank} of {MOCK_PLAYERS.length}
                    <em> · by matches won, solo</em>
                  </span>
                </div>
                <div className="fib-meta" style={{ marginTop: 10 }}>
                  {summary.unlocked} of {summary.total} achievements
                  {summary.rarest ? ` · rarest: ${summary.rarest.name}` : ''}
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
                  options={partners.map((p, i) => ({ id: String(i), label: playerName(p.uuid) }))}
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
          <Record stats={stats} field={field} meta={meta} />

          {/* ── COLLECTION ───────────────────────────────────────────── */}
          <Section
            title="Collection"
            sub={`${f.num(stats.totalItemsFound)} items found, ${f.num(pulls)} of them back-to-back pulls.`}
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
                    const me = m.participants.find((p) => p.playerUuid === uuid);
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
                            {f.date(m.endedAt)} · {f.duration(m.durationSeconds)}
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
          <Section
            title="Honours"
            sub={`${summary.unlocked} of ${summary.total} earned. Tiers are measured, not declared — an achievement is only Legendary if few of these ${field.stats.length} ${scope === 'duo' ? 'partnerships' : 'players'} hold it, and the raw count is shown so you can judge the sample yourself.`}
          >
            {earned.length > 0 ? (
              <div className="fib-case">
                {earned.map((a) => (
                  <figure
                    key={a.id}
                    className="fib-artifact fib-trophy fib-sprite-lift"
                    style={{ color: rarityColor(a.tier) }}
                  >
                    <Sprite name={a.icon} size={64} pad={16} tier={a.tier} title={a.name} />
                    <figcaption>
                      <b>{a.name}</b>
                      <span className="fib-meta">{a.description}</span>
                      <span className="fib-trophy-held">
                        <RarityTag tier={a.tier} />
                        <span className="fib-meta">held by {a.heldBy} of {a.population}</span>
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <Empty title="Nothing earned yet">
                Achievements here are thresholds over the real record — win a match, hit a
                streak, travel far enough — and every one of them shows its own progress
                below. The first unlock lands the moment a threshold is crossed.
              </Empty>
            )}

            {inReach.length > 0 ? (
              <>
                <h3 className="fib-subhead">Within reach, closest first</h3>
                <div className="fib-ach">
                  {inReach.map((a) => (
                    <div
                      key={a.id}
                      className="fib-ach-row"
                      data-locked="true"
                      style={{ color: rarityColor(a.tier) }}
                    >
                      <Sprite name={a.icon} size={32} pad={10} title={a.name} />

                      <div className="fib-ach-body">
                        <b>{a.name}</b>
                        <p>{a.description}</p>
                      </div>

                      <div className="fib-ach-side">
                        <RarityTag tier={a.tier} />
                        <span className="fib-meta">
                          {a.sense === 'low'
                            ? `${f.num(a.value)} / under ${f.num(a.goal)}`
                            : `${f.num(a.value)} / ${f.num(a.goal)}`}
                        </span>
                        <div
                          className="fib-ach-progress"
                          role="img"
                          aria-label={`${Math.round(a.progress * 100)}% of the way to ${a.name}`}
                        >
                          <i style={{ '--fill': a.progress }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </Section>

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
 * Which is arguably the better half of that bargain. Every figure in both tiers
 * says where it places in the field — "2nd of 8" — a fact the old StatCard's
 * decorative subValue ("back-to-back rares") never carried, counted rather than
 * asserted, the same rule the achievement tiers follow. Suppressed below three
 * entries in the field, where a placing is noise dressed as a ranking.
 */
function Record({ stats, field, meta }) {
  const population = field.stats.length;

  /* Standing in the field: how many are strictly ahead, plus one. Ties share a
     place, which is what a ranking means. `sense: low` inverts "ahead" — on
     deaths and seconds per item, fewer is better. */
  const standing = (pick, value, sense) => {
    if (population < 3 || !Number.isFinite(value)) return null;
    const ahead = field.stats.filter((s) => {
      const v = pick(s);
      if (!Number.isFinite(v)) return false;
      return sense === 'low' ? v < value : v > value;
    }).length;
    return `${f.ordinal(ahead + 1)} of ${population}`;
  };

  const HEADLINE = [
    {
      label: 'Matches played', value: stats.gamesPlayed,
      note: standing((s) => s.gamesPlayed, stats.gamesPlayed),
    },
    {
      label: 'Matches won', value: stats.gamesWon, tone: 'gold',
      note: standing((s) => s.gamesWon, stats.gamesWon),
    },
    {
      /* The one figure with no field to stand in: streak lives on the player
         record, not in the comparable stat payload. Its own best is the
         honest context — "4, and you have had 12" says more than a placing. */
      label: 'Current win streak', value: meta.meta.currentWinStreak,
      note: Number.isFinite(meta.meta.highestWinStreak)
        ? `best ${f.num(meta.meta.highestWinStreak)}`
        : null,
    },
    {
      label: 'Back-to-back best', value: stats.highestB2BStreak,
      note: standing((s) => s.highestB2BStreak, stats.highestB2BStreak),
    },
    {
      label: 'Longest item streak', value: stats.longestItemStreak,
      note: standing((s) => s.longestItemStreak, stats.longestItemStreak),
    },
    {
      label: 'Highest score', value: stats.highestScore, format: f.full,
      note: standing((s) => s.highestScore, stats.highestScore),
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
      note: standing((s) => s.totalItemsFound, stats.totalItemsFound),
    },
    {
      label: 'Items per match', value: perMatch, format: (n) => f.dec(n, 1),
      note: standing((s) => f.itemsPerGame(s.totalItemsFound, s.gamesPlayed), perMatch),
    },
    {
      label: 'Seconds per item', value: perItem, format: (n) => f.dec(n, 1), unit: 's',
      note: standing(
        (s) => f.secondsPerItem(s.totalTimeSpentOnItems, s.totalItemsFound),
        perItem,
        'low',
      ),
    },
    {
      label: 'Total back-to-backs', value: pulls,
      note: standing(totalPulls, pulls),
    },
    {
      label: 'Distance travelled', value: stats.blocksTravelled, format: f.distance,
      unit: 'blocks',
      note: standing((s) => s.blocksTravelled, stats.blocksTravelled),
    },
    {
      label: 'Deaths', value: stats.deaths,
      note: standing((s) => s.deaths, stats.deaths, 'low'),
    },
    {
      label: 'Wheel spins', value: stats.wheelOfFortuneUses,
      note: standing((s) => s.wheelOfFortuneUses, stats.wheelOfFortuneUses),
    },
    {
      label: 'Antimatter trips', value: stats.enteredAntimatterTeleporter,
      note: standing((s) => s.enteredAntimatterTeleporter, stats.enteredAntimatterTeleporter),
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
          <strong>{name}</strong> has played{' '}
          <b><Counter value={stats.gamesPlayed} format={f.full} /></b> matches, won{' '}
          <b><Counter value={stats.gamesWon} format={f.full} /></b>, and pulled{' '}
          <b><Counter value={stats.totalItemsFound} format={f.full} /></b> items out of the world.
          {summary.rarest ? (
            <> Their rarest achievement is <em>{summary.rarest.name}</em>, held by{' '}
              {summary.rarest.heldBy} of {summary.rarest.population} players.</>
          ) : null}
        </p>

        <dl className="fib-signature-grid">
          <div>
            <dt className="fib-figure-label">Global rank</dt>
            <dd><Figure size="md" value={rank} tone="gold" count={false} format={(n) => `#${n}`} /></dd>
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
                <PlayerLink uuid={best.uuid} onOpen={onOpenPlayer} size={28} />
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
