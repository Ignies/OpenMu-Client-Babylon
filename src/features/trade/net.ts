import { Economy } from '../economy/economy';
import { EventBus } from '@/core/eventBus';
import { ItemSerializer } from '../items/itemSerializer';
import { Social } from '../social/social';
import { TradeButtonStateChangedPacket, TradeFinishedPacket, TradeItemAddedPacket, TradeItemRemovedPacket, TradeMoneyUpdatePacket, TradeRequestAnswerPacket, TradeRequestPacket as TradeRequestS2CPacket } from '@versions/shared/packets/ServerToClientPackets';
import { cleanName } from '../chat/chat';
import { t } from '@/i18n';

// --- Trade (CNewUITrade) -----------------------------------------------------

EventBus.on('TradeRequest', packet => {
  const p = new TradeRequestS2CPacket(packet);
  Economy.incomingTradeRequest(cleanName(p.Name));
});

EventBus.on('TradeRequestAnswer', packet => {
  const p = new TradeRequestAnswerPacket(packet);

  if (!p.Accepted) {
    Social.errorMessage(t('trade.refused'));
    return;
  }

  Economy.openTrade({
    name: cleanName(p.Name),
    level: p.TradePartnerLevel,
    guildId: p.GuildId,
  });
});

EventBus.on('TradeItemAdded', packet => {
  const p = new TradeItemAddedPacket(packet);
  const item = ItemSerializer.DeserializeItem(new Uint8Array(p.ItemData.buffer));
  Economy.setYourTradeItem(p.ToSlot, item);
});

EventBus.on('TradeItemRemoved', packet => {
  const p = new TradeItemRemovedPacket(packet);
  Economy.setYourTradeItem(p.Slot, null);
});

EventBus.on('TradeMoneySetResponse', () => Economy.tradeMoneyAccepted());

EventBus.on('TradeMoneyUpdate', packet => {
  const p = new TradeMoneyUpdatePacket(packet);
  Economy.partnerTradeMoney(p.MoneyAmount);
});

EventBus.on('TradeButtonStateChanged', packet => {
  const p = new TradeButtonStateChangedPacket(packet);
  Economy.partnerConfirm(p.State);
});

EventBus.on('TradeFinished', packet => {
  const p = new TradeFinishedPacket(packet);
  Economy.tradeFinished(p.Result);
});
