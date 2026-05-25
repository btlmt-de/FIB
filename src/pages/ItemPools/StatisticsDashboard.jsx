import React, { useState, useEffect, useMemo, useCallback } from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import { COLORS as C } from '../../config/constants';

const SD_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800;900&display=swap');
  @keyframes sd-in   { from { opacity:0; transform:scale(0.97) translateY(8px); } to { opacity:1; transform:none; } }
  @keyframes sd-spin { to { transform: rotate(360deg); } }

  .sd { font-family: 'Barlow', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  .sd-overlay {
    position: fixed; inset: 0;
    background: oklch(6% 0.022 255 / 0.88);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: 20px;
  }
  .sd-panel {
    background: oklch(17% 0.025 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 10px;
    width: 100%; max-width: 1000px; max-height: 90vh;
    display: flex; flex-direction: column; overflow: hidden;
    animation: sd-in 0.2s cubic-bezier(0.16,1,0.3,1) both;
  }

  /* Header */
  .sd-header {
    padding: 14px 22px; flex-shrink: 0;
    border-bottom: 1px solid oklch(24% 0.022 255);
    display: flex; align-items: center; justify-content: space-between;
  }
  .sd-title {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 17px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;
    color: oklch(94% 0.007 255);
    display: flex; align-items: center; gap: 8px; margin: 0;
  }
  .sd-subtitle { font-size: 11.5px; color: oklch(42% 0.013 255); margin-top: 3px; }
  .sd-close {
    background: none; border: none; cursor: pointer; padding: 5px;
    color: oklch(42% 0.013 255); border-radius: 4px;
    display: flex; align-items: center; transition: color 0.12s;
  }
  .sd-close:hover { color: oklch(94% 0.007 255); }

  /* Body */
  .sd-body { flex: 1; overflow: auto; padding: 20px 22px; }

  /* Section header */
  .sd-section-title {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;
    color: oklch(42% 0.013 255); margin: 0 0 14px;
    display: flex; align-items: center; gap: 8px;
  }

  /* Top row: 2-col distribution panels */
  .sd-dist-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  @media (max-width: 600px) { .sd-dist-row { grid-template-columns: 1fr; } }

  .sd-dist-panel {
    background: oklch(21% 0.023 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 8px; padding: 16px;
  }

  /* Distribution bars */
  .sd-bar-rows { display: flex; flex-direction: column; gap: 9px; }
  .sd-bar-row { display: flex; align-items: center; gap: 10px; }
  .sd-bar-label { width: 60px; font-size: 12px; font-weight: 500; color: oklch(74% 0.012 255); flex-shrink: 0; }
  .sd-bar-track {
    flex: 1; height: 14px;
    background: oklch(15.5% 0.025 255);
    border-radius: 3px; overflow: hidden;
  }
  .sd-bar-fill { height: 100%; border-radius: 3px; transition: width 0.4s cubic-bezier(0.16,1,0.3,1); }
  .sd-bar-value { width: 80px; font-size: 11.5px; color: oklch(42% 0.013 255); text-align: right; flex-shrink: 0; font-variant-numeric: tabular-nums; }

  /* Coverage strip — full-width, inline data */
  .sd-coverage {
    background: oklch(18.5% 0.024 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 8px; padding: 13px 18px; margin-bottom: 20px;
    display: flex; align-items: center; gap: 0; flex-wrap: wrap;
  }
  .sd-cov-item {
    display: flex; align-items: baseline; gap: 7px;
    padding: 0 18px; border-right: 1px solid oklch(30% 0.019 255);
    flex-shrink: 0;
  }
  .sd-cov-item:first-child { padding-left: 0; }
  .sd-cov-item:last-child { border-right: none; }
  .sd-cov-num {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 26px; font-weight: 800; font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .sd-cov-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: oklch(42% 0.013 255); }

  /* Categories section */
  .sd-cat-panel {
    background: oklch(21% 0.023 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 8px; padding: 16px;
  }
  .sd-cat-list { display: flex; flex-direction: column; }

  .sd-cat-row {
    display: flex; align-items: center; gap: 10px;
    padding: 7px 6px; cursor: pointer;
    border-radius: 5px;
    transition: background 0.1s;
  }
  .sd-cat-row:hover { background: oklch(25% 0.021 255); }
  .sd-cat-chevron {
    color: oklch(42% 0.013 255); flex-shrink: 0;
    transition: transform 0.15s ease-out;
  }
  .sd-cat-chevron.open { transform: rotate(0deg); }
  .sd-cat-chevron.closed { transform: rotate(-90deg); }
  .sd-cat-dot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
  .sd-cat-name { width: 130px; font-size: 12.5px; font-weight: 500; color: oklch(88% 0.009 255); flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sd-cat-bar-track { flex: 1; height: 14px; background: oklch(15.5% 0.025 255); border-radius: 3px; overflow: hidden; }
  .sd-cat-bar-fill { height: 100%; border-radius: 3px; opacity: 0.55; }
  .sd-cat-count { width: 90px; font-size: 11.5px; color: oklch(42% 0.013 255); text-align: right; font-variant-numeric: tabular-nums; flex-shrink: 0; }

  /* Expanded items grid */
  .sd-items-grid {
    margin: 4px 0 6px 26px; padding: 12px;
    background: oklch(17% 0.025 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 6px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 4px; max-height: 280px; overflow: auto;
  }
  .sd-item-row {
    display: flex; align-items: center; gap: 8px;
    padding: 5px 7px; border-radius: 4px;
    background: oklch(19.5% 0.024 255);
    font-size: 11.5px;
  }
  .sd-item-img { width: 20px; height: 20px; image-rendering: pixelated; flex-shrink: 0; }
  .sd-item-name { flex: 1; color: oklch(74% 0.012 255); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sd-item-state {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    padding: 1px 5px; border-radius: 3px; flex-shrink: 0;
  }

  /* Loading / error */
  .sd-load-badge {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; color: oklch(58% 0.012 255);
    background: none; font-weight: 400;
  }
  .sd-err-badge {
    font-size: 10px; color: oklch(62% 0.22 25);
    background: oklch(62% 0.22 25 / 0.10);
    border: 1px solid oklch(62% 0.22 25 / 0.3);
    padding: 2px 7px; border-radius: 4px;
  }
  .sd-hint { font-size: 11px; color: oklch(42% 0.013 255); font-weight: 400; }
`;


// Constants for fetching official Minecraft item tags
const MISODE_ITEM_TAGS_URL = 'https://raw.githubusercontent.com/misode/mcmeta/summary/data/tag/item/data.json';
const MISODE_TAGS_CACHE_KEY = 'forceitem_tags_cache_v1';
const MISODE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib';

// Item Tags caching functions (for official Minecraft categories)
function getTagsCache() {
    try {
        const cached = localStorage.getItem(MISODE_TAGS_CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < MISODE_CACHE_DURATION) {
                return data;
            }
        }
    } catch (e) {
        console.error('Tags cache read error:', e);
    }
    return null;
}

function setTagsCache(data) {
    try {
        localStorage.setItem(MISODE_TAGS_CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.error('Tags cache write error:', e);
    }
}

// Fetch official Minecraft item tags from Misode's mcmeta
async function fetchItemTags() {
    // Check cache first
    const cached = getTagsCache();
    if (cached) {
        console.log('Using cached item tags data');
        return cached;
    }

    try {
        const response = await fetch(MISODE_ITEM_TAGS_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch item tags: ${response.status}`);
        }
        const rawTags = await response.json();

        // Process and resolve tag references
        const resolvedTags = resolveTagReferences(rawTags);

        // Cache the result
        setTagsCache(resolvedTags);
        console.log(`Fetched and resolved ${Object.keys(resolvedTags).length} item tags from Misode`);

        return resolvedTags;
    } catch (e) {
        console.error('Error fetching item tags:', e);
        return null;
    }
}

// Resolve tag references (e.g., "#minecraft:logs" -> actual items)
function resolveTagReferences(rawTags) {
    const resolved = {};

    function extractItems(tagName, visited = new Set()) {
        if (visited.has(tagName)) return new Set();
        visited.add(tagName);

        const items = new Set();
        const tag = rawTags[tagName];
        if (!tag || !tag.values) return items;

        for (const val of tag.values) {
            if (val.startsWith('#minecraft:')) {
                // It's a reference to another tag
                const refTag = val.replace('#minecraft:', '');
                const refItems = extractItems(refTag, visited);
                refItems.forEach(item => items.add(item));
            } else {
                // It's an actual item - convert to our format
                const material = val.replace('minecraft:', '').toUpperCase();
                items.add(material);
            }
        }

        return items;
    }

    // Resolve all tags
    for (const tagName of Object.keys(rawTags)) {
        const items = extractItems(tagName);
        if (items.size > 0) {
            resolved[tagName] = Array.from(items);
        }
    }

    return resolved;
}

// Official Minecraft item tag categories with display names and colors
// These map to the tags from misode/mcmeta repository
// Categories are consolidated into broader groups for better organization

// Consolidated category definitions
// Each category can include multiple official tags + custom item lists
const CATEGORY_CONFIG = [
    {
        id: 'wood',
        name: 'Wood',
        color: '#8B4513',
        tags: [
            'planks', 'logs', 'wooden_stairs', 'wooden_slabs', 'wooden_doors',
            'wooden_fences', 'wooden_trapdoors', 'wooden_buttons', 'wooden_pressure_plates',
            'fence_gates', 'signs', 'hanging_signs', 'boats', 'chest_boats', 'wooden_shelves'
        ],
        // Items crafted primarily from wood that aren't in official tags
        customItems: [
            'CHEST', 'TRAPPED_CHEST', 'BARREL', 'COMPOSTER', 'LADDER', 'BOWL', 'STICK',
            'CRAFTING_TABLE',
            'NOTE_BLOCK', 'JUKEBOX', 'LOOM', 'CARTOGRAPHY_TABLE', 'FLETCHING_TABLE',
            'BEEHIVE', 'BEE_NEST',
            'FISHING_ROD', 'CARROT_ON_A_STICK', 'WARPED_FUNGUS_ON_A_STICK',
            'PAINTING', 'ITEM_FRAME', 'GLOW_ITEM_FRAME', 'ARMOR_STAND',
            'DAYLIGHT_DETECTOR',
            // Bamboo building blocks
            'BAMBOO_BLOCK', 'STRIPPED_BAMBOO_BLOCK', 'BAMBOO_MOSAIC',
            'BAMBOO_PLANKS', 'BAMBOO_STAIRS', 'BAMBOO_SLAB', 'BAMBOO_MOSAIC_STAIRS', 'BAMBOO_MOSAIC_SLAB',
            'BAMBOO_FENCE', 'BAMBOO_FENCE_GATE', 'BAMBOO_DOOR', 'BAMBOO_TRAPDOOR',
            'BAMBOO_BUTTON', 'BAMBOO_PRESSURE_PLATE', 'BAMBOO_SIGN', 'BAMBOO_HANGING_SIGN',
            'BAMBOO_RAFT', 'BAMBOO_CHEST_RAFT'
        ]
    },
    {
        id: 'stone',
        name: 'Stone & Bricks',
        color: '#808080',
        tags: ['walls', 'stone_bricks'],
        // Stairs/slabs excluding wooden ones are handled separately
        customItems: [
            'STONE', 'COBBLESTONE', 'MOSSY_COBBLESTONE', 'SMOOTH_STONE',
            'STONE_BRICKS', 'MOSSY_STONE_BRICKS', 'CRACKED_STONE_BRICKS', 'CHISELED_STONE_BRICKS',
            // Deepslate variants
            'DEEPSLATE', 'COBBLED_DEEPSLATE', 'POLISHED_DEEPSLATE', 'DEEPSLATE_BRICKS', 'DEEPSLATE_TILES',
            'CHISELED_DEEPSLATE', 'CRACKED_DEEPSLATE_BRICKS', 'CRACKED_DEEPSLATE_TILES', 'INFESTED_DEEPSLATE',
            'COBBLED_DEEPSLATE_STAIRS', 'COBBLED_DEEPSLATE_SLAB', 'COBBLED_DEEPSLATE_WALL',
            'POLISHED_DEEPSLATE_STAIRS', 'POLISHED_DEEPSLATE_SLAB', 'POLISHED_DEEPSLATE_WALL',
            'DEEPSLATE_BRICK_STAIRS', 'DEEPSLATE_BRICK_SLAB', 'DEEPSLATE_BRICK_WALL',
            'DEEPSLATE_TILE_STAIRS', 'DEEPSLATE_TILE_SLAB', 'DEEPSLATE_TILE_WALL',
            // Other stone types
            'GRANITE', 'POLISHED_GRANITE', 'DIORITE', 'POLISHED_DIORITE', 'ANDESITE', 'POLISHED_ANDESITE',
            'CALCITE',
            // Tuff variants
            'TUFF', 'POLISHED_TUFF', 'TUFF_BRICKS', 'CHISELED_TUFF', 'CHISELED_TUFF_BRICKS',
            'TUFF_STAIRS', 'TUFF_SLAB', 'TUFF_WALL',
            'POLISHED_TUFF_STAIRS', 'POLISHED_TUFF_SLAB', 'POLISHED_TUFF_WALL',
            'TUFF_BRICK_STAIRS', 'TUFF_BRICK_SLAB', 'TUFF_BRICK_WALL',
            // Resin variants
            'RESIN_CLUMP', 'RESIN_BLOCK', 'RESIN_BRICKS', 'CHISELED_RESIN_BRICKS',
            'RESIN_BRICK_STAIRS', 'RESIN_BRICK_SLAB', 'RESIN_BRICK_WALL',
            // Other bricks
            'BRICKS', 'MUD_BRICKS', 'PACKED_MUD',
            'SANDSTONE', 'CHISELED_SANDSTONE', 'CUT_SANDSTONE', 'SMOOTH_SANDSTONE',
            'RED_SANDSTONE', 'CHISELED_RED_SANDSTONE', 'CUT_RED_SANDSTONE', 'SMOOTH_RED_SANDSTONE',
            'PRISMARINE', 'PRISMARINE_BRICKS', 'DARK_PRISMARINE',
            'FURNACE', 'BLAST_FURNACE', 'SMOKER', 'STONECUTTER',
            'CAULDRON', 'WATER_CAULDRON', 'LAVA_CAULDRON', 'POWDER_SNOW_CAULDRON',
            'LODESTONE', 'END_STONE', 'END_STONE_BRICKS', 'PURPUR_BLOCK', 'PURPUR_PILLAR',
            'END_STONE_BRICK_STAIRS', 'END_STONE_BRICK_SLAB', 'END_STONE_BRICK_WALL', 'PURPUR_STAIRS', 'PURPUR_SLAB',
            // Blackstone interactables
            'POLISHED_BLACKSTONE_BUTTON', 'POLISHED_BLACKSTONE_PRESSURE_PLATE',
            // Stone interactables
            'STONE_PRESSURE_PLATE', 'STONE_BUTTON',
            // Nether stone types
            'BASALT', 'SMOOTH_BASALT', 'POLISHED_BASALT',
            'BLACKSTONE', 'POLISHED_BLACKSTONE', 'POLISHED_BLACKSTONE_BRICKS', 'CRACKED_POLISHED_BLACKSTONE_BRICKS',
            'CHISELED_POLISHED_BLACKSTONE', 'GILDED_BLACKSTONE',
            'NETHER_BRICKS', 'RED_NETHER_BRICKS', 'CRACKED_NETHER_BRICKS', 'CHISELED_NETHER_BRICKS',
            'NETHER_BRICK', 'NETHER_BRICK_FENCE', 'NETHER_BRICK_STAIRS', 'NETHER_BRICK_SLAB', 'NETHER_BRICK_WALL'
        ]
    },
    {
        id: 'ores',
        name: 'Ores',
        color: '#FFD700',
        tags: ['coal_ores', 'copper_ores', 'iron_ores', 'gold_ores', 'diamond_ores', 'emerald_ores', 'lapis_ores', 'redstone_ores'],
        customItems: ['NETHER_QUARTZ_ORE', 'ANCIENT_DEBRIS', 'NETHER_GOLD_ORE']
    },
    {
        id: 'minerals',
        name: 'Minerals & Ingots',
        color: '#00CED1',
        tags: ['coals'],
        customItems: [
            'GOLD_INGOT', 'GOLD_NUGGET', 'RAW_GOLD', 'GOLD_BLOCK', 'RAW_GOLD_BLOCK',
            'DIAMOND', 'DIAMOND_BLOCK',
            'EMERALD', 'EMERALD_BLOCK',
            'NETHERITE_INGOT', 'NETHERITE_SCRAP', 'NETHERITE_BLOCK',
            'LAPIS_LAZULI', 'LAPIS_BLOCK',
            'REDSTONE', 'REDSTONE_BLOCK',
            'QUARTZ', 'QUARTZ_BLOCK', 'SMOOTH_QUARTZ', 'QUARTZ_BRICKS', 'CHISELED_QUARTZ_BLOCK', 'QUARTZ_PILLAR',
            'AMETHYST_SHARD', 'AMETHYST_BLOCK', 'BUDDING_AMETHYST', 'AMETHYST_CLUSTER',
            'SMALL_AMETHYST_BUD', 'MEDIUM_AMETHYST_BUD', 'LARGE_AMETHYST_BUD',
            'GLOWSTONE_DUST', 'GLOWSTONE'
        ]
    },
    {
        id: 'copper',
        name: 'Copper',
        color: '#B87333',
        tags: ['copper', 'copper_chests', 'copper_ores'],
        // Note: 'bars', 'chains', 'lanterns' tags removed - those are iron items
        customItems: [
            'COPPER_INGOT', 'RAW_COPPER', 'COPPER_BLOCK', 'RAW_COPPER_BLOCK',
            // Base copper oxidation states
            'EXPOSED_COPPER', 'WEATHERED_COPPER', 'OXIDIZED_COPPER',
            'WAXED_COPPER_BLOCK', 'WAXED_EXPOSED_COPPER', 'WAXED_WEATHERED_COPPER', 'WAXED_OXIDIZED_COPPER',
            // Cut copper
            'CUT_COPPER', 'EXPOSED_CUT_COPPER', 'WEATHERED_CUT_COPPER', 'OXIDIZED_CUT_COPPER',
            'WAXED_CUT_COPPER', 'WAXED_EXPOSED_CUT_COPPER', 'WAXED_WEATHERED_CUT_COPPER', 'WAXED_OXIDIZED_CUT_COPPER',
            'CUT_COPPER_STAIRS', 'EXPOSED_CUT_COPPER_STAIRS', 'WEATHERED_CUT_COPPER_STAIRS', 'OXIDIZED_CUT_COPPER_STAIRS',
            'WAXED_CUT_COPPER_STAIRS', 'WAXED_EXPOSED_CUT_COPPER_STAIRS', 'WAXED_WEATHERED_CUT_COPPER_STAIRS', 'WAXED_OXIDIZED_CUT_COPPER_STAIRS',
            'CUT_COPPER_SLAB', 'EXPOSED_CUT_COPPER_SLAB', 'WEATHERED_CUT_COPPER_SLAB', 'OXIDIZED_CUT_COPPER_SLAB',
            'WAXED_CUT_COPPER_SLAB', 'WAXED_EXPOSED_CUT_COPPER_SLAB', 'WAXED_WEATHERED_CUT_COPPER_SLAB', 'WAXED_OXIDIZED_CUT_COPPER_SLAB',
            // Chiseled copper
            'CHISELED_COPPER', 'EXPOSED_CHISELED_COPPER', 'WEATHERED_CHISELED_COPPER', 'OXIDIZED_CHISELED_COPPER',
            'WAXED_CHISELED_COPPER', 'WAXED_EXPOSED_CHISELED_COPPER', 'WAXED_WEATHERED_CHISELED_COPPER', 'WAXED_OXIDIZED_CHISELED_COPPER',
            // Copper grate
            'COPPER_GRATE', 'EXPOSED_COPPER_GRATE', 'WEATHERED_COPPER_GRATE', 'OXIDIZED_COPPER_GRATE',
            'WAXED_COPPER_GRATE', 'WAXED_EXPOSED_COPPER_GRATE', 'WAXED_WEATHERED_COPPER_GRATE', 'WAXED_OXIDIZED_COPPER_GRATE',
            // Copper bulb
            'COPPER_BULB', 'EXPOSED_COPPER_BULB', 'WEATHERED_COPPER_BULB', 'OXIDIZED_COPPER_BULB',
            'WAXED_COPPER_BULB', 'WAXED_EXPOSED_COPPER_BULB', 'WAXED_WEATHERED_COPPER_BULB', 'WAXED_OXIDIZED_COPPER_BULB',
            // Copper door
            'COPPER_DOOR', 'EXPOSED_COPPER_DOOR', 'WEATHERED_COPPER_DOOR', 'OXIDIZED_COPPER_DOOR',
            'WAXED_COPPER_DOOR', 'WAXED_EXPOSED_COPPER_DOOR', 'WAXED_WEATHERED_COPPER_DOOR', 'WAXED_OXIDIZED_COPPER_DOOR',
            // Copper trapdoor
            'COPPER_TRAPDOOR', 'EXPOSED_COPPER_TRAPDOOR', 'WEATHERED_COPPER_TRAPDOOR', 'OXIDIZED_COPPER_TRAPDOOR',
            'WAXED_COPPER_TRAPDOOR', 'WAXED_EXPOSED_COPPER_TRAPDOOR', 'WAXED_WEATHERED_COPPER_TRAPDOOR', 'WAXED_OXIDIZED_COPPER_TRAPDOOR',
            // Copper lantern (from 1.21.5)
            'COPPER_LANTERN', 'EXPOSED_COPPER_LANTERN', 'WEATHERED_COPPER_LANTERN', 'OXIDIZED_COPPER_LANTERN',
            'WAXED_COPPER_LANTERN', 'WAXED_EXPOSED_COPPER_LANTERN', 'WAXED_WEATHERED_COPPER_LANTERN', 'WAXED_OXIDIZED_COPPER_LANTERN',
            // Other copper items
            'LIGHTNING_ROD', 'SPYGLASS'
        ]
    },
    {
        id: 'tools',
        name: 'Tools',
        color: '#708090',
        tags: ['axes', 'pickaxes', 'shovels', 'hoes'],
        customItems: [
            'SHEARS', 'FLINT_AND_STEEL', 'BRUSH', 'LEAD', 'NAME_TAG',
            'CLOCK', 'COMPASS', 'RECOVERY_COMPASS', 'MAP', 'FILLED_MAP',
            'BUCKET', 'WATER_BUCKET', 'LAVA_BUCKET', 'MILK_BUCKET', 'POWDER_SNOW_BUCKET',
            'AXOLOTL_BUCKET', 'COD_BUCKET', 'SALMON_BUCKET', 'PUFFERFISH_BUCKET', 'TROPICAL_FISH_BUCKET', 'TADPOLE_BUCKET'
        ]
    },
    {
        id: 'weapons_armor',
        name: 'Weapons & Armor',
        color: '#DC143C',
        tags: ['swords', 'spears', 'arrows', 'head_armor', 'chest_armor', 'leg_armor', 'foot_armor'],
        customItems: [
            'TRIDENT', 'MACE', 'BOW', 'CROSSBOW', 'SHIELD', 'FIREWORK_ROCKET',
            'ELYTRA', 'TURTLE_SCUTE', 'ARMADILLO_SCUTE', 'WOLF_ARMOR'
        ]
    },
    {
        id: 'wool_fabric',
        name: 'Wool & Fabric',
        color: '#FFFAF0',
        tags: ['wool', 'wool_carpets', 'beds', 'banners'],
        customItems: ['STRING', 'COBWEB', 'LEAD']
    },
    {
        id: 'terracotta',
        name: 'Terracotta',
        color: '#E2725B',
        tags: ['terracotta'],
        customItems: [
            'DECORATED_POT', 'FLOWER_POT', 'BRICK',
            // Glazed terracotta
            'WHITE_GLAZED_TERRACOTTA', 'ORANGE_GLAZED_TERRACOTTA', 'MAGENTA_GLAZED_TERRACOTTA', 'LIGHT_BLUE_GLAZED_TERRACOTTA',
            'YELLOW_GLAZED_TERRACOTTA', 'LIME_GLAZED_TERRACOTTA', 'PINK_GLAZED_TERRACOTTA', 'GRAY_GLAZED_TERRACOTTA',
            'LIGHT_GRAY_GLAZED_TERRACOTTA', 'CYAN_GLAZED_TERRACOTTA', 'PURPLE_GLAZED_TERRACOTTA', 'BLUE_GLAZED_TERRACOTTA',
            'BROWN_GLAZED_TERRACOTTA', 'GREEN_GLAZED_TERRACOTTA', 'RED_GLAZED_TERRACOTTA', 'BLACK_GLAZED_TERRACOTTA'
        ]
    },
    {
        id: 'concrete',
        name: 'Concrete',
        color: '#A9A9A9',
        customItems: [
            'WHITE_CONCRETE', 'ORANGE_CONCRETE', 'MAGENTA_CONCRETE', 'LIGHT_BLUE_CONCRETE',
            'YELLOW_CONCRETE', 'LIME_CONCRETE', 'PINK_CONCRETE', 'GRAY_CONCRETE',
            'LIGHT_GRAY_CONCRETE', 'CYAN_CONCRETE', 'PURPLE_CONCRETE', 'BLUE_CONCRETE',
            'BROWN_CONCRETE', 'GREEN_CONCRETE', 'RED_CONCRETE', 'BLACK_CONCRETE',
            'WHITE_CONCRETE_POWDER', 'ORANGE_CONCRETE_POWDER', 'MAGENTA_CONCRETE_POWDER', 'LIGHT_BLUE_CONCRETE_POWDER',
            'YELLOW_CONCRETE_POWDER', 'LIME_CONCRETE_POWDER', 'PINK_CONCRETE_POWDER', 'GRAY_CONCRETE_POWDER',
            'LIGHT_GRAY_CONCRETE_POWDER', 'CYAN_CONCRETE_POWDER', 'PURPLE_CONCRETE_POWDER', 'BLUE_CONCRETE_POWDER',
            'BROWN_CONCRETE_POWDER', 'GREEN_CONCRETE_POWDER', 'RED_CONCRETE_POWDER', 'BLACK_CONCRETE_POWDER'
        ]
    },
    {
        id: 'glass',
        name: 'Glass',
        color: '#ADD8E6',
        customItems: [
            'GLASS', 'GLASS_PANE', 'TINTED_GLASS',
            'WHITE_STAINED_GLASS', 'ORANGE_STAINED_GLASS', 'MAGENTA_STAINED_GLASS', 'LIGHT_BLUE_STAINED_GLASS',
            'YELLOW_STAINED_GLASS', 'LIME_STAINED_GLASS', 'PINK_STAINED_GLASS', 'GRAY_STAINED_GLASS',
            'LIGHT_GRAY_STAINED_GLASS', 'CYAN_STAINED_GLASS', 'PURPLE_STAINED_GLASS', 'BLUE_STAINED_GLASS',
            'BROWN_STAINED_GLASS', 'GREEN_STAINED_GLASS', 'RED_STAINED_GLASS', 'BLACK_STAINED_GLASS',
            'WHITE_STAINED_GLASS_PANE', 'ORANGE_STAINED_GLASS_PANE', 'MAGENTA_STAINED_GLASS_PANE', 'LIGHT_BLUE_STAINED_GLASS_PANE',
            'YELLOW_STAINED_GLASS_PANE', 'LIME_STAINED_GLASS_PANE', 'PINK_STAINED_GLASS_PANE', 'GRAY_STAINED_GLASS_PANE',
            'LIGHT_GRAY_STAINED_GLASS_PANE', 'CYAN_STAINED_GLASS_PANE', 'PURPLE_STAINED_GLASS_PANE', 'BLUE_STAINED_GLASS_PANE',
            'BROWN_STAINED_GLASS_PANE', 'GREEN_STAINED_GLASS_PANE', 'RED_STAINED_GLASS_PANE', 'BLACK_STAINED_GLASS_PANE',
            'BEACON', 'END_CRYSTAL'
        ]
    },
    {
        id: 'candles',
        name: 'Candles',
        color: '#FFE4B5',
        tags: ['candles']
    },
    {
        id: 'dyes',
        name: 'Dyes',
        color: '#FF69B4',
        customItems: [
            'WHITE_DYE', 'ORANGE_DYE', 'MAGENTA_DYE', 'LIGHT_BLUE_DYE',
            'YELLOW_DYE', 'LIME_DYE', 'PINK_DYE', 'GRAY_DYE',
            'LIGHT_GRAY_DYE', 'CYAN_DYE', 'PURPLE_DYE', 'BLUE_DYE',
            'BROWN_DYE', 'GREEN_DYE', 'RED_DYE', 'BLACK_DYE',
            'INK_SAC', 'GLOW_INK_SAC', 'COCOA_BEANS', 'BONE_MEAL', 'LAPIS_LAZULI'
        ]
    },
    {
        id: 'flowers_nature',
        name: 'Flowers & Plants',
        color: '#FF69B4',
        tags: ['flowers', 'saplings', 'leaves'],
        customItems: [
            'GRASS_BLOCK', 'SHORT_GRASS', 'TALL_GRASS', 'FERN', 'LARGE_FERN',
            'DEAD_BUSH', 'BUSH', 'SEAGRASS', 'TALL_SEAGRASS', 'SEA_PICKLE', 'KELP', 'DRIED_KELP', 'DRIED_KELP_BLOCK',
            'VINE', 'GLOW_LICHEN', 'HANGING_ROOTS', 'SPORE_BLOSSOM',
            'MOSS_BLOCK', 'MOSS_CARPET', 'AZALEA', 'FLOWERING_AZALEA',
            'AZALEA_LEAVES', 'FLOWERING_AZALEA_LEAVES',
            'BIG_DRIPLEAF', 'SMALL_DRIPLEAF',
            'LILY_PAD', 'SUGAR_CANE', 'CACTUS', 'BAMBOO',
            'CRIMSON_FUNGUS', 'WARPED_FUNGUS', 'CRIMSON_ROOTS', 'WARPED_ROOTS',
            'NETHER_SPROUTS', 'WEEPING_VINES', 'TWISTING_VINES',
            'CHORUS_FLOWER', 'CHORUS_PLANT', 'CHORUS_FRUIT', 'POPPED_CHORUS_FRUIT',
            // Mushrooms
            'BROWN_MUSHROOM', 'RED_MUSHROOM', 'BROWN_MUSHROOM_BLOCK', 'RED_MUSHROOM_BLOCK', 'MUSHROOM_STEM',
            // Pale garden
            'PALE_HANGING_MOSS', 'PALE_MOSS_BLOCK', 'PALE_MOSS_CARPET', 'LEAF_LITTER',
            // Dry grass
            'SHORT_DRY_GRASS', 'TALL_DRY_GRASS',
            // Other plants
            'MANGROVE_ROOTS', 'MUDDY_MANGROVE_ROOTS', 'FIREFLY_BUSH'
        ]
    },
    {
        id: 'dirt_soil',
        name: 'Dirt & Soil',
        color: '#8B4513',
        tags: ['dirt', 'sand'],
        customItems: [
            'FARMLAND', 'DIRT_PATH', 'SOUL_SAND', 'SOUL_SOIL',
            'CLAY', 'CLAY_BALL', 'GRAVEL', 'FLINT',
            'MYCELIUM', 'PODZOL', 'SCULK', 'SCULK_VEIN', 'SCULK_CATALYST', 'SCULK_SHRIEKER', 'SCULK_SENSOR', 'CALIBRATED_SCULK_SENSOR',
            'SNOW', 'SNOW_BLOCK', 'POWDER_SNOW_BUCKET', 'ICE', 'PACKED_ICE', 'BLUE_ICE', 'FROSTED_ICE',
            'CRIMSON_NYLIUM', 'WARPED_NYLIUM',
            // Nether dirt types
            'NETHERRACK', 'NETHER_WART_BLOCK', 'WARPED_WART_BLOCK'
        ]
    },
    {
        id: 'food',
        name: 'Food',
        color: '#FF6347',
        tags: ['meat', 'fishes', 'eggs'],
        customItems: [
            'BREAD', 'APPLE', 'GOLDEN_APPLE', 'ENCHANTED_GOLDEN_APPLE', 'GOLDEN_CARROT',
            'COOKIE', 'CAKE', 'PUMPKIN_PIE', 'SUGAR',
            'MUSHROOM_STEW', 'BEETROOT_SOUP', 'RABBIT_STEW', 'SUSPICIOUS_STEW',
            'BAKED_POTATO', 'POISONOUS_POTATO',
            'DRIED_KELP', 'HONEY_BOTTLE', 'HONEYCOMB',
            'ROTTEN_FLESH', 'SPIDER_EYE', 'FERMENTED_SPIDER_EYE',
            // Crops & seeds
            'WHEAT', 'WHEAT_SEEDS', 'HAY_BLOCK',
            'CARROT', 'POTATO', 'BEETROOT', 'BEETROOT_SEEDS',
            'PUMPKIN_SEEDS',
            'MELON', 'MELON_SLICE', 'MELON_SEEDS', 'GLISTERING_MELON_SLICE',
            'COCOA_BEANS', 'SWEET_BERRIES', 'GLOW_BERRIES',
            'TORCHFLOWER', 'TORCHFLOWER_SEEDS', 'PITCHER_PLANT', 'PITCHER_POD'
        ]
    },
    {
        id: 'redstone',
        name: 'Redstone',
        color: '#FF0000',
        tags: ['rails'],
        customItems: [
            'REDSTONE', 'REDSTONE_BLOCK', 'REDSTONE_TORCH', 'REDSTONE_LAMP',
            'REPEATER', 'COMPARATOR', 'LEVER', 'BUTTON', 'STONE_BUTTON',
            'PISTON', 'STICKY_PISTON', 'SLIME_BLOCK', 'HONEY_BLOCK',
            'OBSERVER', 'DROPPER', 'DISPENSER', 'HOPPER', 'HOPPER_MINECART',
            'MINECART', 'CHEST_MINECART', 'FURNACE_MINECART', 'TNT_MINECART', 'COMMAND_BLOCK_MINECART',
            'TNT', 'TARGET', 'TRIPWIRE_HOOK',
            'TRAPPED_CHEST', 'CRAFTER'
        ]
    },
    {
        id: 'lighting',
        name: 'Lighting',
        color: '#FFD700',
        tags: ['lanterns'],
        customItems: [
            'TORCH', 'SOUL_TORCH', 'REDSTONE_TORCH',
            'GLOWSTONE', 'SEA_LANTERN', 'SHROOMLIGHT', 'END_ROD',
            'OCHRE_FROGLIGHT', 'PEARLESCENT_FROGLIGHT', 'VERDANT_FROGLIGHT',
            'JACK_O_LANTERN', 'CAMPFIRE', 'SOUL_CAMPFIRE',
            'GLOW_LICHEN', 'GLOW_BERRIES', 'GLOW_INK_SAC', 'GLOW_ITEM_FRAME'
        ]
    },
    {
        id: 'ocean',
        name: 'Ocean',
        color: '#20B2AA',
        customItems: [
            'PRISMARINE', 'PRISMARINE_BRICKS', 'DARK_PRISMARINE',
            'PRISMARINE_SHARD', 'PRISMARINE_CRYSTALS', 'SEA_LANTERN',
            'SPONGE', 'WET_SPONGE',
            'TUBE_CORAL', 'BRAIN_CORAL', 'BUBBLE_CORAL', 'FIRE_CORAL', 'HORN_CORAL',
            'TUBE_CORAL_BLOCK', 'BRAIN_CORAL_BLOCK', 'BUBBLE_CORAL_BLOCK', 'FIRE_CORAL_BLOCK', 'HORN_CORAL_BLOCK',
            'TUBE_CORAL_FAN', 'BRAIN_CORAL_FAN', 'BUBBLE_CORAL_FAN', 'FIRE_CORAL_FAN', 'HORN_CORAL_FAN',
            'DEAD_TUBE_CORAL', 'DEAD_BRAIN_CORAL', 'DEAD_BUBBLE_CORAL', 'DEAD_FIRE_CORAL', 'DEAD_HORN_CORAL',
            'DEAD_TUBE_CORAL_BLOCK', 'DEAD_BRAIN_CORAL_BLOCK', 'DEAD_BUBBLE_CORAL_BLOCK', 'DEAD_FIRE_CORAL_BLOCK', 'DEAD_HORN_CORAL_BLOCK',
            'DEAD_TUBE_CORAL_FAN', 'DEAD_BRAIN_CORAL_FAN', 'DEAD_BUBBLE_CORAL_FAN', 'DEAD_FIRE_CORAL_FAN', 'DEAD_HORN_CORAL_FAN',
            'NAUTILUS_SHELL', 'HEART_OF_THE_SEA', 'CONDUIT',
            'TURTLE_EGG', 'TURTLE_SCUTE', 'TURTLE_HELMET', 'TRIDENT',
            'MAGMA_BLOCK'
        ]
    },
    {
        id: 'storage',
        name: 'Storage',
        color: '#9932CC',
        tags: ['shulker_boxes', 'bundles'],
        customItems: ['ENDER_CHEST', 'SHULKER_SHELL']
    },
    {
        id: 'pottery',
        name: 'Pottery Sherds',
        color: '#D2691E',
        tags: ['decorated_pot_sherds'],
        customItems: ['DECORATED_POT', 'BRUSH']
    },
    {
        id: 'music_discs',
        name: 'Music Discs',
        color: '#1DB954',
        tags: ['creeper_drop_music_discs'],
        customItems: [
            'MUSIC_DISC_PIGSTEP', 'MUSIC_DISC_OTHERSIDE', 'MUSIC_DISC_5', 'MUSIC_DISC_RELIC',
            'MUSIC_DISC_CREATOR', 'MUSIC_DISC_CREATOR_MUSIC_BOX', 'MUSIC_DISC_PRECIPICE',
            'DISC_FRAGMENT_5'
        ]
    },
    {
        id: 'books_enchanting',
        name: 'Books & Enchanting',
        color: '#8A2BE2',
        tags: ['bookshelf_books'],
        customItems: [
            'BOOKSHELF', 'CHISELED_BOOKSHELF', 'LECTERN', 'ENCHANTING_TABLE',
            'EXPERIENCE_BOTTLE', 'ENCHANTED_BOOK',
            'PAPER', 'BOOK', 'WRITABLE_BOOK', 'WRITTEN_BOOK', 'KNOWLEDGE_BOOK'
        ]
    },
    {
        id: 'potions_brewing',
        name: 'Potions & Brewing',
        color: '#FF00FF',
        customItems: [
            'POTION', 'SPLASH_POTION', 'LINGERING_POTION',
            'BREWING_STAND', 'CAULDRON', 'GLASS_BOTTLE',
            'BLAZE_POWDER',
            'GHAST_TEAR', 'MAGMA_CREAM', 'FERMENTED_SPIDER_EYE',
            'GLISTERING_MELON_SLICE', 'GOLDEN_CARROT',
            'DRAGON_BREATH', 'PHANTOM_MEMBRANE', 'TURTLE_SCUTE'
        ]
    },
    {
        id: 'spawn_eggs',
        name: 'Spawn Eggs',
        color: '#98FB98',
        customItems: [] // Will be matched by pattern
    },
    {
        id: 'mob_drops',
        name: 'Mob Drops',
        color: '#8B7355',
        customItems: [
            'BONE', 'BONE_MEAL',
            'STRING', 'COBWEB', 'FEATHER',
            'LEATHER', 'RABBIT_HIDE', 'RABBIT_FOOT',
            'SLIME_BALL', 'SLIME_BLOCK',
            'ENDER_PEARL', 'GUNPOWDER',
            'SPIDER_EYE', 'FERMENTED_SPIDER_EYE',
            'ROTTEN_FLESH', 'PHANTOM_MEMBRANE',
            'TOTEM_OF_UNDYING',
            'INK_SAC', 'GLOW_INK_SAC',
            'HONEYCOMB', 'HONEY_BOTTLE', 'HONEY_BLOCK',
            'GOAT_HORN', 'ARMADILLO_SCUTE',
            'BREEZE_ROD', 'WIND_CHARGE', 'HEAVY_CORE',
            // Nether mob drops
            'BLAZE_ROD', 'WITHER_SKELETON_SKULL', 'MAGMA_CREAM'
        ]
    },
    {
        id: 'anvil',
        name: 'Anvils & Smithing',
        color: '#4A4A4A',
        tags: ['anvil'],
        customItems: [
            'SMITHING_TABLE', 'GRINDSTONE',
            'NETHERITE_UPGRADE_SMITHING_TEMPLATE',
            'COAST_ARMOR_TRIM_SMITHING_TEMPLATE', 'DUNE_ARMOR_TRIM_SMITHING_TEMPLATE',
            'EYE_ARMOR_TRIM_SMITHING_TEMPLATE', 'HOST_ARMOR_TRIM_SMITHING_TEMPLATE',
            'RAISER_ARMOR_TRIM_SMITHING_TEMPLATE', 'RIB_ARMOR_TRIM_SMITHING_TEMPLATE',
            'SENTRY_ARMOR_TRIM_SMITHING_TEMPLATE', 'SHAPER_ARMOR_TRIM_SMITHING_TEMPLATE',
            'SILENCE_ARMOR_TRIM_SMITHING_TEMPLATE', 'SNOUT_ARMOR_TRIM_SMITHING_TEMPLATE',
            'SPIRE_ARMOR_TRIM_SMITHING_TEMPLATE', 'TIDE_ARMOR_TRIM_SMITHING_TEMPLATE',
            'VEX_ARMOR_TRIM_SMITHING_TEMPLATE', 'WARD_ARMOR_TRIM_SMITHING_TEMPLATE',
            'WAYFINDER_ARMOR_TRIM_SMITHING_TEMPLATE', 'WILD_ARMOR_TRIM_SMITHING_TEMPLATE',
            // Trial Chambers smithing templates
            'FLOW_ARMOR_TRIM_SMITHING_TEMPLATE', 'BOLT_ARMOR_TRIM_SMITHING_TEMPLATE'
        ]
    },
    {
        id: 'iron',
        name: 'Iron',
        color: '#B8B8B8',
        customItems: [
            'IRON_BLOCK', 'RAW_IRON_BLOCK', 'IRON_INGOT', 'IRON_NUGGET', 'RAW_IRON',
            'IRON_DOOR', 'IRON_TRAPDOOR', 'IRON_BARS',
            'CHAIN', 'IRON_CHAIN', 'LANTERN', 'SOUL_LANTERN',
            'CAULDRON', 'HOPPER', 'MINECART', 'RAILS',
            'BUCKET', 'SHEARS', 'FLINT_AND_STEEL', 'COMPASS', 'CLOCK',
            'ANVIL', 'CHIPPED_ANVIL', 'DAMAGED_ANVIL',
            'BLAST_FURNACE', 'SMITHING_TABLE',
            'HEAVY_WEIGHTED_PRESSURE_PLATE', 'TRIPWIRE_HOOK',
            'PISTON', 'STICKY_PISTON', 'OBSERVER'
        ]
    }
];

// Global variable to store resolved tags (loaded async)
let resolvedItemTags = null;
let itemTagsPromise = null;

// Load item tags (call this early in the app)
function loadItemTags() {
    if (itemTagsPromise) return itemTagsPromise;
    itemTagsPromise = fetchItemTags()
        .then(tags => {
            if (!tags) {
                itemTagsPromise = null;
                resolvedItemTags = null;
                return null;
            }
            resolvedItemTags = tags;
            return tags;
        })
        .catch(err => {
            itemTagsPromise = null;
            resolvedItemTags = null;
            throw err;
        });
    return itemTagsPromise;
}

// Build item-to-categories mapping from official tags and custom items
function buildTagCategoryMap(tags) {
    if (!tags) return null;

    const itemToCategories = {};

    for (const category of CATEGORY_CONFIG) {
        const categoryItems = new Set();

        // Add items from official tags
        if (category.tags) {
            // Build set of items to exclude
            const excludeItems = new Set();
            if (category.excludeTags) {
                for (const excludeTag of category.excludeTags) {
                    const excludeTagItems = tags[excludeTag];
                    if (excludeTagItems) {
                        excludeTagItems.forEach(item => excludeItems.add(item));
                    }
                }
            }

            // Add items from each tag
            for (const tagName of category.tags) {
                const tagItems = tags[tagName];
                if (tagItems) {
                    for (const item of tagItems) {
                        if (!excludeItems.has(item)) {
                            categoryItems.add(item);
                        }
                    }
                }
            }
        }

        // Add custom items
        if (category.customItems) {
            for (const item of category.customItems) {
                categoryItems.add(item);
            }
        }

        // Map each item to this category
        for (const item of categoryItems) {
            if (!itemToCategories[item]) {
                itemToCategories[item] = [];
            }
            if (!itemToCategories[item].includes(category.id)) {
                itemToCategories[item].push(category.id);
            }
        }
    }

    return itemToCategories;
}

// Categorize an item using official Minecraft tags
// Returns a single category ID - first match wins based on CATEGORY_CONFIG order
function categorizeItem(material, tagCategoryMap = null) {
    // If tag system is not loaded, return 'other'
    if (!tagCategoryMap) {
        return 'other';
    }

    // Check tag-based categories - return first match only
    if (tagCategoryMap[material] && tagCategoryMap[material].length > 0) {
        return tagCategoryMap[material][0];
    }

    // Special case: Spawn eggs (pattern-based since there are too many to list)
    if (material.endsWith('_SPAWN_EGG')) {
        return 'spawn_eggs';
    }

    // Pattern-based fallbacks for items that contain specific keywords
    // This catches any items that aren't explicitly listed but belong to a category
    if (material.includes('COPPER') && !material.includes('_ORE')) {
        return 'copper';
    }
    // Lightning Rod variants are made of copper but don't have COPPER in name
    if (material.includes('LIGHTNING_ROD')) {
        return 'copper';
    }
    if (material.includes('BAMBOO')) {
        return 'wood';
    }
    if (material.includes('DEEPSLATE') || material.includes('TUFF') || material.includes('RESIN')) {
        return 'stone';
    }

    // Iron doors and trapdoors
    if (material === 'IRON_DOOR' || material === 'IRON_TRAPDOOR') {
        return 'iron';
    }

    // Iron chain
    if (material === 'IRON_CHAIN' || material === 'CHAIN') {
        return 'iron';
    }

    // Music discs
    if (material.startsWith('MUSIC_DISC_')) {
        return 'music_discs';
    }

    // Glazed terracotta
    if (material.endsWith('_GLAZED_TERRACOTTA')) {
        return 'terracotta';
    }

    // Blackstone variants
    if (material.includes('BLACKSTONE')) {
        return 'stone';
    }

    // Handle stairs and slabs by their material prefix
    if (material.endsWith('_STAIRS') || material.endsWith('_SLAB')) {
        // Wood types
        const woodPrefixes = ['OAK', 'SPRUCE', 'BIRCH', 'JUNGLE', 'ACACIA', 'DARK_OAK', 'MANGROVE', 'CHERRY', 'PALE_OAK', 'CRIMSON', 'WARPED', 'BAMBOO'];
        for (const prefix of woodPrefixes) {
            if (material.startsWith(prefix + '_')) {
                return 'wood';
            }
        }
        // Copper is already handled above
        // Everything else (stone, brick, etc.) goes to stone
        return 'stone';
    }

    return 'other';
}

function getCategoryInfo(categoryId) {
    const category = CATEGORY_CONFIG.find(c => c.id === categoryId);
    if (category) return category;
    return { id: 'other', name: 'Other', color: C.dim };
}

// Bar component
function DistributionBar({ data, total }) {
    return (
        <div className="sd-bar-rows">
            {data.map(({ label, value, color }) => {
                const pct = total > 0 ? (value / total * 100) : 0;
                return (
                    <div key={label} className="sd-bar-row">
                        <span className="sd-bar-label">{label}</span>
                        <div className="sd-bar-track">
                            <div className="sd-bar-fill" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <span className="sd-bar-value">{value} ({pct.toFixed(1)}%)</span>
                    </div>
                );
            })}
        </div>
    );
}

// Statistics Dashboard Component
function StatisticsDashboard({ items, missingItems, onClose }) {
    // State for expanded categories (lazy initialization)
    const [expandedCategories, setExpandedCategories] = useState(() => new Set());
    // State for loaded item tags
    const [tagCategoryMap, setTagCategoryMap] = useState(null);
    const [tagsLoading, setTagsLoading] = useState(true);
    const [tagsError, setTagsError] = useState(false);

    // Load item tags on mount
    useEffect(() => {
        loadItemTags().then(tags => {
            if (tags) {
                const categoryMap = buildTagCategoryMap(tags);
                if (categoryMap && Object.keys(categoryMap).length > 0) {
                    setTagCategoryMap(categoryMap);
                    console.log(`Built category map with ${Object.keys(categoryMap).length} items`);
                } else {
                    setTagsError(true);
                }
            } else {
                setTagsError(true);
            }
            setTagsLoading(false);
        }).catch(() => {
            setTagsError(true);
            setTagsLoading(false);
        });
    }, []);

    // Calculate state distribution
    const stateStats = useMemo(() => {
        const stats = { EARLY: 0, MID: 0, LATE: 0 };
        items.forEach(item => {
            if (item.state && stats[item.state] !== undefined) {
                stats[item.state]++;
            }
        });
        return stats;
    }, [items]);

    // Calculate tag distribution
    const tagStats = useMemo(() => {
        const stats = { NETHER: 0, END: 0, EXTREME: 0 };
        items.forEach(item => {
            if (item.tags) {
                item.tags.forEach(tag => {
                    if (stats[tag] !== undefined) {
                        stats[tag]++;
                    }
                });
            }
        });
        return stats;
    }, [items]);

    // Calculate category distribution with items grouped (uses official tags when available)
    // Each item belongs to exactly one category for accurate distribution percentages
    const categoryData = useMemo(() => {
        const categoryItems = {};
        items.forEach(item => {
            const category = categorizeItem(item.material, tagCategoryMap);
            if (!categoryItems[category]) {
                categoryItems[category] = [];
            }
            categoryItems[category].push(item);
        });
        // Sort categories by count descending, then sort items within each category
        return Object.entries(categoryItems)
            .map(([id, catItems]) => ({
                ...getCategoryInfo(id),
                items: catItems.sort((a, b) => a.displayName.localeCompare(b.displayName)),
                count: catItems.length
            }))
            .sort((a, b) => b.count - a.count);
    }, [items, tagCategoryMap]);

    const total = items.length;
    const totalMissing = missingItems.length;

    // Memoized toggle handler to prevent recreation on every render
    const toggleCategory = useCallback((categoryId) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    }, []);


    const stateColors = { EARLY: C.early, MID: C.mid, LATE: C.late };

    return (
        <div className="sd sd-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <style>{SD_CSS}</style>
            <div className="sd-panel">

                {/* Header */}
                <div className="sd-header">
                    <div>
                        <h2 className="sd-title">
                            <BarChart3 size={16} style={{ color: C.amber }} />
                            Pool Statistics
                        </h2>
                        <div className="sd-subtitle">Distribution analysis of {total} pool items</div>
                    </div>
                    <button className="sd-close" onClick={onClose}><X size={18} /></button>
                </div>

                {/* Body */}
                <div className="sd-body">

                    {/* Coverage strip */}
                    <div className="sd-coverage">
                        {[
                            {
                                num: ((total + totalMissing) > 0 ? (total / (total + totalMissing)) * 100 : 0).toFixed(1) + '%',
                                label: 'In Pool',
                                color: C.amber,
                            },
                            { num: total,        label: 'Pool Items', color: C.textMid },
                            { num: totalMissing, label: 'Missing',    color: C.muted    },
                            { num: stateStats.EARLY, label: 'Early',  color: C.early },
                            { num: stateStats.MID,   label: 'Mid',    color: C.mid   },
                            { num: stateStats.LATE,  label: 'Late',   color: C.late  },
                        ].map(({ num, label, color }) => (
                            <div key={label} className="sd-cov-item">
                                <span className="sd-cov-num" style={{ color }}>{num}</span>
                                <span className="sd-cov-label">{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Distribution panels */}
                    <div className="sd-dist-row" style={{ marginBottom: 20 }}>
                        <div className="sd-dist-panel">
                            <div className="sd-section-title">Unlock Timing</div>
                            <DistributionBar
                                data={[
                                    { label: 'Early', value: stateStats.EARLY, color: C.early },
                                    { label: 'Mid',   value: stateStats.MID,   color: C.mid   },
                                    { label: 'Late',  value: stateStats.LATE,  color: C.late  },
                                ]}
                                total={total}
                            />
                        </div>
                        <div className="sd-dist-panel">
                            <div className="sd-section-title">Special Tags</div>
                            <DistributionBar
                                data={[
                                    { label: 'Nether',  value: tagStats.NETHER,  color: C.nether  },
                                    { label: 'End',     value: tagStats.END,     color: C.end     },
                                    { label: 'Extreme', value: tagStats.EXTREME, color: C.extreme },
                                ]}
                                total={total}
                            />
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="sd-cat-panel">
                        <div className="sd-section-title">
                            Items by Category
                            {tagsLoading ? (
                                <span className="sd-load-badge">
                                    <RefreshCw size={11} style={{ animation: 'sd-spin 1s linear infinite' }} />
                                    Loading tags...
                                </span>
                            ) : tagsError ? (
                                <span className="sd-err-badge">Tag data unavailable</span>
                            ) : (
                                <span className="sd-hint">click to expand</span>
                            )}
                        </div>

                        <div className="sd-cat-list">
                            {categoryData.map(({ id, name, color, items: catItems, count }) => {
                                const isExpanded = expandedCategories.has(id);
                                const pct = total > 0 ? (count / total * 100) : 0;
                                return (
                                    <div key={id}>
                                        <div className="sd-cat-row" onClick={() => toggleCategory(id)}>
                                            <ChevronDown
                                                size={13}
                                                className={`sd-cat-chevron ${isExpanded ? 'open' : 'closed'}`}
                                            />
                                            <div className="sd-cat-dot" style={{ background: color }} />
                                            <span className="sd-cat-name">{name}</span>
                                            <div className="sd-cat-bar-track">
                                                <div className="sd-cat-bar-fill" style={{ width: `${pct}%`, background: color }} />
                                            </div>
                                            <span className="sd-cat-count">{count} ({pct.toFixed(1)}%)</span>
                                        </div>

                                        {isExpanded && (
                                            <div className="sd-items-grid">
                                                {catItems.map(item => {
                                                    const stateCol = stateColors[item.state] || C.muted;
                                                    return (
                                                        <div key={item.material} className="sd-item-row">
                                                            <img
                                                                className="sd-item-img"
                                                                src={`${IMAGE_BASE_URL}/${item.material.toLowerCase()}.png`}
                                                                alt={item.displayName}
                                                                onError={e => { e.target.onerror = null; e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                                                            />
                                                            <span className="sd-item-name">{item.displayName}</span>
                                                            {item.state && (
                                                                <span
                                                                    className="sd-item-state"
                                                                    style={{ color: stateCol, background: stateCol + '15' }}
                                                                >
                                                                    {item.state}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StatisticsDashboard;