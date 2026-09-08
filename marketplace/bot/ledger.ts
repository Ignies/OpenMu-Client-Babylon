import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

/**
 * An append-only record of every handover, and whether the money moved by
 * exactly what it should have.
 *
 * This exists because the server destroys Zen left on a cancelled trade
 * (`issues/trade/zen_destroyed_when_a_trade_is_cancelled.md`). A bot carrying
 * a float cannot notice that from its own arithmetic - its books would say one
 * thing and the server another, and nobody would find out until the float ran
 * dry. So every handover states what it expected to happen, and is checked
 * against the balance the server reports afterwards.
 *
 * A mismatch is never corrected automatically. It is written down, loudly, and
 * a person decides: silently topping a bot back up would hide exactly the
 * thing this is here to surface.
 *
 * The file lives outside the checkout on purpose. The deploy runs
 * `git clean -fdx` in it, which would take the audit trail with it.
 */

export type HandoverKind = 'list' | 'buy' | 'payout';

export type LedgerEntry = {
  at: string;
  bot: string;
  partner: string;
  kind: HandoverKind;
  /** What the handover was meant to do to the bot's Zen. */
  expectedZenDelta: number;
  zenBefore: number | null;
  zenAfter: number | null;
  outcome: 'ok' | 'failed';
  reason?: string;
  /** Set only when the money did not move by the expected amount. */
  discrepancy?: number;
};

const DEFAULT_PATH = join(homedir(), '.mu-marketplace', 'ledger.jsonl');

export class Ledger {
  constructor(
    private readonly path: string = process.env.MARKETPLACE_LEDGER ?? DEFAULT_PATH,
    private readonly log: (message: string) => void = () => {}
  ) {}

  /**
   * Records a handover and returns the discrepancy, or null when the books
   * balance. A failed handover is expected to move nothing, so it is checked
   * just as strictly as a successful one - that is the case the cancel bug
   * actually bites in.
   */
  record(entry: Omit<LedgerEntry, 'at' | 'discrepancy'>): number | null {
    const expected = entry.outcome === 'ok' ? entry.expectedZenDelta : 0;

    let discrepancy: number | null = null;
    if (entry.zenBefore !== null && entry.zenAfter !== null) {
      const actual = entry.zenAfter - entry.zenBefore;
      if (actual !== expected) discrepancy = actual - expected;
    }

    const row: LedgerEntry = {
      at: new Date().toISOString(),
      ...entry,
      ...(discrepancy !== null ? { discrepancy } : {}),
    };

    this.write(row);

    if (discrepancy !== null) {
      this.log(
        `LEDGER MISMATCH on ${entry.kind} with ${entry.partner}: ` +
          `expected ${expected >= 0 ? '+' : ''}${expected} Zen, ` +
          `saw ${(entry.zenAfter ?? 0) - (entry.zenBefore ?? 0)} ` +
          `(off by ${discrepancy}). Recorded, not corrected.`
      );
    }

    return discrepancy;
  }

  /** Every entry written so far, oldest first. Skips lines it cannot parse. */
  read(): LedgerEntry[] {
    let text: string;
    try {
      text = readFileSync(this.path, 'utf8');
    } catch {
      return [];
    }
    const rows: LedgerEntry[] = [];
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        rows.push(JSON.parse(line) as LedgerEntry);
      } catch {
        // A torn last line from a killed process; the rest still counts.
      }
    }
    return rows;
  }

  /**
   * What each bot is out by, and on which handovers.
   *
   * The total is the number that matters when topping a bot's float back up:
   * it is how much Zen the service has lost that it did not intend to spend.
   */
  summary(): { bot: string; drift: number; mismatches: number; handovers: number }[] {
    const byBot = new Map<string, { drift: number; mismatches: number; handovers: number }>();
    for (const row of this.read()) {
      const entry = byBot.get(row.bot) ?? { drift: 0, mismatches: 0, handovers: 0 };
      entry.handovers++;
      if (row.discrepancy !== undefined) {
        entry.drift += row.discrepancy;
        entry.mismatches++;
      }
      byBot.set(row.bot, entry);
    }
    return [...byBot.entries()].map(([bot, e]) => ({ bot, ...e }));
  }

  private write(row: LedgerEntry): void {
    try {
      mkdirSync(dirname(this.path), { recursive: true });
      appendFileSync(this.path, `${JSON.stringify(row)}\n`, 'utf8');
    } catch (e) {
      // Losing the audit line must not take the handover down with it, but it
      // has to be visible: this is the record of real money moving.
      this.log(`could not write the ledger at ${this.path}: ${e}`);
    }
  }
}
