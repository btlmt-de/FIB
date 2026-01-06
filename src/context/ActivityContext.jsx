// ============================================
// Activity Context - Centralized activity feed polling
// ============================================
// This prevents multiple components from polling /api/activity independently

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config/constants';

const ActivityContext = createContext(null);

export function ActivityProvider({ children }) {
    const [feed, setFeed] = useState([]);
    const [serverTime, setServerTime] = useState(null);
    const [lastId, setLastId] = useState(null);
    const [newItems, setNewItems] = useState([]); // Items detected since last check
    const [initialized, setInitialized] = useState(false);

    const intervalRef = useRef(null);
    const isVisibleRef = useRef(true);

    const fetchActivity = useCallback(async () => {
        // Skip fetch if tab is not visible
        if (!isVisibleRef.current) return;

        try {
            // Fetch all activity including achievements (for toasts) with higher limit
            // so sidebar has enough items after filtering out achievements
            const res = await fetch(`${API_BASE_URL}/api/activity/all?limit=100`);
            const data = await res.json();

            if (data.feed) {
                // Store server time for accurate age calculations
                if (data.serverTime) {
                    setServerTime(new Date(data.serverTime).getTime());
                }

                const newestId = data.feed[0]?.id;

                if (!initialized) {
                    // First fetch - just store the ID, don't trigger new item notifications
                    setLastId(newestId);
                    setInitialized(true);
                    setFeed(data.feed);
                } else if (lastId !== null && newestId && newestId > lastId) {
                    // New items found
                    const newlyDetected = data.feed.filter(item => item.id > lastId);
                    setNewItems(newlyDetected);
                    setLastId(newestId);
                    setFeed(data.feed);
                } else {
                    // No new items, just update feed (for age calculations)
                    setFeed(data.feed);
                    setNewItems([]);
                }
            }
        } catch (e) {
            console.error('Failed to fetch activity:', e);
        }
    }, [initialized, lastId]);

    // Clear new items after they've been processed
    const clearNewItems = useCallback(() => {
        setNewItems([]);
    }, []);

    useEffect(() => {
        // Handle visibility change to pause/resume polling
        const handleVisibilityChange = () => {
            isVisibleRef.current = !document.hidden;
            if (!document.hidden) {
                // Fetch immediately when tab becomes visible
                fetchActivity();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Initial fetch
        fetchActivity();

        // Poll every 5 seconds (single source of truth)
        intervalRef.current = setInterval(fetchActivity, 5000);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [fetchActivity]);

    const value = {
        feed,
        serverTime,
        newItems,
        clearNewItems,
        initialized
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