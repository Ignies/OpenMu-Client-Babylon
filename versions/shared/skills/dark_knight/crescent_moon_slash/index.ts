import { defineSkill } from '@/controllers/skills/define';
import { DEG } from '../../_shared';
import { ENUM_WORLD } from '@/core/types';
import { effects, type EffectHandle } from '@/controllers/fx';
import { JOINT_SPARKS, JOINT_SPARKS_HD, SPARK_CHIPS_HD, muAngles, rand, sayAt, sparkHeading, terrainLevel } from '../_shared';
import { MODEL, TEX } from '@/controllers/fx/recipes';
import { delay, entityGone, entityPos, entityYaw, fxNow, type ParticleRecipe, type PointSource } from '@/controllers/fx/core';
import { PlayerAction } from '@versions/shared/objects/enum';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { SkillContext, Step, TICK, baseSkill, cm, currentSkill, forwardOf, perTick, ticks } from '@/controllers/skills/visuals';
import { lighting } from '@/controllers/lighting';
import { Ecs } from '@/ecs/current';

import { A } from '@/controllers/combat/recipes';

import { effectLight } from '@/controllers/lighting/recipes';

/**
 * BITMAP_FIRE sub2, the default branch (ZzzEffectParticle.cpp:387-500, :4690-4698): Fire01's four cells over LT 24,
 * 64 texels x Scale 1.5 = 96 cm, the scale growing by a Gravity that climbs 0.004 a tick (1.5 -> 2.7) and the card
 * rising 12 cm, drifting under 1.6 cm a tick. Light is the spawner's, cached per level.
 */
const RUSH_FIRES = new Map<number, ParticleRecipe>();
function rushFire(light: number): ParticleRecipe {
  let r = RUSH_FIRES.get(light);
  if (!r) {
    r = {
      texture: TEX.fire,
      cells: { w: 64, h: 64, count: 4 },
      colour: [light, light, light],
      colourEnd: [light, light, light],
      size: cm(64) * 1.5,
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
      capacity: 256,
    };
    RUSH_FIRES.set(light, r);
  }
  return r;
}

/**
 * The Rush spray (ZzzCharacter.cpp:2942-2957, MoveHandlers.cpp:7193-7206): at `p` +-15 cm, four JOINT_SPARK sub0 at
 * `Angle (150..209, 0, yaw)` (backward, pitched +-30 deg), each with a BITMAP_FIRE sub2 of Light `light`.
 */
function rushSpray(scene: Scene, p: Vector3, yaw: number, light: number, hd = false): void {
  const at = new Vector3(p.x + rand(-0.15, 0.15), p.y, p.z + rand(-0.15, 0.15));
  if (hd) {
    rushSprayHd(scene, at, yaw, light);
    return;
  }
  const fire = rushFire(light);
  for (let i = 0; i < 4; i++) {
    effects.spawn('particles', scene, at, { recipe: JOINT_SPARKS, count: 1, heading: sparkHeading(rand(150, 210) * DEG, yaw) });
    effects.spawn('particles', scene, at, { recipe: fire, count: 1 });
  }
}

/**
 * Graded tiers: the Rush fire warmer and smaller, and lifted by its own half height: the 96 cm cards at +20 cm cut a
 * hard line into the ground and 56 of them buried the knight's legs in one orange block.
 */
const RUSH_FIRE_HD: ParticleRecipe = {
  texture: TEX.fire,
  cells: { w: 64, h: 64, count: 4 },
  colour: [1, 0.72, 0.42],
  colourEnd: [0.85, 0.3, 0.08],
  size: cm(64),
  sizeJitter: 0.2,
  life: ticks(20),
  lifeJitter: 0.2,
  endScale: 1.5,
  box: [0.05, 0, 0.05],
  dir1: [-0.4, 0.6, -0.4],
  dir2: [0.4, 1, 0.4],
  power: perTick(2),
  powerJitter: 0.5,
  gravity: 0.4,
  capacity: 192,
};
/** Graded tiers: embers the Rush throws up and back. */
const RUSH_EMBERS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [1, 0.75, 0.4],
  colourEnd: [0.9, 0.25, 0.05],
  size: 0.05,
  sizeJitter: 0.4,
  life: 0.6,
  lifeJitter: 0.4,
  box: [0.15, 0.05, 0.15],
  dir1: [-0.5, 0.8, -0.5],
  dir2: [0.5, 1.6, 0.5],
  power: 1.6,
  powerJitter: 0.5,
  gravity: -2,
  capacity: 256,
};
/** Graded tiers: the spray at Light `light`: the sparks cool white to orange, the fires thin out with the light instead of dimming. */
function rushSprayHd(scene: Scene, at: Vector3, yaw: number, light: number): void {
  for (let i = 0; i < 4; i++) effects.spawn('particles', scene, at, { recipe: JOINT_SPARKS_HD, count: 1, heading: sparkHeading(rand(150, 210) * DEG, yaw) });
  const fires = Math.round(2 * light + Math.random() * 0.5);
  if (fires) effects.spawn('particles', scene, new Vector3(at.x, at.y + cm(32), at.z), { recipe: RUSH_FIRE_HD, count: fires });
  if (Math.random() < light) effects.spawn('particles', scene, at, { recipe: RUSH_EMBERS, count: 2 });
}

/**
 * MODEL_SWORD_FORCE sub0 (ZzzEffect.cpp:4531-4548, MoveHandlers.cpp:7154-7212): SwordForce.glb, one additive mesh,
 * at the feet + 100 cm along the facing, LT 15. Move k (1-15): `Direction[1] -= 2` so it runs 10 + 2k cm; on k 1-3
 * the scale grows 0.9 a tick and a sub1 copy stays behind (scale 3.5, LT 5, BlendMeshLight LT / 10); after that the
 * scale falls 0.05 a tick, BlendMeshLight = Light = LT / 18 and the blade sprays sparks and fire on the ground.
 * AddTerrainLight (1, 0.8, 0.6), range 1, every move. SOUND_BCS_RUSH is only loaded in Battle Castle (MapManager.cpp:277).
 */
function swordForce(c: SkillContext, skill: number, hd = false): void {
  const caster = c.caster;
  const yaw = entityYaw(caster);
  const f = forwardOf(yaw);
  const origin = entityPos(caster, 1, new Vector3());
  const body = terrainLevel(origin.x, origin.z);
  const t0 = fxNow();
  // Where it is after `k` moves: the sum of 10 + 2i cm.
  const blade = (k: number, out: Vector3): Vector3 => {
    const d = cm(10 * k + k * (k + 1));
    return out.set(origin.x + f.x * d, origin.y, origin.z + f.z * d);
  };
  const moves = (): number => 1 + (fxNow() - t0) / TICK;
  if (Ecs.world?.mapIndex === ENUM_WORLD.WD_30BATTLECASTLE) sayAt(c, 'Sound/battlecastle/sCHaveyBlow');
  // BodyLight (terrain + Light) x BlendMeshLight, clamped: Light and BlendMeshLight are 1, then LT / 18.
  const level = (k: number): number => (k <= 3 ? 1 : (16 - k) / 18);
  effects.spawn('model', c.scene, blade(1, new Vector3()), {
    model: MODEL.swordForce,
    seconds: ticks(14),
    fadeTail: 0,
    plainColour: hd,
    follow: out => blade(moves(), out),
    rotate: out => muAngles(out, 0, 0, yaw),
    scaleAt: t => {
      const k = 1 + t / TICK;
      return k <= 3 ? 0.9 * k : 2.7 - 0.05 * (k - 3);
    },
    intensity: t => {
      const l = level(Math.floor(1 + t / TICK + 1e-3));
      return Math.min(1, (body + l) * l);
    },
  });
  lighting.skillBody(c.scene, skill, 'force', out => {
    const p = blade(Math.min(15, moves()), tmpForce);
    out.x = p.x;
    out.y = p.y - 1;
    out.z = p.z;
  });
  if (hd) swordForceHd(c, blade, moves, yaw, level);
  for (let k = 1; k <= 15; k++) {
    delay(ticks(k - 1), () => {
      const p = blade(k - 1, new Vector3());
      if (k <= 3) {
        // The sub1 copy left where the blade was: scale 3.5, BlendMeshLight 0.5 -> 0.1 (MoveHandlers.cpp:7200-7207).
        effects.spawn('model', c.scene, p, {
          model: MODEL.swordForce,
          seconds: ticks(5),
          scale: 3.5,
          fadeTail: 0,
          plainColour: hd,
          rotate: out => muAngles(out, 0, 0, yaw),
          intensity: t => {
            const l = (5 - Math.floor(t / TICK + 1e-3)) / 10;
            return Math.min(1, (body + l) * l);
          },
        });
        return;
      }
      p.y -= 1;
      rushSpray(c.scene, p, yaw, level(k), hd);
    });
  }
}
const tmpForce = new Vector3();

/**
 * Graded tiers, riding the sword force: a warm glow on the blade that dims with its BlendMeshLight, a scorch streak
 * along the ground it runs over and hot chips off its leading edge.
 */
function swordForceHd(c: SkillContext, blade: (k: number, out: Vector3) => Vector3, moves: () => number, yaw: number, level: (k: number) => number): void {
  const at = blade(1, new Vector3());
  const follow: PointSource = out => blade(Math.min(15, moves()), out);
  effects.spawn('sprite', c.scene, at, {
    texture: TEX.flare,
    colour: [0.9, 0.55, 0.22],
    size: 1.6,
    seconds: ticks(14),
    fadeTail: 0,
    follow,
    intensity: p => level(Math.floor(1 + p * 14)),
  });
  effects.spawn('joint', c.scene, at, {
    head: out => follow(out).set(out.x, out.y - 0.95, out.z),
    maxTails: 12,
    smooth: 2,
    taper: true,
    width: 0.7,
    colour: [0.75, 0.38, 0.12],
    texture: TEX.flare2,
    seconds: ticks(20),
    fadeTail: 0.4,
  });
  const f = forwardOf(yaw);
  for (let k = 2; k <= 12; k += 2) {
    delay(ticks(k - 1), () => {
      const p = blade(k, new Vector3());
      p.set(p.x + f.x * 0.3, p.y - 0.9, p.z + f.z * 0.3);
      effects.spawn('particles', c.scene, p, { recipe: SPARK_CHIPS_HD, count: Math.round(6 * level(k)) + 1 });
    });
  }
}

/**
 * Crescent Moon Slash (Rush). ReceiveMagic plays SOUND_SKILL_SWORD2 (WSclient.cpp:4502-4506, controllers/sound/combat.ts). Every
 * tick of the charge the spray rises 20 cm over the feet (ZzzCharacter.cpp:2934-2958) until the clip passes key 5 or
 * AttackTime reaches 15 by itself (14 ticks at base speed); that tick the sword force leaves (:4686-4689).
 */
const crescentMoonSlashOf = (hd: boolean): Step => (at, c) => {
  const caster = c.caster;
  const skill = baseSkill(currentSkill);
  const t0 = fxNow();
  let n = 0;
  let seen = false;
  // Graded tiers: the charge lights the knight's feet and a hot glow gathers on the ground under him until the force leaves.
  let charge: ReturnType<typeof lighting.skillBody> = null;
  let glow: EffectHandle | null = null;
  if (hd) {
    const feet: PointSource = out => entityPos(caster, 0.1, out);
    charge = lighting.skillBody(c.scene, skill, 'charge', out => {
      if (entityGone(caster)) return;
      const p = feet(tmpForce);
      out.x = p.x;
      out.y = p.y;
      out.z = p.z;
    });
    glow = effects.spawn('sprite', c.scene, feet(new Vector3()), {
      texture: TEX.flare,
      colour: [1, 0.5, 0.18],
      size: 1.8,
      seconds: ticks(20),
      flat: true,
      sizeAt: p => 0.6 + 0.4 * Math.min(1, p * 2),
      fadeTail: 0.3,
      follow: feet,
    });
  }
  const tick = (): void => {
    if (entityGone(caster)) return;
    const m = caster.modelObject;
    const inClip = !!m && m.CurrentAction === PlayerAction.PLAYER_ATTACK_RUSH;
    seen ||= inClip;
    rushSpray(c.scene, entityPos(caster, cm(20), new Vector3()), entityYaw(caster), 1, hd);
    if ((inClip && m!.actionFrame() > 5) || (seen && !inClip) || n >= 13) {
      charge?.stop();
      glow?.stop();
      swordForce(c, skill, hd);
      return;
    }
    n++;
    delay(t0 + ticks(n) - fxNow(), tick);
  };
  tick();
};
const crescentMoonSlash = crescentMoonSlashOf(false);

export default defineSkill({
  id: 44,
  name: "Crescent Moon Slash",
  // UseSkillWarrior's glint (SkillCast.cpp:113-247, :357-376).
  warriorGlint: true,
  // 44 Crescent Moon Slash (Rush): the charge sprays sparks and fire at the feet until key 5 or 14 ticks, then the
  // sword force runs 3.9 m ahead growing, fading and lighting the ground; see crescentMoonSlash.
  visual: { cast: crescentMoonSlash, enhanced: { cast: crescentMoonSlashOf(true) } },
  // 38 Decay (eBlastPoison_1) and 39 Ice Storm (eSuddenIce_1): none at the cast, the effect plays them at AttackTime 15
  // (ZzzCharacter.cpp:4449, :4475; controllers/skills/visuals.ts).
  sound: 'Sound/sKnightSkill2', // Rush (ReceiveMagic's SOUND_SKILL_SWORD2; the row plays sCHaveyBlow in Battle Castle)
  clip: { ground: A.PLAYER_ATTACK_RUSH }, // Rush
  // Crescent Moon Slash: MODEL_SWORD_FORCE lights (1, 0.8, 0.6), range 1, under itself every move of its 15
  // (MoveHandlers.cpp:7208-7209); no Luminosity roll.
  light: {
    bodies: { force: { color: [1, 0.8, 0.6], range: 1, seconds: 0.6, release: 0.1 } },
    // The charge's fire at the feet until the force leaves (stopped by the row), then the gold blade over its reach.
    enhanced: {
      bodies: {
        charge: effectLight([1, 0.55, 0.2], 0.9, 0.7, { heightOffset: 0.4, attack: 0.1, release: 0.2, flicker: { min: 0.8, max: 1, steps: 4 } }),
        force: effectLight([1, 0.78, 0.45], 1.3, 0.6, { heightOffset: 0.8, release: 0.25 }),
      },
    },
  },
});
