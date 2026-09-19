import { MapTileObject } from '../../common/mapTileObject';
import { REFERENCE_FPS } from '../../common/playSpeed';
import type { Entity, World } from '../../ecs/world';

/**
 * `Models[66].Actions[0].PlaySpeed = Models[66].Actions[1].PlaySpeed = 0.15f`
 * (MapManager.cpp:1167-1168). Karutan is one of three worlds where
 * `RenderObject` takes the action's `PlaySpeed` in place of `o->Velocity`
 * (ZzzObject.cpp:3696-3701, types 66 and 107), so 0.15 is the rate both
 * clips actually run at - the default would be 0.16.
 */
const INSECT_PLAY_SPEED = 0.15;

/** `o->AnimationFrame >= 19` (GMKarutan1.cpp:183); both clips are 20 keys. */
const TAIL_FRAME = 19;

/** `rand_fps_check(10)`: one reference tick in ten (ZzzAI.cpp:711-714). */
const SWITCH_ODDS = 0.1;

/**
 * Karutan 66 (`Object81/Object67.bmd`, `so_liveC01`), ×6 in World81 and none
 * in World82 - the insect on the oasis rocks, two glowing points on bones
 * 13/14 (`KARUTAN_LIGHTS`) and the carrier of `Karutan_insect_env`
 * (`sound/objectLoops.ts`).
 *
 * `if (o->AnimationFrame >= 19) SetAction(o, rand_fps_check(10) ? 1 : 0)`
 * (GMKarutan1.cpp:182-188) is a roll *per frame* over the tail of a 20-key
 * clip, not per loop: `SetAction` only bites when the action changes, so the
 * creature sits in clip 0 until a roll comes up 1, switches (which resets the
 * frame to 0 and ends the tail), then sits in clip 1 until a roll comes up 0.
 * At 0.15 keys/tick the tail is about seven ticks long, so a loop ends in the
 * other clip about half the time.
 *
 * Rolled per reference tick here for that reason - the odds belong to a tick,
 * and a frame-rate-driven roll would switch clips faster on a faster machine.
 */
export class KarutanInsectObject extends MapTileObject {
  #lastSeconds = -1;

  #ticks = 0;

  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);

    this.setAnimationSpeed(INSECT_PLAY_SPEED);
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    const seconds = gameTime.TotalGameTime.TotalSeconds;
    const delta = this.#lastSeconds < 0 ? 0 : seconds - this.#lastSeconds;
    this.#lastSeconds = seconds;

    // The original rolls from the render pass, and off screen the clip is
    // paused anyway, so its frame would never reach the tail.
    if (this.OutOfView || !this.Ready) return;

    if (this.actionFrame() < TAIL_FRAME) {
      this.#ticks = 0;
      return;
    }

    this.#ticks += delta * REFERENCE_FPS;

    while (this.#ticks >= 1) {
      this.#ticks -= 1;

      const next = Math.random() < SWITCH_ODDS ? 1 : 0;

      if (next !== this.CurrentAction) {
        this.playAction(next);
        return;
      }
    }
  }
}
