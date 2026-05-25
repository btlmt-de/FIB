import React from 'react';

const FOOTER_LINKS = [
    { label: 'GitHub',      href: 'https://github.com/McPlayHDnet/ForceItemBattle', external: true  },
    { label: 'McPlayHD.net',href: 'https://mcplayhd.net',                           external: true  },
    { label: 'Imprint',     href: '/imprint',                                        external: false },
];

const CSS = `
  .ftr {
    text-align: center;
    padding: 48px 20px 40px;
    border-top: 1px solid oklch(30% 0.019 255 / 0.40);
    font-family: 'Barlow', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .ftr-links {
    display: flex; justify-content: center; gap: 4px;
    margin-bottom: 20px; flex-wrap: wrap;
  }
  .ftr-link {
    color: oklch(48% 0.012 255);
    text-decoration: none;
    font-size: 13px; font-weight: 500;
    padding: 6px 12px; border-radius: 5px;
    transition: color 0.12s ease-out, background 0.12s ease-out;
  }
  .ftr-link:hover {
    color: oklch(80% 0.009 255);
    background: oklch(28% 0.019 255 / 0.50);
  }
  .ftr-made {
    font-size: 13.5px; font-weight: 500;
    color: oklch(48% 0.012 255);
    margin: 0 0 10px;
  }
  .ftr-legal {
    font-size: 11px;
    color: oklch(36% 0.013 255);
    margin: 0;
  }
`;

export default function Footer({ style = {} }) {
    return (
        <>
            <style>{CSS}</style>
            <footer className="ftr" style={style}>
                <div className="ftr-links">
                    {FOOTER_LINKS.map(({ label, href, external }) => (
                        <a
                            key={label}
                            href={href}
                            className="ftr-link"
                            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        >
                            {label}
                        </a>
                    ))}
                </div>
                <p className="ftr-made">Made with ❤️</p>
                <p className="ftr-legal">Not affiliated with Mojang Studios</p>
            </footer>
        </>
    );
}