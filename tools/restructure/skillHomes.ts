// Where each skill id lives: versions/shared/skills/<class>/<folder>/<file>.
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

const VARIANTS: [RegExp, string][] = [
  [/ (Str|Strengthener)$/, 'strengthener'],
  [/ Mastery$/, 'mastery'],
  [/ \(Start\)$/, 'start'],
];

const defs = new Map<number, { name: string; classes: string }>(SKILL_DEFINITIONS.map(d => [d.num, d]));
for (const [id, d] of Object.entries(EXTRA)) defs.set(Number(id), d);

export const snake = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

function classOf(classes: string): string {
  const first = classes.split('|')[0].trim();
  return CLASSES.find(([re]) => re.test(first))?.[1] ?? 'common';
}

/** The lowest id that carries `name`, so variants and duplicates share one folder. */
function firstWithName(name: string, cls?: string): number | undefined {
  let best: number | undefined;
  for (const [id, d] of defs) if (d.name === name && (!cls || classOf(d.classes) === cls) && (best === undefined || id < best)) best = id;
  return best ?? (cls ? firstWithName(name) : undefined);
}

export function skillHome(id: number): Home {
  const d = defs.get(id);
  if (!d) throw new Error(`no name for skill ${id}`);
  for (const [re, file] of VARIANTS) {
    if (!re.test(d.name)) continue;
    const baseName = d.name.replace(re, '');
    const base = firstWithName(baseName, classOf(d.classes));
    const cls = classOf((base !== undefined ? defs.get(base)! : d).classes);
    const folder = snake(baseName);
    return { cls, folder, file: `${ROOT}/${cls}/${folder}/${file}.ts`, id, name: d.name };
  }
  const cls = classOf(d.classes);
  const first = firstWithName(d.name, cls)!;
  const folder = snake(d.name.replace(/ \(Monster\)$/, ''));
  const file = first === id ? 'index' : `${folder}_${id}`;
  return { cls, folder, file: `${ROOT}/${cls}/${folder}/${file}.ts`, id, name: d.name };
}
