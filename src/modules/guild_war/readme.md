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
  on the stadium get it too, without a `guildWar`. A score whose first goals byte is 255 clears it: the
  board hides and the team colours stop (`SoccerObserver = false`, WSclient.cpp:8162-8170).
- Alliance and hostility: an offer sets `Social.guildRelationRequest`. A successful change clears
  `GuildMarks` (the alliance name over heads changed) and re-reads the guild list, and the
  alliance list when that tab is open. Error texts follow GlobalText 1313 / 1326-1333.
- Outgoing packets are `Social` actions: `guildWarRespond`, `guildRelationRequestSend`,
  `guildRelationRespond`, `requestAllianceList`, `removeAllianceGuild`.

## Packets
- `GuildWarRequest` (0x61): another master asks for a war or a soccer match.
- `GuildWarRequestResult`: the answer to the hero's war request.
- `GuildWarDeclared`: the war starts; sets `Social.guildWar`.
- `GuildWarScoreUpdate`: own and enemy score.
- `GuildSoccerScoreUpdate` (F3 23): team names and goals; 255 as the first score hides the board;
  every score sets off the fireworks on the hero's square (`fx/firecrackerRise.ts`, WSclient.cpp:8172-8179).
- `GuildSoccerTimeUpdate` (F3 22): remaining seconds, `Social.soccerSeconds`. Kept while the board is
  hidden and cleared with the war, as `g_wtMatchTimeLeft` (`ReceiveWTTimeLeft`, WSclient.cpp:10947-10952, :7822).
  We read the seconds where OpenMU sends them (a word at byte 4); the original reads a type byte there and the
  time from byte 5 (`PMSG_MATCH_TIMEVIEW`, WSclient.h:1941-1948). We follow the server we talk to. Drawn at the
  screen centre by `ui/hud/match_time`, or on the board with `soccerBoardClock`.
- `GuildWarEnded`: won, lost or cancelled; clears the war.
- `GuildRelationshipRequest` (0xE5): an alliance or hostility offer.
- `GuildRelationshipChangeResult`: success or the error reason.
- `AllianceList` (`ReceiveUnionList`, `WSclient.cpp:7502`): guilds in the alliance.
- `RemoveAllianceGuildResult`: a guild was removed from the alliance.

## Depends on / used by
- uses: `social/social.ts`, `chat/chat.ts` (`cleanName`), `scope/objects.ts` (`playerNameById`)
  (`playerNameById`), `guild` (`GuildMarks`), `src/i18n`, `controllers/fx/firecrackerRise.ts`, `ecs/current`.
- used by: `src/app/logic.ts`. The state is drawn by `versions/shared/ui/hud/soccer_score/`, `hud/match_time/`,
  `hud/name_tags/`, `windows/guild/` (alliance tab) and `windows/social_prompts/` (war and
  relationship yes/no). `chat/commands.ts` sends relationship requests.
  `warp/net.ts` clears `Social.battleSoccer` when leaving the stadium.

## Change it
- handle a new war or alliance packet: add an `EventBus.on(...)` in `net.ts`, keep state in `Social`.
- change a message: the `GUILD_WAR_RESULTS`, `GUILD_WAR_ENDINGS` and `RELATIONSHIP_ERRORS` tables in
  `net.ts` (texts in `src/i18n`).
- change the scoreboard: `versions/shared/ui/hud/soccer_score/index.tsx`.

## Tests
- `net.test.ts`: a soccer score shows the board, a first score of 255 clears it; the time survives the hidden board
  and goes with the war; every score, the hiding one too, sets off the fireworks on the hero's square.
