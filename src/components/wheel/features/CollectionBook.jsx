/*
 * ═══════════════════════════════════════════════════════════════════════════
 * THE CONCOURSE — the collection board
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * DIRECTION CONTRACT (impeccable, surface seed b46e1386, assigned structure 5 of
 * 5 — "the station board" — fused with the dealt challenger
 * `signals-instruments-split-flap-concourse`). Recorded here rather than as an
 * HTML comment in the built markup because this repo's precedent is the header
 * comment — WheelSpinner.jsx carries THE NOCTURNE's contract exactly this way,
 * and DESIGN.md §8 quotes it from here.
 *
 * THESIS: the collection is a departure board, not a card full of tiles. THE
 * NOCTURNE already says the reel is "a main transit line arriving at its stop,
 * and everything around it is the city it moves through" — the collection book
 * is the one building in that city that was never built. It refuses the category
 * default this surface shipped for a year: a rounded modal, a thin progress bar,
 * an accordion hiding the numbers, and 1,559 neon-bordered tiles all shouting at
 * the same volume.
 *
 * OWN-WORLD: the deck's blue-hour ramp under SURFACE_NOISE, edges made of rail
 * light instead of borders, station amber as the one signal colour, Barlow
 * Condensed in caps on split-flap drums, and the seven locked tier hues. No
 * radius anywhere, no border anywhere, no card anywhere.
 *
 * STORY: the player reads the board top to bottom — what they hold, then which
 * tier is finished and which is overdue, then the platform of items themselves —
 * and leaves knowing the one number the old book never told them: how long they
 * have been waiting.
 *
 * FIRST VIEWPORT: the head's six figures on flap drums over the full-width
 * platform line; the register directly beneath it, one ruled row per tier,
 * rarest first, each row a door into the platform below.
 *
 * FORM: the station board (candidate 5 of 5 on the grounded list), seed
 * b46e1386, challenger fused for its grammar only — the identity stays THE
 * NOCTURNE's, which is what the seed's own rules require.
 *
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the
 * finish review, the verdict, and DESIGN.md.
 *
 * ── THE TWO TIERS ────────────────────────────────────────────────────────────
 *
 * The owner's call, and it is the same split /stats already makes for
 * achievements in DESIGN.md §7: the case and the chase are different questions
 * and get different furniture. Here the register IS the chase — held, missing,
 * how long since, and whether the wait has run past its own expectation — and
 * the platform below it is the case. One surface, two registers, no tab.
 *
 * ── THE ONE CLAIM THIS BOARD MAKES ───────────────────────────────────────────
 *
 * A row lamp goes amber when a tier is OVERDUE, and that word is doing real
 * work, so it is computed rather than felt. Every special item carries its own
 * drop chance; summed across a tier that is the tier's chance per spin, and its
 * reciprocal is how many spins a pull from it costs on average. When the dry
 * streak has passed that number, the tier is overdue — counted, never asserted,
 * with both numbers in the row's title so the reader can check the arithmetic.
 * Insane is deliberately exempt: one item at 0.000001% means the expectation is
 * larger than anyone's lifetime spin count, so the board says nothing at all
 * rather than lighting a lamp that can never go out.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { IMAGE_BASE_URL, INSANE_ITEMS, MYTHIC_ITEMS, TEAM_MEMBERS, EXOTIC_ITEMS, RARE_MEMBERS, API_BASE_URL } from '../../../config/constants.js';
import { COLORS, DECK, rail, SURFACE_NOISE } from '../config/constants';
import { formatChance, getItemImageUrl } from '../../../utils/helpers.js';
import { RARITY, getRarityColor, getRarityInk, getRarityOrder } from '../../../utils/rarityHelpers.jsx';
import { X, Search, Sparkles, Coins, Crown } from 'lucide-react';
import { CanvasCollectionGrid } from '../canvas/CanvasCollectionGrid.jsx';
import { FlapText, BoardLabel, RowLamp, BoardMeter, Plinth } from './collection/FlapBoard.jsx';
import { prestigeLabel, prestigeName, prestigeColor, prestigeInk, prestigeIcon, isIridescentPrestige, MAX_PRESTIGE_LEVEL } from '../../../utils/prestigeHelpers.js';
import { PrestigeAscension } from './collection/PrestigeAscension.jsx';
import { useWheelViewport } from '../config/breakpoints.js';

/* The board's register order. Common is on the board too, which the old tier
   strip left off entirely — it is 1,536 of 1,559 items, so a register that
   skipped it was describing 1.5% of the collection. */
const REGISTER_ORDER = ['insane', 'mythic', 'legendary', 'exotic', 'rare', 'common'];

/* A prestige level is worn as a numeral, not a digit: "II" reads as a rank where
   "2" reads as a quantity, and the badge sits beside counts that are quantities. */
const ROMAN = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };

/* One frozen empty object, so "no prestige data yet" has a stable identity and
   does not invalidate a memo simply by being absent. */
const EMPTY = Object.freeze({});

/* The tiers that count as a special pull. Spelled out rather than derived as
   "everything that is not common", because the pool's items reach this file
   under two different names depending on where they were read from — 'regular'
   from the wheel's own tables, 'common' from the roster this board assembles. */
const SPECIAL_TYPES = new Set(['insane', 'mythic', 'legendary', 'exotic', 'rare']);

/* Tiers with no dry streak to show. Insane is the decision the old book recorded
   and it is still right: one item at 0.000001% makes the streak every player's
   entire spin count, which tells nobody anything. Common is here for the duller
   reason that the backend tracks no streak for it, and it would say nothing if
   it did — most spins are a common. */
const NO_STREAK = new Set(['insane', 'common']);

function fmt(n) {
    return typeof n === 'number' && isFinite(n) ? n.toLocaleString('en-US') : '0';
}

function fmtDate(dateStr, withTime = false) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    const date = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).toUpperCase();
    if (!withTime) return date;
    return `${date} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}

/* ═════════════════════════════════════════════════════════════════════════════
 * THE PLAQUE — one item, opened
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * The old detail view was a 16px-radius card with a radial tint behind the
 * sprite and two boxed stat cells. This is the same information as a board
 * plaque: the item stands on a lit plinth with its own tier light rising from
 * the floor — the reel's grammar at a single slot — and its facts sit under it
 * in the register's own ruled columns.
 */
function ItemPlaque({ item, details, onClose }) {
    const collected = details && details.count > 0;
    const tone = getRarityColor(item.type);
    const ink = getRarityInk(item.type);
    const isSpecial = item.type && item.type !== 'common';
    const label = (RARITY[item.type] || RARITY.common).label;
    const imageUrl = getItemImageUrl(item);

    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [onClose]);

    const facts = [
        { label: 'Copies held', value: collected ? String(details.count) : '0', tone: collected ? DECK.ink : DECK.inkDim },
        { label: 'Drop rate', value: item.chance ? `${formatChance(item.chance)}%` : '—', tone: isSpecial ? ink : DECK.inkMid },
        { label: 'First pull', value: collected ? (fmtDate(details?.firstObtained, true) || '—') : '—', tone: DECK.inkMid },
    ];

    return (
        <div
            onClick={e => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-label={`${item.name} details`}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1100, padding: '20px', animation: 'fadeIn 0.2s ease-out',
            }}
        >
            <div style={{
                width: '100%', maxWidth: '380px',
                backgroundImage: DECK.face,
                boxShadow: `inset 0 1px 0 ${rail(0.12)}, 0 24px 60px rgba(0,0,0,0.6)`,
                animation: 'slideUp 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
            }}>
                {/* The item on its plinth. The light is the tier — a wash rising
                    from the floor line the sprite stands on, exactly as the reel
                    draws a slot, so an item met in the strip and an item met here
                    are lit by the same lamp. A common gets no light at all. */}
                <div style={{
                    position: 'relative', height: '162px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                }}>
                    {isSpecial && collected && (
                        <>
                            {/* A radial rather than a linear wash, and for the
                                same reason the platform's cells draw theirs as
                                nested widths: a gradient that runs along one axis
                                only ends in two hard vertical edges, which is a
                                rectangle in the tier's colour. The radial has both
                                axes for free, so the light falls off toward the
                                plaque's sides the way it falls off toward its
                                ceiling. */}
                            <div aria-hidden="true" style={{
                                position: 'absolute', inset: 0,
                                background: `radial-gradient(ellipse 58% 78% at 50% 100%, ${tone}5E 0%, ${tone}1C 46%, ${tone}00 78%)`,
                            }} />
                            {/* The emitter, at the width of the light it throws —
                                never the full plaque, which would be the bottom
                                edge of a box. */}
                            <div aria-hidden="true" style={{
                                position: 'absolute', left: '22%', right: '22%', bottom: 0, height: '2px',
                                background: tone, boxShadow: `0 0 16px ${tone}`,
                            }} />
                        </>
                    )}
                    <img
                        src={imageUrl}
                        alt=""
                        style={{
                            position: 'relative', width: '84px', height: '84px',
                            imageRendering: item.username ? 'auto' : 'pixelated',
                            opacity: collected ? 1 : 0.22,
                            filter: collected ? 'none' : 'grayscale(100%)',
                        }}
                        onError={e => { e.target.onerror = null; e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                    />
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="fib-board-hit"
                        style={{
                            position: 'absolute', top: 0, right: 0, width: '34px', height: '34px',
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: DECK.inkDim, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    ><X size={15} /></button>
                </div>

                <div style={{ padding: '14px 18px 18px', boxShadow: `inset 0 1px 0 ${rail(0.07)}` }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '2px' }}>
                        <FlapText
                            text={item.name}
                            size={16}
                            tone={collected ? DECK.ink : DECK.inkDim}
                            weight={700}
                            style={{ minWidth: 0, overflow: 'hidden' }}
                        />
                    </div>
                    <BoardLabel tone={isSpecial ? ink : DECK.inkDim}>
                        {label}{!collected && ' — not collected'}
                    </BoardLabel>

                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                        marginTop: '16px',
                    }}>
                        {facts.map((f, i) => (
                            <div key={f.label} style={{
                                padding: '0 12px',
                                // Cells are divided by a rule, never boxed — the
                                // same decision the stats module's record block
                                // makes for the same reason.
                                boxShadow: i > 0 ? `inset 1px 0 0 ${rail(0.07)}` : undefined,
                                ...(i === 0 ? { paddingLeft: 0 } : null),
                            }}>
                                <FlapText text={f.value} size={16} tone={f.tone} digits={false} />
                                <div style={{ marginTop: '5px' }}>
                                    <BoardLabel>{f.label}</BoardLabel>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* How it arrived. Two lamps rather than two chips: this is
                        the board's own vocabulary for "something about this row
                        is special", and a pill with a tinted fill would be the
                        one boxed object on the surface. */}
                    {collected && (details?.isLucky || details?.is_lucky === 1 || details?.isGoldRush || details?.is_gold_rush === 1) && (
                        <div style={{ display: 'flex', gap: '16px', marginTop: '16px', paddingTop: '12px', boxShadow: `inset 0 1px 0 ${rail(0.07)}` }}>
                            {(details?.isLucky || details?.is_lucky === 1) && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.green }}>
                                    <Sparkles size={12} />
                                    <BoardLabel tone={COLORS.green}>Lucky spin</BoardLabel>
                                </span>
                            )}
                            {(details?.isGoldRush || details?.is_gold_rush === 1) && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: DECK.amber }}>
                                    <Coins size={12} />
                                    <BoardLabel tone={DECK.amber}>Gold rush</BoardLabel>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ═════════════════════════════════════════════════════════════════════════════
 * THE BOARD
 * ═════════════════════════════════════════════════════════════════════════════ */

export function CollectionBook({ collection, collectionDetails, stats, dryStreaks: dryStreaksProp, allItems, dynamicItems, onClose, viewingUser, viewingUserId }) {
    const [tierFilter, setTierFilter] = useState(null);
    const [have, setHave] = useState('all');
    const [sort, setSort] = useState('rarity');
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    // What the pointer or the caret is currently over on the platform. The canvas
    // only calls up when the index actually changes, so this is a handful of
    // renders per sweep rather than one per mousemove.
    const [readout, setReadout] = useState(null);

    /*
     * PRESTIGE
     *
     * `scope` is which collection the register and the platform are reading — the
     * main one, or a prestige run. It is a lens over the same board and not a
     * second board: the head, the register's shape, the platform's cells and
     * every control are identical, and only the numbers underneath them change.
     * That is the whole reason prestige could be added to this surface without
     * designing another one.
     */
    const [prestige, setPrestige] = useState(null);
    const [scope, setScope] = useState('main');
    const [prestigeData, setPrestigeData] = useState(null);
    const [viewLevel, setViewLevel] = useState(null);
    // The level currently detonating, or null. Named for what it is rather than
    // for the animation, because the board's own state is what it gates: the
    // register behind the overlay is already the new one.
    const [ascending, setAscending] = useState(null);
    const [starting, setStarting] = useState(false);
    // `null` until the fetch answers, and `null` again if it fails. The initial
    // value used to be a row of zeros, which is the single most optimistic thing
    // a dry-streak column can say: a failed request rendered "you just pulled
    // one" for every tier, and no tier could ever be overdue.
    const [ownDryStreaks, setOwnDryStreaks] = useState(null);
    const { isPhone } = useWheelViewport();
    const platformRef = useRef(null);
    const [platformHeight, setPlatformHeight] = useState(360);

    /*
     * The lens.
     *
     * Everything below reads `activeCollection` rather than `collection`, so the
     * register, the platform, the head's figures, the search and the sort all
     * work on whichever collection is in view without knowing which one it is.
     * A prestige run is the same board reading a different table.
     */
    const prestigeView = scope === 'prestige';
    // Memoised, and not for tidiness: the `|| {}` fallback mints a new object on
    // every render, and three memos below key off these — the register, the
    // totals, and the sort over 1,559 items. Without this the board re-sorts its
    // whole platform on every keystroke in the search field.
    const activeCollection = useMemo(
        () => (prestigeView ? (prestigeData?.collection || EMPTY) : collection),
        [prestigeView, prestigeData, collection],
    );
    const activeDetails = useMemo(
        () => (prestigeView ? (prestigeData?.collectionDetails || EMPTY) : collectionDetails),
        [prestigeView, prestigeData, collectionDetails],
    );

    // When viewing someone else, their streaks arrive as a prop alongside the rest of
    // their profile - /api/dry-streaks only answers for the logged-in user, so this
    // used to leave the whole row sitting at zero for other people's collections.
    //
    // And when the prop is absent on someone else's board, the answer is *nothing*,
    // not zero. The fetch below is correctly skipped for another player, so the
    // fallback would have handed them this component's initial state — a row of
    // zeros, which on a dry-streak column reads as "they just pulled one" rather
    // than as "we were not told". A wrong number is worse than a dash.
    const dryStreaks = dryStreaksProp || (viewingUser ? null : ownDryStreaks);

    useEffect(() => {
        // Never fetch when looking at someone else - /api/dry-streaks answers for the
        // session, so it would quietly show the viewer's own streaks on another
        // player's collection.
        if (viewingUser || dryStreaksProp) return;

        async function fetchDryStreaks() {
            try {
                const res = await fetch(`${API_BASE_URL}/api/dry-streaks`, { credentials: 'include' });
                if (res.ok) setOwnDryStreaks(await res.json());
            } catch (err) {
                // Left null on purpose: the register prints an absence as a dash.
                console.error('Failed to fetch dry streaks:', err);
            }
        }
        fetchDryStreaks();
    }, [viewingUser, dryStreaksProp]);

    /*
     * Prestige state, for whichever player's board this is.
     *
     * A board that cannot read prestige is a board without the lens, not a broken
     * one: every prestige control is gated on this state existing, so the failure
     * mode is the surface exactly as it was before the feature.
     */
    const loadPrestige = useCallback(async () => {
        try {
            const url = viewingUserId
                ? `${API_BASE_URL}/api/prestige/user/${viewingUserId}`
                : `${API_BASE_URL}/api/prestige`;
            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) return null;
            const data = await res.json();
            setPrestige(data);
            return data;
        } catch (err) {
            console.error('Failed to load prestige state:', err);
            return null;
        }
    }, [viewingUserId]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const url = viewingUserId
                ? `${API_BASE_URL}/api/prestige/user/${viewingUserId}`
                : `${API_BASE_URL}/api/prestige`;
            try {
                const res = await fetch(url, { credentials: 'include' });
                if (!res.ok || cancelled) return;
                const data = await res.json();
                if (!cancelled) setPrestige(data);
            } catch (err) {
                console.error('Failed to load prestige state:', err);
            }
        })();
        return () => { cancelled = true; };
    }, [viewingUserId]);

    // The run's own collection, whenever the lens is on it.
    useEffect(() => {
        if (scope !== 'prestige' || !prestige) return undefined;
        const level = viewLevel || prestige.activeRun?.level || prestige.level;
        if (!level) return undefined;

        let cancelled = false;
        (async () => {
            try {
                const url = viewingUserId
                    ? `${API_BASE_URL}/api/prestige/collection/${viewingUserId}?level=${level}`
                    : `${API_BASE_URL}/api/prestige/collection?level=${level}`;
                const res = await fetch(url, { credentials: 'include' });
                if (!res.ok || cancelled) return;
                const data = await res.json();
                if (!cancelled) setPrestigeData(data);
            } catch (err) {
                console.error('Failed to load prestige collection:', err);
            }
        })();
        return () => { cancelled = true; };
    }, [scope, prestige, viewLevel, viewingUserId]);

    useEffect(() => {
        // Escape closes the board — except while the prestige ceremony is
        // running, when closing the board IS skipping it. The overlay swallows
        // the key too; this is the second lock on the same door, because the two
        // handlers are on different elements and only one of them is guaranteed
        // to see the event first.
        const onKey = e => { if (e.key === 'Escape' && !ascending) onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, ascending]);

    // The platform's canvas needs a pixel height and its mount flexes, so it is
    // measured rather than declared — DESIGN.md §8's "don't give a canvas a fixed
    // height when its mount flexes" applies here exactly as it does in the band.
    useEffect(() => {
        const el = platformRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return undefined;
        const ro = new ResizeObserver(entries => {
            for (const e of entries) setPlatformHeight(Math.max(160, e.contentRect.height));
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Memoize special items list - only recalculate when dynamicItems changes
    const { tierItems, allItemsWithSpecial } = useMemo(() => {
        const hasApiData = dynamicItems && dynamicItems.length > 0;

        // One mapper per source instead of four near-identical filter/map pairs
        // per tier — adding exotic to the hand-written version meant writing the
        // same eight lines a fifth time and getting one of the field names wrong.
        const fromApi = tier => dynamicItems.filter(i => i.rarity === tier).map(i => ({
            name: i.name, texture: i.texture, type: tier,
            chance: i.display_chance || i.chance,
            username: i.username, imageUrl: i.image_url || i.imageUrl
        }));
        const fromMembers = (members, tier, prefix) => members.map(m => ({
            name: m.name, texture: `${prefix}_${m.username}`, type: tier,
            username: m.username, chance: m.chance
        }));

        let insane, mythic, legendary, exotic, rare;

        if (hasApiData) {
            insane = fromApi('insane');
            mythic = fromApi('mythic');
            legendary = fromApi('legendary');
            exotic = fromApi('exotic');
            rare = fromApi('rare');
        } else {
            insane = INSANE_ITEMS.map(i => ({ ...i, texture: i.texture, type: 'insane' }));
            mythic = MYTHIC_ITEMS.map(m => ({ ...m, texture: m.texture }));
            legendary = fromMembers(TEAM_MEMBERS, 'legendary', 'special');
            // Exotic is a list of items, not members — its textures are already
            // whole, so it maps like INSANE_ITEMS rather than through fromMembers.
            exotic = EXOTIC_ITEMS.map(i => ({ ...i, type: 'exotic' }));
            rare = fromMembers(RARE_MEMBERS, 'rare', 'rare');
        }

        // The pool's items carry no `type`, and the register needs one — a common
        // is a tier like any other on this board, not the absence of a tier.
        const commons = allItems.map(i => (i.type ? i : { ...i, type: 'common' }));

        return {
            tierItems: { insane, mythic, legendary, exotic, rare, common: commons },
            allItemsWithSpecial: [...insane, ...mythic, ...legendary, ...exotic, ...rare, ...commons],
        };
    }, [dynamicItems, allItems]);

    /* ── The register ─────────────────────────────────────────────────────────
     *
     * One row per tier that has items. Everything in a row is read off the same
     * data the old book already had; what is new is that it is on the board
     * instead of behind an accordion, and that the wait has a number.
     */
    const register = useMemo(() => REGISTER_ORDER
        .map(key => {
            const items = tierItems[key] || [];
            if (items.length === 0) return null;

            const held = items.filter(i => activeCollection[i.texture] > 0).length;
            const missing = items.length - held;

            // The tier's most recent arrival. Only the signed-in player's own
            // payload carries first_obtained; another player's collection details
            // are assembled from the special-items list and have no timestamps at
            // all, so this is absent rather than wrong on someone else's board.
            let last = null;
            for (const i of items) {
                const at = activeDetails?.[i.texture]?.firstObtained;
                if (at && (!last || new Date(at) > new Date(last))) last = at;
            }

            // Expected spins between pulls = 1 / (the tier's summed chance).
            //
            // `chance` is a FRACTION, not a percentage — 0.00009 for the mythic
            // tier, not 0.009. This was written against the percentage reading
            // first and every expectation came out a hundred times too large:
            // the register offered "one costs about 1,111,111 spins on average"
            // for a tier the player had completed three times over. Caught by
            // reading the accessibility tree rather than the screen, because the
            // number only ever appeared in a title attribute. `formatChance` is
            // the proof: it multiplies by 100 before printing a percent sign.
            const chanceSum = items.reduce((sum, i) => sum + (Number(i.chance) || 0), 0);
            const expected = chanceSum > 0 ? Math.round(1 / chanceSum) : null;
            // `?? null` rather than `?? 0`, for the same reason: a missing key —
            // during a deploy where the API is briefly older than the page, or on
            // another player's board — is an absence, and the register prints an
            // absence as a dash. A real streak of 0 still arrives as 0 and still
            // prints as 0, which is the case that made the old `?? 0` look right.
            const since = NO_STREAK.has(key) ? null : (dryStreaks?.[key] ?? null);
            const overdue = expected != null && since != null && since > expected;

            // Complete outranks overdue, and the two are not the same claim: a
            // tier you have finished is not overdue for anything you still need.
            // But "you own all ten rares" and "you have not pulled one in 414
            // spins" are both true at once, and the status column has room for
            // one word — so the word goes to the collection and the wait is
            // marked on the SINCE figure instead, which is the number it is
            // about. That is why `overdue` travels separately from `status`.
            const status = held === 0 ? 'empty'
                : missing === 0 ? 'complete'
                : overdue ? 'overdue'
                : 'tracking';

            return {
                key, items, held, missing, total: items.length, last, since, expected, status, overdue,
                tone: getRarityColor(key),
                ink: getRarityInk(key),
                label: RARITY[key].label,
            };
        })
        .filter(Boolean), [tierItems, activeCollection, activeDetails, dryStreaks]);

    const totals = useMemo(() => {
        const total = allItemsWithSpecial.length;
        const held = allItemsWithSpecial.filter(i => activeCollection[i.texture] > 0).length;
        const specials = ['insane', 'mythic', 'legendary', 'exotic', 'rare']
            .reduce((sum, k) => sum + (stats?.[`${k}Count`] || 0), 0);
        return {
            held,
            total,
            missing: total - held,
            pct: total > 0 ? (held / total) * 100 : 0,
            spins: stats?.totalSpins || 0,
            dupes: stats?.totalDuplicates || 0,
            // Every tier the label calls a special, exotic included — leaving it
            // out inflated the average, since the spins that produced an exotic
            // still counted in the numerator.
            perSpecial: specials > 0 ? (stats.totalSpins / specials).toFixed(1) : null,
        };
    }, [allItemsWithSpecial, activeCollection, stats]);

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        const filtered = allItemsWithSpecial.filter(item => {
            if (q && !item.name.toLowerCase().includes(q)) return false;
            const count = activeCollection[item.texture] || 0;
            if (have === 'held' && count === 0) return false;
            if (have === 'missing' && count > 0) return false;
            if (tierFilter && item.type !== tierFilter) return false;
            return true;
        });

        const at = item => {
            const d = activeDetails?.[item.texture]?.firstObtained;
            return d ? new Date(d).getTime() : 0;
        };

        return filtered.sort((a, b) => {
            if (sort === 'recent') {
                const diff = at(b) - at(a);
                if (diff !== 0) return diff;
            }
            if (sort === 'count') {
                const diff = (activeCollection[b.texture] || 0) - (activeCollection[a.texture] || 0);
                if (diff !== 0) return diff;
            }
            const order = getRarityOrder(a.type) - getRarityOrder(b.type);
            if (order !== 0) return order;
            const counts = (activeCollection[b.texture] || 0) - (activeCollection[a.texture] || 0);
            if (counts !== 0) return counts;
            return a.name.localeCompare(b.name);
        });
    }, [allItemsWithSpecial, activeCollection, activeDetails, have, tierFilter, search, sort]);

    const clearFilters = useCallback(() => {
        setTierFilter(null); setHave('all'); setSearch('');
    }, []);

    /* ── Prestige, resolved for the render ────────────────────────────────── */
    const hasPrestige = Boolean(prestige && (prestige.level > 0 || prestige.activeRun));
    const nextLevel = (prestige?.level || 0) + 1;
    // The button is the player's own, and only when the server says so. Viewing
    // someone else's board never offers it, whatever their state.
    const canPrestige = Boolean(!viewingUser && prestige?.eligible && nextLevel <= MAX_PRESTIGE_LEVEL);
    const shownLevel = viewLevel || prestige?.activeRun?.level || prestige?.level || 0;
    // Every level that exists to look at: the finished ones plus the one running.
    const selectableLevels = prestige
        ? Array.from(new Set([
            ...Array.from({ length: prestige.level }, (_, i) => i + 1),
            ...(prestige.activeRun ? [prestige.activeRun.level] : []),
        ])).sort((a, b) => a - b)
        : [];

    /*
     * Starting a run.
     *
     * The server decides — the disabled button is a courtesy and the rule lives
     * in `services/prestige.js`. A 409 here means the state moved under us (a
     * second tab, a stale page), so the honest response is to re-read rather than
     * to argue with it.
     */
    const handleStartPrestige = useCallback(async () => {
        if (starting) return;
        setStarting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/prestige/start`, {
                method: 'POST',
                credentials: 'include',
            });
            if (!res.ok) {
                await loadPrestige();
                return;
            }
            const data = await res.json();
            setPrestige(data.state);
            setViewLevel(data.level);
            setPrestigeData(null);

            // The board switches underneath first, so when the convergence
            // clears there is nothing left to animate — the new schedule is
            // simply already there. The overlay is the moment; the board's own
            // flap cascade is what it lands on.
            setScope('prestige');
            setTierFilter(null);
            setHave('all');
            setSearch('');
            setAscending(data.level);
        } catch (err) {
            console.error('Failed to start prestige:', err);
            await loadPrestige();
        } finally {
            setStarting(false);
        }
    }, [starting, loadPrestige]);

    const filtered = Boolean(tierFilter) || have !== 'all' || search.trim().length > 0;
    // "LEGENDARY PRESTIGE" is eighteen characters of drum — about 324px at the
    // phone's 28px step, in a 358px board — so it overflowed its row and the
    // earned-level badge sat on top of its last letters. The word "Prestige" is
    // the one part a phone can afford to lose: the lens directly beneath the
    // title already says it, and says it as the *selected* state.
    const boardTitle = prestigeView
        ? ((isPhone ? prestigeName(shownLevel) : prestigeLabel(shownLevel)) || 'Prestige')
        : (viewingUser ? `${viewingUser}` : 'Collection');

    // The head's figures. Fixed columns, divided by rules, label under value —
    // the register's own grammar one size up, not a row of stat cards.
    /*
     * The second register follows the lens.
     *
     * On the main board these are the career figures they have always been. On a
     * prestige board they were *still* the career figures, which put "249 held"
     * on the same coping as "50,342 duplicates" — two numbers about different
     * collections, one of them looking very much like a total for the run you are
     * staring at. A lens that changes the subject has to change the facts with it.
     *
     * Everything here is derived from the run's own rows, so nothing new is
     * fetched and nothing can disagree with the register below it.
     */
    const runFacts = useMemo(() => {
        if (!prestigeView) return null;
        const counts = Object.values(activeCollection);
        const unique = counts.length;
        const dupes = counts.reduce((sum, n) => sum + n, 0) - unique;
        // Tested against the ladder, NOT against 'common'. A pool item is stored
        // as `item_type = 'regular'` in the wheel's database and only normalised
        // to 'common' when this board builds its own roster — so "not common"
        // was true for every ordinary item and this read 249 specials out of 249
        // items. Two spellings of the same idea, and the filter met the other one.
        const specials = Object.entries(activeCollection)
            .filter(([texture, n]) => n > 0 && SPECIAL_TYPES.has(activeDetails[texture]?.type))
            .length;
        const run = prestige?.runs?.find(r => r.level === shownLevel);
        return { dupes, specials, startedAt: run?.startedAt || null };
    }, [prestigeView, activeCollection, activeDetails, prestige, shownLevel]);

    const headFigures = prestigeView
        ? [
            { label: 'Held', value: fmt(totals.held), tone: DECK.ink },
            { label: 'Missing', value: fmt(totals.missing), tone: totals.missing > 0 ? DECK.amber : DECK.inkDim },
            { label: 'Complete', value: `${totals.pct.toFixed(1)}%`, tone: DECK.ink },
            {
                label: 'Duplicates',
                value: fmt(runFacts?.dupes || 0),
                tone: DECK.inkMid,
                title: 'Duplicates pulled during this prestige run',
            },
            {
                label: 'Specials',
                value: fmt(runFacts?.specials || 0),
                tone: DECK.inkMid,
                title: 'Rare-and-above items held in this run',
            },
            {
                label: 'Started',
                value: fmtDate(runFacts?.startedAt) || '—',
                tone: DECK.inkMid,
                title: 'When this prestige run was opened',
            },
        ]
        : [
            { label: 'Held', value: fmt(totals.held), tone: DECK.ink },
            { label: 'Missing', value: fmt(totals.missing), tone: totals.missing > 0 ? DECK.amber : DECK.inkDim },
            { label: 'Complete', value: `${totals.pct.toFixed(1)}%`, tone: DECK.ink },
            { label: 'Spins', value: fmt(totals.spins), tone: DECK.inkMid },
            { label: 'Duplicates', value: fmt(totals.dupes), tone: DECK.inkMid },
            {
                // The long form drives this column ~115px wide, which is what
                // pushed the phone's spin register onto a second line with one
                // figure stranded on it. The title carries the full sentence.
                label: isPhone ? 'Per special' : 'Spins per special',
                value: totals.perSpecial ?? '—',
                tone: DECK.inkMid,
                title: 'Total spins divided by every Rare-and-above pull on record',
            },
        ];

    // The register's columns, and the order is an argument.
    //
    // The meter sits next to HELD and MISSING because it measures them, not off
    // at the right where it was competing with STATUS. SINCE sits last before
    // STATUS because it is the board's headline claim — how long you have been
    // waiting — and it was previously the dimmest, smallest figure in the row,
    // parked behind a number the player already knows.
    //
    // On a phone MISSING gives way rather than SINCE: missing is total minus
    // held, derivable from two columns still on screen, while the wait is
    // derivable from nothing.
    const gridTemplate = isPhone
        ? '10px minmax(0, 1fr) 46px 74px 76px'
        : '10px minmax(92px, 1fr) 54px 62px minmax(70px, 0.62fr) 82px 84px 88px';

    return (
        <div
            // The backdrop closes the board, and while the ceremony is running
            // that would be a skip button in everything but name.
            onClick={e => { if (e.target === e.currentTarget && !ascending) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-label={viewingUser ? `${viewingUser}'s collection` : 'Your collection'}
            style={{
                position: 'fixed', inset: 0,
                // The scrim ladder's middle step: this pushes the stage back
                // behind a plaque rather than blacking it out. The board is a
                // structure standing in the same city, not a new screen.
                background: 'rgba(0,0,0,0.8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000, padding: isPhone ? '0' : '24px',
                animation: 'fadeIn 0.2s ease-out',
            }}
        >
            <div style={{
                position: 'relative',
                width: '100%', maxWidth: '1180px',
                height: isPhone ? '100%' : 'min(88vh, 860px)',
                display: 'flex', flexDirection: 'column',
                backgroundImage: DECK.face,
                // Edges of light, not a border: a lit rail along the top, the
                // deck falling away below. The outer shadow seats the board over
                // the scrim and carries a real offset and blur.
                // Three edges, the way the band has three: a lit rail along the
                // top, and a front lip at the bottom — one light face over the
                // dark under-line. Without the lip the board simply stopped, and
                // a structure with no bottom edge reads as a region rather than
                // as a thing standing in the room.
                boxShadow: [
                    `inset 0 1px 0 ${rail(0.12)}`,
                    `inset 0 -2px 0 rgba(0,0,0,0.55)`,
                    `inset 0 -3px 0 ${rail(0.09)}`,
                    '0 32px 80px rgba(0,0,0,0.65)',
                ].join(', '),
                animation: 'slideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                overflow: 'hidden',
            }}>

                {/*
                 * The upper deck: the head and the register, which scroll
                 * together and only when they have to.
                 *
                 * On a 375x667 phone the head, the register and the platform's
                 * own controls want about 520px between them, which left the
                 * platform 160px — two rows of a 1,559-item grid, on the surface
                 * whose whole job is showing them. The platform now holds a floor
                 * of 262px on a phone and the upper deck gives way instead, which
                 * is the right way round: the numbers are a few rows you can
                 * scroll back to, and the items are the thing you came for.
                 * Above phone width nothing here ever scrolls.
                 */}
                <div
                    className={isPhone ? 'fib-board-scroll' : undefined}
                    style={{
                        flex: isPhone ? '0 1 auto' : '0 0 auto',
                        minHeight: 0,
                        overflowY: isPhone ? 'auto' : 'visible',
                    }}
                >
                {/* ── THE HEAD ──────────────────────────────────────────────
                    The deck's top face: the surface grain with sky light falling
                    from the rail and dying before the register, the same coping
                    the status console sits on in the band. */}
                <div style={{
                    position: 'relative', flex: '0 0 auto',
                    padding: isPhone ? '16px 16px 0' : '24px 26px 0',
                    backgroundImage: `linear-gradient(180deg, ${DECK.sky} 0%, transparent 78%)`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', minWidth: 0 }}>
                            <FlapText
                                text={boardTitle}
                                size={isPhone ? 28 : 36}
                                tone={DECK.ink}
                                weight={800}
                                plate
                            />

                            {/*
                             * The lens.
                             *
                             * Not a tab bar — this board already owns exactly one
                             * control for "pick one of N" and a second shape doing
                             * the same job is how a reader loses the ability to
                             * learn either. It appears only for a player who has
                             * prestige, so the board grows no furniture for a
                             * state almost nobody is in.
                             */}
                            {hasPrestige && (
                                <Segmented
                                    value={scope}
                                    onChange={setScope}
                                    options={[['main', 'Collection'], ['prestige', 'Prestige']]}
                                    label="Which collection to show"
                                />
                            )}

                            {/* Past levels stay browsable, which is the whole
                                reason the prestige collection is keyed by level
                                rather than cleared. Only shown once there is more
                                than one to choose between. */}
                            {prestigeView && selectableLevels.length > 1 && (
                                // Labelled like SHOW and SORT below it. Bare
                                // numerals next to two labelled groups is a
                                // control that never says what it controls, and
                                // "I II III" is the least self-describing set on
                                // the board.
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <BoardLabel>Level</BoardLabel>
                                    <Segmented
                                        value={String(shownLevel)}
                                        onChange={v => setViewLevel(Number(v))}
                                        options={selectableLevels.map(l => [String(l), ROMAN[l] || String(l)])}
                                        label="Prestige level"
                                    />
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
                            {/*
                             * The unlock.
                             *
                             * Station amber, because it is the board telling you
                             * something — the level's own rarity colour belongs to
                             * the badge you earn, not to the button that earns it,
                             * or rarity would stop meaning rarity for one control.
                             */}
                            {canPrestige && (
                                <Plinth
                                    as="button"
                                    className="fib-board-hit"
                                    onClick={handleStartPrestige}
                                    live
                                    disabled={starting}
                                    aria-label={`Prestige your collection — start ${prestigeLabel(nextLevel)}`}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '0 14px', height: '36px',
                                        color: DECK.amber,
                                        opacity: starting ? 0.6 : 1,
                                    }}
                                >
                                    <Crown size={14} />
                                    <BoardLabel tone={DECK.amber}>
                                        {starting ? 'Starting…' : 'Prestige'}
                                    </BoardLabel>
                                </Plinth>
                            )}

                            {/* The badge. Worn on the board whose collection earned
                                it, at every level, and iridescent at the top for
                                the same reason insane is. */}
                            {prestige?.level > 0 && (
                                <span
                                    className={isIridescentPrestige(prestige.level) ? 'fib-holo' : undefined}
                                    title={prestigeLabel(prestige.level)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '7px',
                                        padding: '0 12px', height: '36px',
                                        background: isIridescentPrestige(prestige.level)
                                            ? undefined
                                            : `${prestigeColor(prestige.level)}22`,
                                        boxShadow: `inset 0 -2px 0 ${prestigeColor(prestige.level)}`,
                                        color: isIridescentPrestige(prestige.level)
                                            ? '#1a1a1a'
                                            : prestigeInk(prestige.level),
                                    }}
                                >
                                    {/* The level's own tier mark. The Crown stays
                                        on the ACTION button below, which is the
                                        abstract idea of prestige; anything naming
                                        a specific level wears that level's icon. */}
                                    {prestigeIcon(prestige.level, 13)}
                                    <BoardLabel tone="currentColor">
                                        {ROMAN[prestige.level] || prestige.level}
                                    </BoardLabel>
                                </span>
                            )}

                            <Plinth
                                as="button"
                                className="fib-board-hit"
                                onClick={onClose}
                                aria-label="Close the collection board"
                                style={{
                                    width: '36px', height: '36px', flex: '0 0 auto',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: DECK.inkMid,
                                }}
                            ><X size={16} /></Plinth>
                        </div>
                    </div>

                    {/* The figures. Six of them on a desktop board, on drums, in
                        fixed columns — the numbers this book used to hide behind a
                        "Spin Stats" accordion, which is what made the surface feel
                        like it had nothing to say.

                        A phone cannot carry six drums, six register rows and a
                        usable grid in 667px, and of the three the drums are the
                        least urgent: a total is a thing you read once. So the
                        three collection figures keep their drums and the three
                        spin figures fold into one tracked line under the platform
                        line. Nothing is dropped and nothing is hidden behind a
                        control — the numbers just take the room they are worth. */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between',
                        gap: '24px',
                        margin: isPhone ? '14px 0 8px' : '20px 0 8px',
                    }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isPhone ? 'repeat(3, 1fr)' : 'repeat(3, auto)',
                        justifyContent: 'start',
                        gap: 0,
                        flex: isPhone ? '1 1 auto' : '0 0 auto',
                    }}>
                        {headFigures.slice(0, 3).map((f, i) => (
                            <div
                                key={f.label}
                                title={f.title}
                                style={{
                                    padding: isPhone ? '0 12px' : '0 26px',
                                    boxShadow: i > 0 ? `inset 1px 0 0 ${rail(0.07)}` : undefined,
                                    ...(i === 0 ? { paddingLeft: 0 } : null),
                                }}
                            >
                                <FlapText
                                    text={f.value}
                                    size={isPhone ? 22 : 27}
                                    tone={f.tone}
                                    weight={700}
                                    plate
                                    delay={60 + i * 40}
                                />
                                <div style={{ marginTop: '7px' }}>
                                    <BoardLabel>{f.label}</BoardLabel>
                                </div>
                            </div>
                        ))}
                    </div>
                    {!isPhone && <SpinRegister figures={headFigures.slice(3)} align="right" />}
                    </div>

                    {/* The platform line: the board's own baseline, filled to the
                        collection's completion. It replaces the thin rounded
                        progress bar and needs no label, because HELD and COMPLETE
                        are standing directly above it. */}
                    {/* The board's baseline takes the level's colour on a
                        prestige board, where the title, the badge and the level
                        selector all already carry it; station amber is the main
                        board's own signal and stays there. */}
                    <BoardMeter
                        value={totals.pct / 100}
                        tone={(prestigeView && prestigeColor(shownLevel)) || DECK.amber}
                        height={3}
                    />

                    {/*
                     * The spin figures, folded into one tracked line.
                     *
                     * Six equal drums in one run was a KPI strip with the boxes
                     * taken off — the form kept, the container removed — and it
                     * put 44,408 next to 42,692 at identical size and tone, two
                     * five-digit numbers the eye cannot tell apart. These three
                     * are a different register from the collection's three: they
                     * are about spinning, not about holding, and a total is a
                     * thing you read once. The phone worked this out first; the
                     * board follows it.
                     */}
                    {isPhone && (
                        <div style={{ padding: '14px 0 2px' }}>
                            <SpinRegister figures={headFigures.slice(3)} size={17} />
                        </div>
                    )}
                </div>

                {/* ── THE REGISTER ─────────────────────────────────────────── */}
                <div style={{ flex: '0 0 auto', padding: isPhone ? '0 16px' : '0 26px' }}>
                    {/* 22px above the headings, against 8px under the meter: the
                        meter measures the figures it sits below, and at 11px it
                        was reading as the register's own top rule — the one
                        full-bleed line on a surface whose contract says no
                        borders. More space above a heading than below it. */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: gridTemplate,
                        alignItems: 'center', gap: '0 12px',
                        padding: isPhone ? '20px 0 6px' : '24px 0 8px',
                    }}>
                        <span />
                        <BoardLabel>Tier</BoardLabel>
                        <BoardLabel style={{ textAlign: 'right' }}>Held</BoardLabel>
                        {!isPhone && <BoardLabel style={{ textAlign: 'right' }}>Missing</BoardLabel>}
                        {!isPhone && <span />}
                        {!isPhone && <BoardLabel style={{ textAlign: 'right' }}>Last pull</BoardLabel>}
                        <BoardLabel style={{ textAlign: 'right' }}>Since</BoardLabel>
                        <BoardLabel style={{ textAlign: 'right' }}>Status</BoardLabel>
                    </div>

                    <div role="group" aria-label="Filter the platform by tier">
                        {register.map((row, i) => {
                            const active = tierFilter === row.key;
                            const statusWord = { complete: 'Complete', overdue: 'Overdue', empty: 'None held', tracking: 'Collecting' }[row.status];
                            const statusTone = row.status === 'complete' ? row.ink
                                : row.status === 'overdue' ? DECK.amber
                                : row.status === 'empty' ? DECK.inkMid
                                : DECK.inkMid;

                            // The whole claim, as one sentence, on the row itself.
                            // It used to live only in a `title` — unreachable on a
                            // phone, unreliable for a screen reader, and the row's
                            // accessible name was a bare run of numerals
                            // ("Rare 10 0 JAN 07 414 Complete").
                            const waitSentence = row.expected != null && row.since != null
                                ? `${fmt(row.since)} spins since your last ${row.label}; one costs about ${fmt(row.expected)} spins on average`
                                : null;

                            return (
                                <button
                                    key={row.key}
                                    className={`fib-board-hit fib-register-row${active ? ' is-active' : ''}`}
                                    onClick={() => setTierFilter(active ? null : row.key)}
                                    aria-pressed={active}
                                    aria-label={[
                                        row.label,
                                        `${fmt(row.held)} of ${fmt(row.total)} held`,
                                        row.missing > 0 ? `${fmt(row.missing)} missing` : null,
                                        waitSentence,
                                        statusWord,
                                    ].filter(Boolean).join('. ')}
                                    // No `title`: the same sentence is the row's
                                    // accessible name and the DUE label says it on
                                    // screen. A third copy in a native tooltip is
                                    // one nobody on a phone can reach anyway.
                                    style={{
                                        display: 'grid', gridTemplateColumns: gridTemplate,
                                        alignItems: 'center', gap: '0 12px',
                                        width: '100%', padding: isPhone ? '7px 0' : '12px 0',
                                        border: 'none', textAlign: 'left', font: 'inherit',
                                        // The tier's own wash and base bar are the
                                        // only per-tier values here, so they are the
                                        // only ones the component supplies; the
                                        // states themselves live in index.css.
                                        '--fib-row-wash': `${row.tone}14`,
                                        '--fib-row-tone': row.tone,
                                    }}
                                >
                                    <RowLamp
                                        state={row.status === 'complete' ? 'lit' : row.overdue ? 'due' : 'dark'}
                                        tone={row.tone}
                                    />
                                    {/* A tier with nothing held is the one row on the
                                        board with everything left to do, and it was
                                        rendered as the quietest: dim label, dark lamp,
                                        empty meter, two dashes. The chase gets its own
                                        ink back. */}
                                    <FlapText
                                        text={row.label}
                                        size={isPhone ? 15 : 16}
                                        tone={row.held > 0 ? row.ink : DECK.ink}
                                        weight={700}
                                        delay={280 + i * 55}
                                    />
                                    <FlapText
                                        text={fmt(row.held)} digits size={16}
                                        tone={DECK.ink} delay={300 + i * 55}
                                        style={{ justifyContent: 'flex-end' }}
                                    />
                                    {!isPhone && (
                                        <FlapText
                                            text={fmt(row.missing)} digits size={16}
                                            tone={row.missing > 0 ? DECK.inkMid : DECK.inkDim}
                                            delay={315 + i * 55}
                                            style={{ justifyContent: 'flex-end' }}
                                        />
                                    )}
                                    {!isPhone && (
                                        <BoardMeter
                                            value={row.held / row.total}
                                            tone={row.tone}
                                            spent={row.status === 'complete'}
                                        />
                                    )}
                                    {!isPhone && (
                                        <FlapText
                                            text={fmtDate(row.last) || '—'}
                                            size={13} tone={DECK.inkDim} weight={600}
                                            delay={330 + i * 55}
                                            style={{ justifyContent: 'flex-end' }}
                                        />
                                    )}
                                    {/* The wait, as a number.
                                        A "DUE" badge rode in front of it for one
                                        build, on the argument that a colour is not
                                        a claim anyone can read. The owner cut it:
                                        a word in a column of figures breaks the
                                        column, and this register is read down. The
                                        amber stays — it is the signal, not a label
                                        — and the row's accessible name still
                                        carries the whole sentence, so the claim is
                                        reachable without a word on screen. */}
                                    <FlapText
                                        text={row.since == null ? '—' : fmt(row.since)}
                                        digits={row.since != null} size={16}
                                        tone={row.overdue ? DECK.amber : DECK.inkMid}
                                        delay={345 + i * 55}
                                        style={{ justifyContent: 'flex-end' }}
                                    />
                                    <BoardLabel size={11} tone={statusTone} style={{ textAlign: 'right' }}>
                                        {statusWord}
                                    </BoardLabel>
                                </button>
                            );
                        })}
                    </div>
                </div>
                </div>

                {/* ── THE PLATFORM ─────────────────────────────────────────── */}
                <div style={{
                    flex: '1 1 auto',
                    minHeight: isPhone ? '262px' : 0,
                    display: 'flex', flexDirection: 'column',
                    marginTop: isPhone ? '10px' : '14px',
                    // The platform is cut one step deeper than the board it sits
                    // in — a recess, with the board's own edge as its top seam.
                    background: 'rgba(0,0,0,0.30)',
                    boxShadow: `inset 0 1px 0 ${rail(0.08)}`,
                }}>
                    <div style={{
                        flex: '0 0 auto',
                        display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                        padding: isPhone ? '10px 16px' : '12px 26px',
                    }}>
                        <FlapText
                            text={tierFilter ? RARITY[tierFilter].label : 'All items'}
                            size={16}
                            tone={tierFilter ? getRarityInk(tierFilter) : DECK.ink}
                        />
                        <BoardLabel tone={DECK.inkDim}>
                            {fmt(shown.length)} shown
                        </BoardLabel>

                        {/*
                         * The readout, and it is not decoration.
                         *
                         * The platform is 1,559 unlabelled sprites on a canvas,
                         * and a canvas cannot carry a title attribute — so
                         * identifying one meant opening its plaque and closing it
                         * again, a modal round trip per guess, on the surface
                         * whose whole job is finding a thing. Naming what is under
                         * the cursor costs a line the control bar already had
                         * spare.
                         *
                         * A BoardLabel and not a FlapText on purpose: a split-flap
                         * cascade firing on every pointer move would be the board
                         * shouting at the mouse.
                         */}
                        {readout && (
                            <span
                                role="status"
                                aria-live="polite"
                                style={{
                                    display: 'flex', alignItems: 'baseline', gap: '8px',
                                    minWidth: 0, overflow: 'hidden',
                                }}
                            >
                                <BoardLabel
                                    size={13}
                                    tone={readout.held ? DECK.ink : DECK.inkDim}
                                    style={{ letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                >
                                    {readout.name}
                                </BoardLabel>
                                <BoardLabel tone={readout.type === 'common' ? DECK.inkDim : getRarityInk(readout.type)}>
                                    {(RARITY[readout.type] || RARITY.common).label}
                                </BoardLabel>
                                <BoardLabel tone={DECK.inkDim}>
                                    {readout.held ? `Held x${readout.held}` : 'Not collected'}
                                </BoardLabel>
                            </span>
                        )}

                        <div style={{ flex: '1 1 auto', minWidth: '12px' }} />

                        {/* Two radiogroups, not one six-way control. They sat 10px
                            apart with identical plinths and the same amber active
                            state, so "ALL … RARITY" read as two selections in one
                            set; the aria-labels were correct and invisible. */}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BoardLabel>Show</BoardLabel>
                            <Segmented
                                value={have}
                                onChange={setHave}
                                options={[['all', 'All'], ['held', 'Held'], ['missing', 'Missing']]}
                                label="Show"
                            />
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BoardLabel>Sort</BoardLabel>
                            <Segmented
                                value={sort}
                                onChange={setSort}
                                options={[['rarity', 'Rarity'], ['recent', 'Recent'], ['count', 'Count']]}
                                label="Sort"
                            />
                        </span>

                        <Plinth className="fib-board-search" style={{
                            display: 'flex', alignItems: 'center', gap: '7px',
                            padding: '0 4px 0 10px', height: '30px',
                        }}>
                            <Search size={13} color={DECK.inkDim} />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="SEARCH"
                                aria-label="Search items by name"
                                style={{
                                    width: isPhone ? '100px' : '128px',
                                    background: 'transparent', border: 'none', outline: 'none',
                                    color: DECK.ink,
                                    fontFamily: "'Barlow Condensed', system-ui, sans-serif",
                                    fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                }}
                            />
                            {/* Backspacing out of a search field is not a control.
                                It holds its space when hidden so the control bar
                                does not resize as you type. */}
                            <button
                                onClick={() => setSearch('')}
                                aria-label="Clear the search"
                                tabIndex={search ? 0 : -1}
                                style={{
                                    width: '22px', height: '30px', flex: '0 0 auto',
                                    background: 'transparent', border: 'none',
                                    cursor: 'pointer', color: DECK.inkDim,
                                    visibility: search ? 'visible' : 'hidden',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            ><X size={12} /></button>
                        </Plinth>
                    </div>

                    <div ref={platformRef} className="fib-board-scroll" style={{ flex: '1 1 auto', minHeight: 0, position: 'relative' }}>
                        {shown.length === 0 ? (
                            <div style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', gap: '12px',
                            }}>
                                <FlapText text="No items on this board" size={16} tone={DECK.inkMid} />
                                <BoardLabel tone={DECK.inkDim}>
                                    {search.trim() ? `Nothing matches "${search.trim()}"` : 'Nothing matches these filters'}
                                </BoardLabel>
                                {filtered && (
                                    <Plinth
                                        as="button"
                                        className="fib-board-hit"
                                        onClick={clearFilters}
                                        style={{ marginTop: '4px', padding: '8px 16px', color: DECK.amber }}
                                    >
                                        <BoardLabel tone={DECK.amber}>Clear filters</BoardLabel>
                                    </Plinth>
                                )}
                            </div>
                        ) : (
                            <CanvasCollectionGrid
                                items={shown}
                                collection={activeCollection}
                                onItemClick={setSelectedItem}
                                onItemFocus={setReadout}
                                containerHeight={platformHeight}
                            />
                        )}
                    </div>
                </div>

                {/*
                 * THE CONVERGENCE.
                 *
                 * Mounted inside the board rather than over the page: this is the
                 * board spending its own collection, and the deck's edges should
                 * still frame it. `mainCollection` and not the lens — the items
                 * being committed are the ones you had, and by this point the
                 * board behind is already showing the empty run.
                 */}
                {ascending && (
                    <PrestigeAscension
                        level={ascending}
                        items={allItemsWithSpecial}
                        collection={collection}
                        onDone={() => setAscending(null)}
                    />
                )}
            </div>

            {selectedItem && (
                <ItemPlaque
                    item={selectedItem}
                    details={activeDetails?.[selectedItem.texture]}
                    onClose={() => setSelectedItem(null)}
                />
            )}
        </div>
    );
}

/**
 * The spin register: three figures about spinning rather than about holding.
 *
 * ── HOW THIS LANDED AT A SECOND SIZE OF DRUM ─────────────────────────────────
 *
 * It started as six equal drums in one run, which is a KPI strip with the boxes
 * taken off — the form kept, the container removed — and it put 44,408 beside
 * 42,692 at identical size and tone, two five-digit numbers the eye cannot
 * separate. So the three spin figures were split off into a tracked line.
 *
 * That over-corrected and the owner said so: at label size they read as
 * side-notes, and a figure like "44,408 spins" is not a side-note — it is the
 * denominator under half the board. The split was never the problem; the volume
 * was.
 *
 * They are drums again, one step down: 20px against the collection's 27, which
 * is a 1.35 ratio — enough that the two registers read as headline and
 * supporting rather than as six equal claims, and enough that these still read
 * as figures on a board rather than as captions. The same two-tier trick §7's
 * profile record uses at 48/18.
 */
function SpinRegister({ figures, align, size = 20 }) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        }}>
            {figures.map((f, i) => (
                <div
                    key={f.label}
                    title={f.title}
                    style={{
                        padding: size >= 20 ? '0 18px' : '0 12px',
                        // Divided by a rule like every other figure group on the
                        // board, never boxed.
                        boxShadow: i > 0 ? `inset 1px 0 0 ${rail(0.07)}` : undefined,
                        ...(i === 0 ? { paddingLeft: 0 } : null),
                        ...(i === figures.length - 1 && align === 'right' ? { paddingRight: 0 } : null),
                    }}
                >
                    <FlapText text={f.value} size={size} tone={DECK.inkMid} weight={700} plate delay={180 + i * 40} />
                    <div style={{ marginTop: '6px' }}>
                        <BoardLabel>{f.label}</BoardLabel>
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * One control for "pick one of N", in the board's material.
 *
 * The stats module learned this the expensive way and wrote it down: two
 * controls doing one job, with different shapes and different keyboard
 * behaviour, is how a reader loses the ability to learn either. This is a
 * radiogroup, not tabs — there is no panel being switched, only a lens on the
 * platform below.
 */
function Segmented({ value, onChange, options, label }) {
    return (
        <div role="radiogroup" aria-label={label} style={{ display: 'flex' }}>
            {options.map(([id, text]) => {
                const active = value === id;
                return (
                    <Plinth
                        key={id}
                        as="button"
                        role="radio"
                        aria-checked={active}
                        className="fib-board-hit"
                        onClick={() => onChange(id)}
                        live={active}
                        style={{
                            padding: '0 11px', height: '30px',
                            display: 'flex', alignItems: 'center',
                        }}
                    >
                        <BoardLabel tone={active ? DECK.amber : DECK.inkDim}>{text}</BoardLabel>
                    </Plinth>
                );
            })}
        </div>
    );
}
