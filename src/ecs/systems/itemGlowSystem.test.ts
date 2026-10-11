import { describe, expect, it, vi } from 'vitest';
import type { Gear } from '../../controllers/actors';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { gearKeyChanged } = await import('./itemGlowSystem');

const sword = { group: 0, num: 5, lvl: 9 };

describe('gearKeyChanged', () => {
  it('reports a change only when what the lamp reads changes', () => {
    const key: number[] = [];
    const gear: Gear = { rightHand: { ...sword } } as Gear;

    expect(gearKeyChanged(key, gear, 1, true)).toBe(true);
    expect(gearKeyChanged(key, gear, 1, true)).toBe(false);

    gear.rightHand = { ...sword, lvl: 11 };
    expect(gearKeyChanged(key, gear, 1, true)).toBe(true);

    gear.rightHand = { ...sword, lvl: 11, isExcellent: true };
    expect(gearKeyChanged(key, gear, 1, true)).toBe(true);

    gear.rightHand = { ...sword, lvl: 11, isExcellent: true, socketCount: 2 };
    expect(gearKeyChanged(key, gear, 1, true)).toBe(true);

    // A re-apply of the same gear (a warp) and the gear-effects switch count too.
    expect(gearKeyChanged(key, gear, 2, true)).toBe(true);
    expect(gearKeyChanged(key, gear, 2, false)).toBe(true);
    expect(gearKeyChanged(key, gear, 2, false)).toBe(false);
  });

  it('tells an empty slot from a piece moved to another slot', () => {
    const key: number[] = [];
    expect(gearKeyChanged(key, { rightHand: sword } as Gear, 0, true)).toBe(true);
    expect(gearKeyChanged(key, { leftHand: sword } as Gear, 0, true)).toBe(true);
    expect(gearKeyChanged(key, {} as Gear, 0, true)).toBe(true);
  });
});
