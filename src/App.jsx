import React, { useState, useEffect } from 'react';
import HomePage from './HomePage';
import ForceItemPools from './ForceItemPools';
import HowToPlay from './HowToPlay';
import Changelog from './Changelog';
import Imprint from './Imprint';
import Commands from './Commands';
import CustomStructures from './CustomStructures';

const COLORS = {
    bg: '#1a1a2e',
    bgLight: '#252542',
    text: '#e0e0e0',
    textMuted: '#888',
    border: '#3d3d5c',
    accent: '#5865F2'
};

function Navigation({ currentPage, onNavigate }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth >= 768) {
                setMobileMenuOpen(false);
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleNavigate = (page) => {
        onNavigate(page);
        setMobileMenuOpen(false);
    };

    const navItems = [
        { id: 'home', label: 'Home' },
        { id: 'how-to-play', label: 'How to Play' },
        { id: 'pools', label: 'Item Pools' },
        { id: 'changelog', label: 'Changelog' },
        { id: 'commands', label: 'Commands' },
        { id: 'structures', label: 'Custom Content' }
    ];

    const disabledItems = ['Settings'];

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
                gap: '8px',
                height: '56px'
            }}>
                {/* Logo / Brand */}
                <button
                    onClick={() => handleNavigate('home')}
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
                    <div style={{
                        width: '1px',
                        height: '24px',
                        background: COLORS.border,
                        margin: '0 8px'
                    }} />
                )}

                {/* Desktop Navigation */}
                {!isMobile && (<>
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleNavigate(item.id)}
                                style={{
                                    background: currentPage === item.id ? COLORS.bgLight : 'transparent',
                                    border: 'none',
                                    color: currentPage === item.id ? COLORS.text : COLORS.textMuted,
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

                        {disabledItems.map(item => (
                            <button
                                key={item}
                                disabled
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: COLORS.textMuted,
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    padding: '8px 14px',
                                    borderRadius: '4px',
                                    opacity: 0.4,
                                    cursor: 'not-allowed'
                                }}
                            >
                                {item}
                            </button>
                        ))}
                    </>
                )}

                {/* Spacer to push hamburger to the right on mobile */}
                {isMobile && <div style={{ flex: 1 }} />}

                {/* Mobile Hamburger Button */}
                {isMobile && (
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: COLORS.text,
                            padding: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: '40px',
                            height: '40px'
                        }}
                        aria-label="Toggle menu"
                    >
                        <span style={{
                            display: 'block',
                            width: '22px',
                            height: '2px',
                            background: COLORS.text,
                            borderRadius: '1px',
                            transition: 'all 0.3s',
                            transform: mobileMenuOpen ? 'rotate(45deg) translateY(7px)' : 'none'
                        }} />
                        <span style={{
                            display: 'block',
                            width: '22px',
                            height: '2px',
                            background: COLORS.text,
                            borderRadius: '1px',
                            transition: 'all 0.3s',
                            opacity: mobileMenuOpen ? 0 : 1
                        }} />
                        <span style={{
                            display: 'block',
                            width: '22px',
                            height: '2px',
                            background: COLORS.text,
                            borderRadius: '1px',
                            transition: 'all 0.3s',
                            transform: mobileMenuOpen ? 'rotate(-45deg) translateY(-7px)' : 'none'
                        }} />
                    </button>
                )}
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobile && mobileMenuOpen && (
                <div style={{
                    position: 'absolute',
                    top: '56px',
                    left: 0,
                    right: 0,
                    background: COLORS.bg,
                    borderBottom: `1px solid ${COLORS.border}`,
                    padding: '8px 0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => handleNavigate(item.id)}
                            style={{
                                display: 'block',
                                width: '100%',
                                background: currentPage === item.id ? COLORS.bgLight : 'transparent',
                                border: 'none',
                                color: currentPage === item.id ? COLORS.text : COLORS.textMuted,
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                padding: '14px 24px',
                                textAlign: 'left',
                                transition: 'all 0.15s'
                            }}
                        >
                            {item.label}
                        </button>
                    ))}

                    <div style={{
                        height: '1px',
                        background: COLORS.border,
                        margin: '8px 20px'
                    }} />

                    {disabledItems.map(item => (
                        <button
                            key={item}
                            disabled
                            style={{
                                display: 'block',
                                width: '100%',
                                background: 'transparent',
                                border: 'none',
                                color: COLORS.textMuted,
                                fontSize: '14px',
                                fontWeight: '500',
                                padding: '14px 24px',
                                textAlign: 'left',
                                opacity: 0.4,
                                cursor: 'not-allowed'
                            }}
                        >
                            {item}
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
        const hash = window.location.hash.slice(1);
        if (hash === 'pools') return 'pools';
        if (hash === 'how-to-play') return 'how-to-play';
        if (hash === 'changelog') return 'changelog';
        if (hash === 'imprint') return 'imprint';
        if (hash === 'commands') return 'commands';
        if (hash === 'structures') return 'structures';
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

            {currentPage === 'commands' && (
                <Commands />
            )}

            {currentPage === 'structures' && (
                <CustomStructures />
            )}
        </div>
    );
}