/**
 * The master skill tree — `CNewUIMasterLevel` (NewUIMasterLevel.cpp) minus
 * the drawing: the tree tables, the hero's learned master skill levels, the
 * rules that decide whether a node is open, and the tooltip text.
 *
 * Data (loaded once, on first `ensureMasterTreeData`):
 *   - `Data/Local/MasterSkillTreeData.bmd` — 512 BUX records of 24 bytes
 *     (`_MASTER_SKILLTREE_DATA`, NewUIMasterLevel.h:31) plus a 4-byte
 *     `GenerateCheckSum2` trailer (`OpenMasterSkillTreeData`): the node's
 *     index in the tree, class flags, group, cost, max level, arrow art, up
 *     to two required master skills, the skill number and the level-0
 *     display value. All three files live under `Local/`; the paths below
 *     are relative to `Data/`, and a wrong one is not a 404 but the SPA
 *     fallback page, which decodes to garbage — hence the range checks.
 *   - `Data/Local/<lang>/MasterSkillTooltip_<lang>.bmd` — 512 BUX records of 616
 *     bytes (`_MASTER_SKILL_TOOLTIP_FILE`): seven printf strings per skill.
 *   - `Data/Local/Skill.bmd` — 600 BUX records of 80 bytes: only the master
 *     icon index, the use type and the base skill (`SkillBrand`) are read.
 *
 * Driven by `MasterSkillList` (F3 53, on entering the game) and
 * `MasterSkillLevelUpdate` (F3 52, after a point is spent). The command
 * `learnMasterSkill` sends `AddMasterSkillPoint` (F3 52). Reads the point
 * count from `masterLevel.ts` and the weapon rule from `usability.ts`, so it
 * is listed after both.
 *
 * Read by the master tree window (`ui/…/masterSkills`) through the `skills`
 * facade.
 */
import { onLanguageChanged, textTable } from '../i18n';
import { observable, runInAction } from 'mobx';
import { CharacterClassNumber, type ENUM_WORLD } from '../common/types';
import { EventBus } from '../libs/eventBus';
import {
  MasterSkillLevelUpdatePacket,
  MasterSkillListPacket,
} from '../common/packets/ServerToClientPackets';
import { AddMasterSkillPointPacket } from '../common/packets/ClientToServerPackets';
import { downloadDataFile } from '../libs/mu/dataFolder';
import { decodeLocalText, downloadLocalDataFile } from '../libs/mu/localData';
import { convertBux } from '../common/terrain/mapFileEncryption';
import { skillDefinition } from '../common/skillsDatabase';
import { Store } from '../store';
import type { SkillLayer } from './layer';
import { isWeaponSkill, skillRequirementsMet } from './usability';
import { masterLevelUpPoints, setMasterLevelUpPoints } from './masterLevel';

// ---- 1. tuning -------------------------------------------------------------

/** `MAX_MASTER_SKILL_DATA`: records in each of the two tree files. */
const MAX_RECORDS = 512;
/** `sizeof(_MASTER_SKILLTREE_DATA)`. */
const TREE_RECORD_SIZE = 24;
/** `sizeof(_MASTER_SKILL_TOOLTIP_FILE)`: int + WORD + 64+256+32+64×4, padded. */
const TOOLTIP_RECORD_SIZE = 616;
/** Offsets of the seven `Info` strings and their lengths inside a record. */
const TOOLTIP_FIELDS: readonly [offset: number, length: number][] = [
  [6, 64],
  [70, 256],
  [326, 32],
  [358, 64],
  [422, 64],
  [486, 64],
  [550, 64],
];
/** `Skill.bmd`: 600 × 80-byte records; the three columns the tree uses. */
const SKILL_RECORDS = 600;
const SKILL_RECORD_SIZE = 80;
const SKILL_USE_TYPE_OFFSET = 55;
const SKILL_BRAND_OFFSET = 56;
const SKILL_ICON_OFFSET = 68;
/** `SkillUseType == 4`: a base skill that needs no learning (`CheckBeforeSkill`). */
const SKILL_USE_TYPE_INNATE = 4;

/** `MAX_MASTER_SKILL_CATEGORY`: the three columns of the window. */
export const MASTER_GROUPS = 3;
/** Nodes per rank row; `(Index - 1) % 4` is the column (`RenderIcon`). */
export const MASTER_RANK_COLUMNS = 4;
/** Indices per group: `MAX_MASTER_TREE_RANK` rows minus one, times the columns. */
const INDICES_PER_GROUP = 36;
/** `MASTER_SKILL_LEVEL_REQ_FOR_NEXT_RANK`: a rank opens the next at level 10. */
const RANK_UNLOCK_LEVEL = 10;
/** `AT_SKILL_MASTER_BEGIN` … `AT_SKILL_MASTER_END`: the master skill numbers. */
const MASTER_SKILL_FIRST = 300;
const MASTER_SKILL_LAST = 700;

/** `new_Master_Icon.OZJ` / `new_Master_non_Icon.OZJ`: 512² of 20×28 cells. */
export const MASTER_ICON_WIDTH = 20;
export const MASTER_ICON_HEIGHT = 28;
const MASTER_ICONS_PER_ROW = 25;

/** `MASTER_SKILL_TREE_CLASS`: the class-flag column of both files. */
export const enum MasterTreeClass {
  None = 0,
  BladeMaster = 1,
  GrandMaster = 2,
  HighElf = 4,
  DimensionMaster = 8,
  DuelMaster = 16,
  LordEmperor = 32,
  FistMaster = 64,
}

/**
 * `SetMasterType`, widened to the whole class line so a second-class hero
 * can browse the tree they are working towards (every node stays closed —
 * there are no points to spend before the third class).
 */
const TREE_CLASS: Readonly<Record<number, MasterTreeClass>> = {
  [CharacterClassNumber.DarkWizard]: MasterTreeClass.GrandMaster,
  [CharacterClassNumber.SoulMaster]: MasterTreeClass.GrandMaster,
  [CharacterClassNumber.GrandMaster]: MasterTreeClass.GrandMaster,
  [CharacterClassNumber.DarkKnight]: MasterTreeClass.BladeMaster,
  [CharacterClassNumber.BladeKnight]: MasterTreeClass.BladeMaster,
  [CharacterClassNumber.BladeMaster]: MasterTreeClass.BladeMaster,
  [CharacterClassNumber.FairyElf]: MasterTreeClass.HighElf,
  [CharacterClassNumber.MuseElf]: MasterTreeClass.HighElf,
  [CharacterClassNumber.HighElf]: MasterTreeClass.HighElf,
  [CharacterClassNumber.MagicGladiator]: MasterTreeClass.DuelMaster,
  [CharacterClassNumber.DuelMaster]: MasterTreeClass.DuelMaster,
  [CharacterClassNumber.DarkLord]: MasterTreeClass.LordEmperor,
  [CharacterClassNumber.LordEmperor]: MasterTreeClass.LordEmperor,
  [CharacterClassNumber.Summoner]: MasterTreeClass.DimensionMaster,
  [CharacterClassNumber.BloodySummoner]: MasterTreeClass.DimensionMaster,
  [CharacterClassNumber.DimensionMaster]: MasterTreeClass.DimensionMaster,
  [CharacterClassNumber.RageFighter]: MasterTreeClass.FistMaster,
  [CharacterClassNumber.FistMaster]: MasterTreeClass.FistMaster,
};

/**
 * `ClassNameTextIndex` / `CategoryTextIndex`: GlobalText 1668…1672, 1689,
 * 3151 and the three category lines after 1751 / 1755 / 1759 / 1763 / 1767
 * / 3136 / 3330, read out of `Text_Eng_decrypted.bmd`.
 */
const TREE_TEXT: Readonly<
  Record<MasterTreeClass, { className: string; categories: readonly [string, string, string] }>
> = {
  [MasterTreeClass.None]: { className: '', categories: ['', '', ''] },
  [MasterTreeClass.GrandMaster]: {
    className: 'Grand Master',
    categories: ['Peace', 'Wisdom', 'Overcome'],
  },
  [MasterTreeClass.BladeMaster]: {
    className: 'Blade Master',
    categories: ['Protection', 'Bravery', 'Anger'],
  },
  [MasterTreeClass.HighElf]: {
    className: 'High Elf',
    categories: ['Blessing', 'Salvation', 'Storm'],
  },
  [MasterTreeClass.DuelMaster]: {
    className: 'Dual Master',
    categories: ['Solidity', 'Fighting Spirit', 'Ultimatum'],
  },
  [MasterTreeClass.LordEmperor]: {
    className: 'Lord Emperor',
    categories: ['Determination', 'Justice', 'Conquer'],
  },
  [MasterTreeClass.DimensionMaster]: {
    className: 'Dimension Master',
    categories: ['Guardian', 'Chaos', 'Honor'],
  },
  [MasterTreeClass.FistMaster]: {
    className: 'Fist Master',
    categories: ['Willpower', 'Determination', 'Destruction'],
  },
};

/** GlobalText 3328 / 3329, 3326 / 3327 / 3336: the tooltip and refusal lines. */
/** The master tree's own lines, live over `t()` - shape unchanged. */
export const MASTER_TEXT = textTable({
  nextLevel: 'master.nextLevel',
  requirements: 'master.requirements',
  maxed: 'master.maxed',
  unmet: 'master.unmet',
  equipment: 'master.equipment',
  /** GlobalText 1746 / 1747 / 3335 / 1748. */
  masterLevel: 'master.masterLevel',
  levelPoints: 'master.levelPoints',
  expPercent: 'master.expPercent',
  expTip: 'master.expTip',
});

// ---- 2. state + readers ----------------------------------------------------

/** One node of the tree (`_MASTER_SKILLTREE_DATA` plus its derived place). */
export interface MasterTreeEntry {
  /** Position in the class's tree; the key the packets use. */
  index: number;
  classCode: number;
  /** Category column 0…2. */
  group: number;
  /** Master points one level costs. */
  requiredPoints: number;
  maxLevel: number;
  /** `ArrowDirection` 0…8: which `new_Master_arrow0N` to draw, if any. */
  arrow: number;
  /** Master skills that must be at level 10 first (0 = none). */
  requireSkills: readonly [number, number];
  /** The wire skill number. */
  skill: number;
  /** Display value at level 0; -1 = the tooltip has no value. */
  defValue: number;
  /** Row 1…9 within the group. */
  rank: number;
  /** Column 0…3 within the rank. */
  column: number;
}

/** `_MASTER_SKILL_TOOLTIP`: the seven printf strings (`#` = line break). */
export interface MasterSkillTooltip {
  skill: number;
  classCode: number;
  info: readonly string[];
}

/** The three `Skill.bmd` columns the tree reads. */
interface MasterSkillAttribute {
  icon: number;
  useType: number;
  brand: number;
}

/** `CSkillTreeInfo`: what the server said about one learned node. */
export interface MasterSkillInfo {
  level: number;
  value: number;
  nextValue: number;
}

export interface MasterTooltipLine {
  text: string;
  /** `TextListColor`: 0 white, 1 title yellow, 2 red (unmet), 4 green (next). */
  color: 0 | 1 | 2 | 4;
  bold?: boolean;
}

export type MasterLearnBlock = 'maxed' | 'points' | 'equipment' | 'requirements';

let treeRecords: MasterTreeEntry[] = [];
let tooltipRecords: MasterSkillTooltip[] = [];
let skillAttributes: MasterSkillAttribute[] = [];
let loading: Promise<void> | null = null;

/** Flips once the three files are parsed, so windows re-render. */
const dataState = observable.object({ loaded: false });

/**
 * Node index → level/value as the server sent them. Keyed by the tree index
 * because `MasterSkillList` carries no skill numbers; `MasterSkillLevelUpdate`
 * does, and is stored under both.
 */
const infoByIndex = observable.map<number, MasterSkillInfo>();
const infoBySkill = observable.map<number, MasterSkillInfo>();

/** In the code page of the pack the tooltips came from (`localData.ts`). */
function cString(bytes: Uint8Array, offset: number, length: number): string {
  return decodeLocalText(bytes, offset, length);
}

function decodeRecords<T>(
  buffer: Uint8Array,
  size: number,
  count: number,
  read: (view: DataView, bytes: Uint8Array) => T | null
): T[] {
  const out: T[] = [];
  for (let i = 0; i < count && (i + 1) * size <= buffer.length; i++) {
    const bytes = buffer.slice(i * size, (i + 1) * size);
    convertBux(bytes, size);
    const entry = read(new DataView(bytes.buffer, bytes.byteOffset, size), bytes);
    if (entry) out.push(entry);
  }
  return out;
}

function parseTree(buffer: Uint8Array): MasterTreeEntry[] {
  return decodeRecords(buffer, TREE_RECORD_SIZE, MAX_RECORDS, (v, b) => {
    const index = v.getUint16(0, true);
    if (!index) return null;
    const group = b[4];
    const skill = v.getInt32(16, true);
    if (index > MASTER_GROUPS * INDICES_PER_GROUP || group >= MASTER_GROUPS || !isMasterSkill(skill)) {
      console.warn(`MasterSkillTreeData: record ${index} outside the tree (group ${group}, skill ${skill})`);
      return null;
    }
    const within = (index - 1) % INDICES_PER_GROUP;
    return {
      index,
      classCode: v.getUint16(2, true),
      group,
      requiredPoints: b[5],
      maxLevel: b[6],
      arrow: b[7],
      requireSkills: [v.getInt32(8, true), v.getInt32(12, true)],
      skill,
      defValue: v.getFloat32(20, true),
      rank: Math.floor(within / MASTER_RANK_COLUMNS) + 1,
      column: within % MASTER_RANK_COLUMNS,
    };
  });
}

function parseTooltips(buffer: Uint8Array): MasterSkillTooltip[] {
  return decodeRecords(buffer, TOOLTIP_RECORD_SIZE, MAX_RECORDS, (v, b) => {
    const skill = v.getInt32(0, true);
    if (!skill) return null;
    if (!isMasterSkill(skill)) {
      console.warn(`MasterSkillTooltip: record with skill ${skill} outside the master range`);
      return null;
    }
    return {
      skill,
      classCode: v.getUint16(4, true),
      info: TOOLTIP_FIELDS.map(([offset, length]) => cString(b, offset, length)),
    };
  });
}

function parseSkillAttributes(buffer: Uint8Array): MasterSkillAttribute[] {
  return decodeRecords(buffer, SKILL_RECORD_SIZE, SKILL_RECORDS, (v, b) => ({
    icon: v.getUint16(SKILL_ICON_OFFSET, true),
    useType: b[SKILL_USE_TYPE_OFFSET],
    brand: b[SKILL_BRAND_OFFSET],
  }));
}

// The tooltips come out of the language pack; drop them on a language change
// and let the next window open fetch the new ones.
onLanguageChanged(() => {
  if (!loading) return;

  loading = null;
  runInAction(() => {
    dataState.loaded = false;
  });
});

/** Load the three tables once; safe to call on every window open. */
export function ensureMasterTreeData(): Promise<void> {
  if (!loading) {
    loading = Promise.all([
      downloadDataFile('Local/MasterSkillTreeData.bmd'),
      downloadLocalDataFile('MasterSkillTooltip'),
      downloadDataFile('Local/Skill.bmd'),
    ])
      .then(([tree, tips, skill]) => {
        treeRecords = parseTree(tree);
        tooltipRecords = parseTooltips(tips);
        skillAttributes = parseSkillAttributes(skill);
        runInAction(() => {
          dataState.loaded = true;
        });
      })
      .catch(err => {
        loading = null;
        throw err;
      });
  }
  return loading;
}

/** Whether the tables have been read (observable). */
export function masterTreeDataLoaded(): boolean {
  return dataState.loaded;
}

/** The tree the hero's class line uses, `None` for an unknown class. */
export function masterTreeClass(charClass = Store.playerData.charClass): MasterTreeClass {
  return TREE_CLASS[charClass] ?? MasterTreeClass.None;
}

/** Class name and the three category headings of the hero's tree. */
export function masterTreeText(): {
  className: string;
  categories: readonly [string, string, string];
} {
  return TREE_TEXT[masterTreeClass()];
}

/** `SetMasterSkillTreeData`: the nodes of the hero's tree, in index order. */
export function masterTreeEntries(): MasterTreeEntry[] {
  const code = masterTreeClass();
  if (!code) return [];
  return treeRecords.filter(e => (e.classCode & code) !== 0);
}

function entryByIndex(index: number): MasterTreeEntry | undefined {
  return masterTreeEntries().find(e => e.index === index);
}

function entryBySkill(skill: number): MasterTreeEntry | undefined {
  return masterTreeEntries().find(e => e.skill === skill);
}

/** `SetMasterSkillToolTipData`: the tooltip strings of a node. */
export function masterSkillTooltip(skill: number): MasterSkillTooltip | undefined {
  const code = masterTreeClass();
  return tooltipRecords.find(t => t.skill === skill && (t.classCode & code) !== 0);
}

/** What the server said about the node, level 0 when nothing yet. */
export function masterSkillInfo(entry: MasterTreeEntry): MasterSkillInfo {
  return (
    infoBySkill.get(entry.skill) ??
    infoByIndex.get(entry.index) ?? { level: 0, value: 0, nextValue: 0 }
  );
}

/** The learned level of a master skill by number, 0 when not learned. */
export function masterSkillLevel(skill: number): number {
  const bySkill = infoBySkill.get(skill);
  if (bySkill) return bySkill.level;
  const entry = entryBySkill(skill);
  return entry ? (infoByIndex.get(entry.index)?.level ?? 0) : 0;
}

/** `CategoryPoint`: levels spent in each of the three groups. */
export function masterCategoryPoints(): number[] {
  const points = new Array<number>(MASTER_GROUPS).fill(0);
  for (const entry of masterTreeEntries()) {
    points[entry.group] += masterSkillInfo(entry).level;
  }
  return points;
}

/** The atlas cell of a master skill's icon (`Magic_Icon`, 25 per row). */
export function masterSkillIconCell(skill: number): { x: number; y: number } {
  const icon = skillAttributes[skill]?.icon ?? 0;
  return {
    x: (icon % MASTER_ICONS_PER_ROW) * MASTER_ICON_WIDTH,
    y: Math.floor(icon / MASTER_ICONS_PER_ROW) * MASTER_ICON_HEIGHT,
  };
}

function isMasterSkill(skill: number): boolean {
  return skill >= MASTER_SKILL_FIRST && skill <= MASTER_SKILL_LAST;
}

/** `CheckParentSkill`: every required master skill is at level 10. */
export function masterParentsMet(entry: MasterTreeEntry): boolean {
  for (const required of entry.requireSkills) {
    if (!required || !isMasterSkill(required)) return true;
    if (masterSkillLevel(required) < RANK_UNLOCK_LEVEL) return false;
  }
  return true;
}

/** `skillPoint[group][rank]`: the highest level among a rank's nodes. */
function rankTopLevel(group: number, rank: number): number {
  let top = 0;
  for (const entry of masterTreeEntries()) {
    if (entry.group === group && entry.rank === rank) {
      top = Math.max(top, masterSkillInfo(entry).level);
    }
  }
  return top;
}

/** `CheckRankPoint`: rank 1 is open; rank N needs a level-10 node in N-1. */
export function masterRankMet(entry: MasterTreeEntry): boolean {
  if (entry.rank === 1) return true;
  return rankTopLevel(entry.group, entry.rank - 1) >= RANK_UNLOCK_LEVEL;
}

/**
 * `CheckBeforeSkill`: a strengthener's base skill (`SkillBrand`) must be
 * learned before the first point, unless the base is innate (use type 4).
 */
export function masterBaseSkillMet(entry: MasterTreeEntry): boolean {
  if (masterSkillInfo(entry).level > 0) return true;
  const brand = skillAttributes[entry.skill]?.brand ?? 0;
  if (!brand) return true;
  if (skillAttributes[brand]?.useType === SKILL_USE_TYPE_INNATE) return true;
  return Store.skills.some(s => s.number === brand);
}

/**
 * `IsNonWeaponSkillOrIsSkillEquipped`: a strengthener of a weapon skill
 * needs that weapon in hand.
 */
export function masterEquipmentMet(entry: MasterTreeEntry): boolean {
  const brand = skillAttributes[entry.skill]?.brand ?? 0;
  if (!brand || !isWeaponSkill(brand)) return true;
  return skillRequirementsMet(brand);
}

/** `RenderIcon`'s colour test: every gate but the point cost passes. */
export function masterSkillOpen(entry: MasterTreeEntry): boolean {
  return (
    masterParentsMet(entry) &&
    masterRankMet(entry) &&
    masterBaseSkillMet(entry) &&
    masterEquipmentMet(entry)
  );
}

/**
 * `CheckAttributeArea`'s refusals, in its order; `null` when a point can be
 * spent on the node right now.
 */
export function masterLearnBlock(entry: MasterTreeEntry): MasterLearnBlock | null {
  const level = masterSkillInfo(entry).level;
  if (level >= entry.maxLevel) return 'maxed';
  if (masterLevelUpPoints() < entry.requiredPoints) return 'points';
  if (!masterEquipmentMet(entry)) return 'equipment';
  if (!masterParentsMet(entry) || !masterRankMet(entry) || !masterBaseSkillMet(entry)) {
    return 'requirements';
  }
  return null;
}

/**
 * The subset of `printf` the tooltip strings use: `%d`, `%s`, `%0.2f`,
 * `%6.2f`, `%I64d`, `%%`. Missing arguments print as empty, like the
 * original's `mu_swprintf` with a short list prints garbage nobody sees.
 */
export function formatMasterText(
  template: string,
  ...args: (number | string)[]
): string {
  let i = 0;
  return template.replace(/%(\d*)(?:\.(\d+))?(I64d|d|s|f)|%%/g, (m, width, prec, kind) => {
    if (m === '%%') return '%';
    const arg = args[i++];
    if (arg === undefined) return '';
    let out: string;
    if (kind === 'f') out = Number(arg).toFixed(prec ? Number(prec) : 6);
    else if (kind === 's') out = String(arg);
    else out = String(Math.trunc(Number(arg)));
    const w = width ? Number(width) : 0;
    return w > out.length ? ' '.repeat(w - out.length) + out : out;
  });
}

function pushLines(
  lines: MasterTooltipLine[],
  text: string,
  color: MasterTooltipLine['color'],
  bold = false
): void {
  // `#` is the original's line break; blank segments are spacer lines.
  for (const part of text.split('#')) {
    lines.push({ text: part.trim(), color, bold });
  }
}

/** `RenderToolTip`: the lines of a node's hover tip, coloured as drawn. */
export function masterSkillTooltipLines(entry: MasterTreeEntry): MasterTooltipLine[] {
  const tip = masterSkillTooltip(entry.skill);
  const lines: MasterTooltipLine[] = [];
  const name = skillDefinition(entry.skill)?.name ?? `Skill ${entry.skill}`;
  lines.push({ text: name, color: 1, bold: true });
  if (!tip) return lines;

  const { level, value, nextValue } = masterSkillInfo(entry);
  const [info1, info2, info3, info4, info5, info6, info7] = tip.info;

  lines.push({ text: formatMasterText(info1, entry.rank, level, entry.maxLevel), color: 0 });

  if (entry.defValue === -1) pushLines(lines, info2, 0);
  else pushLines(lines, formatMasterText(info2, level !== 0 ? value : entry.defValue), 0);

  if (level !== 0 && level < entry.maxLevel) {
    pushLines(lines, MASTER_TEXT.nextLevel, 4);
    pushLines(lines, formatMasterText(info2, nextValue), 0, true);
  }

  if (level < entry.maxLevel) {
    pushLines(lines, MASTER_TEXT.requirements, 1);
    const affordable = entry.requiredPoints <= masterLevelUpPoints();
    pushLines(lines, formatMasterText(info3, entry.requiredPoints), affordable ? 0 : 2, true);
  }

  if (info4) pushLines(lines, info4, masterBaseSkillMet(entry) ? 0 : 2);

  if (level < entry.maxLevel && entry.rank !== 1) {
    if (info5) pushLines(lines, info5, masterRankMet(entry) ? 0 : 2);
    entry.requireSkills.forEach((required, i) => {
      if (!required || !isMasterSkill(required)) return;
      const text = i === 0 ? info6 : info7;
      if (text) pushLines(lines, text, masterSkillLevel(required) < RANK_UNLOCK_LEVEL ? 2 : 0);
    });
  }

  return lines.filter((l, i, all) => l.text || (i > 0 && all[i - 1].text));
}

/**
 * Spend one master point on the skill: `AddMasterSkillPoint` (F3 52). The
 * server answers with `MasterSkillLevelUpdate`; nothing changes locally
 * until it does.
 */
export function learnMasterSkill(skill: number): void {
  const packet = AddMasterSkillPointPacket.createPacket();
  packet.SkillId = skill;
  Store.sendToGS(packet.buffer);
}

EventBus.on('MasterSkillList', packet => {
  const p = new MasterSkillListPacket(packet);
  const b = p.buffer;
  // The generated reader drops the two floats; read the 12-byte entries
  // (index, level, pad, value, next value) straight from the buffer.
  const count = p.MasterSkillCount;
  runInAction(() => {
    infoByIndex.clear();
    infoBySkill.clear();
    for (let i = 0, at = 12; i < count && at + 12 <= b.byteLength; i++, at += 12) {
      infoByIndex.set(b.getUint8(at), {
        level: b.getUint8(at + 1),
        value: b.getFloat32(at + 4, true),
        nextValue: b.getFloat32(at + 8, true),
      });
    }
  });
});

EventBus.on('MasterSkillLevelUpdate', packet => {
  const p = new MasterSkillLevelUpdatePacket(packet);
  if (!p.Success) return;
  const info: MasterSkillInfo = {
    level: p.Level,
    // Generated as uint32; they are IEEE floats on the wire.
    value: p.buffer.getFloat32(20, true),
    nextValue: p.buffer.getFloat32(24, true),
  };
  runInAction(() => {
    infoBySkill.set(p.MasterSkillNumber, info);
    const index = p.MasterSkillIndex || entryBySkill(p.MasterSkillNumber)?.index;
    if (index) infoByIndex.set(index, info);
  });
  setMasterLevelUpPoints(p.MasterLevelUpPoints);
});

function reset(): void {
  // The list is sent once, on entering the game; the learned levels
  // survive a warp. Nothing else is held: the tables are static data.
}

// ---- 3. the layer ----------------------------------------------------------

export const masterTreeLayer: SkillLayer = {
  name: 'masterTree',
  reset,
};
