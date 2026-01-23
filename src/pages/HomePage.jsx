import React from 'react';
import { COLORS } from '../config/constants';
import Footer from "../components/common/Footer.jsx";
import Swords from 'lucide-react/dist/esm/icons/swords';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Link from 'lucide-react/dist/esm/icons/link';
import Layers from 'lucide-react/dist/esm/icons/layers';
import Puzzle from 'lucide-react/dist/esm/icons/puzzle';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';

// Minecraft head API
const getHeadUrl = (username) => `https://mc-heads.net/avatar/${username}/100`;

// Section Divider component
function SectionDivider({ style, color = COLORS.gold, label }) {
    // Labeled style with text
    if (style === 'labeled' && label) {
        const isLarge = label === 'Created By' || label === 'Features';
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '24px',
                margin: '56px 0',
            }}>
                <div style={{
                    flex: 1,
                    maxWidth: '200px',
                    height: '1px',
                    background: `linear-gradient(90deg, transparent, ${COLORS.border})`,
                }} />
                <span style={{
                    color: isLarge ? COLORS.text : COLORS.textMuted,
                    fontSize: isLarge ? '18px' : '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: isLarge ? '3px' : '2px',
                }}>
                    {label}
                </span>
                <div style={{
                    flex: 1,
                    maxWidth: '200px',
                    height: '1px',
                    background: `linear-gradient(90deg, ${COLORS.border}, transparent)`,
                }} />
            </div>
        );
    }

    // Default: simple gradient line
    return (
        <div style={{
            width: '120px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            margin: '48px auto',
        }} />
    );
}

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

const FEATURES = [
    {
        icon: Swords,
        title: 'ForceItemBattle',
        description: 'The classic mode — race against time with jokers, whoever collects the most items wins',
        color: COLORS.red
    },
    {
        icon: Zap,
        title: 'RunBattle',
        description: 'Only the first player to find the item scores — speed is everything',
        color: COLORS.gold
    },
    {
        icon: Link,
        title: 'ForceChain',
        description: 'See your current item and the next one — plan ahead and chain your collections',
        color: COLORS.aqua
    },
    {
        icon: Layers,
        title: 'Dynamic Item Pools',
        description: 'Carefully balanced item categories ranging from Easy to Extreme difficulty',
        color: COLORS.purple
    },
    {
        icon: Puzzle,
        title: 'Custom Structures',
        description: 'Unique buildings and loot locations designed for FIB gameplay',
        color: COLORS.green
    }
];

function FeatureCard({ icon: Icon, title, description, color }) {
    return (
        <div style={{
            background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bgLighter} 100%)`,
            border: `1px solid ${color}22`,
            borderRadius: '12px',
            padding: '24px',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            cursor: 'default',
            position: 'relative',
            overflow: 'hidden'
        }}
             onMouseEnter={e => {
                 e.currentTarget.style.transform = 'translateY(-6px)';
                 e.currentTarget.style.boxShadow = `0 16px 32px ${color}33, inset 0 1px 0 ${color}22`;
                 e.currentTarget.style.borderColor = `${color}55`;
             }}
             onMouseLeave={e => {
                 e.currentTarget.style.transform = 'translateY(0)';
                 e.currentTarget.style.boxShadow = 'none';
                 e.currentTarget.style.borderColor = `${color}22`;
             }}
        >
            <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                background: `${color}15`,
                border: `1px solid ${color}33`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                boxShadow: `0 0 20px ${color}22`,
            }}>
                <Icon size={24} style={{ color: color }} />
            </div>
            <h3 style={{
                color: COLORS.text,
                fontSize: '16px',
                fontWeight: '600',
                margin: '0 0 8px 0',
            }}>
                {title}
            </h3>
            <p style={{
                color: COLORS.textMuted,
                fontSize: '13px',
                lineHeight: '1.6',
                margin: 0,
            }}>
                {description}
            </p>
        </div>
    );
}

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

    const handleInteractionStart = (e) => {
        if (link) {
            const target = e.currentTarget.tagName === 'A'
                ? e.currentTarget.firstChild
                : e.currentTarget;
            target.style.borderColor = COLORS.gold;
            target.style.background = COLORS.bgLighter;
        }
    };

    const handleInteractionEnd = (e) => {
        const target = e.currentTarget.tagName === 'A'
            ? e.currentTarget.firstChild
            : e.currentTarget;
        target.style.borderColor = COLORS.border;
        target.style.background = COLORS.bgLight;
    };

    const content = (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: COLORS.bgLight,
            borderRadius: '8px',
            border: `1px solid ${COLORS.border}`,
            transition: 'all 0.15s ease-out',
            cursor: link ? 'pointer' : 'default',
        }}
             onMouseEnter={handleInteractionStart}
             onMouseLeave={handleInteractionEnd}
        >
            <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: `2px solid ${COLORS.border}`,
                flexShrink: 0,
            }}>
                <img
                    src={avatarUrl}
                    alt={username}
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    color: COLORS.text,
                    fontSize: '14px',
                    fontWeight: '600',
                }}>
                    {username}
                </div>
                <div style={{
                    color: COLORS.textMuted,
                    fontSize: '12px',
                    marginTop: '2px',
                }}>
                    {description}
                </div>
            </div>
            {link && (
                <ArrowRight size={16} style={{ color: COLORS.textMuted, flexShrink: 0 }} />
            )}
        </div>
    );

    if (link) {
        return (
            <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    textDecoration: 'none',
                    borderRadius: '8px',
                    outline: 'none',
                }}
                onFocus={handleInteractionStart}
                onBlur={handleInteractionEnd}
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
                    padding: '80px 20px 48px',
                    textAlign: 'center',
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

                        <SectionDivider color={COLORS.gold} />

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr',
                            gap: '16px',
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

                <SectionDivider style="labeled" label="Features" />

                {/* Features Section */}
                <div style={{
                    maxWidth: '1100px',
                    margin: '0 auto',
                    padding: '0 20px 48px',
                }}>
                    <style>{`
                        .features-grid {
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 16px;
                        }
                        @media (min-width: 600px) {
                            .features-grid {
                                grid-template-columns: repeat(3, 1fr);
                            }
                        }
                        @media (min-width: 1000px) {
                            .features-grid {
                                grid-template-columns: repeat(5, 1fr);
                            }
                        }
                    `}</style>
                    <div className="features-grid">
                        {FEATURES.map((feature, idx) => (
                            <FeatureCard key={idx} {...feature} />
                        ))}
                    </div>
                </div>

                <SectionDivider style="labeled" label="Created By" />

                {/* Creators Section */}
                <div style={{
                    maxWidth: '900px',
                    margin: '0 auto',
                    padding: '0 20px 64px',
                }}>
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

                    <SectionDivider style="labeled" label="Special Thanks" />

                    {/* Special Thanks */}
                    <div style={{
                        maxWidth: '500px',
                        margin: '0 auto'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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