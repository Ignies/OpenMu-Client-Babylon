// Adds the `RF` class column to `src/common/items.json`.
//
// `Item.txt` carries six class columns - DW/SM, DK/BK, Elf/ME, MG, DL, SUM -
// and no Rage Fighter one; its header and every data row line up at 29 fields,
// so nothing was lost in conversion, the table simply predates the class.
// Without a seventh column `classOf` had no index for him and `classCanUse`
// refused him every class-gated item, orbs and scrolls included.
//
// The values come from the server this client talks to. Every item-creation
// call in OpenMU's Season 6 initializers ends with the same class block in the
// same order, one entry longer:
//
//   CreateWeapon(..., wizard, knight, elf, magicGladiator, darkLord, summoner, ragefighter)
//
// so the six we already have are the check: a row only takes the seventh value
// when the other six agree exactly. Rows that disagree (this Item.txt is an
// older Season 6 variant than OpenMU's data - mostly Summoner gear, where it
// sets DW/SM as well) and rows OpenMU has no definition for keep `RF: 0`; none
// of them carries a non-zero Rage Fighter level anyway, which the run reports.
//
// Note that `CreateGloves` has no ragefighter parameter at all on the server,
// so group 10 comes out at 0 throughout even where the rest of the same armour
// set is his. That is OpenMU's own gap, not a conversion error, and is left
// alone rather than invented here.
//
// Run after `convertItemTXTtoJson.ts`, which rewrites items.json from scratch
// and would drop the column:
//
//   bun run tools/addRageFighterColumn.ts [--openmu <path>] [--dry]

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
  'VersionSeasonSix/Items/Orbs.cs',
  'VersionSeasonSix/Items/Scrolls.cs',
];

/** Where each helper's class block starts, and how the row is addressed. */
type Spec = {
  argc: number;
  group: (a: string[]) => number;
  index: (a: string[]) => number;
  classAt: number;
  hasRf: boolean;
};

const SPECS: Record<string, Spec[]> = {
  CreateWeapon: [{ argc: 26, group: a => +a[0], index: a => +a[1], classAt: 19, hasRf: true }],
  CreateShield: [{ argc: 23, group: () => 6, index: a => +a[0], classAt: 16, hasRf: true }],
  // `slot` is the equipment slot; the item group is five higher (helm 2 -> 7).
  CreateArmor: [{ argc: 21, group: a => +a[1] + 5, index: a => +a[0], classAt: 14, hasRf: true }],
  CreateBoots: [{ argc: 19, group: () => 11, index: a => +a[0], classAt: 12, hasRf: true }],
  CreateGloves: [{ argc: 15, group: () => 10, index: a => +a[0], classAt: 9, hasRf: false }],
  CreateWing: [
    { argc: 16, group: () => 12, index: a => +a[0], classAt: 8, hasRf: true },
    { argc: 20, group: () => 12, index: a => +a[0], classAt: 8, hasRf: true },
    { argc: 21, group: () => 12, index: a => +a[0], classAt: 8, hasRf: true },
  ],
  CreateOrb: [{ argc: 18, group: () => 12, index: a => +a[0], classAt: 11, hasRf: true }],
  CreateScroll: [{ argc: 14, group: () => 15, index: a => +a[0], classAt: 7, hasRf: true }],
};

const SIX = ['DW/SM', 'DK/BK', 'Elf/ME', 'MG', 'DL', 'SUM'] as const;
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

type Call = { helper: string; args: string[] };

function callsIn(text: string): Call[] {
  const out: Call[] = [];
  const re = /this\.(Create\w+)\s*\(/g;
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
    out.push({ helper: m[1], args: splitArgs(text.slice(re.lastIndex, i - 1)) });
  }
  return out;
}

const items: Record<string, number | string>[] = await Bun.file(itemsPath).json();
const rowOf = (g: number, i: number) =>
  items.find(r => r.Group === g && r.Index === i);

const isInt = (s: string) => /^-?\d+$/.test(s);
const rf = new Map<string, number>();
let verified = 0;
const skipped: { name: string; why: string }[] = [];

for (const rel of SOURCES) {
  const file = Bun.file(`${openmuRoot}/${rel}`);
  if (!(await file.exists())) {
    console.error(`missing ${rel} - pass --openmu <path to OpenMU Initialization>`);
    process.exit(1);
  }
  for (const call of callsIn(await file.text())) {
    const spec = SPECS[call.helper]?.find(s => s.argc === call.args.length);
    if (!spec) continue;

    const name = (call.args.find(a => a.startsWith('"')) ?? '""').slice(1, -1);
    const row = rowOf(spec.group(call.args), spec.index(call.args));
    if (!row) { skipped.push({ name, why: 'no items.json row' }); continue; }

    const block = call.args.slice(spec.classAt, spec.classAt + (spec.hasRf ? 7 : 6));
    if (!block.every(isInt)) { skipped.push({ name, why: 'class block not numeric' }); continue; }

    const nums = block.map(Number);
    if (SIX.some((c, i) => (Number(row[c]) || 0) !== nums[i])) {
      skipped.push({ name, why: 'six columns disagree' });
      continue;
    }
    verified++;
    rf.set(`${row.Group}:${row.Index}`, spec.hasRf ? nums[6] : 0);
  }
}

const carriesClassBlock = (row: Record<string, unknown>) => 'SUM' in row;

// Rebuild with RF straight after SUM, keeping the file's own shape.
const eol = (await Bun.file(itemsPath).text()).includes('\r\n') ? '\r\n' : '\n';
const rendered = items.map(row => {
  const entries: [string, unknown][] = [];
  for (const [k, v] of Object.entries(row)) {
    if (k === 'RF') continue; // rerunnable
    entries.push([k, v]);
    if (k === 'SUM') entries.push(['RF', rf.get(`${row.Group}:${row.Index}`) ?? 0]);
  }
  const body = entries
    .map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    .join(`,${eol}`);
  return `  {${eol}${body}${eol}  }`;
});

const withColumn = items.filter(carriesClassBlock).length;
const nonZero = [...rf.values()].filter(v => v > 0).length;
console.log(`verified against the six existing columns: ${verified}`);
console.log(`rows carrying a class block: ${withColumn} (of ${items.length})`);
console.log(`rows with a Rage Fighter level: ${nonZero}`);
console.log(`not taken: ${skipped.length}`);
for (const s of skipped.slice(0, 5)) console.log(`  ${s.name} - ${s.why}`);
if (skipped.length > 5) console.log(`  ... and ${skipped.length - 5} more`);

if (dry) {
  console.log('--dry: items.json not written');
} else {
  await Bun.write(itemsPath, `[${eol}${rendered.join(`,${eol}`)}${eol}]${eol}`);
  console.log(`wrote ${itemsPath}`);
}
