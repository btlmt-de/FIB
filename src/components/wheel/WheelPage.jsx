import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL, TEAM_MEMBERS, RARE_MEMBERS } from '../../config/constants';
import { COLORS, SPACE, Z } from './config/constants';
import { useAuth, AuthProvider } from '../../context/AuthContext';
import { ActivityProvider, useActivity } from '../../context/ActivityContext';
import { SoundProvider } from '../../context/SoundContext.jsx';
import { AnimationStyles } from './effects/AnimationStyles.jsx';
import { WheelSpinner } from './WheelSpinner';
import { UsernameModal } from './modals';
import { CollectionBook } from './features/CollectionBook.jsx';
import { SpinHistory } from './modals/SpinHistory.jsx';
import { AdminPanel } from './admin/AdminPanel.jsx';
import { Achievements } from './features/Achievements.jsx';
import { UserProfile } from './features/UserProfile.jsx';
import { LiveActivityToast } from './sidebars/LiveActivityToast.jsx';
import { PixiMythicCelebration as MythicCelebration } from './effects/PixiMythicCelebration.jsx';
import { RecursionOverlay } from './effects/RecursionOverlay.jsx';

/**
 * Which `stats` counter a spin result increments, by tier.
 *
 * The optimistic local update only has to agree with what /api/collection sends
 * back on the next refetch — these are the camelCase names that endpoint uses.
 * `event` is counted as a trigger rather than a collected item, because an event
 * result opens the bonus wheel instead of going into the collection. Commons are
 * absent on purpose: they advance totalSpins and nothing else.
 */
const COUNTER_FOR_TIER = {
    insane: 'insaneCount',
    mythic: 'mythicCount',
    legendary: 'legendaryCount',
    exotic: 'exoticCount',
    rare: 'rareCount',
    event: 'eventTriggers',
};
import GoldRushBanner from './effects/GoldRushBanner.jsx';
import KingOfWheelBanner from './effects/KingOfWheelBanner.jsx';
import FirstBloodBanner from './effects/FirstBloodBanner.jsx';
import CommunityGoalBanner from './effects/CommunityGoalBanner.jsx';
import MilestoneMeter from './effects/MilestoneMeter.jsx';
import EventSelectionWheel from './effects/EventSelectionWheel.jsx';
import { ActivityFeedSidebar } from './sidebars/ActivityFeedSidebar.jsx';
import { ActivityTicker } from './sidebars/ActivityTicker.jsx';
import { LeaderboardPill } from './sidebars/LeaderboardPill.jsx';
import { LeaderboardSidebar } from './sidebars/LeaderboardSidebar.jsx';
import { NotificationBell, NotificationCenter } from './modals/NotificationCenter.jsx';
import { LiveChat } from './features/LiveChat.jsx';
import { SoundButton, SoundSettingsPanel } from './modals/SoundSettings.jsx';
import { CanvasNocturneField } from './canvas/CanvasNocturneField.jsx';

import { TopbarIconButton, TopbarDivider, TopbarUserChip } from './topbar/TopbarControls.jsx';
import { prestigeStanding } from '../../utils/prestigeHelpers.js';
import { MobileTabBar } from './topbar/MobileTabBar.jsx';
import { MobileMoreSheet } from './topbar/MobileMoreSheet.jsx';
import { useWheelViewport } from './config/breakpoints.js';
import {
    User, Edit3, LogOut, Settings,
    BookOpen, ScrollText, Trophy, Check, Clock,
    Sparkles, Star, Diamond, Zap, Award, Activity, PartyPopper,
    ArrowLeft, Home, Bell, X, MoreHorizontal, Volume2
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
        <CanvasNocturneField />
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

// NavButton lived here — a 44px gradient tile that lifted and cast a shadow on
// hover. It is gone rather than adapted: it was the largest of the three icon
// vocabularies the topbar inherited, and everything it did is now
// `TopbarIconButton` in topbar/TopbarControls.jsx, which the user controls use
// too. See that file for why the lift went.

/**
 * Back out of the wheel.
 *
 * Keeps a visible container — it is the only control on the row that leaves the
 * page, so it earns the one border on the left-hand side. Its hover no longer
 * slides it 2px to the left: in the old layout it was a `position: fixed` button
 * floating on its own, where a nudge towards the arrow read as a nice touch. In a
 * row it just looks like the bar is drifting.
 */
function BackButton({ onBack }) {
    const [hovered, setHovered] = useState(false);

    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                if (onBack) {
                    onBack();
                } else {
                    window.location.href = '/';
                }
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: `${SPACE.sm}px`,
                height: '38px',
                padding: `0 ${SPACE.md}px`,
                fontSize: '14px',
                borderRadius: '10px',
                color: hovered ? COLORS.text : COLORS.textMuted,
                background: hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${hovered ? COLORS.border : 'rgba(255,255,255,0.08)'}`,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 0.18s ease, color 0.18s ease, border-color 0.18s ease',
            }}
        >
            <ArrowLeft size={17} />
            <span>Back</span>
        </button>
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
                // Ease-out-quint, not the overshoot curve this used to carry.
                //
                // DESIGN.md §8 grants overshoot easing to the spin control alone,
                // on the argument that a wheel overshoots and settles and the
                // button that starts it may borrow that. Nothing else on the
                // surface has that story, and this is the least likely candidate
                // for it: a modal that interrupts you to ask for a username, whose
                // 1.56 control point sent a 400px card past its resting position
                // and back. A dialog arriving should decelerate and stop.
                animation: 'slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
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
    const { kotwWinner, firstBloodWinner, communityGoalReward, communityGoalResult } = useActivity();
    const [allItems, setAllItems] = useState([]);
    const [dynamicItems, setDynamicItems] = useState([]);
    /*
     * The signed-in player's prestige state, for the collection panel's lens.
     * Re-read after every spin that lands in a run, so the panel's count tracks
     * the run rather than going stale until the next page load.
     */
    const [prestige, setPrestige] = useState(null);
    const [collection, setCollection] = useState({});
    const [collectionDetails, setCollectionDetails] = useState({});
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState({ totalSpins: 0, insaneCount: 0, mythicCount: 0, legendaryCount: 0, exoticCount: 0, rareCount: 0, eventTriggers: 0, totalDuplicates: 0 });
    const [kotwLuckySpins, setKotwLuckySpins] = useState(0); // KOTW winner lucky spins
    const kotwLuckySpinsRef = useRef(0); // Ref for immediate access (bypasses React batching)
    const [loading, setLoading] = useState(true);

    const [showUsernameModal, setShowUsernameModal] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showCollection, setShowCollection] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    // The bottom bar's link to the chat: a counter it bumps to open the panel,
    // and the chat's unread count mirrored back out for the tab's badge.
    const [chatOpenSignal, setChatOpenSignal] = useState(0);
    const [chatUnread, setChatUnread] = useState(0);
    const [showMore, setShowMore] = useState(false);
    const [showAchievements, setShowAchievements] = useState(false);
    const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);

    // Notification state
    const [showNotifications, setShowNotifications] = useState(false);
    const [showSoundSettings, setShowSoundSettings] = useState(false);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

    // Mobile activity feed modal state
    const [showMobileActivity, setShowMobileActivity] = useState(false);
    // The surface's only viewport question, answered in one place. See
    // config/breakpoints.js for what these two lines are and why there used to be
    // three of them disagreeing.
    const { isPhone: isMobile, hasFlanks } = useWheelViewport();

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
                const newTotal = kotwWinner.winner.luckySpinsTotal;
                console.log('[WheelPage] Current user won KOTW! Awarding', spinsAwarded, 'lucky spins');
                // Only ever apply the balance the server reports. Deriving it here - either
                // by assigning the award or by adding it to what we hold - gets it wrong
                // whenever the winner's in-flight spin response already carried the new
                // balance, or whenever they had spins left over from an earlier event.
                if (typeof newTotal === 'number') {
                    // Update ref IMMEDIATELY (bypasses React batching)
                    kotwLuckySpinsRef.current = newTotal;
                    // Also update state for re-render
                    setKotwLuckySpins(newTotal);
                }
            }
        }
    }, [kotwWinner, user?.id]);

    // Detect when current user wins First Blood and update lucky spins immediately
    // First Blood shares the same lucky spins pool as KOTW
    const processedFirstBloodWinnerRef = useRef(null);
    useEffect(() => {
        if (firstBloodWinner?.winner && user?.id && firstBloodWinner.winner.userId === user.id) {
            // Only process if this is a new winner event
            const winnerKey = `${firstBloodWinner.eventId}-${firstBloodWinner.winner.userId}`;
            if (processedFirstBloodWinnerRef.current !== winnerKey) {
                processedFirstBloodWinnerRef.current = winnerKey;
                const spinsAwarded = firstBloodWinner.winner.luckySpinsAwarded || 0;
                const newTotal = firstBloodWinner.winner.luckySpinsTotal;
                console.log('[WheelPage] Current user won First Blood! Awarding', spinsAwarded, 'lucky spins');
                // This used to add the award to the pool we already held (shared with KOTW),
                // which double-counted every First Blood win: the reward is granted inside
                // the winning spin's own request, so that spin's response had already
                // reported the post-award balance. Take the server's number instead.
                if (typeof newTotal === 'number') {
                    kotwLuckySpinsRef.current = newTotal;
                    setKotwLuckySpins(newTotal);
                }
            }
        }
    }, [firstBloodWinner, user?.id]);

    // Same for the Community Goal, which pays every participant rather than one winner.
    //
    // This was missing entirely, and its absence was visible: the balance stayed stale
    // until something else happened to refresh it, so the first a player heard of their
    // payout was their *next* spin coming back marked as a lucky spin with a count they
    // had never been shown. The reward broadcast carries the post-award balance for
    // exactly this, and nothing was reading it.
    //
    // Keyed on communityGoalResult, not on the reward. The reward lands the instant the
    // event ends, which is mid-spin as often as not; the result is the already-delayed
    // moment the banner flips to the summary that announces the payout. Updating the
    // counter then keeps the number and its explanation on screen together, and keeps the
    // event from tipping its hand over a wheel that is still turning. The server sends the
    // reward first, so it is always present by the time the result is applied.
    const processedCommunityGoalRewardRef = useRef(null);
    useEffect(() => {
        if (!communityGoalResult || !communityGoalReward || !user?.id) return;

        const newTotal = communityGoalReward.luckySpinsTotal;
        if (typeof newTotal !== 'number') return;

        // The reward is per-user and carries no event id, so the result's identity is what
        // distinguishes one payout from the next.
        const rewardKey = `${communityGoalResult.progress}-${communityGoalResult.participantCount}-${newTotal}`;
        if (processedCommunityGoalRewardRef.current === rewardKey) return;
        processedCommunityGoalRewardRef.current = rewardKey;

        console.log('[WheelPage] Community Goal paid out', communityGoalReward.luckySpinsAwarded, 'lucky spins');
        // The server's figure verbatim, for the reason given on the two handlers above.
        kotwLuckySpinsRef.current = newTotal;
        setKotwLuckySpins(newTotal);
    }, [communityGoalResult, communityGoalReward, user?.id]);


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
                insaneCount: data.insaneCount || 0,
                mythicCount: data.mythicCount || 0,
                legendaryCount: data.legendaryCount || 0,
                exoticCount: data.exoticCount || 0,
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

    const refreshPrestige = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/prestige`, { credentials: 'include' });
            if (res.ok) setPrestige(await res.json());
        } catch {
            // The panel simply keeps its main-collection lens without this.
        }
    }, [user]);

    useEffect(() => {
        let cancelled = false;
        if (!user) return undefined;
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/prestige`, { credentials: 'include' });
                if (res.ok && !cancelled) setPrestige(await res.json());
            } catch {
                // Non-fatal: no lens, same panel as before.
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    const handleSpinComplete = useCallback((spinResult) => {
        if (!spinResult?.result) return;
        const { result } = spinResult;

        /*
         * A recursion trigger is not a collected item, and the client used to
         * think it was.
         *
         * The server's spin transaction returns early for `isRecursion` — spins,
         * event triggers and the wheel-fortune counter, and no `upsertCollection`
         * — because recursion is a mode the pull *starts*, not an entry in the
         * book. This handler ran anyway and optimistically added the triggering
         * texture to the local map, so the collection counter went up by one for
         * an item the player never got, and came back down on the next reload
         * when the server's own map replaced the guess.
         *
         * Reported as "his counter increased despite not getting the item he
         * needed" and "on prestige it goes to 1560". It looked like a special-item
         * bug because recursion is triggered by pulling Wheel of Fortune, which is
         * an exotic.
         *
         * The bonus-event branch was already safe: `isEvent` never reaches this
         * handler at all. Guarding both is cheaper than relying on that.
         */
        if (spinResult.isRecursion || spinResult.isEvent) return;

        // Update collection
        setCollection(prev => ({
            ...prev,
            [result.texture]: (prev[result.texture] || 0) + 1
        }));

        // Update stats.
        //
        // One counter per tier, keyed off the result's own type. This used to fold
        // insane into mythicCount — so an insane pull optimistically bumped the
        // mythic figure until the next refetch corrected it — and had no branch at
        // all for exotic. COUNTER_FOR_TIER maps tier to the field it increments;
        // anything not in it (common) only advances totalSpins.
        const counterField = COUNTER_FOR_TIER[result.type];
        setStats(prev => ({
            ...prev,
            totalSpins: prev.totalSpins + 1,
            ...(counterField ? { [counterField]: (prev[counterField] || 0) + 1 } : null),
            /*
             * Duplicates were never counted here at all.
             *
             * The server has always got this right — `total_duplicates` is
             * `SUM(count) - COUNT(DISTINCT texture)` over the collection, so a
             * repeat pull moves it the moment it lands. This optimistic update
             * advanced `totalSpins` and the tier counter and simply left the
             * duplicate figure alone, so the collection board showed a stale
             * number until something refetched — and during a prestige run, where
             * EVERY pull is a main-collection duplicate by definition, it looked
             * like prestige pulls were not counting toward the main collection at
             * all. They were; the panel was just not saying so.
             *
             * Read from `spinResult.isNew`, which is the server's own verdict, and
             * not from the local map: deciding "was this new" a second time on the
             * client is how the two accounts drift apart in the first place.
             */
            ...(spinResult.isNew ? null : { totalDuplicates: (prev.totalDuplicates || 0) + 1 }),
        }));

        // A pull that landed in a run moves its count, and the panel is showing it.
        if (spinResult.prestige) refreshPrestige();

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
    }, [user, refreshPrestige]);

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
            // The HUD shell.
            //
            // This page is a task surface, not a document: you come to it to spin,
            // watch, and read the result. It was built as a centred column of
            // stacked sections inside `height: 100vh; overflow: hidden`, which is a
            // document's shape, and the mismatch is what made a bigger reel
            // impossible. In a stack the reel can only get wider by taking width
            // from the sidebars beside it, and only get taller by pushing the nav
            // and footer off the bottom of a page that cannot scroll to reach them.
            // Two attempts failed on exactly that.
            //
            // As a grid the reel is a row, and a row spanning `1 / -1` is full
            // width by construction — no 100vw, no negative margins, no measuring
            // the viewport, no card for it to burst out of.
            //
            // `100dvh`, not `100vh`: on mobile `100vh` is the height with the
            // address bar collapsed, so it is taller than what you can actually
            // see. On a surface that deliberately cannot scroll, that difference
            // is the nav row sitting below the fold with no way to reach it.
            //
            // The rows are: topbar, reel, stage (1fr), nav. Columns are the two
            // sidebars either side of the stage, collapsing to a single column
            // below 1400px. `minmax(0, 1fr)` rather than `1fr` on the centre
            // column — a bare `1fr` is `minmax(auto, 1fr)`, which refuses to
            // shrink below its content and would let a wide result push the grid
            // past the viewport.
            // Rows: topbar, live ticker, spacer, reel, stage, nav.
            //
            // The two flexible rows either side of the reel are what puts it in
            // the middle of the screen: whatever vertical slack the viewport has
            // is shared between them, so the reel sits near the centre line at any
            // height instead of riding in the upper third. The stage lives in the
            // lower flexible row and top-aligns inside it, so the result appears
            // directly under the reel rather than drifting to the bottom of the
            // page.
            //
            // This paragraph used to say the two rows were "equal" and split the
            // slack "evenly". They are not and it does not — see the 0.34fr note
            // below, which is the newer and correct account. Left corrected rather
            // than deleted because the symmetric version is the obvious thing to
            // reach for and the ratio underneath it looks arbitrary without this.
            //
            // One column now. Both sidebars have left this axis — the feed is the
            // ticker in row 2, the leaderboard is a pill in the topbar — which is
            // the whole reason the reel can be the full width of the screen and
            // still be the thing in the middle of it.
            height: '100dvh',
            display: 'grid',
            // 0.34fr above, 1fr below. Not symmetric on purpose: an even split
            // reads as centred but gives the empty gap the same height as the
            // stage, and the stage has the result panel and the spin CTA in it
            // while the gap has nothing. This ratio is tuned, not guessed — it is
            // what lands the band's midpoint on the viewport's midpoint while
            // leaving the stage enough for the idle block at its tallest.
            //
            // Sensitive to the rows above it: if the topbar or the ticker change
            // height, re-measure. The band's centre should land within a few px of
            // `innerHeight / 2`.
            // On a phone the whole surface is one flex column inside a single grid
            // cell (WheelSpinner's mobile wrapper spans rows 2–6), so the desktop
            // row ratios do not apply and the tuned 0.34fr gap would just be dead
            // space above a shaft that wants every pixel.
            // Phone: topbar, ticker, banner/meter slot, then the surface taking
            // everything left. The desktop template's 0.34fr breathing gap is
            // dropped — on a phone that is dead space above a shaft that wants
            // every pixel — and the two stage rows collapse into one, because the
            // phone renders band and stage as a single flex column.
            //
            // The row COUNT matters as much as the sizes: WheelSpinner's mobile
            // wrapper and the ticker and banners all place themselves explicitly,
            // and a template with fewer rows than they ask for silently creates
            // implicit ones at the end. A two-row version of this put the
            // milestone meter underneath the spin card.
            // ── The stage's floor (desktop) ──────────────────────────────────
            //
            // `minmax(350px, 1fr)`, not `minmax(0, 1fr)`. The 0.34fr gap above
            // the band is a *flexible* track and the stage was the only one with
            // a zero minimum, so on a short viewport the gap kept its share and
            // the stage absorbed the entire shortfall. Measured at 1080×820:
            // rows came out 56 / 68 / 109.6 / 264 / 322 against an idle block of
            // 350, so the spin card's keyboard hint sat past the bottom edge.
            //
            // The floor is the measured block, and it only ever binds when the
            // viewport is genuinely too short. The tuned ratio is untouched
            // wherever it fits: at 1080 tall the free space is 692, the stage
            // takes 692/1.34 = 516 (well over the floor) and the gap keeps its
            // 176 — exactly what the ratio gave before. At 820 the stage takes
            // its 350 and the gap yields the difference, which is the right
            // order: the gap is empty space and the stage has the control in it.
            //
            // Below ~790px tall the floor cannot be met either and the stage
            // scrolls, which it is already set up to do.
            gridTemplateRows: isMobile
                ? 'auto auto auto minmax(0, 1fr)'
                : 'auto auto 0.34fr auto minmax(350px, 1fr)',
            gridTemplateColumns: 'minmax(0, 1fr)',
            // Room for the fixed bottom bar, plus the home indicator under it. The
            // bar is `position: fixed` so it reserves no layout space of its own,
            // and without this the shaft's last row would sit behind it.
            ...(isMobile
                ? { paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }
                : null),
            background: COLORS.bg,
            color: COLORS.text,
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            position: 'relative',
            overflow: 'hidden',
            boxSizing: 'border-box',
            // KNOWN ISSUE, unchanged by this work: the four top banners (Gold
            // Rush, KOTW, First Blood, Community Goal) are `position: fixed;
            // top: 0` and reserve no layout space, so while one is showing it
            // covers the topbar. They also stack on each other — two firing at
            // once overlap, and z-index 9999 simply wins over 100.
            //
            // A reserved slot was drafted here (`padding-top: var(--fib-banner-h)`)
            // and removed again: nothing published the variable, and each of the
            // four banners decides its own visibility internally, so making it real
            // means touching all four. Left as a follow-up rather than shipped as a
            // variable that is always 0px and looks like it works.
        }}>
            <AnimationStyles />
            <CanvasNocturneField />

            {/* Topbar — row 1.

                Replaces a 52px gradient-filled `Wheel of Fortune` headline, a
                decorative divider, a subtitle, a floating user chip and a
                fixed-position Back button, which between them cost about 210px of
                vertical space at the top of a surface that had none to spare. They
                also lost the page its own squint test: blurred, the gold headline
                and the gold wheel sprite ten pixels below it read as one mass with
                the type on top, so the largest thing on the page was its caption
                rather than the wheel.

                What is left says the same things in one 56px row: where you are,
                who you are, and how to leave. The headline's `background-clip:
                text` gradient went with it — decorative, encoding nothing the
                weight and colour do not, and a flat ban in the design system.

                The row's bottom border is a soft rule, the one frame the topbar
                keeps. THE NOCTURNE (WheelSpinner.jsx) removed it and let the
                rooftop silhouette (`CityCrown`) end the row instead; the owner's
                review on 2026-08-18 reversed that — the crown is gone and the
                rule is back. The Nocturne's borderless world starts below this
                row. */}
            <header style={{
                gridRow: 1,
                gridColumn: '1 / -1',
                display: 'flex',
                alignItems: 'center',
                borderBottom: `1px solid ${COLORS.border}44`,
                // No `space-between`: the wordmark's `margin-right: auto` is what
                // splits the row, and with both in play the leftover width was
                // being distributed twice — the gap between Back and the wordmark
                // grew with the viewport instead of staying a gap.
                gap: `${SPACE.md}px`,
                padding: `${SPACE.xs}px ${SPACE.lg}px`,
                // The row's height is the tallest control plus its padding. Stated
                // so the 56px the comment above claims is actually true and does
                // not drift the moment a control changes size.
                minHeight: '56px',
                boxSizing: 'border-box',
                position: 'relative',
                zIndex: Z.content,
            }}>
                {/* Leave. The one control on the row that is not about the wheel,
                    so it is the one control that keeps a visible container — and it
                    no longer slides 2px left on hover, which in a row of buttons
                    that hold still read as the layout twitching. */}
                <BackButton onBack={onBack} />

                {/* Wordmark */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: `${SPACE.sm}px`,
                    minWidth: 0,
                    marginRight: 'auto',
                }}>
                    <Sparkles size={16} style={{ color: COLORS.gold, opacity: 0.8, flexShrink: 0 }} />
                    <h1 style={{
                        margin: 0,
                        fontSize: '17px',
                        fontWeight: '700',
                        color: COLORS.gold,
                        letterSpacing: '0.01em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                        Wheel of Fortune
                    </h1>
                </div>

                {/* The right-hand cluster: everything that is about you.

                    The redesign moved three things up here — the nav grid that
                    used to float under the stage, the 380px leaderboard board, and
                    the user chip — and for a while that was literally all it did.
                    They landed in a row, each still wearing the container and the
                    button sizes it had in its old home, so the right end of the bar
                    read as one undifferentiated run of a dozen controls in three
                    styles rather than three groups of related ones.

                    What makes it legible is not more spacing, it is stated
                    structure: one flex row, one button vocabulary
                    (`TopbarIconButton`), and hairline dividers marking the three
                    questions the cluster answers, in order —

                        where can I go  |  where do I stand  |  who am I

                    Tooltips hang below; there is nothing above them here. */}
                {!user ? (
                    <button onClick={login} style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #5865F2, #4752C4)',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: `${SPACE.sm}px`,
                        flexShrink: 0,
                        transition: 'filter 0.2s ease',
                    }}
                        // Was 14px/28px with a lift and a coloured 24px shadow —
                        // sized for the centre of an empty page, which is where it
                        // used to sit. In a 56px bar it was taller than the bar's
                        // content box and the only thing on the row that moved.
                        onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.12)'; }}
                        onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
                    >
                        <svg width="18" height="18" viewBox="0 0 71 55" fill="currentColor">
                            <path d="M60.1 4.9C55.6 2.8 50.7 1.3 45.7.4c-.1 0-.2 0-.2.1-.6 1.1-1.3 2.6-1.8 3.7-5.5-.8-10.9-.8-16.3 0-.5-1.2-1.2-2.6-1.8-3.7 0-.1-.1-.1-.2-.1-5 .9-9.9 2.4-14.4 4.5 0 0 0 0-.1.1C1.6 18.7-.9 32.1.3 45.4c0 .1 0 .1.1.2 6.1 4.5 12 7.2 17.7 9 .1 0 .2 0 .3-.1 1.4-1.9 2.6-3.8 3.6-5.9.1-.1 0-.3-.1-.3-2-.8-3.8-1.7-5.6-2.7-.1-.1-.1-.3 0-.4.4-.3.8-.6 1.1-.9.1-.1.2-.1.2 0 11.6 5.3 24.2 5.3 35.7 0 .1 0 .2 0 .2.1.4.3.7.6 1.1.9.1.1.1.3 0 .4-1.8 1-3.6 1.9-5.6 2.7-.1 0-.2.2-.1.3 1.1 2.1 2.3 4 3.6 5.9.1.1.2.1.3.1 5.8-1.8 11.7-4.5 17.8-9 0 0 .1-.1.1-.2 1.5-15.3-2.5-28.6-10.5-40.4 0 0 0-.1-.1-.1zM23.7 37.3c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.4 3.2 6.4 7.2s-2.8 7.2-6.4 7.2zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.2 6.4 7.2s-2.8 7.2-6.4 7.2z"/>
                        </svg>
                        Login with Discord
                    </button>
                ) : (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        // 2px inside a group, a divider between groups. The old row
                        // used one 6px gap for everything, which spaced unrelated
                        // controls exactly as far apart as related ones.
                        gap: '2px',
                        flexShrink: 0,
                        minWidth: 0,
                    }}>
                        {/* ── Where can I go ───────────────────────────────────

                            Collection and the leaderboard moved into the stage
                            flanks, which show your actual progress and the current
                            top five rather than a 19px glyph, and which are on
                            screen in every state. Keeping them here as well would
                            have been the duplication the Trophy button was deleted
                            for.

                            But only on desktop. The flanks need width beside a
                            centred stage and do not render on a phone, so on mobile
                            these are still the only way in and they stay. */}
                        {/* Collection left the topbar on a phone too. The bottom
                            bar carries it now, and two entry points to one view is
                            the duplication this row has already been trimmed for
                            twice. The desktop flanks still own it above 1200px. */}
                        {!isMobile && (
                            <TopbarIconButton
                                onClick={() => setShowHistory(true)}
                                icon={<ScrollText size={19} />}
                                label="History"
                            />
                        )}
                        {/* No Trophy button here.

                            The leaderboard pill one group to the right opens the
                            same modal and says more while doing it — your rank and
                            the current podium — so a second, blanker entry point to
                            the identical view was just a duplicate. It became one
                            when the standalone leaderboard was folded into the
                            pill; before that they were different destinations. */}
                        {!isMobile && (
                            <TopbarIconButton
                                onClick={() => setShowAchievements(true)}
                                icon={<Award size={19} />}
                                label="Achievements"
                            />
                        )}
                        {/* History, Achievements and Live activity are in the
                            overflow sheet on a phone — see MobileMoreSheet.jsx for
                            the three-way split and the count that forced it. */}

                        {/* ── Where do I stand ─────────────────────────────────

                            Mobile only, for the same reason as Collection above:
                            the right-hand stage flank carries the top five and your
                            rank on desktop, and two boards on one screen is what
                            this group has already been trimmed for twice. */}
                        {/* The leaderboard pill is gone from the phone as well —
                            the bottom bar's Board tab is the way in now, and the
                            pill was 150px of a 390px bar. */}

                        {!isMobile && <TopbarDivider />}

                        {/* ── Who am I ───────────────────────────────────────────

                            This group used to be a single bordered 32px-radius
                            capsule with six controls inside it, parked immediately
                            next to the leaderboard's 999px-radius capsule — two
                            pills of different roundness touching, which is what made
                            the end of the bar look assembled rather than designed.

                            The container is now only around the identity itself.
                            The actions next to it are plain topbar buttons like
                            every other button on the row, which is what they always
                            were behaviourally. */}
                        {/* The identity chip is desktop-only: the bottom bar's
                            "You" tab is the phone's profile entry, and the chip is
                            an avatar plus a name plus an approval badge — the
                            widest single thing on the row. */}
                        {!isMobile && (
                            <>
                                <TopbarUserChip
                                    avatarUrl={getDiscordAvatarUrl()}
                                    name={user.customUsername || 'Player'}
                                    approved={!!user.usernameApproved}
                                    pending={!!user.customUsername && !user.usernameApproved}
                                    // The state this page already holds for the
                                    // collection panel's lens, read through the
                                    // same helper every other surface uses.
                                    standing={prestigeStanding(prestige)}
                                    onClick={() => setShowProfile(true)}
                                />
                                <TopbarIconButton
                                    onClick={() => setShowUsernameModal(true)}
                                    icon={<Edit3 size={17} />}
                                    label="Edit name"
                                />
                                <SoundButton onClick={() => setShowSoundSettings(true)} />
                            </>
                        )}
                        <TopbarIconButton
                            onClick={() => setShowNotifications(true)}
                            icon={<Bell size={17} />}
                            label="Notifications"
                            tone={unreadNotificationCount > 0 ? 'attention' : 'default'}
                            badge={unreadNotificationCount > 0 ? (
                                <span style={{
                                    position: 'absolute',
                                    top: '3px',
                                    right: '3px',
                                    background: COLORS.red,
                                    color: '#fff',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    lineHeight: 1,
                                    borderRadius: '999px',
                                    minWidth: '15px',
                                    height: '15px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 4px',
                                    boxSizing: 'border-box',
                                }}>
                                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                                </span>
                            ) : null}
                        />
                        {user.isAdmin && !isMobile && (
                            <TopbarIconButton
                                onClick={() => setShowAdmin(true)}
                                icon={<Settings size={17} />}
                                label="Admin panel"
                            />
                        )}
                        {!isMobile && (
                            <TopbarIconButton
                                onClick={logout}
                                icon={<LogOut size={17} />}
                                label="Log out"
                                tone="danger"
                                align="end"
                            />
                        )}

                        {/* The phone's one overflow control. Everything the bar
                            cannot hold is one tap behind it, and nothing is
                            unreachable — which is what the row's right-hand end
                            actually was before, running off the screen edge. */}
                        {isMobile && (
                            <TopbarIconButton
                                onClick={() => setShowMore(true)}
                                icon={<MoreHorizontal size={19} />}
                                label="More"
                                align="end"
                            />
                        )}
                    </div>
                )}

            </header>
            {/* End topbar */}

            {/* Rows 2 and 3 are emitted by WheelSpinner itself.

                Its root is `display: contents` on desktop, so its children become
                direct children of this grid and can be placed in different rows —
                the reel spanning the full width, the stage sitting between the two
                sidebars. That is what lets the reel be a genuine grid row without
                lifting the spin state out of the component: nothing crosses a
                component boundary, so the rAF offset refs and the 60fps
                spinProgress tick stay exactly where they were. */}
            <WheelSpinner
                allItems={allItems}
                collection={collection}
                prestige={prestige}
                onSpinComplete={handleSpinComplete}
                user={user}
                dynamicItems={dynamicItems}
                wheelSize={150}
                kotwLuckySpins={kotwLuckySpins}
                kotwLuckySpinsRef={kotwLuckySpinsRef}
                onKotwLuckySpinsUpdate={handleKotwLuckySpinsUpdate}
                // Both viewport answers, passed down and actually read. `isMobile`
                // was already being passed here and WheelSpinner's signature never
                // destructured it, so the page and the reel disagreed by 800px.
                isMobile={isMobile}
                hasFlanks={hasFlanks}
                stageColumn={1}
                // The stage flanks are the page's entry points to these two views
                // now — see StageFlanks.jsx. The topbar's own Collection icon and
                // leaderboard pill were removed rather than kept alongside them.
                // Below 1200px the flanks are gone and the phone's bottom bar
                // carries the same two destinations.
                onOpenCollection={() => setShowCollection(true)}
                onOpenLeaderboard={() => setShowLeaderboard(true)}
            />

            {/* Live activity — row 2, a horizontal ticker.

                It was a 380px column beside the reel. That column was width the
                reel could not have, on the one page where width is the whole
                point, and it was buying vertical history nobody reads mid-spin.
                As a strip it costs ~86px of height, which this layout has, and
                returns 380px of width, which it did not.

                The vertical ActivityFeedSidebar is still what the Live drawer
                opens on narrow viewports — see ActivityTicker's note on why there
                are two presentations rather than one responsive component.

                **Desktop only since the phone pass.** The strip costs 68px of
                height, and on an 800px phone that was the largest remaining piece
                of chrome above the reel — a twelfth of the surface spent on an
                ambient readout, while the shaft it sat on top of could only show
                three rows. The feed is a bottom-bar destination on a phone now
                (`Live`), which is where the strip's own "All drops" control went
                anyway, so nothing became unreachable — it moved from a glance
                surface to a tap.

                This needs no change to the grid: row 2 is an `auto` track, so
                with nothing rendered into it the row collapses to zero and the
                68px falls through to the shaft. */}
            {user && !isMobile && (
                <div style={{
                    gridRow: 2,
                    gridColumn: 1,
                    borderBottom: `1px solid ${COLORS.border}33`,
                    minWidth: 0,
                    zIndex: Z.content,
                }}>
                    <ActivityTicker onOpenFull={() => setShowMobileActivity(true)} />
                </div>
            )}



            {/* The `.sidebar-left / .sidebar-right` media query that used to live
                here is gone. The sidebars were rendered always and then hidden by
                a `@media (min-width: 1400px) { display: flex !important }`, while
                a separate `isMobile` state watched the same 1400px threshold to
                decide whether to show the Live button that replaces the folded
                feed. Two mechanisms tracking one number is how they drift, and
                they did: an earlier pass moved the media query without moving
                isMobile, opening a 300px band of widths with no sidebar and no
                button to reach it either.

                The grid needs the breakpoint in JS anyway — it decides the column
                template — so `isMobile` is now the only place it is written. */}

            {/* Modals */}
            {showUsernameModal && (
                <UsernameModal
                    onClose={() => setShowUsernameModal(false)}
                    currentUsername={user?.customUsername}
                />
            )}

            {/* The full leaderboard is LeaderboardSidebar in modal mode.
                
                It used to be features/Leaderboard.jsx, a second implementation that
                had drifted behind the panel: the panel had grown the entire King of
                the Wheel mode — live standings, your points and rank, the countdown
                — and the modal had none of it, so "open the full leaderboard"
                showed you fewer features than the panel beside the reel did. The
                modal's one advantage, the global totals strip, moved across, so
                nothing was lost in the fold. */}
            {showLeaderboard && (
                <div
                    onClick={(e) => { if (e.target === e.currentTarget) setShowLeaderboard(false); }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        // The scrim ladder's middle step, matching the collection
                        // board: this pushes the stage back behind a plaque rather
                        // than blacking it out.
                        background: 'rgba(0,0,0,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        // Full-bleed on a phone, inset on a desktop — the same
                        // arrangement the collection board uses. The inset was
                        // costing the phone 48px of a 390px row, which the board's
                        // own padding then doubled.
                        padding: isMobile ? 0 : `${SPACE.lg}px`,
                        zIndex: 1100,
                        animation: 'fadeIn 0.25s ease-out',
                    }}
                >
                    <LeaderboardSidebar
                        onClose={() => setShowLeaderboard(false)}
                    />
                </div>
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

            {/* Live events — row 3, the gap between the ticker and the reel.
                
                The banners are unchanged: same countdowns, progress bars, counters
                and detail they always had. Only where they sit changed. They used
                to be `position: fixed; top: 0`, which on a HUD with a permanent
                topbar covered it for the whole event and let two simultaneous
                events overlap each other.
                
                A brief attempt at replacing them with a single minimal bar is
                what this reverts. It fixed the overlap and lost everything that
                made the banners worth looking at — the timer, the progress, the
                per-event detail. The gap above the reel is roughly 118px of space
                the layout already keeps spare in order to centre the reel, which
                is enough to hold a real banner. Fix the position, keep the design.
                
                They stay mounted whether or not an event is running: each owns its
                event's countdown, soundtrack, settle/winner handling and updates to
                the global event status, so unmounting one would switch the event
                off rather than hide it. Each renders null on its own when idle. */}
            <div style={{
                gridRow: 3,
                gridColumn: 1,
                // Bottom-aligned, so the banner always sits flush on top of the
                // reel rather than floating in the middle of the gap. Community
                // Goal happened to do this already because it is taller than the
                // gap; this makes it true of all four, and the banner reads as
                // attached to the reel instead of hovering near it — which matters
                // now that the reel takes the event's colour underneath it.
                alignSelf: 'end',
                justifySelf: 'stretch',
                minWidth: 0,
                zIndex: Z.content,
                display: 'flex',
                flexDirection: 'column',
                gap: `${SPACE.sm}px`,
            }}>
                {/* Recursion joined this row on 2026-08-20. It was mounted
                    above, outside the layout, still `position: fixed; top: 0` —
                    the one live-event banner that never made the move the note
                    above describes, because it was in a different part of the
                    tree and the sweep did not reach it. So it covered the topbar
                    for the whole event and stacked on top of whichever global
                    event was already running, which is precisely the pair of
                    failures that move was made to fix. Same slot, same rules,
                    same flush-on-the-reel alignment as the other four. */}
                <RecursionOverlay inline />
                <GoldRushBanner isMobile={isMobile} isAdmin={user?.isAdmin} inline />
                <KingOfWheelBanner isMobile={isMobile} isAdmin={user?.isAdmin} currentUserId={user?.id} inline />
                <FirstBloodBanner isMobile={isMobile} isAdmin={user?.isAdmin} inline />
                <CommunityGoalBanner isMobile={isMobile} isAdmin={user?.isAdmin} inline />
                {/* The roll, in the same slot the meter counts down in and the
                    banners open in. It used to be a full-screen scrim at z-index
                    10000 — see EventSelectionWheel.jsx for why it moved here. */}
                <EventSelectionWheel isMobile={isMobile} />

                {/* What this slot says when none of the above are firing, which is
                    most of the time. It renders null during an event and during the
                    roll, so it never shares the space with them. */}
                <MilestoneMeter isMobile={isMobile} />
            </div>

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
                        // A definite height, not just a maxHeight.
                        //
                        // ActivityFeedSidebar is `height: 100%` so it can fill the
                        // HUD's flexible row. A percentage height resolves against
                        // a parent that HAS a height — against an auto-height
                        // parent it collapses to `auto`, so in here the feed grew
                        // to its full content length, ran off the bottom of the
                        // screen, and could not be scrolled because the element
                        // that would have scrolled was the one doing the growing.
                        // `maxHeight` alone does not fix that: it caps this box
                        // without giving the child anything to measure against.
                        //
                        // Capped at 640px as well as 90vh so the panel does not
                        // become a full-height column on a tall monitor, which is
                        // not what a drawer over a dimmed page should look like.
                        height: 'min(90vh, 640px)',
                        minHeight: 0,
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

            {/* Live Chat.

                On a phone the bottom bar opens it and the chat's own floating
                launcher is suppressed — see MobileTabBar.jsx for why the flanks'
                job becomes a bar down there, and LiveChat.jsx for why this is a
                signal counter rather than a controlled `open` prop. */}
            {user && (
                <LiveChat
                    user={user}
                    isAdmin={user.isAdmin}
                    openSignal={chatOpenSignal}
                    onUnreadChange={setChatUnread}
                    hideLauncher={isMobile}
                />
            )}

            {/* The phone's four destinations, in the thumb zone. This is where the
                stage flanks go when there is no room to flank anything, and where
                the topbar's overflowing icon row goes when the bar is 390px wide. */}
            {isMobile && (
                <MobileTabBar
                    active={
                        showCollection ? 'collection'
                            : showLeaderboard ? 'leaderboard'
                                : showProfile ? 'profile'
                                    // `onSelect` has always answered 'activity';
                                    // nothing here ever produced it, so tapping Live
                                    // opened the drawer and left the tab dark. Last in
                                    // the chain so the existing precedence is untouched.
                                    : showMobileActivity ? 'activity'
                                        : null
                    }
                    // 'chat' is deliberately absent: LiveChat owns whether it is open
                    // and WheelPage only pokes it through `chatOpenSignal`, which is a
                    // counter rather than a state. Marking that tab active means
                    // lifting LiveChat's own open state, which is a bigger change than
                    // this line.
                    unreadChat={chatUnread}
                    onSelect={(id) => {
                        if (id === 'collection') setShowCollection(true);
                        else if (id === 'leaderboard') setShowLeaderboard(true);
                        else if (id === 'activity') setShowMobileActivity(true);
                        else if (id === 'profile') setShowProfile(true);
                        else if (id === 'chat') setChatOpenSignal(n => n + 1);
                    }}
                />
            )}

            {/* Everything the phone's topbar cannot hold. Ordered by how often it
                is reached, with the destructive action last and alone in red. */}
            {isMobile && (
                <MobileMoreSheet
                    open={showMore}
                    onClose={() => setShowMore(false)}
                    items={[
                        // Live activity is a bottom-bar destination now, not a
                        // sheet row — one entry point, the rule this page has
                        // already applied to the Trophy button, the leaderboard
                        // pill and the chat launcher.
                        { id: 'history', label: 'Spin history', Icon: ScrollText, onSelect: () => setShowHistory(true) },
                        { id: 'achievements', label: 'Achievements', Icon: Award, onSelect: () => setShowAchievements(true) },
                        { id: 'name', label: 'Edit name', Icon: Edit3, onSelect: () => setShowUsernameModal(true) },
                        { id: 'sound', label: 'Sound', Icon: Volume2, onSelect: () => setShowSoundSettings(true) },
                        user?.isAdmin
                            ? { id: 'admin', label: 'Admin panel', Icon: Settings, onSelect: () => setShowAdmin(true) }
                            : null,
                        { id: 'logout', label: 'Log out', Icon: LogOut, onSelect: logout, tone: 'danger' },
                    ]}
                />
            )}
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
