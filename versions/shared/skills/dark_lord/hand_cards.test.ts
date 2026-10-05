import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { effects } from '@/controllers/fx';
import { MODEL } from '@/controllers/fx/recipes';
import { ENUM_WORLD } from '@/core/types';
import type { Entity } from '@/ecs/world';
import { PlayerAction } from '../../objects/enum';
import { playTargetedSkillVisual } from '../skillVisuals';
import { muAngle } from './_shared';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

/**
 * MODEL_DARKLORD_SKILL, the card the Dark Lord's hand skills leave at each weapon's link bone: c->Weapon[0] (the appearance's
 * left hand, slot 0) on bone 33 and c->Weapon[1] (its right hand, slot 1) on bone 42 (ZzzCharacter.cpp:12180-12193, :11849-11850).
 */
let engine: NullEngine;
let scene: Scene;
beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
});
afterAll(() => {
  vi.restoreAllMocks();
  scene.dispose();
  engine.dispose();
});

/** Where the caster's link bones 33 and 42 stand (the GLB adds a root bone). */
const BONE33 = new Vector3(100.3, 1.1, 100);
const BONE42 = new Vector3(99.7, 1.2, 100);
const SCEPTER = { group: 2, num: 8 };
const SHIELD = { group: 6, num: 1 };

/** A Dark Lord turned `yaw` degrees, playing the hand cast, holding `hands`. */
function caster(yaw: number, hands: object = {}): Entity {
  const bones: unknown[] = [];
  bones[34] = { getTransformNode: () => ({ getAbsolutePosition: () => BONE33 }) };
  bones[43] = { getTransformNode: () => ({ getAbsolutePosition: () => BONE42 }) };
  return {
    netId: 1,
    transform: { pos: new Vector3(100, 0, 100), rot: new Vector3(0, (yaw * Math.PI) / 180, 0), scale: 1 },
    charAppearance: { leftHand: null, rightHand: null, ...hands },
    modelObject: { CurrentAction: PlayerAction.PLAYER_SKILL_HAND1, AnimationSpeed: 0.4, actionFrame: () => 0, gltf: { mesh: { isDisposed: () => false }, skeleton: { bones } } },
  } as unknown as Entity;
}

interface Made {
  tick: number;
  model: string;
  at: Vector3;
  opts: Record<string, unknown>;
}

/** The effects `skill` cast by `who` spawns over 30 ticks. */
function cast(skill: number, who: Entity): { made: Made[]; names: string[] } {
  let tick = 0;
  effects.reset();
  const made: Made[] = [];
  const names: string[] = [];
  const real = effects.spawn.bind(effects);
  const spy = vi.spyOn(effects, 'spawn').mockImplementation(((name: never, s: Scene, at: Vector3, opts: Record<string, unknown>) => {
    names.push(name);
    if (name === 'model') made.push({ tick, model: String(opts.model), at: at.clone(), opts });
    return real(name, s, at, opts as never);
  }) as never);
  playTargetedSkillVisual(scene, skill, who, null);
  for (tick = 1; tick <= 30; tick++) effects.update(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
  spy.mockRestore();
  return { made, names };
}

const cards = (r: { made: Made[] }) => r.made.filter(m => m.model === MODEL.darkLordSkill);

describe('Add Critical (64): a card at each hand (ZzzCharacter.cpp:4366-4383)', () => {
  it('none at a shield, which Weapon[1] holds: the left hand slot 1, bone 42 (:4377)', () => {
    expect(cards(cast(64, caster(0, { leftHand: SCEPTER, rightHand: SHIELD }))).map(m => m.at)).toEqual([BONE33]);
    expect(cards(cast(64, caster(0, { leftHand: SCEPTER }))).map(m => m.at)).toEqual([BONE33, BONE42]);
  });
});

describe('Brand of Skill (75): the same cards in their white Light (ZzzCharacter.cpp:4699-4714)', () => {
  it('a card at Weapon[0]\'s bone 33 and one at Weapon[1]\'s bone 42, at (45, 45, 0) and (45, -45, 0) whatever the facing (ZzzEffect.cpp:3449-3470)', () => {
    for (const yaw of [30, 200]) {
      const made = cards(cast(75, caster(yaw)));
      expect(made.map(m => m.at)).toEqual([BONE33, BONE42]);
      made.forEach((m, sub) => {
        const turn = muAngle(45, sub ? -45 : 45, 0);
        expect([m.opts.pitch, m.opts.yaw, m.opts.roll]).toEqual([turn.pitch, turn.yaw, turn.roll]);
        // Scale 0.2 and LifeTime 10, left where it was made, drawn in its Light (ZzzObject.cpp:948-953).
        expect([m.opts.colour, m.opts.scale, Math.round((m.opts.seconds as number) * 25), m.opts.follow]).toEqual([[1, 1, 1], 0.2, 10, undefined]);
      });
    }
  });

  it('none at Weapon[0] holding arrows or Weapon[1] holding bolts or a shield (:4702, :4707)', () => {
    expect(cards(cast(75, caster(0, { leftHand: { group: 4, num: 15 }, rightHand: SHIELD })))).toEqual([]);
    expect(cards(cast(75, caster(0, { leftHand: SCEPTER, rightHand: { group: 4, num: 7 } }))).map(m => m.at)).toEqual([BONE33]);
  });

  it('at the cast\'s release with Add Critical\'s, and no motes of its own (ZzzCharacter.cpp:4139-4145)', () => {
    const brand = cast(75, caster(0));
    const at = (r: { made: Made[] }) => cards(r).map(m => m.tick);
    expect(at(brand)).toEqual(at(cast(64, caster(0))));
    expect(at(brand)[0]).toBeGreaterThan(0);
    expect(brand.names).not.toContain('particles');
  });
});
