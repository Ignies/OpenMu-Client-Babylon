import { makeObservable, observable } from 'mobx';
import {
  ConnectionInfoRequestPacket,
  ServerListRequestPacket,
  type ServerListResponsePacket,
} from '@versions/shared/packets/ConnectServerPackets';
import { Session } from '../session';

/** The connect server's list (`ServerListResponse`) and the server the player picked from it. */
export const Servers = new (class {
  serverList: ReturnType<ServerListResponsePacket['getServers']> = [];

  /** `g_ServerListManager->GetSelectServerName()` / `Index`: the login window's server line. */
  selectedServer: {
    name: string;
    channel: number;
    /** Set when the world published a name for this channel, not a number. */
    channelName?: string;
  } | null = null;

  updateServerListRequest(): void {
    const buffer = ServerListRequestPacket.createPacket().buffer;
    Session.sendToCS(buffer);
  }

  getConnectionInfoRequest(serverId: number): void {
    const connectionInfoRequestPacket =
      ConnectionInfoRequestPacket.createPacket();
    connectionInfoRequestPacket.ServerId = serverId;

    Session.sendToCS(connectionInfoRequestPacket.buffer);
  }

  constructor() {
    makeObservable(this, {
      serverList: observable,
      selectedServer: observable,
    });
  }
})();
