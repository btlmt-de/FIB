import React, { useEffect, useRef, useState } from 'react';
import { useCalm } from '../../config/power.js';
import { useOnScreen } from '../hooks.js';
import { TRADER } from '../tokens.js';
import './villager.css';

/* Geometry is vanilla's VillagerModel, textures vanilla 26.3. Plain CSS 3D: a 3D engine would be ~150 KB for a dozen boxes. */

const TEX = 64;

const SKINS = {
    WANDERING_TRADER: ['/fib-entities/wandering_trader.png'],
    CLERIC: [
        '/fib-entities/villager/profession_level_iron.png',
        '/fib-entities/villager/profession_cleric.png',
        '/fib-entities/villager/type_plains.png',
        '/fib-entities/villager/villager.png',
    ],
    // Level 1: VillagerTradeListener rolls the Sulfur Locator offer the moment it takes the job.
    CARTOGRAPHER: [
        '/fib-entities/villager/profession_level_stone.png',
        '/fib-entities/villager/profession_cartographer.png',
        '/fib-entities/villager/type_plains.png',
        '/fib-entities/villager/villager.png',
    ],
};

const HEAD = [
    { uv: [0, 0], size: [8, 10, 8], at: [-4, -10, -4] },
    { uv: [24, 0], size: [2, 4, 2], at: [-1, -3, -6] }, // the nose: its part sits 2 up the head
    { uv: [32, 0], size: [8, 10, 8], at: [-4, -10, -4], inflate: 0.51 }, // the hood, or a hat
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

const YAW_REACH = 55;
const PITCH_REACH = 30;
const BODY_YAW = -22;

const NEUTRAL = { yaw: -BODY_YAW, pitch: 0 };

/* Minecraft's box unwrap. Its front is -Z; here the front faces the reader, so z flips. */
function Box({ px, skin, uv: [u, v], size: [w, h, d], at: [x, y, z], inflate = 0, mirror = false }) {
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
    const layers = (value) => skin.map(() => value).join(', ');
    return (
        <span className="vg-box" style={{ transform: `translate3d(${cx}px, ${cy}px, ${cz}px)` }}>
            {faces.map(([[ru, rv, rw, rh], fw, fh, t], i) => {
                const sx = fw / rw;
                const sy = fh / rh;
                return (
                    <span key={i} className="vg-face" style={{
                        width: fw, height: fh, left: -fw / 2, top: -fh / 2,
                        backgroundImage: skin.map((s) => `url(${s})`).join(', '),
                        backgroundSize: layers(`${TEX * sx}px ${TEX * sy}px`),
                        backgroundPosition: layers(`${-ru * sx}px ${-rv * sy}px`),
                        transform: mirror ? `${t} scaleX(-1)` : t,
                    }} />
                );
            })}
        </span>
    );
}

function Part({ px, skin, pivot: [x, y, z], turn = '', boxes }) {
    return (
        <span className="vg-part" style={{ transform: `translate3d(${x * px}px, ${y * px}px, ${-z * px}px) ${turn}` }}>
            {boxes.map((b, i) => <Box key={i} px={px} skin={skin} {...b} />)}
        </span>
    );
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

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
    return active ? gaze : NEUTRAL;
}

function Model({ skin, px, watchRef }) {
    const headRef = useRef(null);
    const calm = useCalm();
    const on = useOnScreen(watchRef);
    const { yaw, pitch } = useGaze(headRef, on && !calm);
    return (
        <span className="vg-scene" style={{ '--vg-px': `${px}px` }}>
            <span className="vg-root" style={{ transform: `rotateX(-8deg) rotateY(${BODY_YAW}deg)` }}>
                <span className="vg-part vg-head" ref={headRef} style={{ transform: `rotateY(${yaw}deg) rotateX(${pitch}deg)` }}>
                    {HEAD.map((b, i) => <Box key={i} px={px} skin={skin} {...b} />)}
                </span>
                <Part px={px} skin={skin} pivot={[0, 0, 0]} boxes={BODY} />
                <Part px={px} skin={skin} pivot={[0, 3, -1]} turn="rotateX(43deg)" boxes={ARMS} />
                <Part px={px} skin={skin} pivot={[-2, 12, 0]} boxes={LEG} />
                <Part px={px} skin={skin} pivot={[2, 12, 0]} boxes={LEG.map((b) => ({ ...b, mirror: true }))} />
            </span>
        </span>
    );
}

/* The face only, as the game draws a head in a slot: the plugin's arrow skins draw the arrow there. */
export function Head({ skin, size = 28 }) {
    const k = size / 8;
    const layer = (u, v) => `${-u * k}px ${-v * k}px`;
    return (
        <span className="vg-headicon" aria-hidden="true" style={{
            width: size, height: size,
            backgroundImage: `url(${skin}), url(${skin})`,
            backgroundSize: `${64 * k}px ${64 * k}px`,
            backgroundPosition: `${layer(40, 8)}, ${layer(8, 8)}`,
        }} />
    );
}

export function Villager({ kind = 'CLERIC', px = 3 }) {
    const ref = useRef(null);
    return (
        <span className="vg" ref={ref} aria-hidden="true">
            <Model skin={SKINS[kind]} px={px} watchRef={ref} />
        </span>
    );
}

export default function Trader({ kind = 'WANDERING', px = 5, heading = 'h3', id }) {
    const t = TRADER[kind];
    const ref = useRef(null);
    return (
        <figure className="vg vg-trader" ref={ref} style={{ '--vg-ink': t.ink }}>
            {React.createElement(heading, { className: 'vg-name', id }, t.name)}
            <span className="vg-glow" aria-hidden="true">
                <Model skin={SKINS.WANDERING_TRADER} px={px} watchRef={ref} />
            </span>
        </figure>
    );
}
