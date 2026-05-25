import React, { useState, useMemo, useRef, useEffect } from 'react';
import Search       from 'lucide-react/dist/esm/icons/search';
import X            from 'lucide-react/dist/esm/icons/x';
import Users        from 'lucide-react/dist/esm/icons/users';
import User         from 'lucide-react/dist/esm/icons/user';
import Trophy       from 'lucide-react/dist/esm/icons/trophy';
import ChevronDown  from 'lucide-react/dist/esm/icons/chevron-down';
import ArrowLeftRight from 'lucide-react/dist/esm/icons/arrow-left-right';

import { MOCK_PLAYERS, MOCK_TEAMS, PLAYERS_BY_NAME } from './statsUtils.js';

import { COLORS as C } from '../../config/constants';


// ── Tab Navigation ────────────────────────────────────────────────────────────

export function TabNavigation({ tabs, activeTab, onTabChange }) {
    return (
        <div className="st-tabs">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    className={`st-tab${activeTab === tab.id ? ' active' : ''}`}
                    onClick={() => onTabChange(tab.id)}
                >
                    {tab.icon}
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

// ── Entity Selector ───────────────────────────────────────────────────────────

export function EntitySelector({ selectedEntity, onSelect, compareMode, onToggleCompare, selectingFor }) {
    const [query, setQuery]   = useState('');
    const [open, setOpen]     = useState(false);
    const [filter, setFilter] = useState('all');
    const dropRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (selectingFor) {
            setOpen(true);
            const timer = setTimeout(() => inputRef.current?.focus(), 50);
            return () => clearTimeout(timer);
        }
    }, [selectingFor]);

    useEffect(() => {
        const handler = (e) => {
            if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const results = useMemo(() => {
        const q = query.toLowerCase().trim();
        const out = [];
        if (filter !== 'teams') MOCK_PLAYERS.forEach(p => {
            if (!q || p.name.toLowerCase().includes(q)) out.push({ type: 'player', ...p });
        });
        if (filter !== 'players') MOCK_TEAMS.forEach(t => {
            const name = t.players.join(' + ');
            if (!q || name.toLowerCase().includes(q)) out.push({ type: 'team', ...t, name });
        });
        return out;
    }, [query, filter]);

    const handleSelect = (entity) => {
        onSelect(entity);
        setOpen(false);
        setQuery('');
    };

    return (
        <div className={`st-selector${selectingFor ? ' selecting' : ''}`}>
            {selectingFor && (
                <div className="st-selector-banner">
                    <Search size={14} />
                    Select {selectingFor === 'left' ? 'first' : 'second'} entity for comparison
                </div>
            )}
            <div className="st-selector-row">
                {/* Search */}
                <div ref={dropRef} className="st-search-wrap">
                    <Search size={14} className="st-search-icon" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="st-search"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onFocus={() => setOpen(true)}
                        placeholder={selectingFor ? `Search for ${selectingFor === 'left' ? 'first' : 'second'} entity...` : 'Search players or teams...'}
                    />
                    {query && (
                        <button className="st-search-clear" onClick={() => setQuery('')}>
                            <X size={13} />
                        </button>
                    )}

                    {open && (
                        <div className="st-dropdown">
                            {results.length === 0 ? (
                                <div className="st-dropdown-empty">No results</div>
                            ) : results.map(entity => (
                                <div
                                    key={entity.id}
                                    className="st-dropdown-item"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleSelect(entity)}
                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(entity); } }}
                                >
                                    {entity.type === 'player' ? (
                                        <>
                                            <img src={entity.avatarUrl} alt={entity.name} className="st-dropdown-avatar" />
                                            <div>
                                                <div className="st-dropdown-name">{entity.name}</div>
                                                <div className="st-dropdown-meta"><User size={10} /> {entity.gamesPlayed} games</div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex' }}>
                                                {entity.players.map((pName, i) => {
                                                    const p = PLAYERS_BY_NAME.get(pName);
                                                    return (
                                                        <img key={pName} src={p?.avatarUrl || `https://mc-heads.net/avatar/${pName}/100`}
                                                             alt={pName} className="st-dropdown-avatar"
                                                             style={{ marginLeft: i > 0 ? -8 : 0, border: '1px solid oklch(26% 0.020 255)' }} />
                                                    );
                                                })}
                                            </div>
                                            <div>
                                                <div className="st-dropdown-name">{entity.name}</div>
                                                <div className="st-dropdown-meta"><Users size={10} /> Team · {entity.gamesPlayed} games</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Filter */}
                <div className="st-filter-row">
                    {[
                        { id: 'all',     label: 'All' },
                        { id: 'players', label: 'Players', icon: <User size={11} /> },
                        { id: 'teams',   label: 'Teams',   icon: <Users size={11} /> },
                    ].map(f => (
                        <button key={f.id} className={`st-filter-btn${filter === f.id ? ' active' : ''}`} onClick={() => setFilter(f.id)}>
                            {f.icon} {f.label}
                        </button>
                    ))}
                </div>

                {/* Compare */}
                <button className={`st-compare-btn${compareMode ? ' active' : ''}`} onClick={onToggleCompare}>
                    <ArrowLeftRight size={14} /> Compare
                </button>
            </div>

            {/* Selected entity */}
            {selectedEntity && !compareMode && (
                <div className="st-selected">
                    {selectedEntity.type === 'player' ? (
                        <img src={selectedEntity.avatarUrl} alt={selectedEntity.name}
                             style={{ width: 38, height: 38, borderRadius: 7, imageRendering: 'pixelated', border: '1px solid oklch(30% 0.019 255)', flexShrink: 0 }} />
                    ) : (
                        <div style={{ display: 'flex' }}>
                            {selectedEntity.players.map((pName, i) => {
                                const p = PLAYERS_BY_NAME.get(pName);
                                return (
                                    <img key={pName} src={p?.avatarUrl || `https://mc-heads.net/avatar/${pName}/100`}
                                         alt={pName} style={{ width: 34, height: 34, borderRadius: 6, imageRendering: 'pixelated', marginLeft: i > 0 ? -8 : 0, border: '1px solid oklch(26% 0.020 255)' }} />
                                );
                            })}
                        </div>
                    )}
                    <div>
                        <div className="st-selected-name">{selectedEntity.name}</div>
                        <div className="st-selected-meta">
                            {selectedEntity.type === 'player' ? <><User size={11} /> Individual</> : <><Users size={11} /> Team</>}
                        </div>
                    </div>
                    <button className="st-selected-clear" style={{ marginLeft: 'auto' }} onClick={() => onSelect(null)}>
                        <X size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

export function StatCard({ icon, label, value, subValue, color }) {
    const col = color || 'oklch(65% 0.16 255)';
    return (
        <div className="st-card st-in">
            <div className="st-card-icon" style={{ background: col + '14', border: `1px solid ${col}30` }}>
                {icon && React.cloneElement(icon, { size: 20, color: col, strokeWidth: 2 })}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div className="st-card-label">{label}</div>
                <div className="st-card-value">{value}</div>
                {subValue && <div className="st-card-sub">{subValue}</div>}
            </div>
        </div>
    );
}

// ── Canvas: Rank Badge ────────────────────────────────────────────────────────

export function CanvasRankBadge({ rank, size = 110 }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);

        const cx = size / 2, cy = size / 2, r = size * 0.38;

        const palette = rank === 1 ? { fill: '#FFD700', stroke: '#FFA500', text: '#1a1205' }
            : rank === 2 ? { fill: '#B8B8B8', stroke: '#909090', text: '#1a1a1a' }
                : rank === 3 ? { fill: '#CD7F32', stroke: '#A05C1A', text: '#1a1205' }
                    : rank <= 10 ? { fill: 'oklch(65% 0.16 255)', stroke: 'oklch(50% 0.18 255)', text: '#e0e8ff' }
                        :              { fill: 'oklch(26% 0.020 255)', stroke: 'oklch(34% 0.016 255)', text: 'oklch(58% 0.012 255)' };

        ctx.clearRect(0, 0, size, size);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI / 3) - Math.PI / 2;
            i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
                : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
        }
        ctx.closePath();
        ctx.fillStyle   = palette.fill;
        ctx.strokeStyle = palette.stroke;
        ctx.lineWidth   = 2;
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle    = palette.text;
        ctx.font         = `800 ${size * 0.26}px 'Barlow Condensed', system-ui, sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`#${rank}`, cx, cy);
    }, [rank, size]);

    return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
}

// ── Canvas: Win Rate Ring ─────────────────────────────────────────────────────

export function CanvasWinRateRing({ percentage, size = 90 }) {
    const canvasRef = useRef(null);
    const animRef   = useRef(null);
    const curPct    = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);

        const cx = size / 2, cy = size / 2, r = size * 0.38, lw = size * 0.10;
        const target = percentage;

        const draw = (pct) => {
            ctx.clearRect(0, 0, size, size);
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = 'oklch(26% 0.020 255)';
            ctx.lineWidth = lw;
            ctx.stroke();

            if (pct > 0) {
                ctx.beginPath();
                ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (pct / 100) * Math.PI * 2);
                ctx.strokeStyle = 'oklch(76% 0.16 68)';
                ctx.lineWidth = lw;
                ctx.lineCap = 'round';
                ctx.stroke();
            }

            ctx.fillStyle    = 'oklch(94% 0.007 255)';
            ctx.font         = `700 ${size * 0.20}px 'Barlow Condensed', system-ui, sans-serif`;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${pct.toFixed(0)}%`, cx, cy);
        };

        const animate = () => {
            if (curPct.current < target) {
                curPct.current = Math.min(curPct.current + 1.5, target);
                draw(curPct.current);
                animRef.current = requestAnimationFrame(animate);
            } else {
                draw(target);
            }
        };
        curPct.current = 0;
        animate();
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, [percentage, size]);

    return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
}

// ── Canvas: Rarity Chart ──────────────────────────────────────────────────────

const RARITY_COLORS = {
    COMMON:        'oklch(58% 0.012 255)',
    UNCOMMON:      'oklch(64% 0.20 142)',
    RARE:          'oklch(65% 0.16 255)',
    EPIC:          'oklch(62% 0.18 300)',
    LEGENDARY:     'oklch(76% 0.16 68)',
    EXTRAORDINARY: 'oklch(72% 0.24 150)',
    RNGESUS:       'oklch(66% 0.24 320)',
};

export function CanvasRarityChart({ raritiesFound, width = 320, height = 160 }) {
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

        const rarities = Object.keys(RARITY_COLORS);
        const maxVal   = Math.max(1, ...rarities.map(r => raritiesFound[r] || 0));
        const barH = 16, gap = 6;
        const labelW = 120, valW = 50;
        const barMax = width - labelW - valW - 10;

        rarities.forEach((r, i) => {
            const y   = i * (barH + gap);
            const val = raritiesFound[r] || 0;
            const bw  = (val / maxVal) * barMax;
            const col = RARITY_COLORS[r];

            ctx.fillStyle    = col;
            ctx.font         = `600 12px 'Barlow', system-ui, sans-serif`;
            ctx.textAlign    = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(r, 0, y + barH / 2);

            ctx.fillStyle = 'oklch(22% 0.022 255)';
            ctx.beginPath(); ctx.roundRect(labelW, y, barMax, barH, 4); ctx.fill();

            if (bw > 0) {
                ctx.fillStyle = col + 'CC';
                ctx.beginPath(); ctx.roundRect(labelW, y, Math.max(bw, 8), barH, 4); ctx.fill();
            }

            ctx.fillStyle    = 'oklch(72% 0.011 255)';
            ctx.font         = `600 11px 'Barlow', system-ui, sans-serif`;
            ctx.textAlign    = 'right';
            ctx.fillText(val.toLocaleString(), width, y + barH / 2);
        });
    }, [raritiesFound, width, height]);

    return <canvas ref={canvasRef} style={{ width, height }} />;
}

// ── Top Items Card ────────────────────────────────────────────────────────────

const IMG = 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib';

const MEDAL_COLORS = [
    { bg: '#FFD700', text: '#1a1205' },
    { bg: '#B8B8B8', text: '#1a1a1a' },
    { bg: '#CD7F32', text: '#1a1205' },
];

export function TopItemsCard({ items }) {
    return (
        <div className="st-panel">
            <div className="st-panel-title">
                <Trophy size={16} style={{ color: 'oklch(76% 0.16 68)', flexShrink: 0 }} />
                <div>
                    <div className="st-panel-label">Most Found Items</div>
                    <div className="st-panel-sub">Your top 3 collected</div>
                </div>
            </div>
            <div className="st-top-items">
                {items.slice(0, 3).map((item, idx) => (
                    <div key={item.name} className="st-top-item">
                        <div className="st-top-medal" style={{ background: MEDAL_COLORS[idx].bg, color: MEDAL_COLORS[idx].text }}>
                            {idx + 1}
                        </div>
                        <img src={`${IMG}/${item.texture}.png`} alt={item.name}
                             style={{ width: 46, height: 46, imageRendering: 'pixelated', marginTop: 8 }}
                             onError={e => { e.target.style.display = 'none'; }} />
                        <span className="st-top-item-name">{item.name.replace(/_/g, ' ')}</span>
                        <span className="st-top-item-count" style={{ color: MEDAL_COLORS[idx].bg }}>×{item.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}