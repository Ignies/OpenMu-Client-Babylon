# social

The `Social` store: chat log, party and guild state plus the actions that send their packets.
Also the guild mark (emblem) codec. It has no packet handlers of its own; the nets of `chat`,
`party`, `guild`, `guild_war` and others write into it.

## Public API
- `Social.systemMessage(text)` / `Social.errorMessage(text)`: a blue / red line in the chat log.
  `addNotification` (`chat/notify.ts`) forwards to them; `social.ts` registers itself as its sink.
- `Social.addChatLine(sender, text, type)`, `Social.sendChat(text)`, `Social.broadcastEmojiBubble(id)`,
  chat input and log state (`chatLines`, `visibleChatLines`, `whisperTarget`, `setWhisperTarget`,
  `openChatInput`, `toggle`, `scrollChatLog`, ...).
- party: `partyMembers`, `inParty`, `isPartyLeader`, `partyInvite`, `partyRespond`, `partyKick`,
  `partyLeave`, `requestPartyList`, `setPartyMembers`, `removePartyMember`, `setPartyHealth`.
- guild: `myGuild`, `guildMembers`, `allianceGuilds`, `guildWar`, `battleSoccer`, the request and dialog
  fields, `guildJoin`, `guildJoinRespond`, `promptGuildKick` / `confirmGuildKick`, `guildCreate`, `guildAssignRole`,
  `guildRelationRequestSend`, `guildRelationRespond`, `removeAllianceGuild`, `guildWarRespond`, `requestGuildList`, `requestAllianceList`.
- `Social.guildTeamOf(id)`, `Social.guildRelationOf(id)`: colour and relation of another player's guild.
- `Social.trackSelfDefense(text)`, `Social.isSelfDefenseActive(name)`.
- `Social.reset()`: clears everything per character.
- `MAX_PARTY_MEMBERS`, `INVITE_RANGE_TILES`, `GUILD_SECURITY_CODE_MAX`, `GuildTab`.
- The guild mark bitmap helpers are `src/core/guildMark.ts` (pure; the actors' guild flag reads them).

## How it works
- `Social` is a mobx singleton covering `CNewUIChatLogWindow` / `CNewUIChatInputBox`,
  `CNewUIPartyInfoWindow` and `CNewUIGuildInfoWindow`. Pure chat helpers come from `chat/`.
- `addChatLine` (`CNewUIChatLogWindow::AddText`) snapshots the speaker (guild, PK state, GM), splits the
  line at the log width (emojis and item links stay whole) and keeps the last `MAX_CHAT_LINES`.
- `sendChat` (`NewUIChatInputBox.cpp:505`): whisper if a target is set, else a client `/command`
  (`Commands`), else public chat with the input mode's prefix. Public chat also runs `CheckChatText`
  emotes and pops emoji bubbles locally.
- Self-defense comes from OpenMU's blue system line (`SelfDefensePlugIn.cs`), parsed in `chat/net.ts`.
- `guildTeamOf` is `GuildTeam` (`WSclient.cpp:221`). `guildRelationOf` derives the `GR_*` relation
  OpenMU does not send, from `myGuild`, `allianceGuilds`, the rival name and the war.
- Guild names and logos by id live in `Store.guilds` (written by `guild/net.ts`).
- Guild marks are 8x8 pixels of 4-bit palette indices, 32 bytes packed high nibble first;
  palette from `CreateGuildMark` (`ZzzInventory.cpp:11204`).
- Outgoing packets: `PublicChatMessage`, `WhisperMessage`, `PartyInviteRequest`, `PartyInviteResponse`,
  `PartyListRequest`, `PartyPlayerKickRequest`, the `Guild*Request` / `Guild*Response` packets,
  `RequestAllianceList`, `RemoveAllianceGuildRequest`, `GuildWarResponse`.

## Depends on / used by
- uses: `chat/` (log helpers, emojis, item links, `Commands`), `hero/emotes.ts`, `controllers/settings`,
  `Store`, `controllers/net` (chat wire, round trip), `controllers/interface/nameTags`, `controllers/sound`.
- used by: nearly every module (system lines), `party`, `guild`, `guild_war`, `chat`, `friends`, `band`,
  `hero/net.ts` (`reset`), `ecs/systems/skillCastSystem.ts`, `controllers/actors/guildFlag.ts` and
  `ecs/systems/guildFlagSystem.ts` (marks). UI: `hud/chat`, `hud/name_tags`, `hud/party_bars`,
  `hud/soccer_score`, `hud/minimap`, windows `party`, `guild`, `social_prompts`, `emote_menu`, `gm_panel`.
- Party handlers: [../party/readme.md](../party/readme.md). Chat: [../chat/readme.md](../chat/readme.md).

## Change it
- add chat log behaviour: `social.ts` chat section; pure layout code goes in `chat/chat.ts`.
- add a party or guild action: a method in `social.ts` that builds the packet and calls `Store.sendToGS`.
- add party or guild state: a field here (register it in `makeObservable` and clear it in `reset`);
  the handler that fills it goes in `party/net.ts` or `guild/net.ts`.
- change the mark palette or format: `src/core/guildMark.ts`.

## Tests
- none yet.
