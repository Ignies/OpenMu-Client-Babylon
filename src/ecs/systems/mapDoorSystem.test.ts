import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ENUM_WORLD } from '../../common/types';
import type { World } from '../world';

const playSfx = vi.fn((..._args: unknown[]) => 1300);
vi.mock('../../libs/sfx', () => ({
  playSfx: (...args: unknown[]) => playSfx(...args),
}));

const { MapDoorSystem } = await import('./mapDoorSystem');

const HINGED = 20;
const SLIDING = 86;

type Pos = { x: number; y: number; z: number };

function door(modelId: number, x: number, z: number) {
  return {
    modelId,
    worldIndex: ENUM_WORLD.WD_2DEVIAS,
    transform: { pos: { x, y: 0, z }, rot: { x: 0, y: Math.PI / 2, z: 0 } },
  };
}

/** Just the fields the door system reads. */
function devias(doors: ReturnType<typeof door>[], hero: Pos) {
  const world = {
    mapIndex: ENUM_WORLD.WD_2DEVIAS,
    terrainScale: 100,
    playerEntity: { transform: { pos: hero } },
    with: () => doors,
  };
  return MapDoorSystem(world as unknown as World);
}

const plays = (key: string) =>
  playSfx.mock.calls.filter(call => call[0] === key).length;

describe('Devias door creaks', () => {
  beforeEach(() => {
    playSfx.mockReset();
    playSfx.mockImplementation(() => 1300);
  });

  it('creaks again each time the last creak ends while the hero stays', () => {
    const hero = { x: 10.5, y: 0, z: 10 };
    const system = devias([door(HINGED, 10, 10)], hero);

    system.update!(0.04);
    expect(plays('Sound/aDoor')).toBe(1);

    for (let i = 0; i < 25; i++) system.update!(0.04);
    expect(plays('Sound/aDoor')).toBe(1);

    for (let i = 0; i < 10; i++) system.update!(0.04);
    expect(plays('Sound/aDoor')).toBe(2);
  });

  it('goes quiet once the hero walks out of range', () => {
    const hero = { x: 10.5, y: 0, z: 10 };
    const system = devias([door(HINGED, 10, 10)], hero);

    system.update!(0.04);
    hero.x = 20;
    for (let i = 0; i < 100; i++) system.update!(0.04);

    expect(plays('Sound/aDoor')).toBe(1);
  });

  it('keeps one creak per wave, however many doors are near', () => {
    const hero = { x: 10.5, y: 0, z: 10 };
    const system = devias(
      [door(HINGED, 10, 10), door(HINGED, 11, 10), door(SLIDING, 10, 11)],
      hero
    );

    system.update!(0.04);

    expect(plays('Sound/aDoor')).toBe(1);
    expect(plays('Sound/aCastleDoor')).toBe(1);
  });

  it('asks again shortly when a creak did not start', () => {
    playSfx.mockImplementation(() => 0);
    const hero = { x: 10.5, y: 0, z: 10 };
    const system = devias([door(HINGED, 10, 10)], hero);

    system.update!(0.04);
    system.update!(0.1);
    expect(plays('Sound/aDoor')).toBe(1);

    system.update!(0.2);
    expect(plays('Sound/aDoor')).toBe(2);
  });
});
