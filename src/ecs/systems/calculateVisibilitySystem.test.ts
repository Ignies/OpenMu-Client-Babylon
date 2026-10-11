import { describe, expect, it } from 'vitest';
import type { Entity } from '../world';
import { MAX_DRAWN_DROPS, capDrawnDrops } from './calculateVisibilitySystem';

type Drop = Required<Pick<Entity, 'transform' | 'visibility'>>;

/** A visible drop `x` tiles east of the hero. */
const drop = (x: number): Drop => ({
  transform: { pos: { x, y: 0, z: 0 }, rot: { x: 0, y: 0, z: 0 }, scale: 1 },
  visibility: { state: 'visible', lastChecked: 1 },
});

describe('the ground item draw cap', () => {
  it('leaves a normal pile alone', () => {
    const drops = Array.from({ length: MAX_DRAWN_DROPS }, (_, i) => drop(i));
    capDrawnDrops(drops, { x: 0, y: 0, z: 0 });
    expect(drops.every(d => d.visibility.state === 'visible')).toBe(true);
  });

  it('hides the farthest past the cap and looks at them again soon', () => {
    const drops = Array.from({ length: MAX_DRAWN_DROPS + 20 }, (_, i) => drop(MAX_DRAWN_DROPS + 20 - i));
    capDrawnDrops(drops, { x: 0, y: 0, z: 0 });
    const shown = drops.filter(d => d.visibility.state === 'visible');
    expect(shown).toHaveLength(MAX_DRAWN_DROPS);
    expect(Math.max(...shown.map(d => d.transform.pos.x))).toBe(MAX_DRAWN_DROPS);
    const hidden = drops.filter(d => d.visibility.state === 'hidden');
    expect(hidden.every(d => d.visibility.lastChecked <= 0.25)).toBe(true);
  });
});
