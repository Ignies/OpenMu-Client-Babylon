// Read and write the monster folders' data files (versions/shared/monsters/<name>/index.ts) for tools.
// A monster keeps its folder (other files in it stay); a new one gets its name in snake_case
// (plus `_<number>` when two share a name).
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import type { MonsterDef } from '../src/controllers/monsters';

export const MONSTERS_DIR = resolve(import.meta.dir, '../versions/shared/monsters');

/** Every monster file, with the folder it lives in. */
export function readMonsterFiles(): { folder: string; def: MonsterDef }[] {
  return readdirSync(MONSTERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(join(MONSTERS_DIR, d.name, 'index.ts')))
    .map(d => ({ folder: d.name, def: require(join(MONSTERS_DIR, d.name, 'index.ts')).default as MonsterDef }))
    .sort((a, b) => a.def.Numb - b.def.Numb);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const key = (k: string) => (/^[A-Za-z_]\w*$/.test(k) ? k : `'${k}'`);
const value = (v: unknown) => (typeof v === 'string' ? `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'` : String(v));

export function renderMonster(d: MonsterDef): string {
  const lines = [`  Numb: ${d.Numb},`, `  Name: ${value(d.Name)},`];
  if (d.maxHealth !== undefined) lines.push(`  maxHealth: ${d.maxHealth},`);
  if (d.model) {
    const hidden = d.model.hiddenMesh !== undefined ? `, hiddenMesh: ${d.model.hiddenMesh}` : '';
    lines.push(`  model: { type: ${d.model.type}, scale: ${d.model.scale}${hidden} },`);
  }
  if (d.stats) lines.push('  stats: {', ...Object.entries(d.stats).map(([k, v]) => `    ${key(k)}: ${value(v)},`), '  },');
  return `import { defineMonster } from '@/controllers/monsters';\n\nexport default defineMonster({\n${lines.join('\n')}\n});\n`;
}

/** Writes each def into its folder: the existing one for a known number, a new one otherwise. */
export function writeMonsterFiles(defs: MonsterDef[]): void {
  const existing = new Map(readMonsterFiles().map(f => [f.def.Numb, f.folder]));
  const taken = new Set(existing.values());
  for (const d of defs) {
    let folder = existing.get(d.Numb);
    if (!folder) {
      folder = taken.has(slug(d.Name)) ? `${slug(d.Name)}_${d.Numb}` : slug(d.Name);
      taken.add(folder);
    }
    mkdirSync(join(MONSTERS_DIR, folder), { recursive: true });
    writeFileSync(join(MONSTERS_DIR, folder, 'index.ts'), renderMonster(d));
  }
}
