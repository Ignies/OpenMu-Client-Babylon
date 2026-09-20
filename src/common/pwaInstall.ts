import { makeAutoObservable, runInAction } from 'mobx';

/**
 * Installing the client as an app.
 *
 * The browser decides when a page may be installed and says so once, early,
 * by firing `beforeinstallprompt`. Holding that event is the whole trick:
 * the player presses a button in the options window whenever they like, and
 * this spends the held event then.
 *
 * Installing changes nothing about how the game renders - it is the same
 * engine in a window without a tab strip. What it is worth is the icon on the
 * taskbar and, because an installed app is granted persistent storage without
 * asking, the assets the download screen fetched surviving a browser that is
 * short on disk.
 *
 * The only module that touches the install APIs, and it imports nothing from
 * the app so `main.tsx` can pull it in before the game version resolves.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * `unavailable` is the only one the window explains to the player: it is the
 * browser having no install to offer. `busy` is a second press while its
 * dialog is already up, which needs saying nothing at all.
 */
export type InstallResult = 'installed' | 'dismissed' | 'unavailable' | 'busy';

/**
 * Whether the page is running as the installed app.
 *
 * `fullscreen` is deliberately not in the list: it matches a plain tab that
 * the player put in fullscreen with F11, which the client has its own button
 * for, and the row would then claim the app was installed.
 */
function runningInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  if ((navigator as { standalone?: boolean }).standalone === true) return true;
  return ['standalone', 'minimal-ui'].some(
    mode => window.matchMedia?.(`(display-mode: ${mode})`).matches === true
  );
}

class InstallState {
  /** A live prompt the browser gave us and we have not spent. */
  private held: InstallPromptEvent | null = null;

  installed = runningInstalled();
  busy = false;

  constructor() {
    makeAutoObservable(this);
  }

  /** The browser will open its install dialog if asked right now. */
  get canPrompt(): boolean {
    return !this.installed && !this.busy && this.held !== null;
  }

  hold(event: InstallPromptEvent): void {
    this.held = event;
  }

  /** The held event, cleared: a prompt is good for one press. */
  take(): InstallPromptEvent | null {
    const event = this.held;
    this.held = null;
    return event;
  }

  markInstalled(): void {
    this.installed = true;
    this.held = null;
  }
}

export const PwaInstall = new InstallState();

/**
 * Ask to keep the origin's storage. Granted without a prompt to an installed
 * app, and it is what stops a tight disk evicting the downloaded assets.
 */
async function keepStorage(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* best effort, and nothing depends on the answer */
  }
}

/** Spend the held prompt. `unavailable` means there was nothing to spend. */
export async function installApp(): Promise<InstallResult> {
  if (PwaInstall.installed) return 'installed';
  if (PwaInstall.busy) return 'busy';

  const event = runInAction(() => {
    const held = PwaInstall.take();
    if (held) PwaInstall.busy = true;
    return held;
  });
  if (!event) return 'unavailable';

  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome !== 'accepted') return 'dismissed';

    runInAction(() => PwaInstall.markInstalled());
    await keepStorage();
    return 'installed';
  } catch {
    return 'unavailable';
  } finally {
    runInAction(() => {
      PwaInstall.busy = false;
    });
  }
}

let watching = false;

/**
 * Call once, as early as possible: `beforeinstallprompt` fires before the
 * game has drawn a frame and a listener added later has missed it.
 */
export function watchInstallState(): void {
  if (typeof window === 'undefined' || watching) return;
  watching = true;

  window.addEventListener('beforeinstallprompt', event => {
    // Without this the browser shows its own bar, and the event is gone.
    event.preventDefault();
    runInAction(() => PwaInstall.hold(event as InstallPromptEvent));
  });

  window.addEventListener('appinstalled', () => {
    runInAction(() => PwaInstall.markInstalled());
  });
}
