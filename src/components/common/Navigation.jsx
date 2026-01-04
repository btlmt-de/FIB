import React, { useState, useEffect } from 'react';
import { COLORS } from '../../config/constants';

const NAV_ITEMS = [
    { id: 'home', label: 'Home' },
    { id: 'how-to-play', label: 'How to Play' },
    { id: 'pools', label: 'Item Pools' },
    { id: 'structures', label: 'Custom Content' },
    { id: 'commands', label: 'Commands' },
    { id: 'changelog', label: 'Changelog' },
    { id: 'wheel', label: '🎰 Wheel', special: true }
];

/**
 * Render a responsive top navigation bar that shows horizontal items on desktop and a toggleable dropdown on mobile.
 * @param {string} currentPage - The id of the currently active page used to apply active styling to the corresponding item.
 * @param {(pageId: string) => void} onNavigate - Callback invoked with the target page id when a navigation item or brand is selected.
 * @returns {JSX.Element} The navigation bar element.
 */
export default function Navigation({ currentPage, onNavigate }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

                            {NAV_ITEMS.map(item => (
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
                    {NAV_ITEMS.map(item => (
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