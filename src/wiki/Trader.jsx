import React, { useEffect, useRef, useState } from 'react';
import { useCalm } from '../config/power.js';
import { useOnScreen } from './hooks.js';
import { TRADER } from './tokens.js';
import './trader.css';

/*
 * A trader, standing: Minecraft's own wandering trader, built from its model's boxes
 * and wearing its own texture, with its name over its head in the plugin's colour and
 * the glowing outline the plugin gives it in the world.
 *
 * Why boxes and not a 3D viewer. The model is a dozen boxes, so plain CSS 3D draws it
 * crisp at any size with no library; an embedded viewer (one was the inspiration)
 * would bring its own frame and none of the behaviour below, and a 3D engine would be
 * ~150 KB for a dozen boxes.
 *
 * The geometry is vanilla's VillagerModel, which the wandering trader renders with:
 * each box is its texture offset, its size and its corner relative to the part's
 * pivot, in model pixels, the way the game declares it. The hood is the model's hat
 * layer, a hair larger than the head; the jacket is the body's. The hat brim is left
 * out: the wandering trader's texture leaves it empty. The texture is vanilla's
 * (entity/wandering_trader/wandering_trader.png at 26.3), in public/fib-entities.
 *
 * It looks at you. Villagers turn their heads to watch a player nearby, so the head
 * follows the pointer, within the neck's reach, while the trader is on screen. With no
 * pointer to follow (a phone) it glances around now and then instead. Under reduced
 * motion or saver mode it stands still, facing you.
 */

const TEXTURE = '/fib-entities/wandering_trader.png';
const TEX = 64;

const HEAD = [
    { uv: [0, 0], size: [8, 10, 8], at: [-4, -10, -4] },
    { uv: [24, 0], size: [2, 4, 2], at: [-1, -3, -6] }, // the nose: its part sits 2 up the head
    { uv: [32, 0], size: [8, 10, 8], at: [-4, -10, -4], inflate: 0.51 }, // the hood
];
const BODY = [
    { uv: [16, 20], size: [8, 12, 6], at: [-4, 0, -3] },
    { uv: [0, 38], size: [8, 20, 6], at: [-4, 0, -3], inflate: 0.5 }, // the robe
];
const ARMS = [
    { uv: [44, 22], size: [4, 8, 4], at: [-8, -2, -2] },
    { uv: [44, 22], size: [4, 8, 4], at: [4, -2, -2], mirror: true },
    { uv: [40, 38], size: [8, 4, 4], at: [-4, 2, -2] },
];
const LEG = [{ uv: [0, 22], size: [4, 12, 4], at: [-2, 0, -2] }];

/** How far the head turns, as the game limits it, and the body's three-quarter stance. */
const YAW_REACH = 55;
const PITCH_REACH = 30;
const BODY_YAW = -22;

/*
 * One box, as six faces. Each face shows its piece of the texture laid out the way
 * Minecraft unwraps a box: the top and bottom in the first row, then the right side,
 * front, left side and back in the second. Minecraft's front is -Z; here the front
 * faces the reader, so z flips. A mirrored box (the left arm and leg) swaps its sides
 * and flips every face, as the game's mirror does.
 */
function Box({ px, uv: [u, v], size: [w, h, d], at: [x, y, z], inflate = 0, mirror = false }) {
    const W = (w + 2 * inflate) * px;
    const H = (h + 2 * inflate) * px;
    const D = (d + 2 * inflate) * px;
    const right = [u, v + d, d, h];
    const left = [u + d + w, v + d, d, h];
    const faces = [
        [[u + d, v + d, w, h], W, H, `translateZ(${D / 2}px)`],
        [[u + 2 * d + w, v + d, w, h], W, H, `rotateY(180deg) translateZ(${D / 2}px)`],
        [mirror ? left : right, D, H, `rotateY(-90deg) translateZ(${W / 2}px)`],
        [mirror ? right : left, D, H, `rotateY(90deg) translateZ(${W / 2}px)`],
        [[u + d, v, w, d], W, D, `rotateX(90deg) translateZ(${H / 2}px)`],
        [[u + d + w, v, w, d], W, D, `rotateX(-90deg) translateZ(${H / 2}px)`],
    ];
    const cx = (x + w / 2) * px;
    const cy = (y + h / 2) * px;
    const cz = -(z + d / 2) * px;
    return (
        <span className="tr-box" style={{ transform: `translate3d(${cx}px, ${cy}px, ${cz}px)` }}>
            {faces.map(([[ru, rv, rw, rh], fw, fh, t], i) => {
                const sx = fw / rw;
                const sy = fh / rh;
                return (
                    <span key={i} className="tr-face" style={{
                        width: fw, height: fh, left: -fw / 2, top: -fh / 2,
                        backgroundImage: `url(${TEXTURE})`,
                        backgroundSize: `${TEX * sx}px ${TEX * sy}px`,
                        backgroundPosition: `${-ru * sx}px ${-rv * sy}px`,
                        transform: mirror ? `${t} scaleX(-1)` : t,
                    }} />
                );
            })}
        </span>
    );
}

function Part({ px, pivot: [x, y, z], turn = '', boxes }) {
    return (
        <span className="tr-part" style={{ transform: `translate3d(${x * px}px, ${y * px}px, ${-z * px}px) ${turn}` }}>
            {boxes.map((b, i) => <Box key={i} px={px} {...b} />)}
        </span>
    );
}

/** Facing the reader: the head turned back against the body's three-quarter stance. */
const NEUTRAL = { yaw: -BODY_YAW, pitch: 0 };

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** Where the head looks: the pointer where there is one, a glance around where not. */
function useGaze(headRef, active) {
    const [gaze, setGaze] = useState(NEUTRAL);
    useEffect(() => {
        if (!active) return undefined;
        const hover = window.matchMedia?.('(hover: hover)').matches;
        if (hover) {
            let frame = 0;
            const onMove = (e) => {
                cancelAnimationFrame(frame);
                frame = requestAnimationFrame(() => {
                    const r = headRef.current?.getBoundingClientRect();
                    if (!r) return;
                    const dx = e.clientX - (r.left + r.width / 2);
                    const dy = e.clientY - (r.top + r.height / 2);
                    // An absolute direction on screen, then relative to the turned body.
                    const yaw = (Math.atan2(dx, 420) * 180) / Math.PI - BODY_YAW;
                    const pitch = (-Math.atan2(dy, 420) * 180) / Math.PI;
                    setGaze({ yaw: clamp(yaw, -YAW_REACH, YAW_REACH), pitch: clamp(pitch, -PITCH_REACH, PITCH_REACH) });
                });
            };
            window.addEventListener('pointermove', onMove, { passive: true });
            return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(frame); };
        }
        const glance = () => setGaze({ yaw: -BODY_YAW + (Math.random() * 2 - 1) * 40, pitch: (Math.random() * 2 - 1) * 12 });
        const id = setInterval(glance, 2800);
        return () => clearInterval(id);
    }, [active, headRef]);
    // Standing still (off screen, reduced motion, saver) it faces the reader.
    return active ? gaze : NEUTRAL;
}

export default function Trader({ kind = 'WANDERING', px = 5, heading = 'h3', id }) {
    const t = TRADER[kind];
    const ref = useRef(null);
    const headRef = useRef(null);
    const calm = useCalm();
    const on = useOnScreen(ref);
    const { yaw, pitch } = useGaze(headRef, on && !calm);

    return (
        <figure className="tr" ref={ref} style={{ '--tr-ink': t.ink, '--tr-px': `${px}px` }}>
            {React.createElement(heading, { className: 'tr-name', id }, t.name)}
            <span className="tr-glow" aria-hidden="true">
                <span className="tr-scene">
                    <span className="tr-root" style={{ transform: `rotateX(-8deg) rotateY(${BODY_YAW}deg)` }}>
                        <span className="tr-part tr-head" ref={headRef}
                              style={{ transform: `rotateY(${yaw}deg) rotateX(${pitch}deg)` }}>
                            {HEAD.map((b, i) => <Box key={i} px={px} {...b} />)}
                        </span>
                        <Part px={px} pivot={[0, 0, 0]} boxes={BODY} />
                        <Part px={px} pivot={[0, 3, -1]} turn="rotateX(43deg)" boxes={ARMS} />
                        <Part px={px} pivot={[-2, 12, 0]} boxes={LEG} />
                        <Part px={px} pivot={[2, 12, 0]} boxes={LEG.map((b) => ({ ...b, mirror: true }))} />
                    </span>
                </span>
            </span>
        </figure>
    );
}
