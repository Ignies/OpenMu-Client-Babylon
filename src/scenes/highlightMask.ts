import {
  Frustum,
  Matrix,
  Plane,
  VertexBuffer,
  type AbstractMesh,
  type HighlightLayer,
  type Mesh,
  type Scene,
} from '../libs/babylon/exports';
import { devQuery } from '../common/devSeams';

/** `?hlList=0`: the hover mask draws every active mesh, as Babylon has it. */
const MASK_LIST = devQuery('hlList') !== '0';

/** NDC slack around the lit box: CPU/GPU float error cannot shave an edge. */
const RECT_MARGIN = 0.01;

/** A corner at or behind the eye has no screen position to bound. */
const MIN_CLIP_W = 1e-6;

export type ScreenRect = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export function resetRect(rect: ScreenRect): ScreenRect {
  rect.minX = rect.minY = Number.POSITIVE_INFINITY;
  rect.maxX = rect.maxY = Number.NEGATIVE_INFINITY;

  return rect;
}

/**
 * Extends `rect` by the NDC corners of the local box `box[o..o+5]` (min xyz,
 * max xyz) through the row-vector matrix `m`. False when a corner is at or
 * behind the eye.
 */
export function extendBoxRect(
  box: ArrayLike<number>,
  o: number,
  m: Matrix,
  rect: ScreenRect
): boolean {
  const e = m.m;

  for (let corner = 0; corner < 8; corner++) {
    const x = box[o + (corner & 1 ? 3 : 0)];
    const y = box[o + 1 + (corner & 2 ? 3 : 0)];
    const z = box[o + 2 + (corner & 4 ? 3 : 0)];

    const w = x * e[3] + y * e[7] + z * e[11] + e[15];
    if (!(w > MIN_CLIP_W)) return false;

    const sx = (x * e[0] + y * e[4] + z * e[8] + e[12]) / w;
    const sy = (x * e[1] + y * e[5] + z * e[9] + e[13]) / w;

    if (sx < rect.minX) rect.minX = sx;
    if (sx > rect.maxX) rect.maxX = sx;
    if (sy < rect.minY) rect.minY = sy;
    if (sy > rect.maxY) rect.maxY = sy;
  }

  return true;
}

/**
 * Per-bone-slot local boxes of the vertices each bone moves (6 floats a slot,
 * +Inf min when unused). Null for a blended or negative weight.
 */
export function boneBoxesFrom(
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
  weights: ArrayLike<number>,
  influencers: number
): Float32Array | null {
  if (influencers < 1 || influencers > 4) return null;

  const vertexCount = Math.floor(positions.length / 3);
  if (indices.length < vertexCount * 4 || weights.length < vertexCount * 4) {
    return null;
  }

  const slotOf = new Int32Array(vertexCount);
  let slots = 0;

  for (let v = 0; v < vertexCount; v++) {
    let slot = -1;

    for (let k = 0; k < influencers; k++) {
      const weight = weights[v * 4 + k];
      if (!(weight >= 0)) return null;
      if (weight === 0) continue;
      if (slot !== -1) return null;

      slot = indices[v * 4 + k];
      if (!(slot >= 0) || slot !== Math.floor(slot)) return null;
    }

    // A vertex with no live weight skins to the clip origin and covers no
    // pixel.
    slotOf[v] = slot;
    if (slot + 1 > slots) slots = slot + 1;
  }

  const boxes = new Float32Array(slots * 6);

  for (let b = 0; b < slots; b++) {
    boxes.fill(Number.POSITIVE_INFINITY, b * 6, b * 6 + 3);
    boxes.fill(Number.NEGATIVE_INFINITY, b * 6 + 3, b * 6 + 6);
  }

  for (let v = 0; v < vertexCount; v++) {
    const slot = slotOf[v];
    if (slot < 0) continue;

    const o = slot * 6;

    for (let a = 0; a < 3; a++) {
      const value = positions[v * 3 + a];
      if (value < boxes[o + a]) boxes[o + a] = value;
      if (value > boxes[o + 3 + a]) boxes[o + 3 + a] = value;
    }
  }

  return boxes;
}

const bone = new Matrix();
const boneClip = new Matrix();

/** Extends `rect` by a skinned mesh's posed boxes, one per live bone slot. */
export function extendSkinnedRect(
  boxes: Float32Array,
  matrices: ArrayLike<number>,
  worldViewProjection: Matrix,
  rect: ScreenRect
): boolean {
  const slots = boxes.length / 6;
  if (matrices.length < slots * 16) return false;

  for (let b = 0; b < slots; b++) {
    if (boxes[b * 6] === Number.POSITIVE_INFINITY) continue;

    Matrix.FromArrayToRef(matrices, b * 16, bone);
    bone.multiplyToRef(worldViewProjection, boneClip);

    if (!extendBoxRect(boxes, b * 6, boneClip, rect)) return false;
  }

  return true;
}

/** Keyed by the position buffer: a mesh given new positions gets a new one. */
const positionBoxes = new WeakMap<object, Float32Array | null>();

type BoneBoxEntry = {
  influencers: number;
  indices: object;
  weights: object;
  boxes: Float32Array | null;
};

const boneBoxEntries = new WeakMap<object, BoneBoxEntry>();

function positionBox(mesh: AbstractMesh): Float32Array | null {
  const buffer = (mesh as Mesh).getVertexBuffer?.(VertexBuffer.PositionKind);
  if (!buffer || buffer.isUpdatable()) return null;

  const cached = positionBoxes.get(buffer);
  if (cached !== undefined) return cached;

  const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
  let box: Float32Array | null = null;

  if (positions && positions.length >= 3) {
    box = new Float32Array(6);
    box.fill(Number.POSITIVE_INFINITY, 0, 3);
    box.fill(Number.NEGATIVE_INFINITY, 3, 6);

    for (let i = 0; i < positions.length; i += 3) {
      for (let a = 0; a < 3; a++) {
        const value = positions[i + a];
        if (value < box[a]) box[a] = value;
        if (value > box[3 + a]) box[3 + a] = value;
      }
    }
  }

  positionBoxes.set(buffer, box);

  return box;
}

function boneBoxes(mesh: AbstractMesh): Float32Array | null {
  const source = mesh as Mesh;
  const positionsBuffer = source.getVertexBuffer?.(VertexBuffer.PositionKind);
  const indicesBuffer = source.getVertexBuffer?.(
    VertexBuffer.MatricesIndicesKind
  );
  const weightsBuffer = source.getVertexBuffer?.(
    VertexBuffer.MatricesWeightsKind
  );

  if (!positionsBuffer || !indicesBuffer || !weightsBuffer) return null;
  if (
    positionsBuffer.isUpdatable() ||
    indicesBuffer.isUpdatable() ||
    weightsBuffer.isUpdatable()
  ) {
    return null;
  }

  const influencers = mesh.numBoneInfluencers;
  const cached = boneBoxEntries.get(positionsBuffer);

  if (
    cached &&
    cached.influencers === influencers &&
    cached.indices === indicesBuffer &&
    cached.weights === weightsBuffer
  ) {
    return cached.boxes;
  }

  const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
  const indices = mesh.getVerticesData(VertexBuffer.MatricesIndicesKind);
  const weights = mesh.getVerticesData(VertexBuffer.MatricesWeightsKind);

  const boxes =
    positions && indices && weights
      ? boneBoxesFrom(positions, indices, weights, influencers)
      : null;

  boneBoxEntries.set(positionsBuffer, {
    influencers,
    indices: indicesBuffer,
    weights: weightsBuffer,
    boxes,
  });

  return boxes;
}

const worldViewProjection = new Matrix();

/**
 * The screen box of what a lit mesh draws into the mask, built from its own
 * vertices (posed per bone when skinned), not its culling box. False when
 * that cannot be bounded.
 */
function extendMeshRect(
  mesh: AbstractMesh,
  viewProjection: Matrix,
  rect: ScreenRect
): boolean {
  if (mesh.hasThinInstances || mesh.morphTargetManager) return false;

  mesh.getWorldMatrix().multiplyToRef(viewProjection, worldViewProjection);

  // The mask's own vertex shader skins on exactly this test
  // (thinEffectLayer.js _internalIsSubMeshReady).
  if (mesh.useBones) {
    if (!mesh.computeBonesUsingShaders || !mesh.skeleton) return false;

    const boxes = boneBoxes(mesh);

    return (
      boxes !== null &&
      extendSkinnedRect(
        boxes,
        mesh.skeleton.getTransformMatrices(mesh),
        worldViewProjection,
        rect
      )
    );
  }

  const box = positionBox(mesh);

  return box !== null && extendBoxRect(box, 0, worldViewProjection, rect);
}

/**
 * Whether the camera's box bounds what this mesh draws into the mask. Skinned
 * body boxes were grown over one clip; frozen boxes are trusted only on chunks.
 */
export function cullableByBounds(mesh: AbstractMesh): boolean {
  if (mesh.alwaysSelectAsActiveMesh || mesh.morphTargetManager) return false;

  // Chunks boxed by hand over every instance (propBatches, terrainGrass).
  if (mesh.hasThinInstances) return mesh.doNotSyncBoundingInfo;
  if (mesh.skeleton || mesh.doNotSyncBoundingInfo) return false;

  const positions = (mesh as Mesh).getVertexBuffer?.(VertexBuffer.PositionKind);

  return !!positions && !positions.isUpdatable();
}

const remap = new Matrix();
const narrowed = new Matrix();

/** The camera frustum narrowed to `rect` (plus the margin), as six planes. */
export function rectFrustumToRef(
  viewProjection: Matrix,
  rect: ScreenRect,
  planes: Plane[]
): void {
  const x0 = rect.minX - RECT_MARGIN;
  const x1 = rect.maxX + RECT_MARGIN;
  const y0 = rect.minY - RECT_MARGIN;
  const y1 = rect.maxY + RECT_MARGIN;

  const hx = (x1 - x0) / 2;
  const hy = (y1 - y0) / 2;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;

  // clip * remap sends the rect to the whole clip square.
  Matrix.FromValuesToRef(
    1 / hx, 0, 0, 0,
    0, 1 / hy, 0, 0,
    0, 0, 1, 0,
    -cx / hx, -cy / hy, 0, 1,
    remap
  );

  viewProjection.multiplyToRef(remap, narrowed);
  Frustum.GetPlanesToRef(narrowed, planes);
}

const rect = resetRect({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
let lit = new Uint8Array(1024);

/**
 * The active meshes that can change a mask pixel, in active order: the lit
 * ones plus any whose box is untrusted or reaches the lit screen box. Null
 * (draw the whole list) when the lit box cannot be bounded.
 */
export function selectMaskMeshes(
  list: readonly AbstractMesh[],
  length: number,
  isLit: (mesh: AbstractMesh) => boolean,
  viewProjection: Matrix,
  planes: Plane[],
  out: AbstractMesh[]
): AbstractMesh[] | null {
  if (lit.length < length) {
    lit = new Uint8Array(Math.max(length, lit.length * 2));
  }

  resetRect(rect);

  let anyLit = false;

  for (let i = 0; i < length; i++) {
    const mesh = list[i];
    lit[i] = isLit(mesh) ? 1 : 0;
    if (lit[i] === 0) continue;

    anyLit = true;
    if (!extendMeshRect(mesh, viewProjection, rect)) return null;
  }

  let n = 0;

  if (anyLit) {
    if (
      !Number.isFinite(rect.minX) ||
      !Number.isFinite(rect.maxX) ||
      !Number.isFinite(rect.minY) ||
      !Number.isFinite(rect.maxY)
    ) {
      return null;
    }

    rectFrustumToRef(viewProjection, rect, planes);

    for (let i = 0; i < length; i++) {
      const mesh = list[i];

      if (lit[i] === 1 || !cullableByBounds(mesh) || mesh.isInFrustum(planes)) {
        out[n++] = mesh;
      }
    }
  }

  out.length = n;

  return out;
}

/**
 * Babylon draws every active mesh into the mask, unlit ones black as occluders
 * (thinHighlightLayer.js _shouldRenderMesh); only those near lit pixels count.
 */
export function cullHighlightMask(scene: Scene, hl: HighlightLayer): void {
  if (!MASK_LIST) return;

  const planes = [0, 1, 2, 3, 4, 5].map(() => new Plane(0, 0, 0, 0));
  const out: AbstractMesh[] = [];
  const isLit = (mesh: AbstractMesh) => hl.hasMesh(mesh);
  const texture = hl.mainTexture;

  // Both live on the ObjectRenderer a resize hands to the new target. A custom
  // list skips the camera layer-mask test unless it is forced.
  texture.forceLayerMaskCheck = true;
  texture.getCustomRenderList = (_pass, list, length) =>
    list && !scene.skipFrustumClipping
      ? selectMaskMeshes(
          list,
          length,
          isLit,
          scene.getTransformMatrix(),
          planes,
          out
        )
      : null;
}
