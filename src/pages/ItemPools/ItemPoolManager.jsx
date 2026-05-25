import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
// Direct imports for bundle optimization (react-best-practices rule 2.1)
import X from 'lucide-react/dist/esm/icons/x';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Minus from 'lucide-react/dist/esm/icons/minus';
import Search from 'lucide-react/dist/esm/icons/search';
import GitBranch from 'lucide-react/dist/esm/icons/git-branch';
import GitPullRequest from 'lucide-react/dist/esm/icons/git-pull-request';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Package from 'lucide-react/dist/esm/icons/package';
import { useToast, ProgressSteps } from '../../components/common/UIComponents.jsx';

import { COLORS as C } from '../../config/constants';

const stateCol  = { EARLY: C.early,  MID: C.mid,    LATE: C.late   };
const stateColBg= { EARLY: C.greenBg,MID: C.amberBg,LATE: C.redBg  };
const stateColBd= { EARLY: C.greenBd,MID: C.amberBd,LATE: C.redBd  };
const tagCol    = { NETHER: C.nether, END: C.end, EXTREME: C.extreme };

const MODAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800;900&display=swap');
  @keyframes ipm-spin { to { transform: rotate(360deg); } }
  @keyframes ipm-in { from { opacity:0; transform: scale(0.97) translateY(8px); } to { opacity:1; transform: none; } }

  .ipm { font-family: 'Barlow', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  .ipm-overlay {
    position: fixed; inset: 0;
    background: oklch(6% 0.022 255 / 0.88);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: 20px;
  }
  .ipm-panel {
    background: oklch(17% 0.025 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 10px;
    width: 100%; max-width: 720px; max-height: 88vh;
    display: flex; flex-direction: column; overflow: hidden;
    animation: ipm-in 0.2s cubic-bezier(0.16,1,0.3,1) both;
  }

  /* Header */
  .ipm-header {
    padding: 14px 20px;
    border-bottom: 1px solid oklch(24% 0.022 255);
    display: flex; align-items: center; gap: 10px;
    flex-shrink: 0;
  }
  .ipm-title {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 17px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.5px;
    color: oklch(94% 0.007 255);
  }
  .ipm-user-pill {
    font-size: 11px; font-weight: 600;
    color: oklch(58% 0.012 255);
    background: oklch(23% 0.022 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 4px; padding: 2px 8px;
  }
  .ipm-header-right { margin-left: auto; display: flex; align-items: center; gap: 6px; }

  /* Generic inputs */
  .ipm-input {
    padding: 9px 12px;
    background: oklch(21% 0.023 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 6px;
    color: oklch(94% 0.007 255);
    font-size: 13px; outline: none;
    font-family: 'Barlow', system-ui, sans-serif;
    transition: border-color 0.12s;
  }
  .ipm-input:focus { border-color: oklch(44% 0.014 255); }
  .ipm-input::placeholder { color: oklch(42% 0.013 255); }
  .ipm-input-pw { flex: 1; }

  /* Buttons */
  .ipm-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; cursor: pointer;
    background: none;
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 6px;
    font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
    color: oklch(50% 0.013 255);
    transition: color 0.12s, border-color 0.12s, background 0.12s;
    white-space: nowrap; font-family: 'Barlow', system-ui, sans-serif;
    flex-shrink: 0;
  }
  .ipm-btn:hover:not(:disabled) { color: oklch(94% 0.007 255); border-color: oklch(44% 0.014 255); }
  .ipm-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .ipm-btn-primary {
    background: oklch(76% 0.16 68); border-color: oklch(76% 0.16 68);
    color: oklch(14% 0.01 50); font-weight: 700;
  }
  .ipm-btn-primary:hover:not(:disabled) { background: oklch(80% 0.16 68); border-color: oklch(80% 0.16 68); color: oklch(10% 0.01 50); }
  .ipm-btn-primary:disabled { background: oklch(30% 0.019 255); border-color: oklch(30% 0.019 255); color: oklch(42% 0.013 255); opacity: 1; }
  .ipm-btn-sm { padding: 4px 9px; font-size: 11px; border-radius: 4px; gap: 4px; }
  .ipm-btn-add { border-color: oklch(62% 0.20 142 / 0.35); color: oklch(62% 0.20 142); }
  .ipm-btn-add:hover:not(:disabled) { background: oklch(62% 0.20 142 / 0.10); border-color: oklch(62% 0.20 142 / 0.6); color: oklch(62% 0.20 142); }
  .ipm-btn-remove { border-color: oklch(62% 0.22 25 / 0.35); color: oklch(62% 0.22 25); }
  .ipm-btn-remove:hover:not(:disabled) { background: oklch(62% 0.22 25 / 0.10); border-color: oklch(62% 0.22 25 / 0.6); color: oklch(62% 0.22 25); }
  .ipm-btn-icon { padding: 6px; border-radius: 5px; gap: 0; }

  /* Auth section */
  .ipm-auth { padding: 18px 20px; border-bottom: 1px solid oklch(24% 0.022 255); }
  .ipm-auth-desc { font-size: 13px; color: oklch(58% 0.012 255); margin-bottom: 12px; line-height: 1.6; }
  .ipm-auth-desc a { color: oklch(60% 0.09 200); text-decoration: none; }
  .ipm-auth-desc code {
    background: oklch(23% 0.022 255); border: 1px solid oklch(30% 0.019 255);
    padding: 1px 5px; border-radius: 3px; font-size: 12px;
  }
  .ipm-auth-row { display: flex; gap: 8px; margin-bottom: 10px; }
  .ipm-remember { display: flex; align-items: center; gap: 6px; font-size: 12px; color: oklch(58% 0.012 255); cursor: pointer; user-select: none; }

  /* Progress */
  .ipm-progress { padding: 12px 20px; border-bottom: 1px solid oklch(24% 0.022 255); }

  /* Branch bar */
  .ipm-branch {
    padding: 10px 20px;
    border-bottom: 1px solid oklch(24% 0.022 255);
    background: oklch(18.5% 0.024 255);
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  .ipm-branch-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: oklch(42% 0.013 255); white-space: nowrap; }
  .ipm-select {
    appearance: none;
    background: oklch(21% 0.023 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 5px; padding: 5px 28px 5px 10px;
    color: oklch(74% 0.012 255);
    font-size: 12px; font-weight: 500; cursor: pointer; outline: none;
    font-family: 'Barlow', system-ui, sans-serif;
  }
  .ipm-select-wrap { position: relative; }
  .ipm-select-arrow { position: absolute; right: 7px; top: 50%; transform: translateY(-50%); pointer-events: none; color: oklch(42% 0.013 255); }
  .ipm-branch-sep { font-size: 11px; color: oklch(42% 0.013 255); }
  .ipm-branch-error { font-size: 11px; color: oklch(62% 0.22 25); }

  /* Tabs */
  .ipm-tabs { display: flex; border-bottom: 1px solid oklch(24% 0.022 255); flex-shrink: 0; }
  .ipm-tab {
    flex: 1; padding: 11px 16px;
    background: none; border: none;
    border-bottom: 2px solid transparent;
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    color: oklch(42% 0.013 255);
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px;
    transition: color 0.12s;
  }
  .ipm-tab.active { color: oklch(94% 0.007 255); border-bottom-color: oklch(76% 0.16 68); background: oklch(19% 0.024 255); }
  .ipm-tab:not(.active):hover { color: oklch(74% 0.012 255); }
  .ipm-tab-count {
    font-family: 'Barlow', system-ui, sans-serif;
    font-size: 11px; font-weight: 600;
    background: oklch(24% 0.022 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 4px; padding: 1px 7px;
    color: oklch(50% 0.013 255);
  }
  .ipm-tab.active .ipm-tab-count { background: oklch(76% 0.16 68 / 0.12); border-color: oklch(76% 0.16 68 / 0.3); color: oklch(76% 0.16 68); }

  /* Search */
  .ipm-search-bar { padding: 10px 20px; border-bottom: 1px solid oklch(24% 0.022 255); }
  .ipm-search-wrap { position: relative; }
  .ipm-search {
    width: 100%; box-sizing: border-box;
    background: oklch(21% 0.023 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 6px; padding: 8px 12px 8px 36px;
    color: oklch(94% 0.007 255); font-size: 13px; outline: none;
    transition: border-color 0.12s; font-family: 'Barlow', system-ui, sans-serif;
  }
  .ipm-search:focus { border-color: oklch(44% 0.014 255); }
  .ipm-search::placeholder { color: oklch(42% 0.013 255); }
  .ipm-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); pointer-events: none; color: oklch(42% 0.013 255); }

  /* Item list */
  .ipm-list { flex: 1; overflow: auto; min-height: 0; }
  .ipm-empty { padding: 40px 20px; text-align: center; color: oklch(42% 0.013 255); font-size: 13px; }
  .ipm-row {
    padding: 9px 20px;
    border-bottom: 1px solid oklch(24% 0.022 255);
    display: flex; align-items: center; gap: 10px;
  }
  .ipm-row-add    { background: oklch(62% 0.20 142 / 0.05); }
  .ipm-row-remove { background: oklch(62% 0.22 25 / 0.05); }
  .ipm-row-modify { background: oklch(76% 0.16 68 / 0.05); }
  .ipm-row-img { width: 28px; height: 28px; image-rendering: pixelated; flex-shrink: 0; }
  .ipm-row-img.dim { opacity: 0.35; }
  .ipm-row-name {
    font-size: 13px; font-weight: 500; color: oklch(88% 0.009 255);
    flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ipm-row-name.struck { text-decoration: line-through; color: oklch(42% 0.013 255); }
  .ipm-row-controls { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

  /* State dropdown */
  .ipm-state-btn {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 8px; border-radius: 4px; cursor: pointer;
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    border: 1px solid transparent;
    transition: opacity 0.1s;
  }
  .ipm-state-btn:disabled { cursor: default; opacity: 0.6; }
  .ipm-state-popup {
    position: fixed; z-index: 9999;
    background: oklch(23% 0.022 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 6px; overflow: hidden; min-width: 90px;
    box-shadow: 0 8px 24px oklch(4% 0.019 255 / 0.6);
  }
  .ipm-state-opt {
    display: block; width: 100%;
    padding: 7px 12px; background: none; border: none;
    font-size: 11.5px; font-weight: 600; cursor: pointer; text-align: left;
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    text-transform: uppercase; letter-spacing: 0.5px;
    transition: background 0.1s;
  }
  .ipm-state-opt:hover { background: oklch(30% 0.019 255); }

  /* Tag pills */
  .ipm-tag-btn {
    display: inline-flex; align-items: center;
    padding: 2px 7px; border-radius: 3px; cursor: pointer;
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    border: 1px solid oklch(30% 0.019 255);
    background: transparent; color: oklch(42% 0.013 255);
    transition: all 0.1s;
  }
  .ipm-tag-btn:disabled { cursor: default; opacity: 0.5; }

  /* Footer */
  .ipm-footer { border-top: 1px solid oklch(24% 0.022 255); background: oklch(18.5% 0.024 255); flex-shrink: 0; }
  .ipm-summary {
    padding: 11px 20px;
    display: flex; align-items: center; gap: 10px;
    cursor: pointer;
  }
  .ipm-summary-static { cursor: default; }
  .ipm-summary-count { font-size: 13px; font-weight: 600; color: oklch(88% 0.009 255); }
  .ipm-summary-breakdown { display: flex; gap: 10px; }
  .ipm-chg-add    { font-size: 11px; font-weight: 600; color: oklch(62% 0.20 142); }
  .ipm-chg-modify { font-size: 11px; font-weight: 600; color: oklch(76% 0.16 68); }
  .ipm-chg-remove { font-size: 11px; font-weight: 600; color: oklch(62% 0.22 25); }
  .ipm-summary-empty { font-size: 13px; color: oklch(42% 0.013 255); }

  .ipm-changes-list { padding: 0 20px 10px; max-height: 140px; overflow: auto; }
  .ipm-change-row {
    display: flex; align-items: center; gap: 8px;
    padding: 5px 0; border-bottom: 1px solid oklch(24% 0.022 255);
    font-size: 12px;
  }
  .ipm-change-row:last-child { border-bottom: none; }
  .ipm-change-name { flex: 1; color: oklch(74% 0.012 255); }
  .ipm-change-state { font-size: 10px; font-weight: 700; font-family: 'Barlow Condensed', system-ui, sans-serif; text-transform: uppercase; }
  .ipm-change-arrow { font-size: 10px; color: oklch(42% 0.013 255); }

  .ipm-commit { padding: 12px 20px; border-top: 1px solid oklch(24% 0.022 255); }
  .ipm-commit-row { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
  .ipm-commit-input { flex: 1; }
  .ipm-pr-label { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: oklch(58% 0.012 255); cursor: pointer; user-select: none; }

  /* Error / alert */
  .ipm-error {
    display: flex; align-items: center; gap: 8px;
    padding: 9px 12px; margin-top: 10px;
    background: oklch(62% 0.22 25 / 0.10);
    border: 1px solid oklch(62% 0.22 25 / 0.30);
    border-radius: 5px;
    color: oklch(72% 0.18 25); font-size: 12px;
  }
`;


// Image URL for Minecraft items
const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib';

// GitHub token creation URL
const GITHUB_TOKEN_URL = 'https://github.com/settings/tokens/new?description=FIB%20Item%20Pool%20Manager&scopes=repo';

// GitHub API configuration
const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'McPlayHDnet';
const REPO_NAME = 'ForceItemBattle';
const FILE_PATH = 'src/main/java/forceitembattle/manager/ItemDifficultiesManager.java';
const PROTECTED_BRANCHES = new Set(['main', 'master']);

// Storage keys
const TOKEN_KEY = 'fib_github_token';
const TOKEN_EXPIRY_KEY = 'fib_github_token_expiry';
const USER_KEY = 'fib_github_user';
const TOKEN_EXPIRY_DAYS = 60;

// Hoisted regex patterns (react-best-practices rule 7.9)
const REGISTER_REGEX = /register\(Material\.(\w+),\s*State\.(\w+)(?:,\s*ItemTag\.(\w+))?(?:,\s*ItemTag\.(\w+))?(?:,\s*ItemTag\.(\w+))?\)/g;
const BRANCH_NAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const REGISTER_ALL_ITEMS_REGEX = /private void registerAllItems\(\)\s*\{/;

// State options
const STATES = ['EARLY', 'MID', 'LATE'];
const TAGS = ['NETHER', 'END', 'EXTREME'];

// Progress step definitions
const PROGRESS_STEPS = [
    { id: 'branch', label: 'Select Branch' },
    { id: 'changes', label: 'Make Changes' },
    { id: 'commit', label: 'Commit' },
];

// In-memory token storage
let inMemoryToken = null;
let inMemoryUser = null;

// Storage functions
function getStoredToken() {
    if (inMemoryToken) return inMemoryToken;
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
        if (token && expiry && Date.now() <= parseInt(expiry, 10)) return token;
        clearStoredAuth();
        return null;
    } catch { return null; }
}

function setStoredToken(token, remember = false) {
    inMemoryToken = token;
    if (!token) {
        inMemoryToken = null;
        try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_EXPIRY_KEY); } catch {}
        return;
    }
    if (remember) {
        try {
            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem(TOKEN_EXPIRY_KEY, (Date.now() + TOKEN_EXPIRY_DAYS * 86400000).toString());
        } catch {}
    }
}

function getStoredUser() {
    if (inMemoryUser) return inMemoryUser;
    try {
        const user = localStorage.getItem(USER_KEY);
        return user ? JSON.parse(user) : null;
    } catch { return null; }
}

function setStoredUser(user, remember = false) {
    inMemoryUser = user;
    if (!user) { inMemoryUser = null; try { localStorage.removeItem(USER_KEY); } catch {} return; }
    if (remember) { try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch {} }
}

function clearStoredAuth() {
    inMemoryToken = null;
    inMemoryUser = null;
    try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        localStorage.removeItem(USER_KEY);
    } catch {}
}

// GitHub API functions
async function verifyTokenAndAccess(token) {
    const userResponse = await fetch(`${GITHUB_API}/user`, { headers: { Authorization: `Bearer ${token}` } });
    if (!userResponse.ok) throw new Error('Invalid token');
    const user = await userResponse.json();
    const repoResponse = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!repoResponse.ok) throw new Error('Cannot access repository');
    const repo = await repoResponse.json();
    if (!repo.permissions?.push) throw new Error('No write access to repository');
    return user;
}

async function fetchBranches(token) {
    const response = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/branches?per_page=100`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Failed to fetch branches');
    return response.json();
}

async function getFileContent(token, branch) {
    const response = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${branch}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Failed to fetch file');
    const data = await response.json();
    const binaryString = atob(data.content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return { content: new TextDecoder('utf-8').decode(bytes), sha: data.sha };
}

async function createBranch(token, newBranchName, baseBranch) {
    const refResponse = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${baseBranch}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!refResponse.ok) throw new Error('Failed to get base branch');
    const refData = await refResponse.json();
    const createResponse = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: `refs/heads/${newBranchName}`, sha: refData.object.sha })
    });
    if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(error.message || 'Failed to create branch');
    }
    return createResponse.json();
}

async function commitFile(token, branch, content, sha, message) {
    const response = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, content: btoa(unescape(encodeURIComponent(content))), sha, branch })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to commit');
    }
    return response.json();
}

async function createPullRequest(token, title, head, base, body) {
    const response = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/pulls`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, head, base, body })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create PR');
    }
    return response.json();
}

// Java file modification
function parseExistingItems(content) {
    const items = [];
    REGISTER_REGEX.lastIndex = 0;
    let match;
    while ((match = REGISTER_REGEX.exec(content)) !== null) {
        const [fullMatch, material, state, tag1, tag2, tag3] = match;
        items.push({ material, state, tags: [tag1, tag2, tag3].filter(Boolean), line: fullMatch });
    }
    return items;
}

function generateRegisterLine(material, state, tags = []) {
    if (tags.length === 0) return `        register(Material.${material}, State.${state});`;
    return `        register(Material.${material}, State.${state}, ${tags.map(t => `ItemTag.${t}`).join(', ')});`;
}

function modifyJavaFile(content, additions, removals) {
    const existingItems = parseExistingItems(content);
    const existingMaterials = new Set(existingItems.map(i => i.material));
    const removalSet = new Set(removals.map(r => r.material));

    const methodMatch = content.match(REGISTER_ALL_ITEMS_REGEX);
    if (!methodMatch) throw new Error('Could not find registerAllItems() method');

    const methodStart = methodMatch.index + methodMatch[0].length;
    let braceDepth = 1, methodEnd = methodStart;
    for (let i = methodStart; i < content.length; i++) {
        if (content[i] === '{') braceDepth++;
        if (content[i] === '}') braceDepth--;
        if (braceDepth === 0) { methodEnd = i; break; }
    }

    const beforeMethod = content.substring(0, methodStart);
    const afterMethod = content.substring(methodEnd);
    const finalItems = [];

    for (const item of existingItems) {
        if (!removalSet.has(item.material)) finalItems.push(item);
    }
    for (const addition of additions) {
        if (!existingMaterials.has(addition.material) || removalSet.has(addition.material)) {
            finalItems.push(addition);
        }
    }

    finalItems.sort((a, b) => a.material.localeCompare(b.material));
    const newMethodBody = '\n' + finalItems.map(item => generateRegisterLine(item.material, item.state, item.tags)).join('\n') + '\n    ';
    return beforeMethod + newMethodBody + afterMethod;
}

// Inline State Dropdown Component
function StateDropdown({ value, onChange, disabled }) {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);
    const popupRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e) => {
            const inButton = buttonRef.current?.contains(e.target);
            const inPopup  = popupRef.current?.contains(e.target);
            if (!inButton && !inPopup) setOpen(false);
        };
        const handleScroll = () => setOpen(false);
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('scroll', handleScroll, true);
        return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('scroll', handleScroll, true); };
    }, [open]);

    const handleOpen = (e) => {
        e.stopPropagation();
        if (disabled) return;
        if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPosition({ top: rect.bottom + 4, left: rect.left });
        }
        setOpen(!open);
    };

    const col   = stateCol[value]   || C.muted;
    const colBg = stateColBg[value] || 'transparent';
    const colBd = stateColBd[value] || C.border;

    return (
        <div ref={buttonRef} style={{ position: 'relative' }}>
            <button
                className="ipm-state-btn"
                onClick={handleOpen}
                disabled={disabled}
                style={{ background: colBg, borderColor: colBd, color: col }}
            >
                {value}
                {!disabled && <ChevronDown size={9} />}
            </button>
            {open && createPortal(
                <div ref={popupRef} className="ipm-state-popup" style={{ top: position.top, left: position.left }}>
                    {STATES.map(state => {
                        const sc = stateCol[state] || C.muted;
                        return (
                            <button
                                key={state}
                                className="ipm-state-opt"
                                onClick={(e) => { e.stopPropagation(); onChange(state); setOpen(false); }}
                                style={{ color: sc, background: value === state ? (stateColBg[state] || 'transparent') : undefined }}
                            >
                                {state}
                            </button>
                        );
                    })}
                </div>,
                document.body
            )}
        </div>
    );
}

// Tag Toggle Pills
function TagPills({ tags, onChange, disabled }) {
    return (
        <div style={{ display: 'flex', gap: '4px' }}>
            {TAGS.map(tag => {
                const active = tags.includes(tag);
                const col = tagCol[tag] || C.muted;
                return (
                    <button
                        key={tag}
                        className="ipm-tag-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (disabled) return;
                            onChange(active ? tags.filter(t => t !== tag) : [...tags, tag]);
                        }}
                        disabled={disabled}
                        style={active ? {
                            background: col + '18',
                            borderColor: col + '55',
                            color: col,
                        } : {}}
                    >
                        {tag}
                    </button>
                );
            })}
        </div>
    );
}

// Main component
export default function ItemPoolManager({ onClose, items = [], missingItems = [], onRefreshMisode, initialExpandedItem, initialExpandedItems = [] }) {
    const toast = useToast();

    // Auth state
    const [token, setToken] = useState(() => getStoredToken() || '');
    const [user, setUser] = useState(() => getStoredUser());
    const [showTokenInput, setShowTokenInput] = useState(() => !getStoredToken());
    const [rememberMe, setRememberMe] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState(null);

    // Branch state
    const [branches, setBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [branchMode, setBranchMode] = useState('existing');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [newBranchName, setNewBranchName] = useState('');
    const [baseBranch, setBaseBranch] = useState('main');

    // Tab state
    const [activeTab, setActiveTab] = useState('add'); // 'add' | 'manage'

    // Search state
    const [searchQuery, setSearchQuery] = useState('');

    // Changes state - unified for both additions and modifications
    const [pendingChanges, setPendingChanges] = useState(() => {
        // Initialize with any pre-selected items
        const initial = [];
        if (initialExpandedItem) {
            initial.push({ material: initialExpandedItem, type: 'add', state: 'EARLY', tags: [] });
        }
        initialExpandedItems.forEach(material => {
            if (!initial.find(c => c.material === material)) {
                initial.push({ material, type: 'add', state: 'EARLY', tags: [] });
            }
        });
        return initial;
    });

    // Commit state
    const [commitMessage, setCommitMessage] = useState('');
    const [committing, setCommitting] = useState(false);
    const [commitSuccess, setCommitSuccess] = useState(null);
    const [createPR, setCreatePR] = useState(false);
    const [prUrl, setPrUrl] = useState(null);

    // Footer state
    const [footerExpanded, setFooterExpanded] = useState(false);

    // Derived state
    const targetBranch = branchMode === 'new' ? newBranchName : selectedBranch;
    const isValidBranch = targetBranch && !PROTECTED_BRANCHES.has(targetBranch.toLowerCase()) &&
        (branchMode === 'existing' || BRANCH_NAME_REGEX.test(newBranchName));
    const canCommit = isValidBranch && pendingChanges.length > 0 && commitMessage.trim().length > 0;

    // Calculate current progress step
    const currentStep = useMemo(() => {
        if (commitSuccess) return 3; // Completed
        if (!isValidBranch) return 0; // Step 1: Select branch
        if (pendingChanges.length === 0) return 1; // Step 2: Make changes
        return 2; // Step 3: Ready to commit
    }, [isValidBranch, pendingChanges.length, commitSuccess]);

    // Memoized sets for O(1) lookups
    const changeMaterials = useMemo(() => new Set(pendingChanges.map(c => c.material)), [pendingChanges]);

    // Filtered items based on search and active tab
    const filteredItems = useMemo(() => {
        const source = activeTab === 'add' ? missingItems : items;
        const query = searchQuery.toLowerCase();
        let filtered = source;

        if (query) {
            filtered = source.filter(item =>
                item.material.toLowerCase().includes(query) ||
                item.displayName.toLowerCase().includes(query)
            );
        }

        return filtered.slice(0, 100);
    }, [activeTab, missingItems, items, searchQuery]);

    // Change counts
    const addCount = useMemo(() => pendingChanges.filter(c => c.type === 'add').length, [pendingChanges]);
    const modifyCount = useMemo(() => pendingChanges.filter(c => c.type === 'modify').length, [pendingChanges]);
    const removeCount = useMemo(() => pendingChanges.filter(c => c.type === 'remove').length, [pendingChanges]);

    // Load branches on auth
    useEffect(() => {
        if (user && token) {
            setLoadingBranches(true);
            fetchBranches(token)
                .then(data => {
                    setBranches(data);
                    const nonProtected = data.find(b => !PROTECTED_BRANCHES.has(b.name.toLowerCase()));
                    if (nonProtected) setSelectedBranch(nonProtected.name);
                })
                .catch(e => setError(e.message))
                .finally(() => setLoadingBranches(false));
        }
    }, [user, token]);

    // Reset success state when changes occur
    useEffect(() => {
        if (commitSuccess && pendingChanges.length > 0) {
            setCommitSuccess(null);
            setPrUrl(null);
        }
    }, [pendingChanges.length, commitSuccess]);

    // Handlers
    const handleAuthenticate = async () => {
        const trimmedToken = token.trim();
        if (!trimmedToken) return;
        setVerifying(true);
        setError(null);
        try {
            const verifiedUser = await verifyTokenAndAccess(trimmedToken);
            setUser(verifiedUser);
            setToken(trimmedToken);
            setStoredToken(trimmedToken, rememberMe);
            setStoredUser(verifiedUser, rememberMe);
            setShowTokenInput(false);
        } catch (e) {
            setError(e.message);
        } finally {
            setVerifying(false);
        }
    };

    const handleLogout = () => {
        setUser(null);
        setToken('');
        clearStoredAuth();
        setShowTokenInput(true);
        setBranches([]);
        setRememberMe(false);
    };

    const handleRefreshBranches = async () => {
        if (!token) return;
        setLoadingBranches(true);
        setError(null);
        try {
            const data = await fetchBranches(token);
            setBranches(data);
            if (selectedBranch && !data.find(b => b.name === selectedBranch)) {
                const nonProtected = data.find(b => !PROTECTED_BRANCHES.has(b.name.toLowerCase()));
                if (nonProtected) setSelectedBranch(nonProtected.name);
            }
            toast.success('Branches refreshed');
        } catch (e) {
            setError('Failed to refresh branches: ' + e.message);
        } finally {
            setLoadingBranches(false);
        }
    };

    const handleAddItem = (item, state = 'EARLY', tags = []) => {
        if (changeMaterials.has(item.material)) return;
        setPendingChanges(prev => [...prev, { material: item.material, displayName: item.displayName, type: 'add', state, tags }]);
    };

    const handleModifyItem = (item, newState, newTags) => {
        const existingChange = pendingChanges.find(c => c.material === item.material);
        if (existingChange) {
            // Update existing change
            setPendingChanges(prev => prev.map(c =>
                c.material === item.material ? { ...c, state: newState, tags: newTags } : c
            ));
        } else {
            // Add new modification
            setPendingChanges(prev => [...prev, {
                material: item.material,
                displayName: item.displayName,
                type: 'modify',
                oldState: item.state,
                state: newState,
                oldTags: item.tags || [],
                tags: newTags
            }]);
        }
    };

    const handleRemoveItem = (item) => {
        if (changeMaterials.has(item.material)) return;
        setPendingChanges(prev => [...prev, { material: item.material, displayName: item.displayName, type: 'remove' }]);
    };

    const handleUndoChange = (material) => {
        setPendingChanges(prev => prev.filter(c => c.material !== material));
    };

    const handleClearChanges = () => {
        setPendingChanges([]);
        setCommitMessage('');
    };

    const handleCommit = async () => {
        if (!canCommit) return;
        setCommitting(true);
        setError(null);
        setCommitSuccess(null);
        setPrUrl(null);

        try {
            let branch = targetBranch;
            if (branchMode === 'new') {
                await createBranch(token, newBranchName, baseBranch);
                branch = newBranchName;
                toast.info(`Created branch "${newBranchName}"`);
            }

            const { content, sha } = await getFileContent(token, branch);

            // Convert pending changes to additions and removals
            const additions = pendingChanges
                .filter(c => c.type === 'add' || c.type === 'modify')
                .map(c => ({ material: c.material, state: c.state, tags: c.tags }));
            const removals = pendingChanges
                .filter(c => c.type === 'remove' || c.type === 'modify')
                .map(c => ({ material: c.material }));

            const newContent = modifyJavaFile(content, additions, removals);
            await commitFile(token, branch, newContent, sha, commitMessage);

            // Build PR body
            const prTitle = commitMessage.split('\n')[0];
            const sections = [];
            const adds = pendingChanges.filter(c => c.type === 'add');
            const mods = pendingChanges.filter(c => c.type === 'modify');
            const rems = pendingChanges.filter(c => c.type === 'remove');

            if (adds.length) sections.push(`### Added (${adds.length})\n${adds.map(c => `- ${c.material} → ${c.state}${c.tags.length ? ` (${c.tags.join(', ')})` : ''}`).join('\n')}`);
            if (mods.length) sections.push(`### Modified (${mods.length})\n${mods.map(c => `- ${c.material}: ${c.oldState} → ${c.state}`).join('\n')}`);
            if (rems.length) sections.push(`### Removed (${rems.length})\n${rems.map(c => `- ${c.material}`).join('\n')}`);

            const prBody = `## Changes\n\n${sections.join('\n\n')}`;

            setCommitSuccess(true);
            setPendingChanges([]);
            setCommitMessage('');
            toast.success(`Changes committed to ${branch}!`);

            if (createPR) {
                try {
                    const pr = await createPullRequest(token, prTitle, branch, 'main', prBody);
                    setPrUrl(pr.html_url);
                    toast.success('Pull request created!');
                } catch (prError) {
                    toast.error(`PR creation failed: ${prError.message}`);
                }
            }
        } catch (e) {
            setError(e.message);
            setCommitSuccess(false);
            toast.error(`Commit failed: ${e.message}`);
        } finally {
            setCommitting(false);
        }
    };

    return (
        <div className="ipm ipm-overlay" onClick={onClose}>
            <style>{MODAL_CSS}</style>
            <div className="ipm-panel" onClick={e => e.stopPropagation()}>

                {/* ── Header ── */}
                <div className="ipm-header">
                    <GitBranch size={16} style={{ color: C.amber, flexShrink: 0 }} />
                    <span className="ipm-title">Item Pool Manager</span>
                    {user && <span className="ipm-user-pill">{user.login}</span>}
                    <div className="ipm-header-right">
                        {user && (
                            <button className="ipm-btn ipm-btn-sm" onClick={handleLogout}>
                                Logout
                            </button>
                        )}
                        <button
                            className="ipm-btn ipm-btn-icon"
                            onClick={onClose}
                            style={{ color: C.dim, border: 'none' }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ── Auth Section ── */}
                {showTokenInput && (
                    <div className="ipm-auth">
                        <p className="ipm-auth-desc">
                            Enter a GitHub Personal Access Token with{' '}
                            <code>repo</code> scope.{' '}
                            <a href={GITHUB_TOKEN_URL} target="_blank" rel="noopener noreferrer">
                                Create one here <ExternalLink size={11} style={{ verticalAlign: 'middle' }} />
                            </a>
                        </p>
                        <div className="ipm-auth-row">
                            <input
                                type="password"
                                placeholder="ghp_xxxxxxxxxxxx"
                                value={token}
                                onChange={e => setToken(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAuthenticate()}
                                className="ipm-input ipm-input-pw"
                            />
                            <button
                                onClick={handleAuthenticate}
                                disabled={verifying || !token.trim()}
                                className="ipm-btn ipm-btn-primary"
                            >
                                {verifying && <Loader2 size={13} style={{ animation: 'ipm-spin 1s linear infinite' }} />}
                                {verifying ? 'Verifying...' : 'Connect'}
                            </button>
                        </div>
                        <label className="ipm-remember">
                            <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                            Remember me for 60 days
                        </label>
                        {error && (
                            <div className="ipm-error">
                                <AlertTriangle size={13} /> {error}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Authenticated content ── */}
                {user && (
                    <>
                        {/* Progress */}
                        <div className="ipm-progress">
                            <ProgressSteps steps={PROGRESS_STEPS} currentStep={currentStep} />
                        </div>

                        {/* Branch selector */}
                        <div className="ipm-branch">
                            <span className="ipm-branch-label">Branch</span>
                            <div className="ipm-select-wrap">
                                <select
                                    className="ipm-select"
                                    value={branchMode === 'existing' ? selectedBranch : '__new__'}
                                    onChange={e => {
                                        if (e.target.value === '__new__') { setBranchMode('new'); }
                                        else { setBranchMode('existing'); setSelectedBranch(e.target.value); }
                                    }}
                                >
                                    {branches.filter(b => !PROTECTED_BRANCHES.has(b.name.toLowerCase())).map(b => (
                                        <option key={b.name} value={b.name}>{b.name}</option>
                                    ))}
                                    <option value="__new__">+ Create new branch...</option>
                                </select>
                                <ChevronDown size={12} className="ipm-select-arrow" />
                            </div>
                            <button
                                className="ipm-btn ipm-btn-sm ipm-btn-icon"
                                onClick={handleRefreshBranches}
                                disabled={loadingBranches}
                                title="Refresh branches"
                            >
                                <RefreshCw size={12} style={{ animation: loadingBranches ? 'ipm-spin 1s linear infinite' : 'none' }} />
                            </button>

                            {branchMode === 'new' && (
                                <>
                                    <input
                                        type="text"
                                        placeholder="new-branch-name"
                                        value={newBranchName}
                                        onChange={e => setNewBranchName(e.target.value)}
                                        className="ipm-input"
                                        style={{ width: 160, padding: '5px 10px', fontSize: 12 }}
                                    />
                                    <span className="ipm-branch-sep">from</span>
                                    <div className="ipm-select-wrap">
                                        <select className="ipm-select" value={baseBranch} onChange={e => setBaseBranch(e.target.value)}>
                                            {branches.map(b => (
                                                <option key={b.name} value={b.name}>{b.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={12} className="ipm-select-arrow" />
                                    </div>
                                </>
                            )}

                            {!isValidBranch && targetBranch && (
                                <span className="ipm-branch-error">
                                    {PROTECTED_BRANCHES.has(targetBranch.toLowerCase()) ? 'Cannot commit to protected branch' : 'Invalid branch name'}
                                </span>
                            )}

                            {onRefreshMisode && (
                                <button
                                    className="ipm-btn ipm-btn-sm"
                                    onClick={onRefreshMisode}
                                    style={{ marginLeft: 'auto' }}
                                >
                                    <RefreshCw size={11} /> Refresh Items
                                </button>
                            )}
                        </div>

                        {/* Tabs */}
                        <div className="ipm-tabs">
                            {[
                                { key: 'add',    label: 'Add Items',   icon: <Plus size={14} />,    count: missingItems.length },
                                { key: 'manage', label: 'Manage Pool', icon: <Settings size={14} />, count: items.length },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    className={`ipm-tab${activeTab === tab.key ? ' active' : ''}`}
                                    onClick={() => { setActiveTab(tab.key); setSearchQuery(''); }}
                                >
                                    {tab.icon}
                                    {tab.label}
                                    <span className="ipm-tab-count">{tab.count}</span>
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="ipm-search-bar">
                            <div className="ipm-search-wrap">
                                <Search size={13} className="ipm-search-icon" />
                                <input
                                    type="text"
                                    className="ipm-search"
                                    placeholder={activeTab === 'add' ? 'Search missing items...' : 'Search pool items...'}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Item List */}
                        <div className="ipm-list">
                            {filteredItems.length === 0 ? (
                                <div className="ipm-empty">
                                    {searchQuery ? 'No items match your search' : 'No items available'}
                                </div>
                            ) : filteredItems.map(item => {
                                const change = pendingChanges.find(c => c.material === item.material);
                                const hasChange = !!change;
                                const isRemove = hasChange && change.type === 'remove';

                                let rowClass = 'ipm-row';
                                if (hasChange) {
                                    if (change.type === 'add')    rowClass += ' ipm-row-add';
                                    if (change.type === 'remove') rowClass += ' ipm-row-remove';
                                    if (change.type === 'modify') rowClass += ' ipm-row-modify';
                                }

                                return (
                                    <div key={item.material} className={rowClass}>
                                        <img
                                            className={`ipm-row-img${isRemove ? ' dim' : ''}`}
                                            src={`${IMAGE_BASE_URL}/${item.material.toLowerCase()}.png`}
                                            alt=""
                                            onError={e => { e.target.onerror = null; e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                                        />
                                        <span className={`ipm-row-name${isRemove ? ' struck' : ''}`}>
                                            {item.displayName}
                                        </span>

                                        {/* State + tags for manage tab or pending changes */}
                                        {activeTab === 'manage' && !hasChange && (
                                            <>
                                                <StateDropdown value={item.state} onChange={ns => handleModifyItem(item, ns, item.tags || [])} disabled={false} />
                                                <TagPills tags={item.tags || []} onChange={nt => handleModifyItem(item, item.state, nt)} disabled={false} />
                                            </>
                                        )}
                                        {hasChange && !isRemove && (
                                            <>
                                                <StateDropdown
                                                    value={change.state}
                                                    onChange={ns => setPendingChanges(prev => prev.map(c => c.material === item.material ? { ...c, state: ns } : c))}
                                                    disabled={false}
                                                />
                                                <TagPills
                                                    tags={change.tags}
                                                    onChange={nt => setPendingChanges(prev => prev.map(c => c.material === item.material ? { ...c, tags: nt } : c))}
                                                    disabled={false}
                                                />
                                            </>
                                        )}

                                        <div className="ipm-row-controls">
                                            {hasChange ? (
                                                <button className="ipm-btn ipm-btn-sm" onClick={() => handleUndoChange(item.material)}>
                                                    <X size={11} /> Undo
                                                </button>
                                            ) : activeTab === 'add' ? (
                                                <button className="ipm-btn ipm-btn-sm ipm-btn-add" onClick={() => handleAddItem(item)}>
                                                    <Plus size={11} /> Add
                                                </button>
                                            ) : (
                                                <button className="ipm-btn ipm-btn-sm ipm-btn-remove" onClick={() => handleRemoveItem(item)}>
                                                    <Minus size={11} /> Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Footer ── */}
                        <div className="ipm-footer">
                            {/* Summary bar */}
                            <div
                                className={`ipm-summary${pendingChanges.length === 0 ? ' ipm-summary-static' : ''}`}
                                onClick={() => pendingChanges.length > 0 && setFooterExpanded(!footerExpanded)}
                            >
                                {pendingChanges.length > 0 ? (
                                    <>
                                        <Package size={14} style={{ color: C.amber, flexShrink: 0 }} />
                                        <span className="ipm-summary-count">
                                            {pendingChanges.length} change{pendingChanges.length !== 1 ? 's' : ''}
                                        </span>
                                        <div className="ipm-summary-breakdown">
                                            {addCount    > 0 && <span className="ipm-chg-add">+{addCount}</span>}
                                            {modifyCount > 0 && <span className="ipm-chg-modify">~{modifyCount}</span>}
                                            {removeCount > 0 && <span className="ipm-chg-remove">-{removeCount}</span>}
                                        </div>
                                        {footerExpanded
                                            ? <ChevronDown size={13} style={{ color: C.dim, marginLeft: 'auto' }} />
                                            : <ChevronUp   size={13} style={{ color: C.dim, marginLeft: 'auto' }} />
                                        }
                                    </>
                                ) : (
                                    <span className="ipm-summary-empty">No pending changes</span>
                                )}
                                {commitSuccess && prUrl && (
                                    <a
                                        href={prUrl} target="_blank" rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.amber, fontSize: 12, textDecoration: 'none', marginLeft: 'auto' }}
                                    >
                                        <ExternalLink size={12} /> View PR
                                    </a>
                                )}
                            </div>

                            {/* Expanded change list */}
                            {footerExpanded && pendingChanges.length > 0 && (
                                <div className="ipm-changes-list">
                                    {pendingChanges.map(change => (
                                        <div key={change.material} className="ipm-change-row">
                                            {change.type === 'add'    && <Plus      size={11} style={{ color: C.green,  flexShrink: 0 }} />}
                                            {change.type === 'modify' && <RefreshCw size={11} style={{ color: C.amber,  flexShrink: 0 }} />}
                                            {change.type === 'remove' && <Minus     size={11} style={{ color: C.red,    flexShrink: 0 }} />}
                                            <img
                                                src={`${IMAGE_BASE_URL}/${change.material.toLowerCase()}.png`}
                                                alt="" style={{ width: 18, height: 18, imageRendering: 'pixelated', flexShrink: 0 }}
                                                onError={e => { e.target.onerror = null; e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                                            />
                                            <span className="ipm-change-name">{change.displayName || change.material}</span>
                                            {change.type !== 'remove' && (
                                                <>
                                                    {change.type === 'modify' && (
                                                        <span className="ipm-change-arrow">{change.oldState} →</span>
                                                    )}
                                                    <span className="ipm-change-state" style={{ color: stateCol[change.state] || C.muted }}>
                                                        {change.state}
                                                    </span>
                                                    {change.tags.length > 0 && (
                                                        <span style={{ fontSize: 10, color: C.dim }}>({change.tags.join(', ')})</span>
                                                    )}
                                                </>
                                            )}
                                            <button
                                                onClick={() => handleUndoChange(change.material)}
                                                style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', padding: 2, marginLeft: 'auto', flexShrink: 0 }}
                                            >
                                                <X size={11} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        className="ipm-btn ipm-btn-sm"
                                        onClick={handleClearChanges}
                                        style={{ marginTop: 8, color: C.dim }}
                                    >
                                        <Trash2 size={10} /> Clear all
                                    </button>
                                </div>
                            )}

                            {/* Commit */}
                            {pendingChanges.length > 0 && (
                                <div className="ipm-commit">
                                    <div className="ipm-commit-row">
                                        <input
                                            type="text"
                                            placeholder="Commit message..."
                                            value={commitMessage}
                                            onChange={e => setCommitMessage(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && canCommit && handleCommit()}
                                            className="ipm-input ipm-commit-input"
                                        />
                                        <button
                                            onClick={handleCommit}
                                            disabled={!canCommit || committing}
                                            className="ipm-btn ipm-btn-primary"
                                        >
                                            {committing && <Loader2 size={13} style={{ animation: 'ipm-spin 1s linear infinite' }} />}
                                            {committing ? 'Committing...' : 'Commit & Push'}
                                        </button>
                                    </div>
                                    <label className="ipm-pr-label">
                                        <input type="checkbox" checked={createPR} onChange={e => setCreatePR(e.target.checked)} />
                                        <GitPullRequest size={12} />
                                        Create PR to main
                                    </label>
                                    {error && (
                                        <div className="ipm-error">
                                            <AlertTriangle size={12} /> {error}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}