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
 * Covers `ItemAngleRF`, every *structural* branch of `ItemAngle` and, through
 * `POSE_TABLE`, the long tail of per-item tweaks after them.
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
      return tablePose(group, num) ?? DEFAULT_POSE;
  }
}

/** One row of `ItemAngle`'s tail: a group, a num or a num range, and what it sets. */
type PoseRule = {
  readonly group: ItemGroup;
  /** A single item, or `from`/`to` for an inclusive range. */
  readonly num?: number;
  readonly from?: number;
  readonly to?: number;
  readonly pitch?: number;
  readonly roll?: number;
  readonly yaw?: number;
  readonly scale?: number;
};

/**
 * `ItemAngle`'s tail (ZzzObject.cpp:5338), in the original's own order: the
 * first row an item matches wins, the way the `else if` chain does, and a row
 * sets only the angle components its branch sets - the rest keep the default
 * pose. Each row carries the constants of the branch it came from.
 *
 * Two branches are deliberately absent. The ones whose model is a
 * `MODEL_EVENT` entry rather than an item row reach a drop only through
 * `CreateItemDrop`'s model swap (common/dropModelProxy.ts), so they have no
 * (group, num) to key on. And the closing `Check_LuckyItem` branch reads a
 * table the client loads at boot, which this client does not have.
 */
const POSE_TABLE: readonly PoseRule[] = [
  // >= RED_RIBBON_BOX && <= BLUE_RIBBON_BOX
  { group: ItemGroup.Wing, from: 32, to: 34, pitch: 0, yaw: 90, scale: 0.3 },
  // >= SEED_FIRE && <= SEED_EARTH
  { group: ItemGroup.Wing, from: 60, to: 65, pitch: 0, scale: 0.6 },
  // >= SPHERE_MONO && <= SPHERE_5
  { group: ItemGroup.Wing, from: 70, to: 74, pitch: 0, scale: 0.6 },
  // >= SEED_SPHERE_FIRE_1 && <= SEED_SPHERE_EARTH_5
  { group: ItemGroup.Wing, from: 100, to: 129, pitch: 0, scale: 0.6 },
  // == PUMPKIN_OF_LUCK
  { group: ItemGroup.Potion, num: 45, pitch: 0, yaw: 90, scale: 0.9 },
  // >= JACK_OLANTERN_BLESSINGS && <= JACK_OLANTERN_CRY
  { group: ItemGroup.Potion, from: 46, to: 48, pitch: 90, scale: 0.7 },
  // == JACK_OLANTERN_FOOD
  { group: ItemGroup.Potion, num: 49, pitch: 0, yaw: 90, scale: 0.9 },
  // == JACK_OLANTERN_DRINK
  { group: ItemGroup.Potion, num: 50, pitch: 0, yaw: 90, scale: 0.26 },
  // >= PINK_CHOCOLATE_BOX && <= BLUE_CHOCOLATE_BOX
  { group: ItemGroup.Potion, from: 32, to: 34, pitch: 0, yaw: 90, scale: 0.7 },
  // >= HELPER + 46 && <= HELPER + 48
  { group: ItemGroup.Helper, from: 46, to: 48, pitch: 90, scale: 0.5 },
  // == POTION + 54
  { group: ItemGroup.Potion, num: 54, pitch: 90, scale: 0.5 },
  // == POTION + 58
  { group: ItemGroup.Potion, num: 58, yaw: 90, scale: 0.3 },
  // == POTION + 59 || == POTION + 60
  { group: ItemGroup.Potion, num: 59, pitch: 90, roll: 90, scale: 0.3 },
  // == POTION + 59 || == POTION + 60
  { group: ItemGroup.Potion, num: 60, pitch: 90, roll: 90, scale: 0.3 },
  // == POTION + 61 || == POTION + 62
  { group: ItemGroup.Potion, num: 61, pitch: 90, scale: 0.3 },
  // == POTION + 61 || == POTION + 62
  { group: ItemGroup.Potion, num: 62, pitch: 90, scale: 0.3 },
  // == POTION + 53
  { group: ItemGroup.Potion, num: 53, yaw: 90, scale: 0.2 },
  // == HELPER + 43 || == HELPER + 44 || == HELPER + 45
  { group: ItemGroup.Helper, num: 43, pitch: 90, scale: 0.5 },
  // == HELPER + 43 || == HELPER + 44 || == HELPER + 45
  { group: ItemGroup.Helper, num: 44, pitch: 90, scale: 0.5 },
  // == HELPER + 43 || == HELPER + 44 || == HELPER + 45
  { group: ItemGroup.Helper, num: 45, pitch: 90, scale: 0.5 },
  // >= POTION + 70 && <= POTION + 71
  { group: ItemGroup.Potion, from: 70, to: 71, yaw: 90, scale: 0.6 },
  // >= POTION + 72 && <= POTION + 77
  { group: ItemGroup.Potion, from: 72, to: 77, yaw: 90, scale: 0.5 },
  // == HELPER + 59
  { group: ItemGroup.Helper, num: 59, yaw: 90, scale: 0.2 },
  // >= HELPER + 54 && <= HELPER + 58
  { group: ItemGroup.Helper, from: 54, to: 58, yaw: 90, scale: 0.7 },
  // >= POTION + 78 && <= POTION + 82
  { group: ItemGroup.Potion, from: 78, to: 82, yaw: 90, scale: 0.5 },
  // == HELPER + 60
  { group: ItemGroup.Helper, num: 60, yaw: 90, scale: 1.5 },
  // == HELPER + 61
  { group: ItemGroup.Helper, num: 61, pitch: 90, scale: 0.5 },
  // == POTION + 83
  { group: ItemGroup.Potion, num: 83, pitch: 90, scale: 0.3 },
  // >= POTION + 145 && <= POTION + 150
  { group: ItemGroup.Potion, from: 145, to: 150, pitch: 90, scale: 0.3 },
  // >= HELPER + 125 && <= HELPER + 127
  { group: ItemGroup.Helper, from: 125, to: 127, pitch: 90, scale: 0.5 },
  // == POTION + 91
  { group: ItemGroup.Potion, num: 91, pitch: 90, scale: 0.5 },
  // == POTION + 92
  { group: ItemGroup.Potion, num: 92, pitch: 90, scale: 0.5 },
  // == POTION + 93
  { group: ItemGroup.Potion, num: 93, pitch: 90, scale: 0.5 },
  // == POTION + 95
  { group: ItemGroup.Potion, num: 95, pitch: 90, scale: 0.5 },
  // == POTION + 94
  { group: ItemGroup.Potion, num: 94, yaw: 90, scale: 0.6 },
  // == CHERRY_BLOSSOM_PLAYBOX
  { group: ItemGroup.Potion, num: 84, yaw: 90, scale: 0.8 },
  // == CHERRY_BLOSSOM_WINE
  { group: ItemGroup.Potion, num: 85, yaw: 90, scale: 0.9 },
  // == CHERRY_BLOSSOM_RICE_CAKE
  { group: ItemGroup.Potion, num: 86, yaw: 90, scale: 0.7 },
  // == CHERRY_BLOSSOM_FLOWER_PETAL
  { group: ItemGroup.Potion, num: 87, yaw: 90, scale: 1.3 },
  // == POTION + 88
  { group: ItemGroup.Potion, num: 88, pitch: 180, roll: 180, scale: 0.7 },
  // == POTION + 89
  { group: ItemGroup.Potion, num: 89, pitch: 30, yaw: 90, scale: 0.7 },
  // == GOLDEN_CHERRY_BLOSSOM_BRANCH
  { group: ItemGroup.Potion, num: 90, pitch: 30, yaw: 90, scale: 0.7 },
  // >= HELPER + 62 && <= HELPER + 63
  { group: ItemGroup.Helper, from: 62, to: 63, pitch: 90, scale: 0.5 },
  // >= POTION + 97 && <= POTION + 98
  { group: ItemGroup.Potion, from: 97, to: 98, yaw: 90, scale: 0.5 },
  // == POTION + 140
  { group: ItemGroup.Potion, num: 140, yaw: 90, scale: 0.5 },
  // == POTION + 96
  { group: ItemGroup.Potion, num: 96, yaw: 90, scale: 0.2 },
  // == DEMON (the switch inside the DEMON..SPIRIT_OF_GUARDIAN branch)
  { group: ItemGroup.Helper, num: 64, yaw: 70, scale: 0.21 },
  // == SPIRIT_OF_GUARDIAN
  { group: ItemGroup.Helper, num: 65, yaw: 70, scale: 0.5 },
  // == OLD_SCROLL
  { group: ItemGroup.Helper, num: 49, pitch: 90, roll: 0, scale: 0.3 },
  // == ILLUSION_SORCERER_COVENANT
  { group: ItemGroup.Helper, num: 50, pitch: 0, scale: 0.6 },
  // == SCROLL_OF_BLOOD
  { group: ItemGroup.Helper, num: 51, pitch: 90, scale: 0.45 },
  // == POTION + 64
  { group: ItemGroup.Potion, num: 64, pitch: 0, scale: 0.8 },
  // == FLAME_OF_CONDOR
  { group: ItemGroup.Helper, num: 52, pitch: 0, scale: 1.2 },
  // == FEATHER_OF_CONDOR
  { group: ItemGroup.Helper, num: 53, pitch: 0, scale: 1.2 },
  // == FLAME_OF_DEATH_BEAM_KNIGHT
  { group: ItemGroup.Potion, num: 65, pitch: 90, scale: 0.6 },
  // == HORN_OF_HELL_MAINE
  { group: ItemGroup.Potion, num: 66, pitch: 90, scale: 0.8 },
  // == FEATHER_OF_DARK_PHOENIX
  { group: ItemGroup.Potion, num: 67, pitch: 270, scale: 0.8 },
  // == EYE_OF_ABYSSAL
  { group: ItemGroup.Potion, num: 68, yaw: -135, scale: 0.6 },
  // == SCROLL_OF_EMPEROR_RING_OF_HONOR
  { group: ItemGroup.Potion, num: 23, roll: 45, yaw: 45 },
  // == BROKEN_SWORD_DARK_STONE
  { group: ItemGroup.Potion, num: 24, yaw: 45 },
  // (>= TEAR_OF_ELF && < POTION + 27) || == LOCHS_FEATHER
  { group: ItemGroup.Potion, from: 25, to: 26, yaw: 45 },
  // (>= TEAR_OF_ELF && < POTION + 27) || == LOCHS_FEATHER
  { group: ItemGroup.Helper, num: 14, yaw: 45 },
  // == DEVILS_EYE
  { group: ItemGroup.Potion, num: 17, pitch: 90 },
  // == FIRECRACKER
  { group: ItemGroup.Potion, num: 63, pitch: 70, scale: 1.5 },
  // == CHRISTMAS_FIRECRACKER
  { group: ItemGroup.Potion, num: 99, pitch: 70, yaw: 0, scale: 1 },
  // == GM_GIFT
  { group: ItemGroup.Potion, num: 52, yaw: -10, scale: 0.4 },
  // == DEVILS_KEY
  { group: ItemGroup.Potion, num: 18, pitch: 270, yaw: 270 },
  // == DEVILS_INVITATION
  { group: ItemGroup.Potion, num: 19, pitch: 270, yaw: 90 },
  // == SYMBOL_OF_KUNDUN
  { group: ItemGroup.Potion, num: 29, pitch: 90, yaw: 70 },
  // == SCROLL_OF_ARCHANGEL || == BLOOD_BONE
  { group: ItemGroup.Helper, num: 16, pitch: -45, roll: -5, yaw: 18, scale: 0.48 },
  // == SCROLL_OF_ARCHANGEL || == BLOOD_BONE
  { group: ItemGroup.Helper, num: 17, pitch: -45, roll: -5, yaw: 18, scale: 0.48 },
  // == INVISIBILITY_CLOAK
  { group: ItemGroup.Helper, num: 18, pitch: 165, roll: -168, yaw: 198, scale: 0.48 },
  // == CAPE_OF_LORD
  { group: ItemGroup.Helper, num: 30, pitch: -45, roll: 0, yaw: 45, scale: 0.5 },
  // == POTION + 21
  { group: ItemGroup.Potion, num: 21, pitch: 270, yaw: 90 },
  // == POTION + 20
  { group: ItemGroup.Potion, num: 20, yaw: 45 },
  // >= RING_OF_FIRE && <= RING_OF_MAGIC
  { group: ItemGroup.Helper, from: 21, to: 24, yaw: 20 },
  // == BLESS_OF_GUARDIAN
  { group: ItemGroup.Helper, num: 33, yaw: 45, scale: 1.2 },
  // == CLAW_OF_BEAST
  { group: ItemGroup.Helper, num: 34, pitch: 90 },
  // == FRAGMENT_OF_HORN
  { group: ItemGroup.Helper, num: 35, yaw: 90 },
  // == BROKEN_HORN
  { group: ItemGroup.Helper, num: 36, yaw: 90, scale: 1.3 },
  // == HORN_OF_FENRIR
  { group: ItemGroup.Helper, num: 37, yaw: 180 },
  // == JEWEL_OF_LIFE
  { group: ItemGroup.Potion, num: 16, pitch: 270, yaw: 45 },
  // == JEWEL_OF_HARMONY
  { group: ItemGroup.Potion, num: 42, pitch: 270, yaw: -15, scale: 1.3 },
  // == LOWER_REFINE_STONE || == HIGHER_REFINE_STONE
  { group: ItemGroup.Potion, num: 43, pitch: 270, yaw: -15, scale: 1 },
  // == LOWER_REFINE_STONE || == HIGHER_REFINE_STONE
  { group: ItemGroup.Potion, num: 44, pitch: 270, yaw: -15, scale: 1 },
  // >= CHAIN_LIGHTNING_PARCHMENT && <= INNOVATION_PARCHMENT
  { group: ItemGroup.Etc, from: 19, to: 27, pitch: 270, scale: 0.8 },
  // == HELPER + 66
  { group: ItemGroup.Helper, num: 66, pitch: 270, scale: 1 },
  // == POTION + 100
  { group: ItemGroup.Potion, num: 100, pitch: 180, scale: 1 },
  // >= TYPE_CHARM_MIXWING + EWS_BEGIN && <= TYPE_CHARM_MIXWING + EWS_END
  { group: ItemGroup.Helper, from: 83, to: 93, yaw: 90, scale: 0.5 },
  // == HELPER + 97 || == HELPER + 98 || == POTION + 91
  { group: ItemGroup.Helper, num: 97, pitch: 270, scale: 1 },
  // == HELPER + 97 || == HELPER + 98 || == POTION + 91
  { group: ItemGroup.Helper, num: 98, pitch: 270, scale: 1 },
  // == HELPER + 97 || == HELPER + 98 || == POTION + 91
  { group: ItemGroup.Potion, num: 91, pitch: 270, scale: 1 },
  // == HELPER + 99
  { group: ItemGroup.Helper, num: 99, pitch: 270, scale: 1 },
  // == POTION + 110 || == POTION + 111
  { group: ItemGroup.Potion, num: 110, pitch: 270, scale: 1 },
  // == POTION + 110 || == POTION + 111
  { group: ItemGroup.Potion, num: 111, pitch: 270, scale: 1 },
  // == HELPER + 107
  { group: ItemGroup.Helper, num: 107, pitch: 270, scale: 1 },
  // == HELPER + 104
  { group: ItemGroup.Helper, num: 104, pitch: 270, scale: 1 },
  // == HELPER + 105
  { group: ItemGroup.Helper, num: 105, pitch: 270, scale: 1 },
  // == HELPER + 103
  { group: ItemGroup.Helper, num: 103, pitch: 0, scale: 1 },
  // == POTION + 133
  { group: ItemGroup.Potion, num: 133, pitch: 270, scale: 1 },
  // == HELPER + 109
  { group: ItemGroup.Helper, num: 109, pitch: 270, scale: 1 },
  // == HELPER + 110
  { group: ItemGroup.Helper, num: 110, pitch: 270, scale: 1 },
  // == HELPER + 111
  { group: ItemGroup.Helper, num: 111, pitch: 270, scale: 1 },
  // == HELPER + 112
  { group: ItemGroup.Helper, num: 112, pitch: 270, scale: 1 },
  // == HELPER + 113
  { group: ItemGroup.Helper, num: 113, pitch: 270, scale: 1 },
  // == HELPER + 114
  { group: ItemGroup.Helper, num: 114, pitch: 270, scale: 1 },
  // == HELPER + 115
  { group: ItemGroup.Helper, num: 115, pitch: 270, scale: 1 },
  // == POTION + 112
  { group: ItemGroup.Potion, num: 112, pitch: 270, scale: 1 },
  // == POTION + 113
  { group: ItemGroup.Potion, num: 113, pitch: 270, scale: 1 },
  // == HELPER + 116
  { group: ItemGroup.Helper, num: 116, pitch: 90, scale: 0.5 },
  // == HELPER + 121
  { group: ItemGroup.Helper, num: 121, pitch: 90, scale: 0.5 },
  // == PET_SKELETON
  { group: ItemGroup.Helper, num: 123, pitch: 30, scale: 0.4 },
  // >= WING && < WING + MAX
  { group: ItemGroup.Wing, from: 0, to: 511, pitch: 270, yaw: 45 },
  // >= HELPER + 135 && <= HELPER + 145
  { group: ItemGroup.Helper, from: 135, to: 145, pitch: 90, scale: 0.2 },
  // == POTION + 160 || == POTION + 161
  { group: ItemGroup.Potion, num: 160, pitch: 90, scale: 0.2 },
  // == POTION + 160 || == POTION + 161
  { group: ItemGroup.Potion, num: 161, pitch: 90, scale: 0.2 },
];

/** The first `POSE_TABLE` row this item matches, or null. */
function tablePose(group: number, num: number): RestPose | null {
  for (const rule of POSE_TABLE) {
    if (rule.group !== group) continue;
    const from = rule.from ?? rule.num ?? -1;
    const to = rule.to ?? rule.num ?? -1;
    if (num < from || num > to) continue;

    const [pitch, roll, yaw] = DEFAULT_POSE.angle;
    return {
      angle: [rule.pitch ?? pitch, rule.roll ?? roll, rule.yaw ?? yaw],
      scale: rule.scale,
    };
  }

  return null;
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
