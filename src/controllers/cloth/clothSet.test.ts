import { afterAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// The cloth bitmaps are fetched from Data/ in the browser; here they never land.
vi.mock('../assets/mu', async importOriginal => ({
  ...(await importOriginal<object>()),
  loadMuSprite: () => new Promise(() => {}),
}));

import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Bone, Constants, Material, Matrix, Skeleton, StandardMaterial, TransformNode, VertexBuffer, type Mesh } from '../render/babylon/exports';
import { getShadowMaterial } from '../render/objectShadow';
import { cloth, ClothSet, PCT_CURVED, PCT_HEAVY, PCT_MASK_ALPHA, PCT_MASK_BLEND, PCT_MASK_LIGHT, PCT_SHORT_SHOULDER, runClothFrame, type ClothSpec } from './index';
import { ClothMesh } from './clothMesh';

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => engine.dispose());

/** MU (x, y, z) to the scene's (x, z, y): the loader's basis change every model root carries. */
const SWAP = Matrix.FromValues(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1);

/**
 * A rig whose bone 19 sits 130 cm up the body, turned as the cape bone is: its x up, its -y backward,
 * its z across (MU object frame (z, -y, x)). `yaw` is MU's Angle[2] in degrees.
 */
function body(yaw = 0) {
  const node = new TransformNode('body', scene);
  node.rotation.y = Math.PI * 2 - (yaw * Math.PI) / 180;
  const root = new TransformNode('root', scene);
  root.parent = node;
  root.setPreTransformMatrix(SWAP);
  const skeleton = new Skeleton('rig', 'rig', scene);
  for (let i = 0; i < 22; i++) {
    const bone = new TransformNode(`bone${i - 1}`, scene);
    bone.parent = root;
    bone.setPreTransformMatrix(Matrix.FromValues(0, 0, 1, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1.3, 1));
    new Bone(`bone${i - 1}`, skeleton).linkTransformNode(bone);
  }
  return { node, gltf: { skeleton } };
}

const CAPE: ClothSpec = {
  bone: 19,
  at: [0, 8, 10],
  grid: [10, 10],
  size: [180, 180],
  front: 'Player/DarklordRobe.OZT',
  back: 'Player/DarklordRobe.OZT',
  flags: PCT_CURVED | PCT_SHORT_SHOULDER | PCT_MASK_ALPHA,
  spheres: [
    [-10, -10, -10, 25, 17],
    [10, -10, -10, 25, 17],
  ],
};

const ROBE: ClothSpec = {
  bone: 19,
  at: [0, 10, 0],
  grid: [10, 10],
  size: [75, 120],
  front: 'Player/Robe01.OZJ',
  back: 'Player/Robe02.OZJ',
  flags: PCT_CURVED | PCT_SHORT_SHOULDER | PCT_HEAVY,
};

/** A frame of `dt` seconds: ClothSystem's clock, then the render's first camera (its render id moved on). */
function frame(dt: number) {
  cloth.update?.(0, dt);
  scene.incrementRenderId();
  runClothFrame();
}

/** A slot's mesh and positions, which the test expects to hang. */
const meshOf = (set: ClothSet, s: number) => {
  const mesh = set.mesh(s);
  if (!mesh) throw new Error(`slot ${s} is empty`);
  return mesh;
};
const pos = (set: ClothSet, s: number) => {
  const cloth = set.cloth(s);
  if (!cloth) throw new Error(`slot ${s} is empty`);
  return cloth.pos;
};

/** 25 Hz frames, one tick each. */
function tick(frames = 1) {
  for (let i = 0; i < frames; i++) frame(0.04);
}

describe('the cloth faces (CPhysicsCloth::RenderFace, PhysicsManager.cpp:832-886)', () => {
  it('draws both faces from one buffer when they share a texture, the back turned the other way', () => {
    const mesh = new ClothMesh(scene, { ...CAPE, grid: [3, 2] }, [1, 1, 1], new TransformNode('o', scene));
    expect(mesh.faces).toHaveLength(1);
    expect([...(mesh.faces[0].getIndices() ?? [])]).toEqual([0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4, 0, 3, 4, 0, 4, 1, 1, 4, 5, 1, 5, 2]);
    // u across, v down, v held under 0.99.
    expect(mesh.faces[0].getVerticesData(VertexBuffer.UVKind)).toEqual(Float32Array.from([0, 0, 0.5, 0, 1, 0, 0, 0.99, 0.5, 0.99, 1, 0.99]));
    mesh.dispose();
  });

  it('gives each face its own mesh and texture when they differ, opaque and culled (DisableAlphaBlend)', () => {
    const mesh = new ClothMesh(scene, ROBE, [1, 1, 1], new TransformNode('o', scene));
    expect(mesh.faces.map(f => (f.material as StandardMaterial).diffuseTexture?.name)).toEqual([
      'Player/Robe01.OZJ',
      'Player/Robe02.OZJ',
    ]);
    expect(mesh.faces.map(f => [f.material?.backFaceCulling, f.material?.transparencyMode])).toEqual([
      [true, null],
      [true, null],
    ]);
    mesh.dispose();
  });

  it('keys an alpha cloth at 0.25 and adds a blend one, unculled (EnableAlphaTest / EnableAlphaBlend)', () => {
    const keyed = new ClothMesh(scene, CAPE, [1, 1, 1], new TransformNode('o', scene)).faces[0].material as StandardMaterial;
    expect([keyed.transparencyMode, keyed.alphaCutOff, keyed.backFaceCulling]).toEqual([Material.MATERIAL_ALPHATESTANDBLEND, 0.25, false]);
    const added = new ClothMesh(scene, { ...CAPE, flags: PCT_MASK_BLEND }, [1, 1, 1], new TransformNode('o', scene)).faces[0].material as StandardMaterial;
    expect([added.alphaMode, added.disableDepthWrite, added.backFaceCulling]).toEqual([Constants.ALPHA_ONEONE, true, false]);
  });

  it('tints the faces with CloakLight alone, unlit (RenderFace\'s vertex colour)', () => {
    const mesh = new ClothMesh(scene, CAPE, [1, 0.2, 0], new TransformNode('o', scene));
    const material = mesh.faces[0].material as unknown as { disableLighting: boolean; emissiveColor: { asArray(): number[] } };
    expect([material.disableLighting, material.emissiveColor.asArray()]).toEqual([true, [1, 0.2, 0]]);
  });

  it('pulses a PCT_MASK_LIGHT cloth in its own light, added, whatever the CloakLight (:784-816)', () => {
    const set = new ClothSet(scene, body());
    set.wear([{ ...CAPE, flags: PCT_MASK_LIGHT }], [1, 0.2, 0]);
    tick();
    const material = meshOf(set, 0).faces[0].material as unknown as { alphaMode: number; emissiveColor: { r: number; b: number } };
    expect(material.alphaMode).toBe(Constants.ALPHA_ONEONE);
    expect(material.emissiveColor.r).toBeGreaterThanOrEqual(0.3);
    expect(material.emissiveColor.r).toBeLessThanOrEqual(0.5);
    expect(material.emissiveColor.b).toBe(material.emissiveColor.r);
    set.dispose();
  });

  it('writes the cloth\'s MU centimetres into the buffer as scene tiles, in place', () => {
    const mesh = new ClothMesh(scene, { ...CAPE, grid: [2, 2] }, [1, 1, 1], new TransformNode('o', scene));
    const buffer = mesh.faces[0].getVertexBuffer(VertexBuffer.PositionKind);
    mesh.write(Float64Array.from([100, 200, 300, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    expect([...(mesh.faces[0].getVerticesData(VertexBuffer.PositionKind) ?? [])].slice(0, 3)).toEqual([1, 3, 2]);
    expect(mesh.faces[0].getVertexBuffer(VertexBuffer.PositionKind)).toBe(buffer);
  });
});

describe('a wearer\'s cloths (o->m_pCloth)', () => {
  it('blows the wind behind the body, along its Angle[2] (PhysicsManager.cpp:609-610)', () => {
    for (const yaw of [0, 90, 225]) {
      const set = new ClothSet(scene, body(yaw));
      set.wear([CAPE], [1, 1, 1]);
      tick();
      const a = ((180 + yaw) * Math.PI) / 180;
      expect(set.windX).toBeCloseTo(Math.sin(a));
      expect(set.windY).toBeCloseTo(-Math.cos(a));
      set.dispose();
    }
  });

  it('builds the cloth on the next tick and pins its top row on the bone (Create, SetFixedVertices)', () => {
    const rig = body();
    rig.node.position.set(10, 0, 20);
    const set = new ClothSet(scene, rig);
    set.wear([null, null, CAPE], [1, 1, 1]);
    expect(set.size).toBe(1);
    tick();
    const pins = pos(set, 2);
    // The body at MU (1000, 2000, 0), bone 19 130 up; a pin at (x, fy - curve, fz) of the body's frame.
    expect([pins[0], pins[1], pins[2]].map(Math.round)).toEqual([1000 - 54, 2000 + 8 - 10, 130 + 10]);
    expect(meshOf(set, 2).faces[0].isEnabled()).toBe(true);
    set.dispose();
  });

  it('carries the drawn cloth with its bone between two ticks', () => {
    const rig = body();
    const set = new ClothSet(scene, rig);
    set.wear([CAPE], [1, 1, 1]);
    tick();
    rig.node.position.x += 0.5;
    frame(0.01);
    expect(meshOf(set, 0).faces[0].getWorldMatrix().getTranslation().asArray().map(v => +v.toFixed(5))).toEqual([0.5, 0, 0]);
    set.dispose();
  });

  it('keeps a slot whose spec stayed and drops them all when one tears, as a warp does (DeleteCloth)', () => {
    const rig = body();
    const set = new ClothSet(scene, rig);
    set.wear([CAPE, ROBE], [1, 1, 1]);
    tick(2);
    const kept = set.cloth(0);
    set.wear([CAPE, null], [1, 1, 1]);
    expect([set.cloth(0), set.size]).toEqual([kept, 1]);
    rig.node.position.x += 100;
    tick();
    expect(set.size).toBe(0);
    set.wear([CAPE], [1, 1, 1]);
    tick();
    expect(set.cloth(0)).not.toBe(kept);
    set.dispose();
  });

  it('neither steps nor draws a hidden wearer', () => {
    const set = new ClothSet(scene, body());
    set.wear([CAPE], [1, 1, 1]);
    tick();
    const before = Float64Array.from(pos(set, 0));
    set.shown = false;
    tick(5);
    expect(pos(set, 0)).toEqual(before);
    expect(meshOf(set, 0).faces[0].isEnabled()).toBe(false);
    set.dispose();
  });

  it('lays the Classic shadow from the same buffer, untextured, folding from the wearer (ZzzBMD.cpp:2642-2710)', () => {
    const rig = body();
    const set = new ClothSet(scene, rig);
    set.castsShadow = true;
    set.wear([CAPE], [1, 1, 1]);
    tick();
    const face = meshOf(set, 0).faces[0];
    const shadow = scene.getMeshByName(`${face.name}_shadow`) as Mesh;
    expect(shadow.material).toBe(getShadowMaterial(scene, 0));
    expect(shadow.getVertexBuffer(VertexBuffer.PositionKind)).toBe(face.getVertexBuffer(VertexBuffer.PositionKind));
    expect([shadow.metadata.shadowOriginNode, shadow.metadata.diffuseTexture]).toEqual([rig.node, undefined]);
    expect(shadow.isEnabled()).toBe(true);
    set.castsShadow = false;
    tick();
    expect(shadow.isEnabled()).toBe(false);
    set.dispose();
  });
});

// What 20 caped players cost: each a 10x10 cape with four spheres and its Classic shadow, on the move.
describe('the cost of 20 caped players', () => {
  it('is about a millisecond a 25 Hz tick and a few hundredths between ticks', () => {
    const sphere = (x: number, z: number, r: number) => [x, -10, z, r, 17] as const;
    const cape = { ...CAPE, spheres: [sphere(-10, -10, 25), sphere(10, -10, 25), sphere(-10, 20, 27), sphere(10, 20, 27)] };
    const rigs = Array.from({ length: 20 }, (_, i) => body(i * 18));
    const sets = rigs.map((rig, i) => {
      rig.node.position.set(i % 5, 0, Math.floor(i / 5));
      const set = new ClothSet(scene, rig);
      set.castsShadow = true;
      set.wear([cape], [1, 1, 1]);
      return set;
    });
    tick(25);
    const time = (dt: number, frames: number) => {
      const start = performance.now();
      for (let f = 0; f < frames; f++) {
        for (const rig of rigs) rig.node.position.x += 0.002;
        frame(dt);
      }
      return (performance.now() - start) / frames;
    };
    const ticked = time(0.04, 250);
    const between = time(0, 250);
    console.info(`20 caped players: ${ticked.toFixed(3)} ms a tick, ${between.toFixed(3)} ms a frame between ticks`);
    expect(sets.every(set => set.size === 1)).toBe(true);
    expect(ticked).toBeLessThan(5);
    expect(between).toBeLessThan(0.5);
    for (const set of sets) set.dispose();
  });
});
