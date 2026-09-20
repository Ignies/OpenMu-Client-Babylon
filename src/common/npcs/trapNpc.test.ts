import { existsSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { TRAP_MODEL_TABLE } from './trapNpc';

const ASSETS = join(import.meta.dirname, '..', '..', '..', 'public', 'game-assets');

const objectFile = (world: number, modelIndex: number) =>
  `Object${world}/Object${(modelIndex + 1).toString().padStart(2, '0')}.glb`;

/**
 * A trap takes its model from the map it stands on, so the check is per
 * (map, trap) pair: `Object<world+1>` is the folder the original loads for
 * that world (MapManager.cpp:1121).
 */
const SPAWNS: readonly { map: string; world: number; traps: readonly number[] }[] = [
  // Dungeon: lance, iron stick and fire traps.
  { map: 'Dungeon', world: 2, traps: [100, 101, 102] },
  // Lost Tower 7: meteorite traps.
  { map: 'Lost Tower', world: 5, traps: [103] },
  // Castle Siege.
  { map: 'Battle Castle', world: 31, traps: [104] },
  // Kanturu event: laser traps.
  { map: 'Kanturu 1st', world: 38, traps: [106] },
];

describe('TRAP_MODEL_TABLE', () => {
  it('covers the trap numbers the server spawns', () => {
    for (const type of [100, 101, 102, 103, 104, 106]) {
      expect(TRAP_MODEL_TABLE[type], `trap ${type}`).toBeDefined();
    }
  });

  it('leaves the Kanturu canon trap to the NPC table', () => {
    expect(TRAP_MODEL_TABLE[105]).toBeUndefined();
  });

  it('names a model that exists on every map that spawns it', () => {
    const missing: string[] = [];

    for (const { map, world, traps } of SPAWNS) {
      for (const type of traps) {
        const file = objectFile(world, TRAP_MODEL_TABLE[type][0]);
        if (!existsSync(join(ASSETS, file))) missing.push(`${map}: trap ${type} -> ${file}`);
      }
    }

    expect(missing).toEqual([]);
  });
});
