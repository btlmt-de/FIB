/*
 * ═══════════════════════════════════════════════════════════════════════════
 * THE ARRIVAL — the train, in three dimensions
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The locomotive is MODELLED IN CODE, not loaded. That was a deliberate choice
 * over importing a ready-made model, and the reasons are worth keeping because
 * the pull to "just download a train" will come back:
 *
 *   - An imported model is somebody else's asset with somebody else's licence.
 *     Most free train models are CC-BY (attribution required in the product) or
 *     not redistributable at all, and a 2–10MB GLTF plus GLTFLoader and DRACO
 *     lands on a route PRODUCT.md describes as "a phone beside a running game".
 *     Modelled in code, the whole train costs nothing but this file.
 *   - A photoreal train would be the ONLY realistic object on this site.
 *     THE NOCTURNE is flat blue-hour silhouettes and rail light throughout, and
 *     an imported model rendered in its own PBR world would read as foreign
 *     rather than as special.
 *   - What actually made the 2D version look cheap was never that it was 2D. It
 *     was the absence of perspective, depth, real light and material. Those are
 *     exactly what three.js supplies, and none of them require an asset.
 *
 * So: real geometry, real lights, real shadow — dressed in the site's own dark
 * blue-hour palette with station amber as the only warm source.
 *
 * ── THE SECOND PASS, AND WHAT IT WAS FOR ─────────────────────────────────────
 *
 * The first build was correct and flat. The owner's note was that it "could look
 * way better — more detailing, more effects", and hunting for why it read as a
 * diorama turned up three structural omissions rather than a shortage of props:
 *
 *   1. THERE WERE NO SHADOWS. Every mesh set `castShadow` and the platform set
 *      `receiveShadow`, but `renderer.shadowMap.enabled` was never turned on and
 *      no light was ever asked to cast. Nothing in the scene was attached to the
 *      ground. That single line is the largest visual change in this pass.
 *   2. NO LIGHT WAS VISIBLE. A headlight you cannot see the beam of is a bright
 *      dot; in a fogged night scene the shafts ARE the atmosphere. Every source
 *      that should throw a volume now does, through a shell with a fresnel
 *      falloff — the cheap trick, and the right one at this size.
 *   3. THE TRAIN WAS FACING THE WRONG WAY. `START_X` was +34 and `END_X` −34
 *      while the smokebox, the buffers and the headlight all point at +x, so the
 *      locomotive reversed in, stood, and reversed out for the whole of the
 *      first build. It enters from the left now, nose first, wagons trailing.
 *
 * Everything else here is detail in service of those three: the motion work
 * (coupling rods, a main rod driven off a real crank, chuffs fired by wheel
 * phase rather than by a timer), the station the train is arriving AT, and the
 * grade layer — vignette and grain — which lives in `index.css` because it is
 * DOM, not scene.
 *
 * ── WHAT IS IMPORTED, AND WHY IT IS A NAMED LIST ─────────────────────────────
 *
 * Every symbol is imported by name from `three` so the bundler can drop the rest
 * of the library. `import * as THREE` pulls the whole thing — loaders, controls,
 * every material — into a chunk that is already the heaviest on the site.
 */

import React, { useEffect, useRef } from 'react';
import {
    Scene, PerspectiveCamera, WebGLRenderer, Group, Fog, Color,
    BoxGeometry, CylinderGeometry, PlaneGeometry, SphereGeometry, TorusGeometry,
    MeshStandardMaterial, MeshBasicMaterial, Mesh, ShaderMaterial,
    AmbientLight, DirectionalLight, PointLight, SpotLight,
    Object3D, Sprite, SpriteMaterial, CanvasTexture,
    AdditiveBlending, DoubleSide, LinearFilter,
    ACESFilmicToneMapping, SRGBColorSpace,
} from 'three';
import { T_SHUTTER, T_APPROACH, T_SETTLE, T_UNLOAD, T_DEPART, T_GONE, T_LIFT, T_LIFT_END, SCENE_FADE_S } from './arrivalTimeline.js';
import { prefersReducedMotion } from '../../../utils/motion.js';

/*
 * An authored locomotive, when there is one.
 *
 * Null means the procedural loco below is used, which is the shipping default
 * until a model exists that is small enough and — more importantly — separated
 * enough to animate. Set this to a path under public/ to swap it in.
 *
 * The loader is fetched INSIDE the branch rather than imported at the top of the
 * file. It used to be a static import, which meant every arrival downloaded
 * GLTFLoader in order to not use it; the branch is unreachable while this is
 * null and the import now goes with it.
 */
const LOCO_MODEL_URL = null;

const AMBER = 0xffaa00;
const LAMP = 0xffc76b;
const DECK_DEEP = 0x05060a;
/* Railway signal green. Checked against the rarity ladder before it was used:
   the tiers own red (rare), orange (event), purple, aqua, gold and the insane
   slick — green is the one hue on a signal head that belongs to nobody. */
const SIGNAL_GREEN = 0x5bff8a;
const SIGNAL_RED = 0xff3b30;

/** Cars behind the locomotive, however many crates there are. */
const MAX_CARS = 8;

/* Track units. A car is 2.2 long; the loco is 3.4, the tender 2.0. */
const CAR_LEN = 2.2;
const CAR_GAP = 0.28;
const LOCO_LEN = 3.4;
const TENDER_LEN = 2.0;
const VAN_LEN = 1.9;

/** Wheel geometry the rods are driven off. Changing either moves the rods. */
const DRIVER_R = 0.34;
const CRANK_R = 0.19;
/** Main rod length, chosen so the crosshead never enters the cylinder block. */
const MAIN_ROD = 0.83;
const CYL_X = 1.62;

/** How far the camera sits from the aim point. Framing is derived from this. */
const FRAME_DIST = 13.5;

/*
 * ── THE APPROACH CURVE ───────────────────────────────────────────────────────
 *
 * `easeOutExpo` — 2^(-10t) — puts 96% of the travel in the first quarter of the
 * window. Measured against the real timeline that is a train which enters frame
 * at 1.69s and is standing still by 2.3s: six tenths of a second of arriving,
 * followed by ten seconds of a stationary locomotive. The whole APPROACH beat
 * existed and nothing was using it.
 *
 * The exponent is 5.2 now, which is the value at which the engine crosses the
 * left edge of a desktop band about 0.4s after the shutter finishes and is still
 * visibly shedding speed a second and a half later. Same shape, same hard
 * initial rush, same asymptotic settle — just spent over the beat it was given.
 *
 * Normalised, too. 2^(-10t) is close enough to zero at t=1 to ignore; 2^(-5.2)
 * is 0.027, and unnormalised that is the train stopping 1.1 units short of the
 * platform and then jumping the rest at T_APPROACH.
 */
const EXPO_K = 5.2;
const EXPO_NORM = 1 / (1 - Math.pow(2, -EXPO_K));
const easeOutExpo = t => (t >= 1 ? 1 : (1 - Math.pow(2, -EXPO_K * t)) * EXPO_NORM);
/*
 * Departure is CUBIC, not exponential.
 *
 * `easeInExpo` leaves 75% of the travel in the last 20% of the time — the train
 * sat almost still for three seconds and then vanished in half a second, which
 * is a teleport with a wind-up, not a departure. A locomotive pulling away
 * accelerates hard but continuously, and cubic is that shape.
 */
const easeInCubic = t => t * t * t;
const clamp01 = t => Math.max(0, Math.min(1, t));
const lerp = (a, b, t) => a + (b - a) * t;
/** Stable per-index randomness, so a resize never reshuffles the world. */
const hash = i => { const s = Math.sin(i * 127.1) * 43758.5453; return s - Math.floor(s); };

/* ── textures, all drawn here rather than fetched ───────────────────────────
 *
 * Every texture in this scene is a 2D canvas written at mount and thrown away
 * at unmount. Same argument as the locomotive: an image file is a request, a
 * licence and a cache entry, and none of these is anything a gradient cannot
 * say. They are small on purpose — the largest is 512px and it is a sign.
 *
 * ── EVERY ONE OF THEM DECLARES ITS COLOUR SPACE ─────────────────────────────
 *
 * A CanvasTexture defaults to NoColorSpace, which the renderer treats as data
 * already in linear light. The canvas 2D API writes sRGB. So the first build of
 * this pass fed sRGB bytes into a linear pipeline and every texture came back
 * two stops hot: the night sky rendered as an overcast afternoon, the skyline
 * silhouettes came out paler than the sky behind them, and the whole band read
 * as a daylight photograph with the lamps on. `finish()` exists so no texture
 * added here can leave without saying which space it is in.
 */

function finish(t) {
    t.colorSpace = SRGBColorSpace;
    t.minFilter = LinearFilter;
    t.needsUpdate = true;
    return t;
}

function radialTexture(stops, size = 128) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const rg = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [o, col] of stops) rg.addColorStop(o, col);
    g.fillStyle = rg;
    g.fillRect(0, 0, size, size);
    return finish(new CanvasTexture(c));
}

/** A tight core with a long tail — this is what stands in for bloom. */
const GLOW_STOPS = [
    [0, 'rgba(255,255,255,1)'],
    [0.14, 'rgba(255,255,255,0.72)'],
    [0.34, 'rgba(255,255,255,0.24)'],
    [0.62, 'rgba(255,255,255,0.06)'],
    [1, 'rgba(255,255,255,0)'],
];
/** Soft and shapeless. Steam has no edge. */
const SMOKE_STOPS = [
    [0, 'rgba(255,255,255,0.80)'],
    [0.35, 'rgba(255,255,255,0.34)'],
    [0.7, 'rgba(255,255,255,0.09)'],
    [1, 'rgba(255,255,255,0)'],
];

/**
 * The anamorphic streak on the headlight.
 *
 * A round glow reads as a bulb; a horizontal smear reads as a lamp shot through
 * a lens, which is the association the eye actually has with a headlight at
 * night. It is one 256×64 gradient and it does more for "this is a photograph"
 * than any amount of geometry.
 */
function streakTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    const lg = g.createLinearGradient(0, 0, 256, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.5, 'rgba(255,255,255,1)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lg;
    // A vertical falloff too, or the streak is a bar.
    for (let y = 0; y < 64; y++) {
        const d = Math.abs(y - 32) / 32;
        g.globalAlpha = Math.pow(1 - d, 3);
        g.fillRect(0, y, 256, 1);
    }
    g.globalAlpha = 1;
    return finish(new CanvasTexture(c));
}

/**
 * Station signage: a dark enamel panel with amber lettering.
 *
 * Letters are drawn one at a time with an explicit advance rather than through
 * `ctx.letterSpacing`, which is recent and not everywhere. Tracked capitals are
 * what makes a sign read as a sign at 40 pixels wide.
 */
function signTexture(text, { w = 512, h = 128, size = 64, track = 0.16, ink = '#FFAA00', bg = '#0a0f1c', edge = '#33405f' } = {}) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = edge;
    g.lineWidth = 4;
    g.strokeRect(2, 2, w - 4, h - 4);

    g.font = `600 ${size}px "Barlow Condensed","Oswald","Arial Narrow",system-ui,sans-serif`;
    g.textBaseline = 'middle';
    const gap = size * track;
    const chars = [...text];
    let total = 0;
    for (const ch of chars) total += g.measureText(ch).width + gap;
    total -= gap;

    let x = (w - total) / 2;
    g.shadowColor = ink;
    g.shadowBlur = size * 0.45;
    g.fillStyle = ink;
    for (const ch of chars) {
        g.fillText(ch, x, h / 2 + size * 0.04);
        x += g.measureText(ch).width + gap;
    }
    return finish(new CanvasTexture(c));
}

/**
 * The city the line runs through, as a silhouette.
 *
 * DESIGN.md §8 calls the whole wheel surface "one blue-hour city" and §9 built
 * the collection board as a building in it. The station has to stand somewhere,
 * and on a tall phone frame there are twelve world-units of sky above the
 * canopy that were previously empty.
 *
 * Fog is switched OFF on this plane and the haze is painted in instead. At the
 * distance it sits, real fog would erase it entirely, and the alternative —
 * pulling it closer — puts buildings inside the station roof.
 */
function cityTexture() {
    const w = 1024, h = 256;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    let x = -20;
    let i = 0;
    while (x < w) {
        const bw = 26 + hash(i * 3.1) * 78;
        /* Tall minimums on purpose. The first skyline topped out around a third
         * of the plane and the station canopy hides everything below that, so a
         * portrait frame got one visible tower and twelve units of empty sky. */
        const bh = 96 + hash(i * 7.7) * 152;
        // Nearer-looking blocks are darker; the pale ones sit back in the haze.
        const haze = 0.35 + hash(i * 2.3) * 0.5;
        g.fillStyle = `rgba(16,24,44,${0.5 + (1 - haze) * 0.45})`;
        g.fillRect(x, h - bh, bw, bh);

        // A handful of lit windows, and one in four is warm.
        const cols = Math.max(1, Math.floor(bw / 13));
        const rows = Math.max(1, Math.floor(bh / 17));
        for (let cx = 0; cx < cols; cx++) {
            for (let cy = 0; cy < rows; cy++) {
                if (hash(i * 13.7 + cx * 3.3 + cy * 9.1) > 0.9) {
                    const warm = hash(i * 5.9 + cx + cy * 2.1) > 0.75;
                    g.fillStyle = warm ? 'rgba(255,180,90,0.5)' : 'rgba(150,185,255,0.32)';
                    g.fillRect(x + 5 + cx * 13, h - bh + 7 + cy * 17, 4, 6);
                }
            }
        }
        // A red aircraft light on the tallest few.
        if (bh > 180) {
            g.fillStyle = 'rgba(255,80,70,0.75)';
            g.fillRect(x + bw / 2 - 1.5, h - bh - 3, 3, 3);
        }
        x += bw + 3 + hash(i * 11.3) * 12;
        i++;
    }
    return finish(new CanvasTexture(c));
}

/** The sky behind everything: a night gradient with a faint sodium horizon. */
function skyTexture() {
    const c = document.createElement('canvas');
    c.width = 4; c.height = 256;
    const g = c.getContext('2d');
    const lg = g.createLinearGradient(0, 0, 0, 256);
    lg.addColorStop(0, '#04060d');
    lg.addColorStop(0.55, '#080d1c');
    lg.addColorStop(0.86, '#111c33');
    lg.addColorStop(1, '#1c2540');
    g.fillStyle = lg;
    g.fillRect(0, 0, 4, 256);
    return finish(new CanvasTexture(c));
}

/*
 * ── THE VOLUMETRIC SHELL ─────────────────────────────────────────────────────
 *
 * A light shaft here is a hollow cone drawn additively, with two falloffs: one
 * along its length so it dies out into the fog, and a fresnel term so the shell
 * is brightest where it is edge-on to the camera. That second term is the whole
 * trick — it is what stops the cone looking like a cone and makes it look like
 * air with light in it.
 *
 * The honest alternative is raymarching the fog in a post pass, which costs a
 * render target and a second shader on a route that already pays 133KB for
 * three.js and shows this for fifteen seconds.
 */
const BEAM_VS = `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
}`;
const BEAM_FS = `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uEdge;
uniform float uFall;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
void main() {
    float edge = 1.0 - abs(dot(normalize(vN), normalize(vV)));
    edge = pow(clamp(edge, 0.0, 1.0), uEdge);
    // uv.y is 1 at the narrow cap, which is where the source is.
    float len = pow(clamp(vUv.y, 0.0, 1.0), uFall);
    gl_FragColor = vec4(uColor, uOpacity * (0.30 + 0.70 * edge) * len);
}`;

function beamMaterial(color, opacity, edge = 1.7, fall = 2.4) {
    return new ShaderMaterial({
        uniforms: {
            uColor: { value: new Color(color) },
            uOpacity: { value: opacity },
            uEdge: { value: edge },
            uFall: { value: fall },
        },
        vertexShader: BEAM_VS,
        fragmentShader: BEAM_FS,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
    });
}

/*
 * One material per role, shared by every mesh that wants it — a fresh
 * MeshStandardMaterial per box is a fresh shader program per box.
 *
 * ── WHY THESE ARE MUCH LIGHTER THAN THE FIRST SET ────────────────────────────
 *
 * The first pass painted the train in the deck's own values — hull #121a2e on a
 * #080b14 ground — reasoning that THE NOCTURNE is a dark world and the train
 * should belong to it. What that actually produced was a black shape on a black
 * ground where, in the owner's words, there were "no details to see". The error
 * was treating a UI panel's background colour as a lighting value: a flat
 * #0d1322 fill in a DOM panel is a surface fully lit at that colour, but a 3D
 * material at #0d1322 is that colour BEFORE the light falls off, and everything
 * facing away goes to nothing.
 *
 * So the base values are lifted roughly two stops and the world does the
 * darkening. The train still reads as a dark blue-hour object on screen; it just
 * has somewhere to fall to now.
 */
function makeMaterials() {
    return {
        hull: new MeshStandardMaterial({ color: 0x3a4a6d, roughness: 0.55, metalness: 0.42 }),
        hullDark: new MeshStandardMaterial({ color: 0x25314c, roughness: 0.66, metalness: 0.36 }),
        iron: new MeshStandardMaterial({ color: 0x171d2c, roughness: 0.38, metalness: 0.85 }),
        trim: new MeshStandardMaterial({ color: 0x53658f, roughness: 0.32, metalness: 0.72 }),
        brass: new MeshStandardMaterial({ color: 0xa8843f, roughness: 0.3, metalness: 0.9 }),
        glow: new MeshBasicMaterial({ color: AMBER }),
        lampGlass: new MeshBasicMaterial({ color: 0xffd79a }),
        coal: new MeshStandardMaterial({ color: 0x0e1220, roughness: 0.95, metalness: 0.2 }),
        crate: new MeshStandardMaterial({ color: 0x4a5878, roughness: 0.78, metalness: 0.12 }),
        crateBand: new MeshStandardMaterial({ color: 0xb9832c, roughness: 0.4, metalness: 0.8 }),
        ground: new MeshStandardMaterial({ color: 0x141b2c, roughness: 0.95, metalness: 0.05 }),
        /*
         * Lower roughness than a dry slab: the platform is damp, which is what
         * lets the lamps lie down on it as streaks instead of flat pools.
         *
         * And much darker than it was. At #2a3348 with three lamps on it the
         * near platform came out the brightest object in the band — a pale grey
         * slab across the bottom third that the locomotive had to compete with.
         * A station floor at night is lit in POOLS with dark between them; a
         * floor that is evenly bright everywhere is a floor with the house
         * lights up.
         */
        platform: new MeshStandardMaterial({ color: 0x1a2234, roughness: 0.62, metalness: 0.12 }),
        platformEdge: new MeshStandardMaterial({ color: 0x8a6a2a, roughness: 0.6, metalness: 0.3 }),
        rail: new MeshStandardMaterial({ color: 0x6d7fa8, roughness: 0.22, metalness: 0.95 }),
        canopy: new MeshStandardMaterial({ color: 0x1b2338, roughness: 0.8, metalness: 0.3 }),
    };
}

export function ArrivalTrain3D({ crateCount = 0, style }) {
    const wrapRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        const wrap = wrapRef.current;
        const canvas = canvasRef.current;
        if (!wrap || !canvas) return undefined;

        const motionOff = prefersReducedMotion();
        const cars = Math.max(0, Math.min(crateCount, MAX_CARS));

        const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setClearColor(0x000000, 0);
        renderer.toneMapping = ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.outputColorSpace = SRGBColorSpace;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        /*
         * SHADOWS. The single line that was missing from the first build.
         *
         * Every mesh below already asked to cast one and the platform already
         * asked to receive; without this the requests went nowhere and the
         * train floated. One directional light casts — the key — and its
         * frustum is parked over the PLATFORM rather than tracked to the train,
         * so the crates keep their shadows after the locomotive has left.
         */
        renderer.shadowMap.enabled = true;
        /*
         * The type is left at the default PCF. `PCFSoftShadowMap` was the
         * obvious pick and is DEPRECATED as of three 0.185 — it logs a warning
         * on every renderer and silently falls back to PCF anyway, so asking
         * for it bought a console message and nothing else. Softness comes from
         * `shadow.radius` below instead.
         */

        const scene = new Scene();
        // The train arrives OUT OF the dark and leaves back into it. Fog is what
        // makes the band feel like a length of track rather than a lit stage.
        scene.fog = new Fog(DECK_DEEP, 13, 42);

        /*
         * ── THE ANGLE ────────────────────────────────────────────────────────
         *
         * Nearly square to the track, at about the eye level of somebody
         * standing on the platform, looking very slightly UP at the engine.
         *
         * The first pass sat 6 units off to one side and 1.9 up, aimed down at
         * y=0.68. Two things went wrong with that and the owner just called it
         * "weird", which was fair. A long lens from far along the track makes the
         * consist recede almost orthographically, so the wagons stack into an
         * ambiguous mass instead of reading as a row; and looking DOWN at a
         * locomotive makes it small — we read machines as big by looking up at
         * them. Dropping the eye to 1.35 puts the horizon just under the boiler
         * centreline, which is the classic platform photograph.
         *
         * The 2.6 of side offset is what keeps it from being a flat elevation:
         * enough to see the front of the smokebox and the near flank at once.
         */
        const camera = new PerspectiveCamera(17, 1, 0.1, 140);
        const CAM_HOME = { x: 2.6, y: 1.35, z: FRAME_DIST };

        const M = makeMaterials();
        const disposables = [];
        /** Anything with a `dispose()` goes through here and nowhere else. */
        const track = (x) => { disposables.push(x); return x; };

        const glowTex = track(radialTexture(GLOW_STOPS));
        const smokeTex = track(radialTexture(SMOKE_STOPS));
        const streakTex = track(streakTexture());

        /**
         * An additive billboard standing in for bloom.
         *
         * A post-process bloom pass would mean EffectComposer, two render
         * targets and a blur chain for a fifteen-second event on the heaviest
         * route on the site. A sprite per emitter costs one draw call, is fogged
         * like everything else, and — because it is depth-tested — is correctly
         * hidden when the locomotive passes in front of a station lamp, which a
         * screen-space bloom would not be.
         */
        const glows = [];
        const addGlow = (parent, x, y, z, size, color, opacity, tex = glowTex) => {
            const mat = track(new SpriteMaterial({
                map: tex, color, transparent: true, opacity,
                blending: AdditiveBlending, depthWrite: false,
            }));
            const s = new Sprite(mat);
            s.position.set(x, y, z);
            s.scale.set(size, size, 1);
            parent.add(s);
            glows.push({ sprite: s, base: opacity, baseScale: size });
            return s;
        };

        // ── the backdrop ────────────────────────────────────────────────────
        /*
         * Sky and skyline exist for the PHONE. On a desktop letterbox the frame
         * is ~3.8 world-units tall and none of this is in shot; on a portrait
         * shaft it is twelve units of otherwise empty air above the canopy. See
         * the framing note further down for why the two frames differ so much.
         */
        // Opaque and depth-writing on purpose. With `depthWrite: false` three
        // still sorts it with the opaque queue — front to back — so the sky
        // drew LAST and painted over the entire station.
        const skyMat = track(new MeshBasicMaterial({ map: track(skyTexture()), fog: false }));
        const sky = new Mesh(track(new PlaneGeometry(260, 90)), skyMat);
        sky.position.set(0, 22, -46);
        scene.add(sky);

        const cityMat = track(new MeshBasicMaterial({
            map: track(cityTexture()), transparent: true, fog: false, depthWrite: false, opacity: 0.9,
        }));
        const city = new Mesh(track(new PlaneGeometry(150, 31)), cityMat);
        // The base sits just under the line the canopy roof hides, so the
        // buildings have no visible footing — they rise out of the station.
        city.position.set(0, 18, -34);
        scene.add(city);

        // ── the world ───────────────────────────────────────────────────────
        const ground = new Mesh(track(new PlaneGeometry(160, 30)), M.ground);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        // Two rails, and the lit crown on each is what the whole site's seams
        // are made of — here it is a real specular highlight instead of a
        // painted line.
        for (const z of [-0.62, 0.62]) {
            const r = new Mesh(track(new BoxGeometry(160, 0.07, 0.09)), M.rail);
            r.position.set(0, 0.035, z);
            r.receiveShadow = true;
            scene.add(r);
        }
        // Sleepers, sparse — enough to read as track when the headlight sweeps
        // across them, not so many that they cost anything.
        const sleeperGeo = track(new BoxGeometry(0.22, 0.05, 1.9));
        for (let i = -34; i <= 34; i++) {
            const s = new Mesh(sleeperGeo, M.hullDark);
            s.position.set(i * 1.1, 0.012, 0);
            s.receiveShadow = true;
            scene.add(s);
        }
        // A second track behind everything, running off into the fog. It never
        // carries anything; it is there so the near track is one of several and
        // the station has a reason to be this size. It sits beyond the telegraph
        // poles — at its first position it ran straight through the far
        // platform's slab, with one rail buried and the other on the wrong side.
        for (const z of [-11.84, -10.6]) {
            const r = new Mesh(track(new BoxGeometry(160, 0.07, 0.09)), M.rail);
            r.position.set(0, 0.035, z);
            scene.add(r);
        }

        /*
         * ── THE PLATFORM ─────────────────────────────────────────────────────
         *
         * This was a bare slab with a hairline on it, and the crates appeared to
         * land on nothing. A platform is not a box — it is paving, an edge you
         * are warned away from, lamps, and a roof. Each of those is a few
         * primitives and together they are the difference between "a surface"
         * and "somewhere".
         */
        /* Deep enough that its front edge is never in shot. At 3.8 the slab
         * ended at z = 5 and the letterbox showed the far side of it, so the
         * bottom of the frame was a hard horizontal seam with nothing under it.
         * A platform you cannot see the back of is a platform you are standing
         * on. */
        const plat = new Mesh(track(new BoxGeometry(160, 0.34, 8)), M.platform);
        plat.position.set(0, 0.17, 5.2);
        plat.receiveShadow = true;
        scene.add(plat);

        // Paving: grooves across the slab. Nothing reads as a floor until
        // something on it has a repeating scale the eye can measure against.
        const grooveGeo = track(new BoxGeometry(0.035, 0.012, 8));
        for (let i = -30; i <= 30; i++) {
            const g = new Mesh(grooveGeo, M.ground);
            g.position.set(i * 1.4, 0.345, 5.2);
            scene.add(g);
        }
        // One groove running the other way, at the back of the safety line —
        // paving that only has one axis reads as decking, not as slabs.
        const seamGeo = track(new BoxGeometry(160, 0.012, 0.035));
        for (const z of [2.6, 4.2, 5.8]) {
            const s = new Mesh(seamGeo, M.ground);
            s.position.set(0, 0.345, z);
            scene.add(s);
        }

        // The safety line: the one piece of paint on a real platform, and amber
        // is already this world's warning colour.
        const safety = new Mesh(track(new BoxGeometry(160, 0.014, 0.14)), M.platformEdge);
        safety.position.set(0, 0.348, 1.72);
        scene.add(safety);

        // The coping stone at the edge, catching the light along its lip.
        const coping = new Mesh(track(new BoxGeometry(160, 0.36, 0.16)), M.trim);
        coping.position.set(0, 0.18, 1.28);
        coping.receiveShadow = true;
        scene.add(coping);

        /*
         * ── EVERYTHING VERTICAL GOES BEHIND THE TRAIN ────────────────────────
         *
         * The first version of this furniture stood on the near platform, at
         * z = 4.1 and 5.2 — between the camera and the track. Four lamp posts
         * and five stanchions then crossed the shot as a picket of black bars
         * with the locomotive glimpsed between them. Correct for a real station
         * and terrible for a 9:1 letterbox, where the subject is only ~90px tall
         * and every upright is a wall.
         *
         * So the near platform stays flat — paving, line, coping, crates, and
         * nothing that stands up — and all the height moves to the far side,
         * where it silhouettes AGAINST the fog and gives the shot depth instead
         * of taking bites out of it.
         *
         * The heights came DOWN in the second pass. The canopy sat at y=3.5 and
         * the lamp heads at 2.74, and the desktop frame tops out at about 2.9 —
         * so the entire station roof was built above the top of the picture. It
         * is at 2.85 now and the roofline is in shot, which is most of what
         * makes the band read as an interior rather than as open track.
         */
        const postGeo = track(new CylinderGeometry(0.045, 0.06, 2.2, 10));
        const armGeo = track(new CylinderGeometry(0.035, 0.035, 0.5, 8));
        const headGeo = track(new SphereGeometry(0.11, 12, 10));
        const shadeGeo = track(new CylinderGeometry(0.19, 0.07, 0.14, 12, 1, true));
        const LAMP_XS = [-11.5, -5.6, 0.3, 6.2, 12.1];
        for (const x of LAMP_XS) {
            const post = new Mesh(postGeo, M.iron);
            post.position.set(x, 1.35, -3.4);
            scene.add(post);

            const arm = new Mesh(armGeo, M.iron);
            arm.rotation.z = Math.PI / 2;
            arm.position.set(x + 0.25, 2.42, -3.4);
            scene.add(arm);

            // A shade over the bulb. Without it the lamp is a floating bead;
            // with it there is a fitting the light is falling out of.
            const shade = new Mesh(shadeGeo, M.iron);
            shade.position.set(x + 0.5, 2.44, -3.4);
            scene.add(shade);

            const head = new Mesh(headGeo, M.lampGlass);
            head.position.set(x + 0.5, 2.34, -3.4);
            scene.add(head);
            addGlow(scene, x + 0.5, 2.34, -3.4, 1.5, LAMP, 0.55);
        }

        // The far canopy: a roof edge and its stanchions behind the train, which
        // is what says "station" without standing in front of the subject.
        const canopy = new Mesh(track(new BoxGeometry(160, 0.12, 4.6)), M.canopy);
        canopy.position.set(0, 2.85, -5.2);
        scene.add(canopy);
        const canopyLip = new Mesh(track(new BoxGeometry(160, 0.2, 0.1)), M.trim);
        canopyLip.position.set(0, 2.76, -2.95);
        scene.add(canopyLip);
        // Ribs across the underside, receding — the cheapest possible way to
        // give a flat roof plane a direction and a scale.
        const ribGeo = track(new BoxGeometry(0.08, 0.07, 4.6));
        for (let i = -22; i <= 22; i++) {
            const rib = new Mesh(ribGeo, M.hullDark);
            rib.position.set(i * 1.6, 2.76, -5.2);
            scene.add(rib);
        }
        const stanchionGeo = track(new CylinderGeometry(0.07, 0.07, 2.85, 8));
        const braceGeo = track(new BoxGeometry(0.9, 0.05, 0.05));
        for (const x of [-15, -8.5, -2, 4.5, 11, 17.5]) {
            const s = new Mesh(stanchionGeo, M.iron);
            s.position.set(x, 1.42, -6.0);
            scene.add(s);
            // A diagonal brace at the head of each, which is the detail that
            // stops a column being a pipe.
            for (const dir of [-1, 1]) {
                const br = new Mesh(braceGeo, M.iron);
                br.position.set(x + dir * 0.42, 2.44, -6.0);
                br.rotation.z = dir * 0.5;
                scene.add(br);
            }
        }
        // A far platform for them to stand on, seen past the train.
        const farPlat = new Mesh(track(new BoxGeometry(160, 0.34, 3.6)), M.platform);
        farPlat.position.set(0, 0.17, -3.6);
        farPlat.receiveShadow = true;
        scene.add(farPlat);

        /*
         * Telegraph poles and their wires, beyond the roof.
         *
         * They exist for one reason: on a portrait frame the only things above
         * the canopy were sky and city, both of which are flat planes at a fixed
         * distance. The poles are real geometry at real depth, so they are the
         * only thing up there that moves with the camera — which is what sells
         * the rest of the backdrop as distance rather than as wallpaper.
         */
        const poleGeo = track(new CylinderGeometry(0.055, 0.075, 4.4, 7));
        const crossGeo = track(new BoxGeometry(0.06, 0.06, 1.5));
        const wireGeo = track(new BoxGeometry(9.2, 0.018, 0.018));
        const POLE_XS = [-18.4, -9.2, 0, 9.2, 18.4];
        for (let i = 0; i < POLE_XS.length; i++) {
            const x = POLE_XS[i];
            const p = new Mesh(poleGeo, M.hullDark);
            p.position.set(x, 2.2, -8.6);
            scene.add(p);
            for (const y of [3.9, 3.55]) {
                const cb = new Mesh(crossGeo, M.hullDark);
                cb.position.set(x, y, -8.6);
                scene.add(cb);
            }
            if (i < POLE_XS.length - 1) {
                for (const [y, z] of [[3.88, -8.0], [3.88, -9.2], [3.53, -8.0], [3.53, -9.2]]) {
                    const w = new Mesh(wireGeo, M.hullDark);
                    w.position.set(x + 4.6, y - 0.06, z);
                    scene.add(w);
                }
            }
        }

        /*
         * ── SIGNAGE ──────────────────────────────────────────────────────────
         *
         * Two signs, and both are the site's own vocabulary rather than invented
         * railway copy. §9 named this surface THE CONCOURSE, so that is what the
         * station is called; the hanging sign says which platform the train is
         * at, which is the one thing a passenger on it actually needs.
         */
        const nameboardTex = track(signTexture('CONCOURSE', { size: 74, track: 0.22 }));
        const nameboard = new Mesh(track(new PlaneGeometry(3.4, 0.85)), track(new MeshBasicMaterial({ map: nameboardTex, transparent: true })));
        nameboard.position.set(-7.4, 1.5, -3.35);
        scene.add(nameboard);
        const nameboardPosts = track(new BoxGeometry(0.07, 1.2, 0.07));
        for (const dx of [-1.5, 1.5]) {
            const p = new Mesh(nameboardPosts, M.iron);
            p.position.set(-7.4 + dx, 0.94, -3.35);
            scene.add(p);
        }

        const hangTex = track(signTexture('PLATFORM 1', { size: 60, track: 0.2 }));
        const hanging = new Mesh(track(new PlaneGeometry(1.9, 0.48)), track(new MeshBasicMaterial({ map: hangTex, transparent: true })));
        hanging.position.set(5.2, 2.36, -2.9);
        scene.add(hanging);
        const hangRod = track(new BoxGeometry(0.03, 0.32, 0.03));
        for (const dx of [-0.75, 0.75]) {
            const r = new Mesh(hangRod, M.iron);
            r.position.set(5.2 + dx, 2.72, -2.9);
            scene.add(r);
        }
        addGlow(scene, 5.2, 2.36, -2.85, 1.1, AMBER, 0.3);

        /*
         * ── THE SIGNAL ───────────────────────────────────────────────────────
         *
         * Green on the approach, red once the train is standing at the platform,
         * green again the moment it is cleared to leave. That is real practice
         * and it also happens to be the only thing in the scene that tells the
         * player what is about to happen before it happens — the lamp changes
         * at T_DEPART, half a second before the wheels move.
         *
         * It sits ahead of the train, at +x, because the train now runs left to
         * right. See the header note on why it used to run backwards.
         */
        const signalPost = new Mesh(track(new CylinderGeometry(0.06, 0.08, 2.6, 8)), M.iron);
        signalPost.position.set(10.4, 1.3, -2.3);
        scene.add(signalPost);
        const signalHead = new Mesh(track(new BoxGeometry(0.16, 0.62, 0.3)), M.hullDark);
        signalHead.position.set(10.4, 2.5, -2.3);
        scene.add(signalHead);
        const signalLensGeo = track(new CylinderGeometry(0.075, 0.075, 0.05, 12));
        const redMat = track(new MeshBasicMaterial({ color: SIGNAL_RED }));
        const greenMat = track(new MeshBasicMaterial({ color: SIGNAL_GREEN }));
        const redLens = new Mesh(signalLensGeo, redMat);
        redLens.rotation.x = Math.PI / 2;
        redLens.position.set(10.4, 2.66, -2.14);
        scene.add(redLens);
        const greenLens = new Mesh(signalLensGeo, greenMat);
        greenLens.rotation.x = Math.PI / 2;
        greenLens.position.set(10.4, 2.34, -2.14);
        scene.add(greenLens);
        const redGlow = addGlow(scene, 10.4, 2.66, -2.1, 0.75, SIGNAL_RED, 0);
        const greenGlow = addGlow(scene, 10.4, 2.34, -2.1, 0.75, SIGNAL_GREEN, 0);
        // A ladder up the post, because a signal nobody can reach is a prop.
        const rungGeo = track(new BoxGeometry(0.02, 0.02, 0.2));
        for (let i = 0; i < 9; i++) {
            const r = new Mesh(rungGeo, M.iron);
            r.position.set(10.28, 0.5 + i * 0.22, -2.3);
            scene.add(r);
        }

        // ── lights ──────────────────────────────────────────────────────────
        /*
         * Five sources, where the first pass had three and all of them timid.
         *
         * "Extremely dark" was the report and the numbers agreed: ambient 0.7 on
         * a near-black hull leaves the shadow side at essentially zero, so half
         * of every shape was missing. This is still night — the ratios are
         * cold-dominant and nothing here is white — but there is now enough
         * light in the scene for a surface to describe itself.
         */
        scene.add(new AmbientLight(0x40527d, 1.5));

        const key = new DirectionalLight(0xa9c0ec, 1.5);
        key.position.set(5, 9, 8);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        /*
         * The frustum is parked over the PLATFORM, not tracked to the train.
         *
         * Tracking gives a tighter map and better shadows on the locomotive, and
         * it also takes the crates' shadows away with it the moment the train
         * pulls out — the payout would visibly unstick itself from the ground
         * during the departure. A fixed 36-unit box at 2048 is 57 texels per
         * unit, which is more than enough for what is on screen.
         */
        key.shadow.camera.left = -18;
        key.shadow.camera.right = 18;
        key.shadow.camera.top = 14;
        key.shadow.camera.bottom = -14;
        key.shadow.camera.near = 1;
        key.shadow.camera.far = 44;
        key.shadow.bias = -0.0014;
        key.shadow.normalBias = 0.025;
        key.shadow.radius = 3;
        scene.add(key);
        scene.add(key.target);

        // Bounce off the platform, from below and in front. Cheap, and it is
        // what stops the underframe and the wheels from being a black band.
        const bounce = new DirectionalLight(0x6d84b8, 0.7);
        bounce.position.set(1, -3, 6);
        scene.add(bounce);

        /*
         * A rim light from behind and above, and it is the light doing the most
         * work here.
         *
         * Without it the train is a dark object on a dark ground and the boiler
         * — the one curved surface, and the whole reason the loco reads as a
         * locomotive — has nothing to catch. This is the same idea as the rail
         * light on every plinth on the site: an edge you can see because it is
         * lit, not because it is drawn.
         */
        const rim = new DirectionalLight(0xbcd0f5, 1.5);
        rim.position.set(-6, 5, -7);
        scene.add(rim);

        /*
         * Station lamps, pooling amber onto the platform.
         *
         * Two sets. The far ones hang at the lamp heads that are now visible
         * behind the train, so those fixtures light something and rim the roof
         * line. The near ones have no fixture on purpose — they sit above the
         * top of frame lighting the platform and the crates, which is where the
         * player is actually looking, and a post holding them up would be
         * another bar across the shot.
         */
        const lamps = [];
        for (const x of LAMP_XS) {
            const p = new PointLight(LAMP, 0, 11, 2);
            p.position.set(x + 0.5, 2.34, -3.4);
            scene.add(p);
            lamps.push({ light: p, peak: 14 });
        }
        /*
         * The near lamps hang over the TRACK EDGE, not over the middle of the
         * platform. Out at z = 4.2 they lit the empty paving between the crates
         * and the camera — the one part of the frame with nothing in it — and
         * the floor came up brighter than the subject. At 2.4 the pool lands on
         * the crates and the coping and falls away toward the lens, which is
         * both what a canopy lamp actually does and what puts the light where
         * the player is looking.
         */
        const NEAR_LAMP_XS = [-6.5, -1, 4.5];
        for (const x of NEAR_LAMP_XS) {
            const p = new PointLight(LAMP, 0, 11, 2);
            p.position.set(x, 3.2, 2.4);
            scene.add(p);
            lamps.push({ light: p, peak: 8.5 });
        }

        /*
         * The far lamps get a visible shaft; the near ones get a reflection.
         *
         * A cone falling from off the top of frame onto the near platform would
         * cross the subject, which is the one thing §9's furniture rule forbids.
         * What a wet platform does instead is lie the lamp down on the floor as
         * a streak, so the near light is accounted for without anything standing
         * between the camera and the train.
         */
        const beams = [];
        const lampConeGeo = track(new CylinderGeometry(0.1, 1.25, 2.5, 18, 1, true));
        for (const x of LAMP_XS) {
            const mat = track(beamMaterial(LAMP, 0.0, 1.6, 1.9));
            const cone = new Mesh(lampConeGeo, mat);
            cone.position.set(x + 0.5, 1.12, -3.4);
            scene.add(cone);
            beams.push({ mat, peak: 0.16 });
        }

        const wetGeo = track(new PlaneGeometry(1.9, 5.4));
        const wetPools = [];
        for (const x of NEAR_LAMP_XS) {
            const mat = track(new MeshBasicMaterial({
                map: glowTex, color: LAMP, transparent: true, opacity: 0,
                blending: AdditiveBlending, depthWrite: false,
            }));
            const pool = new Mesh(wetGeo, mat);
            pool.rotation.x = -Math.PI / 2;
            pool.position.set(x, 0.353, 2.6);
            scene.add(pool);
            wetPools.push(mat);
        }
        // The headlight's own reflection, which travels with the train and is
        // the only moving light on the floor.
        const headWetMat = track(new MeshBasicMaterial({
            map: glowTex, color: 0xffd9a0, transparent: true, opacity: 0,
            blending: AdditiveBlending, depthWrite: false,
        }));
        const headWet = new Mesh(track(new PlaneGeometry(7.5, 2.6)), headWetMat);
        headWet.rotation.x = -Math.PI / 2;
        headWet.position.set(0, 0.354, 2.3);
        scene.add(headWet);

        /*
         * Ground mist. Two big flat planes drifting in opposite directions at
         * different speeds, which is enough parallax to read as moving air.
         * A particle fog would be the honest version and costs forty sprites for
         * something that is behind the train the whole time.
         */
        const mistLayers = [];
        for (let i = 0; i < 2; i++) {
            const mat = track(new MeshBasicMaterial({
                map: smokeTex, color: 0x6d84b8, transparent: true, opacity: 0,
                blending: AdditiveBlending, depthWrite: false,
            }));
            const m = new Mesh(track(new PlaneGeometry(46, 13)), mat);
            m.rotation.x = -Math.PI / 2;
            m.position.set(0, 0.09 + i * 0.05, -2.5 + i * 1.5);
            scene.add(m);
            mistLayers.push({ mesh: m, mat, dir: i === 0 ? 1 : -1, speed: 0.24 + i * 0.19 });
        }

        // ── the locomotive ──────────────────────────────────────────────────
        const train = new Group();
        scene.add(train);

        const wheelsets = [];
        const wheelGeoCache = new Map();
        const wheelGeoFor = (radius) => {
            if (!wheelGeoCache.has(radius)) {
                wheelGeoCache.set(radius, track(new CylinderGeometry(radius, radius, 0.11, 22)));
            }
            return wheelGeoCache.get(radius);
        };
        const addWheels = (parent, xs, radius) => {
            const out = [];
            for (const x of xs) {
                for (const z of [-0.62, 0.62]) {
                    const w = new Mesh(wheelGeoFor(radius), M.iron);
                    w.rotation.x = Math.PI / 2;
                    w.position.set(x, radius, z);
                    w.castShadow = true;
                    parent.add(w);
                    wheelsets.push({ mesh: w, radius });
                    out.push(w);
                }
            }
            return out;
        };

        const loco = new Group();
        train.add(loco);

        // Boiler: a cylinder laid along the track. This one shape is most of
        // what separates a locomotive from a box, and it is one line.
        const boiler = new Mesh(track(new CylinderGeometry(0.52, 0.55, 2.25, 24)), M.hull);
        boiler.rotation.z = Math.PI / 2;
        boiler.position.set(0.62, 1.0, 0);
        boiler.castShadow = true;
        loco.add(boiler);

        // Smokebox door — a slightly proud disc at the front, the face of the engine.
        const smokebox = new Mesh(track(new CylinderGeometry(0.57, 0.57, 0.16, 24)), M.trim);
        smokebox.rotation.z = Math.PI / 2;
        smokebox.position.set(1.78, 1.0, 0);
        smokebox.castShadow = true;
        loco.add(smokebox);

        const chimney = new Mesh(track(new CylinderGeometry(0.17, 0.22, 0.52, 16)), M.iron);
        chimney.position.set(1.42, 1.66, 0);
        chimney.castShadow = true;
        loco.add(chimney);

        const dome = new Mesh(track(new SphereGeometry(0.26, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2)), M.trim);
        dome.position.set(0.42, 1.48, 0);
        loco.add(dome);

        const cab = new Mesh(track(new BoxGeometry(1.15, 1.2, 1.3)), M.hull);
        cab.position.set(-1.05, 1.2, 0);
        cab.castShadow = true;
        loco.add(cab);
        const cabRoof = new Mesh(track(new BoxGeometry(1.35, 0.08, 1.45)), M.trim);
        cabRoof.position.set(-1.05, 1.84, 0);
        cabRoof.castShadow = true;
        loco.add(cabRoof);

        // Cab windows — the only warm thing on the train besides the lamp.
        for (const z of [-0.66, 0.66]) {
            const win = new Mesh(track(new PlaneGeometry(0.62, 0.44)), track(new MeshBasicMaterial({ color: AMBER })));
            win.position.set(-1.05, 1.36, z);
            win.rotation.y = z > 0 ? 0 : Math.PI;
            loco.add(win);
            addGlow(loco, -1.05, 1.36, z * 1.06, 1.0, AMBER, 0.34);
        }

        const footplate = new Mesh(track(new BoxGeometry(LOCO_LEN, 0.1, 1.5)), M.trim);
        footplate.position.set(0.25, 0.52, 0);
        footplate.castShadow = true;
        loco.add(footplate);

        const buffer = new Mesh(track(new BoxGeometry(0.14, 0.5, 1.5)), M.iron);
        buffer.position.set(1.92, 0.72, 0);
        loco.add(buffer);

        /*
         * ── THE DETAIL PASS ──────────────────────────────────────────────────
         *
         * "No details to see" was the other half of the report, and the fix is
         * not more polygons — it is more EDGES. At this size a surface is read
         * by the highlights running along it, so every band, rail and rivet line
         * below exists to catch the rim light and break a plain cylinder into
         * something with construction. Each is one primitive.
         */

        // Boiler bands — the rings that hold the barrel together.
        const bandGeo = track(new CylinderGeometry(0.545, 0.545, 0.05, 20));
        for (const x of [0.05, 0.62, 1.2]) {
            const band = new Mesh(bandGeo, M.trim);
            band.rotation.z = Math.PI / 2;
            band.position.set(x, 1.0, 0);
            loco.add(band);
        }

        // Handrails down both flanks of the boiler — a bright thin line at the
        // widest point, which is the single most legible detail on a loco.
        const railGeo = track(new CylinderGeometry(0.022, 0.022, 2.2, 6));
        for (const z of [-0.5, 0.5]) {
            const hr = new Mesh(railGeo, M.brass);
            hr.rotation.z = Math.PI / 2;
            hr.position.set(0.62, 1.28, z);
            loco.add(hr);
        }

        // Smokebox door: hinge strap and centre dart. The face of the engine,
        // and the thing that makes the front read as a front.
        const strap = new Mesh(track(new BoxGeometry(0.04, 1.02, 0.07)), M.trim);
        strap.position.set(1.87, 1.0, 0);
        loco.add(strap);
        const dart = new Mesh(track(new CylinderGeometry(0.075, 0.075, 0.08, 10)), M.brass);
        dart.rotation.z = Math.PI / 2;
        dart.position.set(1.9, 1.0, 0);
        loco.add(dart);

        // Buffers — two, and they are the silhouette's punctuation at the end.
        const bufGeo = track(new CylinderGeometry(0.075, 0.09, 0.22, 10));
        for (const z of [-0.45, 0.45]) {
            const b = new Mesh(bufGeo, M.trim);
            b.rotation.z = Math.PI / 2;
            b.position.set(2.05, 0.78, z);
            loco.add(b);
        }

        // Safety valve and whistle on the firebox top.
        const valve = new Mesh(track(new CylinderGeometry(0.05, 0.06, 0.2, 8)), M.brass);
        valve.position.set(-0.35, 1.55, 0);
        loco.add(valve);
        const whistle = new Mesh(track(new CylinderGeometry(0.032, 0.032, 0.26, 8)), M.brass);
        whistle.position.set(-0.62, 1.62, 0.18);
        loco.add(whistle);

        // A chimney cap, so the stack ends in an edge rather than a cut.
        const cap = new Mesh(track(new CylinderGeometry(0.21, 0.19, 0.08, 16)), M.trim);
        cap.position.set(1.42, 1.9, 0);
        loco.add(cap);

        // Cab steps, hanging below the footplate on the platform side.
        const stepGeo = track(new BoxGeometry(0.34, 0.03, 0.16));
        for (let i = 0; i < 2; i++) {
            const st = new Mesh(stepGeo, M.trim);
            st.position.set(-1.35, 0.38 - i * 0.16, 0.72);
            loco.add(st);
        }

        // Cylinder blocks at the front, low and outboard — the other shape that
        // says steam rather than diesel. Moved out to z = ±0.72 and forward to
        // CYL_X so the motion below has somewhere to slide.
        const cylGeo = track(new CylinderGeometry(0.17, 0.17, 0.5, 12));
        const cylCapGeo = track(new CylinderGeometry(0.185, 0.185, 0.05, 12));
        for (const z of [-0.72, 0.72]) {
            const cyl = new Mesh(cylGeo, M.hullDark);
            cyl.rotation.z = Math.PI / 2;
            cyl.position.set(CYL_X, 0.5, z);
            cyl.castShadow = true;
            loco.add(cyl);
            for (const dx of [-0.25, 0.25]) {
                const cc = new Mesh(cylCapGeo, M.trim);
                cc.rotation.z = Math.PI / 2;
                cc.position.set(CYL_X + dx, 0.5, z);
                loco.add(cc);
            }
        }

        const DRIVER_XS = [1.35, 0.35, -0.95];
        const driverMeshes = addWheels(loco, DRIVER_XS, DRIVER_R);

        /*
         * ── THE MOTION ───────────────────────────────────────────────────────
         *
         * Rods, and they are the reason this pass exists at all.
         *
         * A locomotive is not a thing with turning wheels; it is a thing with
         * turning wheels connected by a bar that goes round with them. That bar
         * — the coupling rod — is what the eye reads as "steam", and without it
         * a rotating cylinder is a decal. It is also almost free to animate
         * correctly: because all three drivers are in phase, the rod stays
         * horizontal and simply orbits, so its position is one sine and one
         * cosine per frame and it needs no rotation at all.
         *
         * The main rod does need one. It runs from the crank pin on the middle
         * driver to a crosshead sliding in a straight line at cylinder height,
         * and the crosshead's position is the fixed rod length solved against
         * the pin's — which is what makes the piston stroke come out right
         * instead of being a second sine wave that drifts out of phase.
         */
        const pinGeo = track(new CylinderGeometry(0.036, 0.036, 0.1, 8));
        const tyreGeo = track(new TorusGeometry(DRIVER_R - 0.02, 0.035, 6, 20));
        const hubGeo = track(new CylinderGeometry(0.055, 0.055, 0.13, 8));
        for (const w of driverMeshes) {
            // Local +Y on a wheel points along the axle, so the outboard side is
            // whichever sign of y matches the wheel's own z.
            const outboard = w.position.z > 0 ? 0.06 : -0.06;
            const pin = new Mesh(pinGeo, M.brass);
            pin.position.set(CRANK_R, outboard, 0);
            w.add(pin);

            const tyre = new Mesh(tyreGeo, M.trim);
            tyre.rotation.x = Math.PI / 2;
            tyre.position.set(0, 0.005, 0);
            w.add(tyre);

            const hub = new Mesh(hubGeo, M.brass);
            w.add(hub);
        }

        const COUPLE_SPAN = DRIVER_XS[0] - DRIVER_XS[2];
        const COUPLE_MID = (DRIVER_XS[0] + DRIVER_XS[2]) / 2;
        const coupleGeo = track(new BoxGeometry(COUPLE_SPAN + 0.16, 0.06, 0.045));
        const mainGeo = track(new BoxGeometry(MAIN_ROD, 0.05, 0.04));
        const crossGeoBlk = track(new BoxGeometry(0.16, 0.14, 0.09));
        const pistonGeo = track(new BoxGeometry(0.5, 0.035, 0.035));
        const slideGeo = track(new BoxGeometry(0.62, 0.025, 0.03));
        const rods = [];
        for (const z of [-0.735, 0.735]) {
            const couple = new Mesh(coupleGeo, M.trim);
            couple.position.z = z;
            loco.add(couple);

            const main = new Mesh(mainGeo, M.trim);
            main.position.z = z;
            loco.add(main);

            const crosshead = new Mesh(crossGeoBlk, M.iron);
            crosshead.position.set(1.1, 0.5, z);
            loco.add(crosshead);

            const piston = new Mesh(pistonGeo, M.trim);
            piston.position.set(1.3, 0.5, z);
            loco.add(piston);

            // The bar the crosshead runs on, which is static and is what makes
            // the sliding block look guided rather than floating.
            const slide = new Mesh(slideGeo, M.iron);
            slide.position.set(1.12, 0.6, z);
            loco.add(slide);

            rods.push({ couple, main, crosshead, piston, z });
        }

        /*
         * If an authored model is configured, it replaces the procedural body —
         * and only the body. The headlight, the cab glow, the wheels and the
         * rods above stay where they are until a model turns up with its wheels
         * as separate objects, because a merged wheel cannot rotate.
         */
        if (LOCO_MODEL_URL) {
            Promise.all([
                import('three/examples/jsm/loaders/GLTFLoader.js'),
                import('three'),
            ]).then(([{ GLTFLoader }, { Box3, Vector3 }]) => {
                new GLTFLoader().load(LOCO_MODEL_URL, (gltf) => {
                    const model = gltf.scene;

                    // Normalise whatever it arrives as: sit it on the rail, point
                    // it down the track, and scale it so its length matches the
                    // procedural loco the rest of the scene is built around.
                    const box = new Box3().setFromObject(model);
                    const span = new Vector3();
                    box.getSize(span);
                    const longest = Math.max(span.x, span.z);
                    model.scale.setScalar((LOCO_LEN * 1.15) / (longest || 1));
                    if (span.z > span.x) model.rotation.y = Math.PI / 2;

                    const box2 = new Box3().setFromObject(model);
                    model.position.y -= box2.min.y;
                    model.position.x -= (box2.min.x + box2.max.x) / 2;

                    model.traverse((o) => {
                        if (!o.isMesh) return;
                        o.castShadow = true;
                        // The site's own surface, not the model's livery.
                        o.material = M.hull;
                    });

                    for (const part of [boiler, smokebox, chimney, dome, cab, cabRoof, footplate, buffer]) {
                        part.visible = false;
                    }
                    loco.add(model);
                }, undefined, (err) => {
                    console.warn('[Arrival] Locomotive model failed to load; keeping the procedural one.', err);
                });
            });
        }

        // The headlight: a real spotlight, throwing down the track ahead.
        const lampBulb = new Mesh(track(new SphereGeometry(0.1, 12, 10)), track(new MeshBasicMaterial({ color: 0xffe6b8 })));
        lampBulb.position.set(1.95, 1.28, 0);
        loco.add(lampBulb);
        /*
         * The glow is SMALL and the streak is THIN.
         *
         * At the first sizes — a 1.5-unit bloom and a 5.2-unit streak — the
         * headlight erased the smokebox, the buffers and the whole front of the
         * engine behind a white disc. A lamp that consumes the machine it is
         * bolted to has stopped being a detail. Half the diameter, a third of
         * the streak length, and the nose comes back.
         */
        const headGlow = addGlow(loco, 2.0, 1.28, 0, 0.62, 0xffd9a0, 0);
        const headStreakMat = track(new SpriteMaterial({
            map: streakTex, color: 0xffd9a0, transparent: true, opacity: 0,
            blending: AdditiveBlending, depthWrite: false,
        }));
        const headStreak = new Sprite(headStreakMat);
        headStreak.position.set(2.02, 1.28, 0);
        headStreak.scale.set(1.9, 0.24, 1);
        loco.add(headStreak);

        const head = new SpotLight(0xffd9a0, 0, 30, 0.34, 0.65, 1.4);
        head.position.set(1.95, 1.28, 0);
        const headTarget = new Object3D();
        headTarget.position.set(16, 0.35, 0);
        loco.add(head);
        loco.add(headTarget);
        head.target = headTarget;

        // The visible shaft. Narrow cap at the lamp, wide end down the track;
        // `rotation.z = +90°` maps the cylinder's own +Y to −X, so the cap ends
        // up at the near end and the beam runs out ahead of the engine.
        const headBeamMat = track(beamMaterial(0xffd2a0, 0, 1.5, 2.6));
        const headBeam = new Mesh(track(new CylinderGeometry(0.09, 1.5, 11, 20, 1, true)), headBeamMat);
        headBeam.rotation.z = Math.PI / 2;
        headBeam.position.set(1.95 + 5.5, 1.15, 0);
        loco.add(headBeam);

        // The firebox, seen under the cab. It flickers, it is the only unsteady
        // light in the scene, and it is what makes the engine feel alight.
        const fireGlow = addGlow(loco, -1.05, 0.5, 0.2, 1.1, 0xff8a2a, 0);
        const fireLight = new PointLight(0xff7a20, 0, 3.4, 2);
        fireLight.position.set(-1.05, 0.45, 0.3);
        loco.add(fireLight);

        /*
         * ── VEHICLES ─────────────────────────────────────────────────────────
         *
         * Laid out by a running cursor rather than by index arithmetic, because
         * the consist is no longer "n identical cars": it is a tender, then one
         * wagon per crate in two alternating styles, then a brake van. Adding or
         * reordering a vehicle is now one `place()` call and nothing downstream
         * needs to know.
         */
        let cursor = -LOCO_LEN / 2;
        const place = (len) => {
            const g = new Group();
            g.position.x = cursor - CAR_GAP - len / 2;
            cursor = g.position.x - len / 2;
            train.add(g);
            return g;
        };
        const bufferPair = (parent, x) => {
            for (const z of [-0.42, 0.42]) {
                const b = new Mesh(bufGeo, M.trim);
                b.rotation.z = Math.PI / 2;
                b.position.set(x, 0.62, z);
                parent.add(b);
            }
        };

        // The tender. Coal is the one thing on this train that is not a box or
        // a cylinder, and the irregular heap is what the eye notices first.
        const tender = place(TENDER_LEN);
        const tenderBody = new Mesh(track(new BoxGeometry(TENDER_LEN, 0.86, 1.44)), M.hull);
        tenderBody.position.y = 0.95;
        tenderBody.castShadow = true;
        tender.add(tenderBody);
        const tenderFrame = new Mesh(track(new BoxGeometry(TENDER_LEN + 0.1, 0.14, 1.5)), M.hullDark);
        tenderFrame.position.y = 0.55;
        tender.add(tenderFrame);
        const coalGeo = track(new BoxGeometry(0.3, 0.24, 0.3));
        for (let i = 0; i < 9; i++) {
            const lump = new Mesh(coalGeo, M.coal);
            lump.position.set(
                (hash(i * 3.7) - 0.5) * (TENDER_LEN - 0.5),
                1.34 + hash(i * 9.1) * 0.12,
                (hash(i * 5.3) - 0.5) * 0.9,
            );
            lump.rotation.set(hash(i) * 1.2, hash(i * 2.2) * 1.6, hash(i * 4.4) * 0.9);
            lump.castShadow = true;
            tender.add(lump);
        }
        for (const z of [-0.74, 0.74]) {
            const lip = new Mesh(track(new BoxGeometry(TENDER_LEN, 0.07, 0.06)), M.trim);
            lip.position.set(0, 1.38, z);
            tender.add(lip);
        }
        addWheels(tender, [TENDER_LEN / 2 - 0.5, -TENDER_LEN / 2 + 0.5], 0.28);
        bufferPair(tender, TENDER_LEN / 2 + 0.06);
        bufferPair(tender, -TENDER_LEN / 2 - 0.06);

        // ── the freight cars ────────────────────────────────────────────────
        const crateMeshes = [];
        for (let i = 0; i < cars; i++) {
            const car = place(CAR_LEN);

            const deck = new Mesh(track(new BoxGeometry(CAR_LEN, 0.16, 1.5)), M.hullDark);
            deck.position.y = 0.62;
            deck.castShadow = true;
            car.add(deck);
            const solebar = new Mesh(track(new BoxGeometry(CAR_LEN + 0.08, 0.1, 1.56)), M.trim);
            solebar.position.y = 0.53;
            car.add(solebar);

            /*
             * Two wagon styles, alternating. Identical wagons made the consist
             * read as an extruded strip; a row that changes every other vehicle
             * reads as a train that was assembled out of what was available,
             * which is what a real freight is.
             */
            if (i % 2 === 0) {
                // Gondola: ribbed sides, open top.
                for (const z of [-0.72, 0.72]) {
                    const side = new Mesh(track(new BoxGeometry(CAR_LEN, 0.34, 0.07)), M.hull);
                    side.position.set(0, 0.84, z);
                    side.castShadow = true;
                    car.add(side);
                    for (let r = -1; r <= 1; r++) {
                        const rib = new Mesh(track(new BoxGeometry(0.07, 0.38, 0.1)), M.trim);
                        rib.position.set(r * (CAR_LEN / 3), 0.84, z);
                        car.add(rib);
                    }
                }
                for (const x of [-CAR_LEN / 2 + 0.04, CAR_LEN / 2 - 0.04]) {
                    const endw = new Mesh(track(new BoxGeometry(0.07, 0.34, 1.44)), M.hull);
                    endw.position.set(x, 0.84, 0);
                    car.add(endw);
                }
            } else {
                // Flat wagon: corner stakes and a chain rail, nothing else.
                for (const z of [-0.7, 0.7]) {
                    for (const x of [-CAR_LEN / 2 + 0.18, 0, CAR_LEN / 2 - 0.18]) {
                        const stake = new Mesh(track(new BoxGeometry(0.07, 0.42, 0.07)), M.trim);
                        stake.position.set(x, 0.9, z);
                        stake.castShadow = true;
                        car.add(stake);
                    }
                    const chain = new Mesh(track(new BoxGeometry(CAR_LEN - 0.2, 0.02, 0.02)), M.iron);
                    chain.position.set(0, 1.0, z);
                    car.add(chain);
                }
            }

            addWheels(car, [CAR_LEN / 2 - 0.45, -CAR_LEN / 2 + 0.45], 0.3);
            bufferPair(car, CAR_LEN / 2 + 0.06);
            bufferPair(car, -CAR_LEN / 2 - 0.06);

            /*
             * A crate is the one object the player actually cares about, and it
             * was a plain box with a wireframe on it — which reads as a
             * developer placeholder, because that is exactly what a glowing
             * wireframe cube is.
             *
             * Now it is built: a body, banding straps around both axes, corner
             * brackets, and a lit seam under the lid. All primitives, all
             * catching the rim light, and the amber is on the METAL rather than
             * on an outline — the same move as the tier rims elsewhere, where
             * the glow belongs to a material and not to a stroke.
             */
            const crate = new Group();
            const box = new Mesh(track(new BoxGeometry(0.62, 0.62, 0.62)), M.crate);
            box.castShadow = true;
            crate.add(box);

            // Banding straps, one each way round the box.
            const strapH = new Mesh(track(new BoxGeometry(0.646, 0.07, 0.646)), M.crateBand);
            strapH.position.y = 0.06;
            crate.add(strapH);
            const strapV = new Mesh(track(new BoxGeometry(0.07, 0.646, 0.646)), M.crateBand);
            crate.add(strapV);

            // Corner brackets — eight little tabs that give the silhouette its
            // bite and stop the cube from being a cube.
            const brGeo = track(new BoxGeometry(0.14, 0.14, 0.14));
            for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
                const br = new Mesh(brGeo, M.trim);
                br.position.set(sx * 0.27, sy * 0.27, sz * 0.27);
                crate.add(br);
            }

            // The lid seam, lit. One glowing line, where there used to be twelve.
            const seam = new Mesh(track(new BoxGeometry(0.64, 0.012, 0.64)), M.glow);
            seam.position.y = 0.2;
            crate.add(seam);
            const seamGlow = addGlow(crate, 0, 0.2, 0, 1.1, AMBER, 0.2);

            scene.add(crate);
            crateMeshes.push({ crate, car, carIndex: i, seamGlow, landed: false });
        }

        /*
         * The brake van, at the tail. It is the only vehicle with a light of its
         * own, and it is what gives the consist an END — a train that just stops
         * being wagons reads as a strip that was cut off.
         */
        const van = place(VAN_LEN);
        const vanBody = new Mesh(track(new BoxGeometry(VAN_LEN, 1.05, 1.4)), M.hull);
        vanBody.position.y = 1.06;
        vanBody.castShadow = true;
        van.add(vanBody);
        const vanRoof = new Mesh(track(new BoxGeometry(VAN_LEN + 0.14, 0.07, 1.54)), M.trim);
        vanRoof.position.y = 1.62;
        van.add(vanRoof);
        const vanFrame = new Mesh(track(new BoxGeometry(VAN_LEN + 0.1, 0.13, 1.46)), M.hullDark);
        vanFrame.position.y = 0.55;
        van.add(vanFrame);
        for (const z of [-0.71, 0.71]) {
            const win = new Mesh(track(new PlaneGeometry(0.4, 0.3)), track(new MeshBasicMaterial({ color: 0xffb347 })));
            win.position.set(0.3, 1.2, z);
            win.rotation.y = z > 0 ? 0 : Math.PI;
            van.add(win);
            addGlow(van, 0.3, 1.2, z * 1.05, 0.9, 0xffb347, 0.26);
        }
        // The tail lamp — red, and the last thing the platform sees leave. It
        // gets its OWN material: `redMat` is the signal's lens and the frame
        // loop mutates its colour, which would have switched the van's lamp off
        // every time the signal cleared.
        const tailMat = track(new MeshBasicMaterial({ color: SIGNAL_RED }));
        const tailLamp = new Mesh(track(new SphereGeometry(0.06, 8, 6)), tailMat);
        tailLamp.position.set(-VAN_LEN / 2 - 0.05, 0.95, 0.4);
        van.add(tailLamp);
        addGlow(van, -VAN_LEN / 2 - 0.08, 0.95, 0.4, 0.6, SIGNAL_RED, 0.5);
        addWheels(van, [VAN_LEN / 2 - 0.45, -VAN_LEN / 2 + 0.45], 0.28);
        bufferPair(van, VAN_LEN / 2 + 0.06);
        bufferPair(van, -VAN_LEN / 2 - 0.06);

        /*
         * ── PARTICLES ────────────────────────────────────────────────────────
         *
         * Three pools, all pre-allocated and recycled: exhaust from the chimney,
         * steam at rail level, and embers. This runs for fifteen seconds at
         * sixty frames and the garbage from a spawn-and-discard system shows up
         * as a stutter halfway through, which is precisely when the train is
         * arriving.
         *
         * They are SPRITES now rather than spheres. A sphere lit by the scene is
         * a ball of smoke; a soft billboard with a gradient is smoke, costs one
         * quad, and can be rotated per puff so no two are the same shape.
         */
        const makePool = (n, color, opacity) => {
            const out = [];
            for (let i = 0; i < n; i++) {
                const mat = track(new SpriteMaterial({
                    map: smokeTex, color, transparent: true, opacity: 0,
                    depthWrite: false,
                }));
                const s = new Sprite(mat);
                s.visible = false;
                scene.add(s);
                out.push({ sprite: s, mat, born: -1, seed: Math.random(), vx: 0, vy: 0, vz: 0, life: 1, peak: opacity });
            }
            return out;
        };
        /*
         * Both pools were pitched at the opacity a single puff wants and the
         * result was invisible: at 0.19 over a fogged night sky, scaled by a
         * lamp level that is only half up during the approach, the exhaust
         * measured about 10% alpha on a 90px-tall subject and simply did not
         * exist on screen. Smoke reads as a MASS, not as a puff — the number
         * that matters is what thirty overlapping sprites add up to.
         */
        const exhaust = makePool(34, 0xa9bcd8, 0.42);
        const steam = makePool(26, 0xd6e3f7, 0.44);

        const embers = [];
        for (let i = 0; i < 22; i++) {
            const mat = track(new SpriteMaterial({
                map: glowTex, color: 0xffb15a, transparent: true, opacity: 0,
                blending: AdditiveBlending, depthWrite: false,
            }));
            const s = new Sprite(mat);
            s.visible = false;
            s.scale.set(0.09, 0.09, 1);
            scene.add(s);
            embers.push({ sprite: s, mat, born: -1, seed: Math.random(), vx: 0, vy: 0, vz: 0 });
        }

        const emit = (pool, idxRef, x, y, z, opts) => {
            const p = pool[idxRef.i];
            idxRef.i = (idxRef.i + 1) % pool.length;
            p.born = opts.t;
            p.seed = Math.random();
            p.sprite.visible = true;
            p.sprite.position.set(x, y, z);
            p.sprite.material.rotation = p.seed * Math.PI * 2;
            p.vx = opts.vx || 0;
            p.vy = opts.vy || 0;
            p.vz = opts.vz || 0;
            p.life = opts.life || 2.4;
            p.grow = opts.grow || 2.0;
            p.size0 = opts.size0 || 0.4;
            p.peakOverride = opts.peak;
            return p;
        };
        const exRef = { i: 0 }, stRef = { i: 0 }, emRef = { i: 0 };

        // ── sizing and framing ──────────────────────────────────────────────
        /*
         * ── THE TWO FRAMES ───────────────────────────────────────────────────
         *
         * A fixed vertical FOV was right for exactly one shape of viewport. The
         * reel mount is a ~9:1 letterbox on a desktop and a nearly-square shaft
         * on a phone (WheelSpinner gives it `height: 100%` there), and 17° of
         * vertical on a 0.45 aspect leaves a horizontal field about a metre
         * wide: you would see the boiler and nothing else.
         *
         * So the vertical FOV is DERIVED from how much track has to fit across,
         * with the letterbox's 17° as a floor. The consequence on a phone is a
         * tall frame with twelve units of air above the canopy — which is why
         * the sky, the skyline and the telegraph poles exist, and why the aim
         * point rises to push the train into the lower third rather than
         * stranding it in the middle of an empty rectangle.
         */
        const trainLen = LOCO_LEN / 2 - cursor;
        /* Where the train comes to rest. The group's origin is the LOCOMOTIVE and
         * everything else hangs off it in −x, so centring the consist would put
         * the engine at the right-hand edge on a long train. Capped, so the
         * subject stays near the middle and the wagons run off into the fog. */
        const REST_X = Math.min(4.6, trainLen / 2 - LOCO_LEN / 2);
        const START_X = -36;
        /*
         * Far enough that the WHOLE consist clears the frame, not just the
         * locomotive. A fixed end point left the brake van sitting in shot on a
         * long train while the timeline said the platform was empty.
         */
        const END_X = 28 + trainLen;

        let W = 0, H = 0, aimX = -0.4, aimY = 1.28, crateSpread = 1.05, crateCentre = 0;
        const size = () => {
            const r = wrap.getBoundingClientRect();
            W = Math.max(1, r.width); H = Math.max(1, r.height);
            renderer.setSize(W, H, false);
            const aspect = W / H;
            camera.aspect = aspect;

            const fitW = aspect >= 4 ? Math.min(38, Math.max(16, trainLen * 1.3)) : 11.5;
            const needV = 2 * Math.atan((fitW / 2) / (FRAME_DIST * aspect)) * 180 / Math.PI;
            camera.fov = Math.max(17, Math.min(58, needV));
            camera.updateProjectionMatrix();

            const visH = 2 * FRAME_DIST * Math.tan(camera.fov * Math.PI / 360);
            const visW = visH * aspect;
            // The train sits at 38% up the frame, not at the centre: a tall
            // frame with the subject dead centre is a subject with nothing
            // under it and a ceiling of dead air over it.
            aimY = 1.42 + Math.max(0, visH - 4.1) * 0.13;
            /*
             * And on a narrow frame the camera looks at the ENGINE, not at the
             * middle of the track.
             *
             * The letterbox is wide enough that the aim point barely matters —
             * the whole consist is in shot either way. The phone shaft is 11.5
             * units across and the locomotive parks at +4.6, so aiming at −0.4
             * put the smokebox a unit and a half past the right edge: the phone
             * got a picture of the wagons and the crates, and no train.
             */
            aimX = aspect >= 4 ? -0.4 : REST_X - 1.1;
            // The crates land beside their own wagon, compressed toward the
            // middle only as far as is needed to keep the last one in shot.
            const farthest = Math.abs(crateMeshes.length ? crateMeshes[crateMeshes.length - 1].car.position.x + REST_X : 1);
            crateSpread = Math.min(1, (visW * 0.34) / Math.max(1, farthest));
            // The row follows the aim point, or a phone unloads its crates off
            // the left of its own frame.
            crateCentre = aspect >= 4 ? 0 : aimX - 1.2;
        };
        size();
        const ro = new ResizeObserver(size);
        ro.observe(wrap);

        let raf = 0;
        const start = performance.now();
        let prev = 0;
        let wheelPhase = 0;
        let lastChuff = 0;
        let lastChuffAt = -1;
        let lastIdle = 0;
        let settleFired = false;
        let departFired = false;

        const frame = (now) => {
            const t = motionOff ? T_SETTLE + 0.5 : Math.max(0, (now - start) / 1000);
            const dt = Math.min(0.05, Math.max(0, t - prev));
            prev = t;
            const ta = t - T_SHUTTER;           // the 3D scene's own clock
            const APPROACH = T_APPROACH - T_SHUTTER;

            // ── the train's position and speed ──────────────────────────────
            let x, vel;
            if (t < T_APPROACH) {
                const p = easeOutExpo(clamp01(ta / APPROACH));
                x = START_X + (REST_X - START_X) * p;
                const p2 = easeOutExpo(clamp01((ta + 0.016) / APPROACH));
                vel = ((START_X + (REST_X - START_X) * p2) - x) / 0.016;
            } else if (t < T_DEPART) {
                x = REST_X; vel = 0;
            } else {
                const p = easeInCubic(clamp01((t - T_DEPART) / (T_GONE - T_DEPART)));
                x = REST_X + (END_X - REST_X) * p;
                const p2 = easeInCubic(clamp01((t + 0.016 - T_DEPART) / (T_GONE - T_DEPART)));
                vel = ((REST_X + (END_X - REST_X) * p2) - x) / 0.016;
            }
            train.position.x = x;

            /*
             * Wheels turn at the speed the train is actually travelling —
             * rolling without slipping, so the phase is −v·dt/r and not a
             * per-frame constant. That matters more than it used to: the rods
             * are driven off this angle, and a frame-rate-dependent phase would
             * make the piston stroke change length on a slow machine.
             */
            wheelPhase -= (vel * dt) / DRIVER_R;
            for (const w of wheelsets) w.mesh.rotation.y -= (vel * dt) / w.radius;

            // The rods, solved from the same angle the drivers are at.
            const pinX = CRANK_R * Math.cos(wheelPhase);
            const pinY = CRANK_R * Math.sin(wheelPhase);
            for (const rod of rods) {
                rod.couple.position.set(COUPLE_MID + pinX, DRIVER_R + pinY, rod.z);

                const px = DRIVER_XS[1] + pinX;
                const py = DRIVER_R + pinY;
                const dy = 0.5 - py;
                const run = Math.sqrt(Math.max(0.0001, MAIN_ROD * MAIN_ROD - dy * dy));
                const cx = px + run;
                rod.main.position.set((px + cx) / 2, (py + 0.5) / 2, rod.z);
                rod.main.rotation.z = Math.atan2(0.5 - py, run);
                rod.crosshead.position.x = cx;
                rod.piston.position.x = cx + 0.3;
            }

            /*
             * The lamps stay lit until the shutters start closing over them —
             * NOT while the train is still leaving. They used to start dimming
             * 1.2s before T_GONE, which meant the platform went dark underneath
             * a locomotive that was still visibly pulling out; the departure
             * lost its own lighting halfway through.
             *
             * The station clears BEFORE the shutters roll up, not with them.
             * This canvas sits above the shutter, so a blade lifting while the
             * platform is still painted reveals the station through the gap
             * instead of the reel — the opening would show the very thing it is
             * supposed to be taking away.
             */
            const exit = clamp01((t - T_LIFT) / SCENE_FADE_S);
            const lampLevel = clamp01(ta / (APPROACH * 0.55)) * (1 - exit);
            for (const p of lamps) p.light.intensity = lampLevel * p.peak;
            head.intensity = lampLevel * 46;
            canvas.style.opacity = String(1 - exit);

            // Everything additive rides the same level, so the whole station
            // dims as one object rather than leaving glows floating in a fade.
            for (const g of glows) g.sprite.material.opacity = g.base * lampLevel;
            for (const b of beams) b.mat.uniforms.uOpacity.value = b.peak * lampLevel;
            for (const m of wetPools) m.opacity = 0.19 * lampLevel;

            // The headlight is brightest head-on and the streak grows with it.
            const headOn = clamp01(lampLevel * 1.1);
            headGlow.material.opacity = 0.9 * headOn;
            headGlow.scale.set(lerp(0.4, 0.62, headOn), lerp(0.4, 0.62, headOn), 1);
            headStreakMat.opacity = 0.5 * headOn;
            headBeamMat.uniforms.uOpacity.value = 0.3 * headOn;
            headWetMat.opacity = 0.22 * headOn;
            headWet.position.x = x + 5.0;

            // The firebox flickers on its own clock — the one unsteady light.
            const flick = 0.72 + 0.28 * Math.sin(t * 17.3) * Math.sin(t * 6.1);
            fireGlow.material.opacity = 0.5 * flick * lampLevel;
            fireLight.intensity = 2.6 * flick * lampLevel;

            // The signal: green on the approach, red while standing, green
            // again half a second before the wheels move.
            const clear = t < T_SETTLE || t > T_DEPART - 0.5;
            redGlow.material.opacity = (clear ? 0 : 0.85) * lampLevel;
            greenGlow.material.opacity = (clear ? 0.85 : 0) * lampLevel;
            redMat.color.setHex(clear ? 0x4a1512 : SIGNAL_RED);
            greenMat.color.setHex(clear ? SIGNAL_GREEN : 0x123a1f);

            // Mist drifts, and only once the platform is lit.
            for (const layer of mistLayers) {
                layer.mat.opacity = 0.07 * lampLevel;
                layer.mesh.position.x = ((t * layer.speed * layer.dir) % 24) - 12;
            }

            // ── the camera ──────────────────────────────────────────────────
            /*
             * A slow push, and a shake the train actually causes.
             *
             * The drift is 1.4 units of dolly over eighteen seconds, which is
             * under a pixel a frame and is not consciously visible — it is there
             * so the backdrop planes and the poles separate in parallax and the
             * shot stops being a photograph of a model.
             *
             * The shake is scaled by speed AND by how close the locomotive is to
             * the camera, so it peaks exactly as the engine sweeps past and is
             * gone by the time it stops. A constant rumble would just read as a
             * loose camera mount.
             */
            const drift = motionOff ? 0.4 : clamp01(t / (T_LIFT_END || 1));
            // The side offset is measured from the AIM point, not from the
            // origin — otherwise moving the aim to the engine on a phone swings
            // the camera round to the other side of the track.
            let camX = aimX + 3.0 - drift * 0.7;
            let camY = CAM_HOME.y + drift * 0.16;
            let camZ = CAM_HOME.z - drift * 1.4;
            if (!motionOff) {
                const near = clamp01(1 - Math.abs(x - 1.5) / 16);
                const rumble = clamp01((Math.abs(vel) - 3) / 22) * near;
                if (rumble > 0.001) {
                    camX += Math.sin(t * 51.3) * 0.014 * rumble;
                    camY += Math.sin(t * 43.7 + 1.1) * 0.018 * rumble;
                }
                // A single jolt as the brakes take hold.
                const jolt = clamp01(1 - Math.abs(t - T_SETTLE) / 0.5);
                camY += Math.sin((t - T_SETTLE) * 38) * 0.012 * jolt * jolt;
            }
            camera.position.set(camX, camY, camZ);
            camera.lookAt(aimX, aimY, 0);

            // The key light's shadow frustum stays over the platform.
            key.position.set(5, 9, 8);
            key.target.position.set(0, 0.6, 1.0);

            // ── the crates ──────────────────────────────────────────────────
            const n = Math.max(1, crateMeshes.length);
            for (const entry of crateMeshes) {
                const { crate, car, carIndex, seamGlow } = entry;
                const at = T_SETTLE + carIndex * ((T_UNLOAD - T_SETTLE) / n);
                const p = motionOff ? 1 : clamp01((t - at) / 0.6);

                // On the car until its moment, then a parabola onto the
                // platform. A crate that slides in a straight line has no mass.
                const carX = x + car.position.x;
                const restSlot = crateCentre + (REST_X + car.position.x) * crateSpread;
                const fromY = 1.02, toY = 0.65;

                crate.position.x = lerp(carX, restSlot, p);
                crate.position.z = lerp(0, 2.6, p);
                crate.position.y = lerp(fromY, toY, p) + Math.sin(p * Math.PI) * 0.85;
                crate.rotation.y = p * 0.6;
                // Once down it stays down, even as the train pulls away.
                if (p >= 1) { crate.position.x = restSlot; crate.position.z = 2.6; }

                // The seam flares on the landing and settles back. It is the
                // only moment a crate is louder than the train, and it is the
                // moment the payout physically exists.
                const sinceLand = t - (at + 0.6);
                const flare = clamp01(1 - sinceLand / 0.5);
                seamGlow.material.opacity = (0.2 + flare * 0.75) * lampLevel;
                seamGlow.scale.setScalar(lerp(1.1, 2.2, flare));

                if (!motionOff && !entry.landed && p >= 1) {
                    entry.landed = true;
                    // Dust off the paving, thrown outward from where it hit.
                    for (let k = 0; k < 3; k++) {
                        emit(steam, stRef, restSlot + (hash(k * 3.3) - 0.5) * 0.5, 0.42, 2.6 + (hash(k * 7.1) - 0.5) * 0.5, {
                            t, vx: (hash(k) - 0.5) * 0.5, vy: 0.16, vz: (hash(k * 2.1) - 0.5) * 0.4,
                            life: 0.9, grow: 2.4, size0: 0.28, peak: 0.15,
                        });
                    }
                }
            }

            // ── smoke, steam and embers ─────────────────────────────────────
            if (!motionOff) {
                const chimneyX = x + 1.42;
                const working = Math.abs(vel);

                /*
                 * Chuffs are fired by WHEEL PHASE, not by a timer.
                 *
                 * A steam locomotive exhausts four times per revolution of the
                 * driving wheels, which is why the beat slows as it brakes and
                 * quickens as it pulls away — for free, and exactly in step with
                 * the rods, because both read the same angle. A fixed interval
                 * gave a machine-gun rhythm that had nothing to do with what the
                 * wheels were doing.
                 */
                const beat = Math.floor(wheelPhase / (Math.PI / 2));
                const chuffing = working > 0.6 && t > T_SHUTTER && t < T_GONE - 0.6;
                /*
                 * Rate-capped, and the cap is not a fudge.
                 *
                 * Four beats a revolution is right, but at departure speed the
                 * drivers turn nineteen times a second — seventy-five exhausts,
                 * which is a roar rather than a beat and which burned the entire
                 * thirty-four puff pool in under half a second. The trail then
                 * consisted of whatever had been emitted in the last 0.45s: a
                 * tight ball travelling with the engine, and a platform the
                 * train left with no smoke hanging over it at all.
                 *
                 * Fourteen a second is where the beat stops being countable
                 * anyway, and it is what buys the pool enough life to lay a
                 * trail down the length of the station.
                 */
                if (chuffing && beat !== lastChuff && t - lastChuffAt > 0.07) {
                    lastChuff = beat;
                    lastChuffAt = t;
                    const force = clamp01(working / 12);
                    // Born carrying most of the engine's forward speed, then
                    // dragged to a stop by the air it is left in.
                    emit(exhaust, exRef, chimneyX, 2.02, 0, {
                        t, vx: vel * 0.55 - 0.35, vy: 1.6 + force * 1.9, vz: 0,
                        life: 2.6, grow: 3.4, size0: 0.5 + force * 0.35,
                    });
                    // Under power, a chuff throws embers.
                    if (t > T_DEPART && Math.random() < 0.7) {
                        emit(embers, emRef, chimneyX + (Math.random() - 0.5) * 0.15, 2.0, 0, {
                            t, vx: vel * 0.5 - 0.6 - Math.random() * 1.2, vy: 2.2 + Math.random() * 2.4,
                            vz: (Math.random() - 0.5) * 0.5, life: 1.5,
                        });
                    }
                } else if (!chuffing && t > T_SHUTTER && t < T_GONE - 0.6 && t - lastIdle > 0.62) {
                    // Standing, the engine still breathes. Slow, small, straight
                    // up — a locomotive at rest is not a locomotive switched off.
                    lastIdle = t;
                    emit(exhaust, exRef, chimneyX, 2.02, 0, {
                        t, vx: -0.12, vy: 0.62, vz: 0, life: 3.0, grow: 2.6, size0: 0.42, peak: 0.22,
                    });
                }

                /*
                 * Cylinder cocks. A locomotive drains its cylinders when it
                 * stops and again when it starts, and the result is two low
                 * white curtains at rail level — which happen to be the two
                 * beats in this timeline that most need punctuating.
                 */
                if (!settleFired && t >= T_SETTLE - 0.12) {
                    settleFired = true;
                    for (let k = 0; k < 10; k++) {
                        const side = k % 2 === 0 ? 1 : -1;
                        emit(steam, stRef, x + CYL_X + (hash(k) - 0.5) * 0.3, 0.36, side * 0.75, {
                            t: t + k * 0.02, vx: 0.5 + hash(k * 2.7) * 0.7, vy: 0.28 + hash(k * 5.5) * 0.2,
                            vz: side * (0.5 + hash(k * 3.1) * 0.5), life: 1.9, grow: 3.4, size0: 0.3, peak: 0.3,
                        });
                    }
                    // And the brakes, from under the cab.
                    for (let k = 0; k < 5; k++) {
                        emit(steam, stRef, x - 1.05, 0.3, (hash(k * 9.3) - 0.5) * 1.2, {
                            t, vx: -0.2, vy: 0.2, vz: (hash(k) - 0.5) * 0.7,
                            life: 1.6, grow: 3.0, size0: 0.26, peak: 0.22,
                        });
                    }
                }
                if (!departFired && t >= T_DEPART - 0.45) {
                    departFired = true;
                    // The whistle: thin, fast, and straight up. It is the cue
                    // that the train is going, and it lands before the wheels
                    // turn — which is the order it happens in.
                    for (let k = 0; k < 6; k++) {
                        emit(steam, stRef, x - 0.62, 1.78, 0.18, {
                            t: t + k * 0.03, vx: 0.1, vy: 3.0 + hash(k) * 1.2, vz: 0.05,
                            life: 1.3, grow: 2.2, size0: 0.15, peak: 0.34,
                        });
                    }
                    for (let k = 0; k < 8; k++) {
                        const side = k % 2 === 0 ? 1 : -1;
                        emit(steam, stRef, x + CYL_X, 0.36, side * 0.75, {
                            t: t + k * 0.03, vx: 0.9 + hash(k * 4.4) * 0.8, vy: 0.3,
                            vz: side * (0.6 + hash(k) * 0.5), life: 1.7, grow: 3.6, size0: 0.3, peak: 0.32,
                        });
                    }
                }

                for (const pool of [exhaust, steam]) {
                    for (const p of pool) {
                        if (!p.sprite.visible) continue;
                        const age = t - p.born;
                        if (age < 0) continue;
                        if (age > p.life) { p.sprite.visible = false; continue; }
                        const a = age / p.life;
                        p.sprite.position.x += p.vx * dt;
                        p.sprite.position.y += p.vy * dt;
                        p.sprite.position.z += p.vz * dt;
                        /*
                         * Drag, on the momentum the puff was BORN with, rather
                         * than the train's speed right now. Reading the live
                         * velocity made every puff ever emitted accelerate along
                         * with the departing locomotive — the trail chased the
                         * train off the end of the platform instead of being
                         * left hanging under the roof, which is the whole
                         * picture a station has after a train pulls out.
                         */
                        p.vx *= Math.max(0, 1 - 2.1 * dt);
                        p.vy *= 0.985;
                        const s = p.size0 + a * p.grow;
                        p.sprite.scale.set(s, s, 1);
                        p.sprite.material.rotation += dt * (p.seed - 0.5) * 0.9;
                        p.sprite.material.opacity = (1 - a) * (1 - a) * (p.peakOverride ?? p.peak) * lampLevel;
                    }
                }
                for (const p of embers) {
                    if (!p.sprite.visible) continue;
                    const age = t - p.born;
                    if (age > 1.5) { p.sprite.visible = false; continue; }
                    const a = age / 1.5;
                    p.sprite.position.x += p.vx * dt;
                    p.vx *= Math.max(0, 1 - 2.4 * dt);
                    p.sprite.position.y += p.vy * dt;
                    p.sprite.position.z += p.vz * dt;
                    p.vy -= 2.6 * dt;
                    // Embers twinkle as they tumble, and go out rather than fade.
                    const twinkle = 0.5 + 0.5 * Math.sin(t * 30 + p.seed * 12);
                    p.sprite.material.opacity = (1 - a) * twinkle * 0.9 * lampLevel;
                    const s = 0.09 * (1 - a * 0.5);
                    p.sprite.scale.set(s, s, 1);
                }
            }

            renderer.render(scene, camera);

            if (motionOff) return;
            if (t < T_LIFT_END) raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            for (const d of disposables) d.dispose();
            for (const m of Object.values(M)) m.dispose();
            renderer.dispose();
        };
    }, [crateCount]);

    return (
        <div ref={wrapRef} aria-hidden="true" style={{ position: 'absolute', inset: 0, ...style }}>
            <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
            {/*
              * The grade. Vignette and grain are DOM rather than a post pass for
              * the same reason bloom is a sprite: a full-screen shader here means
              * a render target and a second draw of the whole scene, and these
              * two are flat overlays that a browser composites for nothing.
              *
              * Both live in index.css, because a colour and a state belong in the
              * stylesheet — see §9's named rule.
              */}
            <div className="fib-arrival-grade" />
            <div className="fib-arrival-grain" />
        </div>
    );
}
