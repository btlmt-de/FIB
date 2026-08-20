import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IMAGE_BASE_URL } from '../../../config/constants.js';
import { COLORS } from '../config/constants';
import { getItemImageUrl, getDiscordAvatarUrl, spinRevealDelay } from '../../../utils/helpers.js';
import { getRarityIcon, getRarityColor } from '../../../utils/rarityHelpers.jsx';
import { useActivity } from '../../../context/ActivityContext.jsx';
import { Trophy, Sparkles } from 'lucide-react';
import { AchievementIcon } from '../../../utils/achievementIcons.jsx';

// Achievement category colors (matching Achievements.jsx)
    const ACHIEVEMENT_CATEGORY_COLORS = {
        beginner: COLORS.green,
        collection: COLORS.purple,
        spins: COLORS.orange,
        events: COLORS.gold,
        duplicates: COLORS.red,
        special: COLORS.aqua
};


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

            // The reveal window is `spinRevealDelay`'s now, not this component's.
            //
            // It used to be computed here: its own date parsing, its own age
            // branch, 4500ms for a fresh SSE item and `max(500, 5000 - age)` for an
            // older one. Two constants for one idea, and — more to the point — the
            // activity feed had no copy of the rule at all, so the ticker printed a
            // drop about four seconds before this toast announced the same drop.
            // Sharing the helper is what makes "synced" a property of the code
            // rather than of two numbers that happen to be close.
            //
            // The stagger stays local. It is about not stacking three toasts on one
            // frame, which is this component's problem and nobody else's.
            const delay = spinRevealDelay(item.created_at) + (idx * 300);

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
                                // Decelerating, not overshooting. DESIGN.md §8
                                // permits the 1.56-style overshoot on the spin
                                // control alone — a wheel overshoots and settles,
                                // and the control that starts one may borrow that —
                                // and names panels, modals and toasts as taking a
                                // smooth curve instead. A toast that sails past its
                                // resting position and springs back is the same
                                // defect the rule was written for when the username
                                // modal did it.
                                animation: 'toastSlideIn 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
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
                                backgroundImage: `linear-gradient(90deg, transparent, ${categoryColor}22, transparent)`,
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
                            // Same decelerating curve as the ordinary toast above.
                            // This is the special-pull variant; being the loud one
                            // is not a reason to be the bouncy one.
                            animation: 'toastSlideIn 0.4s cubic-bezier(0.22, 1, 0.36, 1), toastPulse 2s ease-in-out infinite',
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
                            {/* Gold Rush Banner */}
                            {toast.is_gold_rush === 1 && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    marginTop: '6px',
                                    padding: '4px 8px',
                                    background: 'linear-gradient(135deg, #FFD70022, #FFD70015)',
                                    border: '1px solid #FFD70044',
                                    borderRadius: '6px',
                                    width: 'fit-content'
                                }}>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        color: '#FFD700',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        textShadow: '0 0 8px #FFD70044'
                                    }}>
                                        Gold Rush
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