import React from 'react';
import { ItemSlot } from '../game/items.jsx';
import { itemName, stageOf } from '../data/atlas.js';
import { countLabel, shownRoutes } from '../data/routes.js';
import { STAGES } from '../tokens.js';
import './routemap.css';

/*
 * The route board: one item, every real way to get it.
 *
 * This is the page's answer to "what is ForceItemBattle": the game hands you an item
 * and Minecraft is the solution space. The item appears ONCE, on the right, and every
 * way leads into it:
 *
 *   LABEL   [what you start from] ── [what you use] ──┐
 *   LABEL   [what you start from] ── [what you use] ──┼──> [ THE ITEM ]
 *   LABEL   [what you start from] ── [what you use] ──┘
 *
 * Every lane has the same columns, and every column but the label's is a FIXED width,
 * so the board has the same geometry for every item you could be dealt: every lane's
 * first source starts at the same x, every tool stands at the same x, every track
 * meets the collector at the same x, on this item and the next. That is what makes it
 * read as one routing board rather than several diagrams stacked up. A lane with
 * fewer sources than the widest starts its track sooner. The sources column is sized
 * for three ingredients, which is all but three recipes in the pool (a crossbow and a
 * cake take four, rabbit stew five); those step their slots down to fit.
 *
 * *Two alignments came before this.* The sources were right-aligned so every first
 * track was the same length, which gave each lane a different starting x. Then they
 * were left-aligned in a column sized to the item's widest lane, so the whole board
 * shifted with every deal. The owner read both as randomly aligned; fixed columns are
 * what finally hold still.
 *
 * "Already have it" joins the collector too, dashed, because it ends with the same
 * item. "Skip" does not: it is set apart as its own short list under the board and
 * ends in a "?", the next random item, because skipping is the one option that does
 * not get you this item.
 *
 * Semantics stay different on the shared grid. Minecraft's routes are solid; the two
 * plugin rules (true of every item) are dashed and sit under a rule. A recipe's middle
 * is its station, loot's a chest, brushing a brush, trading emeralds; a route with no
 * tool (mine, hunt, fish) passes through a plain junction rather than having a tool
 * invented for it. An arrowhead appears only where a track arrives at a slot: into a
 * tool, into the item, into the "?". A lane meeting the collector is a join, not an
 * arrival, so it has none.
 *
 * *This replaced an advancement tree, then a looser row layout, then a board that
 * ended every lane in its own copy of the item.* The tree hung routes off a spine as
 * Handjet verbs over sentences and read as a developer's flowchart. The first row
 * layout let each lane size itself, so the board looked assembled from parts; the
 * shared subgrid fixed that. The board after it drew the handed item at the end of
 * every lane, five or six times, with a spine down that column from a head lane at
 * the top. The owner asked for the ways to lead to the item and for the item to be
 * shown once; the collector is that.
 *
 * The board spans its whole column. When it stayed at its natural width the section
 * went left-heavy on wide screens, and stretching the tracks to fill it would have
 * brought back the empty roads. The room goes to the nodes instead: what you use is a
 * slot with its name beside it (and what it yields, "makes 3", under the name). Any
 * slack falls between the label and the sources, never into a track.
 *
 * It is not the item pools page. It never lists every source (routes.data.js caps each
 * kind at four and this draws two faces and a count), because the question it answers
 * is "what are my options", not "where is everything". Each lane's whole route is one
 * sentence for a screen reader, and every cell of a lane is hidden from it, so the
 * sentence is all it hears. The item itself is read once, before the list.
 */

const MAX_FACES = 2;

const ingText = (c) => `${countLabel(c.n, c.label.toLowerCase())}${c.alt ? ' (or an alternative)' : ''}`;

/** The route as one sentence, for a screen reader: the board says it to everyone else. */
function sentence(route, name) {
    if (route.chain) {
        const makes = route.yields > 1 ? `, makes ${route.yields}` : '';
        return `${route.verb}: ${route.chain.map(ingText).join(' + ')} at a ${route.station[1]}${makes}.`;
    }
    const src = route.sources.map((s) => `${s.label}${s.odds ? ` (${s.odds})` : ''}`).join(', ');
    return `${route.verb} ${name}: ${src}.`;
}

/** A pixel check, drawn, in whatever colour the context gives it. */
const CheckGlyph = ({ size = 9 }) => (
    <svg viewBox="0 0 7 7" width={size} height={size} shapeRendering="crispEdges" aria-hidden="true">
        <path d="M6 1h1v2h-1v1h-1v1h-1v1h-2v-1h-1v-1h-1v-1h2v1h1v-1h1v-1h1z" fill="currentColor" />
    </svg>
);

/** The first track, sources to what you use. `arrive` puts the arrowhead on it: it ends at a slot. */
const Track = ({ arrive }) => (
    <span className="rt-cell rt-t1" aria-hidden="true"><span className="rt-line" data-arrive={arrive || undefined} /></span>
);

/**
 * The last stretch of a lane. On a way to the item it runs into the collector, which
 * is a join, so no arrowhead; on Skip it runs on into the "?" slot and arrives there.
 */
const Bus = ({ arrive }) => (
    <span className="rt-cell rt-bus" aria-hidden="true"><span className="rt-line" data-arrive={arrive || undefined} /></span>
);

/** A source: its face over its name. Several can stand in one lane, so they stack. */
function Node({ children, cap }) {
    return (
        <span className="rt-node">
            {children}
            {cap && <span className="rt-cap">{cap}</span>}
        </span>
    );
}

/**
 * What you use, as a slot with its name beside it, then the track running on from the
 * end of the name. One per lane, so it has the room to be read.
 */
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
                {/* A tag is shown by one member; say it is any of them. */}
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
                        // The item's own block carries its tooltip: that is where the biomes are.
                        ? <ItemSlot material={s.m} size={56} tip={s.m === material} marks={false} />
                        : <span className="wk-slot" style={{ '--slot': '56px' }} />}
                </Node>
            ))}
            {rest > 0 && <span className="rt-more">+{rest}</span>}
        </>
    );
}

/** What you use: the station, the chest, the brush, the emeralds; or nothing, a junction. */
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
    // What one craft or cut yields belongs to the tool that makes it, now that the
    // item is not repeated at the end of the lane to wear it as a stack count.
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
            {/* The item, once, where every way arrives. First in the source so it is
                read before the list; the grid places it on the right. */}
            <div className="rt-dest">
                <span className="rt-dest-name">{name}</span>
                <span className="rt-dest-slot"><ItemSlot material={material} size={80} /></span>
                {stage && (
                    <span className="rt-dest-stage">
                        <span style={{ color: STAGES[stage].ink }}>{STAGES[stage].label}</span> item, handed to you
                    </span>
                )}
            </div>

            {/* Keyed by the item, so a new deal redraws the lanes rather than morphing
                one item's routes into another's. */}
            <ol className="rt-lanes rt-ways" key={material} data-calm={calm || undefined} aria-label={`Ways to get ${name}`}>
                {routes.map((r, i) => (
                    <li key={r.kind} className="rt-lane" style={{ '--i': i }}>
                        <span className="rt-cell rt-label" aria-hidden="true"><span className="rt-mark" /><span className="rt-label-text">{r.verb}</span></span>
                        {/* How many ingredients, so the rare four- and five-ingredient
                            recipes can step their slots down to fit the fixed column. */}
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
                        {/* The plugin's backpack IS a bundle (GameItems.backpack). */}
                        <Node cap="Inventory or backpack"><ItemSlot material="BUNDLE" size={56} tip={false} marks={false} /></Node>
                    </span>
                    <Track arrive />
                    <Tool slot={<span className="wk-slot rt-check" style={{ '--slot': '56px' }}><CheckGlyph size={22} /></span>}
                          name="Already held" meta="+1 instantly" />
                    <Bus />
                    <span className="wk-sr">Already in your inventory or backpack? It counts the moment it is handed to you, +1 instantly.</span>
                </li>
            </ol>

            {/* Not a way to get this item, so not in that list: the one option that
                ends somewhere else. */}
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
