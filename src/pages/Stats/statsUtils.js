// ============================================================================
// STATS UTILITIES, CONSTANTS & MOCK DATA
// ============================================================================

// Design tokens specific to stats pages
export const STATS_COLORS = {
    bg:          'oklch(17% 0.025 255)',
    bgLight:     'oklch(21% 0.023 255)',
    bgLighter:   'oklch(25% 0.021 255)',
    bgHover:     'oklch(28% 0.019 255)',
    text:        'oklch(94% 0.007 255)',
    textMuted:   'oklch(58% 0.012 255)',
    textDim:     'oklch(42% 0.013 255)',
    border:      'oklch(30% 0.019 255)',
    borderLight: 'oklch(36% 0.016 255)',
    accent:      'oklch(65% 0.16 255)',
    accentHover: 'oklch(70% 0.16 255)',
    gold:        'oklch(76% 0.16 68)',
    amber:       'oklch(76% 0.16 68)',
    aqua:        'oklch(68% 0.12 200)',
    green:       'oklch(64% 0.20 142)',
    yellow:      'oklch(82% 0.16 90)',
    red:         'oklch(62% 0.22 25)',
    blue:        'oklch(65% 0.16 255)',
    darkPurple:  'oklch(62% 0.18 300)',
    orange:      'oklch(72% 0.18 55)',
    rarities: {
        COMMON:        'oklch(58% 0.012 255)',
        UNCOMMON:      'oklch(64% 0.20 142)',
        RARE:          'oklch(65% 0.16 255)',
        EPIC:          'oklch(62% 0.18 300)',
        LEGENDARY:     'oklch(76% 0.16 68)',
        EXTRAORDINARY: 'oklch(72% 0.24 150)',
        RNGESUS:       'oklch(66% 0.24 320)',
    },
};

export const MC_FONT = "'Barlow Condensed', system-ui, sans-serif";

export const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib';

// ============================================================================
// MOCK DATA (replace with API calls when backend is ready)
// ============================================================================

export const MOCK_PLAYERS = [
    { id: 'p1', name: 'threeseconds',  avatarUrl: 'https://mc-heads.net/avatar/threeseconds/100',  gamesPlayed: 87 },
    { id: 'p2', name: 'eltobito',      avatarUrl: 'https://mc-heads.net/avatar/eltobito/100',      gamesPlayed: 64 },
    { id: 'p3', name: 'stupxd',        avatarUrl: 'https://mc-heads.net/avatar/stupxd/100',        gamesPlayed: 53 },
    { id: 'p4', name: 'apppaa',        avatarUrl: 'https://mc-heads.net/avatar/apppaa/100',        gamesPlayed: 41 },
    { id: 'p5', name: 'CH0RD',         avatarUrl: 'https://mc-heads.net/avatar/CH0RD/100',         gamesPlayed: 38 },
    { id: 'p6', name: 'McPlayHD',      avatarUrl: 'https://mc-heads.net/avatar/McPlayHD/100',      gamesPlayed: 29 },
    { id: 'p7', name: 'Owen1212055',   avatarUrl: 'https://mc-heads.net/avatar/Owen1212055/100',   gamesPlayed: 22 },
    { id: 'p8', name: 'shabana02',     avatarUrl: 'https://mc-heads.net/avatar/shabana02/100',     gamesPlayed: 17 },
];

// O(1) lookup map for players by name - use instead of Array.find()
export const PLAYERS_BY_NAME = new Map(MOCK_PLAYERS.map(p => [p.name, p]));

export const MOCK_TEAMS = [
    { id: 't1', players: ['threeseconds', 'eltobito'], gamesPlayed: 47 },
    { id: 't2', players: ['threeseconds', 'stupxd'], gamesPlayed: 23 },
    { id: 't3', players: ['eltobito', 'apppaa'], gamesPlayed: 31 },
    { id: 't4', players: ['CH0RD', 'stupxd'], gamesPlayed: 18 },
];

export const generateMockStats = (entityId, isTeam = false) => {
    const gamesPlayed = Math.floor(Math.random() * 100) + 20;
    const winRate = Math.random() * 0.7 + 0.15;
    const gamesWon = Math.floor(gamesPlayed * winRate);

    return {
        rank: Math.floor(Math.random() * 50) + 1,
        totalItems: Math.floor(Math.random() * 2000) + 500,
        topItems: [
            { name: 'DIAMOND_SWORD', count: Math.floor(Math.random() * 100) + 50, texture: 'diamond_sword' },
            { name: 'GOLDEN_APPLE', count: Math.floor(Math.random() * 80) + 30, texture: 'golden_apple' },
            { name: 'ENDER_PEARL', count: Math.floor(Math.random() * 60) + 20, texture: 'ender_pearl' },
        ],
        avgItemsPerRound: (Math.random() * 5 + 2).toFixed(1),
        raritiesFound: {
            COMMON:        Math.floor(Math.random() * 1000) + 400,
            UNCOMMON:      Math.floor(Math.random() * 600)  + 200,
            RARE:          Math.floor(Math.random() * 300)  + 100,
            EPIC:          Math.floor(Math.random() * 100)  + 20,
            LEGENDARY:     Math.floor(Math.random() * 40)   + 5,
            EXTRAORDINARY: Math.floor(Math.random() * 10),
            RNGESUS:       Math.floor(Math.random() * 3),
        },
        distanceTravelled: Math.floor(Math.random() * 1000000) + 100000,
        highestScore: Math.floor(Math.random() * 15000) + 5000,
        highestB2BStreak: Math.floor(Math.random() * 10) + 1,
        longestItemStreak: Math.floor(Math.random() * 30) + 5,
        avgTimePerItem: (Math.random() * 20 + 5).toFixed(1),
        gamesPlayed,
        gamesWon,
    };
};

export const generateMockLeaderboard = (sortBy) => {
    const players = MOCK_PLAYERS.map((player) => {
        const stats = generateMockStats(player.id);
        return {
            ...player,
            ...stats,
            winRate: stats.gamesPlayed > 0 ? ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1) : 0,
        };
    });

    // Use slice().sort() for immutability - doesn't mutate original array
    let sortedPlayers;
    switch (sortBy) {
        case 'gamesWon':
            sortedPlayers = players.slice().sort((a, b) => b.gamesWon - a.gamesWon);
            break;
        case 'totalItems':
            sortedPlayers = players.slice().sort((a, b) => b.totalItems - a.totalItems);
            break;
        case 'winRate':
            sortedPlayers = players.slice().sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));
            break;
        case 'highestScore':
            sortedPlayers = players.slice().sort((a, b) => b.highestScore - a.highestScore);
            break;
        case 'highestB2BStreak':
            sortedPlayers = players.slice().sort((a, b) => b.highestB2BStreak - a.highestB2BStreak);
            break;
        case 'distanceTravelled':
            sortedPlayers = players.slice().sort((a, b) => b.distanceTravelled - a.distanceTravelled);
            break;
        default:
            sortedPlayers = players.slice().sort((a, b) => b.gamesWon - a.gamesWon);
    }

    return sortedPlayers.map((p, idx) => ({ ...p, rank: idx + 1 }));
};

export const generateMockMatchHistory = () => {
    const matches = [];
    const maps = ['Overworld', 'Nether', 'End', 'Custom Arena', 'Sky Islands'];

    for (let i = 0; i < 20; i++) {
        const player1 = MOCK_PLAYERS[Math.floor(Math.random() * MOCK_PLAYERS.length)];
        let player2 = MOCK_PLAYERS[Math.floor(Math.random() * MOCK_PLAYERS.length)];
        while (player2.id === player1.id) {
            player2 = MOCK_PLAYERS[Math.floor(Math.random() * MOCK_PLAYERS.length)];
        }

        const isWin = Math.random() > 0.5;
        const duration = Math.floor(Math.random() * 1800) + 300;

        matches.push({
            id: `match_${i}`,
            date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            opponent: player2,
            outcome: isWin ? 'WIN' : 'LOSS',
            score: {
                player: Math.floor(Math.random() * 15) + (isWin ? 5 : 0),
                opponent: Math.floor(Math.random() * 15) + (isWin ? 0 : 5),
            },
            duration,
            map: maps[Math.floor(Math.random() * maps.length)],
            itemsCollected: Math.floor(Math.random() * 50) + 10,
            raresFound: Math.floor(Math.random() * 5),
        });
    }

    // Use slice().sort() for immutability
    return matches.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
};

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

export const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
};

export const formatDistance = (blocks) => {
    if (blocks >= 1000000) return `${(blocks / 1000000).toFixed(2)}M blocks`;
    if (blocks >= 1000) return `${(blocks / 1000).toFixed(1)}K blocks`;
    return `${blocks.toLocaleString()} blocks`;
};

export const formatTime = (seconds) => {
    if (seconds >= 60) {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(0);
        return `${mins}m ${secs}s`;
    }
    return `${seconds}s`;
};

export const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};