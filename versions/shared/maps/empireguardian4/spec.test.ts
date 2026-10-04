import { afterEach, describe, expect, it } from 'vitest';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import { EMPIRE_GUARDIAN_4_CHANDELIER, EMPIRE_GUARDIAN_4_WALL_TORCH } from './spec';

describe('the fortress torch and chandelier lights', () => {
  afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

  it('light the ground on Enhanced (the fortressLights improvement)', () => {
    expect(EMPIRE_GUARDIAN_4_WALL_TORCH.terrain?.range).toBe(2);
    expect(EMPIRE_GUARDIAN_4_CHANDELIER.terrain?.range).toBe(5);
  });

  // Case 37 is a flare alone, case 157 fire and smoke (GMEmpireGuardian4.cpp:864-875, :1050-1098).
  it('light nothing on Classic; the torch keeps its flare', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(EMPIRE_GUARDIAN_4_WALL_TORCH.terrain).toBeUndefined();
    expect(EMPIRE_GUARDIAN_4_CHANDELIER.terrain).toBeUndefined();
    expect(EMPIRE_GUARDIAN_4_WALL_TORCH.sprite?.scale).toBe(4);
  });
});
