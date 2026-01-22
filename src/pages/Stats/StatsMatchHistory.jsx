import React, { useState, useEffect } from 'react';
import History from 'lucide-react/dist/esm/icons/history';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Timer from 'lucide-react/dist/esm/icons/timer';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Package from 'lucide-react/dist/esm/icons/package';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import SkipForward from 'lucide-react/dist/esm/icons/skip-forward';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';

import { STATS_COLORS as COLORS, MC_FONT, MOCK_PLAYERS, PLAYERS_BY_NAME, formatDuration, formatDate, IMAGE_BASE_URL } from './statsUtils.js';

// Pool colors matching UIComponents.jsx
const POOL_COLORS = {
    early: '#55FF55',
    mid: '#FFFF55',
    late: '#FF5555',
};

// ============================================================================
// MOCK DATA - Replace with API calls
// ============================================================================

const generateMockMatches = () => {
    const matches = [];

    for (let i = 0; i < 15; i++) {
        // Generate 2-4 teams per match
        const teamCount = Math.floor(Math.random() * 3) + 2;
        const usedPlayers = new Set();
        const teams = [];

        for (let t = 0; t < teamCount; t++) {
            // 1-2 players per team
            const isTeam = Math.random() > 0.4;
            const teamPlayers = [];

            const getUnusedPlayer = () => {
                const available = MOCK_PLAYERS.filter(p => !usedPlayers.has(p.id));
                if (available.length === 0) return null;
                const player = available[Math.floor(Math.random() * available.length)];
                usedPlayers.add(player.id);
                return player;
            };

            const p1 = getUnusedPlayer();
            if (p1) teamPlayers.push(p1);

            if (isTeam) {
                const p2 = getUnusedPlayer();
                if (p2) teamPlayers.push(p2);
            }

            if (teamPlayers.length > 0) {
                const itemsFound = Math.floor(Math.random() * 40) + 10;
                const itemsSkipped = Math.floor(Math.random() * 5);

                teams.push({
                    id: `team_${i}_${t}`,
                    players: teamPlayers,
                    score: Math.floor(Math.random() * 20) + 5,
                    itemsFound,
                    itemsSkipped,
                    placement: 0, // Will be set after sorting
                    items: generateMockTeamItems(itemsFound, itemsSkipped),
                });
            }
        }

        // Sort teams by score and assign placements (use toSorted for immutability)
        const sortedTeams = teams.toSorted((a, b) => b.score - a.score);
        sortedTeams.forEach((team, idx) => {
            team.placement = idx + 1;
        });

        const duration = Math.floor(Math.random() * 1800) + 600; // 10-40 minutes

        matches.push({
            id: `match_${i}`,
            date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            duration,
            teams: sortedTeams,
            totalItems: sortedTeams.reduce((sum, t) => sum + t.itemsFound, 0),
        });
    }

    // Use toSorted for immutability
    return matches.toSorted((a, b) => new Date(b.date) - new Date(a.date));
};

const generateMockTeamItems = (foundCount, skippedCount) => {
    const items = [];
    const itemPool = [
        // Early pool items
        { name: 'Oak Log', texture: 'oak_log', pool: 'early' },
        { name: 'Cobblestone', texture: 'cobblestone', pool: 'early' },
        { name: 'Wheat Seeds', texture: 'wheat_seeds', pool: 'early' },
        { name: 'Wooden Pickaxe', texture: 'wooden_pickaxe', pool: 'early' },
        { name: 'Crafting Table', texture: 'crafting_table', pool: 'early' },
        { name: 'Torch', texture: 'torch', pool: 'early' },
        // Mid pool items
        { name: 'Iron Pickaxe', texture: 'iron_pickaxe', pool: 'mid' },
        { name: 'Bow', texture: 'bow', pool: 'mid' },
        { name: 'Shield', texture: 'shield', pool: 'mid' },
        { name: 'Golden Apple', texture: 'golden_apple', pool: 'mid' },
        { name: 'Ender Pearl', texture: 'ender_pearl', pool: 'mid' },
        { name: 'Blaze Rod', texture: 'blaze_rod', pool: 'mid' },
        // Late pool items
        { name: 'Diamond Sword', texture: 'diamond_sword', pool: 'late' },
        { name: 'Enchanted Book', texture: 'enchanted_book', pool: 'late' },
        { name: 'Totem of Undying', texture: 'totem_of_undying', pool: 'late' },
        { name: 'Elytra', texture: 'elytra', pool: 'late' },
        { name: 'Nether Star', texture: 'nether_star', pool: 'late' },
        { name: 'Beacon', texture: 'beacon', pool: 'late' },
    ];

    let gameTime = 0;

    for (let i = 0; i < foundCount + skippedCount; i++) {
        const isSkipped = i >= foundCount;
        const timeDelta = Math.floor(Math.random() * 120) + 10; // 10-130 seconds between items
        gameTime += timeDelta;

        const itemData = itemPool[Math.floor(Math.random() * itemPool.length)];

        items.push({
            id: `item_${i}`,
            ...itemData,
            gameTime,
            skipped: isSkipped,
        });
    }

    return items;
};

// ============================================================================
// POOL COLOR HELPER
// ============================================================================

const getPoolColor = (pool) => {
    return POOL_COLORS[pool] || COLORS.text;
};

// ============================================================================
// MINECRAFT INVENTORY GRID COMPONENT
// ============================================================================

const GRID_COLS = 9;
const GRID_ROWS = 6;
const SLOT_SIZE = 64;
const SLOT_GAP = 6;

function InventorySlot({ item, index, formatDuration }) {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const slotRef = React.useRef(null);

    const handleMouseEnter = (e) => {
        setShowTooltip(true);
        const rect = slotRef.current.getBoundingClientRect();
        setTooltipPos({
            x: rect.left + rect.width / 2,
            y: rect.top - 8,
        });
    };

    const handleMouseLeave = () => {
        setShowTooltip(false);
    };

    const poolColor = item ? getPoolColor(item.pool) : COLORS.border;
    const glowColor = item
        ? (item.skipped ? COLORS.red : poolColor)
        : COLORS.border;

    return (
        <>
            <div
                ref={slotRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={{
                    width: SLOT_SIZE,
                    height: SLOT_SIZE,
                    background: COLORS.bgLight,
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    cursor: item ? 'pointer' : 'default',
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    border: `1px solid ${item ? glowColor + '33' : COLORS.border}44`,
                }}
                onMouseOver={(e) => {
                    if (item) {
                        e.currentTarget.style.transform = 'scale(1.12)';
                        e.currentTarget.style.background = COLORS.bgLighter;
                        e.currentTarget.style.boxShadow = `0 0 16px ${glowColor}44`;
                        e.currentTarget.style.borderColor = glowColor;
                        e.currentTarget.style.zIndex = '10';
                    }
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.background = COLORS.bgLight;
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = `${item ? glowColor + '33' : COLORS.border}44`;
                    e.currentTarget.style.zIndex = '1';
                }}
            >
                {item && (
                    <>
                        <img
                            src={`${IMAGE_BASE_URL}/${item.texture}.png`}
                            alt={item.name}
                            style={{
                                width: '44px',
                                height: '44px',
                                imageRendering: 'pixelated',
                                opacity: item.skipped ? 0.85 : 1,
                                position: 'relative',
                                zIndex: 1,
                            }}
                            onError={(e) => {
                                e.target.src = `${IMAGE_BASE_URL}/barrier.png`;
                            }}
                        />
                        {/* Enchantment glint overlay - masked to item shape */}
                        {item.skipped && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: '44px',
                                    height: '44px',
                                    WebkitMaskImage: `url(${IMAGE_BASE_URL}/${item.texture}.png)`,
                                    maskImage: `url(${IMAGE_BASE_URL}/${item.texture}.png)`,
                                    WebkitMaskSize: '44px 44px',
                                    maskSize: '44px 44px',
                                    WebkitMaskRepeat: 'no-repeat',
                                    maskRepeat: 'no-repeat',
                                    WebkitMaskPosition: 'center',
                                    maskPosition: 'center',
                                    imageRendering: 'pixelated',
                                    overflow: 'hidden',
                                    pointerEvents: 'none',
                                    zIndex: 2,
                                    /* Constant subtle purple tint so it always looks enchanted */
                                    backgroundColor: 'rgba(120, 80, 200, 0.15)',
                                }}
                            >
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '-100%',
                                        left: '-100%',
                                        width: '300%',
                                        height: '300%',
                                        background: `linear-gradient(
                                            -50deg,
                                            transparent 0%,
                                            transparent 35%,
                                            rgba(160, 100, 255, 0.5) 42%,
                                            rgba(120, 160, 255, 0.7) 50%,
                                            rgba(160, 100, 255, 0.5) 58%,
                                            transparent 65%,
                                            transparent 100%
                                        )`,
                                        animation: 'enchantGlint 1.5s linear infinite',
                                    }}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Tooltip */}
            {showTooltip && item && (
                <div
                    style={{
                        position: 'fixed',
                        left: tooltipPos.x,
                        top: tooltipPos.y,
                        transform: 'translate(-50%, -100%)',
                        zIndex: 1000,
                        pointerEvents: 'none',
                    }}
                >
                    <div
                        style={{
                            background: `linear-gradient(135deg, ${COLORS.bgLighter} 0%, ${COLORS.bgLight} 100%)`,
                            border: `2px solid ${item.skipped ? COLORS.red : poolColor}`,
                            borderRadius: '8px',
                            padding: '10px 14px',
                            minWidth: '140px',
                            boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 20px ${item.skipped ? COLORS.red : poolColor}33`,
                        }}
                    >
                        {/* Item name */}
                        <div
                            style={{
                                color: item.skipped ? COLORS.red : poolColor,
                                fontSize: '14px',
                                fontWeight: '600',
                                marginBottom: '4px',
                                textAlign: 'center',
                                textDecoration: item.skipped ? 'line-through' : 'none',
                                textShadow: `0 0 8px ${poolColor}40`,
                            }}
                        >
                            {item.name}
                        </div>
                        {/* Pool badge */}
                        <div
                            style={{
                                textAlign: 'center',
                                marginBottom: '8px',
                            }}
                        >
                            <span
                                style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    background: `${poolColor}22`,
                                    border: `1px solid ${poolColor}44`,
                                    color: poolColor,
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}
                            >
                                {item.pool}
                            </span>
                        </div>
                        {/* Timestamp */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                color: COLORS.textMuted,
                                fontSize: '12px',
                                marginBottom: '6px',
                            }}
                        >
                            <Clock size={12} />
                            <span>{formatDuration(item.gameTime)}</span>
                        </div>
                        {/* Status */}
                        <div
                            style={{
                                textAlign: 'center',
                                fontSize: '11px',
                                fontWeight: '600',
                                color: item.skipped ? COLORS.red : COLORS.green,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                            }}
                        >
                            {item.skipped ? <><X size={12} /> SKIPPED</> : <><Check size={12} /> FOUND</>}
                        </div>
                    </div>
                    {/* Tooltip arrow */}
                    <div
                        style={{
                            width: 0,
                            height: 0,
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderTop: `8px solid ${item.skipped ? COLORS.red : poolColor}`,
                            margin: '0 auto',
                        }}
                    />
                </div>
            )}
        </>
    );
}

function InventoryGrid({ items, formatDuration }) {
    const totalSlots = GRID_COLS * GRID_ROWS;
    const totalPages = Math.ceil(items.length / totalSlots);
    const [currentPage, setCurrentPage] = useState(0);

    const startIdx = currentPage * totalSlots;
    const currentSlots = [];
    for (let i = 0; i < totalSlots; i++) {
        currentSlots.push(items[startIdx + i] || null);
    }

    return (
        <div>
            {/* Inventory container */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${GRID_COLS}, ${SLOT_SIZE}px)`,
                    gridTemplateRows: `repeat(${GRID_ROWS}, ${SLOT_SIZE}px)`,
                    gap: `${SLOT_GAP}px`,
                    padding: '14px',
                    background: `linear-gradient(135deg, ${COLORS.bgLighter} 0%, ${COLORS.bgLight} 100%)`,
                    borderRadius: '10px',
                    border: `1px solid ${COLORS.border}44`,
                    boxShadow: `0 4px 16px ${COLORS.accent}11, inset 0 1px 0 ${COLORS.accent}08`,
                }}
            >
                {currentSlots.map((item, idx) => (
                    <InventorySlot
                        key={idx}
                        item={item}
                        index={startIdx + idx}
                        formatDuration={formatDuration}
                    />
                ))}
            </div>

            {/* Pagination if needed */}
            {totalPages > 1 && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        marginTop: '16px',
                    }}
                >
                    <button
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                        style={{
                            padding: '8px 16px',
                            background: currentPage === 0 ? COLORS.bgLight : COLORS.accent,
                            border: `1px solid ${currentPage === 0 ? COLORS.border : COLORS.accent}`,
                            borderRadius: '6px',
                            color: currentPage === 0 ? COLORS.textMuted : '#fff',
                            fontSize: '13px',
                            fontWeight: '500',
                            cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        â† Prev
                    </button>
                    <span style={{ color: COLORS.text, fontSize: '13px' }}>
                        Page {currentPage + 1} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                        disabled={currentPage >= totalPages - 1}
                        style={{
                            padding: '8px 16px',
                            background: currentPage >= totalPages - 1 ? COLORS.bgLight : COLORS.accent,
                            border: `1px solid ${currentPage >= totalPages - 1 ? COLORS.border : COLORS.accent}`,
                            borderRadius: '6px',
                            color: currentPage >= totalPages - 1 ? COLORS.textMuted : '#fff',
                            fontSize: '13px',
                            fontWeight: '500',
                            cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        Next â†’
                    </button>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// TEAM DETAIL VIEW - Shows items found by a team
// ============================================================================

function TeamDetailView({ team, matchDuration, onBack }) {
    const teamName = team.players.map(p => p.name).join(' & ');
    const foundItems = team.items.filter(i => !i.skipped);
    const skippedItems = team.items.filter(i => i.skipped);

    // Calculate pool distribution
    const poolStats = {
        early: team.items.filter(i => i.pool === 'early').length,
        mid: team.items.filter(i => i.pool === 'mid').length,
        late: team.items.filter(i => i.pool === 'late').length,
    };
    const totalItems = team.items.length;

    return (
        <div style={{
            animation: 'fadeSlideIn 0.2s ease-out',
        }}>
            {/* Enchantment glint animation */}
            <style>{`
                @keyframes enchantGlint {
                    0% { transform: translate(-33%, -33%); }
                    100% { transform: translate(33%, 33%); }
                }
            `}</style>

            {/* Back button and header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '20px',
            }}>
                <button
                    onClick={onBack}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        background: COLORS.bgLight,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '8px',
                        color: COLORS.textMuted,
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = COLORS.accent;
                        e.currentTarget.style.color = COLORS.text;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = COLORS.border;
                        e.currentTarget.style.color = COLORS.textMuted;
                    }}
                >
                    <ArrowLeft size={16} />
                    Back
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {team.players.map((player, idx) => (
                            <img
                                key={player.id}
                                src={player.avatarUrl}
                                alt={player.name}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    imageRendering: 'pixelated',
                                    marginLeft: idx > 0 ? '-10px' : 0,
                                    border: `2px solid ${COLORS.bgLight}`,
                                }}
                            />
                        ))}
                    </div>
                    <div>
                        <div style={{ color: COLORS.text, fontSize: '16px', fontWeight: '600' }}>
                            {teamName}
                        </div>
                        <div style={{ color: COLORS.textMuted, fontSize: '12px' }}>
                            #{team.placement} · {team.itemsFound} items · {team.itemsSkipped} skipped
                        </div>
                    </div>
                </div>
            </div>

            {/* Inventory Grid Section */}
            <div style={{
                background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bgLighter} 100%)`,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '14px',
                padding: '24px',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '20px',
                    paddingBottom: '16px',
                    borderBottom: `1px solid ${COLORS.border}`,
                }}>
                    <Package size={18} color={COLORS.accent} />
                    <span style={{ color: COLORS.text, fontSize: '14px', fontWeight: '600' }}>
                        Items Inventory
                    </span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px' }}>
                        <span style={{
                            color: COLORS.green,
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}>
                            <Check size={14} />
                            {foundItems.length} found
                        </span>
                        <span style={{
                            color: COLORS.red,
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}>
                            <SkipForward size={14} />
                            {skippedItems.length} skipped
                        </span>
                    </div>
                </div>

                {/* Pool Distribution Overview */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '16px',
                    padding: '14px',
                    background: COLORS.bg,
                    borderRadius: '10px',
                }}>
                    {/* Pool Stats */}
                    <div style={{ flex: 1, display: 'flex', gap: '12px' }}>
                        {[
                            { key: 'early', label: 'Early', color: POOL_COLORS.early },
                            { key: 'mid', label: 'Mid', color: POOL_COLORS.mid },
                            { key: 'late', label: 'Late', color: POOL_COLORS.late },
                        ].map(({ key, label, color }) => (
                            <div
                                key={key}
                                style={{
                                    flex: 1,
                                    padding: '10px 14px',
                                    background: `${color}11`,
                                    border: `1px solid ${color}33`,
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                }}
                            >
                                <div style={{
                                    color: color,
                                    fontSize: '20px',
                                    fontWeight: '700',
                                    fontFamily: MC_FONT,
                                    textShadow: `0 0 10px ${color}40`,
                                }}>
                                    {poolStats[key]}
                                </div>
                                <div style={{
                                    color: color,
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    marginTop: '2px',
                                }}>
                                    {label}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pool Distribution Bar */}
                    <div style={{
                        width: '200px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '6px',
                    }}>
                        <div style={{
                            color: COLORS.textMuted,
                            fontSize: '10px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                        }}>
                            Distribution
                        </div>
                        <div style={{
                            display: 'flex',
                            height: '8px',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            background: COLORS.bgLighter,
                        }}>
                            {totalItems > 0 && (
                                <>
                                    <div style={{
                                        width: `${(poolStats.early / totalItems) * 100}%`,
                                        background: POOL_COLORS.early,
                                        transition: 'width 0.3s ease',
                                    }} />
                                    <div style={{
                                        width: `${(poolStats.mid / totalItems) * 100}%`,
                                        background: POOL_COLORS.mid,
                                        transition: 'width 0.3s ease',
                                    }} />
                                    <div style={{
                                        width: `${(poolStats.late / totalItems) * 100}%`,
                                        background: POOL_COLORS.late,
                                        transition: 'width 0.3s ease',
                                    }} />
                                </>
                            )}
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '9px',
                            color: COLORS.textMuted,
                        }}>
                            <span>{totalItems > 0 ? Math.round((poolStats.early / totalItems) * 100) : 0}%</span>
                            <span>{totalItems > 0 ? Math.round((poolStats.mid / totalItems) * 100) : 0}%</span>
                            <span>{totalItems > 0 ? Math.round((poolStats.late / totalItems) * 100) : 0}%</span>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    marginBottom: '16px',
                    padding: '10px 14px',
                    background: COLORS.bg,
                    borderRadius: '8px',
                    fontSize: '11px',
                }}>
                    <span style={{ color: COLORS.textMuted }}>
                        <strong style={{ color: COLORS.text }}>Hover</strong> for details
                    </span>
                    <span style={{ color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                            display: 'inline-block',
                            width: '16px',
                            height: '16px',
                            background: `linear-gradient(-50deg, rgba(120, 80, 200, 0.25) 40%, rgba(140, 120, 255, 0.6) 50%, rgba(120, 80, 200, 0.25) 60%)`,
                            border: '1px solid #555',
                            borderRadius: '2px',
                        }} />
                        Enchant glint = Skipped
                    </span>
                </div>

                {/* Grid container - centered */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                }}>
                    <InventoryGrid items={team.items} formatDuration={formatDuration} />
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// MATCH DETAIL VIEW - Shows all teams in a match
// ============================================================================

function MatchDetailView({ match, onBack, onSelectTeam }) {
    const placementColors = {
        1: { bg: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#1a1a1a', glow: 'rgba(255, 215, 0, 0.3)' },
        2: { bg: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)', color: '#fff', glow: 'rgba(192, 192, 192, 0.2)' },
        3: { bg: 'linear-gradient(135deg, #CD7F32, #B87333)', color: '#fff', glow: 'rgba(205, 127, 50, 0.2)' },
    };

    return (
        <div style={{
            animation: 'fadeSlideIn 0.2s ease-out',
        }}>
            {/* Back button and header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '20px',
            }}>
                <button
                    onClick={onBack}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        background: COLORS.bgLight,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '8px',
                        color: COLORS.textMuted,
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = COLORS.accent;
                        e.currentTarget.style.color = COLORS.text;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = COLORS.border;
                        e.currentTarget.style.color = COLORS.textMuted;
                    }}
                >
                    <ArrowLeft size={16} />
                    Back to matches
                </button>

                <div>
                    <div style={{ color: COLORS.text, fontSize: '16px', fontWeight: '600' }}>
                        Match Details
                    </div>
                    <div style={{ color: COLORS.textMuted, fontSize: '12px' }}>
                        {formatDate(match.date)} · {formatDuration(match.duration)} · {match.teams.length} teams
                    </div>
                </div>
            </div>

            {/* Teams list */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
            }}>
                {match.teams.map((team) => {
                    const teamName = team.players.map(p => p.name).join(' & ');
                    const isTopThree = team.placement <= 3;
                    const placementStyle = placementColors[team.placement];

                    return (
                        <div
                            key={team.id}
                            onClick={() => onSelectTeam(team)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '16px 20px',
                                background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bgLighter} 100%)`,
                                border: `1px solid ${isTopThree ? (placementStyle?.glow || COLORS.border) : COLORS.border}`,
                                borderRadius: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: isTopThree ? `0 4px 20px ${placementStyle?.glow}` : 'none',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateX(4px)';
                                e.currentTarget.style.borderColor = COLORS.accent;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateX(0)';
                                e.currentTarget.style.borderColor = isTopThree ? (placementStyle?.glow || COLORS.border) : COLORS.border;
                            }}
                        >
                            {/* Placement */}
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: isTopThree ? placementStyle.bg : COLORS.bg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isTopThree ? placementStyle.color : COLORS.textMuted,
                                fontFamily: MC_FONT,
                                fontSize: '14px',
                                fontWeight: '700',
                                flexShrink: 0,
                            }}>
                                #{team.placement}
                            </div>

                            {/* Team avatars */}
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                {team.players.map((player, idx) => (
                                    <img
                                        key={player.id}
                                        src={player.avatarUrl}
                                        alt={player.name}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '8px',
                                            imageRendering: 'pixelated',
                                            marginLeft: idx > 0 ? '-10px' : 0,
                                            border: `2px solid ${COLORS.bgLight}`,
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Team name */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    color: isTopThree && team.placement === 1 ? COLORS.gold : COLORS.text,
                                    fontSize: '14px',
                                    fontWeight: '600',
                                }}>
                                    {teamName}
                                </div>
                                <div style={{
                                    color: COLORS.textMuted,
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}>
                                    <span>{team.players.length > 1 ? 'Team' : 'Solo'}</span>
                                    <span>·</span>
                                    <span>{team.itemsFound} items</span>
                                    {team.itemsSkipped > 0 && (
                                        <>
                                            <span>·</span>
                                            <span style={{ color: COLORS.red }}>{team.itemsSkipped} skipped</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Score */}
                            <div style={{
                                textAlign: 'right',
                            }}>
                                <div style={{
                                    color: isTopThree && team.placement === 1 ? COLORS.gold : COLORS.text,
                                    fontFamily: MC_FONT,
                                    fontSize: '20px',
                                    fontWeight: '700',
                                    textShadow: team.placement === 1 ? `0 0 12px ${COLORS.gold}60` : 'none',
                                }}>
                                    {team.score}
                                </div>
                                <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>
                                    points
                                </div>
                            </div>

                            <ChevronRight size={18} color={COLORS.textMuted} />
                        </div>
                    );
                })}
            </div>

            <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: COLORS.bg,
                borderRadius: '10px',
                border: `1px solid ${COLORS.border}`,
                color: COLORS.textMuted,
                fontSize: '12px',
                textAlign: 'center',
            }}>
                Click on a team to see their item timeline
            </div>
        </div>
    );
}

// ============================================================================
// MAIN MATCH HISTORY COMPONENT
// ============================================================================

export function StatsMatchHistory({ entity }) {
    const [matches, setMatches] = useState([]);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [selectedTeam, setSelectedTeam] = useState(null);

    useEffect(() => {
        // TODO: Replace with API call
        setMatches(generateMockMatches());
    }, [entity]);

    // If viewing team details
    if (selectedMatch && selectedTeam) {
        return (
            <TeamDetailView
                team={selectedTeam}
                matchDuration={selectedMatch.duration}
                onBack={() => setSelectedTeam(null)}
            />
        );
    }

    // If viewing match details
    if (selectedMatch) {
        return (
            <MatchDetailView
                match={selectedMatch}
                onBack={() => setSelectedMatch(null)}
                onSelectTeam={(team) => setSelectedTeam(team)}
            />
        );
    }

    // Match list view
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
            }}>
                <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: `linear-gradient(135deg, ${COLORS.accent}30 0%, ${COLORS.accent}10 100%)`,
                    border: `1px solid ${COLORS.accent}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <History size={22} color={COLORS.accent} />
                </div>
                <div>
                    <div style={{ color: COLORS.text, fontSize: '18px', fontWeight: '600' }}>
                        Match History
                    </div>
                    <div style={{ color: COLORS.textMuted, fontSize: '12px' }}>
                        {matches.length} recent games
                    </div>
                </div>
            </div>

            {/* Match List */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
            }}>
                {matches.map((match) => {
                    const winner = match.teams[0];
                    const winnerName = winner.players.map(p => p.name).join(' & ');

                    return (
                        <div
                            key={match.id}
                            onClick={() => setSelectedMatch(match)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '16px 20px',
                                background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bgLighter} 100%)`,
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = COLORS.accent;
                                e.currentTarget.style.transform = 'translateX(4px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = COLORS.border;
                                e.currentTarget.style.transform = 'translateX(0)';
                            }}
                        >
                            {/* Date */}
                            <div style={{
                                minWidth: '80px',
                                textAlign: 'center',
                            }}>
                                <div style={{ color: COLORS.text, fontSize: '13px', fontWeight: '500' }}>
                                    {formatDate(match.date)}
                                </div>
                                <div style={{
                                    color: COLORS.textMuted,
                                    fontSize: '11px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    justifyContent: 'center',
                                }}>
                                    <Timer size={10} />
                                    {formatDuration(match.duration)}
                                </div>
                            </div>

                            {/* Divider */}
                            <div style={{
                                width: '1px',
                                height: '36px',
                                background: COLORS.border,
                            }} />

                            {/* Winner info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                <Trophy size={18} color={COLORS.gold} />
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    {winner.players.map((player, idx) => (
                                        <img
                                            key={player.id}
                                            src={player.avatarUrl}
                                            alt={player.name}
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '6px',
                                                imageRendering: 'pixelated',
                                                marginLeft: idx > 0 ? '-8px' : 0,
                                                border: `2px solid ${COLORS.gold}40`,
                                            }}
                                        />
                                    ))}
                                </div>
                                <div>
                                    <div style={{ color: COLORS.gold, fontSize: '14px', fontWeight: '600' }}>
                                        {winnerName}
                                    </div>
                                    <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>
                                        Winner · {winner.score} pts
                                    </div>
                                </div>
                            </div>

                            {/* Match stats */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        color: COLORS.text,
                                        fontSize: '16px',
                                        fontFamily: MC_FONT,
                                        fontWeight: '600',
                                    }}>
                                        {match.teams.length}
                                    </div>
                                    <div style={{ color: COLORS.textMuted, fontSize: '10px' }}>
                                        teams
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        color: COLORS.text,
                                        fontSize: '16px',
                                        fontFamily: MC_FONT,
                                        fontWeight: '600',
                                    }}>
                                        {match.totalItems}
                                    </div>
                                    <div style={{ color: COLORS.textMuted, fontSize: '10px' }}>
                                        items
                                    </div>
                                </div>
                            </div>

                            <ChevronRight size={18} color={COLORS.textMuted} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}