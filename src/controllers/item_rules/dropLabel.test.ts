import { existsSync, readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Item } from '@/ecs/world';
import { loadItemSetTables } from '@/controllers/assets';
import { dropLabel } from './dropLabel';

const label = (item: Item) => dropLabel({ isMoney: false, item, group: item.group, num: item.num });

// BuildGroundItemLabelDescriptor (ZzzInventory.cpp:6280-6663).
describe('a ground label', () => {
  it('tints a plain item by its level, grey at +0', () => {
    expect(label({ group: 0, num: 0 }).colour).toBe('#b2b2b2');
    expect(label({ group: 0, num: 0, lvl: 2 }).colour).toBe('#e5e5e5');
    expect(label({ group: 0, num: 0, lvl: 4 }).colour).toBe('#ff7f33');
    expect(label({ group: 0, num: 0, lvl: 6 }).colour).toBe('#66b2ff');
    expect(label({ group: 0, num: 0, lvl: 7 }).colour).toBe('#ffcc19');
  });

  it('is blue for skill, luck or an option, green for excellent, violet for a socket item', () => {
    expect(label({ group: 0, num: 0, luck: true }).colour).toBe('#66b2ff');
    expect(label({ group: 0, num: 0, lvl: 9, excellentFlags: 1, isExcellent: true }).colour).toBe('#19ff7f');
    expect(label({ group: 0, num: 26 }).colour).toBe('#b266ff');
    expect(label({ group: 0, num: 19 }).colour).toBe('#ff19ff');
  });

  it('takes the white, yellow and orange item sets, jewels in bold', () => {
    expect(label({ group: 12, num: 48 }).colour).toBe('#ffffff');
    expect(label({ group: 14, num: 13 })).toEqual({ colour: '#ffcc19', bold: true, setItem: false });
    expect(label({ group: 12, num: 136 })).toEqual({ colour: '#ffcc19', bold: true, setItem: false });
    expect(label({ group: 13, num: 64 }).colour).toBe('#e58721');
    expect(label({ group: 13, num: 85 }).colour).toBe('#e58721');
    expect(dropLabel({ isMoney: true, group: 14, num: 15 }).colour).toBe('#ffcc19');
  });

  it('follows the model a level shows: Box of Luck, Wizard\'s Ring, the boxes and the seeds', () => {
    expect(label({ group: 14, num: 11 }).colour).toBe('#ffcc19');
    expect(label({ group: 14, num: 11, lvl: 1 }).colour).toBe('#ffffff');
    expect(label({ group: 14, num: 11, lvl: 13 }).colour).toBe('#ffcc19');
    expect(label({ group: 13, num: 20, lvl: 2 }).colour).toBe('#ffcc19');
    expect(label({ group: 13, num: 14, lvl: 1 })).toEqual({ colour: '#ffcc19', bold: false, setItem: false });
    expect(label({ group: 12, num: 32 }).colour).toBe('#ff4c4c');
    expect(label({ group: 14, num: 32, lvl: 1 }).colour).toBe('#ff4cff');
    expect(label({ group: 12, num: 100 }).colour).toBe('#b266ff');
    expect(label({ group: 12, num: 11 }).colour).toBe('#b2b2b2');
    expect(label({ group: 13, num: 10, lvl: 3 }).colour).toBe('#ffffff');
  });
});

const TYPES = 'Data/Local/itemsettype.bmd';
const OPTIONS = 'Data/Local/Eng/itemsetoption_eng.bmd';

describe.skipIf(!existsSync(TYPES) || !existsSync(OPTIONS))('an ancient ground label', () => {
  // skipIf still runs this body to collect the tests: load once they run.
  beforeAll(() => loadItemSetTables(new Uint8Array(readFileSync(TYPES)), new Uint8Array(readFileSync(OPTIONS))));

  it('is green and bold on the set colour', () => {
    expect(label({ group: 8, num: 5, ancientDiscriminator: 1, isAncient: true, luck: true })).toEqual({ colour: '#00ff00', bold: true, setItem: true });
  });
});
