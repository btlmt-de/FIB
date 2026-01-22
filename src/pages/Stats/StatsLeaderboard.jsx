import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Target from 'lucide-react/dist/esm/icons/target';
import Flame from 'lucide-react/dist/esm/icons/flame';
import Footprints from 'lucide-react/dist/esm/icons/footprints';
import Package from 'lucide-react/dist/esm/icons/package';
import Percent from 'lucide-react/dist/esm/icons/percent';

import { STATS_COLORS as COLORS, MC_FONT, formatNumber, formatDistance, generateMockLeaderboard } from './statsUtils.js';

// Hoisted outside component to prevent recreation on every render
const CATEGORY_CONFIG = [
    { id: 'gamesWon', label: 'Games Won', Icon: Trophy, color: null }, // color set dynamically from COLORS
    { id: 'totalItems', label: 'Total Items', Icon: Package, color: null },
    { id: 'winRate', label: 'Win Rate', Icon: Percent, color: null },
    { id: 'highestScore', label: 'High Score', Icon: Target, color: null },
    { id: 'highestB2BStreak', label: 'B2B Streak', Icon: Flame, color: null },
    { id: 'distanceTravelled', label: 'Distance', Icon: Footprints, color: null },
];

export function StatsLeaderboard() {
    const [activeCategory, setActiveCategory] = useState('gamesWon');
    const [leaderboard, setLeaderboard] = useState([]);

    // Memoize categories with colors and icons
    const categories = useMemo(() => {
        const colorMap = {
            gamesWon: COLORS.gold,
            totalItems: COLORS.aqua,
            winRate: COLORS.green,
            highestScore: COLORS.red,
            highestB2BStreak: COLORS.orange,
            distanceTravelled: COLORS.accent,
        };
        return CATEGORY_CONFIG.map(cat => ({
            id: cat.id,
            label: cat.label,
            icon: <cat.Icon size={14} />,
            color: colorMap[cat.id],
        }));
    }, []);

    useEffect(() => {
        // TODO: Replace with API call
        setLeaderboard(generateMockLeaderboard(activeCategory));
    }, [activeCategory]);

    // Memoized value display function
    const getValueDisplay = useCallback((player) => {
        switch (activeCategory) {
            case 'gamesWon': return player.gamesWon;
            case 'totalItems': return formatNumber(player.totalItems);
            case 'winRate': return `${player.winRate}%`;
            case 'highestScore': return formatNumber(player.highestScore);
            case 'highestB2BStreak': return player.highestB2BStreak;
            case 'distanceTravelled': return formatDistance(player.distanceTravelled);
            default: return player.gamesWon;
        }
    }, [activeCategory]);

    const currentCategory = categories.find(c => c.id === activeCategory);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
        }}>
            {/* Category Selector */}
            <div style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
            }}>
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '10px 16px',
                            background: activeCategory === cat.id
                                ? `linear-gradient(135deg, ${cat.color}30 0%, ${cat.color}15 100%)`
                                : COLORS.bgLight,
                            border: `1px solid ${activeCategory === cat.id ? cat.color : COLORS.border}`,
                            borderRadius: '10px',
                            color: activeCategory === cat.id ? cat.color : COLORS.textMuted,
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            if (activeCategory !== cat.id) {
                                e.currentTarget.style.borderColor = cat.color + '60';
                                e.currentTarget.style.color = COLORS.text;
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeCategory !== cat.id) {
                                e.currentTarget.style.borderColor = COLORS.border;
                                e.currentTarget.style.color = COLORS.textMuted;
                            }
                        }}
                    >
                        {cat.icon}
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Leaderboard Table */}
            <div style={{
                background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bgLighter} 100%)`,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '16px',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr 120px',
                    gap: '12px',
                    padding: '16px 20px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    background: COLORS.bg,
                }}>
                    <div style={{ color: COLORS.textMuted, fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
                        Rank
                    </div>
                    <div style={{ color: COLORS.textMuted, fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
                        Player
                    </div>
                    <div style={{ color: currentCategory?.color, fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', textAlign: 'right' }}>
                        {currentCategory?.label}
                    </div>
                </div>

                {/* Rows */}
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {leaderboard.map((player) => {
                        const isTopThree = player.rank <= 3;
                        const rankColors = {
                            1: { bg: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#1a1a1a' },
                            2: { bg: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)', color: '#fff' },
                            3: { bg: 'linear-gradient(135deg, #CD7F32, #B87333)', color: '#fff' },
                        };

                        return (
                            <div
                                key={player.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '60px 1fr 120px',
                                    gap: '12px',
                                    padding: '14px 20px',
                                    alignItems: 'center',
                                    borderBottom: `1px solid ${COLORS.border}22`,
                                    background: isTopThree ? `${currentCategory?.color}08` : 'transparent',
                                    transition: 'background 0.15s',
                                    cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = COLORS.bgHover}
                                onMouseLeave={(e) => e.currentTarget.style.background = isTopThree ? `${currentCategory?.color}08` : 'transparent'}
                            >
                                {/* Rank */}
                                <div>
                                    {isTopThree ? (
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            background: rankColors[player.rank].bg,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: rankColors[player.rank].color,
                                            fontFamily: MC_FONT,
                                            fontSize: '14px',
                                            fontWeight: '700',
                                            boxShadow: player.rank === 1 ? '0 2px 12px rgba(255, 215, 0, 0.4)' : 'none',
                                        }}>
                                            {player.rank}
                                        </div>
                                    ) : (
                                        <div style={{
                                            color: COLORS.textMuted,
                                            fontFamily: MC_FONT,
                                            fontSize: '14px',
                                            paddingLeft: '8px',
                                        }}>
                                            {player.rank}
                                        </div>
                                    )}
                                </div>

                                {/* Player */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <img
                                        src={player.avatarUrl}
                                        alt={player.name}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '8px',
                                            imageRendering: 'pixelated',
                                            border: isTopThree ? `2px solid ${currentCategory?.color}60` : `2px solid ${COLORS.border}`,
                                        }}
                                    />
                                    <div>
                                        <div style={{
                                            color: isTopThree ? currentCategory?.color : COLORS.text,
                                            fontSize: '14px',
                                            fontWeight: isTopThree ? '600' : '500',
                                        }}>
                                            {player.name}
                                        </div>
                                        <div style={{
                                            color: COLORS.textMuted,
                                            fontSize: '11px',
                                        }}>
                                            {player.gamesPlayed} games played
                                        </div>
                                    </div>
                                </div>

                                {/* Value */}
                                <div style={{
                                    textAlign: 'right',
                                    color: currentCategory?.color,
                                    fontFamily: MC_FONT,
                                    fontSize: isTopThree ? '16px' : '14px',
                                    fontWeight: '600',
                                    textShadow: isTopThree ? `0 0 12px ${currentCategory?.color}60` : 'none',
                                }}>
                                    {getValueDisplay(player)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}