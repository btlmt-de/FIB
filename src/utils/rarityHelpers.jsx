// ============================================
// Rarity Helpers - Shared utility for rarity-related functions
// ============================================

import React from 'react';
import { Sparkles, Star, Diamond, Circle, Zap, Crown, Gem } from 'lucide-react';
// The wheel's palette, not the wiki's. Every consumer of these helpers lives under
// components/wheel/, and the wheel renders against its own COLORS (hex, Minecraft-derived)
// rather than the site-wide oklch tokens. Importing '../config/constants' here — which is what
// this file used to do — made getRarityColor('legendary') return the wiki's blue-violet purple
// while the surrounding wheel chrome used #AA00AA magenta, so the activity feed rows and the
// pull toast disagreed with the "Legendary" label sitting right under them.
import { COLORS } from '../components/wheel/config/constants';

/**
 * THE RARITY LADDER — this table is the source of truth for the whole wheel.
 *
 * It used to be four tables. This file had one; AdminPanel.jsx and UserProfile.jsx
 * each carried a private copy; CanvasSpinningStrip.jsx carried a fifth as
 * RARITY_COLORS. They had already drifted — UserProfile rendered `event` gold
 * where everything else rendered it orange, and its unknown-rarity fallback was
 * grey where this file's was gold — which is exactly the class of bug the comment
 * above was written about. The copies are gone; they all read this now.
 *
 * `order` is presentation only: it sorts lists and nothing persists it, so tiers
 * can be inserted without a migration. `color` is the fill/border/glow value.
 * `ink` is the same hue lifted to clear WCAG AA as text on the wheel's panels —
 * see the note in config/constants.js. Where `ink` is absent the fill already
 * clears the floor and doubles as text.
 */
export const RARITY = {
    insane: {
        order: 0,
        label: 'Insane',
        color: COLORS.insaneFlat,
        // The only tier rendered as a moving gradient rather than a colour. See
        // getRarityStops / isIridescentRarity below.
        stops: COLORS.insaneHolo,
        // `iridescent` is what marks the full-gradient treatment, and only insane
        // has it. It is a separate flag from `stops` because mythic has stops too
        // now — but mythic's stops drive a shimmer *within* its own flat colour,
        // whereas insane has no flat colour to fall back to at all.
        iridescent: true,
    },
    // Mythic carries stops too, but unlike insane it also has a flat `color`:
    // the stops drive its shimmer, while the flat aqua is what a badge, a legend
    // swatch or a label uses. Insane has no flat colour at all, which is what
    // isIridescentRarity distinguishes.
    mythic: { order: 1, label: 'Mythic', color: COLORS.aqua, stops: COLORS.mythicCycle, lightFill: true },
    legendary: { order: 2, label: 'Legendary', color: COLORS.insane, lightFill: true },
    exotic: { order: 3, label: 'Exotic', color: COLORS.purple, ink: COLORS.purpleInk },
    rare: { order: 4, label: 'Rare', color: COLORS.red, ink: COLORS.redInk },
    event: { order: 5, label: 'Event', color: COLORS.orange },
    common: { order: 99, label: 'Common', color: COLORS.neutralInk },
};

// `lightFill` above marks the tiers whose *fill* is bright enough that dark text
// beats white on it. Measured against #1a1a1a vs #ffffff, worst stop of each
// gradient: insane's platinum 15.1:1 and its holo stops 6.6–14.2, mythic's ramp
// 4.95–14.2 (the azure stop is the floor), legendary's gold 12.4. Exotic's
// #AA00AA is the one tier that genuinely wants white, at 6.4:1.
//
// Rare (#FF5555) and event (#FF8800) are deliberately NOT flagged, and that is a
// judgement call rather than a measurement: dark ink would actually score better
// on both (5.54 and 7.27, against white's 3.14 and 2.39), but flipping them is a
// visible restyle of surfaces nobody asked about. Flag them here if that restyle
// is ever wanted — the fix is one word each.

/** Tier keys, rarest first. Use this to build legends, filters and odds tables. */
export const RARITY_KEYS = Object.keys(RARITY).sort((a, b) => RARITY[a].order - RARITY[b].order);

const tier = rarity => RARITY[rarity] || RARITY.common;

/**
 * Get the color associated with a rarity level
 * @param {string} rarity - The rarity type (insane, mythic, legendary, exotic, rare, event, or default)
 * @returns {string} The color code for the rarity
 */
export function getRarityColor(rarity) {
    return tier(rarity).color;
}

/**
 * The text-safe step for a rarity. Identical to getRarityColor for tiers whose
 * fill already clears AA. Use this for any label, count or name rendered *in* the
 * rarity's colour — getRarityColor is for the swatch beside it, not the words.
 * @param {string} rarity
 * @returns {string}
 */
export function getRarityInk(rarity) {
    const t = tier(rarity);
    return t.ink || t.color;
}

/**
 * The text colour to put ON a tier's own fill — a badge label, a count chip, a
 * glyph drawn inside the rarity's colour.
 *
 * Not the same question as getRarityInk, which is the tier's colour used AS text
 * on the panel. This is the inverse: the panel is the tier's colour and the text
 * has to survive on top of it. Both exist because getting them the wrong way
 * round is invisible until someone reads a badge.
 *
 * @param {string} rarity
 * @returns {string} '#1a1a1a' on light fills, '#fff' otherwise
 */
export function getRarityOnColor(rarity) {
    return tier(rarity).lightFill ? '#1a1a1a' : '#fff';
}

/**
 * Whether this rarity is rendered as a moving iridescent gradient rather than a
 * flat colour. Only `insane` is, and deliberately only one tier ever should be:
 * the treatment means "top of the ladder", and a second one spending it would
 * make it mean "special-ish".
 * @param {string} rarity
 * @returns {boolean}
 */
export function isIridescentRarity(rarity) {
    return Boolean(tier(rarity).iridescent);
}

/**
 * The gradient stops for an iridescent rarity, or null for flat tiers.
 * @param {string} rarity
 * @returns {string[]|null}
 */
export function getRarityStops(rarity) {
    return tier(rarity).stops || null;
}

/**
 * Sample the iridescent ramp at `t` and return an {r,g,b} triple.
 *
 * Lives here rather than in either canvas file because both of them need it and
 * the whole point of this module is that the ladder is defined once. `t` wraps,
 * so a caller can advance it forever; the ramp's last stop repeats its first, so
 * the wrap has no seam.
 *
 * The DOM gets the same effect from the .fib-holo class in index.css. Canvas
 * cannot use a CSS class, which is the only reason this exists in two forms.
 *
 * @param {number} t - position along the ramp, any float
 * @returns {{r: number, g: number, b: number}}
 */
export function sampleHolo(t) {
    return sampleRamp(RARITY.insane.stops, t);
}

/**
 * Sample any tier's ramp at `t`. Insane and mythic both animate along a stop
 * list; this is the one interpolator they share, so a tier's cycle is defined by
 * its `stops` entry in RARITY and nowhere else.
 *
 * @param {string[]} stops - hex colours; repeat the first as the last for a
 *   seamless loop
 * @param {number} t - wraps, so a caller can advance it forever
 * @returns {{r: number, g: number, b: number}}
 */
export function sampleRamp(stops, t) {
    const segments = stops.length - 1;
    const pos = (((t % 1) + 1) % 1) * segments;
    const i = Math.floor(pos);
    const f = pos - i;
    const parse = hex => [1, 3, 5].map(o => parseInt(hex.slice(o, o + 2), 16));
    const [ar, ag, ab] = parse(stops[i]);
    const [br, bg, bb] = parse(stops[Math.min(i + 1, segments)]);
    return {
        r: Math.round(ar + (br - ar) * f),
        g: Math.round(ag + (bg - ag) * f),
        b: Math.round(ab + (bb - ab) * f),
    };
}

/**
 * The canvas-side twin of the .fib-holo CSS class.
 *
 * Returns a horizontal CanvasGradient whose stops are offset by `phase` (0..1),
 * so calling it each frame with an advancing phase produces the same drifting
 * slick the DOM gets from background-position.
 *
 * Use this and not sampleHolo wherever the result is a *fill or stroke*. The
 * ramp passes through magenta, aqua and gold, which are exotic, mythic and
 * legendary respectively — so a border painted with one sampled point off it
 * impersonates a different tier every couple of seconds. All three hues have to
 * be on screen at once for the treatment to mean "insane". sampleHolo is for the
 * places that genuinely cannot take a gradient, which in practice is shadowColor.
 *
 * The stop list is walked three times and clamped to [0,1] because a
 * CanvasGradient rejects offsets outside that range; the naive
 * `(i/n + phase) % 1` version sorts its stops wrong at the wrap point and flashes
 * a hard seam once per cycle. Nothing is forced at 0 or 1 — canvas clamps,
 * extending the outermost in-range stops, which is what keeps the loop seamless.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - left edge of the gradient in canvas coordinates
 * @param {number} width
 * @param {number} phase - 0..1 position in the drift cycle
 * @returns {CanvasGradient}
 */
export function createHoloGradient(ctx, x, width, phase) {
    const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
    const stops = RARITY.insane.stops;
    const span = 1 / (stops.length - 1);

    for (let pass = -1; pass <= 1; pass++) {
        for (let i = 0; i < stops.length; i++) {
            const offset = i * span + phase + pass;
            if (offset < 0 || offset > 1) continue;
            gradient.addColorStop(offset, stops[i]);
        }
    }
    return gradient;
}

/**
 * Get a Lucide React icon component for a rarity level
 * @param {string} rarity - The rarity type
 * @param {number} size - Icon size in pixels (default 14)
 * @param {boolean} colored - Whether to apply rarity color (default true)
 * @returns {React.ReactElement|null} The icon component or null
 */
export function getRarityIcon(rarity, size = 14, colored = true) {
    // Icons are small and sit on panel surfaces, so they take the ink step for the
    // same reason text does — a 12px magenta glyph at 2.3:1 is not an affordance.
    const color = colored ? getRarityInk(rarity) : undefined;

    switch (rarity) {
        // Insane's glyph is stroked with the shared SVG gradient rather than its
        // flat colour, because that flat colour is platinum and at 9–12px it just
        // looks white — the rarest tier reading as no tier at all. `color` is still
        // passed so the icon degrades to platinum if the gradient's <defs> is not
        // mounted, which is the case anywhere outside the wheel tree.
        case 'insane': return colored
            ? <Crown size={size} color={color} className="fib-holo-icon" />
            : <Crown size={size} />;
        case 'mythic': return <Sparkles size={size} color={color} />;
        case 'legendary': return <Star size={size} color={color} />;
        case 'exotic': return <Gem size={size} color={color} />;
        case 'rare': return <Diamond size={size} color={color} />;
        case 'event': return <Zap size={size} color={color} />;
        default: return null;
    }
}

/**
 * Get rarity badge info (label, color, and icon)
 * @param {string} rarity - The rarity type
 * @param {number} iconSize - Icon size in pixels (default 10)
 * @returns {{ label: string, color: string, icon: React.ReactElement }}
 */
export function getRarityBadge(rarity, iconSize = 10) {
    const t = tier(rarity);
    const color = t.ink || t.color;

    switch (rarity) {
        case 'insane':
            return { label: t.label, color, icon: <Crown size={iconSize} /> };
        case 'mythic':
            return { label: t.label, color, icon: <Sparkles size={iconSize} /> };
        case 'legendary':
            return { label: t.label, color, icon: <Star size={iconSize} /> };
        case 'exotic':
            return { label: t.label, color, icon: <Gem size={iconSize} /> };
        case 'rare':
            return { label: t.label, color, icon: <Diamond size={iconSize} /> };
        case 'event':
            return { label: t.label, color, icon: <Zap size={iconSize} /> };
        default:
            return { label: RARITY.common.label, color: RARITY.common.color, icon: <Circle size={iconSize} /> };
    }
}

/**
 * Get Lucide icon component for rarity (for text-only contexts like AdminPanel)
 * Returns the same icon as getRarityIcon but without color applied
 * @param {string} rarity - The rarity type
 * @param {number} size - Icon size in pixels (default 14)
 * @returns {React.ReactElement|null} The icon component
 */
export function getRarityEmoji(rarity, size = 14) {
    // Using Lucide icons instead of unicode emojis for consistency
    return getRarityIcon(rarity, size, false) || <Circle size={size} />;
}

/**
 * Get CSS gradient for rarity backgrounds
 * @param {string} rarity - The rarity type
 * @param {number} opacity - Opacity value 0-1 (default 0.1)
 * @returns {string} CSS gradient string
 */
export function getRarityGradient(rarity, opacity = 0.1) {
    const alphaHex = Math.round(opacity * 255).toString(16).padStart(2, '0');
    const stops = getRarityStops(rarity);

    // The iridescent tier keeps its full stop sequence even as a background wash,
    // so an insane row is recognisable at 10% the way it is at 100%.
    if (stops) {
        const washed = stops.map((c, i) => `${c}${alphaHex} ${(i / (stops.length - 1) * 100).toFixed(0)}%`);
        return `linear-gradient(135deg, ${washed.join(', ')})`;
    }

    return `linear-gradient(135deg, ${getRarityColor(rarity)}${alphaHex} 0%, transparent 100%)`;
}

/**
 * Get rarity order for sorting (lower = rarer)
 * @param {string} rarity - The rarity type
 * @returns {number} Sort order value
 */
export function getRarityOrder(rarity) {
    return tier(rarity).order;
}
