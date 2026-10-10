import { describe, expect, it, vi } from 'vitest';
import { nearestActors } from './terrainGrass';

const at = (x: number, z: number) => ({ x, y: 0, z });

describe('the grass field', () => {
  // Asked every frame for the bodies that may press the grass: the nearest first, into one list it keeps.
  it('picks the n nearest bodies, nearest first, into one list it keeps', () => {
    const hero = at(1, 0);
    const near = at(2, 0);
    const far = at(5, 0);
    const farther = at(9, 0);
    const map = vi.spyOn(Array.prototype, 'map');
    const first = nearestActors([far, hero, farther, near], 0, 0, 3);
    expect(first).toEqual([hero, near, far]);
    const second = nearestActors([farther, near], 0, 0, 3);
    const mapped = map.mock.calls.length;
    map.mockRestore();
    expect(second).toBe(first);
    expect(second).toEqual([near, farther]);
    expect(mapped).toBe(0);
  });
});
