/**
 * The combat half of a skill file: `registerSkills` (controllers/skills) hands each skill's
 * fields here and this writes them into the combat tables. The only writer of those tables.
 */
import type { PlayerAction } from '@versions/shared/objects/enum';
import type { CombatLayer } from './layer';
import { SHOCK_IMMUNE_CLIPS, SKILL_CLIPS, type ClipPick, type SkillClipSet } from './recipes';
import { SKILL_TARGETS, type CastTarget } from './castTargets';
import { FACING_HELD_CLIPS, SKILL_STEP_IN } from './skillMovement';
import {
  MAGIC_HIT_SKILLS,
  SKILL_OTHERS_SEE,
  SKILL_POSE_CLIPS,
  SKILL_QUIET_MOUNTS,
  SKILL_SWINGS,
  SKILL_SWORD_COUNT,
  SPELL_CAST_SKILLS,
  type CastContext,
  type PoseClip,
} from './skillClips';
import { SKILL_KILLS, type SkillKill } from './skillKills';
import { EXPLICIT_HIT_SKILLS } from './areaHit';
import { skillHooks, type CombatHooks } from './skillHooks';

/** The fields of a skill file the combat controller reads (see `SkillDef` for each). */
export interface SkillCombatRules {
  readonly clip?: SkillClipSet | ClipPick;
  readonly poseClip?: PoseClip;
  readonly swing?: 'highBow';
  readonly swordCount?: boolean;
  readonly castsAsSpell?: true;
  readonly othersSee?: Partial<Record<PlayerAction, PlayerAction>>;
  readonly quietOn?: readonly NonNullable<CastContext['mount']>[];
  readonly magicIsHit?: true;
  readonly noFlinch?: readonly PlayerAction[];
  readonly holdsFacing?: readonly PlayerAction[];
  readonly target?: CastTarget;
  readonly stepIn?: 'cast' | 'midClip';
  readonly explicitHits?: true;
  readonly kill?: SkillKill;
  readonly combat?: { readonly layer?: CombatLayer; readonly hooks?: CombatHooks };
}

/** Write one skill's combat fields into the tables; `addLayer` registers its layer with the facade. */
export function registerSkillRules(id: number, d: SkillCombatRules, addLayer: (layer: CombatLayer) => void): void {
  if (d.clip) (SKILL_CLIPS as Record<number, SkillClipSet | ClipPick>)[id] = d.clip;
  if (d.poseClip) SKILL_POSE_CLIPS[id] = d.poseClip;
  if (d.swing) SKILL_SWINGS[id] = d.swing;
  if (d.swordCount !== undefined) SKILL_SWORD_COUNT[id] = d.swordCount;
  if (d.castsAsSpell) SPELL_CAST_SKILLS.add(id);
  if (d.othersSee) SKILL_OTHERS_SEE[id] = d.othersSee;
  if (d.quietOn) SKILL_QUIET_MOUNTS[id] = d.quietOn;
  if (d.magicIsHit) MAGIC_HIT_SKILLS.add(id);
  for (const clip of d.noFlinch ?? []) SHOCK_IMMUNE_CLIPS.add(clip);
  for (const clip of d.holdsFacing ?? []) FACING_HELD_CLIPS.add(clip);
  if (d.target) SKILL_TARGETS[id] = d.target;
  if (d.stepIn) SKILL_STEP_IN[id] = d.stepIn;
  if (d.explicitHits) EXPLICIT_HIT_SKILLS.add(id);
  if (d.kill) SKILL_KILLS[id] = d.kill;
  if (d.combat?.layer) addLayer(d.combat.layer);
  Object.assign(skillHooks, d.combat?.hooks);
}
