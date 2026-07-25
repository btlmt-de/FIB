/**
 * Pure data helpers — no mock, no fetch.
 *
 * This file used to be the mock data layer: a seeded generator producing every DTO the site
 * rendered. All of that is gone. Real data comes from `api.js` now, and what remains here is the
 * set of pure, source-agnostic functions the components and `adapter.js` still use — match
 * derivations that reshape a match DTO into the trace/standings the charts want, item and identity
 * formatting, and the leaderboard metadata lists.
 *
 * These read the *real* DTO shapes. Where a match carries a player, that player is a nested
 * identity ({ playerUuid, playerName }), not a flat uuid — the same shape the plugin and the views
 * moved to. The helpers below were updated to read it.
 */

import { ITEM_TEXTURE_BASE, RARITY_KEYS, RARITY_FIELDS } from './tokens.js';

export { RARITY_KEYS, RARITY_FIELDS };

// ── Identity ─────────────────────────────────────────────────────────────────
//
// There is no player table on the client any more — names arrive inside the DTOs (a match
// participant carries its FibPlayer, a leaderboard row carries its player). So these are pure
// fallbacks for the few places that hold only a uuid and no identity object: a short uuid stands in
// until the name is in scope. Prefer reading `someObject.player.playerName` directly wherever the
// DTO provides it; reach for playerName(uuid) only when it genuinely does not.

/** A display string for a bare uuid: the first eight characters. Real names come from the DTO. */
export const playerName = (uuid) => (uuid ? String(uuid).slice(0, 8) : 'Unknown');

/** A head-renderer URL for a uuid. The renderer keys on uuid, so this needs no name. */
export const playerAvatar = (uuid) => `https://mc-heads.net/avatar/${uuid ?? 'MHF_Question'}/48`;

// ── Items ───────────────────────────────────────────────────────────────────
// Stored namespaced ("minecraft:oak_log") so the data outlives MC version churn;
// everything user-facing strips it. Texture filenames drop the namespace.

export const itemKey = (itemName) => (itemName || '').split(':').pop();
export const itemLabel = (itemName) =>
    itemKey(itemName).split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
export const itemTexture = (itemName) => `${ITEM_TEXTURE_BASE}/${itemKey(itemName)}.png`;

// ── Leaderboard metadata ─────────────────────────────────────────────────────
// Presentation metadata for the boards: labels, number formats, and which direction is better.
// Not used to decide what to fetch — the valid category set lives server-side (FibLeaderboard
// category) and is deliberately not mirrored as a fetch gate; this only styles what comes back.

export const LEADERBOARD_SCOPES = [
    { id: 'solo', label: 'Solo' },
    { id: 'duo', label: 'Duo' },
    { id: 'combined', label: 'Teams' },
];

export const LEADERBOARD_CATEGORIES = [
    { id: 'GAMES_WON', label: 'Wins', format: 'number', sense: 'high' },
    { id: 'HIGHEST_SCORE', label: 'Top score', format: 'number', sense: 'high' },
    { id: 'TOTAL_ITEMS', label: 'Items', format: 'number', sense: 'high' },
    { id: 'BACK_TO_BACK_STREAK', label: 'B2B streak', format: 'number', sense: 'high' },
    { id: 'BLOCKS_TRAVELLED', label: 'Distance', format: 'distance', sense: 'high' },
    { id: 'DEATHS', label: 'Deaths', format: 'number', sense: 'low' },
];

export const categorySense = (category) =>
    LEADERBOARD_CATEGORIES.find((c) => c.id === category)?.sense ?? 'high';

// ── Match derivations ────────────────────────────────────────────────────────
//
// These reshape a real match DTO (FibMatchDetail) into the standings and race entries the tables
// and charts consume. A match participant carries a nested `player` ({ playerUuid, playerName });
// a match item carries a nested `player` or a `teamIndex`. The `members` a standing exposes are
// therefore identity objects, not bare uuids, so a caller can render the name the DTO already
// carries instead of a lookup.

/** A uuid from a nested-or-flat player, tolerating either during the transition. */
const uuidOf = (p) => p?.player?.playerUuid ?? p?.playerUuid ?? null;

/** The identity object from a participant, for `members` lists that want the name too. */
const identityOf = (p) => p?.player ?? { playerUuid: p?.playerUuid, playerName: null };

export const matchStandings = (match) => {
    if (match.mode === 'SOLO') {
        return match.participants
            .slice()
            .sort((a, b) => a.placement - b.placement)
            .map((p) => ({
                key: uuidOf(p),
                owner: { playerUuid: uuidOf(p), teamIndex: null },
                members: [identityOf(p)],
                placement: p.placement,
                score: p.finalScore,
                won: p.won,
            }));
    }
    return match.teams
        .map((team) => {
            const members = match.participants.filter((p) => p.teamIndex === team.teamIndex);
            const first = members[0];
            return {
                key: `t${team.teamIndex}`,
                owner: { playerUuid: null, teamIndex: team.teamIndex },
                members: members.map(identityOf),
                placement: first?.placement ?? 0,
                score: first?.finalScore ?? 0,
                won: first?.won ?? false,
            };
        })
        .sort((a, b) => a.placement - b.placement);
};

export const itemsForOwner = (match, owner) =>
    match.items
        .filter((it) =>
            owner.teamIndex != null ? it.teamIndex === owner.teamIndex : uuidOf(it) === owner.playerUuid,
        )
        .sort((a, b) => a.orderIndex - b.orderIndex);

/**
 * Competitors reshaped for the trace: each event carries its offset in seconds from the match
 * start, which is all the chart and the strips need.
 */
export const raceEntries = (match) => {
    const start = new Date(match.startedAt).getTime();
    return matchStandings(match).map((row, i) => ({
        ...row,
        index: i,
        events: itemsForOwner(match, row.owner).map((it) => ({
            t: Math.max(0, (new Date(it.collectedAt).getTime() - start) / 1000),
            skipped: it.skipped,
            b2b: it.b2bRarity,
            itemName: it.itemName,
        })),
    }));
};

/** Score is item count including skips — skips score, which is why they count. */
export const scoreAt = (entry, t) => entry.events.filter((e) => e.t <= t).length;

export const eventTimes = (entries) =>
    [...new Set(entries.flatMap((e) => e.events.map((ev) => ev.t)))].sort((a, b) => a - b);

export const standingsAt = (entries, t) => {
    const rows = entries
        .map((entry) => {
            const seen = entry.events.filter((e) => e.t <= t);
            return {
                entry,
                score: seen.length,
                found: seen.filter((e) => !e.skipped).length,
                skipped: seen.filter((e) => e.skipped).length,
                b2b: seen.filter((e) => e.b2b).length,
            };
        })
        .sort((a, b) => b.score - a.score || a.entry.index - b.entry.index);
    const lead = rows[0]?.score ?? 0;
    return rows.map((r, i) => ({ ...r, pos: i + 1, gap: r.score - lead }));
};

export const leadChanges = (entries) => {
    let count = 0;
    let lead = null;
    for (const t of eventTimes(entries)) {
        const top = standingsAt(entries, t)[0]?.entry.index;
        if (lead != null && top !== lead) count++;
        lead = top;
    }
    return count;
};

/**
 * The moments the lead actually changed hands, as offsets in seconds.
 *
 * `leadChanges` counts these for a headline figure; the timeline underneath the race trace marks
 * them, because "when it turned" is the most useful landmark on the chart. Same walk, keeping the
 * timestamps.
 */
export const leadChangeTimes = (entries) => {
    const times = [];
    let lead = null;
    for (const t of eventTimes(entries)) {
        const top = standingsAt(entries, t)[0]?.entry.index;
        if (lead != null && top !== lead) times.push(t);
        lead = top;
    }
    return times;
};

/** Segments for the item strips: width is the time that item took. */
export const itemSegments = (entry) =>
    entry.events.map((e, i) => ({
        ...e,
        order: i + 1,
        took: e.t - (i ? entry.events[i - 1].t : 0),
    }));

// ── Small numeric helpers ────────────────────────────────────────────────────

export const winRate = (won, played) => (played > 0 ? (won / played) * 100 : 0);
export const itemsPerGame = (items, games) => (games > 0 ? items / games : 0);
export const secondsPerItem = (time, items) => (items > 0 ? time / items : 0);

export const timeAgo = (value) => {
    const then = new Date(value).getTime();
    const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
    if (secs < 60) return 'just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
};
