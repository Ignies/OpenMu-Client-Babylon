import { afterEach, describe, expect, it, vi } from 'vitest';

type FakeSprite = {
  position: { x: number; y: number; z: number };
  width: number;
  angle: number;
  isVisible: boolean;
  color: { r: number; g: number; b: number; a: number };
  manager: { url: string; blendMode: number };
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

    constructor(
      _name: string,
      public manager: { sprites: unknown[]; url: string; blendMode: number }
    ) {
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

    constructor(
      _name: string,
      public url: string
    ) {}

    dispose() {}
  }

  return { Color4, Constants: { ALPHA_ONEONE: 1, ALPHA_COMBINE: 2, ALPHA_SUBTRACT: 3 }, Sprite, SpriteManager };
});
vi.mock('../assets/mu/dataFolder', () => ({
  hasDataFile: () => true,
  downloadDataFile: async (file: string) => (fakes.files.push(file), new Uint8Array(32)),
}));
// An OZT sheet is decoded by the sprite loader, which needs a canvas.
vi.mock('../assets/mu/sprites', async importOriginal => ({
  ...(await importOriginal<object>()),
  loadMuSprite: async (file: string) => (fakes.files.push(file), { url: `sprite:${file}`, width: 256, height: 256 }),
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
  HeldSprites,
  KIND_REACH,
  NO_TURN,
  ParticleEmitter,
  disposeEffectParticles,
  spawnParticle,
  type KindName,
  type NodeTurn,
} from './effectParticles';
import { publishViewPlanes, type ViewPlane } from '../render/viewPlanes';
import { toRenderAngles } from '../render/renderAngles';
import type { Scene, Vector3 } from '../render/babylon/exports';

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

/** The turn a placed object's node carries for MU `Angle` in degrees: loadMapIntoScene.ts:109-113, then renderAngles.ts. */
const nodeTurn = (a0: number, a1: number, a2: number) => {
  const rad = Math.PI / 180;
  return toRenderAngles({ x: -a0 * rad, y: a2 * rad, z: -a1 * rad }, { x: 0, y: 0, z: 0 } as Vector3);
};

afterEach(() => {
  publishViewPlanes(scene, null);
  disposeEffectParticles();
  fakes.sprites.length = 0;
  fakes.files.length = 0;
  tick = null;
  deltaMs = 40;
});

describe('a hidden page', () => {
  // The sprites only tick on a drawn frame: made while hidden, they would all play at once on return.
  it('spawns no particle', async () => {
    vi.stubGlobal('document', { hidden: true });
    try {
      await spawnParticle(scene, 'fire1', { x: 0, y: 0, z: 0 }, NO_TURN, 1, [1, 1, 1]);
    } finally {
      vi.unstubAllGlobals();
    }
    expect(fakes.sprites).toHaveLength(0);
  });
});

describe('spawnParticle', () => {
  // The map callers hand every spawn one scratch position, turn and light, rewritten for the next spawn.
  it('reads its position, turn and light before it returns, while its sheet loads and once it has', async () => {
    const original = Math.random;
    // `spark03_24` pushes (2, 2, 2) a tick at this roll and draws in the light it is made with.
    Math.random = () => 0.9;
    try {
      const at = { x: 1, y: 2, z: 3 };
      const turn = { x: 0, y: 0, z: 0 };
      const light: [number, number, number] = [0.2, 0.4, 0.6];
      const spawnThenRewrite = (x: number, yaw: number, red: number) => {
        const made = spawnParticle(scene, 'spark03_24', at, turn, 1, light);
        at.x = x;
        turn.y = yaw;
        light[0] = red;
        return made;
      };
      // The first two wait for the sheet, the last two find it loaded.
      await Promise.all([spawnThenRewrite(5, Math.PI, 0.8), spawnThenRewrite(9, 0, 0)]);
      spawnThenRewrite(1, Math.PI, 0.2);
      spawnThenRewrite(0, 0, 1);
      tick?.();
      const drawn = fakes.sprites.map(s => [s.position.x, s.position.y, s.position.z, s.color.r]);
      expect(drawn).toEqual(
        [
          [1.02, 2.02, 3.02, 0.2],
          [4.98, 2.02, 2.98, 0.8],
          [9.02, 2.02, 3.02, 0],
          [0.98, 2.02, 2.98, 0.2],
        ].map(row => row.map(v => expect.closeTo(v)))
      );
    } finally {
      Math.random = original;
    }
  });
});

describe('KIND_REACH', () => {
  /** Farthest the particle's sprite gets from its spawn point over its life. */
  async function farthest(kind: KindName, scale: number, random: () => number, turn: NodeTurn) {
    // Swapped by hand: a spy records every call, which is most of the run.
    const original = Math.random;
    Math.random = random;

    try {
      await spawnParticle(scene, kind, { x: 0, y: 0, z: 0 }, turn, scale, [1, 1, 1]);

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

  it('covers every kind at any frame rate, scale, roll and turn of its object', async () => {
    const randoms: (() => () => number)[] = [
      () => () => 0,
      () => () => 0.999999,
      ...Array.from({ length: 16 }, (_, seed) => () => seeded(seed + 1)),
    ];
    const turns = [nodeTurn(0, 0, 0), nodeTurn(0, 0, 74), nodeTurn(-30, 0, 29), nodeTurn(40, -60, 200)];

    for (const kind of Object.keys(KIND_REACH) as KindName[]) {
      for (const frameMs of [40, 16.7, 6.9]) {
        deltaMs = frameMs;

        for (const scale of [0.1, 1, 2.5]) {
          for (const random of randoms) {
            for (const turn of turns) {
              const far = await farthest(kind, scale, random(), turn);

              expect(far, `${kind} @${frameMs}ms x${scale}`).toBeLessThanOrEqual(
                reach(kind, scale)
              );
            }
          }
        }
      }
    }
  });
});

/** Spawns one `kind` at the origin with every roll at `roll` on a node turned `turn`, then plays `ticks` 25 Hz ticks. */
async function play(kind: KindName, scale: number, roll: number, ticks: number, turn: NodeTurn = NO_TURN): Promise<FakeSprite> {
  const original = Math.random;
  Math.random = () => roll;

  try {
    await spawnParticle(scene, kind, { x: 0, y: 0, z: 0 }, turn, scale, [0.2, 0.4, 0.6]);
    const sprite = fakes.sprites[fakes.sprites.length - 1];
    for (let n = 0; n < ticks; n++) tick?.();
    return sprite;
  } finally {
    Math.random = original;
  }
}

describe('light0, BITMAP_LIGHT SubType 0 (ZzzEffectParticle.cpp:3161-3164, :7943-8010)', () => {
  // `rand() % 10 + 10` ticks, `(rand() % 50 + 50) / 100 * Scale`; a tick it rises `5 * 0.5`, loses 0.05 and is
  // `Light = Scale`, whatever light it was made with, held at 1 as RenderSprite packs it (RenderUtils.h:8-18).
  it('rises 2.5 a tick, loses 0.05 of its scale a tick and is as bright as its scale, up to 1', async () => {
    const sprite = await play('light0', 2, 0.5, 4);
    expect(sprite.position.x).toBeCloseTo(0);
    expect(sprite.position.y).toBeCloseTo(0.1);
    expect(sprite.position.z).toBeCloseTo(0);
    expect(sprite.width).toBeCloseTo((64 * (0.75 * 2 - 0.2)) / 100);
    expect([sprite.color.r, sprite.color.g, sprite.color.b].map(c => c.toFixed(3))).toEqual(['1.000', '1.000', '1.000']);
    expect(sprite.angle).toBe(0);
    disposeEffectParticles();
    const small = await play('light0', 1, 0.5, 4);
    expect([small.color.r, small.color.g, small.color.b].map(c => c.toFixed(3))).toEqual(['0.550', '0.550', '0.550']);
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

describe('light15, BITMAP_LIGHT SubType 15 (ZzzEffectParticle.cpp:3241-3250, :8139-8160)', () => {
  // `rand() % 10 + 100` ticks, `Gravity = rand() % 3 + 2`, `(rand() % 20 + 20) / 100 * Scale`, `Alpha = 0`; a tick its
  // phase gains `(rand() % 10 + 5) * 0.01`, it stands `Gravity * 2` off where it was made at that phase and rises
  // `Gravity`, loses 0.001 of its scale and gains 0.1 of alpha; its light is the one it was made with times alpha.
  it('climbs a spiral, shrinks 0.001 a tick and fades in 0.1 a tick', async () => {
    const sprite = await play('light15', 1.52, 0.5, 2);
    expect(sprite.position.x).toBeCloseTo((Math.sin(0.2) * 6) / 100);
    expect(sprite.position.z).toBeCloseTo((Math.cos(0.2) * 6) / 100);
    expect(sprite.position.y).toBeCloseTo(0.06);
    expect(sprite.width).toBeCloseTo((64 * 0.454) / 100);
    expect(sprite.angle).toBe(0);
    expect(rgba(sprite)).toEqual(['0.040', '0.080', '0.120', '1.000']);
    expect(fakes.files).toEqual(['Effect/flare01.OZJ']);
    disposeEffectParticles();
    expect(rgba(await play('light15', 1.52, 0.5, 20))).toEqual(['0.200', '0.400', '0.600', '1.000']);
  });

  // In its last 20 ticks it loses 0.01 more of its scale and 0.1 of alpha a tick.
  it('fades out over its last 20 ticks and lives rand() % 10 + 100', async () => {
    expect(rgba(await play('light15', 1.52, 0.5, 84))[0]).toBe('0.200');
    disposeEffectParticles();
    expect(rgba(await play('light15', 1.52, 0.5, 85))[0]).toBe('0.180');
    disposeEffectParticles();
    expect((await play('light15', 1.52, 0.5, 104)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('light15', 1.52, 0.5, 105)).isVisible).toBe(false);
  });

  // Each of its makers, the Doppelganger light boxes, makes it `rand() % (int)(Scale * 60) - that / 2` off in x and y
  // (GMDoppelGanger4.cpp:387-398).
  it('is made up to 30 times its scale off in x and y', async () => {
    const sprite = await play('light15', 1.52, 0, 1);
    expect(sprite.position.x).toBeCloseTo((-45 + Math.sin(0.05) * 4) / 100);
    expect(sprite.position.z).toBeCloseTo((-45 + Math.cos(0.05) * 4) / 100);
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

const rgba = (s: FakeSprite) => [s.color.r, s.color.g, s.color.b, s.color.a].map(c => c.toFixed(3));

describe('the push, turned with the object (MovePosition, ZzzAI.cpp:148-156, ZzzEffectParticle.cpp:3885)', () => {
  // `VectorRotate(Speed, AngleMatrix(Angle))` (ZzzMathLib.cpp:185-212, :261-267).
  const movePosition = ([a0, a1, a2]: readonly number[], [x, y, z]: readonly number[]) => {
    const rad = Math.PI / 180;
    const [sr, cr, sp, cp] = [Math.sin(a0 * rad), Math.cos(a0 * rad), Math.sin(a1 * rad), Math.cos(a1 * rad)];
    const [sy, cy] = [Math.sin(a2 * rad), Math.cos(a2 * rad)];
    const matrix = [
      [cp * cy, sr * sp * cy + cr * -sy, cr * sp * cy + -sr * -sy],
      [cp * sy, sr * sp * sy + cr * cy, cr * sp * sy + -sr * cy],
      [-sp, sr * cp, cr * cp],
    ];
    return matrix.map(row => row[0] * x + row[1] * y + row[2] * z);
  };

  // trueFire at roll 0 is pushed `(-2, 0, 1)` along the object; a tick moves it once by that, turned, and it rises 1.
  it("goes where MovePosition turns its velocity, by the object's yaw, pitch and roll", async () => {
    const angles = [[0, 0, 0], [0, 0, 90], [0, 0, 30], [0, 0, 200], [0, 60, 0], [-30, 0, 29], [20, -35, 110]];
    for (const angle of angles) {
      const sprite = await play('trueFire', 1, 0, 1, nodeTurn(angle[0], angle[1], angle[2]));
      const [x, y, z] = movePosition(angle, [-2, 0, 1]);
      const at = [sprite.position.x, sprite.position.z, sprite.position.y];
      expect(at, `Angle ${angle}`).toEqual([x / 100, y / 100, (z + 1) / 100].map(v => expect.closeTo(v, 5)));
      disposeEffectParticles();
    }
  });

  it('is turned the same way by an emitter handed the node turn', async () => {
    const emitter = new ParticleEmitter(scene, [{ kinds: ['trueFire'], every: 1 }], { x: 0, y: 0, z: 0 }, nodeTurn(0, 0, 90), 1);
    const original = Math.random;
    Math.random = () => 0;
    try {
      emitter.update();
      await new Promise(resolve => setTimeout(resolve, 0));
    } finally {
      Math.random = original;
    }
    tick?.();
    const sprite = fakes.sprites[fakes.sprites.length - 1];
    expect([sprite.position.x, sprite.position.z]).toEqual([expect.closeTo(0, 5), expect.closeTo(-0.02, 5)]);
  });
});

describe('fi01_0 and fi01_1, BITMAP_ADV_SMOKE SubType 0 and 1 (ZzzEffectParticle.cpp:3292-3323, :8219-8248)', () => {
  // `MovePosition(Position, Angle, Velocity)` for every particle (:3885), then `VectorAddScaled(Position, Velocity)`
  // again in its own case (:8220).
  it('moves by its velocity twice a tick: turned with the object, then as it is', async () => {
    const sprite = await play('fi01_0', 3, 0.5, 1, nodeTurn(0, 0, 90));
    expect(sprite.position.x).toBeCloseTo(0.04);
    expect(sprite.position.z).toBeCloseTo(0.04);
    expect(sprite.position.y).toBeCloseTo(0.04);
  });

  // SubType 0: `Scale = 0.5 + (rand() % 10) * 0.02`, `Velocity = ((r + 5) * 0.4, (r - 5) * 0.4, (r + 5) * 0.2)`; a tick
  // x and y lose 5%, z gains 0.3, it grows 0.07 and is `LifeTime / 10` bright, white, held at 1 by the vertex colour.
  it('SubType 0 rises faster each tick, slows sideways, grows 0.07 a tick and is LifeTime / 10 bright', async () => {
    const sprite = await play('fi01_0', 3, 0.5, 2);
    expect(sprite.position.x).toBeCloseTo(0.156);
    expect(sprite.position.y).toBeCloseTo(0.086);
    expect(sprite.position.z).toBeCloseTo(0);
    expect(sprite.width).toBeCloseTo((128 * 0.74) / 100);
    expect(sprite.angle).toBe(0);
    expect(rgba(sprite)).toEqual(['1.000', '1.000', '1.000', '1.000']);
    disposeEffectParticles();
    expect(rgba(await play('fi01_0', 1, 0.5, 14))).toEqual(['0.800', '0.800', '0.800', '1.000']);
    expect(sprite.manager.blendMode).toBe(1);
    expect(fakes.files).toEqual(['Effect/fi01.OZJ', 'Effect/fi01.OZJ']);
  });

  // SubType 1, the `else`: `Scale = 1 + r * 0.1`, `Velocity = ((r + 5) * 0.2, (r - 5) * 0.2, (r + 5) * 0.1)`, growing 0.09.
  it('SubType 1 starts bigger and slower and grows 0.09 a tick', async () => {
    const sprite = await play('fi01_1', 3, 0.5, 2);
    expect(sprite.position.x).toBeCloseTo(0.078);
    expect(sprite.position.y).toBeCloseTo(0.046);
    expect(sprite.width).toBeCloseTo((128 * 1.68) / 100);
    expect(rgba(sprite)).toEqual(['1.000', '1.000', '1.000', '1.000']);
  });

  it('lives 20 + rand() % 5 ticks', async () => {
    expect((await play('fi01_0', 1, 0, 19)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('fi01_0', 1, 0, 20)).isVisible).toBe(false);
    disposeEffectParticles();
    expect((await play('fi01_1', 1, 0.999999, 23)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('fi01_1', 1, 0.999999, 24)).isVisible).toBe(false);
  });
});

describe('fi02_0, BITMAP_ADV_SMOKE + 1 SubType 0 (ZzzEffectParticle.cpp:3325-3378, :8249-8271, :9104-9116)', () => {
  // `Rotation = rand() % 360`, `Scale = 0.5`, then no `break`: BITMAP_TRUE_FIRE's SubType 0 sets `LifeTime = 24` and
  // `Velocity = ((r - 5) * 0.4, 0, (r + 5) * 0.2)`. A tick it moves twice, z gains 0.6, it wanders `rand() % 4 - 2`
  // (z * 0.8), grows 0.05, turns 1 or 2 degrees and is `LifeTime / 25`, drawn `EnableAlphaBlend3` on fi02.tga, whose
  // alpha RenderSprite also takes from the light (ZzzOpenglUtil.cpp:918-933).
  it('rises twice its velocity, grows 0.05 a tick and fades as LifeTime / 25 in colour and alpha', async () => {
    const sprite = await play('fi02_0', 3, 0.5, 2);
    expect([sprite.position.x, sprite.position.z]).toEqual([0, 0]);
    expect(sprite.position.y).toBeCloseTo(0.092);
    expect(sprite.width).toBeCloseTo((256 * 0.6) / 100);
    expect(sprite.angle).toBeCloseTo((184 * Math.PI) / 180);
    expect(rgba(sprite)).toEqual(['0.880', '0.880', '0.880', '0.880']);
    expect(sprite.manager.blendMode).toBe(2);
    expect(sprite.manager.url).toBe('sprite:Effect/fi02.OZT');
  });

  it('is pushed up to 2 the other way and wanders up to 2 a tick', async () => {
    const sprite = await play('fi02_0', 1, 0, 1);
    expect(sprite.position.x).toBeCloseTo(-0.06);
    expect(sprite.position.z).toBeCloseTo(-0.02);
    expect(sprite.position.y).toBeCloseTo(0.004);
    expect(sprite.angle).toBeCloseTo(Math.PI / 180);
  });

  it('lives 24 ticks', async () => {
    expect((await play('fi02_0', 1, 0.5, 23)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('fi02_0', 1, 0.5, 24)).isVisible).toBe(false);
  });
});

describe('cloud6, BITMAP_CLOUD SubType 6 (ZzzEffectParticle.cpp:2815-2824, :7550-7565)', () => {
  // `LifeTime = 25 + rand() % 5`, `Rotation = rand() % 360`, `Scale = 0.2`, `Velocity = ((r + 5) * 0.4, 0, (r + 5) * 0.2)`;
  // a tick it moves twice, wanders, grows 0.05, turns and is `LifeTime / 50`, white, additive on clouds.jpg.
  it('moves like fi02_0 at a fifth of the size and is LifeTime / 50 bright', async () => {
    const sprite = await play('cloud6', 3, 0.5, 2);
    expect(sprite.position.x).toBeCloseTo(0.156);
    expect(sprite.position.y).toBeCloseTo(0.092);
    expect(sprite.position.z).toBeCloseTo(0);
    expect(sprite.width).toBeCloseTo((256 * 0.3) / 100);
    expect(sprite.angle).toBeCloseTo((184 * Math.PI) / 180);
    expect(rgba(sprite)).toEqual(['0.500', '0.500', '0.500', '1.000']);
    expect(sprite.manager.blendMode).toBe(1);
    expect(fakes.files).toEqual(['Effect/clouds.OZJ']);
  });

  it('lives 25 + rand() % 5 ticks', async () => {
    expect((await play('cloud6', 1, 0, 24)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('cloud6', 1, 0, 25)).isVisible).toBe(false);
    disposeEffectParticles();
    expect((await play('cloud6', 1, 0.999999, 28)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('cloud6', 1, 0.999999, 29)).isVisible).toBe(false);
  });
});

describe('the Balgass volcano kinds (GM3rdChangeUp.cpp:187-251)', () => {
  const at = (s: FakeSprite) => [s.position.x, s.position.y, s.position.z, s.angle];

  // ADV_SMOKE SubType 2: SubType 0's push and tick, `Scale * 0.5 + (rand() % 10) * 0.02` big (:3302-3308, :8231-8235).
  it('fi01_2, BITMAP_ADV_SMOKE SubType 2, is SubType 0 at half the scale it is made with', async () => {
    const zero = at(await play('fi01_0', 3, 0.5, 2));
    const sprite = await play('fi01_2', 3, 0.5, 2);
    expect(at(sprite)).toEqual(zero);
    expect(sprite.width).toBeCloseTo((128 * 1.74) / 100);
    expect(rgba(sprite)).toEqual(['1.000', '1.000', '1.000', '1.000']);
  });

  // ADV_SMOKE + 1 SubType 1: `Scale = 0.5f * Scale`, the rest SubType 0's (:3325-3336).
  it('fi02_1, BITMAP_ADV_SMOKE + 1 SubType 1, is SubType 0 at half the scale it is made with', async () => {
    const zero = at(await play('fi02_0', 3, 0.5, 2));
    const sprite = await play('fi02_1', 3, 0.5, 2);
    expect(at(sprite)).toEqual(zero);
    expect(sprite.width).toBeCloseTo((256 * 1.6) / 100);
    expect(rgba(sprite)).toEqual(['0.880', '0.880', '0.880', '0.880']);
  });

  // CLOUD SubType 14: SubType 6's push and tick at `Scale * 0.2`, drawn `EnableAlphaBlendMinus` (:2908-2917,
  // :7646-7660, :9236-9245).
  it('cloud14, BITMAP_CLOUD SubType 14, is SubType 6 at a fifth of its scale, subtracted', async () => {
    const six = at(await play('cloud6', 3, 0.5, 2));
    const sprite = await play('cloud14', 3, 0.5, 2);
    expect(at(sprite)).toEqual(six);
    expect(sprite.width).toBeCloseTo((256 * 0.7) / 100);
    expect(rgba(sprite)).toEqual(['0.500', '0.500', '0.500', '1.000']);
    expect(sprite.manager.blendMode).toBe(3);
  });

  // CLOUD SubType 10: dark, 500 ticks, made up to 200 off on every axis, `(rand() % 15 + 10) / 15 + Scale` big, pushed
  // `(r + 5) * 0.12` in x and y and moved by it again; within 300 of where it was made it gains 0.01 a tick up to
  // 0.15, out to 500 it loses 1.05 a tick, past that it goes; drawn `EnableAlphaBlendMinus` (:2859-2872, :7598-7625).
  it('cloud10, BITMAP_CLOUD SubType 10, drifts twice its push and darkens 0.01 a tick up to 0.15', async () => {
    const sprite = await play('cloud10', 1, 0.5, 2);
    expect(at(sprite)).toEqual([expect.closeTo(0.048), 0, expect.closeTo(0.048), 0]);
    expect(sprite.width).toBeCloseTo((256 * (17 / 15 + 1)) / 100);
    expect(rgba(sprite)).toEqual(['0.020', '0.020', '0.020', '1.000']);
    expect(sprite.manager.blendMode).toBe(3);
    expect(fakes.files).toEqual(['Effect/clouds.OZJ']);
    disposeEffectParticles();
    expect(rgba(await play('cloud10', 1, 0.5, 20))[0]).toBe('0.150');
  });

  it('cloud10 fades 1.05 a tick past 300 from where it was made and goes past 500', async () => {
    expect(rgba(await play('cloud10', 1, 0.5, 88))[0]).toBe('0.150');
    disposeEffectParticles();
    expect(rgba(await play('cloud10', 1, 0.5, 89))[0]).toBe('0.143');
    disposeEffectParticles();
    expect((await play('cloud10', 1, 0.5, 147)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('cloud10', 1, 0.5, 148)).isVisible).toBe(false);
  });

  it('cloud10 is made up to 200 off on every axis', async () => {
    const sprite = await play('cloud10', 1, 0, 1);
    expect(at(sprite)).toEqual([expect.closeTo(-1.988), expect.closeTo(-2), expect.closeTo(-1.988), 0]);
  });

  // CLOUD SubType 11: additive, `(rand() % 15 + 15) / 30 + Scale` big, SubType 10's drift, turning 0.5 + rand() % 2
  // a tick, in the light it is made with, gone past 500 (:2873-2885, :7626-7641).
  it('cloud11, BITMAP_CLOUD SubType 11, drifts as SubType 10 in its own light, turning', async () => {
    const sprite = await play('cloud11', 1, 0.5, 2);
    expect(at(sprite)).toEqual([expect.closeTo(0.048), 0, expect.closeTo(0.048), expect.closeTo((3 * Math.PI) / 180)]);
    expect(sprite.width).toBeCloseTo((256 * (22 / 30 + 1)) / 100);
    expect(rgba(sprite)).toEqual(['0.200', '0.400', '0.600', '1.000']);
    expect(sprite.manager.blendMode).toBe(1);
    disposeEffectParticles();
    expect((await play('cloud11', 1, 0.5, 147)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('cloud11', 1, 0.5, 148)).isVisible).toBe(false);
  });

  // BITMAP_FIRE_RED: 20 ticks, `Scale * (rand() % 64 + 64) * 0.01`, rising `(rand() % 100 + 100) * 0.15`, steady in the
  // light it is made with (ZzzEffectParticle.cpp:701-705, :4906-4909); its effect makes it up to 16 off in x and y.
  it('fireRed, BITMAP_FIRE_RED, shoots up steady for 20 ticks', async () => {
    const sprite = await play('fireRed', 0.9, 0.5, 2);
    expect(at(sprite)).toEqual([0, expect.closeTo(0.45), 0, 0]);
    expect(sprite.width).toBeCloseTo((64 * 0.864) / 100);
    expect(rgba(sprite)).toEqual(['0.200', '0.400', '0.600', '1.000']);
    expect(fakes.files).toEqual(['Effect/firered.OZJ']);
    disposeEffectParticles();
    const low = await play('fireRed', 1, 0, 1);
    expect(at(low)).toEqual([expect.closeTo(-0.16), expect.closeTo(0.15), expect.closeTo(-0.16), 0]);
    disposeEffectParticles();
    expect((await play('fireRed', 1, 0.5, 19)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('fireRed', 1, 0.5, 20)).isVisible).toBe(false);
  });
});

describe('waterfall1_2, BITMAP_WATERFALL_1 SubType 2 (ZzzEffectParticle.cpp:3385-3405, :8359-8373)', () => {
  // 30 ticks, `Rotation = rand() % 360`, `Scale = 1.6 + Scale`, `Velocity[2] = -(rand() % 5 + 7)`, 0.2 grey; a tick it
  // loses 0.005 of its scale, falls 0.1 slower and brightens 1.1 while more than 20 ticks are left.
  it('falls, slowing 0.1 a tick, 1.6 bigger than it is made, and brightens 1.1 a tick at first', async () => {
    const sprite = await play('waterfall1_2', 0.5, 0.5, 3);
    expect([sprite.position.x, sprite.position.z]).toEqual([0, 0]);
    expect(sprite.position.y).toBeCloseTo(-0.267);
    expect(sprite.width).toBeCloseTo((64 * 2.085) / 100);
    expect(sprite.angle).toBeCloseTo(Math.PI);
    expect(rgba(sprite)).toEqual(['0.266', '0.266', '0.266', '1.000']);
    expect(fakes.files).toEqual(['Effect/waterFall1.OZJ']);
  });

  // WATERFALL_5 dims below 8 ticks left; WATERFALL_1 below 5.
  it('dims 1.2 a tick below 5 ticks left and lives 30', async () => {
    expect(rgba(await play('waterfall1_2', 1, 0.5, 25))[0]).toBe('0.472');
    disposeEffectParticles();
    expect(rgba(await play('waterfall1_2', 1, 0.5, 26))[0]).toBe('0.393');
    disposeEffectParticles();
    expect(rgba(await play('waterfall5_9', 1, 0.5, 25))[0]).toBe('0.273');
    disposeEffectParticles();
    expect((await play('waterfall1_2', 1, 0.5, 29)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('waterfall1_2', 1, 0.5, 30)).isVisible).toBe(false);
  });
});

describe('waterfall2_1, BITMAP_WATERFALL_2 SubType 1 (ZzzEffectParticle.cpp:3501-3540, :8494-8510)', () => {
  // `Scale = (rand() % 6 + 6) * 0.1` whatever it is made with, `Velocity[2] = -(rand() % 3 + 3)`, `(0, 0.4, 0.4)`, 50
  // ticks; a tick it grows 0.03, falls 0.1 slower and dims 1.05.
  it('falls slowing 0.1 a tick, grows 0.03 and dims 1.05 a tick, teal', async () => {
    const sprite = await play('waterfall2_1', 3, 0.5, 2);
    expect([sprite.position.x, sprite.position.z]).toEqual([0, 0]);
    expect(sprite.position.y).toBeCloseTo(-0.079);
    expect(sprite.width).toBeCloseTo((64 * 0.96) / 100);
    expect(sprite.angle).toBeCloseTo(Math.PI);
    expect(rgba(sprite)).toEqual(['0.000', '0.363', '0.363', '1.000']);
    expect(fakes.files).toEqual(['Effect/waterFall2.OZJ']);
  });

  // `Position += (rand() % 20 - 10, rand() % 20 - 10, rand() % 40 - 20)`; a tick `Velocity = (rand() % 20 - 10) * 0.1`
  // in x and y, which the next tick moves it by.
  it('is made up to 10 aside and 20 below and wobbles up to 1 a tick', async () => {
    const sprite = await play('waterfall2_1', 1, 0, 2);
    expect(sprite.position.x).toBeCloseTo(-0.11);
    expect(sprite.position.z).toBeCloseTo(-0.11);
    expect(sprite.position.y).toBeCloseTo(-0.259);
  });

  it('dims 1.1 more below 10 ticks left and lives 50', async () => {
    expect(rgba(await play('waterfall2_1', 1, 0.5, 40))[1]).toBe('0.057');
    disposeEffectParticles();
    expect(rgba(await play('waterfall2_1', 1, 0.5, 41))[1]).toBe('0.049');
    disposeEffectParticles();
    expect((await play('waterfall2_1', 1, 0.5, 49)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('waterfall2_1', 1, 0.5, 50)).isVisible).toBe(false);
  });
});

describe('waterfall3_3, BITMAP_WATERFALL_3 SubType 3 (ZzzEffectParticle.cpp:3602-3611, :8559-8567)', () => {
  // 60 ticks, `Scale *= (rand() % 10 + 15) * 0.02`, `Velocity[2] = -1`, `Position += (rand() % 40 - 20, 0,
  // rand() % 25 - 10)`, in the light it is made with; a tick it grows 0.005, falls 0.05 faster and keeps 0.97 of it.
  it('sinks faster each tick, grows 0.005 and keeps 0.97 of its light a tick', async () => {
    const sprite = await play('waterfall3_3', 2, 0.5, 2);
    expect([sprite.position.x, sprite.position.z]).toEqual([0, 0]);
    expect(sprite.position.y).toBeCloseTo(-0.0005);
    expect(sprite.width).toBeCloseTo((64 * 0.81) / 100);
    expect(sprite.angle).toBeCloseTo(Math.PI);
    expect(rgba(sprite)).toEqual(['0.188', '0.376', '0.565', '1.000']);
    expect(fakes.files).toEqual(['Effect/waterFall3.OZJ']);
  });

  it('is made up to 20 aside in x and 10 below', async () => {
    const sprite = await play('waterfall3_3', 1, 0, 1);
    expect(sprite.position.x).toBeCloseTo(-0.2);
    expect(sprite.position.z).toBeCloseTo(0);
    expect(sprite.position.y).toBeCloseTo(-0.11);
  });

  it('lives 60 ticks', async () => {
    expect((await play('waterfall3_3', 1, 0.5, 59)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('waterfall3_3', 1, 0.5, 60)).isVisible).toBe(false);
  });
});

describe('waterfall2_2, BITMAP_WATERFALL_2 SubType 2 (ZzzEffectParticle.cpp:3501-3533, :8494-8503)', () => {
  // 40 ticks, `Scale = (rand() % 6 + 6) * 0.1f + Scale`, `Velocity[2] = -(rand() % 3 + 3)`, 0.4 grey; a tick it grows
  // 0.03 and falls 0.1 slower, and SubType 1's teal and 1.05 dimming are not its.
  it('falls slowing 0.1 a tick, grows 0.03 from its scale plus the object scale, grey', async () => {
    const sprite = await play('waterfall2_2', 1, 0.5, 2);
    expect([sprite.position.x, sprite.position.z]).toEqual([0, 0]);
    expect(sprite.position.y).toBeCloseTo(-0.079);
    expect(sprite.width).toBeCloseTo((64 * 1.96) / 100);
    expect(sprite.angle).toBeCloseTo(Math.PI);
    expect(rgba(sprite)).toEqual(['0.400', '0.400', '0.400', '1.000']);
    expect(fakes.files).toEqual(['Effect/waterFall2.OZJ']);
  });

  it('is made up to 10 aside and 20 below and wobbles up to 1 a tick', async () => {
    const sprite = await play('waterfall2_2', 1, 0, 2);
    expect(sprite.position.x).toBeCloseTo(-0.11);
    expect(sprite.position.z).toBeCloseTo(-0.11);
    expect(sprite.position.y).toBeCloseTo(-0.259);
  });

  it('dims 1.1 a tick below 10 ticks left and lives 40', async () => {
    expect(rgba(await play('waterfall2_2', 1, 0.5, 30))[0]).toBe('0.400');
    disposeEffectParticles();
    expect(rgba(await play('waterfall2_2', 1, 0.5, 31))[0]).toBe('0.364');
    disposeEffectParticles();
    expect((await play('waterfall2_2', 1, 0.5, 39)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('waterfall2_2', 1, 0.5, 40)).isVisible).toBe(false);
  });
});

describe('waterfall3_4, BITMAP_WATERFALL_3 SubType 4 (ZzzEffectParticle.cpp:3635-3643, :8687-8691)', () => {
  // 20 ticks, `Rotation = rand() % 360`, `Scale = (rand() % 10 + 10) * 0.02f + Scale`, `Velocity[2] = rand() % 5 + 2`,
  // in the light it is made with; a tick (no case of its own) it grows 0.005, sinks 2.5 faster and dims 1.1.
  it('leaps up, sinks 2.5 faster a tick, grows 0.005 and dims 1.1 a tick', async () => {
    const sprite = await play('waterfall3_4', 1, 0.5, 2);
    expect([sprite.position.x, sprite.position.z]).toEqual([0, 0]);
    expect(sprite.position.y).toBeCloseTo(0.055);
    expect(sprite.width).toBeCloseTo((64 * 1.31) / 100);
    expect(sprite.angle).toBeCloseTo(Math.PI);
    expect(rgba(sprite)).toEqual(['0.165', '0.331', '0.496', '1.000']);
    expect(fakes.files).toEqual(['Effect/waterFall3.OZJ']);
  });

  it('lives 20 ticks', async () => {
    expect((await play('waterfall3_4', 1, 0.5, 19)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('waterfall3_4', 1, 0.5, 20)).isVisible).toBe(false);
  });
});

describe('the particle tick', () => {
  it('makes no colour: one is reused frame after frame', async () => {
    await play('trueFire', 1, 0.5, 1);
    await play('smoke13', 1, 0.5, 1);
    await play('fi02_0', 1, 0.5, 1);
    const made = fakes.colors;
    for (let n = 0; n < 10; n++) tick?.();
    expect(fakes.colors).toBe(made);
  });

  // RenderSprite packs the light into a byte a channel, each held in 0..1 first (ZzzOpenglUtil.cpp:918-933,
  // RenderUtils.h:8-18): `smoke0` starts at LifeTime / 8 = 2, a torch fire takes a light past 1.
  it('holds every kind in 0..1 over its whole life, whatever light it is made with', async () => {
    for (const kind of Object.keys(KIND_REACH) as KindName[]) {
      for (const roll of [0, 0.5, 0.999999]) {
        const original = Math.random;
        Math.random = () => roll;
        try {
          await spawnParticle(scene, kind, { x: 0, y: 0, z: 0 }, NO_TURN, 1, [3, 3, 3]);
          const sprite = fakes.sprites[fakes.sprites.length - 1];
          for (let n = 0; n < 200 && sprite.isVisible; n++) {
            tick?.();
            for (const c of [sprite.color.r, sprite.color.g, sprite.color.b, sprite.color.a]) {
              expect(c, `${kind} roll ${roll} tick ${n}`).toBeGreaterThanOrEqual(0);
              expect(c, `${kind} roll ${roll} tick ${n}`).toBeLessThanOrEqual(1);
            }
          }
        } finally {
          Math.random = original;
        }
        disposeEffectParticles();
      }
    }
  });
});

describe('HeldSprites', () => {
  // RenderSprite packs the light a byte a channel, each held in 0..1 (ZzzOpenglUtil.cpp:918-933, RenderUtils.h:8-18).
  it('holds a look outside 0..1 in it, as RenderSprite does', async () => {
    const node = { getAbsolutePosition: () => ({ x: 0, y: 0, z: 0 }) };
    const held = new HeldSprites(scene, [{ node, texture: 'flare01', blend: 'add' }]);
    const look = (_i: number, out: { scale: number; r: number; g: number; b: number; rotation: number }) => {
      Object.assign(out, { scale: 1, r: 2, g: 1.5, b: -0.5, rotation: 0 });
    };
    await vi.waitFor(() => {
      held.update(true, look);
      expect(fakes.sprites.some(s => s.isVisible)).toBe(true);
    });
    const { r, g, b, a } = fakes.sprites.filter(s => s.isVisible)[0].color;
    expect([r, g, b, a]).toEqual([1, 1, 0, 1]);
    held.dispose();
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
      NO_TURN,
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
      NO_TURN,
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
      NO_TURN,
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
      NO_TURN,
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
      NO_TURN,
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

describe('the held weapons\' particles (RenderLinkObject, ZzzCharacter.cpp:7765-7927)', () => {
  it('waterFall4 SubType 12: 4-5 ticks, size and light keeping 0.92 a tick (ZzzEffectParticle.cpp:3611-3621, :8626-8634)', async () => {
    // roll 0.5: lives rand() % 2 - 1 + 5 = 5 ticks, its size Scale + 0 jitter.
    const sprite = await play('waterfall4Glint', 0.5, 0.5, 2);
    expect(sprite.width).toBeCloseTo((64 * 0.5 * 0.92 ** 2) / 100);
    expect(sprite.color.g).toBeCloseTo(0.4 * 0.92 ** 2);
    disposeEffectParticles();
    expect((await play('waterfall4Glint', 0.5, 0.5, 4)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('waterfall4Glint', 0.5, 0.5, 5)).isVisible).toBe(false);
  });

  it('Clud64 SubType 9: 40 ticks sinking about 1.2 cm a tick (ZzzEffectParticle.cpp:1043-1055)', async () => {
    const sprite = await play('frostCloud', 0.4, 0.5, 10);
    expect(sprite.position.y).toBeCloseTo(-0.12);
    disposeEffectParticles();
    expect((await play('frostSmoke', 0.4, 0.5, 39)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('frostSmoke', 0.4, 0.5, 40)).isVisible).toBe(false);
  });

  it('MODEL_STAR_SHINE: dark while it grows for ten ticks, lit for ten, then gone from sight (ZzzEffect.cpp:8322-8345)', async () => {
    const growing = await play('starShine', 0.22, 0.5, 5);
    expect(growing.color.r).toBe(0);
    disposeEffectParticles();
    const lit = await play('starShine', 0.22, 0.5, 15);
    expect(lit.color.r).toBeCloseTo(Math.min(1, 0.2 * 1.1 ** 10));
    expect(lit.width).toBeCloseTo((16 * 0.22 * 1.1 ** 10) / 100);
    disposeEffectParticles();
    expect((await play('starShine', 0.22, 0.5, 25)).color.r).toBe(0);
  });
});

describe('the bosses smokes (ZzzEffectParticle.cpp:1327, :1500, :1767; :5361, :5683, :5963)', () => {
  const rgb = (s: FakeSprite) => [s.color.r, s.color.g, s.color.b].map(c => c.toFixed(3));

  // SubType 50 steps `(rand() % 3 + 2) * 0.1` toward half its light, past it for a tick, and rises 1.6-3.1 a tick.
  it('smoke50 fades in to half its light and rises', async () => {
    const sprite = await play('smoke50', 1, 0.5, 3);
    expect(rgb(sprite)).toEqual(['0.100', '0.200', '0.300']);
    expect(sprite.position.y).toBeCloseTo(0.072);
  });

  // SMOKELINE SubType 0 steps `(rand() % 5 + 2) * 0.1` toward 0.7 of its light.
  it('smokeLine1 fades in to 0.7 of its light on its own sheet', async () => {
    const sprite = await play('smokeLine1', 1, 0.5, 3);
    expect(rgb(sprite)).toEqual(['0.140', '0.280', '0.420']);
    expect(fakes.files).toContain('Effect/smokelines01.OZJ');
  });

  // SubType 1 is `(0.5L, L, 0.8L)` at `L = LifeTime / 50` whatever light it is made with.
  it('smoke1 is green whatever its light', async () => {
    const sprite = await play('smoke1', 1, 0.5, 10);
    expect(rgb(sprite)).toEqual(['0.400', '0.800', '0.640']);
  });
});

describe('the held weapons\' sparks and shine (RenderLinkObject, ZzzCharacter.cpp:7077-8344)', () => {
  it('Spark03 SubType 11: 30 ticks, pushed (-4..3, 0..3, 0..3) cm a tick, its light 1/1.05 and its size 0.04 less a tick (ZzzEffectParticle.cpp:2196-2204, :6704-6713)', async () => {
    // roll 0.5: pushed (0, 2, 2), sized rand() % 5 / 10 + 1 = 1.2 whatever it is made with.
    const sprite = await play('spark1_11', 0.8, 0.5, 5);
    expect([sprite.position.x, sprite.position.y, sprite.position.z].map(n => +n.toFixed(4))).toEqual([0, 0.1, 0.1]);
    expect(sprite.width).toBeCloseTo((32 * (1.2 - 0.2)) / 100);
    expect(sprite.color.g).toBeCloseTo(0.4 / 1.05 ** 5);
    disposeEffectParticles();
    expect((await play('spark1_11', 0.8, 0.5, 29)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('spark1_11', 0.8, 0.5, 30)).isVisible).toBe(false);
  });

  it('Spark03 SubType 14: one in two pushed (-4..-1, 0..3, 0..3) and sized 0.4-0.8, the rest a 2-tick dot at its own scale (:2216-2226, :6724-6733)', async () => {
    // roll 0.4: its rand_fps_check(2) passes, pushed (-3, 1, 1), sized 0.6, 0.01 less a tick.
    const sprite = await play('spark1_14', 0.05, 0.4, 10);
    expect([sprite.position.x, sprite.position.z].map(n => +n.toFixed(4))).toEqual([-0.3, 0.1]);
    expect(sprite.width).toBeCloseTo((32 * 0.5) / 100);
    disposeEffectParticles();
    // roll 0.6: it fails: LifeTime 2, the scale it was made with, still.
    expect((await play('spark1_14', 0.05, 0.6, 1)).width).toBeCloseTo((32 * 0.04) / 100);
    disposeEffectParticles();
    expect((await play('spark1_14', 0.05, 0.6, 2)).isVisible).toBe(false);
  });

  it('Shiny+6 SubType 1: shiny05 and a flare as one, 0.3, up to 25 cm off, 10-12 ticks, 0.01 smaller and 5 degrees back a tick (:2718-2727, :7368-7372, :9301-9304)', async () => {
    const original = Math.random;
    try {
      // The flare takes the shine's rolls, whatever it rolls itself.
      Math.random = () => 0.9;
      await spawnParticle(scene, 'shiny6_1', { x: 0, y: 0, z: 0 }, NO_TURN, 1, [0.4, 0.6, 0.9]);
      Math.random = () => 0.1;
      await spawnParticle(scene, 'light6_1', { x: 0, y: 0, z: 0 }, NO_TURN, 1, [0.4, 0.6, 0.9]);
    } finally {
      Math.random = original;
    }
    const [shine, flare] = fakes.sprites.slice(-2);
    for (let n = 0; n < 4; n++) tick?.();
    for (const s of [shine, flare]) {
      // rand() % 50 - 25 = 20 cm on each axis, rand() % 20 - 10 = 8 degrees.
      expect([s.position.x, s.position.y, s.position.z].map(n => +n.toFixed(4))).toEqual([0.2, 0.2, 0.2]);
      expect(s.width).toBeCloseTo((64 * 0.26) / 100);
      expect(s.angle).toBeCloseTo(((8 - 20) * Math.PI) / 180);
    }
    // rand() % 3 + 10 = 12 ticks for both.
    for (let n = 4; n < 12; n++) tick?.();
    expect([shine.isVisible, flare.isVisible]).toEqual([false, false]);
  });
});

describe('Medusa\'s hand fires and bone 68 waterfall (GMSwampOfQuiet.cpp:544-578, :1082-1085)', () => {
  // A turn of -yaw is a monster facing yaw (`facing` in monsterVisuals.ts): yaw PI/2 faces +x.
  const east = { x: 0, y: -Math.PI / 2, z: 0 };

  it('FIRE_HIK1_MONO SubType 4: 8 ticks, 0.12-0.54 of its scale, 8 cm a tick along the facing, growing (ZzzEffectParticle.cpp:1885-1894, :6251-6289)', async () => {
    // roll 0.5: (21 + 12) * 0.01 * 1.5 big, then 0.09 more a tick; alpha 0.3 a tick up from 0.
    const sprite = await play('fireMono1_4', 1.5, 0.5, 3, east);
    expect([sprite.position.x, sprite.position.z].map(n => +n.toFixed(4) + 0)).toEqual([0.24, 0]);
    expect(sprite.width).toBeCloseTo((64 * (0.495 + 0.27)) / 100);
    expect(sprite.color.r).toBeCloseTo(0.2 * 0.9);
    expect(fakes.files).toContain('Effect/firehik_mono01.OZJ');
    disposeEffectParticles();
    expect((await play('fireMono1_4', 1.5, 0.5, 7)).isVisible).toBe(true);
    disposeEffectParticles();
    expect((await play('fireMono1_4', 1.5, 0.5, 8)).isVisible).toBe(false);
  });

  it('FIRE_HIK2_MONO SubType 8 and FIRE_HIK3_MONO SubType 5 are the same jet on their own sheets (:364-374, :1972-1982)', async () => {
    for (const kind of ['fireMono2_8', 'fireMono3_5'] as const) {
      expect((await play(kind, 1.5, 0.5, 3, east)).position.x).toBeCloseTo(0.24);
      disposeEffectParticles();
    }
    expect(fakes.files).toEqual(expect.arrayContaining(['Effect/firehik_mono02.OZJ', 'Effect/firehik_mono03.OZJ']));
  });

  it('WATERFALL_4: three cards on one set of rolls circle the point, 2.1 cm out and 0.1 round a tick, 0.95 of the light, 80 ticks (ZzzEffect.cpp:5819-5826, MoveHandlers.cpp:9093-9133)', async () => {
    const original = Math.random;
    try {
      Math.random = () => 0.5;
      await spawnParticle(scene, 'waterfall4Orbit0', { x: 0, y: 0, z: 0 }, NO_TURN, 1, [0.9, 1, 0.9]);
      // The other two take the first one's rolls, whatever they roll.
      Math.random = () => 0.1;
      await spawnParticle(scene, 'waterfall4Orbit1', { x: 0, y: 0, z: 0 }, NO_TURN, 1, [0.9, 1, 0.9]);
      await spawnParticle(scene, 'waterfall4Orbit2', { x: 0, y: 0, z: 0 }, NO_TURN, 1, [0.9, 1, 0.9]);
    } finally {
      Math.random = original;
    }
    const cards = fakes.sprites.slice(-3);
    tick?.();
    tick?.();
    // Timer rand() % 360 = 180 radians, Distance rand() % 10 + 5 = 10 cm; scale rand() % 20 * 0.01 + 0.1.
    const t = 180.2;
    const d = 14.2 / 100;
    const at = (s: FakeSprite) => [s.position.x, s.position.y, s.position.z].map(n => +n.toFixed(4));
    const round = (v: number[]) => v.map(n => +n.toFixed(4));
    // MU (x, y, z) is drawn at (x, z, y).
    expect(at(cards[0])).toEqual(round([Math.cos(t) * d, Math.sin(t) * d, 0]));
    expect(at(cards[1])).toEqual(round([Math.sin(t) * d, 0, Math.cos(t) * d]));
    expect(at(cards[2])).toEqual(round([0, Math.cos(t) * d, Math.sin(t) * d]));
    for (const s of cards) {
      expect(s.width).toBeCloseTo((64 * 0.2) / 100);
      expect(s.color.g).toBeCloseTo(0.95 ** 2);
      expect(s.angle).toBeCloseTo(((180 + 1.4) * Math.PI) / 180);
    }
    for (let n = 2; n < 80; n++) tick?.();
    expect(cards.map(s => s.isVisible)).toEqual([false, false, false]);
  });

  it('a particle made with an anchor moves as far as the anchor does (`VectorSubtract(Position, StartPosition)`, :4325-4328)', async () => {
    const anchor = { x: 0, y: 0, z: 0 };
    const original = Math.random;
    Math.random = () => 0.5;
    try {
      await spawnParticle(scene, 'waterfall4Orbit1', { x: 0, y: 0, z: 0 }, NO_TURN, 1, [1, 1, 1], 0, anchor);
    } finally {
      Math.random = original;
    }
    const card = fakes.sprites[fakes.sprites.length - 1];
    tick?.();
    const before = card.position.x;
    anchor.x = 2;
    anchor.y = 1;
    tick?.();
    const t = 180.2;
    expect(card.position.x - before).toBeCloseTo(2 + Math.sin(t) * 0.142 - Math.sin(t - 0.1) * 0.121);
    expect(card.position.y).toBeCloseTo(1);
  });
});

describe("the Dark Ghost's attack and death particles (GMEmpireGuardian2.cpp:925-955)", () => {
  // roll 0.5: Gravity 1, Scale (5 + 10) * 0.02 + 2, set (0, 0, -50) off; a tick it sinks Gravity, which loses 0.05,
  // shrinks 0.05 and keeps 1/1.1 of its light; 20 ticks.
  it('WATERFALL_4 SubType 15 drops from 50 cm under its spot, shrinking and dimming (ZzzEffectParticle.cpp:3716-3726, :8663-8674)', async () => {
    const sprite = await play('waterfall4_15', 2, 0.5, 2);
    expect(sprite.position.y).toBeCloseTo((-50 - 1 - 0.95) / 100);
    expect(sprite.width).toBeCloseTo((64 * (2.3 - 0.1)) / 100);
    expect(sprite.color.g).toBeCloseTo(0.4 / 1.1 ** 2);
    expect(fakes.files).toContain('Effect/waterFall4.OZJ');
    disposeEffectParticles();
    expect((await play('waterfall4_15', 2, 0.5, 20)).isVisible).toBe(false);
  });

  // No SubType 39 case: CreateParticle's own defaults, two ticks at its Scale and light, still (:58-86).
  it('SMOKE SubType 39 is a still smoke01 card for two ticks', async () => {
    const sprite = await play('smoke39', 1, 0.5, 1);
    expect([sprite.position.x, sprite.position.y, sprite.width]).toEqual([0, 0, 0.64]);
    expect(sprite.color.g).toBeCloseTo(0.4);
    disposeEffectParticles();
    expect((await play('smoke39', 1, 0.5, 2)).isVisible).toBe(false);
  });
});
