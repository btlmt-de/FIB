/* POOL_PATH is a cross-repo contract (CLAUDE.md, "The path is part of the contract"): moving the file 404s this page. */

import { PAPER_VERSION } from '../../wiki/data/atlas.js';

export const PLUGIN_REPO = 'McPlayHDnet/ForceItemBattle';
export const POOL_PATH = 'src/main/java/forceitembattle/manager/ItemDifficultiesManager.java';
export const POOL_RAW_URL = `https://raw.githubusercontent.com/${PLUGIN_REPO}/main/${POOL_PATH}`;

export const DESCRIPTIONS_PATH = 'src/main/resources/descriptions.yml';
const RAW_BASE_URL = `https://raw.githubusercontent.com/${PLUGIN_REPO}`;
const PUBLIC_BRANCHES_URL = `https://api.github.com/repos/${PLUGIN_REPO}/branches`;

/* Pinned to PAPER_VERSION, not misode's moving branch: a snapshot-only item is not missing from this server's pool. */
const REGISTRY_URLS = [
    `https://raw.githubusercontent.com/misode/mcmeta/${PAPER_VERSION}-registries/item/data.json`,
    'https://raw.githubusercontent.com/misode/mcmeta/refs/heads/registries/item/data.json',
];

export const DEFAULT_BRANCH = 'main';
export const STAGE_KEYS = ['EARLY', 'MID', 'LATE'];
export const TAG_KEYS = ['NETHER', 'END', 'EXTREME'];
const CACHE_KEY = 'forceitem_pools_cache_v4';
const LAST_EDIT_KEY = 'forceitem_last_edit';
const REGISTRY_CACHE_KEY = 'forceitem_misode_cache_v2';
const VIEW_BRANCH_KEY = 'fib_view_branch';
const CACHE_MS = 60 * 60 * 1000;
const REGISTRY_CACHE_MS = 24 * 60 * 60 * 1000;

/* ── Parsing ─────────────────────────────────────────────────────────────────── */

// Identical to vendor-pool.mjs and the plugin's CrossRepoContractTest. Do not reshape.
export const REGISTER_REGEX = /register\(Material\.(\w+),\s*State\.(\w+)(?:,\s*ItemTag\.(\w+))?(?:,\s*ItemTag\.(\w+))?(?:,\s*ItemTag\.(\w+))?\)/g;

export function displayNameOf(material) {
    return material.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function parseJavaFile(content) {
    const items = [];
    REGISTER_REGEX.lastIndex = 0;
    let match;
    while ((match = REGISTER_REGEX.exec(content)) !== null) {
        const [, material, state, t1, t2, t3] = match;
        items.push({ material, state, tags: [t1, t2, t3].filter(Boolean), displayName: displayNameOf(material), description: null });
    }
    return items;
}

/* Escaped on write: a quote typed into a description would break /info for the whole server. */
export const yamlQuote = (s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const yamlUnquote = (s) => s.replace(/\\(["\\])/g, '$1');

export function parseDescriptions(content) {
    const descriptions = {};
    let inDescriptions = false;
    let current = null;
    let lines = [];
    const flush = () => { if (current && lines.length) descriptions[current] = lines; };

    for (const line of content.split('\n')) {
        if (line.trim() === 'descriptions:') { inDescriptions = true; continue; }
        if (!inDescriptions) continue;
        if (/^[a-zA-Z]/.test(line) && !line.startsWith(' ')) { flush(); inDescriptions = false; continue; }
        const item = line.match(/^\s{2}([A-Z0-9_]+):\s*$/);
        if (item) { flush(); current = item[1]; lines = []; continue; }
        const text = line.match(/^\s{4}-\s*"(.*)"\s*$/);
        if (text && current) lines.push(yamlUnquote(text[1]));
    }
    flush();
    return descriptions;
}

/* ── Caching ─────────────────────────────────────────────────────────────────── */

function readCache(branch) {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { data, timestamp, cachedBranch } = JSON.parse(raw);
        const lastEdit = Number(localStorage.getItem(LAST_EDIT_KEY) || 0);
        if (cachedBranch !== branch || timestamp < lastEdit || Date.now() - timestamp > CACHE_MS) return null;
        return { items: data.items, timestamp };
    } catch {
        return null;
    }
}

function writeCache(items, branch) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: { items }, timestamp: Date.now(), cachedBranch: branch }));
        localStorage.removeItem(LAST_EDIT_KEY);
    } catch { /* storage full or blocked: the page works without it */ }
}

export function invalidateCache() {
    try {
        localStorage.removeItem(CACHE_KEY);
        localStorage.setItem(LAST_EDIT_KEY, String(Date.now()));
    } catch { /* see writeCache */ }
}

export function getViewBranch() {
    try { return localStorage.getItem(VIEW_BRANCH_KEY) || DEFAULT_BRANCH; } catch { return DEFAULT_BRANCH; }
}
export function setViewBranch(branch) {
    try { localStorage.setItem(VIEW_BRANCH_KEY, branch); } catch { /* see writeCache */ }
}

/* ── Loading ─────────────────────────────────────────────────────────────────── */

/* The pool is always the plugin's main: pool changes are not live until their pull request merges. */
export async function loadPool(branch, { fresh = false } = {}) {
    if (!fresh) {
        const cached = readCache(branch);
        if (cached) return cached;
    }
    const [javaRes, configRes] = await Promise.all([
        fetch(POOL_RAW_URL, { cache: 'no-store' }),
        fetch(`${RAW_BASE_URL}/${encodeURIComponent(branch)}/${DESCRIPTIONS_PATH}?t=${Date.now()}`),
    ]);
    if (!javaRes.ok) throw new Error(`Could not read the pool from GitHub (HTTP ${javaRes.status}).`);
    const items = parseJavaFile(await javaRes.text());
    if (configRes.ok) {
        const descriptions = parseDescriptions(await configRes.text());
        for (const item of items) item.description = descriptions[item.material] ?? null;
    }
    writeCache(items, branch);
    return { items, timestamp: Date.now() };
}

export async function loadPublicBranches() {
    try {
        const res = await fetch(`${PUBLIC_BRANCHES_URL}?per_page=100`);
        if (!res.ok) return [DEFAULT_BRANCH];
        const names = (await res.json()).map((b) => b.name);
        return names.length ? names : [DEFAULT_BRANCH];
    } catch {
        return [DEFAULT_BRANCH];
    }
}

export async function loadRegistry({ fresh = false } = {}) {
    if (!fresh) {
        try {
            const raw = localStorage.getItem(REGISTRY_CACHE_KEY);
            if (raw) {
                const { data, timestamp, version } = JSON.parse(raw);
                if (version === PAPER_VERSION && Date.now() - timestamp < REGISTRY_CACHE_MS) return data;
            }
        } catch { /* fall through to the network */ }
    }
    for (const url of REGISTRY_URLS) {
        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = (await res.json()).filter((m) => m !== 'air').map((m) => m.toUpperCase());
            try {
                localStorage.setItem(REGISTRY_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now(), version: PAPER_VERSION }));
            } catch { /* see writeCache */ }
            return data;
        } catch { /* try the next source */ }
    }
    return [];
}

export { spriteOf, spriteFallback } from '../../wiki/game/sprite.js';
