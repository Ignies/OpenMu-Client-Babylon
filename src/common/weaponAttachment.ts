import { Matrix } from '../libs/babylon/exports';
import {
  angleMatrix,
  concatTransforms,
  toBabylon,
  type BmdLink,
} from './boneLink';
import type { PlayerObject } from './playerObject';
import {
  isAmmo,
  isBackItem,
  isBow,
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
const BACK_BOW: BmdLink = { angle: [70, 0, 90], offset: [-10, 5, 10] };
const BACK_SHIELD: BmdLink = { angle: [70, 0, 90], offset: [-10, 0, 0] };
const LEFT_ITEM_FLIP: BmdLink = { angle: [145, 0, 275], offset: [0, 10, -30] };

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

/** The link matrix `RenderLinkObject` builds for a back-bound item (:6680-6757). */
function backLink(item: { group: number; num: number }, leftItem: boolean): Matrix {
  const base = isShield(item)
    ? BACK_SHIELD
    : isBow(item) || isCrossbow(item)
      ? BACK_BOW
      : BACK_WEAPON;
  const matrix = angleMatrix(withOverrides(base));

  // `bRightHandItem == false && !shield` (:6740): R_ConcatTransforms(Matrix, mNewRot, Matrix)
  if (leftItem && !isShield(item)) {
    concatTransforms(matrix, angleMatrix(LEFT_ITEM_FLIP), matrix);
  }

  return toBabylon(matrix);
}

/**
 * `RenderCharacterBackItem` + the in-hand loop: when `bindBack` is true every
 * sword…shield item moves to the back bone (frozen), ammo is always on the
 * back, everything else stays in the hands. Idempotent; call whenever the
 * appearance or the bind state changes.
 */
export function applyWeaponAttachments(
  player: PlayerObject,
  hands: Hands | undefined,
  bindBack: boolean
) {
  const main = hands && isWeaponItem(hands.leftHand) ? hands.leftHand : null;
  const off = hands && isWeaponItem(hands.rightHand) ? hands.rightHand : null;

  // Slot 0 (appearance "leftHand") → Weapon1 → right hand (bRightHandItem).
  if (main && ((bindBack && isBackItem(main)) || isAmmo(main))) {
    player.Weapon1.setBoneLink(BACK_BONE, backLink(main, false));
  } else {
    player.Weapon1.setBoneLink(RIGHT_HAND_BONE);
  }

  // Slot 1 (appearance "rightHand") → Weapon2 → left hand.
  if (off && ((bindBack && isBackItem(off)) || isAmmo(off))) {
    player.Weapon2.setBoneLink(BACK_BONE, backLink(off, true));
  } else {
    player.Weapon2.setBoneLink(LEFT_HAND_BONE);
  }
}
