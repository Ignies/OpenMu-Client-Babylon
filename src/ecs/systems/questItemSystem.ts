import { inBloodCastle } from '../../common/locomotion';
import type { PlayerObject } from '../../common/playerObject';
import { bloodCastleQuestItem } from '../../events/bloodCastle';
import type { Entity, ISystemFactory } from '../world';

/**
 * The Blood Castle quest weapon on its carrier's back.
 *
 * `SetMatchGameCommand` names the holder and which of the three Divine
 * weapons it is in every running-state packet, and the original writes it to
 * `c->EtcPart`; `RenderCharacter` then hangs the model off back bone 47 while
 * the map is a castle floor (ZzzCharacter.cpp:15367-15391). Here the state
 * lives in `events/bloodCastle.ts` and this is the one place that turns it
 * into a part - it cannot ride `AppearanceSystem`, which only runs when the
 * character's own equipment changed, and the carrier's does not.
 *
 * Driven by: `bloodCastleQuestItem()`. Read by: nobody.
 */
export const QuestItemSystem: ISystemFactory = world => {
  /** Who is wearing it right now, so it can be taken off again. */
  let carrier: Entity | null = null;
  let carriedLevel = 0;

  function take(from: Entity | null): void {
    if (from?.playerAnimation) {
      void (from.modelObject as PlayerObject | undefined)?.setQuestItemAsync(
        null
      );
    }
    carrier = null;
    carriedLevel = 0;
  }

  return {
    update: () => {
      const held = inBloodCastle(world.mapIndex) ? bloodCastleQuestItem() : null;

      if (!held) {
        if (carrier) take(carrier);
        return;
      }

      const owner = world.getByNetId(held.ownerId) ?? null;

      if (owner === carrier && held.level === carriedLevel) return;
      if (carrier && carrier !== owner) take(carrier);

      // Not in scope yet, or not a player rig: nothing to hang it on. The
      // state stays, so it lands as soon as the carrier walks into view.
      if (!owner?.playerAnimation || !owner.modelObject?.Ready) return;

      carrier = owner;
      carriedLevel = held.level;
      void (owner.modelObject as PlayerObject).setQuestItemAsync(held.level);
    },
  };
};
