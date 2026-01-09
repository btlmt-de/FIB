import React, { useState, useEffect, useRef, useCallback } from 'react';
import { COLORS, IMAGE_BASE_URL } from '../../config/constants.js';
import { getItemImageUrl, getDiscordAvatarUrl } from '../../utils/helpers.js';
import { getRarityIcon, getRarityColor } from '../../utils/rarityHelpers.jsx';
import { useActivity } from '../../context/ActivityContext';
import * as LucideIcons from 'lucide-react';
import { Trophy, Sparkles } from 'lucide-react';

// Achievement category colors (matching Achievements.jsx)
const ACHIEVEMENT_CATEGORY_COLORS = {
    beginner: COLORS.green,
    collection: COLORS.purple,
    spins: COLORS.orange,
    events: COLORS.gold,
    duplicates: COLORS.red,
    special: COLORS.aqua
};

// Helper to render Lucide icons by name
function AchievementIcon({ name, size = 16, color, style = {} }) {
    const IconComponent = LucideIcons[name];
    if (!IconComponent) {
        return <Trophy size={size} color={color} style={style} />;
    }
    return <IconComponent size={size} color={color} style={style} />;
}

export function LiveActivityToast() {
    const [toasts, setToasts] = useState([]);
    const { newItems, clearNewItems } = useActivity();
    const pendingTimeoutsRef = useRef([]);
    const processedIdsRef = useRef(new Set());
    const isMountedRef = useRef(true);

    // Process new items from context
    useEffect(() => {
        if (!newItems || newItems.length === 0) return;

        // Filter out already processed items
        const unprocessedItems = newItems.filter(item => !processedIdsRef.current.has(item.id));

        if (unprocessedItems.length === 0) return;

        // Schedule toasts for new items (max 3 at a time)
        unprocessedItems.slice(0, 3).reverse().forEach((item, idx) => {
            // Mark as processed
            processedIdsRef.current.add(item.id);

            // Parse created_at
            let createdAtStr = item.created_at;
            if (!createdAtStr.includes('Z') && !createdAtStr.includes('+')) {
                createdAtStr = createdAtStr.replace(' ', 'T') + 'Z';
            }
            const now = Date.now();
            const itemCreatedAt = new Date(createdAtStr).getTime();
            const safeCreatedAt = Number.isFinite(itemCreatedAt) ? itemCreatedAt : now;
            const itemAge = Math.max(0, now - safeCreatedAt);

            // If item is very fresh (< 2 seconds), it's from SSE - delay to respect spin animation
            // If item is older, it's from initial fetch during spin animation - calculate remaining delay
            let delay;
            if (itemAge < 2000) {
                // Fresh SSE item - delay 4 seconds to respect spin animation
                delay = 4000 + (idx * 300);
            } else {
                // Older item - apply remaining delay to sync with spin animation
                const DELAY_AFTER_CREATION = 5000;
                delay = Math.max(500, DELAY_AFTER_CREATION - itemAge) + (idx * 300);
            }

            const timeoutId = setTimeout(() => {
                if (isMountedRef.current) {
                    addToast(item);
                }
                pendingTimeoutsRef.current = pendingTimeoutsRef.current.filter(id => id !== timeoutId);
            }, delay);
            pendingTimeoutsRef.current.push(timeoutId);
        });

        // Clear new items after processing
        clearNewItems();

        // Clean up old processed IDs (keep last 100)
        if (processedIdsRef.current.size > 100) {
            const idsArray = Array.from(processedIdsRef.current);
            processedIdsRef.current = new Set(idsArray.slice(-50));
        }
    }, [newItems, clearNewItems]);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            // Clear all pending timeouts
            pendingTimeoutsRef.current.forEach(id => clearTimeout(id));
            pendingTimeoutsRef.current = [];
        };
    }, []);

    const addToast = useCallback((item) => {
        const toastId = `${item.id}-${Date.now()}`;

        setToasts(prev => {
            // Limit to 5 toasts max
            const newToasts = [...prev, { ...item, toastId }];
            if (newToasts.length > 5) {
                return newToasts.slice(-5);
            }
            return newToasts;
        });

        // Auto-remove after 6 seconds
        setTimeout(() => {
            if (isMountedRef.current) {
                setToasts(prev => prev.filter(t => t.toastId !== toastId));
            }
        }, 6000);
    }, []);

    const removeToast = useCallback((toastId) => {
        setToasts(prev => prev.filter(t => t.toastId !== toastId));
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 1000,
            pointerEvents: 'none'
        }}>
            <style>{`
                @keyframes toastSlideIn {
                    from {
                        transform: translateX(120%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes toastPulse {
                    0%, 100% { box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
                    50% { box-shadow: 0 4px 30px rgba(0,0,0,0.5); }
                }
                @keyframes achievementShine {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
            `}</style>

            {toasts.map((toast) => {
                const isAchievement = toast.event_type === 'achievement_unlock';

                if (isAchievement) {
                    // Achievement toast
                    // For achievements: item_texture=icon, item_name=name, item_rarity=category, is_hidden
                    const categoryColor = ACHIEVEMENT_CATEGORY_COLORS[toast.item_rarity] || COLORS.gold;
                    const isHidden = toast.is_hidden === 1;

                    return (
                        <div
                            key={toast.toastId}
                            onClick={() => removeToast(toast.toastId)}
                            style={{
                                background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bg} 100%)`,
                                border: `2px solid ${categoryColor}`,
                                borderRadius: '12px',
                                padding: '14px 18px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                minWidth: '320px',
                                maxWidth: '400px',
                                animation: 'toastSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                cursor: 'pointer',
                                pointerEvents: 'auto',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Shine effect */}
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: `linear-gradient(90deg, transparent, ${categoryColor}22, transparent)`,
                                backgroundSize: '200% 100%',
                                animation: 'achievementShine 2s ease-in-out infinite',
                                pointerEvents: 'none'
                            }} />

                            {/* Achievement icon */}
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: `${categoryColor}33`,
                                border: `2px solid ${categoryColor}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {isHidden ? (
                                    <AchievementIcon
                                        name="HelpCircle"
                                        size={24}
                                        color={categoryColor}
                                    />
                                ) : (
                                    <AchievementIcon
                                        name={toast.item_texture}
                                        size={24}
                                        color={categoryColor}
                                    />
                                )}
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
                                <div style={{
                                    fontSize: '11px',
                                    color: categoryColor,
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    marginBottom: '2px'
                                }}>
                                    {isHidden ? 'Hidden Achievement!' : 'Achievement Unlocked!'}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <img
                                        src={getDiscordAvatarUrl(toast.discord_id, toast.discord_avatar)}
                                        alt=""
                                        style={{
                                            width: '18px',
                                            height: '18px',
                                            borderRadius: '50%'
                                        }}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                        }}
                                    />
                                    <span style={{
                                        fontSize: '13px',
                                        color: COLORS.text,
                                        fontWeight: '500'
                                    }}>
                                        {toast.custom_username || 'Someone'}
                                    </span>
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: COLORS.text,
                                    fontWeight: '600',
                                    marginTop: '4px'
                                }}>
                                    {isHidden ? 'Discovered a hidden achievement!' : toast.item_name}
                                </div>
                            </div>
                        </div>
                    );
                }

                // Item drop toast
                const rarityColor = getRarityColor(toast.item_rarity);

                return (
                    <div
                        key={toast.toastId}
                        onClick={() => removeToast(toast.toastId)}
                        style={{
                            background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bg} 100%)`,
                            border: `2px solid ${rarityColor}`,
                            borderRadius: '12px',
                            padding: '14px 18px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            minWidth: '320px',
                            maxWidth: '400px',
                            animation: 'toastSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), toastPulse 2s ease-in-out infinite',
                            cursor: 'pointer',
                            pointerEvents: 'auto'
                        }}
                    >
                        {/* Item image */}
                        <div style={{
                            width: '52px',
                            height: '52px',
                            background: `${rarityColor}22`,
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `1px solid ${rarityColor}44`,
                            flexShrink: 0
                        }}>
                            <img
                                src={getItemImageUrl(toast)}
                                alt={toast.item_name}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    objectFit: 'contain',
                                    imageRendering: 'pixelated'
                                }}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                }}
                            />
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '4px'
                            }}>
                                <img
                                    src={getDiscordAvatarUrl(toast.discord_id, toast.discord_avatar)}
                                    alt=""
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%'
                                    }}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                    }}
                                />
                                <span style={{
                                    fontSize: '13px',
                                    color: COLORS.text,
                                    fontWeight: '500'
                                }}>
                                    {toast.custom_username || 'Someone'}
                                </span>
                                <span style={{
                                    fontSize: '12px',
                                    color: COLORS.textMuted
                                }}>
                                    found
                                </span>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: rarityColor,
                                fontWeight: '600',
                                fontSize: '14px'
                            }}>
                                {getRarityIcon(toast.item_rarity, 16)}
                                <span style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {toast.item_name}
                                </span>
                            </div>
                            {/* Lucky Spin Banner */}
                            {toast.is_lucky === 1 && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    marginTop: '6px',
                                    padding: '4px 8px',
                                    background: 'linear-gradient(135deg, #00440022, #00FF0015)',
                                    border: '1px solid #00FF0044',
                                    borderRadius: '6px',
                                    width: 'fit-content'
                                }}>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        color: '#00FF00',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        textShadow: '0 0 8px #00FF0044'
                                    }}>
                                        Lucky Spin
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}