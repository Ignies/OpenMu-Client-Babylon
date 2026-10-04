# net

The network layer: the game socket, packet encryption, the active version's packet set, the
small side protocols the proxy speaks (band, ping, admin, escrow, chat server) and the net
readouts. Handlers for packets live in `src/modules/<module>/net.ts`, not here.

## Public API
- `sockets/createSocket.ts`: `createSocket({ wsAddress, tcpIP, tcpPort })` opens a game or
  connect-server socket and emits each parsed packet on `EventBus` by packet name, plus
  `wsOpened` / `wsClosed` / `wsError`.
- `sockets/chatRoomSocket.ts`: `openChatRoomSocket(options)`, one ChatServer room connection; the
  caller hands in the ws proxy origin (`wsAddress`), as for `createSocket`.
- `encryption/`: `SimpleModulusEncryptor` / `Decryptor` / `Keys`, `Xor32Encryptor` /
  `Decryptor`, `Xor3Byte`, `DefaultKeys`.
- `packets.ts`: `ServerToClientPackets`, `ClientToServerPackets`, `ConnectServerPackets`,
  `ChangeMapServerInfoPacket` of the running version.
- `wireUtils.ts`: packet framing (`getPacketSize`, `getPacketHeaderSize`, `setPacketSize`, ...)
  and numeric casts, with no Babylon or DOM.
- `protocols/`: `bandProtocol`, `pingProtocol`, `adminProtocol`, `escrowWire`, `chatRoomProtocol`,
  `chatWire` (`toChatWire`, `fromChatWire`, `clipChatText`).
- `pingNet.ts`: `installPingNet()`, `requestPing(x, z)`, `pingAvailable()`.
- `roundTrip.ts`: `NetStats` (`markSent`, `markAnswered`, `roundTripMs`, `reset`).
- `socketCost.ts`: `recordSocketDrain(bytes, ms)`, `netStats()`, `NET_BURST_MS`.
- `serverTime.ts`: `serverNow()`.
- `sessionNonce.ts`: `sessionNonce()`, `SESSION_NONCE_RE`.

## How it works
- `createSocket` buffers incoming bytes, drops non-header bytes, waits for whole packets,
  decrypts C3/C4 with the version's SimpleModulus server-to-client keys and finds the packet
  definition by code, sub-code and length. Packets that share a code are ordered by
  `gameVersion.protocol.variantRank`; an inbound whisper (code 0x02) is routed to the
  `ChatMessage` parser. A throwing handler is logged and the queue moves on. Sending and the
  client-to-server encryption live in `app/store.ts`.
- The chat server socket is separate: plain C1/C2 in, Xor32 on every frame out, no SimpleModulus
  (UIWindows.cpp `ConnectToChatServer`); it keeps rooms alive every 15 s (`CHATCONNECT_TIMER`).
- Band (`C1 FA`) and ping (`C1 FB`) frames go out through `Store.sendToGS` like any C1; the proxy
  relays them plain with the sender's object id stamped at bytes 4-5, so a client cannot claim
  to be someone else. The protocol files are engine-free: the proxy, the marketplace and the
  tests import them too.
- `pingNet` is the ping's one wire listener; it decides whether a ping happens and `fx/ping.ts`
  draws it. It draws the hero's own pointer at once, without waiting for the relay.
- `roundTrip`: OpenMU never answers the keep-alive ping, so round trip is timed on pairs the
  client already sends (chat line and echo, item move and `ItemMoved`, warp and `MapChanged`).
  The figure is the median of the last 7 samples; it is not observable, the readout polls it.
- `serverTime`: anything two players must see alike (ambient weather, timed events) is a
  function of `serverNow()`. Today it is UTC wall time; an offset from a server-stamped packet
  would go there.

### Notes
- `sessionNonce.ts`: the cash shop never sees a password. Its proof of login is that the same
  random value went out on the game socket URL (`&session=`) and arrives in `POST /api/session`;
  the proxy answers `/ticket/<nonce>` with the login read off that socket (proxy/presence.ts).
  Knowing the nonce is acting as the account in the shop, so it is 128 bits from
  `crypto.getRandomValues`, made only here, never logged or put in the address bar. It is drawn
  on first use so tests that import a neighbour do not draw one. The chat socket does not send it.
- `socketCost.ts`: packets are drained synchronously inside the WebSocket `message` event with
  no budget, so a burst after a server stall is paid between two frames and shows as a frame
  drop. This counts how long each drain held the thread (not how much data arrived) per
  one-second window, for the perf overlay. Store-free and engine-free so it is unit tested and
  the socket need not reach into rendering.

## Depends on / used by
- uses: `core` (event bus, binary utils), `version` (packet set, encryption keys, variant rank),
  `assets/download` (framing re-exports), `fx` (ping marker), `app/store` (`pingNet` only).
- used by: `app/store.ts`, `app/logic.ts`, module nets (session, band, chat, social,
  marketplace, gm, events), `core/eventBus/events.ts`, `lighting/clouds.ts`,
  `weather/snowCover.ts`, `render/perfOverlay.ts`, `fx/ping.ts`, the pointer input and ambient
  particle systems, the gm panel window, and outside `src/`: `proxy/`, `marketplace/`,
  `cashshop/`.

## Change it
- handle a new packet: `src/modules/<module>/net.ts` (see
  [docs/how_to/add_packet_handler.md](../../../docs/how_to/add_packet_handler.md)).
- a new proxy-side protocol: add `protocols/<name>Protocol.ts`, engine-free, modelled on
  `pingProtocol.ts`, with a `.test.ts` beside it.
- another version's packet set: ship it under `versions/<id>/packets`; `packets.ts` picks it up.

## Tests
- `protocols/bandProtocol.test.ts`: band frames round-trip, size limits, rejected frames, the
  performer stamp, detection before decryption.
- `protocols/pingProtocol.test.ts`: point rounding and clamping, sender stamp, hello, bad frames.
- `protocols/chatRoomProtocol.test.ts`: chat server auth and message XOR, client lists, frame
  splitting and resync.
- `protocols/escrowWire.test.ts`: .NET guid byte order, int64, escrow request and result packets.
- `roundTrip.test.ts`: request and answer pairing, median, stall cap, reset.
- `socketCost.test.ts`: drain rates per window, worst drain, burst count, reset.
