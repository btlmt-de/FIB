import React, { useEffect, useMemo, useRef, useState } from 'react';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import X from 'lucide-react/dist/esm/icons/x';
import { Slot, StageWord, TagWords } from './parts.jsx';
import { McChat } from './McText.jsx';
import { displayNameOf, invalidateCache } from './poolData.js';
import { applyDescriptionChanges, modifyJavaFile, poolEdits, pullRequestBody, registerLine } from './edits.js';
import {
    BRANCH_NAME, PROTECTED, REPOS, TOKEN_URL, canPush, clearAuth, createBranch, listBranches,
    openPullRequest, readFile, saveAuth, storedAuth, whoAmI, writeFile,
} from './github.js';

/**
 * The change tray: everything staged, reviewed and committed from one place.
 *
 * It replaced two modals with two different ideas of how to commit. Now there is one
 * list per destination, each saying where it will land before it is sent:
 *
 *   Pool changes   the plugin repo, on a new or existing branch (never main or master),
 *                  with a pull request into main ticked by default. The live pool only
 *                  changes when that is merged, and the tray says so.
 *   /info changes  this repo's config.yml, on the branch the page is showing unless
 *                  another is picked. All of them in one commit.
 *
 * Both rewrite the file as it is on the target branch at the moment of commit, never
 * the copy the page loaded, so nobody else's commit is overwritten.
 */

const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');
const list = (names, n = 3) => (names.length <= n ? names.join(', ').replace(/, ([^,]*)$/, ' and $1')
    : `${names.slice(0, n).join(', ')} and ${names.length - n} more`);

export default function ChangeTray({ changes, byMaterial, viewBranch, onInfoCommitted, onPoolCommitted }) {
    const [open, setOpenRaw] = useState(false);
    const setOpen = (v) => { setOpenRaw(v); if (!v) setResults({}); };
    const [auth, setAuth] = useState(storedAuth);
    // Kept here, not in the sections: a section's list empties the moment its commit
    // lands, and the links to the commit and the pull request must outlive it.
    const [results, setResults] = useState({});
    const resultFor = (k) => ({ result: results[k], setResult: (r) => setResults((x) => ({ ...x, [k]: r })) });
    const total = changes.poolCount + changes.infoCount;
    const closeRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        closeRef.current?.focus();
        const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
    }, [open]);

    if (!total && !open) return null;

    return (
        <>
            <div className="ip-tray" role="region" aria-label="Staged changes">
                <div className="ip-tray-in">
                    <span className="ip-tray-what">
                        <strong>Staged</strong>
                        {changes.poolCount > 0 && <span><span className="wk-datum">{changes.poolCount}</span> pool {changes.poolCount === 1 ? 'change' : 'changes'}</span>}
                        {changes.infoCount > 0 && <span><span className="wk-datum">{changes.infoCount}</span> /info {changes.infoCount === 1 ? 'change' : 'changes'}</span>}
                        <span className="ip-tray-note">kept in this browser until committed</span>
                    </span>
                    <span className="ip-tray-who">{auth.user ? <>Signed in as <strong>{auth.user.login}</strong></> : 'Not signed in to GitHub'}</span>
                    <button type="button" className="wk-btn ip-btn" onClick={() => setOpen(true)} aria-haspopup="dialog">Review and commit</button>
                </div>
            </div>

            {open && (
                <>
                    <div className="ip-scrim" onClick={() => setOpen(false)} aria-hidden="true" />
                    <aside className="ip-drawer" role="dialog" aria-modal="true" aria-labelledby="ip-drawer-title">
                        <header className="ip-drawer-head">
                            <h2 id="ip-drawer-title" className="wk-name">Staged changes</h2>
                            <button ref={closeRef} type="button" className="ip-close" onClick={() => setOpen(false)} aria-label="Close"><X size={18} /></button>
                        </header>
                        <SignIn auth={auth} setAuth={setAuth} />
                        {(changes.poolCount > 0 || results.pool) && <PoolCommit auth={auth} changes={changes} byMaterial={byMaterial} onDone={onPoolCommitted} {...resultFor('pool')} />}
                        {(changes.infoCount > 0 || results.info) && <InfoCommit auth={auth} changes={changes} byMaterial={byMaterial} viewBranch={viewBranch} onDone={onInfoCommitted} {...resultFor('info')} />}
                        {!total && !results.pool && !results.info && <p className="wk-small ip-drawer-empty">Nothing is staged.</p>}
                    </aside>
                </>
            )}
        </>
    );
}

/* ── Signing in ─────────────────────────────────────────────────────────────── */

function SignIn({ auth, setAuth }) {
    const [token, setToken] = useState('');
    const [remember, setRemember] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    if (auth.user) {
        return (
            <section className="ip-sec ip-signin">
                <p className="ip-row">
                    {auth.user.avatar_url && <img className="ip-avatar" src={`${auth.user.avatar_url}&s=48`} alt="" width="24" height="24" />}
                    <span>Signed in to GitHub as <strong>{auth.user.login}</strong></span>
                    <button type="button" className="ip-link" onClick={() => { clearAuth(); setAuth({ token: null, user: null }); }}>Sign out</button>
                </p>
            </section>
        );
    }

    const submit = async (e) => {
        e.preventDefault();
        const t = token.trim();
        if (!t) return;
        setBusy(true); setError(null);
        try {
            const user = await whoAmI(t);
            saveAuth(t, user, remember);
            setAuth({ token: t, user });
            setToken('');
        } catch {
            setError('GitHub did not accept that token. Check it has not expired and has the repo scope.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="ip-sec ip-signin">
            <span className="wk-label">Sign in to commit</span>
            <p className="wk-small">
                Committing needs a GitHub personal access token with the <code className="wk-typed">repo</code> scope,
                from an account that can push to the repos below.{' '}
                <a className="wk-link" href={TOKEN_URL} target="_blank" rel="noopener noreferrer">Create one</a>.
            </p>
            <form className="ip-signin-form" onSubmit={submit}>
                <label className="ip-field">
                    <span className="wk-sr">Personal access token</span>
                    <input className="ip-input ip-mono-input" type="password" autoComplete="off" spellCheck="false"
                           placeholder="ghp_… or github_pat_…" value={token} onChange={(e) => setToken(e.target.value)} />
                </label>
                <button type="submit" className="wk-btn ip-btn" disabled={busy || !token.trim()}>{busy ? 'Checking…' : 'Sign in'}</button>
            </form>
            <label className="ip-check">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Remember on this device for 60 days
            </label>
            {error && <p className="ip-error" role="alert">{error}</p>}
        </section>
    );
}

/* ── Committing ─────────────────────────────────────────────────────────────── */

/** The repo's branches, and a way to add one this page just created without asking GitHub again. */
function useBranches(auth, repo) {
    const [branches, setBranches] = useState(null);
    useEffect(() => {
        if (!auth.token) return undefined;
        let live = true;
        listBranches(auth.token, repo).then((b) => { if (live) setBranches(b); }).catch(() => { if (live) setBranches([]); });
        return () => { live = false; };
    }, [auth.token, repo]);
    const add = (name) => setBranches((b) => (b?.includes(name) ? b : [...(b ?? []), name]));
    return [auth.token ? branches : null, add];
}

function Result({ result }) {
    if (!result) return null;
    if (result.error) return <p className="ip-error" role="alert">{result.error}</p>;
    return (
        <div className="ip-done" role="status">
            <p><strong>{result.title}</strong></p>
            {result.links.map((l) => (
                <a key={l.href} className="wk-link" href={l.href} target="_blank" rel="noopener noreferrer">{l.label} <ArrowUpRight size={13} aria-hidden="true" /></a>
            ))}
            {result.note && <p className="wk-small">{result.note}</p>}
        </div>
    );
}

function PoolCommit({ auth, changes, byMaterial, onDone, result, setResult }) {
    const entries = useMemo(() => {
        const order = { add: 0, modify: 1, remove: 2 };
        return Object.entries(changes.pool).map(([material, c]) => ({ material, ...c }))
            .sort((a, b) => order[a.type] - order[b.type] || a.material.localeCompare(b.material));
    }, [changes.pool]);
    const counts = { add: 0, modify: 0, remove: 0 };
    entries.forEach((e) => { counts[e.type]++; });

    const [branches, addBranch] = useBranches(auth, REPOS.pool.repo);
    const [mode, setMode] = useState('new');
    const [name, setName] = useState(() => `pool/${auth.user?.login ?? 'update'}-${today()}`);
    const [existing, setExisting] = useState('');
    const [message, setMessage] = useState('');
    const [pr, setPr] = useState(true);
    const [step, setStep] = useState(null);

    const defaultMessage = `Item pool: ${[counts.add && `add ${counts.add}`, counts.modify && `change ${counts.modify}`, counts.remove && `remove ${counts.remove}`].filter(Boolean).join(', ')}`;
    const writable = (branches ?? []).filter((b) => !PROTECTED.has(b.toLowerCase()));
    const target = mode === 'new' ? name.trim() : existing || writable[0] || '';
    const taken = mode === 'new' && branches?.includes(target);
    const nameOk = mode === 'existing' || (BRANCH_NAME.test(target) && !PROTECTED.has(target.toLowerCase()) && !taken);
    const ready = auth.token && target && nameOk && !step;

    const commit = async () => {
        setResult(null);
        const snapshot = entries;
        let created = false;
        try {
            setStep('Checking you can push to the plugin repo…');
            if (!(await canPush(auth.token, REPOS.pool.repo))) throw new Error(`${auth.user.login} cannot push to ${REPOS.pool.repo}.`);
            const { additions, removals } = poolEdits(snapshot);
            // A new branch is only created once the edit is known to read and to change
            // something, read off main (what the branch would start from). It used to be
            // created first, so a failed read or a no-op left an unused branch behind, and
            // the retry then refused the name because that branch existed.
            const from = mode === 'new' ? REPOS.pool.base : target;
            setStep(`Reading the pool on ${from}…`);
            let { content, sha } = await readFile(auth.token, REPOS.pool, from);
            let next = modifyJavaFile(content, additions, removals);
            if (next === content) throw new Error(`${from} already has these changes.`);
            if (mode === 'new') {
                setStep(`Creating ${target} from main…`);
                await createBranch(auth.token, REPOS.pool.repo, target, REPOS.pool.base);
                created = true;
                // Main can move between that read and the branch: read the branch itself,
                // so the write is against the file it really holds.
                ({ content, sha } = await readFile(auth.token, REPOS.pool, target));
                next = modifyJavaFile(content, additions, removals);
                if (next === content) throw new Error(`${target} already has these changes.`);
            }
            setStep('Committing…');
            const msg = message.trim() || defaultMessage;
            const res = await writeFile(auth.token, REPOS.pool, target, next, sha, msg);
            const links = [{ href: res.commit.html_url, label: `The commit on ${target}` }];
            let note = 'The live pool changes when this reaches main.';
            if (pr) {
                setStep('Opening the pull request…');
                try {
                    const p = await openPullRequest(auth.token, REPOS.pool.repo, { title: msg.split('\n')[0], head: target, base: REPOS.pool.base, body: pullRequestBody(snapshot) });
                    links.push({ href: p.html_url, label: `Pull request #${p.number}` });
                    note = 'The live pool changes when the pull request is merged.';
                } catch (e) {
                    note = `Committed, but the pull request was not opened: ${e.message}`;
                }
            }
            changes.clearCommitted('pool', snapshot);
            invalidateCache();
            setResult({ title: `${snapshot.length} pool ${snapshot.length === 1 ? 'change' : 'changes'} committed to ${target}.`, links, note });
            onDone?.(target);
        } catch (e) {
            if (created) {
                // The branch exists now: offer it, so a retry adds to it instead of
                // failing on the name.
                addBranch(target);
                setExisting(target);
                setMode('existing');
                setResult({ error: `${e.message} ${target} was created; it is chosen under Existing branch, so trying again commits to it.` });
            } else {
                setResult({ error: e.message });
            }
        } finally {
            setStep(null);
        }
    };

    return (
        <section className="ip-sec ip-commit-sec" aria-labelledby="ip-pool-commit">
            <h3 id="ip-pool-commit" className="ip-dest">
                Pool <span className="ip-dest-where">{REPOS.pool.repo}, {REPOS.pool.path.split('/').pop()}</span>
            </h3>
            {entries.length > 0 && <ul className="ip-changes">
                {entries.map((c) => {
                    const orig = byMaterial.get(c.material);
                    const name = orig?.displayName ?? displayNameOf(c.material);
                    const shown = c.type === 'remove' ? { material: c.material, state: c.oldState, tags: c.oldTags } : { material: c.material, state: c.state, tags: c.tags };
                    return (
                        <li key={c.material} className="ip-change" data-type={c.type}>
                            <Slot item={shown} size={32} className={c.type === 'remove' ? 'ip-gone' : ''} />
                            <span className="ip-change-text">
                                <span className="ip-change-name">{name}</span>
                                <span className="ip-change-what">
                                    {c.type === 'add' && <>Added as <StageWord state={c.state} />{c.tags.length > 0 && <>, <TagWords tags={c.tags} /></>}</>}
                                    {c.type === 'modify' && <><StageWord state={c.oldState} /> to <StageWord state={c.state} />{c.tags.join() !== [...c.oldTags].sort().join() && <>, tags now {c.tags.length ? <TagWords tags={c.tags} /> : 'none'}</>}</>}
                                    {c.type === 'remove' && 'Removed'}
                                </span>
                            </span>
                            <button type="button" className="ip-link" onClick={() => changes.undoPool(c.material)} aria-label={`Undo the change to ${name}`}>Undo</button>
                        </li>
                    );
                })}
            </ul>}
            {entries.length > 0 && <details className="ip-diff">
                <summary>The lines this changes</summary>
                <pre className="ip-pre">{entries.map((c) => {
                    const o = byMaterial.get(c.material);
                    const out = [];
                    if (c.type !== 'add' && o) out.push(`- ${registerLine(c.material, o.state, o.tags).trim()}`);
                    if (c.type !== 'remove') out.push(`+ ${registerLine(c.material, c.state, c.tags).trim()}`);
                    return out.join('\n');
                }).join('\n')}</pre>
            </details>}

            {auth.token && entries.length > 0 && (
                <div className="ip-form">
                    <div className="ip-seg ip-seg--small" role="radiogroup" aria-label="Branch">
                        <button type="button" role="radio" aria-checked={mode === 'new'} onClick={() => setMode('new')}>New branch</button>
                        <button type="button" role="radio" aria-checked={mode === 'existing'} onClick={() => setMode('existing')} disabled={!writable.length}>Existing branch</button>
                    </div>
                    {mode === 'new' ? (
                        <label className="ip-field">
                            <span className="wk-label">Branch, from main</span>
                            <input className="ip-input ip-mono-input" value={name} onChange={(e) => setName(e.target.value)} spellCheck="false" />
                            {!nameOk && <span className="ip-error">{taken ? 'That branch exists already. Pick Existing branch to add to it.' : PROTECTED.has(target.toLowerCase()) ? 'Pool changes never go straight to main or master.' : 'Letters, digits, dot, dash, underscore and slash only.'}</span>}
                        </label>
                    ) : (
                        <label className="ip-field">
                            <span className="wk-label">Branch</span>
                            <select className="ip-input" value={target} onChange={(e) => setExisting(e.target.value)}>
                                {writable.map((b) => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </label>
                    )}
                    <label className="ip-field">
                        <span className="wk-label">Commit message</span>
                        <input className="ip-input" value={message} placeholder={defaultMessage} onChange={(e) => setMessage(e.target.value)} />
                    </label>
                    <label className="ip-check">
                        <input type="checkbox" checked={pr} onChange={(e) => setPr(e.target.checked)} />
                        Open a pull request into main
                    </label>
                    <div className="ip-row">
                        <button type="button" className="wk-btn ip-btn" disabled={!ready} onClick={commit}>
                            Commit {entries.length} {entries.length === 1 ? 'change' : 'changes'}
                        </button>
                        {step && <span className="wk-small" role="status">{step}</span>}
                    </div>
                </div>
            )}
            <Result result={result} />
        </section>
    );
}

function InfoCommit({ auth, changes, byMaterial, viewBranch, onDone, result, setResult }) {
    const entries = useMemo(() => Object.entries(changes.info).map(([material, c]) => ({ material, ...c }))
        .sort((a, b) => a.material.localeCompare(b.material)), [changes.info]);
    const [branches] = useBranches(auth, REPOS.info.repo);
    const [branch, setBranch] = useState(viewBranch);
    const [message, setMessage] = useState('');
    const [open, setOpen] = useState(null);
    const [step, setStep] = useState(null);

    const names = entries.map((e) => e.material);
    const defaultMessage = names.length === 1
        ? `${entries[0].lines === null ? 'Delete' : 'Update'} description for ${names[0]}`
        : `Update descriptions for ${list(names)}`;

    const commit = async () => {
        setResult(null);
        const snapshot = entries;
        try {
            setStep('Checking you can push to this repo…');
            if (!(await canPush(auth.token, REPOS.info.repo))) throw new Error(`${auth.user.login} cannot push to ${REPOS.info.repo}.`);
            setStep(`Reading config.yml on ${branch}…`);
            const { content, sha } = await readFile(auth.token, REPOS.info, branch);
            const next = applyDescriptionChanges(content, snapshot);
            if (next === content) throw new Error(`config.yml on ${branch} already says this.`);
            setStep('Committing…');
            const res = await writeFile(auth.token, REPOS.info, branch, next, sha, message.trim() || defaultMessage);
            changes.clearCommitted('info', snapshot);
            invalidateCache();
            setResult({
                title: `${snapshot.length} /info ${snapshot.length === 1 ? 'change' : 'changes'} committed to ${branch}.`,
                links: [{ href: res.commit.html_url, label: 'The commit' }],
                note: branch === viewBranch ? null : `The page is showing ${viewBranch}; switch to ${branch} to see them.`,
            });
            onDone?.(branch, snapshot);
        } catch (e) {
            setResult({ error: e.message });
        } finally {
            setStep(null);
        }
    };

    return (
        <section className="ip-sec ip-commit-sec" aria-labelledby="ip-info-commit">
            <h3 id="ip-info-commit" className="ip-dest">
                /info <span className="ip-dest-where">{REPOS.info.repo}, config.yml</span>
            </h3>
            {entries.length > 0 && <ul className="ip-changes">
                {entries.map((c) => {
                    const orig = byMaterial.get(c.material);
                    const name = orig?.displayName ?? displayNameOf(c.material);
                    const what = c.lines === null ? 'Description deleted' : c.base ? 'Description edited' : 'New description';
                    return (
                        <li key={c.material} className="ip-change ip-change--info">
                            <Slot item={orig ?? { material: c.material, tags: [] }} size={32} />
                            <span className="ip-change-text">
                                <span className="ip-change-name">{name}</span>
                                <button type="button" className="ip-link ip-change-what" aria-expanded={open === c.material} onClick={() => setOpen(open === c.material ? null : c.material)}>
                                    {what}, {open === c.material ? 'hide' : 'compare'}
                                </button>
                            </span>
                            <button type="button" className="ip-link" onClick={() => changes.undoInfo(c.material)} aria-label={`Undo the change to ${name}`}>Undo</button>
                            {open === c.material && (
                                <div className="ip-compare">
                                    <div><span className="wk-label">Committed</span>{c.base ? <McChat lines={c.base} /> : <p className="wk-small">None</p>}</div>
                                    <div><span className="wk-label">Staged</span>{c.lines ? <McChat lines={c.lines} /> : <p className="wk-small">Deleted</p>}</div>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>}

            {auth.token && entries.length > 0 && (
                <div className="ip-form">
                    <label className="ip-field">
                        <span className="wk-label">Branch</span>
                        <select className="ip-input" value={branch} onChange={(e) => setBranch(e.target.value)}>
                            {(branches ?? [viewBranch]).map((b) => <option key={b} value={b}>{b}</option>)}
                        </select>
                        {PROTECTED.has(branch) && <span className="wk-small">Commits straight to {branch}, as description edits always have.</span>}
                    </label>
                    <label className="ip-field">
                        <span className="wk-label">Commit message</span>
                        <input className="ip-input" value={message} placeholder={defaultMessage} onChange={(e) => setMessage(e.target.value)} />
                    </label>
                    <div className="ip-row">
                        <button type="button" className="wk-btn ip-btn" disabled={Boolean(step)} onClick={commit}>
                            Commit {entries.length} {entries.length === 1 ? 'change' : 'changes'}
                        </button>
                        {step && <span className="wk-small" role="status">{step}</span>}
                    </div>
                </div>
            )}
            <Result result={result} />
        </section>
    );
}
