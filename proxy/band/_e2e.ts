/**
 * The band relay end to end, on the real proxy process: a fake game server,
 * the proxy spawned against it, two ws clients that log in the way the
 * client does, one of which starts an instrument and plays. Checks the
 * hello, the scope-based relay of start / batch / stop, that a garbage
 * frame is dropped, and that a flood is stopped with a cooldown - without a
 * browser or an OpenMU.
 *
 *   bun run proxy/band/_e2e.ts
 *
 * Not a vitest test: it needs Bun's sockets. Exit code 0 when every check
 * passes.
 */
import { LoginShortPasswordPacket } from '../../src/common/packets/ClientToServerPackets';
import { Xor3Byte } from '../../src/common/encryption/xor3';
import {
  BAND_LIMITS,
  BandSub,
  RefuseCause,
  StopReason,
  decodeRelayFrame,
  encodeBandState,
  encodeBatch,
  encodeJoin,
  encodeStart,
  encodeStop,
  isBandFrame,
  type BandRelayMessage,
} from '../../src/common/bandProtocol';
import { FrameReader } from '../track/frames';
import { characterInformation, characterList, gameServerEntered, playersInScope, selectCharacter } from '../track/packets';
import { WireEncoder } from '../track/wire';

const GS_PORT = 55999;
const PROXY_PORT = 3010;
const PRESENCE_PORT = 3011;

const failures: string[] = [];
function check(ok: boolean, what: string): void {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures.push(what);
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/* ---------------------------------------------------- the fake game server */

type Conn = { id: number; name: string; reader: FrameReader; wire: WireEncoder; selected: boolean; socket: import('bun').Socket<Conn> };
const conns = new Set<Conn>();
let nextId = 101;

Bun.listen<Conn>({
  hostname: '127.0.0.1',
  port: GS_PORT,
  socket: {
    open(socket) {
      const id = nextId++;
      const conn: Conn = { id, name: `P${id}`, reader: new FrameReader('client'), wire: new WireEncoder(), selected: false, socket };
      socket.data = conn;
      conns.add(conn);
      socket.write(conn.wire.server(gameServerEntered(id)));
    },
    data(socket, chunk) {
      const conn = socket.data;
      conn.reader.feed(new Uint8Array(chunk), frame => {
        if (frame.header === 0xc3 && frame.code === 0xf1 && frame.subCode === 0x01) {
          socket.write(new Uint8Array([0xc1, 5, 0xf1, 0x01, 0x01]));
          socket.write(conn.wire.server(characterList([{ name: conn.name, cls: 7, level: 1, status: 0 }])));
        } else if (frame.code === 0xf3 && frame.subCode === 0x03) {
          socket.write(conn.wire.server(characterInformation({ x: 100, y: 100, map: 2, money: 0, status: 0, hp: 1, maxHp: 1 })));
          conn.selected = true;
          // Everyone in the world sees everyone else, a beat later.
          setTimeout(() => {
            for (const a of conns) {
              if (!a.selected) continue;
              const others = Array.from(conns).filter(b => b !== a && b.selected).map(b => ({ id: b.id, x: 101, y: 100, name: b.name }));
              if (others.length) a.socket.write(a.wire.server(playersInScope(others)));
            }
          }, 300);
        }
      });
    },
    close(socket) {
      conns.delete(socket.data);
    },
    error() {},
  },
});

/* ------------------------------------------------------------- the proxy */

const proxy = Bun.spawn(['bun', 'run', 'proxy/main.ts'], {
  cwd: `${import.meta.dir}/../..`,
  env: {
    ...process.env,
    PORT: String(PROXY_PORT),
    PRESENCE_PORT: String(PRESENCE_PORT),
    ALLOW_TARGETS: `127.0.0.1:${GS_PORT}`,
    TRACK_DB_PATH: 'memory',
    LOG_PACKETS: 'off',
    WEATHER: 'off',
  },
  stdout: 'pipe',
  stderr: 'pipe',
});

let proxyLog = '';
async function pump(stream: ReadableStream<Uint8Array>): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    proxyLog += decoder.decode(value);
  }
}
void pump(proxy.stdout);
void pump(proxy.stderr);

for (let i = 0; i < 100 && !proxyLog.includes('Listening'); i++) await sleep(100);
check(proxyLog.includes('Listening'), 'proxy started');
check(proxyLog.includes('band: on'), 'proxy reports the band relay on');

/* ------------------------------------------------------------ the clients */

type Client = { ws: WebSocket; wire: WireEncoder; got: BandRelayMessage[]; name: string };

function login(name: string): Uint8Array {
  const p = LoginShortPasswordPacket.createPacket();
  const account = new Uint8Array(10);
  account.set(new TextEncoder().encode(name));
  Xor3Byte(account, 10);
  p.setUsername(account, 10);
  return new Uint8Array(p.buffer.buffer);
}

function connect(name: string): Promise<Client> {
  return new Promise((resolve, reject) => {
    const nonce = name.padEnd(32, '0').slice(0, 32).replace(/[^0-9a-f]/g, 'a');
    const ws = new WebSocket(`ws://127.0.0.1:${PROXY_PORT}/?host=127.0.0.1&port=${GS_PORT}&session=${nonce}`);
    ws.binaryType = 'arraybuffer';
    const client: Client = { ws, wire: new WireEncoder(), got: [], name };
    ws.onmessage = ev => {
      const bytes = new Uint8Array(ev.data as ArrayBuffer);
      if (!isBandFrame(bytes)) return;
      const msg = decodeRelayFrame(bytes);
      if (msg) client.got.push(msg);
    };
    ws.onopen = () => resolve(client);
    ws.onerror = () => reject(new Error(`${name}: ws error`));
  });
}

const send = (c: Client, plain: Uint8Array) => c.ws.send(c.wire.client(plain));

const a = await connect('acca');
const b = await connect('accb');
await sleep(200);

check(a.got.some(m => m.sub === BandSub.Hello && m.version === 1), 'A got the hello');
check(b.got.some(m => m.sub === BandSub.Hello), 'B got the hello');

send(a, login('acca'));
send(b, login('accb'));
await sleep(300);
send(a, selectCharacter('P101'));
send(b, selectCharacter('P102'));
await sleep(800);

const note = (n: number, dt = 0) => ({ dt, status: 0x90, d1: n, d2: 100 });

send(a, encodeStart(0));
await sleep(200);
send(a, encodeBatch(0, 250, [note(60), note(64, 120)]));
await sleep(300);

const bStart = b.got.find(m => m.sub === BandSub.Start);
check(!!bStart && bStart.performerId === 101 && bStart.instrument === 0, 'B got A\'s start with A\'s id');
const bBatch = b.got.find(m => m.sub === BandSub.Batch);
check(!!bBatch && bBatch.performerId === 101 && bBatch.events.length === 2 && bBatch.events[1].dt === 120, 'B got A\'s batch intact');
check(!a.got.some(m => m.sub === BandSub.Batch), 'A does not hear its own batch back');

// Garbage with the band code: dropped, nothing breaks.
a.ws.send(new Uint8Array([0xc1, 9, 0xfa, 0x03, 1, 2, 3, 4, 5]));
await sleep(100);
send(a, encodeBatch(1, 600, [note(67)]));
await sleep(200);
check(b.got.filter(m => m.sub === BandSub.Batch).length === 2, 'the stream continues after a garbage frame');

send(a, encodeStop());
await sleep(200);
const bStop = b.got.find(m => m.sub === BandSub.Stop);
check(!!bStop && bStop.reason === StopReason.Ended, 'B got A\'s stop');

// A band: B takes an instrument out (a performer too), joins A and doubles
// A's stream on it. A learns who joined; the master stopping dissolves it.
await sleep(BAND_LIMITS.cooldownAfterEndMs + 100);
send(a, encodeStart(0));
send(b, encodeStart(2));
await sleep(200);
send(b, encodeJoin(101, 2, 0xffff));
await sleep(200);
const aJoin = a.got.find(m => m.sub === BandSub.Join);
check(!!aJoin && aJoin.performerId === 102 && aJoin.masterId === 101 && aJoin.mask === 0xffff, "A got B's join");
check(!b.got.some(m => m.sub === BandSub.Refused), 'B was not refused for having an instrument out');
send(a, encodeBandState(0xffff, [{ id: 102, instrument: 2, mask: 0xffff }]));
await sleep(200);
check(b.got.some(m => m.sub === BandSub.BandState && m.performerId === 101 && m.members.length === 1), "B got A's band state");
send(a, encodeStop());
await sleep(200);
check(b.got.filter(m => m.sub === BandSub.Stop && m.performerId === 101).length === 2, "B got A's stop once, as a member and receiver");
send(b, encodeStop());
await sleep(200);

// A flood: more batches in a second than the relay allows.
await sleep(BAND_LIMITS.cooldownAfterEndMs + 100);
send(a, encodeStart(1));
await sleep(150);
for (let i = 0; i < BAND_LIMITS.maxBatchesPerSecond + 2; i++) send(a, encodeBatch(i, i * 10, [note(60)]));
await sleep(400);
const flood = a.got.find(m => m.sub === BandSub.Stop && m.reason === StopReason.Flood);
check(!!flood, 'A was stopped for flooding');
send(a, encodeStart(1));
await sleep(200);
const refused = a.got.find(m => m.sub === BandSub.Refused);
check(!!refused && refused.cause === RefuseCause.Cooldown, 'A is refused during the cooldown');

a.ws.close();
b.ws.close();
await sleep(200);
proxy.kill();

const bandLines = proxyLog.split('\n').filter(l => l.includes('band:')).join('\n');
console.log(bandLines);

if (failures.length) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('all checks passed');
process.exit(0);
