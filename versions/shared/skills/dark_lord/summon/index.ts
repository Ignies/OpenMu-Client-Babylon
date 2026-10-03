import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { bonePos, delay, effectTexture, entityGone, entityYaw, fxNow, type ParticleRecipe } from '@/controllers/fx/core';
import { PlayerAction } from '@versions/shared/objects/enum';
import { QUAKE_SCROLL, groundAt } from '../../_shared';
import { SkillContext, Step, TICK, after, atCaster, cm, model, particles, perTick, ring, seq, sprite, ticks } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { everyTick, muRotated, sfx, ticksLeft } from '../_shared';
import { lighting } from '@/controllers/lighting';
import { storeRef } from '@/app/storeRef';
import { warmGLTF } from '@/controllers/assets/modelLoader';
import { reportLoadFailure } from '@/controllers/assets';

import { A } from '@/controllers/combat/recipes';

import { TICK_SECONDS } from '../../_shared';
import { effectLight } from '@/controllers/lighting/recipes';

/** MODEL_CIRCLE sub2's `BlendMeshLight` at `left` ticks (MoveHandlers.cpp:3786-3796). */
const circleLight = (left: number): number => (left > 240 ? (250 - left) * 0.1 : left * 0.1);
/**
 * The emblem is `(0.5, 0.5, 1) x BlendMeshLight` clamped by the GL: white while that is 2 or more,
 * blue as it falls. Drawn as a white and a blue layer whose sum is exactly the clamped colour.
 */
const emblemWhite = (p: number): number => Math.min(1, Math.max(0, circleLight(ticksLeft(p, 250)) - 1));
const emblemBlue = (p: number): number => {
  const l = circleLight(ticksLeft(p, 250));
  return l >= 2 ? 0 : l >= 1 ? 2 - l : l;
};
/** MODEL_CIRCLE_LIGHT sub3: `(0.1, 0.1, 10) x min(0.5, BlendMeshLight)`, the blue clamped at 1 (MoveHandlers.cpp:3864-3872, ZzzObject.cpp:1490). */
const curtainLife = (p: number): number => Math.min(1, 10 * Math.min(0.5, circleLight(ticksLeft(p, 250))));
/** BITMAP_FLARE_BLUE sub0 (ZzzEffectParticle.cpp:167-172, :3951-3960): 13 cm, rising from 0-2 cm a tick by 0.4 a tick up to 8. */
const FLARE_BLUE_RISE: ParticleRecipe = {
  texture: TEX.flareBlue,
  colour: RGBS.white,
  size: cm(12.8),
  sizeJitter: 0,
  life: ticks(39),
  lifeJitter: 0.23,
  box: [1.4, 0, 1.4],
  dir1: [0, 1, 0],
  dir2: [0, 1, 0],
  power: perTick(2),
  powerJitter: 1,
  gravity: 1.8,
  capacity: 128,
};
/** BITMAP_LIGHT sub0 at bone 42 (ZzzEffectParticle.cpp:3161-3166, :7943-7966): flare01 32-64 cm, Light (0.3, 0.5, 1), rising 2.5 cm a tick, shrinking out. */
const TELEPORT_HAND: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.3, 0.5, 1],
  size: cm(48),
  sizeJitter: 0.33,
  life: ticks(19),
  lifeJitter: 0.47,
  box: [0.02, 0.02, 0.02],
  dir1: [-0.15, 1, -0.15],
  dir2: [0.15, 1, 0.15],
  power: perTick(2.5),
  powerJitter: 0,
  endScale: 0.1,
  capacity: 64,
};
/** Graded tiers: the motes at a size that reads at our camera (the original's 13 cm is a pixel), rising more gently. */
const FLARE_BLUE_RISE_HD: ParticleRecipe = { ...FLARE_BLUE_RISE, size: cm(26), sizeJitter: 0.4, gravity: 1.1, spin: 1.5 };
/** Graded tiers: a soft halo round the raised hand's glow. */
const TELEPORT_HALO: ParticleRecipe = { ...TELEPORT_HAND, colour: [0.12, 0.22, 0.5], size: 1.1, sizeJitter: 0.2, endScale: 0.6 };
/** Graded tiers: the blue chips a streak throws where it lands. */
const STREAK_SPLASH: ParticleRecipe = {
  texture: TEX.flareBlue,
  colour: RGBS.white,
  size: cm(22),
  sizeJitter: 0.4,
  life: 0.45,
  lifeJitter: 0.3,
  box: [0.05, 0, 0.05],
  dir1: [-1, 0.8, -1],
  dir2: [1, 1.6, 1],
  power: 1.6,
  powerJitter: 0.4,
  gravity: -4,
  capacity: 128,
};
const TELEPORT_CLIPS: ReadonlySet<number> = new Set([
  PlayerAction.PLAYER_ATTACK_TELEPORT,
  PlayerAction.PLAYER_ATTACK_RIDE_TELEPORT,
  PlayerAction.PLAYER_FENRIR_ATTACK_DARKLORD_TELEPORT,
]);
/** The held pose after key 5.5 runs at a tenth, about 3.6 s; the glow stops with the clip or here. */
const TELEPORT_HOLD_MAX = 6;

/** Every tick the teleport clip is past key 5.5, a blue BITMAP_LIGHT at bone 42 (ZzzCharacter.cpp:4121-4129). `hd`: a halo, and the hand's light cued. */
const teleportHandOf = (hd: boolean): Step => (_at, c) => {
  const t0 = fxNow();
  let seen = false;
  let lit = false;
  let i = 0;
  const tick = (): void => {
    if (entityGone(c.caster)) return;
    const m = c.caster.modelObject;
    const on = !!m && TELEPORT_CLIPS.has(m.CurrentAction);
    if (on) seen = true;
    else if (seen || fxNow() - t0 > 1) return;
    if (on && m && m.actionFrame() > 5.5) {
      const hand = bonePos(c.caster, 42, new Vector3());
      particles({ recipe: TELEPORT_HAND, count: 1 })(hand, c);
      if (hd && i++ % 3 === 0) particles({ recipe: TELEPORT_HALO, count: 1 })(hand, c);
      if (hd && !lit) lighting.skillCue(c.scene, 63, 'hand', c.caster);
      lit = true;
    }
    if (fxNow() - t0 < TELEPORT_HOLD_MAX) delay(TICK, tick);
  };
  tick();
};
const teleportHand = teleportHandOf(false);

/**
 * BITMAP_FLARE_BLUE joint sub19 (ZzzEffectJoint.cpp:1854-1860, :5525-5533): it waits LifeTime - 25
 * ticks 6 m up, then falls 35-54 cm a tick, 5 more every tick, for its last 25. Spawned when the
 * fall starts: a waiting joint draws nothing.
 */
function blueStreak(at: Vector3, c: SkillContext, hd = false): void {
  const p = muRotated(at, Math.random() * 360, cm(Math.random() * 200));
  const wait = Math.floor(Math.random() * 50);
  const d0 = 35 + Math.floor(Math.random() * 20);
  delay(ticks(wait), () => {
    const t0 = fxNow();
    const top = p.y + 6;
    // Graded tiers: the streak stops on the ground (the original's runs on under it) and splashes there.
    const floor = hd ? groundAt(p.x, p.z, p.y) : -Infinity;
    if (hd) {
      let k = 0;
      while (cm(k * d0 + 2.5 * k * (k + 1)) < top - floor) k++;
      delay(ticks(k), () => {
        const hit = new Vector3(p.x, floor + 0.05, p.z);
        sprite({ texture: TEX.flareBlue, colour: RGBS.white, size: 0.9, seconds: ticks(7), grow: 1.8, growFrom: 0.4, fadeTail: 0.6 })(hit, c);
        particles({ recipe: STREAK_SPLASH, count: 4 })(hit, c);
      });
    }
    effects.spawn('joint', c.scene, p, {
      head: out => {
        const k = (fxNow() - t0) / TICK;
        return out.set(p.x, Math.max(floor, top - cm(k * d0 + 2.5 * k * (k + 1))), p.z);
      },
      maxTails: 20,
      width: cm(40),
      seconds: ticks(25),
      colour: RGBS.white,
      texture: TEX.flareBlue,
      fadeTail: 0.04,
    });
  });
}

/** Party Teleport at AttackTime 6 (ZzzCharacter.cpp:4384-4389, ZzzEffect.cpp:2137-2185): the emblem, the blue curtain, the motes and the falling streaks, 10 s. */
const partyCircleOf = (hd: boolean): Step => (at, c) => {
  // Both circles take the caster's o->Angle, so the emblem turns with his facing.
  const yaw = -entityYaw(c.caster);
  seq(
    model({ model: MODEL.circle, texture: TEX.magicEmblem, yaw, seconds: ticks(250), life: emblemWhite }),
    model({ model: MODEL.circle, texture: TEX.magicEmblem, yaw, colour: [0.5, 0.5, 1], seconds: ticks(250), life: emblemBlue }),
    model({ model: MODEL.circle2, yaw, colour: [0.05, 0.05, 1], seconds: ticks(250), life: curtainLife, scrollU: QUAKE_SCROLL }),
    particles({ recipe: hd ? FLARE_BLUE_RISE_HD : FLARE_BLUE_RISE, rate: 12.5, seconds: ticks(220) }),
    (p, cc) => everyTick(210, () => {
      if (Math.random() < 0.5) blueStreak(p, cc, hd);
    }),
    sfx('Sound/eSummon')
  )(at, c);
  // Graded tiers: the emblem's blue pooled on the ground under it.
  if (hd) ring({ texture: TEX.flare, colour: [0.1, 0.16, 0.42], scale: 9, seconds: ticks(250), growFrom: 0.5, fadeTail: 0.08 })(at, c);
};
const partyCircle = partyCircleOf(false);

/** Party Teleport's sheets and meshes, fetched at the packet so the circle is not late on a first cast. */
const partyCircleWarm: Step = (_at, c) => {
  for (const t of [TEX.magicEmblem, TEX.flareBlue, TEX.flare]) void effectTexture(c.scene, t).catch(reportLoadFailure(t));
  const world = storeRef().world;
  if (world) for (const m of [MODEL.circle, MODEL.circle2]) void warmGLTF(m, world);
};

/** Party Teleport (WSclient.cpp:4388-4402). */
const MOUNTED_TELEPORT = {
  uniria: A.PLAYER_ATTACK_RIDE_TELEPORT,
  dinorant: A.PLAYER_ATTACK_RIDE_TELEPORT,
  horse: A.PLAYER_ATTACK_RIDE_TELEPORT,
  fenrir: A.PLAYER_FENRIR_ATTACK_DARKLORD_TELEPORT,
} as const;

export default defineSkill({
  id: 63,
  name: "Summon",
  // 63 Party Teleport (Summon): the held hand's blue BITMAP_LIGHT after key 5.5, and at AttackTime 6
  // MODEL_CIRCLE sub2 + MODEL_CIRCLE_LIGHT sub3 for 250 ticks (ZzzCharacter.cpp:4121-4129, :4384-4389).
  visual: {
    area: atCaster(seq(partyCircleWarm, teleportHand, after(ticks(6), partyCircle)), 0),
    enhanced: { area: atCaster(seq(partyCircleWarm, teleportHandOf(true), after(ticks(6), partyCircleOf(true))), 0) },
  },
  delayMs: 30000, // Summon (Dark Lord)
  clip: { ground: A.PLAYER_ATTACK_TELEPORT, ...MOUNTED_TELEPORT }, // Party Teleport
  // Party Teleport: MODEL_CIRCLE_LIGHT sub3's grey `min(0.5, BlendMeshLight)` range 4 for its 250 ticks (MoveHandlers.cpp:3896).
  light: {
    timed: [{ color: [0.5, 0.5, 0.5], range: 4, delay: 6 * TICK_SECONDS, seconds: 250 * TICK_SECONDS, attack: 5 * TICK_SECONDS, release: 5 * TICK_SECONDS }],
    // The emblem's blue over its 4-tile radius for its 10 s, and the raised hand's glow while it is held.
    enhanced: {
      timed: [
        { ...effectLight([0.4, 0.55, 1], 4, 250 * TICK_SECONDS, { attack: 10 * TICK_SECONDS, release: 20 * TICK_SECONDS }), delay: 6 * TICK_SECONDS },
        { ...effectLight([0.3, 0.5, 1], 0.7, 3.6, { attack: 0.2, release: 0.5, heightOffset: 2 }), delay: 0, cue: 'hand' },
      ],
    },
  },
});
