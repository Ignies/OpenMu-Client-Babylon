import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PCT_CURVED,
  PCT_HEAVY,
  PCT_RUBBER,
  PCT_RUBBER2,
  PCT_SHORT_SHOULDER,
  PCT_STICKED,
  PhysicsCloth,
  setClothWind,
  stepClothWind,
  windGain,
  type ClothAnchor,
  type ClothMeshShape,
  type ClothMeshSpec,
  type ClothSpec,
} from './physicsCloth';

/**
 * A body standing at `at` facing -y, the wind blowing along `wind`. Its bones are turned the way the
 * cape bone is: bone x up, bone -y backward, bone z across (what `SetFixedVertices`' (z, -y, x) expects).
 */
function anchorAt(at: [number, number, number], wind: [number, number] = [0, 1]): ClothAnchor & { at: number[] } {
  const anchor = {
    at: [...at],
    windX: wind[0],
    windY: wind[1],
    bonePoint(_bone: number, x: number, y: number, z: number, out: Float64Array, i: number) {
      out[i] = anchor.at[0] + z;
      out[i + 1] = anchor.at[1] - y;
      out[i + 2] = anchor.at[2] + x;
    },
    bodyPoint(_bone: number, x: number, y: number, z: number, out: Float64Array, i: number) {
      out[i] = anchor.at[0] + x;
      out[i + 1] = anchor.at[1] + y;
      out[i + 2] = anchor.at[2] + z;
    },
  };
  return anchor;
}

const spec = (over: Partial<ClothSpec> = {}): ClothSpec => ({
  bone: 19,
  at: [0, 0, 0],
  grid: [3, 3],
  size: [20, 10],
  front: 'Player/Robe01.OZJ',
  back: 'Player/Robe02.OZJ',
  flags: 0,
  ...over,
});

const vertex = (cloth: PhysicsCloth, v: number) => [cloth.pos[3 * v], cloth.pos[3 * v + 1], cloth.pos[3 * v + 2]];

/** `Move2(0.005f, 5)` once a 25 Hz frame (ZzzCharacter.cpp:9963-9975). */
const frames = (cloth: PhysicsCloth, anchor: ClothAnchor, count = 1) => {
  for (let t = 0; t < count; t++) if (!cloth.move2(anchor, 0.005, 5, t * 40)) return false;
  return true;
};

afterEach(() => {
  vi.restoreAllMocks();
  setClothWind(0);
});

describe('CPhysicsCloth::Create', () => {
  it('lays the grid 20 behind the body, hanging down, and pins the top row with the same matrix (PhysicsManager.cpp:375-436, :479)', () => {
    const cloth = new PhysicsCloth(spec());
    cloth.create(anchorAt([100, 200, 300]));
    // Row 0 is the pins, (x - w/2 + fx, fy, fz) turned as (z, -y, x) but put through the body's matrix.
    expect([0, 1, 2].map(v => vertex(cloth, v))).toEqual([
      [100, 200, 290],
      [100, 200, 300],
      [100, 200, 310],
    ]);
    // Free rows: (unitW * i - w/2, 20, -unitH * j).
    expect(vertex(cloth, 4)).toEqual([100, 220, 295]);
    expect(vertex(cloth, 8)).toEqual([110, 220, 290]);
  });

  it('narrows the shoulders to 0.6 of the width, widening down to the hem (RATE_SHORT_SHOULDER, :16, :381-386)', () => {
    const cloth = new PhysicsCloth(spec({ size: [100, 10], flags: PCT_SHORT_SHOULDER }));
    cloth.create(anchorAt([0, 0, 0]));
    // The pins span 60 (laid along z at creation), the middle row 80, the hem 100.
    expect(vertex(cloth, 2)[2] - vertex(cloth, 0)[2]).toBeCloseTo(60);
    expect(vertex(cloth, 5)[0] - vertex(cloth, 3)[0]).toBeCloseTo(80);
    expect(vertex(cloth, 8)[0] - vertex(cloth, 6)[0]).toBeCloseTo(100);
  });

  it('curves the edges forward by 10 (PCT_CURVED, :411-418, :540-546)', () => {
    const cloth = new PhysicsCloth(spec({ flags: PCT_CURVED }));
    cloth.create(anchorAt([0, 0, 0]));
    expect([3, 4, 5].map(v => vertex(cloth, v)[1])).toEqual([10, 20, 10]);
    // A pin's y is the bone's -y: the edge pins sit 10 further back than the middle one.
    expect(vertex(cloth, 0)[1] - vertex(cloth, 1)[1]).toBeCloseTo(10);
  });

  it('lays a cloth both curved and sticked out flat: the shape switch matches neither (:411-422, :540-546)', () => {
    const both = new PhysicsCloth(spec({ flags: PCT_CURVED | PCT_STICKED }));
    const flat = new PhysicsCloth(spec());
    both.create(anchorAt([0, 0, 0]));
    flat.create(anchorAt([0, 0, 0]));
    expect(both.pos).toEqual(flat.pos);
  });

  it('links every neighbour, the down diagonals and the up diagonals from the third row on (:449-478)', () => {
    expect(new PhysicsCloth(spec({ grid: [10, 10] })).linkCount).toBe(90 + 90 + 81 + 72);
    expect(new PhysicsCloth(spec({ grid: [10, 10], flags: PCT_RUBBER })).linkCount).toBe(333);
  });
});

describe('CPhysicsVertex::UpdateForce', () => {
  it('blows hardest on the seed vertex and fades to nothing five steps away (PhysicsManager.cpp:60-61)', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(windGain)).toEqual([6, 6, 5, 4, 3, 0, 0]);
  });

  it('pulls with s_Gravity * s_fMass * 100, 180 when heavy, at 1 / s_fMass a unit of force (:18-20, :99-107, :117-129)', () => {
    // The hem: none of its links reach the pins, whose first step stretches theirs.
    const fall = (flags: number) => {
      const cloth = new PhysicsCloth(spec({ grid: [2, 4], size: [10, 30], flags }));
      const anchor = anchorAt([0, 0, 0]);
      cloth.create(anchor);
      cloth.move2(anchor, 0.005, 1, 0);
      return cloth.vel[3 * 6 + 2];
    };
    expect(fall(0)).toBeCloseTo(-9.8 * 0.0025 * 100 * 400 * 0.005);
    expect(fall(PCT_HEAVY)).toBeCloseTo(-9.8 * 0.0025 * 180 * 400 * 0.005);
  });
});

describe('CPhysicsCloth::Move2', () => {
  it('lets a cloth settle straight down under its pins, no vertical link past its rest length', () => {
    const cloth = new PhysicsCloth(spec({ grid: [3, 4], size: [20, 30] }));
    const anchor = anchorAt([0, 0, 0]);
    cloth.create(anchor);
    expect(frames(cloth, anchor, 400)).toBe(true);
    for (let j = 1; j < 4; j++) {
      for (let i = 0; i < 3; i++) {
        const [x, y, z] = vertex(cloth, 3 * j + i);
        expect(x).toBeCloseTo(vertex(cloth, i)[0], 0);
        expect(y).toBeCloseTo(vertex(cloth, i)[1], 0);
        expect(z).toBeLessThan(vertex(cloth, 3 * (j - 1) + i)[2]);
      }
    }
  });

  it('drifts the hem along the wind, behind the body (s_vWind, :609-610)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99999);
    for (let i = 0; i < 30; i++) stepClothWind();
    const cloth = new PhysicsCloth(spec({ grid: [3, 4], size: [20, 30] }));
    const anchor = anchorAt([0, 0, 0], [0, 1]);
    cloth.create(anchor);
    frames(cloth, anchor, 100);
    expect(vertex(cloth, 10)[1]).toBeGreaterThan(5);
  });

  it('keeps the global wind between -0.2 and 1 (CPhysicsManager::Move, :1228-1232)', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99999);
    for (let i = 0; i < 30; i++) stepClothWind();
    random.mockReturnValue(0);
    for (let i = 0; i < 60; i++) stepClothWind();
    const anchor = anchorAt([0, 0, 0], [1, 0]);
    const cloth = new PhysicsCloth(spec({ grid: [2, 3], size: [10, 20] }));
    cloth.create(anchor);
    frames(cloth, anchor, 100);
    // -0.2 blows it a little against the wind's direction.
    expect(vertex(cloth, 4)[0]).toBeLessThan(-5);
    expect(vertex(cloth, 4)[0]).toBeGreaterThan(-15);
  });

  it('gives a rubber2 cloth its own gusts, rand() % max + min hundredths (:586-589)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99999);
    const anchor = anchorAt([0, 0, 0], [0, 1]);
    const calm = new PhysicsCloth(spec({ grid: [2, 3], size: [10, 20], flags: PCT_RUBBER2 }));
    const gusty = new PhysicsCloth(spec({ grid: [2, 3], size: [10, 20], flags: PCT_RUBBER2, wind: [10, 50] }));
    calm.create(anchor);
    gusty.create(anchor);
    frames(calm, anchor, 50);
    frames(gusty, anchor, 50);
    expect(vertex(gusty, 4)[1]).toBeGreaterThan(vertex(calm, 4)[1] + 1);
  });

  it('follows the bone when the body walks on', () => {
    const cloth = new PhysicsCloth(spec({ grid: [3, 4], size: [20, 30] }));
    const anchor = anchorAt([0, 0, 0]);
    cloth.create(anchor);
    frames(cloth, anchor, 100);
    anchor.at[0] = 50;
    frames(cloth, anchor, 200);
    expect(vertex(cloth, 10)[0]).toBeCloseTo(50, 0);
  });

  it('gives up when a link is stretched past 20 times its length, as a warp does (KeepLength, :159-162)', () => {
    const cloth = new PhysicsCloth(spec());
    const anchor = anchorAt([0, 0, 0]);
    cloth.create(anchor);
    expect(frames(cloth, anchor)).toBe(true);
    anchor.at[0] = 10_000;
    expect(frames(cloth, anchor)).toBe(false);
  });

  it('moves the pins and what they drag, nothing else, while stunned or asleep (Move2(0, 5), ZzzCharacter.cpp:9963-9968)', () => {
    const cloth = new PhysicsCloth(spec({ grid: [3, 3] }));
    const anchor = anchorAt([0, 0, 0]);
    cloth.create(anchor);
    frames(cloth, anchor, 200);
    const hem = vertex(cloth, 7);
    anchor.at[2] = 2;
    cloth.move2(anchor, 0, 5, 0);
    expect(vertex(cloth, 1)).toEqual([0, 0, 2]);
    expect(vertex(cloth, 7)[2]).toBeCloseTo(hem[2] + 2, 0);
    expect(vertex(cloth, 7)[1]).toBeCloseTo(hem[1], 1);
  });

  it('pushes the cloth out of its collision spheres (CPhysicsColSphere::ProcessCollision, :276-293)', () => {
    const anchor = anchorAt([0, 0, 0]);
    // The anchor's bone frame undoes the (z, -y, x) turn: the sphere sits 10 behind, 15 down.
    const center = [0, 10, -15];
    const plain = new PhysicsCloth(spec({ grid: [3, 4], size: [20, 30] }));
    const sphere = new PhysicsCloth(spec({ grid: [3, 4], size: [20, 30], spheres: [[0, 10, -15, 20, 17]] }));
    plain.create(anchor);
    sphere.create(anchor);
    frames(plain, anchor, 100);
    frames(sphere, anchor, 100);
    const away = (cloth: PhysicsCloth) => Math.hypot(...vertex(cloth, 7).map((c, k) => c - center[k]));
    expect(away(plain)).toBeLessThan(20);
    expect(away(sphere)).toBeGreaterThan(away(plain) + 2);
  });
});

/**
 * A quad of two triangles: vertices 0 and 1 on the pinned bone 18, 20 apart across, 2 and 3 on bone 5, 10
 * below them. The test anchor turns a bone point (x, y, z) into the world's (z, -y, x).
 */
const QUAD: ClothMeshShape = {
  nodes: Int32Array.from([18, 18, 5, 5]),
  local: Float64Array.from([0, 0, 0, 0, 0, 20, -10, 0, 0, -10, 0, 20]),
  triangles: Int32Array.from([0, 1, 2, 2, 1, 3]),
};
const MESH: ClothMeshSpec = { mesh: 2, bone: 18, flags: PCT_HEAVY };

/** A link list as vertex pairs. */
const pairs = (links: { a: Int32Array; b: Int32Array; count: number }) =>
  Array.from({ length: links.count }, (_, l) => [links.a[l], links.b[l]]);

describe('CPhysicsClothMesh::Create (PhysicsManager.cpp:964-1043)', () => {
  it('lays each vertex where its bone puts it and pins the ones on the cloth\'s bone', () => {
    const cloth = new PhysicsCloth(MESH, QUAD);
    cloth.create(anchorAt([100, 0, 0]));
    expect([0, 1, 2, 3].map(v => vertex(cloth, v))).toEqual([
      [100, 0, 0],
      [120, 0, 0],
      [100, 0, -10],
      [120, 0, -10],
    ]);
    // Up to six links a triangle (`NumTriangles * 3 * 2`).
    expect([cloth.count, cloth.linkCount]).toEqual([4, 12]);
  });

  it('links every triangle edge, and across to the next triangle\'s far corner, never vertex 0 (FindMatchVertex `> 0`)', () => {
    const cloth = new PhysicsCloth(MESH, QUAD);
    cloth.create(anchorAt([0, 0, 0]));
    // Edge (1, 2) finds triangle (2, 1, 3): its corner 3 is linked to 0. Edge (2, 1) finds corner 0: never linked.
    expect(pairs(cloth.springs)).toEqual([[0, 1], [1, 2], [0, 3], [2, 0], [2, 1], [1, 3], [3, 2]]);
    // Ends more than 10 apart in x are loose, the rest strict (:1016-1024); the cross link takes its edge's kind.
    expect(pairs(cloth.loose)).toEqual([[0, 1], [1, 2], [0, 3], [2, 1], [3, 2]]);
    expect(pairs(cloth.strict)).toEqual([[2, 0], [1, 3]]);
  });

  it('keeps a strict link between half and all of its length (`fDist * 0.5f`), the loose ones waiting on a collision pass', () => {
    const cloth = new PhysicsCloth(MESH, QUAD);
    const anchor = anchorAt([0, 0, 0]);
    cloth.create(anchor);
    // The pins drop 6, 4 over 2 and 3. A strict link moves its second vertex (`pVertex2->KeepLength`): (1, 3)
    // pushes 3 back to 5 under the pin, (2, 0) the pin, which stays. With no sphere, the loose moves never land.
    anchor.at[2] = -6;
    expect(cloth.move2(anchor, 0, 1, 0)).toBe(true);
    expect([vertex(cloth, 1), vertex(cloth, 2), vertex(cloth, 3)]).toEqual([
      [20, 0, -6],
      [0, 0, -10],
      [20, 0, -11],
    ]);
    expect(cloth.move2(anchor, 0, 1, 0)).toBe(true);
    expect(vertex(cloth, 2)).toEqual([0, 0, -10]);
    // A sphere's pass (here touching nothing) lands them, averaged, one step late (ProcessCollision, :925-946).
    const spheres = new PhysicsCloth({ ...MESH, spheres: [[0, 0, 0, 1, 18]] }, QUAD);
    spheres.create(anchorAt([0, 0, 0]));
    spheres.move2(anchor, 0, 1, 0);
    expect(vertex(spheres, 2)).toEqual([0, 0, -10]);
    spheres.move2(anchor, 0, 1, 0);
    expect(vertex(spheres, 2)).not.toEqual([0, 0, -10]);
  });

  it('gusts every vertex alike, `abs(iSeed % 10)` steps from the seed (CPhysicsClothMesh::InitForces, :1179-1193)', () => {
    setClothWind(0.5);
    const cloth = new PhysicsCloth(MESH, QUAD);
    const anchor = anchorAt([0, 0, 0], [0, 1]);
    cloth.create(anchor);
    // WorldTime 1200: seed 3 * 101 % 4 = 3, a gain of 4 on both free vertices: 4 * 0.5 * 400 * 0.005.
    cloth.move2(anchor, 0.005, 1, 1200);
    expect([cloth.vel[3 * 2 + 1], cloth.vel[3 * 3 + 1]].map(v => +v.toFixed(6))).toEqual([4, 4]);
    expect([cloth.vel[1], cloth.vel[4]]).toEqual([0, 0]);
  });

  it('tears when a strict link stretches past 20 times its length', () => {
    const cloth = new PhysicsCloth(MESH, QUAD);
    const anchor = anchorAt([0, 0, 0]);
    cloth.create(anchor);
    anchor.at[2] = 1000;
    expect(cloth.move2(anchor, 0, 1, 0)).toBe(false);
  });
});
