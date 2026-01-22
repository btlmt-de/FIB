import React from 'react';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Target from 'lucide-react/dist/esm/icons/target';
import Flame from 'lucide-react/dist/esm/icons/flame';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Clock from 'lucide-react/dist/esm/icons/clock';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Award from 'lucide-react/dist/esm/icons/award';
import Footprints from 'lucide-react/dist/esm/icons/footprints';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Swords from 'lucide-react/dist/esm/icons/swords';
import Package from 'lucide-react/dist/esm/icons/package';
import Check from 'lucide-react/dist/esm/icons/check';

import { STATS_COLORS as COLORS, MC_FONT, MOCK_PLAYERS, PLAYERS_BY_NAME, formatNumber, formatDistance, formatTime } from './statsUtils.js';

function ComparisonStatRow({ label, value1, value2, icon, higherIsBetter = true }) {
    const num1 = parseFloat(String(value1).replace(/[^0-9.]/g, '')) || 0;
    const num2 = parseFloat(String(value2).replace(/[^0-9.]/g, '')) || 0;

    let winner = 'none';
    if (num1 > num2) winner = higherIsBetter ? 'left' : 'right';
    else if (num2 > num1) winner = higherIsBetter ? 'right' : 'left';

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            padding: '14px 0',
            borderBottom: `1px solid ${COLORS.border}22`,
        }}>
            <div style={{
                textAlign: 'right',
                paddingRight: '24px',
            }}>
                <span style={{
                    color: winner === 'left' ? COLORS.green : COLORS.text,
                    fontSize: '15px',
                    fontFamily: MC_FONT,
                    textShadow: winner === 'left' ? `0 0 12px ${COLORS.green}80` : 'none',
                }}>
                    {value1}
                </span>
                {winner === 'left' && (
                    <span style={{
                        marginLeft: '10px',
                        color: COLORS.green,
                        display: 'inline-flex',
                        alignItems: 'center',
                    }}>
                        <Check size={14} />
                    </span>
                )}
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: COLORS.textMuted,
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
                padding: '0 20px',
                minWidth: '150px',
                justifyContent: 'center',
            }}>
                {icon}
                {label}
            </div>

            <div style={{
                textAlign: 'left',
                paddingLeft: '24px',
            }}>
                {winner === 'right' && (
                    <span style={{
                        marginRight: '10px',
                        color: COLORS.green,
                        display: 'inline-flex',
                        alignItems: 'center',
                    }}>
                        <Check size={14} />
                    </span>
                )}
                <span style={{
                    color: winner === 'right' ? COLORS.green : COLORS.text,
                    fontSize: '15px',
                    fontFamily: MC_FONT,
                    textShadow: winner === 'right' ? `0 0 12px ${COLORS.green}80` : 'none',
                }}>
                    {value2}
                </span>
            </div>
        </div>
    );
}

function EntitySlot({ entity, stats, side, onSelect }) {
    if (!entity) {
        return (
            <div
                onClick={onSelect}
                style={{
                    background: COLORS.bg,
                    border: `2px dashed ${COLORS.border}`,
                    borderRadius: '14px',
                    padding: '48px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = COLORS.accent;
                    e.currentTarget.style.background = COLORS.bgLight;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = COLORS.border;
                    e.currentTarget.style.background = COLORS.bg;
                }}
            >
                <Plus size={36} color={COLORS.textMuted} style={{ marginBottom: '14px' }} />
                <div style={{ color: COLORS.textMuted, fontSize: '14px' }}>
                    Select {side === 'left' ? 'first' : 'second'} entity
                </div>
            </div>
        );
    }

    return (
        <div style={{
            background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bgLighter} 100%)`,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '14px',
            padding: '24px',
            textAlign: 'center',
        }}>
            {entity.type === 'player' ? (
                <img
                    src={entity.avatarUrl}
                    alt={entity.name}
                    style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '12px',
                        imageRendering: 'pixelated',
                        border: `3px solid ${COLORS.accent}`,
                        marginBottom: '14px',
                    }}
                />
            ) : (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '14px',
                }}>
                    {entity.players.map((playerName, idx) => {
                        const player = PLAYERS_BY_NAME.get(playerName);
                        return (
                            <img
                                key={playerName}
                                src={player?.avatarUrl || `https://mc-heads.net/avatar/${playerName}/100`}
                                alt={playerName}
                                style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '10px',
                                    imageRendering: 'pixelated',
                                    marginLeft: idx > 0 ? '-14px' : 0,
                                    border: `3px solid ${COLORS.accent}`,
                                }}
                            />
                        );
                    })}
                </div>
            )}
            <div style={{
                color: COLORS.text,
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '6px',
            }}>
                {entity.name}
            </div>
            <div style={{
                color: COLORS.textMuted,
                fontSize: '13px',
                marginBottom: '12px',
            }}>
                Rank #{stats?.rank || '–'}
            </div>
            <button
                onClick={onSelect}
                style={{
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '8px',
                    padding: '8px 16px',
                    color: COLORS.textMuted,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = COLORS.accent;
                    e.currentTarget.style.color = COLORS.accent;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = COLORS.border;
                    e.currentTarget.style.color = COLORS.textMuted;
                }}
            >
                Change
            </button>
        </div>
    );
}

export function StatsComparison({ entity1, stats1, entity2, stats2, onSelectEntity }) {
    const hasStats = stats1 && stats2;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
        }}>
            {/* Entity Headers */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: '20px',
                alignItems: 'stretch',
            }}>
                <EntitySlot entity={entity1} stats={stats1} side="left" onSelect={() => onSelectEntity('left')} />

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${COLORS.gold}20 0%, ${COLORS.orange}20 100%)`,
                        border: `2px solid ${COLORS.gold}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 0 20px ${COLORS.gold}30`,
                    }}>
                        <Swords size={26} color={COLORS.gold} />
                    </div>
                </div>

                <EntitySlot entity={entity2} stats={stats2} side="right" onSelect={() => onSelectEntity('right')} />
            </div>

            {/* Comparison Stats */}
            {hasStats ? (
                <div style={{
                    background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bgLighter} 100%)`,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '18px',
                    padding: '28px',
                }}>
                    <ComparisonStatRow
                        label="Games Won"
                        value1={stats1.gamesWon}
                        value2={stats2.gamesWon}
                        icon={<Trophy size={14} />}
                    />
                    <ComparisonStatRow
                        label="Win Rate"
                        value1={`${stats1.gamesPlayed === 0 ? '0.0' : ((stats1.gamesWon / stats1.gamesPlayed) * 100).toFixed(1)}%`}
                        value2={`${stats2.gamesPlayed === 0 ? '0.0' : ((stats2.gamesWon / stats2.gamesPlayed) * 100).toFixed(1)}%`}
                        icon={<Award size={14} />}
                    />
                    <ComparisonStatRow
                        label="Highest Score"
                        value1={formatNumber(stats1.highestScore)}
                        value2={formatNumber(stats2.highestScore)}
                        icon={<Target size={14} />}
                    />
                    <ComparisonStatRow
                        label="Total Items"
                        value1={formatNumber(stats1.totalItems)}
                        value2={formatNumber(stats2.totalItems)}
                        icon={<Package size={14} />}
                    />
                    <ComparisonStatRow
                        label="Avg Items/Round"
                        value1={stats1.avgItemsPerRound}
                        value2={stats2.avgItemsPerRound}
                        icon={<TrendingUp size={14} />}
                    />
                    <ComparisonStatRow
                        label="Avg Time/Item"
                        value1={formatTime(parseFloat(stats1.avgTimePerItem))}
                        value2={formatTime(parseFloat(stats2.avgTimePerItem))}
                        icon={<Clock size={14} />}
                        higherIsBetter={false}
                    />
                    <ComparisonStatRow
                        label="B2B Streak"
                        value1={stats1.highestB2BStreak}
                        value2={stats2.highestB2BStreak}
                        icon={<Flame size={14} />}
                    />
                    <ComparisonStatRow
                        label="Item Streak"
                        value1={stats1.longestItemStreak}
                        value2={stats2.longestItemStreak}
                        icon={<Zap size={14} />}
                    />
                    <ComparisonStatRow
                        label="Distance"
                        value1={formatDistance(stats1.distanceTravelled)}
                        value2={formatDistance(stats2.distanceTravelled)}
                        icon={<Footprints size={14} />}
                    />
                </div>
            ) : (
                <div style={{
                    textAlign: 'center',
                    padding: '80px 20px',
                    color: COLORS.textMuted,
                    background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bgLighter} 100%)`,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '18px',
                }}>
                    <Swords size={48} color={COLORS.textMuted} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <div style={{ fontSize: '16px' }}>
                        Select two entities to compare their stats
                    </div>
                </div>
            )}
        </div>
    );
}