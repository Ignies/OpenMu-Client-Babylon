import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { cm, flying, perTick, seq, ticks, type SkillContext, type Step } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';
import { type ModelHandle } from '@/controllers/fx/model';
import { TICK, boneLocalPos, bonePos, delay, entityGone, entityPos, entityYaw, fxNow, type RGB } from '@/controllers/fx/core';
import type { TailStrip, TickedFx } from '@/controllers/fx/ticked';
import { playCombat } from '@/controllers/sound';
import type { Entity } from '@/ecs/world';
import { deg, groundY, movesAt, randInt } from '../../_shared';
import { clipSpeed, eachMove, shake, throwHead, wolfHead } from '../_shared';

import { A } from '@/controllers/combat/recipes';

/** BITMAP_SWORDEFF's LifeTime (EffectRegistry.cpp:87); it dies once the caster's GIANTSWING is over. */
const SWORDEFF_TICKS = 200;

/** MODEL_SHOCKWAVE02 (shockwave02.bmd); only Chain Drive sends it. */
const SHOCKWAVE02 = 'Effect/shockwave02.glb';

/** The second blow's waves start at bone 4 + (-80, 120, 0) and + (-80, 20, 0) cm (MoveHandlers.cpp:9356-9364). */
const WAVE2_AT = new Vector3(cm(-80), cm(120), 0);
const SPIN_AT = new Vector3(cm(-80), cm(20), 0);
/** The two spin waves: sub0's Scale and roll a tick, sub1's (Angle[1] -= 10, then += 20 for sub1). */
const SPINS: readonly (readonly [number, number])[] = [[0.5, -10], [0.9, 10]];

/** The caster's GIANTSWING PlaySpeed. */
const swingSpeed = (c: SkillContext): number => clipSpeed(c, A.PLAYER_SKILL_GIANTSWING);

/**
 * The second blow's waves (MoveHandlers.cpp:9350-9367), on their side (Angle[0] 90) at the caster's yaw - 180.
 *
 * MODEL_SHOCKWAVE02, Light (0.5, 0.5, 1), Scale 0.5: it lives 14 / (2 x PlaySpeed) ticks, grows 0.1 and keeps 0.8 of
 * its Light a tick, and backs off along the line from the caster to it, 25 cm a tick slowing by 0.95
 * (ZzzEffect.cpp:5950-5966, MoveHandlers.cpp:9442-9452); drawn bright twice at its Light (ZzzObject.cpp:2493-2498),
 * so twice here.
 *
 * Two MODEL_SHOCKWAVE_SPIN01, white, Scale 0.5 and 0.9: 8 / PlaySpeed ticks, growing 1 % and keeping 0.9 of the Light a
 * tick, rolling 10 degrees a tick one way and the other (ZzzEffect.cpp:5977-5991, MoveHandlers.cpp:9479-9493).
 */
const secondWaves: Step = (_at, c) => {
  if (entityGone(c.caster)) return;
  const speed = swingSpeed(c);
  const yaw = (entityYaw(c.caster) * 180) / Math.PI - 180;
  const start = boneLocalPos(c.caster, 4, WAVE2_AT, new Vector3());
  const feet = entityPos(c.caster, 0, new Vector3());
  // StartPosition: 25 cm from the caster towards the wave, ground to ground (ZzzEffect.cpp:5958-5965).
  const back = new Vector3(start.x - feet.x, groundY(start.x, start.z) - groundY(feet.x, feet.z), start.z - feet.z).normalize().scaleInPlace(cm(25));
  const t0 = fxNow();
  for (let pass = 0; pass < 2; pass++) {
    effects.spawn('model', c.scene, start.clone(), {
      model: SHOCKWAVE02,
      seconds: ticks(Math.ceil(14 / (2 * speed))),
      angle: [90, 0, yaw],
      colour: [0.5, 0.5, 1],
      scaleAt: t => 0.5 + 0.1 * movesAt(t),
      intensity: t => 0.8 ** movesAt(t),
      fadeTail: 0,
      // Position -= StartPosition after StartPosition *= 0.95: 25 x 19 x (1 - 0.95^n) cm back after n moves.
      follow: out => {
        const k = 19 * (1 - 0.95 ** movesAt(fxNow() - t0));
        return out.set(start.x - back.x * k, start.y - back.y * k, start.z - back.z * k);
      },
    });
  }
  const spinAt = boneLocalPos(c.caster, 4, SPIN_AT, new Vector3());
  const spinTicks = Math.ceil(8 / speed);
  for (const [scale, roll] of SPINS) {
    const spin = effects.spawn('model', c.scene, spinAt.clone(), {
      model: MODEL.shockwaveSpin,
      seconds: ticks(spinTicks),
      angle: [90, 0, yaw],
      colour: [1, 1, 1],
      scaleAt: t => scale * 1.01 ** movesAt(t),
      intensity: t => 0.9 ** movesAt(t),
      fadeTail: 0,
    }) as ModelHandle;
    let moves = 0;
    const turn = (): void => {
      if (!spin.alive) return;
      moves++;
      spin.setAngle([90, roll * moves, yaw]);
      if (moves < spinTicks) delay(TICK, turn);
    };
    delay(TICK, turn);
  }
};

/** MODEL_WOLF_HEAD_EFFECT2 is drawn bright at Light (0.4, 0.4, 0.6) x 0.3, whatever it was made with (ZzzObject.cpp:2452-2458). */
const HEAD2_LIGHT: RGB = [0.12, 0.12, 0.18];

/**
 * MODEL_WOLF_HEAD_EFFECT2 with a blow (MoveHandlers.cpp:9331, :9354): made on bone 5, it lives 4 / PlaySpeed (ZzzEffect.cpp:6075-6107)
 * at the caster's facing, which GIANTSWING holds. Sub3 (the first blow) rides bone 4 while its LifeTime is 3 or more and each such
 * move throws a sub4 and a sub6 at the caster's angle shaken by 2-4 degrees x 1, 3 or 5; sub5 (the second) rides bone 27 at
 * Scale 1.5 (MoveHandlers.cpp:9736-9800).
 */
const wolfHead2 = (second: boolean): Step => (_at, c) => {
  if (entityGone(c.caster)) return;
  const life = 4 / swingSpeed(c);
  const scale = second ? 1.5 : 1;
  const riding = (m: number): boolean => m > 0 && (second || life - m + 1 >= 3);
  wolfHead(c, MODEL.wolfHead2, HEAD2_LIGHT, [0, 0, deg(entityYaw(c.caster))], 5, second ? 27 : 4, scale, scale, life, riding);
  if (second) return;
  eachMove(c.scene, entityPos(c.caster, 0, new Vector3()), m => {
    if (m >= life || entityGone(c.caster)) return false;
    if (!riding(m)) return true;
    const angle = shake(deg(entityYaw(c.caster)), 2);
    throwHead(c, MODEL.wolfHead2, HEAD2_LIGHT, angle, 0.7 + randInt(3) * 0.1, 5 + randInt(2), 40);
    throwHead(c, MODEL.wolfHead2, HEAD2_LIGHT, angle, 1.2 + randInt(5) * 0.1, 2 + randInt(2), 50);
    return true;
  });
};

/** A particle the blows throw on the target: where it was made, its Scale then, and the moves it has made. */
interface Spark {
  x: number;
  y: number;
  z: number;
  scale: number;
  moves: number;
}
const sparkAt = new Vector3();

/** A particle `dx`, `dy` cm about `at` (MU x, y) and `up` cm over it, at `scale`. */
const sparkNear = (at: Vector3, dx: number, dy: number, up: number, scale: number): Spark => ({ x: at.x + cm(dx), y: at.y + cm(up), z: at.z + cm(dy), scale, moves: 0 });

/** Moves each particle once, oldest first: one past `last` moves is gone, the rest are drawn. */
function stepSparks(sparks: Spark[], last: number, draw: (s: Spark) => void): void {
  let n = 0;
  for (const s of sparks) {
    if (++s.moves > last) continue;
    draw(s);
    sparks[n++] = s;
  }
  sparks.length = n;
}

/** BITMAP_DAMAGE1's particle Light (0.6, 0.94, 1): each move keeps 0.8 of it and each draw doubles it, so move m draws it x1.6^m, clamped. */
const DAMAGE1_LIGHTS: readonly RGB[] = [0, 1, 2, 3, 4].map((m): RGB => [Math.min(1, 0.6 * 1.6 ** m), Math.min(1, 0.94 * 1.6 ** m), 1]);

/**
 * The first blow's BITMAP_DAMAGE1, Scale 1.4, LifeTime 20 (MoveHandlers.cpp:9344, ZzzEffect.cpp:5968-5975): on its moves 5, 9,
 * 13 and 17 (LifeTime 16, 12, 8, 4) a particle -40..49 cm about the target and 50-149 cm up, Scale (1.5 + 0-0.04) x 1.4
 * (MoveHandlers.cpp:9456-9475). The particle lives LifeTime 5: Damage1 64 px x Scale, x1.2 a move, drawn on its moves 1-4
 * at the Light above (ZzzEffectParticle.cpp:3814-3818, :8855-8860, :9318-9322).
 */
const damageSparks = (c: SkillContext, target: Entity): void => {
  const sparks: Spark[] = [];
  let fx: TickedFx | null = null;
  const draw = (s: Spark): void => {
    const size = cm(64 * s.scale * 1.2 ** s.moves);
    fx?.sprite(TEX.damage1, DAMAGE1_LIGHTS[s.moves], s.x, s.y, s.z, size, size, 0);
  };
  eachMove(c.scene, entityPos(target, 0, new Vector3()), (m, tickFx) => {
    fx = tickFx;
    const lifeTime = 21 - m;
    if (m <= 20 && lifeTime < 17 && lifeTime % 4 === 0 && !entityGone(target)) {
      const p = entityPos(target, 0, sparkAt);
      sparks.push(sparkNear(p, randInt(90) - 40, randInt(90) - 40, randInt(100) + 50, (1.5 + randInt(5) * 0.01) * 1.4));
    }
    stepSparks(sparks, 4, draw);
    return m < 20 || sparks.length > 0;
  });
};

/**
 * The second blow's BITMAP_SHINY+4 where the target stands, Scale 1.9, LifeTime 16 (MoveHandlers.cpp:9370-9373, ZzzEffect.cpp:6024-6028):
 * each move a white ring particle (sub2) -40..59 cm about it and 50-149 cm up (ZzzEffect.cpp:8497-8504). The particle lives
 * LifeTime 8, Scale x1.1 and Light x0.9 a move (ZzzEffectParticle.cpp:2694-2708, :7348-7352): ring, 64 px x Scale, drawn on its
 * moves 1-7.
 */
const shinyRings = (c: SkillContext, target: Entity): void => {
  const at = entityPos(target, 0, new Vector3());
  const rings: Spark[] = [];
  let fx: TickedFx | null = null;
  const draw = (s: Spark): void => {
    const size = cm(64 * s.scale * 1.1 ** s.moves);
    fx?.sprite(TEX.ring, RGBS.white, s.x, s.y, s.z, size, size, 0, 0.9 ** s.moves);
  };
  eachMove(c.scene, at, (m, tickFx) => {
    fx = tickFx;
    if (m <= 16) rings.push(sparkNear(at, randInt(100) - 40, randInt(100) - 40, randInt(100) + 50, 1.9));
    stepSparks(rings, 7, draw);
    return m < 16 || rings.length > 0;
  });
};

/** A blow: its particles on the target and Rage_Giantswing_Att; with no target neither (MoveHandlers.cpp:9341-9347, :9369-9375). */
const blow = (sparks: (c: SkillContext, target: Entity) => void): Step => (_at, c) => {
  const target = c.target;
  if (!target || entityGone(target)) return;
  sparks(c, target);
  const p = c.caster.transform?.pos;
  if (p) playCombat('Sound/Ragefighter/Rage_Giantswing_Att', { x: p.x, z: p.z });
};

/** The first blow also sends the giant-swing MODEL_SHOCKWAVE01 wave out from the caster, at (60, 0, Angle[2] - 180) (:9330-9340). */
const wave: Step = (_at, c) =>
  effects.spawn('model', c.scene, entityPos(c.caster, 0.05, new Vector3()), { model: MODEL.shockwave, seconds: ticks(15), scale: 0.8, colour: RGBS.arc, follow: flying(c, 0.05, perTick(40)), angle: [60, 0, deg(entityYaw(c.caster)) - 180] });

/** BITMAP_SWORDEFF's joint (ZzzEffectJoint.cpp:2720-2729): !SwordEff on its flat face, Scale 100 cm wide, Light (0.6, 0.6, 1), MaxTails 50. */
const SWORDEFF_JOINT = { texture: TEX.swordEffJoint, colour: [0.6, 0.6, 1] as const, maxTails: 50, faces: 'flat' as const, maxSegment: cm(60), batch: 11 };
const SWORDEFF_HALF = cm(100 / 2);
/** A joint's LifeTime 10: it lays a tail a move, is drawn after its moves 1-10 and dies on the 11th (MoveJoint, ZzzEffectJoint.cpp:6946-6957). */
const SWORDEFF_MOVES = 10;

/**
 * BITMAP_SWORDEFF at the packet (MonkSystem.cpp:1121-1126), LifeTime 200. Each move while the caster plays GIANTSWING
 * (MoveHandlers.cpp:9312-9380) it makes a joint on bone 5 at the caster's Angle, which rides bone 5 laying a tail a move
 * (ZzzEffectJoint.cpp:6887-6898); past key 6 (LifeTime over 50, then 45) the wave, the first wolf head and the first blow,
 * past key 11 (LifeTime over 20, then 20) the second blow, its waves and wolf head. It ends when the caster leaves the clip.
 */
const chainDrive: Step = (at, c) => {
  const joints: { strip: TailStrip; yaw: number; moves: number }[] = [];
  let lifeTime = SWORDEFF_TICKS;
  let seen = false;
  let alive = true;
  eachMove(c.scene, entityPos(c.caster, 0, new Vector3()), (_m, fx) => {
    const model = c.caster.modelObject;
    const inClip = !entityGone(c.caster) && model?.CurrentAction === A.PLAYER_SKILL_GIANTSWING;
    seen ||= inClip;
    alive &&= !entityGone(c.caster) && !(seen && !inClip) && lifeTime > 0;
    if (alive && inClip && model) {
      joints.push({ strip: fx.strip(SWORDEFF_JOINT), yaw: entityYaw(c.caster), moves: 0 });
      const frame = model.actionFrame();
      if (frame > 6 && lifeTime > 50) {
        seq(wave, wolfHead2(false), blow(damageSparks))(at, c);
        lifeTime = 45;
      }
      if (frame > 11 && lifeTime > 20) {
        seq(secondWaves, wolfHead2(true), blow(shinyRings))(at, c);
        lifeTime = 20;
      }
    }
    if (alive) lifeTime--;
    const hand = bonePos(c.caster, 5, sparkAt);
    for (let i = joints.length - 1; i >= 0; i--) {
      const j = joints[i];
      if (entityGone(c.caster) || ++j.moves > SWORDEFF_MOVES) {
        fx.drop(joints.splice(i, 1)[0].strip);
        continue;
      }
      j.strip.push(hand.x, hand.y, hand.z, SWORDEFF_HALF, j.yaw, 0);
    }
    return alive || joints.length > 0;
  });
};

export default defineSkill({
  id: 262,
  name: "Chain Drive",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [558],
  // A hit does not cut the swing short, and the target is swung round on the facing it started with
  // (ZzzCharacter.cpp:1283-1297, ZzzInterface.cpp:7394-7419).
  noFlinch: [A.PLAYER_SKILL_GIANTSWING],
  holdsFacing: [A.PLAYER_SKILL_GIANTSWING],
  // 262 Chain Drive: the sword effect at the caster, two blows on the swing's keys; see chainDrive.
  visual: { cast: chainDrive },
  sound: 'Sound/Ragefighter/Rage_Giantswing', // Chain Drive (MonkSystem.cpp:1125)
  delayMs: 700, // Chain Drive
  clip: { ground: A.PLAYER_SKILL_GIANTSWING }, // Chain Drive
  stepIn: 'midClip',
});
