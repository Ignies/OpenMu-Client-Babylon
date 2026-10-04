import { afterEach, describe, expect, it, vi } from 'vitest';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import type { Entity, World } from '@/ecs/world';

// What the torch built: 'flare', 'light', 'fire'.
const built = vi.hoisted(() => [] as string[]);

vi.mock('@/controllers/lighting', () => ({
  LOGIN_WALL_TORCH: { sprite: { scale: 4, color: [1, 1, 1] }, terrain: { range: 2, color: [1, 1, 1] } },
  createEffectLight: async () => void built.push('flare'),
  lightMapObject: () => void built.push('light'),
}));

vi.mock('@/controllers/fx', () => ({
  BonedParticleEmitter: class {
    constructor() {
      built.push('fire');
    }
  },
}));

vi.mock('@/controllers/assets', () => ({ reportLoadFailure: () => () => {} }));

vi.mock('@/controllers/terrain', () => ({
  MapTileObject: class {
    node = { scaling: { x: 1 }, getAbsolutePosition: () => ({ x: 0, y: 0, z: 0 }) };
    gltf = null;
    async init() {}
  },
}));

import { LoginWallTorchObject } from './wallTorchObject';

async function build(): Promise<string[]> {
  built.length = 0;
  // The mocked base takes no arguments.
  const torch = new (LoginWallTorchObject as unknown as new () => LoginWallTorchObject)();
  await torch.init({ scene: {} } as unknown as World, {} as Entity);
  return [...built].sort();
}

describe('the login wall torch', () => {
  afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

  it('burns with its light on Enhanced (the loginWallTorches improvement)', async () => {
    expect(await build()).toEqual(['fire', 'flare', 'light']);
  });

  it('is the flare alone on Classic (GMEmpireGuardian4.cpp:864-875)', async () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(await build()).toEqual(['flare']);
  });
});
