// The account's character list as data: what is selected, whether a slot is
// free, what the status line says, where each row sits. No React, no Store.
import type { CharacterListPacket } from '@versions/shared/packets/ServerToClientPackets';

export type ListedCharacter = ReturnType<CharacterListPacket['getCharacters']>[number];

/** Characters per account: the line-up's five slots (`CHARACTER_SLOTS`). */
export const MAX_CHARACTERS = 5;

/** The focused character, if it is on the list. */
export function selectedCharacter(
  list: readonly ListedCharacter[],
  focused: string
): ListedCharacter | undefined {
  return list.find(c => c.Name === focused);
}

/** Create is enabled while the account has an empty slot. */
export function hasFreeSlot(list: readonly ListedCharacter[]): boolean {
  return list.length < MAX_CHARACTERS;
}

/**
 * When the status line asks the player to pick a character:
 * - `pick` (the line-up): only while nothing is selected, once there are characters.
 * - `empty` (the 0.97d list): over an empty list, and "loading" even with a selection.
 */
export type StatusPrompt = 'pick' | 'empty';

export type ListStatus = 'loading' | 'select' | null;

export function listStatus(
  state: { loading: boolean; count: number; selected: boolean },
  prompt: StatusPrompt
): ListStatus {
  if (prompt === 'pick') {
    if (state.selected) return null;
    if (state.loading) return 'loading';
    return state.count > 0 ? 'select' : null;
  }
  if (state.loading) return 'loading';
  return state.count === 0 ? 'select' : null;
}

export type RowBox = { x: number; y: number; width: number; height: number };

/** One row per character, stacked in the server's order (empty slots take no row). */
export function rosterRows(list: readonly ListedCharacter[], row: RowBox) {
  return list.map((character, index) => ({
    character,
    left: row.x,
    top: row.y + index * row.height,
    width: row.width,
    height: row.height,
  }));
}
