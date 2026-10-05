import { MapTileObject } from '@/controllers/terrain/mapTileObject';
import { createMovableFlare, type MovableFlare } from '@/controllers/lighting/effectLights';
import { Vector3, type TransformNode } from '@/controllers/render/babylon/exports';
import type { Entity, World } from '@/ecs/world';
import { findBone } from '../bloodcastle/bones';

/**
 * The eyes (ZzzObject.cpp:684-696): `CreateSprite(BITMAP_SHINY + 1, vPos, 1.5f + fLumi / 2.f, (1, 0.5, 0.5), NULL)`
 * at `TransformPosition(BoneTransform[22], (6, 5, 2))` and `[23], (6, -5, 2)`, no `* o->Scale`. The nudges are
 * in the bone's frame, a hundredth of a tile per unit.
 */
const EYES = [
  { bone: 22, nudge: new Vector3(0.06, 0.05, 0.02) },
  { bone: 23, nudge: new Vector3(0.06, -0.05, 0.02) },
] as const;

const EYE_COLOR: readonly [number, number, number] = [1, 0.5, 0.5];

/** `1.5f + fLumi / 2.f`, `fLumi = sinf(WorldTime * 0.001f) * 0.5f + 0.5f`. */
const eyeSize = (ms: number) => 1.5 + (Math.sin(ms * 0.001) * 0.5 + 0.5) / 2;

const at = Vector3.Zero();

/**
 * Cursed Temple 62 (×8), the dragon: its head sweeps about 138 across and 100 up, so its two eye
 * cards ride bones 22 and 23 every frame, the way the original draws them. Never a batched prop:
 * each plays its own clip.
 */
export class CursedTempleDragonObject extends MapTileObject {
  static Batchable = false;

  #eyes: { node: TransformNode; nudge: Vector3; flare: MovableFlare }[] = [];

  #disposed = false;

  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);

    for (const { bone, nudge } of EYES) {
      const node = findBone(this, bone) as TransformNode | null;
      if (!node) continue;

      const flare = await createMovableFlare(world.scene, eyeSize(0), EYE_COLOR, 'shiny1');
      if (!flare) continue;

      if (this.#disposed) flare.dispose();
      else this.#eyes.push({ node, nudge, flare });
    }
  }

  dispose(): void {
    this.#disposed = true;

    for (const eye of this.#eyes) eye.flare.dispose();
    this.#eyes = [];

    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    const size = eyeSize(gameTime.TotalGameTime.TotalSeconds * 1000);

    for (const { node, nudge, flare } of this.#eyes) {
      node.computeWorldMatrix(true);
      Vector3.TransformCoordinatesToRef(nudge, node.getWorldMatrix(), at);
      flare.moveTo(at.x, at.y, at.z);
      flare.setScale(size);
    }
  }
}
