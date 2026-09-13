/**
 * Writes `Data/Local/<pack>/QuestWords_<lang>.bmd` for the generated language
 * packs: the lines every NPC speaks and every answer the player picks.
 *
 * `QuestWords` is one flat table of 2288 numbered strings. The Season 6 NPC
 * talk window (`CNewUINPCDialogue`) does not use all of them - it shows the
 * ones `NPCDialogue.bmd` points at, the NPC's line on each page and its
 * answers, which is 58 entries. Those are translated, in
 * `packs/questWords.json`. The remaining 2230 are quest-log prose (a quarter of
 * a million characters of it) and are written out in English.
 *
 * **The whole table is written even so**, because `localDataCandidates` falls
 * back *per file*: a pack that ships no `QuestWords_<lang>.bmd` reads the
 * English one entire, so there is no way to translate part of it except to
 * emit the file with English in the untranslated rows. Adding a translation
 * later means adding it to the JSON and running this again.
 *
 * ## Running it
 *
 * ```
 * node tools/questWords.ts             # every language
 * node tools/questWords.ts --only rus
 * ```
 *
 * node rather than bun, for the same reason `localPacks.ts` says: bun's
 * `TextDecoder` has no windows-1250 or windows-1251.
 *
 * Record layout, matching `readQuestWords` in `libs/mu/questFiles.ts`:
 * `{int32 index; int16 length}` then `length` bytes of text, each part
 * XOR-ed with the 3-byte Bux key **restarting at each part** - the header and
 * the body are two separate `BuxConvert` calls, not one across both.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { encoderFor } from './localPacks.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(HERE, '..', 'Data', 'Local');

const BUX_KEY = [0xfc, 0xcf, 0xab];
const HEADER_SIZE = 6;

/** Folder, file suffix and code page per language, as the layers declare. */
const PACKS: Record<string, { folder: string; encoding: string }> = {
  ger: { folder: 'Ger', encoding: 'windows-1252' },
  fre: { folder: 'Fre', encoding: 'windows-1252' },
  ita: { folder: 'Ita', encoding: 'windows-1252' },
  rom: { folder: 'Rom', encoding: 'windows-1250' },
  rus: { folder: 'Rus', encoding: 'windows-1251' },
  bul: { folder: 'Bul', encoding: 'windows-1251' },
  chi: { folder: 'Chi', encoding: 'utf-8' },
  jpn: { folder: 'Jpn', encoding: 'utf-8' },
  kor: { folder: 'Kor', encoding: 'utf-8' },
  tha: { folder: 'Tha', encoding: 'windows-874' },
};

function bux(buffer: Uint8Array): void {
  for (let i = 0; i < buffer.length; i++) buffer[i] ^= BUX_KEY[i % 3];
}

/** One row of the shipped English table: its number and its decrypted bytes. */
export type WordRow = { index: number; body: Uint8Array };

/**
 * The English table in file order, each row's body kept as **bytes** rather
 * than as a string.
 *
 * 78 of the 2288 rows carry CP949 double-byte text that was read as
 * windows-1252 somewhere before this tree got it, so they are already mojibake
 * in the English client ("Gens dispute¡¦?"). Decoding and re-encoding those
 * into windows-1250 or windows-1251 fails outright - `¢` has no place in
 * either. Carrying the bytes through means an untranslated row is byte for
 * byte the row the English file holds, which renders exactly as the English
 * client renders it and invents no new damage.
 */
export function readEnglishWords(): WordRow[] {
  const buffer = new Uint8Array(
    readFileSync(resolve(DATA, 'Eng', 'QuestWords_eng.bmd'))
  );
  const rows: WordRow[] = [];
  let offset = 0;

  while (offset + HEADER_SIZE <= buffer.length) {
    const header = buffer.slice(offset, offset + HEADER_SIZE);
    bux(header);
    const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
    const index = view.getInt32(0, true);
    const length = view.getInt16(4, true);
    offset += HEADER_SIZE;

    if (length < 0 || offset + length > buffer.length) break;

    const body = buffer.slice(offset, offset + length);
    bux(body);
    rows.push({ index, body });
    offset += length;
  }

  return rows;
}

const LATIN1 = new TextDecoder('windows-1252');

/**
 * One untranslated row's windows-1252 bytes, re-encoded for this pack.
 *
 * These 78 rows are CP949 read as windows-1252 before the tree got them, so
 * they are mojibake in English too ("Movement in the ¢Ø or ¢Ù direction").
 * Nothing here can recover the arrows they were; the goal is only that they
 * read no *worse* than in English. A character the pack's code page has no
 * room for becomes a question mark, which beats dropping the row or throwing
 * over text that was already damaged upstream.
 */
function transcode(bytes: Uint8Array, encode: (text: string) => Uint8Array): Uint8Array {
  let end = bytes.indexOf(0);
  if (end < 0) end = bytes.length;

  const out: number[] = [];
  for (const char of LATIN1.decode(bytes.subarray(0, end))) {
    try {
      out.push(...encode(char));
    } catch {
      out.push(0x3f);                    // '?'
    }
  }

  return new Uint8Array(out);
}

export function buildWordsPack(
  rows: WordRow[],
  translations: Record<string, string>,
  encoding: string,
  problems: string[]
): Uint8Array {
  const encode = encoderFor(encoding);
  const parts: Uint8Array[] = [];

  for (const row of rows) {
    const text = translations[String(row.index)];

    // No translation: the English bytes ride through untouched, terminator
    // and all, so the row is identical to the one the English file holds.
    let body = row.body;
    let length = row.body.length;

    if (text !== undefined) {
      try {
        body = encode(text);
        // The reader takes `length` as the field width and stops at a NUL
        // inside it, so the terminator has to be counted in.
        length = body.length + 1;
      } catch (err) {
        problems.push(`${row.index}: ${(err as Error).message}`);
      }
    } else if (row.body.some(b => b > 0x7f)) {
      // An untranslated row with high bytes cannot ride through: those bytes
      // are windows-1252, and a pack read as UTF-8 turns every one of them
      // into a replacement character. Carry the characters instead of the
      // bytes, so the row reads the way the English client reads it.
      body = transcode(row.body, encode);
      length = body.length + 1;
    }

    const record = new Uint8Array(HEADER_SIZE + length);
    const header = record.subarray(0, HEADER_SIZE);
    const view = new DataView(header.buffer, header.byteOffset, HEADER_SIZE);

    view.setInt32(0, row.index, true);
    view.setInt16(4, length, true);
    bux(header);

    const payload = record.subarray(HEADER_SIZE);
    payload.set(body);
    bux(payload);                        // the body is its own Bux run

    parts.push(record);
  }

  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }

  return out;
}

export function buildAll(only: string | null): void {
  const table = JSON.parse(
    readFileSync(resolve(HERE, 'packs', 'questWords.json'), 'utf8')
  ) as Record<string, Record<string, string>>;

  const rows = readEnglishWords();
  const langs = Object.keys(PACKS).filter(l => !only || l === only);
  if (only && !langs.length) throw new Error(`No pack for '${only}'`);

  for (const lang of langs) {
    const { folder, encoding } = PACKS[lang];
    const translations: Record<string, string> = {};

    for (const [index, row] of Object.entries(table)) {
      if (index === '_') continue;
      if (row[lang]) translations[index] = row[lang];
    }

    const problems: string[] = [];
    const bytes = buildWordsPack(rows, translations, encoding, problems);

    if (problems.length) {
      throw new Error(`${folder}:\n  ${problems.join('\n  ')}`);
    }

    const dir = resolve(DATA, folder);
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, `QuestWords_${lang}.bmd`), bytes);

    console.log(
      `${folder}  ${rows.length} entries, ${Object.keys(translations).length} translated ` +
        `-> QuestWords_${lang}.bmd`
    );
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const at = process.argv.indexOf('--only');
  buildAll(at > 0 ? process.argv[at + 1] : null);
}
