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
            const [allRes, rareRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/activity/all?limit=100`),
                fetch(`${API_BASE_URL}/api/activity/rare?days=7&limit=50`)
            ]);

            const allData = await allRes.json();
            const rareData = await rareRes.json();

            if (allData.feed) {
                // Store server time for accurate age calculations
                if (allData.serverTime) {
                    setServerTime(new Date(allData.serverTime).getTime());
                }

                // Merge rare drops (mythic/insane from past 7 days) with all activity
                // This ensures older mythic/insane items stay visible even when pushed out of recent 100
                let mergedFeed = allData.feed;
                if (rareData.feed && rareData.feed.length > 0) {
                    const existingIds = new Set(allData.feed.map(item => item.id));
                    const additionalRare = rareData.feed.filter(item => !existingIds.has(item.id));
                    if (additionalRare.length > 0) {
                        // Merge and re-sort by created_at descending
                        mergedFeed = [...allData.feed, ...additionalRare].sort((a, b) => {
                            const dateA = new Date(a.created_at.replace(' ', 'T') + (a.created_at.includes('Z') ? '' : 'Z'));
                            const dateB = new Date(b.created_at.replace(' ', 'T') + (b.created_at.includes('Z') ? '' : 'Z'));
                            return dateB - dateA;
                        });
                    }
                }

                const newestId = mergedFeed[0]?.id;

                if (!initialized) {
                    // First fetch - just store the ID, don't trigger new item notifications
                    setLastId(newestId);
                    setInitialized(true);
                    setFeed(mergedFeed);
                } else if (lastId !== null && newestId && newestId > lastId) {
                    // New items found
                    const newlyDetected = mergedFeed.filter(item => item.id > lastId);
                    setNewItems(newlyDetected);
                    setLastId(newestId);
                    setFeed(mergedFeed);
                } else {
                    // No new items, just update feed (for age calculations)
                    setFeed(mergedFeed);
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