import React from 'react';
import { BookOpen, Trophy } from 'lucide-react';
import './StageShortcuts.css';

export function StageShortcuts({ onOpenCollection, onOpenLeaderboard }) {
    return <nav className="stage-shortcuts" aria-label="Collection and standings">
        <button type="button" onClick={onOpenCollection} aria-label="Open collection">
            <BookOpen size={21} aria-hidden="true" />
            <span className="stage-shortcut-tooltip" aria-hidden="true">Collection</span>
        </button>
        <button type="button" onClick={onOpenLeaderboard} aria-label="Open leaderboard">
            <Trophy size={21} aria-hidden="true" />
            <span className="stage-shortcut-tooltip" aria-hidden="true">Leaderboard</span>
        </button>
    </nav>;
}
