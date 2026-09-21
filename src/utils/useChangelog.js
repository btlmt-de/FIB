// ============================================
// The release-note popup's state
// ============================================
//
// Its own file rather than living beside ChangelogModal, for the reason the lint
// rule gives: a module that exports both a component and a hook breaks fast
// refresh, and the modal is the kind of thing you iterate on with the page open.
//
// ── OPEN IS DERIVED, NOT SYNCED ─────────────────────────────────────────────
//
// The first version of this held `isOpen` in state and pushed it true from an
// effect when the popup should fire. That is the shape React's
// `set-state-in-effect` rule exists to catch, and the rule was right here: the
// popup is not an event, it is a *fact* about three things the component already
// knows — has this browser seen the release, has the visitor dismissed it this
// session, and is the page ready to show it. Facts are computed during render.
//
// The version that needed effects also had a subtle bug the derived one cannot
// have: `enabled` can flip from false to true after mount (the username modal
// closes), so an effect had to be armed and disarmed to fire exactly once, and an
// armed flag is another piece of state to get wrong.

import { useCallback, useState } from 'react';
import { LATEST_VERSION, readSeenVersion, markVersionSeen } from '../config/changelog.js';

/**
 * @param {object}  options
 * @param {boolean} options.enabled - false while something else owns the screen.
 *   The popup WAITS rather than being skipped, so a first-time player still sees
 *   the release once their username modal is out of the way.
 */
export function useChangelog({ enabled = true } = {}) {
    // A lazy initialiser, so storage is read once per mount rather than on every
    // render. This is a read, not a side effect — nothing outside the component
    // observes it, which is what makes it legal during render.
    const [hasUnseen, setHasUnseen] = useState(() => readSeenVersion() !== LATEST_VERSION);
    const [dismissed, setDismissed] = useState(false);
    const [manuallyOpen, setManuallyOpen] = useState(false);

    // The whole rule, in one line: it is open if you asked for it, or if there is
    // an unseen release and nothing is in the way and you have not closed it yet.
    const isOpen = manuallyOpen || (enabled && hasUnseen && !dismissed);

    const openChangelog = useCallback(() => setManuallyOpen(true), []);

    // Closing is what marks the release read, whether the visitor met it through
    // the popup or went looking for it in the topbar. Either way they have had the
    // chance to read it, and a mark that only the popup could clear would leave the
    // topbar dot lit forever for anyone who opened it deliberately first.
    const closeChangelog = useCallback(() => {
        setManuallyOpen(false);
        setDismissed(true);
        markVersionSeen(LATEST_VERSION);
        setHasUnseen(false);
    }, []);

    return { isOpen, hasUnseen, openChangelog, closeChangelog };
}
