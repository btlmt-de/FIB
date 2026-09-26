/**
 * FIB Stats — the overview.
 *
 * ── The page opens on a story, then sets the scale ──
 *
 * The headline is the week's most contested match, told in one line the match
 * record can prove ("apppaa & CH0RD came through late against eltobito &
 * rzem" - see `matchHeadline`), set in the jersey at the top of the page, with
 * the race drawn underneath and the winner's haul of items trailing into its
 * finish line. Then the server totals, then the podium beside the form guide,
 * then the two recent-event feeds.
 *
 * *This order is a reversal, and the losing argument is a real one.* The page
 * used to open on the four server totals under a "Statistics" heading, on the
 * rule "Scale Sets the Scale": a reader who meets a personal number before the
 * field's number has nothing to judge it against. That still holds, and it is
 * why the totals come second and not last - they sit above every personal
 * number on the page. What it got wrong was the very top. Four numerals under
 * a page title is the hero-metric template every dashboard opens with, and a
 * September 2026 critique found the page had no identity for exactly that
 * reason: nothing above the fold was about this game, these players, or an
 * item. A match headline is none of those things' yardstick, so it can lead.
 *
 * ── The two feeds carry different furniture ──
 *
 * Latest matches are scoreboard lines (MatchVersus, the same row the match
 * history uses): both sides facing across the score, because a match is two
 * sides and a result, and a list of winners alone made every row look alike.
 *
 * Rarest moments became a shelf of lit wells, the same artifacts the match
 * page shows its rare pulls on. A legendary back-to-back is an object before
 * it is an event, and at 32px in a row it was a thumbnail beside a sentence.
 *
 * The wins feed used to open every row with a gold "1" medal and bury the
 * score inside the sentence. Both were wrong for the same reason: the section
 * is titled "Latest wins", so first place is a constant, and eleven identical
 * gold pills spent the module's rank colour on the one part of the row that
 * could not vary.
 *
 * ── The podium is all-time, not weekly ──
 *
 * The top three by total wins, Solo / Teams. All-time because it is a stable
 * thing a returning visitor can check against, and because there is no
 * windowed leaderboard endpoint. Both boards arrive with the dashboard and the
 * toggle switches between them in memory.
 *
 * ── The form guide is the people layer ──
 *
 * The community is nine players and ninety-odd matches, mostly the same five
 * people in rotating duos. At that size the people are the story, and the
 * podium's all-time totals cannot say who is playing well NOW. The form guide
 * does, from the ten matches the dashboard already carries: one column per
 * match, one row per player, gold where they won. Nothing is fetched for it.
 *
 * ── Motion ──
 *
 *   the race      one wipe left to right, so the lanes run in match time
 *   the totals    count up, because a total is a quantity accumulating
 *   the podium    heads land on their blocks bronze, silver, gold
 *
 * Everything on this page is a route into somewhere else. No dead ends.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
    matchDuration, idLabel, idUuid, raceEntries, leadChangeTimes, timeAgo, matchHeadline,
} from './adapter.js';
import { loadOverview } from './api.js';
import { useAsync } from './useAsync.js';
import { usePendingReveal } from './useSeen.js';
import {
    Section, Avatar, Sprite, RarityTag, Reveal, Delta, Segmented, Podium, MatchVersus,
    AsyncView,
} from './Primitives.jsx';
import { RaceMini } from './Charts.jsx';
import * as f from './format.js';

/* The two scopes the podium toggles between. `key` indexes data.podiums and is
   the UI's own vocabulary; the upstream path for `teams` is the combined board,
   a translation that lives in the fetch layer, not here. */
const PODIUM_SCOPES = [
    { key: 'solo', label: 'Solo' },
    { key: 'teams', label: 'Teams' },
];

/* Solo finds name the player. Team finds record no individual puller, so the team roster (both
   members) is the actor, joined the same way the match view labels a team. Falls back to "Unknown"
   only for a row with neither — a genuinely malformed moment. */
const momentActor = (m) =>
    (m.player ? idLabel(m.player) : (m.members ?? []).map(idLabel).join(' & ')) || 'Unknown';

/*
 * How many rows the wins feed and how many objects the moments shelf show.
 *
 * Eight: the point where the feed still scans as one glance, and two full rows
 * of the shelf at its widest. Wins carry an "All matches" link into the full
 * feed, so nothing capped here is unreachable. Rare moments have no such view
 * yet — but that list is a highlights reel by definition, and today the
 * endpoint returns fewer than this anyway, so the cap is a guard rather than a
 * truncation.
 */
const FEED_LIMIT = 8;

/*
 * How many of the winner's finds trail the race. Enough to overfill the widest
 * measure (1560px at 44px a well is 35), so the ribbon always runs off its left
 * edge into the fade rather than stopping short of it - an edge the reader can
 * see reads as "that is all of them", and it is not.
 */
const HAUL_LIMIT = 40;

/*
 * The form guide, from the dashboard's recent-match feed.
 *
 * Columns are matches, oldest first, so a column reads down as "who played that
 * one and who won it" and a row reads across as one player's run. A player who
 * sat a match out gets an empty slot rather than being compacted leftward:
 * compacting would put two players' fourth pips under different matches, and
 * the grid's whole claim is that a column is one match.
 *
 * Ordered by wins in the window, then by matches played, then by name - "who is
 * in form" first. Only players who appear in the window are listed; the
 * directory is where everyone else lives.
 */
function formGuide(matches) {
    const chrono = matches.slice().sort((a, b) => a.endedAt - b.endedAt);
    const rows = new Map();
    chrono.forEach((m, col) => {
        (m.participants ?? []).forEach((p) => {
            const uuid = idUuid(p.player);
            if (!uuid) return;
            if (!rows.has(uuid)) {
                rows.set(uuid, { uuid, name: idLabel(p.player), slots: Array(chrono.length).fill(null) });
            }
            rows.get(uuid).slots[col] = { won: !!p.won, matchId: m.matchId };
        });
    });
    return {
        columns: chrono.length,
        rows: [...rows.values()]
            .map((r) => {
                const played = r.slots.filter(Boolean);
                return { ...r, wins: played.filter((s) => s.won).length, played: played.length };
            })
            .sort((a, b) => b.wins - a.wins || b.played - a.played || a.name.localeCompare(b.name)),
    };
}

export function Overview({ onOpenMatch, onOpenPlayer, onOpenItems, onOpenMatches, onOpenLeaderboards }) {
    const state = useAsync(loadOverview, []);

    return (
        <AsyncView state={state} loadingLabel="Loading the overview…">
            {(data) => (
                <OverviewBody
                    data={data}
                    onOpenMatch={onOpenMatch}
                    onOpenPlayer={onOpenPlayer}
                    onOpenItems={onOpenItems}
                    onOpenMatches={onOpenMatches}
                    onOpenLeaderboards={onOpenLeaderboards}
                />
            )}
        </AsyncView>
    );
}

function OverviewBody({ data, onOpenMatch, onOpenPlayer, onOpenItems, onOpenMatches, onOpenLeaderboards }) {
    /* `??`, not a destructuring default. An unavailable section arrives from the dashboard
       composition as JSON null, and a destructuring default only fires on `undefined`. */
    const { podiums, featured, activity } = data;
    const globals = data.globals ?? {};
    const moments = data.moments ?? [];

    const [scope, setScope] = useState('solo');

    /* The visible board follows the toggle. Both are already in memory, so this
       is an index, not a fetch. */
    const podiumRows = useMemo(
        () => (podiums?.[scope] ?? []).slice(0, 3).map((row) => ({
            key: idUuid(row.player),
            place: row.rank,
            value: row.value,
            entrants: [{ uuid: idUuid(row.player), name: idLabel(row.player) }],
        })),
        [podiums, scope],
    );

    /* The heads re-land on toggle via `key={scope}` on the Podium: a new key
       remounts the list, which re-fires this mount-only effect. */
    const podiumRef = useRef(null);
    usePendingReveal(podiumRef, 'ceremony');

    /* The featured race, derived once: lanes, the moments the lead turned, the
       headline, and the winner's haul in the order it was found. */
    const race = useMemo(() => {
        if (!featured) return null;
        const entries = raceEntries(featured);
        const changeTimes = leadChangeTimes(entries);
        const winner = entries[0];
        const finds = (winner?.events ?? []).filter((e) => !e.skipped);
        return {
            entries,
            changeTimes,
            headline: matchHeadline(featured, changeTimes.length ? changeTimes[changeTimes.length - 1] : null),
            finds,
            haul: finds.slice(-HAUL_LIMIT),
        };
    }, [featured]);

    const recent = (activity?.matches ?? []).slice(0, FEED_LIMIT);
    const form = useMemo(() => formGuide(activity?.matches ?? []), [activity]);
    const topMoments = moments.slice(0, FEED_LIMIT);

    return (
        <div className="fib-page fib-page--wide">
            {race?.entries?.length > 0 ? (
                <Reveal as="header" className="fib-lead">
                    <div className="fib-lead-top">
                        <div className="fib-lead-copy">
                            <h1 className="fib-display">{race.headline.text}</h1>
                            <p className="fib-lead-sub">
                                Match of the week: the most contested recent match, where the lead
                                changed hands {featured.leadChanges} {featured.leadChanges === 1 ? 'time' : 'times'}.
                                {' '}{featured.mode === 'SOLO' ? 'Solo' : 'Team'} match over {f.duration(matchDuration(featured))},{' '}
                                <span className="fib-meta">{f.stamp(featured.endedAt)}</span>
                            </p>
                        </div>
                        {/*
                          The result, as a scoreboard: both sides' heads facing across the
                          final score. This slot held two bare figures ("9 lead changes",
                          "46 found") that restated the sentence beside them; the one
                          number the headline does not carry is the score.
                        */}
                        <div className="fib-lead-board">
                            <span className="fib-lead-board-side">
                                {race.entries[0].members.map((m) => (
                                    <Avatar key={idUuid(m) ?? idLabel(m)} uuid={idUuid(m)} size={44} />
                                ))}
                            </span>
                            <span className="fib-lead-board-score" aria-label={race.entries[1]
                                ? `Final score ${race.entries[0].score} to ${race.entries[1].score}`
                                : `Final score ${race.entries[0].score}`}
                            >
                                <b data-side="win">{race.entries[0].score}</b>
                                {race.entries[1] ? <><i aria-hidden="true">–</i><b>{race.entries[1].score}</b></> : null}
                            </span>
                            {race.entries[1] ? (
                                <span className="fib-lead-board-side" data-side="lose">
                                    {race.entries[1].members.map((m) => (
                                        <Avatar key={idUuid(m) ?? idLabel(m)} uuid={idUuid(m)} size={44} />
                                    ))}
                                </span>
                            ) : null}
                        </div>
                    </div>

                    <button
                        type="button"
                        className="fib-lead-race"
                        onClick={() => onOpenMatch(featured.matchId)}
                        aria-label={`${race.headline.text}. Open the match and watch the replay.`}
                    >
                        <RaceMini
                            entries={race.entries}
                            duration={matchDuration(featured)}
                            markers={race.changeTimes}
                            finish={race.finds[race.finds.length - 1]?.itemName}
                            height={150}
                            label="Score over time in the featured match"
                        />

                        {/*
                          The haul: the winner's finds in the order they came, the most
                          recent against the finish line and the rest trailing off to the
                          left. This is the page's imagery - the items are what the game
                          is, and until now the overview showed none above the fold.
                        */}
                        <span className="fib-haul" aria-hidden="true">
                            {race.haul.map((e, i) => (
                                <Sprite key={`${e.itemName}-${i}`} name={e.itemName} size={32} pad={6} tier={e.b2b || undefined} />
                            ))}
                        </span>

                        <span className="fib-lead-foot">
                            <span className="fib-meta">
                                {race.finds.length > race.haul.length
                                    ? `The last ${race.haul.length} of ${f.num(race.finds.length)} finds, in order`
                                    : `All ${race.finds.length} finds, in order`}
                                {' '}· every tick on the track is a lead change
                            </span>
                            <span className="fib-meta fib-feature-go">
                                Watch the replay<i aria-hidden="true">→</i>
                            </span>
                        </span>
                    </button>
                </Reveal>
            ) : (
                <Reveal as="header" className="fib-lead">
                    <h1 className="fib-display">Every ranked match, on the record</h1>
                    <p className="fib-lead-sub">
                        The players who played them, and the items that decided them.
                    </p>
                </Reveal>
            )}

            {/*
              The server record, as one line.

              It was four 48px numerals in a divided strip - "98 / 9,639 / 9 / 323" -
              which is the dashboard stat row every product opens with, and on a page
              whose subject is a race and its players they read as numbers that were
              simply there. They are still the yardstick (DESIGN.md, "Story First,
              Then Scale"), so they stay above every personal number; they are just
              said as the sentence they are, with the week's movement at the end.
            */}
            <p className="fib-ledger">
                <span><b>{f.full(globals.matchesPlayed)}</b> matches</span>
                <span><b>{f.full(globals.itemsFound)}</b> items found</span>
                <span>by <b>{f.full(globals.playersRanked)}</b> players</span>
                <span><b>{f.full(globals.achievementsGranted)}</b> achievements</span>
                <span className="fib-ledger-week">
                    this week <Delta value={globals.matchesPlayedInWindow} /> matches,{' '}
                    <Delta value={globals.itemsFoundInWindow} /> items
                </span>
            </p>

            <div className="fib-split fib-split--people">
                <Section
                    title="Most wins"
                    sub={scope === 'solo'
                        ? 'All time, solo matches.'
                        : 'All time, every team a player has won with.'}
                    aside={
                        <button type="button" className="fib-btn fib-btn--quiet" onClick={onOpenLeaderboards}>
                            Full ranking
                        </button>
                    }
                >
                    {/* A radiogroup, not a tablist: scope is a lens on one podium. */}
                    <div className="fib-podium-scope">
                        <Segmented
                            options={PODIUM_SCOPES.map((s) => ({ id: s.key, label: s.label }))}
                            value={scope}
                            onChange={setScope}
                            label="Podium scope"
                        />
                    </div>

                    {podiumRows.length === 0 ? (
                        <p className="fib-meta">No ranked players yet.</p>
                    ) : (
                        <Podium
                            key={scope}
                            podiumRef={podiumRef}
                            rows={podiumRows}
                            label={scope === 'solo' ? 'matches won' : 'team wins'}
                            onOpenPlayer={onOpenPlayer}
                        />
                    )}
                </Section>

                <Section
                    title="Form"
                    sub={`The last ${form.columns} ranked matches, oldest on the left. Gold is a win.`}
                >
                    {form.rows.length === 0 ? (
                        <p className="fib-meta">No recent matches.</p>
                    ) : (
                        <ol className="fib-form" style={{ '--cols': form.columns }}>
                            {form.rows.map((r) => (
                                <li key={r.uuid}>
                                    <button
                                        type="button"
                                        className="fib-form-row"
                                        onClick={() => onOpenPlayer(r.uuid)}
                                        aria-label={`${r.name}: won ${r.wins} of the ${r.played} recent matches they played. Open their profile.`}
                                    >
                                        <Avatar uuid={r.uuid} size={28} />
                                        <span className="fib-form-name">{r.name}</span>
                                        <span className="fib-form-pips" aria-hidden="true">
                                            {r.slots.map((s, i) => (
                                                <i key={i} data-result={s ? (s.won ? 'win' : 'loss') : 'out'} />
                                            ))}
                                        </span>
                                        <span className="fib-form-record" aria-hidden="true">
                                            <b>{r.wins}</b>–{r.played - r.wins}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ol>
                    )}
                </Section>
            </div>

            <div className="fib-split">
                <Section
                    title="Latest matches"
                    sub="The most recent ranked matches, newest first."
                    aside={
                        <button type="button" className="fib-btn fib-btn--quiet" onClick={onOpenMatches}>
                            All matches
                        </button>
                    }
                >
                    <div className="fib-panel fib-panel--flush">
                        {recent.length === 0 ? (
                            <div className="fib-meta" style={{ padding: 'var(--fib-space-4)' }}>
                                No matches yet.
                            </div>
                        ) : recent.map((m) => (
                            <MatchVersus key={m.matchId} match={m} onOpen={onOpenMatch} compact />
                        ))}
                    </div>
                </Section>

                <Section title="Rarest moments" sub="Legendary and rarer back-to-backs, newest first.">
                    {topMoments.length === 0 ? (
                        <p className="fib-meta">No rare pulls yet.</p>
                    ) : (
                        <div className="fib-shelf fib-moments">
                            {topMoments.map((m, i) => (
                                /* Each opens its match: a rare moment carries its matchId. */
                                <button
                                    key={`${m.matchId}-${m.itemName}-${i}`}
                                    type="button"
                                    className="fib-artifact fib-sprite-lift fib-moment"
                                    onClick={() => onOpenMatch(m.matchId)}
                                >
                                    <Sprite name={m.itemName} size={64} pad={14} tier={m.b2bRarity} />
                                    <span className="fib-moment-caption">
                                        <b>{f.itemLabel(m.itemName)}</b>
                                        <RarityTag tier={m.b2bRarity} />
                                        <span className="fib-meta">{timeAgo(m.collectedAt)} · {momentActor(m)}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </Section>
            </div>

            {/* The page's last route out, given the section rhythm so it reads as
                the next thing rather than as part of the feeds above it. */}
            <div style={{ marginTop: 'var(--fib-space-7)' }}>
                <button type="button" className="fib-btn fib-btn--quiet" onClick={onOpenItems}>
                    Browse the item index
                </button>
            </div>
        </div>
    );
}
