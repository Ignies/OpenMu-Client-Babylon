import { CloseNpcRequestPacket } from '@versions/shared/packets/ClientToServerPackets';
import { Economy } from '../economy/economy';
import { EventBus } from '@/core/eventBus';
import { ItemBoughtPacket, NpcItemSellResultPacket, NpcWindowResponseNpcWindowEnum, NpcWindowResponsePacket, StoreItemListItemWindowEnum, StoreItemListPacket } from '@versions/shared/packets/ServerToClientPackets';
import { ItemSerializer } from '../items/itemSerializer';
import { Store } from '@/app/store';
import { events } from '../events';
import { playUiSound } from '@/controllers/sound/sfx';
import { quests } from '../quests';
import { runInAction } from 'mobx';
import { t } from '@/i18n';

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  // --- NPC shop (ReceiveTalk / ReceiveShopItemList, WSclient.cpp) ---------------

  EventBus.on('NpcWindowResponse', packet => {
    const p = new NpcWindowResponsePacket(packet);

    // ReceiveTalk ends every case with SOUND_CLICK01 + SOUND_INTERFACE01
    // (WSclient.cpp:6563-6564); the legacy quest window chimes on its own.
    playUiSound('click');
    switch (p.Window) {
      case NpcWindowResponseNpcWindowEnum.Merchant:
      case NpcWindowResponseNpcWindowEnum.Merchant1:
        Store.openNpcShop();
        break;
      case NpcWindowResponseNpcWindowEnum.VaultStorage:
        Store.dropNpcTalk();
        Economy.openVault();
        break;
      case NpcWindowResponseNpcWindowEnum.ChaosMachine:
        Store.dropNpcTalk();
        Economy.openMix();
        break;
      case NpcWindowResponseNpcWindowEnum.ChaosCardCombination:
        Store.dropNpcTalk();
        Economy.openMix('chaosCard');
        break;
      case NpcWindowResponseNpcWindowEnum.DevilSquare:
        Store.dropNpcTalk();
        events.openDevilSquare();
        break;
      case NpcWindowResponseNpcWindowEnum.BloodCastle:
        Store.dropNpcTalk();
        events.openBloodCastle();
        break;
      case NpcWindowResponseNpcWindowEnum.DoorkeeperTitusDuelWatch:
        Store.dropNpcTalk();
        events.openDuelWatch();
        break;
      case NpcWindowResponseNpcWindowEnum.LugardDoppelgangerEntry:
        Store.dropNpcTalk();
        events.openDoppelganger();
        break;
      default:
        // A legacy quest NPC (Sebina, Marlon, Apostle Devin…): the dialog is
        // client-side, from Quest_eng.bmd (modules/quests/legacyQuests.ts).
        if (quests.openNpcWindow(p.Window, Store.pendingNpcType)) return;
        // Lahap, the refineries…: not ported yet.
        console.warn(`NpcWindowResponse: window ${p.Window} is not supported yet`);
        Store.dropNpcTalk();
        Store.addNotification(t('notify.npcNothingYet'), 'info');
        // OpenMU keeps the player in NpcDialogOpened after opening ANY window
        // (TalkNpcAction.cs) - without this reset it ignores every later
        // TalkToNpcRequest until relogin (the "one refusal bricks all NPCs" bug).
        Store.sendToGS(CloseNpcRequestPacket.createPacket().buffer);
        break;
    }
    playUiSound('window');
  });

  /**
   * `ReceiveShopItemList`: the same 0x31 carries the merchant's stock, the
   * vault's contents and the chaos machine's tray. `Normal` goes to whichever
   * of the two storage windows is open, the merchant otherwise.
   */
  EventBus.on('StoreItemList', packet => {
    const p = new StoreItemListPacket(packet);

    const entries = p.getItems().map(entry => ({
      slot: entry.ItemSlot,
      item: ItemSerializer.DeserializeItem(new Uint8Array(entry.ItemData.buffer)),
    }));

    if (p.Type === StoreItemListItemWindowEnum.ChaosMachine) {
      Economy.setMixItems(entries);
      return;
    }

    if (p.Type !== StoreItemListItemWindowEnum.Normal) return;

    if (Economy.vaultOpen) {
      Economy.setVaultItems(entries);
      return;
    }

    Store.setNpcShopItems(entries);
  });

  EventBus.on('ItemBought', packet => {
    const p = new ItemBoughtPacket(packet);

    const item = ItemSerializer.DeserializeItem(new Uint8Array(p.ItemData.buffer));

    // ReceiveBuyExtended (WSclient.cpp:6653): SOUND_GET_ITEM01 whatever was bought.
    playUiSound('getItem');

    runInAction(() => {
      Store.playerData.items[p.InventorySlot] = item;
    });

    Store.finishShopBuy();
    Store.syncPlayerAppearance();
  });

  EventBus.on('NpcItemBuyFailed', () => {
    Store.shopBuyFailed();
  });

  EventBus.on('NpcItemSellResult', packet => {
    const p = new NpcItemSellResultPacket(packet);
    Store.itemSoldToNpc(p.Success, p.Money);
  });
}
