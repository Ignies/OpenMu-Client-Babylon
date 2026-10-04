import { ChangeMapServerInfoPacket } from '@/controllers/net/packets';
import { ConnectionInfoPacket, ServerListResponsePacket } from '@versions/shared/packets/ConnectServerPackets';
import { EventBus } from '@/core/eventBus';
import { GameServerEnteredPacket, LoginResponseLoginResultEnum, LoginResponsePacket, LogoutResponsePacket } from '@versions/shared/packets/ServerToClientPackets';
import { SessionExit } from './sessionExit';
import { SessionResume } from './sessionResume';
import { Merchant } from '@/modules/npc_shop';
import { Hero } from '@/modules/hero';
import { Servers } from '@/modules/servers';
import { Session } from './state';
import { AppState, UIState } from '@/controllers/interface/uiState';
import { gameServerTarget } from '../servers/serverConfig';
import { quests } from '../quests';
import { runInAction } from 'mobx';

let serverListRequested = false;

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  EventBus.on('Hello', () => {
    if (serverListRequested) return;
    serverListRequested = true;
    Servers.updateServerListRequest();
  });

  EventBus.on('GameServerEntered', bytes => {
    const p = new GameServerEnteredPacket(bytes);

    // The game server answered, so the address we dialled is the right one: no
    // fallback attempt is pending any more.
    Session.onGameServerReached();

    const id = p.PlayerId & 0x7fff;
    runInAction(() => {
      Hero.playerId = id;
    });
    console.log(`PlayerID: ${Hero.playerId}`);

    // A map-server switch re-authenticates on the new server instead of
    // showing the login form (CSMServer::SendChangeMapServer); the server
    // answers with the character state and the world carries on.
    if (Session.sendServerChangeAuthentication(Hero.name)) return;

    // A resume sends the login itself instead of showing the form.
    if (SessionResume.onGameServerEntered()) return;

    runInAction(() => {
      AppState.uiState = UIState.Login;
    });
  });

  EventBus.on('ServerListResponse', bytes => {
    const p = new ServerListResponsePacket(bytes);
    const servers = p.getServers(p.ServerCount);
    runInAction(() => {
      Servers.serverList = servers;
    });
  });

  // A socket we did not close ourselves went away: `Session.onSocketLost` ignores
  // sockets that were already handed off (deliberate closes clear the field
  // first) and otherwise starts over at the server list with a notice. Errors
  // are always followed by a close, so only the close is acted on (app/App.tsx
  // already logs the error line).
  EventBus.on('wsClosed', ({ socket }) => {
    Merchant.closeNpcShop();
    quests.closeAll();
    Session.onSocketLost(socket);
  });

  // Packet handlers are synchronous on purpose: `createSocket` emits packets in
  // wire order from one loop, so a handler that awaits would let the packets
  // behind it run first (and with two `async` handlers, in whichever order the
  // microtasks resolve). Nothing below needs to await - the socket calls are
  // fire-and-forget - so none does.
  EventBus.on('ConnectionInfo', bytes => {
    const p = new ConnectionInfoPacket(bytes);
    // The server names the game server it wants us on - a separate box on any
    // real deployment. `gameServerTarget` weighs that against the connect-server
    // host we just used (see its comment: an address only the internet can route
    // to is not believed from a server we reached locally) and hands back the
    // loser as the address to retry on.
    const { host, fallback } = gameServerTarget(p.IpAddress);

    console.log(
      `connection info: ${host}:${p.Port} (server said "${p.IpAddress}")`
    );

    Session.connectToGameServer(host, p.Port, fallback);
  });

  EventBus.on('LoginResponse', bytes => {
    const p = new LoginResponsePacket(bytes);

    runInAction(() => {
      Session.loginProcessing = false;
    });

    if (p.Success === LoginResponseLoginResultEnum.Okay) {
      runInAction(() => {
        Session.loginError = undefined;
      });
      Session.saveLoginData();
      // A resume picks the character back up instead of opening the list.
      if (SessionResume.onLoginOk()) return;
      Session.disconnectFromConnectServer();
      runInAction(() => {
        AppState.uiState = UIState.Characters;
      });
      return;
    }

    // The server refused the login: the player takes over from the form.
    SessionResume.onLoginFailed();

    runInAction(() => {
      Session.loginError = `Error: ${LoginResponseLoginResultEnum[p.Success]}`;
      AppState.uiState = UIState.Login;
    });
  });

  /**
   * F1 02 - `ReceiveLogOut`. OpenMU `LogoutType`: 0 CloseGame, 1
   * BackToCharacterSelection (the connection stays, the player is back to
   * `Authenticated`), 2 BackToServerSelection (the server closes the socket).
   * The answer to our own request, and to a kick we never asked for; either
   * way `sessionExit` decides where we land.
   */
  EventBus.on('LogoutResponse', packet => {
    if (packet.byteLength < LogoutResponsePacket.Length!) return;

    SessionExit.onResponse(new LogoutResponsePacket(packet).Type);
  });

  /**
   * C1 B1 00 - `ReceiveChangeMapServerInfo` (WSclient.cpp:10328): move to the
   * game server hosting the destination map. Port 0 means the move was
   * cancelled (`LoadingWorld = 0`). OpenMU's protocol has no packet for this
   * (one game server per connection), so only split-deployment servers send it.
   */
  EventBus.on('ChangeMapServerInfo', packet => {
    if (packet.byteLength < ChangeMapServerInfoPacket.MinimumSize) return;
    const p = new ChangeMapServerInfoPacket(packet);
    if (!p.Port) return;
    console.log(`map server move: ${p.IpAddress}:${p.Port}`);
    Session.switchToMapServer(p.IpAddress, p.Port, {
      authCode1: p.AuthCode1,
      authCode2: p.AuthCode2,
      authCode3: p.AuthCode3,
      authCode4: p.AuthCode4,
    });
  });
}
