/**
 * FIB Stats — the item index.
 *
 * Every item that has turned up in a tracked match, as a shelf of product cards:
 * the texture sits directly on a lit media band (no inner box), and a
 * phase-coloured top line and floor-bleed mark which part of a match it belongs
 * to — EARLY green, MID yellow, LATE red, the same ramp the ItemPools pages use.
 *
 * The sort chips are the questions players ask about items — what comes up most,
 * what stalls a run, what everyone skips — not a generic column sort. Whichever
 * is active becomes the card's headline figure and drives its field bar; the
 * other two ride along in the footer as context, so one card answers all three
 * questions and never prints the active metric twice.
 *
 * The grid is windowed, not paged: the whole index arrives in one call and a
 * sentinel grows how many cards are mounted as it nears the viewport, so the DOM
 * stays light as the pool grows. Where IntersectionObserver is absent the whole
 * list renders at once rather than stranding the reader at sixty.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { loadItems } from './api.js';
import { useAsync } from './useAsync.js';
import { canObserve } from './env.js';
import {
  Section, ItemImage, Segmented, Search, Empty, Figure, AsyncView, PCard, CardMeter,
  FacetRail, FacetGroup, CheckRow, RangeInputs,
} from './Primitives.jsx';
import { itemKey, ITEM_STATE } from './adapter.js';
import * as f from './format.js';

/*
 * Match phase — which part of a match an item can start coming up in — read from
 * ITEM_STATE (vendored from the plugin, the same source the ItemPools pages use)
 * so an item's colour is identical in both places. Green EARLY, yellow MID, red
 * LATE; an item not in the pool (never assigned a phase) stays neutral.
 *
 * `tone` is the lit fill for the card's top line and floor bleed; `ink` is the
 * text colour for the label. They differ only for LATE: the fill red reads as a
 * lit accent but is too dark to clear 4.5:1 as small text, so the label takes a
 * lighter red (phase-late-ink) — the same fill-vs-text split the blue accent uses.
 */
const PHASE = {
  EARLY: { label: 'Early', tone: 'var(--fib-phase-early)', ink: 'var(--fib-phase-early)' },
  MID: { label: 'Mid', tone: 'var(--fib-phase-mid)', ink: 'var(--fib-phase-mid)' },
  LATE: { label: 'Late', tone: 'var(--fib-phase-late)', ink: 'var(--fib-phase-late-ink)' },
};
const phaseOf = (itemName) => ITEM_STATE[itemKey(itemName).toUpperCase()] || null;

/*
 * The real /items row is the rarity snapshot's shape: { itemName, playerCount, totalFinds,
 * totalSkips, avgSeconds }, and the view reads { itemName, seen, avgSeconds, skipRate }. The two
 * derivations belong here at the boundary — seen is every appearance (found or skipped), skipRate
 * is the share given up on — so the render below is untouched.
 */
function toItemRow(r) {
  const seen = (r.totalFinds ?? 0) + (r.totalSkips ?? 0);
  return {
    itemName: r.itemName,
    seen,
    avgSeconds: r.avgSeconds ?? 0,
    skipRate: seen > 0 ? ((r.totalSkips ?? 0) / seen) * 100 : 0,
  };
}

/*
 * Each sort is a question the reader can ask of the whole index. Its four jobs
 * on a card:
 *   pick    orders the grid and supplies the headline figure
 *   metric  names the field bar beneath the headline (its share of the best)
 *   unit    qualifies the headline number
 *   brief   the one-line form shown in the footer for the TWO sorts that are
 *           NOT active, so every card carries all three metrics at once
 * `max` reads this sort's field maximum out of the precomputed maxima, for the
 * share bar's fill.
 */
const SORTS = [
  {
    id: 'seen', label: 'Most common', hint: 'How often the item has come up',
    metric: 'Appearances', pick: (r) => r.seen, max: (m) => m.seen,
    format: f.num, unit: 'times seen', brief: (r) => `${f.num(r.seen)} seen`,
  },
  {
    id: 'slow', label: 'Biggest time sink', hint: 'Average time spent before finding it',
    // Shown as m + s past a minute: a bare "1,988s" reads as noise, "33m 8s" reads
    // as a duration — `duration` (formatTime) is the same helper the match feed uses.
    // No headline unit: a duration is self-evidently a time, and the "Average time"
    // field-bar label names it anyway.
    metric: 'Average time', pick: (r) => r.avgSeconds, max: (m) => m.avg,
    format: f.duration, unit: null, brief: (r) => `${f.duration(r.avgSeconds)} avg`,
  },
  {
    id: 'skipped', label: 'Most skipped', hint: 'Share of appearances players gave up on',
    metric: 'Skip rate', pick: (r) => r.skipRate, max: (m) => m.skip,
    format: (n) => f.pct(n, 0), unit: 'of the time', brief: (r) => `${f.pct(r.skipRate, 0)} skipped`,
  },
];

export function Items() {
  const state = useAsync(loadItems, []);
  return (
      <AsyncView state={state} loadingLabel="Loading items…">
        {(payload) => <ItemsBody items={(payload.items ?? payload ?? []).map(toItemRow)} />}
      </AsyncView>
  );
}

/* The phase facet's options, including the items the plugin never assigned a
   phase to — they are a real part of the index and a filter that silently
   excluded them would be lying about the count. */
const PHASE_FACETS = [
  { id: 'EARLY', label: 'Early', tone: PHASE.EARLY.tone },
  { id: 'MID', label: 'Mid', tone: PHASE.MID.tone },
  { id: 'LATE', label: 'Late', tone: PHASE.LATE.tone },
  { id: 'NONE', label: 'Unassigned', tone: 'var(--fib-netherite)' },
];

/** An empty box means unbounded, so '' and a bad parse both read as "no bound". */
const bound = (s) => {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
};

const EMPTY_FACETS = {
  phases: [], seenMin: '', seenMax: '', skipMin: '', skipMax: '',
};

function ItemsBody({ items }) {
  const [sort, setSort] = useState('seen');
  const [query, setQuery] = useState('');
  const [facets, setFacets] = useState(EMPTY_FACETS);

  const active = SORTS.find((s) => s.id === sort);

  const setFacet = (patch) => setFacets((prev) => ({ ...prev, ...patch }));
  const togglePhase = (id, on) => setFacets((prev) => ({
    ...prev,
    phases: on ? [...prev.phases, id] : prev.phases.filter((p) => p !== id),
  }));

  /* How many filters are actually narrowing the list. A range counts once even
     when both ends are set — the reader set one constraint, not two — and the
     phase group counts once however many boxes are ticked. */
  const activeFacets =
      (facets.phases.length > 0 ? 1 : 0)
      + (facets.seenMin !== '' || facets.seenMax !== '' ? 1 : 0)
      + (facets.skipMin !== '' || facets.skipMax !== '' ? 1 : 0);

  /* Phase counts across the WHOLE index, not the filtered set: a facet count that
     changed as you ticked its own boxes would make the group unreadable. */
  const phaseCounts = useMemo(() => {
    const counts = { EARLY: 0, MID: 0, LATE: 0, NONE: 0 };
    for (const r of items) counts[phaseOf(r.itemName) ?? 'NONE'] += 1;
    return counts;
  }, [items]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const seenMin = bound(facets.seenMin);
    const seenMax = bound(facets.seenMax);
    const skipMin = bound(facets.skipMin);
    const skipMax = bound(facets.skipMax);

    return items
        .filter((r) => {
          if (q && !f.itemSearchText(r.itemName).toLowerCase().includes(q)) return false;
          if (facets.phases.length > 0
              && !facets.phases.includes(phaseOf(r.itemName) ?? 'NONE')) return false;
          if (seenMin != null && r.seen < seenMin) return false;
          if (seenMax != null && r.seen > seenMax) return false;
          if (skipMin != null && r.skipRate < skipMin) return false;
          if (skipMax != null && r.skipRate > skipMax) return false;
          return true;
        })
        .slice()
        .sort((a, b) => active.pick(b) - active.pick(a));
  }, [items, active, query, facets]);

  const totalSeen = items.reduce((a, r) => a + r.seen, 0);

  /* Field maxima for the share bars — one pass over the index, reused by
     whichever sort is active so the bar always reads against its own field. */
  const maxes = useMemo(() => ({
    seen: Math.max(1, ...items.map((r) => r.seen)),
    avg: Math.max(1, ...items.map((r) => r.avgSeconds)),
    skip: Math.max(1, ...items.map((r) => r.skipRate)),
  }), [items]);
  const activeMax = active.max(maxes);

  /*
   * Infinite scroll. The whole index is already in memory (one /items call), so
   * this is a render window, not a fetch: only `visible` cards are mounted, and
   * a sentinel below the grid grows the window as it nears the viewport. Keeps
   * the DOM light as the pool grows over time without paging the data.
   *
   * Where IntersectionObserver is unavailable (SSR, headless, old browser) the
   * grid is not windowed at all — `shown` is the full list — so the reader is
   * never stranded at sixty with no way to load more, and no state is set from
   * inside an effect to get there.
   */
  const PAGE = 60;
  const windowed = canObserve();
  const [visible, setVisible] = useState(PAGE);
  const sentinelRef = useRef(null);

  /* A new sort, search or facet starts the window over at the top. Done during
     render (React's "adjust state when inputs change" pattern) rather than in an
     effect, so no state is set from inside an effect and the reset lands before
     paint instead of one frame after it. */
  const filterKey = `${sort} ${query.trim().toLowerCase()} ${JSON.stringify(facets)}`;
  const [windowKey, setWindowKey] = useState(filterKey);
  if (windowKey !== filterKey) {
    setWindowKey(filterKey);
    setVisible(PAGE);
  }

  useEffect(() => {
    if (!windowed || visible >= rows.length) return undefined;
    const el = sentinelRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisible((v) => Math.min(rows.length, v + PAGE));
    }, { rootMargin: '800px' });
    io.observe(el);
    return () => io.disconnect();
  }, [windowed, visible, rows.length]);

  const shown = windowed ? rows.slice(0, visible) : rows;

  return (
      <div className="fib-page fib-page--wide">
        <Section
            title="Items"
            sub={`${items.length} distinct items across ${f.num(totalSeen)} appearances in the sampled matches.`}
            aside={<Search value={query} onChange={setQuery} placeholder="Find an item" label="Find an item" hotkey />}
        >
          <div className="fib-faceted">
            <FacetRail activeCount={activeFacets} onClear={() => setFacets(EMPTY_FACETS)}>
              <FacetGroup title="Match phase" hint="When in a match the item can start coming up.">
                {PHASE_FACETS.map((p) => (
                    <CheckRow
                        key={p.id}
                        checked={facets.phases.includes(p.id)}
                        onChange={(on) => togglePhase(p.id, on)}
                        count={phaseCounts[p.id]}
                        swatch={p.tone}
                    >
                      {p.label}
                    </CheckRow>
                ))}
              </FacetGroup>

              <FacetGroup title="Appearances" hint="Times the item has come up, found or skipped.">
                <RangeInputs
                    min={facets.seenMin} max={facets.seenMax}
                    onMin={(v) => setFacet({ seenMin: v })}
                    onMax={(v) => setFacet({ seenMax: v })}
                />
              </FacetGroup>

              <FacetGroup title="Skip rate" hint="Share of appearances players gave up on.">
                <RangeInputs
                    min={facets.skipMin} max={facets.skipMax}
                    onMin={(v) => setFacet({ skipMin: v })}
                    onMax={(v) => setFacet({ skipMax: v })}
                    suffix="%" step={5}
                />
              </FacetGroup>
            </FacetRail>

            <div className="fib-faceted-body">
              <div className="fib-items-bar">
                {/* One of N, so the same sliding-thumb control the scope pickers use.
                    This was a chip row, which made two different segmented
                    vocabularies for the same job across the module. */}
                <Segmented options={SORTS} value={sort} onChange={setSort} label="Sort items" />
                {/* Phase legend — the colour code the cards carry, named. */}
                <div className="fib-phase-legend" aria-hidden="true">
                  {Object.values(PHASE).map((p) => (
                      <span key={p.label}><i style={{ background: p.tone }} />{p.label}</span>
                  ))}
                </div>
              </div>

          {items.length === 0 ? (
              <Empty title="No items yet">
                The index lists every item that has appeared in a tracked match. As soon as a
                match finishes, the items it turned up show up here.
              </Empty>
          ) : rows.length === 0 ? (
              <Empty
                  title={query.trim() ? `No item matches “${query.trim()}”` : 'No item matches those filters'}
                  action={activeFacets > 0 ? (
                      <button type="button" className="fib-btn" onClick={() => setFacets(EMPTY_FACETS)}>
                        Clear filters
                      </button>
                  ) : null}
              >
                {activeFacets > 0
                    ? 'Every item in the index falls outside the ranges set in the rail. Widen one, or clear them and start again.'
                    : 'Only items that have actually come up in a tracked match are indexed. Check the spelling, or clear the search to browse them all.'}
              </Empty>
          ) : (
              <>
              <div className="fib-pcard-grid fib-items-cards">
                {shown.map((r) => {
                  const ph = phaseOf(r.itemName);
                  const phase = ph ? PHASE[ph] : null;
                  return (
                      <PCard
                          key={r.itemName}
                          tone={phase ? phase.tone : 'var(--fib-netherite)'}
                          media={<ItemImage name={r.itemName} size={128} className="fib-pcard-sprite" />}
                          title={f.itemLabel(r.itemName)}
                          sub={phase ? (
                              <span className="fib-pcard-phase" style={{ color: phase.ink }}>
                                {phase.label}
                              </span>
                          ) : null}
                          foot={
                            /* The two metrics that AREN'T the active sort, so the
                               card carries all three without repeating the headline. */
                            SORTS.filter((s) => s.id !== sort).map((s) => {
                              const danger = s.id === 'skipped' && r.skipRate > 25;
                              return (
                                  <span
                                      key={s.id}
                                      className="fib-meta"
                                      style={danger ? { color: 'var(--fib-negative)' } : undefined}
                                  >
                                    {s.brief(r)}
                                  </span>
                              );
                            })
                          }
                      >
                        <Figure
                            size="lg"
                            value={active.pick(r)}
                            format={active.format}
                            unit={active.unit}
                            count={false}
                        />
                        {/* The headline's field: this item's share of the best in
                            whatever metric is sorted on, so the number is never bare. */}
                        <CardMeter
                            label={active.metric}
                            fill={active.pick(r) / activeMax}
                            tone="diamond"
                        />
                      </PCard>
                  );
                })}
              </div>
              {windowed && visible < rows.length ? (
                  <div
                      ref={sentinelRef}
                      className="fib-meta fib-items-count"
                      role="status"
                  >
                    Showing {f.num(shown.length)} of {f.num(rows.length)}
                  </div>
              ) : rows.length < items.length ? (
                  /* Filtered down to something that fits. The count still has to be
                     stated: a grid that silently holds 40 of 616 items reads as the
                     whole index, and the reader has no way to tell it is not. */
                  <div className="fib-meta fib-items-count" role="status">
                    {f.num(rows.length)} of {f.num(items.length)} items match
                  </div>
              ) : null}
              </>
          )}
            </div>
          </div>
        </Section>
      </div>
  );
}
