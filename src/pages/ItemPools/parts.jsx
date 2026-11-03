import React from 'react';
import { TagGlyph } from '../../wiki/game/items.jsx';
import { STAGES, TAGS } from '../../wiki/tokens.js';
import { STAGE_KEYS, TAG_KEYS, spriteFallback, spriteOf } from './poolData.js';

/* Not the wiki's ItemSlot: that reads the build-time atlas, this page shows the live pool plus staged changes. */

export function Sprite({ material, eager = false }) {
    return (
        <img className="wk-sprite" src={spriteOf(material)} data-material={material} onError={spriteFallback}
             alt="" width="128" height="128" loading={eager ? 'eager' : 'lazy'} decoding="async" draggable="false" />
    );
}

export function Slot({ item, size = 52, className = '', eager }) {
    const tag = item.tags?.includes('END') ? 'END' : item.tags?.includes('NETHER') ? 'NETHER' : item.tags?.includes('EXTREME') ? 'EXTREME' : null;
    return (
        <span className={`wk-slot ${className}`} style={{ '--slot': `${size}px` }}
              data-stage={item.state ? item.state.toLowerCase() : undefined} aria-hidden="true">
            <Sprite material={item.material} eager={eager} />
            {tag && <span className="wk-slot-mark"><TagGlyph tag={tag} /></span>}
        </span>
    );
}

export function StageWord({ state }) {
    if (!state) return null;
    return <span style={{ color: STAGES[state].ink }}>{STAGES[state].label}</span>;
}

export function TagWords({ tags }) {
    if (!tags?.length) return null;
    return tags.map((t) => (
        <span key={t} className="ip-tagword" style={{ color: TAGS[t].ink }}><TagGlyph tag={t} size={9} /> {TAGS[t].label}</span>
    ));
}

export function PoolControls({ state, tags, onChange, disabled = false }) {
    return (
        <div className="ip-poolctl">
            <div className="ip-seg ip-stages" role="radiogroup" aria-label="Stage">
                {STAGE_KEYS.map((s) => (
                    <button key={s} type="button" role="radio" aria-checked={state === s} disabled={disabled}
                            className="ip-stage" data-stage={s.toLowerCase()} onClick={() => onChange(s, tags)}>
                        <span className="ip-stage-name" style={{ color: STAGES[s].ink }}>{STAGES[s].label}</span>
                    </button>
                ))}
            </div>
            <div className="ip-seg ip-tags" role="group" aria-label="Tags">
                {TAG_KEYS.map((t) => {
                    const on = tags.includes(t);
                    return (
                        <button key={t} type="button" aria-pressed={on} disabled={disabled} className="ip-tag"
                                onClick={() => onChange(state, on ? tags.filter((x) => x !== t) : [...tags, t])}>
                            <TagGlyph tag={t} size={10} />
                            <span style={{ color: on ? TAGS[t].ink : undefined }}>{TAGS[t].label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
