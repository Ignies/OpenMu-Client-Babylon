import type { ISystemFactory } from '../world';
import { quests } from '../../quests';

/**
 * The one lifecycle call site of the quest system :
 * steps every entry in `quests/layers.ts` once a frame, before the quest
 * windows and the HUD bubbles read them. The map-change half is
 * `quests.reset()` in `loadMapIntoScene.ts`.
 */
export const QuestSystem: ISystemFactory = world => ({
  update: dt => {
    quests.update(world.mapIndex, dt);
  },
});
