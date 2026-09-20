import { type AbstractMesh, Matrix, type Mesh, Vector3 } from '../libs/babylon/exports';
import type { Entity, World } from '../ecs/world';
import { itemRestHeight, itemWornHeight } from './itemAngle';
import { ModelObject } from './modelObject';
import { zenCoinCount, zenCoinScatter, type ZenCoinOffset } from './zenPile';

/** Centimetres per world unit - the scatter `zenPile` hands back is in cm. */
const CM = 1 / 100;

/**
 * Where a coin rests above its own patch of ground. The drop's entity stays at
 * the original's `terrain + 30` (`HandleItemOnGround`, ZzzObject.cpp:6256) -
 * that is what the label, the pick box and the fall are measured from - but
 * 30 cm under a 2.4 cm coin reads as a hovering disc, and the wider pile made
 * it plain. The coins alone come down to the grass.
 */
const COIN_REST_CM = 4;

/** `Position[2] = terrain + 180` at creation: how high the pile starts. */
const FALL_START = 1.8;
/**
 * How far behind the drop the last coin lands. A coin's own height is the
 * drop's less its share of this, so the pile arrives over a moment instead of
 * as one slab: they rain down.
 */
const FALL_LAG = 0.7;

/** The shadow clones' material; they do not carry the item materials' attribute. */
const SHADOW_MATERIAL = 'objectShadow';

const tmpOffset = new Vector3();
const tmpLocal = new Vector3();
const tmpMatrix = new Matrix();

/** One mesh the pile is drawn on: the drop's own, or a shadow clone of it. */
type PileTarget = {
  readonly mesh: Mesh;
  /** Takes a displacement in the node's frame into this mesh's own basis. */
  readonly backToMesh: Matrix;
  readonly matrices: Float32Array;
};

/** One coin's settled place in the node's frame, world units. */
type PileCoin = { x: number; y: number; z: number; lag: number };

/**
 * A dropped item. Everything the original does to a drop that it does not do
 * to a prop, all of it in `RenderItems` (ZzzObject.cpp:6342):
 *
 * - `ItemHeight` pulls a worn body part back down onto the ground.
 * - `HideSkin = true` keeps the head, the skin and the hair out of it.
 * - `o->AnimationFrame` is never advanced, so the model is frozen.
 * - zen is drawn as a pile: `RenderZen` scatters coins around the drop before
 *   the drop itself is drawn at the centre (`common/zenPile.ts`).
 */
export class DropObject extends ModelObject {
  /** `transform.scale`, which the pile's centimetres must not be shrunk by. */
  #zenScale = 1;

  /** Each coin in the node's frame: where it lies once the pile has settled. */
  #coins: PileCoin[] = [];
  #targets: PileTarget[] = [];
  /** How far the drop still has to fall, world units; 0 once it has landed. */
  #fallHeight = 0;

  async init(world: World, entity: Entity): Promise<void> {
    this.BodyHeight = itemWornHeight(entity.droppedItem?.group ?? -1);
    this.HideSkin = true;
    this.FrozenPose = true;

    const drop = entity.droppedItem;

    if (drop?.isMoney) {
      this.#zenScale = entity.transform?.scale || 1;
      this.#layOutCoins(world, entity);
    }
  }

  load(gltf: Parameters<ModelObject['load']>[0]): void {
    this.#targets = [];
    super.load(gltf);
    this.#buildPile();
  }

  /**
   * The coins of a pile in the node's frame. Each one takes the height of the
   * ground under itself, so a pile laid across a slope follows it instead of
   * hanging off the drop's own tile.
   */
  #layOutCoins(world: World, entity: Entity): void {
    const pos = entity.transform?.pos;
    if (!pos) return;

    const group = entity.droppedItem?.group ?? -1;
    const count = zenCoinCount(entity.droppedItem?.amount ?? 0);
    const scatter: ZenCoinOffset[] = zenCoinScatter(entity.netId ?? 0, count);
    const restDrop = itemRestHeight(group);
    const groundAtDrop = world.getTerrainHeight(pos.x, pos.z);
    const settle = COIN_REST_CM * CM - restDrop;

    // The centre coin first: the one the drop would have been on its own.
    this.#coins = [{ x: 0, y: settle, z: 0, lag: 0 }];

    for (const coin of scatter) {
      const x = coin.x * CM;
      const z = coin.y * CM;

      this.#coins.push({
        x,
        y: world.getTerrainHeight(pos.x + x, pos.z + z) - groundAtDrop + settle,
        z,
        lag: coin.lag,
      });
    }
  }

  /**
   * The coins as thin instances of the drop's own mesh: one draw for the pile,
   * the way the original packs the heap into one triangle batch
   * (`BMD::AddToCoinHeap`).
   */
  #buildPile(): void {
    if (this.#coins.length === 0 || !this.gltf) return;

    const invNode = this.#nodeInverse();

    for (const mesh of this.getMeshes(true)) this.#addTarget(mesh, invNode);

    this.#writePile();
  }

  /**
   * The blob under the pile has to be the pile's, not one coin's. Slots are
   * built lazily, frames after `load`, so the clone is stamped as it appears.
   */
  protected onShadowBuilt(shadow: AbstractMesh): void {
    if (this.#coins.length === 0) return;

    const invNode = this.#nodeInverse();

    for (const mesh of [shadow, ...shadow.getChildMeshes(false)]) {
      this.#addTarget(mesh, invNode);
    }

    this.#writePile();
  }

  #nodeInverse(): Matrix {
    const node = this.node;
    node.computeWorldMatrix(true);

    return Matrix.Invert(node.getWorldMatrix());
  }

  /** Puts the pile on one mesh - the drop's own, or one of its shadow clones. */
  #addTarget(mesh: AbstractMesh, invNode: Matrix): void {
    if (mesh.getTotalVertices() === 0) return;

    const target = mesh as Mesh;

    // Babylon keeps a mesh's thin-instance buffers (`world0..3`, `muInst`) on
    // its *Geometry*, and every drop of a model is a clone sharing the cached
    // container's. Left shared, each new zen pile rewrote the buffers for every
    // pile already on the ground, so they all took the newest one's scatter.
    // One geometry copy per pile is the price of its own coins.
    target.makeGeometryUnique();

    // The scatter is a displacement in the node's frame, so an instance is
    // `meshToNode . T . meshToNode^-1`: a plain translation by T's vector taken
    // back through the mesh's own basis. Conjugating it that way also keeps the
    // determinant positive, so the mirror every model root carries
    // (`ModelObject.load`: scaling (1, -1, 1)) stays on the mesh where Babylon
    // reads it and face culling is not flipped per instance.
    const backToMesh = Matrix.Invert(
      target.computeWorldMatrix(true).multiply(invNode)
    );

    const matrices = new Float32Array(this.#coins.length * 16);

    this.#targets.push({ mesh: target, backToMesh, matrices });

    // Not static: these are rewritten every frame the pile is coming down.
    target.thinInstanceSetBuffer('matrix', matrices, 16, false);

    // The per-instance state the item materials read; (1, 1, 1, 1) is what a
    // non-instanced draw gets, so the coins are lit exactly as the drop was.
    if (!target.material?.name?.startsWith(SHADOW_MATERIAL)) {
      target.thinInstanceSetBuffer(
        'muInst',
        new Float32Array(this.#coins.length * 4).fill(1),
        4,
        true
      );
    }
  }

  /**
   * Where the pile is right now, with `height` the drop's own distance left to
   * fall (`DropMotionSystem`). At the top the coins are together at the drop's
   * point and ride up with it; they open out as it comes down and each one
   * settles on its own beat, so the pile rains in instead of landing as a slab.
   */
  setPileFall(height: number): void {
    const wanted = Math.max(0, height);

    if (this.#coins.length === 0) return;
    if (wanted === 0 && this.#fallHeight === 0) return;

    this.#fallHeight = wanted;
    this.#writePile();
  }

  #writePile(): void {
    if (this.#targets.length === 0) return;

    const height = this.#fallHeight;
    const scale = this.#zenScale || 1;

    for (const target of this.#targets) {
      for (let i = 0; i < this.#coins.length; i++) {
        const coin = this.#coins[i];
        // This coin's own height: it lets the drop go on ahead of it.
        const own = Math.max(0, height - FALL_LAG * coin.lag);
        const spread = height > 0 ? Math.min(1, 1 - own / FALL_START) : 1;

        tmpOffset.set(
          (coin.x * spread) / scale,
          (own - height + coin.y * spread) / scale,
          (coin.z * spread) / scale
        );
        Vector3.TransformNormalToRef(tmpOffset, target.backToMesh, tmpLocal);
        Matrix.TranslationToRef(tmpLocal.x, tmpLocal.y, tmpLocal.z, tmpMatrix);
        tmpMatrix.copyToArray(target.matrices, i * 16);
      }

      target.mesh.thinInstanceBufferUpdated('matrix');
    }
  }
}
