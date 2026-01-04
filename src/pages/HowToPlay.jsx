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
    green: '#55FF55'
};

function OptionCard({ number, title, children, recommended }) {
    return (
        <div style={{
            background: COLORS.bgLight,
            border: `1px solid ${recommended ? COLORS.green : COLORS.border}`,
            borderRadius: '8px',
            padding: '28px',
            position: 'relative'
        }}>
            {recommended && (
                <span style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '20px',
                    background: COLORS.green,
                    color: '#000',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                    Recommended
                </span>
            )}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                marginBottom: '20px'
            }}>
                <span style={{
                    width: '36px',
                    height: '36px',
                    background: COLORS.accent,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#fff',
                    flexShrink: 0
                }}>
                    {number}
                </span>
                <h3 style={{
                    margin: 0,
                    fontSize: '20px',
                    color: COLORS.text,
                    fontWeight: '600'
                }}>
                    {title}
                </h3>
            </div>
            {children}
        </div>
    );
}

function RepoLink({ href, title, description, extra }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
                display: 'block',
                padding: '16px 18px',
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '6px',
                textDecoration: 'none',
                transition: 'border-color 0.15s, transform 0.15s'
            }}
            onMouseEnter={e => {
                e.currentTarget.style.borderColor = COLORS.accent;
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = COLORS.border;
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            <div style={{
                color: COLORS.accent,
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                {title}
                <span style={{ color: COLORS.textMuted }}>→</span>
            </div>
            <div style={{
                color: COLORS.textMuted,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                {description}
                {extra}
            </div>
        </a>
    );
}

export default function HowToPlay() {
    return (
        <div style={{
            minHeight: '100vh',
            background: `linear-gradient(180deg, ${COLORS.bg} 0%, #0f0f1a 100%)`,
            color: COLORS.text,
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{
                padding: '60px 20px',
                textAlign: 'center',
                borderBottom: `1px solid ${COLORS.border}`
            }}>
                <h1 style={{
                    fontSize: '36px',
                    fontWeight: '300',
                    margin: '0 0 16px 0',
                    letterSpacing: '-0.5px'
                }}>
                    How to Play
                </h1>
                <p style={{
                    fontSize: '16px',
                    color: COLORS.textMuted,
                    margin: 0,
                    maxWidth: '500px',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                }}>
                    Get started with ForceItemBattle in just a few steps
                </p>
            </div>

            {/* Content */}
            <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                padding: '48px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                flex: 1
            }}>
                {/* Option 1: Self-host */}
                <OptionCard number="1" title="Host your own game" recommended>
                    <p style={{
                        color: COLORS.textMuted,
                        fontSize: '15px',
                        lineHeight: '1.7',
                        margin: '0 0 20px 0'
                    }}>
                        Run ForceItemBattle on your own server. You'll need the plugin, and optionally the datapack and resourcepack for the full experience.
                    </p>

                    <div style={{
                        fontSize: '12px',
                        color: COLORS.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '10px'
                    }}>
                        Required
                    </div>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        marginBottom: '24px'
                    }}>
                        <RepoLink
                            href="https://github.com/McPlayHDnet/ForceItemBattle"
                            title="Plugin"
                            description="Core ForceItemBattle plugin"
                        />
                    </div>

                    <div style={{
                        fontSize: '12px',
                        color: COLORS.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '10px'
                    }}>
                        Optional (Recommended)
                    </div>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}>
                        <RepoLink
                            href="https://github.com/btlmt-de/FIB/blob/main/FIB_Worldgen.zip"
                            title="Datapack"
                            description="Adds custom structures to world generation"
                        />
                        <RepoLink
                            href="https://github.com/btlmt-de/FIB/blob/main/ForceItemBattle.zip"
                            title="Resourcepack"
                            description="Displays items in tab, bossbar, and chat"
                        />
                        <RepoLink
                            href="https://github.com/btlmt-de/FIB/blob/main/unicodeItems.json"
                            title="unicodeItems.json"
                            description="Maps unicode characters to item textures (required for resourcepack)"
                        />
                        <RepoLink
                            href="https://github.com/btlmt-de/FIB/blob/main/config.yml"
                            title="config.yml"
                            description="Item descriptions for the /info command"
                            extra={
                                <a
                                    href="/public#pools"
                                    style={{
                                        color: COLORS.accent,
                                        textDecoration: 'none',
                                        fontSize: '12px',
                                        marginLeft: '8px'
                                    }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    Browse descriptions →
                                </a>
                            }
                        />
                    </div>
                </OptionCard>

                {/* Option 2: Official server */}
                <OptionCard number="2" title="Play on our server">
                    <div style={{
                        marginBottom: '20px',
                        padding: '14px 16px',
                        background: COLORS.accent + '15',
                        border: `1px solid ${COLORS.accent}33`,
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: COLORS.text,
                        lineHeight: '1.6'
                    }}>
                        For now, we recommend <strong>Option 1</strong> (hosting your own game). We're planning a wider release with regularly hosted games on our server in the future. <span style={{ color: COLORS.textMuted }}>soon™</span>
                    </div>

                    <p style={{
                        color: COLORS.textMuted,
                        fontSize: '15px',
                        lineHeight: '1.7',
                        margin: '0 0 20px 0'
                    }}>
                        We occasionally host rounds on our official server. Join the community to participate!
                    </p>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px'
                    }}>
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start'
                        }}>
                            <span style={{
                                width: '24px',
                                height: '24px',
                                background: COLORS.bgLighter,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                color: COLORS.textMuted,
                                flexShrink: 0,
                                marginTop: '2px'
                            }}>1</span>
                            <div>
                                <div style={{ color: COLORS.text, fontSize: '14px', marginBottom: '4px' }}>
                                    Join the community
                                </div>
                                <a
                                    href="http://mcplayhd.net/discord"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: COLORS.accent,
                                        textDecoration: 'none',
                                        fontSize: '13px'
                                    }}
                                >
                                    discord.gg/mcplayhd
                                </a>
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start'
                        }}>
                            <span style={{
                                width: '24px',
                                height: '24px',
                                background: COLORS.bgLighter,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                color: COLORS.textMuted,
                                flexShrink: 0,
                                marginTop: '2px'
                            }}>2</span>
                            <div style={{ color: COLORS.text, fontSize: '14px' }}>
                                Link your Minecraft account to your Discord
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start'
                        }}>
                            <span style={{
                                width: '24px',
                                height: '24px',
                                background: COLORS.bgLighter,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                color: COLORS.textMuted,
                                flexShrink: 0,
                                marginTop: '2px'
                            }}>3</span>
                            <div style={{ color: COLORS.text, fontSize: '14px' }}>
                                Open a support ticket and ask about ForceItemBattle
                            </div>
                        </div>
                    </div>

                    <div style={{
                        marginTop: '20px',
                        padding: '14px 16px',
                        background: COLORS.gold + '11',
                        border: `1px solid ${COLORS.gold}33`,
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: COLORS.gold,
                        lineHeight: '1.6'
                    }}>
                        <strong>Note:</strong> Rounds are hosted spontaneously and participation may be limited. We reserve the right to only invite players who we believe will follow the rules.
                    </div>
                </OptionCard>
            </div>

            {/* Footer */}
            <div style={{
                textAlign: 'center',
                padding: '48px 20px 40px',
                borderTop: `1px solid ${COLORS.border}44`,
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
                        McPlayHD.net
                    </a>
                    <a
                        href="/public#imprint"
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
                        Imprint
                    </a>
                </div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                    Made with ❤️
                </p>
                <p style={{ margin: '12px 0 0 0', fontSize: '11px', color: `${COLORS.textMuted}99` }}>
                    Not affiliated with Mojang Studios
                </p>
            </div>
        </div>
    );
}