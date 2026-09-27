import { makeAutoObservable } from 'mobx';

/**
 * The worlds page's side of the pre-game load. `characters` is how far the
 * character screen's scenery has been pulled into the model cache behind it,
 * 0..1 - the login scene's own progress is the scene loader's
 * (`Store.loadingProgress`); this is the part that comes after it.
 */
class PregameLoad {
  characters = 0;

  /** The worlds card is open: the loading is over and the menu music may start. */
  worldsOpen = false;

  constructor() {
    makeAutoObservable(this);
  }

  setCharacters(value: number): void {
    this.characters = value;
  }

  setWorldsOpen(value: boolean): void {
    this.worldsOpen = value;
  }
}

export const pregameLoad = new PregameLoad();
