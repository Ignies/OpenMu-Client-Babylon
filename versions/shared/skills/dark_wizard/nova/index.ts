import { defineSkill } from '@/controllers/skills/define';
import { DUST, TEX } from '@/controllers/fx/recipes';
import { delay, entityGone, entityPos, entityYaw, fxNow, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { SkillContext, Step, TICK, after, cm, forwardOf, ticks } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { novaStageOf } from '@/controllers/combat/novaCharge';
import { playCombat, stopCombat } from '@/controllers/sound/combat';

import { A } from '@/controllers/combat/recipes';

/** JOINT_SPIRIT sub6 / sub7 and the charge's BITMAP_LIGHT, Skill 0 (ZzzEffectJoint.cpp:760-762, ZzzCharacter.cpp:5729). */
export const NOVA_BLUE: RGB = [0.3, 0.3, 1];
/** Enhanced: the same blue with the red pulled out, so 72 stacked cards read blue instead of lavender-white. */
export const NOVA_GRADED: RGB = [0.2, 0.35, 1];
/** `m_bySkillCount` tops out at the server's 12 stages. */
export const NOVA_MAX_STAGE = 12;
/** The release fires when AttackTime reaches 15, 14 ticks after the 40 (WSclient.cpp:4847, ZzzCharacter.cpp:4139). */
const NOVA_BURST = ticks(14);
/** Heads per wave, and where MODEL_CIRCLE sub1 emits them: its fixed spot + 100 (MoveHandlers.cpp:3767-3776). */
const NOVA_HEADS = 36;
const NOVA_ORIGIN = cm(100);
/**
 * Waves drawn, spread over the charge's count+1 ticks. The original's 13 at a full charge (468 heads, ~94
 * ribbons) took the 5070 from 60 to 26 fps and white-washed the screen; 4 keep the burst's length and reach.
 */
const NOVA_DRAWN_WAVES = 4;
/** Angle[0] = -10: the heads leave 10 degrees above level. */
const NOVA_PITCH = (10 * Math.PI) / 180;
const NOVA_HEAD_TICKS = 20;
/** Velocity 50 (sub6) or 10 (sub7) cm a tick, +5 after every move (ZzzEffectJoint.cpp:3946): tiles out after t seconds. */
const novaReach = (v0: number, t: number): number => ((v0 - 2.5) / 4) * t + 15.625 * t * t;
/** The head's BITMAP_LIGHT, Scale 4 + (20 - LifeTime) / 5 of 64 cm (ZzzEffectJoint.cpp:3940). */
const novaCardSize = (t: number): number => 4 + t / TICK / 5;
/** Its Light x1/1.2 a tick below LifeTime 10 (ZzzEffectJoint.cpp:3922-3926). */
const novaCardLight = (t: number): number => {
  const n = t / TICK;
  return n <= 10 ? 1 : Math.pow(1 / 1.2, n - 10);
};

/**
 * One JOINT_SPIRIT head from `start` at `yaw`, pitched 10 degrees up: its flare card every tick and, for one
 * sub6 in five (PKKey = rand % 5, ZzzEffectJoint.cpp:747-752), the JointSpirit01 ribbon, width 60, additive,
 * MaxTails 5 (4 quads). sub7 draws no ribbon at all: RenderFace 0 is skipped (:768, :6997).
 */
function novaHead(scene: Scene, start: Vector3, yaw: number, v0: number, ribbon: boolean, colour: RGB = NOVA_BLUE): void {
  const head = novaPath(start, yaw, v0);
  const seconds = ticks(NOVA_HEAD_TICKS);
  effects.spawn('sprite', scene, start, { texture: TEX.flare, colour, size: cm(64), sizeAt: p => novaCardSize(p * seconds), intensity: p => novaCardLight(p * seconds), seconds, follow: head, fadeTail: 0 });
  if (ribbon) effects.spawn('joint', scene, start, { head, maxTails: 4, width: cm(60), colour, texture: TEX.jointSpirit, seconds, fadeTail: 0.5 });
}

/** Where a head leaving `start` at `yaw`, pitched 10 degrees up, is now. */
function novaPath(start: Vector3, yaw: number, v0: number): PointSource {
  const f = forwardOf(yaw);
  const dx = f.x * Math.cos(NOVA_PITCH);
  const dy = Math.sin(NOVA_PITCH);
  const dz = f.z * Math.cos(NOVA_PITCH);
  const t0 = fxNow();
  return out => {
    const d = novaReach(v0, fxNow() - t0);
    return out.set(start.x + dx * d, start.y + dy * d, start.z + dz * d);
  };
}

/**
 * Nova's release, any caster (ZzzCharacter.cpp:4435-4439): 14 ticks after the packet, eHellFire2_1 stops,
 * eHellFire2_2 plays and an invisible MODEL_CIRCLE sub1 (HiddenMesh -2, ZzzEffect.cpp:2145-2150) at the
 * caster's feet emits count+1 waves of 36 sub6 heads a tick apart, at yaw i x (10..19) degrees; the last wave
 * adds 36 slow sub7 heads in an exact 10 degree ring (MoveHandlers.cpp:3764-3785).
 */
const novaBurstWith = (colour: RGB, extra?: (c: SkillContext, start: Vector3) => void): Step =>
  after(NOVA_BURST, (_at, c) => {
    const e = c.caster;
    if (!e.transform || entityGone(e)) return;
    stopCombat('Sound/eHellFire2_1');
    playCombat('Sound/eHellFire2_2', e.transform.pos);
    const start = entityPos(e, NOVA_ORIGIN, new Vector3());
    const count = Math.min(NOVA_MAX_STAGE, e.netId === undefined ? 0 : novaStageOf(e.netId));
    const waves = Math.min(count + 1, NOVA_DRAWN_WAVES);
    for (let k = 0; k < waves; k++) {
      const w = waves === 1 ? 0 : Math.round((k * count) / (waves - 1));
      const last = w === count;
      const wave = () => {
        for (let i = 0; i < NOVA_HEADS; i++) {
          novaHead(c.scene, start, (i * (10 + Math.floor(Math.random() * 10)) * Math.PI) / 180, 50, Math.random() < 0.2, colour);
          if (last) novaHead(c.scene, start, (i * 10 * Math.PI) / 180, 10, false, colour);
        }
      };
      if (w === 0) wave();
      else delay(w * TICK, wave);
    }
    extra?.(c, start);
  });
const novaBurst = novaBurstWith(NOVA_BLUE);

/** Nova burst, Enhanced: blue chips thrown flat from the core with the first wave. */
const NOVA_SPARKS: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.45, 0.65, 1],
  colourEnd: [0.15, 0.3, 1],
  size: 0.22,
  sizeJitter: 0.4,
  life: 0.5,
  lifeJitter: 0.3,
  power: 9,
  powerJitter: 0.5,
  gravity: -3,
  box: [0.1, 0.1, 0.1],
  dir1: [-1, 0.05, -1],
  dir2: [1, 0.35, 1],
  endScale: 0.3,
  capacity: 128,
};
/** Dust blown flat off the ground by the burst, kept grey: warm additive dust reads as sparks next to the blue core. */
const NOVA_DUST: ParticleRecipe = { ...DUST, colour: [0.22, 0.22, 0.25], colourEnd: [0.12, 0.12, 0.14], power: 3, box: [0.6, 0.02, 0.6], dir1: [-1, 0.05, -1], dir2: [1, 0.25, 1] };
/** Heads that carry the burst's light out on Ultra, a quarter turn apart. */
const NOVA_LIT_HEADS = 4;

/**
 * Enhanced Nova burst: the Classic waves in the graded blue, and with the first one a shock ring racing over
 * the ground as far as the heads' first quarter second, a blue flash pooled under the core, chips thrown
 * flat and dust kicked off the ground; on Ultra four heads of the first wave carry the light out.
 */
const novaBurstEnhanced: Step = novaBurstWith(NOVA_GRADED, (c, start) => {
  const feet = entityPos(c.caster, 0, new Vector3());
  effects.spawn('ring', c.scene, feet, { texture: TEX.shockwave, colour: NOVA_GRADED, scale: 8, growFrom: 0.15, grow: 1, seconds: 0.35, fadeTail: 0.6 });
  effects.spawn('ring', c.scene, feet, { texture: TEX.flareBlue, colour: NOVA_GRADED, scale: 5, growFrom: 0.5, grow: 1.1, seconds: 0.5, fadeTail: 0.8 });
  effects.spawn('particles', c.scene, start, { recipe: NOVA_SPARKS, count: 40 });
  effects.spawn('particles', c.scene, feet, { recipe: NOVA_DUST, count: 14 });
  const yaw = entityYaw(c.caster);
  for (let i = 0; i < NOVA_LIT_HEADS; i++) {
    const head = novaPath(start, yaw + (i * 2 * Math.PI) / NOVA_LIT_HEADS, 50);
    const at = new Vector3();
    lighting.skillTrail(c.scene, 40, out => {
      head(at);
      out.x = at.x;
      out.y = at.y;
      out.z = at.z;
    });
  }
});

export default defineSkill({
  id: 40,
  name: "Nova",
  // 40 Nova (release): 14 ticks after the packet, count+1 waves of 36 JOINT_SPIRIT sub6 heads from the caster's
  // feet + 100, the last wave with 36 sub7 in a ring (novaBurst). Enhanced: novaBurstEnhanced.
  visual: {
    impact: novaBurst,
    enhanced: { impact: novaBurstEnhanced },
  },
  clip: { ground: A.PLAYER_SKILL_HELL_START }, // Nova (release)
});
