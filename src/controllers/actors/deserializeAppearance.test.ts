import { describe, expect, it } from 'vitest';
import { CharacterClassNumber } from '../../core/types';
import { deserializeAppearance, isAppearanceBlank } from './deserializeAppearance';

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

/** An 18-byte preview: class in byte 0, slot 0 empty, slot 1 = group/num. */
function preview(cls: number, slot1Group: number, slot1Num: number) {
  const b = new Uint8Array(18).fill(0);
  b[0] = cls << 3;
  b[1] = 0xff;
  b[12] = 0xe0;
  b[2] = slot1Num;
  b[13] = (slot1Group << 5) & 0xff;
  return new DataView(b.buffer);
}

describe('Dark Raven in slot 1', () => {
  it('reads the Legendary Staff bits of a Dark Lord as the raven', () => {
    // The server writes group 13 << 5, which keeps only 5.
    const app = deserializeAppearance(preview(CharacterClassNumber.DarkLord, 13, 5));
    expect(app.rightHand).toMatchObject({ group: 13, num: 5 });
  });

  it('does the same for a Lord Emperor', () => {
    const app = deserializeAppearance(preview(CharacterClassNumber.LordEmperor, 13, 5));
    expect(app.rightHand).toMatchObject({ group: 13, num: 5 });
  });

  it('leaves 5/5 alone for other classes', () => {
    const app = deserializeAppearance(preview(CharacterClassNumber.DarkWizard, 5, 5));
    expect(app.rightHand).toMatchObject({ group: 5, num: 5 });
  });
});
