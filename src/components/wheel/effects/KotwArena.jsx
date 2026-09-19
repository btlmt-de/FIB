import React from 'react';
import { Crown, Timer } from 'lucide-react';
import { useActivity } from '../../../context/ActivityContext.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { kotwStandings } from '../../../utils/kotwStandings.js';
import { RARITY, getRarityInk } from '../../../utils/rarityHelpers.jsx';
import './KotwArena.css';
import EventStartCountdown from './EventStartCountdown.jsx';
import EventWinnerReveal from './EventWinnerReveal.jsx';

const SCORING = [['common', '1 pt'], ['rare', '~150 pts'], ['exotic', '~180 pts'], ['relic', '~300 pts'], ['legendary', '~600 pts'], ['mythic', '~3k pts'], ['insane', '~100k pts']];

export function KotwArenaAtmosphere({ visible }) {
    if (!visible) return null;
    return <div className="kotw-arena" aria-hidden="true">
        <div className="kotw-arena-backdrop"/>
        <div className="kotw-light-beam kotw-light-left"/>
        <div className="kotw-light-beam kotw-light-right"/>
        <div className="kotw-arena-vignette"/>
    </div>;
}

export function KotwArenaStandings({ compact = false, onOpenLeaderboard }) {
    const { globalEventStatus, kotwLeaderboard, kotwUserStats, kotwSpinPending, kotwWinnerPending } = useActivity();
    const { user } = useAuth();
    const active = (globalEventStatus?.type === 'king_of_wheel' && (globalEventStatus.active || globalEventStatus.pending)) || kotwWinnerPending;
    if (!active) return null;
    const standings = kotwStandings(kotwLeaderboard, { userId: user?.id, pending: kotwSpinPending, confirmedPoints: kotwUserStats?.points });
    const own = standings.find(entry => entry.userId === user?.id);
    const leaderPoints = standings[0]?.points || 0;
    const entries = standings.slice(0, 5);
    if (own && own.rank > 5) entries.push(own);
    const board = <section className={`kotw-standings ${compact ? 'kotw-standings-compact' : ''}`} aria-label="King of the Wheel standings">
        <div className="kotw-board-title"><Crown size={22}/><span>The crown</span><small>LIVE</small></div>
        {entries.length ? <ol>{entries.map(entry => <li key={entry.userId} data-self={entry.userId === user?.id} data-leader={entry.rank === 1}>
            <span className="kotw-rank">{entry.rank}</span>
            <span className="kotw-avatar" aria-hidden="true">{entry.rank === 1 ? <Crown size={17}/> : (entry.username || "?").slice(0, 1).toUpperCase()}</span>
            <span className="kotw-contender">{entry.username || 'Unknown'}{entry.userId === user?.id && <small>YOU</small>}</span>
            <span className="kotw-score">{Number(entry.points).toLocaleString('en-US')} <small>pts</small><small className="kotw-gap">{entry.rank === 1 ? 'HOLDING THE CROWN' : leaderPoints === entry.points ? 'TIED FOR THE LEAD' : `âˆ’${(leaderPoints - entry.points).toLocaleString('en-US')} to lead`}</small></span>
        </li>)}</ol> : <p className="kotw-empty">The throne is open.<br/><strong>Land the first spin.</strong></p>}
        {onOpenLeaderboard && <button className="kotw-full-board" onClick={onOpenLeaderboard}>Full standings &rarr;</button>}
        <div className="kotw-board-footer">{own?.rank === 1 ? 'You hold the crown. Defend it.' : 'Every spin can change the leader.'}</div>
    </section>;
    return compact ? <details className="kotw-pocket-board"><summary><Crown size={16}/><span>{standings[0]?.username || 'The throne is open'}</span><strong>{leaderPoints.toLocaleString('en-US')} pts</strong><small>Standings</small></summary>{board}</details> : board;
}

export function KotwArenaHeader({ pending, settling, clock, critical, winner, closing, onEnd }) {
    return <section className="kotw-arena-header" data-winner={!!winner} data-pending={pending && !winner} data-critical={critical} style={{ opacity: closing ? 0 : 1 }} aria-label="King of the Wheel event">
        <Crown className="kotw-hero-crown" size={48} strokeWidth={1.3}/>
        <h2>King <span>of the</span> Wheel</h2>
        {winner && <EventWinnerReveal winner={winner} theme="king-of-wheel"/>}
        {pending ? <EventStartCountdown clock={clock} theme="king-of-wheel">Score the most points to claim the crown.</EventStartCountdown> : <div className="event-start-live">
            <div className="kotw-clock"><Timer size={20}/><strong>{clock}</strong><span>{pending ? 'UNTIL THE BATTLE' : settling ? 'FINAL SPINS LANDING' : 'TO CLAIM THE CROWN'}</span></div>
            <div className="kotw-scoring" aria-label="Points by rarity">
                {SCORING.map(([rarity, points]) => <span className="kotw-scoring-tier" key={rarity} style={{ color: getRarityInk(rarity) }}>
                    <span>{RARITY[rarity].label}</span><b>{points}</b>
                </span>)}
            </div>
        </div>}
        {!pending && <div className="kotw-small-board"><KotwArenaStandings compact/></div>}
        {onEnd && <button className="kotw-end" onClick={onEnd}>End event</button>}
    </section>;
}
