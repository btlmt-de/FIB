import React from 'react';
import Heart from 'lucide-react/dist/esm/icons/heart';

/*
 * The wiki's footer (styles in src/wiki/wiki.css). One line: who runs it, where the
 * code lives, the legal page, and the one disclaimer every Minecraft site owes.
 *
 * The `style` prop survives because pages that have not moved to the new system
 * yet still pass one to sit the footer on their own ground.
 */

const LINKS = [
    { label: 'GitHub',       href: 'https://github.com/McPlayHDnet/ForceItemBattle', external: true },
    { label: 'McPlayHD.net', href: 'https://mcplayhd.net',                           external: true },
    { label: 'Imprint',      href: '/imprint',                                        external: false },
];

export default function Footer({ style = {} }) {
    return (
        <footer className="wk-foot" style={style}>
            <hr className="wk-seam" style={{ marginBottom: 24 }} />
            <div className="wk-wrap wk-foot-in">
                <span>
                    ForceItemBattle, a McPlayHD.net game mode.{' '}
                    <span className="wk-foot-made">
                        Made with <Heart size={13} fill="currentColor" strokeWidth={0} aria-label="love" role="img" />
                    </span>
                </span>
                <nav className="wk-foot-links" aria-label="Footer">
                    {LINKS.map(({ label, href, external }) => (
                        <a key={label} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                            {label}
                        </a>
                    ))}
                </nav>
                <span>Not affiliated with Mojang Studios</span>
            </div>
        </footer>
    );
}
