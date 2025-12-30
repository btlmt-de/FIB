import React, { useState, useEffect, useRef } from 'react';

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
const WHEEL_TEXTURE_URL = 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/item/wheel.png';

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

function simulateLoot(table) {
    const results = [];

    for (const pool of table.pools) {
        // Parse roll range (e.g., "3-7 rolls" or "1 roll")
        const rollMatch = pool.rolls.match(/(\d+)(?:-(\d+))?/);
        if (!rollMatch) continue;

        const minRolls = parseInt(rollMatch[1]);
        const maxRolls = rollMatch[2] ? parseInt(rollMatch[2]) : minRolls;
        const numRolls = Math.floor(Math.random() * (maxRolls - minRolls + 1)) + minRolls;

        // Calculate total weight from percentages
        const items = pool.items.map(item => ({
            ...item,
            weight: parseFloat(item.chance)
        }));
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

        // Roll for items
        for (let i = 0; i < numRolls; i++) {
            const roll = Math.random() * totalWeight;
            let cumulative = 0;

            for (const item of items) {
                cumulative += item.weight;
                if (roll < cumulative) {
                    // Skip "Nothing" entries
                    if (item.name.toLowerCase() !== 'nothing') {
                        results.push(item);
                    }
                    break;
                }
            }
        }
    }

    return results;
}

function LootSimulationResult({ items, onReroll, roomColor }) {
    // Group items by name and count
    const grouped = items.reduce((acc, item) => {
        const key = item.name;
        if (!acc[key]) {
            acc[key] = { ...item, count: 0 };
        }
        acc[key].count++;
        return acc;
    }, {});

    const groupedItems = Object.values(grouped).sort((a, b) => b.count - a.count);

    return (
        <div style={{
            marginTop: '20px',
            padding: '20px',
            background: COLORS.bg,
            borderRadius: '8px',
            border: `1px solid ${roomColor}44`
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
            }}>
                <span style={{
                    color: COLORS.text,
                    fontSize: '14px',
                    fontWeight: '500'
                }}>
                    Loot Result ({items.length} item{items.length !== 1 ? 's' : ''})
                </span>
                <button
                    onClick={onReroll}
                    style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '4px',
                        color: COLORS.textMuted,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.borderColor = roomColor;
                        e.currentTarget.style.color = COLORS.text;
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.borderColor = COLORS.border;
                        e.currentTarget.style.color = COLORS.textMuted;
                    }}
                >
                    ↻ Open Again
                </button>
            </div>

            {groupedItems.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '20px',
                    color: COLORS.textMuted,
                    fontSize: '13px'
                }}>
                    The chest was empty... Try again!
                </div>
            ) : (
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    {groupedItems.map((item, idx) => {
                        const chanceNum = parseFloat(item.chance);
                        const isLegendary = item.legendary || chanceNum < 1;
                        const isRare = !isLegendary && chanceNum < 5;

                        return (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <div style={{
                                    position: 'relative',
                                    width: '48px',
                                    height: '48px',
                                    background: COLORS.bgLight,
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: `2px solid ${isLegendary ? COLORS.purple : isRare ? COLORS.gold : COLORS.border}`,
                                    boxShadow: isLegendary ? `0 0 12px ${COLORS.purple}44` : isRare ? `0 0 10px ${COLORS.gold}33` : 'none'
                                }}>
                                    <img
                                        src={`${IMAGE_BASE_URL}/${item.texture}.png`}
                                        alt={item.name}
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            imageRendering: 'pixelated'
                                        }}
                                        onError={(e) => { e.target.style.opacity = '0.3'; }}
                                    />
                                    {item.count > 1 && (
                                        <span style={{
                                            position: 'absolute',
                                            bottom: '-2px',
                                            right: '-2px',
                                            background: COLORS.bgLighter,
                                            color: COLORS.text,
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            border: `1px solid ${COLORS.border}`
                                        }}>
                                            ×{item.count}
                                        </span>
                                    )}
                                </div>
                                <span style={{
                                    fontSize: '10px',
                                    color: isLegendary ? COLORS.purple : isRare ? COLORS.gold : COLORS.textMuted,
                                    maxWidth: '60px',
                                    textAlign: 'center',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {item.name.split('(')[0].trim()}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function LootTableDisplay({ tables }) {
    const [activeRoom, setActiveRoom] = useState('honey');
    const [simulationResult, setSimulationResult] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const table = tables[activeRoom];

    const handleOpenChest = () => {
        setIsAnimating(true);
        setSimulationResult(null);

        // Small delay for animation effect
        setTimeout(() => {
            const loot = simulateLoot(table);
            setSimulationResult(loot);
            setIsAnimating(false);
        }, 300);
    };

    const handleRoomChange = (key) => {
        setActiveRoom(key);
        setSimulationResult(null);
    };

    return (
        <div>
            {/* Room selector tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                {Object.entries(tables).map(([key, t]) => (
                    <button
                        key={key}
                        onClick={() => handleRoomChange(key)}
                        style={{
                            padding: '12px 20px',
                            background: activeRoom === key ? `${t.color}22` : 'transparent',
                            border: `2px solid ${activeRoom === key ? t.color : COLORS.border}`,
                            borderRadius: '8px',
                            color: activeRoom === key ? t.color : COLORS.textMuted,
                            fontSize: '14px',
                            fontWeight: '500',
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

                {/* Chest button */}
                <button
                    onClick={handleOpenChest}
                    disabled={isAnimating}
                    style={{
                        marginLeft: 'auto',
                        padding: '10px 16px',
                        background: isAnimating ? COLORS.bgLighter : `${table.color}22`,
                        border: `2px solid ${table.color}`,
                        borderRadius: '8px',
                        color: table.color,
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: isAnimating ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                        transform: isAnimating ? 'scale(0.95)' : 'scale(1)'
                    }}
                    onMouseEnter={e => {
                        if (!isAnimating) {
                            e.currentTarget.style.background = `${table.color}33`;
                        }
                    }}
                    onMouseLeave={e => {
                        if (!isAnimating) {
                            e.currentTarget.style.background = `${table.color}22`;
                        }
                    }}
                >
                    <img
                        src={`${IMAGE_BASE_URL}/chest.png`}
                        alt="Open Chest"
                        style={{
                            width: '24px',
                            height: '24px',
                            imageRendering: 'pixelated',
                            transform: isAnimating ? 'rotate(-10deg)' : 'rotate(0deg)',
                            transition: 'transform 0.15s'
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    {isAnimating ? 'Opening...' : 'Open Chest'}
                </button>
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

            {/* Simulation Result */}
            {simulationResult !== null && (
                <LootSimulationResult
                    items={simulationResult}
                    onReroll={handleOpenChest}
                    roomColor={table.color}
                />
            )}
        </div>
    );
}

// Fetch all FIB items from the Java source file
const ITEMS_GITHUB_URL = 'https://raw.githubusercontent.com/McPlayHDnet/ForceItemBattle/v3.9.5/src/main/java/forceitembattle/manager/ItemDifficultiesManager.java';
const COLLECTION_STORAGE_KEY = 'fib_wheel_collection';

// Special team members with ultra-rare drop chances
const TEAM_MEMBERS = [
    { name: 'eltobito', username: 'eltobito', chance: 0.00001 },
    { name: 'apppaa', username: 'apppaa', chance: 0.0001 },
    { name: 'threeseconds', username: 'threeseconds', chance: 0.0003 },
    { name: 'stupxd', username: 'stupxd', chance: 0.0005 },
    { name: 'CH0RD', username: 'CH0RD', chance: 0.0007 },
];

// Mythic tier - the rarest item
const MYTHIC_ITEM = {
    name: 'Cavendish',
    texture: 'mythic_cavendish',
    chance: 0.000001, // 0.0001%
    isMythic: true,
    imageUrl: 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/item/cavendish.png'
};

const TOTAL_SPECIAL_CHANCE = TEAM_MEMBERS.reduce((sum, m) => sum + m.chance, 0);
const TOTAL_MYTHIC_CHANCE = MYTHIC_ITEM.chance;

// Format percentage without trailing zeros
function formatChance(chance) {
    const percent = chance * 100;
    // Use enough precision to show the significant digits, then remove trailing zeros
    return parseFloat(percent.toFixed(6)).toString();
}

function getMinecraftHeadUrl(username) {
    return `https://minotar.net/helm/${username}/64`;
}

function isSpecialItem(item) {
    return item && item.isSpecial;
}

function isMythicItem(item) {
    return item && item.isMythic;
}

function pickRandomItem(allItems) {
    const roll = Math.random();

    // Check if we hit the mythic item first (rarest)
    if (roll < TOTAL_MYTHIC_CHANCE) {
        return { ...MYTHIC_ITEM };
    }

    // Check if we hit a special item
    if (roll < TOTAL_MYTHIC_CHANCE + TOTAL_SPECIAL_CHANCE) {
        // Pick which special item based on relative chances
        let cumulative = TOTAL_MYTHIC_CHANCE;
        for (const member of TEAM_MEMBERS) {
            cumulative += member.chance;
            if (roll < cumulative) {
                return {
                    name: member.name,
                    texture: `special_${member.username}`,
                    isSpecial: true,
                    username: member.username,
                    chance: member.chance
                };
            }
        }
    }

    // Regular item
    return allItems[Math.floor(Math.random() * allItems.length)];
}

function parseItemsFromJava(content) {
    const items = [];
    const regex = /Material\.([A-Z_0-9]+)/g;
    let match;
    const seen = new Set();

    while ((match = regex.exec(content)) !== null) {
        const material = match[1];
        if (!seen.has(material)) {
            seen.add(material);
            items.push({
                name: material.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
                texture: material.toLowerCase()
            });
        }
    }

    return items;
}

function loadCollection() {
    try {
        const saved = localStorage.getItem(COLLECTION_STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

function saveCollection(collection) {
    try {
        localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(collection));
    } catch (e) {
        console.error('Failed to save collection:', e);
    }
}

function CollectionBook({ allItems, collection, onClose }) {
    const [filter, setFilter] = useState('all'); // 'all', 'collected', 'missing', 'mythic', 'special'
    const [search, setSearch] = useState('');

    // Mythic item
    const mythicItems = [{
        name: MYTHIC_ITEM.name,
        texture: MYTHIC_ITEM.texture,
        isMythic: true,
        chance: MYTHIC_ITEM.chance,
        imageUrl: MYTHIC_ITEM.imageUrl
    }];

    // Combine regular items with special team members
    const specialItems = TEAM_MEMBERS.map(m => ({
        name: m.name,
        texture: `special_${m.username}`,
        isSpecial: true,
        username: m.username,
        chance: m.chance
    }));

    const allItemsWithSpecial = [...mythicItems, ...specialItems, ...allItems];

    const collectedCount = Object.keys(collection).length;
    const collectedMythicCount = mythicItems.filter(item => collection[item.texture] > 0).length;
    const collectedSpecialCount = specialItems.filter(item => collection[item.texture] > 0).length;
    const totalCount = allItemsWithSpecial.length;
    const percentage = totalCount > 0 ? ((collectedCount / totalCount) * 100).toFixed(1) : 0;

    const filteredItems = allItemsWithSpecial.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
        const isCollected = collection[item.texture] > 0;
        const isSpecial = item.isSpecial;
        const isMythic = item.isMythic;

        if (!matchesSearch) return false;
        if (filter === 'mythic') return isMythic;
        if (filter === 'special') return isSpecial;
        if (filter === 'collected') return isCollected;
        if (filter === 'missing') return !isCollected;
        return true;
    });

    // Sort: mythic first, then special items, then by count, then alphabetically
    const sortedItems = [...filteredItems].sort((a, b) => {
        // Mythic always first
        if (a.isMythic && !b.isMythic) return -1;
        if (!a.isMythic && b.isMythic) return 1;

        // Special items second
        if (a.isSpecial && !b.isSpecial) return -1;
        if (!a.isSpecial && b.isSpecial) return 1;

        const aCount = collection[a.texture] || 0;
        const bCount = collection[b.texture] || 0;
        if (aCount !== bCount) return bCount - aCount;
        return a.name.localeCompare(b.name);
    });

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                background: COLORS.bg,
                borderRadius: '16px',
                border: `1px solid ${COLORS.border}`,
                width: '100%',
                maxWidth: '900px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'slideUp 0.3s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px'
                }}>
                    <div>
                        <h2 style={{
                            margin: 0,
                            fontSize: '20px',
                            fontWeight: '600',
                            color: COLORS.text,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <span style={{ fontSize: '24px' }}>📖</span>
                            Collection Book
                        </h2>
                        <p style={{
                            margin: '4px 0 0 0',
                            fontSize: '13px',
                            color: COLORS.textMuted
                        }}>
                            Track your Wheel of Fortune discoveries
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: COLORS.textMuted,
                            fontSize: '24px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = COLORS.bgLight;
                            e.currentTarget.style.color = COLORS.text;
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = COLORS.textMuted;
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Progress Bar */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    background: COLORS.bgLight
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                    }}>
                        <span style={{ color: COLORS.text, fontSize: '14px', fontWeight: '500' }}>
                            Total Progress
                        </span>
                        <span style={{ color: COLORS.gold, fontSize: '14px', fontWeight: '600' }}>
                            {collectedCount} / {totalCount} ({percentage}%)
                        </span>
                    </div>
                    <div style={{
                        height: '8px',
                        background: COLORS.bg,
                        borderRadius: '4px',
                        overflow: 'hidden',
                        marginBottom: '16px'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${percentage}%`,
                            background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.orange})`,
                            borderRadius: '4px',
                            transition: 'width 0.5s ease-out'
                        }} />
                    </div>

                    {/* Mythic Progress */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px'
                    }}>
                        <span style={{
                            color: COLORS.aqua,
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <span>✦</span> Mythic
                        </span>
                        <span style={{ color: COLORS.aqua, fontSize: '12px', fontWeight: '600' }}>
                            {collectedMythicCount} / {mythicItems.length}
                        </span>
                    </div>
                    <div style={{
                        height: '6px',
                        background: COLORS.bg,
                        borderRadius: '3px',
                        overflow: 'hidden',
                        marginBottom: '12px'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${(collectedMythicCount / mythicItems.length) * 100}%`,
                            background: `linear-gradient(90deg, ${COLORS.aqua}, ${COLORS.purple}, ${COLORS.gold})`,
                            borderRadius: '3px',
                            transition: 'width 0.5s ease-out'
                        }} />
                    </div>

                    {/* Special Progress */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px'
                    }}>
                        <span style={{
                            color: COLORS.purple,
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <span>★</span> Legendary Team
                        </span>
                        <span style={{ color: COLORS.purple, fontSize: '12px', fontWeight: '600' }}>
                            {collectedSpecialCount} / {specialItems.length}
                        </span>
                    </div>
                    <div style={{
                        height: '6px',
                        background: COLORS.bg,
                        borderRadius: '3px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${(collectedSpecialCount / specialItems.length) * 100}%`,
                            background: `linear-gradient(90deg, ${COLORS.purple}, ${COLORS.gold})`,
                            borderRadius: '3px',
                            transition: 'width 0.5s ease-out'
                        }} />
                    </div>
                </div>

                {/* Filters & Search */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                }}>
                    <div style={{
                        display: 'flex',
                        background: COLORS.bgLight,
                        borderRadius: '8px',
                        padding: '4px',
                        gap: '4px',
                        flexWrap: 'wrap'
                    }}>
                        {[
                            { key: 'all', label: 'All' },
                            { key: 'mythic', label: '✦ Mythic', color: COLORS.aqua },
                            { key: 'special', label: '★ Legendary', color: COLORS.purple },
                            { key: 'collected', label: 'Collected' },
                            { key: 'missing', label: 'Missing' }
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                style={{
                                    padding: '6px 12px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    background: filter === f.key
                                        ? (f.color || COLORS.gold)
                                        : 'transparent',
                                    color: filter === f.key ? (f.key === 'mythic' ? COLORS.bg : '#fff') : COLORS.textMuted
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <input
                        type="text"
                        placeholder="Search items..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            flex: 1,
                            minWidth: '150px',
                            padding: '8px 14px',
                            background: COLORS.bgLight,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '8px',
                            color: COLORS.text,
                            fontSize: '13px',
                            outline: 'none'
                        }}
                    />

                    <span style={{
                        color: COLORS.textMuted,
                        fontSize: '12px'
                    }}>
                        Showing {sortedItems.length} items
                    </span>
                </div>

                {/* Items Grid */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '20px 24px'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
                        gap: '8px'
                    }}>
                        {sortedItems.map(item => {
                            const count = collection[item.texture] || 0;
                            const isCollected = count > 0;
                            const isSpecial = item.isSpecial;
                            const isMythic = item.isMythic;

                            return (
                                <div
                                    key={item.texture}
                                    title={`${item.name}${(isSpecial || isMythic) ? ` (${formatChance(item.chance)}%)` : ''}${count > 0 ? ` (×${count})` : ' (Not collected)'}`}
                                    style={{
                                        position: 'relative',
                                        aspectRatio: '1',
                                        background: isMythic
                                            ? (isCollected ? `linear-gradient(135deg, ${COLORS.aqua}33, ${COLORS.purple}22, ${COLORS.gold}22)` : COLORS.bg)
                                            : isSpecial
                                                ? (isCollected ? `linear-gradient(135deg, ${COLORS.purple}33, ${COLORS.gold}22)` : COLORS.bg)
                                                : (isCollected ? COLORS.bgLight : COLORS.bg),
                                        border: `2px solid ${
                                            isMythic
                                                ? (isCollected ? COLORS.aqua : COLORS.aqua + '44')
                                                : isSpecial
                                                    ? (isCollected ? COLORS.purple : COLORS.purple + '44')
                                                    : (isCollected ? COLORS.gold + '66' : COLORS.border)
                                        }`,
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.15s',
                                        cursor: 'default',
                                        boxShadow: isMythic && isCollected
                                            ? `0 0 20px ${COLORS.aqua}44, 0 0 30px ${COLORS.purple}22`
                                            : isSpecial && isCollected
                                                ? `0 0 15px ${COLORS.purple}44`
                                                : 'none',
                                        animation: isMythic && isCollected ? 'mythicGlowSoft 2s ease-in-out infinite' : 'none'
                                    }}
                                >
                                    {/* Mythic/Special badge */}
                                    {(isMythic || isSpecial) && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '-4px',
                                            right: '-4px',
                                            background: isMythic
                                                ? (isCollected
                                                    ? `linear-gradient(135deg, ${COLORS.aqua}, ${COLORS.purple}, ${COLORS.gold})`
                                                    : COLORS.bgLighter)
                                                : (isCollected
                                                    ? `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.gold})`
                                                    : COLORS.bgLighter),
                                            color: isCollected ? '#fff' : COLORS.textMuted,
                                            fontSize: '8px',
                                            width: '14px',
                                            height: '14px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: `1px solid ${isMythic ? (isCollected ? COLORS.aqua : COLORS.border) : (isCollected ? COLORS.purple : COLORS.border)}`,
                                            zIndex: 2
                                        }}>
                                            {isMythic ? '✦' : '★'}
                                        </div>
                                    )}

                                    <img
                                        src={isMythic
                                            ? item.imageUrl
                                            : isSpecial
                                                ? getMinecraftHeadUrl(item.username)
                                                : `${IMAGE_BASE_URL}/${item.texture}.png`
                                        }
                                        alt={item.name}
                                        style={{
                                            width: '70%',
                                            height: '70%',
                                            imageRendering: isSpecial ? 'auto' : 'pixelated',
                                            borderRadius: isSpecial ? '4px' : '0',
                                            opacity: isCollected ? 1 : 0.2,
                                            filter: isCollected ? 'none' : 'grayscale(100%)',
                                            transition: 'all 0.15s'
                                        }}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = `${IMAGE_BASE_URL}/barrier.png`;
                                        }}
                                    />

                                    {count > 1 && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '2px',
                                            right: '2px',
                                            background: isMythic ? COLORS.aqua : isSpecial ? COLORS.purple : COLORS.gold,
                                            color: '#fff',
                                            fontSize: '10px',
                                            fontWeight: '700',
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            minWidth: '18px',
                                            textAlign: 'center'
                                        }}>
                                            {count}
                                        </div>
                                    )}

                                    {isCollected && count === 1 && !isSpecial && !isMythic && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '2px',
                                            right: '2px',
                                            color: COLORS.green,
                                            fontSize: '12px'
                                        }}>
                                            ✓
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {sortedItems.length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: '48px 20px',
                            color: COLORS.textMuted
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
                            <div>No items found</div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes mythicGlowSoft {
                    0%, 100% { 
                        box-shadow: 0 0 15px ${COLORS.aqua}44, 0 0 25px ${COLORS.purple}22;
                    }
                    33% { 
                        box-shadow: 0 0 15px ${COLORS.purple}44, 0 0 25px ${COLORS.gold}22;
                    }
                    66% { 
                        box-shadow: 0 0 15px ${COLORS.gold}44, 0 0 25px ${COLORS.aqua}22;
                    }
                }
            `}</style>
        </div>
    );
}

function WheelOfFortune() {
    const [state, setState] = useState('idle'); // 'idle', 'spinning', 'result'
    const [strip, setStrip] = useState([]);
    const [offset, setOffset] = useState(0);
    const [result, setResult] = useState(null);
    const [allItems, setAllItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [collection, setCollection] = useState(loadCollection);
    const [showCollection, setShowCollection] = useState(false);
    const [isNewItem, setIsNewItem] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const animationRef = useRef(null);

    // Check for mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 600);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const ITEM_WIDTH = 80;
    const SPIN_DURATION = 7000;
    const STRIP_LENGTH = 80;
    const FINAL_INDEX = STRIP_LENGTH - 8;

    // Fetch items on mount
    useEffect(() => {
        async function fetchItems() {
            try {
                const response = await fetch(ITEMS_GITHUB_URL);
                if (response.ok) {
                    const content = await response.text();
                    const items = parseItemsFromJava(content);
                    setAllItems(items);
                }
            } catch (e) {
                console.error('Failed to fetch items:', e);
            } finally {
                setLoading(false);
            }
        }
        fetchItems();
    }, []);

    const spin = () => {
        if (state === 'spinning' || allItems.length === 0) return;

        // Reset state for new spin
        setIsNewItem(false);

        const finalItem = pickRandomItem(allItems);

        const newStrip = [];
        for (let i = 0; i < STRIP_LENGTH; i++) {
            if (i === FINAL_INDEX) {
                newStrip.push(finalItem);
            } else {
                // For strip items, very rarely show special items (just for visual flair)
                const stripItem = Math.random() < 0.02
                    ? { ...TEAM_MEMBERS[Math.floor(Math.random() * TEAM_MEMBERS.length)], isSpecial: true, texture: 'special' }
                    : allItems[Math.floor(Math.random() * allItems.length)];
                newStrip.push(stripItem);
            }
        }

        setStrip(newStrip);
        setResult(finalItem);
        setOffset(0);
        setState('spinning');

        const targetOffset = FINAL_INDEX * ITEM_WIDTH;
        const randomOffset = (Math.random() - 0.5) * 30;
        const finalOffset = targetOffset + randomOffset;

        let startTime = null;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / SPIN_DURATION, 1);
            const eased = 1 - Math.pow(1 - progress, 4);

            setOffset(eased * finalOffset);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                setState('result');
                // Check if new and add to collection
                setCollection(prev => {
                    const wasNew = !prev[finalItem.texture];
                    setIsNewItem(wasNew);
                    const updated = { ...prev, [finalItem.texture]: (prev[finalItem.texture] || 0) + 1 };
                    saveCollection(updated);
                    return updated;
                });
            }
        };

        animationRef.current = requestAnimationFrame(animate);
    };

    const reset = () => {
        setState('idle');
        setResult(null);
        setOffset(0);
        setStrip([]);
        setIsNewItem(false);
    };

    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // Idle state - show clickable wheel card
    if (state === 'idle') {
        const collectedCount = Object.keys(collection).length;
        const totalItemCount = allItems.length + TEAM_MEMBERS.length + 1; // +1 for mythic

        return (
            <div style={{
                marginTop: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
            }}>
                <button
                    onClick={spin}
                    disabled={loading || allItems.length === 0}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        cursor: loading ? 'wait' : 'pointer',
                        transition: 'transform 0.3s, filter 0.3s',
                        filter: 'drop-shadow(0 8px 24px rgba(255, 170, 0, 0.3))',
                        opacity: loading ? 0.5 : 1
                    }}
                    onMouseEnter={e => {
                        if (!loading) {
                            e.currentTarget.style.transform = 'scale(1.05) translateY(-4px)';
                            e.currentTarget.style.filter = 'drop-shadow(0 12px 32px rgba(255, 170, 0, 0.5))';
                        }
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'scale(1) translateY(0)';
                        e.currentTarget.style.filter = 'drop-shadow(0 8px 24px rgba(255, 170, 0, 0.3))';
                    }}
                >
                    <img
                        src={WHEEL_TEXTURE_URL}
                        alt="Wheel of Fortune"
                        style={{
                            width: '140px',
                            height: 'auto',
                            imageRendering: 'pixelated'
                        }}
                    />
                </button>

                <div style={{
                    textAlign: 'center'
                }}>
                    <div style={{
                        color: COLORS.gold,
                        fontSize: '16px',
                        fontWeight: '600',
                        marginBottom: '4px'
                    }}>
                        {loading ? 'Loading items...' : 'Click to spin!'}
                    </div>
                    <div style={{
                        color: COLORS.textMuted,
                        fontSize: '12px'
                    }}>
                        {loading ? 'Fetching item pool...' : `Win any item from ${totalItemCount} possibilities`}
                    </div>
                </div>

                {/* Collection Book Button */}
                {!loading && (
                    <button
                        onClick={() => setShowCollection(true)}
                        style={{
                            marginTop: '8px',
                            padding: '10px 20px',
                            background: COLORS.bgLight,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '8px',
                            color: COLORS.text,
                            fontSize: '13px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = COLORS.gold;
                            e.currentTarget.style.background = COLORS.bgLighter;
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = COLORS.border;
                            e.currentTarget.style.background = COLORS.bgLight;
                        }}
                    >
                        <span>📖</span>
                        Collection
                        <span style={{
                            background: collectedCount > 0 ? COLORS.gold : COLORS.bgLighter,
                            color: collectedCount > 0 ? COLORS.bg : COLORS.textMuted,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: '600'
                        }}>
                            {collectedCount}/{totalItemCount}
                        </span>
                    </button>
                )}

                {/* Collection Book Modal */}
                {showCollection && (
                    <CollectionBook
                        allItems={allItems}
                        collection={collection}
                        onClose={() => setShowCollection(false)}
                    />
                )}
            </div>
        );
    }

    // Spinning or Result state
    return (
        <div style={{
            background: COLORS.bgLight,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '12px',
            padding: '24px',
            marginTop: '20px'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                        src={WHEEL_TEXTURE_URL}
                        alt="Wheel of Fortune"
                        style={{
                            width: '32px',
                            height: 'auto',
                            imageRendering: 'pixelated',
                            animation: state === 'spinning' ? 'wheelSpin 0.5s linear infinite' : 'none'
                        }}
                    />
                    <span style={{
                        color: COLORS.gold,
                        fontSize: '18px',
                        fontWeight: '600'
                    }}>
                        {state === 'spinning' ? 'Spinning...' : 'Gamba!'}
                    </span>
                </div>

                {state === 'result' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setShowCollection(true)}
                            style={{
                                padding: '8px 12px',
                                background: 'transparent',
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: '6px',
                                color: COLORS.textMuted,
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = COLORS.gold;
                                e.currentTarget.style.color = COLORS.text;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = COLORS.border;
                                e.currentTarget.style.color = COLORS.textMuted;
                            }}
                        >
                            📖
                        </button>
                        <button
                            onClick={spin}
                            style={{
                                padding: '8px 16px',
                                background: 'transparent',
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: '6px',
                                color: COLORS.textMuted,
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = COLORS.gold;
                                e.currentTarget.style.color = COLORS.text;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = COLORS.border;
                                e.currentTarget.style.color = COLORS.textMuted;
                            }}
                        >
                            ↻ Try Again
                        </button>
                    </div>
                )}
            </div>

            {/* Spinner Container */}
            <div style={{
                position: 'relative',
                height: isMobile ? '280px' : '100px',
                width: isMobile ? '100px' : '100%',
                overflow: 'hidden',
                borderRadius: '8px',
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
                margin: isMobile ? '0 auto' : '0'
            }}>
                {/* Center Indicator */}
                <div style={{
                    position: 'absolute',
                    ...(isMobile ? {
                        left: 0,
                        right: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        height: '3px',
                    } : {
                        top: 0,
                        bottom: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '3px',
                    }),
                    background: COLORS.gold,
                    zIndex: 10,
                    boxShadow: `0 0 16px ${COLORS.gold}88`
                }} />

                {/* Pointer */}
                <div style={{
                    position: 'absolute',
                    ...(isMobile ? {
                        left: '-2px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 0,
                        height: 0,
                        borderTop: '8px solid transparent',
                        borderBottom: '8px solid transparent',
                        borderLeft: `12px solid ${COLORS.gold}`,
                    } : {
                        top: '-2px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderTop: `12px solid ${COLORS.gold}`,
                    }),
                    zIndex: 11,
                    filter: `drop-shadow(0 2px 4px ${COLORS.gold}66)`
                }} />

                {/* Edge fade gradients */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: isMobile
                        ? `linear-gradient(180deg, ${COLORS.bg} 0%, transparent 20%, transparent 80%, ${COLORS.bg} 100%)`
                        : `linear-gradient(90deg, ${COLORS.bg} 0%, transparent 15%, transparent 85%, ${COLORS.bg} 100%)`,
                    zIndex: 5,
                    pointerEvents: 'none'
                }} />

                {/* Item Strip */}
                <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: 'center',
                    ...(isMobile ? {
                        width: '100%',
                        transform: `translateY(calc(50% - ${offset}px - ${ITEM_WIDTH / 2}px))`
                    } : {
                        height: '100%',
                        transform: `translateX(calc(50% - ${offset}px - ${ITEM_WIDTH / 2}px))`
                    })
                }}>
                    {strip.map((item, idx) => {
                        const isSpecial = isSpecialItem(item);
                        const isMythic = isMythicItem(item);
                        const isWinningItem = idx === FINAL_INDEX && state === 'result';

                        return (
                            <div
                                key={idx}
                                style={{
                                    width: isMobile ? '80px' : `${ITEM_WIDTH}px`,
                                    height: isMobile ? `${ITEM_WIDTH}px` : '80px',
                                    flexShrink: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    ...(isMobile
                                            ? { borderBottom: `1px solid ${COLORS.border}33` }
                                            : { borderRight: `1px solid ${COLORS.border}33` }
                                    )
                                }}
                            >
                                <div style={{
                                    width: '52px',
                                    height: '52px',
                                    background: isMythic
                                        ? `linear-gradient(135deg, ${COLORS.aqua}44, ${COLORS.purple}44, ${COLORS.gold}44)`
                                        : isSpecial
                                            ? `linear-gradient(135deg, ${COLORS.purple}44, ${COLORS.gold}44)`
                                            : COLORS.bgLight,
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: `2px solid ${
                                        isWinningItem ? COLORS.gold
                                            : isMythic ? COLORS.aqua
                                                : isSpecial ? COLORS.purple
                                                    : COLORS.border
                                    }`,
                                    boxShadow: isMythic
                                        ? `0 0 20px ${COLORS.aqua}aa, 0 0 40px ${COLORS.purple}44`
                                        : isSpecial
                                            ? `0 0 15px ${COLORS.purple}88, 0 0 30px ${COLORS.purple}44`
                                            : isWinningItem
                                                ? `0 0 20px ${COLORS.gold}66`
                                                : 'none',
                                    transition: 'all 0.3s',
                                    animation: isMythic ? 'mythicGlow 1s ease-in-out infinite' : isSpecial ? 'specialGlow 1.5s ease-in-out infinite' : 'none'
                                }}>
                                    <img
                                        src={isMythic ? item.imageUrl : isSpecial ? getMinecraftHeadUrl(item.username) : `${IMAGE_BASE_URL}/${item.texture}.png`}
                                        alt={item.name}
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            imageRendering: isSpecial ? 'auto' : 'pixelated',
                                            borderRadius: isSpecial ? '4px' : '0'
                                        }}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = `${IMAGE_BASE_URL}/barrier.png`;
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Result Display */}
            {state === 'result' && result && (
                <div style={{
                    marginTop: '24px',
                    padding: '32px 24px',
                    background: isMythicItem(result)
                        ? `radial-gradient(ellipse at center, ${COLORS.aqua}15 0%, ${COLORS.purple}10 50%, ${COLORS.bg} 70%)`
                        : isSpecialItem(result)
                            ? `radial-gradient(ellipse at center, ${COLORS.purple}22 0%, ${COLORS.bg} 70%)`
                            : `radial-gradient(ellipse at center, ${COLORS.bgLighter} 0%, ${COLORS.bg} 70%)`,
                    borderRadius: '12px',
                    border: `1px solid ${isMythicItem(result) ? COLORS.aqua + '66' : isSpecialItem(result) ? COLORS.purple + '66' : COLORS.gold + '44'}`,
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Floating particles */}
                    {[...Array(isMythicItem(result) ? 20 : 12)].map((_, i) => (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                width: isMythicItem(result) ? '8px' : '6px',
                                height: isMythicItem(result) ? '8px' : '6px',
                                background: isMythicItem(result)
                                    ? (i % 3 === 0 ? COLORS.aqua : i % 3 === 1 ? COLORS.purple : COLORS.gold)
                                    : isSpecialItem(result) ? COLORS.purple : COLORS.gold,
                                borderRadius: '50%',
                                left: `${10 + Math.random() * 80}%`,
                                top: '80%',
                                opacity: 0,
                                animation: `floatParticle ${isMythicItem(result) ? '1.5s' : '2s'} ease-out ${i * 0.1}s infinite`,
                                boxShadow: `0 0 6px ${isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : COLORS.gold}`
                            }}
                        />
                    ))}

                    <div style={{
                        color: COLORS.textMuted,
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '3px',
                        marginBottom: '20px',
                        position: 'relative',
                        zIndex: 1,
                        animation: 'fadeSlideDown 0.5s ease-out',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                    }}>
                        {isMythicItem(result) ? (
                            <span style={{
                                background: `linear-gradient(135deg, ${COLORS.aqua}, ${COLORS.purple}, ${COLORS.gold})`,
                                color: '#fff',
                                fontSize: '9px',
                                fontWeight: '700',
                                padding: '4px 12px',
                                borderRadius: '4px',
                                animation: 'mythicBadge 2s ease-in-out infinite',
                                textShadow: '0 0 10px rgba(0,0,0,0.5)'
                            }}>
                                ✦ MYTHIC ✦
                            </span>
                        ) : isSpecialItem(result) ? (
                            <span style={{
                                background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.gold})`,
                                color: '#fff',
                                fontSize: '9px',
                                fontWeight: '700',
                                padding: '3px 10px',
                                borderRadius: '4px',
                                animation: 'newBadgePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both'
                            }}>
                                ★ LEGENDARY
                            </span>
                        ) : isNewItem && (
                            <span style={{
                                background: COLORS.green,
                                color: COLORS.bg,
                                fontSize: '9px',
                                fontWeight: '700',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                animation: 'newBadgePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both'
                            }}>
                                NEW
                            </span>
                        )}
                        You received
                    </div>

                    <div style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: isMobile ? '16px' : '24px',
                        position: 'relative',
                        zIndex: 1
                    }}>
                        {/* Item container with glow */}
                        <div style={{
                            position: 'relative',
                            animation: 'itemReveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }}>
                            {/* Pulsing glow ring */}
                            <div style={{
                                position: 'absolute',
                                top: '-10px',
                                left: '-10px',
                                right: '-10px',
                                bottom: '-10px',
                                borderRadius: '16px',
                                background: isMythicItem(result)
                                    ? `radial-gradient(circle, ${COLORS.aqua}44 0%, ${COLORS.purple}22 50%, transparent 70%)`
                                    : `radial-gradient(circle, ${isSpecialItem(result) ? COLORS.purple : COLORS.gold}33 0%, transparent 70%)`,
                                animation: 'pulseGlow 1.5s ease-in-out infinite'
                            }} />

                            <div style={{
                                width: '80px',
                                height: '80px',
                                background: isMythicItem(result)
                                    ? `linear-gradient(135deg, ${COLORS.aqua}33, ${COLORS.purple}33, ${COLORS.gold}33)`
                                    : isSpecialItem(result)
                                        ? `linear-gradient(135deg, ${COLORS.purple}33, ${COLORS.gold}33)`
                                        : COLORS.bgLight,
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `3px solid ${isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : COLORS.gold}`,
                                boxShadow: isMythicItem(result)
                                    ? `0 0 30px ${COLORS.aqua}66, 0 0 60px ${COLORS.purple}44, 0 0 90px ${COLORS.gold}22`
                                    : isSpecialItem(result)
                                        ? `0 0 30px ${COLORS.purple}66, 0 0 60px ${COLORS.purple}33, 0 0 90px ${COLORS.gold}22`
                                        : `0 0 30px ${COLORS.gold}44, 0 0 60px ${COLORS.gold}22, inset 0 0 20px ${COLORS.gold}11`,
                                position: 'relative',
                                animation: isMythicItem(result) ? 'mythicGlow 1s ease-in-out infinite' : isSpecialItem(result) ? 'specialGlow 1.5s ease-in-out infinite' : 'none'
                            }}>
                                <img
                                    src={isMythicItem(result) ? result.imageUrl : isSpecialItem(result) ? getMinecraftHeadUrl(result.username) : `${IMAGE_BASE_URL}/${result.texture}.png`}
                                    alt={result.name}
                                    style={{
                                        width: '56px',
                                        height: '56px',
                                        imageRendering: isSpecialItem(result) ? 'auto' : 'pixelated',
                                        borderRadius: isSpecialItem(result) ? '6px' : '0',
                                        animation: 'itemBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        filter: `drop-shadow(0 0 8px ${isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : 'rgba(255, 170, 0, 0.5)'})`
                                    }}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = `${IMAGE_BASE_URL}/barrier.png`;
                                    }}
                                />
                            </div>

                            {/* Sparkle effects */}
                            {[...Array(isMythicItem(result) ? 8 : 4)].map((_, i) => (
                                <div
                                    key={i}
                                    style={{
                                        position: 'absolute',
                                        width: '8px',
                                        height: '8px',
                                        top: ['0%', '10%', '80%', '70%', '20%', '60%', '40%', '90%'][i],
                                        left: ['10%', '85%', '5%', '90%', '0%', '95%', '100%', '50%'][i],
                                        animation: `sparkle 1s ease-in-out ${i * 0.15}s infinite`
                                    }}
                                >
                                    <div style={{
                                        width: '100%',
                                        height: '2px',
                                        background: isMythicItem(result)
                                            ? (i % 3 === 0 ? COLORS.aqua : i % 3 === 1 ? COLORS.purple : COLORS.gold)
                                            : isSpecialItem(result) ? COLORS.purple : COLORS.gold,
                                        position: 'absolute',
                                        top: '50%',
                                        left: '0',
                                        transform: 'translateY(-50%)',
                                        borderRadius: '1px',
                                        boxShadow: `0 0 4px ${isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : COLORS.gold}`
                                    }} />
                                    <div style={{
                                        width: '2px',
                                        height: '100%',
                                        background: isMythicItem(result)
                                            ? (i % 3 === 0 ? COLORS.aqua : i % 3 === 1 ? COLORS.purple : COLORS.gold)
                                            : isSpecialItem(result) ? COLORS.purple : COLORS.gold,
                                        position: 'absolute',
                                        top: '0',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        borderRadius: '1px',
                                        boxShadow: `0 0 4px ${isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : COLORS.gold}`
                                    }} />
                                </div>
                            ))}
                        </div>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMobile ? 'center' : 'flex-start',
                            gap: '4px',
                            animation: 'textReveal 0.6s ease-out 0.2s both',
                            textAlign: isMobile ? 'center' : 'left'
                        }}>
                            <span style={{
                                color: isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : COLORS.gold,
                                fontSize: '24px',
                                fontWeight: '600',
                                textShadow: `0 0 20px ${isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : COLORS.gold}44`
                            }}>
                                {result.name}
                            </span>

                            {(isMythicItem(result) || isSpecialItem(result)) ? (
                                <span style={{
                                    fontSize: '11px',
                                    color: isMythicItem(result) ? COLORS.aqua : COLORS.purple,
                                    fontWeight: '600',
                                    background: `${isMythicItem(result) ? COLORS.aqua : COLORS.purple}22`,
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    marginTop: '4px'
                                }}>
                                    {formatChance(result.chance)}% drop rate
                                </span>
                            ) : !isNewItem && collection[result.texture] > 1 && (
                                <span style={{
                                    fontSize: '12px',
                                    color: COLORS.textMuted,
                                    fontWeight: '500'
                                }}>
                                    ×{collection[result.texture]} in collection
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes wheelSpin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes itemReveal {
                    0% { transform: scale(0) rotate(-20deg); opacity: 0; }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                @keyframes itemBounce {
                    0% { transform: scale(0); }
                    50% { transform: scale(1.2); }
                    75% { transform: scale(0.9); }
                    100% { transform: scale(1); }
                }
                @keyframes pulseGlow {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(1.1); }
                }
                @keyframes sparkle {
                    0%, 100% { opacity: 0; transform: scale(0.5); }
                    50% { opacity: 1; transform: scale(1); }
                }
                @keyframes floatParticle {
                    0% { transform: translateY(0) scale(1); opacity: 0; }
                    10% { opacity: 1; }
                    100% { transform: translateY(-100px) scale(0); opacity: 0; }
                }
                @keyframes fadeSlideDown {
                    0% { opacity: 0; transform: translateY(-10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes textReveal {
                    0% { opacity: 0; transform: translateX(-20px); }
                    100% { opacity: 1; transform: translateX(0); }
                }
                @keyframes newBadgePop {
                    0% { opacity: 0; transform: scale(0); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes specialGlow {
                    0%, 100% { 
                        box-shadow: 0 0 15px ${COLORS.purple}88, 0 0 30px ${COLORS.purple}44;
                        border-color: ${COLORS.purple};
                    }
                    50% { 
                        box-shadow: 0 0 25px ${COLORS.purple}aa, 0 0 50px ${COLORS.gold}44;
                        border-color: ${COLORS.gold};
                    }
                }
                @keyframes mythicGlow {
                    0%, 100% { 
                        box-shadow: 0 0 20px ${COLORS.aqua}aa, 0 0 40px ${COLORS.purple}44;
                        border-color: ${COLORS.aqua};
                    }
                    33% { 
                        box-shadow: 0 0 25px ${COLORS.purple}aa, 0 0 50px ${COLORS.gold}44;
                        border-color: ${COLORS.purple};
                    }
                    66% { 
                        box-shadow: 0 0 25px ${COLORS.gold}aa, 0 0 50px ${COLORS.aqua}44;
                        border-color: ${COLORS.gold};
                    }
                }
                @keyframes mythicBadge {
                    0%, 100% { 
                        background: linear-gradient(135deg, ${COLORS.aqua}, ${COLORS.purple}, ${COLORS.gold});
                    }
                    33% { 
                        background: linear-gradient(135deg, ${COLORS.purple}, ${COLORS.gold}, ${COLORS.aqua});
                    }
                    66% { 
                        background: linear-gradient(135deg, ${COLORS.gold}, ${COLORS.aqua}, ${COLORS.purple});
                    }
                }
            `}</style>

            {/* Collection Book Modal */}
            {showCollection && (
                <CollectionBook
                    allItems={allItems}
                    collection={collection}
                    onClose={() => setShowCollection(false)}
                />
            )}
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

                    <WheelOfFortune />
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