import type { ENUM_WORLD } from '../common/types';

/**
 * THE CONTRACT - one map's camera override.
 *
 * An entry of this system is a map (or a set of maps sharing one override):
 * one file, one exported `<name>Layer`, one line in `layers.ts`. Entries are
 * pure data; the facade (`index.ts`) owns all state and math. Maps without an
 * entry get the wheel-zoom distance levels (`recipes.ts`).
 *
 * Values are in original-client units (100 per tile), straight from
 * CameraUtility.cpp, so they stay comparable against the reference source.
 */
export interface CameraLayer {
  /** Unique camelCase, identical to the file name. */
  readonly name: string;

  /** The `ENUM_WORLD` values this override serves. */
  readonly worlds: readonly ENUM_WORLD[];

  /**
   * Locked camera distance, replacing the wheel-zoom levels on this map
   * (`UpdateCameraDistance`: Battle Castle 1100, camera level 5 maps 2000).
   */
  readonly distance?: number;

  /**
   * Absolute camera base height instead of the hero's ground height
   * (`CalculateCameraPosition`: Battle Castle pins it at 255).
   */
  readonly groundHeight?: number;
}
