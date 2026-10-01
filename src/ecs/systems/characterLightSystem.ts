import type { ISystemFactory } from '../world';
import { lighting } from '../../controllers/lighting';
import { characterLightFor } from '../../controllers/lighting/characters';

/**
 * Consumer of the lighting layer's `characters` entry: walks the entities
 * that have an `npcType` and asks the entry to light the ones its table
 * names, drop the dying, and re-light after a map load (which disposes every
 * source). Owns no lighting state - `controllers/lighting/characters.ts` does.
 */
export const CharacterLightSystem: ISystemFactory = world => {
  const characters = world.with('npcType', 'modelObject', 'transform');

  characters.onEntityRemoved.subscribe(e => lighting.snuffCharacter(e));

  return {
    update: () => {
      for (const e of characters) {
        if (!characterLightFor(e.npcType)) continue;

        if (e.dying) {
          lighting.snuffCharacter(e);
          continue;
        }

        if (lighting.characterIsLit(e) || !e.modelObject.Ready) continue;

        lighting.lightCharacter(world.scene, e);
      }
    },
  };
};
