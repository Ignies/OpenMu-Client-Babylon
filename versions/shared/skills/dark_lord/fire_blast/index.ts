import { defineSkill } from '@/controllers/skills/define';
import { MODEL, TEX } from '@/controllers/fx/recipes';
import { delay, entityGone, entityPos, type RGB } from '@/controllers/fx/core';
import { SPLIT_EMBERS, forceHeads, forwardOfDeg, hummingDir, litStrike, movesAt, sideOf, yawDegrees } from '../_shared';
import { SkillContext, Step, TICK, cm, ticks } from '@/controllers/skills/visuals';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { groundAt } from '../../_shared';
import { lighting } from '@/controllers/lighting';

import { A } from '@/controllers/combat/recipes';
import { MOUNTED_STRIKE } from '../_shared';

/** Space Split's pillar, JOINT_FORCE sub2 (else branch, ZzzEffectJoint.cpp:2361-2369): V 8, Dir (5, _, 5), LT 15, MaxTails 12. */
const SPLIT_TAILS = 12;
const SPLIT_HEADS = forceHeads(8, 5, 5, 15, SPLIT_TAILS).map(cm);
/** It moves at LT 15..0 and dies below 0 (:6954-6957): 16 drawn ticks. */
const SPLIT_PILLAR_TICKS = 16;
/** MODEL_PIER_PART sub2 (ZzzEffect.cpp:3405-3415): LT 20, turn 50° +2.4 a tick, 40 cm a tick, from the feet - 20 cm. */
const SPLIT_MOVES = 20;
const SPLIT_STEP = cm(40);

/**
 * One Space Split pillar at `base` (the carrier's point + 10 cm), facing MU yaw `yaw`: Inferno.jpg on two
 * crossed sheets 150 cm wide, one tail laid a tick up to 12 (7.8 m), bright end at the base, x1/1.3 a tick
 * over its last 5 ticks (:6395-6411). On LT 15, 10, 5 and 0 a MODEL_SKILL_INFERNO sub6 at the base (:6417-6419):
 * only its ring4 mesh, Scale 0.2 +0.01, BlendMeshLight LT/5 x 0.1, LT 5, lighting (0.8, 0.3, 0.1) range 2
 * (ZzzEffect.cpp:1430-1439, MoveHandlers.cpp:2667-2673).
 */
function splitPillar(c: SkillContext, skill: number, base: Vector3, yaw: number, graded?: boolean): void {
  const points = SPLIT_HEADS.map(h => new Vector3(base.x, base.y + h, base.z));
  effects.spawn('tails', c.scene, base, {
    points,
    laid: t => movesAt(t),
    across: sideOf(yaw, new Vector3()),
    across2: forwardOfDeg(yaw, new Vector3()),
    width: cm(150),
    texture: TEX.inferno,
    colour: graded ? SPLIT_TINT : undefined,
    maxTails: SPLIT_TAILS,
    seconds: ticks(SPLIT_PILLAR_TICKS),
    intensity: t => Math.pow(1.3, -Math.max(0, Math.floor(movesAt(t)) - 11)),
  });
  for (let i = 0; i < 4; i++) {
    delay(ticks(5 * i), () => {
      // The fourth takes the joint's Light after its five x1/1.3 steps.
      const light = i === 3 ? Math.pow(1.3, -5) : 1;
      effects.spawn('model', c.scene, base, {
        model: MODEL.inferno,
        seconds: ticks(5),
        angle: [0, 0, yaw],
        hideMesh: 0,
        colour: [light, light, light],
        scaleAt: t => 0.2 + 0.01 * (t / TICK),
        intensity: t => Math.min(0.1, (6 - t / TICK) * 0.02),
        fadeTail: 0,
      });
      // The graded look carries one light along the path (spaceSplitGraded) in place of these 24.
      if (!graded) lighting.skillStrike(c.scene, skill, { position: { x: base.x, y: base.y, z: base.z } });
    });
  }
  if (graded) splitEruption(c, base);
}

/**
 * Space Split (Fire Blast) at the strike (ZzzCharacter.cpp:2980-2988, :5027-5030): one hidden MODEL_PIER_PART
 * sub2 carrier from the caster's feet - 20 cm, homing on the target's feet (MoveHandlers.cpp:5645-5664), a
 * pillar where it stands on every LT % 3 == 0 (LT 18..3: six, 3 ticks apart). Nothing lands on the target.
 */
const spaceSplit = (skill: number): Step => (_at, c) => {
  splitCarrier(c, skill);
};

/** The carrier's path and pillars; returns its live point. */
function splitCarrier(c: SkillContext, skill: number, graded?: boolean): Vector3 {
  const target = c.target!;
  const pos = entityPos(c.caster, -cm(20), new Vector3());
  const aim = entityPos(target, 0, new Vector3());
  const dir = new Vector3();
  const heading: [number, number, number] = [0, 0, yawDegrees(c)];
  let turn = 50;
  let k = 0;
  const move = (): void => {
    if (!entityGone(target)) entityPos(target, 0, aim);
    hummingDir(heading, pos, aim, turn, dir);
    turn += 2.4;
    pos.addInPlace(dir.scaleInPlace(SPLIT_STEP));
    if ((SPLIT_MOVES - k) % 3 === 0) splitPillar(c, skill, new Vector3(pos.x, pos.y + cm(10), pos.z), heading[2], graded);
    if (++k < SPLIT_MOVES) delay(TICK, move);
  };
  move();
  return pos;
}

// Space Split on the graded tiers: the same carrier and pillars, the pillars warmer, each erupting with a
// ground glow, a hot core and rising embers, and one fire light carried along the path.

/** Inferno.jpg is a pale cream; a little warmth keeps it reading as fire, not a white shaft, on the graded frame. */
const SPLIT_TINT: RGB = [1, 0.78, 0.55];
const SPLIT_GLOW: RGB = [1, 0.42, 0.14];

/** A pillar's ground contact: a flat glow, a hot core at the base and embers, over its 16 ticks. */
function splitEruption(c: SkillContext, base: Vector3): void {
  const floor = new Vector3(base.x, groundAt(base.x, base.z, base.y) + 0.04, base.z);
  effects.spawn('sprite', c.scene, floor, { texture: TEX.flare, colour: SPLIT_GLOW, size: 2.2, seconds: ticks(SPLIT_PILLAR_TICKS), flat: true, growFrom: 0.5, fadeTail: 0.5 });
  effects.spawn('sprite', c.scene, floor, { texture: TEX.flare, colour: [1, 0.7, 0.45], size: 1.1, seconds: ticks(8), height: 0.35, growFrom: 0.6, fadeTail: 0.6 });
  effects.spawn('particles', c.scene, floor, { recipe: SPLIT_EMBERS, count: 12, height: 0.1 });
}

const spaceSplitGraded = (skill: number): Step => (_at, c) => {
  const pos = splitCarrier(c, skill, true);
  // One light rides the carrier over the newest pillar's base, from the strike until the last pillar fades.
  lighting.skillStrike(c.scene, skill, {
    position: { x: pos.x, y: pos.y + 1, z: pos.z },
    follow: out => {
      out.x = pos.x;
      out.y = pos.y + 1;
      out.z = pos.z;
    },
  });
};

export default defineSkill({
  id: 74,
  name: "Fire Blast",
  // 74 Space Split (Fire Blast): at the strike, a hidden MODEL_PIER_PART sub2 homing on the target and dropping six
  // inferno pillars (spaceSplit). BattleCastle/sCDarkAttack plays there, on every map like rows 44-46.
  visual: { impact: litStrike(spaceSplit, 'Sound/battlecastle/sCDarkAttack'), enhanced: { impact: litStrike(spaceSplitGraded, 'Sound/battlecastle/sCDarkAttack') } },
  sound: 'Sound/eFirebust', // Space Split (SOUND_ATTACK_FIRE_BUST at the packet, WSclient.cpp:4532-4547)
  clip: { ground: A.PLAYER_ATTACK_STRIKE, ...MOUNTED_STRIKE }, // Space Split
});
