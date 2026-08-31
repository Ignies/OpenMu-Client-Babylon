// Copies the subset of the original `Data/` tree that the client fetches at
// runtime into `dist/Data`, so a `vite build` is self-contained.
//
// Everything the client reads from `./Data/` goes through
// `src/libs/mu/dataFolder.ts` (sprites, effect textures, Local tables,
// gate.bmd, PBR maps). Models, terrain and sounds live in the converted
// `public/game-assets` and are picked up by Vite on their own. The rules
// below were derived by grepping every `downloadDataFile`, `loadMuSprite`,
// `loadInterfaceSprite`, `loadEffectTexture` and `resolveDataUrl` call site;
// keep them in step when a new folder or extension is fetched.
//
// Usage: bun run tools/copyData.ts [--src Data] [--out dist/Data] [--dry]
// Skipped entirely when DATA_COPY=off (e.g. a deployment that serves Data/
// from another origin via VITE_DATA_URL).

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from 'fs';
import { join, relative, resolve } from 'path';

type Rule = {
  /** Folder under Data/ (`''` = the root, not recursed). */
  dir: string;
  /** Lower-case extensions to keep; `null` = every file. */
  ext: string[] | null;
  /** Lower-case file names always kept regardless of extension. */
  names?: string[];
  /** Match `dir` as a prefix with a numeric suffix (`World` → World1, World73…). */
  numbered?: boolean;
};

const SPRITE = ['ozj', 'ozt'];

const RULES: Rule[] = [
  // gates.ts → gate.bmd
  { dir: '', ext: [], names: ['gate.bmd'] },
  // libs/mu/sprites.ts → loadInterfaceSprite('…') = Interface/**
  { dir: 'Interface', ext: SPRITE },
  // effect textures, item chrome maps (Chrome01/Shiny01/Chrome02 .jpg)
  { dir: 'Effect', ext: SPRITE, names: ['chrome01.jpg', 'shiny01.jpg', 'chrome02.jpg'] },
  // loginPage → Logo/MU-logo*.OZ?
  { dir: 'Logo', ext: SPRITE },
  // masterTree / questFiles / moveReqFile / minimap markers → Local/**/*.bmd,
  // plus the language packs' NpcName_<Lang>.txt (libs/mu/npcNameFile.ts).
  { dir: 'Local', ext: ['bmd', 'txt', ...SPRITE] },
  // pbrMaps.ts → PBR/manifest.json + authored maps (optional folder)
  { dir: 'PBR', ext: null },
  // minimap.ts → World*/mini_map.OZT + Minimap.bmd; weather → World*/leaf*.OZ?
  { dir: 'World', ext: [], names: ['mini_map.ozt', 'minimap.bmd', 'leaf01.ozt', 'leaf01.ozj', 'leaf02.ozj', 'leaf02.ozt'], numbered: true },
];

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const ROOT = resolve(import.meta.dir, '..');
const SRC = resolve(ROOT, arg('--src', 'Data'));
const OUT = resolve(ROOT, arg('--out', 'dist/Data'));
const DRY = process.argv.includes('--dry');

if ((process.env.DATA_COPY ?? 'on') === 'off') {
  console.log('copyData: DATA_COPY=off, skipping');
  process.exit(0);
}

if (!existsSync(SRC)) {
  console.error(`copyData: source folder not found: ${SRC}`);
  process.exit(1);
}

let files = 0;
let bytes = 0;
const perDir = new Map<string, { files: number; bytes: number }>();

function keep(rule: Rule, file: string): boolean {
  const lower = file.toLowerCase();
  if (rule.names?.includes(lower)) return true;
  if (rule.ext === null) return true;
  const ext = lower.split('.').pop() ?? '';
  return rule.ext.includes(ext);
}

function copyTree(rule: Rule, from: string, recurse: boolean) {
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const full = join(from, entry.name);
    if (entry.isDirectory()) {
      if (recurse) copyTree(rule, full, true);
      continue;
    }
    if (!entry.isFile() || !keep(rule, entry.name)) continue;

    const rel = relative(SRC, full);
    const dest = join(OUT, rel);
    const size = statSync(full).size;
    if (!DRY) {
      mkdirSync(join(dest, '..'), { recursive: true });
      copyFileSync(full, dest);
    }
    files++;
    bytes += size;
    const top = rel.split(/[\\/]/)[0];
    const stat = perDir.get(top) ?? { files: 0, bytes: 0 };
    stat.files++;
    stat.bytes += size;
    perDir.set(top, stat);
  }
}

if (!DRY) {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
}

for (const rule of RULES) {
  if (rule.dir === '') {
    copyTree(rule, SRC, false);
    continue;
  }
  if (rule.numbered) {
    const re = new RegExp(`^${rule.dir}\\d+$`, 'i');
    for (const entry of readdirSync(SRC, { withFileTypes: true })) {
      if (entry.isDirectory() && re.test(entry.name)) {
        copyTree(rule, join(SRC, entry.name), false);
      }
    }
    continue;
  }
  const dir = join(SRC, rule.dir);
  if (existsSync(dir)) copyTree(rule, dir, true);
}

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;
for (const [dir, stat] of [...perDir].sort()) {
  console.log(`  ${dir.padEnd(12)} ${String(stat.files).padStart(5)} files  ${mb(stat.bytes)}`);
}
console.log(
  `copyData: ${DRY ? 'would copy' : 'copied'} ${files} files, ${mb(bytes)} → ${OUT}`
);
