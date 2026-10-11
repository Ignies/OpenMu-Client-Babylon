// The e2e run's live game check: it speaks the game protocol to the local stack with the client's own code
// (packet classes, encryption, module frames), through the proxy's websocket like a browser does.
import {
  CharacterListPacket,
  LoginResponseLoginResultEnum,
  LoginResponsePacket,
  LoginTokenAnswerLoginTokenStatusEnum,
  LoginTokenAnswerPacket,
} from '../../versions/shared/packets/ServerToClientPackets';
import {
  CreateCharacterPacket,
  LoginShortPasswordPacket,
  LoginTokenRequestPacket,
  RequestCharacterListPacket,
  SelectCharacterPacket,
  TokenLoginPacket,
} from '../../versions/shared/packets/ClientToServerPackets';
import { SimpleModulusDecryptor, SimpleModulusEncryptor, SimpleModulusKeys } from '../../src/controllers/net/encryption/simpleModulus';
import { Xor32Encryptor } from '../../src/controllers/net/encryption/xor32';
import { Xor3Byte } from '../../src/controllers/net/encryption/xor3';
import { getPacketSize, getSizeOfPacketType, stringToBytes } from '../../src/controllers/net/wireUtils';
import { encodeModuleFrame } from '../../src/modules/_api/packetWire';
import { CharacterClassNumber } from '../../src/core/types';
import { gameVersion } from '../../versions/season6';
import type { Check } from './health';

const ANSWER_MS = 10_000;
/** The character the check plays, created on the GM account the first time. */
const CHARACTER = 'E2eKnight';

const bytesOf = (p: { buffer: DataView }) => new Uint8Array(p.buffer.buffer, p.buffer.byteOffset, p.buffer.byteLength).slice();
const hex = (n: number) => n.toString(16).padStart(2, '0');

/** Whether a decrypted packet has this code (and sub-code), whatever its header. */
function is(packet: Uint8Array, code: number, sub?: number): boolean {
  const at = getSizeOfPacketType(packet[0]);
  return packet[at] === code && (sub === undefined || packet[at + 1] === sub);
}

/** One game-server connection: sends as `Session.sendToGS` does, reads as `createSocket` does. */
export class GameClient {
  private readonly encryptor = new SimpleModulusEncryptor();
  private readonly decryptor = new SimpleModulusDecryptor();
  private readonly xor32 = new Xor32Encryptor();
  private queue = new Uint8Array(0);
  private readonly inbox: Uint8Array[] = [];
  private waiter: { match: (p: Uint8Array) => boolean; resolve: (p: Uint8Array) => void } | null = null;
  closed = false;

  private constructor(private readonly socket: WebSocket) {
    this.encryptor.encryptionKeys = SimpleModulusKeys.CreateEncryptionKeys([...gameVersion.protocol.encryption.clientToServer]);
    this.decryptor.decryptionKeys = SimpleModulusKeys.CreateDecryptionKeys([...gameVersion.protocol.encryption.serverToClient]);
    this.xor32.xor32Key = gameVersion.protocol.encryption.xor32Key;
    socket.binaryType = 'arraybuffer';
    socket.addEventListener('message', e => this.receive(new Uint8Array(e.data as ArrayBuffer)));
    socket.addEventListener('close', () => (this.closed = true));
  }

  static open(url: string): Promise<GameClient> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url);
      const client = new GameClient(socket);
      socket.addEventListener('open', () => resolve(client), { once: true });
      socket.addEventListener('error', () => reject(new Error(`cannot open ${url}`)), { once: true });
    });
  }

  send(packet: Uint8Array): void {
    let wire: Uint8Array = packet.slice();
    this.xor32.Encrypt(wire);
    if (wire[0] >= 0xc3) wire = this.encryptor.Encrypt(wire);
    this.socket.send(wire);
  }

  /** The next packet that matches, already received or still to come. */
  next(match: (p: Uint8Array) => boolean, what: string, ms = ANSWER_MS): Promise<Uint8Array> {
    const at = this.inbox.findIndex(match);
    if (at >= 0) return Promise.resolve(this.inbox.splice(at, 1)[0]);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiter = null;
        reject(new Error(`no ${what} within ${ms / 1000} s`));
      }, ms);
      this.waiter = {
        match,
        resolve: p => {
          clearTimeout(timer);
          this.waiter = null;
          resolve(p);
        },
      };
    });
  }

  close(): void {
    this.socket.close();
  }

  private receive(chunk: Uint8Array): void {
    const joined = new Uint8Array(this.queue.length + chunk.length);
    joined.set(this.queue);
    joined.set(chunk, this.queue.length);
    this.queue = joined;
    while (this.queue.length >= 3) {
      const size = getPacketSize(this.queue);
      if (!size) {
        this.queue = this.queue.subarray(1);
        continue;
      }
      if (this.queue.length < size) return;
      let packet: Uint8Array = this.queue.slice(0, size);
      this.queue = this.queue.subarray(size);
      if (packet[0] >= 0xc3) {
        const [ok, decrypted] = this.decryptor.Decrypt(packet);
        if (!ok) continue;
        packet = decrypted;
      }
      if (this.waiter?.match(packet)) this.waiter.resolve(packet);
      else this.inbox.push(packet);
    }
  }
}

/** What the check needs from the stack around it. */
export type LoginCheckTarget = {
  /** The proxy's websocket, dialling the first game server. */
  url: string;
  /** The world's server.json, where the client reads it (next to the proxy). */
  manifestUrl: string;
  login: string;
  password: string;
  /** OpenMU's log lines since a time (ISO). */
  logsSince: (since: string) => Promise<string>;
  /** The account the proxy's presence names for a socket that carried this session nonce (the cash shop's ticket). */
  ticket: (nonce: string) => Promise<string | null>;
};

/** Dials the game server and waits for its greeting (`GameServerEntered`, C1 F1 00). */
async function connect(target: LoginCheckTarget, nonce?: string): Promise<GameClient> {
  const client = await GameClient.open(nonce ? `${target.url}&session=${nonce}` : target.url);
  await client.next(p => is(p, 0xf1, 0x00), 'GameServerEntered');
  return client;
}

/** The login packet `Session.sendLogin` builds. */
function passwordLogin(login: string, password: string): Uint8Array {
  const name = stringToBytes(login, 10);
  const secret = stringToBytes(password, 10);
  Xor3Byte(name);
  Xor3Byte(secret);
  const p = LoginShortPasswordPacket.createPacket();
  p.setUsername(name, name.length);
  p.setPassword(secret, secret.length);
  p.setClientVersion(gameVersion.clientVersionBytes);
  p.setClientSerial(gameVersion.serialBytes);
  return bytesOf(p);
}

/** The token login packet (E7 05), sent instead of the password login. */
function tokenLogin(login: string, token: Uint8Array): Uint8Array {
  const name = stringToBytes(login, 10);
  Xor3Byte(name);
  const p = TokenLoginPacket.createPacket();
  p.setUsername(name, name.length);
  p.setToken(token, token.length);
  p.setClientVersion(gameVersion.clientVersionBytes);
  return bytesOf(p);
}

/** The token in the next token answer (E7 04); anything but Ok fails the step. */
async function tokenAnswer(client: GameClient): Promise<Uint8Array> {
  const answer = new LoginTokenAnswerPacket(new DataView((await client.next(p => is(p, 0xe7, 0x04), 'LoginTokenAnswer')).buffer));
  if (answer.Status !== LoginTokenAnswerLoginTokenStatusEnum.Ok) throw new Error(`token answer ${LoginTokenAnswerLoginTokenStatusEnum[answer.Status]}`);
  return new Uint8Array(answer.Token.buffer);
}

async function expectLogin(client: GameClient, packet: Uint8Array, expected: LoginResponseLoginResultEnum): Promise<void> {
  const result = await login(client, packet);
  if (result !== expected) throw new Error(`answered ${LoginResponseLoginResultEnum[result]}`);
}

/** The login result, retried while the server still holds the previous connection's session. */
async function login(client: GameClient, packet: Uint8Array): Promise<number> {
  for (let attempt = 0; ; attempt++) {
    client.send(packet);
    const result = new LoginResponsePacket(new DataView((await client.next(p => is(p, 0xf1, 0x01), 'LoginResponse')).buffer)).Success;
    if (result !== LoginResponseLoginResultEnum.AccountAlreadyConnected || attempt >= 10) return result;
    await Bun.sleep(1000);
  }
}

async function characterNames(client: GameClient): Promise<string[]> {
  const request = RequestCharacterListPacket.createPacket();
  request.Language = 0;
  client.send(bytesOf(request));
  const list = new CharacterListPacket(new DataView((await client.next(p => is(p, 0xf3, 0x00), 'CharacterList')).buffer));
  return list.getCharacters(list.CharacterCount).map(c => c.Name);
}

/** Selects the check's character (created first if the account has none) and waits for it to enter the world. */
async function enterWorld(client: GameClient, names: string[]): Promise<void> {
  if (!names.includes(CHARACTER)) {
    const create = CreateCharacterPacket.createPacket();
    create.setName(CHARACTER);
    create.Class = CharacterClassNumber.DarkKnight;
    client.send(bytesOf(create));
    const answer = await client.next(p => is(p, 0xf3, 0x01), 'CharacterCreation');
    if (answer[1] < 42 || !answer[4]) throw new Error(`could not create ${CHARACTER}`);
  }
  const select = SelectCharacterPacket.createPacket();
  select.setName(CHARACTER);
  client.send(bytesOf(select));
  await client.next(p => is(p, 0xf3, 0x03), 'CharacterInformation');
}

type Step = [name: string, run: () => Promise<void>];

/** Runs the steps in order; the first that fails fails the rest, which depend on it. */
async function runSteps(steps: Step[]): Promise<Check[]> {
  const results: Check[] = [];
  let failed = false;
  for (const [name, run] of steps) {
    if (failed) {
      results.push({ name: `${name} (skipped)`, ok: false });
      continue;
    }
    try {
      await run();
      results.push({ name, ok: true });
    } catch (e) {
      failed = true;
      results.push({ name: `${name}: ${(e as Error).message}`, ok: false });
    }
  }
  return results;
}

/** The check's one live connection at a time; a step that needs it fails cleanly when there is none. */
class Line {
  private current: GameClient | null = null;

  constructor(private readonly target: LoginCheckTarget) {}

  get client(): GameClient {
    if (!this.current) throw new Error('not connected');
    return this.current;
  }

  /** Drops the connection there is, if any, and dials a new one (carrying a session nonce, as the client's game socket does). */
  async redial(nonce?: string): Promise<GameClient> {
    this.close();
    this.current = await connect(this.target, nonce);
    return this.current;
  }

  close(): void {
    this.current?.close();
    this.current = null;
  }
}

/** Logs in as the e2e GM and checks what our OpenMU plugins do with a session's packets. */
export async function loginCheck(target: LoginCheckTarget): Promise<Check[]> {
  // A little early, for a container clock a moment behind; the module ids are this run's own anyway.
  const since = new Date(Date.now() - 5000).toISOString();
  const suffix = Array.from(crypto.getRandomValues(new Uint8Array(4)), hex).join('');
  const lobbyModule = `e2e_lobby_${suffix}`;
  const worldModule = `e2e_world_${suffix}`;
  const line = new Line(target);
  let names: string[] = [];
  let first: Uint8Array = new Uint8Array(0);
  let second: Uint8Array = new Uint8Array(0);
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), hex).join('');

  try {
    return await runSteps([
      ['server.json offers login tokens', async () => {
        const manifest = (await (await fetch(target.manifestUrl)).json()) as { loginTokens?: unknown };
        if (manifest.loginTokens !== true) throw new Error(`loginTokens is ${String(manifest.loginTokens)}`);
      }],
      ['password login', async () => {
        await expectLogin(await line.redial(), passwordLogin(target.login, target.password), LoginResponseLoginResultEnum.Okay);
      }],
      ['character list', async () => {
        names = await characterNames(line.client);
      }],
      ['token request at the character list', async () => {
        line.client.send(bytesOf(LoginTokenRequestPacket.createPacket()));
        first = await tokenAnswer(line.client);
      }],
      ['module packet before the world is dropped unread', async () => {
        line.client.send(encodeModuleFrame(lobbyModule, Uint8Array.of(1)));
        await enterWorld(line.client, names);
        line.client.send(encodeModuleFrame(worldModule, Uint8Array.of(1)));
        await Bun.sleep(1500);
        const logs = await target.logsSince(since);
        if (!logs.includes(worldModule)) throw new Error(`the frame sent in the world never reached the handler (${worldModule})`);
        if (logs.includes(lobbyModule)) throw new Error(`the frame sent at the character list was read (${lobbyModule})`);
      }],
      ['token login after a reconnect reaches the character list', async () => {
        await expectLogin(await line.redial(nonce), tokenLogin(target.login, first), LoginResponseLoginResultEnum.Okay);
        second = await tokenAnswer(line.client);
        if (Bun.deepEquals(first, second)) throw new Error('the token was not replaced');
        await characterNames(line.client);
      }],
      ['the proxy names the token login for the cash shop', async () => {
        const account = await target.ticket(nonce);
        if (account !== target.login) throw new Error(`the ticket route answered ${account}`);
      }],
      ['the replaced token is refused', async () => {
        await expectLogin(await line.redial(), tokenLogin(target.login, first), LoginResponseLoginResultEnum.InvalidPassword);
      }],
      ['a junk token is refused', async () => {
        const junk = crypto.getRandomValues(new Uint8Array(32));
        await expectLogin(line.client, tokenLogin(target.login, junk), LoginResponseLoginResultEnum.InvalidPassword);
      }],
      ['the new token logs in', async () => {
        await expectLogin(line.client, tokenLogin(target.login, second), LoginResponseLoginResultEnum.Okay);
        await tokenAnswer(line.client);
      }],
    ]);
  } finally {
    line.close();
  }
}
