import React from 'react';
import Heart from 'lucide-react/dist/esm/icons/heart';

const LINKS = [
    { label: 'GitHub',       href: 'https://github.com/McPlayHDnet/ForceItemBattle', external: true },
    { label: 'McPlayHD.net', href: 'https://mcplayhd.net',                           external: true },
    { label: 'Imprint',      href: '/imprint',                                        external: false },
];

export default function Footer() {
    return (
        <footer className="wk-foot">
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
