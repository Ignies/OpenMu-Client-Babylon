import { defineSkill } from '@/controllers/skills/define';
import { FIRE_PUFF, MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { cm, flying, particles, perTick, ticks, type SkillContext, type Step } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';
import { delay, entityGone, entityPos, entityYaw, fxNow, type ParticleRecipe } from '@/controllers/fx/core';
import { RELEASE_TICKS } from '@/controllers/combat';
import { playCombat } from '@/controllers/sound';
import { ENUM_WORLD } from '@/core/types';
import { DEG, JOINT_SPARKS, currentMap, multiShotVolley, randInt, sparkHeading } from '../../_shared';
import { Vector3 } from '@/controllers/render/babylon/exports';

import { A } from '@/controllers/combat/recipes';

/**
 * BITMAP_FIRE sub18 (ZzzEffectParticle.cpp:481-488, :4687-4696, :9151-9154): the whole ground_smoke sheet, 128 px x Scale 1.5,
 * alpha-blended (EnableAlphaBlend3), the Scale growing by a Gravity that climbs 0.004 a tick (1.5 -> 2.7), the card rising 12 cm
 * and drifting under 1.6 cm a tick, white keeping 0.95 of its Light a tick (to 0.29); LifeTime 24.
 */
const CHARGE_SMOKE: ParticleRecipe = {
  texture: TEX.groundSmoke,
  colour: RGBS.white,
  colourEnd: [0.29, 0.29, 0.29],
  size: cm(128) * 1.5,
  sizeJitter: 0,
  life: ticks(24),
  lifeJitter: 0,
  endScale: 1.8,
  box: [0, 0, 0],
  dir1: [-1, -1, -1],
  dir2: [1, 1, 1],
  power: perTick(1.6),
  powerJitter: 1,
  gravity: 0.25,
  blend: 'alpha',
  fade: [
    [0, 1],
    [1, 1],
  ],
  realSeconds: true,
  capacity: 256,
};

const sprayAt = new Vector3();
const sprayHeading = new Vector3();

/**
 * The charge's spray each tick (ZzzCharacter.cpp:2942-2957): 20 cm over the feet +-15 cm, four JOINT_SPARK sub0 at
 * `Angle (150..209, 0, yaw)` (thrown back, pitched +-30 degrees), each with a BITMAP_FIRE sub18.
 */
const spray: Step = (_at, c) => {
  const p = entityPos(c.caster, cm(20), sprayAt);
  p.x += cm(randInt(30) - 15);
  p.z += cm(randInt(30) - 15);
  const yaw = entityYaw(c.caster);
  for (let i = 0; i < 4; i++) {
    effects.spawn('particles', c.scene, p, { recipe: JOINT_SPARKS, count: 1, heading: sparkHeading((randInt(60) + 150) * DEG, yaw, sprayHeading) });
    effects.spawn('particles', c.scene, p, { recipe: CHARGE_SMOKE, count: 1 });
  }
};

/**
 * The release block (ZzzCharacter.cpp:4690-4695): MODEL_SWORD_FORCE sub2 at the caster and SOUND_BCS_RUSH, a wave
 * loaded only in Battle Castle (MapManager.cpp:277).
 */
function swordForce(c: SkillContext): void {
  const at = entityPos(c.caster, 1, new Vector3());
  effects.spawn('model', c.scene, at, { model: MODEL.swordForce, seconds: ticks(15), scale: 1, colour: RGBS.fire, grow: 3, follow: flying(c, 1, perTick(10)), yaw: -entityYaw(c.caster) });
  particles({ recipe: FIRE_PUFF, count: 8 })(at, c);
  const p = c.caster.transform?.pos;
  if (p && currentMap() === ENUM_WORLD.WD_30BATTLECASTLE) playCombat('Sound/battlecastle/sCHaveyBlow', { x: p.x, z: p.z });
}

/**
 * AttackStage's AT_SKILL_RUSH / AT_SKILL_OCCUPY case (ZzzCharacter.cpp:2934-2959): from tick 1 the spray each tick,
 * until RUSH passes key 5 or AttackTime reaches 15 by itself (tick 14); that tick the sword force leaves. The hero's
 * own cast also fires the MULTI_SHOT volley (MonkSystem.cpp:1305-1333, SkillCast.cpp:776-832); others never see it.
 */
const charge: Step = (at, c) => {
  if (c.caster.localPlayer) multiShotVolley(at, c);
  const t0 = fxNow();
  let n = 0;
  const tick = (): void => {
    n++;
    if (entityGone(c.caster)) return;
    spray(at, c);
    const m = c.caster.modelObject;
    if ((m?.CurrentAction === A.PLAYER_ATTACK_RUSH && m.actionFrame() > 5) || n >= RELEASE_TICKS) {
      swordForce(c);
      return;
    }
    delay(t0 + ticks(n + 1) - fxNow(), tick);
  };
  delay(ticks(1), tick);
};

export default defineSkill({
  id: 269,
  name: "Charge",
  // 269 Occupy (Charge): Rush's charge with BITMAP_FIRE sub18, then MODEL_SWORD_FORCE sub2; see charge.
  visual: { cast: charge },
  sound: 'Sound/sKnightSkill2', // Occupy: SOUND_SKILL_SWORD2 at the packet (WSclient.cpp:5123-5129)
  clip: { ground: A.PLAYER_ATTACK_RUSH }, // Occupy (WSclient.cpp:4725)
  stepIn: 'cast',
});
