/* Applied to the file as it is on the target branch at commit time, never the loaded copy, so a commit cannot undo someone else's. */

import { REGISTER_REGEX, yamlQuote } from './poolData.js';

/* ── The pool: ItemDifficultiesManager.registerAllItems() ────────────────────── */

const REGISTER_ALL_ITEMS_REGEX = /private void registerAllItems\(\)\s*\{/;

function parseExistingItems(content) {
    const items = [];
    REGISTER_REGEX.lastIndex = 0;
    let match;
    while ((match = REGISTER_REGEX.exec(content)) !== null) {
        const [fullMatch, material, state, t1, t2, t3] = match;
        items.push({ material, state, tags: [t1, t2, t3].filter(Boolean), line: fullMatch });
    }
    return items;
}

export function registerLine(material, state, tags = []) {
    if (tags.length === 0) return `        register(Material.${material}, State.${state});`;
    return `        register(Material.${material}, State.${state}, ${tags.map((t) => `ItemTag.${t}`).join(', ')});`;
}

/* Safe only while the plugin keeps registerAllItems() a flat, sorted, comment-free list: anything else there is lost on commit. */
export function modifyJavaFile(content, additions, removals) {
    const existing = parseExistingItems(content);
    const existingMaterials = new Set(existing.map((i) => i.material));
    const removalSet = new Set(removals.map((r) => r.material));

    const methodMatch = content.match(REGISTER_ALL_ITEMS_REGEX);
    if (!methodMatch) throw new Error('Could not find registerAllItems() in the plugin file.');

    const methodStart = methodMatch.index + methodMatch[0].length;
    let depth = 1;
    let methodEnd = methodStart;
    for (let i = methodStart; i < content.length; i++) {
        if (content[i] === '{') depth++;
        if (content[i] === '}') depth--;
        if (depth === 0) { methodEnd = i; break; }
    }

    const finalItems = existing.filter((item) => !removalSet.has(item.material));
    for (const a of additions) {
        if (!existingMaterials.has(a.material) || removalSet.has(a.material)) finalItems.push(a);
    }
    finalItems.sort((a, b) => a.material.localeCompare(b.material));
    const body = '\n' + finalItems.map((i) => registerLine(i.material, i.state, i.tags)).join('\n') + '\n    ';
    return content.substring(0, methodStart) + body + content.substring(methodEnd);
}

export function poolEdits(changes) {
    return {
        additions: changes.filter((c) => c.type === 'add' || c.type === 'modify')
            .map((c) => ({ material: c.material, state: c.state, tags: c.tags })),
        removals: changes.filter((c) => c.type === 'remove' || c.type === 'modify')
            .map((c) => ({ material: c.material })),
    };
}

export function pullRequestBody(changes) {
    const adds = changes.filter((c) => c.type === 'add');
    const mods = changes.filter((c) => c.type === 'modify');
    const rems = changes.filter((c) => c.type === 'remove');
    const sections = [];
    const tagText = (t) => (t.length ? ` (${t.join(', ')})` : '');
    if (adds.length) sections.push(`### Added (${adds.length})\n${adds.map((c) => `- ${c.material} → ${c.state}${tagText(c.tags)}`).join('\n')}`);
    if (mods.length) sections.push(`### Modified (${mods.length})\n${mods.map((c) => `- ${c.material}: ${c.oldState} → ${c.state}${tagText(c.tags)}`).join('\n')}`);
    if (rems.length) sections.push(`### Removed (${rems.length})\n${rems.map((c) => `- ${c.material}`).join('\n')}`);
    return `## Changes\n\n${sections.join('\n\n')}\n\nOpened from the Item Pools page.`;
}

/* ── The descriptions: descriptions.yml's descriptions: block ──────────────────────── */

export function updateDescriptionInConfig(content, materialName, descriptionLines) {
    const configLines = content.split('\n');
    const result = [];
    let inDescriptions = false;
    let inTargetItem = false;
    let targetFound = false;
    const writeItem = () => {
        result.push(`  ${materialName}:`);
        descriptionLines.forEach((l) => result.push(`    - ${yamlQuote(l)}`));
    };

    for (const line of configLines) {
        if (line.trim() === 'descriptions:') { inDescriptions = true; result.push(line); continue; }
        if (!inDescriptions) { result.push(line); continue; }

        if (/^[a-zA-Z]/.test(line) && !line.startsWith(' ')) {
            inTargetItem = false;
            if (!targetFound) { writeItem(); targetFound = true; }
            inDescriptions = false;
            result.push(line);
            continue;
        }
        const itemMatch = line.match(/^\s{2}([A-Z_0-9]+):\s*$/);
        if (itemMatch) {
            inTargetItem = false;
            if (itemMatch[1] === materialName) { writeItem(); inTargetItem = true; targetFound = true; continue; }
            result.push(line);
            continue;
        }
        if (/^\s{4}-\s*"/.test(line)) { if (!inTargetItem) result.push(line); continue; }
        // Blank lines inside the section are dropped, as the old editor did, to keep it tidy.
        if (line.trim() === '') continue;
        if (!inTargetItem) result.push(line);
    }
    if (inDescriptions && !targetFound) writeItem();
    return result.join('\n');
}

export function deleteDescriptionFromConfig(content, materialName) {
    const result = [];
    let inDescriptions = false;
    let inTargetItem = false;
    for (const line of content.split('\n')) {
        if (line.trim() === 'descriptions:') { inDescriptions = true; result.push(line); continue; }
        if (!inDescriptions) { result.push(line); continue; }
        if (/^[a-zA-Z]/.test(line) && !line.startsWith(' ')) {
            inDescriptions = false; inTargetItem = false; result.push(line); continue;
        }
        const itemMatch = line.match(/^\s{2}([A-Z_0-9]+):\s*$/);
        if (itemMatch) {
            inTargetItem = itemMatch[1] === materialName;
            if (!inTargetItem) result.push(line);
            continue;
        }
        if (inTargetItem) continue;
        if (line.trim() === '') continue;
        result.push(line);
    }
    return result.join('\n');
}

export function applyDescriptionChanges(content, changes) {
    return changes.reduce((text, c) => (c.lines === null
        ? deleteDescriptionFromConfig(text, c.material)
        : updateDescriptionInConfig(text, c.material, trimTrailingEmpty(c.lines))), content);
}

/* A "&7" spacer is content and is kept. */
export function trimTrailingEmpty(lines) {
    const out = [...lines];
    while (out.length > 1 && out[out.length - 1] === '') out.pop();
    return out;
}
