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

                            case 'activity':
                                if (data.item && data.item.id) {
                                    // Update serverTime from SSE message if provided, otherwise use current time
                                    // This prevents stale timestamps that cause delayed celebrations
                                    if (data.serverTime) {
                                        setServerTime(new Date(data.serverTime).getTime());
                                    } else {
                                        setServerTime(Date.now());
                                    }

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

                eventSource.onerror = () => {
                    console.log('[SSE] Error, reconnecting in 3s...');
                    eventSource.close();
                    eventSourceRef.current = null;
                    setTimeout(() => {
                        connectSSE();
                        fetchActivity();
                    }, 3000);
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
    }, [fetchActivity, fetchRecursionStatus]);

    const clearNewItems = useCallback(() => {
        setNewItems([]);
    }, []);

    const updateRecursionStatus = useCallback((status) => {
        setRecursionStatus(status);
    }, []);

    const value = {
        feed,
        serverTime,
        newItems,
        clearNewItems,
        initialized,
        recursionStatus,
        updateRecursionStatus
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