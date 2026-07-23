import React, { useState, useEffect, lazy, Suspense } from 'react';

// Pages
import HomePage from './pages/HomePage';
import ForceItemPools from './pages/ItemPools/ForceItemPools.jsx';
import HowToPlay from './pages/HowToPlay';
import Gameplay from './pages/Gameplay';
import Changelog from './pages/Changelog';
import Imprint from './pages/Imprint';
import Rules from './pages/Rules';
import CustomStructures from './pages/CustomStructures';
import Commands from './pages/Commands';
import GameSettings from './pages/GameSettings';

// Components
import Navigation from './components/common/Navigation';

// Config
import { COLORS } from './config/constants';

/*
 * The two standalone routes are code-split.
 *
 * Both are heavy and mutually exclusive with everything else: the wheel pulls
 * in three.js, and the stats module carries its own design system. Loading
 * either eagerly meant every visitor to a reference page downloaded both.
 */
const WheelOfFortune = lazy(() => import('./components/wheel/WheelOfFortune'));
const StatsShell = lazy(() => import('./pages/Stats/StatsShell.jsx'));

/** Full-bleed placeholder while a split route's chunk arrives. */
function RouteFallback() {
    return <div style={{ minHeight: '100vh', background: COLORS.bg }} />;
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
        return (
            <Suspense fallback={<RouteFallback />}>
                <WheelOfFortune onBack={() => navigate('home')} />
            </Suspense>
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
        </div>
    );
}