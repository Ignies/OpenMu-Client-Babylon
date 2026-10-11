import { Economy } from '../economy/economy';
import { EventBus } from '@/core/eventBus';
import { VaultMoneyUpdatePacket, VaultProtectionInformationPacket } from '@versions/shared/packets/ServerToClientPackets';

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  // --- Vault (CNewUIStorageInventory) ------------------------------------------

  EventBus.on('VaultMoneyUpdate', packet => {
    const p = new VaultMoneyUpdatePacket(packet);
    Economy.vaultMoneyUpdate(p.Success, p.VaultMoney, p.InventoryMoney);
  });

  EventBus.on('VaultProtectionInformation', packet => {
    const p = new VaultProtectionInformationPacket(packet);
    Economy.vaultProtectionState(p.ProtectionState);
  });

  // The server confirms our own `VaultClosed`; nothing is left to do but make
  // sure the window is really down (`ProcessClosing`).
  EventBus.on('VaultClosed', () => Economy.closeVault(false));
}
