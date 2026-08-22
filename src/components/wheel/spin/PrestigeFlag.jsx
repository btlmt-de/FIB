/*
 * The prestige flag, on a spin result.
 *
 * ── WHY THE EXISTING "NEW" BADGE IS NOT ENOUGH ──────────────────────────────
 *
 * The result panel has always answered "is this new to your collection" with a
 * green NEW, and "how many do you have" with a quiet count. During a prestige
 * run both of those go dead in the same moment, and for the same reason: you can
 * only prestige with a *complete* collection, so from the first spin of a run
 * every single pull is a main-collection duplicate. NEW never lights again, and
 * the count only ever climbs.
 *
 * So the one thing a prestiging player actually wants to know — is this the
 * first one of these in the run I am currently filling — was the one thing the
 * result did not say. This is that answer.
 *
 * ── WHY IT IS THE SAME SHAPE AS THE GREEN ONE ───────────────────────────────
 *
 * Deliberately a sibling, not a new invention: same pill, same size, same
 * position in the label row, differing only in colour and in carrying the
 * level's own tier mark — rare's diamond for Rare Prestige, exotic's gem for
 * Exotic Prestige, and the crown only at level 5, where the ladder puts it.
 * A player who has learned what the green badge means gets this one for free. The colour is the prestige level's own, from the shared rarity
 * ladder via `prestigeHelpers` — prestige has never had a palette of its own and
 * does not get one here.
 *
 * Level 5 takes the whole slick through `.fib-holo` rather than a flat colour,
 * for the reason every insane surface does: a single sampled point off that ramp
 * is a lower tier's colour two thirds of the time.
 */

import React from 'react';
import { prestigeColor, prestigeInk, prestigeLabel, prestigeIcon, isIridescentPrestige } from '../../../utils/prestigeHelpers.js';

/**
 * @param {{ level: number, isNew: boolean, count: number }} pull
 * @param {boolean} compact  the phone's shaft, which runs a size down
 */
export function PrestigeFlag({ pull, compact = false, itemName }) {
    if (!pull?.isNew) return null;

    const iridescent = isIridescentPrestige(pull.level);
    const tone = prestigeColor(pull.level);

    return (
        <span
            className={iridescent ? 'fib-holo' : undefined}
            title={`First ${itemName || 'one'} of your ${prestigeLabel(pull.level)}`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.1em',
                padding: compact ? '2px 6px' : '3px 7px',
                borderRadius: '5px',
                background: iridescent ? undefined : `${tone}22`,
                border: iridescent ? 'none' : `1px solid ${tone}55`,
                // Dark ink on the slick, which is bright across its whole ramp;
                // the lifted ink step everywhere else, because this is text.
                color: iridescent ? '#1a1a1a' : prestigeInk(pull.level),
            }}
        >
            {prestigeIcon(pull.level, compact ? 10 : 11)}
            NEW
        </span>
    );
}

/**
 * The run's count for this item, for the quiet metadata row beside "N in
 * collection".
 *
 * Shown only from the second copy onward. On the first one the flag above has
 * already said it, and "1 in prestige" next to a NEW badge is the same fact
 * twice.
 */
export function PrestigeCount({ pull, style }) {
    if (!pull || pull.count < 2) return null;

    return (
        <span style={{ color: prestigeInk(pull.level), ...style }}>
            {pull.count} in prestige
        </span>
    );
}
