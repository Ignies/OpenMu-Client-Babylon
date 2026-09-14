import type { Server, ServerWebSocket, Socket } from "bun";
import { CLEAR, currentWeather, weatherForced, weatherPacket, weatherSlotSeconds, type WeatherState } from "./weather";
import { ConnectionPresence, PRESENCE_HOST, PRESENCE_PORT, startPresenceServer } from "./presence";
import { parseAllowTargets, targetAllowed, type ReservedTarget } from "./allowTargets";
import { SESSION_NONCE_RE } from "../src/common/sessionNonce";
import { ADMIN_STREAM_PATH, type RefusalReason } from "../src/common/adminProtocol";
import { Tracker } from "./track/tracker";
import type { TrackedSession } from "./track/session";
import { AdminHub, type AdminSocket } from "./track/admin";
import { MemoryJournal, type Journal } from "./track/journal";
import { DEFAULT_TRACK_DB, SqliteJournal } from "./track/store";
import { startDemo } from "./track/demo";

const PORT = process.env.PORT || "3000";
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

/**
 * Weather broadcast (see weather.ts).
 *
 * OpenMU never sends `WeatherStatusUpdate`, so the proxy synthesises it. This
 * is the only place in the pipe that *originates* a packet rather than
 * forwarding one - everything else here is a byte copy - so it is kept to one
 * timer and one 4-byte frame.
 *
 * The state is global, not per connection: every client must see the same sky,
 * which is the whole reason this lives in the proxy instead of in each client.
 */
const WEATHER_ENABLED = (process.env.WEATHER ?? "on") !== "off";

/** How often the schedule is sampled. The client eases between the steps. */
const WEATHER_TICK_MS = Number(process.env.WEATHER_TICK ?? 5000);

/**
 * Resend even when nothing changed, so a steady sky is self-healing: a client
 * that connects mid-shower is told, and one that missed a frame is corrected
 * within the interval rather than holding the wrong weather until the next
 * change - which, on a soaked day, can be hours away.
 */
const WEATHER_HEARTBEAT_MS = Number(process.env.WEATHER_HEARTBEAT ?? 20000);

/**
 * Which servers this proxy is allowed to dial (see allowTargets.ts). Unset means
 * any host the client asks for, which is what a local dev box wants; a proxy on
 * the internet must be pinned to the game ports, or it is an open relay - and an
 * internal target (127.0.0.1 and the like) must be pinned to an exact port, or a
 * bare-host rule turns the relay into a way to reach every loopback service on
 * the box, e.g. `ALLOW_TARGETS="127.0.0.1:44405,127.0.0.1:55901"`.
 */
const ALLOW_RULES = parseAllowTargets(process.env.ALLOW_TARGETS ?? "");

/**
 * Where the presence server listens - the same variables and defaults
 * `presence.ts` binds with. Named here so the relay can refuse to dial it
 * (`targetReserved` in allowTargets.ts says why), which has to hold with
 * `ALLOW_TARGETS` unset: that is the one setting a dev box runs with, and a
 * dev box is one forgotten variable away from being the public one.
 */
const RESERVED_TARGETS: ReservedTarget[] = [
  { host: PRESENCE_HOST, port: PRESENCE_PORT },
];

/**
 * The tracker (documentation/admin_console/ARCHITECTURE.md): every session's
 * live state and journal, streamed to a game master's panel on
 * `/admin/stream`. `TRACK=off` removes it whole - no decoding, no journal,
 * and the stream refuses everyone. `TRACK_DB_PATH=memory` keeps the journal
 * in memory for the life of the process.
 */
const TRACK_ENABLED = (process.env.TRACK ?? "on") !== "off";
const TRACK_DB_PATH = process.env.TRACK_DB_PATH || DEFAULT_TRACK_DB;
const TRACK_RETAIN_DAYS = Number(process.env.TRACK_RETAIN_DAYS ?? 30);
const TRACK_WHISPERS = (process.env.TRACK_WHISPERS ?? "on") !== "off";

/**
 * Dev seams for the panel, both loud at startup and neither for a public
 * proxy: `ADMIN_OPEN=on` lets a loopback client stream without a game master
 * socket (the offline client has no login to vouch for), `ADMIN_DEMO=on`
 * fills the tracker with synthetic players. `ADMIN_ORIGINS` is a
 * comma-separated allowlist of browser origins for the stream; unset allows
 * any, which the nonce check already makes safe.
 */
const ADMIN_OPEN = process.env.ADMIN_OPEN === "on";
const ADMIN_DEMO = process.env.ADMIN_DEMO === "on";
const ADMIN_ORIGINS = (process.env.ADMIN_ORIGINS ?? "")
  .split(",")
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

if (!ALLOW_RULES.length) {
  console.warn(
    "ALLOW_TARGETS is unset: this proxy will dial ANY host:port a client names (bar the presence server). Fine on localhost, an open relay in public - set it to the game ports, e.g. ALLOW_TARGETS=127.0.0.1:44405,127.0.0.1:55901"
  );
} else {
  console.log(
    `allowed targets: ${ALLOW_RULES.map(r => (r.port === null ? r.host : `${r.host}:${r.port}`)).join(", ")}`
  );
}

/** The per-packet hex dump. Priceless locally, far too loud against a real server. */
const LOG_PACKETS = (process.env.LOG_PACKETS ?? "on") !== "off";

type RelayData = {
  kind: "relay";
  targetHost: string;
  targetPort: number;
  tcpSocket?: Socket;
  presence: ConnectionPresence;
  track: TrackedSession | null;
};

type AdminData = {
  kind: "admin";
  /** Set when the upgrade was accepted only to say why it is refused. */
  refused: RefusalReason | null;
  socket: AdminSocket | null;
};

type WebSocketData = RelayData | AdminData;

const clients = new Set<ServerWebSocket<RelayData>>();

let weather: WeatherState = CLEAR;
let lastBroadcast = 0;

function sendWeather(ws: ServerWebSocket<RelayData>, state: WeatherState) {
  ws.send(weatherPacket(state));
}

function tickWeather() {
  const now = Date.now();
  const next = currentWeather(now);
  const changed = next.kind !== weather.kind || next.variation !== weather.variation;

  if (changed) {
    console.log(
      `weather: ${next.kind === 0 ? "clear" : `rain ${next.variation}/15`}`
    );
  }

  weather = next;

  if (!changed && now - lastBroadcast < WEATHER_HEARTBEAT_MS) return;

  lastBroadcast = now;
  for (const ws of clients) sendWeather(ws, weather);
}

if (WEATHER_ENABLED) {
  weather = currentWeather(Date.now());
  setInterval(tickWeather, WEATHER_TICK_MS);
  console.log(
    weatherForced
      ? `weather: FORCED to ${weather.kind === 0 ? "clear" : `rain ${weather.variation}/15`} (WEATHER_FORCE)`
      : `weather: on (slot ${weatherSlotSeconds}s, tick ${WEATHER_TICK_MS}ms) - WEATHER_FORCE=12 to pin rain, WEATHER=off to disable`
  );
} else {
  console.log("weather: off");
}

function byteToString(i: number) {
  return i.toString(16).padStart(2, "0").toUpperCase();
}

// like 'C1 04 00 01'
function stringifyPacket(buffer: string | ArrayLike<number>) {
  if (typeof buffer === "string") return buffer;
  return Array.from(buffer).map(byteToString).join(" ");
}

// Bun hands us Node Buffers; re-view them as plain Uint8Arrays (no copy) so
// they match the `string | BufferSource` signatures on ws.send / socket.write.
function asBufferSource(data: string | Buffer): string | Uint8Array {
  return typeof data === "string"
    ? data
    : new Uint8Array(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength);
}

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

function isLoopback(server: Server, req: Request): boolean {
  const address = server.requestIP(req)?.address ?? "";
  return LOOPBACK.has(address);
}

/* --------------------------------------------------------------- tracker */

let tracker: Tracker | null = null;
let journal: Journal | null = null;
let hub: AdminHub | null = null;

/**
 * A journal that cannot open (a read-only home, a missing sqlite build) must
 * never keep the proxy from starting: that would drop every player over a
 * log file. It falls back to memory and says so.
 */
function openJournal(): { journal: Journal; where: string } {
  if (TRACK_DB_PATH === "memory") return { journal: new MemoryJournal(), where: "in memory" };
  try {
    return { journal: new SqliteJournal(TRACK_DB_PATH, TRACK_RETAIN_DAYS), where: TRACK_DB_PATH };
  } catch (error) {
    console.error(`track: cannot open the journal at ${TRACK_DB_PATH}, keeping it in memory:`, error);
    return { journal: new MemoryJournal(), where: "in memory (fallback)" };
  }
}

if (TRACK_ENABLED) {
  tracker = new Tracker({ whispers: TRACK_WHISPERS });
  const opened = openJournal();
  journal = opened.journal;
  const store = journal;
  tracker.subscribe({ event: (_id, event) => store.append(event) });
  hub = new AdminHub(tracker, journal, { open: ADMIN_OPEN });

  console.log(
    `track: on (journal ${opened.where}, ${TRACK_RETAIN_DAYS} days, whispers ${TRACK_WHISPERS ? "on" : "off"}) - admin stream on ${ADMIN_STREAM_PATH}`
  );
  if (ADMIN_OPEN) console.warn("ADMIN_OPEN=on: loopback clients may stream without a game master socket");
  if (ADMIN_DEMO) startDemo(tracker);
} else {
  console.log("track: off");
}

startPresenceServer();

Bun.serve<WebSocketData>({
  port: PORT,
  hostname: HOSTNAME,
  fetch(req, server) {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    if (url.pathname === ADMIN_STREAM_PATH) {
      if (!hub) return new Response("tracking is off", { status: 404 });

      const origin = (req.headers.get("origin") ?? "").toLowerCase();
      const rawSession = searchParams.get("session") ?? "";
      const session = SESSION_NONCE_RE.test(rawSession) ? rawSession : null;

      let refused: RefusalReason | null = null;
      if (ADMIN_ORIGINS.length && !ADMIN_ORIGINS.includes(origin)) refused = "origin";
      else {
        const auth = hub.authorise(session, isLoopback(server, req));
        if (auth !== "ok") refused = auth;
      }

      // Refused requests are still upgraded, so the panel can be told why
      // before the close: a plain 403 reaches a browser websocket as an
      // error with no body.
      if (server.upgrade(req, { data: { kind: "admin", refused, socket: null } satisfies AdminData })) {
        return;
      }
      return new Response("Upgrade failed :(", { status: 500 });
    }

    const targetHost = searchParams.get("host")?.trim().toLowerCase() ?? "";
    const targetPort = parseInt(searchParams.get("port") ?? "0");

    // Refuse here rather than in `open`: a bad target used to upgrade and then
    // fail inside Bun.connect, which the client sees as a socket that closed
    // for no reason.
    if (!targetHost || !(targetPort > 0 && targetPort <= 65535)) {
      return new Response("host and port query parameters are required", {
        status: 400,
      });
    }

    if (!targetAllowed(ALLOW_RULES, targetHost, targetPort, RESERVED_TARGETS)) {
      console.warn(`refused target ${targetHost}:${targetPort}`);
      return new Response("target not allowed", { status: 403 });
    }

    // The page's session nonce (src/common/sessionNonce.ts), which lets the
    // cash shop put an account to this socket through the presence server's
    // /ticket/<nonce>. Absent or malformed is not a refusal: it only means
    // this socket can never be named by ticket, and the game must connect
    // with a broken shop. It is a bearer credential and is never logged.
    const rawSession = searchParams.get("session") ?? "";
    const session = SESSION_NONCE_RE.test(rawSession) ? rawSession : null;

    // Built before the upgrade is known to have happened, so a request that
    // turns out not to be a websocket handshake has to close it: otherwise it
    // sits in the presence registry, and with a nonce in the ticket map, for
    // the life of the process.
    const presence = new ConnectionPresence(session, targetPort);
    const track = tracker ? tracker.open(session, targetPort) : null;

    const data: RelayData = { kind: "relay", targetHost, targetPort, presence, track };

    // upgrade the request to a WebSocket
    if (server.upgrade(req, { data })) {
      return; // do not return a Response
    }

    presence.close();
    if (track) tracker?.close(track);
    return new Response("Upgrade failed :(", { status: 500 });
  },
  websocket: {
    sendPings: false,
    open(ws) {
      if (ws.data.kind === "admin") {
        const data = ws.data;
        if (data.refused || !hub) {
          ws.send(AdminHub.refusal(data.refused ?? "no-session"));
          ws.close();
          return;
        }
        data.socket = { send: text => ws.send(text), close: () => ws.close() };
        hub.attach(data.socket);
        return;
      }

      const relay = ws as ServerWebSocket<RelayData>;

      console.log(
        `client connected, target ${relay.data.targetHost}:${relay.data.targetPort}`
      );

      if (WEATHER_ENABLED) {
        clients.add(relay);
        // The heartbeat would reach them within 20 s anyway, but a player who
        // logs into a downpour should not walk through the first seconds of it
        // under a clear sky.
        sendWeather(relay, weather);
      }

      // Connect to TCP server
      Bun.connect({
        hostname: relay.data.targetHost,
        port: relay.data.targetPort,
        socket: {
          data(socket, data) {
            if (LOG_PACKETS) console.log("data from tcp:", stringifyPacket(data));

            const forwarded = asBufferSource(data);

            relay.send(forwarded);

            // The server's side of the login: the sniffer names a socket only
            // once the game server has said yes, never off the client's own
            // claim. Same copy discipline as the other direction.
            if (typeof forwarded !== "string") {
              const copy = new Uint8Array(forwarded);
              const confirmed = relay.data.presence.feedFromServer(copy);
              const track = relay.data.track;
              if (track) {
                if (confirmed) track.setAccount(confirmed);
                track.feedServer(copy);
              }
            }
          },
          open(socket) {
            relay.data.tcpSocket = socket;
          },
          close(socket) { },
          drain(socket) { },
          error(socket, error) {
            console.log(`tcp error:`, error);
            relay.data.tcpSocket = undefined;
            relay.close();
          },

          // client-specific handlers
          connectError(socket, error) {
            console.log(
              `tcp connect error(${relay.data.targetHost}:${relay.data.targetPort}):`,
              error
            );
            // Tell the client now. Left open, the ws just sits there and the
            // player waits on a game server that was never reached - which is
            // also what the client's address fallback keys off.
            relay.close();
          }, // connection failed
          end(socket) {
            relay.data.tcpSocket = undefined;
            relay.close();
          }, // connection closed by server
          timeout(socket) { }, // connection timed out
        },
      });
    },
    message(ws, message) {
      if (ws.data.kind === "admin") {
        if (ws.data.socket && hub && typeof message === "string") hub.receive(ws.data.socket, message);
        return;
      }

      const relay = ws as ServerWebSocket<RelayData>;
      const socket = relay.data.tcpSocket;
      if (socket) {
        if (LOG_PACKETS) console.log("data from ws:", stringifyPacket(message));

        const forwarded = asBufferSource(message);

        socket.write(forwarded);
        socket.flush();

        // After the write, and on its own copy: the sniffer decrypts in place
        // and must never touch what goes to the game server.
        if (typeof forwarded !== "string") {
          const copy = new Uint8Array(forwarded);
          relay.data.presence.feed(copy);
          relay.data.track?.feedClient(copy);
        }
      }
    },
    close(ws, code, message) {
      if (ws.data.kind === "admin") {
        if (ws.data.socket && hub) hub.detach(ws.data.socket);
        return;
      }

      const relay = ws as ServerWebSocket<RelayData>;
      clients.delete(relay);
      relay.data.presence.close();
      if (relay.data.track) tracker?.close(relay.data.track);

      const socket = relay.data.tcpSocket;
      if (socket) {
        socket.flush();
        socket.end();
        relay.data.tcpSocket = undefined;
      }
    },
  },
});

console.log(`Listening...`);
