/**
 * Season 6 packet set = the generated code in `src/common/packets/*`, which
 * `bun run generate` produces from OpenMU's un-suffixed XML
 * (`src/common/packets/packetsDefinitions/*.xml`, a copy of
 * `OpenMU/src/Network/Packets/{ServerToClient,ClientToServer,ConnectServer}/*.xml`).
 * The generated files also contain the `...075` / `...095` / `...Extended`
 * variants; `gameVersion.protocol.variantRank` says which one wins for a
 * shared code.
 *
 * Another version generates into *its own* `versions/<id>/packets/` and never
 * touches these files. `src/common/packets/index.ts` re-exports this module,
 * so every `from '../common/packets'` / `from '../common'` importer (the
 * dispatcher in createSocket.ts among them) already goes through the version;
 * the 49 direct imports of the generated class files are listed as remaining
 * work in `docs/VERSIONING.md`.
 *
 * Only the three packet lists are exported: the class modules share a few
 * names (GuildJoinRequestPacket, TradeRequestPacket, ...) in both directions,
 * so a wildcard re-export would be ambiguous.
 */
import { ServerToClientPackets as generated } from '../../../src/common/packets/ServerToClientPackets';
import { ChangeMapServerInfoPacket } from './mapServerMove';

/** The generated set plus the hand-written map-server move (C1 B1 00). */
export const ServerToClientPackets = [...generated, ChangeMapServerInfoPacket];
export { ChangeMapServerInfoPacket };
export { ConnectServerPackets } from '../../../src/common/packets/ConnectServerPackets';
export { ClientToServerPackets } from '../../../src/common/packets/ClientToServerPackets';
