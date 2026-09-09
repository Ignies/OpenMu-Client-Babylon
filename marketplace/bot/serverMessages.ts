import type { BotConnection, Frame } from './connection';
import {
  ServerMessagePacket,
  ServerMessageMessageTypeEnum,
} from '../../src/common/packets/ServerToClientPackets';

/**
 * What the server says out loud, written into the bot's log.
 *
 * A person playing sees these: the blue line in the corner, the golden banner
 * across the middle. A bot has no screen, so until now it dropped them - and
 * they are the only place the server explains itself. `/trace` on a name
 * nobody is using answers "Character not found" and otherwise does nothing at
 * all, which from the bot's side is indistinguishable from the command never
 * arriving, from the bot not being a game master, and from the player being on
 * another game server.
 *
 * So they are logged, all of them, unconditionally. They are rare, they are
 * short, and the one time they matter is the time something has gone wrong and
 * the journal is all anyone has.
 */

const SERVER_MESSAGE_CODE = 0x0d;

const KIND: Record<number, string> = {
  [ServerMessageMessageTypeEnum.GoldenCenter]: 'golden',
  [ServerMessageMessageTypeEnum.BlueNormal]: 'blue',
  [ServerMessageMessageTypeEnum.GuildNotice]: 'guild',
};

export class ServerMessages {
  private readonly unsubscribe: () => void;

  /** The last thing the server said, for a failure that wants to quote it. */
  latest: string | null = null;

  constructor(
    connection: BotConnection,
    private readonly log: (message: string) => void
  ) {
    this.unsubscribe = connection.on(frame => this.handle(frame));
  }

  dispose(): void {
    this.unsubscribe();
  }

  private handle(frame: Frame): void {
    if (frame.code !== SERVER_MESSAGE_CODE) return;

    try {
      const packet = new ServerMessagePacket(
        new DataView(
          frame.bytes.buffer,
          frame.bytes.byteOffset,
          frame.bytes.byteLength
        )
      );
      const text = packet.Message.trim();
      if (!text) return;

      this.latest = text;
      this.log(`server says (${KIND[packet.Type] ?? packet.Type}): ${text}`);
    } catch {
      // A message we cannot parse is not worth failing a handover over.
    }
  }
}
