import React from 'react';
import { cssVars } from '../tokens.js';
import '../wiki.css';

const VARS = cssVars();

/* Loaded only on wiki routes, so wheel and stats visitors never download the wiki's fonts. */
const FONTS = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;500;600;700&family=Handjet:wght@500;600;700&display=swap';

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
