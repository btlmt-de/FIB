import React, { useEffect, useRef } from 'react';

/* An empty section stays in place, dimmed, so the line does not rearrange under the pointer. */
export default function PageIndex({ label, items, current }) {
    // Scrolls the index sideways only, never the page.
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
