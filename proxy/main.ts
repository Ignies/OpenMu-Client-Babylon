import type { ServerWebSocket, Socket } from "bun";
import { CLEAR, currentWeather, weatherForced, weatherPacket, weatherSlotSeconds, type WeatherState } from "./weather";
import { ConnectionPresence, startPresenceServer } from "./presence";
import { parseAllowTargets, targetAllowed } from "./allowTargets";

const PORT = process.env.PORT || "3000";
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

/**
 * Weather broadcast (see weather.ts).
 *
 * OpenMU never sends `WeatherStatusUpdate`, so the proxy synthesises it. This
 * is the only place in the pipe that *originates* a packet rather than
 * forwarding one — everything else here is a byte copy — so it is kept to one
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
 * change — which, on a soaked day, can be hours away.
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

if (!ALLOW_RULES.length) {
  console.warn(
    "ALLOW_TARGETS is unset: this proxy will dial ANY host:port a client names. Fine on localhost, an open relay in public - set it to the game ports, e.g. ALLOW_TARGETS=127.0.0.1:44405,127.0.0.1:55901"
  );
} else {
  console.log(
    `allowed targets: ${ALLOW_RULES.map(r => (r.port === null ? r.host : `${r.host}:${r.port}`)).join(", ")}`
  );
}

/** The per-packet hex dump. Priceless locally, far too loud against a real server. */
const LOG_PACKETS = (process.env.LOG_PACKETS ?? "on") !== "off";

const clients = new Set<ServerWebSocket<WebSocketData>>();

let weather: WeatherState = CLEAR;
let lastBroadcast = 0;

function sendWeather(ws: ServerWebSocket<WebSocketData>, state: WeatherState) {
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
      : `weather: on (slot ${weatherSlotSeconds}s, tick ${WEATHER_TICK_MS}ms) — WEATHER_FORCE=12 to pin rain, WEATHER=off to disable`
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

type WebSocketData = {
  targetHost: string;
  targetPort: number;
  tcpSocket?: Socket;
  presence: ConnectionPresence;
};

startPresenceServer();

Bun.serve<WebSocketData>({
  port: PORT,
  hostname: HOSTNAME,
  fetch(req, server) {
    const searchParams = new URL(req.url).searchParams;
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

    if (!targetAllowed(ALLOW_RULES, targetHost, targetPort)) {
      console.warn(
        `refused target ${targetHost}:${targetPort} (ALLOW_TARGETS)`
      );
      return new Response("target not allowed", { status: 403 });
    }

    // upgrade the request to a WebSocket
    if (
      server.upgrade(req, {
        data: {
          targetHost,
          targetPort,
          presence: new ConnectionPresence(),
        },
      })
    ) {
      return; // do not return a Response
    }
    return new Response("Upgrade failed :(", { status: 500 });
  },
  websocket: {
    sendPings: false,
    open(ws) {
      console.log(
        `client connected, target ${ws.data.targetHost}:${ws.data.targetPort}`
      );

      if (WEATHER_ENABLED) {
        clients.add(ws);
        // The heartbeat would reach them within 20 s anyway, but a player who
        // logs into a downpour should not walk through the first seconds of it
        // under a clear sky.
        sendWeather(ws, weather);
      }

      // Connect to TCP server
      Bun.connect({
        hostname: ws.data.targetHost,
        port: ws.data.targetPort,
        socket: {
          data(socket, data) {
            if (LOG_PACKETS) console.log("data from tcp:", stringifyPacket(data));
            ws.send(asBufferSource(data));
          },
          open(socket) {
            ws.data.tcpSocket = socket;
          },
          close(socket) { },
          drain(socket) { },
          error(socket, error) {
            console.log(`tcp error:`, error);
            ws.data.tcpSocket = undefined;
            ws.close();
          },

          // client-specific handlers
          connectError(socket, error) {
            console.log(
              `tcp connect error(${ws.data.targetHost}:${ws.data.targetPort}):`,
              error
            );
            // Tell the client now. Left open, the ws just sits there and the
            // player waits on a game server that was never reached — which is
            // also what the client's address fallback keys off.
            ws.close();
          }, // connection failed
          end(socket) {
            ws.data.tcpSocket = undefined;
            ws.close();
          }, // connection closed by server
          timeout(socket) { }, // connection timed out
        },
      });
    },
    message(ws, message) {
      const socket = ws.data.tcpSocket;
      if (socket) {
        if (LOG_PACKETS) console.log("data from ws:", stringifyPacket(message));

        const forwarded = asBufferSource(message);

        socket.write(forwarded);
        socket.flush();

        // After the write, and on its own copy: the sniffer decrypts in place
        // and must never touch what goes to the game server.
        if (typeof forwarded !== "string") {
          ws.data.presence.feed(new Uint8Array(forwarded));
        }
      }
    },
    close(ws, code, message) {
      clients.delete(ws);
      ws.data.presence.close();

      const socket = ws.data.tcpSocket;
      if (socket) {
        socket.flush();
        socket.end();
        ws.data.tcpSocket = undefined;
      }
    },
  },
});

console.log(`Listening...`);
