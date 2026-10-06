# openmu

Our plugins for OpenMU. We do not ship or fork OpenMU: the installer runs OpenMU the OpenMU way (its
repository at a release tag, its `deploy/all-in-one` compose, the official `munique/openmu` image),
and this folder adds one thin layer on top.

## What is here

```
plugins/            MuPlugins.csproj: one DLL with every plugin, compiled against the image's own assemblies
  StartupHook.cs    loads the DLL before OpenMU starts (DOTNET_STARTUP_HOOKS), so its plugin discovery finds it
  GameLogic/        marketplace escrow: token check, item and Zen moves (EscrowToken, MarketplaceEscrowAction);
                    Modules/IModulePacketPlugIn and Views/Modules/IModulePacketViewPlugIn (module packets)
  GameServer/       packet group 0xE7: the group handler, the escrow request handler, the result view;
                    the module packet 0xE8: ModulePacketHandlerPlugIn and ModulePacketViewPlugIn
Dockerfile          FROM the OpenMU image, + plugins/ in /app/plugins, + the startup hook
appsettings.Production.json   adds a compact JSON log (logs/events-*.jsonl) that ops/server reads
```

## How it works

- OpenMU's `PlugInManager` registers every `[PlugIn]` type in the loaded assemblies. The startup hook
  loads our DLL first, so our plugins register like built-in ones and show in the admin panel
  (Packet Handlers: "Marketplace Group Handler", "Marketplace Escrow Request Handler", "Module Packet
  Handler"; view plugins: "Marketplace Escrow Result", "Module Packet").
- OpenMU's own external-assembly option (`ExternalAssemblyName`) loads `plugins\<name>`, a relative
  Windows path, and fails in the Linux image; the startup hook avoids it.
- A plugin outside OpenMU sees only public types. `MarketplaceGroupHandler` repeats the few lines of
  OpenMU's internal `GroupPacketHandlerPlugIn`; the result view reads the internal
  `RemotePlayer.Connection` once by reflection and fails loudly if OpenMU renames it.

Marketplace escrow: the client sends a token the marketplace service signed (`C1 len E7 01 <token>`).
The plugin checks signature, expiry, account and character, then moves an item between the bag and
an escrow box (an `ItemStorage` owned by nobody), or pays out the Zen waiting in a box. It answers
`C1 len E7 02 op status listingId boxId amount itemLen item`. Config: `MARKETPLACE_ESCROW_SECRET`, the
same value the marketplace service has; without it every token is refused.

Module packets (phase 4 of [docs/module_streaming.md](../docs/module_streaming.md)): a client module's
packets travel inside one code, `0xE8`, in both directions: `C1 len E8 idLength id payload`, or C2
(two length bytes) when the frame does not fit 255 bytes, the client's `src/modules/_api/packetWire.ts`.

- `ModulePacketHandlerPlugIn` (a packet handler for 0xE8, no encryption expected) reads the module id
  and hands the payload to the `IModulePacketPlugIn` whose `Key` is that id, found with
  `PlugInManager.GetStrategy` the way OpenMU finds chat commands. `IModulePacketPlugIn` is a plugin
  point (`IStrategyPlugIn<string>`): a module's server half is a `[PlugIn]` class implementing it, with
  `HandlePacketAsync(player, payload)`. A frame for an id with no plugin (or a malformed one) is
  dropped; each such id is logged once (the first 64). No module ships yet, so nothing is registered
  and every frame is dropped.
- `ModulePacketViewPlugIn` (`IModulePacketViewPlugIn`) sends one player a module's frame:
  `player.InvokeViewPlugInAsync<IModulePacketViewPlugIn>(p => p.SendModulePacketAsync(id, payload))`.
  It refuses an id that is not a module id and a frame over 65535 bytes, and writes C1 or C2 by the
  same rule as the client. Like the escrow result view, it reads `RemotePlayer.Connection` by
  reflection.
- Nothing to switch: the handler and the view are in the DLL every installed server runs, and the
  client's router is in every client; with no module plugin they do nothing.

## Change it

- add a plugin: a new `[PlugIn]` class under `plugins/`, public OpenMU types only. Rebuild with
  `mu update` (or `docker build -t mu-openmu:local openmu`).
- another OpenMU version: `mu config` > OpenMU version. The DLL is recompiled against that image, so
  an API change shows up as a build error, not at run time.
- a database newer than the last release: `mu config` > OpenMU source at a commit; OpenMU's own
  `src/Startup/Dockerfile` builds the base image.

## Tests

Built and run by the installer's end-to-end run: the marketplace's three plugins and the module
packet handler and view appear active in `config."PlugInConfiguration"` and `logs/events-*.jsonl` is
written. Nothing here is compiled outside the image.
