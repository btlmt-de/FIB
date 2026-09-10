/*
 * THE ARRIVAL's scene, and the one place that names its chunk.
 *
 * `ArrivalTrain3D` is the heaviest thing on this site — 551KB, three.js and a
 * whole locomotive — so it is split out and loaded on demand. Two callers need
 * to name it and they must name it identically:
 *
 *   `ArrivalTheatre` renders it, through `React.lazy`.
 *   `EventSelectionWheel` prefetches it, four seconds before the event exists.
 *
 * The module registry dedupes by resolved specifier, so the prefetch warms the
 * exact chunk the lazy component will ask for rather than a second copy of it —
 * which is only true while both go through this file. That is the whole reason
 * it exists, and it is why the specifier is written once here rather than twice
 * at the call sites.
 *
 * It is also its own module rather than two exports on ArrivalTheatre so that
 * file stays component-only, which is what Fast Refresh needs to hot-reload it
 * instead of remounting the page.
 */

import React from 'react';

export const ArrivalTrain3D = React.lazy(() =>
    import('./ArrivalTrain3D.jsx').then(m => ({ default: m.ArrivalTrain3D }))
);

/**
 * Start fetching the scene before the event exists.
 *
 * The selection wheel spins for four seconds before an arrival is triggered,
 * and this is the only thing on the site that can spend them. Sharing the
 * event's clock (see `epoch` in ArrivalTheatre) means a late chunk no longer
 * desyncs anything — but it does mean the approach is skipped, and the approach
 * is the best part of the event. This is what keeps it.
 *
 * Failures are swallowed: `TrainBoundary` already handles a scene that never
 * arrives, and a prefetch is by definition something nobody is waiting on.
 */
export function prefetchArrivalScene() {
    import('./ArrivalTrain3D.jsx').catch(() => {});
}
