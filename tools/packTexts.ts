/**
 * Writes the fixed-field text tables of a generated language pack:
 * `Quest_<lang>.bmd` (the old quest titles), `Dialog_<lang>.bmd` (the old
 * quest and town NPC pages), `Minimap/Minimap_World<n>_<lang>.bmd` (the
 * minimap marker names) and `MasterSkillTooltip_<lang>.bmd`.
 *
 * Each is copied from the English file and only its strings are replaced, so
 * links, answers, coordinates and skill numbers stay exactly as shipped. The
 * wording lives in `packs/packTexts.json`, keyed `<table>/<record>/<field>`
 * with one column per language, like `questWords.json`.
 *
 * Every string sits in a fixed field measured in bytes, so a translation that
 * does not fit is refused, never truncated (the rule `localPacks.ts` follows).
 *
 * ```
 * node tools/packTexts.ts             # every language
 * node tools/packTexts.ts --only pol
 * ```
 *
 * node rather than bun, for the windows-1250 encoder (see `localPacks.ts`).
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { encoderFor } from './localPacks.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(HERE, '..', 'Data', 'Local');
const ENG = resolve(DATA, 'Eng');

const BUX = [0xfc, 0xcf, 0xab];

/** Folder and code page per language, as the layers declare. */
const PACKS: Record<string, { folder: string; encoding: string }> = {
  pol: { folder: 'Pol', encoding: 'windows-1250' },
  vie: { folder: 'Vie', encoding: 'utf-8' },
};

type Field = readonly [offset: number, length: number];

/** One table: its English file name, record size and count, and where each field sits. */
type Table = {
  name: string;
  record: number;
  count: number;
  fields: (field: string) => Field | undefined;
};

const DIALOG_ANSWERS = 384;

export const TABLES: Record<string, Table> = {
  // `QuestAttributeFile` (CSQuest.cpp): the name after `WORD + BYTE + BYTE + WORD`.
  quest: { name: 'Quest', record: 744, count: 200, fields: f => (f === 'name' ? [6, 32] : undefined) },
  // `DIALOG_SCRIPT`: char[300], int count, int link[10], int action[10], char answer[10][64].
  dialog: {
    name: 'Dialog',
    record: 1024,
    count: 200,
    fields: f => {
      if (f === 'text') return [0, 300];
      const answer = /^answer(\d)$/.exec(f);
      return answer ? [DIALOG_ANSWERS + Number(answer[1]) * 64, 64] : undefined;
    },
  },
  // `_MASTER_SKILL_TOOLTIP_FILE`: seven `Info` strings after `int + WORD`.
  master: {
    name: 'MasterSkillTooltip',
    record: 616,
    count: 512,
    fields: f =>
      ([[6, 64], [70, 256], [326, 32], [358, 64], [422, 64], [486, 64], [550, 64]] as const)[Number(f)],
  },
  // `MINI_MAP_FILE`: kind, x, y, rotation, then char[100].
  minimap: { name: 'Minimap', record: 116, count: 100, fields: () => [16, 100] },
};

/** Replaces strings inside a copy of one English file. */
export function patchTable(
  english: Uint8Array,
  table: Table,
  texts: Record<string, Record<string, string>>,
  encode: (text: string) => Uint8Array,
  where: string,
  problems: string[]
): Uint8Array {
  const out = Uint8Array.from(english);

  for (const [key, text] of Object.entries(texts)) {
    for (const [field, value] of Object.entries(text)) {
      const at = Number(key);
      const place = table.fields(field);
      if (!Number.isInteger(at) || at < 0 || at >= table.count || (at + 1) * table.record > out.length || !place) {
        problems.push(`${where}: no field ${key}/${field}`);
        continue;
      }

      const [offset, length] = place;
      let bytes: Uint8Array;
      try {
        bytes = encode(value.normalize('NFC'));
      } catch (err) {
        problems.push(`${where} ${key}/${field}: ${(err as Error).message}`);
        continue;
      }
      if (bytes.length > length) {
        problems.push(`${where} ${key}/${field}: "${value}" is ${bytes.length} bytes, ${length} allowed`);
        continue;
      }

      const record = out.subarray(at * table.record, (at + 1) * table.record);
      for (let i = 0; i < record.length; i++) record[i] ^= BUX[i % 3];
      record.fill(0, offset, offset + length);
      record.set(bytes, offset);
      for (let i = 0; i < record.length; i++) record[i] ^= BUX[i % 3];
    }
  }

  return out;
}

/** `packTexts.json` rows for one language, grouped by table, file and record. */
function collect(rows: Record<string, Record<string, string>>, lang: string) {
  const files = new Map<string, Record<string, Record<string, string>>>();

  for (const [key, row] of Object.entries(rows)) {
    if (key === '_' || !row[lang]) continue;
    const parts = key.split('/');
    // minimap/<world>/<record>; every other table is <table>/<record>/<field>.
    const [table, file, record, field] =
      parts[0] === 'minimap' ? [parts[0], parts[1], parts[2], 'name'] : [parts[0], '', parts[1], parts[2]];
    const id = `${table}/${file}`;
    const texts = files.get(id) ?? {};
    (texts[record] ??= {})[field] = row[lang];
    files.set(id, texts);
  }

  return files;
}

export function buildAll(only: string | null): void {
  const rows = JSON.parse(readFileSync(resolve(HERE, 'packs', 'packTexts.json'), 'utf8')) as Record<
    string,
    Record<string, string>
  >;
  const langs = Object.keys(PACKS).filter(l => !only || l === only);
  if (only && !langs.length) throw new Error(`No pack for '${only}'`);

  const worlds = readdirSync(resolve(ENG, 'Minimap'))
    .map(f => /^Minimap_World(\d+)_eng\.bmd$/.exec(f)?.[1])
    .filter((w): w is string => !!w);

  for (const lang of langs) {
    const { folder, encoding } = PACKS[lang];
    const encode = encoderFor(encoding);
    const texts = collect(rows, lang);
    const problems: string[] = [];
    const written: [string, Uint8Array][] = [];

    for (const [id, table] of Object.entries(TABLES)) {
      const sources =
        id === 'minimap'
          ? worlds.map(w => [w, `Minimap/Minimap_World${w}_eng.bmd`, `Minimap/Minimap_World${w}_${lang}.bmd`])
          : [['', `${table.name}_eng.bmd`, `${table.name}_${lang}.bmd`]];

      for (const [file, from, to] of sources) {
        const english = new Uint8Array(readFileSync(resolve(ENG, from)));
        const own = texts.get(`${id}/${file}`) ?? {};
        written.push([to, patchTable(english, table, own, encode, `${folder} ${to}`, problems)]);
      }
    }

    if (problems.length) throw new Error(`${folder}:\n  ${problems.join('\n  ')}`);

    for (const [to, bytes] of written) {
      const path = resolve(DATA, folder, to);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, bytes);
    }
    console.log(`${folder}  ${written.length} files -> Quest, Dialog, MasterSkillTooltip, Minimap`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const at = process.argv.indexOf('--only');
  buildAll(at > 0 ? process.argv[at + 1] : null);
}
