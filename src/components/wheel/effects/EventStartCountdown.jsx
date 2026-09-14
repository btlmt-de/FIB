import React from 'react';
import { useCalm } from '../../../config/power.js';
import './EventStartCountdown.css';

// The banner supplies the server-synchronized countdown, never a new local delay.
export default function EventStartCountdown({ clock, theme, children }) {
    const calm = useCalm();
    const seconds = Number(clock);
    return <div className="event-start-countdown" data-theme={theme} data-calm={calm} role="status" aria-live="polite" aria-atomic="true">
        <span className="event-start-label">{seconds > 0 ? 'Starts in' : 'Starting'}</span>
        <strong className="event-start-number" key={clock}>{seconds > 0 ? clock : 'Get ready'}</strong>
        <div className="event-start-steps" aria-hidden="true">
            {[5, 4, 3, 2, 1].map(step => <span key={step} data-lit={seconds < step}/>)}
        </div>
        <p>{children}</p>
    </div>;
}
