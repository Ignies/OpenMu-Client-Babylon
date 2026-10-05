import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { effects } from '@/controllers/fx';
import { MODEL } from '@/controllers/fx/recipes';
import { muAngle } from '@/controllers/fx/model';
import { ENUM_WORLD } from '@/core/types';
import type { Entity } from '@/ecs/world';
import { PlayerAction } from '../objects/enum';
import { playBuffHits, playSummonArrival, playTargetedSkillVisual } from './skillVisuals';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

/**
 * Every effect model a skill turns the way the original turns it: its node against `AngleMatrix` of the original's
 * `o->Angle` (degrees), which `muAngle` draws the way the render draws a body turned so (fx/model.test.ts).
 */
let engine: NullEngine;
let scene: Scene;
const realRandom = Math.random;
beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
  // rand() % n is n / 2.
  Math.random = () => 0.5;
});
afterAll(() => {
  Math.random = realRandom;
  vi.restoreAllMocks();
  scene.dispose();
  engine.dispose();
});

const DEG = Math.PI / 180;
/** A BMD's forward (0, -1, 0) and up (0, 0, 1), as the node holds them under the upright GLB root. */
const FORWARD = new Vector3(0, 0, -1);
const UP = new Vector3(0, 1, 0);
const axes = (node: TransformNode): [Vector3, Vector3] => {
  const m = node.computeWorldMatrix(true);
  return [Vector3.TransformNormal(FORWARD, m).normalize(), Vector3.TransformNormal(UP, m).normalize()];
};
/** The axes of a body turned by the original's `Angle`, in degrees. */
const expected = (angle: readonly [number, number, number]): [Vector3, Vector3] => {
  const node = new TransformNode('expected', scene);
  node.rotationQuaternion = muAngle(angle, new Quaternion());
  const out = axes(node);
  node.dispose();
  return out;
};
/** MU's CreateAngle from (x1, z1) to (x2, z2), degrees. */
const angleTo = (x1: number, z1: number, x2: number, z2: number): number => (Math.atan2(z2 - z1, x2 - x1) * 180) / Math.PI + 90;

interface Made {
  model: string;
  tick: number;
  at: Vector3;
  /** The node's axes on its spawn and after each tick since. */
  axes: [Vector3, Vector3][];
  node: TransformNode;
}

const CASTER = new Vector3(100, 0, 100);
const TARGET = new Vector3(103, 0, 104);
const body = (netId: number, at: Vector3, yaw: number, more: object = {}): Entity =>
  ({ netId, transform: { pos: at.clone(), rot: new Vector3(0, yaw * DEG, 0), scale: 1 }, ...more }) as unknown as Entity;

/** Records every model and summon body made while `cast` runs and for `ticks` ticks after. */
function record(cast: (tick: () => number) => void, ticks = 40): Made[] {
  let tick = 0;
  effects.reset();
  const made: Made[] = [];
  const real = effects.spawn.bind(effects);
  const spy = vi.spyOn(effects, 'spawn').mockImplementation(((name: string, s: Scene, at: Vector3, opts: { model?: string }) => {
    const before = s.transformNodes.length;
    const handle = real(name as never, s, at, opts as never);
    const node = s.transformNodes.slice(before).find(n => n.name === 'fxModel' || n.name === 'fxSummon');
    if (node) made.push({ model: opts.model ?? '', tick, at: at.clone(), axes: [axes(node)], node });
    return handle;
  }) as never);
  cast(() => tick);
  for (tick = 1; tick <= ticks; tick++) {
    effects.update(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
    for (const m of made) if (!m.node.isDisposed()) m.axes.push(axes(m.node));
  }
  spy.mockRestore();
  return made;
}

/** A skill cast by a caster turned `yaw` degrees at the target; the caster plays `clip` at `keysPerTick` when given one. */
function cast(skill: number, yaw: number, o: { clip?: PlayerAction; keysPerTick?: number; caster?: object } = {}): Made[] {
  return record(tick => {
    const keysPerTick = o.keysPerTick ?? 0.4;
    const model = o.clip === undefined ? undefined : { CurrentAction: o.clip, actionFrame: () => tick() * keysPerTick, AnimationSpeed: keysPerTick };
    playTargetedSkillVisual(scene, skill, body(1, CASTER, yaw, { modelObject: model, ...o.caster }), body(2, TARGET, 0));
  });
}

function expectTurned(m: Made | undefined, angle: readonly [number, number, number], after = 0): void {
  expect(m).toBeDefined();
  if (!m) return;
  const [f, u] = m.axes[after];
  const [ef, eu] = expected(angle);
  expect(Vector3.Dot(f, ef)).toBeCloseTo(1, 4);
  expect(Vector3.Dot(u, eu)).toBeCloseTo(1, 4);
}

const YAWS = [30, 200];
const BEARING = angleTo(CASTER.x, CASTER.z, TARGET.x, TARGET.z);
const A = PlayerAction;

/** [what, skill, model, the original's Angle for a caster turned `y`, the caster's clip and its speed, more caster]. */
const CASES: [string, number, string, (y: number) => [number, number, number], PlayerAction?, number?, object?][] = [
  ['Charge: MODEL_SWORD_FORCE sub2 at the caster\'s Angle (ZzzCharacter.cpp:4692)', 269, MODEL.swordForce, y => [0, 0, y], A.PLAYER_ATTACK_RUSH, 0.3],
  ['Dark Side: the dark MODEL_SHOCKWAVE01 on its side, Angle[2] - 180 (MonkSystem.cpp:813-816)', 263, MODEL.shockwave, y => [90, 0, y - 180], A.PLAYER_SKILL_DARKSIDE_READY, 0.3],
  ['Chain Drive: the giant-swing MODEL_SHOCKWAVE01 at (60, 0, Angle[2] - 180) (MoveHandlers.cpp:9334-9336)', 262, MODEL.shockwave, y => [60, 0, y - 180], A.PLAYER_SKILL_GIANTSWING],
  ['Ignore Defense: MODEL_WINDFOCE made at the caster\'s Angle (MonkSystem.cpp:1151)', 266, MODEL.windForce, y => [0, 0, y], A.PLAYER_SKILL_ATT_UP_OURFORCES],
  ['Expansion of Wizardry: MODEL_SWELL_OF_MAGICPOWER at the caster\'s Angle (WSclient.cpp:4960)', 233, MODEL.magicPowerUp, y => [0, 0, y]],
  ['Expansion of Wizardry: MODEL_ARROWSRE06 at the swell\'s Angle (ZzzEffect.cpp:8194-8196)', 233, MODEL.arrowsRe06, y => [0, 0, y]],
  ['Ice: MODEL_ICE at the caster\'s Angle, Angle[0] 0 (ZzzCharacter.cpp:4958, ZzzEffect.cpp:2190-2195)', 7, MODEL.ice, y => [0, 0, y]],
  ['Inferno: MODEL_SKILL_INFERNO at the caster\'s Angle (ZzzCharacter.cpp:4577)', 14, MODEL.inferno, y => [0, 0, y]],
  ['Poison: a player\'s MODEL_POISON at the caster\'s Angle (ZzzCharacter.cpp:4995)', 1, MODEL.poison, y => [0, 0, y], undefined, undefined, { charAppearance: {} }],
  ['Twister: MODEL_STORM at the caster\'s Angle (ZzzCharacter.cpp:4495)', 8, MODEL.storm, y => [0, 0, y]],
  ['Ice Storm: MODEL_BLIZZARD at the caster\'s Angle (ZzzCharacter.cpp:4468)', 39, MODEL.blizzard, y => [0, 0, y]],
  ['Power Wave: MODEL_MAGIC2 at the bearing to the target (ZzzCharacter.cpp:4888-4890, :5053)', 11, MODEL.magic2, () => [0, 0, BEARING]],
  ['Strike of Destruction: KNIGHT_PLANCRACK_B at the caster\'s Angle + 20 + 90 (MoveHandlers.cpp:7562-7571, ZzzEffect.cpp:4838)', 232, MODEL.knightPlanCrack2, y => [0, 0, y + 110]],
  ['Explosion: CASTING_EFFECT1 at the caster\'s Angle (SummonSystem.cpp:70, :237)', 223, MODEL.suhwanzin1, y => [0, 0, y]],
  ['Requiem: MODEL_SUMMONER_SUMMON_NEIL at the caster\'s Angle (SummonSystem.cpp:170-172)', 224, MODEL.summonNeil, y => [0, 0, y]],
  ['Weakness: CASTING_EFFECT2 at the caster\'s Angle (ZzzCharacter.cpp:4733)', 222, MODEL.suhwanzin2, y => [0, 0, y]],
];

describe('effect models turned as the original turns them', () => {
  for (const [what, skill, model, angle, clip, keysPerTick, caster] of CASES) {
    it(what, () => {
      for (const y of YAWS) expectTurned(cast(skill, y, { clip, keysPerTick, caster }).find(m => m.model === model), angle(y));
    });
  }

  it('Death Gorgon: the i-th of its 18 MODEL_FIRE at (0, 0, i x 20) (ZzzCharacter.cpp:1956-1970)', () => {
    const fires = cast(50, 30, { caster: { npcType: 35 } }).filter(m => m.model === MODEL.fire);
    expect(fires).toHaveLength(18);
    fires.forEach((m, i) => expectTurned(m, [0, 0, i * 20]));
  });

  it('a summon arriving: MODEL_MAGIC_CIRCLE1 at the monster\'s Angle (WSclient.cpp:3115)', () => {
    for (const y of YAWS) expectTurned(record(() => playSummonArrival(scene, body(3, CASTER, y))).find(m => m.model === MODEL.magicCircle), [0, 0, y]);
  });

  it('Soul Barrier\'s shell faces the attacker: Angle (0, 0, CreateAngle2D(attacker, hero) + 180) (WSclient.cpp:3284-3289)', () => {
    const toHero = angleTo(TARGET.x, TARGET.z, CASTER.x, CASTER.z);
    const hero = body(1, CASTER, 0, { buffs: new Set([4]) });
    const made = record(() => playBuffHits(scene, hero, body(2, TARGET, toHero))).find(m => m.model === MODEL.protect2);
    expectTurned(made, [0, 0, toHero + 180]);
  });

  it('the casting circles turn 3 degrees a tick, CASTING_EFFECT1 down and 11 up (MoveHandlers.cpp:1143-1149)', () => {
    const made = cast(223, 30);
    expectTurned(made.find(m => m.model === MODEL.suhwanzin1), [0, 0, 30 - 15], 5);
    expectTurned(made.find(m => m.model === MODEL.suhwanzin11), [0, 0, 30 + 15], 5);
  });

  it('Weakness\'s circles turn 3 degrees a tick, CASTING_EFFECT2 up and 22 down (MoveHandlers.cpp:1152-1158)', () => {
    const made = cast(222, 30);
    expectTurned(made.find(m => m.model === MODEL.suhwanzin2), [0, 0, 30 + 15], 5);
    expectTurned(made.find(m => m.model === MODEL.suhwanzin22), [0, 0, 30 - 15], 5);
  });

  it('Explosion\'s Sahamutt faces the point it runs to', () => {
    const made = cast(223, 30).find(m => m.model === MODEL.summonSahamutt);
    expectTurned(made, [0, 0, made ? angleTo(made.at.x, made.at.z, TARGET.x, TARGET.z) : 0]);
  });

  it('Pollution\'s Laguls face the way they move', () => {
    let checked = 0;
    for (const m of cast(225, 30).filter(m => m.model === MODEL.summonLagul)) {
      const node = m.node;
      const prev = node.position.clone();
      effects.update(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
      const d = node.position.subtract(prev);
      if (d.x * d.x + d.z * d.z < 1e-8) continue;
      checked++;
      const [f] = axes(node);
      expect(Vector3.Dot(new Vector3(f.x, 0, f.z).normalize(), new Vector3(d.x, 0, d.z).normalize())).toBeCloseTo(1, 4);
    }
    expect(checked).toBeGreaterThan(0);
  });
});
