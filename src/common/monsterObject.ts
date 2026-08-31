import type { Entity, World } from '../ecs/world';
import { ModelObject } from './modelObject';

/** MU vertical units → world units (`TERRAIN_SCALE` is 100). */
const MU_UNIT = 1 / 100;

/** `o->Timer += 0.15f * FPS_ANIMATION_FACTOR` → 0.15 × 25 radians per second. */
const BOB_RADIANS_PER_SECOND = 0.15 * 25;

/** Peak lift of the Budge Dragon bob, in MU units (ZzzCharacter.cpp:6276). */
const BUDGE_DRAGON_BOB = 70;

export class MonsterObject extends ModelObject {
  /**
   * `MODEL_BUDGE_DRAGON`'s hover: `o->Position[2] += -|sin(Timer)| * 70 + 70`
   * every time `MoveCharacterPosition` runs (ZzzCharacter.cpp:6274-6278), i.e.
   * only while the monster is walking. A dead one drops back to the terrain
   * (`MoveMonsterClient`:6320-6324).
   */
  BobsWhileMoving = false;

  #entity: Entity | null = null;
  #bobTimer = 0;

  async init(_world: World, entity: Entity): Promise<void> {
    this.#entity = entity;
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.BobsWhileMoving) return;

    const entity = this.#entity;
    const velocity = entity?.movement?.velocity;
    const moving = !!velocity && (velocity.x !== 0 || velocity.y !== 0);

    if (!moving || entity?.dying) {
      this.HoverHeight = 0;
      return;
    }

    this.#bobTimer = gameTime.TotalGameTime.TotalSeconds * BOB_RADIANS_PER_SECOND;

    this.HoverHeight =
      (-Math.abs(Math.sin(this.#bobTimer)) * BUDGE_DRAGON_BOB +
        BUDGE_DRAGON_BOB) *
      MU_UNIT;
  }
}
