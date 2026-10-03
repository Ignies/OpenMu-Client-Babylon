# guild_war

Guild war, Battle Soccer and guild alliance / hostility packets. The state and the answers the
hero sends live in the `Social` store ([../social/readme.md](../social/readme.md)); this folder only
has the handlers. Plain guild membership is in [../guild/readme.md](../guild/readme.md).

## Public API
- none. `installNet()` in `net.ts` registers its handlers (`module.ts`, installed by `src/app/logic.ts`).

## How it works
- The handlers port `ReceiveGuildWar*` and `ReceiveUnion*`.
- A war request from another master sets `Social.guildWarRequest` (Battle Soccer wording when the
  type is Soccer, `CGuildWar_MsgBoxLayout`, `NewUICommonMessageBox.cpp:1418`). The hero answers with
  `Social.guildWarRespond`.
- `GuildWarDeclared` sets `Social.guildWar` (enemy guild, soccer flag, team code, scores).
  `Social.guildTeamOf` and `Social.guildRelationOf` read it to color the chat boxes and name tags
  over heads (`GuildTeam`, `WSclient.cpp:221`). `GuildWarEnded` clears the war, the soccer board
  and any pending request (`InitGuildWar`).
- Battle Soccer: `Social.battleSoccer` holds the team names, goals and remaining seconds. Observers
  on the stadium get it too, without a `guildWar`.
- Alliance and hostility: an offer sets `Social.guildRelationRequest`. A successful change clears
  `Store.guilds` (the alliance name over heads changed) and re-reads the guild list, and the
  alliance list when that tab is open. Error texts follow GlobalText 1313 / 1326-1333.
- Outgoing packets are `Social` actions: `guildWarRespond`, `guildRelationRequestSend`,
  `guildRelationRespond`, `requestAllianceList`, `removeAllianceGuild`.

## Packets
- `GuildWarRequest` (0x61): another master asks for a war or a soccer match.
- `GuildWarRequestResult`: the answer to the hero's war request.
- `GuildWarDeclared`: the war starts; sets `Social.guildWar`.
- `GuildWarScoreUpdate`: own and enemy score.
- `GuildSoccerScoreUpdate` (F3 23): team names and goals.
- `GuildSoccerTimeUpdate` (F3 22): remaining seconds.
- `GuildWarEnded`: won, lost or cancelled; clears the war.
- `GuildRelationshipRequest` (0xE5): an alliance or hostility offer.
- `GuildRelationshipChangeResult`: success or the error reason.
- `AllianceList` (`ReceiveUnionList`, `WSclient.cpp:7502`): guilds in the alliance.
- `RemoveAllianceGuildResult`: a guild was removed from the alliance.

## Depends on / used by
- uses: `social/social.ts`, `chat/chat.ts` (`cleanName`), `_shared/net_helpers.ts`
  (`playerNameById`), `app/store.ts` (`guilds`), `src/i18n`.
- used by: `src/app/logic.ts`. The state is drawn by `versions/shared/ui/hud/soccer_score/`,
  `hud/name_tags/`, `windows/guild/` (alliance tab) and `windows/social_prompts/` (war and
  relationship yes/no). `chat/commands.ts` sends relationship requests.
  `warp/net.ts` clears `Social.battleSoccer` when leaving the stadium.

## Change it
- handle a new war or alliance packet: add an `EventBus.on(...)` in `net.ts`, keep state in `Social`.
- change a message: the `GUILD_WAR_RESULTS`, `GUILD_WAR_ENDINGS` and `RELATIONSHIP_ERRORS` tables in
  `net.ts` (texts in `src/i18n`).
- change the scoreboard: `versions/shared/ui/hud/soccer_score/index.tsx`.

## Tests
- none yet.
