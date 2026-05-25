import React from 'react';
import Trophy      from 'lucide-react/dist/esm/icons/trophy';
import Target      from 'lucide-react/dist/esm/icons/target';
import Flame       from 'lucide-react/dist/esm/icons/flame';
import Zap         from 'lucide-react/dist/esm/icons/zap';
import Clock       from 'lucide-react/dist/esm/icons/clock';
import TrendingUp  from 'lucide-react/dist/esm/icons/trending-up';
import Award       from 'lucide-react/dist/esm/icons/award';
import Footprints  from 'lucide-react/dist/esm/icons/footprints';
import Plus        from 'lucide-react/dist/esm/icons/plus';
import Swords      from 'lucide-react/dist/esm/icons/swords';
import Package     from 'lucide-react/dist/esm/icons/package';
import Check       from 'lucide-react/dist/esm/icons/check';
import Users       from 'lucide-react/dist/esm/icons/users';

import { PLAYERS_BY_NAME, formatNumber, formatDistance, formatTime } from './statsUtils.js';

import { COLORS as C } from '../../config/constants';

function CompRow({ label, value1, value2, icon, higherIsBetter = true }) {
    const n1 = parseFloat(String(value1).replace(/[^0-9.]/g, '')) || 0;
    const n2 = parseFloat(String(value2).replace(/[^0-9.]/g, '')) || 0;
    let winner = 'none';
    if (n1 > n2) winner = higherIsBetter ? 'left'  : 'right';
    if (n2 > n1) winner = higherIsBetter ? 'right' : 'left';
    return (
        <div className="st-cmp-row">
            <div className="st-cmp-val-left">
                <span className={`st-cmp-val${winner === 'left' ? ' winner' : ''}`}>{value1}</span>
                {winner === 'left' && <Check size={13} style={{ color: C.green, flexShrink: 0 }} />}
            </div>
            <div className="st-cmp-meta">{icon}{label}</div>
            <div className="st-cmp-val-right">
                {winner === 'right' && <Check size={13} style={{ color: C.green, flexShrink: 0 }} />}
                <span className={`st-cmp-val${winner === 'right' ? ' winner' : ''}`}>{value2}</span>
            </div>
        </div>
    );
}

function EntitySlot({ entity, stats, side, onSelect }) {
    if (!entity) return (
        <div className="st-cmp-slot empty" onClick={onSelect}>
            <Plus size={28} style={{ color: 'oklch(38% 0.013 255)', marginBottom: 10 }} />
            <div style={{ fontSize: 13.5, color: 'oklch(48% 0.013 255)' }}>
                Select {side === 'left' ? 'first' : 'second'} entity
            </div>
        </div>
    );

    return (
        <div className="st-cmp-slot">
            {entity.type === 'player' ? (
                <img src={entity.avatarUrl} alt={entity.name}
                     style={{ width: 64, height: 64, borderRadius: 10, imageRendering: 'pixelated',
                         border: '1px solid oklch(30% 0.019 255)', marginBottom: 0 }} />
            ) : (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 0 }}>
                    {entity.players.map((pName, i) => {
                        const p = PLAYERS_BY_NAME.get(pName);
                        return <img key={pName} src={p?.avatarUrl || `https://mc-heads.net/avatar/${pName}/100`}
                                    alt={pName} style={{ width: 52, height: 52, borderRadius: 9,
                            imageRendering: 'pixelated', marginLeft: i > 0 ? -12 : 0,
                            border: '1px solid oklch(28% 0.020 255)' }} />;
                    })}
                </div>
            )}
            <div className="st-cmp-entity-name">{entity.name}</div>
            <div className="st-cmp-rank">Rank #{stats?.rank || '–'}</div>
            <button className="st-cmp-change-btn" onClick={onSelect}>Change</button>
        </div>
    );
}

export function StatsComparison({ entity1, stats1, entity2, stats2, onSelectEntity }) {
    const hasStats = stats1 && stats2;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="st-in">
            <div className="st-cmp-grid">
                <EntitySlot entity={entity1} stats={stats1} side="left"  onSelect={() => onSelectEntity('left')} />
                <div className="st-cmp-vs">
                    <div className="st-cmp-vs-badge">
                        <Swords size={18} style={{ color: C.amber }} />
                    </div>
                </div>
                <EntitySlot entity={entity2} stats={stats2} side="right" onSelect={() => onSelectEntity('right')} />
            </div>

            {hasStats ? (
                <div className="st-panel">
                    <CompRow label="Games Won"       value1={stats1.gamesWon}                                          value2={stats2.gamesWon}                                          icon={<Trophy size={13}    />} />
                    <CompRow label="Win Rate"        value1={`${(stats1.gamesWon/Math.max(stats1.gamesPlayed,1)*100).toFixed(1)}%`} value2={`${(stats2.gamesWon/Math.max(stats2.gamesPlayed,1)*100).toFixed(1)}%`} icon={<Award size={13}     />} />
                    <CompRow label="Highest Score"   value1={formatNumber(stats1.highestScore)}                        value2={formatNumber(stats2.highestScore)}                        icon={<Target size={13}    />} />
                    <CompRow label="Total Items"     value1={formatNumber(stats1.totalItems)}                          value2={formatNumber(stats2.totalItems)}                          icon={<Package size={13}   />} />
                    <CompRow label="Avg Items/Round" value1={stats1.avgItemsPerRound}                                  value2={stats2.avgItemsPerRound}                                  icon={<TrendingUp size={13}/>} />
                    <CompRow label="Avg Time/Item"   value1={formatTime(parseFloat(stats1.avgTimePerItem))}            value2={formatTime(parseFloat(stats2.avgTimePerItem))}            icon={<Clock size={13}     />} higherIsBetter={false} />
                    <CompRow label="B2B Streak"      value1={stats1.highestB2BStreak}                                  value2={stats2.highestB2BStreak}                                  icon={<Flame size={13}     />} />
                    <CompRow label="Item Streak"     value1={stats1.longestItemStreak}                                 value2={stats2.longestItemStreak}                                 icon={<Zap size={13}       />} />
                    <CompRow label="Distance"        value1={formatDistance(stats1.distanceTravelled)}                 value2={formatDistance(stats2.distanceTravelled)}                 icon={<Footprints size={13}/>} />
                </div>
            ) : (
                <div className="st-empty st-panel">
                    <div className="st-empty-icon"><Swords size={24} style={{ color: 'oklch(44% 0.013 255)' }} /></div>
                    <h2 className="st-empty-title">Select Two Entities</h2>
                    <p className="st-empty-sub">Choose two players or teams to compare their stats side by side.</p>
                </div>
            )}
        </div>
    );
}