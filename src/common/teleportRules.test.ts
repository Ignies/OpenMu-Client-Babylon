import { describe, expect, it } from 'vitest';
import {
  aimAlongFacing,
  pickAllySquare,
  teleportRefusal,
  teleportSquareOpen,
  TeleportGate,
  type TeleportCheck,
} from './teleportRules';
import { TW_ACTION, TW_HEIGHT, TW_NOMOVE, TW_SAFEZONE, TW_WATER } from './terrain/consts';

const check = (over: Partial<TeleportCheck> = {}): TeleportCheck => ({
  from: { x: 100, y: 100 },
  to: { x: 104, y: 102 },
  range: 6,
  flag: 0,
  heroInSafeZone: false,
  disabled: false,
  holdingItem: false,
  busy: false,
  sinceMapChange: 60,
  ...over,
});

describe('TeleportGate', () => {
  it('is pending from the request until the same-map answer', () => {
    const gate = new TeleportGate();
    gate.begin({ x: 1, y: 1 }, { x: 4, y: 4 }, 10);
    expect(gate.isPending(10.5)).toBe(true);
    expect(gate.onMapChanged(false, 4, 4, 11.8)).toBe('confirm');
    expect(gate.isPending(11.9)).toBe(false);
  });

  it('reads an answer at another square as a refusal', () => {
    const gate = new TeleportGate();
    gate.begin({ x: 1, y: 1 }, { x: 4, y: 4 }, 10);
    expect(gate.onMapChanged(false, 1, 1, 10.2)).toBe('refused');
    expect(gate.isPending(10.3)).toBe(false);
  });

  it('drops a request nobody answered after the timeout', () => {
    const gate = new TeleportGate();
    gate.begin({ x: 1, y: 1 }, { x: 4, y: 4 }, 10);
    expect(gate.isPending(12.9)).toBe(true);
    expect(gate.isPending(13)).toBe(false);
    expect(gate.onMapChanged(false, 4, 4, 13.5)).toBe('unasked');
  });

  it('treats a same-map move with nothing pending as unasked', () => {
    expect(new TeleportGate().onMapChanged(false, 7, 7, 1)).toBe('unasked');
  });

  it('stamps a real map change and clears the pending teleport', () => {
    const gate = new TeleportGate();
    gate.begin({ x: 1, y: 1 }, { x: 4, y: 4 }, 10);
    expect(gate.onMapChanged(true, 4, 4, 11)).toBe('warp');
    expect(gate.isPending(11)).toBe(false);
    expect(gate.sinceMapChange(12)).toBe(1);
  });
});

describe('teleportRefusal', () => {
  it('lets an open square in range through', () => {
    expect(teleportRefusal(check())).toBeNull();
  });

  it('refuses while a teleport is pending: the second of two quick casts', () => {
    expect(teleportRefusal(check({ busy: true }))).toBe('busy');
  });

  it('uses the square range around the own tile, not a circle', () => {
    expect(teleportRefusal(check({ to: { x: 106, y: 106 } }))).toBeNull();
    expect(teleportRefusal(check({ to: { x: 107, y: 100 } }))).toBe('range');
  });

  it('refuses the effects, a held item, a safe zone and the moments after a warp', () => {
    expect(teleportRefusal(check({ disabled: true }))).toBe('disabled');
    expect(teleportRefusal(check({ holdingItem: true }))).toBe('holdingItem');
    expect(teleportRefusal(check({ heroInSafeZone: true }))).toBe('safeZone');
    expect(teleportRefusal(check({ sinceMapChange: 2.9 }))).toBe('mapChange');
  });

  it('refuses a square either the original or OpenMU would not stand on', () => {
    expect(teleportSquareOpen(0)).toBe(true);
    expect(teleportSquareOpen(TW_SAFEZONE)).toBe(false);
    expect(teleportSquareOpen(TW_NOMOVE)).toBe(false);
    expect(teleportSquareOpen(TW_WATER)).toBe(false);
    // The original takes these, OpenMU's walk map does not.
    expect(teleportSquareOpen(TW_ACTION)).toBe(false);
    expect(teleportSquareOpen(TW_HEIGHT)).toBe(false);
  });
});

describe('pickAllySquare', () => {
  it('never picks the caster square and only lands on an open one', () => {
    const rolls = [0.5, 0.5, 0, 0, 0.9, 0.9];
    let i = 0;
    const blocked = (x: number, y: number) => (x === 9 && y === 9 ? TW_NOMOVE : 0);
    expect(pickAllySquare({ x: 10, y: 10 }, blocked, () => rolls[i++])).toEqual({ x: 11, y: 11 });
  });

  it('gives up after ten blocked draws', () => {
    expect(pickAllySquare({ x: 10, y: 10 }, () => TW_NOMOVE, () => 0)).toBeNull();
  });
});

describe('aimAlongFacing', () => {
  it('takes the furthest open square ahead, inside the square range', () => {
    const open = (x: number) => x <= 104;
    expect(aimAlongFacing({ x: 100, y: 100 }, { x: 1, z: 0 }, 6, open)).toEqual({ x: 104, y: 100 });
    const diag = Math.SQRT1_2;
    expect(aimAlongFacing({ x: 100, y: 100 }, { x: diag, z: diag }, 6, () => true)).toEqual({ x: 106, y: 106 });
  });

  it('gives up when nothing ahead is open', () => {
    expect(aimAlongFacing({ x: 100, y: 100 }, { x: 0, z: -1 }, 6, () => false)).toBeNull();
  });
});
