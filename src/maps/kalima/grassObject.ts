import { MapTileObject } from '../../common/mapTileObject';
import { PlayerAction } from '../../common/objects/enum';
import { waterSurfaceHeight } from '../../libs/mu/terrainWater';
import { Store } from '../../store';
import type { Entity, World } from '../../ecs/world';

/** MU world units per terrain tile. The original's `Position` is in these. */
const MU_PER_TILE = 100;

/** The original's REFERENCE_FPS (ZzzAI.h:11): every rate below is per tick. */
const TICKS_PER_SECOND = 25;

/** Longest gap `CheckGrass` is stepped over in one frame, in ticks. */
const MAX_TICKS_PER_FRAME = 4;

/** `Distance < 50.f` (GMHellas.cpp:416) - half a tile. */
const PUSH_RANGE = 50 / MU_PER_TILE;

/** `o->Direction[0] < 0.1f` (GMHellas.cpp:411), MU converted to tiles. */
const PUSH_ARM_DIRECTION_X = 0.1 / MU_PER_TILE;

/** `Vector(-dx * 0.6f, -dy * 0.6f, 0.f, o->Direction)` (GMHellas.cpp:418). */
const PUSH_SPEED = 0.6;

/** `VectorScale(o->Direction, 0.6f, o->Direction)` (GMHellas.cpp:422). */
const DECAY = 0.6;

/** Below this the push has died out and the plant is left where it settled. */
const AT_REST = 1e-4;

/**
 * `GetWaterTerrain(x, y) + 180` (GMHellas.cpp:450, :460) in world units.
 *
 * `CSWaterTerrain::GetWaterTerrain` (CSWaterTerrain.cpp:328-351) is
 * `(page + 350 + (w2 + 350) + (w3 + 350)) / 2) * 0.25`, i.e. a flat 175 plus a
 * quarter of the ripple page plus an eighth of the two base sines. The flat
 * half and the `+ 180` are this constant; the sines are `WAVE_WEIGHT` below.
 *
 * EncTerrain25.obj authors types 15, 29 and 32 at z 347…385 with means of 368,
 * 365 and 364, so the pin is not a relocation - it is the bob these already
 * sit in the middle of.
 */
const WATER_SURFACE = (175 + 180) / MU_PER_TILE;

/**
 * `waterSurfaceHeight` carries `CreateTerrain`'s weights (base sines at 0.25,
 * CSWaterTerrain.cpp:139), which is what the drawn surface uses;
 * `GetWaterTerrain` weights the same sines at 0.125, so the height the plants
 * are pinned to is half the surface's swing.
 */
const WAVE_WEIGHT = 0.5;

/**
 * `CheckGrass(o)` - Kalima types 15 (x13), 29 (x287) and 32 (x19), the water
 * plants standing in the flooded floor of the cave. `RenderHellasVisual`
 * routes all three to it (GMHellas.cpp:447-461); the function itself is
 * GMHellas.cpp:400-427.
 *
 * Two things happen to a plant. It is pinned every frame to the water
 * surface, so the whole bed rises and falls together with the waves
 * `CSWaterTerrain` runs under it. And while the hero is walking or running,
 * anything within half a tile is pushed away and then coasts back to a stop -
 * `CheckSkull`'s shape (maps/losttower/skullObject.ts) with a stronger kick,
 * no sound and no tumble: `o->HeadAngle` is never written for a map object,
 * so the `VectorAdd(o->Angle, o->HeadAngle, o->Angle)` at the end of
 * `CheckGrass` is a no-op and the plant slides upright.
 *
 * Unlike `CheckSkull` the decay and the position step are *inside* the
 * moving test, so a hero who stops mid-push freezes the plant where it is
 * until they move again. That is the original's brace placement and it is
 * kept: the beds are visibly furrowed along the path a player took.
 *
 * Like `CheckSkull` the original's decay is per rendered frame while only the
 * position step carries `FPS_ANIMATION_FACTOR`, which makes the reach
 * frame-rate dependent. This runs the push on a fixed 25 Hz accumulator with
 * the factor pinned at 1 - the original at its design frame rate - and takes
 * the water pin off the wall clock, since that one is a pure function of time.
 *
 * Not batchable: the whole point is a per-object position that changes.
 */
export class KalimaWaterPlantObject extends MapTileObject {
  static Batchable = false;

  #entity: Entity | null = null;

  /** `o->Direction` x/y in tiles per tick (z is always 0 here). */
  #dirX = 0;
  #dirY = 0;

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

    const transform = this.#entity?.transform;

    if (!this.Ready || !transform) return;

    const seconds = gameTime.TotalGameTime.TotalSeconds;
    const delta = this.#lastSeconds < 0 ? 0 : seconds - this.#lastSeconds;
    this.#lastSeconds = seconds;

    this.#due += delta * TICKS_PER_SECOND;

    // A tab-out or a map load can leave an arbitrary gap; catching up on all
    // of it would teleport a plant mid-slide.
    if (this.#due > MAX_TICKS_PER_FRAME) this.#due = MAX_TICKS_PER_FRAME;

    while (this.#due >= 1) {
      this.#due -= 1;
      this.#push(transform);
    }

    // The ripple page - the ambient rings and the waves a footfall raises -
    // is a quarter of the original's height and is not reproduced: nothing in
    // the clone runs Kalima's `CSWaterTerrain`, so there are no rings to read
    // and the base sines are the whole surface. `waterSurfaceHeight`'s ring
    // argument is where they would go if the map ever gets one.
    transform.pos.y =
      WATER_SURFACE +
      WAVE_WEIGHT *
        waterSurfaceHeight(transform.pos.x, transform.pos.z, seconds);
  }

  #push(transform: NonNullable<Entity['transform']>): void {
    const hero = Store.world?.playerEntity;

    if (!hero || hero.worldIndex !== this.WorldIndex) return;

    // GMHellas.cpp:404-409. The last clause is `CurrentAction >=
    // PLAYER_RAGE_UNI_RUN && CurrentAction >= PLAYER_RAGE_UNI_RUN_ONE_RIGHT`
    // in the original - two `>=`, where every other line in the chain is a
    // range - so it reduces to the second bound alone and lets every Rage
    // Fighter action above the uniform run count as walking, standing
    // included. Ported as written: it is what the beds do in game, and
    // guessing at the range that was meant would be inventing behaviour.
    const action = hero.playerAnimation.action;

    const moving =
      (action >= PlayerAction.PLAYER_WALK_MALE &&
        action <= PlayerAction.PLAYER_RUN_RIDE_WEAPON) ||
      (action >= PlayerAction.PLAYER_FENRIR_RUN &&
        action <= PlayerAction.PLAYER_FENRIR_RUN_ONE_LEFT_ELF) ||
      (action >= PlayerAction.PLAYER_FENRIR_WALK &&
        action <= PlayerAction.PLAYER_FENRIR_WALK_ONE_LEFT) ||
      (action >= PlayerAction.PLAYER_RAGE_FENRIR_RUN &&
        action <= PlayerAction.PLAYER_RAGE_FENRIR_RUN_ONE_LEFT) ||
      (action >= PlayerAction.PLAYER_RAGE_FENRIR_WALK &&
        action <= PlayerAction.PLAYER_RAGE_FENRIR_WALK_TWO_SWORD) ||
      action >= PlayerAction.PLAYER_RAGE_UNI_RUN_ONE_RIGHT;

    if (!moving) return;

    // One axis, one-sided, and it is the original's - see the same test in
    // maps/losttower/skullObject.ts for what the asymmetry looks like.
    if (this.#dirX < PUSH_ARM_DIRECTION_X) {
      const dx = hero.transform.pos.x - transform.pos.x;
      const dy = hero.transform.pos.z - transform.pos.z;

      if (Math.hypot(dx, dy) < PUSH_RANGE) {
        this.#dirX = -dx * PUSH_SPEED;
        this.#dirY = -dy * PUSH_SPEED;
      }
    }

    if (Math.abs(this.#dirX) < AT_REST && Math.abs(this.#dirY) < AT_REST) {
      return;
    }

    this.#dirX *= DECAY;
    this.#dirY *= DECAY;

    // MU x/y are the ground plane; the clone's is x/z. Direction[2] is always
    // zero, and the height is the water pin's business either way.
    transform.pos.x += this.#dirX;
    transform.pos.z += this.#dirY;
  }
}
