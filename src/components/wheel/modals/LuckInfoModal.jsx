// ============================================
// Luck Rating Info Modal - Weighted Glory System
// ============================================

import React from 'react';
import { COLORS } from '../../../config/constants.js';
import {
    X, TrendingUp, Target, Calculator, Award, Info,
    Crown, Sparkles, Star, Diamond, Shuffle
} from 'lucide-react';

export function LuckInfoModal({ onClose, luckRating, isMobile }) {

    // Stat Cell Component (matching OddsInfoModal)
    const StatCell = ({ label, value, sublabel, color, isFirst }) => (
        <div style={{
            background: COLORS.bgLighter,
            padding: '12px 6px',
            textAlign: 'center',
            borderLeft: isFirst ? 'none' : `1px solid ${COLORS.border}44`
        }}>
            <div style={{
                color: color || COLORS.text,
                fontSize: '15px',
                fontWeight: '700',
                fontFamily: 'monospace',
                marginBottom: '3px',
                textShadow: color ? `0 0 12px ${color}66` : 'none'
            }}>
                {value}
            </div>
            {sublabel && (
                <div style={{ color: COLORS.textMuted, fontSize: '10px', marginBottom: '4px' }}>
                    {sublabel}
                </div>
            )}
            <div style={{
                color: COLORS.text,
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '600'
            }}>
                {label}
            </div>
        </div>
    );

    return (
        <div
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: '16px',
                boxSizing: 'border-box'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: COLORS.bg,
                    borderRadius: '16px',
                    padding: isMobile ? '20px' : '24px',
                    maxWidth: '480px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    border: `1px solid ${COLORS.border}`
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <TrendingUp size={20} color={COLORS.gold} />
                        <span style={{ color: COLORS.gold, fontSize: '18px', fontWeight: '600' }}>
                            Luck Rating
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            color: COLORS.textMuted,
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Formula */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{
                        padding: '14px 16px',
                        background: `linear-gradient(135deg, ${COLORS.bg} 0%, ${COLORS.gold}08 100%)`,
                        borderRadius: '10px',
                        border: `1px solid ${COLORS.gold}33`
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <Calculator size={14} color={COLORS.gold} />
                            <span style={{ color: COLORS.gold, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                The Formula
                            </span>
                        </div>
                        <code style={{ color: COLORS.text, fontSize: '14px', fontWeight: '500' }}>
                            Rating = (Lifetime × 0.3) + (Peak × 0.7)
                        </code>
                    </div>
                </div>

                {/* Your Rating */}
                {luckRating && (
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{
                            color: COLORS.textMuted,
                            fontSize: '11px',
                            marginBottom: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            <Award size={12} /> Your Rating
                        </div>
                        <div style={{
                            background: COLORS.bgLight,
                            borderRadius: '10px',
                            border: `1px solid ${COLORS.border}`,
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)'
                            }}>
                                <StatCell
                                    label="Lifetime"
                                    value={luckRating.lifetimeRating || '--'}
                                    sublabel="× 0.3"
                                    isFirst
                                />
                                <StatCell
                                    label="Peak"
                                    value={luckRating.peakWindowRating || '--'}
                                    sublabel="× 0.7"
                                    color={COLORS.gold}
                                />
                                <StatCell
                                    label="Final"
                                    value={luckRating.rating || '--'}
                                    color={COLORS.green}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Peak Window */}
                {luckRating?.peakWindowRange && (
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{
                            color: COLORS.textMuted,
                            fontSize: '11px',
                            marginBottom: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            <Target size={12} /> Best 5,000-Spin Window
                        </div>
                        <div style={{
                            background: COLORS.bgLight,
                            borderRadius: '10px',
                            border: `1px solid ${COLORS.gold}33`,
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                padding: '12px 14px',
                                background: `${COLORS.gold}11`,
                                borderBottom: `1px solid ${COLORS.gold}22`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span style={{ color: COLORS.text, fontSize: '13px' }}>
                                    Spins #{typeof luckRating.peakWindowRange.start === 'number' ? luckRating.peakWindowRange.start.toLocaleString() : '—'} – #{typeof luckRating.peakWindowRange.end === 'number' ? luckRating.peakWindowRange.end.toLocaleString() : '—'}
                                </span>
                                <span style={{ color: COLORS.gold, fontSize: '14px', fontWeight: '600', fontFamily: 'monospace' }}>
                                    {luckRating.peakWindowRating}
                                </span>
                            </div>
                            {luckRating.peakWindowPulls && (
                                <div style={{ padding: '12px 14px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                                    {luckRating.peakWindowPulls.insane > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Crown size={14} color={COLORS.insane} />
                                            <span style={{ color: COLORS.insane, fontSize: '13px', fontWeight: '600' }}>
                                                {luckRating.peakWindowPulls.insane}× Insane
                                            </span>
                                        </div>
                                    )}
                                    {luckRating.peakWindowPulls.mythic > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Sparkles size={14} color={COLORS.aqua} />
                                            <span style={{ color: COLORS.aqua, fontSize: '13px', fontWeight: '600' }}>
                                                {luckRating.peakWindowPulls.mythic}× Mythic
                                            </span>
                                        </div>
                                    )}
                                    {luckRating.peakWindowPulls.legendary > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Star size={14} color={COLORS.purple} />
                                            <span style={{ color: COLORS.purple, fontSize: '13px', fontWeight: '600' }}>
                                                {luckRating.peakWindowPulls.legendary}× Legendary
                                            </span>
                                        </div>
                                    )}
                                    {luckRating.peakWindowPulls.rare > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Diamond size={14} color={COLORS.red} />
                                            <span style={{ color: COLORS.red, fontSize: '13px' }}>
                                                {luckRating.peakWindowPulls.rare}× Rare
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Understanding the Numbers */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{
                        color: COLORS.textMuted,
                        fontSize: '11px',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        <Info size={12} /> How It Works
                    </div>
                    <div style={{
                        padding: '14px',
                        background: COLORS.bgLight,
                        borderRadius: '10px',
                        border: `1px solid ${COLORS.border}`,
                        fontSize: '12px',
                        color: COLORS.textMuted,
                        lineHeight: 1.7
                    }}>
                        <div style={{ marginBottom: '10px' }}>
                            <span style={{ color: COLORS.text, fontWeight: '500' }}>Lifetime (30%)</span> – Overall luck across all your spins using z-scores.
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                            <span style={{ color: COLORS.gold, fontWeight: '500' }}>Peak (70%)</span> – Your luckiest 5,000-spin stretch using Poisson probability.
                        </div>
                        <div>
                            <span style={{ color: COLORS.aqua, fontWeight: '500' }}>Clusters valued</span> – Getting 4 mythics beats 1 insane because it's mathematically rarer!
                        </div>
                    </div>
                </div>

                {/* Spin Types */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{
                        color: COLORS.textMuted,
                        fontSize: '11px',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        <Shuffle size={12} /> Spin Types
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{
                            padding: '12px',
                            background: `${COLORS.green}11`,
                            borderRadius: '10px',
                            border: `1px solid ${COLORS.green}33`
                        }}>
                            <div style={{ color: COLORS.green, fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                                Normal Spins
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '11px', lineHeight: 1.4 }}>
                                Weight-based odds
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '10px', marginTop: '4px', fontFamily: 'monospace' }}>
                                ~1/1M for insane
                            </div>
                        </div>
                        <div style={{
                            padding: '12px',
                            background: `${COLORS.purple}11`,
                            borderRadius: '10px',
                            border: `1px solid ${COLORS.purple}33`
                        }}>
                            <div style={{ color: COLORS.purple, fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                                Lucky Spins
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '11px', lineHeight: 1.4 }}>
                                Equal chance for all
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '10px', marginTop: '4px', fontFamily: 'monospace' }}>
                                ~1/1.4K for insane
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rating Scale */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{
                        color: COLORS.textMuted,
                        fontSize: '11px',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        <TrendingUp size={12} /> Rating Scale
                    </div>
                    <div style={{
                        background: COLORS.bgLight,
                        borderRadius: '10px',
                        border: `1px solid ${COLORS.border}`,
                        overflow: 'hidden'
                    }}>
                        {[
                            { rating: '200+', label: 'Unbelievably Lucky', color: COLORS.insane },
                            { rating: '175+', label: 'Insanely Lucky', color: '#ffa500' },
                            { rating: '150+', label: 'Incredibly Lucky', color: COLORS.gold },
                            { rating: '125+', label: 'Very Lucky', color: COLORS.green },
                            { rating: '100', label: 'Average', color: COLORS.text, highlight: true },
                            { rating: '<80', label: 'Unlucky', color: COLORS.textMuted }
                        ].map((item, i, arr) => (
                            <div key={i} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 14px',
                                background: item.highlight ? `${COLORS.gold}15` : 'transparent',
                                borderBottom: i < arr.length - 1 ? `1px solid ${COLORS.border}` : 'none'
                            }}>
                                <span style={{ color: item.color, fontWeight: '600', fontSize: '13px', fontFamily: 'monospace' }}>
                                    {item.rating}
                                </span>
                                <span style={{ color: item.color, fontSize: '12px' }}>
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Lifetime Stats */}
                {luckRating?.stats && (luckRating.stats.insane > 0 || luckRating.stats.mythic > 0 || luckRating.stats.legendary > 0 || luckRating.stats.rare > 0) && (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{
                            color: COLORS.textMuted,
                            fontSize: '11px',
                            marginBottom: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            <Star size={12} /> Lifetime Pulls
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '8px'
                        }}>
                            <div style={{
                                padding: '12px',
                                background: COLORS.bgLight,
                                borderRadius: '8px',
                                border: `1px solid ${COLORS.border}`,
                                textAlign: 'center'
                            }}>
                                <div style={{ color: COLORS.insane, fontSize: '16px', fontWeight: '600', fontFamily: 'monospace' }}>
                                    {luckRating.stats.insane || 0}
                                </div>
                                <div style={{ color: COLORS.textMuted, fontSize: '10px' }}>Insane</div>
                            </div>
                            <div style={{
                                padding: '12px',
                                background: COLORS.bgLight,
                                borderRadius: '8px',
                                border: `1px solid ${COLORS.border}`,
                                textAlign: 'center'
                            }}>
                                <div style={{ color: COLORS.aqua, fontSize: '16px', fontWeight: '600', fontFamily: 'monospace' }}>
                                    {luckRating.stats.mythic || 0}
                                </div>
                                <div style={{ color: COLORS.textMuted, fontSize: '10px' }}>Mythic</div>
                            </div>
                            <div style={{
                                padding: '12px',
                                background: COLORS.bgLight,
                                borderRadius: '8px',
                                border: `1px solid ${COLORS.border}`,
                                textAlign: 'center'
                            }}>
                                <div style={{ color: COLORS.purple, fontSize: '16px', fontWeight: '600', fontFamily: 'monospace' }}>
                                    {luckRating.stats.legendary || 0}
                                </div>
                                <div style={{ color: COLORS.textMuted, fontSize: '10px' }}>Legend</div>
                            </div>
                            <div style={{
                                padding: '12px',
                                background: COLORS.bgLight,
                                borderRadius: '8px',
                                border: `1px solid ${COLORS.border}`,
                                textAlign: 'center'
                            }}>
                                <div style={{ color: COLORS.red, fontSize: '16px', fontWeight: '600', fontFamily: 'monospace' }}>
                                    {luckRating.stats.rare || 0}
                                </div>
                                <div style={{ color: COLORS.textMuted, fontSize: '10px' }}>Rare</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                {luckRating?.stats && (
                    <div style={{
                        color: COLORS.textMuted,
                        fontSize: '10px',
                        textAlign: 'center',
                        paddingTop: '8px',
                        borderTop: `1px solid ${COLORS.border}`
                    }}>
                        {typeof luckRating.stats?.totalSpins === 'number' ? luckRating.stats.totalSpins.toLocaleString() : '—'} total spins ÷ Both normal and lucky spins count
                    </div>
                )}
            </div>
        </div>
    );
}

export default LuckInfoModal;