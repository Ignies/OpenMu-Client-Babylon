import type { TrackEvent, TrackedPlayer } from '../../src/common/adminProtocol';
import { TrackedSession, type SessionOptions } from './session';

/**
 * Every tracked socket, and the one place the admin stream and the journal
 * subscribe to.
 *
 * Changes are coalesced: a socket reports a health tick or a walk on every
 * packet, and a panel needs neither more than four times a second. Moves and
 * snapshot changes queue per session and flush together on a short timer;
 * events go out as they happen, since each one is a line somebody reads.
 */

export type TrackerListener = {
  player?(player: TrackedPlayer): void;
  move?(id: string, map: number | null, x: number, y: number): void;
  leave?(id: string): void;
  event?(id: string, event: TrackEvent): void;
};

const FLUSH_MS = 250;

export class Tracker {
  private readonly sessions = new Set<TrackedSession>();
  private readonly listeners = new Set<TrackerListener>();
  private readonly pendingPlayers = new Map<string, TrackedSession>();
  private readonly pendingMoves = new Map<string, TrackedSession>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: SessionOptions = {}) {}

  /** A socket opened; feed it and `close` it when the socket goes. */
open(
  nonce: string | null,
  port: number | null,
  options: SessionOptions = this.options
): TrackedSession {
    const session = new TrackedSession(
      nonce,
      port,
      {
        event: (s, event) => {
          if (!s.identified) return;
          for (const listener of this.listeners) listener.event?.(s.id, event);
        },
        change: s => {
          if (!s.identified) return;
          this.pendingPlayers.set(s.id, s);
          this.schedule();
        },
        move: s => {
          if (!s.identified) return;
          this.pendingMoves.set(s.id, s);
          this.schedule();
        },
      },
      options
    );

    this.sessions.add(session);
    return session;
  }

  close(session: TrackedSession): void {
    const wasIdentified = session.identified;
    session.close();
    this.sessions.delete(session);
    this.pendingPlayers.delete(session.id);
    this.pendingMoves.delete(session.id);
    if (wasIdentified) for (const listener of this.listeners) listener.leave?.(session.id);
  }

  /** Every socket the game server has put a name to. */
  snapshot(): TrackedPlayer[] {
    const players: TrackedPlayer[] = [];
    for (const session of this.sessions) {
      if (session.identified) players.push(session.snapshot());
    }
    return players;
  }

  /**
   * The auth question: does a socket carrying this nonce hold a character the
   * server itself flagged as a game master, in the world right now?
   */
  isGameMasterSession(nonce: string): boolean {
    for (const session of this.sessions) {
      if (session.nonce === nonce && session.gameMaster && session.inWorld) return true;
    }
    return false;
  }

  subscribe(listener: TrackerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  get size(): number {
    return this.sessions.size;
  }

  private schedule(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, FLUSH_MS);
  }

  /** Send what is queued now. Tests call it instead of waiting on the timer. */
  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const changed = [...this.pendingPlayers.values()];
    const moved = [...this.pendingMoves.values()].filter(s => !this.pendingPlayers.has(s.id));
    this.pendingPlayers.clear();
    this.pendingMoves.clear();

    for (const session of changed) {
      if (!this.sessions.has(session)) continue;
      const player = session.snapshot();
      for (const listener of this.listeners) listener.player?.(player);
    }

    for (const session of moved) {
      if (!this.sessions.has(session)) continue;
      for (const listener of this.listeners) {
        listener.move?.(session.id, session.map, session.x, session.y);
      }
    }
  }
}
