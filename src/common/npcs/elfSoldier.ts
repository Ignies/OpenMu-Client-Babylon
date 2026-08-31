import type { Entity, World } from '../../ecs/world';
import { PlayerAction } from '../objects/enum';
import { Scene, TransformNode } from '../../libs/babylon/exports';
import { loadGLTF } from '../modelLoader';
import { ItemGroups } from '../objects/enum';
import { PlayerObject } from '../playerObject';
import { CharacterClassNumber, PlayerClass } from '../types';
import { WINGS_OF_SPIRITS, WING_GROUP } from '../wings';

const lvl = 9;
const isExcellent = false;
const RedSpiritIndex = 24;

// [NpcInfo(257, "Elf Soldier")]
export class ElfSoldier extends PlayerObject {
  static NpcClass = CharacterClassNumber.FairyElf;

  /** `if (c->MonsterIndex == MONSTER_ELF_SOLDIER) Fly = true;` (:222). */
  static NpcAlwaysFly = true;

  constructor(scene: Scene, parent: TransformNode) {
    super(scene, parent);

    this.playerClass = PlayerClass.FairyElf;
  }

  async init(world: World, entity: Entity) {
    this.load(await loadGLTF('Player/player.glb', world));

    this.Ready = false;

    world.addComponent(entity, 'charAppearance', {
      charClass: CharacterClassNumber.FairyElf,
      helm: {
        group: ItemGroups.Helm,
        num: RedSpiritIndex,
        lvl,
        isExcellent,
      },
      armor: {
        group: ItemGroups.Armor,
        num: RedSpiritIndex,
        lvl,
        isExcellent,
      },
      pants: {
        group: ItemGroups.Pants,
        num: RedSpiritIndex,
        lvl,
        isExcellent,
      },
      gloves: {
        group: ItemGroups.Gloves,
        num: RedSpiritIndex,
        lvl,
        isExcellent,
      },
      boots: {
        group: ItemGroups.Boots,
        num: RedSpiritIndex,
        lvl,
        isExcellent,
      },
      leftHand: null,
      rightHand: null,
      // The Elf Soldier wears Wings of Spirits (Wing04); AppearanceSystem
      // loads them, bone-links them and applies their additive membrane.
      wings: { group: WING_GROUP, num: WINGS_OF_SPIRITS, lvl: 0 },
      pet: null,
      changed: true,
    });

    this.startNpcIdle();
    world.removeComponent(entity, 'monsterAnimation');
    // A player rig walks with the player state machine (AnimationSystem's
    // SetPlayerStop / SetPlayerWalk port): idle here, PLAYER_WALK_* when the
    // server walks the NPC (guards patrol), back to idle when the path ends.
    if (!entity.playerAnimation) {
      world.addComponent(entity, 'playerAnimation', {
        action: PlayerAction.PLAYER_SET,
        run: 0,
      });
    }

    this.Ready = true;
  }
  // protected override void HandleClick() { }
}
