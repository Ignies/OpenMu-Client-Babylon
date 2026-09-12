// Builds `Data/Local/<Folder>/` language packs from the name tables in
// `tools/packs/<code>.json`.
//
// Webzen shipped one pack per language and this tree only has `Eng`, `Spn` and
// `Por`. The other ten languages the client offers have no pack, so their item
// and monster names fall back to English. This writes packs for them in the
// original's own format, which means two things: the readers
// (`src/libs/mu/itemNameFile.ts`, `npcNameFile.ts`, `moveReqFile.ts`) need no
// special case, and a real Webzen pack can be dropped in later to replace ours
// byte for byte with no code change.
//
// Only the names are written. Every other field is copied from the English
// file, so an item keeps its slot, its stats and its requirements exactly.
//
// Run it with **node**, not bun: the single-byte code pages the Latin,
// Cyrillic and Thai packs are written in (windows-1250 / 1251 / 874) need a
// full-ICU `TextDecoder`, which node has and bun does not. Browsers have them
// all, so only this build step is affected.
//
// Usage:
//   node tools/localPacks.ts            build every pack in tools/packs/
//   node tools/localPacks.ts --check    build in memory and report only
//   node tools/localPacks.ts --only ger

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
export const PACKS_DIR = join(HERE, 'packs');
const LOCAL = join(ROOT, 'Data', 'Local');
const ENG = join(LOCAL, 'Eng');

// ---- the original's two primitives -----------------------------------------

const BUX = [0xfc, 0xcf, 0xab];

/** `BuxConvert` - the 3-byte XOR, applied to one record at a time. */
function bux(buffer: Uint8Array): void {
  for (let i = 0; i < buffer.length; i++) buffer[i] ^= BUX[i % 3];
}

/**
 * `GenerateCheckSum2` (ZzzInfomation.h:102), over the *encrypted* body, which
 * is the order the original reads a file in. Our readers do not verify it; it
 * is written so the file is a drop-in for the original client too.
 */
export function checksum2(buffer: Uint8Array, key: number): number {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let result = (key << 9) >>> 0;

  for (let at = 0; at + 4 <= buffer.length; at += 4) {
    const word = view.getUint32(at, true);
    if ((at / 4 + key) % 2 === 0) result = (result ^ word) >>> 0;
    else result = (result + word) >>> 0;
    if (at % 16 === 0) result = (result ^ (((key + result) >>> 0) >>> ((at / 4) % 8 + 1))) >>> 0;
  }

  return result >>> 0;
}

// ---- code pages ------------------------------------------------------------

/**
 * An encoder for one of the single-byte pages the packs are authored in.
 * Node ships decoders only, so the table is built by decoding every byte once
 * and inverting it - exact by construction, and the same mapping
 * `decodeLocalText` reads the file back with.
 *
 * CJK packs are written UTF-8 instead (their layer declares no `encoding`):
 * the multi-byte legacy pages have no encoder here, and a 30-byte name field
 * holds ten CJK characters, which every name in those packs fits inside.
 */
export function encoderFor(label: string): (text: string) => Uint8Array {
  if (/^utf-?8$/i.test(label)) {
    const utf8 = new TextEncoder();
    return text => utf8.encode(text);
  }

  const decoder = new TextDecoder(label);
  const toByte = new Map<string, number>();
  const one = new Uint8Array(1);

  for (let byte = 0; byte < 256; byte++) {
    one[0] = byte;
    const char = decoder.decode(one);
    if (char.length === 1 && !toByte.has(char)) toByte.set(char, byte);
  }

  return text => {
    const out = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      const byte = toByte.get(text[i]);
      if (byte === undefined) {
        throw new Error(`"${text}" has ${JSON.stringify(text[i])}, which ${label} cannot hold`);
      }
      out[i] = byte;
    }
    return out;
  };
}

// ---- the source tables -----------------------------------------------------

export type PackSource = {
  /** Folder under `Data/Local/`, as the layer spells it (`Ger`). */
  folder: string;
  /** The tag in the file names, lower case (`ger`). */
  suffix: string;
  /** WHATWG label the names are written in; the layer must declare the same. */
  encoding: string;
  /** `"<group>/<index>"` -> item name. Missing entries keep the English one. */
  items: Record<string, string>;
  /** Monster / NPC type number -> name. */
  npcs: Record<string, string>;
  /** `MoveReq` row index -> the name shown in the warp window. */
  maps?: Record<string, string>;
};

const ITEM_RECORD = 84;
const ITEM_NAME = 30;
const ITEM_COUNT = 8192;
const ITEM_KEY = 0xe2f1;
const GROUP_STRIDE = 512;

const MOVE_RECORD = 84;
const MOVE_NAME = 32;
const MOVE_HEADER = 4;

/**
 * The name, NUL-padded inside its field. The whole field may be used with no
 * terminator - three of the English item names do exactly that - because the
 * readers stop at a NUL *or* at the end of the field (`decodeLocalText`), as
 * the original does.
 */
function putName(
  record: Uint8Array,
  offset: number,
  length: number,
  text: string,
  encode: (t: string) => Uint8Array,
  where: string,
  problems: string[]
): void {
  const bytes = encode(text);
  if (bytes.length > length) {
    problems.push(`${where}: "${text}" is ${bytes.length} bytes, ${length} allowed`);
    return;
  }
  record.fill(0, offset, offset + length);
  record.set(bytes, offset);
}

export function buildItemPack(source: PackSource, problems: string[]): Uint8Array {
  const out = Uint8Array.from(readFileSync(join(ENG, 'item_eng.bmd')));
  const encode = encoderFor(source.encoding);

  for (const [key, name] of Object.entries(source.items)) {
    const [group, index] = key.split('/').map(Number);
    const record = group * GROUP_STRIDE + index;
    if (!Number.isInteger(group) || !Number.isInteger(index) || record < 0 || record >= ITEM_COUNT) {
      problems.push(`${source.folder}: item "${key}" is not a slot in the table`);
      continue;
    }

    const at = record * ITEM_RECORD;
    const bytes = out.subarray(at, at + ITEM_RECORD);
    bux(bytes);
    putName(bytes, 0, ITEM_NAME, name, encode, `${source.folder} item ${key}`, problems);
    bux(bytes);
  }

  const body = ITEM_COUNT * ITEM_RECORD;
  new DataView(out.buffer, out.byteOffset, out.byteLength)
    .setUint32(body, checksum2(out.subarray(0, body), ITEM_KEY), true);
  return out;
}

export function buildMovePack(source: PackSource, problems: string[]): Uint8Array | null {
  if (!source.maps) return null;

  const out = Uint8Array.from(readFileSync(join(ENG, 'MoveReq_eng.bmd')));
  const encode = encoderFor(source.encoding);
  const count = new DataView(out.buffer, out.byteOffset, out.byteLength).getInt32(0, true);

  for (const [key, name] of Object.entries(source.maps)) {
    const row = Number(key);
    if (!Number.isInteger(row) || row < 0 || row >= count) {
      problems.push(`${source.folder}: warp row "${key}" is not one of the ${count} rows`);
      continue;
    }

    const at = MOVE_HEADER + row * MOVE_RECORD;
    const bytes = out.subarray(at, at + MOVE_RECORD);
    bux(bytes);
    // `szMainMapName` sits after the `int index`. `szSubMapName` behind it is
    // the `/move` alias and stays English, because that is what the server
    // parses.
    putName(bytes, 4, MOVE_NAME, name, encode, `${source.folder} warp row ${key}`, problems);
    bux(bytes);
  }

  return out;
}

/** `id\tflag\t"Name"\t`, CRLF, with the English file's own flags. */
export function buildNpcNames(source: PackSource, problems: string[]): string {
  const english = readFileSync(join(ENG, 'NpcName_Eng.txt'), 'latin1');
  const encode = encoderFor(source.encoding);
  const lines: string[] = ['// MAX : 512\t\t\t'];

  for (const line of english.split(/\r?\n/)) {
    const hit = /^\s*(\d+)\s+(\d+)\s+"([^"]*)"/.exec(line);
    if (!hit) continue;

    const [, id, flag, englishName] = hit;
    const name = source.npcs[id] ?? englishName;
    try {
      encode(name);
    } catch (err) {
      problems.push(`${source.folder} npc ${id}: ${(err as Error).message}`);
      continue;
    }
    lines.push(`${id}\t${flag}\t"${name}"\t`);
  }

  return lines.join('\r\n') + '\r\n';
}

// ---- driving ---------------------------------------------------------------

function build(file: string, check: boolean): void {
  const source = JSON.parse(readFileSync(join(PACKS_DIR, file), 'utf8')) as PackSource;
  const problems: string[] = [];

  const items = buildItemPack(source, problems);
  const maps = buildMovePack(source, problems);
  const npcs = buildNpcNames(source, problems);

  const wrote: string[] = [];

  if (!check) {
    const dir = join(LOCAL, source.folder);
    mkdirSync(dir, { recursive: true });

    writeFileSync(join(dir, `item_${source.suffix}.bmd`), items);
    wrote.push(`item_${source.suffix}.bmd`);

    if (maps) {
      writeFileSync(join(dir, `MoveReq_${source.suffix}.bmd`), maps);
      wrote.push(`MoveReq_${source.suffix}.bmd`);
    }

    // The folder is capitalised in this one's file name, as the original has it.
    writeFileSync(
      join(dir, `NpcName_${source.folder}.txt`),
      encoderFor(source.encoding)(npcs)
    );
    wrote.push(`NpcName_${source.folder}.txt`);
  }

  const counts =
    `${Object.keys(source.items).length} items, ` +
    `${Object.keys(source.npcs).length} npcs, ` +
    `${Object.keys(source.maps ?? {}).length} warp rows`;

  console.log(`${source.folder.padEnd(4)} ${counts}${wrote.length ? ` -> ${wrote.join(', ')}` : ''}`);
  for (const problem of problems) console.log(`  ! ${problem}`);
  if (problems.length) process.exitCode = 1;
}

/** Only when run as a script; the builders above are imported by the test. */
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const check = process.argv.includes('--check');
  const onlyAt = process.argv.indexOf('--only');
  const only = onlyAt > 0 ? process.argv[onlyAt + 1] : null;

  if (!existsSync(PACKS_DIR)) {
    console.log(`no sources in ${PACKS_DIR}`);
  } else {
    for (const file of readdirSync(PACKS_DIR).filter(f => f.endsWith('.json')).sort()) {
      if (only && file !== `${only}.json`) continue;
      build(file, check);
    }
  }
}
