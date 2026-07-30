/**
 * FIB Stats — the player directory.
 *
 * This used to be the solo leaderboard wearing a different hat: the same roster,
 * ranked, with win rate and items-found columns. That made it a duplicate of
 * /ranking and — worse — it silently dropped anyone who only plays teams, since
 * the roster it read is solo-only.
 *
 * The directory answers a different, smaller question: "who exists, and how do I
 * open them". So it shows NO stats — an avatar and a name — and it lists
 * *everyone* with a record, solo or team (the roster is merged with the team
 * boards upstream in `loadPlayerIndex`). Ranking lives at /ranking; this is the
 * index you reach for when you already know whose record you want.
 *
 * ── How it's displayed ──
 *
 * Two modes, because finding a known name and browsing the field are different
 * acts:
 *
 *   browsing   grouped A–Z with a jump index, the shape of a contacts list —
 *              you scan initials, not numbers
 *   searching  one flat list of matches; letter headers over three hits are
 *              noise, and if you're typing you already know the name
 *
 * Everything is a route into a profile. No dead ends, no stats to compare.
 */

import React, { useMemo, useState } from 'react';
import { loadPlayerIndex } from './api.js';
import { useAsync } from './useAsync.js';
import { prefersReducedMotion } from './env.js';
import { Section, Search, Avatar, Empty, AsyncView } from './Primitives.jsx';
import * as f from './format.js';

/**
 * The bucket a name sorts into: its uppercased initial, or '#' for a name that
 * doesn't start with a letter — a leading underscore or digit is a legal
 * Minecraft username, and those should still land somewhere findable.
 */
function initialOf(name) {
  const c = (name || '').trim().charAt(0).toUpperCase();
  return c >= 'A' && c <= 'Z' ? c : '#';
}

export function Players({ onOpenPlayer }) {
  const state = useAsync(loadPlayerIndex, []);
  return (
    <AsyncView state={state} loadingLabel="Loading players…">
      {(data) => <PlayersBody players={data?.players ?? []} onOpenPlayer={onOpenPlayer} />}
    </AsyncView>
  );
}

function PlayersBody({ players, onOpenPlayer }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const filtered = useMemo(
    () => (q ? players.filter((p) => p.name.toLowerCase().includes(q)) : players),
    [players, q],
  );

  /*
   * Grouped A–Z, but only while browsing AND only once there is enough roster to
   * group. `null` signals the flat grid — used for a search, and for a small
   * server.
   *
   * The threshold matters. At six players the A–Z index was five headers over
   * five groups of one, plus a jump bar to five destinations already on screen:
   * the whole apparatus of a contacts list, applied to something that fits in one
   * row. That is scaffolding for a scale the data does not have, and it reads as
   * a page that is mostly headings. Under GROUP_MIN the tiles are simply a grid,
   * still alphabetical, and the letters appear when they start doing work.
   */
  const GROUP_MIN = 24;
  const groups = useMemo(() => {
    if (q || filtered.length < GROUP_MIN) return null;
    const map = new Map();
    for (const p of filtered) {
      const k = initialOf(p.name);
      (map.get(k) ?? map.set(k, []).get(k)).push(p);
    }
    return [...map.entries()].sort(([a], [b]) =>
      (a === '#') - (b === '#') || a.localeCompare(b));
  }, [filtered, q]);

  const jump = (letter) => {
    const el = document.getElementById(`fib-dir-${letter}`);
    if (!el) return;
    el.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  /*
   * A name, and two facts about it.
   *
   * The directory shipped as an avatar and a name and nothing else, on the
   * reasoning that ranking lives at /ranking and this answers only "who exists".
   * That reasoning holds for RANKS — repeating the leaderboard here would make
   * this the leaderboard again, which is what it was carved out of. It does not
   * hold for facts: an object with no numbers beside it is a dead end, and six
   * bare names in a row left most of the page empty saying nothing.
   *
   * So: items found (the career size, the one count that exists for team-only
   * players too) and last seen (whether they are still around). Neither is a
   * placing, so neither competes with /ranking, and both are already in the
   * payload the index fetches.
   *
   * Each is rendered only when present. A player outside the recent match window
   * has no last-seen, and printing "never" for them would be false.
   */
  const tile = (p) => (
    <button
      key={p.uuid}
      type="button"
      className="fib-dir-tile"
      onClick={() => onOpenPlayer(p.uuid)}
    >
      <Avatar uuid={p.uuid} size={40} />
      <span className="fib-dir-body">
        <span className="fib-dir-name">{p.name}</span>
        <span className="fib-dir-facts fib-meta">
          {Number.isFinite(p.itemsFound) ? <span>{f.num(p.itemsFound)} items</span> : null}
          {p.lastSeen != null ? <span>{f.timeAgo(p.lastSeen)}</span> : null}
        </span>
      </span>
    </button>
  );

  return (
    <div className="fib-page fib-page--wide">
      <Section
        title="Players"
        sub={`${players.length} ${players.length === 1 ? 'player has' : 'players have'} a record — solo or team. Items found is every mode combined; ranking lives on its own page.`}
        aside={<Search value={query} onChange={setQuery} placeholder="Find a player" label="Find a player" hotkey />}
      >
        {players.length === 0 ? (
          <Empty title="No players yet">
            The directory lists everyone who has finished a ranked match, in solo or in a
            team. Nobody has a record on this server yet.
          </Empty>
        ) : filtered.length === 0 ? (
          <Empty title={`Nobody matches “${query.trim()}”`}>
            Names are exact Minecraft usernames. Check the spelling, or clear the search
            to browse everyone.
          </Empty>
        ) : groups === null ? (
          /* Searching, or a roster too small to be worth grouping. */
          <div className="fib-dir-grid">{filtered.map(tile)}</div>
        ) : (
          <>
            {groups.length > 1 ? (
              <nav className="fib-dir-index" aria-label="Jump to initial">
                {groups.map(([letter]) => (
                  <button
                    key={letter}
                    type="button"
                    className="fib-dir-jump"
                    onClick={() => jump(letter)}
                  >
                    {letter}
                  </button>
                ))}
              </nav>
            ) : null}

            {groups.map(([letter, list]) => (
              <section key={letter} className="fib-dir-group" id={`fib-dir-${letter}`}>
                <h3 className="fib-dir-letter">{letter}</h3>
                <div className="fib-dir-grid">{list.map(tile)}</div>
              </section>
            ))}
          </>
        )}
      </Section>
    </div>
  );
}
