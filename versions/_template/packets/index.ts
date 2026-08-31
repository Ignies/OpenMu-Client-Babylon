/**
 * TODO: this version's generated packet classes. Until they are generated
 *  the Season 6 lists are re-exported so the folder
 * compiles. The base game imports packets through `src/common/packets/index.ts`
 * -> `@version/packets`, so pointing these three exports at the generated
 * files is the whole switch. Export exactly these names (the dispatcher in
 * `libs/sockets/createSocket.ts` reads them).
 */
export { ServerToClientPackets } from '../../../src/common/packets/ServerToClientPackets';
export { ConnectServerPackets } from '../../../src/common/packets/ConnectServerPackets';
export { ClientToServerPackets } from '../../../src/common/packets/ClientToServerPackets';
