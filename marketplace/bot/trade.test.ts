import { describe, expect, it } from 'vitest';
import { TradeSession } from './trade';
import type { BotConnection, Frame, FrameHandler, Match } from './connection';
import {
  TradeButtonStateChangedPacket,
  TradeButtonStateChangedTradeButtonStateEnum,
  TradeFinishedPacket,
  TradeFinishedTradeResultEnum,
  TradeItemAddedPacket,
  TradeMoneyUpdatePacket,
  TradeRequestAnswerPacket,
} from '../../src/common/packets/ServerToClientPackets';
import { codeOf } from './wire';

/**
 * The trade machine is the one part of the bot that can lose real property, so
 * these test the invariant that matters: it never ticks its accept box unless
 * what is on the table is what was agreed.
 */
class FakeConnection {
  readonly sent: { code: number; sub: number }[] = [];
  private readonly handlers: FrameHandler[] = [];
  private readonly waiters: { match: Match; resolve: (f: Frame) => void }[] = [];

  send(buffer: DataView | Uint8Array): void {
    const bytes =
      buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer.buffer.slice(0));
    this.sent.push(codeOf(bytes));
  }

  on(handler: FrameHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const i = this.handlers.indexOf(handler);
      if (i >= 0) this.handlers.splice(i, 1);
    };
  }

  expect(match: Match): Promise<Frame> {
    return new Promise(resolve => this.waiters.push({ match, resolve }));
  }

  /** Delivers a server frame to the session, as the socket would. */
  deliver(packet: { buffer: DataView }): void {
    const bytes = new Uint8Array(packet.buffer.buffer.slice(0));
    const { code, sub } = codeOf(bytes);
    const frame: Frame = { code, sub, bytes };

    for (let i = this.waiters.length - 1; i >= 0; i--) {
      if (this.waiters[i].match.code !== code) continue;
      this.waiters.splice(i, 1)[0].resolve(frame);
    }
    for (const handler of [...this.handlers]) handler(frame);
  }

  asConnection(): BotConnection {
    return this as unknown as BotConnection;
  }
}

const CONFIRM_CODE = 0x3c;
/** Client-to-server cancel is 0x3D, which is also the server's TradeFinished. */
const CANCEL_CODE = 0x3d;

function moneyUpdate(amount: number) {
  const p = TradeMoneyUpdatePacket.createPacket();
  p.writeHeader().writeLength();
  p.MoneyAmount = amount;
  return p;
}

function itemAdded(slot: number) {
  const p = TradeItemAddedPacket.createPacket(12);
  p.writeHeader().writeLength();
  p.ToSlot = slot;
  return p;
}

function finished(result: TradeFinishedTradeResultEnum) {
  const p = TradeFinishedPacket.createPacket();
  p.writeHeader().writeLength();
  p.Result = result;
  return p;
}

function opened() {
  const p = TradeRequestAnswerPacket.createPacket();
  p.writeHeader().writeLength();
  p.Accepted = true;
  p.setName('Buyer');
  return p;
}

function buttonState(state: TradeButtonStateChangedTradeButtonStateEnum) {
  const p = TradeButtonStateChangedPacket.createPacket();
  p.writeHeader().writeLength();
  p.State = state;
  return p;
}

function session(): { fake: FakeConnection; trade: TradeSession } {
  const fake = new FakeConnection();
  return { fake, trade: new TradeSession(fake.asConnection()) };
}

describe('TradeSession table tracking', () => {
  it('records the partner money and items put on the table', () => {
    const { fake, trade } = session();
    fake.deliver(moneyUpdate(74_000_000));
    fake.deliver(itemAdded(3));

    expect(trade.theirMoney).toBe(74_000_000);
    expect(trade.theirItems.size).toBe(1);
    expect(trade.theirItems.has(3)).toBe(true);
  });

  it('clears the partner accept mark whenever the offer changes', () => {
    const { fake, trade } = session();
    fake.deliver(buttonState(TradeButtonStateChangedTradeButtonStateEnum.Checked));
    expect(trade.theirConfirm).toBe(true);

    fake.deliver(moneyUpdate(1));
    expect(trade.theirConfirm).toBe(false);

    fake.deliver(buttonState(TradeButtonStateChangedTradeButtonStateEnum.Checked));
    fake.deliver(itemAdded(0));
    expect(trade.theirConfirm).toBe(false);
  });
});

describe('TradeSession.mismatch', () => {
  it('accepts a table that matches the terms', () => {
    const { fake, trade } = session();
    fake.deliver(moneyUpdate(500));
    fake.deliver(itemAdded(0));
    expect(trade.mismatch({ expectMoney: 500, expectItems: 1 })).toBeNull();
  });

  it('names the wrong amount of money', () => {
    const { fake, trade } = session();
    fake.deliver(moneyUpdate(499));
    expect(trade.mismatch({ expectMoney: 500 })).toMatch(/expected 500 Zen.*found 499/);
  });

  it('names the wrong number of items', () => {
    const { fake, trade } = session();
    fake.deliver(itemAdded(0));
    fake.deliver(itemAdded(1));
    expect(trade.mismatch({ expectItems: 1 })).toMatch(/expected 1 item\(s\).*found 2/);
  });

  it('treats an empty table as a mismatch when something was expected', () => {
    const { trade } = session();
    expect(trade.mismatch({ expectMoney: 10 })).not.toBeNull();
    expect(trade.mismatch({ expectItems: 1 })).not.toBeNull();
  });
});

describe('TradeSession.settle', () => {
  it('cancels instead of confirming when the table does not match', async () => {
    const { fake, trade } = session();
    const accepted = trade.accept();
    fake.deliver(opened());
    await accepted;
    fake.deliver(moneyUpdate(10));

    const outcome = await trade.settle({ expectMoney: 74_000_000 });

    expect(outcome.ok).toBe(false);
    expect(fake.sent.some(s => s.code === CONFIRM_CODE)).toBe(false);
    expect(fake.sent.some(s => s.code === CANCEL_CODE)).toBe(true);
  });

  it('confirms and reports success when the table matches', async () => {
    const { fake, trade } = session();
    const accepted = trade.accept();
    fake.deliver(opened());
    await accepted;

    fake.deliver(moneyUpdate(500));

    const settled = trade.settle({ expectMoney: 500 });
    // The confirm goes out before the server rules on it.
    expect(fake.sent.some(s => s.code === CONFIRM_CODE)).toBe(true);

    fake.deliver(finished(TradeFinishedTradeResultEnum.Success));
    expect(await settled).toEqual({ ok: true });
  });

  it('reports the server reason when the trade fails', async () => {
    const { fake, trade } = session();
    const accepted = trade.accept();
    fake.deliver(opened());
    await accepted;
    fake.deliver(moneyUpdate(500));

    const settled = trade.settle({ expectMoney: 500 });
    fake.deliver(finished(TradeFinishedTradeResultEnum.FailedByFullInventory));

    const outcome = await settled;
    expect(outcome.ok).toBe(false);
    expect(outcome).toMatchObject({ reason: 'FailedByFullInventory' });
  });

  it('closes the session when the server finishes the trade', async () => {
    const { fake, trade } = session();
    const accepted = trade.accept();
    fake.deliver(opened());
    await accepted;
    expect(trade.isOpen).toBe(true);

    fake.deliver(finished(TradeFinishedTradeResultEnum.Cancelled));
    expect(trade.isOpen).toBe(false);
  });
});
