import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ArcRotateCamera } from '../render/babylon/exports';
import { ENUM_WORLD } from '../../core/types';
import { EventBus } from '../../core/eventBus';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import { DEFAULT_HEADING_DEG, ROTATE_STEP_DEG } from './recipes';

// The wheel listener goes on `window`; no canvas, so no drag or pointer lock.
vi.stubGlobal('window', { addEventListener: () => {} });

const { cameraView, installCameraControl, resetCamera, updateGameCamera } = await import('.');

const RAD = Math.PI / 180;
const camera = {
  alpha: 0,
  beta: 0,
  radius: 10,
  fov: 0.8,
  minZ: 0.1,
  target: { x: 0, y: 0, z: 0 },
  getEngine: () => ({ getRenderingCanvas: () => null }),
} as unknown as ArcRotateCamera;
installCameraControl(camera, () => true);

/** One 25 fps frame on Lorencia, with these keys held. */
const frame = (keys: string[] = []) => updateGameCamera(camera, ENUM_WORLD.WD_0LORENCIA, new Set(keys), null, 1 / 25);
/** Insert held for a frame turns the heading one step. */
const TURNED = (DEFAULT_HEADING_DEG + ROTATE_STEP_DEG) * RAD;

describe('the camera view across a warp', () => {
  afterEach(() => {
    setFidelityChoice(FIDELITY_DEFAULT, {});
    resetCamera();
    frame();
  });

  it('keeps the turn on Enhanced, and the reset goes back to the map frame', () => {
    frame(['Insert']);
    expect(cameraView.moved).toBe(true);
    EventBus.emit('warpCompleted', { map: ENUM_WORLD.WD_2DEVIAS });
    frame();
    expect(camera.alpha).toBeCloseTo(TURNED);

    resetCamera();
    frame();
    expect(camera.alpha).toBeCloseTo(DEFAULT_HEADING_DEG * RAD);
    expect(cameraView.moved).toBe(false);
  });

  it('opens a map that pins its own distance on its frame', () => {
    frame(['Insert']);
    EventBus.emit('warpCompleted', { map: ENUM_WORLD.WD_63PK_FIELD });
    frame();
    expect(camera.alpha).toBeCloseTo(DEFAULT_HEADING_DEG * RAD);
  });

  it('resets on every warp on Classic (WSclient.cpp:600) and offers no reset', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    frame(['Insert']);
    expect(cameraView.moved).toBe(false);
    EventBus.emit('warpCompleted', { map: ENUM_WORLD.WD_2DEVIAS });
    frame();
    expect(camera.alpha).toBeCloseTo(DEFAULT_HEADING_DEG * RAD);
  });
});
