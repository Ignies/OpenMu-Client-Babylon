import { describe, expect, it } from 'vitest';
import { Constants, GeometryBufferRenderer } from '../libs/babylon/exports';
import { gbufferFormats } from './gbufferFormats';

const FLOAT_CAPS = {
  textureFloat: true,
  textureFloatLinearFiltering: true,
  colorBufferFloat: true,
};

describe('gbufferFormats', () => {
  it('gives depth R32F and the normals RGBA16F on WebGL2', () => {
    expect(gbufferFormats(2, FLOAT_CAPS, true)).toEqual({
      [GeometryBufferRenderer.DEPTH_TEXTURE_TYPE]: {
        textureType: Constants.TEXTURETYPE_FLOAT,
        textureFormat: Constants.TEXTUREFORMAT_R,
      },
      [GeometryBufferRenderer.NORMAL_TEXTURE_TYPE]: {
        textureType: Constants.TEXTURETYPE_HALF_FLOAT,
        textureFormat: Constants.TEXTUREFORMAT_RGBA,
      },
    });
  });

  it('leaves every other target to the defaults', () => {
    const formats = gbufferFormats(2, FLOAT_CAPS, true) ?? {};

    expect(Object.keys(formats).map(Number).sort()).toEqual([
      GeometryBufferRenderer.DEPTH_TEXTURE_TYPE,
      GeometryBufferRenderer.NORMAL_TEXTURE_TYPE,
    ]);
  });

  it('keeps the defaults behind the seam', () => {
    expect(gbufferFormats(2, FLOAT_CAPS, false)).toBeNull();
  });

  it('keeps the defaults where Babylon would not pick FLOAT itself', () => {
    expect(gbufferFormats(1, FLOAT_CAPS, true)).toBeNull();

    for (const missing of [
      'textureFloat',
      'textureFloatLinearFiltering',
      'colorBufferFloat',
    ] as const) {
      const caps = { ...FLOAT_CAPS, [missing]: false };

      expect(gbufferFormats(2, caps, true)).toBeNull();
    }
  });
});

/**
 * SSAO2 binds `textures[0]` and `[1]` as depth and normal, and Babylon reads
 * the normal's type at index NORMAL_TEXTURE_TYPE to decide whether to encode
 * normals unsigned.
 */
describe('the Babylon surface the formats stand on', () => {
  it('keeps depth and normal at indices 0 and 1', () => {
    expect(GeometryBufferRenderer.DEPTH_TEXTURE_TYPE).toBe(0);
    expect(GeometryBufferRenderer.NORMAL_TEXTURE_TYPE).toBe(1);
  });

  it('keeps the normals signed', () => {
    const normal = gbufferFormats(2, FLOAT_CAPS, true)?.[
      GeometryBufferRenderer.NORMAL_TEXTURE_TYPE
    ];

    expect([
      Constants.TEXTURETYPE_UNSIGNED_INT_2_10_10_10_REV,
      Constants.TEXTURETYPE_UNSIGNED_INT_10F_11F_11F_REV,
    ]).not.toContain(normal?.textureType);
  });
});
