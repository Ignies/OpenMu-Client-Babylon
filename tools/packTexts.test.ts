/**
 * The fixed-field writer against the client's own readers. Records are Bux
 * encoded one at a time, so a patch that runs the key across a record border
 * reads back as noise; the minimap check goes through `parseMinimapData`.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { parseMinimapData } from '../src/controllers/terrain/minimapData';
import { parseGlobalText } from '../src/controllers/assets/mu/globalTextFile';
import { parseHarmonyOptions, parseSocketOptions } from '../src/controllers/assets/mu/itemOptionFiles';
import { encoderFor } from './localPacks.ts';
import { patchGlobalText, patchTable, TABLES } from './packTexts.ts';

const ENG = resolve(__dirname, '..', 'Data', 'Local', 'Eng');
const BUX = [0xfc, 0xcf, 0xab];

function field(bytes: Uint8Array, record: number, size: number, offset: number, length: number): string {
  const r = bytes.slice(record * size, (record + 1) * size);
  for (let i = 0; i < r.length; i++) r[i] ^= BUX[i % 3];
  let end = offset;
  while (end < offset + length && r[end]) end++;
  return new TextDecoder('utf-8').decode(r.subarray(offset, end));
}

describe('packTexts', () => {
  const utf8 = encoderFor('utf-8');

  it('replaces a minimap name and leaves the marker where it was', () => {
    const english = new Uint8Array(readFileSync(resolve(ENG, 'Minimap', 'Minimap_World1_eng.bmd')));
    const problems: string[] = [];
    const out = patchTable(english, TABLES.minimap, { 0: { name: 'Cô gái bán thuốc Amy' } }, utf8, 'test', problems);

    const before = parseMinimapData(english);
    const after = parseMinimapData(out);
    expect(problems).toEqual([]);
    expect(after[0]).toEqual({ ...before[0], name: 'Cô gái bán thuốc Amy' });
    expect(after.slice(1)).toEqual(before.slice(1));
  });

  it('writes a dialog answer into its own slot', () => {
    const english = new Uint8Array(readFileSync(resolve(ENG, 'Dialog_eng.bmd')));
    const problems: string[] = [];
    const out = patchTable(english, TABLES.dialog, { 3: { text: 'Witaj!', answer1: 'Tak' } }, utf8, 'test', problems);

    expect(problems).toEqual([]);
    expect(field(out, 3, 1024, 0, 300)).toBe('Witaj!');
    expect(field(out, 3, 1024, 384 + 64, 64)).toBe('Tak');
    expect(field(out, 4, 1024, 0, 300)).toBe(field(english, 4, 1024, 0, 300));
  });

  it('refuses a string that does not fit its field', () => {
    const english = new Uint8Array(readFileSync(resolve(ENG, 'Quest_eng.bmd')));
    const problems: string[] = [];
    const out = patchTable(english, TABLES.quest, { 0: { name: 'Đ'.repeat(20) } }, utf8, 'test', problems);

    expect(problems).toHaveLength(1);
    expect(out).toEqual(english);
  });

  it('writes harmony and socket option names the client reads back', () => {
    const harmony = new Uint8Array(readFileSync(resolve(ENG, 'JewelOfHarmonyOption_eng.bmd')));
    const sockets = new Uint8Array(readFileSync(resolve(ENG, 'socketitem_eng.bmd')));
    const problems: string[] = [];
    const h = patchTable(harmony, TABLES.harmony, { 1: { name: 'Atak max. +' } }, utf8, 'test', problems);
    const k = patchTable(sockets, TABLES.socket, { 1: { name: 'Szybkość ataku' } }, utf8, 'test', problems);

    expect(problems).toEqual([]);
    const before = parseHarmonyOptions(harmony);
    const after = parseHarmonyOptions(h);
    expect(after[0][1]).toEqual({ ...before[0][1], name: 'Atak max. +' });
    expect(after[0][0]).toEqual(before[0][0]);
    expect(parseSocketOptions(k)[0][1]?.name).toBe('Szybkość ataku');
    expect(parseSocketOptions(k)[0][2]).toEqual(parseSocketOptions(sockets)[0][2]);
  });

  it('swaps one global text line and keeps every other', () => {
    const english = new Uint8Array(readFileSync(resolve(ENG, 'text_eng.bmd')));
    const problems: string[] = [];
    const out = patchGlobalText(english, { 604: 'Utwórz przedmiot +10' }, utf8, 'test', problems);

    const before = parseGlobalText(english);
    const after = parseGlobalText(out);
    expect(problems).toEqual([]);
    expect(after.get(604)).toBe('Utwórz przedmiot +10');
    expect(after.size).toBe(before.size);
    // Lines that were CP949 bytes in the English file are carried as characters, like questWords.ts does.
    const broken = String.fromCharCode(0xfffd);
    for (const [id, line] of before) if (id !== 604 && !line.includes(broken)) expect(after.get(id)).toBe(line);
  });
});
