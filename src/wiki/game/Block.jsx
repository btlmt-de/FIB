import React from 'react';
import { spriteFallback, spriteOf } from './sprite.js';
import './block.css';

/* Only the three faces an inventory icon shows are built. The furnace's particles follow vanilla's AbstractFurnaceBlock.animateTick. */

const TEX = '/fib-entities/blocks';

const BLOCKS = {
    CRAFTING_TABLE: { top: 'crafting_table_top', front: 'crafting_table_front', side: 'crafting_table_side' },
    FURNACE: { top: 'furnace_top', front: 'furnace_front', side: 'furnace_side', lit: 'furnace_front_on' },
};

const CELL = [4.5, 8, 11.5];
const ITEM_SIZE = 3.5;

const YAW = -35;
const TILT = -30;

const PUFFS = [
    { across: 0.25, up: 0.3, delay: 0 },
    { across: 0.8, up: 0.65, delay: 0.8 },
    { across: 0.5, up: 0.1, delay: 1.6 },
];

/* Particles are drawn in a flat layer, not in the 3D scene: as children of a face, Chrome's 3D sorting buried them behind it. */
function project(x, y, z) {
    const a = (YAW * Math.PI) / 180;
    const b = (TILT * Math.PI) / 180;
    const x1 = x * Math.cos(a) + z * Math.sin(a);
    const z1 = -x * Math.sin(a) + z * Math.cos(a);
    return [x1, y * Math.cos(b) - z1 * Math.sin(b)];
}

const face = (name) => ({ backgroundImage: `url(${TEX}/${name}.png)` });

export default function Block({ kind, px = 4, items = [], lit = false, live = false, bump = false }) {
    const b = BLOCKS[kind];
    return (
        <span className="bk" aria-hidden="true" style={{ '--bk-px': `${px}px` }} data-bump={bump || undefined}>
            <span className="bk-root" style={{ transform: `rotateX(${TILT}deg) rotateY(${YAW}deg)` }}>
                <span className="bk-face bk-top" style={face(b.top)}>
                    {items.map(({ item, cell: [row, col], key }) => (
                        <img key={key} className="bk-item" src={item.src ?? spriteOf(item.material)} data-material={item.material}
                             onError={spriteFallback} alt="" width="128" height="128" draggable="false"
                             style={{ '--x': CELL[col] - ITEM_SIZE / 2, '--y': CELL[row] - ITEM_SIZE / 2, '--s': ITEM_SIZE }} />
                    ))}
                </span>
                <span className="bk-face bk-front" style={face(lit && b.lit ? b.lit : b.front)} data-lit={(lit && b.lit) || undefined} />
                <span className="bk-face bk-side" style={face(b.side)} />
            </span>
            {lit && live && (
                <span className="bk-fx">
                    {PUFFS.map((p, i) => {
                        const [x, y] = project(3 + p.across * 10 - 8, 16 - p.up * 6 - 8, 8.5);
                        return (
                            <span key={i} className="bk-puff" style={{ '--x': x, '--y': y, '--delay': `${p.delay}s` }}>
                                <i className="bk-smoke" />
                                <i className="bk-flame" />
                            </span>
                        );
                    })}
                </span>
            )}
        </span>
    );
}
