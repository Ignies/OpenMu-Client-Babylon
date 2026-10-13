import { describe, expect, it, vi } from 'vitest';

vi.mock('../../modules/session', () => ({ Session: { isOffline: true } }));
vi.mock('../../modules/hero', () => ({ Hero: { sendAnimationRequest: () => {} } }));

const { finiteAngle, turnHeadBone } = await import('./headTrackingSystem');
const { Quaternion } = await import('../../controllers/render/babylon/exports');

describe('finiteAngle', () => {
  it('lets a real angle through and turns NaN or Infinity back to the rest pose', () => {
    expect(finiteAngle(0.4)).toBe(0.4);
    expect(finiteAngle(-1.2)).toBe(-1.2);
    expect(finiteAngle(NaN)).toBe(0);
    expect(finiteAngle(Infinity)).toBe(0);
    expect(finiteAngle(0 / 0)).toBe(0);
  });
});

describe('turnHeadBone', () => {
  it('turns on the clip pose, so a held clip does not spin the head', () => {
    const node = { rotationQuaternion: Quaternion.Identity() };
    const once = Quaternion.FromEulerAngles(-0.3, 0, -0.1);
    for (let i = 0; i < 5; i++) turnHeadBone(node, 0.3, 0.1);
    expect(node.rotationQuaternion.equalsWithEpsilon(once, 1e-6)).toBe(true);
  });

  it('takes a new clip pose and goes back to it when the turn ends', () => {
    const node = { rotationQuaternion: Quaternion.Identity() };
    turnHeadBone(node, 0.3, 0);
    const pose = Quaternion.FromEulerAngles(0, 0.5, 0);
    node.rotationQuaternion.copyFrom(pose);
    turnHeadBone(node, 0, 0);
    expect(node.rotationQuaternion.equalsWithEpsilon(pose, 1e-6)).toBe(true);
  });
});
