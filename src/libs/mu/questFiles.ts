import { onLanguageChanged } from '../../i18n';
import { convertBux } from '../../common/terrain/mapFileEncryption';
import { downloadDataFile } from './dataFolder';
import {
  checkPackText,
  decodeLocalText,
  downloadLocalDataFile,
  repairPackText,
} from './localData';

/**
 * The four quest tables, decoded the way the original does: every record is
 * XOR-ed with the 3-byte Bux key **restarting at each record** (`BuxConvert`
 * per `fread`), exactly like `gate.bmd`. Sizes below were verified against
 * the shipped files, not only against the C++ structs:
 *
 * | file | record | C++ |
 * |---|---|---|
 * | `Local/<lang>/Quest_<lang>.bmd` | 200 × 744 B | `QuestAttributeFile` (CSQuest.cpp:115) |
 * | `Local/<lang>/Dialog_<lang>.bmd` | 200 × 1024 B | `DIALOG_SCRIPT` (_struct.h:139) |
 * | `Local/QuestProgress.bmd` | n × 41 B | `DWORD` + packed `SQuestProgress` (QuestMng.h:19) |
 * | `Local/<lang>/QuestWords_<lang>.bmd` | `{int index; short len}` + `len` UTF-8 bytes | `LoadQuestWordsScript` |
 * | `Local/NPCDialogue.bmd` | n × 88 B | `DWORD` + `SNPCDialogue` (QuestMng.h:12), `LoadNPCDialogueScript` |
 *
 * `QuestAttributeFile` is `{short cond; short req; WORD npc; char name[32]}`
 * = 38 bytes, then `QUEST_CLASS_ACT[16]` at 38 — 24 bytes each because
 * `byRequestClass[MAX_CLASS = 7]` plus one pad byte aligns the four
 * `shQuestStartText` shorts — then `QUEST_CLASS_REQUEST[16]` at 424 (the
 * act array ends at 422, padded to the DWORD `dwZen` alignment), 20 bytes
 * each with `wRequestStrength` at +8, `dwZen` at +12 and `shErrorText` at
 * +16. 38 + 384 + 2 + 320 = 744, which is what 148800 / 200 gives.
 */

// ---- Quest.bmd -------------------------------------------------------------

/** `MAX_QUESTS` (_define.h:576). */
export const MAX_QUESTS = 200;
/** `MAX_QUEST_CONDITION` / `MAX_QUEST_REQUEST` (_define.h:577-578). */
const MAX_QUEST_CONDITION = 16;
const MAX_QUEST_REQUEST = 16;
/** `MAX_CLASS` (_define.h:394): one byte per base class in every act. */
export const QUEST_CLASS_COUNT = 7;

const QUEST_RECORD_SIZE = 744;
const QUEST_ACT_OFFSET = 38;
const QUEST_ACT_SIZE = 24;
const QUEST_REQUEST_OFFSET = 424;
const QUEST_REQUEST_SIZE = 20;
const QUEST_NAME_LENGTH = 32;

/** `QUEST_CLASS_ACT.byQuestType`: what the act asks the hero to bring. */
export const QuestActKind = {
  /** `QUEST_ITEM`: `itemNum` of item `group/index` (+`itemLevel`) in the bag. */
  Item: 1,
  /** `QUEST_MONSTER`: `itemNum` kills of monster `itemType`. */
  Monster: 2,
} as const;

/** `QUEST_CLASS_ACT` — one thing a class has to do for this quest. */
export type QuestAct = {
  live: number;
  kind: number;
  /** Item group (or monster type for a `Monster` act). */
  itemType: number;
  itemSubType: number;
  itemLevel: number;
  itemNum: number;
  /** Which `QuestRequest.type` rows apply while this act is the active one. */
  requestType: number;
  /** Per base class (`BaseClass` order): 0 = not for this class, ≥1 applies. */
  requestClass: number[];
  /**
   * Dialog script indexes: [0] start (state NO), [1] in progress,
   * [2] all items brought, [3] finished (`FindQuestContext`).
   */
  startText: number[];
};

/** `QUEST_CLASS_REQUEST` — a precondition the server also checks. */
export type QuestRequest = {
  live: number;
  /** Matches `QuestAct.requestType`; 255 = applies to every act. */
  type: number;
  /** Quest that must be finished first; 65535 = none. */
  completeQuestIndex: number;
  levelMin: number;
  levelMax: number;
  requestStrength: number;
  zen: number;
  /** Dialog script index shown when the check fails. */
  errorText: number;
};

/** `QUEST_ATTRIBUTE` — one legacy quest. */
export type QuestDefinition = {
  index: number;
  conditionCount: number;
  requestCount: number;
  /** Monster type of the NPC that gives the quest. */
  npcType: number;
  name: string;
  acts: QuestAct[];
  requests: QuestRequest[];
};

// ---- Dialog.bmd ------------------------------------------------------------

/** `MAX_DIALOG` (_define.h:318). */
export const MAX_DIALOG = 200;
const DIALOG_RECORD_SIZE = 1024;
const DIALOG_TEXT_LENGTH = 300;
const DIALOG_MAX_ANSWERS = 10;
const DIALOG_ANSWER_LENGTH = 64;

/** `DIALOG_SCRIPT` — a page of NPC speech plus its numbered answers. */
export type DialogScript = {
  text: string;
  answers: {
    text: string;
    /** Next dialog page after picking this; ≤ 0 = stay. */
    link: number;
    /** `m_iReturnForAnswer`: -1 none, 1 next progress, 2 close, 3 set state. */
    action: number;
  }[];
};

// ---- QuestProgress.bmd -----------------------------------------------------

const PROGRESS_RECORD_SIZE = 41;
/** `QM_MAX_ANSWER` (QuestMng.h:9). */
const PROGRESS_MAX_ANSWERS = 5;

/** `SQuestProgress` — one S6 quest step, keyed by `(number << 16) | group`. */
export type QuestProgressEntry = {
  key: number;
  /** 0 = NPC-words window (`CNewUIQuestProgress`), 1 = the "etc" variant. */
  uiType: number;
  npcWords: number;
  playerWords: number;
  /** Words indexes of the up-to-five answers; 0 = unused. */
  answers: number[];
  subject: number;
  summary: number;
};

// ---- NPCDialogue.bmd -------------------------------------------------------

/** `sizeof(DWORD) + sizeof(SNPCDialogue)`: key + words + 10 × (answer, result). */
const NPC_DIALOGUE_RECORD_SIZE = 4 + 4 + 10 * 2 * 4;
/** `QM_MAX_ND_ANSWER` (QuestMng.h:8). */
const NPC_DIALOGUE_MAX_ANSWERS = 10;

/**
 * `SNPCDialogue` — one page of a Season 6 NPC's talk, keyed
 * `npcIndex * 0x10000 + dialogState` (`GetNPCDlgNPCWords`). Each answer is a
 * QuestWords index and a *result*: ≤ 900 the next page, 901 quest list,
 * 902 NPC buff, 903 / 904 join Gens Duprian / Vanert, 905 leave, 906 / 907
 * Gens reward (`ProcessSelTextResult`).
 */
export type NpcDialogueEntry = {
  key: number;
  npcWords: number;
  answers: { words: number; result: number }[];
};

function readNpcDialogue(buffer: Uint8Array): Map<number, NpcDialogueEntry> {
  const entries = new Map<number, NpcDialogueEntry>();
  const count = Math.floor(buffer.length / NPC_DIALOGUE_RECORD_SIZE);

  for (let i = 0; i < count; i++) {
    const { view } = decodedRecord(buffer, i * NPC_DIALOGUE_RECORD_SIZE, NPC_DIALOGUE_RECORD_SIZE);
    const key = view.getUint32(0, true);
    const answers: NpcDialogueEntry['answers'] = [];
    for (let a = 0; a < NPC_DIALOGUE_MAX_ANSWERS; a++) {
      const words = view.getInt32(8 + a * 8, true);
      if (words === 0) break; // `GetNPCDlgAnswer`: the first 0 ends the list
      answers.push({ words, result: view.getInt32(12 + a * 8, true) });
    }
    entries.set(key, { key, npcWords: view.getInt32(4, true), answers });
  }

  return entries;
}

// ---- QuestWords.bmd --------------------------------------------------------

const WORDS_HEADER_SIZE = 6;

// ---- loaders ---------------------------------------------------------------

/** In the code page of the pack the tables came from (`localData.ts`). */
function cString(bytes: Uint8Array, offset: number, length: number): string {
  return decodeLocalText(bytes, offset, length);
}

function decodedRecord(buffer: Uint8Array, offset: number, size: number) {
  const record = buffer.slice(offset, offset + size);
  convertBux(record, size);
  return {
    bytes: record,
    view: new DataView(record.buffer, record.byteOffset, record.byteLength),
  };
}

function readQuestDefinitions(buffer: Uint8Array): QuestDefinition[] {
  const count = Math.min(MAX_QUESTS, Math.floor(buffer.length / QUEST_RECORD_SIZE));
  const quests: QuestDefinition[] = [];

  for (let i = 0; i < count; i++) {
    const { bytes, view } = decodedRecord(buffer, i * QUEST_RECORD_SIZE, QUEST_RECORD_SIZE);

    const conditionCount = Math.max(0, Math.min(MAX_QUEST_CONDITION, view.getInt16(0, true)));
    const requestCount = Math.max(0, Math.min(MAX_QUEST_REQUEST, view.getInt16(2, true)));

    const acts: QuestAct[] = [];
    for (let a = 0; a < MAX_QUEST_CONDITION; a++) {
      const o = QUEST_ACT_OFFSET + a * QUEST_ACT_SIZE;
      const requestClass: number[] = [];
      for (let c = 0; c < QUEST_CLASS_COUNT; c++) requestClass.push(bytes[o + 8 + c]);
      acts.push({
        live: bytes[o],
        kind: bytes[o + 1],
        itemType: view.getUint16(o + 2, true),
        itemSubType: bytes[o + 4],
        itemLevel: bytes[o + 5],
        itemNum: bytes[o + 6],
        requestType: bytes[o + 7],
        requestClass,
        startText: [0, 1, 2, 3].map(k => view.getInt16(o + 16 + k * 2, true)),
      });
    }

    const requests: QuestRequest[] = [];
    for (let r = 0; r < MAX_QUEST_REQUEST; r++) {
      const o = QUEST_REQUEST_OFFSET + r * QUEST_REQUEST_SIZE;
      requests.push({
        live: bytes[o],
        type: bytes[o + 1],
        completeQuestIndex: view.getUint16(o + 2, true),
        levelMin: view.getUint16(o + 4, true),
        levelMax: view.getUint16(o + 6, true),
        requestStrength: view.getUint16(o + 8, true),
        zen: view.getUint32(o + 12, true),
        errorText: view.getInt16(o + 16, true),
      });
    }

    quests.push({
      index: i,
      conditionCount,
      requestCount,
      npcType: view.getUint16(4, true),
      name: cString(bytes, 6, QUEST_NAME_LENGTH),
      acts,
      requests,
    });
  }

  return quests;
}

function readDialogScripts(buffer: Uint8Array): DialogScript[] {
  const count = Math.min(MAX_DIALOG, Math.floor(buffer.length / DIALOG_RECORD_SIZE));
  const scripts: DialogScript[] = [];

  for (let i = 0; i < count; i++) {
    const { bytes, view } = decodedRecord(buffer, i * DIALOG_RECORD_SIZE, DIALOG_RECORD_SIZE);
    const answerCount = Math.max(0, Math.min(DIALOG_MAX_ANSWERS, view.getInt32(DIALOG_TEXT_LENGTH, true)));
    const answers: DialogScript['answers'] = [];

    for (let a = 0; a < answerCount; a++) {
      answers.push({
        link: view.getInt32(DIALOG_TEXT_LENGTH + 4 + a * 4, true),
        action: view.getInt32(DIALOG_TEXT_LENGTH + 4 + DIALOG_MAX_ANSWERS * 4 + a * 4, true),
        text: cString(
          bytes,
          DIALOG_TEXT_LENGTH + 4 + DIALOG_MAX_ANSWERS * 8 + a * DIALOG_ANSWER_LENGTH,
          DIALOG_ANSWER_LENGTH
        ),
      });
    }

    scripts.push({ text: cString(bytes, 0, DIALOG_TEXT_LENGTH), answers });
  }

  return scripts;
}

function readQuestProgress(buffer: Uint8Array): Map<number, QuestProgressEntry> {
  const entries = new Map<number, QuestProgressEntry>();
  const count = Math.floor(buffer.length / PROGRESS_RECORD_SIZE);

  for (let i = 0; i < count; i++) {
    const { bytes, view } = decodedRecord(buffer, i * PROGRESS_RECORD_SIZE, PROGRESS_RECORD_SIZE);
    const answers: number[] = [];
    for (let a = 0; a < PROGRESS_MAX_ANSWERS; a++) answers.push(view.getInt32(13 + a * 4, true));

    const key = view.getUint32(0, true);
    entries.set(key, {
      key,
      uiType: bytes[4],
      npcWords: view.getInt32(5, true),
      playerWords: view.getInt32(9, true),
      answers,
      subject: view.getInt32(33, true),
      summary: view.getInt32(37, true),
    });
  }

  return entries;
}

function readQuestWords(buffer: Uint8Array): Map<number, string> {
  const words = new Map<number, string>();
  let offset = 0;

  while (offset + WORDS_HEADER_SIZE <= buffer.length) {
    const { view } = decodedRecord(buffer, offset, WORDS_HEADER_SIZE);
    const index = view.getInt32(0, true);
    const length = view.getInt16(4, true);
    offset += WORDS_HEADER_SIZE;

    if (length < 0 || offset + length > buffer.length) break;

    const body = buffer.slice(offset, offset + length);
    convertBux(body, length);
    words.set(index, repairPackText(cString(body, 0, length)));
    offset += length;
  }

  checkPackText('QuestWords', words.values());

  return words;
}

/** Everything the quest tables hold, loaded once. */
export type QuestTables = {
  quests: QuestDefinition[];
  dialogs: DialogScript[];
  progress: Map<number, QuestProgressEntry>;
  words: Map<number, string>;
  /** `m_mapNPCDialogue`, keyed `npcIndex * 0x10000 + state`. */
  npcDialogues: Map<number, NpcDialogueEntry>;
};

let pending: Promise<QuestTables> | null = null;

/** Loads all four tables, once; a failure lets the next call retry. */
export function loadQuestTables(): Promise<QuestTables> {
  if (!pending) {
    pending = readQuestTables().catch(err => {
      pending = null;
      throw err;
    });
  }
  return pending;
}

// All four files are `_<lang>`-tagged, so the memo above only holds for the
// language it was read in. Dropping it is what makes the reload `questData.ts`
// asks for actually go back to the server: without this the next call hands
// back the promise of the *old* language, the tables come back identical, and
// the windows redraw in the language the player just left.
onLanguageChanged(() => {
  pending = null;
});

async function optional(path: string): Promise<Uint8Array> {
  try {
    return await downloadDataFile(path);
  } catch (err) {
    console.warn(`Quest table ${path} is missing:`, err);
    return new Uint8Array(0);
  }
}

async function readQuestTables(): Promise<QuestTables> {
  // `g_strSelectedML` in the original: the folder of the language the player
  // picked, English where that language has no pack. `Quest.bmd` /
  // `QuestWords.bmd` in the root are the language-less siblings, same layout.
  const [questsRaw, dialogsRaw, progressRaw, wordsRaw, npcDialogueRaw] = await Promise.all([
    downloadLocalDataFile('Quest', 'Local/Quest.bmd'),
    downloadLocalDataFile('Dialog'),
    optional('Local/QuestProgress.bmd'),
    downloadLocalDataFile('QuestWords', 'Local/QuestWords.bmd'),
    optional('Local/NPCDialogue.bmd'),
  ]);

  return {
    quests: readQuestDefinitions(questsRaw),
    dialogs: readDialogScripts(dialogsRaw),
    progress: readQuestProgress(progressRaw),
    words: readQuestWords(wordsRaw),
    npcDialogues: readNpcDialogue(npcDialogueRaw),
  };
}
