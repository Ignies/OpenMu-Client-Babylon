import type { Socket } from 'bun';
import { BotCrypto, FrameReader, codeOf } from './wire';

/**
 * The bot's socket to a game server.
 *
 * Headless by construction: a TCP socket, the client's own encryption, and the
 * client's own generated packet classes. There is no renderer, no DOM and no
 * engine anywhere in this module's graph, so it runs as a service next to the
 * proxy rather than as a browser pretending to be one.
 *
 * Frames arrive decrypted and are handed to whoever is waiting. Two ways to
 * wait, and the difference matters:
 *
 * - `on` registers a standing handler, for anything the server sends
 *   unprompted (a trade request, an item appearing).
 * - `expect` waits once for a specific frame with a deadline, for the
 *   request-and-answer steps of logging in. It never waits forever: a game
 *   server that goes quiet must fail the step, not hang the bot.
 */

export type Frame = {
  code: number;
  sub: number;
  /** The decrypted packet, header included. */
  bytes: Uint8Array;
};

export type FrameHandler = (frame: Frame) => void;

/** Matches a frame by code, and by sub-code when the packet has one. */
export type Match = { code: number; sub?: number };

const matches = (frame: Frame, m: Match): boolean =>
  frame.code === m.code && (m.sub === undefined || frame.sub === m.sub);

export class BotConnection {
  private socket: Socket<undefined> | null = null;
  private readonly crypto = new BotCrypto();
  private readonly reader = new FrameReader();
  private readonly handlers: FrameHandler[] = [];
  private readonly waiters: {
    match: Match;
    resolve: (frame: Frame) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }[] = [];
  private closedReason: string | null = null;

  constructor(
    readonly host: string,
    readonly port: number,
    private readonly log: (message: string) => void = () => {}
  ) {}

  get connected(): boolean {
    return this.socket !== null && this.closedReason === null;
  }

  async connect(): Promise<void> {
    this.socket = await Bun.connect({
      hostname: this.host,
      port: this.port,
      socket: {
        data: (_s, chunk) => this.receive(new Uint8Array(chunk)),
        close: () => this.dropped('closed by the server'),
        error: (_s, error) => this.dropped(`socket error: ${error.message}`),
        connectError: (_s, error) => this.dropped(`connect failed: ${error.message}`),
      },
    });
    this.closedReason = null;
    this.log(`connected to ${this.host}:${this.port}`);
  }

  /** Sends a packet built by a generated packet class. Encrypts in place. */
  send(buffer: DataView | Uint8Array): void {
    if (!this.socket) throw new Error('not connected');
    const packet =
      buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer.buffer.slice(0));
    this.socket.write(this.crypto.encrypt(packet));
  }

  on(handler: FrameHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const i = this.handlers.indexOf(handler);
      if (i >= 0) this.handlers.splice(i, 1);
    };
  }

  /**
   * The next frame matching `match`, or a rejection once `timeoutMs` passes.
   * Registered before the request is sent, so an answer that arrives in the
   * same tick is not missed.
   */
  expect(match: Match, timeoutMs = 10_000, what = 'frame'): Promise<Frame> {
    return new Promise<Frame>((resolve, reject) => {
      const entry = {
        match,
        resolve,
        reject,
        timer: setTimeout(() => {
          this.drop(entry);
          reject(new Error(`timed out after ${timeoutMs}ms waiting for ${what}`));
        }, timeoutMs),
      };
      this.waiters.push(entry);
    });
  }

  close(): void {
    this.socket?.end();
    this.dropped('closed by us');
  }

  private dropped(reason: string): void {
    if (this.closedReason !== null) return;
    this.closedReason = reason;
    this.socket = null;
    this.log(`disconnected: ${reason}`);
    // Anything still waiting can never be answered now.
    for (const waiter of this.waiters.splice(0)) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error(`connection ${reason}`));
    }
  }

  private drop(entry: (typeof this.waiters)[number]): void {
    const i = this.waiters.indexOf(entry);
    if (i >= 0) this.waiters.splice(i, 1);
  }

  private receive(chunk: Uint8Array): void {
    this.reader.push(chunk);

    for (const wire of this.reader.frames()) {
      const bytes = this.crypto.decrypt(wire);
      if (bytes === null) {
        // A frame that will not decrypt is dropped rather than retried: the
        // stream carries a counter, so re-reading it would desync everything
        // after it too.
        this.log(`undecryptable frame dropped (${this.crypto.lastError ?? 'no reason given'})`);
        continue;
      }

      const { code, sub } = codeOf(bytes);
      const frame: Frame = { code, sub, bytes };

      for (let i = this.waiters.length - 1; i >= 0; i--) {
        const waiter = this.waiters[i];
        if (!matches(frame, waiter.match)) continue;
        this.waiters.splice(i, 1);
        clearTimeout(waiter.timer);
        waiter.resolve(frame);
      }

      // A copy, so a handler that unsubscribes does not skip its neighbour.
      for (const handler of [...this.handlers]) {
        try {
          handler(frame);
        } catch (e) {
          this.log(`handler threw on 0x${code.toString(16)}: ${e}`);
        }
      }
    }
  }
}
