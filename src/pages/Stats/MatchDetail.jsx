/**
 * FIB Stats — one match, moment to moment.
 *
 * The scrubber is the point of this view, and it has three doors into it:
 * drag the clock for precision, hover the trace for a quick look, or press
 * replay and simply watch the match be won — standings re-ranking live as
 * the lead changes hands. A final scoreboard tells you who won; any of these
 * tells you *when* it was decided, which is the only reason anyone reopens a
 * match they already know the result of.
 *
 * Standings reorder as you scrub, animated with FLIP. This is the one place in
 * the module where motion carries information no number does: a row that
 * travels past another row shows you the overtake happening. A row that
 * teleports would only tell you the order changed.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  matchStandings, matchDuration, raceEntries, standingsAt, leadChanges, leadChangeTimes,
} from './adapter.js';
import { useFlipRows } from './useFlip.js';
import { loadMatch } from './api.js';
import { useAsync } from './useAsync.js';
import { Section, Avatar, Medal, Sprite, Empty, Figure, RarityTag, AsyncView } from './Primitives.jsx';
import { idLabel, idUuid } from './adapter.js';
import { Inventory } from './Inventory.jsx';
import { RaceTrace } from './Charts.jsx';
import * as f from './format.js';

const labelFor = (row) => row.members.map(idLabel).join(' & ');

/**
 * Server setting keys, in the wiki's own words.
 *
 * The keys arrive as the server stores them — `KEEP_INVENTORY`, `BACKPACKSIZE`,
 * `HARD` — with stringly-typed values (`"true"`, `"3"`). Lowercasing the key
 * and printing the raw value shipped `keep inventory / true` to players, which
 * is the server's vocabulary leaking through a page written for the people who
 * played the match. Names and phrasings here match `pages/GameSettings.jsx`, so
 * a setting reads the same on both pages.
 *
 * `value` is given the raw string and returns what a player should see. Keys
 * the server adds later fall through to a humanised key and the raw value,
 * which is ugly but never wrong — and visibly a gap worth filling in here.
 */
const yesNo = (on, off) => (v) => (v === 'true' ? on : off);

const SETTINGS = {
  TEAM: { label: 'Format', value: yesNo('Teams', 'Solo') },
  HARD: { label: 'Hard', value: yesNo('Late items included', 'Late items excluded') },
  NETHER: { label: 'Nether', value: yesNo('Portal open, nether items in the pool', 'Disabled') },
  END: { label: 'End', value: yesNo('Portal open, end items in the pool', 'Disabled') },
  QUICKIE: {
    label: 'Quickie',
    value: (v) => ['Disabled', 'Early only', 'Early + Mid'][Number(v)] ?? v,
  },
  BACKPACKSIZE: {
    label: 'Backpack',
    value: (v) => (v === '0' ? 'None' : `${v} ${Number(v) === 1 ? 'row' : 'rows'}`),
  },
  KEEP_INVENTORY: { label: 'KeepInventory', value: yesNo('Items kept on death', 'Items dropped on death') },
  RANDOM_EVENTS: { label: 'Random events', value: yesNo('On', 'Off') },
  STATS: { label: 'Stats', value: yesNo('Counted towards the leaderboards', 'Not recorded') },
};

const settingLabel = (key) =>
    SETTINGS[key]?.label ?? key.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

const settingValue = (key, raw) => {
  const shown = SETTINGS[key]?.value(String(raw));
  if (shown != null) return shown;
  return raw === 'true' ? 'On' : raw === 'false' ? 'Off' : String(raw);
};

/*
 * Replay pacing. A fixed wall-clock played EVERY match at the same speed —
 * a 20-minute quickie and a 90-minute grind compressed into the same eight
 * seconds, so the longer the match, the more unreadably the race flashed by.
 * The replay is paced on the match instead: one wall second per two match
 * minutes (1:120), clamped to 10–24 seconds so quickies and marathons both
 * stay inside the readable band.
 */
const replayMs = (matchSecs) =>
    Math.min(24000, Math.max(10000, (matchSecs * 1000) / 120));

export function MatchDetail({ matchId, onBack, onOpenPlayer }) {
  const state = useAsync(() => loadMatch(matchId), [matchId]);

  return (
      <AsyncView
          state={state}
          loadingLabel="Loading match…"
          notFound={<MatchGone onBack={onBack} />}
      >
        {(match) => <MatchDetailBody match={match} onBack={onBack} onOpenPlayer={onOpenPlayer} />}
      </AsyncView>
  );
}

/* A match fetched by id that comes back 404 is the "aged out of the feed" case — the result still
 * exists server-side, the feed just no longer lists it. Extracted so the 404 branch can show it. */
function MatchGone({ onBack }) {
  return (
      <div className="fib-page">
        <Empty
            title="That match isn’t here"
            action={<button type="button" className="fib-btn" onClick={onBack}>Back to matches</button>}
        >
          The feed keeps the most recent matches. Older ones age out of it, but nothing is
          deleted — the result was written server-side when the match ended.
        </Empty>
      </div>
  );
}

function MatchDetailBody({ match, onBack, onOpenPlayer }) {
  const bodyRef = useRef(null);
  /*
   * Two time sources, strictly ranked. `cursor` is PINNED time — set by the
   * range input or the replay loop, and it survives the pointer leaving the
   * chart. `hover` is TRANSIENT time: it exists only while the pointer is
   * over the trace, wins while present, and evaporates on leave, falling
   * back to whatever is pinned. Hovering the chart therefore never destroys
   * a moment the reader deliberately scrubbed to.
   */
  const [cursor, setCursor] = useState(null);
  const [hover, setHover] = useState(null);
  const [playing, setPlaying] = useState(false);

  /*
   * One inventory open at a time. Expanding a second row while the first is
   * still open would push the standings around underneath the reader, and the
   * comparison this view exists for is between the ROWS, not between two
   * seventy-slot grids fighting for the same screen.
   */
  const [openKey, setOpenKey] = useState(null);
  const toggle = (key) => setOpenKey((current) => (current === key ? null : key));

  const model = useMemo(() => {
    if (!match) return null;
    const entries = raceEntries(match);
    return {
      entries,
      changes: leadChanges(entries),
      changeTimes: leadChangeTimes(entries),
      finalStandings: matchStandings(match),
      rare: match.items
          .filter((i) => ['LEGENDARY', 'RNGESUS', 'EXTRAORDINARY'].includes(i.b2bRarity))
          .slice(0, 8),
    };
  }, [match]);

  // Scrubbing is a live re-rank; at rest the view shows the final result.
  // Hover outranks the pinned cursor only for as long as the pointer stays.
  const t = hover ?? cursor ?? (match ? matchDuration(match) : 0);
  const live = useMemo(
      () => (model ? standingsAt(model.entries, t) : []),
      [model, t],
  );

  // The real final score per competitor, keyed for lookup. `standingsAt` derives a *running item
  // count* from the log — which is the right thing to show WHILE scrubbing (the race unfolding),
  // but is NOT the match's actual score. FIB scores are awarded, tracked as finalScore, and can
  // differ sharply from the item count (a match can log 98 items yet score 59-53). So at rest, the
  // Score column reads the real finalScore; only during a scrub does it show the running count.
  const finalScoreByKey = useMemo(() => {
    const m = new Map();
    for (const row of (model?.finalStandings ?? [])) m.set(row.key, row.score);
    return m;
  }, [model]);

  useFlipRows(bodyRef, live.map((r) => r.entry.key).join('|'));

  /* ── Replay ───────────────────────────────────────────────────────────
     A rAF loop drives the same cursor the scrubber owns, so every piece of
     the view — trace cursor, standings, FLIP — moves together. The replay
     pauses when the tab hides (rAF throttles to nothing there and the clock
     would silently jump) and stops on unmount. */
  /* Wall-clock length of one replay of THIS match; stable while the match is. */
  const replayLength = match ? replayMs(matchDuration(match)) : 10000;

  useEffect(() => {
    if (!playing || !match) return undefined;

    let raf = 0;
    let start = 0;
    const from = cursor ?? 0;

    const tick = (now) => {
      if (!start) start = now;
      const elapsed = ((now - start) / replayLength) * matchDuration(match);
      const next = from + elapsed;
      if (next >= matchDuration(match)) {
        setPlaying(false);
        setCursor(null);
        return;
      }
      setCursor(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onHidden = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', onHidden);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onHidden);
    };
    // `cursor` is deliberately NOT a dependency: the loop captures its start
    // point once. Depending on it would restart the clock on every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, match]);

  const replay = () => {
    if (playing) {
      setPlaying(false);
    } else {
      // A cursor parked at the finish would end the replay on its first
      // frame; rewind instead of no-oping.
      if (cursor != null && match && cursor >= matchDuration(match)) setCursor(null);
      setPlaying(true);
    }
  };

  // match is guaranteed present here (a missing one takes AsyncView's notFound path). model can
  // still be null for a match that carries no per-item race data, which is the same "nothing to
  // replay" case.
  if (!model) {
    return <MatchGone onBack={onBack} />;
  }

  const { entries, changes, changeTimes, rare } = model;
  const scrubbing = hover != null || cursor != null;

  return (
      <div className="fib-page">
        <Section
            title={`${match.mode === 'SOLO' ? 'Solo' : 'Team'} match`}
            sub={`${f.date(match.endedAt)} at ${f.timeOfDay(match.endedAt)} · ${f.duration(matchDuration(match))}`}
            aside={
              <button type="button" className="fib-btn fib-btn--quiet" onClick={onBack}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 6l-6 6 6 6" />
                </svg>
                Matches
              </button>
            }
        >
          <div className="fib-stat-strip" style={{ marginTop: 0, marginBottom: 'var(--fib-space-6)' }}>
            <Figure size="sm" value={entries.length} label={match.mode === 'SOLO' ? 'Players' : 'Teams'} />
            <Figure size="sm" value={match.items.filter((i) => !i.skipped).length} label="Items collected" />
            {/* Diamond, not gold: a contested match is exceptional, but gold in
              this module means rank, and nobody placed here by changing lead. */}
            <Figure size="sm" value={changes} label="Lead changes" tone={changes > 3 ? 'diamond' : undefined} />
            <Figure
                size="sm"
                value={match.items.filter((i) => i.skipped).length}
                label="Items skipped"
            />
          </div>

          <RaceTrace
              entries={entries}
              duration={matchDuration(match)}
              cursor={hover ?? cursor}
              labelFor={labelFor}
              markers={changeTimes}
              onScrub={playing ? undefined : setHover}
              iconFor={(entry) => (
                  <span className="fib-lane-faces" aria-hidden="true">
              {entry.members.map((m) => (
                  <Avatar key={idUuid(m)} uuid={idUuid(m)} size={16} />
              ))}
            </span>
              )}
          />

          {/*
          A native range input, styled by the browser. Reinventing a slider for
          flavour is exactly the kind of custom form control the product
          register bans — the native one is draggable, keyboard-steppable and
          screen-reader-labelled for free. The replay button next to it is what
          makes the whole mechanism discoverable.
        */}
          <div className="fib-scrub">
            <div className="fib-scrub-row">
              <button
                  type="button"
                  className="fib-replay"
                  onClick={replay}
                  aria-pressed={playing}
                  aria-label={playing ? 'Pause the replay' : `Replay the match in ${Math.round(replayLength / 1000)} seconds`}
                  title={playing ? 'Pause' : 'Replay the match'}
              >
                {playing ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M8 5.5v13a1 1 0 0 0 1.52.86l10-6.5a1 1 0 0 0 0-1.72l-10-6.5A1 1 0 0 0 8 5.5Z" />
                    </svg>
                )}
              </button>
              <label className="fib-sr" htmlFor="fib-scrub-input">Match time</label>
              <input
                  id="fib-scrub-input"
                  type="range"
                  min={0}
                  max={matchDuration(match)}
                  step={5}
                  value={t}
                  onChange={(e) => {
                    // Grabbing the clock mid-replay is a clear "I'll drive, thanks".
                    if (playing) setPlaying(false);
                    setHover(null);
                    setCursor(Number(e.target.value));
                    setOpenKey(null);
                  }}
                  aria-valuetext={`${f.clock(t)} of ${f.clock(matchDuration(match))}`}
              />
            </div>
            <div className="fib-scrub-foot">
              <span className="fib-meta">{f.clock(t)} / {f.clock(matchDuration(match))}</span>
              {scrubbing ? (
                  <button type="button" className="fib-btn fib-btn--quiet" onClick={() => { setPlaying(false); setHover(null); setCursor(null); }}>
                    Jump to final result
                  </button>
              ) : (
                  <span className="fib-meta">Drag, hover the chart, or press play — every tick is a lead change</span>
              )}
            </div>
          </div>
        </Section>

        <Section
            title={scrubbing ? `Standings at ${f.clock(t)}` : 'Final standings'}
            sub={scrubbing ? 'Rows move as the lead changes.' : undefined}
        >
          <div className="fib-panel fib-panel--flush fib-table-wrap">
            <table className="fib-table">
              <caption className="fib-sr">
                Standings {scrubbing ? `at ${f.clock(t)}` : 'at the end of the match'}
              </caption>
              <thead>
              <tr>
                <th scope="col" style={{ width: 60 }}>#</th>
                <th scope="col">{match.mode === 'SOLO' ? 'Player' : 'Team'}</th>
                <th scope="col" data-num>Score</th>
                <th scope="col" data-num>Found</th>
                <th scope="col" data-num>Skipped</th>
                <th scope="col" data-num>Gap</th>
                <th scope="col"><span className="fib-sr">Items collected</span></th>
              </tr>
              </thead>
              <tbody ref={bodyRef}>
              {live.map((row) => {
                const key = row.entry.key;
                const open = openKey === key;
                const panelId = `fib-inv-${match.matchId}-${key}`;
                return (
                    <React.Fragment key={key}>
                      <tr
                          data-flip-key={key}
                          data-open={open || undefined}
                          /*
                           * Convenience only. The row is not a button — it already
                           * contains player buttons, and nesting interactive
                           * elements breaks both semantics and keyboard order. The
                           * real control is the toggle in the last cell; this just
                           * lets a mouse hit the whole row, ignoring clicks that
                           * were meant for something else inside it.
                           */
                          onClick={(e) => {
                            if (e.target.closest('button')) return;
                            toggle(key);
                          }}
                      >
                        <td><Medal place={row.pos} /></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--fib-space-3)', flexWrap: 'wrap' }}>
                            {row.entry.members.map((m) => (
                                <button
                                    key={idUuid(m)}
                                    type="button"
                                    className="fib-cell-player"
                                    onClick={() => onOpenPlayer?.(idUuid(m))}
                                >
                                  <Avatar uuid={idUuid(m)} size={24} />
                                  <span>{idLabel(m)}</span>
                                </button>
                            ))}
                          </div>
                        </td>
                        <td data-num style={{ color: row.pos === 1 ? 'var(--fib-gold)' : undefined }}>
                          {scrubbing ? row.score : (finalScoreByKey.get(row.entry.key) ?? row.score)}
                        </td>
                        <td data-num>{row.found}</td>
                        <td data-num style={{ color: 'var(--fib-netherite)' }}>{row.skipped}</td>
                        <td data-num style={{ color: 'var(--fib-netherite)' }}>
                          {row.gap === 0 ? '—' : row.gap}
                        </td>
                        <td data-num>
                          <button
                              type="button"
                              className="fib-inv-toggle"
                              aria-expanded={open}
                              aria-controls={panelId}
                              onClick={() => toggle(key)}
                          >
                          <span className="fib-sr">
                            {open ? 'Hide' : 'Show'} the items {labelFor(row.entry)} collected
                          </span>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="m7 10 5 5 5-5" />
                            </svg>
                          </button>
                        </td>
                      </tr>

                      {open ? (
                          <tr className="fib-inv-drawer" data-flip-key={`${key}~inv`}>
                            <td colSpan={7} id={panelId}>
                              <Inventory
                                  entry={row.entry}
                                  duration={matchDuration(match)}
                                  ownerLabel={labelFor(row.entry)}
                                  mode={match.mode}
                              />
                            </td>
                          </tr>
                      ) : null}
                    </React.Fragment>
                );
              })}
              </tbody>
            </table>
          </div>
        </Section>

        {rare.length > 0 ? (
            <Section title="Rare pulls" sub="Back-to-backs at Legendary tier or above.">
              <div className="fib-shelf">
                {rare.map((item, i) => (
                    <figure key={`${item.itemName}-${i}`} className="fib-artifact fib-sprite-lift">
                      <Sprite name={item.itemName} size={64} pad={16} tier={item.b2bRarity} />
                      <figcaption>
                        <b>{f.itemLabel(item.itemName)}</b>
                        <RarityTag tier={item.b2bRarity} />
                        <span className="fib-meta">{f.timeOfDay(item.collectedAt)}</span>
                      </figcaption>
                    </figure>
                ))}
              </div>
            </Section>
        ) : null}

        <Section title="Settings" sub="The rules this match was played under.">
          <dl className="fib-settings">
            {Object.entries(match.settings).map(([k, v]) => (
                <div key={k}>
                  <dt>{settingLabel(k)}</dt>
                  <dd>{settingValue(k, v)}</dd>
                </div>
            ))}
          </dl>
          <p className="fib-meta" style={{ marginTop: 'var(--fib-space-4)' }}>
            Match {match.matchId}
          </p>
        </Section>
      </div>
  );
}
