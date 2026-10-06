import { action, makeObservable, observable, runInAction } from 'mobx';
import { t } from '@/i18n';
import {
  NetStats,
  SimpleModulusEncryptor,
  SimpleModulusKeys,
  Xor32Encryptor,
  Xor3Byte,
  createSocket,
  stringToBytes,
} from '@/controllers/net';
import { MsgBox } from '@/controllers/interface';
import {
  LoginShortPasswordPacket,
  ServerChangeAuthenticationPacket,
} from '@versions/shared/packets/ClientToServerPackets';
import { ensureActiveVersion, gameVersion } from '@/version';
import { Ecs } from '@/ecs/current';
import { AppState, UIState } from '@/controllers/interface/uiState';
import { MAX_PASSWORD_LENGTH, MAX_USERNAME_LENGTH, ServerAccounts } from '../servers/serverAccounts';
import { connectServerAddress, ServerConfig, wsAddress } from '../servers/serverConfig';
import { addNotification } from '../chat';

/**
 * How long the game server named by `ConnectionInfo` has to say `GameServerEntered`
 * before the `auto` policy falls back to the connect-server host. Long enough for
 * a slow TCP handshake through the proxy, short enough that a player staring at a
 * dead login screen is not what tells them.
 */
const GS_ANSWER_TIMEOUT = 4000;

/** `ServerChangeAuthentication`'s XOR3 name fields are 12 bytes each. */
const SERVER_CHANGE_NAME_LENGTH = 12;

const xor32 = new Xor32Encryptor();
xor32.xor32Key = gameVersion.protocol.encryption.xor32Key;

/**
 * The connection: connect-server and game-server sockets, the client-to-server encryption, the
 * login fields and the offline flag. Every packet the client sends goes out through `sendToGS`
 * (game server) or `sendToCS` (connect server).
 */
export const Session = new (class {
  csSocket?: WebSocket;

  gsSocket?: WebSocket;

  /**
   * Where the game server we are on lives, kept after the connection is
   * established so a dropped socket can be dialled again without walking
   * the connect server a second time (`modules/session/sessionResume.ts`).
   */
  lastGameServer: { host: string; port: number; fallbackHost: string | null } | null = null;

  /**
   * Asked before a lost game-server socket sends the player back to the
   * server list. Returns true when something else (the session resume) has
   * taken the loss over. Set by `app/boot.tsx`; this module stays unaware of it.
   */
  resumeHook: (() => boolean) | null = null;

  private encryptor?: SimpleModulusEncryptor;

  username = '';

  password = '';

  /**
   * The last game-server connection ended without us asking (set by
   * `onSocketLost`, cleared when the next game server connects). The server
   * list reads it to show the notice.
   */
  connectionLost = false;

  loginProcessing = false;

  loginError?: string;

  rememberLogin = true;

  /** Which world's account the login fields hold, as `world/account`. */
  private accountFor = '';

  /**
   * The game server being dialled, while it is unproven. `ConnectionInfo` names
   * an address the server believes clients reach it at, which is often not the
   * address that works from where the proxy sits - the OpenMU demo hands out its
   * public IP to a client on the same box. Under the `auto` policy the second
   * attempt is the connect-server host, which answered a moment ago.
   */
  private gsAttempt: {
    host: string;
    port: number;
    /** Where to retry; null when there is nothing left to try. */
    fallbackHost: string | null;
    timer: ReturnType<typeof setTimeout> | null;
  } | null = null;

  isOffline = location.href.includes('offline');

  playOnline() {
    AppState.uiState = UIState.Servers;
    // The login fields belong to the world being entered, and which world that
    // is was decided on the screen this was called from.
    this.loadAccount();
    // Also the landing for a connection lost mid-game, which never passes
    // through `SessionExit`: the hero does not stay behind on the backdrop.
    Ecs.world?.removeHero();
    // The server list and login window draw no message box; one left up
    // from the world would only swallow Enter and Escape there.
    MsgBox.closeMsgWin();

    this.connectToConnectServer();
  }

  /**
   * A socket we did not close ourselves went away (`wsClosed` / `wsError`
   * from `createSocket`). Deliberate closes clear `gsSocket` / `csSocket`
   * first, so a close event for a socket that is no longer ours is ignored.
   * Losing the game server is the original's `case 2` of `ReceiveLogOut`:
   * the connection is gone, so start over at the server list, with a red
   * system-log line saying why. Losing the connect server only matters while
   * the server list is what we are looking at; it is reconnected in place.
   */
  onSocketLost(socket: WebSocket): void {
    if (socket === this.gsSocket) {
      this.gsSocket = undefined;
      this.encryptor = undefined;

      // The proxy closes the ws when its TCP connect fails, so this is where a
      // wrong `ConnectionInfo` address usually lands. One retry, then the
      // ordinary lost-connection path.
      if (this.retryGameServer('closed the connection')) return;

      // The session resume takes the loss over when it can (and when the
      // option is on); otherwise this is the old start-over path.
      if (this.resumeHook?.()) return;

      runInAction(() => {
        this.connectionLost = true;
        this.loginProcessing = false;
      });
      addNotification(t('notify.connectionLost'), 'error');
      this.playOnline();
      return;
    }
    if (socket === this.csSocket) {
      this.csSocket = undefined;
      if (AppState.uiState === UIState.Servers) {
        addNotification(t('notify.serverListLost'), 'error');
        this.playOnline();
      }
    }
  }

  /**
   * The login fields, filled from the account saved for the world being
   * entered. Called on the way into a world rather than only at construction:
   * which world that is may still change - the published list arrives after
   * launch, and picking another card is the whole point of the worlds screen.
   *
   * Filling them again for the world they already hold would undo what the
   * player has typed, and `playOnline` is also where a lost connection lands,
   * so the same world is a no-op unless the caller insists.
   */
  loadAccount(id: string = ServerConfig.activeId, force = false): void {
    const account = ServerAccounts.of(id);
    // The world and the account chosen on it: picking another of that world's
    // accounts has to refill the fields as surely as picking another world.
    const token = `${id}/${account.id}`;

    if (!force && token === this.accountFor) return;

    runInAction(() => {
      this.accountFor = token;
      this.username = account.username;
      this.password = account.password;
      this.rememberLogin = account.remember;
    });
  }

  /**
   * The login the server just accepted, kept against the world it was used on.
   * `remember` off stores nothing but the choice itself, which is what the
   * original did with its one saved account.
   */
  saveLoginData(): void {
    ServerAccounts.record(ServerConfig.activeId, {
      username: this.username,
      password: this.password,
      remember: this.rememberLogin,
    });
  }

  sendToCS(buffer: DataView) {
    this.csSocket?.send(buffer);
  }

  sendToGS(buffer: DataView) {
    let packet = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    const header = packet[0];
    xor32.Encrypt(packet);
    if (this.encryptor && header >= 0xc3) {
      packet = this.encryptor.Encrypt(packet);
    }

    if (this.gsSocket?.readyState === WebSocket.OPEN) this.gsSocket.send(packet);
  }

  connectToConnectServer() {
    // A world that needs another carried version is entered by reloading
    // into it; the selection is already persisted.
    if (!ensureActiveVersion(ServerConfig.active.version)) return;

    const { host, port } = connectServerAddress();

    const { socket } = createSocket({
      wsAddress: wsAddress(),
      tcpIP: host,
      tcpPort: port,
    });

    this.csSocket = socket;
  }

  disconnectFromConnectServer() {
    this.csSocket?.close();
    this.csSocket = undefined;
  }

  /**
   * Opens the game-server socket. `fallbackHost` is the address to try if this
   * one never answers - `gameServerTarget` decides which of the two addresses
   * (the one the server advertised, the connect-server host) goes first.
   */
  connectToGameServer(ip: string, port: number, fallbackHost: string | null = null) {
    runInAction(() => {
      this.connectionLost = false;
    });

    this.lastGameServer = { host: ip, port, fallbackHost };

    const { socket } = createSocket({
      wsAddress: wsAddress(),
      tcpIP: ip,
      tcpPort: port,
    });

    this.gsSocket = socket;

    this.encryptor = new SimpleModulusEncryptor();
    this.encryptor.encryptionKeys = SimpleModulusKeys.CreateEncryptionKeys([
      ...gameVersion.protocol.encryption.clientToServer,
    ]);

    this.gsAttempt = { host: ip, port, fallbackHost, timer: null };

    // The proxy closes the ws when the TCP connect fails, which is the fast
    // path into the retry. The timer is for the case with no close at all -
    // a firewall that drops the SYN, an address that routes nowhere.
    if (fallbackHost) {
      this.gsAttempt.timer = setTimeout(
        () => this.retryGameServer('never answered'),
        GS_ANSWER_TIMEOUT
      );
    }
  }

  /** `GameServerEntered` arrived: this address works, drop the fallback. */
  onGameServerReached(): void {
    if (this.gsAttempt?.timer) clearTimeout(this.gsAttempt.timer);
    this.gsAttempt = null;
  }

  /**
   * Second and last attempt at the game server, on the connect-server host.
   * Returns false when there is nothing to retry - the caller then treats the
   * dead socket as a lost connection, as it always did.
   */
  private retryGameServer(reason: string): boolean {
    const attempt = this.gsAttempt;

    if (!attempt?.fallbackHost) return false;

    if (attempt.timer) clearTimeout(attempt.timer);
    this.gsAttempt = null;

    console.warn(
      `game server ${attempt.host}:${attempt.port} ${reason}; retrying on ${attempt.fallbackHost}:${attempt.port}`
    );

    this.disconnectFromGameServer();
    this.connectToGameServer(attempt.fallbackHost, attempt.port);

    return true;
  }

  disconnectFromGameServer() {
    if (this.gsAttempt?.timer) clearTimeout(this.gsAttempt.timer);
    this.gsAttempt = null;
    this.gsSocket?.close();
    this.gsSocket = undefined;
    // A new socket is a new set of round trips.
    NetStats.reset();
  }

  /**
   * Join auth codes of a pending map-server switch. The original learns them
   * from C1 B1 00 (`ReceiveChangeMapServerInfo`); consumed by the next
   * `GameServerEntered`.
   */
  private pendingServerChange: {
    authCode1: number;
    authCode2: number;
    authCode3: number;
    authCode4: number;
  } | null = null;

  /**
   * `CSMServer::ConnectChangeMapServer`: drop the current game server on
   * purpose and dial the one hosting the destination map; `GameServerEntered`
   * then re-authenticates instead of opening the login form.
   */
  switchToMapServer(
    host: string,
    port: number,
    auth: NonNullable<typeof this.pendingServerChange>
  ): void {
    this.pendingServerChange = { ...auth };
    this.disconnectFromGameServer();
    this.connectToGameServer(host, port);
  }

  /**
   * `CSMServer::SendChangeMapServer` - C3 B1 01 with the XOR3 account and
   * character names, the join auth codes, tick count, version and serial.
   * Returns false when no switch is pending. `characterName` is the hero's.
   */
  sendServerChangeAuthentication(characterName: string): boolean {
    const pending = this.pendingServerChange;
    if (!pending) return false;
    this.pendingServerChange = null;

    const account = stringToBytes(this.username, SERVER_CHANGE_NAME_LENGTH);
    const character = stringToBytes(characterName, SERVER_CHANGE_NAME_LENGTH);
    Xor3Byte(account);
    Xor3Byte(character);

    const p = ServerChangeAuthenticationPacket.createPacket();
    p.setAccountXor3(account, SERVER_CHANGE_NAME_LENGTH);
    p.setCharacterNameXor3(character, SERVER_CHANGE_NAME_LENGTH);
    p.AuthCode1 = pending.authCode1;
    p.AuthCode2 = pending.authCode2;
    p.AuthCode3 = pending.authCode3;
    p.AuthCode4 = pending.authCode4;
    p.TickCount = Math.floor(performance.now()) >>> 0;
    p.setClientVersion(gameVersion.clientVersionBytes);
    p.setClientSerial(gameVersion.serialBytes);

    this.sendToGS(p.buffer);
    return true;
  }

  loginRequest(username: string, password: string) {
    const usernameBytes = stringToBytes(username, MAX_USERNAME_LENGTH);
    const passwordBytes = stringToBytes(password, MAX_PASSWORD_LENGTH);

    Xor3Byte(usernameBytes);
    Xor3Byte(passwordBytes);

    const loginShortPasswordPacket = LoginShortPasswordPacket.createPacket();
    loginShortPasswordPacket.setUsername(usernameBytes, usernameBytes.length);
    loginShortPasswordPacket.setPassword(passwordBytes, passwordBytes.length);
    loginShortPasswordPacket.setClientVersion(gameVersion.clientVersionBytes);
    loginShortPasswordPacket.setClientSerial(gameVersion.serialBytes);

    console.log(`send login`);
    this.sendToGS(loginShortPasswordPacket.buffer);
  }

  /**
   * A band frame (`bandProtocol.ts`) to the ws proxy, which handles it
   * itself and never forwards it. Same path as every packet, so it gets the
   * Xor32 the proxy expects and rides the one socket.
   */
  sendBandFrame(frame: Uint8Array): void {
    this.sendToGS(new DataView(frame.buffer, frame.byteOffset, frame.byteLength));
  }

  /**
   * A map ping (`pingProtocol.ts`) to the ws proxy, which relays it itself
   * and never forwards it. Same path as a band frame.
   */
  sendPingFrame(frame: Uint8Array): void {
    this.sendToGS(new DataView(frame.buffer, frame.byteOffset, frame.byteLength));
  }

  constructor() {
    makeObservable(this, {
      username: observable,
      password: observable,
      connectionLost: observable,
      loginError: observable,
      loginProcessing: observable,
      rememberLogin: observable,
      playOnline: action,
      onSocketLost: action,
    });

    this.loadAccount();
  }
})();

// A second instance after a hot update would hold no socket.
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
