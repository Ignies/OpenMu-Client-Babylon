/** The hook ran but called no `SetAction`: the clip in hand plays on. */
export const KEEP_CLIP = -1;

/** A MonsterActionType, `'keep'` (KEEP_CLIP) or `'coin'` (`rand() % 2`: Attack1 or Attack2). */
export type MonsterSwingClip = number | 'keep' | 'coin';

/**
 * Which clip a monster swings with, read off the skill it last cast (`c->Skill`). Matches by npc
 * number or by body; `worlds` limits it to those maps (a map hook), otherwise it runs on any map.
 */
export type MonsterSwingDef = {
  name: string;
  monsters?: readonly number[];
  models?: readonly number[];
  worlds?: readonly number[];
  bySkill?: Readonly<Record<number, MonsterSwingClip>>;
  otherwise: MonsterSwingClip;
};

/** What a monster's ReceiveMagic (0x19) does with one skill. */
export type MonsterCastDef = {
  skill: number;
  /** The original's `AT_SKILL_*` name. */
  name: string;
  /**
   * `attack`: SetPlayerAttack and rewind; `attackHeld`: SetPlayerAttack, no rewind; `magic`:
   * SetPlayerMagic and rewind; `appear`: the Appear clip. None: the clip in hand plays on.
   */
  clip?: 'attack' | 'attackHeld' | 'magic' | 'appear';
  /** false: its case starts no AttackTime. */
  attackTime?: false;
  /** false: `c->Skill` is not recorded. */
  recordsSkill?: false;
};

export function defineMonsterSwing(def: MonsterSwingDef): MonsterSwingDef {
  return def;
}

export function defineMonsterCast(def: MonsterCastDef): MonsterCastDef {
  return def;
}

const swings: MonsterSwingDef[] = [];
const casts = new Map<number, MonsterCastDef>();

export function registerMonsterSwings(defs: Iterable<MonsterSwingDef>): void {
  for (const d of defs) if (!swings.some(s => s.name === d.name)) swings.push(d);
}

export function registerMonsterCasts(defs: Iterable<MonsterCastDef>): void {
  for (const d of defs) casts.set(d.skill, d);
}

/** The registered swing rules: any-map ones (`mapped` false) or map hooks (`mapped` true). */
export function monsterSwingRule(monster: number, model: number, world: number, mapped: boolean): MonsterSwingDef | undefined {
  return swings.find(
    s =>
      (s.worlds !== undefined) === mapped &&
      (!s.worlds || s.worlds.includes(world)) &&
      (!!s.monsters?.includes(monster) || !!s.models?.includes(model))
  );
}

export function monsterCastOf(skill: number): MonsterCastDef | undefined {
  return casts.get(skill);
}
