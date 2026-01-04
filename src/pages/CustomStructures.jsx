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

/**
 * Render a responsive row of colored navigation buttons that scroll the page to the specified section when clicked.
 * @param {Array<{id: string, label: string, color: string}>} links - Array of link descriptors where `id` is the target element id to scroll to, `label` is the button text, and `color` is a CSS color used for the button styling.
 * @returns {JSX.Element} A container element with styled buttons for each link that perform smooth in-page scrolling.
 */
function QuickLinks({ links }) {
    const scrollTo = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            justifyContent: 'center',
            marginTop: '36px'
        }}>
            {links.map(link => (
                <button
                    key={link.id}
                    onClick={() => scrollTo(link.id)}
                    style={{
                        background: `${link.color}11`,
                        border: `1.5px solid ${link.color}44`,
                        borderRadius: '22px',
                        padding: '8px 16px',
                        color: COLORS.text,
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        letterSpacing: '0.3px'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.borderColor = link.color;
                        e.currentTarget.style.background = `${link.color}22`;
                        e.currentTarget.style.boxShadow = `0 4px 16px ${link.color}33, inset 0 1px 0 ${link.color}22`;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.borderColor = `${link.color}44`;
                        e.currentTarget.style.background = `${link.color}11`;
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: link.color,
                        boxShadow: `0 0 8px ${link.color}`
                    }} />
                    {link.label}
                </button>
            ))}
        </div>
    );
}

/**
 * Render a two-option toggle control for switching between Standard and Hard Mode.
 *
 * @param {Object} props
 * @param {boolean} props.isHard - Whether Hard Mode is currently active.
 * @param {() => void} props.onToggle - Callback invoked when the toggle is clicked.
 * @returns {JSX.Element} A React element representing the recipe difficulty toggle.
 */
function RecipeToggle({ isHard, onToggle }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '28px',
            padding: '14px 18px',
            background: COLORS.bgLighter,
            borderRadius: '10px',
            border: `1px solid ${COLORS.border}44`,
            width: 'fit-content',
            transition: 'all 0.3s ease'
        }}>
            <span style={{
                fontSize: '13px',
                color: !isHard ? COLORS.text : COLORS.textMuted,
                fontWeight: !isHard ? '600' : '400',
                transition: 'all 0.3s ease',
                letterSpacing: '0.2px'
            }}>
                Standard
            </span>
            <button
                onClick={onToggle}
                style={{
                    width: '54px',
                    height: '28px',
                    borderRadius: '14px',
                    border: 'none',
                    background: isHard ? COLORS.orange : COLORS.border,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    boxShadow: `0 2px 8px ${isHard ? COLORS.orange : COLORS.border}44`
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = `0 4px 16px ${isHard ? COLORS.orange : COLORS.border}66`;
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = `0 2px 8px ${isHard ? COLORS.orange : COLORS.border}44`;
                }}
            >
                <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: COLORS.text,
                    position: 'absolute',
                    top: '3px',
                    left: isHard ? '29px' : '3px',
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    boxShadow: `0 2px 6px ${isHard ? COLORS.orange : COLORS.text}44`
                }} />
            </button>
            <span style={{
                fontSize: '13px',
                color: isHard ? COLORS.orange : COLORS.textMuted,
                fontWeight: isHard ? '600' : '400',
                transition: 'all 0.3s ease',
                letterSpacing: '0.2px'
            }}>
                Hard Mode
            </span>
        </div>
    );
}

/**
 * Renders a 3×3 crafting grid alongside an arrow and a highlighted result slot.
 *
 * Renders the provided recipe grid as nine slots (left-to-right, top-to-bottom), showing item textures where present, then an arrow and a result tile with a label. Visual emphasis (glow/hover effects) is driven by the supplied glow color.
 *
 * @param {{recipe: (string|null)[][], result: string, resultName: string, glowColor?: string}} props
 * @param {(string|null)[][]} props.recipe - A 3×3 array of item texture keys (e.g., "diamond_sword") or falsy values for empty slots.
 * @param {string} props.result - Texture key for the resulting item.
 * @param {string} props.resultName - Display name for the result tile.
 * @param {string} [props.glowColor=COLORS.gold] - Hex color used for the result and slot glow accents.
 * @returns {JSX.Element} The crafting grid and result UI element.
 */
function CraftingGrid({ recipe, result, resultName, glowColor = COLORS.gold }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            flexWrap: 'wrap'
        }}>
            {/* Crafting grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 58px)',
                gap: '6px',
                padding: '14px',
                background: `linear-gradient(135deg, ${COLORS.bgLighter} 0%, ${COLORS.bgLight} 100%)`,
                borderRadius: '10px',
                border: `1px solid ${COLORS.border}44`,
                boxShadow: `0 4px 16px ${glowColor}22, inset 0 1px 0 ${glowColor}11`
            }}>
                {recipe.flat().map((item, idx) => (
                    <div
                        key={idx}
                        style={{
                            width: '58px',
                            height: '58px',
                            background: COLORS.bgLight,
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            cursor: item ? 'pointer' : 'default',
                            border: `1px solid ${item ? glowColor + '33' : COLORS.border}44`,
                            position: 'relative'
                        }}
                        onMouseEnter={e => {
                            if (item) {
                                e.currentTarget.style.transform = 'scale(1.12)';
                                e.currentTarget.style.background = COLORS.bgLighter;
                                e.currentTarget.style.boxShadow = `0 0 16px ${glowColor}44`;
                                e.currentTarget.style.borderColor = glowColor;
                            }
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.background = COLORS.bgLight;
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = `${item ? glowColor + '33' : COLORS.border}44`;
                        }}
                    >
                        {item && (
                            <img
                                src={`${IMAGE_BASE_URL}/${item}.png`}
                                alt={item}
                                title={item.replace(/_/g, ' ')}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    imageRendering: 'pixelated'
                                }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Arrow and result */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '18px'
            }}>
                <div style={{
                    color: glowColor,
                    fontSize: '32px',
                    transition: 'all 0.3s ease',
                    textShadow: `0 0 10px ${glowColor}44`
                }}>→</div>

                <div style={{
                    width: '70px',
                    height: '70px',
                    background: `linear-gradient(135deg, ${COLORS.bgLighter} 0%, ${COLORS.bgLight} 100%)`,
                    borderRadius: '10px',
                    border: `2px solid ${glowColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 24px ${glowColor}55, 0 0 48px ${glowColor}22, inset 0 1px 0 ${glowColor}22`,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                }}
                     onMouseEnter={e => {
                         e.currentTarget.style.transform = 'scale(1.08)';
                         e.currentTarget.style.boxShadow = `0 0 32px ${glowColor}77, 0 0 64px ${glowColor}33, inset 0 1px 0 ${glowColor}22`;
                     }}
                     onMouseLeave={e => {
                         e.currentTarget.style.transform = 'scale(1)';
                         e.currentTarget.style.boxShadow = `0 0 24px ${glowColor}55, 0 0 48px ${glowColor}22, inset 0 1px 0 ${glowColor}22`;
                     }}>
                    <img
                        src={`${IMAGE_BASE_URL}/${result}.png`}
                        alt={resultName}
                        style={{
                            width: '48px',
                            height: '48px',
                            imageRendering: 'pixelated'
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                </div>
                <span style={{
                    color: COLORS.text,
                    fontSize: '16px',
                    fontWeight: '600',
                    letterSpacing: '0.3px'
                }}>
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

/**
 * Render a summary view of simulated loot, grouping identical items, showing counts, rarity cues, and a reroll control.
 *
 * Displays grouped loot items with a small icon, a count badge when an item appears multiple times, and visual styling that highlights rare and legendary items. If no items are present, shows an empty-chest message. Includes a button that invokes the provided reroll callback.
 *
 * @param {Object} props
 * @param {Array<{name: string, texture: string, chance: string|number, legendary?: boolean}>} props.items - Array of loot items produced by a simulation; items with the same `name` are aggregated and counted.
 * @param {() => void} props.onReroll - Callback invoked when the user requests another loot roll.
 * @param {string} props.roomColor - Hex or CSS color used to tint borders, shadows, and the reroll button for the current room.
 * @returns {JSX.Element} The rendered loot result component.
 */
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
            marginTop: '28px',
            padding: '24px',
            background: `linear-gradient(135deg, ${COLORS.bg}99 0%, ${COLORS.bgLight}44 100%)`,
            borderRadius: '12px',
            border: `1px solid ${roomColor}44`,
            boxShadow: `0 8px 24px ${roomColor}11, inset 0 1px 0 ${roomColor}22`
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
            }}>
                <span style={{
                    color: COLORS.text,
                    fontSize: '15px',
                    fontWeight: '600',
                    letterSpacing: '0.2px'
                }}>
                    Loot Result ({items.length} item{items.length !== 1 ? 's' : ''})
                </span>
                <button
                    onClick={onReroll}
                    style={{
                        padding: '8px 14px',
                        background: `${roomColor}11`,
                        border: `1px solid ${roomColor}44`,
                        borderRadius: '6px',
                        color: COLORS.text,
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.3s ease',
                        letterSpacing: '0.1px'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.borderColor = roomColor;
                        e.currentTarget.style.background = `${roomColor}22`;
                        e.currentTarget.style.boxShadow = `0 4px 12px ${roomColor}33`;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.borderColor = `${roomColor}44`;
                        e.currentTarget.style.background = `${roomColor}11`;
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
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

/**
 * Render an interactive loot-table UI that lets the user switch rooms, open a chest, and view simulated loot results.
 *
 * Renders room selector tabs, a chest button that triggers a brief opening animation, the selected room's pools and items, and a grouped simulation result when a chest is opened. Opening the chest clears previous results, waits ~300ms for the animation, then calls `simulateLoot` for the active table and displays the returned items. Changing rooms clears any current simulation.
 *
 * @param {Object.<string, {name: string, color: string, description: string, pools: Array}>} tables - Mapping of room keys to loot table definitions. Each table is expected to include `name`, `color`, `description`, and `pools` (each pool contains `rolls`, optional `note`, and `items`).
 * @returns {JSX.Element} The LootTableDisplay component UI.
 */
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
                gap: '10px',
                marginBottom: '28px',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                {Object.entries(tables).map(([key, t]) => (
                    <button
                        key={key}
                        onClick={() => handleRoomChange(key)}
                        style={{
                            padding: '12px 22px',
                            background: activeRoom === key ? `${t.color}22` : 'transparent',
                            border: `2px solid ${activeRoom === key ? t.color : COLORS.border}44`,
                            borderRadius: '10px',
                            color: activeRoom === key ? t.color : COLORS.textMuted,
                            fontSize: '14px',
                            fontWeight: activeRoom === key ? '600' : '500',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            letterSpacing: '0.2px',
                            boxShadow: activeRoom === key ? `0 0 16px ${t.color}22, inset 0 1px 0 ${t.color}22` : 'none'
                        }}
                        onMouseEnter={e => {
                            if (activeRoom !== key) {
                                e.currentTarget.style.borderColor = t.color;
                                e.currentTarget.style.boxShadow = `0 4px 12px ${t.color}33`;
                            }
                        }}
                        onMouseLeave={e => {
                            if (activeRoom !== key) {
                                e.currentTarget.style.borderColor = COLORS.border + '44';
                                e.currentTarget.style.boxShadow = 'none';
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
                        padding: '12px 18px',
                        background: isAnimating ? COLORS.bgLighter : `${table.color}22`,
                        border: `2px solid ${table.color}`,
                        borderRadius: '10px',
                        color: table.color,
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: isAnimating ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.3s ease',
                        transform: isAnimating ? 'scale(0.95)' : 'scale(1)',
                        boxShadow: `0 0 16px ${table.color}22, inset 0 1px 0 ${table.color}11`,
                        letterSpacing: '0.2px'
                    }}
                    onMouseEnter={e => {
                        if (!isAnimating) {
                            e.currentTarget.style.background = `${table.color}33`;
                            e.currentTarget.style.boxShadow = `0 6px 20px ${table.color}44, inset 0 1px 0 ${table.color}22`;
                        }
                    }}
                    onMouseLeave={e => {
                        if (!isAnimating) {
                            e.currentTarget.style.background = `${table.color}22`;
                            e.currentTarget.style.boxShadow = `0 0 16px ${table.color}22, inset 0 1px 0 ${table.color}11`;
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
                background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bgLighter}88 100%)`,
                border: `2px solid ${table.color}44`,
                borderRadius: '14px',
                padding: '28px',
                position: 'relative',
                boxShadow: `0 8px 32px ${table.color}11, inset 0 1px 0 ${table.color}22`
            }}>
                {/* Room header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '24px',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div>
                        <h3 style={{
                            margin: 0,
                            fontSize: '22px',
                            fontWeight: '700',
                            color: table.color,
                            letterSpacing: '0.3px'
                        }}>
                            {table.name}
                        </h3>
                        <p style={{
                            margin: '6px 0 0',
                            fontSize: '13px',
                            color: COLORS.textMuted,
                            letterSpacing: '0.2px'
                        }}>
                            {table.description}
                        </p>
                    </div>
                </div>

                {/* Pools */}
                {table.pools.map((pool, poolIdx) => (
                    <div key={poolIdx} style={{ marginBottom: poolIdx < table.pools.length - 1 ? '32px' : 0 }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '18px'
                        }}>
                            <span style={{
                                background: `linear-gradient(135deg, ${table.color}44 0%, ${table.color}22 100%)`,
                                color: table.color,
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '700',
                                border: `1px solid ${table.color}55`,
                                letterSpacing: '0.2px',
                                textShadow: `0 0 4px ${table.color}33`
                            }}>
                                {pool.rolls}
                            </span>
                            {pool.note && (
                                <span style={{
                                    color: COLORS.textMuted,
                                    fontSize: '12px',
                                    fontStyle: 'italic',
                                    letterSpacing: '0.1px'
                                }}>
                                    {pool.note}
                                </span>
                            )}
                        </div>

                        {/* Item grid */}
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '14px'
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


/**
 * Render a page section with a colored accent header and provided content.
 *
 * @param {Object} props - Component props.
 * @param {string} props.id - The HTML id used for in-page navigation and linking.
 * @param {string} props.title - The heading text displayed in the section header.
 * @param {string} props.color - CSS color string used for the header accent and border.
 * @param {import('react').ReactNode} props.children - Content to render inside the section.
 * @returns {import('react').ReactElement} A section element containing a styled header and the supplied children.
 */
function Section({ id, title, color, children }) {
    return (
        <section id={id} style={{ marginBottom: '72px', scrollMarginTop: '80px' }}>
            <h2 style={{
                fontSize: '24px',
                fontWeight: '600',
                color: COLORS.text,
                margin: '0 0 28px 0',
                paddingBottom: '16px',
                borderBottom: `1px solid ${color}44`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                letterSpacing: '0.3px'
            }}>
                <span style={{
                    width: '5px',
                    height: '28px',
                    background: `linear-gradient(180deg, ${color}, ${color}66)`,
                    borderRadius: '2px',
                    boxShadow: `0 0 12px ${color}66`
                }} />
                {title}
            </h2>
            {children}
        </section>
    );
}

/**
 * Render a styled paragraph for body text with muted color, increased line height, and spacing.
 *
 * @returns {JSX.Element} A `<p>` element containing the provided `children`, styled as muted body text with a 15px font size, 1.9 line-height, and 18px bottom margin.
 */
function Paragraph({ children }) {
    return (
        <p style={{
            color: COLORS.textMuted,
            fontSize: '15px',
            lineHeight: '1.9',
            margin: '0 0 18px 0',
            letterSpacing: '0.2px'
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
    { id: 'wandering-trader', label: 'Wandering Trader', color: COLORS.aqua },
];

/**
 * Render the "Custom Content" page that showcases custom structures, crafting recipes, loot tables, and interactive controls.
 *
 * The component manages local UI state for "hard mode" toggles, reads an optional `?to=` URL parameter to auto-scroll to a section on mount, and composes the page from themed sections (Antimatter Depths, Trial Chambers Locator, Locator Mechanics, Loot Tables, Custom End Generation, Antimatter Teleporter, Custom Wandering Trader), plus header, footer, decorative background, and interactive subcomponents (QuickLinks, RecipeToggle, CraftingGrid, LootTableDisplay).
 *
 * @returns {import('react').ReactElement} The themed page layout as a React element.
 */
export default function CustomStructures() {
    const [antimatterHard, setAntimatterHard] = useState(false);
    const [trialHard, setTrialHard] = useState(false);

    // Scroll to section if ?to=wheel (or other section) is in URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const scrollTo = params.get('to');
        if (scrollTo) {
            const element = document.getElementById(scrollTo);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 300);
            }
        }
    }, []);

    return (
        <div style={{
            minHeight: '100vh',
            background: `linear-gradient(180deg, ${COLORS.bg} 0%, #0f0f1a 100%)`,
            color: COLORS.text,
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
        }}>
            {/* Decorative background elements */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                zIndex: 0
            }}>
                <div style={{
                    position: 'absolute',
                    top: '15%',
                    left: '10%',
                    width: '350px',
                    height: '350px',
                    background: `radial-gradient(circle, ${COLORS.purple}06 0%, transparent 70%)`,
                    borderRadius: '50%'
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '25%',
                    right: '8%',
                    width: '400px',
                    height: '400px',
                    background: `radial-gradient(circle, ${COLORS.accent}05 0%, transparent 70%)`,
                    borderRadius: '50%'
                }} />
            </div>

            {/* Content wrapper */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* Header */}
                <div style={{
                    padding: '80px 20px 56px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${COLORS.border}44`
                }}>
                    <h1 style={{
                        fontSize: '40px',
                        fontWeight: '300',
                        margin: '0 0 20px 0',
                        letterSpacing: '-0.5px',
                        lineHeight: '1.2'
                    }}>
                        Custom Content
                    </h1>
                    <p style={{
                        fontSize: '17px',
                        color: COLORS.textMuted,
                        margin: 0,
                        maxWidth: '600px',
                        marginLeft: 'auto',
                        marginRight: 'auto',
                        letterSpacing: '0.2px',
                        lineHeight: '1.6'
                    }}>
                        Custom items and world generation designed for faster-paced gameplay
                    </p>

                    <QuickLinks links={QUICK_LINKS} />
                </div>

                {/* Content */}
                <div style={{
                    maxWidth: '800px',
                    margin: '0 auto',
                    padding: '64px 20px',
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
                            contains a <a href="#wheel" style={{ color: COLORS.gold }}>Wheel of Fortune</a> - a special item
                            that grants one random item when used. Try your luck on the <a href="#wheel" style={{ color: COLORS.gold }}>Wheel page</a>!
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
                            Additionally, the trader sells a <a href="#wheel" style={{ color: COLORS.gold }}>Wheel of Fortune</a> for
                            1 Emerald (limited to one per player per trader).
                        </Paragraph>

                    </Section>
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
        </div>
    );
}