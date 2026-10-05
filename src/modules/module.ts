import { observable, runInAction } from 'mobx';
import { MODULE_API_VERSION, canServe } from './_api/contract';
import type { InProcessApi } from './_api/host';

/** One gameplay module (`src/modules/<id>/module.ts`). See readme.md. */
export type ModuleDef = {
  /** The folder name; servers list modules by it. */
  id: string;
  /** Always on: the game cannot run without it. */
  core?: boolean;
  /** Modules it cannot work without; it is off when one of them is. */
  requires?: readonly string[];
  /** The module API range it needs (`^1.0`, `_api/contract.ts`). Built-in modules declare none. */
  api?: string;
  /**
   * Registers its packet listeners and anything else it hooks into. Runs once. Gets the module API
   * when the app hands `installModules` one (`_api/`); built-in modules ignore it.
   */
  install(api?: InProcessApi): void;
};

export function defineModule(def: ModuleDef): ModuleDef {
  return def;
}

/** What `installModules` installed, for `moduleOn`. */
const defs = new Map<string, ModuleDef>();
const installed = new Set<string>();
/** Modules never installed because this client cannot serve their API range, and why. */
const refused = new Map<string, string>();
/** The optional modules the server being played turned off (its `server.json`). */
const serverOff = observable.set<string>();

/** Why a module cannot be installed at all: an API range this client cannot serve, or a requirement that was refused. */
function refusal(m: ModuleDef): string | undefined {
  if (m.api !== undefined && !canServe(m.api)) return `needs module API ${m.api}; this client serves ${MODULE_API_VERSION}`;
  const r = m.requires?.find(id => refused.has(id));
  return r && `requires ${r}, which was refused`;
}

/**
 * Installs `modules` in list order (that order is the listener order for a packet several modules
 * handle). A module is on when it is core or `enabled(id)` says so, and every module it requires is on.
 * A module whose API range this client cannot serve is refused, with every module that requires it:
 * nothing of it installs, and `refusedModules()` says why. `apiFor(id)` is the module API each install
 * gets (`_api/ports.ts`). Returns the ids that were installed.
 */
export function installModules(
  modules: readonly ModuleDef[],
  enabled: (id: string) => boolean = () => true,
  apiFor?: (id: string) => InProcessApi
): string[] {
  const on = new Set<string>();
  for (const m of modules) {
    const why = refusal(m);
    if (why) {
      refused.set(m.id, why);
      console.warn(`[modules] ${m.id} is not installed: ${why}`);
      continue;
    }
    if (!m.core && !enabled(m.id)) continue;
    if (m.requires?.some(r => !on.has(r))) continue;
    on.add(m.id);
  }
  for (const m of modules) {
    defs.set(m.id, m);
    if (!on.has(m.id)) continue;
    installed.add(m.id);
    m.install(apiFor?.(m.id));
  }
  return [...on];
}

/** The modules `installModules` refused, in the order it met them, and why. */
export function refusedModules(): { id: string; why: string }[] {
  return [...refused].map(([id, why]) => ({ id, why }));
}

/** The server being played turned these optional modules off (`modules.off` in its `server.json`). */
export function setServerModulesOff(ids: readonly string[]): void {
  runInAction(() => serverOff.replace(ids));
}

/**
 * Whether a module is on where the hero plays: installed, and neither it nor a module it requires
 * turned off by the server. A core module always is. Observable, so a window that asks hides as
 * soon as the server's list arrives.
 */
export function moduleOn(id: string): boolean {
  const def = defs.get(id);
  if (!def || !installed.has(id)) return false;
  if (def.core) return true;
  return !serverOff.has(id) && (def.requires ?? []).every(moduleOn);
}
