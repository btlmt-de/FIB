// ============================================
// Luck Rating Info Modal
// ============================================

import React from 'react';
import { COLORS } from '../../config/constants.js';
import { X, TrendingUp, Calculator, HelpCircle, Sparkles, Crown, Star, Diamond, BarChart3 } from 'lucide-react';

export function LuckInfoModal({ onClose, luckRating, isMobile }) {
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
                            How Luck Rating Works
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

                {/* Overview */}
                <div style={{
                    padding: '14px 16px',
                    background: `linear-gradient(135deg, ${COLORS.bg} 0%, ${COLORS.aqua}08 100%)`,
                    borderRadius: '10px',
                    border: `1px solid ${COLORS.aqua}33`,
                    marginBottom: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Calculator size={14} color={COLORS.aqua} />
                        <span style={{ color: COLORS.aqua, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            The Concept
                        </span>
                    </div>
                    <div style={{ color: COLORS.text, fontSize: '13px', lineHeight: 1.5 }}>
                        Your luck rating measures how <strong>statistically improbable</strong> your pulls are compared to what's expected.
                        We use <strong>z-scores</strong> (standard deviations) to calculate this.
                    </div>
                </div>

                {/* Formula */}
                <div style={{
                    padding: '14px 16px',
                    background: COLORS.bgLight,
                    borderRadius: '10px',
                    border: `1px solid ${COLORS.border}`,
                    marginBottom: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <BarChart3 size={14} color={COLORS.gold} />
                        <span style={{ color: COLORS.gold, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            The Formula
                        </span>
                    </div>
                    <code style={{
                        display: 'block',
                        color: COLORS.text,
                        fontSize: '13px',
                        fontWeight: '500',
                        padding: '10px',
                        background: COLORS.bg,
                        borderRadius: '6px',
                        textAlign: 'center'
                    }}>
                        Z-Score = (Actual − Expected) ÷ √Expected
                    </code>
                    <div style={{ color: COLORS.textMuted, fontSize: '11px', marginTop: '10px', lineHeight: 1.4 }}>
                        For each rarity tier, we calculate how many standard deviations (σ) your pulls are from expected.
                        A higher z-score means your result was more improbable (luckier!).
                    </div>
                </div>

                {/* Why this matters */}
                <div style={{
                    padding: '14px 16px',
                    background: `${COLORS.green}11`,
                    borderRadius: '10px',
                    border: `1px solid ${COLORS.green}33`,
                    marginBottom: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <HelpCircle size={14} color={COLORS.green} />
                        <span style={{ color: COLORS.green, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Why This Matters
                        </span>
                    </div>
                    <div style={{ color: COLORS.text, fontSize: '13px', lineHeight: 1.5, marginBottom: '10px' }}>
                        Getting <strong>4 mythics</strong> when you expected <strong>0.7</strong> is actually MORE impressive than getting <strong>1 insane</strong> when you expected <strong>0.1</strong>!
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{
                            padding: '8px 12px',
                            background: COLORS.bg,
                            borderRadius: '6px',
                            fontSize: '11px'
                        }}>
                            <div style={{ color: COLORS.aqua, fontWeight: '600' }}>4 Mythic (exp: 0.7)</div>
                            <div style={{ color: COLORS.green }}>+3.95σ = Top 0.004%</div>
                        </div>
                        <div style={{
                            padding: '8px 12px',
                            background: COLORS.bg,
                            borderRadius: '6px',
                            fontSize: '11px'
                        }}>
                            <div style={{ color: COLORS.insane, fontWeight: '600' }}>1 Insane (exp: 0.1)</div>
                            <div style={{ color: COLORS.green }}>+2.85σ = Top 0.2%</div>
                        </div>
                    </div>
                </div>

                {/* Rating Scale */}
                <div style={{
                    padding: '14px 16px',
                    background: COLORS.bgLight,
                    borderRadius: '10px',
                    border: `1px solid ${COLORS.border}`,
                    marginBottom: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Sparkles size={14} color={COLORS.purple} />
                        <span style={{ color: COLORS.purple, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Rating Scale
                        </span>
                    </div>
                    <div style={{ display: 'grid', gap: '6px' }}>
                        {[
                            { rating: '200+', z: '+4σ', label: 'Unbelievably Lucky!', color: COLORS.insane },
                            { rating: '175+', z: '+3σ', label: 'Insanely Lucky!', color: COLORS.gold },
                            { rating: '150+', z: '+2σ', label: 'Incredibly Lucky!', color: COLORS.aqua },
                            { rating: '125+', z: '+1σ', label: 'Very Lucky!', color: COLORS.green },
                            { rating: '100', z: '0σ', label: 'Exactly Average', color: COLORS.text },
                            { rating: '75', z: '-1σ', label: 'Unlucky', color: COLORS.red },
                            { rating: '<50', z: '-2σ', label: 'Very Unlucky', color: '#ff4444' }
                        ].map((item, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '6px 10px',
                                background: i === 4 ? `${COLORS.gold}15` : COLORS.bg,
                                borderRadius: '6px',
                                border: i === 4 ? `1px solid ${COLORS.gold}33` : 'none'
                            }}>
                                <span style={{ color: item.color, fontWeight: '600', fontSize: '13px', width: '50px' }}>
                                    {item.rating}
                                </span>
                                <span style={{ color: COLORS.textMuted, fontSize: '11px', width: '40px' }}>
                                    {item.z}
                                </span>
                                <span style={{ color: item.color, fontSize: '12px', flex: 1 }}>
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tier Weights */}
                <div style={{
                    padding: '14px 16px',
                    background: COLORS.bgLight,
                    borderRadius: '10px',
                    border: `1px solid ${COLORS.border}`
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Star size={14} color={COLORS.gold} />
                        <span style={{ color: COLORS.gold, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Tier Impact Weights
                        </span>
                    </div>
                    <div style={{ color: COLORS.textMuted, fontSize: '11px', marginBottom: '10px', lineHeight: 1.4 }}>
                        Rarer tiers have more impact on your combined score (but only if you've had expected pulls or actually hit them):
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[
                            { tier: 'Insane', weight: '4.0×', icon: <Crown size={12} />, color: COLORS.insane },
                            { tier: 'Mythic', weight: '3.0×', icon: <Sparkles size={12} />, color: COLORS.aqua },
                            { tier: 'Legendary', weight: '1.5×', icon: <Star size={12} />, color: COLORS.purple },
                            { tier: 'Rare', weight: '1.0×', icon: <Diamond size={12} />, color: COLORS.red }
                        ].map((item, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 10px',
                                background: COLORS.bg,
                                borderRadius: '6px',
                                border: `1px solid ${item.color}33`
                            }}>
                                <span style={{ color: item.color }}>{item.icon}</span>
                                <span style={{ color: item.color, fontSize: '11px', fontWeight: '600' }}>{item.tier}</span>
                                <span style={{ color: COLORS.textMuted, fontSize: '11px' }}>{item.weight}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Your Stats (if available) */}
                {luckRating?.zScores && (
                    <div style={{
                        marginTop: '16px',
                        padding: '14px 16px',
                        background: `${COLORS.gold}11`,
                        borderRadius: '10px',
                        border: `1px solid ${COLORS.gold}33`
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <TrendingUp size={14} color={COLORS.gold} />
                            <span style={{ color: COLORS.gold, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Your Z-Scores
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                            {luckRating.stats?.insane > 0 && (
                                <div style={{
                                    padding: '6px 10px',
                                    background: COLORS.bg,
                                    borderRadius: '6px',
                                    fontSize: '11px'
                                }}>
                                    <span style={{ color: COLORS.insane }}>Insane: </span>
                                    <span style={{ color: luckRating.zScores.insane > 0 ? COLORS.green : COLORS.red, fontWeight: '600' }}>
                                        {luckRating.zScores.insane > 0 ? '+' : ''}{luckRating.zScores.insane}σ
                                    </span>
                                </div>
                            )}
                            {luckRating.stats?.mythic > 0 && (
                                <div style={{
                                    padding: '6px 10px',
                                    background: COLORS.bg,
                                    borderRadius: '6px',
                                    fontSize: '11px'
                                }}>
                                    <span style={{ color: COLORS.aqua }}>Mythic: </span>
                                    <span style={{ color: luckRating.zScores.mythic > 0 ? COLORS.green : COLORS.red, fontWeight: '600' }}>
                                        {luckRating.zScores.mythic > 0 ? '+' : ''}{luckRating.zScores.mythic}σ
                                    </span>
                                </div>
                            )}
                            {luckRating.stats?.legendary > 0 && (
                                <div style={{
                                    padding: '6px 10px',
                                    background: COLORS.bg,
                                    borderRadius: '6px',
                                    fontSize: '11px'
                                }}>
                                    <span style={{ color: COLORS.purple }}>Legendary: </span>
                                    <span style={{ color: luckRating.zScores.legendary > 0 ? COLORS.green : COLORS.red, fontWeight: '600' }}>
                                        {luckRating.zScores.legendary > 0 ? '+' : ''}{luckRating.zScores.legendary}σ
                                    </span>
                                </div>
                            )}
                            <div style={{
                                padding: '6px 10px',
                                background: COLORS.bg,
                                borderRadius: '6px',
                                fontSize: '11px'
                            }}>
                                <span style={{ color: COLORS.red }}>Rare: </span>
                                <span style={{ color: luckRating.zScores.rare > 0 ? COLORS.green : COLORS.red, fontWeight: '600' }}>
                                    {luckRating.zScores.rare > 0 ? '+' : ''}{luckRating.zScores.rare}σ
                                </span>
                            </div>
                        </div>
                        <div style={{
                            padding: '8px 12px',
                            background: COLORS.bg,
                            borderRadius: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ color: COLORS.text, fontSize: '12px', fontWeight: '500' }}>Combined Score:</span>
                            <span style={{
                                color: luckRating.zScores.combined > 0 ? COLORS.green : luckRating.zScores.combined < 0 ? COLORS.red : COLORS.text,
                                fontSize: '14px',
                                fontWeight: '700'
                            }}>
                                {luckRating.zScores.combined > 0 ? '+' : ''}{luckRating.zScores.combined}σ → {luckRating.rating}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default LuckInfoModal;