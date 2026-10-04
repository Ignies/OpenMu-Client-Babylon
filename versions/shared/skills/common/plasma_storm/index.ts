import { defineSkill } from '@/controllers/skills/define';
import { ARC_MOTES, TEX } from '@/controllers/fx/recipes';
import { DEG, FX_FLICKER, dropOldest, lightHere, randInt, rideLightFor, writePath } from '../../_shared';
import { type Entity } from '@/ecs/world';
import { type LightRecipe } from '@/controllers/lighting/lightSource';
import { MonsterActionType, PlayerAction } from '@versions/shared/objects/enum';
import type { PoseClip } from '@/controllers/combat';
import { BaseClass } from '@/modules/hero/characterStats';
import { delay, entityGone, entityPos, entityYaw, followEntity, scaleRGB, type ParticleRecipe, type RGB } from '@/controllers/fx/core';
import { SkillContext, Step, TICK, afterRelease, cm, forwardOf, ticks } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { createAngleDeg, turnAngle } from '@/core/turnAngle';
import { effectLight } from '@/controllers/lighting/recipes';
import { effects } from '@/controllers/fx';
import { fenrirVariant } from '@/controllers/pets';
import { playCombat } from '@/controllers/sound/combat';
import { Ecs } from '@/ecs/current';

// Plasma Storm (76).

/** GetSkillDistance(AT_SKILL_PLASMA_STORM_FENRIR), and the ten-body cap. */
const PLASMA_REACH = 6;
const PLASMA_TARGETS = 10;
/** MODEL_FENRIR_SKILL_THUNDER: MaxTails 50 (49 kept), 50 cm steps, MoveHumming 50 degrees, done within 75 cm (ZzzEffectJoint.cpp:1023-1030, :4624-4669). */
const BOLT_TAILS = 49;
const BOLT_STEP = cm(50);
const BOLT_TURN = 50 * DEG;
const BOLT_CLOSE = cm(75);
/** BITMAP_FLARE_FORCE subs 11-13: MaxTails 30, so 29 tails (ZzzEffectJoint.cpp:2496-2545, :2863-2866). */
const COIL_TAILS = 29;
/** RenderJoints skips a tail quad longer than 60 cm (ZzzEffectJoint.cpp:7071). */
const JOINT_MAX_SEGMENT = cm(60);
/** GetFenrirType (ZzzCharacter.cpp:179-189). */
const FENRIR_TYPE = { black: 0, red: 1, blue: 2, gold: 3 } as const;
/** MODEL_FENRIR_SKILL_THUNDER subs 0-3 (JOINT_THUNDER) and 4-7 (BITMAP_FLASH) (ZzzEffectJoint.cpp:1031-1067). */
const FENRIR_BOLTS: readonly { texture: string; colour: RGB }[] = [
  { texture: TEX.jointThunder, colour: [0.7, 1, 0.7] },
  { texture: TEX.jointThunder, colour: [1, 0.6, 0.6] },
  { texture: TEX.jointThunder, colour: [0.7, 0.7, 1] },
  { texture: TEX.jointThunder, colour: [0.9, 0.9, 0.3] },
  { texture: TEX.flash, colour: [0.1, 0.8, 0.1] },
  { texture: TEX.flash, colour: [1, 0.3, 0.2] },
  { texture: TEX.flash, colour: [0.2, 0.3, 1] },
  { texture: TEX.flash, colour: [0.8, 0.8, 0.1] },
];
/** BITMAP_FLARE_FORCE subs 11-13's Light; gold's 14 matches no branch and draws nothing (ZzzEffectJoint.cpp:2519-2531). */
const FENRIR_COILS: readonly (RGB | null)[] = [[0.7, 1, 0.7], [1, 0.6, 0.6], [0.7, 0.7, 1], null];

/**
 * One MODEL_FENRIR_SKILL_THUNDER (ZzzEffectJoint.cpp:4624-4669): every tick it steps up to 50 times - home on the
 * target + 80 cm by up to 50 degrees, lay a tail, stop within 75 cm, else advance 50 cm along the heading bent by
 * +/-512 / width degrees. The whole path is laid on its first tick and stays; the U runs one sheet per 8 tails,
 * scrolling 2 sheets a second, at a constant colour for LT 20 (:7077-7116).
 */
function fenrirBolt(c: SkillContext, start: Vector3, target: Entity, sub: number, widthCm: number, pitch0: number, yaw0: number, gain = 1): void {
  const look = FENRIR_BOLTS[sub];
  const pos = start.clone();
  const aim = entityPos(target, cm(80), new Vector3());
  const pts: number[] = [];
  let pitch = pitch0;
  let yaw = yaw0;
  effects.spawn('joint', c.scene, start, {
    polyline: buf => {
      for (let j = 0; j < BOLT_TAILS + 1; j++) {
        if (!entityGone(target)) entityPos(target, cm(80), aim);
        const flat = Math.hypot(aim.x - pos.x, aim.z - pos.z);
        yaw = turnAngle(yaw, createAngleDeg(pos.x, pos.z, aim.x, aim.z) * DEG, BOLT_TURN);
        pitch = turnAngle(pitch, (360 - createAngleDeg(pos.y, flat, aim.y, 0)) * DEG, BOLT_TURN);
        const dist = Math.hypot(flat, aim.y - pos.y);
        const p = pitch + ((randInt(1024) - 512) / widthCm) * DEG;
        const y = yaw + ((randInt(1024) - 512) / widthCm) * DEG;
        pts.push(pos.x, pos.y, pos.z);
        if (pts.length > BOLT_TAILS * 3) dropOldest(pts);
        if (dist < BOLT_CLOSE) break;
        pos.x += Math.cos(p) * Math.sin(y) * BOLT_STEP;
        pos.y -= Math.sin(p) * BOLT_STEP;
        pos.z -= Math.cos(p) * Math.cos(y) * BOLT_STEP;
      }
      return writePath(pts, buf);
    },
    maxTails: BOLT_TAILS - 1,
    width: cm(widthCm),
    colour: gain === 1 ? look.colour : scaleRGB(look.colour, gain),
    texture: look.texture,
    textureRepeats: (BOLT_TAILS - 1) / 8,
    textureScroll: 2,
    seconds: ticks(21),
    fadeTail: 0,
    maxSegment: JOINT_MAX_SEGMENT,
  });
}

/**
 * One BITMAP_FLARE_FORCE sub 11-13 (ZzzEffectJoint.cpp:2496-2545, :6612-6670): 2.8 m over the rider, 0.1 m ahead to
 * 0.29 m behind; after a 2-4 tick wait it lays 0, 2, 4 ... tails a tick up to 29. Each step drifts the centre
 * along its random heading (Velocity -3, then 2 more a step) and puts the point on a loop about it (sweep -180,
 * then -20 a step, radius 80 cm, 2.5 less a step) in the plane of that heading's yaw: a corkscrew. One sheet per
 * 14 tails scrolling 1 a second, Light / 1.3 a tick over its last 10.
 */
function fenrirCoil(c: SkillContext, colour: RGB): void {
  const f = forwardOf(entityYaw(c.caster));
  const back = cm(10 + randInt(40) - 20);
  const centre = entityPos(c.caster, cm(130 + 150), new Vector3());
  centre.x -= f.x * back;
  centre.z -= f.z * back;
  // The first tail: AngleMatrix(80, -180, 0) on (0, 0, 80) is 79 cm to -y and 14 cm down.
  const head = new Vector3(centre.x, centre.y - cm(13.9), centre.z - cm(78.8));
  const pitch = randInt(360) * DEG;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const yaw = randInt(360) * DEG;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const wait = 2 + randInt(3);
  const pts: number[] = [];
  let left = wait;
  let steps = 1;
  let v = -3;
  let sweep = -180 * DEG;
  let r = 80;
  const life = 21 + wait;
  effects.spawn('joint', c.scene, centre, {
    polyline: buf => {
      if (pts.length / 3 < COIL_TAILS) {
        if (left > 0) left--;
        else {
          for (let i = 1; i < steps; i++) {
            pts.push(head.x, head.y, head.z);
            if (pts.length > COIL_TAILS * 3) dropOldest(pts);
            centre.x -= cm(v * cp * sy);
            centre.y += cm(v * sp);
            centre.z += cm(v * cp * cy);
            sweep -= 20 * DEG;
            const s = Math.sin(sweep);
            head.set(centre.x + cm(s * cy * r), centre.y + cm(Math.cos(sweep) * r), centre.z + cm(s * sy * r));
            v -= 2;
            r -= 2.5;
          }
          steps += 2;
        }
      }
      return writePath(pts, buf);
    },
    maxTails: COIL_TAILS - 1,
    width: cm(60),
    colour,
    texture: TEX.jointThunder,
    textureRepeats: (COIL_TAILS - 1) / 14,
    textureScroll: 1,
    seconds: ticks(life),
    // Light / 1.3 a tick over the last 10.
    intensity: t => Math.pow(1 / 1.3, Math.max(0, t / TICK - (life - 10))),
    maxSegment: JOINT_MAX_SEGMENT,
  });
}

/**
 * Who the bolts go to: every live KIND_MONSTER within 6 tiles (summons are KIND_PLAYER, so not them), and players
 * only while this client holds Left Ctrl, ten at most (ZzzCharacter.cpp:4610-4643).
 */
function plasmaTargets(caster: Entity): Entity[] {
  const world = Ecs.world;
  if (!world || !caster.transform) return [];
  let ctrl = false;
  try {
    ctrl = world.keyboardInput.pressedKeys.has('ControlLeft');
  } catch {
    ctrl = false;
  }
  const { x, z } = caster.transform.pos;
  const out: Entity[] = [];
  for (const e of world.netObjsQuery.entities) {
    if (e === caster || !e.transform || e.dying || e.objOutOfScope) continue;
    const type = e.npcType;
    // The NPC and trap ranges of attackSystem's isNpcOrTrapType.
    const monster =
      type !== undefined && !e.summonedBy && !(type > 200 && type < 260) && !(type >= 100 && type <= 110) && e.monsterAnimation?.action !== MonsterActionType.Die;
    const player = ctrl && type === undefined && !e.localPlayer;
    if (!monster && !player) continue;
    if (Math.hypot(e.transform.pos.x - x, e.transform.pos.z - z) > PLASMA_REACH) continue;
    out.push(e);
    if (out.length >= PLASMA_TARGETS) break;
  }
  return out;
}

/**
 * Plasma Storm at the release (AttackTime 15 from the 0x1E, WSclient.cpp:5565, or the clip's key 5):
 * SOUND_FENRIR_SKILL, then from 1.4 m ahead and 1.3 m up two pairs back
 * into the caster itself (sub T + sub 3+T, the original's 3+T giving the next variant's second colour), two pairs
 * (sub T + sub 4+T) into each body in reach, and six coils over the rider. The cast point is not used.
 */
const plasmaStormFor = (graded: boolean): Step => afterRelease((_at, c) => {
  const caster = c.caster;
  if (entityGone(caster)) return;
  playCombat('Sound/pWskill', caster.transform!.pos);
  const type = FENRIR_TYPE[fenrirVariant(caster.charAppearance?.pet)];
  const gain = graded ? PLASMA_BOLT_GAIN : 1;
  const pair = (target: Entity, second: number): void => {
    const start = entityPos(caster, cm(130), new Vector3());
    const f = forwardOf(entityYaw(caster));
    start.x += f.x * cm(140);
    start.z += f.z * cm(140);
    const pitch = randInt(360) * DEG;
    const yaw = randInt(360) * DEG;
    fenrirBolt(c, start, target, type, 100, pitch, yaw, gain);
    fenrirBolt(c, start, target, second, 80, pitch, yaw, gain);
  };
  for (let j = 0; j < 2; j++) pair(caster, 3 + type);
  const targets = plasmaTargets(caster);
  for (const target of targets) for (let j = 0; j < 2; j++) pair(target, 4 + type);
  const coil = FENRIR_COILS[type];
  if (coil) for (let k = 0; k < 6; k++) fenrirCoil(c, coil);
  if (graded) plasmaGrace(c, type, targets, coil);
});
const plasmaStorm = plasmaStormFor(false);
const plasmaStormGraded = plasmaStormFor(true);

// Plasma Storm on Enhanced and Ultra: the same bolts and coils, a touch under the clip where ribbons cross, a
// flash where they leave the rider and where they strike, sparks, and the thunder's light on each.

/** The bolts' colour on the graded tiers: overlapping pale-green thunder clipped to white at 1. */
const PLASMA_BOLT_GAIN = 0.8;
/** Per Fenrir variant (black, red, blue, gold), from its JOINT_THUNDER tint. */
const PLASMA_SPARKS: readonly ParticleRecipe[] = FENRIR_BOLTS.slice(0, 4).map(b => ({ ...ARC_MOTES, colour: b.colour, size: 0.14, power: 3.5, life: 0.45, capacity: 128 }));
/** The strike: its flash is 1.3 tiles across, lit for the rest of the bolts' life with the thunder's flicker. */
const PLASMA_HIT_LIGHTS: readonly LightRecipe[] = FENRIR_BOLTS.slice(0, 4).map(b => effectLight(b.colour, 1, ticks(18), { release: ticks(6), flicker: FX_FLICKER }));
/** Where the bolts leave, 1.4 m ahead of the rider, and the rider under them. */
const PLASMA_ORIGIN_LIGHTS: readonly LightRecipe[] = FENRIR_BOLTS.slice(0, 4).map(b => effectLight(b.colour, 1.2, ticks(21), { release: ticks(6), flicker: FX_FLICKER }));

function plasmaGrace(c: SkillContext, type: number, targets: readonly Entity[], coil: RGB | null): void {
  const caster = c.caster;
  const tint = FENRIR_BOLTS[type].colour;
  // flare01 is blue-white: the pale thunder tints read lavender on it, so its cards take the saturated BITMAP_FLASH tint.
  const card = FENRIR_BOLTS[4 + type].colour;
  const origin = entityPos(caster, cm(130), new Vector3());
  const f = forwardOf(entityYaw(caster));
  origin.x += f.x * cm(140);
  origin.z += f.z * cm(140);
  effects.spawn('sprite', c.scene, origin, { texture: TEX.flare, colour: scaleRGB(card, 0.6), size: 1.4, growFrom: 0.4, seconds: ticks(8), fadeTail: 0.6 });
  effects.spawn('particles', c.scene, origin, { recipe: PLASMA_SPARKS[type], count: 12 });
  lightHere(PLASMA_ORIGIN_LIGHTS[type])(origin, c);
  // The bolts reach the bodies about three ticks after they leave the rider.
  delay(ticks(3), () => {
    for (const target of targets) {
      if (entityGone(target)) continue;
      const chest = followEntity(target, cm(80));
      const at = chest(new Vector3());
      effects.spawn('sprite', c.scene, at, { texture: TEX.flare, colour: scaleRGB(card, 0.5), size: 1.3, seconds: ticks(18), fadeTail: 0.5, follow: chest });
      effects.spawn('sprite', c.scene, at, { texture: TEX.thunder, colour: tint, size: 1.2, spin: 8, seconds: ticks(8), fadeTail: 0.5, follow: chest });
      effects.spawn('particles', c.scene, at, { recipe: PLASMA_SPARKS[type], count: 12 });
      rideLightFor(c, PLASMA_HIT_LIGHTS[type], chest);
    }
  });
  // The coils' corkscrews spread about 1.2 tiles over the rider's head.
  if (coil) rideLightFor(c, effectLight(coil, 1.2, ticks(24), { release: ticks(10) }), followEntity(caster, cm(280)));
}

/**
 * SetAction_Fenrir_Skill (ZzzAI.cpp:257-281), Plasma Storm's clip on every client: by which hands hold
 * something (`Weapon[0]` is `leftHand` here, as in chooseAttackAction), the Rage Fighter with his own four.
 */
const fenrirSkillClip: PoseClip = pose => {
  const first = !!pose.hands?.leftHand;
  const second = !!pose.hands?.rightHand;
  const rage = pose.baseClass === BaseClass.RageFighter;
  if (first && second) return rage ? PlayerAction.PLAYER_RAGE_FENRIR_TWO_SWORD : PlayerAction.PLAYER_FENRIR_SKILL_TWO_SWORD;
  if (first) return rage ? PlayerAction.PLAYER_RAGE_FENRIR_ONE_RIGHT : PlayerAction.PLAYER_FENRIR_SKILL_ONE_RIGHT;
  if (second) return rage ? PlayerAction.PLAYER_RAGE_FENRIR_ONE_LEFT : PlayerAction.PLAYER_FENRIR_SKILL_ONE_LEFT;
  return rage ? PlayerAction.PLAYER_RAGE_FENRIR : PlayerAction.PLAYER_FENRIR_SKILL;
};

export default defineSkill({
  id: 76,
  name: "Plasma Storm",
  // The clip goes by the hands, and SetAction_Fenrir_Skill leaves SwordCount alone.
  poseClip: fenrirSkillClip,
  swordCount: false,
  // 76 Plasma Storm (Fenrir): 14 ticks after the 0x1E, homing JOINT_THUNDER / FLASH pairs back into the rider and
  // into every monster within 6 tiles, and six thunder coils over him, coloured by the Fenrir (plasmaStorm).
  // Enhanced: the bolts a touch under the clip, flashes, sparks and the thunder's light at both ends.
  visual: { area: plasmaStorm, impact: plasmaStorm, enhanced: { area: plasmaStormGraded, impact: plasmaStormGraded } },
  delayMs: 1500, // Plasma Storm
});
