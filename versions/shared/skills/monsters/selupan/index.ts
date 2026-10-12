import { defineMonsterSkill, type MonsterSkillLook } from '@/controllers/skills';
import { ENUM_WORLD as W } from '@/core/types';
import { delay, entityPos, fxNow, type RGB } from '@/controllers/fx/core';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { effects } from '@/controllers/fx';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { playCombat } from '@/controllers/sound/combat';
import { TICK, cm, ticks, type SkillContext } from '@/controllers/skills/visuals';
import { rand, risingFlare, risingFlares } from '../../dark_knight/_shared';

const DEG = Math.PI / 180;

/** SetBossMonsterAction's lights for the cure decal and the storm (GM_Raklion.cpp:2493-2522). */
const CURE: RGB = [1, 0.5, 0.1];
const STORM: RGB = [0.3, 0.2, 0.1];
/** BITMAP_CLUD64 sub1 and MODEL_STONE1 sub2 round the storm, and its bolts' Light (MoveHandlers.cpp:3532-3566). */
const STORM_CLOUD: RGB = [0.3, 0.5, 0.6];

/** 39: Selupan_cure, 20 BITMAP_FLARE sub2 joints +-200 cm round him from 100 cm down, and two BITMAP_MAGIC+1 sub13 at Scale 8. */
const cure: MonsterSkillLook = c => {
  playCombat('Sound/w58w59/Selupan_cure');
  const at = entityPos(c.caster, 0, new Vector3());
  const t0 = fxNow();
  const flares = Array.from({ length: 20 }, () => risingFlare(at.x + rand(-2, 2), at.z + rand(-2, 2)));
  risingFlares(c.scene, flares, at.y - 1, () => Math.floor((fxNow() - t0) / TICK + 1e-3), ticks(75));
  // Sub13: LT 40, its Light / 1.05 a tick and no closing fade (ZzzEffect.cpp:1224-1228, :9830-9835, :9879-9881).
  for (let i = 0; i < 2; i++) {
    effects.spawn('ring', c.scene, at, { texture: TEX.magicGround2, colour: CURE, scale: 8, seconds: ticks(40), decay: 1 / 1.05, fadeTail: 0 });
  }
};

/**
 * MODEL_STORM2 sub1 at Scale 1.6 (boswind, ZzzEffect.cpp:2074-2079, MoveHandlers.cpp:3524-3566): its bright mesh turning
 * 30-39 deg a tick, Light / 1.02 a tick for its 60; each tick two BITMAP_CLUD64 sub1 200 cm out at a third of its
 * turn, half a turn apart, a two-tick JOINT_THUNDER sub20 on the ground within 300 cm and a MODEL_STONE1 sub2 by it.
 */
function bossWind(c: SkillContext, at: Vector3): void {
  const turn = (30 + Math.floor(Math.random() * 10)) * DEG;
  const yaw = c.yaw;
  effects.spawn('model', c.scene, at, {
    model: MODEL.boswind,
    seconds: ticks(60),
    scale: 1.6,
    colour: STORM,
    blendMesh: 0,
    blendLight: t => Math.pow(1 / 1.02, t / TICK),
    yaw: -yaw,
    spin: -turn / TICK,
  });
  for (let n = 0; n < 60; n++) {
    delay(n * TICK, () => {
      for (let i = 0; i < 2; i++) {
        const a = (yaw + n * turn) / 3 + i * Math.PI;
        const p = new Vector3(at.x + Math.sin(a) * 2, at.y + cm(30), at.z - Math.cos(a) * 2);
        const s = 1 + Math.random() * 0.3;
        effects.spawn('sprite', c.scene, p, { texture: TEX.clud, colour: STORM_CLOUD, size: cm(64), sizeAt: q => s + 0.5 * q * 12, intensity: q => Math.pow(1 / 1.1, q * 12), seconds: ticks(12), fadeTail: 0 });
      }
      const from = new Vector3(at.x + rand(-3, 3), at.y, at.z + rand(-3, 3));
      const to = new Vector3(from.x + rand(-0.5, 0.5), at.y, from.z + rand(-0.5, 0.5));
      effects.spawn('joint', c.scene, from, { from: out => out.copyFrom(from), to, colour: RGBS.white, seconds: ticks(2), width: cm(20), segments: 8, forks: 1, jitter: 0.1, texture: TEX.jointThunder });
      const stone = new Vector3(from.x + rand(-0.5, 0.5), at.y, from.z + rand(-0.5, 0.5));
      effects.spawn('debris', c.scene, stone, { model: Math.random() < 0.5 ? MODEL.stone : MODEL.stone2, colour: STORM_CLOUD });
    });
  }
}

/** MODEL_SUMMON sub3 (nightmaresum, Scale 1.2, LT 60): Light x1.03 a tick while LT >= 30, then / 1.08; +1 deg a tick (MoveHandlers.cpp:3484-3501). */
const summonLight = (t: number): number => {
  const n = t / TICK;
  return n <= 30 ? Math.pow(1.03, n) : Math.pow(1.03, 30) / Math.pow(1.08, n - 30);
};

/** 42: the storm and the summon circle at his feet. */
const storm: MonsterSkillLook = c => {
  const at = entityPos(c.caster, 0, new Vector3());
  bossWind(c, at);
  effects.spawn('model', c.scene, at, { model: MODEL.nightmareSummon, seconds: ticks(60), scale: 1.2, colour: STORM, blendMesh: 0, blendLight: summonLight, yaw: Math.random() * 2 * Math.PI, spin: -DEG / TICK });
};

/** SetBossMonsterAction (GM_Raklion.cpp:2486-2523): what Selupan says and draws on his 0x69 skills 38-42; 41 nothing. */
export default defineMonsterSkill({
  name: 'Selupan',
  monsters: [459],
  worlds: [W.WD_57ICECITY, W.WD_58ICECITY_BOSS],
  looks: {
    38: () => playCombat('Sound/w58w59/Selupan_word4'),
    39: cure,
    40: () => playCombat('Sound/w58w59/Selupan_word3'),
    42: storm,
  },
});
