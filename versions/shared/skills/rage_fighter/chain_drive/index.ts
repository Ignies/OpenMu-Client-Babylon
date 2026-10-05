import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { IMPACT_HEIGHT, arcHit, atCaster, cm, flying, perTick, seq, slash, sprite, ticks, type SkillContext, type Step } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';
import { type ModelHandle } from '@/controllers/fx/model';
import { TICK, boneLocalPos, delay, entityGone, entityPos, entityYaw, fxNow, type RGB } from '@/controllers/fx/core';
import { playCombat } from '@/controllers/sound';
import { deg, groundY, randInt, whenClipKey } from '../../_shared';
import { eachMove, shake, throwHead, wolfHead } from '../_shared';

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

/** The caster's GIANTSWING PlaySpeed, 0.4 at attack speed 0 (SetAttackSpeed, ZzzCharacter.cpp:1020). */
function swingSpeed(c: SkillContext): number {
  const m = c.caster.modelObject;
  return m?.CurrentAction === A.PLAYER_SKILL_GIANTSWING && m.AnimationSpeed > 0 ? m.AnimationSpeed : 0.4;
}

/** Moves an effect has made `t` seconds after its spawn: the first on the next tick (readme.md). */
const movesAt = (t: number): number => Math.floor(t / TICK + 1e-6);

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

/** One of the two blows: an arc burst on the target and Rage_Giantswing_Att (no target: neither, MoveHandlers.cpp:9346-9347). */
const blow: Step = (_at, c) => {
  const target = c.target;
  if (!target || entityGone(target)) return;
  arcHit(entityPos(target, IMPACT_HEIGHT, new Vector3()), c);
  const p = c.caster.transform?.pos;
  if (p) playCombat('Sound/Ragefighter/Rage_Giantswing_Att', { x: p.x, z: p.z });
};

/** The first blow also sends the giant-swing MODEL_SHOCKWAVE01 wave out from the caster (:9330-9340). */
const wave: Step = (_at, c) =>
  effects.spawn('model', c.scene, entityPos(c.caster, 0.05, new Vector3()), { model: MODEL.shockwave, seconds: ticks(15), scale: 0.8, colour: RGBS.arc, follow: flying(c, 0.05, perTick(40)), yaw: entityYaw(c.caster) });

/**
 * BITMAP_SWORDEFF at the packet (MonkSystem.cpp:1121-1126); it reads the caster's GIANTSWING key each tick
 * (MoveHandlers.cpp:9312-9380): past 6 the wave, the first wolf head and the first blow, past 11 the second blow, its waves
 * and wolf head. Leaving the clip drops them.
 */
const chainDrive: Step = (at, c) => {
  slash(RGBS.arc, TEX.motionBlur, 0.7)(at, c);
  atCaster(sprite({ texture: TEX.swordEff, colour: RGBS.arc, size: 1.6, seconds: 0.5, spin: 4, grow: 1.6 }), 0.9)(at, c);
  whenClipKey(A.PLAYER_SKILL_GIANTSWING, 6.001, SWORDEFF_TICKS, seq(wave, wolfHead2(false), blow), false, 'drop')(at, c);
  whenClipKey(A.PLAYER_SKILL_GIANTSWING, 11.001, SWORDEFF_TICKS, seq(secondWaves, wolfHead2(true), blow), false, 'drop')(at, c);
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
