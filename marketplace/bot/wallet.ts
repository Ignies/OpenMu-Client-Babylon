import {
  CharacterInformationPacket,
  InventoryMoneyUpdatePacket,
  ItemAddedToInventoryPacket,
} from '../../src/common/packets/ServerToClientPackets';
import type { BotConnection, Frame } from './connection';
import { view } from './session';

/**
 * What the bot is holding, as the server last reported it.
 *
 * The bot needs its own balance for one reason: to check afterwards that a
 * handover moved what it was supposed to move. The server destroys Zen left on
 * a cancelled trade
 * (`issues/trade/zen_destroyed_when_a_trade_is_cancelled.md`), and a bot
 * carrying a float has no way to notice that from its own books unless it is
 * watching the number the server reports.
 *
 * `InventoryMoneyUpdate` (0x22/0xFE) is the server telling us the balance
 * outright, so nothing here adds up deltas of its own - the whole point is to
 * compare our arithmetic against the server's truth.
 */

const CODE = {
  moneyUpdate: { code: 0x22, sub: 0xfe },
  itemAdded: { code: 0x22 },
  /** Sent on entering the world, and the only packet that states the opening balance. */
  characterInformation: { code: 0xf3, sub: 0x03 },
} as const;

export class Wallet {
  /** Zen the server last told us we have; null until it has said so. */
  zen: number | null = null;
  /** Items the server has told us arrived, since the last reset. */
  itemsReceived = 0;

  private readonly unsubscribe: () => void;

  constructor(
    connection: BotConnection,
    private readonly log: (message: string) => void = () => {}
  ) {
    this.unsubscribe = connection.on(frame => this.handle(frame));
  }

  dispose(): void {
    this.unsubscribe();
  }

  resetItemCount(): void {
    this.itemsReceived = 0;
  }

  /**
   * Waits for the server to state a balance. Called once after entering the
   * world: a bot that starts a handover without knowing its balance cannot
   * reconcile it afterwards, and would rather refuse than guess.
   */
  async waitForBalance(timeoutMs = 15_000): Promise<number> {
    const deadline = Date.now() + timeoutMs;
    while (this.zen === null) {
      if (Date.now() >= deadline) {
        throw new Error('the server never reported the wallet balance');
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    return this.zen;
  }

  private handle(frame: Frame): void {
    // The opening balance. `InventoryMoneyUpdate` is only sent when the money
    // *changes*, so without this the bot would not know what it holds until
    // its first trade moved some - too late to reconcile that trade.
    if (
      frame.code === CODE.characterInformation.code &&
      frame.sub === CODE.characterInformation.sub
    ) {
      try {
        const money = new CharacterInformationPacket(view(frame)).Money;
        this.zen = money;
        this.log(`wallet: opening balance ${money} Zen`);
      } catch {
        // A layout we cannot read; `waitForBalance` will time out and say so.
      }
      return;
    }

    if (frame.code === CODE.moneyUpdate.code && frame.sub === CODE.moneyUpdate.sub) {
      const money = new InventoryMoneyUpdatePacket(view(frame)).Money;
      if (this.zen !== money) this.log(`wallet: ${this.zen ?? '?'} -> ${money} Zen`);
      this.zen = money;
      return;
    }

    // Same code, no sub-code: an item landed in the bag.
    if (frame.code === CODE.itemAdded.code && frame.sub !== CODE.moneyUpdate.sub) {
      try {
        new ItemAddedToInventoryPacket(view(frame));
        this.itemsReceived++;
      } catch {
        // Not the layout we expected; the money check is the one that matters.
      }
    }
  }
}
