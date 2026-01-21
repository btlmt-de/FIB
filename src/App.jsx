import React, { useState, useEffect } from 'react';

// Pages
import HomePage from './pages/HomePage';
import ForceItemPools from './pages/ForceItemPools';
import HowToPlay from './pages/HowToPlay';
import Changelog from './pages/Changelog';
import Imprint from './pages/Imprint';
import CustomStructures from './pages/CustomStructures';
import Commands from './pages/Commands';
import GameSettings from './pages/GameSettings';

// Components
import Navigation from './components/common/Navigation';
import WheelOfFortune from './components/wheel/WheelOfFortune';

// Config
import { COLORS } from './config/constants';

export default function App() {
    const getPageFromPath = () => {
        const path = window.location.pathname.slice(1); // Remove leading /
        if (path === 'pools') return 'pools';
        if (path === 'how-to-play') return 'how-to-play';
        if (path === 'changelog') return 'changelog';
        if (path === 'imprint') return 'imprint';
        if (path === 'structures') return 'structures';
        if (path === 'commands') return 'commands';
        if (path === 'settings') return 'settings';
        if (path === 'wheel') return 'wheel';
        return 'home';
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

            {currentPage === 'settings' && (
                <GameSettings />
            )}
        </div>
    );
}