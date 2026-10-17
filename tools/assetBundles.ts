// Packs each pre-download group into one file (`dist/bundles/<version>-<group>.bin`) and records it
// in the assets index as `bundle`, so the first-run download fetches a handful of big files instead
// of thousands of small ones. The page stores a bundle whole (`assetDownload.ts`) and the cache
// worker slices each file out of it (`public/sw.js`).
//
// A bundle holds the urls a lighter-assets player reads: the lighter copy where the group lists one
// (`Group.lite`), else the gzip sidecar where the index says sidecars ship, else the plain file. So
// it is written only with the lighter copies: `MU_LITE_ASSETS=on` or `--on`, like `liteAssets.ts`.
//
// Format: `MUB1`, a u32 (little endian) header length, the header (JSON `[[key, size], ...]`), then
// the bodies in header order.
//
// Runs LAST in `bun run build`, after `assets-index`.
// Usage: MU_LITE_ASSETS=on bun run tools/assetBundles.ts [--root dist]

import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, statSync, writeFileSync, writeSync } from 'fs';
import { join, resolve } from 'path';
import { COMPRESSED_SUFFIX, isCompressedAsset } from '../src/controllers/assets/compressedAssets';
import { liteVariantOf } from '../src/controllers/assets/liteAssets';
import { liteAssetsWanted } from './liteAssets';

type Dirs = [string, [string, number][]][];
type Group = { id: string; dirs: Dirs; lite?: Dirs; bundle?: { url: string; bytes: number } };

const MAGIC = 'MUB1';
const urls = (dirs: Dirs = []) => dirs.flatMap(([dir, files]) => files.map(([name]) => dir + name));

/** The files a bundle holds, and where its bodies start. */
export function readBundleHeader(bytes: Uint8Array): { files: [string, number][]; start: number } {
  if (new TextDecoder().decode(bytes.subarray(0, 4)) !== MAGIC) throw new Error('not a bundle');
  const length = new DataView(bytes.buffer, bytes.byteOffset + 4, 4).getUint32(0, true);
  return { files: JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + length))), start: 8 + length };
}

/** Writes a bundle per group of every `assets-index*.json` under `root`, and the index with them. */
export async function writeAssetBundles(root: string): Promise<{ version: string; groups: number; bytes: number }[]> {
  const onDisk = (url: string) => join(root, url.replace(/^\.?\//, ''));
  const out = join(root, 'bundles');
  mkdirSync(out, { recursive: true });
  const written: { version: string; groups: number; bytes: number }[] = [];

  for (const name of readdirSync(root).filter(f => /^assets-index.*\.json$/.test(f))) {
    const path = join(root, name);
    const index = JSON.parse(readFileSync(path, 'utf8')) as { sidecars: boolean; groups: Group[] };
    const version = name.replace(/^assets-index-?/, '').replace(/\.json$/, '') || 'season6';
    let total = 0;

    for (const group of index.groups) {
      const copies = new Set(urls(group.lite));
      const keys = urls(group.dirs).flatMap(url => {
        const copy = liteVariantOf(url);
        const sidecar = url + COMPRESSED_SUFFIX;
        const key =
          copy && copies.has(copy) ? copy : index.sidecars && isCompressedAsset(url) && existsSync(onDisk(sidecar)) ? sidecar : url;
        return existsSync(onDisk(key)) ? [key] : [];
      });
      const header = new TextEncoder().encode(JSON.stringify(keys.map(key => [key, statSync(onDisk(key)).size])));
      const head = new Uint8Array(8);
      head.set(new TextEncoder().encode(MAGIC));
      new DataView(head.buffer).setUint32(4, header.length, true);

      // One body at a time: a group can be hundreds of MB.
      const file = `${version}-${group.id.replace(/[^a-z0-9]+/gi, '_')}.bin`;
      const fd = openSync(join(out, file), 'w');
      let bytes = writeSync(fd, head) + writeSync(fd, header);
      for (const key of keys) bytes += writeSync(fd, new Uint8Array(readFileSync(onDisk(key))));
      closeSync(fd);

      group.bundle = { url: `./bundles/${file}`, bytes };
      total += bytes;
    }

    writeFileSync(path, JSON.stringify(index));
    written.push({ version, groups: index.groups.length, bytes: total });
  }
  return written;
}

async function main(): Promise<void> {
  if (!liteAssetsWanted(process.env, process.argv)) {
    console.log('asset-bundles: off (MU_LITE_ASSETS is not on); nothing written');
    return;
  }
  const at = process.argv.indexOf('--root');
  const root = resolve(at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : 'dist');
  for (const { version, groups, bytes } of await writeAssetBundles(root)) {
    console.log(`asset-bundles: ${version}, ${groups} bundles, ${(bytes / 1048576).toFixed(1)} MB`);
  }
}

if (import.meta.main) await main();
