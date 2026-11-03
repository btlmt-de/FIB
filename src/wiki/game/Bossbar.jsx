import React from 'react';
import { itemName, itemSrc } from '../data/atlas.js';

/* Mirrors TimerManager.itemLabel (WHITE, NOTCHED_6). Force Chain's arrow is drawn as a track because U+27A1 renders as a colour emoji on many platforms. */
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
