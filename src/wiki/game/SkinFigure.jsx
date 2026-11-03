import React from 'react';
import './skinfigure.css';

/* The caller sizes one skin pixel with --u. A slim skin (Alex) has three-pixel arms. */
export default function SkinFigure({ skin, slim, className = '', style }) {
    const arm = slim ? 3 : 4;
    const parts = [
        // [skin u, v, overlay u, v], width, height, place in the figure
        [[8, 8, 40, 8], 8, 8, 4, 0],
        [[20, 20, 20, 36], 8, 12, 4, 8],
        [[44, 20, 44, 36], arm, 12, 4 - arm, 8],
        [[36, 52, 52, 52], arm, 12, 12, 8],
        [[4, 20, 4, 36], 4, 12, 4, 20],
        [[20, 52, 4, 52], 4, 12, 8, 20],
    ];
    return (
        <span className={`skin-figure ${className}`} style={style} aria-hidden="true">
            {parts.map(([[u, v, ou, ov], w, h, fx, fy], i) => (
                <i key={i} style={{
                    '--w': w, '--h': h, '--fx': fx, '--fy': fy,
                    backgroundImage: `url(${skin}), url(${skin})`,
                    backgroundPosition: `calc(${-ou} * var(--u) * 1cqw) calc(${-ov} * var(--u) * 1cqw), calc(${-u} * var(--u) * 1cqw) calc(${-v} * var(--u) * 1cqw)`,
                }} />
            ))}
        </span>
    );
}
