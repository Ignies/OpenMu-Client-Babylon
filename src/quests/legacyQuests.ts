import { t, type TextKey } from '../i18n';
/**
 * The legacy quest chain - Scroll of the Emperor, Three Treasures of Mu,
 * Gain Hero Status, Secret of Dark Stone, Evidence of Strength, the Balgass
 * quests - ported from `CSQuest` (CSQuest.cpp) and the window that shows it,
 * `CNewUINPCQuest` (NewUINPCQuest.cpp).
 *
 * Driven by the 0xA0…0xA4 packets: `LegacyQuestStateList` (all states, 2 bits
 * per quest), `LegacyQuestStateDialog` (the NPC opened the quest window),
 * `LegacySetQuestStateResponse` (the state changed), `LegacyQuestReward`
 * (level-up points / class change), and the hero's own bag for the
 * "bring me X" check. Read by the NPC quest window
 * (`ui/…/quests/NpcQuestWindow`) and `questBubbles.ts`.
 *
 * The dialog state machine is the original's, in its terms:
 *
 * ```
 * CheckQuestState(): state = 2 bits of the list for m_byCurrQuestIndex
 *   QUEST_NO  → CheckRequestCondition ? page = act.startText[0] : errorText
 *   QUEST_ING → CheckActCondition     ? page = act.startText[2], state=QUEST_ITEM
 *   QUEST_END →                         page = act.startText[3]
 * ShowDialogText(page): lines + answers from g_DialogScript
 * answer click: m_iReturnForAnswer 1 → ProcessNextProgress (re-check zen, then
 *   SendLegacyQuestStateSetRequest(idx, 1)), 2 → close, 3 → SetRequest(idx, 1);
 *   then m_iLinkForAnswer > 0 → ShowDialogText(link)
 * ```
 */
import { observable, reaction, runInAction } from 'mobx';
import { getBaseClass, BaseClass } from '../common/characterStats';
import { itemBaseName } from '../common/itemsDatabase';
import { classOf } from '../common/itemStats';
import { monsterDisplayName } from '../common/monstersDatabase';
import {
  CloseNpcRequestPacket,
  LegacyQuestStateRequestPacket,
  LegacyQuestStateSetRequestPacket,
} from '../common/packets/ClientToServerPackets';
import {
  ConditionTypeEnum,
  LegacyQuestRewardPacket,
  LegacyQuestRewardQuestRewardTypeEnum as Reward,
  LegacyQuestStateDialogPacket,
  LegacyQuestStateListPacket,
  LegacySetQuestStateResponsePacket,
} from '../common/packets/ServerToClientPackets';
import type { CharacterClassNumber } from '../common/types';
import { EventBus } from '../libs/eventBus';
import { playUiSound } from '../libs/sfx';
import { MAX_QUESTS, QuestActKind, type QuestDefinition } from '../libs/mu/questFiles';
import { Store } from '../store';
import type { QuestLayer } from './layer';
import {
  dialogScript,
  questDataReady,
  questDefinition,
} from './questData';
import { clearLocalKills, legacyKillCount, legacyServerKillCount } from './killCounters';
import type { QuestObjective } from './objectives';

// ---- 1. tuning -------------------------------------------------------------

/** Quest states, 2 bits each in the list (`_enum.h:3526`). */
export const LegacyQuestState = {
  /** `QUEST_NONE`: not started. */
  None: 0,
  /** `QUEST_ING`: accepted, bringing the items / kills. */
  InProgress: 1,
  /** `QUEST_END`: finished. */
  Finished: 2,
  /** `QUEST_NO`: not started yet - what OpenMU sends for every quest not taken. */
  No: 3,
} as const;

/** Dialog-only states `CheckQuestState` sets (`_enum.h:3530-3531`). */
const DIALOG_STATE_ITEM = 4; // QUEST_ITEM: everything brought, may complete
const DIALOG_STATE_ERROR = 5; // QUEST_ERROR: a request (level, zen…) failed

/** `QUEST_STATES_PER_ENTRY` / `QUEST_STATE_BIT_WIDTH` / `QUEST_STATE_MASK`. */
const STATES_PER_BYTE = 4;
const STATE_BITS = 2;
const STATE_MASK = 0x03;

/**
 * `QUEST_COMBO` (_enum.h:3536-3542): the quest enum runs CHANGE_UP_1, 2, 3,
 * COMBO, 3RD_CHANGE_UP_1, 2, 3 - so the combo quest is 3, "Secret of Dark
 * Stone", and it is the Blade Knight's. It was 2 here, which is "Gain Hero
 * status" and belongs to everyone, so the chain skipped a quest the other
 * classes have to do and stopped on one that is not theirs.
 */
const QUEST_COMBO = 3;

/** `wCompleteQuestIndex` / `byType` "none" markers in the request rows. */
const NO_PREREQUISITE = 65535;
const REQUEST_ANY_ACT = 255;

/** `m_iReturnForAnswer` codes (`UpdateSelTextMouseEvent`). */
const ANSWER_NEXT_PROGRESS = 1;
const ANSWER_CLOSE = 2;
const ANSWER_SET_STATE = 3;

/** `LegacyQuestStateSetRequest.NewState` the original always sends: "accept / advance". */
const SET_STATE_ADVANCE = 1;

/** `NUM_LINE_CMB` / `MAX_LENGTH_CMB`: the window wraps to 7 lines of 38 chars. */
export const DIALOG_MAX_LINES = 7;
const DIALOG_LINE_CHARS = 38;

/** `MAX_ITEM_INDEX`: item `Type = group * 512 + index`. */
const MAX_ITEM_INDEX = 512;

/** GlobalText 609: the lone answer when a page has none. */
const DEFAULT_ANSWER_KEY: TextKey = 'common.close';

// ---- 2. state + readers ----------------------------------------------------

/** One clickable line of the dialog. */
export type LegacyQuestAnswer = { text: string; link: number; action: number };

const state = observable({
  /** `m_byQuestList` unpacked: one state per quest index. */
  states: new Array<number>(MAX_QUESTS).fill(LegacyQuestState.None),
  /** `m_byCurrQuestIndex`: the quest the NPC window is about. */
  currentIndex: 0,
  /** `m_byCurrQuestIndexWnd`: the quest the "Job change" tab shows. */
  windowIndex: 0,
  /** `m_byCurrState` after `CheckQuestState` (dialog state, may be 4/5). */
  dialogState: 0,
  /** `INTERFACE_NPCQUEST` visible. */
  npcWindowOpen: false,
  /** `g_iCurrentDialogScript`. */
  page: 0,
  /** `g_lpszMessageBoxCustom`: the NPC's lines, wrapped. */
  lines: [] as string[],
  /** `g_lpszDialogAnswer`: the numbered answers. */
  answers: [] as LegacyQuestAnswer[],
  /** `m_dwNeedZen`: the offering the current page asks for (0 = none). */
  needZen: 0,
  /** Whether the list arrived for this character (`m_bOnce`). */
  received: false,
  /** The list's quest count: the chain ends there. */
  count: 0,
  /** The last page was picked before the quest tables were decoded. */
  pageStale: false,
});

/** Whether the NPC quest window is showing. */
export function legacyQuestWindowOpen(): boolean {
  return state.npcWindowOpen;
}

/** The quest the window is about. */
export function legacyQuestCurrentIndex(): number {
  return state.currentIndex;
}

/** `getQuestState2(index)`: stored state, 0…2. */
export function legacyQuestState(index: number): number {
  return state.states[index] ?? LegacyQuestState.None;
}

/** Every state, for the quest log tab. */
export function legacyQuestStates(): readonly number[] {
  return state.states;
}

/** `m_byCurrState` after the last check, including the dialog-only values. */
export function legacyQuestDialogState(): number {
  return state.dialogState;
}

/** The NPC's lines of the current page. */
export function legacyQuestLines(): readonly string[] {
  return state.lines;
}

/** The answers of the current page. */
export function legacyQuestAnswers(): readonly LegacyQuestAnswer[] {
  return state.answers;
}

/** Zen the current page is asking for; 0 when none. */
export function legacyQuestNeedZen(): number {
  return state.needZen;
}

/** `getQuestTitleWindow()`: name of the quest the log tab is about. */
export function legacyQuestWindowTitle(): string {
  return questDefinition(state.windowIndex)?.name ?? '';
}

/** The chain quests the hero is on (`QUEST_ING`), by index. */
export function legacyQuestsInProgress(): number[] {
  const running: number[] = [];
  if (!state.received) return running;
  for (let i = 0; i < MAX_QUESTS; i++) {
    if (state.states[i] === LegacyQuestState.InProgress && questDefinition(i)?.name) running.push(i);
  }
  return running;
}

/** Whether the server told us the states yet. */
export function legacyQuestListReceived(): boolean {
  return state.received;
}

/** `GetBaseClass(Hero->Class)` as the act's class column. */
function heroClass(): BaseClass {
  return getBaseClass(Store.playerData.charClass);
}

/**
 * `setQuestLists`: the quest indexes this class walks, in order. A Knight
 * takes the whole chain, the three later classes start at 4, and everyone
 * else skips the combo quest.
 */
function chainIndexes(cls: BaseClass, count: number): number[] {
  const out: number[] = [];
  const later =
    cls === BaseClass.MagicGladiator ||
    cls === BaseClass.DarkLord ||
    cls === BaseClass.RageFighter;
  const from = later ? 4 : 0;
  for (let i = from; i < count; i++) {
    if (cls !== BaseClass.Knight && i === QUEST_COMBO) continue;
    out.push(i);
  }
  return out;
}

/** `m_byCurrQuestIndex` after `setQuestLists`: the first unfinished quest of the chain. */
function firstOpenQuest(count: number, cls: BaseClass): number {
  const stateOf = (i: number) => state.states[i] ?? LegacyQuestState.None;
  const open = chainIndexes(cls, count).find(i => stateOf(i) !== LegacyQuestState.Finished);
  return open ?? count;
}

/**
 * The chain quest the hero is on (the list's count once it is done). Not
 * `currentIndex`, which every dialog packet moves to the quest talked about.
 */
export function legacyQuestNextIndex(): number {
  return firstOpenQuest(state.count, heroClass());
}

/** `setQuestLists`: the packed 2-bit list from `LegacyQuestStateList`. */
function setQuestList(packed: Uint8Array, count: number): void {
  runInAction(() => {
    for (let i = 0; i < MAX_QUESTS; i++) {
      const byte = packed[Math.floor(i / STATES_PER_BYTE)] ?? 0;
      const shift = (i % STATES_PER_BYTE) * STATE_BITS;
      state.states[i] = i < count ? (byte >> shift) & STATE_MASK : LegacyQuestState.None;
    }
    const first = firstOpenQuest(count, heroClass());
    state.count = count;
    state.currentIndex = first;
    state.windowIndex = first;
    state.received = true;
  });
}

/**
 * `setQuestList(index, result)`: `result` is the whole byte of the four
 * quests in `index`'s group (`m_byQuestList[index / 4]`), not one state.
 */
function setQuestState(index: number, packed: number): void {
  if (index < 0 || index >= MAX_QUESTS) return;
  runInAction(() => {
    const base = index - (index % STATES_PER_BYTE);
    for (let i = 0; i < STATES_PER_BYTE; i++) {
      state.states[base + i] = (packed >> (i * STATE_BITS)) & STATE_MASK;
    }
    state.currentIndex = index;
    state.windowIndex = Math.max(index, state.windowIndex);
  });
}

/** The state `packed` gives `index` itself. */
function ownState(index: number, packed: number): number {
  return (packed >> ((index % STATES_PER_BYTE) * STATE_BITS)) & STATE_MASK;
}

/** `FindQuestItemsInInven`: how many of `count` items are still missing. */
function missingItems(itemType: number, count: number, level: number): number {
  let found = 0;
  for (const item of Store.playerData.items) {
    if (!item) continue;
    if (item.group * MAX_ITEM_INDEX + item.num !== itemType) continue;
    if (level !== -1 && (item.lvl ?? 0) !== level) continue;
    if (count <= ++found) return 0;
  }
  return count - found;
}

/** Which acts apply to the hero's class. */
function actsForHero(quest: QuestDefinition) {
  const cls = heroClass();
  return quest.acts.slice(0, quest.conditionCount).filter(act => (act.requestClass[cls] ?? 0) >= 1);
}

/**
 * `CheckRequestCondition`: level / prerequisite / zen rows for the acts of
 * this class. `errorPage` is -1 when everything passes. Zen is only enforced
 * on `lastCheck` (the accept click); before that it is merely remembered for
 * the window's offering line.
 */
function requestCheck(quest: QuestDefinition, lastCheck: boolean): { errorPage: number; needZen: number } {
  let needZen = 0;
  let errorPage = -1;

  outer: for (const act of actsForHero(quest)) {
    for (const req of quest.requests.slice(0, quest.requestCount)) {
      if (req.type !== act.requestType && req.type !== REQUEST_ANY_ACT) continue;

      if (req.completeQuestIndex !== NO_PREREQUISITE) {
        if (legacyQuestState(req.completeQuestIndex) !== LegacyQuestState.Finished) {
          errorPage = req.errorText;
          break outer;
        }
      }
      const level = Store.playerData.level;
      if (req.levelMin > 0 && req.levelMin > level) {
        errorPage = req.errorText;
        break outer;
      }
      if (req.levelMax > 0 && req.levelMax < level) {
        errorPage = req.errorText;
        break outer;
      }
      if (req.zen > 0) {
        needZen = req.zen;
        if (lastCheck && needZen > Store.playerData.money) {
          errorPage = req.errorText;
          break outer;
        }
      }
    }
  }

  return { errorPage, needZen };
}

/** `CheckRequestCondition` for the window: remembers the offering, returns the error page. */
function checkRequests(quest: QuestDefinition, lastCheck: boolean): number {
  const { errorPage, needZen } = requestCheck(quest, lastCheck);
  runInAction(() => {
    state.needZen = needZen;
  });
  return errorPage;
}

/** Whether the hero may take quest `index` now (level, prerequisite; zen is asked at the accept). */
export function legacyQuestAvailable(index: number): boolean {
  const quest = questDefinition(index);
  return !!quest && requestCheck(quest, false).errorPage < 0;
}

/**
 * `CheckActCondition`: has the hero brought everything? Kills are the
 * server's count at the last 0xA4, as `m_anKillMobCount` is.
 */
function actsFulfilled(quest: QuestDefinition): boolean {
  for (const act of actsForHero(quest)) {
    if (act.kind === QuestActKind.Item) {
      const type = act.itemType * MAX_ITEM_INDEX + act.itemSubType;
      if (missingItems(type, act.itemNum, act.itemLevel) > 0) return false;
    } else if (act.kind === QuestActKind.Monster) {
      if (legacyServerKillCount(act.itemType) < act.itemNum) return false;
    }
  }
  return true;
}

/** The act's item as the bag's tooltip names it: a +1 quest item shows its level. */
function actItemName(act: QuestDefinition['acts'][number], type: number): string {
  const name = itemBaseName(act.itemType, act.itemSubType) || t('quest.itemFallback', { id: type });
  return act.itemLevel > 0 ? `${name} +${act.itemLevel}` : name;
}

/**
 * `RenderItemMobText`: what this class still has to bring, as objective
 * records. The item count is the bag's. Kills are the server's count, plus
 * the hero's kills since when `live` (the tracker; the NPC window shows what
 * `CheckActCondition` reads).
 */
export function legacyQuestObjectives(index: number, live = true): QuestObjective[] {
  const quest = questDefinition(index);
  if (!quest) return [];

  const objectives: QuestObjective[] = [];
  for (const act of actsForHero(quest)) {
    if (act.kind === QuestActKind.Monster) {
      objectives.push({
        type: ConditionTypeEnum.MonsterKills,
        id: act.itemType,
        required: act.itemNum,
        current: live ? legacyKillCount(act.itemType) : legacyServerKillCount(act.itemType),
        name: monsterDisplayName(act.itemType),
      });
    } else if (act.kind === QuestActKind.Item) {
      const type = act.itemType * MAX_ITEM_INDEX + act.itemSubType;
      objectives.push({
        type: ConditionTypeEnum.Item,
        id: type,
        required: act.itemNum,
        current: act.itemNum - missingItems(type, act.itemNum, act.itemLevel),
        name: actItemName(act, type),
      });
    }
  }
  return objectives;
}

/** What `CheckQuestState` settles on: the page, the dialog state, the quest it landed on. */
type PagePick = { index: number; page: number; dialogState: number; needZen: number };

/**
 * `CheckQuestState` for quest `index`, without writing anything. A quest
 * with no act for the hero's class has no page of its own; `FindQuestContext`
 * then steps the chain back one and asks that quest instead, which is the
 * walk `depth` bounds. Null while the tables are not decoded.
 */
function pickPage(index: number, depth = 0): PagePick | null {
  const quest = questDefinition(index);
  if (!quest) return null;

  let dialogState: number = legacyQuestState(index);
  let needZen = 0;
  let column = 3;

  switch (dialogState) {
    case LegacyQuestState.None:
    case LegacyQuestState.No: {
      const check = requestCheck(quest, false);
      needZen = check.needZen;
      if (check.errorPage >= 0) {
        return { index, page: check.errorPage, dialogState: DIALOG_STATE_ERROR, needZen };
      }
      column = 0;
      break;
    }
    case LegacyQuestState.InProgress:
      if (actsFulfilled(quest)) {
        column = 2;
        dialogState = DIALOG_STATE_ITEM;
      } else {
        column = 1;
      }
      break;
  }

  const act = actsForHero(quest)[0];
  if (act) return { index, page: act.startText[column], dialogState, needZen };
  if (index <= 0 || depth >= MAX_QUESTS) return { index, page: 0, dialogState, needZen };

  const back = pickPage(index - 1, depth + 1);
  if (!back) return { index, page: 0, dialogState, needZen };
  return { ...back, dialogState, needZen: back.needZen || needZen };
}

/** `CheckQuestState`: pick the page and the dialog state for the current quest. */
function checkQuestState(): number {
  const pick = pickPage(state.currentIndex);
  runInAction(() => {
    state.pageStale = !pick;
    if (!pick) return;
    state.currentIndex = pick.index;
    state.dialogState = pick.dialogState;
    state.needZen = pick.needZen;
  });
  return pick?.page ?? 0;
}

/**
 * `ShowQuestPreviewWindow`: the page the "Job change" tab shows for the
 * chain quest (`m_byCurrQuestIndexWnd`), leaving the NPC window alone.
 */
export function legacyQuestPreviewLines(): string[] {
  const pick = pickPage(state.windowIndex);
  return pick ? wrapDialogText(dialogScript(pick.page)?.text ?? '') : [];
}

/**
 * `BeQuestItem`: the window's quest is running and every item and kill it
 * asks for is there. Unlocks the "Proceed with quest" button, which is what
 * lets a kill count that lands after the page was picked complete the quest.
 */
export function legacyQuestCanComplete(): boolean {
  if (!state.npcWindowOpen) return false;
  if (legacyQuestState(state.currentIndex) !== LegacyQuestState.InProgress) return false;
  const quest = questDefinition(state.currentIndex);
  if (!quest) return false;
  const counted = actsForHero(quest).some(
    act => act.kind === QuestActKind.Item || act.kind === QuestActKind.Monster
  );
  return counted && actsFulfilled(quest);
}

/** Whether this NPC gives any chain quest, to any class. */
function isLegacyQuestNpc(npcType: number): boolean {
  for (let i = 0; i < MAX_QUESTS; i++) {
    if (questDefinition(i)?.npcType === npcType) return true;
  }
  return false;
}

/** `m_btnComplete` clicked: `SendLegacyQuestStateSetRequest(index, 1)`. */
export function completeLegacyQuest(): void {
  if (!legacyQuestCanComplete()) return;
  sendSetState(state.currentIndex);
  playUiSound('window');
}

/** `SeparateTextIntoLines`: greedy word wrap to the window's 38 columns. */
export function wrapDialogText(text: string, maxLines = DIALOG_MAX_LINES, width = DIALOG_LINE_CHARS): string[] {
  const lines: string[] = [];
  let current = '';

  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= width) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

/** `ShowDialogText(page)`: put a dialog page in the window. */
function showDialogText(page: number): void {
  const script = dialogScript(page);
  const answers: LegacyQuestAnswer[] = (script?.answers ?? []).map((a, i) => ({
    text: `${i + 1}) ${a.text}`,
    link: a.link,
    action: a.action,
  }));
  if (answers.length === 0) {
    answers.push({ text: `1) ${t(DEFAULT_ANSWER_KEY)}`, link: 0, action: ANSWER_CLOSE });
  }

  runInAction(() => {
    state.page = page;
    state.lines = wrapDialogText(script?.text ?? '');
    state.answers = answers;
  });
}

/**
 * A dialogue page is a snapshot: `showDialogText` copies the words and answers
 * out of the tables into `state`. When the language changes those tables are
 * fetched again (`questData.ts`), so an open window has to be redrawn from the
 * new ones - otherwise it keeps showing the language it was opened in.
 *
 * Keyed on `questDataReady()` rather than on the language itself: it is the
 * flip back to true, once the new tables are decoded, that has something to
 * show.
 */
reaction(
  () => questDataReady(),
  ready => {
    if (!ready || !state.npcWindowOpen) return;
    // A window opened before the first decode has no real page to redraw yet.
    showDialogText(state.pageStale ? checkQuestState() : state.page);
  }
);

/** `ShowQuestNpcWindow(index)`: open the window on a quest (default: the current one). */
export function openLegacyQuestWindow(index = -1): void {
  runInAction(() => {
    if (index >= 0) state.currentIndex = index;
    state.npcWindowOpen = true;
  });
  showDialogText(checkQuestState());
  playUiSound('window');
}

/**
 * `SendCloseNpcRequest`: OpenMU keeps the hero in its NPC dialog state until
 * told, and refuses potions, trades and parties meanwhile.
 */
function endNpcTalk(): void {
  if (Store.npcShop) Store.closeNpcShop();
  else if (!Store.isOffline) Store.sendToGS(CloseNpcRequestPacket.createPacket().buffer);
  Store.dropNpcTalk();
}

/** `Hide(INTERFACE_NPCQUEST)`: `ProcessClosing` always ends the NPC talk. */
export function closeLegacyQuestWindow(): void {
  if (!state.npcWindowOpen) return;
  runInAction(() => {
    state.npcWindowOpen = false;
  });
  endNpcTalk();
}

/** Another NPC talk started: `HideAll` drops the window without a second close. */
function hideLegacyQuestWindow(): void {
  runInAction(() => {
    state.npcWindowOpen = false;
  });
}

/** `SendLegacyQuestStateSetRequest(index, 1)`. */
function sendSetState(index: number): void {
  const packet = LegacyQuestStateSetRequestPacket.createPacket();
  packet.QuestNumber = index;
  packet.NewState = SET_STATE_ADVANCE;
  Store.sendToGS(packet.buffer);
}

/** `ProcessNextProgress`: re-check with zen enforced, then ask the server. Returns true on error. */
function processNextProgress(): boolean {
  const quest = questDefinition(state.currentIndex);
  if (!quest) return true;

  const error = checkRequests(quest, true);
  if (error >= 0) {
    showDialogText(error);
    return true;
  }
  sendSetState(state.currentIndex);
  return false;
}

/** `UpdateSelTextMouseEvent`: the hero picked answer `i`. */
export function answerLegacyQuest(i: number): void {
  const answer = state.answers[i];
  if (!answer) return;

  let errored = false;
  if (answer.action === ANSWER_NEXT_PROGRESS) errored = processNextProgress();
  else if (answer.action === ANSWER_CLOSE) closeLegacyQuestWindow();
  else if (answer.action === ANSWER_SET_STATE) sendSetState(state.currentIndex);

  playUiSound('window');

  if (answer.link > 0 && !errored) showDialogText(answer.link);
}

/** `SendLegacyQuestStateRequest` (0xA0): ask for every state after entering. */
export function requestLegacyQuestStates(): void {
  if (Store.isOffline) return;
  Store.sendToGS(LegacyQuestStateRequestPacket.createPacket().buffer);
}

/**
 * Which of this NPC's quests to open on him. The original never asks: it
 * opens the chain where it stands (`ShowQuestNpcWindow()` with no index), and
 * the server is what decides the NPC. Ours has to pick both, and picking the
 * NPC's *first* quest meant Sebina kept re-opening the finished Scroll of the
 * Emperor page and never offered the Three Treasures of Mu behind it. So:
 * the first quest of his the hero has not finished, and his last one once
 * they all are, which is the page that thanks them.
 */
export function legacyQuestForNpc(npcType: number): QuestDefinition | undefined {
  const mine = chainIndexes(heroClass(), MAX_QUESTS)
    .map(i => questDefinition(i))
    .filter(
      (q): q is QuestDefinition =>
        !!q && q.npcType === npcType && !!q.name && actsForHero(q).length > 0
    );
  if (!mine.length) return undefined;

  return (
    mine.find(q => legacyQuestState(q.index) !== LegacyQuestState.Finished) ??
    mine[mine.length - 1]
  );
}

/** `Hero->byExtensionSkill`: the combo is unlocked by finishing `QUEST_COMBO`. */
export function comboUnlocked(): boolean {
  return legacyQuestState(QUEST_COMBO) === LegacyQuestState.Finished;
}

// ---- packet handlers (ReceiveQuestHistory / State / Result / Prize) -------

EventBus.on('LegacyQuestStateList', packet => {
  const p = new LegacyQuestStateListPacket(packet);
  const count = p.QuestCount;
  const bytes = Math.ceil(count / STATES_PER_BYTE);
  const packed = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i++) {
    packed[i] = packet.byteLength > LegacyQuestStateListPacket.DataOffset + 2 + i
      ? packet.getUint8(LegacyQuestStateListPacket.DataOffset + 2 + i)
      : 0;
  }
  setQuestList(packed, count);
});

EventBus.on('LegacyQuestStateDialog', packet => {
  const p = new LegacyQuestStateDialogPacket(packet);
  const index = p.QuestIndex;

  // With the talked NPC's next quest still level-locked, OpenMU sends index 0
  // and the byte of the quest last finished, another group: open that NPC's
  // own quest instead and keep the states. A running quest opens anywhere.
  const npc = Store.pendingNpcType;
  const quest = questDefinition(index);
  if (npc && quest && quest.npcType !== npc && ownState(index, p.State) !== LegacyQuestState.InProgress) {
    const mine = legacyQuestForNpc(npc);
    if (mine) openLegacyQuestWindow(mine.index);
    // Otherwise it answers an earlier talk, which the pending one's close already ended.
    else if (isLegacyQuestNpc(npc)) endNpcTalk();
    return;
  }

  setQuestState(index, p.State);
  openLegacyQuestWindow(index < MAX_QUESTS ? index : -1);
});

EventBus.on('LegacySetQuestStateResponse', packet => {
  const p = new LegacySetQuestStateResponsePacket(packet);
  // `ReceiveQuestResult`: Result 0 = accepted; anything else leaves the dialog where it is.
  if (p.Result !== 0) {
    Store.addNotification(t('quest.stateFailed'), 'error');
    return;
  }
  // `HideAll` before `Show`: the visible window closes, and the NPC talk with it.
  const wasOpen = state.npcWindowOpen;
  setQuestState(p.QuestIndex, p.NewState);
  clearLocalKills();
  if (wasOpen) endNpcTalk();
  openLegacyQuestWindow(p.QuestIndex < MAX_QUESTS ? p.QuestIndex : -1);
});

/**
 * `ReceiveQuestPrize` 201 / 204: the hero's new class. OpenMU fills the byte
 * with the class of whoever receives the packet, so only the hero's own copy
 * can be trusted; another player's evolution plays the effect alone.
 */
function evolveHero(cls: number, step: number): void {
  if (classOf(cls).step !== step) return;
  runInAction(() => {
    Store.playerData.charClass = cls as CharacterClassNumber;
  });
  const hero = Store.world?.playerEntity;
  if (hero?.charAppearance) {
    hero.charAppearance.charClass = cls as CharacterClassNumber;
    hero.charAppearance.changed = true;
  }
  Store.addNotification(t(step === 3 ? 'quest.evolvedThird' : 'quest.evolved'), 'info');
}

EventBus.on('LegacyQuestReward', packet => {
  const p = new LegacyQuestRewardPacket(packet);
  const world = Store.world;
  const hero = world?.playerEntity;
  const isHero = !!hero && (p.PlayerId & 0x7fff) === hero.netId;

  switch (p.Reward as number) {
    case Reward.LevelUpPoints:
    case Reward.LevelUpPointsPerLevelIncrease:
      // Gain Hero Status done at exactly level 220 sends 202 with 0 points.
      if (isHero && p.Count > 0) {
        runInAction(() => {
          Store.playerData.points += p.Count;
        });
        Store.addNotification(t('quest.rewardPoints', { count: p.Count }), 'info');
      }
      break;
    case Reward.CharacterEvolutionFirstToSecond:
      if (isHero) evolveHero(p.Count >> 3, 2);
      break;
    case Reward.CharacterEvolutionSecondToThird:
      if (isHero) evolveHero(p.Count >> 3, 3);
      break;
    case Reward.ComboSkill:
      if (isHero) Store.addNotification(t('quest.comboLearned'), 'info');
      break;
  }

  const target = isHero ? hero : world?.getByNetId(p.PlayerId & 0x7fff);
  if (target?.transform) EventBus.emit('objectEffect', { entity: target, effect: 'levelUp' });
  if (isHero) playUiSound('levelUp');
});

EventBus.on('npcTalkStarted', () => hideLegacyQuestWindow());
EventBus.on('heroWalked', () => closeLegacyQuestWindow());

// `ReceiveQuestHistory` is only answered when asked: the original sends 0xA0
// right after the character information. OpenMU also resends that on a bulk
// stat add or a reset, so only a different hero starts from a blank chain.
let heroName: string | null = null;
EventBus.on('CharacterInformation', () => {
  if (Store.playerData.name !== heroName) {
    heroName = Store.playerData.name;
    runInAction(() => {
      state.states.fill(LegacyQuestState.None);
      state.currentIndex = 0;
      state.windowIndex = 0;
      state.count = 0;
      state.received = false;
      state.npcWindowOpen = false;
    });
  }
  requestLegacyQuestStates();
});

function reset(): void {
  runInAction(() => {
    state.npcWindowOpen = false;
    state.needZen = 0;
  });
}

// ---- 3. the layer ----------------------------------------------------------

export const legacyQuestsLayer: QuestLayer = { name: 'legacyQuests', reset };
