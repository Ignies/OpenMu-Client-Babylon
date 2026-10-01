import { makeAutoObservable, runInAction } from 'mobx';
import { effective, type ServerProfile } from './serverConfig';

/** Is that world up? Dials the proxy at `wsUrl?host=&port=` and waits for a packet that is not
 * the proxy's own weather frame. Why: readme.md. */

export type Reach = 'unknown' | 'checking' | 'up' | 'down';

/** Long enough for a busy server across an ocean, short enough to page past. */
const TIMEOUT_MS = 6000;

/**
 * Probes in flight at once. Published worlds are other people's machines, and
 * a grid that dials nine of them the frame it opens is a port scanner with a
 * banner. Two at a time, only what is on screen.
 */
const CONCURRENCY = 2;

/** A verdict this old is re-checked; anything newer is reused. */
const FRESH_MS = 60_000;

/** `C1 04 0F xx`: the proxy's own weather frame, not the server answering. */
const WEATHER_CODE = 0x0f;

/** Where the code byte sits in a `C1` packet. */
const CODE_OFFSET = 2;

/**
 * One connection, opened and dropped. Resolves `true` only when something that
 * is not the proxy's weather frame came back.
 */
function dial(profile: ServerProfile): Promise<boolean> {
  const { csHost, csPort, wsUrl } = effective(profile);

  return new Promise(resolve => {
    let socket: WebSocket;

    try {
      socket = new WebSocket(`${wsUrl}?host=${csHost}&port=${csPort}`);
    } catch {
      // A malformed or blocked URL (mixed content on an https page) throws
      // here rather than firing an event.
      resolve(false);
      return;
    }

    socket.binaryType = 'arraybuffer';

    let settled = false;

    const finish = (up: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      try {
        socket.close();
      } catch {
        // Already closing or closed; there is nothing to undo.
      }

      resolve(up);
    };

    // No close and no answer: a firewall dropping the SYN looks exactly like
    // this, and to a player it is the same thing as down. Declared after
    // `finish` because each closes over the other; neither runs until an
    // event fires, by which point both exist.
    const timer = setTimeout(() => finish(false), TIMEOUT_MS);

    socket.onmessage = event => {
      if (!(event.data instanceof ArrayBuffer)) return;

      const bytes = new Uint8Array(event.data);

      if (bytes.length > CODE_OFFSET && bytes[CODE_OFFSET] === WEATHER_CODE) {
        return;
      }

      finish(true);
    };

    socket.onerror = () => finish(false);
    socket.onclose = () => finish(false);
  });
}

class ServerProbeStore {
  /** Verdict per profile id. Session-lived: nothing here is worth storing. */
  reach: Record<string, Reach> = {};

  /** When each verdict was reached, so a stale one can be taken again. */
  private at: Record<string, number> = {};

  /** Ids being dialled right now, so a re-render cannot start a second dial. */
  private running = new Set<string>();

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  of(id: string): Reach {
    return this.reach[id] ?? 'unknown';
  }

  private stale(id: string): boolean {
    const at = this.at[id];

    return at === undefined || Date.now() - at > FRESH_MS;
  }

  private set(id: string, reach: Reach): void {
    runInAction(() => {
      this.reach[id] = reach;
      if (reach === 'up' || reach === 'down') this.at[id] = Date.now();
    });
  }

  /**
   * Checks these worlds, `CONCURRENCY` at a time. Call it with the page that is
   * on screen: a world nobody is looking at does not need dialling, and one
   * checked a moment ago is not asked again unless `force` says so.
   */
  async check(profiles: ServerProfile[], force = false): Promise<void> {
    const queue = profiles.filter(
      p => !this.running.has(p.id) && (force || this.stale(p.id))
    );

    for (const profile of queue) {
      this.running.add(profile.id);
      this.set(profile.id, 'checking');
    }

    const next = async (): Promise<void> => {
      const profile = queue.shift();

      if (!profile) return;

      try {
        this.set(profile.id, (await dial(profile)) ? 'up' : 'down');
      } finally {
        this.running.delete(profile.id);
      }

      return next();
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, queue.length) }, next)
    );
  }

  /** A refresh of the list is a refresh of what it says about itself. */
  forget(): void {
    runInAction(() => {
      this.reach = {};
      this.at = {};
    });
  }
}

export const ServerProbe = new ServerProbeStore();
