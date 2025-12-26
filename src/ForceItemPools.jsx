import React, { useState, useEffect, useMemo } from 'react';

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/McPlayHDnet/ForceItemBattle/v3.9.5/src/main/java/forceitembattle/manager/ItemDifficultiesManager.java';
const CACHE_KEY = 'forceitem_pools_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Minecraft-style colors
const COLORS = {
    early: '#55FF55',
    mid: '#FFFF55',
    late: '#FF5555',
    nether: '#AA0000',
    end: '#AA00AA',
    extreme: '#FF55FF',
    bg: '#1a1a2e',
    bgLight: '#252542',
    bgLighter: '#2d2d4a',
    text: '#e0e0e0',
    textMuted: '#888',
    border: '#3d3d5c',
    accent: '#5865F2'
};

function parseJavaFile(content) {
    const items = [];

    // Match register() calls: register(Material.NAME, State.STATE, ItemTag.TAG, ItemTag.TAG2);
    const registerRegex = /register\(Material\.(\w+),\s*State\.(\w+)(?:,\s*ItemTag\.(\w+))?(?:,\s*ItemTag\.(\w+))?(?:,\s*ItemTag\.(\w+))?\)/g;

    let match;
    while ((match = registerRegex.exec(content)) !== null) {
        const [, material, state, tag1, tag2, tag3] = match;
        const tags = [tag1, tag2, tag3].filter(Boolean);
        items.push({
            material,
            state,
            tags,
            displayName: material.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
        });
    }

    return items;
}

function getCache() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
                return data;
            }
        }
    } catch (e) {
        console.error('Cache read error:', e);
    }
    return null;
}

function setCache(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.error('Cache write error:', e);
    }
}

function ItemCard({ item }) {
    const stateColor = COLORS[item.state.toLowerCase()] || COLORS.text;

    return (
        <div style={{
            background: COLORS.bgLight,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '4px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            transition: 'transform 0.15s, box-shadow 0.15s',
            cursor: 'default',
        }}
             onMouseEnter={e => {
                 e.currentTarget.style.transform = 'translateY(-2px)';
                 e.currentTarget.style.boxShadow = `0 4px 12px rgba(0,0,0,0.3)`;
             }}
             onMouseLeave={e => {
                 e.currentTarget.style.transform = 'translateY(0)';
                 e.currentTarget.style.boxShadow = 'none';
             }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <img
                    src={`https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib/${item.material.toLowerCase()}.png`}
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
    const [tagFilters, setTagFilters] = useState({ NETHER: false, END: false, EXTREME: false });
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => {
        async function fetchData() {
            // Check cache first
            const cached = getCache();
            if (cached) {
                setItems(cached.items);
                setLastUpdated(new Date(cached.timestamp));
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(GITHUB_RAW_URL);
                if (!response.ok) throw new Error('Failed to fetch from GitHub');

                const content = await response.text();
                const parsedItems = parseJavaFile(content);

                const cacheData = { items: parsedItems, timestamp: Date.now() };
                setCache(cacheData);
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

            // Tag filters (show items that have ANY of the selected tags)
            const activeTags = Object.entries(tagFilters).filter(([, v]) => v).map(([k]) => k);
            if (activeTags.length > 0 && !activeTags.some(tag => item.tags.includes(tag))) {
                return false;
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
                            {['NETHER', 'END', 'EXTREME'].map(tag => (
                                <FilterButton
                                    key={tag}
                                    active={tagFilters[tag]}
                                    onClick={() => toggleTag(tag)}
                                    color={COLORS[tag.toLowerCase()]}
                                >
                                    {tag} ({stats[tag.toLowerCase()]})
                                </FilterButton>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Results Count */}
                <div style={{
                    marginBottom: '16px',
                    color: COLORS.textMuted,
                    fontSize: '13px'
                }}>
                    Showing {filteredItems.length} of {stats.total} items
                </div>

                {/* Item Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '12px'
                }}>
                    {filteredItems.map(item => (
                        <ItemCard key={item.material} item={item} />
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
        </div>
    );
}