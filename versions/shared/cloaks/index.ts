import { registerCloaks, type CloakWearer } from '@/controllers/actors/cloaks';
import type { ClothSpec, Rgb } from '@/controllers/cloth';
import { BaseClass, CharacterClassNumber, getBaseClass } from '@/core/types';
import {
  CAPE_OF_LORD_CLOTH,
  MANTLE_OF_MONARCH_CLOTH,
  MANTLE_OF_MONARCH_STRAPS,
  isCapeOfLord,
  isMantleOfMonarch,
} from './cape_of_lord';
import { robeFor } from './robe';
import { CAPE_OF_FIGHTER_CLOTH, CAPE_OF_OVERRULE_CLOTH, CAPE_OF_OVERRULE_STRAPS, isCapeOfFighter, isCapeOfOverrule } from './cape_of_fighter';

const WHITE: Rgb = [1, 1, 1];

/** The Illusion Temple's two bodies (`MODEL_CURSEDTEMPLE_*_PLAYER`): every cloth skipped (:9958-9961). */
const TEMPLE_BODIES: ReadonlySet<string> = new Set(['illusionist.glb', 'unitedsoldier.glb']);
/** The skeleton rings' bodies, the only rig skins `CheckDarkCloak` leaves the robe on (ChangeRingManager.cpp:31-49). */
const SKELETON_BODY = /^Skeleton0[123]\.glb$/;

/** The Dark Lord's cloths (ZzzCharacter.cpp:9693-9776, drawn by :9926-9942): 2 the cape, 4 and 5 the Mantle's straps. */
function darkLord(w: CloakWearer, out: (ClothSpec | null)[]): void {
  const mantle = isMantleOfMonarch(w.wing);
  out[2] = mantle ? MANTLE_OF_MONARCH_CLOTH : isCapeOfLord(w.wing) ? CAPE_OF_LORD_CLOTH : null;
  if (mantle) {
    out[4] = MANTLE_OF_MONARCH_STRAPS[0];
    out[5] = MANTLE_OF_MONARCH_STRAPS[1];
  }
}

/** The Rage Fighter's cloths (:9777-9824, drawn by :9943-9951): 0 the cape, 1 and 2 the Overrule's straps. */
function rageFighter(w: CloakWearer, out: (ClothSpec | null)[]): void {
  const overrule = isCapeOfOverrule(w.wing);
  out[0] = overrule ? CAPE_OF_OVERRULE_CLOTH : isCapeOfFighter(w.wing) ? CAPE_OF_FIGHTER_CLOTH : null;
  if (overrule) {
    out[1] = CAPE_OF_OVERRULE_STRAPS[0];
    out[2] = CAPE_OF_OVERRULE_STRAPS[1];
  }
}

/**
 * `bCloak` (ZzzCharacter.cpp:9162-9186): the Magic Gladiator (the class itself, `c->Class == CLASS_DARK`),
 * every Dark Lord and Rage Fighter, never inside Chaos Castle.
 */
export function cloaks(w: CloakWearer, out: (ClothSpec | null)[]): Rgb {
  const base = getBaseClass(w.charClass);
  const cloak = (w.charClass === CharacterClassNumber.MagicGladiator || base === BaseClass.DarkLord || base === BaseClass.RageFighter) && !w.chaosCastle;
  if (!cloak || (w.skin !== null && TEMPLE_BODIES.has(w.skin))) return WHITE;
  if (base === BaseClass.DarkLord) darkLord(w, out);
  else if (base === BaseClass.RageFighter) rageFighter(w, out);
  // The rest wear the robe (:9837-9846); a ring's body hides the Magic Gladiator's (CheckDarkCloak, :9953).
  else if (w.skin === null || SKELETON_BODY.test(w.skin)) out[0] = robeFor(w.wing);
  return WHITE;
}

registerCloaks(cloaks);
