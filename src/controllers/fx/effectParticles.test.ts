import { afterEach, describe, expect, it, vi } from 'vitest';

type FakeSprite = {
  position: { x: number; y: number; z: number };
  width: number;
  angle: number;
  isVisible: boolean;
  color: { r: number; g: number; b: number };
};

const fakes = vi.hoisted(() => ({ sprites: [] as FakeSprite[], files: [] as string[], colors: 0 }));

// Babylon's sprites, the data folder and the effects layer are stubbed: the
// real ones need a GPU scene, and `maps` / `controllers/fx/core` reach the store.
vi.mock('../render/babylon/exports', () => {
  class Color4 {
    constructor(
      public r = 0,
      public g = 0,
      public b = 0,
      public a = 1
    ) {
      fakes.colors++;
    }

    set(r: number, g: number, b: number, a: number) {
      this.r = r;
      this.g = g;
      this.b = b;
      this.a = a;
      return this;
    }

    copyFrom(c: Color4) {
      return this.set(c.r, c.g, c.b, c.a);
    }
  }

  class Sprite {
    position = {
      x: 0,
      y: 0,
      z: 0,
      set(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
      },
    };
    width = 0;
    height = 0;
    angle = 0;
    cellIndex = 0;
    isVisible = true;
    isPickable = true;
    color = new Color4();

    constructor(_name: string, manager: { sprites: unknown[] }) {
      manager.sprites.push(this);
      fakes.sprites.push(this);
    }

    dispose() {}
  }

  class SpriteManager {
    sprites: unknown[] = [];
    blendMode = 0;
    disableDepthWrite = false;
    isPickable = true;
    renderingGroupId = 0;

    dispose() {}
  }

  return { Color4, Constants: { ALPHA_ONEONE: 1, ALPHA_SUBTRACT: 3 }, Sprite, SpriteManager };
});
vi.mock('../assets/mu/dataFolder', () => ({
  hasDataFile: () => true,
  downloadDataFile: async (file: string) => (fakes.files.push(file), new Uint8Array(32)),
}));
vi.mock('../maps', () => ({ maps: { emissionsFor: () => undefined } }));
vi.mock('./core', () => ({
  EFFECT_RENDERING_GROUP: 1,
  keepDepthForEffects: () => {},
  spriteLevel: (_scene: unknown, color: unknown) => color,
  darkCardGain: () => 1,
}));
vi.mock('../../core/devSeams', () => ({ devQuery: () => null, devQueryNumber: () => null }));
// The real helper, without the rest of the assets door (the model loader).
vi.mock('../assets', async () => ({ reportLoadFailure: (await import('../assets/loadFailure')).reportLoadFailure }));

import {
  BonedParticleEmitter,
  KIND_REACH,
  ParticleEmitter,
  disposeEffectParticles,
  spawnParticle,
  type KindName,
} from './effectParticles';
import { publishViewPlanes, type ViewPlane } from '../render/viewPlanes';
import type { Scene } from '../render/babylon/exports';

let deltaMs = 40;
let tick: (() => void) | null = null;

const scene = {
  onBeforeRenderObservable: {
    add: (callback: () => void) => {
      tick = callback;
      return callback;
    },
    remove: () => {},
  },
  getEngine: () => ({ getDeltaTime: () => deltaMs }),
} as unknown as Scene;

/** Inward-facing planes of the box |x|, |y|, |z| <= half. */
function box(half: number): ViewPlane[] {
  return [
    { normal: { x: 1, y: 0, z: 0 }, d: half },
    { normal: { x: -1, y: 0, z: 0 }, d: half },
    { normal: { x: 0, y: 1, z: 0 }, d: half },
    { normal: { x: 0, y: -1, z: 0 }, d: half },
    { normal: { x: 0, y: 0, z: 1 }, d: half },
    { normal: { x: 0, y: 0, z: -1 }, d: half },
  ];
}

function reach(kind: KindName, scale: number, jitter = 0): number {
  const r = KIND_REACH[kind];

  return r.travel + r.base + r.perScale * scale + (Math.sqrt(3) * jitter) / 100;
}

/** Deterministic Math.random stand-in (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

afterEach(() => {
  publishViewPlanes(scene, null);
  disposeEffectParticles();
  fakes.sprites.length = 0;
  fakes.files.length = 0;
  tick = null;
  deltaMs = 40;
});

describe('KIND_REACH', () => {
  /** Farthest the particle's sprite gets from its spawn point over its life. */
  async function farthest(kind: KindName, scale: number, random: () => number) {
    // Swapped by hand: a spy records every call, which is most of the run.
    const original = Math.random;
    Math.random = random;

    try {
      await spawnParticle(scene, kind, { x: 0, y: 0, z: 0 }, 1.3, scale, [1, 1, 1]);

      const sprite = fakes.sprites.find(s => s.isVisible)!;
      let far = 0;

      for (let n = 0; n < 5000; n++) {
        tick!();

        if (!sprite.isVisible) break;

        const { x, y, z } = sprite.position;
        const halfDiagonal = Math.abs(sprite.width) * Math.SQRT1_2;

        far = Math.max(far, Math.hypot(x, y, z) + halfDiagonal);
      }

      return far;
    } finally {
      Math.random = original;
    }
  }

  it('covers every kind at any frame rate, scale and roll', async () => {
    const randoms: (() => () => number)[] = [
      () => () => 0,
      () => () => 0.999999,
      ...Array.from({ length: 16 }, (_, seed) => () => seeded(seed + 1)),
    ];

    for (const kind of Object.keys(KIND_REACH) as KindName[]) {
      for (const frameMs of [40, 16.7, 6.9]) {
        deltaMs = frameMs;

        for (const scale of [0.1, 1, 2.5]) {
          for (const random of randoms) {
            const far = await farthest(kind, scale, random());

            expect(far, `${kind} @${frameMs}ms x${scale}`).toBeLessThanOrEqual(
              reach(kind, scale)
            );
          }
        }
      }
    }
  });
});

/** Spawns one `kind` at the origin with every roll at `roll`, then plays `ticks` 25 Hz ticks. */
async function play(kind: KindName, scale: number, roll: number, ticks: number): Promise<FakeSprite> {
  const original = Math.random;
  Math.random = () => roll;

  try {
    await spawnParticle(scene, kind, { x: 0, y: 0, z: 0 }, 0, scale, [0.2, 0.4, 0.6]);
    const sprite = fakes.sprites[fakes.sprites.length - 1];
    for (let n = 0; n < ticks; n++) tick?.();
    return sprite;
  } finally {
    Math.random = original;
  }
}

describe('light0, BITMAP_LIGHT SubType 0 (ZzzEffectParticle.cpp:3161-3164, :7943-8010)', () => {
  // `rand() % 10 + 10` ticks, `(rand() % 50 + 50) / 100 * Scale`; a tick it rises `5 * 0.5`, loses 0.05 and is
  // `Light = Scale`, whatever light it was made with.
  it('rises 2.5 a tick, loses 0.05 of its scale a tick and is as bright as its scale', async () => {
    const sprite = await play('light0', 2, 0.5, 4);
    expect(sprite.position.x).toBeCloseTo(0);
    expect(sprite.position.y).toBeCloseTo(0.1);
    expect(sprite.position.z).toBeCloseTo(0);
    expect(sprite.width).toBeCloseTo((64 * (0.75 * 2 - 0.2)) / 100);
    expect([sprite.color.r, sprite.color.g, sprite.color.b].map(c => c.toFixed(3))).toEqual(['1.300', '1.300', '1.300']);
    expect(sprite.angle).toBe(0);
  });

  it('lives rand() % 10 + 10 ticks, and goes once its scale is down to 0.1', async () => {
    expect((await play('light0', 3, 0.5, 14)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('light0', 3, 0.5, 15)).isVisible).toBe(false);
    disposeEffectParticles();
    expect((await play('light0', 1, 0.5, 12)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('light0', 1, 0.5, 14)).isVisible).toBe(false);
  });

  // `(rand() % 2001 - 1000) * 0.0004` plus `g_vParticleWind`, halved; the wind walks by up to 0.6 a tick, its
  // pace held within 0.6 and itself within 1.7 (ZzzEffectParticle.cpp:3847-3859).
  it('drifts up to 0.2 a tick in x and y, plus half the wind', async () => {
    const sprite = await play('light0', 1, 0, 3);
    const drift = -(0.4 + 0.6) / 2 - (0.4 + 1.2) / 2 - (0.4 + 1.7) / 2;
    expect(sprite.position.x).toBeCloseTo(drift / 100);
    expect(sprite.position.z).toBeCloseTo(drift / 100);
    expect(sprite.position.y).toBeCloseTo(0.075);
  });
});

describe('trueFire, BITMAP_TRUE_FIRE SubType 0 and 5 (ZzzEffectParticle.cpp:3337-3378, :8273-8337)', () => {
  // `Velocity = ((rand() % 10 - 5) * 0.4, 0, (rand() % 10 + 5) * 0.2)` along the object, the sideways part fading
  // by 0.95 a tick; a tick it also rises 1, loses 0.02 of its scale and is `LifeTime / 25` bright, white.
  it('is pushed sideways and up at its birth, rises 1 a tick more, shrinks 0.02 a tick and fades with its life', async () => {
    const sprite = await play('trueFire', 1.5, 0, 2);
    expect(sprite.position.x).toBeCloseTo(-(2 + 2 * 0.95) / 100);
    expect(sprite.position.y).toBeCloseTo((2 * (1 + 1)) / 100);
    expect(sprite.position.z).toBeCloseTo(0);
    expect(sprite.width).toBeCloseTo((64 * (1.5 - 0.04)) / 100);
    expect([sprite.color.r, sprite.color.g, sprite.color.b].map(c => c.toFixed(3))).toEqual(['0.880', '0.880', '0.880']);
    expect(sprite.angle).toBe(0);
  });

  it('is pushed at most 1.6 the other way and 2.8 up', async () => {
    const sprite = await play('trueFire', 1, 0.999999, 1);
    expect(sprite.position.x).toBeCloseTo(0.016);
    expect(sprite.position.y).toBeCloseTo(0.038);
  });

  // BITMAP_TRUE_BLUE shares every line with BITMAP_TRUE_FIRE but its sheet, fantaB.jpg (ZzzOpenData.cpp:5197-5198).
  it('draws fantaF.jpg, and trueBlue, BITMAP_TRUE_BLUE, is the same particle on fantaB.jpg', async () => {
    const fire = await play('trueFire', 1.5, 0, 2);
    const look = (s: FakeSprite) => [s.position.x, s.position.y, s.position.z, s.width, s.color.r, s.color.g, s.color.b];
    const fireLook = look(fire);
    const blue = await play('trueBlue', 1.5, 0, 2);
    expect(look(blue)).toEqual(fireLook);
    expect(fakes.files).toEqual(['Effect/fantaF.OZJ', 'Effect/fantaB.OZJ']);
  });

  it('lives 24 ticks, SubType 5 20', async () => {
    expect((await play('trueFire', 1, 0.5, 23)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('trueFire', 1, 0.5, 24)).isVisible).toBe(false);
    disposeEffectParticles();
    expect((await play('trueFire5', 1, 0.5, 19)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('trueFire5', 1, 0.5, 20)).isVisible).toBe(false);
  });
});

describe('smoke13, BITMAP_SMOKE SubType 13 (ZzzEffectParticle.cpp:1238-1243, :5389-5393, :9085-9097)', () => {
  // `Scale = (rand() % 64 + 64) * 0.01f` whatever it is made with, `Rotation = rand() % 360`; a tick it grows 0.09
  // and is `(L, 0.5L, 0.1L)`, `L = LifeTime / 20`; it does not move, and draws additive.
  it('sits where it is made, grows 0.09 a tick and fades orange with its life', async () => {
    const sprite = await play('smoke13', 3, 0.5, 4);
    expect([sprite.position.x, sprite.position.y, sprite.position.z]).toEqual([0, 0, 0]);
    expect(sprite.width).toBeCloseTo((64 * (0.96 + 4 * 0.09)) / 100);
    expect([sprite.color.r, sprite.color.g, sprite.color.b].map(c => c.toFixed(3))).toEqual(['0.800', '0.400', '0.080']);
    expect(sprite.angle).toBeCloseTo(Math.PI);
  });

  it('lives 20 ticks', async () => {
    expect((await play('smoke13', 1, 0.5, 19)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('smoke13', 1, 0.5, 20)).isVisible).toBe(false);
  });
});

describe('the particle tick', () => {
  it('makes no colour: one is reused frame after frame', async () => {
    await play('trueFire', 1, 0.5, 1);
    await play('smoke13', 1, 0.5, 1);
    const made = fakes.colors;
    for (let n = 0; n < 10; n++) tick?.();
    expect(fakes.colors).toBe(made);
  });
});

describe('ParticleEmitter view gate', () => {
  function counter() {
    const count = { n: 0 };
    const light = () => {
      count.n++;
      return [1, 1, 1] as const;
    };

    return { count, light };
  }

  it('spawns everywhere without planes', () => {
    const { count, light } = counter();
    const emitter = new ParticleEmitter(
      scene,
      [{ kinds: ['fire1'], every: 1, light }],
      { x: 1000, y: 0, z: 0 },
      0,
      1
    );

    for (let i = 0; i < 3; i++) emitter.update();

    expect(count.n).toBe(3);
  });

  it('stops only once no sprite of it could reach the widened frustum', () => {
    publishViewPlanes(scene, box(10));

    const jitter = 30;
    const scale = 2;
    const edge = 10 + reach('cloud21', scale, jitter);

    const { count, light } = counter();
    const position = { x: edge - 0.01, y: 0, z: 0 };

    const emitter = new ParticleEmitter(
      scene,
      [{ kinds: ['cloud21'], every: 1, light, jitter }],
      position,
      0,
      scale
    );

    emitter.update();
    expect(count.n).toBe(1);

    position.x = edge + 0.01;
    emitter.update();
    expect(count.n).toBe(1);
  });

  it('gates each emission on its own reach', () => {
    publishViewPlanes(scene, box(10));

    const smoke = counter();
    const cloud = counter();

    // Past the smoke's reach, inside the cloud's.
    const emitter = new ParticleEmitter(
      scene,
      [
        { kinds: ['smoke65'], every: 1, light: smoke.light },
        { kinds: ['cloud21'], every: 1, light: cloud.light },
      ],
      { x: 10 + reach('smoke65', 1) + 0.5, y: 0, z: 0 },
      0,
      1
    );

    emitter.update();

    expect(smoke.count.n).toBe(0);
    expect(cloud.count.n).toBe(1);
  });

  it('drops the backlog out of view, so it does not burst on the way back', () => {
    publishViewPlanes(scene, box(10));

    const { count, light } = counter();
    const position = { x: 100, y: 0, z: 0 };

    const emitter = new ParticleEmitter(
      scene,
      [{ kinds: ['fire1'], every: 1, light }],
      position,
      0,
      1
    );

    deltaMs = 30;
    emitter.update();
    for (let i = 0; i < 10; i++) emitter.update();
    expect(count.n).toBe(0);

    position.x = 0;
    emitter.update();
    expect(count.n).toBe(0);
    emitter.update();
    expect(count.n).toBe(1);
  });

  it('is not gated by planes published for another scene', () => {
    publishViewPlanes({}, box(10));

    const { count, light } = counter();
    const emitter = new ParticleEmitter(
      scene,
      [{ kinds: ['fire1'], every: 1, light }],
      { x: 1000, y: 0, z: 0 },
      0,
      1
    );

    emitter.update();

    expect(count.n).toBe(1);
  });
});

describe('BonedParticleEmitter view gate', () => {
  it('gates each point at its own bone', () => {
    publishViewPlanes(scene, box(10));

    const counts = { in: 0, out: 0 };
    const inside = { x: 0, y: 0, z: 0 };
    const outside = { x: 100, y: 0, z: 0 };

    const emitter = new BonedParticleEmitter(scene, [
      {
        node: { getAbsolutePosition: () => inside },
        kinds: ['fire157'],
        count: 2,
        scale: 1,
        light: () => {
          counts.in++;
          return [1, 1, 1];
        },
      },
      {
        node: { getAbsolutePosition: () => outside },
        kinds: ['fire157'],
        count: 2,
        scale: () => 1,
        light: () => {
          counts.out++;
          return [1, 1, 1];
        },
      },
    ]);

    for (let i = 0; i < 5; i++) emitter.update();

    expect(counts).toEqual({ in: 5, out: 0 });

    outside.x = 0;
    emitter.update();

    expect(counts).toEqual({ in: 6, out: 1 });
  });

  it('tests the spawn position, offset included', () => {
    publishViewPlanes(scene, box(10));

    let spawned = 0;
    const edge = 10 + reach('fire1', 1);

    const emitter = new BonedParticleEmitter(scene, [
      {
        node: { getAbsolutePosition: () => ({ x: 0, y: edge - 0.5, z: 0 }) },
        kinds: ['fire1'],
        count: 1,
        scale: 1,
        offsetY: 1,
        light: () => {
          spawned++;
          return [1, 1, 1];
        },
      },
    ]);

    emitter.update();

    expect(spawned).toBe(0);
  });
});
