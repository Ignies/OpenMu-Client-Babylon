import type { Scene } from '../libs/babylon/exports';

/**
 * A value worked out once per rendered frame of a scene. `fill` runs on the
 * first read after `scene.render()` moves the frame id, or when the scene
 * changes, and every later read that frame gets the same object back. With
 * `live` false it fills on every read, the per-call cost it replaces.
 */
export function frameSnapshot<T>(
  value: T,
  fill: (value: T, scene: Scene) => void,
  live = true
): (scene: Scene) => T {
  let filledScene: Scene | null = null;
  let filledFrame = -1;

  return scene => {
    const frame = scene.getFrameId();

    if (!live || scene !== filledScene || frame !== filledFrame) {
      // Stamped after the fill, so a fill that throws is not reused half done.
      fill(value, scene);
      filledScene = scene;
      filledFrame = frame;
    }

    return value;
  };
}
