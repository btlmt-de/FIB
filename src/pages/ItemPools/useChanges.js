import { useCallback, useEffect, useMemo, useReducer } from 'react';

/**
 * Everything a maintainer has staged and not committed yet: the tray's contents.
 *
 *   pool   material -> { type: 'add' | 'modify' | 'remove', state, tags, oldState, oldTags }
 *   info   material -> { lines: string[] | null (null deletes the description), base }
 *
 * `base` and `oldState`/`oldTags` are what the item was when it was first touched, so
 * a change that is edited back to where it started stops being a change, and review
 * can show before and after.
 *
 * Staged work survives a reload: it is kept in this browser's localStorage, the way
 * the old description editor kept a draft per item. Those drafts (fib_draft_*) are
 * read in once, on the first visit after this page replaced the editor, so nobody's
 * unsaved description is lost in the move. It is per browser on purpose: this is an
 * unsent draft, not shared state.
 */

const KEY = 'fib_pool_changes_v1';
const OLD_DRAFT = 'fib_draft_';

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const sortTags = (t) => [...t].sort();

/*
 * What a commit actually wrote for one entry, so a staged change can be matched to it.
 * The pool's is what `poolEdits` turns into register lines (type, stage, tags), the
 * descriptions' is the lines. `base` and `oldState`/`oldTags` are left out: they are
 * bookkeeping, and `fillBase` can rewrite a base mid-commit without the change being
 * any different.
 */
const written = {
    pool: (c) => [c?.type, c?.state ?? null, c?.tags ?? null],
    info: (c) => c?.lines,
};

function load() {
    const empty = { pool: {}, info: {} };
    try {
        const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
        const state = saved && saved.pool && saved.info ? saved : empty;
        // One-time migration of the old editor's per-item drafts. They are only read
        // here; the keys are removed once this state has been written (see below),
        // because React may run this initialiser twice and the second run must still
        // find them.
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (!k?.startsWith(OLD_DRAFT)) continue;
            const material = k.slice(OLD_DRAFT.length);
            try {
                const { lines } = JSON.parse(localStorage.getItem(k));
                if (Array.isArray(lines) && !state.info[material]) state.info[material] = { lines, base: undefined };
            } catch { /* a corrupt draft is not worth keeping */ }
        }
        return state;
    } catch {
        return empty;
    }
}

function reducer(s, a) {
    switch (a.type) {
        case 'pool': {
            const pool = { ...s.pool };
            if (a.change) pool[a.material] = a.change; else delete pool[a.material];
            return { ...s, pool };
        }
        case 'info': {
            const info = { ...s.info };
            if (a.change) info[a.material] = a.change; else delete info[a.material];
            return { ...s, info };
        }
        case 'committed': {
            // Only what the commit wrote leaves the tray. A commit is several requests
            // long and the tray stays usable meanwhile, so an entry staged, edited or
            // undone while it ran is not the one that landed. This used to empty the
            // whole list and dropped that work. Done here, not at the call site,
            // because only the reducer sees the state as it is now rather than as it
            // was when the commit started.
            const next = { ...s[a.what] };
            let changed = false;
            for (const { material, ...c } of a.entries) {
                if (next[material] && same(written[a.what](next[material]), written[a.what](c))) {
                    delete next[material];
                    changed = true;
                }
            }
            return changed ? { ...s, [a.what]: next } : s;
        }
        case 'fillBase': {
            // A migrated draft has no base until the page knows the item's description.
            const info = { ...s.info };
            let changed = false;
            for (const [m, c] of Object.entries(info)) {
                if (c.base === undefined && m in a.bases) {
                    changed = true;
                    if (same(c.lines, a.bases[m])) delete info[m]; else info[m] = { ...c, base: a.bases[m] };
                }
            }
            return changed ? { ...s, info } : s;
        }
        default:
            return s;
    }
}

export default function useChanges(items) {
    const [s, dispatch] = useReducer(reducer, undefined, load);

    useEffect(() => {
        const id = setTimeout(() => {
            try {
                localStorage.setItem(KEY, JSON.stringify(s));
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const k = localStorage.key(i);
                    if (k?.startsWith(OLD_DRAFT)) localStorage.removeItem(k);
                }
            } catch { /* memory only */ }
        }, 250);
        return () => clearTimeout(id);
    }, [s]);

    const byMaterial = useMemo(() => new Map(items.map((i) => [i.material, i])), [items]);

    useEffect(() => {
        if (!items.length) return;
        const bases = {};
        for (const [m, c] of Object.entries(s.info)) {
            if (c.base === undefined && byMaterial.has(m)) bases[m] = byMaterial.get(m).description ?? null;
        }
        if (Object.keys(bases).length) dispatch({ type: 'fillBase', bases });
    }, [items, byMaterial, s.info]);

    /** Stage and tags for an item, in the pool or being added. Back to the original: no change. */
    const setPool = useCallback((material, state, tags) => {
        const orig = byMaterial.get(material);
        const cur = s.pool[material];
        const t = sortTags(tags);
        if (!orig) {
            dispatch({ type: 'pool', material, change: { type: 'add', state, tags: t } });
            return;
        }
        if (cur?.type === 'remove') return;
        if (state === orig.state && same(t, sortTags(orig.tags))) {
            dispatch({ type: 'pool', material, change: null });
            return;
        }
        dispatch({ type: 'pool', material, change: { type: 'modify', state, tags: t, oldState: orig.state, oldTags: orig.tags } });
    }, [byMaterial, s.pool]);

    const addToPool = useCallback((material, state = 'EARLY', tags = []) => {
        if (byMaterial.has(material)) return;
        dispatch({ type: 'pool', material, change: { type: 'add', state, tags: sortTags(tags) } });
    }, [byMaterial]);

    const removeFromPool = useCallback((material) => {
        const orig = byMaterial.get(material);
        if (!orig) { dispatch({ type: 'pool', material, change: null }); return; }
        dispatch({ type: 'pool', material, change: { type: 'remove', oldState: orig.state, oldTags: orig.tags } });
    }, [byMaterial]);

    const undoPool = useCallback((material) => dispatch({ type: 'pool', material, change: null }), []);

    /** A description's lines. Back to what it was: no change. `null` stages a deletion. */
    const setInfo = useCallback((material, lines) => {
        const base = byMaterial.get(material)?.description ?? null;
        if (same(lines, base)) dispatch({ type: 'info', material, change: null });
        else dispatch({ type: 'info', material, change: { lines, base } });
    }, [byMaterial]);

    const undoInfo = useCallback((material) => dispatch({ type: 'info', material, change: null }), []);
    /** Drop the entries a commit wrote: `entries` is the snapshot it was made from. */
    const clearCommitted = useCallback((what, entries) => dispatch({ type: 'committed', what, entries }), []);

    /** An item as it will be once the staged pool change lands. */
    const effective = useCallback((item) => {
        const c = s.pool[item.material];
        const info = s.info[item.material];
        const description = info ? info.lines : item.description;
        if (!c) return info ? { ...item, description } : item;
        if (c.type === 'remove') return { ...item, description, removed: true };
        return { ...item, state: c.state, tags: c.tags, description, added: c.type === 'add' };
    }, [s]);

    return {
        pool: s.pool, info: s.info,
        poolCount: Object.keys(s.pool).length, infoCount: Object.keys(s.info).length,
        setPool, addToPool, removeFromPool, undoPool, setInfo, undoInfo, clearCommitted, effective,
    };
}
