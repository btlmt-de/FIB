// ============================================
// CanvasSpinningStrip.jsx
// ============================================
// Drop-in replacement for EnhancedSpinningStrip using Canvas 2D
// Renders 80 items on a single canvas for massive performance gains

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ITEM_WIDTH, STRIP_HEIGHT, IMAGE_BASE_URL } from '../../../config/constants.js';
import { COLORS } from '../config/constants';
import { getItemImageUrl, getItemRarity, isInsaneItem, isSpecialItem, isExoticItem, isRareItem, isMythicItem, isEventItem, isRecursionItem } from '../../../utils/helpers.js';
import { sampleRamp } from '../../../utils/rarityHelpers.jsx';
import { getAtlasSprite, drawItemSprite, needsOwnImage } from './atlas.js';

// ============================================
// CONSTANTS
// ============================================

/**
 * The shaft's row pitch, and the sprite size that follows from it.
 *
 * This is the same number `MOBILE_ROW_PITCH` names in WheelSpinner, which drives
 * the spin animation's landing. They are two copies of one value and they have
 * already disagreed once this pass: the animation moved to 128 while this stayed
 * at the old square-tile 70, so the shaft drew five-and-a-half rows in the space
 * the spin thought held three, and the winner came to rest well off the platform
 * line. It is the identical failure the bonus board had (`ITEM_WIDTH = 160`
 * shadowing the shared 120) — a geometry constant living in two files.
 *
 * Exported so WheelSpinner imports it rather than restating it.
 */
export const MOBILE_ROW_PITCH = 128;

/**
 * The band's front lip, in pixels. Desktop only.
 *
 * The horizontal reel is a recess milled into the page, and a recess has a near
 * edge. Without one the band's vertical edges were crisp (the seams) while its
 * horizontal ones were hard cuts — into the status bar above, into empty page
 * below — and that mismatch was the loudest reason the surface still read as
 * unresolved. Sharpening the seams made it worse, not better: the more the band
 * looked machined across, the more obviously it stopped rather than ended.
 *
 * Columns stand on the *shelf* behind this lip rather than running under it, so
 * the tier's base bar and the band's own material stay two distinct things
 * instead of one muddy edge. That is what `floorInset` is for in `drawItem`.
 */
const LIP_H = 3;

/**
 * The shaft's sill, in pixels. Phone only.
 *
 * `LIP_H`'s counterpart: the horizontal band reserves its last few pixels for its
 * own front edge so a tier's base bar sits on the shelf behind it rather than
 * being sliced by it. In the vertical shaft every row has that relationship with
 * the row beneath it, so each row keeps the same reserve at its floor and the
 * tier's light stops just short of the cut. Two pixels rather than three: the row
 * pitch is smaller than the band's height and three would eat a visible slice of
 * a 128px row.
 */
const SILL_H = 2;

/**
 * Whether the viewer has asked for less motion.
 *
 * PRODUCT.md commits to respecting this "throughout, including wheel-spin and
 * celebration effects", and the canvas was the one place on the surface that
 * never did — `.fib-holo` has had a reduced-motion path in index.css since it was
 * written, so the DOM half of a tier honoured the preference while the canvas
 * half carried on breathing.
 *
 * What it switches off is *ambient* motion: the per-slot breath, the climbing
 * embers, the hue drift on the two animated ramps, and the centre line's pulse.
 * What it deliberately leaves alone is the reel travelling during a spin. That
 * travel is not decoration — it is the entire content of the spin, and freezing
 * it would replace the feature with a still image rather than calm it down. Same
 * reasoning as `.fib-holo`'s: the gradient stays, the drift stops.
 *
 * Read live rather than cached at module load, because the preference can be
 * toggled while the page is open and the render loop is already reading it every
 * frame.
 */
function prefersReducedMotion() {
    return typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// There used to be a local RARITY_COLORS table here — an independent copy of the
// rarity ladder that had drifted from the shared one. It is gone: drawItem reads
// tier colours from utils/rarityHelpers.jsx, and the canvas gets the animated
// tiers through sampleRamp since it cannot use the .fib-holo CSS class.
// COLORS.recursion is used directly where the recursion spin mode (not a rarity
// tier) needs it.

// ============================================
// IMAGE CACHE
// ============================================

const imageCache = new Map();
let barrierImage = null; // Shared fallback image

// Load the barrier/fallback image
function loadBarrierImage() {
    if (barrierImage) return Promise.resolve(barrierImage);
    if (typeof Image === 'undefined') return Promise.resolve(null);

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            barrierImage = img;
            resolve(img);
        };
        img.onerror = () => resolve(null);
        // Was an unrelated S3 bucket. barrier.png is vendored with the rest of the
        // pack, and a fallback that itself needs a third-party round trip is the
        // one image guaranteed to be wanted while the network is already failing.
        img.src = `${IMAGE_BASE_URL}/barrier.png`;
    });
}

function loadImage(src) {
    if (imageCache.has(src)) {
        return Promise.resolve(imageCache.get(src));
    }

    // SSR/non-browser guard - Image constructor not available
    if (typeof Image === 'undefined') {
        imageCache.set(src, null);
        return Promise.resolve(null);
    }

    return new Promise((resolve) => {
        const img = new Image();
        // Note: crossOrigin not needed since we only draw, never read pixels
        img.onload = () => {
            imageCache.set(src, img);
            resolve(img);
        };
        img.onerror = () => {
            // Load fallback barrier image instead of caching null
            loadBarrierImage().then(fallback => {
                imageCache.set(src, fallback);
                resolve(fallback);
            });
        };
        img.src = src;
    });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * A colour pushed toward white.
 *
 * Bright light desaturates toward its source — the hot centre of anything
 * luminous reads whiter than its falloff, and only the falloff carries the hue.
 * The reel was doing the opposite: painting its brightest areas in the most
 * saturated version of the tier colour, over the largest area, which is how
 * exotic, rare and legendary ended up as fields of flat magenta, red and gold
 * rather than as light. Those three suffer most because their hues are both dark
 * and heavily saturated (`#AA00AA`, `#FF5555`, `#FFD700`); the two animated tiers
 * were always partly spared because their ramps travel through lighter stops.
 *
 * This does not touch the ladder: the hue is unchanged and still the plugin's, it
 * is only the *lightness* of the hottest part that moves. Identity lives in the
 * falloff, which is most of what a player sees.
 */
function mixWhite(c, t) {
    return {
        r: Math.round(c.r + (255 - c.r) * t),
        g: Math.round(c.g + (255 - c.g) * t),
        b: Math.round(c.b + (255 - c.b) * t),
    };
}

function hexToRgb(hex) {
    if (!hex) return { r: 255, g: 170, b: 0 };
    const cleanHex = hex.replace('#', '');
    return {
        r: parseInt(cleanHex.substr(0, 2), 16) || 0,
        g: parseInt(cleanHex.substr(2, 2), 16) || 0,
        b: parseInt(cleanHex.substr(4, 2), 16) || 0
    };
}

// getItemRarityColor and isHighRarity used to live here. Both were dead — nothing
// in this file or any other called them — and both carried their own copy of the
// tier list, so they had to be updated alongside every ladder change while
// affecting nothing on screen. drawItem computes what it needs inline from the
// predicates directly.

// The rounded-rect path helper that used to sit here is gone with the boxed tiles
// it was written for — a column of light has no corners to round. The two canvases
// that still draw framed objects, CanvasCollectionGrid and CanvasResultItem, keep
// their own copies.

/**
 * A stable 0..1 number from a string.
 *
 * Used to offset each slot's pulse and ember timings. It has to key off the item
 * and not the slot's x position: x changes every frame while the strip travels,
 * so a position-seeded value would make the effects swim sideways across the
 * tile they belong to.
 */
function hashUnit(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 10000) / 10000;
}

// ============================================
// CANVAS ITEM RENDERER - Full Detail Version
// ============================================

/**
 * One reel slot, drawn as a column of light.
 *
 * This replaced a boxed tile: a rounded rect of `size * 0.70` with a 2px tier
 * border, sitting in the middle of the band. That design put the tier in a 1px
 * outline around a dark box, which meant the rarity — the only thing anyone is
 * actually watching for — was the least visible property of the tile, and at
 * speed the whole strip read as a row of identical grey squares.
 *
 * Now the slot IS the tier. A vertical wash of the rarity colour fills the full
 * height of the band, weakest at the top and strongest at the floor, over a
 * bright base bar. The item sprite floats in it. Rarity stays legible while the
 * strip is moving fast, which is the whole job.
 *
 * The two animated tiers keep their identity and gain from the change: insane
 * and mythic sample their ramps at three offsets down the column, so the hues
 * travel vertically as well as cycling. Every other tier is a flat hue, so a
 * moving column is unambiguously one of the top two — a distinction that used to
 * rest on a border you had to look at directly.
 *
 * The column is drawn into a band described by two numbers: `bandTop` is where it
 * starts and `bandHeight` how tall it runs. On desktop that band is the whole
 * canvas (0, full height) and every slot shares it, which is what makes the reel
 * read as one lit surface. On mobile the reel is vertical, so each slot gets its
 * own band at its own `y` — the light has to travel with the tile it belongs to.
 *
 * The two used to be one parameter, and the vertical case was wrong: `bandHeight`
 * was passed as the tile size but consumed as an absolute canvas coordinate, so
 * every mobile slot painted its wash, its base bar and its sprite into the top
 * `itemWidth` pixels of the canvas instead of at its own position. The whole
 * mobile reel drew as one overprinted stack. Splitting the origin out is what
 * fixes it; `y` is still the tile's top edge and is what mobile passes as
 * `bandTop`.
 */
function drawItem(ctx, item, x, y, size, isWinning, showRecursionEffects, images, time, isLuckySpin = false, goldRushBoostedRarity = null, isKotwLucky = false, bandHeight = 0, bandTop = 0, calm = false, floorInset = 0, seamAxis = 'x') {
    if (!item) return;

    const isInsane = isInsaneItem(item);
    const isSpecial = isSpecialItem(item);
    const isMythic = isMythicItem(item);
    const isExotic = isExoticItem(item);
    const isRare = isRareItem(item);
    const isEvent = isEventItem(item);
    const isRecursionType = isRecursionItem(item);

    const itemRarity = isRecursionType ? null : getItemRarity(item);
    const isGoldRushBoosted = goldRushBoostedRarity && itemRarity === goldRushBoostedRarity;

    // On a lucky spin commons take the spin's own colour rather than grey, so the
    // whole strip reads as "this one is different" before it even lands.
    const isLuckyCommon = isLuckySpin && !isInsane && !isMythic && !isSpecial && !isExotic && !isRare && !isEvent && !isRecursionType;
    const isSpecialType = isInsane || isMythic || isSpecial || isExotic || isRare || isEvent || isRecursionType || isLuckyCommon;

    const KOTW_CRIMSON = '#F43F5E';
    const KOTW_GOLD = '#F59E0B';

    // T is the band's top edge, B its bottom. F is the *floor the column stands
    // on*, which is not the same thing once the band has a lip: the desktop band
    // reserves its last few pixels for its own front edge, so the tier's base bar
    // sits on the shelf behind it rather than being sliced by it. Mobile passes
    // no inset and F collapses back to B. Everything vertical below is expressed
    // against one of the three, never against the canvas origin.
    const H = bandHeight || size;
    const T = bandTop;
    const B = T + H;
    const F = B - floorInset;
    // Frozen under reduced motion so the animated tiers keep their gradient and
    // stop travelling through it.
    const phase = calm ? 0 : (time % 3.2) / 3.2;

    // ── The column's colour ──────────────────────────────────────────────────
    // Three samples down the column. For the animated tiers those are three
    // points on the ramp, so the hue shifts vertically and drifts over time; for
    // everything else all three are the same flat colour and the column is a
    // single hue fading upward.
    let stops;
    if (isRecursionType) {
        const c = hexToRgb(COLORS.recursion);
        stops = [c, c, c];
    } else if (isInsane && !isGoldRushBoosted) {
        stops = [sampleRamp(COLORS.insaneHolo, phase),
                 sampleRamp(COLORS.insaneHolo, phase + 0.16),
                 sampleRamp(COLORS.insaneHolo, phase + 0.32)];
    } else if (isMythic) {
        stops = [sampleRamp(COLORS.mythicCycle, phase),
                 sampleRamp(COLORS.mythicCycle, phase + 0.16),
                 sampleRamp(COLORS.mythicCycle, phase + 0.32)];
    } else {
        let flat;
        if (isGoldRushBoosted) flat = '#FFD700';
        else if (isEvent) flat = COLORS.gold;
        else if (isSpecial) flat = COLORS.insane;           // legendary
        else if (isExotic) flat = COLORS.purple;
        else if (isRare) flat = COLORS.red;
        else if (isLuckyCommon) flat = isKotwLucky ? KOTW_CRIMSON : COLORS.green;
        else if (isKotwLucky) flat = KOTW_GOLD;
        else if (showRecursionEffects) flat = COLORS.recursion;
        else flat = '#6E7391';                              // common — a cool grey
        const c = hexToRgb(flat);
        stops = [c, c, c];
    }
    const rgb = (c, a) => `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`;

    ctx.save();

    // The winner used to breathe here — a vertical scale pulsing on `time`. It is
    // gone deliberately. The landing frame already has plenty happening (the
    // shockwave rings, the lit shaft, the result panel revealing underneath), and
    // a column that will not sit still is hard to actually look at, which is the
    // opposite of what the payoff frame is for.
    //
    // The verdict stands for the column — it holds still — and for the sprite,
    // whose scale pulse was tried in its turn and removed for the same reason in
    // different clothes: geometry that will not sit still reads mechanical (see
    // the pulse note in the sprite block). The winner stays alive through light
    // instead: `winnerLightPulse` breathes the pool and bloom without moving a
    // pixel. This note is the scar from when the whole column breathed, so the
    // distinction does not get re-litigated.
    //
    // The winner is still unmistakable without the column breathing: `lift` below
    // runs its wash and glow 35% hotter than any other slot, its base bar goes
    // fully opaque, and it gets full-height shaft walls plus a crown of light
    // that no other column draws. All of that is static.

    // Each column is inset so the slots do not touch — but only just.
    //
    // This inset used to be `max(2.5, size * 0.045)`, about 5.4px a side, and the
    // reasoning written here was sound at the time: columns drawn edge to edge
    // across their full slot width let the washes meet, and the band becomes one
    // continuous ribbon rather than a sequence of things you can count. A few
    // pixels of unlit space put the rhythm back.
    //
    // It put too much back. Eleven pixels of unlit band between every pair of
    // slots is not a gap, it is a channel, and a lit column either side of a dark
    // channel repeated fifteen times across the screen reads as corduroy — which
    // is precisely how it was described. Worse, the channel gives each common two
    // vertical edges it never earned, and the whole point of a column is that a
    // common has no edges.
    //
    // What changed since is that the seam exists. Separation is now the seam's
    // job, and a seam does it the way a machined surface does: one scored line,
    // not a trench. So the inset is cut to a hairline — enough that two adjacent
    // washes do not literally merge across the score, and no more.
    const gap = Math.max(1, size * 0.012);
    const colX = x + gap;
    const colW = size - gap * 2;

    // Whether this slot is a stacked row (the phone's shaft) rather than a column
    // in a side-by-side band. It changes where the light lives — see the wash
    // below — because stacking makes a floor-lit slot meet the next slot's dark
    // ceiling at every boundary.
    const rowMode = seamAxis === 'y';

    // ── The seam ─────────────────────────────────────────────────────────────
    //
    // A machined groove between slots: one dark line with a lit edge beside it,
    // the way two milled faces meet.
    //
    // This is deliberately not a return to the boxed tiles. A box is four edges
    // and a fill, and it reads as an object sitting on the band; a seam is one
    // edge shared between neighbours, and it reads as the band itself being cut.
    // The distinction matters because the reel had gone the other way and lost
    // something real: with nothing but soft columns, the surface had no craft in
    // it anywhere, because craft is legible at edges and there were none.
    //
    // Sits under everything else so tier light washes over it rather than being
    // divided by it.
    //
    // It runs bottom-up rather than full height, and that is the difference
    // between a seam and a frame. At a constant alpha over the whole band this
    // was two hard verticals per slot; put fifteen of those in a row next to a
    // base bar closing the bottom and every common has four edges again — the
    // exact boxed tile the columns replaced, and at a glance the band reads as
    // corduroy rather than as a surface.
    //
    // Fading it upward is also just what the light does. Everything on this
    // surface is lit from the floor, so a groove is visible where the light
    // reaches it and gone in the dark at the top.
    //
    // `seamAxis` picks which way the cut runs. `'x'` is the horizontal reel: the
    // seam is vertical, at the slot's left edge, fading upward out of the floor
    // light. `'y'` is the phone's vertical shaft, where slots are full-width rows
    // stacked downward — there the boundary between two rows *is* the lower row's
    // floor, so the cut is horizontal and sits exactly where the sill's light
    // already is. Same rule, turned ninety degrees: a groove is visible where the
    // light reaches it.
    //
    // The row seam fades toward the shaft's left and right edges rather than
    // running the full width, for the reason the base bar grew soft ends: a
    // constant full-width line repeating at the slot pitch is a ruled grid, and
    // at the shaft's pitch there would be five of them on screen at once.
    if (seamAxis === 'y') {
        const edge = size * 0.16;
        const rowSeam = (color, alpha) => {
            const g = ctx.createLinearGradient(x, 0, x + size, 0);
            g.addColorStop(0, `rgba(${color},0)`);
            g.addColorStop(edge / size, `rgba(${color},${alpha})`);
            g.addColorStop(1 - edge / size, `rgba(${color},${alpha})`);
            g.addColorStop(1, `rgba(${color},0)`);
            return g;
        };
        ctx.fillStyle = rowSeam('0,0,0', 0.34);
        ctx.fillRect(x, F - 0.5, size, 1);
        ctx.fillStyle = rowSeam('190,198,220', 0.10);
        ctx.fillRect(x, F + 0.5, size, 1);
    } else if (seamAxis === 'x') {
        const seamDark = ctx.createLinearGradient(0, T, 0, F);
        seamDark.addColorStop(0, 'rgba(0,0,0,0)');
        seamDark.addColorStop(0.55, 'rgba(0,0,0,0)');
        seamDark.addColorStop(1, 'rgba(0,0,0,0.34)');
        ctx.fillStyle = seamDark;
        ctx.fillRect(x - 0.5, T, 1, F - T);

        const seamLight = ctx.createLinearGradient(0, T, 0, F);
        seamLight.addColorStop(0, 'rgba(190,198,220,0)');
        seamLight.addColorStop(0.55, 'rgba(190,198,220,0)');
        seamLight.addColorStop(1, 'rgba(190,198,220,0.10)');
        ctx.fillStyle = seamLight;
        ctx.fillRect(x + 0.5, T, 1, F - T);
    }

    // Commons are quiet so the rare ones carry; the top tiers run close to
    // saturated at the floor. The winning column is lifted whatever its tier.
    //
    // The gap between the two ends widened once the commons stopped drawing
    // frames: an inert tile is genuinely inert now, so the band no longer has a
    // baseline of clutter for a rare column to shout over, and the same absolute
    // brightness reads louder. Rather than bank that as a quieter surface, it is
    // spent on separation — commons a step down, specials a step up.
    const weight = isInsane ? 1.1 : isMythic ? 1.02 : isSpecialType ? 0.96 : 0.34;
    const lift = isWinning ? 1.35 : 1;

    // How much of the treatment below a tier earns. Commons sit at 0 and stay
    // completely inert — that is the point of the ladder, and a strip where every
    // slot shimmers says nothing about any of them.
    //
    // The bottom of the ladder was raised more than the top, deliberately.
    //
    // `energy` multiplies almost everything, so rare at 0.48 was receiving barely
    // half of what the apparatus can give and reading closer to a common than to
    // a legendary — which is wrong, because the meaningful gap on this surface is
    // between "special" and "not", and every tier here is special. Nudging
    // individual alphas could not fix that; the multiplier was the thing holding
    // the lower tiers down.
    //
    // Ordering is untouched and the top is barely moved, so this compresses the
    // ladder upward rather than flattening it. Note rare crossing 0.6 now earns
    // embers, which is intended: it is the cheapest kind of presence there is,
    // three moving motes and no area at all.
    const energy = isInsane ? 1
        : isMythic ? 0.92
            : isSpecial ? 0.82            // legendary
                : isEvent || isRecursionType ? 0.78
                    : isExotic ? 0.71
                        : isRare ? 0.60
                            : isLuckyCommon || isGoldRushBoosted ? 0.5
                                : 0;

    // A slow breath on the glow. Offset per item so neighbouring rare slots are
    // not in lockstep, which would read as one wide pulsing block rather than
    // several separate valuable things.
    const seed = hashUnit(item.texture || item.item_name || item.name || String(item.id ?? 0));
    const breathe = calm ? 1 : 1 + Math.sin(time * 2.1 + seed * Math.PI * 2) * 0.16 * energy;

    // ── The spill ────────────────────────────────────────────────────────────
    //
    // A rare column throws light *past its own slot*, onto the band and onto its
    // neighbours. This is the one thing that was missing from the top of the
    // ladder, and it is missing from every version of this file before it,
    // because every element up to here has been clipped to `colX`/`colW` — so a
    // legendary was brighter *inside its box* and nothing outside the box knew it
    // was there. Brightness in isolation reads as a value; brightness that
    // affects its surroundings reads as a light source. Only the second one makes
    // a pull feel like an event.
    //
    // Additive, and that is not a stylistic choice: this passes over sprites and
    // washes that already exist, and a normal composite at any alpha would dull
    // them. `lighter` can only add, so a neighbouring common gets *lit by* the
    // rare next to it rather than tinted over.
    //
    // Honest caveat: slots are drawn left to right, so a spill lands on top of
    // the sprite to its left and underneath the sprite to its right. Both are the
    // faint tail of the falloff — the peak sits over the column's own slot — and
    // at these alphas the asymmetry does not read. Fixing it properly means a
    // separate spill pass over the whole strip before any sprite is drawn, which
    // is worth doing only if the effect is ever pushed hard enough to show.
    if (energy > 0.3) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        // Sized off the band's shorter axis, for the reason the floor flare
        // documents below: in the shaft `size` is the whole screen, so a
        // size-derived radius is several times the row's own height and the rect
        // clips the gradient while it is still bright — a hard edge instead of a
        // falloff.
        const spillR = Math.min(size, H) * (0.8 + 0.55 * energy);
        const spillX = x + size / 2;
        // Seated near the floor on the band, because that is where the column's
        // light is; at the row's centre in the shaft, where the light now lives.
        const spillY = rowMode ? (T + F) / 2 : F - H * 0.12;
        const spillG = ctx.createRadialGradient(spillX, spillY, 0, spillX, spillY, spillR);
        spillG.addColorStop(0, rgb(mixWhite(stops[2], 0.22), 0.13 * energy * breathe));
        spillG.addColorStop(0.4, rgb(stops[1], 0.055 * energy * breathe));
        spillG.addColorStop(1, rgb(stops[1], 0));
        ctx.fillStyle = spillG;
        // The whole point of the spill is that it leaves its own slot, so in the
        // shaft it is drawn to the gradient's full extent rather than clipped to
        // the row — clipping it vertically put a cut at both row edges, which is
        // the opposite of light falling on a neighbour.
        if (rowMode) {
            ctx.fillRect(spillX - spillR, spillY - spillR, spillR * 2, spillR * 2);
        } else {
            ctx.fillRect(spillX - spillR, T, spillR * 2, H);
        }
        ctx.restore();
    }

    // ── The wash ─────────────────────────────────────────────────────────────
    //
    // Laid down as four nested widths rather than one full-width rectangle.
    //
    // The single rect was what kept the resting reel reading as a row of boxes
    // however the vertical falloff was tuned: a canvas gradient runs along one
    // axis only, so the wash faded top to bottom and then stopped dead at the
    // slot's left and right edges. Two hard vertical lines per slot is a
    // rectangle, and no amount of softening the other axis argues otherwise —
    // the resting strip is almost all commons, so that was the state the reel
    // spent most of its life in.
    //
    // Nesting narrower fills builds the missing axis out of overdraw. One
    // gradient at a third strength, painted at 100/79/58/38 percent of the slot
    // width, accumulates to roughly full strength down the centre line and a
    // third of it at the edges — so the column is brightest along its spine and
    // has faded most of the way out by the time it reaches the gap. One gradient
    // object per slot, same as before; only the fillRect count changes, and
    // fillRect is the cheap half.
    //
    // The falloff is deliberately steep and the hot end is deliberately pale.
    //
    // It used to run 0.06 / 0.20 / 0.52 at 0.35 / 0.72 / 1.0, which put meaningful
    // saturated colour across most of the tile's height and, four nested passes
    // deep, close to half an alpha of raw tier hue at the spine. On the three
    // heavily saturated mid hues that is not a column of light, it is a slab of
    // magenta with an item on it — the exact complaint. Colour density is a
    // product of alpha *and* area, and this was spending both.
    //
    // The correction is in the *positions*, not the alphas, and getting that
    // backwards produced the opposite complaint. Pulling the peak down to 0.40
    // and mixing the floor end 30% toward white left the lower tiers dull and
    // washed out — because it desaturated the *falloff*, which is the wrong half
    // of the rule. Light desaturates at its **source**; here the source is the
    // base bar and its filament, sitting a few pixels below all of this, and the
    // wash is the falloff. The falloff is exactly where the hue is supposed to
    // live, and whitening it removes the tier from the largest thing carrying it.
    //
    // So: full saturation and roughly the original peak, over a much steeper
    // curve. Almost nothing above the halfway mark. Small area, high chroma —
    // which is the resolution of "too dense" and "too washed out" both, since
    // density is area × saturation and only one of those terms had to give.
    // Where the curve finally landed, after overshooting in both directions.
    //
    // 0.06 / 0.20 / 0.52 at 0.35 / 0.72 / 1.0 was the dense version: saturated
    // colour across most of the tile's height. Pulling it to 0.035 / 0.13 / 0.40
    // at 0.48 / 0.80 / 1.0 fixed that and broke the other end — squeezing the
    // light into the bottom fifth of the slot left the lower tiers with almost no
    // light in them *to* be bright, which is what "dull and washed out" was
    // describing. Adding alpha back at the floor could not fix that, because the
    // problem was that the lit region had nearly stopped existing.
    //
    // So: the light reaches up through the lower two thirds again, at full
    // saturation and a higher peak than it ever had — and the top third stays
    // clean, which is the part that was actually making it read as a slab.
    const glow = weight * lift * breathe;
    // ── The falloff is sampled from a curve, not cornered at four points ─────
    //
    // This ramp was four hand-placed stops — 0 / 0.05 / 0.22 / 0.58 at 0 / 0.32 /
    // 0.66 / 1.0 — and canvas interpolates *linearly* between stops. Linear
    // segments meeting at a point are continuous in value but not in slope, and
    // the eye reads a slope discontinuity as an edge: Mach banding. Three stops
    // meant three faint horizontal lines across every tile, at 32%, 66% and the
    // floor. That is the "clear cut" running top to bottom through the rarity
    // colour, and it has always been there — it is simply unmissable on the
    // phone's shaft, where a row is the full width of the screen.
    //
    // Two earlier attempts at this fixed things that were not it: the clamped
    // strip past the gradient's end (real, but a 2-3px artefact at the sill) and
    // the nested passes' horizontal steps (not real — that is the spine, and
    // removing it on the shaft flattened the column, which was a regression).
    // Both are reverted to their correct forms here.
    //
    // The curve is the one the four points were already describing: `peak × t^2.33`
    // passes through 0.041 / 0.22 / 0.58 at 0.32 / 0.66 / 1.0, i.e. within a
    // rounding of the documented values. So nothing about the tuning changes —
    // the same falloff is simply sampled densely enough that no segment boundary
    // is visible. Sixteen stops is well past the point where a 1px-per-segment
    // step could show on the tallest band this draws.
    //
    // Do not go back to a handful of stops. If the curve needs retuning, change
    // `WASH_PEAK` or `WASH_GAMMA`; the shape stays smooth by construction.
    // ── Floor-lit for a column, centre-lit for a row ─────────────────────────
    //
    // The curve above is `t^2.33`: nothing at the top, peak at the floor. That is
    // right for the horizontal band, where slots sit side by side and a column's
    // bright floor only ever meets the band's own lip.
    //
    // It is wrong the moment slots **stack**. In the phone's shaft each row's
    // wash peaks at its floor and the row beneath it starts at zero, so every
    // boundary puts full-strength tier colour directly against darkness — a hard
    // horizontal line, the same at every pitch and identical for every tier.
    // That is the "shiny red / clear cut / smoother red" edge, and no amount of
    // smoothing the ramp removes it, because the discontinuity is between two
    // rows rather than inside one. Both earlier attempts missed this by looking
    // for the fault inside a single tile.
    //
    // So a stacked row is lit from its **centre** instead: peak where the item
    // is, falling to nothing at both edges, which is also what a vertical reel
    // physically looks like — each tile glowing around its own contents rather
    // than standing on a floor it shares with nobody. Rows then meet dark against
    // dark and the boundary is the seam alone, which is what marks it.
    //
    // `1 - |2t - 1|` is the symmetric triangle; the gamma shapes its shoulders.
    // Peak is unchanged, so a tier is exactly as bright at its brightest.
    // ── The spine needs enough passes to stop being steps ────────────────────
    //
    // The horizontal falloff is built from overdraw — nested rects, narrower and
    // narrower — because a canvas gradient only runs along one axis. Four passes
    // is right for a 120px column: the steps land ~13px apart and read as a spine.
    //
    // At shaft width they are ~35px apart and read as **vertical stripes with
    // hard edges**, which is the cut. Collapsing them to a single full-width pass
    // removes the stripes and the spine together, leaving a flat slab of colour —
    // tried, and wrong in the other direction.
    //
    // So: same technique, sampled finely enough that no edge survives. Eighteen
    // passes across the same span puts a step every ~8px at 390 wide, below the
    // point where a ~3% alpha increment is visible against the band.
    //
    // The divisor follows from the pass count, not from taste. N passes of alpha
    // `a` in normal compositing accumulate to `1-(1-a)^N`; to land the same 0.58
    // peak from 18 passes instead of 4, `a` is the peak over ~12.3 rather than
    // over 3. Change the pass count and this must change with it.
    const WASH_PEAK = 0.58;
    const WASH_GAMMA = rowMode ? 1.7 : 2.33;
    const passes = rowMode ? 18 : 4;
    const spread = rowMode ? 12.3 : 3;
    const wash = ctx.createLinearGradient(0, T, 0, F);
    for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        const shape = rowMode
            ? Math.pow(1 - Math.abs(2 * t - 1), WASH_GAMMA)
            : Math.pow(t, WASH_GAMMA);
        // The hue also travels: the flat tiers repeat one colour, the two
        // animated ones sample their ramp at three points down the column, so
        // this walks stops[0] -> stops[1] -> stops[2] as it descends.
        const c = t < 0.5 ? stops[t < 0.25 ? 0 : 1] : stops[t < 0.85 ? 1 : 2];
        wash.addColorStop(t, rgb(c, WASH_PEAK * shape * glow / spread));
    }
    ctx.fillStyle = wash;
    //
    // The outermost pass stops short of the slot edge rather than filling it.
    // With the inset cut to a hairline the widest fill would otherwise run right
    // up to the seam and end there, which is a hard vertical edge — the one thing
    // the nesting exists to avoid. Ending at 88% means the wash has already faded
    // into the band by the time it reaches the score, so what divides two slots is
    // the seam and not the end of the light.
    //
    // The fill stops at the floor `F`, not at the band's bottom `B`. It used to
    // run the full `H`, which put it `floorInset` pixels past the end of its own
    // gradient — the clamped flat strip described above. The tier's light stands
    // on the shelf; the lip and the sill are the band's own material and are not
    // the tier's to paint.
    //
    // The nesting applies on both breakpoints. It was briefly collapsed to a
    // single full-width pass for the shaft, on the theory that its steps were the
    // visible cut — they are not, the gradient's stops were — and the result was
    // a row with no spine at all: a flat horizontal band of colour instead of a
    // column of light with a bright centre. The overdraw is what gives the tier
    // its shape across the axis a gradient cannot serve, and a wide row needs
    // that more than a narrow column does, not less.
    const spine = x + size / 2;
    for (let p = 0; p < passes; p++) {
        // The column keeps its four hand-picked widths; the row walks the same
        // span in `passes` even steps, so the falloff is continuous rather than
        // terraced.
        const frac = passes === 4
            ? [0.88, 0.7, 0.52, 0.34][p]
            : 0.94 - (0.94 - 0.26) * (p / (passes - 1));
        const w = colW * frac;
        ctx.fillRect(spine - w / 2, T, w, F - T);
    }

    // A matching wash hanging from the ceiling, much weaker.
    //
    // Scaled by `energy`, which is the change that stopped the resting reel
    // reading as a row of grey boxes. Lighting a slot from the top as well as the
    // floor closes the gradient at both ends, and a shape that is tinted along
    // every edge is a rectangle no matter what the falloff in between does — at
    // rest the strip is almost entirely commons, so that was the state the reel
    // spent most of its life in. A common now gets no crown at all and is pure
    // floor-up falloff, which is a column; only tiers that have earned energy get
    // the ceiling light back, and on those the extra enclosure reads as the slot
    // being full of light rather than as a box drawn around it.
    if (energy > 0) {
        // Kept well below its old 0.16 and shortened. With the wash now dying by
        // mid-tile the crown is the only saturated colour in the upper half, and
        // that half is where density hurts — so this is the one place the pass
        // deliberately does not give brightness back.
        const crown = ctx.createLinearGradient(0, T, 0, T + H * 0.34);
        crown.addColorStop(0, rgb(stops[0], 0.10 * glow * energy));
        crown.addColorStop(1, rgb(stops[0], 0));
        ctx.fillStyle = crown;
        ctx.fillRect(colX, T, colW, H * 0.34);
    }

    // A fan of light shafts used to be drawn here, rising from an origin below
    // the band through the middle of the tile — 3 beams for rare through exotic,
    // 5 for insane, iridescent on the animated tiers because each beam ran a
    // different part of the ramp. It is gone, and the reasoning it was built on
    // is worth keeping because the diagnosis was right and the fix was not.
    //
    // The diagnosis: everything the ladder builds up lives at the *bottom* of the
    // slot — bar, filament, flare, spill — so the middle of a rare tile, the part
    // with the item in it, has the least going on.
    //
    // The fix was wrong because it answered that by adding *more colour over more
    // area*, which is the one thing the mid tiers cannot afford. Even narrowed and
    // paled it was still a structure competing with the sprite in the only part of
    // the tile the sprite occupies. If the empty middle is worth solving again,
    // solve it with contrast or with the item, not by filling it.

    // ── The base bar ─────────────────────────────────────────────────────────
    // The floor of the column, and the one element that is fully saturated. This
    // is what actually registers when the strip is moving too fast for anything
    // else to.
    //
    // Two forms, on the same ladder as everything else. A tier that has earned
    // energy gets the bar with ends — a defined edge, the shape you can pick out
    // of a strip at speed. A common gets the same light with its ends fading
    // out, so it is a spill on the floor rather than the bottom edge of a box.
    //
    // That distinction is doing more work than it looks. A full-width bar under
    // every slot is a horizontal rule repeating at the slot pitch, and paired
    // with the seams on either side it draws a frame around a common that the
    // common was never supposed to have. The commons are ~90% of a resting
    // strip, so their frames were the pattern the whole band read as.
    //
    // **The bar is a column's floor, and a stacked row has no floor to speak of.**
    // In the shaft the bar would sit at the boundary with the row beneath — a
    // fully saturated line at every pitch, which is precisely the hard edge the
    // centre-lit wash above exists to remove, reinstated by the one element that
    // is opaque. So a row gets no bar; its light peaks at its own middle and the
    // seam alone marks where it ends. The winner keeps one, because the bar's
    // ends are what say *which slot* the detent is pointing at, and that argument
    // is about identification rather than about floors.
    if (rowMode && !isWinning) {
        // Skip the bar, the filament and the floor treatments below it.
    } else {
    const barH = isSpecialType ? 4 : 3;
    ctx.shadowColor = rgb(stops[2], 0.9);
    ctx.shadowBlur = (isInsane ? 22 : isSpecialType ? 16 : 7) * breathe;
    //
    // A winner always gets the form with ends, whatever its tier. This is not
    // about volume — the winner's `claim` deliberately keeps a common quiet so it
    // cannot out-shout a rare going past — it is about *which slot*. The reel
    // comes to rest up to half a pitch off centre, so on a near-edge landing the
    // indicator sits almost on the seam, and with two dim commons either side and
    // no defined edge anywhere there is nothing on the band saying which of them
    // the line is pointing at. The bar's ends do that in two pixels, at whatever
    // brightness the tier has earned. The result panel names the item; the reel
    // still has to agree with it.
    if (energy > 0 || isWinning) {
        ctx.fillStyle = rgb(stops[2], isWinning ? 1 : 0.92);
    } else {
        const spill = ctx.createLinearGradient(colX, 0, colX + colW, 0);
        spill.addColorStop(0, rgb(stops[2], 0));
        spill.addColorStop(0.5, rgb(stops[2], isWinning ? 1 : 0.86));
        spill.addColorStop(1, rgb(stops[2], 0));
        ctx.fillStyle = spill;
    }
    ctx.fillRect(colX, F - barH, colW, barH);
    ctx.shadowBlur = 0;

    // The filament. A real emitter blows out to white at its core while its
    // falloff keeps the hue, and the bar was previously saturated tier colour all
    // the way through — the brightest thing on the band was also the flattest.
    // Additive white on the bar's top pixel gives the top tiers a core that reads
    // as hot rather than merely coloured, and because it is additive it lifts the
    // hue toward white instead of replacing it with grey. Scaled hard by energy,
    // so only the tiers with real light in them get one.
    //
    // The threshold came down from 0.55 to 0.45 so rare gets one too. This is the
    // element that answers "dull" without costing any density at all: it is one
    // pixel. A tier reads as bright because something in it is *blown out*, not
    // because a large area is moderately lit, and rare was the tier with the most
    // wash and the least core — the exact recipe for looking washed out.
    if (energy >= 0.45) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255, 255, 255, ${0.42 * energy * breathe})`;
        ctx.fillRect(colX, F - barH, colW, 1);
        ctx.restore();
    }
    } // end of the column-only floor treatments

    // ── Everything below is what makes a rare slot feel rare ─────────────────
    //
    // Colour alone was not carrying it. The boxed design this replaced had a
    // pulsing, glowing border on special tiers, and losing that made the columns
    // correct but inert — you could see a slot was exotic, you did not feel it.
    // The wash gives a tier its identity; this gives it energy, and all of it is
    // scaled by `energy` so a common stays completely still and only the top of
    // the ladder gets the full treatment.

    // Shaft walls. Two vertical edges turn a soft wash into a beam with a defined
    // form. Brightest at the floor, gone by the halfway mark, so they read as the
    // column's own light rather than as a border drawn around a box — which is
    // exactly the thing this design set out to get rid of.
    //
    // How far up the walls reach is itself a rung on the ladder. They used to
    // start at a fixed 35% for every tier that had them, so a rare and an insane
    // drew a shaft of exactly the same height and differed only in alpha —
    // height is the cheaper thing to read at speed, and it was being spent on
    // nothing. A rare's shaft now stops around the middle of the band and an
    // insane's runs nearly to the ceiling.
    if (energy > 0.35) {
        const wallTop = T + H * (0.52 - 0.30 * energy);
        const wall = ctx.createLinearGradient(0, F, 0, wallTop);
        // Same floor as the flare, and for the same reason: walls are 2px wide,
        // so brightness here buys presence without buying area.
        wall.addColorStop(0, rgb(stops[2], (0.2 + 0.5 * energy) * breathe));
        wall.addColorStop(1, rgb(stops[1], 0));
        ctx.fillStyle = wall;
        const wallW = 1.5 + energy * 0.8;
        ctx.fillRect(colX, wallTop, wallW, F - wallTop);
        ctx.fillRect(colX + colW - wallW, wallTop, wallW, F - wallTop);
    }

    // Floor flare. A hot spot where the column meets the base bar, so the light
    // looks like it is being emitted from the floor rather than painted on it.
    //
    // ── THE HORIZONTAL LINE, AND WHERE IT ACTUALLY CAME FROM ─────────────────
    //
    // Its radius was `size * 0.75` and its rect started at 40% of the band's
    // height. On the horizontal reel those agree: a 120px column gives a 90px
    // radius, the rect's top edge sits 102px above the floor of a 170px band, and
    // the gradient has already fallen to nothing by the time the rect clips it.
    // Nobody ever saw an edge because there was nothing left to cut.
    //
    // In the phone's shaft `size` is the **whole screen** — 390 — so the radius
    // came out at 292px against a row only 128px tall. The glow was still near
    // full strength when the rect cut it dead at 40% of the row, which is a hard
    // horizontal line across every tile that has any colour in it, at the same
    // height every time. That is the "glowing green / clear line / less glowy
    // green" edge, and it is why it appeared on all tiers at once and got worse
    // the more saturated the tier was.
    //
    // Two corrections, both from the row's own geometry rather than the band's:
    // the radius is sized off the band's **shorter axis** (the same rule the
    // sprite already uses), and the rect covers the whole row so the gradient is
    // never clipped before it has faded. A stacked row is also lit from its
    // centre rather than its floor — see the wash — so the flare's origin moves
    // with it; a hot spot at the boundary would just be the old bright-against-
    // dark seam by another name.
    if (energy > 0.3) {
        const flareR = Math.min(size, H) * 0.75;
        const flareY = rowMode ? (T + F) / 2 : F;
        const flare = ctx.createRadialGradient(
            x + size / 2, flareY, 0,
            x + size / 2, flareY, flareR,
        );
        // The energy term has a floor under it. Straight `0.5 * energy` gave rare
        // less than a quarter alpha and left the bottom of the ladder starved of
        // the one element that costs nothing in density, being pinned to the
        // floor. Lower tiers gain proportionally more here than the top does.
        flare.addColorStop(0, rgb(stops[2], (0.22 + 0.42 * energy) * breathe));
        flare.addColorStop(1, rgb(stops[2], 0));
        ctx.fillStyle = flare;
        const flareTop = rowMode ? T : T + H * 0.4;
        ctx.fillRect(colX, flareTop, colW, F - flareTop);
    }

    // Embers. A few motes climbing the shaft, fading as they rise.
    //
    // Seeded off the item rather than off `x`, which matters: `x` changes every
    // frame as the strip travels, so a position-seeded mote would swim sideways
    // across the tile it belongs to. Seeded off the item, each slot's embers stay
    // that slot's for the whole spin.
    if (energy >= 0.6) {
        const count = isInsane ? 5 : isMythic ? 4 : 3;
        for (let i = 0; i < count; i++) {
            const s = (seed + i * 0.37) % 1;
            // Different speeds per mote so they never form a rising rank. Under
            // reduced motion each mote holds at its own height instead: the shaft
            // still has motes in it, they just stop climbing.
            const climb = calm ? (0.2 + s * 0.55) : (time * (0.16 + s * 0.12) + s) % 1;
            const my = F - climb * H * 0.85;
            const mx = x + size * (0.18 + s * 0.64);
            // Fade in off the floor, out at the top; nothing pops into existence.
            const fade = Math.sin(climb * Math.PI);
            const r = (isInsane ? 1.9 : 1.5) * (0.6 + s * 0.7);
            ctx.beginPath();
            ctx.arc(mx, my, r, 0, Math.PI * 2);
            ctx.fillStyle = rgb(stops[1], 0.75 * fade * energy);
            ctx.fill();
        }
    }

    // The winner gets the whole shaft lit: full-height walls at full strength and
    // a crown of light at the top. This is the payoff frame, so it is the one
    // place the restraint above is dropped.
    //
    // Scaled by the tier, which it did not used to be. At full strength for every
    // tier a *common* winner drew two full-height walls and a ceiling flare — the
    // complete apparatus, in grey — and once the commons went properly inert that
    // made the loudest object on the band a common, out-shouting any rare going
    // past it. The reel does not have to carry the whole announcement: the result
    // panel underneath already names what was won, so the column only has to mark
    // which slot it was. A common winner is now clearly marked and no more; an
    // insane winner still gets everything.
    if (isWinning) {
        const claim = 0.42 + 0.58 * energy;
        const rim = ctx.createLinearGradient(0, F, 0, T);
        rim.addColorStop(0, rgb(stops[2], 0.95 * claim));
        rim.addColorStop(0.55, rgb(stops[1], 0.5 * claim));
        rim.addColorStop(1, rgb(stops[0], 0.12 * claim));
        ctx.fillStyle = rim;
        ctx.fillRect(colX, T, 2, F - T);
        ctx.fillRect(colX + colW - 2, T, 2, F - T);

        const crownFlare = ctx.createLinearGradient(0, T, 0, T + H * 0.3);
        crownFlare.addColorStop(0, rgb(stops[0], 0.4 * claim * breathe));
        crownFlare.addColorStop(1, rgb(stops[0], 0));
        ctx.fillStyle = crownFlare;
        ctx.fillRect(colX, T, colW, H * 0.3);
    }

    // ── The sprite ───────────────────────────────────────────────────────────
    const imgSrc = getItemImageUrl(item);
    const img = images.get(imgSrc);
    // The atlas covers the item pool, which is almost every cell in the strip.
    // `img` only has to exist for the stragglers it does not pack — player heads,
    // event and recursion art, the custom items.
    const atlasSprite = getAtlasSprite(item);

    if (img || atlasSprite) {
        let imgScale = 0.62;
        if (item.username) imgScale = 0.52;          // player heads read small
        else if (isEvent) imgScale = 0.7;
        else if (isRecursionType) imgScale = 0.66;
        else if (isSpecialType) imgScale = 0.66;

        // The winner's sprite grows out of its seat. Everything else about the
        // slot already inflates on the winning frame — the wash lifts 35%, the
        // shaft runs full height, the crown lights — but the art stayed the same
        // size as every other slot, so the payoff read as "this column got lit"
        // rather than "this item came up". 6% is the smallest zoom that shows at
        // a glance, and the extra lift is the same optical correction the
        // standing seat applies, restated for the larger size: the base bar pulls
        // the eye down, so a sprite re-centred after a scale-up would still sit
        // low. The pool is computed from imgY/imgSize and tracks both.
        //
        // The sprite itself holds still from here; it was tried breathing — a
        // sine on its scale, 1.06 × 1±0.05 — and read as a balloon being
        // inflated, because it broke the surface's one physics rule: geometry
        // holds still, light breathes (the column's own breathing was removed
        // for the same reason, see the note above). The prize stays alive
        // instead through `winnerLightPulse` below: the pool of light under it
        // and its bloom swell and ease without a pixel of the art moving.
        const winnerZoom = isWinning ? 1.06 : 1;
        const winnerLift = isWinning ? H * 0.02 : 0;

        // Sized from the band's *shorter* axis, not from `size`.
        //
        // A no-op everywhere it already ran — the horizontal reel is 120 wide in a
        // 170 band and the old square mobile tile had both equal — but it is what
        // lets a slot be wide and short. The phone's shaft draws full-width rows,
        // where `size` is the whole screen and `H` is the row's pitch; sizing the
        // sprite off `size` there would draw a 270px item into a 128px row.
        const spriteBase = Math.min(size, H);
        const imgSize = spriteBase * imgScale * winnerZoom;
        const imgX = x + (size - imgSize) / 2;
        // Seated slightly above centre. The base bar and its glow pull the eye
        // down, so a geometrically centred sprite optically reads as low.
        const imgY = T + (F - T - imgSize) / 2 - H * 0.04 - winnerLift;

        // A pool of the tier's light under the item, so it sits in the column
        // rather than floating in front of it. The winner's share swells and
        // eases on a slow beat — light, not geometry (see the pulse note above).
        // Frozen dead centre under reduced motion like every other ambient beat.
        const winnerLightPulse = isWinning && !calm ? 1 + Math.sin(time * 1.6) * 0.18 : 1;
        const pool = ctx.createRadialGradient(
            x + size / 2, imgY + imgSize * 0.9, 0,
            x + size / 2, imgY + imgSize * 0.9, imgSize * 0.85,
        );
        pool.addColorStop(0, rgb(stops[1], 0.32 * glow * winnerLightPulse));
        pool.addColorStop(1, rgb(stops[1], 0));
        ctx.fillStyle = pool;
        ctx.fillRect(colX, imgY - imgSize * 0.2, colW, imgSize * 1.9);

        // A second lit disc centred behind the sprite was added here alongside the
        // light shafts and removed with them. It went for the same reason: another
        // broad field of tier colour, in the middle of the tile, stacked on the
        // wash. The pool above already grounds the item, and it is seated low
        // enough to read as contact rather than as a tint over the art.

        // Smoothing is unconditional, and used not to be: it was switched on for
        // the tiers with colour and glow and off for everything else, which put
        // the worst rendering on ~90% of what is ever on screen.
        //
        // Nearest neighbour is the right call when a pixel-art sprite is being
        // *upscaled* — it keeps the pixel grid crisp — and this reel does the
        // opposite. The atlas tile is 96px (`public/fib-atlas.json`, `tile: 96`)
        // and lands at roughly 74px, so every sprite here is a downscale.
        // Nearest neighbour downscaling drops source pixels instead of averaging
        // them, and on a travelling strip the dropped pixels change frame to
        // frame, so a common visibly crawls and shimmers on its way past. There
        // is no design decision on the other side of this one.
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (isSpecialType || isGoldRushBoosted) {
            // shadowColor takes a colour and never a gradient, so the animated
            // tiers bloom in whatever hue they are currently passing through.
            ctx.shadowColor = rgb(stops[1], 1);
            // The winner's bloom swells with the same beat as the pool. Won by a
            // common (no bloom path) the pool alone carries the pulse; tiered
            // winners get both layers moving together.
            ctx.shadowBlur = (isInsane ? 16 : isMythic ? 13 : 9) * (isWinning ? winnerLightPulse : 1);
        }

        drawItemSprite(ctx, item, img, imgX, imgY, imgSize);

        ctx.shadowBlur = 0;
        ctx.imageSmoothingEnabled = true;
    }

    ctx.restore();
}

/**
 * One machined mark on the band's edge, pointing into the aperture.
 *
 * `edgeY` is the edge it is seated in and `dir` which way the band lies from
 * there: `1` for the top hairline, `-1` for the floor lip. The mark is a seat
 * flush with that edge and a blade running inward and fading out, so it reads as
 * something cut into the band's own material rather than an arrow parked on top
 * of it — which is what the triangles it replaces were.
 *
 * `alpha` carries the detent flash. It scales the whole mark, glow included,
 * because a tick that only brightened its core would look like it was lighting
 * up rather than being struck.
 *
 * `axis` picks which edge pair it is seated in. `'x'` is the horizontal band —
 * `cx` is the position along the band and `edge` is the top hairline or the floor
 * lip. `'y'` is the phone's shaft, where the marks sit in the left and right
 * rails instead; the geometry is identical under a transpose, so rather than
 * write it twice the canvas is rotated about the mark's own seat and the same
 * path is stroked. One shape, one set of values, two orientations.
 */
function drawDetentTick(ctx, cx, edgeY, dir, c, alpha, axis = 'x') {
    const A = (a) => `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.min(1, a)})`;
    const BLADE = 11;
    const a = Math.min(1, alpha);

    ctx.save();

    // Transpose for the shaft: swap the axes about the origin so every
    // coordinate below reads as (along-the-edge, into-the-band) either way.
    if (axis === 'y') {
        ctx.transform(0, 1, 1, 0, 0, 0);
    }

    // A hard-edged wedge, not a fading bar. The first version of this was a 2px
    // rect with its alpha ramped out along its length, and at any magnification
    // it read as a small flame — a mark with no silhouette is a glow. A shape
    // that narrows to a point has a silhouette even when its far end has gone,
    // which is what makes it read as cut rather than lit.
    ctx.beginPath();
    ctx.moveTo(cx - 3.5, edgeY);
    ctx.lineTo(cx + 3.5, edgeY);
    ctx.lineTo(cx + 0.5, edgeY + dir * BLADE);
    ctx.lineTo(cx - 0.5, edgeY + dir * BLADE);
    ctx.closePath();
    const wedge = ctx.createLinearGradient(0, edgeY, 0, edgeY + dir * BLADE);
    wedge.addColorStop(0, A(0.92 * a));
    wedge.addColorStop(0.6, A(0.5 * a));
    wedge.addColorStop(1, A(0.16 * a));
    ctx.fillStyle = wedge;
    ctx.fill();

    // The seat is where light collects: the wedge's base, flush with the band's
    // own edge, and the only part that glows.
    ctx.shadowColor = A(0.9 * a);
    ctx.shadowBlur = 6 * a;
    ctx.fillStyle = A(a);
    ctx.fillRect(cx - 4, dir > 0 ? edgeY : edgeY - 1.5, 8, 1.5);

    ctx.restore();
}

// ============================================
// MOTION BLUR RENDERER
// ============================================

function drawMotionBlur(ctx, width, height, isVertical, color, intensity) {
    if (intensity < 0.1) return;

    const rgb = hexToRgb(color);
    const blurAlpha = Math.floor(intensity * 40);

    ctx.save();

    if (isVertical) {
        // Top and bottom blur
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${blurAlpha / 255})`);
        gradient.addColorStop(0.3, 'transparent');
        gradient.addColorStop(0.7, 'transparent');
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${blurAlpha / 255})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    } else {
        // Left and right blur
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${blurAlpha / 255})`);
        gradient.addColorStop(0.3, 'transparent');
        gradient.addColorStop(0.7, 'transparent');
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${blurAlpha / 255})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
}

// ============================================
// SCANLINES FOR RECURSION
// ============================================

function drawScanlines(ctx, width, height, time) {
    ctx.save();

    const flickerAlpha = 0.03 + Math.sin(time * 50) * 0.02;
    ctx.fillStyle = `rgba(0, 255, 0, ${flickerAlpha})`;

    for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y + 2, width, 2);
    }

    ctx.restore();
}

// ============================================
// MAIN CANVAS STRIP COMPONENT
// ============================================

export function CanvasSpinningStrip({
                                        items = [],
                                        offsetRef = null, // Ref object for offset (avoids re-renders during animation)
                                        offset: offsetProp = 0, // Fallback value when not using ref
                                        isMobile = false,
                                        isSpinning = false,
                                        isResult = false,
                                        spinProgress = 0,
                                        isRecursion = false,
                                        stripWidth,
                                        stripHeight,
                                        finalIndex = 72,
                                        onClick,
                                        accentColor = null, // Optional override for accent color (e.g., gold for KOTW Lucky Spin)
                                        themeType = null, // 'recursion' or 'kotw' - determines background colors
                                        itemWidthOverride = null, // Optional override for item width (e.g., 90 for Triple Lucky desktop)
                                        isLuckySpin = false, // For Lucky Spin / Triple Lucky - common items use green
                                        goldRushBoostedRarity = null, // Rarity being boosted during Gold Rush event
                                        // Draw the strip as a cylinder rather than a finite array. Only for
                                        // the dormant idle reel — see the loop branch in the render below.
                                        loop = false,
                                        // One of several tracks abutting inside one band (the 3x/5x
                                        // takeovers). The reel's edge treatments all assume the canvas IS
                                        // the band and belong to the band, not to a track in it: the left
                                        // and right vignettes, and the 10%/90% fade on the top hairline
                                        // and floor lip. Drawn once per lane they multiply — five lanes
                                        // meant ten black walls and five broken hairlines, which is both
                                        // the corduroy failure at lane scale and most of why a 200px lane
                                        // read as a peephole rather than as a length of track. In lane
                                        // mode the outer vignette is drawn once by SpinLanes at the row's
                                        // edges, and the band's own edges run at constant alpha so the
                                        // hairline and the lip cross every track as one continuous line.
                                        laneMode = false,
                                    }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const animationRef = useRef(null);
    const imagesRef = useRef(new Map());
    const timeRef = useRef(0);
    // The two timestamps the band's weight is built from. Both are written by the
    // render loop and read by it on the next frame, which is why they are refs
    // and not state: a landing flash that re-rendered React would be a landing
    // flash that stuttered.
    const resultAtRef = useRef(-1);       // when isResult last went true
    const lastCentreIndexRef = useRef(null);
    const tickAtRef = useRef(-1);         // when the centre slot last changed
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const [containerWidth, setContainerWidth] = useState(stripWidth || (isMobile ? 390 : 1600));
    // The shaft's height is whatever the stage row can spare, so it is measured
    // rather than declared. The horizontal band keeps a fixed STRIP_HEIGHT — its
    // height is a design constant, not a leftover — so this only ever moves on a
    // phone.
    const [containerHeight, setContainerHeight] = useState(stripHeight || 620);

    // Refs for props that change during animation (so render loop always has current values)
    // Note: offset is read from offsetRef if provided, otherwise from offsetProp
    const propsRef = useRef({ isSpinning, isResult, spinProgress, isRecursion, finalIndex, accentColor, themeType, isLuckySpin, goldRushBoostedRarity, loop });
    propsRef.current = { isSpinning, isResult, spinProgress, isRecursion, finalIndex, accentColor, themeType, isLuckySpin, goldRushBoostedRarity, loop };

    // Helper to get current offset - reads from ref if provided, otherwise uses prop value
    const getOffset = () => offsetRef ? offsetRef.current : offsetProp;

    const itemWidth = itemWidthOverride || (isMobile ? MOBILE_ROW_PITCH : ITEM_WIDTH);
    const width = stripWidth || containerWidth;
    const height = stripHeight || (isMobile ? containerHeight : STRIP_HEIGHT);

    // Measure container width on mount and resize
    useEffect(() => {
        // Always measure. Mobile used to skip this and take a fixed 140×260 box;
        // the shaft fills the viewport and the stage row, so both of its axes are
        // only knowable from the box. A caller that still wants a fixed size
        // passes `stripWidth` / `stripHeight` and the measurement is ignored.
        if (!containerRef.current) return;

        const updateWidth = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                if (rect && rect.width > 0) {
                    setContainerWidth(rect.width);
                }
                if (rect && rect.height > 0) {
                    setContainerHeight(rect.height);
                }
            }
        };

        // Use ResizeObserver if available, fall back to window resize
        let resizeObserver = null;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(updateWidth);
            resizeObserver.observe(containerRef.current);
        } else {
            // Fallback for older browsers
            window.addEventListener('resize', updateWidth);
        }

        updateWidth();

        return () => {
            if (resizeObserver) {
                resizeObserver.disconnect();
            } else {
                window.removeEventListener('resize', updateWidth);
            }
        };
    }, [isMobile, laneMode]);

    // Pre-load all item images - use cache immediately, load missing incrementally
    useEffect(() => {
        if (items.length === 0) return;

        let cancelled = false;

        // Immediately populate from cache for instant display
        items.forEach(item => {
            const src = getItemImageUrl(item);
            const cached = imageCache.get(src);
            if (cached) {
                imagesRef.current.set(src, cached);
            }
        });

        const loadAllImages = async () => {
            const imagePromises = items.map(item => {
                const src = getItemImageUrl(item);
                // Skip if already in our map (from cache above)
                if (imagesRef.current.has(src)) {
                    return Promise.resolve();
                }
                return loadImage(src).then(img => {
                    // Add incrementally as each image loads
                    if (!cancelled && img) {
                        imagesRef.current.set(src, img);
                    }
                });
            });

            await Promise.all(imagePromises);

            if (!cancelled) {
                setImagesLoaded(true);
            }
        };

        loadAllImages();

        return () => {
            cancelled = true;
        };
    }, [items]);

    // Main render loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.warn('CanvasSpinningStrip: Could not get 2d context');
            return;
        }

        const dpr = window.devicePixelRatio || 1;
        let lastTimestamp = performance.now();
        let frameCount = 0;

        // Set canvas size with DPR
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        const render = (timestamp) => {
            // Mobile throttling: 30fps when idle, 60fps when spinning
            const { isSpinning: isCurrentlySpinning } = propsRef.current;
            frameCount++;
            if (isMobile && !isCurrentlySpinning && frameCount % 2 !== 0) {
                // Skip every other frame on mobile when not spinning
                animationRef.current = requestAnimationFrame(render);
                return;
            }

            // Use actual delta time for frame-rate independence
            const dt = (timestamp - lastTimestamp) / 1000;
            lastTimestamp = timestamp;
            timeRef.current += dt;
            const time = timeRef.current;

            // Get current prop values from ref (so animation has latest values)
            // Note: offset comes from offsetRef or offsetProp, not propsRef
            const { isSpinning, isResult, spinProgress, isRecursion, finalIndex, accentColor: accentOverride, themeType, isLuckySpin, goldRushBoostedRarity, loop } = propsRef.current;

            const offset = getOffset();
            const motionIntensity = isSpinning ? Math.max(0, 1 - spinProgress * 1.5) : 0;

            // Ambient motion off, reel travel on. See prefersReducedMotion above.
            const calm = prefersReducedMotion();

            // ── Landing ──────────────────────────────────────────────────────
            //
            // The result used to simply *be* brighter: `lift` steps the winning
            // column up 35% and that was the entire event. A step change is
            // something you notice afterwards rather than something you feel
            // happen, which is why the payoff read as flat however hot the
            // column got. `bloom` decays from 1 over ~450ms the moment isResult
            // goes true, so the winner arrives with a hit and then settles into
            // the lifted state that was already there.
            if (isResult) {
                if (resultAtRef.current < 0) resultAtRef.current = time;
            } else {
                resultAtRef.current = -1;
            }
            const bloom = (calm || resultAtRef.current < 0)
                ? 0
                : Math.exp(-(time - resultAtRef.current) / 0.45);

            // ── The detent ───────────────────────────────────────────────────
            //
            // Which slot is currently under the indicator. Every time that
            // changes the indicator flashes, so a deceleration is a run of ticks
            // whose spacing stretches — and stretching gaps are the thing that
            // makes a slowdown something you feel rather than watch. Purely
            // visual; nothing else on the surface changes and no audio is
            // involved.
            const centreIndex = Math.round(offset / itemWidth);
            if (lastCentreIndexRef.current !== centreIndex) {
                if (lastCentreIndexRef.current !== null) tickAtRef.current = time;
                lastCentreIndexRef.current = centreIndex;
            }
            // Short and sharp: a detent is a click, not a glow.
            const tick = (calm || tickAtRef.current < 0)
                ? 0
                : Math.exp(-(time - tickAtRef.current) / 0.085);

            // Determine theme colors based on themeType or isRecursion
            const isKotwTheme = themeType === 'kotw';
            const isRecursionTheme = isRecursion || themeType === 'recursion';

            // KOTW: Slate background (#1E293B), Crimson/Gold accents
            // Recursion: Dark green background, Matrix green accents
            const KOTW_SLATE = '#1E293B';
            const KOTW_SLATE_DARK = '#0F172A';

            const accentColor = accentOverride || (isRecursionTheme ? COLORS.recursion : COLORS.gold);
            const bgColor = isKotwTheme ? KOTW_SLATE_DARK : (isRecursionTheme ? COLORS.recursionDark : COLORS.bg);

            // Pre-compute hexToRgb once per frame instead of per-item
            const accentRgb = hexToRgb(accentColor);

            // Clear
            ctx.clearRect(0, 0, width, height);

            // Background
            if (isRecursionTheme || isKotwTheme) {
                // Themed background
                const bgGradient = ctx.createLinearGradient(
                    isMobile ? 0 : 0,
                    isMobile ? 0 : 0,
                    isMobile ? 0 : width,
                    isMobile ? height : 0
                );
                if (isKotwTheme) {
                    // KOTW: Slate gradient
                    bgGradient.addColorStop(0, KOTW_SLATE_DARK);
                    bgGradient.addColorStop(0.5, KOTW_SLATE);
                    bgGradient.addColorStop(1, KOTW_SLATE_DARK);
                } else {
                    // Recursion: Green gradient
                    bgGradient.addColorStop(0, bgColor);
                    bgGradient.addColorStop(0.5, '#0a1a0a');
                    bgGradient.addColorStop(1, bgColor);
                }
                ctx.fillStyle = bgGradient;
            } else {
                const bgGradient = ctx.createLinearGradient(
                    isMobile ? 0 : 0,
                    isMobile ? 0 : 0,
                    isMobile ? 0 : width,
                    isMobile ? height : 0
                );
                bgGradient.addColorStop(0, COLORS.bg);
                bgGradient.addColorStop(0.5, `${COLORS.bgLight}33`);
                bgGradient.addColorStop(1, COLORS.bg);
                ctx.fillStyle = bgGradient;
            }
            ctx.fillRect(0, 0, width, height);

            // Recursion scanlines (only for matrix theme, not KOTW)
            if (isRecursionTheme && !isKotwTheme) {
                drawScanlines(ctx, width, height, time);
            }

            // Draw items
            ctx.save();

            if (isMobile) {
                // ── THE SHAFT — the phone's dialect of THE NOCTURNE ──────────
                //
                // Portrait gets the city's *elevator*, not its viaduct. Slots are
                // full-width rows stacked downward, each one a lit sill: the
                // tier's wash rises out of the row's own floor, the base bar sits
                // on it, and the row below begins at that same line — so the sill
                // is the seam, exactly the way the desktop band's lip and its
                // per-slot seam are one material seen along two edges.
                //
                // What this replaced was a rotation rather than a dialect: a
                // ~180px column of square tiles floating in the middle of a black
                // box, with a 1px accent rule ruled across the full width at every
                // pitch — a horizontal grid, i.e. the corduroy failure the
                // horizontal band spent three passes escaping. The sprite landed
                // at 49px on the screen where recognition is hardest.
                //
                // Now the row is the screen's width and the sprite is sized off
                // the row's pitch, which is the shorter axis — about 90px on a
                // 390px phone, near double. Everything else is the ratified
                // apparatus: `drawItem` draws the identical column of light into a
                // band that happens to be wide and short, so the energy ladder,
                // the filament, the spill, the winner's claim and the Inert-Common
                // Rule all hold without a second implementation to keep in step.
                const rowPitch = itemWidth;
                const stripCenterY = height / 2 - rowPitch / 2;
                const drawRow = (item, idx, itemY, isWinning) => {
                    drawItem(
                        ctx, item,
                        0, itemY, width,
                        isWinning,
                        isRecursionTheme && !isKotwTheme,
                        imagesRef.current, time, isLuckySpin, goldRushBoostedRarity, isKotwTheme,
                        rowPitch, itemY, calm,
                        SILL_H,
                        'y',
                    );
                };

                if (loop) {
                    // The dormant shaft is a cylinder, the same fix the horizontal
                    // reel got one axis over: walk the rows that are on screen and
                    // wrap the index, so the drift never runs out of array.
                    const firstIdx = Math.floor((offset - stripCenterY - rowPitch) / rowPitch);
                    const lastIdx = Math.ceil((offset - stripCenterY + height + rowPitch) / rowPitch);
                    for (let idx = firstIdx; idx <= lastIdx; idx++) {
                        const item = items[((idx % items.length) + items.length) % items.length];
                        drawRow(item, idx, stripCenterY + idx * rowPitch - offset, false);
                    }
                } else {
                    items.forEach((item, idx) => {
                        const itemY = stripCenterY + idx * rowPitch - offset;
                        if (itemY > -rowPitch && itemY < height + rowPitch) {
                            drawRow(item, idx, itemY, idx === finalIndex && isResult);
                        }
                    });
                }
            } else if (loop) {
                // ── The endless idle reel ────────────────────────────────────
                //
                // Same drawing, addressed differently: instead of walking the
                // array and culling what is off screen, walk the *slots that are
                // on screen* and wrap the index into the array. The strip becomes
                // a cylinder, so the drift can run for as long as the page is open
                // without ever reaching an end.
                //
                // What this fixes: the array was drawn at its literal indices
                // 0..79, so once the offset passed roughly 8,340px the right-hand
                // slots had no index left to draw and the band emptied from that
                // side — about four minutes in — and kept emptying until the
                // offset hit one full strip and snapped back to a band that was
                // now empty on the *left*. The drift already wrapped its offset by
                // exactly one strip length, which is the right period; there was
                // simply nothing on the drawing side that could use it.
                //
                // That same modulo is now seamless rather than a reset, because a
                // shift of one whole strip maps every slot onto an identical
                // index. Nothing about the wrap is visible.
                //
                // Only for the dormant reel. During a spin the strip is
                // authoritative — `finalIndex` names the winning slot and the
                // server built the sequence — and repeating it would put the
                // winner on screen twice.
                const stripCenterX = width / 2 - itemWidth / 2;
                const itemCenterY = (height - itemWidth) / 2;
                const firstIdx = Math.floor((offset - stripCenterX - itemWidth) / itemWidth);
                const lastIdx = Math.ceil((offset - stripCenterX + width + itemWidth) / itemWidth);

                for (let idx = firstIdx; idx <= lastIdx; idx++) {
                    // JS `%` keeps the sign of the dividend, and the offset starts
                    // below the centre, so this genuinely does go negative.
                    const item = items[((idx % items.length) + items.length) % items.length];
                    const itemX = stripCenterX + idx * itemWidth - offset;
                    drawItem(ctx, item, itemX, itemCenterY, itemWidth, false, isRecursionTheme && !isKotwTheme, imagesRef.current, time, isLuckySpin, goldRushBoostedRarity, isKotwTheme, height, 0, calm, LIP_H);
                }
            } else {
                // Horizontal strip - items side by side
                const stripCenterX = width / 2 - itemWidth / 2;
                const itemCenterY = (height - itemWidth) / 2; // Center item vertically in strip

                items.forEach((item, idx) => {
                    const itemX = stripCenterX + idx * itemWidth - offset;

                    // Only draw visible items
                    if (itemX > -itemWidth && itemX < width + itemWidth) {
                        const isWinning = idx === finalIndex && isResult;
                        // Horizontal reel: every slot shares the full-height band,
                        // which is what makes the row read as one lit surface.
                        drawItem(ctx, item, itemX, itemCenterY, itemWidth, isWinning, isRecursionTheme && !isKotwTheme, imagesRef.current, time, isLuckySpin, goldRushBoostedRarity, isKotwTheme, height, 0, calm, LIP_H);

                        // The slot seam that used to be drawn here is gone.
                        //
                        // It began as a full-height rule between every pair of
                        // tiles, was cut back to a short tick at the floor when
                        // the columns arrived, and is now unnecessary entirely:
                        // the columns are inset, so the unlit gap between them IS
                        // the seam. A line down the middle of that gap only put
                        // back the grid the inset exists to replace.
                    }
                });
            }

            ctx.restore();

            // Motion blur (rendered at z-index 4 equivalent)
            if (motionIntensity > 0.1) {
                drawMotionBlur(ctx, width, height, isMobile, bgColor, motionIntensity);
            }

            // ========== EDGE VIGNETTE - soft dark gradient at edges ==========
            if (isMobile) {
                // The shaft's vignette runs along its travel axis, so the rows
                // arrive out of the dark and leave into it. Deeper than the
                // horizontal band's 12% because a phone's shaft is long and the
                // ends are where the eye is not.
                const topVignette = ctx.createLinearGradient(0, 0, 0, height * 0.18);
                topVignette.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
                topVignette.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = topVignette;
                ctx.fillRect(0, 0, width, height * 0.18);

                const bottomVignette = ctx.createLinearGradient(0, height * 0.82, 0, height);
                bottomVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
                bottomVignette.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
                ctx.fillStyle = bottomVignette;
                ctx.fillRect(0, height * 0.82, width, height * 0.18);

                // ── The shaft's rails ────────────────────────────────────────
                //
                // The horizontal band is a recess with a lit top hairline and a
                // front lip along its two long edges. The shaft's long edges are
                // its left and right, so that is where its machining goes: a lit
                // hairline down each side with a short falloff inward, dying into
                // the vignettes at both ends exactly as the band's edges do.
                //
                // This is the piece the old vertical reel had none of. It drew no
                // edges at all, which is why it read as a black box with tiles in
                // it rather than as a surface — craft is legible at edges, and it
                // had none.
                const railFade = (alpha) => {
                    const g = ctx.createLinearGradient(0, 0, 0, height);
                    g.addColorStop(0, 'rgba(206,214,236,0)');
                    g.addColorStop(0.14, `rgba(206,214,236,${alpha})`);
                    g.addColorStop(0.86, `rgba(206,214,236,${alpha})`);
                    g.addColorStop(1, 'rgba(206,214,236,0)');
                    return g;
                };
                ctx.fillStyle = railFade(0.14);
                ctx.fillRect(0, 0, 1, height);
                ctx.fillRect(width - 1, 0, 1, height);

                const railGlowL = ctx.createLinearGradient(1, 0, 9, 0);
                railGlowL.addColorStop(0, 'rgba(206,214,236,0.05)');
                railGlowL.addColorStop(1, 'rgba(206,214,236,0)');
                ctx.fillStyle = railGlowL;
                ctx.fillRect(1, 0, 8, height);

                const railGlowR = ctx.createLinearGradient(width - 9, 0, width - 1, 0);
                railGlowR.addColorStop(0, 'rgba(206,214,236,0)');
                railGlowR.addColorStop(1, 'rgba(206,214,236,0.05)');
                ctx.fillStyle = railGlowR;
                ctx.fillRect(width - 9, 0, 8, height);
            } else {
                // Horizontal vignette for desktop.
                //
                // Skipped in lane mode: this is the *band's* falloff into the
                // page, and a track is not a band. SpinLanes draws the same
                // gradient once across the whole row instead, so the five tracks
                // share one pair of edges rather than owning ten.
                if (!laneMode) {
                    const leftVignette = ctx.createLinearGradient(0, 0, width * 0.12, 0);
                    leftVignette.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
                    leftVignette.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    ctx.fillStyle = leftVignette;
                    ctx.fillRect(0, 0, width * 0.12, height);

                    const rightVignette = ctx.createLinearGradient(width * 0.88, 0, width, 0);
                    rightVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
                    rightVignette.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
                    ctx.fillStyle = rightVignette;
                    ctx.fillRect(width * 0.88, 0, width * 0.12, height);
                }

                // ── The band's own edges ─────────────────────────────────────
                //
                // Drawn once per frame, over every column, because they belong
                // to the band and not to any tile in it. The band is a recess
                // milled into the page: a lit hairline where the surface breaks
                // at the top, and a lip at the bottom whose top face catches
                // light over a dark under-line.
                //
                // Judge these two and the per-slot seam as one material — they
                // are the same machined surface seen along three different
                // edges, and tuning any of them alone produces a value that is
                // right on its own and wrong in company. The seam's light side
                // was 0.06 when the lip did not exist yet and read as a gap
                // rather than as two faces meeting; it is 0.12 against these.
                //
                // Both fade out into the vignettes rather than running to the
                // viewport, because a hairline at full strength inside a corner
                // that is otherwise black is the one place the illusion breaks.
                //
                // In lane mode they run at constant alpha instead. The fade
                // exists to die inside the band's own vignette, and a track has
                // no vignette to die into — fading per lane would break the
                // hairline and the lip into five separate segments, which is a
                // row of five boxes drawn in the one register that is supposed
                // to say the opposite. The row's outer fade is SpinLanes' job.
                const edgeGradient = (alpha) => {
                    if (laneMode) return `rgba(206,214,236,${alpha})`;
                    const g = ctx.createLinearGradient(0, 0, width, 0);
                    g.addColorStop(0, 'rgba(206,214,236,0)');
                    g.addColorStop(0.10, `rgba(206,214,236,${alpha})`);
                    g.addColorStop(0.90, `rgba(206,214,236,${alpha})`);
                    g.addColorStop(1, 'rgba(206,214,236,0)');
                    return g;
                };

                const lipLight = edgeGradient(0.20);
                ctx.fillStyle = lipLight;
                ctx.fillRect(0, height - LIP_H, width, 1);

                ctx.fillStyle = 'rgba(0,0,0,0.55)';
                ctx.fillRect(0, height - LIP_H + 1, width, LIP_H - 1);

                ctx.fillStyle = edgeGradient(0.13);
                ctx.fillRect(0, 0, width, 1);

                // The short falloff under the hairline is what turns a drawn
                // line into a lit edge: light hits the top of the recess and
                // dies within a few pixels of it.
                const hairlineFall = ctx.createLinearGradient(0, 1, 0, 9);
                hairlineFall.addColorStop(0, 'rgba(206,214,236,0.05)');
                hairlineFall.addColorStop(1, 'rgba(206,214,236,0)');
                ctx.fillStyle = hairlineFall;
                ctx.fillRect(0, 1, width, 8);
            }

            // ========== CENTER LINE GLOW PULSE (mobile) ==========
            // The idle arm of this used to compute a "gentle pulse" that was then
            // thrown away — the idle alpha is a constant — so the only live case
            // is the spin. Under reduced motion the spin holds at the middle of
            // its range rather than beating.
            //
            // Both breakpoints draw a detent now. The note below explains why the
            // desktop one replaced a slab of glow; the shaft's is the same object
            // turned ninety degrees, and it replaced the same mistake — a 40px
            // band of accent glow lying straight across the item at the one moment
            // the surface exists for, with a 3px DOM line and two triangles on top
            // of it. The reason it survived is recorded honestly in the old
            // comment: "its geometry has not been reviewed on a real device". It
            // has now.
            //
            // `centerPulse` / `centerGlowAlpha` went with it. They drove the glow
            // band's opacity and nothing else, and the detent's own `tick` — the
            // per-slot flash that makes a deceleration something you feel — is a
            // better beat than a free-running sine that ignored where the reel was.

            if (isMobile) {
                // ── The shaft's detent ───────────────────────────────────────
                //
                // Two machined marks seated in the rails, a hairline between them
                // that opens out across the middle so nothing crosses the sprite,
                // and a lit aperture rather than a shaded one. Identical grammar
                // to the desktop detent, mirrored onto the other axis: there the
                // marks sit in the top hairline and the floor lip, here they sit
                // in the left and right rails.
                const cy = Math.round(height / 2);
                const A = (a) => `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${a})`;

                // The aperture: a glow around the line, not a lit slot. Sized off
                // the row pitch the same way the desktop one is sized off the
                // column pitch.
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const glowH = itemWidth * 0.42;
                const aperture = ctx.createLinearGradient(0, cy - glowH, 0, cy + glowH);
                aperture.addColorStop(0, A(0));
                aperture.addColorStop(0.5, A((isSpinning ? 0.16 : 0.11) + tick * 0.1));
                aperture.addColorStop(1, A(0));
                ctx.fillStyle = aperture;
                ctx.fillRect(0, cy - glowH, width, glowH * 2);
                ctx.restore();

                // The line: full strength where it meets the rails, a third of
                // that across the middle so it carries as one object without
                // competing with the item it is pointing at.
                const hairAlpha = (isSpinning ? 0.85 : 0.6) + tick * 0.4;
                const hair = ctx.createLinearGradient(0, 0, width, 0);
                hair.addColorStop(0, A(hairAlpha));
                hair.addColorStop(0.28, A(hairAlpha * 0.34));
                hair.addColorStop(0.72, A(hairAlpha * 0.34));
                hair.addColorStop(1, A(hairAlpha));
                ctx.fillStyle = hair;
                ctx.fillRect(0, cy - 0.5, width, 1);

                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const bleed = ctx.createLinearGradient(0, cy - 4, 0, cy + 4);
                bleed.addColorStop(0, A(0));
                bleed.addColorStop(0.5, A(hairAlpha * 0.3));
                bleed.addColorStop(1, A(0));
                ctx.fillStyle = bleed;
                ctx.fillRect(0, cy - 4, width, 8);
                ctx.restore();

                // Each row passing flashes the marks; the gaps stretching out is
                // what a deceleration feels like.
                const markAlpha = Math.min(1, (isSpinning ? 0.95 : 0.8) + tick * 0.45);
                drawDetentTick(ctx, cy, 0, 1, accentRgb, markAlpha, 'y');
                drawDetentTick(ctx, cy, width, -1, accentRgb, markAlpha, 'y');
            } else {
                // ── The desktop indicator, as a detent ───────────────────────
                //
                // What was here was a 50px-wide slab of accent glow running the
                // full height of the band, plus a 3px DOM line and two triangles
                // on top of it. Three things all saying "here", and the loudest
                // of them drew a bar straight down the middle of the item you
                // were trying to look at — the one moment the surface exists for.
                //
                // A detent says the same thing from the edges instead: two
                // machined marks seated in the band's own hairline and lip, a
                // hairline between them that opens out across the middle so
                // nothing crosses the sprite, and an aperture that is *lit*
                // rather than shaded. That last part is a correction of a real
                // mistake: an earlier gate cast broad shadows inward and made the
                // centre slot the darkest thing on the band, when it is the
                // closest point of the recess to the viewer.
                //
                // The DOM centre line and triangles in WheelSpinner.jsx are
                // mobile-only for the same reason: this replaces them.
                const cx = Math.round(width / 2);
                const A = (a) => `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${a})`;

                // The aperture is a glow around the line, not a lit slot.
                //
                // It used to run to `itemWidth * 0.8` a side, which is most of a
                // slot, and that width was part of a bigger mistake: a pair of
                // gate rails one pitch apart marked the boundaries of the centre
                // position outright. They read well and they were wrong, for a
                // reason worth keeping — **an indicator that draws the landing
                // zone tells you where the reel is going to stop before it stops
                // there.** The near miss is the tension of not yet knowing which
                // side of the line the slot will settle on, and a gate hands that
                // away a full second early. A line does not: it marks one point,
                // and the item either covers it or nearly does.
                //
                // So the reference frame is the line itself, against the travelling
                // seams. Less explicit than rails, and that is the point.
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const glowW = itemWidth * 0.42;
                const apertureAlpha = (isSpinning ? 0.16 : 0.11) + tick * 0.1;
                const aperture = ctx.createLinearGradient(cx - glowW, 0, cx + glowW, 0);
                aperture.addColorStop(0, A(0));
                aperture.addColorStop(0.5, A(apertureAlpha));
                aperture.addColorStop(1, A(0));
                ctx.fillStyle = aperture;
                ctx.fillRect(cx - glowW, 0, glowW * 2, height);
                ctx.restore();

                // ── The line ─────────────────────────────────────────────────
                //
                // One continuous line, full height, and the profile along it is
                // the whole design. It runs at full strength through the band's
                // own edges — where it meets the hairline and the lip, and where
                // the marks are seated — and eases down to about a third across
                // the middle.
                //
                // Both extremes of this have now been built and both were wrong.
                // The 3px DOM gradient it started as was brightest exactly at the
                // sprite's centre, so the indicator's strongest moment was a bar
                // painted over the item you were trying to see. Opening it to
                // fully transparent across the middle fixed that and went too far
                // the other way — it stopped being a line at all and read as two
                // marks that happened to be aligned. A third of strength is enough
                // to carry across the item as one object without competing with it.
                const hairAlpha = (isSpinning ? 0.85 : 0.6) + tick * 0.4;
                const hair = ctx.createLinearGradient(0, 0, 0, height);
                hair.addColorStop(0, A(hairAlpha));
                hair.addColorStop(0.28, A(hairAlpha * 0.34));
                hair.addColorStop(0.72, A(hairAlpha * 0.34));
                hair.addColorStop(1, A(hairAlpha));
                ctx.fillStyle = hair;
                ctx.fillRect(cx - 0.5, 0, 1, height);

                // A soft second pass either side, so the line has a falloff rather
                // than a hard 1px edge. This is what gives it weight without
                // giving it width — a 3px line is a bar, a 1px line with a bloom
                // is a filament.
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const bleed = ctx.createLinearGradient(cx - 4, 0, cx + 4, 0);
                bleed.addColorStop(0, A(0));
                bleed.addColorStop(0.5, A(hairAlpha * 0.3));
                bleed.addColorStop(1, A(0));
                ctx.fillStyle = bleed;
                ctx.fillRect(cx - 4, 0, 8, height);
                ctx.restore();

                // Each pass of a slot flashes the marks. The gaps between those
                // flashes stretching out is what a deceleration feels like.
                const markAlpha = Math.min(1, (isSpinning ? 0.95 : 0.8) + tick * 0.45);
                drawDetentTick(ctx, cx, 0, 1, accentRgb, markAlpha);
                drawDetentTick(ctx, cx, height - LIP_H, -1, accentRgb, markAlpha);

                // ── The landing ──────────────────────────────────────────────
                //
                // White rather than the tier's hue, and additive, so it reads as
                // light hitting the column rather than as another colour laid
                // over it — the tier blooms in its own colour underneath. Tight
                // to the winning slot, because a full-band flash is a page event
                // and this is a *this one* event.
                //
                // It lands on the **winning slot**, not on the band's centre. It
                // was written against the centre on the assumption that the two
                // are the same thing at rest, and they are not: a spin comes to
                // rest up to 45% of a pitch off centre on purpose (see
                // `landingVariance` in WheelSpinner.jsx). Flashing dead centre put
                // the brightest event on the surface in the one place that is
                // never quite where the item is, and it actively argued that every
                // landing was centred — which is the opposite of the read the
                // variance exists to create.
                if (bloom > 0.004) {
                    const winnerX = width / 2 - itemWidth / 2
                        + finalIndex * itemWidth - offset + itemWidth / 2;
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    const hitW = itemWidth * 0.62;
                    const hit = ctx.createLinearGradient(winnerX - hitW, 0, winnerX + hitW, 0);
                    hit.addColorStop(0, 'rgba(255,255,255,0)');
                    hit.addColorStop(0.5, `rgba(255, 252, 244, ${0.30 * bloom})`);
                    hit.addColorStop(1, 'rgba(255,255,255,0)');
                    ctx.fillStyle = hit;
                    ctx.fillRect(winnerX - hitW, 0, hitW * 2, height);

                    // The lip takes the hit too, and holds it a beat longer than
                    // the column does — the shelf is the surface the light is
                    // landing on.
                    const spill = ctx.createLinearGradient(winnerX - itemWidth * 1.6, 0, winnerX + itemWidth * 1.6, 0);
                    spill.addColorStop(0, 'rgba(255,255,255,0)');
                    spill.addColorStop(0.5, `rgba(255, 250, 238, ${0.55 * Math.sqrt(bloom)})`);
                    spill.addColorStop(1, 'rgba(255,255,255,0)');
                    ctx.fillStyle = spill;
                    ctx.fillRect(winnerX - itemWidth * 1.6, height - LIP_H, itemWidth * 3.2, 1);
                    ctx.restore();
                }
            }

            animationRef.current = requestAnimationFrame(render);
        };

        animationRef.current = requestAnimationFrame(render);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
        // Only restart animation when canvas size or items change, not on every
        // prop change — everything else the loop reads comes off propsRef.
        //
        // `isMobile` is in here despite that, because it does not select a value,
        // it selects which of two layout branches the loop runs. In practice
        // width and height change with it and would restart the loop anyway; the
        // dependency is what makes that a guarantee rather than a coincidence.
    }, [items, width, height, imagesLoaded, isMobile, laneMode]);

    // Keyboard handler for accessibility
    const handleKeyDown = useCallback((e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick(e);
        }
    }, [onClick]);

    return (
        <div
            ref={containerRef}
            onClick={onClick}
            onKeyDown={onClick ? handleKeyDown : undefined}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            // A role="button" with no accessible name announces as "button" and
            // nothing else. Only the mobile layout passes onClick — tapping the
            // reel is the mobile spin affordance — so this is the name for that
            // control, and the canvas inside stays aria-hidden because a reel of
            // sprites has nothing to read out.
            aria-label={onClick ? 'Spin the wheel' : undefined}
            style={{
                // The mount fills its parent and the canvas measures the result.
                // It used to set its own `height: ${height}px` from the very value
                // it was measuring, which is a feedback loop the moment the height
                // stops being a constant — and on a phone it now isn't, because the
                // shaft takes whatever the stage row can spare.
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                // Square everywhere. The band leaves the screen on both sides on
                // desktop and the shaft does the same on a phone; a radius at the
                // viewport edge is a notch, and on a lane it would be five rounded
                // boxes in a row.
                borderRadius: 0,
                overflow: 'hidden',
                zIndex: 2, // Same z-index as original strip div
                cursor: onClick ? 'pointer' : 'default',
            }}
        >
            <canvas
                ref={canvasRef}
                aria-hidden="true"
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                }}
            />
        </div>
    );
}

// CanvasSpinningStripWrapper used to sit here, a compatibility shim for the
// EnhancedSpinningStrip API this file replaced. Nothing imported it, and it had
// gone stale in a way that would have bitten whoever did: it dropped isLuckySpin,
// accentColor, themeType and goldRushBoostedRarity on the floor and hardcoded a
// 100px desktop strip height. WheelSpinner renders CanvasSpinningStrip directly.

// Export preload function for use by parent components
export async function preloadItemImages(items, onProgress) {
    const batchSize = 20;
    let loaded = 0;

    // Pool sprites come from the atlas, so fetching them individually would undo
    // the entire point of packing one. What is left is the handful of things the
    // atlas does not cover: player heads, event and recursion art, custom items.
    items = items.filter(needsOwnImage);

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(item => {
            const src = getItemImageUrl(item);
            return loadImage(src).then(() => {
                loaded++;
                if (onProgress) onProgress(loaded, items.length);
            });
        }));
    }
}

/**
 * Fills the cache in the background. Nothing waits on this.
 *
 * The wheel used to await preloadItemImages() over the whole pool before it
 * would enable the spin button — ~1,500 files to render a strip of 80. Measured
 * cold that was 9.4s from our own origin and 2.2s from GitHub, and the gap is
 * why the pool download is now split in two: a small awaited set that the first
 * frame genuinely needs, and this, which is allowed to trickle.
 *
 * Concurrency is deliberately lower than preloadItemImages' batch of 20. This
 * runs while someone is already spinning, and the images that spin is waiting on
 * are queued behind it on the same connection pool — a wide background sweep
 * makes the thing the user is actually looking at slower.
 *
 * Resolves when the sweep finishes; callers are free to ignore it. Rejections
 * cannot escape (loadImage resolves to the barrier on error), so there is no
 * unhandled-rejection path here.
 */
export function warmImageCache(items, { concurrency = 6 } = {}) {
    const queue = items
        .filter(needsOwnImage)
        .map(getItemImageUrl)
        .filter(src => !imageCache.has(src));

    let cursor = 0;
    const worker = async () => {
        while (cursor < queue.length) {
            await loadImage(queue[cursor++]);
        }
    };

    return Promise.all(
        Array.from({ length: Math.min(concurrency, queue.length) }, worker),
    );
}

export default CanvasSpinningStrip;
