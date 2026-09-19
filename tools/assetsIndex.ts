// Builds `assets-index.json`: what the pre-download screen offers, and what
// each group costs.
//
//   bun run tools/assetsIndex.ts                 (over dist/, after the build)
//   bun run tools/assetsIndex.ts --root dist --out dist/assets-index.json
//
// Runs LAST in the build, after `compress-assets`, because the number that
// matters to a player is what crosses the wire and that is the `.gz` sidecar
// wherever one exists. A GLB is 329 MB on disk and 93 MB gzipped; quoting the
// disk size would talk people out of the cheapest group in the game.
//
// The map groups come from `src/maps/layers.ts` rather than from a list here,
// so there is one owner of "which asset folder does this map use" - the event
// castles all share a folder (`worldAssets.ts`), and a second copy of that
// rule here would rot.

import { existsSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative, resolve, sep } from 'path';
import { COMPRESSED_EXTENSIONS, COMPRESSED_SUFFIX } from '../src/common/compressedAssets';
import { MAP_LAYERS } from '../src/maps/layers';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const ROOT = resolve(import.meta.dir, '..');
const TREE = resolve(ROOT, arg('--root', 'dist'));
const OUT = resolve(ROOT, arg('--out', join(arg('--root', 'dist'), 'assets-index.json')));

if (!existsSync(TREE)) {
  console.error(`assetsIndex: ${TREE} does not exist; run the build first`);
  process.exit(1);
}

const slash = (p: string) => p.split(sep).join('/');

type Entry = { name: string; bytes: number; gz: number | null };
type Group = {
  id: string;
  /** `core` is never optional; the rest the player chooses. */
  kind: 'core' | 'monsters' | 'audio' | 'icons' | 'map';
  name: string;
  /** Asset-folder number, for map groups. */
  world?: number;
  files: number;
  bytes: number;
  /** What it costs over the wire: the sidecar where there is one. */
  transfer: number;
  dirs: [string, [string, number][]][];
};

/** Files that exist in the tree but the client never asks for. */
function ignored(rel: string): boolean {
  const lower = rel.toLowerCase();
  if (lower.endsWith(COMPRESSED_SUFFIX)) return true; // counted with its source
  if (lower.endsWith('assets-index.json')) return true;
  // The converter leaves the intermediate images beside the GLBs it baked
  // them into; nothing loads them.
  if (/^game-assets\/.*\.(jpg|jpeg|tga)$/.test(lower)) return true;
  return false;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.isFile()) out.push(p);
  }
  return out;
}

/** The URL the client will request, and what that request weighs. */
function measure(abs: string, rel: string): Entry {
  const bytes = statSync(abs).size;
  const ext = rel.split('.').pop()?.toLowerCase() ?? '';
  let gz: number | null = null;
  if (COMPRESSED_EXTENSIONS.has(ext) && existsSync(abs + COMPRESSED_SUFFIX)) {
    gz = statSync(abs + COMPRESSED_SUFFIX).size;
  }
  return { name: rel.split('/').pop()!, bytes, gz };
}

// ------------------------------------------------------------- map folders

/** Asset-folder number -> the maps that use it. Several maps share one. */
const worldNames = new Map<number, string[]>();
for (const layer of MAP_LAYERS) {
  const world = layer.assetWorld ?? layer.worlds[0] + 1;
  const names = worldNames.get(world) ?? [];
  names.push(layer.name);
  worldNames.set(world, names);
}

const pretty = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

// ------------------------------------------------------------- the grouping

const CORE_FOLDERS = new Set(['Player', 'Item', 'NPC', 'Effect', 'Skill', 'Instrument', 'Logo']);

/** Which group a tree-relative path belongs to, or null to leave it out. */
function groupOf(rel: string): { id: string; kind: Group['kind']; world?: number } | null {
  const parts = rel.split('/');

  if (parts[0] === 'items') return { id: 'icons', kind: 'icons' };

  if (parts[0] === 'game-assets') {
    const folder = parts[1] ?? '';
    if (folder === 'Music' || folder === 'Sound') return { id: 'audio', kind: 'audio' };
    if (folder === 'Monster') return { id: 'monsters', kind: 'monsters' };
    if (CORE_FOLDERS.has(folder)) return { id: 'core', kind: 'core' };
    const world = /^(?:World|Object)(\d+)$/.exec(folder);
    if (world) return { id: `map:${world[1]}`, kind: 'map', world: Number(world[1]) };
    return { id: 'core', kind: 'core' };
  }

  if (parts[0] === 'Data') {
    // A map's minimap lives in the original tree, not the converted one.
    const world = /^World(\d+)$/.exec(parts[1] ?? '');
    if (world) return { id: `map:${world[1]}`, kind: 'map', world: Number(world[1]) };
    return { id: 'core', kind: 'core' };
  }

  // packs/ is offered through the pack picker, which already has its sizes.
  return null;
}

const groups = new Map<string, Group>();

function nameFor(id: string, kind: Group['kind'], world?: number): string {
  if (kind === 'map') {
    const names = worldNames.get(world!) ?? [];
    return names.length ? names.map(pretty).join(' / ') : `World ${world}`;
  }
  return { core: 'Core', monsters: 'Monsters', audio: 'Music and sounds', icons: 'Item icons' }[
    kind
  ]!;
}

let skipped = 0;

for (const top of ['game-assets', 'items', 'Data']) {
  const base = join(TREE, top);
  for (const abs of walk(base)) {
    const rel = slash(relative(TREE, abs));
    if (ignored(rel)) continue;

    const where = groupOf(rel);
    if (!where) {
      skipped++;
      continue;
    }

    let group = groups.get(where.id);
    if (!group) {
      group = {
        id: where.id,
        kind: where.kind,
        name: nameFor(where.id, where.kind, where.world),
        world: where.world,
        files: 0,
        bytes: 0,
        transfer: 0,
        dirs: [],
      };
      groups.set(where.id, group);
    }

    const entry = measure(abs, rel);
    const dir = './' + rel.slice(0, rel.length - entry.name.length);
    let bucket = group.dirs.find(d => d[0] === dir);
    if (!bucket) {
      bucket = [dir, []];
      group.dirs.push(bucket);
    }
    bucket[1].push([entry.name, entry.bytes]);
    group.files++;
    group.bytes += entry.bytes;
    group.transfer += entry.gz ?? entry.bytes;
  }
}

const sidecars = [...groups.values()].some(g => g.transfer < g.bytes);

const ordered = [...groups.values()].sort((a, b) => {
  const rank = (g: Group) => ['core', 'monsters', 'audio', 'icons', 'map'].indexOf(g.kind);
  return rank(a) - rank(b) || (a.world ?? 0) - (b.world ?? 0);
});
for (const g of ordered) g.dirs.sort((a, b) => a[0].localeCompare(b[0]));

writeFileSync(
  OUT,
  JSON.stringify({
    built: new Date().toISOString(),
    // Whether this deployment ships gzip sidecars. The client still reads its
    // own latch; this is so the screen can quote the right total before any
    // asset has been read.
    sidecars,
    groups: ordered,
  })
);

const mb = (n: number) => `${(n / 1048576).toFixed(1)} MB`;
console.log(`assetsIndex: ${TREE}${sidecars ? '' : '  (no gzip sidecars found)'}`);
for (const g of ordered) {
  console.log(
    `  ${g.id.padEnd(12)} ${String(g.files).padStart(5)} files  ${mb(g.bytes).padStart(9)} on disk  ${mb(g.transfer).padStart(9)} over the wire   ${g.name}`
  );
}
const total = ordered.reduce((n, g) => n + g.transfer, 0);
console.log(`  ${''.padEnd(12)} ${String(ordered.reduce((n, g) => n + g.files, 0)).padStart(5)} files  ${''.padStart(9)}          ${mb(total).padStart(9)} total`);
if (skipped) console.log(`  (${skipped} files outside any group)`);
console.log(`wrote ${slash(relative(ROOT, OUT))}`);
