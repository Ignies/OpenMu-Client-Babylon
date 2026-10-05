import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { bonePos, delay, entityGone, entityPos, entityYaw } from '@/controllers/fx/core';
import type { TailStrip, TickedFx } from '@/controllers/fx/ticked';
import { cm, ticks, type SkillContext, type Step } from '@/controllers/skills/visuals';
import { type Entity } from '@/ecs/world';
import { playCombat } from '@/controllers/sound';
import { DEG, bodyLight, deg, randInt } from '../../_shared';
import { angleToward, clipSpeed, eachMove, shake, throwHead, wolfHead } from '../_shared';

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

/** A BITMAP_PIN_LIGHT joint: its strip, its head, its step a cm along its angle, its speed, moves and LifeTime. */
interface Pin {
  strip: TailStrip;
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
  speed: number;
  moves: number;
  life: number;
  yaw: number;
  pitch: number;
}

/** A pin's tails lie Scale 5 / 2 cm either side of its head (CreateTail, ZzzEffectJoint.cpp:2925-2958). */
const PIN_HALF = cm(5 / 2);
const pinAt = new Vector3();

/**
 * BITMAP_PIN_LIGHT on bone 27 + (0, rand() % 20 - 10, rand() % 28 + 6) cm at the shaken angle (MoveHandlers.cpp:9168-9176): Scale
 * 5, Velocity 15 + rand() % 60 cm a tick, LifeTime 1 + rand() % 3, five tails (ZzzEffectJoint.cpp:2701-2707). RenderJoints skips
 * a segment over 60 cm (:7071-7075), so a faster pin draws nothing.
 */
function makePin(fx: TickedFx, c: SkillContext, pitch: number, yaw: number): Pin | null {
  bonePos(c.caster, 27, pinAt);
  const z = pinAt.z + cm(randInt(20) - 10);
  const y = pinAt.y + cm(randInt(28) + 6);
  const speed = 15 + randInt(60);
  const life = 1 + randInt(3);
  if (speed > 60) return null;
  const p = pitch * DEG;
  const w = yaw * DEG;
  const strip = fx.strip({ texture: TEX.pinLights, maxTails: 5, batch: 9 });
  strip.push(pinAt.x, y, z, PIN_HALF, w, p);
  return { strip, x: pinAt.x, y, z, dx: cm(Math.cos(p) * Math.sin(w)), dy: -cm(Math.sin(p)), dz: -cm(Math.cos(p) * Math.cos(w)), speed, moves: 0, life, yaw: w, pitch: p };
}

/** A pin's move: its head goes Velocity cm along its angle, Velocity +0.1, Light x0.9, a tail laid (ZzzEffectJoint.cpp:2992-3007, :6868-6872). */
function movePin(p: Pin): void {
  p.x += p.dx * p.speed;
  p.y += p.dy * p.speed;
  p.z += p.dz * p.speed;
  p.speed += 0.1;
  p.moves++;
  p.strip.light = 0.9 ** p.moves;
  p.strip.push(p.x, p.y, p.z, PIN_HALF, p.yaw, p.pitch);
}

/**
 * MODEL_WOLF_HEAD_EFFECT sub0 (MonkSystem.cpp:1097-1100): made on bone 27, turned to the target, LifeTime 10 / PlaySpeed
 * (ZzzEffect.cpp:5828-5837). While its LifeTime is 3 or more each move puts it on bone 27 at Scale 1.5, shakes the caster's
 * angle by 7-9 degrees x 1, 3 or 5 and, at that angle, makes three pins and throws a sub1 (Scale 1.2-1.6, 2-3 ticks, 50 cm a
 * tick) and a sub2 (0.8-1.0, 3-5, 40, a further -5 to 4 degrees) (MoveHandlers.cpp:9137-9182, ZzzEffect.cpp:5838-5852). The
 * copies also push the caster's Velocity, which nothing a living character draws reads. Its brightness is its BodyLight: the
 * terrain light under it plus the caster's Light, zero (ZzzObject.cpp:212-232); drawn RENDER_BRIGHT, (ONE, ONE), so the
 * Alpha its LifeTime sets dims nothing (ZzzObject.cpp:2500-2504).
 */
const wolf: Step = (_at, c) => {
  if (entityGone(c.caster)) return;
  const life = 10 / clipSpeed(c, A.PLAYER_SKILL_THRUST);
  const target = c.target?.transform ? c.target : null;
  const facing = (): number => (target && !entityGone(target) ? angleToward(c, target) : deg(entityYaw(c.caster)));
  const at = bonePos(c.caster, 27, new Vector3());
  const light = bodyLight(at, [0, 0, 0]);
  const riding = (m: number): boolean => m > 0 && life - m + 1 >= 3;
  wolfHead(c, MODEL.wolfHead, light, [0, 0, facing()], 27, 27, 1, 1.5, life, riding);
  const pins: Pin[] = [];
  eachMove(c.scene, at, (m, fx) => {
    // The joints move after the effects, the ones made this tick too.
    for (let i = pins.length - 1; i >= 0; i--) {
      if (pins[i].moves < pins[i].life) movePin(pins[i]);
      else fx.drop(pins.splice(i, 1)[0].strip);
    }
    if (riding(m) && !entityGone(c.caster)) {
      const angle = shake(facing(), 7);
      for (let i = 0; i < 3; i++) {
        const pin = makePin(fx, c, angle[0], angle[1]);
        if (!pin) continue;
        pins.push(pin);
        movePin(pin);
      }
      throwHead(c, MODEL.wolfHead, light, angle, 1.2 + randInt(5) * 0.1, 2 + randInt(2), 50);
      throwHead(c, MODEL.wolfHead, light, [angle[0], angle[1] + randInt(10) - 5], 0.8 + randInt(3) * 0.1, 3 + randInt(3), 40);
    }
    return m < life || pins.length > 0;
  });
};

export default defineSkill({
  id: 260,
  name: "Killing Blow",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [551, 554],
  // 260-270 Rage Fighter (MonkSystem.cpp RageCreateEffect).
  // 260 Killing Blow: MODEL_WOLF_HEAD_EFFECT on the caster's bone 27, see wolf; BITMAP_SBUMB's bursts, see thrustBursts.
  visual: { cast: wolf, impact: thrustBursts },
  sound: 'Sound/Ragefighter/Rage_Thrust', // Killing Blow
  // --- Rage Fighter (CMonkSystem::SetRageSkillAni, MonkSystem.cpp:389) ----
  clip: { ground: A.PLAYER_SKILL_THRUST }, // Killing Blow
  stepIn: 'cast',
});
