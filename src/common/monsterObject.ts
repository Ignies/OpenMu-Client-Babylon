import type { Entity, World } from '../ecs/world';
import { ModelObject } from './modelObject';
import { monsterBlendMeshFor, type MonsterBlendMesh } from './monsters/monsterBlendMesh';
import { monsterModelTypeOf } from './playSpeed';

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
  #blendMesh: MonsterBlendMesh | undefined;

  async init(_world: World, entity: Entity): Promise<void> {
    this.#entity = entity;
    this.#blendMesh = monsterBlendMeshFor(monsterModelTypeOf(entity.npcType));
  }

  /**
   * The additive body mesh the original gives this model in `CreateMonster`
   * and the per-tick writes on it (`monsters/monsterBlendMesh.ts`). A class
   * that set its own `BlendMesh` (the golden line's metal pass) keeps it;
   * the animation binds either way.
   */
  load(gltf: Parameters<ModelObject['load']>[0]) {
    const row = this.#blendMesh;
    if (row && this.BlendMesh < 0) {
      this.BlendMesh = row.mesh;
      this.BlendMeshLight = row.light;
    }

    super.load(gltf);

    if (row?.animate) this.bindMeshAnimation(row.animate(this));
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
