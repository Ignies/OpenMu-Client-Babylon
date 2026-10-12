import { afterAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Camera } from '@babylonjs/core/Cameras/camera';
import { BlendState } from '@versions/shared/objects/enum';
import { getMaterial } from '../assets/modelLoader';
import { ICON_LAYER, createIconShots, iconPixels, type IconShotJob } from './iconShot';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const engine = new NullEngine();
const scene = new Scene(engine);
const main = new FreeCamera('main', new Vector3(0, 5, -10), scene);
scene.activeCamera = main;
afterAll(() => engine.dispose());

/** The frames the queue gets: one draw each, the promises between them settled. */
async function frames(n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    scene.render();
    for (let k = 0; k < 5; k++) await Promise.resolve();
  }
}

/** Frames until the shot is in: how many microtask hops its async steps take differs between node versions. */
async function shot<T>(done: Promise<T>): Promise<T> {
  let settled = false;
  const settle = () => void (settled = true);
  void done.then(settle, settle);
  // Past READY_FRAMES, the shot draws even if the shaders never got ready.
  for (let i = 0; i < 200 && !settled; i++) await frames(1);
  return done;
}

const VIEW = { width: 4, height: 2, left: 0, right: 0.4, bottom: -0.2, top: 0 };

/** A job whose subject is one box under the shot's root; `disposed` counts its dispose. */
function boxJob(key: string, log: { built: string[]; disposed: string[] }): IconShotJob {
  return {
    key,
    view: VIEW,
    build: async (root: TransformNode) => {
      log.built.push(key);
      const box = CreateBox(key, { size: 0.1 }, scene);
      box.parent = root;
      box.position.set(0.2, 2, -0.1);
      return { dispose: () => { log.disposed.push(key); box.dispose(); } };
    },
  };
}

function shots() {
  const read = vi.fn(async (_rtt: RenderTargetTexture, view: typeof VIEW) => new Uint8Array(view.width * view.height * 4));
  const encode = vi.fn(async (_pixels: Uint8ClampedArray, w: number, h: number) => `blob:${w}x${h}`);
  const readNow = vi.fn((_rtt: RenderTargetTexture, _view: typeof VIEW, out: Uint8Array) => void out.fill(255));
  return { shots: createIconShots(scene, { read, encode, readNow }), read, encode, readNow };
}

describe('the one-shot icon render', () => {
  it('draws at most one icon per frame, and nothing once the queue is empty', async () => {
    const draws = vi.spyOn(RenderTargetTexture.prototype, 'render');
    const log = { built: [] as string[], disposed: [] as string[] };
    const idle = scene.onAfterRenderObservable.observers.length;
    const { shots: s } = shots();
    const a = s.shoot(boxJob('a', log));
    const b = s.shoot(boxJob('b', log));
    const perFrame: number[] = [];
    for (let i = 0; i < 8; i++) {
      const before = draws.mock.calls.length;
      await frames(1);
      perFrame.push(draws.mock.calls.length - before);
    }
    expect(await a).toBe('blob:4x2');
    expect(await b).toBe('blob:4x2');
    expect(Math.max(...perFrame)).toBe(1);
    expect(draws.mock.calls.length).toBe(2);
    await frames(3);
    expect(draws.mock.calls.length).toBe(2);
    // Babylon drops a removed observer on the next task.
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(scene.onAfterRenderObservable.observers.length).toBe(idle);
    draws.mockRestore();
  });

  it('builds and draws each key once and hands the same URL back', async () => {
    const log = { built: [] as string[], disposed: [] as string[] };
    const { shots: s, read } = shots();
    const first = s.shoot(boxJob('same', log));
    const second = s.shoot(boxJob('same', log));
    expect(second).toBe(first);
    expect(await shot(first)).toBe('blob:4x2');
    expect(s.shoot(boxJob('same', log))).toBe(first);
    expect(log.built).toEqual(['same']);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('draws a key again once its pictures are forgotten (a changed item-effects option)', async () => {
    const log = { built: [] as string[], disposed: [] as string[] };
    const { shots: s } = shots();
    const first = s.shoot(boxJob('again', log));
    await shot(first);
    s.forget();
    const second = s.shoot(boxJob('again', log));
    expect(second).not.toBe(first);
    expect(await shot(second)).toBe('blob:4x2');
    expect(log.built).toEqual(['again', 'again']);
  });

  it('frees the subject, its root, the camera and the target after the shot', async () => {
    const log = { built: [] as string[], disposed: [] as string[] };
    const cameras = scene.cameras.length;
    const nodes = scene.transformNodes.length;
    const textures = scene.textures.length;
    const { shots: s } = shots();
    const done = s.shoot(boxJob('freed', log));
    await shot(done);
    expect(log.disposed).toEqual(['freed']);
    expect(scene.cameras.length).toBe(cameras);
    expect(scene.transformNodes.length).toBe(nodes);
    expect(scene.textures.length).toBe(textures);
    expect(scene.getMeshByName('freed')).toBeNull();
  });

  it('keeps the subject out of the main camera and frames the view with its own', async () => {
    const seen: { mask: number; main: boolean; ortho: (number | null)[]; layer: number }[] = [];
    const render = vi.spyOn(RenderTargetTexture.prototype, 'render').mockImplementation(function (this: RenderTargetTexture) {
      const cam = this.activeCamera as Camera;
      const mesh = (this.renderList ?? [])[0];
      seen.push({
        mask: mesh.layerMask,
        main: (mesh.layerMask & main.layerMask) !== 0,
        ortho: [cam.orthoLeft, cam.orthoRight, cam.orthoBottom, cam.orthoTop],
        layer: cam.layerMask,
      });
    });
    const log = { built: [] as string[], disposed: [] as string[] };
    const { shots: s } = shots();
    const done = s.shoot(boxJob('framed', log));
    await shot(done);
    render.mockRestore();
    expect(seen).toEqual([{ mask: ICON_LAYER, main: false, ortho: [0, 0.4, -0.2, 0], layer: ICON_LAYER }]);
  });

  it('draws by its own light: flat lit at BodyLight 1, out of the fog and the shadow passes', async () => {
    const lit = getMaterial(scene, true, 0, BlendState.ALPHA_DISABLE);
    const bright = getMaterial(scene, false, 2, BlendState.ALPHA_ONEOE, true);
    const seen: { flat: boolean; brightKept: boolean; light: number[]; fog: boolean; caster: boolean }[] = [];
    const render = vi.spyOn(RenderTargetTexture.prototype, 'render').mockImplementation(function (this: RenderTargetTexture) {
      const [body, card] = this.renderList ?? [];
      seen.push({
        flat: body.material !== lit && !!body.material?.name.includes('_flat'),
        brightKept: card.material === bright,
        light: [body.metadata.bodyLight.x, body.metadata.bodyLight.y, body.metadata.bodyLight.z],
        fog: body.applyFog,
        caster: body.metadata.csmCaster,
      });
    });
    const { shots: s } = shots();
    const done = s.shoot({
      key: 'lit',
      view: VIEW,
      build: async root => {
        const body = CreateBox('body', { size: 0.1 }, scene);
        const card = CreateBox('card', { size: 0.1 }, scene);
        body.material = lit;
        card.material = bright;
        body.metadata = { bodyLight: new Vector3(0.3, 0.3, 0.3), csmCaster: true };
        card.metadata = { brightMesh: true };
        body.parent = root;
        card.parent = root;
        return { dispose: () => { body.dispose(); card.dispose(); } };
      },
    });
    await shot(done);
    render.mockRestore();
    expect(seen).toEqual([{ flat: true, brightKept: true, light: [1, 1, 1], fog: false, caster: false }]);
  });

  // RenderPartObjectBody sets a seed's BodyLight to its colour over the bag's 1, 1, 1 (ZzzObject.cpp:8067-8090).
  it('keeps the light of a mesh lit by its own shine', async () => {
    const colour = new Vector3(0.9, 0.1, 0.2);
    const seen: unknown[] = [];
    const render = vi.spyOn(RenderTargetTexture.prototype, 'render').mockImplementation(function (this: RenderTargetTexture) {
      seen.push((this.renderList ?? [])[0].metadata.bodyLight);
    });
    const { shots: s } = shots();
    const done = s.shoot({
      key: 'seed',
      view: VIEW,
      build: async root => {
        const seed = CreateBox('seed', { size: 0.1 }, scene);
        seed.metadata = { bodyLight: colour, shineLit: true };
        seed.parent = root;
        return { dispose: () => seed.dispose() };
      },
    });
    await shot(done);
    render.mockRestore();
    expect(seen).toEqual([colour]);
  });

  it('answers null when the subject cannot be built, and goes on with the next', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = { built: [] as string[], disposed: [] as string[] };
    const { shots: s } = shots();
    const broken = s.shoot({ key: 'broken', view: VIEW, build: async () => { throw new Error('no model'); } });
    const none = s.shoot({ key: 'none', view: VIEW, build: async () => null });
    const next = s.shoot(boxJob('next', log));
    await frames(6);
    expect(await broken).toBeNull();
    expect(await none).toBeNull();
    expect(await next).toBe('blob:4x2');
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('waits for the subject to be ready, a bounded number of frames', async () => {
    const ready = vi.spyOn(RenderTargetTexture.prototype, 'isReadyForRendering').mockReturnValue(false);
    const draws = vi.spyOn(RenderTargetTexture.prototype, 'render');
    const log = { built: [] as string[], disposed: [] as string[] };
    const { shots: s } = shots();
    const done = s.shoot(boxJob('slow', log));
    await frames(10);
    expect(draws).not.toHaveBeenCalled();
    await frames(150);
    expect(await done).toBe('blob:4x2');
    expect(draws).toHaveBeenCalledTimes(1);
    ready.mockRestore();
    draws.mockRestore();
  });
});

// `if (1 == Select) ObjectSelect.Angle[1] = WorldTime * 0.45f` (ZzzInventory.cpp:8856-8859): the item under the
// cursor turns every frame.
describe('the hover spin', () => {
  /** A box job that records the times it is turned to. */
  function spinJob(key: string, log: { built: string[]; disposed: string[] }, turns: number[]): IconShotJob {
    return { ...boxJob(key, log), turn: ms => void turns.push(ms) };
  }

  it('draws one turned picture a frame into one kept buffer, and frees everything when stopped', async () => {
    const log = { built: [] as string[], disposed: [] as string[] };
    const turns: number[] = [];
    const painted: Uint8ClampedArray[] = [];
    const cameras = scene.cameras.length;
    const textures = scene.textures.length;
    // Babylon drops a removed observer on the next task: let the earlier tests' go first.
    await new Promise(resolve => setTimeout(resolve, 0));
    const idle = scene.onAfterRenderObservable.observers.length;
    const { shots: s, readNow } = shots();
    const stop = s.spin(spinJob('spin', log, turns), pixels => void painted.push(pixels));
    const perFrame: number[] = [];
    for (let i = 0; i < 12; i++) {
      const before = painted.length;
      await frames(1);
      perFrame.push(painted.length - before);
    }
    // Every frame once it is ready (the shaders may take a few), never twice in one.
    expect(Math.max(...perFrame)).toBe(1);
    expect(perFrame.slice(perFrame.indexOf(1))).not.toContain(0);
    expect(readNow).toHaveBeenCalledTimes(painted.length);
    expect(new Set(painted).size).toBe(1);
    expect(new Set(readNow.mock.calls.map(call => call[2])).size).toBe(1);
    expect(turns).toHaveLength(painted.length);
    expect([...turns].sort((a, b) => a - b)).toEqual(turns);
    // The read is turned into straight alpha, top-down, as the still picture is.
    expect([...painted[0].subarray(0, 4)]).toEqual([255, 255, 255, 255]);

    stop();
    const drawn = painted.length;
    await frames(3);
    expect(painted).toHaveLength(drawn);
    expect(log.disposed).toEqual(['spin']);
    expect(scene.cameras.length).toBe(cameras);
    expect(scene.textures.length).toBe(textures);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(scene.onAfterRenderObservable.observers.length).toBe(idle);
  });

  it('spins one item at a time', async () => {
    const log = { built: [] as string[], disposed: [] as string[] };
    const { shots: s } = shots();
    const first: Uint8ClampedArray[] = [];
    const second: Uint8ClampedArray[] = [];
    s.spin(spinJob('first', log, []), pixels => void first.push(pixels));
    await frames(4);
    const stop = s.spin(spinJob('second', log, []), pixels => void second.push(pixels));
    const firstDrawn = first.length;
    await frames(8);
    expect(first).toHaveLength(firstDrawn);
    expect(second.length).toBeGreaterThan(0);
    expect(log.disposed).toEqual(['first']);
    stop();
    expect(log.disposed).toEqual(['first', 'second']);
  });

  it('draws nothing and keeps nothing when stopped before its model is in', async () => {
    const log = { built: [] as string[], disposed: [] as string[] };
    const nodes = scene.transformNodes.length;
    const { shots: s } = shots();
    const painted: Uint8ClampedArray[] = [];
    s.spin(spinJob('early', log, []), pixels => void painted.push(pixels))();
    await frames(3);
    expect(painted).toEqual([]);
    expect(log.disposed).toEqual(['early']);
    expect(scene.transformNodes.length).toBe(nodes);
  });
});

describe('iconPixels', () => {
  it('turns the bottom-up read into top-down rows', () => {
    // 1 x 2: bottom row red, top row green, both opaque.
    const read = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]);
    expect([...iconPixels(read, 1, 2, false)]).toEqual([0, 255, 0, 255, 255, 0, 0, 255]);
  });

  it('gives an additive glow over the clear its own alpha, so it shows over a dark bag', () => {
    // Additive drew colour and left the cleared alpha at 0; the blended pixel is premultiplied.
    const read = new Uint8Array([200, 100, 0, 0, 64, 32, 0, 128]);
    expect([...iconPixels(read, 2, 1, false)]).toEqual([255, 128, 0, 200, 128, 64, 0, 128]);
  });

  it('rewrites a kept buffer whole, the cleared pixels too', () => {
    const out = new Uint8ClampedArray(8).fill(9);
    expect(iconPixels(new Uint8Array([255, 0, 0, 255, 0, 0, 0, 0]), 2, 1, false, out)).toBe(out);
    expect([...out]).toEqual([255, 0, 0, 255, 0, 0, 0, 0]);
  });

  it('encodes a linear frame buffer to the display curve first', () => {
    const read = new Uint8Array([0, 0, 0, 255, 55, 55, 55, 255]);
    const out = iconPixels(read, 2, 1, true);
    expect(out[0]).toBe(0);
    // (55 / 255) ^ (1 / 2.2) = 0.497
    expect(out[4]).toBe(127);
    expect(out[7]).toBe(255);
  });
});
