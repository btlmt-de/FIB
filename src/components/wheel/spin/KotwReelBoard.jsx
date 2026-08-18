import React, { useRef, useLayoutEffect } from 'react';
import { Crown, Trophy, Medal } from 'lucide-react';
import { useActivity } from '../../../context/ActivityContext.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';

/**
 * King of the Wheel standings, in the reel's status bar.
 *
 * The old board was a vertical list in LeaderboardSidebar. That panel no longer
 * sits beside the reel, and a live competition that can only be watched by
 * opening a modal is the wrong shape for something that changes every few
 * seconds — so it comes back here, where you are already looking.
 *
 * This is the same design turned on its side: the rank badge (crown, trophy,
 * medal for the podium, a number below that), the name, the monospace point
 * count, and the crimson highlight on your own row. Same palette, same
 * vocabulary — only the axis changed.
 *
 * It lives in the status bar — the row that reads "Ready to spin" / "Spinning…"
 * above the reel. That row already spans the full width and carries only a label
 * on the left and two buttons on the right, so its middle is the largest piece of
 * unused horizontal space on the surface.
 *
 * Sized to the old board's proportions — a 30px rank badge and 18px monospace
 * points — rather than shrunk to fit the gap. The status bar's left group
 * already carries a 32px wheel mark, so chips of this height cost the row
 * almost nothing.
 *
 * It was briefly tucked into the band's headroom instead — the ~41px of clear
 * space above the item sprites. That worked, but it put the standings over a reel
 * travelling at speed and squeezed them into a gap defined by the sprite scale,
 * which meant any change to STRIP_HEIGHT or that scale would silently start
 * overlapping the items. The status bar has neither problem.
 */

const KOTW_BG_DARK = '#0F172A';
const KOTW_PRIMARY = '#F43F5E';
const KOTW_TEXT = '#F8FAFC';
const KOTW_SILVER = '#94A3B8';
const KOTW_GOLD = '#F59E0B';
const KOTW_BRONZE = '#B45309';

const RANK_COLORS = [KOTW_GOLD, KOTW_SILVER, KOTW_BRONZE];
const RANK_ICONS = [Crown, Trophy, Medal];

export function KotwReelBoard() {
    const { globalEventStatus, kotwLeaderboard, kotwUserStats, kotwSpinPending } = useActivity();
    const { user } = useAuth();

    // ── Overtake animation ───────────────────────────────────────────────────
    //
    // When someone passes someone else the chips swap places. Done plainly that is
    // a hard cut: two names are simply somewhere else on the next render, and the
    // one thing a live competition should make legible — that a position changed —
    // is the one thing you cannot see.
    //
    // This is FLIP. Before the browser paints, each chip's new x is compared with
    // where it was last render; any that moved are offset back to their old
    // position and then released, so they slide to the new one. Nothing animates
    // on mount, only on a change of order, and the transform runs on the
    // compositor rather than through layout.
    //
    // The old vertical board did NOT do this — its KOTW rows were plain divs that
    // reordered instantly. The `slideIn` in that file belongs to the collection
    // leaderboard's rows, not these.
    const chipRefs = useRef(new Map());
    const prevX = useRef(new Map());
    const prevOrder = useRef('');

    useLayoutEffect(() => {
        const reduce = typeof window !== 'undefined'
            && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

        // Only an actual overtake animates.
        //
        // Keyed on the sequence of ids, not on whether anyone's x moved. Those are
        // different questions: the whole row shifts whenever the status bar's
        // contents change width, and animating that made five chips glide sideways
        // every time the label changed or the Try Again button appeared — motion
        // that looked like an overtake and meant nothing. The row is centred
        // independently of its neighbours now, so that should not happen at all,
        // but this is the guarantee rather than the assumption.
        const order = [...chipRefs.current.keys()].join(',');
        const reordered = prevOrder.current !== '' && prevOrder.current !== order;
        prevOrder.current = order;

        const next = new Map();
        chipRefs.current.forEach((el, id) => {
            if (!el) return;
            const x = el.getBoundingClientRect().left;
            next.set(id, x);

            const old = prevX.current.get(id);
            if (old == null || reduce || !reordered) return;
            const delta = old - x;
            if (Math.abs(delta) < 1) return;

            // Jump back to where it was, then release on the next frame.
            el.style.transition = 'none';
            el.style.transform = `translateX(${delta}px)`;
            requestAnimationFrame(() => {
                el.style.transition = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)';
                el.style.transform = 'translateX(0)';
            });
        });
        prevX.current = next;
    });

    const isKotw = globalEventStatus?.active && globalEventStatus?.type === 'king_of_wheel';
    if (!isKotw || !kotwLeaderboard?.length) return null;

    // Five across is what fits before names start colliding at this height. The
    // full board is in the leaderboard modal, which has its own KOTW mode.
    const entries = kotwLeaderboard.slice(0, 5);

    return (
        <div
            style={{
                // Sized to its content. The status bar's left and right groups
                // each take `flex: 1 1 0`, so they absorb the slack evenly and
                // this stays centred on the bar no matter what they contain.
                flex: '0 0 auto',
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                flexWrap: 'nowrap',
                overflow: 'hidden',
                padding: '0 16px',
                pointerEvents: 'none',
            }}
        >
            {entries.map((entry, index) => {
                const RankIcon = RANK_ICONS[index] || null;
                const rankColor = RANK_COLORS[index] || KOTW_SILVER;
                const isCurrentUser = entry.userId === user?.id;

                return (
                    <div
                        key={entry.userId}
                        ref={el => {
                            if (el) chipRefs.current.set(entry.userId, el);
                            else chipRefs.current.delete(entry.userId);
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '6px 14px 6px 6px',
                            borderRadius: '10px',
                            // The status bar is a solid surface, so these no
                            // longer need to be near-opaque to stay readable the
                            // way they did when they sat over the moving reel.
                            background: isCurrentUser
                                ? `linear-gradient(135deg, ${KOTW_PRIMARY}33, ${KOTW_BG_DARK}CC)`
                                : `${KOTW_BG_DARK}99`,
                            border: isCurrentUser
                                ? `1px solid ${KOTW_PRIMARY}AA`
                                : `1px solid ${rankColor}44`,
                            boxShadow: isCurrentUser
                                ? `0 0 14px -4px ${KOTW_PRIMARY}`
                                : 'none',
                            minWidth: 0,
                            flexShrink: 1,
                        }}
                    >
                        {/* Rank badge */}
                        <span style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '8px',
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: index < 3
                                ? `linear-gradient(135deg, ${rankColor}40, ${rankColor}18)`
                                : 'rgba(255,255,255,0.06)',
                            border: `1px solid ${rankColor}55`,
                        }}>
                            {RankIcon
                                ? <RankIcon size={16} color={rankColor} />
                                : <span style={{ fontSize: '13px', fontWeight: 700, color: KOTW_SILVER }}>{index + 1}</span>}
                        </span>

                        <span style={{
                            fontSize: '14px',
                            fontWeight: isCurrentUser ? 700 : 600,
                            color: isCurrentUser ? KOTW_PRIMARY : KOTW_TEXT,
                            maxWidth: '150px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {entry.username}
                        </span>

                        <span style={{
                            fontSize: '18px',
                            fontWeight: 900,
                            fontFamily: 'monospace',
                            color: index < 3 ? rankColor : KOTW_TEXT,
                            flexShrink: 0,
                        }}>
                            {/* While your own spin is resolving, show the confirmed
                                total rather than the optimistic one — the points
                                land server-side and jumping early then correcting
                                is worse than a beat of delay. */}
                            {isCurrentUser && kotwSpinPending
                                ? (kotwUserStats?.points ?? entry.points)
                                : entry.points}
                        </span>
                        <span style={{
                            fontSize: '10px',
                            color: KOTW_SILVER,
                            flexShrink: 0,
                            marginLeft: '-5px',
                        }}>
                            pts
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
