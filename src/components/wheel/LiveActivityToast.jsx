import React, { useState, useEffect, useRef, useCallback } from 'react';
import { COLORS, API_BASE_URL, IMAGE_BASE_URL } from '../../config/constants.js';
import { Sparkles, Star, Diamond } from 'lucide-react';
import { getMinecraftHeadUrl } from '../../utils/helpers.js';

/**
 * Render a bottom-right stack of transient toasts announcing newly detected activity items.
 *
 * Polls the activity feed periodically (pauses while the document is hidden), tracks the last seen item ID,
 * and displays toasts for items with newer IDs. Toasts are staggered to align with an external animation,
 * auto-dismiss after five seconds, and can be dismissed by clicking — which optionally triggers `onOpenFeed`.
 *
 * @param {Object} props
 * @param {() => void} [props.onOpenFeed] - Optional callback invoked when a toast is clicked (e.g., to open the activity feed).
 * @returns {JSX.Element|null} The toast container element when there are active toasts, or `null` when none are present.
 */
export function LiveActivityToast({ onOpenFeed }) {
    const [toasts, setToasts] = useState([]);
    const lastIdRef = useRef(null);
    const intervalRef = useRef(null);
    const initializedRef = useRef(false);
    const isVisibleRef = useRef(true);

    const fetchLatest = useCallback(async () => {
        // Skip fetch if tab is not visible
        if (!isVisibleRef.current) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/activity?limit=5`);
            const data = await res.json();

            if (data.feed && data.feed.length > 0) {
                const newestId = data.feed[0].id;

                if (!initializedRef.current) {
                    // First fetch - just store the ID, don't show toasts
                    lastIdRef.current = newestId;
                    initializedRef.current = true;
                } else if (lastIdRef.current !== null && newestId > lastIdRef.current) {
                    // New items found
                    const newItems = data.feed.filter(item => item.id > lastIdRef.current);

                    // Add toasts for new items (max 3 at a time)
                    // Delay to sync with spin result animation (~8s spin duration)
                    newItems.slice(0, 3).reverse().forEach((item, idx) => {
                        setTimeout(() => {
                            addToast(item);
                        }, 8000 + (idx * 300));
                    });

                    lastIdRef.current = newestId;
                }
            }
        } catch (e) {
            console.error('Failed to fetch activity:', e);
        }
    }, []);

    useEffect(() => {
        // Handle visibility change to pause/resume polling
        const handleVisibilityChange = () => {
            isVisibleRef.current = !document.hidden;
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Initial fetch
        fetchLatest();

        // Poll every 5 seconds
        intervalRef.current = setInterval(fetchLatest, 5000);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [fetchLatest]);

    function addToast(item) {
        const toastId = `${item.id}-${Date.now()}`;

        setToasts(prev => [...prev, { ...item, toastId }]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.toastId !== toastId));
        }, 5000);
    }

    function removeToast(toastId) {
        setToasts(prev => prev.filter(t => t.toastId !== toastId));
    }

    function getRarityIcon(rarity) {
        if (rarity === 'mythic') return <Sparkles size={14} />;
        if (rarity === 'legendary') return <Star size={14} />;
        if (rarity === 'rare') return <Diamond size={14} />;
        return null;
    }

    function getRarityColor(rarity) {
        if (rarity === 'mythic') return COLORS.aqua;
        if (rarity === 'legendary') return COLORS.purple;
        if (rarity === 'rare') return COLORS.red;
        return COLORS.gold;
    }

    function getItemImageUrl(item) {
        // Mythic items with specific images
        if (item.item_texture?.startsWith('mythic_')) {
            if (item.item_texture === 'mythic_cavendish') {
                return 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/item/cavendish.png';
            }
            if (item.item_texture === 'mythic_jimbo') {
                return '/jimbo.png';
            }
            // Other mythic playerheads
            const username = item.item_texture.replace('mythic_', '');
            return getMinecraftHeadUrl(username);
        }
        if (item.item_texture?.startsWith('special_') || item.item_texture?.startsWith('rare_')) {
            const username = item.item_texture.split('_').slice(1).join('_');
            return getMinecraftHeadUrl(username);
        }
        return `${IMAGE_BASE_URL}/${item.item_texture}.png`;
    }

    function getDiscordAvatarUrl(discordId, discordAvatar) {
        if (discordAvatar) {
            return `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.png?size=32`;
        }
        if (!discordId) return 'https://cdn.discordapp.com/embed/avatars/0.png';
        try {
            const defaultIndex = Number(BigInt(discordId) >> 22n) % 6;
            return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
        } catch {
            return 'https://cdn.discordapp.com/embed/avatars/0.png';
        }
    }

    if (toasts.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 900,
            pointerEvents: 'none'
        }}>
            <style>{`
                @keyframes slideInRight {
                    from { 
                        opacity: 0; 
                        transform: translateX(100px);
                    }
                    to { 
                        opacity: 1; 
                        transform: translateX(0);
                    }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                .activity-toast {
                    animation: slideInRight 0.3s ease-out;
                    pointer-events: auto;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                }
                .activity-toast:hover {
                    transform: scale(1.02);
                }
            `}</style>

            {toasts.map((item) => {
                const rarityColor = getRarityColor(item.item_rarity);

                return (
                    <div
                        key={item.toastId}
                        className="activity-toast"
                        onClick={() => {
                            removeToast(item.toastId);
                            onOpenFeed?.();
                        }}
                        style={{
                            background: `linear-gradient(135deg, ${COLORS.bg} 0%, ${rarityColor}22 100%)`,
                            border: `1px solid ${rarityColor}66`,
                            borderRadius: '12px',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: `0 4px 20px ${rarityColor}33, 0 0 40px ${rarityColor}22`,
                            minWidth: '280px',
                            maxWidth: '350px'
                        }}
                    >
                        {/* User avatar */}
                        <img
                            src={getDiscordAvatarUrl(item.discord_id, item.discord_avatar)}
                            alt=""
                            style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: `2px solid ${rarityColor}`
                            }}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                            }}
                        />

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontSize: '12px',
                                color: COLORS.textMuted,
                                marginBottom: '2px'
                            }}>
                                <span style={{ color: COLORS.text, fontWeight: '600' }}>
                                    {item.custom_username || item.discord_username || 'Someone'}
                                </span>
                                {' '}found
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: rarityColor,
                                fontWeight: '600',
                                fontSize: '14px'
                            }}>
                                {getRarityIcon(item.item_rarity)}
                                <span style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {item.item_name}
                                </span>
                            </div>
                        </div>

                        {/* Item image */}
                        <div style={{
                            width: '32px',
                            height: '32px',
                            background: rarityColor + '33',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `1px solid ${rarityColor}44`,
                            flexShrink: 0
                        }}>
                            <img
                                src={getItemImageUrl(item)}
                                alt={item.item_name}
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    imageRendering: 'pixelated'
                                }}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `${IMAGE_BASE_URL}/barrier.png`;
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}