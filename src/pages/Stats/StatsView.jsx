import React, { useMemo } from 'react';
import Users from 'lucide-react/dist/esm/icons/users';
import User from 'lucide-react/dist/esm/icons/user';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Target from 'lucide-react/dist/esm/icons/target';
import Flame from 'lucide-react/dist/esm/icons/flame';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Clock from 'lucide-react/dist/esm/icons/clock';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Footprints from 'lucide-react/dist/esm/icons/footprints';
import Gamepad2 from 'lucide-react/dist/esm/icons/gamepad-2';
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Package from 'lucide-react/dist/esm/icons/package';

import { STATS_COLORS as COLORS, MC_FONT, formatNumber, formatDistance, formatTime } from './statsUtils.js';
import { StatCard, CanvasRankBadge, CanvasWinRateRing, CanvasRarityChart, TopItemsCard } from './StatsComponents.jsx';

export function StatsView({ entity, stats }) {
    if (!entity || !stats) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '80px 20px',
                textAlign: 'center',
            }}>
                <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${COLORS.accent}25 0%, ${COLORS.accent}10 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '24px',
                    border: `1px solid ${COLORS.accent}30`,
                }}>
                    <BarChart3 size={44} color={COLORS.accent} />
                </div>
                <div style={{
                    color: COLORS.text,
                    fontSize: '20px',
                    fontWeight: '600',
                    marginBottom: '10px',
                }}>
                    Select a Player or Team
                </div>
                <div style={{
                    color: COLORS.textMuted,
                    fontSize: '14px',
                    maxWidth: '320px',
                    lineHeight: '1.5',
                }}>
                    Use the search above to find players or teams and view their detailed statistics
                </div>
            </div>
        );
    }

    // Memoize win percentage calculation
    const winPercentage = useMemo(() => {
        if (!stats || stats.gamesPlayed === 0) return 0;
        return ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1);
    }, [stats?.gamesWon, stats?.gamesPlayed]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
        }}>
            {/* Header with Rank */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                padding: '28px',
                background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bgLighter} 100%)`,
                borderRadius: '18px',
                border: `1px solid ${COLORS.border}`,
                flexWrap: 'wrap',
            }}>
                <CanvasRankBadge rank={stats.rank} size={110} />

                <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{
                        color: COLORS.text,
                        fontSize: '30px',
                        fontWeight: '700',
                        marginBottom: '6px',
                    }}>
                        {entity.name}
                    </div>
                    <div style={{
                        color: COLORS.textMuted,
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}>
                        {entity.type === 'team' ? (
                            <>
                                <Users size={14} />
                                Team · Ranked #{stats.rank} globally
                            </>
                        ) : (
                            <>
                                <User size={14} />
                                Player · Ranked #{stats.rank} globally
                            </>
                        )}
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <CanvasWinRateRing percentage={parseFloat(winPercentage)} size={90} />
                        <div style={{
                            color: COLORS.textMuted,
                            fontSize: '12px',
                            marginTop: '6px',
                            fontWeight: '500',
                        }}>
                            Win Rate
                        </div>
                    </div>
                </div>
            </div>

            {/* Key Metrics Row */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
            }}>
                <StatCard
                    icon={<Gamepad2 />}
                    label="Games Played"
                    value={stats.gamesPlayed}
                    color={COLORS.accent}
                    delay={0}
                />
                <StatCard
                    icon={<Trophy />}
                    label="Games Won"
                    value={stats.gamesWon}
                    color={COLORS.gold}
                    delay={50}
                />
                <StatCard
                    icon={<Target />}
                    label="Highest Score"
                    value={formatNumber(stats.highestScore)}
                    color={COLORS.green}
                    delay={100}
                />
                <StatCard
                    icon={<Package />}
                    label="Total Items"
                    value={formatNumber(stats.totalItems)}
                    color={COLORS.aqua}
                    delay={150}
                />
            </div>

            {/* Collection Section */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                gap: '16px',
            }}>
                <TopItemsCard items={stats.topItems} />

                <div style={{
                    background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bgLighter} 100%)`,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '14px',
                    padding: '20px',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '20px',
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: `linear-gradient(135deg, ${COLORS.darkPurple}30 0%, ${COLORS.darkPurple}10 100%)`,
                            border: `1px solid ${COLORS.darkPurple}40`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Sparkles size={20} color={COLORS.darkPurple} />
                        </div>
                        <div>
                            <div style={{ color: COLORS.text, fontSize: '15px', fontWeight: '600' }}>
                                Rarities Found
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>
                                B2B detection breakdown
                            </div>
                        </div>
                    </div>
                    <CanvasRarityChart raritiesFound={stats.raritiesFound} />
                </div>
            </div>

            {/* Efficiency & Records */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
            }}>
                <StatCard
                    icon={<TrendingUp />}
                    label="Avg Items / Round"
                    value={stats.avgItemsPerRound}
                    subValue="items per round"
                    color={COLORS.aqua}
                    delay={0}
                />
                <StatCard
                    icon={<Clock />}
                    label="Avg Time / Item"
                    value={formatTime(parseFloat(stats.avgTimePerItem))}
                    subValue="average"
                    color={COLORS.yellow}
                    delay={50}
                />
                <StatCard
                    icon={<Flame />}
                    label="Highest B2B Streak"
                    value={stats.highestB2BStreak}
                    subValue="back-to-back rares"
                    color={COLORS.red}
                    delay={100}
                />
                <StatCard
                    icon={<Zap />}
                    label="Longest Item Streak"
                    value={stats.longestItemStreak}
                    subValue="without skipping"
                    color={COLORS.gold}
                    delay={150}
                />
            </div>

            {/* Distance Card */}
            <div style={{
                background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bgLighter} 100%)`,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '14px',
                padding: '28px',
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
                 onMouseEnter={(e) => {
                     e.currentTarget.style.transform = 'translateY(-4px)';
                     e.currentTarget.style.boxShadow = `0 12px 32px ${COLORS.green}20, 0 0 0 1px ${COLORS.green}40`;
                     e.currentTarget.style.borderColor = `${COLORS.green}50`;
                 }}
                 onMouseLeave={(e) => {
                     e.currentTarget.style.transform = 'translateY(0)';
                     e.currentTarget.style.boxShadow = 'none';
                     e.currentTarget.style.borderColor = COLORS.border;
                 }}
            >
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: `linear-gradient(135deg, ${COLORS.green}30 0%, ${COLORS.green}10 100%)`,
                    border: `1px solid ${COLORS.green}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <Footprints size={30} color={COLORS.green} />
                </div>
                <div>
                    <div style={{
                        color: COLORS.textMuted,
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '8px',
                    }}>
                        Distance Travelled
                    </div>
                    <div style={{
                        color: COLORS.text,
                        fontSize: '26px',
                        fontFamily: MC_FONT,
                        textShadow: '2px 2px 0 rgba(0,0,0,0.4)',
                    }}>
                        {formatDistance(stats.distanceTravelled)}
                    </div>
                </div>
            </div>
        </div>
    );
}