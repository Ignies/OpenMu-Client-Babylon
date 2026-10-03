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
  for (const m of modules) if (on.has(m.id)) m.install();
  return [...on];
}
