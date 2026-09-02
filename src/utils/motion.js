import { prefersCalm, useCalm } from '../config/power.js';

/**
 * Motion preferences, asked once and in one place.
 *
 * ── THIS FILE IS NOW A RE-EXPORT, AND THE REASON IS ITS OWN ARGUMENT ─────────
 *
 * It was written because the predicate existed twice, byte for byte, in the
 * collection board's flap drums and the prestige ceremony — "two copies of a
 * predicate is how one of them eventually stops matching the other, and this
 * particular predicate decides whether an animation runs at all". Entirely
 * right, and it happened again immediately: this file and `config/power.js`
 * were written on two branches at the same time, each consolidating the same
 * question, and they met at a merge with three copies where there had been two.
 *
 * `power.js` is the one that survives, because it answers a strictly larger
 * question. It carries saver mode — the battery setting — as well as the OS
 * motion preference, and it is what `index.css`, the reel, the star field and
 * every poll on the site already read. Had these two stayed separate, the
 * prestige ceremony and the flap board would have been the only animated things
 * on the surface that kept running with saver mode on, and nobody would have
 * found that except by watching a phone get warm.
 *
 * The names stay because ~14 call sites use them and the names are good. What
 * changes is what they mean: **"reduced motion" here now includes saver mode.**
 * That is the correct reading for every caller — all of them are asking "should
 * this animate?", and the answer is no in both cases.
 *
 * Callers still read it once at mount rather than per frame: it is a media
 * query, a change to it re-renders the tree anyway, and asking inside a rAF loop
 * is a layout query in a hot path. `useCalm` subscribes to both inputs, so a
 * saver toggle mid-session stops these animations the same way an OS preference
 * change does.
 *
 * New code should import from `config/power.js` directly.
 */
export const prefersReducedMotion = prefersCalm;

export const usePrefersReducedMotion = useCalm;
