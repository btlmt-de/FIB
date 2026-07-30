/**
 * Structural checks on the stats stylesheet.
 *
 * `styles.js` holds ~1,200 lines of CSS inside a JS template literal, which
 * means neither the linter nor the bundler validates it. Two failure modes
 * have already shipped from that blind spot, both silent:
 *
 *  1. A backtick inside a CSS comment (`accent-color`) terminates the template
 *     literal early. This one at least breaks the build loudly.
 *
 *  2. A stray `}` closes a @media block early, and every rule that was meant
 *     to be inside it becomes a top-level rule that applies at ALL viewports.
 *     Nothing errors. The mobile podium layout simply started rendering on
 *     desktop, and the only symptom was "the design changed".
 *
 * The orphan check leans on the file's consistent formatting: top-level rules
 * start at column 0, rules nested in a block are indented. An indented rule
 * found at nesting depth 0 escaped its block.
 *
 *   node scripts/check-styles.mjs
 */

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = join(dirname(fileURLToPath(import.meta.url)), '../src/pages/Stats/styles.js');

const src = await readFile(FILE, 'utf8');

const OPEN = 'export const css = `';
const start = src.indexOf(OPEN);
const end = src.lastIndexOf('`;');
if (start < 0 || end < 0) {
  console.error('check-styles: could not locate the CSS template literal.');
  process.exit(1);
}

const css = src.slice(start + OPEN.length, end);
const errors = [];

/* 1. Stray backticks would have truncated the literal. */
const backticks = (css.match(/`/g) || []).length;
if (backticks) {
  errors.push(`${backticks} stray backtick(s) inside the CSS literal — these terminate the template early. Use plain words in CSS comments.`);
}

/* 2. Brace balance, ignoring comments. */
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

let depth = 0;
let line = 1;
const orphans = [];

const lines = stripped.split('\n');
lines.forEach((text, i) => {
  line = i + 1;

  // A rule opening at depth 0 that is indented never belongs there.
  const opensHere = /^\s*[^{}]*\{\s*$|^\s*[^{}]*\{.*\}\s*$/.test(text);
  const indented = /^\s\s+\S/.test(text);
  const isDeclaration = /^\s*--|^\s*[a-z-]+\s*:/i.test(text);

  if (depth === 0 && opensHere && indented && !isDeclaration && text.trim()) {
    orphans.push({ line, text: text.trim().slice(0, 72) });
  }

  for (const ch of text) {
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth < 0) {
        errors.push(`line ${line}: unbalanced "}" — closes a block that was never opened.`);
        depth = 0;
      }
    }
  }
});

if (depth !== 0) {
  errors.push(`CSS ends at brace depth ${depth}; a block was left unclosed.`);
}

/*
 * 3. The blue accent has two steps, and only one of them is legal as text.
 *
 * `--fib-blue` (oklch 0.585) is the FILL: a button background, a meter, a focus
 * ring. Measured against the page it is 4.39:1, which fails WCAG AA for text by
 * a hair — close enough that it looks fine in a screenshot and fails an audit.
 * `--fib-blue-ink` (0.720) is the text step at 7.62:1 and exists for exactly
 * this reason.
 *
 * The distinction is documented in DESIGN.md and was, until this check, enforced
 * by nothing. Only `color:` is flagged; background, border, box-shadow and
 * fill/stroke are all legitimate uses of the darker step.
 */
const blueText = [];
stripped.split('\n').forEach((text, i) => {
  const decl = text.match(/(^|[;{]|\s)color\s*:\s*var\(\s*--fib-blue\s*\)/);
  if (decl) blueText.push({ line: i + 1, text: text.trim().slice(0, 72) });
});
if (blueText.length) {
  errors.push(
    `${blueText.length} use(s) of --fib-blue as a text colour (4.39:1, below AA). ` +
    'Use --fib-blue-ink (7.62:1); --fib-blue is the fill step:\n' +
    blueText.map((o) => `    line ${o.line}: ${o.text}`).join('\n'),
  );
}

if (orphans.length) {
  errors.push(
    `${orphans.length} indented rule(s) found at top level — they escaped their @media block ` +
    'and now apply at every viewport:\n' +
    orphans.map((o) => `    line ${o.line}: ${o.text}`).join('\n'),
  );
}

if (errors.length) {
  console.error('check-styles: FAILED\n');
  errors.forEach((e) => console.error(`  • ${e}\n`));
  process.exit(1);
}

const mediaBlocks = (stripped.match(/@media/g) || []).length;
console.log(`check-styles: OK — ${lines.length} lines, ${mediaBlocks} @media blocks, braces balanced, no orphans.`);
