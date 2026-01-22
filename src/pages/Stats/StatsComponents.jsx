import React, { useState, useEffect, useMemo, useRef } from 'react';
import Search from 'lucide-react/dist/esm/icons/search';
import X from 'lucide-react/dist/esm/icons/x';
import Users from 'lucide-react/dist/esm/icons/users';
import User from 'lucide-react/dist/esm/icons/user';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ArrowLeftRight from 'lucide-react/dist/esm/icons/arrow-left-right';

import { STATS_COLORS as COLORS, MC_FONT, MOCK_PLAYERS, MOCK_TEAMS, PLAYERS_BY_NAME, formatNumber } from './statsUtils.js';

// ============================================================================
// TAB NAVIGATION
// ============================================================================

export function TabNavigation({ tabs, activeTab, onTabChange }) {
    return (
        <div style={{
            display: 'flex',
            gap: '4px',
            padding: '6px',
            background: COLORS.bg,
            borderRadius: '14px',
            border: `1px solid ${COLORS.border}`,
            marginBottom: '24px',
        }}>
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px 20px',
                        background: activeTab === tab.id
                            ? `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.accent}CC 100%)`
                            : 'transparent',
                        border: 'none',
                        borderRadius: '10px',
                        color: activeTab === tab.id ? '#fff' : COLORS.textMuted,
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                    }}
                    onMouseEnter={e => {
                        if (activeTab !== tab.id) {
                            e.currentTarget.style.background = COLORS.bgLight;
                            e.currentTarget.style.color = COLORS.text;
                        }
                    }}
                    onMouseLeave={e => {
                        if (activeTab !== tab.id) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = COLORS.textMuted;
                        }
                    }}
                >
                    {tab.icon}
                    <span>{tab.label}</span>
                </button>
            ))}
        </div>
    );
}

// ============================================================================
// ENTITY SELECTOR
// ============================================================================

export function EntitySelector({ selectedEntity, onSelect, compareMode, onToggleCompare, selectingFor }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [filter, setFilter] = useState('all');
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-open dropdown and focus input when selectingFor changes
    useEffect(() => {
        let timeoutId;
        if (selectingFor) {
            setIsDropdownOpen(true);
            // Small delay to ensure DOM is ready
            timeoutId = setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [selectingFor]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredResults = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const results = [];

        if (filter === 'all' || filter === 'players') {
            MOCK_PLAYERS.forEach(player => {
                if (!query || player.name.toLowerCase().includes(query)) {
                    results.push({ type: 'player', ...player });
                }
            });
        }

        if (filter === 'all' || filter === 'teams') {
            MOCK_TEAMS.forEach(team => {
                const teamName = team.players.join(' + ');
                if (!query || teamName.toLowerCase().includes(query)) {
                    results.push({ type: 'team', ...team, name: teamName });
                }
            });
        }

        return results;
    }, [searchQuery, filter]);

    const handleSelect = (entity) => {
        onSelect(entity);
        setIsDropdownOpen(false);
        setSearchQuery('');
    };

    return (
        <div style={{
            background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bgLighter} 100%)`,
            border: selectingFor
                ? `2px solid ${COLORS.accent}`
                : `1px solid ${COLORS.border}`,
            borderRadius: '16px',
            padding: selectingFor ? '19px 23px' : '20px 24px',
            marginBottom: '24px',
            position: 'relative',
            boxShadow: selectingFor ? `0 0 0 4px ${COLORS.accent}20, 0 0 20px ${COLORS.accent}30` : 'none',
            transition: 'all 0.2s ease',
        }}>
            {/* Selection Mode Indicator */}
            {selectingFor && (
                <div style={{
                    marginBottom: '12px',
                    padding: '10px 14px',
                    background: `${COLORS.accent}15`,
                    border: `1px solid ${COLORS.accent}40`,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    <Search size={16} color={COLORS.accent} />
                    <span style={{
                        color: COLORS.accent,
                        fontSize: '13px',
                        fontWeight: '500'
                    }}>
                        Select {selectingFor === 'left' ? 'first' : 'second'} entity for comparison
                    </span>
                </div>
            )}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
            }}>
                {/* Search and Filter Row */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                }}>
                    {/* Search Input */}
                    <div
                        ref={dropdownRef}
                        style={{
                            position: 'relative',
                            flex: '1 1 300px',
                            minWidth: '200px',
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: COLORS.bg,
                            border: `1px solid ${isDropdownOpen ? COLORS.accent : COLORS.border}`,
                            borderRadius: '10px',
                            padding: '10px 14px',
                            gap: '10px',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                            boxShadow: isDropdownOpen ? `0 0 0 3px ${COLORS.accent}20` : 'none',
                        }}>
                            <Search size={18} color={COLORS.textMuted} />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setIsDropdownOpen(true)}
                                placeholder={selectingFor
                                    ? `Search for ${selectingFor === 'left' ? 'first' : 'second'} entity...`
                                    : "Search players or teams..."}
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: COLORS.text,
                                    fontSize: '14px',
                                }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        display: 'flex',
                                    }}
                                >
                                    <X size={16} color={COLORS.textMuted} />
                                </button>
                            )}
                            <ChevronDown
                                size={16}
                                color={COLORS.textMuted}
                                style={{
                                    transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s',
                                }}
                            />
                        </div>

                        {/* Dropdown */}
                        {isDropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: '8px',
                                background: COLORS.bgLight,
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: '10px',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                zIndex: 100,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                            }}>
                                {filteredResults.length === 0 ? (
                                    <div style={{
                                        padding: '20px',
                                        textAlign: 'center',
                                        color: COLORS.textMuted,
                                        fontSize: '13px',
                                    }}>
                                        No results found
                                    </div>
                                ) : (
                                    filteredResults.map((entity) => (
                                        <div
                                            key={entity.id}
                                            onClick={() => handleSelect(entity)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px 16px',
                                                cursor: 'pointer',
                                                borderBottom: `1px solid ${COLORS.border}33`,
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = COLORS.bgHover}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            {entity.type === 'player' ? (
                                                <>
                                                    <img
                                                        src={entity.avatarUrl}
                                                        alt={entity.name}
                                                        style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '6px',
                                                            imageRendering: 'pixelated',
                                                        }}
                                                    />
                                                    <div>
                                                        <div style={{ color: COLORS.text, fontSize: '14px', fontWeight: '500' }}>
                                                            {entity.name}
                                                        </div>
                                                        <div style={{
                                                            color: COLORS.textMuted,
                                                            fontSize: '11px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                        }}>
                                                            <User size={10} /> Player
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                                        {entity.players.map((playerName, idx) => {
                                                            const player = PLAYERS_BY_NAME.get(playerName);
                                                            return (
                                                                <img
                                                                    key={playerName}
                                                                    src={player?.avatarUrl || `https://mc-heads.net/avatar/${playerName}/100`}
                                                                    alt={playerName}
                                                                    style={{
                                                                        width: '28px',
                                                                        height: '28px',
                                                                        borderRadius: '6px',
                                                                        imageRendering: 'pixelated',
                                                                        marginLeft: idx > 0 ? '-8px' : 0,
                                                                        border: `2px solid ${COLORS.bgLight}`,
                                                                    }}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                    <div>
                                                        <div style={{ color: COLORS.text, fontSize: '14px', fontWeight: '500' }}>
                                                            {entity.name}
                                                        </div>
                                                        <div style={{
                                                            color: COLORS.textMuted,
                                                            fontSize: '11px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                        }}>
                                                            <Users size={10} /> Team · {entity.gamesPlayed} games
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Filter Buttons */}
                    <div style={{
                        display: 'flex',
                        gap: '6px',
                        background: COLORS.bg,
                        borderRadius: '8px',
                        padding: '4px',
                    }}>
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'players', label: 'Players', icon: <User size={12} /> },
                            { id: 'teams', label: 'Teams', icon: <Users size={12} /> },
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilter(f.id)}
                                style={{
                                    padding: '6px 12px',
                                    background: filter === f.id ? COLORS.accent : 'transparent',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: filter === f.id ? '#fff' : COLORS.textMuted,
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {f.icon}
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Compare Toggle */}
                    <button
                        onClick={onToggleCompare}
                        style={{
                            padding: '10px 16px',
                            background: compareMode
                                ? `linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.orange} 100%)`
                                : COLORS.bg,
                            border: `1px solid ${compareMode ? COLORS.gold : COLORS.border}`,
                            borderRadius: '8px',
                            color: compareMode ? '#1a1a1a' : COLORS.textMuted,
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                        }}
                    >
                        <ArrowLeftRight size={16} />
                        Compare
                    </button>
                </div>

                {/* Selected Entity Display */}
                {selectedEntity && !compareMode && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        background: `linear-gradient(135deg, ${COLORS.accent}15 0%, ${COLORS.accent}05 100%)`,
                        borderRadius: '10px',
                        border: `1px solid ${COLORS.accent}30`,
                    }}>
                        {selectedEntity.type === 'player' ? (
                            <>
                                <img
                                    src={selectedEntity.avatarUrl}
                                    alt={selectedEntity.name}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '8px',
                                        imageRendering: 'pixelated',
                                        border: `2px solid ${COLORS.accent}`,
                                    }}
                                />
                                <div>
                                    <div style={{ color: COLORS.text, fontSize: '16px', fontWeight: '600' }}>
                                        {selectedEntity.name}
                                    </div>
                                    <div style={{ color: COLORS.accent, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <User size={12} /> Individual Stats
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    {selectedEntity.players.map((playerName, idx) => {
                                        const player = PLAYERS_BY_NAME.get(playerName);
                                        return (
                                            <img
                                                key={playerName}
                                                src={player?.avatarUrl || `https://mc-heads.net/avatar/${playerName}/100`}
                                                alt={playerName}
                                                style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '8px',
                                                    imageRendering: 'pixelated',
                                                    marginLeft: idx > 0 ? '-10px' : 0,
                                                    border: `2px solid ${COLORS.accent}`,
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                                <div>
                                    <div style={{ color: COLORS.text, fontSize: '16px', fontWeight: '600' }}>
                                        {selectedEntity.name}
                                    </div>
                                    <div style={{ color: COLORS.accent, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Users size={12} /> Team Stats · {selectedEntity.gamesPlayed} games together
                                    </div>
                                </div>
                            </>
                        )}
                        <button
                            onClick={() => onSelect(null)}
                            style={{
                                marginLeft: 'auto',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '6px',
                                borderRadius: '6px',
                                display: 'flex',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = COLORS.bgLighter}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                            <X size={18} color={COLORS.textMuted} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// STAT CARD
// ============================================================================

export function StatCard({ icon, label, value, subValue, color, large, delay = 0 }) {
    const accentColor = color || COLORS.accent;

    return (
        <div style={{
            background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bgLighter} 100%)`,
            borderRadius: '14px',
            padding: large ? '24px' : '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
            border: `1px solid ${COLORS.border}`,
            animation: `fadeSlideIn 0.4s ease-out ${delay}ms backwards`,
        }}
             onMouseEnter={(e) => {
                 e.currentTarget.style.transform = 'translateY(-4px)';
                 e.currentTarget.style.boxShadow = `0 12px 32px ${accentColor}20, 0 0 0 1px ${accentColor}40`;
                 e.currentTarget.style.borderColor = `${accentColor}50`;
             }}
             onMouseLeave={(e) => {
                 e.currentTarget.style.transform = 'translateY(0)';
                 e.currentTarget.style.boxShadow = 'none';
                 e.currentTarget.style.borderColor = COLORS.border;
             }}
        >
            <div style={{
                width: large ? '56px' : '48px',
                height: large ? '56px' : '48px',
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}10 100%)`,
                border: `1px solid ${accentColor}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}>
                {icon && React.cloneElement(icon, {
                    size: large ? 26 : 22,
                    color: accentColor,
                    strokeWidth: 2,
                })}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    color: COLORS.textMuted,
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '6px',
                }}>
                    {label}
                </div>

                <div style={{
                    color: COLORS.text,
                    fontSize: large ? '26px' : '22px',
                    fontFamily: MC_FONT,
                    lineHeight: 1.2,
                    marginBottom: subValue ? '6px' : 0,
                    textShadow: '2px 2px 0 rgba(0,0,0,0.4)',
                }}>
                    {value}
                </div>

                {subValue && (
                    <div style={{ color: COLORS.textDim, fontSize: '11px' }}>
                        {subValue}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// CANVAS COMPONENTS
// ============================================================================

export function CanvasRankBadge({ rank, size = 120 }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);

        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size * 0.4;

        let colors;
        if (rank === 1) {
            colors = { primary: '#FFD700', secondary: '#FFA500', glow: 'rgba(255, 215, 0, 0.6)' };
        } else if (rank === 2) {
            colors = { primary: '#C0C0C0', secondary: '#A8A8A8', glow: 'rgba(192, 192, 192, 0.5)' };
        } else if (rank === 3) {
            colors = { primary: '#CD7F32', secondary: '#B87333', glow: 'rgba(205, 127, 50, 0.5)' };
        } else if (rank <= 10) {
            colors = { primary: COLORS.accent, secondary: '#4752C4', glow: 'rgba(88, 101, 242, 0.4)' };
        } else {
            colors = { primary: COLORS.bgLighter, secondary: COLORS.bgLight, glow: 'rgba(45, 45, 74, 0.3)' };
        }

        ctx.clearRect(0, 0, size, size);

        // Outer glow
        const glowGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.5, centerX, centerY, radius * 1.3);
        glowGradient.addColorStop(0, colors.glow);
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, size, size);

        // Hexagon shape
        ctx.beginPath();
        const points = 6;
        for (let i = 0; i < points; i++) {
            const angle = (i * 2 * Math.PI / points) - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();

        const fillGradient = ctx.createLinearGradient(0, 0, size, size);
        fillGradient.addColorStop(0, colors.primary);
        fillGradient.addColorStop(1, colors.secondary);
        ctx.fillStyle = fillGradient;
        ctx.fill();

        // Inner highlight
        ctx.beginPath();
        for (let i = 0; i < points; i++) {
            const angle = (i * 2 * Math.PI / points) - Math.PI / 2;
            const x = centerX + radius * 0.85 * Math.cos(angle);
            const y = centerY + radius * 0.85 * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `${colors.primary}44`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Rank text
        ctx.fillStyle = rank <= 3 ? '#1a1a1a' : COLORS.text;
        ctx.font = `bold ${size * 0.28}px ${MC_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`#${rank}`, centerX, centerY);

    }, [rank, size]);

    return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
}

export function CanvasWinRateRing({ percentage, size = 100 }) {
    const canvasRef = useRef(null);
    const animatedPercentage = useRef(0);
    const animationRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);

        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size * 0.38;
        const lineWidth = size * 0.1;

        const draw = (currentPercent) => {
            ctx.clearRect(0, 0, size, size);

            // Background ring
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.strokeStyle = COLORS.border;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Progress ring
            if (currentPercent > 0) {
                const startAngle = -Math.PI / 2;
                const endAngle = startAngle + (currentPercent / 100) * 2 * Math.PI;

                const gradient = ctx.createLinearGradient(0, 0, size, size);
                gradient.addColorStop(0, COLORS.green);
                gradient.addColorStop(1, COLORS.aqua);

                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, startAngle, endAngle);
                ctx.strokeStyle = gradient;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                ctx.stroke();
            }

            // Text
            ctx.fillStyle = COLORS.text;
            ctx.font = `bold ${size * 0.18}px ${MC_FONT}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${Math.round(currentPercent)}%`, centerX, centerY);
        };

        const startTime = performance.now();
        const duration = 800;
        const startValue = animatedPercentage.current;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            animatedPercentage.current = startValue + (percentage - startValue) * eased;
            draw(animatedPercentage.current);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [percentage, size]);

    return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
}

export function CanvasRarityChart({ raritiesFound, width = 340, height = 220 }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, width, height);

        const rarities = ['RARE', 'EPIC', 'LEGENDARY', 'RNGESUS', 'EXTRAORDINARY'];
        const maxValue = Math.max(...Object.values(raritiesFound), 1);

        const barHeight = 32;
        const barGap = 12;
        const labelWidth = 130;
        const valueWidth = 60;
        const barMaxWidth = width - labelWidth - valueWidth - 10;

        rarities.forEach((rarity, index) => {
            const y = index * (barHeight + barGap);
            const value = raritiesFound[rarity] || 0;
            const barWidth = (value / maxValue) * barMaxWidth;

            // Label
            ctx.fillStyle = COLORS.rarities[rarity];
            ctx.font = `bold 14px ${MC_FONT}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(rarity, 0, y + barHeight / 2);

            // Background bar
            ctx.fillStyle = COLORS.bgLighter;
            ctx.beginPath();
            ctx.roundRect(labelWidth, y, barMaxWidth, barHeight, 6);
            ctx.fill();

            // Value bar
            if (barWidth > 0) {
                const gradient = ctx.createLinearGradient(labelWidth, y, labelWidth + barWidth, y);
                if (rarity === 'EXTRAORDINARY') {
                    gradient.addColorStop(0, '#73FF00');
                    gradient.addColorStop(1, '#14C8FF');
                } else if (rarity === 'RNGESUS') {
                    gradient.addColorStop(0, '#E41EBC');
                    gradient.addColorStop(1, '#9A4992');
                } else {
                    gradient.addColorStop(0, COLORS.rarities[rarity]);
                    gradient.addColorStop(1, `${COLORS.rarities[rarity]}BB`);
                }

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.roundRect(labelWidth, y, Math.max(barWidth, 10), barHeight, 6);
                ctx.fill();
            }

            // Value text
            ctx.fillStyle = COLORS.text;
            ctx.font = `bold 13px ${MC_FONT}`;
            ctx.textAlign = 'right';
            ctx.fillText(formatNumber(value), width, y + barHeight / 2);
        });

    }, [raritiesFound, width, height]);

    return <canvas ref={canvasRef} style={{ width, height }} />;
}

// ============================================================================
// TOP ITEMS CARD
// ============================================================================

// Hoisted outside component to prevent recreation on every render
const TOP_ITEMS_MEDALS = [
    { bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', border: '#FFD700', shadow: 'rgba(255, 215, 0, 0.5)' },
    { bg: 'linear-gradient(135deg, #E8E8E8 0%, #B8B8B8 100%)', border: '#C0C0C0', shadow: 'rgba(192, 192, 192, 0.4)' },
    { bg: 'linear-gradient(135deg, #CD7F32 0%, #A0522D 100%)', border: '#CD7F32', shadow: 'rgba(205, 127, 50, 0.4)' },
];

const TOP_ITEMS_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib';

export function TopItemsCard({ items }) {

    return (
        <div style={{
            background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bgLighter} 100%)`,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '14px',
            padding: '20px',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '20px',
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: `linear-gradient(135deg, ${COLORS.gold}30 0%, ${COLORS.gold}10 100%)`,
                    border: `1px solid ${COLORS.gold}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <Trophy size={20} color={COLORS.gold} />
                </div>
                <div>
                    <div style={{ color: COLORS.text, fontSize: '15px', fontWeight: '600' }}>
                        Most Found Items
                    </div>
                    <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>
                        Your top 3 collected items
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                {items.map((item, idx) => (
                    <div
                        key={item.name}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '10px',
                            flex: '1 1 0',
                            minWidth: '80px',
                            maxWidth: '120px',
                            padding: '18px 8px',
                            background: COLORS.bg,
                            borderRadius: '12px',
                            border: `1px solid ${COLORS.border}`,
                            position: 'relative',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = `0 8px 24px ${TOP_ITEMS_MEDALS[idx].shadow}`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: '-12px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: TOP_ITEMS_MEDALS[idx].bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            fontWeight: '700',
                            fontFamily: MC_FONT,
                            color: idx === 0 ? '#1a1a1a' : '#fff',
                            boxShadow: `0 4px 12px ${TOP_ITEMS_MEDALS[idx].shadow}`,
                            border: `3px solid ${COLORS.bgLight}`,
                        }}>
                            {idx + 1}
                        </div>

                        <div style={{
                            width: '56px',
                            height: '56px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: '8px',
                        }}>
                            <img
                                src={`${TOP_ITEMS_IMAGE_BASE_URL}/${item.texture}.png`}
                                alt={item.name}
                                style={{ width: '48px', height: '48px', imageRendering: 'pixelated' }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        </div>

                        <div style={{
                            color: COLORS.text,
                            fontSize: '11px',
                            fontWeight: '500',
                            textAlign: 'center',
                            lineHeight: '1.3',
                            wordBreak: 'break-word',
                        }}>
                            {item.name.replace(/_/g, ' ')}
                        </div>

                        <div style={{
                            color: TOP_ITEMS_MEDALS[idx].border,
                            fontSize: '15px',
                            fontFamily: MC_FONT,
                            textShadow: `0 0 10px ${TOP_ITEMS_MEDALS[idx].border}80`,
                        }}>
                            ×{item.count}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}