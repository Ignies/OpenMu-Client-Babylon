import {
  Color3,
  DirectionalLight,
  HemisphericLight,
  Vector3,
  type Scene,
} from '../libs/babylon/exports';

/**
 * The key-light rig: single owner of the two scene-wide key lights, the
 * hemispheric sky and the directional sun (lighting_rework.md §2.3).
 *
 * Contracts:
 *  - `sceneLook` (the mood writer) is the only caller of `setKey` /
 *    `syncSpecular` — the moods stay the one source of light values.
 *  - The day/night cycle is the only caller of `setSunDirection`.
 *  - Everyone else (CSM, blob shadows, footprints, terrain overlay) *reads*
 *    the rig via `sunLightOf` / `skyLightOf` and never writes it.
 */

/** The authored sun direction, restored whenever the cycle is off. */
export const DEFAULT_SUN_DIRECTION: readonly [number, number, number] = [
  0.4, -1, 0.6,
];

const rigs = new WeakMap<
  Scene,
  { sky: HemisphericLight; sun: DirectionalLight }
>();

/** Creates the rig for a scene. Call once, from the scene bootstrap. */
export function createKeyRig(scene: Scene): void {
  const sky = new HemisphericLight('skyLight', new Vector3(0, 1, 0), scene);
  sky.specular = Color3.Black();

  const sun = new DirectionalLight(
    'sunLight',
    new Vector3(...DEFAULT_SUN_DIRECTION),
    scene
  );
  sun.specular = Color3.Black();

  rigs.set(scene, { sky, sun });
}

export function skyLightOf(scene: Scene): HemisphericLight | null {
  return rigs.get(scene)?.sky ?? null;
}

export function sunLightOf(scene: Scene): DirectionalLight | null {
  return rigs.get(scene)?.sun ?? null;
}

/**
 * The mood-derived key values, written by `sceneLook.writeMood` only.
 * `skyGround = null` collapses the hemisphere (ground = sky), which is the
 * Classic flat look.
 */
export function setKey(
  scene: Scene,
  params: {
    skyIntensity: number;
    skyDiffuse: readonly [number, number, number];
    skyGround: readonly [number, number, number] | null;
    sunIntensity: number;
    sunDiffuse: readonly [number, number, number];
  }
): void {
  const rig = rigs.get(scene);
  if (!rig) return;

  const { sky, sun } = rig;

  sky.intensity = params.skyIntensity;
  sky.diffuse.set(...params.skyDiffuse);
  if (params.skyGround) {
    sky.groundColor.set(...params.skyGround);
  } else {
    sky.groundColor.copyFrom(sky.diffuse);
  }

  sun.intensity = params.sunIntensity;
  sun.diffuse.set(...params.sunDiffuse);
}

/**
 * The sun's highlight strength: the sun is the only key light that throws a
 * specular (the PBR material reads it, the Standard one ignores it). 0 turns
 * it off.
 */
export function syncSpecular(scene: Scene, scale: number): void {
  const sun = rigs.get(scene)?.sun;
  if (!sun) return;

  if (scale > 0) {
    sun.specular.copyFrom(sun.diffuse).scaleInPlace(scale);
  } else {
    sun.specular.set(0, 0, 0);
  }
}

/**
 * The sun's direction from the cycle's angles, lerped against the authored
 * default by `strength` (damped maps only drift). The CSM refreshes every
 * frame with stabilized cascades, so a slowly rotating light costs nothing;
 * the elevation floor that keeps the cascades sane lives in `dayCycle.ts`.
 */
export function setSunDirection(
  scene: Scene,
  azimuth: number,
  elevation: number,
  strength: number
): void {
  const sun = rigs.get(scene)?.sun;
  if (!sun) return;

  const [dx, dy, dz] = DEFAULT_SUN_DIRECTION;

  if (strength <= 0) {
    sun.direction.set(dx, dy, dz);
    return;
  }

  const cos = Math.cos(elevation);

  // Unit vector from the sky point toward the ground; the default is scaled
  // to unit length so a partial-strength lerp stays near-normalized.
  const cx = -cos * Math.sin(azimuth);
  const cy = -Math.sin(elevation);
  const cz = -cos * Math.cos(azimuth);

  const norm = 1 / Math.hypot(dx, dy, dz);
  const s = strength;

  sun.direction.set(
    dx * norm * (1 - s) + cx * s,
    dy * norm * (1 - s) + cy * s,
    dz * norm * (1 - s) + cz * s
  );
}
