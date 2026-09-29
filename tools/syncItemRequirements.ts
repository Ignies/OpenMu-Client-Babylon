// Brings the requirement columns of `src/common/items.json` in line with the
// server this client talks to.
//
// The tooltip works an item's requirements out of this table, and OpenMU
// decides whether the item goes on out of its own Season 6 definitions. Where
// the two disagree the player is told one thing and the server does another:
// the Horn of Unicorn has no level column in this Item.txt while OpenMU asks
// level 25 of every pet, the third wings read level 220 here and 400 there,
// and the level-380 flag sits on a different set of third-class gear on each
// side.
//
// So, for every weapon, shield, armour piece, wing and pet OpenMU defines, this
// writes the server's numbers over ours: the drop level (the requirement
// formula scales from it) and the level, strength, agility, energy, vitality
// and command requirements. A requirement the server's helper does not take
// is one it never checks, so it counts as 0 - no command on a scepter, no
// energy on gloves, nothing but a level on a pet. An existing column is
// overwritten; a missing one is added only when the server asks for
// something. A row is taken only when its footprint matches the server's
// where the helper states one, so a group and index that mean different
// items on the two sides are left alone and reported. A definition the
// server has commented out is read like any other: the client keeps the row
// ready for when the server turns it on (Mace of The king).
//
// Run after `convertItemTXTtoJson.ts`, which rewrites items.json from scratch,
// and `addRageFighterColumn.ts`:
//
//   bun run tools/syncItemRequirements.ts [--openmu <path>] [--dry]

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const dry = args.includes('--dry');
const openmuRoot = flag(
  '--openmu',
  '../OpenMU/OpenMU-master/src/Persistence/Initialization'
);
const itemsPath = 'src/common/items.json';

const SOURCES = [
  'VersionSeasonSix/Items/Weapons.cs',
  'VersionSeasonSix/Items/Armors.cs',
  'VersionSeasonSix/Items/Wings.cs',
  'VersionSeasonSix/Items/Pets.cs',
];

type Field = 'drop' | 'lvl' | 'str' | 'agi' | 'ene' | 'vit' | 'cmd';

/**
 * Where each helper keeps what we read, by argument position. `size` is the
 * footprint, where the helper takes one. `minArgc` covers the helpers whose
 * tail varies (the wing options, the pet power-ups).
 */
type Spec = {
  argc?: number;
  minArgc?: number;
  group: (a: string[]) => number;
  index: number;
  size?: [width: number, height: number];
  fields: Partial<Record<Field, number>>;
};

const SPECS: Record<string, Spec> = {
  CreateWeapon: {
    argc: 26,
    group: a => +a[0],
    index: 1,
    size: [4, 5],
    fields: { drop: 8, lvl: 14, str: 15, agi: 16, ene: 17, vit: 18 },
  },
  CreateShield: {
    argc: 23,
    group: () => 6,
    index: 0,
    size: [3, 4],
    fields: { drop: 6, lvl: 10, str: 11, agi: 12, ene: 13, vit: 14, cmd: 15 },
  },
  // `slot` is the equipment slot; the item group is five higher (helm 2 -> 7).
  CreateArmor: {
    argc: 21,
    group: a => +a[1] + 5,
    index: 0,
    size: [2, 3],
    fields: { drop: 5, lvl: 8, str: 9, agi: 10, ene: 11, vit: 12, cmd: 13 },
  },
  CreateGloves: {
    argc: 15,
    group: () => 10,
    index: 0,
    fields: { drop: 2, lvl: 6, str: 7, agi: 8 },
  },
  CreateBoots: {
    argc: 19,
    group: () => 11,
    index: 0,
    fields: { drop: 2, lvl: 6, str: 7, agi: 8, ene: 9, vit: 10, cmd: 11 },
  },
  CreateWing: {
    minArgc: 16,
    group: () => 12,
    index: 0,
    size: [1, 2],
    fields: { drop: 4, lvl: 7 },
  },
  // One number is both: `CreatePet(..., dropLevelAndLevelRequirement, ...)`.
  CreatePet: {
    minArgc: 8,
    group: () => 13,
    index: 0,
    size: [2, 3],
    fields: { drop: 5, lvl: 5 },
  },
};

/** The column names this table uses for each field, the first one preferred. */
const COLUMNS: Record<Field, string[]> = {
  drop: ['ItemLvl', 'Lvl'],
  lvl: ['RequiredLvl', 'ReqLvl'],
  str: ['Strength', 'Str'],
  agi: ['Agi'],
  ene: ['Ene', 'Energy'],
  vit: ['Vit'],
  cmd: ['Command', 'Comm'],
};

const BACKSLASH = String.fromCharCode(92);

function splitArgs(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      cur += c;
      if (c === '"' && s[i - 1] !== BACKSLASH) inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; cur += c; continue; }
    if (c === '(' || c === '[') depth++;
    if (c === ')' || c === ']') depth--;
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

type Call = { helper: string; args: string[]; variable?: string };

function callsIn(text: string): Call[] {
  const out: Call[] = [];
  const re = /(?:var\s+(\w+)\s*=\s*)?this\.(Create\w+)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    // Skip the "Replace by:" regex templates in the doc comments.
    const lineStart = text.lastIndexOf('\n', m.index) + 1;
    if (text.slice(lineStart, m.index).includes('///')) continue;

    let i = re.lastIndex;
    let depth = 1;
    let inStr = false;
    while (i < text.length && depth > 0) {
      const c = text[i];
      if (inStr) { if (c === '"' && text[i - 1] !== BACKSLASH) inStr = false; }
      else if (c === '"') inStr = true;
      else if (c === '(') depth++;
      else if (c === ')') depth--;
      i++;
    }
    out.push({
      helper: m[2],
      args: splitArgs(text.slice(re.lastIndex, i - 1)),
      variable: m[1],
    });
  }
  return out;
}

/** `capeOfLord.Group = 13;` - a definition moved to another group after it was made. */
function regroupsIn(text: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of text.matchAll(/(\w+)\.Group\s*=\s*(\d+)\s*;/g)) {
    out.set(m[1], +m[2]);
  }
  return out;
}

const items: Record<string, number | string>[] = await Bun.file(itemsPath).json();
const rowOf = (g: number, i: number) =>
  items.find(r => r.Group === g && r.Index === i);

const isInt = (s: string) => /^-?\d+$/.test(s);
const changes: string[] = [];
const skipped: { name: string; why: string }[] = [];
let checked = 0;

for (const rel of SOURCES) {
  const file = Bun.file(`${openmuRoot}/${rel}`);
  if (!(await file.exists())) {
    console.error(`missing ${rel} - pass --openmu <path to OpenMU Initialization>`);
    process.exit(1);
  }
  const text = await file.text();
  const regroups = regroupsIn(text);

  for (const call of callsIn(text)) {
    const spec = SPECS[call.helper];
    if (!spec) continue;
    if (spec.argc !== undefined && call.args.length !== spec.argc) continue;
    if (spec.minArgc !== undefined && call.args.length < spec.minArgc) continue;

    // The helpers' own delegating calls pass their parameters through.
    if (!isInt(call.args[spec.index])) continue;

    const name = (call.args.find(a => a.startsWith('"')) ?? '""').slice(1, -1);
    const regrouped = call.variable ? regroups.get(call.variable) : undefined;
    const group = regrouped ?? spec.group(call.args);
    const row = rowOf(group, +call.args[spec.index]);
    if (!row) { skipped.push({ name, why: 'no items.json row' }); continue; }

    if (spec.size) {
      const [w, h] = spec.size.map(i => +call.args[i]);
      if ((Number(row.X) || 1) !== w || (Number(row.Y) || 1) !== h) {
        skipped.push({ name, why: `footprint ${row.X}x${row.Y} here, ${w}x${h} there` });
        continue;
      }
    }

    checked++;
    for (const field of Object.keys(COLUMNS) as Field[]) {
      const at = spec.fields[field];
      const raw = at === undefined ? '0' : call.args[at];
      if (!isInt(raw)) { skipped.push({ name, why: `${field} not numeric` }); continue; }
      const value = +raw;
      const key: string | undefined = COLUMNS[field].find(k => k in row);
      if (key === undefined && value === 0) continue;
      const column = key ?? COLUMNS[field][0];
      if (row[column] === value) continue;
      changes.push(`${row.Group}/${row.Index} ${row.ItemName}: ${column} ${row[column] ?? '-'} -> ${value}`);
      row[column] = value;
    }
  }
}

console.log(`rows checked against the server: ${checked}`);
console.log(`values changed: ${changes.length}`);
for (const c of changes) console.log(`  ${c}`);
console.log(`not taken: ${skipped.length}`);
for (const s of skipped) console.log(`  ${s.name} - ${s.why}`);

// Keep the file's own shape (the same renderer as addRageFighterColumn.ts).
const eol = (await Bun.file(itemsPath).text()).includes('\r\n') ? '\r\n' : '\n';
const rendered = items.map(row => {
  const body = Object.entries(row)
    .map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    .join(`,${eol}`);
  return `  {${eol}${body}${eol}  }`;
});

if (dry) {
  console.log('--dry: items.json not written');
} else {
  await Bun.write(itemsPath, `[${eol}${rendered.join(`,${eol}`)}${eol}]${eol}`);
  console.log(`wrote ${itemsPath}`);
}
