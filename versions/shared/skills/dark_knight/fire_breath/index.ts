import { defineSkill } from '@/controllers/skills/define';
import { delay, entityGone, entityPos, entityYaw, fxNow, type ParticleRecipe, type PointSource, type SheetCells } from '@/controllers/fx/core';
import { PlayerAction } from '@versions/shared/objects/enum';
import { RGBS, SMOKE, TEX } from '@/controllers/fx/recipes';
import { type Ray } from '@/controllers/fx/rays';
import { Step, TICK, ahead, cm, forwardOf, offset, perTick, ticks } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { lightAt } from '../../_shared';
import { lighting } from '@/controllers/lighting';
import { playCombat } from '@/controllers/sound/combat';
import { tmpEmitter } from '../_shared';

import { effectLight } from '@/controllers/lighting/recipes';

// ---- dk3 steps

/** `c->AttackTime` counts from 1 at the cast and fires the effect switch at g_iLimitAttackTime 15 (ZzzCharacter.cpp:2615, :4132-4145). */
const ATTACK_TIME_TICKS = 14;

/**
 * `step` when the caster's clip (one of `actions`) passes `key` - an AttackStage shortcut to the AttackTime
 * cap (ZzzCharacter.cpp:2910-2915) - or once `cap` ticks have gone, whichever is first.
 */
const atClipKey = (key: number, actions: readonly number[], step: Step, cap = ATTACK_TIME_TICKS): Step => (at, c) => {
  const p = at.clone();
  const t0 = fxNow();
  // Polled against the clock, not by counting polls: each delay lands on a frame and would drift late.
  const poll = (): void => {
    if (entityGone(c.caster)) return;
    const m = c.caster.modelObject;
    if ((m && actions.includes(m.CurrentAction) && m.actionFrame() >= key) || fxNow() - t0 >= ticks(cap) - 1e-4) step(p, c);
    else delay(Math.min(TICK, ticks(cap) - (fxNow() - t0)), poll);
  };
  poll();
};

/** The two Fire Breath clips (SkillCast.cpp:314-319). */
const RIDER_ACTIONS: readonly number[] = [PlayerAction.PLAYER_SKILL_RIDER, PlayerAction.PLAYER_SKILL_RIDER_FLY];
/** BITMAP_FIRE+2 (Fire03, 256x64): four 64 px cells, `Frame = (23 - LifeTime) / 6` (ZzzEffectParticle.cpp:4617). */
const FIRE3_CELLS: SheetCells = { w: 64, h: 64, count: 4 };
/** BITMAP_EXPLOTION+1 (DinoE, 256x64): four 64 px cells over its 12 ticks (ZzzEffectParticle.cpp:4278-4280). */
const DINO_CELLS: SheetCells = { w: 64, h: 64, count: 4 };
/** A breath puff's `Scale *= 0.95` a tick over its 24 (ZzzEffectParticle.cpp:4615): the size at 30 % of its life and at its end. */
const PUFF_SIZE_HELD = Math.pow(0.95, 24 * 0.3);
const PUFF_SIZE_END = Math.pow(0.95, 24);
/**
 * JOINT_SPARK sub1's width is its Scale 2 - two centimetres (ZzzEffectJoint.cpp:960-966), under a pixel at
 * this camera; ours is five wide so the sparks read at all.
 */
const BREATH_SPARK_WIDTH = cm(5);
/** JOINT_SPARK sub1's `Light /= 1.4` a tick and `Velocity += 0.3` a tick (ZzzEffectJoint.cpp:4201-4208). */
const SPARK_DECAY = 1 / 1.4;
const SPARK_ACCEL = perTick(0.3) * 25;
/**
 * CreateBomb2's 20 BITMAP_SPARK sub2 chips (ZzzEffect.cpp:6349-6360, ZzzEffectParticle.cpp:2016-2031,
 * :6558-6597): Spark02 (4 px) at Scale 0.8-1.4, thrown 6-12 cm a tick outward and 6-21 up, falling 2 cm a
 * tick more each tick, LT 24-39, bright for LifeTime/16.
 */
const BOMB2_SPARKS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: RGBS.white,
  size: 0.044,
  sizeJitter: 0.27,
  life: ticks(39),
  lifeJitter: 0.38,
  box: [0.05, 0.05, 0.05],
  dir1: [-3, 1.5, -3],
  dir2: [3, 5.25, 3],
  power: 1,
  powerJitter: 0,
  gravity: -12.5,
  spin: 3,
  capacity: 128,
};

/** CreateBomb2 (ZzzEffect.cpp:6349-6371): the chips and one DinoE card at scale 4 (2.56 m), with SOUND_EXPLOTION01. */
const bomb2: Step = (at, c) => {
  effects.spawn('sprite', c.scene, at, { texture: TEX.dinoE, colour: RGBS.white, size: cm(256), seconds: ticks(12), cells: DINO_CELLS, fadeTail: 0.1 });
  effects.spawn('particles', c.scene, at, { recipe: BOMB2_SPARKS, count: 20 });
  playCombat('Sound/eExplosion', at);
};

/**
 * Fire Breath at the key (ZzzCharacter.cpp:4405-4409): SOUND_SKILL_SWORD3 and BITMAP_SHOTGUN at the feet.
 * The emitter is unseen: it starts 20 cm ahead and 50 up and runs 30 cm a tick along the facing for its 10
 * ticks, dropping two BITMAP_FIRE+2 sub10 puffs 20 cm to either side each tick at Scale `(15 - LT) / 20 *
 * (2..4)`, and CreateBomb2 30 cm over its last spot (ZzzEffect.cpp:3002-3035, MoveHandlers.cpp:5077-5110).
 * At its birth 2x20 JOINT_SPARK sub1 leave from (-20,-20,60) and (30,-20,60), each pitched 5-24 deg off
 * the facing and rolled a growing i*18 deg, so the two sprays are cones round the facing.
 */
const fireBreath: Step = (_at, c) => {
  const f = forwardOf(entityYaw(c.caster));
  const feet = entityPos(c.caster, 0, new Vector3());
  // (f.z, -f.x) is the caster's right: the side its right-hand bone 33 is on (checked in-page, dk3.md).
  const place = (ahead: number, right: number, up: number, out = new Vector3()): Vector3 =>
    out.set(feet.x + f.x * ahead + f.z * right, feet.y + up, feet.z + f.z * ahead - f.x * right);
  playCombat('Sound/sKnightSkill3', feet);

  // All forty in one ribbon mesh (effects/rays.ts): they share their birth tick and their Light.
  const sparks: Ray[] = [];
  for (const right of [cm(20), cm(-30)]) {
    const from = place(cm(20), right, cm(60)).subtractInPlace(feet);
    const offset = [from.x, from.y, from.z] as const;
    let roll = 0;
    for (let i = 0; i < 20; i++) {
      roll += (i * 18 * Math.PI) / 180;
      const pitch = ((5 + Math.floor(Math.random() * 20)) * Math.PI) / 180;
      const side = Math.sin(pitch) * Math.sin(roll);
      sparks.push({
        offset,
        dir: [f.x * Math.cos(pitch) - f.z * side, -Math.sin(pitch) * Math.cos(roll), f.z * Math.cos(pitch) + f.x * side],
        speed: perTick(16 + Math.floor(Math.random() * 20)),
        accel: SPARK_ACCEL,
        width: BREATH_SPARK_WIDTH,
        life: ticks(4 + Math.floor(Math.random() * 4)),
      });
    }
  }
  effects.spawn('rays', c.scene, feet, { rays: sparks, texture: TEX.spark, colour: RGBS.white, seconds: ticks(7), tail: ticks(2), decay: SPARK_DECAY });

  const t0 = fxNow();
  lighting.skillFollow(c.scene, 49, out => {
    place(cm(20) + cm(30) * Math.min(9, (fxNow() - t0) / TICK), 0, cm(50), tmpEmitter);
    out.x = tmpEmitter.x;
    out.y = tmpEmitter.y;
    out.z = tmpEmitter.z;
  });
  for (let k = 0; k < 10; k++) {
    const tick = (): void => {
      const size = cm(64) * ((5 + k) / 20) * (2 + Math.floor(Math.random() * 3));
      for (const right of [cm(20), cm(-20)]) {
        const speed = perTick(3.2 + Math.random() * 1.5);
        effects.spawn('sprite', c.scene, place(cm(20) + cm(30) * k, right, cm(50)), {
          texture: TEX.fire3,
          colour: RGBS.white,
          cells: FIRE3_CELLS,
          size: size * PUFF_SIZE_HELD,
          growFrom: 1 / PUFF_SIZE_HELD,
          grow: PUFF_SIZE_END / PUFF_SIZE_HELD,
          seconds: ticks(24),
          // `Gravity += 0.004; z += Gravity * 10`: about 12 cm up over the life.
          move: [f.x * speed, cm(12) / ticks(24), f.z * speed],
          fadeTail: 1,
        });
      }
      if (k === 9) bomb2(place(cm(20) + cm(30) * k, 0, cm(80)), c);
    };
    if (k === 0) tick();
    else delay(ticks(k), tick);
  }
};

/** Fire Breath's lavender glitter shed along the emitter's path, drifting up as it fades. */
const BREATH_GLITTER: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.75, 0.75, 1.1],
  colourEnd: [0.12, 0.12, 0.3],
  size: 0.09,
  sizeJitter: 0.4,
  life: 0.6,
  lifeJitter: 0.3,
  box: [0.22, 0.15, 0.22],
  dir1: [-1, -0.2, -1],
  dir2: [1, 1, 1],
  power: 0.5,
  powerJitter: 0.5,
  gravity: 0.5,
  capacity: 128,
};
/** Hot chips out of the closing burst, DinoE's warm rim cooling to its violet. */
const BREATH_BOMB_CHIPS: ParticleRecipe = {
  texture: TEX.spark,
  colour: [1, 0.8, 0.6],
  colourEnd: [0.3, 0.2, 0.5],
  size: 0.12,
  sizeJitter: 0.3,
  life: 0.5,
  lifeJitter: 0.3,
  dir1: [-1, 0.2, -1],
  dir2: [1, 1.2, 1],
  power: 3,
  powerJitter: 0.4,
  gravity: -6,
  spin: 5,
  capacity: 64,
};

/**
 * Fire Breath, graded: the same emitter, puffs, forty sparks and CreateBomb2, with a soft lavender body
 * riding the emitter so the stream reads as one breath, glitter shed along it, and at the burst a flash,
 * hot chips, a smoke puff and a shock on the ground under it. Its lights are the row's `follow` and `bomb`.
 */
const fireBreathPlus: Step = (at, c) => {
  fireBreath(at, c);
  const f = forwardOf(entityYaw(c.caster));
  const feet = entityPos(c.caster, 0, new Vector3());
  const t0 = fxNow();
  // The emitter's head (fireBreath's `place(20 + 30 k, 0, 50)`), held at its last spot.
  const head: PointSource = out => {
    const d = cm(20) + cm(30) * Math.min(9, (fxNow() - t0) / TICK);
    return out.set(feet.x + f.x * d, feet.y + cm(50), feet.z + f.z * d);
  };
  effects.spawn('sprite', c.scene, feet, { texture: TEX.flare, colour: [0.24, 0.24, 0.45], size: 0.8, grow: 1.8, seconds: ticks(13), fadeTail: 0.45, follow: head });
  effects.spawn('particles', c.scene, feet, { recipe: BREATH_GLITTER, rate: 75, seconds: ticks(10), follow: head });
  delay(ticks(9), () => {
    const p = head(new Vector3());
    p.y = feet.y + cm(80);
    lighting.skillSpot(c.scene, 49, 'bomb', lightAt(p));
    effects.spawn('sprite', c.scene, p, { texture: TEX.flare, colour: [0.45, 0.36, 0.6], size: 1.4, seconds: ticks(6), fadeTail: 0.8 });
    effects.spawn('particles', c.scene, p, { recipe: BREATH_BOMB_CHIPS, count: 14 });
    effects.spawn('particles', c.scene, p, { recipe: SMOKE, count: 3 });
    effects.spawn('ring', c.scene, p, { texture: TEX.shockwave, colour: [0.32, 0.28, 0.5], scale: 1.2, grow: 2.4, seconds: ticks(10), fadeColour: true });
  });
};

export default defineSkill({
  id: 49,
  name: "Fire Breath",
  // 49 Fire Breath (AT_SKILL_RIDER): BITMAP_SHOTGUN and its sparks when the rider clip passes key 5, or
  // after the 14-tick AttackTime cap (ZzzCharacter.cpp:2910-2915, :4405-4409); see `fireBreath`.
  visual: { cast: atClipKey(5, RIDER_ACTIONS, fireBreath), enhanced: { cast: atClipKey(5, RIDER_ACTIONS, fireBreathPlus) } },
  // Fire Breath: BITMAP_SHOTGUN's (0.5,0.5,0.8) x Luminosity 0.7-1.0, range 2, riding the emitter
  // for its 10 ticks and fading under LT 5 (MoveHandlers.cpp:5086-5087, ZzzEffect.cpp:6645-6650).
  // Graded: the breath's lavender over the ~1 tile its puffs reach, bright while the last puffs live
  // (18 ticks), and the DinoE burst's 1.3 tiles for its 12.
  light: {
    follow: { color: [0.5, 0.5, 0.8], range: 2, seconds: 0.4, release: 0.2, flicker: { min: 0.7, max: 1, steps: 4 } },
    enhanced: {
      follow: effectLight([0.6, 0.6, 1], 1.1, 0.72, { release: 0.36, flicker: { min: 0.8, max: 1, steps: 4 } }),
      spots: { bomb: effectLight([1, 0.85, 1], 1.3, 0.48, { release: 0.32, heightOffset: 0.2 }) },
    },
  },
});
