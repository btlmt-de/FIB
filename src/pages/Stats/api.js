/**
 * The data layer — real fetches against the stats backend.
 *
 * This replaces a seeded mock generator. Everything the site shows now comes from the stats-backend
 * service over HTTP, which itself composes and forwards the public API. Nothing here synthesises
 * data; it fetches, and shapes only where a view needs a shape the endpoint does not already return.
 *
 * ## One bundle became many fetches
 *
 * The mock returned one object holding the whole site — every match, every player, the overview —
 * because a generator can produce all of it instantly. Real endpoints do not work that way: there
 * is no "everything" call. So the single loadStats() is gone, replaced by one loader per view, each
 * hitting the endpoint that answers that view. A consequence worth stating: a match deep link now
 * *fetches* that match rather than searching a loaded page for it, which is what makes deep links
 * work at all — the old find() could only see the current page.
 *
 * ## Envelope
 *
 * The stats backend already unwraps the public API's { status, data, ... } envelope and forwards
 * only the payload, so a 200 here is the bare payload and there is nothing to unwrap a second time.
 * A stale response carries an X-Stale-Age header (from the backend's last-good degradation); it is
 * read where a view wants to show "this is N seconds old", and ignored otherwise.
 */

/**
 * The base path. Same string in dev and prod: the Vite dev server proxies /stats-api to the local
 * backend, and Apache proxies it in production, so the app never needs to know which it is talking
 * to. This is why the path is baked in rather than read from an env var per environment.
 */
import { idUuid, idName } from './data.js';

const BASE = '/stats-api';

/** A request that failed in a way a view should show. Carries the status so a 404 can read as
 *  "not found" while a 503 reads as "temporarily unavailable". */
export class ApiError extends Error {
    constructor(status, message, stale = false) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.stale = stale;
    }
}

/**
 * A GET returning the parsed payload.
 *
 * Errors are mapped, not swallowed: a non-2xx becomes an ApiError carrying the status, so a caller
 * can branch (a profile 404s to "no such player", a board 503s to "temporarily unavailable"). A
 * network failure — fetch itself rejecting — becomes a status-0 ApiError, which reads as
 * unavailable rather than as any particular HTTP meaning.
 */
async function apiGet(path, params) {
    const url = new URL(BASE + path, window.location.origin);
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            if (v != null && v !== '') url.searchParams.set(k, String(v));
        }
    }

    let response;
    try {
        response = await fetch(url, { headers: { Accept: 'application/json' } });
    } catch {
        // DNS, connection refused, offline: no status to speak of.
        throw new ApiError(0, 'The stats service could not be reached.');
    }

    if (!response.ok) {
        // The backend's error body is { error, message }; fall back to the status text if absent.
        let message = response.statusText;
        try {
            const body = await response.json();
            message = body?.message ?? message;
        } catch { /* non-JSON error body; keep statusText */ }
        throw new ApiError(response.status, message);
    }

    const stale = response.headers.get('X-Stale-Age') != null;

    // A 204 or empty body is a legitimate "nothing here" for some endpoints.
    const text = await response.text();
    if (!text) return { data: null, stale };

    try {
        return { data: JSON.parse(text), stale };
    } catch {
        throw new ApiError(response.status, 'The stats service returned an unreadable response.');
    }
}

/* ── Per-view loaders ──────────────────────────────────────────────────────
 *
 * Each returns { data, stale }. The shape of `data` is the endpoint's payload, which the mock
 * generators were written to mirror exactly — so the components that consumed the mock consume
 * these unchanged, except where noted in the component itself.
 */

/** The overview: the composed dashboard, one call. Shape: { globals, podiums, featured, activity, moments }. */
export const loadOverview = () => apiGet('/dashboard');

/** One match's full detail, for the match view and any deep link into it. */
export const loadMatch = (matchId) => apiGet(`/matches/${encodeURIComponent(matchId)}`);

/** A page of the match feed. */
export const loadMatches = (page = 0, size = 20) => apiGet('/matches', { page, size });

/** One player's profile: { profile, partners, rank }, each section independently present-or-null. */
export const loadPlayer = (player) => apiGet(`/players/${encodeURIComponent(player)}`);

/**
 * One player's recent matches, for the profile's score trend.
 *
 * Hits /matches/player/{player} — the recent matches a player took part in, newest first. This
 * endpoint existed all along in FIBService and the public API; only the stats-backend passthrough
 * and this loader were missing, so the profile's score trend fills in as soon as both deploy.
 */
export const loadPlayerMatches = (player, size = 14) =>
    apiGet(`/matches/player/${encodeURIComponent(player)}`, { size });

/**
 * The player directory. `scope` here is the UI's word; the backend's roster is solo-only for now,
 * so `combined` is passed through and the backend decides. `query` filters by name.
 */
export const loadRoster = ({ page = 0, size = 25, query, sort = 'games_won' } = {}) =>
    apiGet('/players', { page, size, query, sort });

/** A leaderboard board. scope: solo | duo | combined. category: the board vocabulary. */
export const loadLeaderboard = (scope, category, limit = 100) =>
    apiGet('/leaderboards', { scope, category, limit });

/**
 * The player directory — every player with a record, as bare { uuid, name }, for
 * the Players index. No stats: this answers "who exists, how do I open them".
 *
 * TODO(backend): this is a client-side merge and should become a single roster
 * call. `/players` (loadRoster) is solo-only today, so a team-only player is
 * absent from it. They are recovered from the *combined* leaderboard, which
 * lists individuals (it sums every duo a player has been part of), plus the duo
 * board's members as a backstop. TOTAL_ITEMS is the most inclusive category —
 * you find items every match — so it catches anyone who has played at all. When
 * `/players` is broadened to return all players (solo or team), drop the two
 * leaderboard calls and read the roster alone.
 *
 * Sources are fetched together and tolerated individually: as long as ONE
 * resolves the index renders, so a single board being briefly unavailable
 * degrades the roster rather than blanking the page. Only a total failure
 * throws, which the view shows as "unavailable".
 */
export async function loadPlayerIndex() {
    const settled = await Promise.allSettled([
        loadRoster({ size: 500 }),
        loadLeaderboard('combined', 'TOTAL_ITEMS', 500),
        loadLeaderboard('duo', 'TOTAL_ITEMS', 500),
        // The recent feed, for "last seen". Its own failure costs the directory a
        // column, never the directory.
        loadMatches(0, 100),
    ]);

    if (!settled.slice(0, 3).some((s) => s.status === 'fulfilled')) {
        const firstError = settled.find((s) => s.status === 'rejected');
        throw firstError?.reason ?? new ApiError(0, 'The player directory could not be loaded.');
    }

    const [roster, combined, duo, feed] =
        settled.map((s) => (s.status === 'fulfilled' ? s.value.data : null));

    /*
     * Two facts per player, both free of a second round of fetches and both
     * available for EVERY player rather than only the solo roster:
     *
     *   itemsFound  the value already sitting on the combined TOTAL_ITEMS board,
     *               which was being fetched purely for the names on it and then
     *               thrown away. Combined sums solo and every duo, so it is the
     *               one count that exists for a team-only player too.
     *   lastSeen    the newest match in the recent feed this player appears in.
     *               A window, not a career — so it is absent rather than wrong
     *               for someone who has not played inside it.
     *
     * Deliberately NOT wins or rank: /ranking already answers those, and a
     * directory that re-ranks the field is the leaderboard wearing a hat, which
     * is what this view was carved out of in the first place.
     */
    const byUuid = new Map();
    const add = (identity) => {
        const uuid = idUuid(identity);
        if (!uuid) return null;
        if (!byUuid.has(uuid)) {
            byUuid.set(uuid, {
                uuid,
                name: idName(identity) ?? uuid,
                itemsFound: null,
                lastSeen: null,
            });
        }
        return byUuid.get(uuid);
    };

    (roster?.players ?? []).forEach((p) => add(p.player));
    (Array.isArray(combined) ? combined : []).forEach((row) => {
        const entry = add(row.player);
        if (entry && Number.isFinite(row.value)) entry.itemsFound = row.value;
    });
    (Array.isArray(duo) ? duo : []).forEach((row) => { add(row.player1); add(row.player2); });

    for (const match of feed?.matches ?? []) {
        const at = new Date(match.endedAt).getTime();
        if (!Number.isFinite(at)) continue;
        for (const p of match.participants ?? []) {
            const entry = add(p.player);
            if (entry && (entry.lastSeen == null || at > entry.lastSeen)) entry.lastSeen = at;
        }
    }

    const players = [...byUuid.values()].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    const stale = settled.some((s) => s.status === 'fulfilled' && s.value.stale);
    return { data: { players }, stale };
}

/**
 * The field a profile figure states its placing against — "2nd of 6".
 *
 * `Record` has always computed the placing; for a long time nothing supplied a
 * field to compute it from, so every note came out null and fourteen numerals
 * shipped bare, which is the one thing the module's layout grammar says a figure
 * must never do.
 *
 * ## Why this reads boards and not profiles
 *
 * The obvious source is the profiles themselves: read the roster, fetch every
 * player, and you have every metric for every player. That was built, and it was
 * wrong. It is O(players) requests per sweep, and this backend rate-limits —
 * a cold profile view already fires the profile, its matches, the catalogue, the
 * player's achievements and their collection, so adding a request per rostered
 * player pushed straight into 429s and the origin returning 502s under the load.
 * A comparison feature that degrades the pages it decorates is not worth having.
 *
 * `/leaderboards` is a whole column in one call: every player's value for one
 * metric, already ranked. Six calls covers six metrics for any roster size, and
 * the cost stops growing after that — a server with 400 players costs exactly
 * what a server with 6 does.
 *
 * The trade is coverage, and it is stated rather than hidden: six metrics are
 * board categories, `gamesPlayed` comes off the roster, and `itemsPerMatch` is
 * derived from the two. The rest — longest item streak, time per item, total
 * back-to-backs, wheel spins, antimatter trips — have no board and no roster
 * column, so they carry no note. A figure without a field renders bare, exactly
 * as every figure did before this existed.
 *
 * TODO(backend): one `/players/stats` returning every player's full block would
 * cover all fourteen in a single call, and this whole function becomes a map
 * over its rows.
 */

/*
 * Board category → the key `Record` asks for. The keys match `unifyStats`'s
 * vocabulary so a figure can name the stat it is comparing rather than a board.
 */
const FIELD_BOARDS = [
    ['gamesWon', 'GAMES_WON'],
    ['highestScore', 'HIGHEST_SCORE'],
    ['totalItemsFound', 'TOTAL_ITEMS'],
    ['highestB2BStreak', 'BACK_TO_BACK_STREAK'],
    ['blocksTravelled', 'BLOCKS_TRAVELLED'],
    ['deaths', 'DEATHS'],
];

/*
 * Cached per scope, because the field is server-wide: every profile compares
 * against the same seven responses, so browsing five profiles should cost one
 * fetch, not five. The in-flight promise is cached too, so two components
 * mounting together share one request rather than racing.
 *
 * TTL rather than forever — a finished match changes the boards, and a reader
 * with a tab open for an hour should not be comparing against yesterday.
 */
const FIELD_TTL_MS = 5 * 60 * 1000;
const fieldCache = new Map(); // scope -> { at, promise }

/** Drops the memoised field. Exposed for tests and for a hard-refresh path. */
export function clearStatFieldCache() {
    fieldCache.clear();
}

export function loadStatField(scope = 'solo') {
    const now = Date.now();
    const hit = fieldCache.get(scope);
    if (hit && now - hit.at < FIELD_TTL_MS) return hit.promise;

    const promise = fetchStatField(scope).catch((err) => {
        // Never cache a failure as the answer for the next five minutes.
        if (fieldCache.get(scope)?.promise === promise) fieldCache.delete(scope);
        throw err;
    });

    fieldCache.set(scope, { at: now, promise });
    return promise;
}

async function fetchStatField(scope) {
    const settled = await Promise.allSettled([
        ...FIELD_BOARDS.map(([, category]) => loadLeaderboard(scope, category, 500)),
        // Solo-only upstream, so it supplies gamesPlayed for the solo field and
        // nothing for combined — where those two figures simply carry no note.
        scope === 'solo' ? loadRoster({ size: 500 }) : Promise.resolve({ data: null, stale: false }),
    ]);

    const values = {};
    FIELD_BOARDS.forEach(([key], i) => {
        const s = settled[i];
        if (s.status !== 'fulfilled' || !Array.isArray(s.value.data)) return;
        const column = s.value.data.map((row) => row.value).filter(Number.isFinite);
        // A board that came back with fewer than three entrants is not a field;
        // `Record` suppresses the note rather than printing "1st of 2".
        if (column.length >= 3) values[key] = column;
    });

    const rosterResult = settled[settled.length - 1];
    const rosterRows = rosterResult.status === 'fulfilled'
        ? (rosterResult.value.data?.players ?? [])
        : [];
    if (rosterRows.length >= 3) {
        const played = rosterRows.map((r) => r.gamesPlayed).filter(Number.isFinite);
        if (played.length >= 3) values.gamesPlayed = played;

        // Derived, not fetched: the same ratio the figure itself shows.
        const perMatch = rosterRows
            .map((r) => (r.gamesPlayed > 0 ? r.totalItemsFound / r.gamesPlayed : null))
            .filter(Number.isFinite);
        if (perMatch.length >= 3) values.itemsPerMatch = perMatch;
    }

    const stale = settled.some((s) => s.status === 'fulfilled' && s.value.stale);
    if (Object.keys(values).length === 0) return { data: null, stale };
    return { data: { values }, stale };
}

/** The item index — the server-wide rarity snapshot. */
export const loadItems = () => apiGet('/items');

/** The achievement catalogue — every achievement that exists (id, title, description, scope). */
export const loadCatalogue = () => apiGet('/catalogue');

/** One player's unlocked achievements. Pairs with the catalogue to render the profile's honours. */
export const loadPlayerAchievements = (player) =>
    apiGet(`/achievements/${encodeURIComponent(player)}`);

/**
 * A player's full item collection — every item they have ever found, with first-collected time,
 * times collected, and how many other players have it (rarity joined in server-side).
 *
 * Returns FibCollection: { player, distinctItems, totalItems, totalPlayers, items: [
 *   { itemName, firstCollected, timesCollected, playerCount } ] }.
 * distinctItems is the "X collected" figure; totalItems is the pool size for "X of Y". This is the
 * whole collection book for one player, already assembled and rarity-joined by the service — no
 * pairing with a separate catalogue call needed.
 */
export const loadCollection = (player) =>
    apiGet(`/collection/${encodeURIComponent(player)}`);

/** One item's detail and its finders. */
export const loadItem = (itemName, limit = 50) =>
    apiGet(`/items/${encodeURIComponent(itemName)}`, { limit });
