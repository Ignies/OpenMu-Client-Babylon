import { describe, expect, it } from 'vitest';
import { buildItemPack, buildMovePack, buildNpcNames, encoderFor, type PackSource } from './localPacks';
import { parseItemNames } from '../src/libs/mu/itemNameFile';

/**
 * The packs this tool writes are read back by the game's own readers, so that
 * is what the tests assert: build a table, parse it with
 * `src/libs/mu/itemNameFile.ts`, and compare. A layout mistake here would show
 * up as garbled names in the game rather than as a crash, which is exactly the
 * failure a byte-level test would miss.
 */

const BUX = [0xfc, 0xcf, 0xab];

/** Decodes a record's name field the way `decodeLocalText` does. */
function nameAt(pack: Uint8Array, at: number, offset: number, length: number, page = 'windows-1252') {
  const record = Uint8Array.from(pack.subarray(at, at + 84));
  for (let k = 0; k < record.length; k++) record[k] ^= BUX[k % 3];
  let end = offset;
  while (end < offset + length && record[end] !== 0) end++;
  return new TextDecoder(page).decode(record.subarray(offset, end));
}

function moveReqNames(pack: Uint8Array): Map<number, string> {
  const out = new Map<number, string>();
  const count = new DataView(pack.buffer, pack.byteOffset, pack.byteLength).getInt32(0, true);
  for (let i = 0; i < count; i++) out.set(i, nameAt(pack, 4 + i * 84, 4, 32));
  return out;
}

const source = (over: Partial<PackSource> = {}): PackSource => ({
  folder: 'Test',
  suffix: 'tst',
  encoding: 'windows-1252',
  items: {},
  npcs: {},
  ...over,
});

const itemNames = (pack: Uint8Array) => parseItemNames(Uint8Array.from(pack));

describe('local pack writer', () => {
  it('leaves every English name in place when nothing is overridden', () => {
    const problems: string[] = [];
    const names = itemNames(buildItemPack(source(), problems));

    expect(problems).toEqual([]);
    // The shipped English table; a changed count means the layout moved.
    expect(names.size).toBe(946);
    expect(names.get(0)).toBe('Kris');
    expect(names.get(12 * 512 + 15)).toBe('Jewel of Chaos');
  });

  it('writes a name at the slot its group and index name', () => {
    const problems: string[] = [];
    const names = itemNames(
      buildItemPack(
        source({ items: { '0/0': 'Dolch', '7/0': 'Bronzehelm', '12/15': 'Chaos-Juwel' } }),
        problems
      )
    );

    expect(problems).toEqual([]);
    expect(names.get(0)).toBe('Dolch');
    expect(names.get(7 * 512 + 0)).toBe('Bronzehelm');
    expect(names.get(12 * 512 + 15)).toBe('Chaos-Juwel');
    // Its neighbours are untouched.
    expect(names.get(1)).toBe('Short Sword');
  });

  it('keeps the accented characters of the code page the pack declares', () => {
    const problems: string[] = [];
    // Cyrillic needs 1251: in UTF-8 it is two bytes a character and the long
    // names would not fit the 30-byte field.
    const pack = buildItemPack(
      source({ encoding: 'windows-1251', items: { '0/0': 'Кинжал', '7/0': 'Бронзовый шлем' } }),
      problems
    );

    expect(problems).toEqual([]);
    expect(nameAt(pack, 0, 0, 30, 'windows-1251')).toBe('Кинжал');
    expect(nameAt(pack, 7 * 512 * 84, 0, 30, 'windows-1251')).toBe('Бронзовый шлем');
  });

  it('refuses a name that does not fit its field instead of truncating it', () => {
    const problems: string[] = [];
    const names = itemNames(
      buildItemPack(source({ items: { '0/0': 'x'.repeat(31) } }), problems)
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('31 bytes, 30 allowed');
    // The English name is left alone rather than half-written.
    expect(names.get(0)).toBe('Kris');
  });

  it('fills the whole 30-byte field when a name needs it', () => {
    const problems: string[] = [];
    const exact = 'y'.repeat(30);
    const names = itemNames(buildItemPack(source({ items: { '0/0': exact } }), problems));

    expect(problems).toEqual([]);
    expect(names.get(0)).toBe(exact);
  });

  it('writes the warp window name and leaves the /move alias alone', () => {
    const problems: string[] = [];
    const pack = buildMovePack(source({ maps: { 1: 'Lorencia', 7: 'Verlies' } }), problems)!;

    expect(problems).toEqual([]);
    expect(moveReqNames(pack).get(7)).toBe('Verlies');
    expect(moveReqNames(pack).get(1)).toBe('Lorencia');
  });

  it('keeps the flag column and fills the gaps with English', () => {
    const problems: string[] = [];
    const text = buildNpcNames(source({ npcs: { 84: 'Skelettkrieger-Häuptling' } }), problems);
    const rows = text.split('\r\n').filter(line => /^\d/.test(line));

    expect(problems).toEqual([]);
    expect(rows).toHaveLength(532);
    expect(rows[0]).toBe('84\t1\t"Skelettkrieger-Häuptling"\t');
    // An id with no translation keeps the English name and its flag.
    expect(text).toContain('85\t1\t"Chief Skeleton Archer"\t');
  });

  it('says which character a code page cannot hold', () => {
    expect(() => encoderFor('windows-1252')('日本語')).toThrow(/windows-1252 cannot hold/);
    expect(encoderFor('utf-8')('日本語')).toHaveLength(9);
  });
});
