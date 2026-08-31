/**
 * The quest tables — `Quest_<lang>.bmd`, `Dialog_<lang>.bmd`,
 * `QuestProgress.bmd`, `QuestWords_<lang>.bmd` — loaded once (and again after
 * a language change) and held here. Driven by nothing but
 * the first frame; read by `legacyQuests.ts` (definitions + dialog pages),
 * `questLog.ts` (progress steps + words) and the quest windows (names).
 *
 * The binary decoding lives in `libs/mu/questFiles.ts` next to `gates.ts`;
 * this entry only owns the loaded tables and the lookups over them.
 */
import { observable, runInAction } from 'mobx';
import type { ENUM_WORLD } from '../common/types';
import { i18n, onLanguageChanged } from '../i18n';
import { loadNpcNames } from '../libs/mu/npcNameFile';
import {
  loadQuestTables,
  type DialogScript,
  type NpcDialogueEntry,
  type QuestDefinition,
  type QuestProgressEntry,
  type QuestTables,
} from '../libs/mu/questFiles';
import type { QuestLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/**
 * `QuestWords` separates lines with `;` (`DivideStringByPixel` splits on it
 * in the original); every reader hands lines back already split.
 */
const WORDS_LINE_SEPARATOR = ';';

// ---- 2. state + readers ----------------------------------------------------

/**
 * The decoded tables, in an observable ref: every reader below goes through it,
 * so a component that printed a quest name or a line of words re-renders by
 * itself when a language change swaps the tables underneath.
 */
const tables = observable.box<QuestTables | null>(null, { deep: false });
let requested = false;

const state = observable({
  /** True once every table is decoded; the windows wait on it. */
  ready: false,
});

/** Kick the download off; safe to call any number of times. */
export function loadQuestData(): void {
  // The monster / NPC names come out of the same language pack, and the quest
  // windows print them beside the quest text.
  void loadNpcNames();

  if (requested) return;
  requested = true;

  const wanted = i18n.language;

  loadQuestTables().then(
    loaded => {
      // A change while this was in flight already started its own load; the
      // one that arrives late must not overwrite it.
      if (i18n.language !== wanted) return;

      runInAction(() => {
        tables.set(loaded);
        state.ready = true;
      });
    },
    err => {
      requested = false;
      console.error('Could not load the quest tables:', err);
    }
  );
}

// The quest names, the dialogue pages and the quest words all come out of the
// language pack, so a language change has to fetch them again. The windows
// already wait on `ready`, so they redraw by themselves once it flips back.
onLanguageChanged(() => {
  if (!requested) return;

  requested = false;
  runInAction(() => {
    tables.set(null);
    state.ready = false;
  });

  loadQuestData();
});

/** Whether the tables are decoded (MobX-observable). */
export function questDataReady(): boolean {
  return state.ready;
}

/** `m_Quest[index]` — a legacy quest, or undefined before load / out of range. */
export function questDefinition(index: number): QuestDefinition | undefined {
  return tables.get()?.quests[index];
}

/** Every legacy quest the table holds (an empty list before load). */
export function questDefinitions(): readonly QuestDefinition[] {
  return tables.get()?.quests ?? [];
}

/** `g_DialogScript[index]`. */
export function dialogScript(index: number): DialogScript | undefined {
  return tables.get()?.dialogs[index];
}

/** `m_mapQuestProgress[(number << 16) | group]`. */
export function questProgressEntry(key: number): QuestProgressEntry | undefined {
  return tables.get()?.progress.get(key);
}

/** `m_mapNPCDialogue[npcIndex * 0x10000 + state]` (`GetNPCDlgNPCWords` / `GetNPCDlgAnswer`). */
export function npcDialogueEntry(npcIndex: number, dialogState: number): NpcDialogueEntry | undefined {
  return tables.get()?.npcDialogues.get(npcIndex * 0x10000 + dialogState);
}

/** `CQuestMng::GetWords`, raw (with the `;` line breaks left in). */
export function questWords(index: number): string | undefined {
  return tables.get()?.words.get(index);
}

/** `GetWords` split into the lines the window draws. */
export function questWordLines(index: number): string[] {
  const raw = questWords(index);
  if (!raw) return [];
  return raw.split(WORDS_LINE_SEPARATOR).map(line => line.trim());
}

function update(_map: ENUM_WORLD, _dt: number): void {
  loadQuestData();
}

// ---- 3. the layer ----------------------------------------------------------

export const questDataLayer: QuestLayer = { name: 'questData', update };
