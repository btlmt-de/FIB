import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../../../config/constants.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { serverNow } from '../../../utils/serverClock.js';
import { useCalm, visibleInterval } from '../../../config/power.js';
import { jimboLine } from './highRollerDialogue.js';
import './HighRollerTable.css';

const SUITS = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_NAMES = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };
const OUTCOMES = { blackjack: 'Blackjack!', win: 'You win', push: 'A push', loss: 'House wins' };

// Each slot stays in the hand; its card travels from the measured deck position.
// Stable slot keys let the dealer's hole card turn over without being re-dealt.
function PlayingCard({ card, hidden, compact, deckRef, delay = 0, angle = 0, onMotion }) {
    const slot = useRef(null);
    const previous = useRef(null);
    const calm = useCalm();
    const identity = hidden ? 'hidden' : card?.rank + ':' + card?.suit;
    useLayoutEffect(() => {
        const was = previous.current;
        previous.current = identity;
        if (compact || calm || !slot.current || !deckRef?.current || was === identity) return;
        const node = slot.current;
        const flipping = was === 'hidden' && !hidden;
        const source = deckRef.current.getBoundingClientRect();
        const target = node.getBoundingClientRect();
        const dx = source.left + source.width / 2 - target.left - target.width / 2;
        const dy = source.top + source.height / 2 - target.top - target.height / 2;
        const travel = flipping ? null : node.animate([
            { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.82)', opacity: 0 },
            { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.82)', opacity: 1, offset: .05 },
            { transform: 'translate(' + dx * .45 + 'px,' + (dy * .45 - 35) + 'px) scale(1.07)', opacity: 1, offset: .5 },
            { transform: 'translate(0,0) scale(1)', opacity: 1 },
        ], { duration: 1150, delay, easing: 'cubic-bezier(.22,.65,.28,1)', fill: 'backwards' });
        const turn = !hidden ? node.querySelector('.hr-card-turn').animate([
            { transform: 'rotateY(180deg)' },
            { transform: 'rotateY(180deg)', offset: flipping ? .16 : .45 },
            { transform: 'rotateY(0deg)' },
        ], { duration: flipping ? 1000 : 1150, delay: flipping ? 300 : delay, easing: 'ease-in-out', fill: 'backwards' }) : null;
        node.style.zIndex = '20';
        onMotion?.(1);
        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            node.style.zIndex = '';
            onMotion?.(-1);
        };
        // A backgrounded tab can pause the animation timeline. Never strand an action lock.
        const safety = setTimeout(() => { travel?.finish(); turn?.finish(); finish(); }, (flipping ? 1300 : 1150 + delay) + 150);
        Promise.all([travel?.finished, turn?.finished]).then(finish, finish);
        return () => {
            // StrictMode replays mount effects; a cancelled entrance must be replayable.
            clearTimeout(safety);
            if (!finished) previous.current = was;
            travel?.cancel(); turn?.cancel(); finish();
        };
    }, [identity, hidden, compact, calm, deckRef, delay, onMotion]);
    return <span ref={slot} className="hr-card-slot" style={{ '--card-angle': angle + 'deg' }}
        aria-label={hidden ? 'Face-down card' : card.rank + ' of ' + SUIT_NAMES[card.suit]}>
        <span className="hr-card-pose"><span className="hr-card-turn">
            {!hidden && <span className="hr-card hr-card-front" data-red={card.suit === 'H' || card.suit === 'D'} aria-hidden="true">
                <span className="hr-card-corner">{card.rank}<small>{SUITS[card.suit]}</small></span>
                <span className="hr-card-suit">{SUITS[card.suit]}</span>
                <span className="hr-card-corner hr-card-bottom">{card.rank}<small>{SUITS[card.suit]}</small></span>
            </span>}
            <span className={'hr-card hr-card-back hr-card-reverse' + (hidden ? ' hr-card-hidden' : '')} aria-hidden="true"><span>♠</span></span>
        </span></span>
    </span>;
}

function Hand({ cards = [], holeCard = false, compact = false, deckRef, onMotion, house = false }) {
    const [initialCount] = useState(cards.length + (holeCard ? 1 : 0));
    const all = holeCard ? [...cards, null] : cards;
    return <div className={'hr-hand' + (compact ? ' hr-hand-small' : '')}>
        {all.map((card, i) => <PlayingCard key={i} card={card} hidden={!card} compact={compact}
            deckRef={deckRef} onMotion={onMotion} angle={compact ? 0 : (i % 3 - 1) * 4}
            delay={i < initialCount ? (i * 2 + (house ? 1 : 0)) * 300 : 0}/>)}
    </div>;
}

// Hover chatter coalesces; a line stays readable instead of changing every pointer move.
function useReadableLine(line, urgent) {
    const [shown, setShown] = useState(line);
    const since = useRef(0);
    useEffect(() => {
        if (!since.current) since.current = Date.now();
        if (line === shown) return;
        const readingTime = Math.min(4200, Math.max(2800, shown.length * 34));
        const wait = urgent ? 0 : Math.max(250, readingTime - (Date.now() - since.current));
        const timer = setTimeout(() => { since.current = Date.now(); setShown(line); }, wait);
        return () => clearTimeout(timer);
    }, [line, shown, urgent]);
    return shown;
}

function handLabel(hand) {
    if (!hand || typeof hand.total !== 'number') return '—';
    if (hand.natural) return 'Blackjack';
    if (hand.bust) return 'Bust · ' + hand.total;
    return (hand.soft ? 'Soft ' : '') + hand.total;
}

function useTableClock(active) {
    const [, tick] = useState(0);
    useEffect(() => active ? visibleInterval(() => tick(n => n + 1), 250) : undefined, [active]);
    return serverNow();
}

export function HighRollerAtmosphere() {
    return <div className="hr-room" aria-hidden="true"><div className="hr-room-wall"/><div className="hr-room-vignette"/></div>;
}

export function HighRollerDealer({ table, result, actsFrom, playClosesAt, intent, presentationBusy }) {
    const { user } = useAuth();
    const now = useTableClock(!result);
    const dealer = result?.dealer ?? table?.dealer;
    const mine = (result?.results ?? table?.seats ?? []).find(s => s.userId === user?.id);
    const line = presentationBusy && result ? 'My turn. Let’s turn these over. No more secrets.' : jimboLine({ mine, dealer, settled: !!result, dealing: now < actsFrom,
        open: now >= actsFrom && now < playClosesAt, secondsLeft: Math.ceil((playClosesAt - now) / 1000), intent, signedIn: !!user });
    const spoken = useReadableLine(line, !result && now >= playClosesAt - 5000);
    return <section className="hr-dealer" aria-label="Jimbo’s blackjack table">
        
        <div className="hr-brand"><span>JIMBO’S PRIVATE TABLE</span><h2>HIGH <em>ROLLER</em></h2></div>
        <div className="hr-host">
            <img className="hr-jimbo" src="/jimbo.png" alt="Jimbo, your dealer" draggable="false"/>
            <div className="hr-speech"><span>JIMBO <i>the dealer</i></span><p key={spoken} aria-live="polite" aria-atomic="true">“{spoken}”</p></div>
        </div>
    </section>;
}

export function HighRollerRoom(props) {
    const [presentationBusy, setPresentationBusy] = useState(false);
    return <div className="hr-experience"><HighRollerDealer {...props} presentationBusy={presentationBusy}/><HighRollerTable {...props} onPresentation={setPresentationBusy}/></div>;
}

export function HighRollerTable({ table, result, payout, payouts, actsFrom, playClosesAt, onTable, onIntent, onPresentation }) {
    const { user } = useAuth();
    const deck = useRef(null);
    const [motionCount, setMotionCount] = useState(0);
    const trackMotion = useCallback(delta => setMotionCount(n => Math.max(0, n + delta)), []);
    const moving = motionCount > 0;
    useEffect(() => { onPresentation?.(moving); }, [moving, onPresentation]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const pending = useRef(false);
    const mounted = useRef(true);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    const now = useTableClock(!result);
    const settled = Boolean(result);
    const dealing = !settled && now < (actsFrom ?? 0);
    const open = !settled && !dealing && now < (playClosesAt ?? 0);
    const seats = settled ? result.results ?? [] : table?.seats ?? [];
    const mine = user ? seats.find(s => s.userId === user.id) : null;
    const others = seats.filter(s => s !== mine);
    const post = useCallback(async (path, body) => {
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        setError(null);
        onIntent?.(null);
        try {
            const res = await fetch(API_BASE_URL + '/api/high-roller/' + path, {
                method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body ?? {}),
            });
            const data = await res.json().catch(() => ({}));
            if (!mounted.current) return;
            if (!res.ok) { setError(data.error || 'The table did not take that. Try again.'); return; }
            onTable?.({ dealer: data.dealer, seats: data.seats });
        } catch {
            if (mounted.current) setError('Could not reach the table. Try again.');
        } finally {
            pending.current = false;
            if (mounted.current) setBusy(false);
        }
    }, [onTable, onIntent]);
    const seconds = Math.max(0, Math.ceil(((playClosesAt ?? 0) - now) / 1000));
    const canAct = open && mine && !mine.done && !busy && (!moving || seconds <= 5);
    const canSit = !settled && !mine && user && now < (playClosesAt ?? 0);
    const dealer = result?.dealer ?? table?.dealer;
    const awarded = payout?.luckySpinsAwarded ?? mine?.payout ?? 0;
    const progress = Math.max(0, Math.min(1, (playClosesAt - now) / Math.max(1, playClosesAt - actsFrom)));
    const status = moving ? (settled ? 'The reveal' : 'Dealing your cards') : settled ? 'Round complete' : dealing ? 'Dealing' : !open ? 'Jimbo’s turn' : !mine ? 'Table open' : mine.bust ? 'Busted' : mine.natural ? 'Blackjack' : mine.done ? 'Standing' : 'Your turn';
    // H hits, S stands. Never while the player is typing - live chat sits on
    // this same page - and never with a modifier, so browser shortcuts survive.
    const act = useRef(null);
    act.current = canAct ? action => post('action', { action }) : null;
    useEffect(() => {
        const onKey = e => {
            if (!act.current || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
            const t = e.target;
            if (t?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName)) return;
            const action = { h: 'hit', s: 'stand' }[e.key.toLowerCase()];
            if (!action) return;
            e.preventDefault();
            act.current(action);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
    const hover = action => ({ onMouseEnter: () => canAct && onIntent?.(action), onMouseLeave: () => onIntent?.(null),
        onFocus: () => canAct && onIntent?.(action), onBlur: () => onIntent?.(null) });

    return <div className="hr-player-table" data-settled={settled} data-moving={moving}>
        <div className="hr-status"><span className="hr-eyebrow">{status}</span><span className="hr-clock" data-urgent={open && seconds <= 5}>{open ? seconds + 's left' : settled ? 'Until next time' : dealing ? 'Take your seat' : 'All hands locked'}</span></div>
        <div className="hr-deck" aria-hidden="true"><span className="hr-deck-label">JIMBO’S DECK</span><div className="hr-deck-stack" ref={deck}><span className="hr-deck-leaves"/><span className="hr-card hr-card-back"><span>♠</span></span></div></div>
        <div className="hr-time-track" aria-hidden="true"><span style={{ transform: 'scaleX(' + (settled ? 0 : Number.isFinite(progress) ? progress : 0) + ')' }}/></div>
        <section className="hr-house-hand" aria-label="Jimbo’s hand">
            <div className="hr-hand-heading"><span>JIMBO</span><small>{dealer?.holeCard ? 'Dealer · one card hidden' : settled ? 'Dealer · revealed' : 'Dealer'}</small></div>
            <Hand cards={dealer?.cards} holeCard={dealer?.holeCard} deckRef={deck} onMotion={trackMotion} house/>
            <div className="hr-score" data-bust={dealer?.bust}><strong>{dealer?.holeCard ? '?' : moving ? '…' : dealer?.total ?? '—'}</strong><small>{dealer?.holeCard ? 'HIDDEN' : dealer?.bust ? 'BUST' : dealer?.soft ? 'SOFT' : 'TOTAL'}</small></div>
        </section>
        <section className="hr-your-seat" aria-label="Your seat" aria-busy={busy}>
            {mine ? <>
                <div className="hr-player-hand"><div className="hr-hand-heading"><span>YOU</span><small>{mine.bust ? 'Over 21' : mine.natural ? 'Natural blackjack' : mine.done ? 'Hand locked' : mine.soft ? 'Ace counts as 11' : 'Your hand'}</small></div><Hand cards={mine.cards} deckRef={deck} onMotion={trackMotion}/>
                    <div className="hr-score" data-bust={mine.bust}><strong>{moving ? '…' : mine.total}</strong><small>{mine.natural ? 'NATURAL' : mine.bust ? 'BUST' : mine.soft ? 'SOFT' : 'TOTAL'}</small></div>
                </div>
                {settled ? <div className="hr-controls hr-outcome" role="status" data-win={mine.outcome === 'win' || mine.outcome === 'blackjack'}><strong>{moving ? 'Turning the cards…' : OUTCOMES[mine.outcome] ?? mine.outcome}</strong><span>{moving ? 'The house reveals' : awarded > 0 ? '+' + awarded + ' lucky spins' : 'No lucky spins this hand'}</span></div>
                    : <div className="hr-controls"><div className="hr-actions">
                        <button type="button" className="hr-action hr-hit" disabled={!canAct} aria-keyshortcuts="H" onClick={() => post('action', { action: 'hit' })} {...hover('hit')}>Hit<kbd aria-hidden="true">H</kbd></button>
                        <button type="button" className="hr-action hr-stand" disabled={!canAct} aria-keyshortcuts="S" onClick={() => post('action', { action: 'stand' })} {...hover('stand')}>Stand<kbd aria-hidden="true">S</kbd></button>
                    </div><p className="hr-seat-note" role="status">{moving ? 'Cards on the felt. One moment…' : busy ? 'Jimbo is on it…' : mine.bust ? 'Busted. Stay for the reveal.' : mine.done ? 'Your hand is locked. Waiting for Jimbo.' : dealing ? 'Cards first. Decisions in a moment.' : open ? 'Get closer to 21 than Jimbo. Don’t go over.' : 'No more cards. Jimbo is revealing his hand.'}</p></div>}
            </> : <div className="hr-empty-seat"><span className="hr-empty-suit" aria-hidden="true">♠</span><div><strong>A seat with your name on it.</strong><p>{!user ? 'Sign in to join Jimbo’s table.' : canSit ? 'Play a hand. Win lucky spins.' : 'Watch Jimbo reveal the table.'}</p></div>
                {canSit && <button type="button" className="hr-action hr-hit hr-sit" disabled={busy} onClick={() => post('sit')}>{busy ? 'Taking your seat…' : 'Deal me in'}</button>}</div>}
            {error && <p className="hr-error" role="alert">{error}</p>}
        </section>
        {payouts && <div className="hr-paytable" aria-label="Lucky spin rewards"><span>LUCKY SPINS</span>{['blackjack', 'win', 'push', 'loss'].map(key => <span key={key}>{key === 'blackjack' ? 'Blackjack' : key[0].toUpperCase() + key.slice(1)} <b>+{payouts[key] ?? 0}</b></span>)}</div>}
        {others.length > 0 && <details className="hr-other-seats"><summary>Around the table <span>{others.length} other player{others.length === 1 ? '' : 's'}</span></summary><ul>{others.map(seat => <li key={seat.userId}><span className="hr-seat-name">{seat.username}</span><Hand cards={seat.cards} compact/><span>{settled ? (seat.outcome === 'win' ? 'Win' : seat.outcome === 'loss' ? 'Loss' : OUTCOMES[seat.outcome] ?? seat.outcome) + (seat.payout ? ' +' + seat.payout : '') : handLabel(seat) + (seat.done && !seat.bust && !seat.natural ? ' · Locked' : '')}</span></li>)}</ul></details>}
        {settled && typeof result.totalPaid === 'number' && <p className="hr-table-total">{result.totalPaid} lucky spins paid across {seats.length} seat{seats.length === 1 ? '' : 's'}.</p>}
    </div>;
}
export default HighRollerTable;
