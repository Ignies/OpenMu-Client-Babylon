// Read and write the item files (versions/shared/items/<group>/<item>.ts) for the import tools.
// One file per item; a file's name is the item's name in snake_case (plus `_<index>` when two share it).
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import type { ItemRecord } from '../src/controllers/items';

export const ITEMS_DIR = resolve(import.meta.dir, '../versions/shared/items');
const GROUP_FOLDERS = ['swords', 'axes', 'maces', 'spears', 'bows', 'staffs', 'shields', 'helms', 'armors', 'pants', 'gloves', 'boots', 'wings', 'helpers', 'potions', 'misc'];

type Row = Record<string, number | string>;

export function readItemFiles(): Row[] {
  return GROUP_FOLDERS.filter(g => existsSync(join(ITEMS_DIR, g)))
    .flatMap(g => readdirSync(join(ITEMS_DIR, g)).filter(f => f.endsWith('.ts')).map(f => require(join(ITEMS_DIR, g, f)).default as Row))
    .sort((a, b) => Number(a.Group) - Number(b.Group) || Number(a.Index) - Number(b.Index));
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const key = (k: string) => (/^[A-Za-z_]\w*$/.test(k) ? k : `'${k}'`);
const value = (v: unknown) => (typeof v === 'string' ? `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'` : String(v));

/** Replaces every item file with `items` (field order kept). */
export function writeItemFiles(items: Row[]): void {
  const counts = new Map<string, number>();
  for (const i of items) counts.set(`${i.Group}/${slug(String(i.ItemName))}`, (counts.get(`${i.Group}/${slug(String(i.ItemName))}`) ?? 0) + 1);
  for (const g of GROUP_FOLDERS) rmSync(join(ITEMS_DIR, g), { recursive: true, force: true });
  for (const item of items) {
    const name = slug(String(item.ItemName));
    const file = counts.get(`${item.Group}/${name}`)! > 1 ? `${name}_${item.Index}` : name;
    const dir = join(ITEMS_DIR, GROUP_FOLDERS[Number(item.Group)]);
    mkdirSync(dir, { recursive: true });
    const body = Object.entries(item).map(([k, v]) => `  ${key(k)}: ${value(v)},`).join('\n');
    writeFileSync(join(dir, `${file}.ts`), `import { defineItem } from '@/controllers/items';\n\nexport default defineItem({\n${body}\n});\n`);
  }
}

export type { ItemRecord };
