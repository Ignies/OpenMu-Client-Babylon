import { defineSkill } from '@/controllers/skills/define';
import { CRACKLE_FLICKER, PX_FLARE, PX_MAGIC, PX_SMOKE, SPRITE_TURN, TickPoint, carrierLight, carrierSprites, groundGlow, jitterCm, kickSparks, magicParticle, muTurn, spawnCard, sum1Light, swell, throwSmoke, tickLoop } from '../_shared';
import { MODEL, TEX } from '@/controllers/fx/recipes';
import { bonePos, entityGone, entityPos, entityYaw, type RGB } from '@/controllers/fx/core';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { Step, cm, ticks } from '@/controllers/skills/visuals';
import { deg, groundY, heldAt, randInt } from '../../_shared';
import { effects } from '@/controllers/fx';

const PX_MEGA = 128;

// Lightning Shock (MoveHandlers.cpp:2385-2543).

/** LIGHTNING_MEGA sub0 (ZzzEffectParticle.cpp:1826-1841, :6071-6088): LT 5, `Light = colour x Alpha`, Alpha 1 - 0.15 a tick from before its first frame. */
const megaLevel = (age: number): number => Math.max(0, 0.85 - 0.15 * age);
const MEGA_SHEETS = [TEX.lightningMega1, TEX.lightningMega2, TEX.lightningMega3];
function mega(scene: Scene, at: Vector3, colour: RGB, scale: number): void {
  spawnCard(scene, at, { texture: MEGA_SHEETS[randInt(3)], colour, size: cm(PX_MEGA * scale), ticks: 5, brightness: megaLevel, roll: Math.random() * Math.PI * 2 });
}

/**
 * The shock's ground, sub1 (ZzzEffect.cpp:916-971, MoveHandlers.cpp:2461-2508): two damage01mono
 * decals growing 0.1 -> 5.1 tiles in 10 ticks at the caster's yaw, three plancracks 20 cm up, and
 * for 12 ticks the crackle round the impact and out to 4 m, red smoke thrown and rising.
 */
function shockGround(scene: Scene, p: Vector3, yaw: number, enh = false): void {
  const at = p.clone();
  const ground = groundY(at.x, at.z);
  if (enh) shockGrace(scene, at, ground, yaw);
  for (const colour of [[1, 0.8, 0.5], [1, 0, 0]] as const) {
    effects.spawn('ring', scene, at, { texture: TEX.damageMono, colour, seconds: ticks(10), scale: 5.1, growFrom: 0.1 / 5.1, grow: 1, spinFrom: -yaw, fadeTail: 0.3 });
  }
  // MODEL_KNIGHT_PLANCRACK_A sub1 (ZzzEffect.cpp:4826-4833): Scale 1.0-1.3 + 0-0.45, LT 20, Alpha x0.9 a tick.
  const crack = new Vector3(at.x, ground + cm(20), at.z);
  for (let i = 0; i < 3; i++) {
    effects.spawn('model', scene, crack, { model: MODEL.knightPlanCrack, seconds: ticks(20), scale: randInt(4) * 0.1 + 1 + randInt(10) * 0.05, colour: [1, 0.4, 0.2], yaw: Math.random() * Math.PI * 2, flat: true, fadeTail: 1 });
  }
  const floor = new Vector3(at.x, ground + cm(10), at.z);
  const q = new Vector3();
  tickLoop(12, () => {
    for (let i = 0; i < 11; i++) mega(scene, q.set(at.x + jitterCm(35), at.y + jitterCm(35), at.z + jitterCm(35)), [1, 0.7, 0.4], (randInt(80) + 32) * 0.01);
    for (let i = 0; i < 6; i++) {
      muTurn(0, randInt(400), 0, yaw + randInt(360), q).addInPlace(at);
      q.y = groundY(q.x, q.z) + cm(20);
      mega(scene, q, [1, 0, 0], (randInt(60) + 22) * 0.01);
    }
    for (let i = 0; i < 2; i++) throwSmoke(scene, floor, [1, 0, 0]);
    if (randInt(2) === 0) {
      // SMOKE sub54 (:1528-1535, :5722-5734): LT = Scale x 8, rising (Scale + Gravity) x 1.5 a tick, light /1.02.
      const s = 2.8 + randInt(50) * 0.01;
      const g = (randInt(30) + 50) * 0.05;
      spawnCard(scene, floor, { texture: TEX.smoke, colour: [1, 0, 0], size: cm(PX_SMOKE * s), growMul: 1.01, ticks: Math.floor(2.8 * 8), decay: 1 / 1.02, minLight: 0.05, velocity: [0, cm((s + g) * 1.5), 0], gravity: cm(1.5 * (0.05 - 0.01 * s)), roll: Math.random() * Math.PI * 2 });
    }
  });
}

/**
 * Lightning Shock at once (AttackStage sets AttackTime 15 on the first tick, ZzzCharacter.cpp:3008):
 * MODEL_LIGHTNING_SHOCK sub0 280 cm over the caster, hovering until the clip passes frame 6 (or
 * LifeTime 15), then 20 cm on and 75 cm + an accelerating fall down a tick, crackling red, until
 * it is under the ground and opens it.
 */
const lightningShockStep = (enh: boolean): Step => (_at, c) => {
  const { caster, scene } = c;
  if (entityGone(caster)) return;
  const yaw = deg(entityYaw(caster));
  const shock = new TickPoint(entityPos(caster, cm(280), new Vector3()));
  let fall = 0;
  let gravity = 1;
  let alive = true;
  const until = (): boolean => !alive;
  const dir = new Vector3();
  const q = new Vector3();
  carrierSprites(scene, shock.at, until, 20, 0.8, [1, 0.4, 0.4], [1, 0.2, 0.2], [1, 0.4, 0.4]);
  if (enh) carrierLight(scene, SHOCK_LIGHT, 1, ticks(20), { at: shock.at, done: until }, { attack: ticks(2) });
  tickLoop(20, i => {
    const p = shock.tick();
    if ((caster.modelObject?.actionFrame() ?? 0) > 6 || 20 - i < 15) {
      p.addInPlace(muTurn(0, -20, -75 - fall, yaw, dir));
      gravity += 0.1;
      fall += gravity;
    }
    magicParticle(scene, p, [1, 0.3, 0.3], 0.8);
    for (let k = 0; k < 11; k++) {
      q.set(p.x + jitterCm(35), p.y + jitterCm(35), p.z + jitterCm(35));
      spawnCard(scene, q, { texture: TEX.flare, colour: [1, 0.2, 0.1], size: cm(PX_FLARE * 2.2), ticks: 1 });
      if (randInt(3) === 0) mega(scene, q, [1, 0.7, 0.4], (randInt(80) + 32) * 0.01);
    }
    for (let k = 0; k < 2; k++) {
      bonePos(caster, randInt(41), q);
      q.x += jitterCm(15);
      q.y += jitterCm(15);
      q.z += jitterCm(15);
      mega(scene, q, [1, 0.5, 0.4], (randInt(60) + 22) * 0.01);
    }
    if (p.y < groundY(p.x, p.z)) {
      alive = false;
      shockGround(scene, p, yaw, enh);
      return false;
    }
    if (i === 19) alive = false;
  });
};
const lightningShock = lightningShockStep(false);

// Lightning Shock, enhanced.

const SHOCK_LIGHT: RGB = [1, 0.3, 0.15];

/**
 * The ground opening: its light and a hot red pool, the five BITMAP_MAGIC sub12 marks 150 cm out and 72
 * degrees apart and the MODEL_STONE sub13 thrown every tick (the original makes both at Scale 0, unseen;
 * ZzzEffect.cpp:936-948, MoveHandlers.cpp:2508), and embers kicked off the impact.
 */
function shockGrace(scene: Scene, at: Vector3, ground: number, yaw: number): void {
  const floor = new Vector3(at.x, ground + 0.04, at.z);
  groundGlow(scene, heldAt(floor), [0.35, 0.07, 0.02], 3.5, 24);
  sum1Light(scene, SHOCK_LIGHT, 2.5, ticks(20), heldAt(new Vector3(floor.x, floor.y + 0.5, floor.z)), undefined, { flicker: CRACKLE_FLICKER, release: ticks(10) });
  const q = new Vector3();
  for (let i = 0; i < 5; i++) {
    muTurn(0, 150, 0, yaw + i * 72, q).addInPlace(floor);
    q.y = groundY(q.x, q.z) + 0.05;
    spawnCard(scene, q, { texture: TEX.magicGround, colour: [0.7, 0.1, 0.02], size: cm(PX_MAGIC * 0.8), ticks: 12, flat: true, brightness: swell(12, 2, 6), roll: Math.random() * Math.PI * 2, spin: SPRITE_TURN });
  }
  kickSparks(scene, new Vector3(at.x, ground + cm(20), at.z), [1, 0.5, 0.2], 12, 1.4);
  tickLoop(12, () => {
    effects.spawn('debris', scene, floor, { model: randInt(2) === 0 ? MODEL.stone : MODEL.stone2, count: 1, colour: [0.55, 0.45, 0.4] });
  });
}

export default defineSkill({
  id: 230,
  name: "Lightning Shock",
  // 230 Lightning Shock: MODEL_LIGHTNING_SHOCK falling red from 280 cm over the caster and opening the ground
  // (lightningShock). The five magic_ground cards and the stones get Scale 0 there and are not drawn.
  visual: { area: lightningShock, enhanced: { area: lightningShockStep(true) } },
  sound: 'Sound/lightning_shock', // Lightning Shock
});
