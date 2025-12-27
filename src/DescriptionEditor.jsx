import React, { useState, useCallback, useEffect } from 'react';

// Minecraft color codes mapping
const MC_COLORS = {
    '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA',
    '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
    '8': '#555555', '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF',
    'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55', 'f': '#FFFFFF'
};

const COLOR_NAMES = {
    '0': 'Black', '1': 'Dark Blue', '2': 'Dark Green', '3': 'Dark Aqua',
    '4': 'Dark Red', '5': 'Dark Purple', '6': 'Gold', '7': 'Gray',
    '8': 'Dark Gray', '9': 'Blue', 'a': 'Green', 'b': 'Aqua',
    'c': 'Red', 'd': 'Light Purple', 'e': 'Yellow', 'f': 'White'
};

const FORMAT_CODES = {
    'l': { name: 'Bold', style: 'fontWeight: 700' },
    'o': { name: 'Italic', style: 'fontStyle: italic' },
    'n': { name: 'Underline', style: 'textDecoration: underline' },
    'm': { name: 'Strikethrough', style: 'textDecoration: line-through' },
    'r': { name: 'Reset', style: '' }
};

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
    // State colors for reference panel
    early: '#55FF55',
    mid: '#FFFF55',
    late: '#FF5555',
    nether: '#AA0000',
    end: '#AA00AA',
    extreme: '#FF55FF',
    description: '#55FFFF'
};

// Common field templates based on config.yml patterns
const FIELD_TEMPLATES = [
    {
        name: 'Structure',
        template: '&7Structure: &a',
        placeholder: 'Village, Desert Pyramid...'
    },
    {
        name: 'Biomes',
        template: '&7Biomes: &a',
        placeholder: 'Desert, Plains...'
    },
    {
        name: 'Tool',
        template: '&7Tool: &a',
        placeholder: 'Pickaxe, any (Silk Touch required)...'
    },
    {
        name: 'Chance',
        template: '&7Chance: &a',
        placeholder: '25%, 6.7%...'
    },
    {
        name: 'Mob Drop',
        template: '&7Mob-Drop: &a',
        placeholder: 'Zombie, Ender Dragon...'
    },
    {
        name: 'Trading',
        template: '&7Trading: &a',
        placeholder: 'Armorer - Level 2 (Apprentice)...'
    },
    {
        name: 'Workstation',
        template: '&7Workstation: &a',
        placeholder: 'Blast Furnace, Brewing Stand...'
    },
    {
        name: 'Characteristics',
        template: '&7Characteristics: &a',
        placeholder: 'pink, blue...'
    },
    {
        name: 'Empty Line',
        template: '&7',
        placeholder: null
    },
    {
        name: 'Custom Text',
        template: '&7',
        placeholder: 'Custom description text...'
    }
];

// GitHub API configuration
const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'btlmt-de';
const REPO_NAME = 'FIB';
const FILE_PATH = 'config.yml';
const DEFAULT_BRANCH = 'main';

// Optional: Allowlist of GitHub usernames that can edit (leave empty to allow anyone with repo write access)
// If empty, GitHub's own permission system handles access control
const ALLOWED_USERS = []; // e.g., ['username1', 'username2']

// Draft auto-save key prefix
const DRAFT_KEY_PREFIX = 'fib_draft_';

// Draft storage functions
function getDraftKey(material) {
    return `${DRAFT_KEY_PREFIX}${material}`;
}

function getStoredDraft(material) {
    try {
        const draft = localStorage.getItem(getDraftKey(material));
        if (draft) {
            const { lines, timestamp } = JSON.parse(draft);
            return { lines, timestamp };
        }
    } catch (e) {
        console.error('Draft read error:', e);
    }
    return null;
}

function storeDraft(material, lines) {
    try {
        localStorage.setItem(getDraftKey(material), JSON.stringify({
            lines,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.error('Draft write error:', e);
    }
}

function clearDraft(material) {
    try {
        localStorage.removeItem(getDraftKey(material));
    } catch (e) {
        console.error('Draft clear error:', e);
    }
}

// Parse Minecraft formatting codes into styled spans
function parseMinecraftFormatting(text) {
    if (!text) return null;

    const parts = [];
    let currentColor = COLORS.text;
    let isBold = false;
    let isItalic = false;
    let isUnderline = false;
    let isStrike = false;
    let currentText = '';

    let i = 0;
    while (i < text.length) {
        if (text[i] === '&' && i + 1 < text.length) {
            if (currentText) {
                parts.push({ text: currentText, color: currentColor, bold: isBold, italic: isItalic, underline: isUnderline, strike: isStrike });
                currentText = '';
            }

            const code = text[i + 1].toLowerCase();
            if (MC_COLORS[code]) {
                currentColor = MC_COLORS[code];
            } else if (code === 'l') {
                isBold = true;
            } else if (code === 'o') {
                isItalic = true;
            } else if (code === 'n') {
                isUnderline = true;
            } else if (code === 'm') {
                isStrike = true;
            } else if (code === 'r') {
                currentColor = COLORS.text;
                isBold = false;
                isItalic = false;
                isUnderline = false;
                isStrike = false;
            }
            i += 2;
        } else {
            currentText += text[i];
            i++;
        }
    }

    if (currentText) {
        parts.push({ text: currentText, color: currentColor, bold: isBold, italic: isItalic, underline: isUnderline, strike: isStrike });
    }

    return parts;
}

function FormattedLine({ text }) {
    const parts = parseMinecraftFormatting(text);
    if (!parts || parts.length === 0) return <span style={{ minHeight: '20px', display: 'inline-block' }}>&nbsp;</span>;

    return (
        <>
            {parts.map((part, idx) => (
                <span
                    key={idx}
                    style={{
                        color: part.color,
                        fontWeight: part.bold ? '700' : '400',
                        fontStyle: part.italic ? 'italic' : 'normal',
                        textDecoration: [
                            part.underline ? 'underline' : '',
                            part.strike ? 'line-through' : ''
                        ].filter(Boolean).join(' ') || 'none'
                    }}
                >
                    {part.text}
                </span>
            ))}
        </>
    );
}

// GitHub API helper functions
async function getAuthenticatedUser(token) {
    const response = await fetch(`${GITHUB_API}/user`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!response.ok) {
        throw new Error('Invalid token or authentication failed');
    }

    return response.json();
}

async function checkRepoAccess(token) {
    const response = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!response.ok) {
        throw new Error('Cannot access repository');
    }

    const repo = await response.json();
    // Check if user has push permission
    return repo.permissions?.push === true;
}

async function fetchBranches(token) {
    const response = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/branches?per_page=100`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!response.ok) {
        console.error('Failed to fetch branches');
        return [DEFAULT_BRANCH];
    }

    const branches = await response.json();
    return branches.map(b => b.name);
}

async function getFileContent(token, branch) {
    const response = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${branch}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch file');
    }

    return response.json();
}

async function updateFile(token, content, sha, message, branch) {
    const response = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message,
            content: btoa(unescape(encodeURIComponent(content))),
            sha,
            branch
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update file');
    }

    return response.json();
}

// Token storage
const TOKEN_KEY = 'fib_github_token';
const USER_KEY = 'fib_github_user';
const BRANCH_KEY = 'fib_github_branch';

function getStoredToken() {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
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

function getStoredBranch() {
    try {
        return localStorage.getItem(BRANCH_KEY) || DEFAULT_BRANCH;
    } catch {
        return DEFAULT_BRANCH;
    }
}

function storeAuth(token, user) {
    try {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        }
    } catch {
        // Ignore storage errors
    }
}

function storeBranch(branch) {
    try {
        localStorage.setItem(BRANCH_KEY, branch);
    } catch {
        // Ignore storage errors
    }
}

// Generate default header for an item
function generateDefaultHeader(displayName) {
    return `&b&l${displayName} &7| &6Item Information`;
}

// Color picker button component
function ColorButton({ code, onClick }) {
    return (
        <button
            onClick={() => onClick(`&${code}`)}
            title={COLOR_NAMES[code]}
            style={{
                width: '24px',
                height: '24px',
                background: MC_COLORS[code],
                border: code === '0' ? '1px solid #444' : 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'transform 0.1s'
            }}
            onMouseEnter={e => e.target.style.transform = 'scale(1.15)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
        />
    );
}

function FormatButton({ code, name, onClick }) {
    return (
        <button
            onClick={() => onClick(`&${code}`)}
            style={{
                padding: '4px 10px',
                background: COLORS.bgLighter,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '3px',
                color: COLORS.text,
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: code === 'l' ? '700' : '400',
                fontStyle: code === 'o' ? 'italic' : 'normal',
                textDecoration: code === 'n' ? 'underline' : code === 'm' ? 'line-through' : 'none'
            }}
        >
            {name}
        </button>
    );
}

function TemplateButton({ template, onClick }) {
    return (
        <button
            onClick={() => onClick(template)}
            style={{
                padding: '6px 10px',
                background: COLORS.bgLight,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                color: COLORS.text,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s'
            }}
            onMouseEnter={e => {
                e.currentTarget.style.borderColor = COLORS.accent;
                e.currentTarget.style.background = COLORS.bgLighter;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = COLORS.border;
                e.currentTarget.style.background = COLORS.bgLight;
            }}
        >
            <span>{template.name}</span>
        </button>
    );
}

export default function DescriptionEditor({ item, allItems = [], onClose, onSave }) {
    // Check for existing draft
    const existingDraft = getStoredDraft(item.material);

    // Initialize with draft, existing description, or default template
    const getInitialLines = () => {
        // Check for saved draft first
        if (existingDraft) {
            return [...existingDraft.lines];
        }
        if (item.description && item.description.length > 0) {
            return [...item.description];
        }
        // Default template for new descriptions
        return [
            generateDefaultHeader(item.displayName),
            '&7',  // Empty line
        ];
    };

    const [lines, setLines] = useState(getInitialLines);
    const [githubToken, setGithubToken] = useState(getStoredToken() || '');
    const [githubUser, setGithubUser] = useState(getStoredUser());
    const [showTokenInput, setShowTokenInput] = useState(!getStoredToken());
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);
    const [activeLineIndex, setActiveLineIndex] = useState(lines.length - 1);
    const [verifyingToken, setVerifyingToken] = useState(false);
    const [hasAccess, setHasAccess] = useState(null);
    const [branches, setBranches] = useState([DEFAULT_BRANCH]);
    const [selectedBranch, setSelectedBranch] = useState(getStoredBranch());
    const [hasDraft, setHasDraft] = useState(!!existingDraft);
    const [draftTimestamp, setDraftTimestamp] = useState(existingDraft?.timestamp || null);

    // Reference panel state
    const [showReference, setShowReference] = useState(false);
    const [referenceSearch, setReferenceSearch] = useState('');
    const [selectedReference, setSelectedReference] = useState(null);

    // Filter items for reference search (only items with descriptions, excluding current item)
    const referenceItems = allItems.filter(i =>
        i.material !== item.material &&
        i.description &&
        i.description.length > 0 &&
        (referenceSearch === '' ||
            i.displayName.toLowerCase().includes(referenceSearch.toLowerCase()) ||
            i.material.toLowerCase().includes(referenceSearch.toLowerCase()))
    ).slice(0, 20); // Limit to 20 results

    // Check if item has an existing description (not just default template)
    const hasExistingDescription = item.description && item.description.length > 0;

    // Auto-save draft when lines change (debounced)
    useEffect(() => {
        // Don't save if lines match the original description exactly
        const originalLines = item.description || [];
        const linesMatch = lines.length === originalLines.length &&
            lines.every((line, i) => line === originalLines[i]);

        if (linesMatch) {
            // Clear draft if we're back to original
            clearDraft(item.material);
            setHasDraft(false);
            return;
        }

        // Debounce the save
        const timeoutId = setTimeout(() => {
            storeDraft(item.material, lines);
            setHasDraft(true);
            setDraftTimestamp(Date.now());
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [lines, item.material, item.description]);

    // Verify token on mount if we have one stored
    useEffect(() => {
        if (githubToken && !githubUser) {
            verifyToken(githubToken);
        } else if (githubUser) {
            setHasAccess(true);
            // Fetch branches if we have a stored user
            fetchBranches(githubToken).then(b => setBranches(b));
        }

        // Show notification if draft was restored
        if (existingDraft) {
            setSaveStatus({
                type: 'info',
                message: `📝 Draft restored from ${new Date(existingDraft.timestamp).toLocaleString()}`
            });
            // Auto-clear after 3 seconds
            setTimeout(() => setSaveStatus(null), 3000);
        }
    }, []);

    // Store selected branch when it changes
    useEffect(() => {
        storeBranch(selectedBranch);
    }, [selectedBranch]);

    const verifyToken = async (token) => {
        setVerifyingToken(true);
        setSaveStatus({ type: 'info', message: 'Verifying GitHub access...' });

        try {
            // Get user info
            const user = await getAuthenticatedUser(token);

            // Check allowlist if configured
            if (ALLOWED_USERS.length > 0 && !ALLOWED_USERS.includes(user.login)) {
                throw new Error(`User @${user.login} is not in the allowed editors list`);
            }

            // Check repo write access
            const canPush = await checkRepoAccess(token);
            if (!canPush) {
                throw new Error(`User @${user.login} does not have write access to ${REPO_OWNER}/${REPO_NAME}`);
            }

            // Fetch available branches
            const branchList = await fetchBranches(token);
            setBranches(branchList);

            setGithubUser(user);
            setHasAccess(true);
            storeAuth(token, user);
            setShowTokenInput(false);
            setSaveStatus({ type: 'success', message: `Authenticated as @${user.login}` });
            setTimeout(() => setSaveStatus(null), 3000);

        } catch (error) {
            setHasAccess(false);
            storeAuth(null, null);
            setSaveStatus({ type: 'error', message: error.message });
        } finally {
            setVerifyingToken(false);
        }
    };

    const insertCode = useCallback((code) => {
        const textarea = document.getElementById(`line-editor-${activeLineIndex}`);
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentLine = lines[activeLineIndex] || '';
        const newLine = currentLine.slice(0, start) + code + currentLine.slice(end);

        const newLines = [...lines];
        newLines[activeLineIndex] = newLine;
        setLines(newLines);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + code.length, start + code.length);
        }, 0);
    }, [lines, activeLineIndex]);

    const updateLine = (index, value) => {
        const newLines = [...lines];
        newLines[index] = value;
        setLines(newLines);
    };

    const addLine = (template = null) => {
        const newLine = template ? template.template : '';
        setLines([...lines, newLine]);
        setActiveLineIndex(lines.length);

        // Focus the new input after render
        setTimeout(() => {
            const input = document.getElementById(`line-editor-${lines.length}`);
            if (input) {
                input.focus();
                // Position cursor at end of template
                input.setSelectionRange(newLine.length, newLine.length);
            }
        }, 50);
    };

    const removeLine = (index) => {
        if (lines.length <= 1) return;
        const newLines = lines.filter((_, i) => i !== index);
        setLines(newLines);
        if (activeLineIndex >= newLines.length) {
            setActiveLineIndex(Math.max(0, newLines.length - 1));
        }
    };

    const moveLine = (index, direction) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= lines.length) return;

        const newLines = [...lines];
        [newLines[index], newLines[newIndex]] = [newLines[newIndex], newLines[index]];
        setLines(newLines);
        setActiveLineIndex(newIndex);
    };

    const handleSave = async () => {
        if (!githubToken || !hasAccess) {
            setShowTokenInput(true);
            setSaveStatus({ type: 'error', message: 'Please authenticate with GitHub first' });
            return;
        }

        // Filter out completely empty lines at the end, but keep &7 spacers
        const cleanedLines = [...lines];
        while (cleanedLines.length > 1 && cleanedLines[cleanedLines.length - 1] === '') {
            cleanedLines.pop();
        }

        setSaving(true);
        setSaveStatus({ type: 'info', message: `Fetching current config from ${selectedBranch}...` });

        try {
            const fileData = await getFileContent(githubToken, selectedBranch);
            const currentContent = decodeURIComponent(escape(atob(fileData.content)));

            setSaveStatus({ type: 'info', message: 'Updating description...' });
            const newContent = updateDescriptionInConfig(currentContent, item.material, cleanedLines);

            setSaveStatus({ type: 'info', message: `Pushing to ${selectedBranch}...` });
            await updateFile(
                githubToken,
                newContent,
                fileData.sha,
                `Update description for ${item.material}`,
                selectedBranch
            );

            setSaveStatus({ type: 'success', message: `Successfully saved to ${selectedBranch}!` });

            // Clear draft since we've saved successfully
            clearDraft(item.material);
            setHasDraft(false);

            // Invalidate cache - clear both old and new cache keys and set edit timestamp
            try {
                localStorage.removeItem('forceitem_pools_cache_v2');
                localStorage.removeItem('forceitem_pools_cache_v3');
                localStorage.setItem('forceitem_last_edit', Date.now().toString());
            } catch {}

            setTimeout(() => {
                onSave && onSave(item.material, cleanedLines);
                onClose();
            }, 1500);

        } catch (error) {
            console.error('Save error:', error);
            setSaveStatus({ type: 'error', message: `Error: ${error.message}` });
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        storeAuth(null, null);
        setGithubToken('');
        setGithubUser(null);
        setHasAccess(null);
        setShowTokenInput(true);
        setSaveStatus(null);
    };

    const handleDiscardDraft = () => {
        clearDraft(item.material);
        setHasDraft(false);
        // Reset to original description or default template
        if (item.description && item.description.length > 0) {
            setLines([...item.description]);
        } else {
            setLines([
                generateDefaultHeader(item.displayName),
                '&7',
            ]);
        }
        setSaveStatus({ type: 'info', message: 'Draft discarded' });
        setTimeout(() => setSaveStatus(null), 2000);
    };

    const handleDelete = async () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            setSaveStatus({ type: 'warning', message: 'Click "Delete" again to confirm deletion' });
            return;
        }

        if (!githubToken || !hasAccess) {
            setShowTokenInput(true);
            setSaveStatus({ type: 'error', message: 'Please authenticate with GitHub first' });
            return;
        }

        setDeleting(true);
        setSaveStatus({ type: 'info', message: `Fetching current config from ${selectedBranch}...` });

        try {
            const fileData = await getFileContent(githubToken, selectedBranch);
            const currentContent = decodeURIComponent(escape(atob(fileData.content)));

            setSaveStatus({ type: 'info', message: 'Removing description...' });
            const newContent = deleteDescriptionFromConfig(currentContent, item.material);

            setSaveStatus({ type: 'info', message: `Pushing to ${selectedBranch}...` });
            await updateFile(
                githubToken,
                newContent,
                fileData.sha,
                `Delete description for ${item.material}`,
                selectedBranch
            );

            setSaveStatus({ type: 'success', message: `Description deleted from ${selectedBranch}!` });

            // Clear draft since we've deleted successfully
            clearDraft(item.material);
            setHasDraft(false);

            // Invalidate cache
            try {
                localStorage.removeItem('forceitem_pools_cache_v2');
                localStorage.removeItem('forceitem_pools_cache_v3');
                localStorage.setItem('forceitem_last_edit', Date.now().toString());
            } catch {}

            setTimeout(() => {
                onSave && onSave(item.material, null);
                onClose();
            }, 1500);

        } catch (error) {
            console.error('Delete error:', error);
            setSaveStatus({ type: 'error', message: `Error: ${error.message}` });
        } finally {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    // Delete description from config.yml
    function deleteDescriptionFromConfig(content, materialName) {
        const configLines = content.split('\n');
        const result = [];
        let inDescriptions = false;
        let inTargetItem = false;

        for (let i = 0; i < configLines.length; i++) {
            const line = configLines[i];

            if (line.trim() === 'descriptions:') {
                inDescriptions = true;
                result.push(line);
                continue;
            }

            if (inDescriptions) {
                // Check if we've exited the descriptions section
                if (line.match(/^[a-zA-Z]/) && !line.startsWith(' ')) {
                    inDescriptions = false;
                    inTargetItem = false;
                    result.push(line);
                    continue;
                }

                // Check for item name
                const itemMatch = line.match(/^\s{2}([A-Z_0-9]+):\s*$/);
                if (itemMatch) {
                    if (itemMatch[1] === materialName) {
                        // This is our target item - skip it entirely
                        inTargetItem = true;
                        continue;
                    } else {
                        inTargetItem = false;
                        result.push(line);
                        continue;
                    }
                }

                // Skip all lines belonging to target item
                if (inTargetItem) {
                    continue;
                }

                // Skip empty lines in descriptions section
                if (line.trim() === '' || line.match(/^\s+$/)) {
                    continue;
                }

                result.push(line);
            } else {
                result.push(line);
            }
        }

        return result.join('\n');
    }

    // Update description in config.yml content with proper YAML formatting
    function updateDescriptionInConfig(content, materialName, descriptionLines) {
        const configLines = content.split('\n');
        const result = [];
        let inDescriptions = false;
        let inTargetItem = false;
        let targetFound = false;

        for (let i = 0; i < configLines.length; i++) {
            const line = configLines[i];

            if (line.trim() === 'descriptions:') {
                inDescriptions = true;
                result.push(line);
                continue;
            }

            if (inDescriptions) {
                // Check if we've exited the descriptions section (new top-level key)
                if (line.match(/^[a-zA-Z]/) && !line.startsWith(' ')) {
                    // If we were in target item, we're done with it
                    if (inTargetItem) {
                        inTargetItem = false;
                    }
                    // Add new item at end if not found yet
                    if (!targetFound) {
                        result.push(`  ${materialName}:`);
                        descriptionLines.forEach(descLine => {
                            result.push(`    - "${descLine}"`);
                        });
                        targetFound = true;
                    }
                    inDescriptions = false;
                    result.push(line);
                    continue;
                }

                // Check for item name (e.g., "  ITEM_NAME:")
                const itemMatch = line.match(/^\s{2}([A-Z_0-9]+):\s*$/);
                if (itemMatch) {
                    // If we were in target item, we're now leaving it
                    if (inTargetItem) {
                        inTargetItem = false;
                    }

                    if (itemMatch[1] === materialName) {
                        // This is our target item - replace it
                        result.push(`  ${materialName}:`);
                        descriptionLines.forEach(descLine => {
                            result.push(`    - "${descLine}"`);
                        });
                        inTargetItem = true;
                        targetFound = true;
                        continue;
                    } else {
                        // Different item - keep it
                        result.push(line);
                        continue;
                    }
                }

                // Check for description line (e.g., '    - "text"')
                if (line.match(/^\s{4}-\s*"/)) {
                    if (inTargetItem) {
                        // Skip description lines of target item (we already added new ones)
                        continue;
                    } else {
                        // Keep description lines of other items
                        result.push(line);
                        continue;
                    }
                }

                // Handle empty lines or other content within descriptions section
                if (line.trim() === '' || line.match(/^\s+$/)) {
                    if (inTargetItem) {
                        // Skip empty lines that were part of target item
                        continue;
                    }
                    // Skip empty lines in descriptions section entirely to keep it clean
                    continue;
                }

                // Any other indented content - keep it unless we're in target item
                if (!inTargetItem) {
                    result.push(line);
                }
            } else {
                result.push(line);
            }
        }

        // Handle case where descriptions section ends at EOF
        if (inDescriptions && !targetFound) {
            result.push(`  ${materialName}:`);
            descriptionLines.forEach(descLine => {
                result.push(`    - "${descLine}"`);
            });
        }

        return result.join('\n');
    }

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
                maxWidth: showReference ? '1400px' : '1000px',
                maxHeight: '90vh',
                overflow: 'auto',
                border: `1px solid ${COLORS.border}`,
                transition: 'max-width 0.2s ease'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    background: COLORS.bg,
                    zIndex: 10
                }}>
                    <div>
                        <h2 style={{ margin: 0, color: COLORS.text, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            Edit Description: {item.displayName}
                            <a
                                href={`https://minecraft.wiki/w/${item.displayName.replace(/ /g, '_')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open Minecraft Wiki"
                                style={{
                                    color: COLORS.textMuted,
                                    fontSize: '14px',
                                    textDecoration: 'none',
                                    padding: '4px 8px',
                                    background: COLORS.bgLighter,
                                    borderRadius: '4px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = COLORS.accent;
                                    e.currentTarget.style.color = '#fff';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = COLORS.bgLighter;
                                    e.currentTarget.style.color = COLORS.textMuted;
                                }}
                            >
                                📖 Wiki
                            </a>
                        </h2>
                        <div style={{ color: COLORS.textMuted, fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {item.material}
                            {hasDraft && (
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '2px 8px',
                                    background: '#FFAA0022',
                                    border: '1px solid #FFAA0044',
                                    borderRadius: '4px',
                                    color: '#FFAA00',
                                    fontSize: '11px'
                                }}>
                                    💾 Draft saved {draftTimestamp && `• ${new Date(draftTimestamp).toLocaleTimeString()}`}
                                    <button
                                        onClick={handleDiscardDraft}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#FF5555',
                                            cursor: 'pointer',
                                            padding: '0 2px',
                                            fontSize: '11px',
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        Discard
                                    </button>
                                </span>
                            )}
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

                <div style={{ padding: '20px 24px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    {/* Editor Panel */}
                    <div style={{ flex: '1 1 450px', minWidth: '300px' }}>
                        {/* Formatting Tools */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '11px', color: COLORS.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Colors & Formatting
                            </div>

                            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                {Object.keys(MC_COLORS).map(code => (
                                    <ColorButton key={code} code={code} onClick={insertCode} />
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {Object.entries(FORMAT_CODES).map(([code, { name }]) => (
                                    <FormatButton key={code} code={code} name={name} onClick={insertCode} />
                                ))}
                            </div>
                        </div>

                        {/* Field Templates */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '11px', color: COLORS.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Add Field
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {FIELD_TEMPLATES.map((template, idx) => (
                                    <TemplateButton
                                        key={idx}
                                        template={template}
                                        onClick={() => addLine(template)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Reference toggle button */}
                        <div style={{ marginBottom: '16px' }}>
                            <button
                                onClick={() => setShowReference(!showReference)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: showReference ? COLORS.accent + '22' : 'transparent',
                                    border: `1px solid ${showReference ? COLORS.accent : COLORS.border}`,
                                    borderRadius: '4px',
                                    color: showReference ? COLORS.accent : COLORS.textMuted,
                                    fontSize: '11px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <span>📋</span>
                                <span>{showReference ? 'Hide Reference Panel' : 'Show Reference Panel'}</span>
                            </button>
                        </div>

                        <div style={{ fontSize: '11px', color: COLORS.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Description Lines
                        </div>

                        {/* Line editors */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {lines.map((line, index) => (
                                <div key={index} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <div style={{
                                        color: COLORS.textMuted,
                                        fontSize: '11px',
                                        width: '18px',
                                        textAlign: 'right',
                                        fontFamily: 'monospace'
                                    }}>
                                        {index + 1}
                                    </div>
                                    <div style={{
                                        color: COLORS.accent,
                                        fontSize: '12px',
                                        fontFamily: 'monospace',
                                        opacity: 0.6
                                    }}>
                                        -
                                    </div>
                                    <input
                                        id={`line-editor-${index}`}
                                        type="text"
                                        value={line}
                                        onChange={e => updateLine(index, e.target.value)}
                                        onFocus={() => setActiveLineIndex(index)}
                                        placeholder={index === 0 ? "Header line..." : "Description line..."}
                                        style={{
                                            flex: 1,
                                            padding: '8px 10px',
                                            background: activeLineIndex === index ? COLORS.bgLighter : COLORS.bgLight,
                                            border: `1px solid ${activeLineIndex === index ? COLORS.accent : COLORS.border}`,
                                            borderRadius: '4px',
                                            color: COLORS.text,
                                            fontSize: '12px',
                                            fontFamily: "'Courier New', monospace",
                                            outline: 'none'
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: '2px' }}>
                                        <button
                                            onClick={() => moveLine(index, -1)}
                                            disabled={index === 0}
                                            title="Move up"
                                            style={{
                                                padding: '4px 6px',
                                                background: COLORS.bgLight,
                                                border: `1px solid ${COLORS.border}`,
                                                borderRadius: '3px',
                                                color: index === 0 ? COLORS.textMuted : COLORS.text,
                                                cursor: index === 0 ? 'not-allowed' : 'pointer',
                                                opacity: index === 0 ? 0.4 : 1,
                                                fontSize: '11px'
                                            }}
                                        >
                                            ↑
                                        </button>
                                        <button
                                            onClick={() => moveLine(index, 1)}
                                            disabled={index === lines.length - 1}
                                            title="Move down"
                                            style={{
                                                padding: '4px 6px',
                                                background: COLORS.bgLight,
                                                border: `1px solid ${COLORS.border}`,
                                                borderRadius: '3px',
                                                color: index === lines.length - 1 ? COLORS.textMuted : COLORS.text,
                                                cursor: index === lines.length - 1 ? 'not-allowed' : 'pointer',
                                                opacity: index === lines.length - 1 ? 0.4 : 1,
                                                fontSize: '11px'
                                            }}
                                        >
                                            ↓
                                        </button>
                                        <button
                                            onClick={() => removeLine(index)}
                                            disabled={lines.length <= 1}
                                            title="Delete line"
                                            style={{
                                                padding: '4px 8px',
                                                background: lines.length <= 1 ? COLORS.bgLight : '#AA000022',
                                                border: `1px solid ${lines.length <= 1 ? COLORS.border : '#AA000066'}`,
                                                borderRadius: '3px',
                                                color: lines.length <= 1 ? COLORS.textMuted : '#FF5555',
                                                cursor: lines.length <= 1 ? 'not-allowed' : 'pointer',
                                                opacity: lines.length <= 1 ? 0.4 : 1,
                                                fontSize: '11px'
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => addLine()}
                            style={{
                                marginTop: '10px',
                                padding: '8px 14px',
                                background: COLORS.bgLight,
                                border: `1px dashed ${COLORS.border}`,
                                borderRadius: '4px',
                                color: COLORS.textMuted,
                                fontSize: '12px',
                                cursor: 'pointer',
                                width: '100%',
                                transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => {
                                e.target.style.borderColor = COLORS.accent;
                                e.target.style.color = COLORS.text;
                            }}
                            onMouseLeave={e => {
                                e.target.style.borderColor = COLORS.border;
                                e.target.style.color = COLORS.textMuted;
                            }}
                        >
                            + Add Empty Line
                        </button>
                    </div>

                    {/* Preview Panel */}
                    <div style={{ flex: '1 1 280px', minWidth: '260px' }}>
                        <div style={{ fontSize: '11px', color: COLORS.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Preview
                        </div>
                        <div style={{
                            background: '#100010',
                            border: '2px solid #2d0a3e',
                            borderRadius: '4px',
                            padding: '12px 14px',
                            fontFamily: "'Courier New', monospace",
                            fontSize: '13px',
                            lineHeight: '1.5',
                            minHeight: '200px',
                            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)'
                        }}>
                            {lines.length === 0 || (lines.length === 1 && !lines[0]) ? (
                                <div style={{ color: COLORS.textMuted, fontStyle: 'italic' }}>
                                    Preview will appear here...
                                </div>
                            ) : (
                                lines.map((line, idx) => (
                                    <div key={idx} style={{ minHeight: '20px' }}>
                                        <FormattedLine text={line} />
                                    </div>
                                ))
                            )}
                        </div>

                        {/* YAML Preview */}
                        <div style={{ marginTop: '16px' }}>
                            <div style={{ fontSize: '11px', color: COLORS.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                YAML Output
                            </div>
                            <div style={{
                                background: COLORS.bgLight,
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: '4px',
                                padding: '10px 12px',
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                lineHeight: '1.4',
                                color: COLORS.textMuted,
                                maxHeight: '120px',
                                overflow: 'auto'
                            }}>
                                <div style={{ color: COLORS.accent }}>{item.material}:</div>
                                {lines.map((line, idx) => (
                                    <div key={idx} style={{ paddingLeft: '12px' }}>
                                        - "{line}"
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Reference */}
                        <div style={{ marginTop: '16px', fontSize: '10px', color: COLORS.textMuted }}>
                            <div style={{ marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Reference</div>
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px'}}>
                                <div>&amp;7 = <span style={{color: MC_COLORS['7']}}>Gray</span> (labels)</div>
                                <div>&amp;a = <span style={{color: MC_COLORS.a}}>Green</span> (values & high %)</div>
                                <div>&amp;6 = <span style={{color: MC_COLORS['6']}}>Gold</span> (mid %)</div>
                                <div>&amp;c = <span style={{color: MC_COLORS.c}}>Red</span> (low %)</div>
                                <div>&amp;b = <span style={{color: MC_COLORS.b}}>Aqua</span> (title)</div>
                                <div>&amp;r = Reset all</div>
                            </div>
                        </div>
                    </div>

                    {/* Reference Panel - Side by side */}
                    {showReference && (
                        <div style={{
                            flex: '1 1 300px',
                            minWidth: '280px',
                            maxWidth: '350px',
                            background: COLORS.bgLight,
                            borderRadius: '6px',
                            padding: '12px',
                            border: `1px solid ${COLORS.accent}44`,
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '10px'
                            }}>
                                <div style={{ fontSize: '11px', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    📋 Reference
                                </div>
                                <button
                                    onClick={() => setShowReference(false)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: COLORS.textMuted,
                                        cursor: 'pointer',
                                        fontSize: '16px',
                                        padding: '0 4px'
                                    }}
                                >
                                    ×
                                </button>
                            </div>

                            <input
                                type="text"
                                placeholder="Search items..."
                                value={referenceSearch}
                                onChange={e => {
                                    setReferenceSearch(e.target.value);
                                    setSelectedReference(null);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    background: COLORS.bg,
                                    border: `1px solid ${COLORS.border}`,
                                    borderRadius: '4px',
                                    color: COLORS.text,
                                    fontSize: '12px',
                                    marginBottom: '8px'
                                }}
                            />

                            {/* Item list */}
                            <div style={{
                                flex: selectedReference ? '0 0 auto' : '1',
                                maxHeight: selectedReference ? '120px' : '200px',
                                overflowY: 'auto',
                                marginBottom: '8px',
                                background: COLORS.bg,
                                borderRadius: '4px',
                                padding: '4px'
                            }}>
                                {referenceItems.length === 0 ? (
                                    <div style={{ color: COLORS.textMuted, fontSize: '11px', padding: '12px', textAlign: 'center' }}>
                                        {referenceSearch ? 'No matches' : 'Type to search'}
                                    </div>
                                ) : (
                                    referenceItems.map(refItem => (
                                        <div
                                            key={refItem.material}
                                            onClick={() => setSelectedReference(
                                                selectedReference?.material === refItem.material ? null : refItem
                                            )}
                                            style={{
                                                padding: '6px 8px',
                                                background: selectedReference?.material === refItem.material
                                                    ? COLORS.accent + '33'
                                                    : 'transparent',
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                fontSize: '11px',
                                                color: COLORS.text,
                                                transition: 'background 0.1s'
                                            }}
                                            onMouseEnter={e => {
                                                if (selectedReference?.material !== refItem.material) {
                                                    e.currentTarget.style.background = COLORS.bgLighter;
                                                }
                                            }}
                                            onMouseLeave={e => {
                                                if (selectedReference?.material !== refItem.material) {
                                                    e.currentTarget.style.background = 'transparent';
                                                }
                                            }}
                                        >
                                            <span>{refItem.displayName}</span>
                                            <span style={{
                                                color: COLORS[refItem.state.toLowerCase()] || COLORS.textMuted,
                                                fontSize: '9px',
                                                textTransform: 'uppercase'
                                            }}>
                                                {refItem.state}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Selected reference preview */}
                            {selectedReference && (
                                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                    <div style={{
                                        fontSize: '10px',
                                        color: COLORS.text,
                                        marginBottom: '6px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontWeight: '600'
                                    }}>
                                        <span>{selectedReference.displayName}</span>
                                        <span style={{ color: COLORS.description, fontWeight: '400' }}>
                                            {selectedReference.description.length} lines
                                        </span>
                                    </div>

                                    {/* Formatted preview */}
                                    <div style={{
                                        background: '#000',
                                        padding: '8px 10px',
                                        borderRadius: '3px',
                                        fontFamily: "'Minecraft', monospace",
                                        fontSize: '11px',
                                        flex: '1',
                                        overflowY: 'auto',
                                        marginBottom: '8px',
                                        minHeight: '80px'
                                    }}>
                                        {selectedReference.description.map((descLine, idx) => (
                                            <div key={idx} style={{ marginBottom: '2px' }}>
                                                <FormattedLine text={descLine} />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Raw codes */}
                                    <div style={{
                                        fontSize: '9px',
                                        color: COLORS.textMuted,
                                        fontFamily: 'monospace',
                                        background: COLORS.bg,
                                        padding: '6px 8px',
                                        borderRadius: '3px',
                                        maxHeight: '80px',
                                        overflowY: 'auto'
                                    }}>
                                        {selectedReference.description.map((descLine, idx) => (
                                            <div key={idx} style={{ marginBottom: '1px' }}>{descLine}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer - Auth & Actions */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: `1px solid ${COLORS.border}`,
                    background: COLORS.bgLight
                }}>
                    {/* GitHub Authentication */}
                    {showTokenInput ? (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '12px', color: COLORS.text, marginBottom: '8px', fontWeight: '500' }}>
                                GitHub Authentication Required
                            </div>
                            <div style={{ fontSize: '11px', color: COLORS.textMuted, marginBottom: '10px' }}>
                                You need write access to <code style={{ background: COLORS.bgLighter, padding: '2px 6px', borderRadius: '3px' }}>{REPO_OWNER}/{REPO_NAME}</code> to edit descriptions.
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="password"
                                    value={githubToken}
                                    onChange={e => setGithubToken(e.target.value)}
                                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                    style={{
                                        flex: 1,
                                        padding: '10px 12px',
                                        background: COLORS.bgLighter,
                                        border: `1px solid ${COLORS.border}`,
                                        borderRadius: '4px',
                                        color: COLORS.text,
                                        fontSize: '13px',
                                        fontFamily: 'monospace',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    onClick={() => verifyToken(githubToken)}
                                    disabled={!githubToken || verifyingToken}
                                    style={{
                                        padding: '10px 20px',
                                        background: verifyingToken ? COLORS.bgLighter : COLORS.accent,
                                        border: 'none',
                                        borderRadius: '4px',
                                        color: '#fff',
                                        fontSize: '13px',
                                        cursor: verifyingToken ? 'not-allowed' : 'pointer',
                                        opacity: !githubToken || verifyingToken ? 0.7 : 1
                                    }}
                                >
                                    {verifyingToken ? 'Verifying...' : 'Authenticate'}
                                </button>
                            </div>
                            <div style={{ fontSize: '11px', color: COLORS.textMuted, marginTop: '8px' }}>
                                <a
                                    href="https://github.com/settings/tokens/new?description=FIB%20Description%20Editor&scopes=repo"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: COLORS.accent }}
                                >
                                    Create a new token →
                                </a>
                                {' '}(requires <code style={{ background: COLORS.bgLighter, padding: '1px 4px', borderRadius: '2px' }}>repo</code> scope)
                            </div>
                        </div>
                    ) : githubUser && (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {githubUser.avatar_url && (
                                        <img
                                            src={githubUser.avatar_url}
                                            alt=""
                                            style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                                        />
                                    )}
                                    <div>
                                        <div style={{ color: COLORS.success, fontSize: '13px' }}>
                                            ✓ Authenticated as <strong>@{githubUser.login}</strong>
                                        </div>
                                        <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>
                                            Has write access to {REPO_OWNER}/{REPO_NAME}
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

                            {/* Branch Selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <label style={{ color: COLORS.textMuted, fontSize: '12px' }}>
                                    Push to branch:
                                </label>
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                    style={{
                                        padding: '6px 10px',
                                        background: COLORS.bgLighter,
                                        border: `1px solid ${COLORS.border}`,
                                        borderRadius: '4px',
                                        color: COLORS.text,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        outline: 'none',
                                        minWidth: '150px'
                                    }}
                                >
                                    {branches.map(branch => (
                                        <option key={branch} value={branch}>
                                            {branch}
                                        </option>
                                    ))}
                                </select>
                                {selectedBranch === DEFAULT_BRANCH && (
                                    <span style={{
                                        color: COLORS.warning,
                                        fontSize: '11px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        ⚠️ Pushing directly to {DEFAULT_BRANCH}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Status message */}
                    {saveStatus && (
                        <div style={{
                            padding: '10px 14px',
                            borderRadius: '4px',
                            marginBottom: '16px',
                            background: saveStatus.type === 'error' ? '#AA000033' :
                                saveStatus.type === 'success' ? '#00AA0033' :
                                    saveStatus.type === 'warning' ? '#AAAA0033' :
                                        COLORS.bgLighter,
                            color: saveStatus.type === 'error' ? COLORS.error :
                                saveStatus.type === 'success' ? COLORS.success :
                                    saveStatus.type === 'warning' ? COLORS.warning :
                                        COLORS.text,
                            fontSize: '13px'
                        }}>
                            {saveStatus.message}
                        </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
                        {/* Delete button - only show if item has existing description */}
                        <div>
                            {hasExistingDescription && (
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting || saving || !hasAccess}
                                    style={{
                                        padding: '12px 24px',
                                        background: confirmDelete ? '#AA0000' : 'transparent',
                                        border: `1px solid ${confirmDelete ? '#AA0000' : '#AA000066'}`,
                                        borderRadius: '6px',
                                        color: confirmDelete ? '#fff' : '#FF5555',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: deleting || saving || !hasAccess ? 'not-allowed' : 'pointer',
                                        opacity: deleting || saving || !hasAccess ? 0.6 : 1,
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    {deleting ? 'Deleting...' : confirmDelete ? 'Confirm Delete' : '🗑 Delete'}
                                </button>
                            )}
                        </div>

                        {/* Cancel and Save buttons */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '12px 24px',
                                    background: COLORS.bgLighter,
                                    border: `1px solid ${COLORS.border}`,
                                    borderRadius: '6px',
                                    color: COLORS.text,
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || deleting || !hasAccess}
                                style={{
                                    padding: '12px 24px',
                                    background: saving || deleting || !hasAccess ? COLORS.bgLighter : COLORS.accent,
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: saving || deleting || !hasAccess ? 'not-allowed' : 'pointer',
                                    opacity: saving || deleting || !hasAccess ? 0.6 : 1
                                }}
                            >
                                {saving ? 'Saving...' : 'Save to GitHub'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}