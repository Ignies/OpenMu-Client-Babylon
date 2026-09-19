import { describe, expect, it } from 'vitest';
import { SILENT_TILES } from '../listener';
import { FULL_TILES, instrumentGain, instrumentPan, PAN_TILES } from './space';

describe('instrumentGain', () => {
  it('is full up close and silent at the shared earshot edge', () => {
    expect(instrumentGain(0)).toBe(1);
    expect(instrumentGain(FULL_TILES)).toBe(1);
    expect(instrumentGain(SILENT_TILES)).toBe(0);
    expect(instrumentGain(SILENT_TILES + 10)).toBe(0);
  });

  it('halves for every doubling of distance past the full radius', () => {
    expect(instrumentGain(FULL_TILES * 2)).toBeCloseTo(0.5);
    expect(instrumentGain(FULL_TILES * 4)).toBeCloseTo(0.25);
  });

  it('keeps falling all the way out, with no flat stretch', () => {
    let last = 1;
    for (let d = FULL_TILES + 1; d <= SILENT_TILES; d++) {
      const g = instrumentGain(d);
      expect(g).toBeLessThan(last);
      last = g;
    }
  });
});

describe('instrumentPan', () => {
  it('is centred straight ahead and hard to a side past the pan width', () => {
    expect(instrumentPan(0)).toBe(0);
    expect(instrumentPan(PAN_TILES / 2)).toBeCloseTo(0.5);
    expect(instrumentPan(-PAN_TILES / 2)).toBeCloseTo(-0.5);
    expect(instrumentPan(PAN_TILES * 3)).toBe(1);
    expect(instrumentPan(-PAN_TILES * 3)).toBe(-1);
  });
});
