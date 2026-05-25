import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import Search from 'lucide-react/dist/esm/icons/search';
import SearchX from 'lucide-react/dist/esm/icons/search-x';
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3';
import DescriptionEditor from './DescriptionEditor.jsx';
import GitHistory from './GitHistory.jsx';
import ItemPoolManager from './ItemPoolManager.jsx';
import StatisticsDashboard from './StatisticsDashboard.jsx';
import { IMAGE_BASE_URL } from '../../config/constants';
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
} from '../../components/common/UIComponents.jsx';
import Footer from "../../components/common/Footer.jsx";

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/McPlayHDnet/ForceItemBattle/main/src/main/java/forceitembattle/manager/ItemDifficultiesManager.java';
const CONFIG_BASE_URL = 'https://raw.githubusercontent.com/btlmt-de/FIB';
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

// Fetch all Minecraft items from Misode's mcmeta registry
async function fetchMisodeItems(forceRefresh = false) {
    // Clear cache if force refresh requested
    if (forceRefresh) {
        clearMisodeCache();
    }

    // Check cache first
    const cached = getMisodeCache();
    if (cached) {
        console.log('Using cached Misode items data');
        return cached;
    }

    try {
        const response = await fetch(MISODE_ITEMS_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch Misode items: ${response.status}`);
        }

        const rawItems = await response.json();

        // Convert lowercase item names to uppercase (to match pool format)
        const items = rawItems
            .map(item => item.toUpperCase());

        // Cache the result
        setMisodeCache(items);
        console.log(`Fetched ${items.length} items from Misode registry`);

        return items;
    } catch (e) {
        console.error('Error fetching Misode items:', e);
        return [];
    }
}


function ItemCard({ item, onClick, editMode, onEdit, onAddMissing, isSelected, onToggleSelect }) {
    const isMissing = item.isMissing;
    const hasDescription = item.description && item.description.length > 0;
    const isInteractive = isMissing || editMode || hasDescription;

    const stateColors  = { EARLY: 'oklch(62% 0.20 142)', MID: 'oklch(76% 0.16 68)', LATE: 'oklch(62% 0.22 25)' };
    const stateBorders = { EARLY: 'oklch(62% 0.20 142 / 0.45)', MID: 'oklch(76% 0.16 68 / 0.45)', LATE: 'oklch(62% 0.22 25 / 0.45)' };
    const stateBgs     = { EARLY: 'oklch(62% 0.20 142 / 0.12)', MID: 'oklch(76% 0.16 68 / 0.12)', LATE: 'oklch(62% 0.22 25 / 0.12)' };
    const tagColors    = { NETHER: 'oklch(60% 0.20 15)', END: 'oklch(65% 0.15 290)', EXTREME: 'oklch(66% 0.20 45)' };
    const tagBorders   = { NETHER: 'oklch(60% 0.20 15 / 0.45)', END: 'oklch(65% 0.15 290 / 0.45)', EXTREME: 'oklch(66% 0.20 45 / 0.45)' };
    const tagBgs       = { NETHER: 'oklch(60% 0.20 15 / 0.12)', END: 'oklch(65% 0.15 290 / 0.12)', EXTREME: 'oklch(66% 0.20 45 / 0.12)' };

    let cardClass = 'fip2-card';
    if (isInteractive) cardClass += ' interactive';
    if (isSelected)    cardClass += ' selected';
    if (editMode && !isMissing) cardClass += ' edit-mode';

    return (
        <div
            className={cardClass}
            onClick={() => {
                if (isMissing && onToggleSelect) { onToggleSelect(item.material); return; }
                if (editMode) { onEdit(item); }
                else if (hasDescription) { onClick(item); }
            }}
        >
            {/* Corner indicator */}
            {isMissing && (
                <div className={`fip2-card-corner${isSelected ? ' selected-check' : ''}`}>
                    {isSelected
                        ? <Check size={10} style={{ color: 'oklch(17% 0.025 255)' }} />
                        : <Plus size={9} style={{ color: 'oklch(42% 0.013 255)' }} />
                    }
                </div>
            )}
            {editMode && !isMissing && (
                <div className="fip2-card-corner edit-pen">
                    <Pencil size={9} style={{ color: 'oklch(76% 0.16 68)' }} />
                </div>
            )}

            {/* Image + Name */}
            <div className="fip2-card-row">
                <img
                    className="fip2-card-img"
                    src={`${IMAGE_BASE_URL}/${item.material.toLowerCase()}.png`}
                    alt={item.displayName}
                    onError={e => { e.target.onerror = null; e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                />
                <span className="fip2-card-name">{item.displayName}</span>
                {!isMissing && hasDescription && (
                    <Info size={13} className="fip2-card-info-icon" />
                )}
            </div>

            {/* Badges */}
            {!isMissing && (item.state || (item.tags && item.tags.length > 0)) && (
                <div className="fip2-badges">
                    {item.state && (
                        <span className="fip2-badge" style={{
                            background: stateBgs[item.state] || 'oklch(56% 0.013 255 / 0.12)',
                            color: stateColors[item.state] || 'oklch(58% 0.012 255)',
                            borderColor: stateBorders[item.state] || 'oklch(56% 0.013 255 / 0.45)',
                        }}>
                            {item.state.charAt(0) + item.state.slice(1).toLowerCase()}
                        </span>
                    )}
                    {item.tags && item.tags.map(tag => (
                        <span key={tag} className="fip2-badge" style={{
                            background: tagBgs[tag] || 'oklch(56% 0.013 255 / 0.12)',
                            color: tagColors[tag] || 'oklch(58% 0.012 255)',
                            borderColor: tagBorders[tag] || 'oklch(56% 0.013 255 / 0.45)',
                        }}>
                            {tag.charAt(0) + tag.slice(1).toLowerCase()}
                        </span>
                    ))}
                </div>
            )}
            {isMissing && (
                <div className="fip2-badges">
                    <span className="fip2-badge" style={{
                        background: isSelected ? 'oklch(76% 0.16 68 / 0.15)' : 'oklch(22% 0.019 255 / 0.6)',
                        color: isSelected ? 'oklch(76% 0.16 68)' : 'oklch(50% 0.013 255)',
                        borderColor: isSelected ? 'oklch(76% 0.16 68 / 0.4)' : 'oklch(35% 0.018 255)',
                    }}>
                        {isSelected ? 'Selected' : 'Not in pool'}
                    </span>
                </div>
            )}
        </div>
    );
}

function Modal({ item, onClose }) {
    if (!item) return null;
    const stateColors  = { EARLY: 'oklch(62% 0.20 142)', MID: 'oklch(76% 0.16 68)', LATE: 'oklch(62% 0.22 25)' };
    const stateBorders = { EARLY: 'oklch(62% 0.20 142 / 0.45)', MID: 'oklch(76% 0.16 68 / 0.45)', LATE: 'oklch(62% 0.22 25 / 0.45)' };
    const stateBgs     = { EARLY: 'oklch(62% 0.20 142 / 0.12)', MID: 'oklch(76% 0.16 68 / 0.12)', LATE: 'oklch(62% 0.22 25 / 0.12)' };
    const tagColors    = { NETHER: 'oklch(60% 0.20 15)', END: 'oklch(65% 0.15 290)', EXTREME: 'oklch(66% 0.20 45)' };
    const tagBorders   = { NETHER: 'oklch(60% 0.20 15 / 0.45)', END: 'oklch(65% 0.15 290 / 0.45)', EXTREME: 'oklch(66% 0.20 45 / 0.45)' };
    const tagBgs       = { NETHER: 'oklch(60% 0.20 15 / 0.12)', END: 'oklch(65% 0.15 290 / 0.12)', EXTREME: 'oklch(66% 0.20 45 / 0.12)' };

    return (
        <div className="fip2-modal-overlay" onClick={onClose}>
            <div className="fip2-modal" onClick={e => e.stopPropagation()}>
                <div className="fip2-modal-header">
                    <img
                        className="fip2-modal-img"
                        src={`${IMAGE_BASE_URL}/${item.material.toLowerCase()}.png`}
                        alt={item.displayName}
                        onError={e => { e.target.onerror = null; e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                    />
                    <div>
                        <div className="fip2-modal-name">{item.displayName}</div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {item.state && (
                                <span className="fip2-badge" style={{
                                    background: stateBgs[item.state] || 'oklch(56% 0.013 255 / 0.12)',
                                    color: stateColors[item.state] || 'oklch(58% 0.012 255)',
                                    borderColor: stateBorders[item.state] || 'oklch(56% 0.013 255 / 0.45)',
                                }}>
                                    {item.state.charAt(0) + item.state.slice(1).toLowerCase()}
                                </span>
                            )}
                            {item.tags && item.tags.map(tag => (
                                <span key={tag} className="fip2-badge" style={{
                                    background: tagBgs[tag] || 'oklch(56% 0.013 255 / 0.12)',
                                    color: tagColors[tag] || 'oklch(58% 0.012 255)',
                                    borderColor: tagBorders[tag] || 'oklch(56% 0.013 255 / 0.45)',
                                }}>
                                    {tag.charAt(0) + tag.slice(1).toLowerCase()}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="fip2-modal-desc-block">
                    {item.description.map((line, idx) => (
                        <div key={idx} style={{ minHeight: 20 }}>
                            <FormattedText text={line} />
                        </div>
                    ))}
                </div>

                <button
                    onClick={onClose}
                    className="fip2-action"
                    style={{ width: '100%', justifyContent: 'center', padding: '9px' }}
                >
                    Close
                </button>
            </div>
        </div>
    );
}

// Styled info tooltip with hover state
function InfoTooltip({ children, content }) {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [isPositioned, setIsPositioned] = useState(false);
    const triggerRef = useRef(null);
    const tooltipRef = useRef(null);

    const updatePosition = useCallback(() => {
        if (triggerRef.current && tooltipRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();

            // Position below the trigger, centered
            let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
            let top = triggerRect.bottom + 8;

            // Keep within viewport
            if (left < 10) left = 10;
            if (left + tooltipRect.width > window.innerWidth - 10) {
                left = window.innerWidth - tooltipRect.width - 10;
            }

            setPosition({ top, left });
            setIsPositioned(true);
        }
    }, []);

    useEffect(() => {
        if (isVisible) {
            // Use requestAnimationFrame to ensure tooltip is rendered before measuring
            const raf = requestAnimationFrame(() => {
                updatePosition();
            });
            window.addEventListener('scroll', updatePosition);
            window.addEventListener('resize', updatePosition);
            return () => {
                cancelAnimationFrame(raf);
                window.removeEventListener('scroll', updatePosition);
                window.removeEventListener('resize', updatePosition);
                setIsPositioned(false);
            };
        }
    }, [isVisible, updatePosition]);

    return (
        <>
            <div
                ref={triggerRef}
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                style={{ display: 'inline-flex' }}
            >
                {children}
            </div>
            {isVisible && (
                <div
                    ref={tooltipRef}
                    style={{
                        position: 'fixed',
                        top: position.top,
                        left: position.left,
                        zIndex: 10000,
                        opacity: isPositioned ? 1 : 0,
                        transform: isPositioned ? 'translateY(0)' : 'translateY(-4px)',
                        transition: 'opacity 0.15s ease-out, transform 0.15s ease-out',
                    }}
                >
                    {content}
                </div>
            )}
        </>
    );
}

// FilterButton kept for compatibility but layout now uses fip2-chip directly
function FilterButton({ active, onClick, children, color, title }) {
    return (
        <button
            onClick={onClick}
            title={title}
            style={{
                background: active ? `oklch(from ${color || 'oklch(76% 0.16 68)'} l c h / 0.09)` : 'oklch(13% 0.025 255)',
                color: active ? (color || 'oklch(76% 0.16 68)') : 'oklch(50% 0.013 255)',
                border: `1px solid ${active ? `oklch(from ${color || 'oklch(76% 0.16 68)'} l c h / 0.33)` : 'oklch(24% 0.022 255)'}`,
                padding: '5px 10px', borderRadius: '5px', cursor: 'pointer',
                fontSize: '11.5px', fontWeight: '600', textTransform: 'uppercase',
                letterSpacing: '0.5px', whiteSpace: 'nowrap',
                fontFamily: "'Barlow', system-ui, sans-serif",
                transition: 'all 0.1s ease-out',
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
    const [showStatistics, setShowStatistics] = useState(false);
    const [initialPoolItem, setInitialPoolItem] = useState(null); // Pre-selected item for Pool Manager
    const [initialPoolItems, setInitialPoolItems] = useState([]); // Multiple pre-selected items for Pool Manager

    // Missing Items View state
    const [viewMode, setViewMode] = useState('pools'); // 'pools' | 'missing' | 'all'
    const [allMinecraftItems, setAllMinecraftItems] = useState([]);
    const [loadingMisode, setLoadingMisode] = useState(false);
    const [selectedMissingItems, setSelectedMissingItems] = useState(new Set()); // Multi-select for missing items

    // Parse URL params on mount to set initial filters.
    // Params may arrive via window.location.search (/pools?tag=NETHER)
    // or window.location.hash (#pools?tag=NETHER) depending on navigation method.
    useEffect(() => {
        // Prefer search params (standard navigation), fall back to hash params
        let queryString = window.location.search.slice(1);
        if (!queryString) {
            const hash = window.location.hash;
            const queryIndex = hash.indexOf('?');
            if (queryIndex !== -1) queryString = hash.slice(queryIndex + 1);
        }
        if (!queryString) return;

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

    // Manual refresh function - refreshes both branches and data
    const handleRefresh = async () => {
        invalidateCache();
        setLoading(true);
        setError(null);

        try {
            // Refresh branches first
            const branchesResponse = await fetch(BRANCHES_URL + '?t=' + Date.now());
            let effectiveBranch = viewBranch;
            if (branchesResponse.ok) {
                const branchesData = await branchesResponse.json();
                const branchNames = branchesData.map(b => b.name);
                setAvailableBranches(branchNames.length > 0 ? branchNames : [DEFAULT_BRANCH]);
                // Re-validate selected branch
                if (!branchNames.includes(viewBranch)) {
                    effectiveBranch = DEFAULT_BRANCH;
                    setViewBranch(DEFAULT_BRANCH);
                }
            }

            // Then refresh data
            const [javaResponse, configResponse] = await Promise.all([
                fetch(GITHUB_RAW_URL),
                fetch(getConfigUrl(effectiveBranch) + '?t=' + Date.now()) // Cache bust
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
            setCache(cacheData, effectiveBranch);
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

    // Handler to toggle selection of a missing item
    const handleToggleMissingItem = useCallback((material) => {
        setSelectedMissingItems(prev => {
            const next = new Set(prev);
            if (next.has(material)) {
                next.delete(material);
            } else {
                next.add(material);
            }
            return next;
        });
    }, []);

    // Handler to clear all selected missing items
    const handleClearSelectedMissing = useCallback(() => {
        setSelectedMissingItems(new Set());
    }, []);

    // Handler to open Pool Manager with a pre-selected item (single click)
    const handleOpenPoolManagerWithItem = useCallback((material) => {
        setInitialPoolItem(material);
        setInitialPoolItems([]);
        setShowPoolManager(true);
    }, []);

    // Handler to open Pool Manager with multiple pre-selected items
    const handleOpenPoolManagerWithSelectedItems = useCallback(() => {
        if (selectedMissingItems.size === 0) return;
        setInitialPoolItems(Array.from(selectedMissingItems));
        setInitialPoolItem(null);
        setShowPoolManager(true);
    }, [selectedMissingItems]);

    // Handler to close Pool Manager and reset initial items
    const handleClosePoolManager = useCallback(() => {
        setShowPoolManager(false);
        setInitialPoolItem(null);
        setInitialPoolItems([]);
        setSelectedMissingItems(new Set()); // Clear selections after closing
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
                background: 'oklch(17% 0.025 255)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: '16px',
                fontFamily: "'Barlow', system-ui, sans-serif",
            }}>
                <div style={{ color: 'oklch(62% 0.22 25)', fontSize: '16px', fontWeight: 600 }}>
                    Failed to load: {error}
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="fip2-action"
                    style={{ padding: '9px 20px' }}
                >
                    Retry
                </button>
            </div>
        );
    }

    // ── V2 token bridge ──────────────────────────────────────────────────────
    const V = {
        bg:        'oklch(17% 0.025 255)',
        surface:   'oklch(21% 0.023 255)',
        surfHov:   'oklch(25% 0.021 255)',
        border:    'oklch(30% 0.019 255)',
        borderF:   'oklch(24% 0.022 255)',
        text:      'oklch(94% 0.007 255)',
        textMid:   'oklch(74% 0.012 255)',
        muted:     'oklch(58% 0.012 255)',
        dim:       'oklch(42% 0.013 255)',
        amber:     'oklch(76% 0.16 68)',
        early:     'oklch(62% 0.20 142)',
        mid:       'oklch(76% 0.16 68)',
        late:      'oklch(62% 0.22 25)',
        nether:    'oklch(60% 0.20 15)',
        end:       'oklch(65% 0.15 290)',
        extreme:   'oklch(66% 0.20 45)',
        desc:      'oklch(68% 0.12 200)',
    };
    const stateColor = { EARLY: V.early, MID: V.mid, LATE: V.late };
    const tagColor   = { NETHER: V.nether, END: V.end, EXTREME: V.extreme, DESCRIPTION: V.desc };

    // ── V2 CSS ───────────────────────────────────────────────────────────────
    const PAGE_CSS = `
      @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800;900&display=swap');

      .fip2 { font-family: 'Barlow', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }


      /* ── Unified top bar ── */
      .fip2-topbar {
        position: sticky; top: 0; z-index: 40;
        background: oklch(20% 0.024 255);
        backdrop-filter: blur(14px);
        border-bottom: 1px solid oklch(27% 0.020 255);
      }
      /* Row 1: title + actions */
      .fip2-topbar-row1 {
        display: flex; align-items: center; gap: 10px;
        padding: 12px 28px 12px;
        border-bottom: 1px solid oklch(24% 0.022 255);
      }
      .fip2-topbar-title {
        font-family: 'Barlow Condensed', system-ui, sans-serif;
        font-size: 22px; font-weight: 800;
        text-transform: uppercase; letter-spacing: 0.5px;
        color: oklch(94% 0.007 255);
        display: flex; align-items: center; gap: 10px;
      }
      .fip2-topbar-count {
        display: inline-flex; align-items: center;
        padding: 2px 10px; border-radius: 4px;
        background: oklch(76% 0.16 68 / 0.10);
        border: 1px solid oklch(76% 0.16 68 / 0.25);
        font-size: 12px; font-weight: 700;
        color: oklch(76% 0.16 68);
        letter-spacing: 0.5px;
        font-family: 'Barlow', system-ui, sans-serif;
      }
      .fip2-topbar-actions { display: flex; align-items: center; gap: 6px; margin-left: auto; }

      /* Row 2: filters */
      .fip2-topbar-row2 {
        display: flex; align-items: center; gap: 8px;
        padding: 9px 28px;
        overflow-x: auto; overflow-y: hidden; scrollbar-width: none;
        background: oklch(18.5% 0.024 255);
      }
      .fip2-topbar-row2::-webkit-scrollbar { display: none; }

      .fip2-filter-sep { width: 1px; height: 20px; background: oklch(28% 0.019 255); flex-shrink: 0; margin: 0 4px; }

      /* Filter group — chips share one contained pill row */
      .fip2-filter-group {
        display: inline-flex; align-items: center; gap: 2px;
        background: oklch(15% 0.025 255);
        border: 1px solid oklch(26% 0.020 255);
        border-radius: 6px; padding: 3px;
        flex-shrink: 0;
      }
      .fip2-filter-label {
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 1.5px; color: oklch(40% 0.013 255);
        white-space: nowrap; flex-shrink: 0; padding: 0 6px;
        display: flex; align-items: center; gap: 4px;
        border-right: 1px solid oklch(26% 0.020 255); margin-right: 2px;
      }

      /* ── View toggle ── */
      .fip2-view-toggle {
        display: flex; align-items: center;
        background: oklch(15% 0.025 255);
        border: 1px solid oklch(26% 0.020 255);
        border-radius: 6px; overflow: hidden; flex-shrink: 0;
      }
      .fip2-view-btn {
        display: flex; align-items: center; gap: 5px; padding: 5px 13px;
        background: none; border: none; cursor: pointer;
        font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
        color: oklch(44% 0.013 255);
        transition: background 0.12s ease-out, color 0.12s ease-out;
        white-space: nowrap; font-family: 'Barlow', system-ui, sans-serif;
      }
      .fip2-view-btn.active { background: oklch(26% 0.021 255); color: oklch(94% 0.007 255); }
      .fip2-view-btn:not(.active):hover { color: oklch(74% 0.012 255); }

      /* ── Filter chip — inside a filter group ── */
      .fip2-chip {
        display: inline-flex; align-items: center; gap: 4px; padding: 4px 9px;
        background: transparent; border: none; border-radius: 4px; cursor: pointer;
        font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
        color: oklch(48% 0.013 255);
        transition: background 0.1s, color 0.1s;
        white-space: nowrap; flex-shrink: 0; font-family: 'Barlow', system-ui, sans-serif;
      }
      .fip2-chip.active { color: oklch(94% 0.007 255); }
      .fip2-chip:not(.active):hover { color: oklch(74% 0.012 255); background: oklch(22% 0.022 255); }

      /* ── Sort select ── */
      .fip2-sort-wrap { position: relative; flex-shrink: 0; }
      .fip2-sort {
        appearance: none;
        background: oklch(15% 0.025 255);
        border: 1px solid oklch(26% 0.020 255); border-radius: 5px;
        padding: 5px 26px 5px 10px; color: oklch(60% 0.012 255);
        font-size: 11.5px; font-weight: 600; cursor: pointer; outline: none;
        font-family: 'Barlow', system-ui, sans-serif;
        text-transform: uppercase; letter-spacing: 0.5px;
        transition: border-color 0.12s, color 0.12s;
      }
      .fip2-sort:hover { border-color: oklch(36% 0.016 255); color: oklch(80% 0.009 255); }
      .fip2-sort-arrow { position: absolute; right: 7px; top: 50%; transform: translateY(-50%); pointer-events: none; color: oklch(42% 0.013 255); }

      /* ── Small ghost button (topbar) ── */
      .fip2-action {
        display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px;
        background: none; border: 1px solid oklch(28% 0.019 255);
        border-radius: 6px; cursor: pointer;
        font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
        color: oklch(52% 0.013 255);
        transition: border-color 0.12s ease-out, color 0.12s ease-out, background 0.12s ease-out;
        white-space: nowrap; font-family: 'Barlow', system-ui, sans-serif;
      }
      .fip2-action:hover { color: oklch(94% 0.007 255); border-color: oklch(44% 0.014 255); background: oklch(25% 0.021 255); }
      .fip2-action.active { color: oklch(94% 0.007 255); border-color: oklch(76% 0.16 68 / 0.45); background: oklch(76% 0.16 68 / 0.10); }
      .fip2-action:disabled { opacity: 0.4; cursor: not-allowed; }
      /* Primary action — amber tint */
      .fip2-action.primary {
        color: oklch(76% 0.16 68);
        border-color: oklch(76% 0.16 68 / 0.35);
        background: oklch(76% 0.16 68 / 0.07);
      }
      .fip2-action.primary:hover {
        color: oklch(82% 0.16 68);
        border-color: oklch(76% 0.16 68 / 0.60);
        background: oklch(76% 0.16 68 / 0.14);
      }

      /* ── Search + primary action row ── */
      .fip2-search-row { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
      .fip2-search-wrap { position: relative; flex: 1; }
      .fip2-search {
        width: 100%; box-sizing: border-box;
        background: oklch(21% 0.023 255); border: 1px solid oklch(30% 0.019 255);
        border-radius: 8px; padding: 10px 14px 10px 40px;
        color: oklch(94% 0.007 255); font-size: 14px; outline: none;
        transition: border-color 0.12s ease-out, background 0.12s ease-out;
        font-family: 'Barlow', system-ui, sans-serif;
      }
      .fip2-search:focus { border-color: oklch(44% 0.014 255); background: oklch(22.5% 0.022 255); }
      .fip2-search::placeholder { color: oklch(42% 0.013 255); }
      .fip2-search-icon {
        position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
        pointer-events: none; color: oklch(50% 0.013 255);
      }
      .fip2-search-btn {
        display: inline-flex; align-items: center; gap: 7px;
        padding: 10px 16px; flex-shrink: 0;
        background: oklch(21% 0.023 255); border: 1px solid oklch(30% 0.019 255);
        border-radius: 8px; cursor: pointer;
        font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
        color: oklch(60% 0.013 255);
        transition: border-color 0.12s ease-out, color 0.12s ease-out, background 0.12s ease-out;
        white-space: nowrap; font-family: 'Barlow', system-ui, sans-serif;
      }
      .fip2-search-btn:hover { color: oklch(94% 0.007 255); border-color: oklch(44% 0.014 255); background: oklch(25% 0.021 255); }
      .fip2-search-btn.active { color: oklch(94% 0.007 255); border-color: oklch(76% 0.16 68); background: oklch(76% 0.16 68 / 0.10); }
      .fip2-search-btn.primary { border-color: oklch(76% 0.16 68 / 0.35); color: oklch(76% 0.16 68); }
      .fip2-search-btn.primary:hover { background: oklch(76% 0.16 68 / 0.12); border-color: oklch(76% 0.16 68 / 0.6); }

      /* ── Results meta ── */
      .fip2-meta {
        padding: 5px 28px;
        font-size: 11.5px; color: oklch(42% 0.013 255);
        display: flex; align-items: center; gap: 8px;
        border-bottom: 1px solid oklch(24% 0.022 255);
      }
      .fip2-meta a, .fip2-meta button.fip2-inline-link {
        color: oklch(60% 0.09 200); background: none; border: none; padding: 0;
        font-size: 11.5px; cursor: pointer; text-decoration: underline;
      }

      /* ── Item grid ── */
      .fip2-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 8px;
      }

      /* ── Item card ── */
      .fip2-card {
        background: oklch(21% 0.023 255);
        border: 1px solid oklch(30% 0.019 255);
        border-radius: 8px;
        padding: 14px 14px 12px;
        display: flex; flex-direction: column; gap: 9px;
        position: relative;
        transition: background 0.1s ease-out, border-color 0.1s ease-out;
        cursor: default;
      }
      .fip2-card.interactive { cursor: pointer; }
      .fip2-card.interactive:hover { background: oklch(25% 0.021 255); border-color: oklch(35% 0.016 255); }
      .fip2-card.selected { background: oklch(76% 0.16 68 / 0.07); border-color: oklch(76% 0.16 68 / 0.35); }
      .fip2-card.edit-mode { cursor: pointer; }
      .fip2-card.edit-mode:hover { background: oklch(76% 0.16 68 / 0.06); border-color: oklch(76% 0.16 68 / 0.3); }

      .fip2-card-row { display: flex; align-items: center; gap: 9px; }
      .fip2-card-img { width: 40px; height: 40px; image-rendering: pixelated; flex-shrink: 0; }
      .fip2-card-name {
        font-size: 14px; font-weight: 500; line-height: 1.25;
        color: oklch(88% 0.009 255); flex: 1; min-width: 0;
      }
      .fip2-card-info-icon { color: oklch(68% 0.12 200); flex-shrink: 0; opacity: 0.7; }

      .fip2-badges { display: flex; gap: 5px; flex-wrap: wrap; }
      .fip2-badge {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 2px 7px;
        border-radius: 4px;
        border: 1px solid transparent;
        font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
        font-family: 'Barlow Condensed', system-ui, sans-serif;
        line-height: 1.4;
      }

      /* ── Card corner indicators ── */
      .fip2-card-corner {
        position: absolute; top: 7px; right: 7px;
        width: 16px; height: 16px; border-radius: 3px;
        border: 1px solid oklch(30% 0.019 255);
        background: oklch(13% 0.025 255);
        display: flex; align-items: center; justify-content: center;
        transition: all 0.1s ease-out;
      }
      .fip2-card-corner.selected-check {
        background: oklch(76% 0.16 68);
        border-color: oklch(76% 0.16 68);
      }
      .fip2-card-corner.edit-pen {
        background: oklch(76% 0.16 68 / 0.15);
        border-color: oklch(76% 0.16 68 / 0.4);
      }

      /* ── Floating selection bar ── */
      @keyframes fip-slide-up { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      .fip2-sel-bar {
        position: fixed; bottom: 24px; left: 50%;
        transform: translateX(-50%);
        background: oklch(21% 0.023 255);
        border: 1px solid oklch(30% 0.019 255);
        border-radius: 8px;
        padding: 10px 16px;
        display: flex; align-items: center; gap: 12px;
        box-shadow: 0 8px 32px oklch(4% 0.019 255 / 0.7);
        z-index: 100;
        animation: fip-slide-up 0.18s cubic-bezier(0.16, 1, 0.3, 1) both;
        font-family: 'Barlow', system-ui, sans-serif;
      }

      /* ── Modal ── */
      .fip2-modal-overlay {
        position: fixed; inset: 0;
        background: oklch(4% 0.019 255 / 0.85);
        display: flex; align-items: center; justify-content: center;
        z-index: 1000; padding: 20px;
      }
      .fip2-modal {
        background: oklch(21% 0.023 255);
        border: 1px solid oklch(30% 0.019 255);
        border-radius: 10px;
        padding: 24px;
        max-width: 500px; width: 100%;
        max-height: 80vh; overflow-y: auto;
        font-family: 'Barlow', system-ui, sans-serif;
      }
      .fip2-modal-header {
        display: flex; align-items: center; gap: 14px;
        margin-bottom: 18px; padding-bottom: 16px;
        border-bottom: 1px solid oklch(24% 0.022 255);
      }
      .fip2-modal-img {
        width: 56px; height: 56px;
        image-rendering: pixelated;
        border: 1px solid oklch(30% 0.019 255);
        border-radius: 6px;
        background: oklch(13% 0.025 255);
        flex-shrink: 0;
      }
      .fip2-modal-name {
        font-family: 'Barlow Condensed', system-ui, sans-serif;
        font-size: 20px; font-weight: 800; text-transform: uppercase;
        color: oklch(94% 0.007 255); margin: 0 0 8px;
      }
      .fip2-modal-desc-block {
        background: oklch(13% 0.025 255);
        border: 1px solid oklch(24% 0.022 255);
        border-radius: 6px; padding: 14px 16px;
        font-family: 'Courier New', monospace;
        font-size: 13.5px; line-height: 1.7;
        margin-bottom: 18px;
      }

      /* ── Tooltip ── */
      .fip2-tooltip {
        background: oklch(25% 0.021 255);
        border: 1px solid oklch(30% 0.019 255);
        border-radius: 8px; padding: 14px 16px;
        max-width: 340px;
        box-shadow: 0 8px 32px oklch(4% 0.019 255 / 0.5);
        font-family: 'Barlow', system-ui, sans-serif;
      }
      .fip2-tooltip-title {
        font-family: 'Barlow Condensed', system-ui, sans-serif;
        font-size: 13px; font-weight: 700; text-transform: uppercase;
        color: oklch(94% 0.007 255); margin: 0 0 10px; letter-spacing: 0.3px;
      }

      /* ── Timing widget (inside tooltip) ── */
      .fip2-timing {
        display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        background: oklch(13% 0.025 255);
        border: 1px solid oklch(24% 0.022 255);
        border-radius: 6px; padding: 6px 10px;
        cursor: help;
      }
      .fip2-timing-label {
        font-size: 10.5px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 1.5px; color: oklch(42% 0.013 255);
        display: flex; align-items: center; gap: 4px;
        padding-right: 8px; border-right: 1px solid oklch(30% 0.019 255);
        white-space: nowrap;
      }
      .fip2-timing-items { display: flex; gap: 10px; }
      .fip2-timing-item { display: flex; align-items: center; gap: 5px; font-size: 12px; }
      .fip2-timing-dot { width: 7px; height: 7px; border-radius: 2px; flex-shrink: 0; }
      .fip2-timing-name { color: oklch(74% 0.012 255); font-weight: 500; }
      .fip2-timing-pct { color: oklch(42% 0.013 255); }
      .fip2-timing-ex {
        font-size: 11px; color: oklch(42% 0.013 255);
        border-left: 1px solid oklch(30% 0.019 255);
        padding-left: 10px; margin-left: 2px; white-space: nowrap;
      }

      /* ── Unlock bar ── */
      .fip2-unlock-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
      .fip2-unlock-swatch { width: 9px; height: 9px; border-radius: 2px; flex-shrink: 0; }
      .fip2-unlock-text { font-size: 13px; color: oklch(74% 0.012 255); }
      .fip2-unlock-note {
        font-size: 11px; color: oklch(58% 0.012 255);
        background: oklch(13% 0.025 255);
        border: 1px solid oklch(24% 0.022 255);
        border-radius: 5px; padding: 7px 10px; margin-top: 4px;
      }

      /* ── Content area ── */
      .fip2-content { padding: 20px 28px 48px; max-width: 1400px; margin: 0 auto; }

      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes fib-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }

      @media (max-width: 640px) {
        .fip2-topbar { padding: 8px 16px; }
        .fip2-topbar-count { display: none; }
        .fip2-topbar-actions .fip2-action span { display: none; }
        .fip2-filters { padding: 10px 16px; }
        .fip2-meta { padding: 8px 16px; }
        .fip2-content { padding: 16px 16px 48px; }
        .fip2-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
      }
    `;

    return (
        <div className="fip2" style={{ minHeight: '100vh', background: 'oklch(17% 0.025 255)', color: 'oklch(94% 0.007 255)' }}>
            <style>{PAGE_CSS}</style>
            {/* Modal */}
            <Modal item={selectedItem} onClose={() => setSelectedItem(null)} />

            {/* ── Unified top bar ── */}
            <div className="fip2-topbar">

                {/* Row 1: title + actions */}
                <div className="fip2-topbar-row1">
                    <div className="fip2-topbar-title">
                        Item Pools
                        {stats.total > 0 && (
                            <span className="fip2-topbar-count">{stats.total} items</span>
                        )}
                    </div>
                    <div className="fip2-topbar-actions">
                        <button className="fip2-action" onClick={handleRefresh} disabled={loading}>
                            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                            Refresh
                        </button>
                        <button className="fip2-action" onClick={() => setShowHistory(true)}>
                            <History size={12} />
                            History
                        </button>
                        <button className="fip2-action" onClick={() => setShowStatistics(true)}>
                            <BarChart3 size={12} />
                            Stats
                        </button>
                        <a
                            href="https://github.com/McPlayHDnet/ForceItemBattle"
                            target="_blank" rel="noopener noreferrer"
                            className="fip2-action"
                            style={{ textDecoration: 'none' }}
                        >
                            <ExternalLink size={12} />
                            GitHub
                        </a>
                    </div>
                </div>

                {/* Row 2: filters */}
                <div className="fip2-topbar-row2">

                    {/* View toggle */}
                    <div className="fip2-view-toggle">
                        {[
                            { value: 'pools',   label: 'In Pools', icon: <Package size={11} />,   count: stats.total },
                            { value: 'missing', label: 'Missing',  icon: <PackageX size={11} />, count: stats.missing },
                        ].map(opt => (
                            <button
                                key={opt.value}
                                className={`fip2-view-btn${viewMode === opt.value ? ' active' : ''}`}
                                onClick={() => setViewMode(opt.value)}
                            >
                                {opt.icon} {opt.label}
                                <span style={{ opacity: 0.45, fontWeight: 400 }}>({opt.count})</span>
                            </button>
                        ))}
                    </div>

                    {viewMode === 'pools' && (
                        <>
                            <div className="fip2-filter-sep" />

                            {/* Stage filter group */}
                            <div className="fip2-filter-group">
                                <InfoTooltip content={
                                    <div className="fip2-tooltip">
                                        <div className="fip2-tooltip-title">Dynamic Item Pools</div>
                                        <p style={{ fontSize: 13, color: 'oklch(58% 0.012 255)', margin: '0 0 12px', lineHeight: 1.6 }}>
                                            Items unlock progressively as the game progresses, preventing late-game items from appearing too early.
                                        </p>
                                        {[
                                            { state: 'EARLY', label: 'Early', pct: '0%',  col: V.early },
                                            { state: 'MID',   label: 'Mid',   pct: '11%', col: V.mid },
                                            { state: 'LATE',  label: 'Late',  pct: '29%', col: V.late },
                                        ].map(r => (
                                            <div className="fip2-unlock-row" key={r.state}>
                                                <span className="fip2-unlock-swatch" style={{ background: r.col }} />
                                                <span className="fip2-unlock-text">
                                                    <strong style={{ color: r.col }}>{r.label}</strong> — unlocks at {r.pct} of game time
                                                </span>
                                            </div>
                                        ))}
                                        <div className="fip2-unlock-note">45-min game: Early immediately, Mid at ~5 min, Late at ~13 min.</div>
                                    </div>
                                }>
                                    <span className="fip2-filter-label" style={{ cursor: 'help' }}>
                                        Stage <Info size={9} style={{ opacity: 0.6 }} />
                                    </span>
                                </InfoTooltip>

                                {['ALL', 'EARLY', 'MID', 'LATE'].map(s => {
                                    const col = s === 'ALL' ? V.muted : stateColor[s];
                                    const active = stateFilter === s;
                                    return (
                                        <button
                                            key={s}
                                            className={`fip2-chip${active ? ' active' : ''}`}
                                            onClick={() => setStateFilter(s)}
                                            style={active ? { background: col + '20', color: col } : {}}
                                        >
                                            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                                            {s !== 'ALL' && <span style={{ opacity: 0.45, fontWeight: 400 }}>{stats[s.toLowerCase()]}</span>}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="fip2-filter-sep" />

                            {/* Tag filter group */}
                            <div className="fip2-filter-group">
                                <span className="fip2-filter-label">Tags</span>
                                {[
                                    { key: 'NETHER',      label: 'Nether' },
                                    { key: 'END',         label: 'End' },
                                    { key: 'EXTREME',     label: 'Extreme' },
                                    { key: 'DESCRIPTION', label: 'Has Info' },
                                ].map(t => {
                                    const col = tagColor[t.key];
                                    const active = tagFilters[t.key];
                                    return (
                                        <button
                                            key={t.key}
                                            className={`fip2-chip${active ? ' active' : ''}`}
                                            onClick={() => toggleTag(t.key)}
                                            style={active ? { background: col + '20', color: col } : {}}
                                        >
                                            {t.label}
                                            <span style={{ opacity: 0.45, fontWeight: 400 }}>{stats[t.key.toLowerCase()]}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <div className="fip2-sort-wrap">
                            <select className="fip2-sort" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                                <option value="name">A–Z</option>
                                <option value="state">Stage</option>
                                <option value="hasInfo">Has Info</option>
                            </select>
                            <ChevronDown size={10} className="fip2-sort-arrow" />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <GitBranch size={10} style={{ color: 'oklch(42% 0.013 255)', flexShrink: 0 }} />
                            <div className="fip2-sort-wrap">
                                <select
                                    className="fip2-sort"
                                    value={viewBranch}
                                    onChange={e => handleViewBranchChange(e.target.value)}
                                    disabled={loading}
                                    style={viewBranch !== DEFAULT_BRANCH ? { borderColor: 'oklch(76% 0.16 68 / 0.5)', color: 'oklch(76% 0.16 68)' } : {}}
                                >
                                    {availableBranches.map(b => (
                                        <option key={b} value={b}>{b === DEFAULT_BRANCH ? 'main' : b}</option>
                                    ))}
                                </select>
                                <ChevronDown size={10} className="fip2-sort-arrow" />
                            </div>
                        </div>
                        {activeFilterCount > 0 && (
                            <button className="fip2-action" onClick={clearAllFilters} style={{ padding: '4px 9px' }}>
                                <X size={10} /> Clear {activeFilterCount}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <div className="fip2-meta">
                {filteredItems.length === 0 && activeFilterCount > 0 ? (
                    <>
                        <SearchX size={13} style={{ color: 'oklch(68% 0.20 45)' }} />
                        <span style={{ color: 'oklch(68% 0.20 45)' }}>No items match your filters.</span>
                        <button className="fip2-inline-link" onClick={clearAllFilters}>Clear filters</button>
                    </>
                ) : (
                    <>
                        <span>
                            Showing {filteredItems.length} of {viewMode === 'pools' ? stats.total : stats.missing} items
                        </span>
                        {activeFilterCount > 0 && <span>({activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active)</span>}
                    </>
                )}
                {viewMode === 'pools' && stats.description > 0 && !editMode && filteredItems.length > 0 && (
                    <span className="fip2-meta-hint" style={{ color: V.desc }}>Click items with <Info size={11} style={{ verticalAlign: 'middle', margin: '0 2px' }} /> for details</span>
                )}
                {viewMode === 'pools' && editMode && filteredItems.length > 0 && (
                    <span style={{ color: V.amber }}>Click any item to edit its description</span>
                )}
                {loadingMisode && viewMode === 'missing' && (
                    <span>Loading Minecraft item registry...</span>
                )}
            </div>

            {/* ── Main content ── */}
            <div className="fip2-content">
                {/* Search + primary actions row */}
                <div className="fip2-search-row">
                    <div className="fip2-search-wrap">
                        <Search size={15} className="fip2-search-icon" />
                        <input
                            className="fip2-search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={viewMode === 'missing' ? 'Search missing items...' : 'Search items...'}
                            autoComplete="off"
                        />
                    </div>
                    {viewMode === 'pools' && (
                        <button
                            className={`fip2-search-btn${editMode ? ' active' : ''}`}
                            onClick={() => setEditMode(!editMode)}
                        >
                            {editMode ? <Check size={14} /> : <Pencil size={14} />}
                            {editMode ? 'Done editing' : 'Edit descriptions'}
                        </button>
                    )}
                    <button
                        className="fip2-search-btn primary"
                        onClick={() => setShowPoolManager(true)}
                    >
                        <Package size={14} />
                        Manage Pools
                    </button>
                </div>

                {/* Floating Selection Bar */}
                {selectedMissingItems.size > 0 && viewMode === 'missing' && (
                    <div className="fip2-sel-bar">
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'oklch(94% 0.007 255)' }}>
                            {selectedMissingItems.size} item{selectedMissingItems.size !== 1 ? 's' : ''} selected
                        </span>
                        <button className="fip2-action" onClick={handleClearSelectedMissing}>
                            <X size={13} /> Clear
                        </button>
                        <button
                            className="fip2-action"
                            onClick={handleOpenPoolManagerWithSelectedItems}
                            style={{ borderColor: 'oklch(76% 0.16 68 / 0.5)', color: 'oklch(76% 0.16 68)' }}
                        >
                            <Plus size={13} /> Add to Pool
                        </button>
                    </div>
                )}

                {/* Item Grid */}
                {loading ? (
                    <SkeletonGrid count={12} />
                ) : (
                    <div
                        className="fip2-grid"
                        style={{ paddingBottom: selectedMissingItems.size > 0 ? 80 : 0 }}
                    >
                        {filteredItems.map(item => (
                            <ItemCard
                                key={item.material}
                                item={item}
                                onClick={setSelectedItem}
                                editMode={editMode}
                                onEdit={setEditItem}
                                onAddMissing={handleOpenPoolManagerWithItem}
                                isSelected={selectedMissingItems.has(item.material)}
                                onToggleSelect={handleToggleMissingItem}
                            />
                        ))}
                    </div>
                )}

                {filteredItems.length === 0 && !loading && (
                    // Show loading indicator while fetching Minecraft registry for missing view
                    viewMode === 'missing' && loadingMisode ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            color: 'oklch(42% 0.013 255)',
                        }}>
                            <RefreshCw
                                size={28}
                                style={{
                                    animation: 'spin 1s linear infinite',
                                    marginBottom: '16px',
                                    opacity: 0.4,
                                }}
                            />
                            <div style={{ fontSize: '13px' }}>
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
                <Footer />
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
                    initialExpandedItems={initialPoolItems}
                />
            )}

            {/* Statistics Dashboard Modal */}
            {showStatistics && (
                <StatisticsDashboard
                    items={items}
                    missingItems={missingItems}
                    onClose={() => setShowStatistics(false)}
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