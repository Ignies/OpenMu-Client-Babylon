/**
 * Actions whose `LockPositions` the original clears when it loads the model, by converted asset path:
 * the Kalima gate, MODEL_WARCRAFT (ZzzOpenData.cpp:4241-4242). Its clip then reaches the last key, which
 * the file marks as a loop-closing duplicate but which is the open gate.
 */
const UNLOCKED_ACTIONS: Readonly<Record<string, readonly number[]>> = { 'Skill/HellGate.glb': [0] };

/** An action's `LockPositions` as the original plays it. */
export function locksPositions(asset: string, actionIndex: number, lockPositions: boolean): boolean {
  return lockPositions && !UNLOCKED_ACTIONS[asset]?.includes(actionIndex);
}
