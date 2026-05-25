import React, { useState, useEffect } from 'react';
import History     from 'lucide-react/dist/esm/icons/history';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Timer       from 'lucide-react/dist/esm/icons/timer';
import Trophy      from 'lucide-react/dist/esm/icons/trophy';
import Clock       from 'lucide-react/dist/esm/icons/clock';
import Package     from 'lucide-react/dist/esm/icons/package';
import Check       from 'lucide-react/dist/esm/icons/check';
import X           from 'lucide-react/dist/esm/icons/x';
import SkipForward from 'lucide-react/dist/esm/icons/skip-forward';
import ArrowLeft   from 'lucide-react/dist/esm/icons/arrow-left';

import { MOCK_PLAYERS, PLAYERS_BY_NAME, formatDuration, formatDate, IMAGE_BASE_URL } from './statsUtils.js';

// ── Pool colors ───────────────────────────────────────────────────────────────
const POOL_COL = {
    early: 'oklch(64% 0.20 142)',
    mid:   'oklch(76% 0.16 68)',
    late:  'oklch(62% 0.22 25)',
};

// ── Mock data ─────────────────────────────────────────────────────────────────
const ITEM_POOL = [
    { name:'Oak Log',          texture:'oak_log',          pool:'early' },
    { name:'Cobblestone',      texture:'cobblestone',      pool:'early' },
    { name:'Wheat Seeds',      texture:'wheat_seeds',      pool:'early' },
    { name:'Wooden Pickaxe',   texture:'wooden_pickaxe',   pool:'early' },
    { name:'Crafting Table',   texture:'crafting_table',   pool:'early' },
    { name:'Torch',            texture:'torch',            pool:'early' },
    { name:'Iron Pickaxe',     texture:'iron_pickaxe',     pool:'mid'   },
    { name:'Bow',              texture:'bow',              pool:'mid'   },
    { name:'Shield',           texture:'shield',           pool:'mid'   },
    { name:'Golden Apple',     texture:'golden_apple',     pool:'mid'   },
    { name:'Ender Pearl',      texture:'ender_pearl',      pool:'mid'   },
    { name:'Blaze Rod',        texture:'blaze_rod',        pool:'mid'   },
    { name:'Diamond Sword',    texture:'diamond_sword',    pool:'late'  },
    { name:'Enchanted Book',   texture:'enchanted_book',   pool:'late'  },
    { name:'Totem of Undying', texture:'totem_of_undying', pool:'late'  },
    { name:'Elytra',           texture:'elytra',           pool:'late'  },
    { name:'Nether Star',      texture:'nether_star',      pool:'late'  },
    { name:'Beacon',           texture:'beacon',           pool:'late'  },
];

const genItems = (found, skipped) => {
    let t = 0;
    return Array.from({ length: found + skipped }, (_, i) => {
        t += Math.floor(Math.random() * 120) + 10;
        return { id: `item_${i}`, ...ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)], gameTime: t, skipped: i >= found };
    });
};

const genMatches = () => {
    return Array.from({ length: 15 }, (_, i) => {
        const usedPlayers = new Set();
        const getPlayer = () => {
            const av = MOCK_PLAYERS.filter(p => !usedPlayers.has(p.id));
            if (!av.length) return null;
            const p = av[Math.floor(Math.random() * av.length)];
            usedPlayers.add(p.id);
            return p;
        };
        const teams = Array.from({ length: Math.floor(Math.random() * 3) + 2 }, (_, t) => {
            const players = [getPlayer(), Math.random() > 0.4 ? getPlayer() : null].filter(Boolean);
            if (!players.length) return null;
            const found = Math.floor(Math.random() * 40) + 10;
            const skips = Math.floor(Math.random() * 5);
            return { id: `team_${i}_${t}`, players, score: Math.floor(Math.random() * 20) + 5, itemsFound: found, itemsSkipped: skips, placement: 0, items: genItems(found, skips) };
        }).filter(Boolean);
        const sorted = teams.slice().sort((a, b) => b.score - a.score);
        sorted.forEach((t, idx) => t.placement = idx + 1);
        return {
            id: `match_${i}`,
            date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            duration: Math.floor(Math.random() * 1800) + 600,
            teams: sorted,
            totalItems: sorted.reduce((s, t) => s + t.itemsFound, 0),
        };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
};

// ── Inventory slot — tooltip uses onMouseEnter because it needs coords ────────
const SLOT_SIZE = 60;
const COLS = 9;

function InventorySlot({ item }) {
    const [tip, setTip] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const ref = React.useRef(null);
    const poolColor = item ? POOL_COL[item.pool] || 'oklch(58% 0.012 255)' : null;

    const handleEnter = () => {
        if (!item) return;
        const r = ref.current.getBoundingClientRect();
        setPos({ x: r.left + r.width / 2, y: r.top - 6 });
        setTip(true);
    };

    return (
        <>
            <div
                ref={ref}
                className={`st-inv-slot${item ? ' has-item' : ''}`}
                style={{ width: SLOT_SIZE, height: SLOT_SIZE, borderColor: item ? (POOL_COL[item.pool] || 'oklch(26% 0.020 255)') + '40' : undefined }}
                onMouseEnter={handleEnter}
                onMouseLeave={() => setTip(false)}
            >
                {item && (
                    <>
                        <img src={`${IMAGE_BASE_URL}/${item.texture}.png`} alt={item.name}
                             style={{ width: 40, height: 40, imageRendering: 'pixelated', opacity: item.skipped ? 0.7 : 1, position: 'relative', zIndex: 1 }}
                             onError={e => { e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }} />
                        {item.skipped && (
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                                width: 40, height: 40, WebkitMaskImage: `url(${IMAGE_BASE_URL}/${item.texture}.png)`,
                                maskImage: `url(${IMAGE_BASE_URL}/${item.texture}.png)`, WebkitMaskSize: '40px', maskSize: '40px',
                                WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center',
                                backgroundColor: 'rgba(120,80,200,0.22)', zIndex: 2, pointerEvents: 'none' }}>
                                <div style={{ position:'absolute', top:'-100%', left:'-100%', width:'300%', height:'300%',
                                    background: 'linear-gradient(-50deg,transparent 35%,rgba(160,100,255,0.5) 42%,rgba(120,160,255,0.7) 50%,rgba(160,100,255,0.5) 58%,transparent 65%)',
                                    animation: 'st-enchant 1.5s linear infinite' }} />
                            </div>
                        )}
                    </>
                )}
            </div>
            {tip && item && (
                <div className="st-inv-tooltip" style={{ position:'fixed', left: pos.x, top: pos.y, transform: 'translate(-50%,-100%)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: item.skipped ? 'oklch(62% 0.22 25)' : poolColor, textDecoration: item.skipped ? 'line-through' : 'none', textAlign: 'center', marginBottom: 4 }}>
                        {item.name}
                    </div>
                    <div style={{ textAlign: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '2px 7px', borderRadius: 3, background: (poolColor || 'oklch(26% 0.020 255)') + '20', border: `1px solid ${(poolColor || 'oklch(26% 0.020 255)')}40`, color: poolColor || 'oklch(58% 0.012 255)' }}>
                            {item.pool}
                        </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'oklch(48% 0.013 255)', textAlign: 'center' }}>
                        {Math.floor(item.gameTime / 60)}:{String(item.gameTime % 60).padStart(2,'0')} game time
                    </div>
                    {item.skipped && <div style={{ fontSize: 10, color: 'oklch(62% 0.22 25)', textAlign: 'center', marginTop: 4, fontWeight: 600 }}>SKIPPED</div>}
                </div>
            )}
        </>
    );
}

function InventoryGrid({ items, matchDuration }) {
    const totalSlots = COLS * Math.ceil(items.length / COLS);
    const slots = Array.from({ length: Math.max(totalSlots, COLS * 3) }, (_, i) => items[i] || null);
    return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, ${SLOT_SIZE}px)`, gap: 4, overflowX: 'auto' }}>
            {slots.map((item, i) => <InventorySlot key={i} item={item} />)}
        </div>
    );
}

function TeamDetailView({ team, matchDuration, onBack }) {
    const teamName   = team.players.map(p => p.name).join(' & ');
    const foundItems = team.items.filter(i => !i.skipped);
    const skippedItems = team.items.filter(i => i.skipped);
    const poolStats = { early: 0, mid: 0, late: 0 };
    team.items.forEach(i => { if (poolStats[i.pool] !== undefined) poolStats[i.pool]++; });

    return (
        <div className="st-in">
            <style>{`@keyframes st-enchant { 0% { transform: translate(-33%,-33%); } 100% { transform: translate(33%,33%); } }`}</style>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <button className="st-back" onClick={onBack} style={{ margin: 0 }}>
                    <ArrowLeft size={13} /> Back
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex' }}>
                        {team.players.map((p, i) => (
                            <img key={p.id} src={p.avatarUrl} alt={p.name}
                                 style={{ width: 34, height: 34, borderRadius: 7, imageRendering: 'pixelated', marginLeft: i > 0 ? -8 : 0, border: '1px solid oklch(26% 0.020 255)' }} />
                        ))}
                    </div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'oklch(90% 0.009 255)' }}>{teamName}</div>
                        <div style={{ fontSize: 11.5, color: 'oklch(48% 0.013 255)' }}>#{team.placement} · {team.itemsFound} found · {team.itemsSkipped} skipped</div>
                    </div>
                </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, marginBottom: 16 }}>
                {[
                    { label: 'Score',   value: team.score,             col: 'oklch(76% 0.16 68)' },
                    { label: 'Found',   value: team.itemsFound,        col: 'oklch(64% 0.20 142)' },
                    { label: 'Skipped', value: team.itemsSkipped,      col: 'oklch(62% 0.22 25)' },
                    { label: 'Early',   value: poolStats.early,        col: POOL_COL.early },
                    { label: 'Mid',     value: poolStats.mid,          col: POOL_COL.mid   },
                    { label: 'Late',    value: poolStats.late,         col: POOL_COL.late  },
                ].map(s => (
                    <div key={s.label} style={{ background: 'oklch(21% 0.023 255)', border: '1px solid oklch(28% 0.020 255)', borderRadius: 8, padding: '12px 14px' }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'oklch(44% 0.013 255)', marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontFamily: "'Barlow Condensed', system-ui, sans-serif", fontSize: 22, fontWeight: 800, color: s.col }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Inventory */}
            <div className="st-panel">
                <div className="st-panel-title">
                    <Package size={15} style={{ color: 'oklch(65% 0.16 255)' }} />
                    <div>
                        <div className="st-panel-label">Item Log</div>
                        <div className="st-panel-sub">Hover items for details</div>
                    </div>
                </div>
                <InventoryGrid items={team.items} matchDuration={matchDuration} />
            </div>
        </div>
    );
}

function MatchDetailView({ match, onBack }) {
    const [selectedTeam, setSelectedTeam] = useState(null);
    if (selectedTeam) return <TeamDetailView team={selectedTeam} matchDuration={match.duration} onBack={() => setSelectedTeam(null)} />;

    return (
        <div className="st-in">
            <button className="st-back" onClick={onBack}>
                <ArrowLeft size={13} /> Match List
            </button>

            <div style={{ marginBottom: 18 }}>
                <div style={{ fontFamily: "'Barlow Condensed', system-ui, sans-serif", fontSize: 22, fontWeight: 800, textTransform: 'uppercase', color: 'oklch(92% 0.007 255)', marginBottom: 4 }}>
                    {formatDate(match.date)}
                </div>
                <div style={{ fontSize: 12.5, color: 'oklch(48% 0.013 255)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Timer size={13} /> {formatDuration(match.duration)} · {match.teams.length} teams · {match.totalItems} items total
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {match.teams.map(team => {
                    const teamName = team.players.map(p => p.name).join(' & ');
                    const isWinner = team.placement === 1;
                    return (
                        <div
                            key={team.id}
                            className="st-match-row"
                            onClick={() => setSelectedTeam(team)}
                            style={isWinner ? { borderColor: 'oklch(76% 0.16 68 / 0.30)' } : {}}
                        >
                            <div style={{ width: 26, height: 26, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                background: isWinner ? 'oklch(76% 0.16 68 / 0.12)' : 'oklch(24% 0.022 255)',
                                fontFamily: "'Barlow Condensed', system-ui, sans-serif", fontSize: 13, fontWeight: 800,
                                color: isWinner ? 'oklch(76% 0.16 68)' : 'oklch(48% 0.013 255)' }}>
                                {team.placement}
                            </div>
                            <div style={{ display: 'flex' }}>
                                {team.players.map((p, i) => (
                                    <img key={p.id} src={p.avatarUrl} alt={p.name}
                                         style={{ width: 32, height: 32, borderRadius: 6, imageRendering: 'pixelated', marginLeft: i > 0 ? -8 : 0, border: `1px solid ${isWinner ? 'oklch(76% 0.16 68 / 0.4)' : 'oklch(26% 0.020 255)'}` }} />
                                ))}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 600, color: isWinner ? 'oklch(76% 0.16 68)' : 'oklch(82% 0.009 255)' }}>{teamName}</div>
                                <div style={{ fontSize: 11, color: 'oklch(44% 0.013 255)' }}>{team.itemsFound} items · {team.itemsSkipped} skipped</div>
                            </div>
                            <div style={{ fontFamily: "'Barlow Condensed', system-ui, sans-serif", fontSize: 18, fontWeight: 800, color: isWinner ? 'oklch(76% 0.16 68)' : 'oklch(70% 0.011 255)' }}>
                                {team.score} pts
                            </div>
                            <ChevronRight size={15} style={{ color: 'oklch(38% 0.013 255)', flexShrink: 0 }} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function StatsMatchHistory({ entity }) {
    const [matches, setMatches]           = useState([]);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [currentPage, setCurrentPage]   = useState(0);
    const PER_PAGE = 8;

    useEffect(() => { setMatches(genMatches()); }, []);

    if (selectedMatch) return <MatchDetailView match={selectedMatch} onBack={() => setSelectedMatch(null)} />;

    const totalPages = Math.ceil(matches.length / PER_PAGE);
    const pageItems  = matches.slice(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="st-in">
            <div className="st-panel-title" style={{ marginBottom: 0 }}>
                <History size={16} style={{ color: 'oklch(65% 0.16 255)' }} />
                <div>
                    <div className="st-panel-label">Match History</div>
                    <div className="st-panel-sub">{matches.length} recent games</div>
                </div>
            </div>

            <div>
                {pageItems.map(match => {
                    const winner = match.teams[0];
                    const winnerName = winner.players.map(p => p.name).join(' & ');
                    return (
                        <div key={match.id} className="st-match-row" onClick={() => setSelectedMatch(match)}>
                            <div>
                                <div className="st-match-date">{formatDate(match.date)}</div>
                                <div className="st-match-duration"><Timer size={10} />{formatDuration(match.duration)}</div>
                            </div>
                            <div className="st-match-sep" />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                                <Trophy size={15} style={{ color: 'oklch(76% 0.16 68)', flexShrink: 0 }} />
                                <div style={{ display: 'flex' }}>
                                    {winner.players.map((p, i) => (
                                        <img key={p.id} src={p.avatarUrl} alt={p.name}
                                             style={{ width: 30, height: 30, borderRadius: 5, imageRendering: 'pixelated', marginLeft: i > 0 ? -7 : 0, border: '1px solid oklch(76% 0.16 68 / 0.30)' }} />
                                    ))}
                                </div>
                                <div>
                                    <div className="st-match-winner">{winnerName}</div>
                                    <div className="st-match-winner-sub">Winner · {winner.score} pts</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                                <div className="st-match-stat"><div className="st-match-stat-val">{match.teams.length}</div><div className="st-match-stat-label">teams</div></div>
                                <div className="st-match-stat"><div className="st-match-stat-val">{match.totalItems}</div><div className="st-match-stat-label">items</div></div>
                            </div>
                            <ChevronRight size={15} style={{ color: 'oklch(38% 0.013 255)', flexShrink: 0 }} />
                        </div>
                    );
                })}
            </div>

            {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <button className="st-page-btn" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}>← Prev</button>
                    <span style={{ fontSize: 13, color: 'oklch(52% 0.012 255)' }}>Page {currentPage + 1} of {totalPages}</span>
                    <button className="st-page-btn" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1}>Next →</button>
                </div>
            )}
        </div>
    );
}