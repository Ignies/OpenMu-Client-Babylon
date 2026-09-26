import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Ray } from '@babylonjs/core/Culling/ray';

// restObjectSystem used to run a full scene.pick only to read its `.ray`;
// it now builds that ray itself. The two must be the same ray.
describe('rest object picking ray', () => {
  let engine: NullEngine;
  let scene: Scene;

  beforeEach(() => {
    engine = new NullEngine({
      renderWidth: 1280,
      renderHeight: 720,
      textureSize: 512,
      deterministicLockstep: false,
      lockstepMaxSteps: 1,
    });
    scene = new Scene(engine);

    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 4,
      Math.PI / 4.5,
      18,
      new Vector3(135, 1.2, 130),
      scene
    );
    camera.minZ = 0.1;
    camera.maxZ = 5000;
  });

  afterEach(() => {
    engine.dispose();
  });

  it('matches the ray scene.pick returns', () => {
    const identity = Matrix.Identity();
    const built = new Ray(Vector3.Zero(), Vector3.Up(), Number.MAX_VALUE);

    const points: Array<[number, number]> = [
      [0, 0],
      [640, 360],
      [1279, 719],
      [13.5, 250.25],
      [901, 77],
    ];

    for (const [x, y] of points) {
      const picked = scene.pick(x, y).ray;
      expect(picked).toBeTruthy();

      scene.createPickingRayToRef(x, y, identity, built, null);

      expect(built.origin.asArray()).toEqual(picked!.origin.asArray());
      expect(built.direction.asArray()).toEqual(picked!.direction.asArray());
      expect(built.length).toBe(picked!.length);
    }
  });
});
