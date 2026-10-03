// Where each skill id lives: versions/shared/skills/<class>/<folder>/<file>.ts.
// A base skill is <folder>/index.ts; its master variants sit beside it
// (strengthener.ts, mastery.ts, ...), suffixed by class when another class owns them.
import { readFileSync } from 'fs';
import { SKILL_DEFINITIONS } from '../../versions/shared/skills/skillsDatabase';

export type Home = { cls: string; folder: string; file: string; id?: number; name?: string };

const ROOT = 'versions/shared/skills';

/** Skills the server list does not define, placed by hand. */
const EXTRA: Record<number, { name: string; classes: string }> = {
  53: { name: 'Improve AG', classes: 'All' },
  59: { name: 'Combo', classes: 'AllKnights' },
  75: { name: 'Brand of Skill', classes: 'AllLords' },
  216: { name: 'Lightning Orb', classes: 'AllSummoners' },
  220: { name: 'Blind', classes: 'AllSummoners' },
};

/** Buff effect id -> the skill whose folder holds its look. Unlisted ids go to common/buff_looks.ts. */
export const BUFF_OWNERS: Record<number, number> = {
  1: 28, 3: 28, 4: 16, 5: 64, 148: 64, 7: 53, 8: 48, 135: 48, 58: 55, 61: 67, 71: 217, 72: 219, 73: 220,
  74: 224, 75: 223, 76: 221, 77: 222, 81: 218, 82: 233, 138: 233, 139: 233, 86: 232,
  129: 266, 130: 267, 131: 268, 153: 266, 154: 267, 155: 268,
};

const CLASSES: [RegExp, string][] = [
  [/Magician|SoulMaster|GrandMaster/, 'dark_wizard'],
  [/Knight|BladeMaster/, 'dark_knight'],
  [/Elf/, 'fairy_elf'],
  [/MG|DuelMaster/, 'magic_gladiator'],
  [/Lord/, 'dark_lord'],
  [/Summoner|DimensionMaster/, 'summoner'],
  [/Fighter|FistMaster/, 'rage_fighter'],
  [/^None$/, 'monsters'],
];

/** Name suffix -> variant file. The server list abbreviates them (Streng, Mast, Proficie...). */
const VARIANTS: [RegExp, string][] = [
  [/ (Str|Stren|Streng|Strengt|Strength|Strengthen|Strengthener)$/, 'strengthener'],
  [/( (M|Mas|Mast|Mastery)| ?IncMastery)$/, 'mastery'],
  [/ (Prof|Profic|Proficie|Proficiency)$/, 'proficiency'],
  [/ ?(Inc)?PowUp( \(?\d\)?)?$/, 'power_up'],
  [/ \(Start\)$/, 'start'],
];

const defs = new Map<number, { name: string; classes: string }>(SKILL_DEFINITIONS.map(d => [d.num, d]));
for (const [id, d] of Object.entries(EXTRA)) defs.set(Number(id), d);

/** Master id -> base skill, from the game's own alias tables. */
const ALIASES = new Map<number, number>();
for (const file of ['src/controllers/skills/visuals.ts', 'src/modules/skills/skillAliases.ts']) {
  const text = readFileSync(file, 'utf8');
  for (const block of text.matchAll(/(?:MASTER_ALIASES)[^=]*=\s*\{([\s\S]*?)\n\};/g))
    for (const [, from, to] of block[1].matchAll(/(\d+):\s*(\d+)/g)) if (Number(from) >= 300) ALIASES.set(Number(from), Number(to));
}

export const snake = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

function classOf(classes: string): string {
  const first = classes.split('|')[0].trim();
  return CLASSES.find(([re]) => re.test(first))?.[1] ?? 'common';
}

/** The base a variant name points at: exact name, else a base whose name the abbreviation starts. */
function baseByName(stripped: string, cls: string): number | undefined {
  let best: number | undefined;
  for (const [id, d] of defs) {
    if (ALIASES.has(id) || VARIANTS.some(([re]) => re.test(d.name)) || /\b(Str|Streng\w*|Mast\w*|Prof\w*|PowUp)\b/.test(d.name)) continue;
    const hit = d.name === stripped || (stripped.includes(' ') && d.name.startsWith(stripped));
    if (!hit) continue;
    const better = best === undefined || (classOf(d.classes) === cls && classOf(defs.get(best)!.classes) !== cls) || (d.name === stripped && defs.get(best)!.name !== stripped) || id < best;
    if (better) best = id;
  }
  return best;
}

function baseHome(id: number): Home {
  const d = defs.get(id)!;
  const cls = classOf(d.classes);
  return { cls, folder: snake(d.name.replace(/ \(Monster\)$/, '')), file: '', id, name: d.name };
}

function computeHome(id: number, d: { name: string; classes: string }): Home {
  const own = classOf(d.classes);
  const variant = VARIANTS.find(([re]) => re.test(d.name));
  const base = ALIASES.get(id) ?? (variant ? baseByName(d.name.replace(variant[0], ''), own) : undefined);
  if (base !== undefined && defs.has(base) && base !== id) {
    const b = baseHome(base);
    const step = d.name.match(/PowUp \(?(\d)\)?$/)?.[1];
    const kind = variant ? (step ? `${variant[1]}_${step}` : variant[1]) : snake(d.name);
    const file = b.cls === own ? kind : `${kind}_${own}`;
    return { cls: b.cls, folder: b.folder, file: `${ROOT}/${b.cls}/${b.folder}/${file}.ts`, id, name: d.name };
  }
  const h = baseHome(id);
  return { ...h, file: `${ROOT}/${h.cls}/${h.folder}/index.ts` };
}

/** Every home, assigned once in id order; a second claim on a file gets the id appended. */
const HOMES = new Map<number, Home>();
{
  const taken = new Set<string>();
  for (const id of [...defs.keys()].sort((a, b) => a - b)) {
    let h = computeHome(id, defs.get(id)!);
    // A second claim: name the file after the skill itself, then by id if that is taken too.
    if (taken.has(h.file)) h = { ...h, file: h.file.replace(/[^/]+\.ts$/, `${snake(h.name!)}.ts`) };
    if (taken.has(h.file)) h = { ...h, file: h.file.replace(/\.ts$/, `_${id}.ts`) };
    taken.add(h.file);
    HOMES.set(id, h);
  }
}

export function hasHome(id: number): boolean {
  return HOMES.has(id);
}

export function skillHome(id: number): Home {
  const h = HOMES.get(id);
  if (!h) throw new Error(`no name for skill ${id}`);
  return h;
}
