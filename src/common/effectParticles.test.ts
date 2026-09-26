import { afterEach, describe, expect, it, vi } from 'vitest';

type FakeSprite = {
  position: { x: number; y: number; z: number };
  width: number;
  isVisible: boolean;
};

const fakes = vi.hoisted(() => ({ sprites: [] as FakeSprite[] }));

// Babylon's sprites, the data folder and the effects layer are stubbed: the
// real ones need a GPU scene, and `maps` / `effects/core` reach the store.
vi.mock('../libs/babylon/exports', () => {
  class Color4 {
    constructor(
      public r = 0,
      public g = 0,
      public b = 0,
      public a = 1
    ) {}

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
vi.mock('../libs/mu/dataFolder', () => ({
  hasDataFile: () => true,
  downloadDataFile: async () => new Uint8Array(32),
}));
vi.mock('../maps', () => ({ maps: { emissionsFor: () => undefined } }));
vi.mock('../effects/core', () => ({
  EFFECT_RENDERING_GROUP: 1,
  keepDepthForEffects: () => {},
  spriteLevel: (_scene: unknown, color: unknown) => color,
}));
vi.mock('./devSeams', () => ({ devQuery: () => null, devQueryNumber: () => null }));

import {
  BonedParticleEmitter,
  KIND_REACH,
  ParticleEmitter,
  disposeEffectParticles,
  spawnParticle,
  type KindName,
} from './effectParticles';
import { publishViewPlanes, type ViewPlane } from './viewPlanes';
import type { Scene } from '../libs/babylon/exports';

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
