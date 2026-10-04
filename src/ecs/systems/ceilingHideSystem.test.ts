import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../controllers/render/scenes/csmBounds', () => ({ shadowReceiverChanged: () => {} }));

import { ENUM_WORLD } from '../../core/types';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '../../controllers/fidelity';
import type { World } from '../world';
import { CeilingHideSystem } from './ceilingHideSystem';
import { isHeroUnderRoof } from './roofDetection';

/** A Devias house: one roof slab 3 to 3.5 tiles up, over the hero at (10, 10). */
function house() {
  const roof = {
    metadata: {},
    visibility: 1,
    isVisible: true,
    isDisposed: () => false,
    getTotalVertices: () => 4,
    getBoundingInfo: () => ({
      boundingBox: { minimumWorld: { x: 8, y: 3, z: 8 }, maximumWorld: { x: 12, y: 3.5, z: 12 } },
    }),
  };
  const prop = {
    worldIndex: ENUM_WORLD.WD_2DEVIAS,
    visibility: { state: 'visible' },
    transform: { pos: { x: 10, y: 0, z: 10 } },
    modelObject: { IsMapObject: true, Ready: true, gltf: { mesh: { getChildMeshes: () => [roof] } } },
  };
  const world = {
    mapIndex: ENUM_WORLD.WD_2DEVIAS,
    playerEntity: { transform: { pos: { x: 10, y: 0, z: 10 } } },
    with: () => [prop],
  } as unknown as World;
  return { roof, system: CeilingHideSystem(world) };
}

describe('the roof over the hero', () => {
  afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

  it('fades on Enhanced (the roofFade improvement)', () => {
    const { roof, system } = house();
    for (let i = 0; i < 10; i++) system.update?.(0.05);
    expect(isHeroUnderRoof()).toBe(true);
    expect(roof.visibility).toBe(0);
    expect(roof.isVisible).toBe(false);
  });

  it('stays drawn on Classic, and the hero is still under it (weather, ambience)', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    const { roof, system } = house();
    for (let i = 0; i < 10; i++) system.update?.(0.05);
    expect(isHeroUnderRoof()).toBe(true);
    expect(roof.visibility).toBe(1);
    expect(roof.isVisible).toBe(true);
  });

  it('comes back when the improvement is turned off', () => {
    const { roof, system } = house();
    for (let i = 0; i < 10; i++) system.update?.(0.05);
    setFidelityChoice(FIDELITY_CLASSIC, {});
    for (let i = 0; i < 10; i++) system.update?.(0.05);
    expect(roof.visibility).toBe(1);
    expect(roof.isVisible).toBe(true);
  });
});
