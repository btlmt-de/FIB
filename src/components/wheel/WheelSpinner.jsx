/* THE NOCTURNE — direction contract (impeccable seed 34ecef14,
   challenger light-shadow-caustics-rain-night-cityscape; chosen by
   owner 2026-08-18).

   THESIS: the spin surface is one blue-hour city; the reel is the
   main transit line arriving at its stop. It refuses the panel —
   the whole page is a single nocturne mass, no boxes, no frames.

   OWN-WORLD: cobalt blue-hour sky over black tower silhouette; the
   only lit things are the transit vein (the reel), amber station
   light (the gold accent), and event signal states. Tier colours
   are the train's own light; rarity hues never change.

   STORY: a player on a second screen watches the city at night;
   items move past like lit cars; a landing is a train arriving —
   the result is the arrival at the platform.

   FIRST VIEWPORT: the viaduct band carries the moving strip between
   rail and street glow, the stage is the platform with the result as
   the arrival. The topbar keeps its soft rule: the skyline crown was
   tried as the new topbar end and the owner's review reverted it
   (2026-08-18) — the Nocturne's borderless world starts below the
   topbar.

   FORM: rain-night cityscape challenger, seed key 34ecef14.

   FINISH: unreviewed and undocumented is unfinished; this build
   ends with the finish review, the verdict, and DESIGN.md.

   TAKEOVERS (2026-08-19, owner-chosen): the bonus selection, the lucky
   spin and the 3x/5x grids are no longer cards. Every mode is a theme
   of the same three rows the normal spin uses — the band wears the
   mode's accent and swaps its content, the stage answers in the same
   register. The bonus announcement is a console flash over the landed
   reel; the bonus board replaces the reel in the band; the lucky spin
   is the band under the green lamp; the 3x/5x spins cut the band into
   parallel tracks, each a horizontal line on desktop and a vertical
   lane on mobile, landing at its own centre line. The tracks divide the
   band's full width between them and run the reel's own pitch — they
   are the band cut up, not several small bands parked in the middle of
   it, which is what the first version built. The stage answers on the
   same grid, one column under each track. One identity per
   mode: bonus orange, lucky green, 5x gold, triple-lucky gold-on-green.
   Recursion took its own pass on 2026-08-20 and joined them, so there
   are no cards on this surface at all now: the band wears recursion's
   ground and green lamp, the console flashes RECURSION!, the reel keeps
   the pull that triggered it, and BonusEventPlaque answers on the stage.
   Its card had been rendering *instead of* the band and the status row,
   which hid the winning pull, collapsed a row the No-Collapse Rule says
   must hold, and — because the Try Again button lives in that row and
   was itself gated on `state === 'recursion'` — left the player with no
   way out but the spacebar. */
import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { OddsInfoModal } from './modals/OddsInfoModal.jsx';
import { SpinResult } from './spin/SpinResult.jsx';
import { ShaftResult } from './spin/ShaftResult.jsx';
import { StageFlanks } from './spin/StageFlanks.jsx';
import { KotwReelBoard } from './spin/KotwReelBoard.jsx';
import { EventPayout } from './spin/EventPayout.jsx';
import { EnhancedWheelIdleState } from './canvas/EnhancedWheelIdleState.jsx';
import { CanvasSpinningStrip, preloadItemImages, warmImageCache, MOBILE_ROW_PITCH } from './canvas/CanvasSpinningStrip.jsx';
import { loadAtlas } from './canvas/atlas.js';
import { CanvasResultItem } from './canvas/CanvasResultItem.jsx';
import { CanvasBonusStrip, BONUS_PITCH, BONUS_PITCH_MOBILE, BONUS_STRIP_LENGTH, BONUS_FINAL_INDEX } from './canvas/CanvasBonusStrip.jsx';
import { SpinLanes, LANE_PITCH } from './spin/SpinLanes.jsx';
import { BonusEventPlaque } from './spin/BonusEventPlaque.jsx';
import { LuckyResultPanel } from './spin/LuckyResultPanel.jsx';
import { LaneResultsRow } from './spin/LaneResultsRow.jsx';

import {
    API_BASE_URL, IMAGE_BASE_URL,
    ITEM_WIDTH, STRIP_HEIGHT, STRIP_LENGTH, FINAL_INDEX,
    TEAM_MEMBERS, EXOTIC_ITEMS, RARE_MEMBERS, MYTHIC_ITEMS, MYTHIC_ITEM, EVENT_ITEM, BONUS_EVENTS, INSANE_ITEMS, RECURSION_ITEM
} from '../../config/constants.js';
import { COLORS, SPACE, Z, SURFACE_NOISE } from './config/constants';
// getMinecraftHeadUrl, isEventItem and isRecursionItem left with the local
// getItemImageUrl copy above — they were its inputs and nothing else here read
// them.
import {
    getItemRarity
} from '../../utils/helpers.js';
import { RARITY, getRarityInk } from '../../utils/rarityHelpers.jsx';
import { useWheelConfig } from '../../hooks/useWheelConfig';
import { useActivity } from '../../context/ActivityContext.jsx';
import { useSound } from '../../context/SoundContext.jsx';


/**
 * What the stage says when a pull triggers recursion.
 *
 * Shaped like a bonus event because it is answered by the same signboard, and
 * its colours come from `BONUS_IDENTITY.recursion` for the reason that table
 * exists at all: the board, the plaque and the lamp a mode runs under are three
 * views of one identity, and they had three private colour tables between them
 * once already.
 *
 * The copy is the old card's, tightened. "You hit the wheel in the wheel!" and
 * "Global lucky spin event triggered for ALL users!" were two exclamations
 * saying one thing in a register nothing else on this surface uses.
 */
const RECURSION_ANNOUNCEMENT = {
    id: 'recursion',
    name: 'Recursion',
    description: 'You hit the wheel inside the wheel. A lucky spin is now running server-wide, for everyone.',
};

/**
 * How far off the slot's centre a spin comes to rest, in pixels.
 *
 * The reel lands on the winning slot, never between two — the server decided the
 * result and the strip is built around it — but *where inside that slot* is the
 * only randomness the player can actually see, and it is what makes one spin feel
 * different from the last. Landing dead centre every time reads as a slideshow
 * advancing rather than a wheel coming to rest.
 *
 * This used to be a fixed pixel spread: ±25–37px. Two problems with that. It was
 * written against the 120px desktop pitch and applied unchanged to the 70px
 * mobile and 90px triple reels, where the same numbers mean something completely
 * different. And even at its widest it left ~23px of slot beyond the indicator,
 * so the winner never came near its own edge and every landing looked centred.
 * It is a fraction of the pitch now, and it goes much closer to the edge.
 *
 * **The distribution is flat across the whole range.** It began as two hardcoded
 * branches — a third of spins in a 0.30–0.41 "near miss" band and the rest inside
 * 0.22 — which had two problems. Offsets between 0.22 and 0.30 of a pitch could
 * never occur at all, a dead band nobody would consciously spot but which is an
 * artifact of the branches rather than a decision. And a spin drawn from one of
 * two clusters is only ever one of two kinds of spin. Uniform, every landing is
 * its own, and near misses arrive because the reel genuinely stopped there rather
 * than because a coin came up saying to stage one.
 *
 * **The ceiling is a clearance in pixels, not a fraction of the pitch**, because
 * what limits it is the width of the line the slot is coming to rest against and
 * not the size of the slot. The line is 1px with a ~4px bleed either side, so
 * `LINE_CLEARANCE` is what keeps the seam a distinct thing from the indicator
 * rather than something the indicator is sitting on. A fraction alone was wrong
 * here: 0.41 left 12px on the 120px desktop pitch but only 6px on the 58px 5x
 * mobile reel, so the same number meant "close" on one reel and "touching" on
 * another. The fraction survives only as a backstop for a pitch large enough that
 * a fixed clearance would stop being the binding limit.
 *
 * **4px is the floor, established by looking rather than by arithmetic.** Forcing
 * every spin to the extreme and screenshotting it: at 3px the line, the winning
 * column's rim and the seam merge into a single band and the reel stops looking
 * like it is pointing at anything. 4px holds — but only because the winning slot
 * now keeps a base bar with defined ends whatever its tier (see `drawItem`). The
 * hard case is a *common* winner, which is ~90% of results: two dim grey columns
 * either side of a line sitting on their shared seam, with no tier colour to say
 * which one won. The bar's end against the line is what answers that, and without
 * it the honest floor was 7px.
 *
 * The limit being backed away from is half a pitch. There the line sits exactly
 * on the seam and the item under it is genuinely ambiguous — not a near miss, a
 * bug that looks like one. It matters more here than on a slot machine because
 * the result panel underneath *names* the winner, so an ambiguous reel reads as
 * the reel contradicting the result.
 */
const LINE_CLEARANCE = 4;

function landingVariance(itemWidth) {
    const max = Math.min(itemWidth * 0.46, itemWidth / 2 - LINE_CLEARANCE);
    return (Math.random() * 2 - 1) * max;
}

function WheelSpinnerComponent({ allItems, collection, onSpinComplete, user, dynamicItems, kotwLuckySpins = 0, kotwLuckySpinsRef, onKotwLuckySpinsUpdate, stageColumn = 2, onOpenCollection, onOpenLeaderboard, isMobile = false, hasFlanks = true }) {
    // Get spin duration from server config
    const { spinDuration } = useWheelConfig();

    // Get recursion status from ActivityContext - no separate polling!
    const { recursionStatus, updateRecursionStatus, globalEventStatus, kotwUserStats, updateKotwUserStats, markKotwSpinStart, markSpinInFlight, markSpinLanded,
        firstBloodWinner, firstBloodResultPending, communityGoalResult,
        communityGoalResultPending, kotwWinner, kotwWinnerPending } = useActivity();

    // Get Gold Rush boosted rarity if event is active
    const goldRushBoostedRarity = globalEventStatus?.active && globalEventStatus?.type === 'gold_rush'
        ? globalEventStatus.data?.boostedRarity
        : null;


    // Get sound functions
    // `stopSoundtrack` is deliberately not pulled out of here: the soundtrack is
    // stopped by the settings modal and by SoundContext's own teardown, never by
    // the spinner, and destructuring it left an unused handle that read as though
    // this component owned the stopping too.
    const { startSoundtrack, playRaritySound, playRecursionSound, isPlaying: isMusicPlaying } = useSound();

    const [state, setState] = useState('idle');
    const [strip, setStrip] = useState([]);
    const [result, setResult] = useState(null);
    const [isNewItem, setIsNewItem] = useState(false);
    /*
     * The prestige side of the same question.
     *
     * `{ level, levelKey, isNew, count }` on a spin taken during a run, and null
     * for everyone else. It travels beside `isNewItem` rather than inside it
     * because they are genuinely two different facts: an item can be a duplicate
     * of a collection you finished months ago and the first of its kind in the
     * run you started yesterday, and that is the common case once prestige is
     * running — every pull is a main-collection duplicate by definition.
     */
    const [prestigePull, setPrestigePull] = useState(null);
    const [showOddsInfo, setShowOddsInfo] = useState(false);
    const [spinProgress, setSpinProgress] = useState(0); // 0-1 for Phase 2 effects
    // One flag instead of the old imagesPreloaded/preloadProgress pair: the wheel
    // waits on a single atlas request now, so there is no meaningful percentage to
    // report — it is one file, and it is either here or it is not.
    const [atlasReady, setAtlasReady] = useState(false);
    // Use ref for canvas offset to avoid re-renders during animation
    const canvasOffsetRef = useRef(0);
    const animationRef = useRef(null);
    // Track last spin progress to avoid redundant setState calls
    const lastSpinProgressRef = useRef(-1);

    // ── The shaft's dimensions (phone) ───────────────────────────────────────
    //
    // The reel used to be a 140×260 box with a 70px pitch parked in the middle of
    // the screen: a column of square tiles floating in black, a 49px sprite on the
    // one screen where recognition is hardest, and a hundred-odd pixels of dead
    // page either side of it.
    //
    // It is a shaft now — the full width of the viewport, running the height the
    // stage can spare — so a row IS the screen and the sprite is sized off the
    // *pitch* rather than the width. `MOBILE_ROW_PITCH` is therefore a height, and
    // it is the only number deciding how big an item looks on a phone.
    //
    // 128 rather than 70: it puts the sprite at ~90px, close to the desktop reel's
    // 84, and still shows five rows in a 620px shaft — enough runway either side of
    // the detent for a near miss to read. Fixed rather than derived from the
    // viewport, because the *item* should not change size between a 360px phone and
    // a 430px one; what changes is how much shaft there is around it.
    //
    // Imported, not restated. This is the pitch the canvas draws at, and the two
    // had already drifted apart once inside this pass — the animation landing on
    // 128 while the shaft still drew at 70. Same class of bug as the bonus board's
    // shadowed `ITEM_WIDTH`, caught the same way: the winner stopped somewhere
    // other than the line.

    // Use refs for animation offsets to avoid re-renders during animation.
    // `stripRef` and `tripleStripRefs` used to sit alongside these: DOM handles
    // from the pre-canvas strip, which was a row of absolutely-positioned divs
    // this component translated by hand. The canvas renderer owns its own element
    // and takes its offset through `canvasOffsetRef`, so both have been holding
    // null since that swap.
    const offsetRef = useRef(0);

    // Triple spin state
    const [tripleStrips, setTripleStrips] = useState([[], [], [], [], []]);
    const [tripleResults, setTripleResults] = useState([null, null, null, null, null]);
    const [tripleNewItems, setTripleNewItems] = useState([false, false, false, false, false]);
    // Use refs for triple offsets to avoid re-renders during animation
    const tripleAnimationRefs = useRef([null, null, null, null, null]);
    const tripleOffsetRefs = useRef([0, 0, 0, 0, 0]);

    // Bonus wheel state - using horizontal strip like main wheel
    const [bonusStrip, setBonusStrip] = useState([]);
    const bonusOffsetRef = useRef(0); // Use ref instead of state
    const [selectedEvent, setSelectedEvent] = useState(null);
    const bonusWheelRef = useRef(null);

    // Lucky spin state
    const [luckyResult, setLuckyResult] = useState(null);
    const [isLuckyNew, setIsLuckyNew] = useState(false);

    // Recursion active state - derived from ActivityContext
    const recursionActive = recursionStatus?.active || false;
    const recursionSpinsRemaining = recursionStatus?.userSpinsRemaining ?? 0;

    // Track if the CURRENT RESULT was from a recursion lucky spin
    // This persists during result display even after user runs out of spins
    const [resultWasRecursionSpin, setResultWasRecursionSpin] = useState(false);

    // Track if the CURRENT RESULT was from a KOTW lucky spin
    const [resultWasKotwLuckySpin, setResultWasKotwLuckySpin] = useState(false);

    // Track if current spin is using KOTW lucky (set at spin start, cleared at idle)
    const [currentSpinIsKotwLucky, setCurrentSpinIsKotwLucky] = useState(false);

    // `resultInk` used to be derived here: the winning item's tier colour as
    // text, replacing an eight-times-repeated inline ternary chain
    // (`isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? ...`), one
    // per style property on the result screen. Every copy had to be edited in
    // lockstep, and when the ladder was rebuilt they were missed, leaving
    // legendary rendering in purple — exotic's colour — on the one screen a
    // player actually reads after a spin.
    //
    // It is gone from here because the screen it fed is gone from here: the
    // result panel is SpinResult.jsx now, and it derives the tier from the shared
    // ladder itself. The fix outlived the code it fixed, which is the usual way a
    // deduplicated value turns back into dead weight — recorded rather than
    // silently deleted, because the eight-copy version is what someone would
    // rebuild without this note.

    // Track if the CURRENT spin animation is a recursion lucky spin
    // This prevents visual effects from changing mid-animation when spinsRemaining updates
    const currentSpinIsRecursionRef = useRef(false);

    // Track if the CURRENT spin animation is a KOTW lucky spin
    const currentSpinIsKotwLuckyRef = useRef(false);

    // Pending spin flag for instant respin
    const pendingSpinRef = useRef(false);

    // Ref to hold current spin function for keyboard events
    const spinRef = useRef(null);

    // Ref to hold current respin function for keyboard events
    const respinRef = useRef(null);

    // Animation cancellation flag to prevent stale updates
    const animationCancelledRef = useRef(false);

    // AbortController for cancelling in-flight API requests
    const abortControllerRef = useRef(null);

    // Pending KOTW result to apply after animation completes
    const pendingKotwResultRef = useRef(null);
    // Pending lucky spin balance, held for the same reason - see settleKotwSpin()
    const pendingKotwLuckySpinsRef = useRef(null);

    // Error state for server unavailability
    const [error, setError] = useState(null);

    // Client-side cooldown tracking (mirrors server's 3s cooldown)
    const lastSpinTimeRef = useRef(0);
    const SPIN_COOLDOWN = 3000; // 3 seconds - must match server

    function canSpin() {
        const now = Date.now();
        if (now - lastSpinTimeRef.current < SPIN_COOLDOWN) {
            setError("Don't spin too fast!");
            return false;
        }
        return true;
    }

    function markSpinTime() {
        lastSpinTimeRef.current = Date.now();
    }

    // ── The shaft's own height, for the in-place result ──────────────────────
    //
    // The phone's payoff is drawn over the row the spin landed on (ShaftResult),
    // and to pin it there we need the two numbers the canvas drew with: the
    // mount's height and the final offset. The offset is already a ref; this
    // measures the height.
    //
    // A ResizeObserver rather than a read during render, because the mount is
    // `flex: 1` inside a column whose siblings settle after first paint — reading
    // it in the same tick would pin the overlay against a stale height.
    const reelMountRef = useRef(null);
    const [shaftHeight, setShaftHeight] = useState(0);
    useEffect(() => {
        const el = reelMountRef.current;
        if (!el || !isMobile || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(() => {
            const h = el.getBoundingClientRect().height;
            if (h > 0) setShaftHeight(h);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [isMobile, state]);

    // The resize listener that used to live here is gone with the state it fed.
    // It watched `innerWidth < 600` while WheelPage watched 1400 and passed its
    // answer down as a prop this component never destructured — so the page and
    // the reel inside it disagreed about the breakpoint by 800px, and everything
    // from 600 to 1399 got desktop geometry in a shell with no room for it. The
    // viewport is one question with one answer now; see config/breakpoints.js.

    /**
     * Gate the spin button on the sprite atlas — one request for the whole pool.
     *
     * The history here is worth keeping, because the obvious version of this is
     * the one we started with and it was the slowest thing about the page. It
     * used to await every sprite in the pool individually, ~1,500 files, so that
     * a strip could never draw a missing texture. That cost 9.4s cold from our
     * own origin and 2.2s from GitHub, and moving the files between hosts only
     * changed who absorbed it.
     *
     * Removing the gate outright fixed the wait and reintroduced the flashes it
     * had been paying for. The atlas is what makes both work at once: one image
     * means every pool sprite becomes available at the same instant, so there is
     * no half-loaded state to render and no per-item race to lose. Gating on a
     * single request is cheap enough to be honest about.
     *
     * The heads and custom art the atlas does not pack are warmed alongside it
     * but not waited for — there are a few dozen, they are third-party, and the
     * strip already tolerates them arriving late.
     */
    useEffect(() => {
        if (allItems.length === 0) return;

        let isMounted = true;
        setAtlasReady(false);

        loadAtlas().then((ok) => {
            if (!isMounted) return;
            // Opens the gate either way. A failed atlas is a slower wheel, not a
            // broken one: every renderer falls back to per-item images, which is
            // exactly the path the non-pool sprites already take.
            setAtlasReady(true);
            if (!ok) warmImageCache(allItems);
        });

        // Not awaited, and deliberately not cancelled on unmount — an in-flight
        // sweep that outlives the component is just cache the next mount inherits.
        warmImageCache([...INSANE_ITEMS, ...MYTHIC_ITEMS, ...RARE_MEMBERS, ...EXOTIC_ITEMS, ...TEAM_MEMBERS]);

        return () => {
            isMounted = false;
        };
    }, [allItems]);

    /**
     * Load the strip the moment one exists — the exact 80 items about to be
     * drawn, winner first.
     *
     * This is where the startup cost went. Instead of paying for ~1,500 sprites
     * up front to show 80, we pay for the 80 as they become known, under the
     * cover of the spin animation. The winner is ordered first because it is the
     * one image that cannot be late: it sits centred and static under a rarity
     * glow for as long as the result is on screen, where a barrier reads as a
     * bug rather than as loading. The other 79 fly past at speed, and by the
     * time the strip decelerates the background sweep has usually got them
     * anyway.
     *
     * Keyed on the strip rather than wired into each of the four call sites that
     * build one (normal, lucky, multi-spin, placeholder), so no future path can
     * forget it.
     */
    useEffect(() => {
        if (strip.length === 0) return;
        const winner = strip[FINAL_INDEX];
        preloadItemImages(winner ? [winner, ...strip] : strip);
    }, [strip]);

    // Spacebar to spin/respin
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Only trigger on spacebar, and not when typing in an input
            if (e.code === 'Space' &&
                !e.target.closest('input, textarea, [contenteditable]')) {

                // Check if we can spin
                if (!user || allItems.length === 0) return;

                e.preventDefault();

                // If in result state, use respin for instant re-spin
                if (state === 'result' || state === 'tripleResult' || state === 'luckyResult' || state === 'tripleLuckyResult' || state === 'recursion') {
                    respinRef.current?.();
                } else if (state === 'idle') {
                    spinRef.current?.();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state, user, allItems.length]);

    useEffect(() => {
        return () => {
            animationCancelledRef.current = true;
            if (abortControllerRef.current) abortControllerRef.current.abort();
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (bonusWheelRef.current) cancelAnimationFrame(bonusWheelRef.current);
            tripleAnimationRefs.current.forEach(ref => { if (ref) cancelAnimationFrame(ref); });
        };
    }, []);

    // Handle pending spin after state becomes idle
    // Note: spin is intentionally omitted from deps as it's not memoized
    // and the ref-based pendingSpinRef pattern handles stale closure issues
    useEffect(() => {
        if (state === 'idle' && pendingSpinRef.current) {
            pendingSpinRef.current = false;
            spin();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state]);

    // A local `getItemImageUrl` used to sit here, a full second copy of the
    // resolver in utils/helpers.js — same fallback order, same special cases,
    // maintained separately, and called from nowhere. It was the more dangerous
    // kind of dead code than an unused constant: a function declaration inside
    // the component shadows the module import for the whole component body, so
    // the day anyone added a call in here it would silently have picked up this
    // copy instead of the shared one. Deleted rather than wired up — the item
    // pool, the canvas renderers and this component all have to agree on where a
    // sprite lives, and one resolver is how that stays true.

    // Fisher-Yates shuffle helper
    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // ── Dormant reel ─────────────────────────────────────────────────────────
    //
    // While idle the reel still has to show something, or the band is an empty
    // 170px stripe across the page that reads as a loading state. It shows a
    // sample of the real pool, drifting slowly, so the surface looks alive and
    // advertises what is in it.
    //
    // Built once per pool rather than per render: `buildStrip` shuffles, so
    // rebuilding it on every render would make the dormant reel flicker between
    // different items every frame.
    const dormantStrip = useMemo(
        () => (allItems.length ? buildStrip(allItems[0]) : []),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [allItems.length],
    );

    // The drift itself. Writes the same ref the spin animation writes, so the two
    // never fight: starting a spin cancels this loop and takes the offset over
    // from wherever the drift left it, which is why the reel appears to accelerate
    // out of its idle state rather than snapping back to zero first.
    //
    // `prefers-reduced-motion` stops the drift entirely. A still reel is fine — it
    // keeps its identity, it is just parked. Permanent unrequested motion on an
    // otherwise static page is not.
    useEffect(() => {
        if (state !== 'idle' || dormantStrip.length === 0) return;
        if (typeof window === 'undefined') return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

        // Starting mid-strip used to be necessary and is not any more. The canvas
        // drew tile `idx` at `centre + idx * ITEM_WIDTH - offset` against the array's
        // literal indices, so at offset 0 the left half of the band had no tiles to
        // draw; half a strip in, both edges were covered. That was a workaround for
        // a finite strip, and it only ever bought about four minutes — past roughly
        // 8,340px the *right* edge ran out instead, and at one full strip the offset
        // wrapped back to an empty left edge. That is the reset you can see if you
        // leave the page open.
        //
        // The canvas draws the dormant strip as a cylinder now (`loop`), so every
        // slot always has an index and any offset is as good as any other. The wrap
        // below is what makes it endless rather than what breaks it: one whole strip
        // maps each slot onto an identical index, so the modulo is invisible and the
        // offset can never grow without bound.
        let raf = null;
        let last = null;
        const PX_PER_SECOND = 14;   // slow enough to read, fast enough to notice
        const wrap = dormantStrip.length * ITEM_WIDTH;

        const tick = (now) => {
            if (last === null) last = now;
            const dt = (now - last) / 1000;
            last = now;
            canvasOffsetRef.current = (canvasOffsetRef.current + PX_PER_SECOND * dt) % wrap;
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => { if (raf) cancelAnimationFrame(raf); };
    }, [state, dormantStrip.length]);

    function buildStrip(finalItem, length = STRIP_LENGTH) {
        const newStrip = [];
        const finalIndex = length - 8; // Position 72 for length 80

        // Shuffle all item pools for better visual randomness
        const shuffledItems = shuffleArray([...allItems]);
        const shuffledInsane = shuffleArray([...INSANE_ITEMS]);
        const shuffledMythic = shuffleArray([...MYTHIC_ITEMS]);
        const shuffledRare = shuffleArray([...RARE_MEMBERS]);
        const shuffledExotic = shuffleArray([...EXOTIC_ITEMS]);
        const shuffledLegendary = shuffleArray([...TEAM_MEMBERS]);

        // Use indices to iterate through shuffled arrays (guarantees distribution)
        let itemIndex = 0;
        let insaneIndex = 0;
        let mythicIndex = 0;
        let rareIndex = 0;
        let exoticIndex = 0;
        let legendaryIndex = 0;

        for (let i = 0; i < length; i++) {
            if (i === finalIndex) {
                newStrip.push(finalItem);
            } else {
                const roll = Math.random();
                let newItem = null;

                // Visual flair - show special items in the strip animation
                if (roll < 0.001 && shuffledInsane.length > 0) {
                    // 0.1% chance for insane
                    const insane = shuffledInsane[insaneIndex % shuffledInsane.length];
                    insaneIndex++;
                    newItem = { ...insane, isInsane: true };
                } else if (roll < 0.003 && shuffledMythic.length > 0) {
                    // 0.2% chance for mythic (0.1% to 0.3%)
                    const mythic = shuffledMythic[mythicIndex % shuffledMythic.length];
                    mythicIndex++;
                    newItem = { ...mythic, isMythic: true };
                } else if (roll < 0.033 && shuffledRare.length > 0) {
                    // 3% chance for rare
                    const rare = shuffledRare[rareIndex % shuffledRare.length];
                    rareIndex++;
                    newItem = { ...rare, isRare: true, texture: `rare_${rare.username}` };
                } else if (roll < 0.043 && shuffledExotic.length > 0) {
                    // 1% chance for exotic. These bands are decoration only — they
                    // decide what flashes past during the spin, not what is won,
                    // which the server already decided. Exotic takes its 1% out of
                    // the band that used to be legendary's rather than lengthening
                    // the run of specials, so the strip's overall density of
                    // non-common tiles is unchanged.
                    // Exotic items carry their own whole texture, unlike the member
                    // tiers whose texture is built from a username.
                    const exotic = shuffledExotic[exoticIndex % shuffledExotic.length];
                    exoticIndex++;
                    newItem = { ...exotic, isExotic: true };
                } else if (roll < 0.053 && shuffledLegendary.length > 0) {
                    // 1% chance for legendary
                    const member = shuffledLegendary[legendaryIndex % shuffledLegendary.length];
                    legendaryIndex++;
                    newItem = {
                        ...member,
                        isSpecial: true,
                        texture: member.username ? `special_${member.username}` : member.name.toLowerCase().replace(/\s+/g, '_')
                    };
                } else if (shuffledItems.length > 0) {
                    // Regular items - iterate through shuffled pool for maximum variety
                    newItem = shuffledItems[itemIndex % shuffledItems.length];
                    itemIndex++;
                }

                // ALWAYS push an item - fallback to first available item if needed
                if (newItem) {
                    newStrip.push(newItem);
                } else if (shuffledItems.length > 0) {
                    // Fallback: use a regular item
                    newStrip.push(shuffledItems[itemIndex % shuffledItems.length]);
                    itemIndex++;
                } else {
                    // Ultimate fallback: use the finalItem (shouldn't happen in practice)
                    newStrip.push(finalItem);
                }
            }
        }
        return newStrip;
    }

    // Instant respin - no delays
    function respin() {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        tripleAnimationRefs.current.forEach(ref => { if (ref) cancelAnimationFrame(ref); });

        // Reset states
        setResult(null);
        setIsNewItem(false);
        setPrestigePull(null);
        setTripleResults([null, null, null, null, null]);
        setTripleNewItems([false, false, false, false, false]);
        // Note: don't reset currentSpinIsKotwLucky here - performSpin will set it correctly

        // Directly perform spin (bypass idle check)
        performSpin();
    }

    // Keep refs updated for keyboard handler
    respinRef.current = respin;

    // Helper to update spin progress only when value changes
    const updateSpinProgress = (value) => {
        if (lastSpinProgressRef.current !== value) {
            lastSpinProgressRef.current = value;
            setSpinProgress(value);
        }
    };

    // Core spin logic - extracted so respin can call it directly
    async function performSpin() {
        if (!user || allItems.length === 0) return;

        // Client-side cooldown check (prevents animation flash)
        if (!canSpin()) return;

        // Reset cancellation flag for new spin
        animationCancelledRef.current = false;

        // Track if this spin will use a recursion lucky spin (before API call)
        // This ensures visual effects stay consistent during the animation
        currentSpinIsRecursionRef.current = recursionActive && recursionSpinsRemaining > 0;

        // Track if this spin will use a KOTW lucky spin (if not already using recursion)
        // Use ref to get latest value (props can be stale due to React batching)
        // The condition mirrors the server's exactly: holding a balance is enough, the
        // event does NOT have to be running. It can't be - the reward is only handed out
        // when the event ends, so every lucky spin is spent afterwards. This used to also
        // require an active event and only looked right because the client never learned
        // that events had ended, leaving `active` stuck at true.
        const currentKotwSpins = kotwLuckySpinsRef?.current ?? kotwLuckySpins;
        const isKotwEventActive = globalEventStatus?.type === 'king_of_wheel' && globalEventStatus?.active;
        const willUseKotwLucky = !currentSpinIsRecursionRef.current && currentKotwSpins > 0;
        currentSpinIsKotwLuckyRef.current = willUseKotwLucky;

        // Set state for KOTW spin - this triggers re-render with correct styling
        setCurrentSpinIsKotwLucky(willUseKotwLucky);

        // Apply the lucky spin balance the server reported for this spin.
        // Held back until the wheel lands because the reward can be granted by the very
        // request that is driving this animation: First Blood is claimed inside the
        // winning spin, so the response already carries the post-award balance, and
        // KOTW does the same whenever its end timer fires while a spin is in flight.
        // Applying it on response popped the badge up - "13 Lucky Spins" - over a strip
        // that was still spinning, telling the player they had won before the wheel
        // could say so.
        const applyPendingKotwLuckySpins = () => {
            if (pendingKotwLuckySpinsRef.current !== null && onKotwLuckySpinsUpdate) {
                onKotwLuckySpinsUpdate(pendingKotwLuckySpinsRef.current);
            }
            pendingKotwLuckySpinsRef.current = null;
        };

        // Helper to flush KOTW pending state on any exit path
        const flushKotwPending = () => {
            if (isKotwEventActive && kotwUserStats) {
                // Clear any stale pending result to prevent future spins from crashing
                updateKotwUserStats?.({ ...kotwUserStats, pending: null });
            }
            // The spin may still have been processed server-side before we gave up on
            // it, so don't strand a balance we were already told about.
            applyPendingKotwLuckySpins();
            // Whatever happened, this wheel is no longer turning. Release any
            // deferred event results waiting for the landing.
            markSpinLanded();
        };

        // Settle the KOTW spin once the animation is done. Applying the pending result
        // is only half of it: the server omits kotwResult when the event expired while
        // the request was in flight, and markKotwSpinStart() has already flagged this
        // spin as pending. Without the else branch that flag never clears, and the
        // leaderboard sidebar keeps rendering the user's own row from the frozen
        // kotwUserStats for the rest of the session.
        const settleKotwSpin = () => {
            if (pendingKotwResultRef.current) {
                updateKotwUserStats(pendingKotwResultRef.current);
                pendingKotwResultRef.current = null;
            } else if (isKotwEventActive) {
                updateKotwUserStats(kotwUserStats);
            }
            applyPendingKotwLuckySpins();
            // The wheel has landed - release any deferred event results that were
            // waiting on it (Community Goal summary, First Blood winner).
            markSpinLanded();
        };

        try {
            setState('spinning');
            updateSpinProgress(0); // Reset progress for Phase 2 effects

            // Mark KOTW spin as pending to prevent premature point display
            if (globalEventStatus?.type === 'king_of_wheel' && globalEventStatus?.active) {
                markKotwSpinStart();
            }

            // Flag this client's wheel as in flight: event results that arrive
            // mid-spin (Community Goal ending, First Blood winner) are held back
            // and drained when the wheel lands via markSpinLanded().
            markSpinInFlight();

            // Start soundtrack when spinning begins
            if (!isMusicPlaying) {
                startSoundtrack();
            }

            // IMMEDIATELY build a placeholder strip and start animation
            // This makes the wheel feel instant - no waiting for API
            const placeholderItem = allItems[Math.floor(Math.random() * allItems.length)];
            const placeholderStrip = buildStrip(placeholderItem);
            setStrip(placeholderStrip);
            offsetRef.current = 0;
            canvasOffsetRef.current = 0;

            // Pre-calculate animation parameters (use larger items on mobile)
            const itemWidth = isMobile ? MOBILE_ROW_PITCH : ITEM_WIDTH;
            const targetOffset = FINAL_INDEX * itemWidth;
            const finalOffset = targetOffset + landingVariance(itemWidth);

            // Start animation IMMEDIATELY (before API returns)
            let startTime = null;
            let spinResult = null;
            let finalItem = placeholderItem;

            // Create abort controller for this request with timeout
            const controller = new AbortController();
            abortControllerRef.current = controller;
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

            // Make API call in parallel with animation
            const apiCall = (async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/spin`, {
                        method: 'POST',
                        credentials: 'include',
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    // Check if cancelled during fetch
                    if (animationCancelledRef.current) return null;

                    spinResult = await res.json();

                    // Handle rate limit / cooldown
                    if (res.status === 429 || spinResult.cooldown) {
                        setError("Don't spin too fast!");
                        animationCancelledRef.current = true;
                        if (animationRef.current) cancelAnimationFrame(animationRef.current);
                        setStrip([]);
                        setResult(null);
                        setIsNewItem(false);
            setPrestigePull(null);
                        setPrestigePull(null);
        setPrestigePull(null);
                        setState('idle');
                        flushKotwPending();
                        return null;
                    }

                    if (!res.ok || !spinResult.result) {
                        throw new Error(spinResult.error || 'Spin failed');
                    }

                    // Track if this specific spin was a recursion lucky spin
                    // This persists in the result view even after user runs out of spins
                    setResultWasRecursionSpin(spinResult.isRecursionSpin || false);

                    // Track if this specific spin was a KOTW lucky spin
                    setResultWasKotwLuckySpin(spinResult.isKotwLuckySpin || false);

                    // Update recursion state in ActivityContext from spin result
                    if (spinResult.recursionStatus) {
                        updateRecursionStatus(spinResult.recursionStatus);
                    }

                    // Hold the new lucky spin balance until the wheel lands - applying it
                    // here would reveal the reward mid-animation. See settleKotwSpin().
                    if (spinResult.kotwLuckySpinsRemaining !== undefined) {
                        pendingKotwLuckySpinsRef.current = spinResult.kotwLuckySpinsRemaining;
                    }

                    // Store KOTW result to apply after animation completes
                    if (spinResult.kotwResult) {
                        pendingKotwResultRef.current = {
                            points: spinResult.kotwResult.totalPoints,
                            rank: spinResult.kotwResult.rank,
                            pointsEarned: spinResult.kotwResult.pointsEarned,
                        };
                    }

                    // Mark spin time only after successful response
                    markSpinTime();

                    finalItem = {
                        ...spinResult.result,
                        isSpecial: spinResult.result.type === 'legendary',
                        isRare: spinResult.result.type === 'rare',
                        isMythic: spinResult.result.type === 'mythic',
                        isEvent: spinResult.result.type === 'event',
                        isRecursion: spinResult.result.type === 'recursion'
                    };

                    // Check again before updating state
                    if (animationCancelledRef.current) return null;

                    // Update only the final item in the strip at FINAL_INDEX (position 72)
                    // This prevents visible items from randomly changing during the animation
                    setStrip(prevStrip => {
                        const newStrip = [...prevStrip];
                        // Use constant FINAL_INDEX to ensure consistency with animation target
                        if (FINAL_INDEX >= 0 && FINAL_INDEX < newStrip.length) {
                            newStrip[FINAL_INDEX] = finalItem;
                        }
                        return newStrip;
                    });
                    setResult(finalItem);
                    setIsNewItem(spinResult.isNew);
                    setPrestigePull(spinResult.prestige || null);

                    return spinResult;
                } catch (err) {
                    clearTimeout(timeoutId);
                    // Re-throw unless aborted (which is intentional)
                    if (err.name === 'AbortError') {
                        return null; // Silently ignore abort
                    }
                    throw err;
                }
            })();

            const animate = (timestamp) => {
                // Bail out if animation was cancelled (e.g., cooldown, unmount)
                if (animationCancelledRef.current) return;

                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / spinDuration, 1);
                const eased = 1 - Math.pow(1 - progress, 4);
                offsetRef.current = eased * finalOffset;

                // Update spin progress for Phase 2 visual effects (throttled updates)
                // Only update at key thresholds to avoid excessive re-renders
                if (progress < 0.1) updateSpinProgress(0);
                else if (progress >= 0.5 && progress < 0.55) updateSpinProgress(0.5);
                else if (progress >= 0.7 && progress < 0.75) updateSpinProgress(0.7);
                else if (progress >= 0.9) updateSpinProgress(0.95);

                // Canvas strip reads directly from canvasOffsetRef - no setState needed!
                canvasOffsetRef.current = offsetRef.current;

                if (progress < 1 && !animationCancelledRef.current) {
                    animationRef.current = requestAnimationFrame(animate);
                } else if (!animationCancelledRef.current) {
                    // Animation complete - wait for API if needed, then finish
                    apiCall.then((result) => {
                        // Check for cancellation before updating state
                        if (animationCancelledRef.current) return;

                        // If result is null (e.g., abort), reset to idle
                        if (result === null) {
                            setState('idle');
                            flushKotwPending();
                            return;
                        }

                        if (result.isRecursion) {
                            // RECURSION triggered! Show special result state
                            setState('recursion');
                            playRecursionSound();
                            // Apply pending KOTW result now that animation is complete
                            settleKotwSpin();
                            if (onSpinComplete) onSpinComplete(result);
                        } else if (result.isEvent) {
                            setState('event');
                            // The bonus wheel takes over from here and never returns to
                            // this handler, so the KOTW spin has to be settled now.
                            settleKotwSpin();
                            setTimeout(() => spinBonusWheel(result.bonusEvent), 1500);
                        } else {
                            setState('result');
                            setSpinProgress(1); // Animation complete
                            // Play sound based on item rarity
                            if (result.result?.type) {
                                playRaritySound(result.result.type);
                            }
                            // Apply pending KOTW result now that animation is complete
                            settleKotwSpin();
                            if (onSpinComplete) onSpinComplete(result);
                        }
                    }).catch((err) => {
                        // Check for cancellation before updating state
                        if (animationCancelledRef.current) return;

                        console.error('Spin failed:', err);
                        if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
                            setError('Server unavailable. Please try again later.');
                        } else {
                            setError(err.message || 'Spin failed. Please try again.');
                        }
                        // Clear stale spin state
                        setStrip([]);
                        setResult(null);
                        setIsNewItem(false);
            setPrestigePull(null);
                        setPrestigePull(null);
        setPrestigePull(null);
                        setState('idle');
                        flushKotwPending();
                    });
                }
            };
            animationRef.current = requestAnimationFrame(animate);
        } catch (err) {
            console.error('Spin failed:', err);
            if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
                setError('Server unavailable. Please try again later.');
            } else {
                setError(err.message || 'Spin failed. Please try again.');
            }
            // Clear stale spin state
            setStrip([]);
            setResult(null);
            setIsNewItem(false);
            setPrestigePull(null);
        setPrestigePull(null);
            setState('idle');
            flushKotwPending();
        }
    }

    async function spin() {
        if (state !== 'idle' || !user) return;
        if (allItems.length === 0) return;
        setError(null); // Clear any previous error
        performSpin();
    }

    // Keep spinRef updated for keyboard handler
    spinRef.current = spin;

    // Helper function to select a weighted random event
    function selectWeightedEvent() {
        const totalWeight = BONUS_EVENTS.reduce((sum, e) => sum + (e.weight || 1), 0);
        let roll = Math.random() * totalWeight;

        for (const event of BONUS_EVENTS) {
            roll -= (event.weight || 1);
            if (roll <= 0) return event;
        }
        return BONUS_EVENTS[0]; // Fallback
    }

    // Spin the bonus wheel onto the event the server already rolled - using horizontal strip.
    // The wheel is presentation: /api/spin decided the outcome the moment the BONUS EVENT
    // item came up, and the reward is gated on that roll, so picking a different one here
    // would just animate a lie and then be refused. selectWeightedEvent() survives for the
    // filler slots, which are decoration and have no bearing on the payout.
    function spinBonusWheel(rolledEvent) {
        setState('bonusWheel');

        // Match the server's roll to the local entry so the strip has colour/description.
        // Falling back to a local roll keeps an older backend (one that doesn't send
        // bonusEvent yet) playable rather than wedging the wheel on a null.
        const event = (rolledEvent && BONUS_EVENTS.find(e => e.id === rolledEvent.id)) || selectWeightedEvent();
        setSelectedEvent(event);

        // Build a strip of events (repeat them to fill the strip).
        //
        // The board replaced the card and now spans the full band, so the strip
        // has to cover half a screen past the landing: 80 tiles, landing at 64,
        // leaves 15 tiles of runway either side of the stop.
        //
        // The pitch is NOT restated here any more. A previous pass diagnosed
        // exactly this mismatch — the animation running one width against a
        // canvas drawing another — and then fixed the wrong side of it, moving
        // the animation to 120 while CanvasBonusStrip kept a local 160. The
        // board came to rest showing tile 48 (7680 / 160) instead of tile 64,
        // and tile 48 is a filler with its own random roll, so the announced
        // event and the executed event agreed only by coincidence. The geometry
        // is owned by the component that draws it, the way LANE_PITCH is.
        const newStrip = [];
        for (let i = 0; i < BONUS_STRIP_LENGTH; i++) {
            if (i === BONUS_FINAL_INDEX) {
                newStrip.push(event);
            } else {
                // Random event for filler (also weighted for visual consistency)
                newStrip.push(selectWeightedEvent());
            }
        }
        setBonusStrip(newStrip);
        bonusOffsetRef.current = 0;

        // Animate the strip
        // The board travels down on a phone and across on the band, so it lands on
        // whichever pitch it is drawing at. Same contract as the reel's
        // MOBILE_ROW_PITCH: the geometry is owned by the component that draws it.
        const targetOffset = BONUS_FINAL_INDEX * (isMobile ? BONUS_PITCH_MOBILE : BONUS_PITCH);
        const finalOffset = targetOffset + (Math.random() - 0.5) * 20;
        let startTime = null;
        const duration = 3500;

        const animateStrip = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out quartic for nice deceleration
            const eased = 1 - Math.pow(1 - progress, 4);
            bonusOffsetRef.current = eased * finalOffset;

            if (progress < 1) {
                bonusWheelRef.current = requestAnimationFrame(animateStrip);
            } else {
                // Show result briefly then execute
                setState('bonusResult');
                setTimeout(() => executeSelectedEvent(event), 1500);
            }
        };
        bonusWheelRef.current = requestAnimationFrame(animateStrip);
    }

    // Execute the selected bonus event
    async function executeSelectedEvent(event) {
        if (event.id === 'triple_spin') {
            triggerTripleSpin();
        } else if (event.id === 'lucky_spin') {
            triggerLuckySpin();
        } else if (event.id === 'triple_lucky_spin') {
            triggerTripleLuckySpin();
        }
    }

    // Lucky spin - equal probability for all items (bonus event reward - no cooldown)
    async function triggerLuckySpin() {
        setState('luckySpinning');
        animationCancelledRef.current = false;

        try {
            // No body: the server knows which bonus event it rolled for this user and
            // gates the spin on that, so there is nothing for the client to declare.
            const res = await fetch(`${API_BASE_URL}/api/spin/lucky`, {
                method: 'POST',
                credentials: 'include'
            });
            const spinResult = await res.json();

            // Check for errors (no cooldown check - this is a bonus reward)
            if (!res.ok || !spinResult.result) {
                setError(spinResult.error || 'Spin failed. Please wait a moment and try again.');
                setState('idle');
                return;
            }

            const finalItem = {
                ...spinResult.result,
                isSpecial: spinResult.result.type === 'legendary',
                isRare: spinResult.result.type === 'rare',
                isMythic: spinResult.result.type === 'mythic',
                isLucky: true
            };

            // Build strip and animate
            const newStrip = buildStrip(finalItem);
            setStrip(newStrip);
            setLuckyResult(finalItem);
            setIsLuckyNew(spinResult.isNew);
            setPrestigePull(spinResult.prestige || null);
            offsetRef.current = 0;
            canvasOffsetRef.current = 0;

            const itemWidth = isMobile ? MOBILE_ROW_PITCH : ITEM_WIDTH;
            const targetOffset = FINAL_INDEX * itemWidth;
            const finalOffset = targetOffset + landingVariance(itemWidth);
            let startTime = null;

            const animate = (timestamp) => {
                // Bail out if animation was cancelled
                if (animationCancelledRef.current) return;

                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / spinDuration, 1);
                const eased = 1 - Math.pow(1 - progress, 4);
                offsetRef.current = eased * finalOffset;

                // Canvas strip reads directly from canvasOffsetRef - no setState needed!
                canvasOffsetRef.current = offsetRef.current;

                if (progress < 1 && !animationCancelledRef.current) {
                    animationRef.current = requestAnimationFrame(animate);
                } else if (!animationCancelledRef.current) {
                    setState('luckyResult');
                    // Play sound for lucky result
                    if (finalItem?.type) {
                        playRaritySound(finalItem.type);
                    }
                    if (onSpinComplete) onSpinComplete(spinResult);
                }
            };
            animationRef.current = requestAnimationFrame(animate);
        } catch (error) {
            console.error('Lucky spin failed:', error);
            setState('idle');
        }
    }

    async function triggerTripleSpin() {
        setState('tripleSpinning');

        try {
            // Helper to get a valid (non-event) spin result.
            // `bonus` is the only field the server reads - it spends a bonus credit
            // instead of the cooldown. Which event granted those credits is the
            // server's own record, so the client no longer declares it.
            async function getValidSpin() {
                let attempts = 0;
                while (attempts < 5) {
                    const res = await fetch(`${API_BASE_URL}/api/spin`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bonus: true })
                    });
                    const result = await res.json();

                    // Handle rate limit / cooldown - throw to abort triple spin
                    if (res.status === 429 || result.cooldown) {
                        throw new Error('COOLDOWN');
                    }

                    // Check for other errors
                    if (!res.ok || !result.result) {
                        throw new Error(result.error || 'Spin failed');
                    }

                    if (!result.isEvent) {
                        return result;
                    }
                    attempts++;
                }
                // Fallback: return a random regular item (shouldn't happen often)
                const regularItem = allItems[Math.floor(Math.random() * allItems.length)];
                return {
                    result: { ...regularItem, type: 'regular' },
                    isNew: !collection[regularItem.texture],
                    isEvent: false
                };
            }

            // Get 5 valid spins (retrying if we hit events)
            const results = await Promise.all([getValidSpin(), getValidSpin(), getValidSpin(), getValidSpin(), getValidSpin()]);

            const newStrips = [];
            const newResults = [];
            const newItems = [];

            for (let i = 0; i < 5; i++) {
                const spinResult = results[i];
                const finalItem = {
                    ...spinResult.result,
                    isSpecial: spinResult.result.type === 'legendary',
                    isRare: spinResult.result.type === 'rare',
                    isMythic: spinResult.result.type === 'mythic'
                };
                newStrips.push(buildStrip(finalItem));
                newResults.push(finalItem);
                newItems.push(spinResult.isNew);
            }

            setTripleStrips(newStrips);
            setTripleResults(newResults);
            setTripleNewItems(newItems);
            tripleOffsetRefs.current = [0, 0, 0, 0, 0];

            // Staggered animation start
            const delays = [0, 200, 400, 600, 800];
            const completedCount = { current: 0 };
            // The animation must stop on the same pitch the lanes draw at;
            // LANE_PITCH is owned by SpinLanes so the two cannot drift (they
            // did: the old card widths left the winner off the platform line).
            const tripleItemWidth = LANE_PITCH(isMobile, false);

            delays.forEach((delay, rowIndex) => {
                setTimeout(() => {
                    const targetOffset = FINAL_INDEX * tripleItemWidth;
                    const finalOffset = targetOffset + landingVariance(tripleItemWidth);
                    let startTime = null;

                    const animate = (timestamp) => {
                        if (!startTime) startTime = timestamp;
                        const elapsed = timestamp - startTime;
                        const progress = Math.min(elapsed / spinDuration, 1);
                        const eased = 1 - Math.pow(1 - progress, 4);

                        // Canvas strips read directly from tripleOffsetRefs - no setState needed!
                        tripleOffsetRefs.current[rowIndex] = eased * finalOffset;

                        if (progress < 1) {
                            tripleAnimationRefs.current[rowIndex] = requestAnimationFrame(animate);
                        } else {
                            completedCount.current++;
                            if (completedCount.current === 5) {
                                setState('tripleResult');
                                // Play sound for best rarity among all 5 results
                                const rarityPriority = ['insane', 'mythic', 'legendary', 'rare'];
                                const bestRarity = results.reduce((best, r) => {
                                    const type = r?.result?.type;
                                    const bestIndex = rarityPriority.indexOf(best);
                                    const typeIndex = rarityPriority.indexOf(type);
                                    if (typeIndex !== -1 && (bestIndex === -1 || typeIndex < bestIndex)) {
                                        return type;
                                    }
                                    return best;
                                }, null);
                                if (bestRarity) playRaritySound(bestRarity);
                                // Bonus spins still spend KOTW lucky spins server-side, so
                                // the badge has to be reconciled here - otherwise it keeps
                                // showing the pre-sequence count until the next ordinary
                                // spin corrects it. The five requests run concurrently and
                                // Promise.all preserves argument order, not completion
                                // order, so the lowest balance reported is the reliable
                                // one: it only ever counts down across a sequence.
                                const reportedBalances = results
                                    .map(r => r?.kotwLuckySpinsRemaining)
                                    .filter(v => typeof v === 'number');
                                if (reportedBalances.length > 0 && onKotwLuckySpinsUpdate) {
                                    onKotwLuckySpinsUpdate(Math.min(...reportedBalances));
                                }
                                results.forEach(r => { if (onSpinComplete) onSpinComplete(r); });
                            }
                        }
                    };
                    tripleAnimationRefs.current[rowIndex] = requestAnimationFrame(animate);
                }, delay);
            });
        } catch (error) {
            // Show error message on cooldown, log other failures
            if (error.message === 'COOLDOWN') {
                setError("Don't spin too fast!");
            } else {
                console.error('Triple spin failed:', error);
            }
            setState('idle');
        }
    }

    // Triple Lucky Spin - 3 lucky spins with equal probability for all items
    async function triggerTripleLuckySpin() {
        setState('tripleLuckySpinning');

        try {
            // Helper to get a lucky spin result.
            // No body: the server rolled this bonus event and counts the trigger itself.
            async function getLuckySpin() {
                const res = await fetch(`${API_BASE_URL}/api/spin/lucky`, {
                    method: 'POST',
                    credentials: 'include'
                });
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Lucky spin failed');
                }

                return data;
            }

            // Get all 3 lucky spin results
            const results = await Promise.all([getLuckySpin(), getLuckySpin(), getLuckySpin()]);

            // Build strips for each result
            const strips = results.map(r => {
                const finalItem = {
                    ...r.result,
                    isSpecial: r.result.type === 'legendary',
                    isRare: r.result.type === 'rare',
                    isMythic: r.result.type === 'mythic',
                    isLucky: true
                };
                return buildStrip(finalItem);
            });

            setTripleStrips(strips);
            setTripleResults(results.map(r => ({
                ...r.result,
                isSpecial: r.result.type === 'legendary',
                isRare: r.result.type === 'rare',
                isMythic: r.result.type === 'mythic',
                isLucky: true
            })));
            setTripleNewItems(results.map(r => r.isNew));
            tripleOffsetRefs.current = [0, 0, 0];

            // Animate all three strips with staggered starts
            const completedCount = { current: 0 };
            const delays = [0, 200, 400];
            // Same contract as the 5x: stop on the lanes' own pitch.
            const tripleItemWidth = LANE_PITCH(isMobile, true);

            strips.forEach((_, rowIndex) => {
                const delay = delays[rowIndex];

                setTimeout(() => {
                    const targetOffset = FINAL_INDEX * tripleItemWidth;
                    const finalOffset = targetOffset + landingVariance(tripleItemWidth);
                    let startTime = null;

                    const animate = (timestamp) => {
                        if (!startTime) startTime = timestamp;
                        const elapsed = timestamp - startTime;
                        const progress = Math.min(elapsed / spinDuration, 1);
                        const eased = 1 - Math.pow(1 - progress, 4);

                        // Canvas strips read directly from tripleOffsetRefs - no setState needed!
                        tripleOffsetRefs.current[rowIndex] = eased * finalOffset;

                        if (progress < 1) {
                            tripleAnimationRefs.current[rowIndex] = requestAnimationFrame(animate);
                        } else {
                            completedCount.current++;
                            if (completedCount.current === 3) {
                                setState('tripleLuckyResult');
                                // Play sound for best rarity among all 3 results
                                const rarityPriority = ['insane', 'mythic', 'legendary', 'rare'];
                                const bestRarity = results.reduce((best, r) => {
                                    const type = r?.result?.type;
                                    const bestIndex = rarityPriority.indexOf(best);
                                    const typeIndex = rarityPriority.indexOf(type);
                                    if (typeIndex !== -1 && (bestIndex === -1 || typeIndex < bestIndex)) {
                                        return type;
                                    }
                                    return best;
                                }, null);
                                if (bestRarity) playRaritySound(bestRarity);
                                results.forEach(r => { if (onSpinComplete) onSpinComplete(r); });
                            }
                        }
                    };
                    tripleAnimationRefs.current[rowIndex] = requestAnimationFrame(animate);
                }, delay);
            });
        } catch (error) {
            console.error('Triple lucky spin failed:', error);
            setState('idle');
        }
    }

    // A `reset()` used to sit here — sixteen setters returning the whole surface
    // to idle — and nothing called it. Every path that clears a spin goes through
    // `respin()` above, which clears the same state and immediately spins again,
    // so the "back to idle with nothing showing" state this restored is one the
    // surface never actually enters. Left in place it was a second definition of
    // what "clean" means, drifting out of step with `respin` every time a new
    // piece of spin state was added — and three already had been.
    //
    // `isDisabled` went with it: also declared here, also read nowhere. The idle
    // block derives its own disabled state from `user` and `allItems`, which is
    // where the button that needs it actually lives.

    // totalItemCount includes both regular items and dynamic items (team members, special items)
    const totalItemCount = allItems.length + (dynamicItems?.length || 0);


    // Compute recursion effects flag - must be before any early returns
    // Use ref during spinning/result to persist styling even after spin count decreases
    const showSpinRecursionEffects = (state === 'spinning' || state === 'result')
        ? currentSpinIsRecursionRef.current
        : (recursionActive && recursionSpinsRemaining > 0);

    // Compute KOTW lucky effects flag
    // Use state variable which is set at spin start for immediate effect
    const showSpinKotwLuckyEffects = (state === 'spinning' || state === 'result')
        ? currentSpinIsKotwLucky
        : (!showSpinRecursionEffects && kotwLuckySpins > 0);

    // Combined flag for any lucky spin effects (for shared logic like equal odds)
    const showAnySpinLuckyEffects = showSpinRecursionEffects || showSpinKotwLuckyEffects;

    // KOTW Lucky uses crimson/gold theme (distinct from Recursion's matrix green)
    // Recursion: Matrix green (#00ff00) - tech/digital aesthetic
    // KOTW Lucky: Crimson (#F43F5E) + Gold (#F59E0B) + Slate (#1E293B) - royal aesthetic
    const KOTW_CRIMSON = '#F43F5E';
    const KOTW_GOLD = '#F59E0B';

    // ── Event mode ───────────────────────────────────────────────────────────
    //
    // While an event runs the reel takes its colour: the rules above and below the
    // band, the centre indicator, the pointers and the band's own glow all shift
    // to the event's hue. The banner sits flush on top of the band, so without
    // this the two read as unrelated — a coloured announcement pasted above a
    // surface that carries on as though nothing is happening.
    //
    // This is presentation only. Gold Rush's actual mechanic still travels through
    // `goldRushBoostedRarity` into drawItem, which is what makes the boosted tier's
    // columns light up; the accent here does not change any tile's rarity.
    //
    // A lucky spin outranks it. Recursion and KOTW lucky spins are things happening
    // to *you*, and for those four seconds they own the band — an ambient event
    // tint underneath would just muddy the colour that is telling you something.
    //
    // Declared here, below KOTW_CRIMSON and the lucky-spin flags, because it reads
    // all three. It was first written up beside the goldRushBoostedRarity lookup
    // near the top of the component, which put every one of those references in the
    // temporal dead zone — the build was clean and the page rendered blank.
    const EVENT_ACCENT = {
        king_of_wheel: KOTW_CRIMSON,
        gold_rush: COLORS.gold,
        first_blood: COLORS.red,
        community_goal: COLORS.aqua,
    };
    // An event's colour must outlive its clock. `global_event_end` clears
    // `globalEventStatus.type` (and `active`) the moment the event is over, but
    // the result banner keeps this slot for its display period and First Blood's
    // winner card is literally the unboxing of the special item. Dropping the
    // accent at 0:00 left the band back on the default gradient while that card
    // was still open - the wheel said "event over" under a banner that was still
    // announcing the prize. The aftermath flags below are the same signals the
    // banners live and die by (their display windows live in the ActivityContext
    // result handlers: 8s First Blood, 12s Community Goal, 30s KOTW), so the
    // accent now survives exactly as long as the surface it belongs to.
    const aftermathEventType = firstBloodResultPending || firstBloodWinner
        ? 'first_blood'
        : communityGoalResultPending || communityGoalResult
            ? 'community_goal'
            : kotwWinnerPending || kotwWinner
                ? 'king_of_wheel'
                : null;
    const eventAccent = (globalEventStatus?.active || aftermathEventType)
        ? EVENT_ACCENT[aftermathEventType || globalEventStatus?.type] || null
        : null;

    // The takeover modes. The bonus board, the lucky spin and the 3x/5x lanes
    // are not separate trees any more — they are themes of the same band and
    // stage the normal spin uses, so the band's content and every accent must
    // know which mode is playing. Each mode owns one accent, and the lamp, the
    // line, the band's tint and the result all draw from that one decision:
    // the bonus family runs orange, the lucky family green, the 5x gold.
    // Declared above the accents because the band's rules and the console's
    // lamp read `modeAccent` first.
    const isBonusMode = state === 'bonusWheel' || state === 'bonusResult';
    const isLuckyMode = state === 'luckySpinning' || state === 'luckyResult';
    const isTripleMode = state === 'tripleSpinning' || state === 'tripleResult' || state === 'tripleLuckySpinning' || state === 'tripleLuckyResult';
    const isModeSpinning = state === 'bonusWheel' || state === 'luckySpinning' || state === 'tripleSpinning' || state === 'tripleLuckySpinning';
    const modeAccent = isBonusMode
        ? COLORS.orange
        : (isLuckyMode || state === 'tripleLuckySpinning' || state === 'tripleLuckyResult')
            ? COLORS.green
            : isTripleMode
                ? COLORS.gold
                : null;

    const bandAccent = showSpinRecursionEffects
        ? COLORS.recursion
        : showSpinKotwLuckyEffects
            ? KOTW_GOLD
            : modeAccent || eventAccent || COLORS.gold;

    const KOTW_SLATE = '#1E293B';
    const KOTW_SLATE_DARK = '#0F172A';

    // `spinLuckyColor` and `spinLuckyAccent` were declared here and read nowhere.
    // Every lucky-spin surface below picks its own colour inline from
    // `showSpinRecursionEffects`, which is the same decision these two made — a
    // second source for one answer, which is how the two ended up able to
    // disagree without anything failing.


    // Idle state - show clickable wheel with enhanced cosmic visuals
    // Idle used to return here, rendering a completely different tree: no reel, no
    // status line, just the tarot card. That made the reel appear and disappear
    // between states, which a fixed-height grid row cannot do — the row would
    // collapse and every other row would jump.
    //
    // So idle now renders the same two rows as every other state. The reel is
    // simply dormant: dimmed and drifting rather than absent. Spinning does not
    // rebuild the layout, it wakes the reel up, and nothing on the page moves.

    // The band's two rules, tinted per state. The old borderBlock computed the
    // same ternary inline; it is hoisted because the rules are now overlays
    // painted in two places instead of one border property.
    const ruleColor = showSpinRecursionEffects
        ? `${COLORS.recursion}40`
        : showSpinKotwLuckyEffects
            ? `${KOTW_CRIMSON}50`
            : modeAccent
                ? `${modeAccent}45`
                : eventAccent
                    ? `${eventAccent}55`
                    : `${COLORS.gold}28`;

    // The console's readouts — the same state language as the label beside
    // them, so the machine's lamps and the words always agree. `consoleColor`
    // mirrors the label's own ternary (recursion green, event orange, lucky
    // green, KOTW gold) rather than second-guessing it; the two are one
    // decision and were written together.
    const spinningState = state === 'spinning' || state === 'tripleSpinning' || state === 'tripleLuckySpinning' || state === 'luckySpinning' || state === 'bonusWheel';
    const resultState = state === 'result' || state === 'tripleResult' || state === 'luckyResult' || state === 'tripleLuckyResult' || state === 'recursion' || state === 'bonusResult';
    const consoleColor = state === 'recursion' ? COLORS.recursion
        : state === 'event' || state === 'bonusWheel' || state === 'bonusResult' ? COLORS.orange
            : state === 'luckySpinning' || state === 'luckyResult' || state === 'tripleLuckySpinning' || state === 'tripleLuckyResult' ? COLORS.green
                : showSpinRecursionEffects ? COLORS.recursion
                    : showSpinKotwLuckyEffects ? KOTW_GOLD
                        : COLORS.gold;

    return (
        // `display: contents` dissolves this wrapper so its children become direct
        // children of WheelPage's grid, which is what lets the reel occupy a
        // full-width row while the result sits between the sidebars — without
        // lifting any spin state out of this component.
        //
        // The cost is that this element no longer generates a box: its padding,
        // `position: relative` and `minHeight` stop applying, so every child must
        // place itself explicitly (`gridRow` / `gridColumn`) rather than relying on
        // flow. Anything added here needs its own placement or it will be
        // auto-placed into whatever grid cell happens to be free.
        //
        // The phone keeps the flex column: it is a single column, the reel runs
        // vertically as a shaft, and there is no multi-row grid to participate in.
        //
        // It does NOT scroll any more, and that is the layout's whole shape. It was
        // `overflowY: auto` with a fixed 260px reel, so a phone got a short reel
        // above the fold and everything else pushed below it — on the one surface
        // whose entire job happens in a single view. The column is now exactly the
        // viewport, the shaft takes every pixel the other rows do not claim, and
        // nothing is ever off screen.
        //
        // Horizontal padding is gone with it. The shaft is full-bleed, the same
        // decision the desktop band made for the same reason: a band that stops
        // short of the screen edge is a box in the middle of the page.
        <div style={isMobile ? {
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            padding: 0,
            position: 'relative',
            // Row 4 of the phone template, under the topbar, the ticker and the
            // banner/meter slot — not the `2 / 6` span it used to take, which
            // started in the ticker's own row.
            gridRow: 4,
            gridColumn: 1,
            minHeight: 0,
            overflow: 'hidden',
        } : { display: 'contents' }}>

            {/* Odds Info Modal */}
            {showOddsInfo && (
                <OddsInfoModal
                    onClose={() => setShowOddsInfo(false)}
                    dynamicItems={dynamicItems}
                    allItems={allItems}
                    isMobile={isMobile}
                />
            )}

            {/* The main spin surface, split across two grid rows.

                This used to be one "unified card": a bordered box holding the
                status header, the reel and the result stacked vertically, sitting
                in the middle of a centred column. The card was what capped the
                reel — the reel could never be wider than the box it was inside,
                and the box could never be wider than the column, and the column
                could never be wider than what the sidebars left it.

                So the box is gone. The status line and the reel are a full-width
                band across the page; the result drops into the stage below,
                between the sidebars. Nothing is nested inside anything that
                constrains it, which is why the reel can simply be as wide as the
                screen without a single layout trick.

                Deleted with the card: its four corner accents, its top edge
                highlight and its outer glow ring. Those framed a box that no
                longer exists — the reel is now a band between two rules, and a
                band does not have corners. The three full-surface washes that
                were also anchored to the card (recursion scanlines, KOTW shimmer,
                the data stream) move up to the shell, which is closer to their
                intent anyway: a recursion spin should tint the whole surface, not
                a rectangle in the middle of it. */}
                    {/* ── Row 2: the reel band ─────────────────────────────── */}
                    <div style={{
                        gridRow: 4,
                        gridColumn: '1 / -1',
                        position: 'relative',
                        zIndex: Z.reel,
                        // On a phone this row is the shaft and it takes everything
                        // the rows around it do not claim. `minHeight: 0` because a
                        // flex child defaults to `min-height: auto` and would
                        // otherwise refuse to shrink below its content.
                        ...(isMobile ? { flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column' } : null),
                        // The band is still "between two rules" — but the rules
                        // are overlays below, not borders. A constant full-width
                        // line is a rectangle's edge; these fade to nothing at
                        // the sides, like the canvas's own machined edges.
                        background: showSpinRecursionEffects
                            ? 'linear-gradient(180deg, #0a150a 0%, #12240e 46%, #0a150a 100%)'
                            : showSpinKotwLuckyEffects
                                ? `linear-gradient(180deg, ${KOTW_SLATE_DARK} 0%, ${KOTW_SLATE} 46%, ${KOTW_SLATE_DARK} 100%)`
                                : modeAccent
                                    // The takeover modes tint the same deck the
                                    // normal spin stands on — the accent's light
                                    // falling from the rail, the street dark
                                    // below. The old takeover cards repainted
                                    // the band in warm browns and fought the
                                    // world; a wash lets the mode read without
                                    // leaving THE NOCTURNE.
                                    ? `linear-gradient(180deg, ${modeAccent}12 0%, ${modeAccent}06 45%, #05060a 100%)`
                                    : eventAccent
                                        // A wash, not a fill. The tiles are the thing
                                        // being read; the event tints the room they are
                                        // in rather than repainting them.
                                        ? `linear-gradient(180deg, ${eventAccent}14 0%, ${eventAccent}08 55%, #14141a 100%)`
                                        // Blue hour, sinking to the street: cobalt at
                                        // the skyline's base, black at the curb. The
                                        // city's ground, not a panel's fill — the band
                                        // is where the viaduct deck sits. THE NOCTURNE.
                                        : 'linear-gradient(180deg, #0d1322 0%, #0a0d18 44%, #05060a 100%)',
                        // During an event the band glows even at rest, so the
                        // surface looks live rather than only reacting on a spin.
                        boxShadow: state === 'spinning' || isModeSpinning
                            ? `0 0 60px -20px ${bandAccent}`
                            : eventAccent
                                ? `0 0 46px -26px ${eventAccent}`
                                : 'none',
                        transition: 'box-shadow 0.3s ease-out, background 0.4s ease-out',
                    }}>
                        {/* The band's two rules, as fading hairlines. The old
                            borderBlock was the blockiest line on the surface:
                            full width, constant strength, dead straight from one
                            viewport edge to the other. These are strongest
                            mid-screen and gone toward the sides — and in THE
                            NOCTURNE they are the city's own lines, not a frame's:
                            the top one is the viaduct rail, the bottom the street
                            glow under the deck.
                            */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${ruleColor} 14%, ${ruleColor} 86%, transparent)` }} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${ruleColor} 14%, ${ruleColor} 86%, transparent)` }} />

                        {/* Header.
                            No divider under it: the seam between the header and
                            the reel is now the band's own top hairline, drawn by
                            the canvas. The old 1px rule was a card's edge; a mount
                            has none — see the strip container below. */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 20px',
                            // The header reserves its tallest variant so the band
                            // can never change height: the `?` button is 28px and
                            // "Try Again" ~32px, so the row grew ~4px the moment a
                            // result landed and shrank again on respin — pushing
                            // the whole stage (and the flanks centred in it) up
                            // and down at the one moment the surface should hold
                            // still. 64 = 32px of tallest control + 16px padding
                            // twice; a few px of spare air at idle is invisible,
                            // a moving stage is not.
                            minHeight: '64px',
                            boxSizing: 'border-box',
                            // The deck's top face — the coping the console sits on.
                            // Same grain as every plinth (SURFACE_NOISE), with the
                            // blue hour's sky light falling on it from the rail and
                            // dying before the recess. The canvas's own hairline
                            // below this row is what separates the coping from the
                            // reel, so the world holds without a single border —
                            // this is the deck's material, not a strip wrapped
                            // around content. (Owner: the row itself felt
                            // untouched; added 2026-08-19.)
                            backgroundImage: `${SURFACE_NOISE}, linear-gradient(180deg, rgba(148,168,212,0.06) 0%, rgba(148,168,212,0) 42%), linear-gradient(180deg, #0d1322 0%, #0a0d18 100%)`,
                        }}>
                            {/* Left and right groups each take an equal share of
                                the slack (`flex: 1 1 0`), which is what keeps the
                                KOTW board centred on the BAR rather than on
                                whatever space happens to be left over.
                                
                                Centred in the leftover, the board slid ~92px every
                                time this row's contents changed width — the label
                                going "Ready to spin" -> "Spinning..." -> "Gamba!",
                                and above all the "Try Again" button appearing on
                                the right. Measured: all five chips moving together
                                by 92px, with zero change in their own widths. */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 0', minWidth: 0 }}>
                                {/* The console — the band's header is a machine
                                    face now, and the wheel mark that used to spin
                                    here is gone (the owner asked for machinery and
                                    found the mark goofy in this row; it still leads
                                    the topbar and the spin control).

                                    THE NOCTURNE, machined: a square plate of the
                                    band's own plinth material — no border, no
                                    radius, the lit rail along its top edge instead
                                    of an outline — carrying the machine's lamps.
                                    The LEDs are lights, not chrome: the ready lamp
                                    holds amber, the run lamp blinks while a spin is
                                    in flight, and the stripe chases its state
                                    colour along the row while spinning, sits dim
                                    at idle and burns steady at the result. The
                                    words beside them carry the reason — the
                                    caption rule from the spin control, verbatim —
                                    so the lamps only ever agree with the label. */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: isMobile ? '4px 8px' : '5px 10px',
                                    borderRadius: 0,
                                    // The plinth's ground plus SURFACE_NOISE, the
                                    // milled plate's grain — same material as the
                                    // stage flanks and the milestone meter.
                                    backgroundImage: `${SURFACE_NOISE}, linear-gradient(180deg, #1b1b28 0%, #12121c 100%)`,
                                    boxShadow: 'inset 0 1px 0 rgba(190,198,220,0.10), inset 0 -1px 0 rgba(0,0,0,0.45)',
                                }}>
                                    {/* Status LEDs + stripe: decoration by
                                        definition — the label carries the state for
                                        assistive tech. */}
                                    <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <div style={{
                                            width: 6, height: 6, borderRadius: '50%',
                                            background: COLORS.gold, opacity: 0.9,
                                            boxShadow: `0 0 6px ${COLORS.gold}88`,
                                        }} />
                                        <div style={{
                                            width: 6, height: 6, borderRadius: '50%',
                                            background: consoleColor,
                                            opacity: spinningState ? 1 : 0.22,
                                            boxShadow: spinningState ? `0 0 6px ${consoleColor}88` : 'none',
                                            animation: spinningState ? 'fibLedBlink 0.7s ease-in-out infinite' : 'none',
                                        }} />
                                        <div style={{
                                            width: 6, height: 6, borderRadius: '50%',
                                            background: consoleColor,
                                            opacity: resultState ? 1 : 0.22,
                                            boxShadow: resultState ? `0 0 6px ${consoleColor}88` : 'none',
                                        }} />
                                    </div>
                                    <div aria-hidden="true" style={{ display: 'flex', gap: '2px' }}>
                                        {Array.from({ length: 12 }).map((_, i) => (
                                            <div key={i} style={{
                                                width: 3, height: 8, borderRadius: 1,
                                                background: consoleColor,
                                                opacity: spinningState ? 0.18 : resultState ? 1 : 0.35,
                                                boxShadow: resultState ? `0 0 4px ${consoleColor}66` : 'none',
                                                animation: spinningState ? 'fibLedChase 1.2s linear infinite' : 'none',
                                                animationDelay: `${-i * 0.1}s`,
                                            }} />
                                        ))}
                                    </div>
                                </div>
                                <span style={{
                                    color: state === 'recursion' ? COLORS.recursion
                                        : state === 'event' || state === 'bonusWheel' || state === 'bonusResult' ? COLORS.orange
                                            : (state === 'luckySpinning' || state === 'luckyResult' || state === 'tripleLuckySpinning' || state === 'tripleLuckyResult') ? COLORS.green
                                                : showSpinRecursionEffects ? COLORS.recursion
                                                    : showSpinKotwLuckyEffects ? '#F8FAFC'
                                                        : COLORS.gold,
                                    fontSize: '18px',
                                    fontWeight: '600',
                                    // The row may not change height between spin
                                    // states, and this label is the only thing in
                                    // it long enough to wrap. On a 414px phone
                                    // "Triple Lucky Spinning…" took three lines and
                                    // grew the console's row by ~46px in the middle
                                    // of a takeover. The two longest labels were
                                    // shortened rather than truncated — an ellipsis
                                    // on the one word naming the mode is worse than
                                    // a shorter name — and the mode names now agree
                                    // with each other: 5x, 3x Lucky.
                                    whiteSpace: 'nowrap',
                                    // With the label no longer able to wrap, the
                                    // left group grows to its full width and meets
                                    // the row's controls edge to edge on a phone.
                                    marginRight: '12px',
                                    textShadow: showSpinRecursionEffects
                                        ? `0 0 10px ${COLORS.recursion}`
                                        : showSpinKotwLuckyEffects
                                            ? `0 0 8px ${KOTW_CRIMSON}88`
                                            : 'none',
                                }}>
                                {state === 'spinning' ? (
                                        showSpinRecursionEffects ? 'Lucky Spinning...'
                                            : showSpinKotwLuckyEffects ? 'Event Lucky Spin...'
                                                : 'Spinning...'
                                    ) :
                                    state === 'recursion' ? 'RECURSION!' :
                                        state === 'event' ? 'BONUS EVENT!' :
                                            state === 'bonusWheel' ? 'Selecting Event...' :
                                                state === 'bonusResult' ? 'Event Selected!' :
                                                    state === 'tripleSpinning' ? '5x Spinning...' :
                                                        state === 'tripleResult' ? '5x Win!' :
                                                            state === 'luckySpinning' ? 'Lucky Spinning...' :
                                                                state === 'luckyResult' ? 'Lucky Win!' :
                                                                    state === 'tripleLuckySpinning' ? '3x Lucky Spinning...' :
                                                                        state === 'tripleLuckyResult' ? '3x Lucky Win!' :
                                                                            state === 'idle' ? 'Ready to spin' :
                                                                                'Gamba!'}
                            </span>
                            </div>

                            {/* The status bar's centre slot: standings while a
                                King of the Wheel event is running, and the lucky
                                spins it paid out afterwards. Standings during,
                                payout after — and if both apply, both show, which
                                is correct during an event you are already winning
                                spins from.
                                
                                The payout used to be a large pulsing badge in the
                                stage above the spin button, where it competed with
                                the result panel for space and shifted the button
                                down whenever it appeared. */}
                            <EventPayout luckySpins={kotwLuckySpins} isMobile={isMobile} />

                            {/* KOTW standings, in the status bar.
                                
                                This row already spans the full width and carries
                                only a label on the left and two buttons on the
                                right, so the middle is the largest piece of empty
                                horizontal space on the surface — and unlike the
                                band's headroom it has no tiles to avoid and no
                                moving reel behind it.
                                
                                Returns null unless a King of the Wheel event is
                                running, so the row is unchanged the rest of the
                                time. */}
                            <KotwReelBoard />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 0', minWidth: 0, justifyContent: 'flex-end' }}>
                                {/* Info button — a machined control now, in the
                                    plinth language: ground, lit rail on top, and
                                    the light rising through it on hover (aqua,
                                    the info light) instead of a border repaint.
                                    The 50% circle is the ratified shape for the
                                    `?` control. */}
                                <button
                                    onClick={() => setShowOddsInfo(true)}
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        backgroundImage: `${SURFACE_NOISE}, linear-gradient(180deg, #1b1b28 0%, #12121c 100%)`,
                                        boxShadow: 'inset 0 1px 0 rgba(190,198,220,0.10), inset 0 -1px 0 rgba(0,0,0,0.45)',
                                        color: COLORS.textMuted,
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.color = COLORS.aqua;
                                        e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(190,198,220,0.14), inset 0 0 18px rgba(85,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.45)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.color = COLORS.textMuted;
                                        e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(190,198,220,0.10), inset 0 -1px 0 rgba(0,0,0,0.45)';
                                    }}
                                    title="How drop rates work"
                                >
                                    ?
                                </button>

                                {/* Desktop only. On a phone the reel itself is the
                                    respin — the same tap that starts a spin from
                                    idle restarts it from a result, and the caption
                                    names that gesture — so this was a second
                                    control for one action, on the narrowest bar on
                                    the surface. Same call as the Trophy button, the
                                    leaderboard pill, the live ticker and the chat
                                    launcher; see the don't in DESIGN.md §8.

                                    It also takes the widest slot in a row that
                                    reserves its tallest variant to keep the band
                                    from changing height — so dropping it on the
                                    phone buys back the space that the `?` and the
                                    mode label were competing for. */}
                                {!isMobile && (state === 'result' || state === 'tripleResult' || state === 'luckyResult' || state === 'tripleLuckyResult' || state === 'recursion') && (
                                    <button onClick={respin} style={{
                                        padding: '8px 14px',
                                        borderRadius: 0,
                                        backgroundImage: `${SURFACE_NOISE}, linear-gradient(180deg, #1b1b28 0%, #12121c 100%)`,
                                        boxShadow: 'inset 0 1px 0 rgba(190,198,220,0.10), inset 0 -1px 0 rgba(0,0,0,0.45)',
                                        color: COLORS.textMuted, fontSize: '13px', cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.color = COLORS.text;
                                                e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(190,198,220,0.14), inset 0 0 18px rgba(255,183,94,0.10), inset 0 -1px 0 rgba(0,0,0,0.45)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.color = COLORS.textMuted;
                                                e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(190,198,220,0.10), inset 0 -1px 0 rgba(0,0,0,0.45)';
                                            }}
                                    >Try Again</button>
                                )}
                            </div>
                        </div>

                        {/* Strip Container.

                            Horizontal padding is zero on desktop: the band runs to
                            both screen edges, and padding would show as a gap at
                            the very edge of the viewport, which is the one thing an
                            edge-to-edge band cannot have.

                            The container is a *mount* now, not a frame. The canvas
                            inside draws its own machined edges — top hairline, floor
                            lip, per-slot seams, vignette — so the old frame's
                            border, inset shadows, edge-fade gradients and vignette
                            overlay only fought it: four layers of depth sitting on
                            top of the canvas, extinguishing the very edges it was
                            drawing. All of that is gone. The last survivor, the
                            dark bezel, went too: a rectangle drawn around a
                            rectangle is how the mount still read as a box — two
                            lines stacked 1px apart at top and bottom. So the
                            container now draws no line at all; the canvas's own
                            hairline and lip are the only edges, and the mount is
                            implied by the row's curved surface around them, this
                            drop shadow, and the fading rules above/below. The
                            container is transparent so the row's themed gradient
                            shows through the gaps — recursion, KOTW and result
                            tint the whole band, not just the box around it. */}
                        <div style={isMobile
                            // Full-bleed and flexing: the shaft's mount is the
                            // whole width and whatever height is left.
                            ? { padding: 0, flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column' }
                            : { padding: '8px 0 22px' }}>
                            <div style={isMobile
                                ? { position: 'relative', flex: '1 1 0', minHeight: 0 }
                                : { position: 'relative' }}>
                                {/* The street glow — THE NOCTURNE.

                                    Not a screen sheen: the wet street under the
                                    viaduct bleeding its amber station light up
                                    across the deck's face. The first version of
                                    this overlay was a diagonal streak — but a
                                    streak is a line, and lines are what made the
                                    old frame blocky; this one lives at the bottom
                                    of the band, where the street is, and swells
                                    from the curb rather than across the middle.
                                    Faint by design — never arguing with the
                                    detent ticks or the tile washes underneath —
                                    and static by design, so there is nothing to
                                    freeze under reduced motion. It is the only
                                    overlay left over the canvas; the old edge
                                    fades and vignette are gone because the canvas
                                    already draws its own vignette, and two depth
                                    systems on one screen is how the previous frame
                                    looked smeared.

                                    It lives at the strip container's level, not
                                    inside the reel mount, so the takeover modes
                                    stand on the same street: the bonus board and
                                    the 3x/5x lanes get the amber curb under them
                                    without each re-drawing it. */}
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                    background: 'radial-gradient(ellipse 76% 50% at 50% 84%, rgba(255,183,94,0.05) 0%, rgba(206,214,236,0.02) 40%, transparent 68%)',
                                    zIndex: 3,
                                    pointerEvents: 'none',
                                }} />

                                {isBonusMode ? (
                                    /* The bonus board — the departure board
                                        naming the next train. It replaces the
                                        reel in the same band: same mount, same
                                        row, the orange lamp on the console. The
                                        board has no canvas detent, so its
                                        platform line is a DOM hairline on both
                                        breakpoints (the reel's desktop detent is
                                        the canvas's own; the board is a different
                                        machine and says so). */
                                    <div style={{
                                        position: 'relative',
                                        // The board fills the shaft's space on a
                                        // phone, the way the reel it stands in for
                                        // does. It was a 90px strip — a sliver in a
                                        // column that is now ~640 — left over from
                                        // when the phone's reel was a small box.
                                        height: isMobile ? '100%' : `${STRIP_HEIGHT}px`,
                                        flex: isMobile ? '1 1 0' : undefined,
                                        minHeight: isMobile ? 0 : undefined,
                                        width: '100%',
                                        overflow: 'hidden',
                                        borderRadius: 0,
                                    }}>
                                        <CanvasBonusStrip
                                            events={bonusStrip}
                                            offsetRef={bonusOffsetRef}
                                            isMobile={isMobile}
                                            isSpinning={state === 'bonusWheel'}
                                            isResult={state === 'bonusResult'}
                                            // The landing index the strip was
                                            // built around, not a re-derivation
                                            // of it from the array's length.
                                            finalIndex={BONUS_FINAL_INDEX}
                                        />
                                        {/* The platform line, turned to match the
                                            board's travel: a vertical rule with
                                            arrows above and below when it runs
                                            across, a horizontal rule with arrows
                                            at the sides when it runs down. An
                                            indicator that points along the axis of
                                            motion instead of across it is pointing
                                            at a lane rather than at a slot. */}
                                        <div style={{
                                            position: 'absolute',
                                            ...(isMobile
                                                ? { left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', height: '2px' }
                                                : { top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '2px' }),
                                            background: COLORS.orange,
                                            zIndex: 10,
                                            boxShadow: `0 0 14px ${COLORS.orange}, 0 0 28px ${COLORS.orange}88`,
                                        }} />
                                        <div style={{
                                            position: 'absolute',
                                            width: 0, height: 0,
                                            ...(isMobile
                                                ? {
                                                    left: '-1px', top: '50%', transform: 'translateY(-50%)',
                                                    borderTop: '8px solid transparent', borderBottom: '8px solid transparent',
                                                    borderLeft: `12px solid ${COLORS.orange}`,
                                                }
                                                : {
                                                    top: '-1px', left: '50%', transform: 'translateX(-50%)',
                                                    borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
                                                    borderTop: `12px solid ${COLORS.orange}`,
                                                }),
                                            zIndex: 11,
                                            filter: `drop-shadow(0 0 6px ${COLORS.orange})`,
                                        }} />
                                        <div style={{
                                            position: 'absolute',
                                            width: 0, height: 0,
                                            ...(isMobile
                                                ? {
                                                    right: '-1px', top: '50%', transform: 'translateY(-50%)',
                                                    borderTop: '8px solid transparent', borderBottom: '8px solid transparent',
                                                    borderRight: `12px solid ${COLORS.orange}`,
                                                }
                                                : {
                                                    bottom: '-1px', left: '50%', transform: 'translateX(-50%)',
                                                    borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
                                                    borderBottom: `12px solid ${COLORS.orange}`,
                                                }),
                                            zIndex: 11,
                                            filter: `drop-shadow(0 0 6px ${COLORS.orange})`,
                                        }} />
                                    </div>
                                ) : isTripleMode ? (
                                    /* The 3x / 5x takeovers: parallel lanes, each
                                        a reel arriving at the platform line. The
                                        lanes share the band's row and the stage's
                                        readout below; see SpinLanes.jsx. */
                                    <SpinLanes
                                        laneCount={state === 'tripleLuckySpinning' || state === 'tripleLuckyResult' ? 3 : 5}
                                        isTripleLucky={state === 'tripleLuckySpinning' || state === 'tripleLuckyResult'}
                                        strips={tripleStrips}
                                        offsetRefs={tripleOffsetRefs}
                                        isSpinning={state === 'tripleSpinning' || state === 'tripleLuckySpinning'}
                                        isResult={state === 'tripleResult' || state === 'tripleLuckyResult'}
                                        isMobile={isMobile}
                                        accentColor={modeAccent || COLORS.gold}
                                        goldRushBoostedRarity={goldRushBoostedRarity}
                                    />
                                ) : (
                            <div
                                ref={reelMountRef}
                                onClick={() => {
                                    if (!isMobile || !user || allItems.length === 0) return;
                                    if (state === 'result' || state === 'recursion' || state === 'luckyResult' || state === 'tripleResult' || state === 'tripleLuckyResult') {
                                        respinRef.current?.();
                                    } else if (state === 'idle') {
                                        spinRef.current?.();
                                    }
                                }}
                                style={{
                                    position: 'relative',
                                    // The shaft takes the height the stage row can
                                    // give it and the full width of the viewport.
                                    // `100%` on both axes, with the row above
                                    // deciding how tall — a phone in landscape has
                                    // 390px of height to spend and a phone in
                                    // portrait has 844, and a fixed 260 served
                                    // neither.
                                    height: isMobile ? '100%' : `${STRIP_HEIGHT}px`,
                                    width: '100%',
                                    overflow: 'hidden',
                                    // No corners on either breakpoint now: the band
                                    // leaves the screen on both sides on desktop,
                                    // and the shaft does the same on a phone. A
                                    // radius at the viewport edge is a notch.
                                    borderRadius: 0,
                                    margin: 0,
                                    // The mount's shadow, falling onto the page
                                    // behind it. Everything else inset is gone —
                                    // depth inside the band is the canvas's job.
                                    boxShadow: '0 16px 36px -20px rgba(0,0,0,0.85)',
                                    cursor: isMobile && (state === 'idle' || state === 'result' || state === 'recursion') ? 'pointer' : 'default',
                                }}>

                                {/* Matrix scanlines overlay - Recursion only */}
                                {showSpinRecursionEffects && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0, left: 0, right: 0, bottom: 0,
                                        background: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${COLORS.recursion}08 2px, ${COLORS.recursion}08 4px)`,
                                        zIndex: 6,
                                        pointerEvents: 'none',
                                        animation: 'matrixFlicker 0.1s infinite',
                                    }} />
                                )}

                                {/* The DOM centre line and the triangle pointers
                                    are gone from BOTH breakpoints now.

                                    Desktop lost them when the canvas learned to
                                    draw a detent; the shaft kept them on the
                                    honest grounds recorded here at the time — "its
                                    geometry has not been reviewed on a real
                                    device". It has been now, and the verdict is the
                                    one desktop already reached: a 3px bar lying
                                    across the middle of the band is a bar painted
                                    over the item you are trying to look at, at the
                                    one moment the surface exists for, and with two
                                    triangles parked outside the edges it was three
                                    things all saying "here".

                                    The shaft draws its own detent instead — the
                                    same two machined marks and opening hairline,
                                    seated in the rails rather than in the hairline
                                    and the lip. See the indicator block in
                                    CanvasSpinningStrip.jsx. */}

                                {/* Pointer - Enhanced with heartbeat during slowdown */}
                                {showAnySpinLuckyEffects ? (
                                    <>
                                        {/* Top Bracket for lucky spins */}
                                        <div style={{
                                            position: 'absolute',
                                            ...(isMobile ? {
                                                left: '-6px', top: '50%', transform: 'translateY(-50%)',
                                            } : {
                                                top: '-6px', left: '50%', transform: 'translateX(-50%)',
                                            }),
                                            zIndex: 11,
                                            filter: showSpinRecursionEffects
                                                ? `drop-shadow(0 0 8px ${COLORS.recursion}) drop-shadow(0 0 16px ${COLORS.recursion}88)`
                                                : `drop-shadow(0 0 8px ${KOTW_GOLD}) drop-shadow(0 0 12px ${KOTW_CRIMSON}66)`,
                                            animation: state === 'spinning' && spinProgress > 0.7
                                                ? (isMobile ? 'indicatorHeartbeatMobile 0.4s ease-in-out infinite' : 'indicatorHeartbeat 0.4s ease-in-out infinite')
                                                : 'none',
                                        }}>
                                            <div style={{
                                                ...(isMobile ? {
                                                    width: '10px',
                                                    height: '24px',
                                                    borderTop: `3px solid ${showSpinRecursionEffects ? COLORS.recursion : KOTW_GOLD}`,
                                                    borderBottom: `3px solid ${showSpinRecursionEffects ? COLORS.recursion : KOTW_GOLD}`,
                                                    borderLeft: `3px solid ${showSpinRecursionEffects ? COLORS.recursion : KOTW_GOLD}`,
                                                    borderRight: 'none',
                                                    borderRadius: '4px 0 0 4px',
                                                } : {
                                                    width: '24px',
                                                    height: '10px',
                                                    borderLeft: `3px solid ${showSpinRecursionEffects ? COLORS.recursion : KOTW_GOLD}`,
                                                    borderRight: `3px solid ${showSpinRecursionEffects ? COLORS.recursion : KOTW_GOLD}`,
                                                    borderTop: `3px solid ${showSpinRecursionEffects ? COLORS.recursion : KOTW_GOLD}`,
                                                    borderBottom: 'none',
                                                    borderRadius: '4px 4px 0 0',
                                                }),
                                                background: showSpinRecursionEffects ? `${COLORS.recursion}11` : `${KOTW_GOLD}11`,
                                            }} />
                                        </div>
                                        {/* Bottom Bracket for lucky spins */}
                                        <div style={{
                                            position: 'absolute',
                                            ...(isMobile ? {
                                                right: '-6px', top: '50%', transform: 'translateY(-50%)',
                                            } : {
                                                bottom: '-6px', left: '50%', transform: 'translateX(-50%)',
                                            }),
                                            zIndex: 11,
                                            filter: showSpinRecursionEffects
                                                ? `drop-shadow(0 0 8px ${COLORS.recursion}) drop-shadow(0 0 16px ${COLORS.recursion}88)`
                                                : `drop-shadow(0 0 8px ${KOTW_GOLD}) drop-shadow(0 0 12px ${KOTW_CRIMSON}66)`,
                                            animation: state === 'spinning' && spinProgress > 0.7
                                                ? (isMobile ? 'indicatorHeartbeatMobile 0.4s ease-in-out infinite' : 'indicatorHeartbeat 0.4s ease-in-out infinite')
                                                : 'none',
                                        }}>
                                            <div style={{
                                                ...(isMobile ? {
                                                    width: '10px',
                                                    height: '24px',
                                                    borderTop: `3px solid ${showSpinRecursionEffects ? COLORS.recursion : KOTW_GOLD}`,
                                                    borderBottom: `3px solid ${showSpinRecursionEffects ? COLORS.recursion : KOTW_GOLD}`,
                                                    borderRight: `3px solid ${showSpinRecursionEffects ? COLORS.recursion : KOTW_GOLD}`,
                                                    borderLeft: 'none',
                                                    borderRadius: '0 4px 4px 0',
                                                } : {
                                                    width: '24px',
                                                    height: '10px',
                                                    borderLeft: `3px solid ${showSpinRecursionEffects ? COLORS.recursion : KOTW_GOLD}`,
                                                    borderRight: `3px solid ${showSpinRecursionEffects ? COLORS.recursion : KOTW_GOLD}`,
                                                    borderBottom: `3px solid ${showSpinRecursionEffects ? COLORS.recursion : KOTW_GOLD}`,
                                                    borderTop: 'none',
                                                    borderRadius: '0 0 4px 4px',
                                                }),
                                                background: showSpinRecursionEffects ? `${COLORS.recursion}11` : `${KOTW_GOLD}11`,
                                            }} />
                                        </div>
                                    </>
                                ) : null}
                                {/* The phone's triangle pointers used to live here.
                                    They are gone with the centre line above and for
                                    the same reason — an arrow parked outside the
                                    shaft's edges is a second indicator arguing with
                                    the detent seated inside them. Lucky spins keep
                                    their brackets on both breakpoints, because
                                    those are a mode signal rather than a pointer. */}

                                {/* Result Shockwave Effect */}
                                {state === 'result' && (
                                    <>
                                        <div style={{
                                            position: 'absolute',
                                            top: '50%', left: '50%',
                                            width: isMobile ? '100px' : '60px',
                                            height: isMobile ? '100px' : '60px',
                                            border: `2px solid ${showSpinRecursionEffects ? COLORS.recursion : showSpinKotwLuckyEffects ? KOTW_GOLD : COLORS.gold}`,
                                            borderRadius: '50%',
                                            animation: 'resultShockwaveRing 0.6s ease-out forwards',
                                            pointerEvents: 'none',
                                            zIndex: 8,
                                        }} />
                                        <div style={{
                                            position: 'absolute',
                                            top: '50%', left: '50%',
                                            width: isMobile ? '100px' : '60px',
                                            height: isMobile ? '100px' : '60px',
                                            border: `2px solid ${showSpinRecursionEffects ? COLORS.recursion : showSpinKotwLuckyEffects ? KOTW_GOLD : COLORS.gold}66`,
                                            borderRadius: '50%',
                                            animation: 'resultShockwaveRing 0.6s ease-out 0.1s forwards',
                                            pointerEvents: 'none',
                                            zIndex: 8,
                                        }} />
                                    </>
                                )}

                                <CanvasSpinningStrip
                                    items={state === 'idle' ? dormantStrip : strip}
                                    // The dormant reel is a cylinder; the spin strip
                                    // is a finite sequence with a winning slot in it.
                                    loop={state === 'idle'}
                                    offsetRef={canvasOffsetRef}
                                    isMobile={isMobile}
                                    isSpinning={state === 'spinning' || state === 'luckySpinning'}
                                    isResult={state === 'result' || state === 'event' || state === 'luckyResult'}
                                    spinProgress={spinProgress}
                                    isRecursion={showSpinRecursionEffects}
                                    themeType={showSpinKotwLuckyEffects ? 'kotw' : null}
                                    accentColor={showSpinKotwLuckyEffects ? KOTW_GOLD : isLuckyMode ? COLORS.green : eventAccent || null}
                                    // Neither axis is fixed on a phone any more:
                                    // the shaft fills its mount and the canvas
                                    // measures its own box, the way the desktop
                                    // band already did for width.
                                    stripWidth={undefined}
                                    stripHeight={isMobile ? undefined : STRIP_HEIGHT}
                                    finalIndex={FINAL_INDEX}
                                    goldRushBoostedRarity={goldRushBoostedRarity}
                                    isLuckySpin={showAnySpinLuckyEffects || isLuckyMode}
                                />

                                {/* The phone's payoff, drawn over the row it
                                    landed on. See ShaftResult.jsx for why there is
                                    no panel below the reel any more.

                                    The row's `top` is the canvas's own formula —
                                    `stripCentre + finalIndex × pitch − offset` —
                                    and not the shaft's midpoint, because the spin
                                    deliberately rests up to 45% of a pitch off
                                    centre. Pinning this to the middle would float
                                    the words away from their own sprite by up to
                                    58px. Reading `canvasOffsetRef` during render is
                                    safe here and only here: the offset is finished
                                    moving by the time this state exists. */}
                                {/* The idle caption, floated over the shaft's own
                                    bottom vignette rather than given a row of its
                                    own. That vignette is already the darkest part
                                    of the reel — rows arrive out of it and leave
                                    into it — so it is the one place on the surface
                                    where text can sit over the reel and still be
                                    the most legible thing in its area. Costs no
                                    layout, which is the point: the reel now runs
                                    to the bottom bar. */}
                                {isMobile && state === 'idle' && (
                                    <div style={{
                                        position: 'absolute',
                                        left: 0, right: 0, bottom: 0,
                                        paddingBottom: `${SPACE.md}px`,
                                        textAlign: 'center',
                                        pointerEvents: 'none',
                                        zIndex: 12,
                                    }}>
                                        <div style={{
                                            color: COLORS.gold,
                                            fontSize: '15px',
                                            fontWeight: 700,
                                            textShadow: `0 0 20px ${COLORS.gold}44, 0 2px 8px rgba(0,0,0,0.9)`,
                                        }}>
                                            {!user ? 'Login to spin!'
                                                : allItems.length === 0 ? 'Fetching item pool...'
                                                    : 'Tap the reel to spin'}
                                        </div>
                                        <div style={{
                                            fontSize: '11px',
                                            color: COLORS.textMuted,
                                            marginTop: '2px',
                                            textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                                        }}>
                                            Win one of {totalItemCount.toLocaleString('en-US')} items
                                        </div>
                                    </div>
                                )}

                                {isMobile && (state === 'result' || state === 'luckyResult')
                                    && (state === 'result' ? result : luckyResult) && shaftHeight > 0 && (
                                    <ShaftResult
                                        result={state === 'result' ? result : luckyResult}
                                        isNewItem={state === 'result' ? isNewItem : isLuckyNew}
                                        prestigePull={prestigePull}
                                        collection={collection}
                                        // The landed row's centre. The row's top is
                                        // the canvas's own formula — `stripCentre +
                                        // finalIndex × pitch − offset` — and not the
                                        // shaft's midpoint, because the spin
                                        // deliberately rests up to 45% of a pitch
                                        // off centre; expanding around the midpoint
                                        // would open the panel off its own tile.
                                        centerY={(shaftHeight / 2 - MOBILE_ROW_PITCH / 2)
                                            + FINAL_INDEX * MOBILE_ROW_PITCH
                                            - canvasOffsetRef.current
                                            + MOBILE_ROW_PITCH / 2}
                                    />
                                )}
                            </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* ── Row 3: the stage ─────────────────────────────────── */}
                    <div style={{
                        gridRow: 5,
                        gridColumn: stageColumn,
                        minHeight: 0,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        // `flex-start`, not `center`. A centred flex column that
                        // overflows its box overflows in BOTH directions, and the
                        // part above the top edge cannot be scrolled to — the
                        // scroll range only covers the bottom. On a short viewport
                        // that silently ate the top of the idle wheel. Top-aligned,
                        // any overflow goes downward where the scrollbar can reach
                        // it, and the result still reads as sitting under the reel
                        // because that is where it starts.
                        justifyContent: 'flex-start',
                        paddingTop: `${SPACE.md}px`,
                        zIndex: Z.content,
                        // On a phone the stage is a fixed-height apron under the
                        // shaft rather than the page's leftover space: the shaft
                        // is the star and takes the slack, and the stage gets
                        // exactly what the payoff needs. Fixed rather than
                        // content-sized, so the shaft does not lurch between idle
                        // and result — the no-collapse rule, applied to the axis a
                        // phone actually has to spend.
                        //
                        // **200, and it is measured rather than picked.** It was
                        // 266 on a guess, and the guess cost the shaft two rows:
                        // on a 390×800 phone the surface's column is 536px, so a
                        // 266px apron plus the 44px status console left the shaft
                        // 226 — under two rows at a 128px pitch, which rendered as
                        // a dark panel with one item in it. What the apron
                        // actually holds is the spin card at 110×147 plus its
                        // caption (~190px) at idle, and SpinResult's tier line,
                        // 92px item, name and rate (~210px) at the payoff. 200
                        // covers both with the name free to wrap to two lines, and
                        // hands the shaft back 66px.
                        // **The apron is the idle text and nothing else.**
                        //
                        // It ran 266 -> 200 -> 136 while it still had to hold the
                        // payoff, and every one of those was a compromise between
                        // two states: ~63px of idle copy against a ~208px result
                        // panel. Sizing for the payoff wasted 145px of shaft for
                        // the 99% of the time nothing has landed; sizing for the
                        // idle overflowed the moment one did; sizing per state
                        // moved the reel at the exact moment the player is
                        // watching it.
                        //
                        // The tension is gone rather than balanced: the phone's
                        // result is drawn on the winning row now (ShaftResult), so
                        // the apron only ever holds the idle caption and the "Tap
                        // the reel to spin" line. 88px covers those with air.
                        //
                        // The takeovers are the exception and keep a taller apron:
                        // the bonus plaque, the lucky panel and the lane readout
                        // still answer down here, and they change at the same
                        // moment the band swaps its own content — so that row
                        // change happens between modes, never mid-spin.
                        //
                        // **Zero for the normal and lucky modes.** With the payoff
                        // drawn in the shaft there is nothing left down here but
                        // the idle caption, and reserving 88px permanently to hold
                        // two lines of text that vanish the moment you spin is the
                        // same trade this row has already lost three times.
                        //
                        // The caption moves into the shaft's own bottom fade
                        // instead (see the idle overlay in the reel), so the reel
                        // runs to the bottom bar in every state. Deliberately NOT
                        // a height that changes between idle and spinning: that
                        // would resize the canvas at the moment of the press and
                        // jump the reel. One height, always, and it is nothing.
                        //
                        // The takeovers keep their apron: the bonus plaque and the
                        // lane readout still answer down here, and that row change
                        // happens when the band swaps its own content, never
                        // mid-spin.
                        ...(isMobile
                            ? {
                                flex: '0 0 auto',
                                height: isBonusMode || isTripleMode ? '236px' : '0px',
                                paddingLeft: `${SPACE.md}px`,
                                paddingRight: `${SPACE.md}px`,
                                paddingTop: `${SPACE.sm}px`,
                            }
                            : null),
                        // The box the result flanks pin themselves to. They are
                        // absolute so that having or not having data cannot shift
                        // the result panel, which has to stay exactly under the
                        // reel for the winning column to read as continuing into
                        // it. See ResultFlanks.jsx.
                        position: 'relative',
                    }}>
                        {/* Idle — the spin CTA lives in the stage now.

                            It used to be the whole page while idle: a 240px wheel
                            with orbital rings, sitting where the reel now is. In
                            the HUD the reel owns that row permanently, so the tarot
                            card becomes what it always functionally was — the spin
                            button — and moves down here with its CTA, rarity legend
                            and keyboard hint. */}
                        {/* Idle only. This briefly stayed mounted through the spin
                            as well, to stop the stage row emptying — a measured
                            314px hole that it did close. It was still the wrong
                            answer: it parked a dead, greyed-out control at the
                            loudest moment on the surface, and closing a gap in a
                            layout metric is not a reason to put something in front
                            of someone. The hole is back and is a known open
                            question; the reel is what should fill it. */}
                        {/* The phone's idle copy is drawn over the shaft's bottom
                            fade instead — see the reel — so this stays desktop's. */}
                        {!isMobile && state === 'idle' && (
                            <EnhancedWheelIdleState
                                user={user}
                                allItems={allItems}
                                totalItemCount={totalItemCount}
                                recursionActive={recursionActive}
                                recursionSpinsRemaining={recursionSpinsRemaining}
                                kotwLuckySpins={kotwLuckySpins}
                                error={error}
                                onSpin={spin}
                                isMobile={isMobile}
                                isLoading={!atlasReady}
                                isSpinning={state === 'spinning'}
                            />
                        )}

                        {/* The result panel lives in its own component now.

                            It was ~350 lines inline here, including six
                            hand-written rarity badges that each re-specified their
                            own gradient, padding and text colour — the exact
                            duplication the shared rarity ladder exists to prevent,
                            and it had already drifted. SpinResult reads every tier
                            from RARITY instead. */}
                        {/* Desktop only. On a phone the winning row carries the
                            answer itself (ShaftResult, up in the reel), which is
                            what lets the apron below shrink to the idle text and
                            hand the difference to the shaft. */}
                        {!isMobile && state === 'result' && result && (
                            <>
                                <SpinResult
                                    result={result}
                                    isNewItem={isNewItem}
                                    prestigePull={prestigePull}
                                    collection={collection}
                                    resultWasRecursionSpin={resultWasRecursionSpin}
                                    resultWasKotwLuckySpin={resultWasKotwLuckySpin}
                                    isMobile={isMobile}
                                />
                            </>
                        )}

                        {/* The takeover results — every mode answers on the same
                            stage the normal spin does, in the same register:
                            the bonus board's choice as a signboard, the lucky
                            spin as the payoff panel wearing the green lamp, and
                            the lanes' winners as the per-lane readout. All of
                            them used to render inside their own takeover cards;
                            the cards are gone, the stage is one. */}
                        {state === 'bonusResult' && selectedEvent && (
                            <BonusEventPlaque
                                event={selectedEvent}
                                isMobile={isMobile}
                            />
                        )}
                        {/* Recursion answers here too, and on both breakpoints.

                            It was the last card on this surface — a 20px-radius
                            box with its own glow ring, corner accents, matrix
                            scanlines, a glitching monospace headline and a
                            spinning wheel icon, rendered *instead of* the band
                            and the console. Everything the takeover redesign
                            moved out of cards a day earlier, still standing.

                            Three things were wrong with it and only one was
                            visual. It replaced the reel, so the pull that
                            triggered recursion was never shown — the one moment
                            the surface exists for, hidden by the announcement
                            about it. It broke the No-Collapse Rule outright, the
                            band's whole row vanishing for the duration. And it
                            took the status row with it, which is what stranded
                            the player: see the note on the row gate above.

                            Now it is what every other takeover is — a theme of
                            the band (recursion's own ground and green lamp, all
                            of which the row already knew how to draw) plus one
                            signboard on the stage. The reel keeps the item that
                            was pulled, lit under the console's RECURSION! flash,
                            and the plaque says what it bought. Unlike the item
                            results this renders on the phone as well, because it
                            is an announcement rather than a prize: there is no
                            in-shaft answer for it to duplicate. */}
                        {state === 'recursion' && (
                            <BonusEventPlaque
                                event={RECURSION_ANNOUNCEMENT}
                                isMobile={isMobile}
                            />
                        )}
                        {/* Desktop only — the phone's lucky spin lands in the
                            shaft like an ordinary one. It shares the reel, so it
                            should share the payoff; a panel below the reel for
                            this mode and an in-place result for the normal one
                            would be two answers to one question. */}
                        {!isMobile && state === 'luckyResult' && luckyResult && (
                            <LuckyResultPanel
                                result={luckyResult}
                                isNewItem={isLuckyNew}
                                prestigePull={prestigePull}
                                collection={collection}
                                isMobile={isMobile}
                            />
                        )}
                        {(state === 'tripleResult' || state === 'tripleLuckyResult') && (
                            <LaneResultsRow
                                items={tripleResults}
                                isTripleLucky={state === 'tripleLuckyResult'}
                                isNew={tripleNewItems}
                                isMobile={isMobile}
                                // The readout lays itself out on the lanes' own
                                // grid, so it has to be told how many there are.
                                laneCount={state === 'tripleLuckyResult' ? 3 : 5}
                            />
                        )}

                        {/* The stage flanks: your collection on the left, the
                            standings on the right.

                            Outside the `state === 'result'` branch on purpose. They
                            are the page's way into the collection book and the
                            leaderboard, and a shortcut that only exists in the
                            seconds after a spin is not a shortcut. Only the one
                            result line inside the left panel comes and goes.

                            The lane takeovers are the exception, and it is a
                            collision rather than a change of heart. The flanks
                            are absolutely positioned 272px panels inset
                            `clamp(20px, 5vw, 96px)` from the stage's edges, and
                            the 3x/5x readout is now laid out on the lanes' own
                            full-width grid — at 1920 the first track's answer is
                            centred at about x=190, which is inside the left
                            panel. Something had to give, and it is not the
                            alignment: an answer that does not sit under its own
                            track is the whole defect this row was rebuilt to
                            fix. They are hidden across all four lane states
                            rather than only at the result, so nothing appears or
                            vanishes in the middle of the moment. The shortcut
                            still exists at idle, through a normal spin, and at a
                            normal result, which is where a player spends almost
                            all of their time.

                            `hasFlanks` is the other gate and it is a measurement,
                            not a device guess: two 272px panels, two
                            `clamp(20px, 5vw, 96px)` insets and a worst-case 420px
                            result need about 1156px before anything touches, so
                            they appear at 1200 and not before. Below that the
                            desktop layout is correct and simply has no flanks —
                            they are absolutely positioned and nothing else
                            depends on them. This is what used to break: they were
                            gated on `!isMobile` against a 600px threshold, so at
                            760px both panels rendered on top of the spin control.
                            On a phone their job moves to the bottom bar, where
                            they stop being readouts and become destinations. */}
                        {hasFlanks && !isTripleMode && <StageFlanks
                            showResultLine={state === 'result' && !!result}
                            isNewItem={isNewItem}
                            // `collection` is a map of texture -> count, not a
                            // list, so the number of distinct items owned is its
                            // key count and the count of this one is a lookup.
                            // Reading it as an array gives `undefined` and a
                            // silently empty panel.
                            owned={result ? (collection?.[result.texture] ?? 0) : 0}
                            collectedCount={Object.keys(collection || {}).length}
                            // `totalItemCount`, not `allItems.length`. `allItems`
                            // is the common pool alone; the special tiers live in
                            // `dynamicItems`, so a collection containing any of
                            // them counts higher than the denominator and the
                            // meter reads past full — it rendered "1,557 / 1,531".
                            // This is the same total the idle card shows, which is
                            // also the only way the two agree.
                            poolSize={totalItemCount}
                            tierInk={result ? getRarityInk(getItemRarity(result)) : COLORS.text}
                            userId={user?.id}
                            isMobile={isMobile}
                            onOpenCollection={onOpenCollection}
                            onOpenLeaderboard={onOpenLeaderboard}
                        />}
                    </div>

        </div>
    );
}

// Memoize to prevent unnecessary re-renders
// Animation uses direct DOM manipulation so collection changes won't cause stutter
//
// This comparator is an allow-list, so a prop missing from it is silently frozen
// at its first value. `stageColumn` was exactly that bug: when the viewport
// crossed 1400px the page switched to a single-column grid and passed
// stageColumn 1, but this comparator saw no change it cared about, skipped the
// re-render, and the stage kept asking for column 2. Grid obliged by creating an
// implicit second column, so the narrow layout came out as two columns with the
// content crushed into a 291px strip. Add new props here when you add them.
export const WheelSpinner = memo(WheelSpinnerComponent, (prevProps, nextProps) => {
    // Return true if props are equal (skip re-render)
    // Return false if props are different (re-render)
    return (
        prevProps.stageColumn === nextProps.stageColumn &&
        prevProps.user?.id === nextProps.user?.id &&
        prevProps.allItems === nextProps.allItems &&
        prevProps.dynamicItems === nextProps.dynamicItems &&
        prevProps.onSpinComplete === nextProps.onSpinComplete &&
        prevProps.collection === nextProps.collection &&
        prevProps.kotwLuckySpins === nextProps.kotwLuckySpins &&
        prevProps.kotwLuckySpinsRef === nextProps.kotwLuckySpinsRef &&
        prevProps.onKotwLuckySpinsUpdate === nextProps.onKotwLuckySpinsUpdate
    );
});
