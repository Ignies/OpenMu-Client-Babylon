import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { Scene } from '../render/babylon/exports';
import type { World } from '../../ecs/world';
import { Ecs } from '../../ecs/current';

// The sheets the flares asked for, the sheet each sprite was drawn from, each manager's cell and every sprite.
const asked = vi.hoisted(() => [] as string[]);
const drawnFrom = vi.hoisted(() => [] as string[]);
const cells = vi.hoisted(() => new Map<string, { width: number; height: number }>());
const sprites = vi.hoisted(() => [] as { width: number; height: number; angle: number; position: { y: number } }[]);

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
    constructor(public name: string, public sheet: string, _capacity: number, cell: { width: number; height: number }) {
      cells.set(sheet, { width: cell.width, height: cell.height });
    }
  }
  class Sprite {
    position = {
      x: 0,
      y: 0,
      z: 0,
      set(x: number, y: number, z: number) {
        Object.assign(this, { x, y, z });
      },
    };
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
vi.mock('./pointLightPool', () => ({ registerPointLightEmitter: () => () => {} }));
vi.mock('../terrain/terrainDynamicLight', () => ({ registerTerrainLight: () => () => {} }));
// The sheet a manager is built from: its blob URL names the bytes' source.
vi.spyOn(URL, 'createObjectURL').mockImplementation(() => asked[asked.length - 1]);

const { createEffectLight, createMovableFlare } = await import('./effectLights');
const { LightSource, tickLightSources } = await import('./lightSource');

const at = { x: 0, y: 0, z: 0 };
const lastSprite = () => sprites[sprites.length - 1];

/** Sets the world's clock, the original's `WorldTime`, to `ms`. */
const worldAt = (ms: number) =>
  void (Ecs.world = { gameTime: { TotalGameTime: { TotalSeconds: ms / 1000 } } } as unknown as World);

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

/** A JPEG's width and height, from its SOF0/SOF2 marker. */
function jpegSize(bytes: Uint8Array): { width: number; height: number } {
  for (let i = 2; i < bytes.length; ) {
    const marker = bytes[i + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      return { width: (bytes[i + 7] << 8) | bytes[i + 8], height: (bytes[i + 5] << 8) | bytes[i + 6] };
    }
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  return { width: 0, height: 0 };
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

  // Kanturu 2's relic lamps draw it over their BITMAP_LIGHT (GM_Kanturu_2nd.cpp:343-344).
  it('draw BITMAP_KANTURU_2ND_EFFECT1 from Object39\'s k_effect_01.jpg (ZzzOpenData.cpp:5495)', async () => {
    await createEffectLight({} as Scene, { scale: 0.5, color: [0.3, 0.5, 1], texture: 'kanturu2ndEffect1' }, at, 1);
    expect(drawnFrom[drawnFrom.length - 1]).toBe('Object39/k_effect_01.OZJ');
    expect(lastSprite().width).toBeCloseTo(0.32);
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
    worldAt(Math.PI / 2 / 0.002);
    step(16);
    expect(card.width).toBeCloseTo(0.32 * 7 * 2.8);
    worldAt((Math.PI * 1.5) / 0.002);
    step(16);
    expect([card.width, card.height]).toEqual([0.32 * 7 * 0.8, 0.32 * 7 * 0.8].map(v => expect.closeTo(v)));
  });

  // Karutan's lamps are `absf(sinf(WorldTime * 0.0004)) * 0.4f` bright (GMKarutan1.cpp:88): the wave folds up at zero.
  it('breathe a card on |sin| when its wave is abs', async () => {
    const { scene, step } = clockedScene();
    const pulse = { speed: 0.0004, amount: 0.4, base: 0, abs: true };
    await createEffectLight(scene, { scale: 2, color: [1.3, 1.3, 1.9], pulse, unscaled: true }, at, 1);
    const card = lastSprite() as unknown as { color: { r: number; b: number } };
    worldAt((Math.PI * 1.5) / 0.0004);
    step(16);
    expect([card.color.r, card.color.b]).toEqual([0.52, 0.76].map(v => expect.closeTo(v)));
    worldAt((Math.PI * 2) / 0.0004);
    step(16);
    expect(card.color.r).toBeCloseTo(0);
  });

  // A card and the ground under it breathe on `sinf(WorldTime * k)` (GM_Kanturu_1st.cpp:179, ZzzObject.cpp:4060), the
  // world's clock (ZzzAI.cpp:728), not their own age: two placed apart breathe alike, each card in step with its light.
  it('breathe a card and its ground light on the world clock, alike however far apart they were placed', async () => {
    const { scene, step } = clockedScene();
    const pulse = { speed: 0.002, amount: 0.3, base: 0.4 };
    const color = [1, 1, 1] as const;
    const place = async () => {
      await createEffectLight(scene, { scale: 1, color, pulse }, at, 1);
      const card = lastSprite() as unknown as { color: { r: number } };
      return { card, light: LightSource.attach(scene, { color, range: 3, pulse }, { position: { ...at } }) };
    };
    const frame = (ms: number) => {
      step(ms);
      tickLightSources(ms / 1000);
    };
    worldAt(1000);
    const first = await place();
    worldAt(1700);
    frame(700);
    worldAt(9000);
    const second = await place();
    worldAt(9400);
    frame(400);
    const lumi = (Math.sin(9400 * 0.002) + 1) * 0.3 + 0.4;
    const lit = [first.card, second.card, first.light, second.light].map(o => o.color.r);
    expect(lit).toEqual(Array(4).fill(expect.closeTo(lumi)));
    first.light.dispose();
    second.light.dispose();
  });

  // Kanturu 3's Shiny02 cards turn `(int)(WorldTime / 2) % 360` degrees (GM_Kanturu_3rd.cpp:270): the world's clock, whole degrees.
  it('turn every spinning card from the world clock in whole degrees, so cards made apart stand at one angle', async () => {
    const { scene, step } = clockedScene();
    worldAt(1001);
    await createEffectLight(scene, { scale: 1, color: [1, 1, 1], texture: 'shiny1', spin: 0.5 }, at, 1);
    const first = lastSprite();
    worldAt(1001.9);
    step(16);
    expect(first.angle).toBeCloseTo((140 * Math.PI) / 180);
    worldAt(50000.3);
    await createEffectLight(scene, { scale: 1, color: [1, 1, 1], texture: 'shiny1', spin: 0.5 }, at, 1);
    const second = lastSprite();
    step(16);
    expect([first.angle, second.angle]).toEqual([160, 160].map(d => expect.closeTo((d * Math.PI) / 180)));
  });

  // Aida's torch turns `WorldTime / 10.0f` degrees (GMAida.cpp:310), a float: a tenth of a degree a millisecond, smoothly.
  it('turn a smoothSpin card counter-clockwise by its degrees a millisecond of world time', async () => {
    const { scene, step } = clockedScene();
    worldAt(0);
    await createEffectLight(scene, { scale: 3, color: [1, 1, 1], texture: 'flare', spin: 0.1, smoothSpin: true }, at, 1);
    const card = lastSprite();
    worldAt(1234.5);
    step(16);
    expect(card.angle).toBeCloseTo((123.45 * Math.PI) / 180);
    worldAt(3600 + 1800);
    step(16);
    expect(card.angle).toBeCloseTo(Math.PI);
  });

  // Land of Trials 49's grey card is `CreateSprite(..., NULL, rand() % 360)` every frame (GMHuntingGround.cpp:154).
  it('turn a randomAngle card to a fresh whole degree every frame', async () => {
    const { scene, step } = clockedScene();
    await createEffectLight(scene, { scale: 1.2, color: [0.3, 0.3, 0.3], texture: 'shiny1', randomAngle: true }, at, 1);
    const card = lastSprite();
    const roll = vi.spyOn(Math, 'random').mockReturnValueOnce(0.25).mockReturnValueOnce(0.9999);
    step(16);
    expect(card.angle).toBeCloseTo(Math.PI / 2);
    step(16);
    expect(card.angle).toBeCloseTo((359 * Math.PI) / 180);
    roll.mockRestore();
  });

  // A sprite is `Width * Scale` by `Height * Scale` (zzzeffectsprite.cpp:72-77): Shiny02.jpg is 32 by 64.
  it('draw BITMAP_SHINY + 1 from Shiny02.jpg twice as tall as wide, growing and resizing both ways (ZzzOpenData.cpp:5275)', async () => {
    const { scene, step } = clockedScene();
    const grow = { speed: 0.002, amount: 0.5, base: 0.5 };
    await createEffectLight(scene, { scale: 2, color: [1, 1, 1], texture: 'shiny1', grow }, at, 1);
    const card = lastSprite();
    expect(drawnFrom[drawnFrom.length - 1]).toBe('Effect/Shiny02.OZJ');
    expect([card.width, card.height]).toEqual([0.64, 1.28].map(v => expect.closeTo(v)));
    worldAt(Math.PI / 2 / 0.002);
    step(16);
    expect([card.width, card.height]).toEqual([0.96, 1.92].map(v => expect.closeTo(v)));
    const flare = await createMovableFlare(scene, 1, [1, 1, 1], 'shiny1');
    flare?.setScale(0.5);
    expect([lastSprite().width, lastSprite().height]).toEqual([0.16, 0.32].map(v => expect.closeTo(v)));
  });

  it.skipIf(!existsSync('Data/Effect'))('cut each sheet at the width and height of its file', async () => {
    const scene = {} as Scene;
    const textures = ['light', 'flare', 'spark1', 'shiny1', 'shiny5', 'impact', 'magic1', 'lightning1', 'kanturu2ndEffect1'] as const;
    for (const texture of textures) {
      await createEffectLight(scene, { scale: 1, color: [1, 1, 1], texture }, at, 1);
    }
    for (const [sheet, cell] of cells) {
      expect(cell, sheet).toEqual(jpegSize(new Uint8Array(readFileSync(`Data/${sheet}`).subarray(24))));
    }
  });
});
