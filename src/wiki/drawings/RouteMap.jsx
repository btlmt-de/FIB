import React from 'react';
import { ItemSlot } from '../game/items.jsx';
import { itemName, stageOf } from '../data/atlas.js';
import { countLabel, shownRoutes } from '../data/routes.js';
import { STAGES } from '../tokens.js';
import './routemap.css';

/*
 * Every column but the label's is a fixed width, so the board keeps the same geometry for every item dealt.
 * Plugin rules (already have it, skip) are dashed; Minecraft's routes are solid.
 */

const MAX_FACES = 2;

const ingText = (c) => `${countLabel(c.n, c.label.toLowerCase())}${c.alt ? ' (or an alternative)' : ''}`;

function sentence(route, name) {
    if (route.chain) {
        const makes = route.yields > 1 ? `, makes ${route.yields}` : '';
        return `${route.verb}: ${route.chain.map(ingText).join(' + ')} at a ${route.station[1]}${makes}.`;
    }
    const src = route.sources.map((s) => `${s.label}${s.odds ? ` (${s.odds})` : ''}`).join(', ');
    return `${route.verb} ${name}: ${src}.`;
}

const CheckGlyph = ({ size = 9 }) => (
    <svg viewBox="0 0 7 7" width={size} height={size} shapeRendering="crispEdges" aria-hidden="true">
        <path d="M6 1h1v2h-1v1h-1v1h-1v1h-2v-1h-1v-1h-1v-1h2v1h1v-1h1v-1h1z" fill="currentColor" />
    </svg>
);

const Track = ({ arrive }) => (
    <span className="rt-cell rt-t1" aria-hidden="true"><span className="rt-line" data-arrive={arrive || undefined} /></span>
);

/* Meeting the collector is a join, so no arrowhead. */
const Bus = ({ arrive }) => (
    <span className="rt-cell rt-bus" aria-hidden="true"><span className="rt-line" data-arrive={arrive || undefined} /></span>
);

function Node({ children, cap }) {
    return (
        <span className="rt-node">
            {children}
            {cap && <span className="rt-cap">{cap}</span>}
        </span>
    );
}

function Tool({ slot, name, meta }) {
    return (
        <span className="rt-cell rt-act" aria-hidden="true">
            <span className="rt-tool">
                {slot}
                <span className="rt-tool-text">
                    <span className="rt-tool-name">{name}</span>
                    {meta && <span className="rt-tool-meta">{meta}</span>}
                </span>
            </span>
            <span className="rt-line rt-fill" />
        </span>
    );
}

function Sources({ route, material }) {
    if (route.chain) {
        return route.chain.map((c, i) => (
            <React.Fragment key={`${c.m}-${i}`}>
                {i > 0 && <span className="rt-op">+</span>}
                <Node cap={c.label.startsWith('any ') ? 'any kind' : null}>
                    <span className="rt-ing">
                        <ItemSlot material={c.m} size={56} />
                        {c.n > 1 && <span className="wk-count">{c.n}</span>}
                    </span>
                </Node>
            </React.Fragment>
        ));
    }
    const rest = route.sources.length - MAX_FACES;
    return (
        <>
            {route.sources.slice(0, MAX_FACES).map((s, i) => (
                <Node key={`${s.label}-${i}`} cap={<>{s.short ?? s.label}{s.odds && <span className="rt-odds">{s.odds}</span>}</>}>
                    {s.m
                        ? <ItemSlot material={s.m} size={56} tip={s.m === material} marks={false} />
                        : <span className="wk-slot" style={{ '--slot': '56px' }} />}
                </Node>
            ))}
            {rest > 0 && <span className="rt-more">+{rest}</span>}
        </>
    );
}

function Via({ route }) {
    const via = route.chain ? [route.station[0], route.station[1]] : route.via;
    if (!via) {
        return (
            <span className="rt-cell rt-act rt-act--pass" aria-hidden="true">
                <span className="rt-line" /><span className="rt-junction" />
            </span>
        );
    }
    const name = via[1].charAt(0).toUpperCase() + via[1].slice(1);
    const meta = route.yields > 1 ? `makes ${route.yields}` : null;
    return <Tool slot={<ItemSlot material={via[0]} size={56} tip={false} marks={false} />} name={name} meta={meta} />;
}

export default function RouteMap({ material, jokers, calm }) {
    const routes = shownRoutes(material);
    const stage = stageOf(material);
    const name = itemName(material);
    const found = stage ? STAGES[stage].light : undefined;
    return (
        <div className="rt" style={{ '--found': found }}>
            {/* First in the source so it is read before the list; the grid places it on the right. */}
            <div className="rt-dest">
                <span className="rt-dest-name">{name}</span>
                <span className="rt-dest-slot"><ItemSlot material={material} size={80} /></span>
                {stage && (
                    <span className="rt-dest-stage">
                        <span style={{ color: STAGES[stage].ink }}>{STAGES[stage].label}</span> item, handed to you
                    </span>
                )}
            </div>

            {/* Keyed by the item, so a new deal redraws the lanes instead of morphing them. */}
            <ol className="rt-lanes rt-ways" key={material} data-calm={calm || undefined} aria-label={`Ways to get ${name}`}>
                {routes.map((r, i) => (
                    <li key={r.kind} className="rt-lane" style={{ '--i': i }}>
                        <span className="rt-cell rt-label" aria-hidden="true"><span className="rt-mark" /><span className="rt-label-text">{r.verb}</span></span>
                        <span className="rt-cell rt-src" data-n={r.chain?.length > 3 ? r.chain.length : undefined} aria-hidden="true">
                            <Sources route={r} material={material} />
                        </span>
                        <Track arrive={Boolean(r.chain || r.via)} />
                        <Via route={r} />
                        <Bus />
                        <span className="wk-sr">{sentence(r, name)}</span>
                    </li>
                ))}

                <li className="rt-lane rt-rule rt-rule-first" style={{ '--i': routes.length }}>
                    <span className="rt-cell rt-label" aria-hidden="true">
                        <span className="rt-mark" />
                        <span className="rt-label-text">Already have it<span className="rt-label-meta">FIB rule</span></span>
                    </span>
                    <span className="rt-cell rt-src" aria-hidden="true">
                        {/* The plugin's backpack is a bundle (GameItems.backpack). */}
                        <Node cap="Inventory or backpack"><ItemSlot material="BUNDLE" size={56} tip={false} marks={false} /></Node>
                    </span>
                    <Track arrive />
                    <Tool slot={<span className="wk-slot rt-check" style={{ '--slot': '56px' }}><CheckGlyph size={22} /></span>}
                          name="Already held" meta="+1 instantly" />
                    <Bus />
                    <span className="wk-sr">Already in your inventory or backpack? It counts the moment it is handed to you, +1 instantly.</span>
                </li>
            </ol>

            <ul className="rt-lanes rt-skip" key={`skip-${material}`} data-calm={calm || undefined} aria-label="Or skip it">
                <li className="rt-lane rt-rule" style={{ '--i': routes.length + 1 }}>
                    <span className="rt-cell rt-label" aria-hidden="true">
                        <span className="rt-mark" />
                        <span className="rt-label-text">Skip<span className="rt-label-meta">FIB rule</span></span>
                    </span>
                    <span className="rt-cell rt-src" aria-hidden="true">
                        <Node cap="This item"><span className="rt-skipped"><ItemSlot material={material} size={56} tip={false} marks={false} /></span></Node>
                    </span>
                    <Track arrive />
                    <Tool slot={<span className="wk-slot" style={{ '--slot': '56px' }}><img className="wk-sprite" src="/fib-custom/barrier.png" alt="" /></span>}
                          name="Joker" meta={`1 of ${jokers} this round`} />
                    <Bus arrive />
                    <span className="rt-cell rt-out" aria-hidden="true">
                        <Node cap="Next random item">
                            <span className="wk-slot rt-unknown" style={{ '--slot': '64px' }}>?</span>
                        </Node>
                    </span>
                    <span className="wk-sr">Too far from anything above? Spend a joker, one of {jokers}, and take the next item.</span>
                </li>
            </ul>
        </div>
    );
}
