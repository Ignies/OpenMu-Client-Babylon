# guild

Guild packets from the game server: guild marks, membership, the member list, join, kick, leave,
disband and guild creation. The guild state and the guild actions live in the `Social` store
([../social/readme.md](../social/readme.md)); the guild mark table is `GuildMarks`
(`state.ts`, through `index.ts`, the door). This folder only has the handlers. Wars and alliances are in
[../guild_war/readme.md](../guild_war/readme.md).

## Public API
- none. `installNet()` in `net.ts` registers its handlers (`module.ts`, installed by `src/app/logic.ts`).

## How it works
- The handlers port `ReceiveGuild*` (`WSclient.cpp:6987`).
- `GuildMarks` is the original's `GuildMark[]` table (`ReceiveGuildViewport`): guild id to name,
  alliance name and the 32-byte logo. `AssignCharacterToGuild` puts a `guild` component
  (`{ id, role }`) on each player in scope, sets `Social.myGuild` for the hero, and sends one
  `GuildInfoRequest` per guild id it does not know yet.
- `leaveGuild` clears `Social.myGuild`, the member and alliance lists, the war and soccer state,
  the scores and closes the window. On a disband every member in scope loses the mark and the
  guild is dropped from `GuildMarks`.
- OpenMU sends no `GuildMemberLeftGuild` after a disband, so `GuildKickResponse` with
  `GuildDisband` clears the guild itself. `KickSucceeded` reaches the kicked player too, after
  `myGuild` is already cleared, so only a player still in a guild prints the removal line.
- `GuildList` reads the member's server from `ServerId2` (`0x80` flag, `ShowGuildListPlugIn.cs:60`).
- Social fields written: `myGuild`, `guildMembers`, `guildTotalScore`, `guildCurrentScore`,
  `guildRivalName`, `guildJoinRequest`, `guildMasterDialog`, `guildCreationDialog`,
  `guildCreationPending`, `guildWindowEnabled`.
- Outgoing packets are `Social` actions: `requestGuildList`, `guildJoin`, `guildJoinRespond`,
  `guildKick`, `guildLeave`, `guildMasterAnswer`, `guildCreate`, `cancelGuildCreation`,
  `guildAssignRole`. Only `GuildInfoRequest` is sent from here.

## Packets
- `GuildInformation`: name, alliance and logo of one guild into `GuildMarks`.
- `AssignCharacterToGuild`: guild id and role of players in scope.
- `GuildMemberLeftGuild`: a member left; the hero leaving (or the master, disband) clears the guild.
- `GuildJoinRequest`: someone asks to join the hero's guild; sets `Social.guildJoinRequest`.
- `GuildJoinResponse`: the answer to the hero's join request.
- `GuildList`: the member list and the scores.
- `GuildKickResponse`: kick, leave, disband and their errors.
- `ShowGuildMasterDialog`: the "found a guild?" question.
- `ShowGuildCreationDialog`: the name and emblem editor.
- `GuildCreationResult`: closes the editor or shows the error.

## Depends on / used by
- uses: `social/social.ts`, `chat/chat.ts` (`cleanName`), `_shared/net_helpers.ts`
  (`playerNameById`), `app/store.ts`, `src/i18n`.
- used by: `src/app/logic.ts`. The window is `versions/shared/ui/windows/guild/`; the join prompt is
  `windows/social_prompts/`. `GuildMarks` is read by `hud/name_tags/`,
  `ecs/systems/guildFlagSystem.ts` and `ecs/world.ts`.
  `chat/commands.ts` calls `Social.guildJoin`.

## Change it
- handle a new guild packet: add an `EventBus.on(...)` in `net.ts`, keep state in `Social`.
- change what leaving a guild resets: `leaveGuild` in `net.ts`.
- change a guild action or its packet: `social/social.ts`.
- change the window: `versions/shared/ui/windows/guild/index.tsx`.

## Tests
- none yet.
