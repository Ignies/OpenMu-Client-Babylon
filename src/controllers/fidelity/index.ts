import type { TextKey } from '../../i18n';

/**
 * Fidelity: Classic is the original client 1:1; Enhanced and Ultra turn on deliberate
 * improvements. Each improvement is one file in `versions/shared/improvements/`. See readme.md.
 */

/** The presets, as stored in `GameOptions.fidelity`. */
export const FIDELITY_CLASSIC = 0;
export const FIDELITY_ENHANCED = 1;
export const FIDELITY_ULTRA = 2;
export const FIDELITY_MAX = FIDELITY_ULTRA;

/** A fresh install's preset: every improvement that exists today stays on. */
export const FIDELITY_DEFAULT = FIDELITY_ENHANCED;

export type Improvement = {
  /** Read at the deviation site with `isOn(id)`. */
  readonly id: string;
  /** The lowest preset that turns it on. */
  readonly preset: 'enhanced' | 'ultra';
  readonly labelKey: TextKey;
  readonly hintKey: TextKey;
  /** A `server.json` setting the world must also turn on (big-impact deviations); the site reads it too. */
  readonly server?: string;
};

/** Per-id choices that differ from the preset; ids nothing registers are ignored. */
export type FidelityOverrides = Readonly<Record<string, boolean>>;

const registry = new Map<string, Improvement>();
const on = new Map<string, boolean>();
let preset = FIDELITY_DEFAULT;
let overrides: FidelityOverrides = {};

/** An improvement file's default export. */
export function defineImprovement(def: Improvement): Improvement {
  return def;
}

function refresh(): void {
  on.clear();
  for (const id of registry.keys()) on.set(id, improvementOn(id, preset, overrides));
}

/** Adds improvements; an id twice in one call throws, a later call replaces (hot reload). */
export function registerImprovements(defs: readonly Improvement[]): void {
  const seen = new Set<string>();
  for (const def of defs) {
    if (seen.has(def.id)) throw new Error(`improvement ${def.id} is defined twice`);
    seen.add(def.id);
    registry.set(def.id, def);
  }
  refresh();
}

/** Every registered improvement, by id. */
export function improvements(): Improvement[] {
  return [...registry.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
}

/** Whether `preset` turns the improvement on by itself. */
export function presetTurnsOn(def: Improvement, level: number): boolean {
  return level >= (def.preset === 'ultra' ? FIDELITY_ULTRA : FIDELITY_ENHANCED);
}

/** The choice for `id` under this preset and these overrides; false for an unknown id. */
export function improvementOn(id: string, level: number, choices: FidelityOverrides): boolean {
  const def = registry.get(id);
  if (!def) return false;
  const own = choices[id];
  return typeof own === 'boolean' ? own : presetTurnsOn(def, level);
}

/** True when an override moves a registered improvement off its preset ("Custom"). */
export function isCustom(level: number, choices: FidelityOverrides): boolean {
  for (const def of registry.values()) {
    if (improvementOn(def.id, level, choices) !== presetTurnsOn(def, level)) return true;
  }
  return false;
}

/** The overrides after setting `id`: only differences from the preset, only known ids. */
export function withImprovement(
  id: string,
  value: boolean,
  level: number,
  choices: FidelityOverrides
): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const def of registry.values()) {
    const v = def.id === id ? value : improvementOn(def.id, level, choices);
    if (v !== presetTurnsOn(def, level)) next[def.id] = v;
  }
  return next;
}

/** A stored overrides blob made safe: an object of booleans, anything else dropped. */
export function cleanOverrides(raw: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [id, v] of Object.entries(raw)) if (typeof v === 'boolean') out[id] = v;
  return out;
}

/** The options module pushes the stored choice here at load and on every change. */
export function setFidelityChoice(level: number, choices: FidelityOverrides): void {
  preset = level;
  overrides = choices;
  refresh();
}

/** Whether a deliberate deviation from the original runs. One map read; Classic when unknown. */
export function isOn(id: string): boolean {
  return on.get(id) === true;
}
