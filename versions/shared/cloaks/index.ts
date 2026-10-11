import { registerCloaks, type CloakSet, type CloakWearer } from '@/controllers/actors/cloaks';
import type { Rgb } from '@/controllers/cloth';
import { BaseClass, CharacterClassNumber, getBaseClass } from '@/core/types';
import {
  CAPE_OF_LORD_CLOTH,
  MANTLE_OF_MONARCH_CLOTH,
  MANTLE_OF_MONARCH_STRAPS,
  isCapeOfLord,
  isMantleOfMonarch,
} from './cape_of_lord';
import { robeFor } from './robe';
import { tearsSet } from './delete_cloth';
import { DARK_LORD_HAIR } from './dark_lord_hair';
import { DARK_LORD_SKIRT, DARK_LORD_SKIRT_BUILT, LORD_EMPEROR_SKIRT, LORD_EMPEROR_SKIRT_BUILT } from './dark_lord_skirt';
import { teamLight } from './team_cloak';
import { DEATH_KING, DEATH_KING_ROBE, NIGHTMARE, NIGHTMARE_ROBE, isDoppelganger } from './monster_robes';
import { CAPE_OF_FIGHTER_CLOTH, CAPE_OF_OVERRULE_CLOTH, CAPE_OF_OVERRULE_STRAPS, isCapeOfFighter, isCapeOfOverrule } from './cape_of_fighter';

const WHITE: Rgb = [1, 1, 1];

/** The Illusion Temple's two bodies (`MODEL_CURSEDTEMPLE_*_PLAYER`): every cloth skipped (:9958-9961). */
const TEMPLE_BODIES: ReadonlySet<string> = new Set(['illusionist.glb', 'unitedsoldier.glb']);
/** The skeleton rings' bodies, the only rig skins `CheckDarkCloak` leaves the robe on (ChangeRingManager.cpp:31-49). */
const SKELETON_BODY = /^Skeleton0[123]\.glb$/;

/** The Dark Lord's own body under no armour (`MODEL_BODY_ARMOR + SKIN_CLASS_DARK_LORD` / `_LORDEMPEROR`), else null. */
function ownBody(w: CloakWearer): 'lord' | 'emperor' | null {
  if (w.armor !== null) return null;
  return w.charClass === CharacterClassNumber.LordEmperor ? 'emperor' : 'lord';
}

/**
 * The Dark Lord's set (ZzzCharacter.cpp:9693-9776): 0 and 1 the hair, 2 the cape (built whatever the wing),
 * 3 the skirt over his own body, 4 and 5 the Mantle's straps; 6 cloths under the Mantle, else 3.
 */
function buildDarkLord(w: CloakWearer, set: CloakSet): void {
  const mantle = isMantleOfMonarch(w.wing);
  set.build(0, DARK_LORD_HAIR[0]);
  set.build(1, DARK_LORD_HAIR[1]);
  set.build(2, mantle ? MANTLE_OF_MONARCH_CLOTH : CAPE_OF_LORD_CLOTH);
  const body = ownBody(w);
  if (body !== null) set.build(3, body === 'emperor' ? LORD_EMPEROR_SKIRT_BUILT : DARK_LORD_SKIRT_BUILT);
  if (mantle) {
    set.build(4, MANTLE_OF_MONARCH_STRAPS[0]);
    set.build(5, MANTLE_OF_MONARCH_STRAPS[1]);
  }
  set.count = mantle ? 6 : 3;
}

/**
 * The skirt follows the armour once the set stands (:9852-9920), branch for branch: with 3 cloths it is made
 * again (and counted), with 4 torn off; under the Mantle (6) anything but the Dark Lord's own body tears it.
 */
function followArmour(w: CloakWearer, set: CloakSet): void {
  const body = ownBody(w);
  if (body === null && set.count === 4) {
    set.destroy(3);
    set.count = 3;
  } else if (body !== null && set.count === 3) {
    set.build(3, body === 'emperor' ? LORD_EMPEROR_SKIRT : DARK_LORD_SKIRT);
    set.count = 4;
  } else if (body !== 'lord' && set.count === 6) {
    if (set.has(3)) set.destroy(3);
  } else if (body === 'lord' && set.count === 6 && !set.has(3)) {
    set.build(3, DARK_LORD_SKIRT);
  }
}

/** The Rage Fighter's set (:9777-9824): 0 the cape, 1 and 2 the Overrule's straps. */
function buildRageFighter(w: CloakWearer, set: CloakSet): void {
  const overrule = isCapeOfOverrule(w.wing);
  set.build(0, overrule ? CAPE_OF_OVERRULE_CLOTH : CAPE_OF_FIGHTER_CLOTH);
  if (overrule) {
    set.build(1, CAPE_OF_OVERRULE_STRAPS[0]);
    set.build(2, CAPE_OF_OVERRULE_STRAPS[1]);
  }
  set.count = overrule ? 3 : 1;
}

/**
 * The loop over the set (:9926-9983): the Dark Lord's cape only with a cape or a team colour, his hair and skirt
 * gone under a ring's body (`CheckDarkLordHair`); the Rage Fighter's cape likewise; the Magic Gladiator's robe
 * gone under a ring's body but the skeletons' (`CheckDarkCloak`); nothing in the Illusion Temple's.
 */
function drawSet(w: CloakWearer, base: BaseClass, team: boolean, set: CloakSet): void {
  if (w.skin !== null && TEMPLE_BODIES.has(w.skin)) return;
  const ring = w.skin !== null;
  const darkCloak = w.charClass === CharacterClassNumber.MagicGladiator && w.skin !== null && !SKELETON_BODY.test(w.skin);
  for (let i = 0; i < set.count; i++) {
    if (!set.has(i)) continue;
    if (base === BaseClass.DarkLord) {
      if (i === 2 && !team && !isCapeOfLord(w.wing) && !isMantleOfMonarch(w.wing)) continue;
      if ((i <= 1 || i === 3) && ring) continue;
    }
    if (base === BaseClass.RageFighter && i === 0 && !team && !isCapeOfFighter(w.wing) && !isCapeOfOverrule(w.wing)) continue;
    if (i === 0 && darkCloak) continue;
    set.draw(i);
  }
}

/**
 * `bCloak` (ZzzCharacter.cpp:9162-9246): on the player rig the Magic Gladiator (the class itself,
 * `c->Class == CLASS_DARK`), every Dark Lord and Rage Fighter; the Death King and the Nightmare; never a
 * Doppelganger nor inside Chaos Castle; and any player a team colour puts in one, unless in a monster's body.
 * The set is built once, then only its skirt changes; out of a cloak it stays as it was, undrawn.
 */
export function cloaks(w: CloakWearer, set: CloakSet): Rgb {
  if (tearsSet(w)) set.drop();
  const base = getBaseClass(w.charClass);
  const team = w.monster === null ? teamLight(w) : null;
  const gladiator = w.charClass === CharacterClassNumber.MagicGladiator;
  const byClass = w.rig && (gladiator || base === BaseClass.DarkLord || base === BaseClass.RageFighter);
  const own = (byClass || w.monster === DEATH_KING || w.monster === NIGHTMARE) && !isDoppelganger(w.monster);
  const cloak = (own && !w.chaosCastle) || team !== null;
  if (!cloak) return WHITE;
  if (!set.built) {
    if (base === BaseClass.DarkLord) buildDarkLord(w, set);
    else if (base === BaseClass.RageFighter) buildRageFighter(w, set);
    else {
      // Everyone else (:9825-9846).
      set.build(0, w.monster === DEATH_KING ? DEATH_KING_ROBE : w.monster === NIGHTMARE ? NIGHTMARE_ROBE : robeFor(w.wing));
      set.count = 1;
    }
  } else if (base === BaseClass.DarkLord) {
    followArmour(w, set);
  }
  drawSet(w, base, team !== null, set);
  return team ?? WHITE;
}

registerCloaks(cloaks);
