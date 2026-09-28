import React from 'react';
import { itemName, itemSrc } from '../data/atlas.js';

/**
 * The plugin's bossbar, drawn: where a player reads the item they are hunting.
 *
 * TimerManager.itemLabel sets the name in bold on a green gradient with the item's
 * icon after it (the icon comes from the resource pack through unicodeItems.json),
 * over a full white bar in six notches (BossBar.Color.WHITE, Overlay.NOTCHED_6).
 * With Force Chain on it appends the next item after a grey arrow, which this draws
 * as the wiki's own track and pixel arrowhead: the game's arrow is a text glyph, and
 * U+27A1 renders as a colour emoji on half the platforms that would show it here.
 *
 * Drawn on the ground with no screen around it. The name takes BOSSBAR's one ink,
 * not the game's gradient: see tokens.js. Styles in page.css.
 */
export default function Bossbar({ item, next = null, caption = null, className = '' }) {
    const name = itemName(item);
    const said = next ? `${name}, then ${itemName(next)}` : name;
    return (
        <figure className={`wk-bossbar ${className}`}>
            <div className="wk-bossbar-draw" aria-hidden="true">
                <div className="wk-bossbar-title">
                    <Label material={item} />
                    {next && (
                        <>
                            <span className="wk-bossbar-to" />
                            <Label material={next} />
                        </>
                    )}
                </div>
                <div className="wk-bossbar-bar" />
            </div>
            {caption
                ? <figcaption className="wk-small"><span className="wk-sr">Illustration: the bossbar reads {said}. </span>{caption}</figcaption>
                : <span className="wk-sr">The bossbar reads {said}.</span>}
        </figure>
    );
}

function Label({ material }) {
    return (
        <span className="wk-bossbar-item" key={material}>
            <span className="wk-bossbar-name">{itemName(material)}</span>
            <img className="wk-bossbar-icon" src={itemSrc(material)} alt="" width="128" height="128" draggable="false" />
        </span>
    );
}
