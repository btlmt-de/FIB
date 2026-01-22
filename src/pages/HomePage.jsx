import React from 'react';
import Footer from "../components/common/Footer.jsx";

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

function CreatorCard({ username, role, color }) {
    return (
        <div style={{
            background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bgLighter} 100%)`,
            border: `2px solid ${color}22`,
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            cursor: 'default',
            position: 'relative',
            overflow: 'hidden'
        }}
             onMouseEnter={e => {
                 e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                 e.currentTarget.style.boxShadow = `0 20px 40px ${color}44, inset 0 1px 0 ${color}22`;
                 e.currentTarget.style.borderColor = color;
                 e.currentTarget.style.background = `linear-gradient(135deg, ${COLORS.bgLighter} 0%, #353560 100%)`;
             }}
             onMouseLeave={e => {
                 e.currentTarget.style.transform = 'translateY(0) scale(1)';
                 e.currentTarget.style.boxShadow = 'none';
                 e.currentTarget.style.borderColor = `${color}22`;
                 e.currentTarget.style.background = `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bgLighter} 100%)`;
             }}
        >
            <div style={{
                width: '90px',
                height: '90px',
                borderRadius: '10px',
                overflow: 'hidden',
                border: `3px solid ${color}`,
                boxShadow: `0 0 30px ${color}55, 0 0 60px ${color}22`,
                transition: 'all 0.3s ease'
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
            <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{
                    color: color,
                    fontSize: '16px',
                    fontWeight: '700',
                    textShadow: `0 0 12px ${color}66`,
                    marginBottom: '4px'
                }}>
                    {username}
                </div>
                <div style={{
                    color: COLORS.textMuted,
                    fontSize: '12px',
                    lineHeight: '1.4'
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
            background: `linear-gradient(90deg, ${COLORS.bgLight}88 0%, ${COLORS.bgLight}33 100%)`,
            border: `1px solid ${color}33`,
            borderRadius: '10px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            cursor: link ? 'pointer' : 'default',
            position: 'relative',
            overflow: 'hidden'
        }}
             onMouseEnter={e => {
                 e.currentTarget.style.transform = link ? 'translateX(4px)' : 'none';
                 e.currentTarget.style.boxShadow = `0 8px 20px ${color}33, inset 0 1px 0 ${color}22`;
                 e.currentTarget.style.borderColor = color;
                 e.currentTarget.style.background = `linear-gradient(90deg, ${COLORS.bgLighter}aa 0%, ${COLORS.bgLight}44 100%)`;
             }}
             onMouseLeave={e => {
                 e.currentTarget.style.transform = 'translateX(0)';
                 e.currentTarget.style.boxShadow = 'none';
                 e.currentTarget.style.borderColor = `${color}33`;
                 e.currentTarget.style.background = `linear-gradient(90deg, ${COLORS.bgLight}88 0%, ${COLORS.bgLight}33 100%)`;
             }}
        >
            <div style={{
                width: '44px',
                height: '44px',
                borderRadius: type === 'github' ? '50%' : '8px',
                overflow: 'hidden',
                border: `2px solid ${color}`,
                flexShrink: 0,
                boxShadow: `0 0 12px ${color}44`
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
                    fontSize: '14px',
                    fontWeight: '600',
                    letterSpacing: '0.3px'
                }}>
                    {username}
                </div>
                <div style={{
                    color: COLORS.textMuted,
                    fontSize: '12px',
                    marginTop: '3px',
                    lineHeight: '1.3'
                }}>
                    {description}
                </div>
            </div>
            {link && (
                <span style={{
                    color: COLORS.textMuted,
                    fontSize: '16px',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center'
                }}>→</span>
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

export default function HomePage() {
    return (
        <div style={{
            minHeight: '100vh',
            background: `linear-gradient(180deg, ${COLORS.bg} 0%, #0f0f1a 100%)`,
            color: COLORS.text,
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            position: 'relative'
        }}>
            {/* Content wrapper */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Hero Section */}
                <div style={{
                    padding: '80px 20px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${COLORS.border}44`
                }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        {/* Banner */}
                        <img
                            src="/banner.png"
                            alt="ForceItemBattle"
                            style={{
                                maxWidth: '100%',
                                height: 'auto',
                                marginBottom: '56px',
                                imageRendering: 'pixelated',
                                filter: 'drop-shadow(0 8px 32px rgba(255, 170, 0, 0.2))',
                                transition: 'filter 0.3s ease'
                            }}
                        />

                        {/* Main Description */}
                        <h2 style={{
                            color: COLORS.text,
                            fontSize: '32px',
                            fontWeight: '300',
                            marginBottom: '28px',
                            marginTop: 0,
                            letterSpacing: '-0.5px',
                            lineHeight: '1.3'
                        }}>
                            What is <span style={{ color: COLORS.gold, fontWeight: '700', textShadow: `0 0 20px ${COLORS.gold}44` }}>ForceItemBattle</span>?
                        </h2>

                        <p style={{
                            fontSize: '18px',
                            lineHeight: '1.9',
                            color: COLORS.text,
                            margin: '0 0 28px 0',
                            fontWeight: '300',
                            letterSpacing: '0.3px'
                        }}>
                            A competitive gamemode where players race to collect randomly assigned items as fast as possible. Each time you find your item, a new one is assigned.<br/>
                            The goal: collect as many items as you can before time runs out.
                        </p>

                        <div style={{
                            width: '60px',
                            height: '3px',
                            background: `linear-gradient(90deg, transparent, ${COLORS.gold}, transparent)`,
                            margin: '40px auto'
                        }} />

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr',
                            gap: '16px',
                            marginTop: '40px'
                        }}>
                            <p style={{
                                fontSize: '15px',
                                lineHeight: '1.9',
                                color: COLORS.textMuted,
                                margin: 0,
                                padding: '0 12px',
                                letterSpacing: '0.2px'
                            }}>
                                Popularised by <span style={{ color: COLORS.aqua, fontWeight: '600' }}>BastiGHG</span>, who introduced the format through his videos and livestreams, helping establish it as a well-known Minecraft minigame.
                            </p>

                            <p style={{
                                fontSize: '15px',
                                lineHeight: '1.9',
                                color: COLORS.textMuted,
                                margin: 0,
                                padding: '0 12px',
                                letterSpacing: '0.2px'
                            }}>
                                This is our take - the <span style={{ color: COLORS.gold, fontWeight: '600' }}>McPlayHD.net</span> version - with our own rules, balancing, and unique twists.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Creators Section */}
                <div style={{
                    maxWidth: '900px',
                    margin: '0 auto',
                    padding: '64px 20px',
                }}>
                    <h3 style={{
                        color: COLORS.text,
                        fontSize: '20px',
                        fontWeight: '600',
                        marginBottom: '32px',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        textAlign: 'center'
                    }}>
                        Created By
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '16px',
                        maxWidth: '850px',
                        margin: '0 auto 48px'
                    }}>
                        {CREATORS.map((creator, idx) => (
                            <CreatorCard key={idx} {...creator} />
                        ))}
                    </div>

                    {/* Special Thanks */}
                    <div style={{
                        paddingTop: '32px',
                        borderTop: `1px solid ${COLORS.border}44`,
                        maxWidth: '600px',
                        margin: '0 auto'
                    }}>
                        <h4 style={{
                            color: COLORS.textMuted,
                            fontSize: '13px',
                            fontWeight: '600',
                            marginBottom: '20px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.8px',
                            textAlign: 'center'
                        }}>
                            Special Thanks
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {SPECIAL_THANKS.map((person, idx) => (
                                <SpecialThanksCard key={idx} {...person} />
                            ))}
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        </div>
    );
}