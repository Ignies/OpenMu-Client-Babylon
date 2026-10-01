import { defineSkill } from '@/controllers/skills/define';
import { CAST_HEIGHT, ENHANCED_TIER, IMPACT_HEIGHT, TICK, cm, seq, ticks } from '@/controllers/skills/visuals';
import { CRACKLE_FLICKER, PX_FLARE, PX_SHOCKWAVE, PX_SMOKE, PX_THUNDER, atAttackTime, boneCount, groundGlow, handCrackle, humming, jitterCm, kickSparks, spawnCard, sum1Light } from '../_shared';
import { type Entity } from '@/ecs/world';
import { type JointOptions } from '@/controllers/fx/joint';
import { PlayerAction } from '@versions/shared/objects/enum';
import { bonePos, delay, entityGone, entityPos, entityYaw, followEntity, fxNow, type PointSource, type RGB } from '@/controllers/fx/core';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { SKILL_SOUNDS, playCombat } from '@/controllers/sound/combat';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { deg, lightFollow, muForward, rad, randInt } from '../../_shared';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { tierIndex } from '@/controllers/lighting/lightingQuality';

import { A, SkillClipSet } from '@/controllers/combat/recipes';

import { SkillLight } from '@/controllers/lighting/skills';
import { effectLight } from '@/controllers/lighting/recipes';

// Chain Lightning (MoveHandlers.cpp:1978-2064, WSclient.cpp:5577-5629).

/** The hops' JOINT_THUNDER Light (0.4, 0.4, 1.0); hops 1-2 pass an unset vLight and are drawn in the same blue. */
const CHAIN_LIGHT: RGB = [0.4, 0.4, 1];
/** MODEL_CHAIN_LIGHTNING LT 20 (ZzzEffect.cpp:852-865). */
const CHAIN_TICKS = 20;
/** JOINT_THUNDER: MaxTails 50 steps of Velocity 50 cm, LT 2 (ZzzEffectJoint.cpp:1100-1110). */
const THUNDER_STEPS = 50;
const THUNDER_STEP = cm(50);

/**
 * A JOINT_THUNDER walk (ZzzEffectJoint.cpp:4767-5020): from `from`, each 50 cm step MoveHumming
 * turns the heading up to 50 degrees at the target and a fresh deviation (`deviate()` degrees on
 * pitch and yaw) bends that step alone; it ends within 1.5 steps of the target. The points the
 * walk does not use are laid along its last step. `end` gets where it stopped.
 */
function thunderPath(start: () => readonly [number, number], deviate: () => number, end?: (p: Vector3) => void): NonNullable<JointOptions['path']> {
  const a = [0, 0, 0];
  const p = new Vector3();
  const step = new Vector3();
  const d = [0, 0, 0];
  return (from, to, out, segments) => {
    const [pitch, yaw] = start();
    a[0] = pitch;
    a[1] = 0;
    a[2] = yaw;
    p.copyFrom(from);
    let k = 0;
    for (let j = 0; j < THUNDER_STEPS && k <= segments; j++) {
      const dist = humming(p, a, to, 50);
      out[k * 3] = p.x;
      out[k * 3 + 1] = p.y;
      out[k * 3 + 2] = p.z;
      k++;
      if (dist < THUNDER_STEP * 1.5) break;
      d[0] = a[0] + deviate();
      d[2] = a[2] + deviate();
      p.addInPlace(muForward(d, THUNDER_STEP, step));
    }
    end?.(p);
    if (k < 2) {
      // Born on the target: a straight stub.
      out[0] = from.x;
      out[1] = from.y;
      out[2] = from.z;
      out[3] = to.x;
      out[4] = to.y;
      out[5] = to.z;
      k = 2;
    }
    const b = (k - 2) * 3;
    const e = (k - 1) * 3;
    const n = segments + 1 - (k - 1);
    const ex = out[e];
    const ey = out[e + 1];
    const ez = out[e + 2];
    const bx = out[b];
    const by = out[b + 1];
    const bz = out[b + 2];
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / n;
      const o = b + 3 + i * 3;
      out[o] = bx + (ex - bx) * t;
      out[o + 1] = by + (ey - by) * t;
      out[o + 2] = bz + (ez - bz) * t;
    }
  };
}

/** `(rand() % 1024 - 512) / Scale` degrees. */
const thunderDeviation = (widthCm: number) => (): number => (randInt(1024) - 512) / widthCm;

/**
 * What a width-50 JOINT_THUNDER leaves where it ends, each of its two ticks (:4981-5003): a
 * Thunder01 chip (BITMAP_ENERGY, LT 2, turning 20 degrees a tick), a white smoke puff one tick in
 * eight, and in the first half of each second one in sixteen a small sub28 fork into the target.
 */
function thunderEnd(scene: Scene, target: PointSource, at: Vector3): void {
  spawnCard(scene, at, { texture: TEX.thunder, colour: CHAIN_LIGHT, size: cm(PX_THUNDER * (randInt(8) + 6) * 0.1), ticks: 2, roll: Math.random() * Math.PI * 2, spin: rad(20) });
  if (randInt(8) === 0) {
    // BITMAP_SMOKE sub0: LT 16, Light = LifeTime / 8 white, rising +0.2 cm a tick faster, Scale +0.05.
    spawnCard(scene, at, { texture: TEX.smoke, colour: RGBS.white, size: cm(PX_SMOKE * (randInt(32) + 48) * 0.01), grow: cm(PX_SMOKE * 0.05), ticks: 16, brightness: age => Math.min(1, (16 - age) / 8), gravity: -cm(0.2), roll: Math.random() * Math.PI * 2 });
  }
  if (fxNow() % 1 < 0.5 && randInt(16) === 0) {
    const t = target(new Vector3());
    const from = new Vector3(t.x + jitterCm(50), t.y + jitterCm(60), t.z + jitterCm(50));
    effects.spawn('joint', scene, from, {
      to: target,
      colour: CHAIN_LIGHT,
      seconds: ticks(2),
      width: cm(6 + randInt(8)),
      segments: THUNDER_STEPS,
      path: thunderPath(() => [0, randInt(360)], () => randInt(256) - 128),
      reroll: 1,
      steady: true,
      fadeTail: 0.01,
      texture: TEX.jointThunder,
      textureScroll: 1,
    });
  }
}

/**
 * One Chain Lightning hop, MODEL_CHAIN_LIGHTNING sub `hop` (MoveHandlers.cpp:1978-2064): for 20
 * ticks a new pair of JOINT_THUNDER (Scale 50 and 10) every tick on each arc - hop 0 four arcs
 * off the two hands, pitched 60 up and turned 60 aside; hops 1-2 one arc from body to body, 80
 * cm up. Each joint lives 2 ticks, so two walks overlap on every arc. At LifeTime 15 each bone of
 * the target flares blue. Only subtypes 0-2 exist.
 */
export function playChainLightningHop(scene: Scene, skill: number, from: Entity, to: Entity, hop: number): void {
  if (hop > 2 || from === to || !from.transform || !to.transform) return;
  let done = false;
  const dead = (): boolean => done || entityGone(from) || entityGone(to) || !!to.dying;
  const aim = followEntity(to, cm(80));
  const arc = (source: PointSource, start: () => readonly [number, number]): void => {
    for (const width of [50, 10]) {
      for (const gen of [0, 1]) {
        const end = width === 50 ? (p: Vector3) => thunderEnd(scene, aim, p) : undefined;
        const bolt = (): void => {
          if (dead()) return;
          effects.spawn('joint', scene, source(new Vector3()), {
            from: source,
            to: aim,
            colour: CHAIN_LIGHT,
            seconds: ticks(CHAIN_TICKS),
            width: cm(width),
            segments: THUNDER_STEPS,
            path: thunderPath(start, thunderDeviation(width), end),
            reroll: ticks(2),
            steady: true,
            fadeTail: 0.01,
            texture: TEX.jointThunder,
            textureScroll: 1,
            until: dead,
          });
        };
        if (gen === 0) bolt();
        else delay(TICK, bolt);
      }
    }
  };
  if (hop === 0) {
    const yaw = (): number => deg(entityYaw(from));
    for (const [bone, side] of [[37, 60], [28, -60]] as const) {
      const hand: PointSource = out => bonePos(from, bone, out, CAST_HEIGHT);
      arc(hand, () => [-60, yaw()]);
      arc(hand, () => [0, yaw() + side]);
    }
  } else {
    arc(followEntity(from, cm(80)), () => [0, deg(entityYaw(to))]);
  }
  delay(ticks(CHAIN_TICKS + 1), () => (done = true));
  // `(int)LifeTime == 15`: BITMAP_LIGHT sub5 on every target bone, x0.9 light and x0.95 size a tick (ZzzEffectParticle.cpp:8041);
  // dropped once under 5% light instead of drawn unseen for the rest of its 50 ticks.
  const enh = tierIndex() >= ENHANCED_TIER;
  delay(ticks(5), () => {
    if (dead()) return;
    const bones = boneCount(to);
    const p = new Vector3();
    for (let b = 0; b < bones; b++) {
      spawnCard(scene, bonePos(to, b, p), { texture: TEX.flare, colour: [0.2, 0.2, 0.8], size: cm(PX_FLARE * (3 + (randInt(20) - 10) * 0.1)), ticks: 50, decay: 0.9, growMul: 0.95, minLight: 0.05 });
    }
    if (enh) chainStrike(scene, to, CHAIN_TICKS - 5);
  });
  // The width-50 walks light the ground under them every step: lights spaced along the hop.
  const a = entityPos(from, IMPACT_HEIGHT, new Vector3());
  const b = entityPos(to, IMPACT_HEIGHT, new Vector3());
  const n = Math.max(1, Math.round(Vector3.Distance(a, b) / 2));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const at: PointSource = out => {
      entityPos(from, IMPACT_HEIGHT, a);
      entityPos(to, IMPACT_HEIGHT, b);
      return Vector3.LerpToRef(a, b, t, out);
    };
    lighting.skillLand(scene, skill, at(new Vector3()), lightFollow(at));
  }
}

/** Chain Lightning's hands on the ground clip only (ZzzCharacter.cpp:10743-10768), Light (0.4, 0.4, 0.8). */
const chainHands = handCrackle([37, 28], [0.4, 0.4, 0.8], 1.5, [PlayerAction.PLAYER_SKILL_CHAIN_LIGHTNING]);
const chainHandsLit = handCrackle([37, 28], [0.4, 0.4, 0.8], 1.5, [PlayerAction.PLAYER_SKILL_CHAIN_LIGHTNING], 0.7);

/** The chain wav again at AttackTime 15 (ZzzCharacter.cpp:5207-5212); the reply played it once already. */
const chainSoundAgain = atAttackTime((_at, c, skill) => {
  if (!entityGone(c.caster)) playCombat(SKILL_SOUNDS[skill] ?? null, entityPos(c.caster, 0, new Vector3()));
});

// Chain Lightning, enhanced.

/**
 * Where a hop lands, with the bone glows: a blue-white strike on the chest, sparks off it, a shock ring and
 * a pool of blue on the ground, and the hop's light on the body for its remaining `n` ticks.
 */
function chainStrike(scene: Scene, to: Entity, n: number): void {
  const chest = followEntity(to, 1);
  const at = chest(new Vector3());
  const gone = (): boolean => entityGone(to);
  spawnCard(scene, at, { texture: TEX.flare, colour: [0.6, 0.65, 1], size: cm(PX_FLARE * 3), grow: cm(PX_FLARE * 0.3), ticks: 6, lifeFade: true, follow: chest });
  kickSparks(scene, at, [0.7, 0.75, 1], 6);
  const feet = followEntity(to, 0.04);
  spawnCard(scene, feet(new Vector3()), { texture: TEX.shockwave, colour: [0.25, 0.3, 0.9], size: cm(PX_SHOCKWAVE * 0.3), grow: cm(PX_SHOCKWAVE * 0.25), ticks: 8, lifeFade: true, flat: true, follow: feet });
  groundGlow(scene, feet, [0.12, 0.14, 0.5], 1.8, n, gone);
  sum1Light(scene, CHAIN_LIGHT, 1.3, ticks(n), chest, () => !gone(), { flicker: CRACKLE_FLICKER, release: ticks(6) });
}

/** Chain Lightning, and its three mounts (:2592-2610). */
export const CHAIN_LIGHTNING_CLIPS: SkillClipSet = {
  ground: A.PLAYER_SKILL_CHAIN_LIGHTNING,
  uniria: A.PLAYER_SKILL_CHAIN_LIGHTNING_UNI,
  dinorant: A.PLAYER_SKILL_CHAIN_LIGHTNING_DINO,
  fenrir: A.PLAYER_SKILL_CHAIN_LIGHTNING_FENRIR,
};

/**
 * Chain Lightning: every 50 cm step of a width-50 JOINT_THUNDER lights `L * (0.1, 0.1, 0.5)`, L
 * 0.16-0.28, range 2 (ZzzEffectJoint.cpp:5006-5021); the steps of the hop's walks overlap into a
 * blue band along it for the hop's 20 ticks. The effect lays one of these every two tiles of it.
 */
export const CHAIN_LIGHTNING_LIGHT: SkillLight = {
  land: { color: [0.15, 0.15, 0.75], range: 2, seconds: 0.84, release: 0.1 },
  enhanced: { land: effectLight([0.4, 0.4, 1], 1.2, 0.84, { flicker: { min: 0.55, max: 1, steps: 3 }, release: 0.15 }) },
};

export default defineSkill({
  id: 215,
  name: "Chain Lightning",
  // 215 Chain Lightning: the hand crackle while the ground clip plays and the wav again at AttackTime 15; the
  // arcs come with the BF 0A hops (playChainLightningHop).
  visual: { cast: seq(chainHands, chainSoundAgain), enhanced: { cast: seq(chainHandsLit, chainSoundAgain) } },
  sound: 'Sound/SE_Ch_summoner_skill08_chainlightning', // Chain Lightning
  clip: CHAIN_LIGHTNING_CLIPS, // Chain Lightning
  light: CHAIN_LIGHTNING_LIGHT,
});
