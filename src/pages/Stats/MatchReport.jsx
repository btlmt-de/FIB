/**
 * FIB Stats — everything that happened in one round, below the race.
 *
 * The match page used to end the story at the scoreboard: a table of place,
 * score, found, skipped and gap, with each competitor's items hidden in a
 * drawer, and a shelf of rare pulls underneath it. What the round actually
 * consisted of - which items, in what order, how long each took, which pools
 * they came out of, which ones rolled a back-to-back - was one click and one
 * row at a time away. These pieces put it on the page:
 *
 *   LiveBoard     the standings, as the lane panel under the race: place,
 *                 score, gap and what each side is hunting at the cursor. It
 *                 replaces BOTH the chart legend and the standings table, which
 *                 said the same thing twice, and it re-ranks with FLIP as the
 *                 race is scrubbed - the overtake the old table used to show.
 *   RoundRecords  the round's extremes: fastest find, longest hunt, first
 *                 find, rarest pull.
 *   TeamReport    one per competitor: the run as a strip of every item they
 *                 got, their back-to-backs by tier, the pool-phase split and
 *                 the figures that describe how they played it.
 *
 * The derivations these read (the pool schedule, a competitor's run) live in
 * matchModel.js, so the components here stay components.
 */

import React, { useMemo, useRef, useState } from 'react';
import { idLabel, idUuid, itemPhase } from './adapter.js';
import { labelFor, TIER_RANK, huntedFind } from './matchModel.js';
import { useFlipRows } from './useFlip.js';
import { RARITY_KEYS, RARITY_LABEL } from './tokens.js';
import { Avatar, Medal, Sprite, RarityTag } from './Primitives.jsx';
import { Inventory, PhaseSplit } from './Inventory.jsx';
import * as f from './format.js';

/* ── The live board ──────────────────────────────────────────────────── */

/*
 * What a lane is doing at match time `at`. Mid-race, the item it is HUNTING is
 * its next event after `at` - found or skipped, it was the target until then.
 * At rest there is nothing left to hunt, so it is the last item it found.
 */
function laneAt(entry, at, live) {
  const done = entry.events.filter((e) => e.t <= at);
  const next = entry.events.find((e) => e.t > at);
  const lastFound = [...done].reverse().find((e) => !e.skipped);
  if (live && next) {
    return { verb: 'hunting', item: next.itemName, since: done.length ? done[done.length - 1].t : 0 };
  }
  return { verb: 'last find', item: lastFound?.itemName ?? null };
}

/**
 * `rows`: [{ entry, place, score, gap }] in standing order. `separated` false
 * means nobody is ahead of anybody yet, and no place is printed.
 */
export function LiveBoard({ rows, at, live, separated, shared, onOpenPlayer }) {
  const ref = useRef(null);
  useFlipRows(ref, rows.map((r) => r.entry.key).join('|'));

  return (
    <ol className="fib-board" ref={ref} aria-label={live ? `Standings at ${f.clock(at)}` : 'Final standings'}>
      {rows.map(({ entry, place, score, gap }) => {
        const lane = laneAt(entry, at, live);
        const leading = separated && place === 1;
        return (
          <li key={entry.key} className="fib-board-row" data-flip-key={entry.key} data-leading={leading || undefined}>
            <span className="fib-board-place">
              <Medal place={separated ? place : null} />
              {separated && shared.has(place) ? <span className="fib-sr">, tied</span> : null}
            </span>
            <i className="fib-board-swatch" style={{ background: `var(--fib-race-${entry.index % 8})` }} aria-hidden="true" />
            <span className="fib-board-who">
              <span className="fib-board-heads">
                {entry.members.map((m) => <Avatar key={idUuid(m)} uuid={idUuid(m)} size={28} />)}
              </span>
              <span className="fib-board-names">
                {entry.members.map((m, i) => (
                  <React.Fragment key={idUuid(m)}>
                    {i > 0 ? <span className="fib-board-amp"> &amp; </span> : null}
                    <button type="button" onClick={() => onOpenPlayer?.(idUuid(m))}>{idLabel(m)}</button>
                  </React.Fragment>
                ))}
              </span>
            </span>
            <span className="fib-board-now">
              {lane.item ? <Sprite name={lane.item} size={32} pad={4} /> : <span className="fib-lane-now-empty" />}
              <span className="fib-lane-now-text">
                <span className="fib-label">
                  {lane.verb}{lane.verb === 'hunting' ? ` for ${f.clock(Math.max(0, at - lane.since))}` : ''}
                </span>
                <b>{lane.item ? f.itemLabel(lane.item) : 'nothing yet'}</b>
              </span>
            </span>
            <span className="fib-board-score">
              <b>{score}</b>
              <span className="fib-meta">
                {gap !== 0 ? gap : !separated ? 'level' : live ? 'leading' : 'won'}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ── The round's records ─────────────────────────────────────────────── */

/**
 * Four extremes across every competitor: the quickest find, the longest single
 * hunt, the first item anyone found, the rarest back-to-back. Each names who,
 * and when on the match clock - the clock everything else on this page runs on.
 */
export function RoundRecords({ entries, runs }) {
  const records = useMemo(() => {
    const all = entries.flatMap((entry, i) => runs[i].segments.map((s) => ({ ...s, entry })));
    const finds = all.filter((s) => !s.skipped);
    const pick = (list, better) => list.reduce((a, b) => (a == null || better(b, a) ? b : a), null);
    const out = [];
    const fastest = pick(finds.filter(huntedFind), (b, a) => b.took < a.took);
    if (fastest) out.push({ id: 'fastest', title: 'Fastest find', s: fastest, figure: f.duration(fastest.took) });
    const longest = pick(all, (b, a) => b.took > a.took);
    if (longest) out.push({ id: 'longest', title: 'Longest hunt', s: longest, figure: f.duration(longest.took), note: longest.skipped ? 'then skipped' : null });
    const first = pick(finds, (b, a) => b.t < a.t);
    if (first) out.push({ id: 'first', title: 'First find', s: first, figure: f.clock(first.t) });
    const rarest = pick(all.filter((s) => s.b2b), (b, a) => TIER_RANK[b.b2b] > TIER_RANK[a.b2b] || (TIER_RANK[b.b2b] === TIER_RANK[a.b2b] && b.t < a.t));
    if (rarest) out.push({ id: 'rarest', title: 'Rarest pull', s: rarest, figure: RARITY_LABEL[rarest.b2b], tier: rarest.b2b });
    return out;
  }, [entries, runs]);

  if (records.length === 0) return null;
  return (
    <div className="fib-round-records">
      {records.map((r) => (
        <figure key={r.id} className="fib-round-record">
          <Sprite name={r.s.itemName} size={64} pad={12} tier={r.s.b2b || undefined} phase={itemPhase(r.s.itemName) || undefined} />
          <figcaption>
            <span className="fib-label">{r.title}</span>
            <b className="fib-round-record-name">{f.itemLabel(r.s.itemName)}</b>
            <span className="fib-round-record-figure">
              {r.tier ? <RarityTag tier={r.tier} /> : <em>{r.figure}</em>}
              {r.note ? <span className="fib-meta"> {r.note}</span> : null}
            </span>
            <span className="fib-meta">{labelFor(r.s.entry)} · at {f.clock(r.s.t)}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/* ── One competitor's report ─────────────────────────────────────────── */

/*
 * Their round, whole. The header is who they are and where they finished; the
 * facts are how they played it; the run is WHAT they played - every item as a
 * sprite in collection order, carrying the same three signals the inventory
 * tiles do (phase floor, back-to-back rim, skip desaturated) so the strip reads
 * as a sentence of the round without a hover. The labelled, timed inventory is
 * still one press away for anyone who wants each item's name and time spelled
 * out.
 */
export function TeamReport({ entry, run, place, lead, won, duration, mode, at = null, onOpenPlayer }) {
  const [open, setOpen] = useState(false);
  /* While the race is being scrubbed or replayed, the run follows the clock:
     the item this side was hunting at `at` is lit, everything after it dims.
     This is where the chart's "what were they doing then" is answered - the
     chart itself carries no sprites. */
  const hunting = at == null ? null : run.segments.find((s) => s.t > at)?.order ?? null;
  const panelId = `fib-report-inv-${entry.key}`;
  const pulls = run.pulls.length;

  return (
    <article className="fib-report" data-won={won || undefined}>
      <header className="fib-report-head">
        <Medal place={place} />
        <span className="fib-board-heads">
          {entry.members.map((m) => <Avatar key={idUuid(m)} uuid={idUuid(m)} size={40} />)}
        </span>
        <h3 className="fib-report-names">
          {entry.members.map((m, i) => (
            <React.Fragment key={idUuid(m)}>
              {i > 0 ? <span className="fib-board-amp"> &amp; </span> : null}
              <button type="button" onClick={() => onOpenPlayer?.(idUuid(m))}>{idLabel(m)}</button>
            </React.Fragment>
          ))}
        </h3>
        <span className="fib-report-score">
          <b>{entry.score}</b>
          <span className="fib-meta">{won ? 'won' : entry.score === lead ? 'level' : `${lead - entry.score} behind`}</span>
        </span>
      </header>

      <div className="fib-report-body">
        <dl className="fib-report-facts">
          <div><dt>Found</dt><dd><b>{run.found}</b></dd></div>
          <div><dt>Skipped</dt><dd><b>{run.skipped}</b></dd></div>
          <div><dt>Per item</dt><dd><b>{run.perItem != null ? f.duration(run.perItem) : '—'}</b></dd></div>
          <div>
            <dt>Fastest find</dt>
            <dd>
              {run.fastest ? <Sprite name={run.fastest.itemName} size={16} pad={2} /> : null}
              <b>{run.fastest ? f.duration(run.fastest.took) : '—'}</b>
            </dd>
          </div>
          <div>
            <dt>Longest hunt</dt>
            <dd>
              {run.longest ? <Sprite name={run.longest.itemName} size={16} pad={2} /> : null}
              <b>{run.longest ? f.duration(run.longest.took) : '—'}</b>
            </dd>
          </div>
        </dl>

        <div className="fib-report-side">
          <div className="fib-report-b2b">
            <h4 className="fib-label">
              {pulls} back-to-back {pulls === 1 ? 'pull' : 'pulls'}
            </h4>
            {pulls > 0 ? (
              <ul className="fib-report-tiers">
                {RARITY_KEYS.filter((k) => run.tiers[k] > 0).map((k) => (
                  <li key={k}><RarityTag tier={k} /><em>{run.tiers[k]}</em></li>
                ))}
              </ul>
            ) : <p className="fib-meta">None this round.</p>}
          </div>
          <PhaseSplit counts={run.phases} />
        </div>
      </div>

      {/*
        The run. Every item, in the order it came, at 64px with how long it took
        printed under it - the first version drew these as 32px slots with the
        time only on hover, and the time is half of what a run IS. Phase on the
        floor, back-to-back on the rim, skips desaturated, because a skip still
        scores and is "gave up on this one", never an error. The order number
        sits in the corner, where Minecraft puts a stack size.
      */}
      <ol className="fib-report-run" aria-label={`${labelFor(entry)}'s ${run.segments.length} items in collection order`}>
        {run.segments.map((s) => (
          <li
            key={s.order}
            data-skipped={s.skipped || undefined}
            data-current={s.order === hunting || undefined}
            data-ahead={(at != null && s.t > at && s.order !== hunting) || undefined}
            title={`#${s.order} ${f.itemLabel(s.itemName)} · ${f.duration(s.took)}${s.b2b ? ` · ${RARITY_LABEL[s.b2b]} back-to-back` : ''}${s.skipped ? ' · skipped' : ''}`}
          >
            <Sprite name={s.itemName} size={64} pad={6} tier={s.b2b || undefined} phase={itemPhase(s.itemName) || undefined} />
            <span className="fib-report-run-order" aria-hidden="true">{s.order}</span>
            <span className="fib-report-run-took" aria-hidden="true">{s.b2b && s.took < 1 ? 'b2b' : f.duration(s.took)}</span>
            <span className="fib-sr">
              {`${s.order}. ${f.itemLabel(s.itemName)}, ${f.durationWords(s.took)}${s.b2b ? `, ${RARITY_LABEL[s.b2b]} back-to-back` : ''}${s.skipped ? ', skipped' : ''}`}
            </span>
          </li>
        ))}
      </ol>

      <div className="fib-report-foot">
        <button
          type="button"
          className="fib-btn fib-btn--quiet"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Hide the item list' : 'Item names and details'}
        </button>
      </div>
      {open ? (
        <div id={panelId} className="fib-report-inv">
          <Inventory entry={entry} duration={duration} ownerLabel={labelFor(entry)} mode={mode} />
        </div>
      ) : null}
    </article>
  );
}
