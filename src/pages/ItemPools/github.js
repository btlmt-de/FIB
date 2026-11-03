/*
 * Pool changes go to the plugin repo on a branch with a pull request; /info changes go to this repo's config.yml.
 * An old editor's token has no expiry recorded, so it is cleared once.
 */

import { CONFIG_PATH, DEFAULT_BRANCH, PLUGIN_REPO, POOL_PATH, SITE_REPO } from './poolData.js';

const API = 'https://api.github.com';
export const TOKEN_URL = 'https://github.com/settings/tokens/new?description=FIB%20Item%20Pools&scopes=repo';
export const PROTECTED = new Set(['main', 'master']);
export const BRANCH_NAME = /^[a-zA-Z0-9._/-]+$/;

export const REPOS = {
    pool: { repo: PLUGIN_REPO, path: POOL_PATH, label: 'Plugin', base: 'main' },
    info: { repo: SITE_REPO, path: CONFIG_PATH, label: 'Descriptions', base: DEFAULT_BRANCH },
};

/* ── The token ───────────────────────────────────────────────────────────────── */

const TOKEN_KEY = 'fib_github_token';
const EXPIRY_KEY = 'fib_github_token_expiry';
const USER_KEY = 'fib_github_user';
const REMEMBER_DAYS = 60;
let memory = { token: null, user: null };

export function storedAuth() {
    if (memory.token) return memory;
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        const expiry = Number(localStorage.getItem(EXPIRY_KEY) || 0);
        if (token && expiry && Date.now() <= expiry) {
            memory = { token, user: JSON.parse(localStorage.getItem(USER_KEY) || 'null') };
            return memory;
        }
        if (token) clearAuth();
    } catch { /* storage blocked: memory only */ }
    return { token: null, user: null };
}

export function saveAuth(token, user, remember) {
    memory = { token, user };
    if (!remember) return;
    try {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(EXPIRY_KEY, String(Date.now() + REMEMBER_DAYS * 86400000));
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch { /* memory only */ }
}

export function clearAuth() {
    memory = { token: null, user: null };
    try { [TOKEN_KEY, EXPIRY_KEY, USER_KEY].forEach((k) => localStorage.removeItem(k)); } catch { /* nothing stored */ }
}

/* ── Calls ───────────────────────────────────────────────────────────────────── */

async function gh(token, path, init = {}) {
    const res = await fetch(`${API}${path}`, {
        ...init,
        headers: {
            Accept: 'application/vnd.github+json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
    });
    if (!res.ok) {
        let message = `GitHub answered ${res.status}`;
        try { message = (await res.json()).message || message; } catch { /* not JSON */ }
        throw new Error(message);
    }
    return res.json();
}

export const whoAmI = (token) => gh(token, '/user');

export async function canPush(token, repo) {
    const info = await gh(token, `/repos/${repo}`);
    return info.permissions?.push === true;
}

export async function listBranches(token, repo) {
    return (await gh(token, `/repos/${repo}/branches?per_page=100`)).map((b) => b.name);
}

function decode(base64) {
    const bin = atob(base64.replace(/\n/g, ''));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
}
const encode = (text) => btoa(unescape(encodeURIComponent(text)));

export async function readFile(token, { repo, path }, branch) {
    const data = await gh(token, `/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`);
    return { content: decode(data.content), sha: data.sha };
}

export function writeFile(token, { repo, path }, branch, content, sha, message) {
    return gh(token, `/repos/${repo}/contents/${path}`, {
        method: 'PUT',
        body: JSON.stringify({ message, content: encode(content), sha, branch }),
    });
}

export async function createBranch(token, repo, name, from) {
    const ref = await gh(token, `/repos/${repo}/git/refs/heads/${encodeURIComponent(from)}`);
    return gh(token, `/repos/${repo}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({ ref: `refs/heads/${name}`, sha: ref.object.sha }),
    });
}

export function openPullRequest(token, repo, { title, head, base, body }) {
    return gh(token, `/repos/${repo}/pulls`, { method: 'POST', body: JSON.stringify({ title, head, base, body }) });
}

export function recentCommits(token, { repo, path }, n = 20) {
    return gh(token, `/repos/${repo}/commits?path=${encodeURIComponent(path)}&per_page=${n}`);
}
