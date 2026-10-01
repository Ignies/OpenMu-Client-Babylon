/**
 * TODO: this version's generated packet classes. Until they are generated
 * the Season 6 lists are re-exported so the folder compiles. The base game
 * gets packets from the registry-resolved handle (`controllers/net/packets.ts`
 * <- `versionPackets`), so pointing these three exports at the generated
 * files is the whole switch. Export exactly these names (the dispatcher in
 * `controllers/net/sockets/createSocket.ts` reads them).
 */
export { ServerToClientPackets } from '../../shared/packets/ServerToClientPackets';
export { ChangeMapServerInfoPacket } from '../../season6/packets/mapServerMove';
export { ConnectServerPackets } from '../../shared/packets/ConnectServerPackets';
export { ClientToServerPackets } from '../../shared/packets/ClientToServerPackets';
