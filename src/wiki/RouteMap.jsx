import React from 'react';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import { ItemSlot } from './items.jsx';
import { itemName, stageOf } from './atlas.js';
import { countLabel, shownRoutes } from './routes.js';
import { STAGES } from './tokens.js';
import './routemap.css';

/*
 * The route map: one item, every real way to get it.
 *
 * This is the page's answer to "what is ForceItemBattle": the game hands you an item
 * and Minecraft is the solution space. The item sits at the root; each branch is a
 * route Minecraft's own data allows (the recipe, the furnace, the ore, the mob, the
 * chest, the villager), drawn with the actual items involved, so the stage bars on
 * the ingredients show at a glance which routes are themselves hard. Two dashed
 * branches close every map because they are the plugin's rules and true of any item:
 * you may already be carrying it, and you may spend a joker.
 *
 * It is not the item pools page. It never lists every source (routes.data.js caps
 * each kind at four and this shows the first few), because the question it answers
 * is "what are my options", not "where is everything".
 */

const ingText = (c) => `${countLabel(c.n, c.label.toLowerCase())}${c.alt ? ' (or an alternative)' : ''}`;

function Chain({ route }) {
    return (
        <span className="rt-chain">
            <span className="rt-chain-items" aria-hidden="true">
                {route.chain.map((c, i) => (
                    <React.Fragment key={`${c.m}-${i}`}>
                        {i > 0 && <span className="rt-op">+</span>}
                        <span className="rt-ing">
                            <ItemSlot material={c.m} size={44} />
                            {c.n > 1 && <span className="wk-count">{c.n}</span>}
                        </span>
                    </React.Fragment>
                ))}
                <ArrowRight size={16} className="rt-arrow" />
                <ItemSlot material={route.station[0]} size={36} tip={false} marks={false} />
            </span>
            <span className="rt-chain-text">
                {route.chain.map(ingText).join(' + ')} at a {route.station[1]}
                {route.yields > 1 && <span className="rt-yield">, makes {route.yields}</span>}
            </span>
        </span>
    );
}

function Sources({ route }) {
    return (
        <span className="rt-sources">
            {route.sources.slice(0, 3).map((s, i) => (
                <span key={`${s.label}-${i}`} className="rt-src">
                    {s.m
                        ? <ItemSlot material={s.m} size={36} tip={false} marks={false} />
                        : <span className="wk-slot" style={{ '--slot': '36px' }} aria-hidden="true" />}
                    <span>
                        {s.label}
                        {s.odds && <span className="rt-odds"> {s.odds}</span>}
                    </span>
                </span>
            ))}
            {route.sources.length > 3 && <span className="rt-more">+{route.sources.length - 3} more</span>}
        </span>
    );
}

export default function RouteMap({ material, jokers, calm }) {
    const routes = shownRoutes(material);
    const stage = stageOf(material);
    return (
        <div className="rt">
            <div className="rt-root">
                <ItemSlot material={material} size={96} />
                <div className="rt-root-text">
                    <span className="rt-root-name">{itemName(material)}</span>
                    {stage && (
                        <span className="rt-root-stage">
                            <span style={{ color: STAGES[stage].ink }}>{STAGES[stage].label}</span> item
                        </span>
                    )}
                </div>
            </div>

            {/* Keyed by the item, so a new deal redraws the branches rather than
                morphing one item's routes into another's. */}
            <ol className="rt-branches" key={material} data-calm={calm || undefined} aria-label={`Ways to get ${itemName(material)}`}>
                {routes.map((r, i) => (
                    <li key={r.kind} className="rt-branch" style={{ '--i': i }}>
                        <span className="rt-verb">{r.verb}</span>
                        {r.chain ? <Chain route={r} /> : <Sources route={r} />}
                    </li>
                ))}
                <li className="rt-branch rt-rule" style={{ '--i': routes.length }}>
                    <span className="rt-verb">Holding it</span>
                    <span className="rt-sources">
                        <span className="rt-src">
                            <ItemSlot material="BUNDLE" size={36} tip={false} marks={false} />
                            <span>Already in your inventory, backpack or a bundle? It counts the moment it is handed to you.</span>
                        </span>
                    </span>
                </li>
                <li className="rt-branch rt-rule" style={{ '--i': routes.length + 1 }}>
                    <span className="rt-verb">Skip</span>
                    <span className="rt-sources">
                        <span className="rt-src">
                            <span className="wk-slot" style={{ '--slot': '36px' }} aria-hidden="true">
                                <img className="wk-sprite" src="/fib-custom/barrier.png" alt="" />
                            </span>
                            <span>Too far from anything above? Spend a joker, one of {jokers}, and take the next item.</span>
                        </span>
                    </span>
                </li>
            </ol>
        </div>
    );
}
