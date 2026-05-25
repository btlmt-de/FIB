import React, { useState, useEffect, useRef } from 'react';
import Home         from 'lucide-react/dist/esm/icons/home';
import BookOpen     from 'lucide-react/dist/esm/icons/book-open';
import Layers       from 'lucide-react/dist/esm/icons/layers';
import BarChart3    from 'lucide-react/dist/esm/icons/bar-chart-3';
import Puzzle       from 'lucide-react/dist/esm/icons/puzzle';
import Terminal     from 'lucide-react/dist/esm/icons/terminal';
import Settings     from 'lucide-react/dist/esm/icons/settings';
import FileText     from 'lucide-react/dist/esm/icons/file-text';
import Sparkles     from 'lucide-react/dist/esm/icons/sparkles';
import Gamepad2     from 'lucide-react/dist/esm/icons/gamepad-2';
import X            from 'lucide-react/dist/esm/icons/x';
import Menu         from 'lucide-react/dist/esm/icons/menu';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import unicodeItems from '../../../unicodeItems.json';
import { COLORS as C, IMAGE_BASE_URL } from '../../config/constants';

const mainItems = unicodeItems
    .filter(i => !i.material.endsWith('_tabChat'))
    .map(i => i.material.toLowerCase());
const randomLogoItem = mainItems[Math.floor(Math.random() * mainItems.length)];

// Grouped nav — Play | dot | Reference | dot | Wheel
const NAV_GROUPS = [
    [
        { id: 'home',        label: 'Home',           icon: Home      },
        { id: 'how-to-play', label: 'How to Play',    icon: BookOpen  },
        { id: 'gameplay',    label: 'Gameplay',       icon: Gamepad2  },
        { id: 'pools',       label: 'Item Pools',     icon: Layers    },
        { id: 'stats',       label: 'Stats',          icon: BarChart3 },
    ],
    [
        { id: 'structures',  label: 'Custom Content', icon: Puzzle    },
        { id: 'commands',    label: 'Commands',       icon: Terminal  },
        { id: 'settings',    label: 'Settings',       icon: Settings  },
        { id: 'changelog',   label: 'Changelog',      icon: FileText  },
    ],
];

const SPECIAL_ITEMS = [
    { id: 'wheel', label: 'Wheel', icon: Sparkles, special: true },
];

const ALL_ITEMS = [...NAV_GROUPS.flat(), ...SPECIAL_ITEMS];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800;900&display=swap');

  /* ── Nav shell ── */
  .nav {
    position: sticky; top: 0; z-index: 100;
    background: oklch(21% 0.023 255);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid oklch(27% 0.020 255);
    font-family: 'Barlow', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .nav-inner {
    max-width: 1280px; margin: 0 auto;
    display: flex; align-items: center;
    height: 56px; padding: 0 20px; gap: 2px;
  }

  /* ── Logo ── */
  .nav-logo {
    display: flex; align-items: center; gap: 10px;
    background: none; border: none; cursor: pointer;
    padding: 6px 10px 6px 4px;
    border-radius: 8px; margin-right: 8px; flex-shrink: 0;
    transition: background 0.12s ease-out;
  }
  .nav-logo:hover { background: oklch(26% 0.022 255); }

  .nav-logo-frame {
    width: 32px; height: 32px; flex-shrink: 0;
    background: oklch(17% 0.025 255);
    border: 1px solid oklch(32% 0.018 255);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .nav-logo-frame img { width: 24px; height: 24px; image-rendering: pixelated; }

  .nav-logo-text {
    display: flex; flex-direction: column; line-height: 1;
  }
  .nav-logo-name {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 18px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 1.5px;
    color: oklch(94% 0.007 255);
  }

  /* ── Group dot separator ── */
  .nav-group-sep {
    width: 3px; height: 3px; border-radius: 50%;
    background: oklch(32% 0.018 255);
    flex-shrink: 0; margin: 0 8px;
  }

  /* ── Desktop nav items ── */
  .nav-items { display: flex; align-items: center; gap: 1px; }

  .nav-item {
    display: flex; align-items: center; gap: 5px;
    padding: 6px 11px; cursor: pointer;
    background: none; border: none;
    border-radius: 6px;
    font-family: 'Barlow', system-ui, sans-serif;
    font-size: 12.5px; font-weight: 500;
    color: oklch(54% 0.012 255);
    transition: background 0.1s ease-out, color 0.1s ease-out;
    white-space: nowrap; flex-shrink: 0;
  }
  .nav-item:hover {
    background: oklch(27% 0.021 255);
    color: oklch(88% 0.009 255);
  }
  /* Active: solid amber pill — unmistakable */
  .nav-item.active {
    background: oklch(76% 0.16 68);
    color: oklch(14% 0.01 50);
    font-weight: 700;
  }
  .nav-item.active:hover {
    background: oklch(80% 0.16 68);
    color: oklch(10% 0.01 50);
  }

  /* Wheel: amber border + text, separate from regular items */
  .nav-item.special {
    color: oklch(76% 0.16 68);
    border: 1px solid oklch(76% 0.16 68 / 0.28);
    background: oklch(76% 0.16 68 / 0.06);
    margin-left: 6px;
  }
  .nav-item.special:hover {
    background: oklch(76% 0.16 68 / 0.14);
    border-color: oklch(76% 0.16 68 / 0.55);
    color: oklch(82% 0.16 68);
  }
  .nav-item.special.active {
    background: oklch(76% 0.16 68);
    border-color: oklch(76% 0.16 68);
    color: oklch(14% 0.01 50);
  }

  /* Icons hidden below 1060px, labels compress at 920px */
  @media (max-width: 1060px) { .nav-icon { display: none; } }
  @media (max-width: 920px)  { .nav-item { font-size: 11.5px; padding: 6px 8px; } }

  /* ── Hamburger ── */
  .nav-hamburger {
    display: flex; align-items: center; justify-content: center;
    width: 38px; height: 38px;
    background: none; border: none; cursor: pointer;
    border-radius: 7px; color: oklch(56% 0.012 255);
    transition: background 0.12s ease-out, color 0.12s ease-out;
  }
  .nav-hamburger:hover,
  .nav-hamburger.open { background: oklch(27% 0.021 255); color: oklch(94% 0.007 255); }

  /* ── Mobile backdrop ── */
  .nav-backdrop {
    position: fixed; inset: 0; top: 56px;
    background: oklch(6% 0.022 255 / 0.72);
    z-index: 99;
  }

  /* ── Mobile drawer ── */
  .nav-drawer {
    position: fixed; top: 56px; right: 0;
    width: 280px; max-width: 88vw;
    height: calc(100vh - 56px);
    background: oklch(20% 0.024 255);
    border-left: 1px solid oklch(28% 0.020 255);
    z-index: 100; overflow-y: auto;
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .nav-drawer.closed { transform: translateX(100%); pointer-events: none; }
  .nav-drawer.open   { transform: translateX(0); }

  .nav-drawer-section { padding: 8px 10px 4px; }
  .nav-drawer-section-label {
    font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 2px;
    color: oklch(36% 0.013 255);
    padding: 4px 10px 8px;
  }

  .nav-mobile-item {
    display: flex; align-items: center; gap: 13px;
    width: 100%; padding: 10px 12px;
    background: none; border: none; cursor: pointer;
    border-radius: 7px; margin-bottom: 1px;
    font-family: 'Barlow', system-ui, sans-serif;
    font-size: 13.5px; font-weight: 500;
    color: oklch(56% 0.012 255); text-align: left;
    transition: background 0.1s ease-out, color 0.1s ease-out;
  }
  .nav-mobile-item:hover { background: oklch(26% 0.022 255); color: oklch(88% 0.009 255); }
  .nav-mobile-item.active {
    background: oklch(76% 0.16 68 / 0.12);
    color: oklch(76% 0.16 68);
    font-weight: 600;
  }
  .nav-mobile-item.special {
    color: oklch(76% 0.16 68);
    background: oklch(76% 0.16 68 / 0.06);
    border: 1px solid oklch(76% 0.16 68 / 0.18);
  }
  .nav-mobile-item.special:hover {
    background: oklch(76% 0.16 68 / 0.13);
    border-color: oklch(76% 0.16 68 / 0.38);
  }
  .nav-mobile-icon { flex-shrink: 0; }
  .nav-mobile-label { flex: 1; }
  .nav-mobile-arr { color: oklch(30% 0.017 255); flex-shrink: 0; transition: color 0.1s; }
  .nav-mobile-item:hover .nav-mobile-arr  { color: oklch(50% 0.013 255); }
  .nav-mobile-item.active .nav-mobile-arr { color: oklch(60% 0.12 68); }

  .nav-drawer-sep { height: 1px; background: oklch(26% 0.020 255); margin: 6px 10px; }
`;

function NavItem({ item, isActive, onClick }) {
    const Icon = item.icon;
    let cls = 'nav-item';
    if (isActive)     cls += ' active';
    if (item.special) cls += ' special';
    return (
        <button className={cls} onClick={onClick} aria-current={isActive ? 'page' : undefined}>
            <Icon size={13} className="nav-icon" />
            {item.label}
        </button>
    );
}

function MobileMenuItem({ item, isActive, onClick }) {
    const Icon = item.icon;
    let cls = 'nav-mobile-item';
    if (isActive)     cls += ' active';
    if (item.special) cls += ' special';
    const iconColor = item.special ? C.accent : isActive ? C.accent : C.muted;
    return (
        <button className={cls} onClick={onClick} aria-current={isActive ? 'page' : undefined}>
            <Icon size={17} className="nav-mobile-icon" style={{ color: iconColor }} />
            <span className="nav-mobile-label">{item.label}</span>
            <ChevronRight size={13} className="nav-mobile-arr" />
        </button>
    );
}

const DRAWER_SECTIONS = [
    { label: 'Play',      items: NAV_GROUPS[0] },
    { label: 'Reference', items: NAV_GROUPS[1] },
];

export default function Navigation({ currentPage, onNavigate }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const drawerRef = useRef(null);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 1024);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if (drawerRef.current && !drawerRef.current.contains(e.target)) setMenuOpen(false);
        };
        if (menuOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    const navigate = (id) => { onNavigate(id); setMenuOpen(false); };

    return (
        <>
            <style>{CSS}</style>
            <nav className="nav">
                <div className="nav-inner">

                    {/* Logo */}
                    <button className="nav-logo" onClick={() => navigate('home')}>
                        <div className="nav-logo-frame">
                            <img
                                src={`${IMAGE_BASE_URL}/${randomLogoItem}.png`}
                                alt=""
                                onError={e => { e.target.style.display = 'none'; }}
                            />
                        </div>
                        <div className="nav-logo-text">
                            <span className="nav-logo-name">FIB</span>
                        </div>
                    </button>

                    {/* Desktop nav — all items + dot + Wheel */}
                    {!isMobile && (
                        <div className="nav-items">
                            {NAV_GROUPS.flat().map(item => (
                                <NavItem
                                    key={item.id}
                                    item={item}
                                    isActive={currentPage === item.id}
                                    onClick={() => navigate(item.id)}
                                />
                            ))}
                            <div className="nav-group-sep" style={{ margin: '0 6px' }} />
                            {SPECIAL_ITEMS.map(item => (
                                <NavItem
                                    key={item.id}
                                    item={item}
                                    isActive={currentPage === item.id}
                                    onClick={() => navigate(item.id)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Mobile hamburger */}
                    {isMobile && (
                        <>
                            <div style={{ flex: 1 }} />
                            <button
                                className={`nav-hamburger${menuOpen ? ' open' : ''}`}
                                onClick={() => setMenuOpen(o => !o)}
                                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                                aria-expanded={menuOpen}
                            >
                                {menuOpen ? <X size={20} /> : <Menu size={20} />}
                            </button>
                        </>
                    )}
                </div>
            </nav>

            {/* Mobile backdrop */}
            {isMobile && menuOpen && (
                <div className="nav-backdrop" onClick={() => setMenuOpen(false)} />
            )}

            {/* Mobile drawer */}
            {isMobile && (
                <div
                    ref={drawerRef}
                    className={`nav-drawer${menuOpen ? ' open' : ' closed'}`}
                    aria-hidden={!menuOpen}
                >
                    {DRAWER_SECTIONS.map((section, si) => (
                        <div key={si} className="nav-drawer-section">
                            <div className="nav-drawer-section-label">{section.label}</div>
                            {section.items.map(item => (
                                <MobileMenuItem
                                    key={item.id}
                                    item={item}
                                    isActive={currentPage === item.id}
                                    onClick={() => navigate(item.id)}
                                />
                            ))}
                            {si < DRAWER_SECTIONS.length - 1 && <div className="nav-drawer-sep" />}
                        </div>
                    ))}
                    <div className="nav-drawer-sep" />
                    <div className="nav-drawer-section">
                        {SPECIAL_ITEMS.map(item => (
                            <MobileMenuItem
                                key={item.id}
                                item={item}
                                isActive={currentPage === item.id}
                                onClick={() => navigate(item.id)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}