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

const MOBILE_ITEM_WIDTH = 70;

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
function drawItem(ctx, item, x, y, size, isWinning, showRecursionEffects, images, time, isLuckySpin = false, goldRushBoostedRarity = null, isKotwLucky = false, bandHeight = 0, bandTop = 0, calm = false, floorInset = 0) {
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
    // The winner is still unmistakable without it: `lift` below runs its wash and
    // glow 35% hotter than any other slot, its base bar goes fully opaque, and it
    // gets full-height shaft walls plus a crown of light that no other column
    // draws. All of that is static.

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
        const spillR = size * (0.8 + 0.55 * energy);
        const spillX = x + size / 2;
        // Seated near the floor, because that is where the column's light is.
        const spillY = F - H * 0.12;
        const spillG = ctx.createRadialGradient(spillX, spillY, 0, spillX, spillY, spillR);
        spillG.addColorStop(0, rgb(mixWhite(stops[2], 0.22), 0.13 * energy * breathe));
        spillG.addColorStop(0.4, rgb(stops[1], 0.055 * energy * breathe));
        spillG.addColorStop(1, rgb(stops[1], 0));
        ctx.fillStyle = spillG;
        ctx.fillRect(spillX - spillR, T, spillR * 2, H);
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
    const wash = ctx.createLinearGradient(0, T, 0, F);
    wash.addColorStop(0, rgb(stops[0], 0));
    wash.addColorStop(0.32, rgb(stops[1], 0.05 * glow / 3));
    wash.addColorStop(0.66, rgb(stops[1], 0.22 * glow / 3));
    wash.addColorStop(1, rgb(stops[2], 0.58 * glow / 3));
    ctx.fillStyle = wash;
    //
    // The outermost pass stops short of the slot edge rather than filling it.
    // With the inset cut to a hairline the widest fill would otherwise run right
    // up to the seam and end there, which is a hard vertical edge — the one thing
    // the nesting exists to avoid. Ending at 88% means the wash has already faded
    // into the band by the time it reaches the score, so what divides two slots is
    // the seam and not the end of the light.
    const spine = x + size / 2;
    for (const frac of [0.88, 0.7, 0.52, 0.34]) {
        const w = colW * frac;
        ctx.fillRect(spine - w / 2, T, w, H);
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
    if (energy > 0.3) {
        const flare = ctx.createRadialGradient(
            x + size / 2, F, 0,
            x + size / 2, F, size * 0.75,
        );
        // The energy term has a floor under it. Straight `0.5 * energy` gave rare
        // less than a quarter alpha and left the bottom of the ladder starved of
        // the one element that costs nothing in density, being pinned to the
        // floor. Lower tiers gain proportionally more here than the top does.
        flare.addColorStop(0, rgb(stops[2], (0.22 + 0.42 * energy) * breathe));
        flare.addColorStop(1, rgb(stops[2], 0));
        ctx.fillStyle = flare;
        ctx.fillRect(colX, T + H * 0.4, colW, F - (T + H * 0.4));
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

        const imgSize = size * imgScale;
        const imgX = x + (size - imgSize) / 2;
        // Seated slightly above centre. The base bar and its glow pull the eye
        // down, so a geometrically centred sprite optically reads as low.
        const imgY = T + (F - T - imgSize) / 2 - H * 0.04;

        // A pool of the tier's light under the item, so it sits in the column
        // rather than floating in front of it.
        const pool = ctx.createRadialGradient(
            x + size / 2, imgY + imgSize * 0.9, 0,
            x + size / 2, imgY + imgSize * 0.9, imgSize * 0.85,
        );
        pool.addColorStop(0, rgb(stops[1], 0.32 * glow));
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
            ctx.shadowBlur = isInsane ? 16 : isMythic ? 13 : 9;
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
 */
function drawDetentTick(ctx, cx, edgeY, dir, c, alpha) {
    const A = (a) => `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.min(1, a)})`;
    const BLADE = 11;
    const a = Math.min(1, alpha);

    ctx.save();

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
    const [containerWidth, setContainerWidth] = useState(stripWidth || (isMobile ? 140 : 1600));

    // Refs for props that change during animation (so render loop always has current values)
    // Note: offset is read from offsetRef if provided, otherwise from offsetProp
    const propsRef = useRef({ isSpinning, isResult, spinProgress, isRecursion, finalIndex, accentColor, themeType, isLuckySpin, goldRushBoostedRarity, loop });
    propsRef.current = { isSpinning, isResult, spinProgress, isRecursion, finalIndex, accentColor, themeType, isLuckySpin, goldRushBoostedRarity, loop };

    // Helper to get current offset - reads from ref if provided, otherwise uses prop value
    const getOffset = () => offsetRef ? offsetRef.current : offsetProp;

    const itemWidth = itemWidthOverride || (isMobile ? MOBILE_ITEM_WIDTH : ITEM_WIDTH);
    const width = stripWidth || containerWidth;
    const height = stripHeight || (isMobile ? 260 : STRIP_HEIGHT);

    // Measure container width on mount and resize
    useEffect(() => {
        if (!containerRef.current || isMobile) return;

        const updateWidth = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                if (rect && rect.width > 0) {
                    setContainerWidth(rect.width);
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
    }, [isMobile]);

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

            if (isMobile && loop) {
                // The vertical reel's version of the cylinder below. Same bug, same
                // fix, one axis over: the dormant strip ran out at the bottom and
                // reset. Written from the same reasoning rather than verified on a
                // device — the vertical layout has never been reviewable in this
                // harness — but it is the identical index wrap, and leaving a known
                // run-out in place on one breakpoint because the other is easier to
                // look at is not a decision worth defending.
                const stripCenterY = height / 2 - itemWidth / 2;
                const itemCenterX = (width - itemWidth) / 2;
                const firstIdx = Math.floor((offset - stripCenterY - itemWidth) / itemWidth);
                const lastIdx = Math.ceil((offset - stripCenterY + height + itemWidth) / itemWidth);

                for (let idx = firstIdx; idx <= lastIdx; idx++) {
                    const item = items[((idx % items.length) + items.length) % items.length];
                    const itemY = stripCenterY + idx * itemWidth - offset;
                    drawItem(ctx, item, itemCenterX, itemY, itemWidth, false, isRecursionTheme && !isKotwTheme, imagesRef.current, time, isLuckySpin, goldRushBoostedRarity, isKotwTheme, itemWidth, itemY, calm, 0);

                    ctx.strokeStyle = `${accentColor}33`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(0, itemY + itemWidth);
                    ctx.lineTo(width, itemY + itemWidth);
                    ctx.stroke();
                }
            } else if (isMobile) {
                // Vertical strip - items stacked vertically
                const stripCenterY = height / 2 - itemWidth / 2;
                const itemCenterX = (width - itemWidth) / 2; // Center item horizontally in strip

                items.forEach((item, idx) => {
                    const itemY = stripCenterY + idx * itemWidth - offset;

                    // Only draw visible items
                    if (itemY > -itemWidth && itemY < height + itemWidth) {
                        const isWinning = idx === finalIndex && isResult;
                        // Vertical reel: each slot is its own band, starting at
                        // the slot's own top edge, so the light travels with the
                        // tile instead of pooling at the top of the canvas.
                        drawItem(ctx, item, itemCenterX, itemY, itemWidth, isWinning, isRecursionTheme && !isKotwTheme, imagesRef.current, time, isLuckySpin, goldRushBoostedRarity, isKotwTheme, itemWidth, itemY, calm, 0);

                        // Separator line - use accentColor
                        ctx.strokeStyle = `${accentColor}33`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(0, itemY + itemWidth);
                        ctx.lineTo(width, itemY + itemWidth);
                        ctx.stroke();
                    }
                });
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
                // Vertical vignette for mobile
                const topVignette = ctx.createLinearGradient(0, 0, 0, height * 0.15);
                topVignette.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
                topVignette.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = topVignette;
                ctx.fillRect(0, 0, width, height * 0.15);

                const bottomVignette = ctx.createLinearGradient(0, height * 0.85, 0, height);
                bottomVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
                bottomVignette.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
                ctx.fillStyle = bottomVignette;
                ctx.fillRect(0, height * 0.85, width, height * 0.15);
            } else {
                // Horizontal vignette for desktop
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
                const edgeGradient = (alpha) => {
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
            // Desktop no longer takes this path; it draws a detent instead, in
            // the branch below. The vertical reel keeps the glow line and its DOM
            // pointers because its geometry has not been reviewed on a real
            // device and a detent designed against a 1920px band is not a claim
            // about a phone.
            const centerPulse = calm ? 0.6 : 0.6 + Math.sin(time * 8) * 0.4;
            const centerGlowAlpha = isSpinning ? 0.5 + centerPulse * 0.3 : 0.2;

            if (isMobile) {
                // Horizontal center line for mobile (vertical strip)
                const centerY = height / 2;
                const lineGlow = ctx.createLinearGradient(0, centerY - 20, 0, centerY + 20);
                lineGlow.addColorStop(0, 'rgba(0, 0, 0, 0)');
                lineGlow.addColorStop(0.4, `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${centerGlowAlpha * 0.3})`);
                lineGlow.addColorStop(0.5, `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${centerGlowAlpha})`);
                lineGlow.addColorStop(0.6, `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${centerGlowAlpha * 0.3})`);
                lineGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = lineGlow;
                ctx.fillRect(0, centerY - 20, width, 40);
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
    }, [items, width, height, imagesLoaded, isMobile]);

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
                position: isMobile ? 'relative' : 'absolute',
                width: isMobile ? `${width}px` : '100%',
                height: `${height}px`,
                borderRadius: isMobile ? '14px' : '10px',
                overflow: 'hidden',
                zIndex: 2, // Same z-index as original strip div
                cursor: onClick ? 'pointer' : 'default',
                margin: isMobile ? '0 auto' : '0',
                left: isMobile ? undefined : 0,
                top: isMobile ? undefined : 0,
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
