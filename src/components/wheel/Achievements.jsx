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

export function Achievements({ onClose, userId, username, isOwnProfile = true }) {
    const [achievements, setAchievements] = useState({});
    const [userAchievements, setUserAchievements] = useState({ unlocked: [], progress: {} });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [hiddenStats, setHiddenStats] = useState({ unlocked: 0, total: 0 });

    useEffect(() => {
        loadData();
    }, [userId, isOwnProfile]);

    async function loadData() {
        try {
            if (!isOwnProfile && !userId) {
                throw new Error('Missing userId for non-owner achievements view');
            }
            // Fetch all achievements definition
            const allRes = await fetch(`${API_BASE_URL}/api/achievements`);

            if (!allRes.ok) {
                throw new Error(`Failed to fetch achievements: ${allRes.status}`);
            }

            const allData = await allRes.json();
            setAchievements(allData.achievements || {});

            // Fetch user's achievements - different endpoint for own vs others
            let userRes;
            if (isOwnProfile) {
                userRes = await fetch(`${API_BASE_URL}/api/achievements/me`, { credentials: 'include' });
            } else {
                userRes = await fetch(`${API_BASE_URL}/api/achievements/user/${userId}`);
            }

            if (!userRes.ok) {
                throw new Error(`Failed to fetch user achievements: ${userRes.status}`);
            }

            const userData = await userRes.json();
            setUserAchievements(userData);

            // Store hidden achievement stats for other users
            if (!isOwnProfile) {
                setHiddenStats({
                    unlocked: userData.hiddenUnlockedCount || 0,
                    total: userData.totalHidden || 0
                });
            }
        } catch (e) {
            console.error('Failed to load achievements:', e);
        } finally {
            setLoading(false);
        }
    }

    // Memoize derived data
    const { unlockedIds, unlockedCensored, progress, achievementList, categories } = useMemo(() => {
        const unlocked = new Set(userAchievements.unlocked?.map(a => a.id) || []);
        // Track which unlocked achievements are censored (hidden achievements from other users)
        const censored = new Set(
            userAchievements.unlocked?.filter(a => a.censored).map(a => a.id) || []
        );
        const list = Object.values(achievements);
        const cats = [...new Set(list.map(a => a.category))];
        return {
            unlockedIds: unlocked,
            unlockedCensored: censored,
            progress: userAchievements.progress || {},
            achievementList: list,
            categories: cats
        };
    }, [achievements, userAchievements]);

    // Memoize filtered achievements
    const { filteredAchievements, unlockedCount, totalAchievements, hiddenCount } = useMemo(() => {
        const filtered = achievementList.filter(a => {
            // For other users: only show hidden achievements if they've unlocked them
            if (!isOwnProfile && a.hidden && !unlockedIds.has(a.id)) {
                return false;
            }

            if (filter === 'all') return !a.hidden || unlockedIds.has(a.id);
            if (filter === 'unlocked') return unlockedIds.has(a.id);
            if (filter === 'locked') return !unlockedIds.has(a.id) && !a.hidden;
            return a.category === filter;
        });
        return {
            filteredAchievements: filtered,
            unlockedCount: unlockedIds.size,
            totalAchievements: achievementList.length,
            hiddenCount: achievementList.filter(a => a.hidden).length
        };
    }, [achievementList, filter, unlockedIds, isOwnProfile]);

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
                            {isOwnProfile ? 'Achievements' : `${username}'s Achievements`}
                        </h2>
                        <div style={{ color: COLORS.textMuted, fontSize: '13px', marginTop: '4px' }}>
                            {unlockedCount} / {totalAchievements} unlocked
                            {isOwnProfile && hiddenCount > 0 && ` (${hiddenCount} hidden)`}
                            {!isOwnProfile && hiddenStats.total > 0 && (
                                <span style={{ color: COLORS.purple }}>
                                    {' '}· {hiddenStats.unlocked} / {hiddenStats.total} secret
                                </span>
                            )}
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
                            width: `${Math.max(0, Math.min(100, totalAchievements > 0 ? (unlockedCount / totalAchievements) * 100 : 0))}%`,
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
                                const isCensored = unlockedCensored.has(achievement.id);
                                const isHidden = (achievement.hidden && !isUnlocked) || isCensored;
                                const prog = progress[achievement.id];
                                const progressPercent = prog && Number.isFinite(prog.target) && prog.target > 0
                                    ? Math.min((prog.current / prog.target) * 100, 100)
                                    : 0;
                                const categoryColor = CATEGORY_COLORS[achievement.category] || COLORS.gold;

                                // Determine what to show for hidden/censored achievements
                                const showName = isCensored ? '??? Secret Achievement' : (isHidden ? '???' : achievement.name);
                                const showDescription = isCensored
                                    ? 'This user has unlocked a secret achievement!'
                                    : (isHidden ? 'Hidden achievement - discover it yourself!' : achievement.description);

                                return (
                                    <div
                                        key={achievement.id}
                                        className="achievement-card"
                                        style={{
                                            padding: '16px',
                                            background: isUnlocked
                                                ? isCensored
                                                    ? `linear-gradient(135deg, ${COLORS.purple}22 0%, ${COLORS.bgLight} 100%)`
                                                    : `linear-gradient(135deg, ${categoryColor}22 0%, ${COLORS.bgLight} 100%)`
                                                : COLORS.bgLight,
                                            borderRadius: '12px',
                                            border: `1px solid ${isUnlocked ? (isCensored ? COLORS.purple + '44' : categoryColor + '44') : COLORS.border}`,
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
                                                background: isUnlocked
                                                    ? (isCensored ? COLORS.purple + '33' : categoryColor + '33')
                                                    : COLORS.bg,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '20px',
                                                border: `1px solid ${isUnlocked ? (isCensored ? COLORS.purple : categoryColor) : COLORS.border}`
                                            }}>
                                                {isHidden ? (
                                                    <LucideIcons.HelpCircle size={20} color={isCensored && isUnlocked ? COLORS.purple : COLORS.textMuted} />
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
                                                    color: isUnlocked ? (isCensored ? COLORS.purple : categoryColor) : COLORS.text,
                                                    fontWeight: '600',
                                                    fontSize: '14px'
                                                }}>
                                                    {showName}
                                                </div>
                                                <div style={{
                                                    color: COLORS.textMuted,
                                                    fontSize: '11px',
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {isCensored ? 'Secret' : achievement.category}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div style={{
                                            color: COLORS.textMuted,
                                            fontSize: '12px',
                                            marginBottom: (prog && !isUnlocked && !isHidden) ? '12px' : '0'
                                        }}>
                                            {showDescription}
                                        </div>

                                        {/* Progress bar (if not unlocked, not hidden, and has progress) */}
                                        {prog && !prog.special && !isUnlocked && !isHidden && prog.current != null && prog.target != null && (
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
                                                    {(prog.current ?? 0).toLocaleString()} / {(prog.target ?? 0).toLocaleString()}
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
                                                Unlocked {(() => {
                                                const unlockedAt = userAchievements.unlocked?.find(a => a.id === achievement.id)?.unlocked_at;
                                                if (!unlockedAt) return 'Unknown date';
                                                const date = new Date(unlockedAt);
                                                return isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString();
                                            })()}
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