import React, { useState, useEffect, useMemo, useCallback } from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import { COLORS } from './UIComponents.jsx';

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

// Get category info by ID
function getCategoryInfo(categoryId) {
    const category = CATEGORY_CONFIG.find(c => c.id === categoryId);
    if (category) {
        return category;
    }
    return { id: 'other', name: 'Other', color: COLORS.textMuted };
}

// Bar component for visualizing distribution (hoisted outside to prevent recreation)
function DistributionBar({ data, total, showPercentage = true }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.map(({ label, value, color }) => {
                const percentage = total > 0 ? (value / total * 100) : 0;
                return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '80px', fontSize: '12px', color: COLORS.text, fontWeight: '500' }}>
                            {label}
                        </div>
                        <div style={{ flex: 1, height: '20px', background: COLORS.bgLighter, borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${percentage}%`,
                                height: '100%',
                                background: color,
                                borderRadius: '4px',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                        <div style={{ width: '70px', fontSize: '12px', color: COLORS.textMuted, textAlign: 'right' }}>
                            {value} {showPercentage && `(${percentage.toFixed(1)}%)`}
                        </div>
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

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}
             onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{
                background: COLORS.bg,
                borderRadius: '12px',
                width: '100%',
                maxWidth: '1000px',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <BarChart3 size={24} style={{ color: COLORS.accent }} />
                        <div>
                            <h2 style={{ margin: 0, fontSize: '18px', color: COLORS.text }}>Pool Statistics</h2>
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: COLORS.textMuted }}>
                                Distribution analysis of {total} pool items
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: COLORS.textMuted,
                            cursor: 'pointer',
                            padding: '8px'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px', overflow: 'auto', flex: 1 }}>
                    {/* Top row: State + Tag + Coverage */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                        {/* State Distribution */}
                        <div style={{
                            background: COLORS.bgLight,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '8px',
                            padding: '16px'
                        }}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', color: COLORS.text, fontWeight: '600' }}>
                                Unlock Timing
                            </h3>
                            <DistributionBar
                                data={[
                                    { label: 'Early', value: stateStats.EARLY, color: COLORS.early },
                                    { label: 'Mid', value: stateStats.MID, color: COLORS.mid },
                                    { label: 'Late', value: stateStats.LATE, color: COLORS.late },
                                ]}
                                total={total}
                            />
                        </div>

                        {/* Tag Distribution */}
                        <div style={{
                            background: COLORS.bgLight,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '8px',
                            padding: '16px'
                        }}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', color: COLORS.text, fontWeight: '600' }}>
                                Special Tags
                            </h3>
                            <DistributionBar
                                data={[
                                    { label: 'Nether', value: tagStats.NETHER, color: COLORS.nether },
                                    { label: 'End', value: tagStats.END, color: COLORS.end },
                                    { label: 'Extreme', value: tagStats.EXTREME, color: COLORS.extreme },
                                ]}
                                total={total}
                            />
                        </div>

                        {/* Coverage Summary */}
                        <div style={{
                            background: COLORS.bgLight,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '8px',
                            padding: '16px'
                        }}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', color: COLORS.text, fontWeight: '600' }}>
                                Coverage
                            </h3>
                            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: '700', color: COLORS.accent }}>
                                        {((total + totalMissing) > 0 ? (total / (total + totalMissing)) * 100 : 0).toFixed(1)}%
                                    </div>
                                    <div style={{ fontSize: '10px', color: COLORS.textMuted, textTransform: 'uppercase' }}>
                                        In Pool
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: '700', color: COLORS.text }}>
                                        {total}
                                    </div>
                                    <div style={{ fontSize: '10px', color: COLORS.textMuted, textTransform: 'uppercase' }}>
                                        Pool Items
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: '700', color: COLORS.textMuted }}>
                                        {totalMissing}
                                    </div>
                                    <div style={{ fontSize: '10px', color: COLORS.textMuted, textTransform: 'uppercase' }}>
                                        Missing
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Categories Section - Full Width */}
                    <div style={{
                        background: COLORS.bgLight,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '8px',
                        padding: '16px'
                    }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: COLORS.text, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Items by Category
                            {!tagsLoading && !tagsError && (
                                <span style={{ fontWeight: '400', color: COLORS.textMuted, fontSize: '12px' }}>
                                    (click to expand)
                                </span>
                            )}
                            {tagsLoading ? (
                                <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite', color: COLORS.textMuted }} />
                            ) : tagsError ? (
                                <span style={{
                                    fontSize: '10px',
                                    color: '#ef4444',
                                    background: '#ef444422',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontWeight: '500'
                                }}>
                                    Failed to Load
                                </span>
                            ) : tagCategoryMap ? (
                                <span style={{
                                    fontSize: '10px',
                                    color: COLORS.accent,
                                    background: COLORS.accent + '22',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontWeight: '500'
                                }}>
                                    Official Minecraft Tags
                                </span>
                            ) : null}
                        </h3>

                        {tagsLoading ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px 20px',
                                color: COLORS.textMuted
                            }}>
                                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                                <div style={{ fontSize: '13px' }}>Loading official Minecraft item tags...</div>
                            </div>
                        ) : tagsError ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px 20px',
                                color: COLORS.textMuted
                            }}>
                                <X size={24} style={{ marginBottom: '12px', color: '#ef4444' }} />
                                <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                                    Failed to load item tags from Minecraft data repository
                                </div>
                                <div style={{ fontSize: '11px', opacity: 0.7 }}>
                                    Category data is unavailable. Please try again later.
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {categoryData.map(({ id, name, count, color, items: catItems }) => {
                                    const isExpanded = expandedCategories.has(id);
                                    const percentage = total > 0 ? (count / total * 100) : 0;
                                    const maxCount = categoryData[0]?.count || 1;
                                    const barWidth = (count / maxCount * 100);

                                    return (
                                        <div key={id}>
                                            {/* Category Row */}
                                            <div
                                                onClick={() => toggleCategory(id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '8px 10px',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    background: isExpanded ? COLORS.bgLighter : 'transparent',
                                                    transition: 'background 0.15s'
                                                }}
                                                onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = COLORS.bg; }}
                                                onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
                                            >
                                                <ChevronDown
                                                    size={14}
                                                    style={{
                                                        color: COLORS.textMuted,
                                                        transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                                        transition: 'transform 0.15s',
                                                        flexShrink: 0
                                                    }}
                                                />
                                                <div style={{
                                                    width: '12px',
                                                    height: '12px',
                                                    borderRadius: '2px',
                                                    background: color,
                                                    flexShrink: 0
                                                }} />
                                                <div style={{
                                                    width: '140px',
                                                    fontSize: '12px',
                                                    color: COLORS.text,
                                                    fontWeight: '500',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {name}
                                                </div>
                                                <div style={{ flex: 1, height: '16px', background: COLORS.bg, borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{
                                                        width: `${barWidth}%`,
                                                        height: '100%',
                                                        background: color + '66',
                                                        borderRadius: '3px'
                                                    }} />
                                                </div>
                                                <div style={{ width: '80px', fontSize: '12px', color: COLORS.textMuted, textAlign: 'right' }}>
                                                    {count} ({percentage.toFixed(1)}%)
                                                </div>
                                            </div>

                                            {/* Expanded Items List */}
                                            {isExpanded && (
                                                <div style={{
                                                    marginLeft: '34px',
                                                    marginTop: '4px',
                                                    marginBottom: '8px',
                                                    padding: '12px',
                                                    background: COLORS.bg,
                                                    borderRadius: '6px',
                                                    border: `1px solid ${COLORS.border}`
                                                }}>
                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                                        gap: '6px',
                                                        maxHeight: '300px',
                                                        overflow: 'auto'
                                                    }}>
                                                        {catItems.map(item => (
                                                            <div
                                                                key={item.material}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    padding: '6px 8px',
                                                                    background: COLORS.bgLight,
                                                                    borderRadius: '4px',
                                                                    fontSize: '11px'
                                                                }}
                                                            >
                                                                <img
                                                                    src={`${IMAGE_BASE_URL}/${item.material.toLowerCase()}.png`}
                                                                    alt={item.displayName}
                                                                    style={{
                                                                        width: '20px',
                                                                        height: '20px',
                                                                        imageRendering: 'pixelated',
                                                                        flexShrink: 0
                                                                    }}
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src = `${IMAGE_BASE_URL}/barrier.png`;
                                                                    }}
                                                                />
                                                                <span style={{
                                                                    color: COLORS.text,
                                                                    flex: 1,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                {item.displayName}
                                                            </span>
                                                                <span style={{
                                                                    color: COLORS[item.state?.toLowerCase()] || COLORS.textMuted,
                                                                    fontSize: '9px',
                                                                    fontWeight: '600',
                                                                    padding: '2px 5px',
                                                                    background: (COLORS[item.state?.toLowerCase()] || COLORS.textMuted) + '22',
                                                                    borderRadius: '3px',
                                                                    flexShrink: 0
                                                                }}>
                                                                {item.state}
                                                            </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StatisticsDashboard;