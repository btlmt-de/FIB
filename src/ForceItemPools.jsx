import React, { useState, useEffect, useMemo } from 'react';
import DescriptionEditor from './DescriptionEditor';
import GitHistory from './GitHistory';

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/McPlayHDnet/ForceItemBattle/v3.9.5/src/main/java/forceitembattle/manager/ItemDifficultiesManager.java';
const CONFIG_BASE_URL = 'https://raw.githubusercontent.com/btlmt-de/FIB';
const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib';
const CACHE_KEY = 'forceitem_pools_cache_v3';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const LAST_EDIT_KEY = 'forceitem_last_edit';
const BRANCH_KEY = 'fib_github_branch';
const DEFAULT_BRANCH = 'main';

// Get the stored branch or default to main
function getStoredBranch() {
    try {
        return localStorage.getItem(BRANCH_KEY) || DEFAULT_BRANCH;
    } catch {
        return DEFAULT_BRANCH;
    }
}

// Get config URL for a specific branch
function getConfigUrl(branch) {
    return `${CONFIG_BASE_URL}/${branch}/config.yml`;
}

// Minecraft color codes mapping
const MC_COLORS = {
    '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA',
    '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
    '8': '#555555', '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF',
    'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55', 'f': '#FFFFFF'
};

// Minecraft-style colors for UI
const COLORS = {
    early: '#55FF55',
    mid: '#FFFF55',
    late: '#FF5555',
    nether: '#AA0000',
    end: '#AA00AA',
    extreme: '#FF55FF',
    description: '#55FFFF',
    bg: '#1a1a2e',
    bgLight: '#252542',
    bgLighter: '#2d2d4a',
    text: '#e0e0e0',
    textMuted: '#888',
    border: '#3d3d5c',
    accent: '#5865F2'
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
function stripFormatting(text) {
    return text.replace(/&[0-9a-fklmnor]/gi, '');
}

function parseJavaFile(content) {
    const items = [];

    const registerRegex = /register\(Material\.(\w+),\s*State\.(\w+)(?:,\s*ItemTag\.(\w+))?(?:,\s*ItemTag\.(\w+))?(?:,\s*ItemTag\.(\w+))?\)/g;

    let match;
    while ((match = registerRegex.exec(content)) !== null) {
        const [, material, state, tag1, tag2, tag3] = match;
        const tags = [tag1, tag2, tag3].filter(Boolean);
        items.push({
            material,
            state,
            tags,
            displayName: material.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
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

        // Check for item name (e.g., "  ANGLER_POTTERY_SHERD:")
        const itemMatch = line.match(/^\s{2}([A-Z_]+):\s*$/);
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

function ItemCard({ item, onClick, editMode, onEdit }) {
    const stateColor = COLORS[item.state.toLowerCase()] || COLORS.text;
    const hasDescription = item.description && item.description.length > 0;

    return (
        <div
            style={{
                background: COLORS.bgLight,
                border: `1px solid ${editMode ? COLORS.accent + '44' : hasDescription ? COLORS.description + '44' : COLORS.border}`,
                borderRadius: '4px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'transform 0.15s, box-shadow 0.15s',
                cursor: editMode || hasDescription ? 'pointer' : 'default',
                position: 'relative'
            }}
            onClick={() => {
                if (editMode) {
                    onEdit(item);
                } else if (hasDescription) {
                    onClick(item);
                }
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 4px 12px rgba(0,0,0,0.3)`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {editMode && (
                <div style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    background: COLORS.accent,
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontWeight: '600'
                }}>
                    ✎
                </div>
            )}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <img
                    src={`${IMAGE_BASE_URL}/${item.material.toLowerCase()}.png`}
                    alt={item.displayName}
                    style={{ width: '32px', height: '32px', imageRendering: 'pixelated' }}
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }}
                />
                <span style={{
                    color: COLORS.text,
                    fontSize: '13px',
                    fontWeight: '500',
                    flex: 1,
                    lineHeight: '1.2'
                }}>
          {item.displayName}
        </span>
                {hasDescription && (
                    <span style={{
                        color: COLORS.description,
                        fontSize: '14px',
                        opacity: 0.7
                    }}>
            ℹ
          </span>
                )}
            </div>

            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        <span style={{
            background: stateColor + '22',
            color: stateColor,
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '10px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        }}>
          {item.state}
        </span>
                {item.tags.map(tag => (
                    <span key={tag} style={{
                        background: (COLORS[tag.toLowerCase()] || COLORS.accent) + '22',
                        color: COLORS[tag.toLowerCase()] || COLORS.accent,
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
            {tag}
          </span>
                ))}
                {hasDescription && (
                    <span style={{
                        background: COLORS.description + '22',
                        color: COLORS.description,
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
            INFO
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
                            e.target.style.display = 'none';
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

function FilterButton({ active, onClick, children, color }) {
    return (
        <button
            onClick={onClick}
            style={{
                background: active ? (color || COLORS.accent) : 'transparent',
                color: active ? '#fff' : COLORS.textMuted,
                border: `1px solid ${active ? (color || COLORS.accent) : COLORS.border}`,
                padding: '6px 14px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.15s'
            }}
        >
            {children}
        </button>
    );
}

export default function ForceItemPools() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [stateFilter, setStateFilter] = useState('ALL');
    const [tagFilters, setTagFilters] = useState({ NETHER: false, END: false, EXTREME: false, DESCRIPTION: false });
    const [lastUpdated, setLastUpdated] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [currentBranch, setCurrentBranch] = useState(getStoredBranch());
    const [showHistory, setShowHistory] = useState(false);

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
        // Get the latest branch setting
        const branch = getStoredBranch();
        setCurrentBranch(branch);

        invalidateCache();
        setLoading(true);
        setError(null);

        try {
            const [javaResponse, configResponse] = await Promise.all([
                fetch(GITHUB_RAW_URL),
                fetch(getConfigUrl(branch))
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
            setCache(cacheData, branch);
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
            const branch = getStoredBranch();
            setCurrentBranch(branch);

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
                    fetch(getConfigUrl(branch))
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

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            // Search filter
            if (search && !item.displayName.toLowerCase().includes(search.toLowerCase()) &&
                !item.material.toLowerCase().includes(search.toLowerCase())) {
                return false;
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
    }, [items, search, stateFilter, tagFilters]);

    const stats = useMemo(() => ({
        total: items.length,
        early: items.filter(i => i.state === 'EARLY').length,
        mid: items.filter(i => i.state === 'MID').length,
        late: items.filter(i => i.state === 'LATE').length,
        nether: items.filter(i => i.tags.includes('NETHER')).length,
        end: items.filter(i => i.tags.includes('END')).length,
        extreme: items.filter(i => i.tags.includes('EXTREME')).length,
        description: items.filter(i => i.description && i.description.length > 0).length,
    }), [items]);

    const toggleTag = (tag) => {
        setTagFilters(prev => ({ ...prev, [tag]: !prev[tag] }));
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: COLORS.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Minecraft', 'Courier New', monospace"
            }}>
                <div style={{ color: COLORS.text, fontSize: '18px' }}>
                    Loading item pools...
                </div>
            </div>
        );
    }

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
                        Browse all {stats.total} items •
                        {lastUpdated && ` Last updated: ${lastUpdated.toLocaleDateString()}`}
                    </p>
                    <a
                        href="https://github.com/McPlayHDnet/ForceItemBattle"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: COLORS.accent, fontSize: '13px', textDecoration: 'none' }}
                    >
                        View on GitHub →
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
                        { label: 'Early', value: stats.early, color: COLORS.early },
                        { label: 'Mid', value: stats.mid, color: COLORS.mid },
                        { label: 'Late', value: stats.late, color: COLORS.late },
                        { label: 'Nether', value: stats.nether, color: COLORS.nether },
                        { label: 'End', value: stats.end, color: COLORS.end },
                        { label: 'Extreme', value: stats.extreme, color: COLORS.extreme },
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

                {/* Filters */}
                <div style={{
                    background: COLORS.bgLight,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '24px'
                }}>
                    {/* Search */}
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            background: COLORS.bgLighter,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '4px',
                            color: COLORS.text,
                            fontSize: '14px',
                            marginBottom: '16px',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />

                    {/* State Filters */}
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '11px', color: COLORS.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Game State
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {['ALL', 'EARLY', 'MID', 'LATE'].map(state => (
                                <FilterButton
                                    key={state}
                                    active={stateFilter === state}
                                    onClick={() => setStateFilter(state)}
                                    color={state === 'ALL' ? COLORS.accent : COLORS[state.toLowerCase()]}
                                >
                                    {state} {state !== 'ALL' && `(${stats[state.toLowerCase()]})`}
                                </FilterButton>
                            ))}
                        </div>
                    </div>

                    {/* Tag Filters */}
                    <div>
                        <div style={{ fontSize: '11px', color: COLORS.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Item Tags
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {['NETHER', 'END', 'EXTREME', 'DESCRIPTION'].map(tag => (
                                <FilterButton
                                    key={tag}
                                    active={tagFilters[tag]}
                                    onClick={() => toggleTag(tag)}
                                    color={COLORS[tag.toLowerCase()]}
                                >
                                    {tag === 'DESCRIPTION' ? 'HAS INFO' : tag} ({stats[tag.toLowerCase()]})
                                </FilterButton>
                            ))}
                        </div>
                    </div>
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
                    <div>
                        Showing {filteredItems.length} of {stats.total} items
                        {stats.description > 0 && !editMode && (
                            <span style={{ color: COLORS.description, marginLeft: '8px' }}>
                              • Click items with ℹ for details
                            </span>
                        )}
                        {editMode && (
                            <span style={{ color: COLORS.accent, marginLeft: '8px' }}>
                              • Click any item to edit its description
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                            <span>✎</span>
                            {editMode ? 'Exit Edit Mode' : 'Edit Descriptions'}
                        </button>
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            title={`Refresh data from ${currentBranch} branch`}
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
                            <span style={{
                                display: 'inline-block',
                                animation: loading ? 'spin 1s linear infinite' : 'none'
                            }}>↻</span>
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
                            <span>📜</span>
                            History
                        </button>
                        {currentBranch !== DEFAULT_BRANCH && (
                            <span style={{
                                padding: '6px 10px',
                                background: '#FFAA0022',
                                border: '1px solid #FFAA0044',
                                borderRadius: '4px',
                                color: '#FFAA00',
                                fontSize: '11px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                🌿 {currentBranch}
                            </span>
                        )}
                    </div>
                </div>

                {/* Item Grid */}
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
                        />
                    ))}
                </div>

                {filteredItems.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '48px',
                        color: COLORS.textMuted
                    }}>
                        No items match your filters
                    </div>
                )}

                {/* Footer */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '48px',
                    padding: '24px',
                    borderTop: `1px solid ${COLORS.border}`,
                    color: COLORS.textMuted,
                    fontSize: '12px'
                }}>
                    Data fetched from GitHub
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
        </div>
    );
}