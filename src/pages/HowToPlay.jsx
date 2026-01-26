import React from 'react';
import { Server, Users, ExternalLink, Download, Package, FileText, Shield } from 'lucide-react';
import { COLORS } from '../config/constants';
import Footer from "../components/common/Footer.jsx";

function OptionCard({ icon: Icon, title, description, children, recommended, accentColor }) {
    const [isHovered, setIsHovered] = React.useState(false);
    const color = accentColor || COLORS.accent;

    return (
        <div
            style={{
                background: COLORS.bgLight,
                border: `1px solid ${recommended ? color : COLORS.border}`,
                borderRadius: '12px',
                padding: '32px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease',
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: isHovered
                    ? `0 12px 40px ${color}22, 0 0 0 1px ${color}44`
                    : recommended
                        ? `0 4px 20px ${color}15`
                        : 'none'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {recommended && (
                <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: `linear-gradient(135deg, ${color}, ${COLORS.green})`,
                    color: '#000',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    boxShadow: `0 4px 12px ${color}44`
                }}>
                    Recommended
                </div>
            )}

            {/* Icon Header */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                marginBottom: '24px',
                paddingTop: recommended ? '8px' : '0'
            }}>
                <div style={{
                    width: '72px',
                    height: '72px',
                    background: `linear-gradient(135deg, ${color}22, ${color}11)`,
                    border: `2px solid ${color}44`,
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                    transition: 'all 0.2s ease',
                    transform: isHovered ? 'scale(1.05)' : 'scale(1)'
                }}>
                    <Icon size={32} color={color} strokeWidth={1.5} />
                </div>
                <h3 style={{
                    margin: '0 0 8px 0',
                    fontSize: '22px',
                    color: COLORS.text,
                    fontWeight: '600'
                }}>
                    {title}
                </h3>
                <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: COLORS.textMuted,
                    lineHeight: '1.5'
                }}>
                    {description}
                </p>
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
                {children}
            </div>
        </div>
    );
}

function RepoLink({ href, icon: Icon, title, description, extra }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
                e.currentTarget.style.borderColor = COLORS.accent;
                e.currentTarget.style.background = COLORS.bgLighter;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = COLORS.border;
                e.currentTarget.style.background = COLORS.bg;
            }}
        >
            <div style={{
                width: '36px',
                height: '36px',
                background: `${COLORS.accent}15`,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
            }}>
                <Icon size={18} color={COLORS.accent} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    color: COLORS.text,
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '2px'
                }}>
                    {title}
                </div>
                <div style={{
                    color: COLORS.textMuted,
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '4px'
                }}>
                    {description}
                    {extra}
                </div>
            </div>
            <ExternalLink size={16} color={COLORS.textMuted} style={{ flexShrink: 0 }} />
        </a>
    );
}

function StepItem({ number, title, children }) {
    return (
        <div style={{
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start'
        }}>
            <span style={{
                width: '28px',
                height: '28px',
                background: `${COLORS.accent}22`,
                border: `1px solid ${COLORS.accent}44`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: '600',
                color: COLORS.accent,
                flexShrink: 0
            }}>{number}</span>
            <div style={{ paddingTop: '3px' }}>
                <div style={{ color: COLORS.text, fontSize: '14px', fontWeight: '500', marginBottom: children ? '4px' : 0 }}>
                    {title}
                </div>
                {children}
            </div>
        </div>
    );
}

function SectionLabel({ children }) {
    return (
        <div style={{
            fontSize: '11px',
            color: COLORS.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '12px',
            fontWeight: '600'
        }}>
            {children}
        </div>
    );
}

export default function HowToPlay() {
    const [isDesktop, setIsDesktop] = React.useState(false);

    React.useEffect(() => {
        const checkDesktop = () => setIsDesktop(window.innerWidth >= 900);
        checkDesktop();
        window.addEventListener('resize', checkDesktop);
        return () => window.removeEventListener('resize', checkDesktop);
    }, []);

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
                    Choose your preferred way to experience ForceItemBattle
                </p>
            </div>

            {/* Content - Side by Side Options */}
            <div style={{
                maxWidth: '1100px',
                margin: '0 auto',
                padding: '48px 20px',
                flex: 1,
                width: '100%',
                boxSizing: 'border-box'
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
                    gap: '24px',
                    alignItems: 'stretch',
                    position: 'relative'
                }}>
                    {/* Option 1: Self-host */}
                    <OptionCard
                        icon={Server}
                        title="Host Your Own"
                        description="Run ForceItemBattle on your own server with full control over settings and players."
                        recommended
                        accentColor={COLORS.green}
                    >
                        <SectionLabel>Required</SectionLabel>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                            <RepoLink
                                href="https://github.com/McPlayHDnet/ForceItemBattle"
                                icon={Package}
                                title="Plugin"
                                description="Core ForceItemBattle plugin"
                            />
                        </div>

                        <SectionLabel>Optional (Recommended)</SectionLabel>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <RepoLink
                                href="https://github.com/btlmt-de/FIB/blob/main/FIB_Worldgen.zip"
                                icon={Download}
                                title="Datapack"
                                description="Custom structures for world generation"
                            />
                            <RepoLink
                                href="https://github.com/btlmt-de/FIB/blob/main/ForceItemBattle.zip"
                                icon={Download}
                                title="Resourcepack"
                                description="Items in tab, bossbar, and chat"
                            />
                            <RepoLink
                                href="https://github.com/btlmt-de/FIB/blob/main/unicodeItems.json"
                                icon={FileText}
                                title="unicodeItems.json"
                                description="Unicode to texture mapping"
                            />
                            <RepoLink
                                href="https://github.com/btlmt-de/FIB/blob/main/config.yml"
                                icon={FileText}
                                title="config.yml"
                                description="Item descriptions for /info"
                                extra={
                                    <a
                                        href="/pools"
                                        style={{
                                            color: COLORS.accent,
                                            textDecoration: 'none',
                                            fontSize: '11px',
                                            marginLeft: '4px'
                                        }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        Browse →
                                    </a>
                                }
                            />
                        </div>
                    </OptionCard>

                    {/* OR Divider - visible on desktop between cards */}
                    <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10,
                        display: isDesktop ? 'block' : 'none'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: COLORS.bg,
                            border: `2px solid ${COLORS.border}`,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: '700',
                            color: COLORS.textMuted,
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}>
                            or
                        </div>
                    </div>

                    {/* Option 2: Official server */}
                    <OptionCard
                        icon={Users}
                        title="Join Our Server"
                        description="Play on official hosted rounds with the community."
                        accentColor={COLORS.accent}
                    >
                        <div style={{
                            marginBottom: '20px',
                            padding: '14px 16px',
                            background: `${COLORS.accent}15`,
                            border: `1px solid ${COLORS.accent}33`,
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: COLORS.text,
                            lineHeight: '1.6'
                        }}>
                            For now, we recommend <strong>Option 1</strong> (hosting your own game). We're planning a wider release with regularly hosted games on our server in the future. <span style={{ color: COLORS.textMuted }}>soon™</span>
                        </div>

                        <SectionLabel>How to Join</SectionLabel>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                            <StepItem number="1" title="Join the community">
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
                            </StepItem>
                            <StepItem number="2" title="Link your Minecraft account to Discord" />
                            <StepItem number="3" title="Open a support ticket and ask about FIB" />
                        </div>

                        {/* Rules Link */}
                        <a
                            href="/rules"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '12px 14px',
                                background: COLORS.bg,
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: '8px',
                                textDecoration: 'none',
                                marginBottom: '16px',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = COLORS.gold;
                                e.currentTarget.style.background = `${COLORS.gold}11`;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = COLORS.border;
                                e.currentTarget.style.background = COLORS.bg;
                            }}
                        >
                            <Shield size={18} color={COLORS.gold} />
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    color: COLORS.text,
                                    fontSize: '14px',
                                    fontWeight: '600'
                                }}>
                                    Game Rules
                                </div>
                                <div style={{
                                    color: COLORS.textMuted,
                                    fontSize: '12px'
                                }}>
                                    Review the rules before joining
                                </div>
                            </div>
                            <span style={{
                                color: COLORS.gold,
                                fontSize: '13px',
                                fontWeight: '500'
                            }}>
                                View →
                            </span>
                        </a>

                        <div style={{
                            padding: '14px 16px',
                            background: `${COLORS.gold}11`,
                            border: `1px solid ${COLORS.gold}33`,
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: COLORS.gold,
                            lineHeight: '1.6'
                        }}>
                            <strong>Note:</strong> Rounds are hosted spontaneously and participation may be limited. We reserve the right to only invite players who we believe will follow the rules.
                        </div>
                    </OptionCard>
                </div>
            </div>
            <Footer />
        </div>
    );
}