import { describe, expect, it } from 'vitest';
import { isSkinOrHairTexture } from './skinTexture';

describe('isSkinOrHairTexture', () => {
  it('catches the skin, level and hair textures the body parts carry', () => {
    // The three that put a head inside a dropped helm: HelmMale06 paints the
    // face with skin_barbarian_01, MaskHelmMale06 with level_man02 and hair_R.
    expect(isSkinOrHairTexture('skin_barbarian_01')).toBe(true);
    expect(isSkinOrHairTexture('level_man02')).toBe(true);
    expect(isSkinOrHairTexture('hair_R')).toBe(true);
  });

  it('leaves the armour and helmet textures alone', () => {
    expect(isSkinOrHairTexture('head_07')).toBe(false);
    expect(isSkinOrHairTexture('upper_07_m')).toBe(false);
    expect(isSkinOrHairTexture('hide_m')).toBe(false);
    expect(isSkinOrHairTexture('Sword01')).toBe(false);
  });
});
