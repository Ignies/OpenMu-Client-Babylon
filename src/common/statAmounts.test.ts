import { describe, expect, it } from 'vitest';
import { clampAmount, MAX_AMOUNT, nextStep } from './statAmounts';

describe('stat point amount', () => {
  it('keeps a sane amount as it is', () => {
    expect(clampAmount(200, 500)).toBe(200);
  });

  it('never asks for more points than the character has', () => {
    expect(clampAmount(200, 37)).toBe(37);
    expect(clampAmount(9999, 1)).toBe(1);
  });

  it('treats an empty or silly box as one point', () => {
    expect(clampAmount(0, 500)).toBe(1);
    expect(clampAmount(-5, 500)).toBe(1);
    expect(clampAmount(1.9, 500)).toBe(1);
  });

  it('refuses to start with no points left', () => {
    expect(clampAmount(10, 0)).toBe(0);
    expect(clampAmount(10, -3)).toBe(0);
  });

  it('caps one run', () => {
    expect(clampAmount(999999, 999999)).toBe(MAX_AMOUNT);
  });

  it('answers nothing to a broken number', () => {
    expect(clampAmount(NaN, 500)).toBe(0);
  });
});

describe('stat point run', () => {
  it('sends while there is something to add', () => {
    expect(nextStep({ added: 0, wanted: 200 }, 500)).toBe('send');
    expect(nextStep({ added: 199, wanted: 200 }, 500)).toBe('send');
  });

  it('stops on the last confirmed point', () => {
    expect(nextStep({ added: 200, wanted: 200 }, 500)).toBe('done');
  });

  it('never overshoots when the server answers with more than one', () => {
    expect(nextStep({ added: 205, wanted: 200 }, 500)).toBe('done');
  });

  it('stops when the points run out', () => {
    expect(nextStep({ added: 37, wanted: 200 }, 0)).toBe('spent');
  });
});
