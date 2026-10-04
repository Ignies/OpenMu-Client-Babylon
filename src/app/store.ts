import { MuWindows } from '@/controllers/interface/windowManager';
import { t } from '../i18n';
import { characterSkinBody } from '../controllers/actors/transformedBody';
import type { PlayerObject } from '../controllers/actors/playerObject';
import { playUiSound } from '../controllers/sound/sfx';
import { CharacterClassNumber, ENUM_WORLD } from '@/core/types';
import { TalkToNpcRequestPacket, CloseNpcRequestPacket, PetTypeEnum, BuyItemFromNpcRequestPacket, SellItemToNpcRequestPacket, RepairItemRequestPacket } from '@versions/shared/packets/ClientToServerPackets';
import {
  makeObservable,
  observable,
  action,
  runInAction,
  computed,
  reaction,
} from 'mobx';
import { Item } from '../ecs/world';
import { EventBus } from '../core/eventBus';
import { InventoryConstants } from '@/core/inventoryConstants';
import { findFreeSlot, type Footprint } from '../modules/inventory/inventoryFit';
import { ItemGroups } from '@versions/shared/objects/enum';
import { prefetchItemIcons } from '../controllers/assets/itemIconPack';
import {
  isRepairBanned,
  isSellingBanned,
  itemValue,
  needsRepair,
  repairAllCost,
  repairCost,
} from '@/controllers/item_rules';
import { calcMaxDurability, itemDef, type HeroStats } from '@/controllers/item_rules';
import { StorageKind } from '../modules/inventory/itemStorage';
import { spawnPlayer } from './logic';
import { devVitalPercent } from '../core/devSeams';
import { Economy } from '../modules/economy/economy';
import { Ecs } from '../ecs/current';
import { AppState, UIState } from './uiState';
import { addNotification } from '../modules/chat';
import { Session } from '../modules/session';
import { Hero } from '../modules/hero';
import { Pets } from '../modules/pets';
import { ITEM_MOVE_TIMEOUT, itemSize, Bag } from '../modules/inventory';

/** `CNewUINPCShop`'s item control: 8 columns × 15 rows. */
export const SHOP_COLUMNS = 8;
export const SHOP_ROWS = 15;
const SHOP_SLOTS = SHOP_COLUMNS * SHOP_ROWS;

/** `SendRepairItemRequest(0xFF, …)`: everything at once. */
const REPAIR_ALL_SLOT = 0xff;
/** `m_bRepairEnableLevel` (NewUIMyInventory.cpp:796): self-repair from level 50. */
const SELF_REPAIR_LEVEL = 50;
/**
 * The merchants with a smithy (ZzzInterface.cpp:3605): Eo, Zienna, Hanzo,
 * Rhea and Bolo. The repair buttons only appear at these.
 */
const REPAIR_NPC_TYPES = new Set([243, 246, 251, 416, 578]);

/** The merchant window's contents (`CNewUINPCShop`). */
export type NpcShop = {
  npcId: number;
  name: string;
  npcType: number;
  repairShop: boolean;
  taxRate: number;
  items: (Item | null)[];
};

type NpcTarget = { netId: number; name: string; npcType: number };

/**
 * First slot of `items`'s grid part where `item` fits (the original's
 * `FindEmptySlot`); -1 when the inventory is full.
 */
function findFreeInventorySlot(items: (Item | null)[], item: Item): number {
  const first = InventoryConstants.LastEquippableItemSlotIndex + 1;
  const rows = Math.floor((items.length - first) / InventoryConstants.RowSize);
  const occupied: Footprint[] = [];

  for (let slot = first; slot < items.length; slot++) {
    const placed = items[slot];
    if (!placed) continue;
    const { w, h } = itemSize(placed);
    occupied.push({ slot, width: w, height: h });
  }

  const { w, h } = itemSize(item);

  return findFreeSlot(occupied, rows, w, h);
}

/** What the offline merchant sells: a Lorencia weapon-and-potion stall. */
function offlineShopStock(): { slot: number; item: Item }[] {
  const stock: Item[] = [
    { group: 14, num: 0, lvl: 0, durability: 1 },
    { group: 14, num: 1, lvl: 0, durability: 1 },
    { group: 14, num: 2, lvl: 0, durability: 1 },
    { group: 14, num: 3, lvl: 0, durability: 1 },
    { group: 14, num: 4, lvl: 0, durability: 1 },
    { group: 14, num: 5, lvl: 0, durability: 1 },
    { group: 14, num: 6, lvl: 0, durability: 1 },
    { group: 14, num: 8, lvl: 0, durability: 1 },
    { group: 14, num: 10, lvl: 0, durability: 1 },
    { group: 0, num: 0, lvl: 0, durability: 20 },
    { group: 0, num: 1, lvl: 0, durability: 22 },
    { group: 0, num: 2, lvl: 0, durability: 30 },
    { group: 1, num: 0, lvl: 0, durability: 20 },
    { group: 2, num: 0, lvl: 0, durability: 24 },
    { group: 4, num: 0, lvl: 0, durability: 20 },
    { group: 5, num: 0, lvl: 0, durability: 26 },
    { group: 6, num: 0, lvl: 0, durability: 22 },
    { group: 7, num: 5, lvl: 0, durability: 24 },
    { group: 8, num: 5, lvl: 0, durability: 24 },
    { group: 9, num: 5, lvl: 0, durability: 24 },
    { group: 10, num: 5, lvl: 0, durability: 24 },
    { group: 11, num: 5, lvl: 0, durability: 24 },
  ];

  const grid = new Array<Item | null>(SHOP_SLOTS).fill(null);
  const entries: { slot: number; item: Item }[] = [];

  for (const item of stock) {
    const { w, h } = itemSize(item);
    let placed = false;
    for (let row = 0; row + h <= SHOP_ROWS && !placed; row++) {
      for (let column = 0; column + w <= SHOP_COLUMNS && !placed; column++) {
        let fits = true;
        for (let y = 0; y < h && fits; y++) {
          for (let x = 0; x < w; x++) {
            if (grid[(row + y) * SHOP_COLUMNS + column + x]) {
              fits = false;
              break;
            }
          }
        }
        if (!fits) continue;
        const slot = row * SHOP_COLUMNS + column;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            grid[(row + y) * SHOP_COLUMNS + column + x] = item;
          }
        }
        entries.push({ slot, item });
        placed = true;
      }
    }
  }

  return entries;
}

/**
 * `?offline&map=noria` / `?offline&map=3`: the world the offline scene boots
 * into, by number or by the `ENUM_WORLD` name after its number (a prefix is
 * enough: `lost`, `atlans`, `icarus`). Lorencia when absent or unknown. Read
 * before `playOffline` rewrites the URL to `/offline`.
 */
function offlineMapFromUrl(): ENUM_WORLD {
  let raw: string | null = null;
  try {
    raw = new URLSearchParams(location.search).get('map');
  } catch {
    raw = null;
  }
  if (!raw) return ENUM_WORLD.WD_0LORENCIA;

  if (/^\d+$/.test(raw)) {
    const n = Number(raw) as ENUM_WORLD;
    return ENUM_WORLD[n] !== undefined ? n : ENUM_WORLD.WD_0LORENCIA;
  }

  const want = raw.toLowerCase();
  for (const key of Object.keys(ENUM_WORLD)) {
    const name = key.replace(/^WD_\d+/, '');
    if (name === key) continue;
    if (name.toLowerCase().startsWith(want)) {
      return ENUM_WORLD[key as keyof typeof ENUM_WORLD];
    }
  }
  return ENUM_WORLD.WD_0LORENCIA;
}

/**
 * `?offline&skin=503`: the transformation skin the offline hero wears, the
 * number a ring or a `/skin` would send. 0 or unknown means its own body.
 */
function offlineSkinFromUrl(): number {
  try {
    const raw = new URLSearchParams(location.search).get('skin');
    const n = Number(raw);
    return raw && Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * `?offline&class=elf` / `?class=20`: the offline test character's class, by
 * `CharacterClassNumber` value or name prefix (`fairy` → FairyElf,
 * `rage` → RageFighter). A screenshot-harness seam like `?map=`; null when
 * absent or unknown (Dark Knight).
 */
function offlineClassFromUrl(): CharacterClassNumber | null {
  let raw: string | null = null;
  try {
    raw = new URLSearchParams(location.search).get('class');
  } catch {
    raw = null;
  }
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const n = Number(raw) as CharacterClassNumber;
    return CharacterClassNumber[n] !== undefined ? n : null;
  }

  const want = raw.toLowerCase();
  for (const key of Object.keys(CharacterClassNumber)) {
    if (/^\d+$/.test(key)) continue;
    if (key.toLowerCase().startsWith(want)) {
      return CharacterClassNumber[key as keyof typeof CharacterClassNumber];
    }
  }
  return null;
}

/**
 * `?hand1=0,14` / `?hand2=none`: overrides the offline test loadout's hand
 * slots (`group,num[,level]`; `none` empties the slot), for the weapon
 * stow/draw screenshot matrix (lighting_rework.md §4). Slot 0 draws in the
 * right hand (Weapon1), slot 1 in the left (Weapon2).
 *
 * `?pet=13,37` fills the pet slot the same way; its third number is the
 * item's option bits instead of a level (the Fenrir colours: 1 black,
 * 2 blue, 4 gold).
 */
function applyOfflineHandOverrides(items: (Item | null)[]): void {
  const read = (name: string, slot: number, thirdIsFlags = false) => {
    let raw: string | null = null;
    try {
      raw = new URLSearchParams(location.search).get(name);
    } catch {
      raw = null;
    }
    if (!raw) return;

    if (raw === 'none') {
      items[slot] = null;
      return;
    }

    const [group, num, third] = raw.split(',').map(Number);
    if (Number.isFinite(group) && Number.isFinite(num)) {
      items[slot] = {
        group,
        num,
        lvl: !thirdIsFlags && Number.isFinite(third) ? third : 0,
        isExcellent: false,
        excellentFlags: thirdIsFlags && Number.isFinite(third) ? third : 0,
      };
    }
  };

  read('hand1', InventoryConstants.LeftHandSlot);
  read('hand2', InventoryConstants.RightHandSlot);
  read('pet', InventoryConstants.PetSlot, true);
}

export const Store = new (class _Store {
  // Read by `interface/components/item_tooltip` until it moves up to the ui (`Hero`, `Pets`).
  get playerData() {
    return Hero;
  }

  heroStats(): HeroStats {
    return Hero.heroStats();
  }

  get petInfo() {
    return Pets.petInfo;
  }

  requestPetInfo(pet: PetTypeEnum, slot: number) {
    Pets.requestPetInfo(pet, slot);
  }

  // Read by the item grid, the carried item and the chat item link until they move up to the ui.
  get pickedItem() {
    return Bag.pickedItem;
  }

  cancelPickedItem(): void {
    Bag.cancelPickedItem();
  }

  /** The merchant window (`CNewUINPCShop`); null while no NPC is talking. */
  npcShop: NpcShop | null = null;

  /** `REPAIR_MODE_ON`: the next inventory click repairs instead of picking. */
  repairMode = false;

  /** A buy request is in flight (`BuyCost != 0` blocks a second one). */
  shopBuyPending = false;

  /** The merchant refused the last purchase; a bulk buy run stops on it. */
  shopBuyRefused = false;

  private shopBuyTimer: ReturnType<typeof setTimeout> | null = null;

  /** The NPC a TalkToNpcRequest went out for, until the server answers. */
  private pendingNpcTalk: NpcTarget | null = null;

  /** Monster type of the NPC whose `NpcWindowResponse` is pending (0 = none). */
  get pendingNpcType(): number {
    return this.pendingNpcTalk?.npcType ?? 0;
  }

  constructor() {
    makeObservable(this, {
      npcShop: observable,
      repairMode: observable,
      shopBuyPending: observable,
      shopBuyRefused: observable,
      canRepair: computed,
      // Packet handlers (app/logic.ts) and the UI call these straight from a
      // non-action context; declaring them actions keeps strict mode quiet.
      setTestItems: action,
      playOffline: action,
    });

    // `HideAll` on the inventory hides the shop with it, and the repair
    // cursor never outlives the window it belongs to.
    reaction(
      () => MuWindows.isOpen('inventory'),
      enabled => {
        if (enabled) return;
        this.closeNpcShop();
        runInAction(() => {
          this.repairMode = false;
        });
      }
    );

    // OpenMU refuses any consume unless PlayerState == EnteredWorld: a merchant
    // window still open makes a scroll / potion fail. The original closes the shop on the use click.
    Bag.beforeConsume = () => {
      if (this.npcShop) this.closeNpcShop();
    };
  }

  playOffline() {
    if (!Ecs.world) return;

    const map = offlineMapFromUrl();
    const cls = offlineClassFromUrl() ?? CharacterClassNumber.DarkKnight;

    // Keep the query: a dev-server reload must land on the same map.
    history.replaceState(null, '', '/offline' + location.search);
    Session.isOffline = true;
    AppState.uiState = UIState.World;
    // `?bare` skips the test loadout: the per-class close-up shots need the
    // default body (class gear masks the class), and the weapon matrix
    // wants exactly the `?hand1=`/`?hand2=` items and nothing else.
    let bare = false;
    try {
      bare = new URLSearchParams(location.search).has('bare');
    } catch {
      bare = false;
    }
    if (!bare) this.setTestItems();
    applyOfflineHandOverrides(Hero.items);

    const testPlayer = spawnPlayer(Ecs.world, { cls });

    // `?offline&skin=503`: the hero in a transformation ring's body, which
    // online only arrives on a scope packet from the server.
    const skin = offlineSkinFromUrl();
    const body = skin ? characterSkinBody(skin) : null;
    if (body) {
      Ecs.world.addComponent(testPlayer, 'skin', skin);
      testPlayer.modelFactory = body.factory as typeof PlayerObject;
      testPlayer.transform.scale = body.scale;
    }

    Ecs.world.addComponent(testPlayer, 'localPlayer', true);
    Ecs.world.addComponent(testPlayer, 'worldIndex', map);
    testPlayer.objectNameInWorld = 'TestPlayer';

    Hero.name = 'TestPlayer';
    Hero.charClass = cls;
    Hero.syncPlayerAppearance();
    this.applyOfflineVitals();
    EventBus.emit('requestWarp', { map });
  }

  /** `?hp=` / `?mp=` on the offline route: the bars start where they say. */
  applyOfflineVitals(): void {
    const hp = devVitalPercent('hp');
    const mp = devVitalPercent('mp');

    runInAction(() => {
      if (hp !== null) {
        Hero.currentHP = Math.round((Hero.maxHP * hp) / 100);
      }
      if (mp !== null) {
        Hero.currentMP = Math.round((Hero.maxMP * mp) / 100);
      }
    });
  }

  setTestItems() {
    const DragonSetIndex = 1;

    Hero.items[InventoryConstants.HelmSlot] = {
      num: DragonSetIndex,
      group: ItemGroups.Helm,
      lvl: 9,
      isExcellent: false,
    };

    Hero.items[InventoryConstants.ArmorSlot] = {
      num: DragonSetIndex,
      group: ItemGroups.Armor,
      lvl: 7,
      isExcellent: false,
    };

    Hero.items[InventoryConstants.PantsSlot] = {
      num: DragonSetIndex,
      group: ItemGroups.Pants,
      lvl: 9,
      isExcellent: false,
    };

    Hero.items[InventoryConstants.GlovesSlot] = {
      num: DragonSetIndex,
      group: ItemGroups.Gloves,
      lvl: 5,
      isExcellent: false,
    };

    Hero.items[InventoryConstants.BootsSlot] = {
      num: DragonSetIndex,
      group: ItemGroups.Boots,
      lvl: 1,
      isExcellent: false,
    };

    const weapon = { Group: 3, Index: 9 };

    Hero.items[InventoryConstants.LeftHandSlot] = {
      group: weapon.Group,
      num: weapon.Index,
      lvl: 9,
      isExcellent: false,
    };

    Hero.items[InventoryConstants.LastEquippableItemSlotIndex + 1] =
      {
        group: weapon.Group,
        num: weapon.Index,
        lvl: 9,
        isExcellent: true,
      };

    // A spread of the grid for the tooltip / icon work: a one-hander, an
    // excellent shield, a staff the knight cannot use, a stack of potions,
    // a jewel and a pair of gloves.
    const grid = InventoryConstants.LastEquippableItemSlotIndex + 1;
    const row = InventoryConstants.RowSize;

    Hero.items[grid + 2] = { group: 0, num: 0, lvl: 4, optionLevel: 1 };
    Hero.items[grid + 3] = {
      group: 6,
      num: 0,
      lvl: 7,
      isExcellent: true,
      excellentFlags: 0x21,
      luck: true,
    };
    Hero.items[grid + 5] = {
      group: 5,
      num: 0,
      lvl: 11,
      optionLevel: 2,
      hasSkill: false,
    };
    Hero.items[grid + 6] = { group: 14, num: 0, durability: 3 };
    Hero.items[grid + 7] = { group: 14, num: 13, durability: 1 };
    // Mana and shield stacks so the W / R bar slots have something to find.
    Hero.items[grid + row + 6] = { group: 14, num: 5, durability: 5 };
    Hero.items[grid + row + 7] = { group: 14, num: 35, durability: 2 };
    Hero.items[grid + row * 4 + 2] = {
      group: 10,
      num: 5,
      lvl: 13,
      isAncient: true,
      ancientBonusLevel: 1,
      ancientDiscriminator: 1,
    };

    Hero.syncPlayerAppearance();
  }

  // --- NPC shop & repair (CNewUINPCShop, NewUIMyInventory repair mode) -------

  /**
   * Which window the offline test NPC opens next. There is no server to send
   * `NpcWindowResponse`, so talking to it again cycles merchant → vault →
   * chaos machine, which is the only way to see those three without one.
   */
  private offlineNpcWindow = 0;

  /** MOVEMENT_TALK reached the NPC (ZzzInterface.cpp:3576): ask what it offers. */
  talkToNpc(npc: NpcTarget): void {
    if (Bag.pendingItemMove || this.npcShop) return;

    this.pendingNpcTalk = npc;
    // `ReceiveTalk` / `ReceiveQuestState` open with `HideAll`.
    EventBus.emit('npcTalkStarted', { npcType: npc.npcType });

    if (Session.isOffline) {
      const which = this.offlineNpcWindow++ % 3;
      // What the NpcWindowResponse handler plays for every window
      // (ReceiveTalk, WSclient.cpp:6563-6564).
      playUiSound('click');
      playUiSound('window');

      if (which === 1) {
        this.dropNpcTalk();
        this.offlineVault();
        return;
      }
      if (which === 2) {
        this.dropNpcTalk();
        this.offlineMix();
        return;
      }

      this.openNpcShop();
      this.setNpcShopItems(offlineShopStock());
      return;
    }

    // Reset OpenMU's dialog state first, every time: a talk that never produced a
    // window (or one closed without a CloseNpcRequest) leaves it in NpcDialogOpened,
    // and it ignores new talks until a CloseNpcRequest arrives.
    Session.sendToGS(CloseNpcRequestPacket.createPacket().buffer);
    const packet = TalkToNpcRequestPacket.createPacket();
    packet.NpcId = npc.netId;
    Session.sendToGS(packet.buffer);
  }

  /** NpcWindowResponse(Merchant): the shop opens, with the inventory beside it. */
  openNpcShop(): void {
    const npc = this.pendingNpcTalk;
    this.pendingNpcTalk = null;

    runInAction(() => {
      this.npcShop = {
        npcId: npc?.netId ?? 0,
        name: npc?.name ?? 'Merchant',
        npcType: npc?.npcType ?? 0,
        repairShop: npc ? REPAIR_NPC_TYPES.has(npc.npcType) : false,
        taxRate: 0,
        items: new Array<Item | null>(SHOP_SLOTS).fill(null),
      };
      this.repairMode = false;
      MuWindows.setOpen('inventory', true);
    });
  }

  /** The server's answer came for something other than a merchant. */
  dropNpcTalk(): void {
    this.pendingNpcTalk = null;
  }

  /** StoreItemList: the merchant's stock, by slot in its 8×15 grid. */
  setNpcShopItems(entries: { slot: number; item: Item }[]): void {
    const shop = this.npcShop;
    if (!shop) return;

    runInAction(() => {
      const items = new Array<Item | null>(SHOP_SLOTS).fill(null);
      for (const entry of entries) {
        if (entry.slot >= 0 && entry.slot < SHOP_SLOTS) items[entry.slot] = entry.item;
      }
      shop.items = items;
    });
    // The icons start loading now, at high priority, not when the grid mounts.
    prefetchItemIcons(shop.items);
  }

  /** `ClosingProcess`: tell the server, drop the stock, leave repair mode. */
  closeNpcShop(): void {
    if (!this.npcShop) return;

    if (!Session.isOffline) {
      Session.sendToGS(CloseNpcRequestPacket.createPacket().buffer);
    }

    this.finishShopBuy();

    runInAction(() => {
      this.npcShop = null;
      this.repairMode = false;
    });
  }

  /** Click on a shop item (`SendBuyItemFromNpcRequest`). */
  buyItemFromNpc(shopSlot: number): void {
    const shop = this.npcShop;
    if (!shop || this.shopBuyPending || Bag.pickedItem || Bag.pendingItemMove) return;

    const item = shop.items[shopSlot];
    if (!item) return;

    runInAction(() => {
      this.shopBuyRefused = false;
    });

    if (Session.isOffline) {
      this.buyOffline(item);
      return;
    }

    const packet = BuyItemFromNpcRequestPacket.createPacket();
    packet.ItemSlot = shopSlot;
    Session.sendToGS(packet.buffer);

    runInAction(() => {
      this.shopBuyPending = true;
    });

    this.shopBuyTimer = setTimeout(() => this.finishShopBuy(), ITEM_MOVE_TIMEOUT);
  }

  /** ItemBought / NpcItemBuyFailed arrived (or nothing did in time). */
  finishShopBuy(): void {
    if (this.shopBuyTimer) {
      clearTimeout(this.shopBuyTimer);
      this.shopBuyTimer = null;
    }

    if (!this.shopBuyPending) return;

    runInAction(() => {
      this.shopBuyPending = false;
    });
  }

  /** NpcItemBuyFailed: nothing was bought and nothing was charged. */
  shopBuyFailed(): void {
    runInAction(() => {
      this.shopBuyRefused = true;
    });

    this.finishShopBuy();
    addNotification(t('notify.cannotBuy'), 'error');
  }

  /**
   * The carried item dropped onto the shop (`InventoryProcess`): sold, with
   * the original's two refusals - the money cap and the unsellable list.
   */
  sellPickedItemToNpc(): void {
    const picked = Bag.pickedItem;
    if (!picked || !this.npcShop || Bag.pendingItemMove) return;
    // `SendSellItemToNpcRequest` only knows inventory slots.
    if (picked.fromStorage !== StorageKind.Inventory) return;

    const price = itemValue(picked.item, 1);

    if (Hero.money + price > 2000000000) {
      addNotification(t('notify.zenCap'), 'error');
      return;
    }

    if (isSellingBanned(picked.item)) {
      addNotification(t('notify.cannotSell'), 'error');
      Bag.cancelPickedItem();
      return;
    }

    if (Session.isOffline) {
      runInAction(() => {
        Hero.money += price;
        Bag.pickedItem = null;
        Hero.syncPlayerAppearance();
      });
      playUiSound('getItem');
      return;
    }

    const packet = SellItemToNpcRequestPacket.createPacket();
    packet.ItemSlot = picked.fromSlot;

    Bag.beginItemMove(
      picked.fromStorage,
      picked.fromSlot,
      StorageKind.Inventory,
      -1
    );
    Session.sendToGS(packet.buffer);
  }

  /** NpcItemSellResult: the item is gone and the money is in - or neither. */
  itemSoldToNpc(success: boolean, money: number): void {
    if (!Bag.pendingItemMove) return;

    if (success) {
      Bag.confirmItemMove(-1, null);
      runInAction(() => {
        Hero.money = money;
      });
      // ReceiveSell (WSclient.cpp:6861).
      playUiSound('getItem');
      return;
    }

    Bag.rollbackItemMove();
    addNotification(t('notify.merchantRefuses'), 'error');
  }

  /** Whether a repair can be asked for here: a smith, or self-repair from 50. */
  get canRepair(): boolean {
    if (this.npcShop) return this.npcShop.repairShop;
    return Hero.level >= SELF_REPAIR_LEVEL;
  }

  /** Repairs through the inventory button cost 2.5× the smith's price. */
  get isSelfRepair(): boolean {
    return !this.npcShop?.repairShop;
  }

  /** The repair button / the L key (`ToggleState`, `SetRepairMode`). */
  toggleRepairMode(): void {
    runInAction(() => {
      this.repairMode = this.canRepair && !this.repairMode;
    });
  }

  /** `SendRepairItemRequest(slot, self)`; `REPAIR_ALL_SLOT` for everything. */
  repairItemRequest(slot: number): void {
    if (!this.canRepair || Bag.pendingItemMove) return;

    const selfRepair = this.isSelfRepair;

    if (slot !== REPAIR_ALL_SLOT) {
      const item = Hero.items[slot];
      if (!item || isRepairBanned(item)) return;
      if (!needsRepair(item)) return;
    }

    if (Session.isOffline) {
      this.repairOffline(slot, selfRepair);
      return;
    }

    const packet = RepairItemRequestPacket.createPacket();
    packet.ItemSlot = slot;
    packet.IsSelfRepair = selfRepair;
    Session.sendToGS(packet.buffer);
  }

  /** The smith's second button (`m_BtnRepairAll`). */
  repairAllRequest(): void {
    this.repairItemRequest(REPAIR_ALL_SLOT);
  }

  /** The price of a full repair, as the repair bar of the shop shows it. */
  get repairAllPrice(): number {
    return repairAllCost(Hero.items, this.isSelfRepair);
  }

  private buyOffline(item: Item): void {
    const price = itemValue(item, 0);
    if (Hero.money < price) {
      addNotification(t('common.notEnoughZen'), 'error');
      return;
    }

    const slot = findFreeInventorySlot(Hero.items, item);
    if (slot < 0) {
      addNotification(t('notify.noInventoryRoom'), 'error');
      return;
    }

    runInAction(() => {
      Hero.money -= price;
      Hero.items[slot] = { ...item };
    });
    playUiSound('getItem');
  }

  private repairOffline(slot: number, selfRepair: boolean): void {
    const slots =
      slot === REPAIR_ALL_SLOT
        ? Hero.items.map((_, i) => i)
        : [slot];

    let cost = 0;
    const repaired: Item[] = [];
    for (const i of slots) {
      const item = Hero.items[i];
      if (!item || !needsRepair(item)) continue;
      cost += repairCost(item, selfRepair);
      repaired.push(item);
    }

    if (repaired.length === 0) return;
    if (Hero.money < cost) {
      addNotification(t('common.notEnoughZen'), 'error');
      return;
    }

    runInAction(() => {
      Hero.money -= cost;
      for (const item of repaired) {
        const def = itemDef(item.group, item.num);
        if (!def) continue;
        item.durability = calcMaxDurability(
          def,
          item.lvl ?? 0,
          item.isExcellent === true,
          item.isAncient === true
        );
      }
    });
    playUiSound('repair');
  }

  private offlineVault(): void {
    Economy.openVault();
  }

  private offlineMix(): void {
    Economy.openMix();
  }
})();

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute the chain with a second `Store` instance (`app/store.ts?t=…`)
// that later-loaded modules import - an unconnected store whose actions do
// nothing.
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
