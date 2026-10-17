import { computed, makeObservable, observable, runInAction } from 'mobx';

/**
 * Whether the loading screen is up and how far the load is: the terrain sets `sceneLoading` and
 * the progress, boot clears `spritesLoading` once the screen's own art is in.
 */
export const Loading = new (class {
  sceneLoading = false;

  loadingProgress = 0;

  spritesLoading = true;

  /** Ours (`warpFade`): the load is a warp to another map from inside the world; `fade/` covers it, not `classic/`. */
  inWorldWarp = false;

  /** Ours: a still of the map being left (a JPEG data URL), shown over the load (`fade/`). */
  warpSnapshot: string | null = null;

  get isLoading(): boolean {
    return this.sceneLoading || this.spritesLoading;
  }

  constructor() {
    makeObservable(this, {
      sceneLoading: observable,
      loadingProgress: observable,
      spritesLoading: observable,
      inWorldWarp: observable,
      warpSnapshot: observable,
      isLoading: computed,
    });
  }

  setSceneLoading(loading: boolean): void {
    if (this.sceneLoading === loading) return;

    runInAction(() => {
      this.sceneLoading = loading;
      if (loading) this.loadingProgress = 0;
      else this.inWorldWarp = false;
    });
  }

  setLoadingProgress(progress: number): void {
    if (Math.abs(this.loadingProgress - progress) < 0.01) return;

    runInAction(() => {
      this.loadingProgress = progress;
    });
  }

  setInWorldWarp(inWorld: boolean): void {
    runInAction(() => {
      this.inWorldWarp = inWorld;
    });
  }

  setWarpSnapshot(url: string | null): void {
    runInAction(() => {
      this.warpSnapshot = url;
    });
  }

  setSpritesLoading(loading: boolean): void {
    runInAction(() => {
      this.spritesLoading = loading;
    });
  }
})();
