import { makeAutoObservable, runInAction } from 'mobx';
import { t } from '../../i18n';
import { CharSelect } from '../character_select';
import { Session } from './state';
import { addNotification } from '../chat';
import { GameOptions } from '@/controllers/settings';

/** Getting back in after the connection drops: redial, send the same login, select the same
 * character. Guard rails: readme.md. */

/** Gap before each attempt, in ms; the last one repeats if needed. */
const BACKOFF = [1000, 2000, 4000, 8000, 15000];

const MAX_ATTEMPTS = BACKOFF.length;

type Step = 'idle' | 'connecting' | 'logging-in' | 'selecting';

export const SessionResume = new (class _SessionResume {
  /** 0 while idle; the attempt being made otherwise. */
  attempt = 0;
  step: Step = 'idle';
  /** Resumes that brought the character back (`finish`), for modules that pick up after one. */
  resumed = 0;

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
    if (Session.isOffline) return false;
    if (!Session.canResumeLogin) return false;
    if (!Session.lastGameServer) return false;
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
    addNotification(
      t(reason === 'cancelled' ? 'resume.cancelled' : 'resume.failed'),
      'error'
    );
    Session.disconnectFromGameServer();
    Session.playOnline();
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
      const server = Session.lastGameServer;
      if (!server) {
        this.giveUp('failed');
        return;
      }
      Session.connectToGameServer(server.host, server.port, server.fallbackHost);
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
    Session.resumeLogin();
    return true;
  }

  /** The login was accepted: pick the character back up. */
  onLoginOk(): boolean {
    if (this.step !== 'logging-in') return false;
    runInAction(() => {
      this.step = 'selecting';
    });
    Session.disconnectFromConnectServer();
    CharSelect.selectCharacterRequest(this.character);
    return true;
  }

  /**
   * The login was refused (wrong password after a server restart, the old
   * session still online). The player has to take over.
   */
  onLoginFailed(): boolean {
    if (this.step !== 'logging-in') return false;
    // The character is forgotten too, or the next socket of this page to go away would
    // resume again and take the account back from wherever it is played now.
    this.forget();
    return false;
  }

  /** The character is back in the world. */
  finish(): void {
    if (!this.active) return;
    this.stop();
    this.resumed++;
    addNotification(t('resume.done'));
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

