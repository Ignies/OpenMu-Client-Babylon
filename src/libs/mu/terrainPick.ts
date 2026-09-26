import { extractMinAndMax } from '@babylonjs/core/Maths/math.functions';
import { BoundingInfo, Matrix, Ray, Vector3 } from '../babylon/exports';
import { devQuery } from '../../common/devSeams';
import { TERRAIN_SIZE } from '../../common/terrain/consts';
import type { World } from '../../ecs/world';

/**
 * `?terrainPick=mesh`: the ground is picked the old way, Babylon's walk over
 * all 131 072 of its triangles, which stops at the first hit in index order.
 */
export const TERRAIN_MESH_PICK = devQuery('terrainPick') === 'mesh';

/** A ground hit: `IntersectionInfo.distance`, the mesh's face id, the point. */
export type TerrainHit = {
  distance: number;
  faceId: number;
  point: Vector3;
};

type Intersection = ReturnType<Ray['intersectsTriangle']>;

/** More cells than any line crosses in the grid and its one-cell ring. */
const MAX_CELLS = 4 * (TERRAIN_SIZE + 2);

/** The part of the ray still in play, narrowed by `clip`. */
const span = { t0: 0, t1: 0 };

function clip(o: number, d: number, lo: number, hi: number): boolean {
  if (d === 0) return o >= lo && o <= hi;

  let a = (lo - o) / d;
  let b = (hi - o) / d;
  if (a > b) {
    const s = a;
    a = b;
    b = s;
  }
  if (a > span.t0) span.t0 = a;
  if (b < span.t1) span.t1 = b;

  return span.t0 <= span.t1;
}

function cell(v: number): number {
  return Math.min(Math.max(Math.floor(v), -1), TERRAIN_SIZE);
}

/** Where the ray leaves cell `c` along one axis. */
function exitAt(o: number, d: number, c: number): number {
  if (d > 0) return (c + 1 - o) / d;
  if (d < 0) return (c - o) / d;
  return Infinity;
}

/**
 * A DDA over the tile grid, testing only the tiles the ray crosses with the
 * mesh's own triangles: the hit `Mesh.intersects(ray, false)` finds, exactly.
 */
export class TerrainPicker {
  private readonly bounds: BoundingInfo;
  private readonly minY: number;
  private readonly maxY: number;
  /** The largest height step inside one tile. */
  private readonly tileSpan: number;

  /** Tiles already tested by this pick, marked with `stamp`. */
  private readonly tested = new Uint16Array(TERRAIN_SIZE * TERRAIN_SIZE);
  private stamp = 0;

  private readonly v0 = new Vector3();
  private readonly v1 = new Vector3();
  private readonly v2 = new Vector3();
  private readonly v3 = new Vector3();

  private bestDistance = 0;
  private bestFace = -1;

  /** The ground mesh's own positions (groundArrays.ts), shared, not copied. */
  constructor(private readonly positions: Float32Array) {
    const { minimum, maximum } = extractMinAndMax(
      positions,
      0,
      positions.length / 3
    );
    this.bounds = new BoundingInfo(minimum, maximum);
    this.minY = minimum.y;
    this.maxY = maximum.y;

    let tileSpan = 0;
    for (let p = 0; p < positions.length; p += 12) {
      const a = positions[p + 1];
      const b = positions[p + 4];
      const c = positions[p + 7];
      const d = positions[p + 10];
      const s = Math.max(a, b, c, d) - Math.min(a, b, c, d);
      if (s > tileSpan) tileSpan = s;
    }
    this.tileSpan = tileSpan;
  }

  /** The nearest hit along `ray` into `hit`, or false: `Mesh.intersects`. */
  raycast(ray: Ray, hit: TerrainHit): boolean {
    // `AbstractMesh.intersects` tests the bounds before any triangle.
    if (
      !ray.intersectsSphere(this.bounds.boundingSphere) ||
      !ray.intersectsBox(this.bounds.boundingBox)
    ) {
      return false;
    }

    const o = ray.origin;
    const d = ray.direction;

    // `intersectsTriangle` widens a triangle by `epsilon` (barycentric): a hit
    // can land 2 epsilon outside its tile, and 2 epsilon of its height step.
    const margin = 4 * ray.epsilon + 1e-6;
    const padY = margin * this.tileSpan + 1e-6;

    span.t0 = 0;
    span.t1 = ray.length;
    if (
      !clip(o.x, d.x, -1, TERRAIN_SIZE + 1) ||
      !clip(o.z, d.z, -1, TERRAIN_SIZE + 1) ||
      !clip(o.y, d.y, this.minY - padY, this.maxY + padY)
    ) {
      return false;
    }

    const tEnd = span.t1;
    let tIn = span.t0;
    let x = cell(o.x + d.x * tIn);
    let z = cell(o.z + d.z * tIn);
    const stepX = d.x > 0 ? 1 : d.x < 0 ? -1 : 0;
    const stepZ = d.z > 0 ? 1 : d.z < 0 ? -1 : 0;
    let nextX = exitAt(o.x, d.x, x);
    let nextZ = exitAt(o.z, d.z, z);

    this.bestFace = -1;
    this.bestDistance = 0;
    this.stamp++;
    if (this.stamp > 0xffff) {
      this.tested.fill(0);
      this.stamp = 1;
    }

    for (let n = 0; n < MAX_CELLS; n++) {
      const tOut = Math.max(tIn, Math.min(nextX, nextZ, tEnd));
      this.testCell(ray, x, z, tIn, tOut, margin);

      // Cells are entered in increasing t: nothing past this one is nearer.
      if (tOut >= tEnd) break;
      if (this.bestFace >= 0 && tOut > this.bestDistance) break;

      if (nextX <= nextZ) {
        x += stepX;
        tIn = nextX;
        nextX = exitAt(o.x, d.x, x);
      } else {
        z += stepZ;
        tIn = nextZ;
        nextZ = exitAt(o.z, d.z, z);
      }
      if (x < -1 || x > TERRAIN_SIZE || z < -1 || z > TERRAIN_SIZE) break;
    }

    if (this.bestFace < 0) return false;

    const t = this.bestDistance;
    hit.distance = t;
    hit.faceId = this.bestFace;
    // How `Mesh.intersects` places it, with the terrain's identity world.
    hit.point.set(d.x * t + o.x, d.y * t + o.y, d.z * t + o.z);

    return true;
  }

  /**
   * Cell (x, z) over [tIn, tOut], and every neighbour whose widened triangles
   * the ray passes within reach of there.
   */
  private testCell(
    ray: Ray,
    x: number,
    z: number,
    tIn: number,
    tOut: number,
    margin: number
  ): void {
    const o = ray.origin;
    const d = ray.direction;
    const xa = o.x + d.x * tIn;
    const xb = o.x + d.x * tOut;
    const za = o.z + d.z * tIn;
    const zb = o.z + d.z * tOut;

    const west = Math.min(xa, xb) < x + margin;
    const east = Math.max(xa, xb) > x + 1 - margin;
    const south = Math.min(za, zb) < z + margin;
    const north = Math.max(za, zb) > z + 1 - margin;

    this.testTile(ray, x, z);
    if (west) this.testTile(ray, x - 1, z);
    if (east) this.testTile(ray, x + 1, z);
    if (south) {
      this.testTile(ray, x, z - 1);
      if (west) this.testTile(ray, x - 1, z - 1);
      if (east) this.testTile(ray, x + 1, z - 1);
    }
    if (north) {
      this.testTile(ray, x, z + 1);
      if (west) this.testTile(ray, x - 1, z + 1);
      if (east) this.testTile(ray, x + 1, z + 1);
    }
  }

  private testTile(ray: Ray, x: number, z: number): void {
    if (x < 0 || z < 0 || x >= TERRAIN_SIZE || z >= TERRAIN_SIZE) return;

    const tile = z * TERRAIN_SIZE + x;
    if (this.tested[tile] === this.stamp) return;
    this.tested[tile] = this.stamp;

    const positions = this.positions;
    const p = tile * 12;
    this.v0.set(positions[p], positions[p + 1], positions[p + 2]);
    this.v1.set(positions[p + 3], positions[p + 4], positions[p + 5]);
    this.v2.set(positions[p + 6], positions[p + 7], positions[p + 8]);
    this.v3.set(positions[p + 9], positions[p + 10], positions[p + 11]);

    // The mesh's two triangles, in its index order (groundArrays.ts).
    this.keep(ray.intersectsTriangle(this.v0, this.v1, this.v2), tile * 2);
    this.keep(ray.intersectsTriangle(this.v3, this.v0, this.v2), tile * 2 + 1);
  }

  /**
   * As `subMesh._intersectTriangles`: nothing behind the origin, and equal
   * distances go to the lower face.
   */
  private keep(info: Intersection, faceId: number): void {
    if (!info || info.distance < 0) return;

    if (
      this.bestFace < 0 ||
      info.distance < this.bestDistance ||
      (info.distance === this.bestDistance && faceId < this.bestFace)
    ) {
      this.bestDistance = info.distance;
      this.bestFace = faceId;
    }
  }
}

const groundRay = new Ray(Vector3.Zero(), Vector3.Zero());
const identity = Matrix.Identity();
const groundHit: TerrainHit = { distance: 0, faceId: -1, point: new Vector3() };

/**
 * The ground under screen point (x, y): the nearest hit, the original's rule
 * (`CollisionDetectLineToFace` keeps the smallest distance). The vector is
 * shared and valid until the next call.
 */
export function pickGround(world: World, x: number, y: number): Vector3 | null {
  if (TERRAIN_MESH_PICK) {
    return world.scene.pick(
      x,
      y,
      m => m === world.terrain?.mesh,
      true
    ).pickedPoint;
  }

  const terrain = world.terrain;
  if (!terrain) return null;

  // The ray `scene.pick` builds for the terrain, whose world is the identity.
  world.scene.createPickingRayToRef(x, y, identity, groundRay, null);

  return terrain.picker.raycast(groundRay, groundHit) ? groundHit.point : null;
}
