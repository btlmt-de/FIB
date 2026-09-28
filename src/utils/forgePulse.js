export const FORGE_PULSE_MS = 5000;
const SPECIALS = new Set(['rare', 'exotic', 'relic', 'legendary', 'mythic', 'insane']);
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

// Call with the already-revealed feed, never the immediate SSE toast queue.
export function newestForgeSpecial(items, seen, now) {
    return items.filter(item => !seen.has(item.id) && SPECIALS.has(item.rarity)
        && Number.isFinite(item.createdAt) && now >= item.createdAt
        && now - item.createdAt < 15000)
        .sort((a, b) => b.createdAt - a.createdAt || Number(b.id) - Number(a.id))[0] || null;
}

export function sampleForgePulse(pulse, now) {
    if (!pulse) return { strength: 0, color: [1, 1, 1] };
    const age = Math.max(0, now - pulse.startedAt);
    const blend = ease(age / 350);
    const color = pulse.color.map((channel, i) => pulse.fromColor[i] * (1 - blend) + channel * blend);
    const rise = pulse.fromStrength + (1 - pulse.fromStrength) * blend;
    return { color, strength: rise * ease((FORGE_PULSE_MS - age) / 500) };
}

export function startForgePulse(previous, color, now) {
    const current = sampleForgePulse(previous, now);
    return { startedAt: now, color, fromColor: current.strength ? current.color : color, fromStrength: current.strength };
}
