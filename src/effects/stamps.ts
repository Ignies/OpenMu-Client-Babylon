/**
 * Stamps - still copies of one mesh of a skill model, left where a moving body
 * has been: the original's per-step `CreateEffect` ghosts (MODEL_PIER_PART sub1
 * behind Fire Burst's darts, MoveHandlers.cpp:5630). One spawn is one trail.
 * Every stamp is a thin instance of a baked, unskinned copy of the mesh in its
 * rest pose, so a trail of fifty is one draw per alpha rather than fifty clones
 * each carrying a skeleton and a clip (which cost ~9 ms a frame for one cast).
 * Drawn like model.ts `cutout`: alpha-tested, unlit, texture × colour.
 *
 * Driven by: `effects.spawn('stamps', …)`. Read by: nobody.
 */
import {
  Material,
  Matrix,
  Mesh,
  Quaternion,
  TransformNode,
  Vector3,
  VertexData,
  type Scene,
  type Texture,
} from '../libs/babylon/exports';
import { getMaterial, loadGLTF } from '../common/modelLoader';
import { BlendState } from '../common/objects/enum';
import { Store } from '../store';
import type { TestScene } from '../scenes/testScene';
import { LiveList, WHITE, type RGB } from './core';
import { muAngle } from './model';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Stamps one alpha of one trail can hold: a Fire Burst dart leaves 48. */
const CAPACITY = 64;

/** model.ts's default conversion of a BMD model: upright, y mirrored. */
const UPRIGHT = Quaternion.FromEulerAngles(-Math.PI / 2, 0, 0);

// ---- 2. state + readers ----------------------------------------------------

export interface StampsOptions {
  /** `Skill/…glb` (recipes.ts `MODEL`). */
  model: string;
  /** The mesh (BMD order) that is stamped - the others are the original's `HiddenMesh`. */
  mesh: number;
  /** The original's `Scale`. */
  scale?: number;
  /** Body light. */
  colour?: RGB;
  seconds: number;
  /** The whole trail's 0..1 brightness at `t` seconds alive, times each stamp's own alpha. */
  intensity?: (t: number) => number;
}

export interface StampsHandle extends EffectHandle {
  /** Leave a stamp at `at`, turned by the MU `angle` (degrees, model.ts `angle`), with its own `alpha`. */
  add(at: Vector3, angle: readonly [number, number, number], alpha?: number): void;
}

interface Baked {
  data: VertexData;
  texture: Texture | null;
}

const live = new LiveList();
const bakes = new WeakMap<Scene, Map<string, Promise<Baked | null>>>();

/** How many trails are up (debug). */
export function stampsCount(): number {
  return live.size;
}

/**
 * The mesh posed by its clip's first key and skinned on the CPU once, in the
 * frame model.ts puts a model in before its node turns it.
 */
function bake(scene: Scene, file: string, index: number): Promise<Baked | null> {
  let perScene = bakes.get(scene);
  if (!perScene) {
    perScene = new Map();
    bakes.set(scene, perScene);
  }
  const key = `${file}#${index}`;
  let pending = perScene.get(key);
  if (pending) return pending;
  const world = Store.world;
  if (!world) return Promise.resolve(null);
  pending = loadGLTF(file, world)
    .then(gltf => {
      const holder = new TransformNode('fxStampBake', scene);
      gltf.mesh.setParent(holder);
      gltf.mesh.position.setAll(0);
      gltf.mesh.scaling.set(1, -1, 1);
      gltf.mesh.rotationQuaternion = UPRIGHT.clone();
      holder.computeWorldMatrix(true);
      for (const n of gltf.mesh.getDescendants(false)) (n as TransformNode).computeWorldMatrix?.(true);
      gltf.skeleton?.prepare(true);
      const meshes = gltf.mesh.getChildMeshes(false).sort((a, b) => a.name.localeCompare(b.name));
      const src = meshes[index];
      let baked: Baked | null = null;
      const positions = src?.getPositionData(true);
      const indices = src?.getIndices();
      if (src && positions && indices) {
        const world = src.computeWorldMatrix(true);
        const normals = src.getNormalsData(true);
        const v = new Vector3();
        for (let i = 0; i < positions.length; i += 3) {
          Vector3.TransformCoordinatesFromFloatsToRef(positions[i], positions[i + 1], positions[i + 2], world, v);
          positions[i] = v.x;
          positions[i + 1] = v.y;
          positions[i + 2] = v.z;
          if (normals) {
            Vector3.TransformNormalFromFloatsToRef(normals[i], normals[i + 1], normals[i + 2], world, v);
            v.normalize();
            normals[i] = v.x;
            normals[i + 1] = v.y;
            normals[i + 2] = v.z;
          }
        }
        const data = new VertexData();
        data.positions = Array.from(positions);
        // An unindexed glTF primitive comes back with no indices: its vertices are the triangles in order.
        data.indices = indices.length ? Array.from(indices) : Array.from({ length: positions.length / 3 }, (_, i) => i);
        if (normals) data.normals = Array.from(normals);
        const uvs = src.getVerticesData('uv');
        if (uvs) data.uvs = Array.from(uvs);
        baked = { data, texture: (src.metadata?.diffuseTexture as Texture | undefined) ?? null };
      }
      for (const g of gltf.animationGroups) g.dispose();
      gltf.skeleton?.dispose();
      gltf.mesh.dispose(false, false);
      holder.dispose(false, false);
      return baked;
    })
    .catch(err => {
      console.warn('[effects] stamps bake failed', file, err);
      return null;
    });
  perScene.set(key, pending);
  return pending;
}

/** One alpha's thin-instanced mesh. */
interface Layer {
  mesh: Mesh;
  alpha: number;
  count: number;
  matrices: Float32Array;
}

function spawn(scene: Scene, _at: Vector3, opts: StampsOptions): StampsHandle {
  const world = Store.world;
  const scale = opts.scale ?? 1;
  const colour = opts.colour ?? WHITE;
  const bodyLight = new Vector3(colour[0], colour[1], colour[2]);
  const layers: Layer[] = [];
  // Stamps asked for before the bake is in; placed when it lands.
  const queued: { at: Vector3; angle: [number, number, number]; alpha: number }[] = [];
  let baked: Baked | null = null;
  let disposed = false;
  let t = 0;
  const q = new Quaternion();
  const s = new Vector3(scale, scale, scale);
  const m = new Matrix();

  const layerFor = (alpha: number): Layer | null => {
    for (const l of layers) if (l.alpha === alpha) return l;
    if (!baked) return null;
    const mesh = new Mesh('fxStamps', scene);
    baked.data.applyToMesh(mesh, false);
    if (world) mesh.parent = world.mapParent;
    mesh.material = getMaterial(scene, false, Material.MATERIAL_ALPHATESTANDBLEND, BlendState.ALPHA_COMBINE, false, true);
    mesh.metadata = { diffuseTexture: baked.texture, bodyLight, brightMesh: false };
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.doNotSyncBoundingInfo = true;
    const matrices = new Float32Array(CAPACITY * 16);
    // The item materials read a per-instance body light on instanced draws (itemMaterial.ts `muInst`).
    mesh.thinInstanceSetBuffer('matrix', matrices, 16, false);
    mesh.thinInstanceSetBuffer('muInst', new Float32Array(CAPACITY * 4).fill(1), 4, true);
    mesh.thinInstanceCount = 0;
    (scene as TestScene).look?.glow.addExcludedMesh(mesh as never);
    const layer = { mesh, alpha, count: 0, matrices };
    layers.push(layer);
    return layer;
  };

  const place = (at: Vector3, angle: readonly [number, number, number], alpha: number): void => {
    const layer = layerFor(alpha);
    if (!layer || layer.count >= CAPACITY) return;
    Matrix.ComposeToRef(s, muAngle(angle, q), at, m);
    m.copyToArray(layer.matrices, layer.count * 16);
    layer.count++;
    layer.mesh.thinInstanceCount = layer.count;
    layer.mesh.thinInstanceBufferUpdated('matrix');
  };

  void bake(scene, opts.model, opts.mesh).then(b => {
    if (disposed || !b) return;
    baked = b;
    for (const e of queued) place(e.at, e.angle, e.alpha);
    queued.length = 0;
  });

  const handle = live.push({
    update(dt) {
      t += dt;
      if (t >= opts.seconds) return false;
      const vis = opts.intensity ? opts.intensity(t) : 1;
      for (const l of layers) l.mesh.visibility = l.alpha * vis;
      return true;
    },
    release() {
      disposed = true;
      for (const l of layers) {
        (scene as TestScene).look?.glow.removeExcludedMesh(l.mesh as never);
        // The material is modelLoader's shared cache and the texture the GLB cache's.
        l.mesh.dispose(false, false);
      }
      layers.length = 0;
    },
  });

  return {
    get alive() {
      return handle.alive;
    },
    stop: () => handle.stop(),
    add(at, angle, alpha = 1) {
      if (!handle.alive || alpha <= 0) return;
      if (baked) place(at, angle, alpha);
      else queued.push({ at: at.clone(), angle: [angle[0], angle[1], angle[2]], alpha });
    },
  };
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const stampsLayer: EffectLayer<StampsOptions, 'stamps'> = {
  name: 'stamps',
  update,
  reset,
  spawn,
};
