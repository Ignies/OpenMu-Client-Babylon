import { GameOptions } from '@/controllers/settings';
import { framePacer, fpsLimitForStep } from './fpsLimit';

/**
 * Load shedding (ours, a crowd option read by `skills/castBudget.ts`): how far to thin other
 * players' skill visuals while the drawn frame rate stays under its target (the FPS limit, 60
 * uncapped). 0 nothing; 1 under 2/3 of the target; 2 under 2/5. Each step has its own way back.
 */
export type ShedLevel = 0 | 1 | 2;

/** Fractions of the target: a level is entered under `enter` and left over `leave`. */
const STEPS: readonly { enter: number; leave: number }[] = [
  { enter: 2 / 3, leave: 0.85 },
  { enter: 0.4, leave: 0.55 },
];

/** The target frame rate while uncapped. */
const UNCAPPED_TARGET = 60;
/** How often the level is re-read, ms. */
const PERIOD_MS = 500;

/** The level for `fps` against `target`, coming from `previous`: it eases off one step at a time, sheds as far as it reads. */
export function nextShedLevel(fps: number, target: number, previous: ShedLevel): ShedLevel {
  if (!(fps > 0) || !(target > 0)) return previous;
  const ratio = fps / target;
  let level = previous;
  if (level > 0 && ratio > STEPS[level - 1].leave) level = (level - 1) as ShedLevel;
  while (level < STEPS.length && ratio < STEPS[level].enter) level = (level + 1) as ShedLevel;
  return level;
}

let level: ShedLevel = 0;
let readAt = -Infinity;

/** The current level from the frames drawn (`framePacer.fps`), re-read at most every `PERIOD_MS`. */
export function shedLevel(now: number): ShedLevel {
  if (now - readAt >= PERIOD_MS) {
    readAt = now;
    level = nextShedLevel(framePacer.fps, fpsLimitForStep(GameOptions.fpsLimit) || UNCAPPED_TARGET, level);
  }
  return level;
}
