import { makeAutoObservable, runInAction } from 'mobx';
import { t } from '../i18n';
import { Store, UIState } from '../store';
import { Economy } from '../economy';
import { Social } from '../social';
import { Messenger } from '../messenger';
import { quests } from '../quests';
import { LogOutPacket } from './packets/ClientToServerPackets';
import { SessionResume } from './sessionResume';

/**
 * The three ways out of a session: `CSystemMenuMsgBox`'s Exit Game, Select
 * Server and Switch Character (NewUICustomMessageBox.cpp:2386-2470). The
 * original opens that menu with Escape; here they are the Options window's
 * first tab, and Escape on a clear screen opens it - the same key, one
 * window fewer.
 *
 * The wire side is the original's and nothing more: `SendLogOut(0|2|1)`, and
 * the screen only changes once the server has answered (`ReceiveLogOut`) - it
 * is the side that decides when the character is safely out of the world.
 * The timeout is the one thing the original has no need for: a browser socket
 * can go quiet without ever closing, and a player who asked to leave must not
 * be stuck in a world they have already left.
 */

export type ExitKind = 'quit' | 'servers' | 'characters';

/** `LogOutType`: 0 CloseGame, 1 BackToCharacterSelection, 2 BackToServerSelection. */
const LOGOUT_TYPE: Record<ExitKind, number> = {
  quit: 0,
  characters: 1,
  servers: 2,
};

const KIND_OF_TYPE: Record<number, ExitKind> = {
  0: 'quit',
  1: 'characters',
  2: 'servers',
};

const ANSWER_TIMEOUT = 5000;

function inWorld(): boolean {
  return (
    Store.uiState === UIState.World || Store.uiState === UIState.LoadingWorld
  );
}

export const SessionExit = new (class _SessionExit {
  /** The exit waiting for the server's answer, or null. */
  pending: ExitKind | null = null;

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    makeAutoObservable<this, 'timer'>(this, { timer: false });
  }

  /** Whether this way out leads anywhere from the screen we are on. */
  available(kind: ExitKind): boolean {
    // Offline has no account behind it: the only way out is back to the menu.
    if (Store.isOffline) return kind === 'quit';

    switch (kind) {
      case 'characters':
        return inWorld();
      case 'servers':
        return inWorld() || Store.uiState === UIState.Characters;
      case 'quit':
        return Store.uiState !== UIState.Preloader;
    }
  }

  request(kind: ExitKind): void {
    if (this.pending || !this.available(kind)) return;

    // The goblin's tray is client-side until the mix is sent: leaving with
    // items in it loses them, so the original refuses too (GlobalText 592).
    if (Economy.mixOpen) {
      Social.errorMessage(t('exit.chaosOpen'));
      return;
    }

    // Nobody to ask: offline, or a screen the server does not think of us as
    // playing on. The transition is ours to make.
    if (Store.isOffline || !inWorld()) {
      this.leave(kind);
      return;
    }

    runInAction(() => {
      this.pending = kind;
    });

    this.timer = setTimeout(() => {
      this.timer = null;
      runInAction(() => {
        this.pending = null;
      });
      Store.addNotification(t('exit.noAnswer'), 'error');
      this.leave(kind);
    }, ANSWER_TIMEOUT);

    const p = LogOutPacket.createPacket();
    p.Type = LOGOUT_TYPE[kind];
    Store.sendToGS(p.buffer);
  }

  /**
   * `ReceiveLogOut` arrived. The server sends it unprompted too (a kick, a
   * second login on the account), so the type on the wire decides where we
   * land, not what we asked for.
   */
  onResponse(type: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    runInAction(() => {
      this.pending = null;
    });

    this.leave(KIND_OF_TYPE[type] ?? 'servers');
  }

  private leave(kind: ExitKind): void {
    SessionResume.forget();
    Store.closeNpcShop();
    quests.closeAll();
    runInAction(() => {
      Store.optionsEnabled = false;
    });

    if (kind === 'characters') {
      runInAction(() => {
        Store.uiState = UIState.Characters;
      });
      // The window sheets go with the world; decoded again on the next entry.
      void import('../libs/mu/preloadSprites').then(m => m.clearWorldSprites());
      return;
    }

    if (kind === 'servers') {
      Store.disconnectFromGameServer();
      void import('../libs/mu/preloadSprites').then(m => m.clearWorldSprites());
      Store.playOnline();
      return;
    }

    // Exit Game. A browser tab cannot close itself, so the equivalent of the
    // original's `DestroyWindow` is the start menu it would boot back into.
    // Offline rewrote the URL to `/offline`, so that one restarts instead.
    if (Store.isOffline) {
      location.href = '/';
      return;
    }

    Store.disconnectFromGameServer();
    Store.disconnectFromConnectServer();
    void import('../libs/mu/preloadSprites').then(m => m.clearWorldSprites());
    runInAction(() => {
      Store.uiState = UIState.Preloader;
    });
  }
})();

/**
 * Escape on a clear screen. `NewUIManager::UpdateKeyEvent` closes the top
 * interface with it and opens the system menu when there is none; the window
 * stack has already had its turn by the time this is asked (`closeTop`).
 *
 * What it still has to know about are the overlays that answer Escape
 * themselves without joining that stack - the yes/no boxes another player
 * pops up, the amount prompts, the quest windows. Escape belongs to them
 * first.
 */
export function openSystemMenu(): boolean {
  if (Store.uiState !== UIState.World) return false;
  if (Store.optionsEnabled) return false;
  if (
    Store.msgWin ||
    Store.minimapEnabled ||
    quests.anyWindowOpen ||
    Economy.prompt ||
    Social.anyRequest ||
    Messenger.friendRequest
  ) {
    return false;
  }

  runInAction(() => {
    Store.optionsEnabled = true;
  });
  return true;
}
