/**
 * Builds `src/common/monsterHealth.json` - the maximum health of every
 * monster type the client can meet, keyed by the type number the server puts
 * in `AddNpcsToScope`.
 *
 * The server is the only place that knows a monster's health: it is never on
 * the wire before the first hit lands, and the S6 protocol the client speaks
 * carries no health reading at all (only `ObjectHitExtended`, which the
 * open-source client line uses, does). So the table is read straight out of
 * OpenMU's own monster definitions, the server this client is built against,
 * and falls back to the original client's `monsters.json` for the handful of
 * monsters OpenMU does not define (the invasion bosses, the castle-siege
 * objects, the Death King line).
 *
 * OpenMU layers its data: `Version075` holds the classic monsters,
 * `Version095d` adds to it and `VersionSeasonSix` inherits both and overrides
 * what Season 6 rebalanced - so the layers are read in that order and a later
 * one wins.
 *
 *     bun run tools/buildMonsterHealth.ts [path to OpenMU's Initialization folder]
 *
 * Default path: `../OpenMU/OpenMU-master/src/Persistence/Initialization`,
 * beside the client checkout.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import monsters from '../src/common/monsters.json';

const LAYERS = ['Version075', 'Version095d', 'VersionSeasonSix'];

const ROOT = resolve(import.meta.dir, '..');
const SRC = resolve(
  ROOT,
  process.argv[2] ?? '../OpenMU/OpenMU-master/src/Persistence/Initialization'
);
const OUT = resolve(ROOT, 'src/common/monsterHealth.json');

/** `monster.Number = 350;` - the type number the whole block below belongs to. */
const NUMBER = /^\s*\w+\.Number\s*=\s*(?:\(short\))?\s*(\d+)\s*;/;
/** `{ Stats.MaximumHealth, 38500 },` inside that block's attribute table. */
const HEALTH = /\{\s*Stats\.MaximumHealth,\s*([0-9_]+)/;
/** `monster.Designation = "Witch Queen";` - only for the report. */
const DESIGNATION = /^\s*\w+\.Designation\s*=\s*"([^"]*)"/;

type Row = { health: number; name: string; from: string };

function csFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) csFiles(path, out);
    else if (entry.endsWith('.cs')) out.push(path);
  }
  return out;
}

function readLayer(dir: string): Map<number, Row> {
  const rows = new Map<number, Row>();

  for (const file of csFiles(dir)) {
    let current: number | null = null;
    let name = '';

    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const number = NUMBER.exec(line);
      if (number) {
        current = Number(number[1]);
        name = '';
        continue;
      }
      if (current === null) continue;

      const designation = DESIGNATION.exec(line);
      if (designation) {
        name = designation[1];
        continue;
      }

      const health = HEALTH.exec(line);
      if (!health) continue;

      const value = Number(health[1].replace(/_/g, ''));
      const seen = rows.get(current);
      if (seen && seen.health !== value) {
        console.warn(
          `  type ${current} (${seen.name || name}): ${seen.health} in ${seen.from}, ${value} in ${file} - keeping the first`
        );
      }
      if (!seen) rows.set(current, { health: value, name, from: file });
      current = null;
    }
  }

  return rows;
}

const table = new Map<number, Row>();

for (const layer of LAYERS) {
  const dir = join(SRC, layer);
  const rows = readLayer(dir);
  console.log(`${layer}: ${rows.size} monsters with health`);
  for (const [type, row] of rows) table.set(type, row);
}

let borrowed = 0;
for (const monster of monsters) {
  if (!(monster.HP > 0) || table.has(monster.Numb)) continue;
  table.set(monster.Numb, {
    health: monster.HP,
    name: monster.Name,
    from: 'monsters.json',
  });
  borrowed++;
}

const sorted = [...table.entries()].sort((a, b) => a[0] - b[0]);
const json = `{\n${sorted
  .map(([type, row]) => `  "${type}": ${row.health}`)
  .join(',\n')}\n}\n`;

writeFileSync(OUT, json);

console.log(
  `${sorted.length} monsters written to ${OUT} (${borrowed} taken from monsters.json)`
);
