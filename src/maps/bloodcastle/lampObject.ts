import {
  createMovableFlare,
  type MovableFlare,
} from '../../common/effectLights';
import { MapTileObject } from '../../common/mapTileObject';
import { Store } from '../../store';
import type { Entity, World } from '../../ecs/world';
import { findBone, bonePosed, type BoneNode } from './bones';

/** `b->TransformPosition(BoneTransform[3], …)` (ZzzObject.cpp:3186). */
const FLARE_BONE = 3;

/**
 * `Luminosity = sinf(WorldTime * 0.001f) * 0.3f + 0.7f` and
 * `CreateSprite(BITMAP_FLARE, Position, Luminosity + 0.5f, Light, o)`
 * (ZzzObject.cpp:3183-3187): a white flare, 1.2…1.5 in size, 0.4…1 bright.
 * The sprite is built at the mid size and only its brightness breathes.
 */
const FLARE_SCALE = 1.35;
const PULSE_SPEED = 0.001;

/** `Vector(Luminosity, Luminosity, Luminosity, Light)`: white. */
const FLARE_COLOR: readonly [number, number, number] = [1, 1, 1];

/** Updates to wait for the skeleton to be posed before lighting anyway. */
const POSE_WAIT_LIMIT = 120;

/**
 * Blood Castle type 13, the four throne-room lamps at (11-17, 91-98), z ~ 265:
 * one breathing white flare on bone 3 (ZzzObject.cpp:3182-3188). No terrain
 * light — the original makes none, and the altar is meant to be the bright
 * spot, not the lamps.
 */
export class BloodCastleLampObject extends MapTileObject {
  #bone: BoneNode | null = null;
  #flare: MovableFlare | null = null;
  #lit = false;
  #waited = 0;
  #disposed = false;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);
    this.#bone = findBone(this, FLARE_BONE);
  }

  #light(world: World): void {
    this.#lit = true;
    const bone = this.#bone;
    if (!bone) return;

    void createMovableFlare(
      world.scene,
      FLARE_SCALE * this.node.scaling.x,
      FLARE_COLOR
    ).then(flare => {
      if (!flare) return;
      if (this.#disposed) {
        flare.dispose();
        return;
      }
      const p = bone.getAbsolutePosition();
      flare.moveTo(p.x, p.y, p.z);
      this.#flare = flare;
    });
  }

  dispose(): void {
    this.#disposed = true;
    this.#flare?.dispose();
    this.#flare = null;
    this.#bone = null;
    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.Ready || !this.#bone) return;

    const world = Store.world;
    if (!world) return;

    if (!this.#lit) {
      if (bonePosed(this, this.#bone) || ++this.#waited >= POSE_WAIT_LIMIT) {
        this.#light(world);
      }
      return;
    }

    if (this.OutOfView || !this.#flare) return;

    const worldTime = gameTime.TotalGameTime.TotalSeconds * 1000;
    this.#flare.setLuminosity(Math.sin(worldTime * PULSE_SPEED) * 0.3 + 0.7);
  }
}
