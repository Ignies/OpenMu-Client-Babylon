import { computed, makeObservable, observable, runInAction } from 'mobx';

/**
 * Whether the loading screen is up and how far the load is: the terrain sets `sceneLoading` and
 * the progress, boot clears `spritesLoading` once the screen's own art is in.
 */
export const Loading = new (class {
  sceneLoading = false;

  loadingProgress = 0;

  spritesLoading = true;

  get isLoading(): boolean {
    return this.sceneLoading || this.spritesLoading;
  }

  constructor() {
    makeObservable(this, {
      sceneLoading: observable,
      loadingProgress: observable,
      spritesLoading: observable,
      isLoading: computed,
    });
  }

  setSceneLoading(loading: boolean): void {
    if (this.sceneLoading === loading) return;

    runInAction(() => {
      this.sceneLoading = loading;
      if (loading) this.loadingProgress = 0;
    });
  }

  setLoadingProgress(progress: number): void {
    if (Math.abs(this.loadingProgress - progress) < 0.01) return;

    runInAction(() => {
      this.loadingProgress = progress;
    });
  }

  setSpritesLoading(loading: boolean): void {
    runInAction(() => {
      this.spritesLoading = loading;
    });
  }
})();
