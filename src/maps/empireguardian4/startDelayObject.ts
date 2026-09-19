import { MapTileObject } from '../../common/mapTileObject';
import type { Entity, World } from '../../ecs/world';

/** `FPS_ANIMATION_FACTOR` normalises per-frame work to 25 Hz (ZzzAI.cpp:729). */
const TICKS_PER_SECOND = 25;

/** `o->SubType = rand() % 50` (GMEmpireGuardian4.cpp:58). */
const DELAY_TICKS = 50;

/**
 * Day 4's type 10 (`Object73/Object11.glb`, `choprison_h01.SMD`, x20 in
 * EncTerrain73.obj), the one object day 4 sets up that days 1-3 do not.
 *
 * `CreateObject` rolls `o->SubType = rand() % 50` (GMEmpireGuardian4.cpp:56-60)
 * and `MoveObject` spends it (:181-190):
 *
 * ```cpp
 * if (o->SubType > 0) { o->SubType -= 1; o->AnimationFrame = 0; o->PriorAnimationFrame = 0; }
 * ```
 *
 * The clip is pinned to its first frame for 0-49 ticks - up to two seconds -
 * and then runs normally for the rest of the map's life. It is a one-shot
 * stagger, not a loop: twenty identical cages that would otherwise swing in
 * lockstep come apart and stay apart.
 *
 * Ported as a speed of zero rather than a pause, because `OutOfView` already
 * owns pause/resume on looping clips (`ModelObject.applyAnimationPause`) and
 * a second owner of that switch would fight it. The frame the clip is held on
 * is whichever one it reached before `init` returned rather than exactly
 * frame 0; at the default rate that is under a key.
 */
export class EmpireGuardian4StartDelayObject extends MapTileObject {
  static Batchable = false;

  #remaining = Math.floor(Math.random() * DELAY_TICKS);
  #speed = 0;
  #lastSeconds = -1;

  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);

    if (this.#remaining <= 0) return;

    this.#speed = this.AnimationSpeed;
    this.setAnimationSpeed(0);
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (this.#remaining <= 0) return;

    const seconds = gameTime.TotalGameTime.TotalSeconds;
    const delta = this.#lastSeconds < 0 ? 0 : seconds - this.#lastSeconds;
    this.#lastSeconds = seconds;

    this.#remaining -= delta * TICKS_PER_SECOND;

    if (this.#remaining > 0) return;

    this.#remaining = 0;
    this.setAnimationSpeed(this.#speed);
  }
}
