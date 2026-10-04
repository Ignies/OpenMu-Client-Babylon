# events

The world events: Blood Castle, Devil Square, Chaos Castle, Duel, Doppelganger, Crywolf, Golden
Archer, Kanturu, the dragon invasion sky, the shared countdown line and the HUD schedule rows. Each
event is one entry file with its own MobX state and packet handlers, behind the `events` facade (`index.ts`).

## Public API
- `events.update(map, dt)` / `events.reset()`: `ecs/systems/eventSystem.ts` once a frame;
  `app/lifecycle.ts` on a map change.
- `events.useTicket(slot, item)`: a ticket double-click in the inventory window.
- `events.useNpc(npc)`: an NPC click (`npcTalkSystem.ts`). The Crywolf statue takes it.
- `events.openBloodCastle()`, `openDevilSquare()`, `openDuelWatch()`, `openDoppelganger()`:
  `NpcWindowResponse` cases in `npc_shop/net.ts`.
- `events.serverMessageBox(dialog)`: `ServerCommand` message boxes in `app/logic.ts` (Archangel lines).
- `events.enterBloodCastle(grade)`, `enterDevilSquare(grade)`, `enterChaosCastle()`,
  `askChaosCastleOpening()`, `enterDoppelganger()`, `answerDuelRequest(ok)`, `joinDuelChannel(i)`,
  `quitDuelChannel()`, `closeAll()`, `countdownLine`: window buttons and the HUD.
- `bloodCastle.ts` and `chaosCastle.ts` register their timers as the map beds' gates with the sound
  controller (`registerAmbientGate`) when they load; `layers.ts` imports Blood Castle, Chaos Castle
  and Devil Square in that order, which is the order their `MiniGameOpeningState` /
  `BloodCastleState` listeners run (pinned by `src/app/listenerOrder.golden.test.ts`).
- Readers imported directly:
  `bloodCastleQuestItem` (`questItemSystem.ts`), `duelEnemyId` (`attackSystem.ts`), `invasionEvent`
  (`boidSystem.ts`), `crywolfHud` (`maps/crywolf/eventObjects.ts`), plus each entry's window readers.

## How it works
- `layers.ts` is the only list of events (`EventLayer`, `layer.ts`). The facade runs `update`,
  `reset`, `state`, `useTicket` and `useNpc` over it in order; the first `true` takes the input.
- No `net.ts`: each entry registers its `EventBus.on` handlers at module load, when the facade is
  first imported (`npc_shop/net.ts`, `app/logic.ts`).
- Timers count down in `update`; packets only resync them. `reset` drops the tracked match
  (`CreateEventMatch` recreates it on every warp) and closes entry windows. Duel state survives a
  warp; `wsClosed` clears it (`WSclient.cpp:646`).
- Tickets (`recipes.ts` `TICKETS`): Cloak of Invisibility, Devil's Invitation and Armor of Guardsman
  send `MiniGameOpeningStateRequest`. `schedule.ts` sends the same request on a timer for the HUD
  rows (30 s floor, only with the event timers option on); each `MiniGameOpeningState` handler calls
  `takeOpeningState` first, and an answer to a poll shows nothing.
- `closeAll` closes every entry window and sends `CloseNpcRequest` when one was an NPC window:
  OpenMU keeps the character in `NpcDialogOpened` until it arrives. Golden Archer sends `EventChipExitDialog` instead.
- `BloodCastleState` is shared: Blood Castle reads states 0..4, Chaos Castle 5..7 (8..10 are the
  arena in `maps/chaoscastle/arena.ts`). `MiniGameScoreTable` is taken by Devil Square or Chaos Castle by map.
- Dev seam: `?events=<blood>,<devil>,<chaos>` (minutes) stages the schedule rows.

## Packets
- `bloodCastle.ts`: `BloodCastleEnterResult`, `MiniGameOpeningState` (game 2), `BloodCastleState`
  (timer, kills, gate, weapon carrier), `BloodCastleScore` (result box).
- `devilSquare.ts`: `DevilSquareEnterResult`, `MiniGameOpeningState` (game 1), `MiniGameScoreTable`.
- `chaosCastle.ts`: `MiniGameOpeningState` (game 4, entry prompt), `ChaosCastleEnterResult`,
  `BloodCastleState`, `MiniGameScoreTable`. Also the pillars' thunder on the castle maps.
- `crywolf.ts`: `warpCompleted` (sends `CrywolfInfoRequest`), `CrywolfStateInfo`, `CrywolfAltarInfo`,
  `CrywolfContractResult`, `CrywolfLeftTime`, `CrywolfBossMonsterInfo`, `CrywolfBenefit`.
- `duel.ts`: `DuelStartRequest`, `DuelStartResult`, `DuelInit`, `DuelHealthBarInit`, `DuelScore`,
  `DuelHealthUpdate`, `DuelEnd`, `DuelFinished`, `DuelStatus`, `DuelSpectatorAdded` / `Removed` / `List`, `wsClosed`.
- `goldenArcher.ts`: `EventChipRegistrationResult` (opens or refreshes the Rena dialog).
- `kanturu.ts`: `KanturuStateInfo` (opens the gateway dialog), `KanturuEnterResult`, `KanturuStateChange`,
  `KanturuMonsterUserCount`, `KanturuTimeLimit`, `KanturuBattleResult`, `KanturuMayaWideAreaAttack`.
- `invasion.ts`: `MapEventState` (meteors and dim sky). `matchNotices.ts`: `UpdateMiniGameState`
  (the 30 s line), `MapEventState` (dragon banner).

## Depends on / used by
- uses: `app/store` (`sendToGS`, `addNotification`, `world`, `isOffline`, `playerData`,
  `dropNpcTalk`, `uiState`), `controllers/` (fx, lighting, sound, `net/serverTime`), `chat/`, `hero/`,
  `items/`, `skills`, `options/`, `src/i18n`, `versions/shared/maps/` (chaoscastle thunder, kanturu2 gateway).
- used by: see Public API. Windows: `versions/shared/ui/windows/events/` (`index.tsx`, `eventTimers.tsx`,
  `goldenArcherWindow.tsx`, `kanturuWindow.tsx`), `.../windows/duel/`, `.../windows/inventory/` (tickets).

## Change it
- add an event: copy `_template.ts` to `<name>.ts`, rename `templateLayer`, set `name` to the file
  name. Keep its three parts in order: tuning constants (real units, why that value), state + plain
  reader functions (MobX `observable` so the HUD re-renders) and handlers that resync the state,
  then the exported `EventLayer` with `update` / `reset` / `state` (and `useTicket` / `useNpc` if a
  ticket or an NPC click opens it). Add it to `layers.ts`.
- an NPC window opens it: add a `case` to `NpcWindowResponse` in `npc_shop/net.ts` that calls a
  new facade command; add its close to `events.closeAll`.
- draw it: a window in `versions/shared/ui/windows/events/` reading the entry's readers.
- change event texts: `recipes.ts` (`EVENT_TEXT`, with the original `GlobalText` indices).

## Tests
- `duelRules.test.ts`: duel id orientation, room count, spectator list, start failure texts.
- `scheduleClock.test.ts`: opening-state minutes to a moment, row text, countdown, poll back-off.
