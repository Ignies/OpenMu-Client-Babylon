import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import {
  ArcRotateCamera,
  Color3,
  CreateBox,
  HighlightLayer,
  Matrix,
  Plane,
  Scene,
  Vector3,
  type AbstractMesh,
  type Mesh,
} from '../libs/babylon/exports';
import {
  boneBoxesFrom,
  cullHighlightMask,
  cullableByBounds,
  extendBoxRect,
  extendSkinnedRect,
  rectFrustumToRef,
  resetRect,
  selectMaskMeshes,
  type ScreenRect,
} from './highlightMask';

function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function newRect(): ScreenRect {
  return resetRect({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
}

function project(p: Vector3, m: Matrix): { x: number; y: number; w: number } {
  const e = m.m;
  const w = p.x * e[3] + p.y * e[7] + p.z * e[11] + e[15];

  return {
    x: (p.x * e[0] + p.y * e[4] + p.z * e[8] + e[12]) / w,
    y: (p.x * e[1] + p.y * e[5] + p.z * e[9] + e[13]) / w,
    w,
  };
}

describe('boneBoxesFrom', () => {
  it('boxes each vertex under the one bone that moves it', () => {
    const positions = [0, 0, 0, 1, 2, 3, -1, 5, 0, 7, 7, 7];
    const indices = [0, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 1, 3, 0, 0];
    const weights = [1, 0, 0, 0, 1, 0, 0, 0, 0.5, 0, 0, 0, 0, 1, 0, 0];
    const boxes = boneBoxesFrom(positions, indices, weights, 1) as Float32Array;

    expect(boxes).not.toBeNull();
    expect(boxes.length).toBe(3 * 6);
    expect(Array.from(boxes.subarray(0, 6))).toEqual([0, 0, 0, 0, 0, 0]);
    // The last vertex's only live weight is in the second influence, which
    // one influencer never reads: it skins to the clip origin.
    expect(boxes[6]).toBe(Number.POSITIVE_INFINITY);
    expect(Array.from(boxes.subarray(12, 18))).toEqual([-1, 2, 0, 1, 5, 3]);
  });

  it('reads the influence the shader reads', () => {
    const positions = [7, 7, 7];
    const indices = [1, 3, 0, 0];
    const weights = [0, 1, 0, 0];
    const boxes = boneBoxesFrom(positions, indices, weights, 2) as Float32Array;

    expect(boxes).not.toBeNull();
    expect(boxes.length).toBe(4 * 6);
    expect(Array.from(boxes.subarray(18, 24))).toEqual([7, 7, 7, 7, 7, 7]);
  });

  it('refuses blends and negative weights', () => {
    const positions = [1, 1, 1];

    expect(
      boneBoxesFrom(positions, [0, 1, 0, 0], [0.5, 0.5, 0, 0], 2)
    ).toBeNull();
    expect(boneBoxesFrom(positions, [0, 0, 0, 0], [-1, 0, 0, 0], 1)).toBeNull();
    expect(boneBoxesFrom(positions, [0, 0, 0, 0], [1, 0, 0, 0], 5)).toBeNull();
  });
});

describe('highlight mask selection', () => {
  let engine: NullEngine;
  let scene: Scene;
  let camera: ArcRotateCamera;

  beforeEach(() => {
    engine = new NullEngine({
      renderWidth: 1280,
      renderHeight: 720,
      textureSize: 512,
      deterministicLockstep: false,
      lockstepMaxSteps: 1,
    });
    scene = new Scene(engine);
    camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 2.5,
      20,
      Vector3.Zero(),
      scene
    );
    camera.minZ = 0.1;
    camera.maxZ = 5000;
    camera.getViewMatrix();
  });

  afterEach(() => {
    engine.dispose();
  });

  function viewProjection(): Matrix {
    return camera.getViewMatrix().multiply(camera.getProjectionMatrix());
  }

  function box(name: string, at: Vector3, size = 1): Mesh {
    const mesh = CreateBox(name, { size }, scene);
    mesh.position.copyFrom(at);
    mesh.computeWorldMatrix(true);

    return mesh;
  }

  function planes(): Plane[] {
    return [0, 1, 2, 3, 4, 5].map(() => new Plane(0, 0, 0, 0));
  }

  it('bounds a box by its projected corners', () => {
    const vp = viewProjection();
    const rect = newRect();
    const local = [-1, -1, -1, 1, 1, 1];

    expect(extendBoxRect(local, 0, vp, rect)).toBe(true);

    for (let c = 0; c < 8; c++) {
      const p = project(
        new Vector3(c & 1 ? 1 : -1, c & 2 ? 1 : -1, c & 4 ? 1 : -1),
        vp
      );
      expect(p.x).toBeGreaterThanOrEqual(rect.minX);
      expect(p.x).toBeLessThanOrEqual(rect.maxX);
      expect(p.y).toBeGreaterThanOrEqual(rect.minY);
      expect(p.y).toBeLessThanOrEqual(rect.maxY);
    }

    // A box around the eye has no screen box.
    const eye = camera.position;
    const around = [
      eye.x - 1,
      eye.y - 1,
      eye.z - 1,
      eye.x + 1,
      eye.y + 1,
      eye.z + 1,
    ];
    expect(extendBoxRect(around, 0, vp, newRect())).toBe(false);
  });

  it('poses each bone box by its own matrix', () => {
    const vp = viewProjection();
    const boxes = new Float32Array([
      -0.5, -0.5, -0.5, 0.5, 0.5, 0.5,
      Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity,
      -0.5, -0.5, -0.5, 0.5, 0.5, 0.5,
    ]);
    const matrices = new Float32Array(16 * 3);
    Matrix.Identity().copyToArray(matrices, 0);
    Matrix.Translation(100, 0, 0).copyToArray(matrices, 16);
    Matrix.Translation(3, 0, 0).copyToArray(matrices, 32);

    const skinned = newRect();
    expect(extendSkinnedRect(boxes, matrices, vp, skinned)).toBe(true);

    const expected = newRect();
    extendBoxRect([-0.5, -0.5, -0.5, 0.5, 0.5, 0.5], 0, vp, expected);
    extendBoxRect([2.5, -0.5, -0.5, 3.5, 0.5, 0.5], 0, vp, expected);

    expect(skinned.minX).toBeCloseTo(expected.minX, 5);
    expect(skinned.maxX).toBeCloseTo(expected.maxX, 5);
    expect(skinned.minY).toBeCloseTo(expected.minY, 5);
    expect(skinned.maxY).toBeCloseTo(expected.maxY, 5);

    // A slot past the matrices the skeleton hands over is not bounded.
    expect(
      extendSkinnedRect(boxes, matrices.subarray(0, 32), vp, newRect())
    ).toBe(false);
  });

  it('keeps what reaches the lit box, in the active order', () => {
    const lit = box('lit', Vector3.Zero(), 2);
    const front = box('front', new Vector3(0.5, 0.5, -3));
    const farLeft = box('farLeft', new Vector3(-12, 0, 0));
    const farRight = box('farRight', new Vector3(12, 0, 0));
    const behind = box('behind', new Vector3(0, 0, 4));
    const effect = box('effect', new Vector3(12, 5, 0));
    effect.alwaysSelectAsActiveMesh = true;

    const list: AbstractMesh[] = [
      farLeft,
      front,
      effect,
      lit,
      farRight,
      behind,
    ];
    const out: AbstractMesh[] = [];
    const selected = selectMaskMeshes(
      list,
      list.length,
      mesh => mesh === lit,
      viewProjection(),
      planes(),
      out
    );

    expect(selected).toBe(out);
    expect(out.map(m => m.name)).toEqual(['front', 'effect', 'lit', 'behind']);
  });

  it('leaves the mask empty when nothing lit is active', () => {
    const other = box('other', Vector3.Zero());
    const out: AbstractMesh[] = [other];

    expect(
      selectMaskMeshes([other], 1, () => false, viewProjection(), planes(), out)
    ).toEqual([]);
  });

  it('draws the whole list when the lit box cannot be bounded', () => {
    const lit = box('lit', camera.position.clone(), 2);
    const other = box('other', Vector3.Zero());

    expect(
      selectMaskMeshes(
        [other, lit],
        2,
        mesh => mesh === lit,
        viewProjection(),
        planes(),
        []
      )
    ).toBeNull();
  });

  it('only trusts boxes the camera itself culls by', () => {
    const plain = box('plain', Vector3.Zero());
    expect(cullableByBounds(plain)).toBe(true);

    plain.doNotSyncBoundingInfo = true;
    expect(cullableByBounds(plain)).toBe(false);

    const rewritten = CreateBox('rewritten', { updatable: true }, scene);
    expect(cullableByBounds(rewritten)).toBe(false);

    const chunk = box('chunk', Vector3.Zero());
    chunk.forcedInstanceCount = 1;
    expect(cullableByBounds(chunk)).toBe(false);

    chunk.doNotSyncBoundingInfo = true;
    expect(cullableByBounds(chunk)).toBe(true);

    chunk.alwaysSelectAsActiveMesh = true;
    expect(cullableByBounds(chunk)).toBe(false);
  });

  it('never drops a box that projects into the lit box', () => {
    const rand = mulberry32(5);
    const vp = viewProjection();
    const narrowed = planes();
    let dropped = 0;
    let kept = 0;

    for (let trial = 0; trial < 40; trial++) {
      const lit = box(
        `lit${trial}`,
        new Vector3(
          (rand() - 0.5) * 10,
          (rand() - 0.5) * 6,
          (rand() - 0.5) * 10
        ),
        0.5 + rand() * 2
      );
      const rect = newRect();
      const local = lit.getBoundingInfo().boundingBox;
      const bounded = extendBoxRect(
        [
          local.minimum.x, local.minimum.y, local.minimum.z,
          local.maximum.x, local.maximum.y, local.maximum.z,
        ],
        0,
        lit.getWorldMatrix().multiply(vp),
        rect
      );
      expect(bounded).toBe(true);
      rectFrustumToRef(vp, rect, narrowed);

      for (let k = 0; k < 25; k++) {
        const size = 0.2 + rand() * 3;
        const other = box(
          `o${trial}_${k}`,
          new Vector3(
            (rand() - 0.5) * 30,
            (rand() - 0.5) * 16,
            (rand() - 0.5) * 30
          ),
          size
        );

        if (other.isInFrustum(narrowed)) {
          kept++;
          other.dispose();
          continue;
        }

        dropped++;

        // Dropped: no point of it may land inside the lit box on screen.
        const world = other.getWorldMatrix();
        const half = size / 2;
        for (let s = 0; s < 72; s++) {
          const local =
            s < 8
              ? new Vector3(
                  s & 1 ? half : -half,
                  s & 2 ? half : -half,
                  s & 4 ? half : -half
                )
              : new Vector3(
                  (rand() - 0.5) * size,
                  (rand() - 0.5) * size,
                  (rand() - 0.5) * size
                );
          const p = Vector3.TransformCoordinates(local, world);
          const q = project(p, vp);
          if (q.w <= camera.minZ) continue;

          const inside =
            q.x >= rect.minX &&
            q.x <= rect.maxX &&
            q.y >= rect.minY &&
            q.y <= rect.maxY;
          expect(inside).toBe(false);
        }

        other.dispose();
      }

      lit.dispose();
    }

    expect(dropped).toBeGreaterThan(200);
    expect(kept).toBeGreaterThan(50);
  });

  it('keeps the list on the layer through a resize', () => {
    const hl = new HighlightLayer('hl', scene, {
      isStroke: true,
      alphaBlendingMode: 1,
      mainTextureRatio: 1,
    });

    cullHighlightMask(scene, hl);

    const install = hl.mainTexture.getCustomRenderList;
    expect(install).toBeTypeOf('function');
    expect(hl.mainTexture.forceLayerMaskCheck).toBe(true);

    // What EffectLayer.render does on a size change.
    const layer = hl as unknown as {
      _disposeTextureAndPostProcesses(): void;
      _createMainTexture(): void;
    };
    const before = hl.mainTexture;
    layer._disposeTextureAndPostProcesses();
    layer._createMainTexture();

    expect(hl.mainTexture).not.toBe(before);
    expect(hl.mainTexture.getCustomRenderList).toBe(install);
    expect(hl.mainTexture.forceLayerMaskCheck).toBe(true);
    expect(hl.mainTexture.renderList).toBeNull();
  });

  it('narrows what the layer draws in a real frame', () => {
    const hl = new HighlightLayer('hl', scene, {
      isStroke: true,
      alphaBlendingMode: 1,
      mainTextureRatio: 1,
    });
    cullHighlightMask(scene, hl);

    const lit = box('lit', Vector3.Zero(), 2);
    box('farLeft', new Vector3(-12, 0, 0));
    box('front', new Vector3(0.5, 0.5, -3));
    hl.addMesh(lit, Color3.Red());

    const drawn: string[][] = [];
    const install = hl.mainTexture.getCustomRenderList;
    if (!install) throw new Error('no list installed');

    hl.mainTexture.getCustomRenderList = (pass, list, length) => {
      // The layer hands over the camera's active meshes.
      expect(list).toBe(scene.getActiveMeshes().data);
      expect(length).toBe(scene.getActiveMeshes().length);

      const out = install(pass, list, length);
      drawn.push(out ? out.map(m => m.name) : ['<all>']);

      return out;
    };

    scene.render();

    expect(drawn).toEqual([['lit', 'front']]);
  });
});
