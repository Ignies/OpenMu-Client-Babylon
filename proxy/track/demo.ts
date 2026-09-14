import type { Tracker } from './tracker';
import type { TrackedSession } from './session';
import { WireEncoder } from './wire';
import {
  characterInformation,
  characterList,
  chat,
  experience,
  gameServerEntered,
  hit,
  itemAdded,
  itemBytes,
  itemsDropped,
  levelUpdate,
  mapChanged,
  moneyUpdate,
  npcsInScope,
  objectKilled,
  pickup,
  respawn,
  selectCharacter,
  serverMessage,
  walk,
  whisper,
} from './packets';

/**
 * `ADMIN_DEMO=on`: a handful of players who are not there.
 *
 * Every one of them is a real `TrackedSession` fed real frames - encrypted
 * the way the client and the server encrypt them - so the panel is looking
 * at the tracker, not at a stub of it. That is what makes it usable to
 * build and screenshot the panel with no game server, and it doubles as a
 * soak of the decoders.
 */

type Bot = {
  account: string;
  name: string;
  cls: number;
  level: number;
  map: number;
  x: number;
  y: number;
  gm?: boolean;
};

const BOTS: Bot[] = [
  { account: 'gmaster', name: 'Aeris', cls: 7, level: 400, map: 0, x: 130, y: 120, gm: true },
  { account: 'bob01', name: 'Bobby', cls: 4, level: 62, map: 0, x: 140, y: 130 },
  { account: 'lina', name: 'Lina', cls: 8, level: 88, map: 2, x: 220, y: 60 },
  { account: 'karl', name: 'Karl', cls: 0, level: 133, map: 3, x: 175, y: 120 },
  { account: 'dave', name: 'DaveSM', cls: 2, level: 210, map: 7, x: 24, y: 20 },
  { account: 'mia', name: 'Mia', cls: 20, level: 45, map: 4, x: 208, y: 78 },
  { account: 'rex', name: 'RexDL', cls: 16, level: 300, map: 10, x: 42, y: 100 },
  { account: 'zoe', name: 'Zoe', cls: 12, level: 150, map: 8, x: 100, y: 160 },
];

const MAPS = [0, 2, 3, 4, 7, 8, 10];
const MONSTERS = [0, 1, 2, 3, 6, 7, 10, 12, 14, 20, 33, 44, 55];
const LINES = [
  'anyone selling a +9 pendant?',
  'lf party lost tower 5',
  'gg',
  'brb',
  'wts jewels pm me',
  'where is the bc entrance?',
  'lol',
  'trade?',
];
const ITEMS = [itemBytes(0, 0, 3), itemBytes(0, 1, 7), itemBytes(14, 0), itemBytes(12, 0), itemBytes(7, 2, 9)];

const DIR_DX = [-1, 0, 1, 1, 1, 0, -1, -1];
const DIR_DY = [-1, -1, -1, 0, 1, 1, 1, 0];

const TICK_MS = 600;

type Runner = {
  bot: Bot;
  session: TrackedSession;
  wire: WireEncoder;
  objectId: number;
  heading: number;
  npcs: { id: number; type: number }[];
  money: number;
  dead: boolean;
};

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function server(runner: Runner, packet: Uint8Array): void {
  runner.session.feedServer(runner.wire.server(packet));
}

function client(runner: Runner, packet: Uint8Array): void {
  runner.session.feedClient(runner.wire.client(packet));
}

function populate(runner: Runner): void {
  const { bot } = runner;
  runner.npcs = MONSTERS.slice(0, 5).map((type, k) => ({ id: 2000 + runner.objectId * 10 + k, type }));
  server(
    runner,
    npcsInScope(
      runner.npcs.map(npc => ({
        id: npc.id,
        type: npc.type,
        x: Math.min(250, bot.x + 3),
        y: Math.min(250, bot.y + 3),
      }))
    )
  );
}

function enter(runner: Runner): void {
  const { bot } = runner;
  server(runner, gameServerEntered(runner.objectId));
  runner.session.setAccount(bot.account);
  server(runner, characterList([{ name: bot.name, cls: bot.cls, level: bot.level, status: bot.gm ? 32 : 0 }]));
  client(runner, selectCharacter(bot.name));
  server(
    runner,
    characterInformation({
      x: bot.x,
      y: bot.y,
      map: bot.map,
      money: runner.money,
      status: bot.gm ? 32 : 0,
      hp: 800,
      maxHp: 1000,
    })
  );
  populate(runner);
}

function step(runner: Runner): void {
  const { bot } = runner;

  if (runner.dead) return;

  const roll = Math.random();

  if (roll < 0.55) {
    if (Math.random() < 0.15) runner.heading = Math.floor(Math.random() * 8);
    const dirs: number[] = [];
    const steps = 1 + Math.floor(Math.random() * 6);
    let x = bot.x;
    let y = bot.y;
    for (let i = 0; i < steps; i++) {
      let dir = runner.heading;
      let nx = x + DIR_DX[dir];
      let ny = y + DIR_DY[dir];
      if (nx < 12 || nx > 243 || ny < 12 || ny > 243) {
        runner.heading = (runner.heading + 4) % 8;
        dir = runner.heading;
        nx = x + DIR_DX[dir];
        ny = y + DIR_DY[dir];
      }
      dirs.push(dir);
      x = nx;
      y = ny;
    }
    client(runner, walk(bot.x, bot.y, dirs));
    bot.x = x;
    bot.y = y;
    return;
  }

  if (roll < 0.63) {
    client(runner, chat(bot.name, pick(LINES)));
    return;
  }

  if (roll < 0.66) {
    const other = pick(BOTS.filter(b => b.name !== bot.name));
    client(runner, whisper(other.name, pick(LINES)));
    return;
  }

  if (roll < 0.78) {
    client(runner, hit(pick(runner.npcs).id));
    return;
  }

  if (roll < 0.86) {
    const npc = pick(runner.npcs);
    server(runner, objectKilled(npc.id, runner.objectId));
    server(runner, experience(npc.id, 50 + Math.floor(Math.random() * 900)));
    return;
  }

  if (roll < 0.9) {
    const item = pick(ITEMS);
    const id = 3000 + Math.floor(Math.random() * 1000);
    server(runner, itemsDropped([{ id, x: bot.x, y: bot.y, item }]));
    client(runner, pickup(id));
    server(runner, itemAdded(20 + Math.floor(Math.random() * 40), item));
    return;
  }

  if (roll < 0.93) {
    runner.money += Math.floor(Math.random() * 5000) - 1000;
    server(runner, moneyUpdate(Math.max(0, runner.money)));
    return;
  }

  if (roll < 0.95) {
    bot.level += 1;
    server(runner, levelUpdate(bot.level));
    return;
  }

  if (roll < 0.97) {
    bot.map = pick(MAPS.filter(m => m !== bot.map));
    bot.x = 20 + Math.floor(Math.random() * 200);
    bot.y = 20 + Math.floor(Math.random() * 200);
    server(runner, mapChanged(bot.map, bot.x, bot.y));
    populate(runner);
    return;
  }

  if (roll < 0.985) {
    server(runner, serverMessage(`[${bot.name}] You have been idle for a while.`));
    return;
  }

  // A death, and a respawn a moment later.
  runner.dead = true;
  server(runner, objectKilled(runner.objectId, pick(runner.npcs).id));
  setTimeout(() => {
    runner.dead = false;
    bot.x = 20 + Math.floor(Math.random() * 200);
    bot.y = 20 + Math.floor(Math.random() * 200);
    server(runner, respawn(bot.map, bot.x, bot.y, runner.money));
    populate(runner);
  }, 2000);
}

export function startDemo(tracker: Tracker): () => void {
  const runners: Runner[] = BOTS.map((bot, i) => ({
    bot: { ...bot },
    session: tracker.open(null, 55901),
    wire: new WireEncoder(),
    objectId: 1000 + i,
    heading: Math.floor(Math.random() * 8),
    npcs: [],
    money: 10_000 + i * 12_345,
    dead: false,
  }));

  for (const runner of runners) enter(runner);

  const timer = setInterval(() => {
    for (const runner of runners) if (Math.random() < 0.45) step(runner);
  }, TICK_MS);

  console.warn(`admin demo: ${runners.length} synthetic players are being tracked - not for a public proxy`);

  return () => {
    clearInterval(timer);
    for (const runner of runners) tracker.close(runner.session);
  };
}
