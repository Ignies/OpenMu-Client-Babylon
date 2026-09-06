import { makeAutoObservable, runInAction } from 'mobx';
import { t } from '../i18n';
import { Store } from '../store';
import { GameOptions } from './gameOptions';

/**
 * Getting back in after the connection drops.
 *
 * A browser client loses its socket for reasons a desktop one never sees: a
 * sleeping tab, a lid closing, a proxy restart, a phone changing network.
 * The old path for all of them was the same as a kick - back to the server
 * list, log in again, pick the character again.
 *
 * This walks that flow on its own instead: dial the game server we were on,
 * send the same login the form would send, then select the character we were
 * playing. Nothing new goes on the wire; the packets are the ones the login
 * screens already send, in the same order. Credentials are the ones already
 * in the store for the session - nothing extra is written to disk.
 *
 * Guard rails: only after a socket we did not close ourselves went away,
 * only while a character was actually in the world, a handful of attempts
 * with a growing gap, and a Cancel that drops back to the server list.
 */

/** Gap before each attempt, in ms; the last one repeats if needed. */
const BACKOFF = [1000, 2000, 4000, 8000, 15000];

const MAX_ATTEMPTS = BACKOFF.length;

type Step = 'idle' | 'connecting' | 'logging-in' | 'selecting';

export const SessionResume = new (class _SessionResume {
  /** 0 while idle; the attempt being made otherwise. */
  attempt = 0;
  step: Step = 'idle';

  private character = '';
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    makeAutoObservable<this, 'character' | 'timer'>(this, {
      character: false,
      timer: false,
    });
  }

  get active(): boolean {
    return this.step !== 'idle';
  }

  /** Whether a lost socket is worth resuming, rather than starting over. */
  private get resumable(): boolean {
    if (!GameOptions.autoReconnect) return false;
    if (Store.isOffline) return false;
    if (!Store.username || !Store.password) return false;
    if (!Store.lastGameServer) return false;
    // Only a character that was in the world: anything earlier is a screen
    // the player is already looking at, and can act on themselves.
    return !!this.character;
  }

  /** The character is in the world: this is what a resume aims back at. */
  remember(character: string): void {
    this.character = character;
  }

  /** Nothing to come back to (logged out, kicked, character screen). */
  forget(): void {
    this.character = '';
    this.stop();
  }

  /**
   * A game-server socket went away on its own. Returns true when a resume
   * took over, so the caller leaves the player where they are.
   */
  begin(): boolean {
    if (!this.resumable) return false;
    if (this.attempt >= MAX_ATTEMPTS) return false;

    this.schedule();
    return true;
  }

  /** The Cancel button, and anything that makes a resume pointless. */
  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    runInAction(() => {
      this.attempt = 0;
      this.step = 'idle';
    });
  }

  /** Cancel plus the ordinary "start over at the server list" path. */
  giveUp(reason: 'cancelled' | 'failed'): void {
    this.stop();
    Store.addNotification(
      t(reason === 'cancelled' ? 'resume.cancelled' : 'resume.failed'),
      'error'
    );
    Store.disconnectFromGameServer();
    Store.playOnline();
  }

  private schedule(): void {
    const wait = BACKOFF[Math.min(this.attempt, BACKOFF.length - 1)];

    runInAction(() => {
      this.attempt++;
      this.step = 'connecting';
    });

    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      const server = Store.lastGameServer;
      if (!server) {
        this.giveUp('failed');
        return;
      }
      Store.connectToGameServer(server.host, server.port, server.fallbackHost);
    }, wait);
  }

  /**
   * `GameServerEntered` arrived while resuming: send the login instead of
   * showing the form. Returns true when it did.
   */
  onGameServerEntered(): boolean {
    if (this.step !== 'connecting') return false;
    runInAction(() => {
      this.step = 'logging-in';
    });
    Store.loginRequest(Store.username, Store.password);
    return true;
  }

  /** The login was accepted: pick the character back up. */
  onLoginOk(): boolean {
    if (this.step !== 'logging-in') return false;
    runInAction(() => {
      this.step = 'selecting';
    });
    Store.disconnectFromConnectServer();
    Store.selectCharacterRequest(this.character);
    return true;
  }

  /**
   * The login was refused (wrong password after a server restart, the old
   * session still online). The player has to take over.
   */
  onLoginFailed(): boolean {
    if (this.step !== 'logging-in') return false;
    this.stop();
    return false;
  }

  /** The character is back in the world. */
  finish(): void {
    if (!this.active) return;
    this.stop();
    Store.addNotification(t('resume.done'));
  }

  /**
   * A resume attempt's own socket died. Try again until the attempts run
   * out; returns true while it is still trying.
   */
  retry(): boolean {
    if (!this.active) return false;
    if (this.attempt >= MAX_ATTEMPTS) {
      this.giveUp('failed');
      return true;
    }
    this.schedule();
    return true;
  }

})();

