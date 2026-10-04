import type { AbstractMesh } from '../../controllers/render/babylon/exports';
import { shadowReceiverChanged } from '../../controllers/render/scenes/csmBounds';
import { isOn } from '../../controllers/fidelity';
import type { ISystemFactory } from '../world';
import { createRoofDetector } from './roofDetection';

/**
 * Fades the ceiling of the building the hero stands in: the `roofFade` improvement. Not in the
 * original (its only object fade is Chaos Castle's, ZzzObject.cpp:228). The roof is found by
 * `roofDetection.ts`, which runs on every preset. See ecs/readme.md.
 */

/** Fade speed, visibility per second. */
const FADE_SPEED = 5;

export const CeilingHideSystem: ISystemFactory = world => {
  const roofOver = createRoofDetector(world);

  /** Meshes currently faded (or fading back in). */
  const fading = new Map<AbstractMesh, { hide: boolean }>();

  function markHide(mesh: AbstractMesh) {
    const entry = fading.get(mesh);
    if (entry) entry.hide = true;
    else fading.set(mesh, { hide: true });
  }

  return {
    update: dt => {
      const roof = roofOver(dt);

      // Re-assert the hide flag every frame from the carried set: the fade
      // loop below clears it, and a mesh that dropped out of the set on the
      // last scan is simply no longer re-marked, so it fades back in.
      // Classic: the roof stays drawn (one already faded comes back).
      if (isOn('roofFade')) for (const mesh of roof) markHide(mesh);

      if (fading.size === 0) return;

      const step = FADE_SPEED * dt;

      for (const [mesh, entry] of fading) {
        if (mesh.isDisposed()) {
          fading.delete(mesh);
          continue;
        }

        if (entry.hide) {
          mesh.visibility = Math.max(0, mesh.visibility - step);
          // A faded slab must leave the depth passes too (G-buffer, room
          // mask, cascades): they test isVisible, not visibility, and a
          // roof gone from the frame but present in the depth would black
          // out the floor under it.
          if (mesh.visibility <= 0) {
            if (mesh.isVisible) shadowReceiverChanged(mesh);
            mesh.isVisible = false;
          }
          // Re-evaluated next frame; anything no longer part of the roof fades back.
          entry.hide = false;
        } else {
          if (!mesh.isVisible) shadowReceiverChanged(mesh);
          mesh.isVisible = true;
          mesh.visibility = Math.min(1, mesh.visibility + step);
          if (mesh.visibility >= 1) fading.delete(mesh);
        }
      }
    },
  };
};
