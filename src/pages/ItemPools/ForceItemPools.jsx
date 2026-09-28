import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import LayoutList from 'lucide-react/dist/esm/icons/layout-list';
import List from 'lucide-react/dist/esm/icons/list';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Search from 'lucide-react/dist/esm/icons/search';
import X from 'lucide-react/dist/esm/icons/x';
import Footer from '../../components/common/Footer.jsx';
import { TagGlyph } from '../../wiki/game/items.jsx';
import { STAGES, TAGS } from '../../wiki/tokens.js';
import { PAPER_VERSION } from '../../wiki/data/atlas.js';
import ChangeTray from './ChangeTray.jsx';
import Inspector from './Inspector.jsx';
import { McLine } from './McText.jsx';
import { Slot, Sprite, StageWord } from './parts.jsx';
import { stripMc } from './mcFormat.js';
import useChanges from './useChanges.js';
import { CATEGORY_CONFIG, buildTagCategoryMap, categorizeItem, categoryName, loadItemTags } from './categories.js';
import {
    DEFAULT_BRANCH, POOL_PATH, STAGE_KEYS, TAG_KEYS, displayNameOf, getViewBranch, loadPool,
    loadPublicBranches, loadRegistry, setViewBranch,
} from './poolData.js';
import '../../wiki/pages/pools.css';

/*
 * Item Pools (THE EXPLORER'S ATLAS): the workspace where the pool and its /info
 * descriptions are maintained, and where anyone can look through them.
 *
 * Maintainers first (owner, Sept 2026). The page is one screen: the pool on the left,
 * an inspector on the right, and a tray along the bottom that collects every staged
 * change until it is committed. It replaced a browse page with four modals on top of
 * it (a description editor, a pool manager, a statistics report and a commit
 * history), each with its own idea of signing in and saving.
 *
 * Three ways to look at the pool, because they serve three jobs:
 *
 *   Catalogue   the default. A large texture, the name, the stage and tags as chips,
 *               and /info when there is one: every entry says what it is and how FIB
 *               classifies it without a hover. Five across on a 1920px screen.
 *   Inventory   52px slots, the densest view, for people who read textures. Names
 *               and classification are in the tooltip.
 *   List        one row per item, for inspection: stage, tags, the first /info line.
 *
 * *The Catalogue is a correction, and the reason is worth keeping.* The first build
 * of this page made the Inventory the default, and the owner found that it had gone
 * too far towards density: to answer "where is Ancient Debris" or "is this a Nether
 * item" a reader had to recognise a texture or decode a 2px bar and hover. This page
 * is an item database first; the stage bar and tag glyph are reinforcement, never
 * the only place a classification is written.
 *
 *   the browser     every item, filtered and grouped; click to inspect, Ctrl or Cmd
 *                   to add to a selection, Shift for a range, arrows to move
 *   the inspector   the overview when nothing is selected, an item, or a selection
 *   the tray        see ChangeTray.jsx
 *
 * The data paths are poolData.js, the file rewrites edits.js, GitHub github.js.
 */

const fmt = (n) => n.toLocaleString('en-US');
const VIEW_KEY = 'fib_pools_view';
const VIEWS = [
    { key: 'catalogue', label: 'Catalogue', Icon: LayoutList },
    { key: 'inventory', label: 'Inventory', Icon: LayoutGrid },
    { key: 'list', label: 'List', Icon: List },
];

const INFO_FILTERS = [
    { key: 'any', label: 'Any' },
    { key: 'with', label: 'Has /info' },
    { key: 'without', label: 'No /info' },
];

function readParams() {
    try {
        const p = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
        const stage = p.get('state')?.toUpperCase();
        const tags = (p.get('tag') || '').toUpperCase().split(',').filter((t) => TAG_KEYS.includes(t));
        return {
            stage: STAGE_KEYS.includes(stage) ? stage : 'ALL',
            tags,
            q: p.get('q') || '',
            item: p.get('item')?.toUpperCase() || null,
        };
    } catch {
        return { stage: 'ALL', tags: [], q: '', item: null };
    }
}

/** Catalogue, Inventory or List: a per-viewer convenience, remembered in this browser. */
function useMode() {
    const [mode, setMode] = useState(() => {
        try {
            const saved = localStorage.getItem(VIEW_KEY);
            return VIEWS.some((v) => v.key === saved) ? saved : 'catalogue';
        } catch { return 'catalogue'; }
    });
    const set = (m) => { setMode(m); try { localStorage.setItem(VIEW_KEY, m); } catch { /* per-viewer only */ } };
    return [mode, set];
}

function ago(ts) {
    if (!ts) return '';
    const m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    return `${Math.round(m / 60)} h ago`;
}

/* ── The page ───────────────────────────────────────────────────────────────── */

export default function ForceItemPools() {
    const initial = useMemo(readParams, []);
    const [items, setItems] = useState([]);
    const [loadedAt, setLoadedAt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [branch, setBranch] = useState(getViewBranch);
    const [branches, setBranches] = useState([DEFAULT_BRANCH]);
    const [registry, setRegistry] = useState([]);
    const [tagMap, setTagMap] = useState(null);

    const [view, setView] = useState('pool');
    const [q, setQ] = useState(initial.q);
    const [stage, setStage] = useState(initial.stage);
    const [tags, setTags] = useState(initial.tags);
    const [info, setInfo] = useState('any');
    const [category, setCategory] = useState(null);
    const [stagedOnly, setStagedOnly] = useState(false);
    const [group, setGroup] = useState('none');
    const [mode, setMode] = useMode();
    const [selection, setSelection] = useState(initial.item ? [initial.item] : []);
    const [overview, setOverview] = useState(false);
    const [refineOpen, setRefineOpen] = useState(false);
    const anchor = useRef(null);
    const bar = useRef(null);
    const main = useRef(null);

    // The inspector and the drawer sit under the sticky toolbar, whose height changes
    // as the filters wrap; measured into --ip-top rather than guessed.
    useLayoutEffect(() => {
        const el = bar.current;
        if (!el) return undefined;
        const set = () => main.current?.style.setProperty('--ip-top', `${56 + el.offsetHeight}px`);
        set();
        const ro = new ResizeObserver(set);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const changes = useChanges(items);
    const byMaterial = useMemo(() => new Map(items.map((i) => [i.material, i])), [items]);

    const load = useCallback(async (b, fresh = false) => {
        setLoading(true); setError(null);
        try {
            const { items: next, timestamp } = await loadPool(b, { fresh });
            setItems(next); setLoadedAt(timestamp);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let live = true;
        loadPool(getViewBranch()).then(({ items: next, timestamp }) => {
            if (!live) return;
            setItems(next); setLoadedAt(timestamp); setLoading(false);
        }).catch((e) => { if (live) { setError(e.message); setLoading(false); } });
        loadPublicBranches().then((b) => { if (live) setBranches(b); });
        loadRegistry().then((r) => { if (live) setRegistry(r); });
        loadItemTags().then((t) => { if (live && t) setTagMap(buildTagCategoryMap(t)); }).catch(() => {});
        return () => { live = false; };
    }, []);

    const switchBranch = (b) => { setBranch(b); setViewBranch(b); load(b, true); };
    const categoryOf = useCallback((m) => categorizeItem(m, tagMap), [tagMap]);

    /* What the browser can show. A staged addition is part of the pool view already. */
    const missing = useMemo(() => registry.filter((m) => !byMaterial.has(m)), [registry, byMaterial]);
    const universe = useMemo(() => {
        if (view === 'missing') {
            return missing.map((m) => {
                const c = changes.pool[m];
                return c?.type === 'add'
                    ? { material: m, displayName: displayNameOf(m), state: c.state, tags: c.tags, description: changes.info[m]?.lines ?? null, added: true }
                    : { material: m, displayName: displayNameOf(m), tags: [], missing: true };
            });
        }
        const adds = Object.entries(changes.pool).filter(([m, c]) => c.type === 'add' && !byMaterial.has(m))
            .map(([m, c]) => ({ material: m, displayName: displayNameOf(m), state: c.state, tags: c.tags, description: changes.info[m]?.lines ?? null, added: true }));
        return [...items.map(changes.effective), ...adds];
    }, [view, missing, items, changes, byMaterial]);

    const shown = useMemo(() => {
        const query = q.trim().toLowerCase().replace(/\s+/g, '_');
        const pending = (m) => Boolean(changes.pool[m] || changes.info[m]);
        return universe.filter((i) => {
            if (query && !i.material.toLowerCase().includes(query) && !i.displayName.toLowerCase().includes(q.trim().toLowerCase())) return false;
            if (category && categoryOf(i.material) !== category) return false;
            if (stagedOnly && !pending(i.material)) return false;
            if (view === 'missing') return true;
            if (stage !== 'ALL' && i.state !== stage) return false;
            if (tags.length && !tags.some((t) => i.tags.includes(t))) return false;
            if (info === 'with' && !i.description?.length) return false;
            if (info === 'without' && i.description?.length) return false;
            return true;
        }).sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [universe, q, category, stagedOnly, view, stage, tags, info, changes, categoryOf]);

    const groups = useMemo(() => {
        if (group === 'stage' && view === 'pool') {
            return STAGE_KEYS.map((s) => ({ key: s, title: STAGES[s].label, ink: STAGES[s].ink, items: shown.filter((i) => i.state === s) }))
                .filter((g) => g.items.length);
        }
        if (group === 'category' && tagMap) {
            const by = new Map();
            for (const i of shown) {
                const c = categoryOf(i.material);
                if (!by.has(c)) by.set(c, []);
                by.get(c).push(i);
            }
            const order = [...CATEGORY_CONFIG.map((c) => c.id), 'other'];
            return order.filter((id) => by.has(id)).map((id) => ({ key: id, title: categoryName(id), items: by.get(id) }));
        }
        return [{ key: 'all', title: null, items: shown }];
    }, [group, view, shown, tagMap, categoryOf]);

    const order = useMemo(() => groups.flatMap((g) => g.items.map((i) => i.material)), [groups]);

    /* The pool's own breakdown, for the filter labels and the narrow-screen summary. */
    const counts = useMemo(() => {
        const pool = view === 'pool' ? universe : [];
        const c = { total: pool.length };
        for (const s of STAGE_KEYS) c[s] = pool.filter((i) => i.state === s).length;
        for (const t of TAG_KEYS) c[t] = pool.filter((i) => i.tags.includes(t)).length;
        return c;
    }, [view, universe]);

    /* Selection: click, Ctrl or Cmd to add, Shift for a range, Escape to clear. */
    const select = useCallback((material, e) => {
        if (e?.shiftKey && anchor.current) {
            const a = order.indexOf(anchor.current);
            const b = order.indexOf(material);
            if (a >= 0 && b >= 0) {
                const range = order.slice(Math.min(a, b), Math.max(a, b) + 1);
                setSelection((s) => [...new Set([...s, ...range])]);
                return;
            }
        }
        anchor.current = material;
        if (e?.ctrlKey || e?.metaKey) {
            setSelection((s) => (s.includes(material) ? s.filter((x) => x !== material) : [...s, material]));
            return;
        }
        setSelection((s) => (s.length === 1 && s[0] === material ? [] : [material]));
    }, [order]);

    useEffect(() => {
        const esc = (e) => {
            if (e.key !== 'Escape' || document.querySelector('.ip-drawer')) return;
            if (e.target.closest?.('input, textarea, select')) return;
            setSelection([]); setOverview(false);
        };
        window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
    }, []);

    const onFilter = (f) => {
        setSelection([]); setOverview(false);
        if (f.view) { setView(f.view); return; }
        setView('pool');
        if (f.stage) setStage(f.stage);
        if (f.tag) setTags([f.tag]);
        if (f.info) setInfo(f.info);
        if (f.category) setCategory(f.category);
    };

    const clearFilters = () => { setQ(''); setStage('ALL'); setTags([]); setInfo('any'); setCategory(null); setStagedOnly(false); };
    const filterCount = (q ? 1 : 0) + (stage !== 'ALL') + tags.length + (info !== 'any') + (category ? 1 : 0) + (stagedOnly ? 1 : 0);
    const inspecting = selection.length > 0 || overview;

    const onInfoCommitted = (b, snapshot) => {
        if (b !== branch) return;
        const next = new Map(snapshot.map((c) => [c.material, c.lines]));
        setItems((xs) => xs.map((i) => (next.has(i.material) ? { ...i, description: next.get(i.material) } : i)));
    };

    return (
        <main className="ip" ref={main}>
            <header className="ip-bar" ref={bar}>
                <div className="ip-wrap ip-bar-top">
                    <h1 className="ip-title">Item Pools</h1>
                    <p className="ip-facts">
                        <span>
                            Every item the game can hand out, live from the plugin's{' '}
                            <a className="wk-link" href={`https://github.com/McPlayHDnet/ForceItemBattle/blob/main/${POOL_PATH}`} target="_blank" rel="noopener noreferrer">item pool</a>
                        </span>
                        <label className="ip-branch">
                            /info from
                            <select value={branch} onChange={(e) => switchBranch(e.target.value)} disabled={loading} aria-label="Which branch's config.yml to show and edit">
                                {branches.map((b) => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </label>
                        <button type="button" className="ip-link ip-refresh" onClick={() => load(branch, true)} disabled={loading} title={loading ? 'Reading GitHub' : `Read ${ago(loadedAt)}`}>
                            <RefreshCw size={13} aria-hidden="true" className={loading ? 'ip-spin' : ''} /> {loading ? 'Reading…' : `Read ${ago(loadedAt)}`}
                        </button>
                        <button type="button" className="ip-link ip-overview-btn" onClick={() => { setSelection([]); setOverview(true); }}>Overview</button>
                    </p>
                </div>

                {/* The primary line: find something, choose the pool, choose a stage. */}
                <div className="ip-wrap ip-filters">
                    <label className="ip-search">
                        <Search size={18} aria-hidden="true" />
                        <span className="wk-sr">Search items</span>
                        <input type="search" value={q} onChange={(e) => setQ(e.target.value)}
                               placeholder={view === 'missing' ? 'Search what is missing' : 'Search 1,500 items, e.g. ancient debris'} />
                    </label>

                    <div className="ip-seg ip-seg--primary" role="radiogroup" aria-label="Which items">
                        <button type="button" role="radio" aria-checked={view === 'pool'} onClick={() => { setView('pool'); setSelection([]); }}>
                            In the pool <span className="ip-seg-n">{fmt(items.length)}</span>
                        </button>
                        <button type="button" role="radio" aria-checked={view === 'missing'} onClick={() => { setView('missing'); setSelection([]); }}>
                            Missing <span className="ip-seg-n">{registry.length ? fmt(missing.length) : '…'}</span>
                        </button>
                    </div>

                    {view === 'pool' && (
                        <div className="ip-seg ip-seg--primary" role="radiogroup" aria-label="Stage">
                            <button type="button" role="radio" aria-checked={stage === 'ALL'} onClick={() => setStage('ALL')}>All<span className="ip-wide"> stages</span></button>
                            {STAGE_KEYS.map((s) => (
                                <button key={s} type="button" role="radio" aria-checked={stage === s} onClick={() => setStage(s)} className="ip-seg-stage" data-stage={s.toLowerCase()}>
                                    <span style={{ color: STAGES[s].ink }}>{STAGES[s].label}</span> <span className="ip-seg-n">{fmt(counts[s])}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {/* On a phone the secondary line folds behind this, so the items start near the top. */}
                    <button type="button" className="ip-link ip-refine-btn" aria-expanded={refineOpen} aria-controls="ip-refine"
                            onClick={() => setRefineOpen((v) => !v)}>
                        Filters and view{tags.length + (info !== 'any') + (group !== 'none') > 0 ? ` (${tags.length + (info !== 'any') + (group !== 'none')})` : ''}
                    </button>
                </div>

                {/* The secondary line, quieter: words that light up, not more blocks. */}
                <div className="ip-wrap ip-refine" id="ip-refine" data-open={refineOpen || undefined}>
                    {view === 'pool' && (
                        <>
                            <span className="ip-refine-group" role="group" aria-label="Tags">
                                <span className="ip-refine-label" aria-hidden="true">Tags</span>
                                {TAG_KEYS.map((t) => {
                                    const on = tags.includes(t);
                                    return (
                                        <button key={t} type="button" className="ip-toggle" aria-pressed={on} onClick={() => setTags(on ? tags.filter((x) => x !== t) : [...tags, t])}>
                                            <TagGlyph tag={t} size={10} /> <span style={{ color: TAGS[t].ink }}>{TAGS[t].label}</span> <span className="ip-seg-n">{counts[t]}</span>
                                        </button>
                                    );
                                })}
                            </span>
                            <span className="ip-refine-group" role="radiogroup" aria-label="/info">
                                <span className="ip-refine-label" aria-hidden="true">/info</span>
                                {INFO_FILTERS.map((f) => (
                                    <button key={f.key} type="button" role="radio" className="ip-toggle" aria-checked={info === f.key} onClick={() => setInfo(f.key)}>{f.label}</button>
                                ))}
                            </span>
                        </>
                    )}
                    <span className="ip-refine-end">
                        <label className="ip-refine-group">
                            <span className="ip-refine-label">Group</span>
                            <select className="ip-quiet-select" value={group} onChange={(e) => setGroup(e.target.value)}>
                                <option value="none">None</option>
                                {view === 'pool' && <option value="stage">By stage</option>}
                                <option value="category" disabled={!tagMap}>By category</option>
                            </select>
                        </label>
                        <span className="ip-refine-group" role="radiogroup" aria-label="View">
                            <span className="ip-refine-label" aria-hidden="true">View</span>
                            {VIEWS.map((v) => (
                                <button key={v.key} type="button" role="radio" className="ip-toggle" aria-checked={mode === v.key} onClick={() => setMode(v.key)}>
                                    <v.Icon size={15} aria-hidden="true" /> {v.label}
                                </button>
                            ))}
                        </span>
                    </span>
                </div>
            </header>

            <div className="ip-wrap ip-work" data-inspecting={inspecting || undefined}>
                <section className="ip-browse" aria-label="Items">
                    {/* Where the sidebar has folded away, the pool's breakdown stays in view. */}
                    {view === 'pool' && counts.total > 0 && (
                        <p className="ip-summary">
                            {STAGE_KEYS.map((s) => <button key={s} type="button" className="ip-link" onClick={() => setStage(s)}><span style={{ color: STAGES[s].ink }}>{STAGES[s].label}</span> <span className="wk-datum">{fmt(counts[s])}</span></button>)}
                            {TAG_KEYS.map((t) => <button key={t} type="button" className="ip-link" onClick={() => setTags([t])}><TagGlyph tag={t} size={9} /> <span style={{ color: TAGS[t].ink }}>{TAGS[t].label}</span> <span className="wk-datum">{fmt(counts[t])}</span></button>)}
                        </p>
                    )}
                    <div className="ip-results" aria-live="polite">
                        <span>Showing <span className="wk-datum">{fmt(shown.length)}</span> of <span className="wk-datum">{fmt(universe.length)}</span></span>
                        {category && <Chip onClear={() => setCategory(null)}>{categoryName(category)}</Chip>}
                        {stagedOnly && <Chip onClear={() => setStagedOnly(false)}>Staged only</Chip>}
                        {(changes.poolCount + changes.infoCount > 0) && !stagedOnly && (
                            <button type="button" className="ip-link" onClick={() => setStagedOnly(true)}>Only what is staged</button>
                        )}
                        {filterCount > 0 && <button type="button" className="ip-link" onClick={clearFilters}>Clear filters</button>}
                        {view === 'missing' && <span className="ip-results-note">Items in Minecraft {PAPER_VERSION} that the pool does not register. Some are left out on purpose.</span>}
                        {selection.length > 1 && <span className="ip-results-note">{selection.length} selected</span>}
                    </div>

                    {error && (
                        <div className="ip-error-block" role="alert">
                            <p><strong>The pool could not be read.</strong> {error}</p>
                            <button type="button" className="wk-btn ip-btn" onClick={() => load(branch, true)}>Try again</button>
                        </div>
                    )}
                    {loading && !items.length && !error && <Skeleton mode={mode} />}
                    {!loading && !error && shown.length === 0 && (
                        <div className="ip-empty">
                            <p>{view === 'missing' && !registry.length ? 'Reading the Minecraft item list…' : 'Nothing matches.'}</p>
                            {filterCount > 0 && <button type="button" className="wk-btn wk-btn--quiet ip-btn" onClick={clearFilters}>Clear filters</button>}
                        </div>
                    )}

                    {!error && shown.length > 0 && (
                        <Browser groups={groups} mode={mode} selection={selection} onSelect={select}
                                 changes={changes} order={order} />
                    )}
                </section>

                <aside className="ip-inspect" aria-label="Inspector">
                    <Inspector
                        selection={selection} onClear={() => { setSelection([]); setOverview(false); }}
                        byMaterial={byMaterial} changes={changes} pool={items} missing={missing}
                        onFilter={onFilter} categoryOf={categoryOf} categoriesReady={Boolean(tagMap)}
                    />
                </aside>
            </div>

            <ChangeTray changes={changes} byMaterial={byMaterial} viewBranch={branch} onInfoCommitted={onInfoCommitted} />
            <Footer />
        </main>
    );
}

function Chip({ children, onClear }) {
    return (
        <span className="ip-chip">
            {children}
            <button type="button" onClick={onClear} aria-label={`Remove the ${children} filter`}><X size={12} /></button>
        </span>
    );
}

function Skeleton({ mode }) {
    if (mode === 'inventory') {
        return (
            <div className="ip-grid" aria-label="Reading the pool from GitHub" role="status">
                {Array.from({ length: 60 }, (_, i) => <span key={i} className="wk-slot ip-ghost" style={{ '--slot': '52px', '--i': i }} />)}
            </div>
        );
    }
    return (
        <div className={mode === 'list' ? 'ip-list' : 'ip-catalogue'} aria-label="Reading the pool from GitHub" role="status">
            {Array.from({ length: mode === 'list' ? 14 : 32 }, (_, i) => (
                <span key={i} className={`${mode === 'list' ? 'ip-row-item' : 'ip-entry'} ip-ghost`} style={{ '--i': i }}>
                    {mode === 'list' ? <span className="wk-slot" style={{ '--slot': '36px' }} /> : <span className="ip-entry-art ip-entry-art--ghost" />}
                </span>
            ))}
        </div>
    );
}

/* ── The browser ────────────────────────────────────────────────────────────── */

/*
 * One tab stop for the whole browser, as an inventory has: arrows move, Home and End
 * jump, Enter or Space inspects (the entries are real buttons). Up and down move by
 * one row of whatever the view is, measured, so it works at any window size.
 *
 * The tooltip is immediate in the Inventory, where it is the only place a name is
 * written, and waits a moment in the Catalogue, where the entry already says what it
 * is and the tooltip only adds the /info preview: a pointer crossing the catalogue
 * should not strobe tooltips.
 */
const TIP_DELAY = { inventory: 0, catalogue: 450 };

function Browser({ groups, mode, selection, onSelect, changes, order }) {
    const ref = useRef(null);
    const timer = useRef(null);
    const [focus, setFocus] = useState(order[0]);
    const [tip, setTip] = useState(null);
    const current = order.includes(focus) ? focus : order[0];
    useEffect(() => () => clearTimeout(timer.current), []);

    const move = (e) => {
        const keys = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity };
        let delta = keys[e.key];
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const grid = ref.current.querySelector('.ip-grid, .ip-catalogue');
            const first = grid?.firstElementChild;
            let cols = 1;
            if (mode !== 'list' && first) {
                const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
                cols = Math.max(1, Math.round((grid.clientWidth + gap) / (first.offsetWidth + gap)));
            }
            delta = e.key === 'ArrowDown' ? cols : -cols;
        }
        if (delta === undefined) return;
        e.preventDefault();
        const i = order.indexOf(current);
        const next = order[Math.min(order.length - 1, Math.max(0, i + (Number.isFinite(delta) ? delta : delta > 0 ? order.length : -order.length)))];
        setFocus(next);
        ref.current.querySelector(`[data-m="${next}"]`)?.focus();
    };

    const hover = (i) => ({
        onMouseEnter: (e) => {
            if (!(mode in TIP_DELAY)) return;
            const rect = e.currentTarget.getBoundingClientRect();
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setTip({ item: i, rect }), TIP_DELAY[mode]);
        },
        onMouseLeave: () => { clearTimeout(timer.current); setTip(null); },
    });

    const props = (i) => {
        const staged = changes.pool[i.material] || changes.info[i.material];
        return {
            'data-m': i.material,
            tabIndex: i.material === current ? 0 : -1,
            'aria-pressed': selection.includes(i.material),
            'aria-label': label(i, changes),
            'data-staged': staged ? (changes.pool[i.material]?.type ?? 'info') : undefined,
            'data-removed': i.removed || undefined,
            onClick: (e) => { setFocus(i.material); setTip(null); onSelect(i.material, e); },
            onFocus: () => setFocus(i.material),
        };
    };

    return (
        <div ref={ref} className="ip-groups" onKeyDown={move} data-mode={mode}>
            {mode === 'list' && (
                <div className="ip-list-head" aria-hidden="true">
                    <span /><span>Item</span><span>Stage</span><span>Tags</span><span>/info</span><span>Staged</span>
                </div>
            )}
            {groups.map((g) => (
                <section key={g.key} className="ip-group" aria-label={g.title ?? 'Items'}>
                    {g.title && <h2 className="ip-group-title" style={g.ink ? { color: g.ink } : undefined}>{g.title} <span className="ip-group-n">{g.items.length}</span></h2>}
                    {mode === 'catalogue' && (
                        <div className="ip-catalogue">
                            {g.items.map((i) => <Entry key={i.material} item={i} props={{ ...props(i), ...hover(i) }} />)}
                        </div>
                    )}
                    {mode === 'inventory' && (
                        <div className="ip-grid">
                            {g.items.map((i) => (
                                <button key={i.material} type="button" className="ip-cell" {...props(i)} {...hover(i)}>
                                    <Slot item={i} size={52} />
                                    {i.description?.length > 0 && <span className="ip-info-mark" aria-hidden="true" />}
                                </button>
                            ))}
                        </div>
                    )}
                    {mode === 'list' && (
                        <div className="ip-list">
                            {g.items.map((i) => <Row key={i.material} item={i} props={props(i)} changes={changes} />)}
                        </div>
                    )}
                </section>
            ))}
            {tip && <Tip {...tip} changes={changes} />}
        </div>
    );
}

/*
 * A catalogue entry. One component, one fixed grid, so that across hundreds of them
 * the only thing that varies is the item:
 *
 *   texture   a fixed 56px column, the 52px sprite on its own: no slot, no stage bar,
 *             no glyph. The item art is the strongest thing this page has.
 *   name      a fixed two-line area, 16px, whether the name needs one line or two.
 *   tags      a fixed row under it: the stage and any tags as outlined chips in their
 *             own ink, then "/info" as a quiet word at the end when there is one.
 *
 * Every name starts at the same x, every chip row at the same y, every entry is the
 * same height. One piece of information gets one representation: LATE is written
 * once, as a chip, and nothing else on the entry is red.
 *
 * *This replaced a first Catalogue* whose labels followed the name's wrapping, sat
 * as free-floating coloured words with glyphs, and kept the slot's stage bar under a
 * 38px texture, eight across. The owner found it noisy at scale and the art too
 * small; fewer, calmer entries (five across at 1920px) read better than more.
 *
 * The stage is the chip; a world tag (Nether, End, Extreme) follows it on the same
 * row as its glyph and word with no box, because the stage is the classification and
 * a tag is metadata on it (owner, final pass, Sept 2026: three equal chips gave the
 * two the same weight). Still on the fixed row, so never free-floating like the first
 * Catalogue's words.
 */
function Entry({ item: i, props }) {
    return (
        <button type="button" className="ip-entry" {...props}>
            <span className="ip-entry-art" aria-hidden="true"><Sprite material={i.material} /></span>
            <span className="ip-entry-text">
                <span className="ip-entry-name">{i.displayName}</span>
                <span className="ip-entry-meta" aria-hidden="true">
                    {i.missing
                        ? <span className="ip-chip-tag" style={{ '--c': 'var(--wk-ink-3)' }}>Not in pool</span>
                        : (
                            <>
                                {i.state && <span className="ip-chip-tag" style={{ '--c': STAGES[i.state].ink }}>{STAGES[i.state].label}</span>}
                                {i.tags.map((t) => <span key={t} className="ip-chip-tag ip-chip-tag--world" style={{ '--c': TAGS[t].ink }}><TagGlyph tag={t} size={8} />{TAGS[t].label}</span>)}
                            </>
                        )}
                    {i.description?.length > 0 && <span className="ip-entry-infoword">/info</span>}
                </span>
            </span>
        </button>
    );
}

function stagedWords(i, changes) {
    const c = changes.pool[i.material];
    const words = [];
    if (c?.type === 'add') words.push('staged to be added');
    if (c?.type === 'modify') words.push('pool change staged');
    if (c?.type === 'remove') words.push('staged for removal');
    if (changes.info[i.material]) words.push('/info change staged');
    return words;
}

function label(i, changes) {
    const parts = [i.displayName];
    if (i.missing) parts.push('not in the pool');
    else {
        if (i.state) parts.push(`${STAGES[i.state].label} stage`);
        if (i.tags.length) parts.push(i.tags.map((t) => TAGS[t].label).join(', '));
        parts.push(i.description?.length ? 'has /info' : 'no /info');
    }
    return [...parts, ...stagedWords(i, changes)].join(', ');
}

function Row({ item: i, props, changes }) {
    const firstLine = i.description?.find((l, n) => n > 0 && stripMc(l).trim()) ?? null;
    const staged = stagedWords(i, changes);
    return (
        <button type="button" className="ip-row-item" {...props}>
            <Slot item={i} size={36} />
            <span className="ip-row-name">
                <span>{i.displayName}</span>
                <code className="ip-mono">{i.material.toLowerCase()}</code>
            </span>
            <span className="ip-row-stage">{!i.missing && <StageWord state={i.state} />}</span>
            <span className="ip-row-tags">{i.tags.map((t) => <span key={t} className="ip-tagword" style={{ color: TAGS[t].ink }}><TagGlyph tag={t} size={9} /> {TAGS[t].label}</span>)}</span>
            <span className="ip-row-info">{i.missing ? <span className="ip-dim">Not in the pool</span> : firstLine ? <McLine text={firstLine} /> : <span className="ip-dim">No /info</span>}</span>
            <span className="ip-row-staged">{staged.length > 0 && staged.join(', ')}</span>
        </button>
    );
}

/* The game's tooltip, for a slot under the pointer: what the slot's marks say, in words. */
function Tip({ item: i, rect, changes }) {
    const ref = useRef(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const box = el.getBoundingClientRect();
        let x = rect.right + 10;
        if (x + box.width > window.innerWidth - 8) x = rect.left - box.width - 10;
        const y = Math.min(Math.max(8, rect.top - 4), window.innerHeight - box.height - 8);
        el.style.left = `${Math.max(8, x)}px`;
        el.style.top = `${y}px`;
        el.style.visibility = 'visible';
    }, [rect]);
    const staged = stagedWords(i, changes);
    // /info's own lines, as lore under the name: the header repeats the name, and the
    // spacers are spacing, so the preview starts at the first line that says something.
    const lines = (i.description ?? []).slice(1).filter((l) => stripMc(l).trim());
    const preview = lines.slice(0, 4);
    const more = lines.length - preview.length;
    return (
        <div ref={ref} className="wk-tip ip-tip" role="tooltip" style={{ left: -9999, top: -9999, visibility: 'hidden' }}>
            <div className="wk-tip-name">{i.displayName}</div>
            {i.missing
                ? <div className="wk-tip-line">Not in the pool</div>
                : (
                    <>
                        <div className="wk-tip-line"><StageWord state={i.state} /> stage{i.tags.length ? <>, {i.tags.map((t) => <span key={t} style={{ color: TAGS[t].ink }}>{TAGS[t].label} </span>)}</> : null}</div>
                        {preview.length > 0
                            ? <div className="ip-tip-lore">{preview.map((l, n) => <McLine key={n} text={l} />)}{more > 0 && <span className="ip-tip-more">+{more} more {more === 1 ? 'line' : 'lines'} in /info</span>}</div>
                            : <div className="wk-tip-line">No /info</div>}
                    </>
                )}
            {staged.length > 0 && <div className="wk-tip-line wk-tip-hi">{staged.join(', ')}</div>}
            <div className="wk-tip-id">minecraft:{i.material.toLowerCase()}</div>
        </div>
    );
}

