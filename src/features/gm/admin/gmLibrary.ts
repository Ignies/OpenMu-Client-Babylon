import { makeAutoObservable } from 'mobx';
import type { ItemSpec } from './catalogues';

/**
 * What a game master keeps between sessions in this browser: macros (lines
 * sent one after another, for an event), the favourites pinned to the panel's
 * bar, and item presets for the Spawn tab and the map menu.
 *
 * Kept in localStorage and checked when read back: a list this page cannot
 * use is dropped rather than drawn.
 */

export type MacroStep = {
  /** A `/line`, with `{x}` `{y}` `{map}` `{me}` `{target}` filled in when it runs. */
  line: string;
  /** How long to wait after it before the next step, ms; 0 is as fast as chat allows. */
  delayMs: number;
};

export type Macro = { id: string; name: string; steps: MacroStep[] };

export type Favourite = { kind: 'line'; line: string } | { kind: 'macro'; id: string };

export type ItemPreset = { id: string; name: string; spec: ItemSpec };

/** Where a macro or a pinned line runs, and who it runs for. */
export type MacroVars = { x: number; y: number; map: number; me: string; target: string };

export const MACRO_TOKENS = ['{x}', '{y}', '{map}', '{me}', '{target}'] as const;

/** The longest wait a step may ask for, ms. */
export const MAX_DELAY_MS = 10 * 60 * 1000;

/** A line with its placeholders filled in. */
export function expandLine(line: string, vars: MacroVars): string {
  return line
    .replaceAll('{x}', String(vars.x))
    .replaceAll('{y}', String(vars.y))
    .replaceAll('{map}', String(vars.map))
    .replaceAll('{me}', vars.me)
    .replaceAll('{target}', vars.target)
    .trim();
}

/**
 * Tiles around a spot, nearest first: the spot itself, then ring after ring
 * round it. Where several things spawned at once each stand.
 */
export function spread(count: number): [number, number][] {
  const out: [number, number][] = [[0, 0]];

  for (let ring = 1; out.length < count; ring++) {
    const cells: [number, number][] = [];
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === ring) cells.push([dx, dy]);
      }
    }
    // Round the ring rather than row by row, so a few look placed on purpose.
    cells.sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
    out.push(...cells);
  }

  return out.slice(0, count);
}

export const sameFavourite = (a: Favourite, b: Favourite) =>
  a.kind === b.kind && (a.kind === 'line' ? a.line === (b as { line: string }).line : a.id === (b as { id: string }).id);

const KEY = { macros: 'mu_gm_macros', favourites: 'mu_gm_favourites', presets: 'mu_gm_item_presets' };

const isNumber = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

function isMacro(v: unknown): v is Macro {
  const m = v as Partial<Macro> | null;
  return (
    !!m &&
    typeof m.id === 'string' &&
    typeof m.name === 'string' &&
    Array.isArray(m.steps) &&
    m.steps.every(s => !!s && typeof s.line === 'string' && isNumber(s.delayMs))
  );
}

function isFavourite(v: unknown): v is Favourite {
  const f = v as Partial<{ kind: string; line: unknown; id: unknown }> | null;
  return !!f && ((f.kind === 'line' && typeof f.line === 'string') || (f.kind === 'macro' && typeof f.id === 'string'));
}

function isPreset(v: unknown): v is ItemPreset {
  const p = v as Partial<ItemPreset> | null;
  const s = p?.spec as Partial<ItemSpec> | undefined;
  return (
    !!p &&
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    !!s &&
    isNumber(s.level) &&
    isNumber(s.option) &&
    isNumber(s.excellent) &&
    isNumber(s.ancient) &&
    typeof s.luck === 'boolean' &&
    typeof s.skill === 'boolean'
  );
}

/** A kept list, or an empty one when there is none or it does not hold up. */
export function readList<T>(raw: string | null, check: (v: unknown) => v is T): T[] {
  try {
    const list = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(list) && list.every(check) ? list : [];
  } catch {
    return [];
  }
}

function load<T>(key: string, check: (v: unknown) => v is T): T[] {
  try {
    return readList(localStorage.getItem(key), check);
  } catch {
    return [];
  }
}

function keep(key: string, list: unknown[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Private mode or a full store: it lasts this session only.
  }
}

let counter = 0;
const newId = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

export const GmLibrary = new (class _GmLibrary {
  macros: Macro[] = load(KEY.macros, isMacro);

  favourites: Favourite[] = load(KEY.favourites, isFavourite);

  presets: ItemPreset[] = load(KEY.presets, isPreset);

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  macro(id: string): Macro | undefined {
    return this.macros.find(m => m.id === id);
  }

  addMacro(name: string): Macro {
    const macro: Macro = { id: newId(), name, steps: [{ line: '', delayMs: 0 }] };
    this.macros = [...this.macros, macro];
    keep(KEY.macros, this.macros);
    return macro;
  }

  updateMacro(id: string, change: (macro: Macro) => Macro): void {
    this.macros = this.macros.map(m => (m.id === id ? change(m) : m));
    keep(KEY.macros, this.macros);
  }

  deleteMacro(id: string): void {
    this.macros = this.macros.filter(m => m.id !== id);
    this.favourites = this.favourites.filter(f => !(f.kind === 'macro' && f.id === id));
    keep(KEY.macros, this.macros);
    keep(KEY.favourites, this.favourites);
  }

  isFavourite(favourite: Favourite): boolean {
    return this.favourites.some(f => sameFavourite(f, favourite));
  }

  toggleFavourite(favourite: Favourite): void {
    this.favourites = this.isFavourite(favourite)
      ? this.favourites.filter(f => !sameFavourite(f, favourite))
      : [...this.favourites, favourite];
    keep(KEY.favourites, this.favourites);
  }

  savePreset(name: string, spec: ItemSpec): void {
    this.presets = [...this.presets, { id: newId(), name, spec: { ...spec } }];
    keep(KEY.presets, this.presets);
  }

  deletePreset(id: string): void {
    this.presets = this.presets.filter(p => p.id !== id);
    keep(KEY.presets, this.presets);
  }
})();
