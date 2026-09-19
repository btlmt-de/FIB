import React, { useEffect, useRef } from 'react';
import { Crosshair, Timer } from 'lucide-react';
import { useCalm } from '../../../config/power.js';
import { RARITY, getRarityInk } from '../../../utils/rarityHelpers.jsx';
import './FirstBloodRoom.css';
import EventStartCountdown from './EventStartCountdown.jsx';
import EventWinnerReveal from './EventWinnerReveal.jsx';

const REWARDS = [['rare','9–12'],['exotic','11–14'],['relic','12–15'],['legendary','13–16'],['mythic','17–20'],['insane','20–25']];

export function FirstBloodRoom({ visible }) {
    const host = useRef(null);
    const calm = useCalm();
    useEffect(() => {
        if (!visible || !host.current) return;
        let cancelled = false, dispose;
        // Load the lightweight dust renderer only while the room is visible.
        import('./firstBloodScene.js').then(({createFirstBloodScene}) => {
            if (!cancelled) dispose = createFirstBloodScene(host.current,{calm});
        });
        return () => { cancelled = true; dispose?.(); };
    }, [visible, calm]);
    if (!visible) return null;
    return <div className="fb-room" aria-hidden="true" data-calm={calm}>
        <div className="fb-room-backdrop"/>
        <div className="fb-room-dust"/>
        <div className="fb-room-particles" ref={host}/>
        <div className="fb-room-shade"/>
    </div>;
}

export function FirstBloodRoomHeader({ pending, clock, critical, winner, closing, onEnd }) {
    return <section className="fb-room-header" data-winner={!!winner} data-pending={pending && !winner} data-critical={critical} style={{opacity:closing ? 0 : 1}} aria-label="First Blood event">
        <div className="fb-room-kicker"><span/> <Crosshair size={16}/> <span/></div>
        <h2>First <em>Blood</em></h2>
        {winner && <EventWinnerReveal winner={winner} theme="first-blood"/>}
        {pending ? <EventStartCountdown clock={clock} theme="first-blood">Be the first to pull Rare or better.</EventStartCountdown> : <div className="event-start-live">
            <p>{pending ? 'The showdown is about to begin' : 'Be the first to pull Rare or better'}</p>
            <div className="fb-room-clock"><Timer size={20}/><strong>{clock}</strong>{pending && <small>UNTIL HIGH NOON</small>}</div>
            <div className="fb-room-rewards" aria-label="Lucky Spin rewards by qualifying rarity">
                <small>LUCKY SPINS</small>
                {REWARDS.map(([rarity,reward]) => <span key={rarity} style={{color:getRarityInk(rarity)}}>{RARITY[rarity].label} <b>{reward}</b></span>)}
            </div>
        </div>}
        {onEnd && <button className="fb-room-end" onClick={onEnd}>End event</button>}
    </section>;
}
