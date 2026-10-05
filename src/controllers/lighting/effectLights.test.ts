import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { Scene } from '../render/babylon/exports';

// The sheets the flares asked for, the sheet each sprite was drawn from, each manager's cell and every sprite.
const asked = vi.hoisted(() => [] as string[]);
const drawnFrom = vi.hoisted(() => [] as string[]);
const cells = vi.hoisted(() => new Map<string, number>());
const sprites = vi.hoisted(() => [] as { width: number; height: number }[]);

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
    constructor(public name: string, public sheet: string, _capacity: number, cell: { width: number }) {
      cells.set(sheet, cell.width);
    }
  }
  class Sprite {
    position = { set() {} };
    color = new Color4();
    width = 0;
    height = 0;
    constructor(_name: string, manager: SpriteManager) {
      drawnFrom.push(manager.sheet);
      sprites.push(this);
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

const at = { x: 0, y: 0, z: 0 };
const lastSprite = () => sprites[sprites.length - 1];

/** A JPEG's width, from its SOF0/SOF2 marker. */
function jpegWidth(bytes: Uint8Array): number {
  for (let i = 2; i < bytes.length; ) {
    const marker = bytes[i + 1];
    if (marker === 0xc0 || marker === 0xc2) return (bytes[i + 7] << 8) | bytes[i + 8];
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  return 0;
}

describe('flare cards', () => {
  it('draw BITMAP_FLARE from Flare.jpg and BITMAP_LIGHT from flare01.jpg (ZzzOpenData.cpp:5207, :5309)', async () => {
    const scene = {} as Scene;
    await createEffectLight(scene, { scale: 4, color: [0.7, 0.7, 0.7], texture: 'flare' }, at, 1);
    await createEffectLight(scene, { scale: 2, color: [1, 0.2, 0] }, at, 1);
    await createMovableFlare(scene, 1.35, [1, 1, 1], 'flare');
    // One manager per sheet and scene.
    expect(asked).toEqual(['Effect/Flare.OZJ', 'Effect/flare01.OZJ']);
    expect(drawnFrom).toEqual(['Effect/Flare.OZJ', 'Effect/flare01.OZJ', 'Effect/Flare.OZJ']);
  });

  // A sprite is `Width * Scale` across (zzzeffectsprite.cpp:76): Spark03 is 32 pixels, flare01 64.
  it('draw BITMAP_SPARK + 1 from Spark03.jpg at its own 32 pixels (ZzzOpenData.cpp:5216)', async () => {
    const scene = {} as Scene;
    await createEffectLight(scene, { scale: 5.5, color: [0.1, 0.1, 0.3], texture: 'spark1' }, at, 1);
    expect(drawnFrom[drawnFrom.length - 1]).toBe('Effect/Spark03.OZJ');
    expect(lastSprite().width).toBeCloseTo(1.76);
    await createEffectLight(scene, { scale: 5.5, color: [0.1, 0.1, 0.3] }, at, 1);
    expect(lastSprite().width).toBeCloseTo(3.52);
  });

  // `CreateSprite(BITMAP_SPARK + 1, Position, 5.5f, ...)` has no `* o->Scale` (GMAida.cpp:110).
  it('size an unscaled card without the object scale', async () => {
    const scene = {} as Scene;
    await createEffectLight(scene, { scale: 4, color: [1, 1, 1], texture: 'spark1', unscaled: true }, at, 2.25);
    expect(lastSprite().width).toBeCloseTo(1.28);
    await createEffectLight(scene, { scale: 4, color: [1, 1, 1], texture: 'spark1' }, at, 2.25);
    expect(lastSprite().width).toBeCloseTo(2.88);
  });

  it.skipIf(!existsSync('Data/Effect'))('cut each sheet at the width of its file', async () => {
    const scene = {} as Scene;
    for (const texture of ['light', 'flare', 'spark1'] as const) {
      await createEffectLight(scene, { scale: 1, color: [1, 1, 1], texture }, at, 1);
    }
    for (const [sheet, width] of cells) {
      expect(width, sheet).toBe(jpegWidth(new Uint8Array(readFileSync(`Data/${sheet}`).subarray(24))));
    }
  });
});
