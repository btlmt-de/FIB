import { useEffect, useState } from 'react';

/**
 * The wheel surface's breakpoints, in one place, written once.
 *
 * ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
 *
 * There were three copies of "is this mobile" on one surface and they did not
 * agree:
 *
 *   WheelPage.jsx      innerWidth < 1400   grid template, banners, ticker, meter
 *   WheelSpinner.jsx   innerWidth < 600    reel, stage, flanks, result, takeovers
 *   (and the prop between them, which was never read)
 *
 * WheelPage passed `isMobile={isMobile}` to WheelSpinner and WheelSpinner's
 * signature never destructured it, so the prop was silently dropped and the two
 * halves of the same screen ran 800px apart. **Every viewport from 600 to 1399
 * got full desktop geometry inside a shell with no room for it** — at 760px the
 * 272px stage flanks sat on top of the spin control, the rarity legend was
 * clipped mid-word and the topbar overflowed its own width. That band is every
 * tablet, every phone in landscape, and small laptops.
 *
 * The irony worth preserving: the comment in WheelPage that removed the
 * `.sidebar-left / .sidebar-right` media query says "Two mechanisms tracking one
 * number is how they drift, and they did". It consolidated the two copies inside
 * WheelPage and never learned there was a third one downstairs.
 *
 * So: one module, one hook, no component computes a width itself.
 *
 * ── THE TWO LINES ────────────────────────────────────────────────────────────
 *
 * `PHONE_MAX` (900) is where the portrait experience ends. It is not a device
 * size — it is where the horizontal reel stops being worth having. The desktop
 * band wants at least ~7 tiles at the reel's 120px pitch to read as a length of
 * track rather than a peephole, and it shares its row with the status console;
 * below ~900 the vertical shaft simply shows more of the pool and a far larger
 * sprite. Phones in landscape land here too, which is correct: a 844×390
 * landscape phone has 390px of height, and the portrait layout is the one that
 * survives a short viewport.
 *
 * `FLANKS_MIN` (1200) is measured rather than chosen. The stage flanks are two
 * 272px panels inset `clamp(20px, 5vw, 96px)` from the stage edges, and the
 * result's own content runs to about 420px at a worst-case item name. Two
 * panels, two insets and the payoff need 272×2 + 96×2 + 420 ≈ 1156 before
 * anything touches, so they appear at 1200 and not a pixel earlier. Below that
 * the desktop layout is correct and simply has no flanks — which is the state
 * the surface already supports, because they are absolutely positioned and
 * nothing else depends on them.
 */
export const PHONE_MAX = 900;
export const FLANKS_MIN = 1200;

/**
 * The one place a viewport question is answered.
 *
 * `matchMedia` rather than a resize listener on `innerWidth`: the browser only
 * fires a change when a threshold is actually crossed, so a drag-resize does not
 * re-render the whole wheel on every frame, and the initial value is correct on
 * the first paint instead of after an effect. The old listeners re-rendered
 * WheelPage and WheelSpinner on every resize event while the reel was mid-spin.
 *
 * Returns booleans only. Nothing here hands out a pixel width, because a
 * component that knows the viewport width will eventually branch on it and we
 * are back to four thresholds.
 */
export function useWheelViewport() {
    const read = () => {
        if (typeof window === 'undefined' || !window.matchMedia) {
            return { isPhone: false, hasFlanks: true };
        }
        return {
            isPhone: window.matchMedia(`(max-width: ${PHONE_MAX - 1}px)`).matches,
            hasFlanks: window.matchMedia(`(min-width: ${FLANKS_MIN}px)`).matches,
        };
    };

    const [viewport, setViewport] = useState(read);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const phone = window.matchMedia(`(max-width: ${PHONE_MAX - 1}px)`);
        const flanks = window.matchMedia(`(min-width: ${FLANKS_MIN}px)`);
        const update = () => setViewport({ isPhone: phone.matches, hasFlanks: flanks.matches });
        update();
        phone.addEventListener('change', update);
        flanks.addEventListener('change', update);
        return () => {
            phone.removeEventListener('change', update);
            flanks.removeEventListener('change', update);
        };
    }, []);

    return viewport;
}
