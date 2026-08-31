import { t, type TextKey } from '../i18n';
/**
 * The Season 6 NPC dialogue — `CNewUINPCDialogue` (NewUINPCDialogue.cpp) on
 * top of `CQuestMng`'s `NPCDialogue.bmd` pages.
 *
 * Driven by `OpenNpcDialog` (F9 01, `ReceiveNPCDlgUIStart`): the server says
 * which NPC the hero is talking to; the words and answers come from the
 * table, keyed `npc * 0x10000 + page`. An answer's *result* is either the
 * next page (≤ 900) or a request (`ProcessSelTextResult`): 901 asks the
 * NPC's quest list (`AvailableQuestsRequest`, answered by `AvailableQuests`
 * → `ProcessQuestListReceive`, which turns the lower half into the list),
 * 902 asks the NPC buff and closes, 903..907 are the Gens requests.
 *
 * Read by `NpcDialogueWindow` in `ui/pages/worldPage/components/quests/`.
 * `questLog.ts` keeps the quest list *data*; this entry only decides that
 * the list is shown inside the dialogue while it is open.
 */
import { observable, reaction, runInAction } from 'mobx';
import {
  AvailableQuestsRequestPacket,
  CloseNpcRequestPacket,
  GensJoinRequestPacket,
  GensLeaveRequestPacket,
  GensRewardRequestPacket,
  GensTypeEnum,
  NpcBuffRequestPacket,
} from '../common/packets/ClientToServerPackets';
import { AvailableQuestsPacket, QuestStepInfoPacket } from '../common/packets/ServerToClientPackets';
import type { ENUM_WORLD } from '../common/types';
import { monsterDisplayName } from '../common/monstersDatabase';
import { EventBus } from '../libs/eventBus';
import { playUiSound } from '../libs/sfx';
import { Store } from '../store';
import type { QuestLayer } from './layer';
import {
  npcDialogueEntry,
  questDataReady,
  questWordLines,
  questWords,
} from './questData';
import { questKey, questSubject, selectQuest } from './questLog';

// ---- 1. tuning -------------------------------------------------------------

/** `GetNPCDlgAnswerResult` values above this are requests, not pages. */
const LAST_PAGE_RESULT = 900;
/** The page `SetContents(999)` shows for an unknown result ("NPC dialog script error!"). */
const ERROR_PAGE = 999;
/** `LOWORD(dwQuestIndex) == 0x00FF`: the server refused the selected quest. */
const STEP_GROUP_UNAVAILABLE = 0x00ff;
/** `ND_QUEST_INDEX_MAX_COUNT`: the list holds at most twenty quests. */
const MAX_QUEST_LIST = 20;

/** QuestWords the list mode uses: 1501 "Select a quest.", 1502 none available, 1007 "Go back.". */
const WORDS_SELECT_QUEST = 1501;
const WORDS_NO_QUEST = 1502;
const WORDS_GO_BACK = 1007;
/** Fallbacks for a Data copy without those words. */
const TEXT_SELECT_QUEST: TextKey = 'quest.dialogue.select';
const TEXT_NO_QUEST: TextKey = 'quest.dialogue.none';
const TEXT_GO_BACK: TextKey = 'quest.dialogue.goBack';
/** A NPC the table has no page for (OpenMU opens the dialogue for every `NpcDialog` NPC). */
const TEXT_DEFAULT_WORDS: TextKey = 'quest.dialogue.words';
const TEXT_DEFAULT_QUEST: TextKey = 'quest.dialogue.accept';

/** The Gens stewards (543 Duprian, 544 Vanert): the only NPCs that show contribution. */
const GENS_NPCS: ReadonlySet<number> = new Set([543, 544]);

/** `ProcessSelTextResult` request codes. */
const RESULT = {
  questList: 901,
  buff: 902,
  joinDuprian: 903,
  joinVanert: 904,
  leaveGens: 905,
  rewardDuprian: 906,
  rewardVanert: 907,
} as const;

// ---- 2. state + readers ----------------------------------------------------

/** One clickable line of the lower half (`m_aszSelTexts` + its result). */
export type NpcDialogueAnswer = {
  text: string;
  /** Page or request code; in list mode the quest key, or -1 for "Go back". */
  result: number;
};

const state = observable({
  open: false,
  /** `g_QuestMng.m_nNPCIndex`. */
  npcNumber: 0,
  /** `m_dwCurDlgIndex`. */
  page: 0,
  /** `m_aszNPCWords`, unwrapped: the window wraps to its width. */
  npcLines: [] as string[],
  answers: [] as NpcDialogueAnswer[],
  /** `m_bQuestListMode`: the lower half lists the NPC's quests. */
  questListMode: false,
  /** `m_dwContributePoint` (Gens stewards only). */
  contribution: 0,
  /** `m_bCanClick`: false while a request is out. */
  busy: false,
});

export function npcDialogueOpen(): boolean {
  return state.open;
}

export function npcDialogueNpcNumber(): number {
  return state.npcNumber;
}

/** `g_QuestMng.GetNPCName()`. */
export function npcDialogueNpcName(): string {
  return monsterDisplayName(state.npcNumber, `NPC ${state.npcNumber}`);
}

export function npcDialogueLines(): readonly string[] {
  return state.npcLines;
}

export function npcDialogueAnswers(): readonly NpcDialogueAnswer[] {
  return state.answers;
}

export function npcDialogueBusy(): boolean {
  return state.busy;
}

export function npcDialogueQuestListMode(): boolean {
  return state.questListMode;
}

/** Gens contribution to draw under the name; null unless a steward. */
export function npcDialogueContribution(): number | null {
  return GENS_NPCS.has(state.npcNumber) ? state.contribution : null;
}

// ---- commands ----------------------------------------------------------------

function send(buffer: DataView): boolean {
  if (Store.isOffline) return false;
  Store.sendToGS(buffer);
  return true;
}

/** `SetContents(page)`: the page's words and answers. */
function setContents(page: number): void {
  const entry = npcDialogueEntry(state.npcNumber, page);
  const lines = entry ? questWordLines(entry.npcWords) : [];
  const answers: NpcDialogueAnswer[] = entry
    ? entry.answers.map((a, i) => ({ text: `${i + 1}. ${questWords(a.words) ?? ''}`, result: a.result }))
    : [];

  runInAction(() => {
    state.page = page;
    state.questListMode = false;
    state.busy = false;
    if (entry) {
      state.npcLines = lines;
      state.answers = answers;
    } else {
      // No page for this NPC in the table: the one thing OpenMU can answer.
      state.npcLines = [t(TEXT_DEFAULT_WORDS)];
      state.answers = [
        { text: `1. ${t(TEXT_DEFAULT_QUEST)}`, result: RESULT.questList },
      ];
    }
  });
}

/**
 * Same reason as `legacyQuests.ts`: the page is copied out of the tables, and
 * a language change fetches new ones. Redraw the open page from them.
 */
reaction(
  () => questDataReady(),
  ready => {
    if (ready && state.open && !state.questListMode) setContents(state.page);
  }
);

/**
 * `ReceiveNPCDlgUIStart` → `Show(INTERFACE_NPC_DIALOGUE)` → `ProcessOpening`:
 * page 0 of this NPC. A second `OpenNpcDialog` while open is ignored.
 */
export function openNpcDialogue(npcNumber: number, contribution = 0): void {
  if (state.open) return;
  runInAction(() => {
    state.npcNumber = npcNumber;
    state.contribution = contribution;
    state.open = true;
  });
  setContents(0);
  playUiSound('window');
}

/** `ProcessClosing`: hide, tell the server (`SendCloseNpcRequest`). */
export function closeNpcDialogue(): void {
  if (!state.open) return;
  runInAction(() => {
    state.open = false;
    state.questListMode = false;
    state.busy = false;
    state.contribution = 0;
  });
  send(CloseNpcRequestPacket.createPacket().buffer);
  Store.dropNpcTalk();
  playUiSound('click');
}

/** Hide without the close request: another NPC window took the talk over. */
function hideNpcDialogue(): void {
  if (!state.open) return;
  runInAction(() => {
    state.open = false;
    state.questListMode = false;
    state.busy = false;
  });
}

function sendBusy(packet: DataView): void {
  if (send(packet)) {
    runInAction(() => {
      state.busy = true;
    });
  }
}

/** `ProcessSelTextResult`: the hero clicked answer `index`. */
export function answerNpcDialogue(index: number): void {
  if (!state.open || state.busy) return;
  const answer = state.answers[index];
  if (!answer) return;
  playUiSound('click');

  if (state.questListMode) {
    if (answer.result < 0) {
      setContents(0);
      return;
    }
    runInAction(() => {
      state.busy = true;
    });
    selectQuest(answer.result >>> 16, answer.result & 0xffff);
    return;
  }

  const result = answer.result;
  if (result <= LAST_PAGE_RESULT) {
    setContents(result);
    return;
  }
  switch (result) {
    case RESULT.questList:
      sendBusy(AvailableQuestsRequestPacket.createPacket().buffer);
      break;
    case RESULT.buff:
      send(NpcBuffRequestPacket.createPacket().buffer);
      closeNpcDialogue();
      break;
    case RESULT.joinDuprian:
    case RESULT.joinVanert: {
      const packet = GensJoinRequestPacket.createPacket();
      packet.GensType = result === RESULT.joinDuprian ? GensTypeEnum.Duprian : GensTypeEnum.Vanert;
      sendBusy(packet.buffer);
      break;
    }
    case RESULT.leaveGens:
      sendBusy(GensLeaveRequestPacket.createPacket().buffer);
      break;
    case RESULT.rewardDuprian:
    case RESULT.rewardVanert: {
      const packet = GensRewardRequestPacket.createPacket();
      packet.GensType = result === RESULT.rewardDuprian ? GensTypeEnum.Duprian : GensTypeEnum.Vanert;
      sendBusy(packet.buffer);
      break;
    }
    default:
      setContents(ERROR_PAGE);
  }
}

// ---- packet → state ----------------------------------------------------------

/**
 * `ProcessQuestListReceive`: while the dialogue is up the NPC's list goes
 * into it — words 1501 / 1502 above, "[Q]subject" lines and "Go back." below.
 */
EventBus.on('AvailableQuests', packet => {
  if (!state.open) return;
  const p = new AvailableQuestsPacket(packet);
  const quests = p.getQuests().slice(0, MAX_QUEST_LIST);
  const answers: NpcDialogueAnswer[] = quests.map((q, i) => {
    const key = questKey(q.Number, q.Group);
    return { text: `${i + 1}. [Q]${questSubject(key)}`, result: key };
  });
  answers.push({
    text: `${answers.length + 1}. ${questWords(WORDS_GO_BACK) ?? t(TEXT_GO_BACK)}`,
    result: -1,
  });
  const words =
    quests.length > 0
      ? (questWords(WORDS_SELECT_QUEST) ?? t(TEXT_SELECT_QUEST))
      : (questWords(WORDS_NO_QUEST) ?? t(TEXT_NO_QUEST));

  runInAction(() => {
    state.questListMode = true;
    state.npcLines = [words];
    state.answers = answers;
    state.busy = false;
  });
});

// The step / progress windows replace the dialogue (`CNewUISystem` shows one
// NPC interface at a time); a refused step (group 0xFF) just re-enables the list.
EventBus.on('QuestStepInfo', packet => {
  const p = new QuestStepInfoPacket(packet);
  if (p.QuestGroup === STEP_GROUP_UNAVAILABLE) {
    runInAction(() => {
      state.busy = false;
    });
    return;
  }
  hideNpcDialogue();
});
EventBus.on('QuestProgress', hideNpcDialogue);
EventBus.on('CharacterInformation', hideNpcDialogue);

function reset(): void {
  hideNpcDialogue();
}

function update(_map: ENUM_WORLD, _dt: number): void {
  // Pages resolve from the tables on demand; nothing ticks here.
}

// ---- 3. the layer ----------------------------------------------------------

export const npcDialogueLayer: QuestLayer = { name: 'npcDialogue', update, reset };
