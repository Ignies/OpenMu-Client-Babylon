import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { changeUpFlarePoint, showMasterLevelUp } = await import('./masterLevelUpLook');
const { effects } = await import('@/controllers/fx');

const at = { x: 0, y: 0, z: 0 };
const target = { x: 1000, y: 2000, z: 50 };

// BITMAP_FLARE sub45 / sub46 (ZzzEffectJoint.cpp:5614-5745), in MU units: the head starts on the
// spot 100 up, swirls out to 150 around it and closes back on the body.
describe('changeUpFlarePoint', () => {
  it('starts on the spot it was made, 100 up', () => {
    changeUpFlarePoint(at, 30, 0, 4, 1234, target, target);
    expect(at.x).toBeCloseTo(1000, 0);
    expect(at.y).toBeCloseTo(2000, 0);
    expect(at.z).toBeCloseTo(150, 0);
  });

  it('swirls out around it halfway', () => {
    changeUpFlarePoint(at, 15, 0, 4, 1234, target, target);
    const off = Math.hypot(at.x - 1000, at.y - 2000, at.z - 150);
    expect(off).toBeGreaterThan(90);
    expect(off).toBeLessThan(150);
  });

  it('ends on the body, within its 25 wobble', () => {
    const body = { x: 1100, y: 2100, z: 60 };
    changeUpFlarePoint(at, 0, 0, 4, 1234, target, body);
    expect(Math.hypot(at.x - 1100, at.y - 2100, at.z - 160)).toBeLessThan(25 * Math.sqrt(3) + 0.01);
  });
});

// Receive_Master_LevelUp (WSclient.cpp:8229-8235): one sub45 and nineteen sub46 flare joints.
describe('showMasterLevelUp', () => {
  it('spawns twenty flare joints on the hero', () => {
    const spawn = vi.spyOn(effects, 'spawn').mockReturnValue({ stop() {}, alive: false } as never);
    const hero = { transform: { pos: { x: 10, y: 0.5, z: 20 } } };
    showMasterLevelUp({} as never, hero as never);
    const joints = spawn.mock.calls.filter(([name]) => name === 'joint');
    expect(joints).toHaveLength(20);
    spawn.mockRestore();
  });
});
