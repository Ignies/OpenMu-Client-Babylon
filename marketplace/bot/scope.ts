import {
  AddCharactersToScopePacket,
  MapObjectOutOfScopePacket,
  ObjectMovedPacket,
  ObjectWalkedPacket,
} from '../../src/common/packets/ServerToClientPackets';
import type { BotConnection, Frame } from './connection';
import { view } from './session';

/**
 * Who the bot can currently see, and where they are.
 *
 * This exists because a trade cannot be opened by name: `TradeRequest` carries
 * a `PlayerId`, which is the in-world object id, and OpenMU resolves it with
 * `GetObservingPlayerWithIdAsync` - so the partner must already be in the
 * bot's scope. The bot gets them there with `/trace`, which warps a game
 * master to a player, rather than making the player come to it.
 *
 * Object ids are reused as players come and go, so nothing here is cached
 * beyond the current scope: a name that has left is forgotten rather than
 * remembered at a stale id.
 */

/**
 * Scope packets set the top bit of an object id as a "just spawned" flag
 * (`NewPlayersInScopePlugIn`: `playerBlock.Id |= 0x8000`). Every other packet,
 * `TradeRequest` included, wants the bare id, and a request carrying the flag
 * resolves to nobody and is answered with silence.
 */
const OBJECT_ID_MASK = process.env.NO_ID_MASK ? 0xffff : 0x7fff;

const CODE = {
  addCharacters: 0x12,
  outOfScope: 0x14,
  moved: 0x15,
  walked: 0xd4,
} as const;

export type ScopePlayer = {
  id: number;
  rawId: number;
  name: string;
  x: number;
  y: number;
};

export class Scope {
  private readonly players = new Map<number, ScopePlayer>();
  private readonly unsubscribe: () => void;

  /**
   * The bot's own character. The server puts it in scope like anyone else, and
   * it must never be offered as a trade partner: a bot that traced to itself
   * would sit there waiting for a partner that is never coming.
   */
  selfName: string | null = null;

  constructor(
    connection: BotConnection,
    private readonly log: (message: string) => void = () => {}
  ) {
    this.unsubscribe = connection.on(frame => this.handle(frame));
  }

  dispose(): void {
    this.unsubscribe();
  }

  private isSelf(player: ScopePlayer): boolean {
    return (
      this.selfName !== null && player.name.toLowerCase() === this.selfName.toLowerCase()
    );
  }

  /** Everyone in view except the bot itself. */
  get all(): ScopePlayer[] {
    return [...this.players.values()].filter(p => !this.isSelf(p));
  }

  byId(id: number): ScopePlayer | null {
    return this.players.get(id) ?? null;
  }

  /** Case-insensitive: a character name is typed by a person somewhere. */
  byName(name: string): ScopePlayer | null {
    const wanted = name.toLowerCase();
    for (const player of this.players.values()) {
      if (player.name.toLowerCase() === wanted && !this.isSelf(player)) return player;
    }
    return null;
  }

  /**
   * Chebyshev distance, which is how MU measures a tile range: the map is a
   * grid and a diagonal step costs the same as a straight one.
   */
  static distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  }

  private handle(frame: Frame): void {
    switch (frame.code) {
      case CODE.addCharacters: {
        // The extended layout shares this code; it carries one character and a
        // different appearance width, so a parse that disagrees with the
        // frame length is dropped rather than guessed at.
        let entries;
        try {
          entries = new AddCharactersToScopePacket(view(frame)).getCharacters();
        } catch {
          this.log('could not read an AddCharactersToScope frame');
          return;
        }
        if (process.env.VERBOSE) this.log(`scope frame len ${frame.bytes.length}: ${JSON.stringify(entries.map(e => [e.Name, e.Id, e.CurrentPositionX, e.CurrentPositionY]))}`);
        for (const entry of entries) {
          const id = entry.Id & OBJECT_ID_MASK;
          this.players.set(id, {
            id,
            rawId: entry.Id,
            name: entry.Name,
            x: entry.CurrentPositionX,
            y: entry.CurrentPositionY,
          });
        }
        break;
      }
      case CODE.outOfScope: {
        const p = new MapObjectOutOfScopePacket(view(frame));
        for (const object of p.getObjects()) this.players.delete(object.Id & OBJECT_ID_MASK);
        break;
      }
      case CODE.moved: {
        const p = new ObjectMovedPacket(view(frame));
        const player = this.players.get(p.ObjectId & OBJECT_ID_MASK);
        if (player) {
          player.x = p.PositionX;
          player.y = p.PositionY;
        }
        break;
      }
      case CODE.walked: {
        const p = new ObjectWalkedPacket(view(frame));
        const player = this.players.get(p.ObjectId & OBJECT_ID_MASK);
        if (player) {
          player.x = p.TargetX;
          player.y = p.TargetY;
        }
        break;
      }
      default:
        break;
    }
  }
}
