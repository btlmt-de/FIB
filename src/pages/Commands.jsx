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
    red: '#FF5555'
};

function CommandItem({ command, description, example }) {
    return (
        <div style={{
            padding: '12px 14px',
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '6px'
        }}>
            <code style={{
                display: 'inline-block',
                background: COLORS.bgLighter,
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: "'Consolas', 'Monaco', monospace",
                color: COLORS.aqua,
                marginBottom: '6px'
            }}>
                {command}
            </code>
            <div style={{
                color: COLORS.textMuted,
                fontSize: '13px',
                lineHeight: '1.5'
            }}>
                {description}
            </div>
            {example && (
                <div style={{
                    fontSize: '11px',
                    color: COLORS.textMuted,
                    marginTop: '6px',
                    opacity: 0.8
                }}>
                    Example: <code style={{
                    background: COLORS.bgLighter,
                    padding: '1px 5px',
                    borderRadius: '3px',
                    color: COLORS.text
                }}>{example}</code>
                </div>
            )}
        </div>
    );
}

function CommandSection({ title, badge, badgeColor, borderColor, children }) {
    return (
        <div style={{
            background: COLORS.bgLight,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '24px',
            flex: 1,
            minWidth: '300px'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '8px'
            }}>
                <h2 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: '600',
                    color: COLORS.text
                }}>
                    {title}
                </h2>
                <span style={{
                    background: badgeColor,
                    color: '#000',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                    {badge}
                </span>
            </div>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                {children}
            </div>
        </div>
    );
}

export default function Commands() {
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
                    Commands
                </h1>
                <p style={{
                    fontSize: '16px',
                    color: COLORS.textMuted,
                    margin: 0,
                    maxWidth: '500px',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                }}>
                    All available commands in ForceItemBattle
                </p>
            </div>

            {/* Content - Side by Side */}
            <div style={{
                maxWidth: '1200px',
                width: '100%',
                margin: '0 auto',
                padding: '48px 20px',
                display: 'flex',
                gap: '24px',
                flex: 1,
                flexWrap: 'wrap'
            }}>
                {/* Player Commands */}
                <CommandSection
                    title="Player Commands"
                    badge="All Players"
                    badgeColor={COLORS.green}
                    borderColor={COLORS.border}
                >
                    <CommandItem
                        command="/bed"
                        description="Teleports you to your bed location, if one is set."
                    />
                    <CommandItem
                        command="/spawn"
                        description="Teleports you back to the world spawn."
                    />
                    <CommandItem
                        command="/info"
                        description="Displays the crafting recipe or description of your currently assigned item."
                    />
                    <CommandItem
                        command="/info <item_name>"
                        description="Shows the recipe or description for any specific item."
                        example="/info wooden_axe"
                    />
                    <CommandItem
                        command="/infowiki"
                        description="Provides a Minecraft Wiki link for your current assigned item."
                    />
                    <CommandItem
                        command="/shout <message>"
                        description="Sends a global message to all players (team chat is default)."
                    />
                    <CommandItem
                        command="/shout"
                        description="Toggle shout mode on/off. When enabled, all messages are sent globally."
                    />
                    <CommandItem
                        command="/pos <n>"
                        description="Save position with a name to your current location. Announced in chat for all players."
                    />
                    <CommandItem
                        command="/pos"
                        description="Pull up all saved positions. Positions are shared and viewable by all players."
                    />
                    <CommandItem
                        command="/pause"
                        description="Freeze players & timer."
                    />
                    <CommandItem
                        command="/resume"
                        description="Unfreeze players & timer."
                    />
                    <CommandItem
                        command="/show <item>"
                        description="Displays the item in front of player."
                    />
                    <CommandItem
                        command="/spectate"
                        description="Toggle gamemode spectator after round has ended."
                    />
                    <CommandItem
                        command="/fixskips"
                        description="Get all your remaining jokers back when you lost them."
                    />
                    <CommandItem
                        command="/bp"
                        description="Opens your backpack."
                    />
                    <CommandItem
                        command="/ping"
                        description="Shows your current ping."
                    />
                    <CommandItem
                        command="/voteskip"
                        description="Start a skip vote (only works when RUN mode is activated)."
                    />
                    <CommandItem
                        command="/vote"
                        description="Vote yes/no when a vote is active."
                    />
                </CommandSection>

                {/* Gamemaster Commands */}
                <CommandSection
                    title="Gamemaster Commands"
                    badge="OP Required"
                    badgeColor={COLORS.gold}
                    borderColor={COLORS.gold}
                >
                    <CommandItem
                        command="/start <time> <jokers>"
                        description="Start the game with specified time limit and number of jokers."
                        example="/start 60 3"
                    />
                    <CommandItem
                        command="/start <preset>"
                        description="Start the game using a defined preset."
                        example="/start default"
                    />
                    <CommandItem
                        command="/reset"
                        description="Reset the game and generate a new world."
                    />
                    <CommandItem
                        command="/settings"
                        description="Pull up the settings menu."
                    />
                    <CommandItem
                        command="/stoptimer"
                        description="Instantly end the game."
                    />
                    <CommandItem
                        command="/forceteam <team> <p1> <p2>"
                        description="Force players into a team before round start."
                        example="/forceteam blue Steve Alex"
                    />
                    <CommandItem
                        command="/skip <player>"
                        description="Force skip the current item for a player."
                        example="/skip Steve"
                    />
                    <CommandItem
                        command="/result"
                        description="Start the result view at the end of the game."
                    />
                    <CommandItem
                        command="/items"
                        description="View all item pools."
                    />
                </CommandSection>
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