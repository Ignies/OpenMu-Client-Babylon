import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { Scene } from '../render/babylon/exports';

// The sheets the flares asked for, the sheet each sprite was drawn from, each manager's cell and every sprite.
const asked = vi.hoisted(() => [] as string[]);
const drawnFrom = vi.hoisted(() => [] as string[]);
const cells = vi.hoisted(() => new Map<string, number>());
const sprites = vi.hoisted(() => [] as { width: number; height: number; angle: number }[]);

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
    angle = 0;
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

/** A scene whose frames the test steps, `ms` at a time. */
function clockedScene() {
  const frames: (() => void)[] = [];
  let delta = 0;
  const scene = {
    onBeforeRenderObservable: { add: (frame: () => void) => (frames.push(frame), frame), remove() {} },
    getEngine: () => ({ getDeltaTime: () => delta }),
  } as unknown as Scene;
  const step = (ms: number) => {
    delta = ms;
    for (const frame of frames) frame();
  };
  return { scene, step };
}

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

  // The slot is loaded twice, shiny04.jpg then shiny05.jpg, and a load under a new name replaces the old one
  // (ZzzOpenData.cpp:5279, :5325; GlobalBitmap.cpp:549-568).
  it('draw BITMAP_SHINY + 5 from shiny05.jpg', async () => {
    const scene = {} as Scene;
    await createMovableFlare(scene, 1.2, [1.9, 1.1, 1.1], 'shiny5');
    expect(drawnFrom[drawnFrom.length - 1]).toBe('Effect/shiny05.OZJ');
    expect(lastSprite().width).toBeCloseTo(0.768);
  });

  // Tarkan's glow is `CreateSprite(BITMAP_IMPACT, Position, Luminosity * 1.5f, ...)` (ZzzObject.cpp:2967).
  it('draw BITMAP_IMPACT from Impack03.jpg and resize a movable card', async () => {
    const flare = await createMovableFlare({} as Scene, 1.05, [1 / 1.7, 1, 1], 'impact');
    expect(drawnFrom[drawnFrom.length - 1]).toBe('Effect/Impack03.OZJ');
    flare?.setScale(0.6);
    expect([lastSprite().width, lastSprite().height]).toEqual([0.384, 0.384].map(v => expect.closeTo(v)));
  });

  // Lost Tower's machines turn their pairs by `Rotation` degrees (ZzzObject.cpp:2902-2911).
  it('draw BITMAP_MAGIC + 1 and BITMAP_LIGHTNING + 1 at their 128 pixels, turned by degrees', async () => {
    const scene = {} as Scene;
    const flare = await createMovableFlare(scene, 1.5, [1, 0.2, 0], 'magic1');
    expect(drawnFrom[drawnFrom.length - 1]).toBe('Effect/Magic_Ground2.OZJ');
    expect(lastSprite().width).toBeCloseTo(1.92);
    flare?.setAngle(-90);
    expect(lastSprite().angle).toBeCloseTo(-Math.PI / 2);
    await createMovableFlare(scene, 0.3, [0.4, 0.8, 1], 'lightning1');
    expect(drawnFrom[drawnFrom.length - 1]).toBe('Effect/lightning2.OZJ');
  });

  // `CreateSprite(BITMAP_SPARK + 1, Position, 5.5f, ...)` has no `* o->Scale` (GMAida.cpp:110).
  it('size an unscaled card without the object scale', async () => {
    const scene = {} as Scene;
    await createEffectLight(scene, { scale: 4, color: [1, 1, 1], texture: 'spark1', unscaled: true }, at, 2.25);
    expect(lastSprite().width).toBeCloseTo(1.28);
    await createEffectLight(scene, { scale: 4, color: [1, 1, 1], texture: 'spark1' }, at, 2.25);
    expect(lastSprite().width).toBeCloseTo(2.88);
  });

  // Kanturu's lamp is `Luminosity * 7` across, `Luminosity = sinf(WorldTime * 0.002f) + 1.8f` (GM_Kanturu_1st.cpp:179).
  it('grow and shrink a card by its size wave', async () => {
    const { scene, step } = clockedScene();
    const grow = { speed: 0.002, amount: 1, base: 0.8 };
    await createEffectLight(scene, { scale: 7, color: [0.8, 0.4, 0.2], texture: 'spark1', unscaled: true, grow }, at, 1);
    const card = lastSprite();
    step(Math.PI / 2 / 0.002);
    expect(card.width).toBeCloseTo(0.32 * 7 * 2.8);
    step(Math.PI / 0.002);
    expect([card.width, card.height]).toEqual([0.32 * 7 * 0.8, 0.32 * 7 * 0.8].map(v => expect.closeTo(v)));
  });

  // Aida's torch turns `WorldTime / 10.0f` degrees (GMAida.cpp:310): a tenth of a degree a millisecond.
  it('turn a spinning card counter-clockwise by its degrees a millisecond', async () => {
    const { scene, step } = clockedScene();
    await createEffectLight(scene, { scale: 3, color: [1, 1, 1], texture: 'flare', spin: 0.1 }, at, 1);
    const card = lastSprite();
    step(900);
    expect(card.angle).toBeCloseTo(Math.PI / 2);
    step(900);
    expect(card.angle).toBeCloseTo(Math.PI);
  });

  it.skipIf(!existsSync('Data/Effect'))('cut each sheet at the width of its file', async () => {
    const scene = {} as Scene;
    for (const texture of ['light', 'flare', 'spark1', 'shiny5', 'impact', 'magic1', 'lightning1'] as const) {
      await createEffectLight(scene, { scale: 1, color: [1, 1, 1], texture }, at, 1);
    }
    for (const [sheet, width] of cells) {
      expect(width, sheet).toBe(jpegWidth(new Uint8Array(readFileSync(`Data/${sheet}`).subarray(24))));
    }
  });
});
