/**
 * Season 6 packet set = the generated code in `versions/shared/packets/*`, which
 * `bun run generate` produces from OpenMU's un-suffixed XML
 * (`versions/shared/packets/packetsDefinitions/*.xml`, a copy of
 * `OpenMU/src/Network/Packets/{ServerToClient,ClientToServer,ConnectServer}/*.xml`).
 * The generated files also contain the `...075` / `...095` / `...Extended`
 * variants; `gameVersion.protocol.variantRank` says which one wins for a
 * shared code.
 *
 * Another version generates into *its own* `versions/<id>/packets/` and never
 * touches these files. `controllers/net/packets.ts` hands out the active
 * version's lists, which the dispatcher (createSocket.ts) reads; the packet
 * handlers import the generated classes they read straight from
 * `versions/shared/packets`.
 *
 * Only the three packet lists are exported: the class modules share a few
 * names (GuildJoinRequestPacket, TradeRequestPacket, ...) in both directions,
 * so a wildcard re-export would be ambiguous.
 */
import { ServerToClientPackets as generated } from '../../shared/packets/ServerToClientPackets';
import { ChangeMapServerInfoPacket } from './mapServerMove';
import { BandRelayPacket } from './bandRelay';
import { PingRelayPacket } from './pingRelay';

/** The generated set plus the hand-written map-server move (C1 B1 00) and the proxy's relays (C1 FA band, C1 FB ping). */
export const ServerToClientPackets = [...generated, ChangeMapServerInfoPacket, BandRelayPacket, PingRelayPacket];
export { ChangeMapServerInfoPacket, BandRelayPacket, PingRelayPacket };
export { ConnectServerPackets } from '../../shared/packets/ConnectServerPackets';
export { ClientToServerPackets } from '../../shared/packets/ClientToServerPackets';
