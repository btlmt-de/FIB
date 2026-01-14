import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { COLORS, API_BASE_URL, TEAM_MEMBERS, RARE_MEMBERS } from '../../config/constants';
import { useAuth, AuthProvider } from '../../context/AuthContext';
import { ActivityProvider, useActivity } from '../../context/ActivityContext';
import { SoundProvider } from '../../context/SoundContext.jsx';
import { AnimationStyles } from './AnimationStyles';
import { WheelSpinner } from './WheelSpinner';
import { UsernameModal } from './modals';
import { Leaderboard } from './Leaderboard';
import { CollectionBook } from './CollectionBook';
import { SpinHistory } from './SpinHistory';
import { AdminPanel } from './AdminPanel';
import { Achievements } from './Achievements';
import { UserProfile } from './UserProfile';
import { LiveActivityToast } from './LiveActivityToast';
import { PixiMythicCelebration as MythicCelebration } from './PixiMythicCelebration';
import { RecursionOverlay } from './RecursionOverlay';
import GoldRushBanner from './GoldRushBanner';
import KingOfWheelBanner from './KingOfWheelBanner';
import EventSelectionWheel from './EventSelectionWheel';
import { ActivityFeedSidebar } from './ActivityFeedSidebar';
import { LeaderboardSidebar } from './LeaderboardSidebar';
import { NotificationBell, NotificationCenter } from './NotificationCenter';
import { LiveChat } from './LiveChat';
import { SoundButton, SoundSettingsPanel } from './SoundSettings';
import { CanvasCosmicBackground } from './CanvasCosmicBackground.jsx';
import {
    User, Edit3, LogOut, Settings,
    BookOpen, ScrollText, Trophy, Check, Clock,
    Sparkles, Star, Diamond, Zap, Award, Activity, PartyPopper,
    ArrowLeft, Home, Bell, X
} from 'lucide-react';

// ============================================
// PERFORMANCE TOGGLE: Canvas vs DOM background
// Set to true to use GPU-accelerated canvas stars
// Set to false to use original DOM-based stars
// ============================================
// ============================================
// ENHANCED LOADING SCREEN
// ============================================
const CosmicLoader = () => (
    <div style={{
        minHeight: '100vh',
        background: COLORS.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px'
    }}>
        <AnimationStyles />
        <CanvasCosmicBackground />
        <div style={{
            position: 'relative',
            width: '80px',
            height: '80px',
        }}>
            {/* Outer ring */}
            <div style={{
                position: 'absolute',
                inset: 0,
                border: `3px solid ${COLORS.border}`,
                borderTopColor: COLORS.gold,
                borderRadius: '50%',
                animation: 'none',
            }} />
            {/* Inner ring */}
            <div style={{
                position: 'absolute',
                inset: '10px',
                border: `3px solid ${COLORS.border}`,
                borderTopColor: COLORS.purple,
                borderRadius: '50%',
                animation: 'none',
            }} />
            {/* Core */}
            <div style={{
                position: 'absolute',
                inset: '20px',
                background: `radial-gradient(circle, ${COLORS.gold}44 0%, transparent 70%)`,
                borderRadius: '50%',
                animation: 'none',
            }} />
        </div>
        <div style={{
            color: COLORS.textMuted,
            fontSize: '14px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            animation: 'none',
        }}>
            Loading
        </div>
    </div>
);

// ============================================
// ENHANCED NAV BUTTON
// ============================================
function NavButton({ onClick, icon, label, highlight = false }) {
    const [isHovered, setIsHovered] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={onClick}
                onMouseEnter={() => { setIsHovered(true); setShowTooltip(true); }}
                onMouseLeave={() => { setIsHovered(false); setShowTooltip(false); }}
                style={{
                    width: '44px',
                    height: '44px',
                    background: highlight
                        ? `linear-gradient(135deg, ${COLORS.green}22 0%, ${COLORS.green}11 100%)`
                        : isHovered
                            ? `linear-gradient(135deg, ${COLORS.bgLighter} 0%, ${COLORS.bgLight} 100%)`
                            : 'rgba(255, 255, 255, 0.03)',
                    border: highlight
                        ? `1px solid ${COLORS.green}44`
                        : `1px solid ${isHovered ? COLORS.border : 'rgba(255, 255, 255, 0.06)'}`,
                    borderRadius: '12px',
                    color: highlight
                        ? COLORS.green
                        : isHovered ? COLORS.text : COLORS.textMuted,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                    boxShadow: isHovered
                        ? '0 8px 24px rgba(0, 0, 0, 0.2)'
                        : '0 2px 8px rgba(0, 0, 0, 0.1)',
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
                    marginBottom: '8px',
                    padding: '6px 12px',
                    background: COLORS.bgLighter,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '8px',
                    color: COLORS.text,
                    fontSize: '12px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 10,
                    animation: 'tooltipSlide 0.2s ease-out',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                }}>
                    {label}
                    {/* Tooltip arrow */}
                    <div style={{
                        position: 'absolute',
                        bottom: '-5px',
                        left: '50%',
                        transform: 'translateX(-50%) rotate(45deg)',
                        width: '8px',
                        height: '8px',
                        background: COLORS.bgLighter,
                        borderRight: `1px solid ${COLORS.border}`,
                        borderBottom: `1px solid ${COLORS.border}`,
                    }} />
                </div>
            )}
        </div>
    );
}

// ============================================
// USERNAME PROMPT MODAL (Enhanced)
// ============================================
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
                background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bg} 100%)`,
                borderRadius: '20px',
                border: `1px solid ${COLORS.border}`,
                padding: '36px',
                maxWidth: '400px',
                width: '100%',
                textAlign: 'center',
                animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: `0 24px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset`
            }}>
                <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${COLORS.gold}33 0%, ${COLORS.orange}22 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    boxShadow: `0 0 30px ${COLORS.gold}33`,
                    animation: 'none',
                }}>
                    <PartyPopper size={32} color={COLORS.gold} />
                </div>

                <h3 style={{
                    color: COLORS.text,
                    margin: '0 0 12px',
                    fontSize: '22px',
                    fontWeight: '700',
                    letterSpacing: '-0.5px',
                }}>
                    Welcome to the Wheel!
                </h3>

                <p style={{
                    color: COLORS.textMuted,
                    margin: '0 0 28px',
                    fontSize: '14px',
                    lineHeight: '1.6'
                }}>
                    Set a username to appear on the <strong style={{ color: COLORS.gold }}>leaderboard</strong> and
                    the <strong style={{ color: COLORS.purple }}>activity feed</strong> when you pull rare items!
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                        onClick={onSetUsername}
                        style={{
                            padding: '16px 28px',
                            background: `linear-gradient(135deg, ${COLORS.accent} 0%, #4752C4 100%)`,
                            border: 'none',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 4px 16px rgba(88, 101, 242, 0.3)',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(88, 101, 242, 0.4)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(88, 101, 242, 0.3)';
                        }}
                    >
                        <User size={18} />
                        Set Username
                    </button>

                    <button
                        onClick={onDismiss}
                        style={{
                            padding: '14px 24px',
                            background: 'transparent',
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '12px',
                            color: COLORS.textMuted,
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = COLORS.textMuted;
                            e.currentTarget.style.color = COLORS.text;
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = COLORS.border;
                            e.currentTarget.style.color = COLORS.textMuted;
                        }}
                    >
                        Maybe Later
                    </button>
                </div>

                <p style={{
                    color: COLORS.textMuted,
                    margin: '20px 0 0',
                    fontSize: '12px',
                    opacity: 0.7,
                }}>
                    You can always set your username later in profile settings
                </p>
            </div>
        </div>
    );
}

// ============================================
// MAIN WHEEL PAGE COMPONENT
// ============================================
function WheelOfFortunePage({ onBack }) {
    const { user, loading: authLoading, login, logout } = useAuth();
    const { kotwWinner } = useActivity();
    const [allItems, setAllItems] = useState([]);
    const [dynamicItems, setDynamicItems] = useState([]);
    const [collection, setCollection] = useState({});
    const [collectionDetails, setCollectionDetails] = useState({});
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState({ totalSpins: 0, mythicCount: 0, legendaryCount: 0, rareCount: 0, eventTriggers: 0, totalDuplicates: 0 });
    const [kotwLuckySpins, setKotwLuckySpins] = useState(0); // KOTW winner lucky spins
    const kotwLuckySpinsRef = useRef(0); // Ref for immediate access (bypasses React batching)
    const [loading, setLoading] = useState(true);

    const [showUsernameModal, setShowUsernameModal] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showCollection, setShowCollection] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showAchievements, setShowAchievements] = useState(false);
    const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);

    // Notification state
    const [showNotifications, setShowNotifications] = useState(false);
    const [showSoundSettings, setShowSoundSettings] = useState(false);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

    // Mobile activity feed modal state
    const [showMobileActivity, setShowMobileActivity] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect when current user wins KOTW and update lucky spins immediately
    // Use a ref to track if we've already processed this winner event
    const processedKotwWinnerRef = useRef(null);
    useEffect(() => {
        if (kotwWinner?.winner && user?.id && kotwWinner.winner.userId === user.id) {
            // Only process if this is a new winner event (different eventId or timestamp)
            const winnerKey = `${kotwWinner.eventId}-${kotwWinner.winner.userId}`;
            if (processedKotwWinnerRef.current !== winnerKey) {
                processedKotwWinnerRef.current = winnerKey;
                const spinsAwarded = kotwWinner.winner.luckySpinsAwarded || 0;
                console.log('[WheelPage] Current user won KOTW! Awarding', spinsAwarded, 'lucky spins');
                // Update ref IMMEDIATELY (bypasses React batching)
                kotwLuckySpinsRef.current = spinsAwarded;
                // Also update state for re-render
                setKotwLuckySpins(spinsAwarded);
            }
        }
    }, [kotwWinner, user?.id]);

    // Check for mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1400);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Fetch items and user data
    async function fetchItems() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/items`);
            const data = await res.json();
            setAllItems(data.items || []);
            setDynamicItems(data.dynamicItems || []);
        } catch (err) {
            console.error('Failed to fetch items:', err);
        }
    }

    async function fetchCollection() {
        if (!user) return;
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
            // Set KOTW lucky spins from collection response
            const serverKotwSpins = data.kotwLuckySpins || 0;
            kotwLuckySpinsRef.current = serverKotwSpins;
            setKotwLuckySpins(serverKotwSpins);
        } catch (err) {
            console.error('Failed to fetch collection:', err);
        }
    }

    async function fetchHistory() {
        if (!user) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/history?limit=50`, { credentials: 'include' });
            const data = await res.json();
            setHistory(data.history || []);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    }

    async function fetchUnreadCount() {
        if (!user) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, { credentials: 'include' });
            const data = await res.json();
            setUnreadNotificationCount(data.count || 0);
        } catch (err) {
            console.error('Failed to fetch unread count:', err);
        }
    }

    useEffect(() => {
        fetchItems().then(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (user) {
            fetchCollection();
            fetchHistory();
            fetchUnreadCount();
        }
    }, [user]);

    // Handler to update KOTW lucky spins (updates both ref and state)
    const handleKotwLuckySpinsUpdate = useCallback((newCount) => {
        kotwLuckySpinsRef.current = newCount;
        setKotwLuckySpins(newCount);
    }, []);

    const handleSpinComplete = useCallback((spinResult) => {
        if (!spinResult?.result) return;
        const { result } = spinResult;

        // Update collection
        setCollection(prev => ({
            ...prev,
            [result.texture]: (prev[result.texture] || 0) + 1
        }));

        // Update stats
        if (result.type === 'mythic' || result.type === 'insane') {
            setStats(prev => ({ ...prev, totalSpins: prev.totalSpins + 1, mythicCount: prev.mythicCount + 1 }));
        } else if (result.type === 'legendary') {
            setStats(prev => ({ ...prev, totalSpins: prev.totalSpins + 1, legendaryCount: prev.legendaryCount + 1 }));
        } else if (result.type === 'rare') {
            setStats(prev => ({ ...prev, totalSpins: prev.totalSpins + 1, rareCount: prev.rareCount + 1 }));
        } else if (result.type === 'event') {
            setStats(prev => ({ ...prev, totalSpins: prev.totalSpins + 1, eventTriggers: prev.eventTriggers + 1 }));
        } else {
            setStats(prev => ({ ...prev, totalSpins: prev.totalSpins + 1 }));
        }

        // Update history
        setHistory(prev => [{
            item_texture: result.texture,
            item_name: result.name,
            item_type: result.type,
            spun_at: new Date().toISOString()
        }, ...prev.slice(0, 99)]);

        // Prompt user to set a username if they haven't
        if (user && !user.customUsername) {
            const dismissed = localStorage.getItem('fib_username_prompt_dismissed');
            if (!dismissed) {
                setTimeout(() => {
                    setShowUsernamePrompt(true);
                }, 1500);
            }
        }
    }, [user]);

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
        return <CosmicLoader />;
    }

    return (
        <div style={{
            height: '100vh',
            background: COLORS.bg,
            color: COLORS.text,
            padding: '0',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            position: 'relative',
            overflow: 'hidden',
            boxSizing: 'border-box',
        }}>
            <AnimationStyles />
            <CanvasCosmicBackground />

            {/* Back Button - Fixed position in corner */}
            <button
                onClick={(e) => {
                    e.preventDefault();
                    if (onBack) {
                        onBack();
                    } else {
                        window.location.href = '/';
                    }
                }}
                style={{
                    position: 'fixed',
                    top: '20px',
                    left: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: COLORS.textMuted,
                    textDecoration: 'none',
                    fontSize: '14px',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 100,
                    background: 'rgba(20, 20, 25, 0.8)',
                    border: `1px solid ${COLORS.border}`,
                    cursor: 'pointer',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.color = COLORS.text;
                    e.currentTarget.style.background = `rgba(30, 30, 35, 0.95)`;
                    e.currentTarget.style.borderColor = COLORS.gold + '50';
                    e.currentTarget.style.transform = 'translateX(-2px)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.color = COLORS.textMuted;
                    e.currentTarget.style.background = 'rgba(20, 20, 25, 0.8)';
                    e.currentTarget.style.borderColor = COLORS.border;
                    e.currentTarget.style.transform = 'translateX(0)';
                }}
            >
                <ArrowLeft size={18} />
                <span>Back</span>
            </button>

            {/* Main layout with sidebars */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '40px',
                padding: '20px',
                paddingBottom: '10px',
                height: '100vh',
                boxSizing: 'border-box',
                position: 'relative',
                zIndex: 1,
            }}>
                {/* Left Sidebar - Activity Feed */}
                <div style={{
                    display: 'none',
                    flexShrink: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
                     className="sidebar-left"
                >
                    {user && <ActivityFeedSidebar />}
                </div>

                {/* Center Content */}
                <div style={{
                    maxWidth: '900px',
                    width: '100%',
                    position: 'relative',
                    zIndex: 1,
                }}>
                    {/* Header */}
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '16px',
                        paddingTop: '8px',
                        animation: 'sectionFadeIn 0.6s ease-out',
                    }}>
                        {/* Main Title */}
                        <h1 style={{
                            margin: '0 0 8px 0',
                            fontSize: '52px',
                            fontWeight: '800',
                            backgroundImage: `linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.orange} 40%, ${COLORS.gold} 80%, #fff 100%)`,
                            backgroundSize: '300% auto',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            color: 'transparent',
                            letterSpacing: '-2px',
                            animation: 'none',
                            lineHeight: 1.1,
                        }}>
                            Wheel of Fortune
                        </h1>

                        {/* Decorative divider */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            margin: '10px 0',
                        }}>
                            <div style={{
                                width: '60px',
                                height: '1px',
                                backgroundImage: `linear-gradient(90deg, transparent, ${COLORS.gold}66)`,
                                animation: 'lineDrawIn 0.8s ease-out 0.2s both',
                            }} />
                            <Sparkles size={16} style={{ color: COLORS.gold, opacity: 0.7 }} />
                            <div style={{
                                width: '60px',
                                height: '1px',
                                backgroundImage: `linear-gradient(90deg, ${COLORS.gold}66, transparent)`,
                                animation: 'lineDrawIn 0.8s ease-out 0.2s both',
                            }} />
                        </div>

                        {/* Subtitle */}
                        <p style={{
                            margin: 0,
                            color: COLORS.textMuted,
                            fontSize: '15px',
                            letterSpacing: '0.5px',
                            animation: 'sectionFadeIn 0.6s ease-out 0.1s both',
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
                            marginBottom: '24px',
                            flexWrap: 'wrap',
                            animation: 'sectionFadeIn 0.6s ease-out 0.15s both',
                        }}>
                            <button onClick={login} style={{
                                padding: '14px 28px',
                                background: 'linear-gradient(135deg, #5865F2, #4752C4)',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '15px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '10px',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: '0 4px 16px rgba(88, 101, 242, 0.3)'
                            }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(88, 101, 242, 0.4)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(88, 101, 242, 0.3)';
                                    }}
                            >
                                <svg width="20" height="20" viewBox="0 0 71 55" fill="currentColor">
                                    <path d="M60.1 4.9C55.6 2.8 50.7 1.3 45.7.4c-.1 0-.2 0-.2.1-.6 1.1-1.3 2.6-1.8 3.7-5.5-.8-10.9-.8-16.3 0-.5-1.2-1.2-2.6-1.8-3.7 0-.1-.1-.1-.2-.1-5 .9-9.9 2.4-14.4 4.5 0 0 0 0-.1.1C1.6 18.7-.9 32.1.3 45.4c0 .1 0 .1.1.2 6.1 4.5 12 7.2 17.7 9 .1 0 .2 0 .3-.1 1.4-1.9 2.6-3.8 3.6-5.9.1-.1 0-.3-.1-.3-2-.8-3.8-1.7-5.6-2.7-.1-.1-.1-.3 0-.4.4-.3.8-.6 1.1-.9.1-.1.2-.1.2 0 11.6 5.3 24.2 5.3 35.7 0 .1 0 .2 0 .2.1.4.3.7.6 1.1.9.1.1.1.3 0 .4-1.8 1-3.6 1.9-5.6 2.7-.1 0-.2.2-.1.3 1.1 2.1 2.3 4 3.6 5.9.1.1.2.1.3.1 5.8-1.8 11.7-4.5 17.8-9 0 0 .1-.1.1-.2 1.5-15.3-2.5-28.6-10.5-40.4 0 0 0-.1-.1-.1zM23.7 37.3c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.4 3.2 6.4 7.2s-2.8 7.2-6.4 7.2zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.2 6.4 7.2s-2.8 7.2-6.4 7.2z"/>
                                </svg>
                                Login with Discord
                            </button>
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '24px',
                            animation: 'sectionFadeIn 0.6s ease-out 0.15s both',
                        }}>
                            {/* Extended user pill with all controls */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                padding: '6px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '32px',
                                border: `1px solid ${COLORS.border}`,
                                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
                            }}>
                                {/* Clickable avatar + name section */}
                                <button
                                    onClick={() => setShowProfile(true)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '8px 16px 8px 8px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '26px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <img
                                        src={getDiscordAvatarUrl()}
                                        alt="Avatar"
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            background: COLORS.bgLighter,
                                            border: `2px solid ${COLORS.border}`,
                                        }}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                        }}
                                    />
                                    <span style={{ color: COLORS.text, fontSize: '15px', fontWeight: '600' }}>
                                        {user.customUsername || 'Player'}
                                    </span>
                                    {user.usernameApproved && (
                                        <Check size={16} color={COLORS.green} />
                                    )}
                                    {user.customUsername && !user.usernameApproved && (
                                        <Clock size={16} color={COLORS.gold} />
                                    )}
                                </button>

                                {/* Divider */}
                                <div style={{ width: '1px', height: '28px', background: COLORS.border, opacity: 0.5 }} />

                                {/* Edit button */}
                                <button
                                    onClick={() => setShowUsernameModal(true)}
                                    style={{
                                        padding: '10px',
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
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                        e.currentTarget.style.color = COLORS.accent;
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = COLORS.textMuted;
                                    }}
                                    title="Edit Name"
                                >
                                    <Edit3 size={18} />
                                </button>

                                {/* Admin button */}
                                {user.isAdmin && (
                                    <button
                                        onClick={() => setShowAdmin(true)}
                                        style={{
                                            padding: '10px',
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
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                            e.currentTarget.style.color = COLORS.accent;
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = COLORS.textMuted;
                                        }}
                                        title="Admin Panel"
                                    >
                                        <Settings size={18} />
                                    </button>
                                )}

                                {/* Sound settings button */}
                                <SoundButton onClick={() => setShowSoundSettings(true)} />

                                {/* Notification bell */}
                                <button
                                    onClick={() => setShowNotifications(true)}
                                    style={{
                                        padding: '10px',
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
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                        e.currentTarget.style.color = COLORS.accent;
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = unreadNotificationCount > 0 ? COLORS.gold : COLORS.textMuted;
                                    }}
                                    title="Notifications"
                                >
                                    <Bell size={18} />
                                    {unreadNotificationCount > 0 && (
                                        <span style={{
                                            position: 'absolute',
                                            top: '4px',
                                            right: '4px',
                                            background: COLORS.red,
                                            color: '#fff',
                                            fontSize: '10px',
                                            fontWeight: '700',
                                            borderRadius: '50%',
                                            minWidth: '16px',
                                            height: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '0 4px',
                                            boxShadow: `0 0 8px ${COLORS.red}88`,
                                        }}>
                                            {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                                        </span>
                                    )}
                                </button>

                                {/* Logout button */}
                                <button
                                    onClick={logout}
                                    style={{
                                        padding: '10px',
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
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Wheel - Floating without container */}
                    <div style={{
                        marginBottom: '16px',
                        minHeight: '420px',
                    }}>
                        <WheelSpinner
                            allItems={allItems}
                            collection={collection}
                            onSpinComplete={handleSpinComplete}
                            user={user}
                            dynamicItems={dynamicItems}
                            wheelSize={180}
                            kotwLuckySpins={kotwLuckySpins}
                            kotwLuckySpinsRef={kotwLuckySpinsRef}
                            onKotwLuckySpinsUpdate={handleKotwLuckySpinsUpdate}
                        />
                    </div>

                    {/* Navigation buttons */}
                    {user && (
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            justifyContent: 'center',
                            marginBottom: '16px',
                            padding: '10px 14px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: '16px',
                            width: 'fit-content',
                            margin: '0 auto 16px',
                            flexWrap: 'wrap',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                            animation: 'sectionFadeIn 0.6s ease-out 0.4s both',
                        }}>
                            <NavButton onClick={() => setShowCollection(true)} icon={<BookOpen size={20} />} label="Collection" />
                            <NavButton onClick={() => setShowHistory(true)} icon={<ScrollText size={20} />} label="History" />
                            <NavButton onClick={() => setShowLeaderboard(true)} icon={<Trophy size={20} />} label="Leaderboard" />
                            <NavButton onClick={() => setShowAchievements(true)} icon={<Award size={20} />} label="Achievements" />
                            {/* Mobile-only activity button */}
                            {isMobile && (
                                <NavButton
                                    onClick={() => setShowMobileActivity(true)}
                                    icon={<Activity size={20} />}
                                    label="Live"
                                    highlight={true}
                                />
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    <div style={{
                        marginTop: '24px',
                        paddingTop: '16px',
                        borderTop: `1px solid ${COLORS.border}33`,
                        textAlign: 'center',
                        animation: 'sectionFadeIn 0.6s ease-out 0.5s both',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            marginBottom: '8px',
                        }}>
                            <Diamond size={14} style={{ color: COLORS.gold, opacity: 0.6 }} />
                            <span style={{
                                fontSize: '13px',
                                color: COLORS.textMuted,
                                letterSpacing: '0.5px',
                            }}>
                                FIB Wheel of Fortune
                            </span>
                            <Diamond size={14} style={{ color: COLORS.gold, opacity: 0.6 }} />
                        </div>
                        <p style={{
                            margin: 0,
                            fontSize: '11px',
                            color: `${COLORS.textMuted}88`,
                            letterSpacing: '0.3px',
                        }}>
                            Collect them all â€¢ Good luck spinning!
                        </p>
                    </div>
                </div>
                {/* End Center Content */}

                {/* Right Sidebar - Leaderboard */}
                <div style={{
                    display: 'none',
                    flexShrink: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
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
                        display: flex !important;
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

            {/* Live Activity Toast */}
            <LiveActivityToast />

            {/* Insane Item Celebration */}
            <MythicCelebration currentUserId={user?.id} />

            {/* Recursion Overlay */}
            <RecursionOverlay currentUserId={user?.id} />

            {/* Gold Rush Banner */}
            <GoldRushBanner isMobile={isMobile} isAdmin={user?.isAdmin} />

            {/* King of the Wheel Banner */}
            <KingOfWheelBanner isMobile={isMobile} isAdmin={user?.isAdmin} currentUserId={user?.id} />
            <EventSelectionWheel isMobile={isMobile} isAdmin={user?.isAdmin} />

            {/* Notification Center */}
            {showNotifications && (
                <NotificationCenter
                    isOpen={showNotifications}
                    onClose={() => {
                        setShowNotifications(false);
                        fetch(`${API_BASE_URL}/api/notifications/unread-count`, { credentials: 'include' })
                            .then(res => res.json())
                            .then(data => setUnreadNotificationCount(data.count || 0))
                            .catch(() => {});
                    }}
                />
            )}

            {/* Sound Settings Modal */}
            {showSoundSettings && (
                <SoundSettingsPanel onClose={() => setShowSoundSettings(false)} />
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
                                top: '-14px',
                                right: '-14px',
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: COLORS.bgLight,
                                border: `1px solid ${COLORS.border}`,
                                color: COLORS.text,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1,
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                            }}
                        >
                            <X size={18} />
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

export default function WheelOfFortune({ onBack }) {
    return (
        <AuthProvider>
            <ActivityProvider>
                <SoundProvider>
                    <WheelOfFortunePage onBack={onBack || (() => window.location.hash = '')} />
                </SoundProvider>
            </ActivityProvider>
        </AuthProvider>
    );
}