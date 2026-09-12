import { Matrix } from '../libs/babylon/exports';
import {
  angleMatrix,
  concatTransforms,
  toBabylon,
  type BmdLink,
} from './boneLink';
import { BaseClass, getBaseClass } from './characterStats';
import { PlayerAction } from './objects/enum';
import type { PlayerObject } from './playerObject';
import type { CharacterClassNumber } from './types';
import type { Item } from '../ecs/world';
import {
  GROUP_BOW,
  GROUP_SWORD,
  isAmmo,
  isBackItem,
  isCrossbow,
  isShield,
  isWeaponItem,
  type Hands,
} from './weaponClass';

/** Player skeleton bones (ZzzCharacter.cpp:11849-11850, :15033). */
export const RIGHT_HAND_BONE = 33; // bone_33_knife_gdf
export const LEFT_HAND_BONE = 42; // bone_42_hand_bofdgne01
export const BACK_BONE = 47; // bone_47_Bone05

/**
 * How the original places weapons (RenderLinkObject, ZzzCharacter.cpp:6439-6760):
 *
 *  - In the hands: called with Link=false (:9961) — the weapon frame *is* the
 *    hand bone frame, no matrix at all.
 *  - On the back (RenderCharacterBackItem :14953, bone 47): Link=true with an
 *    explicit matrix in BMD bone space — AngleMatrix(70,0,90) and a per-type
 *    offset (weapons (-20,5,40), bows (-10,5,10), shields (-10,0,0), cm) —
 *    and for left-hand items an extra AngleMatrix(145,0,275)+(0,10,-30)
 *    concatenated on the inside (:6740-6752).
 *
 * The GLB keeps every bone node in BMD model space (the loader's basis change
 * only touches the model root), so the link matrix is used as-is in bone
 * space; ModelObject.Update undoes the item root's own basis change
 * underneath it. The 3x4 maths below is a literal port of ZzzMathLib.cpp,
 * *including* the fact that the left-item flip is concatenated in place
 * (`R_ConcatTransforms(Matrix, mNewRot, Matrix)`): `out` aliases `in1`, so
 * later elements read already-overwritten ones (see boneLink.ts). The result
 * is a sheared,
 * non-orthogonal matrix ~64 cm away from the clean product — and that is what
 * the original renders and what its constants were tuned against. A clean
 * multiply puts the secondary item a tile away from the character.
 *
 * Debug overrides (dev only, URL query): `?backRot=70,0,90` (deg, BMD space),
 * `?backOff=-20,5,40` (cm, BMD space).
 */
const BACK_WEAPON: BmdLink = { angle: [70, 0, 90], offset: [-20, 5, 40] };
/** The whole bow group falls here (:6672-6677) — ammo included. */
const BACK_BOW: BmdLink = { angle: [70, 0, 90], offset: [-10, 5, 10] };
/** Crossbows branch before everything else (:6543-6551). */
const BACK_CROSSBOW: BmdLink = { angle: [0, 20, 180], offset: [-10, 8, 40] };
const BACK_SHIELD: BmdLink = { angle: [70, 0, 90], offset: [-10, 0, 0] };
const LEFT_ITEM_FLIP: BmdLink = { angle: [145, 0, 275], offset: [0, 10, -30] };
/** Rage Fighter common weapons flip at 265° with an extra +7 Y (:6743-6747). */
const LEFT_ITEM_FLIP_RAGE: BmdLink = {
  angle: [145, 0, 265],
  offset: [0, 10, -30],
};

/**
 * Per-model back links (`RenderLinkObject` :6636-6722), keyed `group:num`.
 * These win over the group defaults; crossbows never reach them.
 */
const BACK_SPECIALS = new Map<string, BmdLink>([
  ['4:20', { angle: [-60, 0, -80], offset: [-5, 20, 0] }], // Arrow Viper Bow
  ['4:23', { angle: [-60, 0, -80], offset: [-5, 20, -5] }], // Stinger Bow
  ['4:24', { angle: [90, 0, -80], offset: [10, 20, -5] }], // Air Lyn Bow
  ['5:8', { angle: [70, 0, 90], offset: [-10, 5, 10] }], // Staff of Destruction
  ['5:9', { angle: [110, 180, 90], offset: [-10, 5, -10] }], // Dragon Soul Staff
  ['6:6', { angle: [30, 0, 90], offset: [-15, 0, -25] }], // Skull Shield
  ['6:14', { angle: [50, 0, 90], offset: [-28, 0, -25] }], // Legendary Shield
  ['6:15', { angle: [50, 0, 90], offset: [-28, 0, -25] }], // Grand Soul Shield
  ['6:16', { angle: [30, 0, 90], offset: [-20, 0, -20] }], // Elemental Shield
]);

const ARROW_VIPER_BOW = 20;
const STINGER_BOW = 23;

/**
 * `IsRagefighterCommonWeapon` (MonkSystem.cpp:209): the low-tier
 * sword/axe/mace models a Rage Fighter carries on custom offsets.
 */
const RAGE_FIGHTER_COMMON = new Set([
  '0:0', // Kris
  '0:1', // Short Sword
  '1:0', // Small Axe
  '1:1', // Hand Axe
  '1:3', // Tomahawk
  '2:0', // Small Mace
  '2:1', // Morning Star
  '2:2', // Flail
  '2:3', // Great Hammer
  '2:4', // Crystal Morning Star
]);

function readQuery(name: string): string | null {
  try {
    return new URLSearchParams(location.search).get(name);
  } catch {
    return null;
  }
}

function queryTriple(name: string): [number, number, number] | null {
  const v = readQuery(name);
  if (!v) return null;
  const parts = v.split(',').map(Number);
  return parts.length === 3 && parts.every(n => !isNaN(n))
    ? (parts as [number, number, number])
    : null;
}

function withOverrides(link: BmdLink): BmdLink {
  return {
    angle: queryTriple('backRot') ?? link.angle,
    offset: queryTriple('backOff') ?? link.offset,
  };
}

/** The link matrix `RenderLinkObject` builds for a back-bound item (:6543-6757). */
function backLink(
  item: { group: number; num: number },
  leftItem: boolean,
  rageCommon: boolean
): Matrix {
  const key = `${item.group}:${item.num}`;
  const base = isCrossbow(item)
    ? BACK_CROSSBOW
    : (BACK_SPECIALS.get(key) ??
      (item.group === GROUP_BOW
        ? BACK_BOW
        : isShield(item)
          ? BACK_SHIELD
          : BACK_WEAPON));
  const matrix = angleMatrix(withOverrides(base));

  // Rage Fighter common weapons sit lower on the back (:6731-6736).
  if (rageCommon) {
    matrix[1][3] += 10;
    matrix[2][3] += 25;
  }

  // `bRightHandItem == false`, not a shield, not the Arrow Viper Bow (:6738):
  // R_ConcatTransforms(Matrix, mNewRot, Matrix)
  if (
    leftItem &&
    !isShield(item) &&
    !(item.group === GROUP_BOW && item.num === ARROW_VIPER_BOW)
  ) {
    if (rageCommon) matrix[1][3] += 7;
    const flip = rageCommon ? LEFT_ITEM_FLIP_RAGE : LEFT_ITEM_FLIP;
    // `?backShear=clean` A/B (dev): a non-aliased multiply instead of the
    // original's in-place concat, to compare against its sheared result.
    if (readQuery('backShear') === 'clean') {
      const copy = matrix.map(row => [...row]) as typeof matrix;
      concatTransforms(copy, angleMatrix(flip), matrix);
    } else {
      concatTransforms(matrix, angleMatrix(flip), matrix);
    }
  }

  // b->BodyScale = 0.9 (:6735) scales the model about its own origin, which
  // lands innermost of every link transform: fold it into the basis columns.
  if (rageCommon) {
    for (let r = 0; r < 3; r++) {
      matrix[r][0] *= 0.9;
      matrix[r][1] *= 0.9;
      matrix[r][2] *= 0.9;
    }
  }

  return toBabylon(matrix);
}

/**
 * `RenderCharacterBackItem`'s stowed-part animation (:15044-15065): every
 * back-bound sword…shield item holds frame 0 with PlaySpeed 0; the Stinger
 * Bow is the one exception, looping its clip 2 at 0.25.
 */
function backPose(item: {
  group: number;
  num: number;
}): PartPose {
  return item.group === GROUP_BOW && item.num === STINGER_BOW
    ? { action: 2, speed: 0.25 }
    : { action: 0, speed: 0 };
}

type PartPose = NonNullable<PlayerObject['Weapon1']['PartPose']>;

/** Holds the first frame: `PlaySpeed = 0`, `AnimationFrame = 0.001`. */
const HELD: PartPose = { action: 0, speed: 0 };

/** `PLAYER_STOP_MALE`'s rate, which every animated in-hand item is keyed to. */
const STOP_MALE_SPEED = 0.28;

/**
 * The handful of weapons `RenderCharacterItem` keeps animating in the hand
 * (ZzzCharacter.cpp:9895-9950). Everything else - bows included, which is
 * why an idle archer is not forever drawing the string - holds frame 0.
 * Keyed `group:num`.
 */
const HAND_CLIPS: Readonly<Record<string, PartPose>> = {
  '2:5': { action: 0, speed: STOP_MALE_SPEED * 2 }, // Crystal Sword
  '2:16': { action: 0, speed: STOP_MALE_SPEED }, // Frost Mace
  '2:17': { action: 0, speed: STOP_MALE_SPEED }, // Absolute Scepter
  '5:6': { action: 0, speed: STOP_MALE_SPEED * 15 }, // Staff of Resurrection
  '5:34': { action: 0, speed: STOP_MALE_SPEED }, // Raven Stick
  [`${GROUP_BOW}:${STINGER_BOW}`]: { action: 0, speed: STOP_MALE_SPEED },
};

/** The Flail swings its head: clip 2 under a sword swing, clip 1 at rest. */
const FLAIL = '2:2';

/** The four clips that make a weapon's own bow/crossbow clip run (:9883). */
function isBowDrawAction(action: PlayerAction): boolean {
  return (
    action === PlayerAction.PLAYER_ATTACK_BOW ||
    action === PlayerAction.PLAYER_ATTACK_CROSSBOW ||
    action === PlayerAction.PLAYER_ATTACK_FLY_BOW ||
    action === PlayerAction.PLAYER_ATTACK_FLY_CROSSBOW
  );
}

/**
 * `RenderCharacterItem`'s per-frame `w->CurrentAction` / `w->PlaySpeed`
 * switch (ZzzCharacter.cpp:9881-9955). `playerSpeed` is the rate of the clip
 * the character is playing, which is what the original hands the bow and the
 * Flail while they follow a swing.
 */
function handPose(
  item: { group: number; num: number },
  action: PlayerAction,
  playerSpeed: number
): PartPose {
  const key = `${item.group}:${item.num}`;

  if (isBowDrawAction(action)) {
    // The draw runs for as long as the swing does; a Stinger Bow draws on
    // clip 1 because its idle wobble already owns clip 0.
    const stinger = item.group === GROUP_BOW && item.num === STINGER_BOW;
    return { action: stinger ? 1 : 0, speed: playerSpeed };
  }

  if (key === FLAIL) {
    const swinging =
      action >= PlayerAction.PLAYER_ATTACK_SWORD_RIGHT1 &&
      action <= PlayerAction.PLAYER_ATTACK_SWORD_RIGHT2;
    return swinging
      ? { action: 2, speed: playerSpeed }
      : { action: 1, speed: STOP_MALE_SPEED };
  }

  // The whole sword group keeps its clip 0 running; most of those clips are
  // a single frame, so this only shows on the few swords that have one.
  return HAND_CLIPS[key] ?? (item.group === GROUP_SWORD ? { action: 0, speed: STOP_MALE_SPEED } : HELD);
}

/** True when this slot's item is riding the back rather than the hand. */
function stowed(
  item: Item | null,
  hands: (Hands & { charClass?: CharacterClassNumber }) | undefined,
  bindBack: boolean
): item is Item {
  return !!item && ((bindBack && isBackItem(item, hands)) || isAmmo(item));
}

/**
 * `RenderCharacterBackItem`: when `bindBack` is true every sword…shield item
 * moves to the back bone, ammo is always on the back, everything else stays
 * in the hands. Idempotent; call whenever the appearance or the bind state
 * changes. The clip each part runs is `applyWeaponPoses`, every frame.
 */
export function applyWeaponAttachments(
  player: PlayerObject,
  hands: (Hands & { charClass?: CharacterClassNumber }) | undefined,
  bindBack: boolean
) {
  const main = hands && isWeaponItem(hands.leftHand) ? hands.leftHand : null;
  const off = hands && isWeaponItem(hands.rightHand) ? hands.rightHand : null;
  const rageFighter =
    hands?.charClass !== undefined &&
    getBaseClass(hands.charClass) === BaseClass.RageFighter;
  const rageCommon = (item: { group: number; num: number }) =>
    rageFighter && RAGE_FIGHTER_COMMON.has(`${item.group}:${item.num}`);

  // Slot 0 (appearance "leftHand") → Weapon1 → right hand (bRightHandItem).
  if (stowed(main, hands, bindBack)) {
    player.Weapon1.setBoneLink(BACK_BONE, backLink(main, false, rageCommon(main)));
  } else {
    player.Weapon1.setBoneLink(RIGHT_HAND_BONE);
  }

  // Slot 1 (appearance "rightHand") → Weapon2 → left hand.
  if (stowed(off, hands, bindBack)) {
    player.Weapon2.setBoneLink(BACK_BONE, backLink(off, true, rageCommon(off)));
  } else {
    player.Weapon2.setBoneLink(LEFT_HAND_BONE);
  }
}

/**
 * The clip each weapon part runs this frame: the stowed pose on the back,
 * otherwise `RenderCharacterItem`'s in-hand switch. Cheap to call every
 * frame - an unchanged pose is a no-op.
 */
export function applyWeaponPoses(
  player: PlayerObject,
  hands: (Hands & { charClass?: CharacterClassNumber }) | undefined,
  bindBack: boolean,
  action: PlayerAction,
  playerSpeed: number
) {
  const main = hands && isWeaponItem(hands.leftHand) ? hands.leftHand : null;
  const off = hands && isWeaponItem(hands.rightHand) ? hands.rightHand : null;

  const poseFor = (item: Item | null) => {
    if (!item) return null;
    if (stowed(item, hands, bindBack)) return backPose(item);
    return handPose(item, action, playerSpeed);
  };

  player.Weapon1.setPartPose(poseFor(main));
  player.Weapon2.setPartPose(poseFor(off));
}
