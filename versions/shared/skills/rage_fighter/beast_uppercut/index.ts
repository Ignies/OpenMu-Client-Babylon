import { defineSkill } from '@/controllers/skills/define';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { delay, entityPos } from '@/controllers/fx';
import { IMPACT_HEIGHT, TICK, seq, slash, sprite, steelHit, ticks, type SkillContext, type Step } from '@/controllers/skills/visuals';
import { playCombat } from '@/controllers/sound';
import { type Entity } from '@/ecs/world';
import { whenClipKey } from '../../_shared';

import { A } from '@/controllers/combat/recipes';

/** PLAYER_SKILL_STAMP's PlaySpeed at attack speed 0 (SetAttackSpeed, ZzzCharacter.cpp:1019). */
const STAMP_SPEED = 0.4;

/**
 * Ticks after MODEL_DOWN_ATTACK_DUMMY_R is made at which the two blows land, for a STAMP PlaySpeed. The dummies
 * play at `Velocity = 2 * PlaySpeed` a tick, move k seeing key (k - 1) * v (ZzzEffect.cpp:5864-5872, :8520-8530).
 * R hits at key 3 and hands over to L at key 6; L, first moving the tick after, hits at its key 5
 * (MoveHandlers.cpp:9221-9309).
 */
export function uppercutBlows(playSpeed: number): [number, number] {
  const v = 2 * playSpeed;
  const reach = (key: number): number => {
    let k = 1;
    while ((k - 1) * v < key) k++;
    return k;
  };
  return [reach(3), reach(6) + reach(5)];
}

const gone = (e: Entity): boolean => !e.transform || !!e.objOutOfScope;

/** One blow: CreateBomb3 on the target and Rage_Stamp_Att (the stand-in burst draws the bomb). */
const blow = (c: SkillContext): void => {
  const target = c.target;
  if (gone(c.caster) || !target || gone(target)) return;
  seq(steelHit, sprite({ texture: TEX.impact, colour: RGBS.gold, size: 1, seconds: 0.4, rise: 2, grow: 1.6 }))(entityPos(target, IMPACT_HEIGHT, new Vector3()), c);
  const p = c.caster.transform?.pos;
  if (p) playCombat('Sound/Ragefighter/Rage_Stamp_Att', { x: p.x, z: p.z });
};

/** RageCreateEffect: the dummy and Rage_Stamp (MonkSystem.cpp:1107-1119); its PlaySpeed is read a tick in, once the clip is on. */
const downAttack: Step = (_at, c) => {
  const p = c.caster.transform?.pos;
  if (p) playCombat('Sound/Ragefighter/Rage_Stamp', { x: p.x, z: p.z });
  delay(TICK, () => {
    const m = c.caster.modelObject;
    const speed = m?.CurrentAction === A.PLAYER_SKILL_STAMP && m.AnimationSpeed > 0 ? m.AnimationSpeed : STAMP_SPEED;
    for (const t of uppercutBlows(speed)) delay(ticks(t - 1), () => blow(c));
  });
};

/**
 * Another caster's effect comes with the packet (WSclient.cpp:13404-13418); the hero's own waits for STAMP key 2
 * and is lost if the clip is left first (SkillCast.cpp:1104-1115, :1131-1136).
 */
const uppercut: Step = (at, c) => {
  if (c.caster.localPlayer) whenClipKey(A.PLAYER_SKILL_STAMP, 2, 14, downAttack, false, 'drop')(at, c);
  else downAttack(at, c);
};

export default defineSkill({
  id: 261,
  name: "Beast Uppercut",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [552, 555],
  // 261 Beast Uppercut: MODEL_DOWN_ATTACK_DUMMY_R / _L are not converted - a rising gold burst stands in on each blow.
  // Rage_Stamp is the effect's (MonkSystem.cpp:1117), so it plays with it rather than at the click; see uppercut.
  visual: { cast: slash(RGBS.gold, TEX.motionBlur, 0.7), impact: uppercut },
  clip: { ground: A.PLAYER_SKILL_STAMP }, // Beast Uppercut
  stepIn: 'midClip',
});
