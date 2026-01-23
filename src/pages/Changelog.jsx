import React from 'react';
import { COLORS } from '../config/constants';
import Footer from "../components/common/Footer.jsx";

const CHANGELOG = [
    {
        version: '3.9.5',
        date: '16th January 2026',
        type: 'feature',
        title: 'Item List Overhaul v2',
        description: 'Refactored the item list & Quality of Life improvements',
        changes: [
            'Improved readability and maintainability of the item list',
            'Added some missing items',
        ]
    },
    {
        version: '3.9.4',
        date: '26th October 2025',
        type: 'feature',
        title: 'Adjusting Backpacks',
        description: 'Preventing backback to be checked by item found',
        changes: [
            'Players can not use their backpack anymore to fulfill a bundle item requirement'
        ]
    },
    {
        version: '3.9.3',
        date: '23th October 2025',
        type: 'feature',
        title: 'Pale is Pain',
        description: 'Rebalanced all items related to the Pale Garden biome',
        changes: [
            'Moved all pale items into late pool'
        ]
    },
    {
        version: '3.9.2',
        date: '16th October 2025',
        type: 'fix',
        title: 'Bug Fixes',
        description: 'Fixed a critical bug related to b2b probability calculation',
        changes: [
            'Fixed b2b probability getting calculated incorrectly',
            'Fixed new occurred  hunger loss in pregame',
            'Added new rarity for same b2b item'

        ]
    },
    {
        version: '3.9.1',
        date: '14th October 2025',
        type: 'feature',
        title: 'Additions & Bug Fixes',
        description: 'Fixed some bugs & added features related to b2b',
        changes: [
            'Fixed b2b logic counting incorrectly',
            'Added new sounds and messages for b2b events'
        ]
    },
    {
        version: '3.9.0',
        date: '4th July 2025',
        type: 'update',
        title: 'The Copper Age',
        description: 'Added full 1.21.10 support',
        changes: [
            'Added all new 1.21.10 items & descriptions',
            'Added custom banner inside tablist header',
        ]
    },
    {
        version: '3.8.0',
        date: '4th July 2025',
        type: 'update',
        title: 'Run Battle',
        description: 'Added new game type: RUN battle',
        changes: [
            'Added new setting to enable run battle',
            'Fixed wandering trader not despawning due to removal of spawn chunks'
        ]
    },
    {
        version: '3.7.0',
        date: '11th June 2025',
        type: 'update',
        title: '1.21.5',
        description: 'Added full 1.21.5 support',
        changes: [
            'Added all new 1.21.5 items & descriptions'
        ]
    },
    {
        version: '3.6.0',
        date: '17th February 2025',
        type: 'update',
        title: 'Harder Trackers & Bundles',
        description: 'Added a setting to enable harder trackers & added bundles',
        changes: [
            'Added a harder crafting recipe for Antimatter Locator',
            'Added a harder crafting recipe for Trial Locator',
            'Added bundles to the item list',
            'Added recipe view for colored bundles in /info'
        ]
    },
    {
        version: '3.5.0',
        date: '20th September 2024',
        type: 'update',
        title: 'Protection',
        description: 'Added basic protection around the players environment',
        changes: [
            'Added grief protection for containers',
            'Added grief protection for beds',
            'Added grief protection for furnaces',
            'Added AntiTNT for blocks around the player',
        ]
    },
    {
        version: '3.4.1',
        date: '18th September 2024',
        type: 'fix',
        title: 'Bug Fixes',
        description: 'Fixed many bugs related to core gameplay mechanics',
        changes: [
            'Fixed end teleport logic',
            'Fixed /items not working correctly',
        ]
    },
    {
        version: '3.4.0',
        date: '16th September 2024',
        type: 'update',
        title: 'End Teleport & Bug Fixes',
        description: 'Players get teleported to a random location when entering the end',
        changes: [
            'Fixed glowing effect inside result inventory for skipped items',
            'Fixed dynamic item list timings',
            'Added random teleport when players enter the end'
        ]
    },
    {
        version: '3.3.0',
        date: '14th September 2024',
        type: 'update',
        title: 'Event Settings',
        description: 'Added a setting for the first big FIB round on mcplayhd.net',
        changes: [
            'Added "Event" setting which sets game time to 2h and 4 jokers',
            'Added dynamic keepInventory which disables the gamerule after 15 minutes when "Event" is enabled',
            'Players get the startkit on death when keepInventory is disabled',
            'Rebalanced some items',
            'Fixed jokers being used when you jump on farmland',
        ]
    },
    {
        version: '3.2.1',
        date: '13th September 2024',
        type: 'fix',
        title: 'Manual Teams',
        description: 'Fixed /forceteam not working correctly'
    },
    {
        version: '3.2.0',
        date: '11th September 2024',
        type: 'update',
        title: 'TeamChat',
        description: 'Added teamchat & Quality of Life improvements',
        changes: [
            'Added the ability to only chat with your team member',
            'Added /spectate to switch into spectator mode when the game is finished',
            'Added more custom recipe types for /info',
            'Fixed /fixskip not working properly',
            'Fixed jokers getting lost when keepInventory is disabled',
            'Fixed item pool states working incorrectly when the game time is set to more than 50 minutes',
            'Moved all trial ruins items into extreme',
        ]
    },
    {
        version: '3.1.2',
        date: '16th August 2024',
        type: 'fix',
        title: 'Yet Another Duplicate',
        description: 'Fixed another joker duplicate'
    },
    {
        version: '3.1.1',
        date: '9th August 2024',
        type: 'fix',
        title: 'Portal Misbehaviour',
        description: 'Fixed critical bugs about some game settings',
        changes: [
            'Nether is now enabled when the End setting is disabled',
        ]
    },
    {
        version: '3.1.0',
        date: '7th August 2024',
        type: 'update',
        title: 'Phantoms',
        description: 'Removed phantoms',
        changes: [
            'Phantoms can not spawn anymore',
            'Removed Phantom Membrane from item list',
            'General code cleanup & bugfixes'
        ]
    },
    {
        version: '3.0.0',
        date: '26th July 2024',
        type: 'major',
        title: '1.21',
        description: 'Added full 1.21 support',
        changes: [
            'Added all new 1.21 items & descriptions',
            'Added custom item "Trial Locator',
            'Added Trial Locator to item list'
        ]
    },
    {
        version: '2.7.0',
        date: '25th June 2024',
        type: 'update',
        title: 'Dynamic Item List v2',
        description: 'Changed how the unlocking of item pools gets calculated',
        changes: [
            'The item pool unlock time now gets calculated based on a percentage of remaining round time',
            'Rebalancing of some items'
        ]
    },
    {
        version: '2.6.0',
        date: '22th June 2024',
        type: 'update',
        title: 'Spectator',
        description: 'Added a way for players to spectate a game',
        changes: [
            'Added /spectate',
            'Added possibility to start a game as a spectator',
        ]
    },
    {
        version: '2.5.2',
        date: '18th June 2024',
        type: 'feature',
        title: 'Clean Up & Additions',
        description: 'Added a possibility to get lost jokers back',
        changes: [
            'Added /fixskips to get all your remaining jokers back',
            'Fixed a bug that gave players new jokers on respawn',
            'Code cleanup'
        ]
    },
    {
        version: '2.5.1',
        date: '14th June 2024',
        type: 'feature',
        title: 'Achievements',
        description: 'Added more achievements',
        changes: [
            'Added multiple progression based achievements',
            'Reworked some achievement requirements',
        ]
    },
    {
        version: '2.5.0',
        date: '13th June 2024',
        type: 'update',
        title: 'Teleporter & Achievements',
        description: 'Added a custom structure to teleport to a random location & start of achievements',
        changes: [
            'Added the "Antimatter Teleporter" structure',
            'Players get randomly teleported 8-10k blocks away from their current location',
            'Added an achievement system'
        ]
    },
    {
        version: '2.4.0',
        date: '12th June 2024',
        type: 'update',
        title: 'Dynamic Item List',
        description: 'Added dynamic item pools based on time progression',
        changes: [
            'Added EASY, MID and LATE item pools',
            'Added functionality which dynamically changes the item pool based on round time progression'
        ]
    },
    {
        version: '2.3.1',
        date: '4th June 2024',
        type: 'feature',
        title: 'Antimatter Locator',
        description: 'Reworked Antimatter logic',
        changes: [
            'Added Antimatter Locator to the item list',
            'Reworked texture for the Antimatter Locator item',
            'Added state for "already looted" Antimatter Depths',
        ]
    },
    {
        version: '2.3.0',
        date: '4th June 2024',
        type: 'update',
        title: 'Antimatter',
        description: 'Added a custom structure to access the end easier',
        changes: [
            'Added the "Antimatter Depths" structure',
            'Added the "Antimatter Locator'
        ]
    },
    {
        version: '2.2.0',
        date: '30th May 2024',
        type: 'update',
        title: 'B2B Improvements',
        description: 'Added percentage calculation for back2back events',
        changes: [
            'The chance for an b2b to appear now gets displayed in chat'
        ]
    },
    {
        version: '2.1.1',
        date: '9th May 2024',
        type: 'feature',
        title: 'Bug Fixes & Additions',
        description: 'Fixed some bugs involving teams & Wandering Trader changes',
        changes: [
            'Teams do not break anymore if one player disconnects',
            'Fixed critical bug if a player rejoins while the game is paused',
            'All wandering trader trades are now set to 1 emerald'
        ]
    },
    {
        version: '2.1.0',
        date: '14th April 2024',
        type: 'update',
        title: 'Trading',
        description: 'Added a trading system',
        changes: [
            'Players can send a trade request with /asktrade'
        ]
    },
    {
        version: '2.0.0',
        date: '9th April 2024',
        type: 'major',
        title: 'Teams',
        description: 'Added the possibility to create teams',
        changes: [
            'Added settings for teams',
            'Added shared b2b logic',
            'Added shared backpack'
        ]
    },
    {
        version: '1.9.1',
        date: '5th April 2024',
        type: 'feature',
        title: 'Wandering Trader',
        description: 'Added the wandering trader as core gameplay mechanic',
        changes: [
            'The wandering trader spawns randomly every 7-10 minutes near spawn'
        ]
    },
    {
        version: '1.9.0',
        date: '26th March 2024',
        type: 'update',
        title: 'tem Displays',
        description: 'Created a server resourcepack',
        changes: [
            'Added item display for chat, bossbar and tab'
        ]
    },
    {
        version: '1.8.3',
        date: '5th March 2024',
        type: 'feature',
        title: 'Clean Up',
        description: 'Refactoring & Clean Up',
        changes: [
            'Refactored b2b logic',
            'General code clean up',
            'Some smaller bug fixes'
        ]
    },
    {
        version: '1.8.2',
        date: '2nd March 2024',
        type: 'feature',
        title: 'Item List Adjustments',
        description: 'Added extreme list',
        changes: [
            'Added the most challenging items into the extreme list',
            'Added setting to enable/disable extreme mode'
        ]
    },
    {
        version: '1.8.1',
        date: '1st March 2024',
        type: 'feature',
        title: 'New Commands',
        description: 'Added new commands with settings',
        changes: [
            'Added /pos to mark & share a position',
            'Added /ping',
            'Fixed /stats reset',
            'Fixed leaderboard showing wrong entries'
        ]
    },
    {
        version: '1.8.0',
        date: '28th February 2024',
        type: 'update',
        title: 'Stats',
        description: 'Stats v1',
        changes: [
            'Added the first attempt of a stats system'
        ]
    },
    {
        version: '1.7.2',
        date: '27th February 2024',
        type: 'feature',
        title: 'Presets',
        description: 'Saving Settings',
        changes: [
            'The gamemaster can create presets for the round settings, which can be used with the /start command'
        ]
    },
    {
        version: '1.7.1',
        date: '20th February 2024',
        type: 'feature',
        title: 'Recipes',
        description: 'Quality of Life improvements for /info',
        changes: [
            '/info now displays all kind of recipes (including smelting, stripping, etc.)'
        ]
    },
    {
        version: '1.7.0',
        date: '18th February 2024',
        type: 'update',
        title: 'B2B Too',
        description: 'Back2Back For Shulkers',
        changes: [
            'Items inside a shulkerbox now count for the B2B detection',
            'Shulkerboxes inside a backpack also count for the B2B detection'
        ]
    },
    {
        version: '1.6.1',
        date: '11th February 2024',
        type: 'fix',
        title: 'Bug Fix',
        description: 'Gamebreaking Bug',
        changes: [
            'Fixed a glitch to obtain items fast without ever having them'
        ]
    },
    {
        version: '1.6.0',
        date: '10th February 2024',
        type: 'update',
        title: 'Settings',
        description: 'Added more settings & commands',
        changes: [
            'Added setting for increasing randomTickSpeed',
            'Added setting for end',
            'Added /bed command',
            'Added /pause command',
            'Some refactoring & code cleanup'
        ]
    },
    {
        version: '1.5.0',
        date: '5th February 2024',
        type: 'update',
        title: 'B2B Backpack',
        description: 'Back2Back Enhancement',
        changes: [
            'Items inside the backpack now count for the B2B detection'
        ]
    },
    {
        version: '1.4.1',
        date: '4th February 2024',
        type: 'fix',
        title: 'Bug Fixes',
        description: 'Yet Another Bug',
        changes: [
            'Fixed another joker duplication glitch',
            'Some refactoring & code cleanup'
        ]
    },
    {
        version: '1.4.0',
        date: '3rd February 2024',
        type: 'update',
        title: 'Item List Overhaul',
        description: 'Improvements to the item pool system',
        changes: [
            'Item list got enhanced with ignore lists for nether & end settings'
        ]
    },
    {
        version: '1.3.1',
        date: '31st January 2024',
        type: 'fix',
        title: 'Bug Fixes',
        description: 'Fixed many bugs related to core gameplay mechanics',
    },
    {
        version: '1.3.0',
        date: '30th January 2024',
        type: 'update',
        title: 'Bug Fixes & Additions',
        description: 'Fixed many bugs & added core gameplay mechanics',
        changes: [
            'Fixed joker duplication',
            'Fixed joker softlock',
            'Fixed backpack slot movement',
            'Added startkit',
            'Added item found notification in chat',
            'Added /spawn',
            'Skipped items get highlighted in result inventory'
        ]
    },
    {
        version: '1.2.0',
        date: '28th January 2024',
        type: 'update',
        title: 'Backpacks',
        description: 'Added the option to enable backpacks',
        changes: [
            'Backpacks are available for both solo and teams'
        ]
    },
    {
        version: '1.1.0',
        date: '27th January 2024',
        type: 'update',
        title: 'New Features',
        description: 'Quality of Life improvements and new commands',
        changes: [
            'The gamemaster can start the result screen with /result once the game is finished',
            'Players can view the recipe of an item with /info',
            'Players can view the minecraft.wiki site of an item with /infowiki'
        ]
    },
    {
        version: '1.0.0',
        date: '25th January 2024',
        type: 'major',
        title: 'Initial Release',
        description: 'The beginning of ForceItemBattle on McPlayHD.net.',
        changes: [
            'First public release',
            'Core gameplay implemented',
            'Project overhaul'
        ]
    }
];

const TYPE_CONFIG = {
    major: { color: COLORS.gold, label: 'Major Release' },
    feature: { color: COLORS.green, label: 'Feature' },
    update: { color: COLORS.accent, label: 'Update' },
    fix: { color: COLORS.red, label: 'Bug Fix' }
};

function TimelineEntry({ entry, isLast }) {
    const config = TYPE_CONFIG[entry.type] || TYPE_CONFIG.update;

    return (
        <div style={{
            display: 'flex',
            gap: '24px',
            position: 'relative'
        }}>
            {/* Timeline line and dot */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '20px',
                flexShrink: 0
            }}>
                <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: config.color,
                    boxShadow: `0 0 12px ${config.color}66`,
                    zIndex: 1
                }} />
                {!isLast && (
                    <div style={{
                        width: '2px',
                        flex: 1,
                        background: COLORS.border,
                        marginTop: '8px'
                    }} />
                )}
            </div>

            {/* Content */}
            <div style={{
                flex: 1,
                paddingBottom: isLast ? 0 : '32px'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px',
                    flexWrap: 'wrap'
                }}>
                    <span style={{
                        background: config.color,
                        color: '#000',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '700'
                    }}>
                        v{entry.version}
                    </span>
                    <span style={{
                        color: COLORS.textMuted,
                        fontSize: '13px'
                    }}>
                        {entry.date}
                    </span>
                    <span style={{
                        color: config.color,
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        {config.label}
                    </span>
                </div>

                {/* Title */}
                <h3 style={{
                    margin: '0 0 8px 0',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: COLORS.text
                }}>
                    {entry.title}
                </h3>

                {/* Description */}
                {entry.description && (
                    <p style={{
                        margin: '0 0 12px 0',
                        fontSize: '14px',
                        color: COLORS.textMuted,
                        lineHeight: '1.6'
                    }}>
                        {entry.description}
                    </p>
                )}

                {/* Changes */}
                {entry.changes && entry.changes.length > 0 && (
                    <div style={{
                        background: COLORS.bgLight,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '6px',
                        padding: '14px 18px'
                    }}>
                        <ul style={{
                            margin: 0,
                            padding: '0 0 0 18px',
                            fontSize: '13px',
                            color: COLORS.text,
                            lineHeight: '1.8'
                        }}>
                            {entry.changes.map((change, idx) => (
                                <li key={idx}>{change}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Changelog() {
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
                    Changelog
                </h1>
                <p style={{
                    fontSize: '16px',
                    color: COLORS.textMuted,
                    margin: 0,
                    maxWidth: '500px',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                }}>
                    Version history and updates
                </p>
            </div>

            {/* Timeline */}
            <div style={{
                maxWidth: '700px',
                margin: '0 auto',
                padding: '48px 20px',
                flex: 1
            }}>
                {CHANGELOG.map((entry, idx) => (
                    <TimelineEntry
                        key={entry.version}
                        entry={entry}
                        isLast={idx === CHANGELOG.length - 1}
                    />
                ))}
            </div>
            <Footer />
        </div>
    );
}