import type { Entity, World } from '../../ecs/world';
import { PlayerAction } from '../objects/enum';
import { loadGLTF } from '../modelLoader';
import { PlayerObject } from '../playerObject';
import { CharacterClassNumber } from '../types';

// [NpcInfo(371, "Leo the Helper")]
export class Leo extends PlayerObject {
  static NpcClass = CharacterClassNumber.DarkKnight;

  async init(world: World, entity: Entity) {
    this.load(await loadGLTF('Player/player.glb', world));

    this.setBodyPartsAsync(
      'Player/',
      'HelmMale',
      'ArmorMale',
      'PantMale',
      'GloveMale',
      'BootMale',
      10
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
  // protected override void HandleClick() { }
}
