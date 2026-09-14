import React from 'react';
import { Crosshair } from 'lucide-react';
import './FirstBloodSpinner.css';

export function FirstBloodSpinControl({onSpin, user, isLoading, error, luckySpins, recursionSpins}) {
    const disabled=!user || isLoading;
    return <div className="fb-spin-control">
        <button className="fb-trigger" onClick={onSpin} disabled={disabled} aria-label="Spin for First Blood">
            <span className="fb-trigger-dial" aria-hidden="true"><Crosshair size={62} strokeWidth={1.2}/></span>
            <span className="fb-trigger-label">{isLoading ? 'Preparing the wheel' : !user ? 'Sign in to spin' : 'Take your shot'}</span>
        </button>
        <span className="fb-trigger-hint">{!disabled && <><kbd>SPACE</kbd> or press the target</>}</span>
        {(recursionSpins > 0 || luckySpins > 0) && <span className="fb-trigger-spins">{recursionSpins > 0 ? `${recursionSpins} Recursion spins` : `${luckySpins} Lucky Spins`} remaining</span>}
        {error && <span className="fb-trigger-error" role="alert">{error}</span>}
    </div>;
}
