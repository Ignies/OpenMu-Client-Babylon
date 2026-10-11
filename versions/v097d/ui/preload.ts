/**
 * 0.97d sprite preloads. The period `Data/Interface/` is 97 files and shares
 * almost no name with the Season 6 one - no `newui_*` chrome at all - so the
 * pre-game list is its own rather than a subset of season6's.
 *
 * `worldSprites` is Season 6's: the in-game HUD and the gameplay windows
 * still draw Season 6 art, read from Season 6's tree wherever the period
 * one has no sheet of that name (`borrows` in `data/index.ts`). It becomes
 * this version's own list as those windows get their 0.97d chrome.
 */
import { CURSOR_SPRITES } from '@/controllers/interface/components/game_cursor';
import type { VersionPreload } from '@/version/uiContract';
import { season6Preload } from '../../season6/ui/preload';

const PREGAME_SPRITES = [
  ...CURSOR_SPRITES,

  'Progress.OZJ',
  'Progress_Back.OZJ',
];

export const v097dPreload: VersionPreload = {
  pregameSprites: PREGAME_SPRITES,
  worldSprites: season6Preload.worldSprites,
};
