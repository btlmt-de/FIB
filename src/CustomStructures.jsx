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
    purple: '#AA00AA',
    red: '#AA0000'
};

const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib';

const ITEM_TEXTURES = {
    'nether_brick': 'nether_brick',
    'quartz': 'quartz',
    'glowstone_dust': 'glowstone_dust',
    'chiseled_copper': 'chiseled_copper',
    'glass': 'glass',
    'compass': 'compass',
    'gold_ingot': 'gold_ingot',
    'knowledge_book': 'knowledge_book',
    'wither_rose': 'wither_rose'
};

function QuickLinks({ links }) {
    const scrollTo = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
            marginTop: '28px'
        }}>
            {links.map(link => (
                <button
                    key={link.id}
                    onClick={() => scrollTo(link.id)}
                    style={{
                        background: 'transparent',
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '20px',
                        padding: '6px 14px',
                        color: COLORS.textMuted,
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.borderColor = link.color;
                        e.currentTarget.style.color = COLORS.text;
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.borderColor = COLORS.border;
                        e.currentTarget.style.color = COLORS.textMuted;
                    }}
                >
                    <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: link.color
                    }} />
                    {link.label}
                </button>
            ))}
        </div>
    );
}

function CraftingGrid({ recipe, result, resultName, glowColor = COLORS.gold }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            margin: '32px 0',
            flexWrap: 'wrap'
        }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 52px)',
                gap: '4px',
                padding: '12px',
                background: COLORS.bgLighter,
                borderRadius: '8px',
                border: `1px solid ${COLORS.border}`
            }}>
                {recipe.flat().map((item, idx) => (
                    <div
                        key={idx}
                        style={{
                            width: '52px',
                            height: '52px',
                            background: COLORS.bgLight,
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.15s, background 0.15s',
                            cursor: item ? 'pointer' : 'default'
                        }}
                        onMouseEnter={e => {
                            if (item) {
                                e.currentTarget.style.transform = 'scale(1.08)';
                                e.currentTarget.style.background = COLORS.bgLighter;
                            }
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.background = COLORS.bgLight;
                        }}
                    >
                        {item && (
                            <img
                                src={`${IMAGE_BASE_URL}/${ITEM_TEXTURES[item]}.png`}
                                alt={item}
                                title={item.replace(/_/g, ' ')}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    imageRendering: 'pixelated'
                                }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        )}
                    </div>
                ))}
            </div>

            <div style={{ color: COLORS.textMuted, fontSize: '28px' }}>→</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    background: COLORS.bgLighter,
                    borderRadius: '8px',
                    border: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 20px ${glowColor}33, 0 0 40px ${glowColor}15`
                }}>
                    <img
                        src={`${IMAGE_BASE_URL}/${result}.png`}
                        alt={resultName}
                        style={{
                            width: '42px',
                            height: '42px',
                            imageRendering: 'pixelated'
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                </div>
                <span style={{ color: COLORS.text, fontSize: '15px', fontWeight: '500' }}>
                    {resultName}
                </span>
            </div>
        </div>
    );
}

function Section({ id, title, color, children }) {
    return (
        <section id={id} style={{ marginBottom: '56px', scrollMarginTop: '80px' }}>
            <h2 style={{
                fontSize: '22px',
                fontWeight: '500',
                color: COLORS.text,
                margin: '0 0 20px 0',
                paddingBottom: '12px',
                borderBottom: `1px solid ${COLORS.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <span style={{
                    width: '4px',
                    height: '24px',
                    background: color,
                    borderRadius: '2px'
                }} />
                {title}
            </h2>
            {children}
        </section>
    );
}

function Paragraph({ children }) {
    return (
        <p style={{
            color: COLORS.textMuted,
            fontSize: '15px',
            lineHeight: '1.8',
            margin: '0 0 16px 0'
        }}>
            {children}
        </p>
    );
}

function Highlight({ children, color = COLORS.text }) {
    return <span style={{ color }}>{children}</span>;
}

function Command({ children }) {
    return (
        <code style={{
            background: COLORS.bgLighter,
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '13px',
            fontFamily: "'Consolas', 'Monaco', monospace",
            color: COLORS.aqua
        }}>
            {children}
        </code>
    );
}

const QUICK_LINKS = [
    { id: 'antimatter-depths', label: 'Antimatter Depths', color: COLORS.purple },
    { id: 'trial-locator', label: 'Trial Locator', color: COLORS.gold },
    { id: 'locator-mechanics', label: 'Locator Mechanics', color: COLORS.accent },
    { id: 'end-generation', label: 'End Generation', color: COLORS.purple },
    { id: 'teleporter', label: 'Teleporter', color: COLORS.red }
];

export default function CustomStructures() {
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
                padding: '60px 20px 48px',
                textAlign: 'center',
                borderBottom: `1px solid ${COLORS.border}`
            }}>
                <h1 style={{
                    fontSize: '36px',
                    fontWeight: '300',
                    margin: '0 0 16px 0',
                    letterSpacing: '-0.5px'
                }}>
                    Custom Content
                </h1>
                <p style={{
                    fontSize: '16px',
                    color: COLORS.textMuted,
                    margin: 0,
                    maxWidth: '500px',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                }}>
                    Custom items and world generation designed for faster-paced gameplay
                </p>

                <QuickLinks links={QUICK_LINKS} />
            </div>

            {/* Content */}
            <div style={{
                maxWidth: '700px',
                margin: '0 auto',
                padding: '56px 20px',
                flex: 1
            }}>
                {/* Introduction */}
                <Paragraph>
                    Our ForceItemBattle originally designed for <Highlight color={COLORS.gold}>short rounds</Highlight> -
                    not everyone has time for longer sessions. This meant excluding harder items
                    like those from the End dimension.
                </Paragraph>
                <Paragraph>
                    Rather than leave out a significant part of Minecraft, we added custom structures
                    and items that make the world more accessible within shorter timeframes.
                </Paragraph>

                <div style={{
                    width: '60px',
                    height: '1px',
                    background: COLORS.border,
                    margin: '48px auto'
                }} />

                {/* Antimatter Depths */}
                <Section id="antimatter-depths" title="Antimatter Depths" color={COLORS.purple}>
                    <Paragraph>
                        The Antimatter Depths replaces the vanilla Stronghold as the gateway to the End.
                        It spawns at <Highlight>Y-level −10</Highlight> and provides a much faster route
                        to the End dimension.
                    </Paragraph>
                    <Paragraph>
                        To find it, craft an <Highlight color={COLORS.aqua}>Antimatter Locator</Highlight>:
                    </Paragraph>

                    <CraftingGrid
                        recipe={[
                            [null, 'nether_brick', null],
                            ['glowstone_dust', 'quartz', 'glowstone_dust'],
                            [null, 'nether_brick', null]
                        ]}
                        result="knowledge_book"
                        resultName="Antimatter Locator"
                        glowColor={COLORS.purple}
                    />

                    <Paragraph>
                        Right-click the locator to receive coordinates and a visual trail. Dig straight
                        down at the location to find multiple loot rooms and an activated End Portal.
                    </Paragraph>
                    <Paragraph>
                        <Highlight color={COLORS.textMuted}>View in-game:</Highlight> <Command>/info antimatter_locator</Command>
                    </Paragraph>
                </Section>

                {/* Trial Chambers */}
                <Section id="trial-locator" title="Trial Chambers Locator" color={COLORS.gold}>
                    <Paragraph>
                        Trial Chambers (vanilla structure) also have a custom locator for easier discovery:
                    </Paragraph>

                    <CraftingGrid
                        recipe={[
                            ['chiseled_copper', 'glass', 'chiseled_copper'],
                            ['glass', 'compass', 'glass'],
                            ['gold_ingot', 'gold_ingot', 'gold_ingot']
                        ]}
                        result="wither_rose"
                        resultName="Trial Locator"
                    />

                    <Paragraph>
                        Works identically to the Antimatter Locator: right-click for coordinates and a trail.
                    </Paragraph>
                    <Paragraph>
                        <Highlight color={COLORS.textMuted}>View in-game:</Highlight> <Command>/info trial_locator</Command>
                    </Paragraph>
                </Section>

                {/* Locator Mechanics */}
                <Section id="locator-mechanics" title="Locator Mechanics" color={COLORS.accent}>
                    <Paragraph>
                        Both locators share the same mechanics:
                    </Paragraph>
                    <Paragraph>
                        If another player already marked the same structure, <Highlight color={COLORS.green}>your locator won't be consumed</Highlight> -
                        you can keep searching until you find an unclaimed one. You can still enter
                        claimed structures; this just helps you find unlooted ones.
                    </Paragraph>
                </Section>

                {/* Custom End */}
                <Section id="end-generation" title="Custom End Generation" color={COLORS.purple}>
                    <Paragraph>
                        The End dimension is redesigned for better pacing. The surface is completely solid
                        with <Highlight>no void gaps</Highlight>, and End City spawn rates have been
                        increased for faster access to end-game loot.
                    </Paragraph>
                </Section>

                {/* Teleporter */}
                <Section id="teleporter" title="Antimatter Teleporter" color={COLORS.red}>
                    <Paragraph>
                        A custom structure that generates randomly in the Overworld. Unlike other custom structures,
                        it <Highlight>cannot be located</Highlight> - you'll have to stumble upon it.
                    </Paragraph>
                    <Paragraph>
                        Entering the teleporter transports you <Highlight>5,000 - 10,000 blocks</Highlight> away
                        in a random direction. Useful if you're hunting for a specific biome and your
                        current area isn't cooperating.
                    </Paragraph>
                    <Paragraph>
                        Below the portal is a hidden room with a chest. There's a <Highlight color={COLORS.gold}>50% chance</Highlight> it
                        contains a <Highlight color={COLORS.gold}>Wheel of Fortune</Highlight> - a special item
                        that grants one random item when used.
                    </Paragraph>
                </Section>
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