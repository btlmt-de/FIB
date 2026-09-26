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
 * One card per player (PlayerCard, below): their head standing on a grass
 * block, the name in the jersey, their record and last ten results, items
 * found and who they usually play with - all read from payloads this view
 * already fetched. Browsing groups the cards by whether a player is still
 * around; searching drops the groups.
 *
 * *This view was a grid of identical tiles, an avatar, a name and "2,983 items
 * · 15h ago",* on the argument that anything more would turn it back into the
 * leaderboard. That argument is kept - nothing here is ordered by a placing -
 * but a record is not a placing, and a directory of nine people where every
 * tile looks the same said nothing about any of them.
 *
 * Everything is a route into a profile. No dead ends.
 */

import React, { useMemo, useState } from 'react';
import { loadPlayerIndex } from './api.js';
import { useAsync } from './useAsync.js';
import { Section, Search, Avatar, Empty, AsyncView, ItemImage, PodiumHead } from './Primitives.jsx';
import * as f from './format.js';

export function Players({ onOpenPlayer }) {
  const state = useAsync(loadPlayerIndex, []);
  return (
    <AsyncView state={state} loadingLabel="Loading players…">
      {(data) => (
        <PlayersBody
          players={data?.players ?? []}
          feedWindow={data?.feedWindow ?? 0}
          feedTotal={data?.feedTotal ?? 0}
          onOpenPlayer={onOpenPlayer}
        />
      )}
    </AsyncView>
  );
}

/*
 * Who counts as "around". Two weeks: long enough that a player who plays
 * weekends is still on the server's roster of regulars, short enough that
 * someone who played once in July is not.
 */
const RECENT_DAYS = 14;
const FORM_LENGTH = 10;

function PlayersBody({ players, feedWindow, feedTotal, onOpenPlayer }) {
  const [query, setQuery] = useState('');
  /* "Lately" is measured from when the directory opened, captured once, so a
     re-render never moves a player between groups mid-read. */
  const [now] = useState(() => Date.now());
  const q = query.trim().toLowerCase();

  const filtered = useMemo(
    () => (q ? players.filter((p) => p.name.toLowerCase().includes(q)) : players),
    [players, q],
  );

  /*
   * Grouped by whether a player is still around, not by initial.
   *
   * The A–Z index this replaced only ever switched on past 24 names, so on a
   * server of nine it never did, and the page was one alphabetical grid of
   * identical tiles. "Who is playing at the moment" is the question a
   * directory of nine can answer that a contacts list cannot: the regulars
   * first, most matches first, and everyone the server has not seen lately
   * after them, most recent first. A search collapses the groups - if you are
   * typing a name you already know who you want.
   */
  const groups = useMemo(() => {
    if (q) return [{ id: 'hits', title: null, list: filtered }];
    const cutoff = now - RECENT_DAYS * 86400000;
    const active = filtered
      .filter((p) => p.lastSeen != null && p.lastSeen >= cutoff)
      .sort((a, b) => (b.played ?? 0) - (a.played ?? 0) || a.name.localeCompare(b.name));
    const away = filtered
      .filter((p) => !(p.lastSeen != null && p.lastSeen >= cutoff))
      .sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0) || a.name.localeCompare(b.name));
    return [
      { id: 'active', title: 'Playing lately', note: `Played in the last ${RECENT_DAYS} days`, list: active },
      { id: 'away', title: 'Not seen lately', note: 'Records kept; they just haven\u2019t played in a while', list: away },
    ].filter((g) => g.list.length > 0);
  }, [filtered, q, now]);

  const partial = feedWindow > 0 && feedWindow < feedTotal;

  return (
    <div className="fib-page fib-page--wide">
      <Section
        title="Players"
        sub={`${players.length} ${players.length === 1 ? 'player has' : 'players have'} a record, solo or team. ${partial ? `Records read from the last ${f.num(feedWindow)} matches.` : 'Every record is their whole history.'}`}
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
        ) : (
          groups.map((g) => (
            <section key={g.id} className="fib-dir-group">
              {g.title ? (
                <h3 className="fib-dir-head">
                  {g.title}
                  <span className="fib-meta">{g.note}</span>
                </h3>
              ) : null}
              <div className="fib-player-grid" data-away={g.id === 'away' || undefined}>
                {g.list.map((p) => (
                  <PlayerCard key={p.uuid} p={p} onOpen={onOpenPlayer} />
                ))}
              </div>
            </section>
          ))
        )}
      </Section>
    </div>
  );
}

/*
 * A player, as a card you would recognise them by.
 *
 * Their head stands on a grass block - the podium's language (heads on the
 * blocks they earned) at rest: nobody here is ranked, so everyone stands on
 * the same ground. Then the name in the jersey, their record, their own last
 * ten results as the form squares the overview uses, and the two facts that
 * say who they are on this server: how much they have found, and who they
 * usually play with.
 *
 * Every fact renders only when the data has it. A player outside the feed has
 * no record to show, and "0-0" would be false.
 */
function PlayerCard({ p, onOpen }) {
  const played = p.played ?? 0;
  const wins = p.wins ?? 0;
  const form = (p.results ?? []).slice(-FORM_LENGTH);
  const rate = played > 0 ? Math.round((wins / played) * 100) : null;

  const spoken = [
    p.name,
    played > 0 ? `won ${wins} of ${played} matches` : null,
    p.partner ? `usually plays with ${p.partner.name}` : null,
    p.lastSeen != null ? `last played ${f.timeAgo(p.lastSeen)}` : null,
  ].filter(Boolean).join(', ');

  return (
    <button type="button" className="fib-player-card" onClick={() => onOpen(p.uuid)} aria-label={`${spoken}. Open their profile.`}>
      <span className="fib-player-stand" aria-hidden="true">
        <ItemImage name="grass_block" size={64} className="fib-player-block" loading="eager" />
        <PodiumHead uuid={p.uuid} size={54} />
      </span>

      <span className="fib-player-body" aria-hidden="true">
        <span className="fib-player-name">{p.name}</span>
        <span className="fib-meta">
          {p.lastSeen != null ? `last played ${f.timeAgo(p.lastSeen)}` : 'no recent matches'}
        </span>

        {played > 0 ? (
          <span className="fib-player-record">
            <span className="fib-player-wl"><b>{wins}</b>–{played - wins}</span>
            <span className="fib-meta">{rate}% won</span>
            <span className="fib-form-pips" style={{ '--cols': FORM_LENGTH }}>
              {Array.from({ length: FORM_LENGTH }, (_, i) => {
                const r = form[i - (FORM_LENGTH - form.length)];
                return <i key={i} data-result={r ? (r.won ? 'win' : 'loss') : 'out'} />;
              })}
            </span>
          </span>
        ) : null}

        <span className="fib-player-facts">
          {Number.isFinite(p.itemsFound) ? (
            <span><b>{f.num(p.itemsFound)}</b> items found</span>
          ) : null}
          {p.partner ? (
            <span className="fib-player-partner">
              usually with <Avatar uuid={p.partner.uuid} size={16} /> <b>{p.partner.name}</b>
              <span className="fib-meta">×{p.partner.count}</span>
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}
