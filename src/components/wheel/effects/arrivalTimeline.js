/*
 * THE ARRIVAL's timeline, in seconds, in one place.
 *
 * Two components animate against these beats — the canvas that draws the reel
 * shutting down and the train pulling in, and the manifest board whose drums
 * resolve afterwards — and they are in different parts of the tree with no
 * parent between them worth threading a callback through.
 *
 * The first build had the canvas call `onUnloaded` and the board wait for it,
 * which worked and then stopped being possible the moment the canvas moved into
 * the reel mount inside WheelSpinner while the board stayed in the banner slot.
 * Two clocks reading one table is the honest version of that: they cannot drift,
 * because there is only one set of numbers.
 *
 *   SHUTTER   0.00–1.30   the reel's slots close, the band goes dark
 *   APPROACH  1.30–3.60   platform lamps up, a headlight grows, the train slides
 *                         in shedding speed
 *   SETTLE    3.60–4.20   it stops; the brakes let go a breath of steam
 *   UNLOAD    4.20–6.40   one crate per player arcs down onto the platform
 *   MANIFEST  7.30–~9.0   the board's drums resolve, one row at a time
 *   HOLD      ~9.0–12.5   the train waits with its lamps lit
 *   DEPART    12.5–16.5   it pulls out and clears the frame completely
 *   EMPTY     16.5–16.9   a beat of platform with nobody on it
 *   FADE      16.9–17.4   the station goes dark, leaving a plain band
 *   LIFT      17.4–18.4   the shutters roll up tile by tile, reel comes back
 *
 * ── WHY THE END TAKES ITS TIME ───────────────────────────────────────────────
 *
 * The first cut faded the whole scene out starting 1.2s before T_GONE, so the
 * platform dissolved while the train was still moving and the departure never
 * actually happened — the owner's note was that it "should fully drive away".
 * Now nothing fades until the train is off the end of the track: it leaves, the
 * platform is briefly empty, and only then do the shutters roll back up. The
 * quiet beat in the middle is what makes the leaving read as an event rather
 * than as a transition.
 *
 * Anything that changes here changes ARRIVAL_DURATION_MS in the wheel backend's
 * globalEvents.js and the clear timeout in ActivityContext, both of which only
 * have to outlast T_GONE — the client's timeline is the real one.
 */

export const T_SHUTTER  = 1.30;
export const T_APPROACH = 3.60;
export const T_SETTLE   = 4.20;
export const T_UNLOAD   = 6.40;
export const T_DEPART   = 12.5;
/** The train is off the end of the track. Nothing has faded yet. */
export const T_GONE     = 16.5;
/** The shutters start rolling back up, and the platform goes with them. */
export const T_LIFT     = 16.9;
/** The reel is fully back and the event is over. */
export const T_LIFT_END = 18.4;

/**
 * How long the 3D platform takes to fade at the end, before the shutters start
 * rolling back up.
 *
 * The two cannot overlap: the WebGL canvas sits ABOVE the shutter, so a blade
 * lifting while the platform is still painted would reveal the station through
 * the gap instead of the reel. The station goes first, leaving a plain dark
 * band, and then the band opens.
 */
export const SCENE_FADE_S = 0.5;

/** The beat between the last crate landing and the first number resolving. */
export const MANIFEST_HEAD_MS = 900;
/** Per row, shrinking on a crowded board so the manifest is always in by DEPART. */
export const ROW_STEP_MAX_MS = 420;
export const ROW_CASCADE_BUDGET_MS = 2600;
