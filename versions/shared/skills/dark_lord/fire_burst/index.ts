import { defineSkill } from '@/controllers/skills/define';
import { type Entity } from '@/ecs/world';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { type ModelHandle } from '@/controllers/fx/model';
import { boneLocalPos, delay, entityGone, entityPos, fxNow, type ParticleRecipe, type RGB } from '@/controllers/fx/core';
import { SkillContext, Step, TICK, cm, ticks } from '@/controllers/skills/visuals';
import { type StampsHandle } from '@/controllers/fx/stamps';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { hummingDir, litStrike, movesAt, strikeKey, yawDegrees } from '../_shared';
import { lighting } from '@/controllers/lighting';
import { randInt } from '../../_shared';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_STRIKE } from '../_shared';

import { effectLight } from '@/controllers/lighting/recipes';

/** Fire Burst's origin: bone 0 + (40, 0, 10) cm in its frame (ZzzCharacter.cpp:5071-5072). */
const FIRE_BURST_LOCAL = new Vector3(cm(40), 0, cm(10));
/** MODEL_PIER_PART sub0 LT 20: it is drawn after moves 0..18 (ZzzEffect.cpp:3384-3395). */
const DART_MOVES = 19;
/** `Direction (0, -26, 0)`: each homing step. */
const DART_STEP = cm(26);
/** `to->BoundingBoxMax[2]`: 120 cm on a player (ZzzCharacter.cpp:11798); a monster's from its model's bounds. */
function targetTop(e: Entity): number {
  const m = e.modelObject;
  if (e.charAppearance || !m?.gltf || !e.transform) return cm(120);
  m.UpdateBoundings();
  const top = m.BoundingBoxLocal.maximumWorld.y - e.transform.pos.y;
  return top > 0.3 ? top : cm(120);
}

/**
 * One BITMAP_FIRE+1 sub0 off a ghost (ZzzEffectParticle.cpp:571-576, :4769-4777): Fire02 at Scale 0.8
 * growing by an accumulating 0.02, rising Gravity x 20 cm, streaming along the dart's heading at
 * 9.6-11.7 cm a tick x1.05, Light LT x 0.2 (clamped at 1), LT 12.
 */
function pierFire(c: SkillContext, at: Vector3, dir: Vector3, look?: PierLook): void {
  const v0 = cm((randInt(8) + 32) * 0.3);
  const t0 = fxNow();
  effects.spawn('sprite', c.scene, at, {
    texture: TEX.fire2,
    colour: look?.puff,
    size: cm(64) * (look?.puffSize ?? 1),
    seconds: ticks(11),
    roll: Math.random() * Math.PI * 2,
    follow: out => {
      const n = movesAt(fxNow() - t0);
      const d = (v0 * (Math.pow(1.05, n) - 1)) / 0.05;
      return out.set(at.x + dir.x * d, at.y + dir.y * d + cm(0.2 * n * (n + 1)), at.z + dir.z * d);
    },
    sizeAt: p => {
      const n = movesAt(p * ticks(11));
      return 0.8 + 0.01 * n * (n + 1);
    },
    // Light 0.2 x LT clamps at 1 until LT 5: a linear fade over the last 5 of its 11 drawn ticks.
    fadeTail: 5 / 11,
  });
}

/**
 * One MODEL_PIER_PART sub0 dart (MoveHandlers.cpp:5598-5640): per tick `Gravity - 1` steps, each a 50%
 * -20° pitch kick, MoveHumming toward the aim by up to `Velocity` degrees, 26 cm along the new heading,
 * and a sub1 ghost left there. Drawn at its tick positions, alpha-tested, only its steel spike.
 *
 * The ghosts (ZzzEffect.cpp:3397-3405, MoveHandlers.cpp:5664-5670) are the flame frame alone at Scale 0.5,
 * `Alpha = (20 - LT) / 5` so the first ticks' ones are cut away, x1/1.3 a tick over the dart's last ticks,
 * dying with it; each emits one Fire02 puff. They are stamps of one trail per dart (controllers/fx/stamps.ts).
 */
function pierDart(c: SkillContext, target: Entity, from: Vector3, yaw: number, aimHeight: number, look?: PierLook): Vector3 {
  const pos = from.clone();
  const aim = entityPos(target, aimHeight, new Vector3());
  const dir = new Vector3();
  const step = new Vector3();
  const heading: [number, number, number] = [0, 0, yaw];
  let velocity = 10;
  let gravity = 2;
  const dart = effects.spawn('model', c.scene, from, {
    model: MODEL.pierPart,
    seconds: ticks(DART_MOVES),
    scale: 1.2,
    hideMesh: 1,
    cutout: true,
    angle: heading,
    follow: out => out.copyFrom(pos),
    fadeTail: 0,
  }) as ModelHandle;
  const ghosts = effects.spawn('stamps', c.scene, from, {
    model: MODEL.pierPart,
    mesh: 1,
    scale: 0.5,
    seconds: ticks(DART_MOVES),
    intensity: t => Math.pow(1.3, -Math.max(0, t / TICK - 15)),
  }) as StampsHandle;
  let k = 0;
  const move = (): void => {
    const lifeTime = 20 - k;
    if (!entityGone(target)) entityPos(target, aimHeight, aim);
    for (let i = 1; i < gravity; i++) {
      if (Math.random() < 0.5) heading[0] += heading[0] < -90 ? 20 : -20;
      hummingDir(heading, pos, aim, velocity, dir);
      velocity += 0.4;
      if (lifeTime < 10) velocity += 0.1;
      pos.addInPlace(dir.scaleToRef(DART_STEP, step));
      pierFire(c, pos.clone(), dir.clone(), look);
      ghosts.add(pos, heading, Math.min(1, k / 5));
    }
    gravity = Math.fround(gravity + 0.1);
    dart.setAngle(heading);
    if (look) effects.spawn('particles', c.scene, pos, { recipe: DART_EMBERS, count: k === DART_MOVES - 1 ? 6 : 1 });
    if (++k < DART_MOVES) delay(TICK, move);
  };
  if (look) {
    effects.spawn('sprite', c.scene, from, { texture: TEX.flare, colour: look.head, size: 0.55, seconds: ticks(DART_MOVES), follow: out => out.copyFrom(pos), fadeTail: 0.2 });
  }
  move();
  return pos;
}

/**
 * Fire Burst at the strike (ZzzCharacter.cpp:5064-5085): 3 homing darts from bone 0 + (40, 0, 10) at
 * yaw +90 / 0 / -90, the first aimed at the target's BoundingBoxMax z and the others at half of it, plus
 * 2 MODEL_DARKLORD_SKILL cards there, Light (1, 0.6, 0.3), Scale 0.2, LT 10, turned (45, ±45, 0) in the
 * world (ZzzEffect.cpp:3449-3470). Nothing lands on the target.
 */
const fireBurst: Step = (_at, c) => {
  const target = c.target!;
  const o = boneLocalPos(c.caster, 0, FIRE_BURST_LOCAL, new Vector3(), 1);
  const yaw = yawDegrees(c);
  const top = targetTop(target);
  pierDart(c, target, o, yaw + 90, top);
  pierDart(c, target, o, yaw, top / 2);
  pierDart(c, target, o, yaw - 90, top / 2);
  for (const tilt of [45, -45]) {
    effects.spawn('model', c.scene, o, { model: MODEL.darkLordSkill, seconds: ticks(9), scale: 0.2, colour: [1, 0.6, 0.3], angle: [45, tilt, 0], fadeTail: 0 });
  }
};

/** Fire Burst on the graded tiers: puffs, head glow and embers (`pierDart`). */
interface PierLook {
  /** The Fire02 puffs' tint and size factor. */
  puff: RGB;
  puffSize: number;
  /** A flare riding each dart's head. */
  head: RGB;
}
/**
 * The puffs keep the original's Fire02 but lean orange and a little smaller: ~48 additive puffs a dart at
 * white summed to a flat yellow-white fog over the target on the graded frame.
 */
const PIER_LOOK: PierLook = { puff: [1, 0.62, 0.34], puffSize: 0.85, head: [1, 0.7, 0.4] };
/** Hot chips shed by a dart each tick, and a handful where it burns out. */
const DART_EMBERS: ParticleRecipe = {
  texture: TEX.spark3,
  colour: RGBS.fire,
  colourEnd: RGBS.ember,
  size: 0.09,
  sizeJitter: 0.4,
  life: 0.4,
  lifeJitter: 0.3,
  power: 1.4,
  gravity: -2.5,
  spin: 4,
  capacity: 256,
};
const fireBurstGraded = (skill: number): Step => (_at, c) => {
  const target = c.target!;
  const o = boneLocalPos(c.caster, 0, FIRE_BURST_LOCAL, new Vector3(), 1);
  const yaw = yawDegrees(c);
  const top = targetTop(target);
  const darts = [
    pierDart(c, target, o, yaw + 90, top, PIER_LOOK),
    pierDart(c, target, o, yaw, top / 2, PIER_LOOK),
    pierDart(c, target, o, yaw - 90, top / 2, PIER_LOOK),
  ];
  for (const tilt of [45, -45]) {
    effects.spawn('model', c.scene, o, { model: MODEL.darkLordSkill, seconds: ticks(9), scale: 0.2, colour: [1, 0.6, 0.3], angle: [45, tilt, 0], fadeTail: 0 });
  }
  effects.spawn('sprite', c.scene, o, { texture: TEX.impact, colour: [1, 0.6, 0.3], size: 1.2, seconds: ticks(5), growFrom: 0.5, fadeTail: 0.7 });
  effects.spawn('particles', c.scene, o, { recipe: DART_EMBERS, count: 10 });
  // One light carried by the three darts: it starts on the cards at the caster and whirls in with them.
  const centre = { x: o.x, y: o.y, z: o.z };
  lighting.skillStrike(c.scene, skill, {
    position: centre,
    follow: out => {
      out.x = (darts[0].x + darts[1].x + darts[2].x) / 3;
      out.y = (darts[0].y + darts[1].y + darts[2].y) / 3;
      out.z = (darts[0].z + darts[1].z + darts[2].z) / 3;
    },
  });
};

export default defineSkill({
  id: 61,
  name: "Fire Burst",
  // 61 Fire Burst (and 508 / 514): at the strike key, three homing darts with their ghost trails and two
  // starburst cards at the caster; eFirebustBoom from the darts.
  visual: { impact: strikeKey(fireBurst, 'Sound/eFirebustBoom'), enhanced: { impact: litStrike(fireBurstGraded, 'Sound/eFirebustBoom') } },
  sound: 'Sound/eFirebust', // Fire Burst
  clip: { ground: A.PLAYER_ATTACK_STRIKE, ...MOUNTED_STRIKE }, // Fire Burst
  // Fire Burst: the original lights nothing (no AddTerrainLight on PIER_PART / DARKLORD_SKILL). Enhanced:
  // the three darts carry one fire light between them for their 19 ticks and their puffs' last 6, reaching ~1.5 tiles.
  light: { enhanced: { strike: effectLight([1, 0.55, 0.2], 1.5, 1, { release: 0.25, floorGain: 0.6 }) } },
});
