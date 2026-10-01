import { defineSkill } from '@/controllers/skills/define';
import { CRACKLE_FLICKER, PX_PIN, PX_SHOCKWAVE, PX_SPARK3, PX_THUNDER, SPRITE_TURN, TickPoint, atAttackTime, carrierSprites, fenrirThunder, groundGlow, handCrackle, magicParticle, muTurn, spawnCard, sum1Light, throwSmoke, tickLoop } from '../_shared';
import { PlayerAction } from '../../../objects/enum';
import { entityGone, entityPos, entityYaw, fxNow, type PointSource, type RGB } from '@/controllers/fx/core';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { Step, cm, ticks } from '@/controllers/skills/visuals';
import { decay, deg, heldAt, muForward, onGround, rad, randInt } from '../../_shared';
import { playLandingSound } from '@/controllers/sound/combat';

import { A } from '@/controllers/combat/recipes';

const PX_SHINY5 = 64;

// Lightning Orb (ZzzEffect.cpp:6886-6965).

const ORB_CLIPS = [
  PlayerAction.PLAYER_SKILL_LIGHTNING_ORB,
  PlayerAction.PLAYER_SKILL_LIGHTNING_ORB_UNI,
  PlayerAction.PLAYER_SKILL_LIGHTNING_ORB_DINO,
  PlayerAction.PLAYER_SKILL_LIGHTNING_ORB_FENRIR,
] as const;

/** Lightning Orb's forearm, bone 27, Light (0.2, 0.2, 1.0), on all four clips (ZzzCharacter.cpp:10574-10590). */
const orbArm = handCrackle([27], [0.2, 0.2, 1], 0, ORB_CLIPS);
const orbArmLit = handCrackle([27], [0.2, 0.2, 1], 0, ORB_CLIPS, 0.7);

/** SPARK+1 sub13 (ZzzEffectParticle.cpp:2198-2206, :6706-6715): Spark03, LT 30, drifting, light /1.05 and Scale -0.04 a tick. */
function orbSpark(scene: Scene, at: Vector3, yaw: number): void {
  const v = muTurn(randInt(8) - 4, randInt(4), randInt(4), yaw, new Vector3());
  spawnCard(scene, at, { texture: TEX.spark3, colour: RGBS.white, size: cm(PX_SPARK3 * (randInt(5) / 10 + 1)), grow: -cm(PX_SPARK3 * 0.04), ticks: 30, decay: 1 / 1.05, velocity: [v.x, v.y, v.z] });
}

/**
 * MODEL_LIGHTNING_ORB sub1 where the orb met its target (LT 18, Light /1.08 a tick): shiny05,
 * pin_lights and a Thunder01 star while LifeTime >= 5, bouncing sparks for 4 ticks, shock waves
 * for 5, two wide MODEL_FENRIR_THUNDER every tick and blue smoke in the last 5.
 */
function orbBurst(scene: Scene, p: Vector3, enh = false): void {
  const at = p.clone();
  if (enh) orbBurstGrace(scene, at);
  const roll = rad(fxNow() * 216);
  const decay = 1 / 1.08;
  for (const [s, dir] of [[3, 1], [2, -1]] as const) spawnCard(scene, at, { texture: TEX.shiny5, colour: [0.1, 0.5, 1.5], size: cm(PX_SHINY5 * s), ticks: 14, roll: roll * dir, spin: SPRITE_TURN * dir });
  for (let i = 0; i < 2; i++) spawnCard(scene, at, { texture: TEX.pinLights, colour: [0.3, 0.3, 1], size: cm(PX_PIN * 4), aspect: 8, ticks: 14, decay, rerollEachTick: true });
  spawnCard(scene, at, { texture: TEX.thunder, colour: RGBS.white, size: cm(PX_THUNDER * 4), ticks: 14, decay, roll, spin: SPRITE_TURN });
  tickLoop(18, i => {
    const lt = 18 - i;
    const light = decay ** i;
    if (lt >= 15) {
      for (let k = 0; k < 5; k++) {
        // SPARK+1 sub20 (:2294-2305, :6810-6829): +-5 cm a tick, kicked 7.5-12 cm up and falling, bouncing at 0.3.
        const v = muTurn((randInt(40) - 20) * 0.25, (randInt(40) - 20) * 0.25, (randInt(10) + 15) * 0.5, randInt(360), new Vector3());
        spawnCard(scene, at, { texture: TEX.spark3, colour: RGBS.white, size: cm(PX_SPARK3 * (1 + randInt(10) * 0.02)), ticks: 60 + randInt(10), light, decay: 1 / 1.02, minLight: 0.05, velocity: [v.x, v.y, v.z], gravity: cm(0.75), bounce: [cm(3), 0.3, 2] });
      }
    }
    if (lt >= 14) {
      // BITMAP_SHOCK_WAVE sub0 (:3731-3741, :8694-8710): Scale 0.3 growing 0.8 a tick, LT 7, light /1.5.
      for (let k = 0; k < 2; k++) spawnCard(scene, at, { texture: TEX.shockwave, colour: [0.4, 0.3, 1], size: cm(PX_SHOCKWAVE * 0.3), grow: cm(PX_SHOCKWAVE * 0.8), ticks: 7, decay: 1 / 1.5 });
    }
    for (let k = 0; k < 2; k++) fenrirThunder(scene, at, [0.2, 0.2, 1], true);
    if (lt <= 5) for (let k = 0; k < 2; k++) throwSmoke(scene, at, [0.5, 0.5, 1]);
  });
}

/** The orb's tints; enhanced brings the rings and the trail under 1, where the graded buffer bleached them white. */
const ORB_CLASSIC: Record<'shiny' | 'magic' | 'pin' | 'trail', RGB> = { shiny: [0.1, 0.7, 1.5], magic: [0.1, 0.1, 1.5], pin: [0.5, 0.5, 1.5], trail: [0.4, 0.4, 1.5] };
const ORB_ENHANCED: typeof ORB_CLASSIC = { shiny: [0.1, 0.7, 1.5], magic: [0.1, 0.2, 1], pin: [0.4, 0.45, 1.2], trail: [0.18, 0.24, 1] };

/**
 * MODEL_LIGHTNING_ORB sub0 at AttackTime 15 (ZzzEffect.cpp:837-850): 100 cm up, 60 cm a tick
 * straight along the caster's facing for LT 20, drawing its sprites, a BITMAP_MAGIC and three
 * sparks a tick. Within 100 cm (xy) of the live target it bursts where it is (CheckTargetRange).
 */
const lightningOrbStep = (enh: boolean): Step => atAttackTime((_at, c, skill) => {
  const { caster, target, scene } = c;
  if (entityGone(caster)) return;
  playLandingSound(skill, entityPos(caster, 0, new Vector3()));
  const yaw = deg(entityYaw(caster));
  const orb = new TickPoint(entityPos(caster, cm(100), new Vector3()));
  const step = muForward([0, 0, yaw], cm(60), new Vector3());
  let alive = true;
  const until = (): boolean => !alive;
  const look = enh ? ORB_ENHANCED : ORB_CLASSIC;
  carrierSprites(scene, orb.at, until, 20, 1, look.shiny, look.magic, look.pin);
  if (enh) orbGrace(scene, orb.at, until);
  tickLoop(20, i => {
    const p = orb.tick().addInPlace(step);
    magicParticle(scene, p, look.trail, 1);
    for (let k = 0; k < 3; k++) orbSpark(scene, p, yaw);
    if (enh && i % 2 === 0) fenrirThunder(scene, p, look.magic, false);
    const t = target && !entityGone(target) && !target.dying ? target.transform : undefined;
    if (t) {
      if (Math.hypot(p.x - t.pos.x, p.z - t.pos.z) <= 1) {
        alive = false;
        orbBurst(scene, p, enh);
        return false;
      }
    }
    if (i === 19) alive = false;
  });
});
const lightningOrb = lightningOrbStep(false);

// Lightning Orb, enhanced.

const ORB_LIGHT: RGB = [0.2, 0.55, 1];

/** The orb in flight: its light and the blue it throws on the ground under it. */
function orbGrace(scene: Scene, orb: PointSource, until: () => boolean): void {
  groundGlow(scene, onGround(orb), [0.05, 0.12, 0.4], 2, 20, until);
  sum1Light(scene, ORB_LIGHT, 1.5, ticks(20), orb, () => !until(), { release: ticks(3) });
}

/** The burst: a blue shock ring and pool on the ground under it, and its flickering light over its 18 ticks. */
function orbBurstGrace(scene: Scene, at: Vector3): void {
  const ground = onGround(heldAt(at))(new Vector3());
  spawnCard(scene, ground, { texture: TEX.shockwave, colour: [0.3, 0.35, 1], size: cm(PX_SHOCKWAVE * 0.4), grow: cm(PX_SHOCKWAVE * 0.35), ticks: 10, lifeFade: true, flat: true });
  groundGlow(scene, heldAt(ground), [0.1, 0.2, 0.6], 3, 18);
  sum1Light(scene, ORB_LIGHT, 2, ticks(18), heldAt(at), undefined, { flicker: CRACKLE_FLICKER, release: ticks(8) });
}

export default defineSkill({
  id: 216,
  name: "Lightning Orb",
  // 216 Lightning Orb: the forearm crackle, then MODEL_LIGHTNING_ORB at AttackTime 15 (lightningOrb).
  visual: { cast: orbArm, impact: lightningOrb, enhanced: { cast: orbArmLit, impact: lightningOrbStep(true) } },
  sound: 'Sound/SE_Ch_summoner_skill01_lightningof', // Lightning Orb
  clip: {
    ground: A.PLAYER_SKILL_LIGHTNING_ORB,
    uniria: A.PLAYER_SKILL_LIGHTNING_ORB_UNI,
    dinorant: A.PLAYER_SKILL_LIGHTNING_ORB_DINO,
    fenrir: A.PLAYER_SKILL_LIGHTNING_ORB_FENRIR,
  }, // Lightning Orb
});
