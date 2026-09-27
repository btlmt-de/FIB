import { useEffect, useMemo, useState } from 'react';
import { pick } from './atlas.js';

/**
 * Small hooks the wiki's drawings share. The home page grew its own copies first;
 * these are the inner pages' (Gameplay's simulations are the first to need them).
 */

/** True while an element is on screen, so an off-screen simulation costs nothing. */
export function useOnScreen(ref, rootMargin = '0px') {
    const [on, setOn] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin });
        io.observe(el);
        return () => io.disconnect();
    }, [ref, rootMargin]);
    return on;
}

/** n distinct picks from a list, fixed for the life of the page. */
export function usePicks(list, n) {
    return useMemo(() => picks(list, n), [list, n]);
}

/** n distinct picks from a list, not in the list's order. */
export function picks(list, n, rng = Math.random) {
    const out = new Set();
    const want = Math.min(n, list.length);
    while (out.size < want) out.add(pick(list, rng));
    return [...out];
}

/**
 * Runs `step` every `ms` while `running`, and never under calm. The step receives
 * nothing and owns its own state; this only owns the clock, so a simulation that is
 * scrolled away or frozen by saver mode simply stops being called.
 */
export function useTicker(step, ms, running) {
    useEffect(() => {
        if (!running) return undefined;
        const id = setInterval(step, ms);
        return () => clearInterval(id);
    }, [step, ms, running]);
}
