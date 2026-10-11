import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { ArcRotateCamera, Scene } from '../render/babylon/exports';
import { ENUM_WORLD } from '../../core/types';

// What the director reads (the options, the tier, the style, the post passes' state) and every call it makes.
const env = vi.hoisted(() => ({
  tier: 0,
  post: true,
  brightness: 0,
  toneMapper: 1,
  bloom: 0,
  style: null as null | { name: string },
  ink: false,
  linear: false,
  pbr: false,
  roomMask: { changed: false, live: false },
  calls: [] as { name: string; args: unknown[]; snapshot: string }[],
}));

/** A writer that records what it was handed (as handed, and as it was then) and returns `out`. */
const writer = vi.hoisted(
  () =>
    (name: string, out?: (...args: unknown[]) => unknown) =>
    (...args: unknown[]) => {
      // The scene and the camera are the test's own; the rest is what the director composed.
      const handed = args.filter(a => !(a && typeof a === 'object' && 'isTestHandle' in a));
      env.calls.push({ name, args: handed, snapshot: JSON.stringify(handed) });
      return out?.(...args);
    }
);

vi.mock('../render/babylon/exports', () => ({
  Observable: class<T> {
    observers: ((v: T) => void)[] = [];
    add(f: (v: T) => void) {
      this.observers.push(f);
    }
    notifyObservers(v: T) {
      for (const f of this.observers) f(v);
    }
  },
}));
vi.mock('@/controllers/settings', () => ({
  GameOptions: {
    get postProcessing() {
      return env.post;
    },
    get brightness() {
      return env.brightness;
    },
    get toneMapper() {
      return env.toneMapper;
    },
    get bloom() {
      return env.bloom;
    },
  },
}));
vi.mock('./lightingQuality', () => {
  const tiers = [null, { pcss: false, ssaoRatio: 0.5 }, { pcss: true, ssaoRatio: 1 }];
  return { tierIndex: () => env.tier, lightingTier: () => tiers[env.tier] };
});
vi.mock('../render/renderingStyle', () => ({
  inkLinesActive: () => env.ink,
  renderingStyle: () => env.style,
  styleIndex: () => (env.style ? 2 : 0),
  syncRenderingStyle: writer('syncRenderingStyle'),
}));
vi.mock('./lightModel', () => ({ linearBufferActive: () => env.linear }));
vi.mock('../render/materialQuality', () => ({
  directLightGain: () => 0.9,
  pbrMaterialsOn: () => env.pbr,
  specularLightScale: () => 0.5,
}));
vi.mock('../../core/devSeams', () => ({ devQueryNumber: () => null, devQueryNumbers: () => null }));
vi.mock('../../core/eventBus', () => ({ EventBus: { emit: writer('EventBus.emit') } }));
vi.mock('../maps', () => {
  const look = {
    ev: 1.5,
    whiteBalance: [1.02, 1, 0.98],
    fog: { start: 20, density: 0.01, cap: 0.8, height: 0.1, color: [0.5, 0.6, 0.7] },
    underworld: { top: -2, density: 0.2, falloff: 0.5, color: [0.1, 0.1, 0.1] },
  };
  const tavern = { lighting: { areas: { tavern: { keyLevel: 1.1, candles: 1.4 } } } };
  const devias = [10, 20, 30];
  return {
    maps: {
      all: [tavern],
      rowFor: (world: number, pick: (l: unknown) => unknown) => (world === 0 ? pick({ lighting: { look } }) : undefined),
      isOutdoor: (world: number) => world !== 2,
      clearColorFor: (world: number) => (world === 2 ? devias : null),
    },
  };
});
vi.mock('./keyRig', () => ({
  DEFAULT_SUN_DIRECTION: [0.5, -1, 0.75],
  setKey: writer('setKey'),
  setSunDirection: writer('setSunDirection'),
  syncSpecular: writer('syncSpecular'),
}));
vi.mock('./skyDome', () => ({ syncSkyDome: writer('syncSkyDome') }));
vi.mock('./horizon', () => ({ syncSkyline: writer('syncSkyline') }));
vi.mock('@/controllers/render/shadows', () => ({
  syncShadows: writer('syncShadows'),
  syncTerrainDefines: writer('syncTerrainDefines'),
}));
vi.mock('@/controllers/render/scenes', () => {
  const live: string[] = [];
  return {
    syncAmbientOcclusion: writer('syncAmbientOcclusion', (...a) => a[3] === true && env.tier > 0),
    syncAmbientOcclusionSamples: writer('syncAmbientOcclusionSamples'),
    syncEffectMask: writer('syncEffectMask'),
    syncInkOutline: writer('syncInkOutline', () => false),
    inkOutlineLive: () => env.ink && env.post,
    syncHullOutline: writer('syncHullOutline'),
    syncSpeedLines: writer('syncSpeedLines', () => false),
    speedLinesLive: () => false,
    syncHeightFog: writer('syncHeightFog', () => false),
    updateHeightFog: writer('updateHeightFog'),
    syncRoomMask: writer('syncRoomMask', () => env.roomMask),
    syncToneMap: writer('syncToneMap', () => false),
    toneMapLive: () => env.tier > 0 && env.post,
    syncFireflyGuard: writer('syncFireflyGuard', () => false),
    syncFireflyGuardSamples: writer('syncFireflyGuardSamples'),
    syncSunShafts: writer('syncSunShafts', () => false),
    sunShaftsLive: () => false,
    syncUpscale: writer('syncUpscale'),
    syncUpscaleSamples: writer('syncUpscaleSamples'),
    upscaleScale: () => 1,
    TONE_MAPPER_NAMES: ['none', 'standard', 'aces', 'neutral'],
    createPostChain: () => ({
      set: writer('postChain.set', (look: unknown) => {
        live.length = 0;
        if ((look as { shaped: boolean }).shaped) live.push('whiteBalance');
      }),
      moveToEnd: writer('postChain.moveToEnd'),
      syncSamples: writer('postChain.syncSamples'),
      passes: () => [...live],
    }),
  };
});

const { createLookDirector } = await import('./director');
type LookDirector = ReturnType<typeof createLookDirector>;

const ROOM = { minX: 1, minY: 2, maxX: 3, maxY: 4, floorY: 0, wallTop: 3, roofY: 4 };
const view = Array.from({ length: 16 }, (_, i) => (i % 5 === 0 ? 1 : i * 0.01));
const scene = { isTestHandle: true, getEngine: () => ({ getRenderHeight: () => 900 }) } as unknown as Scene;
const camera = { isTestHandle: true, getViewMatrix: () => ({ m: view }) } as unknown as ArcRotateCamera;

/** A new director over the default options. */
function fresh(): LookDirector {
  Object.assign(env, { tier: 0, post: true, brightness: 0, toneMapper: 1, style: null, ink: false, linear: false, pbr: false });
  env.roomMask = { changed: false, live: false };
  return createLookDirector(scene, camera);
}

/** What the writers were handed and what was published, on one frame. */
function frameOf(director: LookDirector) {
  env.calls = [];
  director.tick(0.1);
  const state = director.state();
  return { calls: env.calls, state, parts: [state, state.profile, state.key, state.passes, state.shadow] };
}

/** Every frame of a scripted run: the calls, as the director handed them, and the published state. */
function run() {
  const director = fresh();
  const frames: { calls: typeof env.calls; state: string; published: number }[] = [];
  let published = 0;
  director.onChange.add(() => published++);
  const frame = (dt: number) => {
    env.calls = [];
    director.tick(dt);
    frames.push({ calls: env.calls, state: JSON.stringify(director.state()), published });
  };
  const steps: (() => void)[] = [
    () => director.setMap(ENUM_WORLD.WD_0LORENCIA),
    () => (env.tier = 1),
    () => director.setArea('tavern', ROOM),
    () => {},
    () => director.setOmen('invasion'),
    () => (env.roomMask = { changed: true, live: true }),
    () => ((env.tier = 2), (env.style = { name: 'anime' }), (env.ink = true), (env.pbr = true)),
    () => director.setArea(null),
    () => ((env.brightness = 3), (env.toneMapper = 2), (env.linear = true)),
    () => director.setOmen(null),
    () => (env.post = false),
    () => ((env.post = true), director.setMap(ENUM_WORLD.WD_2DEVIAS)),
    () => (env.tier = 0),
  ];
  for (const step of steps) {
    step();
    for (let i = 0; i < 3; i++) frame(0.3);
  }
  return frames;
}

describe('the look director', () => {
  // Pinned before the tick stopped allocating: every writer's input and every published state, frame by frame.
  it('hands every writer what it always did, frame by frame', () => {
    const trace = JSON.stringify(
      run().map(f => ({ calls: f.calls.map(c => [c.name, c.snapshot]), state: f.state, published: f.published }))
    );
    expect(createHash('sha256').update(trace).digest('hex')).toBe(
      '4776f7466174d5f73ca739e38caf85505b1faa31a41f4018f196ba1365f0969d'
    );
  });

  // The tick runs every frame: it rewrites kept objects rather than making new ones (docs/guidelines/performance.md).
  it('hands the writers and the readers the same kept objects every frame, on Classic and while a room fades in', () => {
    for (const tier of [0, 2]) {
      const director = fresh();
      env.tier = tier;
      director.setArea('tavern', ROOM);
      director.setOmen('invasion');
      frameOf(director);
      const [a, b] = [frameOf(director), frameOf(director)];
      expect(b.calls.map(c => c.name)).toEqual(a.calls.map(c => c.name));
      a.calls.forEach((call, n) => {
        call.args.forEach((arg, i) => {
          if (arg && typeof arg === 'object') expect(b.calls[n].args[i], `tier ${tier}: ${call.name} #${i}`).toBe(arg);
        });
      });
      a.parts.forEach((part, i) => expect(b.parts[i], `tier ${tier}: state part ${i}`).toBe(part));
    }
  });
});
