# events

The world events: Blood Castle, Devil Square, Chaos Castle, Duel, Doppelganger, Crywolf, Golden
Archer, Kanturu, Raklion, the dragon invasion sky, the shared countdown line and the HUD schedule rows. Each
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
- `events.closeEntryWindows()`: a walk (`npc_shop/net.ts`, `UpdateSendMoveInterface`) closes the
  Blood Castle, Devil Square, duel watch and Doppelganger windows, not the Kanturu gateway or the Golden Archer.
- `bloodCastle.ts` and `chaosCastle.ts` register their timers as the map beds' gates with the sound
  controller (`registerAmbientGate`) when they load.
- Readers imported directly:
  `bloodCastleQuestItem` (`questItemSystem.ts`), `duelEnemyId` (`attackSystem.ts`), `invasionEvent`
  (`boidSystem.ts`), `crywolfHud` (`maps/crywolf/eventObjects.ts`), plus each entry's window readers.

## How it works
- `layers.ts` is the only list of events (`EventLayer`, `layer.ts`). The facade runs `update`,
  `reset`, `state`, `useTicket` and `useNpc` over it in order; the first `true` takes the input.
- Each entry registers its `EventBus.on` handlers in its `install<Entry>()`; the module's install
  (`module.ts`) calls them in a fixed order: duel, the notices, invasion, Blood Castle, Chaos
  Castle, Devil Square, Crywolf, Golden Archer, Kanturu, Raklion. A packet several entries handle runs them
  in that order (`MiniGameOpeningState`, `BloodCastleState`, `MiniGameScoreTable`, `MapEventState`;
  pinned by `src/app/listenerOrder.golden.test.ts`). Importing a file registers nothing. The
  module installs before `warp` (`../modules.ts`): Crywolf's `warpCompleted` and the duel's
  `wsClosed` reset run first, as when they registered at import.
- Timers count down in `update`; packets only resync them. `reset` drops the tracked match
  (`CreateEventMatch` recreates it on every warp) and closes entry windows. Duel state survives a
  warp; `wsClosed` clears it (`WSclient.cpp:646`).
- Tickets (`recipes.ts` `TICKETS`): Cloak of Invisibility, Devil's Invitation and Armor of Guardsman
  send `MiniGameOpeningStateRequest`. `schedule.ts` sends the same request on a timer for the HUD
  rows (30 s floor, only with the event timers option on); each `MiniGameOpeningState` handler calls
  `takeOpeningState` first, and an answer to a poll shows nothing. The rows are the version's
  `miniGames` (`scheduleKeys`, `scheduleClock.ts`): 0.97d draws and polls no Chaos Castle.
- `closeAll` closes every entry window and sends `CloseNpcRequest` when one was an NPC window:
  OpenMU keeps the character in `NpcDialogOpened` until it arrives. Golden Archer sends `EventChipExitDialog` instead.
- `BloodCastleState` is shared: Blood Castle reads states 0..4, Chaos Castle 5..7 (8..10 are the
  arena in `maps/chaoscastle/arena.ts`). `MiniGameScoreTable` is taken by Devil Square or Chaos Castle by map.
- A refused entry (`Failed` in `BloodCastleEnterResult`, `ChaosCastleEnterResult`,
  `DevilSquareEnterResult`) shows the reason OpenMU sent as a system line just before (an item the
  event bars, a map requirement; `chat/serverLines.ts`), else the original's ticket text. OpenMU
  sends a bare `Failed` for those, which the original reads as a wrong cloak or invitation.
- Dev seam: `?events=<blood>,<devil>,<chaos>` (minutes, one per row drawn) stages the schedule rows.

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
  Its frame turns the Classic shadows off in the tower while the state is the Maya scene (every state but
  the Nightmare fight, the open tower and the end, `IsMayaScene`): `render/objectShadow` `setShadowlessScene`.
  `kanturuMayaState` is the original's `m_iMayaState` (the Maya battle's detail, 0 outside it); installing hands it
  to the monsters controller as the `kanturuMaya` look state, which the Maya hands' rows read.
- `raklion.ts`: `RaklionStateInfo`, `RaklionCurrentState`, `RaklionStateChange` (0xD1 0x10-0x12, defined as the
  original reads them). No HUD: it keeps `CGM_Raklion`'s state and Selupan's pattern (state 11 carries the pattern,
  `SetState`), handed to the monsters controller as the `raklionSelupan` look state for Selupan's mesh 1 passes.
- `invasion.ts`: `MapEventState` (meteors and dim sky). `matchNotices.ts`: `UpdateMiniGameState`
  (the 30 s line), `MapEventState` (dragon banner).

## When it is off
`events` is optional (`module.ts`): a server may run without it. Off, none of the packets above is
read: no event dialog opens from a packet (Kanturu gateway, Golden Archer), no timer, score or
result shows, and Crywolf sends no `CrywolfInfoRequest` on arrival. The other modules' listeners on
`warpCompleted` and `KanturuEnterResult` run as before. What stays: the facade, the frame update and
the windows; the windows `npc_shop` opens on `NpcWindowResponse`, tickets, the Crywolf statue and the
HUD schedule rows still send their requests (unanswered; the rows give up after a few polls), the
castle beds' sound gates read idle timers (no match bed plays).

## Depends on / used by
- uses: `session` (`sendToGS`, `isOffline`), chat's `addNotification`, `Ecs.world`, `Hero`,
  `Merchant.dropNpcTalk`, `AppState.uiState`, `controllers/` (fx, lighting, sound, `net/serverTime`), `chat/`, `hero/`,
  `items/`, `skills`, `options/`, `src/i18n`, `versions/shared/maps/` (chaoscastle thunder, kanturu2 gateway).
- used by: see Public API. Windows: `versions/shared/ui/windows/events/` (`index.tsx`, `eventTimers.tsx`,
  `goldenArcherWindow.tsx`, `kanturuWindow.tsx`), `.../windows/duel/`, `.../windows/inventory/` (tickets).

## Change it
- add an event: copy `_template.ts` to `<name>.ts`, rename `templateLayer`, set `name` to the file
  name. Keep its three parts in order: tuning constants (real units, why that value), state + plain
  reader functions (MobX `observable` so the HUD re-renders) and handlers that resync the state,
  then the exported `EventLayer` with `update` / `reset` / `state` (and `useTicket` / `useNpc` if a
  ticket or an NPC click opens it). Add it to `layers.ts`. Its packet handlers go in an
  exported `install<Name>()`, called from `module.ts` where its listeners should run.
- an NPC window opens it: add a `case` to `NpcWindowResponse` in `npc_shop/net.ts` that calls a
  new facade command; add its close to `events.closeAll`.
- draw it: a window in `versions/shared/ui/windows/events/` reading the entry's readers.
- change event texts: `recipes.ts` (`EVENT_TEXT`, with the original `GlobalText` indices).

## Tests
- `kanturu.test.ts`: the Maya scene turns the Classic shadows off in the tower until the Nightmare fight; the Maya
  direction state is the detail of a Maya battle state change and 0 in the Nightmare fight.
- `raklion.test.ts`: the event state from any of the three packets, the pattern only from state 11, and the look state.
- `entryRefusal.test.ts`: a refused entry says the server's reason line, else the cloak text.
- `duelRules.test.ts`: duel id orientation, room count, spectator list, start failure texts.
- `scheduleClock.test.ts`: opening-state minutes to a moment, row text, countdown, poll back-off,
  the rows a version draws.
- `../switchOff.test.ts`: installing registers the listeners and loading does not; off, its
  packets keep only the other modules' listeners.
