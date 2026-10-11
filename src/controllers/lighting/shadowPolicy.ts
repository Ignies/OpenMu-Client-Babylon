import type { LookProfile } from './profiles';
import { sunDirectionOf } from './profiles';
import { DEFAULT_SUN_DIRECTION } from './keyRig';

/**
 * The one shadow rule: a shadow removes the sun, so
 * a shadowed surface keeps the sky share of the key. Three receivers read it -
 * the CSM (`darkness` 0: the sun is cut whole, the sky untouched), the terrain
 * hook (bake floor `1 - strength` in linear) and the Classic blobs (their own
 * 0.65 alpha, unchanged).
 */
export type ShadowPolicy = {
  /** Unit direction the light travels. */
  readonly direction: readonly [number, number, number];
  /** What a shadow cuts, 0..1: the sun share of the key. */
  readonly strength: number;
  /** PCF kernel scale (1) or the PCSS light size in shadow-map UV (Ultra). */
  readonly softness: number;
  /**
   * Who enters the shadow map (§13 F1). The lightmap already bakes every
   * static object's shadow, so `dynamic` keeps the map objects out and admits
   * only what moves; `all` is for a room, where the bake is flat.
   */
  readonly casters: 'dynamic' | 'all';
};

export type ShadowCasters = ShadowPolicy['casters'];

/**
 * Babylon's 0.1 default blurs a figure's shadow to twice the PCF width,
 * which put Ultra 6 % off Enhanced on p5/p50 for the same frame.
 */
const PCSS_LIGHT_SIZE = 0.04;

function unit(d: readonly [number, number, number], out: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const n = 1 / Math.hypot(d[0], d[1], d[2]);

  out[0] = d[0] * n;
  out[1] = d[1] * n;
  out[2] = d[2] * n;
  return out;
}

/** Classic: the rig never moves, so the blobs keep the lean they always had. */
export const CLASSIC_SHADOW_POLICY: ShadowPolicy = {
  direction: unit(DEFAULT_SUN_DIRECTION),
  strength: 0,
  softness: 1,
  casters: 'all',
};

/** A policy the caller keeps and `shadowPolicyFor` rewrites. */
export type KeptShadowPolicy = {
  -readonly [K in keyof ShadowPolicy]: K extends 'direction' ? [number, number, number] : ShadowPolicy[K];
};

export function shadowPolicyFor(
  profile: LookProfile,
  pcss: boolean,
  casters: ShadowCasters,
  out: KeptShadowPolicy = { direction: [0, 0, 0], strength: 0, softness: 1, casters }
): ShadowPolicy {
  unit(sunDirectionOf(profile.sun, out.direction), out.direction);
  out.strength = profile.sun.share;
  out.softness = pcss ? PCSS_LIGHT_SIZE : 1;
  out.casters = casters;
  return out;
}
