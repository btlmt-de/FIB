/**
 * FIB Stats — module root.
 *
 * Routing is local state mirrored into the query string. The app router owns
 * `window.location.pathname` and deliberately strips the query when resolving
 * a page, so `?view=player&uuid=…` is free real estate: deep links, refresh,
 * and the back button all work without claiming a single URL from the host
 * app. A profile or a match is now something you can send to someone.
 *
 * View navigations PUSH a history entry; scope changes REPLACE — flipping
 * solo/duo/combined is a lens on the current view, not a place you travelled
 * to, and the back button should not have to walk back through it.
 *
 * Scope (solo / duos / combined) is held HERE, not per screen, so switching to
 * Duos on the ranking and then opening a profile keeps the reader in the same
 * frame of reference. It is the one piece of state worth lifting.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { injectStyles } from './styles.js';
import { Rail } from './Chrome.jsx';
import { Overview } from './Overview.jsx';
import { Leaderboards } from './Leaderboards.jsx';
import { Matches } from './Matches.jsx';
import { MatchDetail } from './MatchDetail.jsx';
import { Players } from './Players.jsx';
import { PlayerProfile } from './Profile.jsx';
import { Collection } from './Collection.jsx';
import { Items } from './Items.jsx';

/** Which rail item lights up for a given view. Detail views keep their parent lit. */
const NAV_FOR = { match: 'matches', player: 'players', collection: 'players' };

const SCOPES = ['solo', 'duo', 'combined'];

/**
 * Read the current URL. Returns null only when it carries nothing stats-
 * related at all. A scope with no view means the overview — `toUrl` omits the
 * view param there, so `/stats?scope=duo` must still parse.
 */
function readLocation() {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  if (!q.get('view') && !q.get('scope') && !q.get('id') && !q.get('uuid')) return null;
  return {
    route: {
      view: q.get('view') ?? 'overview',
      matchId: q.get('id'),
      playerUuid: q.get('uuid'),
    },
    scope: SCOPES.includes(q.get('scope')) ? q.get('scope') : 'solo',
  };
}

/** The URL for a route + scope. The overview at solo scope is the bare path. */
function toUrl(route, scope) {
  if (typeof window === 'undefined') return '';
  const q = new URLSearchParams();
  if (route.view !== 'overview') q.set('view', route.view);
  if (route.matchId) q.set('id', route.matchId);
  if (route.playerUuid) q.set('uuid', route.playerUuid);
  if (scope !== 'solo') q.set('scope', scope);
  const qs = q.toString();
  return qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
}

export function StatsShell({ initialView = 'overview', wikiHref = '/', onExitWiki }) {
  const [route, setRoute] = useState(
    () => readLocation()?.route ?? { view: initialView, matchId: null, playerUuid: null },
  );
  const [scope, setScopeState] = useState(() => readLocation()?.scope ?? 'solo');

  /* A ref mirror so history writes read the CURRENT scope and route without
     making `go` depend on them — and without side effects inside state
     updaters, which StrictMode invokes twice. Synced post-commit. */
  const scopeRef = useRef(scope);
  const routeRef = useRef(route);
  useEffect(() => {
    scopeRef.current = scope;
    routeRef.current = route;
  });

  useEffect(() => { injectStyles(); }, []);

  /* Back / forward: the URL is the source of truth, so re-read it. */
  useEffect(() => {
    const onPop = () => {
      const loc = readLocation();
      setRoute(loc?.route ?? { view: 'overview', matchId: null, playerUuid: null });
      setScopeState(loc?.scope ?? 'solo');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = useCallback((view, extra = {}) => {
    const next = { view, matchId: null, playerUuid: null, ...extra };
    window.history.pushState({}, '', toUrl(next, scopeRef.current));
    setRoute(next);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const setScope = useCallback((next) => {
    window.history.replaceState({}, '', toUrl(routeRef.current, next));
    setScopeState(next);
  }, []);

  const openMatch = useCallback((matchId) => go('match', { matchId }), [go]);
  const openPlayer = useCallback((playerUuid) => go('player', { playerUuid }), [go]);
  const openCollection = useCallback((playerUuid) => go('collection', { playerUuid }), [go]);

  const body = () => {
    switch (route.view) {
      case 'leaderboards':
        return <Leaderboards scope={scope} onScopeChange={setScope} onOpenPlayer={openPlayer} />;
      case 'matches':
        return <Matches onOpenMatch={openMatch} />;
      case 'match':
        // The id, not a pre-found match object. MatchDetail fetches it.
        return <MatchDetail matchId={route.matchId} onBack={() => go('matches')} onOpenPlayer={openPlayer} />;
      case 'players':
        return <Players onOpenPlayer={openPlayer} scope={scope} />;
      case 'player':
        return (
            <PlayerProfile
                uuid={route.playerUuid}
                scope={scope}
                onScopeChange={setScope}
                onBack={() => go('players')}
                onOpenPlayer={openPlayer}
                onOpenMatch={openMatch}
                onOpenCollection={openCollection}
            />
        );
      case 'collection':
        // The player's whole item book. Back returns to their profile.
        return <Collection uuid={route.playerUuid} onBack={() => openPlayer(route.playerUuid)} />;
      case 'items':
        return <Items />;
      default:
        return (
            <Overview
                onOpenMatch={openMatch}
                onOpenPlayer={openPlayer}
                onOpenItems={() => go('items')}
                onOpenMatches={() => go('matches')}
                onOpenLeaderboards={() => go('leaderboards')}
            />
        );
    }
  };

  return (
    <div className="fib">
      <a className="fib-skip-link" href="#fib-main">Skip to content</a>
      <div className="fib-shell">
        <div className="fib-atmosphere" aria-hidden="true" />
        <Rail
          view={NAV_FOR[route.view] ?? route.view}
          onNavigate={go}
          onExitWiki={onExitWiki}
          wikiHref={wikiHref}
        />
        <main className="fib-main" id="fib-main" tabIndex={-1}>
          {body()}
        </main>
      </div>
    </div>
  );
}

export default StatsShell;
