import { defineSkill } from '@/controllers/skills/define';
import { BUFF_VISUALS, BuffArrival, Step, after, cm, keepLook, seq, ticks } from '@/controllers/skills/visuals';
import { CLOAK_EFFECT, bearing } from '../_shared';
import { type Entity } from '@/ecs/world';
import { MODEL, RGBS, SOUL_MOTES, TEX } from '@/controllers/fx/recipes';
import { entityGone, entityPos, entityYaw, followEntity, type ParticleRecipe, type RGB } from '@/controllers/fx/core';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { type SpearJoints } from '@/controllers/fx/aura';
import { effects } from '@/controllers/fx';
import { playCombat } from '@/controllers/sound/combat';

import { SkillLight } from '@/controllers/lighting/skills';
import { effectLight } from '@/controllers/lighting/recipes';

// ---- dw3 steps -------------------------------------------------------------------

/** eBuff_WizDefense and eBuff_Cloaking (_enum.h:3899, :3913); OpenMU's effect ids are the same. */
const SOUL_BARRIER_EFFECT = 4;
/** The 0x19 sets AttackTime 1 and the impact fires at 15 (WSclient.cpp:4273, ZzzCharacter.cpp:4135-4139). */
const SOUL_BARRIER_IMPACT = ticks(14);
/** The impact recreates the five joints at width 20 (ZzzCharacter.cpp:4985-4989); the buff packet's are 50. */
const SOUL_KNOT_IMPACT_WIDTH = cm(20);
/** A knot that the seen impact has rebuilt thin, until the buff next arrives or ends. */
const soulKnotWidth = new WeakMap<Entity, number>();

/** Rebuild the Soul Barrier knot on `e` at `width` (DeleteJoint + 5x CreateJoint); null is the packet's width. */
function rebuildSoulKnot(scene: Scene, e: Entity, width: number | null): void {
  if (width === null) soulKnotWidth.delete(e);
  else soulKnotWidth.set(e, width);
  keepLook(scene, e, SOUL_BARRIER_EFFECT, null);
  keepLook(scene, e, SOUL_BARRIER_EFFECT, BUFF_VISUALS[SOUL_BARRIER_EFFECT] ?? null);
}

/**
 * Soul Barrier's impact on the target, 14 ticks after the packet (ZzzCharacter.cpp:4972-4990): nothing on
 * a cloaked body, else SOUND_SOULBARRIER again and, with `thin`, the knot rebuilt at width 20.
 */
const soulBarrierImpact = (thin: boolean): Step =>
  after(SOUL_BARRIER_IMPACT, (_at, c) => {
    const to = c.target ?? c.caster;
    if (!to.transform || entityGone(to) || to.buffs?.has(CLOAK_EFFECT)) return;
    playCombat('Sound/eSoulBarrier', to.transform.pos);
    if (thin) rebuildSoulKnot(c.scene, to, SOUL_KNOT_IMPACT_WIDTH);
  });

const SHELL_FACING = (10 * Math.PI) / 180;

/**
 * MODEL_MAGIC_CAPSULE2 on the hero when a blow lands while Soul Barrier holds and the last attacker
 * (the original's AttackPlayer) faces him within 10 degrees (WSclient.cpp:3282-3291). Protect02 at the
 * default Scale 0.9, facing the attacker, LT 20, BlendMesh 0, fading over the last 10 ticks
 * (EffectRegistry.cpp:56, EffectBehaviors.cpp:73-84). The original compares raw angles with no wrap;
 * this wraps, so a bearing across 0/360 still counts.
 */
export function playSoulBarrierShell(scene: Scene, hero: Entity, attacker: Entity | null): void {
  if (!attacker?.transform || !hero.transform || attacker === hero || !hero.buffs?.has(SOUL_BARRIER_EFFECT)) return;
  const bearing = Math.atan2(hero.transform.pos.z - attacker.transform.pos.z, hero.transform.pos.x - attacker.transform.pos.x) + Math.PI / 2;
  const off = bearing - attacker.transform.rot.y;
  if (Math.abs(Math.atan2(Math.sin(off), Math.cos(off))) >= SHELL_FACING) return;
  effects.spawn('model', scene, entityPos(hero, 0, new Vector3()), {
    model: MODEL.protect2,
    seconds: ticks(20),
    scale: 0.9,
    colour: RGBS.white,
    yaw: bearing + Math.PI,
    follow: followEntity(hero, 0),
    blendMesh: 0,
    fadeTail: 0.5,
  });
}

/** SOUND_SOULBARRIER as the buff lands on a player (InsertBuffPhysicalEffect, WSclient.cpp:15484-15494). */
function soulBarrierArrives(e: Entity): void {
  if (e.playerAnimation && e.transform) playCombat('Sound/eSoulBarrier', e.transform.pos);
}

/** Every arrival deletes the knot and redraws it at the packet's width 50, with the sound. Handled when active. */
const soulBarrierArrival: BuffArrival = (scene, e, active) => {
  soulKnotWidth.delete(e);
  if (!active) return false;
  soulBarrierArrives(e);
  rebuildSoulKnot(scene, e, null);
  return true;
};

// ---- dw3 enhanced (the graded tiers) --------------------------------------------

/** The knot's blue as it reads on screen: flareBlue under its white Light. */
const SOUL_SEAL: RGB = [0.35, 0.7, 1];
/** The shell a little deeper than the knot: three Protect02 at once wash to white at the knot's own blue. */
const SOUL_SHELL: RGB = [0.2, 0.55, 1];
const SOUL_SEAL_MOTES: ParticleRecipe = { ...SOUL_MOTES, colour: SOUL_SEAL, size: 0.2, life: 1, power: 0.7, box: [0.45, 0.6, 0.45], endScale: 0.4 };

/**
 * Enhanced: the impact's width-20 rebuild read as the barrier sealing - a blue flare at the chest, the
 * hit shell's Protect02 closing round the body from three sides, a blue pool on the ground and motes lifting off.
 */
const soulBarrierSeal: Step = after(SOUL_BARRIER_IMPACT, (_at, c) => {
  const to = c.target ?? c.caster;
  if (!to.transform || entityGone(to) || to.buffs?.has(CLOAK_EFFECT)) return;
  const chest = followEntity(to, SOUL_KNOT.base);
  const feet = followEntity(to, 0);
  const p = chest(new Vector3());
  effects.spawn('sprite', c.scene, p, { texture: TEX.flareBlue, colour: SOUL_SEAL, size: 2.2, seconds: 0.4, grow: 1.4, growFrom: 0.4, fadeTail: 0.6, follow: chest });
  for (let i = 0; i < 3; i++) {
    const yaw = entityYaw(to) + (i * 2 * Math.PI) / 3;
    effects.spawn('model', c.scene, feet(new Vector3()), { model: MODEL.protect2, seconds: 0.6, scale: 0.8, grow: 0.85, colour: SOUL_SHELL, alpha: 0.7, yaw, follow: feet, blendMesh: 0, fadeIn: 0.3, fadeTail: 0.6 });
  }
  effects.spawn('ring', c.scene, feet(new Vector3()), { texture: TEX.flareBlue, colour: SOUL_SEAL, scale: 2.4, grow: 1.2, seconds: 0.8, fadeIn: 0.15, fadeTail: 0.7, follow: feet });
  effects.spawn('particles', c.scene, p, { recipe: SOUL_SEAL_MOTES, count: 14, follow: chest });
});
/** Soul Barrier's five sub0 joints: white, width 50 from the packet path (WSclient.cpp:15491), 20 once a seen impact rebuilds them; `z = target + 10 + 110 + 120 v.z` (ZzzEffectJoint.cpp:4504, :4523). */
const SOUL_KNOT: SpearJoints = { count: 5, width: 0.5, colour: RGBS.white, radius: 0.8, base: 1.2, lift: 1.2, flare: true };

/** Soul Barrier's enhanced light: the knot's blue, ramping in to the seal 14 ticks after the packet. */
export const SOUL_BARRIER_LIGHT: Omit<SkillLight, 'enhanced'> = {
  impact: effectLight([0.35, 0.7, 1], 1, 1.3, { attack: 0.56, release: 0.6 }),
};

export default defineSkill({
  id: 16,
  name: "Soul Barrier",
  // 16 Soul Barrier: 5× CreateJoint(MODEL_SPEARSKILL sub0, width 20, white, LT 999999, MaxTails 30) - persistent,
  // so the ribbons live in BUFF_VISUALS[4] and end on MagicEffectStatus. Here only the arrival glimmer.
  // 16 Soul Barrier: nothing at the caster, the knot is the buff's look; 14 ticks on the impact plays the sound
  // again and rebuilds the knot at width 20. Enhanced keeps the packet's width 50 and the old glimmer.
  visual: { impact: soulBarrierImpact(true), enhanced: { impact: seq(soulBarrierImpact(true), soulBarrierSeal) } },
  buffs: {
    // 2 Greater Defense: the shared knot only.
    // 4 Soul Barrier: five white sub0 joints.
    4: e => ({ spearJoints: { ...SOUL_KNOT, width: soulKnotWidth.get(e) ?? SOUL_KNOT.width } }),
  },
  buffArrivals: { 4: soulBarrierArrival },
  // Soul Barrier (403 / 404 / 406 its master rows): no terrain light in the original; Enhanced only.
  light: { enhanced: SOUL_BARRIER_LIGHT },
});
