/**
 * FIB Stats — the item index.
 *
 * Items are the substance of ForceItemBattle, so this view treats them as
 * objects rather than rows with a thumbnail: a shelf of artifacts, each in its
 * own lit well, sized large enough to actually read the pixel art.
 *
 * The sort options are the questions players ask about items — what comes up
 * most, what stalls a run, what everyone skips — rather than a generic
 * column-header sort.
 */

import React, { useMemo, useState } from 'react';
import { loadItems } from './api.js';
import { useAsync } from './useAsync.js';
import { Section, Sprite, Chip, Search, Empty, Figure, AsyncView } from './Primitives.jsx';
import * as f from './format.js';

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
 * `brief` is how the metric reads when it is NOT the one being sorted on. The
 * headline figure already states the active metric, so repeating it underneath
 * was duplication that also made the caption wrap to two lines on some cards
 * and one on others.
 */
const SORTS = [
  {
    id: 'seen', label: 'Most common', hint: 'How often the item has come up',
    pick: (r) => r.seen, format: f.num, unit: 'times seen',
    brief: (r) => `${f.num(r.seen)} seen`,
  },
  {
    id: 'slow', label: 'Biggest time sink', hint: 'Average seconds spent before finding it',
    pick: (r) => r.avgSeconds, format: (n) => f.dec(n, 0), unit: 'sec average',
    brief: (r) => `${f.dec(r.avgSeconds, 0)}s avg`,
  },
  {
    id: 'skipped', label: 'Most skipped', hint: 'Share of appearances players gave up on',
    pick: (r) => r.skipRate, format: (n) => f.pct(n, 0), unit: 'of the time',
    brief: (r) => `${f.pct(r.skipRate, 0)} skipped`,
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

function ItemsBody({ items }) {
  const [sort, setSort] = useState('seen');
  const [query, setQuery] = useState('');

  const active = SORTS.find((s) => s.id === sort);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
        .filter((r) => !q || f.itemLabel(r.itemName).toLowerCase().includes(q))
        .slice()
        .sort((a, b) => active.pick(b) - active.pick(a));
  }, [items, active, query]);

  const featured = rows.slice(0, 6);
  const rest = rows.slice(6);

  const totalSeen = items.reduce((a, r) => a + r.seen, 0);

  return (
      <div className="fib-page">
        <Section
            title="Items"
            sub={`${items.length} distinct items across ${f.num(totalSeen)} appearances in the sampled matches.`}
            aside={<Search value={query} onChange={setQuery} placeholder="Find an item" label="Find an item" />}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 'var(--fib-space-6)' }}>
            {SORTS.map((s) => (
                <Chip key={s.id} active={s.id === sort} onClick={() => setSort(s.id)} title={s.hint}>
                  {s.label}
                </Chip>
            ))}
          </div>

          {rows.length === 0 ? (
              <Empty title={`No item matches “${query.trim()}”`}>
                The index only lists items that have actually appeared in a tracked match.
                Something in the pool that has never come up yet won&rsquo;t be here.
              </Empty>
          ) : (
              <>
                <div className="fib-shelf fib-shelf--wide">
                  {featured.map((r) => (
                      <figure key={r.itemName} className="fib-artifact fib-sprite-lift">
                        <Sprite name={r.itemName} size={64} pad={20} />
                        <figcaption>
                          <b>{f.itemLabel(r.itemName)}</b>
                          {/* The unit sits beside the number, not stacked under it:
                        "101 times" is a phrase, "101" over "times" is a form. */}
                          <Figure
                              size="sm"
                              value={active.pick(r)}
                              format={active.format}
                              unit={active.unit}
                              count={false}
                          />
                          <span className="fib-meta">
                      {SORTS.filter((s) => s.id !== sort).map((s) => s.brief(r)).join(' · ')}
                    </span>
                        </figcaption>
                      </figure>
                  ))}
                </div>

                {rest.length > 0 ? (
                    <div className="fib-panel fib-panel--flush fib-table-wrap" style={{ marginTop: 'var(--fib-space-6)' }}>
                      <table className="fib-table">
                        <caption className="fib-sr">All items, sorted by {active.label.toLowerCase()}</caption>
                        <thead>
                        <tr>
                          <th scope="col">Item</th>
                          <th scope="col" data-num>Seen</th>
                          <th scope="col" data-num>Avg time</th>
                          <th scope="col" data-num>Skipped</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rest.map((r) => (
                            <tr key={r.itemName}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--fib-space-3)' }}>
                                  <Sprite name={r.itemName} size={32} pad={6} />
                                  <span>{f.itemLabel(r.itemName)}</span>
                                </div>
                              </td>
                              <td data-num>{f.num(r.seen)}</td>
                              <td data-num>{f.dec(r.avgSeconds, 0)}s</td>
                              <td data-num style={{ color: r.skipRate > 25 ? 'var(--fib-negative)' : undefined }}>
                                {f.pct(r.skipRate, 0)}
                              </td>
                            </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>
                ) : null}
              </>
          )}
        </Section>
      </div>
  );
}
