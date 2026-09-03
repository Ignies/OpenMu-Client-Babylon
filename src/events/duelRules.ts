import type { TextKey } from '../i18n';
import { DuelStartResultDuelStartResultTypeEnum as DuelStartResult } from '../common/packets/ServerToClientPackets';

/**
 * Pure duel logic, ported from `DuelMgr.cpp` / `WSclient.cpp:8465-8498`
 * (`ReceiveDuelScore`, `ReceiveDuelHP`): id-perspective mapping and the
 * packet-shape quirks of OpenMU's duel senders. No state, no imports of the
 * store - `duel.ts` calls these and vitest covers them directly.
 */

/** `MAX_DUEL_CHANNELS`: the watch window's fixed row count. */
export const DUEL_CHANNELS = 4;
/** Bytes per `DuelStatus` room row (2 names + running + open). */
const ROOM_BYTES = 22;
/** `DuelSpectatorList` carries this many fixed name slots. */
const SPECTATOR_SLOTS = 10;

const ID_MASK = 0x7fff;

/**
 * Which way a `Player1/Player2` packet pair maps onto the stored duel sides.
 * The reference compares ids, not order (`IsDuelPlayer`), because broadcast
 * packets arrive in requester/opponent order for spectators but in
 * self/opponent order for duelists.
 */
export function orientPair(
  side1Id: number,
  side2Id: number,
  packet1Id: number,
  packet2Id: number
): 'direct' | 'swapped' | null {
  const s1 = side1Id & ID_MASK;
  const s2 = side2Id & ID_MASK;
  const p1 = packet1Id & ID_MASK;
  const p2 = packet2Id & ID_MASK;
  if (s1 === p1 && s2 === p2) return 'direct';
  if (s1 === p2 && s2 === p1) return 'swapped';
  return null;
}

/** Orders a `[for player1, for player2]` value pair onto `[side1, side2]`. */
export function orientValues<T>(
  orientation: 'direct' | 'swapped',
  value1: T,
  value2: T
): [T, T] {
  return orientation === 'direct' ? [value1, value2] : [value2, value1];
}

/**
 * How many room rows a `DuelStatus` packet carries. The codec pins 4 (92
 * bytes), but the row math keeps a reconfigured server readable.
 */
export function roomCountOf(byteLength: number): number {
  return Math.max(0, Math.floor((byteLength - 4) / ROOM_BYTES));
}

/**
 * OpenMU's `DuelSpectatorListUpdatePlugIn` never writes the `Count` field,
 * so the client reads every fixed slot and keeps the real names.
 */
export function presentSpectators(slots: readonly string[]): string[] {
  return slots
    .slice(0, SPECTATOR_SLOTS)
    .map(name => name.replace(/\0+/g, '').trim())
    .filter(name => name.length > 0);
}

/** `ReceiveDuelStart`'s answers, keyed like the guild result tables. */
const FAILURE_KEYS: Partial<Record<DuelStartResult, TextKey>> = {
  [DuelStartResult.Refused]: 'duel.refused',
  [DuelStartResult.FailedByTooLowLevel]: 'duel.failedLevel',
  [DuelStartResult.FailedByNotEnoughMoney]: 'duel.failedZen',
  [DuelStartResult.FailedByNoFreeRoom]: 'duel.failedRoom',
};

/** `DuelStartResult` failures -> catalogue key; `Success` is null. */
export function duelStartFailureKey(result: DuelStartResult): TextKey | null {
  if (result === DuelStartResult.Success) return null;
  return FAILURE_KEYS[result] ?? 'duel.failedError';
}
