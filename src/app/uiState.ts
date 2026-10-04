import { makeObservable, observable } from 'mobx';

export enum UIState {
  Preloader,
  Servers,
  Login,
  Characters,
  LoadingWorld,
  World,
}

/**
 * The page the app shows (`App.tsx` picks it from `uiState`) and the hide-interface key. Session
 * and hero packets move the page; imports nothing at run time but mobx.
 */
export const AppState = new (class {
  uiState = UIState.Preloader;

  /** The hide-interface key: the HUD layer is not drawn while this is set. */
  hudHidden = false;

  constructor() {
    makeObservable(this, { uiState: observable, hudHidden: observable });
  }
})();

// A second instance after a hot update would leave the app on a page nobody moves.
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
