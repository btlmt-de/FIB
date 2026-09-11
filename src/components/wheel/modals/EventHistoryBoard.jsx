/*
 * THE EVENT LOG — what the room did, on THE CONCOURSE.
 *
 * Scope: this file. DESIGN.md §9 is the authority; this is the sixth surface on
 * the board and the first one whose subject is the SERVER rather than a player.
 * The collection board, the leaderboard, the player board and the odds board all
 * answer "where do I stand"; this one answers "what have I been missing".
 *
 * ── WHY IT IS ITS OWN BOARD AND NOT A REGISTER ON THE ODDS BOARD ─────────────
 *
 * It was drafted as one — a fourth register under the odds board's "Global
 * events" section, which is where the five are already described. The owner
 * called it as its own board, and the reason it is the better call is the one
 * the odds board's own header states: that surface is a DOCUMENT. Every figure
 * on it is derived from the weight table and is as true tomorrow as today. A log
 * is the opposite kind of thing — it is different every time you open it, it has
 * a live row at the top while an event is running, and it wants a refresh. Two
 * registers with the same shape and opposite lifetimes on one board is how a
 * reader stops knowing which numbers are facts and which are news.
 *
 * ── THE TWO REGISTERS, AND WHY BOTH ──────────────────────────────────────────
 *
 * THE ROTATION is the standing question: which events fire, how often have they,
 * what have they paid. Five rows, one per type, and it is the one place the
 * anti-repeat rule is visible — a type that has not fired in a while shows it in
 * LAST.
 *
 * THE LOG is the recent question: what happened, who won it, what it cost. It is
 * ordered newest first and it is the reason the board exists.
 *
 * They are deliberately not merged. A per-type summary and a per-event list are
 * two different tables that happen to share a vocabulary, and the collection
 * board makes exactly this split between its register and its platform.
 *
 * ── WHAT IS NOT ON IT ────────────────────────────────────────────────────────
 *
 * Any player's lucky spin balance. PAID is what an event COST the server, never
 * what anybody now holds — the same line the arrival's manifest and the
 * community goal's result both draw, and the payload does not carry balances at
 * all so the board could not leak one if it tried.
 *
 * An event that did not happen. THE ARRIVAL declines on an empty platform and
 * never reaches `endEvent()`, so it is never logged. See eventHistory.js.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { X, RefreshCw, Radio } from 'lucide-react';
import { API_BASE_URL } from '../../../config/constants.js';
import { DECK, EVENT_IDENTITY, Z, rail } from '../config/constants';
import { EVENT_ICONS } from '../config/eventIcons.js';
import { FlapText, BoardLabel, RowLamp, BoardMeter, Plinth } from '../features/collection/FlapBoard.jsx';
import { useWheelViewport } from '../config/breakpoints.js';
import { PrestigeRing } from '../spin/StageFlanks.jsx';
import { prestigeStanding } from '../../../utils/prestigeHelpers.js';
import { getDiscordAvatarUrl } from '../../../utils/helpers.js';

/*
 * The rotation, in the order the odds board lists it.
 *
 * Hardcoded rather than read from the payload on purpose: this register's job is
 * to show all five INCLUDING the ones that have not fired lately, and a list
 * built from `totals` would silently drop exactly the type a reader is looking
 * for. Gold Rush is not here for the same reason it is not on the odds board —
 * it was retired from the rotation and only an admin can run one. A forced Gold
 * Rush still appears in THE LOG below, where the subject is what happened rather
 * than what can happen.
 */
const ROTATION = ['arrival', 'roulette', 'king_of_wheel', 'first_blood', 'community_goal'];

const fmt = n => (n == null ? '—' : Number(n).toLocaleString());

/**
 * How long ago, in the shortest true form.
 *
 * Relative and not a clock, because "recent" is the whole framing of this board
 * and a reader comparing two rows wants the gap, not two timestamps to subtract.
 * Anything past a week becomes a date: "23d ago" is a number nobody converts.
 */
function ago(ms) {
    if (!ms) return '—';
    const seconds = Math.max(0, (Date.now() - ms) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = seconds / 60;
    if (minutes < 60) return `${Math.floor(minutes)}m ago`;
    const hours = minutes / 60;
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    const days = hours / 24;
    if (days < 7) return `${Math.floor(days)}d ago`;
    return new Date(ms).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

/** The absolute time, for the title. The relative form above loses it. */
function fullTime(ms) {
    if (!ms) return undefined;
    return new Date(ms).toLocaleString();
}

/**
 * A player's face and name, or the absence of one.
 *
 * §9's named rule — a ring around a face means prestige, everywhere — and this
 * board is one of the everywheres. `pad={1.5}` because these avatars are 20px:
 * 2px on a small face reads as a coloured disc with a face on it rather than as
 * a frame around one, which is the arithmetic that made `pad` a prop.
 */
function Winner({ winner, tone }) {
    if (!winner) {
        // A dash, never a zero and never a blank. Three of the five events
        // single nobody out by design, and an empty cell reads as data that
        // failed to load rather than as a result.
        return <BoardLabel tone={DECK.inkDim}>—</BoardLabel>;
    }

    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <PrestigeRing standing={prestigeStanding(winner)} pad={1.5}>
                <img
                    src={getDiscordAvatarUrl(winner.discord_id, winner.discord_avatar, 64)}
                    alt=""
                    width={20}
                    height={20}
                    style={{ display: 'block', borderRadius: '50%' }}
                />
            </PrestigeRing>
            <span style={{
                fontSize: '13px', color: tone || DECK.ink, minWidth: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{winner.username || 'Unknown'}</span>
        </span>
    );
}

export function EventHistoryBoard({ onClose }) {
    const { isPhone } = useWheelViewport();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/global-event/history?limit=25`, {
                credentials: 'include',
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setData(await res.json());
            setError(null);
        } catch (e) {
            // The board says so rather than rendering an empty log, which is a
            // sentence — "no events yet" — that would be a lie about a server
            // that has run hundreds.
            setError(e.message || 'Could not load the log');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const summary = data?.summary || { fired: 0, totalPaid: 0, totalParticipants: 0 };
    const totals = data?.totals || {};
    const recent = data?.recent || [];
    const milestone = data?.milestone || null;
    // `selecting` is the four-second wheel that decides which event fires. It is
    // an event state but not an event, and naming it on the board would print a
    // row for something that has no outcome and may still be a different type.
    const live = data?.active?.active && data.active.type && data.active.type !== 'selecting'
        ? data.active
        : null;

    const rotationTrack = isPhone
        ? '16px minmax(0, 1fr) 52px 74px'
        : '16px minmax(0, 1fr) 62px 84px minmax(56px, 0.5fr) 82px';

    const logTrack = isPhone
        ? '16px minmax(0, 1fr) 62px 74px'
        : '16px 132px minmax(0, 1fr) minmax(0, 0.9fr) 66px 78px';

    const head = [
        { value: fmt(summary.fired), label: 'Events', tone: DECK.amber },
        { value: fmt(summary.totalPaid), label: 'Lucky spins paid', tone: DECK.ink },
        { value: fmt(summary.totalParticipants), label: 'Payouts', tone: DECK.ink },
    ];

    return (
        <div
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-label="Global event log"
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: Z.modal, padding: isPhone ? '0' : '24px',
                animation: 'fadeIn 0.2s ease-out',
            }}
        >
            <div style={{
                position: 'relative',
                width: '100%', maxWidth: '1020px',
                height: isPhone ? '100%' : 'min(88vh, 840px)',
                display: 'flex', flexDirection: 'column',
                backgroundImage: DECK.face,
                // Three edges, the way every board on this surface has three: a
                // lit rail along the top, a front lip at the bottom.
                boxShadow: [
                    `inset 0 1px 0 ${rail(0.12)}`,
                    'inset 0 -2px 0 rgba(0,0,0,0.55)',
                    `inset 0 -3px 0 ${rail(0.09)}`,
                    '0 32px 80px rgba(0,0,0,0.65)',
                ].join(', '),
                animation: 'slideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                overflow: 'hidden',
            }}>

                {/* ── THE HEAD ─────────────────────────────────────────────── */}
                <div style={{
                    position: 'relative', flex: '0 0 auto',
                    padding: isPhone ? '16px 16px 0' : '24px 26px 0',
                    backgroundImage: `linear-gradient(180deg, ${DECK.sky} 0%, transparent 78%)`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                        <FlapText
                            text="Event Log"
                            size={isPhone ? 28 : 36}
                            tone={DECK.ink}
                            weight={800}
                            plate
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
                            <Plinth
                                as="button"
                                className="fib-board-hit"
                                onClick={load}
                                disabled={loading}
                                aria-label="Reload the event log"
                                style={{
                                    width: '36px', height: '36px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: DECK.inkMid, opacity: loading ? 0.5 : 1,
                                }}
                            ><RefreshCw size={15} /></Plinth>
                            <Plinth
                                as="button"
                                className="fib-board-hit"
                                onClick={onClose}
                                aria-label="Close the event log"
                                style={{
                                    width: '36px', height: '36px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: DECK.inkMid,
                                }}
                            ><X size={16} /></Plinth>
                        </div>
                    </div>

                    <div style={{
                        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                        gap: '24px', margin: isPhone ? '14px 0 8px' : '20px 0 8px',
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: isPhone ? 'repeat(3, 1fr)' : 'repeat(3, auto)',
                            justifyContent: 'start',
                            flex: isPhone ? '1 1 auto' : '0 0 auto',
                        }}>
                            {head.map((f, i) => (
                                <div key={f.label} style={{
                                    padding: isPhone ? '0 10px' : '0 26px',
                                    boxShadow: i > 0 ? `inset 1px 0 0 ${rail(0.07)}` : undefined,
                                    ...(i === 0 ? { paddingLeft: 0 } : null),
                                }}>
                                    <FlapText
                                        text={f.value}
                                        size={isPhone ? 22 : 27}
                                        tone={f.tone}
                                        weight={700}
                                        plate
                                        delay={60 + i * 40}
                                    />
                                    <div style={{ marginTop: '7px' }}>
                                        <BoardLabel>{f.label}</BoardLabel>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* The next departure. The one live figure in the head,
                            and the reason the board is worth opening between
                            events rather than only after one. */}
                        {!isPhone && milestone && (
                            <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                                <FlapText
                                    text={fmt(milestone.remaining)} digits size={20}
                                    tone={DECK.amber} weight={700} delay={200}
                                    style={{ justifyContent: 'flex-end' }}
                                />
                                <div style={{ marginTop: '6px' }}>
                                    <BoardLabel style={{ display: 'block', textAlign: 'right' }}>
                                        Spins to the next
                                    </BoardLabel>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* The platform line, filled to how far the server has come
                        toward the next event. No label: the figure standing above
                        it is the one it measures. */}
                    <BoardMeter
                        value={milestone ? (milestone.progress || 0) / 100 : 0}
                        tone={DECK.amber}
                        height={3}
                    />

                    {isPhone && milestone && (
                        <div style={{ padding: '12px 0 2px' }}>
                            <BoardLabel tone={DECK.inkDim}>
                                {`${fmt(milestone.remaining)} spins to the next event`}
                            </BoardLabel>
                        </div>
                    )}
                </div>

                {/* ── THE REGISTERS ───────────────────────────────────────────── */}
                <div
                    className="fib-board-scroll"
                    style={{
                        flex: '1 1 auto', minHeight: 0, overflowY: 'auto',
                        padding: isPhone ? '18px 16px 24px' : '22px 26px 28px',
                    }}
                >
                    {error && (
                        <div style={{ paddingBottom: '20px' }}>
                            <BoardLabel tone={DECK.amber}>Could not load the log</BoardLabel>
                            <p style={{ margin: '7px 0 0', fontSize: '13px', lineHeight: 1.65, color: DECK.inkMid }}>
                                {error}. The events themselves are unaffected — this board reads a
                                log the server writes after each one.
                            </p>
                        </div>
                    )}

                    {/* ── THE ROTATION ────────────────────────────────────────── */}
                    <section>
                        <div style={{ paddingBottom: '10px' }}>
                            <BoardLabel size={11}>The rotation</BoardLabel>
                        </div>

                        <div style={{
                            display: 'grid', gridTemplateColumns: rotationTrack,
                            alignItems: 'center', gap: '0 12px', padding: '0 0 8px',
                        }}>
                            <span />
                            <BoardLabel>Event</BoardLabel>
                            <BoardLabel style={{ textAlign: 'right' }}>Fired</BoardLabel>
                            {!isPhone && <BoardLabel style={{ textAlign: 'right' }}>Paid</BoardLabel>}
                            {!isPhone && <BoardLabel>Share</BoardLabel>}
                            <BoardLabel style={{ textAlign: 'right' }}>Last</BoardLabel>
                        </div>

                        {ROTATION.map((key, i) => {
                            const id = EVENT_IDENTITY[key];
                            const Icon = EVENT_ICONS[key];
                            const t = totals[key];
                            const fired = t?.fired || 0;
                            // Share of events that have actually run, not the 20%
                            // the rotation aims at. The two disagree over a short
                            // log, and the observed number is the one this board
                            // is for — the intended share is on the odds board.
                            const share = summary.fired > 0 ? fired / summary.fired : 0;
                            const isLive = live?.type === key;

                            return (
                                <div
                                    key={key}
                                    className={`fib-register-row is-static${i > 0 ? ' has-seam' : ''}${isLive ? ' is-active' : ''}`}
                                    style={{
                                        display: 'grid', gridTemplateColumns: rotationTrack,
                                        alignItems: 'center', gap: '0 12px',
                                        padding: isPhone ? '9px 0' : '12px 0',
                                        '--fib-row-wash': `${id.color}14`,
                                        '--fib-row-tone': id.color,
                                    }}
                                >
                                    <Icon size={15} color={id.color} aria-hidden="true" />
                                    <FlapText
                                        text={id.name} size={isPhone ? 14 : 16}
                                        tone={id.color} weight={700}
                                        delay={140 + i * 55}
                                        style={{ minWidth: 0, overflow: 'hidden' }}
                                    />
                                    <FlapText
                                        text={fmt(fired)} digits size={15} tone={DECK.ink} weight={700}
                                        delay={160 + i * 55}
                                        style={{ justifyContent: 'flex-end' }}
                                    />
                                    {!isPhone && (
                                        <FlapText
                                            text={fmt(t?.totalPaid || 0)} digits size={15} tone={DECK.inkMid}
                                            delay={175 + i * 55}
                                            style={{ justifyContent: 'flex-end' }}
                                        />
                                    )}
                                    {!isPhone && <BoardMeter value={share} tone={id.color} />}
                                    {/* An event that has never fired says so with
                                        a dash. Zero would be a measurement. */}
                                    <BoardLabel
                                        tone={isLive ? id.color : DECK.inkMid}
                                        style={{ display: 'block', textAlign: 'right' }}
                                    >
                                        {isLive ? 'On air' : (t?.lastEndedAt ? ago(t.lastEndedAt) : '—')}
                                    </BoardLabel>
                                </div>
                            );
                        })}
                    </section>

                    {/* ── THE LOG ─────────────────────────────────────────────── */}
                    <section style={{ paddingTop: '30px' }}>
                        <div style={{ paddingBottom: '10px' }}>
                            <BoardLabel size={11}>Recent events</BoardLabel>
                        </div>

                        {/* The event on screen right now, above the log rather
                            than in it. It has no outcome yet — that is written
                            when it ends — so it is a different kind of row and
                            takes a different shape: a lit lamp and a sentence,
                            not a set of columns with holes in them. */}
                        {live && EVENT_IDENTITY[live.type] && (
                            <div
                                className="fib-register-row is-static is-active"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: isPhone ? '10px 0' : '13px 0',
                                    '--fib-row-wash': `${EVENT_IDENTITY[live.type].color}14`,
                                    '--fib-row-tone': EVENT_IDENTITY[live.type].color,
                                }}
                            >
                                <RowLamp state="lit" tone={EVENT_IDENTITY[live.type].color} />
                                <Radio size={14} color={EVENT_IDENTITY[live.type].color} aria-hidden="true" />
                                <FlapText
                                    text={EVENT_IDENTITY[live.type].name}
                                    size={isPhone ? 14 : 16}
                                    tone={EVENT_IDENTITY[live.type].color}
                                    weight={700}
                                />
                                <BoardLabel tone={DECK.inkMid}>Running now</BoardLabel>
                            </div>
                        )}

                        <div style={{
                            display: 'grid', gridTemplateColumns: logTrack,
                            alignItems: 'center', gap: '0 12px', padding: '10px 0 8px',
                        }}>
                            <span />
                            {!isPhone && <BoardLabel>Event</BoardLabel>}
                            <BoardLabel>{isPhone ? 'Event' : 'Result'}</BoardLabel>
                            {!isPhone && <BoardLabel>Winner</BoardLabel>}
                            <BoardLabel style={{ textAlign: 'right' }}>Paid</BoardLabel>
                            <BoardLabel style={{ textAlign: 'right' }}>When</BoardLabel>
                        </div>

                        {recent.length === 0 && !error && (
                            <div style={{ padding: '14px 0' }}>
                                <BoardLabel tone={DECK.inkDim}>
                                    {loading ? 'Reading the log…' : 'No events logged yet'}
                                </BoardLabel>
                                {!loading && (
                                    <p style={{ margin: '8px 0 0', fontSize: '13px', lineHeight: 1.65, color: DECK.inkMid }}>
                                        The log starts at the next event. Events that ran before it
                                        existed were never written down, so this board begins empty
                                        rather than guessing at them.
                                    </p>
                                )}
                            </div>
                        )}

                        {recent.map((row, i) => {
                            const id = EVENT_IDENTITY[row.eventType]
                                // A retired type can still be in the log — an admin
                                // can force a Gold Rush, and one that ran is history
                                // whether or not the rotation can still draw it.
                                || { name: String(row.eventType || 'Unknown').replace(/_/g, ' ').toUpperCase(), color: DECK.inkMid };
                            const Icon = EVENT_ICONS[row.eventType];

                            return (
                                <div
                                    key={row.id}
                                    className={`fib-register-row is-static${i > 0 || live ? ' has-seam' : ''}`}
                                    title={fullTime(row.endedAt)}
                                    style={{
                                        display: 'grid', gridTemplateColumns: logTrack,
                                        alignItems: 'center', gap: '0 12px',
                                        padding: isPhone ? '9px 0' : '11px 0',
                                    }}
                                >
                                    {Icon
                                        ? <Icon size={14} color={id.color} aria-hidden="true" />
                                        : <span />}

                                    {!isPhone && (
                                        <FlapText
                                            text={id.name} size={13} tone={id.color} weight={700}
                                            delay={120 + i * 26}
                                            style={{ minWidth: 0, overflow: 'hidden' }}
                                        />
                                    )}

                                    {/* On a phone this column carries the event's
                                        name with the result under it, because the
                                        two together are what a row means and
                                        neither survives alone. Every row is two
                                        lines, so the register's height stays
                                        constant — §9's rule is that rows must not
                                        change height between STATES, not that a
                                        row cannot be two lines tall. */}
                                    <span style={{ minWidth: 0 }}>
                                        {isPhone && (
                                            <span style={{
                                                display: 'block', fontSize: '13px', fontWeight: 700,
                                                color: id.color, overflow: 'hidden',
                                                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>{id.name}</span>
                                        )}
                                        <span style={{
                                            display: 'block',
                                            fontSize: isPhone ? '12px' : '13px',
                                            color: DECK.inkMid,
                                            marginTop: isPhone ? '2px' : 0,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {row.outcome || '—'}
                                            {/* A forced event really ran and really
                                                paid, so it is logged — but a run of
                                                them is what a test session looks
                                                like, and totals beside unmarked
                                                forced rows would be a lie. */}
                                            {row.forced && (
                                                <span style={{ color: DECK.inkDim }}> · forced</span>
                                            )}
                                        </span>
                                    </span>

                                    {!isPhone && <Winner winner={row.winner} tone={DECK.ink} />}

                                    <FlapText
                                        text={fmt(row.totalPaid)} digits size={14}
                                        tone={row.totalPaid > 0 ? DECK.ink : DECK.inkDim}
                                        weight={700}
                                        delay={150 + i * 26}
                                        style={{ justifyContent: 'flex-end' }}
                                    />

                                    <BoardLabel tone={DECK.inkDim} style={{ display: 'block', textAlign: 'right' }}>
                                        {ago(row.endedAt)}
                                    </BoardLabel>
                                </div>
                            );
                        })}

                        {isPhone && recent.some(r => r.winner) && (
                            <div style={{ paddingTop: '12px' }}>
                                <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.65, color: DECK.inkDim }}>
                                    Winners are named on a wider screen — the column needs a face and a
                                    name beside four other columns, and starving those to fit it is how
                                    a ranking ends up with no names on it.
                                </p>
                            </div>
                        )}
                    </section>
                </div>

                {/* ── THE FOOT ────────────────────────────────────────────────── */}
                <div style={{
                    flex: '0 0 auto',
                    padding: isPhone ? '11px 16px' : '12px 26px',
                    boxShadow: `inset 0 1px 0 ${rail(0.07)}`,
                    background: 'rgba(0,0,0,0.22)',
                }}>
                    <BoardLabel tone={DECK.inkDim}>
                        Paid is what an event cost, never what anyone holds · No event runs twice in a row
                    </BoardLabel>
                </div>
            </div>
        </div>
    );
}

export default EventHistoryBoard;
