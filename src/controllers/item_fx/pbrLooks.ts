import type { AbstractMesh, Effect, Scene } from '../render/babylon/exports';
import { frameSnapshot } from '../render/frameSnapshot';
import {
  SURFACE_CLOTH,
  SURFACE_GEAR,
  SURFACE_SKIN,
  type Surface,
} from '../render/surfaceClass';
import { skyLightOf, sunLightOf } from '../lighting/keyRig';
import { GameOptions } from '@/controllers/settings';

/**
 * The PBR material's surface looks: metal on gear with a sky reflection,
 * sheen on cloth, warm scatter on skin, a rim on characters. See readme.md.
 */
const SURFACE_UNIFORM = 'muSurface';
const ENV_SKY_UNIFORM = 'muEnvSky';
const ENV_GROUND_UNIFORM = 'muEnvGround';
const ENV_SUN_DIR_UNIFORM = 'muEnvSunDir';
const ENV_SUN_UNIFORM = 'muEnvSun';
/** The player's knobs: metal, plate, roughness, sheen (A) and skin, rim, ground, sky (B). */
const LOOKS_A_UNIFORM = 'muLooksA';
const LOOKS_B_UNIFORM = 'muLooksB';

export const PBR_LOOKS_UNIFORMS = [
  [SURFACE_UNIFORM, 'vec4'],
  [ENV_SKY_UNIFORM, 'vec3'],
  [ENV_GROUND_UNIFORM, 'vec3'],
  [ENV_SUN_DIR_UNIFORM, 'vec3'],
  [ENV_SUN_UNIFORM, 'vec3'],
  [LOOKS_A_UNIFORM, 'vec4'],
  [LOOKS_B_UNIFORM, 'vec4'],
] as const;

type LookOptions = Pick<
  GameOptions,
  | 'materialMetal'
  | 'materialPlate'
  | 'materialRoughness'
  | 'materialSheen'
  | 'materialSkin'
  | 'materialRim'
  | 'materialGround'
  | 'materialSky'
>;

/** The Options sliders (0..10) as the shader's knobs, in `muLooksA` then `muLooksB` order. */
export function lookValues(o: LookOptions, out: number[]): number[] {
  out[0] = o.materialMetal / 10;
  out[1] = o.materialPlate / 10;
  out[2] = Math.max(o.materialRoughness / 10, 0.05);
  out[3] = o.materialSheen / 10;
  out[4] = o.materialSkin / 5;
  out[5] = o.materialRim / 20;
  out[6] = o.materialGround / 20;
  out[7] = o.materialSky / 10;

  return out;
}

/** `Fragment_Custom_MetallicRoughness`: only gear turns the derived candidates into metal. */
export const PBR_LOOKS_METAL_GLSL = `
  #ifdef REFLECTIVITY
  metallicRoughness.r = vReflectivityColor.r * ${SURFACE_UNIFORM}.x * max(
    surfaceMetallicOrReflectivityColorMap.b * ${LOOKS_A_UNIFORM}.x,
    surfaceMetallicOrReflectivityColorMap.r * ${LOOKS_A_UNIFORM}.y);
  #endif
  metallicRoughness.g = mix(metallicRoughness.g, ${LOOKS_A_UNIFORM}.z, metallicRoughness.r);
`;

/** `Fragment_Before_Fog`, added to `finalColor` and scaled by the detail slider's `detail`. */
export const pbrLooksGlsl = (detail: string) => `
  {
    float lookShadow = numLights > 0.0 ? clamp(aggShadow * numLights - (numLights - 1.0), 0.0, 1.0) : 1.0;
    vec3 envDir = reflect(-viewDirectionW, normalW);
    vec3 env = mix(${ENV_GROUND_UNIFORM} * ${LOOKS_B_UNIFORM}.z, ${ENV_SKY_UNIFORM} * ${LOOKS_B_UNIFORM}.w, smoothstep(0.0, 1.0, envDir.y));
    float edge = 1.0 - NdotV;
    float sunDot = dot(normalW, -${ENV_SUN_DIR_UNIFORM});
    float scatter = max((sunDot + 0.5) / 1.5, 0.0) - max(sunDot, 0.0);
    finalColor.rgb += (
      env * specularEnvironmentReflectance
      + diffuseBase * surfaceAlbedo * pow(edge, 4.0) * ${SURFACE_UNIFORM}.y * ${LOOKS_A_UNIFORM}.w
      + ${ENV_SUN_UNIFORM} * surfaceAlbedo * vec3(0.35, 0.16, 0.1) * ${LOOKS_B_UNIFORM}.x * scatter * lookShadow * ${SURFACE_UNIFORM}.z
      + ${ENV_SKY_UNIFORM} * pow(edge, 6.0) * max(-sunDot, 0.0) * ${SURFACE_UNIFORM}.w * ${LOOKS_B_UNIFORM}.y
    ) * ${detail};
  }
`;

/** `muSurface` for a mesh: metal, sheen, skin, rim. */
export function surfaceVector(
  surface: Surface | undefined,
  character: boolean,
  out: [number, number, number, number]
): [number, number, number, number] {
  out[0] = surface === SURFACE_GEAR ? 1 : 0;
  out[1] = surface === SURFACE_CLOTH ? 1 : 0;
  out[2] = surface === SURFACE_SKIN ? 1 : 0;
  out[3] = character ? 1 : 0;

  return out;
}

type EnvFrame = {
  looks: number[];
  sky: [number, number, number];
  ground: [number, number, number];
  sunDir: [number, number, number];
  sun: [number, number, number];
};

/** The sliders, and the key rig as the environment: the sky light top and bottom, the sun at its plain level. */
const envFrame = frameSnapshot<EnvFrame>(
  { looks: [0, 0, 0, 0, 0, 0, 0, 0], sky: [0, 0, 0], ground: [0, 0, 0], sunDir: [0, -1, 0], sun: [0, 0, 0] },
  (env, scene: Scene) => {
    lookValues(GameOptions, env.looks);
    const sky = skyLightOf(scene);
    const sun = sunLightOf(scene);
    const k = sky ? sky.intensity : 0;
    const s = sun ? Math.max(sun.intensity, 0) : 0;

    env.sky[0] = sky ? sky.diffuse.r * k : 0;
    env.sky[1] = sky ? sky.diffuse.g * k : 0;
    env.sky[2] = sky ? sky.diffuse.b * k : 0;
    env.ground[0] = sky ? sky.groundColor.r * k : 0;
    env.ground[1] = sky ? sky.groundColor.g * k : 0;
    env.ground[2] = sky ? sky.groundColor.b * k : 0;
    env.sun[0] = sun ? sun.diffuse.r * s : 0;
    env.sun[1] = sun ? sun.diffuse.g * s : 0;
    env.sun[2] = sun ? sun.diffuse.b * s : 0;

    if (sun) {
      const d = sun.direction;
      const norm = 1 / (Math.hypot(d.x, d.y, d.z) || 1);
      env.sunDir[0] = d.x * norm;
      env.sunDir[1] = d.y * norm;
      env.sunDir[2] = d.z * norm;
    }
  }
);

const surface: [number, number, number, number] = [0, 0, 0, 0];

/** Per draw, from the PBR material's bind. */
export function bindPbrLooks(effect: Effect, mesh: AbstractMesh): void {
  const env = envFrame(mesh.getScene());
  const v = surfaceVector(
    mesh.metadata?.surface,
    mesh.metadata?.characterAsset === true,
    surface
  );

  effect.setFloat4(SURFACE_UNIFORM, v[0], v[1], v[2], v[3]);
  effect.setFloat3(ENV_SKY_UNIFORM, env.sky[0], env.sky[1], env.sky[2]);
  effect.setFloat3(ENV_GROUND_UNIFORM, env.ground[0], env.ground[1], env.ground[2]);
  effect.setFloat3(ENV_SUN_DIR_UNIFORM, env.sunDir[0], env.sunDir[1], env.sunDir[2]);
  effect.setFloat3(ENV_SUN_UNIFORM, env.sun[0], env.sun[1], env.sun[2]);
  const l = env.looks;
  effect.setFloat4(LOOKS_A_UNIFORM, l[0], l[1], l[2], l[3]);
  effect.setFloat4(LOOKS_B_UNIFORM, l[4], l[5], l[6], l[7]);
}
