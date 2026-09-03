import { describe, expect, it } from 'vitest';
import { DuelStartResultDuelStartResultTypeEnum as DuelStartResult } from '../common/packets/ServerToClientPackets';
import {
  duelStartFailureKey,
  orientPair,
  orientValues,
  presentSpectators,
  roomCountOf,
} from './duelRules';

describe('orientPair', () => {
  it('matches the stored order directly', () => {
    expect(orientPair(10, 20, 10, 20)).toBe('direct');
  });

  it('detects the swapped broadcast order', () => {
    expect(orientPair(10, 20, 20, 10)).toBe('swapped');
  });

  it('ignores a packet for another duel', () => {
    expect(orientPair(10, 20, 30, 40)).toBeNull();
  });

  it('masks the 0x8000 self bit on either side', () => {
    expect(orientPair(0x8000 | 10, 20, 10, 0x8000 | 20)).toBe('direct');
    expect(orientPair(10, 20, 0x8000 | 20, 10)).toBe('swapped');
  });
});

describe('orientValues', () => {
  it('keeps direct pairs and flips swapped ones', () => {
    expect(orientValues('direct', 1, 2)).toEqual([1, 2]);
    expect(orientValues('swapped', 1, 2)).toEqual([2, 1]);
  });
});

describe('roomCountOf', () => {
  it('reads 4 rooms out of the fixed 92-byte packet', () => {
    expect(roomCountOf(92)).toBe(4);
  });

  it('never goes negative on a short packet', () => {
    expect(roomCountOf(4)).toBe(0);
    expect(roomCountOf(0)).toBe(0);
  });
});

describe('presentSpectators', () => {
  it('drops empty and NUL-padded slots (OpenMU never fills Count)', () => {
    const slots = ['Alice\0\0\0', '', 'Bob', '\0\0', '  ', 'Cara'];
    expect(presentSpectators(slots)).toEqual(['Alice', 'Bob', 'Cara']);
  });

  it('caps at the 10 wire slots', () => {
    const slots = Array.from({ length: 12 }, (_, i) => `P${i}`);
    expect(presentSpectators(slots)).toHaveLength(10);
  });
});

describe('duelStartFailureKey', () => {
  it('is null on success', () => {
    expect(duelStartFailureKey(DuelStartResult.Success)).toBeNull();
  });

  it('maps the known failures', () => {
    expect(duelStartFailureKey(DuelStartResult.Refused)).toBe('duel.refused');
    expect(duelStartFailureKey(DuelStartResult.FailedByTooLowLevel)).toBe('duel.failedLevel');
    expect(duelStartFailureKey(DuelStartResult.FailedByNotEnoughMoney)).toBe('duel.failedZen');
    expect(duelStartFailureKey(DuelStartResult.FailedByNoFreeRoom)).toBe('duel.failedRoom');
  });

  it('falls back to the generic error for the rest', () => {
    expect(duelStartFailureKey(DuelStartResult.FailedByError)).toBe('duel.failedError');
    expect(duelStartFailureKey(DuelStartResult.FailedBy_)).toBe('duel.failedError');
  });
});
