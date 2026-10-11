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
import { DEATH_KING, DEATH_KING_ROBE, FRED, FRED_CLOTH, NIGHTMARE, NIGHTMARE_ROBE, crustRobe, isDoppelganger } from './monster_robes';
import { MAGIC_SKELETON_CLOTH, isMagicSkeleton } from './magic_skeleton';
import { pantsCloth } from './soul_pants';
import { bodyCloths } from './ring_bodies';
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
 * The pants part's cloth (`RenderPartObject`, ZzzObject.cpp:10608-10680): built once, stepped in the parts' pass
 * and again in the shadow pass (ZzzCharacter.cpp:8605-8612, :9651), never held; other pants drop it with the
 * body's set (`DeleteCloth(NULL, o, p)`). A ring's body draws no part, so nothing happens to it.
 */
function wearPants(w: CloakWearer, pants: CloakSet): void {
  if (w.skin !== null) return;
  const spec = pantsCloth(w.pants);
  if (!spec) {
    if (pants.built) pants.drop();
    return;
  }
  if (!pants.built) {
    pants.build(0, spec);
    pants.count = 1;
  }
  pants.draw(0, false);
  if (w.shadowPass) pants.draw(0, false);
}

/**
 * `bCloak` (ZzzCharacter.cpp:9162-9246): on the player rig the Magic Gladiator (the class itself,
 * `c->Class == CLASS_DARK`), every Dark Lord and Rage Fighter; the Death King and the Nightmare; never a
 * Doppelganger nor inside Chaos Castle; and any player a team colour puts in one, in a monster's body too (his
 * class's cloths on that body's bones). The set is built once, then only its skirt changes; out of a cloak it
 * stays as it was, undrawn.
 */
export function cloaks(w: CloakWearer, set: CloakSet, pants: CloakSet | null): Rgb {
  if (tearsSet(w)) set.drop();
  if (pants) wearPants(w, pants);
  // The cloths a body hangs on itself before bCloak, built once and stepped each frame, stun or not: the Magic
  // Skeletons' (ZzzCharacter.cpp:8512-8533), Fred's (`MODEL_FRED`, ZzzObject.cpp:544-561), the Crusts' (:8818-8837).
  const itsOwn = isMagicSkeleton(w.monster) ? MAGIC_SKELETON_CLOTH : w.monster === FRED ? FRED_CLOTH : crustRobe(w.monster);
  if (itsOwn) {
    if (!set.built) {
      set.build(0, itsOwn);
      set.count = 1;
    }
    set.draw(0, false);
  }
  // A ring's body worn by a player hangs its own (RenderPartObjectBody, ZzzObject.cpp:8149-8417; ZzzCharacter.cpp:9436-9505).
  const body = w.rig && w.monster === null ? bodyCloths(w.skin) : null;
  if (body) {
    if (!set.built) {
      for (let i = 0; i < body.cloths.length; i++) set.build(i, body.cloths[i]);
      set.count = body.cloths.length;
    }
    if (body.drawn) for (let i = 0; i < body.cloths.length; i++) set.draw(i, body.holds);
  }
  const base = getBaseClass(w.charClass);
  const team = teamLight(w);
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
  } else if (base === BaseClass.DarkLord && !w.fading) {
    // A fading body's set is new every frame (DeleteCloth, :3251): it never gets this far.
    followArmour(w, set);
  }
  drawSet(w, base, team !== null, set);
  return team ?? WHITE;
}

registerCloaks(cloaks);
