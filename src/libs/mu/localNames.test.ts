import { beforeEach, describe, expect, it } from 'vitest';
import { i18n } from '../../i18n';
import { parseBuffNames } from './buffNameFile';
import { parseItemNames } from './itemNameFile';
import { parseSkillNames } from './skillNameFile';

/**
 * The record layouts of the three name tables in `Data/Local/<pack>/`.
 *
 * The real files cannot be read here - they are fetched over HTTP by the
 * readers - so each test builds one the way the original writer would have,
 * then reads it back. What that pins down is the part that can actually be
 * wrong: the stride, where the name sits inside a record, and that the Bux key
 * restarts at every record rather than running through the file.
 */

const BUX = [0xfc, 0xcf, 0xab];

/** One record, name at `nameOffset`, XOR-ed with the key from its own start. */
function record(size: number, nameOffset: number, name: string): Uint8Array {
  const out = new Uint8Array(size);
  for (let i = 0; i < name.length; i++) out[nameOffset + i] = name.charCodeAt(i);
  for (let i = 0; i < size; i++) out[i] ^= BUX[i % 3];
  return out;
}

/** `_BUFFINFO`: short index at 0, the 50-byte name at 5, 158 bytes a record. */
function buffRecord(id: number, name: string): Uint8Array {
  const out = new Uint8Array(158);
  new DataView(out.buffer).setInt16(0, id, true);
  for (let i = 0; i < name.length; i++) out[5 + i] = name.charCodeAt(i);
  for (let i = 0; i < out.length; i++) out[i] ^= BUX[i % 3];
  return out;
}

/** The `int` record count the buff file opens with; not encrypted. */
function buffCount(count: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setInt32(0, count, true);
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

describe('local name tables', () => {
  beforeEach(() => {
    // The decoder follows the active pack's code page; English is ASCII.
    i18n.setLanguage('en');
  });

  it('reads item names at 84 bytes a record, keyed by group * 512 + index', () => {
    // Record 0 is item 0/0, record 513 is item 1/1.
    const rows = [record(84, 0, 'Kris')];
    for (let i = 1; i < 513; i++) rows.push(record(84, 0, ''));
    rows.push(record(84, 0, 'Short Sword'));

    const names = parseItemNames(concat(rows));

    expect(names.get(0)).toBe('Kris');
    expect(names.get(1 * 512 + 1)).toBe('Short Sword');
    // Blank slots are left out rather than stored as empty strings.
    expect(names.has(1)).toBe(false);
  });

  it('reads skill names at 88 bytes a record, keyed by skill number', () => {
    // 88 % 3 is 1, so the key phase shifts a byte every record: reading the
    // file with one continuous key only lines up on every third name.
    const rows = [record(88, 0, ''), record(88, 0, 'Poison'), record(88, 0, 'Meteorite')];

    const names = parseSkillNames(concat(rows));

    expect(names.get(1)).toBe('Poison');
    expect(names.get(2)).toBe('Meteorite');
  });

  it('reads buff names after the count, by the index inside the record', () => {
    const names = parseBuffNames(concat([buffCount(2), buffRecord(2, 'Increase Defense')]));

    expect(names.get(2)).toBe('Increase Defense');
  });

  it('stops at the count the buff file declares', () => {
    // One record on disk, ninety-nine claimed: read the one that is there.
    const names = parseBuffNames(concat([buffCount(99), buffRecord(7, 'Soul Barrier')]));

    expect(names.get(7)).toBe('Soul Barrier');
    expect(names.size).toBe(1);
  });
});
