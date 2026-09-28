import React, { useEffect, useRef } from 'react';

/*
 * The sticky index of a long reference page (Commands, Changelog): one line of its
 * sections under the nav, held there while the page scrolls, each with a count, and
 * the section being read marked the way the nav marks the current page (ink and a 3px
 * bar). A section with nothing in it right now (a search that matches none of its
 * commands) stays in place, dimmed, so the line does not rearrange under the pointer.
 *
 * *Both pages had a row of plain links at the end of the head* (owner, final pass,
 * Sept 2026): useful once, then scrolled away, on pages several screens long on a
 * phone. A sidebar was the other way to keep it in reach and was not taken: it costs
 * the content a column for a handful of words.
 */
export default function PageIndex({ label, items, current }) {
    // On a phone the line scrolls sideways: keep the section being read in view on it,
    // without touching the page's own scroll.
    const list = useRef(null);
    useEffect(() => {
        const ol = list.current;
        const on = ol?.querySelector('[aria-current]');
        if (!ol || !on || ol.scrollWidth <= ol.clientWidth) return;
        const left = on.offsetLeft - ol.offsetLeft;
        if (left < ol.scrollLeft || left + on.offsetWidth > ol.scrollLeft + ol.clientWidth) {
            ol.scrollLeft = Math.max(0, left - 16);
        }
    }, [current]);
    return (
        <nav className="pg-index" aria-label={label}>
            <ol className="wk-wrap pg-index-list" ref={list}>
                {items.map((it) => (
                    <li key={it.id}>
                        {it.n > 0
                            ? (
                                <a className="pg-index-link" href={`#${it.id}`} aria-current={current === it.id ? 'location' : undefined}>
                                    {it.label} <span className="pg-index-n">{it.n}</span>
                                </a>
                            )
                            : <span className="pg-index-link" aria-disabled="true">{it.label} <span className="pg-index-n">0</span></span>}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
