import type { LookProfile } from './profiles';
import { sunDirectionOf } from './profiles';

/**
 * The one shadow rule (ARCHITECTURE §3.2, §4.4): a shadow removes the sun, so
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
  /** PCF kernel scale (1) or PCSS light size (Ultra). */
  readonly softness: number;
};

export function shadowPolicyFor(
  profile: LookProfile,
  sunShare: number,
  pcss: boolean
): ShadowPolicy {
  const d = sunDirectionOf(profile.sun);
  const n = 1 / Math.hypot(d[0], d[1], d[2]);

  return {
    direction: [d[0] * n, d[1] * n, d[2] * n],
    strength: sunShare,
    softness: pcss ? 2 : 1,
  };
}
