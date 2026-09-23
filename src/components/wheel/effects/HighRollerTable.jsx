import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../../../config/constants.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { serverNow } from '../../../utils/serverClock.js';
import { useCalm, visibleInterval } from '../../../config/power.js';
import { useSound } from '../../../context/SoundContext.jsx';
import { jimboLine, revealLine } from './highRollerDialogue.js';
import {
    CARD_TRAVEL_MS, DEAL_STEP_MS, HOLE_FLIP_DELAY_MS, HOLE_FLIP_MS, SHUFFLE_ENDS_BEFORE_DEAL_MS, SHUFFLE_RIFFLES,
    SHUFFLE_RIFFLE_MS, SHUFFLE_TO_DECK_MS, drawDelay, revealDuration,
} from './highRollerTimeline.js';
import './HighRollerTable.css';

const SUITS = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_NAMES = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };
const OUTCOMES = { blackjack: 'Blackjack!', win: 'You win', push: 'A push', loss: 'House wins' };

// Each slot stays in the hand; its card travels from the measured deck position.
// Stable slot keys let the dealer's hole card turn over without being re-dealt.
function PlayingCard({ card, hidden, compact, deckRef, delay = 0, angle = 0, onMotion, onSound }) {
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
        ], { duration: CARD_TRAVEL_MS, delay, easing: 'cubic-bezier(.22,.65,.28,1)', fill: 'backwards' });
        const turn = !hidden ? node.querySelector('.hr-card-turn').animate([
            { transform: 'rotateY(180deg)' },
            { transform: 'rotateY(180deg)', offset: flipping ? .16 : .45 },
            { transform: 'rotateY(0deg)' },
        ], { duration: flipping ? HOLE_FLIP_MS : CARD_TRAVEL_MS, delay: flipping ? HOLE_FLIP_DELAY_MS : delay, easing: 'ease-in-out', fill: 'backwards' }) : null;
        node.style.zIndex = '20';
        onMotion?.(1);
        // Heard when the card actually moves, not when it was scheduled: a drawn
        // card waits its turn in the deck, and so does its sound.
        const sound = onSound ? setTimeout(() => onSound(flipping ? 'hr_flip' : 'hr_card'),
            flipping ? HOLE_FLIP_DELAY_MS + HOLE_FLIP_MS * .16 : delay) : null;
        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            node.style.zIndex = '';
            onMotion?.(-1);
        };
        // A backgrounded tab can pause the animation timeline. Never strand an action lock.
        const safety = setTimeout(() => { travel?.finish(); turn?.finish(); finish(); }, (flipping ? HOLE_FLIP_DELAY_MS + HOLE_FLIP_MS : CARD_TRAVEL_MS + delay) + 150);
        Promise.all([travel?.finished, turn?.finished]).then(finish, finish);
        return () => {
            // StrictMode replays mount effects; a cancelled entrance must be replayable.
            clearTimeout(safety);
            clearTimeout(sound);
            if (!finished) previous.current = was;
            travel?.cancel(); turn?.cancel(); finish();
        };
    }, [identity, hidden, compact, calm, deckRef, delay, onMotion, onSound]);
    return <span ref={slot} className="hr-card-slot" style={{ '--card-angle': angle + 'deg', ...(compact ? { '--hr-mini-delay': delay + 'ms' } : null) }}
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

// The deal alternates player, house, player, house, DEAL_STEP_MS apart. After that a
// player's hit lands at once - it is the answer to a click - but the house's
// draws are the reveal, dealt one by one after the hole card has turned (see
// highRollerTimeline.js), so its total climbs in beats you can read.
//
// A compact hand (another seat) does not fly: its cards appear. `dealElapsed` is
// how far into the deal it was mounted, and the dealt cards appear when the same
// card lands on its owner's screen - player slots are the even steps of the deal.
function Hand({ cards = [], holeCard = false, compact = false, deckRef, onMotion, onSound, house = false, dealElapsed = Infinity }) {
    const [initialCount] = useState(cards.length + (holeCard ? 1 : 0));
    const all = holeCard ? [...cards, null] : cards;
    return <div className={'hr-hand' + (compact ? ' hr-hand-small' : '')}>
        {all.map((card, i) => <PlayingCard key={i} card={card} hidden={!card} compact={compact}
            deckRef={deckRef} onMotion={onMotion} onSound={onSound} angle={compact ? 0 : (i % 3 - 1) * 4}
            delay={compact ? (i < initialCount ? Math.max(0, i * 2 * DEAL_STEP_MS + CARD_TRAVEL_MS - dealElapsed) : 0)
                : i < initialCount ? (i * 2 + (house ? 1 : 0)) * DEAL_STEP_MS : house ? drawDelay(i - initialCount) : 0}/>)}
    </div>;
}

/** When the intro's shuffle starts, in server ms - worked back from the deal. */
function shuffleStart(dealAt) {
    return dealAt - SHUFFLE_ENDS_BEFORE_DEAL_MS - SHUFFLE_RIFFLES * SHUFFLE_RIFFLE_MS;
}

/*
 * Jimbo shuffles, in the middle of the felt where the hands are about to land:
 * the deck splits into two halves, they riffle together and square up, three
 * times. Pure CSS against a delay computed from the server clock, so a page
 * that joins half way through the intro joins half way through the shuffle
 * rather than starting it over. Under reduced motion the deck simply sits
 * there - the words say what is happening.
 *
 * Then it becomes the deck. Once the halves have squared up for the last time
 * the whole pile slides across the felt into the deck's place, taking on its
 * size and its tilt, and the table's own deck - hidden for the intro - is
 * shown there as this one unmounts. The first card of the deal leaves the pile
 * the player just watched being shuffled. Measured at the moment it moves, so
 * a resized window or a phone's different deck position still lands true.
 */
function Shuffle({ dealAt, deckRef, onSound }) {
    const node = useRef(null);
    const calm = useCalm();
    const delay = shuffleStart(dealAt) - serverNow();
    useEffect(() => {
        const el = node.current;
        if (!el || calm) return undefined;
        let slide = null;
        const timer = setTimeout(() => {
            const deck = deckRef?.current;
            const half = el.querySelector('.hr-shuffle-half');
            if (!deck || !half || !el.isConnected) return;
            const from = half.getBoundingClientRect();
            const to = deck.getBoundingClientRect();
            // Layout heights, not the rects: the deck's rect is inflated by its tilt.
            const scale = deck.offsetHeight / Math.max(1, half.offsetHeight);
            const mid = r => [r.left + r.width / 2, r.top + r.height / 2];
            const pose = (x, y) => 'translate(' + x + 'px,' + y + 'px) perspective(650px) rotateX(27deg) rotateZ(9deg) scale(' + scale + ')';
            let [dx, dy] = [mid(to)[0] - mid(from)[0], mid(to)[1] - mid(from)[1]];
            /*
             * One correction pass. The tilt is applied at the pile's size, not
             * the deck's, so its foreshortening lands the centre a few pixels
             * off (9px measured on a desktop) and by a different amount at
             * every size. So the end pose is tried first, held for no time,
             * measured and nudged by whatever it missed - exact at any size,
             * never painted. It goes through the animation API because the
             * pile's own entrance animation owns `transform`, and an inline
             * style would lose to it.
             */
            const probe = el.animate([{ transform: pose(dx, dy) }, { transform: pose(dx, dy) }], { duration: 1, fill: 'forwards' });
            probe.pause();
            const landed = mid(half.getBoundingClientRect());
            probe.cancel();
            dx += mid(to)[0] - landed[0];
            dy += mid(to)[1] - landed[1];
            onSound?.('hr_card');
            slide = el.animate([{ transform: 'none' }, { transform: pose(dx, dy) }],
                { duration: SHUFFLE_TO_DECK_MS, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
        }, Math.max(0, dealAt - SHUFFLE_ENDS_BEFORE_DEAL_MS - serverNow()));
        return () => { clearTimeout(timer); slide?.cancel(); };
    }, [dealAt, deckRef, calm, onSound]);
    return <div ref={node} className="hr-shuffle" aria-hidden="true" style={{ '--hr-shuffle-delay': delay + 'ms', '--hr-shuffle-ms': SHUFFLE_RIFFLE_MS + 'ms', '--hr-shuffle-n': SHUFFLE_RIFFLES }}>
        <span className="hr-shuffle-half hr-shuffle-l"><span className="hr-card hr-card-back"><span>♠</span></span></span>
        <span className="hr-shuffle-half hr-shuffle-r"><span className="hr-card hr-card-back"><span>♠</span></span></span>
    </div>;
}

const SEAT_OUTCOME = { blackjack: 'Blackjack', win: 'Won', push: 'Push', loss: 'Lost' };

/*
 * Everyone else at the table, face up, as a real table is. They used to be folded
 * into a collapsed "Around the table" list, which made a table of four feel like
 * playing alone. Four seats show; a busier room is summarised rather than allowed
 * to push the player's own hand off the screen.
 *
 * They sit on a rail to the LEFT of the felt, the deck's mirror, not on it. They
 * were first laid out between Jimbo's hand and the player's, which put three or
 * four plaques of cards exactly where the eye goes between "his hand" and "my
 * hand" - the owner found a full table confusing to read. Where the screen has no
 * room beside the felt the rail is not shown at all (HighRollerTable.css): other
 * people's hands are colour, and the two that matter must never be crowded by them.
 */
function OtherSeats({ seats, settled, revealed, dealAt, dealing }) {
    if (!seats.length) return null;
    const shown = seats.slice(0, 4);
    const rest = seats.length - shown.length;
    return <ul className="hr-others" aria-label="Other players at the table">
        <li className="hr-others-heading" aria-hidden="true">At the table</li>
        {shown.map(seat => <OtherSeat key={seat.userId} seat={seat} settled={settled} revealed={revealed} dealAt={dealAt} dealing={dealing}/>)}
        {rest > 0 && <li className="hr-other hr-other-more" title={seats.slice(4).map(s => s.username).join(', ')}>+{rest} more</li>}
    </ul>;
}

/*
 * A seat as its OWNER is seeing it. The server's update reaches the whole room at
 * once, but the owner watches their new card fly from the deck for CARD_TRAVEL_MS
 * before it is on their felt - so everyone else used to see the card, and the
 * bust it caused, a second before the person it happened to. A new card is
 * therefore held back for the length of that flight; anything that adds no card
 * (standing, the result) shows at once, because it shows at once for the owner.
 * Under reduced motion the owner's cards do not fly, so nothing is held.
 */
function useSeatAsOwnerSeesIt(seat) {
    const calm = useCalm();
    const [landed, setLanded] = useState(seat);
    const latest = useRef(seat);
    useEffect(() => { latest.current = seat; }, [seat]);
    const cardsNow = seat.cards?.length ?? 0;
    const cardsLanded = landed.cards?.length ?? 0;
    const inFlight = !calm && cardsNow > cardsLanded;
    // Keyed on the counts, not the seat: a table broadcast re-sends every seat, and
    // restarting the timer on each one would keep a card in the air indefinitely.
    // `landed` is only ever read while a card is in flight, and only card counts
    // decide that, so it is refreshed when a flight ends and nowhere else. The
    // changes that add no card (standing, the result) come straight from `seat`.
    useEffect(() => {
        if (!inFlight) return undefined;
        const timer = setTimeout(() => setLanded(latest.current), CARD_TRAVEL_MS);
        return () => clearTimeout(timer);
    }, [inFlight, cardsNow]);
    return inFlight ? landed : seat;
}

function OtherSeat({ seat: live, settled, revealed, dealAt, dealing }) {
    const seat = useSeatAsOwnerSeesIt(live);
    // How far into the deal this plaque appeared, so its first two cards land when
    // their owner's do rather than all at once the moment the deal starts. Fixed at
    // mount: a re-render must not move a card that is already on its way.
    const [dealElapsed] = useState(() => (dealAt ? serverNow() - dealAt : Infinity));
    const outcome = settled && revealed ? seat.outcome : null;
    const label = outcome ? SEAT_OUTCOME[outcome] + (seat.payout ? ' +' + seat.payout : '')
        : dealing ? '…' : handLabel(seat) + (seat.done && !seat.bust && !seat.natural ? ' · stood' : '');
    return <li className="hr-other" data-outcome={outcome ?? undefined} data-bust={!outcome && !dealing && seat.bust ? true : undefined}>
        <span className="hr-other-name" title={seat.username}>{seat.username}</span>
        <Hand cards={seat.cards} compact dealElapsed={dealElapsed}/>
        <span className="hr-other-state">{label}</span>
    </li>;
}

// Hover chatter coalesces; a line stays readable instead of changing every pointer move.
// `hold` keeps the current line while a card is still in flight: the table's state
// already knows where a hit landed, and Jimbo reacting to a bust before the card
// is on the felt tells the player how it ended before the table shows it.
function useReadableLine(line, urgent, hold = false) {
    const [shown, setShown] = useState(line);
    const since = useRef(0);
    useEffect(() => {
        if (!since.current) since.current = Date.now();
        if (line === shown || hold) return;
        const readingTime = Math.min(4200, Math.max(2800, shown.length * 34));
        const wait = urgent ? 0 : Math.max(250, readingTime - (Date.now() - since.current));
        const timer = setTimeout(() => { since.current = Date.now(); setShown(line); }, wait);
        return () => clearTimeout(timer);
    }, [line, shown, urgent, hold]);
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

export function HighRollerDealer({ table, result, dealAt, actsFrom, playClosesAt, intent, presentationBusy }) {
    const { user } = useAuth();
    const now = useTableClock(!result);
    const dealer = result?.dealer ?? table?.dealer;
    const mine = (result?.results ?? table?.seats ?? []).find(s => s.userId === user?.id);
    const revealing = Boolean(presentationBusy && result);
    const line = revealing ? revealLine(dealAt) : jimboLine({ mine, dealer, settled: !!result, intro: now < (dealAt ?? 0), seed: dealAt, dealing: now < actsFrom,
        open: now >= actsFrom && now < playClosesAt, secondsLeft: Math.ceil((playClosesAt - now) / 1000), intent, signedIn: !!user });
    // Once the result is in, every line cuts in rather than waiting out the reading
    // time of whatever came before. Each is tied to something happening on the felt
    // - the hole card turning, the outcome landing - and after a bust the "over
    // twenty-one" line was still being held when the hole card had already turned,
    // so Jimbo announced the flip late.
    // The hold is for a HIT's card, so it starts once the deal is over: during the
    // deal the cards are moving the whole time, and holding then kept the welcome
    // up across it and swallowed the dealing line entirely.
    const spoken = useReadableLine(line, Boolean(result) || now >= playClosesAt - 5000, presentationBusy && !result && now >= actsFrom);
    return <section className="hr-dealer" aria-label="Jimbo’s blackjack table">
        
        <div className="hr-brand"><h2>HIGH <em>ROLLER</em></h2></div>
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

export function HighRollerTable({ table, result, payout, payouts, dealAt, actsFrom, playClosesAt, onTable, onIntent, onPresentation }) {
    const { user } = useAuth();
    const { playSfx } = useSound();
    const calm = useCalm();
    const deck = useRef(null);
    const [motionCount, setMotionCount] = useState(0);
    const trackMotion = useCallback(delta => setMotionCount(n => Math.max(0, n + delta)), []);
    const moving = motionCount > 0;
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const pending = useRef(false);
    const mounted = useRef(true);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    const now = useTableClock(true);
    const settled = Boolean(result);
    // The intro: Jimbo's welcome and the shuffle. The hands exist already - the
    // server dealt them at the open - but they are held off the felt until the
    // deal, so the first card anyone sees is one leaving the deck.
    const intro = !settled && now < (dealAt ?? 0);
    const dealing = !settled && !intro && now < (actsFrom ?? 0);
    // Three riffles' worth of sound, each at the moment its halves slap
    // together. Worked out from the server clock like the animation, and a
    // riffle already over when the page arrived is simply not played.
    useEffect(() => {
        if (!intro || !dealAt || calm) return undefined;
        const start = shuffleStart(dealAt);
        const timers = [];
        for (let k = 0; k < SHUFFLE_RIFFLES; k++) {
            const wait = start + k * SHUFFLE_RIFFLE_MS + SHUFFLE_RIFFLE_MS * .45 - serverNow();
            if (wait >= 0) timers.push(setTimeout(() => playSfx?.('hr_shuffle'), wait));
        }
        return () => timers.forEach(clearTimeout);
        // Scheduled once per table: `intro` flipping false is the only other change.
    }, [intro, dealAt, calm, playSfx]);
    const open = !settled && !intro && !dealing && now < (playClosesAt ?? 0);
    const seats = settled ? result.results ?? [] : table?.seats ?? [];
    const mine = user ? seats.find(s => s.userId === user.id) : null;
    const others = seats.filter(s => s !== mine);
    // The hit's response already knows the hand is over 21, but the card that put
    // it there is still flying in. Call the bust when it lands, not when it leaves.
    const cardsLanding = moving && !settled;
    const mineBust = !intro && !cardsLanding && Boolean(mine?.bust);
    // Heard on the change, not on the state: a page reloaded onto a hand that
    // busted a minute ago should not groan at the player on arrival.
    const bustHeard = useRef(null);
    useEffect(() => {
        const was = bustHeard.current;
        bustHeard.current = mineBust;
        if (was === false && mineBust) playSfx?.('hr_bust');
    }, [mineBust, playSfx]);
    /*
     * The reveal is over: the hole card has turned and the last card the house
     * drew has landed. Both halves are needed. `moving` alone is false for the
     * one render between the result arriving and the cards starting to move,
     * which would flash the outcome and fire its sound early; the clock alone
     * does not know about a tab the browser paused.
     */
    const revealAt = settled ? (result.settledAt ?? 0) + (calm ? 0 : revealDuration(result.dealer?.cards?.length)) : Infinity;
    const revealed = settled && !moving && now >= revealAt;
    const outcome = revealed ? mine?.outcome : null;
    /*
     * Jimbo is "presenting" while a card is moving, and after the result for as
     * long as the table has not shown it. It used to be `moving` alone, and the
     * one render between the result arriving and the hole card starting to turn
     * - the gap `revealed` above already guards - let him say the outcome first.
     *
     * A layout effect, so he is told before the frame paints: a passive one left
     * a gap in which he could already react to where a hit's card lands.
     */
    const presenting = moving || (settled && !revealed);
    useLayoutEffect(() => { onPresentation?.(presenting); }, [presenting, onPresentation]);
    const won = outcome === 'win' || outcome === 'blackjack';
    const cardSound = useCallback(name => playSfx?.(name), [playSfx]);
    const announced = useRef(false);
    useEffect(() => {
        if (!outcome || announced.current) return;
        announced.current = true;
        const sound = { blackjack: 'hr_blackjack', win: 'event_win', push: 'parlour_chip' }[outcome];
        if (sound) playSfx?.(sound);
    }, [outcome, playSfx]);
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
    const status = intro ? 'Shuffling up' : moving ? (settled ? 'The reveal' : 'Dealing your cards') : settled ? 'Round complete' : dealing ? 'Dealing' : !open ? 'Jimbo’s turn' : !mine ? 'Table open' : mine.bust ? 'Busted' : mine.natural ? 'Blackjack' : mine.done ? 'Standing' : 'Your turn';
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

    return <div className="hr-player-table" data-settled={settled} data-moving={moving} data-intro={intro || undefined}>
        <div className="hr-status"><span className="hr-eyebrow">{status}</span><span className="hr-clock" data-urgent={open && seconds <= 5} aria-live={open && seconds <= 5 ? 'polite' : 'off'}>{open ? <><b>{seconds}</b>s left</> : settled ? 'Until next time' : intro ? 'Cards coming' : dealing ? 'Take your seat' : 'All hands locked'}</span></div>
        <div className="hr-deck" aria-hidden="true"><div className="hr-deck-stack" ref={deck}><span className="hr-deck-leaves"/><span className="hr-card hr-card-back"><span>♠</span></span></div></div>
        <div className="hr-time-track" aria-hidden="true" data-urgent={open && seconds <= 5}><span style={{ transform: 'scaleX(' + (settled ? 0 : Number.isFinite(progress) ? progress : 0) + ')' }}/></div>
        <section className="hr-house-hand" aria-label="Jimbo’s hand">
            <div className="hr-hand-heading"><span>JIMBO</span><small>{intro ? 'Dealer' : dealer?.holeCard ? 'Dealer · one card hidden' : settled ? 'Dealer · revealed' : 'Dealer'}</small></div>
            {intro ? <div className="hr-hand"/> : <Hand cards={dealer?.cards} holeCard={dealer?.holeCard} deckRef={deck} onMotion={trackMotion} onSound={cardSound} house/>}
            {/* Keyed on the REVEAL, not on the result arriving: the result carries the
                house's final hand, and a BUST under the dots while the cards are
                still being dealt would call the hand before the table shows it. */}
            <div className="hr-score" data-bust={revealed && dealer?.bust}><strong>{intro ? '—' : dealer?.holeCard ? '?' : moving || (settled && !revealed) ? '…' : dealer?.total ?? '—'}</strong><small>{intro ? 'DEALER' : dealer?.holeCard ? 'HIDDEN' : settled && !revealed ? 'DRAWING' : dealer?.bust ? 'BUST' : dealer?.soft ? 'SOFT' : 'TOTAL'}</small></div>
        </section>
        {intro && <Shuffle dealAt={dealAt} deckRef={deck} onSound={cardSound}/>}
        <section className="hr-your-seat" aria-label="Your seat" aria-busy={busy}>
            {mine ? <>
                <div className="hr-player-hand" data-won={won || undefined}><div className="hr-hand-heading"><span>YOU</span><small>{intro || cardsLanding ? 'Your hand' : mineBust ? 'Over 21' : mine.natural ? 'Natural blackjack' : mine.done ? 'Hand locked' : mine.soft ? 'Ace counts as 11' : 'Your hand'}</small></div>{intro ? <div className="hr-hand"/> : <Hand cards={mine.cards} deckRef={deck} onMotion={trackMotion} onSound={cardSound}/>}
                    <div className="hr-score" data-bust={mineBust}><strong>{intro ? '—' : moving ? '…' : mine.total}</strong><small>{intro ? 'YOURS' : cardsLanding ? 'TOTAL' : mine.natural ? 'NATURAL' : mineBust ? 'BUST' : mine.soft ? 'SOFT' : 'TOTAL'}</small></div>
                </div>
                {settled ? <div className="hr-controls hr-outcome" role="status" data-outcome={outcome ?? undefined}><strong key={outcome ?? 'reveal'}>{outcome ? OUTCOMES[outcome] ?? outcome : 'Turning the cards…'}</strong><span>{!outcome ? 'The house reveals' : awarded > 0 ? '+' + awarded + ' lucky spins' : 'No lucky spins this hand'}</span></div>
                    : <div className="hr-controls"><div className="hr-actions">
                        <button type="button" className="hr-action hr-hit" disabled={!canAct} aria-keyshortcuts="H" onClick={() => post('action', { action: 'hit' })} {...hover('hit')}>Hit<kbd aria-hidden="true">H</kbd></button>
                        <button type="button" className="hr-action hr-stand" disabled={!canAct} aria-keyshortcuts="S" onClick={() => post('action', { action: 'stand' })} {...hover('stand')}>Stand<kbd aria-hidden="true">S</kbd></button>
                    </div><p className="hr-seat-note" role="status">{intro ? 'Jimbo is shuffling. Cards in a moment.' : moving ? 'Cards on the felt. One moment…' : busy ? 'Jimbo is on it…' : mine.bust ? 'Busted. Stay for the reveal.' : mine.done ? 'Your hand is locked. Waiting for Jimbo.' : dealing ? 'Cards first. Decisions in a moment.' : open && seconds <= 5 ? 'When the clock runs out, you stand on ' + mine.total + '.' : open ? 'Get closer to 21 than Jimbo. Don’t go over.' : 'No more cards. Jimbo is revealing his hand.'}</p></div>}
            </> : <div className="hr-empty-seat"><span className="hr-empty-suit" aria-hidden="true">♠</span><div><strong>A seat with your name on it.</strong><p>{!user ? 'Sign in to join Jimbo’s table.' : canSit ? 'Play a hand. Win lucky spins.' : 'Watch Jimbo reveal the table.'}</p></div>
                {canSit && <button type="button" className="hr-action hr-hit hr-sit" disabled={busy} onClick={() => post('sit')}>{busy ? 'Taking your seat…' : 'Deal me in'}</button>}</div>}
            {error && <p className="hr-error" role="alert">{error}</p>}
        </section>
        {!intro && <OtherSeats seats={others} settled={settled} revealed={revealed} dealAt={dealAt} dealing={dealing}/>}
        {/* The table's total takes the pay table's place once the hand is paid,
            rather than arriving under it: an extra line at the very end of the
            round was what made a table that fitted its band start to scroll. */}
        {payouts && !(revealed && typeof result.totalPaid === 'number') && <div className="hr-paytable" aria-label="Lucky spin rewards"><span>LUCKY SPINS</span>{['blackjack', 'win', 'push'].map(key => <span key={key}>{key === 'blackjack' ? 'Blackjack' : key[0].toUpperCase() + key.slice(1)} <b>+{payouts[key] ?? 0}</b></span>)}</div>}
        {revealed && typeof result.totalPaid === 'number' && <p className="hr-table-total">{result.totalPaid} lucky spins paid across {seats.length} seat{seats.length === 1 ? '' : 's'}.</p>}
    </div>;
}
export default HighRollerTable;
