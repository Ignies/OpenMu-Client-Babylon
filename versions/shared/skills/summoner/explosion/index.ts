import { defineSkill } from '@/controllers/skills/define';
import { BOMB_SPARKS, MODEL, TEX } from '@/controllers/fx/recipes';
import { emitBurst, entityGone, entityPos, scaleRGB, type ParticleRecipe, type PointSource, type RGB, type SheetCells } from '@/controllers/fx/core';
import { SkillContext, Step, after, burn, cm, particles, perTick, scorch, seq, ticks } from '@/controllers/skills/visuals';
import { type SummonBody } from '@/controllers/fx/summon';
import { SummonCast, bookTier, curseLight, levelLight, summonCast, summonCastGrace, yawToward } from '../_shared';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { randInt } from '../../_shared';
import { playCombat } from '@/controllers/sound/combat';
import { Ecs } from '@/ecs/current';

import { SUMMON_CLIPS } from '../_shared';

const CAST_EXPLOSION: SummonCast = { impact: [1, 0.6, 0.4], outer: [1, 0.5, 0], inner: [1, 0.5, 0], burst: [1, 0.5, 0.8] };

/** MODEL_SUMMONER_SUMMON_SAHAMUTT's Scale by book tier (ZzzEffect.cpp:783-795). */
const SAHAMUTT_SCALE = [0.35, 0.5, 0.7];
/** The bones its fire comes off, three FIRE_CURSEDLICH sub2 each a tick (MoveHandlers.cpp:1247-1258). */
const SAHAMUTT_FIRE_BONES = [13, 23, 39, 49, 3, 4, 5, 61];
/**
 * FIRE_CURSEDLICH sub2 (firehik02, 64 px): LT 8..19, Scale (0.2..0.49) x 5 / 4 / 3 shrinking 0.04..0.12 a
 * tick, rising 3.75..7.25 cm a tick, in `Alpha x 0.3` grey (ZzzEffectParticle.cpp:303-309, :4331-4336).
 * The colour is the peak Alpha's; the emission count follows the Alpha instead of each card's light.
 */
const SAHAMUTT_FIRE: ParticleRecipe = {
  texture: TEX.fireCursedLich,
  colour: [0.18, 0.18, 0.18],
  size: 0.9,
  sizeJitter: 0.55,
  life: ticks(19),
  lifeJitter: 0.58,
  box: [0.04, 0.04, 0.04],
  dir1: [0, 1, 0],
  dir2: [0, 1, 0],
  power: perTick(7.25),
  powerJitter: 0.48,
  endScale: 0.35,
  fade: [
    [0, 1],
    [0.85, 1],
    [1, 0],
  ],
  capacity: 640,
};
/** CreateBomb3 by tier (ZzzEffect.cpp:6373-6431): cards a tick, the chance of each, the spread and the height range, cm. */
const SAHAMUTT_BOMBS = [
  { cards: 1, chance: 1 / 3, spread: 15, low: 30, high: 110 },
  { cards: 1, chance: 4 / 5, spread: 40, low: 30, high: 150 },
  { cards: 2, chance: 9 / 10, spread: 75, low: 30, high: 160 },
];
/** BITMAP_SUMMON_SAHAMUTT_EXPLOSION: loungexflow's 4x4 cells, one a tick over its 16 ticks (ZzzEffectParticle.cpp:4272). */
const SAHAMUTT_BLAST_CELLS: SheetCells = { w: 64, h: 64, count: 16 };

/**
 * One CreateBomb3 at the Sahamutt's feet: up to two loungexflow cards (Width 256 cm x 0.15 x rand() % 10),
 * and with them a Magic_Ground2 flash in (1, 0.5, 0.2) (LT 10, Scale 1.05..1.08 growing 0.1 a tick,
 * light x 0.9 a tick, ZzzEffectParticle.cpp:928-933, :4138-4144) and five BITMAP_SPARK sub2. Its three
 * stones are Scale 0 and draw nothing. The original makes the flash and sparks even on a tick with no
 * card, at an unset `vBombPos`; here they come only with a card.
 */
function sahamuttBomb(c: SkillContext, at: Vector3, tier: number): void {
  const b = SAHAMUTT_BOMBS[tier];
  let last: Vector3 | null = null;
  for (let i = 0; i < b.cards; i++) {
    if (Math.random() >= b.chance) break;
    const p = new Vector3(at.x + cm(randInt(b.spread * 2) - b.spread), at.y + cm(b.low + randInt(b.high - b.low)), at.z + cm(randInt(b.spread * 2) - b.spread));
    last = p;
    const scale = 0.15 * randInt(10);
    if (scale > 0) effects.spawn('sprite', c.scene, p, { texture: TEX.sahamuttBlast, cells: SAHAMUTT_BLAST_CELLS, size: cm(256) * scale, seconds: ticks(16), fadeTail: 0 });
  }
  if (!last) return;
  effects.spawn('sprite', c.scene, last, { texture: TEX.magicGround2, colour: [1, 0.5, 0.2], size: cm(128) * 1.064, scaleRate: perTick(12.8), decay: 0.9, seconds: ticks(10), fadeTail: 0 });
  particles({ recipe: BOMB_SPARKS, count: 5 })(last, c);
}

const SAHAMUTT_TINT: RGB = [1, 0.45, 0.15];
/** The bone fire with its grey pulled to orange at a little less luminance: the grey washed to pale peach under the tone curve. */
const SAHAMUTT_FIRE_GRADED: ParticleRecipe = { ...SAHAMUTT_FIRE, colour: [0.24, 0.13, 0.05] };
/** Embers shed by the running Sahamutt. */
const SAHAMUTT_EMBERS: ParticleRecipe = {
  texture: TEX.flare,
  colour: [1, 0.55, 0.2],
  colourEnd: [0.6, 0.12, 0.02],
  size: 0.16,
  sizeJitter: 0.5,
  life: 0.7,
  lifeJitter: 0.4,
  box: [0.3, 0.3, 0.3],
  dir1: [-0.4, 0.6, -0.4],
  dir2: [0.4, 1, 0.4],
  power: 1.2,
  powerJitter: 0.5,
  gravity: 0.6,
  endScale: 0.3,
  capacity: 160,
};
/** Soot rolling up off the blasts, drawn as coverage. */
const SAHAMUTT_SOOT: ParticleRecipe = {
  texture: TEX.smoke,
  colour: [0.5, 0.5, 0.5],
  size: 1.1,
  sizeJitter: 0.3,
  life: 1.6,
  lifeJitter: 0.3,
  box: [0.5, 0.3, 0.5],
  dir1: [-0.15, 1, -0.15],
  dir2: [0.15, 1, 0.15],
  power: 0.9,
  spin: 0.8,
  endScale: 2.4,
  fade: [
    [0, 0],
    [0.2, 0.8],
    [1, 0],
  ],
  blend: 'dark',
  capacity: 96,
};

/** The Sahamutt's own light (its fire, at its Alpha) and the embers it sheds while it runs. */
function sahamuttGrace(c: SkillContext, b: SummonBody, gone: () => boolean, tier: number): void {
  const ride: PointSource = out => out.set(b.at.x, b.at.y + 0.5, b.at.z);
  effects.spawn('particles', c.scene, b.at, { recipe: SAHAMUTT_EMBERS, rate: 40, seconds: ticks(32), follow: ride, until: gone, rateScale: () => b.alpha / 0.6 });
  levelLight(c.scene, SAHAMUTT_TINT, SAHAMUTT_SCALE[tier] * 2, ticks(34), ride(new Vector3()), ride, () => b.alpha / 0.6, { release: ticks(4) });
}

/** The blasts' light for their 32 ticks, a glow on the ground under them and soot rolling up. */
function sahamuttBlastGrace(c: SkillContext, at: Vector3, tier: number): void {
  const p = at.clone();
  const extent = 1.2 + 0.3 * tier;
  effects.spawn('sprite', c.scene, p, { texture: TEX.flare, colour: scaleRGB(SAHAMUTT_TINT, 0.25), size: 2 + 0.6 * tier, seconds: ticks(40), fadeIn: 0.1, fadeTail: 0.5, flat: true });
  effects.spawn('particles', c.scene, p, { recipe: SAHAMUTT_SOOT, rate: 10 + 4 * tier, seconds: ticks(32), height: 0.6 });
  curseLight(c.scene, [1, 0.55, 0.2], extent, ticks(40), p, undefined, { attack: ticks(2), release: ticks(10), heightOffset: 0.8, flicker: { min: 0.75, max: 1.1, steps: 4 } });
}

/**
 * 223 Explosion (SummonSystem.cpp:136-155, MoveHandlers.cpp:1168-1261): MODEL_SUMMONER_SUMMON_SAHAMUTT
 * (LT 80) starts 1.5..4.5 tiles off the caster on each axis and runs on the terrain at the point:
 * action 0 at 0.5 keys a tick while its Alpha climbs to 0.3 (6 ticks), then action 1: Alpha +0.05 while
 * the frame is under 3, the run (Distance / 13 a tick over frames 4..10, / 45 over 10..12), and from
 * frame 11 (tick 28) Alpha -0.3 a tick and a CreateBomb3 every tick until LT 20, with explosion03 on
 * half of them. Drawn textured plus the RENDER_BRIGHT | CHROME7 pass, both at Alpha (ZzzObject.cpp:1698-1702).
 */
const sahamuttOf = (graded: boolean): Step => (at, c) => {
  if (entityGone(c.caster)) return;
  const tier = bookTier(c.caster);
  const world = Ecs.world;
  const start = entityPos(c.caster, 0, new Vector3());
  start.x += Math.random() < 0.5 ? cm(randInt(300) + 150) : -cm(randInt(250) + 150);
  start.z += Math.random() < 0.5 ? cm(randInt(300) + 150) : -cm(randInt(250) + 150);
  start.y = world?.getTerrainHeight(start.x, start.z) ?? at.y;
  const dx = at.x - start.x;
  const dz = at.z - start.z;
  const bone = new Vector3();
  let action = 0;
  let done = 0;
  let lit = false;
  const beast = effects.spawn('summon', c.scene, start, {
    model: MODEL.summonSahamutt,
    seconds: ticks(80),
    scale: SAHAMUTT_SCALE[tier],
    yaw: yawToward(start, at),
    alpha: 0,
    meshes: [{ draw: 'both' }, { draw: 'both' }],
    clip: 0,
    keysPerTick: 0.5,
    drive: (b, t) => {
      const u = t - 6;
      if (u >= 0 && action === 0) {
        action = 1;
        b.play(1, 0.5, false, 12);
      }
      b.alpha = u < 0 ? 0.05 * t : u < 6 ? 0.3 + 0.05 * u : u < 22 ? 0.6 : Math.max(0, 0.6 - 0.3 * (u - 22));
      const f = u < 8 ? 0 : u < 19 ? (u - 8) / 13 : 11 / 13 + (Math.min(u, 23) - 19) / 45;
      b.at.x = start.x + dx * f;
      b.at.z = start.z + dz * f;
      b.at.y = world?.getTerrainHeight(b.at.x, b.at.z) ?? at.y;
      if (graded && !lit) {
        lit = true;
        sahamuttGrace(c, b, () => !beast.alive, tier);
      }
      for (; done < Math.floor(t); done++) {
        const tick = done + 1;
        if (graded && tick === 28) sahamuttBlastGrace(c, b.at, tier);
        if (b.alpha > 0 && b.loaded) {
          for (const i of SAHAMUTT_FIRE_BONES) {
            const n = 5 * b.alpha;
            const count = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
            if (count > 0 && b.bone(i, bone)) emitBurst(c.scene, graded ? SAHAMUTT_FIRE_GRADED : SAHAMUTT_FIRE, bone, count);
          }
        }
        if (tick >= 28 && tick <= 60) {
          sahamuttBomb(c, b.at, tier);
          if (Math.random() < 0.5) playCombat('Sound/SE_Ch_summoner_skill05_explosion03', b.at);
        }
      }
    },
  });
};

export default defineSkill({
  id: 223,
  name: "Explosion",
  // 223 Explosion: the casting circle at the caster, then the Sahamutt runs from beside the caster to the
  // point, burning, and blasts it for 32 ticks (summonCast, sahamutt). The graded tiers also scorch the ground.
  visual: {
    cast: summonCast(CAST_EXPLOSION),
    area: sahamuttOf(false),
    enhanced: { cast: seq(summonCast(CAST_EXPLOSION), summonCastGrace(CAST_EXPLOSION)), area: seq(sahamuttOf(true), after(ticks(28), seq(scorch(1), burn(1)))) },
  },
  buffs: {
    75: () => ({ smoulder: true }),
  },
  // The summons play their summoning sound at the cast; explosion03 and requiem02 come later with the effect (skillVisuals.ts).
  sound: 'Sound/SE_Ch_summoner_skill05_explosion01', // Explosion (SOUND_SUMMON_SAHAMUTT)
  delayMs: 4000, // Explosion
  clip: SUMMON_CLIPS, // Explosion
});
