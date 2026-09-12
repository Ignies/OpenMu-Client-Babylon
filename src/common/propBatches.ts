import {
  BoundingInfo,
  GlowLayer,
  Matrix,
  Mesh,
  TransformNode,
  Vector3,
} from '../libs/babylon/exports';
import type { Entity, World } from '../ecs/world';
import { ModelObject, extendByPosedLocalBounds } from './modelObject';
import { GameOptions } from './gameOptions';
import { lightingTier, type LightingTier } from './lightingQuality';
import { packBodyLight } from './itemMaterial';
import { blendMeshFor } from './blendMeshes';
import { isEffectOnlyObject } from './effectOnlyObjects';
import { meshAnimationFor } from './meshAnimation';
import { lightEmittersFor } from '../lighting/mapObjectLights';
import { LEAN_CURSOR_OBJECTS, findRestObject } from '../libs/mu/restObjects';
import { isMapDoorType } from '../ecs/systems/mapDoorSystem';
import { roomStructureTypes } from '../maps/rooms';
import { mayBeCeilingPiece } from '../ecs/systems/ceilingHideSystem';
import {
  blobShadowsActive,
  getShadowMaterial,
  meshCasts,
  shadowStateVersion,
} from './objectShadow';
import { terrainLightReaches } from './terrainDynamicLight';
import {
  isRoofSlab,
  isTileOpen,
  paintRoof,
  terrainMaskVersion,
} from '../libs/mu/terrainMask';
import { needsTerrainMask } from '../libs/mu/terrainOverlay';
import { SNOW_MAPS } from '../weather/ambientWeather';
import { snowCapCover } from '../weather/snowCaps';
import { weather } from '../weather';
import { setSceneHold } from './sceneGate';
import { devQuery } from './devSeams';
import { ENUM_WORLD } from './types';
import {
  batchExclusion,
  chunkOf,
  extendByBox,
  instanceMatrix,
  placementMatrix,
  type PropPlacement,
} from './propBatchRules';

/**
 * The prop batches: the map's scenery drawn as thin instances, one mesh per
 * prop type, submesh and 32-tile chunk, instead of one cloned model per
 * placement (documentation/prop_batching/ARCHITECTURE.md).
 *
 * A type is batched only when nothing per object is asked of it - see
 * `tableExclusion` and the class marker `ModelObject.Batchable`; every other
 * record takes the per-object path untouched. A batched type keeps one real
 * `ModelObject` as its prototype, built by the type's own class exactly as
 * `createModelObject` would, never drawn: it owns the geometry, the shared
 * item materials, the skeleton and the one playing clip every chunk of the
 * type reads its pose from. What differs per placement - the terrain light,
 * a snow map's cap openness - rides in the `muInst` instance attribute the
 * item materials read.
 */

const SCENE_HOLD = 'propBatches';

/** Clip samples the culling box is grown over, so a swaying crown stays inside it. */
const POSE_SAMPLES = 4;

/** Up to this many placements a type is one mesh for the whole map, unchunked. */
const SINGLE_CHUNK_MAX = 64;

/** How often a snow map re-reads the cover and the roof mask. */
const SNOW_POLL_SECONDS = 0.5;

/** Cover change (0..1) that re-packs the sink and the caps. */
const SNOW_COVER_STEP = 0.02;

/**
 * How far past the placements' box a chunk's shadow may reach, per tile of
 * caster height: the projection's lean (`objectShadow` `shadowParams`) folds a
 * point at height h about h/2 sideways, plus the dilation.
 */
const SHADOW_REACH_PER_TILE = 0.75;
const SHADOW_REACH_MARGIN = 1;

type Placement = PropPlacement & {
  readonly entity: Entity;
  readonly chunk: number;
};

type Submesh = {
  readonly source: Mesh;
  /** The submesh's world matrix under its model root at an identity node. */
  readonly meshToNode: Matrix;
  /** Posed local bounds over the clip (mesh space). */
  readonly min: Vector3;
  readonly max: Vector3;
  /** Belongs in the Classic blob (map-object rules: no keyed cards, no blend mesh). */
  readonly casts: boolean;
};

type Chunk = {
  readonly key: number;
  readonly placements: Placement[];
  readonly meshes: Mesh[];
  readonly shadows: Mesh[];
  /** Which submesh each shadow mesh is the silhouette of. */
  readonly shadowSubmesh: number[];
  /** Placements each shadow mesh carries, as indices into `placements`. */
  readonly shadowLists: number[][];
  readonly inst: Float32Array;
  readonly matrices: Float32Array[];
  readonly shadowMatrices: Float32Array[];
  /** Tile box of the placements, for the torch test. */
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
};

class PropType {
  prototype: ModelObject | null = null;
  state: 'pending' | 'built' | 'fallback' = 'pending';
  readonly placements: Placement[] = [];
  submeshes: Submesh[] = [];
  readonly chunks = new Map<number, Chunk>();

  constructor(
    readonly type: number,
    readonly factory: typeof ModelObject
  ) {}
}

/** What the map's own tables ask of a type per object; null when nothing. */
function tableExclusion(map: ENUM_WORLD, type: number): string | null {
  if (isEffectOnlyObject(map, type)) return 'effect only';
  if (lightEmittersFor(map, type)?.length) return 'light';
  if (meshAnimationFor(map, type)) return 'mesh animation';
  if (isMapDoorType(map, type)) return 'door';
  if (findRestObject(map, type)) return 'rest object';
  if (LEAN_CURSOR_OBJECTS[map]?.has(type)) return 'lean box';
  if (roomStructureTypes(map).has(type)) return 'room piece';
  // Chandelier fire and wall torch are built inside MapTileObject.init.
  if (map === ENUM_WORLD.WD_73NEW_LOGIN_SCENE && (type === 157 || type === 37)) {
    return 'login fire';
  }
  return null;
}

/**
 * The chunk meshes' own world transform: the model root's mirror, so the
 * culling flip lands (see `cloneSubmesh`). Self-inverse, so an instance
 * matrix is the placement's world matrix times this on the right.
 */
const MIRROR_SCALING = new Vector3(1, -1, 1);
const MIRROR = Matrix.Scaling(1, -1, 1);

const nodeM = Matrix.Identity();
const instM = Matrix.Identity();
const bufM = Matrix.Identity();

/** Writes the placement's world matrix into an instance buffer, mirror taken out. */
function writeInstance(world: Matrix, target: Float32Array, offset: number): void {
  world.multiplyToRef(MIRROR, bufM);
  bufM.copyToArray(target, offset);
}
const boxMin = Vector3.Zero();
const boxMax = Vector3.Zero();
const placeMin = Vector3.Zero();
const placeMax = Vector3.Zero();

function resetBox(min: Vector3, max: Vector3): void {
  min.setAll(Number.POSITIVE_INFINITY);
  max.setAll(Number.NEGATIVE_INFINITY);
}

class PropBatches {
  readonly types = new Map<number, PropType>();
  /** Types kept per object, with the reason - for the dev summary and the overlay. */
  readonly excluded = new Map<number, string>();
  readonly root: TransformNode;
  readonly snow: boolean;
  readonly mask: boolean;

  private readonly tableVerdicts = new Map<number, string | null>();
  private tier: LightingTier | null;
  private shadowSerial = -1;
  private snowTimer = 0;
  private snowCover = -1;
  private maskVersion = -1;
  private disposed = false;
  private summarised = false;

  constructor(
    readonly world: World,
    readonly map: ENUM_WORLD
  ) {
    this.root = new TransformNode('propBatches', world.scene);
    this.snow = SNOW_MAPS.has(map);
    this.mask = needsTerrainMask(map);
    this.tier = lightingTier();
  }

  exclusion(type: number, factory: typeof ModelObject): string | null {
    let verdict = this.tableVerdicts.get(type);

    if (verdict === undefined) {
      verdict = tableExclusion(this.map, type);
      this.tableVerdicts.set(type, verdict);
    }

    const reason = batchExclusion(factory, verdict);
    if (reason !== null) this.excluded.set(type, reason);

    return reason;
  }

  add(entity: Entity, factory: typeof ModelObject): void {
    const transform = entity.transform;
    const type = entity.modelId;
    if (!transform || type === undefined) return;

    let pt = this.types.get(type);

    if (!pt) {
      pt = new PropType(type, factory);
      this.types.set(type, pt);
      this.createPrototype(pt, entity);
    }

    const chunk = chunkOf(transform.pos.x, transform.pos.z);

    pt.placements.push({
      entity,
      pos: transform.pos,
      rot: transform.rot,
      scale: transform.scale,
      chunk,
    });

    entity.propBatch = { type, chunk };

    // Everything is added before any prototype resolves (createObjects is
    // synchronous), so a built type only sees a late add on a reload.
    if (pt.state === 'built') {
      this.disposeChunks(pt);
      pt.state = 'pending';
    }

    this.syncHold();
  }

  /**
   * One real ModelObject of the type, made the way `createModelObject` makes
   * one and then parked disabled: its class picks the file and the material
   * tweaks, its clip plays for every chunk, its skeleton is theirs.
   */
  private createPrototype(pt: PropType, entity: Entity): void {
    const proto = new pt.factory(this.world.scene, this.world.mapParent);

    proto.WorldIndex = this.map;
    proto.Type = pt.type;
    proto.IsMapObject = true;
    proto.NodeNamePrefix = 'propBatchProto_';

    const blend = blendMeshFor(this.map, pt.type);
    if (blend >= 0) proto.BlendMesh = blend;

    proto.node.setEnabled(false);

    pt.prototype = proto;

    proto.init(this.world, entity).then(
      () => {
        if (this.disposed || pt.state !== 'pending') return;
        if (!proto.gltf || !proto.Ready) this.fallback(pt, 'no model');
      },
      error => {
        if (this.disposed || pt.state !== 'pending') return;
        console.error(`Prop batch ${pt.type}: prototype failed to load:`, error);
        this.fallback(pt, 'load failed');
      }
    );
  }

  /** Builds every type whose prototype has arrived. Called once a frame. */
  flush(): void {
    for (const pt of this.types.values()) {
      if (pt.state !== 'pending') continue;

      const proto = pt.prototype;
      if (!proto?.Ready || !proto.gltf) continue;

      try {
        this.build(pt);
      } catch (error) {
        console.error(`Prop batch ${pt.type}: build failed:`, error);
        this.fallback(pt, 'build failed');
      }
    }

    this.syncHold();
  }

  private build(pt: PropType): void {
    const proto = pt.prototype!;
    const gltf = proto.gltf!;
    const scene = this.world.scene;

    // The node at identity: every submesh's world matrix is then its
    // transform under the root, basis change included.
    proto.updateLocation({ x: 0, y: 0, z: 0 }, 1, { x: 0, y: 0, z: 0 });
    const invNode = proto.node.computeWorldMatrix(true).clone().invert();

    const submeshes: Submesh[] = [];
    const rules = { blendMesh: proto.ShadowBlendMeshCasts, keyed: false };

    for (const mesh of gltf.mesh.getChildMeshes(false)) {
      if (!(mesh instanceof Mesh)) continue;
      if (mesh.getTotalVertices() === 0) continue;
      if (mesh.metadata?.hiddenByScript || !mesh.isVisible) continue;
      if (!mesh.isEnabled(false)) continue;

      const meshToNode = mesh.computeWorldMatrix(true).multiply(invNode);
      const min = Vector3.Zero();
      const max = Vector3.Zero();
      resetBox(min, max);

      submeshes.push({
        source: mesh,
        meshToNode,
        min,
        max,
        casts: meshCasts(mesh, rules),
      });
    }

    if (submeshes.length === 0) {
      this.fallback(pt, 'no drawable mesh');
      return;
    }

    this.samplePosedBounds(gltf, submeshes);

    // A submesh the ceiling fade would thin has to stay a mesh of its own.
    const first = pt.placements[0];
    placementMatrix(first, nodeM);
    for (const sub of submeshes) {
      instanceMatrix(sub.meshToNode, nodeM, instM);
      resetBox(boxMin, boxMax);
      extendByBox(sub.min, sub.max, instM, boxMin, boxMax);

      if (mayBeCeilingPiece(this.map, boxMin.y, boxMax.y, first.pos.y)) {
        this.fallback(pt, 'ceiling piece');
        return;
      }
    }

    pt.submeshes = submeshes;

    // A sparse type is one mesh for the whole map: a dozen statues spread
    // over twelve chunks would be twelve meshes to walk for twelve draws.
    const single = pt.placements.length <= SINGLE_CHUNK_MAX;

    const byChunk = new Map<number, Placement[]>();
    for (const p of pt.placements) {
      const key = single ? 0 : p.chunk;
      let list = byChunk.get(key);
      if (!list) {
        list = [];
        byChunk.set(key, list);
      }
      list.push(p);
    }

    for (const [key, placements] of byChunk) {
      pt.chunks.set(key, this.buildChunk(pt, key, placements, scene));
    }

    pt.state = 'built';
  }

  /**
   * The posed bounds of each submesh over the clip. The converter stores
   * vertices relative to their bone, so the raw box collapses at the origin;
   * the pose at a few frames of the (looping) clip is what the placements are
   * really shaped like.
   */
  private samplePosedBounds(
    gltf: NonNullable<ModelObject['gltf']>,
    submeshes: Submesh[]
  ): void {
    const group = gltf.animationGroups[0];
    const animated = group !== undefined && group.to > group.from;
    const samples = animated ? POSE_SAMPLES : 1;

    for (let s = 0; s < samples; s++) {
      if (animated) {
        group.goToFrame(group.from + ((group.to - group.from) * s) / samples);
      }

      for (const sub of submeshes) {
        if (!extendByPosedLocalBounds(sub.source, sub.min, sub.max, true)) {
          const box = sub.source.getBoundingInfo().boundingBox;
          Vector3.CheckExtends(box.minimum, sub.min, sub.max);
          Vector3.CheckExtends(box.maximum, sub.min, sub.max);
        }
      }
    }

    if (animated) group.goToFrame(group.from);
  }

  private buildChunk(
    pt: PropType,
    key: number,
    placements: Placement[],
    scene: World['scene']
  ): Chunk {
    const proto = pt.prototype!;
    const subs = pt.submeshes;
    const n = placements.length;

    const inst = new Float32Array(n * 4);
    const matrices = subs.map(() => new Float32Array(n * 16));
    const shadowLists = subs.map(() => [] as number[]);
    const chunkMin = subs.map(() => new Vector3(Infinity, Infinity, Infinity));
    const chunkMax = subs.map(() => new Vector3(-Infinity, -Infinity, -Infinity));
    const casterHeight = subs.map(() => 0);

    const shadows =
      this.tier === null && proto.CastsShadow && !proto.Lights?.emitsLight;

    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < n; i++) {
      const p = placements[i];

      this.placeInstance(p, nodeM);
      this.packLight(p, inst, i * 4);

      resetBox(placeMin, placeMax);

      for (let j = 0; j < subs.length; j++) {
        const sub = subs[j];

        instanceMatrix(sub.meshToNode, nodeM, instM);
        writeInstance(instM, matrices[j], i * 16);

        resetBox(boxMin, boxMax);
        extendByBox(sub.min, sub.max, instM, boxMin, boxMax);

        Vector3.CheckExtends(boxMin, chunkMin[j], chunkMax[j]);
        Vector3.CheckExtends(boxMax, chunkMin[j], chunkMax[j]);
        Vector3.CheckExtends(boxMin, placeMin, placeMax);
        Vector3.CheckExtends(boxMax, placeMin, placeMax);

        const height = boxMax.y - boxMin.y;
        if (height > casterHeight[j]) casterHeight[j] = height;

        // Batched roofs paint the same mask the object scan would.
        if (this.mask) {
          const ground = this.world.getTerrainHeight(
            (boxMin.x + boxMax.x) * 0.5,
            (boxMin.z + boxMax.z) * 0.5
          );
          if (isRoofSlab(boxMin.y, boxMax.y, ground)) {
            paintRoof({
              minX: boxMin.x,
              maxX: boxMax.x,
              minZ: boxMin.z,
              maxZ: boxMax.z,
            });
          }
        }
      }

      // The blob's size gate, on the whole model at this placement's scale
      // (`ModelObject._blobShadowIsVisible`).
      if (shadows) {
        const height = placeMax.y - placeMin.y;
        const footprint = Math.max(
          placeMax.x - placeMin.x,
          placeMax.z - placeMin.z
        );
        if (
          height >= ModelObject.BLOB_SHADOW_MIN_HEIGHT &&
          footprint <= ModelObject.BLOB_SHADOW_MAX_FOOTPRINT
        ) {
          for (let j = 0; j < subs.length; j++) {
            if (subs[j].casts) shadowLists[j].push(i);
          }
        }
      }

      if (p.pos.x < minX) minX = p.pos.x;
      if (p.pos.x > maxX) maxX = p.pos.x;
      if (p.pos.z < minZ) minZ = p.pos.z;
      if (p.pos.z > maxZ) maxZ = p.pos.z;
      if (p.pos.y < minY) minY = p.pos.y;
      if (p.pos.y > maxY) maxY = p.pos.y;
    }

    const meshes: Mesh[] = [];
    const shadowMeshes: Mesh[] = [];
    const shadowSubmesh: number[] = [];
    const shadowMatrices: Float32Array[] = [];
    const usedShadowLists: number[][] = [];

    for (let j = 0; j < subs.length; j++) {
      const src = subs[j].source;
      const mesh = this.cloneSubmesh(src, `${src.name}_pb${pt.type}_${key}`);

      mesh.metadata = {
        ...src.metadata,
        propBatch: true,
        casterHeight: casterHeight[j],
        SkipBoundingBox: true,
        // The uniform stays neutral; the light is per instance.
        bodyLight: undefined,
        // What the culling box was built from, for the debug probes.
        propBatchLocalBox: [
          subs[j].min.asArray(),
          subs[j].max.asArray(),
        ],
        propBatchMeshToNode: Array.from(subs[j].meshToNode.m),
      };
      mesh.material = src.material;
      mesh.receiveShadows = true;
      mesh.visibility = src.visibility;

      mesh.thinInstanceSetBuffer('matrix', matrices[j], 16, !this.snow);
      mesh.thinInstanceSetBuffer('muInst', inst, 4, false);
      this.setWorldBounds(mesh, chunkMin[j], chunkMax[j]);

      meshes.push(mesh);

      const list = shadowLists[j];
      if (list.length === 0) continue;

      const data = new Float32Array(list.length * 16);
      for (let k = 0; k < list.length; k++) {
        data.set(matrices[j].subarray(list[k] * 16, list[k] * 16 + 16), k * 16);
      }

      const shadow = this.cloneSubmesh(src, `${src.name}_pbShadow${pt.type}_${key}`);
      shadow.material = getShadowMaterial(scene, 0);
      shadow.metadata = {
        SkipBoundingBox: true,
        propBatch: true,
        diffuseTexture: src.metadata?.diffuseTexture,
      };
      shadow.receiveShadows = false;
      shadow.visibility = 1;

      for (const layer of scene.effectLayers) {
        if (layer instanceof GlowLayer) layer.addExcludedMesh(shadow);
      }

      shadow.thinInstanceSetBuffer('matrix', data, 16, !this.snow);

      const reach = casterHeight[j] * SHADOW_REACH_PER_TILE + SHADOW_REACH_MARGIN;
      this.setWorldBounds(
        shadow,
        new Vector3(chunkMin[j].x - reach, minY - 1, chunkMin[j].z - reach),
        new Vector3(chunkMax[j].x + reach, maxY + 1, chunkMax[j].z + reach)
      );
      shadow.setEnabled(blobShadowsActive());

      shadowMeshes.push(shadow);
      shadowSubmesh.push(j);
      shadowMatrices.push(data);
      usedShadowLists.push(list);
    }

    return {
      key,
      placements,
      meshes,
      shadows: shadowMeshes,
      shadowSubmesh,
      shadowLists: usedShadowLists,
      inst,
      matrices,
      shadowMatrices,
      minX,
      minZ,
      maxX,
      maxZ,
    };
  }

  /**
   * A mesh sharing the prototype submesh's geometry, skeleton and material;
   * bounds and metadata are the caller's.
   */
  private cloneSubmesh(src: Mesh, name: string): Mesh {
    const mesh = src.clone(name, this.root, true) as Mesh;

    // Babylon keeps a mesh's thin-instance buffers (`world0..3`, `muInst`)
    // on its *Geometry*, and the clone shares the prototype's. Left shared,
    // every chunk of a type drew whichever chunk set its buffers last. One
    // geometry copy per chunk mesh is the price of per-chunk instances.
    mesh.makeGeometryUnique();

    // The clone copies the source's own local transform; the instance
    // matrices already carry it (`meshToNode`), so the mesh itself sits at
    // the origin of its chunk root.
    mesh.position.setAll(0);
    mesh.rotationQuaternion = null;
    mesh.rotation.setAll(0);
    // The mirror every model root carries (`ModelObject.load`: scaling
    // (1, -1, 1)) lives on the chunk mesh, not in the instance matrices:
    // Babylon flips face culling on a negative world determinant in every
    // pass (main, cascades, G-buffer, glow), and it reads the *mesh's*
    // determinant, never an instance's. With the mirror inside the
    // instances every single-sided prop drew inside out.
    mesh.scaling.copyFrom(MIRROR_SCALING);
    // Now, not later: the clone computed a world matrix under the *source's*
    // parent (the model root's basis change) and left its bounds dirty, and
    // Babylon's lazy bounds refresh would read that stale matrix.
    mesh.computeWorldMatrix(true);

    mesh.skeleton = src.skeleton;
    if (mesh.skeleton) mesh.numBoneInfluencers = 1;
    mesh.isVisible = true;
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = false;
    // Bounds are set by hand in world space and the mesh sits at the origin;
    // a sync would also try to derive them from the collapsed raw box.
    mesh.doNotSyncBoundingInfo = true;

    return mesh;
  }

  /**
   * A culling box in world units on a mesh that sits at the origin. Built
   * against the mesh's own (identity) world matrix and read back once, so
   * the lazy refresh Babylon runs on the first `getBoundingInfo()` finds
   * nothing stale to apply.
   */
  private setWorldBounds(mesh: Mesh, min: Vector3, max: Vector3): void {
    // The box is in world units; the mesh's own world matrix is the mirror,
    // so the local box is the world box mirrored in y.
    const localMin = new Vector3(min.x, -max.y, min.z);
    const localMax = new Vector3(max.x, -min.y, max.z);

    mesh.setBoundingInfo(
      new BoundingInfo(localMin, localMax, mesh.getWorldMatrix())
    );
    mesh.getBoundingInfo();
  }

  private placeInstance(p: Placement, out: Matrix): void {
    const sink = this.snow
      ? weather.snowSinkDepth(this.world, this.map, p.pos.x, p.pos.y, p.pos.z)
      : 0;

    placementMatrix(p, out, -sink);
  }

  private packLight(p: Placement, inst: Float32Array, o: number): void {
    const light = this.world.getTerrainLight(p.pos.x, p.pos.z);

    packBodyLight(light.x, light.y, light.z, inst, o);
    inst[o + 3] = this.snow && !isTileOpen(p.pos.x, p.pos.z) ? 0 : 1;
  }

  /** Re-packs a chunk's light (the torch delta moved). */
  private repackLight(chunk: Chunk): void {
    const { placements, inst } = chunk;

    for (let i = 0; i < placements.length; i++) {
      this.packLight(placements[i], inst, i * 4);
    }

    for (const mesh of chunk.meshes) mesh.thinInstanceBufferUpdated('muInst');
  }

  /** Re-packs a chunk's matrices (the snow sink moved) and light. */
  private repackAll(pt: PropType, chunk: Chunk): void {
    const { placements, matrices, shadowMatrices, shadowLists } = chunk;

    for (let i = 0; i < placements.length; i++) {
      this.placeInstance(placements[i], nodeM);
      this.packLight(placements[i], chunk.inst, i * 4);

      for (let j = 0; j < pt.submeshes.length; j++) {
        instanceMatrix(pt.submeshes[j].meshToNode, nodeM, instM);
        writeInstance(instM, matrices[j], i * 16);
      }
    }

    for (let j = 0; j < chunk.meshes.length; j++) {
      chunk.meshes[j].thinInstanceBufferUpdated('matrix');
      chunk.meshes[j].thinInstanceBufferUpdated('muInst');
    }

    for (let s = 0; s < chunk.shadows.length; s++) {
      const j = chunk.shadowSubmesh[s];
      const list = shadowLists[s];
      const data = shadowMatrices[s];
      for (let k = 0; k < list.length; k++) {
        data.set(matrices[j].subarray(list[k] * 16, list[k] * 16 + 16), k * 16);
      }
      chunk.shadows[s].thinInstanceBufferUpdated('matrix');
    }
  }

  update(dt: number): void {
    if (this.disposed) return;

    // The tier decides how the light is packed and whether the blob exists.
    const tier = lightingTier();
    if (tier !== this.tier) {
      this.tier = tier;
      this.rebuild();
    }

    const serial = shadowStateVersion();
    if (serial !== this.shadowSerial) {
      this.shadowSerial = serial;
      const on = blobShadowsActive();
      for (const pt of this.types.values()) {
        for (const chunk of pt.chunks.values()) {
          for (const shadow of chunk.shadows) shadow.setEnabled(on);
        }
      }
    }

    // Classic: BodyLight carries the torch delta, which flickers. Only the
    // chunks a torch reaches are re-packed; tiers >= 1 read the bake alone.
    if (this.tier === null) {
      for (const pt of this.types.values()) {
        if (pt.state !== 'built') continue;
        for (const chunk of pt.chunks.values()) {
          if (terrainLightReaches(chunk.minX, chunk.minZ, chunk.maxX, chunk.maxZ)) {
            this.repackLight(chunk);
          }
        }
      }
    }

    if (this.snow) {
      this.snowTimer += dt;
      if (this.snowTimer >= SNOW_POLL_SECONDS) {
        this.snowTimer = 0;
        const cover = snowCapCover();
        const mask = terrainMaskVersion();
        if (
          Math.abs(cover - this.snowCover) >= SNOW_COVER_STEP ||
          mask !== this.maskVersion
        ) {
          this.snowCover = cover;
          this.maskVersion = mask;
          for (const pt of this.types.values()) {
            if (pt.state !== 'built') continue;
            for (const chunk of pt.chunks.values()) this.repackAll(pt, chunk);
          }
        }
      }
    }
  }

  /** Every built type back to pending: the next flush rebuilds the chunks. */
  private rebuild(): void {
    for (const pt of this.types.values()) {
      if (pt.state !== 'built') continue;
      this.disposeChunks(pt);
      pt.state = 'pending';
    }
    this.syncHold();
  }

  private disposeChunks(pt: PropType): void {
    for (const chunk of pt.chunks.values()) {
      for (const mesh of chunk.meshes) mesh.dispose(false, false);
      for (const shadow of chunk.shadows) shadow.dispose(false, false);
    }
    pt.chunks.clear();
  }

  /**
   * The type goes the way it always went: its records get the model factory
   * and the visibility radius, and `ModelLoaderSystem` takes it from there.
   */
  private fallback(pt: PropType, reason: string): void {
    pt.state = 'fallback';
    this.excluded.set(pt.type, reason);

    this.disposeChunks(pt);
    pt.prototype?.dispose();
    pt.prototype = null;

    for (const p of pt.placements) {
      const entity = p.entity;
      if (entity.modelId === undefined) continue;

      this.world.removeComponent(entity, 'propBatch');
      this.world.addComponent(entity, 'modelFactory', pt.factory);
      this.world.addComponent(entity, 'visibility', {
        state: 'hidden',
        lastChecked: Math.random() * 0.2,
      });
    }

    pt.placements.length = 0;
    this.syncHold();
  }

  private pendingCount(): number {
    let pending = 0;
    for (const pt of this.types.values()) if (pt.state === 'pending') pending++;
    return pending;
  }

  /** The loading screen waits for the batches the way it waits for models. */
  private syncHold(): void {
    const pending = this.pendingCount();

    setSceneHold(SCENE_HOLD, pending > 0);

    if (pending === 0 && !this.summarised && this.types.size > 0) {
      this.summarised = true;
      if (import.meta.env.DEV) {
        const s = this.stats();
        const excluded = [...this.excluded]
          .map(([type, why]) => `${type}: ${why}`)
          .join(', ');
        console.info(
          `prop batches, map ${this.map}: ${s.instances} placements of ` +
            `${s.types} types in ${s.meshes} meshes (${s.shadowMeshes} shadow); ` +
            `per object: ${excluded || 'none'}`
        );
      }
    }
  }

  stats(): PropBatchStats {
    let types = 0;
    let meshes = 0;
    let shadowMeshes = 0;
    let instances = 0;

    for (const pt of this.types.values()) {
      if (pt.state !== 'built') continue;
      types++;
      for (const chunk of pt.chunks.values()) {
        meshes += chunk.meshes.length;
        shadowMeshes += chunk.shadows.length;
        instances += chunk.placements.length;
      }
    }

    return {
      types,
      meshes,
      shadowMeshes,
      instances,
      pending: this.pendingCount(),
      excluded: this.excluded,
    };
  }

  dispose(): void {
    this.disposed = true;

    for (const pt of this.types.values()) {
      this.disposeChunks(pt);
      pt.prototype?.dispose();
      pt.prototype = null;
    }

    this.types.clear();
    this.root.dispose();
    setSceneHold(SCENE_HOLD, false);
  }
}

export type PropBatchStats = {
  types: number;
  meshes: number;
  shadowMeshes: number;
  instances: number;
  pending: number;
  excluded: ReadonlyMap<number, string>;
};

let batches: PropBatches | null = null;

/** The option, with `?batch=0` as the dev A/B. */
export function propBatchingActive(): boolean {
  return GameOptions.propBatching && devQuery('batch') !== '0';
}

function batchesFor(world: World): PropBatches {
  if (!batches || batches.world !== world || batches.map !== world.mapIndex) {
    batches?.dispose();
    batches = new PropBatches(world, world.mapIndex);
  }
  return batches;
}

/**
 * Why a record of this type would stay on the per-object path on the
 * current map, or null when the batches take it.
 */
export function propBatchExclusion(
  world: World,
  type: number,
  factory: typeof ModelObject
): string | null {
  return batchesFor(world).exclusion(type, factory);
}

/**
 * Files a map record with its type's batch. The entity carries `transform`,
 * `modelId` and `worldIndex` and nothing that would put it on the per-object
 * path (no `modelFactory`, no `visibility`); those are added back only if the
 * type falls back.
 */
export function addPropToBatch(
  world: World,
  entity: Entity,
  factory: typeof ModelObject
): void {
  batchesFor(world).add(entity, factory);
}

/** Once a frame, before the render: build what has arrived. */
export function flushPropBatches(world: World): void {
  if (batches && batches.world === world) batches.flush();
}

/** Once a frame: shadow state, torch light, snow. */
export function updatePropBatches(world: World, dt: number): void {
  if (batches && batches.world === world) batches.update(dt);
}

/** Drops every batch of the map just left. */
export function disposePropBatches(): void {
  batches?.dispose();
  batches = null;
}

export function propBatchStats(): PropBatchStats | null {
  return batches?.stats() ?? null;
}
