import React, { useState, useEffect, useRef } from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import Menu from 'lucide-react/dist/esm/icons/menu';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import Battery from 'lucide-react/dist/esm/icons/battery';
import BatteryLow from 'lucide-react/dist/esm/icons/battery-low';
import { useSaverMode, setSaverMode } from '../../config/power.js';

/*
 * Ships in the entry chunk that wheel and stats also load: import nothing from the wiki atlas.
 * Brand items are ones that stay legible at small sizes.
 */

const BRAND_ITEMS = ['diamond', 'heart_of_the_sea', 'amethyst_shard', 'trial_key', 'echo_shard', 'blaze_rod', 'ender_pearl'];
const brandItem = BRAND_ITEMS[Math.floor(Math.random() * BRAND_ITEMS.length)];

const face = (m) => `/fib-items/${m}.png`;

const GROUPS = [
    {
        label: 'Play',
        items: [
            { id: 'how-to-play', label: 'How to Play',    face: face('crafting_table') },
            { id: 'gameplay',    label: 'Gameplay',       face: face('compass') },
            { id: 'pools',       label: 'Item Pools',     face: face('chest') },
            { id: 'structures',  label: 'Custom Content', face: face('structure_block') },
        ],
    },
    {
        label: 'Reference',
        items: [
            { id: 'commands',  label: 'Commands',  face: face('command_block') },
            { id: 'settings',  label: 'Settings',  face: face('comparator') },
            { id: 'rules',     label: 'Rules',     face: face('writable_book') },
            { id: 'changelog', label: 'Changelog', face: face('book') },
        ],
    },
];

const EXITS = [
    { id: 'stats', label: 'Stats', face: face('spyglass'), note: 'Records and rankings' },
    { id: 'wheel', label: 'Wheel', face: '/fib-custom/wheel.png', note: 'Wheel of Fortune' },
];

function Face({ src, size }) {
    return (
        <span className="wk-slot" style={{ '--slot': `${size}px` }} aria-hidden="true">
            <img className="wk-sprite" src={src} alt="" width="128" height="128" loading="lazy" draggable="false" />
        </span>
    );
}

export default function Navigation({ currentPage, onNavigate }) {
    const [open, setOpen] = useState(false);
    const saverMode = useSaverMode();
    const drawerRef = useRef(null);
    const burgerRef = useRef(null);

    const go = (id) => (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        setOpen(false);
        onNavigate(id);
    };

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') { setOpen(false); burgerRef.current?.focus(); }
        };
        document.addEventListener('keydown', onKey);
        drawerRef.current?.querySelector('a, button')?.focus();
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    const href = (id) => (id === 'home' ? '/' : `/${id}`);

    return (
        <>
            <nav className="wk-nav" aria-label="Main">
                <div className="wk-wrap wk-nav-in">
                    <a className="wk-brand" href="/" onClick={go('home')} aria-label="ForceItemBattle, home">
                        <Face src={face(brandItem)} size={36} />
                        <span className="wk-brand-word">ForceItemBattle</span>
                    </a>

                    {GROUPS.map((g, gi) => (
                        <React.Fragment key={g.label}>
                            {gi > 0 && <span className="wk-nav-sep" aria-hidden="true" />}
                            <ul className="wk-nav-links" aria-label={g.label}>
                                {g.items.map(item => (
                                    <li key={item.id} style={{ display: 'flex' }}>
                                        <a
                                            className="wk-nav-link"
                                            href={href(item.id)}
                                            onClick={go(item.id)}
                                            aria-current={currentPage === item.id ? 'page' : undefined}
                                        >
                                            {item.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </React.Fragment>
                    ))}

                    <div className="wk-nav-exits">
                        {EXITS.map(x => (
                            <a key={x.id} className="wk-exit" href={href(x.id)} onClick={go(x.id)}>
                                <Face src={x.face} size={28} />
                                {x.label}
                                <ArrowUpRight size={14} className="wk-exit-arrow" aria-hidden="true" />
                            </a>
                        ))}
                    </div>

                    <button
                        ref={burgerRef}
                        type="button"
                        className="wk-burger"
                        onClick={() => setOpen(o => !o)}
                        aria-label={open ? 'Close menu' : 'Open menu'}
                        aria-expanded={open}
                        aria-controls="wk-drawer"
                    >
                        {open ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </nav>

            {open && <div className="wk-drawer-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}

            <div id="wk-drawer" ref={drawerRef} className="wk-drawer" data-open={open} aria-hidden={!open}>
                <a className="wk-drawer-row" href="/" onClick={go('home')} aria-current={currentPage === 'home' ? 'page' : undefined}>
                    <Face src={face(brandItem)} size={40} />
                    Home
                </a>
                {GROUPS.map(g => (
                    <div key={g.label}>
                        <span className="wk-label">{g.label}</span>
                        {g.items.map(item => (
                            <a
                                key={item.id}
                                className="wk-drawer-row"
                                href={href(item.id)}
                                onClick={go(item.id)}
                                aria-current={currentPage === item.id ? 'page' : undefined}
                            >
                                <Face src={item.face} size={40} />
                                {item.label}
                            </a>
                        ))}
                    </div>
                ))}
                <span className="wk-label">Elsewhere</span>
                {EXITS.map(x => (
                    <a key={x.id} className="wk-drawer-row" href={href(x.id)} onClick={go(x.id)}>
                        <Face src={x.face} size={40} />
                        {x.label}
                        <span className="wk-drawer-note">{x.note}</span>
                    </a>
                ))}

                {/* Saver mode is device-wide, so it must be switchable from the wiki too. */}
                <span className="wk-label">Display</span>
                <button
                    type="button"
                    className="wk-drawer-row"
                    aria-pressed={saverMode}
                    onClick={() => setSaverMode(!saverMode)}
                >
                    <span className="wk-slot" style={{ '--slot': '40px' }} aria-hidden="true">
                        {saverMode ? <BatteryLow size={18} /> : <Battery size={18} />}
                    </span>
                    Battery saver
                    <span className="wk-drawer-note">{saverMode ? 'On' : 'Off'}</span>
                </button>
            </div>
        </>
    );
}
