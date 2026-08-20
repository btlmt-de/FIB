import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '../config/constants';

/**
 * The collection leaderboard, and where the signed-in player sits in it.
 *
 * Extracted because two surfaces need the same board: the topbar pill, which shows
 * the top three and your rank, and the result flanks, which show what a pull did to
 * your standing. Both want the identical request, and a second copy of it would be
 * two components polling the same endpoint on two timers and disagreeing about your
 * rank for up to five minutes at a stretch.
 *
 * A leaderboard row carries far more than a rank — `total_spins`, `unique_items`,
 * `total_duplicates` and the per-tier counts are all on it — so `me` is usually the
 * whole answer to "how am I doing", and callers rarely need a second request.
 *
 * Five minutes is the cadence the pill already used, and the reasoning holds for
 * every caller: the board moves on the scale of other people's spins, not yours, so
 * anything faster is polling for its own sake. `refresh` is exposed for the one
 * moment that is not true — your own spin, which can move your row immediately.
 */
export function useCollectionLeaderboard(userId) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/leaderboard?sort=collection`);
            if (!res.ok) throw new Error(`leaderboard HTTP ${res.status}`);
            const data = await res.json();
            setLeaderboard(data.leaderboard || []);
        } catch (err) {
            console.error('Failed to load leaderboard:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 5 * 60 * 1000);
        return () => clearInterval(id);
    }, [refresh]);

    const myIndex = userId == null ? -1 : leaderboard.findIndex(e => e.id === userId);

    return {
        leaderboard,
        loading,
        refresh,
        // Absent rather than zero when unranked: a missing rank and a rank of zero
        // are different claims, and only one of them is true.
        myRank: myIndex >= 0 ? myIndex + 1 : null,
        me: myIndex >= 0 ? leaderboard[myIndex] : null,
    };
}

export default useCollectionLeaderboard;
