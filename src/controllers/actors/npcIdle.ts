import type { NpcIdleRoll } from '@/controllers/monsters';

/** EtcStopAnimationSetting's default case: `SetAction(o, rand() % 2)` (ZzzCharacter.cpp:3684-3686). */
export const DEFAULT_IDLE_ROLL: NpcIdleRoll = { base: 0, stay: [1, 2], others: [1, 1] };

/** `rand() % n`. */
const randomBelow = (n: number) => Math.floor(Math.random() * n);

/**
 * The clip an NPC model plays after `current` ends (EtcStopAnimationSetting). A clip the model lacks
 * leaves the current one playing, as `SetAction` does (ZzzAI.cpp:423).
 */
export function nextIdleAction(roll: NpcIdleRoll, current: number, clips: number, rand = randomBelow): number {
  const back = rand(roll.stay[1]) < roll.stay[0] || !!roll.backFrom?.includes(current);
  const next = back ? roll.base : roll.others[0] + rand(roll.others[1]);
  return next < clips ? next : current;
}
