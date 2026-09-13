import { readFileSync } from 'fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { i18n } from './index';
import { SPANISH_ITEM_NAMES } from './itemNames';
import { spanishLayer } from './spanish';
import { localisedItemName, parseItemNames } from '../libs/mu/itemNameFile';

/**
 * These names replace records of a file nothing else in the tree reads, so a
 * key that points at the wrong slot is invisible - the item keeps its old name
 * and some other item silently gains one. The pack is in the repo, so the test
 * reads it and compares: every fix must land on the record it means to, and
 * change it.
 */

const GROUP_STRIDE = 512;
const RECORDS = 8192;

const packed = () => {
  const bytes = readFileSync(
    new URL('../../Data/Local/Spn/item_spn.bmd', import.meta.url)
  );
  return parseItemNames(new Uint8Array(bytes));
};

const code = (key: string) => {
  const [group, index] = key.split('/').map(Number);
  return group * GROUP_STRIDE + index;
};

describe('Spanish item names', () => {
  beforeEach(() => {
    i18n.setLanguage('es');
  });

  it('is wired into the layer', () => {
    expect(spanishLayer.dataPack?.itemNames).toBe(SPANISH_ITEM_NAMES);
  });

  it('keys a slot of the table, and names it', () => {
    const bad = Object.entries(SPANISH_ITEM_NAMES).filter(
      ([key, name]) =>
        !/^\d+\/\d+$/.test(key) || code(key) >= RECORDS || name.trim() === ''
    );
    expect(bad).toEqual([]);
  });

  it('changes every record it names', () => {
    const names = packed();
    const noop = Object.entries(SPANISH_ITEM_NAMES).filter(
      ([key, name]) => (names.get(code(key)) ?? '') === name
    );
    expect(noop).toEqual([]);
  });

  it('leaves no scroll called "Rollo"', () => {
    const names = packed();
    for (const [key, name] of Object.entries(SPANISH_ITEM_NAMES)) {
      names.set(code(key), name);
    }
    const left = [...names.values()].filter(name => /\brollos?\b/i.test(name));
    expect(left).toEqual([]);
  });

  it('is what the game reads for a fixed item', () => {
    expect(localisedItemName(15, 0)).toBe('Pergamino de Veneno');
  });
});
