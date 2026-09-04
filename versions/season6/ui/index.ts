/**
 * Season 6 UI: every screen and window the base game has, which is the whole
 * set. A version that lacks one exports a component of the same name that
 * renders nothing (see `versions/_template/ui`), so no consumer branches on
 * the version.
 *
 * This module may import app code - it is only ever loaded from inside the
 * running app (`loadVersionUi`), never from the boot path.
 */
import { ENUM_WORLD } from '../../../src/common/types';
import { LoginPage } from '../../../src/ui/pages/loginPage';
import { CharactersPage } from '../../../src/ui/pages/charactersPage';
import type { PregameUi } from '../../../src/version/uiContract';
import { season6Preload } from './preload';

/**
 * `CreateLogInScene` / `CreateCharacterScene` (Scenes/LoginScene.cpp:265,
 * CharacterScene.cpp:86): Season 4 replaced the old ship set piece with two
 * real worlds and a camera-walk script, and Season 6 kept them.
 */
export const pregame: PregameUi = {
  backdrop: {
    kind: 'world',
    login: ENUM_WORLD.WD_73NEW_LOGIN_SCENE,
    characters: ENUM_WORLD.WD_74NEW_CHARACTER_SCENE,
  },
  // 256x128 drawn at 0.8 (LoginScene.cpp:410-421).
  logo: {
    mark: 'Data/Logo/MU-logo.OZT',
    glow: 'Data/Logo/MU-logo_g.OZJ',
    width: 256 * 0.8,
    height: 128 * 0.8,
  },
  LoginPage,
  CharactersPage,
};

export const preload = season6Preload;

export { MasterSkillsWindow } from '../../../src/ui/pages/worldPage/components/masterSkills';
