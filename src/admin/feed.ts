import { makeAutoObservable, runInAction } from 'mobx';
import {
  adminStreamUrl,
  type AdminClientMessage,
  type AdminServerMessage,
  type EventKind,
  type RefusalReason,
  type TrackEvent,
  type TrackedPlayer,
} from '../common/adminProtocol';
import { sessionNonce } from '../common/sessionNonce';
import { wsAddress } from '../common/serverConfig';

/**
 * The panel's end of the proxy's admin stream
 * (documentation/admin_console/ARCHITECTURE.md).
 *
 * Connected only while the panel is open: `start` on open, `stop` on close,
 * so a game master who is not looking costs the proxy nothing. Everything
 * here mirrors what the stream says - the players, their moves, the journal
 * lines - and nothing is guessed from the client's own scope.
 *
 * No member here may be named after one on `Object.prototype`
 * (`makeAutoObservable` walks the prototype chain for overrides).
 */

export type FeedStatus = 'idle' | 'connecting' | 'open' | 'refused' | 'closed' | 'error';

const RECONNECT_MS = 4000;
/** Live journal lines kept for the Logs tab's feed. */
const MAX_LIVE = 400;
const PAGE = 100;

export type LogPage = {
  events: TrackEvent[];
  more: boolean;
  loading: boolean;
};

class AdminFeedStore {
  status: FeedStatus = 'idle';
  reason: RefusalReason | null = null;

  players = new Map<string, TrackedPlayer>();

  /** Journal lines as they happen, oldest first, capped. */
  live: TrackEvent[] = [];

  /** History pages by character name, lowercased. */
  logs = new Map<string, LogPage>();

  /** When the last snapshot arrived; 0 before the first. */
  snapshotAt = 0;

  private socket: WebSocket | null = null;
  private wanted = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private nextRequest = 1;
  private pending = new Map<number, { character: string; append: boolean }>();

  constructor() {
    makeAutoObservable<this, 'socket' | 'wanted' | 'reconnectTimer' | 'nextRequest' | 'pending'>(
      this,
      {
        socket: false,
        wanted: false,
        reconnectTimer: false,
        nextRequest: false,
        pending: false,
      },
      { autoBind: true }
    );
  }

  /** Everyone tracked: in the world first, then by name. */
  get list(): TrackedPlayer[] {
    return [...this.players.values()].sort((a, b) => {
      const aIn = a.map !== null ? 0 : 1;
      const bIn = b.map !== null ? 0 : 1;
      if (aIn !== bIn) return aIn - bIn;
      return (a.character ?? a.account ?? '').localeCompare(b.character ?? b.account ?? '');
    });
  }

  /** Players in the world, by OpenMU map number. */
  get byMap(): Map<number, TrackedPlayer[]> {
    const maps = new Map<number, TrackedPlayer[]>();
    for (const player of this.players.values()) {
      if (player.map === null) continue;
      let list = maps.get(player.map);
      if (!list) {
        list = [];
        maps.set(player.map, list);
      }
      list.push(player);
    }
    return maps;
  }

  get inWorldCount(): number {
    let count = 0;
    for (const player of this.players.values()) if (player.map !== null) count++;
    return count;
  }

  get gameMasterCount(): number {
    let count = 0;
    for (const player of this.players.values()) if (player.gm) count++;
    return count;
  }

  /** The player a character name belongs to right now, if online. */
  playerNamed(name: string): TrackedPlayer | null {
    const wanted = name.trim().toLowerCase();
    if (!wanted) return null;
    for (const player of this.players.values()) {
      if (player.character?.toLowerCase() === wanted) return player;
    }
    return null;
  }

  start(): void {
    this.wanted = true;
    if (!this.socket) this.connect();
  }

  stop(): void {
    this.wanted = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      socket.close();
    }
    this.status = 'idle';
    this.reason = null;
    this.pending.clear();
    this.players.clear();
    this.snapshotAt = 0;
  }

  /** Ask for a character's history: the newest page, or the one before `before`. */
  requestLog(
    character: string,
    options: { before?: number; kinds?: EventKind[]; append?: boolean } = {}
  ): void {
    const name = character.trim();
    if (!name || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    const key = name.toLowerCase();
    const page = this.logs.get(key);
    if (options.append && page) {
      page.loading = true;
    } else {
      this.logs.set(key, { events: [], more: false, loading: true });
    }

    const reqId = this.nextRequest++;
    this.pending.set(reqId, { character: key, append: !!options.append });
    this.send({
      t: 'log',
      reqId,
      character: name,
      limit: PAGE,
      ...(options.before !== undefined ? { before: options.before } : {}),
      ...(options.kinds?.length ? { kinds: options.kinds } : {}),
    });
  }

  private send(message: AdminClientMessage): void {
    this.socket?.send(JSON.stringify(message));
  }

  private connect(): void {
    let url: string;
    try {
      url = adminStreamUrl(wsAddress(), sessionNonce());
    } catch {
      this.status = 'error';
      return;
    }

    this.status = 'connecting';
    this.reason = null;

    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      this.status = 'error';
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.onopen = () => {
      runInAction(() => {
        this.status = 'open';
      });
    };

    socket.onmessage = event => {
      if (typeof event.data !== 'string') return;
      let message: AdminServerMessage;
      try {
        message = JSON.parse(event.data) as AdminServerMessage;
      } catch {
        return;
      }
      runInAction(() => this.handle(message));
    };

    socket.onerror = () => {
      runInAction(() => {
        if (this.status !== 'refused') this.status = 'error';
      });
    };

    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      runInAction(() => {
        if (this.status !== 'refused' && this.status !== 'error') this.status = 'closed';
      });
      // A refusal is an answer, not a hiccup: do not knock again until reopened.
      if (this.status !== 'refused') this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (!this.wanted || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.wanted && !this.socket) this.connect();
    }, RECONNECT_MS);
  }

  private handle(message: AdminServerMessage): void {
    switch (message.t) {
      case 'snapshot':
        this.players.clear();
        for (const player of message.players) this.players.set(player.id, player);
        this.snapshotAt = message.now;
        return;
      case 'player':
        this.players.set(message.player.id, message.player);
        return;
      case 'move': {
        const player = this.players.get(message.id);
        if (!player) return;
        player.map = message.map;
        player.x = message.x;
        player.y = message.y;
        return;
      }
      case 'leave':
        this.players.delete(message.id);
        return;
      case 'event': {
        this.live.push(message.event);
        if (this.live.length > MAX_LIVE) this.live.splice(0, this.live.length - MAX_LIVE);
        if (message.id) {
          const player = this.players.get(message.id);
          if (player) {
            player.lastAction = message.event.text;
            player.lastSeen = message.event.at;
          }
        }
        return;
      }
      case 'log': {
        const request = this.pending.get(message.reqId);
        this.pending.delete(message.reqId);
        const key = (request?.character ?? message.character).toLowerCase();
        const page = this.logs.get(key);
        if (request?.append && page) {
          page.events = [...page.events, ...message.events];
          page.more = message.more;
          page.loading = false;
        } else {
          this.logs.set(key, { events: message.events, more: message.more, loading: false });
        }
        return;
      }
      case 'refused':
        this.status = 'refused';
        this.reason = message.reason;
        return;
      case 'pong':
        return;
    }
  }
}

export const AdminFeed = new AdminFeedStore();
