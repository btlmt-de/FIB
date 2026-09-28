import React from 'react';
import { spriteFallback, spriteOf } from './sprite.js';
import './block.css';

/*
 * A block, standing: one cube in plain CSS 3D wearing the game's own textures, the way
 * Villager.jsx builds its boxes. Two are drawn, the stations between an input and what
 * it makes: the crafting table and the furnace. The textures are vanilla 26.3, in
 * public/fib-entities/blocks.
 *
 * The view is an inventory icon's: turned and tipped so the top, the front and one
 * side show, with no perspective, because the game draws a block in a slot the same
 * way. Only those three faces are built; the others are never in view.
 *
 * What moves is the page's business, not the block's. The block draws what it is
 * handed: items lying on its top (the crafting table's grid, where a recipe is laid
 * out), whether it is lit, and whether its particles run.
 *
 *   the table     crafting_table_top has a real 3x3 grid, its lines at texture pixels
 *                 3, 6, 9 and 12, so each ingredient lies in its own cell of it
 *   the furnace   lit, it wears furnace_front_on and gives off what vanilla's
 *                 AbstractFurnaceBlock.animateTick gives off: a flame and a puff of
 *                 smoke together, just outside the front face, low down (the bottom
 *                 6 pixels), anywhere across its middle 10
 */

const TEX = '/fib-entities/blocks';

const BLOCKS = {
    CRAFTING_TABLE: { top: 'crafting_table_top', front: 'crafting_table_front', side: 'crafting_table_side' },
    FURNACE: { top: 'furnace_top', front: 'furnace_front', side: 'furnace_side', lit: 'furnace_front_on' },
};

/** The centre of each column (and row) of the table's grid, in texture pixels. */
const CELL = [4.5, 8, 11.5];
const ITEM_SIZE = 3.5;

/** The turn and tip of an inventory icon, in degrees. The particles are projected through them too. */
const YAW = -35;
const TILT = -30;

/* Three flame-and-smoke pairs, staggered over one cycle so the furnace is never quite
   still: across (0 to 1 of the middle 10 pixels) and up (0 to 1 of the bottom 6). */
const PUFFS = [
    { across: 0.25, up: 0.3, delay: 0 },
    { across: 0.8, up: 0.65, delay: 0.8 },
    { across: 0.5, up: 0.1, delay: 1.6 },
];

/*
 * Where a point on the cube lands on screen, in texture pixels from its centre, turned
 * as the cube is turned (rotateX(TILT) rotateY(YAW), the Y turn first).
 *
 * The particles need it because they are not in the 3D scene. They were children of
 * the front face first, standing half a pixel off it, and Chrome's 3D sorting buried
 * them behind the face they stood in front of; the table's ingredients vanished into
 * its top the same way. So anything drawn ON a face is flat in it (the ingredients lie
 * flat anyway), and anything in the air in front of one is drawn in a flat layer over
 * the whole block, at the point this projects it to.
 */
function project(x, y, z) {
    const a = (YAW * Math.PI) / 180;
    const b = (TILT * Math.PI) / 180;
    const x1 = x * Math.cos(a) + z * Math.sin(a);
    const z1 = -x * Math.sin(a) + z * Math.cos(a);
    return [x1, y * Math.cos(b) - z1 * Math.sin(b)];
}

const face = (name) => ({ backgroundImage: `url(${TEX}/${name}.png)` });

/**
 * items: [{ item, cell: [row, col], key }] lying on the top; lit and live for a furnace;
 * bump nods the block once, as a craft lands.
 */
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
                        // Half a pixel out from the front face, low down, across its middle.
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
