import { t, type TextKey } from '../i18n';
/**
 * The legacy quest chain — Scroll of the Emperor, Three Treasures of Mu,
 * Gain Hero Status, Secret of Dark Stone, Evidence of Strength, the Balgass
 * quests — ported from `CSQuest` (CSQuest.cpp) and the window that shows it,
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
import {
  LegacyQuestStateRequestPacket,
  LegacyQuestStateSetRequestPacket,
} from '../common/packets/ClientToServerPackets';
import {
  LegacyQuestRewardPacket,
  LegacyQuestStateDialogPacket,
  LegacyQuestStateListPacket,
  LegacySetQuestStateResponsePacket,
} from '../common/packets/ServerToClientPackets';
import type { ENUM_WORLD } from '../common/types';
import { EventBus } from '../libs/eventBus';
import { playUiSound } from '../libs/sfx';
import { MAX_QUESTS, QuestActKind, type QuestDefinition } from '../libs/mu/questFiles';
import { Store } from '../store';
import type { QuestLayer } from './layer';
import {
  dialogScript,
  questDataReady,
  questDefinition,
  questDefinitions,
} from './questData';
import { legacyKillCount } from './killCounters';

// ---- 1. tuning -------------------------------------------------------------

/** Quest states, 2 bits each in the list (`_enum.h:3526`). */
export const LegacyQuestState = {
  /** `QUEST_NONE`: not started. */
  None: 0,
  /** `QUEST_ING`: accepted, bringing the items / kills. */
  InProgress: 1,
  /** `QUEST_END`: finished. */
  Finished: 2,
  /** `QUEST_NO`: rejected / not yet available (never stored, dialog-only). */
  No: 3,
} as const;

/** Dialog-only states `CheckQuestState` sets (`_enum.h:3530-3531`). */
const DIALOG_STATE_ITEM = 4; // QUEST_ITEM: everything brought, may complete
const DIALOG_STATE_ERROR = 5; // QUEST_ERROR: a request (level, zen…) failed

/** `QUEST_STATES_PER_ENTRY` / `QUEST_STATE_BIT_WIDTH` / `QUEST_STATE_MASK`. */
const STATES_PER_BYTE = 4;
const STATE_BITS = 2;
const STATE_MASK = 0x03;

/** `QUEST_COMBO` (_enum.h:3539): finishing it unlocks the combo skill. */
const QUEST_COMBO = 2;

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

/** `LegacyQuestReward.Reward` codes (`ReceiveQuestPrize`). */
const REWARD_LEVEL_UP_POINTS = 200;
const REWARD_CLASS_CHANGE = 201;
const REWARD_COMBO_SKILL = 202;
const REWARD_PLUS_STATS = 203;

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

/** Whether the server told us the states yet. */
export function legacyQuestListReceived(): boolean {
  return state.received;
}

/** `GetBaseClass(Hero->Class)` as the act's class column. */
function heroClass(): BaseClass {
  return getBaseClass(Store.playerData.charClass);
}

/** `m_byCurrQuestIndex` after `setQuestLists`: the first unfinished quest of the chain. */
function firstOpenQuest(count: number, cls: BaseClass): number {
  const stateOf = (i: number) => state.states[i] ?? LegacyQuestState.None;

  if (cls === BaseClass.Knight) {
    for (let i = 0; i < count; i++) if (stateOf(i) !== LegacyQuestState.Finished) return i;
    return count;
  }
  if (cls === BaseClass.MagicGladiator || cls === BaseClass.DarkLord || cls === BaseClass.RageFighter) {
    for (let i = 4; i < count; i++) if (stateOf(i) !== LegacyQuestState.Finished) return i;
    return count;
  }
  for (let i = 0; i < count; i++) {
    if (i === QUEST_COMBO) continue;
    if (stateOf(i) !== LegacyQuestState.Finished) return i;
  }
  return count;
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
    state.currentIndex = first;
    state.windowIndex = first;
    state.received = true;
  });
}

/** `setQuestList(index, result)`: one state changed. */
function setQuestState(index: number, result: number): void {
  if (index < 0 || index >= MAX_QUESTS) return;
  runInAction(() => {
    state.states[index] = result & STATE_MASK;
    state.currentIndex = index;
    state.windowIndex = Math.max(index, state.windowIndex);
  });
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
 * this class. Returns the error page on failure, -1 when everything passes.
 * Zen is only enforced on `lastCheck` (the accept click); before that it is
 * merely remembered for the window's offering line.
 */
function checkRequests(quest: QuestDefinition, lastCheck: boolean): number {
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

  runInAction(() => {
    state.needZen = needZen;
  });
  return errorPage;
}

/** `CheckActCondition`: has the hero brought everything? */
function actsFulfilled(quest: QuestDefinition): boolean {
  for (const act of actsForHero(quest)) {
    if (act.kind === QuestActKind.Item) {
      const type = act.itemType * MAX_ITEM_INDEX + act.itemSubType;
      if (missingItems(type, act.itemNum, act.itemLevel) > 0) return false;
    } else if (act.kind === QuestActKind.Monster) {
      if (legacyKillCount(act.itemType) < act.itemNum) return false;
    }
  }
  return true;
}

/** `FindQuestContext(quest, column)`: the dialog page for this state column. */
function pageFor(quest: QuestDefinition, column: number): number {
  const act = actsForHero(quest)[0];
  return act ? act.startText[column] : 0;
}

/** `CheckQuestState`: pick the page and the dialog state for the current quest. */
function checkQuestState(): number {
  const quest = questDefinition(state.currentIndex);
  if (!quest) return 0;

  let dialogState: number = legacyQuestState(state.currentIndex);
  let page = 0;

  switch (dialogState) {
    case LegacyQuestState.None:
    case LegacyQuestState.No: {
      const error = checkRequests(quest, false);
      if (error >= 0) {
        page = error;
        dialogState = DIALOG_STATE_ERROR;
      } else {
        page = pageFor(quest, 0);
      }
      break;
    }
    case LegacyQuestState.InProgress: {
      if (actsFulfilled(quest)) {
        page = pageFor(quest, 2);
        dialogState = DIALOG_STATE_ITEM;
      } else {
        page = pageFor(quest, 1);
      }
      break;
    }
    case LegacyQuestState.Finished:
      page = pageFor(quest, 3);
      break;
  }

  runInAction(() => {
    state.dialogState = dialogState;
  });
  return page;
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
 * new ones — otherwise it keeps showing the language it was opened in.
 *
 * Keyed on `questDataReady()` rather than on the language itself: it is the
 * flip back to true, once the new tables are decoded, that has something to
 * show.
 */
reaction(
  () => questDataReady(),
  ready => {
    if (ready && state.npcWindowOpen) showDialogText(state.page);
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

/** `Hide(INTERFACE_NPCQUEST)` + `SendCloseNpcRequest`. */
export function closeLegacyQuestWindow(): void {
  if (!state.npcWindowOpen) return;
  runInAction(() => {
    state.npcWindowOpen = false;
  });
  Store.closeNpcShop();
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

/** The legacy quest an NPC of this type hands out, if any. */
export function legacyQuestForNpc(npcType: number): QuestDefinition | undefined {
  return questDefinitions().find(q => q.npcType === npcType && q.name);
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
  setQuestState(p.QuestIndex, p.State);
  openLegacyQuestWindow(p.QuestIndex);
});

EventBus.on('LegacySetQuestStateResponse', packet => {
  const p = new LegacySetQuestStateResponsePacket(packet);
  // `ReceiveQuestResult`: Result 0 = accepted; anything else leaves the dialog where it is.
  if (p.Result !== 0) {
    Store.addNotification(t('quest.stateFailed'), 'error');
    return;
  }
  setQuestState(p.QuestIndex, p.NewState);
  openLegacyQuestWindow(p.QuestIndex);
});

EventBus.on('LegacyQuestReward', packet => {
  const p = new LegacyQuestRewardPacket(packet);
  const hero = Store.world?.playerEntity;
  const isHero = !!hero && (p.PlayerId & 0x7fff) === hero.netId;

  switch (p.Reward as number) {
    case REWARD_LEVEL_UP_POINTS:
      if (isHero) {
        Store.addNotification(
          t('quest.rewardPoints', { count: p.Count }),
          'info'
        );
      }
      break;
    case REWARD_CLASS_CHANGE:
      if (isHero) Store.addNotification(t('quest.evolved'), 'info');
      break;
    case REWARD_COMBO_SKILL:
      if (isHero) Store.addNotification(t('quest.comboLearned'), 'info');
      break;
    case REWARD_PLUS_STATS:
      if (isHero) {
        Store.addNotification(
          t('quest.rewardStats', { count: p.Count }),
          'info'
        );
      }
      break;
  }
  if (hero && isHero) {
    EventBus.emit('objectEffect', { entity: hero, effect: 'levelUp' });
    playUiSound('levelUp');
  }
});

// `ReceiveQuestHistory` is only answered when asked: the original sends
// 0xA0 right after the character information arrives.
EventBus.on('CharacterInformation', () => {
  runInAction(() => {
    state.received = false;
    state.npcWindowOpen = false;
  });
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
