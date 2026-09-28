import React, { useMemo } from 'react';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import Footer from '../components/common/Footer.jsx';
import PageIndex from '../wiki/shell/PageIndex.jsx';
import PageLinks from '../wiki/shell/PageLinks.jsx';
import { useCurrentSection } from '../wiki/hooks.js';
import { useGo } from '../wiki/shell/pages.js';
import { CHANGELOG } from '../wiki/data/changelog.data.js';
import '../wiki/page.css';
import '../wiki/pages/changelog.css';

/*
 * Changelog (THE EXPLORER'S ATLAS): every release, newest first.
 *
 * The drawing is the track the wiki already uses for anything that runs in one
 * direction: a 2px line down the releases with the pixel arrowhead at the newest end,
 * pointing up, where the next release will go. Each release is a node on it. A major
 * release is a larger, filled node and a named heading; every other release is the
 * same small open node, and its kind is a word, never a colour. The old page gave the
 * four kinds four hues, which is the Datum Rule broken four times over: nothing a
 * player reads here is measured by them.
 *
 * Years are the sections, in the inner-page skeleton (page.css): the year on the left,
 * sticky, with what that year held, and its releases on the right.
 *
 * The head's index is the Minecraft updates. "When did FIB get 1.21.10" is the
 * question this page is asked most and the one a long list answers worst, so each
 * Minecraft version links straight to the release that brought it.
 *
 * The years are the sticky index under the nav (PageIndex, as Commands has it), with
 * the year being read marked, and a busy year's sticky head lists its months, each a
 * link to that month's newest release. The years were a second row of links in the
 * head, gone the moment the reader scrolled into the thousands of pixels below it
 * (owner, final pass, Sept 2026). Collapsing years was considered and left out: it
 * would hide the one continuous line this page draws, for a saving the index already
 * makes.
 *
 * The list itself is src/wiki/data/changelog.data.js, which the build checks against the
 * plugin's version on main.
 */

const KIND = { major: 'Major', feature: 'Feature', update: 'Update', fix: 'Fixes' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/* '25th September 2026' -> { day: 25, month: 'September', year: '2026', iso: '2026-09-25' } */
function parseDate(text) {
    const m = /^(\d{1,2})(?:st|nd|rd|th)? (\w+) (\d{4})$/.exec(text.trim());
    if (!m) return { day: null, month: text, year: text.split(' ').at(-1), iso: undefined };
    const month = MONTHS.indexOf(m[2]) + 1;
    return {
        day: Number(m[1]), month: m[2], year: m[3],
        iso: month ? `${m[3]}-${String(month).padStart(2, '0')}-${m[1].padStart(2, '0')}` : undefined,
    };
}

const anchor = (version) => `v${version}`;
const isNumeric = (title) => /^[\d.]+$/.test(title);

function Release({ entry }) {
    const date = parseDate(entry.date);
    const major = entry.type === 'major';
    return (
        <li className="cl-rel" data-major={major || undefined} id={anchor(entry.version)}>
            <span className="cl-node" aria-hidden="true" />
            <div className="cl-body">
                <p className="cl-meta">
                    <a className="cl-v" href={`#${anchor(entry.version)}`}>v{entry.version}</a>
                    <time className="cl-date" dateTime={date.iso}>{date.day ? `${date.day} ${date.month}` : entry.date}</time>
                    <span className="wk-label">{KIND[entry.type] ?? KIND.update}</span>
                    {entry.mc && <span className="cl-mc">Minecraft {entry.mc.join(', ')}</span>}
                </p>
                <h3 className={major ? (isNumeric(entry.title) ? 'cl-title cl-title--figure' : 'wk-name cl-title') : 'cl-title'}>
                    {entry.title}
                </h3>
                {entry.description && <p className="cl-desc">{entry.description}</p>}
                {entry.changes?.length > 0 && (
                    <ul className="cl-changes">
                        {entry.changes.map((c) => <li key={c}>{c}</li>)}
                    </ul>
                )}
            </div>
        </li>
    );
}

export default function Changelog({ onNavigate }) {
    const go = useGo(onNavigate);

    const years = useMemo(() => {
        const groups = [];
        for (const entry of CHANGELOG) {
            const year = parseDate(entry.date).year;
            if (groups.at(-1)?.year !== year) groups.push({ year, entries: [] });
            groups.at(-1).entries.push(entry);
        }
        return groups;
    }, []);
    const current = useCurrentSection(years.map((y) => `year-${y.year}`));

    const newest = CHANGELOG[0];
    const newestDate = parseDate(newest.date);
    const first = CHANGELOG.at(-1);
    const minecraft = CHANGELOG.filter((e) => e.mc);

    return (
        <main className="pg cl">
            <header className="wk-wrap pg-head">
                <h1 className="wk-h2">Changelog</h1>
                <p className="wk-lede">
                    Every release of the plugin, newest first: <span className="wk-datum">{CHANGELOG.length}</span> of them
                    since {parseDate(first.date).month} {parseDate(first.date).year}. The newest
                    is <a className="wk-link" href={`#${anchor(newest.version)}`}>v{newest.version}</a>, from{' '}
                    {newestDate.day ? `${newestDate.day} ${newestDate.month}` : newest.date}.
                </p>
                <nav className="cl-index" aria-label="Jump to">
                    <span className="wk-label">Minecraft updates</span>
                    <ul className="cl-index-list">
                        {minecraft.map((e) => (
                            <li key={e.version}>
                                <a className="wk-link" href={`#${anchor(e.version)}`}>
                                    {e.mc.length > 1 ? `${e.mc[0]} to ${e.mc.at(-1)}` : e.mc[0]}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="pg-head-actions">
                    <a className="wk-btn wk-btn--quiet" href="https://github.com/McPlayHDnet/ForceItemBattle/releases" target="_blank" rel="noopener noreferrer">
                        Downloads on GitHub <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                </div>
            </header>

            <PageIndex label="Years" current={current}
                       items={years.map((y) => ({ id: `year-${y.year}`, label: y.year, n: y.entries.length }))} />

            {years.map((y, i) => {
                const majors = y.entries.filter((e) => e.type === 'major').length;
                // The newest release of each month, in the year's own order (newest first).
                const months = [];
                for (const e of y.entries) {
                    const m = parseDate(e.date).month;
                    if (MONTHS.includes(m) && months.at(-1)?.month !== m) months.push({ month: m, version: e.version });
                }
                return (
                    <section key={y.year} id={`year-${y.year}`} className="wk-wrap pg-sec cl-year" aria-labelledby={`year-${y.year}-title`}>
                        <div className="pg-sec-head">
                            <h2 id={`year-${y.year}-title`} className="wk-figure cl-year-title">{y.year}</h2>
                            <p className="wk-small">
                                {y.entries.length} {y.entries.length === 1 ? 'release' : 'releases'}
                                {majors > 0 && <>, {majors} of them major</>}
                            </p>
                            {y.entries.length > 4 && months.length > 1 && (
                                <ul className="cl-months" aria-label={`${y.year} by month`}>
                                    {months.map((m) => <li key={m.month}><a className="wk-link" href={`#${anchor(m.version)}`}>{m.month}</a></li>)}
                                </ul>
                            )}
                        </div>
                        <ol className="cl-track" data-newest={i === 0 || undefined} data-oldest={i === years.length - 1 || undefined}>
                            {y.entries.map((e) => <Release key={e.version} entry={e} />)}
                        </ol>
                    </section>
                );
            })}

            <PageLinks ids={['gameplay', 'pools', 'structures', 'how-to-play']} go={go} />
            <Footer />
        </main>
    );
}
