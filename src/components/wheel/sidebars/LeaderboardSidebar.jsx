import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../../../config/constants.js';
import { COLORS, DECK, rail } from '../config/constants';
import { FlapText, BoardLabel, Plinth, Segmented } from '../features/collection/FlapBoard.jsx';
import { prestigeInk, prestigeIcon, prestigeLabel, isIridescentPrestige, prestigeStanding } from '../../../utils/prestigeHelpers.js';
import { PrestigeRing } from '../spin/StageFlanks.jsx';
import { useWheelViewport } from '../config/breakpoints.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useActivity } from '../../../context/ActivityContext.jsx';
import { RARITY, RARITY_KEYS, getRarityIcon, getRarityInk } from '../../../utils/rarityHelpers.jsx';
import { UserProfile } from '../features/UserProfile.jsx';
import {
    Trophy, RefreshCw, Crown, Medal, Award,
    BookOpen, TrendingUp, Layers, Zap, Timer, Swords, Info, X
} from 'lucide-react';

/** Global-totals field names. Pluralised, and distinct from the per-player
 *  `*_count` fields — these come from getGlobalStats, a separate query. */
const GLOBAL_TOTAL_FIELD = {
    insane: 'total_insanes',
    mythic: 'total_mythics',
    legendary: 'total_legendaries',
    exotic: 'total_exotics',
    rare: 'total_rares',
};

// KOTW Colors - Crimson Obsidian theme (aggressive/competitive)
const KOTW_BG = '#1E293B';        // Cool Slate Grey
const KOTW_BG_DARK = '#0F172A';   // Dark Graphite (depth)
const KOTW_PRIMARY = '#F43F5E';   // Vivid Crimson/Blood Orange
const KOTW_TEXT = '#F8FAFC';      // Ice White
const KOTW_GOLD = '#F59E0B';      // Gold for 1st place
const KOTW_SILVER = '#94A3B8';    // Silver for 2nd
const KOTW_BRONZE = '#D97706';    // Bronze for 3rd

/*
 * One number format, forced to en-US.
 *
 * `toLocaleString()` with no locale follows the browser, so this board printed
 * "331.955" on a German machine while the collection board — which passes
 * 'en-US' explicitly — printed "331,955" two panels away. PRODUCT.md commits the
 * site to English with no localisation planned, so the separator is a constant,
 * not a preference.
 */
const fmtNum = n => (typeof n === 'number' && isFinite(n) ? n : Number(n) || 0).toLocaleString('en-US');

/* A prestige level is worn as a numeral. Same table as the collection board's. */
const ROMAN = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };

// Helper to get Discord avatar URL
function getDiscordAvatarUrl(discordId, avatarHash, size = 64) {
    if (avatarHash) {
        const format = avatarHash.startsWith('a_') ? 'gif' : 'png';
        return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${format}?size=${size}`;
    }
    try {
        if (!discordId || !/^\d+$/.test(String(discordId))) {
            return `https://cdn.discordapp.com/embed/avatars/0.png`;
        }
        const defaultIndex = (BigInt(discordId) >> 22n) % 6n;
        return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
    } catch {
        return `https://cdn.discordapp.com/embed/avatars/0.png`;
    }
}

/**
 * The full leaderboard, as a board.
 *
 * There used to be two leaderboards: this one and features/Leaderboard.jsx, which
 * the nav button opened. They had drifted apart in both directions — this panel
 * grew the whole King of the Wheel mode (live KOTW standings, your points and
 * rank, the countdown) which the modal never had, while the modal had the global
 * totals strip which this never had. Neither was a superset, so "open the full
 * leaderboard" showed you *fewer* features than the panel beside it.
 *
 * It was once two: a 380px rail and a modal, sharing one component through an
 * global totals and swaps the expand button for a close button. Everything else —
 * the KOTW mode, the rank badges, the tabs, the profile drill-in — is shared,
 * which is the point: there is no longer a version of this that lags behind.
 */
export function LeaderboardSidebar({ onClose }) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [activeTab, setActiveTab] = useState('collection');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showKotwMode, setShowKotwMode] = useState(false);
    const intervalRef = useRef(null);
    const kotwExpiryTimeoutRef = useRef(null); // Track expiry-based hide timeout
    const { user } = useAuth();
    const { isPhone } = useWheelViewport();
    const { globalEventStatus, kotwLeaderboard, kotwUserStats, kotwSpinPending } = useActivity();

    // Auto-enable KOTW mode when event is active, auto-disable when it ends
    // Also check expiresAt as a fallback in case SSE event_end is missed
    const eventExpired = globalEventStatus?.expiresAt && Date.now() > globalEventStatus.expiresAt;
    const isKotwActive = globalEventStatus?.type === 'king_of_wheel' &&
        (globalEventStatus?.active || globalEventStatus?.pending) &&
        !eventExpired;

    // KOTW timer state for real-time updates
    const [kotwRemainingTime, setKotwRemainingTime] = useState(0);
    const [pendingCountdownTime, setPendingCountdownTime] = useState(0);

    useEffect(() => {
        if (isKotwActive && !showKotwMode) {
            setShowKotwMode(true);
        } else if (!isKotwActive && showKotwMode) {
            // Auto-disable KOTW mode after event ends (with delay to show final results)
            const timeout = setTimeout(() => {
                setShowKotwMode(false);
            }, 8000); // 8 seconds to see final standings
            return () => clearTimeout(timeout);
        }
    }, [isKotwActive, showKotwMode]);

    // Update KOTW timer every second (both active and pending countdown)
    useEffect(() => {
        if (!isKotwActive || !showKotwMode) {
            // Clear expiry timeout if event is no longer active
            if (kotwExpiryTimeoutRef.current) {
                clearTimeout(kotwExpiryTimeoutRef.current);
                kotwExpiryTimeoutRef.current = null;
            }
            return;
        }

        const updateTimer = () => {
            // Update active event remaining time
            if (globalEventStatus?.expiresAt) {
                const remaining = Math.max(0, globalEventStatus.expiresAt - Date.now());
                setKotwRemainingTime(remaining);

                // Fallback: if timer hits 0, force hide the overlay after a brief delay
                // This handles the case where SSE global_event_end is missed
                if (remaining === 0 && !kotwExpiryTimeoutRef.current) {
                    kotwExpiryTimeoutRef.current = setTimeout(() => {
                        kotwExpiryTimeoutRef.current = null;
                        setShowKotwMode(false);
                    }, 8000); // Same delay as normal end to show final standings
                }
            }
            // Update pending countdown time
            if (globalEventStatus?.pending && globalEventStatus?.activatesAt) {
                setPendingCountdownTime(Math.max(0, globalEventStatus.activatesAt - Date.now()));
            } else {
                setPendingCountdownTime(0);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => {
            clearInterval(interval);
            // Don't clear kotwExpiryTimeoutRef here - let it complete its task
        };
    }, [isKotwActive, showKotwMode, globalEventStatus?.expiresAt, globalEventStatus?.activatesAt, globalEventStatus?.pending]);

    // Global totals, ported from the modal this replaced. Only fetched in modal
    // mode: the 380px panel has nowhere to put a six-column strip, and firing the
    // request for a view that will not render it is a wasted round trip on a page
    // that already preloads an entire item atlas.
    const [globalStats, setGlobalStats] = useState(null);
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/stats/global`)
            .then(res => res.json())
            .then(data => setGlobalStats(data))
            .catch(err => console.error('Failed to fetch global stats:', err));
    }, []);

    const loadLeaderboard = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/leaderboard?sort=${activeTab}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setLeaderboard(data.leaderboard || []);
            setLastUpdated(new Date());
        } catch (e) {
            console.error('Failed to load leaderboard:', e);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        loadLeaderboard();

        // Auto-refresh every 5 minutes
        intervalRef.current = setInterval(loadLeaderboard, 5 * 60 * 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [loadLeaderboard]);

    const sortOptions = {
        collection: { label: 'Items', icon: <BookOpen size={12} />, color: COLORS.gold },
        spins: { label: 'Spins', icon: <TrendingUp size={12} />, color: COLORS.text },
        duplicates: { label: 'Dupes', icon: <Layers size={12} />, color: COLORS.accent },
        events: { label: 'Events', icon: <Zap size={12} />, color: COLORS.orange },
    };

    const getValueForTab = (entry) => {
        let value;
        switch (activeTab) {
            case 'collection': value = entry.unique_items; break;
            case 'spins': value = entry.total_spins; break;
            case 'duplicates': value = entry.total_duplicates; break;
            case 'events': value = entry.event_triggers; break;
            default: value = entry.unique_items;
        }
        return value ?? 0; // Coerce null/undefined to 0
    };

    // Format time for KOTW timer
    const formatKotwTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Render KOTW Leaderboard overlay
    const renderKotwLeaderboard = () => {
        const remainingTime = kotwRemainingTime;
        const isPending = globalEventStatus?.pending;
        const countdownTime = pendingCountdownTime;

        const rankColors = [KOTW_GOLD, KOTW_SILVER, KOTW_BRONZE];
        const RankIcons = [Crown, Trophy, Medal];

        return (
            <div style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(180deg, ${KOTW_BG} 0%, ${KOTW_BG_DARK} 50%, ${KOTW_BG}ee 100%)`,
                borderRadius: '16px',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* KOTW Header */}
                <div style={{
                    padding: '16px 18px',
                    borderBottom: `2px solid ${KOTW_PRIMARY}`,
                    background: `linear-gradient(180deg, ${KOTW_PRIMARY}18 0%, transparent 100%)`,
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: `linear-gradient(135deg, ${KOTW_PRIMARY}30, ${KOTW_BG_DARK})`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `1px solid ${KOTW_PRIMARY}50`,
                            }}>
                                <Crown size={20} color={KOTW_PRIMARY} />
                            </div>
                            <div>
                                <h3 style={{
                                    margin: 0,
                                    color: KOTW_TEXT,
                                    fontSize: '15px',
                                    fontWeight: '700',
                                }}>
                                    King of the Wheel
                                </h3>
                                <div style={{
                                    fontSize: '11px',
                                    color: KOTW_PRIMARY,
                                }}>
                                    {isPending ? 'Starting soon...' : 'Competition active'}
                                </div>
                            </div>
                        </div>

                        {/* Timer / Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isPending ? (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    background: `${KOTW_PRIMARY}33`,
                                    borderRadius: '8px',
                                    border: `1px solid ${KOTW_PRIMARY}`,
                                }}>
                                    <Swords size={14} color={KOTW_PRIMARY} />
                                    <span style={{
                                        fontSize: '16px',
                                        fontWeight: 700,
                                        color: KOTW_PRIMARY,
                                    }}>
                                        {Math.ceil(countdownTime / 1000)}
                                    </span>
                                </div>
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    background: remainingTime < 60000 ? 'rgba(255,68,68,0.2)' : `${KOTW_PRIMARY}22`,
                                    borderRadius: '8px',
                                    border: `1px solid ${remainingTime < 60000 ? '#ff4444' : KOTW_PRIMARY}66`,
                                }}>
                                    <Timer size={14} color={remainingTime < 60000 ? '#ff4444' : KOTW_PRIMARY} />
                                    <span style={{
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        color: remainingTime < 60000 ? '#ff4444' : KOTW_PRIMARY,
                                        fontFamily: 'monospace',
                                    }}>
                                        {formatKotwTime(remainingTime)}
                                    </span>
                                </div>
                            )}

                            <button
                                onClick={() => setShowKotwMode(false)}
                                style={{
                                    background: `${COLORS.bgLighter}60`,
                                    border: `1px solid ${COLORS.border}`,
                                    color: COLORS.textMuted,
                                    cursor: 'pointer',
                                    padding: '7px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                                title="Show normal leaderboard"
                            >
                                <Trophy size={14} />
                            </button>
                        </div>
                    </div>

                    {/* User's stats */}
                    {kotwUserStats && kotwUserStats.points > 0 && (
                        <div style={{
                            marginTop: '12px',
                            padding: '10px 14px',
                            background: KOTW_BG_DARK,
                            borderRadius: '10px',
                            border: `1px solid ${KOTW_PRIMARY}44`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: KOTW_SILVER, fontSize: '12px' }}>Your score:</span>
                                <span style={{
                                    fontSize: '20px',
                                    fontWeight: 900,
                                    color: KOTW_PRIMARY,
                                    fontFamily: 'monospace',
                                }}>
                                    {kotwUserStats.points}
                                </span>
                                <span style={{ color: KOTW_SILVER, fontSize: '12px' }}>pts</span>
                            </div>
                            {kotwUserStats.rank && (
                                <div style={{
                                    padding: '4px 10px',
                                    background: kotwUserStats.rank <= 3 ? `${rankColors[kotwUserStats.rank - 1]}33` : `${KOTW_PRIMARY}33`,
                                    borderRadius: '6px',
                                    border: `1px solid ${kotwUserStats.rank <= 3 ? rankColors[kotwUserStats.rank - 1] : KOTW_PRIMARY}66`,
                                }}>
                                    <span style={{
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        color: kotwUserStats.rank <= 3 ? rankColors[kotwUserStats.rank - 1] : KOTW_TEXT,
                                    }}>
                                        #{kotwUserStats.rank}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Leaderboard List */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px',
                }}>
                    {(!kotwLeaderboard || kotwLeaderboard.length === 0) ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: KOTW_PRIMARY,
                            gap: '12px',
                        }}>
                            <Swords size={40} style={{ opacity: 0.6 }} />
                            <span style={{ fontSize: '14px', color: KOTW_TEXT, opacity: 0.8 }}>
                                {isPending ? 'Competition starting soon...' : 'Spin to earn points!'}
                            </span>
                            <span style={{ fontSize: '12px', color: KOTW_SILVER, opacity: 0.6 }}>
                                Rarer items = more points
                            </span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {kotwLeaderboard.map((entry, index) => {
                                const RankIcon = RankIcons[index] || Award;
                                const rankColor = rankColors[index] || KOTW_SILVER;
                                const isCurrentUser = entry.userId === user?.id;

                                return (
                                    <div
                                        key={entry.userId}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px 14px',
                                            background: isCurrentUser
                                                ? `linear-gradient(135deg, ${KOTW_PRIMARY}25, ${KOTW_BG_DARK})`
                                                : KOTW_BG_DARK,
                                            borderRadius: '10px',
                                            border: isCurrentUser
                                                ? `2px solid ${KOTW_PRIMARY}88`
                                                : `1px solid ${KOTW_BG}`,
                                        }}
                                    >
                                        {/* Rank */}
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            background: index < 3
                                                ? `linear-gradient(135deg, ${rankColor}40, ${rankColor}20)`
                                                : KOTW_BG,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: `1px solid ${index < 3 ? rankColor : KOTW_BG}60`,
                                        }}>
                                            {index < 3 ? (
                                                <RankIcon size={16} color={rankColor} />
                                            ) : (
                                                <span style={{
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    color: KOTW_SILVER,
                                                }}>
                                                    {index + 1}
                                                </span>
                                            )}
                                        </div>

                                        {/* Name */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '14px',
                                                fontWeight: isCurrentUser ? 700 : 600,
                                                color: isCurrentUser ? KOTW_PRIMARY : KOTW_TEXT,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {entry.username}
                                                {isCurrentUser && ' (You)'}
                                            </div>
                                            <div style={{
                                                fontSize: '11px',
                                                color: KOTW_SILVER,
                                            }}>
                                                {entry.spins} spin{entry.spins !== 1 ? 's' : ''}
                                            </div>
                                        </div>

                                        {/* Points */}
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{
                                                fontSize: '18px',
                                                fontWeight: 900,
                                                color: index < 3 ? rankColor : KOTW_TEXT,
                                                fontFamily: 'monospace',
                                            }}>
                                                {/* For current user while spinning, show confirmed value to prevent premature updates */}
                                                {isCurrentUser && kotwSpinPending
                                                    ? (kotwUserStats?.points || 0)
                                                    : entry.points}
                                            </div>
                                            <div style={{
                                                fontSize: '10px',
                                                color: KOTW_SILVER,
                                            }}>
                                                pts
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div style={{
                    padding: '10px 16px',
                    borderTop: `1px solid ${KOTW_PRIMARY}44`,
                    background: KOTW_BG_DARK,
                    fontSize: '11px',
                    color: KOTW_TEXT,
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                }}>
                    <style>{`
                        .kotw-lucky-info:hover .kotw-lucky-tooltip {
                            opacity: 1 !important;
                            visibility: visible !important;
                        }
                    `}</style>
                    <Trophy size={14} color={KOTW_GOLD} /> Winner earns Lucky Spins based on score!
                    <span style={{ position: 'relative', display: 'inline-flex' }} className="kotw-lucky-info">
                        <Info size={12} color="#94A3B8" style={{ cursor: 'help' }} />
                        <span className="kotw-lucky-tooltip" style={{
                            position: 'absolute',
                            bottom: '100%',
                            right: 0,
                            marginBottom: '8px',
                            padding: '10px 14px',
                            background: '#1E293B',
                            border: `1px solid ${KOTW_PRIMARY}44`,
                            borderRadius: '8px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                            whiteSpace: 'nowrap',
                            fontSize: '11px',
                            color: '#E2E8F0',
                            zIndex: 1000,
                            opacity: 0,
                            visibility: 'hidden',
                            transition: 'opacity 0.2s, visibility 0.2s',
                            pointerEvents: 'none',
                            textAlign: 'left',
                        }}>
                            <div style={{ fontWeight: 700, color: KOTW_GOLD, marginBottom: '6px' }}>Lucky Spin Formula</div>
                            <div style={{ fontFamily: 'monospace', color: '#94A3B8', marginBottom: '8px' }}>
                                log₂(points ÷ 50 + 1) × 4
                            </div>
                            <div style={{ display: 'flex', gap: '12px', color: '#CBD5E1' }}>
                                <span>50pts → <strong style={{ color: '#22C55E' }}>4</strong></span>
                                <span>500pts → <strong style={{ color: '#22C55E' }}>13</strong></span>
                                <span>3000pts → <strong style={{ color: '#22C55E' }}>23</strong></span>
                            </div>
                            {/* Tooltip arrow */}
                            <div style={{
                                position: 'absolute',
                                bottom: '-6px',
                                right: '8px',
                                width: 0,
                                height: 0,
                                borderLeft: '6px solid transparent',
                                borderRight: '6px solid transparent',
                                borderTop: `6px solid ${KOTW_PRIMARY}44`,
                            }} />
                        </span>
                    </span>
                </div>
            </div>
        );
    };

    /*
     * ── THE BOARD ───────────────────────────────────────────────────────────
     *
     * A leaderboard is a departure board with the sort turned round: a concourse
     * ranks by time, this ranks by whichever measure the lens is on. So it is the
     * collection board's register, verbatim — the deck's material, ruled rows, no
     * boxes and no radius, values on split-flap drums — and almost nothing here
     * had to be invented for it.
     *
     * ── WHAT THE OLD TABLE GOT WRONG, AND IT WAS NOT ONLY THE LOOK ──────────
     *
     * It showed ITEMS, SPINS and DUPES as three permanent columns *above a row of
     * filters that select between exactly those measures*. Sorting by Spins gave
     * you a Spins column twice — once as the highlighted metric, once as its own
     * column — and players said so. A filter and a column are two answers to the
     * same question, and the filter is the one that was asked.
     *
     * So there is one measure column and the lens names it. What replaces the
     * width the other two were filling is a share-of-leader meter, which is the
     * thing a ranking actually wants and a number in a column cannot give: how
     * far ahead first place is.
     */
    const metricTone = {
        collection: DECK.amber,
        spins: DECK.ink,
        duplicates: COLORS.accent,
        events: COLORS.orange,
    }[activeTab] || DECK.amber;

    /*
     * "In prestige" answers whichever metric the lens is on.
     *
     * Items come from a count of the run's own rows; the other three are the
     * player's career total minus the baseline recorded when the run opened.
     * That baseline is why this works at all — spins cannot be counted from
     * spin_history (event and recursion spins never write a row), and events have
     * no timestamped record anywhere, so without it three of the four metrics
     * would have to be guessed.
     *
     * Returns null for "nothing to say": not prestiging, or a run that started
     * before the baselines were recorded. Null prints as a dot, never as a zero —
     * a zero here would be a measurement, and there isn't one.
     */
    const prestigeValueFor = (entry) => {
        if (!(entry.prestige_active_level > 0)) return null;

        const since = (total, base) =>
            (base === null || base === undefined) ? null : Math.max(0, (total || 0) - base);

        switch (activeTab) {
            case 'collection': return entry.prestige_items ?? null;
            case 'spins': return since(entry.total_spins, entry.prestige_spins_at_start);
            case 'duplicates': return since(entry.total_duplicates, entry.prestige_duplicates_at_start);
            case 'events': return since(entry.event_triggers, entry.prestige_events_at_start);
            default: return entry.prestige_items ?? null;
        }
    };

    const rows = leaderboard.slice(0, 100);

    /*
     * RANK | avatar | PLAYER | measure | share | prestige | collection
     *
     * The phone carries the first four and stops. It began with the collection
     * marks too and the name column resolved to **zero pixels**: five tier marks
     * are 130px of fixed width, and on a 390px screen — inset by the modal's own
     * padding twice over — the fixed columns wanted more than the row had, so the
     * one flexible column absorbed the whole shortfall and every player on the
     * board went nameless.
     *
     * Dropping the marks rather than shrinking them is the honest trade: a
     * ranking whose rows have no names is not a smaller ranking, it is a broken
     * one, and per-tier counts at 10px were the least legible thing on the phone
     * anyway. They are still on the desktop board and in every player's profile.
     */
    /*
     * The collection column is a LENGTH, not `auto`, and it is derived from the
     * marks that fill it.
     *
     * With `auto` the header and the rows share one template and size that column
     * to two different contents — the word "Collection" up top, five tier marks
     * below — so the flexible name column absorbed the difference and every column
     * after it drifted, measured at 70px and 112px. One template only lines up
     * when every track resolves the same on both.
     */
    const markTiers = RARITY_KEYS.filter(k => GLOBAL_TOTAL_FIELD[k]);
    const MARK_W = 34;
    const marksWidth = markTiers.length * MARK_W;

    const boardColumns = isPhone
        ? '30px 24px minmax(0, 1fr) 76px'
        : `46px 30px minmax(0, 1fr) 96px 118px 62px ${marksWidth}px`;

    return (
        <>
            <div
                className="fib-board-scroll"
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '1180px',
                    height: isPhone ? '100%' : 'min(88vh, 860px)',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundImage: DECK.face,
                    // The board's three edges: a lit rail along the top, a front
                    // lip at the bottom, and the shadow that seats it on the scrim.
                    boxShadow: [
                        `inset 0 1px 0 ${rail(0.12)}`,
                        'inset 0 -2px 0 rgba(0,0,0,0.55)',
                        `inset 0 -3px 0 ${rail(0.09)}`,
                        '0 32px 80px rgba(0,0,0,0.65)',
                    ].join(', '),
                    overflow: 'hidden',
                }}
            >
                {/* KOTW keeps its own world. It is a spin mode with its own
                    identity, documented separately, and it overlays this board
                    rather than restyling it. */}
                {showKotwMode && isKotwActive && renderKotwLeaderboard()}

                {/* ── THE HEAD ────────────────────────────────────────────── */}
                <div style={{
                    position: 'relative',
                    flex: '0 0 auto',
                    padding: isPhone ? '16px 16px 0' : '24px 26px 0',
                    backgroundImage: `linear-gradient(180deg, ${DECK.sky} 0%, transparent 78%)`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', minWidth: 0 }}>
                            <FlapText
                                text="Leaderboard"
                                size={isPhone ? 26 : 36}
                                tone={DECK.ink}
                                weight={800}
                                plate
                            />
                            <BoardLabel tone={DECK.inkDim}>
                                {leaderboard.length} {leaderboard.length === 1 ? 'player' : 'players'}
                            </BoardLabel>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
                            <Plinth
                                as="button"
                                className="fib-board-hit"
                                onClick={loadLeaderboard}
                                aria-label="Refresh the leaderboard"
                                style={{
                                    width: '36px', height: '36px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: DECK.inkMid,
                                }}
                            ><RefreshCw size={14} /></Plinth>
                            {onClose && (
                                <Plinth
                                    as="button"
                                    className="fib-board-hit"
                                    onClick={onClose}
                                    aria-label="Close the leaderboard"
                                    style={{
                                        width: '36px', height: '36px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: DECK.inkMid,
                                    }}
                                ><X size={16} /></Plinth>
                            )}
                        </div>
                    </div>

                    {/* The server's own totals, as the board's second register.
                        Not a vanity banner: a player's 1,559 means nothing until
                        you know the field pulled 331,955 spins to get there. */}
                    {globalStats && (
                        <div style={{
                            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                            flexWrap: 'wrap', gap: '16px',
                            margin: isPhone ? '14px 0 10px' : '20px 0 10px',
                        }}>
                            <div style={{ display: 'flex' }}>
                                {[
                                    { label: 'Players', value: fmtNum(globalStats.total_players ?? leaderboard.length) },
                                    { label: 'Spins', value: fmtNum(globalStats.total_spins) },
                                ].map((f, i) => (
                                    <div
                                        key={f.label}
                                        style={{
                                            padding: i === 0 ? '0 22px 0 0' : '0 22px',
                                            boxShadow: i > 0 ? `inset 1px 0 0 ${rail(0.07)}` : undefined,
                                        }}
                                    >
                                        <FlapText text={f.value} size={isPhone ? 22 : 27} tone={DECK.ink} plate delay={60 + i * 40} />
                                        <div style={{ marginTop: '7px' }}><BoardLabel>{f.label}</BoardLabel></div>
                                    </div>
                                ))}
                            </div>

                            {/* Every special ever pulled on the server, by tier.
                                Tier ink, no chips — the ladder's colours are the
                                only labelling this needs. */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 18px' }}>
                                {markTiers.map(key => (
                                    <span key={key} style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                        <BoardLabel size={13} tone={getRarityInk(key)} style={{ letterSpacing: '0.03em' }}>
                                            {fmtNum(globalStats[GLOBAL_TOTAL_FIELD[key]])}
                                        </BoardLabel>
                                        <BoardLabel>{RARITY[key].label}</BoardLabel>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* The board's baseline. A rule and not a meter: a ranking has
                        no completion to fill one with, and a bar that measures
                        nothing is the worst thing on a board of real numbers. */}
                    <div style={{ height: '2px', background: 'rgba(0,0,0,0.45)', boxShadow: `inset 0 1px 0 ${rail(0.10)}` }} />
                </div>

                {/* ── THE LENS ────────────────────────────────────────────── */}
                <div style={{
                    flex: '0 0 auto',
                    display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                    padding: isPhone ? '12px 16px' : '14px 26px 12px',
                }}>
                    <BoardLabel>Rank by</BoardLabel>
                    <Segmented
                        value={activeTab}
                        onChange={setActiveTab}
                        options={Object.entries(sortOptions).map(([id, o]) => [id, o.label])}
                        label="Rank the board by"
                        tone={metricTone}
                    />
                    <div style={{ flex: '1 1 auto' }} />
                    {lastUpdated && (
                        <BoardLabel tone={DECK.inkDim}>
                            Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </BoardLabel>
                    )}
                </div>

                {/* ── THE REGISTER ──────────────────────────────────────────
                    The column headings live INSIDE the scroller, and that is not a
                    tidiness preference. Outside it, the scrollbar narrows the rows
                    by its own width and not the header, so the flexible name
                    column resolves wider up there and every column after it is
                    thrown out — measured here at 12px of drift before it was moved.
                    Sharing the scroll box means sharing whatever the scrollbar
                    takes, on whatever platform, present or not.

                    Sticky, because a header on a hundred-row table that scrolls
                    away is a header that stops working exactly when it is needed.
                    It bleeds to the scroller's edges with a negative margin while
                    keeping the rows' padding, so its ground spans the full width
                    and its grid still lines up with theirs. */}
                <div
                    className="fib-board-scroll"
                    style={{
                        flex: '1 1 auto', minHeight: 0, overflowY: 'auto',
                        padding: isPhone ? '0 16px 12px' : '0 26px 16px',
                        background: 'rgba(0,0,0,0.30)',
                        boxShadow: `inset 0 1px 0 ${rail(0.08)}`,
                    }}
                >
                    <div style={{
                        position: 'sticky', top: 0, zIndex: 2,
                        display: 'grid', gridTemplateColumns: boardColumns,
                        alignItems: 'center', gap: '0 12px',
                        marginInline: isPhone ? '-16px' : '-26px',
                        paddingInline: isPhone ? '16px' : '26px',
                        paddingBlock: '10px 8px',
                        backgroundImage: DECK.face,
                        boxShadow: `inset 0 -1px 0 ${rail(0.08)}`,
                    }}>
                        <BoardLabel>#</BoardLabel>
                        <span />
                        <BoardLabel>Player</BoardLabel>
                        {/* One measure column, named by the lens. */}
                        <BoardLabel tone={metricTone} style={{ textAlign: 'right' }}>
                            {sortOptions[activeTab].label}
                        </BoardLabel>
                        {/* Named for the metric, so the column never reads as
                            "items" while the board is ranked by spins. */}
                        {!isPhone && (
                            <BoardLabel tone={metricTone} style={{ textAlign: 'right' }}>
                                {`${sortOptions[activeTab].label} in prestige`}
                            </BoardLabel>
                        )}
                        {!isPhone && <BoardLabel style={{ textAlign: 'right' }}>Prestige</BoardLabel>}
                        {!isPhone && <BoardLabel style={{ textAlign: 'right' }}>Collection</BoardLabel>}
                    </div>
                    {loading && rows.length === 0 ? (
                        <div style={{ padding: '28px 0', textAlign: 'center' }}>
                            <BoardLabel tone={DECK.inkDim}>Reading the board…</BoardLabel>
                        </div>
                    ) : rows.length === 0 ? (
                        <div style={{ padding: '28px 0', textAlign: 'center' }}>
                            <BoardLabel tone={DECK.inkDim}>No players on the board yet</BoardLabel>
                        </div>
                    ) : rows.map((entry, idx) => {
                        const rank = idx + 1;
                        const isMe = user && user.id === entry.id;
                        const value = getValueForTab(entry);
                        const standing = prestigeStanding(entry);
                        const level = standing.level;
                        // One value for the label and the drums. They had the
                        // fallback in different places, so a null username was
                        // announced as "null, rank 4" while the row read "Unknown".
                        const name = entry.custom_username || 'Unknown';
                        const prestigeValue = prestigeValueFor(entry);
                        // The medal metals, which DESIGN.md SS8 sanctions for
                        // placings and nothing else. Beyond third the numeral is
                        // ordinary ink: a board where every rank is decorated has
                        // no podium.
                        const rankTone = rank === 1 ? KOTW_GOLD
                            : rank === 2 ? KOTW_SILVER
                            : rank === 3 ? KOTW_BRONZE
                            : DECK.inkDim;

                        return (
                            <button
                                key={entry.id}
                                className={`fib-board-hit fib-register-row${isMe ? ' is-active' : ''}`}
                                onClick={() => setSelectedUser(entry.id)}
                                aria-label={`${name}, rank ${rank}, ${fmtNum(value)} ${sortOptions[activeTab].label.toLowerCase()}${level > 0 ? `, ${prestigeLabel(level)}` : ''}`}
                                style={{
                                    display: 'grid', gridTemplateColumns: boardColumns,
                                    alignItems: 'center', gap: '0 12px',
                                    width: '100%', padding: isPhone ? '9px 0' : '11px 0',
                                    border: 'none', textAlign: 'left', font: 'inherit',
                                    // Your own row wears the board's selected state:
                                    // station amber, the one colour that means "the
                                    // board is telling you something".
                                    '--fib-row-wash': `${DECK.amber}12`,
                                    '--fib-row-tone': DECK.amber,
                                }}
                            >
                                <FlapText
                                    text={String(rank)}
                                    digits
                                    size={isPhone ? 14 : 16}
                                    tone={rankTone}
                                    weight={rank <= 3 ? 800 : 700}
                                    delay={40 + Math.min(idx, 12) * 22}
                                />

                                {/* The avatar, ringed by prestige. Same treatment
                                    as the stage's standings, so a player wears the
                                    same mark wherever they appear. */}
                                <PrestigeRing standing={standing}>
                                    <img
                                        src={getDiscordAvatarUrl(entry.discord_id, entry.discord_avatar)}
                                        alt=""
                                        width={isPhone ? 22 : 26}
                                        height={isPhone ? 22 : 26}
                                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; }}
                                        style={{ borderRadius: '50%', display: 'block' }}
                                    />
                                </PrestigeRing>

                                <FlapText
                                    text={name}
                                    size={isPhone ? 14 : 15}
                                    tone={isMe ? DECK.amber : DECK.ink}
                                    weight={isMe ? 800 : 700}
                                    delay={60 + Math.min(idx, 12) * 22}
                                    style={{ minWidth: 0, overflow: 'hidden' }}
                                />

                                <FlapText
                                    text={fmtNum(value)}
                                    digits
                                    size={isPhone ? 14 : 16}
                                    tone={metricTone}
                                    delay={80 + Math.min(idx, 12) * 22}
                                    style={{ justifyContent: 'flex-end' }}
                                />

                                {/* Share of the leader. This is what the removed
                                    Spins and Dupes columns were really being asked
                                    to do — say how far ahead first place is — and a
                                    second number in a third column never could. */}
                                {/* How far this player's current prestige run has
                                    got.
                                    A share-of-leader meter lived here first. It was
                                    honest but it was a bar restating the column
                                    beside it, and the owner wanted the one number a
                                    ranking of prestigers actually wants: how many
                                    items they have collected the second time round.
                                    Blank for the overwhelming majority who are not
                                    prestiging — a dot, because an empty cell in a
                                    ruled column reads as a missing value. */}
                                {!isPhone && (
                                    prestigeValue !== null ? (
                                        <FlapText
                                            text={fmtNum(prestigeValue)}
                                            digits
                                            size={15}
                                            tone={prestigeInk(entry.prestige_active_level)}
                                            delay={90 + Math.min(idx, 12) * 22}
                                            style={{ justifyContent: 'flex-end' }}
                                        />
                                    ) : (
                                        <BoardLabel tone="rgba(206,214,236,0.22)" style={{ textAlign: 'right' }}>·</BoardLabel>
                                    )
                                )}

                                {!isPhone && (
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px' }}>
                                        {level > 0 ? (
                                            <span
                                                className={isIridescentPrestige(level) && standing.earned ? 'fib-holo-text' : undefined}
                                                title={`${prestigeLabel(level)}${standing.earned ? '' : ' — in progress'}`}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '4px',
                                                    color: isIridescentPrestige(level) && standing.earned ? undefined : prestigeInk(level),
                                                    // Full strength in both states. This
                                                    // cell was dimmed to 0.5 for a run in
                                                    // progress, which muted an ink chosen
                                                    // to clear AA at full — and the ring on
                                                    // the same row already says whether the
                                                    // level is won. Two markers for one
                                                    // fact, one of them costing legibility.
                                                }}
                                            >
                                                {prestigeIcon(level, 12)}
                                                <BoardLabel tone="currentColor">{ROMAN[level] || level}</BoardLabel>
                                            </span>
                                        ) : (
                                            // A dot, not a blank: an empty cell in a
                                            // ruled column reads as a missing value
                                            // where the truth is "none".
                                            <BoardLabel tone="rgba(206,214,236,0.22)">·</BoardLabel>
                                        )}
                                    </span>
                                )}

                                {/* The collection, by tier. Icon and count in the
                                    tier's ink — the ladder's colours are the whole
                                    label, so the boxed chips this replaced were a
                                    border around information that already had one. */}
                                {!isPhone && <span style={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${markTiers.length}, ${MARK_W}px)`,
                                    justifyContent: 'end',
                                    alignItems: 'center',
                                }}>
                                    {markTiers.map(key => {
                                        const count = entry[`${key}_count`] || 0;
                                        if (count === 0) {
                                            return (
                                                <span key={key} title={`${RARITY[key].label}: none`} style={{ textAlign: 'center', color: 'rgba(206,214,236,0.18)', fontSize: '11px' }}>·</span>
                                            );
                                        }
                                        return (
                                            <span
                                                key={key}
                                                title={`${RARITY[key].label}: ${count}`}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
                                                    color: getRarityInk(key),
                                                }}
                                            >
                                                {getRarityIcon(key, 10)}
                                                <BoardLabel tone="currentColor">{count}</BoardLabel>
                                            </span>
                                        );
                                    })}
                                </span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* User Profile Modal - rendered outside the board for proper fixed positioning */}
            {selectedUser && (
                <UserProfile
                    userId={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    isOwnProfile={user && user.id === selectedUser}
                />
            )}
        </>
    );
}