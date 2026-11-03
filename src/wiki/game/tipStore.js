/* Module state, not context, so hovering one of a hundred slots re-renders none of the others. */

let tip = null;
const listeners = new Set();

const setTip = (next) => { tip = next; listeners.forEach((l) => l()); };

export const subscribeTip = (l) => { listeners.add(l); return () => listeners.delete(l); };
export const getTip = () => tip;

export function showTip(material, el, family = null) {
    if (!el) return;
    setTip({ material, family, rect: el.getBoundingClientRect() });
}

export function hideTip(material) {
    if (!tip || (material && tip.material !== material)) return;
    setTip(null);
}
