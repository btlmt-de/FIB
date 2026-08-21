import { useState, useEffect } from 'react';

/**
 * Motion preferences, asked once and in one place.
 *
 * This existed twice, byte for byte, in two files in the same folder — the
 * collection board's flap drums and the prestige ceremony — which is the
 * second-use test the Named-Or-Nothing Rule already applies to colours, met by a
 * function instead. Two copies of a predicate is how one of them eventually
 * stops matching the other, and this particular predicate decides whether an
 * animation runs at all.
 *
 * Callers read it once at mount rather than per frame: it is a media query, a
 * change to it re-renders the tree anyway, and asking inside a rAF loop is a
 * layout query in a hot path.
 */
export function prefersReducedMotion() {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Hook that subscribes to prefers-reduced-motion changes.
 *
 * Returns the current state and updates components when the user changes their
 * motion preference, ensuring animations stop when reduced motion is enabled
 * mid-session. Preserves the server-safe fallback for SSR contexts.
 */
export function usePrefersReducedMotion() {
    const [reduced, setReduced] = useState(() => prefersReducedMotion());

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return undefined;

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handleChange = (e) => setReduced(e.matches);

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
        // Legacy browsers
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
    }, []);

    return reduced;
}
