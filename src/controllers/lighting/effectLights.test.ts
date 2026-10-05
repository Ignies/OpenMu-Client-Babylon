import { describe, expect, it, vi } from 'vitest';
import type { Scene } from '../render/babylon/exports';

// The sheets the flares asked for, and the sheet each sprite was drawn from.
const asked = vi.hoisted(() => [] as string[]);
const drawnFrom = vi.hoisted(() => [] as string[]);

vi.mock('@/controllers/assets/mu', () => ({
  downloadDataFile: async (path: string) => {
    asked.push(path);
    return new Uint8Array(32);
  },
}));
vi.mock('../render/babylon/exports', () => {
  class Color4 {
    constructor(public r = 0, public g = 0, public b = 0, public a = 1) {}
    set(r: number, g: number, b: number, a: number) {
      Object.assign(this, { r, g, b, a });
    }
  }
  class SpriteManager {
    constructor(public name: string, public sheet: string) {}
  }
  class Sprite {
    position = { set() {} };
    color = new Color4();
    constructor(_name: string, manager: SpriteManager) {
      drawnFrom.push(manager.sheet);
    }
    dispose() {}
  }
  return { Color4, Constants: { ALPHA_ONEONE: 1 }, SpriteManager, Sprite };
});
vi.mock('./director', () => ({ lookDirector: () => null }));
vi.mock('../fx/core', () => ({ EFFECT_RENDERING_GROUP: 1, keepDepthForEffects: () => {} }));
// The sheet a manager is built from: its blob URL names the bytes' source.
vi.spyOn(URL, 'createObjectURL').mockImplementation(() => asked[asked.length - 1]);

const { createEffectLight, createMovableFlare } = await import('./effectLights');

describe('flare cards', () => {
  it('draw BITMAP_FLARE from Flare.jpg and BITMAP_LIGHT from flare01.jpg (ZzzOpenData.cpp:5207, :5309)', async () => {
    const scene = {} as Scene;
    const at = { x: 0, y: 0, z: 0 };
    await createEffectLight(scene, { scale: 4, color: [0.7, 0.7, 0.7], texture: 'flare' }, at, 1);
    await createEffectLight(scene, { scale: 2, color: [1, 0.2, 0] }, at, 1);
    await createMovableFlare(scene, 1.35, [1, 1, 1], 'flare');
    // One manager per sheet and scene.
    expect(asked).toEqual(['Effect/Flare.OZJ', 'Effect/flare01.OZJ']);
    expect(drawnFrom).toEqual(['Effect/Flare.OZJ', 'Effect/flare01.OZJ', 'Effect/Flare.OZJ']);
  });
});
