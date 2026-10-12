import { describe, expect, it, vi } from 'vitest';

vi.mock('../../modules/session', () => ({ Session: { isOffline: true } }));
vi.mock('../../modules/hero', () => ({ Hero: { sendAnimationRequest: () => {} } }));

const { finiteAngle } = await import('./headTrackingSystem');

describe('finiteAngle', () => {
  it('lets a real angle through and turns NaN or Infinity back to the rest pose', () => {
    expect(finiteAngle(0.4)).toBe(0.4);
    expect(finiteAngle(-1.2)).toBe(-1.2);
    expect(finiteAngle(NaN)).toBe(0);
    expect(finiteAngle(Infinity)).toBe(0);
    expect(finiteAngle(0 / 0)).toBe(0);
  });
});
