/**
 * TODO: this version's UI. Every export of `versions/season6/ui/index.ts`
 * must exist here under the same name.
 *
 * - a window this version does not have is a component that renders nothing
 *   (below), and its `gameVersion.features.*` flag goes false so the
 *   consumer stops asking for it;
 * - a window that *differs* is a sibling file here that composes the shared
 *   primitives from `src/ui/components/`, never a fork of them;
 * - a window that is the same is a re-export of the base one.
 *
 * This module may import app code: it is only ever loaded from inside the
 * running app (`loadVersionUi`), never from the boot path. The version's
 * `index.ts` may not.
 */
import { ENUM_WORLD } from '../../../src/common/types';
import { LoginPage } from '../../../src/ui/pages/loginPage';
import { CharactersPage } from '../../../src/ui/pages/charactersPage';
import type { PregameUi } from '../../../src/version/uiContract';
import { templatePreload } from './preload';

export const pregame: PregameUi = {
  // TODO: `{ kind: 'world', login, characters }` if this version's tree ships
  // a login world; `{ kind: 'scene', create }` if its pre-game backdrop is a
  // set piece instead (versions/v097d/ui/pregame/shipScene.ts).
  backdrop: {
    kind: 'world',
    login: ENUM_WORLD.WD_73NEW_LOGIN_SCENE,
    characters: ENUM_WORLD.WD_74NEW_CHARACTER_SCENE,
  },
  // TODO: this version's wordmark. `mark` is a sprite with alpha, `glow` a
  // JPEG keyed by luminance; at least one of the two.
  logo: {
    mark: 'Data/Logo/MU-logo.OZT',
    glow: 'Data/Logo/MU-logo_g.OZJ',
    width: 256 * 0.8,
    height: 128 * 0.8,
  },
  // TODO: the base screens, until this version has its own.
  LoginPage,
  CharactersPage,
};

export const preload = templatePreload;

export function MasterSkillsWindow(): null {
  return null;
}
