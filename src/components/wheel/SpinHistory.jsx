import React from 'react';
import { COLORS } from '../../config/constants.js';
import { formatTimeAgo, getItemImageUrl } from '../../utils/helpers.js';
import { X, Sparkles, Star, Diamond, Circle, ScrollText } from 'lucide-react';

export function SpinHistory({ history, onClose }) {
    function getItemColor(type) {
        if (type === 'mythic') return COLORS.aqua;
        if (type === 'legendary') return COLORS.purple;
        if (type === 'rare') return COLORS.red;
        return COLORS.text;
    }

    function getRarityIcon(type) {
        if (type === 'mythic') return <Sparkles size={10} />;
        if (type === 'legendary') return <Star size={10} />;
        if (type === 'rare') return <Diamond size={10} />;
        return <Circle size={10} />;
    }

    function getRarityBadge(type) {
        if (type === 'mythic') return { label: 'Mythic', color: COLORS.aqua, icon: <Sparkles size={10} /> };
        if (type === 'legendary') return { label: 'Legendary', color: COLORS.purple, icon: <Star size={10} /> };
        if (type === 'rare') return { label: 'Rare', color: COLORS.red, icon: <Diamond size={10} /> };
        return { label: 'Common', color: COLORS.gold, icon: <Circle size={10} /> };
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .history-item {
                    transition: all 0.2s ease;
                }
                .history-item:hover {
                    transform: translateX(4px);
                }
            `}</style>

            <div style={{
                background: COLORS.bg,
                borderRadius: '16px',
                border: `1px solid ${COLORS.border}`,
                width: '100%',
                maxWidth: '550px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 0.3s ease-out'
            }}>
                <div style={{
                    padding: '24px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bg} 100%)`
                }}>
                    <h2 style={{
                        margin: 0,
                        color: COLORS.text,
                        fontWeight: '600',
                        fontSize: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <ScrollText size={22} />
                        Spin History
                    </h2>
                    <button onClick={onClose} style={{
                        background: 'transparent',
                        border: 'none',
                        color: COLORS.textMuted,
                        fontSize: '24px',
                        cursor: 'pointer',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        transition: 'all 0.2s'
                    }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = COLORS.bgLight;
                                e.currentTarget.style.color = COLORS.accent;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = COLORS.textMuted;
                            }}
                    >
                        x
                    </button>
                </div>

                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '16px 24px'
                }}>
                    {history.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '48px 20px',
                            color: COLORS.textMuted
                        }}>
                            <div style={{ marginBottom: '12px' }}><ScrollText size={48} color={COLORS.textMuted} /></div>
                            <div style={{ fontSize: '14px' }}>No spins yet!</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {history.map((spin, idx) => {
                                const rarity = getRarityBadge(spin.item_type);
                                const isSpecial = spin.item_type !== 'regular';
                                const borderColor = isSpecial ? rarity.color + '44' : COLORS.border;
                                const bgGradient = isSpecial
                                    ? `linear-gradient(135deg, ${rarity.color}11 0%, ${rarity.color}05 100%)`
                                    : COLORS.bgLight;

                                return (
                                    <div
                                        key={idx}
                                        className="history-item"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px 14px',
                                            background: bgGradient,
                                            borderRadius: '10px',
                                            border: `1px solid ${borderColor}`,
                                            position: 'relative'
                                        }}
                                    >
                                        <div style={{
                                            width: '4px',
                                            height: '100%',
                                            background: rarity.color,
                                            borderRadius: '2px',
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            bottom: 0
                                        }} />

                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            background: COLORS.bgLighter,
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: `1px solid ${borderColor}`,
                                            flexShrink: 0,
                                            overflow: 'hidden'
                                        }}>
                                            <img
                                                src={getItemImageUrl(spin)}
                                                alt={spin.item_name}
                                                style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    imageRendering: 'pixelated'
                                                }}
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = `${IMAGE_BASE_URL}/barrier.png`;
                                                }}
                                            />
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                color: rarity.color,
                                                fontWeight: '600',
                                                fontSize: '14px',
                                                marginBottom: '2px'
                                            }}>
                                                {spin.item_name}
                                            </div>
                                            <div style={{
                                                color: COLORS.textMuted,
                                                fontSize: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                <span style={{ color: rarity.color }}>{rarity.icon}</span>
                                                <span>{rarity.label}</span>
                                            </div>
                                        </div>

                                        <div style={{
                                            color: COLORS.textMuted,
                                            fontSize: '11px',
                                            whiteSpace: 'nowrap',
                                            textAlign: 'right'
                                        }}>
                                            {formatTimeAgo(spin.spun_at)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}