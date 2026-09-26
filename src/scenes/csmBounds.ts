import {
  BoundingInfo,
  CascadedShadowGenerator,
  Vector3,
  type AbstractMesh,
  type Observer,
  type Scene,
  type TransformNode,
} from '../libs/babylon/exports';
import { devQuery } from '../common/devSeams';

/**
 * The box the cascades fit their near and far planes to, bit for bit
 * Babylon's (`_computeShadowCastersBoundingInfo`), with the receivers' half
 * kept between frames instead of re-swept over every scene mesh.
 */

export type CsmBoundsMode = 'babylon' | 'own' | 'check';

/**
 * `?csmBounds=babylon` (or `0`) hands the box back to Babylon's per-frame
 * sweep; `?csmBounds=check` keeps ours and compares it with Babylon's own
 * function every frame (`mismatches` in the stats).
 */
export function csmBoundsMode(): CsmBoundsMode {
  const raw = devQuery('csmBounds');

  if (raw === 'babylon' || raw === '0') return 'babylon';

  return raw === 'check' ? 'check' : 'own';
}

const MAX = Number.MAX_VALUE;

/** Past this many queued changes one sweep is cheaper (a map loading). */
const MAX_PENDING = 1024;

/**
 * The kept half is rebuilt from scratch this often as a safety net for a
 * change nothing reported; a dev build warns when that rebuild moved it.
 */
const RESYNC_FRAMES = 64;

let live: ReceiverBox | null = null;

/** Receivers changed in ways no event reports (a map object's load). */
export function shadowReceiversChanged(): void {
  live?.invalidate();
}

/** A mesh was shown, hidden or given new bounds outside a world-matrix update. */
export function shadowReceiverChanged(mesh: AbstractMesh): void {
  live?.touch(mesh);
}

/**
 * Babylon's receiver half, kept: every scene mesh with `isVisible` and
 * `receiveShadows`, by its world box.
 *
 * A receiver clear of the box's faces cannot shrink it, so whatever it does
 * is unioned in. Only one on a face (an edge) can, when it moves, hides or
 * leaves, and that is the one case rebuilt from scratch.
 */
export class ReceiverBox {
  readonly min = new Vector3(MAX, MAX, MAX);
  readonly max = new Vector3(-MAX, -MAX, -MAX);

  rebuilds = 0;

  /** Receivers on a face of the box, with the world box they had then. */
  private readonly edges = new Map<AbstractMesh, Float64Array>();
  private readonly pending: AbstractMesh[] = [];
  private readonly counted: AbstractMesh[] = [];
  private readonly watched = new Map<AbstractMesh, Observer<TransformNode>>();
  private readonly gone: Observer<AbstractMesh>;
  private stale = true;

  /**
   * `scene.meshes[0, seen)`. Not `onNewMeshAddedObservable`: Babylon raises
   * it a task after the push (scene.js:2070), when the mesh is already swept.
   */
  private known = new WeakSet<AbstractMesh>();
  private seen = 0;

  private readonly moved = (node: TransformNode) =>
    this.touch(node as AbstractMesh);

  constructor(private readonly scene: Scene) {
    this.gone = scene.onMeshRemovedObservable.add(mesh => {
      if (this.known.delete(mesh)) this.seen--;
      this.unwatch(mesh);
      if (this.edges.delete(mesh)) this.stale = true;
    });

    live = this;
  }

  get edgeCount(): number {
    return this.edges.size;
  }

  /** In the scene's mesh list as of the last settle. */
  holds(mesh: AbstractMesh): boolean {
    return this.known.has(mesh);
  }

  touch(mesh: AbstractMesh): void {
    if (this.stale) return;

    if (this.pending.length >= MAX_PENDING) {
      this.invalidate();
      return;
    }

    this.pending.push(mesh);
  }

  invalidate(): void {
    this.stale = true;
    this.pending.length = 0;
  }

  /** Brings the box up to date with the scene as it stands. */
  settle(): void {
    const meshes = this.scene.meshes;

    if (this.seen > meshes.length) this.stale = true;

    if (!this.stale) {
      for (let i = this.seen; i < meshes.length; i++) {
        this.known.add(meshes[i]);
        if (!this.stale) this.apply(meshes[i]);
      }

      this.seen = meshes.length;

      const pending = this.pending;

      for (let i = 0; i < pending.length && !this.stale; i++) {
        this.apply(pending[i]);
      }
    }

    this.pending.length = 0;

    if (this.stale) this.rebuild();
  }

  /** Settles, then rebuilds from scratch; true if that moved the box. */
  resync(): boolean {
    this.settle();

    const { min, max } = this;
    const x0 = min.x, y0 = min.y, z0 = min.z;
    const x1 = max.x, y1 = max.y, z1 = max.z;

    this.rebuild();

    return (
      x0 !== min.x || y0 !== min.y || z0 !== min.z ||
      x1 !== max.x || y1 !== max.y || z1 !== max.z
    );
  }

  private apply(mesh: AbstractMesh): void {
    // Also rules out a removed mesh and another scene's.
    if (!this.known.has(mesh)) return;

    const edge = this.edges.get(mesh);

    if (!mesh.receiveShadows) {
      if (edge) this.stale = true;
      return;
    }

    this.watch(mesh);

    if (!mesh.isVisible) {
      if (edge) this.stale = true;
      return;
    }

    const box = mesh.getBoundingInfo().boundingBox;
    const lo = box.minimumWorld;
    const hi = box.maximumWorld;

    if (edge) {
      if (!sameBox(edge, lo, hi)) this.stale = true;
      return;
    }

    this.min.minimizeInPlace(lo);
    this.max.maximizeInPlace(hi);

    if (this.onFace(lo, hi)) this.edges.set(mesh, snapshot(lo, hi));
  }

  private rebuild(): void {
    const { min, max, counted } = this;
    const meshes = this.scene.meshes;
    const known = (this.known = new WeakSet());
    let n = 0;

    min.copyFromFloats(MAX, MAX, MAX);
    max.copyFromFloats(-MAX, -MAX, -MAX);

    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];

      if (mesh) known.add(mesh);

      // No isEnabled test: Babylon's reads `!mesh.isEnabled`, the method
      // itself, so a disabled receiver (a cell outside the ring) counts.
      if (!mesh || !mesh.receiveShadows) continue;

      this.watch(mesh);

      if (!mesh.isVisible) continue;

      const box = mesh.getBoundingInfo().boundingBox;

      min.minimizeInPlace(box.minimumWorld);
      max.maximizeInPlace(box.maximumWorld);
      counted[n++] = mesh;
    }

    this.edges.clear();

    for (let i = 0; i < n; i++) {
      const box = counted[i].getBoundingInfo().boundingBox;

      if (this.onFace(box.minimumWorld, box.maximumWorld)) {
        this.edges.set(counted[i], snapshot(box.minimumWorld, box.maximumWorld));
      }
    }

    counted.length = 0;
    this.seen = meshes.length;
    this.pending.length = 0;
    this.stale = false;
    this.rebuilds++;
  }

  private onFace(lo: Vector3, hi: Vector3): boolean {
    const { min, max } = this;

    return (
      lo.x === min.x || lo.y === min.y || lo.z === min.z ||
      hi.x === max.x || hi.y === max.y || hi.z === max.z
    );
  }

  private watch(mesh: AbstractMesh): void {
    if (this.watched.has(mesh)) return;

    this.watched.set(mesh, mesh.onAfterWorldMatrixUpdateObservable.add(this.moved));
  }

  private unwatch(mesh: AbstractMesh): void {
    const observer = this.watched.get(mesh);

    if (!observer) return;

    mesh.onAfterWorldMatrixUpdateObservable.remove(observer);
    this.watched.delete(mesh);
  }

  dispose(): void {
    this.scene.onMeshRemovedObservable.remove(this.gone);

    for (const mesh of [...this.watched.keys()]) this.unwatch(mesh);

    this.edges.clear();
    this.pending.length = 0;

    if (live === this) live = null;
  }
}

function snapshot(lo: Vector3, hi: Vector3): Float64Array {
  return Float64Array.of(lo.x, lo.y, lo.z, hi.x, hi.y, hi.z);
}

function sameBox(edge: Float64Array, lo: Vector3, hi: Vector3): boolean {
  return (
    edge[0] === lo.x && edge[1] === lo.y && edge[2] === lo.z &&
    edge[3] === hi.x && edge[4] === hi.y && edge[5] === hi.z
  );
}

/** What `CsmBounds` needs of the generator; a stand-in in the tests. */
export type CsmBoundsTarget = Pick<
  CascadedShadowGenerator,
  'freezeShadowCastersBoundingInfo' | 'getShadowMap' | 'shadowCastersBoundingInfo'
>;

/** The fields Babylon's own box function reads and writes on `this`. */
export type BabylonBoxProbe = {
  _scbiMin: Vector3;
  _scbiMax: Vector3;
  _shadowMap: ReturnType<CsmBoundsTarget['getShadowMap']>;
  _scene: Scene;
  _shadowCastersBoundingInfo: BoundingInfo;
};

/** A `this` to run Babylon's box function on without a generator. */
export function babylonBoxProbe(scene: Scene): BabylonBoxProbe {
  return {
    _scbiMin: new Vector3(),
    _scbiMax: new Vector3(),
    _shadowMap: null,
    _scene: scene,
    _shadowCastersBoundingInfo: new BoundingInfo(Vector3.Zero(), Vector3.Zero()),
  };
}

/** Babylon's per-frame box over `map`'s list and the scene, into `_scbiMin`/`_scbiMax`. */
export function runBabylonCasterBox(
  probe: BabylonBoxProbe,
  map: ReturnType<CsmBoundsTarget['getShadowMap']>
): void {
  probe._shadowMap = map;

  (
    CascadedShadowGenerator.prototype as unknown as {
      _computeShadowCastersBoundingInfo(this: BabylonBoxProbe): void;
    }
  )._computeShadowCastersBoundingInfo.call(probe);
}

export type CsmBoundsStats = {
  frames: number;
  /** Receiver-box sweeps from scratch, resyncs included. */
  rebuilds: number;
  /** Resyncs that moved the kept box: a change nothing reported. */
  drifts: number;
  edges: number;
  /** Frames the box differed from Babylon's; null unless `?csmBounds=check`. */
  mismatches: number | null;
};

/**
 * Writes the box in place of Babylon's sweep. Construct it straight after the
 * generator, so its observer takes the slot Babylon's had and reads the same
 * frame state (last frame's list, world boxes before the active-mesh pass).
 */
export class CsmBounds {
  private readonly receivers: ReceiverBox;
  private readonly tick: Observer<Scene>;
  private readonly lo = new Vector3();
  private readonly hi = new Vector3();
  private readonly probe: BabylonBoxProbe | null;
  private frames = 0;
  private drifts = 0;
  private mismatches = 0;

  constructor(
    private readonly csm: CsmBoundsTarget,
    private readonly scene: Scene,
    check = false
  ) {
    // Removes Babylon's observer; the flag lives on the generator and
    // survives `recreateShadowMap`.
    csm.freezeShadowCastersBoundingInfo = true;

    this.receivers = new ReceiverBox(scene);
    this.probe = check ? babylonBoxProbe(scene) : null;
    this.tick = scene.onBeforeRenderObservable.add(() => this.write());
  }

  write(): void {
    const lo = this.lo.copyFromFloats(MAX, MAX, MAX);
    const hi = this.hi.copyFromFloats(-MAX, -MAX, -MAX);
    const map = this.csm.getShadowMap();
    const list = map?.renderList;

    // Babylon skips the receivers too when there is no list.
    if (list) {
      if (++this.frames % RESYNC_FRAMES === 0) {
        if (this.receivers.resync()) this.drifted();
      } else {
        this.receivers.settle();
      }

      for (let i = 0; i < list.length; i++) {
        const mesh = list[i];

        if (!mesh) continue;

        // Babylon counts a list entry whether or not the scene still holds it.
        if (mesh.isVisible && mesh.receiveShadows && this.receivers.holds(mesh)) {
          continue;
        }

        const box = mesh.getBoundingInfo().boundingBox;

        lo.minimizeInPlace(box.minimumWorld);
        hi.maximizeInPlace(box.maximumWorld);
      }

      lo.minimizeInPlace(this.receivers.min);
      hi.maximizeInPlace(this.receivers.max);
    }

    this.csm.shadowCastersBoundingInfo.reConstruct(lo, hi);

    if (this.probe) this.compare(this.probe, map ?? null);
  }

  private compare(
    ref: BabylonBoxProbe,
    map: ReturnType<CsmBoundsTarget['getShadowMap']>
  ): void {
    runBabylonCasterBox(ref, map);

    if (ref._scbiMin.equals(this.lo) && ref._scbiMax.equals(this.hi)) return;

    if (this.mismatches++ === 0) {
      console.warn('csmBounds: box differs from Babylon', {
        ours: [this.lo.asArray(), this.hi.asArray()],
        babylon: [ref._scbiMin.asArray(), ref._scbiMax.asArray()],
      });
    }
  }

  private drifted(): void {
    if (this.drifts++ === 0 && import.meta.env.DEV) {
      console.warn('csmBounds: a receiver changed without a notice; resynced');
    }
  }

  stats(): CsmBoundsStats {
    return {
      frames: this.frames,
      rebuilds: this.receivers.rebuilds,
      drifts: this.drifts,
      edges: this.receivers.edgeCount,
      mismatches: this.probe ? this.mismatches : null,
    };
  }

  dispose(): void {
    this.scene.onBeforeRenderObservable.remove(this.tick);
    this.receivers.dispose();
  }
}
