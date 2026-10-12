import { t } from '@/i18n';
import type { Item } from '@/ecs/world';
import { InventoryConstants } from '@/core/inventoryConstants';
import { BaseClass, GLADIATOR_ARMOURS } from '@/modules/hero/characterStats';

type DefenseStats = { defense: number; harmonyDefense: number; defenseRate: number; blockingBuff: number };

/** The defense line (NewUICharacterInfoWindow.cpp:977-1017): the defense buff's share joins the full set's tenth, or prints alone. */
export function defenseText(stats: DefenseStats, fullSet: boolean): string {
  const { defense, defenseRate: rate, blockingBuff } = stats;
  if (rate > 0) {
    const bonus = (fullSet ? Math.trunc(rate / 10) : 0) + blockingBuff;
    return fullSet || bonus ? t('charInfo.defenseRateFull', { defense, rate, bonus }) : t('charInfo.defenseRate', { defense, rate });
  }
  // The harmony defense stays out of the tenth (:996).
  return fullSet ? t('charInfo.defenseFull', { defense, bonus: Math.trunc((defense - stats.harmonyDefense) / 10) }) : t('charInfo.defense', { defense });
}

/** `bDexSuccess` (NewUICharacterInfoWindow.cpp:830-901): helm to boots unbroken and of one set; the gladiator may skip the helm, the fighter the gloves. */
export function fullSet(items: readonly (Item | null)[], base: BaseClass): boolean {
  const { HelmSlot, ArmorSlot, GlovesSlot, BootsSlot } = InventoryConstants;
  const optional = base === BaseClass.MagicGladiator ? HelmSlot : base === BaseClass.RageFighter ? GlovesSlot : -1;
  for (let slot = HelmSlot; slot <= BootsSlot; slot++) {
    const item = items[slot];
    if (item ? item.durability === 0 : slot !== optional) return false;
  }
  const kind = items[base === BaseClass.MagicGladiator ? ArmorSlot : HelmSlot]?.num ?? -1;
  if (base === BaseClass.MagicGladiator && !GLADIATOR_ARMOURS.has(kind)) return false;
  for (let slot = ArmorSlot; slot <= BootsSlot; slot++) {
    if (!(base === BaseClass.RageFighter && slot === GlovesSlot) && items[slot]?.num !== kind) return false;
  }
  return true;
}
