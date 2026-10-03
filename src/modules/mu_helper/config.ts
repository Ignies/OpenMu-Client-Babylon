/**
 * MU Helper config domain model and the 257-byte blob codec.
 *
 * The layout is `PRECEIVE_MUHELPER_DATA` (WSclient.h:3592-3642, pack(1),
 * MSVC bitfields = LSB first) as written by `ConfigDataSerDe`
 * (MuHelperData.cpp). OpenMU stores the blob opaquely, so this layout is the
 * client-to-client contract: a config saved by the reference client decodes
 * here and vice versa. The C++ struct covers bytes 0-244; OpenMU's field is
 * 257 bytes, the tail stays zero.
 */

export const MU_HELPER_BLOB_SIZE = 257;

export const MAX_HUNTING_RANGE = 6;
export const MAX_OBTAINING_RANGE = 8;
export const MAX_EXTRA_ITEMS = 12;
/** 15-byte ANSI slots, NUL-terminated: 14 usable characters. */
export const MAX_EXTRA_ITEM_CHARS = 14;

export type SkillConditionBasis = 'nearby' | 'attacking';

/** Activation rule of skill slot 2 / 3 (`ESkillActivation*`, MuHelperData.h). */
export interface ActivationCondition {
  /** `ON_TIMER`: cast every `interval` seconds. */
  onTimer: boolean;
  /** `ON_CONDITION`: cast by mob count. */
  onCondition: boolean;
  /** `ON_MOBS_NEARBY` vs `ON_MOBS_ATTACKING`. */
  basis: SkillConditionBasis;
  /** `ON_MORE_THAN_*`: at least this many mobs (2-5). */
  minMobs: number;
}

export type DarkRavenMode = 0 | 1 | 2; // cease / auto / together

export interface MuHelperConfig {
  huntingRange: number;
  longRangeCounterAttack: boolean;
  returnToOriginalPosition: boolean;
  maxSecondsAway: number;

  /** [basic, activation 1, activation 2] wire skill numbers, 0 = empty. */
  skills: [number, number, number];
  /** Timer intervals in seconds; index 0 unused. */
  skillIntervals: [number, number, number];
  /** Conditions; index 0 unused. */
  skillConditions: [ActivationCondition, ActivationCondition, ActivationCondition];
  useCombo: boolean;

  buffs: [number, number, number];
  /** Recast only when the buff dropped (vs on the interval timer). */
  buffDuration: boolean;
  buffDurationParty: boolean;
  buffCastInterval: number;

  autoHeal: boolean;
  healThreshold: number;
  supportParty: boolean;
  autoHealParty: boolean;
  healPartyThreshold: number;

  useHealPotion: boolean;
  potionThreshold: number;
  useDrainLife: boolean;

  useDarkRaven: boolean;
  darkRavenMode: DarkRavenMode;

  repairItem: boolean;

  obtainRange: number;
  pickAllItems: boolean;
  pickSelectedItems: boolean;
  pickJewel: boolean;
  pickZen: boolean;
  pickAncient: boolean;
  pickExcellent: boolean;
  pickExtraItems: boolean;
  extraItems: string[];
}

export function defaultActivationCondition(): ActivationCondition {
  return { onTimer: false, onCondition: false, basis: 'nearby', minMobs: 2 };
}

/** `CNewUIMuHelper::Reset` (NewUIMuHelper.cpp:971-1012). */
export function defaultMuHelperConfig(): MuHelperConfig {
  return {
    huntingRange: 6,
    longRangeCounterAttack: false,
    returnToOriginalPosition: true,
    maxSecondsAway: 10,
    skills: [0, 0, 0],
    skillIntervals: [0, 0, 0],
    skillConditions: [
      defaultActivationCondition(),
      defaultActivationCondition(),
      defaultActivationCondition(),
    ],
    useCombo: false,
    buffs: [0, 0, 0],
    buffDuration: true,
    buffDurationParty: true,
    buffCastInterval: 0,
    autoHeal: false,
    healThreshold: 60,
    supportParty: false,
    autoHealParty: false,
    healPartyThreshold: 60,
    useHealPotion: false,
    potionThreshold: 40,
    useDrainLife: false,
    useDarkRaven: false,
    darkRavenMode: 0,
    repairItem: false,
    obtainRange: 8,
    pickAllItems: false,
    pickSelectedItems: false,
    pickJewel: false,
    pickZen: false,
    pickAncient: false,
    pickExcellent: false,
    pickExtraItems: false,
    extraItems: [],
  };
}

const bit = (v: boolean, n: number) => (v ? 1 << n : 0);
const nib = (v: number) => v & 0x0f;

/** A name fits a slot when every char survives the ANSI narrowing. */
function extraItemBytes(name: string): number[] | null {
  const trimmed = name.slice(0, MAX_EXTRA_ITEM_CHARS);
  const bytes: number[] = [];
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    // wcstombs fails on non-ANSI input and the C++ zeroes the slot.
    if (code === 0 || code > 0xff) return null;
    bytes.push(code);
  }
  return bytes;
}

export function encodeMuHelperConfig(config: MuHelperConfig): Uint8Array {
  const out = new Uint8Array(MU_HELPER_BLOB_SIZE);
  const view = new DataView(out.buffer);

  out[1] =
    bit(config.pickJewel, 3) |
    // The C++ Serialize writes this bit from pickAll (MuHelperData.cpp:122,
    // a bug); Deserialize reads it as the ancient filter, so the intent wins.
    bit(config.pickAncient, 4) |
    bit(config.pickExcellent, 5) |
    bit(config.pickZen, 6) |
    bit(config.pickExtraItems, 7);
  out[2] = nib(config.huntingRange) | (nib(config.obtainRange) << 4);
  view.setUint16(3, config.maxSecondsAway & 0x0f, true);

  view.setUint16(5, config.skills[0] & 0xffff, true);
  view.setUint16(7, config.skills[1] & 0xffff, true);
  view.setUint16(9, config.skillIntervals[1] & 0xffff, true);
  view.setUint16(11, config.skills[2] & 0xffff, true);
  view.setUint16(13, config.skillIntervals[2] & 0xffff, true);
  view.setUint16(15, config.buffCastInterval & 0xffff, true);
  view.setUint16(17, config.buffs[0] & 0xffff, true);
  view.setUint16(19, config.buffs[1] & 0xffff, true);
  view.setUint16(21, config.buffs[2] & 0xffff, true);

  out[23] =
    nib(Math.trunc(config.potionThreshold / 10)) |
    (nib(Math.trunc(config.healThreshold / 10)) << 4);
  // High nibble (`HPStatusDrainLife`) mirrors the heal threshold on write
  // and is ignored on read, like the reference serializer.
  out[24] =
    nib(Math.trunc(config.healPartyThreshold / 10)) |
    (nib(Math.trunc(config.healThreshold / 10)) << 4);

  out[25] =
    bit(config.useHealPotion, 0) |
    bit(config.autoHeal, 1) |
    bit(config.useDrainLife, 2) |
    bit(config.longRangeCounterAttack, 3) |
    bit(config.returnToOriginalPosition, 4) |
    bit(config.useCombo, 5) |
    bit(config.supportParty, 6) |
    bit(config.autoHealParty, 7);

  const cond1 = config.skillConditions[1];
  const cond2 = config.skillConditions[2];
  const subCon = (c: ActivationCondition) =>
    Math.min(3, Math.max(0, c.minMobs - 2));

  out[26] =
    bit(config.buffDurationParty, 0) |
    bit(config.useDarkRaven, 1) |
    bit(config.buffDuration, 2) |
    bit(cond1.onTimer, 3) |
    bit(cond1.onCondition, 4) |
    bit(cond1.basis === 'attacking', 5) |
    (subCon(cond1) << 6);

  out[27] =
    bit(cond2.onTimer, 0) |
    bit(cond2.onCondition, 1) |
    bit(cond2.basis === 'attacking', 2) |
    (subCon(cond2) << 3) |
    bit(config.repairItem, 5) |
    bit(config.pickAllItems, 6) |
    bit(config.pickSelectedItems, 7);

  out[28] = config.darkRavenMode & 0xff;

  for (let slot = 0; slot < MAX_EXTRA_ITEMS; slot++) {
    const name = config.extraItems[slot];
    if (!name) continue;
    const bytes = extraItemBytes(name);
    if (!bytes) continue;
    out.set(bytes, 65 + slot * 15);
  }

  return out;
}

function decodeCondition(byte: number, shift: number): ActivationCondition {
  const bits = byte >> shift;
  return {
    onTimer: (bits & 0x01) !== 0,
    onCondition: (bits & 0x02) !== 0,
    basis: (bits & 0x04) !== 0 ? 'attacking' : 'nearby',
    minMobs: ((bits >> 3) & 0x03) + 2,
  };
}

export function decodeMuHelperConfig(blob: Uint8Array): MuHelperConfig {
  const config = defaultMuHelperConfig();
  if (blob.length < 245) return config;
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);

  config.pickJewel = (blob[1] & 0x08) !== 0;
  config.pickAncient = (blob[1] & 0x10) !== 0;
  config.pickExcellent = (blob[1] & 0x20) !== 0;
  config.pickZen = (blob[1] & 0x40) !== 0;
  config.pickExtraItems = (blob[1] & 0x80) !== 0;

  config.huntingRange = blob[2] & 0x0f;
  config.obtainRange = (blob[2] >> 4) & 0x0f;
  config.maxSecondsAway = view.getUint16(3, true);

  config.skills = [
    view.getUint16(5, true),
    view.getUint16(7, true),
    view.getUint16(11, true),
  ];
  config.skillIntervals = [
    0,
    view.getUint16(9, true),
    view.getUint16(13, true),
  ];
  config.buffCastInterval = view.getUint16(15, true);
  config.buffs = [
    view.getUint16(17, true),
    view.getUint16(19, true),
    view.getUint16(21, true),
  ];

  config.potionThreshold = (blob[23] & 0x0f) * 10;
  config.healThreshold = ((blob[23] >> 4) & 0x0f) * 10;
  config.healPartyThreshold = (blob[24] & 0x0f) * 10;

  config.useHealPotion = (blob[25] & 0x01) !== 0;
  config.autoHeal = (blob[25] & 0x02) !== 0;
  config.useDrainLife = (blob[25] & 0x04) !== 0;
  config.longRangeCounterAttack = (blob[25] & 0x08) !== 0;
  config.returnToOriginalPosition = (blob[25] & 0x10) !== 0;
  config.useCombo = (blob[25] & 0x20) !== 0;
  config.supportParty = (blob[25] & 0x40) !== 0;
  config.autoHealParty = (blob[25] & 0x80) !== 0;

  config.buffDurationParty = (blob[26] & 0x01) !== 0;
  config.useDarkRaven = (blob[26] & 0x02) !== 0;
  config.buffDuration = (blob[26] & 0x04) !== 0;
  config.skillConditions = [
    defaultActivationCondition(),
    decodeCondition(blob[26], 3),
    decodeCondition(blob[27], 0),
  ];

  config.repairItem = (blob[27] & 0x20) !== 0;
  config.pickAllItems = (blob[27] & 0x40) !== 0;
  config.pickSelectedItems = (blob[27] & 0x80) !== 0;

  const raven = blob[28];
  config.darkRavenMode = raven === 1 || raven === 2 ? raven : 0;

  config.extraItems = [];
  for (let slot = 0; slot < MAX_EXTRA_ITEMS; slot++) {
    const from = 65 + slot * 15;
    let name = '';
    for (let i = 0; i < 15; i++) {
      const code = blob[from + i];
      if (!code) break;
      name += String.fromCharCode(code);
    }
    if (name) config.extraItems.push(name);
  }

  return config;
}
