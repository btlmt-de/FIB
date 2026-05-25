import React, { useMemo } from 'react';
import Users       from 'lucide-react/dist/esm/icons/users';
import User        from 'lucide-react/dist/esm/icons/user';
import Trophy      from 'lucide-react/dist/esm/icons/trophy';
import Target      from 'lucide-react/dist/esm/icons/target';
import Flame       from 'lucide-react/dist/esm/icons/flame';
import Zap         from 'lucide-react/dist/esm/icons/zap';
import Clock       from 'lucide-react/dist/esm/icons/clock';
import TrendingUp  from 'lucide-react/dist/esm/icons/trending-up';
import Footprints  from 'lucide-react/dist/esm/icons/footprints';
import Gamepad2    from 'lucide-react/dist/esm/icons/gamepad-2';
import BarChart3   from 'lucide-react/dist/esm/icons/bar-chart-3';
import Sparkles    from 'lucide-react/dist/esm/icons/sparkles';
import Package     from 'lucide-react/dist/esm/icons/package';

import { formatNumber, formatDistance, formatTime } from './statsUtils.js';
import { StatCard, CanvasRankBadge, CanvasWinRateRing, CanvasRarityChart, TopItemsCard } from './StatsComponents.jsx';

import { COLORS as C } from '../../config/constants';


export function StatsView({ entity, stats }) {
    const winPct = useMemo(() => {
        if (!stats || stats.gamesPlayed === 0) return 0;
        return parseFloat(((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1));
    }, [stats?.gamesWon, stats?.gamesPlayed]);

    if (!entity || !stats) {
        return (
            <div className="st-empty st-in">
                <div className="st-empty-icon">
                    <BarChart3 size={28} style={{ color: 'oklch(48% 0.013 255)' }} />
                </div>
                <h2 className="st-empty-title">Select a Player or Team</h2>
                <p className="st-empty-sub">Use the search above to find players or teams and view their stats.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="st-in">

            {/* Profile header */}
            <div className="st-profile">
                <CanvasRankBadge rank={stats.rank} size={100} />
                <div style={{ flex: 1, minWidth: 200 }}>
                    <h2 className="st-profile-name">{entity.name}</h2>
                    <div className="st-profile-meta">
                        {entity.type === 'team'
                            ? <><Users size={13} /> Team · Ranked #{stats.rank} globally</>
                            : <><User  size={13} /> Player · Ranked #{stats.rank} globally</>
                        }
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <CanvasWinRateRing percentage={winPct} size={88} />
                    <div style={{ fontSize: 11, color: 'oklch(44% 0.013 255)', marginTop: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Win Rate</div>
                </div>
            </div>

            {/* Key metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(176px, 1fr))', gap: 10 }}>
                <StatCard icon={<Gamepad2 />} label="Games Played"  value={stats.gamesPlayed}              color={C.blue}  />
                <StatCard icon={<Trophy />}   label="Games Won"     value={stats.gamesWon}                 color={C.amber} />
                <StatCard icon={<Target />}   label="Highest Score" value={formatNumber(stats.highestScore)} color={C.green} />
                <StatCard icon={<Package />}  label="Total Items"   value={formatNumber(stats.totalItems)}  color={C.cyan}  />
            </div>

            {/* Collection */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12 }}>
                <TopItemsCard items={stats.topItems} />
                <div className="st-panel">
                    <div className="st-panel-title">
                        <Sparkles size={16} style={{ color: C.purple, flexShrink: 0 }} />
                        <div>
                            <div className="st-panel-label">Rarities Found</div>
                            <div className="st-panel-sub">B2B detection breakdown</div>
                        </div>
                    </div>
                    <CanvasRarityChart raritiesFound={stats.raritiesFound} />
                </div>
            </div>

            {/* Efficiency */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(192px, 1fr))', gap: 10 }}>
                <StatCard icon={<TrendingUp />} label="Avg Items / Round"   value={stats.avgItemsPerRound}                    subValue="items per round"      color={C.cyan}   />
                <StatCard icon={<Clock />}      label="Avg Time / Item"     value={formatTime(parseFloat(stats.avgTimePerItem))} subValue="average"             color={C.yellow} />
                <StatCard icon={<Flame />}      label="Highest B2B Streak"  value={stats.highestB2BStreak}                    subValue="back-to-back rares"   color={C.red}    />
                <StatCard icon={<Zap />}        label="Longest Item Streak" value={stats.longestItemStreak}                   subValue="without skipping"     color={C.amber}  />
            </div>

            {/* Distance */}
            <div className="st-distance">
                <div className="st-distance-icon" style={{ background: C.green + '14', border: `1px solid ${C.green}30` }}>
                    <Footprints size={26} style={{ color: C.green }} />
                </div>
                <div>
                    <div className="st-distance-label">Distance Travelled</div>
                    <div className="st-distance-value">{formatDistance(stats.distanceTravelled)}</div>
                </div>
            </div>
        </div>
    );
}