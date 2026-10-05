import { MapTileObject } from '@/controllers/terrain/mapTileObject';
import { REFERENCE_FPS } from '@/controllers/anim/playSpeed';
import { TILE_CM } from '@/controllers/terrain/consts';
import { createMovableFlare, type MovableFlare } from '@/controllers/lighting/effectLights';
import type { Entity, World } from '@/ecs/world';

/** `CreateSprite(BITMAP_FLARE, p, 1.3f, (1, 1, 1), o)`, no `* o->Scale` (GMCrywolf1st.cpp:409-414). */
const FLARE_SCALE = 1.3;

/** `p[2] += 350.f + aaa`. */
const FLARE_HEIGHT = 350;

/**
 * `aaa`: `Time_Effect` folded at 20 (GMCrywolf1st.cpp:403-407), one counter every frame bumps a
 * tick and wraps past 40 (ZzzObject.cpp:3263-3265): 0 to 20 and back every 41 ticks, every beacon
 * in step.
 */
const RIDE_MS = (41 * 1000) / REFERENCE_FPS;

const ride = (ms: number) => 20 * (1 - Math.abs(((ms / RIDE_MS) % 1) * 2 - 1));

/**
 * `static float Ro`: one angle for every beacon, which each beacon drawn bumps a degree a frame
 * before it draws its second flare at it (GMCrywolf1st.cpp:399-402, :414). With n beacons in view
 * it turns n degrees a frame.
 */
let ro = 0;

/**
 * Crywolf 41, the beacon (×9): two white `BITMAP_FLARE`s riding `350 + aaa` above it, the second
 * turned by the shared `Ro`. Its ground light is the table's (`spec.ts`). A class because the turn
 * counts the beacons drawn, so it is never a batched prop.
 */
export class CrywolfBeaconObject extends MapTileObject {
  static Batchable = false;

  #still: MovableFlare | null = null;

  #turning: MovableFlare | null = null;

  #lastMs = -1;

  #disposed = false;

  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);

    const [still, turning] = await Promise.all([
      createMovableFlare(world.scene, FLARE_SCALE, [1, 1, 1], 'flare'),
      createMovableFlare(world.scene, FLARE_SCALE, [1, 1, 1], 'flare'),
    ]);

    if (this.#disposed) {
      still?.dispose();
      turning?.dispose();
      return;
    }

    this.#still = still;
    this.#turning = turning;
  }

  dispose(): void {
    this.#disposed = true;

    this.#still?.dispose();
    this.#turning?.dispose();
    this.#still = this.#turning = null;

    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    const ms = gameTime.TotalGameTime.TotalSeconds * 1000;
    const dt = this.#lastMs < 0 ? 0 : ms - this.#lastMs;
    this.#lastMs = ms;

    // Only a beacon in view is drawn, and only a drawn one turns `Ro`.
    if (!this.Ready || this.OutOfView) return;

    ro = (ro + (dt * REFERENCE_FPS) / 1000) % 360;

    const { x, y, z } = this.node.position;
    const up = y + (FLARE_HEIGHT + ride(ms)) / TILE_CM;

    this.#still?.moveTo(x, up, z);
    this.#turning?.moveTo(x, up, z);
    this.#turning?.setAngle(ro);
  }
}
