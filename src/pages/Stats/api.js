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
    ]);

    if (!settled.some((s) => s.status === 'fulfilled')) {
        const firstError = settled.find((s) => s.status === 'rejected');
        throw firstError?.reason ?? new ApiError(0, 'The player directory could not be loaded.');
    }

    const [roster, combined, duo] = settled.map((s) => (s.status === 'fulfilled' ? s.value.data : null));

    // Dedup by uuid; first name seen wins (they agree across sources anyway).
    const byUuid = new Map();
    const add = (identity) => {
        const uuid = idUuid(identity);
        if (!uuid || byUuid.has(uuid)) return;
        byUuid.set(uuid, { uuid, name: idName(identity) ?? uuid });
    };
    (roster?.players ?? []).forEach((p) => add(p.player));
    (Array.isArray(combined) ? combined : []).forEach((row) => add(row.player));
    (Array.isArray(duo) ? duo : []).forEach((row) => { add(row.player1); add(row.player2); });

    const players = [...byUuid.values()].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    const stale = settled.some((s) => s.status === 'fulfilled' && s.value.stale);
    return { data: { players }, stale };
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
