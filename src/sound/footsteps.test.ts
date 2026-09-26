import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MonsterActionType, PlayerAction } from '../common/objects/enum';
import { ENUM_WORLD } from '../common/types';
import type { World } from '../ecs/world';
import { SoundsManager } from '../libs/soundsManager';
import { FOOT_DOWN_FRAMES, footstepSound, footstepsLayer } from './footsteps';
import { attachListener } from './listener';

const hero = {
  worldIndex: ENUM_WORLD.WD_0LORENCIA,
  transform: { pos: { x: 10, y: 0, z: 10 } },
  playerAnimation: { action: PlayerAction.PLAYER_WALK_MALE },
  attributeSystem: { isAboveZero: () => false },
  modelObject: {
    CurrentAction: PlayerAction.PLAYER_WALK_MALE as number,
    frame: 0,
    actionFrame() {
      return this.frame;
    },
  },
};

const world = {
  playerEntity: hero,
  getTerrainTile: () => 1,
} as unknown as World;

let steps = 0;

/** One frame of the layer with the hero's clip at `frame` BMD keys. */
function at(frame: number) {
  hero.modelObject.frame = frame;
  footstepsLayer.update!(ENUM_WORLD.WD_0LORENCIA, 1 / 60);
}

beforeEach(() => {
  steps = 0;
  footstepsLayer.reset!();
  attachListener(world);
  hero.worldIndex = ENUM_WORLD.WD_0LORENCIA;
  hero.modelObject.CurrentAction = PlayerAction.PLAYER_WALK_MALE;
  vi.spyOn(SoundsManager, 'loadAndPlaySoundEffect').mockImplementation(() => {
    steps++;
    return { setVolume() {}, setPlaybackRate() {} } as never;
  });
});

afterEach(() => vi.restoreAllMocks());

describe('footsteps', () => {
  it('lands the feet at AnimationFrame 1.5 and 4.5, in BMD keys', () => {
    expect(FOOT_DOWN_FRAMES).toEqual([1.5, 4.5]);

    at(0.2);
    at(1.4);
    expect(steps).toBe(0);
    at(1.6);
    expect(steps).toBe(1);
    at(4.4);
    expect(steps).toBe(1);
    at(4.6);
    at(7);
    expect(steps).toBe(2);

    // The clip comes round: both feet again.
    at(0.1);
    at(2);
    at(5);
    expect(steps).toBe(4);
  });

  it('takes no steps in a monster body', () => {
    hero.modelObject.CurrentAction = MonsterActionType.Walk;
    at(0.2);
    at(2);
    at(5);
    expect(steps).toBe(0);
  });

  it('walks on snow in Doppelganger 1, which IsIceCity counts', () => {
    hero.worldIndex = ENUM_WORLD.WD_65DOPPLEGANGER1;
    expect(footstepSound()).toBe('Sound/pWalk(Snow)');
    hero.worldIndex = ENUM_WORLD.WD_66DOPPLEGANGER2;
    expect(footstepSound()).toBe('Sound/pWalk(Soil)');
  });
});
