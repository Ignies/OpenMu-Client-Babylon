import { MuWindows } from '@/controllers/interface/windowManager';
import { makeAutoObservable, runInAction } from 'mobx';
import { t } from '../../i18n';
import { Merchant } from '../npc_shop';
import { Session } from './state';
import { addNotification } from '../chat';
import { MsgBox } from '../../controllers/interface';
import { AppState, UIState } from '../../controllers/interface/uiState';
import { Ecs } from '../../ecs/current';
import { Economy } from '../economy/economy';
import { Social } from '../social/social';
import { Messenger } from '../friends/messenger';
import { quests } from '../quests';
import { LogOutPacket } from '@versions/shared/packets/ClientToServerPackets';
import { SessionResume } from './sessionResume';
import { allowUnload } from '../../controllers/interface/browserHotkeys';
import { playUiSound } from '../../controllers/sound/ui';

/**
 * The three ways out of a session: `CSystemMenuMsgBox`'s Exit Game, Select
 * Server and Switch Character (NewUICustomMessageBox.cpp:2386-2470). Escape in
 * the world opens that menu (`menuOpen`); they also sit in the Options window's
 * footer, which Escape opens on the server list and the character screen.
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

/** Run just before a LogOut goes out; a module above this one fills it (mu_helper's `TriggerStop`). */
const beforeLogOut: ((kind: ExitKind) => void)[] = [];

export function onBeforeLogOut(fn: (kind: ExitKind) => void): void {
  beforeLogOut.push(fn);
}

function inWorld(): boolean {
  return (
    AppState.uiState === UIState.World || AppState.uiState === UIState.LoadingWorld
  );
}

export const SessionExit = new (class _SessionExit {
  /** The exit waiting for the server's answer, or null. */
  pending: ExitKind | null = null;

  /** `CSystemMenuMsgBox` is up: Exit Game, Select Server, Switch Character, Option, Cancel. */
  menuOpen = false;

  closeMenu(): void {
    this.menuOpen = false;
  }

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    makeAutoObservable<this, 'timer'>(this, { timer: false });
  }

  /** Whether this way out leads anywhere from the screen we are on. */
  available(kind: ExitKind): boolean {
    // Offline has no account behind it: the only way out is back to the menu.
    if (Session.isOffline) return kind === 'quit';

    switch (kind) {
      case 'characters':
        return inWorld();
      case 'servers':
        return inWorld() || AppState.uiState === UIState.Characters;
      case 'quit':
        return AppState.uiState !== UIState.Preloader;
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
    if (Session.isOffline || !inWorld()) {
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
      addNotification(t('exit.noAnswer'), 'error');
      this.leave(kind);
    }, ANSWER_TIMEOUT);

    for (const fn of beforeLogOut) fn(kind);
    const p = LogOutPacket.createPacket();
    p.Type = LOGOUT_TYPE[kind];
    Session.sendToGS(p.buffer);
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
    Merchant.closeNpcShop();
    quests.closeAll();
    // The character is out of the world on all three of these; the backdrop
    // behind the pre-game screens is not a map it stands on.
    Ecs.world?.removeHero();
    runInAction(() => {
      this.menuOpen = false;
      MuWindows.setOpen('options', false);
      // The sheet is the world's; left open, it holds Escape on the screens
      // after (keyboardInputSystem.ts:84).
      MuWindows.setOpen('minimap', false);
    });

    if (kind === 'characters') {
      runInAction(() => {
        AppState.uiState = UIState.Characters;
      });
      // The window sheets go with the world; decoded again on the next entry.
      void import('../../controllers/assets/preloadSprites').then(m => m.clearWorldSprites());
      return;
    }

    if (kind === 'servers') {
      Session.disconnectFromGameServer();
      void import('../../controllers/assets/preloadSprites').then(m => m.clearWorldSprites());
      Session.playOnline();
      return;
    }

    // Exit Game. A browser tab cannot close itself, so the equivalent of the
    // original's `DestroyWindow` is the start menu it would boot back into.
    // Offline rewrote the URL to `/offline`, so that one restarts instead.
    if (Session.isOffline) {
      allowUnload();
      location.href = '/';
      return;
    }

    Session.disconnectFromGameServer();
    Session.disconnectFromConnectServer();
    void import('../../controllers/assets/preloadSprites').then(m => m.clearWorldSprites());
    runInAction(() => {
      AppState.uiState = UIState.Preloader;
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
 *
 * In the world that is `CSystemMenuMsgBox` (NewUIHotKey.cpp:124). The server
 * list and the character screen open Options instead of their own `CSysMenuWin`
 * (UIMng.cpp:692-705, not ported); the login window keeps Escape for its Cancel.
 */
export function openSystemMenu(): boolean {
  const screen = AppState.uiState;
  if (
    screen !== UIState.World &&
    screen !== UIState.Servers &&
    screen !== UIState.Characters
  ) {
    return false;
  }
  if (MuWindows.isOpen('options') || SessionExit.menuOpen || MsgBox.msgWin) return false;
  // The world's overlays only gate it in the world, as UIMng.cpp:698 checks
  // none of them: a request still up when the character left is reset only on
  // the next select, and would hold Escape dead on these screens until then.
  if (
    screen === UIState.World &&
    (MuWindows.isOpen('minimap') ||
      quests.anyWindowOpen ||
      Economy.prompt ||
      Social.anyRequest ||
      Messenger.friendRequest)
  ) {
    return false;
  }

  runInAction(() => {
    if (screen === UIState.World) SessionExit.menuOpen = true;
    else MuWindows.setOpen('options', true);
  });
  playUiSound('click'); // NewUIHotKey.cpp:125, UIMng.cpp:703
  return true;
}
