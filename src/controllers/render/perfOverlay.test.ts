import { describe, expect, it } from 'vitest';
import { recordSystemTime, systemTimesSnapshot } from './perfOverlay';

describe('the per-system times the bench reads', () => {
  it('lists each system with its average and worst tick, slowest first', () => {
    recordSystemTime('fast', 1);
    recordSystemTime('slow', 5);
    recordSystemTime('slow', 15);
    const rows = systemTimesSnapshot();
    expect(rows.map(r => r.name)).toEqual(['slow', 'fast']);
    expect(rows[0].ms).toBeCloseTo(6);
    expect(rows[0].peak).toBe(15);
  });
});
