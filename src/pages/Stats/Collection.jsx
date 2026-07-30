/**
 * FIB Stats — the collection book.
 *
 * The whole item collection for one player — every item they have ever found,
 * opened from the profile's Collection section and routable on its own
 * (`?view=collection&uuid=…`) — a collection is a link you can send someone.
 *
 * ── Rarity is counted, never declared ──
 *
 * The one committed idea. Every item carries `playerCount` — how many players
 * hold it — against `totalPlayers`, so an item's rarity in a collection is a
 * measured "held by 2 of 8", never a designer's guess and never a bare
 * percentage. Scarcity earns diamond — the module's one "rarity" colour —
 * only when the pool is large enough for a minority to mean something.
 *
 * ── The holdings, and only the holdings ──
 *
 * A collection shows what the player HAS. Every held item gets a full
 * artifact card: sprite in its lit well, name, times found, first found,
 * held-by — sorted by the questions a player asks of their own prizes
 * (rarest, most collected, recently found), with search cutting across.
 *
 * The gaps — everything in the pool the player has NOT found — were tried
 * three ways (a dense sprite wall, an A–Z index, a phase filing) and cut:
 * they cost a vendored pool, a second fetch and half the view's code, and
 * were the part nobody wanted to read. Completion context survives without
 * them: the hero gauge and the census line carry "162 of 1,317 found", both
 * from the service's own figures. The vendored pool stays in the repo only
 * because vendor-textures uses it as the sprite reachability set.
 */

import React, { useMemo, useState } from 'react';
import { loadCollection } from './api.js';
import { useAsync } from './useAsync.js';
import { idName, itemPhase } from './adapter.js';
import {
  Section, Sprite, Chip, Search, Empty, Figure, Avatar, AsyncView,
} from './Primitives.jsx';
import * as f from './format.js';

/*
 * Scarcity is only allowed to read as scarcity when the pool is big enough for
 * a minority to be meaningful. Below four holders "held by 1 of 3" is a
 * small-sample coincidence; the same suppression the record uses on standings
 * below three entries. The share threshold is a third — held by a third of the
 * server or fewer is a genuinely uncommon thing to own.
 */
const SCARCE_MIN_POOL = 4;
const SCARCE_SHARE = 0.34;

/* Match-phase tag labels + text colours — the same green/yellow/red the item
   index uses. LATE takes the lighter text-safe red (phase-late-ink): the fill red
   is too dark to clear 4.5:1 as small text, the same split the item cards use. */
const PHASE_TAG = {
  EARLY: { label: 'Early', ink: 'var(--fib-phase-early)' },
  MID: { label: 'Mid', ink: 'var(--fib-phase-mid)' },
  LATE: { label: 'Late', ink: 'var(--fib-phase-late-ink)' },
};

const isScarce = (playerCount, totalPlayers) =>
  Number.isFinite(playerCount) && totalPlayers >= SCARCE_MIN_POOL
    && playerCount / totalPlayers <= SCARCE_SHARE;

/* Unknown holder counts sort below every measured one — an unmeasured holding
   must never outrank a measured prize. */
const byScarcity = (a, b) => {
  const ap = Number.isFinite(a.playerCount) ? a.playerCount : Infinity;
  const bp = Number.isFinite(b.playerCount) ? b.playerCount : Infinity;
  return ap - bp;
};

/*
 * The questions a player asks of their own holdings. Rarest is the default —
 * the prize is what you open a collection to see. Each is a total ordering,
 * so ties never reshuffle between renders.
 */
const SORTS = [
  {
    id: 'rarest', label: 'Rarest', hint: 'Held by the fewest other players',
    cmp: (a, b) => byScarcity(a, b) || (b.timesCollected - a.timesCollected)
      || a.itemName.localeCompare(b.itemName),
  },
  {
    id: 'most', label: 'Most collected', hint: 'Found the most times',
    cmp: (a, b) => (b.timesCollected - a.timesCollected) || byScarcity(a, b)
      || a.itemName.localeCompare(b.itemName),
  },
  {
    id: 'recent', label: 'Recently found', hint: 'Most recently added to the collection',
    cmp: (a, b) => (b.firstAt - a.firstAt) || a.itemName.localeCompare(b.itemName),
  },
];

/** "Held by N of M", diamond when the holding is genuinely scarce. */
function Held({ playerCount, totalPlayers, className = '' }) {
  if (!(totalPlayers > 0) || !Number.isFinite(playerCount)) return null;
  return (
    <span
      className={`fib-held ${className}`.trim()}
      data-scarce={isScarce(playerCount, totalPlayers) || undefined}
    >
      held by {f.num(playerCount)} of {f.num(totalPlayers)}
    </span>
  );
}

/*
 * One holding: the artifact card. Sprite in its lit well (diamond rim when
 * scarce), then the whole record in text — name, the find count at figure
 * weight, held-by, first found. Nothing needs a hover.
 */
function HoldingCard({ item, totalPlayers }) {
  const scarce = isScarce(item.playerCount, totalPlayers);
  const phase = itemPhase(item.itemName);
  const tag = phase ? PHASE_TAG[phase] : null;
  return (
    <figure className="fib-artifact fib-sprite-lift">
      <Sprite
        name={item.itemName}
        size={64}
        pad={20}
        phase={phase}
        className={scarce ? 'fib-well--scarce' : ''}
      />
      <figcaption>
        <b>{f.itemLabel(item.itemName)}</b>
        {tag ? (
          <span style={{
            color: tag.ink, fontWeight: 700,
            fontSize: 'var(--fib-text-2xs)', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>{tag.label}</span>
        ) : null}
        <Figure size="sm" value={item.timesCollected} format={f.num} unit="found" count={false} />
        <Held playerCount={item.playerCount} totalPlayers={totalPlayers} />
        {item.firstCollected ? (
          <span className="fib-meta">first {f.date(item.firstCollected)}</span>
        ) : null}
      </figcaption>
    </figure>
  );
}

export function Collection({ uuid, onBack }) {
  const state = useAsync(() => loadCollection(uuid), [uuid]);

  return (
    <AsyncView
      state={state}
      loadingLabel="Loading collection…"
      notFound={
        <div className="fib-page">
          <Empty
            title="No collection yet"
            action={<button type="button" className="fib-btn" onClick={onBack}>Back to profile</button>}
          >
            No item collection has been recorded for this player. They may not have
            finished a match yet — every item is logged the moment it is found.
          </Empty>
        </div>
      }
    >
      {(payload) => <CollectionBody uuid={uuid} payload={payload} onBack={onBack} />}
    </AsyncView>
  );
}

function CollectionBody({ uuid, payload, onBack }) {
  const [sort, setSort] = useState('rarest');
  const [query, setQuery] = useState('');

  const data = payload ?? {};
  const name = idName(data.player) ?? uuid.slice(0, 8);
  const totalPlayers = data.totalPlayers ?? 0;
  const poolSize = data.totalItems ?? 0;

  /*
   * The holdings, straight from the collection payload. `firstAt` precomputes
   * the timestamp so the recent sort never re-parses; playerCount passes
   * through unmeasured (null) when the service does not carry it.
   */
  const holdings = useMemo(
    () => (payload?.items ?? []).map((c) => ({
      itemName: c.itemName,
      timesCollected: c.timesCollected ?? 0,
      firstCollected: c.firstCollected ?? null,
      firstAt: c.firstCollected ? new Date(c.firstCollected).getTime() || 0 : 0,
      playerCount: Number.isFinite(c.playerCount) ? c.playerCount : null,
    })),
    [payload],
  );

  const distinct = data.distinctItems ?? holdings.length;
  const completion = poolSize > 0 ? distinct / poolSize : null;

  const totalFinds = useMemo(
    () => holdings.reduce((sum, it) => sum + it.timesCollected, 0),
    [holdings],
  );

  /* The single scarcest holding, for the header line — fewest holders, ties
     toward the one found most. Only meaningful, and only shown, once the pool
     is big enough for scarcity to mean anything. */
  const scarcest = useMemo(() => {
    if (totalPlayers < SCARCE_MIN_POOL) return null;
    return holdings.reduce((best, it) => {
      if (!Number.isFinite(it.playerCount)) return best;
      if (!best) return it;
      if (it.playerCount < best.playerCount) return it;
      if (it.playerCount === best.playerCount && it.timesCollected > best.timesCollected) return it;
      return best;
    }, null);
  }, [holdings, totalPlayers]);

  const active = SORTS.find((s) => s.id === sort);
  const q = query.trim().toLowerCase();
  const rows = useMemo(
    () => holdings
      .filter((it) => !q || f.itemLabel(it.itemName).toLowerCase().includes(q))
      .slice()
      .sort(active.cmp),
    [holdings, active, q],
  );

  return (
    <div className="fib-page">
      <header className="fib-hero">
        <button type="button" className="fib-btn fib-btn--quiet fib-hero-back" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 6l-6 6 6 6" />
          </svg>
          {name}&rsquo;s profile
        </button>

        <div className="fib-hero-grid">
          <div className="fib-hero-id">
            <div className="fib-well fib-hero-avatar">
              <Avatar uuid={uuid} size={128} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 className="fib-hero-name">{name}&rsquo;s collection</h1>
              <div className="fib-hero-rank">
                <span>
                  {f.num(distinct)} distinct items
                  {poolSize > 0 ? <em> · {f.num(totalFinds)} finds in all</em> : null}
                </span>
              </div>
            </div>
          </div>

          {poolSize > 0 ? (
            <div className="fib-hero-figures">
              <Figure
                size="hero"
                value={distinct}
                format={f.full}
                label={`of ${f.full(poolSize)} items collected`}
                fill={completion}
                fillTone="diamond"
                gaugeLabel={`${Math.round((completion ?? 0) * 100)}% of the item pool collected`}
                note={`${f.pct((completion ?? 0) * 100)} of the pool`}
              />
            </div>
          ) : null}
        </div>

        {scarcest ? (
          /* The trophy: the scarcest holding on its own plinth — the rarity
             feature of the page, so it gets the rarity colour spent on it:
             the rim, the hairline top edge, and the counted figure. */
          <div className="fib-trophy">
            <Sprite name={scarcest.itemName} size={64} pad={16} phase={itemPhase(scarcest.itemName)} className="fib-well--scarce" />
            <div className="fib-trophy-id">
              <span className="fib-label">Rarest find</span>
              <b>{f.itemLabel(scarcest.itemName)}</b>
              <span className="fib-meta">
                found {f.num(scarcest.timesCollected)} {scarcest.timesCollected === 1 ? 'time' : 'times'}
                {scarcest.firstCollected ? ` · first ${f.date(scarcest.firstCollected)}` : ''}
              </span>
            </div>
            <Figure
              size="md"
              tone="diamond"
              value={scarcest.playerCount}
              count={false}
              label={`of ${f.num(totalPlayers)} ${totalPlayers === 1 ? 'player holds' : 'players hold'} it`}
            />
          </div>
        ) : null}
      </header>

      <Section
        title="The collection"
        sub="Rarity is counted, not declared: “held by N of M” is how many of the ranked players share each item."
        aside={<Search value={query} onChange={setQuery} placeholder="Find an item" label="Find an item" />}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center', marginBottom: 'var(--fib-space-6)' }}>
          {SORTS.map((s) => (
            <Chip key={s.id} active={s.id === sort} onClick={() => setSort(s.id)} title={s.hint}>
              {s.label}
            </Chip>
          ))}
        </div>

        {holdings.length === 0 ? (
          <Empty title={`${name} hasn’t collected anything yet`}>
            Every item a player picks up in a match is logged the moment it is found.
            This book fills the first time they complete one.
          </Empty>
        ) : (
          <div className="fib-book-case">
            <div className="fib-book-head">
              <span className="fib-label">The holdings</span>
              <span className="fib-meta">
                {q
                  ? `${f.num(rows.length)} matching “${query.trim()}”`
                  : `${f.num(distinct)}${poolSize > 0 ? ` of ${f.num(poolSize)}` : ''} found`}
              </span>
            </div>

            {rows.length === 0 ? (
              <Empty title={`No item matches “${query.trim()}”`}>
                The book lists what {name} has actually found — check the spelling,
                or clear the search to see the whole collection.
              </Empty>
            ) : (
              <div className="fib-shelf fib-shelf--wide">
                {rows.map((it) => (
                  <HoldingCard key={it.itemName} item={it} totalPlayers={totalPlayers} />
                ))}
              </div>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
