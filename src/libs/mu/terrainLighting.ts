import type { Effect, Scene } from '../babylon/exports';
import { getTerrainLightTexture } from '../../common/terrainDynamicLight';
import {
  linearBufferActive,
  linearLightActive,
} from '../../common/lightModel';
import { lookDirector } from '../../lighting/director';
import {
  bindClouds,
  cloudFieldGlsl,
  CLOUD_NOISE_SAMPLER,
  CLOUD_UNIFORMS,
} from '../../lighting/clouds';
import { SKY_CLOUDS_DEFAULT } from '../../lighting/profiles';
import {
  LIGHT_TINT_UNIFORM,
  lightTintGlsl,
  lightTintStrength,
} from '../../lighting/lightTint';
import {
  TERRAIN_CSM_UNIFORMS,
  bindTerrainCsm,
  terrainCsmDefines,
  terrainCsmGlsl,
} from '../../scenes/shadows';

/**
 * How the ground is lit, in one place.
 *
 * This was the middle of `terrainMaterial.ts` until something else had to
 * stand on the ground and be lit the same way (`terrainGrass.ts`). A grass
 * blade rooted in a tile has to take that tile's bake, that tile's torches,
 * that tile's cascade and that tile's roof, or the two disagree - and a
 * blade that is a shade off the ground it grows from is more obviously wrong
 * than either would be alone.
 *
 * The alternative was to copy the composite into the grass shader. It would
 * work today and drift the first time the lighting moves, which is the
 * stacking this project has already decided not to do again. So: one writer
 * of the ground's light, two callers.
 *
 * ## The contract
 *
 * A caller emits `terrainLightDeclarationsGlsl` once at fragment scope, then
 * `terrainSkyLightGlsl` and `terrainGroundLightGlsl` inside `main`, and lists
 * `TERRAIN_LIGHT_UNIFORMS` / `terrainLightSamplers` / `terrainLightDefines`
 * in its `ShaderMaterial` options and `bindTerrainLight` in its bind. Its
 * vertex stage must hand the fragment three varyings under these names:
 *
 * - `vWorldXZ`  - world xz, the dynamic-light and mask lookup.
 * - `vWorldPos` - world xyz, the cascade lookup.
 * - `vViewZ`    - view-space z, which cascade.
 *
 * Nothing here is terrain-mesh specific beyond those three.
 */

/**
 * The hue-preserving soft ceiling on the ground light sum, tiers >= 1
 * (ARCHITECTURE §4.5): linear below the knee, bent toward the asymptote
 * above it, so a torch core keeps its hue where the original's per-channel
 * clamp would have gone white.
 */
const GROUND_CEIL_KNEE = 0.85;
const GROUND_CEIL_ASYMPTOTE = 1.1;

export const TERRAIN_LIGHT_UNIFORMS = [
  'time',
  'linearOut',
  'linearLight',
  'keyGain',
  'roomParams',
  LIGHT_TINT_UNIFORM,
  ...TERRAIN_CSM_UNIFORMS,
] as const;

/**
 * Split in two because sampler order is load-bearing: `textures[N]` expands
 * to N consecutive units from its own slot, so a sampler array declared
 * before the cascades puts them on units it already uses, and two sampler
 * types on one unit is a GL draw error that renders the surface flat. A
 * caller lists these, then its own samplers, then `TERRAIN_CSM_SAMPLERS`,
 * then any sampler array last.
 *
 * The cloud field rides the packed-tile path only: the terrain's per-tile
 * fallback already spends every one of WebGL's guaranteed 16 fragment units.
 */
export function terrainLightSamplers(clouds: boolean): string[] {
  return ['dynamicLight', ...(clouds ? [CLOUD_NOISE_SAMPLER] : [])];
}

export const TERRAIN_CSM_SAMPLERS = ['csmShadowMap', 'csmShadowMapF'];

export function terrainLightDefines(): string[] {
  return terrainCsmDefines();
}

/** Uniform declarations, the tint helper, the cloud field and `csmShadow`. */
export function terrainLightDeclarationsGlsl(clouds: boolean): string {
  return `
  uniform float time;
  uniform float linearOut;
  uniform float linearLight;
  uniform float keyGain;
  uniform float ${LIGHT_TINT_UNIFORM};
  uniform vec3 roomParams; // x: a room is the active area, y: gain on the delta (AreaLook.candles), z: the room's share of the key on the bake
  uniform sampler2D dynamicLight;

  const float GROUND_CEIL_KNEE = ${GROUND_CEIL_KNEE.toFixed(3)};
  const float GROUND_CEIL_ROOM = ${(GROUND_CEIL_ASYMPTOTE - GROUND_CEIL_KNEE).toFixed(3)};

${lightTintGlsl()}
${clouds ? cloudFieldGlsl() : ''}

  ${terrainCsmGlsl()}
`;
}

/**
 * `dynLight` and `skyOpen`, in scope for whatever the caller puts between
 * this and the ground light (the terrain runs its weather overlays there).
 */
export function terrainSkyLightGlsl(): string {
  return `
    // One fetch, two jobs: rgb is the torches' radial light, and alpha is the
    // roof mask the ground overlays need (terrainMask.ts). Sampled before the
    // overlay so skyOpen is in scope for it.
    vec4 dynSample = texture2D(dynamicLight, (vWorldXZ + 0.5) / 256.0);
    vec3 dynLight = dynSample.rgb * 2.0 * roomParams.y;
    float skyOpen = dynSample.a;
`;
}

/**
 * The composite: `sunShadow`, `bakeShadow`, and the multipliers a surface
 * standing on this tile is lit by - `groundLit` for its own albedo and
 * `extraLit` for anything layered over it.
 *
 * `bake` is the expression holding the tile's authored light: the terrain
 * mesh carries it in `vColor.rgb`, the grass in a varying its vertex stage
 * fetched per instance. Same array either way (`unpackTerrainLight`).
 */
export function terrainGroundLightGlsl(o: {
  bake: string;
  clouds: boolean;
}): string {
  return `
    // The sun's cascaded shadow, weighted by the openness mask: both
    // interiors take their roof *out* of the shadow map on purpose so the
    // camera can see in (Lorencia lifts HOUSE_WALL05/06 past the caster
    // range, Devias fades its ceiling), so under a roof the cascades are not
    // the authority and the bake keeps the room it was authored for - until
    // the room itself is the active area (roomShadow): then its furniture
    // and figures cast on the floor under the roof as well.
    float sunShadow = mix(1.0, csmShadow(vWorldPos, vViewZ), max(skyOpen, roomParams.x));

    // A cloud takes the sun and leaves the sky share, the same one rule, on
    // the same openness mask the cascades use: a floor under a roof takes no
    // cloud shadow.
${o.clouds ? '    sunShadow *= mix(1.0, muCloudShadow(vWorldPos), skyOpen);' : ''}

    // The one shadow rule: a shadow removes the sun and leaves the sky share
    // (csmParams.y, the policy floor). 1 while Classic (no cascades).
    float bakeShadow = mix(csmParams.y, 1.0, sunShadow);

    // The ground light sum. Tiers >= 1 (linearLight): lin(bake) + delta, the
    // delta linear-authored and added after the decode. Classic: the
    // original's gamma-space bake + delta (ZzzLodTerrain.cpp:481-505),
    // untouched. The bake is the ground's key: inside a room it takes the
    // room's share of the level and the delta, the candles, does not (§13 F14).
    vec3 bake = max(${o.bake}, vec3(0.0));
    vec3 bakeLit = mix(bake, pow(bake, vec3(2.2)), linearLight) * roomParams.z;
    vec3 groundLight = max(bakeLit + dynLight, vec3(0.0));

    // The original clamps glColor at 1.0 per channel; tiers >= 1 bend the
    // sum toward the asymptote above the knee so a torch core keeps its hue.
    float peak = max(groundLight.r, max(groundLight.g, groundLight.b));
    float bent = peak > GROUND_CEIL_KNEE
      ? GROUND_CEIL_KNEE + GROUND_CEIL_ROOM * (1.0 - exp(-(peak - GROUND_CEIL_KNEE) / GROUND_CEIL_ROOM))
      : peak;
    vec3 softCeil = peak > 0.0 ? groundLight * (bent / peak) : groundLight;
    groundLight = mix(min(groundLight, vec3(1.0)), softCeil, linearLight);

    // The cascades cut the ceiled sum, not the bake under it (§13 F15): on
    // open ground the ceiling compresses lit and shadowed alike, so a factor
    // applied before it left a fraction of the policy's ratio. 1 on Classic.
    groundLight *= bakeShadow;

    // The map's level (2^ev) is the light's, applied after the clamps so
    // they keep the original's units; 1.0 on Classic.
    groundLight *= keyGain;

    // The overlays and the reflections below work in the art's display
    // space; the linear sum is re-encoded for them and the final decode
    // lands the product exactly at lin(texel) x groundLight.
    vec3 groundLit = mix(groundLight, pow(groundLight, vec3(1.0 / 2.2)), linearLight);
    vec3 extraLit = mix(dynLight, pow(dynLight * keyGain, vec3(1.0 / 2.2)), linearLight);
`;
}

/**
 * The clock the ground and everything rooted in it share, restarted per map
 * load by `createTerrainMaterial` (which is where the terrain's own `time`
 * has always restarted). The grass material is created after it and reads
 * the same epoch, so the two wind terms agree on which gust is where instead
 * of drifting apart by however long the map took to build.
 */
let clockEpoch = Date.now();

export function startTerrainClock(): void {
  clockEpoch = Date.now();
}

export function terrainClock(): number {
  return (Date.now() - clockEpoch) / 1000;
}

/** Everything `terrainLightDeclarationsGlsl` declared, per bind. */
export function bindTerrainLight(
  effect: Effect,
  scene: Scene,
  clouds: boolean
): void {
  effect.setFloat('time', terrainClock());
  effect.setFloat('linearOut', linearBufferActive(scene) ? 1 : 0);
  effect.setFloat('linearLight', linearLightActive(scene) ? 1 : 0);

  const look = lookDirector()?.state();

  // `sceneGain`, not `keyGain`: the ground is lit scene and takes an event's
  // dim; the effect cards drawn over it do not.
  effect.setFloat('keyGain', look?.key.sceneGain ?? 1);
  effect.setFloat3(
    'roomParams',
    look?.area ? 1 : 0,
    look?.key.emitterGain ?? 1,
    look?.key.roomShare ?? 1
  );
  effect.setFloat(LIGHT_TINT_UNIFORM, lightTintStrength());

  if (clouds) {
    bindClouds(effect, scene, {
      // Null while the map has no sky, and inside a room, where `applyArea`
      // clears it: the deck is not overhead, so it casts nothing.
      base: look?.profile.sky
        ? look.profile.sky.clouds ?? SKY_CLOUDS_DEFAULT
        : null,
      sunDirection: look?.key.direction ?? [0, -1, 0],
      sunElevationDeg: look?.profile.sun.elevationDeg ?? 45,
    });
  }

  effect.setTexture('dynamicLight', getTerrainLightTexture(scene));
  bindTerrainCsm(effect);
}

export { CLOUD_UNIFORMS };
