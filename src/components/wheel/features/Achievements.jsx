/*
 * ═══════════════════════════════════════════════════════════════════════════
 * THE CONCOURSE — the achievements board
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The fourth surface on the board, after the collection (DESIGN.md §9), the
 * leaderboard and the player record. §9's scope note lists achievements as one
 * of the parts of `/wheel` still uncovered; this is that part, and it needed no
 * new direction — a board of things you have and things you are chasing is the
 * departure board with the sort turned round one more time.
 *
 * What it replaces: a 16px-radius modal with a gradient header, a rounded
 * progress pill, a row of pill-shaped filter chips and a grid of 12px-radius
 * bordered cards, each tinted in a per-category hue. Every one of those is a
 * thing THE NOCTURNE's contract bans outright, and the surface had drifted far
 * enough that opening it from the collection board read as leaving the site.
 *
 * ── THE CASE AND THE CHASE, IN ONE GRID ──────────────────────────────────────
 *
 * DESIGN.md §7 splits these into two — a shelf of what you hold, a progress list
 * of what you are near — and §9 borrows the same split for the collection's
 * register and platform. Here they are one field of cells under one lens,
 * because unlike the collection there is no second object to show: an
 * achievement has no sprite, so "the case" would be the same cell with its lamp
 * lit. The split is carried by the ORDER instead — the chase comes first,
 * closest to done at the top, and the case sits behind it — and by the lens,
 * which can show either alone. What you can still act on is what you see first.
 *
 * **The cells are not a concession, and the ruled list they replaced was a real
 * mistake.** The first build of this board made the platform a register: one
 * ruled row per achievement, in the collection board's own grammar. The owner
 * rejected it on the one job this panel has — you could not see at a glance
 * which ones you hold or how close the rest were. A register is read DOWN a
 * column, one figure at a time, which is right for seven tiers and wrong for
 * forty-nine peers: "which of these do I have" is answered by pattern across a
 * field, not by scanning a column. The material was right and the form was
 * borrowed. **Reusing a board's material is not the same as reusing its
 * structure, and the structure belongs to the question.**
 *
 * Achievements a career stat cannot measure carry no figure and sort last, which
 * is §7's rule verbatim and for its reason: a made-up percentage is worse than
 * an honest blank.
 *
 * ── WHY THE CATEGORY COLOURS ARE GONE ────────────────────────────────────────
 *
 * The old board gave each of the six categories a hue: gold, purple, red, aqua,
 * green, orange. Four of those are rarity on every other surface of this site,
 * and one of them was gold — which is also a placing metal on the leaderboard
 * next door. So a "special" achievement was drawn in the aqua that means mythic,
 * and an "events" one in the gold that means legendary AND first place, on a
 * board where neither rarity nor rank exists at all.
 *
 * Colour on THE CONCOURSE means one of two things and nothing else: a tier hue
 * where the subject is a tier, and station amber where the board is telling you
 * something. A category is neither, so a category is a WORD here — its own
 * register row, and a column on every achievement. The inverse of §9's "the mark
 * is the colour, not a word": that register is read down a column of figures,
 * this one is read along rows of prose, and the two want opposite marks.
 *
 * Amber is the one signal: it washes a held cell, lights the foot of its mark
 * and fills its meter. That is unambiguous on this board because there is no
 * podium on it — the metals stay on the leaderboard, where they are named for
 * what they mean.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../../../config/constants.js';
import { DECK, rail } from '../config/constants';
import { X, Trophy, Search, HelpCircle, Check, Lock } from 'lucide-react';
import { AchievementIcon } from '../../../utils/achievementIcons.jsx';
import { FlapText, BoardLabel, RowLamp, BoardMeter, Plinth, Segmented } from './collection/FlapBoard.jsx';
import { useWheelViewport } from '../config/breakpoints.js';

function fmt(n) {
    return typeof n === 'number' && isFinite(n) ? n.toLocaleString('en-US') : '0';
}

/* The register's own date format, matching the collection board's LAST PULL:
   day and month in caps, because the drum carries no lower case. */
function fmtDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).toUpperCase();
}

/*
 * The category register's order, and it is the player's own path through the
 * game rather than the alphabet: the ones you meet first at the top, the ones
 * you meet by accident at the bottom. Any category the API adds that is not in
 * this list still gets a row — appended, in the order the payload gives — so a
 * new kind of achievement appears on the board the day it ships rather than
 * silently joining whatever the object order happens to be.
 */
const REGISTER_ORDER = ['beginner', 'spins', 'collection', 'duplicates', 'events', 'special'];

/*
 * The name a category answers to. The payload's keys are lower-case identifiers
 * and two of them do not survive being title-cased into a heading: "duplicates"
 * is what the database counts, "spares" is what a player holds, and "special" is
 * the catch-all rather than a rarity — which on this site is a word with a
 * meaning, and one this board must not appear to be using.
 */
const CATEGORY_LABEL = {
    beginner: 'Beginner',
    spins: 'Spins',
    collection: 'Collection',
    duplicates: 'Duplicates',
    events: 'Events',
    special: 'Milestones',
};

const categoryLabel = key => CATEGORY_LABEL[key] || key;

export function Achievements({ onClose, userId, username, isOwnProfile = true }) {
    const [achievements, setAchievements] = useState({});
    const [userAchievements, setUserAchievements] = useState({ unlocked: [], progress: {} });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    /* The category register's selection, the way the collection board's tier
       register works: a row is a door, and clicking the open one closes it. */
    const [categoryFilter, setCategoryFilter] = useState(null);
    /* The lens, and it is a separate question from the category — "unlocked
       rares" is a sentence, so the two controls must compose rather than be one
       eight-way chip row, which is what they were. */
    const [lens, setLens] = useState('all');
    const [search, setSearch] = useState('');
    const [hiddenStats, setHiddenStats] = useState({ unlocked: 0, total: 0 });

    const { isPhone } = useWheelViewport();

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, isOwnProfile]);

    async function loadData() {
        try {
            if (!isOwnProfile && !userId) {
                throw new Error('Missing userId for non-owner achievements view');
            }
            // Fetch all achievements definition
            const allRes = await fetch(`${API_BASE_URL}/api/achievements`);

            if (!allRes.ok) {
                throw new Error(`Failed to fetch achievements: ${allRes.status}`);
            }

            const allData = await allRes.json();
            setAchievements(allData.achievements || {});

            // Fetch user's achievements - different endpoint for own vs others
            let userRes;
            if (isOwnProfile) {
                userRes = await fetch(`${API_BASE_URL}/api/achievements/me`, { credentials: 'include' });
            } else {
                userRes = await fetch(`${API_BASE_URL}/api/achievements/user/${userId}`);
            }

            if (!userRes.ok) {
                throw new Error(`Failed to fetch user achievements: ${userRes.status}`);
            }

            const userData = await userRes.json();
            setUserAchievements(userData);

            // Store hidden achievement stats for other users
            if (!isOwnProfile) {
                setHiddenStats({
                    unlocked: userData.hiddenUnlockedCount || 0,
                    total: userData.totalHidden || 0
                });
            }
        } catch (e) {
            console.error('Failed to load achievements:', e);
            // The old board answered a failed fetch with "No achievements
            // found", which is a measurement, and there wasn't one. §9's rule
            // about NULL never being rendered as zero, one level up.
            setError(e.message || 'Could not reach the achievement service');
        } finally {
            setLoading(false);
        }
    }

    // Memoize derived data
    const { unlockedIds, unlockedCensored, unlockedAt, progress, achievementList, categories } = useMemo(() => {
        const unlocked = new Set(userAchievements.unlocked?.map(a => a.id) || []);
        // Track which unlocked achievements are censored (hidden achievements from other users)
        const censored = new Set(
            userAchievements.unlocked?.filter(a => a.censored).map(a => a.id) || []
        );
        const dates = new Map(
            (userAchievements.unlocked || []).map(a => [a.id, a.unlocked_at])
        );
        const list = Object.values(achievements);
        const seen = [...new Set(list.map(a => a.category))];
        // Known order first, then anything the payload knows about and this file
        // does not.
        const cats = [
            ...REGISTER_ORDER.filter(c => seen.includes(c)),
            ...seen.filter(c => !REGISTER_ORDER.includes(c)),
        ];
        return {
            unlockedIds: unlocked,
            unlockedCensored: censored,
            unlockedAt: dates,
            progress: userAchievements.progress || {},
            achievementList: list,
            categories: cats
        };
    }, [achievements, userAchievements]);

    /*
     * What this reader is allowed to see at all, before any control is applied.
     *
     * A hidden achievement someone else has not unlocked is not on their board —
     * not dimmed, not "???", absent — because a visitor counting the ??? rows
     * would be reading a list of secrets nobody has found yet. Your own board
     * keeps them as "???", which is the point of a secret you can still chase.
     */
    const visible = useMemo(() => achievementList.filter(a => (
        !a.hidden || unlockedIds.has(a.id)
    )), [achievementList, unlockedIds]);

    const totalAchievements = achievementList.length;
    const unlockedCount = unlockedIds.size;
    const hiddenCount = useMemo(() => achievementList.filter(a => a.hidden).length, [achievementList]);

    /*
     * A row's own facts, computed once for the register and the list both.
     *
     * `progressValue` is null rather than 0 for the 54-odd achievements no
     * career stat measures. Zero is a measurement; these have none, and the
     * difference decides both whether a bar is drawn and where the row sorts.
     */
    const rows = useMemo(() => visible.map(a => {
        const isUnlocked = unlockedIds.has(a.id);
        const isCensored = unlockedCensored.has(a.id);
        const isSecret = (a.hidden && !isUnlocked) || isCensored;
        const prog = progress[a.id];
        const measurable = !!prog && !prog.special && !isUnlocked && !isSecret
            && Number.isFinite(prog.current) && Number.isFinite(prog.target) && prog.target > 0;

        return {
            id: a.id,
            category: a.category,
            icon: a.icon,
            isUnlocked,
            isCensored,
            isSecret,
            name: isCensored ? '??? Secret achievement' : (isSecret ? '???' : a.name),
            description: isCensored
                ? 'This player has unlocked a secret achievement'
                : (isSecret ? 'Hidden achievement — discover it yourself' : a.description),
            current: measurable ? prog.current : null,
            target: measurable ? prog.target : null,
            progressValue: measurable ? Math.min(prog.current / prog.target, 1) : null,
            date: isUnlocked ? fmtDate(unlockedAt.get(a.id)) : null,
        };
    }), [visible, unlockedIds, unlockedCensored, unlockedAt, progress]);

    /* ── THE REGISTER ────────────────────────────────────────────────────────
       One ruled row per category, each a door into the list below — the tier
       register's grammar, with the tier swapped for the kind. The lamp lights on
       a category you have finished, which is the same claim the collection board
       makes and the only one either board makes without being asked. */
    const register = useMemo(() => categories.map(key => {
        const inCat = rows.filter(r => r.category === key);
        const held = inCat.filter(r => r.isUnlocked).length;
        const total = inCat.length;
        return {
            key,
            label: categoryLabel(key),
            held,
            total,
            missing: total - held,
            status: total === 0 ? 'empty' : held === total ? 'complete' : held === 0 ? 'none' : 'tracking',
        };
    }).filter(r => r.total > 0), [categories, rows]);

    /*
     * The list, filtered then ordered.
     *
     * The order IS the case-and-chase split: everything still open comes first,
     * sorted by how close it is, then the open ones nothing can measure, then
     * what you have already done, newest first. A board that opened on a wall of
     * green ticks would be answering a question the player did not ask — they
     * know what they have.
     */
    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        const filtered = rows.filter(r => {
            if (categoryFilter && r.category !== categoryFilter) return false;
            if (lens === 'unlocked' && !r.isUnlocked) return false;
            if (lens === 'locked' && r.isUnlocked) return false;
            if (q && !(`${r.name} ${r.description}`.toLowerCase().includes(q))) return false;
            return true;
        });

        return filtered.sort((a, b) => {
            if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? 1 : -1;
            if (a.isUnlocked) {
                // Newest first among the finished. Sorted on the raw timestamp,
                // never on the formatted string — "02 JAN" sorts before "31 DEC"
                // alphabetically, and the board would read as shuffled.
                const at = new Date(unlockedAt.get(a.id) || 0).getTime();
                const bt = new Date(unlockedAt.get(b.id) || 0).getTime();
                return bt - at;
            }
            const ap = a.progressValue, bp = b.progressValue;
            if (ap == null && bp == null) return a.name.localeCompare(b.name);
            if (ap == null) return 1;
            if (bp == null) return -1;
            return bp - ap;
        });
    }, [rows, categoryFilter, lens, search, unlockedAt]);

    /* The register's headings and its rows share one template, so the two must
       resolve identically — §9's "a shared template only lines up when every
       track resolves the same" is why every track here is a fixed length or a
       single minmax(0, 1fr). The cells below have no shared template at all:
       they are one auto-fill grid, which is the other half of why a field
       scans where a register does not. */
    const registerTemplate = isPhone
        ? '10px minmax(0, 1fr) 54px 78px'
        : '10px minmax(0, 1fr) 72px 82px 120px 96px';

    const boardTitle = isOwnProfile ? 'Achievements' : `${username || 'Player'}`;

    return (
        <div
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-label={isOwnProfile ? 'Your achievements' : `${username}'s achievements`}
            style={{
                position: 'fixed', inset: 0,
                // The scrim ladder's middle step, the same one the collection
                // board and the leaderboard stand behind: the stage is pushed
                // back, never blacked out.
                background: 'rgba(0,0,0,0.8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000, padding: isPhone ? 0 : '24px',
                animation: 'fadeIn 0.2s ease-out',
            }}
        >
            <div style={{
                position: 'relative',
                width: '100%', maxWidth: '1000px',
                height: isPhone ? '100%' : 'min(88vh, 820px)',
                display: 'flex', flexDirection: 'column',
                backgroundImage: DECK.face,
                // The board's three edges: a lit rail along the top, a dark
                // under-line and a light front lip at the bottom. Copied from the
                // collection board deliberately rather than approximated — two
                // structures in one city are made of the same material or they
                // are two cities.
                boxShadow: [
                    `inset 0 1px 0 ${rail(0.12)}`,
                    'inset 0 -2px 0 rgba(0,0,0,0.55)',
                    `inset 0 -3px 0 ${rail(0.09)}`,
                    '0 32px 80px rgba(0,0,0,0.65)',
                ].join(', '),
                animation: 'slideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                overflow: 'hidden',
            }}>

                {/* The upper deck — head and register — gives way on a phone so
                    the list keeps a floor, the way the collection board's
                    platform does. The numbers are a few rows you can scroll back
                    to; the achievements are what you came for. */}
                <div
                    className={isPhone ? 'fib-board-scroll' : undefined}
                    style={{
                        flex: isPhone ? '0 1 auto' : '0 0 auto',
                        minHeight: 0,
                        overflowY: isPhone ? 'auto' : 'visible',
                    }}
                >
                    {/* ── THE HEAD ────────────────────────────────────────── */}
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
                                {/* A visitor's board is titled with their name, so
                                    it needs the word the title no longer carries. */}
                                {!isOwnProfile && <BoardLabel>Achievements</BoardLabel>}

                                <Segmented
                                    value={lens}
                                    onChange={setLens}
                                    options={[['all', 'All'], ['locked', 'Chasing'], ['unlocked', 'Unlocked']]}
                                    label="Which achievements to show"
                                />
                            </div>

                            <Plinth
                                as="button"
                                className="fib-board-hit"
                                onClick={onClose}
                                aria-label="Close the achievements board"
                                style={{
                                    width: '36px', height: '36px', flex: '0 0 auto',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: DECK.inkMid,
                                }}
                            ><X size={16} /></Plinth>
                        </div>

                        {/* The figures. Three drums, and the third is a different
                            question on your own board than on a visitor's: yours
                            says how many secrets exist, theirs says how many of
                            them they have found — which is all the API will tell
                            you, and all it should. */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, auto)',
                            justifyContent: 'start',
                            margin: isPhone ? '14px 0 8px' : '20px 0 8px',
                        }}>
                            {[
                                { label: 'Unlocked', value: fmt(unlockedCount), tone: DECK.amber },
                                { label: 'Remaining', value: fmt(Math.max(0, totalAchievements - unlockedCount)), tone: DECK.ink },
                                isOwnProfile
                                    ? { label: 'Secret', value: fmt(hiddenCount), tone: DECK.inkMid }
                                    : { label: 'Secret found', value: `${fmt(hiddenStats.unlocked)}/${fmt(hiddenStats.total)}`, tone: DECK.inkMid },
                            ].map((f, i) => (
                                <div
                                    key={f.label}
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

                        {/* The platform line, filled to the board's completion.
                            It is the old rounded progress pill's job, done by the
                            board's own baseline — no label, because UNLOCKED and
                            REMAINING are standing directly above it. */}
                        <BoardMeter
                            value={totalAchievements > 0 ? unlockedCount / totalAchievements : 0}
                            tone={DECK.amber}
                            height={3}
                        />
                    </div>

                    {/* ── THE REGISTER ────────────────────────────────────── */}
                    <div style={{ flex: '0 0 auto', padding: isPhone ? '0 16px' : '0 26px' }}>
                        <div style={{
                            display: 'grid', gridTemplateColumns: registerTemplate,
                            alignItems: 'center', gap: '0 12px',
                            padding: isPhone ? '20px 0 6px' : '24px 0 8px',
                        }}>
                            <span />
                            <BoardLabel>Kind</BoardLabel>
                            <BoardLabel style={{ textAlign: 'right' }}>Held</BoardLabel>
                            <BoardLabel style={{ textAlign: 'right' }}>Missing</BoardLabel>
                            {!isPhone && <span />}
                            {!isPhone && <BoardLabel style={{ textAlign: 'right' }}>Status</BoardLabel>}
                        </div>

                        <div role="group" aria-label="Filter the list by kind">
                            {register.map((row, i) => {
                                const active = categoryFilter === row.key;
                                const statusWord = {
                                    complete: 'Complete', none: 'None yet', tracking: 'Chasing', empty: '—',
                                }[row.status];

                                return (
                                    <button
                                        key={row.key}
                                        className={`fib-board-hit fib-register-row${active ? ' is-active' : ''}`}
                                        onClick={() => setCategoryFilter(active ? null : row.key)}
                                        aria-pressed={active}
                                        aria-label={[
                                            row.label,
                                            `${fmt(row.held)} of ${fmt(row.total)} unlocked`,
                                            row.missing > 0 ? `${fmt(row.missing)} still to find` : null,
                                            statusWord,
                                        ].filter(Boolean).join('. ')}
                                        style={{
                                            display: 'grid', gridTemplateColumns: registerTemplate,
                                            alignItems: 'center', gap: '0 12px',
                                            width: '100%', padding: isPhone ? '7px 0' : '12px 0',
                                            border: 'none', textAlign: 'left', font: 'inherit',
                                            // The register's one per-row value. Amber
                                            // rather than a tier hue, because the
                                            // subject of this board is not a tier.
                                            '--fib-row-wash': `${DECK.amber}14`,
                                            '--fib-row-tone': DECK.amber,
                                        }}
                                    >
                                        <RowLamp
                                            state={row.status === 'complete' ? 'lit' : 'dark'}
                                            tone={DECK.amber}
                                        />
                                        <FlapText
                                            text={row.label}
                                            size={isPhone ? 15 : 16}
                                            tone={DECK.ink}
                                            weight={700}
                                            delay={280 + i * 55}
                                        />
                                        <FlapText
                                            text={fmt(row.held)} digits size={16}
                                            tone={DECK.ink} delay={300 + i * 55}
                                            style={{ justifyContent: 'flex-end' }}
                                        />
                                        <FlapText
                                            text={fmt(row.missing)} digits size={16}
                                            tone={row.missing > 0 ? DECK.inkMid : DECK.inkDim}
                                            delay={315 + i * 55}
                                            style={{ justifyContent: 'flex-end' }}
                                        />
                                        {!isPhone && (
                                            <BoardMeter
                                                value={row.total > 0 ? row.held / row.total : 0}
                                                tone={DECK.amber}
                                                spent={row.status === 'complete'}
                                            />
                                        )}
                                        {!isPhone && (
                                            <BoardLabel
                                                tone={row.status === 'complete' ? DECK.amber : DECK.inkMid}
                                                style={{ textAlign: 'right' }}
                                            >{statusWord}</BoardLabel>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── THE LIST ─────────────────────────────────────────────
                    Cut one step deeper than the board it sits in, with the
                    board's own edge as its top seam — the collection platform's
                    recess, holding rows instead of a canvas. */}
                <div style={{
                    // `1 1 0`, not `1 1 auto`. The collection board's platform is
                    // a canvas whose element has no intrinsic height, so an auto
                    // basis costs it nothing; this list is real DOM rows, and an
                    // auto basis made its flex basis the height of all 48 of them.
                    // The free space went hugely negative and the upper deck —
                    // the only sibling that may shrink — absorbed the whole
                    // difference, so on a phone the head was clipped through its
                    // own labels and the register vanished entirely.
                    flex: '1 1 0',
                    minHeight: isPhone ? '240px' : 0,
                    display: 'flex', flexDirection: 'column',
                    marginTop: isPhone ? '10px' : '14px',
                    background: 'rgba(0,0,0,0.30)',
                    boxShadow: `inset 0 1px 0 ${rail(0.08)}`,
                }}>
                    <div style={{
                        flex: '0 0 auto',
                        display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                        padding: isPhone ? '10px 16px' : '12px 26px',
                    }}>
                        {/* The readout names what is actually below it, which
                            means the lens and not only the category: it read
                            "All achievements · 3 shown" with the lens on
                            CHASING, and a heading contradicting its own count
                            is worse than no heading. The category wins when one
                            is picked, because that is the narrower claim and
                            the lens is still lit in the head. */}
                        <FlapText
                            text={categoryFilter
                                ? categoryLabel(categoryFilter)
                                : { all: 'All achievements', locked: 'Still chasing', unlocked: 'Unlocked' }[lens]}
                            size={16}
                            tone={DECK.ink}
                        />
                        <BoardLabel tone={DECK.inkDim}>{fmt(shown.length)} shown</BoardLabel>

                        <div style={{ flex: '1 1 auto', minWidth: '12px' }} />

                        {/* Search, because 86 rows without one is a scroll rather
                            than an interface — §7's words, and the reason the
                            collection board carries the same control in the same
                            place in the same material. */}
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
                                aria-label="Search achievements by name"
                                style={{
                                    width: isPhone ? '100px' : '128px',
                                    background: 'transparent', border: 'none', outline: 'none',
                                    color: DECK.ink,
                                    fontFamily: "'Barlow Condensed', system-ui, sans-serif",
                                    fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                }}
                            />
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

                    {/* The list's column headings sit INSIDE the scroller, so they
                        and the rows share whatever the scrollbar takes. §9 records
                        what happens when they do not. */}
                    <div className="fib-board-scroll" style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto' }}>
                        {loading ? (
                            <Notice>Reading the board…</Notice>
                        ) : error ? (
                            <Notice tone={DECK.amber}>{error}</Notice>
                        ) : shown.length === 0 ? (
                            <Notice>
                                {search || categoryFilter || lens !== 'all'
                                    ? 'Nothing matches those filters'
                                    : 'No achievements yet'}
                            </Notice>
                        ) : (
                            /*
                             * ── THE CASE, AS CELLS ──────────────────────────
                             *
                             * This was a ruled list for one build, and the owner
                             * rejected it on the one thing an achievement panel
                             * exists for: you could not see at a glance which
                             * ones you hold, or how close the rest are. The list
                             * was right about the material and wrong about the
                             * form — a register is read DOWN one column at a
                             * time, and "which of these forty-nine do I have" is
                             * not a question anyone reads down a column. It is
                             * answered by pattern across a field.
                             *
                             * So the cells come back. What does not come back is
                             * the card: no radius, no border, no per-category
                             * tint. A cell is a square section of the deck under
                             * the board's own grain — the same plinth the player
                             * record wears its badges in, and the same one the
                             * stage flanks are cut from — washed and lit along
                             * its foot in station amber when you hold it. Held
                             * and not-held are a difference in MATERIAL, not two
                             * hues from a ladder that means rarity elsewhere.
                             *
                             * Every cell is the same height and every cell
                             * carries a meter, whether or not it has a number.
                             * A grid whose cells are different heights cannot be
                             * scanned, and a bar present on some cells and
                             * missing from others reads as "no progress" where
                             * the truth is "no measurement".
                             */
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(auto-fill, minmax(${isPhone ? 200 : 264}px, 1fr))`,
                                gap: isPhone ? '8px' : '10px',
                                padding: isPhone ? '0 16px 16px' : '0 26px 22px',
                                alignContent: 'start',
                            }}>
                                {shown.map(row => (
                                    <Plinth
                                        key={row.id}
                                        live={row.isUnlocked}
                                        style={{
                                            display: 'flex', flexDirection: 'column', gap: '8px',
                                            padding: isPhone ? '11px 12px 12px' : '13px 14px 14px',
                                            // One height for every cell in the grid.
                                            // The description is clamped to two lines
                                            // rather than left to push the meter down,
                                            // so the meters line up across a row and
                                            // the eye can run along them.
                                            minHeight: isPhone ? '122px' : '134px',
                                            // A held cell is not only underlined: its
                                            // whole face carries a faint amber wash,
                                            // which is what makes the answer visible
                                            // from across the grid instead of one line
                                            // at a time. `backgroundColor` and not
                                            // `background`, so it sits UNDER the
                                            // plinth's own grain rather than replacing
                                            // it — the material has to survive the
                                            // state, which is the rule FlapBoard's
                                            // header records paying for once already.
                                            backgroundColor: row.isUnlocked ? 'rgba(255,183,94,0.05)' : undefined,
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                            {/* The mark, in a well cut into the cell,
                                                so each cell has one lit object in it
                                                rather than being lit all over. */}
                                            <span style={{
                                                width: '30px', height: '30px', flex: '0 0 auto',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: 'rgba(0,0,0,0.38)',
                                                boxShadow: row.isUnlocked
                                                    ? `inset 0 1px 0 ${rail(0.10)}, inset 0 -2px 0 ${DECK.amber}`
                                                    : `inset 0 1px 0 ${rail(0.06)}`,
                                                color: row.isUnlocked ? DECK.amber : DECK.inkDim,
                                            }}>
                                                {row.isSecret
                                                    ? <HelpCircle size={15} />
                                                    : <AchievementIcon name={row.icon} size={15} color="currentColor" />}
                                            </span>

                                            <span style={{ minWidth: 0, flex: '1 1 auto' }}>
                                                <BoardLabel
                                                    size={12}
                                                    tone={row.isUnlocked ? DECK.ink : DECK.inkMid}
                                                    style={{ whiteSpace: 'normal', display: 'block' }}
                                                >{row.name}</BoardLabel>
                                                <span style={{ display: 'block', marginTop: '4px' }}>
                                                    <BoardLabel size={10} tone={DECK.inkDim}>
                                                        {row.isCensored ? 'Secret' : categoryLabel(row.category)}
                                                    </BoardLabel>
                                                </span>
                                            </span>

                                            {/* The state as a mark, in the corner the
                                                eye already checks. A second copy of
                                                what the wash and the foot bar say, and
                                                deliberately so: colour alone never
                                                carries a state on this surface, and a
                                                tick survives greyscale and every kind
                                                of colour blindness. */}
                                            <span
                                                aria-hidden="true"
                                                style={{
                                                    flex: '0 0 auto',
                                                    color: row.isUnlocked ? DECK.amber : DECK.inkDim,
                                                    opacity: row.isUnlocked ? 1 : 0.7,
                                                }}
                                            >
                                                {row.isUnlocked ? <Check size={14} /> : <Lock size={12} />}
                                            </span>
                                        </div>

                                        {/* Prose, in the shell's own stack. The board's
                                            Barlow caps name things; a sentence is not a
                                            name, and setting one on a drum face is how a
                                            description stops being read. The full text
                                            stays in `title` for the rare row the clamp
                                            cuts. */}
                                        <div
                                            title={row.description}
                                            style={{
                                                color: DECK.inkDim,
                                                fontSize: isPhone ? '11px' : '11.5px',
                                                lineHeight: 1.45,
                                                flex: '1 1 auto',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                            }}
                                        >{row.description}</div>

                                        {/* The foot: the bar, and what the bar is
                                            worth. Every cell has one. */}
                                        <div>
                                            <BoardMeter
                                                value={row.isUnlocked ? 1 : (row.progressValue ?? 0)}
                                                tone={DECK.amber}
                                                height={4}
                                            />
                                            <div style={{
                                                marginTop: '6px',
                                                display: 'flex', alignItems: 'baseline',
                                                justifyContent: 'space-between', gap: '8px',
                                            }}>
                                                <BoardLabel size={10} tone={row.isUnlocked ? DECK.amber : DECK.inkMid}>
                                                    {row.isUnlocked
                                                        ? 'Unlocked'
                                                        : row.progressValue != null
                                                            ? `${fmt(row.current)} / ${fmt(row.target)}`
                                                            // No number, and no invented
                                                            // one. §7's rule: no lifetime
                                                            // total says how close you are
                                                            // to a single-round
                                                            // achievement, so the cell
                                                            // says that instead of
                                                            // printing a 0 that would read
                                                            // as a measurement.
                                                            : 'Not tracked'}
                                                </BoardLabel>
                                                {/* The date, and only the date.
                                                    A percentage sat here for one
                                                    build and it was the same fact
                                                    three times in one 24px strip —
                                                    the bar, the fraction beside it
                                                    and "77%". The bar IS the
                                                    percentage; what the fraction
                                                    adds is the scale, which the
                                                    bar cannot show. */}
                                                <BoardLabel size={10} tone={DECK.inkDim}>
                                                    {row.isUnlocked ? (row.date || '') : ''}
                                                </BoardLabel>
                                            </div>
                                        </div>
                                    </Plinth>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/** The list's one-line answers — loading, failed, and nothing matched. */
function Notice({ children, tone = DECK.inkMid }) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '12px', padding: '56px 24px', textAlign: 'center',
        }}>
            <Trophy size={28} color={DECK.inkDim} />
            <BoardLabel size={12} tone={tone}>{children}</BoardLabel>
        </div>
    );
}
