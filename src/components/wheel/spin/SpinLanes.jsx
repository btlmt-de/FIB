import React from 'react';
import { COLORS } from '../config/constants';
import { FINAL_INDEX, ITEM_WIDTH, STRIP_HEIGHT } from '../../../config/constants.js';
import { CanvasSpinningStrip } from '../canvas/CanvasSpinningStrip.jsx';

/**
 * The 5x and triple takeovers: parallel tracks on the band.
 *
 * Every lane is a reel — a transit line — and they arrive abreast, one line per
 * spin. The arrangement follows the platform's own orientation: horizontal
 * mini-lines on desktop (five trains pulling in side by side), vertical lanes on
 * mobile, which is what the reel itself does.
 *
 * The old design stacked full-width strips inside a rounded card, with a
 * separate results grid below. The lanes replaced the card; each lane lands its
 * own winner at the platform line, and the readout row in the stage carries what
 * the narrow lanes cannot (names, chance, NEW). Nothing here is a box: what
 * divides two tracks is a seam in the deck, the same register as the band's
 * rails.
 *
 * ── THE TRACKS FILL THE BAND (2026-08-19, owner review) ──────────────────────
 *
 * The first version of this laid the lanes out as a **centred island of fixed
 * widths**: 5 × 200 + 4 × 10 = 1040px inside a band that runs to both screen
 * edges, so four hundred-odd pixels of live deck sat dead on either side and the
 * takeover read as a small widget dropped onto a big stage. That is the one
 * thing an edge-to-edge band cannot do. Three things compounded it and they all
 * had the same cause — a lane was being treated as a little band of its own:
 *
 * 1. **The width.** Lanes are `flex: 1` now and the row fills the band. At
 *    1920 that is ~381px a track for the 5x and ~638px for the triple.
 * 2. **The pitch.** 96px (5x) and 116px (triple) shrank the sprites below the
 *    reel's own scale, so the takeover rendered the same items smaller than the
 *    thing it replaced. There is **one desktop pitch and it is the reel's**
 *    (`ITEM_WIDTH`); the lane count changes how much track you can see, never
 *    how big the items are.
 * 3. **The edges.** Each lane's canvas was drawing the *band's* left/right
 *    vignette — 12% of its own width to black on each side — so a 200px lane
 *    lost ~48px to darkness at both ends and became a peephole. Worse, five of
 *    them in a row is the corduroy failure at lane scale: dark, light, dark,
 *    light. `laneMode` on the canvas suppresses that and runs the top hairline
 *    and floor lip at constant alpha, so the band's edges cross every track as
 *    one line; the outer falloff is drawn once here, at the row.
 *
 * The lanes are the band cut into tracks — not several bands parked next to
 * each other.
 */

/**
 * The one geometry for the lane takeovers, owned here so the animation code in
 * WheelSpinner and the drawing code in this component can never disagree about
 * the pitch again. (They did: the animation targeted the old card widths — 120
 * desktop / 58 mobile for the 5x, 90 / 70 for the triple — while the lanes drew
 * at 96 / 56 and 116 / 78, so at rest the winning tile was one or two strips
 * away from the platform line and the 5x lanes read entirely empty.)
 *
 * Desktop is `ITEM_WIDTH` for both modes: the tracks are wide enough that the
 * pitch is free, so it takes the reel's own and the sprite scale never changes
 * between a normal spin and a bonus one.
 *
 * Mobile is the exception, because there the *lane width* is the constraint and
 * it moves with the lane count — five vertical lanes across a 360px phone leave
 * about 65px each, so the 5x cannot take the reel's 70. It is 64 (was 56, which
 * was the compressed case); the triple keeps 78, which its ~120px lanes carry
 * comfortably.
 */
export const LANE_PITCH = (isMobile, isTripleLucky) =>
    isMobile
        ? (isTripleLucky ? 78 : 64)
        : ITEM_WIDTH;

/**
 * The track seam's width, exported because the stage's readout row lays itself
 * out on the same grid — plaque N has to sit under track N, and it can only do
 * that if it subtracts the same seams from the same width. See LaneResultsRow.
 */
export const LANE_SEAM = (isMobile) => (isMobile ? 4 : 7);

export const LANE_HEIGHT = (isMobile) => (isMobile ? 260 : STRIP_HEIGHT);

/**
 * The seam between two tracks.
 *
 * Deeper than the per-slot seam inside a lane and it has to be: a slot boundary
 * and a track boundary in the same register would leave five reels reading as
 * one. So it is a wider dark channel with its own lit edge — but built from the
 * same rule, which is that a groove is only visible where light reaches it.
 *
 * **Widened on owner review**: at 3px, bottom-weighted from 35%, the division
 * was there but you had to look for it, and the point of five tracks is that you
 * do not. It is now a real channel — 7px desktop, 4px mobile — read as *unlit
 * band* rather than as a drawn line: the dark core does the separating and the
 * lit edge only tells you the two faces meet. That is the important distinction
 * and the reason this did not simply get a brighter stroke. A bright 1px rule
 * every 380px is a frame around each track, which is the boxes the whole surface
 * refuses; an unlit gutter is two pieces of deck with a cut between them.
 *
 * The corduroy warning in DESIGN.md is about the *slot* pitch — fifteen channels
 * across a screen turns the band into stripes. Four is structure, and the tier
 * washes stop at 88% of their column anyway, so the light never reaches the
 * channel to begin with.
 *
 * On desktop everything is lit from the floor, so the seam fades to nothing at
 * the top of the band and reaches full strength at the lip; it now starts from
 * 20% rather than 35% because a channel this wide reading as a short stub at the
 * bottom looked like a chip in the deck rather than a cut through it. On mobile
 * the light travels with each tile rather than pooling at the floor, so it fades
 * symmetrically at both ends instead — a bottom-weighted seam there would be a
 * groove with no light in it.
 */
function TrackSeam({ isMobile }) {
    const w = LANE_SEAM(isMobile);
    // The lit edge is the last pixel; everything before it is the channel.
    const lit = w - 1;
    return (
        <div
            aria-hidden="true"
            style={{
                alignSelf: 'stretch',
                flex: `0 0 ${w}px`,
                width: `${w}px`,
                background: `linear-gradient(90deg, rgba(0,0,0,0.62) 0 1px, rgba(0,0,0,0.82) 1px ${lit}px, rgba(190,198,220,0.20) ${lit}px ${w}px)`,
                WebkitMaskImage: isMobile
                    ? 'linear-gradient(180deg, transparent 0%, #000 14%, #000 86%, transparent 100%)'
                    : 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.35) 20%, #000 72%, #000 100%)',
                maskImage: isMobile
                    ? 'linear-gradient(180deg, transparent 0%, #000 14%, #000 86%, transparent 100%)'
                    : 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.35) 20%, #000 72%, #000 100%)',
            }}
        />
    );
}

export function SpinLanes({
    laneCount = 5,
    isTripleLucky = false,
    strips = [],
    offsetRefs = null,
    isSpinning = false,
    isResult = false,
    isMobile = false,
    accentColor = COLORS.gold,
    goldRushBoostedRarity = null,
}) {
    const laneIndices = [...Array(laneCount).keys()];
    const height = LANE_HEIGHT(isMobile);
    const pitch = LANE_PITCH(isMobile, isTripleLucky);

    return (
        <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'stretch',
            width: '100%',
            height: `${height}px`,
        }}>
            {laneIndices.map((laneIdx) => (
                <React.Fragment key={laneIdx}>
                    <div style={{
                        position: 'relative',
                        // The whole fix in one declaration: the tracks divide the
                        // band between them instead of sitting in the middle of
                        // it. `minWidth: 0` because a flex item's default
                        // `min-width: auto` would let the canvas's measured width
                        // hold the row open.
                        flex: '1 1 0',
                        minWidth: 0,
                        height: '100%',
                        overflow: 'hidden',
                        borderRadius: 0,
                    }}>
                        <CanvasSpinningStrip
                            items={strips[laneIdx] || []}
                            offsetRef={offsetRefs
                                ? { get current() { return offsetRefs.current[laneIdx] || 0; } }
                                : undefined}
                            isMobile={isMobile}
                            isSpinning={isSpinning}
                            isResult={isResult}
                            spinProgress={0}
                            isRecursion={false}
                            laneMode
                            // No `stripWidth`: the track's width is whatever the
                            // flex row gives it, and the canvas measures its own
                            // box. Passing a number here is what pinned the old
                            // island open.
                            stripHeight={height}
                            finalIndex={FINAL_INDEX}
                            accentColor={accentColor}
                            itemWidthOverride={pitch}
                            isLuckySpin={isTripleLucky}
                            goldRushBoostedRarity={isTripleLucky ? null : goldRushBoostedRarity}
                        />
                    </div>
                    {laneIdx < laneCount - 1 && <TrackSeam isMobile={isMobile} />}
                </React.Fragment>
            ))}

            {/* The platform line — mobile only, and one line for the whole row.
                It was five: each lane drew its own 3px glow plus a pair of
                pointers, so a 5x on a phone put five bars and ten arrows on a
                260px band. The comment beside it already claimed it was "one
                line all the lanes share"; it is now. Desktop needs none of this
                — each track's detent is its canvas's own, seated in the band's
                edges, and a DOM line over the sprite is the exact thing the
                detent replaced. */}
            {isMobile && (
                <>
                    <div aria-hidden="true" style={{
                        position: 'absolute',
                        left: 0, right: 0, top: '50%', transform: 'translateY(-50%)',
                        height: '3px',
                        backgroundImage: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                        zIndex: 10,
                        boxShadow: `0 0 12px ${accentColor}, 0 0 24px ${accentColor}88`,
                        pointerEvents: 'none',
                    }} />
                    <div aria-hidden="true" style={{
                        position: 'absolute',
                        left: '-1px', top: '50%', transform: 'translateY(-50%)',
                        width: 0, height: 0,
                        borderTop: '6px solid transparent', borderBottom: '6px solid transparent',
                        borderLeft: `8px solid ${accentColor}`,
                        zIndex: 11,
                        filter: `drop-shadow(0 0 6px ${accentColor})`,
                    }} />
                    <div aria-hidden="true" style={{
                        position: 'absolute',
                        right: '-1px', top: '50%', transform: 'translateY(-50%)',
                        width: 0, height: 0,
                        borderTop: '6px solid transparent', borderBottom: '6px solid transparent',
                        borderRight: `8px solid ${accentColor}`,
                        zIndex: 11,
                        filter: `drop-shadow(0 0 6px ${accentColor})`,
                    }} />
                </>
            )}

            {/* The band's falloff into the page, drawn once for the row.
                Same 12% / rgba(0,0,0,0.5) the reel's canvas draws for itself —
                it belongs to the band, so with the band cut into tracks it moves
                up here rather than being repeated per track. Below the street
                glow (z-index 3 on the strip container), above the canvases. */}
            {!isMobile && (
                <>
                    <div aria-hidden="true" style={{
                        position: 'absolute', top: 0, bottom: 0, left: 0, width: '12%',
                        background: 'linear-gradient(90deg, rgba(0,0,0,0.5), rgba(0,0,0,0))',
                        zIndex: 2,
                        pointerEvents: 'none',
                    }} />
                    <div aria-hidden="true" style={{
                        position: 'absolute', top: 0, bottom: 0, right: 0, width: '12%',
                        background: 'linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0.5))',
                        zIndex: 2,
                        pointerEvents: 'none',
                    }} />
                </>
            )}
        </div>
    );
}

export default SpinLanes;
