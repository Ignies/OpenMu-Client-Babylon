/**
 * The fixed-field writer against the client's own readers. Records are Bux
 * encoded one at a time, so a patch that runs the key across a record border
 * reads back as noise; the minimap check goes through `parseMinimapData`.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { parseMinimapData } from '../src/common/minimapData';
import { encoderFor } from './localPacks.ts';
import { patchTable, TABLES } from './packTexts.ts';

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
});
