import { BoundingInfo, Vector3, VertexBuffer, type Matrix, type Mesh } from '../render/babylon/exports';
import { isGridSpec, type AnyClothSpec, type ClothMeshShape } from './physicsCloth';

/** Tiles to MU centimetres. */
const CM = 100;
const point = new Vector3();

/** A GLB mesh's vertices, read back as the BMD's: which vertex each corner is, and the mesh `Create` reads. */
export type WeldedMesh = ClothMeshShape & { readonly corners: Int32Array };

/** A mesh's triangle corners in order: its indices, or (the shipped GLBs have none) its vertices one by one. */
export function cornerOrder(mesh: Mesh): ArrayLike<number> {
  const indices = mesh.getIndices();
  if (indices && indices.length > 0) return indices;
  return Int32Array.from({ length: mesh.getTotalVertices() }, (_, k) => k);
}

/**
 * The converter writes every triangle corner as its own vertex (tools/bmdToGlb.ts), in the BMD's triangle order;
 * the corners of one BMD vertex share its place and its bone. Welded on both, in the order the triangles first
 * name them, they come back as the BMD's vertices, numbered as it numbers them.
 */
export function weldCorners(positions: ArrayLike<number>, joints: ArrayLike<number>, indices: ArrayLike<number>): WeldedMesh {
  const corners = new Int32Array(positions.length / 3);
  const triangles = new Int32Array(indices.length);
  const byPlace = new Map<string, number>();
  const nodes: number[] = [];
  const local: number[] = [];
  for (let n = 0; n < indices.length; n++) {
    const k = indices[n];
    const key = `${positions[3 * k]},${positions[3 * k + 1]},${positions[3 * k + 2]},${joints[4 * k]}`;
    let v = byPlace.get(key);
    if (v === undefined) {
      byPlace.set(key, (v = nodes.length));
      // The skin's joint 0 is its root: a BMD bone is joint `Node + 1`.
      nodes.push(joints[4 * k] - 1);
      local.push(positions[3 * k] * CM, positions[3 * k + 1] * CM, positions[3 * k + 2] * CM);
    }
    corners[k] = v;
    triangles[n] = v;
  }
  return { corners, nodes: Int32Array.from(nodes), local: Float64Array.from(local), triangles };
}

/**
 * `CPhysicsClothMesh::Create`'s grid form (PhysicsManager.cpp:1061-1093): triangle j takes half of quad j / 2, the
 * quads row by row; each corner becomes grid vertex `y * hor + x` with the UV `(x / (hor - 1), y / (ver - 1))`.
 * Written per corner of `indices` into `corners` (the grid vertex) and `uvs`.
 */
export function gridCorners(indices: ArrayLike<number>, hor: number, ver: number, corners: Int32Array, uvs: Float32Array): void {
  const X = [0, 1, 0, 1, 1, 0];
  const Y = [0, 0, 1, 0, 1, 1];
  for (let n = 0; n < indices.length; n++) {
    const j = Math.trunc(n / 3);
    const quad = Math.trunc(j / 2);
    const c = (j % 2) * 3 + (n % 3);
    const x = X[c] + (quad % (hor - 1));
    const y = Y[c] + Math.trunc(quad / (hor - 1));
    const k = indices[n];
    corners[k] = y * hor + x;
    uvs[2 * k] = x / (hor - 1);
    uvs[2 * k + 1] = y / (ver - 1);
  }
}

/**
 * `CPhysicsClothMesh::Render` (PhysicsManager.cpp:1195-1209): the cloth drawn as the model's own mesh, which then
 * draws as it always does (its material, level and excellent passes). That mesh gets geometry of its own, every
 * corner skinned to the cloth's bone; a tick writes each corner's cloth vertex in that bone's frame, so between
 * ticks the bone carries it. A grid cloth (`PCT_OPT_MESHPROG`) also lays its triangles' UVs over the grid.
 */
export class ClothSkin {
  /** A mesh cloth's mesh, for `PhysicsCloth`; null on a grid. */
  readonly shape: ClothMeshShape | null;
  private readonly corners: Int32Array;
  private readonly positions: Float32Array;

  constructor(
    readonly target: Mesh,
    spec: AnyClothSpec
  ) {
    const positions = target.getVerticesData(VertexBuffer.PositionKind) ?? new Float32Array(0);
    const indices = cornerOrder(target);
    const count = positions.length / 3;
    this.positions = Float32Array.from(positions);
    target.makeGeometryUnique();
    if (isGridSpec(spec)) {
      const uvs = new Float32Array(count * 2);
      this.corners = new Int32Array(count);
      gridCorners(indices, spec.grid[0], spec.grid[1], this.corners, uvs);
      this.shape = null;
      target.setVerticesData(VertexBuffer.UVKind, uvs, false);
    } else {
      const welded = weldCorners(positions, target.getVerticesData(VertexBuffer.MatricesIndicesKind) ?? [], indices);
      this.corners = welded.corners;
      this.shape = welded;
    }
    const joints = new Float32Array(count * 4);
    for (let k = 0; k < count; k++) joints[4 * k] = spec.bone + 1;
    target.setVerticesData(VertexBuffer.MatricesIndicesKind, joints, false);
    // New positions rebuild the box from the bone-local vertices: the posed box the model gave it stays.
    const box = target.getBoundingInfo();
    const min = box.minimum.clone();
    const max = box.maximum.clone();
    target.setVerticesData(VertexBuffer.PositionKind, this.positions, true);
    target.setBoundingInfo(new BoundingInfo(min, max, target.getWorldMatrix()));
  }

  /** Whether the model let this mesh go (a new part or model disposes its old meshes): the cloth goes with it. */
  get stale(): boolean {
    return this.target.isDisposed();
  }

  /** The cloth's vertices (MU world centimetres) into the corners, in the frame `toBone` (the bone's world, inverted). */
  write(pos: Float64Array, toBone: Matrix): void {
    const { positions, corners } = this;
    for (let k = 0; k < corners.length; k++) {
      const v = 3 * corners[k];
      Vector3.TransformCoordinatesFromFloatsToRef(pos[v] / CM, pos[v + 2] / CM, pos[v + 1] / CM, toBone, point);
      positions[3 * k] = point.x;
      positions[3 * k + 1] = point.y;
      positions[3 * k + 2] = point.z;
    }
    this.target.updateVerticesData(VertexBuffer.PositionKind, positions, false, false);
  }

  // The model draws it: no faces, light, world or shadow of its own (`Render` takes no colour).
  setWorld(): void {}
  setLight(): void {}
  show(): void {}
  dispose(): void {}
}
