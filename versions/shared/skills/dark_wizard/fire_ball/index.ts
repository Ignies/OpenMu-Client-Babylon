import { defineSkill } from '@/controllers/skills/define';
import { DW1_RELEASE, FireBallLook, fireBallFlight, lavaChips, perTickRoll, placeBodyLight, releaseSound, softExplosion } from '../_shared';
import { FIRE_BALL_EMBERS, FIRE_PUFF, FIRE_SPARKS, TEX } from '@/controllers/fx/recipes';
import { delay, entityGone, entityPos, type RGB } from '@/controllers/fx/core';
import { Step, burn, cm, facing, hitSparks, particles, perTick, scorch, seq, ticks, toward } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';

/**
 * 4 Fire Ball (ZzzCharacter.cpp:5031-5034): MODEL_FIRE sub1 from the caster's feet +120 cm along the bearing
 * to the target at the release, 50 cm a tick for LT 60, no homing, Scale 0.8-1.1, the tail at
 * BlendMeshLight 0 (ZzzEffect.cpp:2640-2645, :7931-7936). Within 100 cm (2D) of the live target it dies and
 * `arrive` runs at the ball (CheckTargetRange, ZzzEffect.cpp:244-282); a ball whose target is gone flies on.
 */
const fireBall = (arrive: Step, look?: FireBallLook & { tailRoll?: readonly [number, number, number] }): Step => (at, c) => {
  delay(DW1_RELEASE, () => {
    if (entityGone(c.caster)) return;
    releaseSound('Sound/eMeteorite')(at, c);
    const from = entityPos(c.caster, cm(120), new Vector3());
    const target = c.target && !entityGone(c.target) ? c.target : null;
    const dir = target ? toward(from, entityPos(target, 0, new Vector3())) : facing(c);
    const to = from.add(dir.scale(ticks(60) * perTick(50)));
    const probe = new Vector3();
    const near = (p: Vector3): boolean => {
      if (!target || entityGone(target)) return false;
      entityPos(target, 0, probe);
      return (p.x - probe.x) ** 2 + (p.z - probe.z) ** 2 <= 1;
    };
    const tail = look?.tailRoll ? perTickRoll(...look.tailRoll) : 0;
    fireBallFlight(c, 4, from, to, { scale: 0.8 + Math.random() * 0.3, tail, alongPath: tail !== 0, glow: look?.glow, embers: look?.embers }, p => arrive(p, c), near);
  });
};

/** Fire Ball on the graded tiers: the lava core under a glow card, its tail flickering low, shedding embers. */
const FIRE_BALL_LOOK = {
  glow: { texture: TEX.flare, colour: [1, 0.4, 0.1] as RGB, size: 0.9, spin: 3 },
  embers: FIRE_BALL_EMBERS,
  tailRoll: [0.3, 3, 0.1] as const,
};

/** Fire Ball's hit on the graded tiers: the same 2 chips from the ball, with a small burst, sparks and a flame puff. */
const fireBallImpact: Step = seq(
  softExplosion([1, 0.55, 0.2], 0.45),
  hitSparks(FIRE_SPARKS, 12),
  particles({ recipe: FIRE_PUFF, count: 4 }),
  lavaChips(2),
  placeBodyLight(4, 'hit'),
  scorch(0.6),
  burn(0.6)
);

export default defineSkill({
  id: 4,
  name: "Fire Ball",
  // 4 Fire Ball: at the release, MODEL_FIRE sub1 flies straight from the caster; within 100 cm of the target
  // 2 chips drop from the ball (fireBall). Enhanced: a glow, embers and a low tail in flight, a small burst on the hit.
  visual: {
    impact: fireBall(lavaChips(2)),
    enhanced: { impact: fireBall(fireBallImpact, FIRE_BALL_LOOK) },
  },
});
