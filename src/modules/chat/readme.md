# chat

Chat packets, the chat log model, server notices, `/` commands, the player command window,
chat rooms, item links, custom emojis and emoji bubbles. The chat log state and `sendChat`
live in the `Social` store ([../social/readme.md](../social/readme.md)).

## Public API
- `addNotification(text, type?)` (`index.ts`, the door; `notify.ts`): a blue (`info`) or red (`error`,
  with the error sound) line in the system log, the client's own feedback. `Social` takes the lines
  (`setNotificationSink`, set when social.ts loads), so a caller does not load the whole store.
- `cleanName(raw)`: strips NUL padding and blanks from a packet string. Used by most nets.
- `chat.ts`: `ChatLineType`, `classifyInboundChat(message)`, log layout helpers and constants
  (`splitChatLine`, `layoutChatRows`, `scrollChatEnd`, `CHAT_FILTERS`, ...) for `Social` and `hud/chat`.
- `Notices.create(text)`, `Notices.createGuildNotice(text)`, `Notices.clear()`: the golden notice stack.
- `Commands`: command window and quick menu; `run(kind, entity)`, `runPendingOn(entity)`,
  `openQuickOn(...)`, `stopFollowing()`, `duelStop()`. The module's `install` hands it to social
  (`setLocalCommands`), which runs the typed `/commands` and stops a follow when the party changes.
- `ChatRooms`: `openRoomWith(name)`, `inviteFriend(name)`, `inviteResult(ok, requestId)`,
  `onConnectionInfo(info)`, `sendMessage(text)`, `leaveRoom(key)`.
- `CHAT_COMMANDS`, `matchChatCommands(text, gm)`, `localCommandOf(text)`, `CommandKind`.
- `EMOJI_CATALOG` (`emojis/index.ts`) and the `chatEmojis.ts` helpers (`emojiSegments`, `chatEmojiBubbleOf`, ...).
- `itemLinkToken(item)`, `itemLinkLabel(item)`, `scanItemLinks(text)`, `labelsToWire`, `wireToLabels`,
  `freshDraft(insert)` (the chat box's draft on opening and after a send: empty, or the Alt+clicked link).
- `EMOJI_BUBBLES`, `emojiBubbleById(id)`, `emojiBubbleToken(id)`, `matchEmojiBubbleWord(text)`.
- `chatTextWidth(text)`: a line's width in log pixels (canvas, or an average without a DOM).

## How it works
- `net.ts` ports `ReceiveChat` / `ReceiveChatWhisper` (`WSclient.cpp:1435`) and `ReceiveNotice`
  (`WSclient.cpp:1605`). Lines go to `Social.addChatLine`; a head balloon is the `chatMessage` event
  (`AssignChat`, `ZzzInterface.cpp:1183`), drawn by `nameTagSystem`.
- Party / guild / alliance / gens / GM lines arrive with a prefix (`~`, `@`, `@@`, `$`, `#`);
  `classifyInboundChat` picks the log type and strips it.
- `notices.ts`: the six-line golden banner (`ZzzInterface.cpp:491-603`).
- `commands.ts`: `CNewUICommandWindow` and the client `/command` lines of `CheckCommand`
  (`ZzzInterface.cpp:3990`); they act on the player under the cursor and are never sent.
- `chatRooms.ts`: rooms on OpenMU's separate ChatServer, over `controllers/net/sockets/chatRoomSocket.ts`
  (it hands the socket `servers/serverConfig.ts`'s `wsAddress()`).
- Emojis (`:dk_love:`) and item links (`{` + 16 chars + `}`) travel as plain ASCII in the chat text.
  Emoji packs: [emojis/readme.md](emojis/readme.md).

## Packets
- `ChatMessage`: public chat, prefixed lines, whispers, `[POST]` shouts; pops emoji bubbles, marks `#` senders as GM.
- `ObjectMessage`: text over an NPC's head; emits `objectMessage`.
- `ServerMessage`: type 0 golden notice, 1 system line (and self-defense tracking), 2 guild notice,
  10..15 slide-help marquee (`SlideHelp.add`), anything else a system line.
- Outgoing: `PublicChatMessage` / `WhisperMessage` from `Social.sendChat`; `ChatRoomCreateRequest`,
  `ChatRoomInvitationRequest` from `ChatRooms`.

## Depends on / used by
- uses: `social`, `options`, `items`, `hero/emotes`, `controllers/net`, `controllers/sound`, `src/i18n`.
- used by: `src/app/logic.ts`, `social`, most module nets (`cleanName`), `ecs/systems`,
  `controllers/interface/components`. UI: `hud/chat`, `hud/notices`, `hud/emoji_bubbles`, windows
  `chat_room`, `command_window`, `quick_command_window`, `duel`, `emote_menu`, `friends`, `gm_panel`, `options`.

## Change it
- handle a new chat packet: add an `EventBus.on(...)` in `net.ts`; keep log state in `Social`.
- add a `/` command: a row in `CHAT_COMMANDS`; a client-side one also needs a `CommandKind` and a case in `Commands.run`.
- add an emoji bubble: a row in `EMOJI_BUBBLES` with an ASCII token and a label key.
- add emojis: drop `.webp` files in `emojis/<pack>/`.
- change how the log looks: `versions/shared/ui/hud/chat/`.

## Tests
- `chat.test.ts`: line splitting, sender prefix, PK colour, scrolling, row layout, copy, input budget.
- `chatEmojis.test.ts`: catalog, segments, splitting, picker query and splice, recents, bubbles, shipped packs.
- `chatItemLinks.test.ts`: link token round trip, scanning, stripping, labels in the chat box, the fresh draft.
- `emojiBubbles.test.ts`: tokens are ASCII, unique, avoid routing prefixes, survive the wire.

## Notes
### emojiBubbles.ts
- A bubble has no animation clip and no `ServerPlayerActionType` (unlike `hero/emotes.ts`), so no packet
  carries one. It travels as public chat: each bubble owns ASCII tokens (`words`), like the original's
  `^^` / `T_T` emoticons read by `CheckChatText`. The radial menu sends the first one; typing it works too.
- Chat, because the server's chat scope is exactly who can see the sender; the proxy is a byte pipe
  that does not know who stands near whom.
- `matchEmojiBubbleWord` matches the whole line only, so `??` inside a sentence stays text.
- `head` floats above the head; `side` beside the shoulder facing the camera (`EmojiBubbleSystem`
  picks the side, `CalculateScreenPositionSystem` projects it).
