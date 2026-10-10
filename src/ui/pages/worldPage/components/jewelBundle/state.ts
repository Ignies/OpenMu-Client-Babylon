import { makeAutoObservable, runInAction } from 'mobx';
import { Store } from '../../../../../store';
import {
  CloseNpcRequestPacket,
  LahapJewelMixRequestItemTypeEnum,
  LahapJewelMixRequestMixTypeEnum,
  LahapJewelMixRequestPacket,
  LahapJewelMixRequestStackSizeEnum,
} from '../../../../../common/packets/ClientToServerPackets';

/** Zen the server charges for every 10 jewels of a new bundle (`ItemStackAction`). */
export const COMBINE_FEE_PER_TEN = 500_000;
/** Zen the server charges for disbanding one bundle. */
export const DISBAND_FEE = 1_000_000;

/** The bundle sizes the server accepts, with the wire value of each. */
export const BUNDLE_SIZES = [
  { size: 10, wire: LahapJewelMixRequestStackSizeEnum.Ten },
  { size: 20, wire: LahapJewelMixRequestStackSizeEnum.Twenty },
  { size: 30, wire: LahapJewelMixRequestStackSizeEnum.Thirty },
] as const;

export type JewelKind = {
  /** `LahapJewelMixRequest.ItemType`, which is also the server's JewelMix number. */
  wire: LahapJewelMixRequestItemTypeEnum;
  single: { group: number; num: number };
  bundle: { group: number; num: number };
};

/** The jewels that can be bundled, as in the server's `CreateJewelMixes`. */
export const JEWELS: readonly JewelKind[] = [
  { wire: LahapJewelMixRequestItemTypeEnum.JewelOfBless, single: { group: 14, num: 13 }, bundle: { group: 12, num: 30 } },
  { wire: LahapJewelMixRequestItemTypeEnum.JewelOfSoul, single: { group: 14, num: 14 }, bundle: { group: 12, num: 31 } },
  { wire: LahapJewelMixRequestItemTypeEnum.JewelOfLife, single: { group: 14, num: 16 }, bundle: { group: 12, num: 136 } },
  { wire: LahapJewelMixRequestItemTypeEnum.JewelOfCreation, single: { group: 14, num: 22 }, bundle: { group: 12, num: 137 } },
  { wire: LahapJewelMixRequestItemTypeEnum.JewelOfGuardian, single: { group: 14, num: 31 }, bundle: { group: 12, num: 138 } },
  { wire: LahapJewelMixRequestItemTypeEnum.Gemstone, single: { group: 14, num: 41 }, bundle: { group: 12, num: 139 } },
  { wire: LahapJewelMixRequestItemTypeEnum.JewelOfHarmony, single: { group: 14, num: 42 }, bundle: { group: 12, num: 140 } },
  { wire: LahapJewelMixRequestItemTypeEnum.JewelOfChaos, single: { group: 12, num: 15 }, bundle: { group: 12, num: 141 } },
  { wire: LahapJewelMixRequestItemTypeEnum.LowerRefineStone, single: { group: 14, num: 43 }, bundle: { group: 12, num: 142 } },
  { wire: LahapJewelMixRequestItemTypeEnum.HigherRefineStone, single: { group: 14, num: 44 }, bundle: { group: 12, num: 143 } },
];

export type JewelTab = 'combine' | 'disband';

export type BundleEntry = {
  slot: number;
  kind: JewelKind;
  /** How many jewels the bundle holds (`(level + 1) * 10`). */
  pieces: number;
};

/**
 * The jewel bundle window of Lahap (and Jeweler Raul in the Loren Market): the
 * original's "Gem combination / unlock". The server does the work on
 * `LahapJewelMixRequest` and needs the NPC to stay open while it does.
 */
class JewelBundleState {
  open = false;
  tab: JewelTab = 'combine';

  constructor() {
    makeAutoObservable(this);
  }

  /** `NpcWindowResponse(Lahap)`. */
  openWindow(): void {
    runInAction(() => {
      this.open = true;
      this.tab = 'combine';
      Store.inventoryEnabled = true;
    });
  }

  /** The window was closed, or the character left the game. */
  close(notify = true): void {
    if (!this.open) return;
    runInAction(() => {
      this.open = false;
    });
    // OpenMU keeps the player in NpcDialogOpened until told otherwise
    // (TalkNpcAction.cs); without this no other NPC would answer.
    if (notify && !Store.isOffline) {
      Store.sendToGS(CloseNpcRequestPacket.createPacket().buffer);
    }
  }

  setTab(tab: JewelTab): void {
    this.tab = tab;
  }

  /** How many single jewels of that kind the bag holds. */
  count(kind: JewelKind): number {
    let total = 0;
    for (const item of Store.playerData.items) {
      if (item && item.group === kind.single.group && item.num === kind.single.num) total++;
    }
    return total;
  }

  /** The bundles in the bag, by slot. */
  get bundles(): BundleEntry[] {
    const entries: BundleEntry[] = [];
    Store.playerData.items.forEach((item, slot) => {
      if (!item) return;
      const kind = JEWELS.find(
        jewel => jewel.bundle.group === item.group && jewel.bundle.num === item.num
      );
      if (kind) entries.push({ slot, kind, pieces: ((item.lvl ?? 0) + 1) * 10 });
    });
    return entries;
  }

  canCombine(kind: JewelKind, size: number): boolean {
    return (
      this.count(kind) >= size &&
      Store.playerData.money >= (size / 10) * COMBINE_FEE_PER_TEN
    );
  }

  canDisband(): boolean {
    return Store.playerData.money >= DISBAND_FEE;
  }

  combine(kind: JewelKind, wireSize: LahapJewelMixRequestStackSizeEnum): void {
    const packet = LahapJewelMixRequestPacket.createPacket();
    packet.Operation = LahapJewelMixRequestMixTypeEnum.Mix;
    packet.Item = kind.wire;
    packet.MixingStackSize = wireSize;
    Store.sendToGS(packet.buffer);
  }

  disband(entry: BundleEntry): void {
    const packet = LahapJewelMixRequestPacket.createPacket();
    packet.Operation = LahapJewelMixRequestMixTypeEnum.Unmix;
    packet.Item = entry.kind.wire;
    packet.UnmixingSourceSlot = entry.slot;
    Store.sendToGS(packet.buffer);
  }
}

export const JewelBundle = new JewelBundleState();
