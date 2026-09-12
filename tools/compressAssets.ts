// Writes a gzip sidecar (`<file>.gz`) beside every compressible asset in a
// build, for `common/compressedAssets.ts` to read.
//
// The converted game data is binary but not compressed - a GLB is a vertex
// blob behind a large ASCII glTF header, a .OZT is an uncompressed TGA, a
// .att is a tile array - and no static host compresses those content types on
// its own. Packing them here costs build time once and takes the tree to
// roughly a third on the wire. Which extensions qualify is the client's list
// (`COMPRESSED_EXTENSIONS`), imported rather than repeated: "on the list" and
// "has a sidecar" have to mean the same thing or the client pays a 404 in
// front of every file that never had one.
//
// Runs as part of `bun run build`, after the Data copy, so a deploy picks it
// up with no extra step. A dev server can be given sidecars too:
//
//   bun run tools/compressAssets.ts --root public      (gitignored)
//
// Usage: bun run tools/compressAssets.ts [--root dist] [--level 9] [--force] [--dry]

import {
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { join, resolve } from 'path';
import {
  COMPRESSED_EXTENSIONS,
  COMPRESSED_SUFFIX,
} from '../src/common/compressedAssets';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : (process.argv[i + 1] ?? fallback);
}

const ROOT = resolve(arg('--root', 'dist'));
const LEVEL = Number(arg('--level', '9'));
const FORCE = process.argv.includes('--force');
const DRY = process.argv.includes('--dry');

function* walk(dir: string): Generator<string> {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

function compressible(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase();
  return !!ext && COMPRESSED_EXTENSIONS.has(ext);
}

const mb = (bytes: number) => (bytes / 1048576).toFixed(1) + ' MB';

let files = 0;
let skipped = 0;
let stale = 0;
let raw = 0;
let packed = 0;

for (const path of walk(ROOT)) {
  if (path.endsWith(COMPRESSED_SUFFIX)) {
    // A sidecar whose source is gone (an asset dropped between builds) would
    // otherwise be served for a file that no longer exists.
    const source = path.slice(0, -COMPRESSED_SUFFIX.length);
    try {
      statSync(source);
    } catch {
      stale++;
      if (!DRY) unlinkSync(path);
    }
    continue;
  }

  if (!compressible(path)) continue;

  const out = path + COMPRESSED_SUFFIX;
  const source = statSync(path);

  if (!FORCE) {
    try {
      if (statSync(out).mtimeMs >= source.mtimeMs) {
        skipped++;
        continue;
      }
    } catch {
      /* no sidecar yet */
    }
  }

  files++;
  raw += source.size;

  if (DRY) continue;

  const read = readFileSync(path);
  const bytes = Bun.gzipSync(
    new Uint8Array(read.buffer, read.byteOffset, read.byteLength),
    { level: LEVEL as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 }
  );
  packed += bytes.length;
  writeFileSync(out, bytes);
}

const ratio = raw === 0 ? 1 : packed / raw;

console.log(
  `compress-assets: ${ROOT}\n` +
    `  packed   ${files} files, ${mb(raw)} -> ${mb(packed)} (${(ratio * 100).toFixed(0)}%)\n` +
    `  up to date ${skipped}${stale ? `, removed ${stale} orphaned` : ''}` +
    (DRY ? '\n  (dry run, nothing written)' : '')
);
