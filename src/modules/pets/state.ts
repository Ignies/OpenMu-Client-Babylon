import { action, makeObservable, observable } from 'mobx';
import {
  PetCommandModeEnum,
  PetCommandRequestPacket,
  PetInfoRequestPacket,
  PetTypeEnum,
  StorageTypeEnum,
} from '@versions/shared/packets/ClientToServerPackets';
import { Session } from '../session';

/** `PET_INFO` (`giPetManager::SetPetInfo`): what `PetInfoResponse` carries. */
export type PetInfo = {
  /** `PetTypeEnum`: 0 Dark Raven, 1 Dark Horse. */
  pet: number;
  /** Where the pet item sits (`StorageType`: inventory, pet slot, vault…). */
  storage: number;
  slot: number;
  level: number;
  experience: number;
  /** `m_wLife`: durability as life, 0…255. */
  health: number;
};

/** `giPetManager`: the Dark Horse / Dark Raven state the pet window and the item tooltip read. */
export const Pets = new (class {
  // ---- pets (`giPetManager`): Dark Horse / Dark Raven state, no UI yet ----

  /** `PetInfoResponse` (A9): level / exp / life of the pet the tooltip asked about. */
  petInfo: PetInfo | null = null;

  /**
   * `Hero->GetEquipedPetInfo`: the last answer per pet type, so the pet
   * window's two tabs each keep theirs when both pets are equipped.
   */
  petInfoByPet: Partial<Record<number, PetInfo>> = {};

  /** `PetMode` (A7): the Dark Raven's command mode (`PetCommandModeEnum`). */
  petMode = 0;

  /** `PetMode`: the raven's target while in AttackTarget mode; 0xFFFF = none. */
  petTargetId = 0xffff;

  setPetInfo(info: PetInfo) {
    this.petInfo = info;
    this.petInfoByPet = { ...this.petInfoByPet, [info.pet]: info };
  }

  setPetMode(mode: number, targetId: number) {
    this.petMode = mode;
    this.petTargetId = targetId;
  }

  /**
   * `SendPetInfoRequest` (ZzzInventory.cpp:2116): the tooltip over a Dark
   * Horse / Dark Raven asks for its level, experience and life; the answer
   * (`PetInfoResponse`) lands in `petInfo`. `slot` is the inventory index.
   */
  requestPetInfo(pet: PetTypeEnum, slot: number, storage: StorageTypeEnum = StorageTypeEnum.Inventory) {
    if (Session.isOffline) return;
    const packet = PetInfoRequestPacket.createPacket();
    packet.Pet = pet;
    packet.Storage = storage;
    packet.ItemSlot = slot;
    Session.sendToGS(packet.buffer);
  }

  /**
   * `giPetManager::SendPetCommand` → `SendPetCommandRequest`: put the Dark
   * Raven in a command mode; `AttackTarget` carries the target's id,
   * everything else 0xFFFF. The server confirms with `PetMode`.
   */
  sendPetCommand(mode: PetCommandModeEnum, targetId = 0xffff) {
    if (Session.isOffline) return;
    const packet = PetCommandRequestPacket.createPacket();
    packet.PetType = PetTypeEnum.DarkRaven;
    packet.CommandMode = mode;
    packet.TargetId = mode === PetCommandModeEnum.AttackTarget ? targetId : 0xffff;
    Session.sendToGS(packet.buffer);
  }

  constructor() {
    makeObservable(this, {
      petInfo: observable,
      petInfoByPet: observable,
      petMode: observable,
      petTargetId: observable,
      setPetInfo: action,
      setPetMode: action,
    });
  }
})();
