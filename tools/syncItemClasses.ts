// Sets the class block of the item files (versions/shared/items/) to the original Item.bmd's.
//
// The original reads `Data/Local/<lang>/Item_<lang>.bmd` (ZzzOpenData.cpp:5610): 84-byte records
// run through the Bux key, `RequireClass[7]` at byte 69, in the item files' column order. The item
// files took their block from an older Item.txt and from OpenMU's tables (Summoner gear open to the
// Dark Wizard, no Rage Fighter on the items everyone uses, Rage Fighter gloves), so this runs last
// and wins. Only a row Item.bmd names, with a class block of its own, is touched; a file's values
// are rewritten in place, so its line endings stay.
//
//   bun run tools/syncItemClasses.ts [--bmd <path>] [--dry]
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ITEMS_DIR } from './itemFiles';

const args = process.argv.slice(2);
const at = args.indexOf('--bmd');
const bmdPath = at >= 0 && args[at + 1] ? args[at + 1] : 'Data/Local/Eng/item_eng.bmd';
const dry = args.includes('--dry');

const COLUMNS = ['DW/SM', 'DK/BK', 'Elf/ME', 'MG', 'DL', 'SUM', 'RF'];
const RECORD = 84;
const CLASSES_AT = 69;
const BUX = [0xfc, 0xcf, 0xab];

const bytes = new Uint8Array(readFileSync(bmdPath));
const record = (group: number, index: number) => {
  const start = (group * 512 + index) * RECORD;
  return bytes.slice(start, start + RECORD).map((b, i) => b ^ BUX[i % 3]);
};

const field = (name: string) => new RegExp(`^(\\s*${name.includes('/') ? `'${name}'` : name}: )(\\d+),`, 'm');
let moved = 0;
for (const folder of readdirSync(ITEMS_DIR, { withFileTypes: true }).filter(d => d.isDirectory())) {
  for (const file of readdirSync(join(ITEMS_DIR, folder.name)).filter(f => f.endsWith('.ts') && !f.includes('.test.'))) {
    const path = join(ITEMS_DIR, folder.name, file);
    let text = readFileSync(path, 'utf8');
    const group = Number(text.match(/^\s*Group: (\d+),/m)?.[1]);
    const index = Number(text.match(/^\s*Index: (\d+),/m)?.[1]);
    if (Number.isNaN(group) || Number.isNaN(index) || !field('SUM').test(text)) continue;
    const row = record(group, index);
    if (!row[0]) continue;
    const want = row.subarray(CLASSES_AT, CLASSES_AT + COLUMNS.length);
    const before = text;
    COLUMNS.forEach((name, i) => (text = text.replace(field(name), `$1${want[i]},`)));
    if (text === before) continue;
    moved++;
    console.log(`${group}/${index} ${file}: ${[...want].join(',')}`);
    if (!dry) writeFileSync(path, text);
  }
}
console.log(`${moved} rows ${dry ? 'would move' : 'moved'}`);
