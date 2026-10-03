import { EventBus } from '@/core/eventBus';
import { onEscrowResultPacket } from './gameBridge';

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  /**
   * The game server's answer to a marketplace escrow token (C1 E7 02). The
   * item and the Zen it moved arrive through the inventory packets above; this
   * only tells the window how the request went.
   */
  EventBus.on('MarketplaceEscrowResult', packet => {
    onEscrowResultPacket(new Uint8Array(packet.buffer, packet.byteOffset, packet.byteLength));
  });
}
