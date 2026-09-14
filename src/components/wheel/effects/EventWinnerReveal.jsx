import React, { useEffect, useState } from 'react';
import { Crown, Crosshair, Sparkles, Wheat } from 'lucide-react';
import { useCalm } from '../../../config/power.js';
import { RARITY, getRarityInk } from '../../../utils/rarityHelpers.jsx';
import './EventWinnerReveal.css';

export default function EventWinnerReveal({ winner, theme }) {
    const identity = JSON.stringify([theme, winner.eventId, winner.userId, winner.username, winner.item, winner.itemRarity, winner.points, winner.luckySpinsAwarded]);
    return <WinnerReveal key={identity} winner={winner} theme={theme}/>;
}

function WinnerReveal({ winner, theme }) {
    const calm = useCalm();
    const blood = theme === 'first-blood';
    const Icon = blood ? Crosshair : Crown;
    const [showPrize, setShowPrize] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setShowPrize(true), 3000);
        return () => clearTimeout(timer);
    }, []);
    return <div className="event-winner" data-theme={theme} data-calm={calm} role="status" aria-atomic="true">
        <div className="event-winner-ornament" aria-hidden="true">
            {blood ? <Crosshair size={150} strokeWidth={0.6}/> : <><Wheat className="event-winner-laurel event-winner-laurel-left" size={100} strokeWidth={0.8}/><Wheat className="event-winner-laurel event-winner-laurel-right" size={100} strokeWidth={0.8}/></>}
        </div>
        <div className="event-winner-heading"><span/><Icon size={18} strokeWidth={1.3} aria-hidden="true"/><span className="event-winner-label">{blood ? 'First Blood claimed' : 'King of the Wheel'}</span><span/></div>
        <div className="event-winner-person">
            <strong className="event-winner-name">{winner.username}</strong>
        </div>
        <div className="event-winner-payoff" key={showPrize ? 'prize' : 'pull'}>
            {showPrize ? <div className="event-winner-prize"><Sparkles size={18} aria-hidden="true"/><strong>+{winner.luckySpinsAwarded}</strong><span>Lucky Spins awarded</span></div> :
                <span className="event-winner-detail" style={blood ? { color: getRarityInk(winner.itemRarity) } : undefined}>
                    {blood ? `Won with ${winner.item} · ${RARITY[winner.itemRarity]?.label || winner.itemRarity}` : `Wins with ${Number(winner.points || 0).toLocaleString('en-US')} points`}
                </span>}
        </div>
    </div>;
}
