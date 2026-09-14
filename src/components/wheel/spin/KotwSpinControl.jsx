import React from 'react';
import { Crown } from 'lucide-react';
import './KotwSpinner.css';

export function KotwSpinControl({ onSpin, user, isLoading, error }) {
    const disabled = !user || isLoading;
    return <div className="kotw-spin-control">
        <div className="kotw-spin-pedestal" aria-hidden="true"/>
        <button className="kotw-crown-control" onClick={onSpin} disabled={disabled} aria-label="Spin for the crown">
            <span className="kotw-crown-dial" aria-hidden="true"><Crown size={64} strokeWidth={1.2}/></span>
            <span className="kotw-crown-action">{isLoading ? 'Preparing the arena' : !user ? 'Sign in to compete' : 'Spin for the crown'}</span>
        </button>
        <span className="kotw-spin-hint">{!disabled && <><kbd>SPACE</kbd> or press the crown</>}</span>
        {error && <span className="kotw-spin-error" role="alert">{error}</span>}
    </div>;
}

export function KotwPoints({ points, compact = false }) {
    if (points == null) return null;
    return <div className={`kotw-points ${compact ? 'kotw-points-compact' : ''}`} role="status">
        <strong>+{Number(points).toLocaleString('en-US')}</strong><span>for the crown</span>
    </div>;
}
