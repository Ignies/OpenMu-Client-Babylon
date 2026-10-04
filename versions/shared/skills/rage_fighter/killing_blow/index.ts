import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { delay, entityGone, entityPos, entityYaw } from '@/controllers/fx/core';
import { cm, seq, slash, ticks, type SkillContext, type Step } from '@/controllers/skills/visuals';
import { type Entity } from '@/ecs/world';
import { playCombat } from '@/controllers/sound';

import { A } from '@/controllers/combat/recipes';

/** sbumb.jpg: four 64 px cells in a row (ZzzOpenData.cpp:4621). */
const SBUMB = 'Effect/sbumb.OZJ';
/** BITMAP_SBUMB's LifeTime at the packet (ZzzEffect.cpp:5855-5862). */
const SBUMB_TICKS = 20;
/** Rage_Thrust_Att on LifeTime 15, 9 and 6 (MoveHandlers.cpp:9211-9215). */
const THRUST_ATT_AT = new Set([15, 9, 6]);

const rnd = (n: number): number => Math.floor(Math.random() * n);

/**
 * The BITMAP_SBUMB particle (ZzzEffectParticle.cpp:3808-3812, :8850-8854, :9313-9316): LifeTime 4, one 64 px cell
 * a tick, `Width * 0.25` = 64 cm x Scale square.
 */
function sbumbBurst(c: SkillContext, target: Entity): void {
  const p = entityPos(target, 0, new Vector3());
  p.x += cm(rnd(80) - 40);
  p.z += cm(rnd(80) - 40);
  p.y += cm(rnd(120) + 30);
  const scale = (1.5 + rnd(10) * 0.02) * 2.1;
  effects.spawn('sprite', c.scene, p, { texture: SBUMB, colour: RGBS.white, size: cm(64) * scale, seconds: ticks(4), cells: { w: 64, h: 64, count: 4 }, fadeTail: 0 });
}

/**
 * BITMAP_SBUMB at the target, LifeTime 20 (MonkSystem.cpp:1101): it moves on ticks 1-20 at LifeTime 21 - tick.
 * Below 17 (ticks 5-20) a burst on the target each tick; on 15, 9 and 6 (ticks 6, 12, 15) Rage_Thrust_Att
 * (MoveHandlers.cpp:9196-9216).
 */
const thrustBursts: Step = (_at, c) => {
  const target = c.target;
  if (!target) return;
  for (let tick = 1; tick <= SBUMB_TICKS; tick++) {
    const lifeTime = SBUMB_TICKS + 1 - tick;
    if (lifeTime >= 17 && !THRUST_ATT_AT.has(lifeTime)) continue;
    delay(ticks(tick), () => {
      if (entityGone(target)) return;
      if (lifeTime < 17) sbumbBurst(c, target);
      const p = c.caster.transform?.pos;
      if (THRUST_ATT_AT.has(lifeTime) && p) playCombat('Sound/Ragefighter/Rage_Thrust_Att', { x: p.x, z: p.z });
    });
  }
};

export default defineSkill({
  id: 260,
  name: "Killing Blow",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [551, 554],
  // 260-270 Rage Fighter (MonkSystem.cpp RageCreateEffect).
  // 260 Killing Blow: MODEL_WOLF_HEAD_EFFECT at the caster aimed at the target; BITMAP_SBUMB's bursts, see thrustBursts.
  visual: {
    cast: seq(
      slash(RGBS.gold, TEX.motionBlur, 0.7),
      (_at, c) => effects.spawn('model', c.scene, entityPos(c.caster, 0.9, new Vector3()), { model: MODEL.wolfHead, seconds: 0.6, colour: RGBS.gold, grow: 1.4, yaw: entityYaw(c.caster) })
    ),
    impact: thrustBursts,
  },
  sound: 'Sound/Ragefighter/Rage_Thrust', // Killing Blow
  // --- Rage Fighter (CMonkSystem::SetRageSkillAni, MonkSystem.cpp:389) ----
  clip: { ground: A.PLAYER_SKILL_THRUST }, // Killing Blow
  stepIn: 'cast',
});
