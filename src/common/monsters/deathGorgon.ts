import type { Entity, World } from '../../ecs/world';
import { loadGLTF } from '../modelLoader';
import { MonsterObject } from '../monsterObject';
import { monsterModelFile, monsterScaleOf } from './monsterModelTable';

/**
 * Death Gorgon is `MODEL_GORGON` with `c->Level == 2`, and that level is the
 * whole difference: the body burns and the fire lights the floor
 * (ZzzCharacter.cpp:6060-6072). The fire is the body-effects row
 * `MONSTER_VISUALS[35]` (`effects/monsterVisuals.ts`); the floor light is
 * `CHARACTER_LIGHTS[35]` (`lighting/characters.ts`).
 *
 * Not ported: `o->BlendMeshLight = (rand() % 10) * 0.1f` (:6061), the
 * additive mesh pass flickering on both Gorgons. `goldenMonsters.ts` records
 * the same gap.
 */

// [NpcInfo(35, "Death Gorgon")] (ZzzCharacter.cpp:13623-13633)
export class DeathGorgon extends MonsterObject {
  static {
    DeathGorgon.OverrideScale = monsterScaleOf(35);
  }

  BlendMesh = 1;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    this.load(await loadGLTF(monsterModelFile(11), world));
  }
}
