import { describe, expect, it, vi } from 'vitest';

const remembered = new Map<unknown, string>();
vi.mock('./texturePacks', () => ({
  textureLabel: (texture: unknown) => remembered.get(texture) ?? null,
}));

const { textureSourceName } = await import('./pbrMaps');

function texture(label: string | undefined, name = '') {
  return { name, getInternalTexture: () => ({ label }) } as never;
}

describe('textureSourceName', () => {
  it('reads the GLB label', () => {
    expect(textureSourceName(texture('Object3/snotice'))).toBe('snotice');
  });

  it('keeps the converter name while a pack image is loading', () => {
    // updateURL has replaced the internal texture: its label is the pack URL
    // until the image arrives. The sign plates read the name in that window.
    const swapping = texture('./packs/upscaled-512/Object3/snotice.ozj.webp');
    remembered.set(swapping, 'Object3/snotice');

    expect(textureSourceName(swapping)).toBe('snotice');
  });

  it('falls back to the texture name when there is no label', () => {
    expect(textureSourceName(texture(undefined, 'Object1/notice'))).toBe('notice');
  });
});
