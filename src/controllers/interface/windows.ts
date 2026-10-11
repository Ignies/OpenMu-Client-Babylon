import type { ComponentType } from 'react';
import { observable, runInAction } from 'mobx';

/**
 * Where a window draws: `world` sits on the 3D view under the HUD and stays
 * up when the hide-interface key is pressed; `hud` is everything else.
 */
type WindowSlot = 'world' | 'hud';

/** One window, panel or HUD element. `order` is its stacking order inside the slot. */
export interface WindowDef {
  readonly id: string;
  readonly slot: WindowSlot;
  readonly order: number;
  readonly component: ComponentType;
  /** The optional gameplay module it belongs to (`src/modules/<id>`): it hides while that module is off. */
  readonly module?: string;
}

export const defineWindow = (def: WindowDef): WindowDef => def;

// Observable (not deep: the defs stay plain), so a page that draws a slot redraws when a window comes or goes.
const registry = observable.map<string, WindowDef>(undefined, { deep: false });

/** Adds windows; a later definition with the same id replaces the earlier one (version overrides). */
export function registerWindows(defs: readonly WindowDef[]): void {
  runInAction(() => {
    for (const d of defs) registry.set(d.id, d);
  });
}

/** Removes a window (a module's, when the module goes). */
export function unregisterWindow(id: string): void {
  runInAction(() => registry.delete(id));
}

/** The windows of a slot in stacking order. */
export function windowsIn(slot: WindowSlot): WindowDef[] {
  return [...registry.values()].filter(d => d.slot === slot).sort((a, b) => a.order - b.order);
}
