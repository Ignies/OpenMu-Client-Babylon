import { devQueryNumber } from '../common/devSeams';
import { lightingTier } from '../common/lightingQuality';

/**
 * Coloured light bleeding into what it touches (sky_atmospherics
 * ARCHITECTURE §2). A pure multiply moves level, not hue: a torch beside a
 * blue tile reads as nothing. This pulls a lit surface toward the
 * illuminant's hue at its luminance, so the stone by a fire goes warm and
 * the fire's colour is in the scene rather than only in the sprite.
 *
 * Three properties keep it off every level gate and out of Classic:
 * a neutral light has no chroma so it tints nothing (the key is neutral by
 * lighting_polish §4 principle 4, which makes the weight the coloured
 * emitters' share of the sum without a second term); the result carries the
 * input's luma exactly; and the strength is one scalar that is 0 on Classic.
 */

/** Rec709 luma, the one place the weights are written. */
export const LUMA_GLSL = 'vec3(0.2126, 0.7152, 0.0722)';

/** How wide in chroma a light must be to earn the full weight (1/1.6 = 0.63). */
const TINT_CHROMA = 1.6;

/** The pull at full chroma. A MU torch is about 0.45 wide, so it takes 0.72 of it. */
const TINT_STRENGTH = 0.35;

export const LIGHT_TINT_UNIFORM = 'muTint';

const tintDev = devQueryNumber('tint');

/** 0 on Classic and with the seam off: the shader function returns its argument. */
export function lightTintStrength(): number {
  if (tintDev !== null) return Math.max(0, tintDev);

  return lightingTier() ? TINT_STRENGTH : 0;
}

/**
 * `vec3 muLightTint(vec3 lit, vec3 light)` plus the uniform it reads. The
 * caller declares `${LIGHT_TINT_UNIFORM}` itself: the terrain lists it among
 * its uniforms, the item materials add it through `AddUniform`.
 */
export function lightTintGlsl(): string {
  return `
  vec3 muLightTint(vec3 lit, vec3 light) {
    float lum = dot(light, ${LUMA_GLSL});
    if (${LIGHT_TINT_UNIFORM} <= 0.0 || lum <= 1e-4) return lit;

    vec3 hue = light / lum;
    float chroma = max(hue.r, max(hue.g, hue.b)) - min(hue.r, min(hue.g, hue.b));
    float w = min(chroma * ${TINT_CHROMA.toFixed(2)}, 1.0) * ${LIGHT_TINT_UNIFORM};

    return mix(lit, dot(lit, ${LUMA_GLSL}) * hue, w);
  }
`;
}
