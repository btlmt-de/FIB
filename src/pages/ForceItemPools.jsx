import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Check from 'lucide-react/dist/esm/icons/check';
import Info from 'lucide-react/dist/esm/icons/info';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import History from 'lucide-react/dist/esm/icons/history';
import Heart from 'lucide-react/dist/esm/icons/heart';
import Filter from 'lucide-react/dist/esm/icons/filter';
import GitBranch from 'lucide-react/dist/esm/icons/git-branch';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Circle from 'lucide-react/dist/esm/icons/circle';
import Package from 'lucide-react/dist/esm/icons/package';
import PackageX from 'lucide-react/dist/esm/icons/package-x';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Eye from 'lucide-react/dist/esm/icons/eye';
import X from 'lucide-react/dist/esm/icons/x';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import SearchX from 'lucide-react/dist/esm/icons/search-x';
import DescriptionEditor from './DescriptionEditor.jsx';
import GitHistory from './GitHistory.jsx';
import ItemPoolManager from './ItemPoolManager.jsx';
import {
    COLORS,
    ToastProvider,
    useToast,
    SkeletonGrid,
    GlobalStyles,
    ViewModeToggle,
    AnimatedNumber,
    SearchInput,
    StateBadge,
    TagBadge,
    NoResultsEmpty,
    NoMissingItemsEmpty,
    FilterChip,
} from './UIComponents.jsx';

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/McPlayHDnet/ForceItemBattle/main/src/main/java/forceitembattle/manager/ItemDifficultiesManager.java';
const CONFIG_BASE_URL = 'https://raw.githubusercontent.com/btlmt-de/FIB';
const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib';
const BRANCHES_URL = 'https://api.github.com/repos/btlmt-de/FIB/branches';
const MISODE_ITEMS_URL = 'https://raw.githubusercontent.com/misode/mcmeta/refs/heads/registries/item/data.json';
const CACHE_KEY = 'forceitem_pools_cache_v4';
const MISODE_CACHE_KEY = 'forceitem_misode_cache_v1';
const MISODE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour (reduced from 24 hours)
const LAST_EDIT_KEY = 'forceitem_last_edit';
const BRANCH_KEY = 'fib_github_branch';
const VIEW_BRANCH_KEY = 'fib_view_branch';
const DEFAULT_BRANCH = 'main';

// Get the stored branch or default to main
function getStoredBranch() {
    try {
        return localStorage.getItem(BRANCH_KEY) || DEFAULT_BRANCH;
    } catch {
        return DEFAULT_BRANCH;
    }
}

// Get the stored view branch or default to main
function getStoredViewBranch() {
    try {
        return localStorage.getItem(VIEW_BRANCH_KEY) || DEFAULT_BRANCH;
    } catch {
        return DEFAULT_BRANCH;
    }
}

// Set the view branch
function setStoredViewBranch(branch) {
    try {
        localStorage.setItem(VIEW_BRANCH_KEY, branch);
    } catch {
        // Ignore storage errors
    }
}

// Get config URL for a specific branch
function getConfigUrl(branch) {
    return `${CONFIG_BASE_URL}/${branch}/config.yml`;
}

// Minecraft color codes mapping (for description text parsing)
const MC_COLORS = {
    '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA',
    '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
    '8': '#555555', '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF',
    'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55', 'f': '#FFFFFF'
};

// Parse Minecraft formatting codes into styled spans
function parseMinecraftFormatting(text) {
    if (!text) return null;

    const parts = [];
    let currentColor = COLORS.text;
    let isBold = false;
    let isItalic = false;
    let currentText = '';

    let i = 0;
    while (i < text.length) {
        if (text[i] === '&' && i + 1 < text.length) {
            // Push current text if any
            if (currentText) {
                parts.push({
                    text: currentText,
                    color: currentColor,
                    bold: isBold,
                    italic: isItalic
                });
                currentText = '';
            }

            const code = text[i + 1].toLowerCase();

            if (MC_COLORS[code]) {
                currentColor = MC_COLORS[code];
            } else if (code === 'l') {
                isBold = true;
            } else if (code === 'o') {
                isItalic = true;
            } else if (code === 'r') {
                currentColor = COLORS.text;
                isBold = false;
                isItalic = false;
            }
            // Skip &k (obfuscated), &m (strikethrough), &n (underline) for now

            i += 2;
        } else {
            currentText += text[i];
            i++;
        }
    }

    // Push remaining text
    if (currentText) {
        parts.push({
            text: currentText,
            color: currentColor,
            bold: isBold,
            italic: isItalic
        });
    }

    return parts;
}

// Render formatted text as React elements
function FormattedText({ text }) {
    const parts = parseMinecraftFormatting(text);
    if (!parts) return null;

    return (
        <>
            {parts.map((part, idx) => (
                <span
                    key={idx}
                    style={{
                        color: part.color,
                        fontWeight: part.bold ? '700' : '400',
                        fontStyle: part.italic ? 'italic' : 'normal'
                    }}
                >
          {part.text}
        </span>
            ))}
        </>
    );
}

// Strip all formatting for plain text
const STRIP_FORMATTING_REGEX = /&[0-9a-fklmnor]/gi;
function stripFormatting(text) {
    return text.replace(STRIP_FORMATTING_REGEX, '');
}

// Hoisted RegExp patterns for parseJavaFile
const REGISTER_REGEX = /register\(Material\.(\w+),\s*State\.(\w+)(?:,\s*ItemTag\.(\w+))?(?:,\s*ItemTag\.(\w+))?(?:,\s*ItemTag\.(\w+))?\)/g;
const UNDERSCORE_REGEX = /_/g;
const WORD_START_REGEX = /\b\w/g;

function parseJavaFile(content) {
    const items = [];

    // Reset lastIndex for global regex reuse
    REGISTER_REGEX.lastIndex = 0;

    let match;
    while ((match = REGISTER_REGEX.exec(content)) !== null) {
        const [, material, state, tag1, tag2, tag3] = match;
        const tags = [tag1, tag2, tag3].filter(Boolean);
        items.push({
            material,
            state,
            tags,
            displayName: material.replace(UNDERSCORE_REGEX, ' ').toLowerCase().replace(WORD_START_REGEX, c => c.toUpperCase()),
            description: null
        });
    }

    return items;
}

function parseConfigYaml(content) {
    const descriptions = {};

    // Simple YAML parser for the descriptions section
    const lines = content.split('\n');
    let inDescriptions = false;
    let currentItem = null;
    let currentLines = [];

    for (const line of lines) {
        if (line.trim() === 'descriptions:') {
            inDescriptions = true;
            continue;
        }

        if (!inDescriptions) continue;

        // Check if it's a new top-level key (not indented with spaces beyond descriptions level)
        if (line.match(/^[a-zA-Z]/) && !line.startsWith(' ')) {
            // Save previous item
            if (currentItem && currentLines.length > 0) {
                descriptions[currentItem] = currentLines;
            }
            inDescriptions = false;
            continue;
        }

        // Check for item name (e.g., "  ANGLER_POTTERY_SHERD:" or "  MUSIC_DISC_13:")
        const itemMatch = line.match(/^\s{2}([A-Z0-9_]+):\s*$/);
        if (itemMatch) {
            // Save previous item
            if (currentItem && currentLines.length > 0) {
                descriptions[currentItem] = currentLines;
            }
            currentItem = itemMatch[1];
            currentLines = [];
            continue;
        }

        // Check for description line (e.g., '    - "&b&lText"')
        const lineMatch = line.match(/^\s{4}-\s*"(.*)"\s*$/);
        if (lineMatch && currentItem) {
            currentLines.push(lineMatch[1]);
        }
    }

    // Save last item
    if (currentItem && currentLines.length > 0) {
        descriptions[currentItem] = currentLines;
    }

    return descriptions;
}

function getCache(branch) {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp, cachedBranch } = JSON.parse(cached);

            // Check if cache is for a different branch
            if (cachedBranch && cachedBranch !== branch) {
                console.log(`Cache invalidated: branch changed from ${cachedBranch} to ${branch}`);
                localStorage.removeItem(CACHE_KEY);
                return null;
            }

            // Check if there was a recent edit that should invalidate the cache
            const lastEdit = localStorage.getItem(LAST_EDIT_KEY);
            if (lastEdit) {
                const lastEditTime = parseInt(lastEdit, 10);
                // If the cache was created before the last edit, invalidate it
                if (timestamp < lastEditTime) {
                    console.log('Cache invalidated due to recent edit');
                    localStorage.removeItem(CACHE_KEY);
                    return null;
                }
            }

            if (Date.now() - timestamp < CACHE_DURATION) {
                return data;
            }
        }
    } catch (e) {
        console.error('Cache read error:', e);
    }
    return null;
}

function setCache(data, branch) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now(),
            cachedBranch: branch
        }));
        // Clear the last edit marker since we now have fresh data
        localStorage.removeItem(LAST_EDIT_KEY);
    } catch (e) {
        console.error('Cache write error:', e);
    }
}

function invalidateCache() {
    try {
        localStorage.removeItem(CACHE_KEY);
        localStorage.setItem(LAST_EDIT_KEY, Date.now().toString());
    } catch (e) {
        console.error('Cache invalidation error:', e);
    }
}

// Misode data caching functions
function getMisodeCache() {
    try {
        const cached = localStorage.getItem(MISODE_CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < MISODE_CACHE_DURATION) {
                return data;
            }
        }
    } catch (e) {
        console.error('Misode cache read error:', e);
    }
    return null;
}

function setMisodeCache(data) {
    try {
        localStorage.setItem(MISODE_CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.error('Misode cache write error:', e);
    }
}

function clearMisodeCache() {
    try {
        localStorage.removeItem(MISODE_CACHE_KEY);
        console.log('Misode cache cleared');
    } catch (e) {
        console.error('Misode cache clear error:', e);
    }
}

// Convert minecraft:item_name to ITEM_NAME format
function minecraftIdToMaterial(minecraftId) {
    // Remove 'minecraft:' prefix and convert to uppercase
    return minecraftId.replace('minecraft:', '').toUpperCase();
}

// Fetch all Minecraft items from Misode's mcmeta
async function fetchMisodeItems(forceRefresh = false) {
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
        const cached = getMisodeCache();
        if (cached) {
            console.log('Using cached Misode data');
            return cached;
        }
    } else {
        clearMisodeCache();
    }

    try {
        const response = await fetch(MISODE_ITEMS_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch Misode data: ${response.status}`);
        }
        const items = await response.json();

        // Convert to our format (uppercase material names)
        const materials = items.map(minecraftIdToMaterial);

        // Cache the result
        setMisodeCache(materials);
        console.log(`Fetched ${materials.length} items from Misode${forceRefresh ? ' (forced refresh)' : ''}`);

        return materials;
    } catch (e) {
        console.error('Error fetching Misode data:', e);
        return [];
    }
}

function ItemCard({ item, onClick, editMode, onEdit, onAddMissing }) {
    const isMissing = item.isMissing;
    const hasDescription = item.description && item.description.length > 0;
    const isInteractive = isMissing || editMode || hasDescription;

    return (
        <div
            className="item-card"
            style={{
                background: COLORS.bgLight,
                border: `1px solid ${editMode && !isMissing ? COLORS.accent + '66' : hasDescription ? COLORS.description + '44' : isMissing ? COLORS.accent + '33' : COLORS.border}`,
                borderRadius: '4px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
                cursor: isInteractive ? 'pointer' : 'default',
                position: 'relative',
            }}
            onClick={() => {
                if (isMissing && onAddMissing) {
                    onAddMissing(item.material);
                    return;
                }
                if (editMode) {
                    onEdit(item);
                } else if (hasDescription) {
                    onClick(item);
                }
            }}
            onMouseEnter={e => {
                if (!isInteractive) return;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {/* Edit mode indicator */}
            {editMode && !isMissing && (
                <div style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    background: COLORS.accent,
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontWeight: '600',
                }}>
                    <Pencil size={10} />
                </div>
            )}

            {/* Item header with image and name */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
            }}>
                <img
                    src={`${IMAGE_BASE_URL}/${item.material.toLowerCase()}.png`}
                    alt={item.displayName}
                    style={{
                        width: '32px',
                        height: '32px',
                        imageRendering: 'pixelated',
                    }}
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `${IMAGE_BASE_URL}/barrier.png`;
                    }}
                />
                <span style={{
                    color: COLORS.text,
                    fontSize: '13px',
                    fontWeight: '500',
                    flex: 1,
                    lineHeight: '1.2',
                }}>
                    {item.displayName}
                </span>
                {!isMissing && hasDescription && (
                    <Info size={14} style={{ color: COLORS.description, opacity: 0.7 }} />
                )}
            </div>

            {/* Badges row */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {isMissing && (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: `${COLORS.accent}22`,
                        color: COLORS.accent,
                        padding: '3px 8px',
                        fontSize: '10px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        border: `1px solid ${COLORS.accent}44`,
                    }}>
                        <Plus size={10} />
                        Click to Add
                    </span>
                )}
                {!isMissing && item.state && (
                    <StateBadge state={item.state} />
                )}
                {!isMissing && item.tags && item.tags.map(tag => (
                    <TagBadge key={tag} tag={tag} />
                ))}
                {!isMissing && hasDescription && (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: `${COLORS.description}22`,
                        color: COLORS.description,
                        padding: '3px 8px',
                        fontSize: '10px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px',
                        border: `1px solid ${COLORS.description}44`,
                    }}>
                        <Info size={9} />
                        Info
                    </span>
                )}
            </div>
        </div>
    );
}

function Modal({ item, onClose }) {
    if (!item) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.8)',
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
                    background: COLORS.bgLight,
                    border: `2px solid ${COLORS.description}`,
                    borderRadius: '8px',
                    padding: '24px',
                    maxWidth: '500px',
                    width: '100%',
                    maxHeight: '80vh',
                    overflowY: 'auto'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '20px',
                    paddingBottom: '16px',
                    borderBottom: `1px solid ${COLORS.border}`
                }}>
                    <img
                        src={`${IMAGE_BASE_URL}/${item.material.toLowerCase()}.png`}
                        alt={item.displayName}
                        style={{
                            width: '64px',
                            height: '64px',
                            imageRendering: 'pixelated',
                            border: `2px solid ${COLORS.border}`,
                            borderRadius: '4px',
                            background: COLORS.bgLighter
                        }}
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `${IMAGE_BASE_URL}/barrier.png`;
                        }}
                    />
                    <div>
                        <h2 style={{
                            color: COLORS.text,
                            fontSize: '20px',
                            fontWeight: '600',
                            marginBottom: '8px'
                        }}>
                            {item.displayName}
                        </h2>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{
                  background: (COLORS[item.state.toLowerCase()] || COLORS.text) + '22',
                  color: COLORS[item.state.toLowerCase()] || COLORS.text,
                  padding: '3px 8px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'uppercase'
              }}>
                {item.state}
              </span>
                            {item.tags.map(tag => (
                                <span key={tag} style={{
                                    background: (COLORS[tag.toLowerCase()] || COLORS.accent) + '22',
                                    color: COLORS[tag.toLowerCase()] || COLORS.accent,
                                    padding: '3px 8px',
                                    borderRadius: '3px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    textTransform: 'uppercase'
                                }}>
                  {tag}
                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div style={{
                    background: COLORS.bgLighter,
                    borderRadius: '4px',
                    padding: '16px',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '14px',
                    lineHeight: '1.6'
                }}>
                    {item.description.map((line, idx) => (
                        <div key={idx} style={{ minHeight: '20px' }}>
                            <FormattedText text={line} />
                        </div>
                    ))}
                </div>

                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        marginTop: '20px',
                        width: '100%',
                        padding: '10px',
                        background: COLORS.bgLighter,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '4px',
                        color: COLORS.text,
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.target.style.background = COLORS.border}
                    onMouseLeave={e => e.target.style.background = COLORS.bgLighter}
                >
                    Close
                </button>
            </div>
        </div>
    );
}

function FilterButton({ active, onClick, children, color, title }) {
    return (
        <button
            onClick={onClick}
            title={title}
            style={{
                background: active ? (color || COLORS.accent) : COLORS.bg,
                color: active ? '#fff' : COLORS.textMuted,
                border: `1px solid ${active ? (color || COLORS.accent) : COLORS.border}`,
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
            }}
        >
            {children}
        </button>
    );
}

// Inner component with all the logic
function ForceItemPoolsContent() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [stateFilter, setStateFilter] = useState('ALL');
    const [tagFilters, setTagFilters] = useState({ NETHER: false, END: false, EXTREME: false, DESCRIPTION: false });
    const [sortBy, setSortBy] = useState('name'); // 'name' | 'state' | 'hasInfo'
    const [lastUpdated, setLastUpdated] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [currentBranch, setCurrentBranch] = useState(() => getStoredBranch());
    const [viewBranch, setViewBranch] = useState(() => getStoredViewBranch());
    const [availableBranches, setAvailableBranches] = useState([DEFAULT_BRANCH]);
    const [showHistory, setShowHistory] = useState(false);
    const [showPoolManager, setShowPoolManager] = useState(false);
    const [initialPoolItem, setInitialPoolItem] = useState(null); // Pre-selected item for Pool Manager

    // Missing Items View state
    const [viewMode, setViewMode] = useState('pools'); // 'pools' | 'missing' | 'all'
    const [allMinecraftItems, setAllMinecraftItems] = useState([]);
    const [loadingMisode, setLoadingMisode] = useState(false);

    // Parse URL params on mount to set initial filters
    // Note: With hash-based routing, params are in the hash (e.g. #pools?state=LATE)
    useEffect(() => {
        const hash = window.location.hash; // e.g. "#pools?state=LATE"
        const queryIndex = hash.indexOf('?');
        if (queryIndex === -1) return;

        const queryString = hash.slice(queryIndex + 1);
        const params = new URLSearchParams(queryString);

        // Handle state filter (EARLY, MID, LATE)
        const stateParam = params.get('state');
        if (stateParam && ['ALL', 'EARLY', 'MID', 'LATE'].includes(stateParam.toUpperCase())) {
            setStateFilter(stateParam.toUpperCase());
        }

        // Handle tag filters (NETHER, END, EXTREME)
        const tagParam = params.get('tag');
        if (tagParam) {
            const tags = tagParam.toUpperCase().split(',');
            setTagFilters(prev => {
                const next = { ...prev };
                tags.forEach(tag => {
                    if (tag in next) {
                        next[tag] = true;
                    }
                });
                return next;
            });
        }
    }, []);

    // Handle description save from editor
    const handleDescriptionSave = (materialName, newDescription) => {
        setItems(prevItems => prevItems.map(item =>
            item.material === materialName
                ? { ...item, description: newDescription }
                : item
        ));
        // Update current branch to match what was used in editor
        setCurrentBranch(getStoredBranch());
        // Invalidate cache so next reload fetches fresh data
        invalidateCache();
    };

    // Manual refresh function
    const handleRefresh = async () => {
        invalidateCache();
        setLoading(true);
        setError(null);

        try {
            const [javaResponse, configResponse] = await Promise.all([
                fetch(GITHUB_RAW_URL),
                fetch(getConfigUrl(viewBranch) + '?t=' + Date.now()) // Cache bust
            ]);

            if (!javaResponse.ok) throw new Error('Failed to fetch items from GitHub');

            const javaContent = await javaResponse.text();
            const parsedItems = parseJavaFile(javaContent);

            if (configResponse.ok) {
                const configContent = await configResponse.text();
                const descriptions = parseConfigYaml(configContent);

                parsedItems.forEach(item => {
                    if (descriptions[item.material]) {
                        item.description = descriptions[item.material];
                    }
                });
            }

            const cacheData = { items: parsedItems, timestamp: Date.now() };
            setCache(cacheData, viewBranch);
            setItems(parsedItems);
            setLastUpdated(new Date());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle view branch change
    const handleViewBranchChange = async (newBranch) => {
        setViewBranch(newBranch);
        setStoredViewBranch(newBranch);
        invalidateCache();
        setLoading(true);
        setError(null);

        try {
            const configUrl = getConfigUrl(newBranch) + '?t=' + Date.now();

            const [javaResponse, configResponse] = await Promise.all([
                fetch(GITHUB_RAW_URL),
                fetch(configUrl)
            ]);

            if (!javaResponse.ok) throw new Error('Failed to fetch items from GitHub');

            const javaContent = await javaResponse.text();
            const parsedItems = parseJavaFile(javaContent);

            // Reset all descriptions first
            parsedItems.forEach(item => {
                item.description = null;
            });

            if (configResponse.ok) {
                const configContent = await configResponse.text();
                const descriptions = parseConfigYaml(configContent);

                parsedItems.forEach(item => {
                    if (descriptions[item.material]) {
                        item.description = descriptions[item.material];
                    }
                });
            }

            // Don't cache when viewing non-main branches to always get fresh data
            if (newBranch === DEFAULT_BRANCH) {
                const cacheData = { items: parsedItems, timestamp: Date.now() };
                setCache(cacheData, newBranch);
            }

            setItems(parsedItems);
            setLastUpdated(new Date());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        async function fetchData() {
            const branch = viewBranch;

            // Fetch available branches
            try {
                const branchesResponse = await fetch(BRANCHES_URL);
                if (branchesResponse.ok) {
                    const branchesData = await branchesResponse.json();
                    const branchNames = branchesData.map(b => b.name);
                    setAvailableBranches(branchNames.length > 0 ? branchNames : [DEFAULT_BRANCH]);
                }
            } catch (e) {
                console.log('Could not fetch branches:', e);
            }

            // Check cache first
            const cached = getCache(branch);
            if (cached) {
                setItems(cached.items);
                setLastUpdated(new Date(cached.timestamp));
                setLoading(false);
                return;
            }

            try {
                // Fetch both files in parallel
                const [javaResponse, configResponse] = await Promise.all([
                    fetch(GITHUB_RAW_URL),
                    fetch(getConfigUrl(branch) + '?t=' + Date.now())
                ]);

                if (!javaResponse.ok) throw new Error('Failed to fetch items from GitHub');

                const javaContent = await javaResponse.text();
                const parsedItems = parseJavaFile(javaContent);

                // Parse descriptions if available
                if (configResponse.ok) {
                    const configContent = await configResponse.text();
                    const descriptions = parseConfigYaml(configContent);

                    // Merge descriptions into items
                    parsedItems.forEach(item => {
                        if (descriptions[item.material]) {
                            item.description = descriptions[item.material];
                        }
                    });
                }

                const cacheData = { items: parsedItems, timestamp: Date.now() };
                setCache(cacheData, branch);
                setItems(parsedItems);
                setLastUpdated(new Date());
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    // Fetch Misode data for missing items view
    useEffect(() => {
        async function loadMisodeData() {
            setLoadingMisode(true);
            try {
                const misodeItems = await fetchMisodeItems();
                setAllMinecraftItems(misodeItems);
            } catch (e) {
                console.error('Failed to load Misode data:', e);
            } finally {
                setLoadingMisode(false);
            }
        }
        loadMisodeData();
    }, []);

    // Handler to refresh Misode data (clears cache and refetches)
    const handleRefreshMisode = useCallback(async () => {
        setLoadingMisode(true);
        try {
            const misodeItems = await fetchMisodeItems(true); // force refresh
            setAllMinecraftItems(misodeItems);
        } catch (e) {
            console.error('Failed to refresh Misode data:', e);
        } finally {
            setLoadingMisode(false);
        }
    }, []);

    // Handler to open Pool Manager with a pre-selected item
    const handleOpenPoolManagerWithItem = useCallback((material) => {
        setInitialPoolItem(material);
        setShowPoolManager(true);
    }, []);

    // Handler to close Pool Manager and reset initial item
    const handleClosePoolManager = useCallback(() => {
        setShowPoolManager(false);
        setInitialPoolItem(null);
    }, []);

    // Compute missing items
    const missingItems = useMemo(() => {
        if (allMinecraftItems.length === 0 || items.length === 0) return [];

        const poolMaterials = new Set(items.map(item => item.material));
        return allMinecraftItems
            .filter(material => !poolMaterials.has(material))
            .map(material => ({
                material,
                displayName: material.replace(UNDERSCORE_REGEX, ' ').toLowerCase().replace(WORD_START_REGEX, c => c.toUpperCase()),
                isMissing: true
            }));
    }, [allMinecraftItems, items]);

    // Filter items based on view mode and filters
    const filteredItems = useMemo(() => {
        let itemsToFilter = viewMode === 'pools' ? items : missingItems;

        let result = itemsToFilter.filter(item => {
            // Search filter
            if (search && !item.displayName.toLowerCase().includes(search.toLowerCase()) &&
                !item.material.toLowerCase().includes(search.toLowerCase())) {
                return false;
            }

            // For missing items, skip state/tag filters
            if (item.isMissing) {
                return true;
            }

            // State filter
            if (stateFilter !== 'ALL' && item.state !== stateFilter) {
                return false;
            }

            // Tag filters
            const activeTags = Object.entries(tagFilters).filter(([, v]) => v).map(([k]) => k);
            if (activeTags.length > 0) {
                const hasRequiredTag = activeTags.some(tag => {
                    if (tag === 'DESCRIPTION') {
                        return item.description && item.description.length > 0;
                    }
                    return item.tags.includes(tag);
                });
                if (!hasRequiredTag) return false;
            }

            return true;
        });

        // Sort the results
        result.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.displayName.localeCompare(b.displayName);
                case 'state': {
                    const stateOrder = { EARLY: 0, MID: 1, LATE: 2 };
                    const aOrder = stateOrder[a.state] ?? 3;
                    const bOrder = stateOrder[b.state] ?? 3;
                    if (aOrder !== bOrder) return aOrder - bOrder;
                    return a.displayName.localeCompare(b.displayName);
                }
                case 'hasInfo': {
                    const aHas = a.description?.length > 0 ? 0 : 1;
                    const bHas = b.description?.length > 0 ? 0 : 1;
                    if (aHas !== bHas) return aHas - bHas;
                    return a.displayName.localeCompare(b.displayName);
                }
                default:
                    return 0;
            }
        });

        return result;
    }, [items, missingItems, viewMode, search, stateFilter, tagFilters, sortBy]);

    // Count active filters for feedback (state/tag only relevant in pools view)
    const activeFilterCount = useMemo(() => {
        let count = 0;
        // Only count state/tag filters when in pools view
        if (viewMode === 'pools') {
            if (stateFilter !== 'ALL') count++;
            count += Object.values(tagFilters).filter(Boolean).length;
        }
        // Always count search
        if (search.trim()) count++;
        return count;
    }, [stateFilter, tagFilters, search, viewMode]);

    // Clear all filters helper
    const clearAllFilters = useCallback(() => {
        setStateFilter('ALL');
        setTagFilters({ NETHER: false, END: false, EXTREME: false, DESCRIPTION: false });
        setSearch('');
    }, []);

    const stats = useMemo(() => ({
        total: items.length,
        early: items.filter(i => i.state === 'EARLY').length,
        mid: items.filter(i => i.state === 'MID').length,
        late: items.filter(i => i.state === 'LATE').length,
        nether: items.filter(i => i.tags.includes('NETHER')).length,
        end: items.filter(i => i.tags.includes('END')).length,
        extreme: items.filter(i => i.tags.includes('EXTREME')).length,
        description: items.filter(i => i.description && i.description.length > 0).length,
        missing: missingItems.length,
        allMinecraft: allMinecraftItems.length,
    }), [items, missingItems, allMinecraftItems]);

    const toggleTag = (tag) => {
        setTagFilters(prev => ({ ...prev, [tag]: !prev[tag] }));
    };

    if (error) {
        return (
            <div style={{
                minHeight: '100vh',
                background: COLORS.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '16px',
                fontFamily: "'Minecraft', 'Courier New', monospace"
            }}>
                <div style={{ color: COLORS.late, fontSize: '18px' }}>Error: {error}</div>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        background: COLORS.accent,
                        color: '#fff',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: COLORS.bg,
            fontFamily: "'Segoe UI', -apple-system, sans-serif",
            color: COLORS.text,
            padding: '24px'
        }}>
            {/* Modal */}
            <Modal item={selectedItem} onClose={() => setSelectedItem(null)} />

            {/* Header */}
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: '700',
                        marginBottom: '8px',
                        background: 'linear-gradient(135deg, #55FF55, #5865F2, #FF55FF)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.5px'
                    }}>
                        ForceItemBattle Item Pools
                    </h1>
                    <p style={{ color: COLORS.textMuted, fontSize: '14px' }}>
                        Browse all {stats.total} items <Circle size={4} fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 6px' }} />
                        {lastUpdated && ` Last updated: ${lastUpdated.toLocaleDateString()}`}
                    </p>
                    <a
                        href="https://github.com/McPlayHDnet/ForceItemBattle"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: COLORS.accent, fontSize: '13px', textDecoration: 'none' }}
                    >
                        View on GitHub <ExternalLink size={14} style={{ display: 'inline-block', marginLeft: '4px', verticalAlign: 'middle' }} />
                    </a>
                </div>

                {/* Stats Bar */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '24px',
                    marginBottom: '24px',
                    flexWrap: 'wrap'
                }}>
                    {[
                        { label: 'Total MC', value: stats.allMinecraft || '...', color: COLORS.text },
                        { label: 'In Pools', value: stats.total, color: COLORS.accent },
                        { label: 'Missing', value: stats.missing, color: COLORS.textMuted },
                        { label: 'Early', value: stats.early, color: COLORS.early },
                        { label: 'Mid', value: stats.mid, color: COLORS.mid },
                        { label: 'Late', value: stats.late, color: COLORS.late },
                        { label: 'With Info', value: stats.description, color: COLORS.description },
                    ].map(stat => (
                        <div key={stat.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: stat.color }}>
                                {stat.value}
                            </div>
                            <div style={{ fontSize: '11px', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters - Unified Design */}
                <div style={{
                    background: COLORS.bgLight,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                }}>
                    {/* Row 1: View Mode + Search + Sort - all inline */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap'
                    }}>
                        {/* View Mode Toggle */}
                        <ViewModeToggle
                            value={viewMode}
                            onChange={setViewMode}
                            options={[
                                { value: 'pools', label: 'In Pools', icon: <Package size={14} />, count: stats.total },
                                { value: 'missing', label: 'Missing', icon: <PackageX size={14} />, count: stats.missing },
                            ]}
                        />

                        {/* Separator */}
                        <div style={{ width: '1px', height: '32px', background: COLORS.border }} />

                        {/* Search */}
                        <div style={{ flex: 1, minWidth: '180px', maxWidth: '320px' }}>
                            <SearchInput
                                value={search}
                                onChange={setSearch}
                                placeholder={viewMode === 'missing' ? "Search missing..." : "Search items..."}
                                debounceMs={150}
                            />
                        </div>

                        {/* Dynamic Pools Info */}
                        {viewMode === 'pools' && (
                            <>
                                <div style={{ width: '1px', height: '32px', background: COLORS.border }} />
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    background: COLORS.bg,
                                    padding: '8px 14px',
                                    borderRadius: '6px',
                                    border: `1px solid ${COLORS.border}`
                                }}>
                                    <span style={{
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: COLORS.text,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Dynamic Pools
                                    </span>
                                    <div style={{
                                        display: 'flex',
                                        gap: '12px',
                                        fontSize: '13px'
                                    }}>
                                        <span style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '2px',
                                                background: COLORS.early
                                            }} />
                                            <span style={{ color: COLORS.text }}>Early</span>
                                            <span style={{ color: COLORS.textMuted }}>0%</span>
                                        </span>
                                        <span style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '2px',
                                                background: COLORS.mid
                                            }} />
                                            <span style={{ color: COLORS.text }}>Mid</span>
                                            <span style={{ color: COLORS.textMuted }}>11%</span>
                                        </span>
                                        <span style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '2px',
                                                background: COLORS.late
                                            }} />
                                            <span style={{ color: COLORS.text }}>Late</span>
                                            <span style={{ color: COLORS.textMuted }}>29%</span>
                                        </span>
                                    </div>
                                    <span style={{
                                        fontSize: '11px',
                                        color: COLORS.textMuted,
                                        borderLeft: `1px solid ${COLORS.border}`,
                                        paddingLeft: '12px'
                                    }}>
                                        45min game: 0 / 5 / 13 min
                                    </span>
                                </div>
                            </>
                        )}

                        {/* Sort Dropdown - styled to match */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginLeft: 'auto',
                        }}>
                            <span style={{ fontSize: '12px', color: COLORS.textMuted }}>Sort:</span>
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    style={{
                                        appearance: 'none',
                                        background: COLORS.bg,
                                        border: `1px solid ${COLORS.border}`,
                                        borderRadius: '6px',
                                        padding: '8px 32px 8px 12px',
                                        color: COLORS.text,
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        outline: 'none',
                                        minWidth: '130px',
                                        height: '36px',
                                    }}
                                >
                                    <option value="name">Name (A-Z)</option>
                                    <option value="state">Game State</option>
                                    <option value="hasInfo">Has Info First</option>
                                </select>
                                <ChevronDown
                                    size={14}
                                    style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: COLORS.textMuted,
                                        pointerEvents: 'none',
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {loadingMisode && (
                        <div style={{ fontSize: '11px', color: COLORS.textMuted }}>
                            Loading Minecraft item registry...
                        </div>
                    )}

                    {/* Row 2: Filters - only show for pools view */}
                    {viewMode === 'pools' && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            flexWrap: 'wrap',
                            paddingTop: '12px',
                            borderTop: `1px solid ${COLORS.border}`,
                        }}>
                            {/* State Filter Group */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px', color: COLORS.textMuted, whiteSpace: 'nowrap' }}>State:</span>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {['ALL', 'EARLY', 'MID', 'LATE'].map(state => (
                                        <FilterButton
                                            key={state}
                                            active={stateFilter === state}
                                            onClick={() => setStateFilter(state)}
                                            color={state === 'ALL' ? COLORS.accent : COLORS[state.toLowerCase()]}
                                        >
                                            {state === 'ALL' ? 'All' : state.charAt(0) + state.slice(1).toLowerCase()}
                                            {state !== 'ALL' && ` (${stats[state.toLowerCase()]})`}
                                        </FilterButton>
                                    ))}
                                </div>
                            </div>

                            {/* Separator */}
                            <div style={{ width: '1px', height: '28px', background: COLORS.border }} />

                            {/* Tag Filter Group */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px', color: COLORS.textMuted, whiteSpace: 'nowrap' }}>Tags:</span>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {['NETHER', 'END', 'EXTREME', 'DESCRIPTION'].map(tag => (
                                        <FilterButton
                                            key={tag}
                                            active={tagFilters[tag]}
                                            onClick={() => toggleTag(tag)}
                                            color={COLORS[tag.toLowerCase()]}
                                        >
                                            {tag === 'DESCRIPTION' ? 'Has Info' : tag.charAt(0) + tag.slice(1).toLowerCase()}
                                            {` (${stats[tag.toLowerCase()]})`}
                                        </FilterButton>
                                    ))}
                                </div>
                            </div>

                            {/* Clear Filters - only show when filters active */}
                            {activeFilterCount > 0 && (
                                <>
                                    <div style={{ flex: 1 }} />
                                    <button
                                        onClick={clearAllFilters}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: '6px 10px',
                                            fontSize: '12px',
                                            color: COLORS.textMuted,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            borderRadius: '4px',
                                            transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = COLORS.bg;
                                            e.currentTarget.style.color = COLORS.text;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'none';
                                            e.currentTarget.style.color = COLORS.textMuted;
                                        }}
                                    >
                                        <X size={14} />
                                        Clear filters
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Results Count */}
                <div style={{
                    marginBottom: '16px',
                    color: COLORS.textMuted,
                    fontSize: '13px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {filteredItems.length === 0 && activeFilterCount > 0 ? (
                            <>
                                <SearchX size={16} style={{ color: COLORS.warning }} />
                                <span style={{ color: COLORS.warning }}>
                                    No items match your filters
                                </span>
                                <button
                                    onClick={clearAllFilters}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: COLORS.accent,
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        textDecoration: 'underline',
                                        padding: '0',
                                    }}
                                >
                                    Clear filters
                                </button>
                            </>
                        ) : (
                            <>
                                Showing {filteredItems.length} of {viewMode === 'pools' ? stats.total : stats.missing} items
                                {activeFilterCount > 0 && (
                                    <span style={{ color: COLORS.textMuted }}>
                                        ({activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active)
                                    </span>
                                )}
                            </>
                        )}
                        {viewMode === 'missing' && filteredItems.length > 0 && (
                            <span style={{ color: COLORS.textMuted, marginLeft: '8px' }}>
                                <Circle size={4} fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Items not yet added to any pool
                            </span>
                        )}
                        {viewMode === 'pools' && stats.description > 0 && !editMode && filteredItems.length > 0 && (
                            <span style={{ color: COLORS.description, marginLeft: '8px' }}>
                              <Circle size={4} fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Click items with <Info size={14} style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 4px' }} /> for details
                            </span>
                        )}
                        {viewMode === 'pools' && editMode && filteredItems.length > 0 && (
                            <span style={{ color: COLORS.accent, marginLeft: '8px' }}>
                              <Circle size={4} fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Click any item to edit its description
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {viewMode === 'pools' && (
                            <button
                                onClick={() => setEditMode(!editMode)}
                                style={{
                                    padding: '8px 16px',
                                    background: editMode ? COLORS.accent : 'transparent',
                                    border: `1px solid ${editMode ? COLORS.accent : COLORS.border}`,
                                    borderRadius: '4px',
                                    color: editMode ? '#fff' : COLORS.textMuted,
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {editMode ? <Check size={14} /> : <Pencil size={14} />}
                                {editMode ? 'Exit Edit Mode' : 'Edit Descriptions'}
                            </button>
                        )}
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            title={`Refresh data from ${viewBranch} branch`}
                            style={{
                                padding: '8px 16px',
                                background: 'transparent',
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: '4px',
                                color: COLORS.textMuted,
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                opacity: loading ? 0.5 : 1
                            }}
                        >
                            <RefreshCw
                                size={14}
                                style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
                            />
                            Refresh
                        </button>
                        <button
                            onClick={() => setShowHistory(true)}
                            title="View git commit history"
                            style={{
                                padding: '8px 16px',
                                background: 'transparent',
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: '4px',
                                color: COLORS.textMuted,
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <History size={14} />
                            History
                        </button>
                        <button
                            onClick={() => setShowPoolManager(true)}
                            title="Manage item pools"
                            style={{
                                padding: '8px 16px',
                                background: 'transparent',
                                border: `1px solid ${COLORS.accent}44`,
                                borderRadius: '4px',
                                color: COLORS.accent,
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <Package size={14} />
                            Manage Pools
                        </button>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <GitBranch size={14} style={{ color: COLORS.textMuted }} />
                            <span style={{
                                color: COLORS.textMuted,
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                Branch:
                            </span>
                            <select
                                value={viewBranch}
                                onChange={(e) => handleViewBranchChange(e.target.value)}
                                disabled={loading}
                                style={{
                                    padding: '6px 10px',
                                    background: viewBranch !== DEFAULT_BRANCH ? '#FFAA0022' : COLORS.bgLighter,
                                    border: `1px solid ${viewBranch !== DEFAULT_BRANCH ? '#FFAA0066' : COLORS.border}`,
                                    borderRadius: '4px',
                                    color: viewBranch !== DEFAULT_BRANCH ? '#FFAA00' : COLORS.text,
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    outline: 'none',
                                    minWidth: '100px'
                                }}
                            >
                                {availableBranches.map(branch => (
                                    <option key={branch} value={branch}>
                                        {branch === DEFAULT_BRANCH ? 'main' : branch}
                                    </option>
                                ))}
                            </select>
                        </div>

                    </div>
                </div>

                {/* Item Grid */}
                {loading ? (
                    <SkeletonGrid count={12} />
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                        gap: '12px'
                    }}>
                        {filteredItems.map(item => (
                            <ItemCard
                                key={item.material}
                                item={item}
                                onClick={setSelectedItem}
                                editMode={editMode}
                                onEdit={setEditItem}
                                onAddMissing={handleOpenPoolManagerWithItem}
                            />
                        ))}
                    </div>
                )}

                {/* Empty States */}
                {filteredItems.length === 0 && !loading && (
                    // Show loading indicator while fetching Minecraft registry for missing view
                    viewMode === 'missing' && loadingMisode ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            color: COLORS.textMuted,
                        }}>
                            <RefreshCw
                                size={32}
                                style={{
                                    animation: 'spin 1s linear infinite',
                                    marginBottom: '16px',
                                    opacity: 0.5,
                                }}
                            />
                            <div style={{ fontSize: '14px' }}>
                                Loading Minecraft item registry...
                            </div>
                        </div>
                    ) : search ? (
                        <NoResultsEmpty
                            searchTerm={search}
                            onClear={() => setSearch('')}
                        />
                    ) : viewMode === 'missing' && missingItems.length === 0 && !loadingMisode ? (
                        <NoMissingItemsEmpty />
                    ) : (
                        <NoResultsEmpty
                            searchTerm=""
                            onClear={() => {
                                setStateFilter('ALL');
                                setTagFilters({ NETHER: false, END: false, EXTREME: false, DESCRIPTION: false });
                            }}
                        />
                    )
                )}

                {/* Footer */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '48px',
                    padding: '32px 20px',
                    borderTop: `1px solid ${COLORS.border}`,
                    color: COLORS.textMuted,
                    fontSize: '13px'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '24px',
                        marginBottom: '20px'
                    }}>
                        <a
                            href="https://github.com/McPlayHDnet/ForceItemBattle"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: COLORS.textMuted,
                                textDecoration: 'none',
                                fontSize: '13px',
                                transition: 'color 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = COLORS.text}
                            onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}
                        >
                            GitHub
                        </a>
                        <a
                            href="https://mcplayhd.net"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: COLORS.textMuted,
                                textDecoration: 'none',
                                fontSize: '13px',
                                transition: 'color 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = COLORS.text}
                            onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}
                        >
                            McPlayHD.net
                        </a>
                        <a
                            href="/#imprint"
                            style={{
                                color: COLORS.textMuted,
                                textDecoration: 'none',
                                fontSize: '13px',
                                transition: 'color 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = COLORS.text}
                            onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}
                        >
                            Imprint
                        </a>
                    </div>
                    <p style={{ margin: 0 }}>
                        Made with ❤️
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '11px' }}>
                        Not affiliated with Mojang Studios
                    </p>
                </div>
            </div>

            {/* Description Editor Modal */}
            {editItem && (
                <DescriptionEditor
                    item={editItem}
                    allItems={items}
                    onClose={() => setEditItem(null)}
                    onSave={handleDescriptionSave}
                />
            )}

            {/* Git History Modal */}
            {showHistory && (
                <GitHistory onClose={() => setShowHistory(false)} />
            )}

            {/* Item Pool Manager Modal */}
            {showPoolManager && (
                <ItemPoolManager
                    onClose={handleClosePoolManager}
                    items={items}
                    missingItems={missingItems}
                    onRefreshMisode={handleRefreshMisode}
                    initialExpandedItem={initialPoolItem}
                />
            )}
        </div>
    );
}

// Main export with providers
export default function ForceItemPools() {
    return (
        <ToastProvider>
            <GlobalStyles />
            <ForceItemPoolsContent />
        </ToastProvider>
    );
}