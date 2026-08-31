import { PlayerAction } from './objects/enum';
import type { Item } from '../ecs/world';
import { chooseAttackAction } from './playerActionMapper';
import type { SkillDefinition } from './skillsDatabase';
import { magicClip, skillClip, type CastContext } from '../combat/skillClips';
import { castsOnSelf } from '../combat/castTargets';

/**
 * Client-side casting rules. The wire format is decided by the OpenMU skill
 * type: area skills go out as AreaSkill (0x1E, the original's
 * SendRequestMagicContinue), everything else as TargetedSkill (0x19,
 * SendRequestMagic) — ZzzInterface.cpp:2325-2470.
 */

/**
 * Teleport / Teleport Ally are neither targeted nor area casts on the wire:
 * OpenMU's `WizardTeleportAction` answers `EnterGateRequest` (C3 1C, gate 0,
 * the target square — the original's SendRequestTeleport) and
 * `TeleportTarget` (C3 B0, party member + square); it replies with a
 * same-map `MapChanged` that moves the hero, or one at the old square when
 * refused.
 */
export const TELEPORT = 6;
export const TELEPORT_ALLY = 15;

export function isTeleportSkill(num: number): boolean {
  return num === TELEPORT || num === TELEPORT_ALLY;
}

export function isAreaSkill(def: SkillDefinition): boolean {
  return (
    def.type === 'AreaSkillAutomaticHits' ||
    def.type === 'AreaSkillExplicitTarget'
  );
}

/**
 * Whether a cast with nothing suitable selected lands on the hero. The rule
 * itself — self-only versus party-member-or-self versus hostile — is
 * `combat/castTargets`; this stays exported because the hotbar and the skill
 * list ask the same question.
 */
export function isSelfCastable(def: SkillDefinition): boolean {
  return castsOnSelf(def);
}

export function isSpell(def: SkillDefinition): boolean {
  return (
    def.damageType === 'Wizardry' ||
    def.damageType === 'Curse' ||
    (def.damageType === 'None' && def.type !== 'DirectHit')
  );
}

/**
 * The clip a cast plays, for the hero and for everyone else in scope alike.
 * Three tiers, in the order the original tries them:
 *
 *  1. the per-skill clip (`combat/skillClips` — every `UseSkill*` /
 *     `Attack*` / `ReceiveMagic` case, with its mount and map branches),
 *  2. `SetPlayerMagic` for a spell (ZzzCharacter.cpp:1238-1262) — the
 *     female hand-raise, the male HAND1/HAND2 coin toss, or the mount's own
 *     cast clip,
 *  3. the weapon swing, for a physical skill with no clip of its own.
 */
export function chooseSkillAction(
  def: SkillDefinition,
  app: { leftHand: Item | null; rightHand: Item | null } | undefined,
  ctx: CastContext = {}
): PlayerAction {
  const dedicated = skillClip(def.num, ctx);
  if (dedicated !== null) return dedicated;
  if (isSpell(def)) return magicClip(ctx);
  return chooseAttackAction(app, !!ctx.alternate);
}

/** AreaSkill.Rotation: (BYTE)(Angle / 360 * 256) of the hero's yaw. */
export function rotationByte256(rotYRadians: number): number {
  let deg = ((rotYRadians * 180) / Math.PI) % 360;
  if (deg < 0) deg += 360;
  return Math.round((deg / 360) * 256) & 0xff;
}

// ---- skill icons -------------------------------------------------------

/**
 * `CNewUISkillList::RenderSkillIcon` (NewUIMainFrameWindow.cpp:2087) draws
 * every icon as a 20 x 28 cell of a 256 x 256 sheet - never 32 x 32, which is
 * why the icons used to come out as quarters of four neighbours.
 */
export const SKILL_ICON_WIDTH = 20;
export const SKILL_ICON_HEIGHT = 28;

/** `AT_SKILL_SPIRAL_SLASH`: the first skill of the second sheet. */
const SPIRAL_SLASH = 57;
/** `AT_SKILL_KILLING_BLOW`: the first skill of the Rage Fighter sheet. */
const KILLING_BLOW = 260;
/** `AT_SKILL_MASTER_BEGIN`: the master tree draws off its own 512 sheet. */
export const MASTER_SKILL_FIRST = 300;
/** `AT_SKILL_STUN` .. `AT_SKILL_REMOVAL_BUFF`: castle-siege commands. */
const SIEGE_FIRST = 67;
const SIEGE_LAST = 72;
/** `AT_SKILL_PLASMA_STORM_FENRIR`: the only skill on the command sheet. */
const PLASMA_STORM = 76;

/** Sheet, and the greyed copy the original swaps in for `bCantSkill`. */
const SHEETS = {
  skill1: ['newui_skill.OZJ', 'newui_non_skill.OZJ'],
  skill2: ['newui_skill2.OZJ', 'newui_non_skill2.OZJ'],
  skill3: ['newui_skill3.OZJ', 'newui_non_skill3.OZJ'],
  command: ['newui_command.OZJ', 'newui_non_command.OZJ'],
} as const;

/**
 * Sheet-2 cells the row maths cannot reach. The eight columns the generic
 * rule walks were full long before Season 6, so every skill added after them
 * has its column and row written out in `RenderSkillIcon` - this table
 * is that `else if` chain, `[column, row]`.
 */
const SHEET2_CELLS: Record<number, readonly [number, number]> = {
  214: [0, 3], // Drain Life
  215: [1, 3], // Chain Lightning
  216: [2, 3], // (Sudden Ice)
  217: [3, 3], // Damage Reflection
  219: [4, 3], // Sleep
  220: [5, 3], // (Blind)
  223: [6, 3], // Explosion
  224: [7, 3], // Requiem
  221: [8, 3], // Weakness
  222: [9, 3], // Innovation
  218: [10, 3], // Berserker
  225: [11, 3], // Pollution
  230: [2, 3], // Lightning Shock
  232: [7, 2], // Strike of Destruction
  233: [8, 2], // Expansion of Wizardry
  234: [9, 2], // Recovery
  235: [0, 8], // Multi-Shot
  236: [1, 8], // Flame Strike
  237: [2, 8], // Gigantic Storm
  238: [3, 8], // Chaotic Diseier
};

function cell(file: string, column: number, row: number) {
  return { file, x: column * SKILL_ICON_WIDTH, y: row * SKILL_ICON_HEIGHT };
}

/**
 * Where a skill's icon sits, and on which sheet. `disabled` is
 * `bCantSkill`: the original adds 6 to the texture id, which is the
 * `newui_non_*` copy of the same sheet - both are shipped, so the icon
 * is the real greyed art rather than a CSS filter.
 *
 * Master-tree skills return `null`: their cell comes from `Skill.bmd`
 * (`Magic_Icon`) on a sheet of its own, which `skills/masterTree` owns.
 */
export function skillIconCell(
  num: number,
  disabled = false
): { file: string; x: number; y: number } | null {
  if (num <= 0 || num >= MASTER_SKILL_FIRST) return null;
  const i = disabled ? 1 : 0;
  if (num === PLASMA_STORM) return cell(SHEETS.command[i], 4, 0);
  const special = SHEET2_CELLS[num];
  if (special) return cell(SHEETS.skill2[i], special[0], special[1]);
  if (num >= KILLING_BLOW) {
    const n = num - KILLING_BLOW;
    return cell(SHEETS.skill3[i], n % 12, Math.floor(n / 12));
  }
  if (num >= SPIRAL_SLASH) {
    const n = num - SPIRAL_SLASH;
    return cell(SHEETS.skill2[i], n % 8, Math.floor(n / 8));
  }
  return cell(SHEETS.skill1[i], (num - 1) % 8, Math.floor((num - 1) / 8));
}

/**
 * `CNewUISkillList::Render`'s filter on the learned-skill fan: the castle
 * siege commands and every master-tree entry are learned skills the hero can
 * never put on a bar slot, so they are kept out of the fan and out of the
 * default hot-key layout.
 */
export function isHotbarSkill(num: number): boolean {
  if (num < 1 || num >= MASTER_SKILL_FIRST) return false;
  return num < SIEGE_FIRST || num > SIEGE_LAST;
}
