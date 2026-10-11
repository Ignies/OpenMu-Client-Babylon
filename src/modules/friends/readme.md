# friends

The friend list and the letter box (the messenger): packets in, the `Messenger` store, and the
actions that send friend and letter requests. Chat rooms with friends live in
[../chat/readme.md](../chat/readme.md) (`ChatRooms`).

## Public API
- `Messenger`: window state (`windowEnabled`, `tab`, `toggleWindow`, `closeWindow`, `setTab`), the
  lists (`friends`, `letters`, `unreadLetters`), `friendRequest`, and the actions below.
- friend actions: `requestAddFriend(name)`, `respondToFriendRequest(ok)`, `deleteFriend(name)`,
  `setAppearOffline(offline)`, `whisperFriend(name)` (fills the chat whisper field).
- letter actions: `openLetter(index)`, `deleteLetter(index)`, `composeLetter(to, subject)`,
  `updateDraft(patch)`, `sendLetter()`, `closeLetterView()`.
- `Messenger.reset()`: clears everything per character.
- `friendList.ts`: `isFriendOnline(friend)`, `MAX_FRIENDS`, `MAX_LETTER_TITLE`, `MAX_LETTER_TEXT`,
  `Friend`, `Letter`. `MessengerTab` from `messenger.ts`.

## How it works
- Ports `CNewUIFriendWindow` with `CFriendList` / `CLetterList` and the `ReceiveFriend*` /
  `ReceiveLetter*` handlers (`WSclient.cpp`).
- `MessengerInitialization` arrives right after entering the game with the whole friend list and the
  letter box size; letters then come one `AddLetter` at a time. Opening the window asks for both
  lists again (`OpenMainWnd`).
- A friend's `Server` byte is 0xFF when offline; it is stored as -1. Lists sort online first, then by
  name (`CFriendList::Sort`); letters newest first (`CLetterList::Sort`).
- A letter's body is only fetched when opened (`LetterReadRequest` -> `OpenLetter`).
- Friend request and new mail play `Sound/iFLogInAlert` (`WSclient.cpp:9786`) and `Sound/iFMailAlert`
  (`WSclient.cpp:9925`).

## Packets
- `MessengerInitialization`: the friend list and the letter box size; clears the letters.
- `FriendAdded` / `FriendDeleted`: one friend added (with a system line) or removed.
- `FriendOnlineStateUpdate`: a friend went on or offline, or changed server.
- `FriendRequest`: another player wants to add the hero; sets `Messenger.friendRequest`.
- `FriendInvitationResult`: first offered to `ChatRooms.inviteResult` (chat-room invites echo a
  RequestId); otherwise a failure line.
- `ChatRoomConnectionInfo`: a chat room was brokered; handed to `ChatRooms.onConnectionInfo`.
- `AddLetter`: one letter row; a `New` one also plays the mail sound and prints a line.
- `OpenLetter`: the body of the opened letter.
- `RemoveLetter`: a letter was deleted, or a failure line.
- `LetterSendResponse`: the send result as a system or error line; ends `sending`.
- Outgoing: `FriendListRequest`, `FriendAddRequest`, `FriendAddResponse`, `FriendDelete`,
  `SetFriendOnlineState`, `LetterListRequest`, `LetterReadRequest`, `LetterDeleteRequest`, `LetterSendRequest`.

## Depends on / used by
- uses: `social/social.ts` (system lines, whisper target), `chat/chatRooms.ts`, `chat/chat.ts`
  (`cleanName`), `controllers/sound`, `src/i18n`.
- used by: `src/app/logic.ts` (`net.ts`), `hero/net.ts` (`reset` on character select),
  `session/sessionExit.ts`, `chat/commands.ts` (add friend). UI: `windows/friends`, `windows/chat_room`,
  `windows/social_prompts`, `hud/bottom_bar` (messenger button).

## Change it
- handle a new messenger packet: add an `EventBus.on(...)` in `net.ts`, keep state in `Messenger`.
- add a friend or letter action: a method in `messenger.ts` that sends the packet.
- change list order or limits: `friendList.ts`.
- change the window: `versions/shared/ui/windows/friends/index.tsx`.

## Tests
- none yet.
