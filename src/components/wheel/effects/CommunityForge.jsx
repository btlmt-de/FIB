import React, { useEffect, useState } from 'react';
import { Anvil, Hammer, Flame, Check, LockKeyhole, Gem, Timer, Users, Sparkles } from 'lucide-react';
import { useActivity } from '../../../context/ActivityContext.jsx';
import { useCalm } from '../../../config/power.js';
import { forgeStages } from '../../../utils/forgeProgress.js';
import EventStartCountdown from './EventStartCountdown.jsx';
import { ForgeFlow } from './ForgeFlow.jsx';
import './CommunityForge.css';

const number = value => Number(value || 0).toLocaleString('en-US');
function useForgeMotion() {
    const calm = useCalm();
    const [hidden, setHidden] = useState(() => document.hidden);
    useEffect(() => {
        const update = () => setHidden(document.hidden);
        document.addEventListener('visibilitychange', update);
        return () => document.removeEventListener('visibilitychange', update);
    }, []);
    return { 'data-calm': calm, 'data-paused': hidden };
}

export function CommunityForgeAtmosphere({ visible }) {
    const motion = useForgeMotion();
    const { communityGoal, globalEventStatus } = useActivity();
    const progress = communityGoal?.progress || 0;
    if (!visible) return null;
    return <div className="cg-forge-room" aria-hidden="true" {...motion}>
        <div className="cg-forge-backdrop"/>
        <ForgeFlow active={globalEventStatus?.type === 'community_goal' && !!globalEventStatus.active}/>
        <div className="cg-forge-light"/>
        <div className="cg-forge-stoke" key={progress}/>
        <div className="cg-forge-embers">{Array.from({ length: 20 }, (_, i) => <i key={i} style={{ '--x': `${(i * 37) % 100}%`, '--delay': `${-i * .73}s`, '--drift': `${(i % 2 ? 1 : -1) * (30 + i * 3)}px`, '--duration': `${5 + i % 5}s` }}/>)}</div>
        <div className="cg-forge-shade"/>
    </div>;
}

export function CommunityForgeHeader({ pending, active, clock, progress, specialDrops, tiers,
    participants, participationReward, payout, goalRaised, result, reward, closing, onEnd }) {
    const motion = useForgeMotion();
    const [observed, setObserved] = useState({ progress, active });
    const [burst, setBurst] = useState(null);
    if (observed.progress !== progress || observed.active !== active) {
        const delta = progress - observed.progress;
        setObserved({ progress, active });
        setBurst(active && observed.active && delta > 0 ? { points: delta, id: progress } : null);
    }
    useEffect(() => {
        if (!burst) return undefined;
        const timer = setTimeout(() => setBurst(null), 1600);
        return () => clearTimeout(timer);
    }, [burst]);
    const stages = forgeStages(result?.tiers || tiers, result?.progress ?? progress, result?.specialDrops ?? specialDrops);
    const next = stages.find(stage => !stage.reached);
    return <section className="cg-forge-header" data-pending={pending} data-result={!!result} style={{ opacity: closing ? 0 : 1 }} aria-label="Community Goal forge" {...motion}>
        <div className="cg-forge-title"><Anvil size={22}/><h2>Community <em>Goal</em></h2><span className="cg-forge-clock"><Timer size={14}/>{clock}</span></div>
        {pending ? <EventStartCountdown clock={clock} theme="forge">Every spin fuels the forge. Reach stages together.</EventStartCountdown> : <>
            <div className="cg-forge-machine" data-striking={!!burst}>
                <div className="cg-forge-hammer" key={burst?.id || 'rest'} aria-hidden="true"><Hammer size={38}/><Anvil size={30}/></div>
                <div className="cg-forge-stages">
                    {stages.map(stage => <div className="cg-forge-stage" key={stage.key} data-tier={stage.key} data-reached={stage.reached} data-gated={stage.gated}>
                        <div className="cg-forge-stage-label"><span>{stage.reached ? <Check size={13}/> : stage.key === 'diamond' ? <Gem size={13}/> : <Anvil size={13}/>} {stage.name}</span><strong>{number(stage.threshold)} <small>pts</small></strong></div>
                        <div className="cg-forge-channel" role="progressbar" aria-label={`${stage.name} points`} aria-valuemin={0} aria-valuemax={Math.max(0, stage.span)} aria-valuenow={Math.max(0, Math.min((result?.progress ?? progress) - stage.start, stage.span))} aria-valuetext={`${number(Math.max(0, Math.min((result?.progress ?? progress) - stage.start, stage.span)))} of ${number(Math.max(0, stage.span))} points; ${stage.reached ? 'stage forged' : `${stage.specialsShort} special drops still needed`}`}>
                            <div className="cg-forge-molten" style={{ width: `${stage.fill * 100}%` }}><span/></div>
                            <div className="cg-forge-rivets" aria-hidden="true"/>
                        </div>
                        <div className="cg-forge-stage-gate" title="Specials are Rare or better pulls across all players. Spin at least once to participate."><span>{stage.reached ? <Check size={11}/> : <LockKeyhole size={11}/>} {stage.specials ? `${Math.min(result?.specialDrops ?? specialDrops, stage.specials)}/${stage.specials} specials` : 'Points only'}</span><b>{(result?.participationReward ?? participationReward) + stage.bonus} <small>Lucky Spins each</small></b></div>
                    </div>)}
                </div>
                {burst && !result && <div className="cg-forge-strike" key={burst.id} aria-hidden="true"><strong>+{number(burst.points)}</strong>{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--dx': `${(i - 5.5) * 18}px`, '--dy': `${-25 - (i % 4) * 14}px` }}/>)}</div>}
            </div>
            {result ? <div className="cg-forge-summary" role="status"><strong>{result.succeeded ? `${result.tierName} forged together` : 'The forge falls quiet'}</strong><span>{number(result.progress)} points · {number(result.participantCount)} players · {number(result.specialDrops)} specials</span><b><Sparkles size={14}/>{reward ? `${reward.luckySpinsAwarded} Lucky Spins for you` : `${result.luckySpinsAwarded} Lucky Spins per participant`}</b>{result.gatedTierName && <small>{result.gatedTierName} needed {result.gatedTierSpecials} specials; {result.specialDrops} landed.</small>}{result.topContributors?.[0] && <small>Top contributor: {result.topContributors[0].username} · {number(result.topContributors[0].points)} pts</small>}</div> :
                <div className="cg-forge-status"><span><Flame size={16}/><span><strong>{number(progress)}</strong> points</span></span><span><Users size={16}/><span><strong>{participants}</strong> forging</span></span><span><Sparkles size={16}/><span><strong>{payout}</strong> Lucky Spins each</span></span><span className="cg-forge-next" role="status">{goalRaised ? 'More players joined — targets increased' : next ? next.gated ? `${next.name}: ${next.specialsShort} more special${next.specialsShort === 1 ? '' : 's'} needed` : `${number(next.pointsShort)} pts${next.specialsShort ? ` + ${next.specialsShort} specials` : ''} to ${next.name}` : 'All stages forged!'}</span></div>}
        </>}
        {onEnd && <button className="cg-forge-end" onClick={onEnd}>End event</button>}
    </section>;
}

export function ForgeSpinControl({ onSpin, user, isLoading, error }) {
    return <div className="cg-forge-control"><button onClick={onSpin} disabled={!user || isLoading} aria-label="Spin to fuel the community forge"><span><Hammer size={52}/><Anvil size={60}/></span><strong>{isLoading ? 'Heating the forge' : user ? 'Fuel the forge' : 'Sign in to forge'}</strong></button><small>Every spin adds points · Rare or better unlocks stages</small>{user && !isLoading && <small><kbd>SPACE</kbd> or press the anvil</small>}{error && <span role="alert">{error}</span>}</div>;
}
