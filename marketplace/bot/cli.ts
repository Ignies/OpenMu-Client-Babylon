import { BotConnection } from './connection';
import { BotSession } from './session';
import { Scope } from './scope';
import { TradeSession } from './trade';

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

  if (!password) {
    console.error('no password: pass --password or set MARKETPLACE_BOT_PASSWORD');
    process.exit(1);
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
    trade.dispose();
    scope.dispose();
    connection.close();
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
