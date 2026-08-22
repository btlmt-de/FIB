/*
 * ═══════════════════════════════════════════════════════════════════════════
 * THE ARRIVAL — the manifest board
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A train pulls into the concourse, unloads one crate per player on the
 * platform, and leaves. This is the half that carries the meaning: the arrivals
 * board flipping out who was here and what landed in front of them.
 *
 * ── WHY THIS IS A BOARD AND NOT A NEW THING ──────────────────────────────────
 *
 * DESIGN.md §8 says the reel is "a main transit line arriving at its stop, and
 * everything around it is the city it moves through", and §9 built the
 * collection board as "the one building in that city that was never built".
 * Three surfaces now run THE CONCOURSE — the collection board, the leaderboard
 * and the player board. The city has had a station board since July and no
 * train. This event is the arrival the metaphor has been promising.
 *
 * So none of the vocabulary here is new. `FlapText` is already a mechanism for
 * numbers resolving into place on split-flap drums; the register row is already
 * one line per player with a value column. The reveal is assembled from parts
 * that shipped on three other surfaces, which is why it reads as this site's
 * event rather than a feature bolted to it.
 *
 * ── WHAT IT REPLACED, AND THE NUMBER THAT RETIRED IT ─────────────────────────
 *
 * Gold Rush doubled one randomly chosen tier's odds for five minutes. Measured
 * against the real drop table that is +0.01pp on insane and +0.49pp on mythic —
 * two of its five outcomes were literally imperceptible, and it was the only
 * event that could pay nothing at all. It was not too small; it was invisible.
 * This event is the opposite by construction: it is nothing but visible, and
 * every player on the platform gets something.
 *
 * ── THE ORDER THE ROWS LAND IN ───────────────────────────────────────────────
 *
 * Smallest crate first, biggest last. A board that resolved in server order
 * would spend its best moment somewhere in the middle; climbing means the last
 * drum to settle is the largest number on the board, and on the ~42% of
 * arrivals where somebody clears ten it ends on that. The delay per row is what
 * makes it a cascade rather than a table appearing.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { DECK, rail, COLORS } from '../config/constants';
import { FlapText, BoardLabel, BoardMeter } from '../features/collection/FlapBoard.jsx';
import { getDiscordAvatarUrl } from '../../../utils/helpers.js';
import { prefersReducedMotion } from '../../../utils/motion.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useActivity } from '../../../context/ActivityContext.jsx';
import { useWheelViewport } from '../config/breakpoints.js';
import { Sparkles } from 'lucide-react';

import {
    T_UNLOAD, MANIFEST_HEAD_MS, ROW_STEP_MAX_MS, ROW_CASCADE_BUDGET_MS,
} from './arrivalTimeline.js';

export function ArrivalBoard() {
    const { arrival, arrivalCrate } = useActivity();
    const { user } = useAuth();
    const { isPhone } = useWheelViewport();
    const [motionOff] = useState(prefersReducedMotion);
    const [landed, setLanded] = useState(0);

    /*
     * Smallest first, and ties broken by name so the order is stable rather than
     * dependent on however the server happened to enumerate the platform.
     */
    const rows = useMemo(() => {
        if (!arrival?.manifest) return [];
        return [...arrival.manifest].sort(
            (a, b) => a.crate - b.crate || String(a.username).localeCompare(String(b.username))
        );
    }, [arrival]);

    /*
     * Resetting the cascade for a new arrival is a render-phase adjustment, not
     * an effect — the same pattern `FlapText` uses and for the same reason:
     * React documents this as the way to adjust state from props, and it leaves
     * the interval below as the only thing that ever writes `landed`
     * asynchronously. Doing it inside the effect is the cascading render the
     * lint rule is named after.
     */
    const [shownFor, setShownFor] = useState(arrival);
    if (shownFor !== arrival) {
        setShownFor(arrival);
        setLanded(motionOff ? rows.length : 0);
    }

    /*
     * The rows wait for the crates.
     *
     * A number resolving on the drums for a crate still in the air is the
     * animation contradicting itself, so the cascade starts only after the
     * train's last crate has landed — `T_UNLOAD` from the shared timeline, which
     * the canvas animates against too. It was a callback from the canvas until
     * the canvas moved into the reel mount and the two ended up in different
     * parts of the tree; one table read twice cannot drift.
     */
    useEffect(() => {
        if (!arrival || motionOff) return undefined;

        const step = Math.min(ROW_STEP_MAX_MS, ROW_CASCADE_BUDGET_MS / Math.max(1, rows.length));
        const timers = rows.map((_, i) =>
            window.setTimeout(
                () => setLanded(n => Math.max(n, i + 1)),
                T_UNLOAD * 1000 + MANIFEST_HEAD_MS + i * step
            )
        );
        return () => timers.forEach(window.clearTimeout);
    }, [arrival, rows, motionOff]);

    if (!arrival || rows.length === 0) return null;

    const best = arrival.bestCrate?.crate || 0;
    const maxCrate = arrival.maxCrate || 15;
    const gutter = isPhone ? '16px' : '26px';

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label={`A delivery arrived. ${arrival.totalLuckySpins} lucky spins across ${rows.length} ${rows.length === 1 ? 'player' : 'players'}.`}
            style={{
                position: 'relative',
                width: '100%',
                // Half the width it started at. The train has the reel now, so
                // the board is the caption and not the picture — at 620px with
                // the animation inside it, it was a card with a small train in
                // it, which is exactly how it read.
                maxWidth: '440px',
                margin: '0 auto',
                backgroundImage: DECK.face,
                boxShadow: [
                    `inset 0 1px 0 ${rail(0.12)}`,
                    'inset 0 -2px 0 rgba(0,0,0,0.55)',
                    `inset 0 -3px 0 ${rail(0.09)}`,
                    '0 24px 60px rgba(0,0,0,0.6)',
                ].join(', '),
                overflow: 'hidden',
                animation: motionOff ? undefined : 'fadeIn 0.4s ease-out',
            }}
        >
            {/* ── THE HEAD ────────────────────────────────────────────────── */}
            <div style={{
                padding: isPhone ? `14px ${gutter} 0` : `18px ${gutter} 0`,
                backgroundImage: `linear-gradient(180deg, ${DECK.sky} 0%, transparent 78%)`,
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ minWidth: 0 }}>
                        <FlapText
                            text="Delivery"
                            size={isPhone ? 20 : 24}
                            tone={DECK.ink}
                            weight={800}
                            plate
                        />
                        <div style={{ marginTop: '7px' }}>
                            <BoardLabel tone={DECK.inkDim}>
                                {rows.length} {rows.length === 1 ? 'crate' : 'crates'} on the platform
                            </BoardLabel>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                        <FlapText
                            text={String(arrival.totalLuckySpins)}
                            size={isPhone ? 22 : 27}
                            tone={DECK.amber}
                            weight={700}
                            plate
                            digits
                            delay={200}
                            style={{ justifyContent: 'flex-end' }}
                        />
                        <div style={{ marginTop: '7px' }}>
                            <BoardLabel>Lucky spins</BoardLabel>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                    <BoardMeter value={1} tone={DECK.amber} height={3} />
                </div>
            </div>


            {/* ── THE MANIFEST ────────────────────────────────────────────── */}
            <div style={{
                padding: isPhone ? `2px ${gutter} 14px` : `4px ${gutter} 18px`,
                background: 'rgba(0,0,0,0.30)',
                boxShadow: `inset 0 1px 0 ${rail(0.08)}`,
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `26px minmax(70px, 1fr) minmax(52px, 0.7fr) 46px`,
                    alignItems: 'center', gap: '0 12px',
                    padding: '10px 0 6px',
                }}>
                    <span />
                    <BoardLabel>Player</BoardLabel>
                    <span />
                    <BoardLabel style={{ textAlign: 'right' }}>Spins</BoardLabel>
                </div>

                <div role="list">
                    {rows.map((row, i) => {
                        const shown = i < landed;
                        const isMe = user && user.id === row.userId;
                        const isBest = best > 0 && row.crate === best;

                        return (
                            <div
                                key={row.userId}
                                role="listitem"
                                className="fib-register-row is-static"
                                aria-label={`${row.username}: ${row.crate} lucky spins`}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: `26px minmax(70px, 1fr) minmax(52px, 0.7fr) 46px`,
                                    alignItems: 'center', gap: '0 12px',
                                    padding: isPhone ? '8px 0' : '10px 0',
                                }}
                            >
                                <img
                                    src={getDiscordAvatarUrl(row.discordId, row.discordAvatar)}
                                    alt=""
                                    width={22}
                                    height={22}
                                    style={{ display: 'block', borderRadius: '50%', background: DECK.faceDeep }}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                    }}
                                />

                                {/*
                                  * The NAMES are on the board from the first
                                  * frame; only the amounts wait for the crates.
                                  *
                                  * The first build faded whole rows in as they
                                  * landed, which left a reserved void where the
                                  * manifest goes for the four seconds the train
                                  * takes to unload — the board looked broken
                                  * rather than expectant. It is also less true:
                                  * who is on the platform is known the moment
                                  * the train appears, and it is what they are
                                  * getting that is still in the air.
                                  */}
                                <span style={{
                                    fontFamily: "'Barlow Condensed', system-ui, sans-serif",
                                    fontSize: isPhone ? '14px' : '15px',
                                    fontWeight: isMe ? 800 : 600,
                                    letterSpacing: '0.04em',
                                    textTransform: 'uppercase',
                                    color: isMe ? DECK.amber : (shown ? DECK.ink : DECK.inkMid),
                                    transition: motionOff ? undefined : 'color 300ms ease-out',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {row.username}
                                </span>

                                {/* The crate against the biggest one this
                                    arrival could hold — so a 12 reads as a 12
                                    and not merely as "more than the row above". */}
                                <BoardMeter
                                    value={shown ? row.crate / maxCrate : 0}
                                    tone={isBest ? DECK.amber : rail(0.35)}
                                    height={4}
                                />

                                <FlapText
                                    text={shown ? String(row.crate) : ''}
                                    size={isPhone ? 16 : 18}
                                    tone={isBest ? DECK.amber : DECK.ink}
                                    weight={700}
                                    digits
                                    plate
                                    style={{ justifyContent: 'flex-end' }}
                                />
                            </div>
                        );
                    })}
                </div>

                {/*
                 * This player's own line, and it is the only place a balance
                 * appears. The manifest above is public — the board is the whole
                 * event and a payout nobody can see is the failure this replaced
                 * — but a running lucky-spin TOTAL is nobody else's business, so
                 * it rides on the private message instead.
                 */}
                {arrivalCrate && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '9px',
                        marginTop: '12px', paddingTop: '11px',
                        boxShadow: `inset 0 1px 0 ${rail(0.07)}`,
                        color: COLORS.gold,
                    }}>
                        <Sparkles size={13} />
                        <BoardLabel tone="currentColor">
                            +{arrivalCrate.luckySpinsAwarded} for you
                        </BoardLabel>
                        <BoardLabel tone={DECK.inkDim}>
                            {arrivalCrate.luckySpinsTotal} banked
                        </BoardLabel>
                    </div>
                )}
            </div>
        </div>
    );
}
