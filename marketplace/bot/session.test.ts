import { describe, expect, it } from 'vitest';
import { BotSession } from './session';
import type { BotConnection, Frame, FrameHandler, Match } from './connection';
import { MapChangedPacket } from '../../src/common/packets/ServerToClientPackets';
import { codeOf } from './wire';

/**
 * The warp handshake, which is the whole of what these cover.
 *
 * `/trace` is a map change even onto the map the bot is already standing on,
 * and OpenMU sends nothing at all - no players, no monsters - between the map
 * change and the client saying it has finished loading. A bot that warps
 * without answering is not slow to see the player; it never sees anything
 * again.
 */
class FakeConnection {
  readonly sent: { code: number; sub: number }[] = [];
  private readonly handlers: FrameHandler[] = [];
  private readonly waiters: { match: Match; resolve: (f: Frame) => void }[] = [];

  send(buffer: DataView | Uint8Array): void {
    const bytes =
      buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer.buffer.slice(0));
    this.sent.push(codeOf(bytes));
  }

  on(handler: FrameHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const i = this.handlers.indexOf(handler);
      if (i >= 0) this.handlers.splice(i, 1);
    };
  }

  expect(match: Match): Promise<Frame> {
    return new Promise(resolve => this.waiters.push({ match, resolve }));
  }

  /** True once the bot is waiting on something matching this code. */
  waitingFor(code: number): boolean {
    return this.waiters.some(w => w.match.code === code);
  }

  deliver(packet: { buffer: DataView }): void {
    const bytes = new Uint8Array(packet.buffer.buffer.slice(0));
    const { code, sub } = codeOf(bytes);
    const frame: Frame = { code, sub, bytes };

    for (let i = this.waiters.length - 1; i >= 0; i--) {
      if (this.waiters[i].match.code !== code) continue;
      this.waiters.splice(i, 1)[0].resolve(frame);
    }
    for (const handler of [...this.handlers]) handler(frame);
  }

  asConnection(): BotConnection {
    return this as unknown as BotConnection;
  }
}

const CHAT_CODE = 0x00;
const READY_CODE = 0xf3;
const MAP_CHANGED_CODE = 0x1c;

const mapChanged = () => MapChangedPacket.createPacket();

const setup = () => {
  const connection = new FakeConnection();
  const session = new BotSession(
    connection.asConnection(),
    { account: 'MKT001', password: 'x', character: 'MKT001' },
    () => {}
  );
  return { connection, session };
};

describe('warpTo', () => {
  it('waits for the map change before saying it is ready', async () => {
    const { connection, session } = setup();

    const warp = session.warpTo('Ignies');
    await Promise.resolve();

    // The chat has gone out and nothing else has: answering before the server
    // has changed our map would be answering a question it never asked.
    expect(connection.sent.map(s => s.code)).toEqual([CHAT_CODE]);
    expect(connection.waitingFor(MAP_CHANGED_CODE)).toBe(true);

    connection.deliver(mapChanged());
    await warp;

    expect(connection.sent.map(s => s.code)).toEqual([CHAT_CODE, READY_CODE]);
  });

  it('never says it is ready when the server has not moved us', async () => {
    const { connection, session } = setup();

    void session.warpTo('Nobody');
    await Promise.resolve();
    await Promise.resolve();

    // `/trace` on a name nobody holds is accepted and then quietly does
    // nothing, so no map change ever arrives. Answering regardless would tell
    // the server the bot had finished loading a map it was never sent to.
    expect(connection.sent.map(s => s.code)).toEqual([CHAT_CODE]);
  });
});
