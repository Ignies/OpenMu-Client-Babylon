import {
  ItemMoveRequestPacket,
  SetTradeMoneyPacket,
  TradeButtonStateChangePacket,
  TradeButtonStateEnum,
  TradeCancelPacket,
  TradeRequestPacket,
  TradeRequestResponsePacket,
} from '../../src/common/packets/ClientToServerPackets';
import {
  TradeButtonStateChangedPacket,
  TradeButtonStateChangedTradeButtonStateEnum,
  TradeFinishedPacket,
  TradeFinishedTradeResultEnum,
  TradeItemAddedPacket,
  TradeMoneyUpdatePacket,
  TradeRequestAnswerPacket,
  TradeRequestPacket as IncomingTradeRequestPacket,
} from '../../src/common/packets/ServerToClientPackets';
import { StorageKind } from '../../src/common/itemStorage';
import type { BotConnection, Frame } from './connection';
import { view } from './session';

/**
 * The bot's half of an in-game trade.
 *
 * The game server owns the exchange: it validates both sides and moves the
 * goods atomically, so the worst a bug here can do is fail a trade, never
 * duplicate an item or take payment without delivering. That property is why
 * the marketplace hands everything over this way instead of writing to the
 * database, and it is worth not undermining: this class never confirms
 * without first checking that what is on the table is what was agreed.
 */

const CODE = {
  request: { code: 0x36 },
  answer: { code: 0x37 },
  itemAdded: { code: 0x39 },
  moneyUpdate: { code: 0x3b },
  buttonState: { code: 0x3c },
  finished: { code: 0x3d },
} as const;

export type TradeSlotItem = { slot: number; data: Uint8Array };

export type TradeOutcome =
  | { ok: true }
  | { ok: false; reason: string; result?: TradeFinishedTradeResultEnum };

/** What the bot expects to be on the table before it will confirm. */
export type TradeTerms = {
  /** Zen the partner must be offering. */
  expectMoney?: number;
  /** How many items the partner must have put in. */
  expectItems?: number;
};

export class TradeSession {
  /** Items the partner has put on the table, by trade slot. */
  readonly theirItems = new Map<number, Uint8Array>();
  theirMoney = 0;
  theirConfirm = false;
  partner: string | null = null;

  private open = false;
  private finished: ((outcome: TradeOutcome) => void) | null = null;
  private readonly unsubscribe: () => void;

  constructor(
    private readonly connection: BotConnection,
    private readonly log: (message: string) => void = () => {}
  ) {
    this.unsubscribe = connection.on(frame => this.handle(frame));
  }

  dispose(): void {
    this.unsubscribe();
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Asks a player in view to trade. Their id only exists while they are visible. */
  async requestWith(playerId: number, timeoutMs = 20_000): Promise<void> {
    const answer = this.connection.expect(CODE.answer, timeoutMs, 'TradeRequestAnswer');
    const packet = TradeRequestPacket.createPacket();
    packet.PlayerId = playerId;
    this.connection.send(packet.buffer);
    this.readAnswer(await answer);
  }

  /** Accepts a trade the partner opened. */
  async accept(timeoutMs = 20_000): Promise<void> {
    const answer = this.connection.expect(CODE.answer, timeoutMs, 'TradeRequestAnswer');
    const packet = TradeRequestResponsePacket.createPacket();
    packet.TradeAccepted = true;
    this.connection.send(packet.buffer);
    this.readAnswer(await answer);
  }

  private readAnswer(frame: Frame): void {
    const answer = new TradeRequestAnswerPacket(view(frame));
    if (!answer.Accepted) throw new Error('the trade was refused');
    this.open = true;
    this.partner = answer.Name;
    this.theirItems.clear();
    this.theirMoney = 0;
    this.theirConfirm = false;
    this.log(`trading with ${this.partner}`);
  }

  /** Puts Zen on the table. */
  setMoney(amount: number): void {
    const packet = SetTradeMoneyPacket.createPacket();
    packet.Amount = amount;
    this.connection.send(packet.buffer);
  }

  /**
   * Moves an item from the bag onto the trade table.
   *
   * `inventorySlot` is the wire slot, so the bag starts at 12 - the first
   * twelve are the equipment slots. The storage values come from `StorageKind`,
   * *not* from the generated `StorageTypeEnum`: those are two different enums
   * and they disagree. The wire wants OpenMU's `ItemStorageKind`, where trade
   * is 1; `StorageTypeEnum.TradeOwn` is 2, which the server reads as the vault
   * and refuses. The item's binary is sent zeroed: OpenMU's
   * move handler resolves the item from the slot it is in and ignores the
   * payload ("we don't transmit the item binary data anymore in this extended
   * message"), so inventing a serialisation here would only be a way to get it
   * wrong.
   */
  offerItem(inventorySlot: number, tradeSlot: number): void {
    const packet = ItemMoveRequestPacket.createPacket();
    packet.FromStorage = StorageKind.Inventory;
    packet.FromSlot = inventorySlot;
    packet.ToStorage = StorageKind.Trade;
    packet.ToSlot = tradeSlot;
    packet.setItemData(new Uint8Array(12), 12);
    this.connection.send(packet.buffer);
  }

  /**
   * Ticks our accept box. Any change on either side clears both boxes server
   * side, so this is only ever sent once the table already matches the terms.
   */
  private setConfirm(checked: boolean): void {
    const packet = TradeButtonStateChangePacket.createPacket();
    packet.NewState = checked
      ? TradeButtonStateEnum.Checked
      : TradeButtonStateEnum.Unchecked;
    this.connection.send(packet.buffer);
  }

  cancel(): void {
    if (!this.open) return;
    this.connection.send(TradeCancelPacket.createPacket().buffer);
    this.open = false;
  }

  /** Resolves when the server reports the trade closed, either way. */
  waitForFinish(timeoutMs = 60_000): Promise<TradeOutcome> {
    return new Promise<TradeOutcome>(resolve => {
      const timer = setTimeout(() => {
        this.finished = null;
        this.cancel();
        resolve({ ok: false, reason: `trade did not finish within ${timeoutMs}ms` });
      }, timeoutMs);

      this.finished = outcome => {
        clearTimeout(timer);
        this.finished = null;
        resolve(outcome);
      };
    });
  }

  /**
   * Confirms only when the table matches `terms`, then waits for the server's
   * verdict. This is the check that makes an automated trade safe to run
   * without a human watching it: a partner who changes the offer after we
   * agreed clears both accept boxes server side, and we re-check before
   * ticking ours again.
   */
  async settle(terms: TradeTerms, timeoutMs = 60_000): Promise<TradeOutcome> {
    const finish = this.waitForFinish(timeoutMs);
    const mismatch = this.armConfirm(terms);
    if (mismatch !== null) return { ok: false, reason: mismatch };
    return finish;
  }

  /**
   * Ticks the accept box if the table matches, and cancels if it does not.
   * Returns the reason it refused, or null when the confirm went out.
   *
   * Split from `settle` because the two sides must confirm one after the
   * other, not together: the server finishes the trade on whichever confirm
   * arrives second, and it only sees the second one if the first has already
   * moved that player into `TradeButtonPressed`.
   */
  armConfirm(terms: TradeTerms): string | null {
    const mismatch = this.mismatch(terms);
    if (mismatch !== null) {
      this.cancel();
      return mismatch;
    }
    this.setConfirm(true);
    return null;
  }

  /**
   * Waits for the partner to put up what was agreed.
   *
   * A person takes seconds to drag an item across, so every escrow operation
   * has to wait rather than read the table once and refuse. Resolves as soon
   * as the table matches; rejects on the deadline, and the caller cancels.
   */
  async waitForTerms(terms: TradeTerms, timeoutMs = 60_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      if (this.mismatch(terms) === null) return;
      if (!this.open) throw new Error('the trade closed before the terms were met');
      if (Date.now() >= deadline) {
        throw new Error(`the terms were not met within ${Math.round(timeoutMs / 1000)}s`);
      }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }

  /** Why the table does not match the terms, or null when it does. */
  mismatch(terms: TradeTerms): string | null {
    if (terms.expectMoney !== undefined && this.theirMoney !== terms.expectMoney) {
      return `expected ${terms.expectMoney} Zen on the table, found ${this.theirMoney}`;
    }
    if (terms.expectItems !== undefined && this.theirItems.size !== terms.expectItems) {
      return `expected ${terms.expectItems} item(s) on the table, found ${this.theirItems.size}`;
    }
    return null;
  }

  private handle(frame: Frame): void {
    switch (frame.code) {
      case CODE.itemAdded.code: {
        const p = new TradeItemAddedPacket(view(frame));
        this.theirItems.set(p.ToSlot, new Uint8Array(p.ItemData.buffer.slice(0)));
        // Any change clears both accept boxes server side; mirror it so we
        // never believe a stale agreement.
        this.theirConfirm = false;
        break;
      }
      case CODE.moneyUpdate.code: {
        const p = new TradeMoneyUpdatePacket(view(frame));
        this.theirMoney = p.MoneyAmount;
        this.theirConfirm = false;
        break;
      }
      case CODE.buttonState.code: {
        // The two directions have their own enums with the same values; this
        // one is the server's.
        const p = new TradeButtonStateChangedPacket(view(frame));
        this.theirConfirm = p.State === TradeButtonStateChangedTradeButtonStateEnum.Checked;
        break;
      }
      case CODE.finished.code: {
        const result = new TradeFinishedPacket(view(frame)).Result;
        this.open = false;
        const ok = result === TradeFinishedTradeResultEnum.Success;
        this.log(`trade finished: ${TradeFinishedTradeResultEnum[result] ?? result}`);
        this.finished?.(
          ok
            ? { ok: true }
            : {
                ok: false,
                result,
                reason: TradeFinishedTradeResultEnum[result] ?? `result ${result}`,
              }
        );
        break;
      }
      default:
        break;
    }
  }
}

/** The name behind an unprompted trade request, for the bot to accept or refuse. */
export function incomingRequestName(frame: Frame): string {
  return new IncomingTradeRequestPacket(view(frame)).Name;
}

export const TRADE_REQUEST_CODE = CODE.request.code;
