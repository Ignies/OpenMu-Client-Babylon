import { Matrix, Vector3 } from '../libs/babylon/exports';
import type { Entity, World } from '../ecs/world';
import { itemWornHeight } from './itemAngle';
import { ModelObject } from './modelObject';
import { zenCoinCount, zenCoinScatter } from './zenPile';

/** Centimetres per world unit - the scatter `zenPile` hands back is in cm. */
const CM = 1 / 100;

const tmpOffset = new Vector3();
const tmpLocal = new Vector3();
const tmpMatrix = new Matrix();

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
  /** The zen this drop stands for; unset on everything that is not money. */
  #zenAmount?: number;
  /** `RenderZen`'s `k`, the drop's slot in the original's `Items[]`. */
  #zenSeed = 0;
  /** `transform.scale`, which the pile's centimetres must not be shrunk by. */
  #zenScale = 1;

  async init(_world: World, entity: Entity): Promise<void> {
    this.BodyHeight = itemWornHeight(entity.droppedItem?.group ?? -1);
    this.HideSkin = true;
    this.FrozenPose = true;

    const drop = entity.droppedItem;

    if (drop?.isMoney) {
      this.#zenAmount = drop.amount ?? 0;
      this.#zenSeed = entity.netId ?? 0;
      this.#zenScale = entity.transform?.scale || 1;
    }
  }

  load(gltf: Parameters<ModelObject['load']>[0]): void {
    super.load(gltf);
    this.#buildZenPile();
  }

  /**
   * The coins around the drop, as thin instances of its own mesh: one draw
   * each, the way the original packs the whole heap into one triangle batch
   * (`BMD::AddToCoinHeap`). Instance 0 is the identity - the coin the drop
   * would have been on its own.
   */
  #buildZenPile(): void {
    const amount = this.#zenAmount;
    if (amount === undefined || !this.gltf) return;

    const count = zenCoinCount(amount);
    const scatter = zenCoinScatter(this.#zenSeed, count);

    const node = this.node;
    node.computeWorldMatrix(true);
    const invNode = Matrix.Invert(node.getWorldMatrix());

    for (const mesh of this.getMeshes(true)) {
      if (mesh.getTotalVertices() === 0) continue;

      // Babylon keeps a mesh's thin-instance buffers (`world0..3`, `muInst`) on
      // its *Geometry*, and every drop of a model is a clone sharing the cached
      // container's. Left shared, each new zen pile rewrote the buffers for
      // every pile already on the ground, so they all took the newest one's
      // scatter. One geometry copy per pile is the price of its own coins.
      mesh.makeGeometryUnique();

      // The scatter is a displacement in the node's frame, so an instance is
      // `meshToNode . T . meshToNode^-1`: a plain translation by T's vector
      // taken back through the mesh's own basis. Conjugating it that way also
      // keeps the determinant positive, so the mirror every model root carries
      // (`ModelObject.load`: scaling (1, -1, 1)) stays on the mesh where
      // Babylon reads it and face culling is not flipped per instance.
      const backToMesh = Matrix.Invert(
        mesh.computeWorldMatrix(true).multiply(invNode)
      );

      const matrices = new Float32Array((count + 1) * 16);
      // The per-instance state the item materials read; (1, 1, 1, 1) is what
      // a non-instanced draw gets, so the coins are lit exactly as the drop.
      const instanceState = new Float32Array((count + 1) * 4).fill(1);

      Matrix.IdentityReadOnly.copyToArray(matrices, 0);

      for (let i = 0; i < count; i++) {
        tmpOffset.set(
          (scatter[i].x * CM) / this.#zenScale,
          0,
          (scatter[i].y * CM) / this.#zenScale
        );
        Vector3.TransformNormalToRef(tmpOffset, backToMesh, tmpLocal);
        Matrix.TranslationToRef(tmpLocal.x, tmpLocal.y, tmpLocal.z, tmpMatrix);
        tmpMatrix.copyToArray(matrices, (i + 1) * 16);
      }

      mesh.thinInstanceSetBuffer('matrix', matrices, 16, true);
      mesh.thinInstanceSetBuffer('muInst', instanceState, 4, true);
    }
  }
}
