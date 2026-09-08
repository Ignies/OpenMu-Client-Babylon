/**
 * How a dropped item lies on the ground: `ItemAngle` / `ItemAngleRF`
 * (ZzzObject.cpp:5338 / :5302) plus the resting height `MoveItems` (:6244)
 * snaps it to.
 *
 * The original's item models are all authored standing (that is the pose the
 * inventory and the hand want), so a drop is only ever "lying" because
 * `ItemAngle` pitches it over — armour rolls face-down at `Angle[0] = 270`,
 * a sword leans back at 60, a crossbow lies flat at 90. Without this every
 * drop stands to attention in the grass.
 *
 * `o->Angle` is MU's Z-up (pitch, roll, yaw); `transform.rot` is
 * `(-Angle[0], Angle[2], -Angle[1])` in radians (see common/renderAngles.ts).
 */

// ---- 1. tuning ---------------------------------------------------------

const DEG = Math.PI / 180;
/** Centimetres per world unit — `MoveItems` works in the original's cm. */
const CM = 1 / 100;

/** `ITEM_GROUP_*`: an item's model is `MODEL_ITEM + group × 512 + num`. */
export enum ItemGroup {
  Sword = 0,
  Axe = 1,
  Mace = 2,
  Spear = 3,
  Bow = 4,
  Staff = 5,
  Shield = 6,
  Helm = 7,
  Armor = 8,
  Pants = 9,
  Gloves = 10,
  Boots = 11,
  Wing = 12,
  Helper = 13,
  Potion = 14,
  Etc = 15,
}

/**
 * `o->Scale` every drop starts at, and the 0.7 band `MODEL_SPEAR` to
 * `MODEL_PLATINA_STAFF` (`ItemObjectAttribute`, ZzzObject.cpp:5151).
 * `ItemAngle` overrides it for a handful of items; everything else keeps this.
 */
const DROP_SCALE = 0.8;
const LONG_WEAPON_SCALE = 0.7;
/** `MODEL_PLATINA_STAFF = MODEL_STAFF + 13`, the last of the 0.7 band. */
const PLATINA_STAFF = 13;

/** `Height = RequestTerrainHeight(...) + 30` for every drop (MoveItems:6250). */
const REST_ABOVE_TERRAIN_CM = 30;
/** `if (Type >= MODEL_SWORD && Type < MODEL_STAFF + MAX_ITEM_INDEX) Height += 40` — a
 *  weapon rests on its guard, not on the model origin. */
const WEAPON_EXTRA_CM = 40;

/** `MODEL_CROSSBOW = MODEL_BOW + 8`, `MODEL_CELESTIAL_BOW = MODEL_BOW + 17`. */
const CROSSBOW_FIRST = 8;
const CROSSBOW_LAST = 16;
/** `MODEL_DIVINE_CB_OF_ARCHANGEL = MODEL_BOW + 18` … `MODEL_ARROW_VIPER_BOW = +20`. */
const DIVINE_CROSSBOW_FIRST = 18;
const DIVINE_CROSSBOW_LAST = 19;
/** Arrow Viper / Sylph Wind / Albatross: bows that keep the upright pose. */
const UPRIGHT_BOWS: ReadonlySet<number> = new Set([20, 21, 22]);
/** `MODEL_MISTERY_HELM = MODEL_HELM + 39` … `MODEL_LILIUM_HELM = +44`. */
const BIG_HELM_FIRST = 39;
const BIG_HELM_LAST = 44;
/** `MODEL_SACRED_HELM = MODEL_HELM + 59`, three of them (ItemAngleRF). */
const SACRED_HELM_FIRST = 59;
const SACRED_HELM_LAST = 61;
/** `MODEL_CAPE_OF_FIGHTER = MODEL_WING + 49`, `MODEL_CAPE_OF_OVERRULE = +50`. */
const CAPE_OF_FIGHTER = 49;
const CAPE_OF_OVERRULE = 50;
/** `MODEL_CHAIN_DRIVE_PARCHMENT = MODEL_ETC + 30` … `+ 36`. */
const PARCHMENT_FIRST = 30;
const PARCHMENT_LAST = 36;
/** `MODEL_DIVINE_SWORD_OF_ARCHANGEL = MODEL_SWORD + 19`: shrunk on the ground. */
const DIVINE_SWORD = 19;

// ---- 2. the pose --------------------------------------------------------

export type ItemRestPose = {
  /** MU `o->Angle`, degrees: (pitch, roll, yaw). */
  readonly angle: readonly [number, number, number];
  /** `o->Scale`: ItemAngle's override where it has one, the base otherwise. */
  readonly scale: number;
};

/** A pose with `scale` left out where the original does not override it. */
type RestPose = {
  readonly angle: readonly [number, number, number];
  readonly scale?: number;
};

/** `Vector(0, 0, -45, o->Angle)`: upright, turned 45° off the map axis. */
const DEFAULT_POSE: RestPose = { angle: [0, 0, -45] };

/**
 * The resting `o->Angle` / `o->Scale` for one item.
 *
 * Covers `ItemAngleRF` and every *structural* branch of `ItemAngle` — the
 * ones that decide whether an item lies down or stands up. `ItemAngle`'s long
 * tail of per-item scale-and-yaw tweaks for event drops (Halloween boxes,
 * Cherry Blossom, the seasonal potions) is not transcribed: those items keep
 * the default pose, which is the pose they already had.
 */
export function itemRestPose(group: number, num: number): ItemRestPose {
  const pose = restPose(group, num);

  return { angle: pose.angle, scale: pose.scale ?? baseScale(group, num) };
}

/** `o->Scale` as `ItemObjectAttribute` leaves it, before `ItemAngle` runs. */
function baseScale(group: number, num: number): number {
  if (group === ItemGroup.Spear || group === ItemGroup.Bow) {
    return LONG_WEAPON_SCALE;
  }
  if (group === ItemGroup.Staff && num <= PLATINA_STAFF) {
    return LONG_WEAPON_SCALE;
  }
  return DROP_SCALE;
}

function restPose(group: number, num: number): RestPose {
  // --- ItemAngleRF first: it returns early in the original.
  if (group === ItemGroup.Wing) {
    if (num === CAPE_OF_FIGHTER) return { angle: [270, 180, 45], scale: 0.7 };
    if (num === CAPE_OF_OVERRULE) return { angle: [250, 180, 45] };
  }
  if (group === ItemGroup.Helm && num >= SACRED_HELM_FIRST && num <= SACRED_HELM_LAST) {
    return { angle: [0, 0, 45], scale: 1 };
  }
  if (group === ItemGroup.Etc && num >= PARCHMENT_FIRST && num <= PARCHMENT_LAST) {
    return { angle: [270, 0, -45], scale: 0.8 };
  }

  // --- ItemAngle.
  switch (group) {
    // `Type >= MODEL_SWORD && Type < MODEL_AXE + MAX_ITEM_INDEX`: leans back.
    case ItemGroup.Sword:
      return {
        angle: [60, 0, -45],
        scale: num === DIVINE_SWORD ? 0.7 : undefined,
      };
    case ItemGroup.Axe:
      return { angle: [60, 0, -45] };

    case ItemGroup.Bow:
      if (UPRIGHT_BOWS.has(num)) return { angle: [0, 0, -45] };
      if (
        (num >= CROSSBOW_FIRST && num <= CROSSBOW_LAST) ||
        (num >= DIVINE_CROSSBOW_FIRST && num <= DIVINE_CROSSBOW_LAST)
      ) {
        // A crossbow lies flat on its stock.
        return { angle: [90, 0, -45] };
      }
      // Every other bow falls through to the mace branch below.
      return { angle: [0, 270, -45] };

    // `Type >= MODEL_MACE && Type < MODEL_STAFF + MAX_ITEM_INDEX`: rolled onto
    // its side rather than pitched over.
    case ItemGroup.Mace:
    case ItemGroup.Spear:
    case ItemGroup.Staff:
      return { angle: [0, 270, -45] };

    case ItemGroup.Shield:
      return { angle: [0, 270, 270 - 45] };

    case ItemGroup.Helm:
      // The oversized helms are the only ones ItemAngle touches; the rest keep
      // the default upright pose.
      if (num >= BIG_HELM_FIRST && num <= BIG_HELM_LAST) {
        return { angle: [0, 0, 45], scale: 1.5 };
      }
      return DEFAULT_POSE;

    // `Type >= MODEL_ARMOR && Type < MODEL_GLOVES + MAX_ITEM_INDEX`: face-down.
    // Boots and helms are deliberately outside that range in the original.
    case ItemGroup.Armor:
    case ItemGroup.Pants:
    case ItemGroup.Gloves:
      return { angle: [270, 0, -45] };

    default:
      return DEFAULT_POSE;
  }
}

/** `itemRestPose` as entity `transform.rot` (radians, renderAngles convention). */
export function itemRestRotation(
  group: number,
  num: number
): { x: number; y: number; z: number } {
  const [pitch, roll, yaw] = itemRestPose(group, num).angle;
  return { x: -pitch * DEG, y: yaw * DEG, z: -roll * DEG };
}

/**
 * Height a drop settles at above the terrain, world units (`MoveItems`:6250).
 * Weapons sit 40 cm higher than everything else.
 */
export function itemRestHeight(group: number): number {
  const weapon = group >= ItemGroup.Sword && group <= ItemGroup.Staff;
  return (REST_ABOVE_TERRAIN_CM + (weapon ? WEAPON_EXTRA_CM : 0)) * CM;
}

/**
 * `ItemHeight` (ZzzObject.cpp:6274), world units: how far a worn body part has
 * to come down to sit on the drop's own origin. Armour drops reuse the model
 * the character wears (`items.json` points group 7-11 at `Player/`), so a helm
 * is authored up at head height and lands in the air without this.
 */
export function itemWornHeight(group: number): number {
  switch (group) {
    case ItemGroup.Helm:
      return -160 * CM;
    case ItemGroup.Armor:
      return -100 * CM;
    case ItemGroup.Gloves:
      return -70 * CM;
    case ItemGroup.Pants:
      return -50 * CM;
    default:
      // Boots are already at the origin, and nothing else is a body part.
      return 0;
  }
}

/**
 * Which `transform.rot` axis the tumble uses while the drop is in the air:
 * `o->Angle[1]` for shields, `o->Angle[0]` for everything else
 * (MoveItems:6255-6259).
 */
export function itemTumbleAxis(group: number): 'x' | 'z' {
  return group === ItemGroup.Shield ? 'z' : 'x';
}
