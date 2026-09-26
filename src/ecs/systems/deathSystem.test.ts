import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ENUM_WORLD } from '../../common/types';
import { TW_ACTION, TW_NOGROUND } from '../../common/terrain/consts';
import type { World } from '../world';

const playSfx = vi.fn((..._args: unknown[]) => 1000);
vi.mock('../../libs/sfx', () => ({
  playSfx: (...args: unknown[]) => playSfx(...args),
}));
// These three reach the store through the effects layer / combat sounds.
const spawnBomb = vi.fn();
vi.mock('../../common/deathVisuals', () => ({
  shatterDeathFor: () => undefined,
  spawnBomb: (...args: unknown[]) => spawnBomb(...args),
}));
vi.mock('../../effects', () => ({ effects: { spawn: () => {} } }));
vi.mock('../../common/combatSounds', () => ({ COMBAT_BUS: 'combat' }));

const { DeathSystem } = await import('./deathSystem');

const TICK = 1 / 25;

function corpse() {
  return {
    dying: {
      time: 0,
      started: false,
      rot: 0,
      alpha: 1,
      sink: 0,
      killedByHero: false,
      skill: 0,
      killerNetId: 0,
      shattered: false,
      offset: { x: 0, y: 0, z: 0 },
      pitch: 0,
    },
    // Not ready: the Die clip never starts, only the kill-tick motion and the bombs run.
    modelObject: { Ready: false },
    transform: { pos: { x: 30.5, y: 0, z: 90.5 } },
  };
}

/** Just the fields the death system reads before the Die clip. */
function castle(map: ENUM_WORLD, flag: number, bodies: ReturnType<typeof corpse>[]) {
  const world = {
    mapIndex: map,
    scene: {},
    getTerrainFlag: () => flag,
    with: () => bodies,
  };
  return DeathSystem(world as unknown as World);
}

const plays = (key: string) => playSfx.mock.calls.filter(call => call[0] === key);

describe('Chaos Castle death sounds', () => {
  beforeEach(() => {
    playSfx.mockClear();
    spawnBomb.mockClear();
  });

  it('gives every bomb its 2D, one-channel explosion on odd ticks 15..25', () => {
    const system = castle(ENUM_WORLD.WD_18CHAOS_CASTLE, 0, [corpse()]);
    for (let i = 0; i < 40; i++) system.update!(TICK);

    expect(spawnBomb).toHaveBeenCalledTimes(6);
    const booms = plays('Sound/eExplosion');
    expect(booms).toHaveLength(6);
    for (const [, at, opts] of booms) {
      expect(at).toBeNull();
      expect(opts).toMatchObject({ bus: 'combat', channels: 1 });
    }
    expect(plays('Sound/pMaleScream')).toHaveLength(0);
  });

  it('screams once, 2D, when the body drops into a pit', () => {
    const system = castle(ENUM_WORLD.WD_18CHAOS_CASTLE, TW_NOGROUND, [corpse()]);
    for (let i = 0; i < 40; i++) system.update!(TICK);

    const screams = plays('Sound/pMaleScream');
    expect(screams).toHaveLength(1);
    expect(screams[0][1]).toBeNull();
    expect(screams[0][2]).toMatchObject({ bus: 'combat', channels: 1 });
    // A falling body bombs earlier (ticks 5..15), still six of them.
    expect(plays('Sound/eExplosion')).toHaveLength(6);
  });

  it('stays quiet off the bridge edge in Blood Castle', () => {
    const system = castle(ENUM_WORLD.WD_11BLOODCASTLE1, TW_ACTION | TW_NOGROUND, [corpse()]);
    for (let i = 0; i < 40; i++) system.update!(TICK);

    expect(playSfx).not.toHaveBeenCalled();
    expect(spawnBomb).not.toHaveBeenCalled();
  });
});
