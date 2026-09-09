import { describe, expect, it } from 'vitest';
import { ServerMessages } from './serverMessages';
import type { BotConnection, Frame, FrameHandler } from './connection';
import {
  ServerMessagePacket,
  ServerMessageMessageTypeEnum,
} from '../../src/common/packets/ServerToClientPackets';
import { codeOf } from './wire';

/**
 * These exist because the silence they replace cost a night. A `/trace` that
 * the server refused looked exactly like a `/trace` that was never sent, and
 * the one thing that could tell the two apart was the message the bot was
 * throwing away.
 */
class FakeConnection {
  private readonly handlers: FrameHandler[] = [];

  on(handler: FrameHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const i = this.handlers.indexOf(handler);
      if (i >= 0) this.handlers.splice(i, 1);
    };
  }

  deliver(bytes: Uint8Array): void {
    const { code, sub } = codeOf(bytes);
    for (const handler of [...this.handlers]) handler({ code, sub, bytes });
  }
}

function serverMessage(text: string, type = ServerMessageMessageTypeEnum.BlueNormal) {
  // Header, length, code, type, then the text. The generated getRequiredSize
  // counts from the code and leaves no room for the type byte between them.
  const packet = ServerMessagePacket.createPacket(4 + text.length);
  packet.Type = type;
  const bytes = new Uint8Array(packet.buffer.buffer);
  // The message is the tail of the packet, one byte past the type.
  for (let i = 0; i < text.length; i++) bytes[4 + i] = text.charCodeAt(i);
  return bytes;
}

const setup = () => {
  const connection = new FakeConnection();
  const lines: string[] = [];
  const messages = new ServerMessages(
    connection as unknown as BotConnection,
    (m: string) => lines.push(m)
  );
  return { connection, lines, messages };
};

describe('ServerMessages', () => {
  it('writes what the server said into the log', () => {
    const { connection, lines } = setup();

    connection.deliver(serverMessage('Character not found.'));

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Character not found.');
  });

  it('keeps the last one, for a failure that wants to quote it', () => {
    const { connection, messages } = setup();

    connection.deliver(serverMessage('First.'));
    connection.deliver(serverMessage('Character not found.'));

    expect(messages.latest).toBe('Character not found.');
  });

  it('says which kind it was, because golden and blue mean different things', () => {
    const { connection, lines } = setup();

    connection.deliver(
      serverMessage('Server restarting.', ServerMessageMessageTypeEnum.GoldenCenter)
    );

    expect(lines[0]).toContain('golden');
  });

  it('ignores every other packet', () => {
    const { connection, lines } = setup();

    // A scope update, which shares nothing with 0x0D but the header byte.
    connection.deliver(new Uint8Array([0xc1, 0x08, 0x12, 0x01, 0, 0, 0, 0]));

    expect(lines).toHaveLength(0);
  });

  it('stops listening once disposed', () => {
    const { connection, lines, messages } = setup();

    messages.dispose();
    connection.deliver(serverMessage('Character not found.'));

    expect(lines).toHaveLength(0);
  });
});
