import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  formatExpPercent,
  formatExpProgress,
  formatRoundTrip,
  formatTimeToLevel,
} from './hudFormat';

describe('hud formatting', () => {
  it('prints the experience percentage to two decimals', () => {
    expect(formatExpPercent(0.374231)).toBe('37.42 %');
    expect(formatExpPercent(0)).toBe('0.00 %');
    expect(formatExpPercent(1)).toBe('100.00 %');
  });

  it('clamps a percentage the server pushed out of range', () => {
    expect(formatExpPercent(-0.5)).toBe('0.00 %');
    expect(formatExpPercent(2)).toBe('100.00 %');
  });

  it('groups both experience figures the same way', () => {
    expect(formatExpProgress(1234567, 3300000)).toBe('1,234,567 / 3,300,000');
    expect(formatExpProgress(0, 100)).toBe('0 / 100');
  });

  it('floors a fractional experience value instead of printing decimals', () => {
    expect(formatExpProgress(1234.9, 3300)).toBe('1,234 / 3,300');
  });

  it('drops the hours from a span under an hour', () => {
    expect(formatDuration(7_804_000)).toBe('2:10:04');
    expect(formatDuration(64_000)).toBe('01:04');
    expect(formatDuration(-5)).toBe('00:00');
  });

  it('shows a dash for the time to level while no rate is known', () => {
    expect(formatTimeToLevel(null)).toBe('-');
    expect(formatTimeToLevel(7_804_000)).toBe('2:10:04');
  });

  it('shows a dash for the round trip until the first sample', () => {
    expect(formatRoundTrip(null)).toBe('-');
    expect(formatRoundTrip(37.6)).toBe('38 ms');
  });
});
