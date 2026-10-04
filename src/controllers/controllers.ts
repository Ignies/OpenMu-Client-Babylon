import type { Controller, ControllerContext } from './controller';
import { effects } from './fx';
import { sound } from './sound';
import { lighting } from './lighting';
import { weather } from './weather';
import { combat } from './combat';
import { maps } from './maps';

/** Every controller the game starts at boot, in init order. */
const CONTROLLERS: readonly Controller[] = [weather, lighting, effects, combat, sound, maps];

export function initControllers(ctx: ControllerContext): void {
  for (const c of CONTROLLERS) c.init?.(ctx);
}
