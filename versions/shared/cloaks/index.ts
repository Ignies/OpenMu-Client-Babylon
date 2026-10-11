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

const WHITE: Rgb = [1, 1, 1];

/** The Dark Lord's cloths (ZzzCharacter.cpp:9693-9776, drawn by :9926-9942): 2 the cape, 4 and 5 the Mantle's straps. */
function darkLord(w: CloakWearer, out: (ClothSpec | null)[]): void {
  const mantle = isMantleOfMonarch(w.wing);
  out[2] = mantle ? MANTLE_OF_MONARCH_CLOTH : isCapeOfLord(w.wing) ? CAPE_OF_LORD_CLOTH : null;
  if (mantle) {
    out[4] = MANTLE_OF_MONARCH_STRAPS[0];
    out[5] = MANTLE_OF_MONARCH_STRAPS[1];
  }
}

/**
 * `bCloak` (ZzzCharacter.cpp:9162-9186): the Magic Gladiator (the class itself, `c->Class == CLASS_DARK`),
 * every Dark Lord and Rage Fighter, never inside Chaos Castle.
 */
export function cloaks(w: CloakWearer, out: (ClothSpec | null)[]): Rgb {
  const base = getBaseClass(w.charClass);
  const cloak = (w.charClass === CharacterClassNumber.MagicGladiator || base === BaseClass.DarkLord || base === BaseClass.RageFighter) && !w.chaosCastle;
  if (cloak && base === BaseClass.DarkLord) darkLord(w, out);
  return WHITE;
}

registerCloaks(cloaks);
