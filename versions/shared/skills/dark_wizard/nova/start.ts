import { defineSkill } from '@/controllers/skills/define';
import { ENERGY_CHIPS, TEX } from '@/controllers/fx/recipes';
import { type Entity } from '@/ecs/world';
import { NOVA_BLUE, NOVA_GRADED, NOVA_MAX_STAGE } from './';
import { bonePos, delay, emitBurst, entityGone, entityPos, followEntity, fxNow, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';
import { PlayerAction } from '@versions/shared/objects/enum';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { SkillContext, Step, TICK, cm, perTick, ticks } from '@/controllers/skills/visuals';
import { combat } from '@/controllers/combat';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { novaStageOf } from './charge';
import { playCombat } from '@/controllers/sound/combat';

import { A } from '@/controllers/combat/recipes';

import { NOVA_GRADED_LIGHT } from './';
import { SkillLight } from '@/controllers/lighting/skills';
import { effectLight } from '@/controllers/lighting/recipes';

/** The charge runs while the caster is in HELL_BEGIN or HELL_START (ZzzCharacter.cpp:5727). */
function inNovaCharge(e: Entity): boolean {
  if (entityGone(e)) return false;
  const a = e.playerAnimation?.action;
  return a === PlayerAction.PLAYER_SKILL_HELL_BEGIN || a === PlayerAction.PLAYER_SKILL_HELL_START || (!!e.localPlayer && combat.novaCharging);
}

/** Even bones 0..38 carry the charge (ZzzCharacter.cpp:5733). */
const NOVA_CHARGE_BONES = 40;
/**
 * BITMAP_LIGHT sub6 at Scale 1.3 + 0.08 count: 64 cm x U(0.5, 1.0), LT 10-19, rising 2.5 cm a tick, Scale and
 * Light x0.95 a tick (ZzzEffectParticle.cpp:3178-3183, 8016-8034). One recipe per stage, built once.
 */
const novaChargeMotes: ParticleRecipe[] = [];
const novaChargeGraded: ParticleRecipe[] = [];
function novaChargeRecipe(count: number, graded = false): ParticleRecipe {
  const cache = graded ? novaChargeGraded : novaChargeMotes;
  return (cache[count] ??= {
    texture: TEX.flare,
    colour: graded ? NOVA_GRADED : NOVA_BLUE,
    size: cm(64) * 0.75 * (1.3 + count * 0.08),
    sizeJitter: 1 / 3,
    life: ticks(19),
    lifeJitter: 9 / 19,
    box: [0.01, 0.01, 0.01],
    dir1: [0, 1, 0],
    dir2: [0, 1, 0],
    power: perTick(2.5),
    powerJitter: 0,
    gravity: 0,
    endScale: Math.pow(0.95, 14.5),
    capacity: 2048,
  });
}

/** CreateForce's JOINT_HEALING sub8 (ZzzEffect.cpp:90-104, ZzzEffectJoint.cpp:510-518, 3632-3662). */
const FORCE_RADIUS = cm(500);
const FORCE_TICKS = 17;
const FORCE_TURN = (10 * Math.PI) / 180;
/** Its Light x1/1.8 a tick over the last 6 ticks, which also dims the head's card. */
const forceLight = (t: number): number => {
  const n = t / TICK;
  return n <= 11 ? 1 : Math.pow(1 / 1.8, n - 11);
};

/**
 * One sub8 comet: from 5 m out at a random yaw and a 0-89 degree elevation, +120, heading back at the feet;
 * Velocity 0 gaining 4 cm a tick, homing on the feet + 100 by up to 10 degrees a tick while LifeTime > 10.
 * Two quads of JointEnergy01 at width 10 drawn over everything, and a 64 cm flare card at the head.
 */
function forceComet(scene: Scene, feet: Vector3, ribbon: boolean, graded = false): void {
  const yaw = Math.random() * Math.PI * 2;
  const elev = (Math.floor(Math.random() * 90) * Math.PI) / 180;
  const pos = new Vector3(feet.x + Math.cos(yaw) * Math.cos(elev) * FORCE_RADIUS, feet.y + Math.sin(elev) * FORCE_RADIUS + cm(120), feet.z + Math.sin(yaw) * Math.cos(elev) * FORCE_RADIUS);
  const prev = pos.clone();
  const tx = feet.x;
  const ty = feet.y + cm(100);
  const tz = feet.z;
  let heading = yaw + Math.PI;
  let pitch = -elev;
  let vel = 0;
  let n = 0;
  let at = -1;
  const t0 = fxNow();
  const tick = () => {
    prev.copyFrom(pos);
    const d = cm(vel);
    pos.x += Math.cos(heading) * Math.cos(pitch) * d;
    pos.y += Math.sin(pitch) * d;
    pos.z += Math.sin(heading) * Math.cos(pitch) * d;
    vel += 4;
    if (n < FORCE_TICKS - 10) {
      const turn = Math.atan2(tz - pos.z, tx - pos.x) - heading;
      heading += Math.max(-FORCE_TURN, Math.min(FORCE_TURN, Math.atan2(Math.sin(turn), Math.cos(turn))));
      pitch += Math.max(-FORCE_TURN, Math.min(FORCE_TURN, Math.atan2(ty - pos.y, Math.hypot(tx - pos.x, tz - pos.z)) - pitch));
    }
    n++;
  };
  const head: PointSource = out => {
    const now = fxNow();
    if (now !== at) {
      at = now;
      const due = Math.ceil((now - t0) / TICK);
      while (n < due) tick();
    }
    const k = Math.min(1, Math.max(0, (now - t0) / TICK - (n - 1)));
    return Vector3.LerpToRef(prev, pos, k, out);
  };
  const blue = Math.floor(Math.random() * 128) / 255;
  const colour: RGB = graded ? [0.3, 0.45, 0.6 + blue] : [0.5, 0.5, 0.5 + blue];
  const seconds = ticks(FORCE_TICKS);
  if (ribbon) effects.spawn('joint', scene, pos, { head, maxTails: 2, width: cm(10), colour, texture: TEX.jointEnergy, seconds, fadeTail: 6 / FORCE_TICKS, onTop: true });
  effects.spawn('sprite', scene, pos, { texture: TEX.flare, colour, size: cm(64), intensity: p => forceLight(p * seconds), seconds, follow: head, fadeTail: 0 });
}

/** When each caster's charge last ticked: a second 58 while one runs must not double it. */
const novaChargeTicked = new WeakMap<Entity, number>();
const bonePoint = new Vector3();
const feetPoint = new Vector3();

/**
 * Nova's charge, any caster (ZzzCharacter.cpp:5727-5748): every tick in HELL_BEGIN or HELL_START, count + 1
 * motes on each even bone 0..38 and three force comets onto the feet. `count` is the server's stage.
 */
function novaChargeTick(scene: Scene, e: Entity, graded: boolean): void {
  const step = () => {
    if (!inNovaCharge(e)) return;
    novaChargeTicked.set(e, fxNow());
    const count = Math.min(NOVA_MAX_STAGE, e.netId === undefined ? 0 : novaStageOf(e.netId));
    const recipe = novaChargeRecipe(count, graded);
    const bones = Math.min(NOVA_CHARGE_BONES, (e.modelObject?.gltf?.skeleton?.bones.length ?? 1) - 1);
    for (let i = 0; i < bones; i += 2) emitBurst(scene, recipe, bonePos(e, i, bonePoint), count + 1);
    entityPos(e, 0, feetPoint);
    // One ribbon a tick, not three: 51 live greased lines cost 1.7 ms a frame for two 10 cm quads behind each card.
    for (let j = 0; j < 3; j++) forceComet(scene, feetPoint, j === 0, graded);
    delay(TICK, step);
  };
  step();
}

/** The charge starts on the 58 echo for every caster, the hero included, with SOUND_NUKE1 (WSclient.cpp:4833-4837). */
const novaChargeWith = (graded: boolean, extra?: (c: SkillContext) => void): Step => (_at, c) => {
  const e = c.caster;
  // Everyone else's plays with the packet (app/logic.ts playCastAnimation); the hero's cast path plays none.
  if (e.localPlayer && e.transform) playCombat('Sound/eHellFire2_1', e.transform.pos);
  const last = novaChargeTicked.get(e);
  if (last !== undefined && fxNow() - last < 2 * TICK) return;
  novaChargeTick(c.scene, e, graded);
  extra?.(c);
};
const novaCharge = novaChargeWith(false);

/** Nova charge, Enhanced: electric chips crackling over the body, more of them as the stage climbs. */
const NOVA_CRACKLE: ParticleRecipe = {
  ...ENERGY_CHIPS,
  colour: [0.35, 0.6, 1],
  size: 0.32,
  sizeJitter: 0.4,
  life: 0.22,
  lifeJitter: 0.3,
  box: [0.3, 0.75, 0.3],
  power: 0.8,
  capacity: 256,
};
/** Seconds between the charge's ground pools; each lives two of these, so their fades sum to a steady glow. */
const NOVA_POOL_EVERY = 0.25;
const chargeLightAt = new Vector3();

/**
 * Enhanced Nova charge: the Classic charge in the graded blue, plus a blue pool under the caster that widens
 * with the stage, chips crackling over the body and the charge's light, held until the charge ends.
 */
const novaChargeEnhanced: Step = novaChargeWith(true, c => {
  const e = c.caster;
  const done = () => !inNovaCharge(e);
  const stage = () => Math.min(NOVA_MAX_STAGE, e.netId === undefined ? 0 : novaStageOf(e.netId));
  const feet = followEntity(e, 0);
  const chest = followEntity(e, 1);
  effects.spawn('particles', c.scene, chest(new Vector3()), { recipe: NOVA_CRACKLE, rate: 12, seconds: 10, follow: chest, until: done, rateScale: () => 1 + stage() / 2 });
  const light = lighting.skillHold(c.scene, 58, out => {
    chest(chargeLightAt);
    out.x = chargeLightAt.x;
    out.y = chargeLightAt.y;
    out.z = chargeLightAt.z;
  });
  const pool = () => {
    if (done()) {
      light?.stop();
      return;
    }
    const s = stage();
    effects.spawn('ring', c.scene, feet(new Vector3()), { texture: TEX.flareBlue, colour: NOVA_GRADED, scale: 2.2 + s * 0.2, seconds: 2 * NOVA_POOL_EVERY, fadeIn: 0.5, fadeTail: 0.5, follow: feet });
    delay(NOVA_POOL_EVERY, pool);
  };
  pool();
});

/** The charge: the body lit in the motes' blue while it is held, swelling over its first second. */
const NOVA_CHARGE_LIGHT: Omit<SkillLight, 'enhanced'> = {
  hold: effectLight(NOVA_GRADED_LIGHT, 1.5, Infinity, { attack: 1, release: 0.4 }),
};

export default defineSkill({
  id: 58,
  name: "Nova (Start)",
  noFlinch: [A.PLAYER_SKILL_HELL_BEGIN], // a hit does not break the charge (ZzzCharacter.cpp:1283-1297)
  // 58 Nova (start): the charge on any caster while he is in HELL_BEGIN / HELL_START - (count+1)x BITMAP_LIGHT sub6
  // on the even bones 0..38 and CreateForce's 3 JOINT_HEALING sub8 comets every tick (novaCharge).
  visual: { cast: novaCharge, enhanced: { cast: novaChargeEnhanced } },
  sound: 'Sound/eHellFire2_1', // Nova (charge)
  clip: { ground: A.PLAYER_SKILL_HELL_BEGIN }, // Nova (charge)
  light: { enhanced: NOVA_CHARGE_LIGHT },
});
