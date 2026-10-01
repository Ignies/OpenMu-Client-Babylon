import { defineSkill } from '@/controllers/skills/define';
import { DEG } from '../../_shared';
import { ENUM_WORLD } from '@/core/types';
import { entityPos, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';
import { PlayerAction } from '@versions/shared/objects/enum';
import { Step, TICK, after, cm, particles, ring, sprite, ticks } from '@/controllers/skills/visuals';
import { TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { atFrame, sfx } from '../_shared';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { storeRef } from '@/app/storeRef';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_COMMAND } from '../../_shared';

import { SkillLight } from '@/controllers/lighting/skills';
import { TICK_SECONDS } from '../../_shared';
import { effectLight } from '@/controllers/lighting/recipes';

/** Removal Buff fires once the caster's clip passes key 3.5, or at AttackTime 15 (ZzzCharacter.cpp:2927-2931). */
const REMOVAL_CLIPS: ReadonlySet<number> = new Set([
  PlayerAction.PLAYER_SKILL_VITALITY,
  PlayerAction.PLAYER_ATTACK_RIDE_ATTACK_MAGIC,
  PlayerAction.PLAYER_SKILL_RIDER,
  PlayerAction.PLAYER_SKILL_RIDER_FLY,
  PlayerAction.PLAYER_FENRIR_ATTACK_MAGIC,
]);
/** The six MODEL_SPEARSKILL joints: Angle[2], height over the feet in cm, SubType (ZzzCharacter.cpp:4323-4338). */
const REMOVAL_BANDS = [
  [45, 100, 5],
  [135, 90, 6],
  [225, 80, 7],
  [90, 80, 5],
  [180, 70, 6],
  [270, 60, 7],
] as const;
const REMOVAL_TINTS: Record<5 | 6 | 7, RGB> = { 5: [1, 1, 0.8], 6: [1, 0.8, 1], 7: [0.8, 1, 1] };
/** LifeTime 60: 61 moves of three tails; 30 tails kept. */
const REMOVAL_MOVES = 61;
const REMOVAL_TAILS = 30;
/** `Light x 1/1.2` a move once LifeTime is under 10. */
const removalLight = (k: number): number => (k > 50 ? Math.pow(1.2, 50 - k) : 1);

interface RemovalPath {
  /** Every tail the joint lays, in cm off its start: x, z, climb, width. */
  x: Float32Array;
  z: Float32Array;
  y: Float32Array;
  w: Float32Array;
  /** The tail on which Weapon reaches 40 (the shock wave), and Angle[2] then. */
  ring: number;
  /** The tail on which the band first swings through the caster (Weapon 0 to 1). */
  flip: number;
  ringYaw: number;
}

/**
 * MODEL_SPEARSKILL sub5-7's path (ZzzEffectJoint.cpp:1597-1630, :4344-4391), three substeps a move:
 * yaw +10, radius x0.95 from 800 cm until it flips to -30 (Weapon 1-19, width held at 40), then the
 * start climbs 5 cm a substep, and past Weapon 40 the radius runs out 20 cm and the width grows 15
 * a substep while the yaw falls back 5. The width loses 5 a move throughout.
 */
function removalPath(yaw0: number): RemovalPath {
  const n = 1 + REMOVAL_MOVES * 3;
  const path: RemovalPath = { x: new Float32Array(n), z: new Float32Array(n), y: new Float32Array(n), w: new Float32Array(n), ring: -1, ringYaw: 0, flip: -1 };
  let a = yaw0;
  let d = 800;
  let weapon = 0;
  let s = 170;
  let climb = 0;
  let i = 0;
  const put = (): void => {
    path.x[i] = -Math.sin(a * DEG) * d;
    path.z[i] = Math.cos(a * DEG) * d;
    path.y[i] = climb;
    path.w[i] = Math.abs(s);
    i++;
  };
  put();
  for (let k = 0; k < REMOVAL_MOVES; k++) {
    for (let j = 0; j < 3; j++) {
      a += 10;
      put();
      if (weapon === 0) {
        d *= 0.95;
        if (d < 10) d = -10;
      }
      if (weapon > 40) {
        d -= 20;
        a -= 5;
        s += 15;
      }
      if (d < 0) {
        if (weapon === 0) path.flip = i - 1;
        if (weapon === 40) {
          path.ring = i - 1;
          path.ringYaw = a;
        }
        weapon++;
        if (weapon < 20) {
          d = -30;
          s = 40;
        } else climb += 5;
      }
    }
    s -= 5;
  }
  return path;
}

const REMOVAL_PATHS = REMOVAL_BANDS.map(([yaw]) => removalPath(yaw));

/**
 * Graded tiers: the widest a band grows, in cm. The original's run out to 7 m, and Flare02's haze
 * over that height washed the graded view into flat grey sheets with straight ends.
 */
const REMOVAL_WIDTH_HD = 160;
/** Graded tiers: tails over which a band's ends fade, so it tapers instead of ending on the sheet's straight edge. */
const REMOVAL_ROOT_FADE = 9;
const REMOVAL_HEAD_FADE = 4;
const removalEndFade = (i: number): number => Math.min(1, (i + 1) / REMOVAL_ROOT_FADE, (REMOVAL_TAILS - i) / REMOVAL_HEAD_FADE);
/** Graded tiers: glints the band heads shed. */
const REMOVAL_GLINTS: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.95, 0.92, 1],
  colourEnd: [0.5, 0.45, 0.7],
  size: 0.16,
  sizeJitter: 0.5,
  life: 0.55,
  lifeJitter: 0.4,
  box: [0.1, 0.15, 0.1],
  dir1: [-0.3, 0.2, -0.3],
  dir2: [0.3, 0.8, 0.3],
  power: 0.5,
  powerJitter: 0.5,
  gravity: 0.3,
  capacity: 384,
};
/** Graded tiers: the glints the shock rings throw out flat as they leave. */
const REMOVAL_RING_GLINTS: ParticleRecipe = { ...REMOVAL_GLINTS, size: 0.2, life: 0.7, box: [0.2, 0.05, 0.2], dir1: [-1, 0.05, -1], dir2: [1, 0.35, 1], power: 5, gravity: -1, capacity: 128 };

/**
 * Removal Buff's six bands round where the caster stands: Flare02 (REPEAT) additive, a single
 * vertical face (RENDER_FACE_ONE is the tail's Z pair), the last 30 tails. Sub5 / sub6 each drop a
 * BITMAP_SHOCK_WAVE sub3 when Weapon reaches 40: 1 to 31 tiles over 15 ticks, the band's Light.
 * `hd`: the graded tiers' tapered, width-capped bands with a glint at each head, the flash where they
 * swing through the caster, the rings' glints, and the light cues.
 */
const removalBandsOf = (hd: boolean): Step => (_at, c) => {
  const feet = entityPos(c.caster, 0, new Vector3());
  if (hd) lighting.skillCue(c.scene, 72, 'bands', c.caster);
  REMOVAL_BANDS.forEach(([, height, sub], b) => {
    const path = REMOVAL_PATHS[b];
    const tint = REMOVAL_TINTS[sub];
    const n = path.x.length;
    const head = new Vector3(feet.x + cm(path.x[0]), feet.y + cm(height), feet.z + cm(path.z[0]));
    effects.spawn('path', c.scene, feet, {
      points: Array.from({ length: REMOVAL_TAILS }, () => new Vector3()),
      texture: TEX.flare2,
      colour: tint,
      uPerPoint: 1 / (REMOVAL_TAILS - 1),
      faces: 'vertical',
      seconds: ticks(REMOVAL_MOVES),
      life: p => removalLight(Math.floor(p * REMOVAL_MOVES)),
      ...(hd ? { shade: removalEndFade } : {}),
      rebuild: (t, pts, widths) => {
        // The first move runs as the joint is made; its substeps are spread over each tick.
        const made = Math.min(n, 4 + Math.floor((3 * t) / TICK));
        const count = Math.min(REMOVAL_TAILS, made);
        for (let j = 0; j < count; j++) {
          const i = made - count + j;
          pts[j].set(feet.x + cm(path.x[i]), feet.y + cm(height + path.y[i]), feet.z + cm(path.z[i]));
          widths[j] = cm(hd ? Math.min(path.w[i], REMOVAL_WIDTH_HD) : path.w[i]);
        }
        if (hd) head.copyFrom(pts[count - 1]);
        return count;
      },
    });
    if (hd) {
      const follow: PointSource = out => out.copyFrom(head);
      effects.spawn('sprite', c.scene, head, { texture: TEX.flare, colour: [tint[0] * 0.55, tint[1] * 0.55, tint[2] * 0.55], size: 0.8, seconds: ticks(REMOVAL_MOVES - 6), fadeTail: 0.25, follow });
      effects.spawn('particles', c.scene, head, { recipe: REMOVAL_GLINTS, rate: 18, seconds: ticks(REMOVAL_MOVES - 8), follow });
    }
    if (sub !== 7) {
      after(ticks(Math.floor((path.ring - 1) / 3)), ring({ texture: TEX.shockwave, colour: tint, scale: 1, grow: 31, maxScale: 31, seconds: ticks(15), spinFrom: -path.ringYaw, fadeTail: 0.001 }))(feet, c);
    }
  });
  if (hd) {
    // The bands swing through the caster: a pale flash at his chest and a soft pool under him.
    const chest = new Vector3(feet.x, feet.y + 1, feet.z);
    after(ticks(Math.floor((REMOVAL_PATHS[0].flip - 4) / 3)), sprite({ texture: TEX.flare, colour: [0.8, 0.76, 0.9], size: 2.2, seconds: ticks(14), growFrom: 0.3, grow: 1.2, fadeTail: 0.7 }))(chest, c);
    ring({ texture: TEX.flare, colour: [0.22, 0.2, 0.28], scale: 5, seconds: ticks(REMOVAL_MOVES), growFrom: 0.4, fadeTail: 0.3 })(feet, c);
    // The first shock ring: its glints thrown out flat, and the light's wide flash.
    after(ticks(Math.floor((REMOVAL_PATHS[0].ring - 1) / 3)), (p, cc) => {
      lighting.skillCue(cc.scene, 72, 'ring', cc.caster);
      sprite({ texture: TEX.flare, colour: [0.9, 0.86, 1], size: 3, seconds: ticks(10), growFrom: 0.4, grow: 1.6, fadeTail: 0.7, height: 0.4 })(p, cc);
      particles({ recipe: REMOVAL_RING_GLINTS, count: 36, height: 0.3 })(p, cc);
    })(feet, c);
  }
  // SOUND_BMS_MAGIC_REMOVAL is loaded on the Battle Castle map only (MapManager.cpp:251-276).
  if (storeRef().world?.mapIndex === ENUM_WORLD.WD_30BATTLECASTLE) sfx('Sound/battlecastle/sDMagicCancel')(feet, c);
};

const removalBuff: Step = atFrame(REMOVAL_CLIPS, 3.5, ticks(14), removalBandsOf(false));
const removalBuffHd: Step = atFrame(REMOVAL_CLIPS, 3.5, ticks(14), removalBandsOf(true));

/**
 * Removal Buff: the original lights nothing. On the graded tiers the six pale bands light the caster
 * while they wind in and out (61 ticks from key 3.5, about 3 tiles round him), and the two shock
 * rings flash wide as they leave.
 */
const REMOVAL_LIGHT: SkillLight = {
  enhanced: {
    timed: [
      { ...effectLight([0.95, 0.92, 1], 3, 61 * TICK_SECONDS, { attack: 10 * TICK_SECONDS, release: 12 * TICK_SECONDS, heightOffset: 1 }), delay: 0, cue: 'bands', ride: true },
      { ...effectLight([1, 0.95, 1], 4, 12 * TICK_SECONDS, { release: 9 * TICK_SECONDS, heightOffset: 0.5 }), delay: 0, cue: 'ring' },
    ],
  },
};

export default defineSkill({
  id: 72,
  name: "Abolish Magic",
  // 72 Removal Buff (Abolish Magic): six MODEL_SPEARSKILL sub5-7 bands spiralling in on the caster, rising and bursting
  // out, and four BITMAP_SHOCK_WAVE sub3, at clip key 3.5 (ZzzCharacter.cpp:2927-2931, :4295-4341).
  visual: { impact: removalBuff, area: removalBuff, enhanced: { impact: removalBuffHd, area: removalBuffHd } },
  clip: { ground: A.PLAYER_SKILL_VITALITY, ...MOUNTED_COMMAND }, // Removal Buff
  light: REMOVAL_LIGHT,
});
