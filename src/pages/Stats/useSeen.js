/**
 * FIB Stats — "has this scrolled into view yet", and the reveal flag built on it.
 *
 * Two hooks, one idea, used by four different kinds of thing: a section that
 * fades up, a numeral that counts, a podium that lights its medals in order,
 * and a race that draws itself. They live in their own file rather than inside
 * Primitives because Charts needs them too, and a chart importing a component
 * module to borrow a hook is the wrong dependency.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { prefersReducedMotion, canObserve } from './env.js';

/**
 * Fires once when the element first enters the viewport.
 *
 * Seeds to `true` — not false — when observation isn't possible (no
 * IntersectionObserver, no DOM). Everything downstream treats "seen" as the
 * permissive state, so a missing capability shows content rather than hiding
 * it.
 */
export function useSeen(ref) {
  const [seen, setSeen] = useState(() => !canObserve());

  useEffect(() => {
    if (seen || !ref.current || !canObserve()) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ref, seen]);

  return seen;
}

/**
 * Marks an element "pending" — the state an entrance animates FROM — and clears
 * the mark once it has been seen.
 *
 * The flag is an OVERRIDE on a default that is already correct and visible. It
 * is only ever applied after mount, only when motion is actually possible, and
 * only to elements genuinely below the fold — so a headless render, a
 * background tab, a reduced-motion reader, a browser without
 * IntersectionObserver, or a JS error all ship the content shown. That is the
 * difference between an entrance that enhances and one that gates.
 *
 * Written straight to the node rather than held in state: it is a presentational
 * attribute nothing else reads, and routing it through a render would mean the
 * element paints visible, then hidden, then visible.
 *
 * `key` is the dataset key, so one mechanism drives `data-reveal`,
 * `data-ceremony` and `data-wipe` without three copies of this logic. Every
 * consumer must define its pending state as a transition FROM, never as a
 * keyframe animation gated ON the attribute — the attribute is removed to
 * start the motion, not to stop it.
 */
export function usePendingReveal(ref, key = 'reveal') {
  const seen = useSeen(ref);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !canObserve() || prefersReducedMotion()) return;
    // A hidden tab runs no transitions and may never report an intersection, so
    // anything hidden here would still be hidden when the reader switched back.
    if (typeof document !== 'undefined' && document.hidden) return;
    if (el.getBoundingClientRect().top > (window.innerHeight || 0) * 0.92) {
      el.dataset[key] = 'pending';
    }
    // Deliberately once, on mount: this decides the starting frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Belt and braces: if the tab is backgrounded while the element is still
   * pending, drop the flag outright. Without this, opening the page in a
   * background tab and coming back to it later shows blank content.
   */
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVisibility = () => {
      if (document.hidden && ref.current) delete ref.current.dataset[key];
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [ref, key]);

  useEffect(() => {
    if (seen && ref.current) delete ref.current.dataset[key];
  }, [seen, ref, key]);

  return seen;
}

/** A ref plus the pending-reveal wiring, for callers that need only the ref. */
export function useRevealRef(key = 'reveal') {
  const ref = useRef(null);
  usePendingReveal(ref, key);
  return ref;
}
