/**
 * `CPhysicsCloth` (Engine/Physics/PhysicsManager.cpp:295-946): a grid of vertices whose top row is pinned
 * to a bone, held together by links and pushed by gravity, wind and collision spheres; and
 * `CPhysicsClothMesh` (:948-1209), the same made of a model's own mesh. Everything is in MU world
 * centimetres, z up; the host turns its bones into that (`ClothAnchor`). One `move2` call is one 25 Hz
 * frame of the original, where `FPS_ANIMATION_FACTOR` is 1.
 */

// The PCT_* flags (PhysicsManager.h:115-150) a cloth is created with.
export const PCT_FLAT = 0x0;
export const PCT_CURVED = 0x1;
export const PCT_STICKED = 0x2;
const PCT_MASK_SHAPE = 0x3;
export const PCT_SHORT_SHOULDER = 0x4;
export const PCT_CYLINDER = 0x8;
const PCT_MASK_SHAPE_EXT = 0xc;
const PCT_SHAPE_HALLOWEEN = 0x10;
export const PCT_RUBBER = 0x100;
export const PCT_RUBBER2 = 0x200;
const PCT_MASK_ELASTIC = 0x300;
export const PCT_HEAVY = 0x400;
export const PCT_MASK_ALPHA = 0x1000;
export const PCT_MASK_BLEND = 0x2000;
export const PCT_MASK_DRAW = 0x3000;
const PCT_ELASTIC_HALLOWEEN = 0x4000;
export const PCT_ELASTIC_RAGE_L = 0x8000;
export const PCT_ELASTIC_RAGE_R = 0xc000;
const PCT_MASK_ELASTIC_EXT = 0xe000;
const PCT_OPT_CORRECTEDFORCE = 0x20000000;
export const PCT_MASK_LIGHT = 0x40000000;

// St_PhysicsLink styles (PhysicsManager.h:152-155).
const PLS_LOOSEDISTANCE = 0x1;
const PLS_SPRING = 0x2;
const PLS_STRICTDISTANCE = 0x4;

const RATE_SHORT_SHOULDER = 0.6;
/** `s_Gravity * s_fMass` (PhysicsManager.cpp:18-19); `s_fInvOfMass` is 400. */
const GRAVITY_MASS = 9.8 * 0.0025;
const INV_MASS = 400;

/** What every cloth has: its bone, its `PCT_*` flags, its `SetWindMinMax` and `AddCollisionSphere` calls. */
type ClothBase = {
  /** `iBone`: the bone the top row hangs from, or whose vertices a mesh cloth pins. */
  readonly bone: number;
  /** `dwType`: the PCT_* flags. */
  readonly flags: number;
  /** `SetWindMinMax(min, max)`, the rubber2 gusts in hundredths; 1, 1 when never set (:321-322). */
  readonly wind?: readonly [number, number];
  /** `AddCollisionSphere(x, y, z, radius, bone)`. */
  readonly spheres?: readonly (readonly [number, number, number, number, number])[];
};

/** One cloth: `CPhysicsCloth::Create`'s arguments plus its `SetWindMinMax` and `AddCollisionSphere` calls. */
export type ClothSpec = ClothBase & {
  /** `fxPos, fyPos, fzPos`: where on the bone the top row sits. */
  readonly at: readonly [number, number, number];
  /** `iNumHor, iNumVer`. */
  readonly grid: readonly [number, number];
  /** `fWidth, fHeight`. */
  readonly size: readonly [number, number];
  /** `iTexFront, iTexBack` as `Data/` paths. */
  readonly front: string;
  readonly back: string;
  /**
   * `CPhysicsClothMesh::Create`'s grid form (`PCT_OPT_MESHPROG`, :1045-1096): the grid drawn as this mesh of the
   * model, its triangles and UVs laid over the grid, in the model's own texture rather than `front` and `back`.
   */
  readonly mesh?: number;
};

/** `CPhysicsClothMesh::Create(o, iMesh, iBone, dwType)` (:964-1043): mesh `mesh` of the model made cloth. */
export type ClothMeshSpec = ClothBase & { readonly mesh: number };

export type AnyClothSpec = ClothSpec | ClothMeshSpec;

/** A grid cloth, drawn as itself or (`mesh`) over a mesh of the model. */
export const isGridSpec = (spec: AnyClothSpec): spec is ClothSpec => 'grid' in spec;

/** A mesh as `CPhysicsClothMesh::Create` reads it: each vertex's bone and place on it, and the triangles. */
export type ClothMeshShape = {
  /** `Vertex_t::Node`. */
  readonly nodes: Int32Array;
  /** `Vertex_t::Position`: MU centimetres in its bone's frame, three a vertex. */
  readonly local: Float64Array;
  /** `Triangle_t::VertexIndex`, three a triangle. */
  readonly triangles: Int32Array;
};

/** The body a cloth hangs on, in MU world centimetres. Written into `out[at..at+2]`. */
export interface ClothAnchor {
  /** `TransformPosition(BoneTransform[bone], p, out, true)`: a point in the bone's frame. */
  bonePoint(bone: number, x: number, y: number, z: number, out: Float64Array, at: number): void;
  /** `Create`'s matrix, `AngleMatrix(o->Angle)` with the bone's translation (PhysicsManager.cpp:363-371). */
  bodyPoint(bone: number, x: number, y: number, z: number, out: Float64Array, at: number): void;
  /** `(sin(180 + Angle[2]), -cos(180 + Angle[2]))`: the wind's direction, behind the body (:609-610). */
  readonly windX: number;
  readonly windY: number;
}

/** `VectorLength` (`Math.hypot` is several times slower). */
const length = (x: number, y: number, z: number): number => Math.sqrt(x * x + y * y + z * z);

/** `rand()` of the original: 0..RAND_MAX (32767). */
const rand = (): number => Math.floor(Math.random() * 32768);

/** `m_byWindMin, m_byWindMax` before any `SetWindMinMax` (:321-322). */
const NO_WIND = [1, 1] as const;

/** `CPhysicsManager::s_fWind`, the wind every cloth shares. */
let sharedWind = 0;

/** `CPhysicsManager::Move` (:1228-1232): once a 25 Hz frame, before the cloths move. */
export function stepClothWind(): void {
  sharedWind = Math.min(1, Math.max(-0.2, sharedWind + (rand() % 200 - 100) * 0.001));
}

/** Sets the shared wind outright (tests). */
export function setClothWind(wind: number): void {
  sharedWind = wind;
}

/** `UpdateForce`'s gust on a vertex `key` steps from the seed vertex (PhysicsManager.cpp:60-61). */
export function windGain(key: number): number {
  const steps = Math.min(Math.max(0, 5 - key), 4);
  return steps === 0 ? 0 : steps + 2;
}

/** One pass's links: the two vertices and the rest length (`m_fDistance[1]`; the floor is `near` of it). */
type Links = { readonly a: Int32Array; readonly b: Int32Array; readonly far: Float64Array; count: number };

const links = (n: number): Links => ({ a: new Int32Array(n), b: new Int32Array(n), far: new Float64Array(n), count: 0 });

function addLink(list: Links, a: number, b: number, far: number): void {
  list.a[list.count] = a;
  list.b[list.count] = b;
  list.far[list.count++] = far;
}

export class PhysicsCloth {
  /** `m_iNumHor, m_iNumVer`: 0 on a mesh cloth, whose `Create` never sets them. */
  readonly hor: number;
  readonly ver: number;
  readonly count: number;
  /** `m_vPos` of every vertex, row by row from the pinned top row. */
  readonly pos: Float64Array;
  /** `m_vVel`. */
  readonly vel: Float64Array;
  readonly linkCount: number;

  private readonly force: Float64Array;
  /** `m_vOneTimeMove` and `m_iCountOneTimeMove`. */
  private readonly shift: Float64Array;
  private readonly shifts: Int32Array;
  private readonly fixed: Uint8Array;
  /** The links by what each pass does with them, in `Create`'s order: `PLS_SPRING`, `PLS_LOOSEDISTANCE`, `PLS_STRICTDISTANCE`. */
  readonly springs: Links;
  readonly loose: Links;
  readonly strict: Links;
  /** `m_fDistance[0]` over `m_fDistance[1]`: 0.8 on a grid, 0.5 on a mesh (:458, :1026). */
  private readonly near: number;
  private readonly centers: Float64Array;
  private wind = 0;

  constructor(
    readonly spec: AnyClothSpec,
    /** A mesh cloth's mesh. */
    private readonly shape: ClothMeshShape | null = null
  ) {
    if (isGridSpec(spec)) {
      const [hor, ver] = spec.grid;
      this.hor = hor;
      this.ver = ver;
      this.count = hor * ver;
      // What `Create` makes (PhysicsManager.cpp:449-478): down, across, the down and (from the third row) up diagonals.
      this.linkCount = hor * (ver - 1) + (hor - 1) * ver + (hor - 1) * (ver - 1) + (hor - 1) * Math.max(0, ver - 2);
      this.near = 0.8;
    } else {
      if (!shape) throw new Error('a mesh cloth needs its mesh');
      this.hor = this.ver = 0;
      this.count = shape.nodes.length;
      // `NumTriangles * 3 * 2`: each edge and at most one link across it (:991).
      this.linkCount = (shape.triangles.length / 3) * 6;
      this.near = 0.5;
    }
    this.pos = new Float64Array(this.count * 3);
    this.vel = new Float64Array(this.count * 3);
    this.force = new Float64Array(this.count * 3);
    this.shift = new Float64Array(this.count * 3);
    this.shifts = new Int32Array(this.count);
    this.fixed = new Uint8Array(this.count);
    this.springs = links(this.linkCount);
    this.loose = links(this.linkCount);
    this.strict = links(this.linkCount);
    this.centers = new Float64Array((spec.spheres?.length ?? 0) * 3);
  }

  /** `CPhysicsCloth::Create` (PhysicsManager.cpp:325-482): the grid laid out on the body, its links, its pins. */
  create(anchor: ClothAnchor): void {
    this.vel.fill(0);
    this.force.fill(0);
    this.shift.fill(0);
    this.shifts.fill(0);
    this.fixed.fill(0);
    this.springs.count = this.loose.count = this.strict.count = 0;
    const spec = this.spec;
    if (!isGridSpec(spec)) {
      this.layMesh(anchor, this.shape as ClothMeshShape);
      return;
    }
    const { hor, ver, pos } = this;
    const flags = spec.flags;
    const [width, height] = spec.size;
    const unitH = height / (ver - 1);
    const cylinder = (flags & PCT_MASK_SHAPE_EXT) === PCT_CYLINDER;
    for (let j = 0; j < ver; j++) {
      let w = width;
      if ((flags & PCT_MASK_SHAPE_EXT) === PCT_SHORT_SHOULDER) {
        w *= RATE_SHORT_SHOULDER + ((1 - RATE_SHORT_SHOULDER) * j) / (ver - 1);
      }
      const unitW = w / (hor - 1);
      for (let i = 0; i < hor; i++) {
        let x: number;
        let y: number;
        let z: number;
        if (cylinder) {
          x = unitW * i;
          y = Math.sin((i / (hor - 1)) * Math.PI) * 100 - 30;
          z = unitH * j;
        } else {
          x = unitW * i - 0.5 * w;
          y = 20;
          z = -unitH * j;
        }
        if ((flags & PCT_MASK_SHAPE) === PCT_CURVED) {
          const m = 2 * Math.abs(i / (hor - 1) - 0.5);
          y -= 10 * m * m;
        } else if ((flags & PCT_MASK_SHAPE) === PCT_STICKED) {
          y = 0;
        }
        anchor.bodyPoint(spec.bone, x, y, z, pos, 3 * (hor * j + i));
      }
    }

    const rubber = (flags & PCT_MASK_ELASTIC) === PCT_RUBBER;
    const vertical = rubber ? 0 : PLS_STRICTDISTANCE;
    const cross = rubber ? 0 : PLS_LOOSEDISTANCE;
    for (let j = 0; j < ver; j++) {
      for (let i = 0; i < hor; i++) {
        const v = hor * j + i;
        if (j < ver - 1) this.link(v, v + hor, PLS_SPRING | vertical);
        if (i < hor - 1) {
          this.link(v, v + 1, PLS_SPRING | PLS_LOOSEDISTANCE);
          if (j < ver - 1) this.link(v, v + 1 + hor, cross);
          if (j > 1) this.link(v, v + 1 - hor, cross);
        }
      }
    }
    this.pin(anchor, true);
  }

  /**
   * `CPhysicsClothMesh::Create` (:998-1040): each vertex where its bone puts it (`VertexTransform`), pinned on the
   * cloth's bone; a link along each triangle edge, loose when its ends are over 10 apart in x, and one from the
   * far corner to the far corner of the triangle across the edge (`FindMatchVertex`, never vertex 0; `FindInLink`).
   */
  private layMesh(anchor: ClothAnchor, shape: ClothMeshShape): void {
    const { pos, fixed, springs } = this;
    const { nodes, local, triangles } = shape;
    for (let v = 0; v < this.count; v++) {
      anchor.bonePoint(nodes[v], local[3 * v], local[3 * v + 1], local[3 * v + 2], pos, 3 * v);
      fixed[v] = nodes[v] === this.spec.bone ? 1 : 0;
    }
    for (let t = 0; t < triangles.length; t += 3) {
      for (let i = 0; i < 3; i++) {
        const v1 = triangles[t + i];
        const v2 = triangles[t + ((i + 1) % 3)];
        const v3 = triangles[t + ((i + 2) % 3)];
        const style = PLS_SPRING | (Math.abs(pos[3 * v1] - pos[3 * v2]) > 10 ? PLS_LOOSEDISTANCE : PLS_STRICTDISTANCE);
        const d = this.link(v1, v2, style);
        const match = matchVertex(triangles, v1, v2, v3);
        if (match <= 0 || this.distance(v3, match) >= d * 1.2) continue;
        let linked = false;
        for (let l = 0; l < springs.count && !linked; l++) linked = springs.a[l] === v3 && springs.b[l] === match;
        if (!linked) this.link(v3, match, style);
      }
    }
  }

  private distance(a: number, b: number): number {
    const p = this.pos;
    return length(p[3 * a] - p[3 * b], p[3 * a + 1] - p[3 * b + 1], p[3 * a + 2] - p[3 * b + 2]);
  }

  /** `SetLink` at the two vertices' distance now, `near` of it the floor. A strict pass only takes links below the pins. */
  private link(a: number, b: number, style: number): number {
    const d = this.distance(a, b);
    if (style & PLS_SPRING) addLink(this.springs, a, b, d);
    if (style & PLS_LOOSEDISTANCE) addLink(this.loose, a, b, d);
    if (style & PLS_STRICTDISTANCE && b >= this.hor) addLink(this.strict, a, b, d);
    return d;
  }

  /**
   * `SetFixedVertices` (PhysicsManager.cpp:500-558): the top row on the bone, turned into its frame as (z, -y, x).
   * A mesh cloth's (:1131-1156): its vertices on the bone, where the bone puts them this frame.
   */
  private pin(anchor: ClothAnchor, atCreate: boolean): void {
    const { hor, spec, pos } = this;
    if (!isGridSpec(spec)) {
      const { nodes, local } = this.shape as ClothMeshShape;
      for (let v = 0; v < this.count; v++) {
        if (nodes[v] === spec.bone) anchor.bonePoint(spec.bone, local[3 * v], local[3 * v + 1], local[3 * v + 2], pos, 3 * v);
      }
      return;
    }
    const flags = spec.flags;
    let width = spec.size[0];
    if ((flags & PCT_MASK_SHAPE_EXT) === PCT_SHORT_SHOULDER) width *= RATE_SHORT_SHOULDER;
    const unitW = width / (hor - 1);
    const cylinder = (flags & PCT_MASK_SHAPE_EXT) === PCT_CYLINDER;
    const at = spec.at;
    for (let i = 0; i < hor; i++) {
      let x = unitW * i - 0.5 * width + at[0];
      let y = cylinder ? Math.sin((i / (hor - 1)) * Math.PI) * 130 - 110 : at[1];
      const z = at[2];
      if ((flags & PCT_SHAPE_HALLOWEEN) !== 0) {
        x += 5;
        y += 10;
      }
      if ((flags & PCT_MASK_SHAPE) === PCT_CURVED) {
        const m = 2 * Math.abs(i / (hor - 1) - 0.5);
        y -= 10 * m * m;
      }
      if (atCreate) anchor.bodyPoint(spec.bone, z, -y, x, pos, 3 * i);
      else anchor.bonePoint(spec.bone, z, -y, x, pos, 3 * i);
      this.fixed[i] = 1;
    }
  }

  /** `Move2` (PhysicsManager.cpp:570-581): `count` sub-steps of `time`; false when the cloth tore (rebuild it). */
  move2(anchor: ClothAnchor, time: number, count: number, worldTime: number, gusty = false): boolean {
    for (let i = 0; i < count; i++) if (!this.move(anchor, time, worldTime, gusty)) return false;
    return true;
  }

  /** `Move` (:583-620). `gusty`: the login scene's wind (`WorldActive == 55`). */
  private move(anchor: ClothAnchor, time: number, worldTime: number, gusty: boolean): boolean {
    const flags = this.spec.flags;
    if ((flags & PCT_MASK_ELASTIC) === PCT_RUBBER2) {
      const wind = this.spec.wind ?? NO_WIND;
      this.wind = ((rand() % wind[1]) + wind[0]) / 100;
    } else {
      this.wind = gusty ? ((rand() % 40) + 10) / 50 : sharedWind;
    }
    if ((flags & PCT_MASK_SHAPE_EXT) === PCT_CYLINDER) this.wind = ((rand() % 10) + 25) / 50;
    this.moveVertices(anchor, time, worldTime);
    return this.preventFromStretching(anchor);
  }

  /**
   * `InitForces` and `UpdateForce` (:627-635, :50-108): wind gusting around a seed vertex, damping, gravity. A mesh
   * cloth gusts every vertex alike, `abs(iSeed % 10)` steps from the seed (:1179-1193).
   */
  private initForces(windX: number, windY: number, worldTime: number): void {
    const { hor, count, force, vel, fixed } = this;
    const flags = this.spec.flags;
    const wind = this.wind;
    const seed = (Math.trunc(worldTime / 400) * 101) % count;
    const seedI = hor === 0 ? 0 : seed % hor;
    const seedJ = hor === 0 ? 0 : Math.trunc(seed / hor);
    const meshGain = windGain(seed % 10);
    const elastic = flags & PCT_MASK_ELASTIC;
    const ext = flags & PCT_MASK_ELASTIC_EXT;
    const fall = GRAVITY_MASS * ((flags & PCT_HEAVY) !== 0 ? 180 : 100);
    for (let v = 0, i = 0, j = 0; v < count; v++) {
      const k = 3 * v;
      const gain = hor === 0 ? meshGain : windGain(Math.abs(seedI - i) + Math.abs(seedJ - j));
      if (++i === hor) {
        i = 0;
        j++;
      }
      if (fixed[v]) {
        force[k] = force[k + 1] = force[k + 2] = 0;
        continue;
      }
      let fx = gain * windX - vel[k] * 0.01;
      const fy = gain * windY - vel[k + 1] * 0.01;
      let fz = -vel[k + 2] * 0.01;
      if (elastic === PCT_RUBBER) fz += gain * (wind + 0.1);
      else if (elastic === PCT_RUBBER2) fz += gain * wind;
      if (ext === PCT_ELASTIC_HALLOWEEN) {
        fx += -(gain * wind * 0.5);
        fz += gain * (wind + 0.1) * 0.5 * Math.sin(worldTime * 0.003) * 5;
        fz -= GRAVITY_MASS * 50;
      } else if (ext === PCT_ELASTIC_RAGE_L) {
        fx += -(gain * wind * 0.8);
      } else if (ext === PCT_ELASTIC_RAGE_R) {
        fx -= -(gain * wind * 0.8);
      }
      force[k] = fx;
      force[k + 1] = fy;
      force[k + 2] = fz - fall;
    }
  }

  /** `MoveVertices` (:637-692): forces, the stretched springs, the pins onto the bone, then a step. */
  private moveVertices(anchor: ClothAnchor, time: number, worldTime: number): void {
    const { pos, vel, force, fixed, count } = this;
    const { a: linkA, b: linkB, far } = this.springs;
    const flags = this.spec.flags;
    this.initForces(this.wind * anchor.windX, this.wind * anchor.windY, worldTime);

    let scale = 1;
    if ((flags & PCT_MASK_ELASTIC) === PCT_RUBBER) scale *= 3;
    if ((flags & PCT_MASK_ELASTIC_EXT) === PCT_ELASTIC_HALLOWEEN) scale *= 2;
    const corrected = (flags & PCT_OPT_CORRECTEDFORCE) !== 0;
    for (let l = 0; l < this.springs.count; l++) {
      const a = 3 * linkA[l];
      const b = 3 * linkB[l];
      const dx = pos[a] - pos[b];
      const dy = pos[a + 1] - pos[b + 1];
      const dz = pos[a + 2] - pos[b + 2];
      const rest = far[l];
      const squared = dx * dx + dy * dy + dz * dz;
      // Only a stretched spring pulls; the square root waits for one.
      if (squared <= (rest + 0.01) * (rest + 0.01)) continue;
      const d = Math.sqrt(squared);
      const k = ((d - rest) / d) * scale * (corrected ? rest / 32 : 1);
      force[a] -= dx * k;
      force[a + 1] -= dy * k;
      force[a + 2] -= dz * k;
      force[b] += dx * k;
      force[b + 1] += dy * k;
      force[b + 2] += dz * k;
    }

    this.pin(anchor, false);
    const push = INV_MASS * time;
    for (let v = 0, k = 0; v < count; v++, k += 3) {
      if (fixed[v]) continue;
      vel[k] += force[k] * push;
      vel[k + 1] += force[k + 1] * push;
      vel[k + 2] += force[k + 2] * push;
      pos[k] += vel[k] * time;
      pos[k + 1] += vel[k + 1] * time;
      pos[k + 2] += vel[k + 2] * time;
    }
  }

  /** `PreventFromStretching` (:694-755): the spheres, the loose links averaged, the strict ones one by one. */
  private preventFromStretching(anchor: ClothAnchor): boolean {
    const { pos, shift, shifts, loose, strict } = this;
    const spheres = this.spec.spheres;
    if (spheres && spheres.length > 0) {
      for (let s = 0; s < spheres.length; s++) {
        const sphere = spheres[s];
        anchor.bonePoint(sphere[4], sphere[2], -sphere[1], sphere[0], this.centers, 3 * s);
      }
      this.processCollision(spheres);
    }

    // AddOneTimeMoveToKeepLength (:178-187): both ends of a loose link meet halfway.
    for (let l = 0; l < loose.count; l++) {
      const a = loose.a[l];
      const b = loose.b[l];
      const ka = 3 * a;
      const kb = 3 * b;
      const dx = pos[ka] - pos[kb];
      const dy = pos[ka + 1] - pos[kb + 1];
      const dz = pos[ka + 2] - pos[kb + 2];
      const d = Math.max(0.001, Math.sqrt(dx * dx + dy * dy + dz * dz));
      const k = ((d - loose.far[l]) * 0.5) / d;
      shift[ka] -= dx * k;
      shift[ka + 1] -= dy * k;
      shift[ka + 2] -= dz * k;
      shift[kb] += dx * k;
      shift[kb + 1] += dy * k;
      shift[kb + 2] += dz * k;
      shifts[a]++;
      shifts[b]++;
    }
    // Over the m_iNumVer x m_iNumHor grid (:729-736): no vertex of a mesh cloth, whose moves wait for a sphere pass.
    if (this.hor > 0) this.applyShifts();

    // KeepLength (:149-176): the lower end of a strict link pulled back within it, one link after another.
    for (let l = 0; l < strict.count; l++) {
      const v = strict.b[l];
      if (this.fixed[v]) continue;
      const kv = 3 * v;
      const kt = 3 * strict.a[l];
      const dx = pos[kv] - pos[kt];
      const dy = pos[kv + 1] - pos[kt + 1];
      const dz = pos[kv + 2] - pos[kt + 2];
      const rest = strict.far[l];
      const floor = rest * this.near;
      const squared = dx * dx + dy * dy + dz * dz;
      if (squared <= rest * rest && squared >= floor * floor) continue;
      const d = Math.max(0.001, Math.sqrt(squared));
      if (d > rest * 20) return false;
      const target = d > rest ? rest : floor;
      const k = (d - target) / d;
      pos[kv] -= dx * k;
      pos[kv + 1] -= dy * k;
      pos[kv + 2] -= dz * k;
    }
    return true;
  }

  /** `ProcessCollision` (:925-946, :276-293): each vertex inside a sphere is pushed to its surface. */
  private processCollision(spheres: NonNullable<ClothSpec['spheres']>): void {
    const { pos, centers, count, shift, shifts } = this;
    for (let s = 0; s < spheres.length; s++) {
      const radius = spheres[s][3];
      const cx = centers[3 * s];
      const cy = centers[3 * s + 1];
      const cz = centers[3 * s + 2];
      for (let v = 0, k = 0; v < count; v++, k += 3) {
        let dx = pos[k] - cx;
        let dy = pos[k + 1] - cy;
        let dz = pos[k + 2] - cz;
        const squared = dx * dx + dy * dy + dz * dz;
        if (squared >= radius * radius) continue;
        let d = Math.sqrt(squared);
        if (d < 0.01) {
          d = 0.01;
          dx = 0.01;
          dy = dz = 0;
        }
        if (d >= radius) continue;
        const m = (radius - d) / d;
        shift[k] += dx * m;
        shift[k + 1] += dy * m;
        shift[k + 2] += dz * m;
        shifts[v]++;
      }
    }
    this.applyShifts();
  }

  /** `DoOneTimeMove` (:189-207) on every vertex: the average of what was asked; a pin drops it. */
  private applyShifts(): void {
    const { pos, shift, shifts, fixed } = this;
    for (let v = 0, k = 0; v < this.count; v++, k += 3) {
      const n = shifts[v];
      if (n > 0 && !fixed[v]) {
        pos[k] += shift[k] / n;
        pos[k + 1] += shift[k + 1] / n;
        pos[k + 2] += shift[k + 2] / n;
      }
      shift[k] = shift[k + 1] = shift[k + 2] = 0;
      shifts[v] = 0;
    }
  }
}

/** `FindMatchVertex` (:1098-1116): the far corner of a triangle that runs the edge `v1, v2` the other way, else -1. */
function matchVertex(triangles: Int32Array, v1: number, v2: number, v3: number): number {
  for (let t = 0; t < triangles.length; t += 3) {
    for (let i = 0; i < 3; i++) {
      const c3 = triangles[t + ((i + 2) % 3)];
      if (v1 === triangles[t + ((i + 1) % 3)] && v2 === triangles[t + i] && v3 !== c3) return c3;
    }
  }
  return -1;
}
