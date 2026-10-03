import type { Entity, World } from '@/ecs/world';
import { PlayerAction } from '../../objects/enum';
import { loadGLTF, settle } from '@/controllers/assets';
import { PlayerObject, registerModelClass } from '@/controllers/actors';
import { CharacterClassNumber } from '@/core/types';

// [NpcInfo(236, "Golden Archer")]
export class GoldenArcher extends PlayerObject {
  static NpcClass = CharacterClassNumber.DarkKnight;

  static {
    GoldenArcher.OverrideScale = 1; // `o->Scale = 1.0f` (ZzzCharacter.cpp:14387)
  }

  async init(world: World, entity: Entity) {
    this.load(await loadGLTF('Player/player.glb', world));

    void settle(
      this.setBodyPartsAsync(
        'Player/',
        'HelmMale',
        'ArmorMale',
        'PantMale',
        'GloveMale',
        'BootMale',
        22
      ),
      'Player/Male22 parts'
    );

    // Weapon1.Type = (int)ModelType.Bow + 5 + MODEL_ITEM; // Silver Bow as a golden-looking bow
    // Weapon1.Level = 9;

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
  }
  // protected override void HandleClick() { }
}

registerModelClass(236, GoldenArcher);
