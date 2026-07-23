import { useLayoutEffect, useRef } from 'react';

/**
 * FLIP reordering for a table body.
 *
 * Scrubbing the match clock re-ranks the standings. Rows that teleport to a new
 * position tell you the order changed; rows that travel tell you WHO overtook
 * WHOM, which is the only thing anyone actually wants from a race. This is the
 * one place in the module where motion carries information no number does.
 *
 * Reads layout once per commit and writes only transforms, so no layout
 * thrash and nothing animates a layout property.
 */
export function useFlipRows(containerRef, key) {
  const previous = useRef(new Map());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduced = typeof matchMedia !== 'undefined'
      && matchMedia('(prefers-reduced-motion: reduce)').matches;

    const rows = [...container.querySelectorAll('[data-flip-key]')];
    const next = new Map();

    for (const row of rows) {
      const id = row.getAttribute('data-flip-key');
      const top = row.offsetTop;
      next.set(id, top);

      const before = previous.current.get(id);
      if (reduced || before === undefined || before === top) continue;

      const delta = before - top;
      row.dataset.flipping = 'true';
      row.style.transform = `translateY(${delta}px)`;
      requestAnimationFrame(() => {
        delete row.dataset.flipping;
        row.style.transform = '';
      });
    }

    previous.current = next;
  }, [containerRef, key]);
}
