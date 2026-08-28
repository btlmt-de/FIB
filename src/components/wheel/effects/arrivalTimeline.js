/*
 * THE ARRIVAL's timeline, in seconds, in one place.
 *
 * Four things animate against these beats — the shutter that closes the reel,
 * the theatre frame that opens out of it, the WebGL station inside that frame,
 * and the manifest board hanging in it — and no two of them are adjacent in the
 * tree. Two clocks reading one table cannot drift, because there is only one set
 * of numbers; four clocks reading it cannot either.
 *
 * The first build had the canvas call `onUnloaded` and the board wait for it,
 * which worked and then stopped being possible the moment the canvas moved into
 * the reel mount inside WheelSpinner while the board stayed in the banner slot.
 * This file is what replaced that callback, and every beat added since has gone
 * here rather than into a new prop.
 *
 *   SHUTTER   0.00–1.30   the reel's slots close, the band goes dark
 *   SCRIM     0.55–1.45   the page dims behind the band
 *   IRIS      1.15–2.35   the band GROWS out of the reel into the cinema frame,
 *                         letterbox bars sliding in top and bottom
 *   APPROACH  1.30–3.60   platform lamps up, a headlight grows, the train slides
 *                         in shedding speed                          — SHOT ONE
 *   SETTLE    3.60–4.20   it stops; the brakes let go a breath of steam
 *   CUT       5.05        — SHOT TWO: down on the platform, level with the crates
 *   UNLOAD    4.20–6.40   one crate per player arcs down onto the platform
 *   LIDS      +0.30 each  the lid throws back and the crate's light gets out
 *   STREAM    +0.55 each  lucky spins fountain out and fly to the board
 *   MANIFEST  6.50–~8.9   each row's drums resolve as its own spins land on it,
 *                         and the head's total after the last of them
 *   CUT       11.60       — SHOT THREE: wide, low, the whole platform
 *   HOLD      ~9.9–12.5   the train waits with its lamps lit
 *   DEPART    12.5–16.5   it pulls out and clears the frame completely
 *   EMPTY     16.5–16.9   a beat of platform with nobody on it
 *   FADE      16.9–17.5   the station goes dark and the frame collapses back
 *                         onto the reel band, taking the scrim with it
 *   LIFT      17.5–18.6   the shutters roll up tile by tile, reel comes back
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
 * ── WHY THE FRAME CLOSES BEFORE THE SHUTTER OPENS ────────────────────────────
 *
 * Three layers stack in the theatre — scrim, shutter, station — and the station
 * is on top, so the order of the exit is forced. The station has to be gone
 * before a blade can lift, or the gap between two blades shows the platform
 * instead of the reel; and the frame has to be back on the reel band before the
 * blades lift, or they roll up off a rectangle that is not the reel. So FADE
 * does all three at once — station out, frame home, scrim out — and only then
 * does the shutter run.
 *
 * Anything that changes here changes ARRIVAL_DURATION_MS in the wheel backend's
 * globalEvents.js, which only has to outlast T_GONE — the client's timeline is
 * the real one. ActivityContext no longer carries a copy: it imports T_LIFT_END.
 */

export const T_SHUTTER  = 1.30;
export const T_APPROACH = 3.60;
export const T_SETTLE   = 4.20;
export const T_UNLOAD   = 6.40;
export const T_DEPART   = 12.5;
/** The train is off the end of the track. Nothing has faded yet. */
export const T_GONE     = 16.5;
/** The station fades, the frame collapses home, the scrim goes. */
export const T_LIFT     = 16.9;
/** The blades start rolling up. Nothing may be painted over them by now. */
export const T_SHUTTER_LIFT = 17.5;
/** The reel is fully back and the event is over. */
export const T_LIFT_END = 18.6;

/**
 * How long the exit takes: the 3D platform fading, the frame collapsing back
 * onto the reel band, and the scrim lifting off the page. All three run
 * together over this window, and all three must be finished before a blade
 * moves — see the note above.
 */
export const SCENE_FADE_S = 0.6;

/* ── THE THEATRE ─────────────────────────────────────────────────────────────
 *
 * The frame does not appear; it grows out of the band the player was already
 * looking at. It starts life at the reel mount's own rectangle, which is why
 * the shutter closing reads as continuous with it — the same pixels, still
 * where they were — and only then does it open out over the column.
 *
 * The scrim leads it by half a second on purpose. A page that dims first and
 * then opens a frame reads as the lights going down before the curtain; both
 * at once reads as a modal.
 */
export const T_SCRIM      = 0.55;
export const T_SCRIM_END  = 1.45;
export const T_IRIS       = 1.15;
export const T_IRIS_END   = 2.35;

/* ── THE SHOTS ───────────────────────────────────────────────────────────────
 *
 * Three, and the transitions are CUTS rather than moves.
 *
 * A camera that flies from a wide to a close-up is a camera the viewer is
 * watching; a cut is one they are not. Interpolating between the two framings
 * also spends four seconds passing through every framing in between, none of
 * which is the shot — and on a fifteen-second event there is no four seconds to
 * spend. Each shot carries its own slow push instead, so the frame is never
 * still and never travelling.
 *
 * SHOT_TWO lands 0.85s into the unload, so the first crate comes down in the
 * wide and the rest come down in the close. SHOT_THREE lands before the train
 * moves, so the departure is seen whole.
 */
export const SHOT_TWO   = 5.05;
export const SHOT_THREE = 11.60;

/**
 * The order everything reads the manifest in: smallest crate first, ties broken
 * by name so it is stable rather than dependent on however the server happened
 * to enumerate the platform.
 *
 * It lives in the timeline file because it IS a timing decision. The board
 * climbs so that the last drum to settle is the largest number on it, and the
 * crates now come off the train in that same order, so wagon `i` carries row
 * `i`'s crate and the biggest payout is both the last thing unloaded and the
 * last thing to resolve. Three components index into one sorted array; a second
 * sort anywhere would silently pair a row with somebody else's crate.
 */
export function sortManifest(manifest) {
    return [...manifest].sort(
        (a, b) => a.crate - b.crate || String(a.username).localeCompare(String(b.username))
    );
}

/* ── THE CRATES, AND WHAT COMES OUT OF THEM ──────────────────────────────────
 *
 * A crate lands, and 0.30s later its lid throws back. The delay is the whole
 * difference between a box arriving and a box being opened: they used to be the
 * same frame, and a lid that is already open when the crate touches down is a
 * crate that was never shut.
 *
 * The spins leave 0.25s after that, which is the beat where the light gets out
 * before anything does.
 */
export const LID_DELAY_S    = 0.30;
export const LID_OPEN_S     = 0.45;
export const STREAM_DELAY_S = 0.55;
/** How long one spin takes to fly from its crate to its row on the board. */
export const STREAM_FLIGHT_S = 1.15;
/** Spread of one crate's stream, so a 15 does not arrive as a single clump. */
export const STREAM_SPREAD_S = 0.70;
/** How long a crate takes to arc down onto the paving once its beat comes. */
export const CRATE_FALL_S = 0.60;

/**
 * How many crates the train can physically carry.
 *
 * A cap, not a count: the consist is one wagon per player and a fifteen-player
 * arrival would be a train longer than any frame that could hold it. Beyond
 * this the extra rows still appear on the board and still resolve on the beat
 * `rowLandsAt` gives them — they simply have no crate of their own to have come
 * out of, which is the honest failure. It lives here rather than in the scene
 * because the board has to know it too: a row with no crate gets no stream.
 *
 * This server is designed around three or four players on the platform.
 */
export const MAX_CRATES = 8;

/**
 * When crate `i` of `n` starts falling. One function, because four things read
 * it: the scene animates the arc, the overlay knows when to start a stream, the
 * board knows when its row is paid, and the reduced-motion path skips all three.
 */
export function crateFallsAt(i, n) {
    return T_SETTLE + i * ((T_UNLOAD - T_SETTLE) / Math.max(1, n));
}

/**
 * When row `i` of `n` may resolve its number: the moment its spins have actually
 * arrived on the board.
 *
 * ── WHY THIS IS DERIVED AND NOT A CASCADE ───────────────────────────────────
 *
 * It used to be `T_UNLOAD + 900ms + i × step` — a cascade that started after the
 * LAST crate was down and then ran on its own rhythm. That was right while a
 * crate landing was the end of the story. Now every crate throws its lid, and
 * what comes out of it flies to a specific row, so the number can be tied to the
 * thing arriving instead of to a clock that resembles it. A row resolving before
 * its own spins land is the animation contradicting itself, which is the same
 * failure the 900ms was there to prevent, one layer deeper.
 *
 * At 0.75 of the flight rather than 1.0: the drums start turning as the stream
 * arrives, not after the last mote of it, so the number is settling while the
 * light is still coming in.
 */
export function rowLandsAt(i, n) {
    return crateFallsAt(i, n) + CRATE_FALL_S + LID_DELAY_S + STREAM_DELAY_S + STREAM_FLIGHT_S * 0.75;
}

/**
 * And the total last of all, a beat after the final row.
 *
 * The head used to resolve 200ms after the board appeared, which meant the
 * biggest number on it was finished before a single crate was down and the rows
 * underneath spent four seconds catching up to something already known. It is
 * the sum; it lands when it has something to be the sum of.
 */
export function totalLandsAt(n) {
    return rowLandsAt(Math.max(0, n - 1), n) + 0.45;
}
