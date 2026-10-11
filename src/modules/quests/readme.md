# quests

The quest system: the legacy quest chain, the Season 6 quest log and NPC dialogue, quest kill
counters, HUD bubbles over quest NPCs and the Balgass entry boxes. Each topic is one entry file
with its own MobX state, behind the `quests` facade (`index.ts`).

## Public API
- `quests.update(map, dt)` / `reset()`: `ecs/systems/questSystem.ts` each frame, `app/lifecycle.ts` on a map change.
- `quests.useNpc(npc)`: an NPC click (`npcTalkSystem.ts`); the Werewolf Guardsman and the Gatekeeper open the Balgass box.
- `quests.openNpcWindow(window, npcType)`: `NpcWindowResponse` fallback in `npc_shop/net.ts`; opens the legacy quest dialog.
- `quests.closeAll()`, `anyWindowOpen`, `toggleLog()`: Escape, the quest log hot key, session exit.
- The windows import `legacyQuests.ts`, `questLog.ts`, `npcDialogue.ts`, `questData.ts`,
  `objectives.ts` and `balgassEntry.ts` directly.

## How it works
- `layers.ts` is the only list of entries (`QuestLayer`, `layer.ts`); `update` and `reset` run over
  it in order, so an entry that reads another comes after it.
- Each entry registers its `EventBus.on` handlers in its `install<Entry>()`. The module's install
  (`module.ts`) calls them in a fixed order, then `installNet` (`net.ts`); a packet several entries
  handle runs them in that order (`AvailableQuests`: the dialogue, then the log). Importing a file
  registers nothing. The module installs before `hero` and `combat` (`../modules.ts`): its
  `CharacterInformation` and `ObjectGotKilled` listeners run first, as when they registered at import.
- Quest state belongs to the character: `reset` only closes NPC windows. A `CharacterInformation`
  with a new hero name clears the state; every one asks for the legacy and Season 6 states again.
- `questData.ts` loads `Quest_<lang>.bmd`, `Dialog_<lang>.bmd`, `QuestProgress.bmd` and
  `QuestWords_<lang>.bmd` on the first frame and after a language change (`controllers/assets/mu/questFiles.ts`).
- `killCounters.ts` keeps the five `CSQuest` kill slots plus the hero's own kills since; quest
  checks read the slots only, the display adds the local kills.
- `questBubbles.ts` re-arms `exclaim` / `question` bubbles over quest NPCs in scope every 3 s.
- `npcTalkStarted` hides the windows (the talk already sent the close); `heroWalked` closes them.
- Offline dev seams: `?quests=<n>` stages running quests, `?balgass=werewolf|gatekeeper[,1]` opens the box.

## Packets
- `OpenNpcDialog` (`net.ts`, F9 01): the Season 6 dialogue, or the legacy dialog for an NPC with no page.
- `legacyQuests.ts`: `LegacyQuestStateList`, `LegacyQuestStateDialog`,
  `LegacySetQuestStateResponse`, `LegacyQuestReward` (points, class change).
- `killCounters.ts`: `LegacyQuestMonsterKillInfo` (0xA4) and `ObjectGotKilled` (the hero's kills).
- `questLog.ts` (0xF6): `AvailableQuests` 0A (`ReceiveQuestByNPCEPList`), `QuestStepInfo` 0B
  (`ReceiveQuestQSSelSentence`), `QuestProgress` 0C / `QuestState` 1B (`ReceiveQuestQSRequestReward`),
  `QuestCompletionResponse` 0D (`ReceiveQuestCompleteResult`), `QuestCancelled` 0F (`ReceiveQuestGiveUp`),
  `QuestStateList` 1A (`ReceiveProgressQuestList`), `QuestEventResponse`; `ObjectGotKilled` asks
  for the state of a running quest that counts the kill.
- `npcDialogue.ts`: `AvailableQuests`, `QuestStepInfo`, `QuestProgress` (list inside the dialogue, hide).
- Outgoing: `LegacyQuestStateRequest`, `LegacyQuestStateSetRequest`, `QuestSelectRequest`,
  `QuestProceedRequest`, `QuestCompletionRequest`, `QuestCancelRequest`, `QuestStateRequest`,
  `ActiveQuestListRequest`, `EventQuestStateListRequest`, `AvailableQuestsRequest`, `NpcBuffRequest`,
  `Gens*Request`, `EnterOnWerewolfRequest`, `EnterOnGatekeeperRequest`, `CloseNpcRequest`.

## When it is off
`quests` is optional (`module.ts`): a server may run without it. Off, none of the listeners above
is registered and the quest state stays empty; the other modules' listeners on `CharacterInformation`
and `ObjectGotKilled` run as before. The facade and the windows stay: the tables still load on the
first frame, the quest log key opens an empty log, the Werewolf Guardsman and the Gatekeeper still
open the Balgass box and a quest NPC's `NpcWindowResponse` still opens the legacy dialog (their
requests go unanswered). No bubbles show: they wait for the quest list.

## Depends on / used by
- uses: `session` (`sendToGS`, `isOffline`), `hero`, chat's `addNotification`, `npc_shop` (`dropNpcTalk`,
  `talkToNpc`, `pendingNpcType`, `npcShop`), `inventory` (`pendingItemMove`), `Ecs.world`, `controllers/assets/mu`,
  `ecs/systems` (emoji bubbles, object effects), `hero/`, `items/`, `options/`, `src/i18n`.
- used by: `../modules.ts` (`module.ts`), `app/lifecycle.ts`, `ecs/systems/questSystem.ts`,
  `npcTalkSystem.ts`, `npc_shop/net.ts`, `session/net.ts`, `session/sessionExit.ts`. Windows:
  `versions/shared/ui/windows/quests/` (`index.tsx`, `tracker.tsx`) and `.../windows/balgass_entry/`.

## Change it
- add a quest entry: copy `_template.ts` to `<name>.ts`, rename `templateLayer`, set `name` to the
  file name. Keep its three parts in order: tuning constants (real units, why that value), state +
  plain reader functions (MobX `observable` for what a window renders) and handlers, then the
  exported `QuestLayer` with `update` / `reset`. Add it to `layers.ts` after any entry it reads.
- handle a quest packet: `EventBus.on(...)` in the `install<Entry>()` of the entry that owns the
  state. A new entry's install goes in `module.ts`, where its listeners should run.
- change a window: `versions/shared/ui/windows/quests/index.tsx` (tracker: `tracker.tsx`).
- change an objective line: `objectives.ts` (shared by the log and the tracker).

## Tests
- `objectives.test.ts`: objective text, counts capped at the target, done check, empty and unknown conditions.
- `../switchOff.test.ts`: installing registers the listeners and loading does not; off, its packets
  keep only the other modules' listeners.

## Notes
### legacyQuests.ts
States come from the list and the hero's bag ("bring me X"). The dialog state machine is the original's:
```
CheckQuestState(): state = 2 bits of the list for m_byCurrQuestIndex
  QUEST_NO  -> CheckRequestCondition ? page = act.startText[0] : errorText
  QUEST_ING -> CheckActCondition     ? page = act.startText[2], state=QUEST_ITEM
  QUEST_END ->                         page = act.startText[3]
ShowDialogText(page): lines + answers from g_DialogScript
answer click: m_iReturnForAnswer 1 -> ProcessNextProgress (re-check zen, then
  SendLegacyQuestStateSetRequest(idx, 1)), 2 -> close, 3 -> SetRequest(idx, 1);
  then m_iLinkForAnswer > 0 -> ShowDialogText(link)
```
### npcDialogue.ts
Pages are keyed `npc * 0x10000 + page`. An answer result up to 900 is the next page, otherwise a
request (`ProcessSelTextResult`): 901 the NPC's quest list (`AvailableQuestsRequest`, drawn inside
the dialogue as in `ProcessQuestListReceive`), 902 the NPC buff (then close), 903..907 Gens join /
leave / reward. `questLog.ts` keeps the list data. It also asks whether this dialogue is up, through
a reader `installNpcDialogue` hands it (`setDialogueOpenReader`): this file imports `questLog.ts`,
so `questLog.ts` cannot import it back.
### questLog.ts
A quest key is `(group << 16) | number` (`dwQuestIndex`), also the key of `QuestProgress.bmd`.
