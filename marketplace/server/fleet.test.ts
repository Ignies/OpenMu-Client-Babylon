import { describe, expect, test } from 'bun:test';
import { pickForListing, pickForPayout, type Runner } from './fleet';

const bot = (name: string, busy = false, zen: number | null = 0): Runner => ({ name, busy, zen });

describe('which bot collects a listing', () => {
  test('any idle bot, the first free one', () => {
    const picked = pickForListing([bot('MKT001', true), bot('MKT002'), bot('MKT003')], null);
    expect(picked.bot?.name).toBe('MKT002');
  });

  test('nobody when every bot is busy', () => {
    const picked = pickForListing([bot('MKT001', true), bot('MKT002', true)], null);
    expect(picked.bot).toBeNull();
    expect((picked as { reason: string }).reason).toMatch(/busy/);
  });

  test('a bot whose bag has no room for the item is passed over for one that has', () => {
    const full = { ...bot('MKT001'), hasRoom: false };
    const roomy = { ...bot('MKT002'), hasRoom: true };
    expect(pickForListing([full, roomy], null).bot?.name).toBe('MKT002');
  });

  test('nobody when every idle bot is full, and says so', () => {
    const picked = pickForListing([{ ...bot('MKT001'), hasRoom: false }, bot('MKT002', true)], null);
    expect(picked.bot).toBeNull();
    expect((picked as { reason: string }).reason).toMatch(/full/);
  });
});

describe('which bot delivers or returns', () => {
  test('only the one holding the item, even when others are idle', () => {
    const picked = pickForListing([bot('MKT001'), bot('MKT002')], 'MKT002');
    expect(picked.bot?.name).toBe('MKT002');
  });

  test('waits when the holder is busy or not online', () => {
    expect(pickForListing([bot('MKT001'), bot('MKT002', true)], 'MKT002').bot).toBeNull();
    expect(pickForListing([bot('MKT001')], 'MKT002').bot).toBeNull();
  });
});

describe('which bot pays out', () => {
  test('the richest idle bot that has the Zen', () => {
    const picked = pickForPayout(
      [bot('MKT001', false, 5000), bot('MKT002', false, 50_000), bot('MKT003', true, 90_000)],
      4000
    );
    expect(picked.bot?.name).toBe('MKT002');
  });

  test('nobody when no bot carries that much, and says how far off it is', () => {
    const picked = pickForPayout([bot('MKT001', false, 5000)], 9000);
    expect(picked.bot).toBeNull();
    expect((picked as { reason: string }).reason).toMatch(/richest has 5000/);
  });

  test('a bot whose balance is unknown is never sent with money', () => {
    expect(pickForPayout([bot('MKT001', false, null)], 1).bot).toBeNull();
  });
});
