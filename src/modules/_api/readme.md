# _api

The module API (phases 3 and 4 of [docs/module_streaming.md](../../../docs/module_streaming.md)): what
a module may ask of the client, described once and served two ways. In process for first-party
modules (the object `install` gets) and as messages for third-party ones, which run in a sandboxed
iframe. Since 1.1 a module also has its own packets, carried by one extension code (`0xE8`).
Not a module: no `module.ts`, like `_shared/`.

## Public API
- `contract.ts` (imports nothing, so a streamed module and the sandbox side can import it alone):
  - `MODULE_API_VERSION` (semver, `1.1.0`): a minor bump adds calls, a major one breaks them. 1.1
    added `onPacket` and `sendPacket`.
  - `MODULE_ID`: a module's id (and a window's): `[a-z][a-z0-9_]`, at most 40 characters.
  - `canServe(range, version?)`: whether this client serves a module's range. Reads `^1.2`, `~1.2.3`,
    `1.x` / `1.2.x`, an exact `1.2.3`, and comparators that must all hold (`>=1.1 <2`, also `>`,
    `<=`, `<`), one space apart. Anything else is refused (`*`, `latest`, `||`, hyphen ranges,
    pre-release tags, a bare `1.2`).
  - `ModuleApi<Draw>`, v1's calls: `registerText(code, strings)`, `registerWindow({ id, title,
    hotKey?, draw? })`, `playSound(id)`, `playEffect(id, at)`, `hero()` (a frozen `HeroSnapshot`:
    name, class, level, map, x, y; map -1 before the world exists), `onMapChange(fn)` (returns the
    unsubscribe), `onPacket(fn)` (the payloads the server sends this module; returns the
    unsubscribe), `sendPacket(payload)` (a `Uint8Array` to the module's half on the server).
    `RemoteModuleApi`: the same calls answering with promises, except the two subscriptions. Types
    `Tile`, `HeroSnapshot`, `ModuleWindow`.
- `packetWire.ts` (imports only `contract.ts`): the module packet. `MODULE_PACKET_CODE` (`0xE8`),
  `MAX_FRAME` (`0xFFFF`), `maxPayload(id)`, `encodeModuleFrame(id, payload)`,
  `decodeModuleFrame(frame)` (`{ id, payload }` or `{ error }`), type `ModuleFrame`.
- `host.ts`: `createModuleHost(game)` gives `{ api(id), dispose(id), deliver(id, payload) }`;
  `InProcessApi` (`ModuleApi<ComponentType>`); `Game`, the side of the game the host needs.
- `router.ts`: `createModuleRouter(host)` gives `{ route(frame), dropped }`.
- `ports.ts`: `game` (the real `Game`), `moduleHost`, the client's one host, `moduleRouter` over it
  and `installModuleRouter()`, the one listener for the module packet (returns the uninstall).
- `protocol.ts`: the message wire. `PROTOCOL_VERSION`, `MAX_MESSAGE_SIZE`, `readCall(data)`, the
  message types, `PortLike` (`{ postMessage, onmessage }`, a `MessagePort`), and `toBase64` /
  `fromBase64` for packet payloads.
- `dispatcher.ts`: `serveModule(port, api)`, the client's end; returns the stop.
- `guest.ts`: `connectModule(port)`, the module's end: a `RemoteModuleApi`.
- `sandbox.ts`: `sandboxFrame(source)` (the iframe's attributes), `handOverPort(frameWindow)`,
  `HAND_OVER`.

## How it works
- One host per client (`moduleHost`), one API object per module id, the same until `dispose(id)`.
  The host checks the rules both bindings share: text keys and window titles start with the module's
  id and a dot (a module cannot overwrite the client's text), a window id is a plain name and is
  shown as `<module>:<id>` (it cannot replace a built-in window), a hot key is a `KeyboardEvent.code`
  that is not reserved, sounds and effects must be ones the game knows, a packet fits one frame. A
  refusal throws; over messages it comes back as `{ id, error }`.
- It keeps what each module registered: `dispose(id)` removes its windows (closed) and ends its map
  and packet listeners, and its old API object refuses every call after. Text stays registered (the
  registry has no removal; the keys are the module's own).
- `ports.ts` reaches the game: `registerText` (i18n), the window registry plus
  `ModuleWindowFrame` (`controllers/interface/components/module_window`: the item window frame, the
  title, the hot key unless a built-in action has it; HUD order 1000), `playSfx` on the UI bus for a
  catalogue key that is not music (`controllers/sound/recipes.json`), the fx bursts
  (`levelUp`, `shieldPotion`, `shieldLost`, `swirl`) at a tile of the hero's map, `Hero` plus the
  hero entity's tile and `world.mapIndex`, warp's `onMapChanged` (`warpCompleted`) and
  `Session.sendToGS` for a module's frames. Nothing subscribes before a module asks, so the built-in
  listeners are unchanged.
- `src/app/logic.ts` hands `moduleHost.api` to `installModules` and then calls
  `installModuleRouter()` (the wiring). It cannot live in `module.ts`: every module imports that
  file, and `module.ts` -> `ports.ts` -> `hero` -> `session` -> `servers/serverConfig` ->
  `servers/serverManifest` -> `module.ts` would be a cycle. Built-in modules ignore the API they get.
- Messages: calls `{ v, id, call, args }`, answers `{ id, result }` or `{ id, error }`, events
  `{ event: 'mapChange', data: { map } }` and `{ event: 'packet', data: { payload } }`. Over the wire
  `onMapChange` and `onPacket` are subscribes and `offMapChange` / `offPacket` their ends; the guest
  keeps its listeners and subscribes once. `readCall` works on a JSON copy of each message, so the
  game only sees plain data, and refuses (with the message's id when it has one, else `null`): not
  JSON, over `MAX_MESSAGE_SIZE` (64 K characters of JSON), not exactly `{ v, id, call, args }`,
  another protocol version, an unknown call, or arguments of the wrong number, type or keys (a
  window over messages has no `draw`: the module's frame is the window; a payload is canonical
  base64).
- The sandbox: `sandbox="allow-scripts"` and nothing more, so the frame is an opaque origin without
  the page's storage, top navigation or popups; its page is a `srcdoc` or a `blob:` URL;
  `referrerpolicy="no-referrer"`. `handOverPort` posts `HAND_OVER` with the module's end of a fresh
  `MessageChannel` to the frame's window (`'*'`: an opaque origin has no name; the window is the
  target) and returns the client's end for `serveModule`. The module's page takes `ports[0]` of
  that message and calls `connectModule`. Mounting the frame in the world page is phase 5.
- No `eval`, `new Function` or dynamic `import()` of a URL here: loading code is phase 5.

### Packets
- The wire (`packetWire.ts`): `C1 len E8 idLength id payload`, or `C2 lenHigh lenLow E8 idLength id
  payload` when the frame does not fit 255 bytes (C1 up to a 255-byte frame, C2 above). The id is the
  module's own (`MODULE_ID`, ASCII, a length byte first), so a module only ever sends and hears its
  own packets; OpenMU's protocol never changes. A frame is at most `MAX_FRAME` bytes, so the payload
  is at most `maxPayload(id)` (65535 - 5 - the id's length). Encoding throws on a bad id or an
  oversized frame; decoding never throws and answers why: `not a module packet` (not C1/C2, or
  another code), `cut short` (fewer bytes than the header needs or says), `lengths disagree` (more
  bytes than the header says, or an id running past the end), `bad module id`. The payload it hands
  back is a copy. Why `0xE8`: [docs/module_streaming.md](../../../docs/module_streaming.md).
- The calls: `sendPacket(payload)` frames the payload with the module's id and sends it through
  `Session.sendToGS` like every other packet (Xor32 on the way out); one over the frame limit is
  refused. Over messages the payload is base64 (plain JSON, a third over the bytes), so a sandboxed
  module's packet is capped by `MAX_MESSAGE_SIZE` first: up to about 48 K of payload whatever the
  bytes are (a number array would cap it at 16 to 32 K depending on the values). `onPacket(fn)`
  hears only payloads for this module; `dispose` drops it.
- The router (`router.ts`): both versions' packet sets carry the hand-written `ModulePacket`
  (`versions/season6/packets/modulePacket.ts`, code E8, any length), so the socket emits every E8
  frame as `ModulePacket`. `installModuleRouter()` is its one listener: it decodes the frame and
  hands the payload to `moduleHost.deliver(id, payload)`. A frame for a module that is not loaded or
  not listening (`deliver` answers false) is dropped and counted in `moduleRouter.dropped.noListener`;
  one it cannot read in `dropped.malformed`. Nothing throws. The server half is the module packet
  handler in `openmu/plugins/` ([openmu/readme.md](../../../openmu/readme.md)).

## Depends on / used by
- uses: `controllers/interface` (`keyBindings`, `windows`, `windowManager`, `module_window`), `i18n`,
  `controllers/sound`, `controllers/fx`, `controllers/render/babylon/exports`, `ecs/current`,
  `core/eventBus` (the `ModulePacket` event), the `hero`, `session` and `warp` doors. `contract.ts`,
  `packetWire.ts`, `protocol.ts` and `guest.ts` import nothing of the game.
- used by: `../module.ts` (`canServe`, the `InProcessApi` type), `src/app/logic.ts` (`moduleHost`,
  `installModuleRouter`), `versions/season6/packets/modulePacket.test.ts` (the code).

## Change it
- add a call (a minor version): add it to `ModuleApi` in `contract.ts` and bump
  `MODULE_API_VERSION`'s minor; give `Game` what it needs and fill it in `ports.ts`; add the host's
  method and its rules in `host.ts`; add its argument check to `ARGS` in `protocol.ts` (the
  `CallArgs` type follows the contract), its case in `serveModule` and its method in
  `connectModule`. Tests: the host's rules (`host.test.ts`), the real wiring (`ports.test.ts`), the
  wire's good and bad arguments (`protocol.test.ts`), a round trip (`binding.test.ts`).
- add an event: an `EventMessage` variant, a subscribe and unsubscribe call like `onMapChange` /
  `offMapChange`, the guest's listener set.
- a breaking change: bump the major; modules that asked for `^1` are refused by `installModules`.
- change the module packet's layout: `packetWire.ts` and the plugin's handler and view
  (`openmu/plugins/GameServer/`) together; the code is in both and in `modulePacket.ts`.

## Tests
- `contract.test.ts`: `canServe` for every range form, the ranges it refuses, what 1.1 serves.
- `packetWire.test.ts`: frames by table: an empty payload, the C1/C2 boundary, the largest frame,
  ids that are not module ids, a payload over the limit; decoding a C2 frame that would fit C1, a
  frame cut short, lengths that disagree, bad ids.
- `host.test.ts`: one API per module, text and window rules, unknown sounds and effects, map
  listeners, packets sent and refused, payloads delivered and their end, `dispose`. Over
  `testGame.ts`, a game that records what reaches it.
- `router.test.ts`: each frame to the module it names, frames nobody hears and frames it cannot read
  counted, never thrown.
- `ports.test.ts`: the real game: text through `t()`, a window in the HUD and out, the sounds and
  effects it knows, the hero snapshot, a frame through `Session.sendToGS`, a `ModulePacket` off the
  bus to the module that listens, map changes through warp.
- `protocol.test.ts`: `readCall` with good and bad arguments for each call, and what is not a call;
  the largest packet a message carries; base64 round trips.
- `binding.test.ts`: both ends over a real `MessageChannel`: a round trip, the host's refusals, an
  unknown call, a wrong argument type, an oversized message, map events, packets both ways, their
  end, `dispose` and the stop.
- `sandbox.test.ts`: the frame's attributes pinned, the port hand-over.
- `example.test.ts`: a module that uses nothing but the API, run in process and over messages:
  both make the same calls on the game and hear the same map changes and packets.
