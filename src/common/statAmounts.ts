/**
 * The arithmetic behind the character info window's amount box: what a box
 * may ask for, and what a run does next. Pure, so both can be checked
 * without a socket; the run itself is `statAllocation.ts`.
 */

/** Ceiling on one run, and on what the amount box accepts. */
export const MAX_AMOUNT = 9999;

/** What the box may ask for: at least one, never more than what is left. */
export function clampAmount(amount: number, points: number): number {
  if (!Number.isFinite(amount)) return 0;

  const available = Math.min(Math.trunc(points), MAX_AMOUNT);
  if (available <= 0) return 0;

  return Math.min(Math.max(Math.trunc(amount), 1), available);
}

export type StepDecision = 'send' | 'done' | 'spent';

/**
 * What the run does next, given what the server has confirmed and how many
 * points the character still has.
 */
export function nextStep(
  run: { added: number; wanted: number },
  points: number
): StepDecision {
  if (run.added >= run.wanted) return 'done';
  if (points <= 0) return 'spent';
  return 'send';
}
