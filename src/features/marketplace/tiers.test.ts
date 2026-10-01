import { describe, expect, it } from 'vitest';
import { lookClasses, tierOf } from './tiers';

/**
 * The look a listing gets is decided here and nowhere else, so the mapping
 * from an item's level and kind to a class or two is pinned down.
 */

const item = (o: { lvl?: number; isExcellent?: boolean; isAncient?: boolean }) =>
  ({ group: 0, num: 0, ...o }) as never;

describe('tiers by level', () => {
  it('start plain and step up at +4, +7 and +10, as the original glow does at +7', () => {
    expect(tierOf(undefined)).toBe('plain');
    expect(tierOf(3)).toBe('plain');
    expect(tierOf(4)).toBe('forged');
    expect(tierOf(6)).toBe('forged');
    expect(tierOf(7)).toBe('high');
    expect(tierOf(9)).toBe('high');
    expect(tierOf(10)).toBe('elite');
    expect(tierOf(15)).toBe('elite');
  });
});

describe('the classes a card carries', () => {
  it('are nothing for a plain item', () => {
    expect(lookClasses(item({ lvl: 0 }))).toBe('');
  });

  it('name the tier and the kind, one class each', () => {
    expect(lookClasses(item({ lvl: 11, isExcellent: true }))).toBe('tier-elite is-excellent');
    expect(lookClasses(item({ lvl: 5 }))).toBe('tier-forged');
    expect(lookClasses(item({ isExcellent: true }))).toBe('is-excellent');
  });

  it('let ancient win over excellent, as the name colour does', () => {
    expect(lookClasses(item({ lvl: 7, isExcellent: true, isAncient: true }))).toBe('tier-high is-ancient');
  });
});
