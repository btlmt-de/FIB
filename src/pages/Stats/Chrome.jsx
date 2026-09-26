/**
 * FIB Stats — navigation chrome.
 *
 * A left rail on desktop, a bottom bar below 900px. The switch is structural
 * (see the media query in styles.js), not a second component: one set of
 * markup, two arrangements, so the two can't drift apart.
 *
 * The icons are item sprites, one per destination: a compass for the overview,
 * a player head for the directory, a gold block for the ranking (the podium's
 * first-place block), a clock for the match history, a chest for the item
 * index. They were five hand-drawn line icons at one stroke weight - tidy, and
 * the last thing on every screen that could have come from any dashboard kit.
 * Sprites render at 16px, the game's own inventory scale, and sit desaturated
 * until their item is hovered or current, so colour still says "you are here".
 */

import React from 'react';
import { ItemImage } from './Primitives.jsx';

const NAV_ITEM = {
  overview: 'compass',
  players: 'player_head',
  leaderboards: 'gold_block',
  matches: 'clock',
  items: 'chest',
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
        <b>FIB</b>
        <span>Stats</span>
        <em>Beta</em>
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
            <ItemImage name={NAV_ITEM[v.id]} size={16} className="fib-nav-sprite" loading="eager" />
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
