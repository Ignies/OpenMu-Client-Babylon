import type { Scene } from '../libs/babylon/exports';
import { toLinear, type Rgb } from './profiles';

/**
 * The sky (ARCHITECTURE §4.6): sole writer of `scene.clearColor`. The clear
 * colour is the whole sky until the dome mesh joins it here; the haze reads
 * the same horizon, so the two can never disagree.
 */

export type SkyLook = {
  /**
   * The profile's horizon, display sRGB, or null to keep the map's authored
   * bytes. Nothing lights the sky and no exposure follows it (the level lives
   * in the key, §13 F4), so the decoded value lands where it was authored.
   */
  readonly horizon: Rgb | null;
  /** The buffer is linear: decode the horizon once, here. */
  readonly linear: boolean;
  /** `SetWorldClearColor` bytes, or undefined for black. */
  readonly bytes: readonly [number, number, number] | undefined;
  /** A room is active: nothing past its walls is drawn, the void included. */
  readonly black: boolean;
};

export function syncSkyDome(scene: Scene, look: SkyLook): void {
  if (look.black) {
    scene.clearColor.set(0, 0, 0, 1);
    return;
  }

  if (look.horizon) {
    const c = look.linear ? toLinear(look.horizon) : look.horizon;
    scene.clearColor.set(c[0], c[1], c[2], 1);
    return;
  }

  const bytes = look.bytes;

  if (bytes) {
    scene.clearColor.set(bytes[0] / 256, bytes[1] / 256, bytes[2] / 256, 1);
  } else {
    scene.clearColor.set(0, 0, 0, 1);
  }
}
