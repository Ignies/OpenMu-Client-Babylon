import { Constants, GeometryBufferRenderer } from '../libs/babylon/exports';
import { devQuery } from '../common/devSeams';

/**
 * The geometry buffer's colour formats. With none given Babylon makes both
 * targets RGBA32F, while its shader writes `vec4(viewZ, 0, 0, 1)` and
 * `vec4(normal, 1)` and every reader takes depth `.r` and normal `.xyz`: so
 * depth is R32F (the same bits) and the normals RGBA16F.
 *
 * Dev seam: `?gbufFormats=old` keeps Babylon's defaults.
 */
const LEAN_FORMATS = devQuery('gbufFormats') !== 'old';

export type GbufferFormats = {
  [key: number]: { textureType: number; textureFormat: number };
};

type FloatCaps = {
  textureFloat: boolean;
  textureFloatLinearFiltering: boolean;
  colorBufferFloat: boolean;
};

/**
 * The formats for `enableGeometryBufferRenderer`, or null for its defaults.
 * Only where Babylon would pick FLOAT itself, so the depth keeps its linear
 * filter; anywhere else the defaults stand as they were.
 */
export function gbufferFormats(
  webGLVersion: number,
  caps: FloatCaps,
  lean = LEAN_FORMATS
): GbufferFormats | null {
  if (!lean || webGLVersion < 2) return null;

  if (
    !caps.textureFloat ||
    !caps.textureFloatLinearFiltering ||
    !caps.colorBufferFloat
  ) {
    return null;
  }

  return {
    [GeometryBufferRenderer.DEPTH_TEXTURE_TYPE]: {
      textureType: Constants.TEXTURETYPE_FLOAT,
      textureFormat: Constants.TEXTUREFORMAT_R,
    },
    // Half float keeps the normals signed. RGB10_A2 or R11G11B10 would turn
    // on Babylon's unsigned encoding, and the ink and the AO combine read raw.
    [GeometryBufferRenderer.NORMAL_TEXTURE_TYPE]: {
      textureType: Constants.TEXTURETYPE_HALF_FLOAT,
      textureFormat: Constants.TEXTUREFORMAT_RGBA,
    },
  };
}
