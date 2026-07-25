/**
 * useAsync — run a loader, expose { data, error, loading, stale }.
 *
 * The seam the whole async conversion turns on. Every view that used to read a slice of the one big
 * mock bundle now calls this with its own loader, and gets the three states a real fetch has that a
 * synchronous generator never did: in-flight, failed, and succeeded.
 *
 * ## Why a hook and not a fetch in each component
 *
 * Three things have to be right every time and are easy to get wrong once per component: a fetch
 * that resolves after the inputs changed must not overwrite newer data (the stale-closure race), a
 * fetch that resolves after unmount must not set state on a dead component, and an error must land
 * in state rather than as an unhandled rejection. Centralising them means each view says what to
 * load and renders three states, and never re-implements the race guard.
 *
 * ## The deps contract
 *
 * `deps` is the argument list the loader closes over — a player uuid, a board's scope+category. When
 * they change, the loader re-runs and the previous in-flight result is discarded rather than
 * applied. Pass the same things you would to a useEffect dep array; the loader is intentionally NOT
 * a dependency (it is usually an inline arrow and would re-run every render), so it is the caller's
 * job to list what actually varies.
 */

import { useEffect, useState } from 'react';

export function useAsync(loader, deps = []) {
    const [state, setState] = useState({ data: null, error: null, loading: true, stale: false });

    useEffect(() => {
        // `cancelled` guards both hazards: a newer deps-change superseding this run, and unmount. Either
        // flips it, and the resolved handlers below no-op rather than touching stale state.
        let cancelled = false;
        setState((s) => ({ ...s, loading: true, error: null }));

        loader()
            .then((result) => {
                if (cancelled) return;
                // Loaders return { data, stale }; tolerate a bare value too, so a loader that returns the
                // payload directly still works.
                const data = result && typeof result === 'object' && 'data' in result ? result.data : result;
                const stale = !!(result && result.stale);
                setState({ data, error: null, loading: false, stale });
            })
            .catch((error) => {
                if (cancelled) return;
                setState({ data: null, error, loading: false, stale: false });
            });

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return state;
}
