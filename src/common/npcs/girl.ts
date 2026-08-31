import type { World } from '../../ecs/world';
import { loadGLTF } from '../modelLoader';
import { PlayerObject } from '../playerObject';

// [NpcInfo(253, "Potion Girl Amy")]
// Girl01.glb is a rig-only BMD conversion (0 meshes — see
//  the geometry ships as part files the
// original composes at runtime. ZzzCharacter.cpp:14238 (MONSTER_POTION_GIRL_AMY)
// equips MODEL_MERCHANT_GIRL_HEAD/UPPER/LOWER — the +0 variants, i.e. the 01
// skins (Lumen uses +1 → 02). No gloves or boots parts exist for the Girl rig.
// Idle mirrors Lumen: the entity keeps its `monsterAnimation` component and
// the animation system's Stop1 (= 0) plays the rig's stand clip — the
// PlayerAction indices `startNpcIdle()` picks don't exist on this 2-action rig.
export class Girl extends PlayerObject {
  async init(world: World) {
    const bmd = await loadGLTF('NPC/Girl01.glb', world);

    this.load(bmd);

    this.setBodyPartsAsync(
      'NPC/',
      'GirlHead',
      'GirlUpper',
      'GirlLower',
      '',
      '',
      1
    );
  }
  // protected override void HandleClick() { }
}
