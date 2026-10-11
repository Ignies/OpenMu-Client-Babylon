import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import { LOGIN_WALL_TORCH } from '@/controllers/lighting/mapObjectLights';
import { EMPIRE_GUARDIAN_4_CHANDELIER, EMPIRE_GUARDIAN_4_LIGHTS, EMPIRE_GUARDIAN_4_WALL_TORCH } from './spec';

const brazier = (type: number) => EMPIRE_GUARDIAN_4_LIGHTS[type]?.[0];

/** A flare sheet's mean colour, 0-1 a channel, from its pixels (an OZJ is a JPEG behind 24 bytes). */
async function meanColor(file: string): Promise<number[]> {
  const jpeg = readFileSync(file).subarray(24);
  const { data, info } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true });
  const sum = [0, 0, 0];
  for (let i = 0; i < data.length; i += info.channels) for (let c = 0; c < 3; c++) sum[c] += data[i + c];
  return sum.map(v => v / (info.width * info.height * 255));
}

describe('the fortress braziers (79, 80), also the login scene\'s', () => {
  afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

  it('light the ground and 79 breathes on Enhanced (the fortressLights improvement)', () => {
    expect(brazier(79)?.terrain?.range).toBe(3);
    expect(brazier(80)?.terrain?.range).toBe(2);
    expect(brazier(79)?.sprite?.pulse).toBeDefined();
  });

  // Each draws a BITMAP_LIGHT sprite and MoveObject only hides its mesh (GMEmpireGuardian4.cpp:212-226, :917-948).
  it('light nothing on Classic; 79\'s flare is steady, 80 keeps its own pulse', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(brazier(79)?.sprite).toEqual({ scale: 2, color: [1, 0.2, 0] });
    expect(brazier(80)?.sprite).toEqual({ scale: 8, color: [0.1, 0.1, 0.5], pulse: { speed: 0.04, amount: 0.3, base: 0.4 } });
    expect(brazier(79)?.terrain).toBeUndefined();
    expect(brazier(80)?.terrain).toBeUndefined();
  });
});

describe('the fortress torch and chandelier lights', () => {
  afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

  it('light the ground and the torch burns warm on Enhanced (the fortressLights improvement)', () => {
    expect(EMPIRE_GUARDIAN_4_WALL_TORCH.terrain?.range).toBe(2);
    expect(EMPIRE_GUARDIAN_4_CHANDELIER.terrain?.range).toBe(5);
    // The login scene's lit torch, the same flare.
    for (const torch of [EMPIRE_GUARDIAN_4_WALL_TORCH, LOGIN_WALL_TORCH]) {
      expect(torch.sprite).toMatchObject({ texture: 'flare' });
      expect(torch.sprite?.color).toEqual(EMPIRE_GUARDIAN_4_WALL_TORCH.sprite?.color);
    }
  });

  // The lit torches were tuned as [1, 0.45, 0.15] over flare01.jpg; over Flare.jpg, an orange star already, the
  // same tint came out darker and redder. Theirs gives Flare.jpg the mean colour that one gave flare01.jpg.
  it.skipIf(!existsSync('Data/Effect'))('tint Flare.jpg to the mean colour the warm torch had on flare01.jpg', async () => {
    const flare01 = await meanColor('Data/Effect/flare01.OZJ');
    const flare = await meanColor('Data/Effect/Flare.OZJ');
    const tint = [1, 0.45, 0.15].map((k, c) => (flare01[c] * k) / flare[c]);
    for (const torch of [EMPIRE_GUARDIAN_4_WALL_TORCH, LOGIN_WALL_TORCH]) {
      expect(torch.sprite?.color).toEqual(tint.map(v => expect.closeTo(v, 2)));
    }
  });

  // Case 37 is a grey BITMAP_FLARE (Flare.jpg) alone, case 157 fire and smoke (GMEmpireGuardian4.cpp:864-875, :1050-1098).
  it('light nothing on Classic; the torch keeps its grey flare', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(EMPIRE_GUARDIAN_4_WALL_TORCH.terrain).toBeUndefined();
    expect(EMPIRE_GUARDIAN_4_CHANDELIER.terrain).toBeUndefined();
    expect(EMPIRE_GUARDIAN_4_WALL_TORCH.sprite).toMatchObject({ scale: 4, color: [0.7, 0.7, 0.7], texture: 'flare' });
  });
});
