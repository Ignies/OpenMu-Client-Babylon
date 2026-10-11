import { action, runInAction } from 'mobx';
import { characterSkinBody, type PlayerObject } from '../controllers/actors';
import { CharacterClassNumber, ENUM_WORLD } from '@/core/types';
import type { Item } from '../ecs/world';
import { EventBus } from '../core/eventBus';
import { InventoryConstants } from '@/core/inventoryConstants';
import { ItemGroups } from '@versions/shared/objects/enum';
import { devVitalPercent } from '../core/devSeams';
import { Ecs } from '../ecs/current';
import { AppState, UIState } from '../controllers/interface/uiState';
import { Session } from '../modules/session';
import { Hero } from '../modules/hero';
import { spawnPlayer } from '../modules/scope/net';

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

/** `?hp=` / `?mp=` on the offline route: the bars start where they say. */
function applyOfflineVitals(): void {
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

/** The test loadout: a dragon set, a weapon, and a spread of the grid. */
function setTestItems(): void {
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

  Hero.items[InventoryConstants.LastEquippableItemSlotIndex + 1] = {
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

/**
 * The offline test scene (`/offline`, or the preloader's Play Offline): no server, a test hero
 * spawned on the map `?map=` names, with the test loadout unless `?bare`.
 */
export const playOffline = action('playOffline', (): void => {
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
  if (!bare) setTestItems();
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
  applyOfflineVitals();
  EventBus.emit('requestWarp', { map });
});
