import React, { useState, useEffect } from 'react';
import HomePage from './HomePage';
import ForceItemPools from './ForceItemPools';
import HowToPlay from './HowToPlay';

const COLORS = {
    bg: '#1a1a2e',
    bgLight: '#252542',
    text: '#e0e0e0',
    textMuted: '#888',
    border: '#3d3d5c',
    accent: '#5865F2'
};

function Navigation({ currentPage, onNavigate }) {
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

                <div style={{
                    width: '1px',
                    height: '24px',
                    background: COLORS.border,
                    margin: '0 8px'
                }} />

                <button
                    onClick={() => onNavigate('home')}
                    style={{
                        background: currentPage === 'home' ? COLORS.bgLight : 'transparent',
                        border: 'none',
                        color: currentPage === 'home' ? COLORS.text : COLORS.textMuted,
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        padding: '8px 14px',
                        borderRadius: '4px',
                        transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => {
                        if (currentPage !== 'home') e.currentTarget.style.background = COLORS.bgLight;
                    }}
                    onMouseLeave={e => {
                        if (currentPage !== 'home') e.currentTarget.style.background = 'transparent';
                    }}
                >
                    Home
                </button>

                <button
                    onClick={() => onNavigate('how-to-play')}
                    style={{
                        background: currentPage === 'how-to-play' ? COLORS.bgLight : 'transparent',
                        border: 'none',
                        color: currentPage === 'how-to-play' ? COLORS.text : COLORS.textMuted,
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        padding: '8px 14px',
                        borderRadius: '4px',
                        transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => {
                        if (currentPage !== 'how-to-play') e.currentTarget.style.background = COLORS.bgLight;
                    }}
                    onMouseLeave={e => {
                        if (currentPage !== 'how-to-play') e.currentTarget.style.background = 'transparent';
                    }}
                >
                    How to Play
                </button>

                <button
                    onClick={() => onNavigate('pools')}
                    style={{
                        background: currentPage === 'pools' ? COLORS.bgLight : 'transparent',
                        border: 'none',
                        color: currentPage === 'pools' ? COLORS.text : COLORS.textMuted,
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        padding: '8px 14px',
                        borderRadius: '4px',
                        transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => {
                        if (currentPage !== 'pools') e.currentTarget.style.background = COLORS.bgLight;
                    }}
                    onMouseLeave={e => {
                        if (currentPage !== 'pools') e.currentTarget.style.background = 'transparent';
                    }}
                >
                    Item Pools
                </button>

                {/* Future nav items - disabled */}
                {['Settings', 'Commands'].map(item => (
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
            </div>
        </nav>
    );
}

export default function App() {
    // Simple routing based on hash
    const getPageFromHash = () => {
        const hash = window.location.hash.slice(1);
        if (hash === 'pools') return 'pools';
        if (hash === 'how-to-play') return 'how-to-play';
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

            {currentPage === 'pools' && (
                <ForceItemPools />
            )}
        </div>
    );
}