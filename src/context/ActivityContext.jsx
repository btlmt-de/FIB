// ============================================
// Activity Context - Real-time activity via SSE
// ============================================
// Uses Server-Sent Events for instant updates
// Initial fetch on mount, then pure SSE for real-time

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config/constants';
import { parseActivityDate, spinRevealDelay } from '../utils/helpers.js';
import { isSaverOn } from '../config/power.js';

const ActivityContext = createContext(null);

// How far back mythic/insane drops are folded into the main activity feed. The board
// itself is all-time; this only governs how long a rare drop lingers in the All tab.
const RARE_FEED_MERGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;


export function ActivityProvider({ children }) {
    const [feed, setFeed] = useState([]);
    const [rareFeed, setRareFeed] = useState([]); // All-time mythic/insane, for the board
    const [serverTime, setServerTime] = useState(null);
    const [lastId, setLastId] = useState(null);
    const [newItems, setNewItems] = useState([]);
    const [initialized, setInitialized] = useState(false);
    const [recursionStatus, setRecursionStatus] = useState({ active: false });
    const [globalEventStatus, setGlobalEventStatus] = useState({ active: false, milestone: null });

    // King of the Wheel state
    const [kotwLeaderboard, setKotwLeaderboard] = useState([]);
    const [kotwUserStats, setKotwUserStats] = useState(null);
    const [kotwWinner, setKotwWinner] = useState(null);
    const [kotwSpinPending, setKotwSpinPending] = useState(false); // Track if user is mid-spin
    const [eventSelection, setEventSelection] = useState(null); // For event selection animation

    // First Blood state
    const [firstBloodWinner, setFirstBloodWinner] = useState(null);

    // Community Goal state
    const [communityGoal, setCommunityGoal] = useState(null); // { progress, target, participants }
    const [communityGoalResult, setCommunityGoalResult] = useState(null);
    const [communityGoalResultPending, setCommunityGoalResultPending] = useState(false);

    // Both of these events also hold their result back so it cannot land mid-spin. The
    // flags let their banners stay on screen through that gap instead of unmounting and
    // sliding back in a few seconds later, which read as a glitch.
    const [kotwWinnerPending, setKotwWinnerPending] = useState(false);
    const [firstBloodResultPending, setFirstBloodResultPending] = useState(false);
    const [communityGoalReward, setCommunityGoalReward] = useState(null); // This user's payout

    const isVisibleRef = useRef(true);
    const eventSourceRef = useRef(null);
    // The SSE reconnect's backoff state. Both live outside the effect's closure
    // so a re-run cannot strand a pending timer or reset a backoff mid-storm.
    const reconnectTimerRef = useRef(null);
    const reconnectAttemptRef = useRef(0);
    const lastIdRef = useRef(null);
    const initializedRef = useRef(false);

    // Timeout refs for SSE handler cleanup
    const eventSelectionTimeoutRef = useRef(null);
    const kotwWinnerDelayTimeoutRef = useRef(null);
    const kotwWinnerTimeoutRef = useRef(null);
    const firstBloodTimeoutRef = useRef(null);
    const firstBloodClearTimeoutRef = useRef(null);
    const communityGoalResultTimeoutRef = useRef(null);
    const communityGoalClearTimeoutRef = useRef(null);
    // True while this client's own wheel is animating. An event result that
    // arrives mid-spin must not render until the wheel lands — see
    // deferResultUntilLanding() below.
    const spinInFlightRef = useRef(false);
    const deferredResultRevealsRef = useRef([]);
    const deferredResultGuardsRef = useRef([]);
    // A list rather than a single ref: several drops can be in their reveal window
    // at once — a busy server, or your own spin landing while someone else's is
    // still held — and each needs its own timer.
    const feedRevealTimeoutsRef = useRef([]);

    // Keep refs in sync with state
    useEffect(() => {
        lastIdRef.current = lastId;
    }, [lastId]);

    useEffect(() => {
        initializedRef.current = initialized;
    }, [initialized]);

    // Fetch recursion status
    const fetchRecursionStatus = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/recursion/status`, { credentials: 'include' });
            const data = await res.json();
            setRecursionStatus(data);
        } catch (e) {
            console.error('[ActivityContext] Failed to fetch recursion status:', e);
        }
    }, []);

    /**
     * Refresh only the milestone — how many spins until the next global event.
     *
     * The full status carries this too, but it is only *pushed* when the event
     * state itself changes, and between events that is exactly never. So a meter
     * reading off `globalEventStatus.milestone` alone would freeze at whatever the
     * number was when the tab loaded, which for a figure the whole server moves is
     * worse than not showing it.
     *
     * It writes into the same `globalEventStatus.milestone` the status fetch and
     * the SSE broadcasts write, so there is still one milestone on the client
     * rather than a second copy owned by whichever component happens to display it.
     * `/api/global-event/milestone` is the cheap endpoint — four integers, no
     * event payload — because this is called on a timer.
     */
    const refreshMilestone = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/global-event/milestone`, { credentials: 'include' });
            if (!res.ok) return;
            const milestone = await res.json();
            if (!milestone || typeof milestone.remaining !== 'number') return;
            setGlobalEventStatus(prev => ({ ...prev, milestone }));
        } catch {
            // A stale meter is the failure mode here, and it is a fine one. The
            // next tick tries again.
        }
    }, []);

    // Fetch global event status
    const fetchGlobalEventStatus = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/global-event/status`, { credentials: 'include' });
            const data = await res.json();

            // Apply clock sync if serverTime is provided
            if (data.serverTime && (data.activatesAt || data.expiresAt)) {
                const clockOffset = data.serverTime - Date.now();
                console.log('[Fetch] Clock offset:', clockOffset, 'ms');
                if (data.activatesAt) {
                    data.activatesAt = data.activatesAt - clockOffset;
                }
                if (data.expiresAt) {
                    data.expiresAt = data.expiresAt - clockOffset;
                }
            }

            setGlobalEventStatus(data);

            // King of the Wheel standings, for anyone arriving mid-event.
            //
            // kotwLeaderboard was only ever populated from the `kotw_leaderboard`
            // SSE message, which is pushed when somebody spins. That is fine once
            // you are watching, but it means a page loaded during a live
            // competition showed an empty board until the next spin happened
            // anywhere on the server — which, late in a quiet event, can be a long
            // time. The standings existed; nothing had asked for them.
            //
            // Fetched here rather than in its own effect because this function
            // already knows whether a KOTW event is running, and it is called both
            // on mount and whenever the tab becomes visible again — the two moments
            // where the client can be behind.
            if (data?.active && data?.type === 'king_of_wheel') {
                try {
                    const kotwRes = await fetch(`${API_BASE_URL}/api/kotw/leaderboard`, { credentials: 'include' });
                    const kotwData = await kotwRes.json();
                    if (kotwData?.leaderboard) setKotwLeaderboard(kotwData.leaderboard);
                    // The endpoint returns the caller's own row when signed in, so
                    // your rank and points come back with it rather than needing a
                    // second request.
                    if (kotwData?.userStats) setKotwUserStats(kotwData.userStats);
                } catch (e) {
                    console.error('[ActivityContext] Failed to fetch KOTW leaderboard:', e);
                }
            }
        } catch (e) {
            console.error('[ActivityContext] Failed to fetch global event status:', e);
        }
    }, []);

    // Fetch activity feed - uses refs to avoid dependency issues
    const fetchActivity = useCallback(async () => {
        if (!isVisibleRef.current) return;

        try {
            const [allRes, rareRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/activity/all?limit=100`, { credentials: 'include' }),
                // Full mythic/insane history - the Mythic & Insane board is all-time.
                // One request serves both consumers: the board takes the whole list, while
                // the main feed still only merges the last 7 days so the All tab keeps
                // reading as a recent-activity feed rather than an archive.
                fetch(`${API_BASE_URL}/api/activity/rare?days=all&limit=500`)
            ]);

            const allData = await allRes.json();
            const rareData = await rareRes.json();

            if (rareData.feed) {
                setRareFeed(rareData.feed);
            }

            if (allData.feed) {
                if (allData.serverTime) {
                    setServerTime(new Date(allData.serverTime).getTime());
                }

                if (allData.recursionStatus !== undefined) {
                    setRecursionStatus(prev => {
                        if (!prev.active && allData.recursionStatus.active) {
                            return allData.recursionStatus;
                        }
                        if (allData.recursionStatus.userSpinsRemaining !== undefined || allData.recursionStatus.remainingTime !== undefined) {
                            return { ...prev, ...allData.recursionStatus };
                        }
                        return prev;
                    });
                }

                let mergedFeed = allData.feed;
                if (rareData.feed && rareData.feed.length > 0) {
                    // Only the recent slice belongs in the main feed - see the fetch above.
                    const rareCutoff = Date.now() - RARE_FEED_MERGE_WINDOW_MS;
                    const existingIds = new Set(allData.feed.map(item => item.id));
                    const additionalRare = rareData.feed.filter(item =>
                        !existingIds.has(item.id) && parseActivityDate(item.created_at) >= rareCutoff);
                    if (additionalRare.length > 0) {
                        mergedFeed = [...allData.feed, ...additionalRare]
                            .sort((a, b) => parseActivityDate(b.created_at) - parseActivityDate(a.created_at));
                    }
                }

                const newestId = mergedFeed[0]?.id;
                const currentLastId = lastIdRef.current;
                const isInit = initializedRef.current;

                if (!isInit) {
                    setLastId(newestId);
                    setInitialized(true);
                    setFeed(mergedFeed);
                } else if (currentLastId !== null && newestId && newestId > currentLastId) {
                    const newlyDetected = mergedFeed.filter(item => item.id > currentLastId);
                    setNewItems(newlyDetected);
                    setLastId(newestId);
                    setFeed(mergedFeed);
                } else {
                    setFeed(mergedFeed);
                    setNewItems([]);
                }
            }
        } catch (e) {
            console.error('Failed to fetch activity:', e);
        }
    }, []); // No dependencies - uses refs

    // Event results that arrive while the player's own wheel is still turning
    // (the event end timers fire mid-spin as often as not) must not render
    // until the wheel lands: a fixed wait can fire while the wheel is not done,
    // spoiling the pull. The pending flags the callers set keep their banners
    // on screen meanwhile. The wheel reports start/landing through
    // markSpinInFlight()/markSpinLanded(); markSpinLanded drains this queue. A
    // guard timer guarantees a stranded result is not held forever if the
    // landing never fires (e.g. the spin request failed and the wheel reset).
    const deferResultUntilLanding = useCallback((reveal) => {
        deferredResultRevealsRef.current.push(reveal);
        const guard = setTimeout(() => {
            const i = deferredResultRevealsRef.current.indexOf(reveal);
            if (i >= 0) {
                deferredResultRevealsRef.current.splice(i, 1);
                reveal();
            }
        }, 15000);
        deferredResultGuardsRef.current.push(guard);
    }, []);

    const markSpinInFlight = useCallback(() => {
        spinInFlightRef.current = true;
    }, []);

    const markSpinLanded = useCallback(() => {
        spinInFlightRef.current = false;
        const reveals = deferredResultRevealsRef.current.splice(0);
        deferredResultGuardsRef.current.forEach(clearTimeout);
        deferredResultGuardsRef.current = [];
        for (const reveal of reveals) reveal();
    }, []);

    // SSE connection - runs once on mount
    useEffect(() => {
        fetchActivity();
        fetchGlobalEventStatus();

        const connectSSE = () => {
            if (eventSourceRef.current?.readyState === EventSource.OPEN) return;

            try {
                const eventSource = new EventSource(`${API_BASE_URL}/api/events/stream`, {
                    withCredentials: true
                });

                eventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);

                        switch (data.type) {
                            case 'recursion_wakeup':
                                console.log('[SSE] Recursion wake-up received');
                                fetchRecursionStatus();
                                break;

                            case 'global_event_status':
                            case 'global_event_countdown':
                            case 'global_event_start':
                                console.log('[SSE] Global event update:', data.type, data);
                                // Seed the Community Goal bar. Every one of these three
                                // carries the target, and global_event_status (sent on
                                // connect) also carries live progress, so a client that
                                // joins mid-event gets a filled bar rather than an empty one.
                                if (data.eventType === 'community_goal') {
                                    setCommunityGoal(prev => ({
                                        progress: data.progress ?? prev?.progress ?? 0,
                                        target: data.target ?? prev?.target ?? 0,
                                        tiers: data.tiers ?? prev?.tiers ?? [],
                                        tierReached: data.tierReached ?? prev?.tierReached ?? null,
                                        payout: data.payout ?? prev?.payout ?? data.participationReward ?? 0,
                                        participationReward: data.participationReward ?? prev?.participationReward ?? 0,
                                        participants: data.participants ?? prev?.participants ?? 0,
                                        // Stages gate on rare-or-better drops as well as on points,
                                        // so the bar being full is not on its own enough to pay.
                                        specialDrops: data.specialDrops ?? prev?.specialDrops ?? 0,
                                    }));
                                }
                                setGlobalEventStatus(prev => {
                                    // Determine active/pending based on event type
                                    let active = prev.active;
                                    let pending = prev.pending;

                                    if (data.type === 'global_event_countdown') {
                                        active = false;
                                        pending = true;
                                    } else if (data.type === 'global_event_start') {
                                        active = true;
                                        pending = false;
                                    } else if (data.active !== undefined) {
                                        active = data.active;
                                        pending = data.pending || false;
                                    }

                                    // Calculate clock offset and adjust timestamps for clock skew
                                    // This ensures countdown/timer displays correctly even if client/server clocks differ
                                    let adjustedActivatesAt = data.activatesAt || prev.activatesAt;
                                    let adjustedExpiresAt = data.expiresAt || prev.expiresAt;

                                    if (data.serverTime && (data.activatesAt || data.expiresAt)) {
                                        const clockOffset = data.serverTime - Date.now();
                                        console.log('[SSE] Clock offset:', clockOffset, 'ms');
                                        if (data.activatesAt) {
                                            adjustedActivatesAt = data.activatesAt - clockOffset;
                                        }
                                        if (data.expiresAt) {
                                            adjustedExpiresAt = data.expiresAt - clockOffset;
                                        }
                                    }

                                    return {
                                        ...prev,
                                        active,
                                        pending,
                                        type: data.eventType || (data.boostedRarity ? 'gold_rush' : prev.type),
                                        data: data.boostedRarity
                                            ? { boostedRarity: data.boostedRarity, multiplier: data.multiplier }
                                            : data.eventType === 'community_goal'
                                                ? {
                                                    target: data.target,
                                                    tiers: data.tiers,
                                                    participationReward: data.participationReward,
                                                }
                                                : prev.data,
                                        activatesAt: adjustedActivatesAt,
                                        expiresAt: adjustedExpiresAt,
                                        milestone: data.milestone || prev.milestone,
                                    };
                                });
                                break;

                            case 'global_event_end':
                                console.log('[SSE] Global event ended:', data);
                                // Use milestone from broadcast instead of fetching
                                setGlobalEventStatus({
                                    active: false,
                                    pending: false,
                                    type: null,
                                    data: null,
                                    milestone: data.milestone || null
                                });
                                // Clear KOTW state if it was a KOTW event
                                setKotwLeaderboard([]);
                                setKotwUserStats(null);
                                // Community Goal progress is deliberately NOT cleared here.
                                // This message lands ~5s before the result is shown, and
                                // wiping it would empty the banner for that whole gap. The
                                // result handler clears it at the moment it swaps the banner
                                // over. See communityGoalResultPending.
                                break;

                            case 'global_event_milestone':
                                // Pushed after every spin while no event is running.
                                // The activity feed only broadcasts notable drops, so
                                // this is the counter's one live signal — without it
                                // the meter would sit stale until a poll or a special
                                // drop. Written into the same globalEventStatus.milestone
                                // as everything else, so there is still one milestone
                                // on the client.
                                if (data.milestone && typeof data.milestone.remaining === 'number') {
                                    setGlobalEventStatus(prev => ({ ...prev, milestone: data.milestone }));
                                }
                                break;

                            case 'event_selection':
                                console.log('[SSE] Event selection started:', data);
                                // Clear any existing timeout
                                if (eventSelectionTimeoutRef.current) {
                                    clearTimeout(eventSelectionTimeoutRef.current);
                                }
                                setEventSelection(data);
                                // Clear selection after animation completes
                                eventSelectionTimeoutRef.current = setTimeout(() => {
                                    setEventSelection(null);
                                    eventSelectionTimeoutRef.current = null;
                                }, data.selectionDuration + 1000);
                                break;

                            case 'kotw_leaderboard':
                                console.log('[SSE] KOTW leaderboard update:', data);
                                setKotwLeaderboard(data.leaderboard || []);
                                break;

                            case 'kotw_winner':
                                console.log('[SSE] KOTW winner announced:', data);
                                // Clear any existing timeouts
                                if (kotwWinnerDelayTimeoutRef.current) {
                                    clearTimeout(kotwWinnerDelayTimeoutRef.current);
                                }
                                if (kotwWinnerTimeoutRef.current) {
                                    clearTimeout(kotwWinnerTimeoutRef.current);
                                }
                                // Delay the announcement the same way First Blood does.
                                // KOTW ends on a server timer, so it routinely fires while
                                // someone is mid-spin - without the delay the winner banner
                                // and the lucky-spin reward appear on top of a wheel that
                                // has not landed yet, spoiling the result.
                                setKotwWinnerPending(true);
                                kotwWinnerDelayTimeoutRef.current = setTimeout(() => {
                                    setKotwWinner(data);
                                    setKotwWinnerPending(false);
                                    kotwWinnerDelayTimeoutRef.current = null;
                                    // Clear leaderboard after winner announcement
                                    kotwWinnerTimeoutRef.current = setTimeout(() => {
                                        setKotwWinner(null);
                                        setKotwLeaderboard([]);
                                        setKotwUserStats(null);
                                        kotwWinnerTimeoutRef.current = null;
                                    }, 30000); // Keep winner visible for 30 seconds
                                }, 5000); // Wait for spin animation to complete
                                break;

                            case 'community_goal_progress':
                                // Already throttled server-side past the spin animation,
                                // so this is safe to apply the moment it lands.
                                setCommunityGoal(prev => ({
                                    ...prev,
                                    progress: data.progress,
                                    target: data.target,
                                    tiers: data.tiers ?? prev?.tiers ?? [],
                                    tierReached: data.tierReached ?? null,
                                    payout: data.payout ?? prev?.payout ?? 0,
                                    participants: data.participants,
                                    specialDrops: data.specialDrops ?? prev?.specialDrops ?? 0,
                                }));
                                break;

                            case 'community_goal_result': {
                                console.log('[SSE] Community Goal result:', data);
                                if (communityGoalResultTimeoutRef.current) {
                                    clearTimeout(communityGoalResultTimeoutRef.current);
                                }
                                if (communityGoalClearTimeoutRef.current) {
                                    clearTimeout(communityGoalClearTimeoutRef.current);
                                }
                                // Flag the pending result straight away. The banner uses this
                                // to hold its ground for the delay below instead of vanishing
                                // and popping back - the event is over, but the summary is not
                                // ready to show yet.
                                setCommunityGoalResultPending(true);

                                const reveal = () => {
                                    setCommunityGoalResult(data);
                                    setCommunityGoalResultPending(false);
                                    setCommunityGoal(null);
                                    communityGoalResultTimeoutRef.current = null;
                                    communityGoalClearTimeoutRef.current = setTimeout(() => {
                                        setCommunityGoalResult(null);
                                        setCommunityGoalReward(null);
                                        communityGoalClearTimeoutRef.current = null;
                                    }, 12000);
                                };

                                if (spinInFlightRef.current) {
                                    // The end timer fired while this client's wheel was still
                                    // turning: a fixed wait can land the summary over a wheel
                                    // that is not done. Defer to the actual landing, which the
                                    // wheel reports through markSpinLanded().
                                    deferResultUntilLanding(reveal);
                                } else {
                                    // No local spin to spoil - keep the settle rhythm.
                                    communityGoalResultTimeoutRef.current = setTimeout(reveal, 5000);
                                }
                                break;
                            }

                            case 'community_goal_reward':
                                // Sent only to players who took part - carries their own
                                // new balance, so no arithmetic on this side.
                                console.log('[SSE] Community Goal reward:', data);
                                setCommunityGoalReward(data);
                                break;

                            case 'first_blood_result': {
                                console.log('[SSE] First Blood result:', data);
                                // Clear any existing timeouts
                                if (firstBloodTimeoutRef.current) {
                                    clearTimeout(firstBloodTimeoutRef.current);
                                }
                                if (firstBloodClearTimeoutRef.current) {
                                    clearTimeout(firstBloodClearTimeoutRef.current);
                                }
                                setFirstBloodResultPending(true);

                                const reveal = () => {
                                    setFirstBloodWinner(data);
                                    setFirstBloodResultPending(false);
                                    firstBloodTimeoutRef.current = null;
                                    // Clear winner after display period
                                    firstBloodClearTimeoutRef.current = setTimeout(() => {
                                        setFirstBloodWinner(null);
                                        firstBloodClearTimeoutRef.current = null;
                                    }, 8000); // Show winner for 8 seconds before clearing
                                };

                                if (spinInFlightRef.current) {
                                    // Same deal as the Community Goal summary: the end timer
                                    // can fire while the player's wheel is still turning, and
                                    // the winner must wait for the landing too.
                                    deferResultUntilLanding(reveal);
                                } else {
                                    // No local spin to spoil - keep the settle rhythm.
                                    // Spin animations take ~4-5 seconds, so wait before
                                    // showing winner.
                                    firstBloodTimeoutRef.current = setTimeout(reveal, 5000); // Wait for spin animation to complete
                                }
                                break;
                            }

                            case 'activity':
                                if (data.item && data.item.id) {
                                    // Update serverTime from SSE message if provided and valid
                                    // This prevents stale timestamps that cause delayed celebrations
                                    if (data.serverTime) {
                                        const parsedTime = new Date(data.serverTime).getTime();
                                        if (Number.isFinite(parsedTime)) {
                                            setServerTime(parsedTime);
                                        } else {
                                            console.warn('[ActivityContext] Invalid serverTime from SSE:', data.serverTime);
                                            setServerTime(null);
                                        }
                                    }
                                    // If no serverTime provided, leave it unchanged (don't default to Date.now())

                                    // Prepend to feed — but not before the reel that
                                    // produced this drop has finished turning.
                                    //
                                    // This used to be immediate, and it was the one
                                    // live surface that was: the toast holds items
                                    // ~4.5s, the mythic celebration computes its own
                                    // per-user delay, First Blood waits 5s. The feed
                                    // prepending on arrival meant the ticker printed
                                    // your item while your own wheel was still
                                    // spinning, roughly four seconds before the
                                    // notification for the same drop — so the strip
                                    // above the reel was spoiling the reel.
                                    //
                                    // `spinRevealDelay` measures from the drop's
                                    // `created_at`, so a drop that reaches you late
                                    // is not held for the full window a second time.
                                    const revealIn = spinRevealDelay(data.item.created_at);
                                    const prependToFeed = () => setFeed(prev => {
                                        if (prev.some(item => item.id === data.item.id)) return prev;
                                        return [data.item, ...prev].slice(0, 150);
                                    });

                                    if (revealIn <= 0) {
                                        prependToFeed();
                                    } else {
                                        const revealTimeout = setTimeout(() => {
                                            prependToFeed();
                                            feedRevealTimeoutsRef.current =
                                                feedRevealTimeoutsRef.current.filter(id => id !== revealTimeout);
                                        }, revealIn);
                                        feedRevealTimeoutsRef.current.push(revealTimeout);
                                    }

                                    // `lastId` moves immediately, unlike the feed
                                    // itself. It is the high-water mark the catch-up
                                    // fetch asks "anything after this?" with, and
                                    // holding it back would let that fetch pull the
                                    // very drop being delayed and prepend it early —
                                    // the polling path would quietly undo the reveal.
                                    setLastId(prev => {
                                        if (prev === null || data.item.id > prev) return data.item.id;
                                        return prev;
                                    });

                                    // Add to newItems for toast notification (capped at 50)
                                    setNewItems(prev => {
                                        if (prev.some(item => item.id === data.item.id)) return prev;
                                        return [data.item, ...prev].slice(0, 50);
                                    });

                                    // Mark as initialized if not already
                                    setInitialized(true);
                                }
                                break;

                            case 'chat':
                                window.dispatchEvent(new CustomEvent('sse-chat-message', {
                                    detail: data.message
                                }));
                                break;

                            case 'chat_typing':
                                window.dispatchEvent(new CustomEvent('sse-chat-typing', {
                                    detail: { userId: data.userId, username: data.username, isTyping: data.isTyping }
                                }));
                                break;

                            case 'online_count':
                                window.dispatchEvent(new CustomEvent('sse-online-count', {
                                    detail: { count: data.count, userIds: data.userIds }
                                }));
                                break;

                            case 'connected':
                                console.log('[SSE] Connected');
                                // If we got online count with connection, dispatch it
                                if (data.onlineCount !== undefined) {
                                    window.dispatchEvent(new CustomEvent('sse-online-count', {
                                        detail: { count: data.onlineCount, userIds: data.onlineUserIds }
                                    }));
                                }
                                break;
                        }
                    } catch (e) {
                        console.error('[SSE] Parse error:', e);
                    }
                };

                eventSource.onerror = () => {
                    // Log more details for debugging
                    console.log('[SSE] Connection error, state:', eventSource.readyState);
                    eventSource.close();
                    eventSourceRef.current = null;
                    scheduleReconnect();
                };

                eventSourceRef.current = eventSource;
                // A connection that opened is a connection that worked, so the
                // next failure starts its backoff from the bottom again.
                reconnectAttemptRef.current = 0;
            } catch (e) {
                console.error('[SSE] Connect error:', e);
                scheduleReconnect();
            }
        };

        /**
         * ── THE RECONNECT, WHICH WAS THE WORST BATTERY BUG ON THE SITE ───────
         *
         * The old version was `setTimeout(connectSSE, 1000)` with a comment
         * explaining that a fast retry is right because "the server is probably
         * fine, it's likely a proxy timeout". That reasoning holds for the first
         * retry and for no other: when the server is *not* fine, or the phone is
         * on a dead train-tunnel connection, `onerror` fires immediately, the
         * retry fires a second later, and it fails immediately — one connection
         * attempt per second, plus a `fetchActivity()` alongside it, forever, in
         * a tab the player put in their pocket twenty minutes ago. Nothing
         * capped it and nothing checked whether anyone was looking.
         *
         * Three fixes, all of which are correct regardless of saver mode:
         *
         *   - **Backoff.** 1s for the first attempt, doubling to a 30s ceiling.
         *     The fast first retry the original comment wanted is preserved
         *     exactly; only the tenth one is different.
         *   - **Nothing retries while hidden.** The attempt is abandoned, not
         *     deferred, because `visibilitychange` already reconnects on the way
         *     back in and does it immediately rather than on a stale timer.
         *   - **One timer.** The old code could stack retries — an error during
         *     a pending retry scheduled a second one — and each survivor kept
         *     doubling the traffic.
         */
        const scheduleReconnect = () => {
            if (reconnectTimerRef.current) return;
            if (document.hidden) return;

            const attempt = reconnectAttemptRef.current;
            const delay = Math.min(1000 * 2 ** attempt, 30000);
            reconnectAttemptRef.current = Math.min(attempt + 1, 5);

            reconnectTimerRef.current = setTimeout(() => {
                reconnectTimerRef.current = null;
                if (document.hidden) return;
                console.log('[SSE] Attempting reconnection...');
                connectSSE();
                fetchActivity();
            }, delay);
        };

        connectSSE();

        const handleVisibilityChange = () => {
            isVisibleRef.current = !document.hidden;

            if (document.hidden) {
                // ── Saver mode hangs up ──────────────────────────────────────
                //
                // An open EventSource is not free on a phone: the connection
                // holds the radio in a higher power state, and the server's
                // keepalive comments wake the tab periodically to parse frames
                // nobody will read. Outside saver mode that is the price of a
                // live surface and worth paying — a player who tabs away for
                // eight seconds should come back to a feed that never stopped.
                // In saver mode it is exactly the ambient cost this setting
                // exists to remove, and the reconnect below is instant enough
                // that the seam is invisible.
                if (isSaverOn()) {
                    if (reconnectTimerRef.current) {
                        clearTimeout(reconnectTimerRef.current);
                        reconnectTimerRef.current = null;
                    }
                    if (eventSourceRef.current) {
                        eventSourceRef.current.close();
                        eventSourceRef.current = null;
                    }
                }
                return;
            }

            reconnectAttemptRef.current = 0;
            fetchActivity();
            fetchGlobalEventStatus();
            if (eventSourceRef.current?.readyState !== EventSource.OPEN) {
                connectSSE();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            // Clean up any pending timeouts
            if (eventSelectionTimeoutRef.current) {
                clearTimeout(eventSelectionTimeoutRef.current);
                eventSelectionTimeoutRef.current = null;
            }
            if (kotwWinnerDelayTimeoutRef.current) {
                clearTimeout(kotwWinnerDelayTimeoutRef.current);
                kotwWinnerDelayTimeoutRef.current = null;
            }
            if (kotwWinnerTimeoutRef.current) {
                clearTimeout(kotwWinnerTimeoutRef.current);
                kotwWinnerTimeoutRef.current = null;
            }
            if (firstBloodTimeoutRef.current) {
                clearTimeout(firstBloodTimeoutRef.current);
                firstBloodTimeoutRef.current = null;
            }
            if (firstBloodClearTimeoutRef.current) {
                clearTimeout(firstBloodClearTimeoutRef.current);
                firstBloodClearTimeoutRef.current = null;
            }
            if (communityGoalResultTimeoutRef.current) {
                clearTimeout(communityGoalResultTimeoutRef.current);
                communityGoalResultTimeoutRef.current = null;
            }
            if (communityGoalClearTimeoutRef.current) {
                clearTimeout(communityGoalClearTimeoutRef.current);
                communityGoalClearTimeoutRef.current = null;
            }
            feedRevealTimeoutsRef.current.forEach(clearTimeout);
            feedRevealTimeoutsRef.current = [];
            deferredResultGuardsRef.current.forEach(clearTimeout);
            deferredResultGuardsRef.current = [];
            deferredResultRevealsRef.current = [];
        };
    }, [fetchActivity, fetchRecursionStatus, fetchGlobalEventStatus, deferResultUntilLanding]);

    const clearNewItems = useCallback(() => {
        setNewItems([]);
    }, []);

    const updateRecursionStatus = useCallback((status) => {
        setRecursionStatus(status);
    }, []);

    const updateGlobalEventStatus = useCallback((status) => {
        setGlobalEventStatus(status);
    }, []);

    // Mark that user has started spinning (points should not update visually yet)
    const markKotwSpinStart = useCallback(() => {
        setKotwSpinPending(true);
    }, []);

    // Update user stats AND clear pending flag (called when animation completes)
    const updateKotwUserStats = useCallback((stats) => {
        setKotwUserStats(stats);
        setKotwSpinPending(false);
    }, []);

    const value = {
        feed,
        rareFeed,
        serverTime,
        newItems,
        clearNewItems,
        initialized,
        recursionStatus,
        updateRecursionStatus,
        globalEventStatus,
        updateGlobalEventStatus,
        refreshMilestone,
        // King of the Wheel
        kotwLeaderboard,
        kotwUserStats,
        kotwWinner,
        kotwWinnerPending,
        kotwSpinPending,
        markKotwSpinStart,
        updateKotwUserStats,
        // Spin lifecycle - lets deferred event results wait for this client's
        // wheel to land instead of firing over a turning wheel
        markSpinInFlight,
        markSpinLanded,
        // Event Selection
        eventSelection,
        // First Blood
        firstBloodWinner,
        firstBloodResultPending,
        // Community Goal
        communityGoal,
        communityGoalResult,
        communityGoalResultPending,
        communityGoalReward,
    };

    return (
        <ActivityContext.Provider value={value}>
            {children}
        </ActivityContext.Provider>
    );
}

export function useActivity() {
    const context = useContext(ActivityContext);
    if (!context) {
        throw new Error('useActivity must be used within an ActivityProvider');
    }
    return context;
}