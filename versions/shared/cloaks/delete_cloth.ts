import type { CloakWearer } from '@/controllers/actors/cloaks';
import { CAPE_OF_EMPEROR, CAPE_OF_FIGHTER, CAPE_OF_LORD, CAPE_OF_OVERRULE, HELPER_GROUP, WING_GROUP, WING_OF_RUIN } from '@/controllers/actors/wings';
import type { Item } from '@/ecs/world';

/** The wings whose change deletes the whole set: the Wing of Ruin, the capes and the Mantle (WSclient.cpp:2474-2491). */
function clothWing(wing: Item | null): boolean {
  if (!wing) return false;
  if (wing.group === HELPER_GROUP) return wing.num === CAPE_OF_LORD;
  return wing.group === WING_GROUP && (wing.num === WING_OF_RUIN || wing.num === CAPE_OF_EMPEROR || wing.num === CAPE_OF_FIGHTER || wing.num === CAPE_OF_OVERRULE);
}

/**
 * `DeleteCloth` on a wing change. The hero's inventory tests the item put on and the one taken off
 * (NewUIMyInventory.cpp:1050-1083); another player's equipment packet tests the new wing, or the old one when
 * the slot empties (WSclient.cpp:2474-2491), so a cloth wing swapped straight for a plain one keeps its set.
 */
export function tearsSet(w: CloakWearer): boolean {
  const before = w.wingBefore;
  const now = w.wing;
  if (before?.group === now?.group && before?.num === now?.num) return false;
  if (w.hero) return clothWing(before) || clothWing(now);
  return now === null ? clothWing(before) : clothWing(now);
}
