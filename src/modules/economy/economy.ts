import { MuWindows } from '@/controllers/interface/windowManager';
import { t, type TextKey } from '../../i18n';
import { makeObservable, observable, action, computed, runInAction } from 'mobx';
import { prefetchItemIcons } from '../../controllers/assets/itemIconPack';
import { Bag } from '../inventory';
import { Hero } from '../hero';
import { Session } from '../session';
import { addNotification } from '../chat';
import { Social } from '../social/social';
import type { Item } from '../../ecs/world';
import { playUiSound } from '../../controllers/sound/sfx';
import { Notices } from '../chat/notices';
import { InventoryConstants } from '@/core/inventoryConstants';
import { MsgBox, MsgWinCode } from '@/controllers/interface/msgWin';
import { mixRecipes } from '@/controllers/assets';
import { findFreeSlot } from '../inventory/inventoryFit';
import { itemSize } from '../inventory';
import { checkMix, isMixSource, recipeNameLines, type MixCheck } from '../chaos_mix/mixRecipes';
import { socketsOf } from '@/controllers/item_rules';
import {
  CHAOS_CARD_WIRE_STORAGE,
  PET_TRAINER_WIRE_STORAGE,
  SEED_WIRE_STORAGES,
  MIX_SLOTS,
  PERSONAL_SHOP_SLOTS,
  StorageKind,
  TRADE_SLOTS,
  VAULT_SLOTS,
  isPersonalShopBanned,
  localIndexOf,
  wireSlotOf,
} from '../inventory/itemStorage';
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
} from '@versions/shared/packets/ClientToServerPackets';
import {
  ItemCraftingResultCraftingResultEnum,
  PlayerShopBuyResultResultKindEnum,
  TradeFinishedTradeResultEnum,
  VaultProtectionInformationVaultProtectionStateEnum,
} from '@versions/shared/packets/ServerToClientPackets';

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
 * The `_MIX_TYPES` this window is opened as (MixMgr.h:100-116): the goblin's menu picks the first three
 * (`CChaosMixMenuMsgBox`), the Chaos Card Master opens the card one, the seed NPCs' menus the last four.
 */
export const MIX_TYPE = {
  regular: 0,
  chaosWeapon: 1,
  option380: 2,
  /** `MIXTYPE_TRAINER`, the Pet Trainer's Dark Horse / Dark Raven. */
  trainer: 4,
  chaosCard: 8,
  extractSeed: 10,
  seedSphere: 11,
  attachSocket: 12,
  detachSocket: 13,
} as const;

/** `GetMixStorageType` (MixMgr.cpp:1153-1186): the storage byte a tray moves items under; 3 otherwise. */
const MIX_STORAGE: Readonly<Record<number, number>> = {
  [MIX_TYPE.chaosCard]: CHAOS_CARD_WIRE_STORAGE,
  [MIX_TYPE.trainer]: PET_TRAINER_WIRE_STORAGE,
  [MIX_TYPE.extractSeed]: SEED_WIRE_STORAGES[0],
  [MIX_TYPE.seedSphere]: SEED_WIRE_STORAGES[1],
  [MIX_TYPE.attachSocket]: SEED_WIRE_STORAGES[2],
  [MIX_TYPE.detachSocket]: SEED_WIRE_STORAGES[3],
};

/** `GetSeedShpereSeedID` (SocketSystem.cpp:80-112): a seed sphere's seed, its kind's first seed plus its level. */
const SPHERE_FIRST_SEED = [0, 10, 16, 21, 29, 34];
function sphereSeed(item: Item): number | null {
  if (item.group !== 12 || item.num < 100 || item.num > 129) return null;
  return SPHERE_FIRST_SEED[(item.num - 100) % 6] + (item.lvl ?? 0);
}

type TradePartner = { name: string; level: number; guildId: number };

export type ShopStock = { slot: number; item: Item; price: number };

type ShopBrowse = {
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
  | { kind: 'shop-buy'; slot: number }
  /** How many of the merchant's stock slot to buy (`quickItemActions.ts`). */
  | { kind: 'npc-buy-many'; slot: number }
  /** Ours (`jewelBundling`): bundle `size` single jewels of the kind (chaos_mix `JewelMix.askBundle`). */
  | { kind: 'jewel-bundle'; jewel: number; size: number }
  /** Ours: unbundle the packed jewel in `slot` into `size` single ones (`JewelMix.askUnbundle`). */
  | { kind: 'jewel-unbundle'; jewel: number; size: number; slot: number };

const emptyGrid = (size: number) => new Array<Item | null>(size).fill(null);

/**
 * The four economy windows - vault (`CNewUIStorageInventory`),
 * chaos machine (`CNewUIMixInventory`), trade (`CNewUITrade`) and the
 * personal shop (`CNewUIMyShopInventory` / `CNewUIPurchaseShopInventory`).
 *
 * The inventory's `Bag` owns the hero's items and the shared picked-item
 * cursor; this store owns the grids that only exist while one of these
 * windows is open. `Bag.itemsOfStorage` resolves a
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
  /** `CMixRecipeMgr::m_iMixType`: which `Mix.bmd` recipe list the tray is matched against. */
  mixInventoryType: number = MIX_TYPE.regular;
  /** `CChaosMixMenuMsgBox`: the goblin asks which kind of combination first. */
  mixMenuOpen = false;
  /** `MIX_REQUESTED`: the request is out, both grids are locked. */
  mixPending = false;
  /** `MIX_FINISHED`: what the last attempt did; the window stays locked until it is opened again. */
  mixResult: 'success' | 'failed' | 'refused' | null = null;
  /** `CSeedMasterMenuMsgBox` / `CSeedInvestigatorMenuMsgBox`: the seed NPC's menu, before its tray. */
  seedMenu: 'master' | 'researcher' | null = null;
  /** The socket picked in the seed researcher's list (`m_SocketListBox`), -1 for none. */
  mixSocket = -1;
  /** `CreateOkMessageBox` after a refused mix: the level line it shows, or null. */
  mixNotice: TextKey | null = null;
  /** `g_nChaosTaxRate`: the castle's chaos machine tax, from `ReceiveTaxInfo` type 1 (WSclient.cpp:11303-11306). */
  chaosTaxRate = 0;

  // ---- trade (CNewUITrade) -------------------------------------------------

  tradeOpen = false;
  myTradeItems: (Item | null)[] = emptyGrid(TRADE_SLOTS);
  yourTradeItems: (Item | null)[] = emptyGrid(TRADE_SLOTS);

  /**
   * Squares of the partner's tray that changed after we had already ticked
   * accept. The server drops both marks on any change, so the trade is
   * safe either way - this is only so the eye finds *what* moved before
   * ticking again. Cleared when the window closes or we accept afresh.
   */
  yourTradeChanged = new Set<number>();
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
      mixInventoryType: observable,
      mixMenuOpen: observable,
      mixCheck: computed,
      mixPending: observable,
      mixResult: observable,
      seedMenu: observable,
      mixSocket: observable,
      mixNotice: observable,
      chaosTaxRate: observable,
      mixSockets: computed,
      tradeOpen: observable,
      myTradeItems: observable,
      yourTradeItems: observable,
      yourTradeChanged: observable,
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
    this.mixInventoryType = MIX_TYPE.regular;
    this.mixMenuOpen = false;
    this.seedMenu = null;
    this.mixSocket = -1;
    this.mixNotice = null;
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
    if (Bag.pickedItem?.fromStorage !== storage) return;
    Bag.cancelPickedItem();
  }

  // =========================================================================
  // Vault
  // =========================================================================

  /** `NpcWindowResponse(VaultStorage)`: the warehouse opens next to the bag. */
  openVault(): void {
    runInAction(() => {
      this.vaultOpen = true;
      this.vaultUnlocked = false;
      MuWindows.setOpen('inventory', true);
    });
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
          addNotification(t('notify.wrongVaultPin'), 'error');
          break;
        case E.SetPinFailedBecauseLock:
          addNotification(t('notify.unlockBeforePin'), 'error');
          break;
        case E.Unlocked:
          this.vaultLocked = true;
          this.vaultUnlocked = true;
          break;
        case E.RemovePinFailedByWrongPassword:
          addNotification(t('notify.wrongPassword'), 'error');
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

    if (notify && !Session.isOffline) {
      Session.sendToGS(VaultClosedPacket.createPacket().buffer);
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
      addNotification(t('notify.unlockVaultFirst'), 'error');
      this.openPrompt({ kind: 'vault-unlock' });
      return;
    }

    const available = toVault ? Hero.money : this.vaultMoney;
    if (amount > available) {
      addNotification(t('common.notEnoughZen'), 'error');
      return;
    }

    if (Session.isOffline) {
      runInAction(() => {
        if (toVault) {
          Hero.money -= amount;
          this.vaultMoney += amount;
        } else {
          this.vaultMoney -= amount;
          Hero.money += amount;
        }
      });
      return;
    }

    const packet = VaultMoveMoneyRequestPacket.createPacket();
    packet.Direction = toVault
      ? VaultMoveMoneyRequestVaultMoneyMoveDirectionEnum.InventoryToVault
      : VaultMoveMoneyRequestVaultMoneyMoveDirectionEnum.VaultToInventory;
    packet.Amount = amount;
    Session.sendToGS(packet.buffer);
  }

  /** `VaultMoneyUpdate` (0x81). */
  vaultMoneyUpdate(success: boolean, vaultMoney: number, inventoryMoney: number): void {
    if (!success) {
      addNotification(t('notify.zenNotMoved'), 'error');
      return;
    }

    runInAction(() => {
      this.vaultMoney = vaultMoney;
      Hero.money = inventoryMoney;
    });
  }

  /** `CStorageUnlockMsgBoxLayout`: the numeric pin pad. */
  unlockVault(pin: number): void {
    if (Session.isOffline) {
      runInAction(() => {
        this.vaultUnlocked = true;
      });
      return;
    }

    const packet = UnlockVaultPacket.createPacket();
    packet.Pin = pin;
    Session.sendToGS(packet.buffer);
  }

  /** `CStorageLockKeyPadMsgBoxLayout`: a new pin needs the account password. */
  setVaultPin(pin: number, password: string): void {
    if (Session.isOffline) return;

    const packet = SetVaultPinPacket.createPacket();
    packet.Pin = pin;
    packet.setPassword(password, 20);
    Session.sendToGS(packet.buffer);
  }

  removeVaultPin(password: string): void {
    if (Session.isOffline) return;

    const packet = RemoveVaultPinPacket.createPacket();
    packet.setPassword(password, 20);
    Session.sendToGS(packet.buffer);
  }

  // =========================================================================
  // Chaos machine
  // =========================================================================

  /** `NpcWindowResponse(ChaosMachine / ChaosCardCombination)` → `OpeningProcess`. */
  openMix(kind: 'chaosMachine' | 'chaosCard' | 'petTrainer' = 'chaosMachine'): void {
    this.openTray(kind === 'chaosCard' ? MIX_TYPE.chaosCard : kind === 'petTrainer' ? MIX_TYPE.trainer : MIX_TYPE.regular);
  }

  /** `SetMixType` + `Show(INTERFACE_MIXINVENTORY)` + `OpeningProcess` (NewUIMixInventory.cpp:118-128). */
  private openTray(type: number): void {
    runInAction(() => {
      this.mixOpen = true;
      this.mixItems = emptyGrid(MIX_SLOTS);
      this.mixPending = false;
      this.mixResult = null;
      this.mixSocket = -1;
      this.mixInventoryType = type;
      // The goblin's menu comes up first.
      this.mixMenuOpen = type === MIX_TYPE.regular;
      MuWindows.setOpen('inventory', true);
    });
  }

  /** `ReceiveTalk` 0x17 / 0x18 (WSclient.cpp:6503-6511): the Seed Master's or the Seed Researcher's menu. */
  openSeedMenu(npc: 'master' | 'researcher'): void {
    runInAction(() => (this.seedMenu = npc));
  }

  /** A seed menu button (`ExtractSeedBtnDown` .. `DetachSocketBtnDown`): its tray, as that mix type. */
  chooseSeedMix(type: number): void {
    runInAction(() => (this.seedMenu = null));
    this.openTray(type);
  }

  /** The seed menu's Close (`ExitBtnDown`): `CraftingDialogCloseRequest`. */
  closeSeedMenu(): void {
    runInAction(() => (this.seedMenu = null));
    if (!Session.isOffline) Session.sendToGS(CraftingDialogCloseRequestPacket.createPacket().buffer);
  }

  /** A line of the seed researcher's socket list. */
  selectMixSocket(index: number): void {
    runInAction(() => (this.mixSocket = index));
  }

  /** The socket item in the tray (`m_byFirstItemSocket*`): its sockets, null for an empty one. */
  get mixSockets(): ({ seed: number; level: number } | null)[] {
    const item = this.mixItems.find(entry => entry && (entry.socketCount ?? 0) > 0);
    return item ? socketsOf(item) : [];
  }

  /** A button of the goblin's menu (`CChaosMixMenuMsgBox`, NewUICustomMessageBox.cpp:2833-2861). */
  chooseMixType(type: number): void {
    runInAction(() => {
      this.mixInventoryType = type;
      this.mixMenuOpen = false;
    });
  }

  /** The menu's Close hides the chaos machine too (`CancelBtnDown`). */
  cancelMixMenu(): void {
    runInAction(() => {
      this.mixMenuOpen = false;
    });
    this.closeMix();
  }

  /** `CheckMixInventory`: the recipe the tray makes, against this window's `Mix.bmd` list. */
  get mixCheck(): MixCheck {
    return checkMix(mixRecipes()?.[this.mixInventoryType] ?? [], this.mixItems);
  }

  /**
   * Whether the tray takes `item` (`InventoryProcess`, NewUIMixInventory.cpp:908-975): only a mix
   * source, and only while the machine is ready (not after a mix finished).
   */
  mixAccepts(item: Item): boolean {
    if (this.mixResult || this.mixPending) return false;
    return isMixSource(mixRecipes()?.[this.mixInventoryType] ?? [], item, this.mixCheck);
  }

  /**
   * The `ItemMoveRequest` storage byte of the open tray: the shared local
   * model is `StorageKind.ChaosMachine`, but the Chaos Card Master's window
   * moves items under `CHAOS_CARD_WIRE_STORAGE` (OpenMU only allows storage
   * 9 while the ChaosCardCombination window is the open one).
   */
  get mixWireStorage(): number {
    return MIX_STORAGE[this.mixInventoryType] ?? StorageKind.ChaosMachine;
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
    const pickedFromTray = Bag.pickedItem?.fromStorage === StorageKind.ChaosMachine;
    if (notify && (this.mixItems.some(Boolean) || pickedFromTray)) {
      Social.errorMessage(t('chaos.takeItemsOut'));
      return false;
    }

    if (notify && !Session.isOffline) {
      Session.sendToGS(CraftingDialogCloseRequestPacket.createPacket().buffer);
    }

    runInAction(() => {
      this.mixOpen = false;
      this.mixItems = emptyGrid(MIX_SLOTS);
      this.mixPending = false;
      this.mixResult = null;
    });
    return true;
  }

  /**
   * The mix button (`CNewUIMixInventory::Mix`, NewUIMixInventory.cpp:836-905): zen, a matched recipe,
   * its level and the bag space for the result, then the confirm box (`CMixCheckMsgBox`).
   */
  mix(): void {
    // MIX_FINISHED: the button does nothing until the window is opened again (`BtnProcess`).
    if (!this.mixOpen || this.mixPending || this.mixResult) return;

    if (!this.mixItems.some(Boolean)) {
      Social.errorMessage(t('chaos.putItemsIn'));
      return;
    }

    if (Session.isOffline) {
      addNotification(t('notify.chaosNeedsServer'), 'info');
      return;
    }

    const check = this.mixCheck;
    if (check.requiredZen > Hero.money) {
      Social.errorMessage(t('chaos.notEnoughZen'));
      return;
    }
    const recipe = check.recipe;
    if (!recipe) {
      Social.errorMessage(t('chaos.lackItems'));
      return;
    }
    const name = recipeNameLines(recipe, check.firstItemType)[0];
    if (Hero.level < recipe.requiredLevel) {
      Social.errorMessage(t('chaos.levelRequired', { level: recipe.requiredLevel, name }));
      return;
    }
    if (recipe.width !== -1 && !this.bagHasRoom(recipe.width, recipe.height)) {
      Social.errorMessage(t('chaos.makeRoom'));
      return;
    }
    const refusal = this.mixSocketRefusal();
    if (refusal) {
      Social.errorMessage(t(refusal));
      return;
    }

    // `SetMixSubType`: the socket picked goes out with the seed researcher's mixes.
    const subType = Math.max(0, this.mixSocket);
    MsgBox.popUpMsgWin(MsgWinCode.ConfirmMix, name, () => this.sendMix(recipe.mixId, subType));
  }

  /** `Mix`'s socket checks for the seed researcher's two trays (NewUIMixInventory.cpp:843-890). */
  private mixSocketRefusal(): TextKey | null {
    const type = this.mixInventoryType;
    if (type !== MIX_TYPE.attachSocket && type !== MIX_TYPE.detachSocket) return null;
    const sockets = this.mixSockets;
    const picked = this.mixSocket;
    if (type === MIX_TYPE.attachSocket) {
      const sphere = this.mixItems.map(item => (item ? sphereSeed(item) : null)).find(seed => seed !== null) ?? null;
      if (sockets.some(socket => socket !== null && socket.seed === sphere)) return 'chaos.sameSphere';
      if (picked < 0) return 'chaos.selectSocket';
      if (picked >= sockets.length || sockets[picked]) return 'chaos.socketApplied';
      return null;
    }
    if (picked < 0) return 'chaos.selectDestructible';
    if (picked >= sockets.length || !sockets[picked]) return 'chaos.noDestructible';
    return null;
  }

  /** `CMixCheckMsgBoxLayout::OkBtnDown`: the recipe's `m_iMixID` and the sub type (NewUICommonMessageBox.cpp:1930-1935). */
  private sendMix(mixId: number, subType: number): void {
    if (!this.mixOpen || this.mixPending) return;
    const packet = ChaosMachineMixRequestPacket.createPacket();
    packet.MixType = mixId as ChaosMachineMixRequestChaosMachineMixTypeEnum;
    packet.SocketSlot = subType;
    Session.sendToGS(packet.buffer);

    runInAction(() => {
      this.mixPending = true;
      this.mixResult = null;
    });
  }

  /** `FindEmptySlot` in the bag for a `width` x `height` result. */
  private bagHasRoom(width: number, height: number): boolean {
    const occupied = Hero.items.flatMap((item, slot) => {
      if (!item || slot < InventoryConstants.EquippableSlotsCount) return [];
      const { w, h } = itemSize(item);
      return [{ slot, width: w, height: h }];
    });
    return findFreeSlot(occupied, InventoryConstants.InventoryRows, width, height) >= 0;
  }

  /** `ItemCraftingResult` (0x86). */
  craftingResult(
    result: ItemCraftingResultCraftingResultEnum,
    item: Item | null
  ): void {
    const E = ItemCraftingResultCraftingResultEnum;
    // Only a mix the machine tried empties the tray; a refusal (zen, level, wrong
    // items) leaves the items in (ReceiveMixExtended, WSclient.cpp:6796-6831).
    const tried = result === E.Success || result === E.Failed;
    // Short zen (2, 0x0B) is MIX_READY; every other refusal is MIX_FINISHED (WSclient.cpp:6795-6831).
    const ready = result === E.NotEnoughMoney || result === E.NotEnoughMoneyForBloodCastle;

    runInAction(() => {
      this.mixPending = false;
      this.mixResult = tried ? (result === E.Success ? 'success' : 'failed') : ready ? null : 'refused';
      if (!tried) return;
      this.mixItems = emptyGrid(MIX_SLOTS);
      if (result === E.Success && item) this.mixItems[0] = item;
    });

    // ReceiveMixExtended (WSclient.cpp:6705-6795): the seed researcher's trays print no result line,
    // the Chaos Card Master names its combination (GlobalText 2113 / 2112 with 2265).
    const socketMix = this.mixInventoryType === MIX_TYPE.attachSocket || this.mixInventoryType === MIX_TYPE.detachSocket;
    const card = this.mixInventoryType === MIX_TYPE.chaosCard;
    if (result === E.Success) {
      playUiSound('mix');
      playUiSound('jewel');
      if (!socketMix) Social.systemMessage(t(card ? 'chaos.cardSucceeded' : 'chaos.succeeded'));
      return;
    }
    if (result === E.Failed && socketMix) {
      playUiSound('mix');
      playUiSound('mixFailed');
      return;
    }

    // The emptied tray after a failed mix (WSclient.cpp:1750-1754).
    if (result === E.Failed) {
      playUiSound('mix');
      playUiSound('mixFailed');
      Social.errorMessage(t(card ? 'chaos.cardFailed' : 'chaos.failed'));
      return;
    }

    // The refusals (WSclient.cpp:6795-6831): short zen says so, 4 and 9 open an OK box with the
    // Devil Square and Cloak level lines (GlobalText 649 / 689), every other code is silent.
    if (ready) Social.errorMessage(t('chaos.notEnoughZen'));
    else if (result === E.CharacterLevelTooLow || result === E.CharacterClassTooLow) {
      runInAction(() => {
        this.mixNotice = result === E.CharacterLevelTooLow ? 'chaos.devilSquareLevel' : 'chaos.cloakLevel';
      });
    }
  }

  /** The OK box's OK (or Escape). */
  closeMixNotice(): void {
    runInAction(() => {
      this.mixNotice = null;
    });
  }

  // =========================================================================
  // Trade
  // =========================================================================

  private closeTradeState(): void {
    this.returnPickedFrom(StorageKind.Trade);
    this.tradeOpen = false;
    this.myTradeItems = emptyGrid(TRADE_SLOTS);
    this.yourTradeItems = emptyGrid(TRADE_SLOTS);
    this.yourTradeChanged = new Set();
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
      Social.errorMessage(t('trade.alreadyTrading'));
      return;
    }
    if (this.vaultOpen || this.mixOpen || this.myShopOpen) {
      // `IsImpossibleTradeInterface`.
      Social.errorMessage(t('trade.closeWindows'));
      return;
    }

    const packet = TradeRequestPacket.createPacket();
    packet.PlayerId = target.netId;
    Session.sendToGS(packet.buffer);
    Social.systemMessage(t('trade.requestSent', { name: target.name }));
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
    Session.sendToGS(packet.buffer);
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
      MuWindows.setOpen('inventory', true);
    });
  }

  /** `ProcessToReceiveYourItemAdd` / `…Delete` (0x39 / 0x38). */
  setYourTradeItem(slot: number, item: Item | null): void {
    if (slot < 0 || slot >= TRADE_SLOTS) return;

    prefetchItemIcons([item]);
    const afterAccept = this.myTradeConfirm;
    runInAction(() => {
      if (afterAccept) this.yourTradeChanged = new Set([...this.yourTradeChanged, slot]);
      this.yourTradeItems[slot] = item;
      // Any change on either side clears both accept marks on the server;
      // mirror that so the button is not shown checked by mistake.
      this.myTradeConfirm = false;
      this.yourTradeConfirm = false;
    });
    playUiSound('getItem');
    if (afterAccept) Notices.create(t('trade.offerChanged'));
  }

  /** The zen field (`CTradeZenMsgBoxLayout` → `SendSetTradeMoney`). */
  setTradeMoney(amount: number): void {
    if (!this.tradeOpen) return;

    if (amount > Hero.money + this.myTradeMoney) {
      addNotification(t('notify.notThatMuchZen'), 'error');
      return;
    }

    if (this.myTradeConfirm) this.setMyConfirm(false);

    this.pendingTradeMoney = amount;

    const packet = SetTradeMoneyPacket.createPacket();
    packet.Amount = amount;
    Session.sendToGS(packet.buffer);
  }

  /** `TradeMoneySetResponse` (0x3A 0x01). */
  tradeMoneyAccepted(): void {
    runInAction(() => {
      this.myTradeMoney = this.pendingTradeMoney;
    });
  }

  /** `TradeMoneyUpdate` (0x3B): the partner's amount. */
  partnerTradeMoney(amount: number): void {
    const afterAccept = this.myTradeConfirm;
    runInAction(() => {
      this.yourTradeMoney = amount;
      this.myTradeConfirm = false;
      this.yourTradeConfirm = false;
    });
    if (afterAccept) Notices.create(t('trade.offerChanged'));
  }

  /** `AlertTrade`: our own accept checkbox. */
  setMyConfirm(checked: boolean): void {
    if (!this.tradeOpen) return;

    runInAction(() => {
      this.myTradeConfirm = checked;
      // Accepting again is reading the offer again: the marks have done
      // their job.
      if (checked) this.yourTradeChanged = new Set();
    });

    const packet = TradeButtonStateChangePacket.createPacket();
    packet.NewState = checked
      ? TradeButtonStateEnum.Checked
      : TradeButtonStateEnum.Unchecked;
    Session.sendToGS(packet.buffer);
  }

  toggleMyConfirm(): void {
    if (Bag.pickedItem) return;
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
    if (Bag.pickedItem) return;

    Session.sendToGS(TradeCancelPacket.createPacket().buffer);
  }

  /** `TradeFinished` (0x3D): the window always closes, the reason varies. */
  tradeFinished(result: TradeFinishedTradeResultEnum): void {
    const E = TradeFinishedTradeResultEnum;

    switch (result) {
      case E.Success:
        Social.systemMessage(t('trade.completed'));
        break;
      case E.Cancelled:
        Social.errorMessage(t('trade.cancelled'));
        break;
      case E.FailedByFullInventory:
        Social.errorMessage(t('trade.noRoom'));
        break;
      case E.TimedOut:
        Social.errorMessage(t('trade.timedOut'));
        break;
      case E.FailedByItemsNotAllowedToTrade:
        Social.errorMessage(t('trade.itemNotTradable'));
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

    if (Hero.level < 6) {
      Social.errorMessage(t('personalShop.needLevel'));
      return;
    }

    runInAction(() => {
      this.myShopOpen = true;
      MuWindows.setOpen('inventory', true);
    });
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
      Social.errorMessage(t('personalShop.cannotSell'));
      return;
    }

    if (price < 0) {
      addNotification(t('notify.negativePrice'), 'error');
      return;
    }

    // The price only sticks while the stall is closed (`Works only if the
    // shop is currently closed.`), so take it down first.
    if (this.myShopSelling) this.stopSelling();

    runInAction(() => {
      this.myShopPrices[square] = price;
    });

    if (Session.isOffline) return;

    const packet = PlayerShopSetItemPricePacket.createPacket();
    packet.ItemSlot = this.shopSlotOf(square);
    packet.Price = price;
    Session.sendToGS(packet.buffer);
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
      Social.errorMessage(t('personalShop.needName'));
      return;
    }
    if (!this.myShopItems.some(Boolean)) {
      Social.errorMessage(t('personalShop.needItems'));
      return;
    }
    if (this.shopHasUnpricedItems) {
      Social.errorMessage(t('personalShop.needPrices'));
      return;
    }

    runInAction(() => {
      this.myShopName = title;
    });

    if (Session.isOffline) {
      runInAction(() => {
        this.myShopSelling = true;
      });
      this.showHeroShopTitle();
      return;
    }

    const packet = PlayerShopOpenPacket.createPacket();
    packet.setStoreName(title, 26);
    Session.sendToGS(packet.buffer);
  }

  /**
   * `AddShopTitle(Hero->Key, Hero, g_szPersonalShopTitle)`
   * (WSclient.cpp:8696): the hero puts his own stall title up. The server's
   * `PlayerShops` list only goes to the players *around* the seller, so
   * without this the one person who cannot see the stall is its owner.
   */
  private showHeroShopTitle(): void {
    if (Hero.playerId === undefined) return;
    this.setShopTitle(Hero.playerId, this.myShopName);
  }

  /** `RemoveShopTitle(Hero)`: the stall is down. */
  private hideHeroShopTitle(): void {
    if (Hero.playerId === undefined) return;
    this.setShopTitle(Hero.playerId, null);
  }

  /** `SendPlayerShopClose`. */
  stopSelling(): void {
    runInAction(() => {
      this.myShopSelling = false;
    });
    this.hideHeroShopTitle();

    if (Session.isOffline) return;

    Session.sendToGS(PlayerShopClosePacket.createPacket().buffer);
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
      Social.errorMessage(t('personalShop.openFailed'));
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
    Social.systemMessage(t('personalShop.opened'));
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

    Social.systemMessage(t('personalShop.itemSold', { buyer }));
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
    Session.sendToGS(packet.buffer);
  }

  /** `PlayerShopItemList` (0x3F 0x05). */
  showShop(browse: ShopBrowse): void {
    prefetchItemIcons(browse.items.map(stock => stock?.item));
    runInAction(() => {
      this.browsing = browse;
    });
  }

  closeBrowsedShop(): void {
    const browse = this.browsing;
    if (!browse) return;

    if (!Session.isOffline) {
      const packet = PlayerShopCloseOtherPacket.createPacket();
      packet.PlayerId = browse.playerId;
      packet.setPlayerName(browse.playerName, 10);
      Session.sendToGS(packet.buffer);
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

    if (entry.price > Hero.money) {
      Social.errorMessage(t('personalShop.notEnoughZen'));
      return;
    }

    const packet = PlayerShopItemBuyRequestPacket.createPacket();
    packet.PlayerId = browse.playerId;
    packet.setPlayerName(browse.playerName, 10);
    packet.ItemSlot = entry.slot;
    Session.sendToGS(packet.buffer);
  }

  /**
   * `PlayerShopBuyResult` (0x3F 0x06), refusals only: a success is the item
   * itself arriving, which the inventory module's `ItemAddedToInventory` handler puts in the bag.
   */
  shopBuyResult(result: PlayerShopBuyResultResultKindEnum): void {
    const E = PlayerShopBuyResultResultKindEnum;

    if (result === E.Success) return;

    const reason: Partial<Record<PlayerShopBuyResultResultKindEnum, TextKey>> = {
      [E.NotAvailable]: 'personalShop.sellerUnavailable',
      [E.ShopNotOpened]: 'personalShop.shopClosed',
      [E.InTransaction]: 'personalShop.sellerBusy',
      [E.InvalidShopSlot]: 'personalShop.itemGone',
      [E.NameMismatchOrPriceMissing]: 'personalShop.itemNoPrice',
      [E.LackOfMoney]: 'personalShop.notEnoughZen',
      [E.MoneyOverflowOrNotEnoughSpace]: 'personalShop.noRoomForItem',
      [E.ItemBlock]: 'personalShop.tradingBlocked',
    };

    Social.errorMessage(t(reason[result] ?? 'personalShop.purchaseFailed'));
  }
})();

// The grids the bag moves items through (`Bag.itemsOfStorage`); the bag does not import this module.
Bag.grids = {
  items: storage => {
    switch (storage) {
      case StorageKind.Vault:
        return Economy.vaultItems;
      case StorageKind.Trade:
        return Economy.myTradeItems;
      case StorageKind.ChaosMachine:
        return Economy.mixItems;
      case StorageKind.PersonalShop:
        return Economy.myShopItems;
      default:
        return [];
    }
  },
  mixWireStorage: () => Economy.mixWireStorage,
  storageOpen: () => Economy.autoMoveTarget !== null,
};

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute it and hand later-loaded importers a second instance
// of this singleton.
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
