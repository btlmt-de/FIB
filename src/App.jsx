import React, { useState, useEffect } from 'react';

// Pages
import HomePage from './pages/HomePage';
import ForceItemPools from './pages/ForceItemPools';
import HowToPlay from './pages/HowToPlay';
import Changelog from './pages/Changelog';
import Imprint from './pages/Imprint';
import CustomStructures from './pages/CustomStructures';
import Commands from './pages/Commands';

// Components
import Navigation from './components/common/Navigation';
import WheelOfFortune from './components/wheel/WheelOfFortune';

// Config
import { COLORS } from './config/constants';

/**
 * Top-level application component that handles hash-based routing and renders the appropriate page.
 *
 * The component derives the current page from window.location.hash, updates state when the hash changes,
 * and provides a navigate callback that updates the hash and scrolls to the top. The "wheel" route is
 * rendered as a standalone view without the shared navigation bar.
 *
 * @returns {JSX.Element} The rendered app UI for the current route.
 */
export default function App() {
    // Simple routing based on hash
    const getPageFromHash = () => {
        const hash = window.location.hash.slice(1).split('?')[0]; // Remove query params
        if (hash === 'pools') return 'pools';
        if (hash === 'how-to-play') return 'how-to-play';
        if (hash === 'changelog') return 'changelog';
        if (hash === 'imprint') return 'imprint';
        if (hash === 'structures') return 'structures';
        if (hash === 'commands') return 'commands';
        if (hash === 'wheel') return 'wheel';
        return 'home';
    };

    const [currentPage, setCurrentPage] = useState(getPageFromHash());

    useEffect(() => {
        const handleHashChange = () => {
            setCurrentPage(getPageFromHash());
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const navigate = (page) => {
        window.location.hash = page === 'home' ? '' : page;
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
        </div>
    );
}