import type { ENUM_WORLD } from '@/core/types';
import type { Scene } from './render/babylon/exports';

/** What every controller gets at boot. */
export type ControllerContext = { readonly scene: Scene };

/**
 * The contract every controller facade satisfies. See controllers/readme.md.
 * `update` is driven by the controller's own ECS system; `reset` runs on map change.
 */
export interface Controller {
  readonly id: string;
  init?(ctx: ControllerContext): void;
  update?(map: ENUM_WORLD, dt: number): void;
  reset?(): void;
}
