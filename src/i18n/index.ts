/**
 * THE FACADE — the one object the rest of the game talks to for text.
 *
 * `t(key)` is what call sites use; `i18n` is the selector's side of it (the
 * list of languages, the current one, and the setter). The current code is a
 * MobX observable, so every `observer` component that renders a `t()` string
 * re-renders the moment the language changes — no reload, no remount.
 *
 * Holds no strings of its own: the entries in `layers.ts` own those, and
 * `recipes.ts` owns English.
 */

import { makeAutoObservable, runInAction } from 'mobx';
import { LocalStorage } from '../libs/localStorage';
import { EN_TEXT, type TextKey } from './recipes';
import type { LanguageDataPack, LanguageLayer } from './layer';
import type { PackRepairs } from './packRepairs';
import { LANGUAGE_LAYERS } from './layers';

const LANGUAGE_KEY = 'mu_language';

/** The one language that is always complete — the fallback for every other. */
const FALLBACK_CODE = 'en';

type Params = Record<string, string | number>;

type Listener = (code: string) => void;

const listeners = new Set<Listener>();

/**
 * Called after the language changed. For the things `t()` cannot redraw on its
 * own: the `Data/Local/**` tables, which have to be fetched again in the new
 * language. UI text needs nothing — it is observable.
 */
export function onLanguageChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** `{name}` → `params.name`. Unknown placeholders are left alone. */
function fill(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in params ? String(params[key]) : whole
  );
}

/**
 * Picks the entry a browser locale means: exact code first (`pt`), then an
 * alias (`pt-BR`), then the primary subtag (`pt-PT` → `pt`).
 */
function match(
  layers: readonly LanguageLayer[],
  locale: string
): LanguageLayer | undefined {
  const wanted = locale.toLowerCase();
  const primary = wanted.split('-')[0];

  return (
    layers.find(l => l.code.toLowerCase() === wanted) ??
    layers.find(l => l.aliases?.some(a => a.toLowerCase() === wanted)) ??
    layers.find(l => l.code.toLowerCase() === primary) ??
    layers.find(l => l.aliases?.some(a => a.toLowerCase().split('-')[0] === primary))
  );
}

function load(layers: readonly LanguageLayer[]): string {
  const stored = LocalStorage.load(LANGUAGE_KEY);
  if (stored && layers.some(l => l.code === stored)) return stored;

  // First run: follow the browser, in its own order of preference.
  const wanted =
    typeof navigator === 'undefined'
      ? []
      : [...(navigator.languages ?? []), navigator.language].filter(Boolean);

  for (const locale of wanted) {
    const hit = match(layers, locale);
    if (hit) return hit.code;
  }

  return FALLBACK_CODE;
}

class I18n {
  private readonly layers: LanguageLayer[] = [...LANGUAGE_LAYERS];

  /** The active BCP-47 code. Observable — this is what redraws the UI. */
  private code: string;

  constructor() {
    this.code = load(this.layers);

    // `t` and `translated` stay plain methods: MobX runs an action untracked,
    // and a `t()` that did not register a dependency would leave every string
    // on screen frozen at the language the component first rendered in.
    makeAutoObservable<this, 'layers'>(this, {
      layers: false,
      t: false,
      translated: false,
    });

    this.applyDocumentLanguage();
  }

  // ---- readers -----------------------------------------------------------

  /** The active code, e.g. `es`. */
  get language(): string {
    return this.code;
  }

  /** The active entry. Never undefined — falls back to English. */
  get current(): LanguageLayer {
    return (
      this.layers.find(l => l.code === this.code) ??
      this.layers.find(l => l.code === FALLBACK_CODE) ??
      this.layers[0]
    );
  }

  /** Every language, in `layers.ts` order — what the selector lists. */
  get languages(): readonly LanguageLayer[] {
    return this.layers;
  }

  /**
   * The `Data/Local/<folder>/` pack for the active language, or null when the
   * original never shipped one — `libs/mu/localData.ts` then reads `Eng`.
   */
  get dataPack(): LanguageDataPack | null {
    return this.current.dataPack ?? null;
  }

  /**
   * The code page the tables that `dataPack` resolves are written in. Whatever
   * pack answered a given file, this is the encoding to read it with; English
   * is ASCII either way.
   */
  get dataEncoding(): string {
    return this.current.dataPack?.encoding ?? 'utf-8';
  }

  /** Corrections for the active pack, if it is one of the damaged ones. */
  get dataRepairs(): PackRepairs | null {
    return this.current.dataPack?.repairs ?? null;
  }

  /**
   * One line of text. `params` fills `{named}` holes; the `%s` / `%d` lines
   * kept from the original client are spliced by their own call sites.
   */
  t(key: TextKey, params?: Params): string {
    const line = this.current.strings[key] ?? EN_TEXT[key];
    return fill(line, params);
  }

  /** Has this language actually translated the key, or is English showing? */
  translated(key: TextKey): boolean {
    return this.current.strings[key] !== undefined;
  }

  // ---- commands ----------------------------------------------------------

  setLanguage(code: string): void {
    if (code === this.code) return;
    if (!this.layers.some(l => l.code === code)) return;

    runInAction(() => {
      this.code = code;
    });

    LocalStorage.save(LANGUAGE_KEY, code);
    this.applyDocumentLanguage();

    for (const listener of listeners) listener(this.code);
  }

  /** Runtime add (a version pack, a mod); returns the unregister. */
  register(layer: LanguageLayer): () => void {
    this.layers.push(layer);
    return () => {
      const at = this.layers.indexOf(layer);
      if (at >= 0) this.layers.splice(at, 1);
    };
  }

  /**
   * `<html lang>` (so the browser hyphenates and spell-checks correctly) and
   * the font stack the language needs, as a custom property the UI stylesheet
   * puts in front of the MU face.
   */
  private applyDocumentLanguage(): void {
    if (typeof document === 'undefined') return;

    const layer = this.current;
    const root = document.documentElement;

    root.lang = layer.code;

    // Removed rather than blanked: an empty custom property is fragile through
    // minifiers, and `var(--mu-script-font, Tahoma)` already reads right when
    // nothing is set.
    if (layer.font) root.style.setProperty('--mu-script-font', layer.font);
    else root.style.removeProperty('--mu-script-font');
  }
}

export const i18n = new I18n();

// Dev only: a language that has fallen behind the catalogue shows English for
// the keys it is missing, which is easy to miss on screen. Say so once.
if (import.meta.env?.DEV) {
  const keys = Object.keys(EN_TEXT) as TextKey[];

  for (const layer of LANGUAGE_LAYERS) {
    if (layer.code === FALLBACK_CODE) continue;
    const missing = keys.filter(key => layer.strings[key] === undefined);
    if (missing.length) {
      console.warn(
        `[i18n] ${layer.name} is missing ${missing.length} of ${keys.length} keys ` +
          `(showing English): ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' …' : ''}`
      );
    }
  }
}

/**
 * The call site's shorthand. Read inside an `observer` render (or any MobX
 * reaction) it re-runs on a language change; read at module scope it freezes,
 * so tables hold `TextKey`s and resolve them where they draw.
 */
export function t(key: TextKey, params?: Params): string {
  return i18n.t(key, params);
}

/**
 * Turns a `{ field: TextKey }` map into `{ field: string }` where every read is
 * live. For the text tables the game already had (`EVENT_TEXT`, `MASTER_TEXT`,
 * the `layout.ts` labels): the shape and every call site stay as they were, and
 * the strings start following the selector.
 */
export function textTable<T extends Record<string, TextKey>>(
  keys: T
): Readonly<Record<keyof T, string>> {
  const out = {} as Record<keyof T, string>;

  for (const field of Object.keys(keys) as (keyof T)[]) {
    Object.defineProperty(out, field, {
      enumerable: true,
      get: () => t(keys[field]),
    });
  }

  return out;
}

export type { LanguageLayer, FlagRegion } from './layer';
export type { TextKey } from './recipes';
