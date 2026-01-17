import React, { useState, useCallback } from 'react';
import {
    Swords,
    Utensils,
    Sprout,
    Users,
    MessageSquare,
    Heart,
    Package,
    BarChart3,
    Flame,
    Gem,
    Settings,
    Shield,
    Gamepad2,
    TrendingUp,
    Info,
    ToggleLeft,
    ToggleRight,
    Skull,
    Star,
    MapPin,
    Wind,
    Link,
    Trophy,
    Eye,
    Compass,
    ExternalLink,
    Layers,
    ArrowLeft,
    ChevronRight,
    Lock,
    Unlock
} from 'lucide-react';
import { COLORS } from '../config/constants';

// Setting definitions
const SETTINGS = [
    // Game Mode
    {
        id: 'run_battle',
        name: 'RunBattle',
        category: 'gamemode',
        icon: Trophy,
        enabledText: 'Only the first player to get the item scores',
        disabledText: 'All players can score from the same item',
        default: false
    },
    {
        id: 'force_chain',
        name: 'ForceChain',
        category: 'gamemode',
        icon: Link,
        enabledText: 'Shows current item + next item',
        disabledText: 'Only shows current item',
        default: false
    },
    {
        id: 'teams',
        name: 'Teams',
        category: 'gamemode',
        icon: Users,
        enabledText: 'Players compete in teams',
        disabledText: 'Free-for-all - everyone plays solo',
        default: false,
        unlocks: ['team_chat']
    },
    {
        id: 'team_chat',
        name: 'Team Chat',
        category: 'gamemode',
        icon: MessageSquare,
        enabledText: 'Chat messages only visible to teammates',
        disabledText: 'All chat is global',
        default: true,
        requires: 'teams'
    },

    // Combat
    {
        id: 'pvp',
        name: 'PvP',
        category: 'combat',
        icon: Swords,
        enabledText: 'Players can attack each other',
        disabledText: 'Players cannot damage each other',
        default: true
    },

    // Survival
    {
        id: 'food',
        name: 'Food',
        category: 'survival',
        icon: Utensils,
        enabledText: 'Normal hunger - need to eat to survive',
        disabledText: 'No hunger drain - never need to eat',
        default: true
    },
    {
        id: 'keep_inventory',
        name: 'KeepInventory',
        category: 'survival',
        icon: Heart,
        enabledText: 'Keep all items when you die',
        disabledText: 'Drop items on death (vanilla behavior)',
        default: false
    },

    // Gameplay
    {
        id: 'faster_plants',
        name: 'Faster Plants',
        category: 'gameplay',
        icon: Sprout,
        enabledText: 'Crops, trees & leaves grow/decay faster',
        disabledText: 'Normal vanilla growth speeds',
        default: false
    },
    {
        id: 'backpack',
        name: 'Backpack',
        category: 'gameplay',
        icon: Package,
        enabledText: 'Extra inventory slots (size varies by preset)',
        disabledText: 'Standard 36 slot inventory only',
        default: false
    },
    {
        id: 'position_system',
        name: 'Position System',
        category: 'gameplay',
        icon: MapPin,
        enabledText: 'Players can save and share positions',
        disabledText: '/pos command is disabled',
        default: true
    },
    {
        id: 'elytra_gliding',
        name: 'Elytra Gliding',
        category: 'gameplay',
        icon: Wind,
        enabledText: 'Elytra gliding is allowed',
        disabledText: 'Elytra gliding is disabled',
        default: true
    },
    {
        id: 'harder_trackers',
        name: 'Harder Trackers',
        category: 'gameplay',
        icon: Compass,
        enabledText: 'Trackers require harder crafting recipes',
        disabledText: 'Standard tracker recipes',
        default: false,
        link: { text: 'View tracker recipes', href: '/#structures' }
    },

    // Item Pool
    {
        id: 'hard',
        name: 'Hard',
        category: 'itempool',
        icon: Skull,
        enabledText: 'Items tagged "Late" are included',
        disabledText: 'Late-game items are excluded',
        default: false,
        requires: 'nether',
        unlocks: ['extreme'],
        link: { text: 'View Late items', href: '/#pools?state=LATE' }
    },
    {
        id: 'nether',
        name: 'Nether',
        category: 'itempool',
        icon: Flame,
        enabledText: 'Nether portal works, nether items included',
        disabledText: 'Nether disabled, nether items excluded',
        default: true,
        unlocks: ['hard', 'end'],
        link: { text: 'View Nether items', href: '/#pools?tag=NETHER' }
    },
    {
        id: 'end',
        name: 'End',
        category: 'itempool',
        icon: Star,
        enabledText: 'End portal works, end items included',
        disabledText: 'End disabled, end items excluded',
        default: true,
        requires: 'nether',
        unlocks: ['extreme'],
        link: { text: 'View End items', href: '/#pools?tag=END' }
    },
    {
        id: 'extreme',
        name: 'Extreme',
        category: 'itempool',
        icon: Gem,
        enabledText: 'All obtainable items included',
        disabledText: 'Only reasonably obtainable items',
        default: false,
        requires: ['nether', 'end', 'hard'],
        link: { text: 'View Extreme items', href: '/#pools?tag=EXTREME' }
    },

    // Progression
    {
        id: 'stats',
        name: 'Stats',
        category: 'progression',
        icon: BarChart3,
        enabledText: 'Stats count towards leaderboards',
        disabledText: 'Stats won\'t be recorded',
        default: true
    },
    {
        id: 'score',
        name: 'Score',
        category: 'progression',
        icon: Eye,
        enabledText: 'Score is visible to all players',
        disabledText: 'Score is hidden until round ends',
        default: true
    }
];

const CATEGORIES = {
    gamemode: {
        name: 'Game Mode',
        description: 'Fundamental rules that change how the game is played',
        color: COLORS.accent,
        icon: Gamepad2
    },
    combat: {
        name: 'Combat',
        description: 'Player vs player interaction settings',
        color: COLORS.red,
        icon: Shield
    },
    survival: {
        name: 'Survival',
        description: 'Hunger, death, and survival mechanics',
        color: COLORS.orange,
        icon: Heart
    },
    gameplay: {
        name: 'Gameplay',
        description: 'General gameplay features and utilities',
        color: COLORS.aqua,
        icon: Settings
    },
    itempool: {
        name: 'Item Pool',
        description: 'Control which items can be assigned',
        color: COLORS.purple,
        icon: Layers
    },
    progression: {
        name: 'Progression',
        description: 'Stats, scoring, and tracking',
        color: COLORS.gold,
        icon: TrendingUp
    }
};

// Category card for the overview
function CategoryCard({ categoryId, onClick, enabledSettings }) {
    const category = CATEGORIES[categoryId];
    const CategoryIcon = category.icon;
    const categorySettings = SETTINGS_BY_CATEGORY[categoryId] || [];
    const settingCount = categorySettings.length;

    // Count locked settings
    const lockedCount = categorySettings.filter(setting => {
        const requires = setting.requires
            ? (Array.isArray(setting.requires) ? setting.requires : [setting.requires])
            : [];
        return requires.length > 0 && !requires.every(req => enabledSettings.has(req));
    }).length;

    return (
        <button
            onClick={onClick}
            style={{
                background: COLORS.bgLight,
                border: `1px solid ${category.color}33`,
                borderRadius: '10px',
                padding: '24px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}
            onMouseEnter={e => {
                e.currentTarget.style.borderColor = category.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 8px 24px ${category.color}22`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = `${category.color}33`;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{
                    width: '44px',
                    height: '44px',
                    background: `${category.color}15`,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <CategoryIcon size={22} color={category.color} />
                </div>
                <ChevronRight size={20} color={COLORS.textMuted} />
            </div>

            <div>
                <h3 style={{
                    margin: '0 0 4px 0',
                    fontSize: '17px',
                    fontWeight: '600',
                    color: COLORS.text
                }}>
                    {category.name}
                </h3>
                <p style={{
                    margin: 0,
                    fontSize: '13px',
                    color: COLORS.textMuted,
                    lineHeight: '1.4'
                }}>
                    {category.description}
                </p>
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <span style={{
                    fontSize: '12px',
                    color: category.color,
                    fontWeight: '500'
                }}>
                    {settingCount} setting{settingCount !== 1 ? 's' : ''}
                </span>
                {lockedCount > 0 && (
                    <span style={{
                        fontSize: '11px',
                        color: COLORS.textMuted,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                    }}>
                        <Lock size={10} />
                        {lockedCount} locked
                    </span>
                )}
            </div>
        </button>
    );
}

// Build lookup map for O(1) access (react-best-practices rule 7.11)
const SETTINGS_MAP = new Map(SETTINGS.map(s => [s.id, s]));

// Pre-compute settings by category to avoid repeated filtering (react-best-practices rule 7.2)
const SETTINGS_BY_CATEGORY = SETTINGS.reduce((acc, setting) => {
    if (!acc[setting.category]) {
        acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
}, {});

// Helper to get setting name by id - O(1) lookup
function getSettingName(id) {
    const setting = SETTINGS_MAP.get(id);
    return setting ? setting.name : id;
}

// Single setting row in detail view
function SettingRow({ setting, isEnabled, onToggle, enabledSettings }) {
    const Icon = setting.icon;

    // Check if dependencies are met
    const requires = setting.requires
        ? (Array.isArray(setting.requires) ? setting.requires : [setting.requires])
        : [];
    const dependenciesMet = requires.every(req => enabledSettings.has(req));
    const isLocked = requires.length > 0 && !dependenciesMet;

    // Get names of unmet dependencies
    const unmetDependencies = requires.filter(req => !enabledSettings.has(req));

    // Get names of what this setting unlocks
    const unlockNames = setting.unlocks
        ? setting.unlocks.map(id => getSettingName(id))
        : [];

    return (
        <div style={{
            padding: '16px 0',
            borderBottom: `1px solid ${COLORS.border}44`,
            opacity: isLocked ? 0.5 : 1,
            transition: 'opacity 0.2s ease'
        }}>
            {/* Main row */}
            <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px'
            }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    background: isLocked ? COLORS.bg : COLORS.bgLighter,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    position: 'relative'
                }}>
                    <Icon size={18} color={isLocked ? COLORS.border : COLORS.textMuted} />
                    {isLocked && (
                        <div style={{
                            position: 'absolute',
                            bottom: '-4px',
                            right: '-4px',
                            width: '16px',
                            height: '16px',
                            background: COLORS.bgLight,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `1px solid ${COLORS.border}`
                        }}>
                            <Lock size={10} color={COLORS.textMuted} />
                        </div>
                    )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                        flexWrap: 'wrap'
                    }}>
                        <span style={{
                            fontSize: '15px',
                            fontWeight: '600',
                            color: isLocked ? COLORS.textMuted : COLORS.text
                        }}>
                            {setting.name}
                        </span>
                        {isLocked && (
                            <span style={{
                                fontSize: '10px',
                                color: COLORS.red,
                                background: `${COLORS.red}15`,
                                padding: '2px 8px',
                                borderRadius: '3px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <Lock size={10} />
                                Requires {unmetDependencies.map(id => getSettingName(id)).join(', ')}
                            </span>
                        )}
                    </div>

                    {/* Two column descriptions */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px'
                    }}>
                        <div style={{
                            padding: '10px 12px',
                            borderRadius: '6px',
                            background: isEnabled && !isLocked ? `${COLORS.green}10` : COLORS.bg,
                            border: `1px solid ${isEnabled && !isLocked ? `${COLORS.green}30` : COLORS.border}`,
                            transition: 'all 0.15s ease'
                        }}>
                            <div style={{
                                fontSize: '10px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: isEnabled && !isLocked ? COLORS.green : COLORS.textMuted,
                                marginBottom: '4px'
                            }}>
                                Enabled
                            </div>
                            <div style={{
                                fontSize: '13px',
                                color: isEnabled && !isLocked ? COLORS.text : COLORS.textMuted,
                                lineHeight: '1.4'
                            }}>
                                {setting.enabledText}
                            </div>
                        </div>

                        <div style={{
                            padding: '10px 12px',
                            borderRadius: '6px',
                            background: !isEnabled || isLocked ? `${COLORS.red}08` : COLORS.bg,
                            border: `1px solid ${!isEnabled || isLocked ? `${COLORS.red}20` : COLORS.border}`,
                            transition: 'all 0.15s ease'
                        }}>
                            <div style={{
                                fontSize: '10px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: !isEnabled || isLocked ? COLORS.red : COLORS.textMuted,
                                marginBottom: '4px'
                            }}>
                                Disabled
                            </div>
                            <div style={{
                                fontSize: '13px',
                                color: !isEnabled || isLocked ? COLORS.text : COLORS.textMuted,
                                lineHeight: '1.4'
                            }}>
                                {setting.disabledText}
                            </div>
                        </div>
                    </div>

                    {/* Unlocks indicator */}
                    {unlockNames.length > 0 && (
                        <div style={{
                            marginTop: '10px',
                            fontSize: '11px',
                            color: isEnabled ? COLORS.green : COLORS.textMuted,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <Unlock size={12} />
                            {isEnabled ? 'Unlocks' : 'Will unlock'}: {unlockNames.join(', ')}
                        </div>
                    )}

                    {/* Note or link */}
                    {(setting.note || setting.link) && (
                        <div style={{
                            marginTop: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            flexWrap: 'wrap'
                        }}>
                            {setting.note && (
                                <div style={{
                                    fontSize: '11px',
                                    color: COLORS.gold,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <Info size={12} />
                                    {setting.note}
                                </div>
                            )}
                            {setting.link && (
                                <a
                                    href={setting.link.href}
                                    style={{
                                        fontSize: '11px',
                                        color: COLORS.accent,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        textDecoration: 'none'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                                    onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                                >
                                    <ExternalLink size={12} />
                                    {setting.link.text}
                                </a>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={isLocked ? undefined : onToggle}
                    disabled={isLocked}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px',
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center'
                    }}
                    title={isLocked ? `Requires ${unmetDependencies.map(id => getSettingName(id)).join(', ')}` : (isEnabled ? 'Click to disable' : 'Click to enable')}
                >
                    {isEnabled && !isLocked ? (
                        <ToggleRight size={32} color={COLORS.green} />
                    ) : (
                        <ToggleLeft size={32} color={isLocked ? COLORS.border : COLORS.textMuted} />
                    )}
                </button>
            </div>
        </div>
    );
}

// Detail view for a category
function CategoryDetail({ categoryId, onBack, enabledSettings, onToggle }) {
    const category = CATEGORIES[categoryId];
    const CategoryIcon = category.icon;
    const categorySettings = SETTINGS_BY_CATEGORY[categoryId] || [];

    return (
        <div style={{
            maxWidth: '800px',
            width: '100%',
            margin: '0 auto',
            padding: '32px 20px'
        }}>
            {/* Back button */}
            <button
                onClick={onBack}
                style={{
                    background: 'none',
                    border: 'none',
                    color: COLORS.textMuted,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 0',
                    marginBottom: '24px',
                    transition: 'color 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = COLORS.text}
                onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}
            >
                <ArrowLeft size={16} />
                Back to all categories
            </button>

            {/* Category header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '32px',
                paddingBottom: '24px',
                borderBottom: `1px solid ${COLORS.border}`
            }}>
                <div style={{
                    width: '56px',
                    height: '56px',
                    background: `${category.color}15`,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <CategoryIcon size={28} color={category.color} />
                </div>
                <div>
                    <h2 style={{
                        margin: '0 0 4px 0',
                        fontSize: '24px',
                        fontWeight: '600',
                        color: COLORS.text
                    }}>
                        {category.name}
                    </h2>
                    <p style={{
                        margin: 0,
                        fontSize: '14px',
                        color: COLORS.textMuted
                    }}>
                        {category.description}
                    </p>
                </div>
            </div>

            {/* Settings list */}
            <div>
                {categorySettings.map(setting => (
                    <SettingRow
                        key={setting.id}
                        setting={setting}
                        isEnabled={enabledSettings.has(setting.id)}
                        onToggle={() => onToggle(setting.id)}
                        enabledSettings={enabledSettings}
                    />
                ))}
            </div>
        </div>
    );
}

// Overview with category cards
function CategoryOverview({ onSelectCategory, enabledSettings }) {
    const categoryOrder = ['gamemode', 'combat', 'survival', 'gameplay', 'itempool', 'progression'];

    return (
        <div style={{
            maxWidth: '900px',
            width: '100%',
            margin: '0 auto',
            padding: '32px 20px'
        }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '16px'
            }}>
                {categoryOrder.map(categoryId => (
                    <CategoryCard
                        key={categoryId}
                        categoryId={categoryId}
                        onClick={() => onSelectCategory(categoryId)}
                        enabledSettings={enabledSettings}
                    />
                ))}
            </div>
        </div>
    );
}

export default function GameSettings() {
    const [selectedCategory, setSelectedCategory] = useState(null);

    // Initialize with default settings, auto-resolving dependencies
    const [enabledSettings, setEnabledSettings] = useState(() => {
        const defaults = new Set();

        // Helper to recursively add a setting and its dependencies
        const addWithDependencies = (id) => {
            if (defaults.has(id)) return;
            defaults.add(id);

            const setting = SETTINGS_MAP.get(id);
            if (setting?.requires) {
                const deps = Array.isArray(setting.requires)
                    ? setting.requires
                    : [setting.requires];
                deps.forEach(depId => addWithDependencies(depId));
            }
        };

        // Add all default-enabled settings with their dependencies
        SETTINGS.forEach(s => {
            if (s.default) addWithDependencies(s.id);
        });

        return defaults;
    });

    // Memoized toggle function (react-best-practices rule 5.2)
    const toggleSetting = useCallback((id) => {
        setEnabledSettings(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                // Dependency handling
                if (id === 'teams') {
                    next.delete('team_chat');
                }
                if (id === 'nether') {
                    next.delete('hard');
                    next.delete('end');
                    next.delete('extreme');
                }
                if (id === 'end' || id === 'hard') {
                    next.delete('extreme');
                }
            } else {
                next.add(id);
                // Dependency handling
                if (id === 'team_chat') {
                    next.add('teams');
                }
                if (id === 'hard' || id === 'end') {
                    next.add('nether');
                }
                if (id === 'extreme') {
                    next.add('nether');
                    next.add('end');
                    next.add('hard');
                }
            }
            return next;
        });
    }, []);

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
                    Game Settings
                </h1>
                <p style={{
                    fontSize: '16px',
                    color: COLORS.textMuted,
                    margin: 0,
                    maxWidth: '600px',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    lineHeight: '1.6'
                }}>
                    Configuration options for ForceItemBattle rounds. Controlled by the Game Master using{' '}
                    <code style={{
                        background: COLORS.bgLighter,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        color: COLORS.aqua
                    }}>/settings</code>
                </p>
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
                {selectedCategory ? (
                    <CategoryDetail
                        categoryId={selectedCategory}
                        onBack={() => setSelectedCategory(null)}
                        enabledSettings={enabledSettings}
                        onToggle={toggleSetting}
                    />
                ) : (
                    <CategoryOverview
                        onSelectCategory={setSelectedCategory}
                        enabledSettings={enabledSettings}
                    />
                )}
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
                        href="/#imprint"
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
    );
}