import { makeAutoObservable, runInAction } from 'mobx';
import { LocalStorage } from '../../../libs/localStorage';
import { getUiViewport, onUiViewportChanged } from '../uiStage';

const STORAGE_KEY = 'mu-windows';

export type WindowPlacement = {
  x: number | null;
  y: number | null;
  scale: number;
};

export const DEFAULT_SCALE = 1.5;
export const MIN_SCALE = 1;
export const MAX_SCALE = 3;

const DEFAULT_SCALES: Record<string, number> = {
  'bottom-bar': 1,
};

export const defaultScaleOf = (id: string): number =>
  DEFAULT_SCALES[id] ?? DEFAULT_SCALE;

/** At least this many screen pixels of a window stay reachable on every side. */
export const EDGE_MARGIN = 32;

/** Screen pixels kept free around a window when fitting its scale to the viewport. */
export const FIT_MARGIN = 12;

/**
 * z-index of the bottom window. Every stacked window sits at base + its
 * position in `order`, so the windows always lie in `[WINDOW_Z_BASE,
 * WINDOW_Z_SHEETS)`. Full-screen sheets (minimap, emote menu, master tree)
 * sit at `WINDOW_Z_SHEETS`, modal prompts at `WINDOW_Z_MODAL`, and the
 * overlays that must never be covered (picked item, tooltips, cursor) at
 * 1000 and up in their own `.less`.
 */
export const WINDOW_Z_BASE = 100;
export const WINDOW_Z_SHEETS = 500;
export const WINDOW_Z_MODAL = 600;

/**
 * What Escape does to a window: close it and return nothing (or `true`), or
 * return `false` to say "nothing to close here, try the window below".
 */
export type WindowCloser = () => boolean | void;

type WindowSize = { width: number; height: number };

export const MuWindows = new (class _MuWindows {
  private placements: Record<string, WindowPlacement> = {};
  /** Open windows, bottom to top. */
  order: string[] = [];
  private closers = new Map<string, WindowCloser>();
  private sizes = new Map<string, WindowSize>();
  /** Observable mirror of the stage size, so scales re-fit on resize. */
  private viewport = getUiViewport();

  constructor() {
    makeAutoObservable(this, {
      order: true,
    });
    this.load();
    onUiViewportChanged(() => {
      runInAction(() => {
        this.viewport = { ...getUiViewport() };
      });
      this.clampAll();
    });
  }

  placement(id: string): WindowPlacement {
    return (
      this.placements[id] ?? { x: null, y: null, scale: defaultScaleOf(id) }
    );
  }

  /**
   * The largest scale at which the whole window still fits on screen (with
   * `FIT_MARGIN` left on each side). Unknown sizes fit anything.
   */
  fitScaleOf(id: string): number {
    const size = this.sizes.get(id);
    if (!size) return MAX_SCALE;
    const { width, height } = this.viewport;
    const fit = Math.min(
      (width - FIT_MARGIN * 2) / size.width,
      (height - FIT_MARGIN * 2) / size.height
    );
    return Math.min(MAX_SCALE, Math.max(fit, 0.25));
  }

  /** The scale the window is drawn at: the saved scale, capped so it fits. */
  scaleOf(id: string): number {
    return Math.min(this.placement(id).scale, this.fitScaleOf(id));
  }

  // ---- the stack ----------------------------------------------------------

  /** A window came on screen: it joins the stack on top. */
  register(id: string, size?: WindowSize, onClose?: WindowCloser): void {
    if (size) this.sizes.set(id, size);
    if (onClose) this.closers.set(id, onClose);
    else this.closers.delete(id);
    runInAction(() => {
      if (!this.order.includes(id)) this.order = [...this.order, id];
    });
    this.clamp(id);
  }

  unregister(id: string): void {
    this.closers.delete(id);
    this.sizes.delete(id);
    runInAction(() => {
      if (this.order.includes(id)) this.order = this.order.filter(w => w !== id);
    });
  }

  /** Brings `id` to the top; a click on any window does this. */
  raise(id: string): void {
    const at = this.order.indexOf(id);
    if (at < 0 || at === this.order.length - 1) return;
    runInAction(() => {
      this.order = [...this.order.filter(w => w !== id), id];
    });
  }

  get topId(): string | null {
    return this.order.length ? this.order[this.order.length - 1] : null;
  }

  isTop(id: string): boolean {
    return this.topId === id;
  }

  zIndexOf(id: string): number {
    const at = this.order.indexOf(id);
    return WINDOW_Z_BASE + (at < 0 ? 0 : at + 1);
  }

  /**
   * Escape: closes the topmost window that has something to close. Returns
   * false when the stack is empty or its top has no closer of its own, so
   * the caller can fall back to broadcasting the key.
   */
  closeTop(): boolean {
    for (let i = this.order.length - 1; i >= 0; i--) {
      const closer = this.closers.get(this.order[i]);
      if (!closer) return false;
      if (closer() !== false) return true;
    }
    return false;
  }

  // ---- placement ----------------------------------------------------------

  moveTo(id: string, x: number, y: number): void {
    const current = this.placement(id);

    runInAction(() => {
      this.placements[id] = { ...current, ...this.clamped(id, x, y) };
    });

    this.save();
  }

  setScale(id: string, scale: number): void {
    const current = this.placement(id);
    // A viewport smaller than MIN_SCALE * size wins: fitting beats the floor.
    const max = Math.min(MAX_SCALE, this.fitScaleOf(id));
    const min = Math.min(MIN_SCALE, max);

    runInAction(() => {
      this.placements[id] = {
        ...current,
        scale: Math.max(min, Math.min(max, scale)),
      };
    });

    // Growing a window near the right/bottom edge must not push it out.
    this.clamp(id);
    this.save();
  }

  reset(id: string): void {
    runInAction(() => {
      this.placements[id] = { x: null, y: null, scale: defaultScaleOf(id) };
    });

    this.save();
  }

  /**
   * Keeps the whole window inside the viewport when its size is known (the
   * fit-capped scale guarantees it can fit); otherwise keeps the top-left
   * `EDGE_MARGIN` reachable. Restored placements from a bigger monitor and
   * windows left near an edge before a resize both land back in reach.
   */
  private clamped(id: string, x: number, y: number): { x: number; y: number } {
    const { width, height } = this.viewport;
    const size = this.sizes.get(id);
    if (!size) {
      return {
        x: Math.min(Math.max(x, 0), width - EDGE_MARGIN),
        y: Math.min(Math.max(y, 0), height - EDGE_MARGIN),
      };
    }
    const scale = this.scaleOf(id);
    return {
      x: Math.min(Math.max(x, 0), Math.max(0, width - size.width * scale)),
      y: Math.min(Math.max(y, 0), Math.max(0, height - size.height * scale)),
    };
  }

  private clamp(id: string): void {
    const current = this.placements[id];
    if (!current || current.x === null || current.y === null) return;
    const next = this.clamped(id, current.x, current.y);
    if (next.x === current.x && next.y === current.y) return;
    runInAction(() => {
      this.placements[id] = { ...current, ...next };
    });
  }

  private clampAll(): void {
    for (const id of Object.keys(this.placements)) this.clamp(id);
  }

  private load(): void {
    try {
      const raw = LocalStorage.load(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Record<string, WindowPlacement>;

      runInAction(() => {
        for (const [id, placement] of Object.entries(parsed)) {
          const scale = Math.max(
            MIN_SCALE,
            Math.min(MAX_SCALE, Number(placement?.scale) || defaultScaleOf(id))
          );
          const free =
            typeof placement?.x === 'number' && typeof placement?.y === 'number';
          this.placements[id] = {
            ...(free
              ? this.clamped(id, placement.x!, placement.y!)
              : { x: null, y: null }),
            scale,
          };
        }
      });
    } catch (err) {
      console.error('Could not read the saved window placements:', err);
    }
  }

  private save(): void {
    LocalStorage.save(STORAGE_KEY, JSON.stringify(this.placements));
  }
})();
