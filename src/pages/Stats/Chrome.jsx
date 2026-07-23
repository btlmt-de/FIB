/**
 * FIB Stats — navigation chrome.
 *
 * A left rail on desktop, a bottom bar below 900px. The switch is structural
 * (see the media query in styles.js), not a second component: one set of
 * markup, two arrangements, so the two can't drift apart.
 *
 * Icons are inline rather than imported. The module needs five glyphs; pulling
 * five icon modules in to draw five outlines costs more than the outlines do,
 * and hand-drawn ones keep a single stroke weight across the set.
 */

import React from 'react';

const ICON = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };

const Icons = {
  overview: (
    <svg {...ICON} aria-hidden="true">
      <path d="M3 13.5 12 5l9 8.5" /><path d="M5.5 12v7h13v-7" />
    </svg>
  ),
  players: (
    <svg {...ICON} aria-hidden="true">
      <circle cx="9.5" cy="8.5" r="3.2" /><path d="M3.5 19.5c0-3 2.7-5 6-5s6 2 6 5" />
      <path d="M16.5 7.2a3 3 0 0 1 0 5.6M18 19.5c0-1.9-.6-3.4-1.7-4.4" />
    </svg>
  ),
  leaderboards: (
    <svg {...ICON} aria-hidden="true">
      <path d="M4 20v-6h4.5v6M9.75 20V4h4.5v16M15.5 20v-9H20v9" /><path d="M2.5 20h19" />
    </svg>
  ),
  matches: (
    <svg {...ICON} aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" /><path d="M12 7.4V12l3 1.8" />
    </svg>
  ),
  items: (
    <svg {...ICON} aria-hidden="true">
      <path d="m12 3 8 4.4v9.2L12 21l-8-4.4V7.4z" /><path d="m4 7.4 8 4.4 8-4.4M12 11.8V21" />
    </svg>
  ),
};

const VIEWS = [
  { id: 'overview', label: 'Overview' },
  { id: 'players', label: 'Players' },
  { id: 'leaderboards', label: 'Ranking' },
  { id: 'matches', label: 'Matches' },
  { id: 'items', label: 'Items' },
];

export function Rail({ view, onNavigate, onExitWiki, wikiHref = '/' }) {
  return (
    <nav className="fib-rail" aria-label="Statistics">
      <div className="fib-rail-brand">
        <b>Statistics</b>
        <span>FIB</span>
      </div>

      <div className="fib-rail-nav">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className="fib-nav-item"
            aria-current={view === v.id ? 'page' : undefined}
            onClick={() => onNavigate(v.id)}
          >
            {Icons[v.id]}
            {v.label}
          </button>
        ))}
      </div>

      <div className="fib-rail-foot">
        {/*
          A real anchor, not a button: it is a navigation to another page and
          should middle-click, right-click and open-in-new-tab like one. The
          click handler only intercepts the plain-left-click case so the SPA
          can route without a reload.
        */}
        <a
          className="fib-exit"
          href={wikiHref}
          onClick={(e) => {
            if (!onExitWiki || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            onExitWiki();
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 5.5H5.5v13H14" /><path d="M18.5 12H10m0 0 3-3m-3 3 3 3" />
          </svg>
          Back to the wiki
        </a>
      </div>
    </nav>
  );
}
