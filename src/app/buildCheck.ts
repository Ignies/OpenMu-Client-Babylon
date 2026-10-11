import { reaction } from 'mobx';
import { t } from '@/i18n';
import { AppState, UIState } from '@/controllers/interface/uiState';
import { clearCacheAndReload } from '@/controllers/assets/cacheReset';
import { addNotification } from '@/modules/chat';

/**
 * A tab left open across a deploy keeps running the old build. Every build ships `build.json`
 * with its id (`vite.config.ts`); the page asks for it at start, every few minutes and on coming
 * back to the tab. On another build it clears the cache and reloads (`clearCacheAndReload`, the
 * Options button): at once outside the world, else once the player leaves it. Readme: "Builds".
 */

const CHECK_EVERY_MS = 5 * 60_000;
/** The build a reload was made for, so a cache that keeps serving the old page never loops. */
const RELOADED_FOR = 'mu_reloaded_for_build';

export type BuildAction = 'none' | 'reload' | 'later';

export function buildAction(own: string, served: string | null, inGame: boolean, reloadedFor: string | null): BuildAction {
  if (!served || served === own || served === reloadedFor) return 'none';
  return inGame ? 'later' : 'reload';
}

async function servedBuild(): Promise<string | null> {
  try {
    const res = await fetch(`./build.json?t=${Date.now().toString(36)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const body = (await res.json()) as { build?: unknown };
    return typeof body.build === 'string' ? body.build : null;
  } catch {
    // Dev serves the page for any path; an older build has no file.
    return null;
  }
}

function reloadedFor(): string | null {
  try {
    return sessionStorage.getItem(RELOADED_FOR);
  } catch {
    return null;
  }
}

function reloadFor(build: string): void {
  try {
    sessionStorage.setItem(RELOADED_FOR, build);
  } catch {
    // Without storage the loop guard is gone; one reload per check still.
  }
  void clearCacheAndReload();
}

const inWorld = (state: UIState) => state === UIState.World || state === UIState.LoadingWorld;

let waiting = false;

async function check(): Promise<void> {
  const served = await servedBuild();
  const own = typeof BUILD_ID === 'string' ? BUILD_ID : 'dev';
  const action = buildAction(own, served, inWorld(AppState.uiState), reloadedFor());
  if (!served || action === 'none') return;
  if (action === 'reload') {
    reloadFor(served);
    return;
  }
  if (waiting) return;
  waiting = true;
  addNotification(t('notify.updateAvailable'), 'info');
  const stop = reaction(
    () => inWorld(AppState.uiState),
    still => {
      if (still) return;
      stop();
      reloadFor(served);
    }
  );
}

/** Started once by `boot.tsx`. */
export function startBuildCheck(): void {
  void check();
  setInterval(() => void check(), CHECK_EVERY_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void check();
  });
}
