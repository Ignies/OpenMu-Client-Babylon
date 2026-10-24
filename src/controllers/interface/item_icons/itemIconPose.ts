// Ported from RenderObjectScreen (ZzzInventory.cpp:7653-9026) and RenderItem3D (:9707-10118).
// A branch that can never match an item is left out: one an earlier branch already covers, one that
// names a model that is no item (`MODEL_ARMORINVEN_*`, the `MODEL_EVENT` swaps of items the pack
// draws), and RenderItem3D's five `Type == MODEL_...` tests (:9892-9916), which compare an item type
// with a model number. See interface/readme.md.

/** An item type as the original numbers it: `group * 512 + index` (`Type - MODEL_ITEM`). */
const t = (group: number, index: number): number => group * 512 + index;
/** `MODEL_EVENT + n`: a model the bag swaps in for some levels, outside the item types. */
const EVENT = 16 * 512;

/** `ObjectSelect.Angle` in degrees, `AngleMatrix` order. */
export type IconAngle = readonly [number, number, number];
/** One type, or an inclusive [first, last] range. */
type Types = readonly (number | readonly [number, number])[];
/** The angle a branch sets: null keeps the one before, and so does a null middle angle (`Vector(0, Angle[1], 0)`). */
type AngleRule =
  | readonly [number, number | null, number]
  | null
  | { readonly oneHand: IconAngle; readonly twoHand: IconAngle }
  | { readonly byLevel: readonly IconAngle[] };
/** A branch: its types, its angle, and what it adds to `Position` (world units at the item depth). */
type PoseRow = readonly [types: Types, angle: AngleRule, dx?: number, dy?: number, dz?: number];
/** RenderItem3D's point in the item's squares (fractions of its width and height), for some levels only. */
type AnchorRow = readonly [types: Types, x: number, y: number, levels?: readonly number[]];

/** `ItemAttribute[].TwoHand` picks the tilt of a sword, axe, mace, spear or staff (:7808-7815). */
const TWO_HANDS = { oneHand: [180, 270, 15], twoHand: [180, 270, 25] } as const;
/** The first chain's `else` (:8322-8325). */
const DEFAULT_ANGLE: IconAngle = [270, -10, 0];
/** RenderItem3D's `else` (:10046-10050). */
const DEFAULT_ANCHOR = [0.5, 0.6] as const;

/** The first if / else-if chain (:7664-8325): the first row naming the type sets the angle. */
const SCREEN_POSE: readonly PoseRow[] = [
  [[t(0, 0)], [180, 270, 15], -0.02, 0.03], // 7664 MODEL_KRIS
  [[t(4, 7), t(4, 15)], [0, 270, 15]], // 7670 MODEL_BOLT, MODEL_ARROWS
  [[t(3, 0)], [0, 90, 20], 0, 0.05], // 7674 MODEL_LIGHT_SPEAR
  [[t(4, 17)], [0, 90, 15]], // 7679 MODEL_CELESTIAL_BOW
  [[t(7, 31)], [-90, 0, 0], 0.03, -0.06], // 7683 MODEL_SYLPHID_RAY_HELM
  [[t(7, 30)], [-90, 0, 0], -0.03, 0.07], // 7689 MODEL_VENOM_MIST_HELM
  [[t(8, 30)], [-90, 0, 0], 0, 0.1], // 7695 MODEL_VENOM_MIST_ARMOR
  [[t(8, 29)], [-90, 0, 0], 0, 0.07], // 7700 MODEL_DRAGON_KNIGHT_ARMOR
  [[t(4, 21)], [180, -90, 15], 0, 0.12], // 7705 MODEL_SYLPH_WIND_BOW
  [[t(5, 12)], [180, 0, 8], 0.025, -0.1], // 7710 MODEL_GRAND_VIPER_STAFF
  [[[t(5, 21), t(5, 29)]], [0, 0, 0]], // 7716 MODEL_BOOK_OF_SAHAMUTT .. MODEL_STAFF + 29
  [[t(2, 14)], [180, 90, 13], -0.01, 0.1], // 7720 MODEL_SOLEIL_SCEPTER
  [[t(8, 34)], [-90, 0, 0], 0, 0.03], // 7726 MODEL_ASHCROW_ARMOR
  [[t(7, 35)], [-90, 0, 0], -0.02, 0.05], // 7731 MODEL_ECLIPSE_HELM
  [[t(8, 35)], [-90, 0, 0], 0, 0.05], // 7737 MODEL_ECLIPSE_ARMOR
  [[t(8, 36)], [-90, 0, 0], 0, -0.05], // 7742 MODEL_IRIS_ARMOR
  [[t(8, 37)], [-90, 0, 0], 0, -0.05], // 7747 MODEL_VALIANT_ARMOR
  [[[t(7, 39), t(7, 44)]], [-90, 25, 0], 0, -0.05], // 7752 MODEL_MISTERY_HELM .. MODEL_LILIUM_HELM
  [[[t(8, 38), t(8, 44)]], [-90, 0, 0], 0, -0.08], // 7757 MODEL_GLORIOUS_ARMOR .. MODEL_LILIUM_ARMOR
  [[t(0, 24)], [180, 90, 15], -0.02, 0.03], // 7762 MODEL_DAYBREAK
  [[t(2, 15)], [180, 90, 13], 0, 0.05], // 7768 MODEL_SHINING_SCEPTER
  [[t(4, 22), t(4, 23)], [180, -90, 15], -0.1, 0.08], // 7773 MODEL_ALBATROSS_BOW, MODEL_STINGER_BOW
  [[t(5, 13)], [180, 90, 8], 0.02, 0.02], // 7779 MODEL_PLATINA_STAFF
  [[t(4, 20)], [180, -90, 15]], // 7785 MODEL_ARROW_VIPER_BOW
  [[[t(4, 8), t(4, 511)]], [90, 180, 20]], // 7789 MODEL_CROSSBOW .. MODEL_BOW + MAX_ITEM_INDEX
  [[t(3, 10)], [180, 270, 20]], // 7793 MODEL_DRAGON_SPEAR
  [[t(5, 14)], TWO_HANDS, 0, 0.04], // 7801 MODEL_MISTERY_STICK
  [[t(5, 17)], TWO_HANDS, 0.02, 0.03], // 7802 MODEL_ANCIENT_STICK
  [[t(5, 18)], TWO_HANDS, 0.02], // 7803 MODEL_DEMONIC_STICK
  [[t(5, 19)], TWO_HANDS, -0.02, -0.02], // 7804 MODEL_STORM_BLITZ_STICK
  [[t(5, 20)], TWO_HANDS, 0.01, -0.01], // 7805 MODEL_ETERNAL_WING_STICK
  [[[t(0, 0), t(5, 511)]], TWO_HANDS], // 7797 MODEL_SWORD .. MODEL_STAFF + MAX_ITEM_INDEX
  [[[t(6, 0), t(6, 511)]], [270, 270, 0]], // 7817 MODEL_SHIELD .. MODEL_SHIELD + MAX_ITEM_INDEX
  [[t(13, 3)], [-90, -90, 0]], // 7821 MODEL_HORN_OF_DINORANT
  [[t(13, 4)], [-90, -90, 0]], // 7825 MODEL_DARK_HORSE_ITEM
  [[t(13, 5)], [-90, -35, 0]], // 7829 MODEL_DARK_RAVEN_ITEM
  [[t(13, 31)], [-90, -90, 0]], // 7833 MODEL_SPIRIT
  [[t(13, 30)], [-90, 0, 0]], // 7837 MODEL_CAPE_OF_LORD
  [[t(13, 16), t(13, 17)], [270, -10, 0]], // 7845 MODEL_SCROLL_OF_ARCHANGEL, MODEL_BLOOD_BONE
  [[t(13, 18)], [290, 0, 0]], // 7849 MODEL_INVISIBILITY_CLOAK
  [[EVENT + 11], [-90, -20, -20]], // 7853 MODEL_EVENT + 11
  // The Box of Luck's level models (ItemDisplay.cpp OtherModelInventoryDisplays).
  [[EVENT + 5], [270, 180, 0]], // MODEL_EVENT + 5, Firecracker / Lucky Pouch
  [[EVENT + 6], [270, 90, 0]], // MODEL_EVENT + 6, Heart of Love / of Dark Lord
  [[[t(13, 21), t(13, 24)]], [270, 160, 20]], // 7869 MODEL_RING_OF_FIRE .. MODEL_RING_OF_MAGIC
  [[t(13, 29)], [290, 0, 0]], // 7873 MODEL_ARMOR_OF_GUARDSMAN
  [[t(13, 32)], [270, 0, 0], 0.01, -0.03], // 7878 MODEL_SPLINTER_OF_ARMOR
  [[t(13, 33)], [270, 0, 0], 0, 0.02], // 7884 MODEL_BLESS_OF_GUARDIAN
  [[t(13, 34)], [270, 0, 0], 0.01, 0.02], // 7889 MODEL_CLAW_OF_BEAST
  [[t(13, 35)], [270, 0, 0], 0.01, 0.02], // 7895 MODEL_FRAGMENT_OF_HORN
  [[t(13, 36)], [270, 0, 0], 0.01, 0.05], // 7901 MODEL_BROKEN_HORN
  [[t(13, 37)], [270, 0, 0], 0.01, 0.04], // 7907 MODEL_HORN_OF_FENRIR
  [[t(13, 49)], [270, 0, 0], 0, -0.04], // 7913 MODEL_OLD_SCROLL
  [[t(13, 50)], [270, 0, 0], 0, -0.03], // 7918 MODEL_ILLUSION_SORCERER_COVENANT
  [[t(13, 51)], [270, 0, 0], 0, -0.02], // 7923 MODEL_SCROLL_OF_BLOOD
  [[t(14, 64)], [270, 0, 0], 0, 0.02], // 7928 MODEL_POTION + 64
  [[t(13, 52)], [270, 0, 0], 0, 0.045], // 7933 MODEL_FLAME_OF_CONDOR
  [[t(13, 53)], [270, 120, 0], 0, 0.04], // 7938 MODEL_FEATHER_OF_CONDOR
  [[t(12, 37)], [270, -10, 0], 0, 0.05], // 7943 MODEL_WING_OF_ETERNAL
  [[t(12, 38)], [270, -10, 0], 0, 0.05], // 7948 MODEL_WING_OF_ILLUSION
  [[t(12, 39)], [270, -10, 0], 0, 0.08], // 7953 MODEL_WING_OF_RUIN
  [[t(12, 40)], [270, -10, 0], 0, 0.05], // 7958 MODEL_CAPE_OF_EMPEROR
  [[t(12, 42)], [270, 0, 2], 0, 0.05], // 7963 MODEL_WINGS_OF_DESPAIR
  [[t(13, 46)], [270, 0, 0], 0, -0.04], // 7968 MODEL_HELPER + 46
  [[t(13, 47)], [270, 0, 0], 0, -0.04], // 7973 MODEL_HELPER + 47
  [[t(13, 48)], [270, 0, 0], 0, -0.04], // 7978 MODEL_HELPER + 48
  [[t(14, 54)], [270, 0, 0]], // 7983 MODEL_POTION + 54
  [[t(14, 58)], [270, 0, 0], 0, 0.07], // 7987 MODEL_POTION + 58
  [[t(14, 59), t(14, 60)], [270, 0, 0], 0, 0.06], // 7992 MODEL_POTION + 59, MODEL_POTION + 60
  [[t(14, 61), t(14, 62)], [270, 0, 0], 0, 0.06], // 7997 MODEL_POTION + 61, MODEL_POTION + 62
  [[t(14, 53)], [180, 0, 0], 0, 0.042], // 8002 MODEL_POTION + 53
  [[t(13, 43)], [270, 0, 0], 0.005, -0.027], // 8007 MODEL_HELPER + 43
  [[t(13, 44)], [270, 0, 0], 0.005, -0.03], // 8013 MODEL_HELPER + 44
  [[t(13, 45)], [270, 0, 0], 0.005, -0.02], // 8019 MODEL_HELPER + 45
  [[[t(14, 70), t(14, 71)]], [270, 0, 0], 0.01], // 8025 MODEL_POTION + 70 .. MODEL_POTION + 71
  [[[t(14, 72), t(14, 77)]], [0, 0, 0], 0, 0.08], // 8030 MODEL_POTION + 72 .. MODEL_POTION + 77
  [[t(13, 59)], [90, 0, 0], 0.01, 0.02], // 8035 MODEL_HELPER + 59
  [[[t(13, 54), t(13, 58)]], [270, 0, 0], 0, -0.02], // 8041 MODEL_HELPER + 54 .. MODEL_HELPER + 58
  [[[t(14, 78), t(14, 82)]], [270, 0, 0], 0, 0.01], // 8046 MODEL_POTION + 78 .. MODEL_POTION + 82
  [[t(13, 60)], [270, 0, 0], 0, -0.06], // 8051 MODEL_HELPER + 60
  [[t(13, 61)], [270, 0, 0], 0, -0.04], // 8056 MODEL_HELPER + 61
  [[t(14, 83)], [270, 0, 0], 0, 0.06], // 8061 MODEL_POTION + 83
  [[t(14, 91)], [270, 0, 0]], // 8066 MODEL_POTION + 91
  [[t(14, 92)], [270, 0, 0]], // 8070 MODEL_POTION + 92
  [[t(14, 93)], [270, 0, 0]], // 8074 MODEL_POTION + 93
  [[t(14, 95)], [270, 0, 0]], // 8078 MODEL_POTION + 95
  [[t(14, 94)], [270, 0, 0], 0.01], // 8082 MODEL_POTION + 94
  [[t(14, 84)], [270, 0, 0], 0, 0.01], // 8089 MODEL_CHERRY_BLOSSOM_PLAYBOX
  [[t(14, 85)], [270, 0, 0], 0, -0.01], // 8094 MODEL_CHERRY_BLOSSOM_WINE
  [[t(14, 86), t(14, 87)], [270, 0, 0], 0, 0.01], // 8099 MODEL_CHERRY_BLOSSOM_RICE_CAKE, _FLOWER_PETAL
  [[[t(14, 88), t(14, 90)]], [270, 0, 0], 0, 0.015], // 8109 MODEL_POTION + 88, + 89, MODEL_GOLDEN_CHERRY_BLOSSOM_BRANCH
  [[t(13, 62)], [270, 0, 0], 0.01, -0.03], // 8125 MODEL_HELPER + 62
  [[t(13, 63)], [90, 0, 0], 0.01, 0.082], // 8131 MODEL_HELPER + 63
  [[[t(14, 97), t(14, 98)]], [0, 0, 0], 0, 0.09], // 8137 MODEL_POTION + 97 .. MODEL_POTION + 98
  [[t(14, 96)], [270, 0, 0], 0.003, -0.013], // 8142 MODEL_POTION + 96
  [[t(13, 64)], [270, -10, 0], 0, -0.05], // 8152 MODEL_DEMON
  [[t(13, 65)], [270, -10, 0], 0, -0.02], // 8155 MODEL_SPIRIT_OF_GUARDIAN
  [[t(14, 65)], [270, 0, 0], 0, 0.05], // 8161 MODEL_FLAME_OF_DEATH_BEAM_KNIGHT
  [[t(14, 66)], [270, 0, 0], 0, 0.11], // 8166 MODEL_HORN_OF_HELL_MAINE
  [[t(14, 67)], [270, 0, 0], 0, 0.11], // 8171 MODEL_FEATHER_OF_DARK_PHOENIX
  [[t(13, 39)], [270, 0, 0]], // 8176 MODEL_ELITE_TRANSFER_SKELETON_RING
  [[t(13, 40)], [270, 0, 0]], // 8196 MODEL_JACK_OLANTERN_TRANSFORMATION_RING
  [[t(13, 41)], [270, 0, 0]], // 8200 MODEL_CHRISTMAS_TRANSFORMATION_RING
  [[t(13, 42)], [270, 0, 0]], // 8208 MODEL_GAME_MASTER_TRANSFORMATION_RING
  [[t(13, 38)], [-198, 0, 0], 0, 0.02], // 8212 MODEL_MOONSTONE_PENDANT
  [[t(14, 41)], [270, 90, 0], 0, 0.02], // 8218 MODEL_GEMSTONE
  [[t(14, 42)], [270, -10, 0], 0, 0.02], // 8223 MODEL_JEWEL_OF_HARMONY
  [[t(14, 43), t(14, 44)], [270, -10, -45], -0.04, 0.02, 0.02], // 8228 MODEL_LOWER_REFINE_STONE, MODEL_HIGHER_REFINE_STONE
  [[[t(13, 12), t(13, 13)], [t(13, 16), t(13, 511)]], [360, 0, 0]], // 8235 MODEL_PENDANT_OF_LIGHTING, MODEL_LOCHS_FEATHER...
  [[t(14, 12)], { byLevel: [[180, 0, 0], [270, 90, 0], [90, 0, 0]] }], // 8239 MODEL_POTION + 12, by level
  [[t(14, 20)], [270, 0, 0]], // 8260 MODEL_POTION + 20
  [[t(14, 27)], [270, 0, 0]], // 8264 MODEL_POTION + 27
  [[t(14, 63)], [-50, -60, 0], 0, 0.08], // 8268 MODEL_FIRECRACKER
  [[t(14, 52)], [270, -25, 0]], // 8273 MODEL_GM_GIFT
  [[[t(15, 19), t(15, 27)]], [270, 0, 0], 0.03, 0.03], // 8278 MODEL_CHAIN_LIGHTNING_PARCHMENT .. MODEL_INNOVATION_PARCHMENT
  [[t(12, 7)], [270, 0, 0], 0.005, -0.015], // 8284 MODEL_ORB_OF_TWISTING_SLASH
  [[t(8, 10)], [270, 0, 0], 0, -0.1], // 8290 MODEL_VINE_ARMOR
  [[t(9, 10)], [270, 0, 0], 0, -0.08], // 8295 MODEL_VINE_PANTS
  [[t(8, 11)], [270, 0, 0], 0, -0.1], // 8300 MODEL_SILK_ARMOR
  [[t(9, 11)], [270, 0, 0], 0, -0.08], // 8305 MODEL_SILK_PANTS
  [[t(12, 44)], [270, 0, 0], 0.005, -0.015], // 8310 MODEL_CRYSTAL_OF_DESTRUCTION
  [[t(12, 46), t(12, 45)], [270, 0, 0], 0.005, -0.015], // 8316 MODEL_CRYSTAL_OF_RECOVERY, MODEL_CRYSTAL_OF_MULTI_SHOT
];

/** The second chain (:8327-8776), after the first: it may turn the item again and adds its offset. */
const SCREEN_POSE_2: readonly PoseRow[] = [
  [[[t(12, 60), t(12, 65)]], [10, -10, 10]], // 8327 MODEL_SEED_FIRE .. MODEL_SEED_EARTH
  [[[t(12, 70), t(12, 74)]], [0, 0, 0]], // 8331 MODEL_SPHERE_MONO .. MODEL_SPHERE_5
  [[[t(12, 100), t(12, 129)]], [0, 0, 0]], // 8335 MODEL_SEED_SPHERE_FIRE_1 .. MODEL_SEED_SPHERE_EARTH_5
  [[t(13, 67)], [270, 40, 0], 0, -0.05], // 8339 MODEL_PET_RUDOLF
  [[t(13, 123)], [270, 40, 0], 0, -0.05], // 8344 MODEL_PET_SKELETON
  [[t(14, 140)], [0, 0, 0], 0, 0.09], // 8349 MODEL_POTION + 140
  [[[t(14, 145), t(14, 150)]], [270, 0, 0], 0.01, 0.04], // 8354 MODEL_POTION + 145 .. MODEL_POTION + 150
  [[[t(13, 125), t(13, 127)]], [270, 0, 0], 0.007, -0.035], // 8360 MODEL_HELPER + 125 .. MODEL_HELPER + 127
  [[t(13, 124)], [270, 0, 0], 0, -0.04], // 8366 MODEL_HELPER + 124
  [[t(13, 80)], [270, 40, 0], 0, -0.05], // 8371 MODEL_PET_PANDA
  [[t(13, 106)], [255, 45, 0], 0.01, -0.05], // 8376 MODEL_PET_UNICORN
  [[t(13, 68)], [300, 10, 20], 0.02, -0.02], // 8382 MODEL_SNOWMAN_TRANSFORMATION_RING
  [[t(13, 76)], [270, 0, 0], 0, -0.02], // 8388 MODEL_PANDA_TRANSFORMATION_RING
  [[t(13, 122)], [290, -20, 0], 0.01, -0.035], // 8394 MODEL_SKELETON_TRANSFORMATION_RING
  [[t(13, 128)], [270, -20, 0], 0.017, -0.053], // 8400 MODEL_HELPER + 128
  [[t(13, 129)], [270, -20, 0], 0.012, -0.045], // 8406 MODEL_HELPER + 129
  [[t(13, 134)], [270, -20, 0], 0.005, -0.033], // 8412 MODEL_HELPER + 134
  [[t(13, 130)], [270, -20, 0], 0.007, 0.005], // 8418 MODEL_HELPER + 130
  [[t(13, 131)], [270, -20, 0], 0.017, -0.053], // 8424 MODEL_HELPER + 131
  [[t(13, 132)], [270, -20, 0], 0.007, 0.045], // 8430 MODEL_HELPER + 132
  [[t(13, 133)], [270, -20, 0], 0.017, -0.053], // 8436 MODEL_HELPER + 133
  [[t(13, 69)], [270, -30, 0], 0.005, -0.05], // 8442 MODEL_HELPER + 69
  [[t(13, 70)], [270, 0, 70], 0.04], // 8448 MODEL_HELPER + 70
  [[t(13, 81)], [-90, 0, 0], 0.005, 0.035], // 8455 MODEL_HELPER + 81
  [[t(13, 82)], [-90, 0, 0], 0.005, 0.035], // 8461 MODEL_HELPER + 82
  [[t(13, 93)], [-90, 0, 0], 0.005], // 8467 MODEL_HELPER + 93
  [[t(13, 94)], [-90, 0, 0], 0.005], // 8472 MODEL_HELPER + 94
  [[t(13, 66)], [270, 0, 0], 0.01, -0.05], // 8477 MODEL_HELPER + 66
  [[t(14, 100)], [0, 0, 0], 0.01, -0.05], // 8483 MODEL_POTION + 100
  [[t(14, 99)], [290, -40, 0], 0.02, -0.03], // 8489 MODEL_CHRISTMAS_FIRECRACKER
  [[t(5, 33)], [180, 90, 10], 0.02, -0.06], // 8496 MODEL_CHROMATIC_STAFF
  [[t(5, 34)], [180, 90, 10], 0, -0.05], // 8502 MODEL_RAVEN_STICK
  [[t(3, 11)], [180, 90, 15], 0, 0.02], // 8507 MODEL_BEUROBA
  [[t(2, 18)], [180, 90, 2], -0.03, 0.06], // 8512 MODEL_STRYKER_SCEPTER
  [[t(4, 24)], [180, -90, 15], -0.07, 0.07], // 8518 MODEL_AIR_LYN_BOW
  [[t(12, 47)], [270, 0, 0], 0.005, -0.015], // 8524 MODEL_CRYSTAL_OF_FLAME_STRIKE
  [[[t(13, 71), t(13, 75)]], [270, 180, 0], 0, 0.07], // 8530 MODEL_HELPER + 71 .. + 75
  [[[t(13, 83), t(13, 93)]], [-90, 0, 0], 0, -0.03], // 8539 MODEL_TYPE_CHARM_MIXWING...
  [[t(13, 97), t(13, 98), t(14, 91)], [270, 0, 0], 0.002, -0.04], // 8544 MODEL_HELPER + 97, MODEL_HELPER + 98, MODEL_POTION + 91
  [[t(13, 99)], [270, 180, 45], 0.002, 0.025], // 8550 MODEL_HELPER + 99
  [[t(14, 110)], null, 0.005, -0.02], // 8556 MODEL_POTION + 110
  [[t(14, 111)], null, 0.01, -0.02], // 8561 MODEL_POTION + 111
  [[t(13, 107)], [90, 225, 45]], // 8566 MODEL_HELPER + 107
  [[t(13, 104)], [270, 0, 0], 0.01, -0.03], // 8572 MODEL_HELPER + 104
  [[t(13, 105)], [270, 0, 0], 0.01, -0.03], // 8578 MODEL_HELPER + 105
  [[t(13, 103)], [0, 0, 0], 0.01, 0.01], // 8584 MODEL_HELPER + 103
  [[t(14, 133)], [270, 0, 0], 0.01], // 8590 MODEL_POTION + 133
  [[t(14, 101)], null, 0.005], // 8600 MODEL_SUSPICIOUS_SCRAP_OF_PAPER
  [[[t(14, 102), t(14, 108)]], [0, 0, 30], 0.005, 0.05], // 8605 MODEL_GAIONS_ORDER, the six fragments
  [[t(14, 109)], [0, 0, 0], 0.005, 0.05], // 8622 MODEL_COMPLETE_SECROMICON
  [[[t(13, 109), t(13, 112)]], [270, 25, 25], 0.025, -0.035], // 8630 MODEL_HELPER + 109 .. MODEL_HELPER + 112
  [[[t(13, 113), t(13, 115)]], [270, 0, 0], 0.005], // 8636 MODEL_HELPER + 113 .. MODEL_HELPER + 115
  [[[t(14, 112), t(14, 113)]], [270, 180, 45], 0.05, 0.009], // 8642 MODEL_POTION + 112 .. MODEL_POTION + 113
  [[t(14, 120)], [270, 0, 0], 0.01, 0.05], // 8648 MODEL_POTION + 120
  [[[t(14, 134), t(14, 139)]], [270, 0, 0], 0, 0.05], // 8654 MODEL_POTION + 134 .. MODEL_POTION + 139
  [[t(13, 116)], [270, 0, 0], 0.005, -0.03], // 8660 MODEL_HELPER + 116
  [[[t(14, 114), t(14, 119)]], [270, 0, 0], 0, 0.06], // 8666 MODEL_POTION + 114 .. MODEL_POTION + 119
  [[[t(14, 126), t(14, 129)]], [270, 0, 0], 0, 0.06], // 8672 MODEL_POTION + 126 .. MODEL_POTION + 129
  [[[t(14, 130), t(14, 132)]], [270, 0, 0], 0, 0.06], // 8678 MODEL_POTION + 130 .. MODEL_POTION + 132
  [[t(13, 121)], [270, 0, 0], 0, -0.04], // 8684 MODEL_HELPER + 121
  [[t(7, 59)], [-90, 25, 0], 0, 0.04], // 8689 MODEL_SACRED_HELM
  [[t(0, 32)], [-90, 0, 0], 0.005, 0.015], // 8708 MODEL_SACRED_GLOVE
  [[[t(0, 33), t(0, 34)]], [0, 0, 0], 0.002, 0.02], // 8714 MODEL_STORM_HARD_GLOVE .. MODEL_PIERCING_BLADE_GLOVE
  [[t(0, 35)], [0, 0, 0], -0.005, 0.015], // 8720 MODEL_PHOENIX_SOUL_STAR
  [[t(12, 49)], [-90, 0, 0], 0.015, 0.01], // 8726 MODEL_CAPE_OF_FIGHTER
  [[t(12, 50)], [270, -10, 0], 0, 0.15], // 8732 MODEL_CAPE_OF_OVERRULE
  [[[t(15, 30), t(15, 36)]], [270, 0, 0], 0.03, 0.03], // 8737 MODEL_CHAIN_DRIVE_PARCHMENT .. MODEL_INCREASE_BLOCK_PARCHMENT
  [[t(12, 135)], null, 0.005, 0.05], // 8743 MODEL_WING + 135
  [[[t(13, 135), t(13, 145)]], [270, 0, 0], 0, 0.02], // 8748 MODEL_HELPER + 135 .. MODEL_HELPER + 145
  [[t(14, 160), t(14, 161)], [270, 0, 0], 0, 0.05], // 8753 MODEL_POTION + 160, MODEL_POTION + 161
  [[t(12, 142), t(12, 143)], [270, -10, -45]], // 8763 eLOW_C, eUPPER_C
  [[t(12, 136), t(12, 137)], [270, -10, 0], 0, -0.05], // 8767 eLIFE_C, eCREATE_C
  [[t(12, 139)], [270, 90, 0], 0, -0.05], // 8771 eGEMSTONE_C
  [[t(12, 30), t(12, 31), t(12, 138), t(12, 140), t(12, 141)], [270, -10, 0]], // 8760 the other packed jewels
];

/**
 * After the chains, every row that names the type: the three switches (:8778-8854), the helm offset
 * by the body height (:8892) and the offsets the scale chain adds (:8941-9026, :9316-9325).
 */
const SCREEN_TWEAKS: readonly PoseRow[] = [
  [[t(0, 26)], [180, 270, 10], -0.02, 0.04], // 8780 MODEL_FLAMBERGE
  [[t(0, 27)], [180, 270, 15]], // 8786 MODEL_SWORD_BREAKER
  [[t(0, 28)], [180, 270, 10], 0, 0.02], // 8790 MODEL_IMPERIAL_SWORD
  [[t(2, 16)], [180, 270, 15], -0.02], // 8795 MODEL_FROST_MACE
  [[t(2, 17)], [180, 270, 15], -0.02, 0.04], // 8801 MODEL_ABSOLUTE_SCEPTER
  [[t(5, 30), t(5, 31), t(5, 32)], [180, 90, 10]], // 8807 MODEL_DEADLY_STAFF, MODEL_IMPERIAL_STAFF, MODEL_STAFF + 32
  [[t(5, 7)], [0, 0, 205]], // 8823 MODEL_CHAOS_LIGHTNING_STAFF
  [[[t(12, 8), t(12, 11)]], null, 0.005, -0.02], // 8831 MODEL_ORB_OF_HEALING .. MODEL_ORB_OF_SUMMONING
  [[t(14, 21)], null, 0.005, -0.005], // 8840 MODEL_POTION + 21
  [[t(14, 13), t(14, 14), t(14, 22)], null, 0.005, 0.015], // 8846 MODEL_JEWEL_OF_BLESS, _OF_SOUL, _OF_CREATION
  [[t(7, 65), t(7, 70)], null, 0.04], // 8892 MODEL_HELM + 65, + 70
  [[t(12, 142), t(12, 143)], null, -0.05], // 8948 eLOW_C, eUPPER_C
  [[t(12, 137), t(12, 138), t(12, 139)], null, 0, 0.05], // 8956 eCREATE_C, ePROTECT_C, eGEMSTONE_C
  [[t(12, 136), t(12, 141)], null, 0, 0.025], // 8960 eCHAOS_C, eLIFE_C
  [[[t(12, 32), t(12, 34)]], null, 0, -0.05], // 8981 MODEL_RED_RIBBON_BOX .. MODEL_BLUE_RIBBON_BOX
  [[[t(14, 32), t(14, 34)]], [0, null, 0], 0, 0.05], // 9012 MODEL_PINK_CHOCOLATE_BOX .. MODEL_BLUE_CHOCOLATE_BOX
  [[t(14, 43), t(14, 44)], null, 0, -0.005], // 9316 MODEL_LOWER_REFINE_STONE, MODEL_HIGHER_REFINE_STONE
];

/** RenderItem3D's anchor (:9712-10050): the first row naming the type (and the level, when it names some). */
const ANCHORS: readonly AnchorRow[] = [
  [[[t(0, 0), t(0, 511)]], 0.8, 0.85], // 9712 ITEM_SWORD .. ITEM_SWORD + MAX_ITEM_INDEX
  [[t(2, 13)], 0.6, 0.5], // 9719 ITEM_DIVINE_SCEPTER_OF_ARCHANGEL
  [[[t(1, 0), t(2, 511)]], 0.8, 0.7], // 9717 ITEM_AXE .. ITEM_MACE + MAX_ITEM_INDEX
  [[[t(3, 0), t(3, 511)]], 0.6, 0.65], // 9730 ITEM_SPEAR .. ITEM_SPEAR + MAX_ITEM_INDEX
  [[t(4, 17)], 0.5, 0.5], // 9735 ITEM_CELESTIAL_BOW
  [[t(4, 19)], 0.7, 0.75], // 9740 ITEM_GREAT_REIGN_CROSSBOW
  [[t(4, 20)], 0.5, 0.55], // 9745 ITEM_ARROW_VIPER_BOW
  [[[t(4, 8), t(4, 511)]], 0.7, 0.7], // 9750 ITEM_CROSSBOW .. ITEM_BOW + MAX_ITEM_INDEX
  [[[t(5, 0), t(5, 511)]], 0.6, 0.55], // 9755 ITEM_STAFF .. ITEM_STAFF + MAX_ITEM_INDEX
  [[t(6, 15)], 0.5, 0.7], // 9763 ITEM_GRAND_SOUL_SHIELD
  [[t(6, 16)], 0.5, 0.9], // 9765 ITEM_ELEMENTAL_SHIELD
  [[t(6, 21)], 0.55, 0.5], // 9767 ITEM_CROSS_SHIELD
  [[[t(6, 0), t(6, 511)]], 0.5, 0.6], // 9760 ITEM_SHIELD
  [[[t(7, 0), t(7, 511)]], 0.5, 0.8], // 9775 ITEM_HELM .. ITEM_HELM + MAX_ITEM_INDEX
  [[t(8, 2), t(8, 4), t(8, 6)], 0.5, 1.05], // 9783 ITEM_PAD_ARMOR, ITEM_BONE_ARMOR, ITEM_SCALE_ARMOR
  [[t(8, 3), t(8, 8)], 0.5, 1.1], // 9787 ITEM_LEGENDARY_ARMOR, ITEM_BRASS_ARMOR
  [[t(8, 15)], 0.5, 1], // 9795 ITEM_STORM_CROW_ARMOR
  [[[t(8, 0), t(8, 511)]], 0.5, 0.8], // 9780 ITEM_ARMOR (Dark Phoenix, Grand Soul, Thunder Hawk too, :9791)
  [[[t(9, 0), t(11, 511)]], 0.5, 0.9], // 9804 ITEM_PANTS .. ITEM_BOOTS + MAX_ITEM_INDEX
  [[t(13, 14)], 0.55, 0.85, [1]], // 9809 ITEM_LOCHS_FEATHER +1
  [[t(13, 14), t(13, 15)], 0.6, 1], // 9814 ITEM_LOCHS_FEATHER, ITEM_FRUITS
  [[t(13, 16), t(13, 17)], 0.5, 0.9], // 9819 ITEM_SCROLL_OF_ARCHANGEL, ITEM_BLOOD_BONE
  [[t(13, 18)], 0.5, 0.75], // 9824 ITEM_INVISIBILITY_CLOAK
  [[t(13, 19)], 0.5, 0.5, [0]], // 9833 ITEM_WEAPON_OF_ARCHANGEL +0
  [[t(13, 19)], 0.7, 0.8, [1]], // 9834 +1
  [[t(13, 19)], 0.7, 0.7, [2]], // 9835 +2
  [[t(13, 19)], 0, 0], // 9829 any other level moves nothing
  [[t(13, 20)], 0.5, 0.65, [0]], // 9842 ITEM_WIZARDS_RING +0
  [[t(13, 20)], 0.5, 0.8, [1, 2, 3]], // 9843 +1 .. +3
  [[t(13, 20)], 0, 0], // 9838 any other level
  [[t(13, 29)], 0.5, 0.5], // 9849 ITEM_ARMOR_OF_GUARDSMAN
  [[t(13, 4)], 0.5, 0.6], // 9854 ITEM_DARK_HORSE_ITEM
  [[t(13, 30)], 0.5, 0.5], // 9859 ITEM_CAPE_OF_LORD
  [[t(13, 31)], 0.5, 0.9], // 9864 ITEM_SPIRIT
  [[t(14, 7)], 0.5, 0.5], // 9869 ITEM_SIEGE_POTION
  [[t(13, 7)], 0.5, 0.9], // 9874 ITEM_HELPER + 7
  [[t(13, 11)], 0.5, 0.8, [0]], // 9883 ITEM_LIFE_STONE_ITEM +0
  [[t(13, 11)], 0.5, 0.5, [1]], // 9884 +1
  [[t(13, 11)], 0, 0], // 9879 any other level
  [[t(13, 32)], 0.5, 0.5], // 9887 ITEM_SPLINTER_OF_ARMOR
  [[[t(13, 0), t(13, 511)]], 0.5, 0.7], // 9917 ITEM_HELPER .. ITEM_HELPER + MAX_ITEM_INDEX
  [[t(14, 12)], 0.5, 0.5], // 9922 ITEM_POTION + 12
  [[t(14, 11)], 0.5, 0.5, [3, 13]], // 9927 ITEM_BOX_OF_LUCK +3, +13
  [[t(14, 11)], 0.5, 0.8, [14, 15]], // 9932 ITEM_BOX_OF_LUCK +14, +15
  [[t(14, 9)], 0.5, 0.8, [1]], // 9937 ITEM_ALE +1
  [[t(14, 17), t(14, 18), t(14, 19)], 0.5, 0.5], // 9942 ITEM_DEVILS_EYE, ITEM_DEVILS_KEY, ITEM_DEVILS_INVITATION
  [[t(14, 21)], 0.5, 0.5, [0, 3]], // 9951 ITEM_POTION + 21 (Rena) +0, +3
  [[t(14, 21)], 0.4, 0.8, [1, 2]], // 9952 +1, +2
  [[t(14, 21)], 0, 0], // 9947 any other level
  [[t(14, 24)], 0.5, 0.8, [1]], // 9959 ITEM_BROKEN_SWORD_DARK_STONE +1
  [[[t(14, 22), t(14, 24)]], 0.5, 0.95], // 9957 ITEM_JEWEL_OF_CREATION .. ITEM_TEAR_OF_ELF
  [[[t(14, 46), t(14, 48)]], 0.5, 0.5], // 9970 ITEM_JACK_OLANTERN_BLESSINGS .. ITEM_JACK_OLANTERN_CRY
  [[[t(14, 25), t(14, 26)]], 0.5, 0.9], // 9975 ITEM_TEAR_OF_ELF .. ITEM_POTION + 27
  [[t(14, 31)], 0.5, 0.5], // 9980 ITEM_JEWEL_OF_GUARDIAN
  [[t(12, 30), t(12, 31)], 0.55, 0.8], // 9985 INDEX_COMPILED_CELE, INDEX_COMPILED_SOUL
  [[t(12, 3)], 0.5, 0.45], // 9990 ITEM_WINGS_OF_SPIRITS
  [[t(12, 4)], 0.5, 0.4], // 9995 ITEM_WINGS_OF_SOUL
  [[t(12, 5)], 0.5, 0.75], // 10000 ITEM_WINGS_OF_DRAGON
  [[t(12, 6)], 0.5, 0.55], // 10005 ITEM_WINGS_OF_DARKNESS
  [[t(14, 100)], 0.49, 0.28], // 10010 ITEM_POTION + 100
  [[[t(12, 136), t(12, 143)]], 0.55, 0.82], // 10016 the packed jewels (12/30, 31 matched above)
  [[[t(14, 0), t(14, 511)]], 0.5, 0.95], // 10021 ITEM_POTION .. ITEM_POTION + MAX_ITEM_INDEX
  [[[t(12, 12), t(12, 14)], [t(12, 16), t(12, 19)]], 0.5, 0.75], // 10026 ITEM_ORB_OF_RAGEFUL_BLOW, ITEM_ORB_OF_GREATER_FORTITUDE...
  [[t(12, 49)], 0.5, 0.5], // 10036 ITEM_CAPE_OF_FIGHTER
  [[t(12, 50)], 0.5, 0.5], // 10041 ITEM_CAPE_OF_OVERRULE
];

/**
 * The model the bag draws for some levels of an item the pack has no file for: RenderItem3D hands
 * Rena +1 / +2 to RenderObjectScreen as `MODEL_EVENT + 11` (:10101-10118), and RenderPartObject draws
 * the Heart +0 / +2 as `MODEL_EVENT` / `+ 1` (ZzzObject.cpp:10531-10543, ZzzOpenData.cpp:987-1000).
 * `screen` is the type the pose is worked out for; `scale` what the scale chain gives the drawn model.
 */
const LEVEL_MODELS: readonly { type: number; levels: readonly number[]; screen?: number; file: string; scale: number }[] = [
  { type: t(14, 12), levels: [0], file: 'Item/Event02.glb', scale: 0.0025 },
  { type: t(14, 12), levels: [2], file: 'Item/Event03.glb', scale: 0.0025 },
  { type: t(14, 21), levels: [1, 2], screen: EVENT + 11, file: 'Item/EventBloodCastle03.glb', scale: 0.0015 },
  // The Box of Luck is another model at most levels (RenderItem3D, ZzzInventory.cpp
  // 6817-6848; files ZzzOpenData.cpp 420-426); without them the turning picture was the box.
  { type: t(14, 11), levels: [1], screen: EVENT + 4, file: 'Item/MagicBox02.glb', scale: 0.0025 },
  { type: t(14, 11), levels: [2, 14, 15], screen: EVENT + 5, file: 'Item/MagicBox03.glb', scale: 0.0025 },
  { type: t(14, 11), levels: [3, 13], screen: EVENT + 6, file: 'Item/MagicBox05.glb', scale: 0.0039 },
  { type: t(14, 11), levels: [5], screen: EVENT + 8, file: 'Item/MagicBox06.glb', scale: 0.0015 },
  { type: t(14, 11), levels: [6], screen: EVENT + 9, file: 'Item/MagicBox07.glb', scale: 0.0019 },
  { type: t(14, 11), levels: [8, 9, 10, 11, 12], screen: EVENT + 10, file: 'Item/MagicBox08.glb', scale: 0.001 },
];

/** `LUCKY_SET_ARMOR_START_INDEX` .. + `LUCKY_SET_ARMOR_COUNT` (_define.h:191-192): `Check_LuckyItem`. */
const LUCKY_FIRST = 62;
const LUCKY_LAST = 72;

function names(types: Types, type: number): boolean {
  for (const entry of types) {
    if (typeof entry === 'number' ? entry === type : type >= entry[0] && type <= entry[1]) return true;
  }
  return false;
}

export type ItemIconPose = {
  angle: [number, number, number];
  /** Added to `Position`, world units at the item depth (x right, y up, z towards the eye). */
  offset: [number, number, number];
  /** Where in the item's squares `Position` starts, as fractions of its width and height. */
  anchor: [number, number];
  /** `b->BodyHeight` (:8887-8905), world units. */
  bodyHeight: number;
  /** The model and `o->Scale` the bag swaps in at this level; null draws the item's own. */
  model: { file: string; scale: number } | null;
};

function turn(angle: [number, number, number], rule: AngleRule, level: number, twoHand: boolean): void {
  if (rule === null) return;
  const set: readonly (number | null)[] | undefined =
    'oneHand' in rule ? (twoHand ? rule.twoHand : rule.oneHand) : 'byLevel' in rule ? rule.byLevel[level] : rule;
  if (!set) return;
  for (let i = 0; i < 3; i++) angle[i] = set[i] ?? angle[i];
}

function move(offset: [number, number, number], row: PoseRow): void {
  offset[0] += row[2] ?? 0;
  offset[1] += row[3] ?? 0;
  offset[2] += row[4] ?? 0;
}

/** How the original draws item `group`/`num` at `level` in a bag square. */
export function itemIconPose(group: number, num: number, level: number, twoHand: boolean): ItemIconPose {
  const type = t(group, num);
  const swap = LEVEL_MODELS.find(row => row.type === type && row.levels.includes(level)) ?? null;
  const screen = swap?.screen ?? type;
  const angle: [number, number, number] = [...DEFAULT_ANGLE];
  const offset: [number, number, number] = [0, 0, 0];

  const first = SCREEN_POSE.find(row => names(row[0], screen));
  if (first) {
    turn(angle, first[1], level, twoHand);
    move(offset, first);
  }
  const second = SCREEN_POSE_2.find(row => names(row[0], screen));
  if (second) {
    turn(angle, second[1], level, twoHand);
    move(offset, second);
  }
  for (const row of SCREEN_TWEAKS) {
    if (!names(row[0], screen)) continue;
    turn(angle, row[1], level, twoHand);
    move(offset, row);
  }

  const anchorRow = ANCHORS.find(row => names(row[0], type) && (!row[3] || row[3].includes(level)));
  const anchor: [number, number] = anchorRow ? [anchorRow[1], anchorRow[2]] : [...DEFAULT_ANCHOR];
  // The Rage Fighter's glove weapons sit a quarter square up and left (:10052-10056).
  if (type >= t(0, 32) && type <= t(0, 35)) {
    anchor[0] -= 0.25;
    anchor[1] -= 0.25;
  }

  const lucky = num >= LUCKY_FIRST && num <= LUCKY_LAST && screen < EVENT;
  const g = screen < EVENT ? Math.floor(screen / 512) : -1;
  const bodyHeight = g === 7 ? (lucky ? -170 : -160) : g === 8 ? (lucky ? -113 : -100) : g === 10 ? -70 : g === 9 ? -50 : 0;

  return { angle, offset, anchor, bodyHeight, model: swap && { file: swap.file, scale: swap.scale } };
}
