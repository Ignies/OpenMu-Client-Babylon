import { defineSkill } from '@/controllers/skills/define';
import { DEG, QUAKE_SCROLL, groundAt, lit, whenClipKey } from '../../_shared';
import { ITEM_LIGHT, itemScale, jointSpark, muAngles, rand, sayAt, sparkHeading, terrainLevel, wieldedWeapon } from '../_shared';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { delay, entityGone, entityPos, entityYaw, fxNow, lerp, type ParticleRecipe, type RGB } from '@/controllers/fx/core';
import { PlayerAction } from '@versions/shared/objects/enum';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { SkillContext, Step, TICK, after, baseSkill, cm, currentSkill, explosion, forwardOf, particles, ringOf, seq, sprite, ticks } from '@/controllers/skills/visuals';
import { TW_NOGROUND, TW_NOMOVE, TW_WATER } from '@/controllers/terrain/consts';
import { earthQuake } from '@/controllers/camera';
import { effects } from '@/controllers/fx';
import { itemObjectAttribute } from '@/controllers/actors/itemObjectAttribute';
import { lighting } from '@/controllers/lighting';
import { storeRef } from '@/app/storeRef';

import { A } from '@/controllers/combat/recipes';

import { effectLight } from '@/controllers/lighting/recipes';

/** `VectorRotate((x, y, 0), AngleMatrix(0, 0, yaw))` in cm, added to `out` in tiles. MU (x, y) is world (x, z). */
const addMuOffset = (out: Vector3, yaw: number, x: number, y: number): Vector3 => {
  out.x += cm(x * Math.cos(yaw) - y * Math.sin(yaw));
  out.z += cm(x * Math.sin(yaw) + y * Math.cos(yaw));
  return out;
};

/** A tick curve sampled from a table, linear between samples and held at the ends. */
function curve(values: readonly number[]): (tick: number) => number {
  return tick => {
    if (tick <= 0) return values[0];
    const i = Math.floor(tick);
    if (i >= values.length - 1) return values[values.length - 1];
    return lerp(values[i], values[i + 1], tick - i);
  }
}

/**
 * MODEL_SKILL_FURY_STRIKE's flight (MoveHandlers.cpp:3107-3170): on LT 20..12 the weapon sits at
 * `StartPosition + AngleMatrix(HeadAngle = (80, 0, facing + 180)) x (0, sin(angle) x 260, 0)`, 200 cm + Gravity up,
 * `angle = (20 - LT) x 15°` to LT 16 then 135°, Gravity 50 +8 a tick, negated at LT 15 and -8 a tick after.
 * Per tick after spawn: [forward, up] in cm.
 */
const FURY_PATH: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  let gravity = 50;
  for (let n = 0; n <= 8; n++) {
    const lifeTime = 20 - n;
    const angle = lifeTime > 15 ? n * 15 : 135;
    if (lifeTime === 15) gravity = -gravity;
    gravity += lifeTime > 15 ? 8 : -8;
    const d = Math.sin(angle * DEG) * 260;
    out.push([Math.cos(80 * DEG) * d, Math.sin(80 * DEG) * d + gravity + 200]);
  }
  return out;
})();
const FURY_FORWARD = curve(FURY_PATH.map(p => p[0]));
const FURY_UP = curve(FURY_PATH.map(p => p[1]));

/** MODEL_WAVE (ZzzEffect.cpp:1338-1345, MoveHandlers.cpp:2585-2602): Scale 0.5 +1.2 a tick to past 2, then +0.1; sinking 1.8, then 1.5 cm a tick. */
const WAVE_SCALE = curve([0.5, 1.7, 2.9, 3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4, 4.1, 4.2]);
const WAVE_SINK = curve([0, 1.8, 3.6, 5.1, 6.6, 8.1, 9.6, 11.1, 12.6, 14.1, 15.6, 17.1, 18.6, 20.1, 21.6, 23.1]);
const WAVE_DRIFT = curve([0, 1.2, 2.4, 3.4, 4.4, 5.4, 6.4, 7.4, 8.4, 9.4, 10.4, 11.4, 12.4, 13.4, 14.4, 15.4]);
/** Its BlendMeshLight: 1.5 until the scale passes 2, then LifeTime / 30. */
const waveLight = (tick: number): number => (tick < 2 ? 1.5 : (15 - tick) / 30);

/** EarthQuake02 / 05 / 08's BlendMeshLight: `(LT0 - LifeTime) x 0.1` for the first ten ticks, then `LifeTime x 0.1` (ZzzEffect.cpp:7131-7258). */
const rampThenFade = (life: number) => (tick: number): number => (tick < 10 ? tick * 0.1 : (life - tick) * 0.1);
/** EarthQuake01 / 04 / 07's `LifeTime x 0.1 / 3`. */
const fadeThirty = (life: number) => (tick: number): number => (life - tick) / 30;

/** A MODEL_STONE1/2 sub0 chip thrown from within 150 cm of `at` (ZzzEffect.cpp:7137-7146). */
function furyStone(scene: Scene, at: Vector3): void {
  const a = Math.random() * Math.PI * 2;
  const r = cm(rand(0, 150));
  const p = new Vector3(at.x + Math.cos(a) * r, at.y, at.z + Math.sin(a) * r);
  effects.spawn('debris', scene, p, { model: Math.random() < 0.5 ? MODEL.stone : MODEL.stone2, count: 1 });
}

/** Where one EarthQuake model of a set sits: its point, `Scale` and MU yaw. */
interface QuakePlace {
  at: Vector3;
  scale: number;
  yaw: number;
}

/**
 * A set of one of Rageful Blow's EarthQuake models spawned on one tick: additive with its own BlendMeshLight
 * curve, or textured (`+3`). Each sinks 0.5 cm a tick once its LifeTime is under `sinkBelow`
 * (ZzzEffect.cpp:7105-7262). One spawn, the rest of the set drawn as its instanced copies.
 */
function quake(c: SkillContext, m: string, places: readonly QuakePlace[], life: number, body: number, blendMeshLight: ((tick: number) => number) | null, sinkBelow: number, scroll = false, tint: RGB = RGBS.white): void {
  if (!places.length) return;
  const at = places[0].at;
  const t0 = fxNow();
  effects.spawn('model', c.scene, at, {
    model: m,
    seconds: ticks(life),
    scale: places[0].scale,
    yaw: -places[0].yaw,
    copies: places.length > 1 ? places.slice(1).map(p => ({ at: p.at, scale: p.scale, yaw: -p.yaw })) : undefined,
    fadeTail: 0,
    scrollU: scroll ? QUAKE_SCROLL : undefined,
    follow: out => out.set(at.x, at.y - cm(0.5 * Math.max(0, (fxNow() - t0) / TICK - (life - sinkBelow))), at.z),
    ...(blendMeshLight ? { colour: tint, intensity: lit(body, blendMeshLight) } : { native: { light: ITEM_LIGHT } }),
  });
}

/** EarthQuake01's camera kick, `(rand() % 8 - 4) x 0.1`°, on the ticks its LifeTime is over 15 and a multiple of 3 (ZzzEffect.cpp:7109-7112). */
function craterShake(): void {
  for (let lt = 33; lt > 15; lt -= 3) {
    const kick = (): void => earthQuake((Math.floor(Math.random() * 8) - 4) * 0.1);
    // Re-rolled through the tick, as every frame of it writes the global.
    delay(ticks(35 - lt), kick);
    delay(ticks(35 - lt + 0.5), kick);
  }
}

/** A glow wall's stone chips: one in `every` ticks between `from` and `to` ticks of its life. */
function wallStones(c: SkillContext, at: Vector3, from: number, to: number, every: number): void {
  for (let k = from; k <= to; k++) {
    if (Math.random() < 1 / every) delay(ticks(k), () => furyStone(c.scene, at));
  }
}

/** Graded tiers: embers lifting off the crater, the satellites and the crack tips while they glow. */
const FURY_EMBERS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [1, 0.62, 0.28],
  colourEnd: [0.75, 0.16, 0.03],
  size: 0.09,
  sizeJitter: 0.4,
  life: 0.9,
  lifeJitter: 0.4,
  box: [0.35, 0.02, 0.35],
  dir1: [-0.3, 1, -0.3],
  dir2: [0.3, 1, 0.3],
  power: 1.1,
  powerJitter: 0.5,
  gravity: -0.4,
  capacity: 256,
};
/** Graded tiers: the hot chips the impact throws. */
const FURY_BURST_SPARKS: ParticleRecipe = {
  ...FURY_EMBERS,
  size: 0.12,
  life: 0.7,
  box: [0.2, 0.1, 0.2],
  dir1: [-1, 0.6, -1],
  dir2: [1, 1.5, 1],
  power: 4.5,
  gravity: -8,
  capacity: 128,
};
/** Graded tiers: the dust skirt the impact throws flat along the ground. */
const FURY_DUST: ParticleRecipe = {
  texture: TEX.smokeAlpha,
  softEdge: true,
  colour: [0.36, 0.3, 0.25],
  colourEnd: [0.26, 0.22, 0.19],
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
  spin: 0.6,
  blend: 'alpha',
  capacity: 128,
};
/** Graded tiers: the glow walls and cracks pulled toward orange; the tone curve took the untinted fire sheets to a pale peach. */
const FURY_GLOW_HD: RGB = [1, 0.62, 0.38];
/** Graded tiers: the thrown weapon's smear, steel grey. */
const FURY_SMEAR: RGB = [0.4, 0.44, 0.55];

/**
 * Rageful Blow from clip key 1 (ZzzCharacter.cpp:4159-4168, :3045-3048): SOUND_FURY_STRIKE1 and
 * MODEL_SKILL_FURY_STRIKE at the feet - the wielded weapon thrown up tumbling 80° a tick; at LT 13 the
 * MODEL_TAIL streaks and SOUND_FURY_STRIKE2; at LT 11 the impact (explosion, sparks, MODEL_WAVE, the crater
 * +3/+1/+2 and five +4/+5 satellites); at LT 10 twenty +7/+8 cracks in five branches and SOUND_FURY_STRIKE3
 * (MoveHandlers.cpp:2939-3175).
 */
const furyStrikeOf = (hd: boolean): Step => (_at, c) => {
  const caster = c.caster;
  const skill = baseSkill(currentSkill);
  const yaw0 = entityYaw(caster);
  const feet = entityPos(caster, 0, new Vector3());
  const fwd = forwardOf(yaw0);
  const weapon = wieldedWeapon(caster);
  const glowTint = hd ? FURY_GLOW_HD : RGBS.white;
  const pathAt = (tick: number, out: Vector3): Vector3 =>
    out.set(feet.x + fwd.x * cm(FURY_FORWARD(tick)), feet.y + cm(FURY_UP(tick)), feet.z + fwd.z * cm(FURY_FORWARD(tick)));
  sayAt(c, 'Sound/eRageBlow_1');

  if (weapon) {
    const t0 = fxNow();
    effects.spawn('model', c.scene, pathAt(0, new Vector3()), {
      model: weapon.file,
      seconds: ticks(9),
      scale: itemScale(weapon),
      fadeTail: 0,
      native: { light: ITEM_LIGHT, stamp: weapon.stamp, ...itemObjectAttribute(weapon.group, weapon.num) },
      follow: out => pathAt((fxNow() - t0) / TICK, out),
      rotate: out => muAngles(out, 80 * DEG * ((fxNow() - t0) / TICK + 1), 0, yaw0 + 330 * DEG),
    });
    if (hd) {
      effects.spawn('joint', c.scene, pathAt(0, new Vector3()), {
        head: out => pathAt((fxNow() - t0) / TICK, out),
        maxTails: 5,
        smooth: 3,
        taper: true,
        width: 0.45,
        colour: FURY_SMEAR,
        texture: TEX.flare2,
        seconds: ticks(10),
        fadeTail: 0.3,
      });
    }
  }

  // LT 13: eight MODEL_TAIL at the weapon's LT-14 point + (-25, -40), four 50 cm apart and four 30 cm apart
  // shifted 20-49 cm on x and +-250 cm up; LT 6, Light 0.5, BlendMeshLight LT / 20, falling 80 cm +60 a tick.
  delay(ticks(7), () => {
    if (entityGone(caster)) return;
    sayAt(c, 'Sound/eRageBlow_2');
    const base = addMuOffset(pathAt(6, new Vector3()), entityYaw(caster), -25, -40);
    const body = terrainLevel(base.x, base.z) + 0.5;
    const tail = (x: number, y: number, z: number): void => {
      const top = new Vector3(x, y, z);
      effects.spawn('model', c.scene, top, {
        model: MODEL.tail,
        seconds: ticks(6),
        colour: RGBS.white,
        yaw: -45 * DEG,
        fadeTail: 0,
        intensity: lit(body, tick => (6 - tick) / 20),
        follow: out => {
          const a = Math.max(0, (fxNow() - t1) / TICK);
          return out.set(top.x, top.y - cm((a + 1) * (80 + 30 * a)), top.z);
        },
      });
    };
    const t1 = fxNow();
    for (let i = 0; i < 4; i++) tail(base.x, base.y - cm(i * 50), base.z);
    const x = base.x + cm(rand(20, 50));
    const y = base.y + cm(rand(-250, 250));
    for (let i = 0; i < 4; i++) tail(x, y - cm(i * 30), base.z);
  });

  // LT 11: the impact 80 cm past the weapon's LT-12 point and 25 cm aside, 25 cm over the ground.
  const hit = new Vector3();
  delay(ticks(9), () => {
    if (entityGone(caster)) return;
    const yaw = entityYaw(caster);
    addMuOffset(pathAt(8, hit), yaw, -25, -80);
    hit.y = groundAt(hit.x, hit.z, feet.y) + cm(25);
    explosion(RGBS.white, 0.5)(hit, c);
    if (hd) {
      // Graded tiers: a hot core under the white card, thrown chips, a dust skirt and the burst's light.
      sprite({ texture: TEX.flare, colour: [1, 0.5, 0.22], size: 2, seconds: ticks(12), grow: 1.3, growFrom: 0.5, fadeTail: 0.7 })(hit, c);
      particles({ recipe: FURY_BURST_SPARKS, count: 24 })(hit, c);
      ringOf(particles({ recipe: FURY_DUST, count: 1 }), 10, 1.1)(new Vector3(hit.x, hit.y - cm(20), hit.z), c);
      const burst = hit.clone();
      lighting.skillBody(c.scene, skill, 'burst', out => {
        out.x = burst.x;
        out.y = burst.y;
        out.z = burst.z;
      });
    }
    for (let j = 0; j < 8; j++) {
      const at = new Vector3(hit.x + rand(-0.1, 0.1), hit.y, hit.z + rand(-0.1, 0.1));
      jointSpark(c.scene, at, sparkHeading(rand(-60, 0) * DEG, yaw0 + (330 + rand(90, 120)) * DEG), 1 / 8);
    }
    const waveBody = terrainLevel(hit.x, hit.z) + 1;
    const t2 = fxNow();
    const waveAt = new Vector3(hit.x, hit.y - cm(15), hit.z);
    effects.spawn('model', c.scene, waveAt, {
      model: MODEL.flashing,
      seconds: ticks(15),
      colour: RGBS.white,
      fadeTail: 0,
      scaleAt: t => WAVE_SCALE(t / TICK),
      intensity: lit(waveBody, waveLight),
      follow: out => {
        const a = (fxNow() - t2) / TICK;
        return out.set(waveAt.x - cm(WAVE_DRIFT(a)), waveAt.y - cm(WAVE_SINK(a)), waveAt.z);
      },
    });
    // Its AddTerrainLight(-0.5 x Luminosity, range 5) (MoveHandlers.cpp:2601-2602): light sources only add, so a dark ground card 10 m across.
    effects.spawn('sprite', c.scene, waveAt, {
      texture: TEX.flare,
      flat: true,
      blend: 'subtract',
      cover: 0.5,
      size: 10,
      seconds: ticks(15),
      fadeTail: 0,
      follow: out => out.set(waveAt.x - cm(WAVE_DRIFT((fxNow() - t2) / TICK)), hit.y - cm(22), waveAt.z),
    });

    const crater = new Vector3(hit.x, hit.y - cm(27), hit.z);
    const body = terrainLevel(crater.x, crater.z) + 0.3;
    const centre = [{ at: crater, scale: 1.5, yaw: 0 }];
    quake(c, MODEL.earthQuake3, centre, 35, body, null, 13);
    quake(c, MODEL.earthQuake, centre, 35, body, fadeThirty(35), 10, false, glowTint);
    quake(c, MODEL.earthQuake2, centre, 20, body, rampThenFade(20), 5, true, glowTint);
    craterShake();
    wallStones(c, crater, 11, 15, 10);
    if (hd) effects.spawn('particles', c.scene, crater, { recipe: FURY_EMBERS, rate: 10, seconds: ticks(24) });
    lighting.skillBody(c.scene, skill, 'crater', out => {
      out.x = crater.x;
      out.y = crater.y;
      out.z = crater.z;
    });

    // Five satellites at SubType + 72°·i, 100-249 cm out, on ground that is walkable, dry and there.
    const world = storeRef().world;
    const a0 = rand(0, 100) * DEG;
    const satellites: QuakePlace[] = [];
    for (let i = 0; i < 5; i++) {
      const a = a0 + i * 72 * DEG;
      const r = cm(rand(100, 250));
      const p = new Vector3(crater.x - Math.sin(a) * r, 0, crater.z + Math.cos(a) * r);
      const wall = world?.getTerrainFlag(Math.floor(p.x), Math.floor(p.z)) ?? 0;
      if (wall & (TW_NOMOVE | TW_NOGROUND | TW_WATER)) continue;
      p.y = groundAt(p.x, p.z, feet.y) + cm(3);
      const scale = rand(40, 90) / 100;
      const yaw = (45 + rand(-15, 15)) * DEG;
      satellites.push({ at: p, scale, yaw });
      wallStones(c, p, 10, 35, 15);
      if (hd) after(ticks(4), particles({ recipe: FURY_EMBERS, rate: 4, seconds: ticks(28) }))(p, c);
      lighting.skillBody(c.scene, skill, 'wall', out => {
        out.x = p.x;
        out.y = p.y;
        out.z = p.z;
      });
    }
    quake(c, MODEL.earthQuake4, satellites, 35, body, fadeThirty(35), 10, false, glowTint);
    quake(c, MODEL.earthQuake5, satellites, 40, body, rampThenFade(40), 15, true, glowTint);
  });

  // LT 10: five cracks of four 85-99 cm steps, each turning +-50-79° (alternating, the last step random).
  delay(ticks(10), () => {
    if (entityGone(caster)) return;
    sayAt(c, 'Sound/eRageBlow_3');
    const body = terrainLevel(hit.x, hit.z) + 0.3;
    const pos = Array.from({ length: 5 }, () => new Vector3(hit.x, hit.y, hit.z));
    const turn = [0, 0, 0, 0, 0];
    let count = 0;
    const cracks: QuakePlace[] = [];
    for (let j = 0; j < 4; j++) {
      const step = rand(85, 100);
      if (j >= 3) count = Math.floor(Math.random() * 2);
      for (let i = 0; i < 5; i++) {
        turn[i] += (count % 2 === 0 ? 1 : -1) * rand(50, 80);
        const a = (turn[i] + i * rand(62, 72)) * DEG;
        const p = pos[i];
        p.x += cm(-Math.sin(a) * step);
        p.z += cm(Math.cos(a) * step);
        p.y = groundAt(p.x, p.z, feet.y) + cm(3);
        const at = p.clone();
        cracks.push({ at, scale: 1, yaw: a + 270 * DEG });
        lighting.skillBody(c.scene, skill, 'wall', out => {
          out.x = at.x;
          out.y = at.y;
          out.z = at.z;
        });
      }
      count++;
    }
    quake(c, MODEL.earthQuake7, cracks, 40, body, fadeThirty(40), 10, false, glowTint);
    quake(c, MODEL.earthQuake8, cracks, 40, body, rampThenFade(40), 15, true, glowTint);
    if (hd) {
      // Graded tiers: embers off each crack's last step, and one light over the whole glowing field.
      for (const tip of pos) after(ticks(4), particles({ recipe: FURY_EMBERS, rate: 4, seconds: ticks(26) }))(tip, c);
      const centre = hit.clone();
      lighting.skillBody(c.scene, skill, 'field', out => {
        out.x = centre.x;
        out.y = centre.y;
        out.z = centre.z;
      });
    }
  });
};
const furyStrike = furyStrikeOf(false);

/** RenderCharacter skips `Weapon[0]` while the FURY clip is at key 4 or less (ZzzCharacter.cpp:10077-10080). */
const furyEmptyHand: Step = (_at, c) => {
  const m = c.caster.modelObject;
  if (!wieldedWeapon(c.caster)) return;
  effects.spawn('weaponHide', c.scene, Vector3.Zero(), {
    entity: c.caster,
    seconds: 2,
    until: () => !m || m.CurrentAction !== PlayerAction.PLAYER_ATTACK_SKILL_FURY_STRIKE || m.actionFrame() > 4,
  });
};

export default defineSkill({
  id: 42,
  name: "Rageful Blow",
  // Master numbers with no row of their own that draw as this skill (SKILL_REPLACEMENTS).
  lookAliases: [331, 333],
  // A hit does not cut the spin short, and it spins in place: no look-at-cursor (ZzzCharacter.cpp:1283-1297,
  // ZzzInterface.cpp:7394-7419).
  noFlinch: [A.PLAYER_ATTACK_SKILL_FURY_STRIKE],
  holdsFacing: [A.PLAYER_ATTACK_SKILL_FURY_STRIKE],
  // 42 Rageful Blow: the hand empties as the FURY clip starts; at key 1 the weapon is thrown up and the ground
  // breaks in front of the knight; see furyStrike.
  visual: {
    area: seq(furyEmptyHand, whenClipKey(PlayerAction.PLAYER_ATTACK_SKILL_FURY_STRIKE, 1, 14, furyStrike)),
    // Graded tiers: the weapon's smear, a hot core, chips and dust at the impact, embers off the glowing ground.
    enhanced: { area: seq(furyEmptyHand, whenClipKey(PlayerAction.PLAYER_ATTACK_SKILL_FURY_STRIKE, 1, 14, furyStrikeOf(true))) },
  },
  clip: { ground: A.PLAYER_ATTACK_SKILL_FURY_STRIKE }, // Rageful Blow
  // Rageful Blow: red Luminosity x (1,0,0), range 1, under the crater's EarthQuake02 (LT 20) and every
  // EarthQuake05 / 08 glow wall (LT 40) (ZzzEffect.cpp:7147-7156, :7199-7212, :7247-7258). MODEL_WAVE's
  // darkening light (-0.5, range 5, MoveHandlers.cpp:2601) has no equivalent: sources only add.
  light: {
    bodies: {
      crater: { color: [1, 0, 0], range: 1, seconds: 0.8, flicker: { min: 0.7, max: 1, steps: 4 }, release: 0.2 },
      wall: { color: [1, 0, 0], range: 1, seconds: 1.6, flicker: { min: 0.7, max: 1, steps: 4 }, release: 0.2 },
    },
    // One light per piece of art instead of 26 pure-red pools that summed to a pink flood: the white-hot burst,
    // the crater's orange, and the glowing field the cracks and satellites cover out to ~3.7 tiles.
    enhanced: {
      bodies: {
        burst: effectLight([1, 0.85, 0.6], 1.3, 0.45, { heightOffset: 0.4, release: 0.3 }),
        crater: effectLight([1, 0.5, 0.18], 1.5, 1.4, { attack: 0.08, release: 0.6, flicker: { min: 0.75, max: 1, steps: 4 } }),
        field: effectLight([1, 0.42, 0.12], 3.7, 1.6, { attack: 0.3, release: 0.7, flicker: { min: 0.8, max: 1, steps: 4 } }),
      },
    },
  },
});
