import { afterEach, describe, expect, it } from 'vitest';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import { EMPIRE_GUARDIAN_4_CHANDELIER, EMPIRE_GUARDIAN_4_LIGHTS, EMPIRE_GUARDIAN_4_WALL_TORCH } from './spec';

const brazier = (type: number) => EMPIRE_GUARDIAN_4_LIGHTS[type]?.[0];

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
    expect(EMPIRE_GUARDIAN_4_WALL_TORCH.sprite?.color).toEqual([1, 0.45, 0.15]);
  });

  // Case 37 is a grey flare alone, case 157 fire and smoke (GMEmpireGuardian4.cpp:864-875, :1050-1098).
  it('light nothing on Classic; the torch keeps its grey flare', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(EMPIRE_GUARDIAN_4_WALL_TORCH.terrain).toBeUndefined();
    expect(EMPIRE_GUARDIAN_4_CHANDELIER.terrain).toBeUndefined();
    expect(EMPIRE_GUARDIAN_4_WALL_TORCH.sprite).toMatchObject({ scale: 4, color: [0.7, 0.7, 0.7] });
  });
});
