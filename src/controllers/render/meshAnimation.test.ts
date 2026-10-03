import { afterEach, describe, expect, it } from 'vitest';
import type { ENUM_WORLD } from '../../core/types';
import { maps } from '../maps';
import { meshAnimationFor, type MeshAnimation } from './meshAnimation';

const A = 200 as ENUM_WORLD;
const B = 201 as ENUM_WORLD;
const ROW: MeshAnimation = { mesh: 1, kind: 'stream', v: t => t };

let unregister: (() => void) | null = null;
afterEach(() => {
  unregister?.();
  unregister = null;
});

describe('meshAnimationFor', () => {
  it('reads the map row of the world asked about, per world', () => {
    unregister = maps.register({
      name: 'zzTest',
      worlds: [A, B],
      tiles: [],
      render: { meshAnimations: { byWorld: { [A]: { 7: ROW } } } },
    });
    expect(meshAnimationFor(A, 7)).toBe(ROW);
    expect(meshAnimationFor(A, 8)).toBeUndefined();
    expect(meshAnimationFor(B, 7)).toBeUndefined();
  });

  it('has nothing for a world no entry claims', () => {
    expect(meshAnimationFor(202 as ENUM_WORLD, 7)).toBeUndefined();
  });
});
