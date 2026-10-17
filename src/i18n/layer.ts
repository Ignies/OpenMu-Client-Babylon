/**
 * THE CONTRACT - one language.
 *
 * An **entry** of this system is a language: one file, one exported
 * `<name>Layer`, one line in `layers.ts`. It holds what the selector and the
 * `Data/Local` packs need; the text itself lives with its owners
 * (`<owner>/i18n/<code>.ts`, see readme.md).
 */

import type { PackRepairs } from './packRepairs';
import type { ItemNameFixes } from './itemNames';
import type { DialogPageFixes } from './dialogPages';

/**
 * Which flag the selector draws: an ISO 3166-1 alpha-2 region, or an ISO 3166-2 subdivision
 * whose flag stands for the language (Catalan, Basque). `controllers/interface/components/mu_flag`
 * has one hand-drawn SVG per value - flag emoji render as letter pairs on Windows.
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
  | 'DE'
  | 'PL'
  | 'VN'
  | 'SA'
  | 'ES-PV'
  | 'BD'
  | 'ES-CT'
  | 'TW'
  | 'CZ'
  | 'PH'
  | 'GR'
  | 'IN'
  | 'HU'
  | 'ID'
  | 'IR'
  | 'RS'
  | 'TR'
  | 'UA'
  | 'PK';

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

  /** The language's own name for itself - what the selector shows. */
  readonly label: string;

  /** The flag drawn beside `label`. */
  readonly region: FlagRegion;

  /** `rtl` for Arabic, Persian, Urdu: the text turns, the windows stay (see readme). */
  readonly direction?: 'rtl';

  /**
   * Extra font families to put in front of the UI stack while this language is
   * active - the MU face (Tahoma) has no CJK or Thai glyphs. Omit for anything
   * Tahoma already covers (Latin, Cyrillic, Greek).
   */
  readonly font?: string;

  /**
   * The original client's own localisation, in `Data/Local/<folder>/`: quest
   * names and NPC dialogue, the warp list, the master-skill tooltips. Webzen
   * shipped one folder per language (`Eng`, `Spn`, `Por`, …) with the language
   * tag in every file name (`Quest_spn.bmd`).
   *
   * Webzen shipped only three of the languages this client offers, so the rest
   * of the folders are built by `tools/localPacks.ts` from the vocabularies in
   * `tools/packs/`: item names, monster names and the warp list, and nothing
   * else. Quest prose and the master-skill tooltips fall back to English there.
   *
   * Omit when there is no folder at all for this language - that text then
   * stays English, one file at a time, while everything in `strings` is still
   * translated. See `controllers/assets/mu/localData.ts`.
   */
  readonly dataPack?: LanguageDataPack;
}

export interface LanguageDataPack {
  /** Folder under `Data/Local/`, spelled as on disk (`Spn`, `Por`). */
  readonly folder: string;
  /** The tag in the file names, lower case (`spn`, `por`). */
  readonly suffix: string;
  /**
   * The code page the pack was authored in - a WHATWG label
   * (`windows-1252`, `windows-1251`, `shift_jis`, `gbk`, `euc-kr`,
   * `windows-874`). The original wrote these files in the ANSI code page of
   * the language, one byte per character; only the English tree is plain
   * ASCII, which is why the default stays `utf-8` and matches what the client
   * has always read.
   */
  readonly encoding?: string;
  /**
   * Corrections for a pack that was damaged before it shipped. See
   * `packRepairs.ts`; applied by `controllers/assets/mu/localData.ts` after decoding.
   */
  readonly repairs?: PackRepairs;

  /**
   * Item names this pack gets wrong, keyed `"group/index"`. See
   * `itemNames.ts`; read by `controllers/assets/mu/itemNameFile.ts` in front of the table.
   */
  readonly itemNames?: ItemNameFixes;

  /**
   * Quest dialogue pages this pack gets wrong, by page number. See
   * `dialogPages.ts`; applied by `controllers/assets/mu/questFiles.ts` after decoding.
   */
  readonly dialogPages?: DialogPageFixes;
}
