/**
 * The friend list and the letter box - `CFriendList` / `CLetterList` and the
 * three tabs of `CUIFriendWindow` (UIWindows.h:304-540). The original's third
 * tab is the chat-room list, which needs the separate chat server MU used to
 * ship with; OpenMU has no such server and no chat-room packets, so only the
 * friend list and the letter box are ported.
 */

/** `MAX_FRIEND_COUNT`. */
export const MAX_FRIENDS = 50;
/** `Server` 0xFF means the friend is offline (OpenMU FriendOnlineStateUpdate). */
export const FRIEND_OFFLINE = 0xff;
/** `MAX_ID_SIZE`: the name fields are ten bytes. */
export const MAX_FRIEND_NAME = 10;
/** `Title` of LetterSendRequest is 60 bytes; `Subject` comes back in 32. */
export const MAX_LETTER_TITLE = 32;
/** `MAX_LETTER_TEXT`: the body the original's edit box accepts. */
export const MAX_LETTER_TEXT = 1000;

export type Friend = {
  name: string;
  /** -1 offline, otherwise the game-server id the friend is on. */
  server: number;
};

/** One row of the letter box (`LETTERLIST_TEXT`). */
export type Letter = {
  index: number;
  sender: string;
  subject: string;
  /** The server sends the stamp pre-formatted, so it is shown as it arrives. */
  timestamp: string;
  read: boolean;
  /** `New`: arrived while the hero was online, so it also raises a notice. */
  isNew: boolean;
  /** Filled in by OpenLetter when the letter is opened. */
  body?: string;
};

export function isFriendOnline(friend: Friend): boolean {
  return friend.server >= 0;
}

/** `CFriendList::Sort`: online first, then by name. */
export function sortFriends(friends: Friend[]): Friend[] {
  return friends.slice().sort((a, b) => {
    const onlineA = isFriendOnline(a) ? 0 : 1;
    const onlineB = isFriendOnline(b) ? 0 : 1;
    if (onlineA !== onlineB) return onlineA - onlineB;
    return a.name.localeCompare(b.name);
  });
}

/** `CLetterList::Sort`: newest first, which is the index the server hands out. */
export function sortLetters(letters: Letter[]): Letter[] {
  return letters.slice().sort((a, b) => b.index - a.index);
}
