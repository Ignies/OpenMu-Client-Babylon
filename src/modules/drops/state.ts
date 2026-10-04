import { makeObservable, observable, runInAction } from 'mobx';
import { PickupItemRequestPacket } from '@versions/shared/packets/ClientToServerPackets';
import { Session } from '../session';

/** The names over the drops (ALT) and the pick-up request. */
export const Drops = new (class {
  /** Names over every drop (CNewUINameWindow::m_bShowItemName, toggled by ALT). */
  showDropNames = false;

  toggleDropNames(): void {
    runInAction(() => {
      this.showDropNames = !this.showDropNames;
    });
  }

  pickupItemRequest(itemNetId: number): void {
    if (Session.isOffline) return;

    const packet = PickupItemRequestPacket.createPacket();
    packet.ItemId = itemNetId;

    Session.sendToGS(packet.buffer);
  }

  constructor() {
    makeObservable(this, {
      showDropNames: observable,
    });
  }
})();
