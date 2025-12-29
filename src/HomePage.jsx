import React from 'react';

const COLORS = {
    bg: '#1a1a2e',
    bgLight: '#252542',
    bgLighter: '#2d2d4a',
    text: '#e0e0e0',
    textMuted: '#888',
    border: '#3d3d5c',
    accent: '#5865F2',
    gold: '#FFAA00',
    aqua: '#55FFFF',
    green: '#55FF55',
    yellow: '#FFFF55'
};

// Minecraft head API
const getHeadUrl = (username) => `https://mc-heads.net/avatar/${username}/100`;

const CREATORS = [
    {
        username: 'threeseconds',
        role: 'Core Development',
        color: '#AA0000'
    },
    {
        username: 'eltobito',
        role: 'Content, Datapacks & Resource Packs',
        color: COLORS.aqua
    },
    {
        username: 'stupxd',
        role: 'Bug Fixing & Quality Improvements',
        color: COLORS.gold
    },
    {
        username: 'apppaa',
        role: 'Item Descriptions',
        color: COLORS.yellow
    },
    {
        username: 'CH0RD',
        role: 'Structure Design',
        color: COLORS.green
    }
];

const SPECIAL_THANKS = [
    {
        username: '170yt',
        description: 'Original project we forked and built upon',
        color: COLORS.gold,
        type: 'github',
        link: 'https://github.com/170yt/ForceItemBattle'
    },
    {
        username: 'McPlayHD',
        description: 'Providing the server infrastructure',
        color: COLORS.gold,
        type: 'github',
        link: 'https://github.com/mcplayhd'
    },
    {
        username: 'Owen1212055',
        description: 'Item Renders for Resource Pack',
        color: COLORS.gold,
        type: 'github',
        link: 'https://github.com/Owen1212055/mc-assets'
    }
];

const FUTURE_PAGES = [
    { name: 'Game Settings', description: 'Configuration options' },
    { name: 'Custom Structures', description: 'Unique world generation' },
    { name: 'Commands', description: 'All available commands' },
    { name: 'Tips & Tricks', description: 'Pro strategies' },
    { name: 'Stats', description: 'Player statistics' }
];

function CreatorCard({ username, role, color }) {
    return (
        <div style={{
            background: COLORS.bgLight,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '8px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'default'
        }}
             onMouseEnter={e => {
                 e.currentTarget.style.transform = 'translateY(-4px)';
                 e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.4)`;
                 e.currentTarget.style.borderColor = color;
             }}
             onMouseLeave={e => {
                 e.currentTarget.style.transform = 'translateY(0)';
                 e.currentTarget.style.boxShadow = 'none';
                 e.currentTarget.style.borderColor = COLORS.border;
             }}
        >
            <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: `3px solid ${color}`,
                boxShadow: `0 0 20px ${color}33`
            }}>
                <img
                    src={getHeadUrl(username)}
                    alt={username}
                    style={{
                        width: '100%',
                        height: '100%',
                        imageRendering: 'pixelated'
                    }}
                />
            </div>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    color: color,
                    fontSize: '18px',
                    fontWeight: '700',
                    textShadow: `0 0 10px ${color}44`
                }}>
                    {username}
                </div>
                <div style={{
                    color: COLORS.textMuted,
                    fontSize: '13px',
                    marginTop: '4px'
                }}>
                    {role}
                </div>
            </div>
        </div>
    );
}

function SpecialThanksCard({ username, description, color, type, link }) {
    const avatarUrl = type === 'github'
        ? `https://github.com/${username}.png?size=100`
        : getHeadUrl(username);

    const content = (
        <div style={{
            background: COLORS.bgLight,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '8px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
            cursor: link ? 'pointer' : 'default'
        }}
             onMouseEnter={e => {
                 e.currentTarget.style.transform = 'translateY(-2px)';
                 e.currentTarget.style.boxShadow = `0 4px 16px rgba(0,0,0,0.3)`;
                 e.currentTarget.style.borderColor = color;
             }}
             onMouseLeave={e => {
                 e.currentTarget.style.transform = 'translateY(0)';
                 e.currentTarget.style.boxShadow = 'none';
                 e.currentTarget.style.borderColor = COLORS.border;
             }}
        >
            <div style={{
                width: '40px',
                height: '40px',
                borderRadius: type === 'github' ? '50%' : '6px',
                overflow: 'hidden',
                border: `2px solid ${color}`,
                flexShrink: 0
            }}>
                <img
                    src={avatarUrl}
                    alt={username}
                    style={{
                        width: '100%',
                        height: '100%',
                        imageRendering: type === 'minecraft' ? 'pixelated' : 'auto'
                    }}
                />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{
                    color: color,
                    fontSize: '15px',
                    fontWeight: '600'
                }}>
                    {username}
                </div>
                <div style={{
                    color: COLORS.textMuted,
                    fontSize: '12px',
                    marginTop: '2px'
                }}>
                    {description}
                </div>
            </div>
            {link && (
                <span style={{ color: COLORS.textMuted, fontSize: '14px' }}>→</span>
            )}
        </div>
    );

    if (link) {
        return (
            <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
            >
                {content}
            </a>
        );
    }

    return content;
}

function ComingSoonCard({ name, description }) {
    return (
        <div style={{
            background: COLORS.bgLight,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '6px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            opacity: 0.6,
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ flex: 1 }}>
                <div style={{ color: COLORS.text, fontSize: '14px', fontWeight: '600' }}>
                    {name}
                </div>
                <div style={{ color: COLORS.textMuted, fontSize: '12px' }}>
                    {description}
                </div>
            </div>
            <span style={{
                background: COLORS.gold + '22',
                color: COLORS.gold,
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
            }}>
                Soon
            </span>
        </div>
    );
}

export default function HomePage({ onNavigate }) {
    return (
        <div style={{
            minHeight: '100vh',
            background: `linear-gradient(180deg, ${COLORS.bg} 0%, #0f0f1a 100%)`,
            color: COLORS.text,
            fontFamily: "'Segoe UI', system-ui, sans-serif"
        }}>
            {/* Hero Section */}
            <div style={{
                padding: '60px 20px 80px',
                textAlign: 'center',
                borderBottom: `1px solid ${COLORS.border}`
            }}>
                <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                    {/* Banner */}
                    <img
                        src="/banner.png"
                        alt="ForceItemBattle"
                        style={{
                            maxWidth: '100%',
                            height: 'auto',
                            marginBottom: '48px',
                            imageRendering: 'pixelated',
                            filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))'
                        }}
                    />

                    {/* Main Description - Clean typography, no box */}
                    <h2 style={{
                        color: COLORS.text,
                        fontSize: '28px',
                        fontWeight: '300',
                        marginBottom: '24px',
                        marginTop: 0,
                        letterSpacing: '-0.5px'
                    }}>
                        What is <span style={{ color: COLORS.gold, fontWeight: '600' }}>ForceItemBattle</span>?
                    </h2>

                    <p style={{
                        fontSize: '18px',
                        lineHeight: '1.8',
                        color: COLORS.text,
                        margin: '0 0 20px 0',
                        fontWeight: '300'
                    }}>
                        A competitive gamemode where players race to collect randomly assigned items as fast as possible. Each time you find your item, a new one is assigned.<br/>
                        The goal: collect as many items as you can before time runs out.
                    </p>

                    <div style={{
                        width: '40px',
                        height: '2px',
                        background: COLORS.border,
                        margin: '32px auto'
                    }} />

                    <p style={{
                        fontSize: '15px',
                        lineHeight: '1.8',
                        color: COLORS.textMuted,
                        margin: '0 0 16px 0'
                    }}>
                        Popularised by <span style={{ color: COLORS.aqua }}>BastiGHG</span>, who introduced the format through his videos and livestreams, helping establish it as a well-known Minecraft minigame.
                    </p>

                    <p style={{
                        fontSize: '15px',
                        lineHeight: '1.8',
                        color: COLORS.textMuted,
                        margin: 0
                    }}>
                        This is our take - the <span style={{ color: COLORS.gold }}>McPlayHD.net</span> version - with our own rules, balancing, and unique twists.
                    </p>
                </div>
            </div>

            {/* Content Grid */}
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '48px 20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '32px'
            }}>
                {/* Coming Soon Section */}
                <div>
                    <h3 style={{
                        color: COLORS.text,
                        fontSize: '18px',
                        marginBottom: '20px'
                    }}>
                        Coming Soon
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {FUTURE_PAGES.map((page, idx) => (
                            <ComingSoonCard key={idx} {...page} />
                        ))}
                    </div>
                </div>

                {/* Creators Section */}
                <div>
                    <h3 style={{
                        color: COLORS.text,
                        fontSize: '18px',
                        marginBottom: '20px'
                    }}>
                        Created By
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '16px'
                    }}>
                        {CREATORS.map((creator, idx) => (
                            <CreatorCard key={idx} {...creator} />
                        ))}
                    </div>

                    {/* Special Thanks */}
                    <div style={{ marginTop: '24px' }}>
                        <h4 style={{
                            color: COLORS.textMuted,
                            fontSize: '14px',
                            marginBottom: '12px'
                        }}>
                            Special Thanks
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {SPECIAL_THANKS.map((person, idx) => (
                                <SpecialThanksCard key={idx} {...person} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={{
                textAlign: 'center',
                padding: '32px 20px',
                borderTop: `1px solid ${COLORS.border}`,
                color: COLORS.textMuted,
                fontSize: '13px'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '24px',
                    marginBottom: '20px'
                }}>
                    <a
                        href="https://github.com/McPlayHDnet/ForceItemBattle"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            color: COLORS.textMuted,
                            textDecoration: 'none',
                            fontSize: '13px',
                            transition: 'color 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = COLORS.text}
                        onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}
                    >
                        GitHub
                    </a>
                    <a
                        href="https://mcplayhd.net"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            color: COLORS.textMuted,
                            textDecoration: 'none',
                            fontSize: '13px',
                            transition: 'color 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = COLORS.text}
                        onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}
                    >
                        McPlayHD.net
                    </a>
                    <a
                        href="/#imprint"
                        style={{
                            color: COLORS.textMuted,
                            textDecoration: 'none',
                            fontSize: '13px',
                            transition: 'color 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = COLORS.text}
                        onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}
                    >
                        Imprint
                    </a>
                </div>
                <p style={{ margin: 0 }}>
                    Made with ❤️
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '11px' }}>
                    Not affiliated with Mojang Studios
                </p>
            </div>
        </div>
    );
}