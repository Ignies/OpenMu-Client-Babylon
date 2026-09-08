import {
  ClientReadyAfterMapChangePacket,
  LogOutPacket,
  CreateCharacterPacket,
  LoginShortPasswordPacket,
  PublicChatMessagePacket,
  RequestCharacterListPacket,
  SelectCharacterPacket,
} from '../../src/common/packets/ClientToServerPackets';
import { CharacterClassNumber } from '../../src/common/types';
import {
  CharacterCreationSuccessfulPacket,
  CharacterInformationPacket,
  CharacterListPacket,
  LoginResponseLoginResultEnum,
  LoginResponsePacket,
} from '../../src/common/packets/ServerToClientPackets';
import { Xor3Byte } from '../../src/common/encryption/xor3';
import { stringToBytes } from '../../src/common/wireUtils';
import { gameVersion } from '../../versions/season6';
import { BotConnection, type Frame } from './connection';

/**
 * Getting a bot from a socket to a character standing in the world.
 *
 * Every step is request-then-await with a deadline, in the order the browser
 * client does them (`Store.loginRequest`, `refreshCharactersListRequest`,
 * `selectCharacterRequest`). A step that does not get its answer throws rather
 * than leaving a half-logged-in bot for the escrow queue to trip over.
 */

/** The client's own field widths for the login frame. */
const MAX_USERNAME_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 10;

const CODE = {
  loginResponse: { code: 0xf1, sub: 0x01 },
  characterList: { code: 0xf3, sub: 0x00 },
  characterInformation: { code: 0xf3, sub: 0x03 },
  characterCreated: { code: 0xf3, sub: 0x01 },
} as const;

/** A generated packet class reads from byteOffset 0, so the frame is copied. */
export function view(frame: Frame): DataView {
  return new DataView(
    frame.bytes.buffer.slice(
      frame.bytes.byteOffset,
      frame.bytes.byteOffset + frame.bytes.length
    )
  );
}

export type CharacterEntry = ReturnType<CharacterListPacket['getCharacters']>[number];

export type BotIdentity = {
  account: string;
  password: string;
  /** Which character to play. Defaults to the lowest slot. */
  character?: string;
  /** Create the character when the account has none. Bot accounts do. */
  createIfMissing?: boolean;
  characterClass?: CharacterClassNumber;
};

export class BotSession {
  character: CharacterEntry | null = null;

  constructor(
    private readonly connection: BotConnection,
    private readonly identity: BotIdentity,
    private readonly log: (message: string) => void = () => {}
  ) {}

  /** Socket to standing in the world. Throws on any refusal or silence. */
  async enterWorld(): Promise<CharacterEntry> {
    await this.login();
    const characters = await this.listCharacters();
    const chosen = this.choose(characters);
    await this.select(chosen);
    this.character = chosen;
    return chosen;
  }

  private async login(): Promise<void> {
    const username = stringToBytes(this.identity.account, MAX_USERNAME_LENGTH);
    const password = stringToBytes(this.identity.password, MAX_PASSWORD_LENGTH);
    Xor3Byte(username);
    Xor3Byte(password);

    const packet = LoginShortPasswordPacket.createPacket();
    packet.setUsername(username, username.length);
    packet.setPassword(password, password.length);
    packet.setClientVersion(gameVersion.clientVersionBytes);
    packet.setClientSerial(gameVersion.serialBytes);

    const answer = this.connection.expect(CODE.loginResponse, 15_000, 'LoginResponse');
    this.connection.send(packet.buffer);

    const result = new LoginResponsePacket(view(await answer)).Success;
    if (result !== LoginResponseLoginResultEnum.Okay) {
      throw new Error(
        `login refused for ${this.identity.account}: ${LoginResponseLoginResultEnum[result] ?? result}`
      );
    }
    this.log(`logged in as ${this.identity.account}`);
  }

  private async listCharacters(): Promise<CharacterEntry[]> {
    const packet = RequestCharacterListPacket.createPacket();
    packet.Language = 0;

    const answer = this.connection.expect(CODE.characterList, 15_000, 'CharacterList');
    this.connection.send(packet.buffer);

    const characters = new CharacterListPacket(view(await answer)).getCharacters();
    if (characters.length > 0) return characters;

    // A fresh bot account has none. Rather than making a person go and click
    // through character creation for every mule, the bot makes its own through
    // the protocol, so the server applies its own rules to it.
    if (!this.identity.createIfMissing) {
      throw new Error(`${this.identity.account} has no characters`);
    }
    return this.createCharacter();
  }

  private async createCharacter(): Promise<CharacterEntry[]> {
    const name = this.identity.character ?? this.identity.account;
    this.log(`no characters on ${this.identity.account}, creating "${name}"`);

    const packet = CreateCharacterPacket.createPacket();
    packet.setName(name);
    packet.Class = this.identity.characterClass ?? CharacterClassNumber.DarkKnight;

    const created = this.connection.expect(
      CODE.characterCreated,
      15_000,
      'CharacterCreationSuccessful'
    );
    this.connection.send(packet.buffer);

    const answer = new CharacterCreationSuccessfulPacket(view(await created));
    if (!answer.Success) throw new Error(`the server refused to create "${name}"`);

    // The answer carries the character, so it is read from there rather than
    // by asking for the list again: the server does not answer a second
    // `RequestCharacterList` in this state, and waiting for one hangs until
    // it drops the connection.
    this.log(`created "${answer.CharacterName}" in slot ${answer.CharacterSlot}`);
    return [
      {
        SlotIndex: answer.CharacterSlot,
        Name: answer.CharacterName,
        Level: answer.Level,
        Status: answer.CharacterStatus,
        IsItemBlockActive: false,
        Appearance: answer.PreviewData,
        GuildPosition: 0,
      } as CharacterEntry,
    ];
  }

  /**
   * Sends a chat line. The bot's own commands go this way too: `/trace <name>`
   * warps a game master to a player, which is how it reaches someone rather
   * than making them walk to it.
   */
  say(message: string): void {
    const name = this.character?.Name ?? this.identity.account;
    const packet = PublicChatMessagePacket.createPacket(
      PublicChatMessagePacket.getRequiredSize(10 + message.length)
    );
    packet.setCharacter(name);
    packet.setMessage(message);
    this.connection.send(packet.buffer);
  }

  /** `/trace <character>`: game-master warp to wherever that player is standing. */
  traceTo(characterName: string): void {
    this.say(`/trace ${characterName}`);
  }

  /**
   * `/teleport <x> <y>`: a game-master move within the current map.
   *
   * This exists because a warp does not announce the bot to the people already
   * standing there. `/trace` is a map change: it takes the bot out of the world
   * and puts it back, which removes it from the target's scope, and the target
   * is never told it returned - so the two end up one-way visible and the
   * server refuses the trade. An in-map move is broadcast to observers the
   * ordinary way, the same as walking, so following the warp with one is what
   * actually puts the bot on the customer's screen.
   */
  teleportTo(x: number, y: number): void {
    this.say(`/teleport ${x} ${y}`);
  }

  /**
   * Logs out properly instead of just dropping the socket.
   *
   * Worth doing every time: the server keeps an account connected for a while
   * after its socket dies, and the next login is refused with
   * `AccountAlreadyConnected` until it gives up. A bot that exits by closing
   * the socket locks itself out of its own account for the next run.
   */
  logOut(): void {
    this.connection.send(LogOutPacket.createPacket().buffer);
  }

  /**
   * The named character, or the lowest slot. Named is what production uses:
   * a mule's slots are ours to arrange, and a bot that silently picks a
   * different character would deliver from the wrong inventory.
   */
  private choose(characters: CharacterEntry[]): CharacterEntry {
    const wanted = this.identity.character;
    if (wanted === undefined) {
      return [...characters].sort((a, b) => a.SlotIndex - b.SlotIndex)[0];
    }

    const found = characters.find(c => c.Name === wanted);
    if (!found) {
      const names = characters.map(c => c.Name).join(', ');
      throw new Error(`${this.identity.account} has no character "${wanted}" (has: ${names})`);
    }
    return found;
  }

  private async select(character: CharacterEntry): Promise<void> {
    const packet = SelectCharacterPacket.createPacket();
    packet.setName(character.Name);

    const answer = this.connection.expect(
      CODE.characterInformation,
      15_000,
      'CharacterInformation'
    );
    this.connection.send(packet.buffer);

    const info = new CharacterInformationPacket(view(await answer));

    // Without this the server never starts streaming the world: it holds the
    // player until the client says it has finished loading the map
    // (`CharacterClientReadyPacketHandlerPlugIn` -> `ClientReadyAfterMapChange`).
    // A bot that skips it stands in an empty world, sees nobody, and can never
    // trade, because a trade partner has to be in scope.
    this.connection.send(ClientReadyAfterMapChangePacket.createPacket().buffer);

    this.log(
      `entered the world as ${character.Name} on map ${info.MapId} at ${info.X},${info.Y}`
    );
  }
}
