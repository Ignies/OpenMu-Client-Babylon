import { describe, expect, it } from 'vitest';
import {
  FAR_ENTRY,
  UNKNOWN_ENTRY,
  countdownSeconds,
  nextPollAt,
  resolveOpening,
  rowText,
} from './scheduleClock';
import { EVENT_TEXT } from './recipes';

const NOW = 1_700_000_000_000;
const MIN = 60_000;

describe('event schedule', () => {
  describe('resolving the answer', () => {
    it('turns minutes into a moment on the shared clock', () => {
      expect(resolveOpening(12, false, NOW)).toEqual({
        opensAtServerMs: NOW + 12 * MIN,
        open: false,
        far: false,
      });
    });

    it('reads zero minutes as the gate being open now', () => {
      expect(resolveOpening(0, false, NOW)).toEqual({
        opensAtServerMs: NOW,
        open: true,
        far: false,
      });
    });

    it('reads a capped one-byte answer as a long wait, not as silence', () => {
      expect(resolveOpening(0xff, false, NOW)).toEqual(FAR_ENTRY);
    });

    it('turns a far row into a countdown once the figure drops under 255', () => {
      expect(resolveOpening(200, false, NOW)).toEqual({
        opensAtServerMs: NOW + 200 * MIN,
        open: false,
        far: false,
      });
    });

    it('reads the two-byte no-timetable sentinel as nothing known', () => {
      expect(resolveOpening(0xffff, true, NOW)).toEqual(UNKNOWN_ENTRY);
    });

    it('keeps a wide answer that a one-byte event would have capped', () => {
      expect(resolveOpening(0xff, true, NOW)).toEqual({
        opensAtServerMs: NOW + 255 * MIN,
        open: false,
        far: false,
      });
    });

    it('refuses a nonsense answer instead of counting down to the past', () => {
      expect(resolveOpening(-3, false, NOW)).toEqual(UNKNOWN_ENTRY);
      expect(resolveOpening(Number.NaN, false, NOW)).toEqual(UNKNOWN_ENTRY);
    });
  });

  describe('what a row prints', () => {
    const row = (entry: { open: boolean; far: boolean }, seconds: number | null) => ({
      ...entry,
      seconds,
    });

    it('prints the clock while a countdown runs', () => {
      expect(rowText(row({ open: false, far: false }, 305))).toBe('05:05');
    });

    it('says the gate is open', () => {
      expect(rowText(row({ open: true, far: false }, null))).toBe(EVENT_TEXT.timerOpen);
    });

    it('says the wait is long when the answer was capped', () => {
      expect(rowText(row({ open: false, far: true }, null))).toBe(EVENT_TEXT.timerFarOff);
    });

    it('dashes only when the server said nothing', () => {
      expect(rowText(row({ open: false, far: false }, null))).toBe('--:--');
    });
  });

  describe('the countdown', () => {
    it('counts whole seconds down to zero and stops there', () => {
      const entry = resolveOpening(2, false, NOW);
      expect(countdownSeconds(entry, NOW)).toBe(120);
      expect(countdownSeconds(entry, NOW + 119_500)).toBe(1);
      expect(countdownSeconds(entry, NOW + 2 * MIN)).toBe(0);
      expect(countdownSeconds(entry, NOW + 5 * MIN)).toBe(0);
    });

    it('has no clock while the gate is open, far off or unknown', () => {
      expect(countdownSeconds(resolveOpening(0, false, NOW), NOW)).toBeNull();
      expect(countdownSeconds(FAR_ENTRY, NOW)).toBeNull();
      expect(countdownSeconds(UNKNOWN_ENTRY, NOW)).toBeNull();
    });
  });

  describe('the back-off', () => {
    it('asks again in 30 s while nothing is known', () => {
      expect(nextPollAt(UNKNOWN_ENTRY, NOW)).toBe(NOW + 30_000);
    });

    it('backs off to five minutes once a countdown is known', () => {
      const entry = resolveOpening(90, false, NOW);
      expect(nextPollAt(entry, NOW)).toBe(NOW + 5 * MIN);
    });

    it('keeps asking on the same back-off while the answer is capped', () => {
      expect(nextPollAt(FAR_ENTRY, NOW)).toBe(NOW + 5 * MIN);
    });

    it('never looks past the moment the countdown hits zero', () => {
      const entry = resolveOpening(2, false, NOW);
      expect(nextPollAt(entry, NOW)).toBe(NOW + 2 * MIN);
    });

    it('keeps the 30 s floor when zero is nearer than that', () => {
      const entry = resolveOpening(1, false, NOW);
      expect(nextPollAt(entry, NOW + 45_000)).toBe(NOW + 75_000);
    });

    it('watches an open gate more closely than a counting one', () => {
      expect(nextPollAt(resolveOpening(0, false, NOW), NOW)).toBe(NOW + 60_000);
    });
  });
});
