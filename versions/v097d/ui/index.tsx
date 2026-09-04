/**
 * 0.97d UI. Every export of `versions/season6/ui/index.ts` exists here under
 * the same name so no consumer branches on the version; a window this
 * version does not have renders nothing.
 *
 * The pre-game screens are genuinely 0.97d's own: a ship at sea instead of a
 * login world (its tree has `World1`..`World12` and nothing else), with the
 * period `Data/Logo/` plates on top instead of the Season 4 window set.
 */
import type { PregameUi } from '../../../src/version/uiContract';
import { createShipScene } from './pregame/shipScene';
import { V097dLoginPage } from './pregame/loginPage';
import { V097dCharactersPage } from './pregame/charactersPage';
import { v097dPreload } from './preload';

export const pregame: PregameUi = {
  backdrop: { kind: 'scene', create: createShipScene },
  // `Logo/mulogo_01.OZJ`, 256x166. A JPEG, so it is keyed by luminance the
  // way the Season 6 glow sheet is; the period tree has no TGA wordmark. The
  // login screen itself does not draw it - the scene's own `Logo03` wordmark
  // is the original's - so this crowns the start menu only.
  logo: {
    glow: 'Data/Logo/mulogo_01.OZJ',
    width: 256 * 0.8,
    height: 166 * 0.8,
  },
  LoginPage: V097dLoginPage,
  CharactersPage: V097dCharactersPage,
};

export const preload = v097dPreload;

/** Master levels arrived in Season 3, so 0.97d has no master skill tree. */
export function MasterSkillsWindow(): null {
  return null;
}
