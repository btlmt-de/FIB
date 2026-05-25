import React, { useState, useEffect } from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import GitBranch from 'lucide-react/dist/esm/icons/git-branch';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';

import { COLORS as C } from '../../config/constants';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800;900&display=swap');
  @keyframes gh-in   { from { opacity:0; transform:scale(0.97) translateY(8px); } to { opacity:1; transform:none; } }
  @keyframes gh-spin { to { transform: rotate(360deg); } }

  .gh { font-family: 'Barlow', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  .gh-overlay {
    position: fixed; inset: 0;
    background: oklch(6% 0.022 255 / 0.88);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: 20px; box-sizing: border-box;
  }
  .gh-panel {
    background: oklch(17% 0.025 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 10px;
    width: 100%; max-width: 660px; max-height: 90vh;
    display: flex; flex-direction: column; overflow: hidden;
    animation: gh-in 0.2s cubic-bezier(0.16,1,0.3,1) both;
  }

  /* Header */
  .gh-header {
    padding: 14px 20px;
    border-bottom: 1px solid oklch(24% 0.022 255);
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0;
  }
  .gh-title {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 17px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;
    color: oklch(94% 0.007 255);
    display: flex; align-items: center; gap: 8px; margin: 0;
  }
  .gh-subtitle { font-size: 11.5px; color: oklch(42% 0.013 255); margin-top: 3px; }
  .gh-close {
    background: none; border: none; cursor: pointer; padding: 5px;
    color: oklch(42% 0.013 255); border-radius: 4px;
    display: flex; align-items: center;
    transition: color 0.12s;
  }
  .gh-close:hover { color: oklch(94% 0.007 255); }

  /* Tabs */
  .gh-tabs {
    display: flex; border-bottom: 1px solid oklch(24% 0.022 255); flex-shrink: 0;
  }
  .gh-tab {
    flex: 1; padding: 10px 16px;
    background: none; border: none; border-bottom: 2px solid transparent;
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    color: oklch(42% 0.013 255); cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 7px;
    transition: color 0.12s;
  }
  .gh-tab.active { color: oklch(94% 0.007 255); border-bottom-color: oklch(76% 0.16 68); background: oklch(19% 0.024 255); }
  .gh-tab:not(.active):hover { color: oklch(74% 0.012 255); }
  .gh-tab-count {
    font-family: 'Barlow', system-ui, sans-serif;
    font-size: 11px; font-weight: 600;
    background: oklch(24% 0.022 255); border: 1px solid oklch(30% 0.019 255);
    border-radius: 4px; padding: 1px 7px; color: oklch(50% 0.013 255);
  }
  .gh-tab.active .gh-tab-count { background: oklch(76% 0.16 68 / 0.12); border-color: oklch(76% 0.16 68 / 0.3); color: oklch(76% 0.16 68); }

  /* Content */
  .gh-content { flex: 1; overflow-y: auto; padding: 0; min-height: 0; }
  .gh-meta {
    padding: 10px 20px; border-bottom: 1px solid oklch(24% 0.022 255);
    display: flex; align-items: center; justify-content: space-between;
    font-size: 11.5px; color: oklch(42% 0.013 255);
  }
  .gh-meta a { color: oklch(68% 0.12 200); text-decoration: none; display: flex; align-items: center; gap: 4px; }
  .gh-meta a:hover { color: oklch(80% 0.12 200); }

  /* Commit rows */
  .gh-commit {
    padding: 12px 20px;
    border-bottom: 1px solid oklch(24% 0.022 255);
    display: flex; align-items: flex-start; gap: 12px;
    transition: background 0.1s;
  }
  .gh-commit:last-child { border-bottom: none; }
  .gh-commit:hover { background: oklch(19.5% 0.024 255); }
  .gh-avatar {
    width: 30px; height: 30px; border-radius: 50%;
    flex-shrink: 0; border: 1px solid oklch(30% 0.019 255);
  }
  .gh-commit-body { flex: 1; min-width: 0; }
  .gh-commit-msg { font-size: 13px; color: oklch(88% 0.009 255); margin-bottom: 5px; word-break: break-word; }
  .gh-commit-meta {
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
    font-size: 11.5px; color: oklch(42% 0.013 255);
  }
  .gh-commit-meta .author { font-weight: 600; color: oklch(58% 0.012 255); }
  .gh-commit-meta .dot { color: oklch(25% 0.011 255); }
  .gh-commit-meta .sha {
    font-family: 'Courier New', monospace; font-size: 10.5px;
    color: oklch(68% 0.12 200); text-decoration: none;
    background: oklch(68% 0.12 200 / 0.08); padding: 1px 5px; border-radius: 3px;
  }
  .gh-commit-meta .sha:hover { background: oklch(68% 0.12 200 / 0.18); }

  /* States */
  .gh-state {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 8px; padding: 48px 20px;
    color: oklch(42% 0.013 255); font-size: 13px; text-align: center;
  }
  .gh-state-err { color: oklch(62% 0.22 25); }
  .gh-state sub { display: block; font-size: 11.5px; color: oklch(42% 0.013 255); margin-top: 6px; }

  /* Footer */
  .gh-footer {
    padding: 11px 20px; border-top: 1px solid oklch(24% 0.022 255);
    background: oklch(18.5% 0.024 255);
    display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
  }
  .gh-footer-src { font-size: 11.5px; color: oklch(42% 0.013 255); }
  .gh-footer-src code {
    font-family: 'Courier New', monospace; font-size: 10.5px;
    color: oklch(68% 0.12 200);
    background: oklch(68% 0.12 200 / 0.08); padding: 1px 5px; border-radius: 3px;
  }
  .gh-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 12px; cursor: pointer;
    background: none; border: 1px solid oklch(30% 0.019 255); border-radius: 5px;
    font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
    color: oklch(50% 0.013 255); font-family: 'Barlow', system-ui, sans-serif;
    transition: color 0.12s, border-color 0.12s;
  }
  .gh-btn:hover { color: oklch(94% 0.007 255); border-color: oklch(44% 0.014 255); }
`;

// ── Helpers ─────────────────────────────────────────────────────────────────
const REPO_OWNER = 'btlmt-de';
const REPO_NAME = 'FIB';
const ITEMS_REPO_OWNER = 'McPlayHDnet';
const ITEMS_REPO_NAME = 'ForceItemBattle';
const CONFIG_PATH = 'config.yml';
const ITEMS_PATH = 'src/main/java/forceitembattle/manager/ItemDifficultiesManager.java';

async function fetchCommits(repoOwner, repoName, filePath, token = null) {
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/commits?path=${encodeURIComponent(filePath)}&per_page=30`,
        { headers }
    );
    if (!response.ok) throw new Error(`Failed to fetch commits: ${response.status}`);
    return response.json();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) {
        const h = Math.floor(diffMs / 3600000);
        if (h === 0) return `${Math.floor(diffMs / 60000)}m ago`;
        return `${h}h ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// ── CommitItem ───────────────────────────────────────────────────────────────
function CommitItem({ commit }) {
    const { sha, commit: commitData, author, html_url } = commit;
    const message = commitData.message.split('\n')[0];
    return (
        <div className="gh-commit">
            {author?.avatar_url && (
                <img src={author.avatar_url} alt={commitData.author.name} className="gh-avatar" />
            )}
            <div className="gh-commit-body">
                <div className="gh-commit-msg">{message}</div>
                <div className="gh-commit-meta">
                    <span className="author">{commitData.author.name}</span>
                    <span className="dot">·</span>
                    <span>{formatDate(commitData.author.date)}</span>
                    <span className="dot">·</span>
                    <a href={html_url} target="_blank" rel="noopener noreferrer" className="sha">
                        {sha.substring(0, 7)}
                    </a>
                </div>
            </div>
        </div>
    );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function GitHistory({ onClose }) {
    const [activeTab, setActiveTab] = useState('descriptions');
    const [descriptionCommits, setDescriptionCommits] = useState([]);
    const [itemsCommits, setItemsCommits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const token = localStorage.getItem('fib_github_token');

    useEffect(() => {
        async function load() {
            setLoading(true); setError(null);
            try {
                const [d, i] = await Promise.all([
                    fetchCommits(REPO_OWNER, REPO_NAME, CONFIG_PATH, token),
                    fetchCommits(ITEMS_REPO_OWNER, ITEMS_REPO_NAME, ITEMS_PATH, token),
                ]);
                setDescriptionCommits(d);
                setItemsCommits(i);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [token]);

    const currentCommits   = activeTab === 'descriptions' ? descriptionCommits : itemsCommits;
    const currentRepoOwner = activeTab === 'descriptions' ? REPO_OWNER : ITEMS_REPO_OWNER;
    const currentRepoName  = activeTab === 'descriptions' ? REPO_NAME  : ITEMS_REPO_NAME;

    return (
        <div className="gh gh-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <style>{CSS}</style>
            <div className="gh-panel">

                {/* Header */}
                <div className="gh-header">
                    <div>
                        <h2 className="gh-title">
                            <GitBranch size={16} style={{ color: C.amber }} />
                            Git History
                        </h2>
                        <div className="gh-subtitle">Recent changes to item pools and descriptions</div>
                    </div>
                    <button className="gh-close" onClick={onClose}><X size={18} /></button>
                </div>

                {/* Tabs */}
                <div className="gh-tabs">
                    {[
                        { key: 'descriptions', label: 'Description Changes', count: descriptionCommits.length },
                        { key: 'items',        label: 'Item Pool Changes',    count: itemsCommits.length },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            className={`gh-tab${activeTab === tab.key ? ' active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                            <span className="gh-tab-count">{tab.count}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="gh-content">
                    {loading ? (
                        <div className="gh-state">
                            <RefreshCw size={22} style={{ animation: 'gh-spin 1s linear infinite', opacity: 0.5 }} />
                            Loading commit history...
                        </div>
                    ) : error ? (
                        <div className="gh-state gh-state-err">
                            <AlertTriangle size={22} />
                            {error}
                            <sub>
                                GitHub API rate limit may have been exceeded.
                                {!token && ' Sign in to the editor to increase limits.'}
                            </sub>
                        </div>
                    ) : currentCommits.length === 0 ? (
                        <div className="gh-state">No commits found.</div>
                    ) : (
                        <>
                            <div className="gh-meta">
                                <span>Showing {currentCommits.length} recent commits</span>
                                <a
                                    href={`https://github.com/${currentRepoOwner}/${currentRepoName}/commits/main/${activeTab === 'descriptions' ? CONFIG_PATH : ITEMS_PATH}`}
                                    target="_blank" rel="noopener noreferrer"
                                >
                                    View all on GitHub <ExternalLink size={11} />
                                </a>
                            </div>
                            {currentCommits.map(commit => (
                                <CommitItem key={commit.sha} commit={commit} />
                            ))}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="gh-footer">
                    <div className="gh-footer-src">
                        Source: <code>
                        {activeTab === 'descriptions'
                            ? `${REPO_OWNER}/${REPO_NAME}`
                            : `${ITEMS_REPO_OWNER}/${ITEMS_REPO_NAME}`}
                    </code>
                    </div>
                    <button className="gh-btn" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}