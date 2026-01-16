import React, { useState, useEffect, useMemo, useCallback } from 'react';
// Direct imports for bundle optimization (react-best-practices rule 2.1)
import X from 'lucide-react/dist/esm/icons/x';
import Check from 'lucide-react/dist/esm/icons/check';
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
import { COLORS, useToast, ProgressSteps } from './UIComponents.jsx';

// GitHub API configuration
const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'McPlayHDnet';
const REPO_NAME = 'ForceItemBattle';
const FILE_PATH = 'src/main/java/forceitembattle/manager/ItemDifficultiesManager.java';
const PROTECTED_BRANCHES = new Set(['main', 'master']); // O(1) lookups

// LocalStorage keys
const TOKEN_KEY = 'fib_github_token';
const USER_KEY = 'fib_github_user';

// Hoisted regex patterns (react-best-practices rule 7.9)
const REGISTER_REGEX = /register\(Material\.(\w+),\s*State\.(\w+)(?:,\s*ItemTag\.(\w+))?(?:,\s*ItemTag\.(\w+))?(?:,\s*ItemTag\.(\w+))?\)/g;
const BRANCH_NAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const REGISTER_ALL_ITEMS_REGEX = /private void registerAllItems\(\)\s*\{/;

// Progress step definitions (hoisted constant)
const PROGRESS_STEPS = [
    { id: 'branch', label: 'Select Branch' },
    { id: 'changes', label: 'Make Changes' },
    { id: 'commit', label: 'Commit' },
];

// Storage functions with lazy initialization support
function getStoredToken() {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

function setStoredToken(token) {
    try {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            localStorage.removeItem(TOKEN_KEY);
        }
    } catch {
        // Ignore storage errors
    }
}

function getStoredUser() {
    try {
        const user = localStorage.getItem(USER_KEY);
        return user ? JSON.parse(user) : null;
    } catch {
        return null;
    }
}

function setStoredUser(user) {
    try {
        if (user) {
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(USER_KEY);
        }
    } catch {
        // Ignore storage errors
    }
}

// GitHub API functions
async function verifyTokenAndAccess(token) {
    // Verify token and get user
    const userResponse = await fetch(`${GITHUB_API}/user`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!userResponse.ok) {
        throw new Error('Invalid token');
    }
    const user = await userResponse.json();

    // Check repo access
    const repoResponse = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!repoResponse.ok) {
        throw new Error('Cannot access repository');
    }
    const repo = await repoResponse.json();

    if (!repo.permissions?.push) {
        throw new Error('No write access to repository');
    }

    return user;
}

async function fetchBranches(token) {
    const response = await fetch(
        `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/branches?per_page=100`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) throw new Error('Failed to fetch branches');
    return response.json();
}

async function getFileContent(token, branch) {
    const response = await fetch(
        `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${branch}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) throw new Error('Failed to fetch file');
    const data = await response.json();

    // Decode base64 to UTF-8 properly (atob alone corrupts non-ASCII characters)
    const binaryString = atob(data.content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const content = new TextDecoder('utf-8').decode(bytes);

    return { content, sha: data.sha };
}

async function createBranch(token, newBranchName, baseBranch) {
    // Get the SHA of the base branch
    const refResponse = await fetch(
        `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${baseBranch}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!refResponse.ok) throw new Error('Failed to get base branch');
    const refData = await refResponse.json();

    // Create new branch
    const createResponse = await fetch(
        `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ref: `refs/heads/${newBranchName}`,
                sha: refData.object.sha
            })
        }
    );
    if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(error.message || 'Failed to create branch');
    }
    return createResponse.json();
}

async function commitFile(token, branch, content, sha, message) {
    const response = await fetch(
        `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
        {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                content: btoa(unescape(encodeURIComponent(content))),
                sha,
                branch
            })
        }
    );
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to commit');
    }
    return response.json();
}

async function createPullRequest(token, title, head, base, body) {
    const response = await fetch(
        `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/pulls`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, head, base, body })
        }
    );
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create PR');
    }
    return response.json();
}

// Java file modification functions
function parseExistingItems(content) {
    const items = [];
    REGISTER_REGEX.lastIndex = 0; // Reset for reuse

    let match;
    while ((match = REGISTER_REGEX.exec(content)) !== null) {
        const [fullMatch, material, state, tag1, tag2, tag3] = match;
        items.push({
            material,
            state,
            tags: [tag1, tag2, tag3].filter(Boolean),
            line: fullMatch
        });
    }
    return items;
}

function generateRegisterLine(material, state, tags = []) {
    if (tags.length === 0) {
        return `        register(Material.${material}, State.${state});`;
    }
    const tagArgs = tags.map(t => `ItemTag.${t}`).join(', ');
    return `        register(Material.${material}, State.${state}, ${tagArgs});`;
}

function modifyJavaFile(content, additions, removals) {
    // Parse existing items
    const existingItems = parseExistingItems(content);
    const existingMaterials = new Set(existingItems.map(i => i.material));

    // Create removal set for O(1) lookup
    const removalSet = new Set(removals.map(r => r.material));

    // Find the registerAllItems method
    const methodMatch = content.match(REGISTER_ALL_ITEMS_REGEX);
    if (!methodMatch) {
        throw new Error('Could not find registerAllItems() method');
    }

    // Find the closing brace of the method (track brace depth)
    const methodStart = methodMatch.index + methodMatch[0].length;
    let braceDepth = 1;
    let methodEnd = methodStart;

    for (let i = methodStart; i < content.length; i++) {
        if (content[i] === '{') braceDepth++;
        if (content[i] === '}') braceDepth--;
        if (braceDepth === 0) {
            methodEnd = i;
            break;
        }
    }

    // Extract method body
    const beforeMethod = content.substring(0, methodStart);
    const afterMethod = content.substring(methodEnd);

    // Get all items (existing minus removals plus additions)
    const finalItems = [];

    // Add existing items that aren't being removed
    for (const item of existingItems) {
        if (!removalSet.has(item.material)) {
            finalItems.push(item);
        }
    }

    // Add new items
    for (const addition of additions) {
        if (!existingMaterials.has(addition.material)) {
            finalItems.push(addition);
        }
    }

    // Sort alphabetically by material name
    finalItems.sort((a, b) => a.material.localeCompare(b.material));

    // Generate new method body
    const newLines = finalItems.map(item =>
        generateRegisterLine(item.material, item.state, item.tags)
    );

    const newMethodBody = '\n' + newLines.join('\n') + '\n    ';

    return beforeMethod + newMethodBody + afterMethod;
}

// Main component
export default function ItemPoolManager({ onClose, items, missingItems, onRefreshMisode, initialExpandedItem }) {
    // Toast notifications
    const toast = useToast();

    // Lazy state initialization for localStorage (react-best-practices rule 5.5)
    const [token, setToken] = useState(() => getStoredToken() || '');
    const [user, setUser] = useState(() => getStoredUser());
    const [showTokenInput, setShowTokenInput] = useState(() => !getStoredToken());

    // UI state
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState(null);
    const [branches, setBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(false);

    // Branch selection
    const [branchMode, setBranchMode] = useState('existing'); // 'existing' | 'new'
    const [selectedBranch, setSelectedBranch] = useState('');
    const [newBranchName, setNewBranchName] = useState('');
    const [baseBranch, setBaseBranch] = useState('main');
    const [branchSearch, setBranchSearch] = useState('');

    // Item changes
    const [additions, setAdditions] = useState([]); // [{material, state, tags}]
    const [removals, setRemovals] = useState([]); // [{material}]
    const [addSearch, setAddSearch] = useState('');
    const [removeSearch, setRemoveSearch] = useState('');

    // Per-item configuration state (improved UX)
    // Initialize with initialExpandedItem if provided
    const [expandedItem, setExpandedItem] = useState(initialExpandedItem || null);
    const [configState, setConfigState] = useState('EARLY');
    const [configTags, setConfigTags] = useState({ NETHER: false, END: false, EXTREME: false });

    // Commit state
    const [commitMessage, setCommitMessage] = useState('');
    const [committing, setCommitting] = useState(false);
    const [commitSuccess, setCommitSuccess] = useState(null);
    const [createPR, setCreatePR] = useState(false);
    const [prUrl, setPrUrl] = useState(null);

    // Calculate current progress step
    const currentStep = useMemo(() => {
        if (commitSuccess) return 3; // Completed

        // Inline branch validation logic
        const isNewBranchValid = newBranchName &&
            newBranchName.length >= 1 &&
            !PROTECTED_BRANCHES.has(newBranchName.toLowerCase()) &&
            BRANCH_NAME_REGEX.test(newBranchName);

        const hasBranch = branchMode === 'existing'
            ? selectedBranch && !PROTECTED_BRANCHES.has(selectedBranch.toLowerCase())
            : isNewBranchValid;

        if (!hasBranch) return 0; // Step 1: Select branch
        if (additions.length === 0 && removals.length === 0) return 1; // Step 2: Make changes
        return 2; // Step 3: Ready to commit
    }, [branchMode, selectedBranch, newBranchName, additions.length, removals.length, commitSuccess]);

    // Memoized filtered lists (react-best-practices rule 5.2)
    const filteredBranches = useMemo(() => {
        if (!branchSearch) return branches;
        const search = branchSearch.toLowerCase();
        return branches.filter(b => b.name.toLowerCase().includes(search));
    }, [branches, branchSearch]);

    const filteredMissingItems = useMemo(() => {
        let filtered;
        if (!addSearch) {
            filtered = missingItems.slice(0, 50);
        } else {
            const search = addSearch.toLowerCase();
            filtered = missingItems
                .filter(item =>
                    item.material.toLowerCase().includes(search) ||
                    item.displayName.toLowerCase().includes(search)
                )
                .slice(0, 50);
        }

        // If there's an expanded item, make sure it's at the top of the list
        if (expandedItem) {
            const expandedIndex = filtered.findIndex(item => item.material === expandedItem);
            if (expandedIndex > 0) {
                // Move to front
                const item = filtered[expandedIndex];
                filtered = [item, ...filtered.slice(0, expandedIndex), ...filtered.slice(expandedIndex + 1)];
            } else if (expandedIndex === -1) {
                // Not in filtered list, find it in full list and add to front
                const item = missingItems.find(item => item.material === expandedItem);
                if (item) {
                    filtered = [item, ...filtered.slice(0, 49)];
                }
            }
        }

        return filtered;
    }, [missingItems, addSearch, expandedItem]);

    const filteredPoolItems = useMemo(() => {
        if (!removeSearch) return items.slice(0, 50);
        const search = removeSearch.toLowerCase();
        return items
            .filter(item =>
                item.material.toLowerCase().includes(search) ||
                item.displayName.toLowerCase().includes(search)
            )
            .slice(0, 50);
    }, [items, removeSearch]);

    // Sets for O(1) lookup of pending changes
    const additionMaterials = useMemo(() =>
        new Set(additions.map(a => a.material)), [additions]);
    const removalMaterials = useMemo(() =>
        new Set(removals.map(r => r.material)), [removals]);

    // Check if branch is valid
    const isValidBranchName = useCallback((name) => {
        if (!name || name.length < 1) return false;
        if (PROTECTED_BRANCHES.has(name.toLowerCase())) return false;
        return BRANCH_NAME_REGEX.test(name);
    }, []);

    // Get effective target branch
    const targetBranch = branchMode === 'new' ? newBranchName : selectedBranch;
    const canCommit = targetBranch &&
        !PROTECTED_BRANCHES.has(targetBranch.toLowerCase()) &&
        (additions.length > 0 || removals.length > 0) &&
        commitMessage.trim().length > 0;

    // Load branches on auth
    useEffect(() => {
        if (user && token) {
            setLoadingBranches(true);
            fetchBranches(token)
                .then(data => {
                    setBranches(data);
                    // Select first non-protected branch
                    const nonProtected = data.find(b => !PROTECTED_BRANCHES.has(b.name.toLowerCase()));
                    if (nonProtected) setSelectedBranch(nonProtected.name);
                })
                .catch(e => setError(e.message))
                .finally(() => setLoadingBranches(false));
        }
    }, [user, token]);

    // Handlers
    const handleAuthenticate = async () => {
        if (!token.trim()) return;
        setVerifying(true);
        setError(null);

        try {
            const verifiedUser = await verifyTokenAndAccess(token);
            setUser(verifiedUser);
            setStoredToken(token);
            setStoredUser(verifiedUser);
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
        setStoredToken(null);
        setStoredUser(null);
        setShowTokenInput(true);
        setBranches([]);
    };

    // Expand item for configuration (toggle behavior)
    const handleExpandItem = (item) => {
        if (additionMaterials.has(item.material)) return;
        // Toggle: if already expanded, collapse; otherwise expand
        if (expandedItem === item.material) {
            setExpandedItem(null);
        } else {
            setExpandedItem(item.material);
            // Reset config to defaults when expanding new item
            setConfigState('EARLY');
            setConfigTags({ NETHER: false, END: false, EXTREME: false });
        }
    };

    // Confirm adding item with current configuration
    const handleConfirmAdd = (item) => {
        if (additionMaterials.has(item.material)) return;
        const selectedTags = Object.entries(configTags)
            .filter(([, v]) => v)
            .map(([k]) => k);
        setAdditions(prev => [...prev, {
            material: item.material,
            state: configState,
            tags: selectedTags
        }]);
        setExpandedItem(null); // Collapse after adding
    };

    // Cancel item configuration
    const handleCancelConfig = () => {
        setExpandedItem(null);
    };

    const handleRemoveFromAdditions = (material) => {
        setAdditions(prev => prev.filter(a => a.material !== material));
    };

    const handleRemoveItem = (item) => {
        if (removalMaterials.has(item.material)) return;
        setRemovals(prev => [...prev, { material: item.material }]);
    };

    const handleUndoRemoval = (material) => {
        setRemovals(prev => prev.filter(r => r.material !== material));
    };

    const handleClearChanges = () => {
        setAdditions([]);
        setRemovals([]);
    };

    const handleCommit = async () => {
        if (!canCommit) return;
        setCommitting(true);
        setError(null);
        setCommitSuccess(null);
        setPrUrl(null);

        try {
            let branch = targetBranch;

            // Create new branch if needed
            if (branchMode === 'new') {
                await createBranch(token, newBranchName, baseBranch);
                branch = newBranchName;
                toast.info(`Created branch "${newBranchName}"`);
            }

            // Get current file content
            const { content, sha } = await getFileContent(token, branch);

            // Modify the file
            const newContent = modifyJavaFile(content, additions, removals);

            // Commit
            await commitFile(token, branch, newContent, sha, commitMessage);

            // Create PR if requested
            let prUrlResult = null;
            if (createPR) {
                const prTitle = commitMessage.split('\n')[0];
                const prBody = `## Changes\n\n### Added Items (${additions.length})\n${
                    additions.map(a => `- ${a.material} → ${a.state}${a.tags.length ? ` (${a.tags.join(', ')})` : ''}`).join('\n') || 'None'
                }\n\n### Removed Items (${removals.length})\n${
                    removals.map(r => `- ${r.material}`).join('\n') || 'None'
                }`;

                const pr = await createPullRequest(token, prTitle, branch, 'main', prBody);
                prUrlResult = pr.html_url;
                setPrUrl(prUrlResult);
            }

            setCommitSuccess(true);

            // Show success toast
            toast.success(
                createPR
                    ? `Changes committed and PR created!`
                    : `Changes committed to ${branch}!`
            );

            // Clear changes after successful commit
            setAdditions([]);
            setRemovals([]);
            setCommitMessage('');

        } catch (e) {
            setError(e.message);
            setCommitSuccess(false);
            toast.error(`Commit failed: ${e.message}`);
        } finally {
            setCommitting(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: COLORS.bg,
                    border: `2px solid ${COLORS.accent}`,
                    borderRadius: '8px',
                    width: '100%',
                    maxWidth: '800px',
                    maxHeight: '90vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{ margin: 0, color: COLORS.text, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <GitBranch size={20} />
                        Item Pool Manager
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: COLORS.textMuted,
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
                    {/* Authentication */}
                    {showTokenInput ? (
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ fontSize: '14px', color: COLORS.text, marginBottom: '12px' }}>
                                Authenticate with GitHub to manage item pools
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="password"
                                    placeholder="GitHub Personal Access Token"
                                    value={token}
                                    onChange={e => setToken(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAuthenticate()}
                                    style={{
                                        flex: 1,
                                        padding: '10px 14px',
                                        background: COLORS.bgLighter,
                                        border: `1px solid ${COLORS.border}`,
                                        borderRadius: '4px',
                                        color: COLORS.text,
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    onClick={handleAuthenticate}
                                    disabled={verifying || !token.trim()}
                                    style={{
                                        padding: '10px 20px',
                                        background: COLORS.accent,
                                        border: 'none',
                                        borderRadius: '4px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        cursor: verifying ? 'not-allowed' : 'pointer',
                                        opacity: verifying || !token.trim() ? 0.6 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {verifying && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                                    {verifying ? 'Verifying...' : 'Authenticate'}
                                </button>
                            </div>
                            <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '8px' }}>
                                <a
                                    href={`https://github.com/settings/tokens/new?description=FIB%20Item%20Pool%20Manager&scopes=repo`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: COLORS.accent, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                    Create a new token <ExternalLink size={12} />
                                </a>
                                {' '}(requires <code style={{ background: COLORS.bgLighter, padding: '2px 6px', borderRadius: '3px' }}>repo</code> scope)
                            </div>
                        </div>
                    ) : user && (
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {user.avatar_url && (
                                        <img src={user.avatar_url} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                                    )}
                                    <div>
                                        <div style={{ color: COLORS.success, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Check size={14} /> Authenticated as <strong>@{user.login}</strong>
                                        </div>
                                        <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>
                                            Write access to {REPO_OWNER}/{REPO_NAME}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: COLORS.textMuted,
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    Sign out
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Error display */}
                    {error && (
                        <div style={{
                            padding: '12px 16px',
                            background: COLORS.error + '22',
                            border: `1px solid ${COLORS.error}44`,
                            borderRadius: '4px',
                            color: COLORS.error,
                            fontSize: '13px',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}

                    {/* Success display */}
                    {commitSuccess && (
                        <div style={{
                            padding: '12px 16px',
                            background: COLORS.success + '22',
                            border: `1px solid ${COLORS.success}44`,
                            borderRadius: '4px',
                            color: COLORS.success,
                            fontSize: '13px',
                            marginBottom: '16px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Check size={16} />
                                Changes committed successfully!
                            </div>
                            {prUrl && (
                                <div style={{ marginTop: '8px' }}>
                                    <a
                                        href={prUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: COLORS.success, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <GitPullRequest size={14} />
                                        View Pull Request <ExternalLink size={12} />
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Main content - only show if authenticated */}
                    {user && (
                        <>
                            {/* Progress Steps */}
                            <ProgressSteps steps={PROGRESS_STEPS} currentStep={currentStep} />

                            {/* Branch Selection */}
                            <div style={{
                                background: COLORS.bgLight,
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: '6px',
                                padding: '16px',
                                marginBottom: '16px'
                            }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: COLORS.text, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <GitBranch size={14} />
                                    Target Branch
                                </div>

                                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.text, fontSize: '13px', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            checked={branchMode === 'existing'}
                                            onChange={() => setBranchMode('existing')}
                                        />
                                        Select existing branch
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.text, fontSize: '13px', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            checked={branchMode === 'new'}
                                            onChange={() => setBranchMode('new')}
                                        />
                                        Create new branch
                                    </label>
                                </div>

                                {branchMode === 'existing' ? (
                                    <div>
                                        <div style={{ position: 'relative', marginBottom: '8px' }}>
                                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted }} />
                                            <input
                                                type="text"
                                                placeholder="Search branches..."
                                                value={branchSearch}
                                                onChange={e => setBranchSearch(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px 8px 32px',
                                                    background: COLORS.bgLighter,
                                                    border: `1px solid ${COLORS.border}`,
                                                    borderRadius: '4px',
                                                    color: COLORS.text,
                                                    fontSize: '13px',
                                                    outline: 'none',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>
                                        <div style={{ maxHeight: '120px', overflow: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '4px' }}>
                                            {loadingBranches ? (
                                                <div style={{ padding: '12px', color: COLORS.textMuted, fontSize: '13px', textAlign: 'center' }}>
                                                    Loading branches...
                                                </div>
                                            ) : filteredBranches.length === 0 ? (
                                                <div style={{ padding: '12px', color: COLORS.textMuted, fontSize: '13px', textAlign: 'center' }}>
                                                    No branches found
                                                </div>
                                            ) : filteredBranches.map(branch => (
                                                <div
                                                    key={branch.name}
                                                    onClick={() => !PROTECTED_BRANCHES.has(branch.name.toLowerCase()) && setSelectedBranch(branch.name)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        background: selectedBranch === branch.name ? COLORS.accent + '22' : 'transparent',
                                                        color: PROTECTED_BRANCHES.has(branch.name.toLowerCase()) ? COLORS.textMuted : COLORS.text,
                                                        fontSize: '13px',
                                                        cursor: PROTECTED_BRANCHES.has(branch.name.toLowerCase()) ? 'not-allowed' : 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        borderBottom: `1px solid ${COLORS.border}`
                                                    }}
                                                >
                                                    <span>{branch.name}</span>
                                                    {PROTECTED_BRANCHES.has(branch.name.toLowerCase()) && (
                                                        <span style={{ fontSize: '10px', color: COLORS.warning, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <AlertTriangle size={10} /> Protected
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="new-branch-name"
                                            value={newBranchName}
                                            onChange={e => setNewBranchName(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '-'))}
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                background: COLORS.bgLighter,
                                                border: `1px solid ${isValidBranchName(newBranchName) || !newBranchName ? COLORS.border : COLORS.error}`,
                                                borderRadius: '4px',
                                                color: COLORS.text,
                                                fontSize: '13px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                                marginBottom: '8px'
                                            }}
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ color: COLORS.textMuted, fontSize: '12px' }}>Base:</span>
                                            <select
                                                value={baseBranch}
                                                onChange={e => setBaseBranch(e.target.value)}
                                                style={{
                                                    padding: '6px 10px',
                                                    background: COLORS.bgLighter,
                                                    border: `1px solid ${COLORS.border}`,
                                                    borderRadius: '4px',
                                                    color: COLORS.text,
                                                    fontSize: '12px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {branches.map(b => (
                                                    <option key={b.name} value={b.name}>{b.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {targetBranch && PROTECTED_BRANCHES.has(targetBranch.toLowerCase()) && (
                                    <div style={{ marginTop: '8px', color: COLORS.warning, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <AlertTriangle size={12} />
                                        Protected branches cannot be modified directly
                                    </div>
                                )}
                            </div>

                            {/* Add Items Section */}
                            <div style={{
                                background: COLORS.bgLight,
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: '6px',
                                padding: '16px',
                                marginBottom: '16px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: COLORS.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Plus size={14} />
                                        Add Items ({missingItems.length} missing)
                                    </div>
                                    {onRefreshMisode && (
                                        <button
                                            onClick={onRefreshMisode}
                                            title="Refresh Minecraft item list (clears cache)"
                                            style={{
                                                padding: '4px 8px',
                                                background: 'transparent',
                                                border: `1px solid ${COLORS.border}`,
                                                borderRadius: '3px',
                                                color: COLORS.textMuted,
                                                fontSize: '11px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <RefreshCw size={12} />
                                            Refresh Items
                                        </button>
                                    )}
                                </div>

                                <div style={{ position: 'relative', marginBottom: '12px' }}>
                                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted }} />
                                    <input
                                        type="text"
                                        placeholder="Search missing items..."
                                        value={addSearch}
                                        onChange={e => setAddSearch(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px 8px 32px',
                                            background: COLORS.bgLighter,
                                            border: `1px solid ${COLORS.border}`,
                                            borderRadius: '4px',
                                            color: COLORS.text,
                                            fontSize: '13px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                <div style={{ maxHeight: '200px', overflow: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '4px' }}>
                                    {filteredMissingItems.length === 0 ? (
                                        <div style={{ padding: '12px', color: COLORS.textMuted, fontSize: '13px', textAlign: 'center' }}>
                                            {addSearch ? 'No items match your search' : 'No missing items'}
                                        </div>
                                    ) : filteredMissingItems.map(item => {
                                        const isExpanded = expandedItem === item.material;
                                        const isAdded = additionMaterials.has(item.material);

                                        return (
                                            <div
                                                key={item.material}
                                                style={{
                                                    borderBottom: `1px solid ${COLORS.border}`,
                                                    background: isAdded ? COLORS.success + '11' : isExpanded ? COLORS.accent + '11' : 'transparent'
                                                }}
                                            >
                                                {/* Item row */}
                                                <div
                                                    style={{
                                                        padding: '8px 12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        cursor: isAdded ? 'default' : 'pointer'
                                                    }}
                                                    onClick={() => !isAdded && handleExpandItem(item)}
                                                >
                                                    <span style={{ color: COLORS.text, fontSize: '13px' }}>{item.displayName}</span>
                                                    {isAdded ? (
                                                        <span style={{ color: COLORS.success, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Check size={12} /> Added
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: COLORS.textMuted, fontSize: '11px' }}>
                                                            {isExpanded ? 'Configure ▲' : 'Click to add ▼'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Expanded configuration panel */}
                                                {isExpanded && !isAdded && (
                                                    <div style={{
                                                        padding: '12px',
                                                        background: COLORS.bgLighter,
                                                        borderTop: `1px solid ${COLORS.border}`
                                                    }}>
                                                        {/* State selection */}
                                                        <div style={{ marginBottom: '10px' }}>
                                                            <div style={{ fontSize: '11px', color: COLORS.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                                Difficulty State
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                {['EARLY', 'MID', 'LATE'].map(state => (
                                                                    <button
                                                                        key={state}
                                                                        onClick={(e) => { e.stopPropagation(); setConfigState(state); }}
                                                                        style={{
                                                                            padding: '6px 12px',
                                                                            background: configState === state ? COLORS[state.toLowerCase()] + '33' : 'transparent',
                                                                            border: `1px solid ${configState === state ? COLORS[state.toLowerCase()] : COLORS.border}`,
                                                                            borderRadius: '4px',
                                                                            color: COLORS[state.toLowerCase()],
                                                                            fontSize: '12px',
                                                                            fontWeight: configState === state ? '600' : '400',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.15s'
                                                                        }}
                                                                    >
                                                                        {state}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Tags selection */}
                                                        <div style={{ marginBottom: '12px' }}>
                                                            <div style={{ fontSize: '11px', color: COLORS.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                                Tags (optional)
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                                {['NETHER', 'END', 'EXTREME'].map(tag => (
                                                                    <label
                                                                        key={tag}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '6px',
                                                                            padding: '5px 10px',
                                                                            background: configTags[tag] ? COLORS.accent + '22' : 'transparent',
                                                                            border: `1px solid ${configTags[tag] ? COLORS.accent : COLORS.border}`,
                                                                            borderRadius: '4px',
                                                                            color: configTags[tag] ? COLORS.accent : COLORS.textMuted,
                                                                            fontSize: '11px',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.15s'
                                                                        }}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={configTags[tag]}
                                                                            onChange={e => setConfigTags(prev => ({ ...prev, [tag]: e.target.checked }))}
                                                                            style={{ display: 'none' }}
                                                                        />
                                                                        {configTags[tag] && <Check size={10} />}
                                                                        {tag}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Action buttons */}
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleCancelConfig(); }}
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    background: 'transparent',
                                                                    border: `1px solid ${COLORS.border}`,
                                                                    borderRadius: '4px',
                                                                    color: COLORS.textMuted,
                                                                    fontSize: '12px',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleConfirmAdd(item); }}
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    background: COLORS.success + '22',
                                                                    border: `1px solid ${COLORS.success}44`,
                                                                    borderRadius: '4px',
                                                                    color: COLORS.success,
                                                                    fontSize: '12px',
                                                                    fontWeight: '600',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}
                                                            >
                                                                <Plus size={12} />
                                                                Add as {configState}
                                                                {Object.values(configTags).some(v => v) && (
                                                                    <span style={{ opacity: 0.7 }}>
                                                                        + {Object.entries(configTags).filter(([,v]) => v).map(([k]) => k).join(', ')}
                                                                    </span>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Remove Items Section */}
                            <div style={{
                                background: COLORS.bgLight,
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: '6px',
                                padding: '16px',
                                marginBottom: '16px'
                            }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: COLORS.text, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Minus size={14} />
                                    Remove Items ({items.length} in pool)
                                </div>

                                <div style={{ position: 'relative', marginBottom: '12px' }}>
                                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted }} />
                                    <input
                                        type="text"
                                        placeholder="Search pool items..."
                                        value={removeSearch}
                                        onChange={e => setRemoveSearch(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px 8px 32px',
                                            background: COLORS.bgLighter,
                                            border: `1px solid ${COLORS.border}`,
                                            borderRadius: '4px',
                                            color: COLORS.text,
                                            fontSize: '13px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                <div style={{ maxHeight: '150px', overflow: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '4px' }}>
                                    {filteredPoolItems.length === 0 ? (
                                        <div style={{ padding: '12px', color: COLORS.textMuted, fontSize: '13px', textAlign: 'center' }}>
                                            {removeSearch ? 'No items match your search' : 'No items in pool'}
                                        </div>
                                    ) : filteredPoolItems.map(item => (
                                        <div
                                            key={item.material}
                                            style={{
                                                padding: '8px 12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                borderBottom: `1px solid ${COLORS.border}`,
                                                background: removalMaterials.has(item.material) ? COLORS.error + '11' : 'transparent'
                                            }}
                                        >
                                            <div>
                                                <span style={{ color: COLORS.text, fontSize: '13px' }}>{item.displayName}</span>
                                                <span style={{ color: COLORS[item.state?.toLowerCase()] || COLORS.textMuted, fontSize: '11px', marginLeft: '8px' }}>
                                                    ({item.state})
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveItem(item)}
                                                disabled={removalMaterials.has(item.material)}
                                                style={{
                                                    padding: '4px 8px',
                                                    background: removalMaterials.has(item.material) ? COLORS.error + '44' : COLORS.error + '22',
                                                    border: 'none',
                                                    borderRadius: '3px',
                                                    color: COLORS.error,
                                                    fontSize: '11px',
                                                    cursor: removalMaterials.has(item.material) ? 'default' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                {removalMaterials.has(item.material) ? <Check size={12} /> : <Minus size={12} />}
                                                {removalMaterials.has(item.material) ? 'Marked' : 'Remove'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pending Changes */}
                            {(additions.length > 0 || removals.length > 0) && (
                                <div style={{
                                    background: COLORS.bgLight,
                                    border: `1px solid ${COLORS.accent}44`,
                                    borderRadius: '6px',
                                    padding: '16px',
                                    marginBottom: '16px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: COLORS.text }}>
                                            Pending Changes ({additions.length + removals.length})
                                        </div>
                                        <button
                                            onClick={handleClearChanges}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: COLORS.textMuted,
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <Trash2 size={12} /> Clear
                                        </button>
                                    </div>

                                    <div style={{ maxHeight: '120px', overflow: 'auto' }}>
                                        {additions.map(item => (
                                            <div key={item.material} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Plus size={14} style={{ color: COLORS.success }} />
                                                    <span style={{ color: COLORS.text, fontSize: '13px' }}>{item.material}</span>
                                                    <span style={{ color: COLORS[item.state.toLowerCase()], fontSize: '11px' }}>→ {item.state}</span>
                                                    {item.tags.length > 0 && (
                                                        <span style={{ color: COLORS.textMuted, fontSize: '11px' }}>({item.tags.join(', ')})</span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveFromAdditions(item.material)}
                                                    style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: '2px' }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        {removals.map(item => (
                                            <div key={item.material} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Minus size={14} style={{ color: COLORS.error }} />
                                                    <span style={{ color: COLORS.text, fontSize: '13px', textDecoration: 'line-through' }}>{item.material}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleUndoRemoval(item.material)}
                                                    style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: '2px' }}
                                                >
                                                    <RefreshCw size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Commit Section */}
                            <div style={{
                                background: COLORS.bgLight,
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: '6px',
                                padding: '16px'
                            }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: COLORS.text, marginBottom: '12px' }}>
                                    Commit Message
                                </div>
                                <textarea
                                    placeholder="Describe your changes..."
                                    value={commitMessage}
                                    onChange={e => setCommitMessage(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        background: COLORS.bgLighter,
                                        border: `1px solid ${COLORS.border}`,
                                        borderRadius: '4px',
                                        color: COLORS.text,
                                        fontSize: '13px',
                                        outline: 'none',
                                        resize: 'vertical',
                                        minHeight: '60px',
                                        boxSizing: 'border-box',
                                        fontFamily: 'inherit'
                                    }}
                                />

                                <div style={{ marginTop: '12px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.text, fontSize: '13px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={createPR}
                                            onChange={e => setCreatePR(e.target.checked)}
                                        />
                                        <GitPullRequest size={14} />
                                        Create Pull Request to main after commit
                                    </label>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                {user && (
                    <div style={{
                        padding: '16px 20px',
                        borderTop: `1px solid ${COLORS.border}`,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px'
                    }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                background: COLORS.bgLighter,
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: '4px',
                                color: COLORS.text,
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCommit}
                            disabled={!canCommit || committing}
                            style={{
                                padding: '10px 20px',
                                background: canCommit && !committing ? COLORS.accent : COLORS.bgLighter,
                                border: 'none',
                                borderRadius: '4px',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: canCommit && !committing ? 'pointer' : 'not-allowed',
                                opacity: canCommit && !committing ? 1 : 0.6,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {committing && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                            {committing ? 'Committing...' : 'Commit & Push'}
                        </button>
                    </div>
                )}
            </div>

            {/* CSS for spinner animation */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}