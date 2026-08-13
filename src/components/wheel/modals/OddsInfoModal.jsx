// ============================================
// Drop Rates & Statistics Modal
// ============================================

import React, { useState, useRef } from 'react';
import { COLORS } from '../config/constants';
import { RARITY, RARITY_KEYS, getRarityInk } from '../../../utils/rarityHelpers.jsx';
import {
    Crown, Sparkles, Star, Gem, Diamond, ChevronDown, Zap, X,
    Calculator, BarChart3, Info, AlertTriangle, Scale,
    Gift, Shuffle, Repeat, Layers, Database, Server, TrendingUp, RefreshCw
} from 'lucide-react';

// Tiers this modal accounts for, derived from the shared ladder rather than
// listed by hand — the four separate hand-written tier lists that used to live in
// this file are why adding a rarity meant editing it in four places and missing
// one. `common` is excluded because it is the remainder, not a weighted tier.
const WEIGHTED_TIERS = RARITY_KEYS.filter(key => key !== 'common');

// Tiers the odds table reports "1 in N" for. Event is excluded from this one: it
// drops on a schedule rather than against the weight pool, so a per-spin
// probability for it would be a number with no meaning behind it.
const ODDS_TIERS = WEIGHTED_TIERS.filter(key => key !== 'event');

// ============================================
// Event Configuration Constants
// These should match server-side values
// ============================================

const RECURSION_EVENT = {
    probability: 0.25,      // 0.25% chance per spin
    minSpins: 3,
    maxSpins: 8,
    timeLimit: 60,          // seconds
};

const BONUS_EVENT = {
    probability: 0.5,       // 0.5% chance per spin
    distribution: {
        luckySpin: 40,      // 40%
        fiveXSpin: 40,      // 40%
        tripleLuckySpin: 20 // 20%
    }
};

// Server-wide events, triggered by a spin milestone rather than by any one player.
// Every value here mirrors globalEvents.js - if you change it there, change it here.
const GLOBAL_EVENTS = {
    minSpins: 300,          // MIN_SPINS_BETWEEN_EVENTS
    maxSpins: 600,          // MAX_SPINS_BETWEEN_EVENTS
    durationMinutes: 5,     // all four run for 5 minutes
    countdownSeconds: 5,    // ACTIVATION_DELAY_MS
    // EVENT_TYPES are all weight 1, so each firing is an even pick between the four
    chanceEach: 25,
};

const EVENT_DETAILS = [
    {
        key: 'gold_rush',
        name: 'Gold Rush',
        color: '#F59E0B',
        tagline: 'Better odds for everyone',
        body: 'One rarity is picked at random and its drop rate is doubled for the whole server. Nothing to do but spin.',
        stat: '2x odds',
        statLabel: 'on rare, exotic, legendary, mythic or insane',
    },
    {
        key: 'king_of_wheel',
        name: 'King of the Wheel',
        color: '#F43F5E',
        tagline: 'Highest score wins',
        body: 'Every spin scores: 1 point for a common, far more for anything rare (roughly 1,000,000 ÷ its weight). The top scorer takes the prize.',
        stat: '6-24',
        statLabel: 'lucky spins to the winner',
    },
    {
        key: 'first_blood',
        name: 'First Blood',
        color: '#DC2626',
        tagline: 'A race to one drop',
        body: 'The first player to land rare or better wins outright and ends the event on the spot. Rarer pull, bigger reward.',
        stat: '9-25',
        statLabel: 'lucky spins, by rarity pulled',
    },
    {
        key: 'community_goal',
        name: 'Community Goal',
        color: '#2DD4BF',
        tagline: 'Everyone against the target',
        body: 'Every spin adds to one shared score, and rarer items add far more. The server climbs three stages together; the target grows as more players join, but so does what they bring. Iron is pure effort, but Gold and Diamond also need the server to actually find rares - one for Gold, two for Diamond - so no amount of spinning alone will take the top stages. Turning up pays, clearing stages pays more, and nobody competes.',
        stat: '2-14',
        statLabel: 'lucky spins to every participant',
    },
];

export function OddsInfoModal({
                                  onClose,
                                  dynamicItems,
                                  allItems,
                                  isMobile
                              }) {
    const modalContentRef = useRef(null);
    const [expandedRarities, setExpandedRarities] = useState({});

    // Calculate weights by rarity tier from dynamicItems
    const TOTAL_WEIGHT = 10000000;

    const tierWeights = Object.fromEntries(WEIGHTED_TIERS.map(key => [key, 0]));

    let totalSpecialWeight = 0;
    const specialItemCount = dynamicItems ? dynamicItems.length : 0;

    if (dynamicItems && dynamicItems.length > 0) {
        dynamicItems.forEach(item => {
            const weight = item.weight || 0;
            totalSpecialWeight += weight;
            if (item.rarity && tierWeights.hasOwnProperty(item.rarity)) {
                tierWeights[item.rarity] += weight;
            }
        });
    }

    const regularWeight = Math.max(0, TOTAL_WEIGHT - totalSpecialWeight);
    const regularItemCount = allItems ? allItems.length : 0;
    const totalItemCount = (dynamicItems?.length || 0) + regularItemCount;

    // Calculate expected spins (1/probability = totalWeight/tierWeight)
    const expectedSpins = Object.fromEntries(ODDS_TIERS.map(key => [
        key,
        tierWeights[key] > 0 ? Math.round(TOTAL_WEIGHT / tierWeights[key]) : null,
    ]));

    // Calculate confidence intervals using geometric distribution
    const calculateConfidenceSpins = (weight, confidence) => {
        // Validate inputs
        if (!Number.isFinite(weight) || weight <= 0) return null;
        if (!Number.isFinite(TOTAL_WEIGHT) || TOTAL_WEIGHT <= 0) return null;

        let p = weight / TOTAL_WEIGHT;

        // Handle edge cases
        if (p >= 1) return 1; // Guaranteed success
        if (p <= 0) return null;

        // Clamp p to valid range for logarithm calculation
        p = Math.min(Math.max(p, Number.EPSILON), 1 - Number.EPSILON);

        const result = Math.ceil(Math.log(1 - confidence) / Math.log(1 - p));
        return Number.isFinite(result) ? result : null;
    };

    const confidenceSpins = Object.fromEntries(ODDS_TIERS.map(key => [key, {
        median: calculateConfidenceSpins(tierWeights[key], 0.5),
        p90: calculateConfidenceSpins(tierWeights[key], 0.9),
        p99: calculateConfidenceSpins(tierWeights[key], 0.99),
    }]));

    // Format large numbers - show full numbers with commas
    const formatNumber = (n) => {
        if (n === null) return '--';
        return n.toLocaleString();
    };

    // Format as "1 in X"
    const formatOdds = (weight) => {
        if (!weight || weight <= 0) return '--';
        const odds = Math.round(TOTAL_WEIGHT / weight);
        if (odds >= 1000000) return '1 in ' + (odds / 1000000).toFixed(0) + 'M';
        if (odds >= 1000) return '1 in ' + Math.round(odds / 1000).toLocaleString() + 'K';
        return '1 in ' + odds.toLocaleString();
    };

    // Format percentage
    const formatPercent = (weight) => {
        const w = Number(weight);
        if (!Number.isFinite(w) || !Number.isFinite(TOTAL_WEIGHT) || TOTAL_WEIGHT === 0) {
            return '0';
        }
        const chance = (w / TOTAL_WEIGHT) * 100;
        let str;
        if (chance >= 1) str = chance.toFixed(2);
        else if (chance >= 0.1) str = chance.toFixed(3);
        else if (chance >= 0.01) str = chance.toFixed(4);
        else if (chance >= 0.001) str = chance.toFixed(5);
        else if (chance >= 0.0001) str = chance.toFixed(6);
        else str = chance.toFixed(7);
        return str.replace(/\.?0+$/, '');
    };

    // Calculate percentages
    const specialPercent = ((totalSpecialWeight / TOTAL_WEIGHT) * 100).toFixed(2);
    const regularPercent = ((regularWeight / TOTAL_WEIGHT) * 100).toFixed(2);

    // Handle rarity dropdown toggle
    const toggleRarity = (rarity) => {
        const scrollTop = modalContentRef.current?.scrollTop || 0;
        setExpandedRarities(prev => ({ ...prev, [rarity]: !prev[rarity] }));
        requestAnimationFrame(() => {
            if (modalContentRef.current) {
                modalContentRef.current.scrollTop = scrollTop;
            }
        });
    };

    // Get items for a rarity tier
    const getItemsForRarity = (rarity) => {
        if (!dynamicItems) return [];
        return dynamicItems
            .filter(i => i.rarity === rarity)
            .sort((a, b) => (a.weight || 0) - (b.weight || 0));
    };

    // Rarity config. Label and colour come from the shared ladder; the icon is
    // declared here because these render at 16px inside a card header rather than
    // at the helper's default. Colours are the ink step — every one of these is
    // set as text next to a figure, not as a swatch.
    const rarityIcons = {
        insane: <Crown size={16} />,
        mythic: <Sparkles size={16} />,
        legendary: <Star size={16} />,
        exotic: <Gem size={16} />,
        rare: <Diamond size={16} />,
        event: <Zap size={16} />,
    };
    const rarityConfig = Object.fromEntries(ODDS_TIERS.map(key => [key, {
        icon: rarityIcons[key],
        color: getRarityInk(key),
        label: RARITY[key].label,
    }]));

    // Stat Cell Component - must be defined before RarityCard which uses it
    const StatCell = ({ label, value, sublabel, color, isFirst }) => (
        <div style={{
            background: COLORS.bgLighter,
            padding: '12px 6px',
            textAlign: 'center',
            borderLeft: isFirst ? 'none' : `1px solid ${COLORS.border}44`
        }}>
            <div style={{
                color: color || COLORS.text,
                fontSize: '15px',
                fontWeight: '700',
                fontFamily: 'monospace',
                marginBottom: '3px',
                textShadow: color ? `0 0 12px ${color}66` : 'none'
            }}>
                {value}
            </div>
            <div style={{
                color: COLORS.textMuted,
                fontSize: '10px',
                marginBottom: '4px'
            }}>
                spins
            </div>
            <div style={{
                color: COLORS.text,
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '600'
            }}>
                {label}
            </div>
            {sublabel && (
                <div style={{ color: COLORS.textMuted, fontSize: '10px', marginTop: '2px' }}>
                    {sublabel}
                </div>
            )}
        </div>
    );

    // Rarity Card Component
    const RarityCard = ({ rarity }) => {
        const config = rarityConfig[rarity];
        const items = getItemsForRarity(rarity);
        const isExpanded = expandedRarities[rarity];
        const conf = confidenceSpins[rarity];
        const weight = tierWeights[rarity];

        if (!weight || weight <= 0) return null;

        return (
            <div style={{
                background: COLORS.bgLight,
                borderRadius: '10px',
                border: `1px solid ${config.color}33`,
                overflow: 'hidden',
                marginBottom: '12px'
            }}>
                {/* Card Header */}
                <button
                    type="button"
                    onClick={() => items.length > 0 && toggleRarity(rarity)}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 14px',
                        background: `${config.color}11`,
                        border: 'none',
                        borderBottom: `1px solid ${config.color}22`,
                        cursor: items.length > 0 ? 'pointer' : 'default'
                    }}
                >
                    <span style={{ color: config.color }}>{config.icon}</span>
                    <span style={{ color: config.color, fontSize: '14px', fontWeight: '600', flex: 1, textAlign: 'left' }}>
                        {config.label}
                    </span>
                    <span style={{ color: COLORS.textMuted, fontSize: '12px', fontFamily: 'monospace' }}>
                        {formatOdds(weight)}
                    </span>
                    {items.length > 0 && (
                        <ChevronDown
                            size={14}
                            style={{
                                color: COLORS.textMuted,
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s'
                            }}
                        />
                    )}
                </button>

                {/* Stats Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    background: COLORS.bgLighter
                }}>
                    <StatCell label="Average" value={formatNumber(expectedSpins[rarity])} color={config.color} isFirst />
                    <StatCell label="50%" value={formatNumber(conf.median)} sublabel="Median" />
                    <StatCell label="90%" value={formatNumber(conf.p90)} />
                    <StatCell label="99%" value={formatNumber(conf.p99)} />
                </div>

                {/* Expanded items list */}
                {isExpanded && items.length > 0 && (
                    <div style={{ borderTop: `1px solid ${COLORS.border}` }}>
                        {items.map((item, idx) => (
                            <div
                                key={item.id || idx}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 14px',
                                    fontSize: '12px',
                                    borderBottom: idx < items.length - 1 ? `1px solid ${COLORS.border}` : 'none'
                                }}
                            >
                                <span style={{ color: COLORS.text }}>{item.name}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ color: COLORS.textMuted, fontFamily: 'monospace', fontSize: '10px' }}>
                                        {item.weight?.toLocaleString()}
                                    </span>
                                    <span style={{ color: config.color, fontFamily: 'monospace', fontWeight: '500' }}>
                                        {formatPercent(item.weight)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: '16px',
                boxSizing: 'border-box'
            }}
            onClick={onClose}
        >
            <div
                ref={modalContentRef}
                style={{
                    background: COLORS.bg,
                    borderRadius: '16px',
                    padding: isMobile ? '20px' : '24px',
                    maxWidth: '520px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    border: `1px solid ${COLORS.border}`
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BarChart3 size={20} color={COLORS.gold} />
                        <span style={{ color: COLORS.gold, fontSize: '18px', fontWeight: '600' }}>
                            Drop Rates & Statistics
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            color: COLORS.textMuted,
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Formula */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{
                        padding: '14px 16px',
                        background: `linear-gradient(135deg, ${COLORS.bg} 0%, ${COLORS.aqua}08 100%)`,
                        borderRadius: '10px',
                        border: `1px solid ${COLORS.aqua}33`
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <Calculator size={14} color={COLORS.aqua} />
                            <span style={{ color: COLORS.aqua, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                The Formula
                            </span>
                        </div>
                        <code style={{ color: COLORS.text, fontSize: '14px', fontWeight: '500' }}>
                            Drop Rate = Weight ÷ 10,000,000
                        </code>
                    </div>
                </div>

                {/* Rarity Cards */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{
                        color: COLORS.textMuted,
                        fontSize: '11px',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        <TrendingUp size={12} /> Drop Rates by Rarity
                    </div>

                    {ODDS_TIERS.map(rarity => (
                        <RarityCard key={rarity} rarity={rarity} />
                    ))}
                </div>

                {/* Understanding Statistics */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{
                        color: COLORS.textMuted,
                        fontSize: '11px',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        <Info size={12} /> Understanding the Numbers
                    </div>
                    <div style={{
                        padding: '14px',
                        background: COLORS.bgLight,
                        borderRadius: '10px',
                        border: `1px solid ${COLORS.border}`,
                        fontSize: '12px',
                        color: COLORS.textMuted,
                        lineHeight: 1.7
                    }}>
                        <div style={{ marginBottom: '10px' }}>
                            <span style={{ color: COLORS.text, fontWeight: '500' }}>Average</span> — Statistical mean.
                            <span style={{ color: COLORS.orange }}> Does NOT guarantee you'll get it in this many spins!</span>
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                            <span style={{ color: COLORS.text, fontWeight: '500' }}>50% (Median)</span> — Half of players get the drop within this many spins.
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                            <span style={{ color: COLORS.text, fontWeight: '500' }}>90%</span> — 9 out of 10 players get it within this many spins.
                        </div>
                        <div>
                            <span style={{ color: COLORS.text, fontWeight: '500' }}>99%</span> — Only 1 in 100 players need more spins than this.
                        </div>
                    </div>
                </div>

                {/* Gambler's Fallacy Warning */}
                <div style={{
                    padding: '14px',
                    background: `linear-gradient(135deg, ${COLORS.orange}11 0%, ${COLORS.bg} 100%)`,
                    borderRadius: '10px',
                    border: `1px solid ${COLORS.orange}33`,
                    marginBottom: '20px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <AlertTriangle size={14} color={COLORS.orange} />
                        <span style={{ color: COLORS.orange, fontSize: '12px', fontWeight: '600' }}>
                            The Gambler's Fallacy
                        </span>
                    </div>
                    <div style={{ color: COLORS.textMuted, fontSize: '12px', lineHeight: 1.5 }}>
                        Every spin is independent. Past spins don't affect future ones. Being "due" for a drop is a myth — the odds reset every single spin.
                    </div>
                </div>

                {/* Recursion Event */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{
                        color: COLORS.textMuted,
                        fontSize: '11px',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        <RefreshCw size={12} /> Recursion Event
                    </div>
                    <div style={{
                        background: `linear-gradient(135deg, ${COLORS.recursionDark} 0%, ${COLORS.bg} 100%)`,
                        borderRadius: '10px',
                        border: `1px solid ${COLORS.recursion}44`,
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '14px',
                            borderBottom: `1px solid ${COLORS.recursion}22`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ color: COLORS.recursion, fontSize: '13px', fontWeight: '600' }}>
                                The Wheel Within The Wheel
                            </span>
                            <span style={{ color: COLORS.recursion, fontSize: '14px', fontWeight: '600', fontFamily: 'monospace' }}>{RECURSION_EVENT.probability}%</span>
                        </div>
                        <div style={{ padding: '14px' }}>
                            <div style={{ color: COLORS.textMuted, fontSize: '12px', lineHeight: 1.6, marginBottom: '12px' }}>
                                A rare global event that triggers for <span style={{ color: COLORS.text }}>everyone online</span>.
                                When triggered, all active players receive <span style={{ color: COLORS.recursion, fontWeight: '500' }}>{RECURSION_EVENT.minSpins}-{RECURSION_EVENT.maxSpins} Lucky Spins</span> to
                                use within <span style={{ color: COLORS.text }}>{RECURSION_EVENT.timeLimit} seconds</span>.
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '8px',
                                padding: '10px',
                                background: `${COLORS.recursion}11`,
                                borderRadius: '8px',
                                border: `1px solid ${COLORS.recursion}22`
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ color: COLORS.recursion, fontSize: '16px', fontWeight: '700', fontFamily: 'monospace' }}>
                                        {RECURSION_EVENT.minSpins}-{RECURSION_EVENT.maxSpins}
                                    </div>
                                    <div style={{ color: COLORS.textMuted, fontSize: '10px', textTransform: 'uppercase' }}>Lucky Spins</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ color: COLORS.recursion, fontSize: '16px', fontWeight: '700', fontFamily: 'monospace' }}>
                                        {RECURSION_EVENT.timeLimit}s
                                    </div>
                                    <div style={{ color: COLORS.textMuted, fontSize: '10px', textTransform: 'uppercase' }}>Time Limit</div>
                                </div>
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '11px', marginTop: '10px', fontStyle: 'italic' }}>
                                Lucky spins have equal chance for ALL items — including Insane!
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bonus Event */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{
                        color: COLORS.textMuted,
                        fontSize: '11px',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        <Gift size={12} /> Bonus Event
                    </div>
                    <div style={{
                        background: COLORS.bgLight,
                        borderRadius: '10px',
                        border: `1px solid ${COLORS.border}`,
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '12px 14px',
                            borderBottom: `1px solid ${COLORS.border}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ color: COLORS.text, fontSize: '13px' }}>Chance to trigger bonus wheel</span>
                            <span style={{ color: COLORS.orange, fontSize: '14px', fontWeight: '600', fontFamily: 'monospace' }}>{BONUS_EVENT.probability}%</span>
                        </div>
                        <div style={{ padding: '12px 14px' }}>
                            <div style={{ color: COLORS.textMuted, fontSize: '11px', marginBottom: '10px' }}>Bonus wheel distribution:</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Shuffle size={12} color={COLORS.green} />
                                        <span style={{ color: COLORS.text }}>Lucky Spin</span>
                                    </div>
                                    <span style={{ color: COLORS.green, fontFamily: 'monospace', fontWeight: '500' }}>{BONUS_EVENT.distribution.luckySpin}%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Repeat size={12} color={COLORS.gold} />
                                        <span style={{ color: COLORS.text }}>5x Spin</span>
                                    </div>
                                    <span style={{ color: COLORS.gold, fontFamily: 'monospace', fontWeight: '500' }}>{BONUS_EVENT.distribution.fiveXSpin}%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Zap size={12} color={COLORS.green} />
                                        <span style={{ color: COLORS.text }}>Triple Lucky Spin</span>
                                    </div>
                                    <span style={{ color: COLORS.green, fontFamily: 'monospace', fontWeight: '500' }}>{BONUS_EVENT.distribution.tripleLuckySpin}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lucky & 5x Spin Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                    <div style={{
                        padding: '12px',
                        background: `${COLORS.green}11`,
                        borderRadius: '10px',
                        border: `1px solid ${COLORS.green}33`
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <Shuffle size={12} color={COLORS.green} />
                            <span style={{ color: COLORS.green, fontSize: '12px', fontWeight: '600' }}>Lucky Spin</span>
                        </div>
                        <div style={{ color: COLORS.textMuted, fontSize: '11px', lineHeight: 1.4 }}>
                            Equal chance for ALL items
                        </div>
                    </div>
                    <div style={{
                        padding: '12px',
                        background: `${COLORS.gold}11`,
                        borderRadius: '10px',
                        border: `1px solid ${COLORS.gold}33`
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <Repeat size={12} color={COLORS.gold} />
                            <span style={{ color: COLORS.gold, fontSize: '12px', fontWeight: '600' }}>5x Spin</span>
                        </div>
                        <div style={{ color: COLORS.textMuted, fontSize: '11px', lineHeight: 1.4 }}>
                            5 spins with normal odds
                        </div>
                    </div>
                </div>

                {/* Global Events */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{
                        color: COLORS.textMuted,
                        fontSize: '11px',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        <Server size={12} /> Global Events
                    </div>

                    {/* How they fire - shared by all four */}
                    <div style={{
                        background: COLORS.bgLight,
                        borderRadius: '10px',
                        border: `1px solid ${COLORS.border}`,
                        padding: '12px 14px',
                        marginBottom: '10px'
                    }}>
                        <div style={{ color: COLORS.textMuted, fontSize: '12px', lineHeight: 1.6 }}>
                            Every <span style={{ color: COLORS.text }}>{GLOBAL_EVENTS.minSpins}-{GLOBAL_EVENTS.maxSpins} spins</span> across
                            the whole server, one of four events fires at random. They are not tied to your spins
                            or your luck &mdash; everyone online gets the same event at the same time, after a{' '}
                            <span style={{ color: COLORS.text }}>{GLOBAL_EVENTS.countdownSeconds} second</span> countdown,
                            and it runs for <span style={{ color: COLORS.text }}>{GLOBAL_EVENTS.durationMinutes} minutes</span>.
                        </div>
                        <div style={{
                            display: 'flex',
                            gap: '6px',
                            marginTop: '10px',
                            flexWrap: 'wrap'
                        }}>
                            {EVENT_DETAILS.map(e => (
                                <div key={e.key} style={{
                                    flex: '1 1 auto',
                                    textAlign: 'center',
                                    padding: '6px 8px',
                                    background: `${e.color}15`,
                                    border: `1px solid ${e.color}33`,
                                    borderRadius: '6px',
                                }}>
                                    <div style={{ color: e.color, fontSize: '13px', fontWeight: '700', fontFamily: 'monospace' }}>
                                        {GLOBAL_EVENTS.chanceEach}%
                                    </div>
                                    <div style={{ color: COLORS.textMuted, fontSize: '9px', whiteSpace: 'nowrap' }}>
                                        {e.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* One card per event */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {EVENT_DETAILS.map(e => (
                            <div key={e.key} style={{
                                background: `linear-gradient(135deg, ${e.color}0D 0%, ${COLORS.bg} 100%)`,
                                borderRadius: '10px',
                                border: `1px solid ${e.color}44`,
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    padding: '10px 14px',
                                    borderBottom: `1px solid ${e.color}22`,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}>
                                    <span style={{ color: e.color, fontSize: '13px', fontWeight: '600' }}>
                                        {e.name}
                                    </span>
                                    <span style={{
                                        color: COLORS.textMuted,
                                        fontSize: '11px',
                                        fontStyle: 'italic',
                                        textAlign: 'right'
                                    }}>
                                        {e.tagline}
                                    </span>
                                </div>
                                <div style={{ padding: '12px 14px' }}>
                                    <div style={{ color: COLORS.textMuted, fontSize: '12px', lineHeight: 1.6 }}>
                                        {e.body}
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'baseline',
                                        gap: '8px',
                                        marginTop: '10px',
                                        padding: '8px 10px',
                                        background: `${e.color}11`,
                                        borderRadius: '8px',
                                        border: `1px solid ${e.color}22`
                                    }}>
                                        <span style={{
                                            color: e.color,
                                            fontSize: '15px',
                                            fontWeight: '700',
                                            fontFamily: 'monospace',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {e.stat}
                                        </span>
                                        <span style={{ color: COLORS.textMuted, fontSize: '11px' }}>
                                            {e.statLabel}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ color: COLORS.textMuted, fontSize: '11px', marginTop: '10px', fontStyle: 'italic' }}>
                        Lucky spins won from any event give an equal chance for ALL items &mdash; including Insane.
                    </div>
                </div>

                {/* Current Pool Stats */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{
                        color: COLORS.textMuted,
                        fontSize: '11px',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        <Database size={12} /> Current Pool
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px'
                    }}>
                        <div style={{
                            padding: '12px',
                            background: COLORS.bgLight,
                            borderRadius: '8px',
                            border: `1px solid ${COLORS.border}`,
                            textAlign: 'center'
                        }}>
                            <div style={{ color: COLORS.text, fontSize: '16px', fontWeight: '600', fontFamily: 'monospace' }}>
                                {specialItemCount}
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '10px' }}>Special</div>
                        </div>
                        <div style={{
                            padding: '12px',
                            background: COLORS.bgLight,
                            borderRadius: '8px',
                            border: `1px solid ${COLORS.border}`,
                            textAlign: 'center'
                        }}>
                            <div style={{ color: COLORS.text, fontSize: '16px', fontWeight: '600', fontFamily: 'monospace' }}>
                                {regularItemCount}
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '10px' }}>Regular</div>
                        </div>
                        <div style={{
                            padding: '12px',
                            background: COLORS.bgLight,
                            borderRadius: '8px',
                            border: `1px solid ${COLORS.border}`,
                            textAlign: 'center'
                        }}>
                            <div style={{ color: COLORS.gold, fontSize: '16px', fontWeight: '600', fontFamily: 'monospace' }}>
                                {totalItemCount}
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '10px' }}>Total</div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    color: COLORS.textMuted,
                    fontSize: '10px',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    paddingTop: '8px',
                    borderTop: `1px solid ${COLORS.border}`
                }}>
                    <Server size={10} /> All spins processed server-side · Provably fair
                </div>
            </div>
        </div>
    );
}