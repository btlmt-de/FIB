import React from 'react';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import { ItemSlot } from '../game/items.jsx';
import { PAGE } from './pages.js';

export default function PageLinks({ ids, go, title = 'Where next' }) {
    return (
        <nav className="wk-wrap pg-next" aria-labelledby="pg-next-title">
            <h2 id="pg-next-title" className="wk-h3">{title}</h2>
            <ul className="pg-next-list">
                {ids.map((id) => PAGE[id]).filter(Boolean).map((p) => (
                    <li key={p.id}>
                        <a className="pg-link" href={`/${p.id}`} onClick={go(p.id)}>
                            {p.src
                                ? <span className="wk-slot" style={{ '--slot': '40px' }} aria-hidden="true"><img className="wk-sprite" src={p.src} alt="" /></span>
                                : <ItemSlot material={p.face} size={40} tip={false} marks={false} />}
                            <span className="pg-link-text">
                                <span className="pg-link-name">
                                    {p.name}
                                    {p.exit && <><ArrowUpRight size={14} className="pg-link-exit" aria-hidden="true" /><span className="wk-sr"> (separate section)</span></>}
                                </span>
                                <span className="pg-link-desc">{p.text}</span>
                            </span>
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
