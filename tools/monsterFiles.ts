// Read and write the monster folders' data files (versions/shared/monsters/<name>/index.ts) for tools.
// A monster keeps its folder (other files in it stay); a new one gets its name in snake_case
// (plus `_<number>` when two share a name).
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import type { MonsterDef } from '../src/controllers/monsters';

const MONSTERS_DIR = resolve(import.meta.dir, '../versions/shared/monsters');

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

function renderMonster(d: MonsterDef): string {
  const lines = [`  Numb: ${d.Numb},`, `  Name: ${value(d.Name)},`];
  if (d.maxHealth !== undefined) lines.push(`  maxHealth: ${d.maxHealth},`);
  if (d.subType !== undefined) lines.push(`  subType: ${d.subType},`);
  if (d.model) {
    const hidden = d.model.hiddenMesh !== undefined ? `, hiddenMesh: ${d.model.hiddenMesh}` : '';
    lines.push(`  model: { type: ${d.model.type}, scale: ${d.model.scale}${hidden} },`);
  }
  if (d.stats) lines.push('  stats: {', ...Object.entries(d.stats).map(([k, v]) => `    ${key(k)}: ${value(v)},`), '  },');
  return `import { defineMonster } from '@/controllers/monsters';\n\nexport default defineMonster({\n${lines.join('\n')}\n});\n`;
}

/** Sets (or removes) the `maxHealth` line of a monster file, leaving the rest as written. */
function withMaxHealth(text: string, maxHealth: number | undefined): string {
  const line = /^ {2}maxHealth: .*?(\r?\n)/m;
  if (maxHealth === undefined) return text.replace(line, '');
  if (line.test(text)) return text.replace(line, `  maxHealth: ${maxHealth},$1`);
  return text.replace(/^( {2}Name: .*?(\r?\n))/m, `$1  maxHealth: ${maxHealth},$2`);
}

/**
 * Writes each def's `maxHealth` into its folder: the existing file keeps everything else (the NPC
 * fields and their comments are hand-written), a new number gets a new folder from `renderMonster`.
 */
export function writeMonsterFiles(defs: MonsterDef[]): void {
  const existing = new Map(readMonsterFiles().map(f => [f.def.Numb, f.folder]));
  const taken = new Set(existing.values());
  for (const d of defs) {
    const folder = existing.get(d.Numb);
    if (folder) {
      const path = join(MONSTERS_DIR, folder, 'index.ts');
      writeFileSync(path, withMaxHealth(readFileSync(path, 'utf8'), d.maxHealth));
      continue;
    }
    const fresh = taken.has(slug(d.Name)) ? `${slug(d.Name)}_${d.Numb}` : slug(d.Name);
    taken.add(fresh);
    mkdirSync(join(MONSTERS_DIR, fresh), { recursive: true });
    writeFileSync(join(MONSTERS_DIR, fresh, 'index.ts'), renderMonster(d));
  }
}
