import { makeAutoObservable, runInAction } from 'mobx';
import { LocalStorage } from '../libs/localStorage';

/**
 * Starred rows of the move list (`MoveReq_eng.bmd` indices), kept at the top
 * of the window so the two or three maps a character actually travels to
 * stop being a scroll away.
 *
 * Purely local: the warp itself is the same `WarpCommandRequest` the row
 * always sent, so the server neither knows nor cares which rows are starred.
 */

const STORAGE_KEY = 'mu-warp-favourites';

function load(): number[] {
  try {
    const raw = LocalStorage.load(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(v => typeof v === 'number') : [];
  } catch {
    return [];
  }
}

export const WarpFavourites = new (class _WarpFavourites {
  private indices: number[] = load();

  constructor() {
    makeAutoObservable<this, 'indices'>(this, { indices: true });
  }

  has(index: number): boolean {
    return this.indices.includes(index);
  }

  get count(): number {
    return this.indices.length;
  }

  toggle(index: number): void {
    runInAction(() => {
      this.indices = this.has(index)
        ? this.indices.filter(i => i !== index)
        : [...this.indices, index];
    });
    LocalStorage.save(STORAGE_KEY, JSON.stringify(this.indices));
  }
})();
