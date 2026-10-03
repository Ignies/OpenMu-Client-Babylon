import type { Entity, World } from '@/ecs/world';
import { PlayerAction } from '../../objects/enum';
import { loadGLTF, settle } from '@/controllers/assets';
import { PlayerObject, registerModelClass } from '@/controllers/actors';
import { CharacterClassNumber } from '@/core/types';

/**
 * A player rig in the plate set. Luke (258), Leo (371) and Ellen (414) are one case in the
 * original (ZzzCharacter.cpp:14612-14625).
 */
export class PlateNpc extends PlayerObject {
  static NpcClass = CharacterClassNumber.DarkKnight;

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
        10
      ),
      'Player/Male10 parts'
    );

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
}

registerModelClass([258, 371, 414], PlateNpc);
