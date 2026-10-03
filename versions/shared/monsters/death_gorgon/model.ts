import type { Entity, World } from '@/ecs/world';
import { loadGLTF } from '@/controllers/assets';
import { MonsterObject } from '@/controllers/actors';
import { monsterModelFile, monsterScaleOf } from '@/controllers/actors';
import { registerModelClass } from '@/controllers/actors';

/**
 * Death Gorgon is `MODEL_GORGON` with `c->Level == 2`, and that level is the
 * whole difference: the body burns and the fire lights the floor
 * (ZzzCharacter.cpp:6060-6072). The fire is the body-effects row
 * `MONSTER_VISUALS[35]` (`controllers/fx/monsterVisuals.ts`); the floor light is
 * `CHARACTER_LIGHTS[35]` (`controllers/lighting/characters.ts`).
 *
 * The additive body mesh and its flicker (`BlendMeshLight = (rand() % 10) *
 * 0.1f`, :6061) come from `monsterBlendMesh.ts`, shared with the plain Gorgon.
 */

// [NpcInfo(35, "Death Gorgon")] (ZzzCharacter.cpp:13623-13633)
export class DeathGorgon extends MonsterObject {
  static get OverrideScale() {
    return monsterScaleOf(35);
  }

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    this.load(await loadGLTF(monsterModelFile(11), world));
  }
}

// Death Gorgon burns; the fire is what the floor light comes from.
registerModelClass(35, DeathGorgon);
