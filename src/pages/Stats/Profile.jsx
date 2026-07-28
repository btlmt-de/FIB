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
import { unifyStats, totalPulls, achievementGroups, achievementSummary } from './achievements.js';
import { loadRoster, loadPlayer, loadPlayerMatches, loadCatalogue, loadPlayerAchievements } from './api.js';
import { idUuid, idName, idLabel, matchDuration } from './adapter.js';
import { useAsync } from './useAsync.js';
import { canObserve } from './env.js';
import {
  Section, Figure, Avatar, Sprite, Medal, Segmented, Search, Empty, Chip,
  RarityRamp, PlayerLink, Reveal, Counter, AsyncView,
} from './Primitives.jsx';
import { ScoreTrend } from './Charts.jsx';
import * as f from './format.js';
import { renderMiniMessage } from './MiniMessage.jsx';

/* ── Derivation ───────────────────────────────────────────────────────── */

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
/* The sort chips map to the roster endpoint's own `sort`, so ordering is the server's job now, not
 * a client re-sort of a loaded page. 'rank' is the default games_won ordering. */
const ROSTER_SORT = { rank: 'games_won', wins: 'games_won', winRate: 'win_rate', items: 'total_items_found' };

export function Players({ onOpenPlayer }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('rank');

  // Debounce-free for now: each keystroke re-fetches, which the backend rate-limits and caches.
  // A real debounce belongs here later; it is a refinement, not a correctness fix.
  const state = useAsync(
      () => loadRoster({ query: query.trim() || undefined, sort: ROSTER_SORT[sort] }),
      [query, sort],
  );

  return (
      <AsyncView state={state} loadingLabel="Loading players…">
        {(page) => (
            <PlayersBody
                rows={page?.players ?? []}
                total={page?.totalCount ?? 0}
                query={query} onQuery={setQuery}
                sort={sort} onSort={setSort}
                onOpenPlayer={onOpenPlayer}
            />
        )}
      </AsyncView>
  );
}

function PlayersBody({ rows, total, query, onQuery, sort, onSort, onOpenPlayer }) {
  const maxItems = Math.max(1, ...rows.map((r) => r.totalItemsFound));

  return (
      <div className="fib-page">
        <Section
            title="Players"
            sub={`${total} ranked players. Open a record to see the whole history.`}
            aside={
              <div style={{ display: 'flex', gap: 'var(--fib-space-3)', flexWrap: 'wrap' }}>
                <Search value={query} onChange={onQuery} placeholder="Find a player" label="Find a player" />
              </div>
            }
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 'var(--fib-space-5)' }}>
            {PLAYER_SORTS.map((s) => (
                <Chip key={s.id} active={s.id === sort} onClick={() => onSort(s.id)}>
                  {s.label}
                </Chip>
            ))}
          </div>

          {rows.length === 0 ? (
              <Empty title={query.trim() ? `Nobody matches “${query.trim()}”` : 'No ranked players yet'}>
                Player names are exact Minecraft usernames. Check the spelling, or clear the
                search to see everyone who has played a ranked match.
              </Empty>
          ) : (
              <div className="fib-panel fib-panel--flush">
                {rows.map((p, i) => {
                  // The roster entry's identity: nested {playerUuid, playerName} like every other
                  // endpoint, OR the raw {uuid, name} if the public API's roster mapper passed FIBService's
                  // shape through without normalizing. Tolerate both so a mapper mismatch degrades to
                  // "works" rather than a crash; the backend fix (emit the identity DTO like the rest) can
                  // follow without breaking this.
                  const uuid = idUuid(p.player);
                  const name = idLabel(p.player);
                  const winRate = f.winRate(p.gamesWon, p.gamesPlayed);
                  return (
                      <button
                          key={uuid}
                          type="button"
                          className="fib-row-link"
                          onClick={() => onOpenPlayer(uuid)}
                      >
                        {/* Line number within the page, not a rank — the roster does not return one,
                      because a page position is not a rank once players tie. */}
                        <Medal place={i + 1} />
                        <Avatar uuid={uuid} size={36} />
                        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                          <div style={{ fontWeight: 600, letterSpacing: '-0.01em' }}>{name}</div>
                          <div className="fib-meta">
                            {f.num(p.gamesPlayed)} matches · {f.pct(winRate)} won
                          </div>
                        </div>
                        {/* The recent-form sparkline is gone: the roster row carries no per-match history,
                      and fetching each player's last ten matches would be the exact N+1 the roster
                      endpoint exists to remove. */}
                        <div style={{ width: 128, flex: 'none' }} className="fib-hide-sm">
                          <div className="fib-ramp-track" style={{ height: 6, color: 'var(--fib-diamond)' }}>
                            <i style={{ '--fill': p.totalItemsFound / maxItems }} />
                          </div>
                          <div className="fib-meta" style={{ marginTop: 5 }}>
                            {f.num(p.totalItemsFound)} items
                          </div>
                        </div>
                      </button>
                  );
                })}
              </div>
          )}
        </Section>
      </div>
  );
}

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
                partnerIndex={partnerIndex} setPartnerIndex={setPartnerIndex}
            />
        )}
      </AsyncView>
  );
}

function PlayerProfileBody({
                             uuid, scope, onScopeChange, onBack, onOpenPlayer, onOpenMatch, onOpenCollection,
                             payload, history, catalogue, achievements, partnerIndex, setPartnerIndex,
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

    const achGroups = achievementGroups(catalogue, achievements);

    return {
      profile, stats, trend, partners,
      // No per-stat placement notes: the profile shows one real global rank in the hero (from the
      // rank endpoint) and that is the whole rank story. Record renders every figure without an
      // "Nth of M" note when field is null — a deliberate design choice, not a missing endpoint.
      field: null,
      summary: achievementSummary(catalogue, achievements),
      rank: payload.rank ?? null,
      achGroups,
      recent: mine.slice(0, 5),
    };
  }, [payload, history, catalogue, achievements, scope, partnerIndex, uuid]);

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
              <Section
                  title="Achievements"
                  sub={`${summary.earned} of ${summary.total} earned. The real in-game achievements — when each was unlocked, and who it was earned with.`}
              >
                {achGroups.length === 0 ? (
                    <Empty title="No achievements yet">
                      {name} hasn't unlocked anything yet. Achievements are earned in-game — win a
                      match, hit a streak, complete the collection — and appear here the moment they land.
                    </Empty>
                ) : (
                    achGroups.map((group) => (
                        <div key={group.scope} className="fib-ach-group">
                          <h3 className="fib-subhead">{group.label}</h3>
                          <div className="fib-ach">
                            {group.achievements.map((a) => (
                                <div
                                    key={a.id}
                                    className="fib-ach-row"
                                    data-locked={a.unlocked ? undefined : 'true'}
                                >
                                  <div className="fib-ach-body">
                                    {/* Titles carry MiniMessage colour; render, don't print raw. */}
                                    <b>{renderMiniMessage(a.title)}</b>
                                    <p>{renderMiniMessage(a.description)}</p>
                                    {a.unlocked && a.teammates.length > 0 ? (
                                        <span className="fib-meta">
                              with {a.teammates.map(idLabel).join(', ')}
                            </span>
                                    ) : null}
                                  </div>

                                  <div className="fib-ach-side">
                                    {a.unlocked ? (
                                        <>
                                          <span className="fib-ach-check" aria-label="Unlocked">✔</span>
                                          <span className="fib-meta">{f.date(a.earnedAt)}</span>
                                          {/* Rarity line renders only if a count endpoint ever fills these. */}
                                          {a.heldBy != null && a.population != null ? (
                                              <span className="fib-meta">held by {a.heldBy} of {a.population}</span>
                                          ) : null}
                                        </>
                                    ) : (
                                        <span className="fib-meta">Locked</span>
                                    )}
                                  </div>
                                </div>
                            ))}
                          </div>
                        </div>
                    ))
                )}
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
function Record({ stats, field, streaks }) {
  /* Standing in the field: how many are strictly ahead, plus one. Only rendered when a field
     payload is supplied — today it never is (the profile shows one global rank in the hero
     instead), so every note below is null and the figures stand alone. Kept intact so a future
     all-players comparison can light them up by passing a field; not currently wired. */
  const standing = (pick, value, sense) => {
    if (!field || field.stats.length < 3 || !Number.isFinite(value)) return null;
    const ahead = field.stats.filter((s) => {
      const v = pick(s);
      if (!Number.isFinite(v)) return false;
      return sense === 'low' ? v < value : v > value;
    }).length;
    return `${f.ordinal(ahead + 1)} of ${field.stats.length}`;
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
      label: 'Current win streak', value: streaks?.currentWinStreak ?? 0,
      note: Number.isFinite(streaks?.highestWinStreak)
          ? `best ${f.num(streaks.highestWinStreak)}`
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
      // Time, not a bare second count: `duration` writes m + s past a minute,
      // so a slow item reads "1m 49s" rather than "108.6s". No `unit` — duration
      // carries its own.
      label: 'Time per item', value: perItem, format: f.duration,
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
