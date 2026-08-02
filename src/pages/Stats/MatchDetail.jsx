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
  idLabel, idUuid,
} from './adapter.js';
import { useFlipRows } from './useFlip.js';
import { loadMatch } from './api.js';
import { useAsync } from './useAsync.js';
import { Section, Avatar, Medal, Sprite, Empty, Figure, RarityTag, AsyncView } from './Primitives.jsx';
import { Inventory } from './Inventory.jsx';
import { RaceTrace } from './Charts.jsx';
import * as f from './format.js';

const labelFor = (row) => row.members.map(idLabel).join(' & ');

/* Who pulled an item. A solo match logs the puller on the item itself, but a TEAM match logs only
   the teamIndex — `item.player` is null there, so reading it directly printed "Unknown" against
   every team pull. The standings already hold each competitor's members under the same key the item
   is filed by, so a team pull is labelled with the roster, exactly like its standings row and like
   the overview's rare-moments feed. "Unknown" is left for a row with neither: genuinely malformed. */
const pullActor = (standings, item) => {
  if (item.player) return idLabel(item.player);
  const row = standings.find((r) => r.key === `t${item.teamIndex}`);
  return row ? labelFor(row) : 'Unknown';
};

/* An absolute collection timestamp as an offset into the match, so a pull can be
   quoted on the same clock the scrubber runs. Clamped at zero: an item logged a
   beat before `startedAt` is clock skew, not a negative match time. */
const atMatchTime = (match, at) =>
    Math.max(0, (new Date(at).getTime() - new Date(match.startedAt).getTime()) / 1000);

/**
 * Server setting keys, in the wiki's own words.
 *
 * The keys arrive as the server stores them — `KEEP_INVENTORY`, `BACKPACKSIZE`,
 * `FASTER_RANDOM_TICK` — with stringly-typed values (`"true"`, `"3"`).
 * Lowercasing the key and printing the raw value shipped `keep inventory / true`
 * to players, which is the server's vocabulary leaking through a page written
 * for the people who played the match.
 *
 * Every name and phrasing below is taken from `pages/GameSettings.jsx`, which is
 * where this project documents what each setting DOES, so a setting reads the
 * same on both pages. That file is the source; this is not a second vocabulary.
 * Values are condensed to a clause because they live in a right-aligned column
 * roughly 34 characters wide — the wiki's full sentences ("Crops, trees & leaves
 * grow/decay faster") are written for a page that gives each setting a
 * paragraph, and this one gives it a line.
 *
 * ── Why this map was completed ──
 *
 * It used to carry nine keys and let the other fifteen fall through to a
 * humanised key plus the raw value. That was never wrong, but it was a page
 * mostly written by the database: "Faster random tick / On", "Positions / On",
 * "Chain / Off". Worse, it printed BACKPACK and BACKPACKSIZE as two rows both
 * labelled "Backpack", one saying "On" and one saying "5 rows", which reads as a
 * bug rather than as two settings.
 *
 * The fall-through is kept — a key the server adds tomorrow still renders, in
 * an "Other" group, rather than vanishing from a page that claims to list the
 * rules the match was played under.
 */
const yesNo = (on, off) => (v) => (v === 'true' ? on : off);

/*
 * The wiki's categories, minus one.
 *
 * `GameSettings.jsx` files PvP under its own "Combat" heading, which earns a
 * section on a page that gives every category an icon, a description and room to
 * breathe. Here it would be a heading over a single row — scaffolding for a
 * scale the data does not have — so PvP joins Survival, whose other two members
 * (Food, KeepInventory) are the same question: what happens to you out there.
 */
const SETTING_GROUPS = [
  { id: 'mode', name: 'Game mode' },
  { id: 'pool', name: 'Item pool' },
  { id: 'survival', name: 'Survival' },
  { id: 'gameplay', name: 'Gameplay' },
  { id: 'progression', name: 'Progression' },
  { id: 'other', name: 'Other' },
];

/* Ordered within each group by what decides a match, not alphabetically: the
   format and the difficulty are what a reader came to check. */
const SETTINGS = {
  /* Game mode */
  TEAM: { group: 'mode', label: 'Format', value: yesNo('Teams', 'Solo') },
  RUN: { group: 'mode', label: 'RunBattle', value: yesNo('Only the first finder scores', 'Everyone can score the same item') },
  CHAIN: { group: 'mode', label: 'ForceChain', value: yesNo('Current + next item shown', 'Only the current item shown') },
  TEAM_CHAT: { group: 'mode', label: 'Team Chat', value: yesNo('Visible to teammates only', 'All chat is global') },

  /* Item pool */
  HARD: { group: 'pool', label: 'Hard', value: yesNo('Late items included', 'Late items excluded') },
  NETHER: { group: 'pool', label: 'Nether', value: yesNo('Portal open, nether items in the pool', 'Disabled') },
  END: { group: 'pool', label: 'End', value: yesNo('Portal open, end items in the pool', 'Disabled') },
  EXTREME: { group: 'pool', label: 'Extreme', value: yesNo('All obtainable items', 'Only reasonably obtainable items') },
  QUICKIE: {
    group: 'pool',
    label: 'Quickie',
    value: (v) => ['Disabled', 'Early only', 'Early + Mid'][Number(v)] ?? v,
  },

  /* Survival */
  PVP: { group: 'survival', label: 'PvP', value: yesNo('Players can attack each other', 'No player damage') },
  FOOD: { group: 'survival', label: 'Food', value: yesNo('Normal hunger', 'No hunger drain') },
  KEEP_INVENTORY: { group: 'survival', label: 'KeepInventory', value: yesNo('Items kept on death', 'Items dropped on death') },

  /* Gameplay */
  BACKPACK: { group: 'gameplay', label: 'Backpack', value: yesNo('Extra inventory slots', 'Standard 36 slots') },
  BACKPACKSIZE: {
    group: 'gameplay',
    label: 'Backpack Rows',
    value: (v) => (v === '0' ? 'None' : `${v} ${Number(v) === 1 ? 'row' : 'rows'}`),
  },
  POSITIONS: { group: 'gameplay', label: 'Position System', value: yesNo('Positions can be shared', '/pos is disabled') },
  ELYTRA: { group: 'gameplay', label: 'Elytra Gliding', value: yesNo('Gliding allowed', 'Gliding disabled') },
  HARDER_TRACKERS: { group: 'gameplay', label: 'Harder Trackers', value: yesNo('Harder tracker recipes', 'Standard tracker recipes') },
  FASTER_RANDOM_TICK: { group: 'gameplay', label: 'Faster Plants', value: yesNo('Crops and trees grow faster', 'Vanilla growth speeds') },
  TRADING: { group: 'gameplay', label: 'Player Trading', value: yesNo('Players can trade items', 'Trading disabled') },
  /* Minutes, per the wiki's own "3 min". A bare "3" beside "Trading Cooldown"
     is a number with no unit, which is the one thing this module never ships. */
  TRADING_COOLDOWN: {
    group: 'gameplay',
    label: 'Trading Cooldown',
    value: (v) => (v === '0' ? 'None' : `${v} min`),
  },
  RANDOM_EVENTS: { group: 'gameplay', label: 'Random Events', value: yesNo('Fires 3–4 times an hour', 'No random events') },
  EVENT: { group: 'gameplay', label: 'Event Modifiers', value: yesNo('Tournament rules', 'Standard rules') },

  /* Progression */
  STATS: { group: 'progression', label: 'Stats', value: yesNo('Counted towards the leaderboards', 'Not recorded') },
  SCORE: { group: 'progression', label: 'Score', value: yesNo('Visible to all players', 'Hidden until the round ends') },
  ACHIEVEMENTS: { group: 'progression', label: 'Achievements', value: yesNo('Earned this round', 'Not tracked') },
};

/* The render order inside a group is this map's key order, which is authored
   above; `Object.keys` on a plain object preserves it for string keys. */
const SETTING_ORDER = Object.keys(SETTINGS);

const settingLabel = (key) =>
    SETTINGS[key]?.label ?? key.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

const settingValue = (key, raw) => {
  const shown = SETTINGS[key]?.value(String(raw));
  if (shown != null) return shown;
  return raw === 'true' ? 'On' : raw === 'false' ? 'Off' : String(raw);
};

/**
 * The match's settings, bucketed into the groups above and ordered within each.
 *
 * Only groups the server actually sent keys for are returned, so a payload that
 * drops a whole category (no team settings on a solo match, say) leaves no empty
 * heading behind.
 */
function groupSettings(settings) {
  const seen = new Set();
  const buckets = new Map(SETTING_GROUPS.map((g) => [g.id, []]));

  for (const key of SETTING_ORDER) {
    if (!(key in settings)) continue;
    seen.add(key);
    buckets.get(SETTINGS[key].group).push(key);
  }
  // Anything the server knows about and this file does not, kept rather than
  // dropped: an unlisted rule is still a rule the match was played under.
  for (const key of Object.keys(settings)) {
    if (!seen.has(key)) buckets.get('other').push(key);
  }

  return SETTING_GROUPS
      .map((g) => ({ ...g, keys: buckets.get(g.id) }))
      .filter((g) => g.keys.length > 0);
}

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

  /*
   * At rest the table reads the RESULT; only a scrub reads the race.
   *
   * `standingsAt` derives everything from the item log — a running count, and a
   * position ranked on that count. While scrubbing that is exactly right: it is
   * the race unfolding, and no final placement exists yet at 12:04. At rest it
   * is the wrong source for three of the columns, and each was wrong in its own
   * way:
   *
   *   Score  an item count is NOT the match's score. FIB scores are awarded and
   *          stored as `finalScore`, and the two can diverge sharply — a match
   *          can log 98 items and finish 59-53.
   *   #      the placement is the server's, and the server resolves ties. Two
   *          players level on 28 both place 2nd; ranking them by row index put
   *          a silver medal on one and a bronze on the other.
   *   Gap    computed against the leader's item count, so it could contradict
   *          the Score column standing beside it in the same row.
   *
   * All three live on `row.entry`, which `raceEntries` spreads straight off
   * `matchStandings` — the server's own participant record. No lookup table
   * needed: the final figure is already on the row.
   */
  const finalLead = model?.finalStandings?.[0]?.score ?? 0;

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

  const { entries, changes, changeTimes, rare, finalStandings } = model;
  const scrubbing = hover != null || cursor != null;

  /* The three columns that switch source between the race and the result, resolved
     once per render. The placement falls back to the derived position for a match
     whose participants carry no usable one, rather than printing the 0 that would
     arrive from `matchStandings`. */
  const placeOf = (r) => (scrubbing || !(r.entry.placement > 0) ? r.pos : r.entry.placement);
  const table = live.map((row) => ({
    row,
    place: placeOf(row),
    score: scrubbing ? row.score : row.entry.score,
    gap: scrubbing ? row.gap : row.entry.score - finalLead,
  }));

  /* Places held by more than one competitor. A shared place is stated, not left
     to be inferred: a sighted reader has the equal Score and Gap in the same two
     rows as corroboration, and a screen reader hearing "2" then "2" down a column
     has nothing but the repetition. */
  const sharedPlaces = new Set(
      table.map((r) => r.place).filter((p, i, all) => all.indexOf(p) !== i),
  );

  /*
   * Is anybody actually ahead of anybody?
   *
   * Every scrub before the first item lands has the whole field on nothing, and
   * ranking equals honestly means they all place first — which printed seven gold
   * medals and seven gold zeroes over a race that had not started. A standing is a
   * separation, so where there is none the column says so and no score is gilded.
   * The instant one competitor scores, the medals are real again.
   */
  const separated = new Set(table.map((r) => r.place)).size > 1;

  return (
      <div className="fib-page">
        <Section
            title={`${match.mode === 'SOLO' ? 'Solo' : 'Team'} match`}
            /* `hours`, not `duration`: a match that runs past the hour reads
               "60m 3s" through the latter, which is a number the reader has to
               convert, and this page already prints "1:00:03" on the scrubber
               eighty pixels below it. */
            sub={`${f.date(match.endedAt)} at ${f.timeOfDay(match.endedAt)} · ${f.hours(matchDuration(match))}`}
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
            /* An all-square field says so rather than leaving seven dashes in the
               "#" column to be puzzled over. */
            sub={scrubbing
                ? (separated ? 'Rows move as the lead changes.' : 'Every competitor is level — no standing yet.')
                : undefined}
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
              {table.map(({ row, place, score, gap }) => {
                const key = row.entry.key;
                const open = openKey === key;
                const panelId = `fib-inv-${match.matchId}-${key}`;
                const tied = sharedPlaces.has(place);
                return (
                    <React.Fragment key={key}>
                      <tr
                          className="fib-row-toggle"
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
                        <td>
                          <Medal place={separated ? place : null} />
                          {separated && tied ? <span className="fib-sr">, tied</span> : null}
                        </td>
                        <td>
                          <div className="fib-cell-players">
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
                        <td data-num style={{ color: separated && place === 1 ? 'var(--fib-gold)' : undefined }}>
                          {score}
                        </td>
                        <td data-num>{row.found}</td>
                        <td data-num style={{ color: 'var(--fib-netherite)' }}>{row.skipped}</td>
                        <td data-num style={{ color: 'var(--fib-netherite)' }}>
                          {gap === 0 ? '—' : gap}
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
                        {/*
                          Who, and when in the MATCH — not what the wall clock
                          said. Everything else on this page is on match time
                          (the scrubber, the standings heading, the lead-change
                          ticks), so "22:07" was the one figure a reader could
                          not place against the race they had just scrubbed
                          through. The name is plain text rather than a link:
                          the standings above own player navigation, and a
                          second, differently-shaped way to open a profile is
                          the "save button" problem.
                        */}
                        <span className="fib-meta">
                          {pullActor(finalStandings, item)} · {f.clock(atMatchTime(match, item.collectedAt))}
                        </span>
                      </figcaption>
                    </figure>
                ))}
              </div>
            </Section>
        ) : null}

        <Section title="Settings" sub="The rules this match was played under.">
          {groupSettings(match.settings).map((group) => (
              <div className="fib-settings-group" key={group.id}>
                <h3 className="fib-label fib-settings-head">{group.name}</h3>
                <dl className="fib-settings">
                  {group.keys.map((k) => (
                      <div key={k}>
                        <dt>{settingLabel(k)}</dt>
                        <dd>{settingValue(k, match.settings[k])}</dd>
                      </div>
                  ))}
                </dl>
              </div>
          ))}
          <p className="fib-meta fib-match-id">Match {match.matchId}</p>
        </Section>
      </div>
  );
}
