import { t } from './i18n';
import { playUiSound } from './libs/sfx';
import {
  CharacterClassNumber,
  ENUM_WORLD,
  SimpleModulusEncryptor,
  SimpleModulusKeys,
  Xor32Encryptor,
  Xor3Byte,
} from './common';
import {
  AnimationRequestPacket,
  ConsumeItemRequestPacket,
  SaveKeyConfigurationPacket,
  CreateCharacterPacket,
  DeleteCharacterPacket,
  DropItemRequestPacket,
  EnterGateRequestPacket,
  FocusCharacterPacket,
  IncreaseCharacterStatPointPacket,
  ItemMoveRequestPacket,
  LoginShortPasswordPacket,
  PickupItemRequestPacket,
  RequestCharacterListPacket,
  SelectCharacterPacket,
  WarpCommandRequestPacket,
  WalkRequestPacket,
  TalkToNpcRequestPacket,
  CloseNpcRequestPacket,
  MuHelperStatusChangeRequestPacket,
  PetCommandModeEnum,
  PetCommandRequestPacket,
  PetInfoRequestPacket,
  PetTypeEnum,
  StorageTypeEnum,
  BuyItemFromNpcRequestPacket,
  SellItemToNpcRequestPacket,
  RepairItemRequestPacket,
  ServerChangeAuthenticationPacket,
} from './common/packets/ClientToServerPackets';
import {
  ConnectionInfoRequestPacket,
  ServerListRequestPacket,
  ServerListResponsePacket,
} from './common/packets/ConnectServerPackets';
import {
  CharacterCreationUnlockFlagsEnum,
  CharacterListPacket,
  GuildMemberRoleEnum,
} from './common/packets/ServerToClientPackets';
import { classFromAppearance } from './common/deserializeAppearance';
import { formatMsgWinText, MsgWinCode } from './common/msgWin';
import { stringToBytes } from './common/utils';
import {
  CLIENT_SERIAL,
  CLIENT_VERSION,
  MAX_PASSWORD_LENGTH,
  MAX_USERNAME_LENGTH,
} from './consts';
import { connectServerAddress, wsAddress } from './common/serverConfig';
import { LocalStorage } from './libs/localStorage';
import { createSocket } from './libs/sockets/createSocket';
import { gameVersion } from './version';
import {
  makeObservable,
  observable,
  action,
  runInAction,
  computed,
  reaction,
} from 'mobx';
import { Item, World } from './ecs/world';
import { EventBus } from './libs/eventBus';
import { Scalar } from './libs/babylon/exports';
import { InventoryConstants } from './common/inventoryConstants';
import { isJewel, jewelTargetError } from './common/jewelUpgrade';
import { ItemGroups } from './common/objects/enum';
import { ItemsDatabase } from './common/itemsDatabase';
import { prefetchItemIcons } from './common/itemIconPack';
import { ItemSerializer } from './common/itemSerializer';
import {
  isRepairBanned,
  isSellingBanned,
  itemValue,
  needsRepair,
  repairAllCost,
  repairCost,
} from './common/itemValue';
import {
  calcMaxDurability,
  classOf,
  itemDef,
  itemStats,
  type HeroStats,
} from './common/itemStats';
import { learnSkillError, learnableSkill } from './common/skillItems';
import { isHotbarSkill } from './common/skillCasting';
import { skillDefinition } from './common/skillsDatabase';
import {
  StorageKind,
  gridFirstIndex,
  storageBan,
  storageColumns,
  storageRows,
  wireSlotOf,
} from './common/itemStorage';
import {
  HOTKEY_COUNT,
  ItemHotkey,
  UNBOUND_HOTKEY,
  canRegisterItemHotkey,
  findHotkeyItem,
} from './common/itemHotkeys';
import { spawnPlayer } from './logic';
import { registerStore } from './common/storeRef';
import { Social } from './social';
import { Economy } from './economy';

const CONFIG_KEY = '_mu_key';

/**
 * How long the game server named by `ConnectionInfo` has to say `GameServerEntered`
 * before the `auto` policy falls back to the connect-server host. Long enough for
 * a slow TCP handshake through the proxy, short enough that a player staring at a
 * dead login screen is not what tells them.
 */
const GS_ANSWER_TIMEOUT = 4000;

/** `ServerChangeAuthentication`'s XOR3 name fields are 12 bytes each. */
const SERVER_CHANGE_NAME_LENGTH = 12;

const xor32 = new Xor32Encryptor();
xor32.xor32Key = gameVersion.protocol.encryption.xor32Key;

const INVENTORY_STORAGE = StorageKind.Inventory;

const ITEM_MOVE_TIMEOUT = 5000;

/** `CNewUINPCShop`'s item control: 8 columns × 15 rows. */
export const SHOP_COLUMNS = 8;
export const SHOP_ROWS = 15;
export const SHOP_SLOTS = SHOP_COLUMNS * SHOP_ROWS;

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
 * `CNewUIPickedItem`: the item hanging off the cursor, together with the
 * grid it was lifted out of. The storage matters because the move packet
 * carries both ends (`FromStorage` / `ToStorage`) and because a refusal has
 * to put the item back where it came from.
 */
export type PickedItem = {
  item: Item;
  fromSlot: number;
  fromStorage: StorageKind;
};

function itemSize(item: Item): { w: number; h: number } {
  const config = ItemsDatabase.getItem(item.group, item.num);
  return { w: config?.X ?? 1, h: config?.Y ?? 1 };
}

/**
 * First slot of `items`'s grid part where `item` fits (the original's
 * `FindEmptySlot`); -1 when the inventory is full.
 */
function findFreeInventorySlot(items: (Item | null)[], item: Item): number {
  const columns = InventoryConstants.RowSize;
  const first = InventoryConstants.LastEquippableItemSlotIndex + 1;
  const rows = Math.floor((items.length - first) / columns);
  const { w, h } = itemSize(item);

  const used = new Uint8Array(columns * rows);
  for (let square = 0; square < columns * rows; square++) {
    const placed = items[first + square];
    if (!placed) continue;
    const size = itemSize(placed);
    const column = square % columns;
    const row = (square - column) / columns;
    for (let y = 0; y < size.h; y++) {
      for (let x = 0; x < size.w; x++) {
        if (column + x < columns && row + y < rows) {
          used[(row + y) * columns + column + x] = 1;
        }
      }
    }
  }

  for (let row = 0; row + h <= rows; row++) {
    for (let column = 0; column + w <= columns; column++) {
      let fits = true;
      for (let y = 0; y < h && fits; y++) {
        for (let x = 0; x < w; x++) {
          if (used[(row + y) * columns + column + x]) {
            fits = false;
            break;
          }
        }
      }
      if (fits) return first + row * columns + column;
    }
  }

  return -1;
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

function serializeItemBytes(item: Item): number[] {
  if (item.raw && item.raw.length === ItemSerializer.NeededSpace) {
    return item.raw;
  }

  const bytes = new Uint8Array(ItemSerializer.NeededSpace);
  ItemSerializer.SerializeItem(bytes, item);
  return Array.from(bytes);
}

/**
 * The player's saved login. Where the client connects lives in
 * `common/serverConfig.ts` (server profiles), not here — the four endpoint
 * keys this blob used to carry are migrated out of it on first load.
 */
type ConfigType = {
  username?: string;
  password?: string;
  rememberLogin?: boolean;
};

export enum UIState {
  Preloader,
  Servers,
  Login,
  Characters,
  LoadingWorld,
  World,
}

class ActionBarSlot {
  itemId = 0;
  count = 0;
}

class ActionBar {
  q: ActionBarSlot | null = null;
  w: ActionBarSlot | null = null;
  e: ActionBarSlot | null = null;
  r: ActionBarSlot | null = null;

  num6: ActionBarSlot | null = null;
  num7: ActionBarSlot | null = null;
  num8: ActionBarSlot | null = null;
  num9: ActionBarSlot | null = null;
  num0: ActionBarSlot | null = null;

  selectedSkill = -1;

  constructor() {
    makeObservable(this, {
      q: observable,
      w: observable,
      e: observable,
      r: observable,
      num6: observable,
      num7: observable,
      num8: observable,
      num9: observable,
      num0: observable,
      selectedSkill: observable,
    });
  }
}

class PlayerData {
  money = 0;
  x = 0;
  y = 0;

  name = '';
  charClass: CharacterClassNumber = CharacterClassNumber.DarkKnight;

  leadership = 0;

  usedFruitPoints = 0;
  maxFruitPoints = 0;
  usedNegativeFruitPoints = 0;
  maxNegativeFruitPoints = 0;

  tileFlag = 0;

  actionBar = new ActionBar();

  currentHP = 25;
  maxHP = 40;
  currentMP = 80;
  maxMP = 100;
  currentSD = 10;
  maxSD = 12;
  currentAG = 10;
  maxAG = 12;

  level = 1;
  points = 5;
  masterLevel = 0;
  /**
   * Attack / magic speed as the server computed them (CurrentStatsExtended /
   * CharacterInformationExtended); null until received, then authoritative
   * over the client-side agility formula.
   */
  attackSpeed: number | null = null;
  magicSpeed: number | null = null;

  /** CharacterHeroState byte (the original's `Hero->PK`); 3 is Normal. */
  heroState = 3;

  exp = 50;
  currentLvlExp = 0;
  expToNextLvl = 100;

  str = 10;
  agi = 10;
  sta = 10;
  eng = 10;

  items: (Item | null)[] = new Array(
    InventoryConstants.InventoryRows * InventoryConstants.RowSize +
      InventoryConstants.EquippableSlotsCount
  ).fill(null);

  get leftHandSlot() {
    return this.items[InventoryConstants.LeftHandSlot];
  }

  get rightHandSlot() {
    return this.items[InventoryConstants.RightHandSlot];
  }

  get helmetSlot() {
    return this.items[InventoryConstants.HelmSlot];
  }

  get glovesSlot() {
    return this.items[InventoryConstants.GlovesSlot];
  }

  get bootsSlot() {
    return this.items[InventoryConstants.BootsSlot];
  }

  get pantsSlot() {
    return this.items[InventoryConstants.PantsSlot];
  }

  get armorSlot() {
    return this.items[InventoryConstants.ArmorSlot];
  }

  get wingsSlot() {
    return this.items[InventoryConstants.WingsSlot];
  }

  get pendantSlot() {
    return this.items[InventoryConstants.PendantSlot];
  }

  get ring1Slot() {
    return this.items[InventoryConstants.Ring1Slot];
  }

  get ring2Slot() {
    return this.items[InventoryConstants.Ring2Slot];
  }

  get petSlot() {
    return this.items[InventoryConstants.PetSlot];
  }

  get inventoryItems() {
    return this.items.slice(
      InventoryConstants.LastEquippableItemSlotIndex + 1,
      InventoryConstants.LastEquippableItemSlotIndex +
        1 +
        InventoryConstants.InventoryRows * InventoryConstants.RowSize
    );
  }

  get hpPercent() {
    return Scalar.Clamp(this.currentHP / Math.max(this.maxHP, 1), 0, 1);
  }

  get mpPercent() {
    return Scalar.Clamp(this.currentMP / Math.max(this.maxMP, 1), 0, 1);
  }

  get sdPercent() {
    return Scalar.Clamp(this.currentSD / Math.max(this.maxSD, 1), 0, 1);
  }

  get agPercent() {
    return Scalar.Clamp(this.currentAG / Math.max(this.maxAG, 1), 0, 1);
  }

  get expPercent() {
    return Scalar.Clamp(
      (this.exp - this.currentLvlExp) /
        Math.max(this.expToNextLvl - this.currentLvlExp, 1),
      0,
      1
    );
  }

  constructor() {
    makeObservable(this, {
      money: observable,
      x: observable,
      y: observable,
      tileFlag: observable,
      actionBar: observable,
      currentHP: observable,
      maxHP: observable,
      currentMP: observable,
      maxMP: observable,
      currentSD: observable,
      maxSD: observable,
      currentAG: observable,
      maxAG: observable,
      exp: observable,
      currentLvlExp: observable,
      expToNextLvl: observable,
      expPercent: computed,
      hpPercent: computed,
      mpPercent: computed,
      sdPercent: computed,
      agPercent: computed,
      str: observable,
      agi: observable,
      sta: observable,
      eng: observable,
      leadership: observable,
      name: observable,
      charClass: observable,
      usedFruitPoints: observable,
      maxFruitPoints: observable,
      usedNegativeFruitPoints: observable,
      maxNegativeFruitPoints: observable,
      level: observable,
      points: observable,
      items: observable,
      leftHandSlot: computed,
      rightHandSlot: computed,
      helmetSlot: computed,
      glovesSlot: computed,
      bootsSlot: computed,
      pantsSlot: computed,
      armorSlot: computed,
      wingsSlot: computed,
      pendantSlot: computed,
      ring1Slot: computed,
      ring2Slot: computed,
      petSlot: computed,
      inventoryItems: computed,
    });
  }

  setPosition(x: number, y: number) {
    runInAction(() => {
      this.x = x;
      this.y = y;
    });
  }

  setTileFlag(flag: number) {
    runInAction(() => {
      this.tileFlag = flag;
    });
  }
}

/**
 * `Store.addNotification` kind: `info` is `TYPE_SYSTEM_MESSAGE`, `error` is
 * `TYPE_ERROR_MESSAGE` of `g_pSystemLogBox->AddText`.
 */
export type NotificationType = 'info' | 'error';

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
 */
function applyOfflineHandOverrides(items: (Item | null)[]): void {
  const read = (name: string, slot: number) => {
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

    const [group, num, lvl] = raw.split(',').map(Number);
    if (Number.isFinite(group) && Number.isFinite(num)) {
      items[slot] = {
        group,
        num,
        lvl: Number.isFinite(lvl) ? lvl : 0,
        isExcellent: false,
      };
    }
  };

  read('hand1', InventoryConstants.LeftHandSlot);
  read('hand2', InventoryConstants.RightHandSlot);
}

export const Store = new (class _Store {
  csSocket?: WebSocket;
  gsSocket?: WebSocket;

  private encryptor?: SimpleModulusEncryptor;

  username = '';
  password = '';
  serverList: ReturnType<ServerListResponsePacket['getServers']> = [];
  /** `g_ServerListManager->GetSelectServerName()` / `Index`: the login window's server line. */
  selectedServer: { name: string; channel: number } | null = null;
  charactersList: ReturnType<CharacterListPacket['getCharacters']> = [];
  uiState = UIState.Preloader;
  playerId?: number;
  /**
   * The last game-server connection ended without us asking (set by
   * `onSocketLost`, cleared when the next game server connects). The server
   * list reads it to show the notice.
   */
  connectionLost = false;

  /** Learned skills from SkillListUpdate / SkillAdded / SkillRemoved (F3 11). */
  skills: { index: number; number: number; level: number }[] = [];
  /** Hero->CurrentSkill as a wire skill number; -1 = plain attack. */
  currentSkill = -1;
  /** WeatherStatusUpdate (0x0F): weather kind + variation of the current map. */
  weather = { weather: 0, variation: 0 };

  /** Active MagicEffectStatus effect ids of the hero (buff bar). */
  buffs: number[] = [];

  setBuff(effectId: number, active: boolean) {
    const has = this.buffs.includes(effectId);
    if (active && !has) this.buffs = this.buffs.concat(effectId);
    else if (!active && has) this.buffs = this.buffs.filter(b => b !== effectId);
  }

  /** Digit keys 1..9,0 → skill number (CNewUISkillList hot keys). */
  skillHotkeys: number[] = new Array(10).fill(-1);
  /**
   * `ApplyKeyConfiguration` (F3 30, `ReceiveOption`): the hot keys the server
   * saved for this character, by slot. Kept apart from `skillHotkeys` because
   * the packet may land before the skill list does; `refreshSkillSelection`
   * re-applies them once the skill is known.
   */
  savedSkillHotkeys: number[] = new Array(10).fill(-1);

  /** Restore the server-saved hot keys (`g_pMainFrame->SetSkillHotKey`). */
  applyKeyConfiguration(hotkeys: number[]) {
    const next = new Array(10).fill(-1);
    for (let i = 0; i < 10 && i < hotkeys.length; i++) next[i] = hotkeys[i];
    this.savedSkillHotkeys = next;
    this.refreshSkillSelection();
  }

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
    if (this.isOffline) return;
    const packet = PetInfoRequestPacket.createPacket();
    packet.Pet = pet;
    packet.Storage = storage;
    packet.ItemSlot = slot;
    this.sendToGS(packet.buffer);
  }

  /**
   * `giPetManager::SendPetCommand` → `SendPetCommandRequest`: put the Dark
   * Raven in a command mode; `AttackTarget` carries the target's id,
   * everything else 0xFFFF. The server confirms with `PetMode`.
   */
  sendPetCommand(mode: PetCommandModeEnum, targetId = 0xffff) {
    if (this.isOffline) return;
    const packet = PetCommandRequestPacket.createPacket();
    packet.PetType = PetTypeEnum.DarkRaven;
    packet.CommandMode = mode;
    packet.TargetId = mode === PetCommandModeEnum.AttackTarget ? targetId : 0xffff;
    this.sendToGS(packet.buffer);
  }

  // ---- MU Helper (`MUHelper::g_MuHelper`): state only, no UI yet ----

  muHelper = {
    /** Running (`Start`) vs paused (`Stop`). */
    active: false,
    /** The last zen the server charged for it (`ConsumeMoney`). */
    lastMoneyConsumed: 0,
    /** The saved config blob (`MuHelperConfigurationData`, 257 bytes). */
    config: null as Uint8Array | null,
  };

  setMuHelperStatus(active: boolean, moneyConsumed: number) {
    const changed = this.muHelper.active !== active;
    this.muHelper.active = active;
    if (moneyConsumed > 0) this.muHelper.lastMoneyConsumed = moneyConsumed;
    // `[MU Helper] Started` / `Stopped` (MuHelper.cpp:116/122) go to the console log.
    if (changed) {
      this.addNotification(
        t(active ? 'notify.helperStarted' : 'notify.helperStopped'),
        'info'
      );
    }
  }

  /**
   * `CMuHelper::Toggle` (the Start / Stop button of `CNewUIHeroPositionInfo`,
   * the Home key of the retail client): `MuHelperStatusChangeRequest` with
   * `PauseStatus` = running. `TriggerStart` refuses in a safe zone; the
   * server answers with `MuHelperStatusUpdate`, which flips `muHelper.active`.
   */
  toggleMuHelper() {
    if (this.isOffline) return;
    const active = this.muHelper.active;
    if (!active && this.world?.playerEntity?.attributeSystem?.isAboveZero('inSafeZone')) {
      this.addNotification(t('notify.helperSafeZone'), 'error');
      return;
    }
    const packet = MuHelperStatusChangeRequestPacket.createPacket();
    packet.PauseStatus = active;
    this.sendToGS(packet.buffer);
  }

  setMuHelperConfig(config: Uint8Array) {
    this.muHelper.config = config;
  }

  setSkillList(list: { index: number; number: number; level: number }[]) {
    this.skills = list.slice().sort((a, b) => a.index - b.index);
    this.refreshSkillSelection();
  }

  addSkill(skill: { index: number; number: number; level: number }) {
    this.skills = this.skills
      .filter(s => s.number !== skill.number)
      .concat(skill)
      .sort((a, b) => a.index - b.index);
    this.refreshSkillSelection();
  }

  removeSkill(number: number) {
    this.skills = this.skills.filter(s => s.number !== number);
    this.refreshSkillSelection();
  }

  selectSkill(number: number) {
    this.currentSkill = this.skills.some(s => s.number === number) ? number : -1;
  }

  /**
   * `CNewUISkillList::SetHotKey` (NewUIMainFrameWindow.cpp:1803): a skill
   * sits on one key only, so the key it held before is cleared. The layout
   * is sent to the server right away (the original saves it on leaving the
   * world; OpenMU accepts it at any time) so it survives a relog.
   */
  assignSkillHotkey(slot: number, number: number) {
    if (slot < 0 || slot > 9) return;
    const next = this.skillHotkeys.map(n => (n === number ? -1 : n));
    next[slot] = number;
    this.skillHotkeys = next;
    this.savedSkillHotkeys = next.slice();
    this.saveKeyConfiguration();
  }

  /**
   * `SaveOptions` (ZzzOpenData.cpp:4764): F3 30 with the ten hot keys as
   * big-endian skill numbers (0xFFFF = empty) followed by the option bytes
   * the client does not model yet (game options, Q/W/E/R, chat log, R,
   * QWER level), left zero.
   */
  private saveKeyConfiguration(): void {
    if (this.isOffline) return;
    const packet = SaveKeyConfigurationPacket.createPacket(4 + 20 + 1 + 3 + 1 + 1 + 1);
    const data = packet.buffer;
    for (let i = 0; i < 10; i++) {
      const number = this.skillHotkeys[i];
      data.setUint16(4 + i * 2, number >= 0 ? number : 0xffff, false);
    }
    this.sendToGS(packet.buffer);
  }

  private refreshSkillSelection() {
    if (!this.skills.some(s => s.number === this.currentSkill)) {
      this.currentSkill = -1;
    }
    // Unassigned hot keys default to the learned skills in order (1..9, 0).
    const next = this.skillHotkeys.map(n =>
      this.skills.some(s => s.number === n) ? n : -1
    );
    // Server-saved hot keys win over the defaults once the skill is learned.
    for (let slot = 0; slot < 10; slot++) {
      const saved = this.savedSkillHotkeys[slot];
      if (saved === -1 || next[slot] === saved) continue;
      if (!this.skills.some(s => s.number === saved)) continue;
      const prev = next.indexOf(saved);
      if (prev !== -1) next[prev] = -1;
      next[slot] = saved;
    }
    const used = new Set(next);
    // Master-tree entries and the siege commands are learned skills that never
    // sit on a bar slot, so they never claim one by default either.
    const free = this.skills
      .map(s => s.number)
      .filter(n => isHotbarSkill(n) && !used.has(n));
    for (let slot = 1; slot <= 10 && free.length; slot++) {
      const i = slot % 10;
      if (next[i] === -1) next[i] = free.shift()!;
    }
    this.skillHotkeys = next;
  }

  loginProcessing = false;
  loginError?: string;

  rememberLogin = true;

  loadingCharactersList = false;
  newCharName: string = '';
  newCharClass: CharacterClassNumber = CharacterClassNumber.DarkKnight;
  focusedChar: string = '';

  creationUnlockFlags: CharacterCreationUnlockFlagsEnum =
    CharacterCreationUnlockFlagsEnum.None;

  charCreationPending = false;

  msgWin: { code: MsgWinCode; text: string } | null = null;

  deletingChar: string | null = null;

  playerData = new PlayerData();

  /**
   * GuildInformation by guild id (the original's `GuildMark[]` table): what
   * `AssignCharacterToGuild` members print over their heads. Plain (not
   * observable) - the name tags re-read it every frame anyway.
   */
  readonly guilds = new Map<
    number,
    { name: string; alliance: string; logo: number[] }
  >();

  characterInfoEnabled = false;
  /** The learned-skill list window (K). */
  skillListEnabled = false;
  inventoryEnabled = false;
  optionsEnabled = false;
  emoteMenuEnabled = false;
  /** TAB minimap sheet (`INTERFACE_MINI_MAP`). */
  minimapEnabled = false;
  /** The Move command (warp list) window, M (`INTERFACE_MOVEMAP`). */
  warpWindowEnabled = false;

  sceneLoading = false;

  loadingProgress = 0;

  spritesLoading = true;

  get isLoading(): boolean {
    return this.sceneLoading || this.spritesLoading;
  }

  pickedItem: PickedItem | null = null;

  /** Q/W/E/R consumable kinds (`CNewUIItemHotKey`); unbound = the key's default potion. */
  itemHotkeys: ItemHotkey[] = Array.from({ length: HOTKEY_COUNT }, () => UNBOUND_HOTKEY);

  /** Names over every drop (CNewUINameWindow::m_bShowItemName, toggled by ALT). */
  showDropNames = false;

  pendingItemMove: {
    fromStorage: StorageKind;
    fromSlot: number;
    toStorage: StorageKind;
    toSlot: number;
  } | null = null;

  private pendingItemMoveTimer: ReturnType<typeof setTimeout> | null = null;

  private consumeBlockedUntil = 0;

  /** The merchant window (`CNewUINPCShop`); null while no NPC is talking. */
  npcShop: NpcShop | null = null;

  /** `REPAIR_MODE_ON`: the next inventory click repairs instead of picking. */
  repairMode = false;

  /** A buy request is in flight (`BuyCost != 0` blocks a second one). */
  shopBuyPending = false;

  private shopBuyTimer: ReturnType<typeof setTimeout> | null = null;

  /** The NPC a TalkToNpcRequest went out for, until the server answers. */
  private pendingNpcTalk: NpcTarget | null = null;

  /** Monster type of the NPC whose `NpcWindowResponse` is pending (0 = none). */
  get pendingNpcType(): number {
    return this.pendingNpcTalk?.npcType ?? 0;
  }

  config: ConfigType = {};

  /**
   * The game server being dialled, while it is unproven. `ConnectionInfo` names
   * an address the server believes clients reach it at, which is often not the
   * address that works from where the proxy sits — the OpenMU demo hands out its
   * public IP to a client on the same box. Under the `auto` policy the second
   * attempt is the connect-server host, which answered a moment ago.
   */
  private gsAttempt: {
    host: string;
    port: number;
    /** Where to retry; null when there is nothing left to try. */
    fallbackHost: string | null;
    timer: ReturnType<typeof setTimeout> | null;
  } | null = null;

  world: World | null = null;

  isOffline = location.href.includes('offline');

  constructor() {
    makeObservable(this, {
      username: observable,
      password: observable,
      serverList: observable,
      selectedServer: observable,
      uiState: observable,
      connectionLost: observable,
      playerId: observable,
      skills: observable,
      buffs: observable,
      weather: observable,
      currentSkill: observable,
      skillHotkeys: observable,
      petInfo: observable,
      petInfoByPet: observable,
      petMode: observable,
      petTargetId: observable,
      muHelper: observable,
      applyKeyConfiguration: action,
      setPetInfo: action,
      setPetMode: action,
      setMuHelperStatus: action,
      setMuHelperConfig: action,
      loginError: observable,
      loginProcessing: observable,
      rememberLogin: observable,
      charactersList: observable,
      loadingCharactersList: observable,
      newCharName: observable,
      newCharClass: observable,
      creationUnlockFlags: observable,
      charCreationPending: observable,
      focusedChar: observable,
      msgWin: observable,
      playerData: observable,
      world: observable,
      characterInfoEnabled: observable,
      skillListEnabled: observable,
      inventoryEnabled: observable,
      optionsEnabled: observable,
      emoteMenuEnabled: observable,
      minimapEnabled: observable,
      warpWindowEnabled: observable,
      sceneLoading: observable,
      loadingProgress: observable,
      spritesLoading: observable,
      isLoading: computed,
      pickedItem: observable,
      itemHotkeys: observable,
      pendingItemMove: observable,
      showDropNames: observable,
      npcShop: observable,
      repairMode: observable,
      shopBuyPending: observable,
      canRepair: computed,
      // Packet handlers (logic.ts) and the UI call these straight from a
      // non-action context; declaring them actions keeps strict mode quiet.
      setBuff: action,
      setSkillList: action,
      addSkill: action,
      removeSkill: action,
      selectSkill: action,
      assignSkillHotkey: action,
      setTestItems: action,
      playOffline: action,
      playOnline: action,
      onSocketLost: action,
    });

    // `HideAll` on the inventory hides the shop with it, and the repair
    // cursor never outlives the window it belongs to.
    reaction(
      () => this.inventoryEnabled,
      enabled => {
        if (enabled) return;
        this.closeNpcShop();
        runInAction(() => {
          this.repairMode = false;
        });
      }
    );

    this.loadConfig();
  }

  playOffline() {
    if (!this.world) return;

    const map = offlineMapFromUrl();
    const cls = offlineClassFromUrl() ?? CharacterClassNumber.DarkKnight;

    // Keep the query: a dev-server reload must land on the same map.
    history.replaceState(null, '', '/offline' + location.search);
    this.isOffline = true;
    this.uiState = UIState.World;
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
    applyOfflineHandOverrides(this.playerData.items);

    const testPlayer = spawnPlayer(this.world, { cls });
    this.world.addComponent(testPlayer, 'localPlayer', true);
    this.world.addComponent(testPlayer, 'worldIndex', map);
    testPlayer.objectNameInWorld = 'TestPlayer';

    this.playerData.name = 'TestPlayer';
    this.playerData.charClass = cls;
    this.syncPlayerAppearance();
    EventBus.emit('requestWarp', { map });
  }

  playOnline() {
    this.uiState = UIState.Servers;

    this.connectToConnectServer();
  }

  /**
   * A socket we did not close ourselves went away (`wsClosed` / `wsError`
   * from `createSocket`). Deliberate closes clear `gsSocket` / `csSocket`
   * first, so a close event for a socket that is no longer ours is ignored.
   * Losing the game server is the original's `case 2` of `ReceiveLogOut`:
   * the connection is gone, so start over at the server list, with a red
   * system-log line saying why. Losing the connect server only matters while
   * the server list is what we are looking at; it is reconnected in place.
   */
  onSocketLost(socket: WebSocket): void {
    if (socket === this.gsSocket) {
      this.gsSocket = undefined;
      this.encryptor = undefined;

      // The proxy closes the ws when its TCP connect fails, so this is where a
      // wrong `ConnectionInfo` address usually lands. One retry, then the
      // ordinary lost-connection path.
      if (this.retryGameServer('closed the connection')) return;

      runInAction(() => {
        this.connectionLost = true;
        this.loginProcessing = false;
      });
      this.addNotification(t('notify.connectionLost'), 'error');
      this.playOnline();
      return;
    }
    if (socket === this.csSocket) {
      this.csSocket = undefined;
      if (this.uiState === UIState.Servers) {
        this.addNotification(t('notify.serverListLost'), 'error');
        this.playOnline();
      }
    }
  }

  setTestItems() {
    const DragonSetIndex = 1;

    Store.playerData.items[InventoryConstants.HelmSlot] = {
      num: DragonSetIndex,
      group: ItemGroups.Helm,
      lvl: 9,
      isExcellent: false,
    };

    Store.playerData.items[InventoryConstants.ArmorSlot] = {
      num: DragonSetIndex,
      group: ItemGroups.Armor,
      lvl: 7,
      isExcellent: false,
    };

    Store.playerData.items[InventoryConstants.PantsSlot] = {
      num: DragonSetIndex,
      group: ItemGroups.Pants,
      lvl: 9,
      isExcellent: false,
    };

    Store.playerData.items[InventoryConstants.GlovesSlot] = {
      num: DragonSetIndex,
      group: ItemGroups.Gloves,
      lvl: 5,
      isExcellent: false,
    };

    Store.playerData.items[InventoryConstants.BootsSlot] = {
      num: DragonSetIndex,
      group: ItemGroups.Boots,
      lvl: 1,
      isExcellent: false,
    };

    const weapon = ItemsDatabase.getItem(3, 9);

    Store.playerData.items[InventoryConstants.LeftHandSlot] = {
      group: weapon.Group,
      num: weapon.Index,
      lvl: 9,
      isExcellent: false,
    };

    Store.playerData.items[InventoryConstants.LastEquippableItemSlotIndex + 1] =
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

    Store.playerData.items[grid + 2] = { group: 0, num: 0, lvl: 4, optionLevel: 1 };
    Store.playerData.items[grid + 3] = {
      group: 6,
      num: 0,
      lvl: 7,
      isExcellent: true,
      excellentFlags: 0x21,
      luck: true,
    };
    Store.playerData.items[grid + 5] = {
      group: 5,
      num: 0,
      lvl: 11,
      optionLevel: 2,
      hasSkill: false,
    };
    Store.playerData.items[grid + 6] = { group: 14, num: 0, durability: 3 };
    Store.playerData.items[grid + 7] = { group: 14, num: 13, durability: 1 };
    // Mana and shield stacks so the W / R bar slots have something to find.
    Store.playerData.items[grid + row + 6] = { group: 14, num: 5, durability: 5 };
    Store.playerData.items[grid + row + 7] = { group: 14, num: 35, durability: 2 };
    Store.playerData.items[grid + row * 4 + 2] = {
      group: 10,
      num: 5,
      lvl: 13,
      isAncient: true,
      ancientBonusLevel: 1,
      ancientDiscriminator: 1,
    };

    this.syncPlayerAppearance();
  }

  syncPlayerAppearance() {
    const playerData = this.playerData;
    const playerEntity = this.world?.playerEntity;

    if (!playerEntity || !playerEntity.charAppearance) return;

    playerEntity.charAppearance.helm = playerData.helmetSlot || null;
    playerEntity.charAppearance.armor = playerData.armorSlot || null;
    playerEntity.charAppearance.pants = playerData.pantsSlot || null;
    playerEntity.charAppearance.gloves = playerData.glovesSlot || null;
    playerEntity.charAppearance.boots = playerData.bootsSlot || null;
    playerEntity.charAppearance.leftHand = playerData.leftHandSlot || null;
    playerEntity.charAppearance.rightHand = playerData.rightHandSlot || null;
    playerEntity.charAppearance.wings = playerData.wingsSlot || null;
    // `c->Helper` (equipment slot 8): the Guardian Angel, the Imp and the two
    // horns. PetSystem spawns the world objects, PlayerObject.Pet carries the
    // body-linked Imp, and AnimationSystem reads it for the ride clips.
    playerEntity.charAppearance.pet = playerData.petSlot || null;
    playerEntity.charAppearance.changed = true;
  }

  private loadConfig(): void {
    // Only the credential keys: an install written before server profiles
    // existed also has csIp / csPort / wsHost / wsPort in here, which
    // `serverConfig.ts` migrates into a profile and this must not resurrect.
    const data = JSON.parse(
      LocalStorage.load(CONFIG_KEY) ?? '{}'
    ) as ConfigType;

    if (data) {
      this.config.username = data.username;
      this.config.password = data.password;
      this.config.rememberLogin = data.rememberLogin;
    }

    this.username = this.config.username ?? '';
    this.password = this.config.password ?? '';
    this.rememberLogin = this.config.rememberLogin ?? true;
  }

  saveConfig(): void {
    LocalStorage.save(CONFIG_KEY, JSON.stringify(this.config));
  }

  setSceneLoading(loading: boolean): void {
    if (this.sceneLoading === loading) return;

    runInAction(() => {
      this.sceneLoading = loading;
      if (loading) this.loadingProgress = 0;
    });
  }

  setLoadingProgress(progress: number): void {
    if (Math.abs(this.loadingProgress - progress) < 0.01) return;

    runInAction(() => {
      this.loadingProgress = progress;
    });
  }

  setSpritesLoading(loading: boolean): void {
    runInAction(() => {
      this.spritesLoading = loading;
    });
  }

  saveLoginData(): void {
    const c = this.config;
    c.rememberLogin = this.rememberLogin;

    if (this.rememberLogin) {
      c.username = this.username;
      c.password = this.password;
    } else {
      delete c.username;
      delete c.password;
    }

    this.saveConfig();
  }

  /**
   * Client-side feedback, the way the original gives it: a line in the
   * system log at the bottom left (`g_pSystemLogBox->AddText`, blue for
   * `TYPE_SYSTEM_MESSAGE`, red for `TYPE_ERROR_MESSAGE`) and the error
   * sound. Server notices never come through here - `ServerMessage` type 0
   * goes to the golden banner (`Notices.create`). The third argument is the
   * retired toast's delay, kept so no caller changes.
   */
  addNotification(text: string, type: NotificationType = 'info', _delay = 0) {
    if (type === 'error') {
      playUiSound('error');
      Social.errorMessage(text);
    } else {
      Social.systemMessage(text);
    }
  }

  sendToCS(buffer: DataView) {
    this.csSocket?.send(buffer);
  }

  sendToGS(buffer: DataView) {
    let packet = new Uint8Array(buffer.buffer);

    const header = packet[0];
    xor32.Encrypt(packet);
    if (this.encryptor && header >= 0xc3) {
      packet = this.encryptor.Encrypt(packet);
    }

    if (this.gsSocket?.readyState === WebSocket.OPEN) this.gsSocket.send(packet);
  }

  connectToConnectServer() {
    const { host, port } = connectServerAddress();

    const { socket } = createSocket({
      wsAddress: wsAddress(),
      tcpIP: host,
      tcpPort: port,
    });

    this.csSocket = socket;
  }

  disconnectFromConnectServer() {
    this.csSocket?.close();
    this.csSocket = undefined;
  }

  /**
   * Opens the game-server socket. `fallbackHost` is the address to try if this
   * one never answers — `gameServerTarget` decides which of the two addresses
   * (the one the server advertised, the connect-server host) goes first.
   */
  connectToGameServer(ip: string, port: number, fallbackHost: string | null = null) {
    runInAction(() => {
      this.connectionLost = false;
    });

    const { socket } = createSocket({
      wsAddress: wsAddress(),
      tcpIP: ip,
      tcpPort: port,
    });

    this.gsSocket = socket;

    this.encryptor = new SimpleModulusEncryptor();
    this.encryptor.encryptionKeys = SimpleModulusKeys.CreateEncryptionKeys([
      ...gameVersion.protocol.encryption.clientToServer,
    ]);

    this.gsAttempt = { host: ip, port, fallbackHost, timer: null };

    // The proxy closes the ws when the TCP connect fails, which is the fast
    // path into the retry. The timer is for the case with no close at all —
    // a firewall that drops the SYN, an address that routes nowhere.
    if (fallbackHost) {
      this.gsAttempt.timer = setTimeout(
        () => this.retryGameServer('never answered'),
        GS_ANSWER_TIMEOUT
      );
    }
  }

  /** `GameServerEntered` arrived: this address works, drop the fallback. */
  onGameServerReached(): void {
    if (this.gsAttempt?.timer) clearTimeout(this.gsAttempt.timer);
    this.gsAttempt = null;
  }

  /**
   * Second and last attempt at the game server, on the connect-server host.
   * Returns false when there is nothing to retry — the caller then treats the
   * dead socket as a lost connection, as it always did.
   */
  private retryGameServer(reason: string): boolean {
    const attempt = this.gsAttempt;

    if (!attempt?.fallbackHost) return false;

    if (attempt.timer) clearTimeout(attempt.timer);
    this.gsAttempt = null;

    console.warn(
      `game server ${attempt.host}:${attempt.port} ${reason}; retrying on ${attempt.fallbackHost}:${attempt.port}`
    );

    this.disconnectFromGameServer();
    this.connectToGameServer(attempt.fallbackHost, attempt.port);

    return true;
  }

  disconnectFromGameServer() {
    if (this.gsAttempt?.timer) clearTimeout(this.gsAttempt.timer);
    this.gsAttempt = null;
    this.gsSocket?.close();
    this.gsSocket = undefined;
  }

  /**
   * Join auth codes of a pending map-server switch. The original learns them
   * from C1 B1 00 (`ReceiveChangeMapServerInfo`); consumed by the next
   * `GameServerEntered`.
   */
  private pendingServerChange: {
    authCode1: number;
    authCode2: number;
    authCode3: number;
    authCode4: number;
  } | null = null;

  /**
   * `CSMServer::ConnectChangeMapServer`: drop the current game server on
   * purpose and dial the one hosting the destination map; `GameServerEntered`
   * then re-authenticates instead of opening the login form.
   */
  switchToMapServer(
    host: string,
    port: number,
    auth: NonNullable<typeof this.pendingServerChange>
  ): void {
    this.pendingServerChange = { ...auth };
    this.disconnectFromGameServer();
    this.connectToGameServer(host, port);
  }

  /**
   * `CSMServer::SendChangeMapServer` - C3 B1 01 with the XOR3 account and
   * character names, the join auth codes, tick count, version and serial.
   * Returns false when no switch is pending.
   */
  sendServerChangeAuthentication(): boolean {
    const pending = this.pendingServerChange;
    if (!pending) return false;
    this.pendingServerChange = null;

    const account = stringToBytes(this.username, SERVER_CHANGE_NAME_LENGTH);
    const character = stringToBytes(
      this.playerData.name,
      SERVER_CHANGE_NAME_LENGTH
    );
    Xor3Byte(account);
    Xor3Byte(character);

    const p = ServerChangeAuthenticationPacket.createPacket();
    p.setAccountXor3(account, SERVER_CHANGE_NAME_LENGTH);
    p.setCharacterNameXor3(character, SERVER_CHANGE_NAME_LENGTH);
    p.AuthCode1 = pending.authCode1;
    p.AuthCode2 = pending.authCode2;
    p.AuthCode3 = pending.authCode3;
    p.AuthCode4 = pending.authCode4;
    p.TickCount = Math.floor(performance.now()) >>> 0;
    p.setClientVersion(CLIENT_VERSION);
    p.setClientSerial(CLIENT_SERIAL);

    this.sendToGS(p.buffer);
    return true;
  }

  updateServerListRequest(): void {
    const buffer = ServerListRequestPacket.createPacket().buffer;
    this.sendToCS(buffer);
  }

  getConnectionInfoRequest(serverId: number): void {
    const connectionInfoRequestPacket =
      ConnectionInfoRequestPacket.createPacket();
    connectionInfoRequestPacket.ServerId = serverId;

    this.sendToCS(connectionInfoRequestPacket.buffer);
  }

  loginRequest(username: string, password: string) {
    const usernameBytes = stringToBytes(username, MAX_USERNAME_LENGTH);
    const passwordBytes = stringToBytes(password, MAX_PASSWORD_LENGTH);

    Xor3Byte(usernameBytes);
    Xor3Byte(passwordBytes);

    const loginShortPasswordPacket = LoginShortPasswordPacket.createPacket();
    loginShortPasswordPacket.setUsername(usernameBytes, usernameBytes.length);
    loginShortPasswordPacket.setPassword(passwordBytes, passwordBytes.length);
    loginShortPasswordPacket.setClientVersion(CLIENT_VERSION);
    loginShortPasswordPacket.setClientSerial(CLIENT_SERIAL);

    console.log(`send login`);
    this.sendToGS(loginShortPasswordPacket.buffer);
  }

  refreshCharactersListRequest(): void {
    runInAction(() => {
      this.loadingCharactersList = true;
    });
    const packet = RequestCharacterListPacket.createPacket();
    packet.Language = 0;
    this.sendToGS(packet.buffer);
  }

  focusCharacterRequest(name: string): void {
    const packet = FocusCharacterPacket.createPacket();
    packet.setName(name);
    this.sendToGS(packet.buffer);
  }

  selectCharacterRequest(name: string): void {
    const selectCharacterPacket = SelectCharacterPacket.createPacket();
    selectCharacterPacket.setName(name);

    const character = this.charactersList.find(c => c.Name === name);

    runInAction(() => {
      this.playerData.name = name;
      if (character) {
        this.playerData.charClass = classFromAppearance(character.Appearance);
        // CharacterInformation carries no level — the list entry is the only source
        // until the first CharacterLevelUpdate.
        this.playerData.level = character.Level;
      }
    });

    console.log(`select character [${name}]`);
    this.sendToGS(selectCharacterPacket.buffer);
  }

  increaseStatRequest(stat: number): void {
    const packet = IncreaseCharacterStatPointPacket.createPacket();
    packet.StatType = stat;
    this.sendToGS(packet.buffer);
  }

  deleteCharacterRequest(name: string, securityCode: string): void {
    this.deletingChar = name;

    const packet = DeleteCharacterPacket.createPacket();
    packet.setName(name);
    packet.setSecurityCode(securityCode);

    console.log(`delete character [${name}]`);
    this.sendToGS(packet.buffer);
  }

  popUpMsgWin(code: MsgWinCode, arg?: string): void {
    this.msgWin = { code, text: formatMsgWinText(code, arg) };
  }

  closeMsgWin(): void {
    this.msgWin = null;
  }

  createCharacterRequest(name: string, charClass: CharacterClassNumber): void {
    const packet = CreateCharacterPacket.createPacket();
    packet.setName(name);
    packet.Class = charClass;

    runInAction(() => {
      this.charCreationPending = true;
    });

    console.log(`create character [${name}] class ${charClass}`);
    this.sendToGS(packet.buffer);
  }

  addCreatedCharacter(character: {
    SlotIndex: number;
    Name: string;
    Level: number;
    Status: number;
    Appearance: DataView;
  }): void {
    runInAction(() => {
      const list = this.charactersList.filter(
        c => c.SlotIndex !== character.SlotIndex
      );

      list.push({
        ...character,
        IsItemBlockActive: false,
        GuildPosition: GuildMemberRoleEnum.Undefined,
      } as (typeof this.charactersList)[number]);

      list.sort((a, b) => a.SlotIndex - b.SlotIndex);

      this.charactersList = list;
      this.focusedChar = character.Name;
      this.charCreationPending = false;
      this.newCharName = '';
    });
  }

  sendAnimationRequest(rotation: number, animationNumber: number): void {
    const packet = AnimationRequestPacket.createPacket();
    packet.Rotation = rotation;
    packet.AnimationNumber = animationNumber;

    this.sendToGS(packet.buffer);
  }

  enterGateRequest(gateNumber: number): void {
    const packet = EnterGateRequestPacket.createPacket();
    packet.GateNumber = gateNumber;
    packet.TeleportTargetX = 0;
    packet.TeleportTargetY = 0;

    this.sendToGS(packet.buffer);
  }

  /**
   * `SendWarpCommandRequest` (C1 8E 02): a Move window row was clicked.
   * `index` is `MOVEREQINFO.index` from MoveReq_eng.bmd, which is the
   * `WarpInfo.Index` OpenMU looks up (`WarpHandlerPlugIn`). The original's
   * `CommandKey` is an anti-bot rolling key the server ignores, so it is 0.
   * The server answers with `MapChanged` or a blue message; nothing moves
   * locally.
   */
  warpCommandRequest(index: number): void {
    const packet = WarpCommandRequestPacket.createPacket();
    packet.CommandKey = 0;
    packet.WarpInfoIndex = index;

    this.sendToGS(packet.buffer);
  }

  /**
   * WalkRequest (0xD4). `x`/`y` is the tile the walk starts from — the one
   * the hero is logically standing on when the first step is taken, which
   * the server compares against its own position (PlayerMovement.
   * IsWalkRequestValidAsync, tolerance 5 tiles). At most 15 steps fit the
   * 4-bit count (MAX_PATH_FIND in the original client); longer paths are
   * sent in segments by NetworkSystem.
   */
  sendWalkPath(x: number, y: number, dirs: number[]): void {
    if (dirs.length === 0) return;
    if (dirs.length > 15) dirs = dirs.slice(0, 15);
    x = Math.round(x);
    y = Math.round(y);

    // Two steps per byte, first step in the high nibble (see WalkRequest in
    // the OpenMU packet docs); byte 5 carries rotation (high) + count (low).
    const packed = new Array<number>(Math.ceil(dirs.length / 2)).fill(0);
    for (let i = 0; i < dirs.length; i++) {
      const shift = i % 2 === 0 ? 4 : 0;
      packed[i >> 1] |= (dirs[i] & 0x0f) << shift;
    }

    const packet = WalkRequestPacket.createPacket(6 + packed.length);
    packet.SourceX = x;
    packet.SourceY = y;
    packet.StepCount = dirs.length;
    packet.TargetRotation = dirs[dirs.length - 1];
    packet.setDirections(packed, packed.length);

    this.sendToGS(packet.buffer);
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
    if (this.pendingItemMove || this.npcShop) return;

    this.pendingNpcTalk = npc;

    if (this.isOffline) {
      const which = this.offlineNpcWindow++ % 3;

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

    // A previous talk that never produced a window leaves OpenMU in
    // NpcDialogOpened; it ignores new talks until a CloseNpcRequest resets it.
    if (this.pendingNpcTalk) {
      this.sendToGS(CloseNpcRequestPacket.createPacket().buffer);
    }
    const packet = TalkToNpcRequestPacket.createPacket();
    packet.NpcId = npc.netId;
    this.sendToGS(packet.buffer);
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
      this.inventoryEnabled = true;
    });

    // ReceiveTalk (WSclient.cpp:6096): SOUND_CLICK01 + SOUND_INTERFACE01.
    playUiSound('window');
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

    if (!this.isOffline) {
      this.sendToGS(CloseNpcRequestPacket.createPacket().buffer);
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
    if (!shop || this.shopBuyPending || this.pickedItem || this.pendingItemMove) return;

    const item = shop.items[shopSlot];
    if (!item) return;

    if (this.isOffline) {
      this.buyOffline(item);
      return;
    }

    const packet = BuyItemFromNpcRequestPacket.createPacket();
    packet.ItemSlot = shopSlot;
    this.sendToGS(packet.buffer);

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

  /**
   * The carried item dropped onto the shop (`InventoryProcess`): sold, with
   * the original's two refusals - the money cap and the unsellable list.
   */
  sellPickedItemToNpc(): void {
    const picked = this.pickedItem;
    if (!picked || !this.npcShop || this.pendingItemMove) return;
    // `SendSellItemToNpcRequest` only knows inventory slots.
    if (picked.fromStorage !== StorageKind.Inventory) return;

    const price = itemValue(picked.item, 1);

    if (this.playerData.money + price > 2000000000) {
      this.addNotification(t('notify.zenCap'), 'error');
      return;
    }

    if (isSellingBanned(picked.item)) {
      this.addNotification(t('notify.cannotSell'), 'error');
      this.cancelPickedItem();
      return;
    }

    if (this.isOffline) {
      runInAction(() => {
        this.playerData.money += price;
        this.pickedItem = null;
        this.syncPlayerAppearance();
      });
      playUiSound('dropMoney');
      return;
    }

    const packet = SellItemToNpcRequestPacket.createPacket();
    packet.ItemSlot = picked.fromSlot;

    this.beginItemMove(
      picked.fromStorage,
      picked.fromSlot,
      StorageKind.Inventory,
      -1
    );
    this.sendToGS(packet.buffer);
  }

  /** NpcItemSellResult: the item is gone and the money is in - or neither. */
  itemSoldToNpc(success: boolean, money: number): void {
    if (!this.pendingItemMove) return;

    if (success) {
      this.confirmItemMove(-1, null);
      runInAction(() => {
        this.playerData.money = money;
      });
      playUiSound('dropMoney');
      return;
    }

    this.rollbackItemMove();
    this.addNotification(t('notify.merchantRefuses'), 'error');
  }

  /** Whether a repair can be asked for here: a smith, or self-repair from 50. */
  get canRepair(): boolean {
    if (this.npcShop) return this.npcShop.repairShop;
    return this.playerData.level >= SELF_REPAIR_LEVEL;
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
    if (!this.canRepair || this.pendingItemMove) return;

    const selfRepair = this.isSelfRepair;

    if (slot !== REPAIR_ALL_SLOT) {
      const item = this.playerData.items[slot];
      if (!item || isRepairBanned(item)) return;
      if (!needsRepair(item)) return;
    }

    if (this.isOffline) {
      this.repairOffline(slot, selfRepair);
      return;
    }

    const packet = RepairItemRequestPacket.createPacket();
    packet.ItemSlot = slot;
    packet.IsSelfRepair = selfRepair;
    this.sendToGS(packet.buffer);
  }

  /** The smith's second button (`m_BtnRepairAll`). */
  repairAllRequest(): void {
    this.repairItemRequest(REPAIR_ALL_SLOT);
  }

  /** The price of a full repair, as the repair bar of the shop shows it. */
  get repairAllPrice(): number {
    return repairAllCost(this.playerData.items, this.isSelfRepair);
  }

  private buyOffline(item: Item): void {
    const price = itemValue(item, 0);
    if (this.playerData.money < price) {
      this.addNotification('Not enough Zen', 'error');
      return;
    }

    const slot = findFreeInventorySlot(this.playerData.items, item);
    if (slot < 0) {
      this.addNotification(t('notify.noInventoryRoom'), 'error');
      return;
    }

    runInAction(() => {
      this.playerData.money -= price;
      this.playerData.items[slot] = { ...item };
    });
    playUiSound('getItem');
  }

  private repairOffline(slot: number, selfRepair: boolean): void {
    const slots =
      slot === REPAIR_ALL_SLOT
        ? this.playerData.items.map((_, i) => i)
        : [slot];

    let cost = 0;
    const repaired: Item[] = [];
    for (const i of slots) {
      const item = this.playerData.items[i];
      if (!item || !needsRepair(item)) continue;
      cost += repairCost(item, selfRepair);
      repaired.push(item);
    }

    if (repaired.length === 0) return;
    if (this.playerData.money < cost) {
      this.addNotification('Not enough Zen', 'error');
      return;
    }

    runInAction(() => {
      this.playerData.money -= cost;
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

  /**
   * The grid behind a storage kind. The inventory is the hero's own array;
   * vault, trade, chaos machine and the personal shop belong to `Economy`.
   *
   * `economy.ts` imports this module back, so `Economy` may only be read
   * from inside a method - by then both modules have finished evaluating.
   */
  itemsOfStorage(storage: StorageKind): (Item | null)[] {
    switch (storage) {
      case StorageKind.Inventory:
        return this.playerData.items;
      case StorageKind.Vault:
        return Economy.vaultItems;
      case StorageKind.Trade:
        return Economy.myTradeItems;
      case StorageKind.ChaosMachine:
        return Economy.mixItems;
      case StorageKind.PersonalShop:
        return Economy.myShopItems;
    }
  }

  pickInventoryItem(slot: number): void {
    this.pickItem(StorageKind.Inventory, slot);
  }

  /** `CNewUIInventoryCtrl::PickItem`: lift a square out of any open grid. */
  pickItem(storage: StorageKind, slot: number): void {
    if (this.pickedItem || this.pendingItemMove) return;

    const items = this.itemsOfStorage(storage);
    // An empty square (or one outside the grid) lifts nothing: never let a
    // `null` / `undefined` become the carried item.
    if (!Number.isInteger(slot) || slot < 0 || slot >= items.length) return;
    const item = items[slot];
    if (!item) return;

    runInAction(() => {
      items[slot] = null;
      this.pickedItem = { item, fromSlot: slot, fromStorage: storage };
      if (storage === StorageKind.Inventory) this.syncPlayerAppearance();
    });
  }

  cancelPickedItem(): void {
    const picked = this.pickedItem;
    if (!picked || this.pendingItemMove) return;

    runInAction(() => {
      this.itemsOfStorage(picked.fromStorage)[picked.fromSlot] = picked.item;
      this.pickedItem = null;
      if (picked.fromStorage === StorageKind.Inventory) this.syncPlayerAppearance();
    });
  }

  /**
   * `SendRequestEquipmentItem`: drop the carried item on a square of
   * `toStorage`. The client only paints the result once the server answers
   * with `ItemMoved`, so the square stays empty in the meantime.
   */
  placePickedItem(toSlot: number, toStorage: StorageKind = StorageKind.Inventory): void {
    const picked = this.pickedItem;
    // Nothing carried (or a carried record without an item) places nothing.
    if (!picked?.item || this.pendingItemMove) return;

    if (toSlot === picked.fromSlot && toStorage === picked.fromStorage) {
      this.cancelPickedItem();
      return;
    }

    // `IsStoreBan` / `IsTradeBan` / `IsPersonalShopBan`: refuse before the
    // packet goes out, the way the original logs it and puts the item back.
    const ban = storageBan(toStorage, picked.item);
    if (ban) {
      this.addNotification(ban, 'error');
      this.cancelPickedItem();
      return;
    }

    if (this.isOffline) {
      runInAction(() => {
        this.itemsOfStorage(toStorage)[toSlot] = picked.item;
        this.pickedItem = null;
        this.syncPlayerAppearance();
      });
      return;
    }

    this.moveItemRequest(
      picked.fromStorage,
      picked.fromSlot,
      toStorage,
      toSlot,
      picked.item
    );
  }

  /**
   * The raw `ItemMoveRequest` (0x24), with the pending-move guard. Slots go
   * in as local array indices; the packet carries the wire slots.
   */
  moveItemRequest(
    fromStorage: StorageKind,
    fromSlot: number,
    toStorage: StorageKind,
    toSlot: number,
    item: Item
  ): void {
    const packet = ItemMoveRequestPacket.createPacket();
    packet.FromStorage = fromStorage;
    packet.FromSlot = wireSlotOf(fromStorage, fromSlot);
    packet.ToStorage = toStorage;
    packet.ToSlot = wireSlotOf(toStorage, toSlot);
    packet.setItemData(serializeItemBytes(item), 12);

    this.beginItemMove(fromStorage, fromSlot, toStorage, toSlot);
    this.sendToGS(packet.buffer);
  }

  /**
   * `FindEmptySlot` on the far grid: the local index a right-click sends the
   * item to (`ProcessStorageItemAutoMove`), or -1 when there is no room.
   */
  findFreeSquare(storage: StorageKind, item: Item): number {
    const items = this.itemsOfStorage(storage);
    const columns = storageColumns(storage);
    const rows = storageRows(storage);
    const offset = gridFirstIndex(storage);
    const { w, h } = itemSize(item);

    const used = new Uint8Array(columns * rows);
    for (let square = 0; square < columns * rows; square++) {
      const placed = items[offset + square];
      if (!placed) continue;
      const size = itemSize(placed);
      const column = square % columns;
      const row = (square - column) / columns;
      for (let y = 0; y < size.h; y++) {
        for (let x = 0; x < size.w; x++) {
          if (column + x < columns && row + y < rows) {
            used[(row + y) * columns + column + x] = 1;
          }
        }
      }
    }

    for (let row = 0; row + h <= rows; row++) {
      for (let column = 0; column + w <= columns; column++) {
        let fits = true;
        for (let y = 0; y < h && fits; y++) {
          for (let x = 0; x < w; x++) {
            if (used[(row + y) * columns + column + x]) {
              fits = false;
              break;
            }
          }
        }
        if (fits) return offset + row * columns + column;
      }
    }

    return -1;
  }

  /**
   * `ProcessStorageItemAutoMove` / `ProcessMyInvenItemAutoMove`: the right
   * click that shuttles an item between the inventory and the open storage
   * without picking it up first.
   */
  autoMoveItem(fromStorage: StorageKind, fromSlot: number, toStorage: StorageKind): void {
    if (this.pickedItem || this.pendingItemMove) return;

    const item = this.itemsOfStorage(fromStorage)[fromSlot];
    if (!item) return;

    const ban = storageBan(toStorage, item);
    if (ban) {
      this.addNotification(ban, 'error');
      return;
    }

    const toSlot = this.findFreeSquare(toStorage, item);
    if (toSlot < 0) {
      this.addNotification(t('notify.noRoomForItem'), 'error');
      return;
    }

    if (this.isOffline) {
      runInAction(() => {
        this.itemsOfStorage(fromStorage)[fromSlot] = null;
        this.itemsOfStorage(toStorage)[toSlot] = item;
        this.syncPlayerAppearance();
      });
      playUiSound('getItem');
      return;
    }

    runInAction(() => {
      this.itemsOfStorage(fromStorage)[fromSlot] = null;
      this.pickedItem = { item, fromSlot, fromStorage };
      if (fromStorage === StorageKind.Inventory) this.syncPlayerAppearance();
    });

    this.moveItemRequest(fromStorage, fromSlot, toStorage, toSlot, item);
  }

  /** Ctrl+Q/W/E/R over an inventory item, or a carried potion dropped on the bar. */
  setItemHotkey(hotkey: number, item: Item | null): void {
    if (hotkey < 0 || hotkey >= HOTKEY_COUNT) return;
    const next = this.itemHotkeys.slice();
    next[hotkey] =
      item && canRegisterItemHotkey(item)
        ? { type: item.num, level: item.lvl ?? 0 }
        : UNBOUND_HOTKEY;
    this.itemHotkeys = next;
  }

  /** The inventory slot the Q/W/E/R key would consume right now, or -1. */
  hotkeyItemSlot(hotkey: number): number {
    return findHotkeyItem(this.playerData.items, hotkey, this.itemHotkeys[hotkey]);
  }

  /** Q/W/E/R pressed or the bar slot right-clicked (`CNewUIItemHotKey::UpdateKeyEvent`). */
  useItemHotkey(hotkey: number): void {
    const slot = this.hotkeyItemSlot(hotkey);
    if (slot >= 0) this.consumeItemRequest(slot);
  }

  /**
   * No server to answer in the offline scene: eat the potion here so the bar
   * and inventory behave (apple 10% .. large 100%, the original's tables).
   */
  private consumeItemOffline(slot: number): void {
    const item = this.playerData.items[slot];
    if (!item || item.group !== 14) return;

    const now = Date.now();
    if (now < this.consumeBlockedUntil) return;
    this.consumeBlockedUntil = now + 300;

    const n = item.num;
    const pd = this.playerData;
    const isHp = n <= 3;
    const isMp = n >= 4 && n <= 6;
    const isSd = n >= 35 && n <= 37;
    const isComplex = n >= 38 && n <= 40;
    const size = isHp ? n : isMp ? n - 3 : isSd ? n - 34 : isComplex ? n - 37 : 0;
    const ratio = [0.1, 0.3, 0.5, 1][size];
    const heal = (cur: number, max: number) => Math.min(max, cur + Math.ceil(max * ratio));

    runInAction(() => {
      if (isHp || isComplex) pd.currentHP = heal(pd.currentHP, pd.maxHP);
      if (isMp || isComplex) pd.currentMP = heal(pd.currentMP, pd.maxMP);
      if (isSd || isComplex) pd.currentSD = heal(pd.currentSD, pd.maxSD);

      const left = (item.durability ?? 1) - 1;
      if (left > 0) item.durability = left;
      else pd.items[slot] = null;
    });

    playUiSound(n === 0 ? 'eatApple' : 'drink');
  }

  /** The hero as `RenderItemInfo` compares against (`CharacterAttribute`). */
  heroStats(): HeroStats {
    const data = this.playerData;
    const { base, step } = classOf(data.charClass);

    return {
      level: data.level,
      str: data.str,
      agi: data.agi,
      vit: data.sta,
      ene: data.eng,
      cmd: data.leadership,
      baseClass: base,
      stepClass: step,
    };
  }

  /**
   * Right click on an orb / scroll / crystal (`CNewUIMyInventory::UseItem`,
   * NewUIMyInventory.cpp:1865): learn the skill it teaches. Returns false
   * when the item at `slot` teaches nothing (the caller may drink or equip
   * it instead); true when the click was handled - the request went out,
   * the skill was learned offline, or the reason it cannot be was said.
   * The server answers with `SkillAdded` (F3 11) and removes the item, or
   * with `ItemConsumptionFailed`.
   */
  learnSkillItem(slot: number): boolean {
    const item = this.playerData.items[slot];
    if (!item) return false;

    const number = learnableSkill(item);
    if (number === undefined) return false;

    const stats = itemStats(item);
    if (!stats) return false;

    const error = learnSkillError(
      item,
      stats,
      this.heroStats(),
      this.skills.map(s => s.number)
    );
    if (error) {
      this.addNotification(error, 'error');
      return true;
    }

    if (this.isOffline) {
      // No server to answer: the scroll is read here so the skill list (K)
      // and the hot keys behave.
      const index = this.skills.reduce((max, s) => Math.max(max, s.index), -1) + 1;
      runInAction(() => {
        this.playerData.items[slot] = null;
        this.addSkill({ index, number, level: 0 });
      });
      const name = skillDefinition(number)?.name ?? 'the skill';
      this.addNotification(t('notify.learnedSkill', { name }), 'info');
      return true;
    }

    this.consumeItemRequest(slot);
    return true;
  }

  consumeItemRequest(slot: number, targetSlot = 0): void {
    if (this.isOffline) {
      this.consumeItemOffline(slot);
      return;
    }

    // OpenMU refuses any consume unless PlayerState == EnteredWorld: a merchant
    // window still open makes a scroll / potion fail with a bare
    // ItemConsumptionFailed. The original closes the shop on the use click.
    if (this.npcShop) this.closeNpcShop();

    const now = Date.now();
    if (now < this.consumeBlockedUntil) return;
    this.consumeBlockedUntil = now + 300;

    // NewUIMyInventory.cpp:1699-1706: apple crunch or potion gulp on use.
    const consumed = this.playerData.items[slot];
    if (consumed && consumed.group === 14 && !isJewel(consumed)) {
      playUiSound(consumed.num === 0 ? 'eatApple' : 'drink');
    }

    const packet = ConsumeItemRequestPacket.createPacket();
    packet.ItemSlot = slot;
    packet.TargetSlot = targetSlot;
    packet.FruitConsumption = 0;

    this.sendToGS(packet.buffer);
  }

  /**
   * `CNewUIMyInventory::ApplyJewels` (NewUIMyInventory.cpp:1546): the carried
   * jewel is clicked onto the item at `targetSlot`. The jewel goes back to
   * its square and the 0x26 ConsumeItemRequest carries the target; the server
   * answers with `InventoryItemUpgraded` for the item and a durability /
   * removal packet for the jewel stack, or `ItemConsumptionFailed`.
   * Returns false when the drop was not a jewel use at all (caller may move).
   */
  applyPickedJewel(targetSlot: number): boolean {
    const picked = this.pickedItem;
    if (!picked?.item || this.pendingItemMove) return false;
    if (picked.fromStorage !== StorageKind.Inventory) return false;

    const target = this.playerData.items[targetSlot];
    if (!target || targetSlot === picked.fromSlot) return false;

    // `ApplyJewels` on worn gear: said, not swallowed - the equipment slot's
    // click handler returns right after this call, so the refusal text is
    // the only feedback there is.
    if (targetSlot < InventoryConstants.EquippableSlotsCount) {
      this.addNotification(
        jewelTargetError(picked.item, target, targetSlot) ?? 'Take the item off before upgrading it',
        'error'
      );
      return true;
    }

    // `IsCanUseItem` (ZzzInventory.cpp:510, GlobalText[474]): nothing is
    // used while the vault or a trade is open.
    if (Economy.autoMoveTarget !== null) {
      this.addNotification(t('notify.storageOpen'), 'error');
      return true;
    }

    const error = jewelTargetError(picked.item, target, targetSlot);
    if (error) {
      // The original keeps the jewel on the cursor; a wrong square is a no-op.
      this.addNotification(error, 'error');
      return true;
    }

    if (this.isOffline) {
      this.addNotification(t('notify.upgradeNeedsServer'), 'error');
      return true;
    }

    // Jewel back on its square so the stack packet that follows finds it.
    this.cancelPickedItem();
    // ApplyJewels: SOUND_GET_ITEM01 on the click, the jewel sound on the answer.
    playUiSound('getItem');
    this.consumeItemRequest(picked.fromSlot, targetSlot);
    return true;
  }

  /** `InventoryItemUpgraded` (0xF3 0x14): the item at `slot` is what the server says now. */
  upgradeInventoryItem(slot: number, item: Item): void {
    runInAction(() => {
      this.playerData.items[slot] = item;
      this.consumeBlockedUntil = 0;
      this.syncPlayerAppearance();
    });
    playUiSound('jewel');
  }

  /**
   * `ItemConsumptionFailed` (0x26 0xFD): nothing happened. The 300 ms
   * lock-out set by the request is left running: the refusal arrives within
   * a few ms, and clearing it let every further click send a new request
   * (and draw a new refusal) as fast as the mouse could go.
   */
  consumptionFailed(): void {}

  dropPickedItem(x: number, y: number): void {
    const picked = this.pickedItem;
    if (!picked || this.pendingItemMove) return;

    // `SendRequestDropItem` addresses the inventory only: an item lifted out
    // of the vault or a trade goes back where it came from.
    if (picked.fromStorage !== StorageKind.Inventory) {
      this.cancelPickedItem();
      return;
    }

    if (this.isOffline) {
      this.cancelPickedItem();
      return;
    }

    const packet = DropItemRequestPacket.createPacket();
    packet.TargetX = x;
    packet.TargetY = y;
    packet.ItemSlot = picked.fromSlot;

    this.beginItemMove(
      picked.fromStorage,
      picked.fromSlot,
      StorageKind.Inventory,
      -1
    );
    this.sendToGS(packet.buffer);
  }

  toggleDropNames(): void {
    runInAction(() => {
      this.showDropNames = !this.showDropNames;
    });
  }

  pickupItemRequest(itemNetId: number): void {
    if (this.isOffline) return;

    const packet = PickupItemRequestPacket.createPacket();
    packet.ItemId = itemNetId;

    this.sendToGS(packet.buffer);
  }

  private beginItemMove(
    fromStorage: StorageKind,
    fromSlot: number,
    toStorage: StorageKind,
    toSlot: number
  ): void {
    runInAction(() => {
      this.pendingItemMove = { fromStorage, fromSlot, toStorage, toSlot };
    });

    if (this.pendingItemMoveTimer) clearTimeout(this.pendingItemMoveTimer);

    this.pendingItemMoveTimer = setTimeout(() => {
      if (!this.pendingItemMove) return;

      console.warn('Item move timed out with no answer - rolling it back');
      this.rollbackItemMove();
      this.addNotification(t('notify.noAnswerRestored'), 'error');
    }, ITEM_MOVE_TIMEOUT);
  }

  confirmItemMove(
    toSlot: number,
    item?: Item | null,
    toStorage: StorageKind = StorageKind.Inventory
  ): void {
    this.clearItemMoveTimer();

    runInAction(() => {
      const moved = item ?? this.pickedItem?.item ?? null;

      if (moved && toSlot >= 0) this.itemsOfStorage(toStorage)[toSlot] = moved;
      // ReceiveInventoryItemMove (WSclient.cpp:6133): SOUND_GET_ITEM01.
      if (toSlot >= 0) playUiSound('getItem');

      this.pickedItem = null;
      this.pendingItemMove = null;
      this.syncPlayerAppearance();
    });
  }

  rollbackItemMove(): void {
    this.clearItemMoveTimer();

    runInAction(() => {
      const picked = this.pickedItem;
      const pending = this.pendingItemMove;

      const fromSlot = pending?.fromSlot ?? picked?.fromSlot;
      const fromStorage =
        pending?.fromStorage ?? picked?.fromStorage ?? StorageKind.Inventory;
      const source = this.itemsOfStorage(fromStorage);

      if (picked && fromSlot != null && !source[fromSlot]) {
        source[fromSlot] = picked.item;
      }

      this.pickedItem = null;
      this.pendingItemMove = null;
      this.syncPlayerAppearance();
    });
  }

  private clearItemMoveTimer(): void {
    if (!this.pendingItemMoveTimer) return;

    clearTimeout(this.pendingItemMoveTimer);
    this.pendingItemMoveTimer = null;
  }
})();

// `common/modelObject.ts` reaches Store through this handle instead of an
// import, which would close a cycle back to the monster classes (B14).
registerStore(Store);

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute the chain with a second `Store` instance (`store.ts?t=…`)
// that later-loaded modules import — an unconnected store whose actions do
// nothing.
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
