/**
 * TODO: the interface sheets this version's `Data/Interface/` actually has,
 * in two waves - before the start menu paints, and on world entry. Do not
 * copy season6's list unless this version ships the Season 6 tree: a sheet
 * that is not there is a miss the loaders have to swallow.
 */
import { CURSOR_SPRITES } from '../../../src/ui/components/gameCursor/cursors';
import type { VersionPreload } from '../../../src/version/uiContract';

export const templatePreload: VersionPreload = {
  pregameSprites: [...CURSOR_SPRITES],
  worldSprites: [],
};
