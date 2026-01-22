import React, { useState, useEffect } from 'react';

// Pages
import HomePage from './pages/HomePage';
import ForceItemPools from './pages/ItemPools/ForceItemPools.jsx';
import HowToPlay from './pages/HowToPlay';
import Changelog from './pages/Changelog';
import Imprint from './pages/Imprint';
import CustomStructures from './pages/CustomStructures';
import Commands from './pages/Commands';
import GameSettings from './pages/GameSettings';
import Stats from './pages/Stats/Stats.jsx';

// Components
import Navigation from './components/common/Navigation';
import WheelOfFortune from './components/wheel/WheelOfFortune';

// Config
import { COLORS } from './config/constants';

// Route lookup map
const ROUTE_MAP = {
    'pools': 'pools',
    'how-to-play': 'how-to-play',
    'changelog': 'changelog',
    'imprint': 'imprint',
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
        return <WheelOfFortune onBack={() => navigate('home')} />;
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

            {currentPage === 'changelog' && (
                <Changelog />
            )}

            {currentPage === 'imprint' && (
                <Imprint />
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

            {currentPage === 'stats' && (
                <Stats />
            )}

            {currentPage === 'settings' && (
                <GameSettings />
            )}
        </div>
    );
}