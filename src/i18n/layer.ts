/**
 * THE CONTRACT — one language.
 *
 * An **entry** of this system is a language: one file, one exported
 * `<name>Layer`, one line in `layers.ts`. There is no `update` / `reset`: the
 * system holds one choice, not per-frame state, so the common lifecycle pair
 * is absent the way it is on `maps`.
 */

import type { TextKey } from './recipes';
import type { PackRepairs } from './packRepairs';

/**
 * Which flag the selector draws. The value is an ISO 3166-1 alpha-2 region,
 * and `ui/components/muFlag` has one hand-drawn SVG per region — flag emoji
 * are not an option, Windows browsers render them as letter pairs.
 */
export type FlagRegion =
  | 'GB'
  | 'ES'
  | 'FR'
  | 'IT'
  | 'PT'
  | 'RU'
  | 'CN'
  | 'JP'
  | 'TH'
  | 'KR'
  | 'BG'
  | 'RO'
  | 'DE';

export interface LanguageLayer {
  /** Unique camelCase, identical to the file name. */
  readonly name: string;

  /**
   * BCP-47 code. What localStorage keeps, what `<html lang>` gets, and what
   * `navigator.language` is matched against on a first run.
   */
  readonly code: string;

  /** Extra codes that should pick this entry (`pt-BR` → portuguese). */
  readonly aliases?: readonly string[];

  /** The language's own name for itself — what the selector shows. */
  readonly label: string;

  /** The flag drawn beside `label`. */
  readonly region: FlagRegion;

  /**
   * The translations. Partial on purpose: a key with no line here falls back
   * to the English catalogue, so adding a key to `recipes.ts` never breaks a
   * language file. In dev the facade logs what each language is missing.
   */
  readonly strings: Partial<Record<TextKey, string>>;

  /**
   * Extra font families to put in front of the UI stack while this language is
   * active — the MU face (Tahoma) has no CJK or Thai glyphs. Omit for anything
   * Tahoma already covers (Latin, Cyrillic, Greek).
   */
  readonly font?: string;

  /**
   * The original client's own localisation, in `Data/Local/<folder>/`: quest
   * names and NPC dialogue, the warp list, the master-skill tooltips. Webzen
   * shipped one folder per language (`Eng`, `Spn`, `Por`, …) with the language
   * tag in every file name (`Quest_spn.bmd`).
   *
   * Omit when the tree has no folder for this language — that text then stays
   * English, one file at a time, while everything in `strings` is still
   * translated. See `libs/mu/localData.ts`.
   */
  readonly dataPack?: LanguageDataPack;
}

export interface LanguageDataPack {
  /** Folder under `Data/Local/`, spelled as on disk (`Spn`, `Por`). */
  readonly folder: string;
  /** The tag in the file names, lower case (`spn`, `por`). */
  readonly suffix: string;
  /**
   * The code page the pack was authored in — a WHATWG label
   * (`windows-1252`, `windows-1251`, `shift_jis`, `gbk`, `euc-kr`,
   * `windows-874`). The original wrote these files in the ANSI code page of
   * the language, one byte per character; only the English tree is plain
   * ASCII, which is why the default stays `utf-8` and matches what the client
   * has always read.
   */
  readonly encoding?: string;
  /**
   * Corrections for a pack that was damaged before it shipped. See
   * `packRepairs.ts`; applied by `libs/mu/localData.ts` after decoding.
   */
  readonly repairs?: PackRepairs;
}
