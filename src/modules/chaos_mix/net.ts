import { Economy } from '../economy/economy';
import { EventBus } from '@/core/eventBus';
import { ItemCraftingResultPacket } from '@versions/shared/packets/ServerToClientPackets';
import { ItemSerializer } from '../items/itemSerializer';

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  // --- Chaos machine (CNewUIMixInventory) --------------------------------------

  EventBus.on('ItemCraftingResult', packet => {
    const p = new ItemCraftingResultPacket(packet);

    const data = new Uint8Array(p.ItemData.buffer);
    const item =
      data.length >= ItemSerializer.NeededSpace
        ? ItemSerializer.DeserializeItem(data)
        : null;

    Economy.craftingResult(p.Result, item);
  });

  EventBus.on('CraftingDialogClosed075', () => Economy.closeMix(false));
}
