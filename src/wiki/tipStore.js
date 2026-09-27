/*
 * The one item tooltip's state. Module state rather than context: a region grid can
 * hold a hundred slots, and none of them should re-render because a different one
 * was hovered. Slots publish what they point at; TooltipLayer (items.jsx) draws it.
 */

let tip = null;
const listeners = new Set();

const setTip = (next) => { tip = next; listeners.forEach((l) => l()); };

export const subscribeTip = (l) => { listeners.add(l); return () => listeners.delete(l); };
export const getTip = () => tip;

/** `family` is { name, members } when the slot stands for a whole family. */
export function showTip(material, el, family = null) {
    if (!el) return;
    setTip({ material, family, rect: el.getBoundingClientRect() });
}

export function hideTip(material) {
    if (!tip || (material && tip.material !== material)) return;
    setTip(null);
}
