import type { World } from '../../ecs/world';
import { loadGLTF } from '../modelLoader';
import { PlayerObject } from '../playerObject';

// Man01.glb is a rig-only BMD conversion (0 meshes — see
//  the geometry ships as
// ManHead/ManUpper/ManGloves/ManBoots 01|02 part files (there is no ManLower).
// The original picks the parts per NPC in ZzzCharacter.cpp:
//   14062 MONSTER_ALEX (230):                     Head+0 Upper+1 Gloves+1 Boots+0
//   14204 MONSTER_WANDERING_MERCHANT_MARTIN (248): Head+1 Upper+1 Gloves+1 Boots+1
//   14224 MONSTER_WANDERING_MERCHANT_HAROLD (250): Head+0 Upper+0 Gloves+0 Boots+0
// (+0 = the 01 files, +1 = 02.)
// Idle mirrors Lumen: the entity keeps its `monsterAnimation` component and
// the animation system's Stop1 (= 0) plays the rig's stand clip — the
// PlayerAction indices `startNpcIdle()` picks don't exist on this 2-action rig.
abstract class MerchantMan extends PlayerObject {
  /** Skin (1 or 2) per part slot, from the ZzzCharacter.cpp cases above. */
  protected abstract readonly skins: {
    head: number;
    upper: number;
    gloves: number;
    boots: number;
  };

  async init(world: World) {
    const bmd = await loadGLTF('NPC/Man01.glb', world);

    this.load(bmd);

    const { head, upper, gloves, boots } = this.skins;
    // setBodyPartsAsync applies one skin index to every named part, so the
    // mixed-skin outfits load in one pass per distinct index.
    for (const skin of new Set([head, upper, gloves, boots])) {
      this.setBodyPartsAsync(
        'NPC/',
        head === skin ? 'ManHead' : '',
        upper === skin ? 'ManUpper' : '',
        '',
        gloves === skin ? 'ManGloves' : '',
        boots === skin ? 'ManBoots' : '',
        skin
      );
    }
  }
  // protected override void HandleClick() { }
}

// [NpcInfo(230, "Alex")]
export class Alex extends MerchantMan {
  protected readonly skins = { head: 1, upper: 2, gloves: 2, boots: 1 };
}

// [NpcInfo(248, "Wandering Merchant Martin")]
export class Martin extends MerchantMan {
  protected readonly skins = { head: 2, upper: 2, gloves: 2, boots: 2 };
}

// [NpcInfo(250, "Wandering Merchant Harold")]
export class Harold extends MerchantMan {
  protected readonly skins = { head: 1, upper: 1, gloves: 1, boots: 1 };
}
