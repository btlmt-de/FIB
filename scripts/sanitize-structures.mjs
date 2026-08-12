/**
 * Strips live runtime state out of the saved Antimatter Depths structures and
 * re-applies the trial spawner configs.
 *
 * Run this after EVERY structure-block save. It is not optional cleanup — the
 * files are broken on arrival without it.
 *
 * A structure block saves a block entity exactly as it sits in the build world,
 * including state that only makes sense in that world:
 *
 *   - `vault.server_data.state_updating_resumes_at` is an ABSOLUTE game time.
 *     A vault ticking in the build world rewrites it constantly, so every save
 *     captures a fresh timestamp (192833, then 232704, …). A newly generated
 *     world starts near tick 0 and reads that as "do not update state until
 *     tick 232704" — the vault sits dead for hours of world time and no amount
 *     of right-clicking does anything. There is no way to save a live vault
 *     clean; vanilla's own ominous_vault.nbt ships as `{config, id}`, which
 *     means Mojang post-processes these files too.
 *
 *   - `trial_spawner` saves `spawn_data` / `components` and loses the config
 *     keys unless they were placed with setblock. Without `normal_config` /
 *     `ominous_config` it falls back to the default config, whose
 *     `spawn_potentials` is empty, so the spawner has nothing to spawn and
 *     never activates. Vanilla ships exactly `{id, normal_config,
 *     ominous_config}` and the state `ominous=false,waiting_for_players`
 *     (`ominous` is applied by the game when a player has Bad Omen, so
 *     hardcoding it does not stick — the key ejection lives in both configs
 *     for that reason).
 *
 * A text component stored as an NBT string is also normalised to a compound:
 * a quoted-JSON `item_name` is read as LITERAL text, which makes the vault's
 * `key_item` compare unequal to the real key under `isSameItemSameComponents`.
 * The vault then rejects the key silently — no message, no particles. The
 * "Revaulting" advancement still fires, because its trigger only checks the
 * block and the item id, so it is not evidence the key was accepted.
 *
 *   npm run sanitize:structures
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(root, 'FIB_Worldgen/data/fib/structure');

/** Every .nbt under the structure root, so new subfolders are picked up automatically. */
function structureFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...structureFiles(path));
    else if (entry.name.endsWith('.nbt')) out.push(path);
  }
  return out;
}

/** Which spawner config belongs at which position, per file. */
const SPAWNERS = {
  'antimatter_depths_vault.nbt': {
    '12,11,11': ['fib:antimatter_depths/brute/normal', 'fib:antimatter_depths/brute/ominous'],
    '17,12,11': ['fib:antimatter_depths/crossbow_piglin/normal', 'fib:antimatter_depths/crossbow_piglin/ominous'],
  },
};

/** Fields vanilla ships. Anything else on these block entities is runtime junk. */
const KEEP = {
  'minecraft:vault': ['id', 'config'],
  'minecraft:trial_spawner': ['id', 'normal_config', 'ominous_config'],
};

const SPAWNER_STATE = { ominous: 'false', trial_spawner_state: 'waiting_for_players' };

// ---------------------------------------------------------------------------
// Type-preserving NBT reader/writer.
//
// Every tag keeps its {t, v} type so a read->write round trip is byte-identical
// apart from what we deliberately change. Structure files mix byte/short/int
// freely and a lossy parse would silently rewrite block coordinates at the
// wrong width. Compounds stay as ordered arrays of {n, t, v} to preserve key
// order.
// ---------------------------------------------------------------------------

function readNbt(buf) {
  let p = 0;
  const u8 = () => buf.readUInt8(p++);
  const i32 = () => { const v = buf.readInt32BE(p); p += 4; return v; };
  const str = () => { const l = buf.readUInt16BE(p); p += 2; const s = buf.toString('utf8', p, p + l); p += l; return s; };

  function payload(t) {
    switch (t) {
      case 1: return buf.readInt8(p++);
      case 2: { const v = buf.readInt16BE(p); p += 2; return v; }
      case 3: return i32();
      case 4: { const v = buf.readBigInt64BE(p); p += 8; return v; }
      case 5: { const v = buf.readFloatBE(p); p += 4; return v; }
      case 6: { const v = buf.readDoubleBE(p); p += 8; return v; }
      case 7: { const l = i32(); const a = Buffer.from(buf.subarray(p, p + l)); p += l; return a; }
      case 8: return str();
      case 9: { const et = u8(); const l = i32(); const items = []; for (let i = 0; i < l; i++) items.push(payload(et)); return { et, items }; }
      case 10: { const entries = []; for (;;) { const t2 = u8(); if (t2 === 0) break; const n = str(); entries.push({ n, t: t2, v: payload(t2) }); } return entries; }
      case 11: { const l = i32(); const a = []; for (let i = 0; i < l; i++) a.push(i32()); return a; }
      case 12: { const l = i32(); const a = []; for (let i = 0; i < l; i++) { a.push(buf.readBigInt64BE(p)); p += 8; } return a; }
      default: throw new Error(`unknown nbt tag ${t} at ${p}`);
    }
  }
  const t = u8();
  const name = str();
  return { t, name, v: payload(t) };
}

function writeNbt(rootTag) {
  const chunks = [];
  const u8 = (v) => { const b = Buffer.alloc(1); b.writeUInt8(v); chunks.push(b); };
  const i32 = (v) => { const b = Buffer.alloc(4); b.writeInt32BE(v); chunks.push(b); };
  const str = (s) => { const sb = Buffer.from(s, 'utf8'); const b = Buffer.alloc(2); b.writeUInt16BE(sb.length); chunks.push(b, sb); };

  function payload(t, v) {
    switch (t) {
      case 1: { const b = Buffer.alloc(1); b.writeInt8(v); return chunks.push(b); }
      case 2: { const b = Buffer.alloc(2); b.writeInt16BE(v); return chunks.push(b); }
      case 3: return i32(v);
      case 4: { const b = Buffer.alloc(8); b.writeBigInt64BE(v); return chunks.push(b); }
      case 5: { const b = Buffer.alloc(4); b.writeFloatBE(v); return chunks.push(b); }
      case 6: { const b = Buffer.alloc(8); b.writeDoubleBE(v); return chunks.push(b); }
      case 7: { i32(v.length); return chunks.push(v); }
      case 8: return str(v);
      case 9: { u8(v.et); i32(v.items.length); for (const it of v.items) payload(v.et, it); return; }
      case 10: { for (const e of v) { u8(e.t); str(e.n); payload(e.t, e.v); } return u8(0); }
      case 11: { i32(v.length); for (const x of v) i32(x); return; }
      case 12: { i32(v.length); for (const x of v) { const b = Buffer.alloc(8); b.writeBigInt64BE(x); chunks.push(b); } return; }
      default: throw new Error(`unknown nbt tag ${t}`);
    }
  }
  u8(rootTag.t); str(rootTag.name); payload(rootTag.t, rootTag.v);
  return Buffer.concat(chunks);
}

const val = (cmp, key) => { const e = cmp.find((x) => x.n === key); return e ? e.v : undefined; };

// ---------------------------------------------------------------------------

let filesChanged = 0;
let problems = 0;

for (const path of structureFiles(DIR)) {
  const file = relative(DIR, path).replace(/\\/g, '/').split('/').pop();
  const original = readFileSync(path);
  const gz = original[0] === 0x1f && original[1] === 0x8b;
  const nbt = readNbt(gz ? gunzipSync(original) : original);
  const structure = nbt.v;
  const palette = val(structure, 'palette').items;
  const notes = [];
  let changed = 0;

  // 1. normalise the trial spawner block state in the palette
  palette.forEach((entry, idx) => {
    if (val(entry, 'Name') !== 'minecraft:trial_spawner') return;
    for (const p of val(entry, 'Properties') ?? []) {
      if (SPAWNER_STATE[p.n] !== undefined && p.v !== SPAWNER_STATE[p.n]) {
        notes.push(`  palette[${idx}] ${p.n}: ${p.v} -> ${SPAWNER_STATE[p.n]}`);
        p.v = SPAWNER_STATE[p.n];
        changed++;
      }
    }
  });

  // 2. rebuild the block entities
  for (const block of val(structure, 'blocks').items) {
    const name = val(palette[val(block, 'state')], 'Name');
    const keep = KEEP[name];
    const entity = val(block, 'nbt');
    if (!keep || !entity) continue;
    const pos = val(block, 'pos').items.join(',');
    const before = entity.map((x) => x.n).sort().join(',');

    for (let i = entity.length - 1; i >= 0; i--) {
      if (!keep.includes(entity[i].n)) entity.splice(i, 1);
    }

    if (name === 'minecraft:vault') {
      const keyItem = val(val(entity, 'config') ?? [], 'key_item');
      const components = keyItem && val(keyItem, 'components');
      const itemName = components?.find((x) => x.n === 'minecraft:item_name');
      if (itemName && itemName.t === 8) {
        let parsed = null;
        try { parsed = JSON.parse(itemName.v); } catch { /* not JSON — leave it */ }
        if (parsed?.text) {
          itemName.t = 10;
          itemName.v = Object.entries(parsed).map(([k, v]) => ({ n: k, t: 8, v: String(v) }));
          notes.push(`  vault @ ${pos}: item_name string -> compound`);
          changed++;
        } else {
          notes.push(`  !! vault @ ${pos}: item_name is a string but not a text component`);
          problems++;
        }
      }
    }

    if (name === 'minecraft:trial_spawner') {
      const config = SPAWNERS[file]?.[pos];
      if (!config) {
        notes.push(`  !! trial_spawner @ ${pos} in ${file} has no config mapping — add it to SPAWNERS`);
        problems++;
        continue;
      }
      const set = (k, v) => {
        const existing = entity.find((x) => x.n === k);
        if (existing) existing.v = v; else entity.push({ n: k, t: 8, v });
      };
      set('normal_config', config[0]);
      set('ominous_config', config[1]);
    }

    const after = entity.map((x) => x.n).sort().join(',');
    if (before !== after) {
      notes.push(`  ${name} @ ${pos}: {${before}} -> {${after}}`);
      changed++;
    }
  }

  if (changed) {
    const out = writeNbt(nbt);
    writeFileSync(path, gz ? gzipSync(out) : out);
    console.log(file);
    console.log(notes.join('\n'));
    filesChanged++;
  } else if (notes.length) {
    console.log(file);
    console.log(notes.join('\n'));
  }
}

console.log(filesChanged ? `\nsanitised ${filesChanged} file(s)` : '\nalready clean');
if (problems) {
  console.error(`${problems} problem(s) need attention — see !! above`);
  process.exitCode = 1;
}
