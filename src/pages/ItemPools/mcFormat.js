/**
 * Minecraft's legacy formatting codes, as config.yml's descriptions use them
 * (&b&lName &7| &6Item Information). /info prints each line into chat through
 * translateAmpersandCodes, so this renders a line the way chat will show it.
 *
 * The sixteen colours are the game's own chat colours. They are a drawing of the
 * game's text, the same kind of thing as the tooltip frame, not wiki colours: they
 * are never used for anything but rendering a description.
 *
 * There were two copies of this parser (the page's skipped underline and
 * strikethrough); this is the complete one.
 */

export const MC_COLORS = {
    0: '#000000', 1: '#0000AA', 2: '#00AA00', 3: '#00AAAA',
    4: '#AA0000', 5: '#AA00AA', 6: '#FFAA00', 7: '#AAAAAA',
    8: '#555555', 9: '#5555FF', a: '#55FF55', b: '#55FFFF',
    c: '#FF5555', d: '#FF55FF', e: '#FFFF55', f: '#FFFFFF',
};

export const COLOR_NAMES = {
    0: 'Black', 1: 'Dark Blue', 2: 'Dark Green', 3: 'Dark Aqua',
    4: 'Dark Red', 5: 'Dark Purple', 6: 'Gold', 7: 'Gray',
    8: 'Dark Gray', 9: 'Blue', a: 'Green', b: 'Aqua',
    c: 'Red', d: 'Light Purple', e: 'Yellow', f: 'White',
};

export const FORMAT_CODES = [
    { code: 'l', name: 'Bold' },
    { code: 'o', name: 'Italic' },
    { code: 'n', name: 'Underline' },
    { code: 'm', name: 'Strikethrough' },
    { code: 'r', name: 'Reset' },
];

/** The field lines config.yml's descriptions are made of, as the old editor offered them. */
export const FIELDS = [
    { name: 'Structure', template: '&7Structure: &a', hint: 'Village, Desert Pyramid…' },
    { name: 'Biomes', template: '&7Biomes: &a', hint: 'Desert, Plains…' },
    { name: 'Tool', template: '&7Tool: &a', hint: 'Pickaxe, any (Silk Touch required)…' },
    { name: 'Chance', template: '&7Chance: &a', hint: '25%, 6.7%…' },
    { name: 'Mob drop', template: '&7Mob-Drop: &a', hint: 'Zombie, Ender Dragon…' },
    { name: 'Trading', template: '&7Trading: &a', hint: 'Armorer - Level 2 (Apprentice)…' },
    { name: 'Workstation', template: '&7Workstation: &a', hint: 'Blast Furnace, Brewing Stand…' },
    { name: 'Characteristics', template: '&7Characteristics: &a', hint: 'pink, blue…' },
    { name: 'Empty line', template: '&7', hint: null },
    { name: 'Plain text', template: '&7', hint: 'Custom description text…' },
];

/** The header every description opens with, the one the old editor started from. */
export const headerFor = (displayName) => `&b&l${displayName} &7| &6Item Information`;

const WHITE = '#FFFFFF';

export function parseMc(text) {
    const parts = [];
    let style = { color: WHITE, bold: false, italic: false, underline: false, strike: false };
    let buf = '';
    const push = () => { if (buf) { parts.push({ text: buf, ...style }); buf = ''; } };
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '&' && i + 1 < text.length) {
            const code = text[i + 1].toLowerCase();
            if (code in MC_COLORS) { push(); style = { color: MC_COLORS[code], bold: false, italic: false, underline: false, strike: false }; i++; continue; }
            if (code === 'l') { push(); style = { ...style, bold: true }; i++; continue; }
            if (code === 'o') { push(); style = { ...style, italic: true }; i++; continue; }
            if (code === 'n') { push(); style = { ...style, underline: true }; i++; continue; }
            if (code === 'm') { push(); style = { ...style, strike: true }; i++; continue; }
            if (code === 'r') { push(); style = { color: WHITE, bold: false, italic: false, underline: false, strike: false }; i++; continue; }
            if (code === 'k') { push(); i++; continue; }
        }
        buf += text[i];
    }
    push();
    return parts;
}

export const stripMc = (text) => text.replace(/&[0-9a-fk-or]/gi, '');
