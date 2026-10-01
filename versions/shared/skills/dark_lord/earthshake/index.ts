import { defineSkill } from '@/controllers/skills/define';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { delay, entityPos, entityYaw, fxNow, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';
import { QUAKE_SCROLL, groundAt, lit } from '../../_shared';
import { SkillContext, Step, TICK, after, atCaster, cm, explosion, forwardOf, model, particles, ring, ringOf, sprite, ticks } from '@/controllers/skills/visuals';
import { TWFlags } from '@/controllers/terrain/consts';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { earthQuake } from '@/controllers/camera';
import { effects } from '@/controllers/fx';
import { everyTick, muRotated, muYaw, sfx, ticksLeft } from '../_shared';
import { lighting } from '@/controllers/lighting';
import { storeRef } from '@/app/storeRef';

import { A } from '@/controllers/combat/recipes';

/** Not a NOMOVE, NOGROUND or WATER tile: where the original lets a ground effect stand. */
function openGround(x: number, z: number): boolean {
  const flag = storeRef().world?.getTerrainFlag(Math.floor(x), Math.floor(z)) ?? 0;
  return (flag & (TWFlags.NoMove | TWFlags.NoGround | TWFlags.Water)) === 0;
}

/** A point that sinks 0.5 cm a tick once fewer than `below` of its `life` ticks are left (the EarthQuake models' `Position[2] -= 0.5`). */
function sinking(p: Vector3, life: number, below: number): PointSource {
  const t0 = fxNow();
  return out => {
    const left = life - (fxNow() - t0) / TICK;
    return out.set(p.x, p.y - (left < below ? cm(0.5) * (below - left) : 0), p.z);
  };
}

/**
 * Earthshake runs off the Dark Horse's action 3 (GOBoid.cpp:337-341, RenderDarkHorseSkill :727-769),
 * in ticks from its start: a BITMAP_SHOCK_WAVE every 400 ms, the ground stones on horse keys 8-9.5,
 * and MODEL_SKILL_FURY_STRIKE (Kind 2) on render 19, which bursts at its LifeTime 11 and cracks the
 * ground at 10 (MoveHandlers.cpp:2955-3065).
 */
const QUAKE_WAVES = [0, 10, 20, 30] as const;
/** The stone ticks and each ring's radius, `150 cm x (WeaponLevel / 2)` with WeaponLevel wrapped to 253 on render 19. */
const QUAKE_STONES: readonly (readonly [number, number])[] = [[24, 1.5], [25, 1.5], [26, 3], [27, 3]];
const QUAKE_BURST = 19 + 9;
/** The burst point: `(-25, -80)` off the fury's position, which its swing already put `sin 135 deg x 260 x cos 80 deg` = 32 cm ahead. */
const QUAKE_AHEAD = 0.8 + 0.32;
const QUAKE_SIDE = -0.25;
/** MODEL_GROUND_STONE's smoke, BITMAP_SMOKE sub11 at Scale 2: 128 cm growing 5 % a tick, fading over 50 ticks, sinking 1 cm a tick. */
const QUAKE_SMOKE: ParticleRecipe = {
  texture: TEX.smoke,
  colour: [1, 0.8, 0.6],
  size: cm(128),
  sizeJitter: 0,
  life: ticks(50),
  lifeJitter: 0,
  box: [0.32, 0.32, 0.32],
  dir1: [-1, -0.4, -1],
  dir2: [1, -0.4, 1],
  power: 0.4,
  powerJitter: 0.5,
  endScale: 2.25,
  capacity: 128,
};
/** Graded tiers: the stones' sub11 smoke at a dust brown; at the original's (1, 0.8, 0.6) the graded buffer washed the stones out under it. */
const QUAKE_DUST: ParticleRecipe = { ...QUAKE_SMOKE, colour: [0.24, 0.21, 0.18], spin: 0.6, capacity: 192 };
/** Graded tiers: the stones' DhorSS_R pulled toward orange; the tone curve took the original's white glow to a pale beige. */
const QUAKE_STONE_HOT: RGB = [1, 0.5, 0.28];
/** Graded tiers: the burst's dust skirt, thrown flat and out along the ground. */
const QUAKE_DUST_SKIRT: ParticleRecipe = {
  ...QUAKE_DUST,
  size: 0.8,
  sizeJitter: 0.3,
  life: 1.1,
  lifeJitter: 0.3,
  box: [0.2, 0, 0.2],
  dir1: [-1, 0.15, -1],
  dir2: [1, 0.35, 1],
  power: 1.4,
  powerJitter: 0.4,
  endScale: 2.6,
};
/** Graded tiers: stone chips drawn opaque in rock colour; additive, as the original draws them, they read as white paper on the graded ground. */
const QUAKE_ROCK: RGB = [0.62, 0.56, 0.5];
/** Graded tiers: embers lifting off the glowing cracks and fins. */
const QUAKE_EMBERS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [1, 0.6, 0.25],
  colourEnd: [0.7, 0.15, 0.03],
  size: 0.12,
  sizeJitter: 0.4,
  life: 0.9,
  lifeJitter: 0.4,
  box: [0.3, 0.02, 0.3],
  dir1: [-0.3, 1, -0.3],
  dir2: [0.3, 1, 0.3],
  power: 1.1,
  powerJitter: 0.5,
  gravity: -0.5,
  capacity: 256,
};
/** Graded tiers: the hot chips the burst throws. */
const QUAKE_BURST_SPARKS: ParticleRecipe = {
  ...QUAKE_EMBERS,
  size: 0.16,
  life: 0.7,
  box: [0.2, 0.1, 0.2],
  dir1: [-1, 0.6, -1],
  dir2: [1, 1.4, 1],
  power: 4,
  gravity: -7,
  capacity: 128,
};
/** `BlendMeshLight = LifeTime / 30` (EarthQuake01/04/07); the GL clamps the colour at 1. */
const quakeFade = (life: number) => (p: number): number => Math.min(1, ticksLeft(p, life) / 30);
/** 02 / 05 / 08: `(life - LifeTime) * 0.1` over the first 10 ticks, then `LifeTime * 0.1`, clamped at 1 by the GL. */
const quakeGlow = (life: number) => (p: number): number => {
  const left = ticksLeft(p, life);
  return Math.min(1, left >= life - 10 ? (life - left) * 0.1 : left * 0.1);
};

/** MODEL_STONE1/2 chips (sub0, debris.ts) thrown `1 in n` a tick for `span` ticks from `from`, within 150 cm of `at` (EarthQuake02/05). */
const quakeChips = (at: Vector3, from: number, span: number, n: number, hd = false): Step => (_p, c) =>
  delay(ticks(from), () =>
    everyTick(span, () => {
      if (Math.random() * n >= 1) return;
      const p = muRotated(at, Math.random() * 360, cm(Math.random() * 150));
      const m = Math.random() < 0.5 ? MODEL.stone : MODEL.stone2;
      effects.spawn('debris', c.scene, p, hd ? { model: m, colour: QUAKE_ROCK, blendMesh: -1 } : { model: m });
    })
  );

/** MODEL_GROUND_STONE / 2 (ZzzEffect.cpp:3480-3516, MoveHandlers.cpp:5688-5712); `hd` is the graded tiers' dust and rock chips. */
function groundStone(at: Vector3, c: SkillContext, hd = false): void {
  if (!openGround(at.x, at.z)) return;
  const second = Math.random() < 0.5;
  model({
    model: second ? MODEL.groundStone2 : MODEL.groundStone,
    scale: (second ? 1 : 1.2) + Math.floor(Math.random() * 30) / 100,
    yaw: Math.random() * Math.PI * 2,
    seconds: ticks(40),
    holdLast: true,
    blendMesh: 1,
    // Alpha x 1/1.3 a tick over the last 8.
    life: p => Math.min(1, Math.pow(1.3, ticksLeft(p, 40) - 8)),
    ...(hd ? { colour: QUAKE_STONE_HOT } : {}),
  })(at, c);
  if (hd) particles({ recipe: QUAKE_DUST_SKIRT, count: 2 })(at, c);
  // LifeTime 36..33: a smoke puff and a MODEL_STONE sub10 chip a tick at +(60, -60, 50) cm.
  const chip = new Vector3(at.x + 0.6, at.y + 0.5, at.z - 0.6);
  delay(ticks(4), () =>
    everyTick(4, () => {
      particles({ recipe: hd ? QUAKE_DUST : QUAKE_SMOKE, count: 1, height: 0.63 })(chip, c);
      const m = Math.random() < 0.5 ? MODEL.stone : MODEL.stone2;
      effects.spawn('debris', c.scene, chip, { model: m, speedScale: 2, riseCm: [28, 16], scale: 0.87, ...(hd ? { colour: QUAKE_ROCK, blendMesh: -1 } : {}) });
    })
  );
}

/** Six stones 60 degrees apart from a random start, `radius` tiles out. */
const stoneRing = (radius: number, hd = false): Step => (at, c) => {
  let a = Math.random() * 360;
  for (let i = 0; i < 6; i++) {
    a += 60;
    groundStone(muRotated(at, a, radius), c, hd);
  }
};

/** BITMAP_SHOCK_WAVE sub0: a 20-tile terrain decal shrinking a tile a tick (ZzzEffect.cpp:3538-3545, MoveHandlers.cpp:5764-5769). */
const quakeWave: Step = ring({ texture: TEX.shockwave, colour: RGBS.white, seconds: ticks(20), scale: 20, grow: 0, maxScale: 20, fadeTail: 0.001 });

/** The crack chains at the fury's LifeTime 10: 5 chains, 4 rounds of 85-99 cm (MoveHandlers.cpp:3018-3064). */
const quakeCracks = (b: Vector3, hd = false): Step => (_at, c) => {
  const pos = [0, 1, 2, 3, 4].map(() => b.clone());
  const ang = [0, 0, 0, 0, 0];
  let count = 0;
  for (let j = 0; j < 4; j++) {
    const step = cm(85 + Math.floor(Math.random() * 15));
    if (j >= 3) count = Math.floor(Math.random() * 32768);
    for (let i = 0; i < 5; i++) {
      const turn = 50 + Math.floor(Math.random() * 30);
      ang[i] += count % 2 === 0 ? turn : -turn;
      const heading = ang[i] + i * (62 + Math.floor(Math.random() * 10));
      const p = muRotated(pos[i], heading, step);
      p.y = groundAt(p.x, p.z, b.y) + cm(3);
      pos[i] = p;
      const yaw = muYaw(heading + 270);
      model({ model: MODEL.earthQuake7, seconds: ticks(40), yaw, life: quakeFade(40), follow: sinking(p, 40, 10) })(p, c);
      model({ model: MODEL.earthQuake8, seconds: ticks(40), yaw, life: quakeGlow(40), scrollU: QUAKE_SCROLL, follow: sinking(p, 40, 15) })(p, c);
      // Graded tiers: embers off each glowing step while its glow is up.
      if (hd) after(ticks(4), particles({ recipe: QUAKE_EMBERS, rate: 4, seconds: ticks(26) }))(p, c);
    }
    count++;
  }
  sfx('Sound/eRageBlow_3')(b, c);
};

/** The fury's burst at its LifeTime 11 (MoveHandlers.cpp:2955-3016), `QUAKE_AHEAD` in front of the horse. */
const quakeBurstOf = (hd: boolean): Step => (_at, c) => {
  const f = forwardOf(entityYaw(c.caster));
  const feet = entityPos(c.caster, 0, new Vector3());
  const x = feet.x + f.x * QUAKE_AHEAD - f.z * QUAKE_SIDE;
  const z = feet.z + f.z * QUAKE_AHEAD + f.x * QUAKE_SIDE;
  const ground = groundAt(x, z, feet.y);
  explosion(RGBS.white, 0.5)(new Vector3(x, ground + cm(25), z), c);
  if (hd) {
    // Graded tiers: a hot core under the white card, thrown chips and a dust skirt.
    const core = new Vector3(x, ground + 0.3, z);
    sprite({ texture: TEX.flare, colour: [1, 0.6, 0.3], size: 3.2, seconds: ticks(14), grow: 1.3, growFrom: 0.5, fadeTail: 0.7 })(core, c);
    particles({ recipe: QUAKE_BURST_SPARKS, count: 26 })(core, c);
    ringOf(particles({ recipe: QUAKE_DUST_SKIRT, count: 1 }), 10, 1.2)(new Vector3(x, ground, z), c);
  }
  // Terrain + 25 - 27: the three centre pieces sit 2 cm into the ground.
  const b = new Vector3(x, ground - cm(2), z);
  model({ model: MODEL.earthQuake3, scale: 1.5, seconds: ticks(35), blendMesh: -1, alphaTest: true, life: () => 1, follow: sinking(b, 35, 13) })(b, c);
  model({ model: MODEL.earthQuake, scale: 1.5, seconds: ticks(35), life: quakeFade(35), follow: sinking(b, 35, 10) })(b, c);
  model({ model: MODEL.earthQuake2, scale: 1.5, seconds: ticks(20), life: quakeGlow(20), scrollU: QUAKE_SCROLL, follow: sinking(b, 20, 5) })(b, c);
  quakeChips(b, 11, 5, 10, hd)(b, c);
  // EarthQuake01 while LifeTime > 15 and a multiple of 3 (ZzzEffect.cpp:7109-7112).
  for (let lt = 33; lt > 15; lt -= 3) delay(ticks(35 - lt), () => earthQuake((Math.floor(Math.random() * 8) - 4) * 0.1));
  const sub = Math.floor(Math.random() * 100);
  for (let i = 0; i < 5; i++) {
    const p = muRotated(b, sub + i * 72, cm(100 + Math.floor(Math.random() * 150)));
    if (!openGround(p.x, p.z)) continue;
    p.y = groundAt(p.x, p.z, b.y) + cm(3);
    const scale = (40 + Math.floor(Math.random() * 50)) / 100;
    const yaw = muYaw(45 + Math.floor(Math.random() * 30) - 15);
    model({ model: MODEL.earthQuake4, scale, yaw, seconds: ticks(35), life: quakeFade(35), follow: sinking(p, 35, 10) })(p, c);
    model({ model: MODEL.earthQuake5, scale, yaw, seconds: ticks(40), life: quakeGlow(40), scrollU: QUAKE_SCROLL, follow: sinking(p, 40, 15) })(p, c);
    quakeChips(p, 11, 25, 15, hd)(p, c);
    if (hd) after(ticks(3), particles({ recipe: QUAKE_EMBERS, rate: 5, seconds: ticks(30) }))(p, c);
  }
  after(TICK, quakeCracks(b, hd))(b, c);
};

/** Earthshake's whole run, at the horse (the rider's feet). `hd`: the graded tiers' look, whose stone light waits on the first ring. */
const earthshakeOf = (hd: boolean): Step => (at, c) => {
  let lit = false;
  for (const k of QUAKE_WAVES) after(ticks(k), quakeWave)(at, c);
  for (const [k, radius] of QUAKE_STONES) {
    after(ticks(k), (p, cc) => {
      if (Math.random() < 0.5) {
        stoneRing(radius, hd)(p, cc);
        if (hd && !lit) lighting.skillCue(cc.scene, 62, 'stones', cc.caster);
        lit = true;
      }
      // Horse keys 8-9.5 jolt the camera every frame (GOBoid.cpp:762).
      earthQuake((Math.floor(Math.random() * 3) - 3) * 0.7);
    })(at, c);
  }
  after(ticks(QUAKE_BURST), quakeBurstOf(hd))(at, c);
};
const earthshake = earthshakeOf(false);

export default defineSkill({
  id: 62,
  name: "Earthshake",
  // 62 Earthshake (512 / 516): on the Dark Horse's action 3 - shock rings every 10 ticks, rings of
  // MODEL_GROUND_STONE on horse keys 8-9.5, the fury's burst 1.1 tiles ahead at tick 28 and five crack
  // chains at 29 (GOBoid.cpp:727-769, MoveHandlers.cpp:2940-3170).
  visual: { area: atCaster(earthshake, 0), enhanced: { area: atCaster(earthshakeOf(true), 0) } },
  sound: 'Sound/sDarkEarthQuake', // Earthshake
  delayMs: 10000, // Earthshake
  clip: { ground: A.PLAYER_ATTACK_DARKHORSE }, // Earthshake
});
