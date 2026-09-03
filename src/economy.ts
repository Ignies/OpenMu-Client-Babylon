import { t } from './i18n';
import { makeObservable, observable, action, runInAction } from 'mobx';
import { prefetchItemIcons } from './common/itemIconPack';
import { Store } from './store';
import { Social } from './social';
import type { Item } from './ecs/world';
import { playUiSound } from './libs/sfx';
import {
  CHAOS_CARD_WIRE_STORAGE,
  MIX_SLOTS,
  PERSONAL_SHOP_SLOTS,
  StorageKind,
  TRADE_SLOTS,
  VAULT_SLOTS,
  isPersonalShopBanned,
  localIndexOf,
  wireSlotOf,
} from './common/itemStorage';
import {
  ChaosMachineMixRequestChaosMachineMixTypeEnum,
  ChaosMachineMixRequestPacket,
  CraftingDialogCloseRequestPacket,
  PlayerShopClosePacket,
  PlayerShopCloseOtherPacket,
  PlayerShopItemBuyRequestPacket,
  PlayerShopItemListRequestPacket,
  PlayerShopOpenPacket,
  PlayerShopSetItemPricePacket,
  RemoveVaultPinPacket,
  SetTradeMoneyPacket,
  SetVaultPinPacket,
  TradeButtonStateChangePacket,
  TradeButtonStateEnum,
  TradeCancelPacket,
  TradeRequestPacket,
  TradeRequestResponsePacket,
  UnlockVaultPacket,
  VaultClosedPacket,
  VaultMoveMoneyRequestPacket,
  VaultMoveMoneyRequestVaultMoneyMoveDirectionEnum,
} from './common/packets/ClientToServerPackets';
import {
  ItemCraftingResultCraftingResultEnum,
  PlayerShopBuyResultResultKindEnum,
  TradeFinishedTradeResultEnum,
  VaultProtectionInformationVaultProtectionStateEnum,
} from './common/packets/ServerToClientPackets';

/** The zen the vault charges to open (`RenderText`, NewUIStorageInventory.cpp:227). */
export function vaultOpenCost(level: number, masterLevel: number, locked: boolean): number {
  const total = level + masterLevel;
  let zen = Math.trunc(total * total * 0.04);
  if (locked) zen += level * 2;
  zen = Math.max(1, zen);

  if (zen >= 1000) zen = Math.trunc(zen / 100) * 100;
  else if (zen >= 100) zen = Math.trunc(zen / 10) * 10;

  return zen;
}

/**
 * `MAX_SHOPTITLE` is 36 in the original, but OpenMU's `PlayerShopOpen` is a
 * 30-byte packet with the name in a 26-byte field at index 4
 * (docs/Packets/C3-3F-02-PlayerShopOpen_by-client.md), and the generated
 * `setStoreName` writes one byte per character without a bound: a 27th
 * character wrote past the buffer, threw out of `startSelling`, and the
 * stall never opened - with no error to show for it.
 */
export const MAX_SHOP_TITLE = 26;

/**
 * Crafting numbers the S6 goblin offers that the generated
 * `ChaosMachineMixRequestChaosMachineMixTypeEnum` (OpenMU's packet XML) does
 * not name. Values are OpenMU's `ItemCrafting.Number` for Season 6
 * (`Persistence/Initialization/VersionSeasonSix/ChaosMixes.cs`) - the same
 * numbers the original's `mix.bmd` recipes carry - and go on the wire as
 * `ChaosMachineMixRequest.MixType` unchanged.
 */
const MIX_NUMBER = {
  /** `FirstWingsCrafting`: chaos weapon (+4 or better) + jewel(s) of chaos. */
  firstWings: 11 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
  /** `SecondWingsCrafting`. */
  secondWings: 7 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
  /** `ThirdWingsStage1Crafting` / `ThirdWingsStage2Crafting`. */
  thirdWingsStage1: 38 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
  thirdWingsStage2: 39 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
  /** `CapeCrafting`: Cape of Lord / Cape of Fighter. */
  cape: 24 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
  /** `DinorantCrafting`. */
  dinorant: 5 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
  /** `DarkHorseCrafting` / `DarkRavenCrafting`. */
  darkHorse: 13 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
  darkRaven: 14 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
  /** `FenrirStage1..3Crafting` + `FenrirUpgradeCrafting`. */
  fenrirStage1: 25 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
  fenrirStage2: 26 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
  fenrirStage3: 27 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
  fenrirUpgrade: 28 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
  /** `LifeStoneCrafting`. */
  lifeStone: 17 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
  /** `Small/Medium/LargeShieldPotionCrafting`. */
  shieldPotionSmall: 30 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
  shieldPotionMedium: 31 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
  shieldPotionLarge: 32 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
  /** `BloodCastle` / `DevilSquare` / `IllusionTemple` ticket craftings. */
  bloodCastleTicket: 8 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
  devilSquareTicket: 2 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
  illusionTempleTicket: 37 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
  /** `Level380OptionCrafting` / `SecromiconCrafting`. */
  guardianOption: 36 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
  secromicon: 46 as ChaosMachineMixRequestChaosMachineMixTypeEnum,
} as const;

/** `CChaosMixMenuMsgBox`: what the goblin will attempt with what is inside. */
export type MixMenuEntry = {
  type: ChaosMachineMixRequestChaosMachineMixTypeEnum;
  label: string;
  hint: string;
};

/**
 * Every crafting OpenMU's Season 6 chaos goblin registers (`ChaosMixes.cs`
 * `Initialize`, in that order). The original picks the recipe itself out of
 * `mix.bmd`; that table is not decodable from this Data copy, so the window asks which one to attempt and the server keeps the
 * last word - exactly the information the protocol carries in
 * `ChaosMachineMixRequest.MixType`. Elphis' Gemstone refinery (number 33 on
 * the S6 server; the generated enum's `GemstoneRefinery` says 41) is not a
 * goblin mix and is deliberately not listed.
 */
export const MIX_MENU: MixMenuEntry[] = [
  {
    type: ChaosMachineMixRequestChaosMachineMixTypeEnum.ChaosWeapon,
    label: 'Chaos weapon',
    hint: 'Weapon + Jewel of Chaos (+ Bless / Soul)',
  },
  {
    type: ChaosMachineMixRequestChaosMachineMixTypeEnum.FruitCreation,
    label: 'Fruit',
    hint: 'Jewel of Creation + Jewel of Life',
  },
  {
    type: MIX_NUMBER.dinorant,
    label: 'Dinorant',
    hint: '10 Horns of Uniria + Jewel of Chaos',
  },
  {
    type: ChaosMachineMixRequestChaosMachineMixTypeEnum.PotionOfBless,
    label: 'Potion of Bless',
    hint: 'Jewel of Bless',
  },
  {
    type: ChaosMachineMixRequestChaosMachineMixTypeEnum.PotionOfSoul,
    label: 'Potion of Soul',
    hint: 'Jewel of Soul',
  },
  {
    type: ChaosMachineMixRequestChaosMachineMixTypeEnum.UpgradeItemLevelTo10,
    label: 'Upgrade to +10',
    hint: '+9 item + Chaos + Bless + Soul',
  },
  {
    type: ChaosMachineMixRequestChaosMachineMixTypeEnum.UpgradeItemLevelTo11,
    label: 'Upgrade to +11',
    hint: '+10 item + Chaos + Bless + Soul',
  },
  {
    type: ChaosMachineMixRequestChaosMachineMixTypeEnum.UpgradeItemLevelTo12,
    label: 'Upgrade to +12',
    hint: '+11 item + Chaos + Bless + Soul + Creation',
  },
  {
    type: ChaosMachineMixRequestChaosMachineMixTypeEnum.UpgradeItemLevelTo13,
    label: 'Upgrade to +13',
    hint: '+12 item + Chaos + Bless + Soul + Creation',
  },
  {
    type: ChaosMachineMixRequestChaosMachineMixTypeEnum.UpgradeItemLevelTo14,
    label: 'Upgrade to +14',
    hint: '+13 item + Chaos + Bless + Soul + Creation',
  },
  {
    type: ChaosMachineMixRequestChaosMachineMixTypeEnum.UpgradeItemLevelTo15,
    label: 'Upgrade to +15',
    hint: '+14 item + Chaos + Bless + Soul + Creation',
  },
  {
    type: MIX_NUMBER.bloodCastleTicket,
    label: 'Cloak of Invisibility',
    hint: 'Blood Bone + Scroll of Archangel + Jewel of Chaos',
  },
  {
    type: MIX_NUMBER.devilSquareTicket,
    label: "Devil's Invitation",
    hint: "Devil's Eye + Devil's Key + Jewel of Chaos",
  },
  {
    type: MIX_NUMBER.illusionTempleTicket,
    label: 'Illusion Temple ticket',
    hint: 'Old Scroll + Illusion Sorcerer Covenant + Jewel of Chaos',
  },
  {
    type: MIX_NUMBER.lifeStone,
    label: 'Life Stone',
    hint: '5 Guardian + 5 Bless + 5 Soul + Chaos + Creation',
  },
  {
    type: MIX_NUMBER.shieldPotionSmall,
    label: 'Small Shield Potion',
    hint: '3 Small Healing Potions + Jewel of Bless',
  },
  {
    type: MIX_NUMBER.shieldPotionMedium,
    label: 'Medium Shield Potion',
    hint: '3 Healing Potions + Jewel of Bless',
  },
  {
    type: MIX_NUMBER.shieldPotionLarge,
    label: 'Large Shield Potion',
    hint: '3 Large Healing Potions + Jewel of Bless',
  },
  {
    type: MIX_NUMBER.fenrirStage1,
    label: 'Fenrir, stage 1',
    hint: '20 Pieces of Horn + 5 Claws of Beast + Jewel of Chaos',
  },
  {
    type: MIX_NUMBER.fenrirStage2,
    label: 'Fenrir, stage 2',
    hint: '10 Broken Horns + 5 Claws of Beast + Jewel of Chaos',
  },
  {
    type: MIX_NUMBER.fenrirStage3,
    label: 'Fenrir, stage 3',
    hint: 'Broken Horn + 3 Jewels of Life + Jewel of Chaos',
  },
  {
    type: MIX_NUMBER.fenrirUpgrade,
    label: 'Fenrir upgrade',
    hint: 'Horn of Fenrir + 5 Bless + 5 Soul + Chaos + weapon / armour',
  },
  {
    type: MIX_NUMBER.firstWings,
    label: '1st level wings',
    hint: 'Chaos weapon (+4 or better) + Jewel(s) of Chaos',
  },
  {
    type: MIX_NUMBER.cape,
    label: 'Cape of Lord / Fighter',
    hint: '1st wings + Crest of Monarch + Jewel of Chaos',
  },
  {
    type: MIX_NUMBER.secondWings,
    label: '2nd level wings',
    hint: "1st wings + Loch's Feather + Jewel of Chaos (+ excellent item)",
  },
  {
    type: MIX_NUMBER.thirdWingsStage1,
    label: '3rd level wings, stage 1',
    hint: '2nd wings / cape + ancient item + Chaos + 5 Bless + 5 Soul',
  },
  {
    type: MIX_NUMBER.thirdWingsStage2,
    label: '3rd level wings, stage 2',
    hint: 'Flame of Condor + Feather of Condor + excellent item + Chaos',
  },
  {
    type: MIX_NUMBER.guardianOption,
    label: 'Guardian option (level 380)',
    hint: 'Level 380 item + Jewel of Harmony + Jewel of Guardian',
  },
  {
    type: MIX_NUMBER.secromicon,
    label: 'Complete Secromicon',
    hint: 'The six Secromicon fragments + Jewel of Chaos',
  },
  {
    type: MIX_NUMBER.darkHorse,
    label: 'Dark Horse',
    hint: 'Spirit of Dark Horse + 5 Bless + 5 Soul + Chaos + Creation',
  },
  {
    type: MIX_NUMBER.darkRaven,
    label: 'Dark Raven',
    hint: 'Spirit of Dark Raven + 5 Bless + 5 Soul + Chaos + Creation',
  },
];

export type TradePartner = { name: string; level: number; guildId: number };

export type ShopStock = { slot: number; item: Item; price: number };

export type ShopBrowse = {
  playerId: number;
  playerName: string;
  shopName: string;
  items: (ShopStock | null)[];
};

/** Which one-shot prompt is up; only one at a time, like the original's msg box. */
export type EconomyPrompt =
  | { kind: 'vault-deposit' }
  | { kind: 'vault-withdraw' }
  | { kind: 'vault-unlock' }
  | { kind: 'vault-set-pin' }
  | { kind: 'vault-remove-pin' }
  | { kind: 'trade-money' }
  | { kind: 'shop-price'; slot: number }
  | { kind: 'shop-buy'; slot: number };

const emptyGrid = (size: number) => new Array<Item | null>(size).fill(null);

/**
 * The four economy windows - vault (`CNewUIStorageInventory`),
 * chaos machine (`CNewUIMixInventory`), trade (`CNewUITrade`) and the
 * personal shop (`CNewUIMyShopInventory` / `CNewUIPurchaseShopInventory`).
 *
 * They live beside `Store` the way `Social` does: `Store` owns the hero's
 * inventory and the shared picked-item cursor, this owns the grids that only
 * exist while one of these windows is open. `Store.itemsOfStorage` resolves a
 * `StorageKind` to one of them, so the pick / place / move code is written
 * once and knows nothing about which window is up.
 */
export const Economy = new (class _Economy {
  // ---- vault (CNewUIStorageInventory) --------------------------------------

  vaultOpen = false;
  vaultItems: (Item | null)[] = emptyGrid(VAULT_SLOTS);
  vaultMoney = 0;
  /** `m_bLock`: a pin is set on the vault. */
  vaultLocked = false;
  /** `m_bCorrectPassword`: the pin was entered this session. */
  vaultUnlocked = false;

  // ---- chaos machine (CNewUIMixInventory) ----------------------------------

  mixOpen = false;
  mixItems: (Item | null)[] = emptyGrid(MIX_SLOTS);
  mixType: ChaosMachineMixRequestChaosMachineMixTypeEnum =
    ChaosMachineMixRequestChaosMachineMixTypeEnum.ChaosWeapon;
  /** `MIX_REQUESTED`: the request is out, both grids are locked. */
  mixPending = false;
  /** `MIX_FINISHED`: what the last attempt did, for the result line. */
  mixResult: 'success' | 'failed' | null = null;
  /**
   * Which NPC owns the tray: the goblin (`MIXTYPE_GOBLIN_*`) or the Chaos
   * Card Master (`MIXTYPE_CHAOS_CARD`, same window in the original's
   * `CNewUIMixInventory`). Decides the storage byte the move packets carry.
   */
  mixKind: 'chaosMachine' | 'chaosCard' = 'chaosMachine';

  // ---- trade (CNewUITrade) -------------------------------------------------

  tradeOpen = false;
  myTradeItems: (Item | null)[] = emptyGrid(TRADE_SLOTS);
  yourTradeItems: (Item | null)[] = emptyGrid(TRADE_SLOTS);
  myTradeMoney = 0;
  yourTradeMoney = 0;
  myTradeConfirm = false;
  yourTradeConfirm = false;
  tradePartner: TradePartner | null = null;
  /** `CTradeMsgBoxLayout`: someone asked us to trade. */
  tradeRequest: { name: string } | null = null;
  private pendingTradeMoney = 0;

  // ---- personal shop (CNewUIMyShopInventory) -------------------------------

  myShopOpen = false;
  /**
   * The 8×4 store grid. In OpenMU the store lives inside the inventory at
   * `FirstStoreItemSlotIndex`, so a move into it is an ordinary
   * `ItemMoveRequest` with `ToStorage = MYSHOP`.
   */
  myShopItems: (Item | null)[] = emptyGrid(PERSONAL_SHOP_SLOTS);
  myShopPrices: number[] = new Array<number>(PERSONAL_SHOP_SLOTS).fill(0);
  myShopName = '';
  /** `m_EnablePersonalShop`: the stall is up and other players can browse. */
  myShopSelling = false;

  /** `PlayerShops` (0x3F 0x00): the titles floating over players in scope. */
  readonly shopTitles = observable.map<number, string>();

  /** `CNewUIPurchaseShopInventory`: another player's stall we are looking at. */
  browsing: ShopBrowse | null = null;

  prompt: EconomyPrompt | null = null;

  constructor() {
    makeObservable(this, {
      vaultOpen: observable,
      vaultItems: observable,
      vaultMoney: observable,
      vaultLocked: observable,
      vaultUnlocked: observable,
      mixOpen: observable,
      mixItems: observable,
      mixType: observable,
      mixPending: observable,
      mixResult: observable,
      mixKind: observable,
      tradeOpen: observable,
      myTradeItems: observable,
      yourTradeItems: observable,
      myTradeMoney: observable,
      yourTradeMoney: observable,
      myTradeConfirm: observable,
      yourTradeConfirm: observable,
      tradePartner: observable,
      tradeRequest: observable,
      myShopOpen: observable,
      myShopItems: observable,
      myShopPrices: observable,
      myShopName: observable,
      myShopSelling: observable,
      browsing: observable,
      prompt: observable,
      reset: action,
    });

  }

  /** Everything here belongs to the character: cleared on select / relog. */
  reset(): void {
    this.vaultOpen = false;
    this.vaultItems = emptyGrid(VAULT_SLOTS);
    this.vaultMoney = 0;
    this.vaultLocked = false;
    this.vaultUnlocked = false;
    this.mixOpen = false;
    this.mixItems = emptyGrid(MIX_SLOTS);
    this.mixPending = false;
    this.mixResult = null;
    this.mixKind = 'chaosMachine';
    this.closeTradeState();
    this.myShopOpen = false;
    this.myShopItems = emptyGrid(PERSONAL_SHOP_SLOTS);
    this.myShopPrices = new Array<number>(PERSONAL_SHOP_SLOTS).fill(0);
    this.myShopName = '';
    this.myShopSelling = false;
    this.shopTitles.clear();
    this.browsing = null;
    this.prompt = null;
  }

  /** Any of the four windows is up: the inventory has to stay open with it. */
  get anyWindowOpen(): boolean {
    return this.vaultOpen || this.mixOpen || this.tradeOpen || this.myShopOpen;
  }

  /**
   * Where a right click in the inventory sends an item
   * (`ProcessMyInvenItemAutoMove`), or null when no storage window is up.
   * Only one can be open at a time in practice; the order matches the
   * original's `IsVisible` checks.
   */
  get autoMoveTarget(): StorageKind | null {
    if (this.tradeOpen) return StorageKind.Trade;
    if (this.vaultOpen) return StorageKind.Vault;
    if (this.mixOpen) return StorageKind.ChaosMachine;
    if (this.myShopOpen) return StorageKind.PersonalShop;
    return null;
  }

  closePrompt(): void {
    runInAction(() => {
      this.prompt = null;
    });
  }

  openPrompt(prompt: EconomyPrompt): void {
    runInAction(() => {
      this.prompt = prompt;
    });
  }

  /**
   * `CNewUIInventoryCtrl::BackupPickedItem`: a window that goes away must not
   * leave an item from its grid hanging off the cursor.
   */
  private returnPickedFrom(storage: StorageKind): void {
    if (Store.pickedItem?.fromStorage !== storage) return;
    Store.cancelPickedItem();
  }

  // =========================================================================
  // Vault
  // =========================================================================

  /** `NpcWindowResponse(VaultStorage)`: the warehouse opens next to the bag. */
  openVault(): void {
    runInAction(() => {
      this.vaultOpen = true;
      this.vaultUnlocked = false;
      Store.inventoryEnabled = true;
    });
    playUiSound('window');
  }

  setVaultItems(entries: { slot: number; item: Item }[]): void {
    runInAction(() => {
      const items = emptyGrid(VAULT_SLOTS);
      for (const entry of entries) {
        if (entry.slot >= 0 && entry.slot < VAULT_SLOTS) items[entry.slot] = entry.item;
      }
      this.vaultItems = items;
    });
    prefetchItemIcons(this.vaultItems);
  }

  /** `ProcessToReceiveStorageStatus` (NewUIStorageInventory.cpp:283). */
  vaultProtectionState(state: VaultProtectionInformationVaultProtectionStateEnum): void {
    const E = VaultProtectionInformationVaultProtectionStateEnum;

    runInAction(() => {
      switch (state) {
        case E.Unprotected:
          this.vaultLocked = false;
          this.vaultUnlocked = false;
          break;
        case E.Locked:
          this.vaultLocked = true;
          this.vaultUnlocked = false;
          break;
        case E.UnlockFailedByWrongPin:
          Store.addNotification(t('notify.wrongVaultPin'), 'error');
          break;
        case E.SetPinFailedBecauseLock:
          Store.addNotification(t('notify.unlockBeforePin'), 'error');
          break;
        case E.Unlocked:
          this.vaultLocked = true;
          this.vaultUnlocked = true;
          break;
        case E.RemovePinFailedByWrongPassword:
          Store.addNotification(t('notify.wrongPassword'), 'error');
          break;
      }
    });
  }

  /**
   * `ProcessClosing`: `SendVaultClosed` and drop the grid. `notify` is false
   * when the server told us it closed (the 0x82 answer), so the confirmation
   * is not bounced straight back at it.
   */
  closeVault(notify = true): void {
    if (!this.vaultOpen) return;

    this.returnPickedFrom(StorageKind.Vault);

    if (notify && !Store.isOffline) {
      Store.sendToGS(VaultClosedPacket.createPacket().buffer);
    }

    runInAction(() => {
      this.vaultOpen = false;
      this.vaultItems = emptyGrid(VAULT_SLOTS);
      this.vaultUnlocked = false;
      if (this.prompt?.kind.startsWith('vault-')) this.prompt = null;
    });
  }

  /** Whether a vault action may go out (`IsStorageLocked() || IsCorrectPassword()`). */
  get vaultUsable(): boolean {
    return !this.vaultLocked || this.vaultUnlocked;
  }

  /** `CZenReceiptMsgBoxLayout` / `CZenPaymentMsgBoxLayout`. */
  moveVaultMoney(amount: number, toVault: boolean): void {
    if (!this.vaultOpen || amount <= 0) return;

    if (!this.vaultUsable) {
      Store.addNotification(t('notify.unlockVaultFirst'), 'error');
      this.openPrompt({ kind: 'vault-unlock' });
      return;
    }

    const available = toVault ? Store.playerData.money : this.vaultMoney;
    if (amount > available) {
      Store.addNotification(t('common.notEnoughZen'), 'error');
      return;
    }

    if (Store.isOffline) {
      runInAction(() => {
        if (toVault) {
          Store.playerData.money -= amount;
          this.vaultMoney += amount;
        } else {
          this.vaultMoney -= amount;
          Store.playerData.money += amount;
        }
      });
      playUiSound('dropMoney');
      return;
    }

    const packet = VaultMoveMoneyRequestPacket.createPacket();
    packet.Direction = toVault
      ? VaultMoveMoneyRequestVaultMoneyMoveDirectionEnum.InventoryToVault
      : VaultMoveMoneyRequestVaultMoneyMoveDirectionEnum.VaultToInventory;
    packet.Amount = amount;
    Store.sendToGS(packet.buffer);
  }

  /** `VaultMoneyUpdate` (0x81). */
  vaultMoneyUpdate(success: boolean, vaultMoney: number, inventoryMoney: number): void {
    if (!success) {
      Store.addNotification(t('notify.zenNotMoved'), 'error');
      return;
    }

    runInAction(() => {
      this.vaultMoney = vaultMoney;
      Store.playerData.money = inventoryMoney;
    });
    playUiSound('dropMoney');
  }

  /** `CStorageUnlockMsgBoxLayout`: the numeric pin pad. */
  unlockVault(pin: number): void {
    if (Store.isOffline) {
      runInAction(() => {
        this.vaultUnlocked = true;
      });
      return;
    }

    const packet = UnlockVaultPacket.createPacket();
    packet.Pin = pin;
    Store.sendToGS(packet.buffer);
  }

  /** `CStorageLockKeyPadMsgBoxLayout`: a new pin needs the account password. */
  setVaultPin(pin: number, password: string): void {
    if (Store.isOffline) return;

    const packet = SetVaultPinPacket.createPacket();
    packet.Pin = pin;
    packet.setPassword(password, 20);
    Store.sendToGS(packet.buffer);
  }

  removeVaultPin(password: string): void {
    if (Store.isOffline) return;

    const packet = RemoveVaultPinPacket.createPacket();
    packet.setPassword(password, 20);
    Store.sendToGS(packet.buffer);
  }

  // =========================================================================
  // Chaos machine
  // =========================================================================

  /** `NpcWindowResponse(ChaosMachine / ChaosCardCombination)` → `OpeningProcess`. */
  openMix(kind: 'chaosMachine' | 'chaosCard' = 'chaosMachine'): void {
    runInAction(() => {
      this.mixOpen = true;
      this.mixKind = kind;
      this.mixItems = emptyGrid(MIX_SLOTS);
      this.mixPending = false;
      this.mixResult = null;
      Store.inventoryEnabled = true;
    });
    playUiSound('window');
  }

  /**
   * The `ItemMoveRequest` storage byte of the open tray: the shared local
   * model is `StorageKind.ChaosMachine`, but the Chaos Card Master's window
   * moves items under `CHAOS_CARD_WIRE_STORAGE` (OpenMU only allows storage
   * 9 while the ChaosCardCombination window is the open one).
   */
  get mixWireStorage(): number {
    return this.mixKind === 'chaosCard'
      ? CHAOS_CARD_WIRE_STORAGE
      : StorageKind.ChaosMachine;
  }

  setMixItems(entries: { slot: number; item: Item }[]): void {
    runInAction(() => {
      const items = emptyGrid(MIX_SLOTS);
      for (const entry of entries) {
        if (entry.slot >= 0 && entry.slot < MIX_SLOTS) items[entry.slot] = entry.item;
      }
      this.mixItems = items;
    });
    prefetchItemIcons(this.mixItems);
  }

  setMixType(type: ChaosMachineMixRequestChaosMachineMixTypeEnum): void {
    runInAction(() => {
      this.mixType = type;
      this.mixResult = null;
    });
  }

  /**
   * `ClosingProcess`: the goblin refuses to close while items are still in
   * the tray, so they cannot be lost. `notify` is false when the server told
   * us it closed (0x87), which also overrides the refusal - the tray is gone
   * on its side either way.
   */
  closeMix(notify = true): boolean {
    if (!this.mixOpen) return true;

    if (!notify) this.returnPickedFrom(StorageKind.ChaosMachine);

    // Only what is in - or was lifted out of - the tray blocks the close; a
    // jewel carried from the inventory (one a refused upgrade left on the
    // cursor, say) is not the goblin's business.
    const pickedFromTray = Store.pickedItem?.fromStorage === StorageKind.ChaosMachine;
    if (notify && (this.mixItems.some(Boolean) || pickedFromTray)) {
      Social.errorMessage('Take your items out of the chaos machine first.');
      return false;
    }

    if (notify && !Store.isOffline) {
      Store.sendToGS(CraftingDialogCloseRequestPacket.createPacket().buffer);
    }

    runInAction(() => {
      this.mixOpen = false;
      this.mixItems = emptyGrid(MIX_SLOTS);
      this.mixPending = false;
      this.mixResult = null;
    });
    return true;
  }

  /** The mix button (`CNewUIMixInventory::Mix`). */
  mix(): void {
    if (!this.mixOpen || this.mixPending) return;

    if (!this.mixItems.some(Boolean)) {
      Social.errorMessage('Put the items to combine into the chaos machine.');
      return;
    }

    if (Store.isOffline) {
      Store.addNotification(t('notify.chaosNeedsServer'), 'info');
      return;
    }

    const packet = ChaosMachineMixRequestPacket.createPacket();
    // The card master has no crafting menu; OpenMU resolves the mix against
    // the opened NPC's craftings, so 0 asks for whatever a server configured
    // there (none by default - the mix then answers IncorrectMixItems).
    packet.MixType =
      this.mixKind === 'chaosCard'
        ? (0 as ChaosMachineMixRequestChaosMachineMixTypeEnum)
        : this.mixType;
    packet.SocketSlot = 0;
    Store.sendToGS(packet.buffer);

    runInAction(() => {
      this.mixPending = true;
      this.mixResult = null;
    });
  }

  /** `ItemCraftingResult` (0x86). */
  craftingResult(
    result: ItemCraftingResultCraftingResultEnum,
    item: Item | null
  ): void {
    const E = ItemCraftingResultCraftingResultEnum;

    runInAction(() => {
      this.mixPending = false;
      this.mixItems = emptyGrid(MIX_SLOTS);
      this.mixResult = result === E.Success ? 'success' : 'failed';
      if (result === E.Success && item) this.mixItems[0] = item;
    });

    if (result === E.Success) {
      playUiSound('mix');
      Social.systemMessage('The combination succeeded.');
      return;
    }

    playUiSound('mixFailed');

    const reason: Partial<Record<ItemCraftingResultCraftingResultEnum, string>> = {
      [E.Failed]: 'The combination failed.',
      [E.NotEnoughMoney]: 'Not enough Zen for the combination.',
      [E.TooManyItems]: 'Too many items in the chaos machine.',
      [E.CharacterLevelTooLow]: 'Your level is too low for this combination.',
      [E.LackingMixItems]: 'Some items for this combination are missing.',
      [E.IncorrectMixItems]: 'These items cannot be combined that way.',
      [E.InvalidItemLevel]: 'The item level is wrong for this combination.',
      [E.CharacterClassTooLow]: 'Your class cannot make this combination.',
      [E.IncorrectBloodCastleItems]: 'The Blood Castle items are not correct.',
      [E.NotEnoughMoneyForBloodCastle]: 'Not enough Zen for the invitation.',
    };

    Social.errorMessage(reason[result] ?? 'The combination failed.');
  }

  // =========================================================================
  // Trade
  // =========================================================================

  private closeTradeState(): void {
    this.returnPickedFrom(StorageKind.Trade);
    this.tradeOpen = false;
    this.myTradeItems = emptyGrid(TRADE_SLOTS);
    this.yourTradeItems = emptyGrid(TRADE_SLOTS);
    this.myTradeMoney = 0;
    this.yourTradeMoney = 0;
    this.myTradeConfirm = false;
    this.yourTradeConfirm = false;
    this.tradePartner = null;
    this.tradeRequest = null;
    this.pendingTradeMoney = 0;
    if (this.prompt?.kind === 'trade-money') this.prompt = null;
  }

  /** `SendTradeRequest`: ask the player under the cursor for a trade. */
  requestTrade(target: { netId: number; name: string }): void {
    if (this.tradeOpen) {
      Social.errorMessage('You are already trading.');
      return;
    }
    if (this.vaultOpen || this.mixOpen || this.myShopOpen) {
      // `IsImpossibleTradeInterface`.
      Social.errorMessage('Close the other windows before trading.');
      return;
    }

    const packet = TradeRequestPacket.createPacket();
    packet.PlayerId = target.netId;
    Store.sendToGS(packet.buffer);
    Social.systemMessage(`Trade request sent to ${target.name}.`);
  }

  /** `ProcessToReceiveTradeRequest`. */
  incomingTradeRequest(name: string): void {
    if (this.tradeOpen || this.vaultOpen || this.mixOpen || this.myShopOpen) {
      this.answerTradeRequest(false);
      return;
    }
    runInAction(() => {
      this.tradeRequest = { name };
    });
  }

  answerTradeRequest(accepted: boolean): void {
    const packet = TradeRequestResponsePacket.createPacket();
    packet.TradeAccepted = accepted;
    Store.sendToGS(packet.buffer);
    runInAction(() => {
      this.tradeRequest = null;
    });
  }

  /** `TradeRequestAnswer` (0x37): the window opens once both sides agreed. */
  openTrade(partner: TradePartner): void {
    runInAction(() => {
      this.closeTradeState();
      this.tradeOpen = true;
      this.tradePartner = partner;
      Store.inventoryEnabled = true;
    });
    playUiSound('window');
  }

  /** `ProcessToReceiveYourItemAdd` / `…Delete` (0x39 / 0x38). */
  setYourTradeItem(slot: number, item: Item | null): void {
    if (slot < 0 || slot >= TRADE_SLOTS) return;

    prefetchItemIcons([item]);
    runInAction(() => {
      this.yourTradeItems[slot] = item;
      // Any change on either side clears both accept marks on the server;
      // mirror that so the button is not shown checked by mistake.
      this.myTradeConfirm = false;
      this.yourTradeConfirm = false;
    });
    playUiSound('getItem');
  }

  /** The zen field (`CTradeZenMsgBoxLayout` → `SendSetTradeMoney`). */
  setTradeMoney(amount: number): void {
    if (!this.tradeOpen) return;

    if (amount > Store.playerData.money + this.myTradeMoney) {
      Store.addNotification(t('notify.notThatMuchZen'), 'error');
      return;
    }

    if (this.myTradeConfirm) this.setMyConfirm(false);

    this.pendingTradeMoney = amount;

    const packet = SetTradeMoneyPacket.createPacket();
    packet.Amount = amount;
    Store.sendToGS(packet.buffer);
  }

  /** `TradeMoneySetResponse` (0x3A 0x01). */
  tradeMoneyAccepted(): void {
    runInAction(() => {
      this.myTradeMoney = this.pendingTradeMoney;
    });
  }

  /** `TradeMoneyUpdate` (0x3B): the partner's amount. */
  partnerTradeMoney(amount: number): void {
    runInAction(() => {
      this.yourTradeMoney = amount;
      this.myTradeConfirm = false;
      this.yourTradeConfirm = false;
    });
  }

  /** `AlertTrade`: our own accept checkbox. */
  setMyConfirm(checked: boolean): void {
    if (!this.tradeOpen) return;

    runInAction(() => {
      this.myTradeConfirm = checked;
    });

    const packet = TradeButtonStateChangePacket.createPacket();
    packet.NewState = checked
      ? TradeButtonStateEnum.Checked
      : TradeButtonStateEnum.Unchecked;
    Store.sendToGS(packet.buffer);
  }

  toggleMyConfirm(): void {
    if (Store.pickedItem) return;
    this.setMyConfirm(!this.myTradeConfirm);
  }

  /** `ProcessToReceiveYourConfirm` (0x3C). */
  partnerConfirm(state: number): void {
    runInAction(() => {
      switch (state) {
        case 0:
          this.yourTradeConfirm = false;
          break;
        case 1:
          this.yourTradeConfirm = true;
          break;
        case 2:
          // Red: the partner changed something, both marks drop.
          this.myTradeConfirm = false;
          this.yourTradeConfirm = false;
          break;
      }
    });
    playUiSound('click');
  }

  /** The X / Escape (`ProcessCloseBtn` → `SendTradeCancel`). */
  cancelTrade(): void {
    if (!this.tradeOpen) return;
    if (Store.pickedItem) return;

    Store.sendToGS(TradeCancelPacket.createPacket().buffer);
  }

  /** `TradeFinished` (0x3D): the window always closes, the reason varies. */
  tradeFinished(result: TradeFinishedTradeResultEnum): void {
    const E = TradeFinishedTradeResultEnum;

    switch (result) {
      case E.Success:
        Social.systemMessage('The trade was completed.');
        playUiSound('getItem');
        break;
      case E.Cancelled:
        Social.errorMessage('The trade was cancelled.');
        break;
      case E.FailedByFullInventory:
        Social.errorMessage('The trade failed: not enough room.');
        break;
      case E.TimedOut:
        Social.errorMessage('The trade timed out.');
        break;
      case E.FailedByItemsNotAllowedToTrade:
        Social.errorMessage('The trade failed: an item may not be traded.');
        break;
    }

    runInAction(() => {
      this.closeTradeState();
    });
  }

  // =========================================================================
  // Personal shop
  // =========================================================================

  /** The inventory's shop button (`CNewUIMyShopInventory`). */
  toggleMyShop(): void {
    if (this.myShopOpen) {
      this.closeMyShop();
      return;
    }

    if (Store.playerData.level < 6) {
      Social.errorMessage('A personal shop needs character level 6.');
      return;
    }

    runInAction(() => {
      this.myShopOpen = true;
      Store.inventoryEnabled = true;
    });
    playUiSound('window');
  }

  closeMyShop(): void {
    this.returnPickedFrom(StorageKind.PersonalShop);

    runInAction(() => {
      this.myShopOpen = false;
      if (this.prompt?.kind === 'shop-price') this.prompt = null;
    });
  }

  /**
   * The wire slot of a store square. OpenMU keeps the personal store inside
   * the inventory storage right after the four extensions, so a price is set
   * on `FirstStoreItemSlotIndex + square`.
   */
  shopSlotOf(square: number): number {
    return wireSlotOf(StorageKind.PersonalShop, square);
  }

  /** `SendPlayerShopSetItemPrice`. */
  setItemPrice(square: number, price: number): void {
    if (square < 0 || square >= PERSONAL_SHOP_SLOTS) return;

    const item = this.myShopItems[square];
    if (!item) return;

    if (isPersonalShopBanned(item)) {
      Social.errorMessage('This item cannot be sold in a shop.');
      return;
    }

    if (price < 0) {
      Store.addNotification(t('notify.negativePrice'), 'error');
      return;
    }

    // The price only sticks while the stall is closed (`Works only if the
    // shop is currently closed.`), so take it down first.
    if (this.myShopSelling) this.stopSelling();

    runInAction(() => {
      this.myShopPrices[square] = price;
    });

    if (Store.isOffline) return;

    const packet = PlayerShopSetItemPricePacket.createPacket();
    packet.ItemSlot = this.shopSlotOf(square);
    packet.Price = price;
    Store.sendToGS(packet.buffer);
  }

  /**
   * An `ItemMoved` landed on a shop square: it goes on sale unpriced, and
   * the original pops the price box straight away (`MyShopInventoryProcess`
   * → `CPersonalShopItemValueMsgBoxLayout`).
   */
  stockedShopSquare(square: number): void {
    if (square < 0 || square >= PERSONAL_SHOP_SLOTS) return;

    runInAction(() => {
      this.myShopPrices[square] = 0;
      if (this.myShopOpen && this.myShopItems[square]) {
        this.prompt = { kind: 'shop-price', slot: square };
      }
    });
  }

  /** `PlayerShopSetItemPriceResponse` (0x3F 0x01). */
  itemPriceResult(inventorySlot: number, ok: boolean, reason: string): void {
    if (ok) return;

    const square = localIndexOf(StorageKind.PersonalShop, inventorySlot);
    runInAction(() => {
      if (square >= 0 && square < PERSONAL_SHOP_SLOTS) this.myShopPrices[square] = 0;
    });
    Social.errorMessage(reason);
  }

  /** Every square holding an item needs a price before the stall may open. */
  get shopHasUnpricedItems(): boolean {
    return this.myShopItems.some(
      (item, square) => !!item && this.myShopPrices[square] <= 0
    );
  }

  /** `SendPlayerShopOpen`. */
  startSelling(name: string): void {
    const title = name.trim().slice(0, MAX_SHOP_TITLE);

    if (!title) {
      Social.errorMessage('Give your shop a name first.');
      return;
    }
    if (!this.myShopItems.some(Boolean)) {
      Social.errorMessage('Put something up for sale first.');
      return;
    }
    if (this.shopHasUnpricedItems) {
      Social.errorMessage('Every item in the shop needs a price.');
      return;
    }

    runInAction(() => {
      this.myShopName = title;
    });

    if (Store.isOffline) {
      runInAction(() => {
        this.myShopSelling = true;
      });
      this.showHeroShopTitle();
      return;
    }

    const packet = PlayerShopOpenPacket.createPacket();
    packet.setStoreName(title, 26);
    Store.sendToGS(packet.buffer);
  }

  /**
   * `AddShopTitle(Hero->Key, Hero, g_szPersonalShopTitle)`
   * (WSclient.cpp:8696): the hero puts his own stall title up. The server's
   * `PlayerShops` list only goes to the players *around* the seller, so
   * without this the one person who cannot see the stall is its owner.
   */
  private showHeroShopTitle(): void {
    if (Store.playerId === undefined) return;
    this.setShopTitle(Store.playerId, this.myShopName);
  }

  /** `RemoveShopTitle(Hero)`: the stall is down. */
  private hideHeroShopTitle(): void {
    if (Store.playerId === undefined) return;
    this.setShopTitle(Store.playerId, null);
  }

  /** `SendPlayerShopClose`. */
  stopSelling(): void {
    runInAction(() => {
      this.myShopSelling = false;
    });
    this.hideHeroShopTitle();

    if (Store.isOffline) return;

    Store.sendToGS(PlayerShopClosePacket.createPacket().buffer);
  }

  /** `PlayerShopClosed` for the hero: the stall is down, nothing to send. */
  sellingStopped(): void {
    runInAction(() => {
      this.myShopSelling = false;
    });
    this.hideHeroShopTitle();
  }

  /** `PlayerShopOpenSuccessful` (0x3F 0x02). */
  sellingStarted(success: boolean): void {
    if (!success) {
      Social.errorMessage('The shop could not be opened.');
      return;
    }

    // `ChangePersonal(true)` (WSclient.cpp:8695) only relabels the buttons:
    // the original leaves the window up, showing GlobalText[1103] and the
    // now-live Close button. Closing it here left the stall with no UI at
    // all - and, with no title over the hero, no sign it was up.
    runInAction(() => {
      this.myShopSelling = true;
    });
    this.showHeroShopTitle();
    Social.systemMessage('Your shop is open.');
  }

  /** `PlayerShopItemSoldToPlayer` (0x3F 0x08). */
  itemSold(inventorySlot: number, buyer: string): void {
    const square = localIndexOf(StorageKind.PersonalShop, inventorySlot);

    runInAction(() => {
      if (square >= 0 && square < PERSONAL_SHOP_SLOTS) {
        this.myShopItems[square] = null;
        this.myShopPrices[square] = 0;
      }
    });

    playUiSound('dropMoney');
    Social.systemMessage(`${buyer} bought an item from your shop.`);
  }

  /** `PlayerShops` (0x3F 0x00) / `PlayerShopClosed` (0x3F 0x03). */
  setShopTitle(playerId: number, title: string | null): void {
    if (title) this.shopTitles.set(playerId, title);
    else this.shopTitles.delete(playerId);
  }

  // ---- browsing someone else's stall --------------------------------------

  /** `SendPlayerShopItemListRequest`: click a player wearing a shop title. */
  browseShop(target: { netId: number; name: string }): void {
    if (this.tradeOpen) return;

    const packet = PlayerShopItemListRequestPacket.createPacket();
    packet.PlayerId = target.netId;
    packet.setPlayerName(target.name, 10);
    Store.sendToGS(packet.buffer);
  }

  /** `PlayerShopItemList` (0x3F 0x05). */
  showShop(browse: ShopBrowse): void {
    const wasOpen = this.browsing?.playerId === browse.playerId;

    prefetchItemIcons(browse.items.map(stock => stock?.item));
    runInAction(() => {
      this.browsing = browse;
    });

    if (!wasOpen) playUiSound('window');
  }

  closeBrowsedShop(): void {
    const browse = this.browsing;
    if (!browse) return;

    if (!Store.isOffline) {
      const packet = PlayerShopCloseOtherPacket.createPacket();
      packet.PlayerId = browse.playerId;
      packet.setPlayerName(browse.playerName, 10);
      Store.sendToGS(packet.buffer);
    }

    runInAction(() => {
      this.browsing = null;
    });
  }

  /** The dialog the server closes for us (`ClosePlayerShopDialog`). */
  dropBrowsedShop(playerId: number): void {
    if (this.browsing?.playerId !== playerId) return;
    runInAction(() => {
      this.browsing = null;
    });
  }

  /** `SendPlayerShopItemBuyRequest`. */
  buyFromShop(square: number): void {
    const browse = this.browsing;
    if (!browse) return;

    const entry = browse.items[square];
    if (!entry) return;

    if (entry.price > Store.playerData.money) {
      Social.errorMessage('You do not have enough Zen.');
      return;
    }

    const packet = PlayerShopItemBuyRequestPacket.createPacket();
    packet.PlayerId = browse.playerId;
    packet.setPlayerName(browse.playerName, 10);
    packet.ItemSlot = entry.slot;
    Store.sendToGS(packet.buffer);
  }

  /** `PlayerShopBuyResult` (0x3F 0x06). */
  shopBuyResult(result: PlayerShopBuyResultResultKindEnum): void {
    const E = PlayerShopBuyResultResultKindEnum;

    if (result === E.Success) {
      playUiSound('getItem');
      return;
    }

    const reason: Partial<Record<PlayerShopBuyResultResultKindEnum, string>> = {
      [E.NotAvailable]: 'The seller is not available.',
      [E.ShopNotOpened]: 'That shop is closed.',
      [E.InTransaction]: 'The seller is busy with someone else.',
      [E.InvalidShopSlot]: 'That item is gone.',
      [E.NameMismatchOrPriceMissing]: 'That item has no price.',
      [E.LackOfMoney]: 'You do not have enough Zen.',
      [E.MoneyOverflowOrNotEnoughSpace]: 'There is no room for that item.',
      [E.ItemBlock]: 'The seller has item trading blocked.',
    };

    Social.errorMessage(reason[result] ?? 'The purchase failed.');
  }
})();

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute it and hand later-loaded importers a second instance
// of this singleton (same guard as store.ts).
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
