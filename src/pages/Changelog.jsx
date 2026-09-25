import React, { useMemo } from 'react';
import Footer from "../components/common/Footer.jsx";

import { COLORS as C } from '../config/constants';

// ── Type config ───────────────────────────────────────────────────────────────
const TYPE = {
    major:   { color: C.amber, label: 'Major Release', dotSize: 14 },
    feature: { color: C.green, label: 'Feature',       dotSize: 10 },
    update:  { color: C.blue,  label: 'Update',        dotSize: 10 },
    fix:     { color: C.red,   label: 'Bug Fix',       dotSize: 10 },
};

// ── Data ──────────────────────────────────────────────────────────────────────
// Rebuilt from the plugin's history (McPlayHDnet/ForceItemBattle): from 2.9.0 on, every
// version is the one the plugin's build actually carried, dated by the first GitHub release
// that shipped the change. The build number sat at 3.0.1 from July to November 2024 and
// skipped 3.3-3.5, so 3.0.2-3.0.6 are this page's own labels for the releases in between.
// Before the June 2024 release automation there were no real version numbers at all, so
// 1.0.0-2.7.0 are milestone labels dated by their commits.
const CHANGELOG = [
    { version:'26.9.3', date:'25th September 2026', type:'fix',     title:'Ceremony Polish & Fixes', description:'Polished the result ceremony and fixed a batch of round and team bugs', changes:['Added more stats to the result screen', 'Polished the result ceremony and lowered its volume', 'Op transparency now only reports commands used by operators', '/skip now only replaces the targeted player\'s item', 'Round results are now recorded for participants who are offline when the round ends', '/start is refused while a round is running', 'Skip votes no longer skip a replaced item or resolve during a pause or after the round', '/bed and /spawn are refused while the game is paused', 'Respawning no longer hands out backpacks when they are disabled', 'Fixed several team bugs: refused invites, players listed on their old team, colliding team ids and spectators being put into auto-teams'] },
    { version:'26.9.2', date:'24th September 2026', type:'feature', title:'Result Ceremony & Fair Play', description:'A new result reveal and client mod detection', changes:['Reworked the result reveal into a new ceremony', 'Added detection for Freecam and Xaero\'s Minimap, listed for operators via /checkmods', 'Commands used by operators during a round are now announced in chat', 'Rebalanced the new 26.3 items', 'Moved the Sulfur Cube Bucket out of the "Stone & Bricks" collection category', 'Fixed interactions while the game is paused'] },
    { version:'26.9.1', date:'22nd September 2026', type:'update',  title:'26.3',                    description:'Added full 26.3 support', changes:['Added the new 26.3 items to the item pools: the poplar wood set, cushions, wool and concrete slabs & stairs, and all explorer maps', 'Added a new collection book category for maps', 'Added the Dappled Forest as a spawn biome for /reset', 'Fixed back-to-back chain odds being attached to the previous find instead of the current one'] },
    { version:'26.8.5', date:'18th September 2026', type:'update',  title:'Under the Hood',          description:'Locator improvements and a large code clean up', changes:['The Sulfur Locator now scans caves to find sulfur biomes underground', 'Locators now point to the actually nearest structure (works around Minecraft bug MC-138887)', 'Faster structure searches', 'Fixed /bp', 'Fixed the LEGENDARY achievement and achievements with an apostrophe in their name', 'Added an automated test suite and a wide-range code clean up'] },
    { version:'26.8.4', date:'30th August 2026',    type:'fix',     title:'Team Pairings',           description:'Team pairing history now has its own config', changes:['The pairing history moved into its own file so config updates can no longer wipe it'] },
    { version:'26.8.3', date:'29th August 2026',    type:'feature', title:'Fresh Teams',             description:'Random teams avoid repeating pairs', changes:['Team creation now avoids pairs that already played together in previous rounds', 'Fixed back-to-back rarity not being shared within a team', 'Fixed spectators counting towards teleporter stats'] },
    { version:'26.8.2', date:'6th August 2026',     type:'major',   title:'Antimatter Depths Rework', description:'Reworked the Antimatter Depths', changes:['Open a private portal to the Antimatter Depths in the overworld ruin with a Totem of Antimatter', 'Entering the End now uses the new structure', 'Fixed the Eye of Antimatter', 'Reverted the latest changes to the Antimatter Locator recipe'] },
    { version:'26.8.1', date:'3rd August 2026',     type:'feature', title:'Eye of Antimatter',       description:'Added the Eye of Antimatter and a Trail Ruins locator', changes:['Added the Eye of Antimatter as a Cleric trade, needed for the new Antimatter Locator recipe', 'Added the Kiln-Fired Brush, a locator for Trail Ruins that only works on soil', 'Added the Trail Ruins items back into the late pool'] },
    { version:'26.7.9', date:'2nd August 2026',     type:'update',  title:'Clean up & QOL additions', description:'Quality of life improvements and bug fixes', changes:['The result screen now shows who found each item in team games', 'Added a timer for the PointHunt event', 'Added a world clock to the tab list', 'Fixed a critical bug on game start', 'Fixed a visual bug in /forceteam'] },
    { version:'26.7.8', date:'30th July 2026',      type:'feature', title:'PointHunt',               description:'Added PointHunt as a random event', changes:['Added PointHunt as a random event', 'Teleporters can now be used after the game has ended', 'Fixed the wandering trader respawning too early'] },
    { version:'26.7.7', date:'28th July 2026',      type:'update',  title:'Pause & Locators',        description:'Reworked locator visuals and fixed pausing', changes:['Multiple quality of life additions for locators and their particle lines', 'The link to the match stats now gets posted when the result is revealed', 'Mobs no longer target players and the weather no longer changes while paused', 'The wandering trader timer now pauses with the game', 'Fixed scoring an item via /info', 'Fixed custom items not displaying correctly on the result screen'] },
    { version:'26.7.6', date:'25th July 2026',      type:'update',  title:'Stats',                   description:'Final preparations for the stats website', changes:['Finalised the data sent to the stats website', 'Rebalanced some items'] },
    { version:'26.7.5', date:'22nd July 2026',      type:'feature', title:'Lead Tracker',            description:'Added the lead tracker', changes:['Added a lead tracker', 'Added a category for collection achievements', 'The item pool and achievement list are now published for the website', 'Various collection book fixes'] },
    { version:'26.7.4', date:'19th July 2026',      type:'major',   title:'Collection Book',         description:'Added the Collection Book', changes:['Added the collection book with categories, filters and item details, opened via command or item', 'Added a collection achievement', 'Started recording match history', 'Rebalanced some items'] },
    { version:'26.7.3', date:'16th July 2026',      type:'update',  title:'Forced Seeds',            description:'Added forced seed on reset', changes:['Added an argument to the /reset command to force a specified biome as spawn biome for the next seed'] },
    { version:'26.7.2', date:'15th July 2026',      type:'feature', title:'Random Events',           description:'Added random events and global achievements', changes:['Added ItemHunt and SpecialTrader as events that can randomly occur during a game', 'Added global achievements alongside the round based ones', 'Leaderboards now always display names', 'Commands now tell non-op players when they lack permission', 'Rebalanced some items'] },
    { version:'26.7.1', date:'12th July 2026',      type:'major',   title:'Refactoring',             description:'Codebase in a fresh coat', changes:['Finished refactor of entire codebase', 'Changed versioning to year.month.update', 'Added team and achievement leaderboards', 'Added average items and back-to-backs per game to the stats', 'Added a notification and a tab list timer for item pool unlocks', 'Fixed various spectator related bugs'] },
    { version:'4.3.1',  date:'8th July 2026',       type:'feature', title:'Quickie Mode',            description:'Added quickie mode', changes:['Added a setting for quickie mode to control which item pools are active during a round', 'Added a setting to turn off achievements', 'Added /fixlocate and /stats reset', 'Fixed multiple achievement triggers'] },
    { version:'4.2.0',  date:'3rd July 2026',       type:'update',  title:'Achievements',            description:'Added achievements and the Sulfur Locator', changes:['Added 53 achievements', 'Added the Sulfur Locator as a custom trade for Cartographer villagers and to the item pools (6th July)', 'Fixed a spectator loop'] },
    { version:'4.1.0',  date:'22nd June 2026',      type:'update',  title:'Chaos Cubed',             description:'Added full 26.2 support', changes:['Added all 26.2 items, including the sulfur items', 'Added the Weathered Captain\'s Journal as a lootable item (30th June)', 'Added the Wheel of Fortune and the other custom items to the item pools (30th June)', 'Bigger tab list'] },
    { version:'4.0.0',  date:'15th May 2026',       type:'major',   title:'Stats',                   description:'Added player stats', changes:['Stats are now stored by the new FIB service, for solo and teams', 'Moved Calcite and Tinted Glass to the mid pool', 'Fixed an error when measuring distance between different dimensions'] },
    { version:'3.9.7',  date:'22nd April 2026',     type:'fix',     title:'World Reset',             description:'Fixed the world reset', changes:['The world is now deleted after the server has fully shut down, as the server keeps some files locked'] },
    { version:'3.9.6',  date:'21st April 2026',     type:'update',  title:'Tiny Takeover',           description:'Added full 26.1.2 support', changes:['Added the golden dandelion', 'Changed nametag from mid to early pool and adjusted its description', 'Migrated the world reset to the new 26.1 folder structure'] },
    { version:'3.9.5',  date:'16th January 2026',   type:'update',  title:'Mounts of Mayhem',        description:'Added full 1.21.11 support and overhauled the item list', changes:['Added all new 1.21.11 items', 'Improved readability and maintainability of the item list, now sorted alphabetically', 'Moved two pale items into the mid pool', 'Added some missing items and adjusted the difficulty of others'] },
    { version:'3.9.4',  date:'16th November 2025',  type:'fix',     title:'Adjusting Backpacks',     description:'Backpacks no longer count for bundle items', changes:['Players can not use their backpack anymore to fulfil a bundle item requirement', 'The result inventory can no longer be closed', 'Moved resin into the late pool', 'Added some missing items'] },
    { version:'3.9.3',  date:'23rd October 2025',   type:'feature', title:'Pale is Pain',            description:'Rebalanced the Pale Garden and gave every team a colour', changes:['Moved all pale items into the late pool', 'Every team now gets its own colour, backpacks included', 'Teams are disbanded when a player leaves before the game starts', 'The stone shovel is also given on respawn when keepInventory is disabled', 'Fixed the wandering trader not spawning again after despawning once'] },
    { version:'3.9.2',  date:'21st October 2025',   type:'feature', title:'Score & Tab List',        description:'Added a score setting and tab list info', changes:['Added a stone shovel to the start kit', 'Added a "Score" setting to show or hide the current score', 'The tab list now shows where the wandering trader is and when it despawns', 'Teammates now show in green in the tab list', 'The result screen now shows the rarity and odds of each back-to-back'] },
    { version:'3.9.1',  date:'16th October 2025',   type:'feature', title:'Back-to-Back Rarities',   description:'Reworked back-to-back odds with rarities, sounds and messages', changes:['Back-to-back odds now also consider your teammate', 'Added sounds and messages for back-to-back rarities', 'Added RARE and a new rarity for getting the same back-to-back item', 'The RNGESUS and LEGENDARY rarities play a sound for everyone on the server', 'Added a shout toggle', 'New scoreboard based tab list', 'Fixed hunger loss in pregame'] },
    { version:'3.9.0',  date:'13th October 2025',   type:'fix',     title:'Bug Fixes',               description:'Fixed back-to-back calculation and trader spawns', changes:['Fixed the back-to-back probability being calculated incorrectly', 'Spawn chunks are force loaded again, since 1.21.9 removed them', 'The pregame world border is removed in every dimension once the game starts'] },
    { version:'3.8.0',  date:'9th October 2025',    type:'update',  title:'The Copper Age',          description:'Added full 1.21.10 support', changes:['Added all new 1.21.10 items & descriptions', 'Added a custom banner inside the tab list header', 'Players can now move in pregame, inside a world border', 'Back-to-backs now also count items in bundles'] },
    { version:'3.7.0',  date:'4th July 2025',       type:'update',  title:'Run Battle',              description:'Added new game type: RUN Battle', changes:['Added a new setting to enable run battle', 'Added /voteskip to vote on skipping an item', 'Disabled the locator bar', 'Fixed the wandering trader'] },
    { version:'3.6.0',  date:'1st July 2025',       type:'update',  title:'1.21.5 - 1.21.7',         description:'Added full 1.21.5, 1.21.6 and 1.21.7 support', changes:['Added all new 1.21.5 items & descriptions, including the egg variants', 'Added all new 1.21.6 and 1.21.7 items, including every harness', 'Rebalanced the Lodestone', 'Added a shadow to item icons'] },
    { version:'3.2.0',  date:'17th March 2025',     type:'update',  title:'The Garden Awakens',      description:'Added full 1.21.4 support', changes:['Added all new 1.21.4 items', 'Added recipe views for colored bundles, the Trial Locator and the harder locator recipes to /info'] },
    { version:'3.1.0',  date:'27th November 2024',  type:'update',  title:'Harder Recipes & Bundles', description:'Added a setting for harder recipes & added bundles', changes:['Added a harder recipes setting for the locators', 'Added bundles to the item list', 'Teams are now shown before the game starts and in the tab list during the countdown', 'Fixed the Wheel of Fortune purchase limit'] },
    { version:'3.0.6',  date:'9th October 2024',    type:'feature', title:'Wheel of Fortune',        description:'Added the Wheel of Fortune', changes:['The wandering trader now sells the Wheel of Fortune', 'Added the vault spin for the Wheel of Fortune', 'Custom items now have names'] },
    { version:'3.0.5',  date:'20th September 2024', type:'update',  title:'Protection & End Teleport', description:'Added protection around the player\'s environment and a random End teleport', changes:['Added grief protection for containers, beds and furnaces', 'Added protection against TNT, lava and hoppers around protected blocks', 'Players get teleported to a random location when entering the End', 'Added forceable solo teams', 'Fixed dynamic item list timings', 'Fixed glowing effect inside the result inventory for skipped items', 'Fixed /items', 'Added missing copper variants'] },
    { version:'3.0.4',  date:'14th September 2024', type:'update',  title:'Event Settings',          description:'Polished the first big FIB event on McPlayHD.net', changes:['Added /forceteam', 'Advancements and item found messages are hidden during events', 'Players get their tools back on respawn when keepInventory is disabled', 'Jokers can no longer be used on containers', 'Fixed jokers being used when you jump on farmland', 'Rebalanced some items'] },
    { version:'3.0.3',  date:'12th September 2024', type:'update',  title:'TeamChat & Events',       description:'Added teamchat, spectating and an event setting', changes:['Added the ability to only chat with your team member', 'Added /spectate to switch into spectator mode when the game is finished', 'Added an "Event" setting: keepInventory for the first 5 minutes and some commands op-only', 'Jokers are fixed automatically on death when keepInventory is disabled', 'Added waxed and oxidized copper recipes to /info', 'Fixed item pool states for games longer than 50 minutes', 'Fixed a joker duplication bug', 'Removed all Trail Ruins items'] },
    { version:'3.0.2',  date:'9th August 2024',     type:'update',  title:'Phantoms',                description:'Removed phantoms', changes:['Phantoms can no longer spawn', 'Added an End setting', 'Removed the armor stand above players', 'Fixed the Nether being disabled together with End items', 'Rebalanced some items'] },
    { version:'3.0.0',  date:'27th July 2024',      type:'major',   title:'1.21',                    description:'Added full 1.21 support', changes:['Added all new 1.21 items & descriptions', 'Added the Trial Locator and added it to the mid pool', 'Locators now work dynamically', 'Stats overhaul with seasonal stats', 'Fixed the /top leaderboard'] },
    { version:'2.9.0',  date:'7th July 2024',       type:'fix',     title:'Locator Fix',             description:'Fixed the locator in the off hand', changes:['Fixed the locator item not being removed when held in the off hand'] },
    { version:'2.7.0',  date:'25th June 2024',      type:'update',  title:'Dynamic Item List v2',    description:'Changed how the unlocking of item pools gets calculated', changes:['Item pools now unlock at a percentage of the game time', 'The plugin is now built and released automatically', 'Fixed some achievements'] },
    { version:'2.6.0',  date:'22nd June 2024',      type:'update',  title:'Force Chain',             description:'Added ForceChain game mode', changes:['Added a setting for Force Chain: players see their current and next item simultaneously', 'Reworked achievements', 'Added a new spectator feature', 'Jokers can now be used while looking at blocks', 'Added /fixskips', 'Added your three most found items to the stats'] },
    { version:'2.5.0',  date:'14th June 2024',      type:'major',   title:'Item Pools & Achievements', description:'Added dynamic item pools and achievements', changes:['Items are split into Early, Mid and Late pools that unlock during the round', 'Added achievements', 'Skips are now called jokers', 'Back-to-back items are marked in the result inventory', 'Added back-to-back and win streak stats', 'Fixed back-to-back odds in teams and included shulker boxes'] },
    { version:'2.4.0',  date:'5th June 2024',       type:'update',  title:'Antimatter Depths',       description:'Added the Antimatter Depths and the Antimatter Locator', changes:['Added the Antimatter Depths as a replacement for the vanilla stronghold', 'Added the Antimatter Locator as craftable item and to the item list', 'Added a custom advancement and death message', 'Added an elytra gliding setting', 'Renamed the "Nether" setting to "Hard" and added most End items to normal mode'] },
    { version:'2.3.0',  date:'30th May 2024',       type:'update',  title:'Back-to-Back Odds',       description:'Added back-to-back percentages', changes:['Getting back-to-back items now shows how likely that was', 'All teams are shown in chat when the round starts'] },
    { version:'2.2.0',  date:'9th May 2024',        type:'update',  title:'Custom Trader',           description:'Customized the wandering trader\'s trades', changes:['The wandering trader now has custom trades', 'Fixed reconnecting in teams', 'Fixed rejoining while the game is paused'] },
    { version:'2.1.0',  date:'14th April 2024',     type:'update',  title:'Trading',                 description:'Added trading between players', changes:['Added /trade and /asktrade to trade items with other players', 'Added a wandering trader indicator', 'Overhauled the settings, including toggles for positions and trading', 'The pause message is now shown as a title'] },
    { version:'2.0.0',  date:'9th April 2024',      type:'major',   title:'Teams',                   description:'Moved to Paper and added team mode', changes:['Moved the plugin from Spigot to Paper', 'Added teams with shared items', 'Added logic for ties', 'A wandering trader now spawns during the round, the first after 7 to 10 minutes', '/top now shows 10 players', 'Fixed hunger while paused'] },
    { version:'1.7.0',  date:'28th March 2024',     type:'update',  title:'Item Icons',              description:'Added item icons', changes:['Your current item is now shown as an icon in the bossbar, tab list and chat', 'Added /help', 'Added the composter bonemeal recipe to /info'] },
    { version:'1.6.0',  date:'6th March 2024',      type:'update',  title:'Positions',               description:'Added the position system', changes:['Added /pos to save and share positions', 'Added an extreme item list', 'Added informative recipes to /info', 'Added /item <item> to view any item\'s recipe', 'Added /show to display your current item'] },
    { version:'1.5.0',  date:'28th February 2024',  type:'update',  title:'Stats & Presets',         description:'Added stats, a leaderboard and presets', changes:['Added player stats and the /top leaderboard', 'Added presets that can be created in /settings', 'Shulker boxes are now checked for your item', 'Recipes in /info are now paginated'] },
    { version:'1.4.0',  date:'11th February 2024',  type:'update',  title:'Settings & Pause',        description:'Added game settings and the pause feature', changes:['Added settings for the Nether, the End, PvP and faster random tick speed', 'Added the pause feature', 'Added /bed to teleport to your bed', 'Added pages to /result', 'Jokers can now be moved without duplicating'] },
    { version:'1.3.0',  date:'31st January 2024',   type:'update',  title:'Bug Fixes & Additions',   description:'Fixed many bugs & added core gameplay mechanics', changes:['Added a start kit', 'Added item found notification in chat', 'Added /spawn', 'Added a PvP setting', 'Added item descriptions to /info', 'Skipped items get highlighted in the result inventory', 'Players can no longer move before the game starts', 'Fixed joker duplication', 'Fixed moving backpacks and jokers'] },
    { version:'1.2.0',  date:'28th January 2024',   type:'update',  title:'Backpacks',               description:'Backpacks for solo players', changes:['Backpacks are now available in solo games as well', 'Added a start countdown'] },
    { version:'1.1.0',  date:'27th January 2024',   type:'update',  title:'New Features',            description:'Quality of Life improvements and new commands', changes:['Players can view all items with /items','Players can view the recipe of an item with /info','Players can view the minecraft.wiki site of an item with /infowiki'] },
    { version:'1.0.0',  date:'25th January 2024',   type:'major',   title:'Initial Release',         description:'The beginning of ForceItemBattle on McPlayHD.net.', changes:['First public release','Rebuilt the item list for 1.20, removing unobtainable items'] },
];

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800;900&display=swap');

  .cl {
    font-family: 'Barlow', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    background: oklch(17% 0.025 255);
    color: oklch(94% 0.007 255);
    min-height: 100vh; display: flex; flex-direction: column;
  }
  .cl-shell { max-width: 760px; margin: 0 auto; padding: 0 28px; width: 100%; box-sizing: border-box; }
  .cl-rule  { height: 1px; background: oklch(24% 0.022 255); }

  /* ── Header ── */
  .cl-header { padding: 80px 0 64px; }
  .cl-eyebrow {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;
    color: oklch(76% 0.16 68); margin: 0 0 14px;
  }
  .cl-h1 {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: clamp(44px, 6.5vw, 72px); font-weight: 800;
    line-height: 0.95; letter-spacing: -0.5px; text-transform: uppercase;
    color: oklch(94% 0.007 255); margin: 0 0 18px;
  }
  .cl-sub { font-size: 15.5px; color: oklch(52% 0.012 255); line-height: 1.72; margin: 0; }

  /* ── Timeline body ── */
  .cl-body { padding: 56px 0 80px; flex: 1; }

  /* ── Year divider ── */
  .cl-year {
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 36px;
  }
  .cl-year-label {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 13px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 3px;
    color: oklch(42% 0.013 255);
    white-space: nowrap;
  }
  .cl-year-line { flex: 1; height: 1px; background: oklch(24% 0.022 255); }

  /* ── Timeline track ── */
  .cl-track { display: flex; gap: 0; }
  .cl-spine {
    display: flex; flex-direction: column; align-items: center;
    width: 24px; flex-shrink: 0; padding-top: 3px;
  }
  .cl-dot {
    border-radius: 50%; flex-shrink: 0; position: relative; z-index: 1;
    border: 2px solid;
    transition: none;
  }
  .cl-dot.major { background: oklch(76% 0.16 68); border-color: oklch(76% 0.16 68); }
  .cl-dot.feature { background: oklch(17% 0.025 255); border-color: oklch(64% 0.20 142); }
  .cl-dot.update  { background: oklch(17% 0.025 255); border-color: oklch(65% 0.16 255); }
  .cl-dot.fix     { background: oklch(17% 0.025 255); border-color: oklch(62% 0.22 25); }
  .cl-line { width: 1px; flex: 1; background: oklch(26% 0.020 255); margin-top: 6px; }

  /* ── Entry ── */
  .cl-entry { flex: 1; padding: 0 0 40px 24px; min-width: 0; }
  .cl-entry.last { padding-bottom: 0; }

  .cl-meta {
    display: flex; align-items: center; gap: 10px;
    flex-wrap: wrap; margin-bottom: 10px;
  }
  .cl-version {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 12px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.5px;
    padding: 3px 9px; border-radius: 4px; border: 1px solid;
  }
  .cl-date { font-size: 12.5px; color: oklch(42% 0.013 255); }
  .cl-type-label {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 10.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1px;
    color: oklch(42% 0.013 255);
  }

  .cl-title {
    font-family: 'Barlow Condensed', system-ui, sans-serif;
    font-size: 20px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.2px;
    color: oklch(92% 0.007 255);
    margin: 0 0 6px;
  }
  .cl-title.major { font-size: 24px; color: oklch(76% 0.16 68); }

  .cl-desc { font-size: 13.5px; color: oklch(56% 0.012 255); line-height: 1.65; margin: 0 0 12px; }

  /* ── Changes list ── */
  .cl-changes {
    list-style: none; margin: 0; padding: 0;
    display: flex; flex-direction: column; gap: 4px;
  }
  .cl-change {
    display: flex; align-items: baseline; gap: 10px;
    font-size: 13px; color: oklch(70% 0.010 255); line-height: 1.6;
  }
  .cl-change::before {
    content: '—';
    color: oklch(36% 0.015 255);
    flex-shrink: 0; font-size: 11px;
  }

  @media (max-width: 600px) {
    .cl-shell { padding: 0 20px; }
    .cl-header { padding: 60px 0 52px; }
    .cl-body { padding: 40px 0 64px; }
    .cl-entry { padding-left: 16px; }
  }
`;

// ── Entry component ───────────────────────────────────────────────────────────

function Entry({ entry, isLast }) {
    const t = TYPE[entry.type] || TYPE.update;
    return (
        <div className="cl-track">
            {/* Spine */}
            <div className="cl-spine">
                <div
                    className={`cl-dot ${entry.type}`}
                    style={{ width: t.dotSize, height: t.dotSize }}
                />
                {!isLast && <div className="cl-line" />}
            </div>

            {/* Content */}
            <div className={`cl-entry${isLast ? ' last' : ''}`}>
                <div className="cl-meta">
                    <span
                        className="cl-version"
                        style={{
                            color: t.color,
                            background: t.color + '14',
                            borderColor: t.color + '40',
                        }}
                    >
                        v{entry.version}
                    </span>
                    <span className="cl-date">{entry.date}</span>
                    <span className="cl-type-label">{t.label}</span>
                </div>

                <h3 className={`cl-title${entry.type === 'major' ? ' major' : ''}`}>
                    {entry.title}
                </h3>

                {entry.description && (
                    <p className="cl-desc">{entry.description}</p>
                )}

                {entry.changes && entry.changes.length > 0 && (
                    <ul className="cl-changes">
                        {entry.changes.map((c, i) => (
                            <li key={i} className="cl-change">{c}</li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Changelog() {
    // Group entries by year, preserving order
    const grouped = useMemo(() => {
        const groups = [];
        let currentYear = null;
        for (const entry of CHANGELOG) {
            const year = entry.date.split(' ').at(-1);
            if (year !== currentYear) {
                currentYear = year;
                groups.push({ year, entries: [] });
            }
            groups.at(-1).entries.push(entry);
        }
        return groups;
    }, []);

    return (
        <div className="cl">
            <style>{CSS}</style>

            <div className="cl-shell">
                <div className="cl-header">
                    <p className="cl-eyebrow">History</p>
                    <h1 className="cl-h1">Changelog</h1>
                    <p className="cl-sub">
                        {CHANGELOG.length} releases since January 2024
                    </p>
                </div>
            </div>

            <div className="cl-rule" />

            <div className="cl-shell">
                <div className="cl-body">
                    {grouped.map(({ year, entries }) => (
                        <div key={year}>
                            <div className="cl-year">
                                <div className="cl-year-line" />
                                <span className="cl-year-label">{year}</span>
                                <div className="cl-year-line" />
                            </div>
                            {entries.map((entry, i) => (
                                <Entry
                                    key={entry.version}
                                    entry={entry}
                                    isLast={
                                        i === entries.length - 1 &&
                                        year === grouped.at(-1).year
                                    }
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <Footer />
        </div>
    );
}
