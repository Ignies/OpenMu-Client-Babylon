import { t, type TextKey } from '../i18n';
/**
 * The Season 6 quest system — `CQuestMng` (QuestMng.cpp), the NPC quest
 * list of `CNewUINPCDialogue::ProcessQuestListReceive`, the progress window
 * `CNewUIQuestProgress` (NewUIQuestProgress.cpp) and the quest tab of
 * `CNewUIMyQuestInfoWindow` (NewUIMyQuestInfoWindow.cpp).
 *
 * Driven by the 0xF6 sub-packets:
 *
 * | packet | original | here |
 * |---|---|---|
 * | `AvailableQuests` (0A) | `ReceiveQuestByNPCEPList` | the NPC's list opens |
 * | `QuestStepInfo` (0B) | `ReceiveQuestQSSelSentence` | step dialog from `QuestProgress.bmd` |
 * | `QuestProgress` (0C) / `QuestState` (1B) | `ReceiveQuestQSRequestReward` | conditions + rewards |
 * | `QuestCompletionResponse` (0D) | `ReceiveQuestCompleteResult` | done / not yet |
 * | `QuestCancelled` (0F) | `ReceiveQuestGiveUp` | dropped from the log |
 * | `QuestStateList` (1A) | `ReceiveProgressQuestList` | the running quests |
 *
 * and answered with `QuestSelectRequest`, `QuestProceedRequest`,
 * `QuestCompletionRequest`, `QuestCancelRequest`, `QuestStateRequest`,
 * `ActiveQuestListRequest`, `EventQuestStateListRequest`.
 *
 * A quest is keyed the way the original packs it: `(number << 16) | group`
 * (`dwQuestIndex`), which is also the key of `QuestProgress.bmd`.
 *
 * Read by the quest windows in `ui/pages/worldPage/components/quests/`.
 */
import { observable, reaction, runInAction } from 'mobx';
import { ItemsDatabase } from '../common/itemsDatabase';
import { ItemSerializer } from '../common/itemSerializer';
import { monsterDisplayName } from '../common/monstersDatabase';
import {
  ActiveQuestListRequestPacket,
  CloseNpcRequestPacket,
  EventQuestStateListRequestPacket,
  QuestCancelRequestPacket,
  QuestCompletionRequestPacket,
  QuestProceedRequestPacket,
  QuestSelectRequestPacket,
  QuestStateRequestPacket,
} from '../common/packets/ClientToServerPackets';
import {
  AvailableQuestsPacket,
  ConditionTypeEnum,
  QuestCancelledPacket,
  QuestCompletionResponsePacket,
  QuestEventResponsePacket,
  QuestProgressPacket,
  QuestStateListPacket,
  QuestStatePacket,
  QuestStepInfoPacket,
  RewardTypeEnum,
} from '../common/packets/ServerToClientPackets';
import type { ENUM_WORLD } from '../common/types';
import { EventBus } from '../libs/eventBus';
import { playUiSound } from '../libs/sfx';
import { Store } from '../store';
import type { QuestLayer } from './layer';
import { questDataReady, questProgressEntry, questWordLines, questWords } from './questData';
import { npcDialogueOpen } from './npcDialogue';

// ---- 1. tuning -------------------------------------------------------------

/** `LOWORD(dwQuestIndex) == 0x00FF`: the server's "no quest for you" step. */
const STEP_GROUP_UNAVAILABLE = 0x00ff;

/** `QM_MAX_ANSWER`: the step dialog offers at most five answers. */
const MAX_ANSWERS = 5;

/** GlobalText 2814 / 2816 / 2825 / 375: the messages the original prints. */
const MSG_UNAVAILABLE: TextKey = 'quest.unavailable';
const MSG_NOT_FULFILLED: TextKey = 'quest.notFulfilled';
const MSG_NO_QUESTS: TextKey = 'quest.noneInProgress';
const MSG_INVENTORY_FULL: TextKey = 'quest.inventoryFull';

/** `RewardTypeEnum.Random`: the "one of these" reward group. */


// ---- 2. state + readers ----------------------------------------------------

/** `(number << 16) | group`, the original's `dwQuestIndex`. */
export function questKey(number: number, group: number): number {
  return ((number & 0xffff) << 16) | (group & 0xffff);
}

export function questKeyNumber(key: number): number {
  return (key >>> 16) & 0xffff;
}

export function questKeyGroup(key: number): number {
  return key & 0xffff;
}

/** One line of the request / reward list (`SRequestRewardText`). */
export type QuestRequirementLine = {
  text: string;
  /** Whether this line is a requirement (`RRC_REQUEST`) or a reward. */
  kind: 'request' | 'reward' | 'header';
  /** For requirements: already satisfied (drawn in the "done" colour). */
  done?: boolean;
};

/**
 * A quest the NPC offers (`AvailableQuests`).
 *
 * `subject` is a getter, not a stored string: the title comes out of
 * `QuestWords_<lang>.bmd`, which is swapped under us when the player changes
 * language, and the list is often still open when they do.
 */
export type AvailableQuest = { number: number; group: number; key: number; subject: string };

/** What a `QuestProgress` / `QuestState` carried, kept so the lines it draws
 *  can be built again after a language change. The packet's own accessors hand
 *  back copies (`_readDataView` slices), so holding these does not pin the
 *  receive buffer. */
type RawCondition = Parameters<typeof describeCondition>[0];
type RawReward = Parameters<typeof describeReward>[0];

/** The cached `QuestProgress` / `QuestState` of one quest. `lines` is derived
 *  for the same reason `subject` is. */
export type QuestProgressState = {
  key: number;
  lines: QuestRequirementLine[];
  /** Every condition met (`m_bRequestComplete`). */
  complete: boolean;
};

export type QuestProgressMode = 'npcWords' | 'playerWords' | 'requestReward';

export type MyQuestTab = 'quest' | 'jobChange' | 'castleTemple';

const state = observable({
  /** `m_listCurQuestIndex`: running quests (`QuestStateList`). */
  active: [] as number[],
  /** Cached conditions + rewards by key. */
  progress: new Map<number, QuestProgressState>(),
  /** The NPC's list (`ProcessQuestListReceive`). */
  npcNumber: 0,
  available: [] as AvailableQuest[],
  listOpen: false,

  // ---- CNewUIQuestProgress ----
  progressOpen: false,
  /** `m_dwCurQuestIndex`. */
  currentKey: 0,
  /** `m_eLowerView`. */
  mode: 'npcWords' as QuestProgressMode,
  npcLines: [] as string[],
  playerLines: [] as string[],
  /** `GetAnswer(i)`: words of each answer, 1-based on the wire. */
  answers: [] as string[],
  /** `m_bCanClick`: a request is in flight. */
  busy: false,

  /**
   * `QuestEventResponse` (F6 03) arrived: the server answered the event
   * quest list request (only for fresh characters without a Gens). It has
   * no per-quest payload worth keeping — OpenMU always sends two fixed
   * groups — so only the fact is remembered.
   */
  eventQuestsReceived: false,

  // ---- CNewUIMyQuestInfoWindow ----
  myQuestOpen: false,
  myQuestTab: 'quest' as MyQuestTab,
  selectedKey: 0,
});

/** Running quests, by key. */
export function activeQuests(): readonly number[] {
  return state.active;
}

/** Whether the event quest list (`QuestEventResponse`) has arrived. */
export function eventQuestListReceived(): boolean {
  return state.eventQuestsReceived;
}

/** The subject (title) of a quest from `QuestProgress.bmd` / `QuestWords`. */
export function questSubject(key: number): string {
  const entry = questProgressEntry(key);
  const subject = entry ? questWords(entry.subject) : undefined;
  return subject ?? `Quest ${questKeyNumber(key)}-${questKeyGroup(key)}`;
}

/** The summary of a quest (the log's lower box). */
export function questSummaryLines(key: number): string[] {
  const entry = questProgressEntry(key);
  return entry ? questWordLines(entry.summary) : [];
}

export function questListOpen(): boolean {
  return state.listOpen;
}

export function questListNpcNumber(): number {
  return state.npcNumber;
}

export function questListEntries(): readonly AvailableQuest[] {
  return state.available;
}

export function questProgressOpen(): boolean {
  return state.progressOpen;
}

export function questProgressKey(): number {
  return state.currentKey;
}

export function questProgressMode(): QuestProgressMode {
  return state.mode;
}

export function questProgressNpcLines(): readonly string[] {
  return state.npcLines;
}

export function questProgressPlayerLines(): readonly string[] {
  return state.playerLines;
}

export function questProgressAnswers(): readonly string[] {
  return state.answers;
}

export function questProgressBusy(): boolean {
  return state.busy;
}

/** Conditions + rewards of a quest, if the server sent them. */
export function questProgressOf(key: number): QuestProgressState | undefined {
  return state.progress.get(key);
}

export function myQuestWindowOpen(): boolean {
  return state.myQuestOpen;
}

export function myQuestTab(): MyQuestTab {
  return state.myQuestTab;
}

export function myQuestSelectedKey(): number {
  return state.selectedKey;
}

/** `MSG_NO_QUESTS` for the empty log. */
export function myQuestEmptyMessage(): string {
  return t(MSG_NO_QUESTS);
}

// ---- commands ----------------------------------------------------------------

function send(buffer: DataView): boolean {
  if (Store.isOffline) return false;
  Store.sendToGS(buffer);
  return true;
}

/** `SendActiveQuestListRequest` + `SendEventQuestStateListRequest`. */
export function requestActiveQuests(): void {
  send(ActiveQuestListRequestPacket.createPacket().buffer);
  send(EventQuestStateListRequestPacket.createPacket().buffer);
}

/** `SendQuestSelection`: the hero picked a quest in the NPC's list. */
export function selectQuest(number: number, group: number): void {
  const packet = QuestSelectRequestPacket.createPacket();
  packet.QuestNumber = number;
  packet.QuestGroup = group;
  packet.SelectedTextIndex = 0;
  if (send(packet.buffer)) {
    runInAction(() => {
      state.busy = true;
    });
  }
}

/** `SendQuestProceedRequest(number, group, answer)`: answer index is 1-based. */
export function answerQuestStep(index: number): void {
  if (state.busy || state.mode !== 'playerWords') return;
  const key = state.currentKey;
  const packet = QuestProceedRequestPacket.createPacket();
  packet.QuestNumber = questKeyNumber(key);
  packet.QuestGroup = questKeyGroup(key);
  packet.ProceedAction = index + 1;
  if (send(packet.buffer)) {
    runInAction(() => {
      state.busy = true;
    });
    playUiSound('click');
  }
}

/** `SendQuestCompletionRequest`. */
export function completeQuest(key = state.currentKey): void {
  const packet = QuestCompletionRequestPacket.createPacket();
  packet.QuestNumber = questKeyNumber(key);
  packet.QuestGroup = questKeyGroup(key);
  if (send(packet.buffer)) {
    runInAction(() => {
      state.busy = true;
    });
  }
}

/** `SendQuestGiveUp`: the Give-up button of the quest log. */
export function cancelQuest(key = state.selectedKey): void {
  if (!key) return;
  const packet = QuestCancelRequestPacket.createPacket();
  packet.QuestNumber = questKeyNumber(key);
  packet.QuestGroup = questKeyGroup(key);
  send(packet.buffer);
}

/** `SendQuestStateRequest`: fetch conditions + rewards for the log. */
export function requestQuestState(key: number): void {
  const packet = QuestStateRequestPacket.createPacket();
  packet.QuestNumber = questKeyNumber(key);
  packet.QuestGroup = questKeyGroup(key);
  send(packet.buffer);
}

/** The progress window's right arrow: next NPC page, then the hero's answers. */
export function advanceQuestWords(): void {
  if (state.mode === 'npcWords') {
    runInAction(() => {
      state.mode = state.answers.length > 0 ? 'playerWords' : 'requestReward';
    });
  }
}

/** `ProcessClosing` of the list / progress windows: `SendCloseNpcRequest` (the shop path when a merchant is up). */
function closeNpcTalk(): void {
  if (Store.npcShop) {
    Store.closeNpcShop();
    return;
  }
  send(CloseNpcRequestPacket.createPacket().buffer);
  Store.dropNpcTalk();
}

export function closeQuestList(): void {
  runInAction(() => {
    state.listOpen = false;
  });
  closeNpcTalk();
}

export function closeQuestProgress(): void {
  runInAction(() => {
    state.progressOpen = false;
    state.busy = false;
  });
  closeNpcTalk();
}

export function showMyQuestWindow(open: boolean): void {
  runInAction(() => {
    state.myQuestOpen = open;
  });
  if (open) requestActiveQuests();
}

export function selectMyQuestTab(tab: MyQuestTab): void {
  runInAction(() => {
    state.myQuestTab = tab;
  });
}

/** `SetSelQuestRequestReward`: select a running quest and ask for its details. */
export function selectMyQuest(key: number): void {
  runInAction(() => {
    state.selectedKey = key;
  });
  if (key && !state.progress.has(key)) requestQuestState(key);
}

/** The log's Open button: show the selected quest's progress window (`INTERFACE_QUEST_PROGRESS_ETC`). */
export function openSelectedQuest(): void {
  const key = state.selectedKey;
  if (!key) return;
  setProgressContents(key);
  runInAction(() => {
    state.mode = 'requestReward';
    state.progressOpen = true;
  });
}

// ---- packet → state ----------------------------------------------------------

/** `GetAnswer(i)` for every answer the step offers, numbered as it is drawn. */
function answerLines(entry: ReturnType<typeof questProgressEntry>): string[] {
  const answers: string[] = [];
  if (!entry) return answers;

  for (let i = 0; i < MAX_ANSWERS; i++) {
    const words = entry.answers[i] ? questWords(entry.answers[i]) : undefined;
    if (!words) break;
    answers.push(`${i + 1}.${words.replace(/;/g, ' ')}`);
  }

  return answers;
}

/** The three blocks of text the window draws, out of the current tables. */
function progressText(key: number): Pick<typeof state, 'npcLines' | 'playerLines' | 'answers'> {
  const entry = questProgressEntry(key);
  return {
    npcLines: entry ? questWordLines(entry.npcWords) : [],
    playerLines: entry ? questWordLines(entry.playerWords) : [],
    answers: answerLines(entry),
  };
}

/** `CNewUIQuestProgress::SetContents(dwQuestIndex)`. */
function setProgressContents(key: number): void {
  const text = progressText(key);

  runInAction(() => {
    state.currentKey = key;
    state.npcLines = text.npcLines;
    state.playerLines = text.playerLines;
    state.answers = text.answers;
    state.mode = text.answers.length > 0 ? 'npcWords' : 'requestReward';
    state.busy = false;
  });
}

/**
 * Same snapshot problem as the two dialogue windows: the step's words are
 * copied into `state` when the window opens, so an open window has to be
 * refilled from the tables a language change fetched. `mode` and `busy` are
 * left alone — the player is mid-conversation and did not step anywhere.
 */
reaction(
  () => questDataReady(),
  ready => {
    if (!ready || !state.progressOpen) return;
    const text = progressText(state.currentKey);
    runInAction(() => {
      state.npcLines = text.npcLines;
      state.playerLines = text.playerLines;
      state.answers = text.answers;
    });
  }
);

function itemName(data: DataView): string {
  try {
    const item = ItemSerializer.DeserializeItem(new Uint8Array(data.buffer));
    const config = ItemsDatabase.getItem(item.group, item.num);
    const level = item.lvl ? ` +${item.lvl}` : '';
    return `${config?.ItemName ?? `Item ${item.group}-${item.num}`}${level}`;
  } catch {
    return t('quest.item');
  }
}

function monsterName(type: number): string {
  return monsterDisplayName(type);
}

/** `CQuestMng::GetRequestRewardText`: one text line per condition / reward. */
function describeCondition(c: {
  Type: number;
  RequirementId: number;
  RequiredCount: number;
  CurrentCount: number;
  RequiredItemData: DataView;
}): QuestRequirementLine | null {
  const progress = `${Math.min(c.CurrentCount, c.RequiredCount)} / ${c.RequiredCount}`;
  const done = c.CurrentCount >= c.RequiredCount;
  const line = (text: string): QuestRequirementLine => ({ kind: 'request', done, text });

  switch (c.Type) {
    case ConditionTypeEnum.None:
      return null;
    case ConditionTypeEnum.MonsterKills:
      return line(t('quest.req.hunt', { name: monsterName(c.RequirementId), progress }));
    case ConditionTypeEnum.Item:
      return line(t('quest.req.bring', { name: itemName(c.RequiredItemData), progress }));
    case ConditionTypeEnum.Level:
      return line(t('quest.req.level', { level: c.RequiredCount }));
    case ConditionTypeEnum.Money:
      return line(t('quest.req.money', { amount: c.RequiredCount.toLocaleString() }));
    case ConditionTypeEnum.Skill:
      return line(t('quest.req.skill', { id: c.RequirementId }));
    case ConditionTypeEnum.ClientAction:
      return line(t('quest.req.tutorial'));
    case ConditionTypeEnum.RequestBuff:
      return line(t('quest.req.buff'));
    case ConditionTypeEnum.EventMapPlayerKills:
    case ConditionTypeEnum.EventMapMonsterKills:
      return line(t('quest.req.eventKills', { progress }));
    case ConditionTypeEnum.BloodCastleGate:
      return line(t('quest.req.bloodCastleGate'));
    case ConditionTypeEnum.WinBloodCastle:
      return line(t('quest.req.bloodCastle'));
    case ConditionTypeEnum.WinChaosCastle:
      return line(t('quest.req.chaosCastle'));
    case ConditionTypeEnum.WinDevilSquare:
      return line(t('quest.req.devilSquare'));
    case ConditionTypeEnum.WinIllusionTemple:
      return line(t('quest.req.illusionTemple'));
    case ConditionTypeEnum.DevilSquarePoints:
      return line(t('quest.req.devilSquarePoints', { progress }));
    case ConditionTypeEnum.PvpPoints:
      return line(t('quest.req.pvpPoints', { progress }));
    case ConditionTypeEnum.NpcTalk:
      return line(t('quest.req.talk', { name: monsterName(c.RequirementId) }));
    default:
      return line(t('quest.req.other', { type: c.Type, progress }));
  }
}

function describeReward(r: {
  Type: number;
  RewardId: number;
  RewardCount: number;
  RewardedItemData: DataView;
}): QuestRequirementLine | null {
  switch (r.Type) {
    case RewardTypeEnum.None:
      return null;
    case RewardTypeEnum.Experience:
      return {
        kind: 'reward',
        text: t('quest.reward.experience', { amount: r.RewardCount.toLocaleString() }),
      };
    case RewardTypeEnum.Money:
      return {
        kind: 'reward',
        text: t('quest.reward.money', { amount: r.RewardCount.toLocaleString() }),
      };
    case RewardTypeEnum.Item:
      return {
        kind: 'reward',
        text: t('quest.reward.item', {
          name: itemName(r.RewardedItemData),
          count: Math.max(1, r.RewardCount),
        }),
      };
    case RewardTypeEnum.GensContribution:
      return { kind: 'reward', text: t('quest.reward.gens', { amount: r.RewardCount }) };
    case RewardTypeEnum.Random:
      return { kind: 'header', text: t('quest.oneOf') };
    default:
      return {
        kind: 'reward',
        text: t('quest.reward.other', { type: r.Type, count: r.RewardCount }),
      };
  }
}

/** `SetQuestRequestReward`, drawn: headers through `t()`, monster names out of
 *  the language pack. Rebuilt on every read so both follow the selector. */
function requirementLines(raw: RawCondition[], rewardsRaw: RawReward[]): QuestRequirementLine[] {
  const lines: QuestRequirementLine[] = [];

  const conditions = raw.map(describeCondition).filter((l): l is QuestRequirementLine => !!l);
  if (conditions.length) {
    lines.push({ kind: 'header', text: t('quest.requirements') });
    lines.push(...conditions);
  }

  const rewards = rewardsRaw.map(describeReward).filter((l): l is QuestRequirementLine => !!l);
  if (rewards.length) {
    lines.push({ kind: 'header', text: t('quest.rewards') });
    lines.push(...rewards);
  }

  return lines;
}

/** `SetQuestRequestReward`: cache what a `QuestProgress` / `QuestState` carried. */
function storeProgress(p: QuestProgressPacket | QuestStatePacket): number {
  const key = questKey(p.QuestNumber, p.QuestGroup);
  const conditions = p.getConditions();
  const rewards = p.getRewards();
  const complete = conditions
    .filter(c => c.Type !== ConditionTypeEnum.None)
    .every(c => c.CurrentCount >= c.RequiredCount);

  runInAction(() => {
    state.progress.set(key, {
      key,
      complete,
      get lines() {
        return requirementLines(conditions, rewards);
      },
    });
    if (!state.active.includes(key)) state.active.push(key);
  });
  return key;
}

function removeActive(key: number): void {
  runInAction(() => {
    const i = state.active.indexOf(key);
    if (i >= 0) state.active.splice(i, 1);
    state.progress.delete(key);
    if (state.selectedKey === key) state.selectedKey = 0;
    if (state.currentKey === key) state.progressOpen = false;
  });
}

EventBus.on('AvailableQuests', packet => {
  const p = new AvailableQuestsPacket(packet);
  const available = p.getQuests().map(q => {
    const key = questKey(q.Number, q.Group);
    return {
      number: q.Number,
      group: q.Group,
      key,
      get subject() {
        return questSubject(key);
      },
    };
  });

  // `ProcessQuestListReceive`: while the S6 dialogue is up the list is drawn
  // inside it (npcDialogue.ts); the stand-alone list window is the fallback.
  const inDialogue = npcDialogueOpen();

  runInAction(() => {
    state.npcNumber = p.QuestNpcNumber;
    state.available = available;
    state.listOpen = !inDialogue && available.length > 0;
    state.busy = false;
  });

  if (inDialogue) return;
  if (available.length === 0) {
    Store.addNotification(t('quest.npcHasNone'), 'info');
    Store.dropNpcTalk();
  } else {
    playUiSound('window');
  }
});

// F6 03 — the answer to `EventQuestStateListRequest`; the original's
// handler is unknown / a no-op, so this only records that it came.
EventBus.on('QuestEventResponse', packet => {
  if (packet.byteLength < QuestEventResponsePacket.Length!) return;
  runInAction(() => {
    state.eventQuestsReceived = true;
  });
});

EventBus.on('QuestStepInfo', packet => {
  const p = new QuestStepInfoPacket(packet);

  if (p.QuestGroup === STEP_GROUP_UNAVAILABLE) {
    runInAction(() => {
      state.progressOpen = false;
      state.busy = false;
    });
    Store.addNotification(t(MSG_UNAVAILABLE), 'error');
    return;
  }

  const key = questKey(p.QuestStepNumber, p.QuestGroup);
  setProgressContents(key);
  runInAction(() => {
    state.listOpen = false;
    state.progressOpen = true;
  });
  playUiSound('window');
});

EventBus.on('QuestProgress', packet => {
  const p = new QuestProgressPacket(packet);
  const key = storeProgress(p);
  setProgressContents(key);
  runInAction(() => {
    state.mode = 'requestReward';
    state.listOpen = false;
    state.progressOpen = true;
  });
});

EventBus.on('QuestState', packet => {
  const p = new QuestStatePacket(packet);
  storeProgress(p);
});

EventBus.on('QuestCompletionResponse', packet => {
  const p = new QuestCompletionResponsePacket(packet);
  const key = questKey(p.QuestNumber, p.QuestGroup);

  runInAction(() => {
    state.busy = false;
  });

  if (p.IsQuestCompleted) {
    removeActive(key);
    runInAction(() => {
      state.progressOpen = false;
    });
    Store.addNotification(
      t('quest.completedNamed', { subject: questSubject(key) }),
      'info'
    );
    playUiSound('levelUp');
  } else {
    Store.addNotification(t(MSG_NOT_FULFILLED), 'error');
  }
});

EventBus.on('QuestCancelled', packet => {
  const p = new QuestCancelledPacket(packet);
  removeActive(questKey(p.QuestNumber, p.QuestGroup));
});

EventBus.on('QuestStateList', packet => {
  const p = new QuestStateListPacket(packet);
  const keys = p.getQuests().map(q => questKey(q.Number, q.Group));
  runInAction(() => {
    state.active = keys;
    for (const key of [...state.progress.keys()]) if (!keys.includes(key)) state.progress.delete(key);
    if (!keys.includes(state.selectedKey)) state.selectedKey = 0;
  });
});

EventBus.on('CharacterInformation', () => {
  runInAction(() => {
    state.active = [];
    state.progress.clear();
    state.available = [];
    state.listOpen = false;
    state.progressOpen = false;
    state.myQuestOpen = false;
    state.selectedKey = 0;
    state.busy = false;
  });
  requestActiveQuests();
});

/** Used by the facade when the inventory is full on completion (`GlobalText[375]`). */
export function questInventoryFullMessage(): string {
  return t(MSG_INVENTORY_FULL);
}

function reset(): void {
  runInAction(() => {
    state.listOpen = false;
    state.progressOpen = false;
    state.busy = false;
  });
}

function update(_map: ENUM_WORLD, _dt: number): void {
  // Titles resolve lazily once the tables are in; nothing ticks here.
}

// ---- 3. the layer ----------------------------------------------------------

export const questLogLayer: QuestLayer = { name: 'questLog', update, reset };
