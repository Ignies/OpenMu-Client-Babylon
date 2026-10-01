import { defineSkill } from '@/controllers/skills/define';
import { CAST_HEIGHT, Step, TICK, ahead, cm, forwardOf, ticks } from '@/controllers/skills/visuals';
import { Carrier, PX_FLARE, TickPoint, atAttackTime, boneCount, carrierLight, groundGlow, humming, jitterCm, spawnCard, sum1Light, swell, tickLoop } from '../_shared';
import { type Entity } from '@/ecs/world';
import { bonePos, delay, entityGone, entityPos, entityYaw, followEntity, fxNow, type RGB } from '@/controllers/fx/core';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { deg, lightFollow, muForward, randInt } from '../../_shared';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { playCombat, playLandingSound } from '@/controllers/sound/combat';

import { A, SkillClipSet } from '@/controllers/combat/recipes';

import { SkillLight } from '@/controllers/lighting/skills';
import { effectLight } from '@/controllers/lighting/recipes';

const PX_RED_FLARE = 64;

// Drain Life (MoveHandlers.cpp:2067-2210).

/** BITMAP_LIGHT+2 sub7's light per tick: full, then `Light *= Alpha` with Alpha 0.9, 0.8, ... from LifeTime 9 (ZzzEffectParticle.cpp:4081-4118). */
const DRAIN_GLOW_LEVELS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0.9, 0.72, 0.504, 0.302, 0.151, 0.06, 0.018, 0.004, 0, 0];
const drainGlowLevel = (age: number): number => {
  const i = Math.min(DRAIN_GLOW_LEVELS.length - 2, Math.floor(age));
  return DRAIN_GLOW_LEVELS[i] + (DRAIN_GLOW_LEVELS[i + 1] - DRAIN_GLOW_LEVELS[i]) * (age - i);
};
/** Its `Light` (1, 0.2, 0.2) brightens by `LifeTime / 8 * 0.02` a tick until the fade starts. */
const DRAIN_GLOW_FROM: RGB = [1, 0.2, 0.2];
const DRAIN_GLOW_TO: RGB = [1.27, 0.47, 0.47];

/** One BITMAP_LIGHT+2 sub7 glow (ZzzEffectParticle.cpp:907-926): flare01, pushed 6 cm a tick out and 2 up, braked x0.6. */
function drainGlow(scene: Scene, body: Entity): void {
  const at = entityPos(body, 0, new Vector3());
  at.x += jitterCm(40);
  at.z += jitterCm(30);
  at.y += cm(80 + randInt(180) - 100);
  const a = Math.random() * Math.PI * 2;
  const push = cm((randInt(2) + 60) * 0.1);
  spawnCard(scene, at, {
    texture: TEX.flare,
    colour: DRAIN_GLOW_FROM,
    colourEnd: DRAIN_GLOW_TO,
    colourTicks: 9,
    size: cm(PX_FLARE * (1.8 + (randInt(4) + 8) * 0.01)),
    grow: cm(PX_FLARE * 0.04),
    ticks: 18,
    brightness: drainGlowLevel,
    velocity: [Math.sin(a) * push, cm(2), Math.cos(a) * push],
    drag: 0.6,
    dragY: 1,
    gravity: cm(0.1),
  });
}

/** 0 (10%), 1 (70%) or 2 (20%) glows a tick (MoveHandlers.cpp:2085-2103). */
const drainGlowCount = (): number => {
  const r = randInt(10);
  return r === 0 ? 0 : r <= 7 ? 1 : 2;
};
/** 0 (10%), 1 (30%), 3 (50%, the 2 case falls through) or 4 (10%) ghosts a tick (:2126-2150). */
const drainGhostCount = (): number => {
  const r = randInt(10);
  return r === 0 ? 0 : r <= 3 ? 1 : r <= 8 ? 3 : 4;
};

/** The ghost streaks' Light and the siphons' (:2176, :2201). */
const DRAIN_GHOST_LIGHT: RGB = [0.8, 0.1, 0.2];
const DRAIN_SIPHON_LIGHT: RGB = [1, 0, 0.1];
const DRAIN_SIPHON_MAX = 24;

/**
 * One BITMAP_DRAIN_LIFE_GHOST (ZzzEffectJoint.cpp:2670-2699, :6837-6867): from 100 cm behind the
 * caster's bone 18, sideways (+-90) and +-50 on every axis, speeding up 2 cm a tick and homing
 * the target's live xy at a height fixed at birth, turning as many degrees a tick as it moves cm.
 */
function drainGhost(scene: Scene, caster: Entity, target: Entity): Carrier {
  const yaw = deg(entityYaw(caster));
  const start = bonePos(caster, 18, new Vector3(), CAST_HEIGHT);
  // vDir = the matrix's +Y column: behind the caster.
  const ahead = forwardOf(entityYaw(caster));
  start.x += -ahead.x + cm(randInt(10) * 5);
  start.z += -ahead.z + cm(randInt(10) * 5);
  start.y += cm(randInt(10) * 5);
  const aimY = entityPos(target, 0, new Vector3()).y + cm(100 + (randInt(10) - 5) * 4);
  const a = [randInt(100) - 50, randInt(100) - 50, yaw + (Math.random() < 0.5 ? 90 : -90) + randInt(100) - 50];
  let v = 1 + randInt(10) * 0.2;
  const lt = 30 + randInt(20) - 10;
  const head = new TickPoint(start);
  const aim = new Vector3();
  const step = new Vector3();
  let done = false;
  effects.spawn('joint', scene, start, {
    head: head.at,
    seconds: ticks(lt),
    maxTails: 20 + randInt(10) - 5,
    width: cm(40 + randInt(60) - 30),
    colour: DRAIN_GHOST_LIGHT,
    texture: TEX.drainGhost,
    fadeTail: 10 / lt,
    until: () => done,
  });
  tickLoop(lt, () => {
    if (entityGone(target)) {
      done = true;
      return false;
    }
    const p = head.tick();
    p.addInPlace(muForward(a, cm(v), step));
    entityPos(target, 0, aim).y = aimY;
    humming(p, a, aim, v);
    v += 2;
  });
  const end = fxNow() + ticks(lt);
  return { at: head.at, done: () => done || fxNow() >= end };
}

/**
 * One BITMAP_JOINT_ENERGY sub45 siphon off a target bone (ZzzEffectJoint.cpp:213-247, :3235-3414):
 * a rising helix for 20 ticks (3 cm on, 10 degrees round, 6 cm up a tick), then homing the
 * caster 120 cm up at up to 30 cm a tick; flareRed at its head. Within 35 cm it is gone, into
 * pEnergy and the arrival light.
 */
function drainSiphon(scene: Scene, caster: Entity, target: Entity, bone: number, skill: number, arrive: (at: Vector3) => void, enh = false): Carrier {
  const start = bonePos(target, bone, new Vector3());
  const head = new TickPoint(start);
  const a = [0, 0, deg(entityYaw(target))];
  const aim = new Vector3();
  const step = new Vector3();
  let v = 3;
  let done = false;
  const until = (): boolean => done;
  effects.spawn('joint', scene, start, { head: head.at, seconds: ticks(120), maxTails: 8, width: cm(10), colour: DRAIN_SIPHON_LIGHT, texture: TEX.jointLaser, fadeTail: 0.01, until });
  spawnCard(scene, start, { texture: TEX.redFlare, colour: RGBS.white, size: cm(PX_RED_FLARE * 0.3), ticks: 120, follow: head.at, until });
  // Enhanced: a soft red halo round the head instead of a light on every siphon (the cast carries one for the bundle).
  if (enh) spawnCard(scene, start, { texture: TEX.flare, colour: DRAIN_HEAD_HALO, size: cm(PX_FLARE * 0.9), ticks: 120, follow: head.at, until });
  const light = enh ? null : lighting.skillTrail(scene, skill, lightFollow(head.at));
  tickLoop(120, i => {
    if (entityGone(caster)) done = true;
    if (done) {
      light?.stop();
      return false;
    }
    const p = head.tick();
    p.addInPlace(muForward(a, cm(v), step));
    if (120 - i > 100) {
      a[2] += 10;
      p.y += cm(6);
      return;
    }
    v = Math.min(30, v + 5);
    const was = a[2];
    const dist = humming(p, a, entityPos(caster, cm(120), aim), v);
    if (dist <= cm(35)) {
      done = true;
      light?.stop();
      arrive(p);
      return false;
    }
    if (dist <= cm(70) && Math.abs(was - a[2]) > 20 && v >= 20) v -= 10;
  });
  delay(ticks(120), () => light?.stop());
  return { at: head.at, done: until };
}

/**
 * Drain Life at AttackTime 15: the invisible MODEL_ALICE_DRAIN_LIFE (LT 70) on the caster
 * (ZzzEffect.cpp:867-874) - red glows round the caster for its life and round the target from
 * tick 10, ghost streaks for the first 5 ticks, and at LifeTime 64 a siphon off every other
 * target bone.
 */
const drainLifeStep = (enh: boolean): Step => atAttackTime((_at, c, skill) => {
  const { caster, target, scene } = c;
  if (!target || entityGone(caster) || entityGone(target)) return;
  playLandingSound(skill, entityPos(caster, 0, new Vector3()));
  let lastArrival = -1;
  const arrive = (p: Vector3): void => {
    // One pEnergy and one arrival light a tick: the original replays the same buffer per siphon.
    const now = Math.floor(fxNow() / TICK);
    if (now === lastArrival) return;
    lastArrival = now;
    playCombat('Sound/pEnergy', p);
    lighting.skillLand(scene, skill, p);
    if (enh) drainArrival(scene, caster);
  };
  if (enh) drainAuras(scene, caster, target);
  let ghostLit = !enh;
  tickLoop(70, i => {
    if (entityGone(caster) || entityGone(target)) return;
    const lt = 70 - i;
    const n = drainGlowCount();
    for (let k = 0; k < n; k++) drainGlow(scene, caster);
    if (lt <= 60) for (let k = 0; k < n; k++) drainGlow(scene, target);
    if (lt >= 66) {
      for (let k = drainGhostCount(); k > 0; k--) {
        const ghost = drainGhost(scene, caster, target);
        if (!ghostLit) {
          ghostLit = true;
          carrierLight(scene, DRAIN_GHOST_LIGHT, 0.8, ticks(40), ghost);
        }
      }
    }
    if (enh && lt < 64 && lt >= 34) drainMote(scene, target);
    if (lt === 64) {
      // Capped at DRAIN_SIPHON_MAX ribbons: a many-boned body would otherwise put 40+ lines up.
      const bones = boneCount(target);
      for (let b = 0, n = 0; b < bones && n < DRAIN_SIPHON_MAX; b++) {
        if (Math.random() >= 0.5) continue;
        const siphon = drainSiphon(scene, caster, target, b, skill, arrive, enh);
        if (enh && n === 0) carrierLight(scene, DRAIN_SIPHON_LIGHT, 0.8, ticks(120), siphon);
        n++;
      }
    }
  });
});
const drainLife = drainLifeStep(false);

// Drain Life, enhanced.

/** The siphon head's halo, the glows' red as a light, and the pool it leaves under a body. */
const DRAIN_HEAD_HALO: RGB = [0.55, 0.06, 0.1];
const DRAIN_AURA: RGB = [1, 0.2, 0.25];
const DRAIN_POOL: RGB = [0.22, 0.02, 0.04];

/**
 * The red the glows pool on the ground under both bodies, and the light they throw: round the caster
 * for the effect's 70 ticks, round the target from tick 10 (MoveHandlers.cpp:2085-2103).
 */
function drainAuras(scene: Scene, caster: Entity, target: Entity): void {
  for (const [body, from, n] of [[caster, 0, 70], [target, 10, 60]] as const) {
    delay(ticks(from), () => {
      if (entityGone(body)) return;
      const gone = (): boolean => entityGone(body);
      groundGlow(scene, followEntity(body, 0.04), DRAIN_POOL, 1.8, n, gone);
      sum1Light(scene, DRAIN_AURA, 0.8, ticks(n), followEntity(body, 1), () => !gone(), { attack: ticks(6), release: ticks(12) });
    });
  }
}

/** Life lifting off the target while the siphons rise: a red mote off a random bone, drifting up. */
function drainMote(scene: Scene, target: Entity): void {
  const bones = boneCount(target);
  if (!bones) return;
  const p = bonePos(target, randInt(bones), new Vector3());
  const n = 20 + randInt(10);
  spawnCard(scene, p, { texture: TEX.flare, colour: [1, 0.15, 0.2], size: cm(PX_FLARE * (0.3 + randInt(20) * 0.01)), ticks: n, velocity: [jitterCm(2), cm(3 + randInt(3)), jitterCm(2)], drag: 0.95, brightness: swell(n, 3, n * 0.6) });
}

/** A siphon reaching home: a short red bloom on the caster's chest (the original's arrival is a Scale 0 sprite). */
function drainArrival(scene: Scene, caster: Entity): void {
  const chest = followEntity(caster, cm(120));
  spawnCard(scene, chest(new Vector3()), { texture: TEX.flare, colour: [1, 0.3, 0.4], size: cm(PX_FLARE * 1.2), grow: cm(PX_FLARE * 0.25), ticks: 8, lifeFade: true, follow: chest });
}

/** Drain Life, and its three mounts (ZzzInterface.cpp:2545-2560). */
export const DRAIN_LIFE_CLIPS: SkillClipSet = {
  ground: A.PLAYER_SKILL_DRAIN_LIFE,
  uniria: A.PLAYER_SKILL_DRAIN_LIFE_UNI,
  dinorant: A.PLAYER_SKILL_DRAIN_LIFE_DINO,
  fenrir: A.PLAYER_SKILL_DRAIN_LIFE_FENRIR,
};

/**
 * Drain Life: each JOINT_ENERGY siphon lights `L * (0.4, 1, 0.8)`, L 0.24-0.33, range 2 every tick
 * of its flight (ZzzEffectJoint.cpp:3377-3379), and dies into a BITMAP_LIGHTNING+1 lighting
 * `LifeTime / 10 * (0.5, 1, 0.8)` range 3 for 10 ticks (ZzzEffectParticle.cpp:4281-4287).
 */
export const DRAIN_LIFE_LIGHT: SkillLight = {
  trail: { color: [0.11, 0.28, 0.22], range: 2, release: 0.1 },
  land: { color: [0.5, 1, 0.8], range: 3, seconds: 0.4, release: 0.4 },
  // Enhanced: the arrival lights in the siphons' red, where the effect now draws a bloom; the bundle carries one light.
  enhanced: { land: effectLight([1, 0.25, 0.35], 1.2, 0.4, { release: 0.3 }) },
};

export default defineSkill({
  id: 214,
  name: "Drain Life",
  // 214 Drain Life: MODEL_ALICE_DRAIN_LIFE at AttackTime 15 - red glows, ghost streaks from behind the caster, a
  // siphon off every other target bone homing back (drainLife).
  visual: { impact: drainLife, enhanced: { impact: drainLifeStep(true) } },
  sound: 'Sound/SE_Ch_summoner_skill07_lifedrain', // Drain Life
  // --- Summoner (UseSkillSummon, ZzzInterface.cpp:2534-2680) --------------
  clip: DRAIN_LIFE_CLIPS, // Drain Life
  light: DRAIN_LIFE_LIGHT,
});
