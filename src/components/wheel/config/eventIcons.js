/*
 * The five global events' icons, in one place.
 *
 * The companion to `EVENT_IDENTITY` in constants.js, which carries the name and
 * the colour. They are two modules rather than one because a constants file that
 * imports components stops being a constants file — `EVENT_IDENTITY` is read by
 * plain logic and must stay importable without dragging a component library in
 * behind it.
 *
 * ── WHY THIS EXISTS AT ALL, GIVEN THAT ARGUMENT ──────────────────────────────
 *
 * When `EVENT_IDENTITY` was written, the icon deliberately stayed local to
 * `EventSelectionWheel`: one consumer is not a fork, and each surface arguably
 * wants its own icon at its own size. There are three now — the selection wheel,
 * the odds board's event register and the event log — and three copies of
 * "which glyph is First Blood" is exactly the shape the identity table was
 * written to end. The size is still each surface's own call; only the glyph is
 * shared.
 *
 * ── AND WHY THE GLYPH IS LOAD-BEARING ────────────────────────────────────────
 *
 * THE PARLOUR's green (#19B36B) and the Community Goal's teal (#2DD4BF) are the
 * closest pair in the identity table, and every surface that lists all five has
 * to separate them by something other than hue. The icon is that something. It
 * is not decoration on any of the three, which is why it is shared rather than
 * left to each surface to pick.
 */

import { TrainFront, Crown, Crosshair, Target, CircleDot } from 'lucide-react';

export const EVENT_ICONS = {
    arrival: TrainFront,
    king_of_wheel: Crown,
    first_blood: Crosshair,
    community_goal: Target,
    roulette: CircleDot,
};

export default EVENT_ICONS;
