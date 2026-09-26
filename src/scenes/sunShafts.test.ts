import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GeometryBufferRenderer, PostProcess } from '../libs/babylon/exports';
import type { LightingTier } from '../common/lightingQuality';

type Shafts = typeof import('./sunShafts');

const TIER = {} as LightingTier;
const SKY: [number, number, number] = [1, 0.9, 0.8];
const IDLE_TICKS = 30;

/** The camera looks down +z: a sun lighting along -z sits mid-frame, along +z behind it. */
const FACING: [number, number, number] = [0, 0, -1];
const BEHIND: [number, number, number] = [0, 0, 1];

/** Stands in for a pass behind the shafts (the tone pass). */
const stubPass = (): PostProcess =>
  ({ isReusable: () => false, markTextureDirty: () => {} }) as unknown as PostProcess;

let loaded: Shafts | null = null;

/**
 * Fresh modules per test, Babylon included so the engine and the pass share
 * one ShaderStore: the seam is read once at load.
 */
async function load(query = '') {
  vi.resetModules();
  vi.stubGlobal('location', { search: query });

  const [shafts, bjs, { NullEngine }] = await Promise.all([
    import('./sunShafts'),
    import('../libs/babylon/exports'),
    import('@babylonjs/core/Engines/nullEngine'),
  ]);

  loaded = shafts;

  const scene = new bjs.Scene(new NullEngine());
  const camera = new bjs.ArcRotateCamera('cam', 0, 0, 10, bjs.Vector3.Zero(), scene);

  camera.setPosition(new bjs.Vector3(0, 0, -10));
  scene.activeCamera = camera;
  scene.setTransformMatrix(camera.getViewMatrix(true), camera.getProjectionMatrix(true));
  scene.geometryBufferRenderer = { isSupported: true } as GeometryBufferRenderer;

  const chain = camera._postProcesses;
  const inChain = () => chain.find(pp => pp?.name === 'sunShafts') ?? null;

  const tick = (
    direction: [number, number, number],
    opts: { sky?: boolean; upstream?: boolean } = {}
  ): boolean =>
    shafts.syncSunShafts(
      scene,
      camera,
      TIER,
      1,
      { sunColor: opts.sky === false ? null : SKY, direction },
      true,
      opts.upstream ?? false
    );

  return { shafts, camera, chain, inChain, tick };
}

afterEach(() => {
  loaded?.disposeSunShafts();
  loaded = null;
  vi.unstubAllGlobals();
});

describe('sun shafts idle detach', { timeout: 30_000 }, () => {
  it('builds the pass out of the chain while the sun is behind the camera', async () => {
    const { shafts, chain, inChain, tick } = await load();

    expect(tick(BEHIND)).toBe(false);
    expect(inChain()).toBeNull();
    expect(chain.length).toBe(0);
    expect(shafts.sunShaftsLive()).toBe(false);
  });

  it('attaches the tick the sun comes into view and leaves after the hysteresis', async () => {
    const { shafts, camera, chain, inChain, tick } = await load();

    tick(BEHIND);

    // The first attach appends, so the passes behind it have to re-attach.
    expect(tick(FACING)).toBe(true);
    const pass = inChain();
    expect(pass).not.toBeNull();
    expect(shafts.sunShaftsLive()).toBe(true);

    const tone = stubPass();
    camera.attachPostProcess(tone);

    for (let i = 1; i < IDLE_TICKS; i++) {
      expect(tick(BEHIND)).toBe(false);
      expect(shafts.sunShaftsLive()).toBe(true);
    }

    // Leaving never moves the passes behind it.
    expect(tick(BEHIND)).toBe(false);
    expect(shafts.sunShaftsLive()).toBe(false);
    expect(chain).toEqual([null, tone]);

    // Back into its own slot ahead of the tone pass: no reorder, no growth.
    expect(tick(FACING)).toBe(false);
    expect(chain).toEqual([pass, tone]);
    expect(shafts.sunShaftsLive()).toBe(true);
  });

  it('appends and asks for a reorder when the chain grew while it was out', async () => {
    const { shafts, camera, chain, inChain, tick } = await load();

    tick(FACING);
    const pass = inChain();

    for (let i = 0; i < IDLE_TICKS; i++) tick(BEHIND);
    expect(shafts.sunShaftsLive()).toBe(false);

    const tone = stubPass();
    camera.attachPostProcess(tone);

    expect(tick(FACING)).toBe(true);
    expect(chain).toEqual([null, tone, pass]);
  });

  it('appends when it left in the tick a pass ahead of it re-attached', async () => {
    const { camera, chain, inChain, tick } = await load();

    tick(FACING);
    const pass = inChain();
    const tone = stubPass();
    camera.attachPostProcess(tone);

    for (let i = 1; i < IDLE_TICKS; i++) tick(BEHIND);

    // The haze re-attaches ahead of it this tick, landing behind its slot.
    const haze = stubPass();
    camera.attachPostProcess(haze);
    expect(tick(BEHIND, { upstream: true })).toBe(false);
    expect(chain).toEqual([null, tone, haze]);

    expect(tick(FACING)).toBe(true);
    expect(chain).toEqual([null, tone, haze, pass]);
  });

  it('re-attaches behind a rebuilt upstream pass only while in the chain', async () => {
    const { chain, tick } = await load();

    expect(tick(BEHIND, { upstream: true })).toBe(false);
    expect(chain.length).toBe(0);

    tick(FACING);
    expect(tick(FACING, { upstream: true })).toBe(true);
  });

  it('reports a chain change on teardown only when it was attached', async () => {
    const { shafts, tick } = await load();

    tick(BEHIND);
    expect(tick(BEHIND, { sky: false })).toBe(false);

    tick(FACING);
    expect(tick(FACING, { sky: false })).toBe(true);
    expect(shafts.sunShaftsLive()).toBe(false);
  });

  it('keeps the identity pass in the chain under ?shaftsIdle=1', async () => {
    const { shafts, inChain, tick } = await load('?shaftsIdle=1');

    expect(tick(BEHIND)).toBe(true);
    expect(inChain()).not.toBeNull();

    for (let i = 0; i < 2 * IDLE_TICKS; i++) expect(tick(BEHIND)).toBe(false);
    expect(shafts.sunShaftsLive()).toBe(true);

    expect(tick(BEHIND, { sky: false })).toBe(true);
  });
});
