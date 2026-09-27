import React, { useEffect, useMemo, useState } from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import { STAGES, TAGS } from '../../wiki/tokens.js';
import { TagGlyph } from '../../wiki/items.jsx';
import { PAPER_VERSION, POOL_SETTINGS } from '../../wiki/atlas.js';
import InfoEditor from './InfoEditor.jsx';
import { PoolControls, Slot, StageWord, TagWords } from './parts.jsx';
import { STAGE_KEYS, TAG_KEYS, displayNameOf } from './poolData.js';
import { CATEGORY_CONFIG, categoryName } from './categories.js';
import { REPOS, recentCommits, storedAuth } from './github.js';

/**
 * The inspector: the right-hand half of the workspace.
 *
 *   nothing selected   the pool at a glance: stages, tags, /info coverage, what is
 *                      missing, coverage by category, and the last commits to both
 *                      files. Each figure is also a filter, so the overview is a way
 *                      into the work rather than a report about it.
 *   one item           the item as the game knows it, its stage and tags as
 *                      controls, and its /info editor.
 *   several            what can be done to all of them at once.
 *
 * Nothing here writes to GitHub. Every control stages a change in the tray.
 */

const fmt = (n) => n.toLocaleString('en-US');
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export default function Inspector(props) {
    const { selection, onClear } = props;
    return (
        <div className="ip-inspect-in">
            {selection.length === 0 && <Overview {...props} />}
            {selection.length === 1 && <ItemView key={selection[0]} {...props} material={selection[0]} />}
            {selection.length > 1 && <BulkView {...props} />}
            {selection.length > 0 && (
                <button type="button" className="ip-close" onClick={onClear} aria-label="Close the inspector">
                    <X size={18} />
                </button>
            )}
        </div>
    );
}

/* ── One item ───────────────────────────────────────────────────────────────── */

function ItemView({ material, byMaterial, changes, pool, categoryOf }) {
    const orig = byMaterial.get(material);
    const change = changes.pool[material];
    const staged = changes.info[material];
    // Keyed by material in Inspector, so this starts fresh for every item.
    const [draft, setDraft] = useState({ state: 'EARLY', tags: [] });

    const name = orig?.displayName ?? displayNameOf(material);
    const eff = orig ? changes.effective(orig)
        : change?.type === 'add' ? { material, state: change.state, tags: change.tags, displayName: name }
            : { material, displayName: name, tags: [] };
    const inPool = Boolean(orig) || change?.type === 'add';
    const category = categoryOf?.(material);

    let status;
    if (!orig && change?.type === 'add') status = 'Staged to be added';
    else if (!orig) status = `Not in the pool. Minecraft ${PAPER_VERSION} has it.`;
    else if (change?.type === 'remove') status = 'Staged for removal';
    else if (change?.type === 'modify') status = 'In the pool, change staged';
    else status = 'In the pool';

    return (
        <article className="ip-item" aria-labelledby="ip-item-name">
            <header className="ip-item-head">
                <Slot item={eff} size={72} className="ip-item-slot" eager />
                <div className="ip-item-id">
                    <h2 id="ip-item-name" className="wk-name">{name}</h2>
                    <code className="ip-mono">minecraft:{material.toLowerCase()}</code>
                    <p className="ip-item-status" data-staged={Boolean(change) || undefined}>{status}</p>
                    {category && <p className="wk-small">{categoryName(category)}</p>}
                </div>
            </header>

            <section className="ip-sec" aria-label="Pool">
                <span className="wk-label">Pool</span>
                {orig && change?.type === 'remove' && (
                    <div className="ip-row">
                        <p className="wk-small">It leaves the pool when the pull request is merged.</p>
                        <button type="button" className="wk-btn wk-btn--quiet ip-btn" onClick={() => changes.undoPool(material)}>Undo removal</button>
                    </div>
                )}
                {(orig && change?.type !== 'remove') || change?.type === 'add' ? (
                    <>
                        <PoolControls state={eff.state} tags={eff.tags} onChange={(s, t) => changes.setPool(material, s, t)} />
                        {change?.type === 'modify' && (
                            <p className="ip-was">
                                Committed: <StageWord state={change.oldState} />{change.oldTags.length ? <>, <TagWords tags={change.oldTags} /></> : ', no tags'}
                                <button type="button" className="ip-link" onClick={() => changes.undoPool(material)}>Undo</button>
                            </p>
                        )}
                        <div className="ip-row">
                            {orig
                                ? <button type="button" className="wk-btn wk-btn--quiet ip-btn" onClick={() => changes.removeFromPool(material)}>Remove from the pool</button>
                                : <button type="button" className="wk-btn wk-btn--quiet ip-btn" onClick={() => changes.undoPool(material)}>Don't add it</button>}
                        </div>
                    </>
                ) : null}
                {!orig && !change && (
                    <>
                        <PoolControls state={draft.state} tags={draft.tags} onChange={(s, t) => setDraft({ state: s, tags: t })} />
                        <div className="ip-row">
                            <button type="button" className="wk-btn ip-btn" onClick={() => changes.addToPool(material, draft.state, draft.tags)}>
                                Add to the pool
                            </button>
                        </div>
                    </>
                )}
            </section>

            {inPool && (
                <section className="ip-sec" aria-label="/info">
                    <span className="wk-label">/info</span>
                    <InfoEditor
                        key={material}
                        item={{ material, displayName: name }}
                        lines={staged ? staged.lines : orig?.description ?? null}
                        base={orig?.description ?? null}
                        staged={Boolean(staged)}
                        onChange={(lines) => changes.setInfo(material, lines)}
                        onUndo={() => changes.undoInfo(material)}
                        pool={pool}
                    />
                </section>
            )}
        </article>
    );
}

/* ── Several items ──────────────────────────────────────────────────────────── */

function BulkView({ selection, byMaterial, changes, onClear }) {
    const [draft, setDraft] = useState({ state: 'EARLY', tags: [] });
    const inPool = selection.filter((m) => byMaterial.has(m));
    const missing = selection.filter((m) => !byMaterial.has(m) && changes.pool[m]?.type !== 'add');
    const adding = selection.filter((m) => !byMaterial.has(m) && changes.pool[m]?.type === 'add');
    const eff = (m) => (byMaterial.has(m) ? changes.effective(byMaterial.get(m)) : { material: m, ...changes.pool[m] });
    const everyone = [...inPool, ...adding];

    const setStage = (s) => everyone.forEach((m) => { const e = eff(m); if (!e.removed) changes.setPool(m, s, e.tags); });
    const setTag = (t, on) => everyone.forEach((m) => {
        const e = eff(m);
        if (e.removed) return;
        const tags = on ? [...new Set([...e.tags, t])] : e.tags.filter((x) => x !== t);
        changes.setPool(m, e.state, tags);
    });

    return (
        <article className="ip-item" aria-labelledby="ip-bulk-name">
            <header className="ip-bulk-head">
                <h2 id="ip-bulk-name" className="wk-name">{selection.length} items selected</h2>
                <div className="ip-strip" aria-hidden="true">
                    {selection.slice(0, 27).map((m) => <Slot key={m} item={eff(m)} size={32} />)}
                    {selection.length > 27 && <span className="wk-slot ip-more" style={{ '--slot': '32px' }}>+{selection.length - 27}</span>}
                </div>
                <button type="button" className="ip-link" onClick={onClear}>Clear the selection</button>
            </header>

            {missing.length > 0 && (
                <section className="ip-sec">
                    <span className="wk-label">{missing.length} not in the pool</span>
                    <PoolControls state={draft.state} tags={draft.tags} onChange={(s, t) => setDraft({ state: s, tags: t })} />
                    <div className="ip-row">
                        <button type="button" className="wk-btn ip-btn" onClick={() => missing.forEach((m) => changes.addToPool(m, draft.state, draft.tags))}>
                            Add {missing.length} to the pool
                        </button>
                    </div>
                </section>
            )}

            {everyone.length > 0 && (
                <section className="ip-sec">
                    <span className="wk-label">{everyone.length} in the pool{adding.length ? ' or being added' : ''}</span>
                    <p className="wk-small">Set every one of them at once.</p>
                    <div className="ip-seg ip-stages" role="group" aria-label="Stage for all">
                        {STAGE_KEYS.map((s) => (
                            <button key={s} type="button" className="ip-stage" data-stage={s.toLowerCase()} onClick={() => setStage(s)}>
                                <span className="ip-stage-name" style={{ color: STAGES[s].ink }}>{STAGES[s].label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="ip-bulk-tags">
                        {TAG_KEYS.map((t) => (
                            <span key={t} className="ip-row">
                                <TagGlyph tag={t} size={10} /> <span style={{ color: TAGS[t].ink }}>{TAGS[t].label}</span>
                                <button type="button" className="ip-link" onClick={() => setTag(t, true)}>add</button>
                                <button type="button" className="ip-link" onClick={() => setTag(t, false)}>remove</button>
                            </span>
                        ))}
                    </div>
                    {inPool.length > 0 && (
                        <div className="ip-row">
                            <button type="button" className="wk-btn wk-btn--quiet ip-btn" onClick={() => inPool.forEach((m) => changes.removeFromPool(m))}>
                                Remove {inPool.length} from the pool
                            </button>
                        </div>
                    )}
                </section>
            )}
        </article>
    );
}

/* ── The overview ───────────────────────────────────────────────────────────── */

/*
 * What each part of the pool means for a round, from the plugin: stages join the
 * pool as the round runs (Gameplay draws exactly when), and a tag keeps an item out
 * unless the round's settings let it in (PoolExclusions: HARD lets in the Nether and,
 * with EXTREME also on, the extreme items; END lets in the End). This server's own
 * settings are config.yml's, via POOL_SETTINGS.
 */
const STAGE_NOTES = {
    EARLY: 'In the pool from the start',
    MID: 'Joins the pool part-way through',
    LATE: 'Joins the pool last',
};
function tagNote(t) {
    if (t === 'NETHER') return `Only dealt when Hard is on${POOL_SETTINGS.hard ? '' : ' (off here)'}`;
    if (t === 'END') return `Only dealt when End is on${POOL_SETTINGS.end ? '' : ' (off here)'}`;
    return `Extremely hard to get in time. Only with Extreme on${POOL_SETTINGS.extreme ? '' : ', which it is not on this server'}`;
}

/*
 * The overview answers "what is in this pool". The maintainers' figures (what has no
 * /info, what is missing, coverage by category, the commits) are real work but not a
 * player's question, so they fold into one section that is open for someone signed
 * in to GitHub and closed for everyone else.
 */
function Overview({ pool, missing, onFilter, categoryOf, categoriesReady }) {
    const total = pool.length;
    const byStage = STAGE_KEYS.map((s) => [s, pool.filter((i) => i.state === s).length]);
    const byTag = TAG_KEYS.map((t) => [t, pool.filter((i) => i.tags.includes(t)).length]);
    const withInfo = pool.filter((i) => i.description?.length).length;
    const maintainer = Boolean(storedAuth().user);

    const categories = useMemo(() => {
        if (!categoriesReady) return [];
        const rows = new Map(CATEGORY_CONFIG.map((c) => [c.id, { id: c.id, name: c.name, in: 0, out: 0 }]));
        rows.set('other', { id: 'other', name: 'Other', in: 0, out: 0 });
        for (const i of pool) { const r = rows.get(categoryOf(i.material)); if (r) r.in++; }
        for (const m of missing) { const r = rows.get(categoryOf(m)); if (r) r.out++; }
        return [...rows.values()].filter((r) => r.in + r.out > 0).sort((a, b) => b.out - a.out || b.in - a.in);
    }, [pool, missing, categoryOf, categoriesReady]);

    const bar = ({ key, label, n, fill, note, onClick }) => (
        <li key={key}>
            <button type="button" className="ip-bar-row" onClick={onClick}>
                <span className="ip-bar-name">{label}</span>
                <span className="ip-meter"><span style={{ width: `${pct(n, total)}%`, background: fill }} /></span>
                <span className="wk-datum">{fmt(n)}</span>
                <span className="ip-bar-note">{note}</span>
            </button>
        </li>
    );

    return (
        <div className="ip-overview">
            <section className="ip-sec">
                <h2 className="wk-name">The pool</h2>
                <p className="ip-fig"><span className="wk-figure">{fmt(total)}</span> items the game can hand out</p>
                <ul className="ip-bars" aria-label="By stage">
                    {byStage.map(([s, n]) => (
                        bar({ key: s, n, fill: STAGES[s].light, note: STAGE_NOTES[s], onClick: () => onFilter({ stage: s }),
                              label: <span style={{ color: STAGES[s].ink }}>{STAGES[s].label}</span> })
                    ))}
                </ul>
                <ul className="ip-bars" aria-label="By tag">
                    {byTag.map(([t, n]) => (
                        bar({ key: t, n, fill: TAGS[t].ink, note: tagNote(t), onClick: () => onFilter({ tag: t }),
                              label: <><TagGlyph tag={t} size={9} /> <span style={{ color: TAGS[t].ink }}>{TAGS[t].label}</span></> })
                    ))}
                </ul>
                <a className="wk-link ip-small-link" href="/gameplay#pool">When each stage joins a round</a>
            </section>

            <details className="ip-sec ip-maint" open={maintainer || undefined}>
                <summary>
                    <span className="wk-label">Maintenance</span>
                    <span className="ip-maint-sum">{fmt(total - withInfo)} without /info, {fmt(missing.length)} not in the pool</span>
                </summary>
                <div className="ip-maint-body">
                    <button type="button" className="ip-todo" onClick={() => onFilter({ info: 'without' })}>
                        <span className="wk-datum ip-todo-n">{fmt(total - withInfo)}</span>
                        <span>items have no /info <span className="ip-todo-sub">{fmt(withInfo)} of {fmt(total)} have one, {pct(withInfo, total)}%</span></span>
                    </button>
                    <button type="button" className="ip-todo" onClick={() => onFilter({ view: 'missing' })}>
                        <span className="wk-datum ip-todo-n">{fmt(missing.length)}</span>
                        <span>items in Minecraft {PAPER_VERSION} are not in the pool <span className="ip-todo-sub">some on purpose; review before adding</span></span>
                    </button>

                    <span className="wk-label ip-maint-label">By category</span>
                    {!categoriesReady && <p className="wk-small">Reading Minecraft's item tags…</p>}
                    {categoriesReady && (
                        <ul className="ip-cats">
                            {categories.map((c) => (
                                <li key={c.id}>
                                    <button type="button" className="ip-cat" onClick={() => onFilter({ category: c.id })}>
                                        <span className="ip-cat-name">{c.name}</span>
                                        <span className="ip-meter"><span style={{ width: `${pct(c.in, c.in + c.out)}%` }} /></span>
                                        <span className="ip-cat-n"><span className="wk-datum">{c.in}</span> of {c.in + c.out}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <History />
                </div>
            </details>
        </div>
    );
}

/* ── History ────────────────────────────────────────────────────────────────── */

function ago(date) {
    const d = (Date.now() - new Date(date)) / 86400000;
    if (d < 1 / 24) return `${Math.max(1, Math.round(d * 1440))}m ago`;
    if (d < 1) return `${Math.round(d * 24)}h ago`;
    if (d < 2) return 'yesterday';
    if (d < 30) return `${Math.floor(d)}d ago`;
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function History() {
    const [which, setWhich] = useState('info');
    const [data, setData] = useState({});
    const [error, setError] = useState(null);
    useEffect(() => {
        if (data[which]) return;
        let live = true;
        recentCommits(storedAuth().token, REPOS[which], 8)
            .then((c) => { if (live) setData((d) => ({ ...d, [which]: c })); })
            .catch((e) => { if (live) setError(e.message); });
        return () => { live = false; };
    }, [which, data]);
    const list = data[which];
    const repo = REPOS[which];

    return (
        <section className="ip-history" aria-labelledby="ip-history">
            <div className="ip-row ip-history-head">
                <span id="ip-history" className="wk-label">Recent commits</span>
                <span className="ip-seg ip-seg--small" role="group" aria-label="Which file">
                    <button type="button" aria-pressed={which === 'info'} onClick={() => { setWhich('info'); setError(null); }}>/info</button>
                    <button type="button" aria-pressed={which === 'pool'} onClick={() => { setWhich('pool'); setError(null); }}>Pool</button>
                </span>
            </div>
            {error && <p className="wk-small">GitHub did not answer: {error}</p>}
            {!list && !error && <p className="wk-small">Reading {repo.repo}…</p>}
            {list && (
                <ol className="ip-commits">
                    {list.map((c) => (
                        <li key={c.sha} className="ip-commit">
                            {c.author?.avatar_url && <img src={`${c.author.avatar_url}&s=40`} alt="" width="20" height="20" loading="lazy" />}
                            <span className="ip-commit-text">
                                <a className="ip-commit-msg" href={c.html_url} target="_blank" rel="noopener noreferrer">{c.commit.message.split('\n')[0]}</a>
                                <span className="ip-commit-meta">{c.commit.author.name}, {ago(c.commit.author.date)}</span>
                            </span>
                        </li>
                    ))}
                </ol>
            )}
            <a className="wk-link ip-small-link" href={`https://github.com/${repo.repo}/commits/${repo.base}/${repo.path}`} target="_blank" rel="noopener noreferrer">
                Every commit to {repo.path.split('/').pop()} <ArrowUpRight size={13} aria-hidden="true" />
            </a>
        </section>
    );
}
