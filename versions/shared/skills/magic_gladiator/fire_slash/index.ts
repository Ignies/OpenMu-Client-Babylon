import { defineSkill } from '@/controllers/skills/define';
import { CAST_HEIGHT, SkillContext, Step, after, cm, currentSkill, forwardOf, ticks } from '@/controllers/skills/visuals';
import { DEG, WEAPON_LINK_BONE, randInt, whenClipKey } from '../../_shared';
import { MG_EMBERS, mgGlint, mgSay, mgTurn } from '../_shared';
import { PlayerAction } from '@versions/shared/objects/enum';
import { boneLocalPos, emitBurst, entityGone, entityPos, entityYaw, type RGB } from '@/controllers/fx/core';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { type StripOptions, type TailStrip, type TickedFx } from '@/controllers/fx/ticked';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { playCombat } from '@/controllers/sound/combat';

import { A } from '@/controllers/combat/recipes';

import { SkillLight } from '@/controllers/lighting/skills';
import { effectLight } from '@/controllers/lighting/recipes';

// ---- mg steps --------------------------------------------------------------------

/** RENDER_FACE both, the joint's `Light` white: `CreateJoint`'s defaults (ZzzEffectJoint.cpp:80-108). */
const MG_THUNDER: StripOptions = { texture: TEX.jointThunder, colour: [0.5, 0.5, 1], maxTails: 10, uScale: 2, uScroll: true, batch: 24 };
/** JOINT_FORCE sub0 draws only its flat face, `(MaxTails - j) / MaxTails * 2` bright (:7115-7129); sub10 is the generic two-face joint. */
const MG_FORCE: StripOptions = { texture: TEX.jointForce, maxTails: 18, faces: 'flat', gain: j => ((18 - j) / 18) * 2 };
const MG_FORCE_STR: StripOptions = { texture: TEX.jointForce, maxTails: 18 };
/** Fire01 is four 64 px cells in a row; sub0 draws `Width * 0.25` (ZzzEffectParticle.cpp:9161). */
const MG_FIRE_CELLS = { w: 64, h: 64, count: 4 };

// The graded tiers' extras (row.enhanced): the same elements, with glow, embers and sparks the original never drew.
/** The gathering's crackles are JointThunder01 at (0.5, 0.5, 1): its glow at the hand is that violet-blue. */
const MG_GATHER_GLOW: RGB = [0.45, 0.4, 1];

/**
 * A JOINT_THUNDER sub3 crackle (ZzzEffectJoint.cpp:1123-1130, :4738-5018): `MaxTails` steps a tick of `Velocity`
 * 10 cm, each homing up to 50 deg on the target (MoveHumming) and laid through a matrix jittered +-512 / Scale deg;
 * it dies once 150 cm off.
 */
interface MgCrackle {
  strip: TailStrip;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  tx: number;
  ty: number;
  tz: number;
  half: number;
  jitter: number;
  lt: number;
}
function mgCrackle(fx: TickedFx, from: Vector3, to: Vector3, yaw: number, pitch: number, scaleCm: number, lt: number): MgCrackle {
  return { strip: fx.strip(MG_THUNDER), x: from.x, y: from.y, z: from.z, yaw, pitch, tx: to.x, ty: to.y, tz: to.z, half: cm(scaleCm) / 2, jitter: (512 / scaleCm) * DEG, lt };
}
/** One tick of a crackle; false once it is spent. */
function mgCrackleTick(k: MgCrackle): boolean {
  let dist = 0;
  for (let j = 0; j < 10; j++) {
    const dx = k.tx - k.x;
    const dy = k.ty - k.y;
    const dz = k.tz - k.z;
    const flat = Math.hypot(dx, dz);
    dist = Math.hypot(flat, dy);
    k.yaw = mgTurn(k.yaw, Math.atan2(dx, -dz), 50 * DEG);
    k.pitch = mgTurn(k.pitch, -Math.atan2(dy, flat), 50 * DEG);
    const yaw = k.yaw + (Math.random() * 2 - 1) * k.jitter;
    const pitch = k.pitch + (Math.random() * 2 - 1) * k.jitter;
    k.strip.push(k.x, k.y, k.z, k.half, yaw, pitch);
    const cp = Math.cos(pitch);
    k.x += cp * Math.sin(yaw) * cm(10);
    k.y -= Math.sin(pitch) * cm(10);
    k.z -= cp * Math.cos(yaw) * cm(10);
  }
  if (dist > cm(150)) k.lt = 0;
  return --k.lt >= 0;
}
/** Step every crackle, dropping the spent ones. */
function mgCracklesTick(fx: TickedFx, list: MgCrackle[]): void {
  for (let i = list.length - 1; i >= 0; i--) {
    if (mgCrackleTick(list[i])) continue;
    fx.drop(list[i].strip);
    list[i] = list[list.length - 1];
    list.pop();
  }
}

/** A moving one-tick card with its own life: BITMAP_FIRE sub0 and BITMAP_SPARK+1 sub2. */
interface MgBit {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  scale: number;
  grav: number;
  lt: number;
  light: number;
}

/**
 * BITMAP_FIRE sub0 (ZzzEffectParticle.cpp:387-398, :4544-4551, :9161): LT 24, 3.2-4.7 cm a tick along the joint's
 * heading, Scale 1.28-1.91 shrinking 0.04 a tick, a rise of `Gravity * 10` with Gravity +0.004 a tick, frame
 * `(23 - LT) / 6`, upright, in the joint's `Light` at birth and never faded.
 */
function mgFire(x: number, y: number, z: number, heading: number, light: number): MgBit {
  const f = forwardOf(heading);
  const v = cm((32 + randInt(16)) * 0.1);
  return { x, y, z, vx: f.x * v, vy: 0, vz: f.z * v, scale: (128 + randInt(64)) * 0.01, grav: 0, lt: 24, light };
}
function mgFiresTick(fx: TickedFx, list: MgBit[]): void {
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i];
    if (--b.lt <= 0) {
      list[i] = list[list.length - 1];
      list.pop();
      continue;
    }
    b.x += b.vx;
    b.z += b.vz;
    b.grav += 0.004;
    b.scale -= 0.04;
    b.y += cm(b.grav * 10);
    const size = cm(64) * b.scale;
    fx.sprite(TEX.fire, RGBS.white, b.x, b.y, b.z, size, size, 0, b.light, MG_FIRE_CELLS, Math.floor((23 - b.lt) / 6));
  }
}

/**
 * BITMAP_GATHERING sub1 (ZzzEffect.cpp:1294-1318, MoveHandlers.cpp:1603-1669): 20 ticks at the weapon link bone, 10 cm
 * up its own axis. Each tick three points on a 120 cm sphere round it: on even LT a JOINT_THUNDER sub3 crackle from the
 * point to the hand (width 10, LT 10), on odd LT a BITMAP_SPARK+1 sub2 chip thrown at it; and every time a Shiny02
 * card on the hand, Scale 1.6-3.0, rolled at random. `glow` (graded tiers) adds a violet glow swelling at the hand.
 */
const mgGathering = (glow = false): Step => (_at, c) => {
  let lt = 20;
  const local = new Vector3(0, 0, cm(10));
  const hand = new Vector3();
  const p = new Vector3();
  const crackles: MgCrackle[] = [];
  const sparks: MgBit[] = [];
  effects.spawn('ticked', c.scene, hand, {
    tick(fx) {
      if (lt > 0 && entityGone(c.caster)) lt = 0;
      if (lt > 0) {
        boneLocalPos(c.caster, WEAPON_LINK_BONE, local, hand, CAST_HEIGHT);
        for (let j = 0; j < 3; j++) {
          // Rotate (0, 120, 0) by Angle(rand, 0, rand): the far side of that heading.
          const pitch = randInt(360) * DEG;
          const yaw = randInt(360) * DEG;
          const cp = Math.cos(pitch);
          p.set(hand.x - cp * Math.sin(yaw) * 1.2, hand.y + Math.sin(pitch) * 1.2, hand.z + cp * Math.cos(yaw) * 1.2);
          if (lt % 2 === 0) {
            crackles.push(mgCrackle(fx, p, hand, yaw, pitch, 10, 10));
          } else {
            // SPARK+1 sub2 (ZzzEffectParticle.cpp:2121-2133): thrown to cover the distance in 10 of its 15 ticks.
            sparks.push({ x: p.x, y: p.y, z: p.z, vx: (hand.x - p.x) / 10, vy: (hand.y - p.y) / 10, vz: (hand.z - p.z) / 10, scale: (10 + randInt(50)) / 100, grav: 0, lt: 15, light: 1 });
          }
          const s = (8 + randInt(8)) * 0.2;
          fx.sprite(TEX.shiny2, RGBS.white, hand.x, hand.y, hand.z, cm(32) * s, cm(64) * s, Math.random() * Math.PI * 2);
        }
        if (glow) {
          const grow = (21 - lt) / 20;
          fx.sprite(TEX.flare, MG_GATHER_GLOW, hand.x, hand.y, hand.z, 0.7 + grow * 0.6, 0.7 + grow * 0.6, lt * 0.3, 0.35 + grow * 0.4);
        }
        lt--;
      }
      mgCracklesTick(fx, crackles);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const b = sparks[i];
        if (--b.lt <= 0) {
          sparks[i] = sparks[sparks.length - 1];
          sparks.pop();
          continue;
        }
        // The gathering gone, a chip has five ticks left at most.
        if (lt <= 0 && b.lt > 5) b.lt = 5;
        b.x += b.vx;
        b.y += b.vy;
        b.z += b.vz;
        b.scale += 0.05;
        const size = cm(32) * b.scale;
        fx.sprite(TEX.spark3, RGBS.white, b.x, b.y, b.z, size, size, 0, Math.min(1, b.lt / 5));
      }
      return lt > 0 || crackles.length > 0 || sparks.length > 0;
    },
  });
};

/**
 * Fire Slash's key (ZzzCharacter.cpp:2796-2815, ZzzEffect.cpp:2959-2964, MoveHandlers.cpp:4993-5014,
 * ZzzEffectJoint.cpp:2284-2302, :6244-6345): BITMAP_SWORD_FORCE at yaw + 45 lays a JOINT_FORCE crescent 100 cm up,
 * width 150, from yaw + 75. Eight samples a tick on a 145 cm radius, 11 deg apart, until 18 are down; the cross-section
 * stays on the local X of yaw + 75. Each sample: a 50 % BITMAP_FIRE and two JOINT_THUNDER sub3 crackles from the last
 * sample (widths 5-14 and 4-11, LT 5). Light `LT / 30`, then /1.5 a tick below LT 10. The strengthener's sub10 draws
 * both faces without the per-segment ramp. `enh` (graded tiers) adds a heat glow along the arc, embers off every
 * sample and the light the arc throws.
 */
function mgCrescent(c: SkillContext, strengthened: boolean, enh = false): void {
  const feet = entityPos(c.caster, 0, new Vector3());
  const centreY = feet.y + 1;
  const heading = entityYaw(c.caster) + 75 * DEG;
  const f0 = forwardOf(heading);
  // JOINT_FORCE's init pushes Position 180 cm out; the first crackles start there.
  const last = new Vector3(feet.x + f0.x * 1.8, centreY, feet.z + f0.z * 1.8);
  const next = new Vector3();
  let dir = heading;
  let lt = 20;
  let light = 1;
  let strip: TailStrip | null = null;
  const fires: MgBit[] = [];
  const crackles: MgCrackle[] = [];
  // Enhanced: the samples laid so far, for the heat glow; the light sits over the arc's middle (yaw - 18.5 deg).
  const laid = enh ? new Float32Array(18 * 3) : null;
  let nLaid = 0;
  if (enh) {
    const mid = forwardOf(heading - 93.5 * DEG);
    const lx = feet.x + mid.x * 0.6;
    const lz = feet.z + mid.z * 0.6;
    lighting.skillFollow(c.scene, 55, out => {
      out.x = lx;
      out.y = centreY;
      out.z = lz;
    });
  }
  effects.spawn('ticked', c.scene, feet, {
    tick(fx) {
      if (lt >= 0) {
        strip ??= fx.strip(strengthened ? MG_FORCE_STR : MG_FORCE);
        for (let j = 0; j < 8; j++) {
          if (strip.numTails >= 17) continue;
          const f = forwardOf(dir);
          next.set(feet.x + f.x * 1.45, centreY, feet.z + f.z * 1.45);
          strip.push(next.x, next.y, next.z, 0.75, heading, 0);
          dir -= 11 * DEG;
          if (Math.random() < 0.5) fires.push(mgFire(next.x, next.y, next.z, heading, light));
          crackles.push(mgCrackle(fx, last, next, heading, 0, 5 + randInt(10), 5));
          crackles.push(mgCrackle(fx, last, next, heading, 0, 4 + randInt(8), 5));
          last.copyFrom(next);
          if (laid && nLaid < 18) {
            laid[nLaid * 3] = next.x;
            laid[nLaid * 3 + 1] = next.y;
            laid[nLaid * 3 + 2] = next.z;
            nLaid++;
            emitBurst(c.scene, MG_EMBERS, next, 2);
          }
        }
        if (laid) {
          // Every third sample: a soft fire glow 0.8 tiles across, fading with the joint's light.
          const lum = Math.min(1, light * 0.5);
          for (let i = 1; i < nLaid; i += 3) fx.sprite(TEX.flare, RGBS.fire, laid[i * 3], laid[i * 3 + 1], laid[i * 3 + 2], 0.8, 0.8, i, lum);
        }
        light = lt < 10 ? light / 1.5 : lt / 30;
        strip.light = light;
        if (--lt < 0) {
          strip.light = 0;
          c.caster.modelObject?.ActionPlaySpeeds.delete(PlayerAction.PLAYER_ATTACK_SKILL_WHEEL);
        }
      }
      mgFiresTick(fx, fires);
      mgCracklesTick(fx, crackles);
      return lt >= 0 || fires.length > 0 || crackles.length > 0;
    },
  });
}

/**
 * Fire Slash (55, and 490 through MASTER_ALIASES): the WHEEL clip's charge and key (ZzzCharacter.cpp:2782-2817). Two
 * gatherings at AttackTime 1 and 2; at WHEEL frame 3 sKnightSkill3, the crescent, and the rest of the clip at
 * `0.54 + AttackSpeed * 0.004`. The skull and eBloodAttack come with the debuff (BUFF_VISUALS[58]).
 */
const mgFireSlash = (enh: boolean): Step => (at, c) => {
  const strengthened = currentSkill === 490;
  const m = c.caster.modelObject;
  m?.ActionPlaySpeeds.delete(PlayerAction.PLAYER_ATTACK_SKILL_WHEEL);
  mgGathering(enh)(at, c);
  after(ticks(1), mgGathering())(at, c);
  mgGlint(c);
  whenClipKey(PlayerAction.PLAYER_ATTACK_SKILL_WHEEL, 3, 15, (_p, cc) => {
    mgSay('Sound/sKnightSkill3');
    if (cc.caster.playerAnimation) {
      const speed = cc.caster.attributeSystem?.getValue('attackSpeed') ?? 0;
      cc.caster.modelObject?.setActionSpeed(PlayerAction.PLAYER_ATTACK_SKILL_WHEEL, 0.54 + speed * 0.004);
    }
    mgCrescent(cc, strengthened, enh);
  })(at, c);
};
const fireSlash = mgFireSlash(false);
const fireSlashEnhanced = mgFireSlash(true);

/** Fire Slash lights nothing in the original; this is its graded-tier light, shared with 490 (Fire Slash Strengthener). */
const FIRE_SLASH_LIGHT: SkillLight = {
  enhanced: { cast: effectLight([0.45, 0.4, 1], 1.2, 0.8, { release: 0.3 }), follow: effectLight([1, 0.55, 0.2], 2.2, 0.8, { release: 0.45 }) },
};

export default defineSkill({
  id: 55,
  name: "Fire Slash",
  // Master numbers cast, heard, lit and drawn as this skill (the original names them in its `case`).
  masterAliases: [490, 493],
  // 55 Fire Slash (MG): the WHEEL charge and crescent (fireSlash); the skull is the debuff's (BUFF_VISUALS[58]).
  visual: { cast: fireSlash, enhanced: { cast: fireSlashEnhanced } },
  buffs: {
    // 0x3A Defense reduction (Fire Slash): BITMAP_SKULL sub0, hidden under Cloaking (18), and eBloodAttack at the body as
    // the debuff lands (RegisterBuff -> InsertBuffPhysicalEffect, WSclient.cpp:15522-15529).
    58: e => {
    if (e.transform) playCombat('Sound/eBloodAttack', { x: e.transform.pos.x, z: e.transform.pos.z });
    return { skull: { hidden: () => !!e.buffs?.has(18), scale: () => Math.abs(e.modelObject?.node.scaling.x ?? 1) || 1 } };
  },
  },
  clip: { ground: A.PLAYER_ATTACK_SKILL_WHEEL }, // Fire Slash
  // Fire Slash lights nothing in the original (no AddTerrainLight on its gathering, sword force or joint).
  // Power Slash: MODEL_MAGIC2 AddTerrainLight (0.3, 0.6, 1) x Luminosity, range 3, under each of the five orbs
  // (MoveHandlers.cpp:3355-3356); Luminosity rolls 0.7-1.0 a tick and drops 0.2 a tick over the last four.
  // Enhanced: the gathering's violet at the hand (cast) and the crescent's fire over the arc, 145 cm + half its 150 cm width (follow).
  light: FIRE_SLASH_LIGHT,
});
