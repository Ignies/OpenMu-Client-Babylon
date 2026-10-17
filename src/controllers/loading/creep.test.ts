import { afterEach, describe, expect, it, vi } from 'vitest';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';

vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/' });
const { CREEP_CAP, barMotion, creepTarget } = await import('./creep');

afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

describe('the creeping load bar (loadBarCreep)', () => {
  it('heads past the real value, short of the cap, and only forward', () => {
    expect(creepTarget(0)).toBeCloseTo(CREEP_CAP * 0.2);
    expect(creepTarget(0.5)).toBeGreaterThan(0.5);
    expect(creepTarget(0.96)).toBeLessThan(CREEP_CAP);
    expect(creepTarget(0.98)).toBe(0.98);
    expect(creepTarget(1)).toBe(1);
    expect(creepTarget(Number.NaN)).toBeCloseTo(CREEP_CAP * 0.2);
    for (let p = 0; p < 1; p += 0.05) expect(creepTarget(p + 0.05)).toBeGreaterThanOrEqual(creepTarget(p));
  });

  it('creeps once armed on Enhanced, and fills at once when done', () => {
    expect(barMotion(0.5, false)).toEqual({ shown: 0.5 });
    expect(barMotion(0.5, true).shown).toBeGreaterThan(0.5);
    expect(barMotion(0.5, true).transition).toMatch(/^transform 10s/);
    expect(barMotion(1, true)).toEqual({ shown: 1, transition: 'transform 0.25s ease-out' });
  });

  it('shows the report as it is on Classic', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(barMotion(0.5, true)).toEqual({ shown: 0.5 });
  });
});
