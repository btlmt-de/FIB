/*
 * ══════════════════════════════════════════════════════════════════════════
 * THE ARRIVAL — the manifest board
 * ══════════════════════════════════════════════════════════════════════════
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
 * ── IT HANGS IN THE STATION NOW, IT DOES NOT SIT ABOVE IT ────────────────────
 *
 * It used to be a 440px card in the banner slot above the reel: the train ran
 * in the band and the numbers arrived in a panel over the top of it, and the
 * whole event was two objects on a page rather than one thing happening. The
 * owner's note was that it "shifts the strip down and shows the lucky spin
 * distribution above" — a fair description of a caption stacked on a picture.
 *
 * The board is now signage INSIDE the theatre frame: hung from the top edge on
 * two rods, in the same air the telegraph poles and the canopy are in, with the
 * spins from every crate flying up out of the platform and landing on its rows.
 * Nothing above the reel moves, because there is no longer anything above the
 * reel. See ArrivalTheatre.jsx.
 *
 * ── THE ORDER THE ROWS LAND IN ───────────────────────────────────────────────
 *
 * Smallest crate first, biggest last. A board that resolved in server order
 * would spend its best moment somewhere in the middle; climbing means the last
 * drum to settle is the largest number on the board, and on the ~42% of
 * arrivals where somebody clears ten it ends on that.
 *
 * That order is now the UNLOAD order too, and this is why the sort lives in the
 * theatre rather than here: the theatre hands the same sorted array to this
 * board and to the crates, so wagon `i` carries row `i`'s crate, the smallest
 * payout comes off the train first, and the biggest number on the board is both
 * the last thing unloaded and the last drum to settle.
 *
 * ── AND THE ROWS WAIT FOR THEIR OWN SPINS ────────────────────────────────────
 *
 * `rowLandsAt` is derived from when that row's crate opens and how long its
 * spins take to fly here, so a number never resolves before the light that pays
 * for it has arrived. The clock is the SCENE's — read out of `emitRef` — and not
 * this component's, because three.js is fetched when the train is announced and
 * on a slow connection the scene starts its own clock a second late. A board
 * running on its own would resolve into an empty frame.
 */

import React, { useEffect, useState } from 'react';
import { DECK, rail, COLORS } from '../config/constants';
import { FlapText, BoardLabel, BoardMeter } from '../features/collection/FlapBoard.jsx';
import { getDiscordAvatarUrl } from '../../../utils/helpers.js';
import { prefersReducedMotion } from '../../../utils/motion.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useWheelViewport } from '../config/breakpoints.js';
import { Sparkles } from 'lucide-react';

import { rowLandsAt, totalLandsAt, T_IRIS } from './arrivalTimeline.js';

const GRID = '24px minmax(64px, 1fr) minmax(48px, 0.66fr) 44px';

export function ArrivalBoard({ arrival, arrivalCrate, rows, emitRef, rowElsRef }) {
    const { user } = useAuth();
    const { isPhone } = useWheelViewport();
    const [motionOff] = useState(prefersReducedMotion);
    const [landed, setLanded] = useState(() => (motionOff ? rows.length : 0));
    const [totalIn, setTotalIn] = useState(motionOff);

    /*
     * Resetting the cascade for a new arrival is a render-phase adjustment, not
     * an effect — the same pattern `FlapText` uses and for the same reason:
     * React documents this as the way to adjust state from props, and it leaves
     * the loop below as the only thing that ever writes `landed`
     * asynchronously. Doing it inside the effect is the cascading render the
     * lint rule is named after.
     */
    const [shownFor, setShownFor] = useState(arrival);
    if (shownFor !== arrival) {
        setShownFor(arrival);
        setLanded(motionOff ? rows.length : 0);
        setTotalIn(motionOff);
    }

    const n = rows.length;
    useEffect(() => {
        if (motionOff || n === 0) return undefined;

        /*
         * The scene's clock where there is one, and this component's where there
         * is not. `emitRef.t` only exists once three.js has loaded, mounted and
         * drawn a frame; if the chunk never arrives at all the board still has
         * to pay out, so it falls back to its own mount and runs the same
         * timings against it. That is a board resolving over a dark band, which
         * is the right failure — the numbers are the event.
         */
        const own = performance.now();
        const last = totalLandsAt(n);
        let raf = 0;
        let running = true;

        const tick = () => {
            if (!running) return;
            const t = emitRef?.current?.t ?? (performance.now() - own) / 1000;
            let count = 0;
            for (let i = 0; i < n; i++) if (t >= rowLandsAt(i, n)) count = i + 1;
            setLanded(v => (v >= count ? v : count));
            if (t >= last) setTotalIn(true);
            if (t > last + 0.2) { running = false; return; }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => { running = false; cancelAnimationFrame(raf); };
    }, [arrival, n, motionOff, emitRef]);

    const best = arrival.bestCrate?.crate || 0;
    const maxCrate = arrival.maxCrate || 15;
    const gutter = isPhone ? '14px' : '22px';

    /*
     * When this player's own line may show its numbers: the beat their row
     * resolves, which is the same beat WheelPage schedules the topbar counter on.
     *
     * It used to appear with the board itself, at T_IRIS + 0.3 — so the footer
     * announced "+12 for you" while the drum for that very row was still blank
     * and the crate carrying it had not left the train. The board spends six
     * seconds building to each number and this printed the player's one up front,
     * which is the same failure the topbar counter had, one layer in.
     *
     * `totalIn` is the fallback for a player who is not on the public manifest at
     * all — it should not happen, since a crate implies a platform row, but the
     * honest behaviour there is to wait for the whole board rather than to leak.
     */
    const myIndex = user ? rows.findIndex(row => row.userId === user.id) : -1;
    const myLineIn = myIndex >= 0 ? landed > myIndex : totalIn;

    /*
     * The rods are drawn from the frame's top edge, so the body hangs BELOW its
     * own pivot and can swing about it. A board that faded in where it was going
     * to be is a graphic; one that comes down on its hangers and settles is a
     * thing that was lowered into a station.
     */
    const swing = motionOff
        ? undefined
        : `fib-arrival-sign-drop 1.05s cubic-bezier(0.16, 0.9, 0.3, 1) ${T_IRIS + 0.3}s both`;

    return (
        <div
            className="fib-arrival-sign"
            style={{ width: isPhone ? 'min(94%, 400px)' : 'min(92%, 540px)' }}
        >
            <span className="fib-arrival-sign-rod" style={{ left: '19%' }} />
            <span className="fib-arrival-sign-rod" style={{ right: '19%' }} />

            <div
                role="status"
                aria-live="polite"
                aria-label={`A delivery arrived. ${arrival.totalLuckySpins} lucky spins across ${n} ${n === 1 ? 'player' : 'players'}.`}
                className="fib-arrival-sign-body"
                style={{ animation: swing }}
            >
                {/* ── THE HEAD ───────────────────────────────────────────── */}
                <div style={{
                    padding: isPhone ? `12px ${gutter} 0` : `15px ${gutter} 0`,
                    backgroundImage: `linear-gradient(180deg, ${DECK.sky} 0%, transparent 78%)`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
                        <div style={{ minWidth: 0 }}>
                            <FlapText
                                text="Delivery"
                                size={isPhone ? 19 : 23}
                                tone={DECK.ink}
                                weight={800}
                                plate
                            />
                            <div style={{ marginTop: '6px' }}>
                                <BoardLabel tone={DECK.inkDim}>
                                    {n} {n === 1 ? 'crate' : 'crates'} on the platform
                                </BoardLabel>
                            </div>
                        </div>

                        {/*
                          * The total is the SUM, and it resolves last of all.
                          * It used to flap 200ms after the board appeared, which
                          * finished the biggest number on the board before a
                          * single crate was down and left the rows underneath
                          * catching up to something already known.
                          */}
                        <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                            <FlapText
                                text={totalIn ? String(arrival.totalLuckySpins) : ''}
                                size={isPhone ? 21 : 26}
                                tone={DECK.amber}
                                weight={700}
                                plate
                                digits
                                style={{ justifyContent: 'flex-end', minHeight: isPhone ? 21 : 26 }}
                            />
                            <div style={{ marginTop: '6px' }}>
                                <BoardLabel>Lucky spins</BoardLabel>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '11px' }}>
                        <BoardMeter value={1} tone={DECK.amber} height={3} />
                    </div>
                </div>

                {/* ── THE MANIFEST ───────────────────────────────────────── */}
                <div style={{
                    padding: isPhone ? `2px ${gutter} 12px` : `4px ${gutter} 15px`,
                    background: 'rgba(0,0,0,0.30)',
                    boxShadow: `inset 0 1px 0 ${rail(0.08)}`,
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: GRID,
                        alignItems: 'center', gap: '0 11px',
                        padding: '9px 0 5px',
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
                                    ref={el => { if (rowElsRef) rowElsRef.current[i] = el; }}
                                    className="fib-register-row is-static"
                                    aria-label={`${row.username}: ${row.crate} lucky spins`}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: GRID,
                                        alignItems: 'center', gap: '0 11px',
                                        padding: isPhone ? '7px 0' : '9px 0',
                                    }}
                                >
                                    <img
                                        src={getDiscordAvatarUrl(row.discordId, row.discordAvatar)}
                                        alt=""
                                        width={21}
                                        height={21}
                                        style={{ display: 'block', borderRadius: '50%', background: DECK.faceDeep }}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                        }}
                                    />

                                    {/*
                                      * The NAMES are on the board from the first
                                      * frame; only the amounts wait for the
                                      * crates.
                                      *
                                      * The first build faded whole rows in as
                                      * they landed, which left a reserved void
                                      * where the manifest goes for the four
                                      * seconds the train takes to unload — the
                                      * board looked broken rather than
                                      * expectant. It is also less true: who is
                                      * on the platform is known the moment the
                                      * train appears, and it is what they are
                                      * getting that is still in the air.
                                      */}
                                    <span style={{
                                        fontFamily: "'Barlow Condensed', system-ui, sans-serif",
                                        fontSize: isPhone ? '13px' : '15px',
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
                                        size={isPhone ? 15 : 17}
                                        tone={isBest ? DECK.amber : DECK.ink}
                                        weight={700}
                                        digits
                                        plate
                                        style={{ justifyContent: 'flex-end', minHeight: isPhone ? 15 : 17 }}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/*
                     * This player's own line, and it is the only place a balance
                     * appears. The manifest above is public — the board is the
                     * whole event and a payout nobody can see is the failure this
                     * replaced — but a running lucky-spin TOTAL is nobody else's
                     * business, so it rides on the private message instead.
                     *
                     * Rendered from the start and faded in on `myLineIn` rather
                     * than mounted at that beat: the line is the last thing on the
                     * board, so mounting it would grow the sign by its height six
                     * seconds after it was lowered into place and shove the rows
                     * up mid-cascade. Holding the space costs nothing — opacity
                     * takes the divider with it, so there is no stray rule sitting
                     * above an empty gap in the meantime.
                     */}
                    {arrivalCrate && (
                        <div
                            aria-hidden={!myLineIn}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '9px',
                                marginTop: '11px', paddingTop: '10px',
                                boxShadow: `inset 0 1px 0 ${rail(0.07)}`,
                                color: COLORS.gold,
                                opacity: myLineIn ? 1 : 0,
                                transition: motionOff ? undefined : 'opacity 420ms ease-out',
                            }}
                        >
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
        </div>
    );
}
