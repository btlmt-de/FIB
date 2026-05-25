import React, { useState, useEffect } from 'react';
import Footer from "../components/common/Footer.jsx";

// ── Constants ─────────────────────────────────────────────────────────────────

const IMG = 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib';

import { COLORS } from '../config/constants';

// Map COLORS to the local names used throughout this file
const COL = {
    amber:  COLORS.accent,
    green:  COLORS.green,
    cyan:   COLORS.cyan,
    purple: COLORS.purple,
    red:    COLORS.red,
    orange: COLORS.orange,
    rare:   COLORS.accent,
};

// ── Data ──────────────────────────────────────────────────────────────────────

const LOOT_TABLES = {
    honey: {
        name: 'Nature Room',
        color: COL.amber,
        description: 'A sanctuary filled with floral treasures',
        pools: [
            {
                rolls: '3–7 rolls',
                items: [
                    { name: 'Pitcher Plant',  texture: 'pitcher_plant',  chance: '3.23%' },
                    { name: 'Lilac',          texture: 'lilac',          chance: '16.13%' },
                    { name: 'Peony',          texture: 'peony',          chance: '16.13%' },
                    { name: 'Sunflower',      texture: 'sunflower',      chance: '16.13%' },
                    { name: 'Feather',        texture: 'feather',        chance: '16.13%' },
                    { name: 'Oxeye Daisy',   texture: 'oxeye_daisy',    chance: '16.13%' },
                    { name: 'Apple',          texture: 'apple',          chance: '16.13%' },
                ],
            },
            {
                rolls: '1 roll (bonus)',
                items: [
                    { name: 'Honey Bottle',    texture: 'honey_bottle',    chance: '2.33%' },
                    { name: 'Honeycomb Block', texture: 'honeycomb_block', chance: '2.33%' },
                    { name: 'Grass Block',     texture: 'grass_block',     chance: '2.33%' },
                ],
            },
        ],
    },
    legendary: {
        name: 'Storage',
        color: COL.purple,
        description: 'The ultimate treasure trove with rare templates',
        pools: [
            {
                rolls: '5–10 rolls',
                items: [
                    { name: 'Wheat',            texture: 'wheat',            chance: '10.50%' },
                    { name: 'Bone Meal',         texture: 'bone_meal',        chance: '10.50%' },
                    { name: 'Brick',             texture: 'brick',            chance: '10.50%' },
                    { name: 'Glow Berries',      texture: 'glow_berries',     chance: '10.50%' },
                    { name: 'Clay Ball',         texture: 'clay_ball',        chance: '10.50%' },
                    { name: 'Copper Ingot',      texture: 'copper_ingot',     chance: '10.50%' },
                    { name: 'Leather Boots',     texture: 'leather_boots',    chance: '10.50%', note: 'Lv30 Enchanted' },
                    { name: 'Egg',               texture: 'egg',              chance: '10.00%' },
                    { name: 'Rabbit Hide',       texture: 'rabbit_hide',      chance: '4.50%' },
                    { name: 'Slime Ball',        texture: 'slime_ball',       chance: '4.50%' },
                    { name: 'Gold Ingot',        texture: 'gold_ingot',       chance: '3.00%' },
                    { name: 'Totem of Undying',  texture: 'totem_of_undying', chance: '1.00%' },
                    { name: 'Rabbit Foot',       texture: 'rabbit_foot',      chance: '1.00%' },
                    { name: 'Wild Armor Trim',   texture: 'wild_armor_trim_smithing_template',    chance: '0.50%', legendary: true },
                    { name: 'Dune Armor Trim',   texture: 'dune_armor_trim_smithing_template',    chance: '0.50%', legendary: true },
                    { name: 'Sentry Armor Trim', texture: 'sentry_armor_trim_smithing_template',  chance: '0.50%', legendary: true },
                    { name: 'Netherite Upgrade', texture: 'netherite_upgrade_smithing_template',  chance: '0.50%', legendary: true },
                    { name: 'Snout Armor Trim',  texture: 'snout_armor_trim_smithing_template',   chance: '0.50%', legendary: true },
                ],
            },
        ],
    },
    parkour: {
        name: 'Lava Parkour',
        color: COL.cyan,
        description: 'Complete the challenge for a 10% shot at a music disc',
        pools: [
            {
                rolls: '1 roll',
                note: '10% total chance for any disc',
                items: [
                    { name: 'Music Disc (Pigstep)',   texture: 'music_disc_pigstep',   chance: '1.67%', legendary: true },
                    { name: 'Music Disc (Otherside)', texture: 'music_disc_otherside', chance: '1.67%', legendary: true },
                    { name: 'Music Disc (Relic)',     texture: 'music_disc_relic',     chance: '1.67%', legendary: true },
                    { name: 'Music Disc (13)',         texture: 'music_disc_13',        chance: '1.67%', legendary: true },
                    { name: 'Music Disc (Cat)',        texture: 'music_disc_cat',       chance: '1.67%', legendary: true },
                    { name: 'Music Disc (Tears)',      texture: 'music_disc_wait',      chance: '1.67%', legendary: true },
                ],
            },
        ],
    },
    treasure: {
        name: 'Treasure Room',
        color: COL.green,
        description: 'A bounty of resources and rare saplings',
        pools: [
            {
                rolls: '5–10 rolls',
                items: [
                    { name: 'Iron Ingot',          texture: 'iron_ingot',          chance: '9.48%',  note: '2–3' },
                    { name: 'Cocoa Beans',         texture: 'cocoa_beans',         chance: '9.48%',  note: '1–3' },
                    { name: 'Leather',             texture: 'leather',             chance: '9.48%',  note: '1–2' },
                    { name: 'String',              texture: 'string',              chance: '9.48%' },
                    { name: 'Dirt',                texture: 'dirt',                chance: '9.48%',  note: '8–16' },
                    { name: 'Cobbled Deepslate',   texture: 'cobbled_deepslate',   chance: '9.48%',  note: '4–8' },
                    { name: 'Coal',                texture: 'coal',                chance: '9.48%',  note: '3–7' },
                    { name: 'Leather Helmet',      texture: 'leather_helmet',      chance: '8.02%',  note: 'Lv30 Ench' },
                    { name: 'Ender Pearl',         texture: 'ender_pearl',         chance: '6.46%' },
                    { name: 'Diamond',             texture: 'diamond',             chance: '4.79%' },
                    { name: 'Golden Apple',        texture: 'golden_apple',        chance: '4.69%',  note: '"Gros Michel"' },
                    { name: 'Enchanted Book',      texture: 'enchanted_book',      chance: '3.23%' },
                    { name: 'Pale Oak Sapling',    texture: 'pale_oak_sapling',    chance: '1.25%' },
                    { name: 'Acacia Sapling',      texture: 'acacia_sapling',      chance: '1.25%' },
                    { name: 'Jungle Sapling',      texture: 'jungle_sapling',      chance: '1.25%' },
                    { name: 'Cherry Sapling',      texture: 'cherry_sapling',      chance: '1.25%' },
                    { name: 'Mangrove Propagule',  texture: 'mangrove_propagule',  chance: '1.25%' },
                    { name: 'Anvil',               texture: 'anvil',               chance: '0.10%',  legendary: true, note: '"SILK TOUCH BABY"' },
                    { name: 'Ench. Golden Apple',  texture: 'enchanted_golden_apple', chance: '0.10%', legendary: true, note: '"Cavendish"' },
                ],
            },
        ],
    },
};

const RECIPES = {
    antimatter: {
        normal: {
            recipe: [[null,'nether_brick',null],['glowstone_dust','quartz','glowstone_dust'],[null,'nether_brick',null]],
            result: 'knowledge_book', name: 'Antimatter Locator',
        },
        hard: {
            recipe: [['nether_brick','glowstone_dust','nether_brick'],['quartz','ender_eye','quartz'],['nether_brick','glowstone_dust','nether_brick']],
            result: 'knowledge_book', name: 'Antimatter Locator',
        },
    },
    trial: {
        normal: {
            recipe: [['chiseled_copper','glass','chiseled_copper'],['glass','compass','glass'],['gold_ingot','gold_ingot','gold_ingot']],
            result: 'wither_rose', name: 'Trial Locator',
        },
        hard: {
            recipe: [['obsidian','copper_ingot','obsidian'],['gold_ingot','compass','iron_ingot'],['obsidian','diamond','obsidian']],
            result: 'wither_rose', name: 'Trial Locator',
        },
    },
};

const QUICK_LINKS = [
    { id: 'antimatter-depths', label: 'Antimatter Depths',   color: COL.purple },
    { id: 'trial-locator',     label: 'Trial Locator',        color: COL.amber  },
    { id: 'loot-tables',       label: 'Loot Tables',          color: COL.green  },
    { id: 'end-generation',    label: 'End Generation',       color: COL.purple },
    { id: 'teleporter',        label: 'Teleporter',           color: COL.red    },
    { id: 'wandering-trader',  label: 'Wandering Trader',     color: COL.cyan   },
];

// ── Loot simulation logic ─────────────────────────────────────────────────────

function simulateLoot(table) {
    const results = [];
    for (const pool of table.pools) {
        const m = pool.rolls.match(/(\d+)(?:–(\d+))?/);
        if (!m) continue;
        const min = parseInt(m[1]), max = m[2] ? parseInt(m[2]) : min;
        const rolls = Math.floor(Math.random() * (max - min + 1)) + min;
        const items = pool.items.map(i => ({ ...i, weight: parseFloat(i.chance) }));
        const total = items.reduce((s, i) => s + i.weight, 0);
        for (let r = 0; r < rolls; r++) {
            let cum = 0, roll = Math.random() * total;
            for (const item of items) {
                cum += item.weight;
                if (roll < cum) {
                    if (item.name.toLowerCase() !== 'nothing') results.push(item);
                    break;
                }
            }
        }
    }
    return results;
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800;900&display=swap');

  .cs {
    font-family: 'Barlow', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    background: oklch(17% 0.025 255);
    color: oklch(94% 0.007 255);
    min-height: 100vh; display: flex; flex-direction: column;
  }
  .cs-shell { max-width: 860px; margin: 0 auto; padding: 0 28px; width: 100%; box-sizing: border-box; }
  .cs-rule  { height: 1px; background: oklch(19% 0.019 255); }

  /* ── Page header ── */
  .cs-header { padding: 80px 0 64px; }
  .cs-eyebrow {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;
    color: oklch(76% 0.16 68); margin: 0 0 14px;
  }
  .cs-h1 {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: clamp(44px, 6.5vw, 76px); font-weight: 800;
    line-height: 0.95; letter-spacing: -0.5px; text-transform: uppercase;
    color: oklch(94% 0.007 255); margin: 0 0 18px;
  }
  .cs-sub { font-size: 15.5px; color: oklch(52% 0.013 255); max-width: 520px; line-height: 1.72; margin: 0 0 32px; }

  /* Quick links */
  .cs-quicklinks { display: flex; flex-wrap: wrap; gap: 6px; }
  .cs-ql {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 12px;
    background: transparent;
    border-radius: 5px; border: 1px solid oklch(30% 0.019 255);
    font-family: 'Barlow', system-ui, sans-serif;
    font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
    color: oklch(50% 0.013 255); cursor: pointer;
    transition: color 0.12s ease-out, border-color 0.12s ease-out, background 0.12s ease-out;
  }
  .cs-ql:hover { color: oklch(88% 0.009 255); border-color: oklch(32% 0.016 255); background: oklch(21% 0.023 255); }
  .cs-ql-dot { width: 6px; height: 6px; border-radius: 2px; flex-shrink: 0; }

  /* ── Article body ── */
  .cs-body { padding: 64px 0 80px; flex: 1; }

  /* intro prose */
  .cs-intro { margin-bottom: 48px; }
  .cs-p { font-size: 15px; color: oklch(54% 0.013 255); line-height: 1.82; margin: 0 0 16px; }
  .cs-p:last-child { margin-bottom: 0; }
  .cs-hi { color: oklch(80% 0.01 255); font-weight: 500; }

  /* ── Section ── */
  .cs-section { margin-bottom: 72px; scroll-margin-top: 80px; }
  .cs-section-head {
    display: flex; align-items: center; gap: 12px;
    padding-bottom: 16px; margin-bottom: 24px;
    border-bottom: 1px solid oklch(19% 0.019 255);
  }
  .cs-section-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
  .cs-h2 {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: clamp(22px, 3vw, 30px); font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.2px;
    color: oklch(94% 0.007 255); margin: 0;
  }

  /* Inline code */
  .cs-code {
    font-family: 'Courier New', monospace; font-size: 12.5px;
    color: oklch(70% 0.14 200);
    background: oklch(68% 0.12 200 / 0.09);
    border: 1px solid oklch(68% 0.12 200 / 0.18);
    border-radius: 4px; padding: 2px 7px;
  }

  /* ── Mode toggle ── */
  .cs-toggle {
    display: inline-flex; align-items: center; gap: 12px;
    padding: 10px 16px; margin-bottom: 24px;
    background: oklch(21% 0.023 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 7px;
  }
  .cs-toggle-label { font-size: 13px; font-weight: 500; transition: color 0.15s; }
  .cs-toggle-track {
    width: 40px; height: 22px; border-radius: 11px;
    border: none; cursor: pointer; position: relative;
    transition: background 0.15s ease-out; flex-shrink: 0;
  }
  .cs-toggle-knob {
    width: 16px; height: 16px; border-radius: 50%;
    background: oklch(94% 0.007 255);
    position: absolute; top: 3px;
    transition: left 0.15s ease-out;
  }

  /* ── Crafting grid ── */
  .cs-recipe {
    display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
    padding: 20px; background: oklch(21% 0.023 255);
    border: 1px solid oklch(30% 0.019 255); border-radius: 8px;
    margin-bottom: 20px;
  }
  .cs-recipe-grid {
    display: grid; grid-template-columns: repeat(3, 52px); gap: 5px;
  }
  .cs-recipe-cell {
    width: 52px; height: 52px; border-radius: 6px;
    background: oklch(17% 0.025 255);
    border: 1px solid oklch(30% 0.019 255);
    display: flex; align-items: center; justify-content: center;
    transition: border-color 0.12s ease-out, background 0.12s ease-out;
  }
  .cs-recipe-cell.has-item:hover { border-color: oklch(36% 0.016 255); background: oklch(23% 0.022 255); }
  .cs-recipe-cell img { width: 36px; height: 36px; image-rendering: pixelated; }
  .cs-recipe-arrow { font-size: 22px; color: oklch(42% 0.013 255); }
  .cs-recipe-result {
    width: 60px; height: 60px; border-radius: 7px;
    background: oklch(17% 0.025 255);
    display: flex; align-items: center; justify-content: center;
    border: 1px solid oklch(35% 0.016 255);
    transition: border-color 0.12s ease-out;
  }
  .cs-recipe-result:hover { border-color: oklch(50% 0.016 255); }
  .cs-recipe-result img { width: 40px; height: 40px; image-rendering: pixelated; }
  .cs-recipe-name { font-size: 14px; font-weight: 600; color: oklch(80% 0.01 255); }

  /* ── Loot tabs ── */
  .cs-loot-tabs { display: flex; border-bottom: 1px solid oklch(24% 0.022 255); margin-bottom: 24px; flex-wrap: wrap; }
  .cs-loot-tab {
    padding: 10px 18px;
    background: none; border: none; border-bottom: 2px solid transparent;
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    color: oklch(42% 0.013 255); cursor: pointer;
    transition: color 0.12s ease-out;
  }
  .cs-loot-tab.active { border-bottom-color: currentColor; }
  .cs-loot-tab:not(.active):hover { color: oklch(65% 0.011 255); }

  /* ── Loot items ── */
  .cs-pool-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .cs-pool-tag {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
    padding: 3px 9px; border-radius: 4px; border: 1px solid;
  }
  .cs-pool-note { font-size: 12px; color: oklch(42% 0.013 255); font-style: italic; }

  .cs-loot-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 28px; }
  .cs-loot-item {
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    width: 66px; cursor: default; position: relative;
  }
  .cs-loot-tile {
    width: 52px; height: 52px; border-radius: 7px;
    background: oklch(21% 0.023 255);
    border: 1px solid oklch(30% 0.019 255);
    display: flex; align-items: center; justify-content: center;
    transition: background 0.1s ease-out, border-color 0.1s ease-out;
  }
  .cs-loot-item:hover .cs-loot-tile { background: oklch(25.5% 0.021 255); border-color: oklch(35% 0.016 255); }
  .cs-loot-tile.rare      { border-color: oklch(76% 0.16 68 / 0.50); }
  .cs-loot-tile.legendary { border-color: oklch(62% 0.18 300 / 0.60); }
  .cs-loot-tile img { width: 36px; height: 36px; image-rendering: pixelated; }
  .cs-loot-pct { font-size: 10.5px; font-family: 'Courier New', monospace; font-variant-numeric: tabular-nums; }
  .cs-loot-tooltip {
    position: absolute; bottom: calc(100% + 8px); left: 50%;
    transform: translateX(-50%);
    background: oklch(20% 0.022 255);
    border: 1px solid oklch(34% 0.018 255);
    border-radius: 6px; padding: 7px 10px;
    white-space: nowrap; z-index: 100;
    font-size: 12px; color: oklch(80% 0.01 255);
    pointer-events: none;
    opacity: 0; transition: opacity 0.1s ease-out;
  }
  .cs-loot-item:hover .cs-loot-tooltip { opacity: 1; }
  .cs-loot-tooltip-note { font-size: 10.5px; color: oklch(50% 0.013 255); margin-top: 2px; }

  /* ── Chest button ── */
  .cs-chest-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .cs-chest-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 9px 16px; cursor: pointer;
    background: oklch(76% 0.16 68 / 0.10);
    border: 1px solid oklch(76% 0.16 68 / 0.35);
    border-radius: 7px;
    font-family: 'Barlow', system-ui, sans-serif;
    font-size: 13px; font-weight: 600;
    color: oklch(76% 0.16 68);
    transition: background 0.12s ease-out, border-color 0.12s ease-out;
  }
  .cs-chest-btn:hover:not(:disabled) { background: oklch(76% 0.16 68 / 0.18); border-color: oklch(76% 0.16 68 / 0.55); }
  .cs-chest-btn:disabled { opacity: 0.5; cursor: wait; }
  .cs-chest-btn img { width: 20px; height: 20px; image-rendering: pixelated; }

  /* ── Simulation result ── */
  .cs-result {
    padding: 20px; margin-top: 20px;
    background: oklch(15% 0.022 255);
    border: 1px solid oklch(30% 0.019 255);
    border-radius: 8px;
  }
  .cs-result-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .cs-result-title { font-size: 13.5px; font-weight: 600; color: oklch(80% 0.01 255); }
  .cs-reroll-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 5px 11px; cursor: pointer;
    background: none; border: 1px solid oklch(30% 0.019 255); border-radius: 5px;
    font-family: 'Barlow', system-ui, sans-serif;
    font-size: 11.5px; font-weight: 600; color: oklch(50% 0.013 255);
    transition: color 0.12s, border-color 0.12s;
  }
  .cs-reroll-btn:hover { color: oklch(88% 0.009 255); border-color: oklch(38% 0.016 255); }
  .cs-result-items { display: flex; flex-wrap: wrap; gap: 10px; }
  .cs-result-item {
    display: flex; flex-direction: column; align-items: center; gap: 4px; width: 56px;
  }
  .cs-result-tile {
    width: 44px; height: 44px; border-radius: 6px; position: relative;
    background: oklch(24% 0.022 255);
    border: 1px solid oklch(32% 0.019 255);
    display: flex; align-items: center; justify-content: center;
  }
  .cs-result-tile.rare      { border-color: oklch(76% 0.16 68 / 0.50); }
  .cs-result-tile.legendary { border-color: oklch(62% 0.18 300 / 0.60); }
  .cs-result-tile img { width: 28px; height: 28px; image-rendering: pixelated; }
  .cs-result-count {
    position: absolute; bottom: -3px; right: -3px;
    background: oklch(33% 0.018 255); color: oklch(88% 0.009 255);
    font-size: 10px; font-weight: 700;
    padding: 0 4px; border-radius: 3px;
    border: 1px solid oklch(30% 0.018 255);
  }
  .cs-result-name {
    font-size: 9.5px; color: oklch(45% 0.013 255);
    text-align: center; max-width: 56px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .cs-result-empty { color: oklch(42% 0.013 255); font-size: 13px; padding: 12px 0; }

  @media (max-width: 600px) {
    .cs-shell { padding: 0 20px; }
    .cs-header { padding: 60px 0 52px; }
    .cs-body   { padding: 48px 0 64px; }
  }
`;

// ── Sub-components ────────────────────────────────────────────────────────────

function ModeToggle({ value, onChange, offLabel, onLabel, onColor }) {
    return (
        <div className="cs-toggle">
            <span className="cs-toggle-label" style={{ color: !value ? 'oklch(88% 0.009 255)' : 'oklch(42% 0.013 255)' }}>
                {offLabel}
            </span>
            <button
                className="cs-toggle-track"
                onClick={() => onChange(!value)}
                style={{ background: value ? onColor : 'oklch(30% 0.019 255)' }}
            >
                <div className="cs-toggle-knob" style={{ left: value ? '21px' : '3px' }} />
            </button>
            <span className="cs-toggle-label" style={{ color: value ? onColor : 'oklch(42% 0.013 255)' }}>
                {onLabel}
            </span>
        </div>
    );
}

function CraftingGrid({ recipe, result, resultName, glowColor }) {
    return (
        <div className="cs-recipe">
            <div className="cs-recipe-grid">
                {recipe.flat().map((item, i) => (
                    <div key={i} className={`cs-recipe-cell${item ? ' has-item' : ''}`}
                         title={item?.replace(/_/g, ' ')}>
                        {item && (
                            <img src={`${IMG}/${item}.png`} alt={item}
                                 onError={e => { e.target.style.display = 'none'; }} />
                        )}
                    </div>
                ))}
            </div>
            <span className="cs-recipe-arrow">→</span>
            <div className="cs-recipe-result" title={resultName}
                 style={{ borderColor: glowColor + '55' }}>
                <img src={`${IMG}/${result}.png`} alt={resultName}
                     onError={e => { e.target.style.display = 'none'; }} />
            </div>
            <span className="cs-recipe-name">{resultName}</span>
        </div>
    );
}

function LootItem({ item }) {
    const chance = parseFloat(item.chance);
    const isLegendary = item.legendary || chance < 1;
    const isRare = !isLegendary && chance < 5;
    const pctColor = isLegendary ? COL.purple : isRare ? COL.rare : 'oklch(42% 0.013 255)';
    return (
        <div className="cs-loot-item">
            <div className={`cs-loot-tile${isLegendary ? ' legendary' : isRare ? ' rare' : ''}`}>
                <img src={`${IMG}/${item.texture}.png`} alt={item.name}
                     onError={e => { e.target.style.opacity = '0.3'; }} />
            </div>
            <span className="cs-loot-pct" style={{ color: pctColor }}>{item.chance}</span>
            <div className="cs-loot-tooltip">
                <div style={{ fontWeight: 600, color: pctColor }}>{item.name}</div>
                {item.note && <div className="cs-loot-tooltip-note">{item.note}</div>}
            </div>
        </div>
    );
}

function LootTableDisplay({ tables }) {
    const [activeRoom, setActiveRoom] = useState('honey');
    const [simResult, setSimResult]   = useState(null);
    const [simming, setSimming]       = useState(false);
    const table = tables[activeRoom];

    const openChest = () => {
        setSimming(true); setSimResult(null);
        setTimeout(() => { setSimResult(simulateLoot(table)); setSimming(false); }, 250);
    };

    return (
        <div>
            {/* Tabs + chest button row */}
            <div className="cs-chest-row">
                <div className="cs-loot-tabs" style={{ margin: 0, border: 'none' }}>
                    {Object.entries(tables).map(([key, t]) => (
                        <button
                            key={key}
                            className={`cs-loot-tab${activeRoom === key ? ' active' : ''}`}
                            onClick={() => { setActiveRoom(key); setSimResult(null); }}
                            style={{ color: activeRoom === key ? t.color : undefined }}
                        >
                            {t.name}
                        </button>
                    ))}
                </div>
                <button className="cs-chest-btn" onClick={openChest} disabled={simming}>
                    <img src={`${IMG}/chest.png`} alt="chest"
                         onError={e => { e.target.style.display = 'none'; }} />
                    {simming ? 'Opening...' : 'Open Chest'}
                </button>
            </div>

            {/* Room header */}
            <div style={{ marginBottom: 20 }}>
                <span style={{
                    fontFamily: "'Barlow Condensed', system-ui, sans-serif",
                    fontSize: 18, fontWeight: 800, textTransform: 'uppercase',
                    color: table.color,
                }}>
                    {table.name}
                </span>
                <span style={{ fontSize: 13, color: 'oklch(50% 0.013 255)', marginLeft: 12 }}>
                    {table.description}
                </span>
            </div>

            {/* Pools */}
            {table.pools.map((pool, pi) => (
                <div key={pi} style={{ marginBottom: pi < table.pools.length - 1 ? 28 : 0 }}>
                    <div className="cs-pool-head">
                        <span className="cs-pool-tag" style={{
                            color: table.color,
                            background: table.color + '12',
                            borderColor: table.color + '40',
                        }}>
                            {pool.rolls}
                        </span>
                        {pool.note && <span className="cs-pool-note">{pool.note}</span>}
                    </div>
                    <div className="cs-loot-grid">
                        {pool.items.map((item, idx) => <LootItem key={idx} item={item} />)}
                    </div>
                </div>
            ))}

            {/* Simulation result */}
            {simResult !== null && (
                <div className="cs-result">
                    <div className="cs-result-head">
                        <span className="cs-result-title">
                            Loot Result — {simResult.length} item{simResult.length !== 1 ? 's' : ''}
                        </span>
                        <button className="cs-reroll-btn" onClick={openChest}>↻ Open again</button>
                    </div>
                    {simResult.length === 0 ? (
                        <div className="cs-result-empty">The chest was empty. Try again!</div>
                    ) : (() => {
                        const grouped = Object.values(
                            simResult.reduce((acc, item) => {
                                if (!acc[item.name]) acc[item.name] = { ...item, count: 0 };
                                acc[item.name].count++;
                                return acc;
                            }, {})
                        ).sort((a, b) => b.count - a.count);
                        return (
                            <div className="cs-result-items">
                                {grouped.map((item, i) => {
                                    const c = parseFloat(item.chance);
                                    const leg = item.legendary || c < 1;
                                    const rare = !leg && c < 5;
                                    return (
                                        <div key={i} className="cs-result-item">
                                            <div className={`cs-result-tile${leg ? ' legendary' : rare ? ' rare' : ''}`}>
                                                <img src={`${IMG}/${item.texture}.png`} alt={item.name}
                                                     onError={e => { e.target.style.opacity = '0.3'; }} />
                                                {item.count > 1 && (
                                                    <span className="cs-result-count">×{item.count}</span>
                                                )}
                                            </div>
                                            <span className="cs-result-name">{item.name.split('(')[0].trim()}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}

function Section({ id, color, title, children }) {
    return (
        <section id={id} className="cs-section">
            <div className="cs-section-head">
                <div className="cs-section-dot" style={{ background: color }} />
                <h2 className="cs-h2">{title}</h2>
            </div>
            {children}
        </section>
    );
}

function P({ children }) {
    return <p className="cs-p">{children}</p>;
}
function Hi({ color, children }) {
    return <span className="cs-hi" style={color ? { color } : {}}>{children}</span>;
}
function Cmd({ children }) {
    return <code className="cs-code">{children}</code>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CustomStructures() {
    const [antimatterHard, setAntimatterHard] = useState(false);
    const [trialHard,      setTrialHard]      = useState(false);

    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get('to');
        if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }, []);

    return (
        <div className="cs">
            <style>{CSS}</style>

            <div className="cs-shell">
                {/* ── Header ── */}
                <div className="cs-header">
                    <p className="cs-eyebrow">World</p>
                    <h1 className="cs-h1">Custom Content</h1>
                    <p className="cs-sub">
                        Custom structures and items designed to make harder Minecraft content
                        accessible within short-round FIB gameplay.
                    </p>
                    <div className="cs-quicklinks">
                        {QUICK_LINKS.map(l => (
                            <button
                                key={l.id}
                                className="cs-ql"
                                onClick={() => document.getElementById(l.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            >
                                <span className="cs-ql-dot" style={{ background: l.color }} />
                                {l.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="cs-rule" />

            <div className="cs-shell">
                <div className="cs-body">

                    {/* Intro */}
                    <div className="cs-intro">
                        <P>
                            ForceItemBattle was originally designed for <Hi>short rounds</Hi> — not everyone
                            has time for longer sessions. This meant excluding harder items like those
                            from the End dimension.
                        </P>
                        <P>
                            Rather than leave out a significant part of Minecraft, we added custom structures
                            and items that make the world more accessible within shorter timeframes.
                        </P>
                    </div>

                    {/* ── Antimatter Depths ── */}
                    <Section id="antimatter-depths" color={COL.purple} title="Antimatter Depths">
                        <P>
                            Replaces the vanilla Stronghold as the gateway to the End.
                            Spawns at <Hi>Y‑level −10</Hi> and provides a much faster route to the End dimension.
                        </P>
                        <P>To find it, craft an <Hi color={COL.cyan}>Antimatter Locator</Hi>:</P>
                        <ModeToggle
                            value={antimatterHard}
                            onChange={setAntimatterHard}
                            offLabel="Standard"
                            onLabel="Hard Mode"
                            onColor={COL.orange}
                        />
                        <CraftingGrid
                            recipe={antimatterHard ? RECIPES.antimatter.hard.recipe : RECIPES.antimatter.normal.recipe}
                            result={RECIPES.antimatter.normal.result}
                            resultName={RECIPES.antimatter.normal.name}
                            glowColor={COL.purple}
                        />
                        <P>
                            Right-click the locator to receive coordinates and a visual trail. Dig straight down
                            to find multiple loot rooms and an activated End Portal.
                        </P>
                        <P><Hi color="oklch(50% 0.013 255)">View in-game:</Hi> <Cmd>/info antimatter_locator</Cmd></P>
                    </Section>

                    {/* ── Trial Locator ── */}
                    <Section id="trial-locator" color={COL.amber} title="Trial Chambers Locator">
                        <P>Trial Chambers (vanilla structure) also have a custom locator for easier discovery:</P>
                        <ModeToggle
                            value={trialHard}
                            onChange={setTrialHard}
                            offLabel="Standard"
                            onLabel="Hard Mode"
                            onColor={COL.orange}
                        />
                        <CraftingGrid
                            recipe={trialHard ? RECIPES.trial.hard.recipe : RECIPES.trial.normal.recipe}
                            result={RECIPES.trial.normal.result}
                            resultName={RECIPES.trial.normal.name}
                            glowColor={COL.amber}
                        />
                        <P>Works identically to the Antimatter Locator: right-click for coordinates and a trail.</P>
                        <P><Hi color="oklch(50% 0.013 255)">View in-game:</Hi> <Cmd>/info trial_locator</Cmd></P>
                    </Section>

                    {/* ── Locator Mechanics ── */}
                    <Section id="locator-mechanics" color={COL.cyan} title="Locator Mechanics">
                        <P>Both locators share the same mechanics:</P>
                        <P>
                            If another player already marked the same structure,{' '}
                            <Hi color={COL.green}>your locator won't be consumed</Hi> — you can keep searching
                            until you find an unclaimed one. You can still enter claimed structures; this just
                            helps you find unlooted ones.
                        </P>
                        <P>
                            <Hi color={COL.orange}>Hard Mode recipes</Hi> (toggle above) are used in the 2 Hour
                            Version, requiring more complex ingredients for a greater challenge.
                        </P>
                    </Section>

                    {/* ── Loot Tables ── */}
                    <Section id="loot-tables" color={COL.green} title="Antimatter Depths Loot">
                        <P>
                            The Antimatter Depths contains four distinct loot rooms.
                            Hover items to see their drop chance, or open a chest to simulate a roll.
                        </P>
                        <LootTableDisplay tables={LOOT_TABLES} />
                    </Section>

                    {/* ── End Generation ── */}
                    <Section id="end-generation" color={COL.purple} title="Custom End Generation">
                        <P>
                            The End dimension is redesigned for better pacing. The surface is completely solid
                            with <Hi>no void gaps</Hi>, and End City spawn rates have been increased for
                            faster access to end-game loot.
                        </P>
                    </Section>

                    {/* ── Teleporter ── */}
                    <Section id="teleporter" color={COL.red} title="Antimatter Teleporter">
                        <P>
                            A custom structure that generates randomly in the Overworld.
                            Unlike other custom structures, it <Hi>cannot be located</Hi> — you'll have to stumble upon it.
                        </P>
                        <P>
                            Entering the teleporter transports you{' '}
                            <Hi>5,000 – 10,000 blocks</Hi> away in a random direction. Useful if you're hunting
                            for a specific biome and your current area isn't cooperating.
                        </P>
                        <P>
                            Below the portal is a hidden room with a chest.
                            There's a <Hi color={COL.amber}>50% chance</Hi> it contains a{' '}
                            <a href="wheel" style={{ color: COL.amber, textDecoration: 'none', fontWeight: 500 }}>Wheel of Fortune</a> —
                            a special item that grants one random item when used.
                        </P>
                    </Section>

                    {/* ── Wandering Trader ── */}
                    <Section id="wandering-trader" color={COL.cyan} title="Custom Wandering Trader">
                        <P>
                            Spawns every <Hi>7–10 minutes</Hi> near the spawn area. When it appears,
                            coordinates are displayed in chat and the tab list.
                        </P>
                        <P>
                            All trades are vanilla items but cost only <Hi color={COL.green}>1 Emerald</Hi> each.
                            The trader also sells a{' '}
                            <a href="wheel" style={{ color: COL.amber, textDecoration: 'none', fontWeight: 500 }}>Wheel of Fortune</a>{' '}
                            for 1 Emerald (limited to one per player per trader).
                        </P>
                    </Section>

                </div>
            </div>

            <Footer />
        </div>
    );
}