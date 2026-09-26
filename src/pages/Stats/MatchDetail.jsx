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

import React, { useEffect, useMemo, useState } from 'react';
import {
  matchStandings, matchDuration, raceEntries, standingsAt, leadChanges, leadChangeTimes,
  idUuid, matchHeadline,
} from './adapter.js';
import { loadMatch } from './api.js';
import { useAsync } from './useAsync.js';
import { Section, Avatar, Empty, AsyncView, Segmented } from './Primitives.jsx';
import { LiveBoard, RoundRecords, TeamReport } from './MatchReport.jsx';
import { labelFor, phaseSchedule, runOf } from './matchModel.js';
import { RibbonRace } from './Charts.jsx';
import * as f from './format.js';


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
  /* The chart's window, in match seconds. `to` of Infinity means "the end",
     resolved against the duration below, so the state needs no match to exist. */
  const [winState, setWin] = useState({ from: 0, to: Infinity });

  const model = useMemo(() => {
    if (!match) return null;
    const entries = raceEntries(match);
    const changeTimes = leadChangeTimes(entries);
    return {
      entries,
      changes: leadChanges(entries),
      changeTimes,
      finalStandings: matchStandings(match),
      runs: entries.map(runOf),
      phases: phaseSchedule(matchDuration(match), match.settings ?? {}),
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


  /* ── Replay ───────────────────────────────────────────────────────────
     A rAF loop drives the same cursor the scrubber owns, so every piece of
     the view — trace cursor, standings, FLIP — moves together. The replay
     pauses when the tab hides (rAF throttles to nothing there and the clock
     would silently jump) and stops on unmount. */
  /*
   * The replay plays the chart's WINDOW, not always the whole match. Choosing
   * "The finish" and pressing play used to start at 0:00 and spend most of the
   * replay on forty minutes the reader had just zoomed away from. It now runs
   * from the window's start - or from the cursor, when the reader has already
   * scrubbed to a point inside it - to the window's end, paced on the window's
   * own length so a sixteen-minute finish plays at a speed it can be read at.
   *
   * At the end of a window that reaches the final whistle the cursor clears and
   * the page shows the result, as before. A window that ends mid-match leaves
   * the cursor parked on its last moment, so the board still describes the
   * stretch that was just watched rather than jumping to the final score.
   */
  const matchEnd = match ? matchDuration(match) : 0;
  const replayFrom = Math.max(0, Math.min(winState.from, matchEnd));
  const replayTo = Math.min(matchEnd, winState.to);
  const replayLength = replayMs(Math.max(1, replayTo - replayFrom));

  useEffect(() => {
    if (!playing || !match) return undefined;

    let raf = 0;
    let start = 0;
    const from = cursor != null && cursor >= replayFrom && cursor < replayTo ? cursor : replayFrom;

    const tick = (now) => {
      if (!start) start = now;
      const elapsed = ((now - start) / replayLength) * (replayTo - replayFrom);
      const next = from + elapsed;
      if (next >= replayTo) {
        setPlaying(false);
        setCursor(replayTo >= matchEnd ? null : replayTo);
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
    // point once. Depending on it would restart the clock on every frame. The
    // window IS one: changing it mid-replay restarts inside the new window.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, match, replayFrom, replayTo]);

  const replay = () => {
    if (playing) {
      setPlaying(false);
    } else {
      // A cursor parked at the window's end, or outside the window, would end
      // the replay on its first frame or play a stretch nobody is looking at;
      // rewind to the window's start instead.
      if (cursor != null && (cursor >= replayTo || cursor < replayFrom)) setCursor(null);
      setPlaying(true);
    }
  };

  // match is guaranteed present here (a missing one takes AsyncView's notFound path). model can
  // still be null for a match that carries no per-item race data, which is the same "nothing to
  // replay" case.
  if (!model) {
    return <MatchGone onBack={onBack} />;
  }

  const { entries, changes, changeTimes, finalStandings, runs, phases } = model;
  const scrubbing = hover != null || cursor != null;
  const duration = matchDuration(match);
  const headline = matchHeadline(match, changeTimes.length ? changeTimes[changeTimes.length - 1] : null);

  /* The three board columns that switch source between the race and the result,
     resolved once per render. At rest the placement and score are the server's
     (see "At rest the board reads the RESULT" above); while scrubbing they are
     the race's. */
  const placeOf = (r) => (scrubbing || !(r.entry.placement > 0) ? r.pos : r.entry.placement);
  const board = live.map((row) => ({
    entry: row.entry,
    place: placeOf(row),
    score: scrubbing ? row.score : row.entry.score,
    gap: scrubbing ? row.gap : row.entry.score - finalLead,
  }));
  const shared = new Set(board.map((r) => r.place).filter((p, i, all) => all.indexOf(p) !== i));
  /* Is anybody ahead of anybody? Before the first item lands, no. A standing is
     a separation, so where there is none the board prints no places at all. */
  const separated = new Set(board.map((r) => r.place)).size > 1;

  const totalPulls = runs.reduce((n, r) => n + r.pulls.length, 0);

  /*
   * Where "the finish" starts: five minutes before the last lead change, or the
   * final quarter of the match, whichever is earlier - so the window always
   * holds the decisive turn with some run-up, and a match whose lead never
   * changed still zooms onto its last quarter. Rounded down to a whole minute.
   */
  const lastTurn = changeTimes.length ? changeTimes[changeTimes.length - 1] : duration;
  const finishFrom = Math.max(0, Math.floor(Math.min(duration * 0.75, lastTurn - 300) / 60) * 60);
  const win = { from: Math.max(0, winState.from), to: Math.min(duration, winState.to) };
  const windowId = win.from === 0 && win.to === duration ? 'all'
    : win.from === finishFrom && win.to === duration ? 'finish' : 'custom';
  const [winner, runnerUp] = finalStandings;

  return (
      <div className="fib-page">
        <header className="fib-match-head">
          <button type="button" className="fib-btn fib-btn--quiet fib-hero-back" onClick={onBack}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 6l-6 6 6 6" />
            </svg>
            Matches
          </button>
          <div className="fib-match-head-grid">
            <div className="fib-match-head-copy">
              {/* The same headline the overview's featured match carries, so the
                  story a reader clicked on is the story this page opens with. */}
              <h1 className="fib-display fib-match-title">{headline.text}</h1>
              {/* `hours`, not `duration`: past the hour, "60m 3s" is a number the
                  reader has to convert, and the scrubber below prints "1:00:03". */}
              <p className="fib-lead-sub">
                {match.mode === 'SOLO' ? 'Solo' : 'Team'} match · {f.date(match.endedAt)} at {f.timeOfDay(match.endedAt)} · {f.hours(duration)}
              </p>
            </div>
            {winner ? (
              <div className="fib-lead-board" aria-label={runnerUp ? `Final score ${winner.score} to ${runnerUp.score}` : `Final score ${winner.score}`}>
                <span className="fib-lead-board-side">
                  {winner.members.map((m) => <Avatar key={idUuid(m)} uuid={idUuid(m)} size={44} />)}
                </span>
                <span className="fib-lead-board-score">
                  <b data-side="win">{winner.score}</b>
                  {runnerUp ? <><i aria-hidden="true">–</i><b>{runnerUp.score}</b></> : null}
                </span>
                {runnerUp ? (
                  <span className="fib-lead-board-side" data-side="lose">
                    {runnerUp.members.map((m) => <Avatar key={idUuid(m)} uuid={idUuid(m)} size={44} />)}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* The round in one line, the overview's ledger shape: counts said as a
              sentence rather than four equal cells. */}
          <p className="fib-ledger fib-match-ledger">
            <span><b>{entries.length}</b> {match.mode === 'SOLO' ? 'players' : 'teams'}</span>
            <span><b>{match.items.filter((i) => !i.skipped).length}</b> items found</span>
            <span><b>{match.items.filter((i) => i.skipped).length}</b> skipped</span>
            <span><b>{totalPulls}</b> back-to-backs</span>
            <span data-hot={changes >= 5 || undefined}><b>{changes}</b> lead {changes === 1 ? 'change' : 'changes'}</span>
          </p>
        </header>

        <section className="fib-section fib-match-race" aria-label="The race">
          {/* The window the chart shows. Two presets, and whatever range the
              reader drags across the pace strip, which shows up here as a third
              option so the control always says what is on screen. The window is
              a lens on the chart only; the scrubber and the board run on the
              whole match clock. */}
          <div className="fib-timeline-bar">
            <Segmented
                options={[
                  { id: 'all', label: 'Whole round' },
                  { id: 'finish', label: `The finish · ${f.clock(finishFrom)}–${f.clock(duration)}` },
                  ...(windowId === 'custom' ? [{ id: 'custom', label: `${f.clock(win.from)}–${f.clock(win.to)}` }] : []),
                ]}
                value={windowId}
                onChange={(id) => {
                  if (id === 'all') setWin({ from: 0, to: duration });
                  if (id === 'finish') setWin({ from: finishFrom, to: duration });
                }}
                label="Chart range"
            />
            <span className="fib-meta">Drag across the pace bars to zoom into any stretch</span>
          </div>

          <RibbonRace
              entries={entries}
              duration={duration}
              from={win.from}
              to={win.to}
              onWindow={(from, to) => setWin({ from, to })}
              cursor={hover ?? cursor}
              phases={phases}
              changeTimes={changeTimes}
              labelFor={labelFor}
              onScrub={playing ? undefined : setHover}
          />

          {/*
          A native range input, styled by the browser. The native one is
          draggable, keyboard-steppable and screen-reader-labelled for free; the
          replay button next to it is what makes the whole mechanism discoverable.
        */}
          <div className="fib-scrub">
            <div className="fib-scrub-row">
              <button
                  type="button"
                  className="fib-replay"
                  onClick={replay}
                  aria-pressed={playing}
                  aria-label={playing
                    ? 'Pause the replay'
                    : `Replay ${windowId === 'all' ? 'the match' : `${f.clock(win.from)} to ${f.clock(win.to)}`} in ${Math.round(replayLength / 1000)} seconds`}
                  title={playing ? 'Pause' : windowId === 'all' ? 'Replay the match' : `Replay ${f.clock(win.from)}–${f.clock(win.to)}`}
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
                  max={duration}
                  step={5}
                  value={t}
                  onChange={(e) => {
                    // Grabbing the clock mid-replay is a clear "I'll drive, thanks".
                    if (playing) setPlaying(false);
                    setHover(null);
                    setCursor(Number(e.target.value));
                  }}
                  aria-valuetext={`${f.clock(t)} of ${f.clock(duration)}`}
              />
            </div>
            <div className="fib-scrub-foot">
              <span className="fib-meta">{f.clock(t)} / {f.clock(duration)}</span>
              {scrubbing ? (
                  <button type="button" className="fib-btn fib-btn--quiet" onClick={() => { setPlaying(false); setHover(null); setCursor(null); }}>
                    Jump to final result
                  </button>
              ) : (
                  <span className="fib-meta">Drag, hover the chart, or press play</span>
              )}
            </div>
          </div>

          <h2 className="fib-board-title">
            {scrubbing ? `Standings at ${f.clock(t)}` : 'Final standings'}
            {scrubbing && !separated ? <span className="fib-meta"> · everyone level, no standing yet</span> : null}
          </h2>
          <LiveBoard rows={board} at={t} live={scrubbing} separated={separated} shared={shared} onOpenPlayer={onOpenPlayer} />
        </section>

        <Section title="The round's records" sub="The extremes across every team, on the match clock.">
          <RoundRecords entries={entries} runs={runs} />
        </Section>

        <Section
            title={match.mode === 'SOLO' ? 'Every player\u2019s round' : 'Every team\u2019s round'}
            sub="Each run in collection order: the pool phase on the floor of every slot, a back-to-back on its rim, skips greyed."
        >
          <div className="fib-reports">
            {finalStandings.map((row, i) => {
              const entry = entries.find((e) => e.key === row.key) ?? entries[i];
              const run = runs[entries.indexOf(entry)];
              return (
                  <TeamReport
                      key={row.key}
                      entry={entry}
                      run={run}
                      place={row.placement > 0 ? row.placement : i + 1}
                      lead={finalLead}
                      won={row.won}
                      duration={duration}
                      mode={match.mode}
                      at={scrubbing ? t : null}
                      onOpenPlayer={onOpenPlayer}
                  />
              );
            })}
          </div>
        </Section>

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
