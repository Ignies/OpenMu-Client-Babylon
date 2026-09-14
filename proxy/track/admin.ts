import {
  EVENT_KINDS,
  type AdminClientMessage,
  type AdminServerMessage,
  type EventKind,
  type LogQuery,
  type RefusalReason,
} from '../../src/common/adminProtocol';
import { clampLimit, type Journal } from './journal';
import type { Tracker } from './tracker';

/**
 * The game master's stream: one subscriber per admin websocket.
 *
 * A socket gets the snapshot the moment it attaches, then every player
 * change, move, leave and journal line as the tracker reports them. The only
 * thing it can ask for is history, answered from the journal.
 *
 * Takes plain send / close callbacks rather than Bun's socket, so the tests
 * can attach a fake and read what it was sent.
 */

export interface AdminSocket {
  send(text: string): void;
  close(): void;
}

export type AdminAuth = 'ok' | RefusalReason;

const KNOWN_KINDS = new Set<string>(EVENT_KINDS);
const MAX_NAME = 32;

export class AdminHub {
  private readonly clients = new Set<AdminSocket>();
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly tracker: Tracker,
    private readonly journal: Journal,
    private readonly options: { open: boolean }
  ) {}

  /**
   * Who may stream: a socket whose nonce names a game master in the world,
   * or anyone on loopback when the dev seam is open. A missing nonce and a
   * wrong one are told apart only in the reason sent before the close.
   */
  authorise(nonce: string | null, loopback: boolean): AdminAuth {
    if (this.options.open && loopback) return 'ok';
    if (!nonce) return 'no-session';
    return this.tracker.isGameMasterSession(nonce) ? 'ok' : 'not-gm';
  }

  attach(socket: AdminSocket): void {
    this.clients.add(socket);

    if (!this.unsubscribe) {
      this.unsubscribe = this.tracker.subscribe({
        player: player => this.broadcast({ t: 'player', player }),
        move: (id, map, x, y) => this.broadcast({ t: 'move', id, map, x, y }),
        leave: id => this.broadcast({ t: 'leave', id }),
        event: (id, event) => this.broadcast({ t: 'event', id, event }),
      });
    }

    this.sendTo(socket, { t: 'snapshot', now: Date.now(), players: this.tracker.snapshot() });
  }

  detach(socket: AdminSocket): void {
    this.clients.delete(socket);

    // Nobody listening: stop turning every tick into JSON.
    if (this.clients.size === 0 && this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  receive(socket: AdminSocket, text: string): void {
    let message: AdminClientMessage;
    try {
      message = JSON.parse(text) as AdminClientMessage;
    } catch {
      return;
    }
    if (!message || typeof message !== 'object') return;

    switch (message.t) {
      case 'ping':
        this.sendTo(socket, { t: 'pong' });
        return;
      case 'log': {
        const query = this.sanitise(message);
        if (!query) return;
        const { events, more } = this.journal.query(query);
        this.sendTo(socket, {
          t: 'log',
          reqId: Number(message.reqId) || 0,
          character: query.character,
          events,
          more,
        });
        return;
      }
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }

  /** Refuse before the upgrade: say why, then close. */
  static refusal(reason: RefusalReason): string {
    return JSON.stringify({ t: 'refused', reason } satisfies AdminServerMessage);
  }

  private sanitise(message: LogQuery): LogQuery | null {
    const character = String(message.character ?? '').trim().slice(0, MAX_NAME);
    if (!character) return null;

    const kinds = Array.isArray(message.kinds)
      ? (message.kinds.filter(k => KNOWN_KINDS.has(String(k))) as EventKind[])
      : undefined;
    const before = typeof message.before === 'number' && Number.isFinite(message.before)
      ? message.before
      : undefined;

    return {
      character,
      ...(before !== undefined ? { before } : {}),
      ...(kinds?.length ? { kinds } : {}),
      limit: clampLimit(message.limit),
    };
  }

  private sendTo(socket: AdminSocket, message: AdminServerMessage): void {
    try {
      socket.send(JSON.stringify(message));
    } catch {
      this.clients.delete(socket);
    }
  }

  private broadcast(message: AdminServerMessage): void {
    if (this.clients.size === 0) return;
    const text = JSON.stringify(message);
    for (const client of this.clients) {
      try {
        client.send(text);
      } catch {
        this.clients.delete(client);
      }
    }
  }
}
