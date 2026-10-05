# _api

The module API (phase 3 of [docs/module_streaming.md](../../../docs/module_streaming.md)): what a
module may ask of the client, described once and served two ways. In process for first-party modules
(the object `install` gets) and as messages for third-party ones, which run in a sandboxed iframe.
Not a module: no `module.ts`, like `_shared/`.

## Public API
- `contract.ts` (imports nothing, so a streamed module and the sandbox side can import it alone):
  - `MODULE_API_VERSION` (semver, `1.0.0`): a minor bump adds calls, a major one breaks them.
  - `canServe(range, version?)`: whether this client serves a module's range. Reads `^1.2`, `~1.2.3`,
    `1.x` / `1.2.x`, an exact `1.2.3`, and comparators that must all hold (`>=1.1 <2`, also `>`,
    `<=`, `<`), one space apart. Anything else is refused (`*`, `latest`, `||`, hyphen ranges,
    pre-release tags, a bare `1.2`).
  - `ModuleApi<Draw>`, v1's calls: `registerText(code, strings)`, `registerWindow({ id, title,
    hotKey?, draw? })`, `playSound(id)`, `playEffect(id, at)`, `hero()` (a frozen `HeroSnapshot`:
    name, class, level, map, x, y; map -1 before the world exists), `onMapChange(fn)` (returns the
    unsubscribe). `RemoteModuleApi`: the same calls answering with promises. Types `Tile`,
    `HeroSnapshot`, `ModuleWindow`.
- `host.ts`: `createModuleHost(game)` gives `{ api(id), dispose(id) }`; `InProcessApi`
  (`ModuleApi<ComponentType>`); `Game`, the side of the game the host needs.
- `ports.ts`: `game` (the real `Game`) and `moduleHost`, the client's one host.
- `protocol.ts`: the wire. `PROTOCOL_VERSION`, `MAX_MESSAGE_SIZE`, `readCall(data)`, the message
  types and `PortLike` (`{ postMessage, onmessage }`, a `MessagePort`).
- `dispatcher.ts`: `serveModule(port, api)`, the client's end; returns the stop.
- `guest.ts`: `connectModule(port)`, the module's end: a `RemoteModuleApi`.
- `sandbox.ts`: `sandboxFrame(source)` (the iframe's attributes), `handOverPort(frameWindow)`,
  `HAND_OVER`.

## How it works
- One host per client (`moduleHost`), one API object per module id, the same until `dispose(id)`.
  The host checks the rules both bindings share: text keys and window titles start with the module's
  id and a dot (a module cannot overwrite the client's text), a window id is a plain name and is
  shown as `<module>:<id>` (it cannot replace a built-in window), a hot key is a `KeyboardEvent.code`
  that is not reserved, sounds and effects must be ones the game knows. A refusal throws; over
  messages it comes back as `{ id, error }`.
- It keeps what each module registered: `dispose(id)` removes its windows (closed) and ends its map
  listeners, and its old API object refuses every call after. Text stays registered (the registry
  has no removal; the keys are the module's own).
- `ports.ts` reaches the game: `registerText` (i18n), the window registry plus
  `ModuleWindowFrame` (`controllers/interface/components/module_window`: the item window frame, the
  title, the hot key unless a built-in action has it; HUD order 1000), `playSfx` on the UI bus for a
  catalogue key that is not music (`controllers/sound/recipes.json`), the fx bursts
  (`levelUp`, `shieldPotion`, `shieldLost`, `swirl`) at a tile of the hero's map, `Hero` plus the
  hero entity's tile and `world.mapIndex`, and warp's `onMapChanged` (`warpCompleted`). Nothing
  subscribes before a module asks, so the built-in listeners are unchanged.
- `src/app/logic.ts` hands `moduleHost.api` to `installModules` (the one line of wiring). It cannot
  live in `module.ts`: every module imports that file, and `module.ts` -> `ports.ts` -> `hero` ->
  `session` -> `servers/serverConfig` -> `servers/serverManifest` -> `module.ts` would be a cycle.
  Built-in modules ignore the API they get.
- Messages: calls `{ v, id, call, args }`, answers `{ id, result }` or `{ id, error }`, events
  `{ event: 'mapChange', data: { map } }`. Over the wire `onMapChange` is a subscribe and
  `offMapChange` its end; the guest keeps its listeners and subscribes once. `readCall` works on a
  JSON copy of each message, so the game only sees plain data, and refuses (with the message's id
  when it has one, else `null`): not JSON, over `MAX_MESSAGE_SIZE` (64 K characters of JSON), not
  exactly `{ v, id, call, args }`, another protocol version, an unknown call, or arguments of the
  wrong number, type or keys (a window over messages has no `draw`: the module's frame is the window).
- The sandbox: `sandbox="allow-scripts"` and nothing more, so the frame is an opaque origin without
  the page's storage, top navigation or popups; its page is a `srcdoc` or a `blob:` URL;
  `referrerpolicy="no-referrer"`. `handOverPort` posts `HAND_OVER` with the module's end of a fresh
  `MessageChannel` to the frame's window (`'*'`: an opaque origin has no name; the window is the
  target) and returns the client's end for `serveModule`. The module's page takes `ports[0]` of
  that message and calls `connectModule`. Mounting the frame in the world page is phase 5.
- No `eval`, `new Function` or dynamic `import()` of a URL here: loading code is phase 5.

## Depends on / used by
- uses: `controllers/interface` (`keyBindings`, `windows`, `windowManager`, `module_window`), `i18n`,
  `controllers/sound`, `controllers/fx`, `controllers/render/babylon/exports`, `ecs/current`, the
  `hero` and `warp` doors. `contract.ts`, `protocol.ts` and `guest.ts` import nothing of the game.
- used by: `../module.ts` (`canServe`, the `InProcessApi` type), `src/app/logic.ts` (`moduleHost`).

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

## Tests
- `contract.test.ts`: `canServe` for every range form, the ranges it refuses.
- `host.test.ts`: one API per module, text and window rules, unknown sounds and effects, map
  listeners, `dispose`. Over `testGame.ts`, a game that records what reaches it.
- `ports.test.ts`: the real game: text through `t()`, a window in the HUD and out, the sounds and
  effects it knows, the hero snapshot, map changes through warp.
- `protocol.test.ts`: `readCall` with good and bad arguments for each call, and what is not a call.
- `binding.test.ts`: both ends over a real `MessageChannel`: a round trip, the host's refusals, an
  unknown call, a wrong argument type, an oversized message, map events, their end and `dispose`.
- `sandbox.test.ts`: the frame's attributes pinned, the port hand-over.
- `example.test.ts`: a module that uses nothing but the API, run in process and over messages:
  both make the same calls on the game.
