import React, { useState, useEffect, useCallback } from 'react';
import { COLORS, API_BASE_URL, TEAM_MEMBERS, RARE_MEMBERS } from '../../config/constants';
import { useAuth, AuthProvider } from '../../context/AuthContext';
import { ActivityProvider } from '../../context/ActivityContext';
import { AnimationStyles } from './AnimationStyles';
import { WheelSpinner } from './WheelSpinner';
import { UsernameModal, ImportPromptModal, MigrationModal } from './modals';
import { Leaderboard } from './Leaderboard';
import { CollectionBook } from './CollectionBook';
import { SpinHistory } from './SpinHistory';
import { AdminPanel } from './AdminPanel';
import { Achievements } from './Achievements';
import { UserProfile } from './UserProfile';
import { LiveActivityToast } from './LiveActivityToast';
import { MythicCelebration } from './MythicCelebration';
import { RecursionOverlay } from './RecursionOverlay';
import { ActivityFeedSidebar } from './ActivityFeedSidebar';
import { LeaderboardSidebar } from './LeaderboardSidebar';
import { NotificationBell, NotificationCenter } from './NotificationCenter';
import { LiveChat } from './LiveChat';
import {
    User, Edit3, LogOut, Upload, Settings,
    BookOpen, ScrollText, Trophy, Check, Clock,
    Sparkles, Star, Diamond, Zap, Award, Activity, PartyPopper,
    ArrowLeft, Home, Bell, X
} from 'lucide-react';

// Username prompt modal - shown after first spin
function UsernamePromptModal({ onSetUsername, onDismiss }) {
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
            zIndex: 1100,
            padding: '20px',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div style={{
                background: COLORS.bg,
                borderRadius: '16px',
                border: `1px solid ${COLORS.border}`,
                padding: '32px',
                maxWidth: '400px',
                width: '100%',
                textAlign: 'center',
                animation: 'slideUp 0.3s ease-out'
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: `${COLORS.gold}22`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px'
                }}>
                    <PartyPopper size={28} color={COLORS.gold} />
                </div>

                <h3 style={{
                    color: COLORS.text,
                    margin: '0 0 12px',
                    fontSize: '20px',
                    fontWeight: '600'
                }}>
                    Welcome to the Wheel!
                </h3>

                <p style={{
                    color: COLORS.textMuted,
                    margin: '0 0 24px',
                    fontSize: '14px',
                    lineHeight: '1.5'
                }}>
                    Set a username to appear on the <strong style={{ color: COLORS.gold }}>leaderboard</strong> and
                    the <strong style={{ color: COLORS.purple }}>activity feed</strong> when you pull rare items!
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                        onClick={onSetUsername}
                        style={{
                            padding: '14px 24px',
                            background: COLORS.accent,
                            border: 'none',
                            borderRadius: '10px',
                            color: '#fff',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        <User size={18} />
                        Set Username
                    </button>

                    <button
                        onClick={onDismiss}
                        style={{
                            padding: '12px 24px',
                            background: 'transparent',
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '10px',
                            color: COLORS.textMuted,
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        Maybe Later
                    </button>
                </div>

                <p style={{
                    color: COLORS.textMuted,
                    margin: '16px 0 0',
                    fontSize: '11px'
                }}>
                    You can always set your username later in profile settings
                </p>
            </div>
        </div>
    );
}

function WheelOfFortunePage({ onBack }) {
    const { user, loading: authLoading, login, logout } = useAuth();
    const [allItems, setAllItems] = useState([]);
    const [dynamicItems, setDynamicItems] = useState([]);
    const [collection, setCollection] = useState({});
    const [collectionDetails, setCollectionDetails] = useState({});
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState({ totalSpins: 0, mythicCount: 0, legendaryCount: 0, rareCount: 0, eventTriggers: 0, totalDuplicates: 0 });
    const [loading, setLoading] = useState(true);

    const [showUsernameModal, setShowUsernameModal] = useState(false);
    const [showMigration, setShowMigration] = useState(false);
    const [showImportPrompt, setShowImportPrompt] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showCollection, setShowCollection] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showAchievements, setShowAchievements] = useState(false);
    const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
    const [hasLocalData, setHasLocalData] = useState(false);
    const [localDataInfo, setLocalDataInfo] = useState(null);

    // Notification state
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

    // Mobile activity feed modal state
    const [showMobileActivity, setShowMobileActivity] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Check for mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1400);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Check for local data on mount
    useEffect(() => {
        const stored = localStorage.getItem('fib_wheel_collection');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                const totalItems = Object.keys(data).length;
                const totalSpins = Object.values(data).reduce((sum, count) => sum + count, 0);

                let mythicCount = 0, legendaryCount = 0, rareCount = 0;
                for (const [texture, count] of Object.entries(data)) {
                    if (texture === 'mythic_cavendish' || texture.startsWith('mythic_')) mythicCount += count;
                    else if (texture.startsWith('special_')) legendaryCount += count;
                    else if (texture.startsWith('rare_')) rareCount += count;
                }

                if (totalItems > 0) {
                    setHasLocalData(true);
                    setLocalDataInfo({ totalItems, totalSpins, mythicCount, legendaryCount, rareCount });
                }
            } catch {}
        }
    }, []);

    // Show import prompt after login if user has local data and no spins
    useEffect(() => {
        if (user && user.totalSpins === 0 && hasLocalData && localDataInfo) {
            setShowImportPrompt(true);
        }
    }, [user, hasLocalData, localDataInfo]);

    useEffect(() => { fetchItems(); }, []);

    useEffect(() => {
        if (user) { fetchCollection(); fetchHistory(); }
        else { setCollection({}); setHistory([]); setStats({ totalSpins: 0, mythicCount: 0, legendaryCount: 0, rareCount: 0, eventTriggers: 0, totalDuplicates: 0 }); }
    }, [user]);

    // Fetch notification count for logged-in users
    useEffect(() => {
        if (!user) {
            setUnreadNotificationCount(0);
            return;
        }

        async function fetchNotificationCount() {
            try {
                const res = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setUnreadNotificationCount(data.count || 0);
                }
            } catch (error) {
                console.error('Failed to fetch notification count:', error);
            }
        }

        fetchNotificationCount();
        // Poll every 5 minutes as backup
        const interval = setInterval(fetchNotificationCount, 300000);
        return () => clearInterval(interval);
    }, [user]);

    // Preload some item images - service worker caches the rest as you play
    function preloadImages(items, specialItems) {
        const IMAGE_BASE = 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib';

        // Preload ~50 random items to warm up cache for first spin
        const sampleSize = Math.min(50, items.length);
        const sampledItems = items.sort(() => Math.random() - 0.5).slice(0, sampleSize);

        sampledItems.forEach(item => {
            const img = new Image();
            img.src = `${IMAGE_BASE}/${item.texture}.png`;
        });

        // Preload all special item images (rare, always want these ready)
        specialItems.forEach(item => {
            const img = new Image();
            if (item.image_url) {
                img.src = item.image_url;
            } else if (item.username) {
                img.src = `https://minotar.net/helm/${item.username}/64`;
            }
        });

        // Preload static assets
        ['/event.png', '/jimbo.png'].forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }

    async function fetchItems() {
        try {
            const itemsRes = await fetch(`${API_BASE_URL}/api/items`);
            const itemsData = await itemsRes.json();
            setAllItems(itemsData.items || []);

            const specialRes = await fetch(`${API_BASE_URL}/api/special-items`);
            const specialData = await specialRes.json();
            setDynamicItems(specialData.items || []);

            // Preload images after fetching
            preloadImages(itemsData.items || [], specialData.items || []);
        } catch (error) { console.error('Failed to fetch items:', error); }
        finally { setLoading(false); }
    }

    async function fetchCollection() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/collection`, { credentials: 'include' });
            const data = await res.json();
            setCollection(data.collection || {});
            setCollectionDetails(data.collectionDetails || {});
            setStats({
                totalSpins: data.totalSpins || 0,
                mythicCount: data.mythicCount || 0,
                legendaryCount: data.legendaryCount || 0,
                rareCount: data.rareCount || 0,
                eventTriggers: data.eventTriggers || 0,
                totalDuplicates: data.totalDuplicates || 0
            });
        } catch (error) { console.error('Failed to fetch collection:', error); }
    }

    async function fetchHistory() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/history?limit=50`, { credentials: 'include' });
            const data = await res.json();
            setHistory(data.history || []);
        } catch (error) { console.error('Failed to fetch history:', error); }
    }

    const handleSpinComplete = useCallback(async (spinData) => {
        // Use the data from the spin response for local state updates
        // This avoids fetching the entire collection and history after each spin

        if (spinData && spinData.result && !spinData.isEvent && typeof spinData.itemCount === 'number') {
            const { result, isNew, itemCount, updatedStats } = spinData;

            // Update collection locally
            setCollection(prev => ({
                ...prev,
                [result.texture]: itemCount
            }));

            // Update collection details locally
            setCollectionDetails(prev => ({
                ...prev,
                [result.texture]: {
                    count: itemCount,
                    name: result.name,
                    type: result.type,
                    firstObtained: isNew ? new Date().toISOString() : prev[result.texture]?.firstObtained
                }
            }));

            // Update stats if provided
            if (updatedStats) {
                setStats({
                    totalSpins: updatedStats.totalSpins,
                    mythicCount: updatedStats.mythicCount,
                    legendaryCount: updatedStats.legendaryCount,
                    rareCount: updatedStats.rareCount,
                    eventTriggers: updatedStats.eventTriggers,
                    totalDuplicates: updatedStats.totalDuplicates
                });
            }

            // Prepend to history locally (avoid fetching entire history)
            setHistory(prev => [{
                item_texture: result.texture,
                item_name: result.name,
                item_type: result.type,
                spun_at: new Date().toISOString()
            }, ...prev.slice(0, 99)]); // Keep max 100 items
        }

        // Prompt user to set a username if they haven't (check on every spin)
        if (user && !user.customUsername) {
            const dismissed = localStorage.getItem('fib_username_prompt_dismissed');
            if (!dismissed) {
                // Small delay so the spin result shows first
                setTimeout(() => {
                    setShowUsernamePrompt(true);
                }, 1500);
            }
        }
    }, [user]);

    async function handleImport(importData) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ collection: importData })
            });
            if (res.ok) {
                localStorage.removeItem('fib_wheel_collection');
                setHasLocalData(false);
                setLocalDataInfo(null);
                await fetchCollection();
                await fetchHistory();
            }
            return res;
        } catch (error) {
            console.error('Import failed:', error);
            throw error;
        }
    }

    // Helper to get Discord avatar URL
    function getDiscordAvatarUrl() {
        if (!user) return 'https://cdn.discordapp.com/embed/avatars/0.png';
        if (user.discordAvatar && user.discordId) {
            const format = user.discordAvatar.startsWith('a_') ? 'gif' : 'png';
            return `https://cdn.discordapp.com/avatars/${user.discordId}/${user.discordAvatar}.${format}?size=64`;
        }
        if (user.discordId) {
            try {
                const defaultIndex = Number(BigInt(user.discordId) >> 22n) % 6;
                return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
            } catch {
                return 'https://cdn.discordapp.com/embed/avatars/0.png';
            }
        }
        return 'https://cdn.discordapp.com/embed/avatars/0.png';
    }

    if (authLoading || loading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: COLORS.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ color: COLORS.textMuted, fontSize: '16px' }}>Loading...</div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: COLORS.bg,
            color: COLORS.text,
            padding: '0',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            position: 'relative',
            overflow: 'hidden'
        }}>
            <AnimationStyles />

            {/* Main layout with sidebars */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '40px',
                padding: '20px',
                minHeight: '100vh'
            }}>
                {/* Left Sidebar - Activity Feed */}
                <div style={{
                    display: 'none',  // Hidden on small screens
                    flexShrink: 0,
                    alignSelf: 'center'
                }}
                     className="sidebar-left"
                >
                    {user && <ActivityFeedSidebar />}
                </div>

                {/* Center Content */}
                <div style={{ maxWidth: '900px', width: '100%', position: 'relative', zIndex: 1 }}>
                    {/* Back Button */}
                    <a
                        href="/"
                        style={{
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: COLORS.textMuted,
                            textDecoration: 'none',
                            fontSize: '14px',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            transition: 'all 0.2s',
                            zIndex: 10
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.color = COLORS.text;
                            e.currentTarget.style.background = `${COLORS.border}44`;
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.color = COLORS.textMuted;
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        <ArrowLeft size={18} />
                        <span>Back</span>
                    </a>

                    {/* Header */}
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '24px',
                        paddingTop: '32px'
                    }}>
                        <h1 style={{
                            margin: '0 0 8px 0',
                            fontSize: '42px',
                            fontWeight: '800',
                            background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.orange})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            letterSpacing: '-1px'
                        }}>
                            Wheel of Fortune
                        </h1>
                        <p style={{
                            margin: 0,
                            color: COLORS.textMuted,
                            fontSize: '14px'
                        }}>
                            Spin the wheel to collect rare and legendary items
                        </p>
                    </div>

                    {/* User Bar */}
                    {!user ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '16px',
                            marginBottom: '20px',
                            flexWrap: 'wrap'
                        }}>
                            <button onClick={login} style={{
                                padding: '10px 24px',
                                background: 'linear-gradient(135deg, #5865F2, #4752C4)',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 4px 12px rgba(88, 101, 242, 0.25)'
                            }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(88, 101, 242, 0.35)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(88, 101, 242, 0.25)';
                                    }}
                            >
                                <svg width="18" height="18" viewBox="0 0 71 55" fill="currentColor">
                                    <path d="M60.1 4.9C55.6 2.8 50.7 1.3 45.7.4c-.1 0-.2 0-.2.1-.6 1.1-1.3 2.6-1.8 3.7-5.5-.8-10.9-.8-16.3 0-.5-1.2-1.2-2.6-1.8-3.7 0-.1-.1-.1-.2-.1-5 .9-9.9 2.4-14.4 4.5 0 0 0 0-.1.1C1.6 18.7-.9 32.1.3 45.4c0 .1 0 .1.1.2 6.1 4.5 12 7.2 17.7 9 .1 0 .2 0 .3-.1 1.4-1.9 2.6-3.8 3.6-5.9.1-.1 0-.3-.1-.3-2-.8-3.8-1.7-5.6-2.7-.1-.1-.1-.3 0-.4.4-.3.8-.6 1.1-.9.1-.1.2-.1.2 0 11.6 5.3 24.2 5.3 35.7 0 .1 0 .2 0 .2.1.4.3.7.6 1.1.9.1.1.1.3 0 .4-1.8 1-3.6 1.9-5.6 2.7-.1 0-.2.2-.1.3 1.1 2.1 2.3 4 3.6 5.9.1.1.2.1.3.1 5.8-1.8 11.7-4.5 17.8-9 0 0 .1-.1.1-.2 1.5-15.3-2.5-28.6-10.5-40.4 0 0 0-.1-.1-.1zM23.7 37.3c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.4 3.2 6.4 7.2s-2.8 7.2-6.4 7.2zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.2 6.4 7.2s-2.8 7.2-6.4 7.2z"/>
                                </svg>
                                Login with Discord
                            </button>
                            {hasLocalData && (
                                <span style={{ color: COLORS.gold, fontSize: '12px', fontWeight: '500' }}>
                                Local data ready to import
                            </span>
                            )}
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '20px'
                        }}>
                            {/* Extended user pill with all controls */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                padding: '4px',
                                background: COLORS.bgLight,
                                borderRadius: '28px',
                                border: `1px solid ${COLORS.border}`
                            }}>
                                {/* Clickable avatar + name section */}
                                <button
                                    onClick={() => setShowProfile(true)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '6px 14px 6px 6px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '24px',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = COLORS.bgLighter}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <img
                                        src={getDiscordAvatarUrl()}
                                        alt="Avatar"
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: COLORS.bgLighter
                                        }}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                        }}
                                    />
                                    <span style={{ color: COLORS.text, fontSize: '14px', fontWeight: '500' }}>
                                    {user.customUsername || 'Player'}
                                </span>
                                    {user.usernameApproved && (
                                        <Check size={14} color={COLORS.green} />
                                    )}
                                    {user.customUsername && !user.usernameApproved && (
                                        <Clock size={14} color={COLORS.gold} />
                                    )}
                                </button>

                                {/* Divider */}
                                <div style={{ width: '1px', height: '24px', background: COLORS.border }} />

                                {/* Edit button */}
                                <button
                                    onClick={() => setShowUsernameModal(true)}
                                    style={{
                                        padding: '8px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '50%',
                                        color: COLORS.textMuted,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = COLORS.bgLighter;
                                        e.currentTarget.style.color = COLORS.accent;
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = COLORS.textMuted;
                                    }}
                                    title="Edit Name"
                                >
                                    <Edit3 size={16} />
                                </button>

                                {/* Import button (if has local data) */}
                                {hasLocalData && (
                                    <button
                                        onClick={() => setShowMigration(true)}
                                        style={{
                                            padding: '8px',
                                            background: 'transparent',
                                            border: 'none',
                                            borderRadius: '50%',
                                            color: COLORS.gold,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = `${COLORS.gold}22`}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        title="Import Local Data"
                                    >
                                        <Upload size={16} />
                                    </button>
                                )}

                                {/* Admin button */}
                                {user.isAdmin && (
                                    <button
                                        onClick={() => setShowAdmin(true)}
                                        style={{
                                            padding: '8px',
                                            background: 'transparent',
                                            border: 'none',
                                            borderRadius: '50%',
                                            color: COLORS.textMuted,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = COLORS.bgLighter;
                                            e.currentTarget.style.color = COLORS.accent;
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = COLORS.textMuted;
                                        }}
                                        title="Admin Panel"
                                    >
                                        <Settings size={16} />
                                    </button>
                                )}

                                {/* Notification bell */}
                                <button
                                    onClick={() => setShowNotifications(true)}
                                    style={{
                                        padding: '8px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '50%',
                                        color: unreadNotificationCount > 0 ? COLORS.gold : COLORS.textMuted,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s',
                                        position: 'relative'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = COLORS.bgLighter;
                                        e.currentTarget.style.color = COLORS.accent;
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = unreadNotificationCount > 0 ? COLORS.gold : COLORS.textMuted;
                                    }}
                                    title="Notifications"
                                >
                                    <Bell size={16} />
                                    {unreadNotificationCount > 0 && (
                                        <span style={{
                                            position: 'absolute',
                                            top: '2px',
                                            right: '2px',
                                            background: COLORS.red,
                                            color: '#fff',
                                            fontSize: '9px',
                                            fontWeight: '700',
                                            borderRadius: '50%',
                                            minWidth: '14px',
                                            height: '14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '0 3px'
                                        }}>
                                            {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                                        </span>
                                    )}
                                </button>

                                {/* Logout button */}
                                <button
                                    onClick={logout}
                                    style={{
                                        padding: '8px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '50%',
                                        color: COLORS.textMuted,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = `${COLORS.red}22`;
                                        e.currentTarget.style.color = COLORS.red;
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = COLORS.textMuted;
                                    }}
                                    title="Logout"
                                >
                                    <LogOut size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Wheel - now bigger */}
                    <div style={{ marginBottom: '20px' }}>
                        <WheelSpinner
                            allItems={allItems}
                            collection={collection}
                            onSpinComplete={handleSpinComplete}
                            user={user}
                            dynamicItems={dynamicItems}
                            wheelSize={180}
                        />
                    </div>

                    {/* Navigation buttons */}
                    {user && (
                        <div style={{
                            display: 'flex',
                            gap: '4px',
                            justifyContent: 'center',
                            marginBottom: '20px',
                            padding: '6px 10px',
                            background: `${COLORS.bgLight}66`,
                            borderRadius: '12px',
                            width: 'fit-content',
                            margin: '0 auto 20px',
                            flexWrap: 'wrap'
                        }}>
                            <NavButton onClick={() => setShowCollection(true)} icon={<BookOpen size={18} />} label="Collection" />
                            <NavButton onClick={() => setShowHistory(true)} icon={<ScrollText size={18} />} label="History" />
                            <NavButton onClick={() => setShowLeaderboard(true)} icon={<Trophy size={18} />} label="Leaderboard" />
                            <NavButton onClick={() => setShowAchievements(true)} icon={<Award size={18} />} label="Achievements" />
                            {/* Mobile-only activity button */}
                            {isMobile && (
                                <NavButton
                                    onClick={() => setShowMobileActivity(true)}
                                    icon={<Activity size={18} />}
                                    label="Live"
                                    highlight={true}
                                />
                            )}
                        </div>
                    )}
                </div>
                {/* End Center Content */}

                {/* Right Sidebar - Leaderboard */}
                <div style={{
                    display: 'none',  // Hidden on small screens
                    flexShrink: 0,
                    alignSelf: 'center'
                }}
                     className="sidebar-right"
                >
                    {user && <LeaderboardSidebar onOpenFull={() => setShowLeaderboard(true)} />}
                </div>
            </div>
            {/* End Main Layout */}

            {/* CSS for responsive sidebars */}
            <style>{`
                @media (min-width: 1400px) {
                    .sidebar-left, .sidebar-right {
                        display: block !important;
                    }
                }
            `}</style>

            {/* Modals */}
            {showUsernameModal && (
                <UsernameModal
                    onClose={() => setShowUsernameModal(false)}
                    currentUsername={user?.customUsername}
                />
            )}

            {showImportPrompt && localDataInfo && (
                <ImportPromptModal
                    localDataInfo={localDataInfo}
                    onImport={() => {
                        setShowImportPrompt(false);
                        setShowMigration(true);
                    }}
                    onSkip={() => setShowImportPrompt(false)}
                />
            )}

            {showMigration && (
                <MigrationModal
                    onClose={() => setShowMigration(false)}
                    onImport={handleImport}
                />
            )}

            {showLeaderboard && (
                <Leaderboard onClose={() => setShowLeaderboard(false)} />
            )}

            {showCollection && (
                <CollectionBook
                    onClose={() => setShowCollection(false)}
                    collection={collection}
                    collectionDetails={collectionDetails}
                    stats={stats}
                    allItems={allItems}
                    dynamicItems={dynamicItems}
                />
            )}

            {showHistory && (
                <SpinHistory
                    onClose={() => setShowHistory(false)}
                    history={history}
                />
            )}

            {showAdmin && (
                <AdminPanel
                    onClose={() => setShowAdmin(false)}
                    allItems={allItems}
                />
            )}

            {showProfile && user && (
                <UserProfile
                    userId={user.id}
                    onClose={() => setShowProfile(false)}
                    isOwnProfile={true}
                    onEditUsername={() => {
                        setShowProfile(false);
                        setShowUsernameModal(true);
                    }}
                />
            )}

            {showAchievements && (
                <Achievements onClose={() => setShowAchievements(false)} />
            )}

            {showUsernamePrompt && (
                <UsernamePromptModal
                    onSetUsername={() => {
                        setShowUsernamePrompt(false);
                        setShowUsernameModal(true);
                    }}
                    onDismiss={() => {
                        setShowUsernamePrompt(false);
                        localStorage.setItem('fib_username_prompt_dismissed', 'true');
                    }}
                />
            )}

            {/* Live Activity Toast - shows popup when someone gets a special item */}
            <LiveActivityToast />

            {/* Insane Item Celebration - full screen celebration for insane pulls */}
            <MythicCelebration currentUserId={user?.id} />

            {/* Recursion Overlay - matrix effect when recursion event is active */}
            <RecursionOverlay currentUserId={user?.id} />

            {/* Notification Center */}
            {showNotifications && (
                <NotificationCenter
                    isOpen={showNotifications}
                    onClose={() => {
                        setShowNotifications(false);
                        // Refresh count after closing
                        fetch(`${API_BASE_URL}/api/notifications/unread-count`, { credentials: 'include' })
                            .then(res => res.json())
                            .then(data => setUnreadNotificationCount(data.count || 0))
                            .catch(() => {});
                    }}
                />
            )}

            {/* Mobile Activity Feed Modal */}
            {showMobileActivity && (
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
                    zIndex: 1100,
                    padding: '20px',
                    animation: 'fadeIn 0.3s ease-out'
                }}
                     onClick={(e) => {
                         if (e.target === e.currentTarget) setShowMobileActivity(false);
                     }}
                >
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '380px',
                        maxHeight: '90vh',
                        animation: 'slideUp 0.3s ease-out'
                    }}>
                        {/* Close button */}
                        <button
                            onClick={() => setShowMobileActivity(false)}
                            style={{
                                position: 'absolute',
                                top: '-12px',
                                right: '-12px',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: COLORS.bgLight,
                                border: `1px solid ${COLORS.border}`,
                                color: COLORS.text,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1
                            }}
                        >
                            <X size={16} />
                        </button>
                        <ActivityFeedSidebar />
                    </div>
                </div>
            )}

            {/* Live Chat */}
            {user && <LiveChat user={user} isAdmin={user.isAdmin} />}
        </div>
    );
}

// Navigation button component
function NavButton({ onClick, icon, label, highlight = false }) {
    const [showTooltip, setShowTooltip] = React.useState(false);

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={onClick}
                onMouseEnter={(e) => {
                    setShowTooltip(true);
                    e.currentTarget.style.background = highlight ? `${COLORS.green}33` : COLORS.bgLighter;
                    e.currentTarget.style.color = highlight ? COLORS.green : COLORS.text;
                }}
                onMouseLeave={(e) => {
                    setShowTooltip(false);
                    e.currentTarget.style.background = highlight ? `${COLORS.green}22` : 'transparent';
                    e.currentTarget.style.color = highlight ? COLORS.green : COLORS.textMuted;
                }}
                style={{
                    width: '36px',
                    height: '36px',
                    background: highlight ? `${COLORS.green}22` : 'transparent',
                    border: highlight ? `1px solid ${COLORS.green}44` : 'none',
                    borderRadius: '8px',
                    color: highlight ? COLORS.green : COLORS.textMuted,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                }}
            >
                {icon}
            </button>
            {showTooltip && (
                <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '6px',
                    padding: '4px 8px',
                    background: COLORS.bgLighter,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '4px',
                    color: COLORS.text,
                    fontSize: '11px',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 10
                }}>
                    {label}
                </div>
            )}
        </div>
    );
}

// Global stat component

export default function WheelOfFortune({ onBack }) {
    return (
        <AuthProvider>
            <ActivityProvider>
                <WheelOfFortunePage onBack={onBack || (() => window.location.hash = '')} />
            </ActivityProvider>
        </AuthProvider>
    );
}