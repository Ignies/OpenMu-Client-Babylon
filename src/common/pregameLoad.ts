import { makeAutoObservable } from 'mobx';

/**
 * How far the character screen's scenery has been pulled into the model cache
 * behind the world picker, 0..1. The login scene's own progress is the scene
 * loader's (`Store.loadingProgress`); this is the part that comes after it.
 */
class PregameLoad {
  characters = 0;

  constructor() {
    makeAutoObservable(this);
  }

  setCharacters(value: number): void {
    this.characters = value;
  }
}

export const pregameLoad = new PregameLoad();
