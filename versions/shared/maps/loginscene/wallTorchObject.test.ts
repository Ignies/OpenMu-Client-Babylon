import { afterEach, describe, expect, it, vi } from 'vitest';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import type { Entity, World } from '@/ecs/world';

// What the torch built: 'flare', 'light', 'fire'; and the flare's colour and sheet.
const built = vi.hoisted(() => [] as string[]);
const flareColors = vi.hoisted(() => [] as (readonly number[])[]);
const flareSheets = vi.hoisted(() => [] as (string | undefined)[]);

vi.mock('@/controllers/lighting', () => ({
  LOGIN_WALL_TORCH: { sprite: { scale: 4, color: [1, 0.45, 0.15], texture: 'flare' }, terrain: { range: 2, color: [1, 1, 1] } },
  createEffectLight: async (_scene: unknown, spec: { color: readonly number[]; texture?: string }) => {
    built.push('flare');
    flareColors.push(spec.color);
    flareSheets.push(spec.texture);
  },
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
  flareColors.length = 0;
  flareSheets.length = 0;
  // The mocked base takes no arguments.
  const torch = new (LoginWallTorchObject as unknown as new () => LoginWallTorchObject)();
  await torch.init({ scene: {} } as unknown as World, {} as Entity);
  return [...built].sort();
}

describe('the login wall torch', () => {
  afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

  it('burns with its light and a warm flare on Enhanced (the loginWallTorches improvement)', async () => {
    expect(await build()).toEqual(['fire', 'flare', 'light']);
    expect(flareColors).toEqual([[1, 0.45, 0.15]]);
  });

  // Case 37: CreateSprite(BITMAP_FLARE, ..., fLumi * 0.7 on all three channels).
  it('is the grey flare alone on Classic (GMEmpireGuardian4.cpp:864-875)', async () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(await build()).toEqual(['flare']);
    expect(flareColors).toEqual([[0.7, 0.7, 0.7]]);
  });

  // BITMAP_FLARE is Flare.jpg (ZzzOpenData.cpp:5309), not BITMAP_LIGHT's flare01.jpg.
  it('draws its flare from the BITMAP_FLARE sheet, lit or not (GMEmpireGuardian4.cpp:872)', async () => {
    await build();
    const lit = [...flareSheets];
    setFidelityChoice(FIDELITY_CLASSIC, {});
    await build();
    expect([...lit, ...flareSheets]).toEqual(['flare', 'flare']);
  });
});
