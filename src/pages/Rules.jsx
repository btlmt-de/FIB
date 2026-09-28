import React from 'react';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import Footer from '../components/common/Footer.jsx';
import PageLinks from '../wiki/PageLinks.jsx';
import { useGo } from '../wiki/pages.js';
import { spriteOf } from '../wiki/sprite.js';
import '../wiki/page.css';
import '../wiki/rules.css';

/*
 * Rules (THE EXPLORER'S ATLAS): playing fair in our rounds.
 *
 * Short on purpose: the network's rules come first, then what FIB adds (the mods that
 * are not allowed), then what holds the people running a round to the same standard:
 * fairplay/OpTransparencyListener announces to everyone any operator-only command an
 * operator runs during a round (checked against the plugin on main, Sept 2026).
 *
 * Nothing here says what the server checks for on the players' side, or how. That is
 * a decision, not an omission: whatever the server does about client mods stays off
 * the public site, this page and its source included.
 *
 * Each mod gets a real item as its face, because a list of five names is easier to
 * scan with one: they stand for what the mod does, and are never shown as a claim
 * about the item.
 */

const MODS = [
    { face: 'FILLED_MAP', name: 'Minimaps', text: 'Any mod that shows a map, or where players or mobs are.' },
    { face: 'SPYGLASS', name: 'Freecam', text: 'Moving the camera away from your player.' },
    { face: 'DIAMOND_ORE', name: 'X-ray', text: 'Any mod or resource pack that shows blocks you could not otherwise see.' },
    { face: 'BUNDLE', name: 'BundlesBeyond', text: 'Removes the 12-item limit on seeing and taking items out of a bundle.' },
    { face: 'OAK_BOAT', name: 'BoatItemView', text: 'Shows the item in your hand while you ride a boat.' },
];

export default function Rules({ onNavigate }) {
    const go = useGo(onNavigate);
    return (
        <main className="pg rl">
            <header className="wk-wrap pg-head">
                <h1 className="wk-h2">Rules</h1>
                <p className="wk-lede">
                    Play fair, on the network's terms. Read this before you join one of our rounds; breaking it can get
                    you disqualified.
                </p>
            </header>

            <section className="wk-wrap pg-sec pg-sec--brief" aria-labelledby="network-title">
                <div className="pg-sec-head">
                    <h2 id="network-title" className="wk-h3">The network's rules first</h2>
                    <p className="wk-p">Every rule of the McPlayHD network applies to ForceItemBattle rounds too.</p>
                </div>
                <div className="rl-network">
                    <a className="wk-btn wk-btn--quiet rl-btn" href="https://mcplayhd.net/rules" target="_blank" rel="noopener noreferrer">
                        Read them on mcplayhd.net <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                    <p className="wk-small">What follows is what ForceItemBattle adds to them.</p>
                </div>
            </section>

            <section className="wk-wrap pg-sec" aria-labelledby="mods-title">
                <div className="pg-sec-head">
                    <h2 id="mods-title" className="wk-h3">Mods that are not allowed</h2>
                    <p className="wk-p">Using any of these gets you disqualified.</p>
                </div>
                <ul className="rl-mods">
                    {MODS.map((m) => (
                        <li key={m.name} className="rl-mod">
                            <span className="wk-slot" style={{ '--slot': '48px' }} aria-hidden="true">
                                <img className="wk-sprite" src={spriteOf(m.face)} alt="" width="128" height="128" loading="lazy" draggable="false" />
                            </span>
                            <span className="rl-mod-text">
                                <span className="rl-mod-name">{m.name}</span>
                                <span className="rl-mod-what">{m.text}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="wk-wrap pg-sec pg-sec--brief" aria-labelledby="ops-title">
                <div className="pg-sec-head">
                    <h2 id="ops-title" className="wk-h3">Operators play by the same rules</h2>
                    <p className="wk-p">The people running a round are held to it too.</p>
                </div>
                <div className="rl-ops">
                    <p className="wk-p">
                        When an operator runs an operator-only command during a round, the whole server is told, so a
                        skipped item or a forced one never happens quietly.
                    </p>
                    <p className="wk-small">
                        A few commands are left out, such as starting the round, the settings menu, <code className="wk-typed">/help</code> and
                        private messages.
                    </p>
                </div>
            </section>

            <section className="wk-wrap pg-sec pg-sec--brief" aria-labelledby="ask-title">
                <div className="pg-sec-head">
                    <h2 id="ask-title" className="wk-h3">When in doubt, ask first</h2>
                </div>
                <div className="rl-ask">
                    <p className="wk-p">
                        Any modification that gives you a clear advantage over vanilla Minecraft is not allowed, listed here
                        or not. If you are unsure whether a mod is allowed, <strong>ask before you use it</strong>.
                    </p>
                </div>
            </section>

            <PageLinks ids={['how-to-play', 'commands', 'gameplay', 'settings']} go={go} />
            <Footer />
        </main>
    );
}
