import { MapTileObject } from '../../common/mapTileObject';
import { ParticleEmitter } from '../../common/effectParticles';
import { Store } from '../../store';
import type { Entity, World } from '../../ecs/world';
import {
  chaosCastleRingDrop,
  chaosCastleRingSmoking,
  chaosCastleRingVisible,
  updateChaosCastleArena,
} from './arena';

/**
 * `CreateParticle(BITMAP_SMOKE + 4, Position + (±150, 0, hero z), …, 1.5f)`
 * every tick per slab during the lead-in (CSChaosCastle.cpp:240-248): a
 * 3-tile-wide curtain of grey smoke along the ring about to fall.
 */
const SMOKE_SPREAD = 150;

/**
 * A Chaos Castle floor/rim segment (types 0-5, 13-35 minus the markers): drawn
 * or not by the arena stage, dropped into the void by the current drop, and
 * smoking while its drop is imminent. All state is `arena.ts`'s; this class
 * only applies it to the mesh (alpha), the entity (`posOffset.y`, in tiles —
 * the render system adds it to the position) and its own emitter.
 */
export class ChaosCastleRingObject extends MapTileObject {
  #entity: Entity | null = null;
  #smoke: ParticleEmitter | null = null;
  #visible = true;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);
    this.#entity = entity;
    this.#apply();
  }

  #apply(): void {
    const visible = chaosCastleRingVisible(this.Type);
    if (visible !== this.#visible || (visible && this.Alpha < 1) || (!visible && this.Alpha > 0)) {
      this.#visible = visible;
      this.setAlpha(visible ? 1 : 0);
    }
  }

  dispose(): void {
    this.#smoke = null;
    this.#entity = null;
    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);
    if (!this.Ready) return;

    const world = Store.world;
    if (!world) return;

    const now = gameTime.TotalGameTime.TotalSeconds;
    updateChaosCastleArena(now, world.scene.getEngine().getDeltaTime() / 1000);

    this.#apply();
    if (!this.#visible) return;

    const t = this.#entity?.transform;
    if (t) {
      const dropTiles = chaosCastleRingDrop(this.Type) / world.terrainScale;
      if (dropTiles > 0) {
        t.posOffset = { x: 0, y: -dropTiles, z: 0 };
      } else if (t.posOffset) {
        t.posOffset = undefined;
      }
    }

    if (chaosCastleRingSmoking(this.Type)) {
      if (!this.#smoke) {
        const p = this.node.position;
        this.#smoke = new ParticleEmitter(
          world.scene,
          [{ kinds: ['smoke2'], every: 1, jitter: SMOKE_SPREAD }],
          { x: p.x, y: p.y, z: p.z },
          this.node.rotation.y,
          this.node.scaling.x
        );
      }
      if (!this.OutOfView) this.#smoke.update();
    } else if (this.#smoke) {
      this.#smoke = null;
    }
  }
}
