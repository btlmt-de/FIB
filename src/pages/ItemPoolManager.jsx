import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { COLORS, useToast, ProgressSteps } from '../components/common/UIComponents.jsx';

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

    useEffect(() => {
        if (!open) return;
        const handleClick = (e) => {
            if (buttonRef.current && !buttonRef.current.contains(e.target)) setOpen(false);
        };
        const handleScroll = () => setOpen(false);
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('scroll', handleScroll, true);
        };
    }, [open]);

    const handleOpen = (e) => {
        e.stopPropagation();
        if (disabled) return;
        if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPosition({ top: rect.bottom + 2, left: rect.left });
        }
        setOpen(!open);
    };

    return (
        <div ref={buttonRef} style={{ position: 'relative' }}>
            <button
                onClick={handleOpen}
                disabled={disabled}
                style={{
                    padding: '3px 8px',
                    background: COLORS[value.toLowerCase()] + '22',
                    border: `1px solid ${COLORS[value.toLowerCase()]}44`,
                    borderRadius: '4px',
                    color: COLORS[value.toLowerCase()],
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: disabled ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    opacity: disabled ? 0.6 : 1
                }}
            >
                {value}
                {!disabled && <ChevronDown size={10} />}
            </button>
            {open && (
                <div style={{
                    position: 'fixed',
                    top: position.top,
                    left: position.left,
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 9999,
                    minWidth: '80px',
                    overflow: 'hidden'
                }}>
                    {STATES.map(state => (
                        <button
                            key={state}
                            onClick={(e) => { e.stopPropagation(); onChange(state); setOpen(false); }}
                            style={{
                                display: 'block',
                                width: '100%',
                                padding: '6px 10px',
                                background: value === state ? COLORS[state.toLowerCase()] + '22' : 'transparent',
                                border: 'none',
                                color: COLORS[state.toLowerCase()],
                                fontSize: '11px',
                                fontWeight: value === state ? '600' : '400',
                                cursor: 'pointer',
                                textAlign: 'left'
                            }}
                        >
                            {state}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// Tag Toggle Pills
function TagPills({ tags, onChange, disabled, small }) {
    return (
        <div style={{ display: 'flex', gap: '4px' }}>
            {TAGS.map(tag => {
                const active = tags.includes(tag);
                return (
                    <button
                        key={tag}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (disabled) return;
                            onChange(active ? tags.filter(t => t !== tag) : [...tags, tag]);
                        }}
                        disabled={disabled}
                        style={{
                            padding: small ? '2px 5px' : '3px 6px',
                            background: active ? COLORS[tag.toLowerCase()] + '33' : 'transparent',
                            border: `1px solid ${active ? COLORS[tag.toLowerCase()] : COLORS.border}`,
                            borderRadius: '3px',
                            color: active ? COLORS[tag.toLowerCase()] : COLORS.textMuted,
                            fontSize: small ? '9px' : '10px',
                            fontWeight: active ? '600' : '400',
                            cursor: disabled ? 'default' : 'pointer',
                            opacity: disabled ? 0.6 : 1
                        }}
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
        <div
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
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
                    borderRadius: '12px',
                    width: '100%',
                    maxWidth: '700px',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <GitBranch size={20} style={{ color: COLORS.accent }} />
                        <h2 style={{ margin: 0, color: COLORS.text, fontSize: '16px', fontWeight: '600' }}>
                            Item Pool Manager
                        </h2>
                        {user && (
                            <span style={{ fontSize: '12px', color: COLORS.textMuted }}>
                                as {user.login}
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {user && (
                            <button
                                onClick={handleLogout}
                                style={{
                                    padding: '6px 10px',
                                    background: 'transparent',
                                    border: `1px solid ${COLORS.border}`,
                                    borderRadius: '4px',
                                    color: COLORS.textMuted,
                                    fontSize: '11px',
                                    cursor: 'pointer'
                                }}
                            >
                                Logout
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: '4px' }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Auth Section */}
                {showTokenInput && (
                    <div style={{ padding: '20px', borderBottom: `1px solid ${COLORS.border}` }}>
                        <div style={{ marginBottom: '12px', fontSize: '13px', color: COLORS.textMuted }}>
                            Enter a GitHub Personal Access Token with <code style={{ background: COLORS.bgLighter, padding: '2px 4px', borderRadius: '3px' }}>repo</code> scope.{' '}
                            <a
                                href={GITHUB_TOKEN_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: COLORS.accent, textDecoration: 'none' }}
                            >
                                Create one here <ExternalLink size={11} style={{ verticalAlign: 'middle' }} />
                            </a>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                            <input
                                type="password"
                                placeholder="ghp_xxxxxxxxxxxx"
                                value={token}
                                onChange={e => setToken(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAuthenticate()}
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    background: COLORS.bgLighter,
                                    border: `1px solid ${COLORS.border}`,
                                    borderRadius: '6px',
                                    color: COLORS.text,
                                    fontSize: '13px',
                                    outline: 'none'
                                }}
                            />
                            <button
                                onClick={handleAuthenticate}
                                disabled={verifying || !token.trim()}
                                style={{
                                    padding: '10px 16px',
                                    background: COLORS.accent,
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: verifying ? 'wait' : 'pointer',
                                    opacity: verifying || !token.trim() ? 0.6 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {verifying && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                                {verifying ? 'Verifying...' : 'Connect'}
                            </button>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: COLORS.textMuted, cursor: 'pointer' }}>
                            <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                            Remember me for 60 days
                        </label>
                        {error && (
                            <div style={{ marginTop: '10px', padding: '10px', background: COLORS.error + '22', borderRadius: '6px', color: COLORS.error, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertTriangle size={14} /> {error}
                            </div>
                        )}
                    </div>
                )}

                {/* Main Content - only show if authenticated */}
                {user && (
                    <>
                        {/* Progress Indicator */}
                        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${COLORS.border}` }}>
                            <ProgressSteps steps={PROGRESS_STEPS} currentStep={currentStep} />
                        </div>

                        {/* Branch Selector - Compact */}
                        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${COLORS.border}`, background: COLORS.bgLight }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', color: COLORS.textMuted }}>Branch:</span>
                                    <select
                                        value={branchMode === 'existing' ? selectedBranch : '__new__'}
                                        onChange={e => {
                                            if (e.target.value === '__new__') {
                                                setBranchMode('new');
                                            } else {
                                                setBranchMode('existing');
                                                setSelectedBranch(e.target.value);
                                            }
                                        }}
                                        style={{
                                            padding: '6px 10px',
                                            background: COLORS.bgLighter,
                                            border: `1px solid ${COLORS.border}`,
                                            borderRadius: '4px',
                                            color: COLORS.text,
                                            fontSize: '12px',
                                            outline: 'none',
                                            cursor: 'pointer',
                                            minWidth: '150px'
                                        }}
                                    >
                                        {branches.filter(b => !PROTECTED_BRANCHES.has(b.name.toLowerCase())).map(b => (
                                            <option key={b.name} value={b.name}>{b.name}</option>
                                        ))}
                                        <option value="__new__">+ Create new branch...</option>
                                    </select>
                                    <button
                                        onClick={handleRefreshBranches}
                                        disabled={loadingBranches}
                                        title="Refresh branches"
                                        style={{
                                            padding: '6px',
                                            background: 'transparent',
                                            border: `1px solid ${COLORS.border}`,
                                            borderRadius: '4px',
                                            color: COLORS.textMuted,
                                            cursor: loadingBranches ? 'wait' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <RefreshCw size={12} style={{ animation: loadingBranches ? 'spin 1s linear infinite' : 'none' }} />
                                    </button>
                                </div>
                                {branchMode === 'new' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="text"
                                            placeholder="new-branch-name"
                                            value={newBranchName}
                                            onChange={e => setNewBranchName(e.target.value)}
                                            style={{
                                                padding: '6px 10px',
                                                background: COLORS.bgLighter,
                                                border: `1px solid ${COLORS.border}`,
                                                borderRadius: '4px',
                                                color: COLORS.text,
                                                fontSize: '12px',
                                                outline: 'none',
                                                width: '160px'
                                            }}
                                        />
                                        <span style={{ fontSize: '11px', color: COLORS.textMuted }}>from</span>
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
                                                outline: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {branches.map(b => (
                                                <option key={b.name} value={b.name}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {!isValidBranch && targetBranch && (
                                    <span style={{ fontSize: '11px', color: COLORS.error }}>
                                        {PROTECTED_BRANCHES.has(targetBranch.toLowerCase()) ? 'Cannot commit to protected branch' : 'Invalid branch name'}
                                    </span>
                                )}
                                {/* Refresh Misode data button */}
                                {onRefreshMisode && (
                                    <button
                                        onClick={onRefreshMisode}
                                        title="Refresh item data from Misode"
                                        style={{
                                            marginLeft: 'auto',
                                            padding: '5px 10px',
                                            background: 'transparent',
                                            border: `1px solid ${COLORS.border}`,
                                            borderRadius: '4px',
                                            color: COLORS.textMuted,
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <RefreshCw size={11} />
                                        Refresh Items
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
                            <button
                                onClick={() => { setActiveTab('add'); setSearchQuery(''); }}
                                style={{
                                    flex: 1,
                                    padding: '12px 16px',
                                    background: activeTab === 'add' ? COLORS.bgLight : 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'add' ? `2px solid ${COLORS.accent}` : '2px solid transparent',
                                    color: activeTab === 'add' ? COLORS.text : COLORS.textMuted,
                                    fontSize: '13px',
                                    fontWeight: activeTab === 'add' ? '600' : '400',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Plus size={16} />
                                Add Items
                                <span style={{
                                    background: COLORS.bgLighter,
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    color: COLORS.textMuted
                                }}>
                                    {missingItems.length}
                                </span>
                            </button>
                            <button
                                onClick={() => { setActiveTab('manage'); setSearchQuery(''); }}
                                style={{
                                    flex: 1,
                                    padding: '12px 16px',
                                    background: activeTab === 'manage' ? COLORS.bgLight : 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'manage' ? `2px solid ${COLORS.accent}` : '2px solid transparent',
                                    color: activeTab === 'manage' ? COLORS.text : COLORS.textMuted,
                                    fontSize: '13px',
                                    fontWeight: activeTab === 'manage' ? '600' : '400',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Settings size={16} />
                                Manage Pool
                                <span style={{
                                    background: COLORS.bgLighter,
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    color: COLORS.textMuted
                                }}>
                                    {items.length}
                                </span>
                            </button>
                        </div>

                        {/* Search */}
                        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${COLORS.border}` }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted }} />
                                <input
                                    type="text"
                                    placeholder={activeTab === 'add' ? 'Search missing items...' : 'Search pool items...'}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px 10px 36px',
                                        background: COLORS.bgLighter,
                                        border: `1px solid ${COLORS.border}`,
                                        borderRadius: '6px',
                                        color: COLORS.text,
                                        fontSize: '13px',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Item List */}
                        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                            {filteredItems.length === 0 ? (
                                <div style={{ padding: '40px 20px', textAlign: 'center', color: COLORS.textMuted }}>
                                    {searchQuery ? 'No items match your search' : 'No items available'}
                                </div>
                            ) : (
                                filteredItems.map(item => {
                                    const change = pendingChanges.find(c => c.material === item.material);
                                    const hasChange = !!change;

                                    return (
                                        <div
                                            key={item.material}
                                            style={{
                                                padding: '10px 20px',
                                                borderBottom: `1px solid ${COLORS.border}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '12px',
                                                background: hasChange
                                                    ? (change.type === 'add' ? COLORS.success + '08' : change.type === 'remove' ? COLORS.error + '08' : COLORS.accent + '08')
                                                    : 'transparent'
                                            }}
                                        >
                                            {/* Item Info */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                                <img
                                                    src={`${IMAGE_BASE_URL}/${item.material.toLowerCase()}.png`}
                                                    alt=""
                                                    style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        imageRendering: 'pixelated',
                                                        flexShrink: 0,
                                                        opacity: hasChange && change.type === 'remove' ? 0.4 : 1
                                                    }}
                                                    onError={(e) => { e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                                                />
                                                <span style={{
                                                    color: hasChange && change.type === 'remove' ? COLORS.textMuted : COLORS.text,
                                                    fontSize: '13px',
                                                    textDecoration: hasChange && change.type === 'remove' ? 'line-through' : 'none',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    {item.displayName}
                                                </span>

                                                {/* Show current state for pool items */}
                                                {activeTab === 'manage' && !hasChange && (
                                                    <>
                                                        <StateDropdown
                                                            value={item.state}
                                                            onChange={(newState) => handleModifyItem(item, newState, item.tags || [])}
                                                            disabled={false}
                                                        />
                                                        <TagPills
                                                            tags={item.tags || []}
                                                            onChange={(newTags) => handleModifyItem(item, item.state, newTags)}
                                                            disabled={false}
                                                            small
                                                        />
                                                    </>
                                                )}

                                                {/* Show pending state for items with changes */}
                                                {hasChange && change.type !== 'remove' && (
                                                    <>
                                                        <StateDropdown
                                                            value={change.state}
                                                            onChange={(newState) => setPendingChanges(prev => prev.map(c =>
                                                                c.material === item.material ? { ...c, state: newState } : c
                                                            ))}
                                                            disabled={false}
                                                        />
                                                        <TagPills
                                                            tags={change.tags}
                                                            onChange={(newTags) => setPendingChanges(prev => prev.map(c =>
                                                                c.material === item.material ? { ...c, tags: newTags } : c
                                                            ))}
                                                            disabled={false}
                                                            small
                                                        />
                                                    </>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                {hasChange ? (
                                                    <button
                                                        onClick={() => handleUndoChange(item.material)}
                                                        style={{
                                                            padding: '5px 10px',
                                                            background: 'transparent',
                                                            border: `1px solid ${COLORS.border}`,
                                                            borderRadius: '4px',
                                                            color: COLORS.textMuted,
                                                            fontSize: '11px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        <X size={12} />
                                                        Undo
                                                    </button>
                                                ) : activeTab === 'add' ? (
                                                    <button
                                                        onClick={() => handleAddItem(item)}
                                                        style={{
                                                            padding: '5px 10px',
                                                            background: COLORS.success + '22',
                                                            border: `1px solid ${COLORS.success}44`,
                                                            borderRadius: '4px',
                                                            color: COLORS.success,
                                                            fontSize: '11px',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        <Plus size={12} />
                                                        Add
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleRemoveItem(item)}
                                                        style={{
                                                            padding: '5px 10px',
                                                            background: COLORS.error + '22',
                                                            border: `1px solid ${COLORS.error}44`,
                                                            borderRadius: '4px',
                                                            color: COLORS.error,
                                                            fontSize: '11px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        <Minus size={12} />
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Sticky Footer */}
                        <div style={{
                            borderTop: `1px solid ${COLORS.border}`,
                            background: COLORS.bgLight,
                            flexShrink: 0
                        }}>
                            {/* Summary Bar */}
                            <div
                                style={{
                                    padding: '12px 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: pendingChanges.length > 0 ? 'pointer' : 'default'
                                }}
                                onClick={() => pendingChanges.length > 0 && setFooterExpanded(!footerExpanded)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {pendingChanges.length > 0 ? (
                                        <>
                                            <Package size={16} style={{ color: COLORS.accent }} />
                                            <span style={{ fontSize: '13px', color: COLORS.text, fontWeight: '500' }}>
                                                {pendingChanges.length} change{pendingChanges.length !== 1 ? 's' : ''}
                                            </span>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {addCount > 0 && (
                                                    <span style={{ fontSize: '11px', color: COLORS.success }}>+{addCount} added</span>
                                                )}
                                                {modifyCount > 0 && (
                                                    <span style={{ fontSize: '11px', color: COLORS.accent }}>~{modifyCount} modified</span>
                                                )}
                                                {removeCount > 0 && (
                                                    <span style={{ fontSize: '11px', color: COLORS.error }}>-{removeCount} removed</span>
                                                )}
                                            </div>
                                            {footerExpanded ? <ChevronDown size={14} style={{ color: COLORS.textMuted }} /> : <ChevronUp size={14} style={{ color: COLORS.textMuted }} />}
                                        </>
                                    ) : (
                                        <span style={{ fontSize: '13px', color: COLORS.textMuted }}>
                                            No pending changes
                                        </span>
                                    )}
                                </div>

                                {commitSuccess && prUrl && (
                                    <a
                                        href={prUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            color: COLORS.accent,
                                            fontSize: '12px',
                                            textDecoration: 'none'
                                        }}
                                    >
                                        <ExternalLink size={12} />
                                        View PR
                                    </a>
                                )}
                            </div>

                            {/* Expanded Details */}
                            {footerExpanded && pendingChanges.length > 0 && (
                                <div style={{ padding: '0 20px 12px', maxHeight: '150px', overflow: 'auto' }}>
                                    {pendingChanges.map(change => (
                                        <div
                                            key={change.material}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '6px 0',
                                                borderBottom: `1px solid ${COLORS.border}`
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {change.type === 'add' && <Plus size={12} style={{ color: COLORS.success }} />}
                                                {change.type === 'modify' && <RefreshCw size={12} style={{ color: COLORS.accent }} />}
                                                {change.type === 'remove' && <Minus size={12} style={{ color: COLORS.error }} />}
                                                <img
                                                    src={`${IMAGE_BASE_URL}/${change.material.toLowerCase()}.png`}
                                                    alt=""
                                                    style={{
                                                        width: '16px',
                                                        height: '16px',
                                                        imageRendering: 'pixelated',
                                                        opacity: change.type === 'remove' ? 0.4 : 1
                                                    }}
                                                    onError={(e) => { e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                                                />
                                                <span style={{
                                                    fontSize: '12px',
                                                    color: change.type === 'remove' ? COLORS.textMuted : COLORS.text,
                                                    textDecoration: change.type === 'remove' ? 'line-through' : 'none'
                                                }}>
                                                    {change.displayName || change.material}
                                                </span>
                                                {change.type !== 'remove' && (
                                                    <>
                                                        {change.type === 'modify' && (
                                                            <span style={{ fontSize: '10px', color: COLORS.textMuted }}>{change.oldState} →</span>
                                                        )}
                                                        <span style={{ fontSize: '10px', color: COLORS[change.state.toLowerCase()], fontWeight: '600' }}>
                                                            {change.state}
                                                        </span>
                                                        {change.tags.length > 0 && (
                                                            <span style={{ fontSize: '10px', color: COLORS.textMuted }}>
                                                                ({change.tags.join(', ')})
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleUndoChange(change.material)}
                                                style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: '2px' }}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={handleClearChanges}
                                        style={{
                                            marginTop: '8px',
                                            padding: '4px 8px',
                                            background: 'transparent',
                                            border: 'none',
                                            color: COLORS.textMuted,
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <Trash2 size={10} />
                                        Clear all
                                    </button>
                                </div>
                            )}

                            {/* Commit Section */}
                            {pendingChanges.length > 0 && (
                                <div style={{ padding: '12px 20px', borderTop: `1px solid ${COLORS.border}` }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                                        <div style={{ flex: 1 }}>
                                            <input
                                                type="text"
                                                placeholder="Commit message..."
                                                value={commitMessage}
                                                onChange={e => setCommitMessage(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && canCommit && handleCommit()}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    background: COLORS.bgLighter,
                                                    border: `1px solid ${COLORS.border}`,
                                                    borderRadius: '6px',
                                                    color: COLORS.text,
                                                    fontSize: '13px',
                                                    outline: 'none',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '11px', color: COLORS.textMuted, cursor: 'pointer' }}>
                                                <input type="checkbox" checked={createPR} onChange={e => setCreatePR(e.target.checked)} />
                                                <GitPullRequest size={12} />
                                                Create PR to main
                                            </label>
                                        </div>
                                        <button
                                            onClick={handleCommit}
                                            disabled={!canCommit || committing}
                                            style={{
                                                padding: '10px 20px',
                                                background: canCommit && !committing ? COLORS.accent : COLORS.bgLighter,
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: '#fff',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                cursor: canCommit && !committing ? 'pointer' : 'not-allowed',
                                                opacity: canCommit && !committing ? 1 : 0.6,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {committing && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                                            {committing ? 'Committing...' : 'Commit & Push'}
                                        </button>
                                    </div>
                                    {error && (
                                        <div style={{ marginTop: '10px', padding: '8px 10px', background: COLORS.error + '22', borderRadius: '4px', color: COLORS.error, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <AlertTriangle size={12} /> {error}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}