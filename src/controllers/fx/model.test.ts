import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Ecs } from '../../ecs/current';
import type { Entity } from '../../ecs/world';
import { toRenderAngles } from '../render/renderAngles';
import { entityYaw } from './core';
import { modelLayer, spawnModel, type ModelHandle, type ModelOptions } from './model';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

let engine: NullEngine;
let scene: Scene;
beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
  // No world: nothing loads, the node is all there is.
  Ecs.world = null;
});
afterAll(() => {
  modelLayer.reset?.();
  scene.dispose();
  engine.dispose();
});

/** A BMD's forward, (0, -1, 0), is the node's -Z once the GLB root lies it upright (model.ts UPRIGHT, modelObject.ts). */
const BMD_FORWARD = new Vector3(0, 0, -1);
const forwardOf = (node: TransformNode): Vector3 => {
  const f = Vector3.TransformNormal(BMD_FORWARD, node.computeWorldMatrix(true));
  return new Vector3(f.x, 0, f.z).normalize();
};

/** Where renderSystem draws a body turned `yaw` facing: its node takes `toRenderAngles` (renderSystem.ts:150, modelObject.ts updateLocation). */
function drawnForward(caster: Entity): Vector3 {
  const node = new TransformNode('caster', scene);
  toRenderAngles(caster.transform?.rot ?? Vector3.Zero(), node.rotation);
  const f = forwardOf(node);
  node.dispose();
  return f;
}

function spawnedForward(opts: Omit<ModelOptions, 'model'>, turn?: (handle: ModelHandle) => void): Vector3 {
  const before = scene.transformNodes.length;
  const handle = spawnModel(scene, new Vector3(), { model: 'Skill/none.glb', ...opts });
  const node = scene.transformNodes.slice(before).find(n => n.name === 'fxModel');
  if (!node) throw new Error('spawnModel made no node');
  turn?.(handle);
  const f = forwardOf(node);
  handle.stop();
  modelLayer.update?.(0, 0);
  return f;
}

/** MU's CreateAngle along a flight of (dx, dz) on the ground, in degrees (ZzzAI.cpp:87-99). */
const createAngle = (dx: number, dz: number): number => (Math.atan2(dx, -dz) * 180) / Math.PI;

const casterAt = (deg: number): Entity => ({ transform: { pos: new Vector3(), rot: new Vector3(0, (deg * Math.PI) / 180, 0), scale: 1 } }) as unknown as Entity;
const YAWS = [0, 30, 90, 135, 200, 300];

describe('an effect model turned to its caster', () => {
  it('`angle` in MU degrees faces where the caster is drawn facing (AngleMatrix, ZzzMathLib.cpp:185)', () => {
    for (const deg of YAWS) {
      const caster = casterAt(deg);
      const f = spawnedForward({ angle: [0, 0, (entityYaw(caster) * 180) / Math.PI] });
      expect(Vector3.Dot(f, drawnForward(caster))).toBeCloseTo(1, 5);
    }
  });

  it('`yaw` is the node\'s own turn, MU\'s flipped as the render flips it: the caster\'s facing is -entityYaw', () => {
    for (const deg of YAWS) {
      const caster = casterAt(deg);
      expect(Vector3.Dot(spawnedForward({ yaw: -entityYaw(caster) }), drawnForward(caster))).toBeCloseTo(1, 5);
      // entityYaw as it is mirrors the model across the caster's forward-back line: right only at 0 and 180.
      const mirrored = spawnedForward({ yaw: entityYaw(caster) });
      const along = deg % 180 === 0;
      expect(Math.abs(Vector3.Dot(mirrored, drawnForward(caster)) - 1) < 1e-6).toBe(along);
    }
  });

  it('`yawTo` turns it as the original turns a projectile: Angle[2] is CreateAngle along the flight (ZzzEffect.cpp:1661-1665, :2640-2645)', () => {
    for (const [dx, dz] of [[0, 1], [1, 0], [0, -1], [-1, 0], [3, 4], [-2, 5], [1, -1]]) {
      const turned = spawnedForward({}, h => h.yawTo(new Vector3(dx, 0.3, dz)));
      expect(Vector3.Dot(turned, spawnedForward({ angle: [0, 0, createAngle(dx, dz)] }))).toBeCloseTo(1, 5);
    }
  });
});
