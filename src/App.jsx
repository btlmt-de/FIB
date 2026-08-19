import React, { useState, useEffect, lazy, Suspense } from 'react';

// Components
import Navigation from './components/common/Navigation';

// Config
import { COLORS } from './config/constants';
// A leaf module, deliberately: importing this from atlas.js would pull the
// wheel's canvas layer and utils/helpers.js into the entry chunk for one string.
import { ATLAS_JSON } from './components/wheel/canvas/atlasUrls.js';

/*
 * Every route is code-split. There is no page here that a visitor to another
 * page needs.
 *
 * It began with the two standalone routes only — the wheel and the stats
 * module, each heavy and each mutually exclusive with everything else — on the
 * grounds that a reader of a reference page should not download them. That
 * argument was only ever stated in one direction, and the traffic since went the
 * other way: PRODUCT.md now records the play loop as the site's draw, and the
 * wheel is where most arrivals land.
 *
 * Split one way, the wheel's cold start paid for the entire wiki before its own
 * chunk was even requested — the reference pages, the item-pool page and its
 * admin editor, ~180 kB gzipped of code that /wheel never calls, and *then* the
 * wheel. Serialised, because the lazy chunk cannot be requested until the entry
 * chunk has parsed.
 *
 * The cost on the other side is a chunk request when navigating between wiki
 * pages, which is a few kB on a warm connection behind an already-painted nav
 * bar. RouteFallback holds the page's ground colour so the swap is not a flash
 * of white.
 *
 * (The old note here said the wheel "pulls in three.js". It had not since the
 * mythic celebration was rewritten in Canvas 2D; the dependency outlived the
 * import by long enough to still be the stated reason for splitting this route,
 * and has now been removed from package.json. The route stays split on its own
 * merits — it is 124 kB gzipped.)
 */
const HomePage = lazy(() => import('./pages/HomePage'));
const ForceItemPools = lazy(() => import('./pages/ItemPools/ForceItemPools.jsx'));
const HowToPlay = lazy(() => import('./pages/HowToPlay'));
const Gameplay = lazy(() => import('./pages/Gameplay'));
const Changelog = lazy(() => import('./pages/Changelog'));
const Imprint = lazy(() => import('./pages/Imprint'));
const Rules = lazy(() => import('./pages/Rules'));
const CustomStructures = lazy(() => import('./pages/CustomStructures'));
const Commands = lazy(() => import('./pages/Commands'));
const GameSettings = lazy(() => import('./pages/GameSettings'));
const WheelOfFortune = lazy(() => import('./components/wheel/WheelOfFortune'));
const StatsShell = lazy(() => import('./pages/Stats/StatsShell.jsx'));

/** Full-bleed placeholder while a standalone route's chunk arrives. */
function RouteFallback() {
    return <div style={{ minHeight: '100vh', background: COLORS.bg }} />;
}

/**
 * The same hold for a wiki page, minus the nav bar's height — the bar is
 * already painted above it, so reserving a second viewport under it would make
 * the page scroll to nothing for the length of one chunk request.
 */
function PageFallback() {
    return <div style={{ minHeight: '70vh', background: COLORS.bg }} />;
}

// Route lookup map
const ROUTE_MAP = {
    'pools': 'pools',
    'how-to-play': 'how-to-play',
    'gameplay': 'gameplay',
    'changelog': 'changelog',
    'imprint': 'imprint',
    'rules': 'rules',
    'structures': 'structures',
    'commands': 'commands',
    'settings': 'settings',
    'wheel': 'wheel',
    'stats': 'stats',
};

export default function App() {
    // Simple routing based on pathname
    const getPageFromPath = () => {
        // Normalize: trim leading/trailing slashes, lowercase, remove query params
        const normalized = window.location.pathname
            .replace(/^\/+|\/+$/g, '')  // Trim slashes
            .split('?')[0]               // Remove query params
            .toLowerCase();

        return ROUTE_MAP[normalized] || 'home';
    };

    const [currentPage, setCurrentPage] = useState(getPageFromPath());

    useEffect(() => {
        const handlePopState = () => {
            setCurrentPage(getPageFromPath());
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const navigate = (page) => {
        const path = page === 'home' ? '/' : `/${page}`;
        window.history.pushState({}, '', path);
        setCurrentPage(page);
        window.scrollTo(0, 0);
    };

    // Wheel page is standalone (no nav bar)
    if (currentPage === 'wheel') {
        /*
         * The lazy chunk and the atlas are the wheel's two cold-start costs;
         * preloading the index while the chunk downloads overlaps them instead
         * of serialising. React 19 hoists this <link> into <head>. It carries
         * crossOrigin because fetch() is a CORS request even when the URL is
         * same-origin, and a preload without it would not match.
         *
         * ── The image is deliberately NOT preloaded ──────────────────────────
         *
         * It was, and it was 6.4 MB of pure waste. atlas.js requests the image
         * as `/fib-atlas.webp?v=<version>` — the version stamp is load-bearing,
         * it exists because a cached image once disagreed with a fresh index and
         * shifted every sprite past #356. A preload of the bare
         * `/fib-atlas.webp` is a DIFFERENT URL, so the browser fetched 6.4 MB,
         * used none of it, and then fetched the versioned 6.4 MB for real.
         *
         * It cannot be fixed by versioning the link: the version lives inside
         * the JSON and is not known until that JSON has been fetched and parsed,
         * which is exactly the thing this preload runs ahead of. Restoring the
         * overlap properly means baking the version in at build time — vendor
         * -atlas.mjs would emit it as a module beside public/fib-atlas.json —
         * and that is a build-pipeline change, not a render-path one.
         *
         * The JSON preload below still overlaps the part that can overlap, and
         * atlas.js starts the image the moment the index parses.
         */
        return (
            <>
                <link rel="preload" as="fetch" href={ATLAS_JSON} type="application/json" crossOrigin="anonymous" />
                <Suspense fallback={<RouteFallback />}>
                    <WheelOfFortune onBack={() => navigate('home')} />
                </Suspense>
            </>
        );
    }

    if (currentPage === 'stats') {
        return (
            <Suspense fallback={<RouteFallback />}>
                <StatsShell wikiHref="/" onExitWiki={() => navigate('home')} />
            </Suspense>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: COLORS.bg
        }}>
            <Navigation currentPage={currentPage} onNavigate={navigate} />

            {/* The nav bar is outside the boundary deliberately: it is already
                on screen and it is how the visitor got here, so it must not
                blink while the next page's chunk arrives. */}
            <Suspense fallback={<PageFallback />}>
            {currentPage === 'home' && (
                <HomePage onNavigate={navigate} />
            )}

            {currentPage === 'how-to-play' && (
                <HowToPlay />
            )}

            {currentPage === 'gameplay' && (
                <Gameplay />
            )}

            {currentPage === 'changelog' && (
                <Changelog />
            )}

            {currentPage === 'imprint' && (
                <Imprint />
            )}

            {currentPage === 'rules' && (
                <Rules />
            )}

            {currentPage === 'pools' && (
                <ForceItemPools />
            )}

            {currentPage === 'structures' && (
                <CustomStructures />
            )}

            {currentPage === 'commands' && (
                <Commands />
            )}

            {currentPage === 'settings' && (
                <GameSettings />
            )}
            </Suspense>
        </div>
    );
}