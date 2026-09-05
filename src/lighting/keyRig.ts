import {
  Color3,
  DirectionalLight,
  HemisphericLight,
  Vector3,
  type Scene,
} from '../libs/babylon/exports';

/**
 * The key-light rig: single owner of the two scene-wide key lights, the
 * hemispheric sky and the directional sun (ARCHITECTURE §4.1).
 *
 * Contracts:
 *  - `lighting/director.ts` is the only caller of `setKey` /
 *    `setSunDirection` / `syncSpecular`.
 *  - Everyone else (CSM, blob shadows, footprints, terrain overlay) *reads*
 *    the rig via `sunLightOf` / `skyLightOf` and never writes it.
 */

/** The authored sun direction: azimuth as before, elevation 48 deg. */
export const DEFAULT_SUN_DIRECTION: readonly [number, number, number] = [
  0.5, -1, 0.75,
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
 * The key values, written by the director only. `skyGround = null`
 * collapses the hemisphere (ground = sky), which is the Classic flat look.
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

/** The direction the sun travels; the profile's, via the director. */
export function setSunDirection(
  scene: Scene,
  direction: readonly [number, number, number]
): void {
  const sun = rigs.get(scene)?.sun;
  if (!sun) return;

  sun.direction.set(direction[0], direction[1], direction[2]);
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
