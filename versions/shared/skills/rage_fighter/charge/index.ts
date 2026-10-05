import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { TICK, cm, forwardOf, perTick, ticks, type SkillContext, type Step } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';
import { delay, entityGone, entityPos, entityYaw, fxNow, type ParticleRecipe } from '@/controllers/fx/core';
import { RELEASE_TICKS } from '@/controllers/combat';
import { lighting } from '@/controllers/lighting';
import { playCombat } from '@/controllers/sound';
import { ENUM_WORLD } from '@/core/types';
import { DEG, JOINT_SPARKS, currentMap, multiShotVolley, randInt, sparkHeading, terrainLevel } from '../../_shared';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';

import { A } from '@/controllers/combat/recipes';

const CHARGE = 269;

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

/** The sword force's BITMAP_FIRE sub18, in its Light (LifeTime / 18), one recipe a level. */
const FORCE_SMOKES = new Map<number, ParticleRecipe>();
function forceSmoke(light: number): ParticleRecipe {
  let r = FORCE_SMOKES.get(light);
  if (!r) {
    r = { ...CHARGE_SMOKE, colour: [light, light, light], colourEnd: [0.29 * light, 0.29 * light, 0.29 * light] };
    FORCE_SMOKES.set(light, r);
  }
  return r;
}

const sprayAt = new Vector3();
const sprayHeading = new Vector3();

/**
 * Four JOINT_SPARK sub0 at `Angle (150..209, 0, yaw)` (thrown back, pitched +-30 degrees), each with a BITMAP_FIRE sub18 of
 * `smoke`, at `p` +-15 cm: the charge's each tick (ZzzCharacter.cpp:2942-2957) and the sword force's (MoveHandlers.cpp:7182-7199).
 */
function spray(scene: Scene, p: Vector3, yaw: number, smoke: ParticleRecipe): void {
  p.x += cm(randInt(30) - 15);
  p.z += cm(randInt(30) - 15);
  for (let i = 0; i < 4; i++) {
    effects.spawn('particles', scene, p, { recipe: JOINT_SPARKS, count: 1, heading: sparkHeading((randInt(60) + 150) * DEG, yaw, sprayHeading) });
    effects.spawn('particles', scene, p, { recipe: smoke, count: 1 });
  }
}

/** The sword force's BlendMeshLight on move k: 1, then its LifeTime / 18. */
const forceLevel = (k: number): number => (k <= 3 ? 1 : (16 - k) / 18);

/**
 * The release block (ZzzCharacter.cpp:4690-4695): MODEL_SWORD_FORCE sub2 at the caster and SOUND_BCS_RUSH, a wave loaded only
 * in Battle Castle (MapManager.cpp:277). SwordForce in knightSt_blue (ZzzObject.cpp:2566-2570), 100 cm over the feet, LifeTime 15
 * (ZzzEffect.cpp:4531-4548), moved in the frame it is made (MoveCharactersClient before MoveEffects, MainScene.cpp:284-290).
 * Move k (MoveHandlers.cpp:7154-7212): Direction[1] -= 2, so it runs 10 + 2k cm along the facing; on moves 1-3 Scale +0.9 and a
 * sub3 copy stays where it was (Scale 3.5, LifeTime 5, BlendMeshLight LifeTime / 10); then Scale -0.05, BlendMeshLight = Light =
 * LifeTime / 18 and the spray on the ground under it in that Light. AddTerrainLight (1, 0.8, 0.6), range 1, every move.
 */
function swordForce(c: SkillContext): void {
  const yaw = entityYaw(c.caster);
  const f = forwardOf(yaw);
  const origin = entityPos(c.caster, 1, new Vector3());
  const body = terrainLevel(origin.x, origin.z);
  const t0 = fxNow();
  // Where it is after `k` moves: the sum of 10 + 2i cm.
  const blade = (k: number, out: Vector3): Vector3 => {
    const d = cm(10 * k + k * (k + 1));
    return out.set(origin.x + f.x * d, origin.y, origin.z + f.z * d);
  };
  const moves = (): number => 1 + (fxNow() - t0) / TICK;
  effects.spawn('model', c.scene, blade(1, new Vector3()), {
    model: MODEL.swordForce,
    texture: TEX.knightStBlue,
    seconds: ticks(14),
    fadeTail: 0,
    yaw: -yaw,
    follow: out => blade(moves(), out),
    scaleAt: t => {
      const k = 1 + t / TICK;
      return k <= 3 ? 0.9 * k : 2.7 - 0.05 * (k - 3);
    },
    // BodyLight (terrain + Light) x BlendMeshLight, clamped.
    intensity: t => {
      const l = forceLevel(Math.floor(1 + t / TICK + 1e-3));
      return Math.min(1, (body + l) * l);
    },
  });
  lighting.skillBody(c.scene, CHARGE, 'force', out => {
    const p = blade(Math.min(15, moves()), forceAt);
    out.x = p.x;
    out.y = p.y - 1;
    out.z = p.z;
  });
  // Move k's work, where it was before the move.
  const move = (k: number): void => {
    if (k > 3) {
      const p = blade(k - 1, sprayAt);
      p.y -= 1;
      spray(c.scene, p, yaw, forceSmoke(forceLevel(k)));
      return;
    }
    effects.spawn('model', c.scene, blade(k - 1, new Vector3()), {
      model: MODEL.swordForce,
      texture: TEX.knightStBlue,
      seconds: ticks(5),
      scale: 3.5,
      fadeTail: 0,
      yaw: -yaw,
      intensity: t => {
        const l = (5 - Math.floor(t / TICK + 1e-3)) / 10;
        return Math.min(1, (body + l) * l);
      },
    });
  };
  move(1);
  for (let k = 2; k <= 15; k++) delay(ticks(k - 1), () => move(k));
  const at = c.caster.transform?.pos;
  if (at && currentMap() === ENUM_WORLD.WD_30BATTLECASTLE) playCombat('Sound/battlecastle/sCHaveyBlow', { x: at.x, z: at.z });
}
const forceAt = new Vector3();

/**
 * AttackStage's AT_SKILL_RUSH / AT_SKILL_OCCUPY case (ZzzCharacter.cpp:2934-2959): from tick 1 the spray each tick, 20 cm over
 * the feet, until RUSH passes key 5 or AttackTime reaches 15 by itself (tick 14); that tick the sword force leaves. The hero's
 * own cast also fires the MULTI_SHOT volley (MonkSystem.cpp:1305-1333, SkillCast.cpp:776-832); others never see it.
 */
const charge: Step = (at, c) => {
  if (c.caster.localPlayer) multiShotVolley(at, c);
  const t0 = fxNow();
  let n = 0;
  const tick = (): void => {
    n++;
    if (entityGone(c.caster)) return;
    spray(c.scene, entityPos(c.caster, cm(20), sprayAt), entityYaw(c.caster), CHARGE_SMOKE);
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
  id: CHARGE,
  name: "Charge",
  // 269 Occupy (Charge): Rush's charge with BITMAP_FIRE sub18, then MODEL_SWORD_FORCE sub2; see charge.
  visual: { cast: charge },
  sound: 'Sound/sKnightSkill2', // Occupy: SOUND_SKILL_SWORD2 at the packet (WSclient.cpp:5123-5129)
  clip: { ground: A.PLAYER_ATTACK_RUSH }, // Occupy (WSclient.cpp:4725)
  stepIn: 'cast',
  // The sword force's AddTerrainLight (1, 0.8, 0.6), range 1, under itself every move of its 15 (MoveHandlers.cpp:7201-7202).
  light: { bodies: { force: { color: [1, 0.8, 0.6], range: 1, seconds: 0.6, release: 0.1 } } },
});
