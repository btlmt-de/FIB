import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { COLORS, API_BASE_URL, TEAM_MEMBERS, RARE_MEMBERS } from '../../config/constants';
import { useAuth, AuthProvider } from '../../context/AuthContext';
import { ActivityProvider } from '../../context/ActivityContext';
import { SoundProvider } from '../../context/SoundContext.jsx';
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
import { SoundButton, SoundSettingsPanel } from './SoundSettings';
import {
    User, Edit3, LogOut, Upload, Settings,
    BookOpen, ScrollText, Trophy, Check, Clock,
    Sparkles, Star, Diamond, Zap, Award, Activity, PartyPopper,
    ArrowLeft, Home, Bell, X
} from 'lucide-react';

// ============================================
// COSMIC BACKGROUND COMPONENT
// ============================================
const CosmicBackground = () => {
    // Generate static positions for stars and orbs
    const stars = useMemo(() =>
        Array.from({ length: 50 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            top: Math.random() * 100,
            size: Math.random() * 2 + 1,
            delay: Math.random() * 5,
            duration: Math.random() * 3 + 2
        })), []
    );

    const orbs = useMemo(() => [
        { id: 1, color: COLORS.gold, size: 300, left: '10%', top: '20%', delay: 0 },
        { id: 2, color: COLORS.purple, size: 250, left: '80%', top: '60%', delay: 2 },
        { id: 3, color: COLORS.aqua, size: 200, left: '60%', top: '10%', delay: 4 },
        { id: 4, color: COLORS.orange, size: 180, left: '20%', top: '70%', delay: 1 },
    ], []);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 0
        }}>
            {/* Base gradient */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: `
                    radial-gradient(ellipse at 20% 20%, ${COLORS.purple}15 0%, transparent 50%),
                    radial-gradient(ellipse at 80% 80%, ${COLORS.gold}10 0%, transparent 50%),
                    radial-gradient(ellipse at 50% 50%, ${COLORS.bgLight} 0%, ${COLORS.bg} 100%)
                `,
            }} />

            {/* Animated mesh gradient overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `
                    radial-gradient(circle at 30% 30%, ${COLORS.aqua}08 0%, transparent 40%),
                    radial-gradient(circle at 70% 70%, ${COLORS.purple}08 0%, transparent 40%)
                `,
                backgroundSize: '200% 200%',
                animation: 'meshGradient 20s ease infinite',
            }} />

            {/* Floating ambient orbs */}
            {orbs.map(orb => (
                <div
                    key={orb.id}
                    style={{
                        position: 'absolute',
                        left: orb.left,
                        top: orb.top,
                        width: orb.size,
                        height: orb.size,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${orb.color}20 0%, ${orb.color}05 40%, transparent 70%)`,
                        filter: 'blur(40px)',
                        animation: `ambientFloat ${15 + orb.delay}s ease-in-out infinite`,
                        animationDelay: `${orb.delay}s`,
                    }}
                />
            ))}

            {/* Star field */}
            {stars.map(star => (
                <div
                    key={star.id}
                    style={{
                        position: 'absolute',
                        left: `${star.left}%`,
                        top: `${star.top}%`,
                        width: star.size,
                        height: star.size,
                        borderRadius: '50%',
                        background: '#ffffff',
                        boxShadow: `0 0 ${star.size * 2}px ${star.size}px rgba(255,255,255,0.3)`,
                        animation: `starTwinkle ${star.duration}s ease-in-out infinite`,
                        animationDelay: `${star.delay}s`,
                    }}
                />
            ))}

            {/* Subtle noise texture overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.03,
                background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }} />

            {/* Vignette */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
            }} />
        </div>
    );
};

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
        <CosmicBackground />
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
                animation: 'cosmicSpin 1s linear infinite',
            }} />
            {/* Inner ring */}
            <div style={{
                position: 'absolute',
                inset: '10px',
                border: `3px solid ${COLORS.border}`,
                borderTopColor: COLORS.purple,
                borderRadius: '50%',
                animation: 'cosmicSpin 0.8s linear infinite reverse',
            }} />
            {/* Core */}
            <div style={{
                position: 'absolute',
                inset: '20px',
                background: `radial-gradient(circle, ${COLORS.gold}44 0%, transparent 70%)`,
                borderRadius: '50%',
                animation: 'auraPulse 1.5s ease-in-out infinite',
            }} />
        </div>
        <div style={{
            color: COLORS.textMuted,
            fontSize: '14px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            animation: 'subtlePulse 2s ease-in-out infinite',
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
                    backdropFilter: 'blur(8px)',
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
            backdropFilter: 'blur(8px)',
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
                    animation: 'auraPulse 2s ease-in-out infinite',
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
    const [showSoundSettings, setShowSoundSettings] = useState(false);
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

                setHasLocalData(true);
                setLocalDataInfo({ totalItems, totalSpins, mythicCount, legendaryCount, rareCount });
            } catch (e) {
                console.error('Failed to parse local data:', e);
            }
        }
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

            // Check for import prompt if user has local data
            if (hasLocalData && localDataInfo) {
                const dismissedImport = localStorage.getItem('fib_import_dismissed');
                if (!dismissedImport) {
                    setShowImportPrompt(true);
                }
            }
        }
    }, [user, hasLocalData, localDataInfo]);

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
            <CosmicBackground />

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
                    backdropFilter: 'blur(8px)',
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
                <div style={{ maxWidth: '900px', width: '100%', position: 'relative', zIndex: 1 }}>
                    {/* Header */}
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '24px',
                        paddingTop: '16px',
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
                            animation: 'headerTextShimmer 8s linear infinite',
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
                            margin: '16px 0',
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
                            {hasLocalData && (
                                <span style={{
                                    color: COLORS.gold,
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    padding: '8px 16px',
                                    background: `${COLORS.gold}15`,
                                    borderRadius: '8px',
                                    border: `1px solid ${COLORS.gold}33`,
                                }}>
                                    ✨ Local data ready to import
                                </span>
                            )}
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
                                backdropFilter: 'blur(12px)',
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

                                {/* Import button (if has local data) */}
                                {hasLocalData && (
                                    <button
                                        onClick={() => setShowMigration(true)}
                                        style={{
                                            padding: '10px',
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
                                        <Upload size={18} />
                                    </button>
                                )}

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
                        minHeight: '460px',
                    }}>
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
                            backdropFilter: 'blur(8px)',
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
                        marginTop: '48px',
                        paddingTop: '24px',
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
                            Collect them all • Good luck spinning!
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

            {/* Live Activity Toast */}
            <LiveActivityToast />

            {/* Insane Item Celebration */}
            <MythicCelebration currentUserId={user?.id} />

            {/* Recursion Overlay */}
            <RecursionOverlay currentUserId={user?.id} />

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
                    backdropFilter: 'blur(8px)',
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