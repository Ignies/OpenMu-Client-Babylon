import type { Entity, World } from '../../ecs/world';
import { loadGLTF } from '../modelLoader';
import { MonsterObject } from '../monsterObject';
import { MonsterActionType } from '../objects/enum';
import { monsterPlaySpeed } from '../playSpeed';
import { monsterModelFile, monsterScaleOf } from './monsterModelTable';

// [NpcInfo(275, "Kundun")] - MODEL_ILLUSION_OF_KUNDUN at Scale 2.0 with the
// Staff of Kundun in the off hand (GMHellas.cpp:913-923). The staff waits on
// the monster-rig weapon work (see monsterModelTable.ts); the play-speed
// table (ZzzOpenData.cpp:2404-2409) is already in playSpeed.ts and his voice
// (:3587-3592) in sound/monsters.ts.
const NPC_TYPE = 275;

/** MONSTER_MODEL_ILLUSION_OF_KUNDUN. */
const MODEL_TYPE = 64;

/** Past this key of the huge Die clip the collapse fast-forwards 4x (ZzzCharacter.cpp:2449-2451). */
const DIE_FAST_FRAME = 6;
const DIE_FAST_FACTOR = 4;

export class Kundun extends MonsterObject {
  static {
    Kundun.OverrideScale = monsterScaleOf(NPC_TYPE);
  }

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    this.load(await loadGLTF(monsterModelFile(MODEL_TYPE), world));
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (
      this.CurrentAction === MonsterActionType.Die &&
      this.actionFrame() > DIE_FAST_FRAME
    ) {
      this.setAnimationSpeed(
        monsterPlaySpeed(MODEL_TYPE, MonsterActionType.Die) * DIE_FAST_FACTOR
      );
    }
  }
}
