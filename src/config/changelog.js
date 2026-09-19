// ============================================
// The wheel's release notes
// ============================================
//
// One entry per release, newest first. `LATEST_VERSION` is what the popup fires
// against: a visitor whose stored "seen" version is anything other than this gets
// the modal once, and the topbar's mark stays lit until they close it.
//
// ── THE FIGURES HERE ARE FROZEN, AND THAT IS THE POINT ──────────────────────
//
// Every rate below is written out rather than derived from the live roster, and
// the temptation to compute them from RELIC_ITEMS / TEAM_MEMBERS and friends
// should be resisted. A changelog is a record of what changed on a date. If these
// numbers tracked the live weights, then the next time a tier is retuned this
// entry would quietly start describing the new odds while still claiming to be the
// announcement of the old ones — a document that rewrites its own history is worse
// than no document. `/api/items` is where the current odds live; this is where
// September's odds live, permanently.
//
// ── ADDING A RELEASE ────────────────────────────────────────────────────────
//
// Prepend an entry and give it a new `version`. Nothing else has to change: the
// popup, the unseen mark and the modal all read from this file, and every visitor
// sees the new entry once on their next load. Bump `version` ONLY for things worth
// interrupting someone over — a rarity ladder changing is; a bugfix is not.

/**
 * Block kinds the modal knows how to draw. Everything here is data, so a future
 * entry composes a page out of the same four shapes rather than shipping its own
 * layout:
 *
 *   rationale — why the release happened, in prose. Put it first.
 *   tier      — a rarity's colour, its rate, and the items that live in it
 *   ladder    — the whole rarity ladder as log-scaled bars, one row per tier
 *   changes   — a before/after table
 *   notes     — short labelled paragraphs for everything that is not a number
 */
export const CHANGELOG = [
    {
        version: '2.0',
        date: '2026-09-20',
        title: 'The Relic Update',
        tagline: 'A seventh rarity, and the odds around it rebuilt to make room.',
        blocks: [
            // Leads the entry, deliberately. The first draft opened on the new tier
            // and never said why it exists — a release note that lists what moved
            // without saying what was wrong reads as change for its own sake, which
            // is how players decide an update was done to them rather than for them.
            {
                kind: 'rationale',
                heading: 'Why the odds changed',
                paragraphs: [
                    'The ladder had names that did not mean anything. A single Legendary ' +
                    'dropped at 0.050% and a single Exotic at 0.055% — two tiers, different ' +
                    'colours, all but identical odds. You could not tell from the word which ' +
                    'was the harder pull, because in practice neither was.',

                    'That also left nowhere to put anything new: the gap between the two ' +
                    'tiers was half a basis point wide with five items already standing in it.',

                    'So Legendary was spread out to open that gap, Relic was given the room ' +
                    'it made, and the tiers around them were re-spaced. Each step up the ' +
                    'ladder is now roughly twice as rare as the one below it — so a tier\'s ' +
                    'name finally tells you something about what it took to get.',
                ],
            },
            {
                kind: 'tier',
                rarity: 'relic',
                heading: 'A new rarity',
                rate: '1 in 500',
                body:
                    'Relics are places. Every other tier on the wheel is a person or an ' +
                    'object — Relic is six of the server\'s own structures, and they drop ' +
                    'like any other special.',
            },
            {
                kind: 'ladder',
                heading: 'Where it sits',
                note: 'Bar length is how often a tier drops, log-scaled — a linear scale would render everything above Legendary as a dot.',
                rows: [
                    { rarity: 'insane', label: 'Insane', rate: '1 in 1,000,000', oneIn: 1000000 },
                    { rarity: 'mythic', label: 'Mythic', rate: '1 in 7,143', oneIn: 7143 },
                    { rarity: 'legendary', label: 'Legendary', rate: '1 in 1,000', oneIn: 1000 },
                    { rarity: 'relic', label: 'Relic', rate: '1 in 500', oneIn: 500, isNew: true },
                    { rarity: 'exotic', label: 'Exotic', rate: '1 in 227', oneIn: 227 },
                    { rarity: 'rare', label: 'Rare', rate: '1 in 137', oneIn: 137 },
                ],
            },
            {
                kind: 'changes',
                heading: 'Also changed',
                rows: [
                    {
                        label: 'Legendary',
                        from: '1 in 645',
                        to: '1 in 1,000',
                        note: 'Compressed to open the band Relic now occupies. apppaa is untouched at 0.010%.',
                    },
                    {
                        label: 'Wandering Trader',
                        from: 'Legendary',
                        to: 'Mythic',
                        note: 'Same 0.005% it always had — it just sits with the tier that matches its odds now.',
                    },
                    {
                        label: 'Rare',
                        from: '10 heads',
                        to: '11 heads',
                        note: 'rzem joins at 1 in 1,563. Every head in the tier now has odds of its own; two pairs previously shared a weight.',
                    },
                ],
            },
            {
                kind: 'notes',
                heading: 'For collectors',
                items: [
                    {
                        label: 'Cartographer',
                        body: 'A new achievement for collecting all six Relics.',
                    },
                    {
                        label: 'Full House',
                        body: 'Now wants a duplicate of every Relic and every Exotic too, counted against the live roster.',
                    },
                    {
                        label: 'Prestige',
                        body:
                            'Relic takes level III, so Legendary, Mythic and Insane each move up one. ' +
                            'Levels you have already earned keep the name you earned them under.',
                    },
                ],
            },
        ],
    },
];

export const LATEST_VERSION = CHANGELOG[0].version;

// Per-browser rather than per-account, deliberately: /wheel is readable without
// logging in, and an announcement about the odds is for everyone looking at them.
// The cost is that it can reappear on a second device or after site data is
// cleared, which for release notes is the right way round — showing it twice is a
// smaller failure than never showing it to the half of the audience that is not
// signed in. There is no server-side read tracking for this and deliberately so:
// it would need a migration, an endpoint and an account.
const SEEN_KEY = 'fib:changelog:seen';

/**
 * The version this browser has already been shown, or null.
 *
 * Every access is wrapped: localStorage throws outright in a private window with
 * site data blocked, and a release note is not worth taking the page down for.
 */
export function readSeenVersion() {
    try {
        return window.localStorage.getItem(SEEN_KEY);
    } catch {
        return null;
    }
}

/** Remember that this browser has seen `version`. Silent if storage is unavailable. */
export function markVersionSeen(version) {
    try {
        window.localStorage.setItem(SEEN_KEY, version);
    } catch {
        // No storage: the popup will show again next load. That is the documented
        // degradation, not a bug to work around with a cookie.
    }
}
