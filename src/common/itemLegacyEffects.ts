/**
 * Colour tables of the original client's item passes, transcribed from
 * ZzzObject.cpp `PartObjectColor` (chrome / metal pass), `PartObjectColor2`
 * (+11…+15 Chrome02 pass) and `PartObjectColor3` (ancient pass).
 *
 * Item groups follow the item database: 0 sword, 1 axe, 2 mace, 3 spear,
 * 4 bow, 5 staff, 6 shield, 7 helm, 8 armor, 9 pants, 10 gloves, 11 boots.
 */

export type RGB = readonly [number, number, number];

/** `PartObjectColor` palette (`Bright` = 1). */
const CHROME_PALETTE: RGB[] = [
  [1.0, 0.5, 0.0], // 0  default: the classic orange-gold
  [1.0, 0.2, 0.0], // 1
  [0.0, 0.5, 1.0], // 2
  [0.0, 0.5, 1.0], // 3
  [0.0, 0.8, 0.4], // 4
  [1.0, 1.0, 1.0], // 5
  [0.6, 0.8, 0.4], // 6
  [0.9, 0.8, 1.0], // 7
  [0.8, 0.8, 1.0], // 8
  [0.5, 0.5, 0.8], // 9
  [0.75, 0.65, 0.5], // 10
  [0.35, 0.35, 0.6], // 11
  [0.47, 0.67, 0.6], // 12
  [0.0, 0.3, 0.6], // 13
  [0.65, 0.65, 0.55], // 14
  [0.2, 0.3, 0.6], // 15
  [0.8, 0.46, 0.25], // 16
  [0.65, 0.45, 0.3], // 17
  [0.5, 0.4, 0.3], // 18
  [0.37, 0.37, 1.0], // 19
  [0.3, 0.7, 0.3], // 20
  [0.5, 0.4, 1.0], // 21
  [0.45, 0.45, 0.23], // 22
  [0.3, 0.3, 0.45], // 23
  [0.6, 0.5, 0.2], // 24
  [0.6, 0.6, 0.6], // 25
  [0.3, 0.7, 0.3], // 26
  [0.5, 0.6, 0.7], // 27
  [0.45, 0.45, 0.23], // 28
  [0.2, 0.7, 0.3], // 29
  [0.7, 0.3, 0.3], // 30
  [0.7, 0.5, 0.3], // 31
  [0.5, 0.2, 0.7], // 32
  [0.8, 0.4, 0.6], // 33
  [0.6, 0.4, 0.8], // 34
  [0.7, 0.4, 0.4], // 35
  [0.5, 0.5, 0.7], // 36
  [0.7, 0.5, 0.7], // 37
  [0.2, 0.4, 0.7], // 38
  [0.3, 0.6, 0.4], // 39
  [0.7, 0.2, 0.2], // 40
  [0.7, 0.2, 0.7], // 41
  [0.8, 0.4, 0.0], // 42
  [0.8, 0.6, 0.2], // 43
  [0.8, 0.7, 0.4], // 44
  [0.5, 0.8, 0.9], // 45
];

/** Named weapons / shields with their own chrome colour (`group:index` → palette). */
const WEAPON_CHROME: Record<string, number> = {
  // swords
  '0:14': 2, // Lighting Sword
  '0:20': 10, // Knight Blade
  '0:21': 5, // Dark Reign Blade
  '0:22': 18, // Bone Blade
  '0:23': 23, // Explosion Blade
  '0:24': 24, // Daybreak
  '0:25': 27, // Sword Dancer
  '0:28': 8, // Imperial Sword
  '0:31': 10, // Rune Blade
  // maces / scepters
  '2:8': 9, // Battle Scepter
  '2:9': 10, // Master Scepter
  '2:10': 12, // Great Scepter
  '2:12': 16, // Great Lord Scepter
  '2:14': 22, // Soleil Scepter
  '2:15': 28, // Shining Scepter
  '2:17': 40, // Absolute Scepter
  // spears
  '3:9': 1, // Bill of Balrog
  '3:10': 9, // Dragon Spear
  // bows / crossbows
  '4:5': 5, // Silver Bow
  '4:13': 5, // Bluewing Crossbow
  '4:17': 9, // Celestial Bow
  '4:18': 10, // Divine Crossbow of Archangel
  '4:19': 9, // Great Reign Crossbow
  '4:20': 16, // Arrow Viper Bow
  '4:21': 20, // Sylph Wind Bow
  '4:22': 26, // Albatross Bow
  '4:23': 35, // Stinger Bow
  // staffs
  '5:5': 2, // Legendary Staff
  '5:9': 5, // Dragon Soul Staff
  '5:11': 17, // Staff of Kundun
  '5:12': 19, // Grand Viper Staff
  '5:13': 25, // Platina Staff
  '5:30': 1, // Deadly Staff
  '5:31': 19, // Imperial Staff
  // shields
  '6:16': 6, // Elemental Shield
  '6:19': 29, // Frost Barrier
  '6:20': 36, // Guardian Shield
  '6:21': 30, // Cross Shield
};

/** Armour sets (groups 7–11) by set index → `PartObjectColor` palette. */
const SET_CHROME: Record<number, number> = {
  1: 1, 3: 3, 4: 5, 6: 6, 9: 2, 12: 2, 13: 4, 14: 5, 15: 7, 16: 10, 17: 9,
  18: 5, 19: 9, 20: 9, 21: 16, 22: 17, 23: 11, 24: 16, 25: 11, 26: 12, 27: 10,
  28: 15, 29: 18, 30: 19, 31: 20, 32: 21, 33: 22, 34: 24, 35: 25, 36: 26,
  37: 27, 38: 28, 39: 29, 40: 30, 41: 31, 42: 32, 43: 33, 44: 34, 45: 36,
  46: 42, 47: 37, 48: 1, 49: 35, 50: 39, 51: 40, 52: 36, 53: 41, 59: 16,
  60: 42, 61: 18, 73: 45,
};

/**
 * `PartObjectColor2` (the +11…+15 Chrome02 pass). `null` = case 0, where the
 * pass is tinted by the scene light (`Bright * Light`); otherwise a colour.
 */
const SET_CHROME2: Record<number, number> = {
  4: 1, 14: 1, 15: 1, 17: 1, 18: 2, 21: 3, 39: 1, 40: 1, 41: 1, 42: 1, 43: 2,
  44: 3,
};
const WEAPON_CHROME2: Record<string, number> = {
  '4:5': 2, // Silver Bow
  '4:13': 2, // Bluewing Crossbow
  '0:14': 2, // Lighting Sword
  '5:5': 2, // Legendary Staff
};
const CHROME2_PALETTE: (RGB | null)[] = [
  null, // 0: scene light
  [1.0, 0.5, 0.0], // 1 (× scene light in the original; orange)
  [0.0, 0.5, 1.0], // 2 (× scene light; blue)
  [1.0, 1.0, 1.0], // 3 plain white
];

/** `PartObjectColor3` (ancient pass): blue for most sets, gold for 3 / 9 / 17. */
const SET_ANCIENT_GOLD = new Set([3, 9, 17]);
const ANCIENT_BLUE: RGB = [0.1, 0.6, 1.0];
const ANCIENT_GOLD: RGB = [1.0, 0.7, 0.2];

export type LegacyItemColours = {
  /** Chrome01 / Shiny01 pass tint. */
  readonly chrome: RGB;
  /** Chrome02 pass tint; null = use the scene (body) light. */
  readonly chrome2: RGB | null;
  /** Ancient pass tint. */
  readonly ancient: RGB;
};

const isArmourGroup = (group: number) => group >= 7 && group <= 11;

export function legacyItemColours(group: number, num: number): LegacyItemColours {
  const key = `${group}:${num}`;

  let chromeIndex = WEAPON_CHROME[key] ?? 0;
  if (isArmourGroup(group)) chromeIndex = SET_CHROME[num] ?? 0;

  let chrome2Index = WEAPON_CHROME2[key] ?? 0;
  if (isArmourGroup(group)) chrome2Index = SET_CHROME2[num] ?? 0;

  return {
    chrome: CHROME_PALETTE[chromeIndex] ?? CHROME_PALETTE[0],
    chrome2: CHROME2_PALETTE[chrome2Index] ?? null,
    ancient:
      isArmourGroup(group) && SET_ANCIENT_GOLD.has(num)
        ? ANCIENT_GOLD
        : ANCIENT_BLUE,
  };
}
