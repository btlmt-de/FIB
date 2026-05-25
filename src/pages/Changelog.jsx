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
const CHANGELOG = [
    { version:'4.0.0', date:'15th May 2026',       type:'major',   title:'Stats',                  description:'Added players stats', changes:['Added solo stats','Added team stats'] },
    { version:'3.9.6', date:'18th April 2026',     type:'update',  title:'Tiny Takeover',          description:'Added full 26.1.2 support', changes:['Added the golden dandelion','Changed nametag from mid to early pool and adjusted its description'] },
    { version:'3.9.5', date:'16th January 2026',   type:'feature', title:'Item List Overhaul v2',  description:'Refactored the item list & Quality of Life improvements', changes:['Improved readability and maintainability of the item list','Added some missing items'] },
    { version:'3.9.4', date:'26th October 2025',   type:'feature', title:'Adjusting Backpacks',    description:'Preventing backpack from being checked by item found', changes:['Players can not use their backpack anymore to fulfil a bundle item requirement'] },
    { version:'3.9.3', date:'23rd October 2025',   type:'feature', title:'Pale is Pain',           description:'Rebalanced all items related to the Pale Garden biome', changes:['Moved all pale items into late pool'] },
    { version:'3.9.2', date:'16th October 2025',   type:'fix',     title:'Bug Fixes',              description:'Fixed a critical bug related to b2b probability calculation', changes:['Fixed b2b probability getting calculated incorrectly','Fixed new occurred hunger loss in pregame','Added new rarity for same b2b item'] },
    { version:'3.9.1', date:'14th October 2025',   type:'feature', title:'Additions & Bug Fixes',  description:'Fixed some bugs & added features related to b2b', changes:['Fixed b2b logic counting incorrectly','Added new sounds and messages for b2b events'] },
    { version:'3.9.0', date:'4th July 2025',       type:'update',  title:'The Copper Age',         description:'Added full 1.21.10 support', changes:['Added all new 1.21.10 items & descriptions','Added custom banner inside tablist header'] },
    { version:'3.8.0', date:'4th July 2025',       type:'update',  title:'Run Battle',             description:'Added new game type: RUN Battle', changes:['Added new setting to enable run battle','Fixed wandering trader not despawning due to removal of spawn chunks'] },
    { version:'3.7.0', date:'11th June 2025',      type:'update',  title:'1.21.5',                 description:'Added full 1.21.5 support', changes:['Added all new 1.21.5 items & descriptions'] },
    { version:'3.6.0', date:'17th February 2025',  type:'update',  title:'Harder Trackers & Bundles', description:'Added a setting to enable harder trackers & added bundles', changes:['Added a harder crafting recipe for Antimatter Locator','Added a harder crafting recipe for Trial Locator','Added bundles to the item list','Added recipe view for colored bundles in /info'] },
    { version:'3.5.0', date:'20th September 2024', type:'update',  title:'Protection',             description:'Added basic protection around the player\'s environment', changes:['Added grief protection for containers','Added grief protection for beds','Added grief protection for furnaces','Added AntiTNT for blocks around the player'] },
    { version:'3.4.1', date:'18th September 2024', type:'fix',     title:'Bug Fixes',              description:'Fixed many bugs related to core gameplay mechanics', changes:['Fixed end teleport logic','Fixed /items not working correctly'] },
    { version:'3.4.0', date:'16th September 2024', type:'update',  title:'End Teleport & Bug Fixes', description:'Players get teleported to a random location when entering the End', changes:['Fixed glowing effect inside result inventory for skipped items','Fixed dynamic item list timings','Added random teleport when players enter the End'] },
    { version:'3.3.0', date:'14th September 2024', type:'update',  title:'Event Settings',         description:'Added a setting for the first big FIB round on mcplayhd.net', changes:['Added "Event" setting which sets game time to 2h and 4 jokers','Added dynamic keepInventory which disables the gamerule after 15 minutes when "Event" is enabled','Players get the startkit on death when keepInventory is disabled','Rebalanced some items','Fixed jokers being used when you jump on farmland'] },
    { version:'3.2.1', date:'13th September 2024', type:'fix',     title:'Manual Teams',           description:'Fixed /forceteam not working correctly' },
    { version:'3.2.0', date:'11th September 2024', type:'update',  title:'TeamChat',               description:'Added teamchat & Quality of Life improvements', changes:['Added the ability to only chat with your team member','Added /spectate to switch into spectator mode when the game is finished','Added more custom recipe types for /info','Fixed /fixskip not working properly','Fixed jokers getting lost when keepInventory is disabled','Fixed item pool states working incorrectly when the game time is set to more than 50 minutes','Moved all trial ruins items into extreme'] },
    { version:'3.1.2', date:'16th August 2024',    type:'fix',     title:'Yet Another Duplicate',  description:'Fixed another joker duplication bug' },
    { version:'3.1.1', date:'9th August 2024',     type:'fix',     title:'Portal Misbehaviour',    description:'Fixed critical bugs about some game settings', changes:['Nether is now enabled when the End setting is disabled'] },
    { version:'3.1.0', date:'7th August 2024',     type:'update',  title:'Phantoms',               description:'Removed phantoms', changes:['Phantoms can no longer spawn','Removed Phantom Membrane from item list','General code cleanup & bugfixes'] },
    { version:'3.0.0', date:'26th July 2024',      type:'major',   title:'1.21',                   description:'Added full 1.21 support', changes:['Added all new 1.21 items & descriptions','Added custom item "Trial Locator"','Added Trial Locator to item list'] },
    { version:'2.7.0', date:'25th June 2024',      type:'update',  title:'Dynamic Item List v2',   description:'Changed how the unlocking of item pools gets calculated', changes:['Reworked dynamic item pool unlock timing','Performance improvements'] },
    { version:'2.6.0', date:'10th June 2024',      type:'update',  title:'Force Chain',            description:'Added ForceChain game mode', changes:['Added new setting to enable ForceChain','Players see their current and next item simultaneously'] },
    { version:'2.5.0', date:'26th May 2024',       type:'update',  title:'Item Descriptions',      description:'Added item descriptions viewable via /info', changes:['Added descriptions for all pool items','Added /info command to view descriptions'] },
    { version:'2.4.0', date:'12th May 2024',       type:'update',  title:'Positions',              description:'Added the position system', changes:['Added /pos command to save and share positions','Positions are visible to all players'] },
    { version:'2.3.0', date:'28th April 2024',     type:'update',  title:'Wandering Trader',       description:'Added custom wandering trader', changes:['Trader spawns every 7–10 minutes near spawn','All trades cost 1 emerald','Trader sells Wheel of Fortune'] },
    { version:'2.2.0', date:'14th April 2024',     type:'update',  title:'Antimatter Depths',      description:'Added custom Antimatter Depths structure', changes:['Added Antimatter Depths as a replacement for vanilla stronghold','Added Antimatter Locator crafting item','Added custom loot rooms'] },
    { version:'2.1.0', date:'31st March 2024',     type:'update',  title:'Teams',                  description:'Added team mode', changes:['Added /forceteam command','Added team score tracking','Team members share item pools'] },
    { version:'2.0.0', date:'15th March 2024',     type:'major',   title:'Major Overhaul',         description:'Complete plugin rewrite with new architecture', changes:['Rewrote core game loop','Added preset system','Improved stability'] },
    { version:'1.5.0', date:'25th February 2024',  type:'update',  title:'Joker System',           description:'Added joker/skip system', changes:['Players can skip items using jokers','Joker count configurable at game start'] },
    { version:'1.4.0', date:'10th February 2024',  type:'update',  title:'Item Pools',             description:'Added dynamic item pool system', changes:['Items split into Early, Mid, and Late pools','Pools unlock progressively during the round'] },
    { version:'1.3.0', date:'30th January 2024',   type:'update',  title:'Bug Fixes & Additions',  description:'Fixed many bugs & added core gameplay mechanics', changes:['Fixed joker duplication','Fixed joker softlock','Fixed backpack slot movement','Added startkit','Added item found notification in chat','Added /spawn','Skipped items get highlighted in result inventory'] },
    { version:'1.2.0', date:'28th January 2024',   type:'update',  title:'Backpacks',              description:'Added the option to enable backpacks', changes:['Backpacks are available for both solo and teams'] },
    { version:'1.1.0', date:'27th January 2024',   type:'update',  title:'New Features',           description:'Quality of Life improvements and new commands', changes:['The gamemaster can start the result screen with /result once the game is finished','Players can view the recipe of an item with /info','Players can view the minecraft.wiki site of an item with /infowiki'] },
    { version:'1.0.0', date:'25th January 2024',   type:'major',   title:'Initial Release',        description:'The beginning of ForceItemBattle on McPlayHD.net.', changes:['First public release','Core gameplay implemented','Project overhaul'] },
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