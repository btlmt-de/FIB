import React from 'react';
import { COLORS } from '../../config/constants';

const FOOTER_LINKS = [
    {
        label: 'GitHub',
        href: 'https://github.com/McPlayHDnet/ForceItemBattle',
        external: true
    },
    {
        label: 'McPlayHD.net',
        href: 'https://mcplayhd.net',
        external: true
    },
    {
        label: 'Imprint',
        href: '/imprint',
        external: false
    }
];

function FooterLink({ label, href, external }) {
    const linkProps = external ? {
        target: '_blank',
        rel: 'noopener noreferrer'
    } : {};

    return (
        <a
            href={href}
            {...linkProps}
            style={{
                color: COLORS.textMuted,
                textDecoration: 'none',
                fontSize: '13px',
                transition: 'all 0.3s ease',
                padding: '8px 14px',
                borderRadius: '6px'
            }}
            onMouseEnter={e => {
                e.currentTarget.style.color = COLORS.text;
                e.currentTarget.style.background = `${COLORS.border}44`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.color = COLORS.textMuted;
                e.currentTarget.style.background = 'transparent';
            }}
        >
            {label}
        </a>
    );
}

export default function Footer({ style = {} }) {
    return (
        <div style={{
            textAlign: 'center',
            padding: '48px 20px 40px',
            borderTop: `1px solid ${COLORS.border}44`,
            color: COLORS.textMuted,
            fontSize: '13px',
            ...style
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '24px',
                marginBottom: '20px',
                flexWrap: 'wrap'
            }}>
                {FOOTER_LINKS.map(link => (
                    <FooterLink key={link.label} {...link} />
                ))}
            </div>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                Made with ❤️
            </p>
            <p style={{ margin: '12px 0 0 0', fontSize: '11px', color: `${COLORS.textMuted}99` }}>
                Not affiliated with Mojang Studios
            </p>
        </div>
    );
}