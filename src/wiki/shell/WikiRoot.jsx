import React from 'react';
import { cssVars } from '../tokens.js';
import '../wiki.css';

const VARS = cssVars();

/*
 * Rendered only on wiki routes, so the wiki's two faces never download for a
 * visitor who came for the wheel or the stats. Without a precedence the link stays
 * where it is rendered and does not suspend the page while the font CSS arrives;
 * font-display: swap covers the gap.
 */
const FONTS = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;500;600;700&family=Handjet:wght@500;600;700&display=swap';

/** The wiki's root: its tokens, its faces, and the ground everything stands on. */
export default function WikiRoot({ children }) {
    return (
        <div className="wk" style={VARS}>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="stylesheet" href={FONTS} />
            {children}
        </div>
    );
}
