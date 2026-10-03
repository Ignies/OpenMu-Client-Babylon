import type { Entity, Item } from '../ecs/world';
import { BaseClass, getBaseClass } from './characterStats';
import { inChaosCastle } from './locomotion';
import type { Hands } from './weaponClass';

/** `MODEL_SWORD_OF_DESTRUCTION` (MODEL_SWORD + 16). */
const SWORD_OF_DESTRUCTION: Item = { group: 0, num: 16, lvl: 0 };
/** `MODEL_GREAT_REIGN_CROSSBOW` (MODEL_BOW + 19). */
const GREAT_REIGN_CROSSBOW: Item = { group: 4, num: 19, lvl: 0 };
/** `MODEL_LEGENDARY_STAFF` (MODEL_STAFF + 5). */
const LEGENDARY_STAFF: Item = { group: 5, num: 5, lvl: 0 };

type Character = Pick<Entity, 'charAppearance' | 'skin' | 'npcType'>;

/** The equipment slots a character is drawn wearing. */
export type Gear = Pick<
  NonNullable<Entity['charAppearance']>,
  'helm' | 'armor' | 'pants' | 'gloves' | 'boots' | 'leftHand' | 'rightHand'
>;

/**
 * Inside Chaos Castle every player is drawn in the castle's participant skin
 * instead of their equipment. Players only, and not one already in a
 * transformation skin: the original keeps that body there too (`!c->Change`).
 */
export function wearsChaosCastleSkin(e: Character, mapIndex: number): boolean {
  return inChaosCastle(mapIndex) && !e.skin && e.npcType === undefined;
}

/**
 * The weapons `ChangeChaosCastleUnit` puts in every player's hands inside
 * Chaos Castle, in place of their own (CSChaosCastle.cpp:130-170): a Sword of
 * Destruction in each hand for knights, gladiators, lords and fighters, the
 * Great Reign Crossbow for elves, the Legendary Staff for wizards and
 * summoners. All +0, nothing excellent.
 */
export function chaosCastleHands(baseClass: BaseClass): Hands {
  switch (baseClass) {
    case BaseClass.Elf:
      return { leftHand: GREAT_REIGN_CROSSBOW, rightHand: null };
    case BaseClass.Wizard:
    case BaseClass.Summoner:
      return { leftHand: LEGENDARY_STAFF, rightHand: null };
    default:
      return {
        leftHand: SWORD_OF_DESTRUCTION,
        rightHand: SWORD_OF_DESTRUCTION,
      };
  }
}

/**
 * `c->Weapon`: what a character is drawn, posed and lit holding. Its own
 * weapons, except inside Chaos Castle. How far it reaches and the ammo it
 * carries stay its own: the original reads those off the inventory.
 */
export function heldWeapons(e: Character, mapIndex: number): Hands | undefined {
  const app = e.charAppearance;
  if (!app || !wearsChaosCastleSkin(e, mapIndex)) return app;
  return chaosCastleHands(getBaseClass(app.charClass));
}

/**
 * The gear a character shows, and so the gear its item glow comes off: its
 * own, or inside Chaos Castle the castle's weapons and no armour at all. The
 * skin is drawn at the level of the bare head (`RenderPartObject(MODEL_ANGEL,
 * &c->BodyPart[BODYPART_HEAD])`, ZzzCharacter.cpp:9566).
 */
export function shownGear(e: Character, mapIndex: number): Gear | undefined {
  const app = e.charAppearance;
  if (!app || !wearsChaosCastleSkin(e, mapIndex)) return app;
  return {
    ...chaosCastleHands(getBaseClass(app.charClass)),
    helm: null,
    armor: null,
    pants: null,
    gloves: null,
    boots: null,
  };
}
