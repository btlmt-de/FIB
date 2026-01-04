import React, { useState, useEffect, useMemo } from 'react';
import { COLORS, API_BASE_URL } from '../../config/constants.js';
import * as LucideIcons from 'lucide-react';
import { X, Trophy, Lock, Check, Star, Sparkles, Zap, Target, Award } from 'lucide-react';

// Helper to render Lucide icons by name
function AchievementIcon({ name, size = 16, color, style = {} }) {
    const IconComponent = LucideIcons[name];
    if (!IconComponent) {
        return <Award size={size} color={color} style={style} />;
    }
    return <IconComponent size={size} color={color} style={style} />;
}

// Achievement category icons
const CATEGORY_ICONS = {
    beginner: <Star size={14} />,
    collection: <Award size={14} />,
    spins: <Zap size={14} />,
    events: <Sparkles size={14} />,
    duplicates: <Target size={14} />,
    special: <Trophy size={14} />
};

// Achievement category colors
const CATEGORY_COLORS = {
    beginner: COLORS.green,
    collection: COLORS.purple,
    spins: COLORS.orange,
    events: COLORS.gold,
    duplicates: COLORS.red,
    special: COLORS.aqua
};

export function Achievements({ onClose }) {
    const [achievements, setAchievements] = useState({});
    const [userAchievements, setUserAchievements] = useState({ unlocked: [], progress: {} });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [allRes, userRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/achievements`),
                fetch(`${API_BASE_URL}/api/achievements/me`, { credentials: 'include' })
            ]);

            const allData = await allRes.json();
            const userData = await userRes.json();

            setAchievements(allData.achievements || {});
            setUserAchievements(userData);
        } catch (e) {
            console.error('Failed to load achievements:', e);
        } finally {
            setLoading(false);
        }
    }

    // Memoize derived data
    const { unlockedIds, progress, achievementList, categories } = useMemo(() => {
        const unlocked = new Set(userAchievements.unlocked?.map(a => a.id) || []);
        const list = Object.values(achievements);
        const cats = [...new Set(list.map(a => a.category))];
        return {
            unlockedIds: unlocked,
            progress: userAchievements.progress || {},
            achievementList: list,
            categories: cats
        };
    }, [achievements, userAchievements]);

    // Memoize filtered achievements
    const { filteredAchievements, unlockedCount, totalVisible } = useMemo(() => {
        const filtered = achievementList.filter(a => {
            if (filter === 'all') return !a.hidden || unlockedIds.has(a.id);
            if (filter === 'unlocked') return unlockedIds.has(a.id);
            if (filter === 'locked') return !unlockedIds.has(a.id) && !a.hidden;
            return a.category === filter;
        });
        return {
            filteredAchievements: filtered,
            unlockedCount: unlockedIds.size,
            totalVisible: achievementList.filter(a => !a.hidden).length
        };
    }, [achievementList, filter, unlockedIds]);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .achievement-card {
                    transition: all 0.2s ease;
                }
                .achievement-card:hover {
                    transform: translateY(-2px);
                }
            `}</style>

            <div style={{
                background: COLORS.bg,
                borderRadius: '16px',
                border: `1px solid ${COLORS.border}`,
                width: '100%',
                maxWidth: '700px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 0.3s ease-out',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bg} 100%)`
                }}>
                    <div>
                        <h2 style={{
                            margin: 0,
                            color: COLORS.text,
                            fontWeight: '600',
                            fontSize: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <Trophy size={22} color={COLORS.gold} />
                            Achievements
                        </h2>
                        <div style={{ color: COLORS.textMuted, fontSize: '13px', marginTop: '4px' }}>
                            {unlockedCount} / {totalVisible} unlocked
                            {unlockedIds.size > totalVisible && ` (+${unlockedIds.size - totalVisible} hidden)`}
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'transparent',
                        border: 'none',
                        color: COLORS.textMuted,
                        fontSize: '24px',
                        cursor: 'pointer',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px'
                    }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div style={{ padding: '16px 24px', borderBottom: `1px solid ${COLORS.border}` }}>
                    <div style={{
                        height: '8px',
                        background: COLORS.bgLight,
                        borderRadius: '4px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${(unlockedCount / totalVisible) * 100}%`,
                            background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.orange})`,
                            borderRadius: '4px',
                            transition: 'width 0.5s ease'
                        }} />
                    </div>
                </div>

                {/* Filters */}
                <div style={{
                    padding: '12px 24px',
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    borderBottom: `1px solid ${COLORS.border}`
                }}>
                    {['all', 'unlocked', 'locked', ...categories].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: filter === f ? COLORS.accent : COLORS.bgLight,
                                color: filter === f ? '#fff' : COLORS.textMuted,
                                fontSize: '12px',
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            {CATEGORY_ICONS[f]}
                            {f}
                        </button>
                    ))}
                </div>

                {/* Achievements Grid */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '16px 24px'
                }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMuted }}>
                            Loading achievements...
                        </div>
                    ) : filteredAchievements.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMuted }}>
                            No achievements found
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '12px'
                        }}>
                            {filteredAchievements.map(achievement => {
                                const isUnlocked = unlockedIds.has(achievement.id);
                                const isHidden = achievement.hidden && !isUnlocked;
                                const prog = progress[achievement.id];
                                const progressPercent = prog ? Math.min((prog.current / prog.target) * 100, 100) : 0;
                                const categoryColor = CATEGORY_COLORS[achievement.category] || COLORS.gold;

                                return (
                                    <div
                                        key={achievement.id}
                                        className="achievement-card"
                                        style={{
                                            padding: '16px',
                                            background: isUnlocked
                                                ? `linear-gradient(135deg, ${categoryColor}22 0%, ${COLORS.bgLight} 100%)`
                                                : COLORS.bgLight,
                                            borderRadius: '12px',
                                            border: `1px solid ${isUnlocked ? categoryColor + '44' : COLORS.border}`,
                                            opacity: isUnlocked ? 1 : (isHidden ? 0.5 : 0.7),
                                            position: 'relative'
                                        }}
                                    >
                                        {/* Status icon */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '12px',
                                            right: '12px'
                                        }}>
                                            {isUnlocked ? (
                                                <Check size={18} color={COLORS.green} />
                                            ) : (
                                                <Lock size={16} color={COLORS.textMuted} />
                                            )}
                                        </div>

                                        {/* Icon and name */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                background: isUnlocked ? categoryColor + '33' : COLORS.bg,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '20px',
                                                border: `1px solid ${isUnlocked ? categoryColor : COLORS.border}`
                                            }}>
                                                {isHidden ? (
                                                    <LucideIcons.HelpCircle size={20} color={COLORS.textMuted} />
                                                ) : (
                                                    <AchievementIcon
                                                        name={achievement.icon}
                                                        size={20}
                                                        color={isUnlocked ? categoryColor : COLORS.textMuted}
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <div style={{
                                                    color: isUnlocked ? categoryColor : COLORS.text,
                                                    fontWeight: '600',
                                                    fontSize: '14px'
                                                }}>
                                                    {isHidden ? '???' : achievement.name}
                                                </div>
                                                <div style={{
                                                    color: COLORS.textMuted,
                                                    fontSize: '11px',
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {achievement.category}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div style={{
                                            color: COLORS.textMuted,
                                            fontSize: '12px',
                                            marginBottom: (prog && !isUnlocked && !isHidden) ? '12px' : '0'
                                        }}>
                                            {isHidden ? 'Hidden achievement - discover it yourself!' : achievement.description}
                                        </div>

                                        {/* Progress bar (if not unlocked, not hidden, and has progress) */}
                                        {prog && !prog.special && !isUnlocked && !isHidden && (
                                            <div>
                                                <div style={{
                                                    height: '4px',
                                                    background: COLORS.bg,
                                                    borderRadius: '2px',
                                                    overflow: 'hidden',
                                                    marginBottom: '4px'
                                                }}>
                                                    <div style={{
                                                        height: '100%',
                                                        width: `${progressPercent}%`,
                                                        background: categoryColor,
                                                        borderRadius: '2px'
                                                    }} />
                                                </div>
                                                <div style={{
                                                    color: COLORS.textMuted,
                                                    fontSize: '10px',
                                                    textAlign: 'right'
                                                }}>
                                                    {prog.current.toLocaleString()} / {prog.target.toLocaleString()}
                                                </div>
                                            </div>
                                        )}

                                        {/* Unlocked date */}
                                        {isUnlocked && (
                                            <div style={{
                                                color: COLORS.textMuted,
                                                fontSize: '10px',
                                                marginTop: '8px'
                                            }}>
                                                Unlocked {new Date(
                                                userAchievements.unlocked.find(a => a.id === achievement.id)?.unlocked_at
                                            ).toLocaleDateString()}
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
    );
}