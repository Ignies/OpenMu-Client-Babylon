import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import {
  ArcRotateCamera,
  BoundingInfo,
  CascadedShadowGenerator,
  CreateBox,
  Scene,
  TransformNode,
  Vector3,
  type AbstractMesh,
} from '../libs/babylon/exports';
import {
  CsmBounds,
  ReceiverBox,
  babylonBoxProbe,
  runBabylonCasterBox,
  shadowReceiverChanged,
  shadowReceiversChanged,
  type CsmBoundsTarget,
} from './csmBounds';

/** Deterministic, so a failing sequence can be replayed. */
function prng(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Babylon's own box function over `list` and the scene's receivers. */
function babylonBox(scene: Scene, list: AbstractMesh[]): number[] {
  const probe = babylonBoxProbe(scene);

  runBabylonCasterBox(probe, { renderList: list } as never);

  return [...probe._scbiMin.asArray(), ...probe._scbiMax.asArray()];
}

function boxOf(min: Vector3, max: Vector3): number[] {
  return [...min.asArray(), ...max.asArray()];
}

describe('the Babylon surface the box stands on', () => {
  it('still has the box function and the freeze switch', () => {
    const proto = CascadedShadowGenerator.prototype as unknown as Record<
      string,
      unknown
    >;

    expect(typeof proto._computeShadowCastersBoundingInfo).toBe('function');
    expect(
      Object.getOwnPropertyDescriptor(
        CascadedShadowGenerator.prototype,
        'freezeShadowCastersBoundingInfo'
      )?.set
    ).toBeTypeOf('function');
  });
});

describe('receiver box', () => {
  let engine: NullEngine;
  let scene: Scene;
  let rng: () => number;
  let serial = 0;

  const place = (mesh: AbstractMesh) => {
    mesh.position.set(
      (rng() - 0.5) * 200,
      (rng() - 0.5) * 20,
      (rng() - 0.5) * 200
    );
    mesh.scaling.set(0.2 + rng() * 4, 0.2 + rng() * 4, 0.2 + rng() * 4);
  };

  const spawn = (parent: TransformNode | null = null): AbstractMesh => {
    const mesh = CreateBox(`box${serial++}`, { size: 1 }, scene);

    // Set in the same task as the add, the way a prop chunk is built.
    mesh.receiveShadows = rng() < 0.6;
    mesh.isVisible = rng() < 0.85;
    mesh.parent = parent;
    place(mesh);
    if (rng() < 0.2) mesh.setEnabled(false);

    return mesh;
  };

  const frame = () => scene.render();

  beforeEach(() => {
    engine = new NullEngine({
      renderWidth: 640,
      renderHeight: 360,
      textureSize: 256,
      deterministicLockstep: false,
      lockstepMaxSteps: 1,
    });
    scene = new Scene(engine);
    new ArcRotateCamera('camera', 0, 1, 50, Vector3.Zero(), scene);
    rng = prng(7);
    serial = 0;
  });

  afterEach(() => {
    engine.dispose();
  });

  it.each([7, 11, 23, 101, 4242])(
    'matches Babylon through adds, moves, hides, removals and new bounds (seed %i)',
    seed => {
      rng = prng(seed);

      const groups = [0, 1, 2].map(i => new TransformNode(`group${i}`, scene));
      for (let i = 0; i < 80; i++) spawn(rng() < 0.3 ? groups[i % 3] : null);

      frame();

      const receivers = new ReceiverBox(scene);

      for (let step = 0; step < 400; step++) {
        const meshes = scene.meshes;
        const pick = meshes[Math.floor(rng() * meshes.length)];
        const roll = rng();

        if (roll < 0.15) {
          spawn(rng() < 0.3 ? groups[step % 3] : null);
        } else if (roll < 0.25 && pick) {
          pick.dispose();
        } else if (roll < 0.45 && pick) {
          place(pick);
        } else if (roll < 0.55) {
          const group = groups[step % 3];
          group.position.x += (rng() - 0.5) * 60;
          group.rotation.y += rng();
        } else if (roll < 0.7 && pick) {
          pick.isVisible = !pick.isVisible;
          shadowReceiverChanged(pick);
        } else if (roll < 0.8 && pick) {
          // What a map object's load does: flags on a mesh the scene holds.
          pick.receiveShadows = !pick.receiveShadows;
          shadowReceiversChanged();
        } else if (roll < 0.9 && pick) {
          const lo = new Vector3(-rng() * 3, -rng() * 3, -rng() * 3);
          const hi = new Vector3(rng() * 3, rng() * 3, rng() * 3);
          pick.setBoundingInfo(new BoundingInfo(lo, hi, pick.getWorldMatrix()));
          shadowReceiverChanged(pick);
        } else if (pick) {
          // No notice: Babylon's sweep counts disabled receivers too.
          pick.setEnabled(!pick.isEnabled(false));
        }

        // World matrices move in the frame's active-mesh pass, after the box.
        if (rng() < 0.5) frame();

        receivers.settle();

        expect(boxOf(receivers.min, receivers.max), `step ${step}`).toEqual(
          babylonBox(scene, [])
        );
      }

      // Most steps were settled from the queue, not by a sweep.
      expect(receivers.rebuilds).toBeLessThan(250);

      receivers.dispose();
    }
  );

  it('shrinks when the receiver on a face moves in', () => {
    const outer = CreateBox('outer', { size: 1 }, scene);
    const inner = CreateBox('inner', { size: 1 }, scene);
    outer.receiveShadows = true;
    inner.receiveShadows = true;
    outer.position.set(40, 0, 0);
    frame();

    const receivers = new ReceiverBox(scene);
    receivers.settle();
    expect(receivers.max.x).toBe(40.5);

    outer.position.set(0, 0, 0);
    frame();
    receivers.settle();

    expect(receivers.max.x).toBe(0.5);
    expect(boxOf(receivers.min, receivers.max)).toEqual(babylonBox(scene, []));

    receivers.dispose();
  });

  it('reports a change nothing announced on the next resync', () => {
    for (let i = 0; i < 20; i++) spawn();
    frame();

    const receivers = new ReceiverBox(scene);
    receivers.settle();

    const late = CreateBox('late', { size: 1 }, scene);
    late.position.set(500, 0, 0);
    frame();
    receivers.settle();

    // A load that turns a mesh into a receiver without saying so.
    late.receiveShadows = true;
    late.isVisible = true;
    receivers.settle();

    expect(receivers.resync()).toBe(true);
    expect(boxOf(receivers.min, receivers.max)).toEqual(babylonBox(scene, []));

    receivers.dispose();
  });

  it('writes the same box Babylon would, from the same slot, casters included', () => {
    for (let i = 0; i < 60; i++) spawn();

    const casters: AbstractMesh[] = [];
    for (let i = 0; i < 12; i++) {
      const mover = CreateBox(`mover${i}`, { size: 2 }, scene);
      place(mover);
      casters.push(mover);
    }

    const list: AbstractMesh[] = [];
    const target = {
      freezeShadowCastersBoundingInfo: false,
      getShadowMap: () => ({ renderList: list }),
      shadowCastersBoundingInfo: new BoundingInfo(Vector3.Zero(), Vector3.Zero()),
    };

    const bounds = new CsmBounds(
      target as unknown as CsmBoundsTarget,
      scene,
      true
    );

    expect(target.freezeShadowCastersBoundingInfo).toBe(true);

    // The render-list driver's fill, after the box: next frame reads it.
    scene.onBeforeRenderTargetsRenderObservable.add(() => {
      let n = 0;
      for (const mesh of scene.meshes) {
        if (rng() < 0.5 || casters.includes(mesh)) list[n++] = mesh;
      }
      list.length = n;
    });

    for (let f = 0; f < 200; f++) {
      for (const mover of casters) {
        mover.position.x += (rng() - 0.5) * 30;
        mover.position.y += (rng() - 0.5) * 30;
      }

      if (f % 7 === 0) spawn();
      if (f % 11 === 0) scene.meshes[Math.floor(rng() * scene.meshes.length)]?.dispose();

      frame();
    }

    const stats = bounds.stats();

    expect(stats.mismatches).toBe(0);
    expect(stats.drifts).toBe(0);
    expect(stats.frames).toBe(200);

    // With only the movers moving, the receivers are never swept again but
    // for the safety-net resync.
    for (let f = 0; f < 64; f++) {
      for (const mover of casters) mover.position.x += (rng() - 0.5) * 30;
      frame();
    }

    expect(bounds.stats().rebuilds).toBe(stats.rebuilds + 1);
    expect(bounds.stats().mismatches).toBe(0);

    bounds.dispose();
  });

  it('keeps a listed receiver the scene no longer holds, as Babylon does', () => {
    const far = CreateBox('far', { size: 1 }, scene);
    far.receiveShadows = true;
    far.position.set(300, 0, 0);

    const list: AbstractMesh[] = [far];
    const target = {
      freezeShadowCastersBoundingInfo: false,
      getShadowMap: () => ({ renderList: list }),
      shadowCastersBoundingInfo: new BoundingInfo(Vector3.Zero(), Vector3.Zero()),
    };
    const bounds = new CsmBounds(
      target as unknown as CsmBoundsTarget,
      scene,
      true
    );

    frame();
    scene.removeMesh(far);
    frame();

    expect(target.shadowCastersBoundingInfo.maximum.x).toBe(300.5);
    expect(bounds.stats().mismatches).toBe(0);

    bounds.dispose();
  });
});
