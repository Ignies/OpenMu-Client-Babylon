import { defineSkill } from '@/controllers/skills/define';
import { DEG, randInt, whenClipKey } from '../../_shared';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { spawnModel, type ModelHandle } from '@/controllers/fx/model';
import { emitBurst, entityPos, entityYaw, type ParticleRecipe, type RGB } from '@/controllers/fx/core';
import { PlayerAction } from '@versions/shared/objects/enum';
import { Step, cm, forwardOf, ticks } from '@/controllers/skills/visuals';
import { type StripOptions, type TailStrip } from '@/controllers/fx/ticked';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { mgSay, mgTurn } from '../_shared';
import { Ecs } from '@/ecs/current';

import { A } from '@/controllers/combat/recipes';

import { effectLight } from '@/controllers/lighting/recipes';

/** Gigantic Storm: the flash where a bolt lands, and the sparks it throws, in the bolts' blue-white. */
const MG_STORM_FLASH: RGB = [0.7, 0.75, 1];
const MG_STORM_SPARKS: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.85, 0.9, 1],
  colourEnd: [0.35, 0.4, 1],
  size: 0.1,
  sizeJitter: 0.04,
  life: 0.35,
  lifeJitter: 0.15,
  dir1: [-1, 0.5, -1],
  dir2: [1, 1.5, 1],
  power: 2.2,
  powerJitter: 0.8,
  gravity: -5,
  spin: 3,
  capacity: 320,
};

/** Gigantic Storm's tint on its decals, smoke and chips: `vLight = (0.45, 0.45, 0.7)` (MoveHandlers.cpp:1697). */
const MG_STORM_TINT: RGB = [0.45, 0.45, 0.7];
const MG_STORM_ENERGY: RGB = [0.15, 0.15, 0.4];
/** JOINT_THUNDER sub16: 50 tails of JointThunder01, both faces, its doubled scrolled U, white (ZzzEffectJoint.cpp:1100-1104, :1311-1314). */
const MG_STORM_BOLT: StripOptions = { texture: TEX.jointThunder, maxTails: 50, uScale: 2, uScroll: true, batch: 8 };

/**
 * A JOINT_THUNDER sub16 bolt (ZzzEffectJoint.cpp:4738-5000): each tick up to 50 steps of `Velocity` 20-29 cm, homing
 * 50 deg a step on the foot and laid through an angle jittered +-512 / Scale deg, until it is within 1.5 steps. LT 2-3.
 */
interface MgBolt {
  strip: TailStrip;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  tx: number;
  ty: number;
  tz: number;
  v: number;
  half: number;
  jitter: number;
  lt: number;
}
function mgBoltTick(k: MgBolt): boolean {
  for (let j = 0; j < 50; j++) {
    const dx = k.tx - k.x;
    const dy = k.ty - k.y;
    const dz = k.tz - k.z;
    const flat = Math.hypot(dx, dz);
    const dist = Math.hypot(flat, dy);
    k.yaw = mgTurn(k.yaw, Math.atan2(dx, -dz), 50 * DEG);
    k.pitch = mgTurn(k.pitch, -Math.atan2(dy, flat), 50 * DEG);
    const yaw = k.yaw + (Math.random() * 2 - 1) * k.jitter;
    const pitch = k.pitch + (Math.random() * 2 - 1) * k.jitter;
    k.strip.push(k.x, k.y, k.z, k.half, yaw, pitch);
    if (dist < k.v * 1.5) break;
    const cp = Math.cos(pitch);
    k.x += cp * Math.sin(yaw) * k.v;
    k.y -= Math.sin(pitch) * k.v;
    k.z -= cp * Math.cos(yaw) * k.v;
  }
  return --k.lt >= 0;
}

/** A ground decal with its own life: BITMAP_MAGIC+1 sub11 and BITMAP_CHROME_ENERGY2. */
interface MgDecal {
  x: number;
  z: number;
  lt: number;
  alpha: number;
  light: number;
}
/** BITMAP_SMOKE sub54 (ZzzEffectParticle.cpp:1531-1538, :5722-5734): LT 22, rising, growing 1 % a tick, light / 1.02 a tick. */
interface MgSmoke {
  x: number;
  y: number;
  z: number;
  scale: number;
  grav: number;
  roll: number;
  light: number;
  lt: number;
}
/** MODEL_STONE1/2 sub13 (ZzzEffect.cpp:2700-2715, :7278-7300): thrown, bounced by its own LifeTime, Alpha -0.1 a ground tick. */
interface MgStone {
  handle: ModelHandle;
  pos: Vector3;
  vx: number;
  vy: number;
  vz: number;
  grav: number;
  pitch: number;
  alpha: number;
  lt: number;
}

/**
 * Gigantic Storm (237, and 496 through the aliases): at GIGANTICSTORM frame > 7 SOUND_SKILL_GIGANTIC_STORM and five
 * BITMAP_JOINT_THUNDER sites at the caster + (0, 200, 0) turned yaw + i * 72: site 0 two metres behind him
 * (ZzzCharacter.cpp:3001-3006, :4761-4779). Each site lives 20 ticks, its sky point 800 cm up (ZzzEffect.cpp:1322-1328);
 * each tick, with both ends jittered +-50 cm (MoveHandlers.cpp:1672-1715): 50 % a bolt of width 10-50 from the sky to
 * the ground; while LT > 10, 50 % a Magic_Ground2 decal at the foot growing to 3 tiles; 25 % a smoke there; 25 % a
 * stone chip from the site; while LT > 5, 20 % an energy02 decal 1.5 tiles. Positionless sound, no light.
 * `enh` (graded tiers) adds a flash and a spark spray where each bolt lands, and a flickering light on each site.
 */
const mgGiganticStorm = (enh: boolean): Step => (at, c) =>
  whenClipKey(PlayerAction.PLAYER_SKILL_GIGANTICSTORM, 7.001, 14, (_p, cc) => {
    mgSay('Sound/gigantic_storm');
    const feet = entityPos(cc.caster, 0, new Vector3());
    const yaw = entityYaw(cc.caster);
    const yawDeg = yaw / DEG;
    const world = Ecs.world;
    const sites = [0, 1, 2, 3, 4].map(i => {
      const f = forwardOf(yaw + i * 72 * DEG);
      return new Vector3(feet.x - f.x * 2, feet.y, feet.z - f.z * 2);
    });
    let siteLt = 20;
    const bolts: MgBolt[] = [];
    const rings: MgDecal[] = [];
    const energy: MgDecal[] = [];
    const smokes: MgSmoke[] = [];
    const stones: MgStone[] = [];
    // Enhanced: bolt landings still flashing (x, y, z, ticks left), four numbers each.
    const flashes: number[] = [];
    const spray = new Vector3();
    const lights = enh
      ? sites.map(s =>
          lighting.skillFollow(cc.scene, 237, out => {
            out.x = s.x;
            out.y = s.y + 0.5;
            out.z = s.z;
          })
        )
      : [];
    effects.spawn('ticked', cc.scene, feet, {
      tick(fx) {
        if (siteLt > 0) {
          for (const s of sites) {
            const sx = s.x + cm(randInt(100) - 50);
            const sz = s.z + cm(randInt(100) - 50);
            const fx0 = s.x + cm(randInt(100) - 50);
            const fz0 = s.z + cm(randInt(100) - 50);
            if (randInt(2) === 0) {
              const scale = (randInt(400) + 100) / 10;
              bolts.push({ strip: fx.strip(MG_STORM_BOLT), x: sx, y: s.y + 8, z: sz, yaw, pitch: 0, tx: fx0, ty: s.y, tz: fz0, v: cm(20 + randInt(10)), half: cm(scale) / 2, jitter: (512 / scale) * DEG, lt: randInt(2) + 2 });
              if (enh) {
                flashes.push(fx0, s.y + 0.15, fz0, 3);
                emitBurst(cc.scene, MG_STORM_SPARKS, spray.set(fx0, s.y + 0.1, fz0), 5);
              }
            }
            if (siteLt > 10 && randInt(2) === 0) rings.push({ x: fx0, z: fz0, lt: 20, alpha: 1, light: 1 });
            if (randInt(4) === 0) smokes.push({ x: fx0, y: s.y, z: fz0, scale: 2.8 + randInt(50) * 0.01, grav: (randInt(30) + 50) * 0.05, roll: randInt(360) * DEG, light: 1, lt: 22 });
            if (randInt(4) === 0) {
              const pos = s.clone();
              // HeadAngle = (0, 6.4-19.1, 0) turned by the chip's own random Angle[2]: backward along the way it faces.
              const turn = randInt(360) * DEG;
              const dir = forwardOf(turn + Math.PI);
              const speed = cm((randInt(128) + 64) * 0.1);
              stones.push({
                pos,
                vx: dir.x * speed,
                vy: cm(15),
                vz: dir.z * speed,
                grav: cm(randInt(3) + 3),
                pitch: 0,
                alpha: 1,
                lt: randInt(16) + 20,
                handle: spawnModel(cc.scene, pos, {
                  model: randInt(2) ? MODEL.stone2 : MODEL.stone,
                  seconds: ticks(36),
                  scale: (randInt(13) + 3) * 0.08,
                  colour: MG_STORM_TINT,
                  yaw: turn,
                  blendMesh: -1,
                  loop: false,
                  fadeTail: 0,
                  follow: out => out.copyFrom(pos),
                }),
              });
            }
            if (siteLt > 5 && randInt(5) === 0) energy.push({ x: fx0, z: fz0, lt: 30, alpha: 1, light: 1 });
          }
          siteLt--;
          if (siteLt === 0) for (const l of lights) l?.stop();
        }
        for (let i = flashes.length - 4; i >= 0; i -= 4) {
          const k = flashes[i + 3] / 3;
          fx.sprite(TEX.flare, MG_STORM_FLASH, flashes[i], flashes[i + 1], flashes[i + 2], 1.2 * k, 1.2 * k, i, 0.8 * k);
          fx.sprite(TEX.flare, RGBS.white, flashes[i], flashes[i + 1], flashes[i + 2], 0.45 * k, 0.45 * k, -i, k);
          if (--flashes[i + 3] > 0) continue;
          const last = flashes.length - 4;
          for (let j = 0; j < 4; j++) flashes[i + j] = flashes[last + j];
          flashes.length = last;
        }
        for (let i = bolts.length - 1; i >= 0; i--) {
          if (mgBoltTick(bolts[i])) continue;
          fx.drop(bolts[i].strip);
          bolts[i] = bolts[bolts.length - 1];
          bolts.pop();
        }
        // BITMAP_MAGIC+1 sub11 (MoveHandlers.cpp:1388-1399, ZzzEffect.cpp:9786-9880): Scale (20 - LT) * 0.15, Alpha
        // -0.05 a tick compounding into Light over the last 10, Luminosity down 0.2 a tick below LT 5, turned -yaw.
        for (let i = rings.length - 1; i >= 0; i--) {
          const r = rings[i];
          if (--r.lt <= 0) {
            rings[i] = rings[rings.length - 1];
            rings.pop();
            continue;
          }
          if (r.lt <= 10) {
            r.alpha -= 0.05;
            r.light *= r.alpha;
          }
          const lum = r.lt < 5 ? 1 - (5 - r.lt) * 0.2 : 1;
          fx.decal(TEX.magicGround2, MG_STORM_TINT, r.x, r.z, (20 - r.lt) * 0.15, -yawDeg, lum * r.light);
        }
        // BITMAP_CHROME_ENERGY2 (ZzzEffect.cpp:4145-4151, :10074-10076, MoveHandlers.cpp:6919-6928): 1.5 tiles, x0.8 a tick below LT 10.
        for (let i = energy.length - 1; i >= 0; i--) {
          const e = energy[i];
          if (--e.lt <= 0) {
            energy[i] = energy[energy.length - 1];
            energy.pop();
            continue;
          }
          if (e.lt < 10) e.light *= 0.8;
          fx.decal(TEX.energy2, MG_STORM_ENERGY, e.x, e.z, 1.5, 0, e.light);
        }
        for (let i = smokes.length - 1; i >= 0; i--) {
          const s = smokes[i];
          if (--s.lt <= 0) {
            smokes[i] = smokes[smokes.length - 1];
            smokes.pop();
            continue;
          }
          s.light /= 1.02;
          s.grav -= 0.05;
          s.y += cm((s.scale + s.grav) * 1.5);
          s.scale += s.scale / 100;
          const size = cm(64) * s.scale;
          fx.sprite(TEX.smoke, MG_STORM_TINT, s.x, s.y, s.z, size, size, s.roll, s.light);
        }
        for (let i = stones.length - 1; i >= 0; i--) {
          const s = stones[i];
          if (--s.lt <= 0 || s.alpha <= 0) {
            s.handle.stop();
            stones[i] = stones[stones.length - 1];
            stones.pop();
            continue;
          }
          s.vy -= s.grav;
          s.pos.x += s.vx;
          s.pos.y += s.vy;
          s.pos.z += s.vz;
          s.pitch += 0.5 * s.lt * DEG;
          const ground = world ? world.getTerrainHeight(s.pos.x, s.pos.z) : -Infinity;
          if (s.pos.y <= ground) {
            s.pos.y = ground;
            s.vx *= 0.6;
            s.vz *= 0.6;
            s.vy += cm(s.lt);
            if (s.vy < cm(0.5)) s.vy = 0;
            s.alpha -= 0.1;
          }
          s.handle.pitchTo(s.pitch);
          s.handle.setAlpha(s.alpha);
        }
        return siteLt > 0 || bolts.length > 0 || rings.length > 0 || energy.length > 0 || smokes.length > 0 || stones.length > 0 || flashes.length > 0;
      },
    });
  })(at, c);
const giganticStorm = mgGiganticStorm(false);
const giganticStormEnhanced = mgGiganticStorm(true);

export default defineSkill({
  id: 237,
  name: "Gigantic Storm",
  // Master numbers cast, heard, lit and drawn as this skill (the original names them in its `case`).
  masterAliases: [496],
  // 237 Gigantic Storm: five sites round the caster at clip frame > 7 (giganticStorm above).
  visual: { cast: giganticStorm, enhanced: { cast: giganticStormEnhanced } },
  clip: { ground: A.PLAYER_SKILL_GIGANTICSTORM }, // Gigantic Storm (MG)
  light: { enhanced: { follow: effectLight([0.6, 0.65, 1], 1.5, 1, { gain: 0.6, release: 0.3, flicker: { min: 0.3, max: 1, steps: 5 }, flickerSmoothing: 0.8 }) } },
});
