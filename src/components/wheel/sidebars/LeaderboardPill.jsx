import React, { useState } from 'react';
import { COLORS, SPACE } from '../config/constants';
import { Trophy } from 'lucide-react';
import { getDiscordAvatarUrl } from '../../../utils/helpers.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useCollectionLeaderboard } from '../../../hooks/useCollectionLeaderboard.js';

/**
 * The leaderboard, reduced to what belongs on screen permanently.
 *
 * The 380px vertical board that used to sit to the right of the reel was the
 * single biggest claim on the page's width, and almost all of it was spent on
 * standings the player does not need continuously — ranks four through twelve,
 * four sort tabs, per-row spin counts and rarity breakdowns. The one row anyone
 * checks between spins is their own.
 *
 * So this keeps that row and the podium, and hands everything else to the full
 * Leaderboard modal, which already existed behind the nav button and is
 * unchanged. Nothing was lost; it moved one click away, and the reel got the
 * whole right-hand column.
 *
 * `sort=collection` is hardcoded because that is the board's default and the one
 * the pill's "#n" is meaningful for. The modal is where you change sort.
 */
export function LeaderboardPill({ onOpenFull }) {
    const [hovered, setHovered] = useState(false);
    const { user } = useAuth();

    // The fetch, the 5-minute poll and the rank lookup moved into
    // `useCollectionLeaderboard`. The result flanks need the same board — the same
    // request, the same cadence, the same "which row is mine" — and two components
    // polling one endpoint on two timers would disagree about your rank for up to
    // five minutes at a time.
    const { leaderboard, loading, myRank } = useCollectionLeaderboard(user?.id);
    const topThree = leaderboard.slice(0, 3);

    if (loading && leaderboard.length === 0) return null;

    return (
        <button
            onClick={onOpenFull}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            title={myRank ? `You are #${myRank} — open the full leaderboard` : 'Open the full leaderboard'}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: `${SPACE.sm}px`,
                // Matches the topbar's control height. At its natural 34px it was
                // the one thing in the row sitting on a different baseline — four
                // pixels is not enough to look deliberate and is plenty to look
                // like a mistake.
                height: '38px',
                boxSizing: 'border-box',
                padding: `0 ${SPACE.md}px 0 12px`,
                borderRadius: '999px',
                background: hovered ? COLORS.bgLighter : 'rgba(255,255,255,0.03)',
                border: `1px solid ${hovered ? COLORS.gold + '55' : COLORS.border}`,
                color: COLORS.text,
                cursor: 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0,
            }}
        >
            <Trophy size={14} style={{ color: COLORS.gold, flexShrink: 0 }} />

            {/* Your own rank. Absent rather than zero when you are unranked — a
                "#—" reads as a broken value, while nothing reads as "not yet". */}
            {myRank && (
                <span style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: COLORS.gold,
                    fontVariantNumeric: 'tabular-nums',
                }}>
                    #{myRank}
                </span>
            )}

            {/* The podium, as avatars only. Three faces is enough to say who is
                winning; names would double the pill's width for information the
                modal already presents properly. */}
            <span style={{ display: 'flex', alignItems: 'center' }}>
                {topThree.map((entry, i) => (
                    <img
                        key={entry.id}
                        src={getDiscordAvatarUrl(entry.discordId ?? entry.discord_id, entry.avatar ?? entry.discord_avatar)}
                        alt=""
                        width={20}
                        height={20}
                        title={`#${i + 1} ${entry.username || ''}`}
                        style={{
                            borderRadius: '50%',
                            // Overlap so three avatars read as one podium group
                            // rather than three separate controls.
                            marginLeft: i === 0 ? 0 : '-6px',
                            border: `1.5px solid ${i === 0 ? COLORS.gold : COLORS.bg}`,
                            position: 'relative',
                            zIndex: 3 - i,
                        }}
                    />
                ))}
            </span>
        </button>
    );
}
