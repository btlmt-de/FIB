import React, { useState, useEffect, useCallback, useMemo } from 'react';
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3';
import Crown from 'lucide-react/dist/esm/icons/crown';
import History from 'lucide-react/dist/esm/icons/history';
import FlaskConical from 'lucide-react/dist/esm/icons/flask-conical';

import { STATS_COLORS as COLORS, generateMockStats } from './statsUtils.js';
import { TabNavigation, EntitySelector } from './StatsComponents.jsx';
import { StatsView } from './StatsView.jsx';
import { StatsLeaderboard } from './StatsLeaderboard.jsx';
import { StatsMatchHistory } from './StatsMatchHistory.jsx';
import { StatsComparison } from './StatsComparison.jsx';

// ============================================================================
// STATIC DATA - Hoisted outside component to prevent recreation
// ============================================================================

const TAB_CONFIG = [
    { id: 'overview', label: 'Overview', Icon: BarChart3 },
    { id: 'leaderboards', label: 'Leaderboards', Icon: Crown },
    { id: 'history', label: 'Match History', Icon: History },
];

// ============================================================================
// MAIN STATS PAGE COMPONENT
// ============================================================================

export default function Stats() {
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [selectedStats, setSelectedStats] = useState(null);
    const [compareMode, setCompareMode] = useState(false);
    const [compareEntity1, setCompareEntity1] = useState(null);
    const [compareStats1, setCompareStats1] = useState(null);
    const [compareEntity2, setCompareEntity2] = useState(null);
    const [compareStats2, setCompareStats2] = useState(null);
    const [selectingFor, setSelectingFor] = useState(null);

    // Memoize tabs with icons to prevent recreation on every render
    const tabs = useMemo(() => TAB_CONFIG.map(tab => ({
        id: tab.id,
        label: tab.label,
        icon: <tab.Icon size={18} />
    })), []);

    // Load stats when entity changes
    useEffect(() => {
        if (selectedEntity) {
            // TODO: Replace with API call
            const stats = generateMockStats(selectedEntity.id, selectedEntity.type === 'team');
            setSelectedStats(stats);
        } else {
            setSelectedStats(null);
        }
    }, [selectedEntity]);

    // Load compare stats
    useEffect(() => {
        if (compareEntity1) {
            const stats = generateMockStats(compareEntity1.id, compareEntity1.type === 'team');
            setCompareStats1(stats);
        } else {
            setCompareStats1(null);
        }
    }, [compareEntity1]);

    useEffect(() => {
        if (compareEntity2) {
            const stats = generateMockStats(compareEntity2.id, compareEntity2.type === 'team');
            setCompareStats2(stats);
        } else {
            setCompareStats2(null);
        }
    }, [compareEntity2]);

    const handleEntitySelect = useCallback((entity) => {
        if (compareMode && selectingFor) {
            if (selectingFor === 'left') {
                setCompareEntity1(entity);
            } else {
                setCompareEntity2(entity);
            }
            setSelectingFor(null);
        } else if (compareMode) {
            if (!compareEntity1) {
                setCompareEntity1(entity);
            } else if (!compareEntity2) {
                setCompareEntity2(entity);
            } else {
                setCompareEntity1(entity);
            }
        } else {
            setSelectedEntity(entity);
        }
    }, [compareMode, selectingFor, compareEntity1, compareEntity2]);

    const handleToggleCompare = useCallback(() => {
        setCompareMode(prev => {
            if (!prev) {
                // Entering compare mode - clear compare entities
                setCompareEntity1(null);
                setCompareEntity2(null);
                setSelectingFor(null);
            }
            return !prev;
        });
    }, []);

    const handleSelectEntityForCompare = useCallback((side) => {
        setSelectingFor(side);
    }, []);

    const renderContent = () => {
        switch (activeTab) {
            case 'leaderboards':
                return <StatsLeaderboard />;
            case 'history':
                return <StatsMatchHistory entity={selectedEntity} />;
            default:
                return compareMode ? (
                    <StatsComparison
                        entity1={compareEntity1}
                        stats1={compareStats1}
                        entity2={compareEntity2}
                        stats2={compareStats2}
                        onSelectEntity={handleSelectEntityForCompare}
                    />
                ) : (
                    <StatsView
                        entity={selectedEntity}
                        stats={selectedStats}
                    />
                );
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: COLORS.bg,
            padding: '32px 20px',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
            }}>
                {/* Page Header */}
                <div style={{
                    marginBottom: '28px',
                }}>
                    <h1 style={{
                        color: COLORS.text,
                        fontSize: '36px',
                        fontWeight: '700',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                    }}>
                        <div style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '14px',
                            background: `linear-gradient(135deg, ${COLORS.accent}30 0%, ${COLORS.accent}10 100%)`,
                            border: `1px solid ${COLORS.accent}40`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <BarChart3 size={28} color={COLORS.accent} />
                        </div>
                        Statistics
                    </h1>
                    <p style={{
                        color: COLORS.textMuted,
                        fontSize: '15px',
                        marginLeft: '66px',
                    }}>
                        View individual player stats, leaderboards, and match history
                    </p>

                    {/* Mockup Data Notice */}
                    <div style={{
                        marginTop: '20px',
                        marginLeft: '66px',
                        padding: '12px 16px',
                        background: `linear-gradient(135deg, ${COLORS.orange}15 0%, ${COLORS.orange}08 100%)`,
                        border: `1px solid ${COLORS.orange}40`,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        maxWidth: '600px',
                    }}>
                        <FlaskConical size={20} color={COLORS.orange} style={{ flexShrink: 0 }} />
                        <div>
                            <span style={{
                                color: COLORS.orange,
                                fontSize: '13px',
                                fontWeight: '600',
                            }}>
                                Preview Mode:
                            </span>
                            <span style={{
                                color: COLORS.textMuted,
                                fontSize: '13px',
                                marginLeft: '8px',
                            }}>
                                Currently displaying mockup data. Live statistics will be available once the Stats API is ready.
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <TabNavigation
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                {/* Entity Selector (only show in overview tab) */}
                {activeTab === 'overview' && (
                    <EntitySelector
                        selectedEntity={compareMode ? null : selectedEntity}
                        onSelect={handleEntitySelect}
                        compareMode={compareMode}
                        onToggleCompare={handleToggleCompare}
                        selectingFor={selectingFor}
                    />
                )}

                {/* Content */}
                {renderContent()}
            </div>

            {/* Global Styles */}
            <style>{`
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}