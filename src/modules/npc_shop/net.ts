import { CloseNpcRequestPacket } from '@versions/shared/packets/ClientToServerPackets';
import { Economy } from '../economy/economy';
import { EventBus } from '@/core/eventBus';
import { CastleSiegeTaxRateNotificationPacket, CastleSiegeTaxTypeEnum, ItemBoughtPacket, NpcItemSellResultPacket, NpcWindowResponseNpcWindowEnum, NpcWindowResponsePacket, StoreItemListItemWindowEnum, StoreItemListPacket } from '@versions/shared/packets/ServerToClientPackets';
import { ItemSerializer } from '@/controllers/item_rules';
import { Merchant } from './state';
import { MuWindows } from '@/controllers/interface';
import { Hero } from '@/modules/hero';
import { Session } from '@/modules/session';
import { addNotification } from '@/modules/chat';
import { events } from '../events';
import { JewelMix } from '../chaos_mix/jewelMix';
import { playUiSound } from '@/controllers/sound/sfx';
import { quests } from '../quests';
import { runInAction } from 'mobx';
import { t } from '@/i18n';

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  // --- NPC shop (ReceiveTalk / ReceiveShopItemList, WSclient.cpp) ---------------

  // ReceiveTaxInfo (WSclient.cpp:11299-11316): the castle's chaos machine and store taxes.
  EventBus.on('CastleSiegeTaxRateNotification', packet => {
    const p = new CastleSiegeTaxRateNotificationPacket(packet);
    if (p.TaxType === CastleSiegeTaxTypeEnum.ChaosMachine) runInAction(() => (Economy.chaosTaxRate = p.TaxRate));
    else if (p.TaxType === CastleSiegeTaxTypeEnum.Store) Merchant.setStoreTaxRate(p.TaxRate);
  });

  EventBus.on('NpcWindowResponse', packet => {
    const p = new NpcWindowResponsePacket(packet);

    // ReceiveTalk ends every case with SOUND_CLICK01 + SOUND_INTERFACE01
    // (WSclient.cpp:6563-6564); the legacy quest window chimes on its own.
    playUiSound('click');
    switch (p.Window) {
      case NpcWindowResponseNpcWindowEnum.Merchant:
      case NpcWindowResponseNpcWindowEnum.Merchant1:
        Merchant.openNpcShop();
        break;
      case NpcWindowResponseNpcWindowEnum.VaultStorage:
        Merchant.dropNpcTalk();
        Economy.openVault();
        break;
      case NpcWindowResponseNpcWindowEnum.ChaosMachine:
        Merchant.dropNpcTalk();
        Economy.openMix();
        break;
      // The Pet Trainer's Dark Horse / Dark Raven tray.
      case NpcWindowResponseNpcWindowEnum.PetTrainer:
        Merchant.dropNpcTalk();
        Economy.openMix('petTrainer');
        break;
      case NpcWindowResponseNpcWindowEnum.ChaosCardCombination:
        Merchant.dropNpcTalk();
        Economy.openMix('chaosCard');
        break;
      case NpcWindowResponseNpcWindowEnum.DevilSquare:
        Merchant.dropNpcTalk();
        events.openDevilSquare();
        break;
      case NpcWindowResponseNpcWindowEnum.BloodCastle:
        Merchant.dropNpcTalk();
        events.openBloodCastle();
        break;
      case NpcWindowResponseNpcWindowEnum.DoorkeeperTitusDuelWatch:
        Merchant.dropNpcTalk();
        events.openDuelWatch();
        break;
      case NpcWindowResponseNpcWindowEnum.LugardDoppelgangerEntry:
        Merchant.dropNpcTalk();
        events.openDoppelganger();
        break;
      case NpcWindowResponseNpcWindowEnum.SeedMaster:
        // CSeedMasterMenuMsgBox / CSeedInvestigatorMenuMsgBox (WSclient.cpp:6503-6511).
        Merchant.dropNpcTalk();
        Economy.openSeedMenu('master');
        break;
      case NpcWindowResponseNpcWindowEnum.SeedResearcher:
        Merchant.dropNpcTalk();
        Economy.openSeedMenu('researcher');
        break;
      case NpcWindowResponseNpcWindowEnum.Lahap:
        // CGemIntegrationMsgBox (WSclient.cpp:6446-6454); its Close tells the server.
        Merchant.dropNpcTalk();
        JewelMix.open();
        break;
      default:
        // A legacy quest NPC (Sebina, Marlon, Apostle Devin…): the dialog is
        // client-side, from Quest_eng.bmd (modules/quests/legacyQuests.ts).
        if (quests.openNpcWindow(p.Window, Merchant.pendingNpcType)) return;
        // The refineries and the rest: not ported yet.
        console.warn(`NpcWindowResponse: window ${p.Window} is not supported yet`);
        Merchant.dropNpcTalk();
        addNotification(t('notify.npcNothingYet'), 'info');
        // OpenMU keeps the player in NpcDialogOpened after opening ANY window
        // (TalkNpcAction.cs) - without this reset it ignores every later
        // TalkToNpcRequest until relogin (the "one refusal bricks all NPCs" bug).
        Session.sendToGS(CloseNpcRequestPacket.createPacket().buffer);
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

    // A failed pet mix comes back as ResurrectionFailed (OpenMU ItemCraftAction.cs).
    if (p.Type === StoreItemListItemWindowEnum.ChaosMachine || p.Type === StoreItemListItemWindowEnum.ResurrectionFailed) {
      Economy.setMixItems(entries);
      return;
    }

    if (p.Type !== StoreItemListItemWindowEnum.Normal) return;

    if (Economy.vaultOpen) {
      Economy.setVaultItems(entries);
      return;
    }

    Merchant.setNpcShopItems(entries);
  });

  EventBus.on('ItemBought', packet => {
    const p = new ItemBoughtPacket(packet);

    const item = ItemSerializer.DeserializeItem(new Uint8Array(p.ItemData.buffer));

    // ReceiveBuyExtended (WSclient.cpp:6653): SOUND_GET_ITEM01 whatever was bought.
    playUiSound('getItem');

    runInAction(() => {
      Hero.items[p.InventorySlot] = item;
    });

    Merchant.finishShopBuy();
    Hero.syncPlayerAppearance();
  });

  EventBus.on('NpcItemBuyFailed', () => {
    Merchant.shopBuyFailed();
  });

  EventBus.on('NpcItemSellResult', packet => {
    const p = new NpcItemSellResultPacket(packet);
    Merchant.itemSoldToNpc(p.Success, p.Money);
  });

  // `UpdateSendMoveInterface` (NewUISystem.cpp:2025, from SendMove ZzzInterface.cpp:1876): a walk
  // cancels the trade and closes the vault, both shop windows and the NPC entry windows; the
  // merchant, vault and trade take the inventory with them (`Hide`, NewUISystem.cpp:1313-1410).
  // The quest windows close in their own listeners; the chaos machine stays.
  EventBus.on('heroWalked', () => {
    const docked = !!Merchant.npcShop || Economy.vaultOpen || Economy.tradeOpen;
    Economy.cancelTrade();
    Economy.closeVault();
    Economy.closeMyShop();
    Economy.closeBrowsedShop();
    events.closeEntryWindows();
    // The merchant closes with the inventory (state.ts).
    if (docked) MuWindows.setOpen('inventory', false);
  });
}
