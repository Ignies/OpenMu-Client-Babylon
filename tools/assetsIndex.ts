// Builds the pre-download indexes: what the screen offers, and what each group
// costs. One per game version, named after its converted tree
// (`assetsIndexUrl`): `assets-index.json` for Season 6, `assets-index-v097d.json`
// for 0.97d.
//
//   bun run tools/assetsIndex.ts                 (over dist/, after the build)
//   bun run tools/assetsIndex.ts --root dist
//
// Runs LAST in the build, after `compress-assets`, because the number that
// matters to a player is what crosses the wire and that is the `.gz` sidecar
// wherever one exists. A GLB is 329 MB on disk and 93 MB gzipped; quoting the
// disk size would talk people out of the cheapest group in the game.
//
// With `MU_LITE_ASSETS=on` (or `--on`) the lighter copies `tools/liteAssets.ts` wrote are listed
// in their original's group (`lite`, `liteTransfer`); without it they are left out, and the index
// is what it was.
//
// The map groups come from `versions/shared/maps/layers.ts` rather than from a
// list here, so there is one owner of "which asset folder does this map use" -
// the event castles all share a folder (`worldAssets.ts`), and a second copy of
// that rule here would rot.
//
// A version that borrows (`data.borrows`, 0.97d) lists each file at the url it
// reads it from: its own file where it ships one, the lender's otherwise, never
// both, and nothing it lacks; nor the lender's sound for a key it plays its own
// file for (`data.sounds`). The resolvers are the client's own (`assetUrl`,
// `dataUrl`), so the index cannot disagree with what the game asks for. Its map
// groups are its own worlds (`data.worlds`), not every one the lender holds.

import { existsSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative, resolve, sep } from 'path';
import { COMPRESSED_EXTENSIONS, COMPRESSED_SUFFIX } from '../src/controllers/assets/compressedAssets';
import { liteSourceOf } from '../src/controllers/assets/liteAssets';
import { dataUrl } from '../src/controllers/assets/mu/dataFolder';
import { assetsIndexUrl, assetUrl } from '../src/controllers/assets/resolveUrlToDataFolder';
import { SOUND_FILES } from '../src/controllers/sound/recipes';
import type { VersionData } from '../src/version/contract';
import { season6Data } from '../versions/season6/data';
import { MAP_LAYERS } from '../versions/shared/maps/layers';
import { v097dData } from '../versions/v097d/data';
import { liteAssetsWanted } from './liteAssets';

/** Every version the client carries (`versions/registry.ts`), each with its own index. */
export const INDEXED_VERSIONS: readonly { id: string; data: VersionData }[] = [
  { id: 'season6', data: season6Data },
  { id: 'v097d', data: v097dData },
];

const slash = (p: string) => p.split(sep).join('/');

type Entry = { name: string; bytes: number; gz: number | null };
export type Group = {
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
  /** The lighter copies (`tools/liteAssets.ts`), shaped like `dirs`; only where the build wrote some. */
  lite?: [string, [string, number][]][];
  /** What it costs with each copy taken instead of its original. */
  liteTransfer?: number;
};

/** A served tree under the build root: converted assets, an original `Data/`, or the item icons. */
type Tree = { url: string; kind: 'assets' | 'data' | 'items'; reads: (rel: string) => string };

/** The folder under the build root a tree url names (`./game-assets/`), or null for another origin. */
function folderOf(url: string): string | null {
  return /^[a-z]+:/i.test(url) ? null : url.replace(/^\.?\/+/, '').replace(/\/+$/, '');
}

/** Files that exist in the tree but the client never asks for. */
function ignored(tree: Tree, rel: string): boolean {
  const lower = rel.toLowerCase();
  if (lower.endsWith(COMPRESSED_SUFFIX)) return true; // counted with its source
  if (/assets-index[^/]*\.json$/.test(lower)) return true;
  // The converter leaves the intermediate images beside the GLBs it baked
  // them into; nothing loads them.
  return tree.kind === 'assets' && /\.(jpg|jpeg|tga)$/.test(lower);
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

/** Which group a tree-relative path belongs to. */
function groupOf(tree: Tree, rel: string): { id: string; kind: Group['kind']; world?: number } {
  if (tree.kind === 'items') return { id: 'icons', kind: 'icons' };

  const folder = rel.split('/')[0];
  if (tree.kind === 'assets') {
    if (folder === 'Music' || folder === 'Sound') return { id: 'audio', kind: 'audio' };
    if (folder === 'Monster') return { id: 'monsters', kind: 'monsters' };
    if (CORE_FOLDERS.has(folder)) return { id: 'core', kind: 'core' };
    const world = /^(?:World|Object)(\d+)$/i.exec(folder);
    if (world) return { id: `map:${world[1]}`, kind: 'map', world: Number(world[1]) };
    return { id: 'core', kind: 'core' };
  }

  // A map's minimap lives in the original tree, not the converted one. A folder is a
  // world in any case: the original reads them on Windows (Data/world55 is World55).
  const world = /^World(\d+)$/i.exec(folder);
  if (world) return { id: `map:${world[1]}`, kind: 'map', world: Number(world[1]) };
  return { id: 'core', kind: 'core' };
}

function nameFor(kind: Group['kind'], world?: number): string {
  if (kind === 'map') {
    const names = worldNames.get(world!) ?? [];
    return names.length ? names.map(pretty).join(' / ') : `World ${world}`;
  }
  return { core: 'Core', monsters: 'Monsters', audio: 'Music and sounds', icons: 'Item icons' }[kind]!;
}

const soundFile = (file: string) => file.replace(/^[./]+/, '').toLowerCase();

/** Catalogue files a version never plays: every key that named them plays its own file (`data.sounds`). */
function replacedSounds(data: VersionData): Set<string> {
  const own = data.sounds ?? {};
  const played = new Set([
    ...Object.entries(SOUND_FILES).filter(([key]) => !own[key]).map(([, file]) => soundFile(file)),
    ...Object.values(own).map(soundFile),
  ]);
  return new Set(Object.keys(own).flatMap(key => (SOUND_FILES[key] ? [soundFile(SOUND_FILES[key])] : [])).filter(f => !played.has(f)));
}

/** The trees a version reads (its own, then the ones it borrows from), in walking order. */
function treesOf(data: VersionData): Tree[] {
  const trees: Tree[] = [];
  const replaced = replacedSounds(data);
  for (const url of [data.assets, data.borrows?.assets]) {
    if (url) trees.push({ url, kind: 'assets', reads: rel => (replaced.has(rel.toLowerCase()) ? '' : assetUrl(data, rel)) });
  }
  // packs/ is offered through the pack picker, which already has its sizes.
  trees.push({ url: './items/', kind: 'items', reads: rel => `./items/${rel}` });
  for (const url of [data.folder, data.borrows?.folder]) {
    if (url) trees.push({ url, kind: 'data', reads: rel => dataUrl(data, rel) });
  }
  return trees;
}

function addTo(dirs: [string, [string, number][]][], dir: string, entry: Entry): void {
  let bucket = dirs.find(d => d[0] === dir);
  if (!bucket) {
    bucket = [dir, []];
    dirs.push(bucket);
  }
  bucket[1].push([entry.name, entry.bytes]);
}

/**
 * One version's index over a built tree (`dist/`). With `lite`, each copy `tools/liteAssets.ts`
 * wrote goes in its original's group as `lite`; without it the copies are left out altogether.
 */
export function buildAssetsIndex(root: string, data: VersionData, { lite = false } = {}): { sidecars: boolean; groups: Group[] } {
  const groups = new Map<string, Group>();
  const worlds = new Set(data.worlds);

  for (const tree of treesOf(data)) {
    const folder = folderOf(tree.url);
    if (folder === null) continue;

    for (const abs of walk(join(root, folder))) {
      const rel = slash(relative(join(root, folder), abs));
      // A lighter copy is listed with its original, which the version must read from this tree.
      const source = liteSourceOf(`${folder}/${rel}`)?.slice(folder.length + 1) ?? null;
      const copy = source !== null && existsSync(join(root, folder, source));
      if (copy && !lite) continue;
      const read = copy ? source : rel;
      // Kept only where the version reads it from this very tree.
      if (ignored(tree, rel) || tree.reads(read) !== tree.url + read) continue;

      const where = groupOf(tree, read);
      // A world the version does not have (`data.worlds`), though a lender's tree holds it.
      if (where.world !== undefined && !worlds.has(where.world)) continue;
      let group = groups.get(where.id);
      if (!group) {
        group = {
          id: where.id,
          kind: where.kind,
          name: nameFor(where.kind, where.world),
          world: where.world,
          files: 0,
          bytes: 0,
          transfer: 0,
          dirs: [],
        };
        groups.set(where.id, group);
      }

      const entry = measure(abs, rel);
      const dir = `./${folder}/${rel.slice(0, rel.length - entry.name.length)}`;
      if (copy) {
        const original = measure(join(root, folder, source), source);
        addTo((group.lite ??= []), dir, entry);
        group.liteTransfer = (group.liteTransfer ?? 0) + entry.bytes - (original.gz ?? original.bytes);
        continue;
      }
      addTo(group.dirs, dir, entry);
      group.files++;
      group.bytes += entry.bytes;
      group.transfer += entry.gz ?? entry.bytes;
    }
  }

  const ordered = [...groups.values()].sort((a, b) => {
    const rank = (g: Group) => ['core', 'monsters', 'audio', 'icons', 'map'].indexOf(g.kind);
    return rank(a) - rank(b) || (a.world ?? 0) - (b.world ?? 0);
  });
  for (const g of ordered) {
    g.dirs.sort((a, b) => a[0].localeCompare(b[0]));
    g.lite?.sort((a, b) => a[0].localeCompare(b[0]));
    // Walked as a difference: the copies' bytes less their originals'.
    if (g.liteTransfer !== undefined) g.liteTransfer += g.transfer;
  }

  // Whether this deployment ships gzip sidecars. The client still reads its
  // own latch; this is so the screen can quote the right total before any
  // asset has been read.
  return { sidecars: ordered.some(g => g.transfer < g.bytes), groups: ordered };
}

function main(): void {
  const i = process.argv.indexOf('--root');
  const ROOT = resolve(import.meta.dir, '..');
  const TREE = resolve(ROOT, i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : 'dist');

  if (!existsSync(TREE)) {
    console.error(`assetsIndex: ${TREE} does not exist; run the build first`);
    process.exit(1);
  }

  const mb = (n: number) => `${(n / 1048576).toFixed(1)} MB`;
  for (const { id, data } of INDEXED_VERSIONS) {
    const file = folderOf(assetsIndexUrl(data));
    if (file === null) {
      console.log(`assetsIndex: ${id} serves its assets from another origin; no index`);
      continue;
    }

    const { sidecars, groups } = buildAssetsIndex(TREE, data, { lite: liteAssetsWanted(process.env, process.argv) });
    const out = join(TREE, file);
    writeFileSync(out, JSON.stringify({ built: new Date().toISOString(), sidecars, groups }));

    console.log(`assetsIndex: ${id} over ${TREE}${sidecars ? '' : '  (no gzip sidecars found)'}`);
    for (const g of groups) {
      console.log(
        `  ${g.id.padEnd(12)} ${String(g.files).padStart(5)} files  ${mb(g.bytes).padStart(9)} on disk  ${mb(g.transfer).padStart(9)} over the wire   ${g.name}`
      );
    }
    const total = groups.reduce((n, g) => n + g.transfer, 0);
    console.log(`  ${''.padEnd(12)} ${String(groups.reduce((n, g) => n + g.files, 0)).padStart(5)} files  ${''.padStart(9)}          ${mb(total).padStart(9)} total`);
    console.log(`wrote ${slash(relative(ROOT, out))}`);
  }
}

if (import.meta.main) main();
