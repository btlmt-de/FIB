/* Compact badge cabinet with category colours, explicit earned states, and readable progress. */
import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../../../config/constants.js';
import { DECK, rail } from '../config/constants';
import { X, Trophy, Search, HelpCircle, Check, Lock } from 'lucide-react';
import { AchievementIcon } from '../../../utils/achievementIcons.jsx';
import { FlapText, BoardLabel, BoardMeter, Plinth, Segmented } from './collection/FlapBoard.jsx';
import './Achievements.css';
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

/* Special is the hidden-achievement category, revealed as achievements are earned. */
const CATEGORY_LABEL = {
    beginner: 'Beginner',
    spins: 'Spins',
    collection: 'Collection',
    duplicates: 'Duplicates',
    events: 'Events',
    special: 'Special',
};

const CATEGORY_COLOR = { beginner: '#9EB4CC', spins: '#84BAFF', collection: '#65D9BC', duplicates: '#C5A0FF', events: '#FFA876', special: '#EFD277' };
const categoryColor = key => CATEGORY_COLOR[key] || DECK.inkMid;

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
        // Reset before every run, not just the first. This effect re-fires on
        // userId / isOwnProfile, and without this a second run kept whatever the
        // first left behind: `loading` stays false so the previous player's board
        // sits there un-dimmed while the new one loads, and `error` is never
        // cleared, so one failed fetch showed its message over every later
        // success.
        setLoading(true);
        setError(null);
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

    // Missing secrets remain in the cabinet as anonymous, untracked placeholders.
    const visible = achievementList;

    const totalAchievements = achievementList.length;
    const unlockedCount = unlockedIds.size;
    const hiddenCount = useMemo(() => achievementList.filter(a => a.hidden || a.category === 'special').length, [achievementList]);

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
        const isSecret = ((a.hidden || a.category === 'special') && !isUnlocked) || isCensored;
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
                : (isSecret ? 'Hidden achievement - discover it yourself!' : a.description),
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

    const boardTitle = isOwnProfile ? 'Achievements' : `${username || 'Player'}`;

    return (
        <div
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
            className="fib-achievements"
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
                                        paddingTop: 0, paddingBottom: 0,
                                        paddingLeft: i === 0 ? 0 : isPhone ? '12px' : '26px',
                                        paddingRight: isPhone ? '12px' : '26px',
                                        boxShadow: i > 0 ? `inset 1px 0 0 ${rail(0.07)}` : undefined,
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


                    <div className="fib-achievement-categories" role="group" aria-label="Filter achievements by category">
                        <button type="button" className="fib-achievement-category fib-board-hit"
                            aria-pressed={!categoryFilter} onClick={() => setCategoryFilter(null)}
                            style={{ '--achievement-color': DECK.inkMid }}>All categories</button>
                        {register.map(row => (
                            <button type="button" key={row.key}
                                className="fib-achievement-category fib-board-hit"
                                aria-pressed={categoryFilter === row.key}
                                aria-label={`${row.label}, ${fmt(row.held)} of ${fmt(row.total)} unlocked`}
                                onClick={() => setCategoryFilter(categoryFilter === row.key ? null : row.key)}
                                style={{ '--achievement-color': categoryColor(row.key) }}>
                                <span>{row.label}</span>
                                <span className="fib-achievement-category-count">{fmt(row.held)} / {fmt(row.total)}</span>
                                {row.status === 'complete' && <Check size={12} aria-hidden="true" />}
                            </button>
                        ))}
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
                        <BoardLabel tone={DECK.inkMid}>{fmt(shown.length)} shown</BoardLabel>

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
                                    fontSize: '14px', fontWeight: 600, letterSpacing: '0.08em',
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

                            <div className="fib-achievement-grid">
                                {shown.map(row => {
                                    const tone = categoryColor(row.category);
                                    return (
                                        <article key={row.id}
                                            className={`fib-achievement-card${row.isUnlocked ? ' is-earned' : ''}`}
                                            style={{ '--achievement-color': tone }}>
                                            <div className="fib-achievement-card-head">
                                                <span className="fib-achievement-badge" aria-hidden="true">
                                                    {row.isSecret ? <HelpCircle size={22} /> : <AchievementIcon name={row.icon} size={22} color="currentColor" />}
                                                </span>
                                                <span className="fib-achievement-state" aria-label={row.isUnlocked ? 'Unlocked' : 'Locked'}>
                                                    {row.isUnlocked ? <Check size={16} /> : <Lock size={14} />}
                                                </span>
                                            </div>
                                            <div>
                                                <BoardLabel size={12} tone={tone}>{categoryLabel(row.category)}</BoardLabel>
                                                <h3 className="fib-achievement-name">{row.name}</h3>
                                                <p className="fib-achievement-description">{row.description}</p>
                                            </div>
                                            <div className="fib-achievement-progress">
                                                {(row.isUnlocked || row.progressValue != null) && (
                                                    <div role="progressbar" aria-label={`${row.name} progress`}
                                                        aria-valuemin={0} aria-valuemax={100}
                                                        aria-valuenow={row.isUnlocked ? 100 : Math.round(row.progressValue * 100)}
                                                        aria-valuetext={row.isUnlocked ? 'Unlocked' : `${fmt(row.current)} of ${fmt(row.target)}`}>
                                                        <BoardMeter value={row.isUnlocked ? 1 : row.progressValue} tone={tone} height={3} spent={row.isUnlocked} />
                                                    </div>
                                                )}
                                                <div className="fib-achievement-progress-labels">
                                                    <BoardLabel size={12} tone={row.isUnlocked ? tone : DECK.inkMid}>
                                                        {row.isUnlocked ? 'Unlocked' : row.progressValue != null
                                                            ? `${fmt(row.current)} / ${fmt(row.target)}`
                                                            : row.isSecret ? 'Keep exploring' : 'Not tracked'}
                                                    </BoardLabel>
                                                    <BoardLabel size={12} tone={DECK.inkMid}>{row.date || ''}</BoardLabel>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
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
