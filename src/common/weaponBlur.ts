import { PlayerAction } from './objects/enum';
import type { Item } from '../ecs/world';
import { LEFT_HAND_BONE, RIGHT_HAND_BONE } from './weaponAttachment';
import { GROUP_MACE, GROUP_SHIELD, GROUP_SPEAR, GROUP_SWORD } from './weaponClass';
import type { EffectBlend, PointSource, RGB } from '../effects/core';
import type { SpriteOptions } from '../effects/sprite';
import { TEX } from '../effects/recipes';

/**
 * `CreateWeaponBlur` (ZzzCharacter.cpp:3766-4042) as a table: which swing
 * clips, with which weapon in hand, leave a trail, where along the blade it
 * is drawn, which sheet and which colour. The **consumer** is
 * `ecs/systems/weaponTrailSystem.ts`, which asks once per clip start and
 * spawns `effects.spawn('blur', …)` on the weapon's hand bone; the drawing
 * is `effects/blur.ts`.
 *
 * The original's two knobs are `BlurType` (where on the blade: the hilt
 * sample `Pos1` and the tip `Pos2`, centimetres down the link bone's Y) and
 * `BlurMapping` (which `BITMAP_BLUR + n` sheet; 0 also picks the colour from
 * the weapon's level). `RenderBlurs` (ZzzEffectBlurSpark.cpp:173) draws a
 * levelled owner's trail with `EnableAlphaBlendMinus` - a dark smear - and
 * only a level-0 owner's additively.
 */

// ---- units -------------------------------------------------------------------

/** Centimetres → tiles. */
const cm = (n: number): number => n / 100;

// ---- BlurType: the two samples down the link bone (`Pos1` / `Pos2`) ------------

type BlurType = 1 | 2 | 3 | 4 | 5;

/** `[hilt, tip]` in tiles along the bone's −Y, per BlurType (:3815-3831). */
const BLADE_SAMPLES: Readonly<Record<BlurType, readonly [number, number]>> = {
  1: [cm(20), cm(120)],
  2: [cm(80), cm(120)],
  3: [cm(100), cm(120)],
  4: [cm(0), cm(200)],
  5: [cm(0), cm(20)],
};

// ---- BlurMapping: sheet + colour ----------------------------------------------

/** `BITMAP_BLUR + mapping` (RenderBlurs: 3 → BLUR2, 4 → BLUR, 5 → BLUR+3). */
const MAPPING_SHEET: Readonly<Record<number, string>> = {
  0: TEX.blur,
  1: TEX.motionBlur,
  2: TEX.motionBlurR,
  3: TEX.blur2,
  4: TEX.blur,
  5: TEX.motionMono,
  6: TEX.motionBlurR3,
};

/** Mapping 0 tints by the weapon's level (:3844-3861); every other mapping is white. */
const LEVEL_COLOURS: readonly (readonly [number, RGB])[] = [
  [7, [1, 0.6, 0.2]],
  [5, [0.2, 0.4, 1]],
  [3, [1, 0.2, 0.2]],
  [0, [0.8, 0.8, 0.8]],
];
const WHITE: RGB = [1, 1, 1];

/** `o->AnimationFrame >= 3.f`: the trail starts three keys into the swing. */
const START_KEY = 3;

/** Blow of Destruction trails between keys 2 and 8 (:3816) inside the `>= 3` gate (:3767), so 3 to 8. */
const BLOW_KEYS: readonly [number, number] = [3, 8];

// ---- the row -------------------------------------------------------------------

export type WeaponBlurRow = {
  /** MU bone index the weapon hangs from (`Weapon[Hand].LinkBone`). */
  bone: number;
  /** Tiles down the bone's −Y for the hilt and the tip samples. */
  hilt: number;
  tip: number;
  texture: string;
  colour: RGB;
  blend: EffectBlend;
  /** Keys into the clip at which sampling starts / must stop. */
  startKey: number;
  endKey: number;
};

export type Hands = { leftHand: Item | null; rightHand: Item | null } | undefined;

const A = PlayerAction;

function isMelee(item: Item | null | undefined): item is Item {
  return !!item && item.group < GROUP_SHIELD;
}

const inRange = (a: number, lo: number, hi: number): boolean => a >= lo && a <= hi;

/** `(group, num)` → `MODEL_ITEM + group * 512 + num` for the table's item tests. */
const itemKey = (group: number, num: number): number => group * 512 + num;
const keyOf = (item: Item | null | undefined): number => (item ? itemKey(item.group, item.num) : -1);

const LIGHTNING_SWORD = itemKey(GROUP_SWORD, 14);
const DARK_REIGN_BLADE = itemKey(GROUP_SWORD, 21);
const RUNE_BLADE = itemKey(GROUP_SWORD, 31);
const DARK_BREAKER = itemKey(GROUP_SWORD, 17);
const SWORD_DANCER = itemKey(GROUP_SWORD, 25);
const CRYSTAL_SWORD = itemKey(GROUP_MACE, 5);
const DRAGON_SPEAR = itemKey(GROUP_SPEAR, 10);

/** Double Blade, Chaos Dragon Axe, Bill of Balrog: Light (1,0.2,0.2) over any mapping (:3950-3953). */
const RED_TRAIL = new Set([itemKey(GROUP_SWORD, 13), itemKey(GROUP_MACE, 6), itemKey(GROUP_SPEAR, 9)]);
const RED: RGB = [1, 0.2, 0.2];

/**
 * Katana, Gladius, Sword of Salamander, Legendary Sword, Serpent Spear: a player holding one takes
 * the one-sample CreateBlur (:3982-3989), which MoveBlurs empties before the frame is drawn (one
 * sample in, one out a tick), so the original shows no trail for them.
 */
const NO_TRAIL = new Set([
  itemKey(GROUP_SWORD, 3),
  itemKey(GROUP_SWORD, 6),
  itemKey(GROUP_SWORD, 9),
  itemKey(GROUP_SWORD, 11),
  itemKey(GROUP_SPEAR, 4),
]);

/**
 * The trail this swing clip leaves with these hands, or null for none. `Hand`
 * 0 is the main-hand slot (`leftHand` bytes → `Weapon1` → the right-hand
 * bone); the `SWORD_LEFT` clips swing the other one. `hasLevel` is the
 * owner's `c->Level != 0`, which for a player is the murderer flag
 * (`PK >= PVP_MURDERER2`, WSclient.cpp:3099-3100, :7094-7097): a murderer's
 * trail darkens, everyone else's glows.
 */
export function weaponBlurFor(
  hands: Hands,
  action: PlayerAction,
  hasLevel: boolean
): WeaponBlurRow | null {
  // `if (c->Weapon[0].Type != -1 || c->Weapon[1].Type != -1)`: bare hands leave nothing.
  if (!isMelee(hands?.leftHand) && !isMelee(hands?.rightHand)) return null;

  const leftClip =
    action === A.PLAYER_ATTACK_SWORD_LEFT1 || action === A.PLAYER_ATTACK_SWORD_LEFT2;
  const weapon = leftClip ? hands?.rightHand : hands?.leftHand;
  const group = weapon?.group ?? -1;
  const type = keyOf(weapon);
  const level = weapon?.lvl ?? 0;

  let blurType = 0;
  let mapping = 0;
  let startKey = START_KEY;
  let endKey = Infinity;

  if (action === A.PLAYER_ATTACK_ONE_FLASH || action === A.PLAYER_ATTACK_RUSH) {
    blurType = 1;
    mapping = 2;
  } else if (inRange(action, A.PLAYER_ATTACK_SKILL_SWORD1, A.PLAYER_ATTACK_SKILL_SWORD4)) {
    // SWORD1 (Falling Slash) is sven's fix; the rest is the original's (:3793-3802).
    blurType = 1;
    mapping = type === LIGHTNING_SWORD || type === DARK_REIGN_BLADE || type === RUNE_BLADE ? 1 : 2;
  } else if (action === A.PLAYER_ATTACK_STRIKE) {
    blurType = 1;
    mapping = 2;
  } else if (inRange(action, A.PLAYER_SKILL_LIGHTNING_ORB, A.PLAYER_SKILL_LIGHTNING_ORB_FENRIR)) {
    blurType = 1;
    mapping = 1;
  } else if (action === A.PLAYER_SKILL_BLOW_OF_DESTRUCTION) {
    blurType = 1;
    mapping = 2;
    [startKey, endKey] = BLOW_KEYS;
  } else if (action === A.PLAYER_ATTACK_SKILL_SWORD5) {
    blurType = 1;
    mapping = type === CRYSTAL_SWORD ? 1 : 2;
  } else if (group === GROUP_SWORD) {
    const twoHandTwo = action === A.PLAYER_ATTACK_TWO_HAND_SWORD_TWO;
    if (
      inRange(action, A.PLAYER_ATTACK_SWORD_RIGHT1, A.PLAYER_ATTACK_TWO_HAND_SWORD3) ||
      twoHandTwo
    ) {
      blurType = 1;
      if (type === DARK_BREAKER) mapping = 6;
      else if (action === A.PLAYER_ATTACK_TWO_HAND_SWORD3 || twoHandTwo) mapping = type === SWORD_DANCER ? 2 : 1;
      // The "TWO" clip trails from its first key (:3767-3769).
      if (twoHandTwo) startKey = 0;
    }
  } else if (group === GROUP_SPEAR) {
    // The axe / mace branch (:3850-3857) only tests SKILL_SWORD1..5, which the branches above took.
    if (inRange(action, A.PLAYER_ATTACK_SPEAR1, A.PLAYER_ATTACK_SCYTHE3)) {
      blurType = 3;
      if (type === DRAGON_SPEAR) {
        blurType = 1;
        mapping = 0;
      } else if (action === A.PLAYER_ATTACK_SCYTHE3) mapping = 1;
    }
  }
  if (blurType === 0 || NO_TRAIL.has(type)) return null;

  const [hilt, tip] = BLADE_SAMPLES[blurType as BlurType];
  const colour = RED_TRAIL.has(type)
    ? RED
    : mapping === 0
      ? LEVEL_COLOURS.find(([min]) => level >= min)![1]
      : WHITE;
  return {
    bone: leftClip ? LEFT_HAND_BONE : RIGHT_HAND_BONE,
    hilt,
    tip,
    texture: MAPPING_SHEET[mapping] ?? TEX.blur,
    colour,
    // RenderBlurs: additive for a level-0 owner, except BITMAP_BLUR+4, which always subtracts.
    blend: hasLevel || mapping === 4 ? 'subtract' : 'add',
    startKey,
    endKey,
  };
}

// ---- the warrior cast glint ----------------------------------------------------

/**
 * Skills the hero casts through UseSkillWarrior (SkillWarrior's list and the weapon skills,
 * SkillCast.cpp:113-247, ZzzInterface.cpp:1320-1352), less the ones it gives no glint (Force,
 * Force Wave, Fire Burst, Space Split, Fire Scream, :357-373). Master ids ride with their base,
 * 339 / 342 (OpenMU's Death Stab ranks, no sven constant) included.
 */
const WARRIOR_GLINT_SKILLS: ReadonlySet<number> = new Set([
  19, 20, 21, 22, 23, 41, 43, 44, 49, 55, 57, 326, 327, 328, 329, 330, 332, 336, 339, 342, 479, 481, 490,
]);
/** Impale goes through SkillWarrior only from a mount (SkillCast.cpp:130). */
const IMPALE = 47;

export function hasWarriorGlint(skill: number, mounted: boolean): boolean {
  return WARRIOR_GLINT_SKILLS.has(skill) || (skill === IMPALE && mounted);
}

/** The hand bone the glint rides: HandPosition's `Hero->Weapon[0].LinkBone`. */
export const WARRIOR_GLINT_BONE = RIGHT_HAND_BONE;
/** 120 cm down the link bone: the blade tip (HandPosition, ZzzEffectParticle.cpp:35-37). */
export const WARRIOR_GLINT_TIP = cm(120);

/**
 * BITMAP_SHINY+2 (Shiny03, 128x16, additive) at the blade tip: LT 18, Scale sin(LT*10 deg)*3,
 * Light (1,1,1), no fade (ZzzEffectParticle.cpp:2690-2692, :7322-7324); the card is
 * 128 x 16 cm per unit of Scale (RenderParticles, :8996-8997).
 */
export function warriorGlint(follow: PointSource): SpriteOptions {
  return {
    texture: TEX.shiny3,
    colour: WHITE,
    size: cm(128) * 3,
    aspect: 16 / 128,
    sizeAt: p => Math.sin(Math.PI * p),
    seconds: 18 / 25,
    fadeTail: 0.01,
    follow,
  };
}

/** Graded tiers: a soft star on the glint's centre riding the same Scale curve, so the bar has a hot point. */
export function warriorGlintStar(follow: PointSource): SpriteOptions {
  return {
    texture: TEX.flare,
    colour: [0.7, 0.75, 0.85],
    size: 0.7,
    sizeAt: p => Math.sin(Math.PI * p),
    seconds: 18 / 25,
    fadeTail: 0.3,
    follow,
  };
}
