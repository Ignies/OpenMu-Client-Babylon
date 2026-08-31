import { MapTileObject } from '../../common/mapTileObject';
import { PlayerAction } from '../../common/objects/enum';
import { toRadians } from '../../common/utils';
import { playSfx } from '../../libs/sfx';
import { Store } from '../../store';
import type { Entity, World } from '../../ecs/world';

/** MU world units per terrain tile. The original's `Position` is in these. */
const MU_PER_TILE = 100;

/** The original's REFERENCE_FPS (ZzzAI.h:11): every rate below is per tick. */
const TICKS_PER_SECOND = 25;

/** Longest gap `CheckSkull` is stepped over in one frame, in ticks. */
const MAX_TICKS_PER_FRAME = 4;

/** `Distance < 50.f` (ZzzEffectFireLeave.cpp:98) — half a tile. */
const KICK_RANGE = 50 / MU_PER_TILE;

/**
 * `o->Direction[0] < 0.1f` (ZzzEffectFireLeave.cpp:93), converted from MU to
 * tiles. See the note on the arming test in `#tick`.
 */
const KICK_ARM_DIRECTION_X = 0.1 / MU_PER_TILE;

/** `VectorScale(o->Direction, 0.6f, …)` and the same on HeadAngle (:107-108). */
const DECAY = 0.6;

/** `Vector(-dx * 0.4f, -dy * 0.4f, 0.f, o->Direction)` (:100). */
const KICK_SPEED = 0.4;

/** `o->HeadAngle[1] = -dx * 4.f` — degrees per MU, so ×100 per tile (:101-102). */
const KICK_SPIN = 4 * MU_PER_TILE;

/**
 * Below these the kick has died out and the object is left alone until the
 * hero comes back: tiles per tick for the slide, degrees per tick for the
 * tumble. At `DECAY` 0.6 both are reached ~15 ticks after a full-strength
 * kick, well inside the frame it visibly stops on.
 */
const SLIDE_AT_REST = 1e-4;
const SPIN_AT_REST = 1e-3;

/**
 * `CheckSkull(o)` — Lost Tower types 38 (n=777, the skulls) and 39 (n=335,
 * the loose stones), the only props on this map the player can touch.
 * `MoveObject` routes both to it (ZzzObject.cpp:3949-3951); the function
 * itself is ZzzEffectFireLeave.cpp:87-111.
 *
 * Walk or run within half a tile and the thing skitters away from you and
 * tumbles, then coasts to a stop wherever it lands and stays there for the
 * rest of the visit — nothing resets it, and the map file is never written
 * back, so a corridor the player has walked twice is visibly disturbed.
 * Reproducing that permanence is the point of the prop; a spring-back would
 * turn the map's one interactive detail into a toy.
 *
 * A class rather than a table entry because this is genuinely per-object
 * state: a position and an angular velocity that outlive the frame that set
 * them, and a distance test that only one of the 1112 candidates passes.
 *
 * The original moves them from `MoveObject`, i.e. once per rendered frame,
 * with only the position step scaled by `FPS_ANIMATION_FACTOR` — the 0.6
 * decay and the angle step are raw, so a skull travels four times as far at
 * 25 fps as at 100. That is a bug, not a design, and there is no frame rate at
 * which it is "correct" other than the reference 25 (ZzzAI.cpp:729,
 * `FPS_ANIMATION_FACTOR = REFERENCE_FPS / FPS`). So this runs on a fixed
 * 25 Hz accumulator with the factor pinned at 1: identical to the original
 * running at its design frame rate, and identical to itself at any of ours.
 */
export class LostTowerSkullObject extends MapTileObject {
  #entity: Entity | null = null;

  /** `o->Direction` x/y in tiles per tick (z is always 0 here). */
  #dirX = 0;
  #dirY = 0;

  /** `o->HeadAngle[0]` and `[1]`, degrees per tick. */
  #head0 = 0;
  #head1 = 0;

  #due = 0;
  #lastSeconds = -1;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    this.#entity = entity;
  }

  dispose(): void {
    this.#entity = null;

    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.Ready || !this.#entity?.transform) return;

    const seconds = gameTime.TotalGameTime.TotalSeconds;
    const delta = this.#lastSeconds < 0 ? 0 : seconds - this.#lastSeconds;
    this.#lastSeconds = seconds;

    this.#due += delta * TICKS_PER_SECOND;

    // A tab-out or a map load can leave an arbitrary gap; catching up on all
    // of it would teleport a skull mid-flight.
    if (this.#due > MAX_TICKS_PER_FRAME) this.#due = MAX_TICKS_PER_FRAME;

    while (this.#due >= 1) {
      this.#due -= 1;
      this.#tick();
    }
  }

  #tick(): void {
    const transform = this.#entity?.transform;

    if (!transform) return;

    const hero = Store.world?.playerEntity;

    // `Hero->Object.CurrentAction` between PLAYER_WALK_MALE and
    // PLAYER_RUN_RIDE_WEAPON, or one of the two Rage-uniform runs
    // (ZzzEffectFireLeave.cpp:90-91). Note this is a *narrower* test than
    // sound/footsteps': CheckSkull predates the two-handed-sword-two and
    // ride-horse clips and was never extended to them, so a player on a horse
    // walks through the bones without touching them. Kept as the original has
    // it — the alternative is inventing behaviour for actions the function has
    // never seen.
    if (hero && hero.worldIndex === this.WorldIndex) {
      const action = hero.playerAnimation.action;

      const moving =
        (action >= PlayerAction.PLAYER_WALK_MALE &&
          action <= PlayerAction.PLAYER_RUN_RIDE_WEAPON) ||
        action === PlayerAction.PLAYER_RAGE_UNI_RUN ||
        action === PlayerAction.PLAYER_RAGE_UNI_RUN_ONE_RIGHT;

      // The arming test is `o->Direction[0] < 0.1f` — one axis, one-sided, and
      // it is the original's. A skull kicked towards +x has a large positive
      // Direction[0] and is locked out until it decays; one kicked towards -x
      // has a negative Direction[0] and passes immediately, so it can be
      // punted again every tick while the player stands over it. That
      // asymmetry is visible in game (bones chase away from you in bursts on
      // one side, smoothly on the other) and is left alone: it is what the
      // prop feels like.
      if (moving && this.#dirX < KICK_ARM_DIRECTION_X) {
        const dx = hero.transform.pos.x - transform.pos.x;
        const dy = hero.transform.pos.z - transform.pos.z;

        if (Math.hypot(dx, dy) < KICK_RANGE) {
          this.#dirX = -dx * KICK_SPEED;
          this.#dirY = -dy * KICK_SPEED;
          this.#head1 = -dx * KICK_SPIN;
          this.#head0 = -dy * KICK_SPIN;

          // `PlayBuffer(SOUND_BONE2, o)` — Data/Sound/mBone2.wav
          // (ZzzOpenData.cpp:4572). playSfx carries the same distance
          // attenuation PlayBuffer's 3D listener gave it, and its per-key
          // throttle stands in for DirectSound's channel limit when a stride
          // catches three skulls at once.
          playSfx('Sound/mBone2', { x: transform.pos.x, z: transform.pos.z });
        }
      }
    }

    if (
      Math.abs(this.#dirX) < SLIDE_AT_REST &&
      Math.abs(this.#dirY) < SLIDE_AT_REST &&
      Math.abs(this.#head0) < SPIN_AT_REST &&
      Math.abs(this.#head1) < SPIN_AT_REST
    ) {
      return;
    }

    this.#dirX *= DECAY;
    this.#dirY *= DECAY;
    this.#head0 *= DECAY;
    this.#head1 *= DECAY;

    // MU x/y are the ground plane; the clone's is x/z. Position[2] never
    // changes (Direction[2] is always 0), so the skull keeps the height the
    // map file gave it and does not re-sample the terrain — it can and does
    // end up hanging slightly off a step it was kicked down.
    transform.pos.x += this.#dirX;
    transform.pos.z += this.#dirY;

    // `VectorAdd(o->Angle, o->HeadAngle, o->Angle)`, through the same axis
    // mapping createObjects uses on load (loadMapIntoScene.ts): rot.x is
    // -radians(Angle[0]) and rot.z is -radians(Angle[1]), hence the negation
    // and the swap. Angle[2] (yaw) is untouched — the skull tumbles, it does
    // not spin on the spot.
    transform.rot.x -= toRadians(this.#head0);
    transform.rot.z -= toRadians(this.#head1);
  }
}
