/* Only reachable items are vendored into public/fib-items, so a missing sprite falls back to the pack on GitHub, then the barrier. */

const REMOTE = 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib';

export const spriteOf = (material) => `/fib-items/${material.toLowerCase()}.png`;

export function spriteFallback(e) {
    const img = e.currentTarget;
    const m = img.dataset.material;
    if (!img.dataset.tried && m) { img.dataset.tried = '1'; img.src = `${REMOTE}/${m.toLowerCase()}.png`; return; }
    img.onerror = null;
    img.src = '/fib-items/barrier.png';
}
