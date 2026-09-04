import { clearSpriteCache, loadInterfaceSprite } from './sprites';
import { loadVersionUi } from '../../version';

/**
 * Decoding the interface sheets up front, in two waves: the pre-game screens
 * before the start menu paints, the world sheets on entry (without them each
 * window decoded its own on first open - an empty first paint per
 * `MuSpriteFrame`, one state update each).
 *
 * *Which* files is the active version's answer (`versions/<id>/ui/preload.ts`):
 * a period `Data/Interface/` and the Season 6 one share almost no names.
 * When and how stays here.
 */

let pending: Promise<void> | null = null;

export function preloadPregameSprites(
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  if (pending) return pending;

  pending = loadVersionUi().then(async ({ preload }) => {
    const files = preload.pregameSprites;
    const total = files.length;
    let done = 0;

    await Promise.all(
      files.map(file =>
        loadInterfaceSprite(file)
          .catch(err => console.error(`Could not preload ${file}:`, err))
          .finally(() => onProgress?.(++done, total))
      )
    );
  });

  return pending;
}

let worldPending: Promise<void> | null = null;
let worldKeys: ReadonlySet<string> = new Set();

export function preloadWorldSprites(): Promise<void> {
  if (worldPending) return worldPending;

  worldPending = loadVersionUi().then(async ({ preload }) => {
    const files = preload.worldSprites;

    worldKeys = new Set(
      files.map(file => `interface/${file}`.toLowerCase())
    );

    await Promise.all(
      files.map(file =>
        loadInterfaceSprite(file).catch(err =>
          console.error(`Could not preload ${file}:`, err)
        )
      )
    );
  });

  return worldPending;
}

/**
 * Drop the world sprites (blob URLs revoked) when the hero leaves the
 * world; the pregame sheets stay, the login / character screens still show
 * them. `preloadWorldSprites` runs again on the next entry.
 */
export function clearWorldSprites(): void {
  clearSpriteCache(key => worldKeys.has(key));
  worldPending = null;
}
