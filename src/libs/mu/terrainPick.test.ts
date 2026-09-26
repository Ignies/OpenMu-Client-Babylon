import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import {
  ArcRotateCamera,
  type Mesh,
  Ray,
  Scene,
  StandardMaterial,
  Vector3,
} from '../babylon/exports';
import {
  buildGroundArrays,
  type GroundArrays,
} from '../../common/terrain/groundArrays';
import { TERRAIN_SIZE, TWFlags } from '../../common/terrain/consts';
import type { World } from '../../ecs/world';
import { createGroundMesh } from './customGroundMesh';
import { TerrainPicker, pickGround, type TerrainHit } from './terrainPick';

const N = TERRAIN_SIZE;

function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hills, sharp ridges, a cliffed plateau, NoGround holes, an odd last row. */
function syntheticGround(): GroundArrays {
  const rand = mulberry32(7);
  const height = new Float32Array(N * N);
  const flags = new Uint16Array(N * N);

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let h =
        1.5 +
        Math.sin(x * 0.11) * 1.2 +
        Math.cos(y * 0.07) * 0.9 +
        (rand() - 0.5) * 0.6;
      if (x % 16 === 8) h += 4;
      if (y % 24 === 12) h += 3;
      if (x >= 150 && x < 180 && y >= 150 && y < 175) h += 6;
      height[y * N + x] = h;
      if (rand() < 0.01) flags[y * N + x] |= TWFlags.NoGround;
      if (rand() < 0.2) flags[y * N + x] |= TWFlags.NoMove;
    }
  }

  for (let y = 100; y < 120; y++) {
    for (let x = 60; x < 90; x++) flags[y * N + x] |= TWFlags.NoGround;
  }

  for (let i = 0; i < N; i++) {
    height[i * N + N - 1] = 9 + (i % 3);
    height[(N - 1) * N + i] = 8 - (i % 5) * 0.5;
  }

  return buildGroundArrays(
    height,
    flags,
    new Uint8Array(N * N),
    new Uint8Array(N * N).fill(255),
    new Uint8Array(N * N),
    new Float32Array(0),
    0
  );
}

function rayFrom(
  origin: Vector3,
  target: Vector3,
  length = Number.MAX_VALUE
): Ray {
  return new Ray(origin, target.subtract(origin).normalize(), length);
}

function orbit(
  target: Vector3,
  radius: number,
  pitchDeg: number,
  yaw: number
): Vector3 {
  const pitch = (pitchDeg * Math.PI) / 180;
  return new Vector3(
    target.x + Math.cos(yaw) * Math.cos(pitch) * radius,
    target.y + Math.sin(pitch) * radius,
    target.z + Math.sin(yaw) * Math.cos(pitch) * radius
  );
}

/** Camera-like rays plus the cases the grid march has to get right. */
function testRays(): Ray[] {
  const rand = mulberry32(11);
  const rays: Ray[] = [];
  const target = () =>
    new Vector3(-4 + rand() * (N + 8), 1 + rand() * 4, -4 + rand() * (N + 8));

  // Camera rays, any pitch.
  for (let i = 0; i < 180; i++) {
    const t = target();
    rays.push(
      rayFrom(orbit(t, 8 + rand() * 40, 10 + rand() * 80, rand() * 7), t)
    );
  }

  // Grazing rays over the ridges: the ground is crossed twice or more.
  for (let i = 0; i < 120; i++) {
    const t = new Vector3(rand() * N, 3 + rand() * 6, rand() * N);
    rays.push(
      rayFrom(orbit(t, 20 + rand() * 60, 0.5 + rand() * 6, rand() * 7), t)
    );
  }

  // From underneath: two-sided.
  for (let i = 0; i < 30; i++) {
    const t = target();
    rays.push(
      rayFrom(orbit(t, 6 + rand() * 20, -(15 + rand() * 70), rand() * 7), t)
    );
  }

  // Straight down on corners, edges and centres: shared edges, the epsilon
  // overhang, ties, NoGround at -10000 and the 255 border.
  const down = new Vector3(0, -1, 0);
  for (const fx of [0, 0.5, 0.0004, 0.9996]) {
    for (const fz of [0, 0.5, 0.0004, 0.9996]) {
      for (const [x, z] of [
        [70, 110],
        [8, 12],
        [255, 40],
        [40, 255],
        [255, 255],
        [0, 0],
        [150, 160],
        [179, 174],
        [128, 131],
      ]) {
        rays.push(new Ray(new Vector3(x + fx, 50, z + fz), down.clone()));
      }
    }
  }

  // Aimed exactly at tile edges and corners, obliquely.
  for (let i = 0; i < 80; i++) {
    const x = Math.floor(rand() * N);
    const z = Math.floor(rand() * N);
    const t = new Vector3(
      i % 2 ? x : x + rand(),
      2 + rand() * 3,
      i % 3 ? z : z + rand()
    );
    rays.push(
      rayFrom(orbit(t, 10 + rand() * 20, 20 + rand() * 60, rand() * 7), t)
    );
  }

  // Over the NoGround hole.
  for (let i = 0; i < 40; i++) {
    const t = new Vector3(58 + rand() * 34, rand() * 3, 98 + rand() * 24);
    rays.push(
      rayFrom(orbit(t, 10 + rand() * 30, 30 + rand() * 60, rand() * 7), t)
    );
  }

  // Finite lengths, some too short to reach the ground.
  for (let i = 0; i < 60; i++) {
    const t = target();
    const origin = orbit(t, 10 + rand() * 30, 20 + rand() * 60, rand() * 7);
    const reach = Vector3.Distance(origin, t) * (0.3 + rand() * 1.2);
    rays.push(rayFrom(origin, t, reach));
  }

  // From outside the map, low, and along the border rows.
  for (let i = 0; i < 40; i++) {
    const side = i % 4;
    const along = rand() * N;
    const origin = new Vector3(
      side === 0 ? -20 : side === 1 ? N + 20 : along,
      4 + rand() * 12,
      side === 2 ? -20 : side === 3 ? N + 20 : along
    );
    const t = new Vector3(
      side < 2 ? (side === 0 ? rand() * 8 : N - rand() * 8) : along,
      rand() * 6,
      side >= 2 ? (side === 2 ? rand() * 8 : N - rand() * 8) : along
    );
    rays.push(rayFrom(origin, t));
  }

  // Unnormalised direction, a sky ray and a zero one.
  for (let i = 0; i < 10; i++) {
    const t = target();
    const origin = orbit(t, 20, 45, rand() * 7);
    rays.push(new Ray(origin, t.subtract(origin).normalize().scale(2.5)));
  }
  rays.push(new Ray(new Vector3(128, 3, 128), new Vector3(0.3, 1, 0.2)));
  rays.push(new Ray(new Vector3(128, 20, 128), Vector3.Zero()));

  return rays;
}

type Brute = { distance: number; faceId: number; first: number } | null;

/** `subMesh._intersectTriangles` with fastCheck off, plus its first hit. */
function bruteForce(ray: Ray, points: Vector3[], indices: Uint32Array): Brute {
  let best: Brute = null;
  for (let i = 0, faceId = 0; i < indices.length; i += 3, faceId++) {
    const info = ray.intersectsTriangle(
      points[indices[i]],
      points[indices[i + 1]],
      points[indices[i + 2]]
    );
    if (!info || info.distance < 0) continue;
    if (!best) best = { distance: info.distance, faceId, first: faceId };
    else if (info.distance < best.distance) {
      best.distance = info.distance;
      best.faceId = faceId;
    }
  }
  return best;
}

describe('terrain pick', () => {
  let engine: NullEngine;
  let scene: Scene;
  let arrays: GroundArrays;
  let mesh: Mesh;
  let picker: TerrainPicker;

  beforeAll(() => {
    engine = new NullEngine({
      renderWidth: 1280,
      renderHeight: 720,
      textureSize: 512,
      deterministicLockstep: false,
      lockstepMaxSteps: 1,
    });
    scene = new Scene(engine);
    arrays = syntheticGround();
    mesh = createGroundMesh('ground', scene, arrays);
    mesh.material = new StandardMaterial('ground', scene);
    mesh.computeWorldMatrix(true);
    picker = new TerrainPicker(arrays.positions);
  });

  afterAll(() => {
    engine.dispose();
  });

  it('finds the nearest hit Babylon finds, bit for bit', () => {
    const points: Vector3[] = [];
    for (let i = 0; i < arrays.positions.length; i += 3) {
      points.push(Vector3.FromArray(arrays.positions, i));
    }

    const hit: TerrainHit = { distance: 0, faceId: -1, point: new Vector3() };
    const mismatches: string[] = [];
    let hits = 0;
    let firstHitWasFarther = 0;

    const rays = testRays();
    for (const [i, ray] of rays.entries()) {
      const found = picker.raycast(ray, hit);
      const mine = found
        ? [hit.faceId, hit.point.x, hit.point.y, hit.point.z]
        : null;

      const info = mesh.intersects(ray, false);
      const at = info.hit ? info.pickedPoint : null;
      const theirs = at ? [info.faceId, at.x, at.y, at.z] : null;

      if (JSON.stringify(mine) !== JSON.stringify(theirs)) {
        mismatches.push(`ray ${i}: ${JSON.stringify({ mine, theirs })}`);
        continue;
      }
      if (!found) continue;
      hits++;

      const brute = bruteForce(ray, points, arrays.indices);
      if (
        !brute ||
        brute.distance !== hit.distance ||
        brute.faceId !== hit.faceId
      ) {
        mismatches.push(`ray ${i}: brute ${JSON.stringify(brute)}`);
      } else if (brute.first !== brute.faceId) {
        firstHitWasFarther++;
      }
    }

    expect(mismatches).toEqual([]);
    expect(hits).toBeGreaterThan(rays.length / 2);
    // The old fastCheck pick returned the first hit in index order.
    console.info(
      `terrain pick: ${hits}/${rays.length} rays hit, ` +
        `${firstHitWasFarther} of them not first in index order`
    );
  }, 120_000);

  it('picks what scene.pick picks through the camera', () => {
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 3,
      Math.PI / 3.2,
      22,
      new Vector3(165, 5, 160),
      scene
    );
    camera.minZ = 0.1;
    camera.maxZ = 5000;
    scene.activeCamera = camera;

    const world = {
      scene,
      terrain: { mesh, picker, MapTileObjects: [], extraHeight: 0 },
    } as unknown as World;

    const mismatches: string[] = [];
    let hits = 0;
    for (let sx = 0; sx < 1280; sx += 160) {
      for (let sy = 0; sy < 720; sy += 90) {
        const x = sx + 13.5;
        const y = sy + 7.25;
        const theirs = scene.pick(x, y, m => m === mesh, false).pickedPoint;
        const point = pickGround(world, x, y);
        if (point) hits++;
        const mine = point ? [point.x, point.y, point.z] : null;
        const expected = theirs ? [theirs.x, theirs.y, theirs.z] : null;
        if (JSON.stringify(mine) !== JSON.stringify(expected)) {
          mismatches.push(`${x},${y}: ${JSON.stringify({ mine, expected })}`);
        }
      }
    }

    expect(mismatches).toEqual([]);
    expect(hits).toBeGreaterThan(32);
  }, 60_000);
});
