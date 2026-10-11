import { describe, expect, it } from 'vitest';
import { isAppearanceBlank } from './deserializeAppearance';

const view = (...bytes: number[]) => new DataView(new Uint8Array(bytes).buffer);

describe('isAppearanceBlank', () => {
  it('treats an empty, all-zero or all-0xFF preview as blank', () => {
    expect(isAppearanceBlank(view(0, 0, 0))).toBe(true);
    expect(isAppearanceBlank(view(0xff, 0xff, 0xff))).toBe(true);
    expect(isAppearanceBlank(view())).toBe(true);
  });

  it('keeps a real preview', () => {
    expect(isAppearanceBlank(view(0xc0, 0xff, 0xff))).toBe(false);
    expect(isAppearanceBlank(view(0xff, 0xff, 0xf3))).toBe(false);
  });
});
