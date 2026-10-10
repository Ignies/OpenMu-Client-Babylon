import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Ecs } from '../../ecs/current';
import { jointCount, jointLayer, MAX_JOINTS } from './joint';
import { MAX_EFFECTS, MAX_SKILL_EFFECTS, modelLayer } from './model';
import { playBurst } from './bursts';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

let engine: NullEngine;
let scene: Scene;
beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
  // No world: a model is its node, nothing loads.
  Ecs.world = null;
});
afterEach(() => {
  jointLayer.reset?.();
  modelLayer.reset?.();
});
afterAll(() => {
  scene.dispose();
  engine.dispose();
});

const bolt = () => jointLayer.spawn(scene, new Vector3(), { to: new Vector3(1, 0, 0), seconds: 100 });

// The original's fixed slots: `Joints[MAX_JOINTS]`, `Effects[MAX_EFFECTS]` (Core/Globals/_define.h:456,504).
// CreateJoint / CreateEffect make nothing when every slot is live (ZzzEffectJoint.cpp:76, ZzzEffect.cpp:336).
describe('live caps', () => {
  it('joint: no new joint past the original 500 live', () => {
    expect(MAX_JOINTS).toBe(500);
    for (let i = 0; i < 500; i++) expect(bolt().alive).toBe(true);
    expect(bolt().alive).toBe(false);
    expect(jointCount()).toBe(500);
  });

  it('model: no new model past the original 200 live, and one more once one ends', () => {
    expect(MAX_EFFECTS).toBe(200);
    const spawn = (seconds = 100) => modelLayer.spawn(scene, new Vector3(), { model: 'Skill/fake.glb', seconds });
    expect(spawn(0.01).alive).toBe(true);
    for (let i = 1; i < 200; i++) expect(spawn().alive).toBe(true);
    expect(spawn().alive).toBe(false);
    modelLayer.update?.(0, 0.04);
    expect(spawn().alive).toBe(true);
  });

  it('model: skill effects the hero owns take 100 slots of their own (g_SkillEffects, SkillEffectMgr.cpp:33-62)', () => {
    expect(MAX_SKILL_EFFECTS).toBe(100);
    const spawn = (heroSkill?: boolean) => modelLayer.spawn(scene, new Vector3(), { model: 'Skill/fake.glb', seconds: 100, heroSkill });
    for (let i = 0; i < 200; i++) spawn();
    expect(spawn().alive).toBe(false);
    for (let i = 0; i < 100; i++) expect(spawn(true).alive).toBe(true);
    expect(spawn(true).alive).toBe(false);
    // They never took one of the 200.
    expect(spawn().alive).toBe(false);
  });

  it('the level-up rings count toward the joint cap', () => {
    for (let i = 0; i < 495; i++) bolt();
    playBurst(scene, 'levelUp', new Vector3());
    expect(jointCount()).toBe(500);
  });
});
