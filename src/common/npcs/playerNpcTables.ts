import type { Item } from '../../ecs/world';
import {
  GROUP_BOW,
  GROUP_MACE,
  GROUP_SHIELD,
  GROUP_STAFF,
  GROUP_SWORD,
} from '../weaponClass';
import { CharacterClassNumber, PlayerClass } from '../types';
import type { NpcGear } from './gearedNpc';

/** `c->Helper` / `c->Weapon[]` kits, by items.json (group, index). */
const ARROWS: Item = { group: GROUP_BOW, num: 15 };
const BOLT: Item = { group: GROUP_BOW, num: 7 };
const CELESTIAL_BOW: Item = { group: GROUP_BOW, num: 17 };
const DARK_HORSE: Item = { group: 13, num: 4 };
const DEMONIC_STICK: Item = { group: GROUP_STAFF, num: 18 };
const DOUBLE_BLADE: Item = { group: GROUP_SWORD, num: 13 };
const DRAGON_SHIELD: Item = { group: GROUP_SHIELD, num: 13 };
const DRAGON_SOUL_STAFF: Item = { group: GROUP_STAFF, num: 9 };
const GRAND_SOUL_SHIELD: Item = { group: GROUP_SHIELD, num: 15 };
const GREAT_SCEPTER: Item = { group: GROUP_MACE, num: 10 };
const LIGHT_CROSSBOW: Item = { group: GROUP_BOW, num: 11 };
const RUNE_BLADE: Item = { group: GROUP_SWORD, num: 31 };
const SPIKED_SHIELD: Item = { group: GROUP_SHIELD, num: 7 };
const SWORD_OF_DESTRUCTION: Item = { group: GROUP_SWORD, num: 16 };

/** Armour sets by items.json index, named as the original's `MODEL_*` are. */
const DARK_STEEL = 27;
const DRAGON = 1;
const GRAND_SOUL = 18;
const PLATE = 9;
const RED_WING = 40;
const SPIRIT = 13;
const STORM_CROW = 15;

/**
 * NPCs the original builds as `MODEL_PLAYER` plus a fixed `c->BodyPart[]` /
 * `c->Weapon[]` kit. Sources: GMHuntingGround.cpp:279-298 (297),
 * ZzzCharacter.cpp:14478-14495 (464) and GMDoppelGanger1.cpp:91-163 (534-539).
 */
export const GEARED_NPC_TABLE: Readonly<Record<number, NpcGear>> = {
  // PK Dark Knight. `Skin = 1` and `PK = PVP_MURDERER2` (the red name) are
  // not modelled — neither changes the mesh.
  297: {
    charClass: CharacterClassNumber.DarkKnight,
    playerClass: PlayerClass.DarkKnight,
    set: DRAGON,
    level: 9,
    mainHand: SWORD_OF_DESTRUCTION,
    offHand: DRAGON_SHIELD,
  },
  464: {
    charClass: CharacterClassNumber.DarkKnight,
    playerClass: PlayerClass.DarkKnight,
    set: PLATE,
    mainHand: LIGHT_CROSSBOW,
    offHand: BOLT,
  },
  534: {
    charClass: CharacterClassNumber.FairyElf,
    playerClass: PlayerClass.FairyElf,
    set: SPIRIT,
    mainHand: ARROWS,
    offHand: CELESTIAL_BOW,
    scale: 1.0,
  },
  535: {
    charClass: CharacterClassNumber.DarkKnight,
    playerClass: PlayerClass.DarkKnight,
    set: DRAGON,
    mainHand: DOUBLE_BLADE,
    scale: 1.0,
  },
  536: {
    charClass: CharacterClassNumber.DarkWizard,
    playerClass: PlayerClass.DarkWizard,
    set: GRAND_SOUL,
    mainHand: DRAGON_SOUL_STAFF,
    offHand: GRAND_SOUL_SHIELD,
    scale: 1.0,
  },
  // The Magic Gladiator's helm is `MODEL_BODY_HELM + 15` — the Storm Crow set
  // ships no helm item, so items.json has no group-7 row 15 to name and the
  // part is left off.
  537: {
    charClass: CharacterClassNumber.MagicGladiator,
    playerClass: PlayerClass.MagicGladiator,
    set: STORM_CROW,
    noHelm: true,
    mainHand: RUNE_BLADE,
    scale: 1.0,
  },
  538: {
    charClass: CharacterClassNumber.DarkLord,
    playerClass: PlayerClass.DarkLord,
    set: DARK_STEEL,
    mainHand: GREAT_SCEPTER,
    offHand: SPIKED_SHIELD,
    pet: DARK_HORSE,
    scale: 1.0,
  },
  539: {
    charClass: CharacterClassNumber.Summoner,
    playerClass: PlayerClass.Summoner,
    set: RED_WING,
    mainHand: DEMONIC_STICK,
    scale: 1.0,
  },
};

/**
 * NPCs the original builds as `MODEL_PLAYER` with `c->Object.SubType` set to a
 * whole-body part file. Sources: ZzzCharacter.cpp:13954-13977 (372-378),
 * :14503-14515 (503, 548) and w_CursedTemple.cpp:255-270 (404, 405). Model
 * paths from ZzzOpenData.cpp:3936-3989 and Event.cpp:116.
 */
export const TRANSFORMED_NPC_TABLE: Readonly<
  Record<number, readonly [dir: string, part: string, scale: number]>
> = {
  // MODEL_SKELETON_PCBANG loads Skill\Skeleton with index 3 — the same part
  // file the Elite Skeleton wears.
  372: ['Skill/', 'Skeleton03.glb', 0.95],
  373: ['Skill/', 'jack.glb', 0.95],
  374: ['Skill/', 'santa.glb', 0.85],
  378: ['Skill/', 'youngza.glb', 1.0],
  404: ['Skill/', 'unitedsoldier.glb', 1.0],
  405: ['Skill/', 'illusionist.glb', 1.0],
  503: ['Item/', 'panda.glb', 1.0],
  548: ['Item/', 'trans_skeleton.glb', 1.0],
};
