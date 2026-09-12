import {
  Matrix,
  Quaternion,
  Vector3,
  type IVector3Like,
} from '../libs/babylon/exports';
import type { ModelObject } from './modelObject';
import { TERRAIN_SIZE } from './terrain/consts';
import { toRenderAngles } from './renderAngles';

/**
 * The pure half of the prop batches (`propBatches.ts`): which types may be
 * batched, which chunk a placement lands in, and the matrix a placement gets.
 * No scene, no tables - everything that needs a map lookup is handed in.
 */

/** One map record as `createObjects` reads it: tiles, radians, uniform scale. */
export type PropPlacement = {
  readonly pos: IVector3Like;
  readonly rot: IVector3Like;
  readonly scale: number;
};

/**
 * Tiles per chunk side. The original draws by 16-tile `ObjectBlock`; twice
 * that keeps a 256-tile map at 64 chunks, so a type present everywhere (Noria's
 * flowers) is 64 meshes, not 256, and the camera's view still spans only a
 * handful of them.
 */
export const CHUNK_TILES = 32;

export const CHUNKS_PER_SIDE = TERRAIN_SIZE / CHUNK_TILES;

function chunkIndex(tile: number): number {
  const i = Math.floor(tile / CHUNK_TILES);
  return i < 0 ? 0 : i >= CHUNKS_PER_SIDE ? CHUNKS_PER_SIDE - 1 : i;
}

/** The chunk a tile position falls in; positions off the map clamp to the edge. */
export function chunkOf(x: number, z: number): number {
  return chunkIndex(z) * CHUNKS_PER_SIDE + chunkIndex(x);
}

/**
 * Why a type stays on the per-object path, or null when its records may be
 * batched. `excluded` is what the map's own tables say about the type
 * (lights, emitters, doors, rest objects, room pieces), resolved by the
 * caller; the class marker is the only rule that lives here.
 */
export function batchExclusion(
  factory: typeof ModelObject,
  excluded: string | null
): string | null {
  if (!factory.Batchable) return 'class';
  return excluded;
}

const angles = Vector3.Zero();
const rotation = Quaternion.Identity();
const scaling = Vector3.One();
const translation = Vector3.Zero();

/**
 * The world matrix `RenderSystem` + `ModelObject.updateLocation` give a
 * placement's node: `toRenderAngles` on the record's rotation, uniform scale,
 * the record's position lifted by `yOffset` (the snow sink, negative).
 * Babylon composes a node's Euler `rotation` as yaw-pitch-roll, which is what
 * `FromEulerAngles` builds.
 */
export function placementMatrix(
  p: PropPlacement,
  out: Matrix,
  yOffset = 0
): Matrix {
  toRenderAngles(p.rot, angles);
  Quaternion.FromEulerAnglesToRef(angles.x, angles.y, angles.z, rotation);
  scaling.setAll(p.scale);
  translation.set(p.pos.x, p.pos.y + yOffset, p.pos.z);

  return Matrix.ComposeToRef(scaling, rotation, translation, out);
}

/**
 * A thin instance's matrix: the submesh's own transform under its model root
 * (`meshToNode`, the loader's basis change included) followed by the node's
 * placement. Babylon's thin-instance shader applies the bones first, then
 * this, then the (identity) chunk mesh world - the same order the per-object
 * clone's `mesh.getWorldMatrix()` is built in.
 */
export function instanceMatrix(
  meshToNode: Matrix,
  node: Matrix,
  out: Matrix
): Matrix {
  return meshToNode.multiplyToRef(node, out);
}

const corner = Vector3.Zero();

/** Grows `min`/`max` by the eight corners of the local box under `m`. */
export function extendByBox(
  localMin: Vector3,
  localMax: Vector3,
  m: Matrix,
  min: Vector3,
  max: Vector3
): void {
  for (let i = 0; i < 8; i++) {
    Vector3.TransformCoordinatesFromFloatsToRef(
      i & 1 ? localMax.x : localMin.x,
      i & 2 ? localMax.y : localMin.y,
      i & 4 ? localMax.z : localMin.z,
      m,
      corner
    );
    Vector3.CheckExtends(corner, min, max);
  }
}
