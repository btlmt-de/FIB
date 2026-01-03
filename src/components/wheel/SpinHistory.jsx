import React from 'react';
import { COLORS, IMAGE_BASE_URL, MYTHIC_ITEM } from './constants';
import { formatTimeAgo, getMinecraftHeadUrl } from './helpers';

export function SpinHistory({ history, onClose }) {
    function getItemColor(type) {
        if (type === 'mythic') return COLORS.aqua;
        if (type === 'legendary') return COLORS.purple;
        if (type === 'rare') return COLORS.red;
        return COLORS.text;
    }

    function getItemImageUrl(item) {
        if (item.item_type === 'mythic' && !item.item_texture?.includes('_')) return MYTHIC_ITEM.imageUrl;
        if (item.item_texture?.startsWith('special_') || item.item_texture?.startsWith('rare_')) {
            const username = item.item_texture.split('_').slice(1).join('_');
            return getMinecraftHeadUrl(username);
        }
        return `${IMAGE_BASE_URL}/${item.item_texture}.png`;
    }

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: COLORS.bg, borderRadius: '16px', border: `1px solid ${COLORS.border}`, width: '100%', maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ margin: 0, color: COLORS.text, fontWeight: '600' }}>📜 Spin History</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: COLORS.textMuted, fontSize: '24px', cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
                    {history.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: COLORS.textMuted }}><div style={{ fontSize: '48px', marginBottom: '12px' }}>🎰</div><div>No spins yet!</div></div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {history.map((spin, idx) => (
                                <div key={idx} style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                                    background: COLORS.bgLight, borderRadius: '8px',
                                    border: `1px solid ${spin.item_type !== 'regular' ? getItemColor(spin.item_type) + '44' : COLORS.border}`
                                }}>
                                    <img src={getItemImageUrl(spin)} alt={spin.item_name}
                                         style={{ width: '32px', height: '32px', imageRendering: 'pixelated' }}
                                         onError={(e) => { e.target.onerror = null; e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: getItemColor(spin.item_type), fontWeight: '500' }}>{spin.item_name}</div>
                                    </div>
                                    <div style={{ color: COLORS.textMuted, fontSize: '12px' }}>{formatTimeAgo(spin.spun_at)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}