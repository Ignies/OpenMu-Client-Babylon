import { EventBus } from '@/core/eventBus';
import { MuHelperConfigurationDataPacket, MuHelperStatusUpdatePacket } from '@versions/shared/packets/ServerToClientPackets';
import { Store } from '@/app/store';

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  /**
   * BF 51 - `ReceiveMuHelperStatusUpdate`: `Pause` stops the helper, otherwise
   * it starts; with `ConsumeMoney` the server charged `Money` zen for it (the
   * money itself arrives through the usual money packets).
   */
  EventBus.on('MuHelperStatusUpdate', packet => {
    if (packet.byteLength < MuHelperStatusUpdatePacket.Length!) return;
    const p = new MuHelperStatusUpdatePacket(packet);
    Store.setMuHelperStatus(!p.PauseStatus, p.ConsumeMoney ? p.Money : 0);
  });

  /** C2 AE - `ReceiveMuHelperConfigurationData`: the saved config blob, kept as is. */
  EventBus.on('MuHelperConfigurationData', packet => {
    if (packet.byteLength < MuHelperConfigurationDataPacket.Length!) return;
    const p = new MuHelperConfigurationDataPacket(packet);
    const data = p.HelperData;
    Store.setMuHelperConfig(
      new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice()
    );
  });
}
