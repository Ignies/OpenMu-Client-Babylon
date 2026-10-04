import { COMBAT_BUS } from '@/controllers/sound/combatSounds';
import { EventBus } from '@/core/eventBus';
import { PetAttackPacket, PetAttackPetSkillTypeEnum, PetInfoResponsePacket, PetModePacket } from '@versions/shared/packets/ServerToClientPackets';
import { Store } from '@/app/store';
import { Ecs } from '@/ecs/current';
import { playSfx } from '@/controllers/sound/sfx';

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  /** A9 - `ReceivePetInfo` (`giPetManager::SetPetInfo`): state for the tooltip. */
  EventBus.on('PetInfoResponse', packet => {
    if (packet.byteLength < PetInfoResponsePacket.Length!) return;
    const p = new PetInfoResponsePacket(packet);
    Store.setPetInfo({
      pet: p.Pet,
      storage: p.Storage,
      slot: p.ItemSlot,
      level: p.Level,
      experience: p.Experience,
      health: p.Health,
    });
  });

  /** A7 - `ReceivePetCommand` (`giPetManager::SetPetCommand`): the raven's mode. */
  EventBus.on('PetMode', packet => {
    if (packet.byteLength < PetModePacket.Length!) return;
    const p = new PetModePacket(packet);
    Store.setPetMode(p.PetCommandMode, p.TargetId);
  });

  /** A8 - `CSPetSystem::SetAttack` (:276/:280); sound only, at the owner. */
  EventBus.on('PetAttack', packet => {
    if (packet.byteLength < PetAttackPacket.Length!) return;
    const p = new PetAttackPacket(packet);
    const world = Ecs.world;
    const owner = world?.getByNetId(p.OwnerId & 0x7fff);
    if (!owner?.transform || !world?.getByNetId(p.TargetId & 0x7fff)) return;
    const range = p.SkillType === PetAttackPetSkillTypeEnum.Range;
    playSfx(range ? 'Sound/DSpirit_Missile' : 'Sound/DSpirit_Rush', owner.transform.pos, {
      bus: COMBAT_BUS,
      channels: range ? 4 : 3,
    });
  });
}
