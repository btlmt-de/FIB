import React, { useState, useEffect } from 'react';

const COLORS = {
    bg: '#1a1a2e',
    bgLight: '#252542',
    bgLighter: '#2d2d4a',
    text: '#e0e0e0',
    textMuted: '#888',
    border: '#3d3d5c',
    accent: '#5865F2',
    success: '#55FF55',
    error: '#FF5555',
    warning: '#FFFF55',
    description: '#55FFFF'
};

// GitHub API configuration
const REPO_OWNER = 'btlmt-de';
const REPO_NAME = 'FIB';
const ITEMS_REPO_OWNER = 'McPlayHDnet';
const ITEMS_REPO_NAME = 'ForceItemBattle';

const CONFIG_PATH = 'config.yml';
const ITEMS_PATH = 'src/main/java/forceitembattle/manager/ItemDifficultiesManager.java';

async function fetchCommits(repoOwner, repoName, filePath, token = null) {
    const headers = {
        'Accept': 'application/vnd.github.v3+json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/commits?path=${encodeURIComponent(filePath)}&per_page=30`,
        { headers }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch commits: ${response.status}`);
    }

    return response.json();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) {
            const diffMins = Math.floor(diffMs / (1000 * 60));
            return `${diffMins} minutes ago`;
        }
        return `${diffHours} hours ago`;
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function CommitItem({ commit, repoOwner, repoName }) {
    const { sha, commit: commitData, author, html_url } = commit;
    const message = commitData.message.split('\n')[0]; // First line only
    const authorName = commitData.author.name;
    const authorAvatar = author?.avatar_url;
    const date = commitData.author.date;

    return (
        <div style={{
            padding: '12px',
            background: COLORS.bgLight,
            borderRadius: '6px',
            marginBottom: '8px',
            border: `1px solid ${COLORS.border}`
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                {authorAvatar && (
                    <img
                        src={authorAvatar}
                        alt={authorName}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            flexShrink: 0
                        }}
                    />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        color: COLORS.text,
                        fontSize: '13px',
                        marginBottom: '4px',
                        wordBreak: 'break-word'
                    }}>
                        {message}
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '11px',
                        color: COLORS.textMuted,
                        flexWrap: 'wrap'
                    }}>
                        <span style={{ fontWeight: '600' }}>{authorName}</span>
                        <span>•</span>
                        <span>{formatDate(date)}</span>
                        <span>•</span>
                        <a
                            href={html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: COLORS.accent,
                                textDecoration: 'none',
                                fontFamily: 'monospace'
                            }}
                        >
                            {sha.substring(0, 7)}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function GitHistory({ onClose }) {
    const [activeTab, setActiveTab] = useState('descriptions');
    const [descriptionCommits, setDescriptionCommits] = useState([]);
    const [itemsCommits, setItemsCommits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Get token from localStorage if available (for higher rate limits)
    const token = localStorage.getItem('fib_github_token');

    useEffect(() => {
        async function loadCommits() {
            setLoading(true);
            setError(null);

            try {
                const [descCommits, itemCommits] = await Promise.all([
                    fetchCommits(REPO_OWNER, REPO_NAME, CONFIG_PATH, token),
                    fetchCommits(ITEMS_REPO_OWNER, ITEMS_REPO_NAME, ITEMS_PATH, token)
                ]);

                setDescriptionCommits(descCommits);
                setItemsCommits(itemCommits);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        }

        loadCommits();
    }, [token]);

    const currentCommits = activeTab === 'descriptions' ? descriptionCommits : itemsCommits;
    const currentRepoOwner = activeTab === 'descriptions' ? REPO_OWNER : ITEMS_REPO_OWNER;
    const currentRepoName = activeTab === 'descriptions' ? REPO_NAME : ITEMS_REPO_NAME;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px',
            boxSizing: 'border-box'
        }}>
            <div style={{
                background: COLORS.bg,
                borderRadius: '12px',
                width: '100%',
                maxWidth: '700px',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: 0, color: COLORS.text, fontSize: '18px' }}>
                            📜 Git History
                        </h2>
                        <div style={{ color: COLORS.textMuted, fontSize: '12px', marginTop: '4px' }}>
                            Recent changes to item pools and descriptions
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: COLORS.textMuted,
                            fontSize: '24px',
                            cursor: 'pointer',
                            padding: '4px 8px'
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: `1px solid ${COLORS.border}`,
                    padding: '0 24px'
                }}>
                    <button
                        onClick={() => setActiveTab('descriptions')}
                        style={{
                            padding: '12px 20px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'descriptions'
                                ? `2px solid ${COLORS.accent}`
                                : '2px solid transparent',
                            color: activeTab === 'descriptions' ? COLORS.text : COLORS.textMuted,
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            marginBottom: '-1px',
                            transition: 'all 0.15s'
                        }}
                    >
                        📝 Description Changes
                        <span style={{
                            marginLeft: '8px',
                            padding: '2px 6px',
                            background: COLORS.bgLighter,
                            borderRadius: '10px',
                            fontSize: '11px'
                        }}>
                            {descriptionCommits.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('items')}
                        style={{
                            padding: '12px 20px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'items'
                                ? `2px solid ${COLORS.accent}`
                                : '2px solid transparent',
                            color: activeTab === 'items' ? COLORS.text : COLORS.textMuted,
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            marginBottom: '-1px',
                            transition: 'all 0.15s'
                        }}
                    >
                        📦 Item Pool Changes
                        <span style={{
                            marginLeft: '8px',
                            padding: '2px 6px',
                            background: COLORS.bgLighter,
                            borderRadius: '10px',
                            fontSize: '11px'
                        }}>
                            {itemsCommits.length}
                        </span>
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    padding: '20px 24px',
                    overflowY: 'auto',
                    flex: 1
                }}>
                    {loading ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px',
                            color: COLORS.textMuted
                        }}>
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                            Loading commit history...
                        </div>
                    ) : error ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px',
                            color: COLORS.error
                        }}>
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
                            {error}
                            <div style={{
                                marginTop: '12px',
                                fontSize: '12px',
                                color: COLORS.textMuted
                            }}>
                                GitHub API rate limit may have been exceeded.
                                {!token && ' Sign in to the editor to increase limits.'}
                            </div>
                        </div>
                    ) : currentCommits.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px',
                            color: COLORS.textMuted
                        }}>
                            No commits found
                        </div>
                    ) : (
                        <>
                            <div style={{
                                marginBottom: '12px',
                                fontSize: '11px',
                                color: COLORS.textMuted,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span>
                                    Showing {currentCommits.length} recent commits
                                </span>
                                <a
                                    href={`https://github.com/${currentRepoOwner}/${currentRepoName}/commits/main/${activeTab === 'descriptions' ? CONFIG_PATH : ITEMS_PATH}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: COLORS.accent, textDecoration: 'none' }}
                                >
                                    View all on GitHub →
                                </a>
                            </div>
                            {currentCommits.map(commit => (
                                <CommitItem
                                    key={commit.sha}
                                    commit={commit}
                                    repoOwner={currentRepoOwner}
                                    repoName={currentRepoName}
                                />
                            ))}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px 24px',
                    borderTop: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ fontSize: '11px', color: COLORS.textMuted }}>
                        {activeTab === 'descriptions' ? (
                            <>Source: <code style={{ color: COLORS.description }}>{REPO_OWNER}/{REPO_NAME}</code></>
                        ) : (
                            <>Source: <code style={{ color: COLORS.description }}>{ITEMS_REPO_OWNER}/{ITEMS_REPO_NAME}</code></>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            background: COLORS.bgLighter,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '4px',
                            color: COLORS.text,
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}