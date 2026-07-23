import { ITEM_TEXTURE_BASE, RARITY_KEYS, RARITY_FIELDS } from './tokens.js';

// ============================================================================
// DATA LAYER
//
// Every generator returns the exact shape of its FIBService DTO, so swapping in
// the real API is a fetch call and nothing else. The derivations at the bottom
// (race entries, standings-at-time, lead changes) read those same shapes, so
// they carry over untouched.
// ============================================================================

export { RARITY_KEYS, RARITY_FIELDS };

// ── Deterministic RNG ───────────────────────────────────────────────────────
// Seeded from the entity id so numbers never reshuffle between renders, tabs, or
// the two sides of a comparison.

const hashSeed = (str) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
};

const mulberry32 = (seed) => () => {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const rngFor = (...parts) => mulberry32(hashSeed(parts.join('|')));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const between = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min;

// ── Players ─────────────────────────────────────────────────────────────────

export const MOCK_PLAYERS = [
    { uuid: '8b1c0a42-7d3e-4f19-9a2b-11c4e5d60731', name: 'threeseconds' },
    { uuid: '2f7d9e18-4a6b-4c05-8e31-5b9d02af7c64', name: 'eltobito'     },
    { uuid: 'c40a3b57-91ef-4d28-b6a7-83fe1d40529c', name: 'stupxd'       },
    { uuid: '6d82f019-35ca-4b7e-91d0-47a2ce8b3f15', name: 'apppaa'       },
    { uuid: 'e91b47a3-08dc-4fe6-a25b-3c60d97148ba', name: 'CH0RD'        },
    { uuid: '5a3e6c80-b214-4d97-8f43-9e07b25ca6d8', name: 'McPlayHD'     },
    { uuid: 'b7c25d61-6e40-49af-a308-1f95d3e0b247', name: 'Owen1212055'  },
    { uuid: '3e08a95f-c7b2-4106-95de-24ab7f81c093', name: 'shabana02'    },
].map(p => ({ ...p, avatarUrl: `https://mc-heads.net/avatar/${p.name}/48` }));

export const PLAYERS_BY_UUID = new Map(MOCK_PLAYERS.map(p => [p.uuid, p]));

export const playerName = (uuid) => PLAYERS_BY_UUID.get(uuid)?.name ?? uuid?.slice(0, 8) ?? 'Unknown';
export const playerAvatar = (uuid) =>
    PLAYERS_BY_UUID.get(uuid)?.avatarUrl ?? 'https://mc-heads.net/avatar/MHF_Question/48';

// ── Items ───────────────────────────────────────────────────────────────────
// Stored namespaced ("minecraft:oak_log") so the data outlives MC version churn;
// everything user-facing strips it. Texture filenames drop the namespace.

export const itemKey = (itemName) => (itemName || '').split(':').pop();
export const itemLabel = (itemName) =>
    itemKey(itemName).split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
export const itemTexture = (itemName) => `${ITEM_TEXTURE_BASE}/${itemKey(itemName)}.png`;

export const ITEM_POOL = [
    'oak_log', 'cobblestone', 'diamond_axe', 'emerald_ore', 'blaze_powder', 'carrot', 'clay',
    'basalt', 'allium', 'beetroot', 'lily_pad', 'end_stone', 'diorite', 'cornflower', 'oak_boat',
    'cocoa_beans', 'dripstone_block', 'mushroom_stem', 'oak_sapling', 'copper_grate', 'black_bundle',
    'cyan_candle', 'magenta_carpet', 'jungle_button', 'birch_trapdoor', 'brown_terracotta',
    'chorus_plant', 'copper_door', 'daylight_detector', 'husk_spawn_egg', 'blackstone_wall',
    'cherry_sapling', 'crimson_hyphae', 'andesite_slab', 'copper_shovel', 'bush', 'pale_moss_carpet',
    'mangrove_fence_gate', 'gray_bundle', 'cut_copper_stairs',
].map(n => `minecraft:${n}`);

// ── Stats mocks ─────────────────────────────────────────────────────────────

const mockTopItems = (rng, n = 3) => {
    const used = new Set(); const out = [];
    while (out.length < n) {
        const name = pick(rng, ITEM_POOL);
        if (used.has(name)) continue;
        used.add(name);
        out.push({ itemName: name, count: between(rng, 20, 180) - out.length * 8 });
    }
    return out.sort((a, b) => b.count - a.count);
};

/** Mirrors FibRarities. */
const mockRarities = (rng) => ({
    rare: between(rng, 120, 600), epic: between(rng, 40, 220), legendary: between(rng, 8, 70),
    rngesus: between(rng, 0, 6), extraordinary: between(rng, 0, 14),
});

/** Mirrors FibSoloStatistics. */
export const mockSoloStats = (playerUuid) => {
    const rng = rngFor('solo', playerUuid);
    const gamesPlayed = between(rng, 18, 120);
    const gamesWon = Math.floor(gamesPlayed * (rng() * 0.55 + 0.1));
    const totalItemsFound = between(rng, 400, 2600);
    return {
        playerUuid, totalItemsFound, topThreeItems: mockTopItems(rng), rarities: mockRarities(rng),
        blocksTravelled: between(rng, 90000, 1400000), deaths: between(rng, 4, 180),
        wheelOfFortuneUses: between(rng, 0, 90), enteredAntimatterTeleporter: between(rng, 0, 60),
        highestScore: between(rng, 4000, 19000), highestB2BStreak: between(rng, 1, 11),
        longestItemStreak: between(rng, 4, 34),
        totalTimeSpentOnItems: totalItemsFound * between(rng, 6, 26),
        gamesPlayed, gamesWon,
    };
};

/** Mirrors FibPlayerStats -- mode-independent, so it sits above the scope toggle. */
export const mockPlayerStats = (playerUuid) => {
    const rng = rngFor('player', playerUuid);
    const highestWinStreak = between(rng, 1, 12);
    return { playerUuid, currentWinStreak: between(rng, 0, highestWinStreak), highestWinStreak };
};

/** Mirrors FibTeamMemberStats. */
const mockMemberStats = (memberUuid, teamKey) => {
    const rng = rngFor('member', teamKey, memberUuid);
    const totalItemsFound = between(rng, 150, 1200);
    return {
        memberUuid, totalItemsFound, topThreeItems: mockTopItems(rng), rarities: mockRarities(rng),
        blocksTravelled: between(rng, 40000, 700000), deaths: between(rng, 2, 90),
        wheelOfFortuneUses: between(rng, 0, 45), enteredAntimatterTeleporter: between(rng, 0, 30),
        highestB2BStreak: between(rng, 1, 9),
        totalTimeSpentOnItems: totalItemsFound * between(rng, 6, 26),
    };
};

/** Mirrors FibTeamStatistics. The pair key is order-independent, like FibTeamKey. */
export const mockTeamStats = (player1Uuid, player2Uuid) => {
    const teamKey = [player1Uuid, player2Uuid].slice().sort().join('~');
    const rng = rngFor('team', teamKey);
    const gamesPlayed = between(rng, 6, 60);
    const gamesWon = Math.floor(gamesPlayed * (rng() * 0.6 + 0.1));
    const memberStats = [mockMemberStats(player1Uuid, teamKey), mockMemberStats(player2Uuid, teamKey)];
    const sum = (f) => memberStats.reduce((a, m) => a + m[f], 0);
    const rarities = RARITY_KEYS.reduce((acc, key) => {
        const field = RARITY_FIELDS[key];
        acc[field] = memberStats.reduce((a, m) => a + m.rarities[field], 0);
        return acc;
    }, {});
    return {
        player1Uuid, player2Uuid,
        highestScore: between(rng, 5000, 24000), longestItemStreak: between(rng, 5, 38),
        gamesPlayed, gamesWon,
        totalItemsFound: sum('totalItemsFound'), topThreeItems: mockTopItems(rng), rarities,
        blocksTravelled: sum('blocksTravelled'), deaths: sum('deaths'),
        wheelOfFortuneUses: sum('wheelOfFortuneUses'),
        enteredAntimatterTeleporter: sum('enteredAntimatterTeleporter'),
        highestB2BStreak: Math.max(...memberStats.map(m => m.highestB2BStreak)),
        totalTimeSpentOnItems: sum('totalTimeSpentOnItems'),
        memberStats,
    };
};

/** Server-side this is FibTeamRepository.findAllByPlayerUuid. */
export const mockPartners = (playerUuid) => {
    const rng = rngFor('partners', playerUuid);
    const others = MOCK_PLAYERS.filter(p => p.uuid !== playerUuid);
    const count = between(rng, 2, Math.min(5, others.length));
    return others
        .slice()
        .sort((a, b) => rngFor('order', playerUuid, a.uuid)() - rngFor('order', playerUuid, b.uuid)())
        .slice(0, count)
        .map(p => p.uuid);
};

/** Mirrors FibPlayerCombinedTeamStats. */
export const mockCombinedTeamStats = (playerUuid) => {
    const teams = mockPartners(playerUuid).map(p => mockTeamStats(playerUuid, p));
    const mine = teams.map(t => t.memberStats.find(m => m.memberUuid === playerUuid));
    const sum = (arr, f) => arr.reduce((a, x) => a + x[f], 0);
    const rarities = RARITY_KEYS.reduce((acc, key) => {
        const field = RARITY_FIELDS[key];
        acc[field] = mine.reduce((a, m) => a + m.rarities[field], 0);
        return acc;
    }, {});
    return {
        playerUuid, teamsCount: teams.length,
        totalItemsFound: sum(mine, 'totalItemsFound'),
        topThreeItems: mockTopItems(rngFor('combined', playerUuid)), rarities,
        blocksTravelled: sum(mine, 'blocksTravelled'), deaths: sum(mine, 'deaths'),
        wheelOfFortuneUses: sum(mine, 'wheelOfFortuneUses'),
        enteredAntimatterTeleporter: sum(mine, 'enteredAntimatterTeleporter'),
        highestB2BStreak: Math.max(...mine.map(m => m.highestB2BStreak)),
        totalTimeSpentOnItems: sum(mine, 'totalTimeSpentOnItems'),
        totalGamesPlayed: sum(teams, 'gamesPlayed'), totalGamesWon: sum(teams, 'gamesWon'),
        highestTeamScore: Math.max(...teams.map(t => t.highestScore)),
        longestTeamItemStreak: Math.max(...teams.map(t => t.longestItemStreak)),
    };
};

// ── Leaderboards ────────────────────────────────────────────────────────────

export const LEADERBOARD_SCOPES = [
    { id: 'solo',     label: 'Solo',     hint: 'Solo games only' },
    { id: 'duo',      label: 'Duos',     hint: 'Ranked as a pair' },
    { id: 'combined', label: 'Combined', hint: 'Every duo, summed per player' },
];

/** The eight categories the service exposes. `sense` records that high is not always good. */
export const LEADERBOARD_CATEGORIES = [
    { id: 'GAMES_WON',           label: 'Games won',    format: 'int',      sense: 'high' },
    { id: 'HIGHEST_SCORE',       label: 'Highest score',format: 'int',      sense: 'high' },
    { id: 'TOTAL_ITEMS_FOUND',   label: 'Items found',  format: 'compact',  sense: 'high' },
    { id: 'GAMES_PLAYED',        label: 'Games played', format: 'int',      sense: 'high' },
    { id: 'HIGHEST_B2B_STREAK',  label: 'B2B streak',   format: 'int',      sense: 'high' },
    { id: 'LONGEST_ITEM_STREAK', label: 'Item streak',  format: 'int',      sense: 'high' },
    { id: 'BLOCKS_TRAVELLED',    label: 'Distance',     format: 'distance', sense: 'high' },
    { id: 'DEATHS',              label: 'Deaths',       format: 'int',      sense: 'low'  },
];

const soloValue = (s, c) => ({
    GAMES_WON: s.gamesWon, GAMES_PLAYED: s.gamesPlayed, HIGHEST_SCORE: s.highestScore,
    TOTAL_ITEMS_FOUND: s.totalItemsFound, HIGHEST_B2B_STREAK: s.highestB2BStreak,
    LONGEST_ITEM_STREAK: s.longestItemStreak, BLOCKS_TRAVELLED: s.blocksTravelled, DEATHS: s.deaths,
}[c] ?? 0);

const combinedValue = (s, c) => ({
    GAMES_WON: s.totalGamesWon, GAMES_PLAYED: s.totalGamesPlayed, HIGHEST_SCORE: s.highestTeamScore,
    LONGEST_ITEM_STREAK: s.longestTeamItemStreak, TOTAL_ITEMS_FOUND: s.totalItemsFound,
    HIGHEST_B2B_STREAK: s.highestB2BStreak, BLOCKS_TRAVELLED: s.blocksTravelled, DEATHS: s.deaths,
}[c] ?? 0);

const teamValue = (t, c) => ({
    GAMES_WON: t.gamesWon, GAMES_PLAYED: t.gamesPlayed, HIGHEST_SCORE: t.highestScore,
    LONGEST_ITEM_STREAK: t.longestItemStreak, TOTAL_ITEMS_FOUND: t.totalItemsFound,
    HIGHEST_B2B_STREAK: t.highestB2BStreak, BLOCKS_TRAVELLED: t.blocksTravelled, DEATHS: t.deaths,
}[c] ?? 0);

/**
 * Boards sort by `sense`, not blindly descending. DEATHS is the one category
 * where a smaller number is the better result, so sorting it high-to-low put
 * the worst player on top and called them the leader. Everything reads the
 * category's declared `sense` rather than assuming "more is better".
 */
const senseOf = (category) =>
    LEADERBOARD_CATEGORIES.find(c => c.id === category)?.sense ?? 'high';

const byCategory = (category) => {
    const low = senseOf(category) === 'low';
    return (a, b) => (low ? a.value - b.value : b.value - a.value);
};

/** Mirrors List<FibLeaderboardEntry> from /statistics/solo/leaderboard. */
export const mockSoloLeaderboard = (category, limit = 10) =>
    MOCK_PLAYERS
        .map(p => ({ playerUuid: p.uuid, value: soloValue(mockSoloStats(p.uuid), category) }))
        .sort(byCategory(category)).slice(0, limit)
        .map((r, i) => ({ rank: i + 1, ...r }));

/** Mirrors List<FibLeaderboardEntry> from /statistics/team/leaderboard/combined. */
export const mockCombinedLeaderboard = (category, limit = 10) =>
    MOCK_PLAYERS
        .map(p => ({ playerUuid: p.uuid, value: combinedValue(mockCombinedTeamStats(p.uuid), category) }))
        .sort(byCategory(category)).slice(0, limit)
        .map((r, i) => ({ rank: i + 1, ...r }));

/** Mirrors List<FibTeamLeaderboardEntry> from /statistics/team/leaderboard/duo. */
export const mockDuoLeaderboard = (category, limit = 10) => {
    const seen = new Set(); const pairs = [];
    MOCK_PLAYERS.forEach(p => mockPartners(p.uuid).forEach(partner => {
        const key = [p.uuid, partner].slice().sort().join('~');
        if (seen.has(key)) return;
        seen.add(key);
        pairs.push({ player1Uuid: p.uuid, player2Uuid: partner });
    }));
    return pairs
        .map(pair => ({ ...pair, value: teamValue(mockTeamStats(pair.player1Uuid, pair.player2Uuid), category) }))
        .sort(byCategory(category)).slice(0, limit)
        .map((r, i) => ({ rank: i + 1, ...r }));
};

/**
 * Position on the default board (games won, solo) -- the board people mean when
 * they say rank. Server-side this needs a COUNT(*) WHERE games_won > mine
 * endpoint, which does not exist yet.
 */
export const mockSoloRank = (playerUuid) => {
    const mine = mockSoloStats(playerUuid).gamesWon;
    return MOCK_PLAYERS.filter(p => mockSoloStats(p.uuid).gamesWon > mine).length + 1;
};

// ── Matches ─────────────────────────────────────────────────────────────────
// Shape mirrors FibMatchSubmitRequest plus the matchId that lives in the path.

const SETTINGS_POOL = [
    ['HARD', 'true'], ['BACKPACKSIZE', '3'], ['QUICKIE', '2'], ['STATS', 'true'],
    ['NETHER', 'true'], ['END', 'false'], ['RANDOM_EVENTS', 'true'], ['KEEP_INVENTORY', 'true'],
];

const B2B_POOL = [
    null, null, null, null, null, null,
    'RARE', 'RARE', 'RARE', 'EPIC', 'EPIC', 'LEGENDARY', 'RNGESUS', 'EXTRAORDINARY',
];

/**
 * Owner is exactly one of playerUuid (solo) or teamIndex (team), never both --
 * the same constraint FibMatchItemEntity documents.
 */
const buildItems = (rng, owners, durationSeconds, startedAt) => {
    const items = [];
    let order = 0;
    owners.forEach((owner, oi) => {
        const pace = 0.78 + oi * 0.07 + rng() * 0.2;
        let elapsed = between(rng, 6, 40);
        while (elapsed < durationSeconds) {
            const skipped = rng() < 0.17;
            items.push({
                ...owner,
                itemName: pick(rng, ITEM_POOL),
                skipped,
                b2bRarity: skipped ? null : pick(rng, B2B_POOL),
                orderIndex: order++,
                collectedAt: new Date(startedAt.getTime() + Math.round(elapsed) * 1000).toISOString(),
            });
            elapsed += (18 + rng() * 120) / pace;
        }
    });
    return items;
};

const buildMatch = (index) => {
    const matchId = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
    const rng = rngFor('match', matchId);
    const mode = rng() < 0.45 ? 'SOLO' : 'TEAM';
    const durationSeconds = between(rng, 1500, 3600);
    const endedAt = new Date(Date.now() - index * between(rng, 6, 40) * 3600 * 1000);
    const startedAt = new Date(endedAt.getTime() - durationSeconds * 1000);

    const roster = MOCK_PLAYERS.slice().sort(
        (a, b) => rngFor('roster', matchId, a.uuid)() - rngFor('roster', matchId, b.uuid)()
    );
    const settings = Object.fromEntries(
        SETTINGS_POOL.filter(() => rng() < 0.6).concat([['TEAM', mode === 'TEAM' ? 'true' : 'false']])
    );

    if (mode === 'SOLO') {
        const players = roster.slice(0, between(rng, 4, 6));
        const owners = players.map(p => ({ playerUuid: p.uuid, teamIndex: null }));
        const items = buildItems(rng, owners, durationSeconds, startedAt);
        const participants = players
            .map(p => ({
                playerUuid: p.uuid, teamIndex: null,
                finalScore: items.filter(i => i.playerUuid === p.uuid).length,
            }))
            .sort((a, b) => b.finalScore - a.finalScore)
            .map((p, i) => ({ ...p, placement: i + 1, won: i === 0 }));
        return {
            matchId, startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString(),
            durationSeconds, mode, teams: [], participants, items, settings,
        };
    }

    const teamCount = between(rng, 3, 4);
    const teams = Array.from({ length: teamCount }, (_, i) => ({ teamIndex: i, teamName: null, color: null }));
    const items = buildItems(rng, teams.map(t => ({ playerUuid: null, teamIndex: t.teamIndex })), durationSeconds, startedAt);

    const scores = teams
        .map(t => ({ teamIndex: t.teamIndex, score: items.filter(i => i.teamIndex === t.teamIndex).length }))
        .sort((a, b) => b.score - a.score);

    const participants = [];
    teams.forEach((t, i) => roster.slice(i * 2, i * 2 + 2).forEach(p => {
        const rank = scores.findIndex(s => s.teamIndex === t.teamIndex);
        participants.push({
            playerUuid: p.uuid, teamIndex: t.teamIndex,
            finalScore: scores[rank].score, placement: rank + 1, won: rank === 0,
        });
    }));

    return {
        matchId, startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString(),
        durationSeconds, mode, teams, participants, items, settings,
    };
};

/** Global recent-matches feed, newest first. */
export const mockMatches = (count = 24) =>
    Array.from({ length: count }, (_, i) => buildMatch(i + 1))
        .sort((a, b) => new Date(b.endedAt) - new Date(a.endedAt));

// ── Match derivations ───────────────────────────────────────────────────────
// These read the DTO shape directly, so they survive the swap to the real API.

/** One row per team for TEAM matches, one per player for SOLO. */
export const matchStandings = (match) => {
    if (match.mode === 'SOLO') {
        return match.participants.slice().sort((a, b) => a.placement - b.placement).map(p => ({
            key: p.playerUuid,
            owner: { playerUuid: p.playerUuid, teamIndex: null },
            members: [p.playerUuid], placement: p.placement, score: p.finalScore, won: p.won,
        }));
    }
    return match.teams.map(team => {
        const members = match.participants.filter(p => p.teamIndex === team.teamIndex);
        const first = members[0];
        return {
            key: `t${team.teamIndex}`,
            owner: { playerUuid: null, teamIndex: team.teamIndex },
            members: members.map(m => m.playerUuid),
            placement: first?.placement ?? 0, score: first?.finalScore ?? 0, won: first?.won ?? false,
        };
    }).sort((a, b) => a.placement - b.placement);
};

export const itemsForOwner = (match, owner) =>
    match.items
        .filter(it => (owner.teamIndex != null ? it.teamIndex === owner.teamIndex : it.playerUuid === owner.playerUuid))
        .sort((a, b) => a.orderIndex - b.orderIndex);

/**
 * Competitors reshaped for the trace: each event carries its offset in seconds
 * from the match start, which is all the chart and the strips need.
 */
export const raceEntries = (match) => {
    const start = new Date(match.startedAt).getTime();
    return matchStandings(match).map((row, i) => ({
        ...row,
        index: i,
        events: itemsForOwner(match, row.owner).map(it => ({
            t: Math.max(0, (new Date(it.collectedAt).getTime() - start) / 1000),
            skipped: it.skipped,
            b2b: it.b2bRarity,
            itemName: it.itemName,
        })),
    }));
};

/** Score is item count including skips -- skips score, which is why they count. */
export const scoreAt = (entry, t) => {
    let n = 0;
    for (const e of entry.events) { if (e.t <= t) n++; else break; }
    return n;
};

/** Every distinct moment something happened, for sampling the gap series. */
export const eventTimes = (entries) =>
    [...new Set(entries.flatMap(e => e.events.map(ev => Math.round(ev.t))))].sort((a, b) => a - b);

/** Standings frozen at time t, ranked and gapped to the leader. */
export const standingsAt = (entries, t) => {
    const rows = entries
        .map(entry => {
            const seen = entry.events.filter(e => e.t <= t);
            return {
                entry,
                score: seen.length,
                found: seen.filter(e => !e.skipped).length,
                skipped: seen.filter(e => e.skipped).length,
                b2b: seen.filter(e => e.b2b).length,
            };
        })
        .sort((a, b) => b.score - a.score || a.entry.index - b.entry.index);
    const lead = rows[0]?.score ?? 0;
    return rows.map((r, i) => ({ ...r, pos: i + 1, gap: r.score - lead }));
};

export const leadChanges = (entries) => {
    let count = 0, lead = null;
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
 * `leadChanges` counts these for a headline figure; the timeline underneath
 * the race trace marks them, because "when it turned" is the most useful
 * landmark on the chart. Same walk, just keeping the timestamps.
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

// ── Formatters ──────────────────────────────────────────────────────────────

export const formatNumber = (n) => {
    if (n == null) return '—';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 10000) return `${(n / 1000).toFixed(1)}K`;
    // Locale is pinned. Left to the browser, a German client renders this as
    // "1.216.896" while every other formatter in the module says "1,216,896".
    return n.toLocaleString('en-US');
};

export const formatDistance = (b) => {
    if (b == null) return '—';
    if (b >= 1000000) return `${(b / 1000000).toFixed(2)}M`;
    if (b >= 1000) return `${(b / 1000).toFixed(1)}K`;
    return b.toLocaleString('en-US');
};

/** Clock form "42:07" -- used for match durations, offsets and per-item times. */
export const mmss = (s) => {
    const total = Math.max(0, Math.round(s));
    if (total >= 3600) return `${Math.floor(total / 3600)}:${String(Math.floor((total % 3600) / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export const formatTime = (s) => {
    if (s == null || Number.isNaN(s)) return '—';
    const total = Math.round(s);
    if (total >= 60) return `${Math.floor(total / 60)}m ${total % 60}s`;
    return `${total}s`;
};

export const formatDate = (v) => {
    const d = new Date(v);
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatClock = (v) =>
    new Date(v).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

export const formatByKind = (value, kind) => {
    if (kind === 'compact') return formatNumber(value);
    if (kind === 'distance') return `${formatDistance(value)} blocks`;
    return (value ?? 0).toLocaleString('en-US');
};

// ── Derived metrics (computed, never stored) ────────────────────────────────

export const winRate = (won, played) => (played > 0 ? (won / played) * 100 : 0);
export const itemsPerGame = (items, games) => (games > 0 ? items / games : 0);
export const secondsPerItem = (time, items) => (items > 0 ? time / items : 0);
export const totalRarities = (r) =>
    RARITY_KEYS.reduce((a, k) => a + (r?.[RARITY_FIELDS[k]] ?? 0), 0);

// ── Dashboard rollups ───────────────────────────────────────────────────────
// Everything below is derived for the landing page. None of it has a service
// endpoint yet -- see the notes on each for what the real query would be.

/**
 * Weekly leaderboard with movement against the prior week.
 * Real query: GROUP BY player over fib_match WHERE ended_at > now() - 7d,
 * run twice against two windows to get the delta.
 */
export const mockWeeklyBoard = () =>
    MOCK_PLAYERS
        .map(p => {
            const rng = rngFor('week', p.uuid);
            return {
                playerUuid: p.uuid,
                wins: between(rng, 3, 16),
                items: between(rng, 90, 350),
                b2b: between(rng, 2, 12),
                delta: between(rng, -3, 3),
            };
        })
        .sort((a, b) => b.wins - a.wins)
        .map((r, i) => ({ rank: i + 1, ...r }));

/**
 * The most eventful recent match, measured by lead changes rather than an
 * editorial pick. Real query needs lead_changes materialised on fib_match at
 * submit time -- computing it across a week of item logs on every page load
 * would not be cheap.
 */
export const mockMatchOfTheWeek = (matches) => {
    let best = null;
    let bestChanges = -1;
    for (const match of matches.slice(0, 12)) {
        const changes = leadChanges(raceEntries(match));
        if (changes > bestChanges) { bestChanges = changes; best = match; }
    }
    return { match: best, changes: bestChanges };
};

/**
 * Notable back-to-backs. Real query: fib_match_item WHERE b2b_rarity IN
 * (LEGENDARY, RNGESUS, EXTRAORDINARY) ORDER BY collected_at DESC.
 */
export const mockRareMoments = (matches, limit = 6) => {
    const out = [];
    for (const match of matches) {
        for (const item of match.items) {
            if (!['LEGENDARY', 'RNGESUS', 'EXTRAORDINARY'].includes(item.b2bRarity)) continue;
            const owner = item.playerUuid
                ?? match.participants.find(p => p.teamIndex === item.teamIndex)?.playerUuid;
            if (!owner) continue;
            out.push({
                playerUuid: owner,
                itemName: item.itemName,
                rarity: item.b2bRarity,
                at: item.collectedAt,
                matchId: match.matchId,
            });
            if (out.length >= limit * 3) break;
        }
        if (out.length >= limit * 3) break;
    }
    return out.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, limit);
};

/**
 * Which items stall runs hardest. Real query: AVG of the gap between an item
 * and its predecessor, grouped by item_name. Needs a window function or a
 * precomputed column -- this is the most expensive thing on the dashboard.
 */
export const mockItemIndex = (matches) => {
    const acc = new Map();
    for (const match of matches) {
        const start = new Date(match.startedAt).getTime();
        const byOwner = new Map();
        for (const item of match.items) {
            const key = item.playerUuid ?? `t${item.teamIndex}`;
            const prev = byOwner.get(key) ?? start;
            const now = new Date(item.collectedAt).getTime();
            byOwner.set(key, now);
            const took = Math.max(1, (now - prev) / 1000);
            const row = acc.get(item.itemName) ?? { itemName: item.itemName, seen: 0, total: 0, skipped: 0 };
            row.seen += 1;
            row.total += took;
            if (item.skipped) row.skipped += 1;
            acc.set(item.itemName, row);
        }
    }
    return [...acc.values()].map(r => ({
        itemName: r.itemName,
        seen: r.seen,
        avgSeconds: r.total / r.seen,
        skipRate: (r.skipped / r.seen) * 100,
    }));
};

/**
 * Server-wide totals for the dashboard tiles.
 *
 * These four are deliberately whole-server figures, not rollups of the sampled
 * matches below: the sample is 24 matches across 8 players, and quoting its
 * numbers under a label like "Ranked players" would understate the server by
 * two orders of magnitude. They become the results endpoint's own totals when
 * it lands; the shape is what matters here.
 *
 * `achievementsGranted` replaced an average-match-length figure. Rounds are a
 * fixed 60 minutes on this server, so an average of them was arithmetic with
 * no question behind it — it could only ever report the setting back. How many
 * achievements the server has handed out is a real number that moves.
 * The catalogue holds 14, so 1,204 ranked players put the ceiling near 16,800.
 */
export const mockGlobalStats = (matches) => {
    const items = matches.reduce((a, m) => a + m.items.length, 0);
    return {
        matchesPlayed: 4471,
        matchesThisWeek: 38,
        itemsFound: 842190,
        itemsThisWeek: 6104,
        playersRanked: 1204,
        playersThisWeek: 27,
        achievementsGranted: 5847,
        achievementsThisWeek: 131,
        sampleItems: items,
    };
};

/**
 * Activity feed. Not live -- these are completed events read back in reverse
 * chronological order, which is why nothing in the UI claims real time.
 */
export const mockActivity = (matches, limit = 10) => {
    const out = [];
    matches.slice(0, 6).forEach(match => {
        const winner = matchStandings(match)[0];
        out.push({
            kind: 'win', at: match.endedAt, playerUuids: winner.members,
            score: winner.score, matchId: match.matchId,
        });
    });
    mockRareMoments(matches, 6).forEach(m => out.push({
        kind: 'b2b', at: m.at, playerUuids: [m.playerUuid],
        rarity: m.rarity, itemName: m.itemName,
    }));
    return out.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, limit);
};

/** "4 min ago" / "yesterday" for feed rows. */
export const timeAgo = (value) => {
    const mins = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    return days === 1 ? 'yesterday' : `${days} days ago`;
};