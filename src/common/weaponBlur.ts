import { PlayerAction } from './objects/enum';
import type { Item } from '../ecs/world';
import { LEFT_HAND_BONE, RIGHT_HAND_BONE } from './weaponAttachment';
import { GROUP_AXE, GROUP_MACE, GROUP_SHIELD, GROUP_SPEAR, GROUP_SWORD } from './weaponClass';
import type { EffectBlend, RGB } from '../effects/core';
import { TEX } from '../effects/recipes';

/**
 * `CreateWeaponBlur` (ZzzCharacter.cpp:3656-3925) as a table: which swing
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
 * levelled owner's trail with `EnableAlphaBlendMinus` — a dark smear — and
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

/** Blow of Destruction only trails between keys 2 and 8 (:3697). */
const BLOW_KEYS: readonly [number, number] = [2, 8];

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

/**
 * The trail this swing clip leaves with these hands, or null for none. `Hand`
 * 0 is the main-hand slot (`leftHand` bytes → `Weapon1` → the right-hand
 * bone); the `SWORD_LEFT` clips swing the other one. `hasLevel` is the
 * owner's `c->Level != 0`: a character's trail darkens, a monster's glows.
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
  const level = weapon?.lvl ?? 0;

  let blurType = 0;
  let mapping = 0;
  let startKey = START_KEY;
  let endKey = Infinity;

  if (action === A.PLAYER_ATTACK_ONE_FLASH || action === A.PLAYER_ATTACK_RUSH) {
    blurType = 1;
    mapping = 2;
  } else if (inRange(action, A.PLAYER_ATTACK_SKILL_SWORD2, A.PLAYER_ATTACK_SKILL_SWORD4)) {
    blurType = 1;
    mapping = 2;
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
    mapping = 2;
  } else if (group === GROUP_SWORD) {
    const twoHandTwo = action === A.PLAYER_ATTACK_TWO_HAND_SWORD_TWO;
    if (
      inRange(action, A.PLAYER_ATTACK_SWORD_RIGHT1, A.PLAYER_ATTACK_TWO_HAND_SWORD3) ||
      twoHandTwo
    ) {
      blurType = 1;
      if (action === A.PLAYER_ATTACK_TWO_HAND_SWORD3 || twoHandTwo) mapping = 1;
      // The "TWO" clip trails from its first key (:3658).
      if (twoHandTwo) startKey = 0;
    }
  } else if (group === GROUP_AXE || group === GROUP_MACE) {
    if (inRange(action, A.PLAYER_ATTACK_SKILL_SWORD1, A.PLAYER_ATTACK_SKILL_SWORD5)) {
      blurType = 1;
      mapping = 2;
    }
  } else if (group === GROUP_SPEAR) {
    if (inRange(action, A.PLAYER_ATTACK_SPEAR1, A.PLAYER_ATTACK_SCYTHE3)) {
      blurType = 3;
      if (action === A.PLAYER_ATTACK_SCYTHE3) mapping = 1;
    }
  }
  if (blurType === 0) return null;

  const [hilt, tip] = BLADE_SAMPLES[blurType as BlurType];
  const colour = mapping === 0 ? LEVEL_COLOURS.find(([min]) => level >= min)![1] : WHITE;
  return {
    bone: leftClip ? LEFT_HAND_BONE : RIGHT_HAND_BONE,
    hilt,
    tip,
    texture: MAPPING_SHEET[mapping] ?? TEX.blur,
    colour,
    blend: hasLevel ? 'subtract' : 'add',
    startKey,
    endKey,
  };
}
