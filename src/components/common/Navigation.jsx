import React, { useState, useEffect, useRef } from 'react';
import { COLORS, IMAGE_BASE_URL } from '../../config/constants';
import Home from 'lucide-react/dist/esm/icons/home';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import Layers from 'lucide-react/dist/esm/icons/layers';
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3';
import Puzzle from 'lucide-react/dist/esm/icons/puzzle';
import Terminal from 'lucide-react/dist/esm/icons/terminal';
import Settings from 'lucide-react/dist/esm/icons/settings';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Menu from 'lucide-react/dist/esm/icons/menu';
import X from 'lucide-react/dist/esm/icons/x';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import unicodeItems from '../../../unicodeItems.json';

// Get random item for logo (computed once at module load, same as favicon)
const mainItems = unicodeItems
    .filter(item => !item.material.endsWith('_tabChat'))
    .map(item => item.material.toLowerCase());
const randomLogoItem = mainItems[Math.floor(Math.random() * mainItems.length)];

const NAV_ITEMS = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'how-to-play', label: 'How to Play', icon: BookOpen },
    { id: 'pools', label: 'Item Pools', icon: Layers },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'structures', label: 'Custom Content', icon: Puzzle },
    { id: 'commands', label: 'Commands', icon: Terminal },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'changelog', label: 'Changelog', icon: FileText },
    { id: 'wheel', label: 'Wheel', icon: Sparkles, special: true }
];

// Desktop nav item with icon + text
const NavItem = ({ item, isActive, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    const Icon = item.icon;

    if (item.special) {
        return (
            <button
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 16px',
                    background: isHovered
                        ? `linear-gradient(135deg, ${COLORS.gold}22 0%, ${COLORS.orange}15 100%)`
                        : 'transparent',
                    border: `1.5px solid ${isHovered ? COLORS.gold : COLORS.gold + '55'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease-out',
                    boxShadow: isHovered ? `0 0 16px ${COLORS.gold}25` : 'none',
                }}
            >
                <span style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: COLORS.gold,
                    letterSpacing: '0.3px',
                }}>
                    {item.label}
                </span>
            </button>
        );
    }

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                background: isActive
                    ? COLORS.bgLight
                    : isHovered
                        ? COLORS.bgLight + '88'
                        : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.12s ease-out',
                position: 'relative',
            }}
        >
            <Icon
                size={15}
                style={{
                    color: isActive ? COLORS.accent : isHovered ? COLORS.text : COLORS.textMuted,
                    transition: 'color 0.12s ease-out',
                }}
            />
            <span style={{
                fontSize: '13px',
                fontWeight: '500',
                color: isActive ? COLORS.text : isHovered ? COLORS.text : COLORS.textMuted,
                transition: 'color 0.12s ease-out',
            }}>
                {item.label}
            </span>

            {/* Active underline */}
            {isActive && (
                <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '12px',
                    right: '12px',
                    height: '2px',
                    background: COLORS.accent,
                    borderRadius: '2px 2px 0 0',
                }} />
            )}
        </button>
    );
};

// Mobile menu item
const MobileMenuItem = ({ item, isActive, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    const Icon = item.icon;

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '14px 16px',
                background: isActive
                    ? COLORS.bgLight
                    : isHovered
                        ? COLORS.bgLight + '66'
                        : 'transparent',
                border: 'none',
                borderLeft: isActive
                    ? `3px solid ${item.special ? COLORS.gold : COLORS.accent}`
                    : '3px solid transparent',
                borderRadius: '0 8px 8px 0',
                cursor: 'pointer',
                transition: 'all 0.12s ease-out',
                marginBottom: '2px',
            }}
        >
            <Icon
                size={18}
                style={{
                    color: item.special
                        ? COLORS.gold
                        : isActive
                            ? COLORS.accent
                            : COLORS.textMuted,
                }}
            />
            <span style={{
                flex: 1,
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: item.special ? '600' : '500',
                color: item.special
                    ? COLORS.gold
                    : isActive
                        ? COLORS.text
                        : COLORS.textMuted,
            }}>
                {item.label}
            </span>
            <ChevronRight
                size={16}
                style={{
                    color: COLORS.border,
                    opacity: isHovered || isActive ? 1 : 0,
                    transition: 'opacity 0.12s ease-out',
                }}
            />
        </button>
    );
};

export default function Navigation({ currentPage, onNavigate }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        setIsMobile(window.innerWidth < 1024);
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMobileMenuOpen(false);
            }
        };
        if (mobileMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [mobileMenuOpen]);

    return (
        <>
            <nav style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                background: COLORS.bg,
                borderBottom: `1px solid ${COLORS.border}`,
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    height: '56px',
                    padding: '0 20px',
                    gap: '8px',
                }}>
                    {/* Logo */}
                    <button
                        onClick={() => onNavigate('home')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            marginRight: '8px',
                            transition: 'background 0.12s ease-out',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = COLORS.bgLight}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        {/* Random item icon */}
                        <div style={{
                            width: '32px',
                            height: '32px',
                            background: COLORS.bgLight,
                            border: `2px solid ${COLORS.border}`,
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                        }}>
                            <img
                                src={`${IMAGE_BASE_URL}/${randomLogoItem}.png`}
                                alt=""
                                style={{
                                    width: '24px',
                                    height: '24px',
                                }}
                            />
                        </div>
                        <span style={{
                            fontSize: '15px',
                            fontWeight: '700',
                            color: COLORS.text,
                            letterSpacing: '0.5px',
                        }}>
                            FIB
                        </span>
                    </button>

                    {/* Divider */}
                    <div style={{
                        width: '1px',
                        height: '24px',
                        background: COLORS.border,
                        marginRight: '8px',
                    }} />

                    {/* Desktop Navigation */}
                    {!isMobile && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                        }}>
                            {NAV_ITEMS.map((item) => (
                                <NavItem
                                    key={item.id}
                                    item={item}
                                    isActive={currentPage === item.id}
                                    onClick={() => onNavigate(item.id)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Mobile menu button */}
                    {isMobile && (
                        <>
                            <div style={{ flex: 1 }} />
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                                aria-expanded={mobileMenuOpen}
                                aria-controls="mobile-menu-panel"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '40px',
                                    height: '40px',
                                    background: mobileMenuOpen ? COLORS.bgLight : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'background 0.12s ease-out',
                                }}
                            >
                                {mobileMenuOpen ? (
                                    <X size={22} style={{ color: COLORS.text }} />
                                ) : (
                                    <Menu size={22} style={{ color: COLORS.textMuted }} />
                                )}
                            </button>
                        </>
                    )}
                </div>
            </nav>

            {/* Mobile menu overlay */}
            {isMobile && mobileMenuOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        top: '56px',
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 99,
                    }}
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile menu panel */}
            {isMobile && (
                <div
                    ref={menuRef}
                    id="mobile-menu-panel"
                    aria-hidden={!mobileMenuOpen}
                    tabIndex={mobileMenuOpen ? 0 : -1}
                    style={{
                        position: 'fixed',
                        top: '56px',
                        right: 0,
                        width: '280px',
                        maxWidth: '85vw',
                        height: 'calc(100vh - 56px)',
                        background: COLORS.bg,
                        borderLeft: `1px solid ${COLORS.border}`,
                        transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(100%)',
                        transition: 'transform 0.2s ease-out',
                        zIndex: 100,
                        overflowY: 'auto',
                        pointerEvents: mobileMenuOpen ? 'auto' : 'none',
                    }}
                >
                    <div style={{ padding: '12px 8px' }}>
                        {NAV_ITEMS.map((item) => (
                            <MobileMenuItem
                                key={item.id}
                                item={item}
                                isActive={currentPage === item.id}
                                onClick={() => {
                                    onNavigate(item.id);
                                    setMobileMenuOpen(false);
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}