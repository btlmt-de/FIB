import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Trophy     from 'lucide-react/dist/esm/icons/trophy';
import Target     from 'lucide-react/dist/esm/icons/target';
import Flame      from 'lucide-react/dist/esm/icons/flame';
import Footprints from 'lucide-react/dist/esm/icons/footprints';
import Package    from 'lucide-react/dist/esm/icons/package';
import Percent    from 'lucide-react/dist/esm/icons/percent';

import { formatNumber, formatDistance, generateMockLeaderboard } from './statsUtils.js';

const CAT_COLORS = {
    gamesWon:          'oklch(76% 0.16 68)',
    totalItems:        'oklch(68% 0.12 200)',
    winRate:           'oklch(64% 0.20 142)',
    highestScore:      'oklch(62% 0.22 25)',
    highestB2BStreak:  'oklch(72% 0.18 55)',
    distanceTravelled: 'oklch(65% 0.16 255)',
};

const RANK_MEDALS = [
    { bg: '#FFD700', text: '#1a1205' },
    { bg: '#B8B8B8', text: '#1a1a1a' },
    { bg: '#CD7F32', text: '#1a1205' },
];

const CAT_CONFIG = [
    { id: 'gamesWon',         label: 'Games Won',  Icon: Trophy     },
    { id: 'totalItems',       label: 'Items',      Icon: Package    },
    { id: 'winRate',          label: 'Win Rate',   Icon: Percent    },
    { id: 'highestScore',     label: 'High Score', Icon: Target     },
    { id: 'highestB2BStreak', label: 'B2B Streak', Icon: Flame      },
    { id: 'distanceTravelled',label: 'Distance',   Icon: Footprints },
];

export function StatsLeaderboard() {
    const [activeCat, setActiveCat] = useState('gamesWon');
    const [board, setBoard]         = useState([]);

    useEffect(() => { setBoard(generateMockLeaderboard(activeCat)); }, [activeCat]);

    const getValue = useCallback((player) => {
        switch (activeCat) {
            case 'gamesWon':          return player.gamesWon;
            case 'totalItems':        return formatNumber(player.totalItems);
            case 'winRate':           return `${player.winRate}%`;
            case 'highestScore':      return formatNumber(player.highestScore);
            case 'highestB2BStreak':  return player.highestB2BStreak;
            case 'distanceTravelled': return formatDistance(player.distanceTravelled);
            default:                  return player.gamesWon;
        }
    }, [activeCat]);

    const color = CAT_COLORS[activeCat];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="st-in">
            {/* Category chips */}
            <div className="st-lb-cats">
                {CAT_CONFIG.map(cat => {
                    const col = CAT_COLORS[cat.id];
                    const active = activeCat === cat.id;
                    return (
                        <button
                            key={cat.id}
                            className={`st-lb-cat${active ? ' active' : ''}`}
                            onClick={() => setActiveCat(cat.id)}
                            style={active ? { borderColor: col + '50', color: col, background: col + '0F' } : {}}
                        >
                            <cat.Icon size={13} />
                            {cat.label}
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            <div>
                <div className="st-lb-header">
                    <div className="st-lb-col-head">Rank</div>
                    <div className="st-lb-col-head">Player</div>
                    <div className="st-lb-col-head right" style={{ color }}>{CAT_CONFIG.find(c => c.id === activeCat)?.label}</div>
                </div>
                <div className="st-lb-rows">
                    {board.map(player => {
                        const isTop = player.rank <= 3;
                        const medal = RANK_MEDALS[player.rank - 1];
                        return (
                            <div key={player.id} className={`st-lb-row${isTop ? ' top' : ''}`}>
                                <div>
                                    {isTop ? (
                                        <div className="st-rank-badge" style={{ background: medal.bg, color: medal.text }}>
                                            {player.rank}
                                        </div>
                                    ) : (
                                        <span className="st-rank-n">{player.rank}</span>
                                    )}
                                </div>
                                <div className="st-lb-player">
                                    <img src={player.avatarUrl} alt={player.name} className="st-lb-avatar"
                                         style={{ border: `1px solid ${isTop ? color + '50' : 'oklch(28% 0.020 255)'}` }} />
                                    <div>
                                        <div className="st-lb-name" style={{ color: isTop ? color : undefined }}>{player.name}</div>
                                        <div className="st-lb-games">{player.gamesPlayed} games</div>
                                    </div>
                                </div>
                                <div className="st-lb-value" style={{ color }}>{getValue(player)}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}