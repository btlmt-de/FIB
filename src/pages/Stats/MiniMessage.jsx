/**
 * MiniMessage → React.
 *
 * The plugin stores achievement titles and descriptions as MiniMessage — `<gold>First</gold>
 * <bold>Blood</bold>` — and the service forwards them verbatim, deliberately: the plugin is the one
 * source of truth for how an achievement is named, and stripping or rewriting the tags downstream
 * would be a second place that decides what the name looks like. So the rendering is the consumer's
 * job, and this is the consumer doing it.
 *
 * ## Scope: a deliberately small subset
 *
 * MiniMessage is a large format — gradients, hover events, click actions, fonts. This renders the
 * part that appears in an achievement title and ignores the rest: named colours and the common
 * decorations (bold, italic, underline, strikethrough). A tag it does not recognise is dropped, not
 * shown raw, so an unhandled `<hover:...>` degrades to plain text rather than leaking angle
 * brackets onto the page. That is the safe direction: a title that loses a colour still reads; a
 * title showing `<hover:show_text:...>` does not.
 *
 * It is intentionally NOT a general MiniMessage parser. Achievement titles are short and use a
 * handful of tags; a full parser would be a dependency and an attack surface for a decorative
 * string. If titles ever start carrying gradients or events, revisit — but do not pre-build for it.
 *
 * ## Why colours map to CSS variables, not hex
 *
 * The sixteen Minecraft named colours have canonical hex values, but dropping those in raw would
 * put `#55FF55` next to a design system built on OKLCH tokens, and the greens would not match. Each
 * colour maps to the nearest existing token where one fits the meaning, and to a tuned OKLCH value
 * where none does, so a rendered title sits in the palette rather than beside it.
 */

import React from 'react';

/*
 * The sixteen named colours, as CSS values. Where the design system already has the right idea
 * (gold means rank/prestige; the rarity ramp owns the purples and blues) the colour points at that
 * token so a title cannot drift from it. The rest are OKLCH renderings of the vanilla colours,
 * tuned to sit in an OKLCH palette rather than the raw sRGB the client uses.
 */
const NAMED_COLORS = {
    black: 'oklch(0.15 0 0)',
    dark_blue: 'oklch(0.35 0.13 265)',
    dark_green: 'oklch(0.50 0.13 150)',
    dark_aqua: 'oklch(0.55 0.08 210)',
    dark_red: 'oklch(0.45 0.18 27)',
    dark_purple: 'oklch(0.45 0.16 310)',
    gold: 'var(--fib-gold)',            // prestige — the one colour the system reserves
    gray: 'oklch(0.72 0 0)',
    dark_gray: 'oklch(0.52 0 0)',
    blue: 'oklch(0.62 0.16 265)',
    green: 'oklch(0.72 0.17 150)',
    aqua: 'oklch(0.80 0.10 210)',
    red: 'oklch(0.62 0.20 27)',
    light_purple: 'oklch(0.70 0.20 330)',
    yellow: 'oklch(0.86 0.15 95)',
    white: 'oklch(0.98 0 0)',
};

/* Decoration tags → the style they apply. Closing tags pop the matching push. */
const DECORATIONS = {
    bold: { fontWeight: 700 },
    b: { fontWeight: 700 },
    italic: { fontStyle: 'italic' },
    i: { fontStyle: 'italic' },
    underlined: { textDecoration: 'underline' },
    u: { textDecoration: 'underline' },
    strikethrough: { textDecoration: 'line-through' },
    st: { textDecoration: 'line-through' },
};

/*
 * A single pass over the string, maintaining a stack of open styles. Each tag pushes or pops; text
 * between tags is emitted as a span carrying the merged style of everything currently open. This is
 * not a validating parser — an unbalanced close is ignored rather than throwing, because a
 * decorative title is never worth failing a profile render over.
 */
const TAG = /<(\/?)([a-z_]+)(?::[^>]*)?>/gi;

export function renderMiniMessage(input) {
    if (input == null || input === '') return null;
    const text = String(input);

    const out = [];
    const stack = [];      // [{ tag, style }]
    let cursor = 0;
    let key = 0;

    const mergedStyle = () => Object.assign({}, ...stack.map((s) => s.style));

    const emit = (slice) => {
        if (!slice) return;
        const style = mergedStyle();
        out.push(
            Object.keys(style).length
                ? <span key={key++} style={style}>{slice}</span>
                : <React.Fragment key={key++}>{slice}</React.Fragment>,
        );
    };

    let match;
    TAG.lastIndex = 0;
    while ((match = TAG.exec(text)) !== null) {
        emit(text.slice(cursor, match.index));
        cursor = match.index + match[0].length;

        const closing = match[1] === '/';
        const name = match[2].toLowerCase();

        const style =
            name === 'color' || name === 'c'
                ? null // <color:name> form is uncommon in titles; the bare <name> form is handled below
                : NAMED_COLORS[name]
                    ? { color: NAMED_COLORS[name] }
                    : DECORATIONS[name] ?? null;

        if (!style) {
            // Unrecognised (reset, hover, unknown): drop the tag, keep rendering. A <reset> also clears
            // the stack, which is the one unrecognised tag worth honouring since titles use it to end a
            // run of colour.
            if (name === 'reset' || name === 'r') stack.length = 0;
            continue;
        }

        if (closing) {
            // Pop the nearest matching open tag. An unmatched close is ignored.
            for (let i = stack.length - 1; i >= 0; i--) {
                if (stack[i].tag === name) {
                    stack.splice(i, 1);
                    break;
                }
            }
        } else {
            stack.push({ tag: name, style });
        }
    }

    emit(text.slice(cursor));
    return out;
}

/**
 * The same, flattened to plain text — every tag removed, the words kept. For the places a title
 * has to be a string rather than nodes: an aria-label, a document title, a search index.
 */
export function stripMiniMessage(input) {
    if (input == null) return '';
    return String(input).replace(TAG, '');
}
