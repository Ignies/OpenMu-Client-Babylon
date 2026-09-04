/**
 * 0.97d sprite preloads. The period `Data/Interface/` is 97 files and shares
 * almost no name with the Season 6 one - no `newui_*` chrome at all - so
 * this is its own list rather than a subset of season6's.
 *
 * `worldSprites` is deliberately empty. The in-game HUD and the gameplay
 * windows still draw Season 6 art, which this version's tree does not have;
 * the sheets are quietly skipped (`gameVersion.data.inventory`) and
 * preloading 0.97d files nothing draws yet would be the same waste from the
 * other side. It fills up as those windows get their 0.97d chrome.
 */
import { CURSOR_SPRITES } from '../../../src/ui/components/gameCursor/cursors';
import type { VersionPreload } from '../../../src/version/uiContract';

const PREGAME_SPRITES = [
  ...CURSOR_SPRITES,

  'Progress.OZJ',
  'Progress_Back.OZJ',
];

export const v097dPreload: VersionPreload = {
  pregameSprites: PREGAME_SPRITES,
  worldSprites: [],
};
