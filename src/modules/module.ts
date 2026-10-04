import { observable, runInAction } from 'mobx';

/** One gameplay module (`src/modules/<id>/module.ts`). See readme.md. */
export type ModuleDef = {
  /** The folder name; servers list modules by it. */
  id: string;
  /** Always on: the game cannot run without it. */
  core?: boolean;
  /** Modules it cannot work without; it is off when one of them is. */
  requires?: readonly string[];
  /** Registers its packet listeners and anything else it hooks into. Runs once. */
  install(): void;
};

export function defineModule(def: ModuleDef): ModuleDef {
  return def;
}

/** What `installModules` installed, for `moduleOn`. */
const defs = new Map<string, ModuleDef>();
const installed = new Set<string>();
/** The optional modules the server being played turned off (its `server.json`). */
const serverOff = observable.set<string>();

/**
 * Installs `modules` in list order (that order is the listener order for a packet several modules
 * handle). A module is on when it is core or `enabled(id)` says so, and every module it requires is on.
 * Returns the ids that were installed.
 */
export function installModules(modules: readonly ModuleDef[], enabled: (id: string) => boolean = () => true): string[] {
  const on = new Set<string>();
  for (const m of modules) {
    if (!m.core && !enabled(m.id)) continue;
    if (m.requires?.some(r => !on.has(r))) continue;
    on.add(m.id);
  }
  for (const m of modules) {
    defs.set(m.id, m);
    if (!on.has(m.id)) continue;
    installed.add(m.id);
    m.install();
  }
  return [...on];
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
