export function forgeStages(tiers = [], progress = 0, specials = 0) {
    return tiers.map((tier, index) => {
        const start = index ? tiers[index - 1].threshold : 0;
        const span = tier.threshold - start;
        const fill = span > 0 ? Math.max(0, Math.min(1, (progress - start) / span)) : 0;
        const pointsMet = progress >= tier.threshold;
        const specialsMet = specials >= (tier.specials || 0);
        return { ...tier, fill, reached: pointsMet && specialsMet,
            gated: pointsMet && !specialsMet,
            pointsShort: Math.max(0, tier.threshold - progress),
            specialsShort: Math.max(0, (tier.specials || 0) - specials) };
    });
}
