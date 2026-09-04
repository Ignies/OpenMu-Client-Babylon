/**
 * 0.97d packet set. OpenMU keeps every version's definitions in the same
 * three XMLs, so `bun run generate` already emitted the `…075` / `…095` /
 * `…097` classes beside the Season 6 ones; there is nothing extra to
 * generate for 0.97d and no second codec to ship. Which class wins for a
 * shared code is `gameVersion.protocol.variantRank`'s job.
 *
 * Export exactly these names: the dispatcher in
 * `libs/sockets/createSocket.ts` reads them off the resolved version.
 */
import { ServerToClientPackets as generated } from '../../../src/common/packets/ServerToClientPackets';
import { ChangeMapServerInfoPacket } from '../../season6/packets/mapServerMove';

/** The generated set plus the hand-written map-server move (C1 B1 00). */
export const ServerToClientPackets = [...generated, ChangeMapServerInfoPacket];
export { ChangeMapServerInfoPacket };
export { ConnectServerPackets } from '../../../src/common/packets/ConnectServerPackets';
export { ClientToServerPackets } from '../../../src/common/packets/ClientToServerPackets';
