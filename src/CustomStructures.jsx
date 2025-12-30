import React, { useState } from 'react';

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
    red: '#AA0000',
    orange: '#FF8800'
};

const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib';

// Loot table data with item texture names
const LOOT_TABLES = {
    honey: {
        name: 'Nature Room',
        color: COLORS.gold,
        description: 'A sanctuary filled with floral treasures',
        pools: [
            {
                rolls: '3-7 rolls',
                items: [
                    { name: 'Pitcher Plant', texture: 'pitcher_plant', chance: '3.23%' },
                    { name: 'Lilac', texture: 'lilac', chance: '16.13%' },
                    { name: 'Peony', texture: 'peony', chance: '16.13%' },
                    { name: 'Sunflower', texture: 'sunflower', chance: '16.13%' },
                    { name: 'Feather', texture: 'feather', chance: '16.13%' },
                    { name: 'Oxeye Daisy', texture: 'oxeye_daisy', chance: '16.13%' },
                    { name: 'Apple', texture: 'apple', chance: '16.13%' }
                ]
            },
            {
                rolls: '1 roll (bonus)',
                items: [
                    { name: 'Honey Bottle', texture: 'honey_bottle', chance: '2.33%' },
                    { name: 'Honeycomb Block', texture: 'honeycomb_block', chance: '2.33%' },
                    { name: 'Grass Block', texture: 'grass_block', chance: '2.33%' }
                ]
            }
        ]
    },
    legendary: {
        name: 'Storage',
        color: COLORS.purple,
        description: 'The ultimate treasure trove with rare templates',
        pools: [
            {
                rolls: '5-10 rolls',
                items: [
                    { name: 'Wheat', texture: 'wheat', chance: '10.50%' },
                    { name: 'Bone Meal', texture: 'bone_meal', chance: '10.50%' },
                    { name: 'Brick', texture: 'brick', chance: '10.50%' },
                    { name: 'Glow Berries', texture: 'glow_berries', chance: '10.50%' },
                    { name: 'Clay Ball', texture: 'clay_ball', chance: '10.50%' },
                    { name: 'Copper Ingot', texture: 'copper_ingot', chance: '10.50%' },
                    { name: 'Leather Boots', texture: 'leather_boots', chance: '10.50%', note: 'Lv30 Enchanted' },
                    { name: 'Egg', texture: 'egg', chance: '10.00%' },
                    { name: 'Rabbit Hide', texture: 'rabbit_hide', chance: '4.50%' },
                    { name: 'Slime Ball', texture: 'slime_ball', chance: '4.50%' },
                    { name: 'Gold Ingot', texture: 'gold_ingot', chance: '3.00%' },
                    { name: 'Totem of Undying', texture: 'totem_of_undying', chance: '1.00%' },
                    { name: 'Rabbit Foot', texture: 'rabbit_foot', chance: '1.00%' },
                    { name: 'Wild Armor Trim', texture: 'wild_armor_trim_smithing_template', chance: '0.50%', legendary: true },
                    { name: 'Dune Armor Trim', texture: 'dune_armor_trim_smithing_template', chance: '0.50%', legendary: true },
                    { name: 'Sentry Armor Trim', texture: 'sentry_armor_trim_smithing_template', chance: '0.50%', legendary: true },
                    { name: 'Netherite Upgrade', texture: 'netherite_upgrade_smithing_template', chance: '0.50%', legendary: true },
                    { name: 'Snout Armor Trim', texture: 'snout_armor_trim_smithing_template', chance: '0.50%', legendary: true }
                ]
            }
        ]
    },
    parkour: {
        name: 'Lava Parkour',
        color: COLORS.aqua,
        description: 'Complete the challenge for a 10% shot at music',
        pools: [
            {
                rolls: '1 roll',
                note: '10% total chance for any music disc',
                items: [
                    { name: 'Music Disc (Pigstep)', texture: 'music_disc_pigstep', chance: '1.67%', legendary: true },
                    { name: 'Music Disc (Otherside)', texture: 'music_disc_otherside', chance: '1.67%', legendary: true },
                    { name: 'Music Disc (Relic)', texture: 'music_disc_relic', chance: '1.67%', legendary: true },
                    { name: 'Music Disc (13)', texture: 'music_disc_13', chance: '1.67%', legendary: true },
                    { name: 'Music Disc (Cat)', texture: 'music_disc_cat', chance: '1.67%', legendary: true },
                    { name: 'Music Disc (Tears)', texture: 'music_disc_wait', chance: '1.67%', legendary: true }
                ]
            }
        ]
    },
    treasure: {
        name: 'Treasure Room',
        color: COLORS.green,
        description: 'A bounty of resources and rare saplings',
        pools: [
            {
                rolls: '5-10 rolls',
                items: [
                    { name: 'Iron Ingot', texture: 'iron_ingot', chance: '9.48%', note: '2-3' },
                    { name: 'Cocoa Beans', texture: 'cocoa_beans', chance: '9.48%', note: '1-3' },
                    { name: 'Leather', texture: 'leather', chance: '9.48%', note: '1-2' },
                    { name: 'String', texture: 'string', chance: '9.48%' },
                    { name: 'Dirt', texture: 'dirt', chance: '9.48%', note: '8-16' },
                    { name: 'Cobbled Deepslate', texture: 'cobbled_deepslate', chance: '9.48%', note: '4-8' },
                    { name: 'Coal', texture: 'coal', chance: '9.48%', note: '3-7' },
                    { name: 'Leather Helmet', texture: 'leather_helmet', chance: '8.02%', note: 'Lv30 Ench' },
                    { name: 'Ender Pearl', texture: 'ender_pearl', chance: '6.46%' },
                    { name: 'Diamond', texture: 'diamond', chance: '4.79%' },
                    { name: 'Golden Apple', texture: 'golden_apple', chance: '4.69%', note: '"Gros Michel"' },
                    { name: 'Enchanted Book', texture: 'enchanted_book', chance: '3.23%' },
                    { name: 'Pale Oak Sapling', texture: 'pale_oak_sapling', chance: '1.25%' },
                    { name: 'Acacia Sapling', texture: 'acacia_sapling', chance: '1.25%' },
                    { name: 'Jungle Sapling', texture: 'jungle_sapling', chance: '1.25%' },
                    { name: 'Cherry Sapling', texture: 'cherry_sapling', chance: '1.25%' },
                    { name: 'Mangrove Propagule', texture: 'mangrove_propagule', chance: '1.25%' },
                    { name: 'Anvil', texture: 'anvil', chance: '0.10%', legendary: true, note: '"SILK TOUCH BABY"' },
                    { name: 'Ench. Golden Apple', texture: 'enchanted_golden_apple', chance: '0.10%', legendary: true, note: '"Cavendish"' }
                ]
            }
        ]
    }
};

// Recipe configurations
const RECIPES = {
    antimatter: {
        normal: {
            recipe: [
                [null, 'nether_brick', null],
                ['glowstone_dust', 'quartz', 'glowstone_dust'],
                [null, 'nether_brick', null]
            ],
            result: 'knowledge_book',
            name: 'Antimatter Locator'
        },
        hard: {
            recipe: [
                ['nether_brick', 'glowstone_dust', 'nether_brick'],
                ['quartz', 'ender_eye', 'quartz'],
                ['nether_brick', 'glowstone_dust', 'nether_brick']
            ],
            result: 'knowledge_book',
            name: 'Antimatter Locator'
        }
    },
    trial: {
        normal: {
            recipe: [
                ['chiseled_copper', 'glass', 'chiseled_copper'],
                ['glass', 'compass', 'glass'],
                ['gold_ingot', 'gold_ingot', 'gold_ingot']
            ],
            result: 'wither_rose',
            name: 'Trial Locator'
        },
        hard: {
            recipe: [
                ['obsidian', 'copper_ingot', 'obsidian'],
                ['gold_ingot', 'compass', 'iron_ingot'],
                ['obsidian', 'diamond', 'obsidian']
            ],
            result: 'wither_rose',
            name: 'Trial Locator'
        }
    }
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

function RecipeToggle({ isHard, onToggle }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px'
        }}>
            <span style={{
                fontSize: '13px',
                color: !isHard ? COLORS.text : COLORS.textMuted,
                fontWeight: !isHard ? '600' : '400'
            }}>
                Standard
            </span>
            <button
                onClick={onToggle}
                style={{
                    width: '48px',
                    height: '26px',
                    borderRadius: '13px',
                    border: 'none',
                    background: isHard ? COLORS.orange : COLORS.border,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s'
                }}
            >
                <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: COLORS.text,
                    position: 'absolute',
                    top: '3px',
                    left: isHard ? '25px' : '3px',
                    transition: 'left 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }} />
            </button>
            <span style={{
                fontSize: '13px',
                color: isHard ? COLORS.orange : COLORS.textMuted,
                fontWeight: isHard ? '600' : '400'
            }}>
                Hard Mode
            </span>
        </div>
    );
}

function CraftingGrid({ recipe, result, resultName, glowColor = COLORS.gold }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            flexWrap: 'wrap'
        }}>
            {/* Crafting grid */}
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
                                src={`${IMAGE_BASE_URL}/${item}.png`}
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

            {/* Arrow and result - inline on desktop, stacked on mobile */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
            }}>
                <div style={{ color: COLORS.textMuted, fontSize: '28px' }}>→</div>

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

function LootItem({ item }) {
    const [hovered, setHovered] = useState(false);

    // Determine rarity based on drop chance
    const chanceNum = parseFloat(item.chance);
    const isLegendary = item.legendary || chanceNum < 1;
    const isRare = !isLegendary && chanceNum < 5;

    return (
        <div
            style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                width: '72px'
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div style={{
                width: '56px',
                height: '56px',
                background: COLORS.bgLight,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${isLegendary ? COLORS.purple : isRare ? COLORS.gold : COLORS.border}`,
                transition: 'transform 0.15s, border-color 0.15s',
                transform: hovered ? 'scale(1.1)' : 'scale(1)',
                cursor: 'pointer',
                boxShadow: isLegendary ? `0 0 12px ${COLORS.purple}44` : isRare ? `0 0 10px ${COLORS.gold}33` : 'none'
            }}>
                <img
                    src={`${IMAGE_BASE_URL}/${item.texture}.png`}
                    alt={item.name}
                    style={{
                        width: '40px',
                        height: '40px',
                        imageRendering: 'pixelated'
                    }}
                    onError={(e) => { e.target.style.opacity = '0.3'; }}
                />
            </div>

            {/* Percentage always visible */}
            <span style={{
                fontSize: '11px',
                fontFamily: "'Consolas', monospace",
                color: isLegendary ? COLORS.purple : isRare ? COLORS.gold : COLORS.textMuted
            }}>
                {item.chance}
            </span>

            {/* Tooltip for name/notes */}
            {hovered && (
                <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '8px',
                    padding: '8px 12px',
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '6px',
                    whiteSpace: 'nowrap',
                    zIndex: 100,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                }}>
                    <div style={{
                        color: isLegendary ? COLORS.purple : isRare ? COLORS.gold : COLORS.text,
                        fontSize: '13px',
                        fontWeight: '600'
                    }}>
                        {item.name}
                    </div>
                    {item.note && (
                        <div style={{ color: COLORS.textMuted, fontSize: '11px', marginTop: '2px' }}>
                            {item.note}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function LootTableDisplay({ tables }) {
    const [activeRoom, setActiveRoom] = useState('honey');
    const table = tables[activeRoom];

    return (
        <div>
            {/* Room selector tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px',
                flexWrap: 'wrap'
            }}>
                {Object.entries(tables).map(([key, t]) => (
                    <button
                        key={key}
                        onClick={() => setActiveRoom(key)}
                        style={{
                            padding: '12px 20px',
                            background: activeRoom === key ? `${t.color}22` : 'transparent',
                            border: `2px solid ${activeRoom === key ? t.color : COLORS.border}`,
                            borderRadius: '8px',
                            color: activeRoom === key ? t.color : COLORS.textMuted,
                            fontSize: '14px',
                            fontWeight: activeRoom === key ? '600' : '400',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                            if (activeRoom !== key) {
                                e.currentTarget.style.borderColor = t.color + '66';
                            }
                        }}
                        onMouseLeave={e => {
                            if (activeRoom !== key) {
                                e.currentTarget.style.borderColor = COLORS.border;
                            }
                        }}
                    >
                        {t.name}
                    </button>
                ))}
            </div>

            {/* Room content */}
            <div style={{
                background: COLORS.bgLight,
                border: `2px solid ${table.color}44`,
                borderRadius: '12px',
                padding: '24px',
                position: 'relative'
            }}>
                {/* Room header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div>
                        <h3 style={{
                            margin: 0,
                            fontSize: '20px',
                            fontWeight: '600',
                            color: table.color
                        }}>
                            {table.name}
                        </h3>
                        <p style={{
                            margin: '4px 0 0',
                            fontSize: '13px',
                            color: COLORS.textMuted
                        }}>
                            {table.description}
                        </p>
                    </div>
                </div>

                {/* Pools */}
                {table.pools.map((pool, poolIdx) => (
                    <div key={poolIdx} style={{ marginBottom: poolIdx < table.pools.length - 1 ? '24px' : 0 }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '16px'
                        }}>
                            <span style={{
                                background: table.color + '33',
                                color: table.color,
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '600'
                            }}>
                                {pool.rolls}
                            </span>
                            {pool.note && (
                                <span style={{
                                    color: COLORS.textMuted,
                                    fontSize: '12px',
                                    fontStyle: 'italic'
                                }}>
                                    {pool.note}
                                </span>
                            )}
                        </div>

                        {/* Item grid */}
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}>
                            {pool.items.map((item, idx) => (
                                <LootItem key={idx} item={item} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Section({ id, title, color, children }) {
    return (
        <section id={id} style={{ marginBottom: '64px', scrollMarginTop: '80px' }}>
            <h2 style={{
                fontSize: '22px',
                fontWeight: '500',
                color: COLORS.text,
                margin: '0 0 24px 0',
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
    { id: 'loot-tables', label: 'Loot Tables', color: COLORS.green },
    { id: 'end-generation', label: 'End Generation', color: COLORS.purple },
    { id: 'teleporter', label: 'Teleporter', color: COLORS.red },
    { id: 'wandering-trader', label: 'Wandering Trader', color: COLORS.aqua }
];

export default function CustomStructures() {
    const [antimatterHard, setAntimatterHard] = useState(false);
    const [trialHard, setTrialHard] = useState(false);

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
                maxWidth: '800px',
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

                    <RecipeToggle isHard={antimatterHard} onToggle={() => setAntimatterHard(!antimatterHard)} />

                    <CraftingGrid
                        recipe={antimatterHard ? RECIPES.antimatter.hard.recipe : RECIPES.antimatter.normal.recipe}
                        result={RECIPES.antimatter.normal.result}
                        resultName={RECIPES.antimatter.normal.name}
                        glowColor={COLORS.purple}
                    />

                    <div style={{ marginTop: '24px' }}>
                        <Paragraph>
                            Right-click the locator to receive coordinates and a visual trail. Dig straight
                            down at the location to find multiple loot rooms and an activated End Portal.
                        </Paragraph>
                        <Paragraph>
                            <Highlight color={COLORS.textMuted}>View in-game:</Highlight> <Command>/info antimatter_locator</Command>
                        </Paragraph>
                    </div>
                </Section>

                {/* Trial Chambers */}
                <Section id="trial-locator" title="Trial Chambers Locator" color={COLORS.gold}>
                    <Paragraph>
                        Trial Chambers (vanilla structure) also have a custom locator for easier discovery:
                    </Paragraph>

                    <RecipeToggle isHard={trialHard} onToggle={() => setTrialHard(!trialHard)} />

                    <CraftingGrid
                        recipe={trialHard ? RECIPES.trial.hard.recipe : RECIPES.trial.normal.recipe}
                        result={RECIPES.trial.normal.result}
                        resultName={RECIPES.trial.normal.name}
                        glowColor={COLORS.gold}
                    />

                    <div style={{ marginTop: '24px' }}>
                        <Paragraph>
                            Works identically to the Antimatter Locator: right-click for coordinates and a trail.
                        </Paragraph>
                        <Paragraph>
                            <Highlight color={COLORS.textMuted}>View in-game:</Highlight> <Command>/info trial_locator</Command>
                        </Paragraph>
                    </div>
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
                    <Paragraph>
                        <Highlight color={COLORS.orange}>Hard Mode recipes</Highlight> (toggle above) are used in the 2 Hour Version,
                        requiring more complex ingredients for a greater challenge.
                    </Paragraph>
                </Section>

                {/* Loot Tables */}
                <Section id="loot-tables" title="Antimatter Depths Loot" color={COLORS.green}>
                    <Paragraph>
                        The Antimatter Depths contains four distinct loot rooms. Hover over items to see drop chances:
                    </Paragraph>

                    <LootTableDisplay tables={LOOT_TABLES} />
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

                {/* Wandering Trader */}
                <Section id="wandering-trader" title="Custom Wandering Trader" color={COLORS.aqua}>
                    <Paragraph>
                        The Wandering Trader spawns every <Highlight>7-10 minutes</Highlight> near the spawn area.
                        When it appears, coordinates are displayed in chat and the tab list.
                    </Paragraph>
                    <Paragraph>
                        All trades are vanilla items but cost only <Highlight color={COLORS.green}>1 Emerald</Highlight> each.
                        Additionally, the trader sells a <Highlight color={COLORS.gold}>Wheel of Fortune</Highlight> for
                        1 Emerald (limited to one per player per trader).
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