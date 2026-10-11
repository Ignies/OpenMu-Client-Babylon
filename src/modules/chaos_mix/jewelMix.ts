import { makeObservable, observable, runInAction } from 'mobx';
import { t } from '@/i18n';
import { InventoryConstants } from '@/core/inventoryConstants';
import type { Item } from '@/ecs/world';
import { Hero } from '../hero';
import { Session } from '../session';
import { Social } from '../social/social';
import {
  CloseNpcRequestPacket,
  LahapJewelMixRequestMixTypeEnum,
  LahapJewelMixRequestPacket,
} from '@versions/shared/packets/ClientToServerPackets';

/**
 * Lahap's jewel packing, the original's `COMGEM` (GameLogic/Items/CComGem.cpp) and its message boxes
 * (`CGemIntegration*MsgBox`, NewUICustomMessageBox.cpp:1112-2160, NewUICommonMessageBox.cpp:1593-1720).
 * The window is versions/shared/ui/windows/lahap; the readme says what OpenMU answers.
 */

/** The ten jewels in `eGEMTYPE` order (_enum.h:3770-3805): the single one, the packed one (group 12). */
export const JEWELS: readonly { readonly single: readonly [number, number]; readonly packed: number }[] = [
  { single: [14, 13], packed: 30 }, // Bless
  { single: [14, 14], packed: 31 }, // Soul
  { single: [14, 16], packed: 136 }, // Life
  { single: [14, 22], packed: 137 }, // Creation
  { single: [14, 31], packed: 138 }, // Guardian
  { single: [14, 41], packed: 139 }, // Gemstone
  { single: [14, 42], packed: 140 }, // Harmony
  { single: [12, 15], packed: 141 }, // Chaos
  { single: [14, 43], packed: 142 }, // Lower Refine Stone
  { single: [14, 44], packed: 143 }, // Higher Refine Stone
];

/** `FIRST`, `SECOND`, `THIRD`: the stack sizes of the three combine buttons. */
export const STACK_SIZES = [10, 20, 30] as const;
/** `kDetachUnitValue` per jewel combined, `kAttachValue` to dismantle (CComGem.cpp:25-26, `CalcGen`). */
const COMBINE_ZEN_PER_JEWEL = 50_000;
const DISMANTLE_ZEN = 1_000_000;

/** The zen to combine `size` jewels, on the count buttons and in the check. */
export const combineZen = (size: number): number => size * COMBINE_ZEN_PER_JEWEL;

/** `Check_Jewel_Unit`: which of the ten a single jewel is, or -1. */
export function singleJewel(item: Pick<Item, 'group' | 'num'>): number {
  return JEWELS.findIndex(j => j.single[0] === item.group && j.single[1] === item.num);
}

/** `Check_Jewel_Com`: which of the ten a packed jewel is, or -1. */
export function packedJewel(item: Pick<Item, 'group' | 'num'>): number {
  return item.group === 12 ? JEWELS.findIndex(j => j.packed === item.num) : -1;
}

/** The bag slots `COMGEM` searches: past the equipment, up to the personal store (MAX_MY_INVENTORY_EX_INDEX). */
function bagSlots(items: readonly (Item | null)[]): { slot: number; item: Item }[] {
  const out: { slot: number; item: Item }[] = [];
  const end = Math.min(items.length, InventoryConstants.FirstStoreItemSlotIndex);
  for (let slot = InventoryConstants.EquippableSlotsCount; slot < end; slot++) {
    const item = items[slot];
    if (item) out.push({ slot, item });
  }
  return out;
}

/** `FindWantedList`: every packed jewel in the bag, by slot. Its level is its size (+0 is 10). */
export function packedJewels(items: readonly (Item | null)[]): { slot: number; jewel: number; level: number }[] {
  return bagSlots(items)
    .map(({ slot, item }) => ({ slot, jewel: packedJewel(item), level: item.lvl ?? 0 }))
    .filter(entry => entry.jewel >= 0);
}

/** `CheckMyInvValid` (ATTACH): how many of the jewel the bag holds, counting up to `size`. */
export function singleCount(items: readonly (Item | null)[], jewel: number, size: number): number {
  let count = 0;
  for (const { item } of bagSlots(items)) {
    if (singleJewel(item) === jewel && ++count === size) break;
  }
  return count;
}

/** Which of the original's boxes is up: the menu, combine, dismantle, or the OK / Cancel check of either. */
export type JewelMixBox = 'menu' | 'combine' | 'combineCheck' | 'dismantle' | 'dismantleCheck';

export const JewelMix = new (class _JewelMix {
  box: JewelMixBox | null = null;
  /** `m_cGemType / 2`: the jewel picked, -1 before. */
  jewel = -1;
  /** `m_cComType`: the stack size picked, 0 before. */
  size = 0;
  /** `m_iValue`: the zen the check box quotes. */
  zen = 0;
  /** `m_UnmixTarList`: the packed jewels found when Dismantle was pressed. */
  packed: { slot: number; jewel: number; level: number }[] = [];
  /** The list line picked (`SLGetSelectLine`), -1 for none. */
  selected = -1;

  constructor() {
    makeObservable(this, { box: observable, jewel: observable, size: observable, zen: observable, packed: observable, selected: observable });
  }

  /** `ReceiveTalk(INDEX_NPC_LAHAP)` (WSclient.cpp:6446-6454): `CGemIntegrationMsgBox`. */
  open(): void {
    this.init();
    runInAction(() => (this.box = 'menu'));
  }

  /** The menu's Jewel combination (`UnityBtnDown`). */
  chooseCombine(): void {
    runInAction(() => (this.box = 'combine'));
  }

  /** The menu's Dismantle jewel (`DisjointBtnDown`): only with a packed jewel in the bag. */
  chooseDismantle(): void {
    const packed = packedJewels(Hero.items);
    if (!packed.length) {
      Social.errorMessage(t('jewelMix.cannotDismantle'));
      return;
    }
    runInAction(() => {
      this.packed = packed;
      this.selected = -1;
      this.box = 'dismantle';
    });
  }

  /** A jewel button of the combine box (`SetGem(i * 2)`): the count buttons replace them. */
  chooseJewel(jewel: number): void {
    runInAction(() => (this.jewel = jewel));
  }

  /** A count button (`SelectMixBtnDown`): enough single jewels opens the check, else back to the jewels. */
  chooseSize(index: number): void {
    const size = STACK_SIZES[index];
    if (this.jewel < 0 || !size) return;
    if (singleCount(Hero.items, this.jewel, size) < size) {
      Social.errorMessage(t('jewelMix.lacking'));
      runInAction(() => (this.jewel = -1));
      return;
    }
    runInAction(() => {
      this.size = size;
      this.zen = combineZen(size);
      this.box = 'combineCheck';
    });
  }

  select(index: number): void {
    runInAction(() => (this.selected = index));
  }

  /** The dismantle box's Disband (`DisjointBtnDown` + `SelectFromList`). */
  dismantle(): void {
    const entry = this.packed[this.selected];
    if (!entry) return;
    const item = Hero.items[entry.slot];
    if (!item || packedJewel(item) !== entry.jewel) {
      Social.errorMessage(t('jewelMix.cannotDismantle'));
      return;
    }
    runInAction(() => {
      this.jewel = entry.jewel;
      this.zen = DISMANTLE_ZEN;
      this.box = 'dismantleCheck';
    });
  }

  /** OK on a check box: `ProcessCSAction`, then `Exit` closes Lahap (NewUICommonMessageBox.cpp:1609-1619). */
  confirm(): void {
    const packet = LahapJewelMixRequestPacket.createPacket();
    if (this.box === 'combineCheck') {
      packet.Operation = LahapJewelMixRequestMixTypeEnum.Mix;
      packet.Item = this.jewel;
      packet.MixingStackSize = this.size / 10 - 1;
    } else if (this.box === 'dismantleCheck') {
      const entry = this.packed[this.selected];
      if (!entry) return;
      packet.Operation = LahapJewelMixRequestMixTypeEnum.Unmix;
      packet.Item = entry.jewel;
      packet.MixingStackSize = entry.level;
      packet.UnmixingSourceSlot = entry.slot;
    } else {
      return;
    }
    if (!Session.isOffline) Session.sendToGS(packet.buffer);
    this.exit();
  }

  /** Cancel on a check box: `GetBack`, and the box it came from again (the jewel buttons, the same list). */
  cancelCheck(): void {
    runInAction(() => {
      this.jewel = -1;
      this.box = this.box === 'combineCheck' ? 'combine' : 'dismantle';
    });
  }

  /** `COMGEM::Exit`: every Close, and after a request. */
  exit(): void {
    this.init();
    if (!Session.isOffline) Session.sendToGS(CloseNpcRequestPacket.createPacket().buffer);
  }

  /** `COMGEM::Init`. */
  private init(): void {
    runInAction(() => {
      this.box = null;
      this.jewel = -1;
      this.size = 0;
      this.zen = 0;
    });
  }
})();
