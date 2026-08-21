/*
 * ═══════════════════════════════════════════════════════════════════════════
 * THE CONCOURSE — the player board
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * DIRECTION CONTRACT (impeccable). The world is not new and no roll was taken:
 * THE CONCOURSE is the committed world of this route, already carrying the
 * collection book (DESIGN.md §9) and the leaderboard, and the owner pinned this
 * surface's composition directly — one board, two columns, no tabs. A concept
 * tournament over a structure the owner has just chosen is a tournament with a
 * predetermined loser.
 *
 * THESIS: a profile is a player's record, not a business card. It refuses what
 * this surface shipped for a year — a 520px column of bordered tiles behind two
 * tabs, where the same four figures appeared under both of them and the numbers
 * that answered a real question (how long have I been waiting, what have I
 * actually pulled lately) appeared under neither.
 *
 * OWN-WORLD: the deck's blue-hour ramp under SURFACE_NOISE, edges made of rail
 * light rather than borders, station amber as the one signal, Barlow Condensed
 * in caps on split-flap drums, the seven locked tier hues. No radius, no card.
 *
 * STORY: the reader — the player themselves, or a visitor arriving from the
 * leaderboard — reads one identity, then splits: the case on the left (what
 * this player chose to show), the record on the right (what they have actually
 * done). They leave knowing something the old profile never said: which tier is
 * overdue, and what this player pulled last.
 *
 * FIRST VIEWPORT: the head — avatar in its prestige ring, the name on drums,
 * five figures in two registers over the platform line — then the two columns
 * beneath it, the register's ruled tier rows leading the right.
 *
 * FORM: two columns, no tabs (owner-pinned from three options, 2026-08-21).
 *
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the
 * finish review, the verdict, and DESIGN.md.
 *
 * ── ONE BOARD, BOTH JOBS ─────────────────────────────────────────────────────
 *
 * The owner's first call. This surface is your own record AND the card a
 * stranger opens from the leaderboard, and those used to be argued as two
 * designs. They are one board with a lens on the reader: the structure, the
 * columns and every figure are identical, and `isOwnProfile` adds edit
 * affordances rather than rearranging anything. It is the same principle
 * prestige proved on the collection board — a lens, not a second board — and it
 * means there is exactly one profile to keep right.
 *
 * What genuinely differs is what the API will answer. `/api/stats/me` and
 * `/api/stats/rankings/:id` are session-gated, so a visitor's board has no best
 * day and no rank-against-the-field. Those are absent, never zeroed: an absence
 * is a dash, which is the rule this route already writes down twice.
 *
 * ── WHAT `*_count` ACTUALLY MEANS, WHICH THE OLD PROFILE GOT WRONG ───────────
 *
 * `profile.mythic_count` is `SUM(count)` over the tier — every COPY ever pulled,
 * duplicates included. The old board printed it under the word "Mythic" beside a
 * completion percentage, so a player who had pulled the same mythic eleven times
 * read "11" on a tier holding four items and could reasonably conclude they had
 * eleven of four. The register separates the two questions it was answering at
 * once: HELD is unique items over the tier's total, PULLED is copies.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL, IMAGE_BASE_URL, CUSTOM_IMAGE_BASE_URL } from '../../../config/constants.js';
import { DECK, rail } from '../config/constants';
import { getMinecraftHeadUrl } from '../../../utils/helpers.js';
import {
    RARITY, RARITY_KEYS, getRarityColor, getRarityInk, getRarityOnColor,
    getRarityStops, getRarityIcon, isIridescentRarity,
} from '../../../utils/rarityHelpers.jsx';
import {
    prestigeLabel, prestigeColor, prestigeInk, prestigeIcon,
    isIridescentPrestige, prestigeStanding,
} from '../../../utils/prestigeHelpers.js';
import { FlapText, BoardLabel, RowLamp, BoardMeter, Plinth } from './collection/FlapBoard.jsx';
import { PrestigeRing } from '../spin/StageFlanks.jsx';
import { useWheelViewport } from '../config/breakpoints.js';
import { Achievements } from './Achievements.jsx';
import { LuckInfoModal } from '../modals/LuckInfoModal.jsx';
import { CollectionBook } from './CollectionBook.jsx';
import {
    X, Trophy, Edit3, Plus, Check, HelpCircle, BookOpen, Crown,
} from 'lucide-react';
import { AchievementIcon } from '../../../utils/achievementIcons.jsx';

/**
 * The tiers that go into a collection: everything on the ladder except `common`
 * (not a special item) and `event` (a bonus-wheel trigger, never collected).
 */
const COLLECTABLE_TIERS = RARITY_KEYS.filter(key => key !== 'common' && key !== 'event');

/** Zeroed counts for every collectable tier — the initial state for both counters. */
const EMPTY_TIER_COUNTS = Object.fromEntries(COLLECTABLE_TIERS.map(key => [key, 0]));

/*
 * Insane is exempt from the overdue claim, exactly as it is on the collection
 * board. One item at 0.000001% makes the expectation larger than any account's
 * lifetime spin count, so the board says nothing rather than lighting a lamp
 * that can never go out.
 */
const NO_STREAK = new Set(['insane']);

/* A prestige level is worn as a numeral: "II" reads as a rank where "2" reads as
   a quantity, and it sits beside counts that are quantities. */
/*
 * One number format, forced to en-US — the rule the leaderboard learned when a
 * German machine printed "331.955" two panels from the collection board's
 * "331,955". PRODUCT.md commits the site to English, so this is a constant.
 */
const fmt = n => (typeof n === 'number' && isFinite(n) ? n : Number(n) || 0).toLocaleString('en-US');

/** A board date: short, tracked, and the same shape the collection board uses. */
const fmtDate = iso => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d)) return null;
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
};

const fmtMonth = iso => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d)) return null;
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
};

export function UserProfile({ userId, onClose, isOwnProfile, onEditUsername }) {
    const [profile, setProfile] = useState(null);
    const [extendedStats, setExtendedStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showLuckInfoModal, setShowLuckInfoModal] = useState(false);
    const [rankings, setRankings] = useState({ spins: null, events: null });
    const [specialItems, setSpecialItems] = useState([]);
    const [specialItemTotals, setSpecialItemTotals] = useState(EMPTY_TIER_COUNTS);
    const [uniqueCollected, setUniqueCollected] = useState(EMPTY_TIER_COUNTS);
    const [showAchievements, setShowAchievements] = useState(false);
    const [showCollectionBook, setShowCollectionBook] = useState(false);
    const [collectionBookData, setCollectionBookData] = useState(null);

    // The collection itself, and its per-item detail. `details` is what makes
    // RECENT FINDS and the register's LAST PULL column possible at all — it
    // carries `firstObtained`, which the old profile's endpoint threw away when
    // it flattened the payload to texture → count.
    const [collection, setCollection] = useState({});
    const [details, setDetails] = useState({});

    // Showcase data
    const [badges, setBadges] = useState([]);
    const [showcase, setShowcase] = useState([]);
    const [userAchievements, setUserAchievements] = useState([]);
    const [achievementSummary, setAchievementSummary] = useState(null);
    const [userCollection, setUserCollection] = useState([]);
    const [prestige, setPrestige] = useState(null);

    // Edit modals
    const [showBadgeEditor, setShowBadgeEditor] = useState(false);
    const [showShowcaseEditor, setShowShowcaseEditor] = useState(false);
    const [pendingBadges, setPendingBadges] = useState([]);
    const [pendingShowcase, setPendingShowcase] = useState([]);

    /*
     * `hasFlanks` (1200px) is the two-column line, and it is measured rather
     * than chosen — the same way that constant was.
     *
     * `isPhone` (900px) is the wrong line for this board and shipping it that
     * way put a 135px-wide hole in the middle of the viewport range. At 900px
     * the board is 860 wide; take the gutters, the 336px case column and the
     * gap, and the register has 446px for tracks that need 506 before the tier
     * name gets a pixel. `minmax(0, 1fr)` floors at zero, so INSANE, MYTHIC and
     * LEGENDARY collapsed to nothing and spilled over the HELD column — which
     * is verbatim the failure the leaderboard already wrote down: a ranking
     * whose rows have no names is not a smaller ranking, it is a broken one.
     *
     * So the columns split at 1200 and everything from 900 to 1199 gets the
     * narrow layout, which is a real layout rather than a squeezed one.
     */
    const { isPhone, hasFlanks } = useWheelViewport();
    const twoColumn = hasFlanks;

    useEffect(() => {
        loadProfile();
    }, [userId]);

    /*
     * Escape closes the board, and the board is a dialog.
     *
     * This shipped with neither, though both siblings have them: Escape did
     * nothing, and a screen reader met an unlabelled run of content in the
     * middle of the wheel page rather than a named modal.
     *
     * ── WHY THE GUARD, AND NOT `stopPropagation` ─────────────────────────────
     *
     * The first version called `e.stopPropagation()` and believed that was
     * enough. It is not, and the failure is worth keeping: `CollectionBook`
     * binds its own Escape handler on **`window`, in the bubble phase**, and so
     * did this one — the same node in the same phase. `stopPropagation` governs
     * propagation BETWEEN nodes; it does nothing to a listener already
     * registered on the node you are standing on. So both ran, in registration
     * order, and because the profile mounts first, closing the collection book
     * with the keyboard closed the profile underneath it as well. Escape used to
     * cost a player one modal; for one build it cost them two.
     *
     * `stopImmediatePropagation` would silence the sibling, which is worse: the
     * board would be deciding for a surface it does not own. Instead the rule
     * stays in one place — the board's Escape is for the board, and while
     * anything of the board's is open on top of it, that thing owns the key.
     * Every child listed here either handles Escape itself or is dismissed by
     * its own controls.
     */
    const childOpen = showCollectionBook || showAchievements || showLuckInfoModal
        || showBadgeEditor || showShowcaseEditor;

    useEffect(() => {
        if (childOpen) return undefined;
        const onKey = e => {
            if (e.key !== 'Escape') return;
            onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, childOpen]);

    async function loadProfile() {
        try {
            // Batch all fetches together for better performance.
            //
            // `/api/collection/user/:id` replaced `/api/user/:id/collection`
            // here. The latter returns texture → count and nothing else; this
            // one returns the same map plus `collectionDetails`, which carries
            // the name, type and first-obtained timestamp of every held item.
            // Same round trip, three new panels.
            const fetchPromises = [
                fetch(`${API_BASE_URL}/api/user/${userId}/profile`),
                isOwnProfile
                    ? fetch(`${API_BASE_URL}/api/stats/me`, { credentials: 'include' })
                    : Promise.resolve(null),
                fetch(`${API_BASE_URL}/api/user/${userId}/badges`),
                fetch(`${API_BASE_URL}/api/user/${userId}/showcase`),
                isOwnProfile
                    ? fetch(`${API_BASE_URL}/api/stats/rankings/${userId}`, { credentials: 'include' })
                    : Promise.resolve(null),
                fetch(`${API_BASE_URL}/api/special-items`),
                fetch(`${API_BASE_URL}/api/collection/user/${userId}`),
                fetch(`${API_BASE_URL}/api/prestige/user/${userId}`),
                fetch(`${API_BASE_URL}/api/achievements/user/${userId}`),
            ];

            const [
                profileRes, statsRes, badgesRes, showcaseRes, rankingsRes,
                specialRes, collectionRes, prestigeRes, achievementsRes,
            ] = await Promise.all(fetchPromises);

            const profileData = await profileRes.json();
            setProfile(profileData);

            if (statsRes) {
                const statsData = await statsRes.json();
                setExtendedStats(statsData);
            }

            const badgesData = await badgesRes.json();
            setBadges(badgesData.badges || []);

            const showcaseData = await showcaseRes.json();
            setShowcase(showcaseData.showcase || []);

            // Process rankings if available
            if (rankingsRes && rankingsRes.ok) {
                const rankingsData = await rankingsRes.json();
                setRankings(rankingsData);
            }

            // Prestige is a pure UI job here — the endpoint has been public since
            // the collection board shipped it, and this was the last surface not
            // wearing the level.
            if (prestigeRes && prestigeRes.ok) {
                setPrestige(await prestigeRes.json());
            }

            if (achievementsRes && achievementsRes.ok) {
                const a = await achievementsRes.json();
                setUserAchievements(a.unlocked || []);
                setAchievementSummary({
                    total: a.totalAchievements ?? null,
                    hiddenUnlocked: a.hiddenUnlockedCount ?? 0,
                });
            }

            // Get special items and collection for completion tracking
            const specialData = await specialRes.json();
            const items = specialData.items || [];
            setSpecialItems(items);

            // Per tier, from the shared ladder rather than four hand-written
            // filters — which is why exotic was missing from both objects and its
            // completion condition could never evaluate true.
            const byTier = Object.fromEntries(
                COLLECTABLE_TIERS.map(key => [key, items.filter(i => i.rarity === key)])
            );
            setSpecialItemTotals(
                Object.fromEntries(COLLECTABLE_TIERS.map(key => [key, byTier[key].length]))
            );

            const collectionData = await collectionRes.json();
            const userCollectionMap = collectionData.collection || {};
            setCollection(userCollectionMap);
            setDetails(collectionData.collectionDetails || {});

            setUniqueCollected(Object.fromEntries(COLLECTABLE_TIERS.map(key => [
                key,
                byTier[key].filter(item => userCollectionMap[item.texture] > 0).length,
            ])));
        } catch (e) {
            console.error('Failed to load profile:', e);
        } finally {
            setLoading(false);
        }
    }

    async function loadAchievementsForEditor() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/achievements/me`, { credentials: 'include' });
            const data = await res.json();
            setUserAchievements(data.unlocked || []);
            setPendingBadges(badges.map(b => b.id));
        } catch (e) {
            console.error('Failed to load achievements:', e);
        }
    }

    async function loadCollectionForEditor() {
        try {
            // Fetch both collection and special items data
            const [collectionRes, specialRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/collection`, { credentials: 'include' }),
                fetch(`${API_BASE_URL}/api/special-items`)
            ]);

            const collectionData = await collectionRes.json();
            const specialData = await specialRes.json();

            // Create lookup map for special items (username, image_url)
            const specialItemsMap = {};
            (specialData.items || []).forEach(item => {
                specialItemsMap[item.texture] = {
                    username: item.username,
                    image_url: item.image_url
                };
            });

            // Convert collectionDetails object to array and filter for special items only
            const collectionDetails = collectionData.collectionDetails || {};
            const items = Object.entries(collectionDetails)
                .map(([texture, info]) => ({
                    item_texture: texture,
                    item_name: info.name,
                    item_type: info.type,
                    count: info.count,
                    username: specialItemsMap[texture]?.username,
                    image_url: specialItemsMap[texture]?.image_url
                }))
                .filter(item => COLLECTABLE_TIERS.includes(item.item_type) || item.item_type === 'event');

            // Rarest first, off the shared ladder rather than a private order map
            // — the same reason every other tier list on this route reads from
            // RARITY_KEYS.
            const order = key => {
                const i = RARITY_KEYS.indexOf(key);
                return i < 0 ? RARITY_KEYS.length : i;
            };
            setUserCollection(items.sort((a, b) => order(a.item_type) - order(b.item_type)));
            setPendingShowcase(showcase.map(s => s.item_texture));
        } catch (e) {
            console.error('Failed to load collection:', e);
        }
    }

    async function saveBadges() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/badges/me`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ badges: pendingBadges })
            });
            const data = await res.json();
            if (data.badges) {
                setBadges(data.badges);
            }
            setShowBadgeEditor(false);
        } catch (e) {
            console.error('Failed to save badges:', e);
        }
    }

    async function saveShowcase() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/showcase/me`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ items: pendingShowcase })
            });
            const data = await res.json();
            if (data.showcase) {
                setShowcase(data.showcase);
            }
            setShowShowcaseEditor(false);
        } catch (e) {
            console.error('Failed to save showcase:', e);
        }
    }

    async function loadCollectionBook() {
        try {
            const itemsRes = await fetch(`${API_BASE_URL}/api/items`);
            const itemsData = await itemsRes.json();

            /*
             * The book gets EVERY held row, not just the specials.
             *
             * This is the whole payload from `/collection/user/:id`, with the
             * special items' own metadata (the player head or custom artwork)
             * merged over the rows that have it. The first version projected
             * `specialItems` instead, which is 28 of appa's 1,559 items — and the
             * book marks an item held from `collection` but prints its plaque
             * from `collectionDetails`, so every common rendered as held in the
             * grid and then said "Copies held 0 · First pull —" one click later.
             * The old profile did the same thing; it survived because nothing
             * else here had the details to do better.
             *
             * It also restores `isLucky` / `isGoldRush`, which the plaque's
             * gold-rush row has never once seen on a profile-opened book.
             */
            const byTexture = new Map(specialItems.map(i => [i.texture, i]));
            const bookDetails = Object.fromEntries(
                Object.entries(details).map(([texture, d]) => {
                    const special = byTexture.get(texture);
                    return [texture, {
                        ...d,
                        name: d.name || special?.name,
                        type: d.type || special?.rarity,
                        username: special?.username,
                        image_url: special?.image_url,
                    }];
                })
            );

            setCollectionBookData({
                collection,
                collectionDetails: bookDetails,
                // CollectionBook's Spin Stats panel reads camelCase totalSpins/*Count.
                stats: {
                    totalSpins: profile?.total_spins || 0,
                    insaneCount: profile?.insane_count || 0,
                    mythicCount: profile?.mythic_count || 0,
                    legendaryCount: profile?.legendary_count || 0,
                    exoticCount: profile?.exotic_count || 0,
                    rareCount: profile?.rare_count || 0,
                    eventTriggers: profile?.event_triggers || 0,
                    totalDuplicates: profile?.total_duplicates || 0
                },
                dryStreaks: profile?.dry_streaks || null,
                allItems: itemsData.items || [],
                dynamicItems: specialItems,
            });
            setShowCollectionBook(true);
        } catch (e) {
            console.error('Failed to load collection book:', e);
        }
    }

    function toggleBadge(achievementId) {
        setPendingBadges(prev => {
            if (prev.includes(achievementId)) {
                return prev.filter(id => id !== achievementId);
            } else if (prev.length < 3) {
                return [...prev, achievementId];
            }
            return prev;
        });
    }

    /*
     * The showcase is a LIST of three picks, not a set of three items.
     *
     * Three copies of the same item is a legitimate showcase — and for a player
     * who has pulled the same insane three times, the one they want. Every guard
     * here is therefore per-copy: you may add a copy while you still hold one
     * that is not already on show and a slot is free. `user_showcase` allows the
     * duplicate rows (the constraint was changed for exactly this) and the POST
     * takes the array as it stands.
     */
    function addShowcaseItem(texture, ownedCount = 1) {
        setPendingShowcase(prev => {
            const currentCount = prev.filter(t => t === texture).length;
            if (prev.length < 3 && currentCount < ownedCount) {
                return [...prev, texture];
            }
            return prev;
        });
    }

    /*
     * Removal is by SLOT, not by item — the one deliberate change from the
     * profile this replaced, which cleared every copy of an item at once. A
     * reader who has just placed three of something and wants two back was, in
     * that model, obliged to start again.
     */
    function removeShowcaseSlot(index) {
        setPendingShowcase(prev => prev.filter((_, i) => i !== index));
    }

    function getDiscordAvatarUrl(discordId, avatarHash, size = 128) {
        if (!discordId) return 'https://cdn.discordapp.com/embed/avatars/0.png';
        if (avatarHash) {
            const format = avatarHash.startsWith('a_') ? 'gif' : 'png';
            return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${format}?size=${size}`;
        }
        try {
            const defaultIndex = Number(BigInt(discordId) >> 22n) % 6;
            return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
        } catch {
            return 'https://cdn.discordapp.com/embed/avatars/0.png';
        }
    }

    /*
     * Where a player stands on luck, as a word.
     *
     * The five-step colour ramp this used to carry — spring green, green, gold,
     * orange, red — was a sixth palette on a surface with a locked one, and its
     * top step was a hue that appears nowhere else on the route. Luck is not a
     * rarity and has no tier, so it takes the board's own signal: amber when the
     * player is running above the field, ordinary ink when they are not. The
     * figure and the percentile carry the rest, and both are on screen.
     */
    function luckStanding(rating, percentile) {
        if (!rating) return { tone: DECK.inkDim, label: null };
        if (percentile == null) return { tone: DECK.inkMid, label: 'Calculating' };

        const top = 100 - percentile;
        const label = top <= 1 ? 'Top 1%'
            : top <= 5 ? 'Top 5%'
            : top <= 10 ? 'Top 10%'
            : top <= 25 ? 'Top 25%'
            : top <= 50 ? 'Top 50%'
            : 'Bottom 50%';

        return { tone: top <= 25 ? DECK.amber : DECK.inkMid, label };
    }

    /* A rank against the field, or null. Never a zero — see the module header. */
    function standingText(r) {
        if (!r) return null;
        if (r.rank <= 10) return `#${r.rank}`;
        if (r.percentile == null) return null;
        return r.percentile >= 50 ? `Top ${100 - r.percentile}%` : `Bottom ${r.percentile}%`;
    }

    function getShowcaseImageUrl(item) {
        if (!item) return `${IMAGE_BASE_URL}/barrier.png`;

        // Custom image URL (e.g., from database)
        if (item.image_url) {
            return item.image_url;
        }

        // Mythic items without username - use constants
        if (item.item_type === 'mythic' && !item.username) {
            // Check for known mythics
            if (item.item_texture === 'mythic_cavendish') {
                return `${CUSTOM_IMAGE_BASE_URL}/cavendish.png`;
            }
            if (item.item_texture === 'mythic_jimbo') {
                return '/jimbo.png';
            }
            // Fallback for unknown mythics
            return `${CUSTOM_IMAGE_BASE_URL}/cavendish.png`;
        }

        // Player heads (legendaries and rares with usernames)
        if (item.username) {
            return getMinecraftHeadUrl(item.username);
        }

        // Event items
        if (item.item_type === 'event') {
            return '/event.png';
        }

        // Fallback to texture-based URL (shouldn't reach here for special items)
        return `${IMAGE_BASE_URL}/${item.item_texture}.png`;
    }

    /* ── The register ─────────────────────────────────────────────────────────
     *
     * One ruled row per tier, rarest first. Everything in it is read off data
     * this board already had; what is new is that HELD and PULLED are separated,
     * that the wait has a number, and that the number is checkable.
     */
    const register = useMemo(() => COLLECTABLE_TIERS.map(key => {
        const items = specialItems.filter(i => i.rarity === key);
        if (items.length === 0) return null;

        const held = uniqueCollected[key] || 0;
        const total = specialItemTotals[key] || items.length;
        // Copies, not items. See the header: this is the figure the old profile
        // printed under the tier's own name.
        const pulled = profile?.[`${key}_count`] || 0;

        let last = null;
        for (const i of items) {
            const at = details?.[i.texture]?.firstObtained;
            if (at && (!last || new Date(at) > new Date(last))) last = at;
        }

        // Expected spins between pulls = 1 / (the tier's summed chance).
        //
        // `chance` is a FRACTION, not a percentage. The collection board was
        // written against the percentage reading first and every expectation came
        // out a hundred times too large — "one costs about 1,111,111 spins" for a
        // tier the player had completed three times over. Same data, same
        // arithmetic, same trap.
        const chanceSum = items.reduce((sum, i) => sum + (Number(i.chance) || 0), 0);
        const expected = chanceSum > 0 ? Math.round(1 / chanceSum) : null;
        // `?? null`, never `?? 0`: a row of zeros is the most optimistic thing a
        // dry-streak column can say — it renders "you just pulled one" for every
        // tier and no tier can ever be overdue.
        const since = NO_STREAK.has(key) ? null : (profile?.dry_streaks?.[key] ?? null);
        const overdue = expected != null && since != null && since > expected;

        // Complete outranks overdue, and they are not the same claim: a tier you
        // have finished is not overdue for anything you still need, but the wait
        // is still true and still belongs on the SINCE figure.
        const status = held >= total ? 'complete'
            : held === 0 ? 'empty'
            : overdue ? 'overdue'
            : 'tracking';

        return {
            key, label: RARITY[key].label,
            tone: getRarityColor(key), ink: getRarityInk(key),
            held, total, pulled, last, since, expected, overdue, status,
        };
    }).filter(Boolean), [specialItems, uniqueCollected, specialItemTotals, profile, details]);

    /*
     * RECENT FINDS — the five specials this player discovered most recently.
     *
     * `firstObtained` is the timestamp of the FIRST copy, so this is a list of
     * discoveries and the panel says "found", not "pulled". A duplicate does not
     * move an item up this list, and claiming otherwise would be the easiest
     * false sentence on the board to write.
     */
    const recentFinds = useMemo(() => {
        const specials = new Set(specialItems.map(i => i.texture));
        const byTexture = new Map(specialItems.map(i => [i.texture, i]));

        return Object.entries(details)
            .filter(([texture, d]) => specials.has(texture) && d.firstObtained)
            .sort((a, b) => new Date(b[1].firstObtained) - new Date(a[1].firstObtained))
            .slice(0, 5)
            .map(([texture, d]) => ({
                texture,
                name: d.name || byTexture.get(texture)?.name || texture,
                type: d.type || byTexture.get(texture)?.rarity,
                at: d.firstObtained,
                count: d.count,
                item: {
                    item_texture: texture,
                    item_type: d.type || byTexture.get(texture)?.rarity,
                    username: byTexture.get(texture)?.username,
                    image_url: byTexture.get(texture)?.image_url,
                },
            }));
    }, [details, specialItems]);

    if (loading) {
        return (
            <div style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1100,
            }}>
                <BoardLabel size={13} tone={DECK.inkDim}>Reading the board…</BoardLabel>
            </div>
        );
    }

    /*
     * A board that could not be read says so.
     *
     * This called `onClose()` from inside render — which React warns about as
     * updating another component mid-render, and which the player experiences
     * as clicking a leaderboard row and having nothing happen at all. An error
     * with no recovery is not an error state; it is a disappearance.
     */
    if (!profile) {
        return (
            <div
                onClick={(e) => e.target === e.currentTarget && onClose()}
                role="dialog"
                aria-modal="true"
                aria-label="Player board"
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1100, padding: '20px',
                }}
            >
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '14px',
                    padding: '26px', backgroundImage: DECK.face,
                    boxShadow: `inset 0 1px 0 ${rail(0.12)}, 0 32px 80px rgba(0,0,0,0.65)`,
                }}>
                    <FlapText text="Board unreadable" size={22} tone={DECK.ink} weight={800} />
                    <BoardLabel tone={DECK.inkMid}>
                        This player&apos;s record could not be loaded
                    </BoardLabel>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <Plinth
                            as="button"
                            className="fib-board-hit"
                            onClick={() => { setLoading(true); loadProfile(); }}
                            style={{ padding: '0 14px', height: '32px', display: 'flex', alignItems: 'center', color: DECK.amber }}
                        ><BoardLabel tone="currentColor">Try again</BoardLabel></Plinth>
                        <Plinth
                            as="button"
                            className="fib-board-hit"
                            onClick={onClose}
                            style={{ padding: '0 14px', height: '32px', display: 'flex', alignItems: 'center', color: DECK.inkMid }}
                        ><BoardLabel tone="currentColor">Close</BoardLabel></Plinth>
                    </div>
                </div>
            </div>
        );
    }

    /*
     * `total_possible` is the pool length plus the active specials, and the pool
     * is a network fetch of the mcmeta registry — the single field on this board
     * most likely to arrive as 0. Unguarded it printed "NAN%" on the head's
     * drums (every one of N, A and N is on the drum, so it shuffled cheerfully
     * into place) and handed `scaleX(NaN)` to the platform line, which kills it.
     */
    const completionPercent = profile.total_possible > 0
        ? (profile.unique_items / profile.total_possible) * 100
        : null;
    const luckRating = profile.luckRating || extendedStats?.luckRating;
    const luck = luckStanding(luckRating?.rating, luckRating?.percentile);
    const luckiestDay = extendedStats?.luckiestDay;

    // Tiers the player has finished, rarest first. `total > 0` guards the window
    // before the special-items request lands, when both sides are 0 and every
    // tier would otherwise read as complete.
    const completedTiers = COLLECTABLE_TIERS.filter(
        key => specialItemTotals[key] > 0 && uniqueCollected[key] >= specialItemTotals[key]
    );

    const standing = prestigeStanding(prestige);
    const specialsHeld = COLLECTABLE_TIERS.reduce((n, k) => n + (uniqueCollected[k] || 0), 0);
    const specialsPulled = COLLECTABLE_TIERS.reduce((n, k) => n + (profile[`${k}_count`] || 0), 0);
    const avgBetween = specialsPulled > 0 && profile.total_spins >= 10
        ? Math.round(profile.total_spins / specialsPulled)
        : null;

    /* The head's two registers, at a 1.35 size ratio — the same two-tier trick
       the collection board settled on. Three figures about HOLDING lead; three
       about SPINNING support. Six equal drums put two five-digit numbers side by
       side at identical weight and the eye could not separate them. */
    const holdFigures = [
        { label: 'Held', value: fmt(profile.unique_items), tone: DECK.ink },
        {
            label: 'Complete',
            value: completionPercent == null ? '—' : `${completionPercent.toFixed(1)}%`,
            tone: completionPercent == null ? DECK.inkDim : DECK.amber,
        },
        { label: 'Specials', value: fmt(specialsHeld), tone: DECK.ink },
    ];
    const spinFigures = [
        { label: 'Spins', value: fmt(profile.total_spins) },
        { label: 'Duplicates', value: fmt(profile.total_duplicates) },
        { label: 'Events', value: fmt(profile.event_triggers) },
    ];

    // Lamp / tier / held / pulled / meter / last / since / status.
    //
    // The phone drops PULLED, the meter and LAST PULL — every one of them is
    // derivable or decorative — and keeps SINCE, which is derivable from
    // nothing. That is the collection board's rule applied to this register.
    //
    // The name track has a FLOOR and the meter FLEXES, both copied from the
    // collection board's own template rather than reinvented. A floorless
    // `minmax(0, 1fr)` beside seven rigid tracks does not degrade when the
    // column narrows — it vanishes, taking every tier name with it — and a
    // rigid meter is what leaves it nothing to give back.
    //
    // The phone floor is 56 and not 72 because 320px is still a viewport: at
    // 72 the five tracks and their gaps need 302px against the 288 an SE leaves
    // after the gutters, and a register that overflows by fourteen pixels is a
    // register with a horizontal scrollbar.
    const registerColumns = isPhone
        ? '10px minmax(56px, 1fr) 58px 52px 62px'
        : '10px minmax(92px, 1fr) 72px 62px minmax(56px, 0.6fr) 60px 58px 74px';

    const gutter = isPhone ? '16px' : '26px';

    // A drum's cell is ~0.62em wide plus a 2px gap, so a name's width is close
    // to length × (0.62 × size + 2). Four steps, and the top one exists for a
    // real case rather than a hypothetical: Discord permits 32 characters, and
    // at three steps a 32-character name still measured ~352px against the ~324
    // a phone head has left after the avatar — enough to push the close button
    // off the row, because a drum neither wraps nor ellipsises.
    const nameLength = (profile.custom_username || 'Player').length;
    const nameSize = (isPhone ? [24, 19, 15, 12] : [34, 26, 20, 16])[
        nameLength > 26 ? 3 : nameLength > 20 ? 2 : nameLength > 12 ? 1 : 0
    ];

    return (
        <div
            onClick={(e) => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-label={`${profile.custom_username || 'Player'}'s player board`}
            style={{
                position: 'fixed', inset: 0,
                // The scrim ladder's middle step, matching the collection board
                // and the leaderboard: this pushes the stage back behind a plaque
                // rather than blacking it out.
                background: 'rgba(0,0,0,0.8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1100,
                padding: isPhone ? 0 : '20px',
                animation: 'fadeIn 0.25s ease-out',
            }}
        >
            <div
                className="fib-board-scroll"
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '1180px',
                    height: isPhone ? '100%' : 'min(88vh, 860px)',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundImage: DECK.face,
                    // The board's three edges: a lit rail along the top, a front
                    // lip at the bottom, and the shadow that seats it on the scrim.
                    boxShadow: [
                        `inset 0 1px 0 ${rail(0.12)}`,
                        'inset 0 -2px 0 rgba(0,0,0,0.55)',
                        `inset 0 -3px 0 ${rail(0.09)}`,
                        '0 32px 80px rgba(0,0,0,0.65)',
                    ].join(', '),
                    overflow: 'hidden',
                }}
            >
                {/* ── THE HEAD ────────────────────────────────────────────── */}
                <div style={{
                    position: 'relative',
                    flex: '0 0 auto',
                    padding: isPhone ? `16px ${gutter} 0` : `24px ${gutter} 0`,
                    backgroundImage: `linear-gradient(180deg, ${DECK.sky} 0%, transparent 78%)`,
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'flex-start',
                        justifyContent: 'space-between', gap: '16px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                            {/* The ring is the same component the leaderboard and
                                the stage wear, so a player carries one mark
                                everywhere. Earned and in-progress rings are
                                deliberately identical — the owner rejected both
                                attempts to distinguish them, and a player mid-run
                                reads as prestiged because they are. */}
                            <PrestigeRing standing={standing}>
                                <img
                                    src={getDiscordAvatarUrl(profile.discord_id, profile.discord_avatar, 256)}
                                    alt=""
                                    width={isPhone ? 56 : 68}
                                    height={isPhone ? 56 : 68}
                                    style={{
                                        display: 'block',
                                        borderRadius: '50%',
                                        background: DECK.faceDeep,
                                        objectFit: 'cover',
                                    }}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                    }}
                                />
                            </PrestigeRing>

                            <div style={{ minWidth: 0 }}>
                                {/* A drum cannot shrink and does not wrap, so a
                                    long name is sized down rather than allowed
                                    to run into the prestige chip and the close
                                    button. Discord allows 32 characters; the
                                    board's own players sit around 8. */}
                                <FlapText
                                    text={profile.custom_username || 'Player'}
                                    size={nameSize}
                                    tone={DECK.ink}
                                    weight={800}
                                    plate
                                />
                                <div style={{
                                    display: 'flex', alignItems: 'center', flexWrap: 'wrap',
                                    gap: '4px 14px', marginTop: '10px',
                                }}>
                                    {/* Qualified, because two other ranks for the
                                        same player sit 200px below it. This one
                                        is position in the default leaderboard
                                        order, which is collection size; the
                                        Record's are spins and events, and appa
                                        is 1st here and 2nd in both of those. An
                                        unqualified "Rank 1" beside them reads as
                                        one of the three being wrong. */}
                                    <BoardLabel tone={profile.rank === 1 ? DECK.amber : DECK.inkMid}>
                                        {typeof profile.rank === 'number' ? `Rank ${profile.rank} by collection` : 'Unranked'}
                                    </BoardLabel>
                                    <BoardLabel tone={DECK.inkDim}>
                                        Joined {fmtMonth(profile.created_at)}
                                    </BoardLabel>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
                            {/*
                              * The level, worn beside the ring — SPELLED OUT,
                              * because this head has the room for it.
                              *
                              * It was the tier's mark plus a Roman numeral, and
                              * the owner asked the obvious question: what does
                              * the "I" mean. Nothing the mark was not already
                              * saying. The level determines the icon, so ◇ and I
                              * are two spellings of "1" — the badge said it
                              * twice and explained it once, in a tooltip no
                              * phone can reach. Where a surface has room it now
                              * says "Rare Prestige"; where it does not, the mark
                              * stands alone and the numeral is gone entirely.
                              *
                              * The Crown belongs to the ACTION that starts a
                              * run, on the collection board; anything naming a
                              * specific level wears that level's own icon.
                              */}
                            {/* The phone gets the badge now too, where it used to
                                get nothing: a mark alone is 36px square, which
                                the row it could not carry a worded chip in has
                                always had. */}
                            {standing.level > 0 && (
                                <span
                                    className={isIridescentPrestige(standing.level) ? 'fib-holo' : undefined}
                                    title={`${prestigeLabel(standing.level)}${standing.earned ? '' : ' — in progress'}`}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                                        height: '36px', flex: '0 0 auto',
                                        padding: isPhone ? 0 : '0 12px',
                                        width: isPhone ? '36px' : undefined,
                                        background: isIridescentPrestige(standing.level)
                                            ? undefined
                                            : `${prestigeColor(standing.level)}22`,
                                        boxShadow: `inset 0 -2px 0 ${prestigeColor(standing.level)}`,
                                        color: isIridescentPrestige(standing.level)
                                            ? '#1a1a1a'
                                            : prestigeInk(standing.level),
                                    }}
                                >
                                    {prestigeIcon(standing.level, 13)}
                                    {/* The phone has no room for the word, so it
                                        carries the name as the accessible name
                                        instead. The qualifier trails the label in
                                        BOTH cases — it read "— in progress Rare
                                        Prestige" for one build, which is the
                                        sentence backwards. */}
                                    {isPhone
                                        ? <span className="fib-sr-only">{prestigeLabel(standing.level)}</span>
                                        : <BoardLabel tone="currentColor">{prestigeLabel(standing.level)}</BoardLabel>}
                                    {!standing.earned && (
                                        <span className="fib-sr-only"> — in progress</span>
                                    )}
                                </span>
                            )}

                            {/*
                              * The two ways out of this board live in the HEAD,
                              * because the head is the only part of it that
                              * never scrolls.
                              *
                              * They were an "Elsewhere" panel at the bottom of
                              * the case column, under the completion banners —
                              * so the reader who had most reason to go and look
                              * at a collection, the one who had finished five
                              * tiers, was the reader who had to scroll past five
                              * banners to find the button. The panel got further
                              * away the more the player had done. Reported.
                              *
                              * They belong here on their own terms too: these
                              * act on the whole board, which is what this row is
                              * for, and it is where both sibling boards keep
                              * theirs.
                              */}
                            <Plinth
                                as="button"
                                className="fib-board-hit"
                                onClick={loadCollectionBook}
                                aria-label={`Open ${isOwnProfile ? 'your' : profile.custom_username + '’s'} collection board`}
                                title={isPhone ? 'Collection board' : undefined}
                                style={{
                                    height: '36px',
                                    padding: isPhone ? 0 : '0 12px',
                                    width: isPhone ? '36px' : undefined,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                                    color: DECK.inkMid,
                                }}
                            >
                                <BookOpen size={14} />
                                {!isPhone && <BoardLabel tone="currentColor">Collection</BoardLabel>}
                            </Plinth>
                            <Plinth
                                as="button"
                                className="fib-board-hit"
                                onClick={() => setShowAchievements(true)}
                                aria-label={`Open ${isOwnProfile ? 'your' : profile.custom_username + '’s'} achievements`}
                                title={isPhone ? 'Achievements' : undefined}
                                style={{
                                    height: '36px',
                                    padding: isPhone ? 0 : '0 12px',
                                    width: isPhone ? '36px' : undefined,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                                    color: DECK.inkMid,
                                }}
                            >
                                <Trophy size={14} />
                                {!isPhone && <BoardLabel tone="currentColor">Achievements</BoardLabel>}
                            </Plinth>

                            {isOwnProfile && onEditUsername && (
                                <Plinth
                                    as="button"
                                    className="fib-board-hit"
                                    onClick={onEditUsername}
                                    aria-label="Change your username"
                                    style={{
                                        width: '36px', height: '36px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: DECK.inkMid,
                                    }}
                                ><Edit3 size={14} /></Plinth>
                            )}
                            <Plinth
                                as="button"
                                className="fib-board-hit"
                                onClick={onClose}
                                aria-label="Close the profile"
                                style={{
                                    width: '36px', height: '36px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: DECK.inkMid,
                                }}
                            ><X size={16} /></Plinth>
                        </div>
                    </div>

                    {/* The figures, in two registers. */}
                    <div style={{
                        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                        gap: '24px', margin: isPhone ? '14px 0 8px' : '20px 0 8px',
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: isPhone ? 'repeat(3, 1fr)' : 'repeat(3, auto)',
                            justifyContent: 'start',
                            flex: isPhone ? '1 1 auto' : '0 0 auto',
                        }}>
                            {holdFigures.map((f, i) => (
                                <div
                                    key={f.label}
                                    style={{
                                        padding: isPhone ? '0 12px' : '0 26px',
                                        boxShadow: i > 0 ? `inset 1px 0 0 ${rail(0.07)}` : undefined,
                                        ...(i === 0 ? { paddingLeft: 0 } : null),
                                    }}
                                >
                                    <FlapText
                                        text={f.value}
                                        size={isPhone ? 22 : 27}
                                        tone={f.tone}
                                        weight={700}
                                        plate
                                        delay={60 + i * 40}
                                    />
                                    <div style={{ marginTop: '7px' }}>
                                        <BoardLabel>{f.label}</BoardLabel>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {!isPhone && <SpinRegister figures={spinFigures} align="right" />}
                    </div>

                    {/* The platform line: the board's baseline, filled to the
                        collection's completion. It replaces the thin rounded
                        progress bar and needs no label — HELD and COMPLETE are
                        standing directly above it. */}
                    <BoardMeter
                        value={(completionPercent || 0) / 100}
                        tone={standing.level > 0 ? prestigeColor(standing.level) : DECK.amber}
                        height={3}
                    />

                    {isPhone && (
                        <div style={{ padding: '14px 0 2px' }}>
                            <SpinRegister figures={spinFigures} size={17} />
                        </div>
                    )}
                </div>

                {/* ── THE TWO COLUMNS ─────────────────────────────────────────
                    The case on the left, the record on the right. One scroller
                    for both, so the board scrolls as one object rather than
                    trapping a column — the nested-scroller problem the collection
                    board accepted only because its grid is a virtualised canvas
                    and this board has nothing that needs to be.

                    ── AND WHAT HAPPENS WHEN THERE IS ONLY ONE ──────────────────

                    Collapsing the grid to `1fr` in DOM order put the case first
                    and the record FIFTH: a narrow reader scrolled the showcase,
                    the badges, up to five completion banners and the two exit
                    buttons before reaching a single figure. The thesis of this
                    surface is that a profile is a record and not a business
                    card, and that layout led with the business card.

                    So the case is in two pieces. Identity — the showcase and the
                    badges — stays on top, because that is who the board is
                    about and it is three rows deep. The banners and the exits go
                    below the record, which is the half a reader came for.

                    ── AND WHY THERE IS NO `order` HERE ─────────────────────────

                    The DOM is written in the narrow reading order and the
                    desktop composition is made with grid AREAS, which place a
                    child regardless of where it sits in the markup. The first
                    version did the opposite — desktop DOM order, re-sorted on
                    narrow with `order: 0/1/2` — and `order` moves only the
                    paint: a keyboard or screen-reader user still got the two
                    exit buttons BEFORE the record while everyone else got them
                    after it. Two different reading orders for the same board, in
                    the one place a board must not have them. Areas cost the same
                    and cannot drift, because there is only one order to keep. */}
                <div
                    className="fib-board-scroll"
                    style={{
                        flex: '1 1 auto', minHeight: 0, overflowY: 'auto',
                        marginTop: isPhone ? '10px' : '14px',
                        // Cut one step deeper than the board it sits in — a
                        // recess, with the board's own edge as its top seam.
                        background: 'rgba(0,0,0,0.30)',
                        boxShadow: `inset 0 1px 0 ${rail(0.08)}`,
                    }}
                >
                    <div style={twoColumn ? {
                        display: 'grid',
                        gridTemplateColumns: '336px minmax(0, 1fr)',
                        gridTemplateAreas: '"caseTop record" "caseRest record"',
                        gridTemplateRows: 'auto 1fr',
                        alignItems: 'start',
                        gap: '0 26px',
                        padding: `6px ${gutter} 24px`,
                    } : {
                        display: 'flex',
                        flexDirection: 'column',
                        padding: `4px ${gutter} 20px`,
                    }}>
                        {/* ── THE CASE: IDENTITY ──────────────────────────── */}
                        <div style={{ minWidth: 0, gridArea: 'caseTop' }}>
                            <Panel
                                title="Showcase"
                                action={isOwnProfile && (
                                    <PanelAction
                                        onClick={() => { loadCollectionForEditor(); setShowShowcaseEditor(true); }}
                                        label="Edit showcase"
                                    ><Edit3 size={11} /> Edit</PanelAction>
                                )}
                            >
                                {/* Three mounts, in the platform's own grammar: a
                                    tier is a RIM around a square mount, not a
                                    shaft of light. DESIGN.md §9 records why that
                                    reversed, and the argument is even stronger
                                    here — three items standing still, on display,
                                    is the definition of a case.

                                    An empty slot is a recess only where it is an
                                    invitation. On your own board it says "there
                                    is room here" and opens the picker; on a
                                    visitor's it would be three empty recesses
                                    under a sentence already saying the case is
                                    empty, which is the same fact told twice and
                                    once as a control they cannot use. */}
                                {showcase.length === 0 && !isOwnProfile ? (
                                    <BoardLabel tone={DECK.inkDim}>Nothing on show</BoardLabel>
                                ) : (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {/* A visitor sees only what is on show.
                                            The stated rule — a recess is an
                                            invitation, and only your own board
                                            can accept one — was applied to the
                                            empty case and then not to the case
                                            holding one item, which left a
                                            visitor two dead recesses next to it. */}
                                        {(isOwnProfile ? [0, 1, 2] : showcase.map((_, i) => i)).map(idx => {
                                            const item = showcase[idx];
                                            if (item) {
                                                return (
                                                    <ShowcaseMount
                                                        key={`${item.item_texture}-${idx}`}
                                                        tier={item.item_type}
                                                        name={item.item_name}
                                                        src={getShowcaseImageUrl(item)}
                                                    />
                                                );
                                            }
                                            return (
                                                <ShowcaseMount
                                                    key={idx}
                                                    empty
                                                    onClick={() => { loadCollectionForEditor(); setShowShowcaseEditor(true); }}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </Panel>

                            <Panel
                                title="Badges"
                                action={isOwnProfile && (
                                    <PanelAction
                                        onClick={() => { loadAchievementsForEditor(); setShowBadgeEditor(true); }}
                                        label="Edit badges"
                                    ><Edit3 size={11} /> Edit</PanelAction>
                                )}
                            >
                                {/* A badge's name is a claim, and a claim may not
                                    live only in a `title` — unreachable on touch,
                                    unreliable for assistive tech, and this
                                    board's own §9 says so in as many words. The
                                    name is in the DOM for a screen reader and the
                                    tooltip stays for a mouse. Three anonymous
                                    glyphs was what the old profile had. */}
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {badges.length > 0 ? badges.map((badge, idx) => (
                                        <Plinth
                                            key={badge.id || idx}
                                            as="button"
                                            className="fib-board-hit"
                                            onClick={() => setShowAchievements(true)}
                                            title={badge.name}
                                            style={{
                                                width: '38px', height: '38px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: DECK.ink,
                                            }}
                                        >
                                            <span className="fib-sr-only">{badge.name}</span>
                                            <AchievementIcon name={badge.icon} size={16} color="currentColor" />
                                        </Plinth>
                                    )) : (
                                        <BoardLabel tone={DECK.inkDim}>
                                            {isOwnProfile ? 'None equipped' : 'No badges'}
                                        </BoardLabel>
                                    )}
                                </div>
                            </Panel>
                        </div>

                        {/* ── THE RECORD ──────────────────────────────────── */}
                        <div style={{ minWidth: 0, gridArea: 'record' }}>
                            <Panel title="Register">
                                <div style={{
                                    display: 'grid', gridTemplateColumns: registerColumns,
                                    alignItems: 'center', gap: '0 12px', padding: '0 0 8px',
                                }}>
                                    <span />
                                    <BoardLabel>Tier</BoardLabel>
                                    <BoardLabel style={{ textAlign: 'right' }}>Held</BoardLabel>
                                    {!isPhone && <BoardLabel style={{ textAlign: 'right' }}>Pulled</BoardLabel>}
                                    {!isPhone && <span />}
                                    {!isPhone && <BoardLabel style={{ textAlign: 'right' }}>Found</BoardLabel>}
                                    <BoardLabel style={{ textAlign: 'right' }}>Since</BoardLabel>
                                    <BoardLabel style={{ textAlign: 'right' }}>Status</BoardLabel>
                                </div>

                                {/* An empty register is the one panel here that
                                    had no empty state: if `/api/special-items`
                                    fails, the headings stood over nothing. */}
                                {register.length === 0 && (
                                    <div style={{ padding: '12px 0' }}>
                                        <BoardLabel tone={DECK.inkDim}>Tiers unavailable</BoardLabel>
                                    </div>
                                )}
                                {/* The empty line sits OUTSIDE the list: a
                                    `role="list"` whose only child is not a
                                    listitem is a malformed list, and an empty
                                    one is better expressed by having no list. */}
                                <div role={register.length > 0 ? 'list' : undefined}>
                                    {register.map((row, i) => {
                                        const statusWord = {
                                            complete: 'Complete', overdue: 'Overdue',
                                            empty: 'None held', tracking: 'Collecting',
                                        }[row.status];
                                        const statusTone = row.status === 'complete' ? row.ink
                                            : row.status === 'overdue' ? DECK.amber
                                            : DECK.inkMid;

                                        // The whole claim as one sentence, on the
                                        // row itself. A claim that lives only in a
                                        // `title` is unreachable on touch and
                                        // unreliable for assistive tech — the
                                        // collection board shipped the overdue
                                        // arithmetic that way for a build.
                                        const waitSentence = row.expected != null && row.since != null
                                            ? `${fmt(row.since)} spins since the last ${row.label}; one costs about ${fmt(row.expected)} spins on average`
                                            : null;

                                        return (
                                            <div
                                                key={row.key}
                                                /* `is-static` and it is not
                                                   cosmetic: on the collection
                                                   board this row's hover is the
                                                   affordance for a control that
                                                   filters the platform, and here
                                                   the row is a readout. Same
                                                   board, same lift under the
                                                   cursor, nothing behind it — a
                                                   reader who has learned the
                                                   sibling clicks five rows and
                                                   gets nothing. A listitem, so
                                                   the label below is still read
                                                   out. */
                                                className="fib-register-row is-static"
                                                role="listitem"
                                                aria-label={[
                                                    row.label,
                                                    `${fmt(row.held)} of ${fmt(row.total)} held`,
                                                    `${fmt(row.pulled)} pulled`,
                                                    waitSentence,
                                                    statusWord,
                                                ].filter(Boolean).join('. ')}
                                                style={{
                                                    display: 'grid', gridTemplateColumns: registerColumns,
                                                    alignItems: 'center', gap: '0 12px',
                                                    width: '100%', padding: isPhone ? '9px 0' : '12px 0',
                                                }}
                                            >
                                                <RowLamp
                                                    state={row.status === 'complete' ? 'lit' : row.overdue ? 'due' : 'dark'}
                                                    tone={row.tone}
                                                />
                                                {/* A tier with nothing held has
                                                    everything left to do and was
                                                    the quietest row on the old
                                                    board. The chase keeps its
                                                    ink. */}
                                                <FlapText
                                                    text={row.label}
                                                    size={isPhone ? 15 : 16}
                                                    tone={row.held > 0 ? row.ink : DECK.ink}
                                                    weight={700}
                                                    delay={280 + i * 55}
                                                />
                                                <FlapText
                                                    text={`${fmt(row.held)}/${fmt(row.total)}`}
                                                    size={15} tone={DECK.ink}
                                                    delay={300 + i * 55}
                                                    style={{ justifyContent: 'flex-end' }}
                                                />
                                                {!isPhone && (
                                                    <FlapText
                                                        text={fmt(row.pulled)} digits size={15}
                                                        tone={row.pulled > 0 ? DECK.inkMid : DECK.inkDim}
                                                        delay={315 + i * 55}
                                                        style={{ justifyContent: 'flex-end' }}
                                                    />
                                                )}
                                                {!isPhone && (
                                                    <BoardMeter
                                                        value={row.total > 0 ? row.held / row.total : 0}
                                                        tone={row.tone}
                                                        spent={row.status === 'complete'}
                                                    />
                                                )}
                                                {!isPhone && (
                                                    <FlapText
                                                        text={fmtDate(row.last) || '—'}
                                                        size={13} tone={DECK.inkDim} weight={600}
                                                        delay={330 + i * 55}
                                                        style={{ justifyContent: 'flex-end' }}
                                                    />
                                                )}
                                                <FlapText
                                                    text={row.since == null ? '—' : fmt(row.since)}
                                                    digits={row.since != null} size={15}
                                                    tone={row.overdue ? DECK.amber : DECK.inkMid}
                                                    delay={345 + i * 55}
                                                    style={{ justifyContent: 'flex-end' }}
                                                />
                                                <BoardLabel size={11} tone={statusTone} style={{ textAlign: 'right' }}>
                                                    {statusWord}
                                                </BoardLabel>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Panel>

                            <Panel title="Record">
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: isPhone ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                                    gap: '0',
                                }}>
                                    <RecordFigure
                                        label="Spins"
                                        value={fmt(profile.total_spins)}
                                        note={standingText(rankings.spins)}
                                        first
                                    />
                                    <RecordFigure
                                        label="Luck"
                                        value={luckRating?.rating != null ? String(luckRating.rating) : '—'}
                                        tone={luck.tone}
                                        note={luck.label}
                                        onInfo={luckRating ? () => setShowLuckInfoModal(true) : null}
                                    />
                                    <RecordFigure
                                        label="Events"
                                        value={fmt(profile.event_triggers)}
                                        note={standingText(rankings.events)}
                                        first={isPhone}
                                    />
                                    {/* "One special every N spins" is the honest
                                        reading of this number, and it is the
                                        wording the caption carries. The old card
                                        said "avg. between special finds" over a
                                        figure computed from COPIES, so a player
                                        with many duplicates read a gap shorter
                                        than their own finds justified. It counts
                                        copies still — that is what a spin
                                        produces — and now says so. */}
                                    <RecordFigure
                                        label="Per special"
                                        value={avgBetween != null ? `~${fmt(avgBetween)}` : '—'}
                                        note={avgBetween != null ? `${fmt(specialsPulled)} pulled` : null}
                                    />
                                </div>

                                {/* Own-profile only: /api/stats/me is session
                                    gated, so a visitor's board has no best day.
                                    Absent, never zeroed. */}
                                {luckiestDay && luckiestDay.spins > 0 && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', flexWrap: 'wrap',
                                        gap: '8px 18px', marginTop: '14px', paddingTop: '12px',
                                        boxShadow: `inset 0 1px 0 ${rail(0.06)}`,
                                    }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: DECK.amber }}>
                                            <Crown size={13} />
                                            <BoardLabel tone="currentColor">Best day</BoardLabel>
                                        </span>
                                        {/* `new Date('2026-08-14')` parses as
                                            UTC midnight and then prints in local
                                            time, so a reader east of UTC can see
                                            this dated a day behind what the
                                            register's own FOUND column says
                                            about the same event. Left as it is —
                                            it is one decorative line and every
                                            other date on the board goes through
                                            the same parse — but recorded so the
                                            next reader does not rediscover it. */}
                                        <BoardLabel size={13} tone={DECK.ink} style={{ letterSpacing: '0.03em' }}>
                                            {new Date(luckiestDay.date).toLocaleDateString('en-US', {
                                                weekday: 'short', month: 'short', day: 'numeric',
                                            })}
                                        </BoardLabel>
                                        <BoardLabel tone={DECK.inkDim}>{fmt(luckiestDay.spins)} spins</BoardLabel>
                                        <div style={{ display: 'flex', gap: '14px', marginLeft: 'auto' }}>
                                            {COLLECTABLE_TIERS.map(key => {
                                                const n = luckiestDay[`${key}_count`] || 0;
                                                if (n <= 0) return null;
                                                return (
                                                    <span key={key} style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                                        <BoardLabel size={13} tone={getRarityInk(key)} style={{ letterSpacing: '0.03em' }}>
                                                            {n}
                                                        </BoardLabel>
                                                        <BoardLabel>{RARITY[key].label}</BoardLabel>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </Panel>

                            {/* ── RECENT FINDS ─────────────────────────────── */}
                            <Panel title="Recent finds">
                                {recentFinds.length === 0 ? (
                                    <BoardLabel tone={DECK.inkDim}>No specials found yet</BoardLabel>
                                ) : (
                                    <div>
                                        {recentFinds.map((find, i) => (
                                            <div
                                                key={find.texture}
                                                className="fib-register-row is-static"
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '34px minmax(0, 1fr) auto 62px',
                                                    alignItems: 'center', gap: '0 12px',
                                                    padding: '9px 0',
                                                }}
                                            >
                                                <ShowcaseMount
                                                    tier={find.type}
                                                    name={find.name}
                                                    src={getShowcaseImageUrl(find.item)}
                                                    size={34}
                                                    quiet
                                                />
                                                <span style={{
                                                    fontFamily: "'Barlow Condensed', system-ui, sans-serif",
                                                    fontSize: '15px', fontWeight: 600,
                                                    letterSpacing: '0.03em',
                                                    color: getRarityInk(find.type),
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {find.name}
                                                </span>
                                                {/* Copies held, and it needs to
                                                    read as a figure rather than
                                                    as punctuation: at 10px in the
                                                    dimmest ink it sat against the
                                                    date as a smudge, and the two
                                                    were the same size. */}
                                                <BoardLabel size={11} tone={DECK.inkDim}>
                                                    {find.count > 1 ? `×${fmt(find.count)}` : ''}
                                                </BoardLabel>
                                                <FlapText
                                                    text={fmtDate(find.at) || '—'}
                                                    size={13} tone={DECK.inkMid} weight={600}
                                                    delay={380 + i * 40}
                                                    style={{ justifyContent: 'flex-end' }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Panel>

                            {/* ── ACHIEVEMENTS ─────────────────────────────────
                                On the board, not only behind a button. The old
                                profile's entire representation of achievements was
                                a 10px "Achievements" link, on a surface whose job
                                is showing what a player has done. */}
                            {/* No "View all" action on this panel. With the head
                                carrying a permanent Achievements button and every
                                mark below opening the same modal, a third control
                                doing one job is how a reader stops being sure any
                                of them does something different. */}
                            <Panel title="Achievements">
                                {userAchievements.length === 0 ? (
                                    <BoardLabel tone={DECK.inkDim}>None unlocked yet</BoardLabel>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '10px' }}>
                                            <FlapText
                                                text={achievementSummary?.total
                                                    ? `${fmt(userAchievements.length)}/${fmt(achievementSummary.total)}`
                                                    : fmt(userAchievements.length)}
                                                size={20} tone={DECK.ink} plate delay={400}
                                            />
                                            <BoardLabel tone={DECK.inkDim}>Unlocked</BoardLabel>
                                        </div>
                                        {/* Every mark opens the full list.
                                            An icon whose name lives in a tooltip
                                            and a screen-reader span is legible to
                                            a mouse and to assistive tech and to
                                            nobody on a phone — which is most of
                                            this site's readers, and half of what
                                            §9 objects to about a title-only
                                            claim. A tap now goes where the names
                                            are. It also makes each mark a tab
                                            stop, so the sr-only name is reachable
                                            by keyboard rather than only in browse
                                            mode. */}
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {userAchievements.slice(0, isPhone ? 8 : 12).map((a, idx) => (
                                                <Plinth
                                                    key={a.id || `hidden-${idx}`}
                                                    as="button"
                                                    className="fib-board-hit"
                                                    onClick={() => setShowAchievements(true)}
                                                    // A censored achievement is
                                                    // one this player earned and a
                                                    // visitor may not see the name
                                                    // of. It keeps its slot: the
                                                    // count would not add up
                                                    // otherwise, and "you have one
                                                    // I cannot see" is the honest
                                                    // state.
                                                    title={a.censored ? 'Hidden achievement' : a.name}
                                                    style={{
                                                        width: '34px', height: '34px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: a.censored ? DECK.inkDim : DECK.inkMid,
                                                    }}
                                                >
                                                    <span className="fib-sr-only">
                                                        {a.censored ? 'Hidden achievement' : a.name}
                                                    </span>
                                                    {a.censored
                                                        ? <HelpCircle size={14} />
                                                        : <AchievementIcon name={a.icon} size={15} color="currentColor" />}
                                                </Plinth>
                                            ))}
                                            {userAchievements.length > (isPhone ? 8 : 12) && (
                                                <span style={{ display: 'flex', alignItems: 'center', paddingLeft: '4px' }}>
                                                    <BoardLabel tone={DECK.inkDim}>
                                                        +{fmt(userAchievements.length - (isPhone ? 8 : 12))} more
                                                    </BoardLabel>
                                                </span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </Panel>
                        </div>
                        {/* ── THE CASE: WHAT IS FINISHED ──────────────────── */}
                        <div style={{ minWidth: 0, gridArea: 'caseRest' }}>
                            {/* ── THE BANNERS ──────────────────────────────────
                                Kept, and kept deliberately as they were.

                                They are the one thing the owner named as worth
                                saving from the old profile, so this is not the
                                place to demonstrate taste: the wash, the
                                medallion, the trophy, the shine sweep and the
                                wording are untouched. Only the corner radius
                                goes, because a radius here would be the only one
                                on the surface — and the border stays, which makes
                                this a deliberate, owner-pinned exception to THE
                                NOCTURNE's standing ban rather than an oversight
                                for a later pass to "fix". */}
                            {completedTiers.length > 0 && (
                                <Panel title="Completed collections">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {completedTiers.map(key => (
                                            <CompletionBanner
                                                key={key}
                                                rarity={key}
                                                total={specialItemTotals[key]}
                                            />
                                        ))}
                                    </div>
                                </Panel>
                            )}

                        </div>

                    </div>
                </div>
            </div>

            {/* ── BADGE EDITOR ──────────────────────────────────────────────── */}
            {showBadgeEditor && (
                <EditorSheet
                    title="Equip badges"
                    hint={`${pendingBadges.length} of 3 chosen`}
                    onCancel={() => setShowBadgeEditor(false)}
                    onSave={saveBadges}
                    isPhone={isPhone}
                >
                    {userAchievements.length === 0 ? (
                        <BoardLabel tone={DECK.inkDim}>No achievements unlocked yet</BoardLabel>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '8px' }}>
                            {userAchievements.filter(a => a.id).map(a => {
                                const picked = pendingBadges.includes(a.id);
                                return (
                                    <Plinth
                                        key={a.id}
                                        as="button"
                                        className="fib-board-hit"
                                        live={picked}
                                        aria-pressed={picked}
                                        onClick={() => toggleBadge(a.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            padding: '10px 12px', textAlign: 'left',
                                            color: picked ? DECK.ink : DECK.inkMid,
                                        }}
                                    >
                                        <AchievementIcon name={a.icon} size={16} color="currentColor" />
                                        <span style={{ minWidth: 0, flex: 1 }}>
                                            <BoardLabel size={11} tone="currentColor">{a.name}</BoardLabel>
                                        </span>
                                        {picked && <Check size={13} color={DECK.amber} />}
                                    </Plinth>
                                );
                            })}
                        </div>
                    )}
                </EditorSheet>
            )}

            {/* ── SHOWCASE EDITOR ───────────────────────────────────────────── */}
            {showShowcaseEditor && (
                <EditorSheet
                    title="Choose showcase items"
                    hint={`${pendingShowcase.length} of 3 chosen`}
                    onCancel={() => setShowShowcaseEditor(false)}
                    onSave={saveShowcase}
                    isPhone={isPhone}
                >
                    {/*
                      * THE THREE SLOTS, and they are the reason this sheet has
                      * two controls rather than one.
                      *
                      * A showcase holds three PICKS, not three distinct items —
                      * three Cavendishes is a legitimate and rather good
                      * showcase if you have pulled three. The first version of
                      * this sheet made one tile a toggle: click to add, click
                      * again to remove. That is a set, and a set cannot hold the
                      * same item twice, so a second copy became unreachable. The
                      * profile this replaced had it right by having two controls
                      * — the tile added, a separate mark removed — and losing
                      * that was a real regression, reported.
                      *
                      * So: the grid below ADDS a copy, and these slots REMOVE
                      * one. Removing by slot rather than by item is the one
                      * change kept from the rewrite — the old × cleared every
                      * copy at once, which is not what a reader who has just put
                      * three of something in wants from a control sitting on
                      * one of them.
                      */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        paddingBottom: '14px', marginBottom: '4px',
                        boxShadow: `inset 0 -1px 0 ${rail(0.07)}`,
                    }}>
                        {[0, 1, 2].map(idx => {
                            const texture = pendingShowcase[idx];
                            const item = texture && userCollection.find(i => i.item_texture === texture);
                            if (!item) {
                                return <ShowcaseMount key={idx} empty size={52} />;
                            }
                            return (
                                <button
                                    key={`${texture}-${idx}`}
                                    type="button"
                                    onClick={() => removeShowcaseSlot(idx)}
                                    aria-label={`Remove ${item.item_name} from slot ${idx + 1}`}
                                    title="Remove from showcase"
                                    className="fib-board-hit"
                                    style={{ position: 'relative', background: 'none', border: 0, padding: 0 }}
                                >
                                    <ShowcaseMount
                                        tier={item.item_type}
                                        name={item.item_name}
                                        src={getShowcaseImageUrl(item)}
                                        size={52}
                                    />
                                    <span
                                        aria-hidden="true"
                                        style={{
                                            position: 'absolute', right: '-3px', top: '-3px',
                                            width: '16px', height: '16px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: DECK.amber, color: '#141414',
                                        }}
                                    ><X size={11} /></span>
                                </button>
                            );
                        })}
                        <BoardLabel tone={DECK.inkDim} style={{ marginLeft: '4px' }}>
                            {pendingShowcase.length < 3 ? 'Pick from below' : 'Click a slot to clear it'}
                        </BoardLabel>
                    </div>

                    {userCollection.length === 0 ? (
                        <BoardLabel tone={DECK.inkDim}>No special items collected yet</BoardLabel>
                    ) : (
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {userCollection.map(item => {
                                const picked = pendingShowcase.filter(t => t === item.item_texture).length;
                                const owned = item.count || 1;
                                // You may show a copy for every copy you hold,
                                // up to the three slots. Both limits are real and
                                // the tile says which one it has hit.
                                const canAdd = picked < owned && pendingShowcase.length < 3;
                                return (
                                    <button
                                        key={item.item_texture}
                                        type="button"
                                        onClick={() => addShowcaseItem(item.item_texture, owned)}
                                        disabled={!canAdd}
                                        aria-label={[
                                            item.item_name,
                                            RARITY[item.item_type]?.label || item.item_type,
                                            owned > 1 ? `${owned} held` : null,
                                            picked > 0 ? `${picked} in showcase` : null,
                                        ].filter(Boolean).join(' — ')}
                                        className={canAdd ? 'fib-board-hit' : undefined}
                                        style={{
                                            position: 'relative', background: 'none', border: 0, padding: 0,
                                            opacity: canAdd ? 1 : 0.45,
                                            cursor: canAdd ? 'pointer' : 'default',
                                        }}
                                    >
                                        <ShowcaseMount
                                            tier={item.item_type}
                                            name={item.item_name}
                                            src={getShowcaseImageUrl(item)}
                                            size={52}
                                            quiet={!picked}
                                        />
                                        {/* How many you HOLD, bottom left — the
                                            figure that says a second copy is
                                            even possible. */}
                                        {owned > 1 && (
                                            <span
                                                aria-hidden="true"
                                                style={{
                                                    position: 'absolute', left: '2px', bottom: '2px',
                                                    padding: '0 3px', background: 'rgba(0,0,0,0.72)',
                                                }}
                                            >
                                                <BoardLabel size={10} tone={DECK.inkMid}>×{owned}</BoardLabel>
                                            </span>
                                        )}
                                        {/* How many are IN the showcase, top
                                            right, in the board's own signal. */}
                                        {picked > 0 && (
                                            <span
                                                aria-hidden="true"
                                                style={{
                                                    position: 'absolute', right: '-3px', top: '-3px',
                                                    minWidth: '16px', height: '16px', padding: '0 3px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: DECK.amber,
                                                }}
                                            >
                                                <BoardLabel size={10} tone="#141414">{picked}</BoardLabel>
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </EditorSheet>
            )}

            {showLuckInfoModal && (
                <LuckInfoModal
                    onClose={() => setShowLuckInfoModal(false)}
                    luckRating={luckRating}
                    isMobile={isPhone}
                />
            )}

            {showAchievements && (
                <Achievements
                    onClose={() => setShowAchievements(false)}
                    userId={userId}
                    username={profile.custom_username}
                    isOwnProfile={isOwnProfile}
                />
            )}

            {showCollectionBook && collectionBookData && (
                <CollectionBook
                    collection={collectionBookData.collection}
                    collectionDetails={collectionBookData.collectionDetails}
                    stats={collectionBookData.stats}
                    dryStreaks={collectionBookData.dryStreaks}
                    allItems={collectionBookData.allItems}
                    dynamicItems={collectionBookData.dynamicItems}
                    viewingUser={profile.custom_username}
                    viewingUserId={userId}
                    onClose={() => {
                        setShowCollectionBook(false);
                        setCollectionBookData(null);
                    }}
                />
            )}
        </div>
    );
}

/**
 * The head's supporting register: figures about SPINNING, at 20px against the
 * collection figures' 27.
 *
 * A 1.35 ratio, which is the collection board's own answer to the same problem
 * and is not arbitrary at either end. Six equal drums is the hero-metric
 * template with the boxes taken off — the form kept, the container removed — and
 * it puts two five-digit numbers side by side at identical size and tone. The
 * over-correction was label size, which made "44,408 spins" a side-note when it
 * is the denominator under half the board.
 */
function SpinRegister({ figures, size = 20, align = 'left' }) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
            flex: '0 0 auto',
        }}>
            {figures.map((f, i) => (
                <div
                    key={f.label}
                    style={{
                        padding: i === 0 ? '0 18px 0 0' : '0 18px',
                        boxShadow: i > 0 ? `inset 1px 0 0 ${rail(0.07)}` : undefined,
                        ...(i === figures.length - 1 ? { paddingRight: 0 } : null),
                        textAlign: align === 'right' ? 'right' : 'left',
                    }}
                >
                    <FlapText
                        text={f.value}
                        size={size}
                        tone={DECK.inkMid}
                        weight={700}
                        delay={180 + i * 40}
                        style={{ justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}
                    />
                    <div style={{ marginTop: '6px' }}>
                        <BoardLabel>{f.label}</BoardLabel>
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * A section of the board: a tracked heading over a seam, and its content.
 *
 * Not a card, and the distinction is the whole point of the surface — the thing
 * this profile replaces was eleven bordered rounded rectangles stacked in a
 * column, which is the lazy container doing the work a heading should do. More
 * space above the heading than below it.
 */
function Panel({ title, action, children }) {
    return (
        <section style={{ paddingTop: '22px' }}>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '12px', paddingBottom: '10px',
            }}>
                <BoardLabel>{title}</BoardLabel>
                {action || null}
            </div>
            {children}
        </section>
    );
}

/** A panel's one control. Quiet by default, the board's amber on focus. */
function PanelAction({ onClick, label, children }) {
    return (
        <Plinth
            as="button"
            className="fib-board-hit"
            onClick={onClick}
            aria-label={label}
            style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '0 9px', height: '24px', color: DECK.inkDim,
            }}
        >
            <BoardLabel size={10} tone="currentColor" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {children}
            </BoardLabel>
        </Plinth>
    );
}

/**
 * One figure in the record, with the field it stands against.
 *
 * The figure leads and the standing explains it. A rank is not decoration here —
 * "24,109 spins" says nothing on its own, and "#3" says what it is worth.
 */
function RecordFigure({ label, value, note, tone, onInfo, first }) {
    return (
        <div style={{
            padding: '0 18px',
            boxShadow: first ? undefined : `inset 1px 0 0 ${rail(0.07)}`,
            ...(first ? { paddingLeft: 0 } : null),
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FlapText text={value} size={22} tone={tone || DECK.ink} weight={700} plate delay={360} />
                {onInfo && (
                    <button
                        type="button"
                        onClick={onInfo}
                        aria-label="How the luck rating is calculated"
                        className="fib-board-hit"
                        style={{
                            background: 'none', border: 0, padding: '2px',
                            display: 'flex', color: DECK.inkDim, cursor: 'pointer',
                        }}
                    ><HelpCircle size={12} /></button>
                )}
            </div>
            <div style={{ marginTop: '7px', display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                <BoardLabel>{label}</BoardLabel>
                {note && <BoardLabel tone={DECK.inkDim}>{note}</BoardLabel>}
            </div>
        </div>
    );
}

/**
 * An item in a case: a square mount in a rim of its own tier.
 *
 * DESIGN.md §9 records why a rim and not a shaft of light, and the argument is
 * stronger here than on the platform it was written for: the reel moves items
 * past a focal slot and earns its shaft from travel, while a showcase is three
 * objects standing still, on display, forever. A display case mounts its objects
 * in a rim.
 *
 * The rim's terms come straight off that table — the whole slick for insane, the
 * aqua ramp shimmering for mythic, flat gold STEADY for legendary, a slow pulse
 * for the flat tiers below. Colour is supplied as a custom property and every
 * visual property is a class, because every one of them has a state; a colour in
 * a `style` object on this surface is a state nobody has thought about.
 */
function ShowcaseMount({ tier, name, src, size = 56, empty, onClick, quiet }) {
    if (empty) {
        const Tag = onClick ? 'button' : 'div';
        return (
            <Tag
                onClick={onClick}
                type={onClick ? 'button' : undefined}
                aria-label={onClick ? 'Add an item to your showcase' : undefined}
                className={`fib-mount fib-mount--empty${onClick ? ' fib-board-hit' : ''}`}
                style={{
                    width: `${size}px`, height: `${size}px`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: DECK.inkDim, padding: 0,
                }}
            >
                {onClick ? <Plus size={15} /> : null}
            </Tag>
        );
    }

    const holo = isIridescentRarity(tier);
    const variant = holo ? 'holo'
        : tier === 'mythic' ? 'shimmer'
        : tier === 'legendary' ? 'steady'
        : 'pulse';

    return (
        <span
            className={`fib-mount fib-mount--${variant}${quiet ? ' is-quiet' : ''}`}
            title={`${name} — ${RARITY[tier]?.label || tier}`}
            style={{
                width: `${size}px`, height: `${size}px`,
                '--fib-mount-tone': getRarityColor(tier),
            }}
        >
            <span className="fib-mount-face">
                <img
                    src={src}
                    alt={name}
                    style={{
                        width: `${Math.round(size * 0.7)}px`,
                        height: `${Math.round(size * 0.7)}px`,
                        imageRendering: 'pixelated',
                    }}
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `${IMAGE_BASE_URL}/barrier.png`;
                    }}
                />
            </span>
        </span>
    );
}

/**
 * A sheet over the board, for the two editing tasks.
 *
 * These are the surface's only modals-over-a-modal, and they earn it: both are
 * "pick up to three of a large set", which needs the room and must not lose the
 * board behind it. They wear the board's own material rather than the rounded
 * bordered dialogs they replaced — a 16px-radius card hanging off a surface with
 * no radius anywhere is the join everyone sees first.
 */
function EditorSheet({ title, hint, onCancel, onSave, isPhone, children }) {
    /*
     * Capture phase, and that is the whole reason this listener exists
     * separately from the board's. Both are bound to `window`; without capture
     * the board's handler — bound first, on the earlier mount — would close the
     * whole profile out from under a sheet the player was only trying to
     * dismiss. `stopPropagation` on a capturing listener stops the bubbling one
     * from ever running, which is the same trick the item plaque uses one
     * surface over.
     */
    useEffect(() => {
        const onKey = e => {
            if (e.key !== 'Escape') return;
            e.stopPropagation();
            onCancel();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [onCancel]);

    return (
        <div
            onClick={(e) => e.target === e.currentTarget && onCancel()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1200, padding: isPhone ? 0 : '20px',
            }}
        >
            <div
                style={{
                    width: '100%', maxWidth: '620px',
                    maxHeight: isPhone ? '100%' : 'min(80vh, 640px)',
                    display: 'flex', flexDirection: 'column',
                    backgroundImage: DECK.face,
                    boxShadow: [
                        `inset 0 1px 0 ${rail(0.12)}`,
                        'inset 0 -2px 0 rgba(0,0,0,0.55)',
                        '0 32px 80px rgba(0,0,0,0.65)',
                    ].join(', '),
                    overflow: 'hidden',
                }}
            >
                <div style={{
                    flex: '0 0 auto',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '12px', padding: '18px 20px 14px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', minWidth: 0 }}>
                        <FlapText text={title} size={18} tone={DECK.ink} weight={800} />
                        <BoardLabel tone={DECK.inkDim}>{hint}</BoardLabel>
                    </div>
                    <Plinth
                        as="button"
                        className="fib-board-hit"
                        onClick={onCancel}
                        aria-label="Close without saving"
                        style={{
                            width: '32px', height: '32px', flex: '0 0 auto',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: DECK.inkMid,
                        }}
                    ><X size={15} /></Plinth>
                </div>

                <div
                    className="fib-board-scroll"
                    style={{
                        flex: '1 1 auto', minHeight: 0, overflowY: 'auto',
                        padding: '4px 20px 18px',
                        background: 'rgba(0,0,0,0.30)',
                        boxShadow: `inset 0 1px 0 ${rail(0.08)}`,
                    }}
                >
                    {children}
                </div>

                <div style={{
                    flex: '0 0 auto',
                    display: 'flex', justifyContent: 'flex-end', gap: '8px',
                    padding: '14px 20px',
                }}>
                    <Plinth
                        as="button"
                        className="fib-board-hit"
                        onClick={onCancel}
                        style={{ padding: '0 14px', height: '32px', display: 'flex', alignItems: 'center', color: DECK.inkMid }}
                    ><BoardLabel tone="currentColor">Cancel</BoardLabel></Plinth>
                    <Plinth
                        as="button"
                        className="fib-board-hit"
                        live
                        onClick={onSave}
                        style={{ padding: '0 14px', height: '32px', display: 'flex', alignItems: 'center', color: DECK.amber }}
                    ><BoardLabel tone="currentColor">Save</BoardLabel></Plinth>
                </div>
            </div>
        </div>
    );
}

/**
 * "<Tier> Collection Complete!" banner, one per finished tier.
 *
 * This was four near-identical blocks of inline JSX, one per tier, each ~40 lines
 * of hand-tuned colour. Exotic shipped without a fifth, so finishing the exotic
 * tier - eight items and the hardest set on the wheel to complete - announced
 * nothing. Everything a banner needs is already on the ladder, so it is one
 * component driven by `rarity` and the tier list decides how many exist.
 *
 * Colours come from RARITY, never from COLORS directly. The blocks this replaces
 * painted Legendary with COLORS.purple, which the ladder rework had reassigned to
 * EXOTIC - so a player who finished both tiers would have seen two identically
 * magenta banners with different words on them.
 *
 * Kept through THE CONCOURSE rebuild at the owner's explicit request — it is the
 * one part of the old profile they named as worth saving. Its wash, medallion,
 * trophy, shine sweep and wording are untouched; only the radius went, because a
 * radius would be the only one on this surface. The border stays and is a
 * deliberate exception to the no-border rule rather than an oversight.
 */
function CompletionBanner({ rarity, total }) {
    const stops = getRarityStops(rarity);
    const color = getRarityColor(rarity);
    const ink = getRarityInk(rarity);

    // An animated tier is painted with its WHOLE ramp, never one sampled point off
    // it - a single stop off the insane ramp is some other tier's colour two thirds
    // of the time. Flat tiers get the same two-step gradient they had before.
    const medallion = stops
        ? `linear-gradient(135deg, ${stops.join(', ')})`
        : `linear-gradient(135deg, ${color}, ${color}bb)`;
    const wash = stops
        ? `linear-gradient(135deg, ${stops.map(stop => `${stop}22`).join(', ')})`
        : `linear-gradient(135deg, ${color}22, ${color}11)`;

    return (
        <div
            className="completion-banner"
            style={{
                background: wash,
                border: `1px solid ${color}55`,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <div style={{
                width: '34px', height: '34px',
                background: medallion,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 15px ${color}66`,
                flex: '0 0 auto',
            }}>
                {/* The trophy sits ON the tier's own fill, so it takes the on-color
                    step rather than the ink step - the opposite question, and the
                    two are only distinguishable by reading them. */}
                <Trophy size={17} color={getRarityOnColor(rarity)} />
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{
                    fontFamily: "'Barlow Condensed', system-ui, sans-serif",
                    color: ink,
                    fontSize: '15px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    textShadow: `0 0 10px ${color}44`
                }}>
                    {RARITY[rarity].label} Collection Complete!
                </div>
                <div style={{ marginTop: '3px' }}>
                    <BoardLabel tone={DECK.inkDim}>
                        All {total} {RARITY[rarity].label.toLowerCase()} items collected
                    </BoardLabel>
                </div>
            </div>
            <div style={{ marginLeft: 'auto', opacity: 0.7, display: 'flex' }}>
                {getRarityIcon(rarity, 16)}
            </div>
        </div>
    );
}
