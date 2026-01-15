// ============================================
// Activity Context - Real-time activity via SSE
// ============================================
// Uses Server-Sent Events for instant updates
// Initial fetch on mount, then pure SSE for real-time

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config/constants';

const ActivityContext = createContext(null);

export function ActivityProvider({ children }) {
    const [feed, setFeed] = useState([]);
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

    const isVisibleRef = useRef(true);
    const eventSourceRef = useRef(null);
    const lastIdRef = useRef(null);
    const initializedRef = useRef(false);

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

    // Fetch global event status
    const fetchGlobalEventStatus = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/global-event/status`, { credentials: 'include' });
            const data = await res.json();
            setGlobalEventStatus(data);
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
                fetch(`${API_BASE_URL}/api/activity/rare?days=7&limit=50`)
            ]);

            const allData = await allRes.json();
            const rareData = await rareRes.json();

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
                    const existingIds = new Set(allData.feed.map(item => item.id));
                    const additionalRare = rareData.feed.filter(item => !existingIds.has(item.id));
                    if (additionalRare.length > 0) {
                        mergedFeed = [...allData.feed, ...additionalRare].sort((a, b) => {
                            const dateA = new Date(a.created_at.replace(' ', 'T') + (a.created_at.includes('Z') ? '' : 'Z'));
                            const dateB = new Date(b.created_at.replace(' ', 'T') + (b.created_at.includes('Z') ? '' : 'Z'));
                            return dateB - dateA;
                        });
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

                                    return {
                                        ...prev,
                                        active,
                                        pending,
                                        type: data.eventType || (data.boostedRarity ? 'gold_rush' : prev.type),
                                        data: data.boostedRarity ? { boostedRarity: data.boostedRarity, multiplier: data.multiplier } : prev.data,
                                        activatesAt: data.activatesAt || prev.activatesAt,
                                        expiresAt: data.expiresAt || prev.expiresAt,
                                        milestone: data.milestone || prev.milestone,
                                    };
                                });
                                break;

                            case 'global_event_end':
                                console.log('[SSE] Global event ended:', data);
                                setGlobalEventStatus({ active: false, pending: false, type: null, data: null, milestone: null });
                                // Clear KOTW state if it was a KOTW event
                                setKotwLeaderboard([]);
                                setKotwUserStats(null);
                                // Fetch fresh milestone data
                                fetchGlobalEventStatus();
                                break;

                            case 'event_selection':
                                console.log('[SSE] Event selection started:', data);
                                setEventSelection(data);
                                // Clear selection after animation completes
                                setTimeout(() => {
                                    setEventSelection(null);
                                }, data.selectionDuration + 1000);
                                break;

                            case 'kotw_leaderboard':
                                console.log('[SSE] KOTW leaderboard update:', data);
                                setKotwLeaderboard(data.leaderboard || []);
                                break;

                            case 'kotw_winner':
                                console.log('[SSE] KOTW winner announced:', data);
                                setKotwWinner(data);
                                // Clear leaderboard after winner announcement
                                setTimeout(() => {
                                    setKotwWinner(null);
                                    setKotwLeaderboard([]);
                                    setKotwUserStats(null);
                                }, 30000); // Keep winner visible for 30 seconds
                                break;

                            case 'first_blood_result':
                                console.log('[SSE] First Blood result:', data);
                                // Delay showing winner to allow spin animation to complete first
                                // Spin animations take ~4-5 seconds, so wait before showing winner
                                setTimeout(() => {
                                    setFirstBloodWinner(data);
                                    // Clear winner after display period
                                    setTimeout(() => {
                                        setFirstBloodWinner(null);
                                    }, 8000); // Show winner for 8 seconds before clearing
                                }, 5000); // Wait for spin animation to complete
                                break;

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

                                    // Prepend to feed
                                    setFeed(prev => {
                                        if (prev.some(item => item.id === data.item.id)) return prev;
                                        return [data.item, ...prev].slice(0, 150);
                                    });

                                    // Update lastId
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

                eventSource.onerror = (e) => {
                    // Log more details for debugging
                    console.log('[SSE] Connection error, state:', eventSource.readyState);
                    eventSource.close();
                    eventSourceRef.current = null;

                    // Reconnect faster in production - use 1 second instead of 3
                    // The server is probably fine, it's likely a proxy timeout
                    setTimeout(() => {
                        console.log('[SSE] Attempting reconnection...');
                        connectSSE();
                        fetchActivity();
                    }, 1000);
                };

                eventSourceRef.current = eventSource;
            } catch (e) {
                console.error('[SSE] Connect error:', e);
                setTimeout(connectSSE, 3000);
            }
        };

        connectSSE();

        const handleVisibilityChange = () => {
            isVisibleRef.current = !document.hidden;
            if (!document.hidden) {
                fetchActivity();
                fetchGlobalEventStatus();
                if (eventSourceRef.current?.readyState !== EventSource.OPEN) {
                    connectSSE();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [fetchActivity, fetchRecursionStatus, fetchGlobalEventStatus]);

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
        serverTime,
        newItems,
        clearNewItems,
        initialized,
        recursionStatus,
        updateRecursionStatus,
        globalEventStatus,
        updateGlobalEventStatus,
        // King of the Wheel
        kotwLeaderboard,
        kotwUserStats,
        kotwWinner,
        kotwSpinPending,
        markKotwSpinStart,
        updateKotwUserStats,
        // Event Selection
        eventSelection,
        // First Blood
        firstBloodWinner,
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