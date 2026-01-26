import React from 'react';
import { Shield, AlertTriangle, ExternalLink, Ban } from 'lucide-react';
import { COLORS } from '../config/constants';
import Footer from "../components/common/Footer.jsx";

const BANNED_MODS = [
    {
        name: 'Minimap Modifications',
        description: 'Any mod that shows a map, player positions, or entity locations'
    },
    {
        name: 'Freecam',
        description: 'Mods that allow camera movement independent of your player'
    },
    {
        name: 'X-Ray',
        description: 'Any texture pack or mod that reveals hidden blocks'
    },
    {
        name: 'BundlesBeyond',
        description: 'Removes the 12-item limit for viewing and extracting items from bundles'
    },
    {
        name: 'BoatItemView',
        description: 'Allows seeing items held in hand while riding a boat'
    }
];

function ModCard({ name, description }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '14px 16px',
            background: `${COLORS.red}11`,
            border: `1px solid ${COLORS.red}33`,
            borderRadius: '8px'
        }}>
            <Ban size={18} color={COLORS.red} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
                <div style={{
                    color: COLORS.text,
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '4px'
                }}>
                    {name}
                </div>
                <div style={{
                    color: COLORS.textMuted,
                    fontSize: '13px',
                    lineHeight: '1.5'
                }}>
                    {description}
                </div>
            </div>
        </div>
    );
}

export default function Rules() {
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
                <div style={{
                    width: '64px',
                    height: '64px',
                    background: `${COLORS.gold}22`,
                    border: `2px solid ${COLORS.gold}44`,
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px'
                }}>
                    <Shield size={28} color={COLORS.gold} />
                </div>
                <h1 style={{
                    fontSize: '36px',
                    fontWeight: '300',
                    margin: '0 0 16px 0',
                    letterSpacing: '-0.5px'
                }}>
                    Rules
                </h1>
                <p style={{
                    fontSize: '16px',
                    color: COLORS.textMuted,
                    margin: 0,
                    maxWidth: '500px',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                }}>
                    Guidelines for participating in ForceItemBattle games on our server
                </p>
            </div>

            {/* Content */}
            <div style={{
                flex: 1,
                maxWidth: '700px',
                margin: '0 auto',
                padding: '48px 20px',
                width: '100%',
                boxSizing: 'border-box'
            }}>
                {/* General Rules Section */}
                <div style={{
                    marginBottom: '48px'
                }}>
                    <h2 style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        margin: '0 0 16px 0',
                        color: COLORS.text,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <ExternalLink size={20} color={COLORS.accent} />
                        General Rules
                    </h2>
                    <p style={{
                        fontSize: '15px',
                        lineHeight: '1.8',
                        color: COLORS.textMuted,
                        margin: '0 0 20px 0'
                    }}>
                        All rules from the McPlayHD network apply to ForceItemBattle games. Please familiarize yourself with them before joining.
                    </p>
                    <a
                        href="https://mcplayhd.net/rules"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 20px',
                            background: COLORS.accent,
                            color: '#fff',
                            textDecoration: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'transform 0.15s, box-shadow 0.15s'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${COLORS.accent}44`;
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        mcplayhd.net/rules
                        <ExternalLink size={14} />
                    </a>
                </div>

                {/* Banned Mods Section */}
                <div style={{
                    marginBottom: '48px'
                }}>
                    <h2 style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        margin: '0 0 16px 0',
                        color: COLORS.text,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <AlertTriangle size={20} color={COLORS.red} />
                        Prohibited Modifications
                    </h2>
                    <p style={{
                        fontSize: '15px',
                        lineHeight: '1.8',
                        color: COLORS.textMuted,
                        margin: '0 0 20px 0'
                    }}>
                        The following modifications are strictly prohibited during ForceItemBattle games. Using them will result in disqualification.
                    </p>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        {BANNED_MODS.map((mod, idx) => (
                            <ModCard key={idx} {...mod} />
                        ))}
                    </div>
                </div>

                {/* General Mod Policy */}
                <div style={{
                    padding: '20px 24px',
                    background: `${COLORS.gold}11`,
                    border: `1px solid ${COLORS.gold}33`,
                    borderRadius: '10px'
                }}>
                    <h3 style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        margin: '0 0 12px 0',
                        color: COLORS.gold,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <AlertTriangle size={16} />
                        General Policy
                    </h3>
                    <p style={{
                        fontSize: '14px',
                        lineHeight: '1.7',
                        color: COLORS.text,
                        margin: 0
                    }}>
                        Any modification that gives a clear advantage over vanilla Minecraft behavior is not allowed.
                        If you're unsure whether a specific mod is permitted, <strong>ask before using it</strong>.
                    </p>
                </div>
            </div>
            <Footer />
        </div>
    );
}