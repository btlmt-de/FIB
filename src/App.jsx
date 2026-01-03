import React, { useState, useEffect } from 'react';
import HomePage from './HomePage';
import ForceItemPools from './ForceItemPools';
import HowToPlay from './HowToPlay';
import Changelog from './Changelog';
import Imprint from './Imprint';
import CustomStructures from './CustomStructures';
import WheelOfFortune from './WheelOfFortune';

const COLORS = {
    bg: '#1a1a2e',
    bgLight: '#252542',
    text: '#e0e0e0',
    textMuted: '#888',
    border: '#3d3d5c',
    accent: '#5865F2',
    gold: '#FFAA00'
};

function Navigation({ currentPage, onNavigate }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const navItems = [
        { id: 'home', label: 'Home' },
        { id: 'how-to-play', label: 'How to Play' },
        { id: 'pools', label: 'Item Pools' },
        { id: 'structures', label: 'Custom Content' },
        { id: 'changelog', label: 'Changelog' },
        { id: 'wheel', label: '🎰 Wheel', special: true }
    ];

    return (
        <nav style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: COLORS.bg,
            borderBottom: `1px solid ${COLORS.border}`,
            padding: '0 20px'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: '56px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => onNavigate('home')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: COLORS.text,
                            fontSize: '16px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = COLORS.bgLight}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <span>FIB</span>
                    </button>

                    {!isMobile && (
                        <>
                            <div style={{
                                width: '1px',
                                height: '24px',
                                background: COLORS.border,
                                margin: '0 8px'
                            }} />

                            {navItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => onNavigate(item.id)}
                                    style={{
                                        background: currentPage === item.id ? COLORS.bgLight : 'transparent',
                                        border: item.special ? `1px solid ${COLORS.gold}44` : 'none',
                                        color: item.special ? COLORS.gold : (currentPage === item.id ? COLORS.text : COLORS.textMuted),
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        padding: '8px 14px',
                                        borderRadius: '4px',
                                        transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={e => {
                                        if (currentPage !== item.id) e.currentTarget.style.background = COLORS.bgLight;
                                    }}
                                    onMouseLeave={e => {
                                        if (currentPage !== item.id) e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </>
                    )}
                </div>

                {/* Mobile menu button */}
                {isMobile && (
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: COLORS.text,
                            fontSize: '24px',
                            cursor: 'pointer',
                            padding: '8px'
                        }}
                    >
                        {mobileMenuOpen ? '✕' : '☰'}
                    </button>
                )}
            </div>

            {/* Mobile menu dropdown */}
            {isMobile && mobileMenuOpen && (
                <div style={{
                    position: 'absolute',
                    top: '56px',
                    left: 0,
                    right: 0,
                    background: COLORS.bg,
                    borderBottom: `1px solid ${COLORS.border}`,
                    padding: '8px 20px 16px'
                }}>
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                onNavigate(item.id);
                                setMobileMenuOpen(false);
                            }}
                            style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                background: currentPage === item.id ? COLORS.bgLight : 'transparent',
                                border: 'none',
                                color: item.special ? COLORS.gold : (currentPage === item.id ? COLORS.text : COLORS.textMuted),
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                padding: '12px 14px',
                                borderRadius: '4px',
                                marginTop: '4px'
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </nav>
    );
}

export default function App() {
    // Simple routing based on hash
    const getPageFromHash = () => {
        const hash = window.location.hash.slice(1).split('?')[0]; // Remove query params
        if (hash === 'pools') return 'pools';
        if (hash === 'how-to-play') return 'how-to-play';
        if (hash === 'changelog') return 'changelog';
        if (hash === 'imprint') return 'imprint';
        if (hash === 'structures') return 'structures';
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
        </div>
    );
}