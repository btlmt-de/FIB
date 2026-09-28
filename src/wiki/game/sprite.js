/**
 * An item's sprite, and what to do when it is missing.
 *
 * Pool items are vendored into public/fib-items. An item outside the pool may not be
 * (vendor-textures copies the reachable set), so a sprite that fails falls back to
 * the resource pack on GitHub, then to the barrier, the game's own "no such item".
 * Shared by Item Pools and Custom Content, which both draw items the atlas does not
 * hold.
 */

const REMOTE = 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib';

export const spriteOf = (material) => `/fib-items/${material.toLowerCase()}.png`;

export function spriteFallback(e) {
    const img = e.currentTarget;
    const m = img.dataset.material;
    if (!img.dataset.tried && m) { img.dataset.tried = '1'; img.src = `${REMOTE}/${m.toLowerCase()}.png`; return; }
    img.onerror = null;
    img.src = '/fib-items/barrier.png';
}
