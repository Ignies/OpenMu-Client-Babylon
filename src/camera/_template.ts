/**
 * Copy me to add a map's camera override: `cp _template.ts <map>.ts`, fill
 * the fields, then add `<map>Layer` to `layers.ts`. Nothing else changes -
 * the facade looks up whatever `layers.ts` holds.
 *
 * Compiling but never imported, on purpose.
 */

import { ENUM_WORLD } from '../common/types';
import type { CameraLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------
// Original-client units (100 per tile), cited against CameraUtility.cpp.

/** Locked camera distance; omit to keep the wheel-zoom levels. */
const DISTANCE: number | undefined = undefined;

/** Absolute camera base height; omit to follow the hero's ground. */
const GROUND_HEIGHT: number | undefined = undefined;

// ---- 2. state + readers ----------------------------------------------------
// An entry has neither: it is data, and the facade owns the camera.

// ---- 3. the layer ----------------------------------------------------------

export const templateLayer: CameraLayer = {
  name: 'template',
  worlds: [ENUM_WORLD.WD_0LORENCIA],
  distance: DISTANCE,
  groundHeight: GROUND_HEIGHT,
};
