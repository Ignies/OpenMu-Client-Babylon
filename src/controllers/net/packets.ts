// The active version's packet set, captured from the handle the bootstrap
// resolves before the app graph (this module included) evaluates
// (src/version/index.ts). Season 6 re-exports the generated files beside
// this one; another version ships its own under versions/<id>/packets.
import { versionPackets } from '../../version';

export const {
  ServerToClientPackets,
  ClientToServerPackets,
  ConnectServerPackets,
  ChangeMapServerInfoPacket,
} = versionPackets;

type CSPacketKeys = (typeof ConnectServerPackets)[number]['Name'];
type GSPacketKeys = (typeof ServerToClientPackets)[number]['Name'];

// Every packet name is a bus event carrying its bytes (core/eventBus/events.ts).
declare module '@/core/eventBus/events' {
  interface EventMap extends Record<CSPacketKeys, DataView>, Record<GSPacketKeys, DataView> {}
}
