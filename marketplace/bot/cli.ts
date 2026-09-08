import { BotConnection } from './connection';
import { BotSession } from './session';
import { Scope } from './scope';
import { TradeSession, TRADE_REQUEST_CODE, incomingRequestName } from './trade';
import { collectListing, deliverPurchase, payOut, type EscrowContext } from './escrow';
import { Wallet } from './wallet';
import { Ledger } from './ledger';

/**
 * Drives one bot by hand, for proving the stack against a real server.
 *
 * The bot dials a game server port directly rather than going through the
 * connect server, deliberately: the connect server hands out the address the
 * server config advertises, which on a local box is the operator's public IP,
 * not localhost.
 *
 *   bun run marketplace/bot/cli.ts enter  --account MKT001
 *   bun run marketplace/bot/cli.ts watch  --account MKT001 --seconds 30
 *   bun run marketplace/bot/cli.ts trace  --account MKT001 --target <character>
 *   bun run marketplace/bot/cli.ts simulate --seller MKT001 --buyer MKT002
 *   bun run marketplace/bot/cli.ts escrow --op list --bot MKT001 --player MKT002
 *   bun run marketplace/bot/cli.ts ledger
 */

const HOST = process.env.GAME_HOST ?? '127.0.0.1';
const PORT = Number(process.env.GAME_PORT ?? 55901);

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const stamp = () => new Date().toISOString().slice(11, 23);
const log = (message: string) => console.log(`${stamp()}  ${message}`);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const command = process.argv[2] ?? 'enter';
  const account = arg('account', 'MKT001')!;
  const password = arg('password', process.env.MARKETPLACE_BOT_PASSWORD);

  if (command === 'ledger') {
    const rows = new Ledger().summary();
    if (rows.length === 0) {
      log('the ledger is empty');
      return;
    }
    for (const r of rows) {
      log(
        `${r.bot}: ${r.handovers} handover(s), ${r.mismatches} mismatch(es), ` +
          `drift ${r.drift >= 0 ? '+' : ''}${r.drift} Zen`
      );
    }
    return;
  }

  if (!password) {
    console.error('no password: pass --password or set MARKETPLACE_BOT_PASSWORD');
    process.exit(1);
  }

  if (command === 'simulate') {
    await simulate(password);
    return;
  }

  if (command === 'escrow') {
    await escrow(password);
    return;
  }

  const connection = new BotConnection(HOST, PORT, log);
  const scope = new Scope(connection, log);
  const trade = new TradeSession(connection, log);
  const session = new BotSession(
    connection,
    {
      account,
      password,
      character: arg('character', account),
      createIfMissing: true,
    },
    log
  );

  await connection.connect();

  try {
    const character = await session.enterWorld();
    // So the bot is not offered as its own trade partner.
    scope.selfName = character.Name;
    log(`ready as ${character.Name} (level ${character.Level})`);

    switch (command) {
      case 'enter':
        // Give the server a moment to send the surrounding scope, so the run
        // says something useful about what the bot can actually see.
        await sleep(3000);
        report(scope);
        break;

      case 'watch': {
        const seconds = Number(arg('seconds', '30'));
        log(`watching for ${seconds}s`);
        for (let i = 0; i < seconds; i++) {
          await sleep(1000);
          if (i % 5 === 4) report(scope);
        }
        break;
      }

      case 'trace': {
        const target = arg('target');
        if (!target) throw new Error('trace needs --target <character name>');
        log(`tracing to ${target}`);
        session.traceTo(target);
        await sleep(3000);
        report(scope);
        const found = scope.byName(target);
        log(found ? `${target} is in scope at ${found.x},${found.y}` : `${target} is NOT in scope`);
        break;
      }

      case 'trade': {
        const target = arg('target');
        if (!target) throw new Error('trade needs --target <character name>');
        session.traceTo(target);
        await sleep(3000);

        const partner = scope.byName(target);
        if (!partner) throw new Error(`${target} is not in scope, cannot trade`);

        log(`requesting a trade with ${partner.name} (id ${partner.id})`);
        await trade.requestWith(partner.id);
        log('trade opened; waiting for the other side to put something up');
        await sleep(15000);
        log(`table: ${trade.theirItems.size} item(s), ${trade.theirMoney} Zen`);
        trade.cancel();
        break;
      }

      default:
        throw new Error(`unknown command "${command}"`);
    }
  } finally {
    try {
      session.logOut();
      await sleep(400);
    } catch {
      // Already disconnected.
    }
    trade.dispose();
    scope.dispose();
    connection.close();
  }
}

/**
 * The escrow handovers, driven against a second bot standing in for a player.
 *
 * `escrow list` is the one to run first: the seller hands an item over and the
 * bot gives nothing back, so no Zen is ever on the table and the server's
 * cancel bug cannot bite.
 */
async function escrow(password: string): Promise<void> {
  const which = arg('op', 'list')!;
  const botName = arg('bot', 'MKT001')!;
  const playerName = arg('player', 'MKT002')!;
  const slot = Number(arg('slot', '14'));
  const price = Number(arg('price', '1000000'));

  const bot = await connectBot(botName, password);
  const player = await connectBot(playerName, password);

  const context: EscrowContext = {
    session: bot.session,
    trade: bot.trade,
    scope: bot.scope,
    wallet: bot.wallet,
    ledger: new Ledger(undefined, (m: string) => log(`[ledger] ${m}`)),
    botName: bot.name,
    log: (message: string) => log(`[escrow] ${message}`),
  };

  try {
    await sleep(2000);

    // The stand-in accepts whatever the bot asks for, and plays the human's
    // half of the handover.
    const playerSide = player.connection
      .expect({ code: TRADE_REQUEST_CODE }, 30_000, 'an invitation to trade')
      .then(async () => {
        await player.trade.accept();
        log(`[${player.name}] accepted the trade`);
        if (which === 'list') {
          player.trade.offerItem(slot, 0);
        } else if (which === 'buy') {
          // Wait for the bot's item to appear before paying, which is the
          // order a real buyer's client will use too.
          await player.trade.waitForTerms({ expectItems: 1 }, 30_000);
          player.trade.setMoney(price);
        }
        // Confirm second: the server completes on whichever confirm is last,
        // and the bot has already checked the table by then.
        await sleep(1500);
        // What the stand-in should see on the table depends on the operation:
        // an item when buying, the payment when being paid out, and nothing at
        // all when listing, because the bot gives nothing back for a listing.
        const expected =
          which === 'buy'
            ? { expectItems: 1 }
            : which === 'payout'
              ? { expectMoney: price, expectItems: 0 }
              : { expectMoney: 0, expectItems: 0 };
        // --refuse makes the stand-in walk away with the bot's Zen already on
        // the table, which is the case the ledger exists to catch.
        if (process.argv.includes('--refuse')) {
          log(`[${player.name}] refusing on purpose`);
          player.trade.cancel();
          return;
        }
        const refused = player.trade.armConfirm(expected);
        if (refused) log(`[${player.name}] refused to confirm: ${refused}`);
      });

    let result;
    if (which === 'list') {
      result = await collectListing(context, player.name, 1);
    } else if (which === 'buy') {
      result = await deliverPurchase(context, player.name, slot, price);
    } else if (which === 'payout') {
      result = await payOut(context, player.name, price);
    } else {
      throw new Error(`unknown --op "${which}" (list, buy or payout)`);
    }

    await playerSide.catch(() => {});
    log(`${which}: ${result.ok ? 'ok' : `failed - ${result.reason}`}`);
  } finally {
    await disposeBot(player);
    await disposeBot(bot);
  }
}

/** One connected bot, standing in the world. */
type Bot = {
  name: string;
  connection: BotConnection;
  scope: Scope;
  trade: TradeSession;
  session: BotSession;
  wallet: Wallet;
};

async function connectBot(account: string, password: string): Promise<Bot> {
  const tag = (message: string) => log(`[${account}] ${message}`);
  const connection = new BotConnection(HOST, PORT, tag);
  const scope = new Scope(connection, tag);
  const trade = new TradeSession(connection, tag);
  const wallet = new Wallet(connection, tag);
  const session = new BotSession(
    connection,
    { account, password, character: account, createIfMissing: true },
    tag
  );

  // The server answers a refused action with a blue message rather than an
  // error packet, so it is the only place a reason ever appears.
  connection.on(f => {
    if (f.code === 0x0d) {
      // The message is zero-padded to the frame width, so it is cut at the
      // first NUL rather than trimmed with a regex over control characters.
      const body = f.bytes.subarray(4);
      const end = body.indexOf(0);
      const text = new TextDecoder().decode(end === -1 ? body : body.subarray(0, end));
      tag(`server says: ${text.trim()}`);
    }
    if (process.env.VERBOSE) {
      tag(`<- 0x${f.code.toString(16).padStart(2, '0')}/0x${f.sub.toString(16)} len ${f.bytes.length}`);
    }
  });

  await connection.connect();
  const character = await session.enterWorld();
  scope.selfName = character.Name;
  // A bot that does not know its balance cannot reconcile a handover, so it
  // waits for the server to state one before it is handed any work.
  await wallet.waitForBalance().catch(() => tag('no balance reported; handovers will not reconcile'));
  return { name: character.Name, connection, scope, trade, session, wallet };
}

async function disposeBot(bot: Bot): Promise<void> {
  // Log out first: a dropped socket leaves the account connected server side
  // and the next run cannot log in.
  try {
    bot.session.logOut();
    await sleep(400);
  } catch {
    // Already gone; closing below is all that is left to do.
  }
  bot.trade.dispose();
  bot.scope.dispose();
  bot.wallet.dispose();
  bot.connection.close();
}

/**
 * Warps the seller to the buyer and waits until they can see each other.
 *
 * Mutual visibility is the real precondition, not distance: `TradeRequest` is
 * resolved against the requester's observers, so the partner has to be one.
 * The warp is retried because a player who is still entering the world will
 * not notice someone arriving on top of them.
 */
async function meetUp(seller: Bot, buyer: Bot, attempts = 4) {
  // Check before warping. A warp is a leave-and-re-enter, so tracing to
  // someone already in view drops the bot out of *their* scope and it is not
  // put back - which leaves the pair one-way visible and the trade refused.
  const already = seller.scope.byName(buyer.name);
  if (already && buyer.scope.byName(seller.name)) {
    log(`${seller.name} and ${buyer.name} already see each other, no warp needed`);
    return already;
  }

  for (let attempt = 1; attempt <= attempts; attempt++) {
    log(`${seller.name} tracing to ${buyer.name} (attempt ${attempt})`);
    seller.session.traceTo(buyer.name);

    for (let waited = 0; waited < 4000; waited += 500) {
      await sleep(500);
      const partner = seller.scope.byName(buyer.name);
      const mutual = buyer.scope.byName(seller.name);
      if (partner && mutual) return partner;
    }

    log(
      `not mutual yet - ${seller.name} sees ` +
        `${JSON.stringify(seller.scope.all.map(p => p.name))}, ${buyer.name} sees ` +
        `${JSON.stringify(buyer.scope.all.map(p => p.name))}`
    );
  }
  throw new Error(`${seller.name} and ${buyer.name} never came into view of each other`);
}

/**
 * Two bots trading with each other, which is the escrow handover in miniature:
 * the seller hands an item over and the buyer pays for it, in one exchange the
 * game server performs.
 */
async function simulate(password: string): Promise<void> {
  const sellerName = arg('seller', 'MKT001')!;
  const buyerName = arg('buyer', 'MKT002')!;
  const itemSlot = Number(arg('slot', '12'));
  const price = Number(arg('price', '0'));

  const seller = await connectBot(sellerName, password);
  const buyer = await connectBot(buyerName, password);

  try {
    // The seller goes to the buyer rather than the other way round. `/trace`
    // is a game master warp, which is why the bot accounts need that status.
    // Both sides have to settle into the world before the warp, and the trade
    // needs them to see *each other*: the server resolves a trade partner out
    // of the requester's own observers, so one-way visibility is refused with
    // "Trade partner not found". Warping in on top of a player who is still
    // entering leaves exactly that.
    await sleep(2000);

    const partner = await meetUp(seller, buyer);
    log(`${buyer.name} is in scope at ${partner.x},${partner.y} (id ${partner.id})`);

    // Armed before the request goes out, so the invitation cannot be missed.
    const accepted = buyer.connection
      .expect({ code: TRADE_REQUEST_CODE }, 20_000, 'an invitation to trade')
      .then(async frame => {
        log(`${buyer.name} was asked to trade by ${incomingRequestName(frame)}`);
        await buyer.trade.accept();
      });

    await seller.trade.requestWith(partner.id);
    await accepted;
    log('trade is open on both sides');

    seller.trade.offerItem(itemSlot, 0);
    if (price > 0) buyer.trade.setMoney(price);
    await sleep(2000);

    log(
      `table: buyer sees ${buyer.trade.theirItems.size} item(s); ` +
        `seller sees ${seller.trade.theirMoney} Zen`
    );

    // Cancel with Zen still on the table, without either side confirming.
    if (process.argv.includes('--cancel-early')) {
      log('cancelling with money on the table, before any confirm');
      const finish = buyer.trade.waitForFinish(15_000);
      buyer.trade.cancel();
      log(`cancel outcome: ${JSON.stringify(await finish)}`);
      const hold = Number(arg('hold', '0'));
      if (hold > 0) {
        log(`holding the session open for ${hold}s so a periodic save can run`);
        await sleep(hold * 1000);
      }
      return;
    }

    // Both sides check the table against what was agreed before confirming,
    // and they confirm one after the other: the server completes the trade on
    // whichever confirm lands second, so the two must not race.
    const sellerFinish = seller.trade.waitForFinish();
    const buyerFinish = buyer.trade.waitForFinish();

    const sellerRefused = seller.trade.armConfirm({ expectMoney: price });
    if (sellerRefused) log(`seller refused to confirm: ${sellerRefused}`);
    await sleep(500);

    const buyerRefused = buyer.trade.armConfirm({ expectItems: 1 });
    if (buyerRefused) log(`buyer refused to confirm: ${buyerRefused}`);

    const [sellerOutcome, buyerOutcome] = await Promise.all([sellerFinish, buyerFinish]);

    log(`seller: ${sellerOutcome.ok ? 'ok' : `failed - ${sellerOutcome.reason}`}`);
    log(`buyer: ${buyerOutcome.ok ? 'ok' : `failed - ${buyerOutcome.reason}`}`);
  } finally {
    await disposeBot(buyer);
    await disposeBot(seller);
  }
}

function report(scope: Scope): void {
  const players = scope.all;
  if (players.length === 0) {
    log('scope: nobody in view');
    return;
  }
  log(
    `scope: ${players.length} in view - ` +
      players.map(p => `${p.name}#${p.id}@${p.x},${p.y}`).join(', ')
  );
}

main().catch(e => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
