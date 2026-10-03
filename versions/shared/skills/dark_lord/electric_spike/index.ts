import { defineSkill } from '@/controllers/skills/define';
import { CAST_HEIGHT, SkillContext, Step, TICK, atCaster, cm, forwardOf, model, particles, seq, sprite, ticks } from '@/controllers/skills/visuals';
import { MODEL, TEX } from '@/controllers/fx/recipes';
import { boneLocalPos, bonePos, delay, entityGone, entityPos, entityYaw, fxNow, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';
import { PlayerAction } from '@versions/shared/objects/enum';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { atFrame, everyTick, muYaw, sfx, ticksLeft } from '../_shared';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';

import { A } from '@/controllers/combat/recipes';

import { SkillLight } from '@/controllers/lighting/skills';
import { TICK_SECONDS } from '../../_shared';
import { effectLight } from '@/controllers/lighting/recipes';

const DL_FLASH: ReadonlySet<number> = new Set([
  PlayerAction.PLAYER_SKILL_FLASH,
  PlayerAction.PLAYER_ATTACK_RIDE_ATTACK_FLASH,
  PlayerAction.PLAYER_FENRIR_ATTACK_DARKLORD_FLASH,
]);
/** BITMAP_GATHERING sub2 rides bone 33 + 10 cm (MoveHandlers.cpp:1611-1617). */
const GATHER_LOCAL = new Vector3(0, 0, cm(10));

/**
 * Electric Spike's charge, BITMAP_GATHERING sub2 (ZzzCharacter.cpp:10514-10520, MoveHandlers.cpp:1604-1658):
 * for 20 ticks, three one-frame Shiny02 cards at the hand a tick and, every other tick, three blue
 * JOINT_THUNDER sub3 arcs from a 120 cm sphere into it (ZzzEffectJoint.cpp:1123-1129).
 */
const sparkChargeOf = (hd: boolean): Step => (_at, c) => {
  const hand: PointSource = out => boneLocalPos(c.caster, 33, GATHER_LOCAL, out, CAST_HEIGHT);
  // Graded tiers: a violet core swelling in the hand under the cards, and chips thrown off it.
  if (hd) sprite({ texture: TEX.flare, colour: [0.3, 0.28, 0.75], size: 1, seconds: ticks(20), growFrom: 0.3, grow: 1.4, fadeTail: 0.35, follow: hand })(hand(new Vector3()), c);
  everyTick(20, i => {
    if (entityGone(c.caster)) return;
    const h = hand(new Vector3());
    for (let j = 0; j < 3; j++) {
      if (i % 2 === 0) {
        const pitch = Math.random() * Math.PI * 2;
        const yaw = Math.random() * Math.PI * 2;
        const from = new Vector3(h.x - Math.sin(yaw) * Math.cos(pitch) * 1.2, h.y + Math.sin(pitch) * 1.2, h.z + Math.cos(yaw) * Math.cos(pitch) * 1.2);
        // JOINT_THUNDER sub3 ends where the hand is at its creation (MoveHandlers.cpp:1639).
        effects.spawn('joint', c.scene, from, { to: h, colour: [0.5, 0.5, 1], width: cm(10), seconds: ticks(10), segments: 10, jitter: 0.15, texture: TEX.jointThunder, textureRepeats: 2, textureScroll: 1 });
      }
      if (hd && j === 0 && i % 2 === 0) particles({ recipe: SPIKE_CHIPS, count: 2 })(h, c);
      effects.spawn('sprite', c.scene, h, {
        texture: TEX.shiny2,
        size: cm(32) * (8 + Math.floor(Math.random() * 8)) * 0.2,
        aspect: 2,
        seconds: TICK,
        rotation: Math.random() * Math.PI * 2,
        fadeTail: 0.001,
      });
    }
  });
};

const sparkCharge = sparkChargeOf(false);

/** Graded tiers: blue-white chips the charge and the bolt's tip throw. */
const SPIKE_CHIPS: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.75, 0.7, 1],
  size: 0.12,
  sizeJitter: 0.4,
  life: 0.35,
  lifeJitter: 0.4,
  box: [0.05, 0.05, 0.05],
  dir1: [-1, -0.2, -1],
  dir2: [1, 1, 1],
  power: 3,
  powerJitter: 0.5,
  gravity: -3,
  capacity: 128,
};

/** Charge ticks for a caster with no flash clip: keys 1.3 and 1.5, at 0.4 a tick halved past key 1. */
const SPARK_CHARGE_FALLBACK: readonly number[] = [3, 4];
/** Ticks the poll waits on a clip that never leaves the window. */
const SPARK_CHARGE_MAX = 40;

/**
 * A charge on every tick the flash clip's key is in [1.2, 1.6) (ZzzCharacter.cpp:10514-10520): at the
 * Dark Lord's half rate over keys 1-3, two overlapping gatherings a tick apart. The Ready sound is one
 * channel (ZzzOpenData.cpp:4885), so the second PlayBuffer only restarts it: played once here.
 */
const sparkChargesOf = (hd: boolean): Step => (at, c) => {
  const t0 = fxNow();
  let seen = false;
  let fired = 0;
  const charge = hd ? sparkChargeOf(true) : sparkCharge;
  const fire = (): void => {
    charge(at, c);
    if (fired === 0 && hd) lighting.skillCue(c.scene, 65, 'charge', c.caster);
    if (fired++ === 0) atCaster(sfx('Sound/sDarkElecSpikeReady'), CAST_HEIGHT)(at, c);
  };
  const tick = (): void => {
    if (entityGone(c.caster)) return;
    const k = Math.round((fxNow() - t0) / TICK);
    const m = c.caster.modelObject;
    if (m && DL_FLASH.has(m.CurrentAction)) {
      seen = true;
      const f = m.actionFrame();
      if (f >= 1.6) return;
      if (f >= 1.2) fire();
    } else if (seen || k > SPARK_CHARGE_FALLBACK[SPARK_CHARGE_FALLBACK.length - 1]) {
      return;
    } else if (SPARK_CHARGE_FALLBACK.includes(k)) {
      fire();
    }
    if (k < SPARK_CHARGE_MAX) delay(TICK, tick);
  };
  tick();
};
const sparkCharges = sparkChargesOf(false);

/** BITMAP_FLARE_FORCE joints: 30 tails (ZzzEffectJoint.cpp:2496-2549). */
const FORCE_TAILS = 30;
/** Tails after `k` ticks of growth: 0, 2, 4... are added a tick (`MultiUse += 2`, :6608-6624). */
const forceReveal = (k: number): number => Math.min(FORCE_TAILS, k * (k - 1));
/** `Light x 1/1.3` a tick over the last 10. */
const forceLife = (life: number) => (p: number): number => Math.min(1, Math.pow(1.3, ticksLeft(p, life) - 10));
/** `Luminosity = (NumTails - 1 - j) / MaxTails * 2` per quad (:7251-7257): bright at the tip, black at the hand. */
const forceShade = (i: number): number => (2 * i) / FORCE_TAILS;

/**
 * The bolt at key 5.5 (ZzzCharacter.cpp:4390-4404, ZzzEffect.cpp:3418-3426): five FLARE_FORCE joints
 * from 90 cm ahead and 100 cm up. Tail n sits `n^2 + 2n` cm down the facing (steps 3, 5, 7... cm);
 * sub0 is the 250 cm straight ribbon, sub1-4 corkscrew round it at `80 - 2.5n` cm, turning -20 deg a
 * tail from below (sub1/2, after a 2-4 tick wait) and above (sub3/4, which overlap) (:6625-6668).
 */
const sparkBoltOf = (hd: boolean): Step => (_at, c) => {
  const f = forwardOf(entityYaw(c.caster));
  const fwd = new Vector3(f.x, 0, f.z);
  const right = new Vector3(-f.z, 0, f.x);
  const act = c.caster.modelObject?.CurrentAction;
  const lift = act === PlayerAction.PLAYER_ATTACK_RIDE_ATTACK_FLASH ? cm(80) : act === PlayerAction.PLAYER_FENRIR_ATTACK_DARKLORD_FLASH ? cm(40) : 0;
  const s = entityPos(c.caster, 1 + lift, new Vector3()).addInPlace(fwd.scale(0.9));
  const axis = (n: number): Vector3 => s.add(fwd.scale(cm(n * n + 2 * n)));
  const base = { texture: TEX.jointThunder, colour: [1, 0.8, 1] as RGB, reveal: forceReveal, uPerPoint: 1 / 14, scroll: 1, shade: forceShade, side: right };
  const main: Vector3[] = [];
  for (let n = 0; n < FORCE_TAILS; n++) main.push(axis(n));
  effects.spawn('path', c.scene, s, { ...base, points: main, width: cm(250), seconds: ticks(20), life: forceLife(20) });
  for (const sign of [1, 1, -1, -1]) {
    const wait = sign > 0 ? 2 + Math.floor(Math.random() * 3) : 0;
    const points: Vector3[] = [];
    for (let n = 0; n < FORCE_TAILS; n++) {
      const r = cm(80 - 2.5 * n) * sign;
      const t = ((180 - 20 * n) * Math.PI) / 180;
      points.push(axis(n).addInPlace(right.scale(Math.sin(t) * r)).addInPlaceFromFloats(0, Math.cos(t) * r, 0));
    }
    effects.spawn('path', c.scene, s, { ...base, points, width: 1, wait: ticks(wait), seconds: ticks(20 + wait), life: forceLife(20 + wait) });
  }
  sfx('Sound/sDarkElecSpike')(s, c);
  if (hd) sparkBoltHead(main, c);
};
const sparkBolt = sparkBoltOf(false);

/**
 * Graded tiers: the bolt's growing tip carries a white-violet head that rides the reveal out, sheds
 * chips as each run of tails appears, and flares where the bolt stops; its light is cued here.
 */
function sparkBoltHead(main: readonly Vector3[], c: SkillContext): void {
  lighting.skillCue(c.scene, 65, 'bolt', c.caster);
  const t0 = fxNow();
  const tip: PointSource = out => out.copyFrom(main[Math.max(0, forceReveal(Math.floor((fxNow() - t0) / TICK)) - 1)]);
  sprite({ texture: TEX.flare, colour: [0.8, 0.65, 1], size: 1.6, seconds: ticks(16), fadeTail: 0.5, follow: tip })(main[0], c);
  let shown = 0;
  everyTick(7, k => {
    const n = forceReveal(k);
    if (n > shown) particles({ recipe: SPIKE_CHIPS, count: 3 })(main[n - 1], c);
    if (n >= FORCE_TAILS && shown < FORCE_TAILS) {
      sprite({ texture: TEX.flare, colour: [0.9, 0.8, 1], size: 2.6, seconds: ticks(10), grow: 1.5, growFrom: 0.5, fadeTail: 0.7 })(main[n - 1], c);
      particles({ recipe: SPIKE_CHIPS, count: 14 })(main[n - 1], c);
    }
    shown = n;
  });
}

/** Keys 7-8, a tick each: two MODEL_DARKLORD_SKILL sub2 at the weapon's link bone, Light (0.8, 0.5, 1), angles (180, 45, 0) and (0, 0, yaw) (ZzzCharacter.cpp:10541-10551). */
const sparkAfterglow: Step = (_at, c) =>
  everyTick(3, i => {
    const m = c.caster.modelObject;
    const frame = m && DL_FLASH.has(m.CurrentAction) ? m.actionFrame() : 7 + i * 0.4;
    if (frame >= 8 || entityGone(c.caster)) return;
    const p = bonePos(c.caster, 33, new Vector3(), CAST_HEIGHT);
    const glow = { model: MODEL.darkLordSkill, colour: [0.8, 0.5, 1] as RGB, scale: 0.2, seconds: ticks(12), fadeTail: 0.001 };
    // The (180, ...) pitch only mirrors the flat card; its 45 degree tilt is the roll.
    model({ ...glow, roll: muYaw(45) })(p, c);
    model({ ...glow, yaw: -entityYaw(c.caster) })(p, c);
  });

/** Others see Electric Spike from a horse as the ground flash; only the Fenrir has its own (WSclient.cpp:5261-5265). */
export const OTHERS_SEE_FLASH = { [A.PLAYER_ATTACK_RIDE_ATTACK_FLASH]: A.PLAYER_SKILL_FLASH };

/** Electric Spike (ZzzInterface.cpp:5635-5648). */
export const MOUNTED_FLASH = {
  horse: A.PLAYER_ATTACK_RIDE_ATTACK_FLASH,
  fenrir: A.PLAYER_FENRIR_ATTACK_DARKLORD_FLASH,
} as const;

/**
 * Electric Spike: the original lights nothing. On the graded tiers the charge lights the hand and the
 * bolt carries its violet out along the facing as it grows (tip at 2.3, 4.9 and 9.9 tiles on ticks
 * 4-6), brightest where its sheet is white, then fades with its x1/1.3 tail.
 */
export const ELECTRIC_SPIKE_LIGHT: SkillLight = {
  enhanced: {
    timed: [
      { ...effectLight([0.55, 0.55, 1], 1.2, 21 * TICK_SECONDS, { attack: 3 * TICK_SECONDS, release: 6 * TICK_SECONDS, heightOffset: 1.2, flicker: { min: 0.6, max: 1, steps: 3 } }), delay: 0, cue: 'charge' },
      { ...effectLight([0.8, 0.65, 1], 1, 16 * TICK_SECONDS, { release: 8 * TICK_SECONDS, heightOffset: 1 }), forward: 2.3, delay: 4 * TICK_SECONDS, cue: 'bolt' },
      { ...effectLight([0.8, 0.65, 1], 1.4, 15 * TICK_SECONDS, { release: 8 * TICK_SECONDS, heightOffset: 1 }), forward: 4.9, delay: 5 * TICK_SECONDS, cue: 'bolt' },
      { ...effectLight([0.85, 0.7, 1], 1.8, 14 * TICK_SECONDS, { release: 8 * TICK_SECONDS, heightOffset: 1, flicker: { min: 0.7, max: 1, steps: 3 } }), forward: 8, delay: 6 * TICK_SECONDS, cue: 'bolt' },
    ],
  },
};

export default defineSkill({
  id: 65,
  name: "Electric Spike",
  othersSee: OTHERS_SEE_FLASH,
  // 65 Electric Spike (519): a charge every tick of keys 1.2-1.6 (BITMAP_GATHERING sub2 + SOUND_ELEC_STRIKE_READY), the five
  // FLARE_FORCE joints at 5.5 with SOUND_ELEC_STRIKE, two MODEL_DARKLORD_SKILL at the weapon on keys 7-8
  // (ZzzCharacter.cpp:4390-4404, :10509-10553). Fallback times for a caster with no clip are the keys at 0.4.
  visual: {
    area: seq(
      sparkCharges,
      atFrame(DL_FLASH, 5.5, ticks(19), sparkBolt),
      atFrame(DL_FLASH, 7, ticks(23), sparkAfterglow)
    ),
    enhanced: {
      area: seq(
        sparkChargesOf(true),
        atFrame(DL_FLASH, 5.5, ticks(19), sparkBoltOf(true)),
        atFrame(DL_FLASH, 7, ticks(23), sparkAfterglow)
      ),
    },
  },
  delayMs: 5000, // Electric Spike
  clip: { ground: A.PLAYER_SKILL_FLASH, ...MOUNTED_FLASH }, // Electric Spike
  // Electric Spike (519): the original lights nothing. The arc is ours, kept for the graded tiers.
  light: ELECTRIC_SPIKE_LIGHT,
});
